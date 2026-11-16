const service = require('./delivery.service');
const { EMPTY, MESSAGES } = require('../../utils/messages');
const { NIGERIAN_STATES } = require('../../constants');
const { sendSuccess, sendCreated, sendMessage, sendList } = require('../../utils/sendResponse');

// The list is a frozen constant, so it is sent as is.
const listStates = (req, res) => sendSuccess(res, NIGERIAN_STATES);

const listZones = async (req, res) => {
  const zones = await service.listZones(req.valid.query, req.user);
  // The dropdowns need every city at once, so there is no pagination. `limit` can't be 0.
  sendList(res, zones, {
    page: 1,
    limit: Math.max(zones.length, 1),
    total: zones.length,
    emptyMessage: EMPTY.DELIVERY_ZONES,
  });
};

// 201 for a new city, 200 (with the existing zone) for one that already exists.
const createZone = async (req, res) => {
  const { zone, created } = await service.createZone(req.valid.body);
  if (created) return sendCreated(res, zone);
  sendSuccess(res, zone, { message: MESSAGES.ZONE_EXISTS });
};

const updateZone = async (req, res) =>
  sendSuccess(res, await service.updateZone(req.valid.params.id, req.valid.body));

const deactivateZone = async (req, res) =>
  sendMessage(res, await service.deactivateZone(req.valid.params.id));

module.exports = { listStates, listZones, createZone, updateZone, deactivateZone };