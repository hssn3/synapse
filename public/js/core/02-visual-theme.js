/**
 * Core Visual Theme & Glassmorphism System
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function injectSettingsDrawer(){
  if($('settDrawer')) return;
  const dw=document.createElement('div'); dw.className='settdrawer'; dw.id='settDrawer'; dw.setAttribute('role','dialog'); dw.setAttribute('aria-label','تنظیمات نمایش');
  dw.innerHTML=`
    <h4>تنظیمات نمایش</h4>
    <div class="sd-row"><div class="lbl"><span>شدت شاین</span><output id="sdShineOut">۳۲٪</output></div>
      <input type="range" id="sdShineR" min="0" max="100" value="32" aria-label="شدت شاین کارت‌ها"></div>
    <div class="sd-row"><div class="lbl"><span>سرعت پس‌زمینه</span><output id="sdSpeedOut">۱٫۰×</output></div>
      <input type="range" id="sdSpeedR" min="20" max="250" value="100" aria-label="سرعت انیمیشن پس‌زمینه"></div>
    <div class="sd-row"><div class="lbl"><span>شدت تابش</span><output id="sdGlowOut">۲۸٪</output></div>
      <input type="range" id="sdGlowR" min="0" max="100" value="28" aria-label="شدت تابش کارت‌ها"></div>
    <div class="sd-row"><div class="lbl"><span>اندازه‌ی فونت</span></div>
      <div class="sd-fs-steps" role="group" aria-label="اندازه‌ی فونت">
        ${FONT_STEPS.map(s=>`<button type="button" class="sd-fs-btn" data-k="${s.k}">${s.t}</button>`).join('')}
      </div></div>
    <div class="sd-row"><div class="lbl"><span>سبک ارقام</span></div>
      <div class="sd-fs-steps" role="group" aria-label="سبک ارقام">
        <button type="button" class="sd-num-btn" data-n="latin">۱۲۳ لاتین</button>
        <button type="button" class="sd-num-btn" data-n="fa">۱۲۳ فارسی</button>
      </div></div>
    <div class="sd-toggle"><span>انیمیشن پس‌زمینه</span><button type="button" class="sd-tgl" id="sdAnimTgl" role="switch" aria-checked="true" aria-pressed="true" aria-label="سوئیچ انیمیشن پس‌زمینه"></button></div>
    <div class="sd-toggle"><span>اسکرول اسنپ</span><button type="button" class="sd-tgl" id="sdSnapTgl" role="switch" aria-checked="false" aria-pressed="false" aria-label="سوئیچ اسکرول اسنپ"></button></div>
    <button type="button" class="sd-reset" id="sdReset">بازگردانی پیش‌فرض</button>
    <p class="hide" role="status" aria-live="polite" id="sdStatus"></p>`;
  document.body.appendChild(dw);
  dw.querySelectorAll('.sd-fs-btn').forEach(b=>b.addEventListener('click',()=>applyFontSizeVar(b.dataset.k,true)));
  dw.querySelectorAll('.sd-num-btn').forEach(b=>b.addEventListener('click',()=>applyNumerals(b.dataset.n,true)));
  injectDockMenuBtn(); // دکمه‌ی دوم دکل: منو (خانه/پروفایل/تنظیمات ظاهری)

  function openDrawer(o){ dw.classList.toggle('open',o); if(o){ dw.scrollTop=0; const f=dw.querySelector('button,input'); if(f) f.focus(); } }
  window.toggleSettDrawer=openDrawer; // فراخوانی از آیتم «تنظیمات ظاهری» در پاپ‌آور منو
  document.addEventListener('click',e=>{ if(dw.classList.contains('open') && !dw.contains(e.target) && !(e.target.closest && e.target.closest('#dockMenuAppearance'))) openDrawer(false); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && dw.classList.contains('open')) openDrawer(false); });

  $('sdShineR').addEventListener('input',e=>applyShineVar(+e.target.value,true));
  $('sdSpeedR').addEventListener('input',e=>applySpeedVar(+e.target.value,true));
  $('sdGlowR').addEventListener('input',e=>applyGlowVar(+e.target.value,true));
  $('sdAnimTgl').addEventListener('click',()=>applyAnim(document.documentElement.getAttribute('data-anim')==='off',true));
  $('sdSnapTgl').addEventListener('click',()=>applySnap(document.documentElement.getAttribute('data-snap')!=='on',true));
  $('sdReset').addEventListener('click',()=>{
    applyShineVar(32,true); applySpeedVar(100,true); applyGlowVar(28,true);
    applyAnim(!PREFERS_REDUCE,true); applySnap(false,true); applyFontSizeVar('md',true);
    applyNumerals('fa',true);
  });

  const p=readPrefs();
  applyShineVar(p.shine!=null?p.shine:32,false);
  applySpeedVar(p.speed!=null?p.speed:100,false);
  applyGlowVar(p.glow!=null?p.glow:28,false);
  applyNumerals(p.numerals||'fa',false);
  applyFontSizeVar(p.fontSize||'md',false);
  applyAnim(document.documentElement.getAttribute('data-anim')!=='off',false);
  applySnap(document.documentElement.getAttribute('data-snap')==='on',false);
}
function initVisualSystem(){
  const p=readPrefs();
  if(p.shine!=null) document.documentElement.style.setProperty('--shine-i',(p.shine/100).toFixed(2));
  if(p.speed!=null) document.documentElement.style.setProperty('--bg-speed',(p.speed/100).toFixed(2));
  if(p.glow!=null) document.documentElement.style.setProperty('--glow-i',(p.glow/100).toFixed(2));
  if(p.fontSize){ const st=FONT_STEPS.find(s=>s.k===p.fontSize); if(st) document.documentElement.style.setProperty('--fs-scale', st.v); }
  injectBgFx();
  injectSettingsDrawer();
}

// ===== پورتال تولتیپ سراسری =====
// مشکل: تولتیپ‌های راهنما (.hlp > .tip) با position:absolute داخل کارت‌هایی که
// overflow:hidden دارند (.panel، .fsec، .stdblk، .drop، .side) بریده می‌شدند و
// بخش زیادی از ~۷۱ راهنمای فیلد دیده نمی‌شد.
// راه‌حل: هنگام هاور، خودِ گره‌ی .tip به یک عنصر position:fixed در <body> منتقل
// می‌شود (پورتال) تا هیچ والدِ برنده‌ای نتواند آن را قیچی کند. چون گره واقعاً
// جابه‌جا می‌شود (نه کپی)، دکمه‌ی «پر کردن نمونه» داخل راهنما سالم می‌ماند.
// کلیک روی ؟ = پین، تا کاربر فرصت خواندن و کلیک روی آن دکمه را داشته باشد.
(function(){
  let floatEl=null, current=null, pinned=false, raf=0, hideTimer=null;
  function portal(){
    if(floatEl) return floatEl;
    floatEl=document.createElement('div');
    floatEl.className='tipfloat';
    document.body.appendChild(floatEl);
    return floatEl;
  }
  function position(hlp){
    const r=hlp.getBoundingClientRect();
    const p=portal();
    p.style.visibility='hidden'; p.style.display='block';
    const pw=p.offsetWidth, ph=p.offsetHeight;
    let top=r.top-ph-10;
    if(top<8) top=r.bottom+10;                                   // جا نبود → زیر آیکون
    if(top+ph>window.innerHeight-8) top=Math.max(8, window.innerHeight-ph-8);
    let left=r.right-pw;                                          // راست‌چین روی آیکون
    if(left<8) left=8;
    if(left+pw>window.innerWidth-8) left=window.innerWidth-pw-8;
    p.style.left=left+'px'; p.style.top=top+'px';
    p.style.visibility='visible';
  }
  function cancelHide(){ if(hideTimer){ clearTimeout(hideTimer); hideTimer=null; } }
  function show(hlp){
    cancelHide(); hide();
    const tip=hlp.querySelector(':scope > .tip');
    if(!tip) return;
    current=hlp;
    const p=portal();
    p.appendChild(tip);                                           // انتقال واقعی گره
    p.style.display='block';
    position(hlp);
  }
  function hide(){
    cancelHide();
    if(current && floatEl){
      const tip=floatEl.querySelector('.tip');
      if(tip) current.appendChild(tip);                           // بازگرداندن به خانه‌ی اصلی
    }
    if(floatEl) floatEl.style.display='none';
    current=null;
  }
  // برای فراخوانی از بیرون (مثلاً بعد از «پر کردن نمونه») تا راهنما بسته شود
  window.closeTip=function(){ pinned=false; hide(); };
  document.addEventListener('mouseover',(e)=>{
    if(floatEl && floatEl.contains(e.target)){ cancelHide(); return; }
    if(pinned) return;                                            // پین است → هاور جای آن را نگیرد
    const hlp=e.target.closest && e.target.closest('.hlp');
    if(hlp && hlp!==current) show(hlp);
  });
  document.addEventListener('mouseout',(e)=>{
    if(!current || pinned) return;
    const to=e.relatedTarget;
    if(to && (current.contains(to) || (floatEl && floatEl.contains(to)))) return;
    hideTimer=setTimeout(()=>{ if(!pinned) hide(); }, 160);        // شکاف بین آیکون و تولتیپ
  });
  document.addEventListener('click',(e)=>{
    if(floatEl && floatEl.contains(e.target)) return;             // کلیک داخل خود راهنما → نبند
    const hlp=e.target.closest && e.target.closest('.hlp');
    if(hlp){
      if(pinned && hlp===current){ pinned=false; hide(); }
      else { pinned=true; show(hlp); }
      return;
    }
    if(pinned){ pinned=false; hide(); }
  });
  function reposition(){ raf=0; if(current) position(current); }
  window.addEventListener('scroll',()=>{ if(!raf) raf=requestAnimationFrame(reposition); }, true);
  window.addEventListener('resize',()=>{ if(current) position(current); });
})();

// ---------- تقویم شمسی (جلالی) — تبدیل خالص JS، بدون کتابخانه خارجی ----------
// الگوریتم استاندارد مبتنی بر عدد روز ژولیوسی (JDN)، صحت‌سنجی‌شده روی بازه ۱۹۹۰-۲۰۳۹ میلادی بدون خطا
const JDIV = (a,b) => Math.floor(a/b);
function jalCal(jy){
  const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  let gy=jy+621, leapJ=-14, jp=breaks[0], jm, jump=0, leap, n, i;
  for(i=1;i<breaks.length;i+=1){ jm=breaks[i]; jump=jm-jp; if(jy<jm) break; leapJ+=JDIV(jump,33)*8+JDIV(jump%33,4); jp=jm; }
  n=jy-jp;
  leapJ+=JDIV(n,33)*8+JDIV((n%33)+3,4);
  if((jump%33)===4 && jump-n===4) leapJ+=1;
  const leapG=JDIV(gy,4)-JDIV((JDIV(gy,100)+1)*3,4)-150;
  const march=20+leapJ-leapG;
  if(jump-n<6) n=n-jump+JDIV(jump+4,33)*33;
  leap=(((n+1)%33)-1)%4;
  if(leap===-1) leap=4;
  return {leap, gy, march};
}
// عدد روز ژولیوسی نسبت به epoch یونیکس (۱۹۷۰/۰۱/۰۱ = JDN عدد ۲۴۴۰۵۸۸، ثابت شناخته‌شده) —
// با تکیه بر محاسبات تقویمی خودِ موتور جاوااسکریپت (Date.UTC) به‌جای فرمول دستی، تا از خطای محاسباتی مصون بماند
const UNIX_EPOCH_JDN=2440588;
function g2d(gy,gm,gd){ return Math.round(Date.UTC(gy,gm-1,gd)/86400000)+UNIX_EPOCH_JDN; }
function d2g(jdn){
  const d=new Date((jdn-UNIX_EPOCH_JDN)*86400000);
  return {gy:d.getUTCFullYear(), gm:d.getUTCMonth()+1, gd:d.getUTCDate()};
}
function j2d(jy,jm,jd){
  const r=jalCal(jy);
  return g2d(r.gy,3,r.march)+(jm-1)*31-JDIV(jm,7)*(jm-7)+jd-1;
}
function d2j(jdn){
  const gy=d2g(jdn).gy;
  let jy=gy-621;
  const r=jalCal(jy);
  const jdn1f=g2d(gy,3,r.march);
  let k=jdn-jdn1f, jm, jd;
  if(k>=0){
    if(k<=185){ jm=1+JDIV(k,31); jd=(k%31)+1; return {jy,jm,jd}; }
    k-=186;
  } else {
    jy-=1;
    const rPrev=jalCal(jy);
    k+=179;
    if(rPrev.leap===0) k+=1;
  }
  jm=7+JDIV(k,30); jd=(k%30)+1;
  return {jy,jm,jd};
}
const toJalali = (gy,gm,gd) => d2j(g2d(gy,gm,gd));
const toGregorian = (jy,jm,jd) => d2g(j2d(jy,jm,jd));
const JMONTHS=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
// ============ منطقه‌ی زمانی تهران (Asia/Tehran, UTC+3:30) ============
// قرارداد ذخیره‌سازی: همه‌ی مُهرهای زمانی در دیتابیس UTC هستند — چه
// `new Date().toISOString()` («2026-08-14T14:55:01.123Z») و چه SQLite
// `datetime('now')` («2026-08-14 14:55:01»، بدون Z ولی باز هم UTC).
// قرارداد نمایش: هیچ‌جا UTC خام نشان داده نمی‌شود؛ همیشه از این توابع رد می‌شود.
// ایران از ۱۴۰۱ تغییر ساعت تابستانی ندارد، پس افست ثابت +۳:۳۰ درست است.
const TEHRAN_OFFSET_MS = 3.5*3600000;

// ---- هم‌زمانی با ساعتِ سرور ----
// ساعتِ دستگاهِ کاربر قابل اعتماد نیست: یک ویندوزِ بدونِ همگام‌سازی می‌تواند روزها
// جلو/عقب باشد و آن‌وقت «امروز»، پیش‌فرضِ تاریخ‌گزین‌ها و شمارش معکوسِ مهلت‌ها همه
// غلط می‌شوند. پس یک‌بار در بوت، اختلافِ ساعتِ ما با سرور را می‌گیریم و از آن به بعد
// هر «حالا» با همین اختلاف تصحیح می‌شود (بدون رفت‌وبرگشت شبکه در هر فراخوانی).
let SRV_SKEW_MS = 0;      // serverNow - clientNow ؛ صفر یعنی هنوز/هرگز همگام نشده
let SRV_SYNCED = false;
async function syncServerTime(){
  try{
    const t0=Date.now();
    const r=await fetch('/api/server-time',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    const t1=Date.now();
    const srv=Date.parse(d.utc);
    if(!isFinite(srv)) throw new Error('پاسخ نامعتبر');
    // نیمی از زمانِ رفت‌وبرگشت را جبران می‌کنیم تا تأخیر شبکه به‌حساب انحراف گذاشته نشود
    SRV_SKEW_MS = srv - (t0 + (t1-t0)/2);
    SRV_SYNCED = true;
    if(Math.abs(SRV_SKEW_MS)>120000)
      console.warn('[زمان] ساعت این دستگاه '+Math.round(SRV_SKEW_MS/60000)+' دقیقه با سرور اختلاف دارد؛ تصحیح شد.');
    return true;
  }catch(e){
    // شکست همگام‌سازی نباید برنامه را بشکند — به ساعت خام دستگاه برمی‌گردیم
    console.warn('[زمان] همگام‌سازی با ساعت سرور ناموفق بود؛ فعلاً از ساعت همین دستگاه استفاده می‌شود:', e.message);
    return false;
  }
}
// هر ۴۵ دقیقه یک‌بار تازه‌سازی — نه پایش دائم، فقط جلوگیری از دررفتنِ تدریجی ساعت
function startServerTimeSync(){
  if(!startServerTimeSync._t) startServerTimeSync._t=setInterval(syncServerTime, 45*60*1000);
}
// «حالا»ی واقعی (UTC) — ساعتِ دستگاه، تصحیح‌شده با اختلافِ سرور
function nowMs(){ return Date.now()+SRV_SKEW_MS; }

// «حالا» به وقت تهران — به‌شکل Date‌ای که گِتِرهای UTC آن ساعتِ دیواری تهران را می‌دهند
function tehranNow(){ return new Date(nowMs()+TEHRAN_OFFSET_MS); }
// امروز به وقت تهران، به‌صورت YYYY-MM-DD میلادی (برای مقایسه با ستون‌های تاریخِ دیتابیس)
function todayISO(){ return tehranNow().toISOString().slice(0,10); }
function todayJalali(){ const t=tehranNow(); return toJalali(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate()); }

// یک رشته‌ی تاریخ/زمان را می‌شکافد.
// - «YYYY-MM-DD» تاریخِ تقویمی است (تاریخ ابلاغ، تاریخ جلسه، …) و نباید جابه‌جا شود.
// - هرچه جزء ساعت دارد یک مُهر زمانیِ UTC است و به وقت تهران منتقل می‌شود.
function parseStamp(s){
  const str=String(s||'');
  const t=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
  if(t){
    const d=new Date(Date.UTC(+t[1],+t[2]-1,+t[3],+t[4],+t[5],+t[6]||0)+TEHRAN_OFFSET_MS);
    return {...toJalali(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()),
      hh:d.getUTCHours(), mi:d.getUTCMinutes(), hasTime:true};
  }
  const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if(!m) return null;
  return {...toJalali(+m[1],+m[2],+m[3]), hh:0, mi:0, hasTime:false};
}
const jStr = j => fa(j.jy)+'/'+fa(String(j.jm).padStart(2,'0'))+'/'+fa(String(j.jd).padStart(2,'0'));

// تاریخ شمسی خوانا. مُهرهای زمانیِ UTC خودکار به تاریخِ تهران تبدیل می‌شوند
// (یعنی «۲۰۲۶-۰۸-۱۴T۲۱:۳۰Z» روزِ بعد را نشان می‌دهد، همان‌طور که در تهران هست).
// نوار تاریخ‌های ثابتِ زیر سربرگ — در همه‌ی فرم‌ها یکسان است (خواسته‌ی کاربر).
// «بازنگری بعدی» اگر روی سند ثبت نشده باشد، خودکار یک سال شمسی بعد از آخرین
// ویرایش (یا تاریخ ایجاد) حساب می‌شود — قاعده‌ی رایج اسناد کنترل‌شده.
function nextReviewISO(d){
  if(d && d.review_date) return d.review_date;
  const base = (d && (d.updated_at || d.issue_date || d.prepared_date || d.created_at)) || null;
  if(!base) return null;
  const j = parseStamp(base); if(!j) return null;
  // ۳۰ اسفند فقط در سال کبیسه هست؛ برای امنیت به ۲۹ محدود می‌شود.
  const day = (j.jm === 12 && j.jd > 29) ? 29 : j.jd;
  const gg = toGregorian(j.jy + 1, j.jm, day);
  return gg.gy + '-' + String(gg.gm).padStart(2,'0') + '-' + String(gg.gd).padStart(2,'0');
}
// ---- سربرگی که در چاپ روی «هر» صفحه تکرار می‌شود ----
// کاربر گزارش داد سربرگ فقط روی صفحه‌ی اول چاپ می‌افتد. علتش ساده است: سربرگ
// یک <div> در جریان عادی صفحه بود و مثل هر بلوک دیگری فقط یک‌بار چاپ می‌شود.
// تنها ساختاری که مرورگرها واقعاً روی هر صفحه‌ی کاغذ تکرار می‌کنند
// <thead> یک جدول است (position:fixed در کروم فقط صفحه‌ی اول را می‌گیرد و
// margin box های @page هم پشتیبانی کاملی ندارند).
// پس محتوای قابل‌چاپ داخل یک جدول تک‌ستونه می‌رود: سربرگ در thead، محتوا در
// tbody، و پانویس در tfoot. روی نمایشگر همه‌ی این‌ها با display:block دقیقاً
// مثل قبل چیده می‌شوند — یعنی ظاهر صفحه تغییری نمی‌کند و فقط چاپ درست می‌شود.
function docLetterhead(subtitle){
  // تصویر لوگو فقط وقتی درخواست می‌شود که سرور گفته باشد بیمارستان لوگو دارد
  // (hospital_has_logo در /me و /session). قبلاً این تصویر بی‌قید درخواست می‌شد و برای
  // بیمارستانِ بدونِ‌لوگو هر صفحه‌ی چاپی یک ۴۰۴ در کنسول مرورگر می‌گذاشت؛ رویه‌ی فعلی
  // (نبودِ تصویر = حالتی که onerror با remove() می‌ساخت) عیناً حفظ می‌شود.
  const logo = (S.user && S.user.hospital_has_logo) ? '<img src="/api/hospital/logo" alt="" onerror="this.remove()">' : '';
  return `<div class="docletterhead">
    ${logo}
    <div><b>${esc((S.user&&S.user.hospital_name)||'')}</b>
      <span>${subtitle||''}</span></div>
  </div>`;
}
// bodyHtml داخل tbody می‌نشیند؛ head و foot روی هر صفحه‌ی کاغذ تکرار می‌شوند.
function printSheet(subtitle, bodyHtml, footNote){
  return `<table class="psheet">
    <thead><tr><td>${docLetterhead(subtitle)}</td></tr></thead>
    <tbody><tr><td>${bodyHtml}</td></tr></tbody>
    <tfoot><tr><td><div class="psheet-foot">
      <span>${esc((S.user&&S.user.hospital_name)||'')}</span>
      <span>${esc(footNote||'')}</span>
    </div></td></tr></tfoot>
  </table>`;
}

// ============ گزینه‌های استاندارد شماره ویرایش اسناد (نسخه اولیه تا ویرایش ۲۰) ============
const DOC_REVISION_OPTIONS = [
  { val: 0, label: 'نسخه اولیه' },
  { val: 1, label: 'ویرایش یک' },
  { val: 2, label: 'ویرایش دو' },
  { val: 3, label: 'ویرایش سه' },
  { val: 4, label: 'ویرایش چهار' },
  { val: 5, label: 'ویرایش پنج' },
  { val: 6, label: 'ویرایش شش' },
  { val: 7, label: 'ویرایش هفت' },
  { val: 8, label: 'ویرایش هشت' },
  { val: 9, label: 'ویرایش نه' },
  { val: 10, label: 'ویرایش ده' },
  { val: 11, label: 'ویرایش یازده' },
  { val: 12, label: 'ویرایش دوازده' },
  { val: 13, label: 'ویرایش سیزده' },
  { val: 14, label: 'ویرایش چهارده' },
  { val: 15, label: 'ویرایش پانزده' },
  { val: 16, label: 'ویرایش شانزده' },
  { val: 17, label: 'ویرایش هفده' },
  { val: 18, label: 'ویرایش هجده' },
  { val: 19, label: 'ویرایش نوزده' },
  { val: 20, label: 'ویرایش بیست' },
];

function revisionLabel(revNo) {
  const n = parseInt(revNo, 10);
  if (isNaN(n) || n <= 0) return 'نسخه اولیه';
  const opt = DOC_REVISION_OPTIONS.find(o => o.val === n);
  return opt ? opt.label : ('ویرایش ' + fa(n));
}

function revisionBadge(revNo) {
  const n = parseInt(revNo, 10);
  const txt = revisionLabel(n);
  const cls = (!n || n === 0) ? 'b1' : 'b2';
  return '<span class="bdg ' + cls + '">' + esc(txt) + '</span>';
}

function revisionSelectHtml(id, currentVal) {
  const cur = parseInt(currentVal, 10) || 0;
  return '<select id="' + id + '" class="sel" style="width:100%">' +
    DOC_REVISION_OPTIONS.map(o => '<option value="' + o.val + '" ' + (o.val === cur ? 'selected' : '') + '>' + esc(o.label) + ' (' + (o.val === 0 ? '۰' : fa(o.val)) + ')</option>').join('') +
  '</select>';
}

// نوار تاریخ: ایجاد / آخرین ویرایش / بازنگری بعدی / نسخه / ویرایش
function docDatesBar(d){
  const nr = nextReviewISO(d);
  const st = nr ? docReviewState(nr) : null;
  const cls = st ? (st.days < 0 ? 'over' : (st.days <= 30 ? 'due' : '')) : '';
  return '<div class="doc-dates">' +
    '<div><span>تاریخ ایجاد</span><b>' + faDateISO(d.created_at || d.prepared_date) + '</b></div>' +
    '<div><span>آخرین ویرایش</span><b>' + faDateISO(d.updated_at || d.last_review_date || d.created_at) + '</b></div>' +
    '<div><span>بازنگری بعدی' + (d.review_date ? '' : ' (خودکار — یک سال بعد)') + '</span>' +
      '<b class="' + cls + '">' + faDateISO(nr) + '</b></div>' +
    '<div><span>شماره نسخه</span><b>' + fa(d.version_no || 1) + '</b></div>' +
    '<div><span>شماره ویرایش</span><b style="color:var(--gdl)">' + revisionLabel(d.revision_no) + '</b></div>' +
  '</div>';
}
// محتوای فیلدهای متنیِ سند ممکن است HTML باشد (ویرایشگر شبیه ورد) یا متن ساده
// (رکوردهای قدیمی و seed). هر دو باید درست دیده شوند:
//  • HTML قبل از درج، با همان allow-list ویرایشگر پاک‌سازی می‌شود؛
//  • متن ساده مثل قبل escape می‌شود و فقط خطوطش حفظ می‌شود.
// هرگز innerHTML خام از دیتابیس درج نمی‌شود.
function docHtml(v){
  const raw = String(v == null ? '' : v);
  if(!raw.trim()) return '—';
  const looksHtml = /<(p|div|table|ul|ol|h[1-4]|br|span|strong|b|em|i)\b/i.test(raw);
  if(looksHtml && window.RichEditor) return `<div class="re-out">${RichEditor.sanitize(raw)}</div>`;
  return `<div class="re-out" style="white-space:pre-wrap">${esc(raw)}</div>`;
}
function faDateISO(iso){
  if(!iso) return '—';
  const j=parseStamp(iso); if(!j) return esc(String(iso));
  return jStr(j);
}
// تاریخ شمسی + ساعتِ تهران. برای created_at/submitted_at/signed_at و هر مُهر زمانی
function faDateTime(iso){
  if(!iso) return '—';
  const j=parseStamp(iso); if(!j) return esc(String(iso));
  if(!j.hasTime) return jStr(j);
  return jStr(j)+' ساعت '+fa(String(j.hh).padStart(2,'0'))+':'+fa(String(j.mi).padStart(2,'0'));
}
// فاصله‌ی زمانی نسبت به «حالا»ی تهران — «۲ ساعت پیش»، «دیروز»، …
function faSince(iso){
  const str=String(iso||'');
  const t=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
  if(!t) return faDateISO(iso);
  const diff=nowMs()-Date.UTC(+t[1],+t[2]-1,+t[3],+t[4],+t[5],+t[6]||0);
  if(diff<0) return faDateTime(iso);
  const min=Math.floor(diff/60000);
  if(min<1) return 'همین حالا';
  if(min<60) return fa(min)+' دقیقه پیش';
  const hr=Math.floor(min/60);
  if(hr<24) return fa(hr)+' ساعت پیش';
  const day=Math.floor(hr/24);
  if(day===1) return 'دیروز';
  if(day<7) return fa(day)+' روز پیش';
  return faDateTime(iso);
}
function jalaliDaysInMonth(jy,jm){
  if(jm<=6) return 31;
  if(jm<=11) return 30;
  return jalCal(jy).leap===0 ? 30 : 29;
}

const MIN_JYEAR=1395;
const MAX_JYEAR=1406;
function initialYear(){
  const cur=todayJalali().jy;
  const saved=+localStorage.getItem('sel_year');
  if(saved && saved>=MIN_JYEAR && saved<=cur+1) return saved;
  return cur;
}
let S = { user:null, page:'acc', axis:null, openSec:null, tree:null, byId:{}, sections:[], statusMap:{}, notesMap:{}, naMap:{}, revMap:{}, evalMap:{}, levelW:{1:1,2:1,3:1}, year:initialYear(), features:null };
window.S = S;
function yearSelectHtml(){
  const cur=todayJalali().jy;
  let opts='';
  for(let y=cur+1; y>=MIN_JYEAR; y--) opts+=`<option value="${y}" ${y===S.year?'selected':''}>${fa(y)}</option>`;
  return `<select onchange="setYear(this.value)">${opts}</select>`;
}
// وضعیت سنجه‌ها دوره‌ای است، پس با عوض شدن سال باید دوباره از سرور خوانده
// شود — وگرنه نقشه‌ی وضعیتِ سالِ قبلی روی صفحه‌ی سال جدید می‌ماند و کاربر
// خودارزیابیِ یک دوره را به اسم دوره‌ی دیگر می‌بیند.
async function setYear(v){
  S.year=+v; localStorage.setItem('sel_year', v);
  S.statusMap={}; S.notesMap={}; S.naMap={}; S.revMap={};
  try{
    const st=await API.statuses();
    (st.statuses||[]).forEach(x=>{ S.statusMap[x.measure_id]=x.status;
      if(x.notes) S.notesMap[x.measure_id]=x.notes;
      if(x.na_reason) S.naMap[x.measure_id]=x.na_reason;
      if(x.internal_status||x.external_status)
        S.revMap[x.measure_id]={i:x.internal_status||'', e:x.external_status||''}; });
  }catch(e){ /* اگر نشد، نقشه خالی می‌ماند: «بررسی‌نشده» — نه دادهٔ سال دیگر */ }
  toast('سال '+fa(v)+' انتخاب شد');
  go(S.page);
}

