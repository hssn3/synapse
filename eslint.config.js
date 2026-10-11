// ESLint flat config — حداقل سخت‌گیرانه برای پروژه Node 22
// چرا: چک‌لیست مورد ۳۱ — بدون تغییر رفتار، فقط بهداشت کد
module.exports = [
  {
    ignores: ['node_modules/**', 'database/*.db*', 'database/backups/**', 'uploads/**', 'public/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { console: 'readonly', Buffer: 'readonly', process: 'readonly', __dirname: 'readonly', module: 'readonly', require: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', AbortController: 'readonly', FormData: 'readonly', structuredClone: 'readonly' } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
    },
  },
  {
    // این اسکریپت یک اسنیپت مرورگری است (document.* داخل کانتکست صفحه اجرا می‌شود)
    files: ['scripts/inspect_upload.js'],
    languageOptions: { globals: { document: 'readonly' } },
  },
  {
    // اسکریپت‌های Puppeteer: window/document داخل page.evaluate در کانتکست مرورگر اجرا می‌شوند
    files: ['scripts/e2e*.js', 'scripts/capture_*.js'],
    languageOptions: { globals: { window: 'readonly', document: 'readonly' } },
  },
];
