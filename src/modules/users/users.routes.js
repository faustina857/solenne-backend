const express = require('express');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const controller = require('./users.controller');
const {
  updateProfileBody,
  createAddressBody,
  updateAddressBody,
  addressParams,
} = require('./users.validation');

const router = express.Router();

router.use(authenticate); // every users route needs a logged-in user

router.get('/me', controller.getMe);
router.patch('/me', validate({ body: updateProfileBody }), controller.updateMe);

router.get('/me/addresses', controller.listAddresses);
router.post('/me/addresses', validate({ body: createAddressBody }), controller.createAddress);
router.patch(
  '/me/addresses/:id',
  validate({ params: addressParams, body: updateAddressBody }),
  controller.updateAddress,
);
router.delete('/me/addresses/:id', validate({ params: addressParams }), controller.deleteAddress);

module.exports = router;