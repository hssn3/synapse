/**
 * Migration + Seed: پل «درخت محتوا ↔ مدارک کنترل‌شده»
 *
 * ۱) افزودن ستون‌های نسخه‌بندی/رندر به accreditation_sections
 *    (year, page_type, sort_order, icon, description) — معادل مدل داده طراحی اولیه حسن
 *    که در docs/hassan_ANALYSIS_V5_LEADERSHIP.md بخش ۱ و ۷ مستند شده است.
 * ۲) افزودن section_id به controlled_documents تا هر سند به گره درخت متصل شود.
 * ۳) افزودن access_code به committees و ۳ کمیته زیرمجموعه «مرگ‌ومیر» که در
 *    داده واقعی طراحی اولیه حسن هست ولی در ۱۷ کمیته seed شده ما نبود (V6 بخش ۴).
 * ۴) Seed هشت سند نمونه با عناوین واقعی طراحی اولیه حسن، وضعیت draft، متصل به محور مربوطه.
 *
 * Run: node database/seed-sections-documents.js
 * idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');

function uuid() { return require('crypto').randomUUID(); }

// ستون‌هایی که باید در صورت نبود اضافه شوند: [جدول, نام ستون, تعریف]
const COLUMNS = [
  ['accreditation_sections', 'year', "TEXT DEFAULT '1405'"],
  ['accreditation_sections', 'page_type', 'TEXT'],
  ['accreditation_sections', 'sort_order', 'INTEGER DEFAULT 0'],
  ['accreditation_sections', 'icon', 'TEXT'],
  ['accreditation_sections', 'description', 'TEXT'],
  ['controlled_documents', 'section_id', 'TEXT REFERENCES accreditation_sections(id)'],
  ['committees', 'access_code', 'TEXT'],
];

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_sections_parent ON accreditation_sections(parent_id, sort_order)',
  'CREATE INDEX IF NOT EXISTS idx_sections_year ON accreditation_sections(year, level_type)',
  'CREATE INDEX IF NOT EXISTS idx_cdoc_section ON controlled_documents(section_id)',
];

// کمیته‌های واقعی طراحی اولیه حسن که در seed-committees.js نبودند — زیرمجموعه «مرگ‌ومیر»
const EXTRA_COMMITTEES = [
  { name: 'احیاء نوزادان', type: 'neonatal_resuscitation', color: '#8fd4e0', freq: 'فصلی', access_code: '27' },
  { name: 'مرگ پریناتال', type: 'perinatal_mortality', color: '#c98fb0', freq: 'فصلی', access_code: '28' },
  { name: 'مرگ‌ومیر کودکان ۱ تا ۵۹ ماهه', type: 'child_mortality', color: '#d4a05a', freq: 'فصلی', access_code: '29' },
];

// نگاشت access_code واقعی طراحی اولیه حسن روی نام کمیته‌های موجود (V6 بخش ۴)
const COMMITTEE_ACCESS = {
  'پایش و سنجش کیفیت': '23', 'مدیریت خطر حوادث و بلایا': '22', 'مدیریت اطلاعات سلامت و فناوری': '71',
  'اخلاق پزشکی و رفتار حرفه‌ای': '81', 'دارو و تجهیزات پزشکی': '51', 'طب انتقال خون': '91',
  'حفاظت فنی و بهداشت کار': '61', 'مرگ‌ومیر و عارضه‌شناسی': '25', 'کنترل عفونت': '68',
  'بهداشت محیط': '62', 'اورژانس بیمارستانی': '31', 'ترویج تغذیه با شیر مادر': '34',
  'ترویج زایمان طبیعی و ایمن': '35', 'اقتصاد درمان دارو و تجهیزات پزشکی': '9h',
  'تیم مدیریت اجرایی': '24', 'هم‌اندیشی مدیریت پرستاری': '9r', 'کارگروه آموزش به بیمار بخش‌ها': '9e',
};

// هشت سند اولویت‌دار — عناوین عیناً از درخت واقعی طراحی اولیه حسن (V5 بخش ۳).
// axis = عنوان محور در accreditation_sections برای اتصال section_id؛ اگر پیدا نشد، null می‌ماند.
const DOCUMENTS = [
  {
    doc_type: 'instruction', doc_code: 'QI-IN-01', axis: 'رهبری و مدیریت کیفیت',
    title: 'گزارش وقایع ناخواسته',
    purpose: 'تعیین روش یکسان شناسایی، ثبت و گزارش وقایع ناخواسته و خطاهای پزشکی بدون ترس از سرزنش، به‌منظور تحلیل ریشه‌ای علل و پیشگیری از تکرار.',
    scope: 'کلیه بخش‌های بالینی، پاراکلینیک و پشتیبانی بیمارستان و تمامی رده‌های شغلی.',
    responsible_person: 'مسئول ایمنی بیمار / مدیر بهبود کیفیت',
    work_method: '۱. هر فرد شاهد وقوع واقعه ناخواسته، حداکثر ظرف ۲۴ ساعت فرم گزارش را در سامانه ثبت می‌کند.\n۲. گزارش می‌تواند بی‌نام ثبت شود و هویت گزارش‌دهنده محرمانه است.\n۳. کارشناس ایمنی بیمار واقعه را بر اساس شدت پیامد سطح‌بندی می‌کند.\n۴. برای وقایع با شدت بالا، تحلیل ریشه‌ای (RCA) ظرف ۱۰ روز کاری انجام می‌شود.\n۵. اقدامات اصلاحی به واحد مربوطه ابلاغ و اجرای آن پیگیری می‌شود.\n۶. نتایج تجمیعی در کمیته پایش و سنجش کیفیت گزارش می‌شود.',
    monitoring_method: 'پایش ماهانه تعداد گزارش‌های ثبت‌شده به تفکیک بخش، نسبت گزارش‌های تحلیل‌شده به کل، و درصد اقدامات اصلاحی بسته‌شده در موعد.',
  },
  {
    doc_type: 'instruction', doc_code: 'QI-IN-02', axis: 'رهبری و مدیریت کیفیت',
    title: 'آگاهی، نگرش مثبت و عملکرد مطلوب کارکنان نسبت به گزارش وقایع ناخواسته',
    purpose: 'ارتقای فرهنگ ایمنی بیمار و جایگزینی رویکرد «سرزنش فردی» با «اصلاح فرایند»، تا کارکنان گزارش‌دهی را وظیفه حرفه‌ای بدانند نه ریسک شغلی.',
    scope: 'تمامی کارکنان بالینی و غیربالینی بیمارستان.',
    responsible_person: 'سوپروایزر آموزشی با همکاری مسئول ایمنی بیمار',
    work_method: '۱. برگزاری دوره توجیهی فرهنگ ایمنی بیمار در بدو ورود و بازآموزی سالانه.\n۲. انتشار درس‌آموخته‌های بی‌نام‌شده وقایع در بولتن داخلی.\n۳. سنجش سالانه فرهنگ ایمنی بیمار با پرسشنامه استاندارد HSOPSC.\n۴. تقدیر از بخش‌هایی که بیشترین گزارش‌دهی داوطلبانه را داشته‌اند.',
    monitoring_method: 'مقایسه نمره پرسشنامه فرهنگ ایمنی بیمار سال جاری با سال قبل و روند تعداد گزارش‌های داوطلبانه.',
  },
  {
    doc_type: 'procedure', doc_code: 'QI-PR-01', axis: 'رهبری و مدیریت کیفیت',
    title: 'مدیریت چک لیست‌های پایش سوپروایزری',
    purpose: 'یکسان‌سازی تدوین، اجرا، تحلیل و بازخورد چک‌لیست‌های پایش سوپروایزری در بخش‌ها.',
    scope: 'سوپروایزرهای بالینی، آموزشی و کنترل عفونت و کلیه بخش‌های بستری.',
    responsible_person: 'مدیر خدمات پرستاری',
    work_method: '۱. تدوین چک‌لیست بر اساس سنجه‌های اعتباربخشی و ابلاغ آن پس از تصویب.\n۲. تعیین دوره پایش (روزانه/هفتگی/ماهانه) برای هر چک‌لیست.\n۳. تکمیل چک‌لیست در محل و ثبت مستندات در سامانه.\n۴. ارائه بازخورد کتبی به سرپرستار بخش حداکثر ظرف ۴۸ ساعت.\n۵. تدوین برنامه بهبود برای موارد با انطباق کمتر از ۸۰ درصد.',
    monitoring_method: 'درصد اجرای چک‌لیست‌ها طبق تقویم پایش و روند نمره انطباق بخش‌ها در گزارش فصلی.',
  },
  {
    doc_type: 'procedure', doc_code: 'HR-PR-01', axis: 'مدیریت منابع انسانی و سلامت حرفه‌ای',
    title: 'نحوه برخوردهای انضباطی با کارکنان مورد شکایت قرار گرفته',
    purpose: 'تعیین فرایند شفاف، عادلانه و مستند رسیدگی به شکایات مطرح‌شده علیه کارکنان و اعمال اقدامات انضباطی متناسب.',
    scope: 'کلیه کارکنان رسمی، پیمانی، قراردادی و شرکتی بیمارستان.',
    responsible_person: 'مدیر منابع انسانی',
    work_method: '۱. ثبت شکایت در دبیرخانه رسیدگی و تشکیل پرونده.\n۲. اخذ توضیح کتبی از کارمند ظرف ۵ روز کاری.\n۳. بررسی موضوع در کمیته انضباطی با حضور نماینده واحد مربوطه.\n۴. اتخاذ تصمیم متناسب: تذکر شفاهی، تذکر کتبی، توبیخ، ارجاع به مراجع بالادستی.\n۵. ابلاغ کتبی نتیجه به کارمند و ثبت در پرونده پرسنلی.\n۶. حفظ محرمانگی هویت شاکی در تمام مراحل.',
    monitoring_method: 'پایش فصلی تعداد پرونده‌ها، میانگین زمان رسیدگی و نسبت پرونده‌های مختومه در موعد مقرر.',
  },
  {
    doc_type: 'procedure', doc_code: 'IT-PR-01', axis: 'فناوری و مدیریت اطلاعات سلامت',
    title: 'نگهداری و پشتیبانی داده‌ها و تهیه نسخه پشتیبان',
    purpose: 'تضمین در دسترس بودن، صحت و بازیابی‌پذیری داده‌های سامانه اطلاعات بیمارستانی در برابر خرابی سخت‌افزاری، حمله سایبری و خطای انسانی.',
    scope: 'کلیه بانک‌های اطلاعاتی HIS، PACS، آزمایشگاه و سامانه‌های اداری.',
    responsible_person: 'مسئول فناوری اطلاعات',
    work_method: '۱. تهیه نسخه پشتیبان کامل به‌صورت شبانه و نسخه افزایشی هر ۶ ساعت.\n۲. نگهداری حداقل یک نسخه در محل فیزیکی مجزا از سرور اصلی.\n۳. رمزنگاری نسخه‌های پشتیبان و کنترل دسترسی به آن‌ها.\n۴. آزمون بازیابی (Restore Test) حداقل هر سه ماه یک‌بار و مستندسازی نتیجه.\n۵. ثبت هرگونه خطای پشتیبان‌گیری در دفتر رخداد و رفع آن ظرف ۲۴ ساعت.',
    monitoring_method: 'گزارش ماهانه موفقیت پشتیبان‌گیری‌ها و نتیجه آزمون بازیابی فصلی.',
  },
  {
    doc_type: 'instruction', doc_code: 'NR-IN-01', axis: 'مدیریت خدمات پرستاری',
    title: 'راهنمای ثبت صحیح اقدامات و مراقبت‌های پرستاری در پرونده پزشکی بیمار',
    purpose: 'یکسان‌سازی نحوه ثبت مراقبت‌های پرستاری به‌گونه‌ای که خوانا، به‌موقع، کامل و قابل استناد قانونی باشد.',
    scope: 'کلیه پرستاران و کمک‌پرستاران شاغل در بخش‌های بستری و ویژه.',
    responsible_person: 'سوپروایزر بالینی',
    work_method: '۱. ثبت هر اقدام بلافاصله پس از انجام، همراه با تاریخ، ساعت و امضا و مهر نظام پرستاری.\n۲. استفاده از عبارات عینی و پرهیز از اصطلاحات مبهم.\n۳. ممنوعیت لاک‌گرفتن یا پاک‌کردن؛ اصلاح فقط با خط‌زدن تک‌خطی و امضا.\n۴. ثبت ارزیابی اولیه ظرف حداکثر یک ساعت پس از پذیرش بیمار.\n۵. ثبت آموزش به بیمار و پاسخ بیمار در فرم مربوطه.',
    monitoring_method: 'ممیزی ماهانه پرونده‌ها با چک‌لیست ثبت پرستاری روی حداقل ۱۰ پرونده از هر بخش.',
  },
  {
    doc_type: 'policy', doc_code: 'NR-PL-01', axis: 'مدیریت خدمات پرستاری',
    title: 'مشارکت در پیشگیری و ارتقا سلامت در حیطه بیمار',
    purpose: 'تعیین رویکرد بیمارستان در مشارکت فعال کادر پرستاری در برنامه‌های پیشگیری، آموزش و ارتقای سلامت بیماران.',
    scope: 'تمامی بخش‌های بالینی و درمانگاه‌های تابعه.',
    responsible_person: 'مدیر خدمات پرستاری',
    work_method: '۱. شناسایی نیازهای آموزشی بیماران در بدو پذیرش.\n۲. ارائه آموزش خودمراقبتی متناسب با بیماری و سطح سواد سلامت بیمار.\n۳. تحویل بسته آموزشی مکتوب هنگام ترخیص.\n۴. پیگیری تلفنی بیماران پرخطر پس از ترخیص.',
    monitoring_method: 'درصد بیماران دارای فرم آموزش تکمیل‌شده و نتایج نظرسنجی رضایت از آموزش.',
  },
  {
    doc_type: 'procedure', doc_code: 'PR-PR-01', axis: 'احترام به حقوق گیرنده خدمت',
    title: 'تشریح نحوه نظارت بر رعایت حقوق گیرندگان خدمت و رعایت اصول اخلاق حرفه‌ای',
    purpose: 'تعیین ساز و کار پایش رعایت منشور حقوق بیمار و اصول اخلاق حرفه‌ای در تمامی تعاملات با گیرندگان خدمت.',
    scope: 'کلیه کارکنان در تماس با بیمار و همراهان، در همه شیفت‌ها.',
    responsible_person: 'مسئول دفتر بهبود کیفیت / مددکار اجتماعی',
    work_method: '۱. نصب منشور حقوق بیمار در معرض دید در تمامی بخش‌ها.\n۲. اخذ رضایت آگاهانه پیش از اقدامات تشخیصی و درمانی تهاجمی.\n۳. رعایت حریم خصوصی بیمار هنگام معاینه و انجام پروسیجر.\n۴. پایش دوره‌ای با چک‌لیست رعایت حقوق گیرنده خدمت در بخش‌ها.\n۵. رسیدگی به شکایات مرتبط و ارائه بازخورد به شاکی.',
    monitoring_method: 'نمره چک‌لیست پایش حقوق گیرنده خدمت، تعداد شکایات مرتبط و میانگین زمان رسیدگی.',
  },
];

function runMigration() {
  console.log('[Seed Sections/Docs] Starting...');
  try {
    // ۱) ستون‌ها — فقط در صورت نبود
    let added = 0;
    for (const [table, col, def] of COLUMNS) {
      const info = db.prepare(`PRAGMA table_info(${table})`).all();
      if (!info.length) continue; // جدول هنوز ساخته نشده (ترتیب boot)
      if (info.some(c => c.name === col)) continue;
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      added++;
    }
    for (const sql of INDEXES) db.exec(sql);

    // ۲) کمیته‌های تازه + access_code
    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    const findCommittee = db.prepare('SELECT id, access_code FROM committees WHERE hospital_id = ? AND name = ?');
    const insCommittee = db.prepare(
      'INSERT INTO committees (id, hospital_id, name, committee_type, meeting_frequency, theme_color, access_code) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const updAccess = db.prepare('UPDATE committees SET access_code = ? WHERE id = ?');

    // ۳) اسناد نمونه
    const findAxis = db.prepare("SELECT id FROM accreditation_sections WHERE title = ? AND level_type = 'axis' LIMIT 1");
    const findDoc = db.prepare('SELECT id FROM controlled_documents WHERE hospital_id = ? AND title = ?');
    const insDoc = db.prepare(`INSERT INTO controlled_documents
      (id, hospital_id, section_id, doc_type, title, doc_code, purpose, scope, responsible_person,
       work_method, monitoring_method, status, version_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1)`);

    let newCommittees = 0, accessSet = 0, newDocs = 0, linked = 0;
    const tx = db.transaction(() => {
      for (const h of hospitals) {
        for (const c of EXTRA_COMMITTEES) {
          if (findCommittee.get(h.id, c.name)) continue;
          insCommittee.run(uuid(), h.id, c.name, c.type, c.freq, c.color, c.access_code);
          newCommittees++;
        }
        for (const [name, code] of Object.entries(COMMITTEE_ACCESS)) {
          const row = findCommittee.get(h.id, name);
          if (row && !row.access_code) { updAccess.run(code, row.id); accessSet++; }
        }
        for (const d of DOCUMENTS) {
          if (findDoc.get(h.id, d.title)) continue;
          const axis = findAxis.get(d.axis);
          if (axis) linked++;
          insDoc.run(uuid(), h.id, axis ? axis.id : null, d.doc_type, d.title, d.doc_code,
            d.purpose, d.scope, d.responsible_person, d.work_method, d.monitoring_method);
          newDocs++;
        }
      }
    });
    tx();

    console.log(`[Seed Sections/Docs] ✅ ${added} column(s) added, ${newCommittees} committee(s), ` +
      `${accessSet} access_code(s), ${newDocs} document(s) inserted (${linked} linked to a section)`);
  } catch (err) {
    console.error('[Seed Sections/Docs] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
