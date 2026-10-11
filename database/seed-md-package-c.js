/**
 * Seed بسته C: داده‌های جاافتاده واقعی از md (بدون جعل، بدون نام حقیقی)
 * چرا این سید ساخته شد: سه ساب‌ایجنت ۳۴ بخش md را خواندند؛ بیشتر کدها از قبل
 * توسط MD-Full بودند ولی این شکاف‌های واقعی ماندند: چک‌لیست صلاحیت نوزادان،
 * روش DUE دارویی، ۳ فرایند (نارکوتیک/SBAR/تخلیه)، ۳ KPI پایش 1403، ۶ تجهیز با
 * برند واقعی، ۳ دوره آموزشی با تاریخ واقعی، و قاعده نقطه سفارش انبار. همه با
 * hospital_id جدا و idempotent (اجرای دوباره = صفر تغییر). نام/تلفن حقیقی
 * اشخاص عمداً وارد نشد (قانون ۹)؛ مسئول‌ها فقط با عنوان سمت آمده‌اند.
 * Run: npm run seed-md-package-c
 */
const crypto = require('crypto');

function store() {
  return require('../src/config/database-sqlite');
}
function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.floor(Math.random() * 1e9));
}

const CHECKLIST = {
  code: 'OH.ED.CL.9703.00',
  title: 'چک‌لیست ارزیابی صلاحیت حرفه‌ای پرستار نوزادان',
  items: [
    'ارتباط موثر با بیمار/مددجو/همراه برقرار می‌کند',
    'ارزیابی اولیه نوزاد را انجام و تشخیص پرستاری ثبت می‌کند',
    'دارودهی به روش صحیح 7Right انجام می‌دهد',
    'تحویل بیمار بر بالین با تکنیک SBAR انجام می‌دهد',
    'مهارت احیای قلبی‌ریوی پایه نوزادان را اجرا می‌کند',
  ],
};

const DOCS = [
  { code: 'OH.QI.PR.9627.07', title: 'ارزیابی روند تجویز و مصرف دارو (DUE)', doc_type: 'procedure', issue_date: '2024-09-01', purpose: 'تناسب دارو/دوز/تداخل/آماده‌سازی در کمیته دارو و درمان؛ گذشته‌نگر و آینده‌نگر' },
  { code: 'OH-STOCK-RULE-01', title: 'قاعده نقطه سفارش و هشدار کمبود انبار', doc_type: 'procedure', issue_date: '2024-09-01', purpose: 'نقطه سفارش ضروری؛ داروی حیاتی حداقل ۳ ماه موجودی؛ FEFO؛ کنترل ماهانه انقضا؛ ثبت روزانه دما/رطوبت' },
];

const PROCESSES = [
  {
    code: 'OH.QI.PC.961907', title: 'فرایند تحویل داروی ضد درد نارکوتیک', domain: 'main',
    description: 'ثبت دستور پزشک تا نگهداری در کمد قفل‌دار با چک دو پرستاره',
    steps: [
      'ثبت دستور پزشک در پرونده',
      'چک دو پرستاره با مهر و امضا و تکمیل فرم نارکوتیک',
      'تحویل به سوپروایزر کشیک و کشیدن دوز با چسباندن پوکه',
      'ثبت در دفتر نارکوتیک دفتر پرستاری',
      'جمع‌آوری روزانه ۹ تا ۱۲ و تحویل به داروخانه با تطبیق امضا',
      'تحویل ویال پر و نگهداری در کمد قفل‌دار',
    ],
  },
  {
    code: 'SBAR-HANDOFF-01', title: 'فرایند تحویل بیمار و تحویل نوبت‌کاری (SBAR)', domain: 'main',
    description: 'تقسیم بیماران توسط سرپرستار، اطلاع به بیمار، حفظ حریم، محیط آرام',
    steps: [
      'تقسیم بیماران توسط سرپرستار پیش از شروع نوبت',
      'اطلاع‌رسانی به بیمار درباره مسئول نوبت',
      'تحویل بالینی با ساختار SBAR بدون وقفه',
      'کنترل ایمنی تجهیزات و حضور کمک‌بهیار',
    ],
  },
  {
    code: 'EVAC-01', title: 'فرایند تخلیه اضطراری', domain: 'support',
    description: 'زمان هشدار، تحرک/آسیب‌پذیری بیماران، نجات/انتقال/استقرار',
    steps: [
      'اعلام هشدار و فعال‌سازی چارت عملیاتی تخلیه',
      'اولویت‌بندی بر اساس تحرک و آسیب‌پذیری بیماران',
      'نجات و انتقال به نقطه استقرار امن',
      'استقرار و تحویل به تیم مقصد با ثبت',
    ],
  },
];

