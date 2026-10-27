const express = require('express');
const { ipKeyGenerator } = require('express-rate-limit');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { createRateLimiter } = require('../../middleware/rateLimit');
const { AUTH_RATE_LIMIT, CODE_REQUEST_RATE_LIMIT } = require('../../constants');
const controller = require('./auth.controller');
const schemas = require('./auth.validation');

const router = express.Router();

// Each route gets its own limiter, so they count separately (10 per 15 minutes each).
const createAuthLimiter = () => createRateLimiter(AUTH_RATE_LIMIT);
const normalizedEmail= (req) => String(req.body?.email ?? '').trim().toLowerCase();

// Login is counted per IP + email, so one attacker can't lock a real user out from everywhere.
// ipKeyGenerator groups IPv6 addresses by network, so an attacker can't dodge the limit by rotating them.
const loginLimiter = createRateLimiter({
  ...AUTH_RATE_LIMIT,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}|${normalizedEmail(req)}`,
});

// Each new code gets 5 fresh guesses, so asking for codes is capped per ACCOUNT, not just per IP.
// Otherwise a botnet could keep requesting codes for one victim and guess across all of them.
const codeRequestLimiter = createRateLimiter({
  ...CODE_REQUEST_RATE_LIMIT,
  keyGenerator: normalizedEmail
});
router.post('/register', createAuthLimiter(), validate({ body: schemas.registerBody }), controller.register);
router.post('/login', loginLimiter, validate({ body: schemas.loginBody }), controller.login);
router.post('/logout', controller.logout);
router.post('/verify-email', authenticate, validate({ body: schemas.verifyEmailBody }), controller.verifyEmail);
router.post('/resend-verification', authenticate, createAuthLimiter(), controller.resendVerification);
router.post('/forgot-password', createAuthLimiter(), codeRequestLimiter, validate({ body: schemas.forgotPasswordBody }), controller.forgotPassword);
router.post('/reset-password', createAuthLimiter(), validate({ body: schemas.resetPasswordBody }), controller.resetPassword);
router.post('/change-password', authenticate, validate({ body: schemas.changePasswordBody }), controller.changePassword);

module.exports = router;