const usersService = require('./users.service');
const { sendSuccess, sendCreated, sendMessage, sendList } = require('../../utils/sendResponse');
const { EMPTY, MESSAGES } = require('../../utils/messages');
const { MAX_ADDRESSES } = require('../../constants');

// req.user was already loaded (and checked) by the auth middleware.
const getMe = (req, res) => sendSuccess(res, usersService.toPublicUser(req.user));

const updateMe = async (req, res) => {
  const user = await usersService.updateProfile(req.user._id, req.valid.body);
  sendSuccess(res, user);
};

const listAddresses = async (req, res) => {
  const addresses = await usersService.listAddresses(req.user._id);
  sendList(res, addresses, {
    page: 1,
    limit: MAX_ADDRESSES,
    total: addresses.length,
    emptyMessage: EMPTY.ADDRESSES,
  });
};

const createAddress = async (req, res) => {
  const address = await usersService.createAddress(req.user._id, req.valid.body);
  sendCreated(res, address);
};

const updateAddress = async (req, res) => {
  const address = await usersService.updateAddress(req.user._id, req.valid.params.id, req.valid.body);
  sendSuccess(res, address);
};

const deleteAddress = async (req, res) => {
  await usersService.deleteAddress(req.user._id, req.valid.params.id);
  sendMessage(res, MESSAGES.ADDRESS_DELETED);
};

module.exports = { getMe, updateMe, listAddresses, createAddress, updateAddress, deleteAddress };