function toast(t, err){
  const d=document.createElement('div'); d.className='toast'; d.textContent=t;
  if(err) d.style.borderColor='var(--dn)', d.style.color='var(--dn)';
  document.body.appendChild(d); setTimeout(()=>d.remove(),2400);
}

// ---------- تفکیک راهنما از متن رسمی کتاب ----------
const BULLET='\uf076';
const TEXT_FIX=[['صالحیت','صلاحیت'],['صالح','صلاح'],['تملیل','تحلیل'],['اصالحی','اصلاحی'],['اطالع','اطلاع'],
['ممهدود','محدود'],['ممدودیت','محدودیت'],['ممدود','محدود'],['ممتوا','محتوا'],['مملول','محلول'],
['تسهیالت','تسهیلات'],['عروری','ضروری'],['عرایب','ضرایب'],['وععیت','وضعیت'],['پا سازی','پاکسازی'],
['عدعفونی','ضدعفونی'],['ترشمات','ترشحات'],['لماظ','لحاظ'],['مالحظه','ملاحظه'],['اصالح','اصلاح'],
['سالمت','سلامت'],['اسالمی','اسلامی'],['بهداشهت','بهداشت'],['مموری','محوری'],['عمن ','ضمن '],
['پرسهتاری','پرستاری'],['مشهارکت','مشارکت'],['سهوپروایزر','سوپروایزر'],['آموزشهی','آموزشی'],
['مههارت','مهارت'],['برنامهه','برنامه'],['بکهارگیری','بکارگیری'],['تعیهین','تعیین'],
// خطای رایج OCR کتاب: لیگاتور «لا» به‌صورت «ال» استخراج شده. هر جفت روی کل متن
// کتاب صحت‌سنجی شده تا واژه درستی مثل «بالینی/انتقال/فعال/سال» را خراب نکند.
['الزم','لازم'],['ابالغ','ابلاغ'],['اخالق','اخلاق'],['مسئوال','مسئولا'],['باال','بالا'],
['بالیا','بلایا'],['مشکالت','مشکلات'],['مداخالت','مداخلات'],['اقالم','اقلام'],
['عالئم','علائم'],['عالیم','علایم'],['مالقات','ملاقات'],['اختالل','اختلال'],
['عالوه','علاوه'],['مالحظات','ملاحظات'],['فرموالری','فرمولاری'],['بالفاصله','بلافاصله'],
['خالصه','خلاصه'],['مبتال','مبتلا'],['دالیل','دلایل'],['اتصاالت','اتصالات'],
['معموال','معمولا'],['تعامالت','تعاملات'],['اعالم','اعلام'],['اطالق','اطلاق'],['کاال','کالا']];

