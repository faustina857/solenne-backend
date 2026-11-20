const wishlistService = require('./wishlist.service');
const { sendSuccess } = require('../../utils/sendResponse');
const { EMPTY } = require('../../utils/messages');

// The contract returns a plain [Product] (no meta), with the empty message when it is empty.
const sendProducts = (res, products) =>
  sendSuccess(res, products, { message: products.length === 0 ? EMPTY.WISHLIST : undefined });

const getWishlist = async (req, res) =>
  sendProducts(res, await wishlistService.getWishlist(req.user._id));

const previewWishlist = async (req, res) =>
  sendProducts(res, await wishlistService.previewWishlist(req.valid.body.productIds));

const addProduct = async (req, res) =>
  sendProducts(res, await wishlistService.addProduct(req.user._id, req.valid.params.productId));

const removeProduct = async (req, res) =>
  sendProducts(res, await wishlistService.removeProduct(req.user._id, req.valid.params.productId));

const mergeWishlist = async (req, res) =>
  sendProducts(res, await wishlistService.mergeWishlist(req.user._id, req.valid.body.productIds));

module.exports = { getWishlist, previewWishlist, addProduct, removeProduct, mergeWishlist };