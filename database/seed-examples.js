/**
 * Migration + Seed: یک رکورد «نمونه/الگو» برای هر ماژول، به ازای هر بیمارستان.
 *
 * چرا: کاربر جدید وقتی وارد یک ماژول می‌شود فهرست خالی می‌بیند و نمی‌داند یک رکورد
 * «درست پرشده» چه شکلی است. برای هر ماژول دقیقاً یک نمونه‌ی واقعی و منسجم ساخته می‌شود
 * که کاربر می‌تواند آن را بخواند، کپی کند و بعد آزادانه حذف کند.
 *
 * قواعد:
 * - ستون `is_example = 1` روی همه‌ی جدول‌ها اضافه می‌شود تا فرانت بتواند نشان «نمونه» بزند
 *   و بعداً بشود این رکوردها را یکجا فیلتر/پاک کرد.
 * - عنوان‌ها با پیشوند «نمونه: » شروع می‌شوند تا بدون نگاه به badge هم مشخص باشند.
 * - محتوا عمداً اداری/فرایندی است، نه بالینی — هیچ ادعای پزشکی ساختگی‌ای ساخته نمی‌شود.
 * - idempotent: به ازای هر (بیمارستان × ماژول) فقط اگر رکورد نمونه وجود نداشته باشد ساخته می‌شود.
 *   اجرای دوباره باید صفر تغییر بدهد.
 * - اگر کاربر نمونه را حذف کند، دوباره ساخته **نمی‌شود** (وگرنه حذف بی‌معنا می‌شد):
 *   حذف در جدول example_seed_log ثبت می‌ماند.
 *
 * Run: node database/seed-examples.js — روی هر boot از src/app.js هم اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

// جدول‌هایی که ستون is_example می‌گیرند
const EXAMPLE_TABLES = [
  'controlled_documents', 'checklists', 'checklist_submissions', 'committee_meeting_minutes',
  'fmea_records', 'internal_audits', 'certifications', 'digital_library_items',
];

function addExampleColumn(table) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes('is_example')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN is_example INTEGER DEFAULT 0`);
  }
}

// دفترچه‌ی «این نمونه قبلاً ساخته شده» — تا حذف توسط کاربر دائمی بماند
function ensureLog() {
  db.exec(`CREATE TABLE IF NOT EXISTS example_seed_log (
    hospital_id TEXT NOT NULL,
    module TEXT NOT NULL,
    seeded_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (hospital_id, module)
  )`);
}
const alreadySeeded = (hid, mod) =>
  !!db.prepare('SELECT 1 FROM example_seed_log WHERE hospital_id = ? AND module = ?').get(hid, mod);
const markSeeded = (hid, mod) =>
  db.prepare('INSERT OR IGNORE INTO example_seed_log (hospital_id, module) VALUES (?, ?)').run(hid, mod);

// تاریخ‌های نسبی تا نمونه همیشه «تازه» به‌نظر برسد
const dayOffset = n => {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// ۱) سند کنترل‌شده — روش اجرایی خودارجاع: خودِ سند توضیح می‌دهد سند چطور تصویب می‌شود
// ---------------------------------------------------------------------------
function seedDocument(hid, adminId) {
  const id = uuid();
  db.prepare(`INSERT INTO controlled_documents (
    id, hospital_id, doc_type, title, doc_code, decree_text, issue_date, last_review_date, prepared_date,
    purpose, scope, legal_references, definitions, resources, related_staff, responsible_person,
    monitoring_method, work_method, related_documents, distribution_list, status, version_no,
    created_by, is_example
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(
    id, hid, 'procedure',
    'نمونه: روش اجرایی تدوین، تصویب و بازنگری اسناد کنترل‌شده',
    'QM-PR-001',
    'این سند پس از تصویب در کمیته پایش و سنجش کیفیت، از تاریخ ابلاغ برای تمامی واحدهای بیمارستان لازم‌الاجرا است. مسئولیت اجرای آن بر عهده مسئولین واحدها و نظارت بر آن بر عهده دفتر بهبود کیفیت است.',
    dayOffset(-45), dayOffset(-45), dayOffset(-60),
    // purpose
    'تعیین یک روش یکسان و مستند برای تدوین، بازبینی، تصویب، ابلاغ، توزیع، بازنگری دوره‌ای و ابطال اسناد کنترل‌شده بیمارستان، به‌نحوی که در هر زمان تنها نسخه معتبر و به‌روز هر سند در دسترس کاربران باشد و نسخه‌های منسوخ از محل استفاده جمع‌آوری شوند.',
    // scope
    'این روش اجرایی تمامی اسناد کنترل‌شده بیمارستان شامل خط‌مشی‌ها، روش‌های اجرایی، دستورالعمل‌ها و فرم‌های ابلاغی را در همه واحدهای بالینی، پاراکلینیک و پشتیبانی در بر می‌گیرد. اسناد برون‌سازمانی (بخشنامه‌ها و آیین‌نامه‌های ابلاغی وزارت) از شمول تدوین خارج‌اند اما مشمول ثبت و توزیع کنترل‌شده هستند.',
    // legal_references
    'سنجه‌های اعتباربخشی ملی بیمارستان‌های ایران، ویرایش ششم — محور رهبری و مدیریت، بخش مدیریت اسناد و مدارک؛ دستورالعمل‌های ابلاغی وزارت بهداشت، درمان و آموزش پزشکی در حوزه بهبود کیفیت.',
    // definitions
    'سند کنترل‌شده: سندی که تدوین، تصویب، توزیع و بازنگری آن طبق روال مشخص انجام می‌شود و نسخه معتبر آن قابل ردیابی است.\nخط‌مشی: بیانیه کلی جهت‌گیری سازمان در یک موضوع.\nروش اجرایی: توالی گام‌های انجام یک فرایند به همراه مسئول هر گام.\nدستورالعمل: شرح جزئیات انجام یک فعالیت مشخص در یک واحد.\nنسخه منسوخ: نسخه‌ای که با انتشار نسخه جدید اعتبار خود را از دست داده است.',
    // resources
    'سامانه مدیریت اسناد بیمارستان، رایانه و دسترسی کاربری برای مسئولین واحدها، کارشناس بهبود کیفیت به‌عنوان دبیر تدوین اسناد، زمان کارشناسی برای بازنگری دوره‌ای.',
    // related_staff
    'مسئول دفتر بهبود کیفیت، مسئولین واحدها و بخش‌ها، اعضای کمیته پایش و سنجش کیفیت، مدیر داخلی بیمارستان، ریاست بیمارستان.',
    'مسئول دفتر بهبود کیفیت',
    // monitoring_method
    'دفتر بهبود کیفیت هر شش ماه یک‌بار فهرست اسناد کنترل‌شده را استخراج و موارد زیر را پایش می‌کند: درصد اسنادی که تاریخ بازنگری آن‌ها گذشته است، درصد اسناد دارای امضای کامل، و تعداد نسخه‌های منسوخ جمع‌آوری‌نشده. نتیجه پایش در قالب گزارش به کمیته پایش و سنجش کیفیت ارائه و برای موارد خارج از حد انتظار اقدام اصلاحی تعریف می‌شود.',
    // work_method
    '۱. نیازسنجی: مسئول واحد یا دفتر بهبود کیفیت نیاز به تدوین سند جدید یا بازنگری سند موجود را شناسایی و به دفتر بهبود کیفیت اعلام می‌کند.\n۲. تعیین نوع سند: دفتر بهبود کیفیت با توجه به موضوع، نوع سند (خط‌مشی/روش اجرایی/دستورالعمل) و کد آن را تعیین می‌کند.\n۳. تدوین پیش‌نویس: مسئول واحدِ صاحب فرایند پیش‌نویس را در قالب استاندارد همین سامانه تکمیل می‌کند و وضعیت آن «پیش‌نویس» می‌ماند.\n۴. بازبینی فنی: کارشناس بهبود کیفیت پیش‌نویس را از نظر انطباق با سنجه‌های اعتباربخشی و عدم تعارض با سایر اسناد بررسی و بازخورد می‌دهد.\n۵. تأیید و امضا: سند در جدول امضاها به‌ترتیب توسط تدوین‌کننده، تأییدکننده و تصویب‌کننده امضای الکترونیکی می‌شود.\n۶. تصویب و ابلاغ: پس از تکمیل امضاها وضعیت سند به «تصویب‌شده» تغییر و تاریخ ابلاغ ثبت می‌شود.\n۷. توزیع: سند بر اساس فهرست توزیع به واحدهای مربوط ابلاغ می‌شود و نسخه منسوخ قبلی از محل استفاده جمع‌آوری می‌گردد.\n۸. بازنگری دوره‌ای: هر سند حداکثر هر سه سال یک‌بار، و در صورت تغییر فرایند یا ابلاغ مقررات جدید زودتر، بازنگری می‌شود. بازنگری، نسخه جدید ایجاد و نسخه قبلی را در تاریخچه بایگانی می‌کند.\n۹. ابطال: در صورت حذف فرایند، سند با تأیید کمیته پایش و سنجش کیفیت باطل و از فهرست اسناد جاری خارج می‌شود.',
    // related_documents
    'خط‌مشی بهبود مستمر کیفیت؛ فهرست اصلی اسناد کنترل‌شده بیمارستان؛ فرم درخواست تدوین/بازنگری سند؛ صورت‌جلسات کمیته پایش و سنجش کیفیت.',
    JSON.stringify([
      { name: 'دفتر بهبود کیفیت', unit: 'ستاد' },
      { name: 'مدیریت خدمات پرستاری', unit: 'ستاد' },
      { name: 'مسئولین بخش‌های بستری', unit: 'بالینی' },
      { name: 'واحد آموزش سلامت', unit: 'پشتیبانی' },
    ]),
    // وضعیت‌های معتبر سند در این سامانه: draft / active / archived
    'active', 1, adminId
  );

  // یک ردیف امضا تا کاربر ببیند جدول امضا چطور پر می‌شود
  db.prepare(`INSERT INTO document_signoffs (id, hospital_id, document_id, person_name, position, signoff_role, signed_at)
    VALUES (?,?,?,?,?,?,?)`).run(
    uuid(), hid, id, 'کارشناس دفتر بهبود کیفیت', 'مسئول دفتر بهبود کیفیت', 'preparer', dayOffset(-50));
  db.prepare(`INSERT INTO document_signoffs (id, hospital_id, document_id, person_name, position, signoff_role, signed_at)
    VALUES (?,?,?,?,?,?,?)`).run(
    uuid(), hid, id, 'مدیر داخلی بیمارستان', 'مدیر داخلی', 'approver', dayOffset(-45));
  return id;
}

// ---------------------------------------------------------------------------
// ۲) چک‌لیست نمونه + یک پاسخ‌نامه‌ی نمونه
// ---------------------------------------------------------------------------
function seedChecklist(hid, adminId) {
  const cid = uuid();
  // تناوب فصلی: خودِ سنجه‌ی الف-۱-۴-۶ می‌گوید «توصیه می‌شود پایش دوره‌ای برای کسب اطمینان
  // از رعایت اصول تدوین، نگهداری، توزیع و قابلیت بازیابی مستندات … برنامه‌ریزی و انجام شود».
  db.prepare(`INSERT INTO checklists (id, hospital_id, title, checklist_code, completion_type, purpose,
    has_domains, has_baseline, baseline_info, status, created_by, cadence, is_example)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'quarterly',1)`).run(
    cid, hid,
    'نمونه: چک‌لیست ارزیابی مستندسازی و نگهداری اسناد در بخش',
    'CL-EX-001', 'per_department',
    'سنجش میزان انطباق هر بخش با الزامات نگهداری اسناد کنترل‌شده، در دسترس بودن نسخه معتبر اسناد و آگاهی کارکنان از محل مراجعه به آن‌ها. نتیجه این چک‌لیست ورودی گزارش دوره‌ای دفتر بهبود کیفیت به کمیته پایش و سنجش کیفیت است.',
    1, 1,
    'وضعیت پایه: پیش از اجرای این چک‌لیست، میانگین انطباق بخش‌ها در ارزیابی داخلی قبلی ۶۵ درصد ثبت شده بود. هدف دوره جاری رساندن این عدد به بالای ۸۵ درصد است.',
    'active', adminId);

  const domains = [
    { title: 'در دسترس بودن و اعتبار اسناد', items: [
      { q: 'آیا فهرست اسناد کنترل‌شده مرتبط با این بخش در محل قابل دسترس کارکنان موجود است؟', t: 'likert5', w: 2 },
      { q: 'آیا نسخه موجود در بخش با آخرین نسخه معتبر ثبت‌شده در سامانه مطابقت دارد؟', t: 'likert5', w: 2 },
      { q: 'آیا نسخه‌های منسوخ از محل استفاده جمع‌آوری شده‌اند؟', t: 'yes_no', w: 1 },
    ]},
    { title: 'آگاهی و به‌کارگیری توسط کارکنان', items: [
      { q: 'آیا کارکنان بخش می‌دانند برای یافتن روش اجرایی مربوط به وظیفه خود به کجا مراجعه کنند؟', t: 'likert5', w: 2 },
      { q: 'آیا تحویل و توجیه اسناد جدید به کارکنان تازه‌وارد بخش مستند شده است؟', t: 'yes_no', w: 1 },
    ]},
  ];

  const itemIds = [];
  domains.forEach((d, di) => {
    const did = uuid();
    db.prepare('INSERT INTO checklist_domains (id, hospital_id, checklist_id, title, sort_order) VALUES (?,?,?,?,?)')
      .run(did, hid, cid, d.title, di);
    d.items.forEach((it, ii) => {
      const iid = uuid();
      db.prepare(`INSERT INTO checklist_items (id, hospital_id, checklist_id, domain_id, question_text, answer_type, weight, sort_order, is_active)
        VALUES (?,?,?,?,?,?,?,?,1)`).run(iid, hid, cid, did, it.q, it.t, it.w, ii);
      itemIds.push({ id: iid, type: it.t, w: it.w });
    });
  });

  // پاسخ‌نامه نمونه: امتیازها واقع‌گرایانه (نه همه کامل) تا کاربر ببیند نمره‌دهی چطور کار می‌کند.
  // کلیدِ پاسخ باید دقیقاً همان رشته‌ای باشد که روت واقعی می‌نویسد ({answer:'good'})، نه یک
  // عدد خام؛ وگرنه ستون «پاسخ» در پاسخ‌نامه خالی می‌ماند و تشخیص عدم انطباق هم کار نمی‌کند.
  const picks = ['good', 'medium', 'yes', 'good', 'no'];
  const answers = itemIds.map((it, i) => ({ item_id: it.id, answer: picks[i], note: null }));
  answers[2].note = 'دو نسخه منسوخ در زونکن بخش یافت شد و در همان بازدید جمع‌آوری گردید.';
  answers[4].note = 'برای دو نفر از کارکنان تازه‌وارد فرم توجیه اسناد تکمیل نشده بود.';

  // نمره‌دهی دقیقاً با همان فرمول روت واقعی (CL_ANSWER_VALUES × وزن) حساب می‌شود تا
  // عددِ نمونه با عددی که سامانه برای همان پاسخ‌ها می‌دهد یکی باشد.
  const SCALE = { likert5: { empty: 0, low: 1, medium: 2, good: 3, excellent: 4 }, yes_no: { no: 0, yes: 1 } };
  let score = 0, max = 0;
  itemIds.forEach((it, i) => {
    const scale = SCALE[it.type] || SCALE.likert5;
    const w = it.w === null || it.w === undefined ? 1 : Number(it.w) || 0;
    score += scale[answers[i].answer] * w;
    max += Math.max(...Object.values(scale)) * w;
  });

  const sid = uuid();
  db.prepare(`INSERT INTO checklist_submissions (id, hospital_id, checklist_id, reference, answers, score, max_score, note, submitted_by, submitted_at, is_example)
    VALUES (?,?,?,?,?,?,?,?,?,?,1)`).run(
    sid, hid, cid, 'بخش داخلی مردان',
    JSON.stringify(answers), Math.round(score * 100) / 100, max,
    'ارزیابی دوره‌ای اول سال. دو مورد عدم انطباق جزئی شناسایی و در همان بازدید رفع شد؛ مورد مربوط به توجیه کارکنان تازه‌وارد برای پیگیری به مسئول بخش ارجاع گردید.',
    adminId, dayOffset(-12));

  return { checklistId: cid, submissionId: sid };
}

// ---------------------------------------------------------------------------
// ۲-ب) چک‌لیست‌های پایشِ دوره‌ای — نمونه‌هایی که تناوبشان مستقیم از متن کتاب می‌آید
// ---------------------------------------------------------------------------
// چرا جدا از seedChecklist: آن یکی «نمونه‌ی یک چک‌لیست کامل با حیطه و پاسخ‌نامه» را
// نشان می‌دهد. این‌ها نشان می‌دهند تناوبِ پایش در عمل چه شکلی است — سه تناوبِ متفاوت
// (روزانه/ماهانه/فصلی) تا کاربر هر سه حالتِ سررسید را روی داده‌ی واقعی ببیند.
// هیچ‌کدام پاسخ‌نامه‌ی از پیش پرشده ندارند: نکته‌ی این نمونه‌ها همین است که سررسیدشان
// باز است و در کارتابل دیده می‌شوند.
const PERIODIC_CHECKLISTS = [
  {
    title: 'نمونه: بررسی روزانه ژنراتور اضطراری',
    code: 'CL-EX-002',
    cadence: 'daily',
    completion: 'general',
    // الف-۲-۳-۱: «بررسی روزانه ژنراتورها از نظر عملکرد و ایمنی با استفاده از چک لیست و
    // اطمینان از صحت عملکرد دستگاه و باطری‌ها، بررسی منابع سوخت، الکتروپمپ گازوئیل …»
    purpose: 'پایش روزانه عملکرد و ایمنی ژنراتور اضطراری. مبنای این چک‌لیست سنجه الف-۲-۳-۱ است که صراحتاً «بررسی روزانه ژنراتورها از نظر عملکرد و ایمنی با استفاده از چک لیست» را الزامی می‌داند.',
    items: [
      { q: 'سطح سوخت گازوئیل برای حداقل ۷۲ ساعت کارکرد کافی است؟', t: 'yes_no', w: 2 },
      { q: 'وضعیت شارژ و سلامت باتری‌ها', t: 'likert5', w: 2 },
      { q: 'الکتروپمپ گازوئیل بدون نشتی کار می‌کند؟', t: 'yes_no', w: 1 },
      { q: 'اتصال ژنراتور به تابلوی برق اضطراری سالم است؟', t: 'yes_no', w: 2 },
      { q: 'ثبت سوابق تعمیراتی در شناسنامه دستگاه', t: 'likert5', w: 1 },
    ],
  },
  {
    title: 'نمونه: بررسی دوره‌ای انبارش ایمن',
    code: 'CL-EX-003',
    cadence: 'monthly',
    completion: 'per_department',
    // الف-۲-۲-۵ بند ۱۶: «چک لیستی بر اساس دستورالعمل انبارش ایمن تدوین و بررسی دوره‌ای
    // آن توسط مدیریت بیمارستان انجام و موارد عدم انطباق اصلاح شود.»
    purpose: 'پایش دوره‌ای انبارهای بیمارستان بر اساس دستورالعمل انبارش ایمن. سنجه الف-۲-۲-۵ (بند ۱۶) تدوین چنین چک‌لیستی، بررسی دوره‌ای آن توسط مدیریت بیمارستان، و اصلاح موارد عدم انطباق را الزامی می‌داند.',
    items: [
      { q: 'مواد قابل اشتعال در انبار امنِ خارج از ساختمان بیمارستان نگهداری می‌شوند؟', t: 'yes_no', w: 2 },
      { q: 'محل نگهداری مواد قابل اشتعال با علائم راهنما یا تصویر گرافیکی مشخص شده است؟', t: 'yes_no', w: 1 },
      { q: 'مهار قفسه‌ها و تجهیزات انبار در برابر زلزله', t: 'likert5', w: 2 },
      { q: 'رعایت اصول چیدمان و فاصله‌گذاری اقلام طبق دستورالعمل', t: 'likert5', w: 1 },
      { q: 'موارد عدم انطباق بازدید قبلی اصلاح شده است؟', t: 'yes_no', w: 2 },
    ],
  },
  {
    title: 'نمونه: ارزیابی دوره‌ای عملکرد پیمانکاران',
    code: 'CL-EX-004',
    cadence: 'quarterly',
    completion: 'general',
    // الف-۱-۱۰-۲: «طراحی نظارت ساختارمند و ارزیابی دوره ای عملکرد پیمانکاران با استفاده
    // از چک لیست‌های تخصصی … تهیه گزارشات تحلیلی حاصل از نتایج پایش … و ارائه به تیم
    // رهبری و مدیریت و تصمیم گیری در خصوص تداوم رابطه کاری با آنها»
    purpose: 'ارزیابی دوره‌ای عملکرد پیمانکاران بر اساس سنجه الف-۱-۱۰-۲، که نظارت ساختارمند با «چک لیست‌های تخصصی» و ارائه گزارش تحلیلی نتایج پایش به تیم رهبری و مدیریت را الزامی می‌داند.',
    items: [
      { q: 'پیمانکار تعهدات کمی مندرج در قرارداد را رعایت کرده است؟', t: 'likert5', w: 2 },
      { q: 'پاسخگویی پیمانکار به ناظر فنی در بازه ارزیابی', t: 'likert5', w: 2 },
      { q: 'ناظر فنی متخصص و مرتبط برای این قرارداد تعیین شده است؟', t: 'yes_no', w: 2 },
      { q: 'گزارش تحلیلی نتایج پایش به تیم رهبری و مدیریت ارائه شده است؟', t: 'yes_no', w: 2 },
      { q: 'رعایت الزامات ایمنی و بهداشت توسط کارکنان پیمانکار', t: 'likert5', w: 1 },
    ],
  },
];

function seedPeriodicChecklists(hid, adminId) {
  const ins = db.prepare(`INSERT INTO checklists (id, hospital_id, title, checklist_code, completion_type,
    purpose, has_domains, has_baseline, status, created_by, cadence, is_example)
    VALUES (?,?,?,?,?,?,0,0,'active',?,?,1)`);
  const insItem = db.prepare(`INSERT INTO checklist_items (id, hospital_id, checklist_id, domain_id,
    question_text, answer_type, weight, sort_order, is_active) VALUES (?,?,?,NULL,?,?,?,?,1)`);
  for (const c of PERIODIC_CHECKLISTS) {
    const cid = uuid();
    ins.run(cid, hid, c.title, c.code, c.completion, c.purpose, adminId, c.cadence);
    c.items.forEach((it, i) => insItem.run(uuid(), hid, cid, it.q, it.t, it.w, i));
  }
  return PERIODIC_CHECKLISTS.length;
}

// ---------------------------------------------------------------------------
// ۳) صورت‌جلسه‌ی نمونه روی یک کمیته‌ی موجود
// ---------------------------------------------------------------------------
function seedMinutes(hid, adminId) {
  // ترجیح با کمیته‌ای که متن اهداف/برنامه واقعی دارد؛ وگرنه اولین کمیته بیمارستان
  const c = db.prepare(`SELECT id, name FROM committees WHERE hospital_id = ?
    ORDER BY CASE WHEN statement IS NOT NULL AND statement <> '' THEN 0 ELSE 1 END,
             CASE WHEN name LIKE '%کیفیت%' THEN 0 ELSE 1 END, name`).get(hid);
  if (!c) return null;

  const id = uuid();
  db.prepare(`INSERT INTO committee_meeting_minutes (id, committee_id, meeting_date, attendees, agenda_items, decisions, next_meeting_date, created_by, is_example)
    VALUES (?,?,?,?,?,?,?,?,1)`).run(
    id, c.id, dayOffset(-20),
    JSON.stringify([
      'ریاست بیمارستان (رئیس کمیته)',
      'مدیر داخلی',
      'مسئول دفتر بهبود کیفیت (دبیر کمیته)',
      'مدیر خدمات پرستاری',
      'سوپروایزر بالینی',
      'کارشناس ایمنی بیمار',
    ]),
    JSON.stringify([
      'نمونه — بررسی گزارش پایش شش‌ماهه اسناد کنترل‌شده و درصد اسناد دارای تاریخ بازنگری گذشته',
      'مرور وضعیت اجرای مصوبات جلسه قبل و علت تأخیر در موارد اجرانشده',
      'بررسی نتایج چک‌لیست مستندسازی در بخش‌های بستری و تعیین بخش‌های نیازمند اقدام اصلاحی',
      'تعیین تقویم بازنگری اسناد برای شش‌ماهه دوم',
    ]),
    JSON.stringify([
      'مقرر شد دفتر بهبود کیفیت فهرست اسنادی که تاریخ بازنگری آن‌ها گذشته است را تا پایان ماه جاری به تفکیک واحد استخراج و به مسئولین واحدها ابلاغ کند. مسئول: دفتر بهبود کیفیت — مهلت: پایان ماه جاری.',
      'مقرر شد برای دو بخشی که در چک‌لیست مستندسازی امتیاز زیر ۷۰ درصد کسب کرده‌اند، جلسه توجیهی با حضور مسئول بخش برگزار و نتیجه در جلسه بعد گزارش شود. مسئول: مدیر خدمات پرستاری — مهلت: تا جلسه بعد.',
      'مقرر شد فرم توجیه اسناد برای کارکنان تازه‌وارد به فرایند پذیرش نیروی جدید اضافه و اجرای آن توسط سوپروایزر بالینی پایش شود.',
      'مقرر شد تقویم بازنگری اسناد شش‌ماهه دوم توسط دبیر کمیته تدوین و در جلسه بعد جهت تصویب ارائه گردد.',
    ]),
    dayOffset(10), adminId);
  return id;
}

// ---------------------------------------------------------------------------
// ۴) FMEA نمونه — موضوع اداری/فرایندی، بدون ادعای بالینی
// ---------------------------------------------------------------------------
function seedFmea(hid, adminId) {
  const id = uuid();
  db.prepare(`INSERT INTO fmea_records (id, hospital_id, reporter_name, subject, reporting_department,
    related_hazard_area, hazard_type, failure_modes, root_causes, effects, existing_controls,
    recommended_actions, source, status, created_by, submitted_at, is_example)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(
    id, hid, 'کارشناس دفتر بهبود کیفیت',
    'نمونه: در دسترس نبودن نسخه معتبر روش اجرایی در زمان نیاز کارکنان',
    'دفتر بهبود کیفیت', 'فرایندهای مدیریتی و پشتیبان', 'فرایندی',
    // failure_modes
    'الف) نسخه منسوخ یک روش اجرایی در بخش باقی می‌ماند و کارکنان به آن استناد می‌کنند.\nب) سند بازنگری‌شده به همه واحدهای مشمول فهرست توزیع ابلاغ نمی‌شود.\nج) کارکنان تازه‌وارد از محل دسترسی به اسناد بی‌اطلاع می‌مانند.\nد) سندی که تاریخ بازنگری آن گذشته است بدون توجه همچنان جاری تلقی می‌شود.',
    // root_causes
    'نبود سازوکار خودکار برای یادآوری موعد بازنگری؛ اتکای توزیع اسناد به روش دستی و کاغذی؛ مستند نبودن مرحله جمع‌آوری نسخه منسوخ؛ گنجانده نشدن معرفی اسناد در فرایند توجیه بدو ورود کارکنان؛ مشخص نبودن مسئول پایش در برخی واحدها.',
    // effects
    'اجرای فرایند بر اساس دستورالعمل قدیمی و ایجاد ناهماهنگی بین واحدها؛ دوباره‌کاری و اتلاف زمان کارکنان؛ کسب امتیاز پایین در سنجه‌های مربوط به مدیریت اسناد در ارزیابی اعتباربخشی؛ دشواری در پاسخ‌گویی و ردیابی هنگام بررسی رویدادها.',
    // existing_controls
    'ثبت متمرکز اسناد در سامانه با شماره نسخه و تاریخچه بازنگری؛ گردش امضای الکترونیکی پیش از ابلاغ؛ فهرست توزیع پیوست هر سند؛ پایش شش‌ماهه اسناد توسط دفتر بهبود کیفیت و گزارش آن به کمیته پایش و سنجش کیفیت.',
    // recommended_actions
    '۱. فعال‌سازی هشدار سررسید بازنگری برای اسنادی که کمتر از ۶۰ روز تا موعد بازنگری دارند و ارسال آن به مسئول واحد.\n۲. افزودن گام «تأیید جمع‌آوری نسخه منسوخ» به‌عنوان مرحله الزامی پس از ابلاغ هر نسخه جدید.\n۳. گنجاندن معرفی سامانه اسناد در برنامه توجیهی بدو ورود کارکنان و مستندسازی آن.\n۴. تعیین یک رابط مستندسازی در هر بخش و درج نام او در فهرست توزیع اسناد آن بخش.\n۵. پایش سه‌ماهه شاخص «درصد اسناد دارای بازنگری به‌موقع» و گزارش روند آن به کمیته.',
    'internal', 'new', adminId, dayOffset(-8));
  return id;
}

// ---------------------------------------------------------------------------
// ۵) حسابرسی داخلی نمونه — به چک‌لیست و پاسخ‌نامه نمونه وصل می‌شود
// ---------------------------------------------------------------------------
function seedAudit(hid, adminId, checklistId, submissionId) {
  const id = uuid();
  db.prepare(`INSERT INTO internal_audits (id, hospital_id, title, checklist_id, checklist_submission_id,
    auditor_user_id, auditor_name, audited_department, audit_date, finding_summary,
    corrective_action_required, corrective_action_text, follow_up_date, status, created_by, is_example)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(
    id, hid,
    'نمونه: حسابرسی داخلی مستندسازی و نگهداری اسناد — بخش داخلی مردان',
    checklistId, submissionId, adminId, 'کارشناس دفتر بهبود کیفیت',
    'بخش داخلی مردان', dayOffset(-12),
    'بخش در دو حیطه ارزیابی شد. فهرست اسناد کنترل‌شده در محل موجود و نسخه‌های جاری با سامانه منطبق بود. دو مورد عدم انطباق شناسایی شد: نگهداری دو نسخه منسوخ در زونکن بخش، و تکمیل‌نشدن فرم توجیه اسناد برای دو نفر از کارکنان تازه‌وارد. آگاهی کارکنان از محل مراجعه به اسناد در سطح قابل قبول ارزیابی گردید.',
    1,
    'نسخه‌های منسوخ در همان بازدید جمع‌آوری و امحا شد. برای کارکنان تازه‌وارد، جلسه توجیهی توسط مسئول بخش برگزار و فرم مربوط تکمیل و به دفتر بهبود کیفیت ارسال می‌شود. مسئول پیگیری: مسئول بخش داخلی مردان.',
    dayOffset(18), 'in_progress', adminId);
  return id;
}

// ---------------------------------------------------------------------------
// ۶) گواهینامه نمونه
// ---------------------------------------------------------------------------
function seedCertification(hid, adminId) {
  const id = uuid();
  db.prepare(`INSERT INTO certifications (id, hospital_id, title, issuing_body, issue_date, expiry_date, status, note, created_by, is_example)
    VALUES (?,?,?,?,?,?,?,?,?,1)`).run(
    id, hid,
    'نمونه: گواهی‌نامه دوره آموزشی مدیریت اسناد و مدارک پزشکی',
    'معاونت درمان دانشگاه علوم پزشکی — واحد آموزش مداوم',
    dayOffset(-200), dayOffset(160), 'active',
    'این یک رکورد نمونه است تا نحوه ثبت گواهی‌نامه‌ها را نشان دهد. برای هر گواهی‌نامه واقعی، تصویر اسکن‌شده مدرک را نیز پیوست کنید تا در زمان ارزیابی اعتباربخشی قابل ارائه باشد. وضعیت «نزدیک به انقضا» به‌طور خودکار بر اساس تاریخ انقضا محاسبه می‌شود و نیازی به به‌روزرسانی دستی ندارد.',
    adminId);
  return id;
}

// ---------------------------------------------------------------------------
// ۷) مورد نمونه در کتابخانه دیجیتال
// ---------------------------------------------------------------------------
function seedLibrary(hid, adminId) {
  const id = uuid();
  db.prepare(`INSERT INTO digital_library_items (id, hospital_id, category, title, description, uploaded_by, is_example)
    VALUES (?,?,?,?,?,?,1)`).run(
    id, hid, 'regulation',
    'نمونه: راهنمای داخلی شماره‌گذاری و کدگذاری اسناد بیمارستان',
    'راهنمای یک‌صفحه‌ای برای واحدها درباره ساختار کد اسناد. ساختار کد به‌صورت «کد واحد - نوع سند - شماره ترتیبی» تعریف شده است؛ برای نمونه QM-PR-001 یعنی سند شماره یک از نوع روش اجرایی متعلق به واحد بهبود کیفیت. انواع سند با علائم PL (خط‌مشی)، PR (روش اجرایی)، WI (دستورالعمل) و FM (فرم) مشخص می‌شوند. این مورد نمونه است؛ می‌توانید فایل واقعی خود را جایگزین یا آن را حذف کنید.',
    adminId);
  return id;
}

// ---------------------------------------------------------------------------

const MODULES = [
  ['controlled_document', (hid, aid) => { seedDocument(hid, aid); }],
  // چک‌لیست و حسابرسی به هم وابسته‌اند و با هم ساخته می‌شوند
  ['checklist_and_audit', (hid, aid) => {
    const { checklistId, submissionId } = seedChecklist(hid, aid);
    seedAudit(hid, aid, checklistId, submissionId);
  }],
  // ماژول جدا تا بیمارستان‌هایی که نمونه‌های قبلی را از قبل دارند هم این‌ها را بگیرند
  // (دفترچه‌ی example_seed_log به‌ازای هر ماژول ثبت می‌شود، نه یک‌جا).
  ['periodic_checklists', (hid, aid) => { seedPeriodicChecklists(hid, aid); }],
  ['committee_minutes', (hid, aid) => { seedMinutes(hid, aid); }],
  ['fmea', (hid, aid) => { seedFmea(hid, aid); }],
  ['certification', (hid, aid) => { seedCertification(hid, aid); }],
  ['library', (hid, aid) => { seedLibrary(hid, aid); }],
];

// ساختار جدول‌ها/دفترچه را تضمین می‌کند — قابل فراخوانی مکرر
function ensureSchema() {
  for (const t of EXAMPLE_TABLES) addExampleColumn(t);
  ensureLog();
  backfillExamples();
}

// اصلاحِ نمونه‌هایی که با نسخه‌های قبلیِ همین فایل ساخته شده‌اند.
// چون example_seed_log جلوی ساختِ دوباره را می‌گیرد، تنها راهِ رساندنِ این اصلاح‌ها به
// دیتابیس‌های موجود همین بک‌فیل است. همه‌ی شرط‌ها محافظه‌کارانه‌اند: فقط رکوردِ نمونه،
// و فقط وقتی مقدارِ فعلی همان مقدارِ خرابِ قدیمی است — تغییرِ خودِ کاربر بازنویسی نمی‌شود.
// هر چک‌لیستِ نمونه بر پایه‌ی یک سنجه‌ی مشخص نوشته شده و همان سنجه را در متنش هم
// ذکر می‌کند، ولی ستون section_id خالی مانده بود — یعنی نوار «مسیر سنجه» بالای
// صفحه‌ی تکمیل چیزی برای نشان‌دادن نداشت. محورِ همان سنجه این‌جا وصل می‌شود.
// (محور، نه خودِ سنجه: ستون section_id در این جدول به گره‌ی محور اشاره می‌کند،
//  همان چیزی که انتخابگرِ فرم هم می‌نویسد.)
const EXAMPLE_AXIS = {
  // کدِ محور در دیتابیس با رقم لاتین ذخیره شده است، نه فارسی
  'CL-EX-001': 'الف-1',   // الف-۱-۴-۶ مستندسازی و نگهداری اسناد
  'CL-EX-002': 'الف-2',   // الف-۲-۳-۱ بررسی روزانه ژنراتور
  'CL-EX-003': 'الف-2',   // الف-۲-۲-۵ انبارش ایمن
  'CL-EX-004': 'الف-1',   // الف-۱-۱۰-۲ ارزیابی عملکرد پیمانکاران
};
function linkExampleAxes() {
  let n = 0;
  for (const [code, axCode] of Object.entries(EXAMPLE_AXIS)) {
    const ax = db.prepare(
      `SELECT id FROM accreditation_sections WHERE code = ? AND level_type = 'axis' LIMIT 1`).get(axCode);
    if (!ax) continue;
    // فقط وقتی خالی است — اگر کاربر خودش محوری انتخاب کرده، دست نمی‌خورد
    const r = db.prepare(
      `UPDATE checklists SET section_id = ? WHERE checklist_code = ? AND section_id IS NULL`)
      .run(ax.id, code);
    n += r.changes;
  }
  return n;
}

function backfillExamples() {
  const cols = db.prepare('PRAGMA table_info(checklist_items)').all().map(c => c.name);
  if (!cols.length) return;
  try {
    const linked = linkExampleAxes();
    if (linked) console.log(`[Seed Examples] ${linked} چک‌لیست نمونه به محورش وصل شد`);
  } catch (e) { console.error('[Seed Examples] axis link failed:', e.message); }

  // (۱) answer_type نامعتبر: 'yesno' هرگز در CL_ANSWER_TYPES نبوده (فقط likert5 و yes_no).
  // نتیجه‌اش این بود که سؤالِ بله/خیر با طیفِ پنج‌گزینه‌ای رندر می‌شد، چون جست‌وجوی
  // CL_OPTIONS['yesno'] به likert5 برمی‌گشت.
  db.prepare("UPDATE checklist_items SET answer_type = 'yes_no' WHERE answer_type = 'yesno'").run();

  // (۲) پاسخ‌نامه‌ی نمونه با {value:<عدد>} ذخیره شده بود، در حالی که روت واقعی
  // {answer:'<کلید>'} می‌نویسد. ستون «پاسخ» خالی می‌ماند و تشخیص عدم انطباق هم کار نمی‌کرد.
  const hasCol = db.prepare('PRAGMA table_info(checklist_submissions)').all().map(c => c.name);
  if (hasCol.includes('is_example')) {
    const L = ['empty', 'low', 'medium', 'good', 'excellent'];
    for (const s of db.prepare("SELECT id, answers FROM checklist_submissions WHERE is_example = 1").all()) {
      let arr; try { arr = JSON.parse(s.answers || '[]'); } catch (e) { continue; }
      if (!Array.isArray(arr) || !arr.length) continue;
      const SCALE = { likert5: { empty: 0, low: 1, medium: 2, good: 3, excellent: 4 }, yes_no: { no: 0, yes: 1 } };
      let score = 0, max = 0;
      const fixed = arr.map(a => {
        if (!a) return a;
        const it = db.prepare('SELECT answer_type, weight FROM checklist_items WHERE id = ?').get(a.item_id);
        const t = (it && it.answer_type) || 'likert5';
        const w = !it || it.weight === null || it.weight === undefined ? 1 : Number(it.weight) || 0;
        const scale = SCALE[t] || SCALE.likert5;
        const answer = a.answer !== undefined ? a.answer
          : (t === 'yes_no' ? ((Number(a.value) || 0) >= 1 ? 'yes' : 'no') : L[Math.min(4, Number(a.value) || 0)]);
        score += (scale[answer] || 0) * w;
        max += Math.max(...Object.values(scale)) * w;
        return { item_id: a.item_id, answer, note: a.note || null };
      });
      // امتیازِ ذخیره‌شده هم با فرمولِ قدیمی حساب شده بود و با همین پاسخ‌ها نمی‌خواند؛
      // دوباره با همان فرمولِ روت واقعی محاسبه می‌شود تا برگه‌ی چاپی عددِ درست بدهد.
      // نوشتن فقط وقتی چیزی واقعاً عوض شده باشد — تا اجرای دوباره صفر تغییر بدهد.
      const nextJson = JSON.stringify(fixed);
      const nextScore = Math.round(score * 100) / 100;
      if (nextJson !== s.answers || Number(s.score) !== nextScore || Number(s.max_score) !== max) {
        db.prepare('UPDATE checklist_submissions SET answers = ?, score = ?, max_score = ? WHERE id = ?')
          .run(nextJson, nextScore, max, s.id);
      }
    }
  }

  // (۳) تناوبِ چک‌لیستِ نمونه‌ی مستندسازی — فقط اگر هنوز دست‌نخورده («موردی») باشد
  const clCols = db.prepare('PRAGMA table_info(checklists)').all().map(c => c.name);
  if (clCols.includes('cadence')) {
    db.prepare(`UPDATE checklists SET cadence = 'quarterly'
      WHERE is_example = 1 AND checklist_code = 'CL-EX-001' AND IFNULL(cadence, 'ondemand') = 'ondemand'`).run();
  }
}

/**
 * seed نمونه‌ها برای یک بیمارستان مشخص.
 * از دو جا صدا زده می‌شود: حلقه‌ی boot (runMigration) و مسیر ساخت بیمارستان/ادمین در پنل سوپرادمین،
 * تا بیمارستان تازه بدون ری‌استارت سرور بلافاصله نمونه‌ها را داشته باشد.
 * اگر بیمارستان هنوز هیچ کاربری ندارد، کاری نمی‌کند (نمونه باید مالک داشته باشد) و 0 برمی‌گرداند.
 */
