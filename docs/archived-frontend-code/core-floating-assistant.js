/**
 * Core Dana Floating Assistant
 * Modular Frontend Component — Project 313
 */
// ==================== دستیار هوشمند داخلی (دکمه‌ی شناور) ====================
// طبق درخواست صریح کاربر، این دیگر یک «فهرست گام» که خودش را نشان بدهد نیست؛ یک دستیار
// است که کاربر هر وقت گیر کرد رویش می‌زند و دقیقاً دو چیز می‌پرسد:
//   ۱) «الان باید چه کار کنم؟»  → یک کارِ در نوبت، طبق برنامه‌ریزی فاز‌به‌فاز، با دکمه‌ای
//      که همان کادرِ دقیقی را که باید پر شود روی صفحه پیدا و برجسته می‌کند.
//   ۲) «بررسی وظایف من»          → حسابرسی کامل: چه چیزی انجام شده، چه چیزی مانده، و برای
//      هر مورد شمردنی «چند از چند» — از داده‌ی واقعی، نه حدس.
//
// تفاوت مهم با نسخه‌ی قبلی: آن نسخه وقتی همه‌ی گام‌ها تمام می‌شد دکمه را از روی دکل
// «حذف» می‌کرد (b.remove())، برای همین کاربر بعد از راه‌اندازی دیگر هیچ دستیاری در
// محصول نمی‌دید. حالا دکمه همیشه هست — چون پرسش دوم («چه چیزی مانده؟») بعد از
// راه‌اندازی هم معنا دارد و باید همیشه در دسترس باشد.
//
// منبع حقیقت: GET /api/assistant/next و /api/assistant/review — هر دو روی همان
// guide-timeline سوارند که وضعیت را از داده‌ی واقعی حساب می‌کند. هیچ درصدی اینجا ساخته
// نمی‌شود و هیچ چیزی سمت کلاینت «انجام‌شده» فرض نمی‌شود.
// دامنه‌ی نقش: سرور خودش گام‌ها را با مجوز همان کاربر فیلتر می‌کند، پس هر سمت فقط
// وظایف خودش را می‌بیند.
let GUIDE_STATE=null;              // نگهدارنده‌ی وضعیت باز/بسته و نمای فعلی دستیار
const ASSIST={view:'next', data:null, loading:false, chatId:null, chatMsgs:[], chatSending:false};
// دستیار «دانا» دو تکه‌ی مستقل دارد: راهنمای «الان چه کار کنم/بررسی وظایف» (روی
// داده‌ی واقعیِ خودِ سامانه، رایگان) و گفت‌وگوی آزاد («از دانا بپرس»، لایه‌ی دومش
// می‌تواند به API بیرونی برود). کارفرما فقط گفت‌وگوی آزاد را موقتاً نمی‌خواهد؛
// راهنما باید بماند. کد و API هر دو دست‌نخورده‌اند، فقط دکمه‌ی منو ساخته نمی‌شود.
const DANA_ENABLED=true;
// گفت‌وگوی آزاد حالا کلیدِ سوپرادمین دارد (assistant_hospital_settings.chat_enabled)
// و دیگر ثابتِ کدنویسی نیست. پیش‌فرض false است تا اگر پاسخ سرور دیر برسد، تبِ
// «بپرس» یک لحظه ظاهر و ناپدید نشود؛ enterApp مقدار واقعی را می‌گذارد.
let DANA_CHAT_ENABLED=false;
function ensureGuideDockBtn(){
  if(!DANA_ENABLED) return null;
  const dock=ensureFloatDock();
  let b=$('guideDockBtn');
  if(!b){
    b=document.createElement('button'); b.type='button'; b.className='dock-btn gold'; b.id='guideDockBtn';
    b.setAttribute('aria-label','دستیار هوشمند — الان چه کار کنم؟ / بررسی وظایف'); b.title='دستیار هوشمند';
    // آیکون دستیار: حبابِ گفت‌وگو با یک جرقه‌ی کوچک داخلش.
    //
    // قبلاً یک ستاره‌ی چهارپَرِ بزرگ با دو نقطه‌ی چشمک‌زن و دو حلقه‌ی نبض بود؛
    // کاربر گفت آیکون خوب نیست و حق داشت: ستاره هیچ معنایی از «دستیار» نمی‌رساند
    // (هر چیزی می‌توانست باشد) و پنج چیزِ متحرک هم‌زمان، شلوغ بود.
    // حبابِ گفت‌وگو بلافاصله یعنی «از من بپرس»، و جرقه‌ی داخلش وجهِ «هوشمند» را
    // می‌رساند. یک حلقه‌ی نبضِ آرام کافی است.
    b.innerHTML=
      '<span class="asst-mark" aria-hidden="true">'+
        '<span class="asst-ring"></span>'+
        '<svg class="asst-svg" viewBox="0 0 32 32" focusable="false">'+
          // طیف عمداً روشن است: دکمه خودش سبز است و طیفِ قبلی از سبزِ تیره شروع می‌شد،
          // پس لبه‌ی چپ حباب در زمینه گم می‌شد. این مقادیر روی همان دکمه کنتراست دارند.
          '<defs><linearGradient id="asstG" x1="0" y1="0" x2="1" y2="1">'+
            '<stop offset="0%" stop-color="#d8fbec"/><stop offset="55%" stop-color="#9df3d3"/>'+
            '<stop offset="100%" stop-color="#f2dda6"/></linearGradient></defs>'+
          '<path class="asst-bubble" fill="none" stroke="url(#asstG)" stroke-width="2.3" '+
            'stroke-linejoin="round" stroke-linecap="round" '+
            'd="M10.5 6H22a5.5 5.5 0 0 1 5.5 5.5v5A5.5 5.5 0 0 1 22 22h-8.2l-4.6 4.1V22H10.5A5.5 5.5 0 0 1 5 16.5v-5A5.5 5.5 0 0 1 10.5 6Z"/>'+
          '<path class="asst-spark" fill="url(#asstG)" '+
            'd="M16.2 9.9l1.3 3.1 3.1 1.3-3.1 1.3-1.3 3.1-1.3-3.1-3.1-1.3 3.1-1.3 1.3-3.1Z"/>'+
        '</svg>'+
      '</span>'+
      '<span class="dock-badge" id="guideDockBadge"></span>';
    b.addEventListener('click',guideWidgetToggle);
    dock.insertBefore(b, dock.firstChild); // همیشه بالای ستون
  }
  return b;
}
function ensureGuidePanel(){
  let p=$('guidePanel');
  if(!p){ p=document.createElement('div'); p.id='guidePanel'; p.className='gwid-panel'; document.body.appendChild(p); }
  return p;
}
// فقط دکمه و بجِ «چند کار مانده» را تازه می‌کند؛ پنل را باز نمی‌کند. روی هر ناوبری صدا
// زده می‌شود، پس عمداً سبک است (یک درخواست کوچک) و هرگز پنل را به‌زور جلوی کاربر نمی‌آورد.
async function renderGuideWidget(){
  if(!DANA_ENABLED) return;
  if(!S.user){ const b=$('guideDockBtn'); if(b) b.remove(); const p=$('guidePanel'); if(p) p.classList.remove('open'); return; }
  const btn=ensureGuideDockBtn();
  try{
    const r=await API.assistantReview();
    const badge=$('guideDockBadge');
    if(badge) badge.textContent = (r && r.configured && r.remaining_count>0) ? fa(r.remaining_count) : '';
  }catch(e){ /* بج فقط یک نشانه‌ی کمکی است؛ اگر نیامد دکمه سر جایش می‌ماند */ }
  const panel=$('guidePanel');
  if(panel && panel.classList.contains('open')) assistRender();
}
function guideWidgetClose(){
  const p=$('guidePanel');
  if(p) p.classList.remove('open');
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