function fixText(t){
  if(!t) return '';
  let s=t; TEXT_FIX.forEach(([a,b])=>{ s=s.split(a).join(b); });
  return s.replace(/\s+/g,' ').trim();
}
const EXPL=/(?:^|\s)((?:منظور از|مقصود|مالک ارزیابی|ملاک ارزیابی|توجه|تبصره|این استاندارد|مستندات|شواهد)\b[\s\S]*)$/;

function parseGuide(raw){
  if(!raw) return {acts:[], note:''};
  let s=raw.split('\uf0a7').join(BULLET).split('\uf0b7').join(BULLET);
  if(s.indexOf(BULLET)===-1) return {acts:[], note:fixText(s)};
  const segs=s.split(BULLET).map(x=>x.trim()).filter(Boolean);
  const acts=[]; let note='';
  segs.forEach((seg,i)=>{
    if(i===segs.length-1 && seg.length>200){
      const m=EXPL.exec(seg);
      if(m){ acts.push(fixText(seg.slice(0,m.index))); note=fixText(m[1]); return; }
      let sp=null; const re=/\.\s+/g; let mm;
      while((mm=re.exec(seg))){ if(seg.length-re.lastIndex>=80){ sp=re.lastIndex; break; } }
      if(sp){ acts.push(fixText(seg.slice(0,sp))); note=fixText(seg.slice(sp)); }
      else note=fixText(seg);
    } else acts.push(fixText(seg));
  });
  return {acts:acts.filter(a=>a.length>8), note};
}
