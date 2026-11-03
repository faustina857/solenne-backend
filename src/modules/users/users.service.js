const mongoose = require('mongoose');
const User = require('./user.model');
const AppError = require('../../utils/appError');
const { serialize } = require('../../utils/sendResponse');
const { ERRORS } = require('../../utils/messages');
const { MAX_ADDRESSES } = require('../../constants');

const AUTH_USER_FIELDS = 'name email phone role emailVerified isActive passwordChangedAt createdAt';
// The address fields that decide "same place". Changing any of them changes the fingerprint.
const LOCATION_FIELDS = ['street', 'city', 'state'];

// The only shape of a user the API ever returns (never password or token hashes).
const toPublicUser = ({ _id, name, email, phone, role, emailVerified, createdAt }) => ({
  _id,
  name,
  email,
  phone: phone ?? null,
  role,
  emailVerified,
  createdAt,
});

// The fingerprint is internal, so it is removed from every address the API returns.
const toPublicAddress = ({ fingerprint, ...address }) => address;

const findAuthUser = (userId) => User.findById(userId).select(AUTH_USER_FIELDS).lean();

const updateProfile = async (userId, fields) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: fields },
    { new: true, runValidators: true },
  )
    .select(AUTH_USER_FIELDS)
    .lean();

  if (!user) throw AppError.fromCode(ERRORS.USER_NOT_FOUND);
  return toPublicUser(user);
};

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Same place = same street, city and state, ignoring case and extra spaces.
// JSON.stringify keeps the three parts separate, so no mix of them can look like another.
const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const toFingerprint = ({ street, city, state }) =>
  JSON.stringify([street, city, state].map(normalize));

// Addresses are stored as an array in the user document, so they are always accessed
// through the user. $elemMatch in a projection returns only the matching array element.
const findOneAddress = async (userId, match) => {
  const user = await User.findOne(
    { _id: userId },
    { addresses: { $elemMatch: match } },
  ).lean();
  const address = user?.addresses?.[0];
  return address ? toPublicAddress(address) : null;
};

const findAddress = async (userId, addressId) => {
  const address = await findOneAddress(userId, { _id: addressId });
  if (!address) throw AppError.fromCode(ERRORS.ADDRESS_NOT_FOUND);
  return address;
};

// Called when an atomic write matched nothing. If the cause is a duplicate, the response
// carries the existing address so the frontend can fill the form with it. Otherwise
// the caller's own error is thrown.
const throwExistingOr = async (userId, match, fallbackError) => {
  const existing = await findOneAddress(userId, match);
  if (existing) {
    throw AppError.fromCode(ERRORS.ADDRESS_EXISTS, undefined, { address: serialize(existing) });
  }
  throw AppError.fromCode(fallbackError);
};

// Only one address may be the default, so the others are switched off.
const clearOtherDefaults = (userId, keepId) =>
  User.updateOne(
    { _id: userId },
    { $set: { 'addresses.$[other].isDefault': false } },
    { arrayFilters: [{ 'other._id': { $ne: keepId } }] },
  );

const listAddresses = async (userId) => {
  const user = await User.findById(userId).select('addresses').lean();
  if (!user) throw AppError.fromCode(ERRORS.USER_NOT_FOUND);
  // .lean() skips schema defaults, so a user saved without the field has no array.
  return (user.addresses ?? []).map(toPublicAddress);
};

const createAddress = async (userId, fields) => {
  const addressId = new mongoose.Types.ObjectId();
  const fingerprint = toFingerprint(fields);
  // One atomic update checks both rules and pushes: fewer than the maximum addresses, and
  // none with this fingerprint. Two parallel requests can't exceed the cap or save twins.
  const { matchedCount } = await User.updateOne(
    {
      _id: userId,
      'addresses.fingerprint': { $ne: fingerprint },
      $expr: { $lt: [{ $size: { $ifNull: ['$addresses', []] } }, MAX_ADDRESSES] },
    },
    { $push: { addresses: { _id: addressId, ...fields, fingerprint } } },
  );
  if (matchedCount === 0) {
    await throwExistingOr(userId, { fingerprint }, ERRORS.ADDRESS_LIMIT_REACHED);
  }
  if (fields.isDefault) await clearOtherDefaults(userId, addressId);
  return findAddress(userId, addressId);
};

const updateAddress = async (userId, addressIdParam, fields) => {
  const addressId = toObjectId(addressIdParam);
  // Also the ownership check: another user's address is never found.
  const current = await findAddress(userId, addressId);

  const changes = { ...fields };
  const filter = { _id: userId, 'addresses._id': addressId };
  const isLocationChange = LOCATION_FIELDS.some((key) => key in fields);

  // The fingerprint is rebuilt only when the place changes. The filter then refuses
  // the update if a DIFFERENT address of this user already has the same fingerprint.
  if (isLocationChange) {
    changes.fingerprint = toFingerprint({ ...current, ...fields });
    filter.addresses = {
      $not: { $elemMatch: { fingerprint: changes.fingerprint, _id: { $ne: addressId } } },
    };
  }

  // Keys come from the validated Joi schema and the code above, never from raw user input.
  const setPaths = Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [`addresses.$[target].${key}`, value]),
  );
  const { matchedCount } = await User.updateOne(
    filter,
    { $set: setPaths },
    { arrayFilters: [{ 'target._id': addressId }] },
  );
  if (matchedCount === 0) {
    // Without a location change there is no fingerprint to look for: the address
    // was removed between the read and the write.
    if (!isLocationChange) throw AppError.fromCode(ERRORS.ADDRESS_NOT_FOUND);
    await throwExistingOr(
      userId,
      { fingerprint: changes.fingerprint, _id: { $ne: addressId } },
      ERRORS.ADDRESS_NOT_FOUND,
    );
  }
  if (fields.isDefault) await clearOtherDefaults(userId, addressId);
  return findAddress(userId, addressId);
};

const deleteAddress = async (userId, addressIdParam) => {
  const { modifiedCount } = await User.updateOne(
    { _id: userId },
    { $pull: { addresses: { _id: toObjectId(addressIdParam) } } },
  );
  if (modifiedCount === 0) throw AppError.fromCode(ERRORS.ADDRESS_NOT_FOUND);
};

module.exports = {
  toPublicUser,
  findAuthUser,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};