//!SECTION : HTTP SERVER ENTRY POINT
require('dotenv').config();
const validateEnv = require('./src/config/validateEnv');
validateEnv();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const redis = require('./src/config/redis');
const logger = require('./src/config/logger');
const initSocket = require('./src/socket/index');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

require('./src/workers/email.worker');
require('./src/workers/audit.worker');
const { scheduleJobs } = require('./src/queues/scheduler');

const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    try {
      await mongoose.disconnect();
      redis.quit();
      logger.info('Server shut down cleanly');
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
  scheduleJobs().catch((err) => logger.error({ err }, 'Failed to schedule jobs'));
});
