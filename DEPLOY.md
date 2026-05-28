# SecureLog Deployment Guide

## Backend → Render.com

1. Push code to GitHub
2. Go to render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add environment variables (from `server/.env.example`):
   - `NODE_ENV=production`
   - `PORT=10000`
   - `MONGO_URI=<your Atlas URI>`
   - `JWT_SECRET=<strong random string>`
   - `JWT_EXPIRES_IN=15m`
   - `REFRESH_TOKEN_SECRET=<different strong random string>`
   - `REFRESH_TOKEN_EXPIRES_IN=7d`
   - `REDIS_HOST=<upstash host>`
   - `REDIS_PORT=6379`
   - `REDIS_PASSWORD=<upstash password>`
   - `EMAIL_USER=<gmail address>`
   - `EMAIL_PASS=<gmail app password>`
   - `FRONTEND_URL=https://your-app.vercel.app`
6. Deploy → wait for build to complete
7. Copy your Render URL (e.g. `https://securelog-api.onrender.com`)

## Frontend → Vercel

1. Go to vercel.com → New Project
2. Connect your GitHub repo
3. Settings:
   - Root Directory: `client`
   - Framework: Vite
4. Add environment variable:
   - `VITE_API_URL=https://securelog-api.onrender.com`
5. Deploy → copy your Vercel URL

## After deployment

1. Update Render env var to allow both prod and local:
   ```
   FRONTEND_URL=https://your-app.vercel.app,http://localhost:5173
   ```
2. Run seed on production DB:
   ```bash
   cd server && MONGO_URI=<prod-uri> node seed.js
   ```
3. Update README.md with live URLs

## Free tier notes

- Render free tier sleeps after 15 min inactivity — first request after sleep takes ~30s
- MongoDB Atlas M0 = 512MB storage, plenty for this project
- Upstash Redis free = 10,000 commands/day, enough for demo
