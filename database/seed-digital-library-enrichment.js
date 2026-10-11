/**
 * Seed: اقلام استاندارد کتابخانه دیجیتال بیمارستان
 * استخراج‌شده از بررسی اسکرین‌شات‌های محور ۰۵ (عکس ۱۶_۰۶_۲۸ و اسناد سرپایی، ایمنی و حقوق بیمار)
 * شامل ۵ دسته استاندارد:
 * ۱. آیین‌نامه‌ها (regulation)
 * ۲. پمفلت‌ها (pamphlet)
 * ۳. فرم‌های ابلاغی (issued_form)
 * ۴. کتابچه‌ها (booklet)
 * ۵. جزوه‌های آموزشی (training_handout)
 * 
 * کاملاً idempotent بر اساس (hospital_id, title)
 */

'use strict';

const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

const LIBRARY_ITEMS = [
  // --- پمفلت‌ها ---
  {
    category: 'pamphlet',
    title: 'پمفلت راهنمای مراقبت در منزل پس از آنژیوگرافی و آنژیوپلاستی',
    description: 'آموزش به بیمار و همراه پیرامون نحوه مراقبت از موضع پانسمان دست یا کشاله ران، علائم هشدار خونریزی و زمان‌بندی مصرف داروهای ضدپلاکتی.',
    fileName: 'pamphlet-post-angio-care.pdf',
    fileSize: 425000
  },
  {
    category: 'pamphlet',
    title: 'پمفلت منشور حقوق بیمار و فرآیند ثبت و پیگیری شکایات و پیشنهادات',
    description: 'معرفی ۵ محور اصلی منشور حقوق بیمار، نحوه دسترسی به صندوق‌های انتقادات، تلفن رسیدگی به شکایات و مراجعه به کارشناس تکریم ارباب‌رجوع.',
    fileName: 'pamphlet-patient-rights-charter.pdf',
    fileSize: 380000
  },
  {
    category: 'pamphlet',
    title: 'پمفلت آموزش ۵ موقعیت حیاتی بهداشت دست ویژه بیماران و مراجعین',
    description: 'آموزش تصویری مراحل شستشو با آب و صابون و هندراب الکلی جهت پیشگیری از انتقال عفونت‌های بیمارستانی به زبان ساده.',
    fileName: 'pamphlet-hand-hygiene-patients.pdf',
    fileSize: 290000
  },
  {
    category: 'pamphlet',
    title: 'پمفلت علائم خطر بارداری پرخطر و آمادگی‌های بستری زایمان ایمن',
    description: 'شناخت علائم هشدار فشار خون بارداری، خونریزی، کاهش حرکات جنین و وسایل مورد نیاز مادر و نوزاد در بدو ورود به زایشگاه.',
    fileName: 'pamphlet-high-risk-pregnancy-warning.pdf',
    fileSize: 510000
  },
  {
    category: 'pamphlet',
    title: 'پمفلت مراقبت‌های پس از جراحی دندانپزشکی و کشیدن دندان',
    description: 'دستورات ضروری پس از جراحی عقل و لثه، کنترل خونریزی با گاز استریل، رژیم غذایی نرم و بهداشت دهان و دندان.',
    fileName: 'pamphlet-dental-post-op-care.pdf',
    fileSize: 310000
  },

  // --- کتابچه‌ها ---
  {
    category: 'booklet',
    title: 'کتابچه راهنمای جامع بیمار و همراه در بدو ورود و بستری در بیمارستان',
    description: 'کتابچه خوش‌آمدگویی شامل قوانین بخش‌ها، ساعات ملاقات، منشور حقوق بیمار، معرفی خدمات مددکاری، بیمه و تغذیه.',
    fileName: 'booklet-patient-admission-guide.pdf',
    fileSize: 1250000
  },
  {
    category: 'booklet',
    title: 'کتابچه قوانین و ضوابط بیمارستان دوستدار کودک و ترویج تغذیه با شیر مادر',
    description: 'مجموعه راهنماهای عملی ۱۰ گانه بیمارستان دوستدار کودک، فواید هم‌اتاقی مادر و نوزاد (Rooming-in) و تماس پوست به پوست بدو تولد.',
    fileName: 'booklet-baby-friendly-hospital.pdf',
    fileSize: 980000
  },
  {
    category: 'booklet',
    title: 'کتابچه راهنمای ایمنی بیمار، پیشگیری از سقوط و زخم فشاری ویژه مراجعین',
    description: 'راهنمای ایمنی همراه بیمار در خصوص بالا نگه داشتن حفاظ تخت، درخواست کمک برای جابجایی بیمار و استفاده از کفش مناسب.',
    fileName: 'booklet-patient-safety-fall-prevention.pdf',
    fileSize: 840000
  },
  {
    category: 'booklet',
    title: 'کتابچه معرفی درمانگاه‌های تخصصی، فوق‌تخصصی و کلینیک‌های ویژه بیمارستان',
    description: 'فهرست اساتید و متخصصین به تفکیک رشته، برنامه شیفت‌های درمانگاهی، راهنمای نوبت‌دهی آنلاین و شماره‌های داخلی.',
    fileName: 'booklet-outpatient-specialty-clinics.pdf',
    fileSize: 1120000
  },

  // --- فرم‌های ابلاغی ---
  {
    category: 'issued_form',
    title: 'فرم ابلاغی ترخیص با مسئولیت شخصی (LAMA) و سلب مسئولیت درمانی',
    description: 'فرم رسمی وزارت بهداشت با فیلدهای درج هشدارهای پزشکی، علل ترک، امضای بیمار و ولی قانونی و دو شاهد درمانی.',
    fileName: 'form-lama-discharge-against-advice.pdf',
    fileSize: 220000
  },
  {
    category: 'issued_form',
    title: 'فرم رضایت و برائت‌نامه آگاهانه اقدامات تهاجمی و جراحی‌های سرپایی',
    description: 'فرم جامع دوبرگی حاوی تعهدنامه توضیحات خطرات پروسیجر توسط پزشک، روش‌های جایگزین و امضا و اثرانگشت بیمار.',
    fileName: 'form-informed-consent-invasive-procedures.pdf',
    fileSize: 260000
  },
  {
    category: 'issued_form',
    title: 'فرم صورتجلسه تحویل و امانت‌گذاری اموال و اشیای قیمتی بیمار',
    description: 'فرم سه‌برگی رسمی ثبت زیورآلات، وجه نقد، مدارک هویتی و تحویل به صندوق امانات حراست بیمارستان با شماره پلمپ.',
    fileName: 'form-patient-valuables-safekeeping.pdf',
    fileSize: 195000
  },
  {
    category: 'issued_form',
    title: 'فرم محرمانه گزارش داوطلبانه خطاهای پزشکی و وقایع ۲۸گانه ناخواسته',
    description: 'فرم گزارش بدون سرزنش خطا شامل کد تریاژ واقعه، شدت حادثه (سطوح A تا I)، عوامل زمینه‌ای و تحلیل ریشه‌ای.',
    fileName: 'form-medical-error-never-events-report.pdf',
    fileSize: 240000
  },
  {
    category: 'issued_form',
    title: 'فرم ارجاع و نوبت‌دهی شبانه‌روزی خدمات پاراکلینیکی (CT، سونوگرافی و آزمایشگاه)',
    description: 'برگه درخواست اقدامات تشخیصی اورژانسی ۲۴ ساعته با ثبت شناسه بیمار، زمان ارسال نمونه و مهر پزشک معالج.',
    fileName: 'form-paraclinic-24h-referral.pdf',
    fileSize: 180000
  },

  // --- آیین‌نامه‌ها ---
  {
    category: 'regulation',
    title: 'آیین‌نامه انضباط کاری، نوبت‌دهی و پوشش حرفه‌ای در درمانگاه‌های تخصصی',
    description: 'مقررات حضور و غیاب پزشکان و پرسنل درمانگاه، اصول نوبت‌دهی شناور، رعایت فرم لباس مصوب و نحوه پذیرش بیماران اورژانسی.',
    fileName: 'reg-outpatient-clinics-code-of-conduct.pdf',
    fileSize: 620000
  },
  {
    category: 'regulation',
    title: 'آیین‌نامه رسیدگی به شکایات، تکریم ارباب‌رجوع و پاسخگویی به مراجعین بیمارستان',
    description: 'فرآیند مصوب دریافت شکایات کتبی، تلفنی و الکترونیک، زمان‌بندی ارجاع به بازرسی و مهلت حداکثر ۴۸ ساعته جهت پاسخگویی به شاکی.',
    fileName: 'reg-complaints-handling-and-citizen-rights.pdf',
    fileSize: 580000
  },
  {
    category: 'regulation',
    title: 'آیین‌نامه حفاظت پرتوی و مقررات ایمنی در بخش‌های تصویربرداری و اتاق عمل',
    description: 'الزامات قانونی سازمان انرژی اتمی پیرامون استفاده از وسایل حفاظت سربی، پایش دوزیمتری TLD و محدودیت تردد افراد غیرمجاز.',
    fileName: 'reg-radiation-safety-and-protection.pdf',
    fileSize: 740000
  },

  // --- جزوه‌های آموزشی ---
  {
    category: 'training_handout',
    title: 'جزوه آموزشی استانداردهای تریاژ اورژانس (ESI) و مدیریت بحران سرپایی',
    description: 'درسنامه آموزشی سطح‌بندی ۵ گانه بیماران اورژانس، ارزیابی سریع علائم حیاتی و اولویت‌بندی اعزام به بخش‌های بستری.',
    fileName: 'handout-esi-triage-standards.pdf',
    fileSize: 1450000
  },
  {
    category: 'training_handout',
    title: 'جزوه آموزشی تفسیر نتایج سیتولوژی پاپ‌اسمیر و کولپوسکوپی ویژه کادر مامایی',
    description: 'راهنمای بالینی اصطلاحات سیستم بتسدا (Bethesda)، شناسایی ضایعات LSIL و HSIL و معیارهای ارجاع به متخصص انکولوژی زنان.',
    fileName: 'handout-pap-smear-colposcopy-interpretation.pdf',
    fileSize: 1320000
  },
  {
    category: 'training_handout',
    title: 'جزوه آموزشی تکنیک باز نمودن TR Band و مراقبت از شریان رادیال ویژه پرستاران',
    description: 'مراحل گام‌به‌گام تخلیه ایمن هوای دستبند شریانی، پیشگیری از هماتوم، کنترل پالس رادیال و مانورهای انسداد شریان اولنار.',
    fileName: 'handout-tr-band-deflation-technique.pdf',
    fileSize: 890000
  }
];

