const mongoose = require('mongoose');
const User = require('./user.model');
const AppError = require('../../utils/appError');
const { ERRORS } = require('../../utils/messages');
const { MAX_ADDRESSES } = require('../../constants');

const AUTH_USER_FIELDS = 'name email phone role emailVerified isActive passwordChangedAt createdAt';

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

const findAuthUser = (userId) => 
    User.findById(userId).select(AUTH_USER_FIELDS).lean();

const updateProfile = async (userId, fields) => {
  const user = await User.findByIdAndUpdate(
    userId, 
    { $set: fields }, 
    { new: true, runValidators: true }
  ).select(AUTH_USER_FIELDS)
   .lean();

 if (!user) {
    throw AppError.fromCode(ERRORS.USER_NOT_FOUND);
  }
  return toPublicUser(user);
};

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Addresses are stored as an array in the user document, 
// so they are always accessed through the user.
const findAddress = async (userId, addressId) => {
  // $elemMatch in a projection returns only the one matching array element.
  const user = await User.findOne(
    { _id: userId },
    { addresses: { $elemMatch: { _id: addressId } } },
  ).lean();
  const address = user?.addresses?.[0];
  if (!address) throw AppError.fromCode(ERRORS.ADDRESS_NOT_FOUND);
  return address;
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
  return user.addresses;
};

const createAddress = async (userId, fields) => {
  const addressId = new mongoose.Types.ObjectId();
  // The size check and the push are one atomic update, so two parallel requests can't exceed the cap.
  const { matchedCount } = await User.updateOne(
    {
      _id: userId,
      $expr: { $lt: [
        { $size: { 
            $ifNull: ['$addresses', []] 
        } }, MAX_ADDRESSES] 
       },
    },
    { $push: { 
        addresses: { _id: addressId, ...fields } 
    } },
  );
  if (matchedCount === 0) throw AppError.fromCode(ERRORS.ADDRESS_LIMIT_REACHED);
  if (fields.isDefault) await clearOtherDefaults(userId, addressId);
  return findAddress(userId, addressId);
};

const updateAddress = async (userId, addressIdParam, fields) => {
  const addressId = toObjectId(addressIdParam);
  // Keys come from the validated Joi schema only, never from raw user input.
  const changes = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [`addresses.$.${key}`, value]),
  );
  // Filtering on the user id is the ownership check: another user's address never matches.
  const { matchedCount } = await User.updateOne(
    { _id: userId, 'addresses._id': addressId },
    { $set: changes },
  );
  if (matchedCount === 0) throw AppError.fromCode(ERRORS.ADDRESS_NOT_FOUND);
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