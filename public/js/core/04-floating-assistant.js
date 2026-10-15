/**
 * Core Floating Assistant & Header Nav
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function renderGuideWidget(){
  if(!DANA_ENABLED) return;
  if(!S.user){ const b=$('guideDockBtn'); if(b) b.remove(); const p=$('guidePanel'); if(p) p.classList.remove('open'); return; }
  const btn=ensureGuideDockBtn();
  try{
    const r=await API.assistantReview();
    const badge=$('ent-assistant-badge') || $('guideDockBadge');
    if(badge){
      const count = (r && r.configured && r.remaining_count>0) ? fa(r.remaining_count) : '';
      badge.textContent = count;
      badge.style.display = count ? 'inline-flex' : 'none';
    }
  }catch(e){ /* بج فقط یک نشانه‌ی کمکی است؛ اگر نیامد دکمه سر جایش می‌ماند */ }
  const panel=$('guidePanel');
  if(panel && panel.classList.contains('open')) assistRender();
}
function guideWidgetClose(){
  const p=$('guidePanel');
  if(p) p.classList.remove('open');
  if(window.closeEnterpriseAssistant) window.closeEnterpriseAssistant();
}
// بستن با کلیک بیرون و با Escape.
//
// گزارش کاربر: «روی دستیار می‌زنیم، بعد روی صفحه می‌زنیم، بسته نمی‌شود.» درست بود —
// پنل فقط با خود دکمه یا دکمه‌ی «–» بسته می‌شد، پس هر پنل شناوری که کاربر انتظار
// دارد با کلیک بیرون جمع شود، اینجا باز می‌ماند و جلوی محتوا را می‌گرفت.
//
// شنونده یک‌بار و روی document ثبت می‌شود (نه در هر باز شدن) تا با باز/بسته‌های
// پیاپی شنونده روی هم انباشته نشود. کلیک روی خودِ دکمه استثناست، وگرنه این شنونده
// همان کلیکی را که دارد پنل را باز می‌کند بلافاصله می‌بندد.
let ASSIST_DISMISS_BOUND=false;
function bindAssistDismiss(){
  if(ASSIST_DISMISS_BOUND) return;
  ASSIST_DISMISS_BOUND=true;
  document.addEventListener('mousedown', e=>{
    const p=$('guidePanel');
    if(!p || !p.classList.contains('open')) return;
    if(p.contains(e.target)) return;                       // کلیک داخل خود پنل
    if(e.target.closest && e.target.closest('#guideDockBtn')) return;  // خود دکمه، تا toggle کار کند
    guideWidgetClose();
  });
  document.addEventListener('keydown', e=>{
    if(e.key!=='Escape') return;
    const p=$('guidePanel');
    if(p && p.classList.contains('open')) guideWidgetClose();
  });
}
function guideWidgetToggle(){
  if(!DANA_ENABLED) return;
  if(window.toggleEnterpriseAssistant){ window.toggleEnterpriseAssistant(); return; }
  const panel=ensureGuidePanel();
  bindAssistDismiss();
  const open=!panel.classList.contains('open');
  panel.classList.toggle('open', open);
  // یک منوی جداگانه («کدام‌یک را می‌خواهید؟») قبلاً اولین چیزی بود که کاربر می‌دید —
  // یک کلیکِ اضافه قبل از رسیدن به خودِ جواب. حالا با گفت‌وگو کنار گذاشته‌شده، فقط دو
  // تب می‌ماند، پس مستقیم روی همان تبِ آخر باز می‌شود و بلافاصله داده‌اش را می‌خواند.
  if(open) assistOpen(ASSIST.view==='chat' && !DANA_CHAT_ENABLED ? 'next' : ASSIST.view);
}
// تب‌های سرِ پنل — «از دانا بپرس» فقط وقتی DANA_CHAT_ENABLED باشد اضافه می‌شود.
function assistTabsHtml(){
  const tabs=[
    DANA_CHAT_ENABLED?{v:'chat', t:'بپرس'}:null,
    {v:'next', t:'الان چه کار کنم؟'},
    {v:'review', t:'بررسی وظایف'},
  ].filter(Boolean);
  return `<div class="gwid-tabs">${tabs.map(t=>
    `<button type="button" class="gwid-tab ${ASSIST.view===t.v?'on':''}" onclick="assistOpen('${t.v}')">${esc(t.t)}</button>`
  ).join('')}</div>`;
}
function assistBack(){ assistOpen('next'); }
async function assistOpen(view){
  if(view==='chat' && !DANA_CHAT_ENABLED) view='next';
  ASSIST.view=view; ASSIST.data=null; ASSIST.loading=true;
  if(view==='chat'){ ASSIST.chatId=null; ASSIST.chatMsgs=[]; ASSIST.loading=false; assistRender(); return; }
  assistRender();
  try{
    ASSIST.data = view==='next' ? await API.assistantNext() : await API.assistantReview();
  }catch(e){ ASSIST.data={_error:e.message}; }
  ASSIST.loading=false; assistRender();
}
// ---- نمای ۴: «از دانا بپرس» — گفت‌وگوی آزاد، لایه‌ی داخلی همیشه اول است ----
function assistSendPrompt(text){
  const inp=$('assistChatInput');
  if(inp) inp.value=text;
  assistSend(new Event('submit'));
}
function assistChatHtml(){
  const msgs=ASSIST.chatMsgs;
  const list = !msgs.length
    ? `<div class="assist-empty">
        <div class="assist-empty-t">دستیار هوشمند دانا</div>
        <div class="assist-empty-d">پاسخگوی سنجه‌ها، قوانین اعتباربخشی، ثبت خطاها و تحلیل کیفیت بیمارستان.</div>
        <div class="assist-chips" style="display:flex;flex-direction:column;gap:6px;margin-top:14px;text-align:right">
          <button type="button" class="btn btn-sm btn-o" style="text-align:right;justify-content:flex-start;font-size:11.5px;padding:6px 10px" onclick="assistSendPrompt('وضعیت سنجه‌های ایمنی بیمار چطوره؟')">🛡️ وضعیت سنجه‌های ایمنی بیمار</button>
          <button type="button" class="btn btn-sm btn-o" style="text-align:right;justify-content:flex-start;font-size:11.5px;padding:6px 10px" onclick="assistSendPrompt('چطور خطای دارویی یا پزشکی ثبت کنم؟')">⚠️ راهنمای ثبت خطای پزشکی و وقایع ۲۸گانه</button>
          <button type="button" class="btn btn-sm btn-o" style="text-align:right;justify-content:flex-start;font-size:11.5px;padding:6px 10px" onclick="assistSendPrompt('مستندات و الزامات کانون ارزیابی')">📋 الزامات مستندات اعتباربخشی</button>
          <button type="button" class="btn btn-sm btn-o" style="text-align:right;justify-content:flex-start;font-size:11.5px;padding:6px 10px" onclick="assistSendPrompt('تحلیل FMEA و اقدامات اصلاحی RCA')">🔍 تحلیل علل ریشه‌ای RCA و FMEA</button>
        </div>
      </div>`
    : msgs.map(m=>`<div class="chat-msg ${m.role==='user'?'me':'ai'}">
        <div class="chat-bub">${esc(m.content)}${m.source==='external'?'<span class="chat-src">کمک پیشرفته</span>':''}</div>
      </div>`).join('');
  return `<div class="chat-list" id="assistChatList">${list}</div>
    <form class="chat-input-row" onsubmit="assistSend(event)">
      <input type="text" id="assistChatInput" class="chat-input" placeholder="سؤالت را بنویس…" ${ASSIST.chatSending?'disabled':''} autocomplete="off">
      <button type="submit" class="btn btn-g btn-sm" ${ASSIST.chatSending?'disabled':''}>${ASSIST.chatSending?'…':'ارسال'}</button>
    </form>`;
}
async function assistSend(ev){
  ev.preventDefault();
  const inp=$('assistChatInput');
  const text=(inp&&inp.value||'').trim();
  if(!text || ASSIST.chatSending) return;
  ASSIST.chatMsgs.push({role:'user', content:text});
  if(inp) inp.value='';
  ASSIST.chatSending=true; assistRender();
  try{
    const r=await API.assistantChat(text, ASSIST.chatId);
    ASSIST.chatId=r.conversationId;
    ASSIST.chatMsgs.push({role:'assistant', content:r.reply, source:r.source});
  }catch(e){
    ASSIST.chatMsgs.push({role:'assistant', content:e.message||'خطایی پیش آمد', source:'internal'});
  }
  ASSIST.chatSending=false; assistRender();
  const list=$('assistChatList'); if(list) list.scrollTop=list.scrollHeight;
}
// ---- نمای ۲: «الان باید چه کار کنم؟» ----
function assistNextHtml(d){
  if(d._error) return `<div class="gwid-sub">${esc(d._error)}</div>
    <button class="btn btn-o btn-sm" onclick="assistOpen('next')">تلاش دوباره</button>`;
  if(!d.configured) return `<div class="assist-empty">
      <div class="assist-empty-t">هنوز برنامه‌ریزی شروع نشده</div>
      <div class="assist-empty-d">${esc(d.message)}</div>
      <button class="btn btn-g btn-sm" onclick="guideGoTo('${d.page||'settings'}')">برو به تنظیمات ›</button>
    </div>`;
  if(d.all_done) return `<div class="assist-empty">
      <div class="assist-empty-t">🎉 کار جدیدی در نوبت نیست</div>
      <div class="assist-empty-d">${esc(d.message)}</div>
    </div>`;
  const n=d.now;
  return `<div class="assist-now">
      <div class="gwid-phase">${esc(n.phaseLabel||'')}${n.cadenceLabel?`<span class="duty-cad">${esc(n.cadenceLabel)}</span>`:''}</div>
      <div class="gwid-title">${esc(n.title)}</div>
      <div class="gwid-desc">${esc(n.desc)}</div>
      ${n.gap?`<div class="gwid-prog">${fa(n.gap.have)} از ${fa(n.gap.total)} انجام شده — ${fa(n.gap.missing)} مورد مانده</div>`:''}
      <div class="gwid-actions">
        <button class="btn btn-g btn-sm" onclick="guideGoTo('${n.page}'${n.field?`,'${n.field}'`:''})">برو و همین را پر کن ›</button>
        <button class="btn btn-ok btn-sm" onclick="guideDone('${n.key}')" title="این مورد را انجام داده‌اید">✅ انجام دادم</button>
        <button class="btn btn-o btn-sm" onclick="guideSnooze('${n.key}')" title="۳ روز دیگر دوباره یادآوری شود">⏰ بعداً</button>
      </div>
    </div>
    ${d.then && d.then.length?`<div class="assist-then">
      <div class="assist-then-hd">بعد از این، به‌ترتیب:</div>
      ${d.then.map((t,i)=>`<div class="assist-then-row"><span class="assist-then-n">${fa(i+2)}</span>${esc(t.title)}</div>`).join('')}
    </div>`:''}
    <div class="gwid-sub">${fa(d.remaining_count)} مورد در مجموع باقی مانده است.</div>`;
}
// ---- نمای ۳: «بررسی وظایف من» ----
function assistReviewHtml(d){
  if(d._error) return `<div class="gwid-sub">${esc(d._error)}</div>
    <button class="btn btn-o btn-sm" onclick="assistOpen('review')">تلاش دوباره</button>`;
  if(!d.configured) return `<div class="assist-empty">
      <div class="assist-empty-t">هنوز برنامه‌ریزی شروع نشده</div>
      <div class="assist-empty-d">${esc(d.message)}</div>
      <button class="btn btn-g btn-sm" onclick="guideGoTo('${d.page||'settings'}')">برو به تنظیمات ›</button>
    </div>`;
  return `<div class="gwid-bar"><i style="width:${d.percent}%"></i></div>
    <div class="gwid-sub">${fa(d.done_count)} از ${fa(d.total)} وظیفه انجام شده (${fa(d.percent)}٪) — ${fa(d.remaining_count)} مورد مانده</div>
    <div class="gwid-full">
      ${d.groups.map(g=>`
        <div class="gwid-phase-hd">${esc(g.phaseLabel)} <span class="assist-gcount">${fa(g.done)}/${fa(g.total)}</span></div>
        ${g.items.map(it=>`<div class="gwid-row ${it.done?'done':''}">
          <span class="gwid-row-ck">${it.done?'✓':'○'}</span>
          <div class="gwid-row-b">
            <div class="gwid-row-t">${esc(it.title)}${it.cadenceLabel?`<span class="duty-cad">${esc(it.cadenceLabel)}</span>`:''}</div>
            ${!it.done?`<div class="gwid-row-d">${esc(it.desc)}</div>
              ${it.gap?`<div class="gwid-prog">${fa(it.gap.have)} از ${fa(it.gap.total)} — ${fa(it.gap.missing)} مورد مانده</div>`:''}
              <div class="gwid-actions">
                <button class="btn btn-g btn-sm" onclick="guideGoTo('${it.page}'${it.field?`,'${it.field}'`:''})">برو به آنجا ›</button>
                <button class="btn btn-ok btn-sm" onclick="guideDone('${it.key}')">✅ انجام دادم</button>
              </div>`:''}
          </div>
        </div>`).join('')}
      `).join('')}
    </div>`;
}
function assistRender(){
  const panel=ensureGuidePanel();
  if(!panel.classList.contains('open')) return;
  if(ASSIST.view==='chat'){
    panel.innerHTML=`<div class="gwid gwid-chat">
      <div class="gwid-hd">
        <button class="assist-back" onclick="assistBack()" title="بازگشت">›</button>
        <span class="gwid-ic">✦</span><b>از دانا بپرس</b>
        <button class="gwid-x" onclick="guideWidgetToggle()" title="بستن">–</button>
      </div>
      ${assistChatHtml()}
    </div>`;
    const inp=$('assistChatInput'); if(inp) inp.focus();
    const list=$('assistChatList'); if(list) list.scrollTop=list.scrollHeight;
    return;
  }
  const body = ASSIST.loading ? `<div class="gwid-sub">در حال بررسی…</div>`
    : (ASSIST.view==='next' ? assistNextHtml(ASSIST.data||{}) : assistReviewHtml(ASSIST.data||{}));
  panel.innerHTML=`<div class="gwid">
    <div class="gwid-hd">
      <span class="gwid-ic">${ic('sparkle')}</span><b>دانا — دستیار هوشمند</b>
      <button class="gwid-x" onclick="guideWidgetToggle()" title="بستن">–</button>
    </div>
    ${assistTabsHtml()}
    ${body}
  </div>`;
}
// «✅ انجام دادم» — پنهان‌سازی دستی (اگر داده‌ی واقعی هنوز ناقص باشد و این گام DB-verified
// باشد، وضعیت done همچنان از داده‌ی واقعی می‌آید؛ این فقط برای وقتی است که ثبت هنوز روی
// سرور دیده نشده یا گام ذاتاً چک‌لیستی نیست، مثل «آشنایی با ماژول»).
async function guideDone(key){
  try{ await API.dismissGuideMilestone(key); toast('علامت زده شد: انجام دادید ✓'); assistOpen(ASSIST.view); renderGuideWidget(); }
  catch(e){ toast(e.message,true); }
}
// «⏰ بعداً یادآوری کن» — برخلاف بالا هرگز برای همیشه محو نمی‌شود؛ راهنما «پیگیر» است:
// بعد از ۳ روز اگر داده‌ی واقعی هنوز نشان دهد گام انجام نشده، خودش دوباره در ویجت برمی‌گردد.
async function guideSnooze(key){
  try{ const r=await API.snoozeGuideMilestone(key,3); toast('تا '+faDateISO(r.until)+' دوباره یادآوری می‌شود'); assistOpen(ASSIST.view); renderGuideWidget(); }
  catch(e){ toast(e.message,true); }
}
// امتداد الگوی «؟» محلی به سطح صفحه: هم صفحه را عوض می‌کند هم سرتیتر مقصد را فلاش می‌کند.
// اگر fieldId داده شده باشد (شناسه‌ی همان input/select که در FIELD_GUIDES هم تعریف شده)،
// علاوه بر فلاش سرتیتر، خودِ جعبه‌ی آن فیلد هم پیدا و با هاله‌ی طلایی مشخص می‌شود — دقیقاً
// همان سطح دقتی که کاربر خواسته بود: نه فقط «برو به این صفحه» بلکه «این کادر را پر کن».
function guideGoTo(page, fieldId){
  go(page); closeSidebar();
  setTimeout(()=>{ const h=$('ptitle'); if(h){ h.classList.remove('gwid-flash'); void h.offsetWidth; h.classList.add('gwid-flash'); } },60);
  if(fieldId){
    // فرم مقصد ممکن است چند تیک بعد رندر شود (fetch async)؛ چند بار با فاصله تلاش می‌کنیم
    let tries=0;
    const tryHighlight=()=>{
      tries++;
      const el=$(fieldId);
      const wrap = el && el.closest('.fg');
      if(wrap){
        wrap.scrollIntoView({behavior:'smooth', block:'center'});
        wrap.classList.remove('gfield-flash'); void wrap.offsetWidth; wrap.classList.add('gfield-flash');
        try{ el.focus({preventScroll:true}); }catch(e){}
      } else if(tries<10){ setTimeout(tryHighlight, 250); }
    };
    setTimeout(tryHighlight, 200);
  }
}
async function maybeShowOnboarding(force){
  // فقط کسی که مجوز نوشتن پروفایل را دارد ویزارد را می‌بیند؛ وگرنه فرمی نشان می‌دادیم
  // که ثبتش حتماً ۴۰۳ می‌گرفت.
  if(!(S.user?.permissions||[]).includes('manage_hospital_settings')) return;
  try{
    const r=await API.hospitalProfile();
    if((!r.completed||force) && !$('onbOvl')){
      const prof=r.profile||{};
      try{ const per=await API.accreditationPeriod(); if(per.period&&per.period.start_year) prof.start_year=per.period.start_year; }catch(e){}
      renderOnboarding(prof);
    }
  }catch(e){ /* سکوت: اگر endpoint در دسترس نبود ویزارد نمایش داده نمی‌شود */ }
}

