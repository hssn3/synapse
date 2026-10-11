/**
 * Migration: ایندکس‌های عملکردی روی hospital_id برای جدول‌هایی که در روت‌های واقعی به‌طور
 * مستقیم با `WHERE hospital_id = ?` کوئری می‌شوند اما ایندکس ندارند.
 *
 * چرا این جدول‌ها: در database/migrate.js (اسکریپت قدیمی/غیرفعالِ نسخه‌ی Postgres — دیگر در
 * npm run init-db صدا زده نمی‌شود) این ایندکس‌ها تعریف شده بودند، اما database/migrate-sqlite.js
 * (اسکریپتی که واقعاً برای SQLite اجرا می‌شود) آن‌ها را نداشت؛ یعنی این ایندکس‌ها هرگز واقعاً
 * روی دیتابیس زنده اعمال نشده بودند. با بررسی مستقیم PRAGMA index_list روی database/hospital.db
 * تأیید شد که این جدول‌ها هیچ ایندکسی روی hospital_id ندارند — از جمله audit_log که در هر عملیات
 * نوشتنی یک ردیف جدید می‌گیرد و دائم رشد می‌کند.
 *
 * Idempotent: CREATE INDEX IF NOT EXISTS — اجرای مکرر هیچ تغییری نمی‌دهد.
 */
const { db } = require('../src/config/database-sqlite');

const STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS idx_audit_log_hospital ON audit_log(hospital_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_committees_hospital ON committees(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_roles_hospital ON roles(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_types_hospital ON activity_types(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_nursing_shift_reports_hospital ON nursing_shift_reports(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_complaints_hospital ON patient_complaints_suggestions(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_staff_suggestions_hospital ON staff_suggestions(hospital_id)`,
  `CREATE INDEX IF NOT EXISTS idx_patient_satisfaction_hospital ON patient_satisfaction_surveys(hospital_id)`,
];

function tableExists(name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
}

function runMigration() {
  console.log('[Seed PerfIndexes] Starting...');
  let applied = 0;
  for (const stmt of STATEMENTS) {
    const tableMatch = stmt.match(/ON\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;
    if (table && !tableExists(table)) continue; // جدول هنوز ساخته نشده (ترتیب seed) — بی‌خطر رد شود
    try {
      db.exec(stmt);
      applied++;
    } catch (err) {
      console.error(`[Seed PerfIndexes] ❌ Failed for "${stmt}":`, err.message);
    }
  }
  console.log(`[Seed PerfIndexes] ✅ ${applied}/${STATEMENTS.length} index statement(s) applied/verified`);
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
