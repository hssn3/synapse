/**
 * تناوبِ چک‌لیست‌ها — «این چک‌لیست هر چند وقت یک‌بار باید پر شود؟»
 *
 * چرا این فایل لازم شد: تا پیش از این، چک‌لیست یک فرمِ یک‌بارمصرف بود. کاربر آن را پر
 * می‌کرد و تمام؛ هیچ‌جا ثبت نمی‌شد که این چک‌لیست قرار است ماه بعد هم پر شود. ولی کتاب
 * اعتباربخشی صریحاً پایشِ دوره‌ای می‌خواهد — نمونه‌ها:
 *   • «بررسی روزانه ژنراتورها … با استفاده از چک لیست»            (الف-۲-۳-۱)
 *   • «کنترل روزانه دستگاه‌ها براساس چک لیست عملکردی»              (الف-۲-۳-۳)
 *   • «چک لیستی … تدوین و بررسی دوره‌ای آن … انجام و موارد عدم انطباق اصلاح شود» (الف-۲-۲-۵)
 *   • «ارزیابی دوره‌ای عملکرد پیمانکاران با چک لیست‌های تخصصی»      (الف-۱-۱۰-۲)
 * از ۵۲۰ سنجه‌ی کتاب، ۱۲۵ سنجه (۲۴٪) الزامِ دوره‌ای دارند.
 *
 * تصمیم تقویمی: دوره‌ها بر تقویم *شمسی* بسته می‌شوند، نه بازه‌های غلتانِ ۳۰روزه. دلیلش
 * این است که «ماهانه» در بیمارستان یعنی «یک‌بار در هر ماه شمسی» و گزارش‌های مدیریتی هم
 * ماهِ شمسی‌اند؛ بازه‌ی غلتان باعث می‌شد چک‌لیستی که ۱ فروردین و بعد ۳۰ اردیبهشت پر شده،
 * وسطِ راه «معوق» علامت بخورد در حالی که هر دو ماه پوشش داده شده‌اند.
 *
 * همه‌ی مرزها به وقت تهران حساب می‌شوند (نه ساعت محلیِ سرور) — همان قاعده‌ی reminders.js.
 */
const {
  toJalali, jalaliYearRange, jalaliMonthRange, tehranTodayStr,
} = require('../config/jalali');

const CADENCES = ['daily', 'weekly', 'monthly', 'quarterly', 'biannual', 'annual', 'ondemand'];

const CADENCE_FA = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
  quarterly: 'فصلی (سه‌ماهه)',
  biannual: 'شش‌ماهه',
  annual: 'سالانه',
  ondemand: 'موردی — بدون دوره‌ی ثابت',
};

// چند روز مانده به پایان دوره، سررسید در کارتابل ظاهر شود. برای دوره‌های کوتاه کل دوره،
// برای دوره‌های بلند فقط اواخرش — وگرنه یک چک‌لیست سالانه ۳۶۵ روز در کارتابل می‌ماند.
const CADENCE_LEAD_DAYS = {
  daily: 1, weekly: 3, monthly: 10, quarterly: 20, biannual: 30, annual: 45,
};

function pad(n) { return String(n).padStart(2, '0'); }

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
}

/**
 * دوره‌ای که تاریخِ داده‌شده در آن می‌افتد — هر دو سرِ بازه *شامل* است.
 * توجه: jalaliMonthRange/jalaliYearRange بازه‌ی نیمه‌باز [start, end) می‌دهند،
 * پس یک روز از انتهایشان کم می‌شود تا به بازه‌ی بسته تبدیل شوند.
 * برای cadence بدونِ دوره (ondemand) خروجی null است.
 */
