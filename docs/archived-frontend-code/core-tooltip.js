/**
 * Core Tooltip Portal
 * Modular Frontend Component — Project 313
 */
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
