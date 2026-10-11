/**
 * راهنمای مسیر اعتباربخشی — تولید جدول‌زمانی گام‌به‌گام، ساده و بدون هوش مصنوعی
 *
 * تصمیم معماری: دقیقاً هم‌الگوی reminders.js — بدون جدول «پیشرفت» جداگانه. هر گام یک
 * تابع done(hospitalId) دارد که مستقیم از داده‌ی واقعی (تعداد کمیته، تعداد سنجه‌های
 * ثبت‌شده، وجود سند و ...) در لحظه محاسبه می‌کند؛ هیچ درصدی جعل نمی‌شود. تنها چیزی که
 * در دیتابیس ذخیره می‌شود «بستن دستیِ» یک گام توسط کاربر است (guide_dismissals) — برای
 * گام‌هایی که ذاتاً چک‌لیستی نیستند (مثل «آشنایی با ماژول X»).
 *
 * زمان‌بندی گام‌ها بر مبنای start_year (سالی که ادمین در ویزارد راه‌اندازی انتخاب کرده)
 * تا امروزِ شمسی سرور تقسیم می‌شود: ماه اول، سه‌ماهه‌ی اول، سه‌ماهه‌ی دوم و به بعد — نه
 * تاریخ‌های مطلق ساختگی، فقط «چه زمانی نسبت به شروع کار».
 *
 * دقت سطح فیلد: هر گام علاوه بر «page» (کدام صفحه)، در صورت امکان یک «field» هم دارد —
 * دقیقاً همان id ورودی/سلکتی که در FIELD_GUIDES سمت فرانت (public/js/app.js) هم تعریف
 * شده. با این field، دکمه‌ی «برو به آنجا» به‌جای فقط عوض‌کردن صفحه، همان کادر مشخص را
 * روی صفحه پیدا و با هاله‌ی طلایی نشان می‌دهد (guideGoTo در app.js). برای گام‌هایی که
 * مقصدشان یک فرم «ثبت جدید» است (که پیش از کلیک روی دکمه‌ی مربوطه اصلاً روی صفحه
 * وجود ندارد)، نام دقیق فیلد/دکمه در همان متن توضیح (desc) آورده می‌شود.
 */
const { query } = require('../config/database-sqlite');
const { todayJalali, JMONTHS, tehranTodayStr } = require('../config/jalali');
const { COMMITTEES } = require('../../database/seed-committees');

// هر گام: key پایدار، عنوان و توضیح دقیق (با نام فیلد/دکمه‌ی مشخص در صورت لزوم)، مرحله‌ی
// زمانی نسبی (ماه اول/سه‌ماهه‌ی اول/...)، صفحه‌ی مقصد + در صورت امکان فیلد مقصد برای
// دکمه‌ی «برو به آنجا»، مجوزی که تعیین می‌کند این گام برای چه نقشی نمایش داده شود، و
// تابع محاسبه‌ی وضعیت done از داده‌ی واقعی.
// ترتیب فازها فقط برای نمایش گروه‌بندی‌شده در پنل استفاده می‌شود؛ خودِ گام‌ها به‌ترتیب
// تاریخی commit اضافه شده‌اند و ترتیبشان در آرایه با فاز واقعی‌شان همخوانی نداشت
// (مثلاً «تعیین سرپرستار» که فازش سه‌ماهه‌ی اول است، در انتهای آرایه بعد از فازهای
// دیرتر قرار داشت) — پایین همین فایل با PHASE_ORDER دوباره مرتب می‌شوند تا کاربر یک
// مسیر منطقی «فاز ۱ → فاز ۲ → ...» ببیند، نه فهرست به‌هم‌ریخته‌ی زمانی.
const PHASE_ORDER = ['ماه اول', 'سه‌ماهه‌ی اول', 'سه‌ماهه‌ی دوم', 'سه‌ماهه‌ی سوم به بعد'];
const PHASE_LABELS = {
  'ماه اول': 'فاز ۱ — راه‌اندازی پایه (ماه اول)',
  'سه‌ماهه‌ی اول': 'فاز ۲ — ساختار سازمانی (سه‌ماهه‌ی اول)',
  'سه‌ماهه‌ی دوم': 'فاز ۳ — محتوای اعتباربخشی (سه‌ماهه‌ی دوم)',
  'سه‌ماهه‌ی سوم به بعد': 'فاز ۴ — نگهداری و بهبود مستمر (سه‌ماهه‌ی سوم به بعد)',
};

