/**
 * Migration: per-user / per-measure access overrides + staff_nurse read-only access.
 *
 * ۱) جدول `user_measure_overrides` — لایه‌ی دسترسی موردی روی سیستم نقش/محور.
 *    access_type='grant' یعنی این کاربرِ خاص به این سنجه‌ی خاص دسترسی دارد حتی اگر
 *    محور آن در دامنه‌ی نقشش نباشد؛ access_type='deny' یعنی برعکس (deny بر grant نقش می‌چربد).
 *    شاهد طراحی اولیه حسن: hassan_ANALYSIS.md §۱۲ — «طراحی اولیه حسن دسترسی را در دو محور مستقل مدیریت می‌کند:
 *    نقش سازمانی سراسری + تخصیص موردی per-record (مسئول جمع‌آوری/پایش هر شاخص)».
 *
 * ۲) مجوز `view_measure_status_readonly` برای نقش «پرستار» (staff_nurse) —
 *    معادل «کاربر پایه (Staff)» در طراحی اولیه حسن: مشاهده/تکمیل ماژول‌های مسیرشده به او، بدون ویرایش.
 *
 * Idempotent — safe to run on every boot.
 */
const Database = require('better-sqlite3');
// مسیر از src/config/paths.js — نه path.join(__dirname,'hospital.db').
// آن مسیر ثابت تا وقتی دیتابیس داخل پوشه‌ی پروژه بود درست کار می‌کرد، ولی با
// انتقال دیتابیس به والیوم (DATA_DIR) به یک فایل خالیِ جداگانه اشاره می‌کرد و
// نتیجه‌ی این مهاجرت بی‌صدا روی دیتابیس واقعی اعمال نمی‌شد.
const { dbPath } = require('../src/config/paths');

function runMigration() {
  const db = new Database(dbPath);
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS user_measure_overrides (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      measure_id TEXT NOT NULL REFERENCES accreditation_sections(id) ON DELETE CASCADE,
      access_type TEXT NOT NULL CHECK (access_type IN ('grant','deny')),
      note TEXT,
      granted_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, measure_id)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_umo_user ON user_measure_overrides(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_umo_measure ON user_measure_overrides(measure_id)');

    let granted = 0;
    const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
    for (const r of db.prepare("SELECT id, permissions FROM roles WHERE code = 'staff_nurse'").all()) {
      const perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []);
      if (!perms.includes('view_measure_status_readonly')) {
        perms.push('view_measure_status_readonly');
        upd.run(JSON.stringify(perms), r.id);
        granted++;
      }
    }
    console.log(`[Seed Measure-Overrides] ✅ table ready; ${granted} staff_nurse role(s) granted view_measure_status_readonly`);
  } finally {
    db.close();
  }
}

if (require.main === module) runMigration();
module.exports = { runMigration };
