const ROLES = Object.freeze({ CUSTOMER: 'customer', ADMIN: 'admin' });

const NIGERIAN_STATES = Object.freeze([
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
]);
const BCRYPT_COST = 12;
const MAX_ADDRESSES = 10;
const MS_PER_SECOND = 1000;
const CODE_LENGTH = 6;
const CODE_PATTERN = new RegExp(`^\\d{${CODE_LENGTH}}$`);
const CODE_TTL_MINUTES = 15;
const CODE_TTL_MS = CODE_TTL_MINUTES * 60 * 1000;
const IMAGE_URL_MAX_LENGTH = 2048;
const IMAGE_PUBLIC_ID_MAX_LENGTH = 255;

const GENDERS = Object.freeze({MEN: 'men', WOMEN: 'women', UNISEX: 'unisex'});
// men and women also see unisex products. unisex (or no gender) means no gender filter.
// Every sort ends with _id so items never repeat or vanish between pages.
const PRODUCT_SORTS = Object.freeze({
  newest: Object.freeze({ createdAt: -1, _id: -1 }),
  price_asc: Object.freeze({ price: 1, _id: 1 }),
  price_desc: Object.freeze({ price: -1, _id: -1 }),
  popular: Object.freeze({ soldCount: -1, _id: -1 }),
});

const LOW_STOCK_THRESHOLD = 5;
const MAX_CART_QUANTITY = 10;
const MAX_CART_LINES = 50;
const MAX_WISHLIST_PRODUCTS = 100;
// Public "preview" endpoints do database work for anyone, so they get a stricter limit.
const PREVIEW_RATE_LIMIT = Object.freeze({ windowMs: 60 * MS_PER_SECOND, limit: 30 });

module.exports = { 
  MS_PER_SECOND, ROLES, NIGERIAN_STATES, BCRYPT_COST, 
  MAX_ADDRESSES, CODE_LENGTH, CODE_PATTERN, CODE_TTL_MINUTES, CODE_TTL_MS, 
 IMAGE_URL_MAX_LENGTH, IMAGE_PUBLIC_ID_MAX_LENGTH, 
    GENDERS, PRODUCT_SORTS, LOW_STOCK_THRESHOLD, MAX_CART_QUANTITY, MAX_CART_LINES, 
    MAX_WISHLIST_PRODUCTS, PREVIEW_RATE_LIMIT
};