const { rateLimit } = require('express-rate-limit');
const AppError = require('../utils/appError');
const { ERRORS } = require('../utils/messages');
const { GLOBAL_RATE_LIMIT } = require('../constants');

const createRateLimiter = ({ windowMs, limit, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit,
    ...(keyGenerator && { keyGenerator }),
    standardHeaders: true,
    legacyHeaders: false,
    // The library sets Retry-After itself. Passing the error on keeps the standard error format.
    handler: (req, res, next) => next(AppError.fromCode(ERRORS.RATE_LIMITED)),
  });

const globalLimiter = createRateLimiter(GLOBAL_RATE_LIMIT);

module.exports = { createRateLimiter, globalLimiter };