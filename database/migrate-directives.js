/**
 * migrate-directives.js
 * ---------------------------------------------------------------------------
 * «ابلاغیه و دستور»: مدیر برای زیرمجموعه‌ها ابلاغیه/دستور صادر می‌کند و
 * جوابیه (تأیید دریافت) می‌گیرد.
 *
 * چرا جدا از notifications/tasks:
 *   notifications اعلانِ یک‌طرفه است و مخاطب ندارد؛ tasks وظیفه با وضعیت است.
 *   اینجا دو چیز تازه لازم است: «مخاطبانِ سمت‌محور» و «رسید دریافت/جوابیه».
 *
 * idempotent: CREATE TABLE IF NOT EXISTS + ALTER TABLE برای ستون‌های تازه.
 */
const { db } = require('../src/config/database-sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS directives (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    kind TEXT NOT NULL DEFAULT 'announcement',
    priority TEXT NOT NULL DEFAULT 'normal',
    requires_ack INTEGER NOT NULL DEFAULT 1,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS directive_recipients (
    id TEXT PRIMARY KEY,
    directive_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at TEXT,
    acknowledged_at TEXT,
    ack_note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_directives_hospital ON directives(hospital_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dirrec_user ON directive_recipients(user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_dirrec_directive ON directive_recipients(directive_id);
`);

// ستون‌های ماندگارِ مخاطب (audience + audience_ref) — برای نصب‌های قدیمی‌تر
const cols = new Set(db.prepare('PRAGMA table_info(directives)').all().map(c => c.name));
const ensure = (name, ddl) => { if (!cols.has(name)) { db.exec(ddl); console.log('[directives] ستون افزوده شد:', name); } };
ensure('audience', "ALTER TABLE directives ADD COLUMN audience TEXT NOT NULL DEFAULT 'roles'");
ensure('audience_ref', "ALTER TABLE directives ADD COLUMN audience_ref TEXT NOT NULL DEFAULT '[]'");

// مجوز صدور ابلاغیه روی ستون permissions نقش‌ها (سبک موجودِ پروژه)
const ROLE_GRANTS = [
  'hospital_president', 'technical_officer', 'admin', 'nursing_director',
  'accreditation_manager', 'quality_control_manager', 'hr_manager', 'financial_manager',
  'accounting_manager', 'clinical_supervisor', 'education_supervisor',
  'infection_control_supervisor', 'patient_safety_officer', 'it_manager',
  'medical_records_manager', 'logistics_manager', 'nutrition_manager',
  'occupational_health_officer', 'environmental_health_officer', 'social_worker',
  'medical_equipment_engineer', 'head_nurse', 'staff_nurse',
];
const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
const tx = db.transaction(() => {
  for (const code of ROLE_GRANTS) {
    const row = db.prepare('SELECT id, permissions FROM roles WHERE code = ?').get(code);
    if (!row) continue;
    let perms = [];
    try { perms = JSON.parse(row.permissions || '[]'); } catch (e) { perms = []; }
    if (!Array.isArray(perms)) perms = [];
    if (!perms.includes('manage_directives')) perms.push('manage_directives');
    upd.run(JSON.stringify(perms), row.id);
  }
});
tx();

console.log('[directives] جدول‌ها آماده‌اند.');
console.log('[directives] نقش‌های دارای manage_directives:',
  db.prepare(`SELECT COUNT(*) c FROM roles WHERE permissions LIKE '%manage_directives%'`).get().c);
console.log('[directives] ابلاغیه‌ها:', db.prepare('SELECT COUNT(*) c FROM directives').get().c,
  '| مخاطبان:', db.prepare('SELECT COUNT(*) c FROM directive_recipients').get().c);