function seedHospital(hospitalId) {
  ensureSchema();
  const admin = db.prepare(`SELECT u.id FROM users u LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.hospital_id = ?
    ORDER BY CASE WHEN r.code = 'admin' THEN 0 ELSE 1 END, u.created_at LIMIT 1`).get(hospitalId);
  if (!admin) return 0;

  let created = 0;
  for (const [mod, fn] of MODULES) {
    if (alreadySeeded(hospitalId, mod)) continue;
    try {
      fn(hospitalId, admin.id);
      markSeeded(hospitalId, mod);
      created++;
    } catch (e) {
      console.error(`[Seed Examples] ${hospitalId} / ${mod} failed:`, e.message);
    }
  }
  return created;
}

function runMigration() {
  console.log('[Seed Examples] Starting...');
  try {
    ensureSchema();

    // فقط بیمارستان‌هایی که کاربر دارند — بیمارستان‌های خالیِ آزمایشی نمونه نمی‌گیرند
    const hospitals = db.prepare(`SELECT h.id, h.name FROM hospitals h
      WHERE EXISTS (SELECT 1 FROM users u WHERE u.hospital_id = h.id)`).all();

    let created = 0;
    for (const h of hospitals) created += seedHospital(h.id);
    console.log(`[Seed Examples] ✅ ${created} example record group(s) created across ${hospitals.length} hospital(s)`);
  } catch (err) {
    console.error('[Seed Examples] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration, seedHospital };
