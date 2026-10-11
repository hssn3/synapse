/**
 * Migration + Seed: نشان‌ها و گواهینامه‌ها — punch-list در docs/hassan_ANALYSIS.md
 * ساخت جدول certifications و افزودن مجوزهای manage_certifications / view_certifications.
 *
 * وضعیت (active/expired/pending_renewal) ذخیره می‌شود اما «نزدیکی به انقضا» در زمان خواندن
 * از expiry_date محاسبه می‌شود تا بدون job زمان‌بندی‌شده هم همیشه درست باشد (چراغ راهنما در UI).
 * Run: npm run seed-certifications — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS certifications (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    issuing_body TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    file_path TEXT,
    file_name TEXT,
    section_id TEXT,
    status TEXT DEFAULT 'active',
    note TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cert_hospital ON certifications(hospital_id, status, expiry_date)`,
];

const ROLE_PERMS = {
  admin: ['manage_certifications', 'view_certifications'],
  quality_control_manager: ['manage_certifications', 'view_certifications'],
  nursing_director: ['view_certifications'],
  clinical_supervisor: ['view_certifications'],
  education_supervisor: ['view_certifications'],
  infection_control_supervisor: ['view_certifications'],
};

function runMigration() {
  console.log('[Seed Certifications] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Certifications');
    console.log('[Seed Certifications] ✅ certifications ready');
  } catch (err) {
    console.error('[Seed Certifications] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
