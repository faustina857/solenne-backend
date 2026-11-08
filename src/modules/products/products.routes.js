const express = require('express');
const controller = require('./products.controller');
const {
  createProductBody,
  updateProductBody,
  stockBody,
  listProductsQuery,
  filtersQuery,
  productParams,
  slugParams,
  variantParams,
} = require('./products.validation');
const { validate } = require('../../middleware/validate');
const { authenticate, optionalAuthenticate, requireRole } = require('../../middleware/auth');
const { createRateLimiter } = require('../../middleware/rateLimit');
const { ROLES } = require('../../constants');

// Only this file uses it, so it lives here.
const SEARCH_RATE_LIMIT = Object.freeze({ windowMs: 60 * 1000, limit: 30 });

const router = express.Router();
const adminOnly = [authenticate, requireRole(ROLES.ADMIN)];

const searchLimiter = createRateLimiter(SEARCH_RATE_LIMIT);
// Only searches (requests with q) get the stricter limit. Plain browsing uses the global one.
const limitSearches = (req, res, next) =>
  req.valid.query.q ? searchLimiter(req, res, next) : next();

router.get(
  '/',
  optionalAuthenticate,
  validate({ query: listProductsQuery }),
  limitSearches,
  controller.listProducts,
);
// Must stay above '/:slug', otherwise "filters" would be read as a product slug.
router.get('/filters', validate({ query: filtersQuery }), limitSearches, controller.getProductFilters);
router.get('/:slug', validate({ params: slugParams }), controller.getProduct);

router.post('/', ...adminOnly, validate({ body: createProductBody }), controller.createProduct);
router.patch(
  '/:id',
  ...adminOnly,
  validate({ params: productParams, body: updateProductBody }),
  controller.updateProduct,
);
router.delete('/:id', ...adminOnly, validate({ params: productParams }), controller.deactivateProduct);
router.patch(
  '/:id/variants/:sku/stock',
  ...adminOnly,
  validate({ params: variantParams, body: stockBody }),
  controller.setVariantStock,
);

module.exports = router;