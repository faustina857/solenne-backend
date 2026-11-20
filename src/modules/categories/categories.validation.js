const Joi = require('joi');
const {objectId} = require('../../middleware/validate');
const { IMAGE_URL_MAX_LENGTH, IMAGE_PUBLIC_ID_MAX_LENGTH  } = require('../../constants');
const { MESSAGES } = require('../../utils/messages');

// Starts with a letter or digit (any language), then letters, digits, spaces and & ' . -
const name = Joi.string().trim().min(2)
    .max(60).pattern( /^[\p{L}\p{N}][\p{L}\p{N} '&.-]*$/u )
    .messages({ 'string.pattern.base': MESSAGES.CATEGORY_NAME_INVALID });
const SORT_ORDER_MAX = 9999;

const image = Joi.object({
    url: Joi.string().trim().uri({ scheme: 'https' }).max(IMAGE_URL_MAX_LENGTH).required(),
    publicId: Joi.string().trim().max(IMAGE_PUBLIC_ID_MAX_LENGTH).required()
});
const sortOrder = Joi.number().integer().min(0).max(SORT_ORDER_MAX);

const createCategoryBody = Joi.object({
    name: name.required(),
    parent: objectId(),
    image,
    sortOrder,
});
const updateCategoryBody = Joi.object({
    name,
    image: image.allow(null),
    sortOrder,
    isActive: Joi.boolean(),
}).min(1);


const categoryParams = Joi.object({ id: objectId().required() });

module.exports = { createCategoryBody, updateCategoryBody, categoryParams };