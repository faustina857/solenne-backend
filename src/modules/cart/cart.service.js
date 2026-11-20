const Cart = require('./cart.model');
const Product = require('../products/product.model');
const AppError = require('../../utils/appError');
const { fieldError } = require('../categories/categories.service');
const { ERRORS, MESSAGES } = require('../../utils/messages');
const {
  MAX_CART_QUANTITY,
  MAX_CART_LINES,
  DUPLICATE_KEY_ERROR_CODE,
} = require('../../constants');

// Only this file uses these, so they live here.
const LINE_STATUS = Object.freeze({
  OK: 'ok',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  UNAVAILABLE: 'unavailable',
});
const ISSUE_MESSAGES = Object.freeze({
  [LINE_STATUS.LOW_STOCK]: (label, line) => MESSAGES.CART_LOW_STOCK(label, line.availableStock),
  [LINE_STATUS.OUT_OF_STOCK]: (label) => MESSAGES.CART_OUT_OF_STOCK(label),
  [LINE_STATUS.UNAVAILABLE]: (label) => MESSAGES.CART_UNAVAILABLE(label),
});
const UNKNOWN_ITEM_LABEL = 'An item';

// ---------- Reading: build the live cart (used by GET, preview and after every change) ----------

// One query for every product in the cart (no query per line).
const findProducts = async (items) => {
  if (items.length === 0) return new Map();
  const ids = [...new Set(items.map(({ productId }) => productId.toString()))];
  const products = await Product.find({ _id: { $in: ids } })
    .select('name images price isActive variants')
    .lean();
  return new Map(products.map((product) => [product._id.toString(), product]));
};

const pickStatus = (variant, quantity) => {
  if (!variant) return LINE_STATUS.UNAVAILABLE;
  if (variant.stock === 0) return LINE_STATUS.OUT_OF_STOCK;
  if (quantity > variant.stock) return LINE_STATUS.LOW_STOCK;
  return LINE_STATUS.OK;
};

const toLabel = ({ name, size }) => {
  if (!name) return UNKNOWN_ITEM_LABEL;
  return size ? `${name} (${size})` : name;
};

const toIssue = (line) => {
  const buildMessage = ISSUE_MESSAGES[line.status];
  if (!buildMessage) return null;
  return { sku: line.sku, type: line.status, message: buildMessage(toLabel(line), line) };
};

// Turns one stored line into the line the API returns, with its live status.
// A line the shopper can't buy counts for nothing in the subtotal (lineTotal 0).
const describeLine = (item, product) => {
  const variant = product?.isActive
    ? product.variants.find(({ sku }) => sku === item.sku)
    : undefined;
  const status = pickStatus(variant, item.quantity);
  const availableStock = variant?.stock ?? 0;
  // low_stock: show only what we can really sell (the stored quantity is left unchanged).
  const quantity = status === LINE_STATUS.LOW_STOCK ? availableStock : item.quantity;
  const isBuyable = status === LINE_STATUS.OK || status === LINE_STATUS.LOW_STOCK;

  const line = {
    productId: item.productId,
    sku: item.sku,
    name: product?.name ?? null,
    image: product?.images?.[0]?.url ?? null,
    size: variant?.size ?? null,
    color: variant?.color ?? null,
    unitPrice: variant ? product.price : null,
    quantity,
    lineTotal: isBuyable ? product.price * quantity : 0,
    status,
    availableStock,
  };
  return { line, issue: toIssue(line) };
};

// items: [{ productId, sku, quantity }]. Returns { items, subtotal, issues }.
const buildCart = async (items) => {
  const products = await findProducts(items);
  const described = items.map((item) =>
    describeLine(item, products.get(item.productId.toString())),
  );
  const lines = described.map(({ line }) => line);
  return {
    items: lines,
    subtotal: lines.reduce((sum, { lineTotal }) => sum + lineTotal, 0),
    issues: described.map(({ issue }) => issue).filter(Boolean),
  };
};

const getCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).select('items').lean();
  const items = (cart?.items ?? []).map(({ product, sku, quantity }) => ({
    productId: product,
    sku,
    quantity,
  }));
  return buildCart(items);
};

const previewCart = (items) => buildCart(items);

// ---------- Changing: each change is one conditional, atomic update ----------

// Get or create the user's cart in one atomic upsert. If two requests create it at the same
// moment, the unique index on `user` rejects the second. That error means "it exists now",
// which is what we wanted, so we ignore it.
const ensureCart = async (userId) => {
  try {
    await Cart.updateOne({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true });
  } catch (error) {
    if (error.code !== DUPLICATE_KEY_ERROR_CODE) throw error;
  }
};

// Each builder returns { filter, update } for Cart.updateOne. The filter holds the rules,
// so the database applies them in one step and two parallel requests can't break them.

// Raise an existing line by `quantity`, only if the result stays at or below `max`.
const raiseLine = (userId, sku, quantity, max) => ({
  filter: { user: userId, items: { $elemMatch: { sku, quantity: { $lte: max - quantity } } } },
  update: { $inc: { 'items.$.quantity': quantity } },
});

// Add a new line, only if the sku isn't in the cart yet and the cart has room.
const pushLine = (userId, line) => ({
  filter: {
    user: userId,
    'items.sku': { $ne: line.sku },
    $expr: { $lt: [{ $size: { $ifNull: ['$items', []] } }, MAX_CART_LINES] },
  },
  update: { $push: { items: line } },
});

const applyOperation = async ({ filter, update }) =>
  (await Cart.updateOne(filter, update)).matchedCount === 1;

