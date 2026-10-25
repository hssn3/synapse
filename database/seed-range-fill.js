/**
 * پرکردنِ بازه — داده‌ی نمونه برای ماژول‌های عملیاتی در بازه‌ی ۱۴۰۳/۱۱/۰۱ تا ۱۴۰۵/۰۶/۰۱
 *
 * چرا لازم شد: داده‌ی نمونه‌ی موجود تقریباً همه در سه‌ماهه‌ی اول ۱۴۰۵ جمع شده بود.
 * یعنی هر فیلترِ تاریخ که کاربر روی «پارسال» یا «زمستان» می‌گذاشت، صفحه‌ی خالی
 * می‌داد و هیچ نمودارِ روندی چیزی برای نشان‌دادن نداشت — درست همان چیزی که در
 * ارائه به کارفرما توی چشم می‌زند.
 *
 * مثل seed-indicator-values، اینجا هم:
 *  • مولدِ شبه‌تصادفی از یک رشته‌ی ثابت seed می‌شود، پس هر اجرا همان داده را
 *    می‌سازد و ارائه‌ی امروز با هفته‌ی بعد فرق نمی‌کند؛
 *  • رکوردِ موجود دست نمی‌خورد — فقط جای خالیِ ماه‌ها پر می‌شود؛
 *  • هر ردیف در یکی از فیلدهای متنی‌اش «داده‌ی نمونه» دارد تا با ثبتِ واقعی
 *    اشتباه نشود و بشود یک‌جا پاکش کرد (‎--clear‎).
 */

const { db, query } = require('../src/config/database-sqlite');
const { toGregorian } = require('../src/config/jalali');
const crypto = require('crypto');

const TAG = 'داده‌ی نمونه';
const uid = () => crypto.randomUUID();

// بازه: بهمن ۱۴۰۳ تا مرداد ۱۴۰۵ (۱۹ ماه). شهریور ۱۴۰۵ عمداً بیرون است چون
// خواسته «تا اول شهریور» بود، یعنی شهریور هنوز شروع نشده.
const MONTHS = [];
for (let m = 1403 * 12 + 10; m <= 1405 * 12 + 4; m++) {
  MONTHS.push({ jy: Math.floor(m / 12), jm: (m % 12) + 1 });
}

