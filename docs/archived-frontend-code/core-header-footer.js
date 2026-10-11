/**
 * Core Header, Nav & Brand Footer
 * Modular Frontend Component — Project 313
 */
// ==================== GLOBAL HEADER/FOOTER ====================
// هدر/فوتر سراسری بیرون از #root زندگی می‌کنند تا با هر رندر (چه صفحه‌ی ورود، چه
// اپ پس از ورود) دوباره ساخته نشوند و ثابت بمانند. همان تم طلایی/سرمه‌ای شیشه‌ای
// موجود را با کلاس‌های g/gold و برندمارک lmark/shine فعلی بازاستفاده می‌کنند.
function renderGlobalHeader(){
  const el=$('ghdr'); if(!el) return;
  // پس از ورود، هدرِ سراسری دیگر ناوبری معرفی/بازاریابی محصول را نشان نمی‌دهد —
  // آن لینک‌ها فقط برای بازدیدکننده‌ی هنوز واردنشده معنا دارند. کاربرِ واردشده
  // فقط یک دکمه‌ی «خانه» (بازگشت به داشبورد) می‌بیند؛ پروفایل/خروج کنار صفحه
  // (نوار بالای سایدبار، همان‌جا که uchip هست) قرار دارد، نه در این هدر.
  // کاربرِ واردشده اصلاً هدر سراسری نمی‌بیند: نوار معرفی محصول برای بازدیدکننده است و
  // برای کسی که داخل حساب خودش کار می‌کند فقط ارتفاع مفیدِ صفحه را می‌خورد (روی موبایل
  // بیش از همه). «خانه» و «تغییر تم» هر دو در دکل شناور در دسترس‌اند، پس چیزی از دست
  // نمی‌رود. ارتفاع هدر صفر می‌شود تا محاسبه‌ی 100dvh − ghdrh در #app/.main درست بماند.
  if(S.user){
    el.innerHTML='';
    syncHeaderHeight(); applyTheme(document.documentElement.getAttribute('data-theme')||'dark',false);
    return;
  }
  el.innerHTML=`
  <div class="ghdr-in">
    <div class="ghdr-brand" onclick="goHome()" role="button" tabindex="0">
      <div class="lmark sm shine anim">✦</div>
      <b>سامانه جامع مدیریت بیمارستانی</b>
    </div>
    <nav class="ghdr-nav">
      <a href="javascript:void(0)" onclick="goHome()">خانه</a>
      <a href="javascript:void(0)" onclick="goFeaturesPublic()">ماژول‌ها</a>
      <a href="javascript:void(0)" onclick="goProcessPublic()">فرآیند</a>
      <a href="javascript:void(0)" onclick="goAboutPublic()">درباره ما</a>
      <a href="javascript:void(0)" class="navcontact hide" onclick="goContactPublic()">تماس با ما</a>
    </nav>
    <div class="ghdr-cta">
      <button type="button" class="themebtn" id="themeBtn" onclick="toggleTheme()" aria-pressed="false" aria-label="تغییر به حالت روشن">☀</button>
      <button class="btn btn-g btn-sm" onclick="headerEnterApp()">ورود به سامانه ›</button>
    </div>
  </div>`;
  syncHeaderHeight(); applyTheme(document.documentElement.getAttribute('data-theme')||'dark',false);
}
function toggleTheme(){
  // دکمهٔ تم مخفی شده و تمِ روشن حذف شده است؛ این تابع در هر حال فقط تیرهٔ
  // کلاسیک را تثبیت می‌کند (اگر به هر دلیلی فراخوانی شود).
  applyTheme('dark',false);
}
// خواسته‌ی صریح کارفرما: تمِ روشن سراسری و پیش‌فرض خاموش است (همیشه تمِ تیره)،
// مگر سوپرادمین از پنل خودش روشنش کند. مقدار واقعی را از سرور می‌خواند و کش
// محلی (که در index.html هم برای جلوگیری از پرش رنگِ اولین رندر خوانده می‌شود)
// را به‌روز می‌کند؛ اگر خاموش بود، حتی اگر کاربر قبلاً روشن انتخاب کرده بود
// نمایش را به تیره برمی‌گرداند — بدون پاک‌کردن خودِ ترجیحِ ذخیره‌شده، تا اگر
// سوپرادمین دوباره روشنش کرد کاربر به انتخاب قبلی خودش برگردد.
async function enforceThemePolicy(){
  // خواستهٔ صریح کارفرما: تمِ روشن حذف شد — همیشه تیرهٔ کلاسیک. دیگر به کلیدِ
  // روشنِ پنل سوپرادمین وابسته نیستیم؛ کش محلی همیشه صفر می‌ماند و دکمهٔ تم
  // همیشه مخفی است.
  try{ await API.themePolicy(); }catch(e){ /* نرسیدنش مهم نیست */ }
  localStorage.setItem('p_light_theme_enabled','0');
  applyTheme('dark',false);
  const btn=$('themeBtn'); if(btn) btn.style.display='none';
}
// دکمه‌ی طلایی هدر: اگر کاربر از قبل وارد است مستقیم به داشبورد، وگرنه به لندینگ
// می‌رود و همان‌جا کارت انتخاب مرکز (showHospitalPicker در renderEntry) را باز می‌کند —
// این سامانه «درخواست دمو» ندارد، ورود واقعی همان جریان انتخاب مرکز/کاشی نقش است.
function headerEnterApp(){
  if(S.user){ renderApp(); return; }
  const q=new URLSearchParams(location.search).get('hospital');
  const hid=q||localStorage.getItem(HOSP_KEY);
  const z=$('loginZone');
  if(hid && z){
    if(z.classList.contains('hide')) toggleLoginZone(true);
    else{
      const ghdr=$('ghdr');
      const hdrH=ghdr?ghdr.offsetHeight:78;
      const top=z.getBoundingClientRect().top+window.scrollY-hdrH-16;
      window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    }
    return;
  }
  goHome();
  setTimeout(()=>{ if(typeof showHospitalPicker==='function') showHospitalPicker(); },40);
}
// ارتفاع واقعی هدر سراسری را به‌صورت متغیر CSS منتشر می‌کند تا #app (که خودش
// دقیقاً ارتفاع صفحه را با اسکرول داخلی پر می‌کند) به‌جای همپوشانی، درست زیر
// هدر بنشیند — هم دسکتاپ هم موبایل (که ناوبری هدر ممکن است به دو خط بشکند).
function syncHeaderHeight(){
  const el=$('ghdr'); if(!el) return;
  document.documentElement.style.setProperty('--ghdrh', el.offsetHeight+'px');
}
window.addEventListener('resize', ()=>{ clearTimeout(window.__ghdrT); window.__ghdrT=setTimeout(syncHeaderHeight,120); });
function renderGlobalFooter(){
  const el=$('gftr'); if(!el) return;
  // همان استدلال هدر: فوتر معرفی/بازاریابی محصول برای بازدیدکننده است. داخل حساب کاربری
  // فقط انتهای صفحات را می‌پوشاند — روی نمودار سازمانی، ردیف آخر کارت‌ها زیرش می‌رفت.
  if(S.user){ el.innerHTML=''; return; }
  const yr=new Date().getFullYear();
  el.innerHTML=`
  <div class="gftr-in">
    <div class="gftr-brand"><div class="lmark sm shine">✦</div>
      <div><b>سامانه جامع مدیریت بیمارستانی</b>
      <span>ساختار سازمانی، پرستاری، کیفیت، ایمنی بیمار و اعتباربخشی برای مراکز درمانی عضو، در یک بستر ابری یکپارچه.</span></div></div>
    <div class="gftr-col"><b>محصول</b>
      <a href="javascript:void(0)" onclick="goFeaturesPublic()">ماژول‌های سامانه</a>
      <a href="javascript:void(0)" onclick="goProcessPublic()">فرآیند استقرار</a>
      <a href="javascript:void(0)" onclick="headerEnterApp()">ورود به سامانه</a>
    </div>
    <div class="gftr-col"><b>سازمان</b>
      <a href="javascript:void(0)" onclick="goAboutPublic()">درباره ما</a>
      <a href="javascript:void(0)" class="navcontact hide" onclick="goContactPublic()">تماس با ما</a>
    </div>
  </div>
  <div class="gftr-cr">
    <span>© ${fa(yr)} سامانه جامع مدیریت بیمارستانی — تمام حقوق محفوظ است.</span>
  </div>`;
}
// ناوبری صفحات عمومی (پیش/پس از ورود هر دو) — همیشه داخل #root رندر می‌شود،
// هدر/فوتر بیرونی دست‌نخورده می‌مانند.
function goHome(){ if(S.user){ go('acc'); return; } renderEntry(); }
function goFeaturesPublic(){ renderEntry(); setTimeout(()=>{ const el=$('pub-features'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); },40); }
function goProcessPublic(){ renderEntry(); setTimeout(()=>{ const el=$('pub-process'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); },40); }
function goAboutPublic(){ renderEntry(); setTimeout(()=>{ const el=$('pub-about'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); },40); }
async function goContactPublic(){
  renderEntry();
  await loadSiteContact();          // تا بخش تماس از حالت پنهان بیرون نیاید، اسکرول بی‌اثر است
  const el=$('pub-contact');
  if(el && !el.classList.contains('hide')) el.scrollIntoView({behavior:'smooth',block:'start'});
}