const KPIS = [
  { title: 'درصد رعایت دارودهی صحیح (پایش 1403)', target: 80, def: 'میانگین چک دارودهی سه‌ماهه سوم 76٪؛ هدف 80٪' },
  { title: 'درصد ثبت صحیح کاردکس (پایش 1403)', target: 80, def: 'میانگین چک کاردکس سه‌ماهه سوم 78٪؛ ضعف LASA و شناسایی بیمار' },
  { title: 'درصد اجرای SBAR در تحویل نوبت (برنامه 1403)', target: 90, def: 'افزایش ۱۰٪ نسبت به پایه؛ پایش فصلی سوپروایزری' },
];

const ASSETS = [
  { code: 'AST-ZOLL-01', title: 'الکتروشوک', manufacturer: 'Zoll', location: 'اورژانس', category: 'تجهیزات پزشکی' },
  { code: 'AST-ECG-01', title: 'الکتروکاردیوگراف', manufacturer: 'Fukuda', location: 'اورژانس', category: 'تجهیزات پزشکی' },
  { code: 'AST-MON-01', title: 'مانیتور علائم حیاتی ثابت', manufacturer: 'Saadat', location: 'CCU', category: 'تجهیزات پزشکی' },
  { code: 'AST-VENT-01', title: 'ونتیلاتور ثابت', manufacturer: 'Drager', location: 'ECU', category: 'تجهیزات پزشکی' },
  { code: 'AST-PUMP-01', title: 'پمپ سرنگ', manufacturer: 'Atom', location: 'ICU', category: 'تجهیزات پزشکی' },
  { code: 'AST-SUC-01', title: 'ساکشن پرتابل', manufacturer: 'Medela', location: 'اورژانس', category: 'تجهیزات پزشکی' },
];

const SESSIONS = [
  { title: 'مهارت‌آموزی بهداشت بیماران (دهانشویه)', date: '2025-02-18', hours: 8, group: 'کلیه کارکنان', method: 'سخنرانی گروهی + پیش‌آزمون/پس‌آزمون' },
  { title: 'CPR پایه و انتقال ایمن در بحران', date: '2025-02-22', hours: 8, group: 'کمک‌پرستاران', method: 'کارگاهی + مهارت‌سنجی' },
  { title: 'کار با الکتروشوک و CPR پایه', date: '2025-01-08', hours: 4, group: 'کارکنان پرستاری', method: 'کارگاهی' },
];

