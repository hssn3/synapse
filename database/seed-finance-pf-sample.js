/**
 * داده‌ی نمونه برای دو ماژولِ تازه: منابع مالی، و بیمارمحوری و علت‌کاوی
 * ---------------------------------------------------------------------
 * همان دلیلِ seed-occhealth-shift-sample.js: سیدِ ساختاری فقط جدول می‌سازد و
 * کارفرمایی که صفحه را با چند صفرِ قرمز باز کند، ماژول را «خراب» می‌خواند نه
 * «خالی».
 *
 * دو قاعده‌ی همان فایل این‌جا هم برقرار است:
 *
 *  • فقط جدولِ **خالیِ** همان بیمارستان پر می‌شود؛ روی داده‌ی واقعیِ مشتری
 *    هیچ‌وقت نمی‌نشیند، حتی اگر تصادفی اجرا شود.
 *
 *  • ستون‌های محاسباتی این‌جا دستی نوشته می‌شوند چون درجِ مستقیم از مسیرِ
 *    validate رد نمی‌شود؛ پس عمداً با همان فرمولِ سرور حساب شده‌اند
 *    (انحراف = تخصیص − هزینه، فاصله = اختلافِ دو تاریخ، شمارش‌پذیری = ناخواسته
 *    و ≤ ۳۰ روز و بدون استثنا). اگر این‌ها با هم نخوانند، عددِ داشبورد با
 *    جدول نمی‌خواند و اولین چیزی است که در نمایش دیده می‌شود.
 *
 * ترکیب عمداً تمیزِ صددرصد نیست: یک انحرافِ بزرگ، یک گزارشِ تحویل‌نشده، یک
 * کمکِ ثبت‌نشده در حسابداری، یک پرونده‌ی تعارض منافعِ باز، دو بستری مجددِ
 * بدون تحلیل ریشه‌ای و یک ترخیصِ قابل پیشگیریِ بدون اقدام — همان‌هایی که
 * کارتابل «کار من» را روشن می‌کنند و نشان می‌دهند سامانه می‌فهمد چه کم است.
 *
 * Run: node database/seed-finance-pf-sample.js (یا خودکار روی هر boot).
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');
const uid = () => crypto.randomUUID();

// تاریخِ نسبی، تا داده هر وقت اجرا شود «تازه» بماند و بازه‌های ۱۲ ماهه‌ی
// داشبورد خالی درنیایند.
const iso = (dayOffset) => new Date(Date.now() + dayOffset * 86400000).toISOString().slice(0, 10);
const gap = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

const empty = (table, hid) =>
  !db.prepare(`SELECT 1 FROM ${table} WHERE hospital_id = ? LIMIT 1`).get(hid);

/* ---------------------------------------------------------------- مالی --- */

const BUDGET = [
  { program: 'تجهیز و توسعه‌ی اورژانس', code: '۱۳۰۱۰۰', source: 'ردیف بودجه‌ای',
    alloc: 8500000000, spent: 8120000000, period: 'بهار ۱۴۰۵', resp: 'مدیر بیمارستان' },
  { program: 'برنامه‌ی بهبود کیفیت و اعتباربخشی', code: '۱۳۰۲۰۰', source: 'درآمد اختصاصی',
    alloc: 1200000000, spent: 1155000000, period: 'بهار ۱۴۰۵', resp: 'مدیر اعتباربخشی' },
  { program: 'آموزش و توانمندسازی کارکنان', code: '۱۳۰۳۰۰', source: 'کمک برنامه‌ای وزارت',
    alloc: 900000000, spent: 430000000, period: 'بهار ۱۴۰۵', resp: 'سوپروایزر آموزشی',
    reason: 'دو دوره‌ی آموزشیِ نیمه‌ی دوم سال به‌دلیل تأخیر در ابلاغ سرفصلِ وزارت برگزار نشد.',
    action: 'دوره‌ها به تابستان منتقل و اعتبارِ استفاده‌نشده در متمم به همان سرفصل بازتخصیص شد.' },
  { program: 'نگهداشت تجهیزات پزشکی', code: '۱۳۰۴۰۰', source: 'درآمد اختصاصی',
    alloc: 2400000000, spent: 2660000000, period: 'بهار ۱۴۰۵', resp: 'مسئول تجهیزات پزشکی',
    reason: 'تعمیر اضطراری دستگاه سی‌تی‌اسکن و تعویض تیوب، خارج از برآورد اولیه.',
    action: 'کسری از محلِ صرفه‌جویی سرفصل اداری تأمین و برآوردِ سال آینده اصلاح شد.' },
  { program: 'پیشگیری و کنترل عفونت', code: '۱۳۰۵۰۰', source: 'ردیف بودجه‌ای',
    alloc: 700000000, spent: 690000000, period: 'بهار ۱۴۰۵', resp: 'سوپروایزر کنترل عفونت' },
  { program: 'بهسازی فضای فیزیکی بخش زنان', code: '۱۳۰۶۰۰', source: 'خیرین و مشارکت مردمی',
    alloc: 3000000000, spent: 2880000000, period: 'بهار ۱۴۰۵', resp: 'مدیر بیمارستان' },
];

