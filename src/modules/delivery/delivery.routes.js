const express = require('express');
const { validate } = require('../../middleware/validate');
const { authenticate, optionalAuthenticate, requireRole } = require('../../middleware/auth');
const { ROLES } = require('../../constants');
const controller = require('./delivery.controller');
const { createZoneBody, updateZoneBody, zonesQuery, zoneParams } = require('./delivery.validation');

const router = express.Router();
const adminOnly = [authenticate, requireRole(ROLES.ADMIN)];

router.get('/states', controller.listStates);
router.get('/zones', optionalAuthenticate, validate({ query: zonesQuery }), controller.listZones);

router.post('/zones', ...adminOnly, validate({ body: createZoneBody }), controller.createZone);
router.patch(
  '/zones/:id',
  ...adminOnly,
  validate({ params: zoneParams, body: updateZoneBody }),
  controller.updateZone,
);
router.delete(
  '/zones/:id',
  ...adminOnly,
  validate({ params: zoneParams }),
  controller.deactivateZone,
);

module.exports = router;