const AppError = require('../utils/appError');
const { ERRORS } = require('../utils/messages');
const { verifyToken, readAuthCookie } = require('../utils/jwt');
const { findAuthUser } = require('../modules/users/users.service');
const { MS_PER_SECOND } = require('../constants');


// Loads the user from the database on every request, so deactivation, role changes
// and password changes take effect immediately (the token only proves who you are).
const authenticate = async (req, res, next) => {
  const token = readAuthCookie(req) ;
  if (!token) throw AppError.fromCode(ERRORS.UNAUTHENTICATED);

  const payload = verifyToken(token);
  const user = await findAuthUser(payload.sub);
  if (!user) throw AppError.fromCode(ERRORS.UNAUTHENTICATED);
  if (!user.isActive) throw AppError.fromCode(ERRORS.ACCOUNT_DISABLED);

  // Tokens issued before the last password change are no longer valid.
  const changedAt = user.passwordChangedAt
    ? Math.floor(user.passwordChangedAt.getTime() / MS_PER_SECOND)
    : 0;
  if (payload.iat < changedAt) throw AppError.fromCode(ERRORS.SESSION_EXPIRED);

  req.user = user;
  next();
};

// Restricts access to users with one of the specified roles. Roles are defined in the User model.
// Use after authenticate: router.use(authenticate, requireRole(ROLES.ADMIN)).
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) throw AppError.fromCode(ERRORS.FORBIDDEN);
    next();
  };

module.exports = { authenticate, requireRole };