function seedBudget(hid) {
  if (!empty('fin_budget_lines', hid)) return 0;
  const ins = db.prepare(`INSERT INTO fin_budget_lines (id, hospital_id, year, period, program_title,
    budget_code, source, allocated_amount, spent_amount, variance, variance_pct,
    aligned_with_program, deviation_reason, corrective_action, responsible, approved_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'تیم رهبری و مدیریت')`);
  const tx = db.transaction(() => {
    for (const b of BUDGET) {
      const v = b.alloc - b.spent;
      ins.run(uid(), hid, '۱۴۰۵', b.period, b.program, b.code, b.source, b.alloc, b.spent,
        v, Math.round((v / b.alloc) * 1000) / 10, b.reason ? 0 : 1,
        b.reason || null, b.action || null, b.resp);
    }
  });
  tx();
  return BUDGET.length;
}

const REPORTS = [
  { month: 'خرداد', alloc: 16700000000, spent: 15935000000,
    analysis: 'هزینه‌کردِ سه‌ماهه‌ی اول در مجموع ۹۵٫۴٪ اعتبارِ تخصیصی بوده و در پنج برنامه از شش برنامه منطبق با اهداف ابلاغی است.',
    dev: 'سرفصل آموزش با ۵۲٪ عدمِ جذب، و نگهداشت تجهیزات با ۱۰٫۸٪ بیش‌هزینه.',
    act: 'انتقال دوره‌های آموزشی به تابستان و بازتخصیص اعتبار؛ اصلاح برآورد نگهداشت در متمم.',
    ic: 1, sub: 1, rev: -46, dec: 'مصوب شد گزارشِ جذبِ سرفصل آموزش ماهانه به تیم رهبری ارائه شود.' },
  { month: 'تیر', alloc: 5600000000, spent: 5380000000,
    analysis: 'جذبِ ماهانه ۹۶٪ و بدون انحرافِ معنادار. سهم خیرین در تأمین منابع این ماه ۷٪ بوده است.',
    dev: null, act: null, ic: 1, sub: 1, rev: -16,
    dec: 'گزارش تأیید شد؛ ادامه‌ی روند فعلی.' },
  { month: 'مرداد', alloc: 5900000000, spent: 5410000000,
    analysis: 'جذب ۹۱٫۷٪. کاهش نسبت به تیر عمدتاً ناشی از تأخیر تسویه‌ی دو قرارداد پشتیبانی است.',
    dev: 'تأخیر در تسویه‌ی قرارداد خدمات نظافت و قرارداد نگهداری آسانسور.',
    act: 'پیگیری تسویه تا پایان شهریور و درج در دستور جلسه‌ی تیم رهبری.',
    // این یکی عمداً تحویل نشده تا کارتابل «کار من» یک کارِ واقعی داشته باشد.
    ic: 1, sub: 0, rev: null, dec: null },
];

function seedReports(hid) {
  if (!empty('fin_reports', hid)) return 0;
  const ins = db.prepare(`INSERT INTO fin_reports (id, hospital_id, year, month, total_allocated,
    total_spent, variance_pct, analysis, deviations, actions, internal_control_done,
    internal_control_note, submitted_to_leadership, leadership_review_date, leadership_decision, prepared_by)
    VALUES (?,?,'۱۴۰۵',?,?,?,?,?,?,?,?,?,?,?,?,'مدیر مالی')`);
  const tx = db.transaction(() => {
    for (const r of REPORTS) {
      ins.run(uid(), hid, r.month, r.alloc, r.spent,
        Math.round(((r.alloc - r.spent) / r.alloc) * 1000) / 10,
        r.analysis, r.dev, r.act, r.ic,
        'کنترل داخلی مطابق استانداردهای حسابداری بخش عمومی انجام و مغایرتی مشاهده نشد.',
        r.sub, r.rev == null ? null : iso(r.rev), r.dec);
    }
  });
  tx();
  return REPORTS.length;
}

