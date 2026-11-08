const productsService = require('./products.service');
const { sendSuccess, sendCreated, sendList, sendMessage } = require('../../utils/sendResponse');
const { MESSAGES } = require('../../utils/messages');

const listProducts = async (req, res) => {
  const { page, limit } = req.valid.query;
  const { products, total, emptyMessage } = await productsService.listProducts(
    req.valid.query,
    req.user,
  );
  sendList(res, products, { page, limit, total, emptyMessage });
};

const getProductFilters = async (req, res) => {
  sendSuccess(res, await productsService.getProductFilters(req.valid.query));
};

const getProduct = async (req, res) => {
  sendSuccess(res, await productsService.getProductBySlug(req.valid.params.slug));
};

const createProduct = async (req, res) => {
  sendCreated(res, await productsService.createProduct(req.valid.body));
};

const updateProduct = async (req, res) => {
  sendSuccess(res, await productsService.updateProduct(req.valid.params.id, req.valid.body));
};

const deactivateProduct = async (req, res) => {
  await productsService.deactivateProduct(req.valid.params.id);
  sendMessage(res, MESSAGES.PRODUCT_DEACTIVATED);
};

const setVariantStock = async (req, res) => {
  const { id, sku } = req.valid.params;
  sendSuccess(res, await productsService.setVariantStock(id, sku, req.valid.body.stock));
};

module.exports = {
  listProducts,
  getProductFilters,
  getProduct,
  createProduct,
  updateProduct,
  deactivateProduct,
  setVariantStock,
};