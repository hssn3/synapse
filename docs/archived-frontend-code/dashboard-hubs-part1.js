/**
 * Dashboard Hubs Part 1
 * Modular Frontend Component — Project 313
 */
// ===== Render wrappers for CRM & Clinical Safety (RPG-based modules) =====
// این wrapper‌ها tab مناسب را قبل از فراخوانی موتور RPG ست می‌کنند.
// ماژول crm.js با key='crm' و clinical-safety.js با key='safety' تعریف شده‌اند.
function renderCrm() {
  if (typeof RPG !== 'undefined' && RPG.mods && RPG.mods['crm']) {
    RPG.st['crm'].tab = 'dash';
    RPG.render('crm');
  } else {
    $('content').innerHTML = '<div class="panel g"><div class="pbody">ماژول CRM در حال بارگذاری...</div></div>';
  }
}
function renderSafeSurgery() {
  if (typeof RPG !== 'undefined' && RPG.mods && RPG.mods['safety']) {
    RPG.st['safety'].tab = 'safesurgery';
    RPG.render('safety');
  } else {
    $('content').innerHTML = '<div class="panel g"><div class="pbody">ماژول ایمنی بالینی در حال بارگذاری...</div></div>';
  }
}
function renderMedRecon() {
  if (typeof RPG !== 'undefined' && RPG.mods && RPG.mods['safety']) {
    RPG.st['safety'].tab = 'medrecon';
    RPG.render('safety');
  } else {
    $('content').innerHTML = '<div class="panel g"><div class="pbody">ماژول تلفیق دارویی در حال بارگذاری...</div></div>';
  }
}
function renderWasteLog() {
  if (typeof RPG !== 'undefined' && RPG.mods && RPG.mods['safety']) {
    RPG.st['safety'].tab = 'waste';
    RPG.render('safety');
  } else {
    $('content').innerHTML = '<div class="panel g"><div class="pbody">ماژول پسماند پزشکی در حال بارگذاری...</div></div>';
  }
}

// ==================== TREE ====================
function renderTree(){
  const mine=myAxes(); const bySec={};
  mine.forEach(({sec,ax})=>{ (bySec[sec.code]=bySec[sec.code]||{sec,list:[]}).list.push(ax); });
  let h='';
  for(const [code,{sec,list}] of Object.entries(bySec)){
    const tot=list.reduce((a,x)=>a+x.measures.length,0);
    const open=S.openSec===code;
    h+=`<div class="sec">
      <div class="sechd ${open?'on':''}" onclick="toggleSec('${code}')">
        <div class="secl">${code}</div><div class="sect">${esc(sec.title)}</div>
        <span class="cnt">${fa(tot)}</span><span class="chev">◂</span></div>
      <div class="axl ${open?'on':''}">
        ${list.map(ax=>{
          const done=ax.measures.filter(m=>S.statusMap[m.id]==='full_compliant').length;
          return `<div class="axi ${S.axis===ax.code?'on':''}" onclick="selAxis('${ax.code}')">
            <span class="anm">${esc(ax.title)}</span><span class="cnt">${fa(done)}/${fa(ax.measures.length)}</span></div>`;
        }).join('')}
      </div></div>`;
  }
  const tv=$('tree'); if(!tv) return;   // سایدبار ممکن است درخت نداشته باشد
  tv.innerHTML=h||'<div class="empty">محوری در دسترس شما نیست</div>';
}
function toggleSec(c){ S.openSec = S.openSec===c?null:c; renderTree(); }
// ورود به یک محور. از سه جا صدا زده می‌شود: درخت ناوبری، کارت‌های «محورهای من» در
// راهنمای نقش، و کارت‌های صفحه‌ی اصلی. چون ممکن است از بیرونِ درخت بیاید، بخشِ والدِ
// همان محور را هم در درخت باز می‌کند تا کاربر جای خودش را در سلسله‌مراتب ببیند.
function selAxis(c){
  S.axis=c; S.page='measures'; S.accDepth=2;
  const owner=S.sections.find(sec=>(sec.axes||[]).some(a=>a.code===c));
  if(owner) S.openSec=owner.code;
  renderTree();
  document.querySelectorAll('.nitem[data-p]').forEach(n=>n.classList.toggle('on', n.dataset.p==='measures'));
  renderMeasures();
  try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); }
}

