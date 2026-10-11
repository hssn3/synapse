/**
 * Core Boot & Login Flow
 * Modular Frontend Component — Project 313
 */
// ==================== BOOT ====================
(async function boot(){
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  window.scrollTo(0,0);
  initVisualSystem();
  initHeaderScrollHide();
  renderGlobalHeader(); renderGlobalFooter();
  enforceThemePolicy();
  // پیش از هر رندری ساعت را با سرور تنظیم کن، وگرنه اولین صفحه با «امروزِ» غلطِ
  // دستگاه ساخته می‌شود. خودِ تابع خطا را می‌بلعد، پس بوت هرگز به‌خاطر آن نمی‌شکند.
  await syncServerTime();
  startServerTimeSync();
  // مسیر ورود سوپرادمین دیگر هیچ لینک قابل‌مشاهده‌ای در UI عمومی ندارد — فقط با ناوبری مستقیم
  // به این نشانی مخفی در دسترس است (بدون هیچ اثری در HTML رندرشده).
  if(location.pathname==='/admin313' || location.pathname.startsWith('/admin313/')){ renderSuperLogin(); return; }
  // session() (نه me()): روی صفحه‌ی ورود که نشستی نیست، me() یک ۴۰۱ در کنسول مرورگر
  // می‌گذاشت. session همیشه ۲۰۰ می‌دهد و خودش می‌گوید نشست هست یا نه — همان یک درخواست
  // قبلی، فقط بی‌خطا. تعداد درخواست‌ها عوض نشده است.
  try {
    const r = await API.session();
    if(!r.authenticated){ renderLogin(); return; }
    S.user = r.user; renderPreviewBanner(); await enterApp();
  }
  catch(e){ renderLogin(); }
})();

// ==================== پیش‌نمایش داشبورد یک نقش (فقط ادمین) ====================
// نوار هشدارِ همیشه‌چسبیده به بالای صفحه، مستقل از renderGlobalHeader — نه چیزی از
// هدر سراسری حذف می‌کند نه به آن اضافه، فقط یک لایه‌ی جدا روی صفحه می‌نشیند.
function renderPreviewBanner(){
  let el=document.getElementById('pvBanner');
  if(!S.user || !S.user.preview){ if(el) el.remove(); document.body.style.paddingTop=''; return; }
  if(!el){ el=document.createElement('div'); el.id='pvBanner'; document.body.appendChild(el); }
  el.setAttribute('style','position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:8px 14px;background:#7a4b00;color:#fff8e8;font-size:13px;font-weight:600;box-shadow:0 2px 10px rgba(0,0,0,.25)');
  el.innerHTML=`<span>⚠ حالت پیش‌نمایش — نمایش داشبورد به‌عنوان «${esc(S.user.role_title||'')} — ${esc(S.user.full_name||'')}»</span>
    <button type="button" onclick="exitRolePreview()" style="background:#fff8e8;color:#7a4b00;border:none;border-radius:6px;padding:4px 12px;font-weight:700;cursor:pointer;font-size:12.5px">بازگشت به حساب من (${esc(S.user.preview.real_admin_name||'ادمین')})</button>`;
  document.body.style.paddingTop=el.offsetHeight+'px';
}
// روی هر پست پرشده‌ی نمودار سازمانی، ادمین می‌تواند داشبورد همان فرد/نقش را ببیند —
// نشست موقت سرور (۱۵ دقیقه)، سپس بارگذاری کامل صفحه تا همه‌ی داده‌ها (درخت/مجوز/آمار)
// واقعاً مطابق نقش هدف باشند، نه فقط ظاهر منو.
async function startRolePreview(userId){
  try{
    await API.previewStart(userId);
    toast('در حال ورود به پیش‌نمایش…');
    setTimeout(()=>location.reload(), 300);
  }catch(e){ toast(e.message,true); }
}
async function exitRolePreview(){
  try{ await API.previewExit(); }catch(e){}
  location.reload();
}

// ==================== LOGIN ====================
// جریان ورود دو مرحله‌ای (چندمستأجری):
//   ۱) صفحه‌ی ورودی عمومی — معرفی سامانه + «خدمات بدون احراز هویت» + انتخاب مرکز
//   ۲) صفحه‌ی اختصاصی همان مرکز — لوگو و نام خودِ بیمارستان بالای فرم ورود
// مرکز انتخاب‌شده در نشانی (?hospital=) و localStorage نگه داشته می‌شود تا دفعه‌ی بعد
// کاربر مستقیم صفحه‌ی مرکز خودش را ببیند. کارت ورودِ ساده‌ی قبلی همان فرم مرحله‌ی ۲ است.

