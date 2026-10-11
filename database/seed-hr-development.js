/**
 * ارزیابی و توسعه‌ی کارکنان — الف‑۳‑۱، الف‑۳‑۲‑۳، الف‑۳‑۳، الف‑۳‑۴‑۲ و الف‑۴‑۱‑۱/۲/۳
 * ---------------------------------------------------------------------
 * دوازده سنجه که در جدولِ پوششِ ROADMAP زیر برچسبِ «الف‑۳ → آموزش ✔» پنهان
 * شده بودند، در حالی که آموزش فقط شش سنجه از سی سنجه‌ی آن محور است
 * (شرحِ کشف: docs/ANALYSIS-V3-MANAGEMENT.md).
 *
 * هفت جدول، از روی هفت چرخه‌ی مستقل در متنِ همان دوازده سنجه:
 *
 *  ۱) hr_job_profiles — الف‑۳‑۱‑۱/۲: «بکارگیری کارکنان بر اساس … شرح شغل و
 *     شرایط احراز» و «توانمندی‌های عمومی و اختصاصی برای هریک از مشاغل تعیین
 *     شده است». پس شرحِ شغل یک *سند مرجع* است که استخدام به آن ارجاع می‌دهد،
 *     نه یک متنِ آزاد در پرونده‌ی هر نفر — یک ردیف به‌ازای هر شغل، نه هر نفر.
 *
 *  ۲) hr_hiring_checks — الف‑۳‑۱‑۱/۳: احرازِ شرایط در *لحظه‌ی بکارگیری*.
 *     ستون job_profile_id آن را به شرحِ شغل گره می‌زند، وگرنه «بر اساسِ شرایطِ
 *     احراز» قابلِ اثبات نیست. مهارتِ ارتباطی (الف‑۳‑۱‑۳) ستونِ جدا دارد چون
 *     سنجه‌ی مستقلی است و «پیش از بکارگیری» را صریح گفته.
 *
 *  ۳) hr_competencies + hr_competency_records — الف‑۴‑۱‑۱/۲/۳ و الف‑۳‑۳‑۳:
 *     «حداقل مهارت‌های عمومی بالینی / تخصصی / ارتباطی … ارزیابی و احراز
 *     می‌شوند». دو جدول لازم است نه یکی: فهرستِ مهارت‌ها مالِ سازمان است و
 *     احرازِ هر نفر مالِ خودش. با یک جدول، افزودنِ یک مهارتِ تازه یعنی دست‌کاریِ
 *     رکوردِ همه‌ی پرسنل. تاریخِ انقضا ستون دارد چون احرازِ پنج‌سال‌پیش،
 *     احراز نیست.
 *
 *  ۴) hr_appraisals — الف‑۳‑۳‑۲/۳: «نتایج ارزشیابی سالیانه … در طراحی برنامه
 *     آموزشی و ارتقا شغلی استفاده می‌شوند». پس دو ستونِ خروجی دارد
 *     (training_outcome و promotion_outcome)، وگرنه ارزشیابی یک نمره‌ی بی‌مصرف
 *     است و بندِ دومِ سنجه بی‌جواب می‌ماند.
 *
 *  ۵) hr_disciplinary — الف‑۳‑۳‑۱: «کنترل‌های انضباطی بر اساس ارزیابی مستمر …
 *     با رعایت قوانین». ستونِ based_on_appraisal_id همان «بر اساس ارزیابی» را
 *     اثبات می‌کند؛ اقدامِ انضباطیِ بی‌ارجاع در ممیزی دفاع‌ناپذیر است.
 *
 *  ۶) hr_exemplary — الف‑۳‑۳‑۴: «کارکنان نمونه بر اساس عوامل کلیدیِ معین …
 *     شناسایی و تشویق». پس هم معیار ستون دارد هم نوعِ تشویق.
 *
 *  ۷) hr_succession — الف‑۳‑۲‑۳: «جانشین پروری و انتقال تجربیات … برنامه‌ریزی».
 *     یک ردیف به‌ازای هر سمتِ کلیدی با جانشینِ اول و دوم و وضعیتِ آمادگی.
 *
 *  ۸) hr_leave_register — الف‑۳‑۴‑۲: «اطلاعات مربوط به مرخصی و سوابق حوادث
 *     شغلی … به تفکیک بخش‌ها، **در واحد منابع انسانی** نگهداری می‌شوند».
 *     nursing_leave_requests فقط پرستاری است و مالِ سرپرستار؛ این دفترِ
 *     سراسریِ منابع انسانی است. سوابقِ حوادث شغلی همان occ_incidents است و
 *     این‌جا دوباره‌سازی نشد.
 *
 * Run: node database/seed-hr-development.js (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS hr_job_profiles (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    job_group TEXT,
    unit TEXT,
    summary TEXT,
    duties TEXT,
    education_required TEXT,
    experience_required TEXT,
    license_required TEXT,
    general_competencies TEXT,
    specific_competencies TEXT,
    doc_code TEXT,
    approved_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hjp_h ON hr_job_profiles(hospital_id, is_active, title)`,

  `CREATE TABLE IF NOT EXISTS hr_hiring_checks (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    personnel_code TEXT,
    job_profile_id TEXT REFERENCES hr_job_profiles(id) ON DELETE SET NULL,
    unit TEXT,
    hire_date TEXT,
    education_ok INTEGER DEFAULT 0,
    experience_ok INTEGER DEFAULT 0,
    license_ok INTEGER DEFAULT 0,
    communication_skill_ok INTEGER DEFAULT 0,
    orientation_done INTEGER DEFAULT 0,
    verdict TEXT NOT NULL DEFAULT 'در_بررسی',
    checked_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hhc_h ON hr_hiring_checks(hospital_id, verdict, hire_date)`,

  `CREATE TABLE IF NOT EXISTS hr_competencies (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'عمومی بالینی',
    job_group TEXT,
    unit TEXT,
    method TEXT,
    valid_months INTEGER DEFAULT 12,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hcp_h ON hr_competencies(hospital_id, kind, is_active)`,

  `CREATE TABLE IF NOT EXISTS hr_competency_records (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    competency_id TEXT REFERENCES hr_competencies(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    personnel_code TEXT,
    unit TEXT,
    assessed_date TEXT,
    expires_on TEXT,
    result TEXT NOT NULL DEFAULT 'احراز شد',
    assessor TEXT,
    gap_action TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hcr_h ON hr_competency_records(hospital_id, expires_on)`,

  `CREATE TABLE IF NOT EXISTS hr_appraisals (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    personnel_code TEXT,
    unit TEXT,
    jalali_year INTEGER,
    appraised_date TEXT,
    appraiser TEXT,
    score REAL,
    grade TEXT,
    strengths TEXT,
    improvement_areas TEXT,
    training_outcome TEXT,
    promotion_outcome TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hap_h ON hr_appraisals(hospital_id, jalali_year)`,

  `CREATE TABLE IF NOT EXISTS hr_disciplinary (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    personnel_code TEXT,
    unit TEXT,
    action_date TEXT,
    reason TEXT,
    based_on_appraisal_id TEXT REFERENCES hr_appraisals(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL DEFAULT 'تذکر شفاهی',
    legal_reference TEXT,
    person_notified INTEGER DEFAULT 0,
    follow_up TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hds_h ON hr_disciplinary(hospital_id, action_date)`,

  `CREATE TABLE IF NOT EXISTS hr_exemplary (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    personnel_code TEXT,
    unit TEXT,
    period TEXT,
    selected_date TEXT,
    criteria TEXT,
    achievement TEXT,
    reward_type TEXT,
    announced INTEGER DEFAULT 0,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hex_h ON hr_exemplary(hospital_id, selected_date)`,

  `CREATE TABLE IF NOT EXISTS hr_succession (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    position_title TEXT NOT NULL,
    incumbent TEXT,
    successor1 TEXT,
    successor2 TEXT,
    readiness TEXT NOT NULL DEFAULT 'در حال آماده‌سازی',
    development_plan TEXT,
    knowledge_transfer TEXT,
    target_date TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hsc_h ON hr_succession(hospital_id, readiness)`,

  `CREATE TABLE IF NOT EXISTS hr_leave_register (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    personnel_code TEXT,
    unit TEXT,
    leave_type TEXT NOT NULL DEFAULT 'استحقاقی',
    start_date TEXT,
    end_date TEXT,
    days INTEGER,
    approved_by TEXT,
    replacement TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hlr_h ON hr_leave_register(hospital_id, unit, start_date)`,
];

/* ⚠ hr_manager و hospital_president و accreditation_manager را این‌جا نگذارید:
   database/seed-management-roles.js در بوت بعد از این فایل اجرا می‌شود و ستونِ
   permissions نقش‌های خودش را کامل بازنویسی می‌کند. مجوزِ آن نقش‌ها در همان
   فهرستِ متمرکز نشسته است. (این تله یک‌بار در ماژول سلامت حرفه‌ای خورده شد.) */
const ROLE_PERMS = {
  admin: ['manage_hrdev', 'view_hrdev'],
  quality_control_manager: ['view_hrdev'],
  nursing_director: ['manage_hrdev', 'view_hrdev'],
  education_supervisor: ['view_hrdev'],
};

function runMigration() {
  console.log('[Seed HRDev] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed HRDev');
    console.log('[Seed HRDev] ✅ job_profiles / hiring_checks / competencies(+records) / appraisals / disciplinary / exemplary / succession / leave_register ready');
  } catch (err) {
    console.error('[Seed HRDev] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
