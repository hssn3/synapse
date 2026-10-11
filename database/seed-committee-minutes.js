/**
 * Migration: صورت‌جلسه‌ی کمیته طبق حداقل‌های سنجه‌ی الف-۱-۵-۲
 *
 * کتاب برای فرم صورت‌جلسه شش بندِ *حداقلی* را نام می‌برد:
 *   «۱. تاریخ، ساعت و محل برگزاری جلسه ۲. دستور کار جلسه، فهرست افراد حاضر و غایب
 *    ۳. نتایج پیگیری مصوبات جلسات قبل ۴. شرح مباحث/ مذاکرات مطرح شده در جلسه
 *    ۵. مصوبات جلسه، مسئول پیگیری مصوبات، مهلت زمانی اجرای مصوبات
 *    ۶. امضای اعضای حاضر و ذکر اسامی اعضای غایب جلسه و اخذ امضای غایبین پس از جلسه»
 *
 * جدول موجود فقط meeting_date / attendees / agenda_items / decisions /
 * next_meeting_date / document_file_id داشت — یعنی از شش بند، ساعت و محل، غایبین،
 * پیگیری مصوبات جلسه‌ی قبل، شرح مذاکرات و امضاها اصلاً جایی برای ثبت نداشتند و
 * مصوبات هم متنِ آزاد بود (بدون مسئول و مهلتِ ساختاریافته، پس پیگیری‌ناپذیر).
 * ۸۶ سنجه به کمیته ارجاع می‌دهند؛ این پرکاربردترین سند سامانه بود و ناقص‌ترینش.
 *
 * چرا ستون‌های تازه و نه جدول جدید؟ صورت‌جلسه یک رکوردِ یکتا به ازای هر جلسه است و
 * این بندها همگی ویژگی‌های همان رکوردند؛ جدول جدید فقط یک JOIN اضافه می‌کرد.
 * غایبین/پیگیری/امضاها آرایه‌ی JSON‌اند چون هیچ‌جا به‌تنهایی پرس‌وجو نمی‌شوند —
 * همیشه همراه خودِ صورت‌جلسه خوانده می‌شوند (همان تصمیم decisions که از قبل بود).
 *
 * Run: npm run seed-committee-minutes — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

const ADD_COLUMNS = [
  // بند ۱ — تاریخ از قبل بود؛ ساعت و محل نبود
  { column: 'start_time', ddl: 'ALTER TABLE committee_meeting_minutes ADD COLUMN start_time TEXT' },
  { column: 'end_time', ddl: 'ALTER TABLE committee_meeting_minutes ADD COLUMN end_time TEXT' },
  { column: 'location', ddl: 'ALTER TABLE committee_meeting_minutes ADD COLUMN location TEXT' },
  // بند ۲ — «فهرست افراد حاضر و غایب»؛ فقط حاضرین بود
  { column: 'absentees', ddl: "ALTER TABLE committee_meeting_minutes ADD COLUMN absentees TEXT DEFAULT '[]'" },
  // بند ۳ — نتایج پیگیری مصوبات جلسات قبل
  { column: 'previous_followup', ddl: "ALTER TABLE committee_meeting_minutes ADD COLUMN previous_followup TEXT DEFAULT '[]'" },
  // بند ۴ — شرح مباحث/مذاکرات
  { column: 'discussion', ddl: 'ALTER TABLE committee_meeting_minutes ADD COLUMN discussion TEXT' },
  // بند ۶ — امضای حاضرین و امضای غایبین پس از جلسه
  { column: 'signatures', ddl: "ALTER TABLE committee_meeting_minutes ADD COLUMN signatures TEXT DEFAULT '[]'" },
  // شناسنامه‌ی سند: صورت‌جلسه هم مدرکی است که ارزیاب می‌بیند و باید کد داشته باشد
  // (همان الزامی که در الف-۱-۴-۶ برای مستندات سطح پایین آمده و برای چک‌لیست‌ها اعمال شد)
  { column: 'minutes_code', ddl: 'ALTER TABLE committee_meeting_minutes ADD COLUMN minutes_code TEXT' },
  { column: 'updated_at', ddl: 'ALTER TABLE committee_meeting_minutes ADD COLUMN updated_at TEXT' },
];

// داده‌ی نمونه‌ی سه‌ماهه‌ی اول، دستور کار و مصوبات را به‌صورت *متنِ چندخطی* نوشته بود
// («۱. ...\n۲. ...») در حالی که رابط کاربری و روت هر دو آرایه‌ی JSON می‌خوانند؛
// نتیجه این بود که ستون «دستور کار» و «مصوبات» برای همه‌ی صورت‌جلسه‌های نمونه خالی
// («—») دیده می‌شد. همان کلاسِ ناسازگاریِ قالب که در #34 و #40 هم دیده شد.
// این بک‌فیل فقط رکوردی را دست می‌زند که مقدارش JSON معتبر نیست، پس اجرای دوباره
// صفر تغییر می‌دهد و رکوردهای درستِ کاربر را هرگز بازنویسی نمی‌کند.
function isJsonArray(v) {
  if (v == null) return false;
  try { return Array.isArray(JSON.parse(v)); } catch { return false; }
}
// «۱. متن» → «متن»؛ شماره‌گذاری را خودِ رابط کاربری تولید می‌کند
const splitLines = (s) => String(s || '').split('\n')
  .map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);

function backfillTextArrays() {
  const rows = db.prepare(`SELECT id, agenda_items, decisions, attendees
                           FROM committee_meeting_minutes`).all();
  const upd = db.prepare(`UPDATE committee_meeting_minutes
                          SET agenda_items = ?, decisions = ?, attendees = ? WHERE id = ?`);
  let n = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      const agenda = isJsonArray(r.agenda_items) ? null : JSON.stringify(splitLines(r.agenda_items));
      // مصوبه‌ی متنی به همان شکلِ رشته‌ای در آرایه می‌نشیند؛ decisionText در رابط کاربری
      // هر دو شکل (رشته و شیء ساختاریافته) را می‌شناسد، پس داده‌ای از دست نمی‌رود.
      const dec = isJsonArray(r.decisions) ? null : JSON.stringify(splitLines(r.decisions));
      // حاضرین در نمونه یک جمله‌ی توصیفی بود، نه فهرست — همان یک جمله یک عضو آرایه می‌شود
      const att = isJsonArray(r.attendees) ? null
        : JSON.stringify(String(r.attendees || '').trim() ? [String(r.attendees).trim()] : []);
      if (agenda === null && dec === null && att === null) continue;
      upd.run(agenda ?? r.agenda_items, dec ?? r.decisions, att ?? r.attendees, r.id);
      n++;
    }
  });
  tx();
  return n;
}

function runMigration() {
  console.log('[Seed Committee Minutes] Starting...');
  try {
    const cols = db.prepare('PRAGMA table_info(committee_meeting_minutes)').all().map(r => r.name);
    for (const c of ADD_COLUMNS) {
      if (!cols.includes(c.column)) { db.exec(c.ddl); console.log(`[Seed Committee Minutes] + ${c.column}`); }
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_minutes_committee ON committee_meeting_minutes(committee_id, meeting_date)');
    const fixed = backfillTextArrays();
    console.log('[Seed Committee Minutes] ✅ صورت‌جلسه طبق الف-۱-۵-۲ آماده است'
      + (fixed ? ` — ${fixed} صورت‌جلسه از متن به فهرست تبدیل شد` : ''));
  } catch (err) {
    console.error('[Seed Committee Minutes] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
