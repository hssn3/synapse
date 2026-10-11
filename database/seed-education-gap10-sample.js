/**
 * داده‌ی نمونه برای ماژولِ «آموزش و اثربخشی» و چهار تبِ تازه‌ی سنجه‌های پراکنده
 * ---------------------------------------------------------------------
 * همان قاعده‌ی دو سیدِ نمونه‌ی پیشین: فقط جدولِ **خالیِ** همان بیمارستان پر
 * می‌شود، و ترکیبِ داده عمداً صددرصد سبز نیست تا سیگنال‌های «کار من» روی
 * نمایش واقعاً روشن شوند.
 *
 * ستون‌های محاسباتی این‌جا دستی نوشته می‌شوند (درجِ مستقیم از مسیرِ validate
 * رد نمی‌شود)، ولی با همان فرمولِ سرور — رشد آگاهی = پس‌آزمون منهای
 * پیش‌آزمون، و «اثربخش» یعنی هر دو حیطه به هدف رسیده باشند. اگر این‌ها با هم
 * نخوانند، عددِ داشبورد با جدول نمی‌خواند.
 *
 * Run: node database/seed-education-gap10-sample.js (یا خودکار روی هر boot).
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');
const uid = () => crypto.randomUUID();
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const empty = (t, h) => !db.prepare(`SELECT 1 FROM ${t} WHERE hospital_id = ? LIMIT 1`).get(h);

/* ------------------------------------------------- آموزش و اثربخشی --- */

const POLICIES = [
  { title: 'سیاست آموزش بیماران بستری', audience: 'بیماران', level: 'بستری داخلی، جراحی و زنان',
    ver: '۲', approved: -300, comm: -295, method: 'ابلاغیه‌ی مدیریت پرستاری و جلسه‌ی سرپرستاران',
    review: -60, basis: 'نتایج ارزیابی اثربخشیِ دوره‌ی آموزش ترخیصِ نارسایی قلب: امتیازِ حیطه‌ی مهارت زیر هدف بود، پس روشِ آموزش از جزوه به چهره‌به‌چهره کنار تخت تغییر کرد.',
    due: 130,
    content: 'آموزش بیمار از بدو پذیرش آغاز و تا ترخیص ادامه می‌یابد؛ سطح آموزش متناسب با نوع مراقبت و سواد سلامتِ بیمار تعیین می‌شود.' },
  { title: 'سیاست آموزش بیماران سرپایی و درمانگاه', audience: 'بیماران', level: 'سرپایی و درمانگاه تخصصی',
    ver: '۱', approved: -180, comm: -176, method: 'ابلاغیه‌ی داخلی و نصب در درمانگاه',
    review: null, basis: null, due: 185,
    content: 'آموزش سرپایی بر خودمراقبتی و علائم هشدارِ مراجعه‌ی مجدد متمرکز است.' },
  // این یکی عمداً ابلاغ‌نشده مانده تا کارتِ داشبورد و کارتابل کارِ واقعی داشته باشند.
  { title: 'سیاست آموزش کارکنان پرستاری', audience: 'کارکنان پرستاری', level: 'همه‌ی بخش‌های بالینی',
    ver: '۱', approved: null, comm: null, method: null, review: null, basis: null, due: 90,
    content: 'پیش‌نویس؛ در انتظار طرح در کمیته‌ی آموزش.' },
];

