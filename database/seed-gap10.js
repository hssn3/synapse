/**
 * چهار سنجه‌ی پراکنده که میزبانِ موجود داشتند — الف‑۱‑۱‑۲، الف‑۱‑۹‑۴/۵/۷،
 * الف‑۳‑۴‑۴/۵
 * ---------------------------------------------------------------------
 * این‌ها ماژولِ تازه نگرفتند چون هرکدام یک تبِ کوچک در ماژولی هستند که همین
 * حالا وجود دارد. ساختنِ سه منوی تازه برای شش سنجه، همان شلوغیِ رابط است که
 * کارفرما یک‌بار نسخه‌ی ۱ را به‌خاطرش رد کرد.
 *
 *  ۱) fin_cost_management — الف‑۱‑۹‑۴ (خدمات گلوبال) و الف‑۱‑۹‑۵ (سهم هتلینگ
 *     از خدمات پرستاری). یک جدول با ستونِ kind، چون متنِ هر دو سنجه عملاً یکی
 *     است: «مدیریت هزینه‌ها … **در چارچوب ضوابط مربوط و رعایت اصول کیفیت و
 *     ایمنی بیمار**». همان قیدِ آخر است که این را از یک جدولِ حسابداری جدا
 *     می‌کند و ستونِ خودش را گرفت: کاهشِ هزینه‌ای که به کیفیت یا ایمنی زده
 *     باشد، در این سنجه امتیاز نیست، منفی است.
 *     میزبان: تبِ تازه در ماژولِ `finance` (هر دو زیرِ استاندارد الف‑۱‑۹‑اند).
 *
 *  ۲) service_disruptions — الف‑۱‑۹‑۷: «**هیچ موردی** از اختلال/تأخیر در روند
 *     ارائه خدمات به دلیل کمبود امکانات و منابع مشاهده نمی‌شود».
 *     سنجه‌ای که نبودنِ رکورد، خودش مدرکِ آن است — پس دفتر باید وجود داشته
 *     باشد تا «خالی بودنش» معنا پیدا کند. دفترِ نداشته را نمی‌شود خالی نشان داد.
 *     میزبان: تبِ تازه در `finance` (زیرِ همان استاندارد الف‑۱‑۹).
 *
 *  ۳) staff_surveys — الف‑۳‑۴‑۴ و الف‑۳‑۴‑۵.
 *     در متنِ سنجه واژه‌ی «رضایت» بر اثر خطای OCR «رعایت» تایپ شده؛ خودِ شرحِ
 *     سنجه بی‌ابهام نشانش می‌دهد («بالاترین مرتبه رضایتمندی، توصیه به دیگران
 *     است»). این‌جا نامِ درست به کار رفته و متنِ خودِ سنجه هم در
 *     seed-cleanup-mangled-text.js تعمیر شد.
 *     دو قیدِ صریحِ متن ستون گرفتند: «حداقل دو بار در سال» و «با فاصله شش ماه»
 *     — فاصله در سرور کنترل می‌شود، چون دو نظرسنجی در یک ماه، سنجه را برآورده
 *     نمی‌کند حتی اگر تعدادش دو تا باشد.
 *     الف‑۳‑۴‑۵ ستونِ جدا دارد (توصیه به دیگران) چون سنجه‌ی مستقلی است و
 *     متن می‌گوید «در ارزیابی‌های مستقلِ وزارت بهداشت امتیازدهی خواهد شد».
 *     میزبان: تبِ تازه در `hrdev`.
 *
 *  ۴) stakeholders — الف‑۱‑۱‑۲: «شناسایی و تحلیل ذینفعان انجام و سیاست‌های
 *     اصلی به ذینفعان **کلیدی** ابلاغ شده است».
 *     دو کارِ جدا در یک جمله: تحلیل، و ابلاغ به زیرمجموعه‌ی «کلیدی». پس
 *     is_key و policy_communicated دو ستونِ جدا هستند و ابلاغ فقط برای کلیدی‌ها
 *     اجباری است — اجباری‌کردنش برای همه، سنجه را سخت‌تر از متنش می‌کرد.
 *     میزبان: تبِ تازه در ماژولِ `vendors`. دلیلش این است که آن ماژول در واقع
 *     دفترِ «طرف‌های بیرونیِ سازمان» است و پیمانکار و تأمین‌کننده خودشان دو
 *     دسته‌ی ذینفع‌اند؛ چرخه هم یکی است: شناسایی → تحلیل → ارتباطِ مستند.
 *     منوی تازه نگرفت چون کارفرما نسخه‌ی ۱ را به‌خاطرِ شلوغیِ رابط رد کرده بود.
 *
 * Run: node database/seed-gap10.js (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS fin_cost_management (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'خدمات گلوبال',
    title TEXT NOT NULL,
    ward TEXT,
    year TEXT,
    period TEXT,
    cases_count INTEGER,
    tariff_amount REAL,
    actual_cost REAL,
    variance REAL,
    variance_pct REAL,
    nursing_share_pct REAL,
    regulation_ref TEXT,
    quality_safety_reviewed INTEGER NOT NULL DEFAULT 0,
    quality_safety_impact TEXT,
    deviation_reason TEXT,
    corrective_action TEXT,
    responsible TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fincm_h ON fin_cost_management(hospital_id, kind, year)`,

  `CREATE TABLE IF NOT EXISTS service_disruptions (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    event_date TEXT,
    kind TEXT NOT NULL DEFAULT 'تأخیر در ارائه خدمت',
    ward TEXT,
    service TEXT,
    cause_category TEXT NOT NULL DEFAULT 'سایر',
    description TEXT,
    duration_minutes INTEGER,
    patients_affected INTEGER,
    harm_occurred INTEGER NOT NULL DEFAULT 0,
    resolved INTEGER NOT NULL DEFAULT 0,
    resolution TEXT,
    corrective_action TEXT,
    reported_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_svcd_h ON service_disruptions(hospital_id, event_date, resolved)`,

  `CREATE TABLE IF NOT EXISTS staff_surveys (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    year TEXT NOT NULL,
    round TEXT NOT NULL DEFAULT 'نوبت اول',
    survey_date TEXT,
    instrument TEXT,
    validity_checked INTEGER NOT NULL DEFAULT 0,
    invited_count INTEGER,
    participants_count INTEGER,
    response_rate REAL,
    satisfaction_score REAL,
    recommend_score REAL,
    prev_satisfaction_score REAL,
    trend REAL,
    top_issues TEXT,
    corrective_action TEXT,
    action_owner TEXT,
    followup_result TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_stsv_h ON staff_surveys(hospital_id, year, survey_date)`,

  `CREATE TABLE IF NOT EXISTS stakeholders (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'سایر',
    contact_person TEXT,
    influence TEXT NOT NULL DEFAULT 'متوسط',
    interest TEXT NOT NULL DEFAULT 'متوسط',
    is_key INTEGER NOT NULL DEFAULT 0,
    needs_analysis TEXT,
    expectations TEXT,
    policy_communicated INTEGER NOT NULL DEFAULT 0,
    communication_method TEXT,
    communication_date TEXT,
    analysis_date TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_stkh_h ON stakeholders(hospital_id, is_key, category)`,
];

/* ⚠ نقش‌های متعلق به seed-management-roles.js را این‌جا نگذارید — آن فایل بعد
   از این اجرا می‌شود و permissions آن نقش‌ها را کامل بازنویسی می‌کند.
   جدول‌های این فایل مجوزِ ماژولِ میزبانشان را به کار می‌برند
   (finance / hrdev / committees) و مجوزِ تازه‌ای لازم ندارند، جز ذینفعان. */
const ROLE_PERMS = {
  admin: ['manage_stakeholders', 'view_stakeholders'],
  quality_control_manager: ['manage_stakeholders', 'view_stakeholders'],
};

function runMigration() {
  console.log('[Seed Gap10] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed Gap10');
    console.log('[Seed Gap10] ✅ fin_cost_management / service_disruptions / staff_surveys / stakeholders ready');
  } catch (err) {
    console.error('[Seed Gap10] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
