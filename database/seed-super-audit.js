/**
 * Migration: جدول لاگ فعالیت سوپرادمین در سطح پلتفرم (نه یک بیمارستان خاص).
 * audit_log موجود hospital_id/user_id را NOT NULL با FK به hospitals/users می‌خواهد و برای
 * عملیات پلتفرمی (مثل بکاپ/بازگردانی کل دیتابیس) معنا ندارد؛ به‌جای شل کردن آن constraint
 * برای همه‌ی ماژول‌های موجود، یک جدول مستقل مخصوص اقدامات سوپرادمین ساخته می‌شود.
 * Run: idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

function runMigration() {
  console.log('[Seed Super Audit] Starting...');
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS super_audit_log (
      id TEXT PRIMARY KEY,
      super_admin_id TEXT,
      action TEXT NOT NULL,
      target_table TEXT,
      target_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('[Seed Super Audit] ✅ super_audit_log ready');
  } catch (err) {
    console.error('[Seed Super Audit] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
