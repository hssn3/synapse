/**
 * migrate-directives-v2.js
 * ---------------------------------------------------------------------------
 * نسخه‌ی اولِ مهاجرت جدول را با ستون‌های کمی متفاوت ساخت و چون از
 * CREATE TABLE IF NOT EXISTS استفاده شد، اجرای دوباره چیزی را اصلاح نکرد.
 * این نسخه وضعیت فعلی را بررسی می‌کند و ستون‌های گم‌شده را اضافه می‌کند
 * (SQLite: ALTER TABLE ADD COLUMN) تا داده‌ی موجود هم از بین نرود.
 *
 * قرارداد نهاییِ جدول directives:
 *   category  -> 'directive' | 'announcement' | 'memo'  (جایگزین kind)
 *   priority  -> 'normal' | 'urgent'
 *   audience_ref  -> JSON array از role_code یا user_id
 *   requires_ack -> 0/1
 */
const { db } = require('../src/config/database-sqlite');

function columns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS directives (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    category TEXT NOT NULL DEFAULT 'directive',
    priority TEXT NOT NULL DEFAULT 'normal',
    audience TEXT NOT NULL DEFAULT 'roles',
    audience_ref TEXT NOT NULL DEFAULT '[]',
    deadline TEXT,
    requires_ack INTEGER NOT NULL DEFAULT 1,
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
  CREATE INDEX IF NOT EXISTS idx_directives_hospital ON directives(hospital_id);
  CREATE INDEX IF NOT EXISTS idx_dirrec_user ON directive_recipients(user_id);
  CREATE INDEX IF NOT EXISTS idx_dirrec_directive ON directive_recipients(directive_id);
`);

const dirCols = columns('directives');
const recCols = columns('directive_recipients');
const added = [];

// ستون‌هایی که نسخه‌ی اول نداشت
if (!dirCols.includes('category')) { db.exec(`ALTER TABLE directives ADD COLUMN category TEXT NOT NULL DEFAULT 'directive'`); added.push('directives.category'); }
if (!dirCols.includes('priority')) { db.exec(`ALTER TABLE directives ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'`); added.push('directives.priority'); }
if (!dirCols.includes('audience')) { db.exec(`ALTER TABLE directives ADD COLUMN audience TEXT NOT NULL DEFAULT 'roles'`); added.push('directives.audience'); }
if (!dirCols.includes('audience_ref')) { db.exec(`ALTER TABLE directives ADD COLUMN audience_ref TEXT NOT NULL DEFAULT '[]'`); added.push('directives.audience_ref'); }
if (!dirCols.includes('deadline')) { db.exec(`ALTER TABLE directives ADD COLUMN deadline TEXT`); added.push('directives.deadline'); }
if (!dirCols.includes('requires_ack')) { db.exec(`ALTER TABLE directives ADD COLUMN requires_ack INTEGER NOT NULL DEFAULT 1`); added.push('directives.requires_ack'); }
if (!dirCols.includes('updated_at')) { db.exec(`ALTER TABLE directives ADD COLUMN updated_at TEXT`); added.push('directives.updated_at'); }

// ستون kind از نسخه‌ی اول: مقادیر را به category منتقل و حذف کنیم
if (dirCols.includes('kind')) {
  db.exec(`UPDATE directives SET category = kind WHERE kind IN ('directive','announcement','memo') AND category = 'directive'`);
  added.push('directives.kind→category (migrated)');
}
// ستون due_date از نسخه‌ی اول → deadline
if (dirCols.includes('due_date')) {
  db.exec(`UPDATE directives SET deadline = due_date WHERE (deadline IS NULL OR deadline = '') AND due_date IS NOT NULL`);
  added.push('directives.due_date→deadline (migrated)');
}
if (!recCols.includes('created_at')) { db.exec(`ALTER TABLE directive_recipients ADD COLUMN created_at TEXT`); added.push('recipients.created_at'); }

// سطوح دسترسی: مجوز صدور برای نقش‌های مدیریتی
const crypto = require('crypto');
const permId = crypto.randomUUID();
db.prepare(`INSERT OR IGNORE INTO permissions (id, key, domain, resource, action, title_fa)
  VALUES (?, 'manage_directives', 'collaboration', 'directives', 'manage', 'صدور ابلاغیه و دستور')`).run(permId);

const MANAGERIAL = ['admin', 'hospital_president', 'nursing_director', 'technical_officer',
  'accreditation_manager', 'quality_control_manager', 'hr_manager', 'financial_manager',
  'accounting_manager', 'clinical_supervisor', 'education_supervisor',
  'infection_control_supervisor', 'patient_safety_officer', 'it_manager',
  'medical_records_manager', 'nutrition_manager', 'medical_equipment_engineer',
  'occupational_health_officer', 'environmental_health_officer', 'social_worker', 'logistics_manager'];

const upd = db.prepare('UPDATE roles SET permissions = ? WHERE code = ?');
const tx = db.transaction(() => {
  for (const code of MANAGERIAL) {
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

console.log('[directives v2] ستون‌های اضافه/مهاجرت‌شده:', added.length ? added.join(', ') : 'هیچ (از قبل کامل بود)');
console.log('[directives v2] ستون‌های نهایی directives:', columns('directives').join(', '));
console.log('[directives v2] نقش‌های دارای مجوز:',
  db.prepare(`SELECT COUNT(*) c FROM roles WHERE permissions LIKE '%manage_directives%'`).get().c);
console.log('[directives v2] ابلاغیه‌های موجود:', db.prepare('SELECT COUNT(*) c FROM directives').get().c,
  '| گیرنده‌ها:', db.prepare('SELECT COUNT(*) c FROM directive_recipients').get().c);