// ==================== STATS ====================
const statusOf = id => S.statusMap[id]||'not_reviewed';
// «غیرقابل ارزیابی» نه در صورت کسر می‌آید و نه در مخرج — دقیقاً مثل فرایند
// رسمی که این سنجه‌ها را در مرحله‌ی خوداظهاری از فهرست مرکز بیرون می‌گذارد.
// اگر در مخرج بماند، بیمارستانِ بدون بخش دیالیز برای نداشتنِ چیزی که ندارد
// جریمه می‌شود.
function calc(list){
  let f=0,p=0,n=0,u=0,na=0,sfT=0,sfF=0,wT=0,wE=0;
  list.forEach(m=>{
    const s=statusOf(m.id), sf=!!m.patient_safety_flag;
    // وزن = ضریب ایمنی بیمار × ضریب سطح سنجه. ضریب سطح از تنظیمات پلتفرم
    // می‌آید و پیش‌فرضش ۱ است، پس تا وقتی سوپرادمین عوضش نکند رفتار همان
    // چیزی است که بوده.
    const w=(sf?2:1)*(+(S.levelW||{})[m.measure_level||1]||1);
    if(s==='not_applicable'){ na++; return; }
    wT+=w;
    if(s==='full_compliant'){f++;wE+=w;} else if(s==='partial'){p++;wE+=w*0.5;}
    else if(s==='non_compliant'){n++;} else u++;
    if(sf){ sfT++; if(s==='full_compliant') sfF++; }
  });
  const scored=list.length-na;
  return {total:scored,all:list.length,f,p,n,u,na,sfT,sfF,
          pct:scored?Math.round(f/scored*100):0, wpct:wT?Math.round(wE/wT*100):0};
}

// ==================== DASHBOARD ====================
function dashMoreOpen(){ return localStorage.getItem('dash_more')==='1'; }
function toggleDashMore(){
  const open=!dashMoreOpen();
  localStorage.setItem('dash_more',open?'1':'0');
  const el=$('dashMore'); if(el) el.classList.toggle('hide',!open);
  const b=$('dashMoreBtn'); if(b) b.innerHTML=open?'پنهان‌کردن جزئیات ▴':'نمایش جزئیات بیشتر ▾';
}
// ==================== دو صفحه‌ی اصلی (هاب) ====================
// جایگزین منوی ۲۹‌مدخلی. هر کارت یک کارِ واقعی است و مستقیم همان صفحه را باز می‌کند.

let HUB_CARDS = { accreditation:[], quality:[], org:[] };

// نگاشت «هر صفحه زیر کدام تب است» — برای روشن‌ماندن تب فعال و دکمه‌ی بازگشت
const HUB_OF = {
  measures:'acc', reviewgaps:'acc', doccodes:'acc', documents:'acc',
  checklists:'acc', audits:'acc', walkarounds:'acc', errors:'acc', fmea:'acc',
  satisfaction:'acc', followup:'acc', committees:'acc', bsc:'acc', indicators:'acc', programs:'acc', processes:'acc',
  orgchart:'acc', orgstructure:'acc', nursing:'acc', support:'acc', management:'acc',
  training:'acc', reports:'acc', users:'acc', settings:'acc', tenures:'acc',
  dash:'duties', inbox:'duties', messages:'duties', activities:'duties',
  calendar:'duties', guide:'duties', profile:'duties', headnurse:'duties', staffshift:'acc', assets:'acc', pharmacy:'acc', disaster:'acc', infection:'acc', blood:'acc', lab:'acc', imaging:'acc', knowledge:'acc', occhealth:'acc', hrdev:'acc', vendors:'acc', nsupervision:'acc', finance:'acc', patientfocus:'acc', education:'acc', shiftatt:'acc',
  // ماژول‌های CRM و ایمنی بالینی — اضافه‌شده در فاز CRM (بیمارستان ۲)
  crm:'acc', safesurgery:'acc', medrecon:'acc', waste:'acc',
  // هاب‌های تخصصی فرآیندی اعتباربخشی (Rule 11)
  patientrights:'acc', maternal:'acc', outpatient:'acc',
};

