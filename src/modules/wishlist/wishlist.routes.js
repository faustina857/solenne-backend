const express = require('express');
const controller = require('./wishlist.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { createRateLimiter } = require('../../middleware/rateLimit');
const { PREVIEW_RATE_LIMIT } = require('../../constants');
const { productIdsBody, productParams } = require('./wishlist.validation');

const router = express.Router();

// Public, before authenticate.
router.post(
  '/preview',
  createRateLimiter(PREVIEW_RATE_LIMIT),
  validate({ body: productIdsBody }),
  controller.previewWishlist,
);

router.use(authenticate);

router.get('/', controller.getWishlist);
// ORDER MATTERS: /merge must be registered before /:productId. Otherwise Express would
// treat the word "merge" as a product id, and validation would answer 404.
router.post('/merge', validate({ body: productIdsBody }), controller.mergeWishlist);
router.post('/:productId', validate({ params: productParams }), controller.addProduct);
router.delete('/:productId', validate({ params: productParams }), controller.removeProduct);

module.exports = router;