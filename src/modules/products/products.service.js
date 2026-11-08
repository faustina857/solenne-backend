const Product = require('./product.model');
const Category = require('../categories/category.model');
const { toSlug, fieldError } = require('../categories/categories.service');
const AppError = require('../../utils/appError');
const { ERRORS, EMPTY, MESSAGES } = require('../../utils/messages');
const { getSkip } = require('../../utils/pagination');
const { ROLES, GENDERS, PRODUCT_SORTS, LOW_STOCK_THRESHOLD } = require('../../constants');

// Only this file uses these, so they live here.
const DUPLICATE_KEY_ERROR_CODE = 11000;
// men and women also see unisex products. unisex (or no gender) means no gender filter.
const GENDER_MATCHES = Object.freeze({
  [GENDERS.MEN]: Object.freeze([GENDERS.MEN, GENDERS.UNISEX]),
  [GENDERS.WOMEN]: Object.freeze([GENDERS.WOMEN, GENDERS.UNISEX]),
});
// Used only to show sizes in a natural order (S, M, L). It does not limit which sizes exist.
const SIZE_ORDER = Object.freeze(['XS', 'S', 'M', 'L', 'XL', 'XXL']);

// Replaces the category ids with { id, name, slug } so the frontend needn't look them up.
const CATEGORY_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'subCategory', select: 'name slug' },
];

const compareText = (a, b) => a.localeCompare(b);
const sizeRank = (size) => {
  const index = SIZE_ORDER.indexOf(size);
  return index === -1 ? SIZE_ORDER.length : index;
};
// Known sizes first in natural order (S, M, L), the rest (like 40, 42) in numeric order.
const compareSizes = (a, b) =>
  sizeRank(a) - sizeRank(b) || a.localeCompare(b, undefined, { numeric: true });

// Adds the derived fields (target-backend.md 6.2) and hides internal ones.
const toPublicProduct = ({ soldCount, ...product }) => {
  const inStockVariants = product.variants.filter((variant) => variant.stock > 0);
  const totalStock = inStockVariants.reduce((sum, variant) => sum + variant.stock, 0);
  return {
    ...product,
    inStock: inStockVariants.length > 0,
    // A sold-out product shows only inStock: false, never both flags.
    lowStock: totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD,
    availableSizes: [...new Set(inStockVariants.map((variant) => variant.size))].sort(compareSizes),
    availableColors: [...new Set(inStockVariants.map((variant) => variant.color))].sort(compareText),
  };
};

// The brandSlug is stored so the product list can filter by brand without a join.
// Returns {} when the brand isn't being changed.
const getBrandFields = (brand) => {
  if (brand === undefined) return {};
  if (brand === null) return { brand: null, brandSlug: null };

  const brandSlug = toSlug(brand);
  if (!brandSlug) throw fieldError('brand', MESSAGES.BRAND_INVALID);
  return { brand, brandSlug };
};

// A compare-at ("was") price must be higher than the selling price.
const assertValidPrices = (price, compareAtPrice) => {
  if (!compareAtPrice) return;
  if (compareAtPrice <= price) throw fieldError('compareAtPrice', MESSAGES.COMPARE_PRICE_INVALID);
};

// A unique index can't see duplicates inside one document, so we check here.
const assertUniqueVariants = (variants) => {
  const skus = new Set();
  const combinations = new Set();
  for (const { sku, size, color } of variants) {
    const combination = `${size}|${color}`;
    if (skus.has(sku) || combinations.has(combination)) {
      throw fieldError('variants', MESSAGES.VARIANTS_DUPLICATE);
    }
    skus.add(sku);
    combinations.add(combination);
  }
};

// The sub-category must be an active child of the chosen active main category.
const assertCategoriesMatch = async (category, subCategory) => {
  const [hasMain, hasSub] = await Promise.all([
    Category.exists({ _id: category, parent: null, isActive: true }),
    Category.exists({ _id: subCategory, parent: category, isActive: true }),
  ]);
  if (!hasMain) throw fieldError('category', MESSAGES.PRODUCT_CATEGORY_INVALID);
  if (!hasSub) throw fieldError('subCategory', MESSAGES.PRODUCT_SUBCATEGORY_INVALID);
};

