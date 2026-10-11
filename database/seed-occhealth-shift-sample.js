/**
 * داده‌ی نمونه برای دو ماژولِ تازه: سلامت حرفه‌ای، و حضورِ شیفتی + گزارش ۲۴ ساعته
 * ---------------------------------------------------------------------
 * چرا لازم شد: سیدهای ساختاری فقط جدول می‌سازند. کارفرما که صفحه‌ی «سلامت
 * حرفه‌ای» را باز کند و چهار عددِ صفرِ قرمز ببیند، ماژول را «خراب» می‌خواند نه
 * «خالی» — همان مشکلی که docs/RUN-ANYWHERE.md برای بقیه‌ی ماژول‌ها با عکسِ دمو
 * حل کرده بود و این دو ماژول هنوز از آن جا مانده بودند.
 *
 * دو قاعده که این را از یک سیدِ کور جدا می‌کند:
 *
 *  • فقط وقتی پر می‌کند که جدول برای آن بیمارستان **خالی** باشد. روی داده‌ی
 *    واقعیِ مشتری هیچ‌وقت نمی‌نشیند، حتی اگر تصادفی اجرا شود.
 *
 *  • حضور از خودِ برنامه‌ی شیفتِ همان بیمارستان خوانده می‌شود، نه از نام‌های
 *    ساختگی. اگر ردیفِ حضور با کسی پر شود که آن روز شیفت ندارد، فهرستِ انتظارِ
 *    صفحه او را نشان نمی‌دهد و عددِ داشبورد با جدول نمی‌خواند.
 *
 * ترکیبِ داده عمداً «تمیزِ صددرصد» نیست: چند غیبت، یک تأخیر، یک اندازه‌گیریِ
 * خارج از حد مجاز، یک معاینه‌ی سررسیدگذشته و یک گزارشِ بررسی‌نشده. نمایشی که
 * همه‌چیزش سبز است به ارزیاب و به کارفرما هیچ نمی‌گوید؛ این‌ها همان‌هایی‌اند که
 * کارتابل «کار من» را هم روشن می‌کنند و نشان می‌دهند سامانه واقعاً می‌فهمد.
 *
 * Run: node database/seed-occhealth-shift-sample.js (یا خودکار روی هر boot).
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');
const uid = () => crypto.randomUUID();

const HAZARDS = [
  { kind: 'فیزیکی', title: 'صدای موتورخانه و چیلر', ward: 'تأسیسات',
    source: 'کمپرسور چیلر و هواساز مرکزی', exposed_groups: 'تکنسین تأسیسات، نگهبان شیفت شب',
    exposed_count: 6, limit_value: 85, limit_unit: 'dB(A)',
    control_measures: 'عایق‌بندی اتاق کمپرسور، محدودکردن مدت حضور، پایش سالانه',
    ppe_required: 'گوشی حفاظتی ایرماف (NRR ۲۵)',
    values: [92, 81] },
  { kind: 'شیمیایی', title: 'بخار فرمالدئید در پاتولوژی', ward: 'آزمایشگاه',
    source: 'ثبوت نمونه‌های بافتی', exposed_groups: 'کارشناس پاتولوژی، کمک آزمایشگاه',
    exposed_count: 4, limit_value: 0.75, limit_unit: 'ppm',
    control_measures: 'هود شیمیایی با پایش جریان، ظروف دربسته، تهویه موضعی',
    ppe_required: 'دستکش نیتریل، عینک ایمنی، ماسک با فیلتر بخار آلی',
    values: [0.41] },
  { kind: 'بیولوژیکی', title: 'مواجهه با خون و ترشحات بیمار', ward: 'اورژانس',
    source: 'رگ‌گیری، نمونه‌گیری و احیا', exposed_groups: 'پرستار، کمک‌پرستار، خدمات',
    exposed_count: 38, limit_value: null, limit_unit: null,
    control_measures: 'احتیاطات استاندارد، سیفتی‌باکس در هر اتاق، واکسیناسیون هپاتیت B، پروتکل مواجهه',
    ppe_required: 'دستکش، گان، ماسک، شیلد صورت در اعمال با پاشش',
    values: [] },
  { kind: 'ارگونومیک', title: 'جابه‌جایی دستی بیمار', ward: 'مراقبت‌های ویژه (ICU)',
    source: 'انتقال بیمار بین تخت و برانکارد، تغییر پوزیشن دوساعته',
    exposed_groups: 'پرستار ICU، کمک‌پرستار', exposed_count: 22,
    limit_value: 23, limit_unit: 'kg (حد بار مجاز NIOSH)',
    control_measures: 'لیفت سقفی در دو اتاق، ملحفه‌ی انتقال، آموزش تکنیک جابه‌جایی دونفره',
    ppe_required: 'کمربند طبی برای انتقال‌های سنگین',
    values: [31] },
];

const INCIDENTS = [
  { d: -34, kind: 'حادثه', category: 'فرورفتن سوزن/جسم تیز', ward: 'اورژانس',
    person: 'مریم صادقی', job: 'پرستار', shift: 'E',
    desc: 'هنگام جداکردن سرسوزن از سرنگ، سوزن وارد انگشت اشاره دست چپ شد.',
    injury: 'زخم سطحی، خونریزی مختصر', lost: 0,
    imm: 'شست‌وشوی محل با آب و صابون، گزارش فوری به سوپروایزر، نمونه‌گیری پایه از پرسنل و بیمار مبدأ',
    root: 'کپ‌گذاری مجدد سوزن برخلاف دستورالعمل؛ سیفتی‌باکس در فاصله‌ی دور از تخت قرار داشت.',
    corr: 'نصب سیفتی‌باکس کنار هر تخت، بازآموزی احتیاطات استاندارد برای شیفت عصر، پیگیری سرولوژی در ماه سوم',
    status: 'closed' },
  { d: -12, kind: 'شبه‌حادثه', category: 'سقوط و لغزش', ward: 'رختشویخانه',
    person: 'حسین مرادی', job: 'کارگر خدمات', shift: 'M',
    desc: 'کف خیس بدون تابلوی هشدار؛ فرد سُر خورد ولی با گرفتن نرده تعادلش را حفظ کرد. آسیبی رخ نداد.',
    injury: 'بدون آسیب', lost: 0,
    imm: 'خشک‌کردن فوری کف و نصب تابلوی هشدار',
    root: 'تابلوی هشدار موجود نبود و شیفت شست‌وشو با شیفت نظافت هم‌پوشانی داشت.',
    corr: 'تهیه‌ی چهار تابلوی هشدار، جداکردن زمان شست‌وشو از تردد پرسنل',
    status: 'closed' },
  { d: -5, kind: 'حادثه', category: 'مواجهه با ماده‌ی شیمیایی', ward: 'آزمایشگاه',
    person: 'الهام نوری', job: 'کارشناس آزمایشگاه', shift: 'M',
    desc: 'پاشش محلول فرمالین روی ساعد هنگام انتقال بین ظروف.',
    injury: 'قرمزی موضعی پوست', lost: 0,
    imm: 'شست‌وشوی ۱۵ دقیقه‌ای با آب جاری، ویزیت پزشک',
    root: null, corr: null, status: 'investigated' },
  { d: -2, kind: 'شبه‌حادثه', category: 'آسیب ناشی از جابه‌جایی بیمار', ward: 'مراقبت‌های ویژه (ICU)',
    person: 'زهرا کاظمی', job: 'پرستار', shift: 'N',
    desc: 'هنگام تغییر پوزیشن بیمار ۱۱۰ کیلوگرمی به‌تنهایی، درد ناگهانی ناحیه‌ی کمر احساس شد؛ کار متوقف و با کمک همکار انجام شد.',
    injury: 'بدون آسیب پایدار', lost: 0,
    imm: 'توقف کار، انجام با دو نفر', root: null, corr: null, status: 'open' },
];

const EXAMS = [
  { name: 'حسین مرادی', code: '۱۰۲۴', group: 'خدمات و رختشویخانه', ward: 'رختشویخانه',
    exposure: 'مواد شوینده، بار حرارتی', type: 'دوره‌ای', d: -400, due: -30,
    result: 'نیازمند پیگیری', findings: 'افت شنوایی خفیف در فرکانس ۴۰۰۰ هرتز',
    restrictions: null, follow: 'ادیومتری کنترلی سه ماه دیگر و بررسی مواجهه‌ی صوتی محل کار' },
  { name: 'رضا افشار', code: '۱۰۸۸', group: 'تأسیسات', ward: 'تأسیسات',
    exposure: 'صدا بالای حد مجاز', type: 'دوره‌ای', d: -200, due: 165,
    result: 'محدودیت شغلی', findings: 'کاهش شنوایی حسی-عصبی دوطرفه',
    restrictions: 'حداکثر چهار ساعت حضور در موتورخانه در هر شیفت',
    follow: 'استفاده‌ی الزامی از گوشی حفاظتی و کنترل شش‌ماهه' },
  { name: 'الهام نوری', code: '۱۱۳۰', group: 'آزمایشگاه', ward: 'آزمایشگاه',
    exposure: 'فرمالدئید', type: 'دوره‌ای', d: -95, due: 270,
    result: 'بیماری شغلی', findings: 'درماتیت تماسی شغلی دست‌ها، تأییدشده توسط متخصص طب کار',
    restrictions: 'عدم تماس مستقیم با فرمالین تا بهبود کامل',
    follow: 'ارجاع به درمانگاه طب کار، تعویض دستکش به نیتریل ضخیم، ویزیت ماهانه تا رفع ضایعه' },
  { name: 'مریم صادقی', code: '۱۰۵۶', group: 'پرستاری', ward: 'اورژانس',
    exposure: 'عوامل بیولوژیک', type: 'بازگشت به کار', d: -30, due: 335,
    result: 'سالم', findings: 'سرولوژی پایه پس از مواجهه‌ی سوزن: منفی',
    restrictions: null, follow: 'کنترل سرولوژی در ماه سوم و ششم' },
  { name: 'زهرا کاظمی', code: '۱۱۹۲', group: 'پرستاری', ward: 'مراقبت‌های ویژه (ICU)',
    exposure: 'بار ارگونومیک', type: 'دوره‌ای', d: -60, due: 305,
    result: 'سالم', findings: 'معاینه‌ی اسکلتی-عضلانی بدون یافته‌ی مثبت',
    restrictions: null, follow: null },
  { name: 'سمیرا برومند', code: '۱۲۰۷', group: 'پرستاری', ward: 'اتاق عمل',
    exposure: 'گازهای بیهوشی', type: 'بدو استخدام', d: -15, due: 350,
    result: 'سالم', findings: 'اسپیرومتری و معاینه‌ی بالینی طبیعی', restrictions: null, follow: null },
];

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
const SHIFTS = ['M', 'E', 'N'];
const SHIFT_FA = { M: 'صبح', E: 'عصر', N: 'شب' };

function seedOccHealth(hid) {
  if (db.prepare('SELECT COUNT(*) c FROM occ_hazards WHERE hospital_id = ?').get(hid).c) return 0;
  let n = 0;
  const insH = db.prepare(`INSERT INTO occ_hazards (id, hospital_id, kind, title, ward, source, exposed_groups,
    exposed_count, limit_value, limit_unit, control_measures, ppe_required, responsible, review_interval_months, is_active)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'مسئول بهداشت حرفه‌ای',12,1)`);
  const insM = db.prepare(`INSERT INTO occ_measurements (id, hospital_id, hazard_id, measured_date, value,
    value_unit, method, lab_name, within_limit, action_taken)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const tx = db.transaction(() => {
    for (const h of HAZARDS) {
      const hzId = uid();
      insH.run(hzId, hid, h.kind, h.title, h.ward, h.source, h.exposed_groups,
        h.exposed_count, h.limit_value, h.limit_unit, h.control_measures, h.ppe_required);
      n++;
      h.values.forEach((v, i) => {
        // همان قاعده‌ی سرور: قضاوتِ حد مجاز از مقایسه می‌آید، نه دستی
        const within = h.limit_value === null ? null : (v <= h.limit_value ? 1 : 0);
        insM.run(uid(), hid, hzId, iso(-180 + i * 90), v, h.limit_unit,
          'اندازه‌گیری میدانی مطابق روش مرجع', 'آزمایشگاه بهداشت حرفه‌ای معتمد', within,
          within === 0 ? 'گزارش به کمیته‌ی ایمنی و اجرای اقدام کنترلی؛ اندازه‌گیری مجدد پس از اصلاح' : null);
        n++;
      });
    }
    const insI = db.prepare(`INSERT INTO occ_incidents (id, hospital_id, incident_date, kind, category, ward,
      shift_code, person_name, job_title, description, injury, lost_work_days, immediate_action,
      root_cause, corrective_action, status, reported_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'سوپروایزر کشیک')`);
    for (const x of INCIDENTS) {
      insI.run(uid(), hid, iso(x.d), x.kind, x.category, x.ward, x.shift, x.person, x.job,
        x.desc, x.injury, x.lost, x.imm, x.root, x.corr, x.status);
      n++;
    }
    const insE = db.prepare(`INSERT INTO occ_exams (id, hospital_id, person_name, personnel_code, job_group,
      ward, exposure, exam_type, exam_date, next_due, result, findings, restrictions, follow_up)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const e of EXAMS) {
      insE.run(uid(), hid, e.name, e.code, e.group, e.ward, e.exposure, e.type,
        iso(e.d), iso(e.due), e.result, e.findings, e.restrictions, e.follow);
      n++;
    }
  });
  tx();
  return n;
}

/**
 * حضورِ سه شیفتِ گذشته از روی خودِ برنامه‌ی شیفت.
 * ترکیب عمداً واقعی است: بیشتر حاضر، چند غیبت و تأخیر، و شیفتِ جاری نیمه‌کاره
 * تا عددِ «ثبت‌نشده» در داشبورد مدیر پرستاری معنا داشته باشد.
 */
