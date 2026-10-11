/**
 * Core Visual Theme & Glassmorphism
 * Modular Frontend Component — Project 313
 */
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
// کشوی «تنظیمات نمایش» — دیگر دکمه‌ی همیشه‌نمایان مستقل روی دکل نیست؛ فقط از
// آیتم «تنظیمات ظاهری» داخل پاپ‌آور دکمه‌ی منو باز می‌شود (window.toggleSettDrawer).
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

