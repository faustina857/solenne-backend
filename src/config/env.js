const Joi = require('joi');
const dotenv = require('dotenv');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  PORT: Joi.number().port().required(),
  MONGO_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  FRONTEND_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  ALLOWED_ORIGINS: Joi.string().required(),
//   PAYSTACK_SECRET_KEY: Joi.string().required(),
  BREVO_API_KEY: Joi.string().required(),
  EMAIL_FROM: Joi.string().email().required(),
  EMAIL_FROM_NAME: Joi.string().default('Solenne'),
//   CLOUDINARY_CLOUD_NAME: Joi.string().required(),
//   CLOUDINARY_API_KEY: Joi.string().required(),
//   CLOUDINARY_API_SECRET: Joi.string().required(),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).max(72).required(),
}).unknown(true);

// Describe the problem in a human-readable way for each validation error.
const describeProblem = (detail) => {
  if (detail.type === 'any.required' || detail.type === 'string.empty') return 'is missing';
  if (detail.type === 'string.min') return `must be at least ${detail.context.limit} characters`;
  return 'has an invalid value';
};

// Filter out empty values and validate the rest. If any required variable is missing or invalid, exit with an error.
const raw = Object.fromEntries(
  Object.entries(process.env).filter(
    ([, value]) => value !== '' && value?.trim() !== '',
  ),
);

const { value, error } = schema.validate(raw, { abortEarly: false });

if (error) {
  const lines = error.details.map((d) => `  - ${d.context.label} ${describeProblem(d)}`);
  process.stderr.write(
    `Invalid environment configuration:\n${lines.join('\n')}\n\nCompare your .env with .env.example.\n`,
  );
  process.exit(1);
}

const stripTrailingSlashes = (url) => url.replace(/\/+$/, '');

module.exports = Object.freeze({
  nodeEnv: value.NODE_ENV,
  isProduction: value.NODE_ENV === 'production',
  port: value.PORT,
  mongoUri: value.MONGO_URI,
  jwt: { secret: value.JWT_SECRET, expiresIn: value.JWT_EXPIRES_IN },
  frontendUrl: stripTrailingSlashes(value.FRONTEND_URL),
  allowedOrigins: value.ALLOWED_ORIGINS.split(',').map(stripTrailingSlashes).filter(Boolean),
  email: { apiKey: value.BREVO_API_KEY, from: value.EMAIL_FROM, fromName: value.EMAIL_FROM_NAME },
  admin: { email: value.ADMIN_EMAIL, password: value.ADMIN_PASSWORD },
});