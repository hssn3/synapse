/**
 * Core Roles & Permissions
 * Modular Frontend Component — Project 313
 */
// ==================== سامانه جامع اعتباربخشی — متصل به بک‌اند ====================
// کدهای این جدول باید دقیقاً با کد نقش‌های واقعیِ جدول roles یکی باشند — وگرنه
// ستون «مسئول سنجه» به سمتی اشاره می‌کند که هیچ کاربری در سامانه نمی‌تواند آن را
// داشته باشد (دقیقاً همان اشکالی که database/migrate-roles.js داشت و اصلاح شد).
const ROLE_FA = {
  admin:'مدیر داخلی', hospital_president:'ریاست بیمارستان', accreditation_manager:'مدیر اعتباربخشی',
  quality_control_manager:'مدیر بهبود کیفیت', nursing_director:'مدیر پرستاری (مترون)',
  education_supervisor:'سوپروایزر آموزشی', clinical_supervisor:'سوپروایزر بالینی',
  infection_control_supervisor:'سوپروایزر کنترل عفونت', breastfeeding_specialist:'کارشناس شیر مادر',
  technical_officer:'مسئول فنی', environmental_health_officer:'کارشناس بهداشت محیط',
  hr_manager:'مدیر منابع انسانی', financial_manager:'مدیر مالی', accounting_manager:'مدیر حسابداری',
  nutrition_manager:'مدیر تغذیه', occupational_health_officer:'مسئول بهداشت حرفه‌ای',
  nursing_office_assistant:'مسئول دفتر پرستاری', staff_nurse:'پرستار', anonymous_reporter:'گزارش‌دهنده ناشناس',
};