const SESSIONS = [
  { p: 0, aud: 'بیماران و همراهان', title: 'آموزش خودمراقبتی بیمار دیابتی', topic: 'تزریق انسولین و پایش قند',
    ward: 'داخلی', d: -120, dur: 1.5, trainer: 'سوپروایزر آموزشی', method: 'چهره‌به‌چهره کنار تخت',
    inv: 24, par: 21,
    ef: { target: 70, pre: 38, post: 82, skillM: 'مشاهده‌ی مستقیم تزریق با چک‌لیست', skill: 79, cnt: 21,
      fed: 1, ref: 'بازنگری سیاست آموزش بیماران بستری، نسخه ۲' } },
  { p: 0, aud: 'بیماران و همراهان', title: 'آموزش ترخیصِ بیمار نارسایی قلب', topic: 'محدودیت مایعات و نمک، مصرف دیورتیک',
    ward: 'CCU', d: -88, dur: 1, trainer: 'پرستار آموزش', method: 'جزوه و پمفلت',
    inv: 18, par: 15,
    // عمداً زیرِ هدف، تا حلقه‌ی «اقدام اصلاحی» دیده شود — و همین شد مبنای بازنگریِ سیاست.
    ef: { target: 70, pre: 35, post: 74, skillM: 'پرسش و بازگوییِ بیمار', skill: 58, cnt: 15,
      action: 'روشِ آموزش از جزوه به چهره‌به‌چهره کنار تخت تغییر کرد و تماس پیگیری ۴۸ ساعته اضافه شد.',
      fed: 1, ref: 'بازنگری سیاست آموزش بیماران بستری، نسخه ۲' } },
  { p: null, aud: 'کارکنان', title: 'احیای قلبی-ریوی پایه (BLS)', topic: 'CPR بزرگسال و استفاده از AED',
    ward: 'همه‌ی بخش‌ها', d: -150, dur: 8, trainer: 'مدرس معتمد BLS', method: 'کارگاه عملی',
    inv: 40, par: 36,
    ef: { target: 75, pre: 44, post: 89, skillM: 'ارزیابی میدانی با مانکن و چک‌لیست مهارت', skill: 84, cnt: 36 } },
  { p: null, aud: 'کارکنان', title: 'بهداشت دست و احتیاطات استاندارد', topic: 'پنج موقعیت بهداشت دست',
    ward: 'همه‌ی بخش‌ها', d: -70, dur: 3, trainer: 'سوپروایزر کنترل عفونت', method: 'حضوری',
    inv: 60, par: 52,
    ef: { target: 80, pre: 61, post: 86, skillM: 'ارزیابی میدانیِ رعایت در شیفت', skill: 71, cnt: 52,
      action: 'پایشِ ماهانه‌ی رعایت بهداشت دست در سه بخشِ ضعیف‌تر، و بازآموزیِ کوتاه سرِ شیفت.' } },
  // عمداً بدون ارزیابیِ اثربخشی، تا کارتِ «برگزارشده و سنجیده‌نشده» صفر نباشد.
  { p: null, aud: 'کارکنان', title: 'کار با پمپ سرنگ و انفوزیون', topic: 'تنظیم و عیب‌یابی',
    ward: 'ICU', d: -20, dur: 4, trainer: 'کارشناس تجهیزات پزشکی', method: 'کارگاه عملی',
    inv: 22, par: 19, ef: null },
];

function seedEducation(hid) {
  if (!empty('edu_policies', hid)) return 0;
  let n = 0;
  const insP = db.prepare(`INSERT INTO edu_policies (id, hospital_id, title, audience, care_level,
    version, content, approved_by, approved_date, communicated, communication_method,
    communication_date, last_review_date, revision_basis, next_review_due, is_active)
    VALUES (?,?,?,?,?,?,?,'تیم رهبری و مدیریت پرستاری',?,?,?,?,?,?,?,1)`);
  const insS = db.prepare(`INSERT INTO edu_sessions (id, hospital_id, policy_id, audience, title,
    topic, ward, target_group, session_date, duration_hours, trainer, method, planned,
    participants_count, invited_count)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`);
  const insE = db.prepare(`INSERT INTO edu_effectiveness (id, hospital_id, session_id, eval_date,
    target_pct, pre_test_score, post_test_score, knowledge_gain, skill_method, skill_score,
    effective, evaluated_count, corrective_action, used_in_policy_review, policy_review_ref, evaluator)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'سوپروایزر آموزشی')`);
  const pids = [];
  const tx = db.transaction(() => {
    for (const p of POLICIES) {
      const id = uid(); pids.push(id); n++;
      insP.run(id, hid, p.title, p.audience, p.level, p.ver, p.content,
        p.approved == null ? null : iso(p.approved), p.comm == null ? 0 : 1, p.method,
        p.comm == null ? null : iso(p.comm), p.review == null ? null : iso(p.review),
        p.basis, iso(p.due));
    }
    for (const s of SESSIONS) {
      const sid = uid(); n++;
      insS.run(sid, hid, s.p == null ? null : pids[s.p], s.aud, s.title, s.topic, s.ward,
        s.aud === 'کارکنان' ? 'کادر پرستاری و بالینی' : 'بیمار و همراه', iso(s.d),
        s.dur, s.trainer, s.method, s.par, s.inv);
      if (!s.ef) continue;
      const e = s.ef; n++;
      // همان فرمولِ سرور، تا عددِ داشبورد با جدول یکی بماند.
      const effective = (e.post >= e.target && e.skill >= e.target) ? 1 : 0;
      insE.run(uid(), hid, sid, iso(s.d + 10), e.target, e.pre, e.post,
        Math.round((e.post - e.pre) * 100) / 100, e.skillM, e.skill, effective, e.cnt,
        e.action || null, e.fed || 0, e.ref || null);
    }
  });
  tx();
  return n;
}