const HOSP_KEY='p_last_hospital';
let PUB_HOSPS=[];

// ماژول‌های معرفی‌شده در صفحه‌ی خانه — دقیقاً از «وضعیت کامل پروژه» در docs/BACKUP_INFO.md،
// چیزی اضافه/جعل نشده. آیکون‌ها از همان مجموعه‌ی نمادهای یونیکد فعلی سامانه (بدون تصویر).
const PUB_FEATURES=[
  { ic:ic('tree'), t:'ساختار سازمانی', d:'نمودار سازمانی، حوزه‌های مدیریت/پرستاری/پشتیبانی، گروه شغلی، واحد، پست سازمانی و ساختمان' },
  { ic:ic('stethoscope'), t:'سلسله‌مراتب پرستاری', d:'سوپروایزرها، بخش‌ها و سرپرستاران؛ داشبورد سرپرستار برای حضور و غیاب، مرخصی و وظایف شیفت' },
  { ic:ic('inbox'), t:'کارتابل و پیام‌رسانی', d:'کارتابل شخصی، پیام داخلی، یادآور خودکار روی همان کارتابل' },
  { ic:ic('users'), t:'کمیته‌ها', d:'۱۷+ کمیته، صورت‌جلسه، زمان‌بندی جلسه با تشخیص تداخل اتاق' },
  { ic:ic('chart'), t:'کارت امتیازی متوازن (BSC)', d:'شاخص‌های عملکردی ماهانه با تارگت و جهت مطلوب، به‌تفکیک وجه' },
  { ic:ic('alert'), t:'ایمنی و مدیریت ریسک', d:'گزارش خطا با کد پیگیری، FMEA، بازدید میدانی مدیریتی با داشبورد مصوبات' },
  { ic:ic('graduation'), t:'آموزش و بهبود', d:'نیازسنجی آموزشی و برنامه‌های بهبود مستمر کیفیت' },
  { ic:ic('docs'), t:'مدارک کنترل‌شده', d:'خط‌مشی/روش‌اجرایی/دستورالعمل، امضای الکترونیکی، گردش امضا و تاریخچه‌ی نسخه' },
  { ic:ic('clipboard'), t:'اعتباربخشی', d:'یکی از ماژول‌های سامانه: درخت ۵۲۰ سنجه / ۱۰۸ استاندارد (ویرایش پنجم)، داشبورد، گیج و نمودار روند' },
  { ic:ic('grid'), t:'خدمات بدون‌ورود', d:'گزارش خطا، FMEA، انتقادات و پیشنهادها، نظرسنجی رضایت — مخصوص هر مرکز' }
];

// خدمات همگانی — دقیقاً همان صفحاتی که در PUBLIC_PAGES سرور تعریف شده‌اند؛ ماژول جعلی اضافه نمی‌کنیم.
const PUB_SERVICES=[
  { path:'error-report', ic:ic('alert'), title:'گزارش خطا و وقایع ناخواسته', desc:'ثبت محرمانه با کد رهگیری' },
  { path:'fmea',         ic:ic('shield'), title:'عوامل تهدید کننده ایمنی بیمار', desc:'شناسایی خطر پیش از وقوع حادثه' },
  { path:'complaint',    ic:ic('message'), title:'انتقادات، پیشنهادها و تقدیر', desc:'ناشناس یا با اطلاعات تماس' },
  { path:'satisfaction', ic:ic('heart'), title:'نظرسنجی رضایت بیمار', desc:'پرسشنامه رسمی رضایت‌سنجی' },
  { path:'services',     ic:ic('grid'), title:'درگاه خدمات همگانی', desc:'فهرست کامل فرم‌های بدون ورود' }
];
// کاشی‌های صفحه‌ی اختصاصی هر مرکز، همه کنار هم در یک شبکه.
//
// عنوانِ «خدمات بدون احراز هویت» عمداً حذف شد: کارفرما گفت این عبارت برای
// مراجعه‌کننده معنایی ندارد و فقط یک برچسبِ فنی است. کاربر لازم نیست بداند کدام
// خدمت احراز هویت می‌خواهد — کارتِ «ورود کارکنان» خودش این را می‌گوید، و بقیه‌ی
// کارت‌ها بدونِ توضیح باز می‌شوند.
//
// کارتِ ورود در همین شبکه و کنارِ بقیه می‌نشیند (نه یک بلوکِ جدا)، ولی ظاهرِ
// طلاییِ متمایز دارد تا در نگاهِ اول از خدماتِ همگانی جدا دیده شود.