const insertProduct = async (data) => {
  try {
    return await Product.create(data);
  } catch (error) {
    if (error.code !== DUPLICATE_KEY_ERROR_CODE) throw error;
    // keyPattern names the index that clashed, so the message says what to change.
    const message = error.keyPattern?.slug ? MESSAGES.PRODUCT_NAME_TAKEN : MESSAGES.SKU_TAKEN;
    throw AppError.fromCode(ERRORS.CONFLICT, message);
  }
};

const createProduct = async (data) => {
  // The slug is created once and never changes when the name is edited.
  const slug = toSlug(data.name);
  if (!slug) throw fieldError('name', MESSAGES.PRODUCT_NAME_INVALID);
  const brandFields = getBrandFields(data.brand);
  assertValidPrices(data.price, data.compareAtPrice);
  assertUniqueVariants(data.variants);
  await assertCategoriesMatch(data.category, data.subCategory);

  const product = await insertProduct({ ...data, ...brandFields, slug });
  await product.populate(CATEGORY_POPULATE);
  return toPublicProduct(product.toObject());
};

// When only one of price / compareAtPrice changes, the other comes from the stored product.
const getEffectivePrices = async (id, changes) => {
  const hasPrice = changes.price !== undefined;
  const hasCompare = changes.compareAtPrice !== undefined;
  if (hasPrice === hasCompare) {
    return { price: changes.price, compareAtPrice: changes.compareAtPrice };
  }
  const current = await Product.findById(id).select('price compareAtPrice').lean();
  if (!current) throw AppError.fromCode(ERRORS.PRODUCT_NOT_FOUND);
  return {
    price: changes.price ?? current.price,
    compareAtPrice: hasCompare ? changes.compareAtPrice : current.compareAtPrice,
  };
};

const updateProduct = async (id, changes) => {
  const brandFields = getBrandFields(changes.brand);
  const { price, compareAtPrice } = await getEffectivePrices(id, changes);
  assertValidPrices(price, compareAtPrice);
  if (changes.category) await assertCategoriesMatch(changes.category, changes.subCategory);

  const product = await Product.findByIdAndUpdate(
    id,
    { $set: { ...changes, ...brandFields } },
    { new: true, runValidators: true },
  )
    .populate(CATEGORY_POPULATE)
    .lean();
  if (!product) throw AppError.fromCode(ERRORS.PRODUCT_NOT_FOUND);
  return toPublicProduct(product);
};

// Deleting means deactivating: past orders still point at the product.
const deactivateProduct = (id) => updateProduct(id, { isActive: false });

// Sets the stock to the number the admin sends (target-backend.md 12). Note: if an order
// reserved stock a second ago, the admin's number wins, so admins should send the real count.
const setVariantStock = async (id, sku, stock) => {
  const product = await Product.findOneAndUpdate(
    { _id: id, 'variants.sku': sku },
    { $set: { 'variants.$.stock': stock } },
    { new: true, runValidators: true },
  )
    .populate(CATEGORY_POPULATE)
    .lean();
  if (!product) throw AppError.fromCode(ERRORS.PRODUCT_NOT_FOUND, MESSAGES.VARIANT_NOT_FOUND);
  return toPublicProduct(product);
};

const getProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug, isActive: true })
    .populate(CATEGORY_POPULATE)
    .lean();
  if (!product) throw AppError.fromCode(ERRORS.PRODUCT_NOT_FOUND);
  return toPublicProduct(product);
};

// Turns category / sub-category slugs into ids in one query.
// Returns null when a slug doesn't exist, so the caller can return an empty list.
const findCategoryIds = async ({ category, subCategory }) => {
  const slugs = [category, subCategory].filter(Boolean);
  if (slugs.length === 0) return {};

  const found = await Category.find({ slug: { $in: slugs } }).select('slug').lean();
  // A Map, not a plain object: a slug like "constructor" must not match an object property.
  const idBySlug = new Map(found.map((item) => [item.slug, item._id]));
  if (slugs.some((slug) => !idBySlug.has(slug))) return null;

  const ids = {};
  if (category) ids.category = idBySlug.get(category);
  if (subCategory) ids.subCategory = idBySlug.get(subCategory);
  return ids;
};