// The sku is unique across all products, so it finds the variant; positional projection
// (variants.$) returns only that one variant instead of all of them.
const findVariant = async (filter) => {
  const product = await Product.findOne({ ...filter, isActive: true })
    .select('name variants.$')
    .lean();
  if (!product) throw AppError.fromCode(ERRORS.PRODUCT_NOT_FOUND);
  const [variant] = product.variants;
  return { variant, label: `${product.name} (${variant.size})` };
};

const toLimitError = (label, variant, inCart = 0) => {
  if (variant.stock > MAX_CART_QUANTITY) {
    return fieldError('quantity', MESSAGES.CART_MAX_QUANTITY(MAX_CART_QUANTITY));
  }
  const message =
    inCart > 0
      ? MESSAGES.ITEM_IN_CART_LIMIT(label, inCart, variant.stock)
      : MESSAGES.ITEM_LOW_STOCK(label, variant.stock);
  return AppError.fromCode(ERRORS.INSUFFICIENT_STOCK, message);
};

// The shopper asked for this quantity, so an impossible one is an error (not quietly capped).
const assertCanBuy = (label, variant, quantity) => {
  if (variant.stock === 0) {
    throw AppError.fromCode(ERRORS.OUT_OF_STOCK, MESSAGES.ITEM_SOLD_OUT(label));
  }
  if (quantity > Math.min(variant.stock, MAX_CART_QUANTITY)) throw toLimitError(label, variant);
};

const addItem = async (userId, { productId, sku, quantity }) => {
  const { variant, label } = await findVariant({ _id: productId, 'variants.sku': sku });
  assertCanBuy(label, variant, quantity);
  await ensureCart(userId);

  const max = Math.min(variant.stock, MAX_CART_QUANTITY);
  const raise = raiseLine(userId, sku, quantity, max);
  const push = pushLine(userId, { product: productId, sku, quantity });

  // Sequential on purpose: each step only runs if the one before it matched nothing.
  // The second `raise` covers two parallel requests adding the same new sku: the loser's
  // push fails because the line now exists, and the raise adds its quantity to it.
  for (const operation of [raise, push, raise]) {
    if (await applyOperation(operation)) return getCart(userId);
  }
    // The line's current quantity tells the shopper what they already hold.
  const cart = await Cart.findOne({ user: userId, 'items.sku': sku }).select('items.$').lean();
  const inCart = cart?.items?.[0]?.quantity;
  throw inCart ? toLimitError(label, variant, inCart) : AppError.fromCode(ERRORS.CART_FULL);
};

const updateItem = async (userId, sku, quantity) => {
  const { variant, label } = await findVariant({ 'variants.sku': sku });
  assertCanBuy(label, variant, quantity);

  const { matchedCount } = await Cart.updateOne(
    { user: userId, 'items.sku': sku },
    { $set: { 'items.$.quantity': quantity } },
  );
  if (matchedCount === 0) throw AppError.fromCode(ERRORS.NOT_FOUND, MESSAGES.CART_ITEM_NOT_FOUND);
  return getCart(userId);
};

// Removing a line that isn't there is fine (the result is the same: it isn't in the cart).
const removeItem = async (userId, sku) => {
  await Cart.updateOne({ user: userId }, { $pull: { items: { sku } } });
  return getCart(userId);
};

const clearCart = async (userId) => {
  await Cart.updateOne({ user: userId }, { $set: { items: [] } });
  return getCart(userId);
};

// ---------- Merging the guest cart after login ----------

// Same sku twice in the guest cart becomes one line, capped at the per-line maximum.
const combineItems = (items) => {
  const bySku = new Map();
  for (const { productId, sku, quantity } of items) {
    const total = (bySku.get(sku)?.quantity ?? 0) + quantity;
    bySku.set(sku, { productId, sku, quantity: Math.min(total, MAX_CART_QUANTITY) });
  }
  return [...bySku.values()];
};

// Browser storage can hold anything, so only lines that match a real, active product
// and one of its skus are kept.
const keepRealItems = async (items) => {
  const products = await findProducts(items);
  return items.filter(({ productId, sku }) => {
    const product = products.get(productId.toString());
    return product?.isActive && product.variants.some((variant) => variant.sku === sku);
  });
};

// Three conditional updates per item, in THIS order:
// 1) cap: the line would go over the maximum, so set it to the maximum;
// 2) raise: it fits, so add;
// 3) push: the line doesn't exist yet, so create it.
// Only one can match, and cap must come before raise, otherwise a line that was just
// raised could match the cap rule as well.
const toMergeOperations = (userId) => ({ productId, sku, quantity }) =>
  [
    {
      filter: {
        user: userId,
        items: { $elemMatch: { sku, quantity: { $gt: MAX_CART_QUANTITY - quantity } } },
      },
      update: { $set: { 'items.$.quantity': MAX_CART_QUANTITY } },
    },
    raiseLine(userId, sku, quantity, MAX_CART_QUANTITY),
    pushLine(userId, { product: productId, sku, quantity }),
  ].map((operation) => ({ updateOne: operation }));

// Stock is NOT capped here: the stored quantity may be above the stock, and the cart we
// return shows the capped quantity with an `issues` message (same as any later read).
const mergeCart = async (userId, items) => {
  const realItems = await keepRealItems(combineItems(items));
  if (realItems.length > 0) {
    await ensureCart(userId);
    await Cart.bulkWrite(realItems.flatMap(toMergeOperations(userId)));
  }
  return getCart(userId);
};

module.exports = { getCart, previewCart, addItem, updateItem, removeItem, clearCart, mergeCart };