// برچسب فارسی هر مجوز + ماژولی که به آن تعلق دارد — برای فرم ساخت/ویرایش نقش سفارشی.
// کلیدها باید دقیقاً با رشته‌های permissions در جدول roles یکی باشند.
const PERM_GROUPS = [
  ['مدارک و مستندات', [
    ['manage_documents','مدیریت مدارک (خط‌مشی، روش اجرایی، دستورالعمل)'],
    ['view_documents','مشاهده مدارک'],
    ['upload_evidence_file','بارگذاری فایل مستند/شواهد'],
    ['manage_letterhead_signature','مدیریت سربرگ و امضای رسمی'],
  ]],
  ['چک‌لیست‌ها و سنجه‌های اعتباربخشی', [
    ['manage_checklists','مدیریت چک‌لیست‌ها'],
    ['submit_checklists','تکمیل و ثبت چک‌لیست'],
    ['edit_measure_status','ثبت و ویرایش وضعیت سنجه'],
    ['approve_measure_status','تأیید نهایی وضعیت سنجه'],
    ['view_measure_status_readonly','مشاهده وضعیت سنجه‌ها (فقط خواندن)'],
    ['view_accreditation_full_tree','مشاهده کل درخت اعتباربخشی'],
  ]],
  ['کمیته‌ها', [
    ['manage_committees','مدیریت کمیته‌ها و اعضا'],
    ['create_committee_minutes','ثبت صورت‌جلسه کمیته'],
    ['view_committee_minutes','مشاهده صورت‌جلسه‌ها'],
  ]],
  ['کاربران، نقش‌ها و تنظیمات', [
    ['manage_users','مدیریت کاربران'],
    ['manage_roles','مدیریت نقش‌ها و سطوح دسترسی'],
    ['manage_hospital_settings','تنظیمات بیمارستان'],
    ['view_audit_log','مشاهده لاگ فعالیت‌ها'],
    ['view_confidential_records','مشاهده رکوردهای محرمانه'],
  ]],
  ['FMEA و تحلیل خطر', [
    ['manage_fmea','مدیریت تحلیل FMEA'],
    ['submit_fmea','ثبت تحلیل FMEA'],
  ]],
  ['ممیزی داخلی', [
    ['manage_audits','مدیریت ممیزی‌های داخلی'],
    ['view_audits','مشاهده ممیزی‌های داخلی'],
  ]],
  ['فرآیندها و فلوچارت‌ها', [
    ['manage_processes','مدیریت رجیستری فرآیندها'],
    ['view_processes','مشاهده فرآیندها و فلوچارت‌ها'],
  ]],
  ['بازدید میدانی مدیریتی (واکراند)', [
    ['manage_walkarounds','مدیریت بازدیدهای میدانی و مصوبه‌ها'],
    ['view_walkarounds','مشاهده بازدیدهای میدانی'],
  ]],
  ['برنامه‌های بهبود', [
    ['approve_programs','تأیید یا رد برنامه‌های پیشنهادی'],
    ['view_programs','مشاهده برنامه‌ها'],
  ]],
  ['نیازسنجی آموزشی', [
    ['review_training_needs','بررسی نیازهای آموزشی همکاران به‌عنوان مافوق'],
    ['approve_training','تأیید نهایی نیازهای آموزشی (دفتر آموزش سازمان)'],
    ['view_training','مشاهده نیازسنجی آموزشی'],
  ]],
  ['کارت امتیازی متوازن (BSC)', [
    ['manage_bsc','ثبت مقادیر ماهانه و تنظیم شاخص‌های BSC'],
    ['view_bsc','مشاهده کارت امتیازی'],
  ]],
  ['ساختار سازمانی', [
    ['manage_org_structure','مدیریت واحدها، گروه‌های شغلی، پست‌ها و ساختمان‌ها'],
    ['view_org_structure','مشاهده ساختار سازمانی'],
    ['manage_org_divisions','تعیین رئیس حوزه‌های مدیریت/پرستاری/پشتیبانی'],
  ]],
  ['نشان‌ها و گواهینامه‌ها', [
    ['manage_certifications','مدیریت نشان‌ها و گواهینامه‌ها'],
    ['view_certifications','مشاهده نشان‌ها و گواهینامه‌ها'],
  ]],
  ['مدیریت دارویی', [
    ['manage_pharmacy','مدیریت فرمولاری، فراخوان، انهدام، عوارض دارویی و پایش دما'],
    ['view_pharmacy','مشاهده مدیریت دارویی'],
  ]],
  ['مدیریت خطر حوادث و بلایا', [
    ['manage_disaster','مدیریت ارزیابی ایمنی، مخاطرات، مانورها و حوادث'],
    ['view_disaster','مشاهده مدیریت خطر حوادث و بلایا'],
  ]],
  ['پیشگیری و کنترل عفونت', [
    ['manage_infection','مدیریت استریلیزاسیون، بهداشت دست، عفونت بیمارستانی و آنتی‌بیوگرام'],
    ['view_infection','مشاهده پیشگیری و کنترل عفونت'],
    ['manage_blood','مدیریت طب انتقال خون و هموویژیلانس'],
    ['view_blood','مشاهده طب انتقال خون'],
    ['manage_lab','مدیریت خدمات آزمایشگاه'],
    ['view_lab','مشاهده خدمات آزمایشگاه'],
    ['manage_imaging','مدیریت تصویربرداری و ایمنی پرتو'],
    ['view_imaging','مشاهده تصویربرداری و ایمنی پرتو'],
  ]],
  ['اقلام و نگهداشت دوره‌ای', [
    ['manage_facility_assets','مدیریت اقلام، برنامه‌ی دوره‌ای و ثبت سوابق نگهداشت'],
    ['view_facility_assets','مشاهده اقلام و سوابق نگهداشت'],
  ]],
  ['کتابخانه منابع', [
    ['manage_library','مدیریت کتابخانه منابع'],
    ['view_library','مشاهده کتابخانه منابع'],
  ]],
  ['گزارش خطا، شکایات و پیشنهادها', [
    ['manage_medical_error_reports','مدیریت گزارش‌های خطای پزشکی'],
    ['submit_medical_error_report','ثبت گزارش خطای پزشکی'],
    ['manage_patient_complaints','رسیدگی به شکایات گیرنده خدمت'],
    ['submit_patient_complaint_suggestion','ثبت شکایت/پیشنهاد گیرنده خدمت'],
    ['review_staff_suggestions','بررسی پیشنهادهای کارکنان'],
    ['submit_staff_suggestion','ثبت پیشنهاد کارکنان'],
    ['submit_nursing_shift_report','ثبت گزارش شیفت پرستاری'],
    ['view_nursing_shift_reports','مشاهده گزارش‌های شیفت پرستاری'],
  ]],
  ['ثبت فعالیت‌ها', [
    ['manage_activity_types','مدیریت انواع فعالیت و فرم‌ها'],
    ['manage_activity_measure_mapping','نگاشت فعالیت به سنجه'],
    ['submit_activity_record','ثبت فعالیت'],
    ['approve_activity_record','تأیید فعالیت ثبت‌شده'],
    ['view_all_activity_records','مشاهده همه فعالیت‌ها'],
    ['view_own_activity_records','مشاهده فعالیت‌های خود'],
  ]],
  ['تقویم و کارتابل', [
    ['manage_calendar_events','مدیریت رویدادهای تقویم'],
    ['view_calendar','مشاهده تقویم'],
    ['assign_tasks','ارجاع وظیفه به کاربران'],
    ['view_all_tasks','مشاهده همه وظایف'],
    ['view_own_tasks','مشاهده وظایف خود'],
  ]],
  ['داشبورد و گزارش‌ها', [
    ['view_all_dashboards','مشاهده همه داشبوردها'],
    ['view_own_dashboard','مشاهده داشبورد خود'],
    ['view_staff_performance_dashboard','داشبورد عملکرد کارکنان'],
    ['export_reports','خروجی گرفتن از گزارش‌ها'],
  ]],
];
const PERM_FA = {};
PERM_GROUPS.forEach(([, list]) => list.forEach(([k, v]) => { PERM_FA[k] = v; }));

