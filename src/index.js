const env = require('./config/env');
const logger = require('./config/logger');
const { connectDb, disconnectDb } = require('./config/db');
const { SHUTDOWN_TIMEOUT_MS } = require('./constants');
const app = require('./app');

// After one of these the process state can't be trusted. Log and exit; the host restarts it.
const crash = (label) => (err) => {
  logger.fatal({ err }, label);
  process.exit(1);
};

process.on('unhandledRejection', crash('Unhandled promise rejection'));
process.on('uncaughtException', crash('Uncaught exception'));

const shutdown = (server, signal) => {
  logger.info({ signal }, 'Shutting down');

  // Safety net so a stuck connection can't keep the process alive forever.
  setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  // Stop accepting new requests, let in-flight ones finish, then close the database.
  server.close(async () => {
    await disconnectDb();
    logger.info('Shutdown complete');
    process.exit(0);
  });
  server.closeIdleConnections();
};

const start = async () => {
  await connectDb();

  const server = app.listen(env.port, (err) => {
    if (err) throw err;
    logger.info({ port: env.port, env: env.nodeEnv }, 'Solenne API listening');
  });

  process.once('SIGTERM', () => shutdown(server, 'SIGTERM'));
  process.once('SIGINT', () => shutdown(server, 'SIGINT'));
};

start().catch(crash('Failed to start'));