function seedAttendance(hid) {
  if (db.prepare('SELECT COUNT(*) c FROM nursing_shift_attendance WHERE hospital_id = ?').get(hid).c) return 0;
  const { toJalali } = require('../src/config/jalali');
  const insA = db.prepare(`INSERT INTO nursing_shift_attendance
    (id, hospital_id, ward, att_date, shift_code, staff_id, state, note, marked_by, marked_at)
    VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`);
  const marker = db.prepare(`SELECT u.id FROM nursing_supervisor_slots s JOIN users u ON u.id = s.user_id
    WHERE s.hospital_id = ? LIMIT 1`).get(hid);
  let n = 0;
  // شیفتِ جاری از همان قاعده‌ی سرور: مرزهای ۰۷/۱۴/۱۹ به وقت تهران، و شبِ پیش از
  // ۰۷ متعلق به دیروز. بدونِ این، کارتِ «الان سرِ شیفت» روی نمایش صفر می‌ماند و
  // ماژول خاموش به‌نظر می‌رسد.
  const t = new Date(Date.now() + 3.5 * 3600000);
  const hh = t.getUTCHours();
  const curShift = hh >= 7 && hh < 14 ? 'M' : (hh >= 14 && hh < 19 ? 'E' : 'N');
  const curDate = (hh < 7 ? new Date(t.getTime() - 86400000) : t).toISOString().slice(0, 10);

  const tx = db.transaction(() => {
    // سه روزِ گذشته کامل + شیفتِ جاری به‌صورت نیمه‌کاره، تا عددِ «ثبت‌نشده» در
    // داشبورد مدیر پرستاری معنا داشته باشد و صفحه هم مرده به‌نظر نرسد.
    const days = [-3, -2, -1].map(d => ({ date: iso(d), shifts: SHIFTS, partial: false }));
    days.push({ date: curDate, shifts: [curShift], partial: true });
    for (const spec of days) {
      const date = spec.date;
      const j = toJalali(...date.split('-').map(Number));
      for (const sc of spec.shifts) {
        const expected = db.prepare(`SELECT s.ward, e.staff_id FROM shift_schedules s
          JOIN shift_entries e ON e.schedule_id = s.id
          JOIN ward_staff w ON w.id = e.staff_id
          WHERE s.hospital_id = ? AND s.jalali_year = ? AND s.jalali_month = ? AND e.day = ?
            AND instr(e.codes, ?) > 0 AND w.is_active = 1`).all(hid, j.jy, j.jm, j.jd, sc);
        expected.forEach((r, i) => {
          // شیفتِ جاری عمداً ناتمام می‌ماند: حدود یک‌سومِ آخر بی‌تیک تا عددِ
          // «ثبت‌نشده» واقعی باشد و نشان دهد سوپروایزر هنوز مشغول است.
          if (spec.partial && i % 3 === 2) return;
          // الگوی ثابت به‌جای تصادف: نمایش باید هر بار یک‌شکل باشد
          const m = (i + date.charCodeAt(9) * 7 + sc.charCodeAt(0)) % 17;
          const state = m === 0 ? 'غایب' : (m === 5 ? 'تأخیر' : (m === 9 ? 'جانشین' : 'حاضر'));
          const note = state === 'غایب' ? 'مرخصی استحقاقی تأییدشده'
            : (state === 'تأخیر' ? 'تأخیر ۲۰ دقیقه‌ای — ترافیک' : null);
          insA.run(uid(), hid, r.ward, date, sc, r.staff_id, state, note, marker ? marker.id : null);
          n++;
        });
      }
    }
  });
  tx();
  return n;
}