// تاریخ میلادیِ ISO از سال/ماه/روزِ شمسی
function g(jy, jm, jd) {
  const { gy, gm, gd } = toGregorian(jy, jm, Math.min(jd, 29));
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

function rng(key) {
  let s = parseInt(crypto.createHash('md5').update(String(key)).digest('hex').slice(0, 8), 16);
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

const has = (t, c) => db.prepare(`PRAGMA table_info(${t})`).all().some(x => x.name === c);
const cnt = (sql, p = []) => { try { return query(sql, p).rows[0].c; } catch (e) { return 0; } };

// ---------- داده‌ی پایه‌ی هر ماژول ----------
const WARDS = ['اورژانس', 'داخلی', 'جراحی', 'زنان و زایمان', 'اطفال', 'ICU', 'CCU',
  'اتاق عمل', 'آزمایشگاه', 'رادیولوژی', 'دیالیز', 'تغذیه'];
const ERR_CATS = ['دارویی', 'تشخیصی', 'مراقبتی', 'تجهیزات', 'ارتباطی', 'فرآیندی'];
const ERR_TXT = [
  'دوز داروی تزریقی با دستور پزشک مغایرت داشت؛ پیش از تزریق توسط پرستار دوم کشف شد.',
  'برچسب نمونه‌ی آزمایشگاهی ناخوانا بود و نمونه دوباره گرفته شد.',
  'تأخیر در انتقال بیمار به اتاق عمل به‌دلیل هماهنگ‌نشدن نوبت.',
  'پمپ سرنگ در میانه‌ی انفوزیون آلارم داد؛ دستگاه تعویض شد.',
  'پرونده‌ی بیمار هنگام ترخیص ناقص بود و برگه‌ی رضایت امضا نشده بود.',
  'اشتباه در تحویل شیفت باعث تکرار یک نوبت دارویی شد.',
  'بیمار هنگام جابه‌جایی از تخت به برانکارد تعادلش را از دست داد؛ بدون آسیب.',
  'نتیجه‌ی بحرانی آزمایش با تأخیر به پزشک معالج اعلام شد.',
];
const PROG_TITLES = [
  'کاهش زمان انتظار بیماران سرپایی اورژانس',
  'ارتقای رعایت بهداشت دست در بخش‌های ویژه',
  'کاهش عفونت ادراری مرتبط با کاتتر',
  'بهبود مستندسازی پرونده‌ی بیمار',
  'کاهش موارد سقوط بیمار در بخش‌های بستری',
  'ارتقای رضایت گیرندگان خدمت واحد ترخیص',
  'کاهش زمان جوابدهی آزمایش‌های اورژانس',
  'استانداردسازی تحویل شیفت پرستاری',
  'کاهش مصرف آنتی‌بیوتیک‌های وسیع‌الطیف',
  'بهبود فرآیند اعزام و ارجاع بیمار',
];
const AUDIT_TITLES = [
  'ممیزی داخلی رعایت بهداشت دست',
  'ممیزی داخلی مستندسازی پرونده',
  'ممیزی داخلی مدیریت دارویی',
  'ممیزی داخلی ایمنی بیمار',
  'ممیزی داخلی کنترل عفونت',
  'ممیزی داخلی تجهیزات پزشکی',
];
const WALK_TITLES = [
  'بازدید مدیریتی ایمنی بیمار',
  'راند مدیریتی بخش اورژانس',
  'بازدید از واحد تغذیه و آشپزخانه',
  'راند ایمنی محیط و تأسیسات',
  'بازدید از اتاق عمل و ریکاوری',
];
const COMPLAINTS = [
  ['شکایت', 'مدت انتظار در نوبت‌دهی درمانگاه طولانی بود.'],
  ['پیشنهاد', 'نصب تابلوی راهنمای بهتر در ورودی ساختمان.'],
  ['تقدیر', 'برخورد پرسنل بخش داخلی بسیار محترمانه بود.'],
  ['شکایت', 'صدای دستگاه‌ها در شب استراحت بیمار را مختل می‌کرد.'],
  ['پیشنهاد', 'افزایش تعداد صندلی در سالن انتظار.'],
  ['تقدیر', 'پیگیری تلفنی پس از ترخیص بسیار مفید بود.'],
  ['شکایت', 'توضیح ناکافی درباره‌ی داروهای زمان ترخیص.'],
  ['پیشنهاد', 'امکان رزرو اینترنتی نوبت آزمایشگاه.'],
];
const SUGGESTIONS = [
  ['بازطراحی فرم تحویل شیفت', 'فرم فعلی سه بار اطلاعات تکراری می‌گیرد؛ ادغام دو بخش وقت پرستار را آزاد می‌کند.'],
  ['برچسب رنگی برای داروهای پرخطر', 'تفکیک رنگی قفسه‌ی داروهای پرخطر خطای برداشت را کم می‌کند.'],
  ['چک‌لیست کوتاه پیش از انتقال بیمار', 'یک چک‌لیست پنج‌آیتمی پیش از هر انتقال بین‌بخشی.'],
  ['آموزش کوتاه ماهانه‌ی احیا', 'جلسه‌ی ۲۰ دقیقه‌ای ماهانه به‌جای دوره‌ی سالانه‌ی فشرده.'],
  ['بهبود مسیر دسترسی ویلچر', 'شیب رمپ ورودی شرقی برای ویلچر تند است.'],
  ['ثبت الکترونیک درخواست تعمیر', 'جایگزینی دفتر کاغذی درخواست تعمیرات با فرم سامانه.'],
];
const FMEA_SUBJ = [
  'خطر خطای دارویی در مرحله‌ی آماده‌سازی تزریقات',
  'خطر سقوط بیمار هنگام انتقال به تصویربرداری',
  'خطر اشتباه در شناسایی بیمار پیش از عمل',
  'خطر قطع برق حین عمل جراحی',
  'خطر آلودگی نمونه در مسیر انتقال به آزمایشگاه',
  'خطر تأخیر در پاسخ به کد احیا',
];

// ---------- درج ----------
function fillPrograms(HID, BY) {
  const r = rng('programs');
  let n = 0;
  MONTHS.forEach((M, i) => {
    if (i % 2) return;                       // هر دو ماه یک برنامه
    const title = `${PROG_TITLES[i % PROG_TITLES.length]} — ${M.jy}/${M.jm}`;
    if (cnt('SELECT COUNT(*) c FROM improvement_programs WHERE hospital_id=? AND title=?', [HID, title])) return;
    const done = i < MONTHS.length - 4;
    query(`INSERT INTO improvement_programs
             (id, hospital_id, title, program_type, description, department, proposed_by,
              status, progress_percent, start_date, due_date, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uid(), HID, title, pick(r, ['بهبود کیفیت', 'عملیاتی', 'استراتژیک']),
        `${TAG} — برنامه‌ی بهبود مصوب کمیته‌ی پایش و سنجش کیفیت.`,
        pick(r, WARDS), BY, done ? 'approved' : 'proposed',
        done ? 100 : Math.floor(r() * 70) + 10,
        g(M.jy, M.jm, 5), g(M.jy, M.jm === 12 ? 12 : M.jm + 1, 25), g(M.jy, M.jm, 3)]);
    n++;
  });
  return n;
}

function fillAudits(HID, BY) {
  const r = rng('audits');
  let n = 0;
  MONTHS.forEach((M, i) => {
    if (i % 3) return;                       // فصلی
    const title = `${AUDIT_TITLES[i % AUDIT_TITLES.length]} — ${M.jy}/${M.jm}`;
    if (cnt('SELECT COUNT(*) c FROM internal_audits WHERE hospital_id=? AND title=?', [HID, title])) return;
    const cols = ['id', 'hospital_id', 'title', 'auditor_name', 'audited_department', 'audit_date',
      'finding_summary', 'corrective_action_required', 'corrective_action_text', 'status', 'created_by', 'created_at'];
    const vals = [uid(), HID, title, 'کارشناس بهبود کیفیت', pick(r, WARDS), g(M.jy, M.jm, 12),
      `${TAG} — ${Math.floor(r() * 4) + 1} یافته‌ی جزئی؛ بقیه‌ی موارد منطبق بود.`,
      r() > 0.5 ? 1 : 0, 'رفع یافته‌ها در مهلت مقرر پیگیری شد.', 'closed', BY, g(M.jy, M.jm, 12)];
    if (has('internal_audits', 'is_example')) { cols.push('is_example'); vals.push(1); }
    query(`INSERT INTO internal_audits (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
    n++;
  });
  return n;
}

function fillErrors(HID) {
  const r = rng('errors');
  let n = 0;
  MONTHS.forEach((M, i) => {
    const howMany = 1 + Math.floor(r() * 2);
    for (let k = 0; k < howMany; k++) {
      const desc = `${ERR_TXT[(i + k) % ERR_TXT.length]} (${TAG})`;
      const day = 4 + k * 9 + Math.floor(r() * 5);
      if (cnt(`SELECT COUNT(*) c FROM medical_error_reports
               WHERE hospital_id=? AND description=? AND substr(created_at,1,7)=?`,
        [HID, desc, g(M.jy, M.jm, 1).slice(0, 7)])) continue;
      // کدِ رهگیری در کلِ جدول یکتاست، پس بیمارستان هم باید داخلش باشد؛ وگرنه با
      // بیش از یک مرکز، مرکزِ دوم روی کدِ مرکزِ اول می‌خورد.
      const code = 'ERR-' + HID.slice(0, 4) + '-' + String(M.jy).slice(-2)
        + String(M.jm).padStart(2, '0') + '-' + (k + 1);
      if (cnt('SELECT COUNT(*) c FROM medical_error_reports WHERE tracking_code=?', [code])) continue;
      query(`INSERT INTO medical_error_reports
               (id, hospital_id, error_category, description, severity, department, status,
                created_at, tracking_code, error_ward, needs_rca, is_anonymous_submission)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uid(), HID, pick(r, ERR_CATS), desc, pick(r, ['کم', 'متوسط', 'زیاد']),
          pick(r, WARDS), pick(r, ['reported', 'under_review', 'closed']),
          g(M.jy, M.jm, day), code, pick(r, WARDS), r() > 0.7 ? 1 : 0, r() > 0.6 ? 1 : 0]);
      n++;
    }
  });
  return n;
}

function fillFmea(HID, BY) {
  const r = rng('fmea');
  let n = 0;
  MONTHS.forEach((M, i) => {
    if (i % 3 !== 1) return;
    const subj = `${FMEA_SUBJ[i % FMEA_SUBJ.length]} — ${M.jy}/${M.jm}`;
    if (cnt('SELECT COUNT(*) c FROM fmea_records WHERE hospital_id=? AND subject=?', [HID, subj])) return;
    const cols = ['id', 'hospital_id', 'reporter_name', 'subject', 'reporting_department',
      'failure_modes', 'root_causes', 'effects', 'existing_controls', 'recommended_actions',
      'status', 'created_by', 'submitted_at'];
    const vals = [uid(), HID, 'کارشناس ایمنی بیمار', subj, pick(r, WARDS),
      `${TAG} — حالت خرابی: خطا در مرحله‌ی شناسایی/آماده‌سازی.`,
      'شلوغی شیفت، نبود چک‌لیست، آموزش ناکافی نیروی جدید.',
      'احتمال آسیب به بیمار و طولانی‌شدن اقامت.',
      'کنترل دونفره، برچسب‌گذاری، آموزش بدو ورود.',
      'افزودن چک‌لیست کوتاه و بازآموزی فصلی.',
      'submitted', BY, g(M.jy, M.jm, 18)];
    if (has('fmea_records', 'is_example')) { cols.push('is_example'); vals.push(1); }
    query(`INSERT INTO fmea_records (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
    n++;
  });
  return n;
}

function fillWalkarounds(HID, BY) {
  const r = rng('walk');
  let n = 0;
  MONTHS.forEach((M, i) => {
    if (i % 2) return;
    const title = `${WALK_TITLES[i % WALK_TITLES.length]} — ${M.jy}/${M.jm}`;
    if (cnt('SELECT COUNT(*) c FROM management_walkarounds WHERE hospital_id=? AND title=?', [HID, title])) return;
    query(`INSERT INTO management_walkarounds
             (id, hospital_id, title, visit_date, department, attendees, summary, status,
              conducted_by, created_by, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [uid(), HID, title, g(M.jy, M.jm, 20), pick(r, WARDS),
        'ریاست، مدیر بهبود کیفیت، مترون، مسئول ایمنی بیمار',
        `${TAG} — ${Math.floor(r() * 3) + 2} مورد نیازمند اقدام شناسایی و به واحد مربوط ابلاغ شد.`,
        // conducted_by کلیدِ خارجی به users است، نه نامِ متنیِ سمت
        'closed', BY, BY, g(M.jy, M.jm, 20)]);
    n++;
  });
  return n;
}

function fillComplaints(HID) {
  const r = rng('complaints');
  let n = 0;
  MONTHS.forEach((M, i) => {
    const [type, content] = COMPLAINTS[i % COMPLAINTS.length];
    const body = `${content} (${TAG})`;
    // گارد باید کلِ بازهٔ همان ماهِ شمسی را بگیرد، نه فقط ماهِ میلادیِ «روز اول» را:
    // روزِ تصادفیِ ۸ تا ۲۲ می‌تواند به ماهِ میلادیِ بعد بیفتد و آن‌وقت گاردِ قبلی
    // ردیفِ موجود را نمی‌دید؛ نتیجه: هر بوت ~۱۱ ردیفِ تکراری (باگِ ۱۴۰۵/۰۷/۲۸ —
    // ۶۰+ نسخه از یک ردیف در دموی زنده). مقایسهٔ رشته‌ای ISO با created_at درست است.
    const from = g(M.jy, M.jm, 1);
    const to = g(M.jy, M.jm, 29);
    if (cnt(`SELECT COUNT(*) c FROM patient_complaints_suggestions
             WHERE hospital_id=? AND content=? AND created_at >= ? AND created_at <= ?`,
      [HID, body, from, to])) return;
    query(`INSERT INTO patient_complaints_suggestions
             (id, hospital_id, type, content, is_anonymous, status, response, created_at, source)
           VALUES (?,?,?,?,?,?,?,?,?)`,
      [uid(), HID, type, body, r() > 0.5 ? 1 : 0,
        pick(r, ['new', 'in_review', 'resolved']),
        type === 'شکایت' ? 'موضوع بررسی و به واحد مربوط منعکس شد.' : null,
        g(M.jy, M.jm, 8 + Math.floor(r() * 15)), 'public']);
    n++;
  });
  return n;
}

function fillStaffSuggestions(HID, BY) {
  const r = rng('sugg');
  let n = 0;
  MONTHS.forEach((M, i) => {
    if (i % 2) return;
    const [title, content] = SUGGESTIONS[i % SUGGESTIONS.length];
    const t = `${title} — ${M.jy}/${M.jm}`;
    if (cnt('SELECT COUNT(*) c FROM staff_suggestions WHERE hospital_id=? AND title=?', [HID, t])) return;
    query(`INSERT INTO staff_suggestions
             (id, hospital_id, submitted_by, title, content, status, reviewer_notes, created_at)
           VALUES (?,?,?,?,?,?,?,?)`,
      [uid(), HID, BY, t, `${content} (${TAG})`,
        pick(r, ['new', 'under_review', 'accepted']),
        r() > 0.5 ? 'در کمیته بررسی و برای اجرا ارجاع شد.' : null,
        g(M.jy, M.jm, 14)]);
    n++;
  });
  return n;
}

function fillSurveys(HID) {
  const r = rng('surveys');
  const SECS = ['admission', 'medical', 'nursing', 'nutrition', 'discharge', 'facilities'];
  const QN = { admission: 2, medical: 3, nursing: 4, nutrition: 3, discharge: 4, facilities: 4 };
  let n = 0;
  MONTHS.forEach((M) => {
    const howMany = 2 + Math.floor(r() * 3);
    for (let k = 0; k < howMany; k++) {
      const day = 3 + k * 7 + Math.floor(r() * 4);
      const created = g(M.jy, M.jm, day);
      if (cnt(`SELECT COUNT(*) c FROM public_satisfaction_surveys
               WHERE hospital_id=? AND substr(created_at,1,10)=? AND comment LIKE ?`,
        [HID, created, '%' + TAG + '%'])) continue;
      const scores = {};
      let sum = 0, c2 = 0;
      for (const s of SECS) {
        scores[s] = Array.from({ length: QN[s] }, () => {
          // بیشترِ پاسخ‌ها ۴ و ۵ — مثل الگوی واقعیِ رضایت‌سنجی بیمارستانی
          const v = r() < 0.62 ? 5 : r() < 0.8 ? 4 : r() < 0.92 ? 3 : r() < 0.97 ? 2 : 1;
          sum += v; c2++; return v;
        });
      }
      query(`INSERT INTO public_satisfaction_surveys
               (id, hospital_id, respondent_type, patient_gender, would_return, scores,
                overall_score, comment, created_at)
             VALUES (?,?,?,?,?,?,?,?,?)`,
        [uid(), HID, pick(r, ['بستری', 'همراه']), pick(r, ['زن', 'مرد']),
          r() > 0.15 ? 'بله' : 'خیر', JSON.stringify(scores),
          Math.round((sum / c2) * 10) / 10,
          r() > 0.6 ? `${TAG} — از پیگیری و برخورد پرسنل سپاسگزارم.` : TAG,
          created]);
      n++;
    }
  });
  return n;
}

function fillFollowups(HID, BY) {
  const r = rng('fup');
  const NAMES = ['مراجعه‌کننده‌ی نمونه ۱', 'مراجعه‌کننده‌ی نمونه ۲', 'مراجعه‌کننده‌ی نمونه ۳',
    'مراجعه‌کننده‌ی نمونه ۴', 'مراجعه‌کننده‌ی نمونه ۵', 'مراجعه‌کننده‌ی نمونه ۶'];
  let n = 0;
  MONTHS.forEach((M, i) => {
    if (i % 2) return;
    const name = `${NAMES[i % NAMES.length]} (${M.jy}/${M.jm})`;
    if (cnt('SELECT COUNT(*) c FROM patient_followups WHERE hospital_id=? AND full_name=?', [HID, name])) return;
    const preg = i % 4 === 0;
    query(`INSERT INTO patient_followups
             (id, hospital_id, patient_type, full_name, phone, file_number, reason,
              status, next_visit_date, assigned_to, created_by, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uid(), HID, preg ? 'pregnant' : 'general', name, '09120000000',
        'F-' + String(1000 + i), `${TAG} — پیگیری پس از ترخیص.`,
        i < MONTHS.length - 4 ? 'closed' : 'active',
        g(M.jy, M.jm === 12 ? 12 : M.jm + 1, 10), BY, BY, g(M.jy, M.jm, 6)]);
    n++;
  });
  return n;
}

function fillShiftReports(HID) {
  const nurse = query(`SELECT u.id FROM users u LEFT JOIN roles r ON u.role_id = r.id
                       WHERE u.hospital_id = ? ORDER BY CASE WHEN r.code LIKE '%nurse%' THEN 0 ELSE 1 END
                       LIMIT 1`, [HID]).rows[0];
  if (!nurse) return 0;
  const r = rng('shift');
  let n = 0;
  MONTHS.forEach((M, i) => {
    for (const st of ['صبح', 'عصر', 'شب']) {
      const day = 10 + (i % 3) * 5;
      const d = g(M.jy, M.jm, day);
      if (cnt(`SELECT COUNT(*) c FROM nursing_shift_reports
               WHERE hospital_id=? AND shift_date=? AND shift_type=?`, [HID, d, st])) continue;
      query(`INSERT INTO nursing_shift_reports
               (id, hospital_id, nurse_id, shift_type, shift_date, free_text_notes, created_at)
             VALUES (?,?,?,?,?,?,?)`,
        [uid(), HID, nurse.id, st, d,
          `${TAG} — شیفت بدون حادثه؛ ${Math.floor(r() * 8) + 4} بیمار بستری، تحویل کامل انجام شد.`, d]);
      n++;
    }
  });
  return n;
}

function fillLeaves(HID) {
  const nurse = query('SELECT id FROM users WHERE hospital_id = ? LIMIT 1', [HID]).rows[0];
  if (!nurse) return 0;
  const r = rng('leave');
  let n = 0;
  MONTHS.forEach((M, i) => {
    if (i % 2) return;
    const s = g(M.jy, M.jm, 15);
    if (cnt('SELECT COUNT(*) c FROM nursing_leave_requests WHERE hospital_id=? AND start_date=?', [HID, s])) return;
    query(`INSERT INTO nursing_leave_requests
             (id, hospital_id, nurse_id, ward, start_date, end_date, reason, status, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
      [uid(), HID, nurse.id, pick(r, WARDS), s, g(M.jy, M.jm, 18),
        `${TAG} — مرخصی استحقاقی.`, pick(r, ['approved', 'pending']), s]);
    n++;
  });
  return n;
}

// صورت‌جلسه‌ی کمیته‌ها. الف-۱-۵-۲ تشکیلِ منظم را الزامی می‌کند، پس صورت‌جلسه‌ای که
// فقط پنج ماه از نوزده ماه را پوشش بدهد خودش یک عدمِ انطباق است. هر صورت‌جلسه هر
// شش بندِ اجباریِ همان سنجه را دارد (حاضران، غایبان، دستور جلسه، بحث، مصوبات با
// مسئول و مهلت، و پیگیریِ مصوبات جلسه‌ی قبل).
function fillMinutes(HID) {
  const committees = query('SELECT id, name FROM committees WHERE hospital_id = ? ORDER BY name',
    [HID]).rows;
  if (!committees.length) return 0;
  const signer = query('SELECT id, full_name FROM users WHERE hospital_id = ? LIMIT 1', [HID]).rows[0];
  const r = rng('minutes');
  // چهار کمیته‌ی پرکار ماهانه جلسه دارند؛ بقیه فصلی — همان الگویی که آیین‌نامه دارد
  const monthly = committees.slice(0, 4);
  let n = 0;
  MONTHS.forEach((M, i) => {
    monthly.forEach((c, ci) => {
      const date = g(M.jy, M.jm, 8 + ci * 4);
      if (cnt('SELECT COUNT(*) c FROM committee_meeting_minutes WHERE committee_id=? AND meeting_date=?',
        [c.id, date])) return;
      const code = `MIN-${M.jy}-${String(M.jm).padStart(2, '0')}-${ci + 1}`;
      if (cnt('SELECT COUNT(*) c FROM committee_meeting_minutes WHERE minutes_code=?', [code])) return;
      const cols = ['id', 'committee_id', 'meeting_date', 'attendees', 'absentees', 'agenda_items',
        'discussion', 'decisions', 'previous_followup', 'signatures', 'minutes_code',
        'start_time', 'end_time', 'location', 'next_meeting_date', 'created_at'];
      const vals = [uid(), c.id, date,
        JSON.stringify(['اعضای ثابت کمیته طبق ابلاغ — حاضر']),
        JSON.stringify(r() > 0.7 ? ['نماینده‌ی یک واحد — غایب با اطلاع'] : []),
        JSON.stringify([`${TAG} — بررسی شاخص‌های دوره‌ی جاری`, 'پیگیری مصوبات جلسه‌ی قبل']),
        `${TAG} — گزارش دوره ارائه و نقاط نیازمند اصلاح بررسی شد.`,
        JSON.stringify([{ what: `${TAG} — اقدام اصلاحی برای شاخص‌های زیر هدف`,
          who: 'دفتر بهبود کیفیت', when: g(M.jy, M.jm === 12 ? 12 : M.jm + 1, 20) }]),
        JSON.stringify(i === 0 ? [] : [{ what: 'مصوبه‌ی جلسه‌ی قبل', status: 'انجام شد' }]),
        JSON.stringify(signer ? [{ user_id: signer.id, name: signer.full_name }] : []),
        code, '10:00', '11:30', 'سالن جلسات — طبقه دوم',
        g(M.jy, M.jm === 12 ? 12 : M.jm + 1, 8 + ci * 4), date];
      if (has('committee_meeting_minutes', 'is_example')) { cols.push('is_example'); vals.push(1); }
      query(`INSERT INTO committee_meeting_minutes (${cols.join(',')})
             VALUES (${cols.map(() => '?').join(',')})`, vals);
      n++;
    });
  });
  return n;
}

function runMigration() {
  try {
    // این seed دادهٔ نمایشی می‌سازد و قبلاً روی «همه‌ی بیمارستان‌ها» می‌نوشت — یعنی
    // روی یک نصب چندمرکزی، پرونده‌ی مشتریِ واقعی هم دادهٔ جعلی می‌گرفت. حالا پیش‌فرض
    // فقط مرکز نمایشی (کاربر نشانهٔ hospital3_admin) است؛ SEED_DEMO_DATA=1 یا
    // `node ... --all` برای پرکردن همه (محیط دمو) صریح است.
    const flag = String(process.env.SEED_DEMO_DATA || '').trim();
    const allHospitals = flag === '1' || process.argv.includes('--all');
    const hospitals = allHospitals
      ? query('SELECT id FROM hospitals').rows
      : query(`SELECT DISTINCT h.id FROM hospitals h
                 JOIN users u ON u.hospital_id = h.id
                WHERE u.username = ?`, ['hospital3_admin']).rows;
    let total = 0, touched = 0;
    for (const h of hospitals) {
      const HID = h.id;
      const by = query(`SELECT u.id FROM users u LEFT JOIN roles r ON u.role_id = r.id
                        WHERE u.hospital_id = ?
                        ORDER BY CASE WHEN r.code = 'admin' THEN 0 ELSE 1 END LIMIT 1`, [HID]).rows[0];
      if (!by) continue;
      const BY = by.id;
      const n = fillPrograms(HID, BY) + fillAudits(HID, BY) + fillErrors(HID)
        + fillFmea(HID, BY) + fillWalkarounds(HID, BY) + fillComplaints(HID)
        + fillStaffSuggestions(HID, BY) + fillSurveys(HID) + fillFollowups(HID, BY)
        + fillShiftReports(HID) + fillLeaves(HID) + fillMinutes(HID);
      if (n) { total += n; touched++; }
    }
    console.log(`[Seed RangeFill] ✅ ${total} ردیف نمونه در بازه‌ی بهمن ۱۴۰۳ تا مرداد ۱۴۰۵ `
      + `برای ${touched} بیمارستان${allHospitals ? '' : ' (فقط مرکز نمایشی)'} افزوده شد`);
  } catch (err) {
    console.error('[Seed RangeFill] failed:', err.message);
  }
}

// پاک‌کردن یک‌جای هرچه این فایل ساخته
function clearSample() {
  const T = [
    ['improvement_programs', 'description'], ['internal_audits', 'finding_summary'],
    ['medical_error_reports', 'description'], ['fmea_records', 'failure_modes'],
    ['management_walkarounds', 'summary'], ['patient_complaints_suggestions', 'content'],
    ['staff_suggestions', 'content'], ['public_satisfaction_surveys', 'comment'],
    ['patient_followups', 'reason'], ['nursing_shift_reports', 'free_text_notes'],
    ['nursing_leave_requests', 'reason'], ['committee_meeting_minutes', 'discussion'],
  ];
  let n = 0;
  for (const [t, c] of T) {
    const r = query(`DELETE FROM ${t} WHERE ${c} LIKE ?`, ['%' + TAG + '%']);
    n += (r && r.rowCount) || 0;
  }
  console.log(`[Seed RangeFill] ${n} ردیف نمونه پاک شد`);
  return n;
}

module.exports = { runMigration, clearSample, TAG };

if (require.main === module) {
  if (process.argv.includes('--clear')) clearSample();
  else runMigration();
}
