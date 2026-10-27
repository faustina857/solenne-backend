const env = require('../config/env');
const logger = require('../config/logger');
const {
  EMAIL_SEND_ATTEMPTS,
  EMAIL_RETRY_DELAY_MS,
  EMAIL_REQUEST_TIMEOUT_MS,
  CODE_TTL_MINUTES,
} = require('../constants');

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// A user's name is typed by the user, so it is escaped before going into HTML.
const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// One call to Brevo. Returns when Brevo accepts the email, and throws otherwise.
// `retryable` tells the caller whether trying again can help: a wrong API key or an
// unverified sender (4xx) will fail the same way every time, while 429 and 5xx are temporary.
const postEmail = async (body) => {
  const response = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: {
      'api-key': env.email.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
  });
  if (response.ok) return;

  const detail = await response.json().catch(() => ({}));
  const error = new Error(`Brevo ${response.status}: ${detail.message ?? 'no details'}`);
  error.retryable =
    response.status === HTTP_TOO_MANY_REQUESTS || response.status >= HTTP_SERVER_ERROR;
  throw error;
};

// Retries are sequential on purpose: attempt 2 only makes sense if attempt 1 failed.
// This function never rejects, so callers can fire it without awaiting.
// Network errors and timeouts have no `retryable` flag, so they count as retryable.
const sendWithRetry = async ({ to, name, subject, html }) => {
  const body = JSON.stringify({
    sender: { name: env.email.fromName, email: env.email.from },
    to: [{ email: to, name }],
    subject,
    htmlContent: html,
  });

  for (let attempt = 1; attempt <= EMAIL_SEND_ATTEMPTS; attempt += 1) {
    try {
      await postEmail(body);
      return;
    } catch (err) {
      logger.warn({ attempt, subject, reason: err.message }, 'Email attempt failed');
      if (err.retryable === false) break;
    }
    if (attempt < EMAIL_SEND_ATTEMPTS) await wait(EMAIL_RETRY_DELAY_MS * attempt);
  }
  logger.error({ subject }, 'Email could not be sent');
};

const codeBlock = (code) =>
  `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0">${code}</p>`;

const buttonBlock = (text, url) =>
  `<p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none">${text}</a></p>`;

// `action` is the ready-made HTML for the main part of the email: a code or a button.
const render = ({ name, intro, action, outro }) => `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111">
    <h2>Hi ${escapeHtml(name)},</h2>
    <p>${intro}</p>
    ${action}
    <p style="font-size:13px;color:#555">${outro}</p>
  </div>`;

const expiryNote = `This code expires in ${CODE_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.`;

const sendWelcomeEmail = ({ to, name }) =>
  sendWithRetry({
    to,
    name,
    subject: 'Welcome to Solenne',
    html: render({
      name,
      intro: 'Your email is verified and your account is ready. Come and explore the collection.',
      action: buttonBlock('Start shopping', env.frontendUrl),
      outro: 'You are receiving this email because you verified your Solenne account.',
    }),
  });

const sendVerificationEmail = ({ to, name, code }) =>
  sendWithRetry({
    to,
    name,
    subject: 'Your Solenne verification code',
    html: render({
      name,
      intro: 'Enter this code in the app to verify your email. You will need it to place orders.',
      action: codeBlock(code),
      outro: expiryNote,
    }),
  });

const sendPasswordResetEmail = ({ to, name, code }) =>
  sendWithRetry({
    to,
    name,
    subject: 'Your Solenne password reset code',
    html: render({
      name,
      intro: 'We received a request to reset your password. Enter this code in the app to continue.',
      action: codeBlock(code),
      outro: expiryNote,
    }),
  });

module.exports = { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail };