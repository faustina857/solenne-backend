const Joi = require('joi');
const { NIGERIAN_STATES } = require('../../constants');
const { MESSAGES } = require('../../utils/messages');
const { objectId } = require('../../middleware/validate');

// lowercase name -> official spelling, so "lagos" is saved as "Lagos".
const OFFICIAL_STATES = new Map(NIGERIAN_STATES.map((state) => [state.toLowerCase(), state]));

const stateName = Joi.string()
  .trim()
  .custom((value, helpers) => OFFICIAL_STATES.get(value.toLowerCase()) ?? helpers.error('any.invalid'))
  .messages({ 'any.invalid': MESSAGES.STATE_INVALID });

// .replace collapses inner spaces ("Igbo   Efon" becomes "Igbo Efon") before the checks run.
const cityName = Joi.string()
  .trim()
  .replace(/\s+/g, ' ')
  .min(2)
  .max(60)
  .pattern(/^\p{L}[\p{L}\p{M}\s'.-]*$/u)
  .messages({ 'string.pattern.base': MESSAGES.LETTERS_ONLY });

const fee = Joi.number().integer().min(0).max(100_000_000)
const estimatedDays = Joi.string().trim().max(30);

const createZoneBody = Joi.object({
  state: stateName.required(),
  city: cityName.required(),
  fee: fee.required(),
  estimatedDays,
  isActive: Joi.boolean(),
});

// No `state`: a city doesn't move to another state.
const updateZoneBody = Joi.object({
  city: cityName,
  fee,
  estimatedDays: estimatedDays.allow(null), // null removes the estimate
  isActive: Joi.boolean(),
}).min(1);

const zonesQuery = Joi.object({ includeInactive: Joi.boolean() });
const zoneParams = Joi.object({ id: objectId().required() });

module.exports = { createZoneBody, updateZoneBody, zonesQuery, zoneParams };