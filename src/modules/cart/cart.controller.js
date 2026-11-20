const cartService = require('./cart.service');
const { sendSuccess } = require('../../utils/sendResponse');
const { EMPTY } = require('../../utils/messages');

// Every cart response carries the empty-state message when there are no lines.
// (An undefined message is dropped when the response becomes JSON.)
const sendCart = (res, cart) =>
  sendSuccess(res, cart, { message: cart.items.length === 0 ? EMPTY.CART : undefined });

const getCart = async (req, res) =>
  sendCart(res, await cartService.getCart(req.user._id));

const previewCart = async (req, res) =>
  sendCart(res, await cartService.previewCart(req.valid.body.items));

const addItem = async (req, res) =>
  sendCart(res, await cartService.addItem(req.user._id, req.valid.body));

const updateItem = async (req, res) =>
  sendCart(
    res,
    await cartService.updateItem(req.user._id, req.valid.params.sku, req.valid.body.quantity),
  );

const removeItem = async (req, res) =>
  sendCart(res, await cartService.removeItem(req.user._id, req.valid.params.sku));

const clearCart = async (req, res) => sendCart(res, await cartService.clearCart(req.user._id));

const mergeCart = async (req, res) =>
  sendCart(res, await cartService.mergeCart(req.user._id, req.valid.body.items));

module.exports = { getCart, previewCart, addItem, updateItem, removeItem, clearCart, mergeCart };