// ---- هدر سراسری: اسکرول-به-پایین = پنهان، اسکرول-به-بالا/نزدیک بالای صفحه = نمایش ----
// طبق درخواست کاربر: یا هدر بماند یا فقط دکل شناور (نه هر دو هم‌زمان به‌شکل ناقص).
// چون در اپِ واردشده اسکرول واقعی روی .main (داخل #app) اتفاق می‌افتد نه روی window،
// از capture:true روی window استفاده می‌شود — رویداد scroll باب نمی‌شود ولی در فاز
// capture حتی برای فرزندهای اسکرول‌شونده هم به شنونده‌ی window می‌رسد.
let __hdrLastY=0, __hdrHidden=false;
function initHeaderScrollHide(){
  window.addEventListener('scroll',(e)=>{
    const t=e.target;
    const y=(t===document||t===window)?(window.scrollY||document.documentElement.scrollTop||0):(t.scrollTop||0);
    const ghdr=$('ghdr'); if(!ghdr) return;
    const delta=y-__hdrLastY;
    if(y>72 && delta>4 && !__hdrHidden){ ghdr.classList.add('hdr-hide'); __hdrHidden=true; }
    else if((delta<-4 || y<40) && __hdrHidden){ ghdr.classList.remove('hdr-hide'); __hdrHidden=false; }
    // شیشه‌ای‌شدن هدر مستقل از نمایش/پنهانی است — همان امضای بصری سایت اصلی
    ghdr.classList.toggle('is-scrolled', y>18);
    __hdrLastY=y;
  },{capture:true,passive:true});
}

// بخش‌های صفحه‌ی ورودی عمومی هنگام رسیدنِ اسکرول ظاهر می‌شوند، نه یک‌جا —
// همان جلوه‌ی سایت اصلی. IntersectionObserver سبک‌ترین راه است: کاری با
// اسکرول‌ایونت مکرر ندارد و روی reduced-motion هم به‌خودی‌خود بی‌اثر می‌ماند
// چون CSS مربوطه‌اش زیر @media (prefers-reduced-motion) خنثی می‌شود.
let __revealIO=null;
function initRevealOnScroll(){
  if(!('IntersectionObserver' in window)) return;
  if(__revealIO) __revealIO.disconnect();
  __revealIO=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('is-visible'); __revealIO.unobserve(e.target); } });
  },{threshold:.12});
  document.querySelectorAll('.reveal:not(.is-visible)').forEach(el=>__revealIO.observe(el));
}
