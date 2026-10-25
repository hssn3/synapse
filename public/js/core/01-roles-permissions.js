/**
 * Core Roles & Permissions & Safe DOM Escaping
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
// ==================== سیناپس — متصل به بک‌اند ====================
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
  nursing_director: ['الف-1', 'الف-3', 'الف-4', 'ب-1', 'ب-2', 'ب-3', 'ب-4', 'ب-5', 'ب-9', 'ج-1', 'ج-2'],
  education_supervisor: ['الف-1', 'الف-3', 'الف-4', 'ب-1'],
  clinical_supervisor: ['ب-1', 'ب-2', 'ب-3', 'ب-8', 'ب-9'],
  infection_control_supervisor: ['الف-6', 'ب-1', 'ب-5'],
  infection_supervisor: ['الف-6', 'ب-1', 'ب-5'],
  head_nurse: ['ب-1', 'ب-2', 'الف-4'],
  breastfeeding_specialist: ['ب-4'], breastfeeding: ['ب-4'],

  // سایر نقش‌های پشتیبان
  safety_officer: ['الف-1', 'الف-8', 'ب-1'], env_health: ['الف-6', 'ج-1'], equipment: ['الف-7'],
  pharmacist: ['ب-6'], lab_manager: ['ب-8'], imaging_manager: ['ب-7'], blood_bank: ['ب-8'],
  social_worker: ['ج-1', 'ج-2'], him_officer: ['الف-5'], disaster_officer: ['الف-2'], hr_officer: ['الف-3'],

  // کادر بالینی پایه و گزارش‌دهنده
  staff_nurse: ['ب-1', 'ب-5'],
  anonymous_reporter: [],
};

// دامنه‌ی محورهای کاربر جاری. نکته‌ی امنیتی: پیش‌فرض «رد» است، نه «همه».
// پیش از این هر نقشی که در ROLE_AXES نبود (مثل infection_control_supervisor یا نقش‌های سفارشی)
// به دلیل fallback به '*' کل ۳۹۵ سنجه را می‌دید.
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
const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// jsArg: برای داده‌ای که داخل یک رشتهٔ JS در ویژگی onclick می‌نشیند.
// esc به‌تنهایی کافی نیست: مرورگر موجودیت‌های HTML را پیش از اجرای JS برمی‌گرداند،
// پس «&#39;» دوباره کوتیشن می‌شود و مقدار کاربر از رشته بیرون می‌زند. این‌جا اول
// backslash و کوتیشن برای JS فرار می‌کنند و بعد کل نتیجه برای HTML — دو لایهٔ امن.
const jsArg = v => esc(String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'"));
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

// ===== سیستم بصری v4 (زمرد و طلا، شیشه‌ای) =====
// تم روشن/تیره، شاینِ دنبال‌کننده‌ی نشانگر روی کارت‌های .g، پس‌زمینه‌ی زنده و کشوی
// تنظیمات — همه بصری محض؛ هیچ مسیر/داده/مجوزی اینجا لمس نمی‌شود.
// ترجیح‌ها در همان الگوی کلید فعلی سامانه (HOSP_KEY='p_last_hospital') ذخیره می‌شوند.
const PREF_KEY='p_visual_prefs';
function readPrefs(){ try{ return JSON.parse(localStorage.getItem(PREF_KEY)||'{}'); }catch(e){ return {}; } }
function writePrefs(patch){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(Object.assign(readPrefs(),patch))); }catch(e){} }
const FINE_POINTER = matchMedia('(hover:hover) and (pointer:fine)').matches;
const PREFERS_REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

function applyTheme(mode,save){
  // خواستهٔ صریح کارفرما: تمِ روشن حذف شد — همیشه «تیرهٔ کلاسیک» می‌مانیم و
  // دکمهٔ تغییر تم همیشه مخفی است. پارامتر mode فقط برای سازگاری امضا نگه داشته
  // شده و نادیده گرفته می‌شود؛ هیچ مسیری تمِ روشن را فعال نمی‌کند.
  document.documentElement.setAttribute('data-theme','dark');
  if(save) writePrefs({theme:'dark'});
  const btn=$('themeBtn'); if(btn){ btn.style.display='none';
    btn.setAttribute('aria-pressed','false');
    btn.setAttribute('aria-label','تغییر تم غیرفعال است'); }
}
function applyAnim(on,save){
  document.documentElement.setAttribute('data-anim', on?'on':'off');
  if(save) writePrefs({anim:on?'on':'off'});
  const t=$('sdAnimTgl'); if(t) t.setAttribute('aria-pressed',String(on));
  if(on) startBgFx(); else stopBgFx();
}
function applySnap(on,save){
  document.documentElement.setAttribute('data-snap', on?'on':'off');
  if(save) writePrefs({snap:on?'on':'off'});
  const t=$('sdSnapTgl'); if(t) t.setAttribute('aria-pressed',String(on));
}
function applyShineVar(v,save){ document.documentElement.style.setProperty('--shine-i',(v/100).toFixed(2));
  const o=$('sdShineOut'); if(o) o.textContent=fa(v)+'٪'; if(save) writePrefs({shine:v}); }
function applySpeedVar(v,save){ document.documentElement.style.setProperty('--bg-speed',(v/100).toFixed(2));
  const o=$('sdSpeedOut'); if(o) o.textContent=fa((v/100).toFixed(1))+'×'; if(save) writePrefs({speed:v}); }
function applyGlowVar(v,save){ document.documentElement.style.setProperty('--glow-i',(v/100).toFixed(2));
  const o=$('sdGlowOut'); if(o) o.textContent=fa(v)+'٪'; if(save) writePrefs({glow:v}); }
// اندازه‌ی فونت سراسری — پلکانی (نه دلخواه) تا چیدمان به‌هم نریزد؛ روی --fs-scale که
// html{font-size} از آن می‌خواند اعمال می‌شود، دقیقاً هم‌الگوی shine/speed/glow.
const FONT_STEPS=[{k:'sm',t:'کوچک',v:.9},{k:'md',t:'متوسط',v:1},{k:'lg',t:'بزرگ',v:1.12},{k:'xl',t:'خیلی بزرگ',v:1.26}];
function applyFontSizeVar(key,save){
  const st=FONT_STEPS.find(s=>s.k===key)||FONT_STEPS[1];
  document.documentElement.style.setProperty('--fs-scale', st.v);
  if(save) writePrefs({fontSize:st.k});
  document.querySelectorAll('.sd-fs-btn').forEach(b=>b.classList.toggle('on', b.dataset.k===st.k));
}

// سبک ارقام داده‌ای: 'latin' (پیش‌فرض) یا 'fa'. چون fa() در زمان رندر خوانده
// می‌شود، عوض‌کردنش فقط نیاز به یک رندر دوباره‌ی صفحه‌ی جاری دارد.
function applyNumerals(mode,save){
  NUM_STYLE = (mode==='latin') ? 'latin' : 'fa';
  if(save) writePrefs({numerals:NUM_STYLE});
  document.querySelectorAll('.sd-num-btn').forEach(b=>b.classList.toggle('on', b.dataset.n===NUM_STYLE));
  if(save && S && S.page && typeof go==='function') go(S.page); // رندر دوباره تا اعداد صفحه‌ی جاری با سبک تازه نوشته شوند
}


// شاینِ دنبال‌کننده‌ی نشانگر — یک شنونده‌ی سراسری روی document، نه per-card (سبک‌تر
// و خودکار روی کارت‌های تازه‌رندرشده هم کار می‌کند). فقط دستگاه‌های pointer:fine.
function ensureSheen(el){ if(!el.querySelector(':scope > .sheen')){
  const s=document.createElement('span'); s.className='sheen'; s.setAttribute('aria-hidden','true'); el.appendChild(s); } }
if(FINE_POINTER){
  document.addEventListener('pointermove', e=>{
    const c = e.target.closest && e.target.closest('.g'); if(!c) return;
    ensureSheen(c);
    const r=c.getBoundingClientRect();
    c.style.setProperty('--mx', (((e.clientX-r.left)/r.width)*100).toFixed(1)+'%');
    c.style.setProperty('--my', (((e.clientY-r.top)/r.height)*100).toFixed(1)+'%');
  },{passive:true});
  document.addEventListener('pointerout', e=>{
    const c = e.target.closest && e.target.closest('.g'); if(!c || (e.relatedTarget && c.contains(e.relatedTarget))) return;
    c.style.setProperty('--mx','50%'); c.style.setProperty('--my','0%');
  },{passive:true});
}

// پس‌زمینه‌ی زنده (بخش ۵ مگاپرامپت) — لایه‌های CSS همیشه سبک‌اند و یک‌بار به body
// اضافه می‌شوند؛ فقط ذرات canvas سنگین‌اند و طبق بودجه‌ی موبایل (بخش ۹) تنبل/مشروط بارگذاری می‌شوند.
let BGFX_CANVAS_API=null;
function injectBgFx(){
  if($('bgfxRoot')) return;
  const wrap=document.createElement('div'); wrap.id='bgfxRoot'; wrap.setAttribute('aria-hidden','true');
  wrap.innerHTML=`
    <div class="bgfx-bg"></div><div class="bgfx-grid"></div><div class="bgfx-aurora"></div>
    <div class="bgfx-beam"></div><div class="bgfx-beam b2"></div>
    <div class="bgfx-orb a"></div><div class="bgfx-orb b"></div><div class="bgfx-orb c"></div>
    <canvas id="bgfx-fx"></canvas>`;
  document.body.insertBefore(wrap, document.body.firstChild);
  if(animOn()) startBgFx();
}
function animOn(){ return document.documentElement.getAttribute('data-anim')!=='off'; }
function initBgFxCanvas(){
  if(BGFX_CANVAS_API) return BGFX_CANVAS_API;
  const cv=$('bgfx-fx'); if(!cv) return null;
  const ctx=cv.getContext('2d',{alpha:true}); let dots=[],raf=null,running=false;
  const isCoarse = !FINE_POINTER;
  function size(){
    const d=Math.min(devicePixelRatio||1, isCoarse?1.5:2);
    cv.width=innerWidth*d; cv.height=innerHeight*d; cv.style.width=innerWidth+'px'; cv.style.height=innerHeight+'px';
    ctx.setTransform(d,0,0,d,0,0);
    const n=Math.round(Math.min(isCoarse?36:80, innerWidth/(isCoarse?26:16)));
    dots=Array.from({length:n},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,
      r:Math.random()*1.6+.4,vx:(Math.random()-.5)*.16,vy:-(Math.random()*.25+.05),a:Math.random()*.5+.15,g:Math.random()>.6}));
  }
  function loop(){
    const sp=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bg-speed'))||1;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for(const p of dots){
      p.x+=p.vx*sp; p.y+=p.vy*sp;
      if(p.y<-10){p.y=innerHeight+10;p.x=Math.random()*innerWidth}
      if(p.x<-10)p.x=innerWidth+10; if(p.x>innerWidth+10)p.x=-10;
      ctx.beginPath(); ctx.fillStyle=p.g?`rgba(231,205,134,${p.a})`:`rgba(52,211,153,${p.a*.8})`;
      ctx.arc(p.x,p.y,p.r,0,6.283); ctx.fill();
    }
    raf=requestAnimationFrame(loop);
  }
  let rt;
  addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(running){ size(); } },200); },{passive:true});
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) BGFX_CANVAS_API.stop(); else if(animOn()) BGFX_CANVAS_API.start(); });
  BGFX_CANVAS_API={ start(){ if(running) return; running=true; size(); loop(); },
    stop(){ running=false; if(raf) cancelAnimationFrame(raf); raf=null; ctx.clearRect(0,0,innerWidth,innerHeight); },
    get running(){ return running; } };
  return BGFX_CANVAS_API;
}
function startBgFx(){
  const idle = window.requestIdleCallback || (fn=>setTimeout(fn,1));
  idle(()=>{
    if(!animOn() || FINE_POINTER===false && innerWidth<720) {} // نگه‌داشته می‌شود، شرط اصلی زیر است
    if(!animOn() || innerWidth<=720 && !FINE_POINTER) return;
    if((navigator.hardwareConcurrency||4) <= 3) return;
    const api=initBgFxCanvas(); if(api) api.start();
  });
}
function stopBgFx(){ if(BGFX_CANVAS_API) BGFX_CANVAS_API.stop(); }

// دکل شناور واحد پایین-چپ — طبق درخواست کاربر، به‌جای چند دکمه‌ی پراکنده روی صفحه،
// یک ستون واحد: از بالا به پایین «دستیار راهنما» (طلایی، مهم‌ترین)، «تنظیمات نمایش»
// (پالت) و «خانه». چون position:fixed روی خودِ دکل با flex-direction:column است،
// اولین فرزندِ اضافه‌شده بالای ستون می‌نشیند — پس ترتیب append دقیقاً همان ترتیب
// بصری خواسته‌شده را می‌سازد.
function ensureFloatDock(){
  let dock=$('floatDock');
  if(!dock){
    dock=document.createElement('div'); dock.className='floatdock'; dock.id='floatDock'; 
    document.body.appendChild(dock);
  }
  return dock;
}
// دکمه‌ی دوم دکل: «منو» — با کلیک باز می‌شود و سه گزینه‌ی خانه/پروفایل/تنظیمات
// ظاهری را به‌شکل آیتم‌های داخل یک پاپ‌آور نشان می‌دهد (نه سه دکمه‌ی همیشه‌نمایان).
function injectDockMenuBtn(){
  if($('dockMenuBtn')) return;
  const dock=ensureFloatDock();
  const b=document.createElement('button'); b.type='button'; b.className='dock-btn'; b.id='dockMenuBtn';
  b.setAttribute('aria-label','منو'); b.title='منو'; b.setAttribute('aria-expanded','false'); b.setAttribute('aria-controls','dockMenuPop');
  b.innerHTML=ic('menu','lg');
  const pop=document.createElement('div'); pop.className='dockmenu'; pop.id='dockMenuPop'; pop.setAttribute('role','menu');
  pop.innerHTML=`
    <button type="button" class="dockmenu-item" role="menuitem" id="dockMenuHome"><span class="ic" aria-hidden="true">`+ic('home')+`</span>خانه</button>
    <button type="button" class="dockmenu-item" role="menuitem" id="dockMenuProfile"><span class="ic" aria-hidden="true">`+ic('user')+`</span>پروفایل</button>
    <button type="button" class="dockmenu-item" role="menuitem" id="dockMenuAppearance">
      <svg class="ic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.03 2 11c0 3.87 3.13 6.5 7 6.5h1.2c.6 0 1.1.5 1.1 1.1 0 .3-.12.56-.32.77-.35.36-.58.85-.58 1.4 0 1.1 1 1.2 1.6 1.2 5.02 0 9-4.48 9-10C21 6.03 16.52 2 12 2Zm-5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/>
      </svg>تنظیمات ظاهری</button>`;
  function openMenu(o){ pop.classList.toggle('open',o); b.setAttribute('aria-expanded',String(o)); }
  b.addEventListener('click',(e)=>{ e.stopPropagation(); openMenu(!pop.classList.contains('open')); });
  document.addEventListener('click',e=>{ if(pop.classList.contains('open') && !pop.contains(e.target) && !b.contains(e.target)) openMenu(false); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && pop.classList.contains('open')){ openMenu(false); b.focus(); } });
  pop.querySelector('#dockMenuHome').addEventListener('click',()=>{ openMenu(false); goHome(); });
  pop.querySelector('#dockMenuProfile').addEventListener('click',()=>{ openMenu(false); go('profile'); });
  pop.querySelector('#dockMenuAppearance').addEventListener('click',()=>{ openMenu(false); if(window.toggleSettDrawer) window.toggleSettDrawer(true); });
  dock.appendChild(b); dock.appendChild(pop); // آخرین append شده → پایین ستون، زیر دکمه‌ی راهنما
}
