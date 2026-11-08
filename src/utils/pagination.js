const Joi = require('joi');
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const MAX_PAGE = 1000;
// Spread these into any list endpoint's query schema.
const paginationKeys = Object.freeze({
  page: Joi.number().integer().min(1).max(MAX_PAGE).default(1),
  limit: Joi.number().integer().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

// How many documents to skip so that page N starts in the right place.
const getSkip = ({ page, limit }) => (page - 1) * limit;

module.exports = { paginationKeys, getSkip };