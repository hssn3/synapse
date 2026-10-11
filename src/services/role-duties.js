/**
 * کاتالوگ وظایف اختصاصیِ هر سمت — مغزِ واقعیِ دستیار هوشمند
 *
 * چرا این فایل لازم شد: راهنمای مسیر (guide-timeline.js) ۱۹ گامِ «راه‌اندازی اولیه‌ی
 * بیمارستان» است و با مجوز فیلتر می‌شود. نتیجه‌اش این بود که هر سمت یک بریده‌ی
 * تصادفی از یک چک‌لیست عمومی می‌دید: مدیر حسابداری صفر وظیفه، مدیر تغذیه یک، مسئول
 * بهداشت محیط یک، و ریاست بیمارستان پنج گامِ راه‌اندازی که هیچ‌کدام کار روزمره‌ی
 * ریاست نیست. یعنی دستیار «هوشمند» نبود، یک فیلتر بود.
 *
 * این‌جا برعکس: نقطه‌ی شروع «شغلِ واقعیِ آن سمت در بیمارستان» است. هر وظیفه می‌گوید
 * این سمت چه کاری، هر چند وقت یک‌بار، در کدام صفحه‌ی سامانه باید انجام دهد.
 *
 * ساختار هر وظیفه:
 *   key      — شناسه‌ی پایدار (برای «انجام دادم»/«بعداً» در همان جدول guide_dismissals)
 *   title    — کارِ مشخص، نه عنوان کلی
 *   desc     — دقیقاً چه چیزی را کجا پر کند
 *   page     — صفحه‌ی مقصد دکمه‌ی «برو و همین را انجام بده»
 *   cadence  — 'once' | 'monthly' | 'quarterly' | 'yearly' (کارِ دوره‌ای هرگز «تمام»
 *              نمی‌شود؛ فقط برای دوره‌ی جاری انجام‌شده حساب می‌شود)
 *   done(ctx)— از داده‌ی واقعی، نه حدس. ctx = { hospitalId, userId, since }
 *              (since = ابتدای دوره‌ی جاری برای وظایف دوره‌ای)
 *
 * اصل مشترک با بقیه‌ی این ماژول‌ها: هیچ وضعیتی جعل نمی‌شود. اگر نتوانیم انجام‌شدن یک
 * وظیفه را از داده اثبات کنیم، آن را «انجام‌نشده» نشان می‌دهیم تا کاربر خودش تصمیم
 * بگیرد و در صورت لزوم دستی «انجام دادم» بزند — برعکسش (فرضِ انجام‌شده) یعنی پنهان‌کردن
 * کارِ نکرده، که دقیقاً همان چیزی است که این محصول باید جلویش را بگیرد.
 */
const { query } = require('../config/database-sqlite');
const { todayJalali, jalaliYearRange, jalaliMonthRange, tehranNow, tehranTodayStr } = require('./../config/jalali');

// ---------- کمک‌تابع‌های شمارش (همه با hospital_id محدود می‌شوند) ----------
const count = (sql, params) => {
  try { return query(sql, params).rows[0].c; } catch (e) { return 0; }
};

// ابتدای دوره‌ی جاری بر حسب cadence — مبنای «آیا در این دوره انجام شده؟»
//
// روزانه و هفتگی بعداً اضافه شدند: کارفرما خواست پیشرفت به تفکیک روز/هفته/ماه
// دیده شود. هفته طبق تقویم ایران از **شنبه** شروع می‌شود، نه یکشنبه — با
// getUTCDay() روی ساعت تهران، شنبه = ۶، پس (روزِ هفته + ۱) % ۷ فاصله تا شنبه را
// می‌دهد.
function periodStart(cadence) {
  const t = todayJalali();
  if (cadence === 'daily') return tehranTodayStr();
  if (cadence === 'weekly') {
    const now = tehranNow();
    const back = (now.getUTCDay() + 1) % 7;      // شنبه=۶ → ۰
    const sat = new Date(now.getTime() - back * 86400000);
    return sat.toISOString().slice(0, 10);
  }
  if (cadence === 'monthly') return jalaliMonthRange(t.jy, t.jm).start;
  if (cadence === 'quarterly') {
    const qStartMonth = Math.floor((t.jm - 1) / 3) * 3 + 1;
    return jalaliMonthRange(t.jy, qStartMonth).start;
  }
  if (cadence === 'yearly') return jalaliYearRange(t.jy).start;
  return null; // once
}

const CADENCE_FA = {
  once: 'یک‌بار',
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
  quarterly: 'فصلی',
  yearly: 'سالانه',
};

