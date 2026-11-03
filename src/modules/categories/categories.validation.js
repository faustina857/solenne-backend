const Joi = require('joi');
const {objectId} = require('../../middleware/validate');
const {CATEGORY_NAME_MIN_LENGTH, CATEGORY_NAME_MAX_LENGTH, CATEGORY_NAME_PATTERN, 
    IMAGE_URL_MAX_LENGTH, SORT_ORDER_MAX, IMAGE_PUBLIC_ID_MAX_LENGTH  } = require('../../constants');
const { MESSAGES } = require('../../utils/messages');

const name = Joi.string().trim().min(CATEGORY_NAME_MIN_LENGTH)
    .max(CATEGORY_NAME_MAX_LENGTH).pattern(CATEGORY_NAME_PATTERN)
    .messages({ 'string.pattern.base': MESSAGES.CATEGORY_NAME_INVALID });

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