// ---------- دسته‌بندی صفحه‌ها (منبعِ واحد) ----------
//
// کارفرما گفت: «بالای صفحه مثلاً خط‌مشی هست، معلوم نیست جزو کدام دسته است.»
// حق داشت — بعد از تخت‌شدنِ منو به دو تب، هیچ‌جا نوشته نبود یک صفحه زیرِ کدام
// حوزه است؛ نه بالای خودِ صفحه، نه روی کارت‌های صفحه‌ی اعتباربخشی.
//
// این نگاشت تنها منبعِ آن دسته‌بندی است و دو جا مصرف می‌شود: نوارِ مسیرِ بالای
// هر صفحه (pageCrumbs) و گروه‌بندیِ کارت‌های صفحه‌ی اعتباربخشی. یک منبع، تا
// اگر روزی صفحه‌ای جابه‌جا شد، در هر دو جا هم‌زمان درست شود.
//
// نامِ دسته‌ها از خودِ کتاب استاندارد آمده، نه از سلیقه‌ی ما: «رهبری و مدیریت»،
// «مراقبت و ایمنی بیمار» و… همان عنوان‌هایی است که کاربرِ اعتباربخشی هر روز
// می‌بیند، پس بدون توضیح می‌فهمدشان.
const PAGE_CATS = [
  { k:'assess', t:'سنجه‌ها و خودارزیابی', pages:['measures','reviewgaps'] },
  { k:'clinical_hubs', t:'هاب‌های فرآیندی بالینی و حقوق بیمار', pages:['patientrights','maternal','outpatient'] },
  { k:'lead',   t:'رهبری و مدیریت',        pages:['committees','programs','walkarounds','reports','users','settings','vendors','finance','patientfocus'] },
  { k:'docs',   t:'مدارک و فرآیندها',      pages:['documents','doccodes','processes','knowledge'] },
  { k:'qual',   t:'کیفیت، ایمنی و پایش',   pages:['indicators','bsc','checklists','audits','errors','fmea','satisfaction','followup','assets','pharmacy','disaster','infection','blood','lab','imaging'] },
  { k:'hr',     t:'ساختار سازمانی و کارکنان', pages:['orgchart','orgstructure','nursing','support','management','tenures','training','headnurse','staffshift','shiftatt','hrdev','education','nsupervision','occhealth'] },
  { k:'plan',   t:'برنامه و فعالیت روزانه', pages:['calendar','activities'] },
  // ماژول‌های CRM بیمارستانی و ایمنی بالینی — فاز CRM
  { k:'crm_safety', t:'مدیریت بیمار، CRM و ایمنی بالینی', pages:['crm','safesurgery','medrecon','waste'] },
  { k:'mine',   t:'کارهای روزمره‌ی من',    pages:['dash','inbox','messages','profile','guide'] },
];
const CAT_OF = {};
PAGE_CATS.forEach(c => c.pages.forEach(p => { CAT_OF[p] = c; }));

// نامِ نمایشیِ هر صفحه برای نوارِ مسیر. عنوانِ همان کارتی که کاربر رویش کلیک کرده
// (CARD_DESC/HUB_CARDS) کوتاه‌تر و آشناتر از عنوانِ بلندِ داخلِ صفحه است.
const PAGE_TITLE_FA = {
  acc:'اعتباربخشی', duties:'مسئولیت من', dash:'داشبورد',
  measures:'سنجه‌ها و خودارزیابی', reviewgaps:'اختلاف با ارزیاب',
  committees:'کمیته‌ها', programs:'برنامه‌های بهبود', walkarounds:'بازدید میدانی',
  reports:'گزارش و خروجی', users:'کاربران', settings:'تنظیمات بیمارستان',
  documents:'مدارک کنترل‌شده', doccodes:'دفتر کد مدارک', processes:'فرآیندها و فلوچارت',
  indicators:'شاخص‌ها', bsc:'کارت امتیازی متوازن', checklists:'چک‌لیست‌ها',
  audits:'حسابرسی داخلی', errors:'گزارش خطا', fmea:'FMEA',
  satisfaction:'رضایت‌سنجی', followup:'پیگیری بیمار',
  orgchart:'نمودار سازمانی', orgstructure:'ساختار سازمانی', nursing:'سلسله‌مراتب پرستاری',
  support:'حوزه‌ی پشتیبانی', management:'حوزه‌ی مدیریت', tenures:'تصدی سمت‌ها',
  training:'نیازسنجی آموزشی', inbox:'کارتابل من', messages:'پیام‌های داخلی',
  activities:'ثبت فعالیت‌ها', calendar:'تقویم', headnurse:'داشبورد سرپرستار', staffshift:'پرسنل و برنامه‌ی شیفت', assets:'اقلام و نگهداشت دوره‌ای', pharmacy:'مدیریت دارویی', disaster:'مدیریت خطر حوادث و بلایا', infection:'پیشگیری و کنترل عفونت', blood:'طب انتقال خون و هموویژیلانس', lab:'خدمات آزمایشگاه', imaging:'تصویربرداری و ایمنی پرتو',
  profile:'پروفایل من', guide:'راهنمای نقش من',
  knowledge:'بانک دانش دانا', occhealth:'سلامت حرفه‌ای و بهداشت کار', hrdev:'ارزیابی و توسعه‌ی کارکنان',
  vendors:'پیمانکاران و تأمین‌کنندگان', nsupervision:'نظارت مدیریت پرستاری', finance:'منابع مالی و مشارکت مردمی',
  patientfocus:'بیمارمحوری و علت‌کاوی', education:'آموزش و اثربخشی', shiftatt:'حضور شیفت و گزارش ۲۴ ساعته',
  // CRM و ایمنی بالینی
  crm:'مدیریت بیمار و CRM', safesurgery:'جراحی ایمن WHO', medrecon:'تلفیق دارویی', waste:'پسماند پزشکی',
  // هاب‌های تخصصی فرآیندی اعتباربخشی (Rule 11)
  patientrights:'حمایت از گیرنده خدمت', maternal:'مراقبت‌های مادر و نوزاد', outpatient:'خدمات سرپایی و کلینیک‌ها',
};