const DONATIONS = [
  { d: -160, donor: 'مجمع خیرین سلامت شهرستان', dk: 'مجمع خیرین سلامت', kind: 'ساخت و توسعه',
    amt: 3000000000, purpose: 'مشارکت در بهسازی و توسعه‌ی بخش زنان و زایمان',
    prog: 'بهسازی فضای فیزیکی بخش زنان', la: 1, acc: 1, receipt: 'خ-۱۴۰۵-۰۱' },
  { d: -128, donor: 'مؤسسه خیریه مهر ماندگار', dk: 'مؤسسه خیریه', kind: 'تجهیزات پزشکی',
    amt: 1450000000, purpose: 'اهدای دو دستگاه ونتیلاتور به بخش مراقبت‌های ویژه',
    prog: 'تجهیز و توسعه‌ی اورژانس', la: 1, acc: 1, receipt: 'خ-۱۴۰۵-۰۲' },
  { d: -96, donor: 'خیّر نیک‌اندیش (ناشناس)', dk: 'خیّر حقیقی', kind: 'هزینه درمان مددجو',
    amt: 185000000, purpose: 'تأمین هزینه‌ی جراحی بیمار بی‌بضاعت با معرفی مددکاری',
    patient: 'MC-۱۴۰۵-۰۳۱', sw: 1, la: 0, acc: 1, receipt: 'خ-۱۴۰۵-۰۳' },
  { d: -61, donor: 'شرکت صنعتی پارس', dk: 'سازمان/شرکت', kind: 'نقدی',
    amt: 500000000, purpose: 'کمک نقدی به صندوق حمایت از بیماران نیازمند',
    prog: 'حمایت از بیماران بی‌بضاعت', la: 0, acc: 1, receipt: 'خ-۱۴۰۵-۰۴' },
  { d: -34, donor: 'خیّر حاج‌آقا رضوی', dk: 'خیّر حقیقی', kind: 'هزینه درمان مددجو',
    amt: 92000000, purpose: 'تأمین هزینه‌ی داروی بیمار شیمی‌درمانی با هماهنگی مددکاری',
    patient: 'MC-۱۴۰۵-۰۴۷', sw: 1, la: 0, acc: 1, receipt: 'خ-۱۴۰۵-۰۵' },
  { d: -9, donor: 'مؤسسه خیریه مهر ماندگار', dk: 'مؤسسه خیریه', kind: 'بازسازی و بهسازی',
    amt: 640000000, purpose: 'رنگ‌آمیزی و بهسازی راهروی بستری داخلی',
    prog: 'بهسازی فضای فیزیکی', la: 1, acc: 0, receipt: null },
];

function seedDonations(hid) {
  if (!empty('fin_donations', hid)) return 0;
  const ins = db.prepare(`INSERT INTO fin_donations (id, hospital_id, year, donation_date, donor_name,
    donor_kind, kind, amount, purpose, target_program, patient_case_code,
    social_work_coordinated, leadership_approved, receipt_no, recorded_in_accounting)
    VALUES (?,?,'۱۴۰۵',?,?,?,?,?,?,?,?,?,?,?,?)`);
  const tx = db.transaction(() => {
    for (const d of DONATIONS) {
      ins.run(uid(), hid, iso(d.d), d.donor, d.dk, d.kind, d.amt, d.purpose,
        d.prog || null, d.patient || null, d.sw ? 1 : 0, d.la, d.receipt, d.acc);
    }
  });
  tx();
  return DONATIONS.length;
}

