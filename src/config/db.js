const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');
const { DB_CONNECT_TIMEOUT_MS } = require('../constants');

mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

const connectDb = async () => {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: DB_CONNECT_TIMEOUT_MS });
  logger.info('MongoDB connected');
};

const disconnectDb = () => mongoose.disconnect();

module.exports = { connectDb, disconnectDb };