// Builds the Mongo filter from validated fields only (never from raw req.query).
const buildFilter = (query, categoryIds, user) => {
  const { gender, brand, q, minPrice, maxPrice, size, color, inStock, includeInactive } = query;
  const filter = { ...categoryIds };

  // Only admins can see deactivated products. For everyone else the flag is ignored.
  if (!(includeInactive && user?.role === ROLES.ADMIN)) filter.isActive = true;
  if (GENDER_MATCHES[gender]) filter.gender = { $in: GENDER_MATCHES[gender] };
  if (brand) filter.brandSlug = brand;
  if (q) filter.$text = { $search: q };

  const price = {};
  if (minPrice !== undefined) price.$gte = minPrice;
  if (maxPrice !== undefined) price.$lte = maxPrice;
  if (Object.keys(price).length > 0) filter.price = price;

  // One $elemMatch means size, color and stock must all be true of the SAME variant.
  const variantMatch = {};
  if (size) variantMatch.size = size;
  if (color) variantMatch.color = color;
  if (inStock) variantMatch.stock = { $gt: 0 };
  if (Object.keys(variantMatch).length > 0) filter.variants = { $elemMatch: variantMatch };

  return filter;
};

// Which empty-state message to show (target-backend.md 13.2).
const getEmptyMessage = (query) => {
  const { q, category, subCategory,brand, gender, size, color, minPrice, maxPrice, inStock } = query;
  if (q) return EMPTY.PRODUCTS_SEARCH(q);

  const hasRefinement =
    [gender, brand, size, color, minPrice, maxPrice].some((value) => value !== undefined) ||
    inStock === true;
  if (subCategory && !hasRefinement) return EMPTY.SUB_CATEGORY;
  if (hasRefinement || category || subCategory) return EMPTY.PRODUCTS_FILTERED;
  return EMPTY.PRODUCTS;
};

const listProducts = async (query, user) => {
  const emptyMessage = getEmptyMessage(query);
  const categoryIds = await findCategoryIds(query);
  if (!categoryIds) return { products: [], total: 0, emptyMessage };

  const filter = buildFilter(query, categoryIds, user);
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ ...PRODUCT_SORTS[query.sort] })
      .skip(getSkip(query))
      .limit(query.limit)
      .populate(CATEGORY_POPULATE)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return { products: products.map(toPublicProduct), total, emptyMessage };
};

const noFilters = () => ({ sizes: [], colors: [], brands:[], priceRange: null });

const toBrandList = (brands) => {
  const bySlug = new Map();
  for (const { name, slug } of brands) {
    if (slug && !bySlug.has(slug)) bySlug.set(slug, { name, slug });
  }
  return [...bySlug.values()].sort((a, b) => compareText(a.name, b.name));
};

// Sizes, colors and price range for the current selection, in one aggregation.
const getProductFilters = async (query) => {
  const categoryIds = await findCategoryIds(query);
  if (!categoryIds) return noFilters();

  const [result] = await Product.aggregate([
    { $match: buildFilter(query, categoryIds) },
    { $unwind: '$variants' },
    {
      $group: {
        _id: null,
        sizes: { $addToSet: '$variants.size' },
        colors: { $addToSet: '$variants.color' },
        brands: { $addToSet: { name: '$brand', slug: '$brandSlug' } },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
  ]);
  if (!result) return noFilters();

  return {
    sizes: result.sizes.sort(compareSizes),
    colors: result.colors.sort(compareText),
    brands: toBrandList(result.brands),
    priceRange: { min: result.minPrice, max: result.maxPrice },
  };
};

module.exports = {
  createProduct,
  updateProduct,
  deactivateProduct,
  setVariantStock,
  getProductBySlug,
  listProducts,
  getProductFilters,
};