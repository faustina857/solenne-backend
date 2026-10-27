const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { ERRORS, VALIDATION_MESSAGES } = require('../utils/messages');
const logger = require('../config/logger');

const JWT_AUTH_ERRORS = ['JsonWebTokenError', 'NotBeforeError'];

// Turns anything thrown into an AppError so raw library messages never reach the client.
const toAppError = (err) => {
  // Already an AppError, so just return it.
  if (err instanceof AppError) return err;
  if (err.expose && err.status >= 400 && err.status < 500) {
    return AppError.fromCode(ERRORS.BAD_REQUEST);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: VALIDATION_MESSAGES['any.invalid'],
    }));
    return AppError.fromCode(ERRORS.VALIDATION_ERROR, undefined, { errors });
  }

  if (err instanceof mongoose.Error.CastError) return AppError.fromCode(ERRORS.NOT_FOUND);

  // Email is the only duplicate with its own message; every other one is a generic conflict.
  if (err.code === 11000) {
    return AppError.fromCode(err.keyPattern?.email ? ERRORS.EMAIL_EXISTS : ERRORS.CONFLICT);
  }

  if (err.name === 'TokenExpiredError') return AppError.fromCode(ERRORS.SESSION_EXPIRED);
  if (JWT_AUTH_ERRORS.includes(err.name)) return AppError.fromCode(ERRORS.UNAUTHENTICATED);

  return AppError.fromCode(ERRORS.SERVER_ERROR);
};

// Express recognises an error handler by its four arguments, so next must stay.
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const appError = toAppError(err);

  if (appError.statusCode >= 500) logger.error({ err }, 'Request failed');

  return res.status(appError.statusCode).json({
    ...appError.extra,
    success: false,
    code: appError.code,
    message: appError.message,
  });
};

module.exports = errorHandler;