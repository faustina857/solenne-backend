const Joi = require('joi');
const { objectId } = require('../../middleware/validate');
const { MESSAGES } = require('../../utils/messages');
const { NIGERIAN_STATES} = require('../../constants');

// Shared with auth.validation.js (register uses the same name and phone rules).
const name = Joi.string()
  .trim()
  .min(2)
  .max(80)
  .pattern(/^\p{L}[\p{L}\p{M}' .-]*$/u)
  .messages({ 'string.pattern.base': MESSAGES.LETTERS_ONLY });
const phone = Joi.string()
  .trim()
  .pattern(/^(\+234|0)[789][01]\d{8}$/)
  .messages({ 'string.pattern.base': MESSAGES.PHONE_INVALID });
const text = Joi.string().trim().max(120);

// Country is always Nigeria and is never accepted from the client (stripUnknown removes it).
const addressBody = Joi.object({
  label: Joi.string().trim().max(30),
  fullName: name,
  phone,
  street: text,
  landmark: text,
  city: text,
  state: Joi.string()
  .valid(...NIGERIAN_STATES).trim()
  .insensitive()
  .messages({ 'any.only': MESSAGES.STATE_INVALID }),
  isDefault: Joi.boolean(),
});

// One definition, two uses: create requires the core fields, update accepts any subset.
const createAddressBody = addressBody.fork(
  ['fullName', 'phone', 'street', 'city', 'state'],
  (field) => field.required(),
);
const updateAddressBody = addressBody.min(1);

const updateProfileBody = Joi.object({ name, phone }).min(1);
const addressParams = Joi.object({ id: objectId().required() });

module.exports = { 
    name, phone, updateProfileBody, 
    createAddressBody, updateAddressBody, addressParams 
};