// نوارِ مسیر بالای هر صفحه: خانه ‹ تبِ اصلی ‹ دسته ‹ صفحه.
// همان ظاهرِ .pathbar/.pathcard که از قبل برای مسیرِ سنجه ساخته شده بود — یک
// الگوی تازه برای همان کار، فقط دو زبانِ بصریِ متفاوت می‌ساخت.
// کارتِ دسته عمداً کلیک‌پذیر *نیست*: دسته یک صفحه نیست، فقط عنوانِ گروهی است که
// کارتِ این صفحه در صفحه‌ی اعتباربخشی زیرش نشسته. کارتِ خانه و کارتِ تب کلیک‌پذیرند.
function pageCrumbs(p){
  if(p==='dash') return '';                     // خودِ خانه، مسیر نمی‌خواهد
  const hub=HUB_OF[p];
  const cat=CAT_OF[p];
  const items=[{ lvl:'خانه', t:'داشبورد', go:'dash' }];
  if(hub && hub!==p) items.push({ lvl:'بخش', t:PAGE_TITLE_FA[hub]||hub, go:hub });
  // اگر نامِ دسته و نامِ صفحه یکی است («سنجه‌ها و خودارزیابی» زیرِ دسته‌ی
  // «سنجه‌ها و خودارزیابی»)، تکرارش فقط نوار را شلوغ می‌کند.
  if(cat && p!==hub && cat.t!==(PAGE_TITLE_FA[p]||'')) items.push({ lvl:'دسته', t:cat.t });
  if(p!==hub) items.push({ lvl:'صفحه', t:PAGE_TITLE_FA[p]||'', on:true });
  if(items.length<2) return '';
  return `<nav class="pathbar noprint" aria-label="مسیر صفحه">
    ${items.map((n,i)=>`<div class="pathcard${n.on?' on':''}"${n.go
      ? ` role="link" tabindex="0" onclick="go('${n.go}')" onkeydown="if(event.key==='Enter')go('${n.go}')"`
      : ''}>
        <span class="pathlvl">${esc(n.lvl)}</span>
        <span class="pathttl">${esc(n.t)}</span>
      </div>${i===items.length-1?'':'<span class="patharr" aria-hidden="true">‹</span>'}`).join('')}
  </nav>`;
}
function renderPageCrumbs(p){
  const box=$('navcrumb'); if(!box) return;
  box.innerHTML=pageCrumbs(p);
}

