const Joi = require('joi');
const { objectId } = require('../../middleware/validate');
const { MESSAGES } = require('../../utils/messages');
const { NIGERIAN_STATES, NIGERIAN_PHONE_REGEX } = require('../../constants');

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 80;
const LABEL_MAX_LENGTH = 30;
const TEXT_MAX_LENGTH = 120;
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}' .-]*$/u;
// Shared with auth.validation.js (register uses the same name and phone rules).
const name = Joi.string()
  .trim()
  .min(NAME_MIN_LENGTH)
  .max(NAME_MAX_LENGTH)
  .pattern(NAME_PATTERN)
  .messages({ 'string.pattern.base': MESSAGES.LETTERS_ONLY });
const phone = Joi.string()
  .trim()
  .pattern(NIGERIAN_PHONE_REGEX)
  .messages({ 'string.pattern.base': MESSAGES.PHONE_INVALID });
const text = Joi.string().trim().max(TEXT_MAX_LENGTH);

// Country is always Nigeria and is never accepted from the client (stripUnknown removes it).
const addressBody = Joi.object({
  label: Joi.string().trim().max(LABEL_MAX_LENGTH),
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