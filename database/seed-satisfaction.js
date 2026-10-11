/**
 * Migration: نظرسنجی رضایت بیمار — فرم عمومی بدون ورود
 * جدول public_satisfaction_surveys — پرسشنامه‌ی رسمی ۱۰ بخشی بیمارستان:
 *   ۱ وضعیت پاسخ‌دهی (بستری/همراه) · ۲ جنسیت (الزامی) · ۳ تمایل به انتخاب مجدد
 *   ۴..۹ شش محور امتیازی با مقیاس ۵تایی (۲۰ سوال) · ۱۰ نکات تکمیلی
 * امتیازها در ستون scores به‌صورت JSON کلیدخورده‌ی محور→آرایه ذخیره می‌شوند و
 * overall_score میانگین خودکار پاسخ‌های داده‌شده است (۱ رقم اعشار) تا نمودار
 * «کارتابل ورودی‌های عمومی» بدون بازخوانی JSON ساخته شود.
 * Run: npm run seed-satisfaction — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

function runMigration() {
  db.prepare(`CREATE TABLE IF NOT EXISTS public_satisfaction_surveys (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    respondent_type TEXT,
    patient_gender TEXT NOT NULL,
    would_return TEXT,
    scores TEXT,
    overall_score REAL,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_sat_hospital ON public_satisfaction_surveys(hospital_id, created_at)').run();

  // ستون source روی دو ماژولی که هم مسیر داخلی دارند و هم مسیر عمومی — FMEA از قبل دارد.
  // بدون این ستون، «کارتابل ورودی‌های عمومی» نمی‌تواند ورودی بدون‌ورود را از ثبت داخلی جدا کند.
  const addSource = (table) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes('source')) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN source TEXT DEFAULT 'internal'`).run();
      db.prepare(`UPDATE ${table} SET source = 'internal' WHERE source IS NULL`).run();
      console.log(`[Seed Satisfaction] ✅ ستون source به ${table} اضافه شد`);
    }
  };
  addSource('medical_error_reports');
  addSource('patient_complaints_suggestions');

  console.log('[Seed Satisfaction] ✅ جدول public_satisfaction_surveys آماده است');
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
