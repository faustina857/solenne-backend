const js = require('@eslint/js');

// Node.js globals that aren't built into plain JavaScript.
// (require, module, exports and __dirname come from sourceType: 'commonjs'.)
const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  fetch: 'readonly',
  AbortSignal: 'readonly',
  URL: 'readonly',
};

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: {
      // Express error handlers must declare all 4 arguments, even when `next` isn't used.
      'no-unused-vars': ['error', { argsIgnorePattern: '^next$' }],
      // Pino is the logger (coding-standards.md section 7).
      'no-console': 'error',
    },
  },
];