// درصد انجام‌شده به تفکیک دوره.
//
// عمداً هیچ مخرجی ساخته نمی‌شود: اگر در یک دوره هیچ وظیفه‌ای از آن جنس وجود
// نداشته باشد، به‌جای «۰٪» یا «۱۰۰٪» مقدار null برمی‌گردد و رابط می‌گوید «موردی
// در این بازه نیست». درصدِ ساختگی دقیقاً همان پنهان‌کردنِ کارِ نکرده است که این
// محصول باید جلویش را بگیرد.
function periodProgress(roleCode, hospitalId, userId) {
  const duties = dutiesFor(roleCode, hospitalId, userId) || [];
  const out = {};
  for (const cad of ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']) {
    const list = duties.filter(d => d.cadence === cad);
    out[cad] = list.length
      ? { total: list.length, done: list.filter(d => d.done).length,
          pct: Math.round(list.filter(d => d.done).length * 100 / list.length),
          label: CADENCE_FA[cad] }
      : { total: 0, done: 0, pct: null, label: CADENCE_FA[cad] };
  }
  return out;
}

// ---------- سنجش‌های پرتکرار ----------
// آیا این کاربر در این دوره صورت‌جلسه‌ای ثبت کرده؟
const minutesBy = (ctx) => count(
  `SELECT COUNT(*) c FROM committee_meeting_minutes m
   JOIN committees c ON c.id = m.committee_id
   WHERE c.hospital_id = ? AND m.created_by = ?` + (ctx.since ? ' AND date(m.meeting_date) >= date(?)' : ''),
  ctx.since ? [ctx.hospitalId, ctx.userId, ctx.since] : [ctx.hospitalId, ctx.userId]);

// آیا سنجه‌های محورِ این سمت به‌روز شده؟ (بر پایه‌ی کد محور در درخت اعتباربخشی)
const measuresTouchedInAxis = (ctx, axisCode) => count(
  `SELECT COUNT(*) c FROM measure_status ms
   JOIN accreditation_sections m ON m.id = ms.measure_id
   WHERE ms.hospital_id = ? AND m.code LIKE ?`, [ctx.hospitalId, axisCode + '-%']);

const walkaroundsSince = (ctx) => count(
  `SELECT COUNT(*) c FROM management_walkarounds WHERE hospital_id = ?` +
  (ctx.since ? ' AND date(visit_date) >= date(?)' : ''),
  ctx.since ? [ctx.hospitalId, ctx.since] : [ctx.hospitalId]);

const auditsSince = (ctx) => count(
  `SELECT COUNT(*) c FROM internal_audits WHERE hospital_id = ? AND COALESCE(is_example, 0) = 0` +
  (ctx.since ? " AND date(COALESCE(audit_date, created_at)) >= date(?)" : ''),
  ctx.since ? [ctx.hospitalId, ctx.since] : [ctx.hospitalId]);

// فعالیتِ ثبت‌شده‌ی خودِ کاربر در دوره — مبنای اثبات کارهای روزانه/هفتگی.
// روی recorded_by فیلتر می‌شود چون این وظایف شخصیِ همان سمت‌اند، نه کارِ مرکز.
const myActivitySince = (ctx) => count(
  `SELECT COUNT(*) c FROM activity_records WHERE hospital_id = ? AND recorded_by = ?` +
  (ctx.since ? ' AND date(COALESCE(occurred_at, created_at)) >= date(?)' : ''),
  ctx.since ? [ctx.hospitalId, ctx.userId, ctx.since] : [ctx.hospitalId, ctx.userId]);

const trainingNeeds = (ctx) => count('SELECT COUNT(*) c FROM training_needs WHERE hospital_id = ?', [ctx.hospitalId]);

const wardsWithoutHead = (ctx) => count(
  'SELECT COUNT(*) c FROM nursing_wards WHERE hospital_id = ? AND head_nurse_id IS NULL', [ctx.hospitalId]);

const supervisorSlotsEmpty = (ctx) => count(
  'SELECT COUNT(*) c FROM nursing_supervisor_slots WHERE hospital_id = ? AND user_id IS NULL', [ctx.hospitalId]);

const bscWithValues = (ctx) => count(
  `SELECT COUNT(*) c FROM hospital_kpis WHERE hospital_id = ?`, [ctx.hospitalId]);

const errorsSince = (ctx) => count(
  `SELECT COUNT(*) c FROM medical_error_reports WHERE hospital_id = ?` +
  (ctx.since ? ' AND date(created_at) >= date(?)' : ''),
  ctx.since ? [ctx.hospitalId, ctx.since] : [ctx.hospitalId]);

const fmeaCount = (ctx) => count('SELECT COUNT(*) c FROM fmea_records WHERE hospital_id = ? AND COALESCE(is_example, 0) = 0', [ctx.hospitalId]);

// جدولِ پاسخ‌های چک‌لیست «checklist_submissions» است (ستون زمان: submitted_at) —
// رکوردهای نمونه (is_example) کنار گذاشته می‌شوند تا داده‌ی دمو، وظیفه‌ی واقعی را
// «انجام‌شده» جا نزند.
const checklistRunsSince = (ctx) => count(
  `SELECT COUNT(*) c FROM checklist_submissions
   WHERE hospital_id = ? AND COALESCE(is_example, 0) = 0` +
  (ctx.since ? ' AND date(submitted_at) >= date(?)' : ''),
  ctx.since ? [ctx.hospitalId, ctx.since] : [ctx.hospitalId]);