function seedTargets(hid) {
  if (!empty('fin_donation_targets', hid)) return 0;
  const ins = db.prepare(`INSERT INTO fin_donation_targets (id, hospital_id, year, target_amount,
    achieved_amount, achieved_pct, share_of_budget_pct, promotion_plan, meetings_held, approved_by)
    VALUES (?,?,?,?,?,?,?,?,?,'تیم رهبری و مدیریت')`);
  const rows = [
    ['۱۴۰۴', 4000000000, 4380000000, 6.8,
      'دو نشست سالانه با مجمع خیرین، تهیه‌ی بروشور برنامه‌های توسعه‌ای، و معرفی پروژه‌ها در نماز جمعه‌ی شهرستان.', 2],
    ['۱۴۰۵', 6500000000, 5867000000, 8.1,
      'سه نشست فصلی با مجمع خیرین و مؤسسات خیریه، تولید کلیپ معرفی پروژه‌ی بخش زنان، و همکاری مددکاری برای معرفی نیازهای بیماران بی‌بضاعت.', 3],
  ];
  const tx = db.transaction(() => {
    for (const [y, t, a, share, plan, m] of rows)
      ins.run(uid(), hid, y, t, a, Math.round((a / t) * 1000) / 10, share, plan, m);
  });
  tx();
  return rows.length;
}

/* ------------------------------------------------ بیمارمحوری و علت‌کاوی --- */

const COI = [
  { d: -140, kind: 'اخذ وجه غیرقانونی از بیمار', title: 'دریافت وجه خارج از صندوق در بخش جراحی',
    unit: 'بخش جراحی', src: 'شکایت بیمار', violated: 1, informed: 1, status: 'بسته',
    desc: 'همراه بیمار گزارش داد که بابت «تسریع نوبت عمل» وجهی خارج از صندوق درخواست شده است.',
    prev: 'نصب تابلوی «هرگونه پرداخت فقط از طریق صندوق» در ورودی بخش‌ها و درج در بروشور پذیرش.',
    act: 'وجه به بیمار بازگردانده شد، مورد به کمیته اخلاق بالینی ارجاع و برای فرد خاطی اقدام انضباطی ثبت شد.',
    ref: 'صورت‌جلسه کمیته اخلاق بالینی — ۱۴۰۵/۰۲/۱۹' },
  { d: -88, kind: 'هدایت بیمار به مرکز دیگر', title: 'ارجاع بیمار به مرکز تصویربرداری خصوصیِ مرتبط',
    unit: 'درمانگاه تخصصی', src: 'ممیزی داخلی', violated: 1, informed: 1, status: 'بسته',
    desc: 'در دو پرونده، بیمار با وجود در دسترس بودن دستگاه مرکز، به یک مرکز تصویربرداری بیرونی ارجاع شده بود.',
    prev: 'حساس‌سازی پزشکان درمانگاه و اعلام در دسترس بودن نوبت تصویربرداری داخلی به‌صورت روزانه.',
    act: 'موضوع با پزشک مربوط مطرح، فرآیند ارجاع مکتوب شد و ارجاع بیرونی نیازمند ثبت دلیل بالینی است.',
    ref: 'صورت‌جلسه کمیته اخلاق بالینی — ۱۴۰۵/۰۳/۳۰' },
  { d: -37, kind: 'نقض محرمانگی یا حریم بیمار', title: 'دسترسی غیرضروری به پرونده‌ی یک بیمار',
    unit: 'مدارک پزشکی', src: 'گزارش کارکنان', violated: 0, informed: 1, status: 'در حال بررسی',
    desc: 'گزارش شد یکی از کارکنان بدون ارتباط شغلی، پرونده‌ی یک بیمارِ آشنا را مشاهده کرده است.',
    prev: 'مرور سطوح دسترسی HIS و فعال‌سازی گزارش‌گیری از مشاهده‌های خارج از بخش.',
    act: null, ref: null },
  { d: -11, kind: 'تبانی در دارو و تجهیزات', title: 'اصرار بر یک برندِ خاصِ ملزومات مصرفی',
    unit: 'انبار و تدارکات', src: 'بازدید مدیریتی', violated: 0, informed: 0, status: 'شناسایی‌شده',
    desc: 'در دو درخواست خرید، برندِ خاصی بدون دلیل فنی مشخص، به‌صورت انحصاری قید شده بود.',
    prev: null, act: null, ref: null },
];

function seedCoi(hid) {
  if (!empty('pf_coi_cases', hid)) return 0;
  const ins = db.prepare(`INSERT INTO pf_coi_cases (id, hospital_id, case_date, kind, title,
    involved_unit, reported_by, source, description, patient_right_violated, staff_informed,
    preventive_measure, corrective_action, ethics_committee_ref, status, closed_date)
    VALUES (?,?,?,?,?,?,'—',?,?,?,?,?,?,?,?,?)`);
  const tx = db.transaction(() => {
    for (const c of COI)
      ins.run(uid(), hid, iso(c.d), c.kind, c.title, c.unit, c.src, c.desc,
        c.violated, c.informed, c.prev, c.act, c.ref, c.status,
        c.status === 'بسته' ? iso(c.d + 12) : null);
  });
  tx();
  return COI.length;
}

