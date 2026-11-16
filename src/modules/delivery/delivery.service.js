const DeliveryZone = require('./delivery.model');
const AppError = require('../../utils/appError');
const { ERRORS, MESSAGES } = require('../../utils/messages');
const { ROLES } = require('../../constants');

const ACTIVE_ONLY = Object.freeze({ isActive: true });
const ZONE_FIELDS = 'state city fee estimatedDays isActive';

// Lowercase, trimmed, single spaces: "Lekki " and "lekki" are the same city.
// Also used by the address code in users.service.js.
const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const toPublicZone = ({ _id, state, city, fee, estimatedDays, isActive }) => ({
  _id,
  state,
  city,
  fee,
  estimatedDays: estimatedDays ?? null,
  isActive,
});

const listZones = async ({ includeInactive }, user) => {
  // Only a logged-in admin may see deactivated zones. Everyone else: ignored.
  const canSeeInactive = includeInactive && user?.role === ROLES.ADMIN;
  const zones = await DeliveryZone.find(canSeeInactive ? {} : ACTIVE_ONLY)
    .select(ZONE_FIELDS)
    .sort({ state: 1, city: 1, _id: 1 })
    .lean();
  return zones.map(toPublicZone);
};

// Used when a customer saves an address: the city must be one the admin listed.
// Returns the zone so the caller can store the admin's spelling.
const requireDeliveryArea = async ({ state, city }) => {
  const zone = await DeliveryZone.findOne({ state, cityKey: normalize(city), ...ACTIVE_ONLY })
    .select(ZONE_FIELDS)
    .lean();
  if (!zone) {
    throw AppError.fromCode(ERRORS.VALIDATION_ERROR, undefined, {
      errors: [{ field: 'city', message: MESSAGES.CITY_NOT_LISTED }],
    });
  }
  return zone;
};

// Adds `deliverable` (and `deliveryMessage` when false) to each address. An address can
// become undeliverable later (the admin deactivates a city), so this is computed on every read.
// One query covers the whole list (no query per address).
const addDeliveryStatus = async (addresses) => {
  if (addresses.length === 0) return addresses;
  const zones = await DeliveryZone.find(ACTIVE_ONLY).select('state cityKey').lean();
  const covered = new Set(zones.map(({ state, cityKey }) => `${state}|${cityKey}`));
  return addresses.map((address) =>
    covered.has(`${address.state}|${normalize(address.city)}`)
      ? { ...address, deliverable: true }
      : { ...address, deliverable: false, deliveryMessage: ERRORS.AREA_NOT_DELIVERABLE.message },
  );
};

// A city that already exists is not an error: we return it (created: false) so the admin's
// form can show its current values. Nothing is changed, so a new fee typed by mistake is never
// silently ignored while looking saved.
const createZone = async (fields) => {
  const cityKey = normalize(fields.city);
  try {
    const zone = await DeliveryZone.create({ ...fields, cityKey });
    return { zone: toPublicZone(zone.toObject()), created: true };
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await DeliveryZone.findOne({ state: fields.state, cityKey })
      .select(ZONE_FIELDS)
      .lean();
    return { zone: toPublicZone(existing), created: false };
  }
};

const updateZone = async (id, fields) => {
  // A renamed city needs a new matching key.
  const changes = fields.city ? { ...fields, cityKey: normalize(fields.city) } : fields;
  try {
    const zone = await DeliveryZone.findByIdAndUpdate(
      id,
      { $set: changes },
      { new: true, runValidators: true },
    )
      .select(ZONE_FIELDS)
      .lean();
    if (!zone) throw AppError.fromCode(ERRORS.NOT_FOUND);
    return toPublicZone(zone);
  } catch (error) {
    // Renaming into a city that already exists in this state.
    if (error.code === 11000) {
      throw AppError.fromCode(ERRORS.CONFLICT, MESSAGES.ZONE_CITY_TAKEN(fields.city));
    }
    throw error;
  }
};

const deactivateZone = async (id) => {
  await updateZone(id, { isActive: false });
  return MESSAGES.ZONE_DEACTIVATED;
};

module.exports = {
  normalize,
  listZones,
  requireDeliveryArea,
  addDeliveryStatus,
  createZone,
  updateZone,
  deactivateZone,
};