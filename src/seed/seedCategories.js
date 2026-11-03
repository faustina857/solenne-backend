const { connectDb, disconnectDb } = require('../config/db');
const logger = require('../config/logger');
const Category = require('../modules/categories/category.model');
const { toSlug } = require('../modules/categories/categories.service');

const CATEGORY_TREE = [
  {
    name: 'Clothing Collection',
    sortOrder: 1,
    subCategories: ['Jeans', 'Gowns','Skirts','Tops','Polo wears', 'Shirts', 'Trousers', 'Jackets', 'Shorts'],
  },
  {
    name: 'Fashion Accessories',
    sortOrder: 2,
    subCategories: ['Bags', 'Shoes', 'Jewelry', 'Watches', 'Belts', 'Sunglasses'],
  },
];

// Creates the category if its slug doesn't exist yet, and returns it either way.
// $setOnInsert only writes on creation, so re-running never overwrites admin edits
// (a new sortOrder, a deactivated category).
const upsertCategory = (name, parent, sortOrder) =>
  Category.findOneAndUpdate(
    { slug: toSlug(name) },
    { $setOnInsert: { name, parent, sortOrder } },
    { upsert: true, new: true },
  )
    .select('_id')
    .lean();

const seedCategories = async () => {
  await connectDb();
  // The two main categories are independent, so they run together. Each one's
  // sub-categories need its id, so they wait for it, then run together too.
  await Promise.all(
    CATEGORY_TREE.map(async ({ name, sortOrder, subCategories }) => {
      const main = await upsertCategory(name, null, sortOrder);
      await Promise.all(
        subCategories.map((subName, index) => upsertCategory(subName, main._id, index + 1)),
      );
    }),
  );
  logger.info('Main categories and sub-categories are in place.');
};

seedCategories()
  .catch((error) => {
    logger.error(error);
    process.exitCode = 1;
  })
  .finally(disconnectDb);