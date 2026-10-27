const Joi = require('joi');
const { name, phone } = require('../users/users.validation');
const { MESSAGES } = require('../../utils/messages');
const { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, CODE_PATTERN } = require('../../constants');

const email = Joi.string().trim().lowercase().email().required();

// bcrypt only reads the first 72 BYTES, and emoji or accented letters use more than one byte,
// so the limit is checked in bytes as well as characters. Passwords are never trimmed.
const password = Joi.string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .custom((value, helpers) =>
    Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_LENGTH
      ? helpers.error('string.max', { limit: PASSWORD_MAX_LENGTH })
      : value,
  )
  .messages({ 
    'string.min': MESSAGES.PASSWORD_LENGTH, 
    'string.max': MESSAGES.PASSWORD_LENGTH 
   })
  .required();

// Exactly 6 digits. A wrongly typed code is a validation error; a wrong but well-formed
// code is answered by the service with INVALID_CODE.
const code = Joi.string()
  .trim()
  .pattern(CODE_PATTERN)
  .messages({ 'string.pattern.base': MESSAGES.CODE_FORMAT })
  .required();

const registerBody = Joi.object({ name: name.required(), email, password, phone });
const loginBody = Joi.object({ email, password: Joi.string().required() });
const verifyEmailBody = Joi.object({ code });
const forgotPasswordBody = Joi.object({ email });
const resetPasswordBody = Joi.object({ email, code, password });
const changePasswordBody = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password,
});

module.exports = {
  registerBody,
  loginBody,
  verifyEmailBody,
  forgotPasswordBody,
  resetPasswordBody,
  changePasswordBody,
};