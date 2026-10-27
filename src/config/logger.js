const pino = require('pino');

const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      '*.token',
    ],
    censor: '[Redacted]',
  },
});

module.exports = logger;