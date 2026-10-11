/**
 * Migration: تکمیل «گزارش خطا/واقعه» با شاخهٔ تحلیل ریشه‌ای (RCA)
 * افزودن ستون‌های needs_rca / rca_text / tracking_code / error_ward /
 * referred_to_secretariat / evaluation_status به medical_error_reports.
 * (بر اساس docs/hassan_ANALYSIS_V4.md بخش ۴ — رکورد ۴۰ ستونی گزارش خطا)
 * Run: npm run seed-error-reports
 * idempotent است و روی هر boot امن اجرا می‌شود.
 *
 * ⚠️ هشدار هنگام تست دستی این ماژول: متن فارسی را داخل آرگومان خط فرمان پوسته
 * ننویس (`curl -d '{"description":"..."}'` از PowerShell/Git-Bash). ویندوز آن را
 * از cp1252 رد می‌کند و هر حرف فارسی بی‌صدا به `?` تبدیل می‌شود؛ نتیجه‌اش ردیف‌های
 * `???? ?????` در medical_error_reports است. به‌جایش بدنه را در فایل بگذار
 * (`curl -d @fixture.json`). ن.ک. database/seed-cleanup-mangled-text.js
 */
const { db } = require('../src/config/database-sqlite');

// ستون‌هایی که بعداً اضافه شده‌اند (روی دیتابیس‌های موجود هم باید ساخته شوند)
const ADD_COLUMNS = [
  { table: 'medical_error_reports', column: 'needs_rca', ddl: "ALTER TABLE medical_error_reports ADD COLUMN needs_rca INTEGER DEFAULT 0" },
  { table: 'medical_error_reports', column: 'rca_text', ddl: "ALTER TABLE medical_error_reports ADD COLUMN rca_text TEXT" },
  { table: 'medical_error_reports', column: 'tracking_code', ddl: "ALTER TABLE medical_error_reports ADD COLUMN tracking_code TEXT" },
  // بخشی که خطا در آن رخ داده — مجزا از department (بخشِ گزارش‌دهنده)
  { table: 'medical_error_reports', column: 'error_ward', ddl: "ALTER TABLE medical_error_reports ADD COLUMN error_ward TEXT" },
  { table: 'medical_error_reports', column: 'referred_to_secretariat', ddl: "ALTER TABLE medical_error_reports ADD COLUMN referred_to_secretariat INTEGER DEFAULT 0" },
  { table: 'medical_error_reports', column: 'evaluation_status', ddl: "ALTER TABLE medical_error_reports ADD COLUMN evaluation_status TEXT DEFAULT 'در انتظار بررسی'" },
  // خوداظهاری در برابر دگراظهاری — بخش ۴ hassan_ANALYSIS_V4.md (is_self_declaration).
  // در طراحی اولیه حسن این یک فیلد روی خودِ گزارش خطاست، نه یک فرم مجزا.
  { table: 'medical_error_reports', column: 'is_self_declaration', ddl: "ALTER TABLE medical_error_reports ADD COLUMN is_self_declaration INTEGER DEFAULT 0" },
];

// مجوزهای موجود ماژول گزارش خطا؛ نقش‌هایی که باید داشته باشند اما ندارند
const ROLE_PERMS = {
  admin: ['submit_medical_error_report', 'manage_medical_error_reports'],
  quality_control_manager: ['submit_medical_error_report'],
  nursing_director: ['submit_medical_error_report', 'manage_medical_error_reports'],
  clinical_supervisor: ['submit_medical_error_report'],
  education_supervisor: ['submit_medical_error_report'],
  breastfeeding_specialist: ['submit_medical_error_report'],
  staff_nurse: ['submit_medical_error_report'],
};

const INDEXES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mer_tracking ON medical_error_reports(tracking_code) WHERE tracking_code IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_mer_hospital ON medical_error_reports(hospital_id, created_at)`,
];

function runMigration() {
  console.log('[Seed ErrorReports] Starting...');
  try {
    for (const c of ADD_COLUMNS) {
      const cols = db.prepare(`PRAGMA table_info(${c.table})`).all().map(r => r.name);
      if (!cols.includes(c.column)) { db.exec(c.ddl); console.log(`[Seed ErrorReports] + ${c.table}.${c.column}`); }
    }
    for (const sql of INDEXES) db.exec(sql);

    // رکوردهای قدیمی بدون کد رهگیری را عقب‌گرد پر می‌کنیم تا لیست، ستون خالی نشان ندهد
    const legacy = db.prepare(`SELECT id, hospital_id, created_at FROM medical_error_reports
                               WHERE tracking_code IS NULL OR tracking_code = ''`).all();
    if (legacy.length) {
      const { buildTrackingCode } = require('../src/utils/tracking');
      const upd = db.prepare('UPDATE medical_error_reports SET tracking_code = ? WHERE id = ?');
      const tx = db.transaction(() => {
        for (const r of legacy) upd.run(buildTrackingCode(db, r.hospital_id), r.id);
      });
      tx();
      console.log(`[Seed ErrorReports] backfilled ${legacy.length} tracking code(s)`);
    }

    // وضعیت ارزیابی خالی در رکوردهای قدیمی
    db.exec(`UPDATE medical_error_reports SET evaluation_status = 'در انتظار بررسی'
             WHERE evaluation_status IS NULL OR evaluation_status = ''`);

    const roles = db.prepare('SELECT id, code, permissions FROM roles').all();
    const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
    let changed = 0;
    const ptx = db.transaction(() => {
      for (const r of roles) {
        const wanted = ROLE_PERMS[r.code];
        if (!wanted) continue;
        let perms;
        try { perms = JSON.parse(r.permissions || '[]'); } catch { perms = []; }
        if (!Array.isArray(perms)) perms = [];
        const missing = wanted.filter(p => !perms.includes(p));
        if (!missing.length) continue;
        upd.run(JSON.stringify(perms.concat(missing)), r.id);
        changed++;
      }
    });
    ptx();

    console.log(`[Seed ErrorReports] ✅ RCA columns ready, ${changed} role(s) granted error-report permissions`);
  } catch (err) {
    console.error('[Seed ErrorReports] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
