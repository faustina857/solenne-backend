const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const env = require('../../config/env');
const User = require('../users/user.model');
const { toPublicUser } = require('../users/users.service');
const AppError = require('../../utils/appError');
const { ERRORS, MESSAGES } = require('../../utils/messages');
const { signToken } = require('../../utils/jwt');
const mailer = require('../../utils/mailer');
const {
  BCRYPT_COST,
  CODE_LENGTH,
  CODE_TTL_MS,
  CODE_MAX_ATTEMPTS,
  CODE_PURPOSES,
} = require('../../constants');

// A dummy hash is used to make the timing of a failed login attempt
//  independent of whether the email exists.
const DUMMY_HASH = bcrypt.hashSync('placeholder-never-matches', BCRYPT_COST);

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST);
const buildAuthResponse = (user) => ({ user: toPublicUser(user), token: signToken(user._id) });

const hashCode = (purpose, code) => crypto.createHmac('sha256',env.jwt.secret).update(`${purpose}:${code}`).digest('hex');

// The raw token goes in the email; only its SHA-256 hash is stored, so a leaked database
// can't be used to verify or reset anyone's account.
const createCode = (purpose) => {
  const code = String(crypto.randomInt(10**CODE_LENGTH)).padStart(CODE_LENGTH, '0');
  const record = {
    hash: hashCode(purpose, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    attempts: 0,
  };
  return { code, record };
}
// Saves a fresh code for an existing user. It replaces any earlier code, which stops working
const issueCode = async (userId,purpose) =>{
    const { code, record } = createCode(purpose);
    await User.updateOne(
      { _id: userId },
      { $set: { [purpose]: record } },
    );
    return code;
};

// Counts one attempt, but only while the code exists, hasn't expired and is under the limit.
// It is one atomic write: MongoDB re-checks the filter on every write, so even 1000 parallel
// guesses can't get more than CODE_MAX_ATTEMPTS tries.
const countAttempt = async (userId, purpose) => {
    const {matchedCount} = await User.updateOne(
        { _id: userId,
            [`${purpose}.expiresAt`]: { $gt: new Date() },
            [`${purpose}.attempts`]: { $lt: CODE_MAX_ATTEMPTS },
        },
        { $inc: { [`${purpose}.attempts`]: 1 } },
    );
    return matchedCount === 1;
};

// Checks a submitted code. Counting first is what makes brute-forcing impractical.
// On success the code is deleted and `update` is applied in the same atomic write,
// so a code works exactly once.
const consumeCode = async ({userId, purpose, code, update}) => {
    if (!(await countAttempt(userId, purpose))) 
        throw AppError.fromCode(ERRORS.INVALID_CODE);
    const {matchedCount} = await User.updateOne(
        { _id: userId,
            [`${purpose}.hash`]: hashCode(purpose, code)
        },
        {...update, $unset: { [purpose]: '' } },
    );
    if (matchedCount === 0) throw AppError.fromCode(ERRORS.INVALID_CODE);
};

const register = async ({ name, email, password, phone }) => {
  const {code, record} = createCode(CODE_PURPOSES.EMAIL_VERIFICATION);
  // A duplicate email throws a duplicate-key error (from the unique index), which errorHandler maps to EMAIL_EXISTS.
  const user = await User.create({
    name,
    email,
    phone,
    password: await hashPassword(password),
    [CODE_PURPOSES.EMAIL_VERIFICATION]: record,
  });
  // Not awaited on purpose: the mailer retries on its own and never throws or slows signup.
  mailer.sendVerificationEmail({ to: user.email, name: user.name, code });
  return buildAuthResponse(user.toObject());
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password').lean();
  const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !isMatch) throw AppError.fromCode(ERRORS.INVALID_CREDENTIALS);
  // Checked after the password so a stranger can't learn that an account exists and is disabled.
  if (!user.isActive) throw AppError.fromCode(ERRORS.ACCOUNT_DISABLED);
  return buildAuthResponse(user);
};

const verifyEmail = async ( user,{ code }) => {
  if (user.emailVerified) return MESSAGES.EMAIL_ALREADY_VERIFIED;
    await consumeCode({ 
        userId: user._id, 
        purpose: CODE_PURPOSES.EMAIL_VERIFICATION, 
        code, 
        update: { $set: { emailVerified: true }} 
    });
  // Only a first successful verification gets here,and a code works once, so one welcome email.
  mailer.sendWelcomeEmail({ to: user.email, name: user.name });
  return MESSAGES.EMAIL_VERIFIED;
};

const resendVerification = async (user) => {
  if (user.emailVerified) return MESSAGES.EMAIL_ALREADY_VERIFIED;
  const code = await issueCode(user._id, CODE_PURPOSES.EMAIL_VERIFICATION);
  mailer.sendVerificationEmail({ 
    to: user.email, 
    name: user.name, 
    code
    });
  return MESSAGES.VERIFICATION_SENT;
};

// Always answers the same way, whether or not the email has an account.
const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email, isActive: true }).select('name email').lean();
  if (user) {
    const code = await issueCode(user._id,CODE_PURPOSES.PASSWORD_RESET);
    mailer.sendPasswordResetEmail({ to: user.email, name: user.name, code });
  }
  return MESSAGES.FORGOT_PASSWORD;
};

const resetPassword = async ({ email, code, password }) => {
  const passwordHash = await hashPassword(password);
  const user = await User.findOne({ email }).select('_id').lean();
  if (!user) throw AppError.fromCode(ERRORS.INVALID_CODE);
  await consumeCode({ 
    userId: user._id,
    purpose: CODE_PURPOSES.PASSWORD_RESET,
    code,
    update: { $set: { password: passwordHash, passwordChangedAt: new Date() } },
  });
  return MESSAGES.PASSWORD_RESET;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password').lean();
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw AppError.fromCode(ERRORS.INVALID_CREDENTIALS, MESSAGES.CURRENT_PASSWORD_INCORRECT);
  }
  await User.updateOne(
    { _id: userId },
    { $set: { 
        password: await hashPassword(newPassword), 
        passwordChangedAt: new Date() } 
    },
  );
  return MESSAGES.PASSWORD_CHANGED;
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
};