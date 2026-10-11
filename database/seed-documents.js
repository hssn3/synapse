/**
 * Migration + Seed: مدارک کنترل‌شده (خط‌مشی / روش اجرایی / دستورالعمل)
 * ساخت جداول controlled_documents / document_signoffs / document_versions
 * و افزودن مجوزهای manage_documents و view_documents به نقش‌های مربوطه.
 * (بر اساس تحلیل سامانه طراحی اولیه حسن - docs/hassan_ANALYSIS.md بخش ۳.۴ و ۱۱)
 * Run: npm run seed-documents
 * idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS controlled_documents (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL DEFAULT 'procedure',
    title TEXT NOT NULL,
    doc_code TEXT,
    decree_text TEXT,
    issue_date TEXT,
    last_review_date TEXT,
    prepared_date TEXT,
    purpose TEXT,
    scope TEXT,
    legal_references TEXT,
    definitions TEXT,
    resources TEXT,
    related_staff TEXT,
    responsible_person TEXT,
    monitoring_method TEXT,
    work_method TEXT,
    related_documents TEXT,
    distribution_list TEXT DEFAULT '[]',
    attachment_file TEXT,
    attachment_name TEXT,
    status TEXT DEFAULT 'draft',
    version_no INTEGER DEFAULT 1,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS document_signoffs (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES controlled_documents(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    position TEXT,
    signoff_role TEXT NOT NULL DEFAULT 'preparer',
    user_id TEXT REFERENCES users(id),
    signed_at TEXT,
    signed_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES controlled_documents(id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    change_note TEXT,
    changed_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cdoc_hospital ON controlled_documents(hospital_id, doc_type)`,
  `CREATE INDEX IF NOT EXISTS idx_dsignoff_doc ON document_signoffs(document_id)`,
  `CREATE INDEX IF NOT EXISTS idx_dversion_doc ON document_versions(document_id, version_no)`,
];

// مجوزهای جدید به تفکیک نقش — همان الگوی manage_committees/view_committee_minutes
const ROLE_PERMS = {
  admin: ['manage_documents', 'view_documents'],
  quality_control_manager: ['manage_documents', 'view_documents'],
  nursing_director: ['manage_documents', 'view_documents'],
  infection_control_supervisor: ['view_documents'],
  clinical_supervisor: ['view_documents'],
  education_supervisor: ['view_documents'],
  staff_nurse: ['view_documents'],
};

function runMigration() {
  console.log('[Seed Documents] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);

    const roles = db.prepare('SELECT id, code, permissions FROM roles').all();
    const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
    let changed = 0;
    const tx = db.transaction(() => {
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
    tx();

    console.log(`[Seed Documents] ✅ tables ready, ${changed} role(s) granted document permissions`);
  } catch (err) {
    console.error('[Seed Documents] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
