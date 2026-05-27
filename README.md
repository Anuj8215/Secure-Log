<div align="center">

<img src="https://img.shields.io/badge/SecureLog-v1.0.0-7F77DD?style=for-the-badge" alt="SecureLog" />

# SecureLog

### Production-grade Security Incident & Audit Management Platform

A full-stack cybersecurity platform where teams log threats, track incidents, detect anomalies, and monitor suspicious activity — with real-time alerts, async job processing, and a fully hardened API.

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)

<br/>

**[Live Demo](https://securelog.vercel.app)** · **[API Docs](https://securelog-api.onrender.com/api/docs)** · **[Health Check](https://securelog-api.onrender.com/health)**

<br/>

> ⚠️ **Note:** The backend is hosted on Render's free tier and may take ~30 seconds to wake up on the first request.

</div>

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Database schema](#database-schema)
- [Real-time events](#real-time-events)
- [Job queue](#job-queue)
- [Threat detection](#threat-detection)
- [Security hardening](#security-hardening)
- [Testing](#testing)
- [Deployment](#deployment)
- [Demo credentials](#demo-credentials)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)

---

## Overview

SecureLog is a full-stack security operations platform built with the MERN stack. It goes beyond a standard CRUD application by implementing production patterns that real security software teams use:

- **Automatic threat detection** — brute force attacks, new IP logins, and request spikes are detected and turned into incidents automatically, without any human intervention
- **Real-time alerts** — Socket.io pushes live notifications to admins the moment a critical incident is created or a threat is detected, no polling
- **Async job processing** — email notifications are queued via BullMQ and retried automatically on failure, the API response is never blocked
- **Redis as infrastructure** — used for caching expensive aggregations, distributed rate limiting, token blacklisting on logout, and IP blocklists simultaneously
- **Full observability** — structured request logging with pino, Prometheus metrics at `/metrics`, and a health check endpoint that reports DB and Redis status

---

## Features

### Core platform
- **Incident management** — create, update, filter, and resolve security incidents with severity levels (low / medium / high / critical) and status workflow (open → investigating → resolved → closed)
- **Role-based access control** — three roles (admin, analyst, viewer) enforced in Express middleware and React Router. Admins have full access. Analysts can create and update. Viewers are read-only.
- **Audit logging** — every mutating action (POST, PATCH, DELETE) is automatically logged with the user, action, affected resource, IP address, and timestamp. Audit logs can never be deleted.
- **Analytics dashboard** — MongoDB aggregation pipeline showing: incidents by severity, incidents by status, 7-day trend, resolution rate, and top reporters

### Authentication & sessions
- **JWT auth** with short-lived access tokens (15 min) and refresh tokens stored in httpOnly cookies (7 days)
- **Logout that actually works** — refresh tokens are blacklisted in Redis on logout. Using a logged-out token returns 401.
- **bcrypt password hashing** — 12 salt rounds
- **API key authentication** — generate scoped API keys for programmatic access. Keys are SHA-256 hashed before storage and never retrievable after generation.

### Real-time (Socket.io)
- Live incident feed — new incidents appear on the dashboard without refresh
- Critical incident alerts — instant notification badge for all connected admins
- Threat detection alerts — real-time Socket.io event when brute force or suspicious login is detected
- Role-based rooms — admins receive alerts that analysts and viewers do not

### Job queue (BullMQ + Redis)
- Email notification on critical incident creation (Nodemailer + Gmail SMTP)
- Daily digest email to all admins at 8am (repeatable cron job)
- Weekly audit log archival — moves logs older than 90 days to archive collection
- Automatic retry with exponential backoff on job failure (3 attempts)

### Threat detection engine
- **Brute force detection** — 5 failed logins from one IP in 15 minutes triggers: auto-created high-severity incident, IP added to Redis blocklist, real-time alert to admins
- **New IP login detection** — every login is compared to the user's last known IP. New IP creates a medium-severity incident and sends an email to the user.
- **Request spike detection** — 100+ requests from one IP in 1 minute auto-creates a DDoS attempt incident
- **Admin IP management** — admins can manually block and unblock IPs with custom duration and reason

### API hardening
- **Distributed rate limiting** — Redis-backed via `rate-limiter-flexible`. Survives server restarts and scales across instances. Auth routes: 5 req/15min. General API: 100 req/15min.
- **Idempotency keys** — POST /incidents accepts an `Idempotency-Key` header. Duplicate requests return the cached response, preventing duplicate incidents on network retry.
- **Helmet** — sets 11 security HTTP headers including CSP, HSTS, and X-Frame-Options
- **NoSQL injection prevention** — `express-mongo-sanitize` strips `$` and `.` from all incoming data
- **Input validation** — `express-validator` on every POST route with specific field error messages
- **HTTP parameter pollution** — `hpp` middleware prevents duplicate query parameter attacks

### Observability
- **Structured logging** — pino logs every request with method, URL, status, duration, userId, and IP in JSON format
- **Health check** — `GET /health` reports server status, DB connection, Redis connection, uptime, and memory usage
- **Prometheus metrics** — `GET /metrics` exposes request duration histogram, active incidents gauge, error rate, and default Node.js process metrics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│         Axios + JWT interceptor + Socket.io-client          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                    Express API Server                        │
│                                                             │
│  Middleware chain:                                          │
│  helmet → cors → ipBlocklist → rateLimiter →               │
│  express.json → mongoSanitize → authenticate →             │
│  authorize → auditLogger → controller → errorHandler       │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Controllers │  │  Socket.io  │  │  BullMQ Workers  │   │
│  │  (REST API) │  │  (real-time)│  │  (email, archive)│   │
│  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘   │
└─────────┼────────────────┼───────────────────┼─────────────┘
          │                │                   │
    ┌─────▼──────┐   ┌─────▼──────┐    ┌───────▼──────┐
    │  MongoDB   │   │   Redis    │    │    Redis     │
    │  Atlas     │   │  (cache,   │    │  (BullMQ     │
    │            │   │  blacklist,│    │   job queue) │
    │  Users     │   │  blocklist,│    └──────────────┘
    │  Incidents │   │  rate limit│
    │  AuditLogs │   └────────────┘
    │  LoginHist │
    │  ApiKeys   │
    └────────────┘
```

---

## Tech stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20 | Server-side JavaScript |
| Framework | Express.js 4 | HTTP server, routing, middleware |
| Database | MongoDB + Mongoose | Primary data store |
| Cache / Queue broker | Redis 7 + ioredis | Caching, rate limiting, job queue, token blacklist |
| Real-time | Socket.io 4 | Live incident feed, threat alerts |
| Job queue | BullMQ 4 | Async email jobs, scheduled digests |
| Email | Nodemailer | Gmail SMTP email delivery |
| Auth | jsonwebtoken + bcryptjs | JWT tokens, password hashing |
| Logging | pino | Structured JSON request logging |
| Metrics | prom-client | Prometheus metrics endpoint |
| API docs | swagger-jsdoc + swagger-ui-express | OpenAPI 3.0 documentation |
| Validation | express-validator | Request body validation |
| Security | helmet, cors, hpp, express-mongo-sanitize | HTTP hardening |
| Rate limiting | rate-limiter-flexible | Redis-backed distributed rate limiting |
| Testing | Jest + Supertest + mongodb-memory-server | Integration tests |
| Frontend | React 18 + Vite | Single-page application |
| Routing | React Router v6 | Client-side routing, protected routes |
| HTTP client | Axios | API calls with JWT interceptor |
| Styling | TailwindCSS 3 | Utility-first CSS |
| Charts | Recharts | Dashboard visualizations |
| Notifications | react-hot-toast | Real-time toast alerts |

---

## Getting started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or [MongoDB Atlas](https://mongodb.com/atlas) free tier)
- Redis (local or [Upstash](https://upstash.com) free tier)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/securelog.git
cd securelog
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Install frontend dependencies

```bash
cd ../client
npm install
```

### 4. Configure environment variables

```bash
cd ../server
cp .env.example .env
# Edit .env with your values — see Environment Variables section
```

```bash
cd ../client
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
```

### 5. Seed the database

```bash
cd server
npm run seed
```

This creates 3 demo users (admin, analyst, viewer) and 15 sample incidents with varied severities and statuses.

### 6. Start the development servers

In one terminal (backend):
```bash
cd server
npm run dev
```

In another terminal (frontend):
```bash
cd client
npm run dev
```

The API will be running at `http://localhost:5000` and the frontend at `http://localhost:5173`.

---

## Environment variables

### Server — `server/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/securelog

# JWT
JWT_SECRET=your_super_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=another_secret_key_minimum_32_characters
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email (Gmail — use an App Password, not your account password)
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_16_char_app_password

# Frontend (used for CORS whitelist and email links)
FRONTEND_URL=http://localhost:5173

# Seed defaults
DEFAULT_ADMIN_EMAIL=admin@securelog.com
DEFAULT_ADMIN_PASSWORD=Admin@1234
```

### Client — `client/.env`

```env
VITE_API_URL=http://localhost:5000
```

---

## API reference

Full interactive documentation is available at `/api/docs` when the server is running.

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/register` | Public | Create a new user account |
| POST | `/api/v1/auth/login` | Public | Login and receive JWT + refresh token |
| POST | `/api/v1/auth/logout` | Auth | Blacklist refresh token, clear cookie |
| POST | `/api/v1/auth/refresh` | Public | Exchange refresh token for new access token |

### Incidents

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/incidents` | All roles | List incidents (filterable, paginated) |
| GET | `/api/v1/incidents/:id` | All roles | Get single incident |
| POST | `/api/v1/incidents` | Admin, Analyst | Create new incident |
| PATCH | `/api/v1/incidents/:id/status` | Admin, Analyst | Update incident status |
| DELETE | `/api/v1/incidents/:id` | Admin only | Delete incident |

**Query parameters for GET /incidents:**
```
?severity=critical&status=open&page=1&limit=10&startDate=2024-01-01&search=brute
```

### Dashboard

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/dashboard/stats` | All roles | Aggregated stats (cached 5 min) |

### Audit logs

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/audit` | Admin only | List audit logs (filterable, paginated) |

### API keys

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/keys/generate` | Admin, Analyst | Generate new API key |
| GET | `/api/v1/keys` | Auth | List my API keys (hashed, not raw) |
| DELETE | `/api/v1/keys/:id` | Auth | Revoke an API key |
| GET | `/api/v1/keys/:id/usage` | Auth | View key usage stats |

### Admin

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/admin/block-ip` | Admin only | Block an IP address |
| DELETE | `/api/v1/admin/block-ip/:ip` | Admin only | Unblock an IP address |
| GET | `/api/v1/admin/blocked-ips` | Admin only | List all currently blocked IPs |

### System

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/health` | Public | Server, DB, and Redis health status |
| GET | `/metrics` | Public | Prometheus metrics |
| GET | `/api/docs` | Public | Swagger UI documentation |

---

## Database schema

### User
```js
{
  name:          String,         // required
  email:         String,         // required, unique, indexed
  passwordHash:  String,         // bcrypt, 12 rounds
  role:          String,         // enum: admin | analyst | viewer
  isActive:      Boolean,        // default: true
  lastLoginAt:   Date,
  createdAt:     Date
}
```

### Incident
```js
{
  title:           String,       // required
  description:     String,
  severity:        String,       // enum: low | medium | high | critical
  status:          String,       // enum: open | investigating | resolved | closed
  type:            String,       // enum: manual | brute_force | suspicious_login | ddos | other
  affectedSystem:  String,
  reportedBy:      ObjectId,     // ref: User (null if auto-generated)
  isAutoGenerated: Boolean,      // true for threat-detected incidents
  resolvedAt:      Date,
  createdAt:       Date,         // indexed
  updatedAt:       Date
}
// Indexes: severity, status, createdAt, reportedBy
```

### AuditLog
```js
{
  userId:    ObjectId,           // ref: User
  userName:  String,
  action:    String,             // e.g. CREATE_INCIDENT, DELETE_USER
  resource:  String,             // e.g. incidents/64abc...
  ip:        String,
  userAgent: String,
  metadata:  Object,             // before/after state, extra context
  timestamp: Date                // indexed
}
// Append-only. No delete endpoint exists.
// Indexes: userId+timestamp, action, ip
```

### LoginHistory
```js
{
  userId:    ObjectId,           // ref: User
  ip:        String,             // indexed
  userAgent: String,
  success:   Boolean,
  createdAt: Date                // TTL index: auto-deletes after 90 days
}
```

### ApiKey
```js
{
  name:       String,
  keyHash:    String,            // SHA-256 hash of the raw key
  userId:     ObjectId,          // ref: User
  scopes:     [String],          // enum: read | write | admin
  lastUsedAt: Date,
  expiresAt:  Date,
  isActive:   Boolean,
  createdAt:  Date
}
```

---

## Real-time events

Socket.io connection requires JWT authentication via the `auth` handshake:

```js
const socket = io(API_URL, { auth: { token: jwtToken } });
```

| Event | Direction | Audience | Payload |
|-------|-----------|----------|---------|
| `incident:new` | Server → Client | All roles | Full incident object |
| `incident:critical` | Server → Client | Admin room only | Full incident object |
| `incident:updated` | Server → Client | All roles | `{ id, status }` |
| `threat:detected` | Server → Client | Admin room only | `{ type, ip, incident }` |
| `user:online` | Server → Client | Admin room only | `{ userId, name }` |
| `user:offline` | Server → Client | Admin room only | `{ userId }` |

---

## Job queue

BullMQ uses Redis as its broker. Workers run in the same process as the API server in development.

| Queue | Job type | Trigger | Retry policy |
|-------|----------|---------|--------------|
| `emails` | `critical_incident` | On creating a critical incident | 3 attempts, exponential backoff |
| `emails` | `new_ip_login` | On detecting a login from new IP | 3 attempts, exponential backoff |
| `emails` | `daily_digest` | Cron: every day at 8:00 AM | 2 attempts |
| `audit-archive` | `archive_old_logs` | Cron: every Sunday at 2:00 AM | 1 attempt |

Queue dashboard is accessible at `/api/admin/queues` (admin only) via Bull Board.

---

## Threat detection

The threat detection engine runs automatically via middleware — no manual triggering required.

### Brute force detection
1. Every failed login increments a Redis counter keyed by IP (`bf:<ip>`) with a 15-minute TTL
2. At 5 failures: a high-severity incident is auto-created with `isAutoGenerated: true`
3. The IP is added to the Redis blocklist (`blocked:<ip>`) for 15 minutes
4. A `threat:detected` Socket.io event is emitted to all connected admins
5. Counter resets on successful login

### New IP login detection
1. On every successful login, the current IP is compared to the user's most recent `LoginHistory` entry
2. If the IP differs: a medium-severity incident is created and the user receives an email notification via the job queue
3. All logins are recorded to `LoginHistory` regardless

### Request spike detection
1. Every request increments a Redis counter keyed by IP with a 1-minute TTL
2. At 100 requests in 1 minute: a DDoS-attempt incident is auto-created and the IP is temporarily blocked

---

## Security hardening

| Layer | Implementation | What it prevents |
|-------|---------------|-----------------|
| HTTPS | Enforced in production via HSTS header | Man-in-the-middle attacks |
| Helmet | 11 security headers | XSS, clickjacking, MIME sniffing |
| CORS | Whitelist-only origin | Cross-origin request forgery |
| Rate limiting | Redis-backed, per-IP | Brute force, DoS |
| NoSQL injection | express-mongo-sanitize | `$where`, `$gt` injection via req.body |
| Input validation | express-validator on all POST routes | Malformed or missing data |
| HTTP param pollution | hpp middleware | Duplicate query parameter attacks |
| JWT blacklist | Redis TTL keyed by token | Token reuse after logout |
| Password hashing | bcrypt, 12 salt rounds | Rainbow table attacks |
| API key hashing | SHA-256 before storage | Key exposure via DB breach |

---

## Testing

```bash
cd server
npm test
```

Tests use `mongodb-memory-server` — no external DB required.

```
Test suites:
  auth.test.js      — register, login, token refresh, logout, blacklist
  incident.test.js  — CRUD, RBAC enforcement, validation
  audit.test.js     — auto-logging on mutating routes

Coverage targets:
  Controllers: 80%+
  Middleware:  90%+
```

---

## Deployment

### Backend → Render.com

1. Push code to GitHub
2. New Web Service → connect repo → set root directory to `server`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add all environment variables from `.env.example`
6. Deploy

### Frontend → Vercel

1. New Project → connect repo → set root directory to `client`
2. Add `VITE_API_URL` = your Render backend URL
3. Deploy

### Database → MongoDB Atlas

Free M0 cluster. Connect via the connection string in `MONGO_URI`.

### Redis → Upstash

Free serverless Redis. Provides `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`.

---

## Demo credentials

The seed script (`npm run seed`) creates these accounts with pre-populated incidents:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | `admin@securelog.com` | `Admin@1234` | Full access — all features, audit logs, IP management |
| Analyst | `analyst@securelog.com` | `Analyst@1234` | Create and update incidents, view dashboard |
| Viewer | `viewer@securelog.com` | `Viewer@1234` | Read-only — view incidents and dashboard only |

---

## Project structure

```
securelog/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # MongoDB connection
│   │   │   ├── redis.js           # ioredis client
│   │   │   ├── logger.js          # pino logger
│   │   │   └── swagger.js         # OpenAPI config
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── incident.controller.js
│   │   │   ├── audit.controller.js
│   │   │   ├── dashboard.controller.js
│   │   │   ├── apikey.controller.js
│   │   │   └── admin.controller.js
│   │   ├── middlewares/
│   │   │   ├── authenticate.js    # JWT + API key verification
│   │   │   ├── authorize.js       # Role-based access
│   │   │   ├── auditLogger.js     # Auto-log every mutation
│   │   │   ├── cache.js           # Redis cache middleware
│   │   │   ├── bruteForceDetector.js
│   │   │   ├── ipBlocklist.js
│   │   │   ├── idempotency.js
│   │   │   ├── validate.js        # express-validator runner
│   │   │   └── errorHandler.js    # Global error handler
│   │   ├── models/
│   │   │   ├── User.model.js
│   │   │   ├── Incident.model.js
│   │   │   ├── AuditLog.model.js
│   │   │   ├── LoginHistory.model.js
│   │   │   └── ApiKey.model.js
│   │   ├── queues/
│   │   │   ├── index.js
│   │   │   └── email.queue.js
│   │   ├── workers/
│   │   │   ├── email.worker.js
│   │   │   └── audit.worker.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── incident.routes.js
│   │   │   ├── audit.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── apikey.routes.js
│   │   │   └── admin.routes.js
│   │   ├── socket/
│   │   │   └── index.js
│   │   ├── validators/
│   │   │   ├── auth.validators.js
│   │   │   └── incident.validators.js
│   │   └── app.js
│   ├── src/tests/
│   │   ├── setup.js
│   │   ├── auth.test.js
│   │   ├── incident.test.js
│   │   └── audit.test.js
│   ├── seed.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js           # Axios instance + JWT interceptor
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RoleRoute.jsx
│   │   │   └── IncidentCard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useSocket.js
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Incidents.jsx
│   │   │   ├── IncidentDetail.jsx
│   │   │   ├── CreateIncident.jsx
│   │   │   └── AuditLogs.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## Roadmap

- [ ] Two-factor authentication (TOTP — Google Authenticator)
- [ ] Grafana dashboard connected to Prometheus metrics
- [ ] Webhook support — notify external systems on critical incidents
- [ ] CSV export for incident reports and audit logs
- [ ] Full-text search with MongoDB Atlas Search
- [ ] Docker + docker-compose for one-command local setup
- [ ] GitHub Actions CI/CD pipeline with automated test run on push

---

<div align="center">

Built with Node.js, Express, MongoDB, Redis, and Socket.io

**[Live Demo](https://securelog.vercel.app)** · **[API Docs](https://securelog-api.onrender.com/api/docs)**

</div>
