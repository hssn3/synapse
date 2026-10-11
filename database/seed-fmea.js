/**
 * Migration + Seed: ماژول FMEA — «عوامل تهدید کننده ایمنی بیمار»
 * جدول fmea_records با پنج ستون کلاسیک FMEA
 * (خطرات احتمالی / علل خطا / اثرات و تبعات / اقدامات کنترلی موجود / اقدامات پیشنهادی)
 * بر اساس docs/hassan_ANALYSIS.md بخش ۱.۱ و موجودیت FmeaRecord در بخش ۱۱.
 * FMEA تحلیل ریسکِ پیش‌نگر است و عمداً از medical_error_reports (گزارش رخداد) جداست.
 * Run: npm run seed-fmea — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS fmea_records (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    reporter_name TEXT,
    subject TEXT NOT NULL,
    reporting_department TEXT NOT NULL,
    related_hazard_area TEXT,
    hazard_type TEXT,
    failure_modes TEXT NOT NULL,
    root_causes TEXT NOT NULL,
    effects TEXT NOT NULL,
    existing_controls TEXT NOT NULL,
    recommended_actions TEXT,
    source TEXT DEFAULT 'internal',
    status TEXT DEFAULT 'new',
    created_by TEXT REFERENCES users(id),
    submitted_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fmea_hospital ON fmea_records(hospital_id, submitted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_fmea_status ON fmea_records(hospital_id, status)`,
];

// همان الگوی seed-checklists: مدیریت/بررسی محدود، ثبت گسترده
const ROLE_PERMS = {
  admin: ['manage_fmea', 'submit_fmea'],
  quality_control_manager: ['manage_fmea', 'submit_fmea'],
  nursing_director: ['manage_fmea', 'submit_fmea'],
  infection_control_supervisor: ['submit_fmea'],
  clinical_supervisor: ['submit_fmea'],
  education_supervisor: ['submit_fmea'],
  breastfeeding_specialist: ['submit_fmea'],
  staff_nurse: ['submit_fmea'],
};

function runMigration() {
  console.log('[Seed FMEA] Starting...');
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

    console.log(`[Seed FMEA] ✅ table ready, ${changed} role(s) granted FMEA permissions`);
  } catch (err) {
    console.error('[Seed FMEA] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
