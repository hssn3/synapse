/**
 * Migration: حضورِ شیفتی و گزارشِ ۲۴ ساعته‌ی سوپروایزر بالینی
 *
 * ---------------------------------------------------------------------------
 * چرا جدولِ تازه، و چرا nursing_daily_attendance کافی نبود
 * ---------------------------------------------------------------------------
 * جدولِ قدیمی سه محدودیت داشت که هیچ‌کدام با افزودنِ ستون حل نمی‌شد:
 *
 *  ۱. کلیدش `users.id` بود و پرستار را با `users.department = ward.title` پیدا
 *     می‌کرد. ولی برنامه‌ی شیفت روی `ward_staff` می‌نشیند — که صراحتاً «لزوماً
 *     کاربر سامانه نیستند» (نیروی شرکتی، پرسنلِ تازه). یعنی نفری که شیفت دارد
 *     ممکن است اصلاً در فهرستِ حضور نباشد. برای «روی شیفتِ همان نفر تیک بزن»
 *     مرجع باید همان روستری باشد که شیفت را ساخته: `ward_staff`.
 *
 *  ۲. کلیدِ یکتایش `(ward, att_date, nurse_id)` بود — بدون شیفت. پس یک نفر که
 *     صبح آمده و شب نیامده، یک رکورد بیشتر نمی‌گرفت، و پرسشِ «الان چند نفر سرِ
 *     شیفت‌اند» اصلاً قابلِ جواب نبود.
 *
 *  ۳. `present` دوحالته بود (۰/۱). «تأخیر» و «جانشین فرستاده شد» جایی نداشتند،
 *     در حالی که گزارشِ ۲۴ ساعته دقیقاً همین‌ها را می‌خواهد.
 *
 * جدولِ قدیمی دست‌نخورده می‌ماند چون داشبورد سرپرستار بخش به آن وابسته است؛
 * این یکی کنارش می‌نشیند، نه به‌جایش.
 *
 * ---------------------------------------------------------------------------
 * «ثبت‌نشده» عمداً یک حالت است، نه پیش‌فرضِ «حاضر»
 * ---------------------------------------------------------------------------
 * ردیفی که وجود ندارد یعنی سوپروایزر هنوز تیک نزده. اگر نبودِ ردیف را «حاضر»
 * حساب می‌کردیم، عددِ داشبوردِ مدیر پرستاری همیشه کامل و همیشه دروغ بود. پس
 * داشبورد سه عدد می‌دهد: حاضر / غایب / ثبت‌نشده — و عددِ سوم است که به مدیر
 * می‌گوید کدام بخش هنوز کارش را نکرده.
 *
 * ---------------------------------------------------------------------------
 * گزارش ۲۴ ساعته — سنجه‌ی الف‑۴‑۳‑۱
 * ---------------------------------------------------------------------------
 * «گزارش‌های بیست و چهار ساعته سوپروایزرها به صورت روزانه توسط تیم رهبری و
 * مدیریت بررسی و اقدامات اصلاحی لازم به عمل می‌آید.»
 *
 * پس دو طرف لازم است، نه یکی: نوشتنِ سوپروایزر، و بررسیِ تیم رهبری با اقدام
 * اصلاحی. هر دو در همین جدول‌اند تا «بررسی‌نشده»ها قابلِ شمردن باشند — همان
 * چیزی که ارزیاب می‌پرسد.
 *
 * سرشماریِ حضور در لحظه‌ی ثبتِ گزارش در `headcount_json` عکس‌برداری می‌شود، نه
 * اینکه هر بار زنده حساب شود: گزارشِ امضاشده باید همان عددی را نشان دهد که
 * موقعِ امضا دیده شده، حتی اگر بعداً کسی حضورِ گذشته را اصلاح کند.
 *
 * Run: node database/seed-shift-attendance.js (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');

const SHIFT_CODES = ['M', 'E', 'N'];
const ATT_STATES = ['حاضر', 'غایب', 'تأخیر', 'جانشین'];
const REPORT_STATUSES = ['پیش‌نویس', 'ثبت‌شده', 'بررسی‌شده'];

const TABLES = [
  `CREATE TABLE IF NOT EXISTS nursing_shift_attendance (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    att_date TEXT NOT NULL,
    shift_code TEXT NOT NULL,
    staff_id TEXT NOT NULL REFERENCES ward_staff(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'حاضر',
    substitute_staff_id TEXT REFERENCES ward_staff(id) ON DELETE SET NULL,
    note TEXT,
    marked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    marked_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_nsa_uniq
     ON nursing_shift_attendance(hospital_id, ward, att_date, shift_code, staff_id)`,
  // پرس‌وجوی داغِ داشبورد «الان سرِ شیفت» است: همه‌ی بخش‌ها، یک تاریخ، یک شیفت.
  `CREATE INDEX IF NOT EXISTS idx_nsa_live
     ON nursing_shift_attendance(hospital_id, att_date, shift_code)`,

  `CREATE TABLE IF NOT EXISTS nursing_supervisor_reports (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    report_date TEXT NOT NULL,
    shift_code TEXT NOT NULL,
    supervisor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    headcount_json TEXT DEFAULT '{}',
    events TEXT,
    actions TEXT,
    handover TEXT,
    status TEXT NOT NULL DEFAULT 'پیش‌نویس',
    submitted_at TEXT,
    reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TEXT,
    review_note TEXT,
    corrective_action TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_nsr_uniq
     ON nursing_supervisor_reports(hospital_id, report_date, shift_code)`,
  `CREATE INDEX IF NOT EXISTS idx_nsr_status
     ON nursing_supervisor_reports(hospital_id, status, report_date)`,
];

function runMigration() {
  console.log('[Seed ShiftAttendance] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    const att = db.prepare('SELECT COUNT(*) c FROM nursing_shift_attendance').get().c;
    const rep = db.prepare('SELECT COUNT(*) c FROM nursing_supervisor_reports').get().c;
    console.log(`[Seed ShiftAttendance] ✅ nursing_shift_attendance (${att} رکورد) / nursing_supervisor_reports (${rep} رکورد) ready`);
  } catch (err) {
    console.error('[Seed ShiftAttendance] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration, SHIFT_CODES, ATT_STATES, REPORT_STATUSES };
