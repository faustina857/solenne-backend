const Joi = require('joi');
const AppError = require('../utils/appError');
const { ERRORS, VALIDATION_MESSAGES } = require('../utils/messages');

const SOURCES = ['body', 'query', 'params'];
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// A regex, not mongoose.isValidObjectId: that accepts any 12-character string.
const objectId = () =>
  Joi.string().custom((value, helpers) =>
    OBJECT_ID_PATTERN.test(value) ? value : helpers.error('objectId.invalid'),
  );

const JOI_OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
  messages: VALIDATION_MESSAGES,
  errors: { wrap: { label: false } },
};

// validate({ body, query, params }) takes Joi schemas. Cleaned values go to req.valid.*
// (Express 5 makes req.query read-only). A section with no schema becomes {}, so unknown
// fields never reach a controller.
// A rule with no friendly message yet falls back to a generic one, never Joi's technical wording.
const friendlyMessage = (detail) =>
  VALIDATION_MESSAGES[detail.type] ? detail.message : VALIDATION_MESSAGES['any.invalid'];

const validate = (schemas) => (req, res, next) => {
  const valid = {};
  const problems = [];

  for (const source of SOURCES) {
    const schema = schemas[source];
    if (!schema) {
      valid[source] = {};
      continue;
    }

    const { value, error } = schema.validate(req[source] ?? {}, JOI_OPTIONS);
    valid[source] = value;
    if (!error) continue;

    // A malformed :id is "not found" (target-backend.md section 13.1), not a form error.
    if (source === 'params' && error.details.some((d) => d.type === 'objectId.invalid')) {
      throw AppError.fromCode(ERRORS.NOT_FOUND);
    }
    problems.push(...error.details.map((d) => ({ field: d.path.join('.'), message: friendlyMessage(d) })));
  }

  if (problems.length > 0) {
    throw AppError.fromCode(ERRORS.VALIDATION_ERROR, undefined, { errors: problems });
  }

  req.valid = valid;
  return next();
};

module.exports = { validate, objectId };