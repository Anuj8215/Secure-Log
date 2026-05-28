//!SECTION : EXPRESS APP SETUP
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const promClient = require('prom-client');
const logger = require('./config/logger');
const redis = require('./config/redis');
const swaggerSpec = require('./config/swagger');
const ipBlocklist = require('./middlewares/ipBlocklist');

const app = express();

promClient.collectDefaultMetrics({ prefix: 'securelog_' });

const httpRequestDuration = new promClient.Histogram({
  name: 'securelog_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5],
});

const activeIncidents = new promClient.Gauge({
  name: 'securelog_active_incidents_total',
  help: 'Number of currently open or investigating incidents',
});

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.FRONTEND_URL || '').split(',');
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

app.use((req, res, next) => {
  const start = Date.now();
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });
  next();
});

app.use(ipBlocklist);
app.use('/api/v1/auth', require('./routes/auth.routes'));
const { auditMiddleware } = require('./middlewares/auditLogger');
app.use(auditMiddleware);
app.use('/api/v1/incidents', require('./routes/incident.routes'));
app.use('/api/v1/dashboard', require('./routes/dashboard.routes'));
app.use('/api/v1/audit', require('./routes/audit.routes'));
app.use('/api/v1/keys', require('./routes/apikey.routes'));
app.use('/api/v1/admin', require('./routes/admin.routes'));

app.get('/health', async (req, res) => {
  let redisOk = false;
  try {
    await redis.ping();
    redisOk = true;
  } catch {}

  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  const mem = process.memoryUsage();

  const health = {
    status: dbOk && redisOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(mem.external / 1024 / 1024)}MB`,
    },
    services: {
      database: dbOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected',
    },
  };

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/metrics', async (req, res) => {
  try {
    const Incident = require('./models/Incident.model');
    const count = await Incident.countDocuments({ status: { $in: ['open', 'investigating'] } });
    activeIncidents.set(count);
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch {
    res.status(500).send('Error collecting metrics');
  }
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const response = {
    status: 'error',
    message: err.message || 'Internal Server Error',
  };
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  res.status(status).json(response);
});

module.exports = app;