// محورهایی که هر نقش مسئول آن است (برای فیلتر نمایش)
// اصل حاکم: فهرست محورهای هر نقش باید *دربرگیرنده* همه‌ی محورهایی باشد که
// سنجه‌های آن‌ها در ستون accreditation_sections.responsible_role به همان نقش نسبت داده شده‌اند.
// (responsible_role فقط برای نمایش ستون «مسئول» به کار می‌رود؛ فیلتر دسترسی در سطح محور است.)
const ROLE_AXES = {
  // نقش‌های با دید کامل (دارای مجوز view_all_dashboards و نظارت کلان)
  admin: '*', hospital_admin: '*', quality_manager: '*', quality_control_manager: '*',
  hospital_president: '*', accreditation_manager: '*',

  // پست‌های تخصصی و مدیریتی سازمانی — منطبق بر کتاب سنجه‌های ملی
  technical_officer: ['الف-6', 'الف-7', 'ب-1', 'ب-3', 'ب-6', 'ب-7', 'ب-8'],
  hr_manager: ['الف-3'],
  occupational_health_officer: ['الف-2', 'الف-3'],
  environmental_health_officer: ['الف-6', 'ج-1'],
  nutrition_manager: ['ب-1'],
  financial_manager: ['الف-1'],
  accounting_manager: ['الف-1'],

  // کادر عالی و سرپرستی پرستاری
  nursing_director: ['الف-1', 'الف-3', 'الف-4', 'ب-1', 'ب-2', 'ب-3', 'ب-4', 'ب-5', 'ب-10', 'ج-1', 'ج-2'],
  education_supervisor: ['الف-1', 'الف-3', 'الف-4', 'ب-1'],
  clinical_supervisor: ['ب-1', 'ب-2', 'ب-3', 'ب-9', 'ب-10'],
  infection_control_supervisor: ['الف-6', 'ب-1', 'ب-5'],
  infection_supervisor: ['الف-6', 'ب-1', 'ب-5'],
  head_nurse: ['ب-1', 'ب-2', 'الف-4'],
  breastfeeding_specialist: ['ب-4'], breastfeeding: ['ب-4'],

  // سایر نقش‌های پشتیبان
  safety_officer: ['الف-1', 'الف-8', 'ب-1'], env_health: ['الف-6', 'ج-1'], equipment: ['الف-7'],
  pharmacist: ['ب-6'], lab_manager: ['ب-8'], imaging_manager: ['ب-7'], blood_bank: ['ب-9'],
  social_worker: ['ج-1', 'ج-2'], him_officer: ['الف-5'], disaster_officer: ['الف-2'], hr_officer: ['الف-3'],

  // کادر بالینی پایه و گزارش‌دهنده
  staff_nurse: ['ب-1', 'ب-5'],
  anonymous_reporter: [],
};

// دامنه‌ی محورهای کاربر جاری. نکته‌ی امنیتی: پیش‌فرض «رد» است، نه «همه».
// پیش از این هر نقشی که در ROLE_AXES نبود (مثل infection_control_supervisor یا نقش‌های سفارشی)
// به دلیل fallback به '*' کل ۵۲۰ سنجه را می‌دید.
function roleScope(){
  const u = S.user || {};
  const sc = ROLE_AXES[u.role_code] ?? ROLE_AXES[u.role];
  if (sc !== undefined) return sc;
  return (u.permissions || []).includes('view_all_dashboards') ? '*' : [];
}