/** گزارش ۲۴ ساعته: دیروز بررسی‌شده، پریروزِ ثبت‌شده منتظرِ بررسی (سیگنالِ «کار من»). */
function seedReports(hid) {
  if (db.prepare('SELECT COUNT(*) c FROM nursing_supervisor_reports WHERE hospital_id = ?').get(hid).c) return 0;
  const sup = db.prepare(`SELECT u.id FROM nursing_supervisor_slots s JOIN users u ON u.id = s.user_id
    WHERE s.hospital_id = ? LIMIT 1`).get(hid);
  const dir = db.prepare(`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.hospital_id = ? AND r.code = 'nursing_director' LIMIT 1`).get(hid);
  const headcount = (date, sc) => {
    const rows = db.prepare(`SELECT state, COUNT(*) c FROM nursing_shift_attendance
      WHERE hospital_id = ? AND att_date = ? AND shift_code = ? GROUP BY state`).all(hid, date, sc);
    const t = { expected: 0, 'حاضر': 0, 'غایب': 0, 'تأخیر': 0, 'جانشین': 0, 'ثبت‌نشده': 0 };
    for (const r of rows) { t[r.state] = r.c; t.expected += r.c; }
    t.on_duty = t['حاضر'] + t['تأخیر'] + t['جانشین'];
    return JSON.stringify(t);
  };
  const ins = db.prepare(`INSERT INTO nursing_supervisor_reports (id, hospital_id, report_date, shift_code,
    supervisor_id, headcount_json, events, actions, handover, status, submitted_at,
    reviewed_by, reviewed_at, review_note, corrective_action)
    VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),?,?,?,?)`);
  let n = 0;
  const tx = db.transaction(() => {
    ins.run(uid(), hid, iso(-2), 'N', sup ? sup.id : null, headcount(iso(-2), 'N'),
      'کمبود یک نفر در شیفت شب ICU به دلیل مرخصی استعلاجی. پذیرش سه بیمار بدحال از اورژانس بین ساعت ۲ تا ۴ بامداد.',
      'یک پرستار از بخش داخلی به‌عنوان جانشین به ICU منتقل شد. هماهنگی با پزشک کشیک برای اولویت‌بندی پذیرش‌ها.',
      'پیگیری تأمین نیروی ثابت شیفت شب ICU با مدیریت پرستاری.',
      // مُهرِ زمان به‌شکلِ خودِ SQLite ساخته می‌شود، نه رشته‌ی "datetime('now')" —
      // آن رشته به‌عنوان پارامتر عیناً ذخیره می‌شد و تاریخِ بررسی خوانا نبود.
      'بررسی‌شده', dir ? dir.id : null, new Date().toISOString().slice(0, 19).replace('T', ' '),
      'گزارش کامل و به‌موقع ثبت شده است. جابه‌جایی نیرو درست انجام شده.',
      'طرح تأمین نیروی شیفت شب ICU در کمیته‌ی پرستاری هفته‌ی آینده بررسی شود.');
    n++;
    ins.run(uid(), hid, iso(-1), 'E', sup ? sup.id : null, headcount(iso(-1), 'E'),
      'خرابی یکی از دو دستگاه ساکشن پرتابل اورژانس. دو مورد تأخیر ورود پرسنل شیفت عصر.',
      'دستگاه به واحد تجهیزات پزشکی تحویل و دستگاه جایگزین از ریکاوری تأمین شد.',
      'پیگیری تعمیر ساکشن و بازگشت دستگاه امانی به ریکاوری.',
      'ثبت‌شده', null, null, null, null);
    n++;
  });
  tx();
  return n;
}

function runMigration() {
  console.log('[Seed OccHealth+Shift Sample] Starting...');
  try {
    let oh = 0, att = 0, rep = 0;
    for (const h of db.prepare('SELECT id FROM hospitals').all()) {
      oh += seedOccHealth(h.id);
      att += seedAttendance(h.id);
      rep += seedReports(h.id);
    }
    console.log(`[Seed OccHealth+Shift Sample] ✅ سلامت حرفه‌ای: ${oh} رکورد | حضور شیفتی: ${att} | گزارش ۲۴ ساعته: ${rep}`);
  } catch (err) {
    console.error('[Seed OccHealth+Shift Sample] ❌ Failed:', err.message);
  }
}

if (require.main === module) { runMigration(); process.exit(0); }

module.exports = { runMigration, SHIFT_FA };