const READMITS = [
  { code: 'RA-۱۴۰۵-۰۱۲', age: 71, sex: 'مرد', out: -96, in: -88, pw: 'داخلی', ps: 'داخلی',
    pd: 'نارسایی احتقانی قلب', rw: 'مراقبت‌های ویژه (CCU)', rd: 'ادم حاد ریه',
    rca: 1, cause: 'آموزشِ ترخیصِ ناکافی درباره‌ی محدودیت مایعات و نمک؛ نسخه‌ی دیورتیک به‌درستی توضیح داده نشده بود.',
    ds: 1, team: 'پزشک معالج، سرپرستار داخلی، سوپروایزر آموزشی، مددکار',
    act: 'چک‌لیست آموزش ترخیصِ نارسایی قلب اجباری شد و تماس پیگیری ۴۸ ساعته پس از ترخیص برقرار می‌شود.',
    fu: 'در سه ماه بعد، بستری مجدد این بیمار تکرار نشد.' },
  { code: 'RA-۱۴۰۵-۰۱۹', age: 58, sex: 'زن', out: -74, in: -63, pw: 'جراحی', ps: 'جراحی عمومی',
    pd: 'کوله‌سیستکتومی لاپاروسکوپیک', rw: 'جراحی', rd: 'عفونت محل جراحی',
    rca: 1, cause: 'مراقبت از زخم در منزل به‌درستی آموزش داده نشده و پانسمان دیرتر از موعد تعویض شده بود.',
    ds: 1, team: 'جراح، سرپرستار جراحی، سوپروایزر کنترل عفونت',
    act: 'برگه‌ی تصویریِ مراقبت از زخم به بسته‌ی ترخیص اضافه و نوبت پیگیری هفت‌روزه تعیین شد.',
    fu: 'میزان عفونت محل جراحیِ ترخیص‌شدگان در دو ماه بعد کاهش داشت.' },
  { code: 'RA-۱۴۰۵-۰۲۶', age: 66, sex: 'مرد', out: -52, in: -34, pw: 'داخلی', ps: 'ریه',
    pd: 'تشدید COPD', rw: 'داخلی', rd: 'تشدید مجدد COPD',
    rca: 1, cause: 'عدم دسترسی بیمار به اکسیژن خانگی و ترک‌نکردن سیگار؛ عاملِ اجتماعی-اقتصادی غالب بود.',
    ds: 0, team: 'پزشک معالج، مددکار اجتماعی، سوپروایزر آموزشی',
    act: 'معرفی به مددکاری برای تأمین کپسول اکسیژن و ارجاع به کلینیک ترک دخانیات.',
    fu: 'اکسیژن خانگی با کمک خیرین تأمین شد.' },
  // این دو عمداً بدون تحلیل ریشه‌ای مانده‌اند تا کارتابل «کار من» کارِ واقعی داشته باشد.
  { code: 'RA-۱۴۰۵-۰۳۳', age: 44, sex: 'زن', out: -21, in: -9, pw: 'زنان', ps: 'زنان و زایمان',
    pd: 'زایمان سزارین', rw: 'زنان', rd: 'آندومتریت پس از زایمان',
    rca: 0, cause: null, ds: 0, team: null, act: null, fu: null },
  { code: 'RA-۱۴۰۵-۰۳۸', age: 79, sex: 'مرد', out: -14, in: -4, pw: 'داخلی', ps: 'داخلی اعصاب',
    pd: 'سکته مغزی ایسکمیک', rw: 'اورژانس', rd: 'پنومونی آسپیراسیون',
    rca: 0, cause: null, ds: 0, team: null, act: null, fu: null },
  // مصداق نیست: بیش از ۳۰ روز
  { code: 'RA-۱۴۰۵-۰۴۱', age: 63, sex: 'زن', out: -120, in: -62, pw: 'ارتوپدی', ps: 'ارتوپدی',
    pd: 'تعویض مفصل زانو', rw: 'ارتوپدی', rd: 'درد مزمن زانو',
    rca: 0, cause: null, ds: 0, team: null, act: null, fu: null, unplanned: 1 },
  // مصداق نیست: استثنای صریحِ متن
  { code: 'RA-۱۴۰۵-۰۴۵', age: 55, sex: 'مرد', out: -18, in: -11, pw: 'دیالیز', ps: 'نفرولوژی',
    pd: 'نارسایی مزمن کلیه', rw: 'دیالیز', rd: 'جلسه‌ی دیالیز دوره‌ای',
    rca: 0, cause: null, ds: 0, team: null, act: null, fu: null, exclusion: 'دیالیز' },
  { code: 'RA-۱۴۰۵-۰۴۹', age: 37, sex: 'زن', out: -25, in: -6, pw: 'جراحی', ps: 'جراحی عمومی',
    pd: 'برداشتن توده‌ی پستان', rw: 'جراحی', rd: 'مرحله‌ی دوم عمل بازسازی',
    rca: 0, cause: null, ds: 0, team: null, act: null, fu: null,
    unplanned: 0, exclusion: 'بستری برنامه‌ریزی‌شده' },
];