// ---------- utils ----------
const FA='۰۱۲۳۴۵۶۷۸۹';
// سبک ارقام. یک دور رفت‌وبرگشت داشت: اول لاتین شد چون ارقام فارسیِ وزیرمتن
// عرض یکسان ندارند و در نشان‌های ریز بد می‌نشینند، ولی کاربر بعداً «عدد انگلیسی
// روی دستیار» را به‌عنوان ایراد گزارش کرد. پس پیش‌فرض به فارسی برگشت — همان
// چیزی که کاربرِ فارسی‌زبان انتظار دارد — و مشکلِ ترازِ ارقام از راه درستش
// حل می‌شود، یعنی tabular-nums در design-system.css نه عوض‌کردن رقم.
// گزینه‌ی لاتین در کشوی «تنظیمات نمایش» می‌ماند.
let NUM_STYLE = (()=>{ try{
  return JSON.parse(localStorage.getItem('p_visual_prefs')||'{}').numerals || 'fa';
}catch(e){ return 'fa'; } })();
const faDigits = n => String(n).replace(/[0-9]/g, d => FA[+d]);
const fa = n => NUM_STYLE==='fa' ? faDigits(n) : String(n);
const esc = s => String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// متنِ آزادِ آمده از پایگاه داده اغلب رقم لاتین دارد («دوره‌ی ارزیابی سال 1405») و
// کنار تاریخ‌های فارسیِ سامانه ناجور می‌نشیند. escn همان esc است به‌علاوه‌ی تبدیل
// رقم طبق ترجیح کاربر. عمداً داخل خودِ esc نرفت: esc روی شناسه/UUID هم صدا زده
// می‌شود و تبدیل رقمِ یک UUID آن را نابود می‌کند.
const escn = s => fa(esc(s));
const $ = id => document.getElementById(id);

// ---------- یکدست‌سازی ارقام در خروجیِ رندرشده ----------
//
// خواسته‌ی کارفرما: «هیچ‌جا عدد انگلیسی نباشد». escn ِ بالا ابزارش را دارد ولی
// فقط در پنج جا از چند صد جای رندر صدا زده می‌شد، و بازبینیِ تک‌تکِ آن‌ها هم
// شکننده است: کافی است یک نفر فردا یک جدولِ تازه اضافه کند و escn یادش برود.
//
// این پاس همان قاعده را ساختاری می‌کند. فقط *گره‌های متنی* را عوض می‌کند، پس
// همان مرزی را رعایت می‌کند که کامنتِ escn توضیح داده: شناسه و UUID و مسیر در
// *صفت*‌ها می‌نشینند (value، onclick، href، data-*) و این پاس اصلاً به صفت دست
// نمی‌زند. بنابراین «الف-۱-۶-۵» روی صفحه فارسی دیده می‌شود درحالی‌که همان کد در
// onclick="selAxis('الف-1-6-5')" دست‌نخورده و قابلِ جست‌وجو می‌ماند.
//
// اگر جایی واقعاً باید لاتین بماند (مثلاً شناسه‌ای که کاربر باید کپی کند)، صفتِ
// data-latin روی خودش یا هر والدش کافی است.
const NUM_SKIP_TAGS = new Set(['SCRIPT','STYLE','INPUT','TEXTAREA','OPTION']);
let numPassBusy = false;
function faDigitsPass(root){
  if(NUM_STYLE!=='fa' || !root || numPassBusy) return;
  numPassBusy = true;
  try{
    const hits=[];
    const w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if(!/[0-9]/.test(n.nodeValue||'')) return NodeFilter.FILTER_REJECT;
        const el=n.parentElement;
        if(!el || NUM_SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
        // closest روی عنصرِ SVG هم هست، ولی روی گره‌ی متنی نه — از والد می‌پرسیم.
        if(el.closest && el.closest('[data-latin]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n; while((n=w.nextNode())) hits.push(n);
    for(const t of hits) t.nodeValue = faDigits(t.nodeValue);
  } finally { numPassBusy = false; }
}
// رندرها فقط از go() نمی‌آیند؛ بارگذاریِ ناهمگام و رسمِ دوباره‌ی جدول‌ها هم
// #content را عوض می‌کنند. ناظرِ تغییرات همه را می‌گیرد، به‌جای اینکه در ده جا
// دستی صدا زده شود و یازدهمی جا بماند.
// روی body، نه فقط #content: نوارِ مسیر، منوی کناری، پنجره‌های شناور و برگه‌ی
// چاپ همه بیرونِ #content رندر می‌شوند.
function startNumObserver(){
  const root=document.body;
  if(!root || !window.MutationObserver) return;
  faDigitsPass(root);
  new MutationObserver(muts=>{
    if(numPassBusy) return;
    for(const m of muts){
      if(m.type==='childList'){ for(const nd of m.addedNodes) faDigitsPass(nd.nodeType===1?nd:nd.parentElement); }
      else if(m.type==='characterData') faDigitsPass(m.target.parentElement);
    }
  }).observe(root, {childList:true, subtree:true, characterData:true});
}