/* ------------------------------------ چهار تبِ سنجه‌های پراکنده --- */

const COSTS = [
  { kind: 'خدمات گلوبال', title: 'سزارین (گلوبال)', year: '۱۴۰۵', period: 'بهار',
    cases: 118, tariff: 47200000000, cost: 44900000000, reg: 'کتاب ارزش نسبی خدمات سلامت، نسخه ۴',
    qs: 1, resp: 'مدیر مالی' },
  { kind: 'خدمات گلوبال', title: 'آپاندکتومی (گلوبال)', year: '۱۴۰۵', period: 'بهار',
    cases: 64, tariff: 12800000000, cost: 13450000000, reg: 'کتاب ارزش نسبی خدمات سلامت، نسخه ۴',
    qs: 1, resp: 'مدیر مالی',
    reason: 'افزایش قیمت ملزومات مصرفی لاپاروسکوپی نسبت به برآورد ابتدای سال.',
    action: 'مذاکره‌ی مجدد با تأمین‌کننده و اصلاح برآورد در متمم.' },
  { kind: 'سهم هتلینگ خدمات پرستاری', title: 'بخش داخلی', ward: 'داخلی', year: '۱۴۰۵', period: 'بهار',
    tariff: 9600000000, cost: 9150000000, share: 32.5, reg: 'دستورالعمل سهم هتلینگ خدمات پرستاری',
    qs: 1, resp: 'مدیر پرستاری' },
  { kind: 'سهم هتلینگ خدمات پرستاری', title: 'بخش جراحی', ward: 'جراحی', year: '۱۴۰۵', period: 'بهار',
    tariff: 8200000000, cost: 8410000000, share: 29.8, reg: 'دستورالعمل سهم هتلینگ خدمات پرستاری',
    qs: 1, resp: 'مدیر پرستاری',
    impact: 'کاهشِ ساعتِ کمک‌بهیار در شیفت عصر، زمانِ پاسخ به زنگِ بیمار را بلندتر کرد.',
    action: 'ساعتِ کمک‌بهیارِ شیفت عصر به سطحِ قبل بازگردانده شد و زمانِ پاسخ به زنگ شاخص شد.' },
];

// الف-۱-۹-۷ هدفش صفر است، پس نمونه عمداً کم و همه‌شان رفع‌شده‌اند — ولی صفر هم
// نیست، چون دفترِ همیشه‌خالی به ارزیاب می‌گوید «ثبت نمی‌کنند»، نه «رخ نمی‌دهد».
const DISRUPTIONS = [
  { d: -140, kind: 'تأخیر در ارائه خدمت', ward: 'رادیولوژی', service: 'سونوگرافی',
    cause: 'خرابی تجهیزات', dur: 120, pts: 6,
    desc: 'خرابی پروب سونوگرافی، تأخیر دو ساعته در نوبت‌های صبح.',
    res: 'پروب یدکی از انبار نصب و نوبت‌ها جبران شد.',
    action: 'خرید یک پروب پشتیبان و بستن قرارداد نگهداشت با زمان پاسخ ۲۴ ساعته.' },
  { d: -76, kind: 'تأخیر در ارائه خدمت', ward: 'اورژانس', service: 'آزمایش اورژانسی',
    cause: 'کمبود نیروی انسانی', dur: 45, pts: 9,
    desc: 'غیبت ناگهانی کارشناس آزمایشگاه در شیفت شب و تأخیر در جواب‌دهی اورژانسی.',
    res: 'کارشناس آنکال فراخوانده شد.',
    action: 'فهرست آنکالِ آزمایشگاه به‌روزرسانی و در تابلوی شیفت نصب شد.' },
];

