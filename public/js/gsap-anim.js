/**
 * لایه‌ی نازک انیمیشن (GSAP) برای دو صفحه‌ی هاب — اعتباربخشی و مسئولیت من.
 *
 * چرا اینجا و نه پخش‌شده در app.js: این توابع صرفاً «جلوه» هستند، نه منطق. جدا
 * نگه‌داشتنشان یعنی اگر روزی کتابخانه عوض شد یا کاربر انیمیشن را خاموش کرد،
 * فقط همین یک فایل دست می‌خورد.
 *
 * قاعده‌ی احترام به ترجیح کاربر: پروژه از قبل یک سوییچ سراسری دارد
 * (html[data-anim="off"]، در تنظیمات ظاهری + prefers-reduced-motion). همان
 * سوییچ اینجا هم رعایت می‌شود — اگر خاموش باشد یا GSAP بارگذاری نشده باشد،
 * توابع مقدار نهایی را مستقیم می‌نویسند (بدون انیمیشن)، نه اینکه ساکت هیچ‌کاری
 * نکنند و عدد/نوار خالی بماند.
 */
(function(){
  function on(){ return document.documentElement.getAttribute('data-anim')!=='off' && !!window.gsap; }

  // ورودی پلکانی کارت‌ها/ردیف‌ها — برای معرفی محتوای تازه‌رندرشده‌ی یک صفحه‌ی هاب
  function staggerIn(selector, root){
    const els=(root||document).querySelectorAll(selector);
    if(!els.length) return;
    if(!on()){ els.forEach(el=>{ el.style.opacity=1; el.style.transform='none'; }); return; }
    gsap.killTweensOf(els);
    gsap.fromTo(els, {opacity:0, y:16}, {opacity:1, y:0, duration:.5, ease:'power2.out', stagger:.06, clearProps:'transform'});
  }

  // شمارش عدد از صفر تا مقدار واقعی روی متنِ خودِ عنصر — برای درصدهای پیشرفت
  function countUp(el, target, opts){
    if(!el) return;
    opts=opts||{};
    const suffix=opts.suffix||'', toFa=opts.toFa;
    const write=v=>{ el.textContent=(toFa?toFa(v):String(v))+suffix; };
    if(!on()){ write(target); return; }
    const obj={v:0};
    gsap.to(obj,{v:target, duration:opts.duration||1.1, delay:opts.delay||0, ease:'power1.out',
      onUpdate(){ write(Math.round(obj.v)); }});
  }

  // رشدِ نوارِ پیشرفت از صفر تا درصدِ واقعی، به‌جای اینکه یک‌باره پر ظاهر شود
  function growBar(el, pct, opts){
    if(!el) return;
    opts=opts||{};
    if(!on()){ el.style.width=pct+'%'; return; }
    gsap.fromTo(el, {width:'0%'}, {width:pct+'%', duration:opts.duration||1.1, delay:opts.delay||.1, ease:'power2.out'});
  }

  // رشدِ حلقه‌ی دایره‌ای پیشرفت (SVG stroke-dashoffset) از خالی تا درصدِ واقعی —
  // همان الگوی growBar، برای گِیجِ دایره‌ای «پیشرفت کل».
  function growRing(el, pct, circumference, opts){
    if(!el) return;
    opts=opts||{};
    const target=circumference*(1-pct/100);
    if(!on()){ el.style.strokeDashoffset=target; return; }
    gsap.fromTo(el, {strokeDashoffset:circumference}, {strokeDashoffset:target, duration:opts.duration||1.3, delay:opts.delay||.1, ease:'power2.out'});
  }

  // نبضِ ملایمِ طلایی روی کارت‌هایی که هنوز کامل نشده‌اند — دعوتِ چشمی به
  // «این را باید پر کنید»، نه هشدار قرمز؛ کارت‌های ۱۰۰٪ هرگز این کلاس را نمی‌گیرند.
  // نبض را روی خودِ کارت (box-shadow چندتکه‌ای شامل inset) نمی‌زنیم — درون‌یابیِ
  // GSAP وقتی شکلِ سایه‌ی مبدأ و مقصد یکی نباشد (مثلاً یکی inset دارد یکی ندارد)
  // بی‌صدا شکست می‌خورد: تویین اجرا می‌شود (progress پیش می‌رود) ولی هیچ استایلی
  // نوشته نمی‌شود. به‌جایش یک لایه‌ی حلقه‌ی جدا (`.fillring`، در HTML خودِ کارت
  // کنار needs-fill چاپ می‌شود) را فقط با opacity — یک مشخصه‌ی ساده و مطمئن —
  // نبض می‌دهیم؛ کارت‌های ۱۰۰٪ اصلاً این حلقه را در HTML ندارند.
  function pulseNeedsFill(selector, root){
    const els=(root||document).querySelectorAll(selector);
    if(!els.length) return;
    if(!on()) return;
    gsap.killTweensOf(els);
    gsap.set(els, {opacity:0});
    els.forEach((el,i)=>{
      gsap.to(el, { opacity:1, duration:1.2, ease:'sine.inOut', repeat:-1, yoyo:true, delay:.4+i*.15 });
    });
  }

  function killPulse(selector, root){
    if(!window.gsap) return;
    const els=(root||document).querySelectorAll(selector);
    if(!els.length) return;
    gsap.killTweensOf(els);
    els.forEach(el=>{ el.style.opacity=''; });
  }

  // قبل از جایگزینیِ innerHTML یک کانتینر که قبلاً روی آن GAnim اجرا شده، این را
  // صدا بزنید — وگرنه نبض‌های بی‌پایان (repeat:-1) روی گره‌های DOM حذف‌شده در
  // حافظه باقی می‌مانند و با هر رفت‌وبرگشت کاربر بین دو تبِ هاب، یکی روی دیگری
  // انباشته می‌شود (نشتی حافظه/CPU در یک شیفتِ کاری طولانی).
  function killAllIn(root){
    if(!window.gsap || !root) return;
    const els=root.querySelectorAll('*');
    if(els.length) gsap.killTweensOf(els);
  }

  window.GAnim={ staggerIn, countUp, growBar, growRing, pulseNeedsFill, killPulse, killAllIn, enabled:on };
})();
