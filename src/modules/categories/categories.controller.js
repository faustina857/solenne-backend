const categoriesService = require('./categories.service');
const { sendSuccess, sendCreated, sendMessage } = require('../../utils/sendResponse');
const { MESSAGES } = require('../../utils/messages');

const getTree = async (req, res) => {
  sendSuccess(res, await categoriesService.getCategoryTree());
};

const create = async (req, res) => {
  sendCreated(res, await categoriesService.createCategory(req.valid.body));
};

const update = async (req, res) => {
  sendSuccess(res, await categoriesService.updateCategory(req.valid.params.id, req.valid.body));
};

const deactivate = async (req, res) => {
  await categoriesService.updateCategory(req.valid.params.id, { isActive: false });
  sendMessage(res, MESSAGES.CATEGORY_DEACTIVATED);
};

module.exports = { getTree, create, update, deactivate };