function seedReadmissions(hid) {
  if (!empty('pf_readmissions', hid)) return 0;
  const ins = db.prepare(`INSERT INTO pf_readmissions (id, hospital_id, patient_code, age, sex,
    prev_discharge_date, prev_ward, prev_service, prev_diagnosis, readmit_date, readmit_ward,
    readmit_diagnosis, days_gap, unplanned, exclusion, countable, root_cause_done, root_cause,
    discharge_safety_related, action_team, corrective_action, followup_result)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const tx = db.transaction(() => {
    for (const r of READMITS) {
      const out = iso(r.out), inn = iso(r.in);
      const g = gap(out, inn);
      const unplanned = r.unplanned == null ? 1 : r.unplanned;
      const exclusion = r.exclusion || 'ندارد';
      // همان فرمولِ سرور، تا عددِ داشبورد با جدول یکی بماند.
      const countable = (unplanned && g <= 30 && exclusion === 'ندارد') ? 1 : 0;
      ins.run(uid(), hid, r.code, r.age, r.sex, out, r.pw, r.ps, r.pd, inn, r.rw, r.rd,
        g, unplanned, exclusion, countable, r.rca, r.cause, r.ds, r.team, r.act, r.fu);
    }
  });
  tx();
  return READMITS.length;
}

const AMA = [
  { d: -118, code: 'AM-۱۴۰۵-۰۰۴', ward: 'داخلی', svc: 'داخلی', cause: 'هزینه و مسائل مالی',
    detail: 'بیمار توان پرداخت مابه‌التفاوت بستری را نداشت و پیش از تکمیل درمان ترخیص شد.',
    prev: 1, act: 'معرفی به مددکاری در بدو پذیرش برای بیماران فاقد بیمه‌ی تکمیلی الزامی شد.',
    consent: 1, risk: 1, call: 1, fu: 'بیمار با کمک مددکاری بازگشت و درمان تکمیل شد.' },
  { d: -101, code: 'AM-۱۴۰۵-۰۰۹', ward: 'اورژانس', svc: 'اورژانس', cause: 'طولانی‌شدن بستری',
    detail: 'انتظار بیش از شش ساعت برای نتیجه‌ی مشاوره‌ی تخصصی.',
    prev: 1, act: 'زمانِ پاسخ مشاوره در اورژانس شاخص شد و به کمیته‌ی اورژانس گزارش می‌شود.',
    consent: 1, risk: 1, call: 1, fu: 'بیمار روز بعد سرپایی پیگیری شد.' },
  { d: -84, code: 'AM-۱۴۰۵-۰۱۵', ward: 'داخلی', svc: 'داخلی', cause: 'مشکل خانوادگی یا شغلی',
    detail: 'بیمار سرپرست خانوار بود و برای رسیدگی به فرزندان ترخیص را درخواست کرد.',
    prev: 0, act: null, consent: 1, risk: 1, call: 1, fu: 'وضعیت پایدار گزارش شد.' },
  { d: -72, code: 'AM-۱۴۰۵-۰۲۰', ward: 'جراحی', svc: 'جراحی عمومی', cause: 'برخورد کارکنان',
    detail: 'بیمار از نحوه‌ی پاسخ‌گویی در شیفت شب ناراضی بود.',
    prev: 1, act: 'دوره‌ی ارتباط مؤثر برای کارکنان شیفت شب برگزار و در ارزشیابی لحاظ شد.',
    consent: 1, risk: 1, call: 1, fu: 'با عذرخواهی سرپرستار، بیمار برای پیگیری سرپایی مراجعه کرد.' },
  { d: -60, code: 'AM-۱۴۰۵-۰۲۴', ward: 'زنان', svc: 'زنان و زایمان', cause: 'امکانات رفاهی و اقامتی',
    detail: 'نبودِ جای اقامت همراه در بخش زنان.',
    prev: 1, act: 'دو تخت همراه در بهسازی بخش زنان پیش‌بینی شد.',
    consent: 1, risk: 1, call: 0, fu: null },
  { d: -47, code: 'AM-۱۴۰۵-۰۲۹', ward: 'اورژانس', svc: 'اورژانس', cause: 'نارضایتی از کیفیت خدمات',
    detail: 'بیمار معتقد بود روند تشخیصی کند پیش می‌رود.',
    prev: 0, act: null, consent: 1, risk: 1, call: 1, fu: 'پیگیری تلفنی؛ بیمار به مرکز دیگری مراجعه کرده بود.' },
  { d: -33, code: 'AM-۱۴۰۵-۰۳۵', ward: 'داخلی', svc: 'ریه', cause: 'عدم پذیرش روند درمان',
    detail: 'بیمار برونکوسکوپی را نپذیرفت و ترخیص را درخواست کرد.',
    prev: 0, act: null, consent: 1, risk: 1, call: 1, fu: 'با مشاوره‌ی تلفنی، بیمار برای انجام سرپایی موافقت کرد.' },
  { d: -25, code: 'AM-۱۴۰۵-۰۴۰', ward: 'جراحی', svc: 'ارتوپدی', cause: 'برخورد کارکنان',
    // عمداً بدون اقدام اصلاحی، تا سیگنالِ «کار من» واقعی باشد.
    detail: 'شکایت از لحن پاسخ‌گویی در واحد پذیرش.',
    prev: 1, act: null, consent: 1, risk: 1, call: 0, fu: null },
  { d: -14, code: 'AM-۱۴۰۵-۰۴۴', ward: 'داخلی', svc: 'داخلی', kind: 'با رعایت',
    cause: 'انتقال به مرکز دیگر',
    detail: 'انتقال با هماهنگی قبلی به مرکز فوق‌تخصصی قلب.',
    prev: 0, act: null, consent: 1, risk: 1, call: 1, fu: 'پذیرش در مرکز مقصد تأیید شد.' },
  { d: -5, code: 'AM-۱۴۰۵-۰۴۸', ward: 'اورژانس', svc: 'اورژانس', cause: 'هزینه و مسائل مالی',
    detail: 'بیمار فاقد دفترچه‌ی بیمه بود.',
    prev: 0, act: null, consent: 0, risk: 1, call: 0,
    note: 'بیمار پیش از تکمیل فرم رضایت، بخش را ترک کرد؛ مورد در گزارش شیفت ثبت و به مددکاری اعلام شد.' },
];

function seedAma(hid) {
  if (!empty('pf_ama_discharges', hid)) return 0;
  const ins = db.prepare(`INSERT INTO pf_ama_discharges (id, hospital_id, patient_code, discharge_date,
    kind, ward, service, cause_category, cause_detail, preventable, corrective_action,
    consent_form_signed, risk_explained, followup_call_done, followup_result, recorded_by, note)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'سوپروایزر بالینی',?)`);
  const tx = db.transaction(() => {
    for (const a of AMA)
      ins.run(uid(), hid, a.code, iso(a.d), a.kind || 'با میل شخصی', a.ward, a.svc,
        a.cause, a.detail, a.prev, a.act, a.consent, a.risk, a.call, a.fu, a.note || null);
  });
  tx();
  return AMA.length;
}

function runMigration() {
  console.log('[Seed Finance+PF Sample] Starting...');
  try {
    let fin = 0, pf = 0;
    for (const h of db.prepare('SELECT id FROM hospitals').all()) {
      fin += seedBudget(h.id) + seedReports(h.id) + seedDonations(h.id) + seedTargets(h.id);
      pf += seedCoi(h.id) + seedReadmissions(h.id) + seedAma(h.id);
    }
    console.log(`[Seed Finance+PF Sample] ✅ مالی: ${fin} رکورد | بیمارمحوری: ${pf} رکورد`);
  } catch (err) {
    console.error('[Seed Finance+PF Sample] ❌ Failed:', err.message);
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