function periodOf(cadence, dateStr) {
  const today = dateStr || tehranTodayStr();
  if (cadence === 'daily') return { start: today, end: today };

  if (cadence === 'weekly') {
    // هفته‌ی ایرانی شنبه شروع می‌شود. getUTCDay: یکشنبه=۰ … شنبه=۶
    // پس فاصله تا شنبه‌ی قبل = (dow + 1) % 7  →  شنبه=۰، یکشنبه=۱، … جمعه=۶
    const dow = new Date(today + 'T00:00:00Z').getUTCDay();
    const start = addDays(today, -((dow + 1) % 7));
    return { start, end: addDays(start, 6) };
  }

  const [gy, gm, gd] = today.split('-').map(Number);
  const j = toJalali(gy, gm, gd);

  if (cadence === 'monthly') {
    const r = jalaliMonthRange(j.jy, j.jm);
    return { start: r.start, end: addDays(r.end, -1) };
  }
  if (cadence === 'quarterly') {
    const q = Math.floor((j.jm - 1) / 3);            // ۰..۳ — بهار/تابستان/پاییز/زمستان
    const a = jalaliMonthRange(j.jy, q * 3 + 1);
    const b = jalaliMonthRange(j.jy, q * 3 + 3);
    return { start: a.start, end: addDays(b.end, -1) };
  }
  if (cadence === 'biannual') {
    const h = j.jm <= 6 ? 0 : 1;                     // نیمه‌ی اول/دوم سال
    const a = jalaliMonthRange(j.jy, h * 6 + 1);
    const b = jalaliMonthRange(j.jy, h * 6 + 6);
    return { start: a.start, end: addDays(b.end, -1) };
  }
  if (cadence === 'annual') {
    const r = jalaliYearRange(j.jy);
    return { start: r.start, end: addDays(r.end, -1) };
  }
  return null;   // ondemand یا مقدار ناشناخته
}

/** دوره‌ی قبل از دوره‌ی جاری — برای تشخیص «دوره‌ی گذشته هم پر نشد» */
function previousPeriod(cadence, dateStr) {
  const cur = periodOf(cadence, dateStr);
  if (!cur) return null;
  return periodOf(cadence, addDays(cur.start, -1));
}

/** دوره‌ی بعد از دوره‌ی جاری — برای تعیین سررسید پایش بعدی */
function nextPeriod(cadence, dateStr) {
  const cur = periodOf(cadence, dateStr);
  if (!cur) return null;
  return periodOf(cadence, addDays(cur.end, 1));
}

/**
 * وضعیتِ پایشِ یک چک‌لیست در دوره‌ی جاری.
 * lastSubmittedAt: تاریخِ آخرین پاسخ‌نامه (ISO یا datetime؛ فقط بخش تاریخ استفاده می‌شود).
 *
 * state یکی از:
 *   not_periodic — چک‌لیست موردی است و اصلاً دوره ندارد
 *   done         — در همین دوره پر شده
 *   due          — هنوز پر نشده ولی فرصت هست
 *   due_soon     — هنوز پر نشده و به پایان دوره نزدیک شده‌ایم (طبق CADENCE_LEAD_DAYS)
 *   last_day     — امروز آخرین روزِ دوره است و هنوز پر نشده
 */
function checklistStatus(cadence, lastSubmittedAt, dateStr) {
  const today = dateStr || tehranTodayStr();
  const p = periodOf(cadence, today);
  if (!p) {
    return {
      cadence: 'ondemand', periodic: false, state: 'not_periodic',
      last_submitted_at: lastSubmittedAt ? String(lastSubmittedAt).slice(0, 10) : null,
    };
  }
  const last = lastSubmittedAt ? String(lastSubmittedAt).slice(0, 10) : null;
  const done = !!(last && last >= p.start && last <= p.end);
  const daysLeft = daysBetween(today, p.end);
  const lead = CADENCE_LEAD_DAYS[cadence] || 7;

  // آیا دوره‌ی قبل هم از دست رفت؟ (سیگنالِ واقعیِ «پایش نمی‌شود»)
  const prev = previousPeriod(cadence, today);
  const prevMissed = !!(prev && !(last && last >= prev.start && last <= prev.end));

  const next = nextPeriod(cadence, today);

  let state;
  if (done) state = 'done';
  else if (daysLeft <= 0) state = 'last_day';
  else if (daysLeft <= lead) state = 'due_soon';
  else state = 'due';

  return {
    cadence, periodic: true, state,
    period_start: p.start, period_end: p.end,
    next_period_start: next ? next.start : null,
    next_period_end: next ? next.end : null,
    last_submitted_at: last,
    done_this_period: done,
    days_left: daysLeft,
    previous_period_missed: prevMissed,
  };
}

module.exports = {
  CADENCES, CADENCE_FA, CADENCE_LEAD_DAYS,
  periodOf, previousPeriod, nextPeriod, checklistStatus, addDays, daysBetween,
};
