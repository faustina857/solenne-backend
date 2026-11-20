const Wishlist = require('./wishlist.model');
const Product = require('../products/product.model');
const AppError = require('../../utils/appError');
const { getPublicProductsByIds } = require('../products/products.service');
const { ERRORS } = require('../../utils/messages');
const { MAX_WISHLIST_PRODUCTS } = require('../../constants');

const unique = (ids) => [...new Set(ids)];

const getWishlist = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId }).select('products').lean();
  return getPublicProductsByIds(wishlist?.products ?? []);
};

// Guests keep ids in the browser; this shows them live. Nothing is saved.
const previewWishlist = (productIds) => getPublicProductsByIds(unique(productIds));

// Add one product. The filter says: "this product is already saved, OR there is room".
// $addToSet adds it only if it isn't there, so adding twice is harmless (idempotent), and
// a full wishlist matches nothing.
const addProductOperation = (userId, productId) => ({
  filter: {
    user: userId,
    $or: [
      { products: productId },
      { $expr: { $lt: [{ $size: { $ifNull: ['$products', []] } }, MAX_WISHLIST_PRODUCTS] } },
    ],
  },
  update: { $addToSet: { products: productId } },
});

// Same atomic get-or-create as the cart (see cart.service.js for why the error is ignored).
const ensureWishlist = async (userId) => {
  try {
    await Wishlist.updateOne({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

const addProduct = async (userId, productId) => {
  if (!(await Product.exists({ _id: productId, isActive: true }))) {
    throw AppError.fromCode(ERRORS.PRODUCT_NOT_FOUND);
  }
  await ensureWishlist(userId);
  const { filter, update } = addProductOperation(userId, productId);
  const { matchedCount } = await Wishlist.updateOne(filter, update);
  if (matchedCount === 0) throw AppError.fromCode(ERRORS.WISHLIST_FULL);
  return getWishlist(userId);
};

const removeProduct = async (userId, productId) => {
  await Wishlist.updateOne({ user: userId }, { $pull: { products: productId } });
  return getWishlist(userId);
};

// Ids from browser storage may be stale, so only active products are saved. When the
// wishlist fills up, the remaining operations simply match nothing.
const mergeWishlist = async (userId, productIds) => {
  const ids = unique(productIds);
  const found = await Product.find({ _id: { $in: ids }, isActive: true }).select('_id').lean();
  const realIds = new Set(found.map(({ _id }) => _id.toString()));
  const toSave = ids.filter((id) => realIds.has(id));

  if (toSave.length > 0) {
    await ensureWishlist(userId);
    await Wishlist.bulkWrite(
      toSave.map((id) => ({ updateOne: addProductOperation(userId, id) })),
    );
  }
  return getWishlist(userId);
};

module.exports = { getWishlist, previewWishlist, addProduct, removeProduct, mergeWishlist };