const programsCount = (ctx) => count('SELECT COUNT(*) c FROM improvement_programs WHERE hospital_id = ?', [ctx.hospitalId]);

// ---------- کاتالوگ: کلید = role code ----------
// وظایف مشترکِ «هر کارمند بیمارستان» که در انتهای فهرست هر سمت اضافه می‌شود
const COMMON = [
  {
    key: 'common_profile', cadence: 'once', title: 'تکمیل پروفایل شخصی',
    desc: 'در «پروفایل من» جنسیت، عکس، بیو و نحوه‌ی تماس ترجیحی خود را کامل کنید تا همکاران در نمودار سازمانی و کارتابل بدانند چطور به شما دسترسی داشته باشند.',
    page: 'profile', field: 'pf_contact',
    done: (ctx) => count("SELECT COUNT(*) c FROM users WHERE id = ? AND contact_method IS NOT NULL AND TRIM(contact_method) <> ''", [ctx.userId]) > 0,
  },
];

const DUTIES = {
  // ============ ریاست بیمارستان ============
  hospital_president: [
    { key: 'pres_walkaround', cadence: 'monthly', title: 'بازدید مدیریتی ایمنی بیمار',
      desc: 'طبق سنجه‌های محور «رهبری و مدیریت» ریاست باید ماهانه از بخش‌ها بازدید کند و یافته‌ها را ثبت کند. در «بازدید میدانی مدیریتی» بازدید این ماه را ثبت و برای هر یافته مسئول و مهلت تعیین کنید.',
      page: 'walkarounds', done: (ctx) => walkaroundsSince(ctx) > 0 },
    { key: 'pres_score_review', cadence: 'monthly', title: 'مرور امتیاز و رتبه‌ی اعتباربخشی',
      desc: 'در داشبورد، امتیاز وزنی و رتبه‌ی تخمینی و سنجه‌های ایمنی بیمارِ تکمیل‌نشده را مرور کنید و برای عقب‌ماندگی‌ها از همان‌جا وظیفه تعیین کنید.',
      page: 'dash', done: () => false },   // مرور، رد داده‌ای نمی‌گذارد → با «انجام دادم» بسته می‌شود
    { key: 'pres_program_approve', cadence: 'yearly', title: 'تصویب برنامه‌ی بهبود کیفیت سالانه',
      desc: 'برنامه‌های بهبود پیشنهادی واحدها را در «برنامه‌های بهبود» بررسی و تصویب کنید؛ برنامه‌ی بدون تصویب ریاست در ارزیابی پذیرفته نمی‌شود.',
      page: 'programs', done: (ctx) => programsCount(ctx) > 0 },
    { key: 'pres_committee', cadence: 'monthly', title: 'شرکت و ثبت مصوبات کمیته‌های راهبردی',
      desc: 'صورت‌جلسه‌ی کمیته‌هایی که ریاست عضو آن‌هاست (پایش و سنجش کیفیت، اعتباربخشی) را ثبت کنید — هر مصوبه باید مسئول و مهلت داشته باشد.',
      page: 'committees', done: (ctx) => minutesBy(ctx) > 0 },
  ],

  // ============ مدیر اعتباربخشی ============
  accreditation_manager: [
    { key: 'acc_measures_fill', cadence: 'quarterly', title: 'به‌روزرسانی وضعیت سنجه‌ها',
      desc: 'وضعیت سنجه‌ها را در «سنجه‌ها و ارزیابی» به‌روز کنید. سنجه‌های ایمنی بیمار (ضریب ۲) را در اولویت بگذارید چون بیشترین اثر را روی رتبه دارند.',
      page: 'measures', done: (ctx) => count('SELECT COUNT(*) c FROM measure_status WHERE hospital_id = ? AND date(last_reviewed_at) >= date(?)', [ctx.hospitalId, ctx.since || '1900-01-01']) > 0 },
    { key: 'acc_evidence', cadence: 'quarterly', title: 'بارگذاری مستندات و شواهد سنجه‌ها',
      desc: 'برای سنجه‌هایی که «منطبق» ثبت کرده‌اید، شاهد بارگذاری کنید. بازرس برای هر ادعای انطباق، مدرک می‌خواهد.',
      page: 'measures', done: (ctx) => count('SELECT COUNT(*) c FROM evidence_files WHERE hospital_id = ?', [ctx.hospitalId]) > 0 },
    { key: 'acc_docs', cadence: 'yearly', title: 'بازنگری سالانه‌ی خط‌مشی‌ها و روش‌های اجرایی',
      desc: 'در «مدارک کنترل‌شده»، اسنادی که تاریخ بازنگری‌شان گذشته را به‌روز کنید؛ سند منقضی در ارزیابی امتیاز منفی دارد.',
      page: 'documents', done: (ctx) => count('SELECT COUNT(*) c FROM controlled_documents WHERE hospital_id = ?', [ctx.hospitalId]) >= 5 },
    { key: 'acc_audit', cadence: 'quarterly', title: 'اجرای حسابرسی داخلی دوره‌ای',
      desc: 'یک حسابرسی داخلی در «حسابرسی داخلی» ثبت کنید و یافته‌ها را با مسئول و مهلت مشخص پیگیری کنید.',
      page: 'audits', done: (ctx) => auditsSince(ctx) > 0 },
  ],

  // ============ مدیر پرستاری (مترون) ============
  nursing_director: [
    { key: 'nd_weekly_presence', cadence: 'weekly', title: 'مرور هفتگی حضور و چیدمان کادر پرستاری',
      desc: 'چیدمان و حضور کادر این هفته را مرور کنید؛ کمبود پوشش را همان هفته جبران کنید نه آخر ماه.',
      page: 'nursing', done: (ctx) => myActivitySince(ctx) > 0 },

    { key: 'nd_chart', cadence: 'once', title: 'تکمیل چارت پرستاری',
      desc: 'در «سلسله‌مراتب پرستاری» برای هر بخش سرپرستار و جانشین تعیین کنید و اسلات سوپروایزرها را پر کنید — بدون این، کارتابل بخش‌ها بی‌صاحب می‌ماند.',
      page: 'nursing', done: (ctx) => wardsWithoutHead(ctx) === 0 && supervisorSlotsEmpty(ctx) === 0 },
    { key: 'nd_axis4', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های محور مدیریت خدمات پرستاری (الف-۴)',
      desc: 'محور الف-۴ اختصاصاً مسئولیت مدیر پرستاری است. وضعیت سنجه‌های این محور را در «سنجه‌ها» ثبت و مستند کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'الف-4') > 0 },
    { key: 'nd_training', cadence: 'yearly', title: 'برنامه‌ی آموزشی سالانه‌ی کادر پرستاری',
      desc: 'نیازهای آموزشی پرسنل پرستاری را در «نیازسنجی آموزشی» ثبت و اولویت‌بندی کنید.',
      page: 'training', done: (ctx) => trainingNeeds(ctx) > 0 },
    { key: 'nd_committee', cadence: 'monthly', title: 'ثبت صورت‌جلسه‌ی کمیته‌های پرستاری',
      desc: 'صورت‌جلسه‌ی کمیته‌هایی که دبیر یا عضو آن هستید را با مصوبات دارای مسئول و مهلت ثبت کنید.',
      page: 'committees', done: (ctx) => minutesBy(ctx) > 0 },
    { key: 'nd_shift_review', cadence: 'monthly', title: 'پایش گزارش‌های شیفت و حضور کادر',
      desc: 'گزارش‌های شیفت و وضعیت حضور بخش‌ها را مرور کنید تا کمبود نیرو و موارد تکرارشونده را زودتر ببینید.',
      page: 'nursing', done: () => false },   // مانند pres_score_review: مرور رد داده‌ای نمی‌گذارد → با «انجام دادم» بسته می‌شود
    { key: 'nd_delegate', cadence: 'monthly', title: 'تقسیم کار ماه با پیام داخلی',
      desc: 'در «پیام‌های داخلی» برای سوپروایزرها بنویسید کدام محور را تا چه تاریخی باید تکمیل کنند؛ همین پیام، سندِ تقسیم کارِ این ماه است.',
      page: 'messages', done: (ctx) => count(
        `SELECT COUNT(*) c FROM internal_messages WHERE hospital_id = ? AND sender_id = ? AND COALESCE(is_draft,0) = 0` +
        (ctx.since ? ' AND date(COALESCE(sent_at, created_at)) >= date(?)' : ''),
        ctx.since ? [ctx.hospitalId, ctx.userId, ctx.since] : [ctx.hospitalId, ctx.userId]) > 0 },
  ],

  // ============ سوپروایزر آموزشی ============
  education_supervisor: [
    { key: 'edu_needs', cadence: 'yearly', title: 'نیازسنجی آموزشی سالانه',
      desc: 'نیازهای آموزشی هر بخش را در «نیازسنجی آموزشی» ثبت کنید؛ این سند پایه‌ی تقویم آموزشی سال و یکی از مدارک الزامی ارزیابی است.',
      page: 'training', done: (ctx) => trainingNeeds(ctx) > 0 },
    { key: 'edu_calendar', cadence: 'quarterly', title: 'ثبت تقویم دوره‌های آموزشی',
      desc: 'دوره‌های آموزشی این فصل را در «تقویم» ثبت کنید تا پرسنل و سرپرستاران از قبل برنامه‌ریزی کنند.',
      page: 'calendar', done: (ctx) => count('SELECT COUNT(*) c FROM calendar_events WHERE hospital_id = ?', [ctx.hospitalId]) > 0 },
    { key: 'edu_record', cadence: 'monthly', title: 'ثبت دوره‌های برگزارشده و حاضران',
      desc: 'برای هر دوره‌ای که برگزار شد، در «ثبت فعالیت‌ها» رکورد بزنید و لیست حاضران را به‌عنوان شاهد بارگذاری کنید — بدون شاهد، برگزاری دوره در ارزیابی پذیرفته نمی‌شود.',
      page: 'activities', done: (ctx) => count('SELECT COUNT(*) c FROM activity_records WHERE hospital_id = ? AND recorded_by = ?', [ctx.hospitalId, ctx.userId]) > 0 },
    { key: 'edu_axis3', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های آموزش و منابع انسانی (الف-۳)',
      desc: 'وضعیت سنجه‌های مربوط به آموزش کارکنان را در «سنجه‌ها» ثبت کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'الف-3') > 0 },
  ],

  // ============ سوپروایزر بالینی ============
  clinical_supervisor: [
    { key: 'cs_daily_round', cadence: 'daily', title: 'بازدید روزانه از بخش‌های تحت نظارت',
      desc: 'شرح وظایف این سمت «بازدید مستمر از واحدهای مرتبط» است. بازدید امروز را در «ثبت فعالیت‌ها» ثبت کنید تا سابقه‌اش بماند.',
      page: 'activities', done: (ctx) => myActivitySince(ctx) > 0 },
    { key: 'cs_weekly_incident', cadence: 'weekly', title: 'جمع‌بندی هفتگی حوادث و وقایع',
      desc: 'حوادث و وقایع غیرمترقبه‌ی این هفته را مرور و در «گزارش خطا و وقایع» ثبت کنید.',
      page: 'errors', done: (ctx) => errorsSince(ctx) > 0 },

    { key: 'cs_round', cadence: 'monthly', title: 'راند بالینی و ثبت یافته‌ها',
      desc: 'راند شیفت خود را انجام دهید و موارد نیازمند اقدام را در «ثبت فعالیت‌ها» ثبت کنید تا سابقه‌ی قابل ارائه به بازرس بماند.',
      page: 'activities', done: (ctx) => count('SELECT COUNT(*) c FROM activity_records WHERE hospital_id = ? AND recorded_by = ?', [ctx.hospitalId, ctx.userId]) > 0 },
    { key: 'cs_errors', cadence: 'monthly', title: 'پیگیری گزارش‌های خطای بخش‌ها',
      desc: 'گزارش‌های خطای ثبت‌شده را بررسی و برای موارد نیازمند تحلیل ریشه‌ای (RCA) اقدام اصلاحی تعیین کنید.',
      page: 'errors', done: (ctx) => errorsSince(ctx) > 0 },
    { key: 'cs_measures', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های مراقبت بالینی',
      desc: 'وضعیت سنجه‌های محورهای بالینی تحت مسئولیت خود را در «سنجه‌ها» ثبت و مستند کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'ب-1') > 0 },
  ],

  // ============ سوپروایزر کنترل عفونت ============
  infection_control_supervisor: [
    { key: 'ics_daily_watch', cadence: 'daily', title: 'پایش روزانه‌ی موارد عفونت',
      desc: 'پایش امروز را در «ثبت فعالیت‌ها» ثبت کنید — پایش مستمر بر اساس چک‌لیست‌های کشوری از وظایف این سمت است.',
      page: 'activities', done: (ctx) => myActivitySince(ctx) > 0 },

    { key: 'ic_checklist', cadence: 'monthly', title: 'اجرای چک‌لیست کنترل عفونت بخش‌ها',
      desc: 'چک‌لیست بهداشت دست و کنترل عفونت را این ماه برای بخش‌ها تکمیل کنید؛ نتایج مبنای گزارش کمیته‌ی کنترل عفونت است.',
      page: 'checklists', done: (ctx) => checklistRunsSince(ctx) > 0 },
    { key: 'ic_committee', cadence: 'monthly', title: 'ثبت صورت‌جلسه‌ی کمیته کنترل عفونت',
      desc: 'مصوبات کمیته‌ی کنترل عفونت را با مسئول و مهلت ثبت کنید — این کمیته جزو کمیته‌های الزامی با تواتر ماهانه است.',
      page: 'committees', done: (ctx) => minutesBy(ctx) > 0 },
    { key: 'ic_axis5', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های پیشگیری و کنترل عفونت (ب-۵)',
      desc: 'وضعیت سنجه‌های محور ب-۵ را ثبت و برای هر انطباق، شاهد بارگذاری کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'ب-5') > 0 },
  ],

  // ============ مسئول فنی ============
  technical_officer: [
    { key: 'tech_errors', cadence: 'monthly', title: 'بررسی خطاهای دارویی و تجهیزاتی',
      desc: 'گزارش‌های خطای مرتبط با دارو و تجهیزات را بررسی و اقدام اصلاحی ثبت کنید.',
      page: 'errors', done: (ctx) => errorsSince(ctx) > 0 },
    { key: 'tech_fmea', cadence: 'yearly', title: 'تحلیل خطر فرآیندهای پرخطر (FMEA)',
      desc: 'حداقل یک FMEA برای یک فرآیند پرخطر (مثل دارودهی) در «عوامل تهدیدکننده ایمنی» ثبت کنید — از الزامات ارزیابی است.',
      page: 'fmea', done: (ctx) => fmeaCount(ctx) > 0 },
    { key: 'tech_equipment', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های تجهیزات پزشکی و دارو (الف-۷ / ب-۶)',
      desc: 'وضعیت سنجه‌های کالیبراسیون تجهیزات و مدیریت دارویی را ثبت و مستند کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'الف-7') > 0 || measuresTouchedInAxis(ctx, 'ب-6') > 0 },
  ],

  // ============ مدیر منابع انسانی ============
  hr_manager: [
    { key: 'hr_users', cadence: 'once', title: 'ثبت پرسنل در سامانه',
      desc: 'در «مدیریت کاربران» برای پرسنل حساب بسازید و نقش و بخش هرکدام را درست تعیین کنید — کارتابل و گزارش‌های عملکرد بر همین پایه کار می‌کنند.',
      page: 'users', done: (ctx) => count('SELECT COUNT(*) c FROM users WHERE hospital_id = ?', [ctx.hospitalId]) >= 10 },
    { key: 'hr_orgstructure', cadence: 'once', title: 'تکمیل ساختار سازمانی و پست‌ها',
      desc: 'در «ساختار سازمانی» واحدها، گروه‌های شغلی و عناوین پست را کامل کنید.',
      page: 'orgstructure', done: (ctx) => count('SELECT COUNT(*) c FROM org_units WHERE hospital_id = ?', [ctx.hospitalId]) > 0 },
    { key: 'hr_training', cadence: 'yearly', title: 'بررسی و تأیید نیازهای آموزشی کارکنان',
      desc: 'نیازهای آموزشی ثبت‌شده‌ی واحدها را در «نیازسنجی آموزشی» بررسی و تأیید کنید.',
      page: 'training', done: (ctx) => trainingNeeds(ctx) > 0 },
    { key: 'hr_axis3', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های منابع انسانی (الف-۳)',
      desc: 'وضعیت سنجه‌های محور الف-۳ (شامل معاینات دوره‌ای و پرونده‌ی پرسنلی) را ثبت کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'الف-3') > 0 },
  ],

  // ============ مدیر مالی ============
  financial_manager: [
    { key: 'fin_bsc', cadence: 'monthly', title: 'ثبت شاخص‌های مالی کارت امتیازی متوازن',
      desc: 'مقدار این ماهِ شاخص‌های منظر مالی را در «کارت امتیازی متوازن (BSC)» وارد کنید تا روند مالی قابل پایش باشد.',
      page: 'bsc', done: (ctx) => bscWithValues(ctx) > 0 },
    { key: 'fin_program_cost', cadence: 'quarterly', title: 'بررسی بار مالی برنامه‌های بهبود',
      desc: 'برنامه‌های بهبود پیشنهادی واحدها را از نظر منابع مالی بررسی کنید تا برنامه‌ی بدون پشتوانه تصویب نشود.',
      page: 'programs', done: (ctx) => programsCount(ctx) > 0 },
  ],

  // ============ مدیر حسابداری ============
  accounting_manager: [
    { key: 'acct_bsc_review', cadence: 'monthly', title: 'مرور شاخص‌های مالی ماه',
      desc: 'در «کارت امتیازی متوازن» شاخص‌های منظر مالی را مرور و مغایرت‌ها را به مدیر مالی گزارش کنید.',
      page: 'bsc', done: () => false },
    { key: 'acct_report', cadence: 'quarterly', title: 'تهیه‌ی گزارش دوره‌ای برای مدیریت',
      desc: 'از «گزارش‌ها» خروجی دوره را بگیرید و برای ریاست و مدیر مالی ارسال کنید.',
      page: 'reports', done: () => false },
  ],

  // ============ مدیر تغذیه ============
  nutrition_manager: [
    { key: 'nut_checklist', cadence: 'monthly', title: 'اجرای چک‌لیست بهداشت و کیفیت غذا',
      desc: 'چک‌لیست آشپزخانه و توزیع غذا را این ماه تکمیل کنید و موارد عدم انطباق را پیگیری کنید.',
      page: 'checklists', done: (ctx) => checklistRunsSince(ctx) > 0 },
    { key: 'nut_committee', cadence: 'quarterly', title: 'ثبت صورت‌جلسه‌ی کمیته‌ی تغذیه',
      desc: 'مصوبات کمیته‌ی تغذیه را با مسئول و مهلت ثبت کنید.',
      page: 'committees', done: (ctx) => minutesBy(ctx) > 0 },
    { key: 'nut_measures', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های مرتبط با تغذیه‌ی بیمار',
      desc: 'وضعیت سنجه‌های مربوط به ارزیابی تغذیه‌ای بیمار و رژیم درمانی را ثبت کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'ب-1') > 0 },
  ],

  // ============ مسئول بهداشت حرفه‌ای ============
  occupational_health_officer: [
    { key: 'occ_exams', cadence: 'yearly', title: 'پیگیری معاینات دوره‌ای کارکنان',
      desc: 'وضعیت معاینات دوره‌ای پرسنل را ثبت و پیگیری کنید — از الزامات محور الف-۳ (سلامت حرفه‌ای) است.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'الف-3') > 0 },
    { key: 'occ_checklist', cadence: 'monthly', title: 'چک‌لیست ایمنی و بهداشت محیط کار',
      desc: 'چک‌لیست ایمنی محیط کار بخش‌ها را تکمیل و موارد خطرآفرین را ثبت کنید.',
      page: 'checklists', done: (ctx) => checklistRunsSince(ctx) > 0 },
    { key: 'occ_committee', cadence: 'quarterly', title: 'ثبت صورت‌جلسه‌ی کمیته حفاظت فنی و بهداشت کار',
      desc: 'مصوبات این کمیته‌ی الزامی را با مسئول و مهلت ثبت کنید.',
      page: 'committees', done: (ctx) => minutesBy(ctx) > 0 },
  ],

  // ============ مسئول بهداشت محیط ============
  environmental_health_officer: [
    { key: 'env_checklist', cadence: 'monthly', title: 'چک‌لیست بهداشت محیط و مدیریت پسماند',
      desc: 'چک‌لیست بهداشت محیط، آب و پسماند را این ماه تکمیل کنید و موارد عدم انطباق را پیگیری کنید.',
      page: 'checklists', done: (ctx) => checklistRunsSince(ctx) > 0 },
    { key: 'env_axis6', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های بهداشت محیط (الف-۶)',
      desc: 'محور الف-۶ اختصاصاً مسئولیت شماست. وضعیت سنجه‌های آن را ثبت و برای هر انطباق شاهد بارگذاری کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'الف-6') > 0 },
  ],

  // ============ مدیر کنترل کیفیت / بهبود کیفیت ============
  quality_control_manager: [
    { key: 'qc_measures', cadence: 'quarterly', title: 'پایش کلی وضعیت سنجه‌ها',
      desc: 'سنجه‌های «عدم انطباق» و «بررسی‌نشده» را در «سنجه‌ها» مرور و برای هرکدام مسئول و مهلت تعیین کنید.',
      page: 'measures', done: (ctx) => count("SELECT COUNT(*) c FROM measure_status WHERE hospital_id = ? AND status = 'not_reviewed'", [ctx.hospitalId]) === 0 },
    { key: 'qc_committee', cadence: 'monthly', title: 'ثبت صورت‌جلسه‌ی کمیته پایش و سنجش کیفیت',
      desc: 'این کمیته ماهانه است و صورت‌جلسه‌اش از مدارک کلیدی ارزیابی است.',
      page: 'committees', done: (ctx) => minutesBy(ctx) > 0 },
    { key: 'qc_programs', cadence: 'yearly', title: 'تدوین برنامه‌های بهبود کیفیت',
      desc: 'برای شکاف‌های شناسایی‌شده، برنامه‌ی بهبود با هدف کمی و مسئول مشخص ثبت کنید.',
      page: 'programs', done: (ctx) => programsCount(ctx) > 0 },
    { key: 'qc_satisfaction', cadence: 'quarterly', title: 'تحلیل نتایج نظرسنجی رضایت بیمار',
      desc: 'نتایج نظرسنجی را در «نظرسنجی رضایت» بررسی و برای محورهای ضعیف اقدام اصلاحی تعریف کنید.',
      page: 'satisfaction', done: (ctx) => count('SELECT COUNT(*) c FROM public_satisfaction_surveys WHERE hospital_id = ?', [ctx.hospitalId]) > 0 },
  ],

  // ============ پرستار ============
  staff_nurse: [
    { key: 'nurse_shift', cadence: 'monthly', title: 'ثبت گزارش شیفت',
      desc: 'گزارش شیفت خود را ثبت کنید؛ این گزارش‌ها مبنای پایش کیفیت مراقبت و پیگیری موارد بحرانی است.',
      page: 'nursing', done: () => false },
    { key: 'nurse_error', cadence: 'monthly', title: 'گزارش خطا و وقایع ناخواسته',
      desc: 'هر خطا یا واقعه‌ی ناخواسته را (حتی بدون آسیب) گزارش کنید. گزارش‌دهی می‌تواند ناشناس باشد و هدفش یافتن علت است، نه مقصر.',
      page: 'errors', done: (ctx) => errorsSince(ctx) > 0 },
  ],

  // ============ مسئول دفتر پرستاری ============
  nursing_office_assistant: [
    { key: 'noa_minutes', cadence: 'monthly', title: 'تنظیم و ثبت صورت‌جلسات دفتر پرستاری',
      desc: 'صورت‌جلسه‌های جلسات دفتر پرستاری را با دستور کار و مصوبات دارای مسئول و مهلت ثبت کنید.',
      page: 'committees', done: (ctx) => minutesBy(ctx) > 0 },
    { key: 'noa_calendar', cadence: 'monthly', title: 'به‌روزرسانی تقویم جلسات و برنامه‌ها',
      desc: 'جلسات و رویدادهای پیش‌روی دفتر پرستاری را در «تقویم» ثبت کنید تا همه از قبل مطلع باشند.',
      page: 'calendar', done: (ctx) => count('SELECT COUNT(*) c FROM calendar_events WHERE hospital_id = ?', [ctx.hospitalId]) > 0 },
  ],

  // ============ مدیر داخلی ============
  // این سمت تا امروز هیچ وظیفه‌ای در کاتالوگ نداشت و «مسئولیت من» برایش خالی
  // می‌ماند — درست همان چیزی که کارفرما گزارش کرد. مدیر داخلی متولیِ اجرای
  // روزمره‌ی مرکز است، پس وظایفش عمداً از جنسِ «هر روز نگاه کن» و «هر هفته
  // ببند» است، نه گزارشِ سالانه.
  admin: [
    { key: 'adm_daily_open', cadence: 'daily', title: 'مرور کارهای بازِ امروز',
      desc: 'در «کارتابل» یادآورهای سررسیدشده و در «کار من» موارد قرمز (انحراف دما، فراخوان باز، عارضه‌ی بی‌پاسخ) را ببینید و به مسئولش بسپارید.',
      page: 'inbox', done: () => false },
    { key: 'adm_weekly_errors', cadence: 'weekly', title: 'بررسی خطاها و وقایع هفته',
      desc: 'گزارش‌های خطای این هفته را مرور کنید؛ هر مورد بدون تحلیل ریشه‌ای، هفته‌ی بعد دوباره تکرار می‌شود.',
      page: 'errors', done: (ctx) => errorsSince(ctx) > 0 },
    { key: 'adm_weekly_walk', cadence: 'weekly', title: 'بازدید میدانی از یک بخش',
      desc: 'یک بازدید میدانی ثبت کنید و یافته‌هایش را با مسئول و مهلت ببندید.',
      page: 'walkarounds', done: (ctx) => walkaroundsSince(ctx) > 0 },
    { key: 'adm_monthly_committee', cadence: 'monthly', title: 'پیگیری مصوبات کمیته‌ها',
      desc: 'مصوباتی که مهلتشان گذشته را در «کمیته‌ها» پیگیری و تعیین تکلیف کنید.',
      page: 'committees', done: (ctx) => minutesBy(ctx) > 0 },
    { key: 'adm_monthly_measures', cadence: 'monthly', title: 'مرور سنجه‌های بدون وضعیت',
      desc: 'سنجه‌هایی که هیچ وضعیتی ندارند در ارزیابی «رعایت‌نشده» حساب می‌شوند؛ برای هرکدام مسئول تعیین کنید.',
      page: 'measures', done: (ctx) => count("SELECT COUNT(*) c FROM measure_status WHERE hospital_id = ? AND status = 'not_reviewed'", [ctx.hospitalId]) === 0 },
  ],

  // ============ کارشناس شیر مادر ============
  breastfeeding_specialist: [
    { key: 'bf_measures', cadence: 'quarterly', title: 'به‌روزرسانی سنجه‌های ترویج تغذیه با شیر مادر (ب-۴)',
      desc: 'وضعیت سنجه‌های محور مراقبت مادر و نوزاد مربوط به شیر مادر را ثبت و مستند کنید.',
      page: 'measures', done: (ctx) => measuresTouchedInAxis(ctx, 'ب-4') > 0 },
    { key: 'bf_training', cadence: 'quarterly', title: 'ثبت آموزش‌های مادران',
      desc: 'جلسات آموزشی مادران را در «ثبت فعالیت‌ها» با شاهد (لیست حاضران) ثبت کنید.',
      page: 'activities', done: (ctx) => count('SELECT COUNT(*) c FROM activity_records WHERE hospital_id = ? AND recorded_by = ?', [ctx.hospitalId, ctx.userId]) > 0 },
  ],
};

/**
 * وظایف یک نقش، با وضعیت واقعی. خروجی هم‌شکل آیتم‌های guide-timeline است تا دستیار
 * بتواند بدون تبدیل اضافه، هر دو منبع را کنار هم نشان دهد.
 */
function dutiesFor(roleCode, hospitalId, userId) {
  const list = [...(DUTIES[roleCode] || []), ...COMMON];
  return list.map((d) => {
    const since = periodStart(d.cadence);
    const ctx = { hospitalId, userId, since };
    let done = false;
    try { done = !!d.done(ctx); } catch (e) { done = false; }  // نبودِ یک جدول نباید دستیار را بشکند
    return {
      key: 'duty_' + d.key,
      title: d.title,
      desc: d.desc,
      page: d.page,
      field: d.field || null,
      cadence: d.cadence,
      cadenceLabel: CADENCE_FA[d.cadence] || '',
      // ابتدای دوره‌ی جاری — دستیار با این تشخیص می‌دهد که «انجام دادمِ» دستیِ کاربر
      // مربوط به همین دوره بوده یا دوره‌ی قبل (کارِ ماهانه با یک‌بار زدن، برای همیشه
      // تمام‌شده نمی‌ماند).
      since: since || null,
      phase: 'وظایف سمت من',
      phaseLabel: 'وظایف جاری سمت من',
      done,
      progress: null,
      isDuty: true,
    };
  });
}

module.exports = { dutiesFor, periodProgress, DUTIES, CADENCE_FA };
