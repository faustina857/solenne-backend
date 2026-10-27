class AppError extends Error {
  // extra is merged into the error response, e.g. { errors } or { items }.
  constructor(message, statusCode, code, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.extra = extra;
  }

  // error comes from ERRORS in utils/messages.js. Pass message to make it specific.
  static fromCode(error, message, extra) {
    return new AppError(message || error.message, error.status, error.code, extra);
  }
}

module.exports = AppError;