// نشان بزرگ «نمونه فرم» برای صفحه جزئیات/ویرایش رکوردهای الگو
function exBanner(row, extra){
  if(!row || !row.is_example) return '';
  return `<div class="exbanner${extra?' '+extra:''}">
    <span class="exb-ic">◆</span>
    <div><b>این یک «نمونه فرم» است — داده واقعی بیمارستان نیست</b>
    <span>برای آموزش نحوه تکمیل صحیح این ماژول ساخته شده است. می‌توانید آن را بخوانید، از رویش کپی بگیرید، ویرایش کنید یا هر وقت خواستید حذفش کنید؛ پس از حذف دوباره ساخته نمی‌شود.</span></div></div>`;
}

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
      <img class="syn-mk" src="/img/synapse-mark.png" alt="سیناپس" width="36" height="36">
      <b>سیناپس</b>
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
  const yr=new Date().toLocaleDateString('fa-IR', { year: 'numeric' });
  el.innerHTML=`
  <div class="gftr-in">
    <div class="gftr-brand"><img class="syn-mk" src="/img/synapse-mark.png" alt="سیناپس" width="36" height="36">
      <div><b>سیناپس</b>
      <span>سامانه یکپارچه نظارت، اعتباربخشی و پایش سلامت — بستری ابری و یکپارچه برای مراکز درمانی عضو.</span></div></div>
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
    <span>© ${fa(yr)} سیناپس — سامانه یکپارچه نظارت، اعتباربخشی و پایش سلامت — تمام حقوق محفوظ است.</span>
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
