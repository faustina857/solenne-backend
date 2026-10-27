const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AUTH_COOKIE_NAME, MS_PER_SECOND } = require('../constants');

// Pinning the algorithm stops a forged token from choosing a weaker one.
const ALGORITHM = 'HS256';

// "sub" (subject) is the standard JWT field for the user id. "iat" (issued at) is added automatically.
const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.jwt.secret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwt.expiresIn,
  });

// Throws TokenExpiredError / JsonWebTokenError, which errorHandler already maps.
const verifyToken = (token) => jwt.verify(token, env.jwt.secret, { algorithms: [ALGORITHM] });

// httpOnly: page JavaScript can't read the cookie, so an injected script can't steal the token.
// secure: only sent over HTTPS (off in development, where localhost uses plain http).
// sameSite 'lax': the browser won't attach the cookie to cross-site POST/PATCH/DELETE requests (blocks CSRF).
const baseCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
};

const setAuthCookie = (res, token) => {
  // The cookie expires exactly when the token does, so the two can never drift apart.
  const { exp } = jwt.decode(token);
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    expires: new Date(exp * MS_PER_SECOND),
  });
};

// Express 5 ignores expires/maxAge here, but the other options must match the original cookie.
const clearAuthCookie = (res) => res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions);

// The browser sends "Cookie: a=1; solenne_token=xyz". This picks out our cookie's value.
const readAuthCookie = (req) => {
  const prefix = `${AUTH_COOKIE_NAME}=`;
  const pair = req.headers.cookie?.split('; ').find((item) => item.startsWith(prefix));
  return pair?.slice(prefix.length);
};

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie, readAuthCookie };