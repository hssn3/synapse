/**
 * Migration + Seed: بانک چک‌لیست‌ها / ساخت چک‌لیست
 * ساخت جداول checklists / checklist_domains / checklist_items / checklist_submissions
 * و افزودن مجوزهای manage_checklists و submit_checklists به نقش‌های مربوطه.
 * (بر اساس تحلیل سامانه طراحی اولیه حسن - docs/hassan_ANALYSIS_V6.md بخش ۳ و hassan_ANALYSIS.md بخش ۱۱)
 * Run: npm run seed-checklists
 * idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS checklists (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    checklist_code TEXT,
    completion_type TEXT DEFAULT 'per_department',
    purpose TEXT,
    has_domains INTEGER DEFAULT 0,
    has_baseline INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 0,
    baseline_info TEXT,
    status TEXT DEFAULT 'draft',
    section_id TEXT,
    created_by TEXT REFERENCES users(id),
    updated_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS checklist_domains (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    domain_id TEXT REFERENCES checklist_domains(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_type TEXT NOT NULL DEFAULT 'likert5',
    weight REAL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // پاسخ‌ها مثل distribution_list در مدارک کنترل‌شده به‌صورت JSON نگهداری می‌شوند
  `CREATE TABLE IF NOT EXISTS checklist_submissions (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    reference TEXT,
    answers TEXT DEFAULT '[]',
    score REAL,
    max_score REAL,
    note TEXT,
    submitted_by TEXT REFERENCES users(id),
    submitted_at TEXT DEFAULT (datetime('now'))
  )`,

  // «مسئولین اندازه‌گیری» — همان الگوی process_notify_users (جدول واسط با کلید مرکب)
  `CREATE TABLE IF NOT EXISTS checklist_measurers (
    checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (checklist_id, user_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_chk_hospital ON checklists(hospital_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_chkmeas_user ON checklist_measurers(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chkdom_cl ON checklist_domains(checklist_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_chkitem_cl ON checklist_items(checklist_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_chksub_cl ON checklist_submissions(checklist_id, submitted_at)`,
];

// همان الگوی seed-documents: مدیریت تعریف چک‌لیست محدود، تکمیل چک‌لیست گسترده
const ROLE_PERMS = {
  admin: ['manage_checklists', 'submit_checklists'],
  quality_control_manager: ['manage_checklists', 'submit_checklists'],
  nursing_director: ['submit_checklists'],
  infection_control_supervisor: ['submit_checklists'],
  clinical_supervisor: ['submit_checklists'],
  education_supervisor: ['submit_checklists'],
  breastfeeding_specialist: ['submit_checklists'],
  staff_nurse: ['submit_checklists'],
};

// ستون‌هایی که بعداً اضافه شده‌اند (روی دیتابیس‌های موجود هم باید ساخته شوند)
const ADD_COLUMNS = [
  // سؤالِ حذف‌شده‌ای که پاسخ‌نامه دارد، به‌جای DELETE غیرفعال می‌شود تا تاریخچه نشکند
  { table: 'checklist_items', column: 'is_active', ddl: "ALTER TABLE checklist_items ADD COLUMN is_active INTEGER DEFAULT 1" },
  // تناوبِ پایش: چک‌لیست تا پیش از این یک فرمِ یک‌بارمصرف بود و هیچ‌جا ثبت نمی‌شد که
  // قرار است دوباره هم پر شود. کتاب اعتباربخشی در ۱۲۵ سنجه (۲۴٪) پایشِ دوره‌ای می‌خواهد —
  // مثلاً «بررسی روزانه ژنراتورها با چک لیست» (الف-۲-۳-۱). جزئیات در
  // src/services/checklist-cadence.js. مقدار پیش‌فرض ondemand است تا چک‌لیست‌های
  // موجود دقیقاً مثل قبل رفتار کنند و ناگهان «معوق» علامت نخورند.
  { table: 'checklists', column: 'cadence', ddl: "ALTER TABLE checklists ADD COLUMN cadence TEXT DEFAULT 'ondemand'" },
  // سند مادر و نسخه — الزامِ سنجه‌ی الف-۱-۴-۶ («سوابق و مستنداتِ مدیریت، تحت کنترل
  // بوده و قابل بازیابی است»). متن سنجه صریح است: «مستندات سطح پایین هرم شامل چک
  // لیست‌ها، فهرست‌ها، فرم‌ها … است. هیچ یک از مستندات سطح پایین نباید بدون سند سطح
  // بالا یا سند مادر، در سازمان استفاده شود.» یعنی از نگاه ارزیاب، چک‌لیستِ بدون سند
  // مادر و بدون کد اصلاً شاهد محسوب نمی‌شود.
  { table: 'checklists', column: 'parent_document_id', ddl: 'ALTER TABLE checklists ADD COLUMN parent_document_id TEXT REFERENCES controlled_documents(id)' },
  { table: 'checklists', column: 'version_no', ddl: 'ALTER TABLE checklists ADD COLUMN version_no INTEGER DEFAULT 1' },
];

function runMigration() {
  console.log('[Seed Checklists] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);

    for (const c of ADD_COLUMNS) {
      const cols = db.prepare(`PRAGMA table_info(${c.table})`).all().map(r => r.name);
      if (!cols.includes(c.column)) { db.exec(c.ddl); console.log(`[Seed Checklists] + ${c.table}.${c.column}`); }
    }

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

    console.log(`[Seed Checklists] ✅ tables ready, ${changed} role(s) granted checklist permissions`);
  } catch (err) {
    console.error('[Seed Checklists] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
