const mongoose = require('mongoose');

const isPlainObject = (value) => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// The one place that turns database output into API output:
// _id becomes id, __v is dropped, ObjectIds and Dates become strings.
const serialize = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value.toObject === 'function') return serialize(value.toObject());
  if (typeof value !== 'object' || !isPlainObject(value)) return value;

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === '__v') continue;
    result[key === '_id' ? 'id' : key] = serialize(item);
  }
  return result;
};

const sendSuccess = (res, data, { status = 200, message } = {}) => {
  const body = { success: true, data: serialize(data) };
  if (message) body.message = message;
  return res.status(status).json(body);
};

const sendCreated = (res, data, message) => sendSuccess(res, data, { status: 201, message });

const sendMessage = (res, message) => sendSuccess(res, null, { message });

// emptyMessage comes from EMPTY in utils/messages.js and is only sent for an empty list.
const sendList = (res, data, { page, limit, total, emptyMessage }) => {
  const body = {
    success: true,
    data: serialize(data),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
  if (data.length === 0 && emptyMessage) body.message = emptyMessage;
  return res.status(200).json(body);
};

module.exports = { serialize, sendSuccess, sendCreated, sendMessage, sendList };