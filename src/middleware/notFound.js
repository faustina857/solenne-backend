const AppError = require('../utils/appError');
const { ERRORS } = require('../utils/messages');

const notFound = (req, res, next) => next(AppError.fromCode(ERRORS.ROUTE_NOT_FOUND));

module.exports = notFound;