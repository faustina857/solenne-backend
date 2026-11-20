const Joi = require('joi');
const { objectId } = require('../../middleware/validate');
const { MAX_CART_QUANTITY, MAX_CART_LINES } = require('../../constants');

// Loose on purpose: products are found by exact sku, so a wrong sku simply isn't found.
// This only stops oversized input. Skus are stored uppercase, so the value is uppercased.
const SKU_MAX_LENGTH = 100;

const sku = Joi.string().trim().uppercase().max(SKU_MAX_LENGTH).required();
const quantity = Joi.number().integer().min(1).max(MAX_CART_QUANTITY).required();

const cartItem = Joi.object({ productId: objectId().required(), sku, quantity });

const addItemBody = cartItem;
const updateItemBody = Joi.object({ quantity });
// Used by both preview and merge. An empty list is fine (a guest with an empty cart).
const itemsBody = Joi.object({
  items: Joi.array().items(cartItem).max(MAX_CART_LINES).required(),
});
const skuParams = Joi.object({ sku });

module.exports = { addItemBody, updateItemBody, itemsBody, skuParams };