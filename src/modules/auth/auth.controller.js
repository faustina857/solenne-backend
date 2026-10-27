const authService = require('./auth.service');
const { sendSuccess, sendCreated, sendMessage } = require('../../utils/sendResponse');
const { MESSAGES } = require('../../utils/messages');
const { setAuthCookie, clearAuthCookie } = require('../../utils/jwt');

// The token goes into the cookie and is deliberately left out of the response body,
// so page JavaScript never sees it.
const register = async (req, res) => {
  const { user, token } = await authService.register(req.valid.body);
  setAuthCookie(res, token);
  sendCreated(res, { user });
};

const login = async (req, res) => {
  const { user, token } = await authService.login(req.valid.body);
  setAuthCookie(res, token);
  sendSuccess(res, { user });
};

// Always succeeds, even with an expired cookie, so a stale session can still be cleared.
const logout = (req, res) => {
  clearAuthCookie(res);
  sendMessage(res, MESSAGES.LOGGED_OUT);
};

const verifyEmail = async (req, res) =>
  sendMessage(res, await authService.verifyEmail(req.user,req.valid.body));

const resendVerification = async (req, res) =>
  sendMessage(res, await authService.resendVerification(req.user));

const forgotPassword = async (req, res) =>
  sendMessage(res, await authService.forgotPassword(req.valid.body));

const resetPassword = async (req, res) =>
  sendMessage(res, await authService.resetPassword(req.valid.body));

// The old tokens are now invalid, so the stale cookie is cleared and the user logs in again.
const changePassword = async (req, res) => {
  const message = await authService.changePassword(req.user._id, req.valid.body);
  clearAuthCookie(res);
  sendMessage(res, message);
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
};