// ترتیب کارت‌ها = ترتیب اهمیت، از بالا به پایین. کارفرما صریح خواست مهم‌ترین‌ها اول بیایند.
const ACC_ORDER = [
  'measures','reviewgaps','patientrights','maternal','outpatient','committees','indicators','bsc','documents','doccodes','programs',
  'checklists','audits','walkarounds','assets','pharmacy','infection','blood','lab','imaging','disaster','errors','fmea','satisfaction','followup','processes',
  'training','orgchart','orgstructure','nursing','staffshift','support','management',
  'tenures','reports','users','settings',
  // CRM و ایمنی بالینی
  'crm','safesurgery','medrecon','waste',
];
const CARD_DESC = {
  patientrights:'تسهیلات رفاهی، منشور حقوق بیمار و نظام انتقادات و پیشنهادات',
  maternal:'مراقبت مادران پرخطر، مدیریت بخش نوزادان و ترویج زایمان طبیعی',
  outpatient:'خدمات سرپایی، حفاظت پرتوی، دندانپزشکی و کلینیک‌های تخصصی',
  measures:'خودارزیابی سنجه‌ها و ثبت وضعیت هر کدام',
  reviewgaps:'اختلاف نمره‌ی خودارزیابی با ارزیاب',
  committees:'کمیته‌های الزامی، جلسات و صورت‌جلسه‌ها',
  indicators:'۶۱ شاخص استاندارد، شناسنامه و ثبت داده‌ی دوره‌ای',
  bsc:'کارت امتیازی متوازن و شاخص‌های راهبردی',
  documents:'مدارک کنترل‌شده، خط‌مشی‌ها و کتابخانه',
  doccodes:'دفتر کد مدارک بیمارستان',
  programs:'برنامه‌های بهبود کیفیت',
  checklists:'بانک چک‌لیست‌ها و تکمیل دوره‌ای',
  audits:'حسابرسی داخلی',
  walkarounds:'بازدید میدانی مدیریتی',
  assets:'شناسنامه‌ی تجهیزات و اقلام، برنامه‌ی دوره‌ای و سوابق نگهداشت',
  pharmacy:'فرمولاری، فراخوان، انهدام، عوارض دارویی، کمبود و پایش دمای یخچال',
  infection:'استریلیزاسیون، بهداشت دست، عفونت بیمارستانی و مقاومت میکروبی',
  blood:'زنجیره‌ی سرد، موجودی و انقضا، کنترل کیفیت، عوارض تزریق و خون‌های برگشتی',
  lab:'کنترل نمونه، کنترل کیفیت، مقادیر بحرانی، زمان پاسخ‌دهی و آزمایشگاه ارجاع',
  imaging:'کنترل کیفی و کالیبراسیون، دزیمتری پرتوکاران، فرم آمادگی، یافته‌ی بحرانی و بازبینی کیفیت',
  disaster:'ارزیابی ایمنی بیمارستان، مخاطرات، مانور و حوادث داخلی',
  errors:'گزارش خطا و وقایع ناخواسته',
  fmea:'شناسایی عوامل تهدید ایمنی بیمار',
  satisfaction:'نتایج نظرسنجی رضایت گیرنده خدمت',
  followup:'پرونده‌ی پیگیری، مراجعه‌ی بعدی و تماس‌ها',
  processes:'فرآیندها و فلوچارت‌ها',
  training:'نیازسنجی و برنامه‌ی آموزشی',
  orgchart:'نمودار سازمانی بیمارستان',
  orgstructure:'ساختار سازمانی و پست‌ها',
  nursing:'سلسله‌مراتب و چیدمان پرستاری',
  staffshift:'پرسنل بخش و برنامه‌ی ماهانه‌ی شیفت (صبح/عصر/شب/مرخصی)',
  support:'حوزه‌ی پشتیبانی',
  management:'حوزه‌ی مدیریت',
  tenures:'تصدی سمت‌ها و سوابق',
  reports:'گزارش‌ها و خروجی‌ها',
  users:'کاربران و دسترسی‌ها',
  settings:'تنظیمات بیمارستان',
  // CRM و ایمنی بالینی
  crm:'مدیریت بیماران، سفر بیمار، پرونده و CRM درمانی',
  safesurgery:'چک‌لیست جراحی ایمن ۳ مرحله‌ای WHO (Sign In / Time Out / Sign Out)',
  medrecon:'تلفیق دارویی بدو بستری، داروهای پرخطر (High-Alert) و LASA',
  waste:'مدیریت پسماند پزشکی، اتوکلاو و لاگ روزانه بی‌خطرسازی',
};

// درصد پیشرفت یک بخش اصلی از روی همان statusMap ای که صفحه‌ی سنجه‌ها استفاده می‌کند
function secProgress(secCode){
  const sec=(S.sections||[]).find(x=>x.code===secCode);
  if(!sec) return {done:0,total:0,pct:0};
  let done=0,total=0;
  // سنجه‌ها مستقیم روی محور می‌نشینند (buildIndex آن‌ها را از زیر استانداردها بالا می‌آورد)،
  // نه زیر standards — همان اشتباهی که اول مرتکب شدم و پیشرفت را صفر نشان می‌داد.
  (sec.axes||[]).forEach(ax=>(ax.measures||[]).forEach(m=>{
    if(S.naMap && S.naMap[m.id]) return;         // سنجه‌ی غیرقابل ارزیابی در مخرج نمی‌آید
    total++; if(S.statusMap[m.id]==='full_compliant') done++;
  }));
  return {done,total,pct: total?Math.round(done*100/total):0};
}

function hubCardHtml(k,label,icon){
  const locked=!featureEnabled(k);
  return `<button type="button" class="hcard${locked?' locked':''}" onclick="go('${k}')">
    <span class="hcard-ic">${icon}</span>
