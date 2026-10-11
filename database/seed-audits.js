/**
 * Migration + Seed: حسابرسی داخلی (پرسش‌نامه بازرسی) — docs/DESIGN.md بند ۱۸
 * ساخت جدول internal_audits و افزودن مجوزهای manage_audits / view_audits.
 *
 * چرا جدول نازکِ جدا و نه یک ستون تفکیک‌کننده روی checklist_submissions؟
 *  ۱) حسابرسی چرخهٔ عمر دارد (برنامه‌ریزی‌شده → در جریان → تکمیل → بسته‌شده) و اقدام اصلاحی و
 *     تاریخ پیگیری می‌گیرد؛ پاسخ‌نامهٔ چک‌لیست یک رویداد ثبت‌شده و تغییرناپذیر است.
 *  ۲) با ستون تفکیک‌کننده، شش ستونِ فقط-حسابرسی به همهٔ پاسخ‌نامه‌های چک‌لیست تحمیل می‌شد.
 *  ۳) این‌طور موتور چک‌لیست دست‌نخورده می‌ماند: حسابرسی فقط یک چک‌لیست را به‌عنوان «ابزار»
 *     ارجاع می‌دهد و پاسخ‌نامهٔ حاصل را به خودش پیوند می‌زند (checklist_submission_id).
 * Run: npm run seed-audits — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS internal_audits (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    checklist_id TEXT REFERENCES checklists(id) ON DELETE SET NULL,
    checklist_submission_id TEXT REFERENCES checklist_submissions(id) ON DELETE SET NULL,
    auditor_user_id TEXT REFERENCES users(id),
    auditor_name TEXT,
    audited_department TEXT,
    audit_date TEXT,
    finding_summary TEXT,
    corrective_action_required INTEGER DEFAULT 0,
    corrective_action_text TEXT,
    follow_up_date TEXT,
    status TEXT DEFAULT 'planned',
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_hospital ON internal_audits(hospital_id, status, audit_date)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_dept ON internal_audits(hospital_id, audited_department)`,
];

const ROLE_PERMS = {
  admin: ['manage_audits', 'view_audits'],
  quality_control_manager: ['manage_audits', 'view_audits'],
  nursing_director: ['manage_audits', 'view_audits'],
  clinical_supervisor: ['view_audits'],
  infection_control_supervisor: ['view_audits'],
};

function runMigration() {
  console.log('[Seed Audits] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Audits');
    console.log('[Seed Audits] ✅ internal_audits ready');
  } catch (err) {
    console.error('[Seed Audits] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
