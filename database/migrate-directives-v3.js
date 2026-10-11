/**
 * migrate-directives-v3.js
 * ---------------------------------------------------------------------------
 * ۱) ستون فرم پیوست: ابلاغیه می‌تواند یک فرم را «ابلاغ» کند تا مشخص باشد چه
 *    فرمی توسط چه کسی ابلاغ شده (form_id + رونوشت عنوان در لحظه‌ی صدور).
 * ۲) idempotent: ستون هست؟ رد شو.
 */
const { db } = require('../src/config/database-sqlite');

const cols = new Set(db.prepare('PRAGMA table_info(directives)').all().map((c) => c.name));
const added = [];
if (!cols.has('form_id')) {
  db.exec(`ALTER TABLE directives ADD COLUMN form_id TEXT`);
  added.push('form_id');
}
if (!cols.has('form_title')) {
  db.exec(`ALTER TABLE directives ADD COLUMN form_title TEXT`);
  added.push('form_title');
}

console.log('[directives v3] ستون‌های افزوده‌شده:', added.length ? added.join(', ') : 'هیچ (از قبل کامل بود)');
console.log('[directives v3] شمار ابلاغیه‌ها:', db.prepare('SELECT COUNT(*) c FROM directives').get().c);
