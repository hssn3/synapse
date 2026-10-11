/**
 * Migration: جدول لاگ خطاهای سرور برای پنل سوپرادمین.
 * وقتی یک درخواست به میان‌افزار نهایی خطای app.js می‌رسد، جزئیات واقعی (پیام + بخشی از stack)
 * اینجا ذخیره می‌شود؛ پاسخ HTTP که به کاربر نهایی می‌رود همیشه پیام عمومی «خطای سرور» باقی می‌ماند
 * و هرگز جزئیات داخلی/stack را لو نمی‌دهد — فقط سوپرادمین از طریق GET /api/super/error-log می‌بیند.
 * جدول مستقل از audit_log/super_audit_log است چون یک درخواست خطادار ممکن است اصلاً کاربر/بیمارستان
 * شناخته‌شده نداشته باشد (hospital_id/user_id هر دو nullable هستند).
 * Run: idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

function runMigration() {
  console.log('[Seed Error Log] Starting...');
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS error_log (
      id TEXT PRIMARY KEY,
      hospital_id TEXT,
      user_id TEXT,
      method TEXT,
      route TEXT,
      status_code INTEGER,
      message TEXT,
      stack TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_error_log_created ON error_log(created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_error_log_hospital ON error_log(hospital_id)`);
    console.log('[Seed Error Log] ✅ error_log ready');
  } catch (err) {
    console.error('[Seed Error Log] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
