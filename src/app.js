const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { JSON_BODY_LIMIT } = require('./constants');
const { globalLimiter } = require('./middleware/rateLimit');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const {sendSuccess} = require('./utils/sendResponse')
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');

const API_PREFIX = '/api/solenne/v1';
const HEALTH_PATH = `${API_PREFIX}/health`;

const corsOptions = {
  // No Origin header means a non-browser caller (Postman, Paystack webhook): allow it.
  origin: (origin, callback) => callback(null, !origin || env.allowedOrigins.includes(origin)),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  exposedHeaders: ['Retry-After'],
  credentials: true,
};
// These responses depend on who is logged in. Vercel's proxy can cache upstream responses
// that allow it, so this tells every cache not to keep them.
const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};


const app = express();

// Behind the host's proxy, otherwise every user looks like one IP to the rate limiter.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors(corsOptions));

// Before the rate limiter so uptime monitors never get blocked.
app.get(HEALTH_PATH, (req, res) => sendSuccess(res, { status: 'ok' }));

app.use(globalLimiter);
app.use(express.json({ limit: JSON_BODY_LIMIT }));

// Module routers are mounted here as each step adds them.

app.use(`${API_PREFIX}/auth`, noStore, authRoutes);
app.use(`${API_PREFIX}/users`, noStore, usersRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;