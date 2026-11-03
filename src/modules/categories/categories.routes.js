const express = require('express');
const controller = require('./categories.controller');
const { authenticate, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ROLES } = require('../../constants');
const {
  createCategoryBody,
  updateCategoryBody,
  categoryParams,
} = require('./categories.validation');

const router = express.Router();

// Express runs an array of middleware in order, so this is "logged in, then must be admin".
const adminOnly = [authenticate, requireRole(ROLES.ADMIN)];

router.get('/', controller.getTree);
router.post('/', adminOnly, validate({ body: createCategoryBody }), controller.create);
router.patch(
  '/:id',
  adminOnly,
  validate({ params: categoryParams, body: updateCategoryBody }),
  controller.update,
);
router.delete('/:id', adminOnly, validate({ params: categoryParams }), controller.deactivate);

module.exports = router;