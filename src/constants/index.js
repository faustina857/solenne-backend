const JSON_BODY_LIMIT = '100kb';
const GLOBAL_RATE_LIMIT = Object.freeze({ windowMs: 60 * 1000, limit: 100 });
const SHUTDOWN_TIMEOUT_MS = 10 * 1000;
const DB_CONNECT_TIMEOUT_MS = 10 * 1000;
const ROLES = Object.freeze({ CUSTOMER: 'customer', ADMIN: 'admin' });

const NIGERIAN_STATES = Object.freeze([
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
]);
const EMAIL_REQUEST_TIMEOUT_MS = 10000
const BCRYPT_COST = 12;
const AUTH_COOKIE_NAME = 'solenne_token';
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const AUTH_RATE_LIMIT = Object.freeze({ windowMs: 15 * 60 * 1000, limit: 10 });
const MAX_ADDRESSES = 10;
const MS_PER_SECOND = 1000;
const NIGERIAN_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;
const EMAIL_SEND_ATTEMPTS = 3;
const EMAIL_RETRY_DELAY_MS = 1000;
const CODE_LENGTH = 6;
const CODE_PATTERN = new RegExp(`^\\d{${CODE_LENGTH}}$`);
const CODE_TTL_MINUTES = 15;
const CODE_TTL_MS = CODE_TTL_MINUTES * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;
// These values are the names of the User fields that hold each kind of code.
const CODE_PURPOSES = Object.freeze({
  EMAIL_VERIFICATION: 'emailVerification',
  PASSWORD_RESET: 'passwordReset',
});
const CODE_REQUEST_RATE_LIMIT = Object.freeze({ windowMs: 60 * 60 * 1000, limit: 5 });
module.exports = { 
    JSON_BODY_LIMIT, GLOBAL_RATE_LIMIT, SHUTDOWN_TIMEOUT_MS, MS_PER_SECOND, EMAIL_REQUEST_TIMEOUT_MS,
    DB_CONNECT_TIMEOUT_MS, ROLES, NIGERIAN_STATES, BCRYPT_COST, AUTH_COOKIE_NAME,
    PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, AUTH_RATE_LIMIT, MAX_ADDRESSES, NIGERIAN_PHONE_REGEX, 
    EMAIL_SEND_ATTEMPTS, EMAIL_RETRY_DELAY_MS, CODE_LENGTH, CODE_PATTERN, CODE_TTL_MINUTES, CODE_TTL_MS, 
    CODE_MAX_ATTEMPTS, CODE_PURPOSES, CODE_REQUEST_RATE_LIMIT};