function runSeed() {
  console.log('[Seed Digital Library Enrichment] Starting digital library seed...');

  const hospitals = db.prepare('SELECT id, name FROM hospitals').all();
  if (!hospitals || hospitals.length === 0) {
    console.log('[Seed Digital Library Enrichment] No hospitals found. Skipping.');
    return;
  }

  const selectItem = db.prepare('SELECT id FROM digital_library_items WHERE hospital_id = ? AND title = ?');
  const insertItem = db.prepare(`
    INSERT INTO digital_library_items (
      id, hospital_id, category, title, description,
      file_path, file_name, file_size_bytes, is_example,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, 1,
      datetime('now'), datetime('now')
    )
  `);

  let addedCount = 0;

  for (const h of hospitals) {
    const hId = h.id;

    for (const item of LIBRARY_ITEMS) {
      const existing = selectItem.get(hId, item.title);
      if (!existing) {
        const id = crypto.randomUUID();
        const fakePath = 'uploads/library/' + item.fileName;
        insertItem.run(
          id, hId, item.category, item.title, item.description,
          fakePath, item.fileName, item.fileSize
        );
        addedCount++;
      }
    }
  }

  console.log(`[Seed Digital Library Enrichment] Added ${addedCount} library items across ${hospitals.length} hospitals.`);
  console.log('[Seed Digital Library Enrichment] ✅ Completed successfully.');
}

if (require.main === module) {
  runSeed();
  process.exit(0);
}

module.exports = { runSeed, LIBRARY_ITEMS };
