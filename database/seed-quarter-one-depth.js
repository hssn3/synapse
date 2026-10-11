/* =====================================================================
   عمق‌دادن به نمونه‌ی سه‌ماهه‌ی اول
   ---------------------------------------------------------------------
   فایل قبلی (seed-quarter-one-sample.js) ستون فقرات را پر کرد. ممیزی روی
   دیتابیس تازه نشان داد ۲۴ جدول هنوز خالی‌اند و چند ماژول در دمو مرده
   دیده می‌شوند: کارتابل، داشبورد سرپرستار بخش، فعالیت‌های فرم‌ساز، شواهد
   پیوست سنجه، تاریخچه‌ی نسخه‌ی اسناد، و مصوبه‌های واکراند.

   این فایل همان‌ها را پر می‌کند و «چند نمونه در هر ماه» می‌گذارد، نه یکی:
   شاخص‌های BSC از ۴ به ۱۰ می‌رسند (هر چهار وجه)، چک‌لیست‌ها و گواهینامه‌ها
   و FMEA بیش از یک ردیف می‌گیرند، و نظرسنجی داخلی برای هر ماه ثبت می‌شود.

   قواعد همان فایل قبلی: idempotent، تاریخ‌ها از تقویم جلالی حساب و به
   میلادیِ ISO ذخیره می‌شوند، و هیچ نام واقعیِ شخصی ساخته نمی‌شود.
   ===================================================================== */
'use strict';

const crypto = require('crypto');
const { query } = require('../src/config/database');
const { toGregorian } = require('../src/config/jalali');

const uid = () => crypto.randomUUID();
const g = (jy, jm, jd) => {
  const d = toGregorian(jy, jm, jd);
  return `${d.gy}-${String(d.gm).padStart(2, '0')}-${String(d.gd).padStart(2, '0')}`;
};

const YEAR = 1405;
const Q1 = [1, 2, 3];
const MONTH_FA = ['فروردین', 'اردیبهشت', 'خرداد'];

const has = (t, c) => {
  try { return query(`PRAGMA table_info(${t})`).rows.some(x => x.name === c); }
  catch (e) { return false; }
};
const cnt = (sql, p) => { try { return query(sql, p).rows[0].c; } catch (e) { return -1; } };