function buildMilestonesRaw() {
  return [
    {
      key: 'profile_complete',
      phase: 'ماه اول',
      title: 'تکمیل مشخصات بیمارستان',
      desc: 'در «تنظیمات»، فیلدهای ستاره‌دار را پر کنید: نوع بیمارستان، تعداد تخت فعال، استان، شهر و نام رئیس بیمارستان.',
      page: 'settings', field: 'se_type', permission: 'manage_hospital_settings',
      done(hospitalId) {
        const h = query('SELECT hospital_type, beds_count, province, city, ceo_name FROM hospital_profiles WHERE hospital_id = ?', [hospitalId]).rows[0];
        return !!(h && h.hospital_type && h.beds_count && h.province && h.city && h.ceo_name);
      },
    },
    {
      key: 'committees_created',
      phase: 'ماه اول',
      title: 'تشکیل کمیته‌های الزامی',
      desc: `از ${COMMITTEES.length} کمیته‌ی الزامی طبق کتاب سنجه‌ها، هرکدام که هنوز ساخته نشده را در «کمیته‌ها» بسازید و اعضا و رئیس آن را ثبت کنید.`,
      page: 'committees', permission: 'manage_committees',
      progress(hospitalId) {
        const total = COMMITTEES.length;
        const have = query('SELECT COUNT(*) c FROM committees WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return { have, total };
      },
      done(hospitalId) {
        const p = this.progress(hospitalId);
        return p.have >= p.total;
      },
    },
    {
      key: 'safety_measures_started',
      phase: 'سه‌ماهه‌ی اول',
      title: 'ثبت وضعیت سنجه‌های ایمنی بیمار',
      desc: 'سنجه‌هایی که نشان ایمنی بیمار دارند در نمره‌ی نهایی دو برابر اثر می‌گذارند؛ در «سنجه‌ها»، برای هر یک از این سنجه‌ها وضعیت را از «هنوز بررسی نشده» به یکی از سه وضعیت واقعی (منطبق کامل/جزئی/غیرمنطبق) تغییر دهید.',
      page: 'measures', permission: 'edit_measure_status',
      progress(hospitalId) {
        const total = query(`SELECT COUNT(*) c FROM accreditation_sections
          WHERE level_type = 'measure' AND patient_safety_flag = 1`).rows[0].c;
        const have = query(`SELECT COUNT(*) c FROM measure_status ms
          JOIN accreditation_sections m ON ms.measure_id = m.id
          WHERE ms.hospital_id = ? AND m.patient_safety_flag = 1 AND ms.status != 'not_reviewed'`, [hospitalId]).rows[0].c;
        return { have, total };
      },
      done(hospitalId) {
        const p = this.progress(hospitalId);
        return p.total > 0 && p.have >= p.total;
      },
    },
    {
      key: 'org_divisions_heads',
      phase: 'سه‌ماهه‌ی اول',
      title: 'تعیین مسئول برای هر حوزه‌ی سازمانی',
      desc: 'در «ساختار سازمانی»، کنار هر یک از سه حوزه‌ی مدیریت/پرستاری/پشتیبانی روی «تعیین مسئول» بزنید و یک کاربر انتخاب کنید تا مسئولیت هر حوزه روشن باشد.',
      page: 'orgstructure', permission: 'manage_org_divisions',
      progress(hospitalId) {
        const total = query('SELECT COUNT(*) c FROM org_divisions WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        const have = query('SELECT COUNT(*) c FROM org_divisions WHERE hospital_id = ? AND head_user_id IS NOT NULL', [hospitalId]).rows[0].c;
        return { have, total };
      },
      done(hospitalId) {
        const p = this.progress(hospitalId);
        return p.total > 0 && p.have >= p.total;
      },
    },
    {
      key: 'users_added',
      phase: 'سه‌ماهه‌ی اول',
      title: 'افزودن همکاران به سامانه',
      desc: 'در «مدیریت کاربران»، روی «افزودن کاربر» بزنید و برای هر همکاری که باید در این سامانه ثبت انجام دهد (سرپرستار، سوپروایزر، مسئول واحد و…) یک حساب با نقش درست بسازید. تا وقتی کاربران واقعی وارد نشده‌اند، ثبت داده عملاً به‌دوش یک نفر می‌افتد.',
      page: 'users', permission: 'manage_users',
      progress(hospitalId) {
        const have = query(`SELECT COUNT(*) c FROM users u JOIN roles r ON u.role_id = r.id
          WHERE u.hospital_id = ? AND r.code != 'hospital_admin'`, [hospitalId]).rows[0].c;
        return { have, total: 3 }; // آستانه‌ی نمادین «تیم حداقلی» — نه سقف واقعی
      },
      done(hospitalId) {
        const p = this.progress(hospitalId);
        return p.have >= p.total;
      },
    },
    {
      key: 'controlled_documents',
      phase: 'سه‌ماهه‌ی دوم',
      title: 'تکمیل مدارک کنترل‌شده‌ی پرتکرار',
      desc: 'در «مدارک»، روی «سند جدید» بزنید و خط‌مشی‌ها و روش‌های اجرایی پرکاربرد (کنترل عفونت، دارو، ایمنی بیمار) را با «کد مدرک» و گردش امضای کامل ثبت کنید.',
      page: 'documents', permission: 'manage_documents',
      progress(hospitalId) {
        const have = query(`SELECT COUNT(*) c FROM controlled_documents WHERE hospital_id = ? AND status = 'active'`, [hospitalId]).rows[0].c;
        return { have, total: 5 }; // آستانه‌ی نمادین «شروع جدی» — نه سقف واقعی
      },
      done(hospitalId) {
        const p = this.progress(hospitalId);
        return p.have >= p.total;
      },
    },
    {
      key: 'first_committee_meeting',
      phase: 'سه‌ماهه‌ی دوم',
      title: 'برگزاری اولین جلسه‌ی رسمی کمیته',
      desc: 'در «کمیته‌ها»، برای یکی از کمیته‌های ساخته‌شده یک جلسه زمان‌بندی کنید و پس از برگزاری، دستور کار و مصوبات آن را در فرم «صورت‌جلسه» ثبت کنید — بدون مصوبات با مسئول و مهلت مشخص، جلسه از نظر بازرس ثبت‌نشده حساب می‌شود.',
      page: 'committees', permission: 'manage_committees',
      done(hospitalId) {
        const c = query(`SELECT COUNT(*) c FROM calendar_events WHERE hospital_id = ? AND event_type = 'committee_meeting'`, [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
    {
      key: 'digital_library_populated',
      phase: 'سه‌ماهه‌ی دوم',
      title: 'بارگذاری اولین اسناد در کتابخانه دیجیتال',
      desc: 'در تب «کتابخانه دیجیتال» صفحه‌ی مدارک، آیین‌نامه‌ها و بخشنامه‌های ابلاغی بیرونی که گردش امضا نمی‌خواهند را با «افزودن مورد جدید» بارگذاری کنید — این‌ها را با مدارک کنترل‌شده اشتباه نگیرید؛ آن‌ها امضا و تاریخچه‌ی نسخه دارند، این‌ها فقط فایل و توضیح.',
      page: 'documents', permission: 'manage_documents',
      done(hospitalId) {
        const c = query('SELECT COUNT(*) c FROM digital_library_items WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
    {
      key: 'error_reporting_active',
      phase: 'سه‌ماهه‌ی سوم به بعد',
      title: 'فعال‌سازی گزارش‌دهی خطا و FMEA',
      desc: 'فرهنگ گزارش‌دهی بدون سرزنش را با ثبت اولین «گزارش خطا» یا اولین تحلیل «FMEA» شروع کنید — هدف پیدا کردن ضعف فرایند است، نه مقصر.',
      page: 'errors', permission: 'submit_medical_error_report',
      done(hospitalId) {
        const e = query('SELECT COUNT(*) c FROM medical_error_reports WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        const f = query('SELECT COUNT(*) c FROM fmea_records WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return (e + f) > 0;
      },
    },
    {
      key: 'checklists_running',
      phase: 'سه‌ماهه‌ی سوم به بعد',
      title: 'راه‌اندازی بانک چک‌لیست',
      desc: 'در «چک‌لیست‌ها»، حداقل یک چک‌لیست فعال بسازید (عنوان و سؤالات را در فرم «چک‌لیست جدید» تکمیل کنید) و سپس یک بار آن را از طریق دکمه‌ی «تکمیل» پاسخ دهید تا سنجش دوره‌ای عملاً شروع شود.',
      page: 'checklists', permission: 'manage_checklists',
      done(hospitalId) {
        const c = query(`SELECT COUNT(*) c FROM checklists WHERE hospital_id = ? AND status = 'active'`, [hospitalId]).rows[0].c;
        const s = query(`SELECT COUNT(*) c FROM checklist_submissions sub JOIN checklists ch ON sub.checklist_id = ch.id
          WHERE ch.hospital_id = ?`, [hospitalId]).rows[0].c;
        return c > 0 && s > 0;
      },
    },
    {
      key: 'internal_audit_recorded',
      phase: 'سه‌ماهه‌ی سوم به بعد',
      title: 'انجام اولین حسابرسی داخلی',
      desc: 'در «حسابرسی داخلی»، روی «حسابرسی جدید» بزنید، یک بخش و یک چک‌لیست ارزیابی انتخاب کنید و پس از بازدید، «خلاصه یافته‌ها» را با موارد قابل‌اثبات (نه برداشت کلی) ثبت کنید.',
      page: 'audits', permission: 'manage_audits',
      done(hospitalId) {
        const c = query('SELECT COUNT(*) c FROM internal_audits WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
    {
      key: 'improvement_program_proposed',
      phase: 'سه‌ماهه‌ی سوم به بعد',
      title: 'ثبت اولین برنامه‌ی بهبود',
      desc: 'هر عدم‌انطباقی که در سنجه‌ها یا حسابرسی‌ها ثبت کردید را در «برنامه‌های بهبود» با دکمه‌ی «پیشنهاد برنامه» پیگیری کنید — عدم‌انطباق بدون برنامه، همان عدم‌انطباقِ سال بعد است.',
      page: 'programs', permission: 'view_programs',
      done(hospitalId) {
        const c = query('SELECT COUNT(*) c FROM improvement_programs WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
    {
      key: 'training_needs_submitted',
      phase: 'سه‌ماهه‌ی سوم به بعد',
      title: 'ثبت اولین نیازسنجی آموزشی',
      desc: 'در «نیازسنجی آموزشی»، برای حداقل یک همکار یک نیاز آموزشی ثبت کنید تا گردش کارمند → مافوق → سازمان عملاً شروع شود.',
      page: 'training', permission: 'view_training',
      done(hospitalId) {
        const c = query('SELECT COUNT(*) c FROM training_needs WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
    {
      key: 'org_units_structured',
      phase: 'سه‌ماهه‌ی اول',
      title: 'تعریف واحدها و بخش‌های سازمانی',
      desc: 'در «ساختار سازمانی»، تب «واحدها»، روی «واحد جدید» بزنید و بخش‌ها/واحدهای بالینی و پشتیبانی بیمارستان (اورژانس، ICU، رادیولوژی، آزمایشگاه و…) را با نام و نوع واحد ثبت کنید — بدون این فهرست، بسیاری از فرم‌های دیگر سامانه محل انتخاب «واحد» ندارند.',
      page: 'orgstructure', permission: 'manage_org_structure',
      progress(hospitalId) {
        const have = query('SELECT COUNT(*) c FROM org_units WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return { have, total: 5 }; // آستانه‌ی نمادین «ساختار حداقلی» — نه سقف واقعی
      },
      done(hospitalId) {
        const p = this.progress(hospitalId);
        return p.have >= p.total;
      },
    },
    {
      key: 'nursing_hierarchy_setup',
      phase: 'سه‌ماهه‌ی اول',
      title: 'تعیین سرپرستار هر بخش پرستاری',
      desc: 'در «سلسله‌مراتب پرستاری»، برای هر بخشی که ساخته‌اید (تب «بخش‌ها») روی «تعیین سرپرستار» بزنید و یک کاربر با نقش سرپرستار انتخاب کنید — بدون سرپرستار مشخص، داشبورد سرپرستار (حضور و غیاب، مرخصی، وظایف شیفت) برای آن بخش قابل استفاده نیست.',
      page: 'nursing', permission: 'manage_nursing_hierarchy',
      progress(hospitalId) {
        const total = query('SELECT COUNT(*) c FROM nursing_wards WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        const have = query('SELECT COUNT(*) c FROM nursing_wards WHERE hospital_id = ? AND head_nurse_id IS NOT NULL', [hospitalId]).rows[0].c;
        return { have, total };
      },
      done(hospitalId) {
        const p = this.progress(hospitalId);
        return p.total > 0 && p.have >= p.total;
      },
    },
    {
      key: 'bsc_kpis_tracked',
      phase: 'سه‌ماهه‌ی دوم',
      title: 'ثبت اولین مقدار کارت امتیازی متوازن (BSC)',
      desc: 'در «کارت امتیازی متوازن»، برای حداقل یکی از شاخص‌های تعریف‌شده، مقدار ماه جاری را در ستون همان ماه وارد و ذخیره کنید تا روند سنجش عملکرد شروع شود.',
      page: 'bsc', permission: 'manage_bsc',
      done(hospitalId) {
        const c = query('SELECT COUNT(*) c FROM bsc_monthly_values WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
    {
      key: 'management_walkaround_recorded',
      phase: 'سه‌ماهه‌ی دوم',
      title: 'ثبت اولین بازدید میدانی مدیریتی',
      desc: 'در «بازدید میدانی مدیریتی»، روی «بازدید جدید» بزنید، تاریخ و بخش بازدیدشده را مشخص کنید و خلاصه‌ی یافته‌ها و اقدامات پیشنهادی را ثبت کنید.',
      page: 'walkarounds', permission: 'manage_walkarounds',
      done(hospitalId) {
        const c = query('SELECT COUNT(*) c FROM management_walkarounds WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
    {
      key: 'electronic_signature_uploaded',
      phase: 'سه‌ماهه‌ی اول',
      title: 'ثبت اولین امضای الکترونیکی',
      desc: 'در «تنظیمات»، بخش «امضای الکترونیکی»، برای حداقل یک کاربر (مثلاً رئیس بیمارستان یا مدیر پرستاری) فایل امضا را بارگذاری و فعال کنید — گردش امضای مدارک کنترل‌شده به این امضاها وابسته است.',
      page: 'settings', permission: 'manage_hospital_settings',
      done(hospitalId) {
        const c = query('SELECT COUNT(*) c FROM electronic_signatures WHERE hospital_id = ? AND is_active = 1', [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
    {
      key: 'reminder_rules_configured',
      phase: 'سه‌ماهه‌ی دوم',
      title: 'تنظیم قوانین یادآوری خودکار',
      desc: 'در «تنظیمات»، بخش «قوانین یادآوری خودکار»، روی «قانون جدید» بزنید و برای رویدادهایی مثل انقضای مدارک یا سررسید جلسات، یادآوری خودکار در کارتابل تعریف کنید.',
      page: 'settings', permission: 'manage_hospital_settings',
      done(hospitalId) {
        const c = query('SELECT COUNT(*) c FROM reminder_rules WHERE hospital_id = ?', [hospitalId]).rows[0].c;
        return c > 0;
      },
    },
  ];
}

// خروجی نهایی: مرتب‌شده بر اساس فاز واقعی (نه ترتیب افزودن در کد) + برچسب فاز خوانا.
function buildMilestones() {
  return buildMilestonesRaw()
    .slice()
    .sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase))
    .map(m => ({ ...m, phaseLabel: PHASE_LABELS[m.phase] || m.phase }));
}

// فقط گام‌هایی که کاربر مجوزشان را دارد ("*" یعنی همه) — همان کاتالوگ مجوز موجود،
// بدون هیچ سیستم نقش موازی
function permittedMilestones(userPermissions) {
  const perms = userPermissions || [];
  return buildMilestones().filter(m => perms.includes(m.permission) || perms.includes('*'));
}

// این راهنما هدفش «پیگیری» است، نه یک چک‌لیست یک‌باره که با یک کلیک برای همیشه محو
// می‌شود — به همین دلیل دو عمل جدا روی هر گام وجود دارد، دقیقاً هم‌الگوی
// reminder_dismissals (src/routes/api.js: /reminders/done و /reminders/snooze):
//   «✅ انجام دادم» → state='done' → همیشه پنهان می‌ماند (اگر بعداً داده‌ی واقعی نشان داد
//     که گام هنوز ناقص است، م.done() خودش دوباره true/false واقعی را حساب می‌کند و چون
//     این گام DB-verified است، وضعیت done از خودِ داده می‌آید، نه از این پرچم — این پرچم
//     فقط برای گام‌هایی که اساساً «چک‌لیستی» نیستند کاربرد پنهان‌سازی دارد)
//   «⏰ بعداً یادآوری کن» → state='snoozed' + snooze_until (+۳ روز) → گام موقتاً از فهرست
//     «باقی‌مانده» کنار می‌رود ولی بعد از آن تاریخ، اگر هنوز واقعاً انجام نشده، خودش دوباره
//     در ویجت ظاهر می‌شود — برخلاف «انجام دادم»، این هرگز برای همیشه پنهان نمی‌کند.
function timelineFor(userId, hospitalId, userPermissions) {
  const period = query('SELECT start_year FROM accreditation_periods WHERE hospital_id = ?', [hospitalId]).rows[0];
  const startYear = period && period.start_year;
  if (!startYear) return { start_year: null, today_jalali: todayJalali(), items: [] };

  const today = todayJalali();
  const todayIso = tehranTodayStr();
  const dismissMap = new Map(
    query('SELECT milestone_key, state, snooze_until FROM guide_dismissals WHERE user_id = ?', [userId]).rows
      .map(r => [r.milestone_key, r])
  );

  const items = permittedMilestones(userPermissions).map(m => {
    const dbDone = !!m.done(hospitalId);
    const d = dismissMap.get(m.key);
    // «انجام دادم» فقط برای گام‌هایی که DB هنوز done=false می‌بیند معنا دارد؛ اگر داده‌ی
    // واقعی خودش done شده، همان معتبر است و پرچم دستی دیگر لازم نیست.
    const done = dbDone || (!!d && d.state === 'done');
    const snoozedActive = !!d && d.state === 'snoozed' && d.snooze_until && d.snooze_until > todayIso;
    const progress = m.progress ? m.progress(hospitalId) : null;
    return {
      key: m.key, phase: m.phase, phaseLabel: m.phaseLabel, title: m.title, desc: m.desc, page: m.page, field: m.field || null,
      done, progress,
      snoozed: snoozedActive,
      snooze_until: snoozedActive ? d.snooze_until : null,
    };
  }).filter(it => !(it.done === false && it.snoozed)); // یادآوری‌های به‌تعویق‌افتاده فقط تا تاریخ snooze پنهان می‌مانند

  return {
    start_year: startYear,
    today_jalali: today,
    start_month_name: JMONTHS[0],
    items,
    remaining: items.filter(i => !i.done).length,
  };
}

function setMilestoneState(userId, hospitalId, key, state, snoozeUntil) {
  const crypto = require('crypto');
  const existing = query('SELECT id FROM guide_dismissals WHERE user_id = ? AND milestone_key = ?', [userId, key]).rows[0];
  if (existing) {
    query(`UPDATE guide_dismissals SET state = ?, snooze_until = ?, created_at = datetime('now') WHERE id = ?`,
      [state, snoozeUntil || null, existing.id]);
  } else {
    query(`INSERT INTO guide_dismissals (id, hospital_id, user_id, milestone_key, state, snooze_until) VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), hospitalId, userId, key, state, snoozeUntil || null]);
  }
}

// «✅ انجام دادم» — قبل از هر چیز، وضعیت واقعی از DB دوباره چک می‌شود (همان done() که
// timelineFor هم از آن استفاده می‌کند)؛ اگر واقعاً هنوز پر نشده، خطای صریح برمی‌گردد و
// چیزی ثبت نمی‌شود — این کلید طبق اصل اصلی این ماژول («هیچ درصد/وضعیتی جعل نمی‌شود»)
// هرگز نباید بتواند یک گام ناقص را قلابی «تمام‌شده» نشان دهد.
function dismissMilestone(userId, hospitalId, key) {
  const m = buildMilestones().find(x => x.key === key);
  if (!m) throw new Error('گام نامعتبر است');
  if (!m.done(hospitalId)) {
    const err = new Error('مورد پر نشده است');
    err.code = 'NOT_FILLED';
    throw err;
  }
  setMilestoneState(userId, hospitalId, key, 'done', null);
}

// «⏰ بعداً یادآوری کن» — پیش‌فرض ۳ روز؛ برخلاف reminders (۷ روز پیش‌فرض) کوتاه‌تر است چون
// این گام‌ها بخشی از راه‌اندازی اولیه‌اند و نباید هفته‌ها فراموش شوند.
function snoozeMilestone(userId, hospitalId, key, days) {
  const d = Math.min(30, Math.max(1, parseInt(days, 10) || 3));
  const until = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  setMilestoneState(userId, hospitalId, key, 'snoozed', until);
  return until;
}

// setMilestoneState برای وظایف سمت (کلیدهای duty_*) هم لازم است: آن‌ها گامِ راه‌اندازی
// نیستند و در buildMilestones وجود ندارند، پس dismissMilestone که اعتبار کلید را آن‌جا
// چک می‌کند برایشان «گام نامعتبر» می‌داد.
module.exports = { timelineFor, dismissMilestone, snoozeMilestone, buildMilestones, setMilestoneState };
