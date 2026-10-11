// ============ مهاجرت: راهنمای مسیر اعتباربخشی (Guide Timeline) ============
// دو چیز لازم است:
//   ۱) ستون start_year روی accreditation_periods — سال شمسی‌ای که مدیر بیمارستان تعیین
//      می‌کند «از این سال به‌طور جدی وارد داده‌های اعتباربخشی می‌شویم». مبنای محاسبه‌ی
//      جدول‌زمانی گام‌ها (src/services/guide-timeline.js) همین سال است.
//   ۲) جدول guide_dismissals — دقیقاً هم‌الگوی reminder_dismissals: «انجام شد/بستن» هر
//      گام به‌ازای هر کاربر. جدول کلید-مقدار عمومی در پروژه وجود نداشت (بررسی شد)، پس
//      طبق الگوی موجود (reminder_dismissals) یک جدول کوچک اختصاصی ساخته شد — نه یک جدول
//      کلید-مقدار سراسری جدید که رفتار متفاوتی از الگوهای موجود می‌داشت.
//      نکته‌ی مهم: میلستون‌ها هرگز اینجا «تکمیل‌شده» ثبت نمی‌شوند؛ وضعیت done همیشه از
//      داده‌ی واقعی (تعداد کمیته، تعداد سنجه‌های ثبت‌شده و ...) در لحظه محاسبه می‌شود.
//      این جدول فقط "بستن دستی" (کاربر گفته دیدمش) را نگه می‌دارد.
const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');

function runMigration() {
  const cols = db.prepare('PRAGMA table_info(accreditation_periods)').all().map(c => c.name);
  if (!cols.includes('start_year')) {
    db.prepare('ALTER TABLE accreditation_periods ADD COLUMN start_year INTEGER').run();
    console.log('[Seed GuideTimeline] ✅ ستون start_year به accreditation_periods اضافه شد');
  }

  db.prepare(`CREATE TABLE IF NOT EXISTS guide_dismissals (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    milestone_key TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'dismissed',
    created_at TEXT DEFAULT (datetime('now'))
  )`).run();
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_guidedismiss_uniq ON guide_dismissals(user_id, milestone_key)').run();

  // snooze_until — همان الگوی reminder_dismissals: «بعداً یادآوری کن» یعنی state='snoozed' +
  // تاریخی که بعد از آن دوباره در ویجت ظاهر شود. چیز عمداً بدون آن ساخته شده بود (نسخه‌ی
  // اول فقط dismissed/done داشت)؛ این ستون همان جدول را با ALTER idempotent تکمیل می‌کند.
  const gdCols = db.prepare('PRAGMA table_info(guide_dismissals)').all().map(c => c.name);
  if (!gdCols.includes('snooze_until')) {
    db.prepare('ALTER TABLE guide_dismissals ADD COLUMN snooze_until TEXT').run();
    console.log('[Seed GuideTimeline] ✅ ستون snooze_until به guide_dismissals اضافه شد');
  }

  // پرکردنِ start_year برای دوره‌هایی که آن را ندارند.
  // چرا لازم است: راهنمای مسیر و دستیار هوشمند هر دو مبنایشان همین ستون است و اگر خالی
  // باشد هر دو «هنوز برنامه‌ریزی شروع نشده» برمی‌گردانند — یعنی روی هر بیمارستانی که
  // ادمینش هنوز ویزارد راه‌اندازی را کامل نکرده، شاخص‌ترین قابلیت محصول عملاً خاموش
  // است و کاربر فقط یک دکمه‌ی طلایی بی‌عدد می‌بیند. مقدار پیش‌فرض «سالِ شمسیِ شروعِ
  // همان دوره» است (از start_date خودش، نه یک عدد ثابت)، و اگر آن هم نبود سال جاری.
  // این فقط یک پیش‌فرضِ قابل‌تغییر است: ادمین در «تنظیمات» هر وقت خواست عوضش می‌کند.
  const { toJalali, todayJalali, jalaliYearRange } = require('../src/config/jalali');

  // حالت دوم و مهم‌تر: بیمارستانی که اصلاً ردیف دوره ندارد (مثل «بیمارستان پیش‌فرض» که
  // migrate-sqlite می‌سازد). backfill بالا برایش کاری نمی‌کند چون ردیفی نیست که به‌روز
  // شود، و نتیجه همان دستیارِ خاموش است. برای این‌ها یک دوره‌ی پیش‌فرضِ سال جاری ساخته
  // می‌شود — همان چیزی که ادمین در ویزارد راه‌اندازی انتخاب می‌کرد، فقط از قبل آماده.
  const jyNow = todayJalali().jy;
  const noPeriod = db.prepare(`SELECT h.id FROM hospitals h
    WHERE NOT EXISTS (SELECT 1 FROM accreditation_periods p WHERE p.hospital_id = h.id)`).all();
  if (noPeriod.length) {
    const range = jalaliYearRange(jyNow);
    const ins = db.prepare(`INSERT INTO accreditation_periods
      (id, hospital_id, title, start_date, end_date, note, is_active, start_year)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)`);
    const tx = db.transaction(() => {
      for (const h of noPeriod) {
        ins.run(crypto.randomUUID(), h.id, `دوره‌ی ارزیابی اعتباربخشی سال ${jyNow}`,
          range.start, range.end, 'دوره‌ی پیش‌فرض — از «تنظیمات» قابل تغییر است', jyNow);
      }
    });
    tx();
    console.log(`[Seed GuideTimeline] ✅ دوره‌ی پیش‌فرض سال ${jyNow} برای ${noPeriod.length} بیمارستان بدون دوره ساخته شد`);
  }

  const missing = db.prepare('SELECT id, start_date FROM accreditation_periods WHERE start_year IS NULL').all();
  if (missing.length) {
    const upd = db.prepare('UPDATE accreditation_periods SET start_year = ? WHERE id = ?');
    const tx = db.transaction(() => {
      for (const row of missing) {
        let jy = null;
        if (row.start_date && /^\d{4}-\d{2}-\d{2}/.test(row.start_date)) {
          const [gy, gm, gd] = row.start_date.slice(0, 10).split('-').map(Number);
          try { jy = toJalali(gy, gm, gd).jy; } catch (e) { jy = null; }
        }
        if (!jy) jy = todayJalali().jy;
        upd.run(jy, row.id);
      }
    });
    tx();
    console.log(`[Seed GuideTimeline] ✅ start_year برای ${missing.length} دوره‌ی بدون سال شروع تنظیم شد`);
  }

  console.log('[Seed GuideTimeline] ✅ جدول‌های راهنمای مسیر آماده‌اند');
}

if (require.main === module) { runMigration(); process.exit(0); }

module.exports = { runMigration };
