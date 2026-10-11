/**
 * مدیریت خطر حوادث و بلایا — محور الف-۲
 * ---------------------------------------------------------------------
 * مثل دو ماژول قبل، از روی متنِ خودِ ۲۵ سنجه‌ی این محور ساخته شد. چهار چرخه‌ی
 * مستقل در آن متن دیده می‌شود و هر کدام یک جدول شد:
 *
 *  1) disaster_safety_assessments — الف-۲-۱-۲: «ارزیابی سالیانه ایمنی بیمارستان
 *     در سه حیطه ایمنی عملکردی، سازه‌ای و غیرسازه‌ای … ثبت نتایج ارزیابی و
 *     امتیازات آن و تعیین نمره نهایی شاخص ایمنی بیمارستان (HSI)». پس سه نمره‌ی
 *     جدا + نمره‌ی نهایی، و نه یک عددِ کلی. سالِ شمسی ستون است چون سنجه صریح
 *     «سالیانه» گفته و ممیز پیوستگیِ سال‌به‌سال را می‌خواهد.
 *
 *  2) disaster_hazards — الف-۲-۱-۳: «ارزیابی عوامل خطرآفرین … تعیین اثرات
 *     احتمالی … برآورد خطر … تعیین اولویت‌های برنامه‌ای کاهش خطرات … برنامه‌ریزی
 *     و اجرای برنامه‌های کاهش خطر بعد از تعیین پنج مخاطره». برآوردِ خطر عمداً
 *     دو عاملِ احتمال و شدت است و امتیازش در سرور ضرب می‌شود، نه یک عددِ دستی —
 *     چون همان دو عدد است که در کمیته قابل دفاع است.
 *
 *  3) disaster_drills — الف-۲-۴-۴ («تمرین‌های شبیه‌سازی‌شده با تدوین سناریو») و
 *     الف-۲-۵-۲ («تحلیل عملکرد بیمارستان پس از انجام تمرین‌ها … و اقدامات
 *     اصلاحی»). این دو یک رکوردند نه دو تا: تمرینی که تحلیلِ پس از آن ثبت نشده،
 *     در ممیزی همان حلقه‌ی بازِ معروف است.
 *
 *  4) disaster_incidents — الف-۲-۲-۶: «حوادث در بیمارستان گزارش، بررسی، تحلیل
 *     شده و اقدامات اصلاحی/ برنامه بهبود مؤثر طراحی و اجرا می‌شود». عمداً در
 *     ماژول «گزارش خطای پزشکی» ادغام نشد: آن‌جا خطای بالینیِ مرتبط با بیمار است
 *     و این‌جا حادثه‌ی تأسیساتی/ایمنی (آتش، قطع برق، نشت، سقوط، حادثه‌ی امنیتی).
 *
 * چیزی که ساخته نشد و دلیلش: بندهای «کالبدی» این محور — پله فرار (الف-۲-۲-۳)،
 * آسانسور (الف-۲-۲-۴)، برق و آب و بخار و تهویه (الف-۲-۳-*) — همه از جنسِ «قلمِ
 * دارای بازرسی و نگهداشت دوره‌ای»اند و ماژول facility_assets دقیقاً همان است.
 * دوباره‌سازی نشد؛ بیمارستان همان‌جا قلم را با دسته‌ی «تأسیسات» یا «ایمنی و
 * آتش‌نشانی» ثبت می‌کند و برنامه‌ی دوره‌ای می‌گذارد.
 *
 * Run: خودکار روی هر boot. idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS disaster_safety_assessments (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    jalali_year INTEGER NOT NULL,
    assessed_date TEXT,
    structural_score REAL,
    nonstructural_score REAL,
    functional_score REAL,
    total_score REAL,
    safety_level TEXT,
    team_members TEXT,
    findings TEXT,
    action_plan TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dsa_h ON disaster_safety_assessments(hospital_id, jalali_year)`,

  `CREATE TABLE IF NOT EXISTS disaster_hazards (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'طبیعی',
    likelihood INTEGER NOT NULL DEFAULT 3,
    severity INTEGER NOT NULL DEFAULT 3,
    risk_score INTEGER,
    is_priority INTEGER NOT NULL DEFAULT 0,
    expected_impact TEXT,
    mitigation_plan TEXT,
    responsible TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    committee_ref TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dhz_h ON disaster_hazards(hospital_id, is_priority, risk_score)`,

  `CREATE TABLE IF NOT EXISTS disaster_drills (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    drill_type TEXT NOT NULL DEFAULT 'مانور عملیاتی',
    hazard_ref TEXT,
    drill_date TEXT NOT NULL,
    scenario TEXT NOT NULL,
    participants TEXT,
    participant_count INTEGER,
    duration_min INTEGER,
    observers TEXT,
    performance_analysis TEXT,
    weaknesses TEXT,
    corrective_action TEXT,
    status TEXT NOT NULL DEFAULT 'done',
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ddr_h ON disaster_drills(hospital_id, drill_date)`,

  `CREATE TABLE IF NOT EXISTS disaster_incidents (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    incident_date TEXT NOT NULL,
    incident_type TEXT NOT NULL DEFAULT 'سایر',
    location TEXT,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'جزئی',
    injuries INTEGER,
    damage_estimate TEXT,
    immediate_response TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    reported_by TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_din_h ON disaster_incidents(hospital_id, status, incident_date)`,
];

const ROLE_PERMS = {
  admin: ['manage_disaster', 'view_disaster'],
  quality_control_manager: ['manage_disaster', 'view_disaster'],
  nursing_director: ['view_disaster'],
  clinical_supervisor: ['view_disaster'],
  infection_control_supervisor: ['view_disaster'],
};

function runMigration() {
  for (const sql of TABLES) db.exec(sql);
  grantPerms(ROLE_PERMS, 'Seed DisasterSafety');
  console.log('[Seed DisasterSafety] ✅ safety assessments / hazards / drills / incidents ready');
}

module.exports = { runMigration };
