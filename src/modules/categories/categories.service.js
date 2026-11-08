const slugify = require('slugify');
const Category = require('./category.model');
const Product = require('../products/product.model');
const AppError = require('../../utils/appError');
const { ERRORS, MESSAGES } = require('../../utils/messages');

const toSlug = (name) => slugify(name, { lower: true, strict: true, trim: true });

// A 400 VALIDATION_ERROR pointing at one field. Also used by the products service.
const fieldError = (field, message) =>
  AppError.fromCode(ERRORS.VALIDATION_ERROR, undefined, { errors: [{ field, message }] });

// Active products per category id, in one aggregation. Each product counts once for its
// main category and once for its sub-category: $project makes a two-item array of both ids,
// $unwind turns it into two rows, and $group counts the rows per id.
const getProductCounts = async () => {
  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $project: { _id: 0, ids: ['$category', '$subCategory'] } },
    { $unwind: '$ids' },
    { $group: { _id: '$ids', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(counts.map(({ _id, count }) => [_id.toString(), count]));
};

// Only one category is checked here, so count its products directly instead of counting all.
const assertHasNoProducts = async (id) => {
  const count = await Product.countDocuments({
    isActive: true,
    $or: [{ category: id }, { subCategory: id }],
  });
  if (count === 0) return;
  throw AppError.fromCode(ERRORS.CATEGORY_NOT_EMPTY, MESSAGES.CATEGORY_HAS_PRODUCTS(count));
};

const getCategoryTree = async () => {
  const [categories, productCounts] = await Promise.all([
    Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1, _id: 1 }).lean(),
    getProductCounts(),
  ]);
  const addCount = (category) => ({
    ...category,
    productCount: productCounts[category._id.toString()] ?? 0,
  });
  const mainCategories = categories.filter((category) => !category.parent);

  return mainCategories.map((main) => ({
    ...addCount(main),
    subCategories: categories
      .filter((category) => category.parent?.equals(main._id))
      .map(addCount),
  }));
};

const createCategory = async ({ name, parent = null, image = null, sortOrder = 0 }) => {
  if (parent) {
    // Only a main category (one with no parent of its own) can be a parent: two levels only.
    const isMainCategory = await Category.exists({ _id: parent, parent: null });
    if (!isMainCategory) throw fieldError('parent', MESSAGES.PARENT_INVALID);
  }
  // The slug is created once and never changes when the name is edited,
  // so links and bookmarks keep working. A duplicate slug returns 409 CONFLICT.
  const slug = toSlug(name);
  if (!slug) throw fieldError('name', MESSAGES.CATEGORY_NAME_INVALID);

  const category = await Category.create({ name, slug, parent, image, sortOrder });
  return category.toObject();
};

// Also used for DELETE (which sends { isActive: false }), so both paths share the product check.
const updateCategory = async (id, changes) => {
  if (changes.isActive === false) await assertHasNoProducts(id);

  const category = await Category.findByIdAndUpdate(
    id,
    { $set: changes },
    { new: true, runValidators: true },
  ).lean();
  if (!category) throw AppError.fromCode(ERRORS.NOT_FOUND);
  return category;
};

module.exports = { getCategoryTree, createCategory, updateCategory, toSlug, fieldError };