function seedQuarterOneDepth() {
  const hosp = query(
    `SELECT h.id, h.name FROM hospitals h
       JOIN accreditation_periods p ON p.hospital_id = h.id AND p.is_active = 1
      WHERE h.is_active = 1 AND p.start_year = ?
      ORDER BY h.created_at LIMIT 1`, [YEAR]).rows[0];
  if (!hosp) { console.log('[seed-q1-depth] بیمارستانی با دوره‌ی فعال ۱۴۰۵ نیست — رد شد'); return; }
  const HID = hosp.id;

  const users = query(
    `SELECT u.id, u.full_name, r.code FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.hospital_id = ? ORDER BY u.created_at`, [HID]).rows;
  if (!users.length) { console.log('[seed-q1-depth] کاربری نیست — رد شد'); return; }
  const pick = code => (users.find(u => u.code === code) || users[0]).id;
  const BY = pick('accreditation_manager');
  const NURSE_DIR = pick('nursing_director');
  const nurses = users.filter(u => u.code === 'staff_nurse').slice(0, 6);
  const nurseIds = (nurses.length ? nurses : users.slice(0, 4)).map(u => u.id);

  let n = 0;

  /* ---------- ۱) اتاق‌های جلسه ---------- */
  // روی دیتابیس تازه این جدول خالی بود، پس جلسه‌های seed‌شده اتاق نداشتند و
  // قفلِ تشخیص تداخل رزرو عملاً چیزی برای محافظت نداشت.
  const ROOMS = [
    { t: 'اتاق جلسات ریاست', c: 14, l: 'ساختمان اداری — طبقه سوم' },
    { t: 'سالن کنفرانس آموزش', c: 45, l: 'ساختمان آموزش — طبقه همکف' },
    { t: 'اتاق جلسات دفتر پرستاری', c: 10, l: 'ساختمان درمان — طبقه دوم' },
    { t: 'اتاق کمیته‌ها', c: 20, l: 'ساختمان اداری — طبقه دوم' }
  ];
  for (const r of ROOMS) {
    if (cnt('SELECT COUNT(*) c FROM committee_meeting_rooms WHERE hospital_id=? AND name=?', [HID, r.t]) !== 0) continue;
    query(`INSERT INTO committee_meeting_rooms (id,hospital_id,name,capacity,location,is_active,created_at)
           VALUES (?,?,?,?,?,1,datetime('now'))`, [uid(), HID, r.t, r.c, r.l]);
    n++;
  }
  // جلسه‌هایی که بدون اتاق ثبت شده بودند را به اتاق‌ها وصل کن
  const roomRows = query('SELECT id FROM committee_meeting_rooms WHERE hospital_id=? ORDER BY name', [HID]).rows;
  if (roomRows.length) {
    const orphan = query(
      `SELECT id FROM calendar_events WHERE hospital_id=? AND event_type='committee_meeting' AND room_id IS NULL`,
      [HID]).rows;
    orphan.forEach((e, i) => {
      query('UPDATE calendar_events SET room_id=? WHERE id=?', [roomRows[i % roomRows.length].id, e.id]);
      n++;
    });
  }

  /* ---------- ۲) شاخص‌های بیشتر برای کارت امتیازی و نمودارها ---------- */
  // چهار شاخصِ قبلی برای «نمودار» کم بود. شش شاخص دیگر، متوازن روی هر چهار
  // وجه، با مقدار هر سه ماه — تا روند واقعی دیده شود.
  const MORE_KPI = [
    { t: 'درصد تکمیل پرونده‌ی پزشکی', p: 'فرآیندهای داخلی', u: 'درصد', tv: 95, hb: 1,
      d: 'نسبت پرونده‌های بدون نقص مستندسازی به کل پرونده‌های بررسی‌شده در ماه.',
      v: [88.0, 90.5, 93.2] },
    { t: 'نرخ عفونت بیمارستانی', p: 'فرآیندهای داخلی', u: 'در هزار', tv: 2, hb: 0,
      d: 'تعداد عفونت مرتبط با مراقبت به ازای هزار بیمار-روز بستری.',
      v: [2.8, 2.4, 2.1] },
    { t: 'میانگین زمان انتظار پذیرش سرپایی', p: 'گیرنده خدمت', u: 'دقیقه', tv: 15, hb: 0,
      d: 'فاصله‌ی زمانی رسیدن مراجع تا تکمیل پذیرش، با نمونه‌گیری هفتگی.',
      v: [26.0, 21.5, 17.8] },
    { t: 'نرخ بازگشت بیمار ظرف ۷۲ ساعت', p: 'گیرنده خدمت', u: 'درصد', tv: 3, hb: 0,
      d: 'نسبت بیماران بازگشته به اورژانس ظرف ۷۲ ساعت پس از ترخیص.',
      v: [4.1, 3.6, 3.2] },
    { t: 'درصد تحقق درآمد نسبت به بودجه', p: 'مالی', u: 'درصد', tv: 100, hb: 1,
      d: 'نسبت درآمد محقق‌شده به درآمد پیش‌بینی‌شده در بودجه‌ی مصوب ماه.',
      v: [92.5, 96.0, 99.1] },
    { t: 'نرخ ترک خدمت کارکنان پرستاری', p: 'رشد و یادگیری', u: 'درصد', tv: 2, hb: 0,
      d: 'نسبت پرستاران خارج‌شده از خدمت به میانگین تعداد پرستاران در ماه.',
      v: [2.6, 2.3, 1.9] }
  ];
  for (const k of MORE_KPI) {
    let row = query('SELECT id FROM hospital_kpis WHERE hospital_id=? AND title=?', [HID, k.t]).rows[0];
    if (!row) {
      const id = uid();
      query(`INSERT INTO hospital_kpis
               (id,hospital_id,title,definition,target_value,is_active,bsc_perspective,unit,higher_is_better,created_at)
             VALUES (?,?,?,?,?,1,?,?,?,datetime('now'))`,
        [id, HID, k.t, k.d, k.tv, k.p, k.u, k.hb]);
      row = { id }; n++;
    }
    Q1.forEach((m, i) => {
      if (cnt('SELECT COUNT(*) c FROM bsc_monthly_values WHERE hospital_id=? AND kpi_id=? AND jalali_year=? AND jalali_month=?',
        [HID, row.id, YEAR, m]) !== 0) return;
      query(`INSERT INTO bsc_monthly_values
               (id,hospital_id,kpi_id,jalali_year,jalali_month,value,note,recorded_by,recorded_at)
             VALUES (?,?,?,?,?,?,?,?,?)`,
        [uid(), HID, row.id, YEAR, m, k.v[i],
         `ثبت ${MONTH_FA[i]} ${YEAR} توسط دفتر بهبود کیفیت.`, BY, g(YEAR, m, 28)]);
      n++;
    });
  }

  /* ---------- ۳) نظرسنجی رضایت داخلی — چند نمونه در هر ماه ---------- */
  const SURVEY_DEPTS = ['بخش داخلی زنان', 'بخش داخلی مردان', 'اورژانس', 'بخش جراحی',
    'بخش کودکان', 'درمانگاه تخصصی', 'بخش ویژه قلب', 'تصویربرداری', 'آزمایشگاه'];
  const QSET = ['نحوه‌ی برخورد کارکنان', 'پاکیزگی محیط', 'زمان انتظار',
    'توضیح پزشک درباره‌ی روند درمان', 'کیفیت غذا', 'آرامش و سکوت بخش'];
  if (has('patient_satisfaction_surveys', 'overall_score')) {
    let i = 0;
    for (const m of Q1) {
      for (let k = 0; k < 4; k++) {         // چهار نظرسنجی در هر ماه
        const dep = SURVEY_DEPTS[i % SURVEY_DEPTS.length];
        const day = 4 + k * 7;
        const when = g(YEAR, m, day);
        if (cnt('SELECT COUNT(*) c FROM patient_satisfaction_surveys WHERE hospital_id=? AND department=? AND submitted_at=?',
          [HID, dep, when]) !== 0) { i++; continue; }
        // امتیازها عمداً یکنواخت نیستند و «زمان انتظار» پایین‌ترین است — با
        // شکایت‌های ثبت‌شده و شاخص رضایتِ زیر تارگت هم‌خوان باشد.
        const answers = QSET.map(q => ({
          question: q,
          score: q === 'زمان انتظار' ? 2 + (i % 2) : (q === 'کیفیت غذا' ? 3 + (i % 2) : 4 + (i % 2))
        }));
        const avg = answers.reduce((s, a) => s + a.score, 0) / answers.length;
        query(`INSERT INTO patient_satisfaction_surveys
                 (id,hospital_id,department,questions_and_answers,overall_score,submitted_at)
               VALUES (?,?,?,?,?,?)`,
          [uid(), HID, dep, JSON.stringify(answers), Math.round(avg * 100) / 100, when]);
        n++; i++;
      }
    }
  }

  /* ---------- ۴) کارتابل: پیام‌های داخلی ---------- */
  const MSGS = [
    { m: 1, d: 14, s: 'ابلاغ برنامه‌ی ممیزی داخلی سه‌ماهه‌ی اول', c: 'اداری',
      b: 'برنامه‌ی ممیزی داخلی سه‌ماهه‌ی اول ابلاغ شد. مسئولان بخش‌ها تا پایان فروردین فهرست اسناد کنترل‌شده‌ی واحد خود را به‌روزرسانی و به دفتر بهبود کیفیت اعلام کنند.' },
    { m: 1, d: 27, s: 'یادآوری: تکمیل نیازسنجی آموزشی سال', c: 'آموزش',
      b: 'مهلت ثبت نیازهای آموزشی تا پایان اردیبهشت است. هر کارمند می‌تواند مستقیماً از منوی «نیازسنجی آموزشی» نیاز خود را ثبت کند؛ تأیید سرپرست در همان صفحه انجام می‌شود.' },
    { m: 2, d: 9, s: 'نتیجه‌ی بازدید میدانی مدیریتی بخش اورژانس', c: 'کیفیت',
      b: 'دو مورد در بازدید فروردین شناسایی شد: نبود برچسب تاریخ روی ست‌های استریل ترالی، و شلوغی راهروی ورودی در ساعت اوج. مهلت رفع تا پایان اردیبهشت تعیین شده است.' },
    { m: 2, d: 23, s: 'ابلاغ فرم بازنگری‌شده‌ی رضایت آگاهانه', c: 'اداری',
      b: 'فرم رضایت آگاهانه بر اساس مصوبه‌ی کمیته‌ی اخلاق بازنگری شد و از ابتدای خرداد در همه‌ی اعمال جراحی نسخه‌ی جدید استفاده می‌شود. نسخه‌ی قبلی از بخش‌ها جمع‌آوری گردد.' },
    { m: 3, d: 8, s: 'گزارش شاخص‌های سه‌ماهه به ریاست', c: 'کیفیت',
      b: 'گزارش شاخص‌های کارت امتیازی متوازن سه‌ماهه‌ی اول آماده شد. شاخص رضایت گیرنده خدمت همچنان زیر تارگت است و تحلیل علت تا پایان تیر ارائه می‌شود.' },
    { m: 3, d: 20, s: 'برنامه‌ی دوره‌ی احیای قلبی‌ریوی — گروه سوم', c: 'آموزش',
      b: 'گروه سوم دوره‌ی احیای قلبی‌ریوی پایه در تاریخ‌های اعلام‌شده برگزار می‌شود. سرپرستاران بخش‌ها فهرست شرکت‌کنندگان را به دفتر پرستاری اعلام کنند.' }
  ];
  for (const m of MSGS) {
    if (cnt('SELECT COUNT(*) c FROM internal_messages WHERE hospital_id=? AND subject=?', [HID, m.s]) !== 0) continue;
    const when = g(YEAR, m.m, m.d);
    query(`INSERT INTO internal_messages
             (id,hospital_id,sender_id,recipient_id,subject,body,category,is_read,is_draft,sent_at,created_at)
           VALUES (?,?,?,?,?,?,?,?,0,?,?)`,
      [uid(), HID, BY, NURSE_DIR, m.s, m.b, m.c, m.m === 3 ? 0 : 1, when, when]);
    n++;
  }

  /* ---------- ۵) داشبورد سرپرستار بخش ---------- */
  // ستون نام بخش در این جدول title است نه name
  const wards = query('SELECT title AS name FROM nursing_wards WHERE hospital_id=? ORDER BY title LIMIT 4', [HID]).rows;
  if (wards.length && nurseIds.length) {
    // حضور و غیاب: سه روز نمونه در هر ماه، برای هر بخش
    for (const m of Q1) {
      for (const day of [6, 15, 24]) {
        const when = g(YEAR, m, day);
        for (const w of wards) {
          nurseIds.forEach((nid, idx) => {
            if (cnt('SELECT COUNT(*) c FROM nursing_daily_attendance WHERE hospital_id=? AND ward=? AND att_date=? AND nurse_id=?',
              [HID, w.name, when, nid]) !== 0) return;
            // یک نفر در هر بخش/روز غایب، با علت — تا صفحه واقعی به‌نظر برسد
            const absent = (idx === (day % nurseIds.length));
            query(`INSERT INTO nursing_daily_attendance
                     (id,hospital_id,ward,att_date,nurse_id,present,note,marked_by,updated_at)
                   VALUES (?,?,?,?,?,?,?,?,datetime('now'))`,
              [uid(), HID, w.name, when, nid, absent ? 0 : 1,
               absent ? 'مرخصی استحقاقی — تأییدشده' : null, NURSE_DIR]);
            n++;
          });
        }
      }
    }
    // گزارش شیفت: یکی در ماه برای هر بخش
    for (const m of Q1) {
      for (const w of wards) {
        const when = g(YEAR, m, 12);
        if (cnt('SELECT COUNT(*) c FROM nursing_shift_reports WHERE hospital_id=? AND shift_date=? AND shift_type=? AND nurse_id=?',
          [HID, when, 'صبح', nurseIds[0]]) !== 0) continue;
        query(`INSERT INTO nursing_shift_reports
                 (id,hospital_id,patient_reference,nurse_id,shift_type,shift_date,structured_data,free_text_notes,created_at)
               VALUES (?,?,?,?,?,?,?,?,datetime('now'))`,
          [uid(), HID, `${w.name} — تحویل شیفت`, nurseIds[0], 'صبح', when,
           JSON.stringify({ 'تعداد بیمار بستری': 8 + (m * 2), 'بیمار بدحال': m === 1 ? 1 : 0,
             'داروی پرخطر در جریان': m, 'تجهیز معیوب': 0 }),
           'تحویل شیفت بدون مورد خاص انجام شد. داروهای پرخطر شمارش و در حضور شیفت بعد تحویل داده شد.']);
        n++;
      }
    }
    // درخواست مرخصی در وضعیت‌های مختلف
    const LEAVES = [
      { m: 1, s: 10, e: 12, st: 'approved', r: 'مرخصی استحقاقی' },
      { m: 2, s: 5, e: 5, st: 'approved', r: 'مرخصی ساعتی — مراجعه به پزشک' },
      { m: 2, s: 19, e: 22, st: 'rejected', r: 'مرخصی استحقاقی — همزمانی با کمبود نیرو' },
      { m: 3, s: 14, e: 16, st: 'pending', r: 'مرخصی استحقاقی' }
    ];
    LEAVES.forEach((L, i) => {
      const nid = nurseIds[i % nurseIds.length], w = wards[i % wards.length].name;
      if (cnt('SELECT COUNT(*) c FROM nursing_leave_requests WHERE hospital_id=? AND nurse_id=? AND start_date=?',
        [HID, nid, g(YEAR, L.m, L.s)]) !== 0) return;
      query(`INSERT INTO nursing_leave_requests
               (id,hospital_id,nurse_id,ward,start_date,end_date,reason,status,reviewed_by,reviewed_at,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
        [uid(), HID, nid, w, g(YEAR, L.m, L.s), g(YEAR, L.m, L.e), L.r, L.st,
         L.st === 'pending' ? null : NURSE_DIR, L.st === 'pending' ? null : g(YEAR, L.m, L.s - 2)]);
      n++;
    });
    // وظایف شیفت
    for (const m of Q1) {
      const when = g(YEAR, m, 18), w = wards[0].name;
      if (cnt('SELECT COUNT(*) c FROM nursing_shift_tasks WHERE hospital_id=? AND ward=? AND shift_date=?',
        [HID, w, when]) !== 0) continue;
      query(`INSERT INTO nursing_shift_tasks
               (id,hospital_id,ward,shift_date,shift_type,task_list,filled_by,filled_at,created_at,updated_at)
             VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
        [uid(), HID, w, when, 'صبح',
         JSON.stringify([
           { task: 'کنترل و ثبت علائم حیاتی همه‌ی بیماران', done: true },
           { task: 'بررسی تاریخ انقضای داروهای ترالی اورژانس', done: true },
           { task: 'کنترل دمای یخچال دارو و ثبت در فرم', done: true },
           { task: 'بررسی نرده‌ی تخت بیماران پرخطر سقوط', done: m !== 3 },
           { task: 'تکمیل فرم مراقبت روزانه‌ی کاتتر', done: m === 3 }
         ]), NURSE_DIR, when]);
      n++;
    }
  }

  /* ---------- ۶) مصوبه‌های بازدید میدانی ---------- */
  const walks = query('SELECT id, department FROM management_walkarounds WHERE hospital_id=? ORDER BY visit_date', [HID]).rows;
  const WA_RES = [
    ['برچسب‌گذاری تاریخ روی ست‌های استریل ترالی اورژانس', 'done'],
    ['بازطراحی مسیر ورودی برای کاهش ازدحام ساعت اوج', 'in_progress'],
    ['تأمین نیروی پرستاری شیفت شب پنج‌شنبه‌ها', 'in_progress'],
    ['تفکیک مسیر ظروف تمیز و کثیف در آشپزخانه', 'pending'],
    ['بهبود تهویه‌ی آشپزخانه در ساعات اوج پخت', 'pending']
  ];
  walks.forEach((w, wi) => {
    WA_RES.slice(wi * 2, wi * 2 + 2).forEach((r, ri) => {
      if (cnt('SELECT COUNT(*) c FROM walkaround_resolutions WHERE hospital_id=? AND walkaround_id=? AND description=?',
        [HID, w.id, r[0]]) !== 0) return;
      query(`INSERT INTO walkaround_resolutions
               (id,walkaround_id,hospital_id,description,responsible_name,department,status,due_date,completed_at,sort_order,created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
        [uid(), w.id, HID, r[0], 'مسئول همان بخش', w.department, r[1],
         g(YEAR, 4, 10 + ri * 5), r[1] === 'done' ? g(YEAR, 3, 2) : null, ri]);
      n++;
    });
  });

  /* ---------- ۷) فعالیت‌ها (فرم‌ساز داده‌محور) ---------- */
  const ACT_TYPES = [
    { mod: 'کنترل عفونت', t: 'پایش بهداشت دست',
      d: 'مشاهده‌ی مستقیم رعایت بهداشت دست در پنج موقعیت، در یک بخش مشخص.',
      schema: [
        { key: 'ward', label: 'بخش', type: 'text', required: true },
        { key: 'observed', label: 'تعداد موقعیت مشاهده‌شده', type: 'number', required: true },
        { key: 'compliant', label: 'تعداد رعایت‌شده', type: 'number', required: true },
        { key: 'shift', label: 'شیفت', type: 'select', options: ['صبح', 'عصر', 'شب'] },
        { key: 'note', label: 'توضیح', type: 'textarea' }
      ] },
    { mod: 'ایمنی بیمار', t: 'کنترل ترالی اورژانس',
      d: 'بررسی کامل بودن، تاریخ انقضا و پلمب ترالی احیا.',
      schema: [
        { key: 'ward', label: 'بخش', type: 'text', required: true },
        { key: 'seal_ok', label: 'پلمب سالم است؟', type: 'select', options: ['بله', 'خیر'], required: true },
        { key: 'expired_items', label: 'تعداد اقلام منقضی', type: 'number' },
        { key: 'action', label: 'اقدام انجام‌شده', type: 'textarea' }
      ] },
    { mod: 'تغذیه', t: 'کنترل دمای یخچال و سردخانه',
      d: 'ثبت روزانه‌ی دمای یخچال‌های نگهداری مواد غذایی.',
      schema: [
        { key: 'place', label: 'محل', type: 'select', options: ['یخچال آشپزخانه', 'سردخانه', 'یخچال شیرخوارگاه'], required: true },
        { key: 'temp', label: 'دمای ثبت‌شده (سانتی‌گراد)', type: 'number', required: true },
        { key: 'in_range', label: 'در محدوده‌ی مجاز بود؟', type: 'select', options: ['بله', 'خیر'], required: true }
      ] }
  ];
  const typeIds = {};
  for (const a of ACT_TYPES) {
    let row = query('SELECT id FROM activity_types WHERE hospital_id=? AND title=?', [HID, a.t]).rows[0];
    if (!row) {
      const id = uid();
      query(`INSERT INTO activity_types
               (id,hospital_id,module,title,description,form_schema,requires_evidence_upload,is_active,created_at)
             VALUES (?,?,?,?,?,?,0,1,datetime('now'))`,
        [id, HID, a.mod, a.t, a.d, JSON.stringify(a.schema)]);
      row = { id }; n++;
    }
    typeIds[a.t] = row.id;
  }
  // چند ثبت در هر ماه برای هر نوع فعالیت
  const ACT_DATA = {
    'پایش بهداشت دست': m => ({ ward: ['بخش داخلی زنان', 'اورژانس', 'بخش ویژه قلب'][m - 1],
      observed: 40, compliant: [31, 34, 37][m - 1], shift: ['صبح', 'عصر', 'صبح'][m - 1],
      note: `رعایت ${[78, 85, 93][m - 1]} درصد؛ نتیجه به کمیته‌ی کنترل عفونت گزارش شد.` }),
    'کنترل ترالی اورژانس': m => ({ ward: ['اورژانس', 'بخش جراحی', 'بخش ویژه قلب'][m - 1],
      seal_ok: m === 2 ? 'خیر' : 'بله', expired_items: m === 2 ? 2 : 0,
      action: m === 2 ? 'دو قلم منقضی تعویض و ترالی مجدداً پلمب شد.' : 'موردی مشاهده نشد.' }),
    'کنترل دمای یخچال و سردخانه': m => ({ place: ['یخچال آشپزخانه', 'سردخانه', 'یخچال شیرخوارگاه'][m - 1],
      temp: [4.1, -18.2, 3.8][m - 1], in_range: 'بله' })
  };
  for (const [title, tid] of Object.entries(typeIds)) {
    for (const m of Q1) {
      for (const day of [7, 21]) {          // دو ثبت در هر ماه
        const when = g(YEAR, m, day);
        if (cnt('SELECT COUNT(*) c FROM activity_records WHERE hospital_id=? AND activity_type_id=? AND occurred_at=?',
          [HID, tid, when]) !== 0) continue;
        query(`INSERT INTO activity_records
                 (id,hospital_id,activity_type_id,recorded_by,department,form_data,status,occurred_at,
                  is_confidential,is_anonymous_submission,created_at,updated_at)
               VALUES (?,?,?,?,?,?,?,?,0,0,datetime('now'),datetime('now'))`,
          [uid(), HID, tid, BY, 'دفتر بهبود کیفیت',
           JSON.stringify(ACT_DATA[title](m)), 'submitted', when]);
        n++;
      }
    }
  }

  /* ---------- ۸) چک‌لیست، گواهینامه، FMEA، کتابخانه — بیش از یک ردیف ---------- */
  const CERTS = [
    { t: 'گواهینامه ایمنی و سلامت شغلی ISO 45001', b: 'شرکت گواهی‌دهنده بین‌المللی', i: [1, 12], e: [12, 20], st: 'valid' },
    { t: 'تأییدیه سالانه‌ی سیستم اعلام و اطفای حریق', b: 'سازمان آتش‌نشانی', i: [1, 25], e: [12, 25], st: 'valid' },
    { t: 'گواهی کالیبراسیون تجهیزات آزمایشگاه', b: 'آزمایشگاه مرجع سنجش', i: [2, 8], e: [8, 8], st: 'valid' },
    { t: 'مجوز کار با اشعه — واحد تصویربرداری', b: 'واحد بهداشت پرتوها', i: [2, 18], e: [5, 18], st: 'expiring' },
    { t: 'گواهی بهداشت پرسنل آشپزخانه', b: 'مرکز بهداشت شهرستان', i: [3, 3], e: [9, 3], st: 'valid' }
  ];
  const hasCertEx = has('certifications', 'is_example');
  for (const c of CERTS) {
    if (cnt('SELECT COUNT(*) c FROM certifications WHERE hospital_id=? AND title=?', [HID, c.t]) !== 0) continue;
    const cols = ['id', 'hospital_id', 'title', 'issuing_body', 'issue_date', 'expiry_date', 'status', 'created_by'];
    const vals = [uid(), HID, c.t, c.b, g(YEAR, c.i[0], c.i[1]), g(YEAR, c.e[0], c.e[1]), c.st, BY];
    if (hasCertEx) { cols.push('is_example'); vals.push(1); }
    query(`INSERT INTO certifications (${cols.join(',')},created_at,updated_at)
           VALUES (${cols.map(() => '?').join(',')},datetime('now'),datetime('now'))`, vals);
    n++;
  }

  const FMEAS = [
    { s: 'خطای دارویی در مرحله‌ی تجویز', dep: 'بخش داخلی زنان', area: 'فرایندهای بالینی', type: 'بالینی', m: 1, d: 16,
      fm: 'ثبت ناخوانا یا ناقص دستور دارویی در کاردکس',
      rc: 'دست‌نویس بودن دستور، شباهت نام داروها، شلوغی زمان راند',
      ef: 'تجویز داروی نادرست یا دوز نادرست به بیمار',
      ec: 'بازخوانی دستور توسط پرستار، کنترل دوم پیش از تجویز',
      ra: 'الزام ثبت الکترونیک دستور دارویی، جداسازی فیزیکی داروهای هم‌نام، برچسب هشدار روی داروهای پرخطر' },
    { s: 'سقوط بیمار در مسیر سرویس بهداشتی', dep: 'بخش داخلی مردان', area: 'فرایندهای بالینی', type: 'ایمنی بیمار', m: 2, d: 11,
      fm: 'برخاستن بیمار پرخطر بدون همراه و بدون کمک',
      rc: 'نبود ارزیابی ریسک سقوط هنگام پذیرش، پایین بودن نرده در شیفت شب، کف لغزنده',
      ef: 'شکستگی، افزایش مدت اقامت، آسیب جبران‌ناپذیر در سالمند',
      ec: 'راند شیفت، زنگ احضار کنار تخت',
      ra: 'افزودن ارزیابی ریسک سقوط به فرم پذیرش، دستبند شناسایی پرخطر، کنترل نرده در هر راند، کف‌پوش ضدلغزش' },
    { s: 'تأخیر در اعلام مقادیر بحرانی آزمایشگاه', dep: 'آزمایشگاه', area: 'فرایندهای پاراکلینیک', type: 'فرایندی', m: 3, d: 5,
      fm: 'اعلام نشدن یا دیر اعلام‌شدن نتیجه‌ی بحرانی به پزشک معالج',
      rc: 'نبود سقف زمانی مشخص، ثبت‌نشدن گیرنده‌ی پیام، شلوغی شیفت',
      ef: 'تأخیر در اقدام درمانی و بدترشدن وضعیت بیمار',
      ec: 'تماس تلفنی مسئول شیفت آزمایشگاه',
      ra: 'تعیین سقف ۱۵ دقیقه برای اعلام، الزام ثبت نام گیرنده و ساعت، هشدار خودکار در سامانه' }
  ];
  const hasFmeaEx = has('fmea_records', 'is_example');
  for (const f of FMEAS) {
    if (cnt('SELECT COUNT(*) c FROM fmea_records WHERE hospital_id=? AND subject=?', [HID, f.s]) !== 0) continue;
    const cols = ['id', 'hospital_id', 'reporter_name', 'subject', 'reporting_department',
      'related_hazard_area', 'hazard_type', 'failure_modes', 'root_causes', 'effects', 'existing_controls', 'recommended_actions',
      'source', 'status', 'created_by', 'submitted_at'];
    // status='closed': علت ریشه‌ای و اقدام اصلاحی هر سه رکورد از قبل مشخص است — یعنی
    // بررسی FMEA تمام شده، نه فقط «ثبت‌شده»/«در حال بررسی». مقدار قبلی 'reviewed' اصلاً
    // در FMEA_STATUSES (new/in_review/closed در src/routes/api.js) معتبر نبود؛ نتیجه‌اش
    // نمایش کد خام انگلیسی به‌جای برچسب فارسی روی صفحه‌ی FMEA بود.
    const vals = [uid(), HID, 'کارشناس ایمنی بیمار', f.s, f.dep, f.area, f.type, f.fm, f.rc, f.ef, f.ec, f.ra,
      'داخلی', 'closed', BY, g(YEAR, f.m, f.d)];
    if (hasFmeaEx) { cols.push('is_example'); vals.push(1); }
    query(`INSERT INTO fmea_records (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
    n++;
  }
  // بک‌فیل برای دیتابیس‌هایی که این سه ردیف را قبلاً با status='reviewed' و بدون
  // حیطه‌خطر/دسته‌بندی ساخته‌اند (چک idempotent بالا با insert دوباره از رویشان رد می‌شود)
  query("UPDATE fmea_records SET status='closed' WHERE hospital_id=? AND status='reviewed'", [HID]);
  for (const f of FMEAS) {
    query("UPDATE fmea_records SET related_hazard_area=?, hazard_type=? WHERE hospital_id=? AND subject=? AND related_hazard_area IS NULL",
      [f.area, f.type, HID, f.s]);
  }

  const LIB = [
    { c: 'راهنمای بالینی', t: 'راهنمای کشوری پیشگیری از عفونت‌های مرتبط با مراقبت', m: 1, day: 8,
      d: 'نسخه‌ی ابلاغی وزارت بهداشت؛ مرجع تدوین روش اجرایی کنترل عفونت مرکز.' },
    { c: 'کتاب مرجع', t: 'سنجه‌های اعتباربخشی ملی بیمارستان‌های ایران — ویرایش پنجم', m: 1, day: 20,
      d: 'کتاب مرجع سنجه‌ها؛ مبنای درخت ۵۲۰ سنجه‌ی همین سامانه.' },
    { c: 'دستورالعمل', t: 'راهنمای ایمنی بیمار — نه راه‌حل جهانی', m: 2, day: 14,
      d: 'ترجمه‌ی راهنمای سازمان جهانی بهداشت، مورد استناد در کمیته‌ی ایمنی بیمار.' },
    { c: 'جزوه‌ی آموزشی', t: 'جزوه‌ی آموزشی احیای قلبی‌ریوی پایه', m: 3, day: 6,
      d: 'جزوه‌ی دوره‌ی داخلی؛ برای مطالعه‌ی پیش از آزمون عملی.' }
  ];
  const hasLibEx = has('digital_library_items', 'is_example');
  for (const l of LIB) {
    if (cnt('SELECT COUNT(*) c FROM digital_library_items WHERE hospital_id=? AND title=?', [HID, l.t]) !== 0) continue;
    const cols = ['id', 'hospital_id', 'category', 'title', 'description', 'uploaded_by', 'created_at', 'updated_at'];
    const vals = [uid(), HID, l.c, l.t, l.d, BY, g(YEAR, l.m, l.day), g(YEAR, l.m, l.day)];
    if (hasLibEx) { cols.push('is_example'); vals.push(1); }
    query(`INSERT INTO digital_library_items (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
    n++;
  }

  /* ---------- ۹) پیشنهادهای کارکنان ---------- */
  const SUGG = [
    { m: 1, d: 19, t: 'نصب تابلوی راهنمای مسیر در ورودی اصلی', st: 'reviewed',
      c: 'مراجعان مرتب مسیر بخش‌ها را می‌پرسند و این کار شیفت پذیرش را کند می‌کند. یک تابلوی راهنمای واضح در ورودی، هم کار ما را سبک می‌کند هم سرگردانی مراجع را کم.' },
    { m: 2, d: 7, t: 'استفاده از فرم الکترونیک تحویل شیفت', st: 'approved',
      c: 'فرم کاغذی تحویل شیفت گاهی گم می‌شود و خطش خوانا نیست. اگر همین فرم در سامانه باشد، هم ثبت می‌ماند هم قابل جستجوست.' },
    { m: 3, d: 11, t: 'جداسازی فیزیکی داروهای هم‌نام در قفسه', st: 'approved',
      c: 'دو دارو با نام مشابه کنار هم چیده شده‌اند. با جداسازی و برچسب رنگی، احتمال خطای دارویی کم می‌شود.' },
    { m: 3, d: 24, t: 'افزودن آبسردکن به سالن انتظار تصویربرداری', st: 'new',
      c: 'انتظار در این سالن گاهی طولانی می‌شود و آب در دسترس نیست.' }
  ];
  for (const s of SUGG) {
    if (cnt('SELECT COUNT(*) c FROM staff_suggestions WHERE hospital_id=? AND title=?', [HID, s.t]) !== 0) continue;
    query(`INSERT INTO staff_suggestions (id,hospital_id,submitted_by,title,content,status,created_at)
           VALUES (?,?,?,?,?,?,?)`, [uid(), HID, BY, s.t, s.c, s.st, g(YEAR, s.m, s.d)]);
    n++;
  }

  /* ---------- ۱۰) قواعد یادآور ---------- */
  const RULES = [
    { t: 'یادآور بازبینی اسناد کنترل‌شده', ty: 'document_review', days: 30 },
    { t: 'یادآور انقضای گواهینامه‌ها', ty: 'certification_expiry', days: 60 },
    { t: 'یادآور جلسه‌ی ماهانه‌ی کمیته‌ها', ty: 'committee_meeting', days: 3 },
    { t: 'یادآور مهلت مصوبه‌های بازدید میدانی', ty: 'walkaround_resolution', days: 7 }
  ];
  for (const r of RULES) {
    if (cnt('SELECT COUNT(*) c FROM reminder_rules WHERE hospital_id=? AND name=?', [HID, r.t]) !== 0) continue;
    query(`INSERT INTO reminder_rules (id,hospital_id,name,rule_type,days_before,channel,enabled,created_by,created_at,updated_at)
           VALUES (?,?,?,?,?, 'inbox',1,?,datetime('now'),datetime('now'))`,
      [uid(), HID, r.t, r.ty, r.days, BY]);
    n++;
  }

  console.log(`[seed-q1-depth] «${hosp.name}» — ${n} ردیف عمقِ سه‌ماهه‌ی اول افزوده شد` +
              (n === 0 ? ' (قبلاً کامل بود)' : ''));
}

module.exports = { seedQuarterOneDepth };
if (require.main === module) { seedQuarterOneDepth(); }
