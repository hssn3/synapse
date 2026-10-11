/**
 * بیمارمحوری و علت‌کاوی — الف‑۱‑۷‑۴، الف‑۱‑۸‑۶، الف‑۱‑۸‑۷
 * ---------------------------------------------------------------------
 * چرا این سه سنجه یک ماژول شدند و نه سه تا: هر سه یک چرخه‌ی یکسان دارند —
 * «مورد را شناسایی کن → علتش را بکاو → اقدام اصلاحی بگذار → نتیجه را پایش کن» —
 * و هر سه از منظرِ بیمار نوشته شده‌اند. سه ماژولِ جدا یعنی سه منوی تازه برای
 * کارفرمایی که همین حالا گفته رابط شلوغ است.
 *
 *  ۱) pf_coi_cases — الف‑۱‑۷‑۴: «طراحی و اجرای سیستم مدیریتی برای ثبتِ موارد
 *     گزارش‌شده در خصوص تعارض منافع». یعنی خودِ سنجه یک *ثبت‌کننده* خواسته.
 *     مصادیقِ نام‌بُرده‌ی متن (اخذ وجه غیرقانونی، نقض محرمانگی، خدمات القایی،
 *     تبانی دارو و تجهیزات، هدایت بیمار به مرکز دیگر) enum شدند نه متنِ آزاد،
 *     وگرنه «روندِ تکرارِ یک مصداق» قابل شمردن نبود.
 *     ستونِ staff_informed جدا است چون متن، اطلاع‌رسانی به پرسنل را یک بندِ
 *     مستقل آورده — پیشگیری، نه واکنش.
 *
 *  ۲) pf_readmissions — الف‑۱‑۸‑۶. تعریفِ خودِ سنجه سه شرط دارد و هر سه ستون
 *     گرفتند، چون ممیز دقیقاً همین‌ها را می‌پرسد: ناخواسته بودن، فاصله‌ی حداکثر
 *     ۳۰ روز از آخرین ترخیص، و بیرون‌بودن از استثناهای صریحِ متن (روان‌پزشکی،
 *     شیمی‌درمانی، دیالیز، مراجعه‌ی برنامه‌ریزی‌شده).
 *     فاصله‌ی روز در سرور حساب می‌شود؛ عددی که کاربر خودش تایپ کند با تاریخ‌ها
 *     نمی‌خواند و اولین چیزی است که در ممیزی لو می‌رود.
 *     نامِ بیمار ذخیره نمی‌شود، فقط کدِ پرونده.
 *
 *  ۳) pf_ama_discharges — الف‑۱‑۸‑۷. متن می‌گوید علت «معمولاً به‌درستی ثبت
 *     نمی‌شود»، پس دسته‌ی علت اجباری و از فهرست است؛ فیلدِ آزادِ تنها همان
 *     چیزی بود که سنجه از آن شکایت دارد.
 *     «با رعایت» و «با میل شخصی» دو حالتِ یک ستون‌اند، چون متن هر دو را
 *     کنار هم و با یک الزام آورده.
 *
 * Run: node database/seed-patient-focus.js (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS pf_coi_cases (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    case_date TEXT,
    kind TEXT NOT NULL DEFAULT 'سایر',
    title TEXT NOT NULL,
    involved_unit TEXT,
    reported_by TEXT,
    source TEXT NOT NULL DEFAULT 'گزارش کارکنان',
    description TEXT,
    patient_right_violated INTEGER NOT NULL DEFAULT 0,
    staff_informed INTEGER NOT NULL DEFAULT 0,
    preventive_measure TEXT,
    corrective_action TEXT,
    ethics_committee_ref TEXT,
    status TEXT NOT NULL DEFAULT 'شناسایی‌شده',
    closed_date TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pfcoi_h ON pf_coi_cases(hospital_id, status, case_date)`,

  `CREATE TABLE IF NOT EXISTS pf_readmissions (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_code TEXT NOT NULL,
    age INTEGER,
    sex TEXT,
    prev_discharge_date TEXT,
    prev_ward TEXT,
    prev_service TEXT,
    prev_diagnosis TEXT,
    readmit_date TEXT,
    readmit_ward TEXT,
    readmit_diagnosis TEXT,
    days_gap INTEGER,
    unplanned INTEGER NOT NULL DEFAULT 1,
    exclusion TEXT NOT NULL DEFAULT 'ندارد',
    countable INTEGER NOT NULL DEFAULT 1,
    root_cause_done INTEGER NOT NULL DEFAULT 0,
    root_cause TEXT,
    discharge_safety_related INTEGER NOT NULL DEFAULT 0,
    action_team TEXT,
    corrective_action TEXT,
    followup_result TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pfre_h ON pf_readmissions(hospital_id, readmit_date, countable)`,

  `CREATE TABLE IF NOT EXISTS pf_ama_discharges (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_code TEXT NOT NULL,
    discharge_date TEXT,
    kind TEXT NOT NULL DEFAULT 'با میل شخصی',
    ward TEXT,
    service TEXT,
    cause_category TEXT NOT NULL DEFAULT 'سایر',
    cause_detail TEXT,
    preventable INTEGER NOT NULL DEFAULT 0,
    corrective_action TEXT,
    consent_form_signed INTEGER NOT NULL DEFAULT 0,
    risk_explained INTEGER NOT NULL DEFAULT 0,
    followup_call_done INTEGER NOT NULL DEFAULT 0,
    followup_result TEXT,
    recorded_by TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pfama_h ON pf_ama_discharges(hospital_id, discharge_date, cause_category)`,
];

/* ⚠ hospital_president / accreditation_manager / technical_officer را این‌جا
   نگذارید — seed-management-roles.js بعد از این فایل اجرا می‌شود و permissions
   آن نقش‌ها را کامل بازنویسی می‌کند. مجوزشان همان‌جا اضافه شده است. */
const ROLE_PERMS = {
  admin: ['manage_patientfocus', 'view_patientfocus'],
  quality_control_manager: ['manage_patientfocus', 'view_patientfocus'],
  education_supervisor: ['manage_patientfocus', 'view_patientfocus'],
  nursing_director: ['view_patientfocus'],
  clinical_supervisor: ['view_patientfocus'],
};

function runMigration() {
  console.log('[Seed PatientFocus] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed PatientFocus');
    console.log('[Seed PatientFocus] ✅ pf_coi_cases / pf_readmissions / pf_ama_discharges ready');
  } catch (err) {
    console.error('[Seed PatientFocus] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
