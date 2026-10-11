/**
 * سلامت حرفه‌ای و بهداشت کار — استانداردهای الف‑۳‑۵، الف‑۳‑۶ و الف‑۳‑۷
 * ---------------------------------------------------------------------
 * چرا این ماژول: نقشِ `occupational_health_officer` (مسئول بهداشت حرفه‌ای) از
 * قبل در جدول roles تعریف شده بود و در src/config/role-axes.js محورِ الف‑۳ را
 * هم گرفته بود — ولی جست‌وجوی «عوامل زیان‌آور»، «حوادث شغلی» و «طب کار» در کلِ
 * src/ و public/js/ هیچ نتیجه‌ای نداشت. یعنی این سمت وارد سامانه می‌شد و هیچ
 * کاری برایش نبود. ده سنجه‌ی زیر بی‌ابزار مانده بودند
 * (شرحِ کشف: docs/ANALYSIS-V3-MANAGEMENT.md).
 *
 * چهار چرخه‌ی مستقل در متنِ آن ده سنجه دیده می‌شود و هر کدام یک جدول شد:
 *
 *  ۱) occ_hazards — الف‑۳‑۵‑۲ تا الف‑۳‑۵‑۵: «عوامل زیان‌آور شیمیایی / فیزیکی /
 *     بیولوژیکی / ارگونومیک محیط کار شناسایی و مدیریت می‌شوند». چهار سنجه با یک
 *     ساختار و فقط یک نوعِ متفاوت، پس یک جدول با ستونِ kind — نه چهار جدولِ
 *     همسان که با اولین ستونِ تازه از هم واگرا شوند.
 *     «شناسایی» یعنی شناسنامه (کجا، چه، چه کسانی در معرض‌اند، حدِ مجاز چقدر
 *     است)، و «مدیریت» یعنی اقدامِ کنترلی. هر دو ستون دارند.
 *
 *  ۲) occ_measurements — همان چهار سنجه، بندِ دومشان: شناسایی بدونِ اندازه‌گیریِ
 *     دوره‌ای مدرک نیست. هر اندازه‌گیری به یک عاملِ زیان‌آور گره می‌خورد و
 *     «داخل/خارجِ حدِ مجاز» در سرور از مقایسه‌ی مقدار با حدِ مجازِ همان عامل حساب
 *     می‌شود، نه از تیکِ دستی — وگرنه دو ستون می‌توانستند همدیگر را نقض کنند.
 *
 *  ۳) occ_incidents — الف‑۳‑۶‑۲ «حوادث شغلی کارکنان … کنترل و مدیریت می‌شوند» و
 *     الف‑۳‑۶‑۳ «پیش‌گیری از وقوع حوادث و **شبه‌حوادث** شغلی». شبه‌حادثه صراحتاً
 *     در متنِ سنجه آمده، پس ستونِ kind دو حالت دارد و شبه‌حادثه یک ردیفِ درجه‌دو
 *     نیست. چرخه‌ی علت‌کاوی و اقدام اصلاحی هم ستون دارد، چون «مدیریت می‌شوند»
 *     یعنی بسته‌شدنِ حلقه، نه صرفِ ثبت.
 *
 *  ۴) occ_exams — الف‑۳‑۷‑۱ «شناسایی و ارزیابی گروه‌های شغلیِ در معرضِ بیماری‌های
 *     شغلی» و الف‑۳‑۷‑۲ «بیماری‌های شغلی شناسایی‌شده … مدیریت می‌شوند». معاینه
 *     چرخه‌ای است (بدو استخدام → دوره‌ای → بازگشت به کار → خاتمه‌ی کار)، پس
 *     next_due ستون دارد تا معاینه‌ی سررسیدشده قابل شمردن باشد — همان چیزی که
 *     ارزیاب می‌پرسد و در «کار من» سیگنال می‌شود.
 *
 * الف‑۳‑۵‑۱ (وسایل حفاظت فردی) عمداً جدولِ جدا نگرفت: در متنِ سنجه، PPE یک
 * *اقدامِ کنترلی* برای همان عوامل زیان‌آور است، نه یک موجودیتِ مستقل. پس ستونِ
 * ppe_required روی occ_hazards نشست. اگر بعداً کارفرما توزیع و تحویلِ نفر‌به‌نفر
 * خواست، آن‌وقت جدولِ جدا معنا پیدا می‌کند.
 *
 * Run: node database/seed-occupational-health.js (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const HAZARD_KINDS = ['شیمیایی', 'فیزیکی', 'بیولوژیکی', 'ارگونومیک'];
const EXAM_TYPES = ['بدو استخدام', 'دوره‌ای', 'بازگشت به کار', 'خاتمه‌ی کار'];
const EXAM_RESULTS = ['سالم', 'نیازمند پیگیری', 'محدودیت شغلی', 'بیماری شغلی'];
const INCIDENT_KINDS = ['حادثه', 'شبه‌حادثه'];
const INCIDENT_CATEGORIES = ['فرورفتن سوزن/جسم تیز', 'تماس با خون و ترشحات', 'مواجهه با ماده‌ی شیمیایی',
  'سقوط و لغزش', 'برق‌گرفتگی', 'سوختگی', 'آسیب ناشی از جابه‌جایی بیمار', 'خشونت محل کار', 'سایر'];
const STATUSES = ['open', 'investigated', 'closed'];

const TABLES = [
  `CREATE TABLE IF NOT EXISTS occ_hazards (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'شیمیایی',
    title TEXT NOT NULL,
    ward TEXT,
    source TEXT,
    exposed_groups TEXT,
    exposed_count INTEGER,
    limit_value REAL,
    limit_unit TEXT,
    control_measures TEXT,
    ppe_required TEXT,
    responsible TEXT,
    review_interval_months INTEGER DEFAULT 12,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ohz_h ON occ_hazards(hospital_id, kind, is_active)`,

  `CREATE TABLE IF NOT EXISTS occ_measurements (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    hazard_id TEXT REFERENCES occ_hazards(id) ON DELETE CASCADE,
    measured_date TEXT,
    value REAL,
    value_unit TEXT,
    method TEXT,
    lab_name TEXT,
    within_limit INTEGER,
    action_taken TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ohm_h ON occ_measurements(hospital_id, hazard_id, measured_date)`,

  `CREATE TABLE IF NOT EXISTS occ_incidents (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    incident_date TEXT,
    kind TEXT NOT NULL DEFAULT 'حادثه',
    category TEXT,
    ward TEXT,
    shift_code TEXT,
    person_name TEXT,
    job_title TEXT,
    description TEXT,
    injury TEXT,
    lost_work_days INTEGER,
    immediate_action TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    reported_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ohi_h ON occ_incidents(hospital_id, status, incident_date)`,

  `CREATE TABLE IF NOT EXISTS occ_exams (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    personnel_code TEXT,
    job_group TEXT,
    ward TEXT,
    exposure TEXT,
    exam_type TEXT NOT NULL DEFAULT 'دوره‌ای',
    exam_date TEXT,
    next_due TEXT,
    result TEXT,
    findings TEXT,
    restrictions TEXT,
    follow_up TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ohe_h ON occ_exams(hospital_id, next_due)`,
];

/* ⚠ فقط نقش‌هایی این‌جا می‌آیند که database/seed-management-roles.js مالکشان نیست.
   آن فایل در بوت *بعد از* این یکی اجرا می‌شود و ستونِ permissions نقش‌های خودش را
   کامل بازنویسی می‌کند — نه اینکه به آن اضافه کند. پس هر مجوزی که این‌جا به
   hospital_president / accreditation_manager / hr_manager /
   occupational_health_officer / environmental_health_officer داده شود، در همان
   بوت بی‌صدا پاک می‌شود. (اولین بار همین اتفاق افتاد: سید می‌گفت «۹ نقش مجوز
   گرفتند» ولی مسئول بهداشت حرفه‌ای پشتِ صفحه‌ی خودش ۴۰۳ می‌گرفت.)
   مجوزِ آن پنج نقش در همان فهرستِ متمرکزِ seed-management-roles.js نشسته است. */
const ROLE_PERMS = {
  admin: ['manage_occhealth', 'view_occhealth'],
  quality_control_manager: ['view_occhealth'],
  infection_control_supervisor: ['view_occhealth'],
  nursing_director: ['view_occhealth'],
};

function runMigration() {
  console.log('[Seed OccHealth] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed OccHealth');
    console.log('[Seed OccHealth] ✅ occ_hazards / occ_measurements / occ_incidents / occ_exams ready');
  } catch (err) {
    console.error('[Seed OccHealth] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration, HAZARD_KINDS, EXAM_TYPES, EXAM_RESULTS, INCIDENT_KINDS, INCIDENT_CATEGORIES, STATUSES };