function run() {
  const { query } = store();
  let hospitals = [];
  try { hospitals = query(`SELECT id FROM hospitals WHERE is_active = 1`).rows; } catch (e) { hospitals = []; }
  if (!hospitals.length) { console.log('[Seed PackageC] no hospitals. 0 rows.'); return { added: 0 }; }
  let added = 0;

  for (const h of hospitals) {
    const hid = h.id;
    // ۱) چک‌لیست صلاحیت نوزادان
    try {
      const ex = query(`SELECT id FROM checklists WHERE hospital_id = ? AND checklist_code = ?`, [hid, CHECKLIST.code]).rows[0];
      let cid = ex && ex.id;
      if (!cid) {
        cid = uid();
        query(`INSERT INTO checklists (id, hospital_id, title, checklist_code, status) VALUES (?, ?, ?, ?, 'active')`,
          [cid, hid, CHECKLIST.title, CHECKLIST.code]);
        added++;
        CHECKLIST.items.forEach((q, i) => {
          try {
            query(`INSERT INTO checklist_items (id, hospital_id, checklist_id, question_text, answer_type, sort_order) VALUES (?, ?, ?, ?, 'likert5', ?)`,
              [uid(), hid, cid, q, i + 1]);
            added++;
          } catch (e) { /* تک‌آیتم نباید کل سید را بخواباند */ }
        });
      }
    } catch (e) { console.error('[Seed PackageC] checklist failed:', e.message); }
    // ۲) اسناد (DUE + قاعده انبار)
    for (const d of DOCS) {
      try {
        const ex = query(`SELECT 1 AS x FROM controlled_documents WHERE hospital_id = ? AND doc_code = ?`, [hid, d.code]).rows[0];
        if (!ex) {
          query(`INSERT INTO controlled_documents (id, hospital_id, doc_type, title, doc_code, issue_date, purpose, status, version_no) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 7)`,
            [uid(), hid, d.doc_type, d.title, d.code, d.issue_date, d.purpose]);
          added++;
        }
      } catch (e) { /* non-fatal */ }
    }
    // ۳) فرایندها + گام‌ها
    for (const p of PROCESSES) {
      try {
        let row = query(`SELECT id FROM processes WHERE hospital_id = ? AND process_code = ?`, [hid, p.code]).rows[0];
        let pid = row && row.id;
        if (!pid) {
          pid = uid();
          query(`INSERT INTO processes (id, hospital_id, title, domain, process_code, description) VALUES (?, ?, ?, ?, ?, ?)`,
            [pid, hid, p.title, p.domain, p.code, p.description]);
          added++;
        }
        const hasSteps = query(`SELECT COUNT(*) c FROM process_steps WHERE hospital_id = ? AND process_id = ?`, [hid, pid]).rows[0].c;
        if (!hasSteps) {
          p.steps.forEach((t, i) => {
            try {
              query(`INSERT INTO process_steps (id, hospital_id, process_id, step_type, text, sort_order) VALUES (?, ?, ?, 'action', ?, ?)`,
                [uid(), hid, pid, t, i + 1]);
              added++;
            } catch (e) { /* non-fatal */ }
          });
        }
      } catch (e) { console.error('[Seed PackageC] process failed:', e.message); }
    }
    // ۴) KPIها
    for (const k of KPIS) {
      try {
        const ex = query(`SELECT 1 AS x FROM hospital_kpis WHERE hospital_id = ? AND title = ?`, [hid, k.title]).rows[0];
        if (!ex) {
          query(`INSERT INTO hospital_kpis (id, hospital_id, title, target_value, definition, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
            [uid(), hid, k.title, k.target, k.def]);
          added++;
        }
      } catch (e) { /* non-fatal */ }
    }
    // ۵) تجهیزات با برند واقعی
    for (const a of ASSETS) {
      try {
        const ex = query(`SELECT 1 AS x FROM facility_assets WHERE hospital_id = ? AND asset_code = ?`, [hid, a.code]).rows[0];
        if (!ex) {
          query(`INSERT INTO facility_assets (id, hospital_id, asset_code, title, category, location, manufacturer, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [uid(), hid, a.code, a.title, a.category, a.location, a.manufacturer]);
          added++;
        }
      } catch (e) { /* non-fatal */ }
    }
    // ۶) دوره‌های آموزشی با تاریخ واقعی (مدرس: عنوان سمت، نه نام شخص)
    for (const s of SESSIONS) {
      try {
        const ex = query(`SELECT 1 AS x FROM edu_sessions WHERE hospital_id = ? AND title = ? AND session_date = ?`, [hid, s.title, s.date]).rows[0];
        if (!ex) {
          query(`INSERT INTO edu_sessions (id, hospital_id, title, session_date, duration_hours, target_group, trainer, method, planned) VALUES (?, ?, ?, ?, ?, ?, 'سوپروایزر آموزشی', ?, 1)`,
            [uid(), hid, s.title, s.date, s.hours, s.group, s.method]);
          added++;
        }
      } catch (e) { /* non-fatal */ }
    }
  }
  console.log(`[Seed PackageC] ${added} rows (idempotent).`);
  return { added };
}

module.exports = { run, runMigration: run };