const SURVEYS = [
  { year: '۱۴۰۴', round: 'نوبت اول', d: -540, inv: 248, par: 176, sat: 66.2, rec: 61,
    prev: null, issues: 'کمبود فضای استراحت و نارضایتی از توزیع شیفت شب.',
    action: 'تجهیز اتاق استراحت پرستاری و بازنگری چرخش شیفت شب.', owner: 'مدیر منابع انسانی',
    fu: 'اتاق استراحت دو بخش تجهیز شد.' },
  { year: '۱۴۰۴', round: 'نوبت دوم', d: -355, inv: 252, par: 189, sat: 69.1, rec: 64,
    prev: 66.2, issues: 'تأخیر در پرداخت کارانه.',
    action: 'پیگیری تسویه‌ی کارانه با مدیریت مالی و اعلام زمان‌بندی به کارکنان.',
    owner: 'مدیر مالی', fu: 'زمان‌بندی پرداخت اعلام و رعایت شد.' },
  { year: '۱۴۰۵', round: 'نوبت اول', d: -170, inv: 260, par: 198, sat: 72.4, rec: 68,
    prev: 69.1, issues: 'کمبود نیروی کمکی در شیفت عصر.',
    action: 'بازنگری برآورد نیرو در بخش‌های پرمراجعه و جذب دو کمک‌بهیار.',
    owner: 'مدیر پرستاری', fu: 'یک کمک‌بهیار جذب شد؛ نفر دوم در فرآیند است.' },
];

const STAKEHOLDERS = [
  { title: 'بیماران و همراهان', cat: 'بیماران و همراهان', key: 1, inf: 'زیاد', int: 'زیاد',
    needs: 'دسترسی به‌موقع به خدمات، شفافیت هزینه، احترام و حفظ حریم، آموزش قابل‌فهم.',
    exp: 'کاهش زمان انتظار و اطلاع‌رسانی روشن درباره‌ی روند درمان.',
    comm: 1, method: 'منشور حقوق بیمار در ورودی بخش‌ها، بروشور پذیرش و سایت', cd: -250 },
  { title: 'کارکنان بیمارستان', cat: 'کارکنان', key: 1, inf: 'زیاد', int: 'زیاد',
    needs: 'امنیت شغلی، پرداخت به‌موقع، ایمنی محیط کار، مسیر ارتقای شغلی.',
    exp: 'شنیده‌شدن نظرات و بهبود شرایط رفاهی.',
    comm: 1, method: 'ابلاغیه‌ی داخلی، جلسات ماهانه و تابلوی اعلانات', cd: -240 },
  { title: 'سازمان‌های بیمه‌گر (سلامت و تأمین اجتماعی)', cat: 'سازمان‌های بیمه‌گر', key: 1,
    inf: 'زیاد', int: 'متوسط',
    needs: 'رعایت ضوابط اسناد، کاهش کسورات، ارسال به‌موقع صورت‌حساب.',
    exp: 'انطباق کامل مستندات با دستورالعمل‌های بیمه‌ای.',
    comm: 1, method: 'نامه‌ی رسمی و جلسه‌ی مشترک فصلی', cd: -160 },
  { title: 'دانشگاه علوم پزشکی', cat: 'دانشگاه علوم پزشکی', key: 1, inf: 'زیاد', int: 'زیاد',
    needs: 'گزارش‌دهی دوره‌ای، اجرای برنامه‌های ابلاغی، آمادگی اعتباربخشی.',
    exp: 'ارتقای امتیاز اعتباربخشی و اجرای بسته‌های تحول.',
    comm: 1, method: 'مکاتبه‌ی رسمی و سامانه‌ی گزارش‌دهی', cd: -200 },
  { title: 'مجمع خیرین سلامت شهرستان', cat: 'خیرین و مؤسسات خیریه', key: 0, inf: 'متوسط', int: 'زیاد',
    needs: 'شفافیت مصرف کمک‌ها و گزارش نتیجه‌ی پروژه‌ها.',
    exp: 'مشارکت در تصمیم‌گیری پروژه‌های عمرانی.',
    comm: 1, method: 'نشست فصلی و گزارش تحلیلی مالی', cd: -120 },
  { title: 'جامعه‌ی محلی و شورای شهر', cat: 'جامعه‌ی محلی', key: 0, inf: 'کم', int: 'متوسط',
    needs: 'دسترسی به خدمات سرپایی و اطلاع‌رسانی درباره‌ی خدمات جدید.',
    exp: 'گسترش ساعات درمانگاه.', comm: 0, method: null, cd: null },
];

