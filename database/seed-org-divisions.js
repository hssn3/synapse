/**
 * Migration + Seed: سه حوزه‌ی کلان سازمانی — مدیریت / پرستاری / پشتیبانی
 * لایه‌ی اول ساختار سازمانی تازه (فراتر از اعتباربخشی): هر بیمارستان دقیقاً سه ردیف
 * ثابت دارد (management/nursing/support) و هرکدام می‌تواند یک «مسئول/رئیس حوزه» داشته باشد.
 *
 * چرا جدول جدا و نه توسعه‌ی org_units؟ org_units واحدهای عملیاتی (بخش/اتاق/آزمایشگاه) را
 * مدل می‌کند و parent_id بین خودشان سلسله‌مراتب می‌سازد؛ این سه حوزه یک لایه‌ی بالاتر و
 * مفهوماً متفاوت‌اند (حوزه‌ی مدیریتی، نه واحد فیزیکی) و تعدادشان همیشه دقیقاً ۳ است.
 * جدول جدا و کوچک، بدون دست‌زدن به org_units، خطر رگرسیون روی آن ماژول را صفر می‌کند.
 *
 * آماده برای آینده: زیرساختارهای هر حوزه (سوپروایزر پرستاری، بخش‌ها، …) در فاز بعدی به این
 * جدول با ستونی مثل parent_division_id ارجاع خواهند داد — آن فاز اینجا ساخته نمی‌شود،
 * فقط جا برایش باز است.
 *
 * Run: npm run seed-org-divisions (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');
const crypto = require('crypto');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS org_divisions (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    head_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orgdivision_uniq ON org_divisions(hospital_id, code)`,
];

const ROLE_PERMS = {
  admin: ['manage_org_divisions'],
};

// سه حوزه‌ی ثابت — کد هرگز از ورودی کاربر نمی‌آید
const DIVISIONS = [
  { code: 'management', title: 'مدیریت' },
  { code: 'nursing', title: 'پرستاری' },
  { code: 'support', title: 'پشتیبانی' },
];

const uid = () => crypto.randomUUID();

// پیش‌فرضِ منطقی برای رئیسِ هر حوزه — فقط وقتی که دقیقاً یک کاربر فعال با آن نقش هست
// (اگر صفر یا چند نفر باشند، بدون سرپرست می‌ماند؛ چیزی جعل نمی‌شود)
function defaultHeadFor(hospitalId, roleCode) {
  const rows = db.prepare(
    `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.hospital_id = ? AND u.is_active = 1 AND r.code = ?`
  ).all(hospitalId, roleCode);
  return rows.length === 1 ? rows[0].id : null;
}

function seedHospital(h) {
  let n = 0;
  const getD = db.prepare('SELECT id FROM org_divisions WHERE hospital_id = ? AND code = ?');
  const insD = db.prepare('INSERT INTO org_divisions (id, hospital_id, code, title, head_user_id) VALUES (?, ?, ?, ?, ?)');
  for (const d of DIVISIONS) {
    if (getD.get(h, d.code)) continue;
    let head = null;
    if (d.code === 'management') head = defaultHeadFor(h, 'admin');
    else if (d.code === 'nursing') head = defaultHeadFor(h, 'nursing_director');
    // 'support' has no dedicated role in ROLE_DEFINITIONS today — left unassigned deliberately
    insD.run(uid(), h, d.code, d.title, head);
    n++;
  }
  return n;
}

function runMigration() {
  console.log('[Seed OrgDivisions] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    let total = 0;
    db.transaction(() => { for (const h of hospitals) total += seedHospital(h.id); })();
    console.log(`[Seed OrgDivisions] ${total} division row(s) inserted across ${hospitals.length} hospital(s)`);
    grantPerms(ROLE_PERMS, 'Seed OrgDivisions');
    console.log('[Seed OrgDivisions] ✅ org_divisions ready');
  } catch (err) {
    console.error('[Seed OrgDivisions] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
