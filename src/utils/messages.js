// Single source for every user-facing message (target-backend.md section 13).
// Messages with dynamic parts (OUT_OF_STOCK, INSUFFICIENT_STOCK, PRICE_CHANGED,
// CATEGORY_NOT_EMPTY) hold a generic default. The service passes the specific text.
const defineErrors = (rows) =>
  Object.freeze(
    Object.fromEntries(
      rows.map(([code, status, message]) => [code, Object.freeze({ code, status, message })]),
    ),
  );

const ERRORS = defineErrors([
  ['VALIDATION_ERROR', 400, 'Please check the highlighted fields.'],
  ['UNAUTHENTICATED', 401, 'Please log in to continue.'],
  ['SESSION_EXPIRED', 401, 'Your session has expired. Please log in again.'],
  ['INVALID_CREDENTIALS', 401, 'Incorrect email or password.'],
  ['INVALID_CODE', 400, 'This code is incorrect or has expired. Please request a new one.'],
  ['BAD_REQUEST', 400, "We couldn't read that request. Please try again."],
  ['FORBIDDEN', 403, "You don't have permission to do that."],
  ['ACCOUNT_DISABLED', 403, 'This account has been deactivated. Please contact support.'],
  [
    'EMAIL_NOT_VERIFIED',
    403,
    'Please verify your email to place an order. We can send you a new code.',
  ],
  ['USER_NOT_FOUND', 404, "We couldn't find that user."],
  ['ADDRESS_NOT_FOUND', 404, "We couldn't find that address."],
  ['ADDRESS_LIMIT_REACHED', 409, 'You can save up to 10 addresses. Please remove one before adding another.'],
  ['PRODUCT_NOT_FOUND', 404, "We couldn't find that product. It may have been removed."],
  ['ORDER_NOT_FOUND', 404, "We couldn't find that order."],
  ['NOT_FOUND', 404, "We couldn't find what you're looking for."],
  ['ROUTE_NOT_FOUND', 404, "That page or action doesn't exist."],
  ['EMAIL_EXISTS', 409, 'An account with this email already exists. Try logging in instead.'],
  ['CONFLICT', 409, 'That already exists. Please use a different value.'],
  ['OUT_OF_STOCK', 409, 'Sorry, that item just sold out.'],
  ['INSUFFICIENT_STOCK', 409, "There isn't enough stock for that quantity."],
  ['CART_HAS_ISSUES', 409, 'Some items in your cart changed. Please review them.'],
  ['PRICE_CHANGED', 409, 'The price of an item in your cart changed.'],
  ['AREA_NOT_DELIVERABLE', 400, "We don't deliver to this area yet."],
  ['CART_EMPTY', 400, 'Your cart is empty. Add something before checking out.'],
  [
    'PAYMENT_INIT_FAILED',
    502,
    "We couldn't start your payment. You haven't been charged. Please try again.",
  ],
  [
    'PAYMENT_FAILED',
    400,
    "Your payment didn't go through. Please try again or use a different card.",
  ],
  [
    'PAYMENT_MISMATCH',
    400,
    "We couldn't confirm this payment. Please contact support with your order number.",
  ],
  ['ORDER_NOT_CANCELLABLE', 409, "This order has already shipped and can't be cancelled."],
  [
    'CATEGORY_NOT_EMPTY',
    409,
    'This category still has products. Move or deactivate them first.',
  ],
  ['RATE_LIMITED', 429, 'Too many attempts. Please wait a few minutes and try again.'],
  ['SERVER_ERROR', 500, 'Something went wrong on our side. Please try again in a moment.'],
]);

const EMPTY = Object.freeze({
  PRODUCTS: 'No products here yet. Check back soon.',
  PRODUCTS_FILTERED:
    'No products match your filters. Try removing a filter or searching for something else.',
  PRODUCTS_SEARCH: (query) =>
    `No results for “${query}”. Check the spelling or try a different word.`,
  SUB_CATEGORY: "We're restocking this section. Have a look at similar items.",
  CART: 'Your cart is empty.',
  WISHLIST: 'Your wishlist is empty. Tap the heart on items you love to save them.',
  ORDERS: "You haven't placed any orders yet.",
  ADDRESSES: "You haven't saved an address yet.",
  DELIVERY_ZONES: "We're not delivering anywhere yet. Please check back soon.",
  ADMIN_ORDERS: 'No orders match these filters.',
  ADMIN_LOW_STOCK: 'Everything is well stocked.',
});

// Per-field messages for Joi, keyed by Joi's error type.
const VALIDATION_MESSAGES = Object.freeze({
  'any.required': 'This field is required.',
  'any.only': 'Please choose one of the allowed options.',
  'any.invalid': "This value isn't valid.",
  'string.base': 'Enter text for this field.',
  'string.empty': "This field can't be empty.",
  'string.email': 'Enter a valid email address.',
  'string.min': 'This is too short. Use at least {#limit} characters.',
  'string.max': 'This is too long. Use at most {#limit} characters.',
  'string.pattern.base': "This isn't in the right format.",
  'string.uri': 'Enter a valid code.',
  'number.base': 'Enter a valid number.',
  'number.integer': 'Enter a whole number.',
  'number.min': 'This must be at least {#limit}.',
  'number.max': 'This must be at most {#limit}.',
  'number.greater': 'This must be greater than {#limit}.',
  'boolean.base': 'Choose yes or no.',
  'array.base': "This isn't in the right format.",
  'array.min': 'Add at least {#limit} item(s).',
  'array.max': 'You can add at most {#limit} items.',
  'date.base': 'Enter a valid date.',
  'object.base': "We couldn't read that request. Please try again.",
  'objectId.invalid': "That selection isn't valid.",
});
const MESSAGES = Object.freeze({
  CODE_FORMAT: 'Enter the 6-digit code from your email.',
  LOGGED_OUT: 'You have been logged out.',
  EMAIL_VERIFIED: 'Your email has been verified. Thank you!',
  VERIFICATION_SENT: "We've sent a new verification code to your email.",
  EMAIL_ALREADY_VERIFIED: 'Your email is already verified.',
  FORGOT_PASSWORD: "If an account exists for this email, we've sent a reset code.",
  PASSWORD_RESET: 'Your password has been reset. Please log in with your new password.',
  PASSWORD_CHANGED: 'Your password has been changed. Please log in again.',
  CURRENT_PASSWORD_INCORRECT: 'Your current password is incorrect.',
  ADDRESS_DELETED: 'Address removed.',
  PASSWORD_LENGTH: 'Password must be between 8 and 72 characters.',
  PHONE_INVALID: 'Enter a valid Nigerian phone number, like 08012345678.',
  STATE_INVALID: 'Choose a valid Nigerian state.',
  LETTERS_ONLY: 'Use letters, spaces, hyphens or apostrophes only.',
});
module.exports = { ERRORS, EMPTY, VALIDATION_MESSAGES, MESSAGES };