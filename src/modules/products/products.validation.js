const Joi = require('joi');
const { objectId } = require('../../middleware/validate');
const { paginationKeys } = require('../../utils/pagination');
const { MESSAGES } = require('../../utils/messages');
const {
  GENDERS, PRODUCT_SORTS, IMAGE_URL_MAX_LENGTH,
  IMAGE_PUBLIC_ID_MAX_LENGTH,
} = require('../../constants');


// Sizes and colors are cleaned the same way on save and in filters, so "m", " M " and "M"
// are one size, and "off  white" and "Off White" are one color. Filters then match exactly.
const collapseSpaces = (value) => value.replace(/\s+/g, ' ');
const toTitleCase = (value) =>
  collapseSpaces(value).toLowerCase().replace(/(^|[ -])\p{L}/gu, (match) => match.toUpperCase());

const sku = Joi.string()
  .trim()
  .uppercase()
  .max(40)
  .pattern(/^[A-Z0-9][A-Z0-9_-]*$/)
  .messages({ 'string.pattern.base': MESSAGES.SKU_INVALID });
const size = Joi.string()
  .trim()
  .max(20)
  .pattern(/^[\p{L}\p{N}][\p{L}\p{N} ./-]*$/u)
  .custom((value) => collapseSpaces(value).toUpperCase())
  .messages({ 'string.pattern.base': MESSAGES.SIZE_INVALID });
const color = Joi.string()
  .trim()
  .max(30)
  .pattern(/^\p{L}[\p{L} -]*$/u)
  .custom(toTitleCase)
  .messages({ 'string.pattern.base': MESSAGES.COLOR_INVALID });
const brand = Joi.string()
  .trim()
  .max(60)
  .pattern(/^[\p{L}\p{N}][\p{L}\p{N} '&.,+-]*$/u)
  .custom(collapseSpaces)
  .messages({ 'string.pattern.base': MESSAGES.BRAND_INVALID });
const slug = Joi.string().trim().lowercase().max(150).pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// Kobo, whole numbers only.
const price = Joi.number().integer().min(1).max(10_000_000_000);
const stock = Joi.number().integer().min(0).max(10000);

const image = Joi.object({
  url: Joi.string().uri({ scheme: 'https' }).max(IMAGE_URL_MAX_LENGTH).required(),
  publicId: Joi.string().trim().max(IMAGE_PUBLIC_ID_MAX_LENGTH).required(),
});
const variant = Joi.object({
  sku: sku.required(),
  size: size.required(),
  color: color.required(),
  stock: stock.required(),
});

const name = Joi.string().trim().min(2).max(30);
const description = Joi.string().trim().max(200);
const gender = Joi.string().valid(...Object.values(GENDERS));
const images = Joi.array().items(image).min(1).max(10);

// No `variants` here: variants are fixed after create, and stock has its own endpoint.
// slug, soldCount and ratings are never accepted from a client.
const createProductBody = Joi.object({
  name: name.required(),
  description: description.required(),
  brand,
  category: objectId().required(),
  subCategory: objectId().required(),
  gender: gender.required(),
  images: images.required(),
  price: price.required(),
  compareAtPrice: price,
  variants: Joi.array().items(variant).min(1).max(50).required(),
  isActive: Joi.boolean(),
});

const updateProductBody = Joi.object({
  name,
  description,
  brand: brand.allow(null),
  category: objectId(),
  subCategory: objectId(),
  gender,
  images,
  price,
  compareAtPrice: price.allow(null), // null removes the "was" price
  isActive: Joi.boolean(),
})
  .and('category', 'subCategory')
  .min(1);

const stockBody = Joi.object({ stock: stock.required() });

// Shared by the product list and the filters endpoint.
const filterKeys = {
  gender,
  category: slug,
  subCategory: slug,
  q: Joi.string().trim().max(100).empty(''),
};

const listProductsQuery = Joi.object({
  ...paginationKeys,
  ...filterKeys,
  brand: slug,
  size,
  color,
  minPrice: Joi.number().integer().min(0),
  maxPrice: Joi.number().integer().min(0),
  inStock: Joi.boolean(),
  sort: Joi.string().valid(...Object.keys(PRODUCT_SORTS)).default('newest'),
  includeInactive: Joi.boolean(),
});
const filtersQuery = Joi.object(filterKeys);

const productParams = Joi.object({ id: objectId().required() });
const slugParams = Joi.object({
  slug: Joi.string().trim().lowercase().max(150).required(),
});
const variantParams = Joi.object({ id: objectId().required(), sku: sku.required() });

module.exports = {
  createProductBody,
  updateProductBody,
  stockBody,
  listProductsQuery,
  filtersQuery,
  productParams,
  slugParams,
  variantParams,
};