function seedGap10(hid) {
  let n = 0;
  if (empty('fin_cost_management', hid)) {
    const ins = db.prepare(`INSERT INTO fin_cost_management (id, hospital_id, kind, title, ward,
      year, period, cases_count, tariff_amount, actual_cost, variance, variance_pct,
      nursing_share_pct, regulation_ref, quality_safety_reviewed, quality_safety_impact,
      deviation_reason, corrective_action, responsible)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const tx = db.transaction(() => {
      for (const c of COSTS) {
        const v = c.tariff - c.cost;
        ins.run(uid(), hid, c.kind, c.title, c.ward || null, c.year, c.period, c.cases || null,
          c.tariff, c.cost, v, Math.round((v / c.tariff) * 1000) / 10, c.share || null,
          c.reg, c.qs, c.impact || null, c.reason || null, c.action || null, c.resp);
        n++;
      }
    });
    tx();
  }
  if (empty('service_disruptions', hid)) {
    const ins = db.prepare(`INSERT INTO service_disruptions (id, hospital_id, event_date, kind, ward,
      service, cause_category, description, duration_minutes, patients_affected, harm_occurred,
      resolved, resolution, corrective_action, reported_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,0,1,?,?,'سوپروایزر بالینی')`);
    const tx = db.transaction(() => {
      for (const d of DISRUPTIONS) {
        ins.run(uid(), hid, iso(d.d), d.kind, d.ward, d.service, d.cause, d.desc, d.dur, d.pts,
          d.res, d.action);
        n++;
      }
    });
    tx();
  }
  if (empty('staff_surveys', hid)) {
    const ins = db.prepare(`INSERT INTO staff_surveys (id, hospital_id, year, round, survey_date,
      instrument, validity_checked, invited_count, participants_count, response_rate,
      satisfaction_score, recommend_score, prev_satisfaction_score, trend, top_issues,
      corrective_action, action_owner, followup_result)
      VALUES (?,?,?,?,?,'پرسشنامه استاندارد رضایت شغلی (تأییدشده توسط دفتر بهبود کیفیت)',1,?,?,?,?,?,?,?,?,?,?,?)`);
    const tx = db.transaction(() => {
      for (const s of SURVEYS) {
        ins.run(uid(), hid, s.year, s.round, iso(s.d), s.inv, s.par,
          Math.round((s.par / s.inv) * 1000) / 10, s.sat, s.rec, s.prev,
          s.prev == null ? null : Math.round((s.sat - s.prev) * 100) / 100,
          s.issues, s.action, s.owner, s.fu);
        n++;
      }
    });
    tx();
  }
  if (empty('stakeholders', hid)) {
    const ins = db.prepare(`INSERT INTO stakeholders (id, hospital_id, title, category, influence,
      interest, is_key, needs_analysis, expectations, policy_communicated, communication_method,
      communication_date, analysis_date)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const tx = db.transaction(() => {
      for (const s of STAKEHOLDERS) {
        ins.run(uid(), hid, s.title, s.cat, s.inf, s.int, s.key, s.needs, s.exp, s.comm,
          s.method, s.cd == null ? null : iso(s.cd), iso(-280));
        n++;
      }
    });
    tx();
  }
  return n;
}

function runMigration() {
  console.log('[Seed Education+Gap10 Sample] Starting...');
  try {
    let edu = 0, gap = 0;
    for (const h of db.prepare('SELECT id FROM hospitals').all()) {
      edu += seedEducation(h.id);
      gap += seedGap10(h.id);
    }
    console.log(`[Seed Education+Gap10 Sample] ✅ آموزش: ${edu} رکورد | سنجه‌های پراکنده: ${gap} رکورد`);
  } catch (err) {
    console.error('[Seed Education+Gap10 Sample] ❌ Failed:', err.message);
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
