const express = require('express');
const controller = require('./cart.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { createRateLimiter } = require('../../middleware/rateLimit');
const { PREVIEW_RATE_LIMIT } = require('../../constants');
const { addItemBody, updateItemBody, itemsBody, skuParams } = require('./cart.validation');

const router = express.Router();

// Public (guests have no account), so it comes BEFORE authenticate and has its own limiter.
router.post(
  '/preview',
  createRateLimiter(PREVIEW_RATE_LIMIT),
  validate({ body: itemsBody }),
  controller.previewCart,
);

// Everything below needs a login. Email verification is only needed to place an order.
router.use(authenticate);

router.get('/', controller.getCart);
router.post('/items', validate({ body: addItemBody }), controller.addItem);
router.patch(
  '/items/:sku',
  validate({ params: skuParams, body: updateItemBody }),
  controller.updateItem,
);
router.delete('/items/:sku', validate({ params: skuParams }), controller.removeItem);
router.delete('/', controller.clearCart);
router.post('/merge', validate({ body: itemsBody }), controller.mergeCart);

module.exports = router;