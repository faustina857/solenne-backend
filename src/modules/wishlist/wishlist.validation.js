const Joi = require('joi');
const { objectId } = require('../../middleware/validate');
const { MAX_WISHLIST_PRODUCTS } = require('../../constants');

// Used by both preview and merge. Repeated ids are allowed here and removed in the service.
const productIdsBody = Joi.object({
  productIds: Joi.array().items(objectId()).max(MAX_WISHLIST_PRODUCTS).required(),
});
const productParams = Joi.object({ productId: objectId().required() });

module.exports = { productIdsBody, productParams };