/**
 * Migration + Seed: روش‌های اجرایی نظارت بر چک‌لیست‌های رهبری و مدیریت (SOP)
 * مطابق عکس‌های ۵ تا ۱۵ سامانه مرجع
 * Idempotent: اجرای دوباره = بدون تغییر تکراری
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

function uuid() {
  return crypto.randomUUID();
}

const LEADERSHIP_SOPS = [
  { code: 'SOP-LM-01', title: 'مدیریت چک لیست ارزیابی ایمنی و بهداشت محیط', cadence: 'ماهانه', measurer: 'کارشناس بهداشت محیط', monitor: 'مدیر خدمات پشتیبانی', section: 'الف-۱' },
  { code: 'SOP-LM-02', title: 'مدیریت چک لیست ارزیابی مهارت های تخصصی گروه های پرستاری', cadence: 'فصلی', measurer: 'سوپروایزر آموزشی', monitor: 'مدیر خدمات پرستاری (مترون)', section: 'الف-۲' },
  { code: 'SOP-LM-03', title: 'مدیریت چک لیست ارزیابی مهارت های تخصصی کمک بهیاران', cadence: 'فصلی', measurer: 'سرپرستار بخش', monitor: 'سوپروایزر بالینی', section: 'الف-۲' },
  { code: 'SOP-LM-04', title: 'مدیریت نظرسنجی از کیفیت آموزش بخش های بالینی از دیدگاه کارآموزان', cadence: 'فصلی', measurer: 'کارشناس آموزش', monitor: 'معاون آموزشی / پژوهشی', section: 'الف-۱' },
  { code: 'SOP-LM-05', title: 'مدیریت نظرسنجی از شرایط آموزشی کارورزان', cadence: '۶ ماهه', measurer: 'مسئول امور کارورزان', monitor: 'ریاست دانشکده / بیمارستان', section: 'الف-۱' },
  { code: 'SOP-LM-06', title: 'پایش و ارزیابی عملکرد مدیران میانی و پایه', cadence: 'سالانه', measurer: 'مدیر منابع انسانی', monitor: 'مدیر بیمارستان', section: 'الف-۱' },
  { code: 'SOP-LM-07', title: 'پایش شاخص‌های عملکردی بالینی و غیربالینی', cadence: 'ماهانه', measurer: 'مسئول آمار و اطلاعات', monitor: 'مدیر بهبود کیفیت', section: 'الف-۳' },
  { code: 'SOP-LM-08', title: 'ارزیابی دوره‌ای پرونده‌های پزشکی و مستندسازی بالینی', cadence: 'ماهانه', measurer: 'دبیر کمیته مدارک پزشکی', monitor: 'معاون درمان', section: 'الف-۴' },
  { code: 'SOP-LM-09', title: 'مدیریت و نظارت بر تجهیزات پزشکی حساس و سرمایه‌ای', cadence: 'ماهانه', measurer: 'مهندس تجهیزات پزشکی', monitor: 'مدیر امور عمومی', section: 'الف-۵' },
  { code: 'SOP-LM-10', title: 'پایش رعایت منشور حقوق بیمار و اخلاق بالینی', cadence: 'ماهانه', measurer: 'مسئول تکریم ارباب رجوع', monitor: 'دبیر کمیته اخلاق بالینی', section: 'الف-۱' },
  { code: 'SOP-LM-11', title: 'مدیریت تریاژ و پایش زمان‌های انتظار در بخش اورژانس', cadence: 'ماهانه', measurer: 'سرپرستار اورژانس', monitor: 'متخصص طب اورژانس / مترون', section: 'ب-۱' },
  { code: 'SOP-LM-12', title: 'پایش فرآیند مدیریت دارو و ثبت خطاهای دارویی', cadence: 'ماهانه', measurer: 'مسئول فنی داروخانه', monitor: 'دبیر کمیته دارو و درمان', section: 'ب-۳' },
  { code: 'SOP-LM-13', title: 'ارزیابی و کنترل عفونت‌های بیمارستانی و رعایت بهداشت دست', cadence: 'ماهانه', measurer: 'سوپروایزر کنترل عفونت', monitor: 'پزشک کنترل عفونت', section: 'ب-۴' },
  { code: 'SOP-LM-14', title: 'پایش ممیزی بالینی و جلسات مورتالیتی و موربیدیتی', cadence: 'ماهانه', measurer: 'کارشناس ممیزی بالینی', monitor: 'دبیر کمیته مورتالیتی', section: 'الف-۳' },
  { code: 'SOP-LM-15', title: 'مدیریت حوادث، بلایا و ارزیابی مانورهای بحران (EOP)', cadence: 'فصلی', measurer: 'دبیر کمیته مدیریت بحران', monitor: 'رئیس بیمارستان / فرمانده حادثه', section: 'ج-۱' },
  { code: 'SOP-LM-16', title: 'نظارت بر بهداشت و ایمنی شغلی کارکنان بیمارستان', cadence: 'فصلی', measurer: 'کارشناس بهداشت حرفه‌ای', monitor: 'دبیر کمیته حفاظت فنی', section: 'ج-۲' },
  { code: 'SOP-LM-17', title: 'پایش انطباق نسخه الکترونیک و پرونده الکترونیک سلامت (HIS)', cadence: 'ماهانه', measurer: 'مسئول فناوری اطلاعات', monitor: 'دبیر کمیته فناوری اطلاعات', section: 'الف-۴' },
  { code: 'SOP-LM-18', title: 'ارزیابی زنجیره سرما و نگهداری فرآورده‌های خونی', cadence: 'ماهانه', measurer: 'مسئول بانک خون', monitor: 'دبیر کمیته طب انتقال خون', section: 'ب-۲' },
  { code: 'SOP-LM-19', title: 'پایش استانداردهای ایمنی و نگهداری تاسیسات حیاتی', cadence: 'ماهانه', measurer: 'مسئول فنی تاسیسات', monitor: 'مدیر خدمات پشتیبانی', section: 'ج-۳' },
  { code: 'SOP-LM-20', title: 'ارزیابی رضایت‌مندی بیماران و رسیدگی به شکایات', cadence: 'ماهانه', measurer: 'کارشناس رسیدگی به شکایات', monitor: 'مدیر بازرسی و پاسخگویی', section: 'الف-۱' },
  { code: 'SOP-LM-21', title: 'نظارت بر استریلیزاسیون مرکزی (CSSD) و بسته‌بندی ابزار', cadence: 'ماهانه', measurer: 'مسئول CSSD', monitor: 'سوپروایزر کنترل عفونت', section: 'ب-۴' },
  { code: 'SOP-LM-22', title: 'پایش فرآیند تحویل بالینی بیمار (ISBAR) در شیفت‌ها', cadence: 'ماهانه', measurer: 'سوپروایزر بالینی', monitor: 'مدیر پرستاری', section: 'الف-۲' },
  { code: 'SOP-LM-23', title: 'ارزیابی فرآیند جراحی امن و تکمیل چک‌لیست سه‌مرحله‌ای', cadence: 'ماهانه', measurer: 'سرپرستار اتاق عمل', monitor: 'رئیس اتاق عمل', section: 'ب-۵' },
  { code: 'SOP-LM-24', title: 'پایش مدیریت پسماندهای عفونی، تیز و برنده', cadence: 'ماهانه', measurer: 'کارشناس بهداشت محیط', monitor: 'دبیر کمیته بهداشت محیط', section: 'ج-۲' },
  { code: 'SOP-LM-25', title: 'نظارت بر انطباق خدمات رادیولوژی و حفاظت پرتویی', cadence: 'فصلی', measurer: 'کارشناس فیزیک بهداشت', monitor: 'متخصص رادیولوژی', section: 'ب-۶' },
  { code: 'SOP-LM-26', title: 'پایش کنترل کیفی داخلی و خارجی آزمایشگاه تشخیص طبی', cadence: 'ماهانه', measurer: 'مسئول فنی آزمایشگاه', monitor: 'دبیر کمیته کیفیت آزمایشگاه', section: 'ب-۷' },
  { code: 'SOP-LM-27', title: 'ارزیابی فرآیند ترخیص، آموزش بیمار و مراقبت پس از خروج', cadence: 'ماهانه', measurer: 'سوپروایزر آموزش سلامت', monitor: 'مدیر خدمات پرستاری', section: 'الف-۱' },
  { code: 'SOP-LM-28', title: 'پایش ایمنی محیط فیزیوتراپی و توانبخشی بیماران', cadence: 'فصلی', measurer: 'مسئول توانبخشی', monitor: 'مدیر درمان', section: 'ب-۸' },
  { code: 'SOP-LM-29', title: 'نظارت بر فرآیند تغذیه بالینی و سلامت آشپزخانه', cadence: 'ماهانه', measurer: 'کارشناس تغذیه و رژیم‌درمانی', monitor: 'کارشناس بهداشت محیط', section: 'ج-۴' },
  { code: 'SOP-LM-30', title: 'پایش رعایت استانداردهای انبارش دارویی و اقلام بیولوژیک', cadence: 'ماهانه', measurer: 'انباردار دارویی', monitor: 'مسئول داروخانه', section: 'ب-۳' },
  { code: 'SOP-LM-31', title: 'ارزیابی فرآیند احیای قلبی ریوی (کد ۹۹) و ترالی اورژانس', cadence: 'ماهانه', measurer: 'دبیر کمیته CPR', monitor: 'متخصص بیهوشی / اورژانس', section: 'ب-۱' },
  { code: 'SOP-LM-32', title: 'نظارت بر سیستم‌های هشدار حریق و تجهیزات اطفای حریق', cadence: 'فصلی', measurer: 'مسئول ایمنی و آتش‌نشانی', monitor: 'مدیر بحران', section: 'ج-۱' },
  { code: 'SOP-LM-33', title: 'پایش سلامت شغلی و واکسیناسیون پرسنل در معرض خطر', cadence: '۶ ماهه', measurer: 'پزشک طب کار', monitor: 'مسئول بهداشت حرفه‌ای', section: 'ج-۲' },
  { code: 'SOP-LM-34', title: 'ارزیابی صلاحیت و آموزش بدو خدمت کارکنان تازه وارد', cadence: 'موردی', measurer: 'سوپروایزر آموزشی', monitor: 'مدیر منابع انسانی', section: 'الف-۲' },
  { code: 'SOP-LM-35', title: 'پایش فرآیند رضایت آگاهانه و برائت‌نامه در بخش‌ها', cadence: 'ماهانه', measurer: 'کارشناس حقوقی بیمارستان', monitor: 'معاون درمان', section: 'الف-۱' },
  { code: 'SOP-LM-36', title: 'نظارت بر مدیریت خطاها و وقایع ۲۸گانه (Never Events)', cadence: 'ماهانه', measurer: 'سوپروایزر ایمنی بیمار', monitor: 'رئیس بیمارستان', section: 'الف-۳' },
  { code: 'SOP-LM-37', title: 'پایش اجرای استانداردهای ترویج زایمان طبیعی و LDR', cadence: 'ماهانه', measurer: 'سرپرستار بلوک زایمان', monitor: 'متخصص زنان و زایمان', section: 'ب-۹' },
  { code: 'SOP-LM-38', title: 'ارزیابی فرآیند اعزام و انتقال ایمن بیمار بین‌بیمارستانی', cadence: 'ماهانه', measurer: 'مسئول اعزام اورژانس', monitor: 'سوپروایزر بالینی', section: 'ب-۱' },
  { code: 'SOP-LM-39', title: 'پایش استانداردهای واحد دیالیز و کیفیت آب R.O', cadence: 'ماهانه', measurer: 'سرپرستار بخش دیالیز', monitor: 'متخصص نفرولوژی', section: 'ب-۱۰' },
  { code: 'SOP-LM-40', title: 'نظارت بر بازنگری دوره‌ای خط‌مشی‌ها و روش‌های اجرایی', cadence: 'سالانه', measurer: 'کارشناس بهبود کیفیت', monitor: 'مدیر بهبود کیفیت و اعتباربخشی', section: 'الف-۱' }
];

function runMigration() {
  console.log('[Seed Leadership SOPs] Starting migration...');
  const hospitals = db.prepare("SELECT id FROM hospitals WHERE is_active = 1").all();
  if (!hospitals.length) {
    console.log('[Seed Leadership SOPs] No active hospital found.');
    return;
  }

  const checkDoc = db.prepare("SELECT id FROM controlled_documents WHERE hospital_id = ? AND doc_code = ?");
  const insertDoc = db.prepare(`
    INSERT INTO controlled_documents (
      id, hospital_id, doc_type, title, doc_code, decree_text,
      prepared_date, last_review_date, issue_date, review_date,
      purpose, scope, legal_references, definitions, resources,
      related_staff, responsible_person, monitoring_method, work_method,
      related_documents, status, version_no, created_at, updated_at
    ) VALUES (
      ?, ?, 'procedure', ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, 'approved', 1, datetime('now'), datetime('now')
    )
  `);

  const checkChk = db.prepare("SELECT id FROM checklists WHERE hospital_id = ? AND checklist_code = ?");
  const insertChk = db.prepare(`
    INSERT INTO checklists (
      id, hospital_id, title, checklist_code, completion_type,
      purpose, status, cadence, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, 'online',
      ?, 'active', ?, datetime('now'), datetime('now')
    )
  `);

  const insertSignoff = db.prepare(`
    INSERT INTO document_signoffs (
      id, hospital_id, document_id, person_name, position, signoff_role, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let addedDocs = 0;
  let addedChks = 0;

  for (const h of hospitals) {
    for (const item of LEADERSHIP_SOPS) {
      // ۱. ثبت چک‌لیست نظارت
      const chkCode = item.code.replace('SOP', 'CHK');
      let chk = checkChk.get(h.id, chkCode);
      let chkId;
      if (!chk) {
        chkId = uuid();
        insertChk.run(
          chkId, h.id, `چک‌لیست ${item.title.replace('مدیریت ', '')}`,
          chkCode, `پایش و ممیزی ادواری منطبق بر سنجه‌های کتاب اعتباربخشی ملی`,
          item.cadence === 'ماهانه' ? 'monthly' : (item.cadence === 'فصلی' ? 'quarterly' : (item.cadence === 'سالانه' ? 'annual' : 'biannual'))
        );
        addedChks++;
      } else {
        chkId = chk.id;
      }

      // ۲. ثبت روش اجرایی SOP
      let doc = checkDoc.get(h.id, item.code);
      if (!doc) {
        const docId = uuid();
        const purpose = `هدف از تدوین این روش اجرایی، استانداردسازی فرآیند «${item.title}»، ارتقای ایمنی و انطباق کامل با سنجه‌های اعتباربخشی ملی وزارت بهداشت می‌باشد.`;
        const scope = `کلیه بخش‌های درمانی، پاراکلینیک، اداری و پشتیبانی مرتبط در بیمارستان.`;
        const legal_ref = `کتاب استانداردهای اعتباربخشی ملی بیمارستان‌های ایران (ویرایش پنجم) - محور ${item.section}`;
        const defs = `واژگان و اصطلاحات تخصصی مندرج در کتابچه تعاریف اعتباربخشی و سنجه‌های بالینی.`;
        const resources = `تجهیزات تخصصی، فرم‌ها و چک‌لیست‌های مدون، سامانه اطلاعات بیمارستانی (HIS) و پرونده پزشکی.`;
        const related_staff = `${item.measurer}، سرپرستاران بخش‌ها، پرسنل شیفت و مسئولین مربوطه.`;
        const responsible = item.monitor;
        const monitoring = `پایش مستمر بر اساس چک‌لیست‌های دوره‌ای (${item.cadence}) توسط ${item.monitor} و تحلیل در جلسات بهبود کیفیت.`;
        const work_method = `۱. ابلاغ الزامات و برگزاری دوره آموزشی برای پرسنل مرتبط.\n۲. تکمیل دقیق چک‌لیست دوره‌ای به صورت ${item.cadence} توسط ${item.measurer}.\n۳. ثبت نتایج در سامانه جامع و استخراج مغایرت‌ها.\n۴. تعریف اقدام اصلاحی فوری (CAPA) برای موارد عدم انطباق.\n۵. پایش اثربخشی اقدام اصلاحی و ارائه گزارش به تیم رهبری و مدیریت بیمارستان.`;
        const related_docs = `چک‌لیست شماره ${chkCode}، خط‌مشی مرتبط، کتاب سنجه‌های ملی.`;

        insertDoc.run(
          docId, h.id, `روش اجرایی "${item.title}"`, item.code, `حکم ابلاغی شماره ${item.code}/۱۴۰۵`,
          '2026-01-15', '2026-06-01', '2026-01-20', '2026-12-29',
          purpose, scope, legal_ref, defs, resources,
          related_staff, responsible, monitoring, work_method,
          related_docs
        );

        // افزودن امضاکنندگان استاندارد
        insertSignoff.run(uuid(), h.id, docId, item.measurer, 'تهیه‌کننده و تدوین‌کننده', 'preparer');
        insertSignoff.run(uuid(), h.id, docId, item.monitor, 'تأییدکننده فنی و عملیاتی', 'reviewer');
        insertSignoff.run(uuid(), h.id, docId, 'ریاست / مدیریت بیمارستان', 'تصویب و ابلاغ‌کننده', 'approver');

        addedDocs++;
      }
    }
  }

  console.log(`[Seed Leadership SOPs] Complete. Added ${addedDocs} SOPs and ${addedChks} Checklists.`);
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, LEADERSHIP_SOPS };
