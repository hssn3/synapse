/**
 * Corporate Catalog Part 4
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function renderRoleMosaic(){
  const box=$('roleMosaic'); if(!box) return;
  // ترتیبِ داخلِ هر دسته همان ترتیبی است که سرور داد (hierarchy_order، قابل
  // تغییر از پنل سوپرادمین) — این‌جا فقط دسته‌بندی می‌شود، نه مرتب‌سازیِ دوباره.
  const bands={}; ROLE_BANDS.forEach(b=>{ bands[b.k]=[]; });
  HOSP_ROLES.forEach(r=>{ bands[bandOf(r)].push(r); });

  const card=r=>{
    const open=ROLE_OPEN.has(r.role_id), single=r.users.length===1;
    return `<div class="rolecard g${open?' open':''}">
      <button type="button" class="rolecard-hd" onclick="${single?`chooseUser('${esc(r.users[0].id)}','${esc(r.role_title)}')`:`toggleRoleTile('${r.role_id}')`}">
        <span class="role-ic">${roleIcon(r.role_code)}</span>
        <span class="role-tx">
          <b>${esc(r.role_title)}</b>
          <span>${single?'برای ورود کلیک کنید':`${fa(r.users.length)} نفر — ${open?'برای بستن کلیک کنید':'برای مشاهده کلیک کنید'}`}</span>
        </span>
        ${single?'':`<span class="role-chev">${open?'▾':'‹'}</span>`}
      </button>
      ${(open&&!single)?`<div class="usermosaic">${r.users.map(u=>`
        <button type="button" class="usertile" onclick="chooseUser('${esc(u.id)}','${esc(r.role_title)}')">${esc(u.full_name)}</button>
      `).join('')}</div>`:''}
    </div>`;
  };

  // دسته‌ی خالی اصلاً چاپ نمی‌شود — عنوانِ «سایر» بدونِ هیچ کارتی زیرش، فقط
  // یک سطرِ بی‌معنی است.
  box.innerHTML=ROLE_BANDS.filter(b=>bands[b.k].length).map(b=>`
    <div class="roleband">
      <div class="roleband-t">${esc(b.t)}</div>
      <div class="rolegrid">${bands[b.k].map(card).join('')}</div>
    </div>`).join('');
}
// انتخاب کاربر: اگر پسورد اجباری نباشد مستقیم وارد می‌شود؛ اگر سوپرادمین اجباری کرده باشد
// یک فیلد رمز درجا باز می‌شود (بدون فرم/صفحه‌ی جدا).
function chooseUser(userId,roleTitle){
  if(!REQUIRE_PW) return doRoleLogin(userId);
  const box=$('roleMosaic'); if(!box) return;
  box.innerHTML=`<div class="pwprompt">
    <div class="pwprompt-t">ورود به‌عنوان «${esc(roleTitle)}»</div>
    <div class="fg"><label>رمز عبور</label><input id="pw_in" type="password" autocomplete="current-password"></div>
    <div id="lerr2" style="color:var(--dn);font-size:13px;margin-bottom:10px;display:none"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-g" style="flex:1" id="pwbtn" onclick="doRoleLogin('${esc(userId)}')">ورود</button>
      <button class="btn btn-o" onclick="renderRoleMosaic()">انصراف</button>
    </div>
  </div>`;
  $('pw_in').focus();
  $('pw_in').addEventListener('keydown',e=>{ if(e.key==='Enter') doRoleLogin(userId); });
}
async function doRoleLogin(userId){
  const pwEl=$('pw_in'), err=$('lerr2')||$('lerr'), btn=$('pwbtn');
  const password=pwEl?pwEl.value:undefined;
  if(REQUIRE_PW && pwEl && !password){ err.textContent='رمز عبور را وارد کنید.'; err.style.display='block'; return; }
  if(btn) btn.disabled=true;
  try{ const r=await API.roleLogin(userId,password); S.user=r.user; await enterApp(); if(window.RbacGuard) RbacGuard.sync(); }
  catch(e){ if(err){ err.textContent=e.message; err.style.display='block'; } if(btn) btn.disabled=false; }
}
function renderSuperLogin(){
  $('root').innerHTML=`
  <div id="login"><div class="lcard g">
    <div class="lbrand"><div class="lmark shine anim">◆</div><h1>ورود سوپرادمین پلتفرم</h1><p>مدیریت بیمارستان‌های عضو سامانه</p></div>
    <div class="fg"><label>نام کاربری</label><input id="su" autocomplete="username"></div>
    <div class="fg"><label>رمز عبور</label><input id="sp" type="password" autocomplete="current-password"></div>
    <div id="serr" style="color:var(--dn);font-size:13px;margin-bottom:10px;display:none"></div>
    <button class="btn btn-g btn-full" id="sbtn" onclick="doSuperLogin()">ورود</button>
    <div style="text-align:center;margin-top:14px"><a href="javascript:void(0)" onclick="renderLogin()" style="font-size:12px;color:var(--td)">‹ بازگشت به ورود عادی</a></div>
  </div></div>`;
  $('sp').addEventListener('keydown',e=>{ if(e.key==='Enter') doSuperLogin(); });
  $('su').focus();
}
async function doSuperLogin(){
  const u=$('su').value.trim(), p=$('sp').value, err=$('serr'), btn=$('sbtn');
  if(!u||!p){ err.textContent='نام کاربری و رمز عبور را وارد کنید.'; err.style.display='block'; return; }
  btn.disabled=true; err.style.display='none';
  try{ const r=await API.superLogin(u,p); S.superAdmin=r.superAdmin; renderSuperPanel(); if(window.RbacGuard) RbacGuard.sync(); }
  catch(e){ err.textContent=e.message; err.style.display='block'; btn.disabled=false; }
}
// متن راهنمای سوپرادمین — مرجع واقعی، نه استاب. محتوا از ماژول‌های واقعاً ساخته‌شده در سامانه گرفته شده.
const SUPER_HELP_HTML=`
<h4 style="color:var(--gdl);margin-bottom:6px">۱. این سامانه چیست</h4>
<p>یک سامانه‌ی جامع اعتباربخشی بیمارستانی (بر اساس کتاب سنجه‌های اعتباربخشی ویرایش پنجم — ۳ بخش/۱۰۸ استاندارد/۵۲۰ سنجه) است.
هر بیمارستان یک «مستأجر» (tenant) مستقل روی همین یک نصب سامانه است: کاربران، اسناد، کمیته‌ها، سنجه‌ها و همه‌ی داده‌ی دیگرش
کاملاً از بیمارستان‌های دیگر جدا می‌ماند. شما به‌عنوان سوپرادمین پلتفرم، بالای همه‌ی بیمارستان‌ها می‌ایستید و هیچ داده‌ی
درون‌سازمانی (مثل محتوای گزارش خطا یا صورت‌جلسه‌ی کمیته) را مستقیم نمی‌بینید — فقط فراداده‌ی مدیریتی (چه کسی، چه کاری، کِی).</p>

<h4 style="color:var(--gdl);margin:18px 0 6px">۲. چندمستأجری (Multi-tenancy) چگونه کار می‌کند</h4>
<p>تقریباً همه‌ی جدول‌های دیتابیس یک ستون <code>hospital_id</code> دارند. هر درخواست کاربر عادی، بعد از احراز هویت،
<code>hospital_id</code> خودش را از توکن ورودش می‌گیرد و همه‌ی کوئری‌های سرور با همان مقید می‌شوند — یعنی کاربر بیمارستان
«الف» حتی با دستکاری آدرس هم نمی‌تواند رکورد بیمارستان «ب» را ببیند. توکن سوپرادمین یک نوع جدا (<code>type: super_admin</code>)
است و اصلاً به هیچ <code>hospital_id</code>ای مقید نیست؛ به همین دلیل مسیرهای <code>/api/super/*</code> کاملاً از مسیرهای
<code>/api/*</code> عادی جدا نگه‌داشته شده‌اند.</p>

<h4 style="color:var(--gdl);margin:18px 0 6px">۳. ساختار ماژول‌ها</h4>
<p><b>هسته‌ی اعتباربخشی</b>: درخت بخش/محور/استاندارد/سنجه، ثبت وضعیت هر سنجه (منطبق/نسبی/نامنطبق) با شواهد و یادداشت،
داشبورد و نمودار روند. دسترسی به هر محور بر اساس نقش کاربر تعیین می‌شود (سمت سرور، deny-by-default) و می‌توان
به‌صورت موردی به یک کاربر خاص روی یک سنجه‌ی خاص هم اجازه (grant) داد و هم منع (deny) کرد.</p>
<p><b>اسناد و کیفیت</b>: مدارک کنترل‌شده (خط‌مشی/روش اجرایی/دستورالعمل) با گردش امضای الکترونیکی، تاریخچه‌ی نسخه و
تاریخ بازبینی بعدی؛ کتابخانه دیجیتال (مخزن ساده‌ی فایل)؛ بانک چک‌لیست با حیطه‌بندی و نمره‌دهی؛ حسابرسی داخلی؛
نشان‌ها و گواهینامه‌ها؛ پرونده‌ی الکترونیکی شواهد (آپلود واقعی فایل، نه فقط توضیح متنی محل نگهداری).</p>
<p><b>ایمنی و ریسک</b>: گزارش خطا و واقعه با RCA شرطی و کد پیگیری خودکار؛ FMEA (تحلیل حالات شکست و اثرات آن)؛
بازدید میدانی مدیریتی (واکراند) با داشبورد مصوبات.</p>
<p><b>سازمان</b> — سه حوزه‌ی کلان با نمودار سازمانی مستقل: <b>مدیریت</b> (پست‌های نام‌دار مثل مدیر بیمارستان/مدیر
کیفیت/مسئول فنی — برچسب و تعداد این پست‌ها را فقط شما از این پنل تغییر می‌دهید)، <b>پرستاری</b> (سوپروایزرها و
بخش‌ها، داشبورد سرپرستار بخش با حضورغیاب/مرخصی/چک‌لیست شیفت)، و <b>پشتیبانی</b>. علاوه بر این: کمیته‌ها (۱۷+ کمیته
با صورت‌جلسه و زمان‌بندی جلسه/اتاق)، کاربران و نقش‌های سفارشی با کاتالوگ مجوز فارسی، برنامه‌های بهبود، کارت
امتیازی متوازن (BSC)، نیازسنجی آموزشی، پیام‌های داخلی و کارتابل شخصی.</p>
<p><b>نظرسنجی رضایت</b>: پرسشنامه‌ی رسمی ۱۰بخشی بدون‌ورود که هر بیمارستان از طریق درگاه عمومی خودش منتشر می‌کند؛
نتایج در داشبورد مخصوص مدیر کیفیت همان بیمارستان جمع می‌شود.</p>
<p><b>دروازه‌ی عمومی</b>: هر بیمارستان یک صفحه‌ی اختصاصی بدون‌ورود دارد (لینک «درگاه همگانی ↗» کنار هر بیمارستان در
تب «بیمارستان‌ها و بکاپ») برای گزارش خطا، FMEA، انتقادات/پیشنهادها و نظرسنجی رضایت — قابل اشتراک با QR.</p>

<h4 style="color:var(--gdl);margin:18px 0 6px">۴. نقش‌ها و مجوزها</h4>
<p>هر کاربر یک نقش دارد (مثلاً «مدیر داخلی»، «مدیر کنترل کیفیت»، «پرستار»…) و هر نقش فهرستی از مجوزهای فارسی
(مثل <code>manage_users</code>، <code>edit_measure_status</code>) را حمل می‌کند. ادمین داخلی هر بیمارستان می‌تواند
نقش‌های سفارشی جدید بسازد و مجوز آن‌ها را از کاتالوگ انتخاب کند. شما به‌عنوان سوپرادمین از تب «مدیریت کاربران» این پنل
می‌توانید نقش هر کاربر را در هر بیمارستان تغییر دهید، رمز عبورش را بدون دانستن رمز قبلی بازنشانی کنید، یا حسابش را
غیرفعال کنید — این‌ها برای وقتی است که ادمین محلی همان بیمارستان در دسترس نیست یا خودش دچار مشکل شده.</p>

<h4 style="color:var(--gdl);margin:18px 0 6px">۵. راهنمای گام‌به‌گام (guide-timeline)</h4>
<p>هر بیمارستان از اولین ورود یک نوار راهنمای سمت‌چپ می‌بیند که مسیر اعتباربخشی را به ۱۹+ نقطه‌ی عطف (milestone)
تبدیل می‌کند: از «سال شروع» گرفته تا تکمیل تدریجی هر ماژول. این نقاط عطف به‌صورت قطعی (deterministic) از داده‌ی
واقعی همان بیمارستان مشتق می‌شوند (نه یک چک‌لیست دستی جدا) — یعنی وقتی کاربر واقعاً یک کمیته می‌سازد یا سنجه‌ای را
تکمیل می‌کند، همان مرحله در راهنما «انجام‌شده» علامت می‌خورد. کاربر می‌تواند یک مرحله را دستی «تمام‌شده» بزند یا
«بعداً یادم بنداز» (snooze) کند؛ سرور این‌ها را دوباره اعتبارسنجی می‌کند تا کاربر با کلیک صرف، مرحله‌ای را که واقعاً
انجام نداده «قروغلط» نکند.</p>

<h4 style="color:var(--gdl);margin:18px 0 6px">۶. بکاپ و بازگردانی</h4>
<p>از تب «بیمارستان‌ها و بکاپ»: «دانلود بکاپ» یک اسنپ‌شات سازگار از کل فایل دیتابیس SQLite (همه‌ی بیمارستان‌ها با
هم، چون نصب مشترک است) با API رسمی <code>better-sqlite3</code> می‌گیرد — نه کپی خام فایل، چون در حالت WAL ممکن است
نوشته‌های در حال انجام هنوز روی دیسک نباشند و کپی خام خراب شود. «بازگردانی» یک فایل <code>.db</code> را جایگزین
دیتابیس فعلی می‌کند: پیش از جایگزینی، ساختار فایل بررسی می‌شود (امضای SQLite واقعی + وجود جدول hospitals) و
همیشه یک اسنپ‌شات ایمنی خودکار از وضعیت فعلی، پیش از بازنویسی، ذخیره می‌شود. این عملیات همه‌ی داده‌ی فعلی همه‌ی
بیمارستان‌ها را عوض می‌کند و بعدش سرور Node.js باید دستی ری‌استارت شود.</p>

<h4 style="color:var(--gdl);margin:18px 0 6px">۷. لاگ خطا و لاگ فعالیت (همین پنل)</h4>
<p>تب «لاگ خطاهای سرور»: هر بار میان‌افزار نهایی خطای Express اجرا شود، جزئیات واقعی (پیام + بخشی از stack، مسیر،
بیمارستان/کاربر در صورت شناخته‌بودن) در جدول <code>error_log</code> ذخیره می‌شود؛ پاسخی که کاربر نهایی می‌بیند
همیشه پیام عمومی «خطای سرور» باقی می‌ماند و جزئیات فقط اینجا قابل مشاهده است. تب «لاگ فعالیت کاربران» چیز جدیدی
ردیابی نمی‌کند — همان <code>audit_log</code> (هر بیمارستان) و <code>super_audit_log</code> (اقدامات خود شما، مثل
بکاپ/بازگردانی/تغییر نقش) را کنار هم، قابل فیلتر بر اساس تاریخ و بیمارستان، نشان می‌دهد. ورود موفق و ناموفق هر دو
در این لاگ ثبت می‌شوند.</p>
`;

const SUPER_TABS=[
  {k:'hospitals',t:'بیمارستان‌ها و بکاپ'},
  {k:'pitch',t:'ارائه برای فروش'},
  {k:'system',t:'نحوه‌ی عملکرد سامانه'},
  {k:'chart',t:'چارت سمت‌ها'},
  {k:'recycle',t:'سطل بازیافت'},
  {k:'errors',t:'لاگ خطاهای سرور'},
  {k:'activity',t:'لاگ فعالیت کاربران'},
  {k:'users',t:'مدیریت کاربران'},
  {k:'help',t:'مستندات ماژول‌ها و API'},
  {k:'security',t:'امنیت حساب'},
  {k:'devchat',t:'دستیار توسعه'},
];
let S_SUPER_TAB='hospitals';
async function renderSuperPanel(){
  $('root').innerHTML=`<div style="max-width:1000px;margin:40px auto;padding:0 20px">
    <div class="panel g">
      <div class="phd"><div class="abadge">◆</div><div><h3>پنل سوپرادمین پلتفرم</h3>
        <div class="sub">${esc(S.superAdmin?.full_name||'')} — <a href="javascript:void(0)" onclick="superLogout()" style="color:var(--dn)">خروج</a></div></div></div>
      <div class="pbody" style="padding-top:0">
        <div id="superTabBar" style="display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--bd);margin-bottom:16px;padding-top:10px">
          ${SUPER_TABS.map(t=>`<button class="btn ${t.k===S_SUPER_TAB?'btn-g':'btn-o'} btn-sm" onclick="superSwitchTab('${t.k}')" id="stab_${t.k}">${t.t}</button>`).join('')}
        </div>
        <div id="superTabContent"></div>
      </div>
    </div>
  </div>`;
  superSwitchTab(S_SUPER_TAB);
}
function superSwitchTab(tab){
  S_SUPER_TAB=tab;
  document.querySelectorAll('#superTabBar button').forEach(b=>b.classList.remove('btn-g'));
  document.querySelectorAll('#superTabBar button').forEach(b=>b.classList.add('btn-o'));
  const active=$('stab_'+tab); if(active){ active.classList.remove('btn-o'); active.classList.add('btn-g'); }
  if(tab==='hospitals') renderSuperHospitalsTab();
  else if(tab==='errors') renderSuperErrorsTab();
  else if(tab==='activity') renderSuperActivityTab();
  else if(tab==='users') renderSuperUsersTab();
  else if(tab==='help') renderSuperHelpTab();
  // این دو در public/js/super-docs.js تعریف شده‌اند (متنِ ثابت، بیرون از app.js)
  else if(tab==='pitch') renderSuperPitchTab();
  else if(tab==='system') renderSuperSystemTab();
  else if(tab==='recycle') renderSuperRecycleTab();
  else if(tab==='chart') renderSuperChartTab();
  else if(tab==='security') renderSuperSecurityTab();
  // در public/js/super-devchat.js تعریف شده — مثل pitch/system، متنِ کد
  // زیاد است و app.js نباید بیشتر باد کند.
  else if(tab==='devchat') renderSuperDevChatTab();
}
// رمز پیش‌فرضِ سوپرادمین در مخزن پیداست و تا امروز هیچ راهی برای عوض‌کردنش از
// داخل برنامه نبود. این تب دقیقاً همان یک کار را می‌کند و عمداً چیز دیگری ندارد.
function renderSuperSecurityTab(){
  $('superTabContent').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">🔒</div><div><h3>تغییر رمز عبور سوپرادمین</h3>
      <div class="sub">حساب: <b>${esc(S.superAdmin?.username||'')}</b></div></div></div>
    <div class="pbody" style="max-width:520px">
      <div class="ncsec" style="margin-bottom:14px">
        <div class="docsl">چرا این کار مهم است</div>
        <div style="font-size:11.5px;line-height:2;color:var(--td)">
          رمز پیش‌فرضِ نصب در مخزن کد قابل دیدن است. تا وقتی عوض نشده، هرکسی که نشانی
          پنل را بداند به همه‌ی بیمارستان‌ها و کل داده‌ی پلتفرم دسترسی کامل دارد.
          پیش از ارائه به کارفرما حتماً عوضش کنید.</div>
      </div>
      <div class="fg"><label>رمز فعلی</label>
        <input type="password" id="sp_cur" autocomplete="current-password" dir="ltr"></div>
      <div class="fg"><label>رمز تازه (حداقل ۱۰ نویسه)</label>
        <input type="password" id="sp_new" autocomplete="new-password" dir="ltr"></div>
      <div class="fg"><label>تکرار رمز تازه</label>
        <input type="password" id="sp_new2" autocomplete="new-password" dir="ltr"></div>
      <div id="sp_msg" style="margin:8px 0"></div>
      <button class="btn btn-g" id="sp_btn" onclick="superDoChangePassword()">تغییر رمز</button>
    </div>
  </div>`;
}
async function superDoChangePassword(){
  const cur=$('sp_cur').value, nw=$('sp_new').value, nw2=$('sp_new2').value;
  const msg=$('sp_msg');
  const bad=t=>{ msg.innerHTML=`<div style="color:var(--dn);font-size:12.5px">${esc(t)}</div>`; };
  if(!cur) return bad('رمز فعلی را وارد کنید');
  if(nw.length<10) return bad('رمز تازه باید حداقل ۱۰ نویسه باشد');
  // تکرار را سمت کاربر می‌گیریم: تایپِ اشتباهِ رمزِ تازه یعنی قفل‌شدنِ حساب
  if(nw!==nw2) return bad('رمز تازه و تکرارش یکی نیستند');
  const btn=$('sp_btn'); btn.disabled=true; btn.textContent='در حال تغییر…';
  try{
    await API.superChangePassword({current_password:cur, new_password:nw});
    msg.innerHTML=`<div style="color:var(--ok);font-size:12.5px">✅ رمز عوض شد. دفعه‌ی بعد با رمز تازه وارد شوید.</div>`;
    $('sp_cur').value=''; $('sp_new').value=''; $('sp_new2').value='';
  }catch(e){ bad(e.message); }
  finally{ btn.disabled=false; btn.textContent='تغییر رمز'; }
}
function renderSuperHospitalsTab(){
  $('superTabContent').innerHTML=`
    <div class="pwtoggle-row" id="pwToggleRow">
      <div>
        <b>ورود سریع با کلیک روی سمت — پسورد اجباری</b>
        <span>وقتی روشن است، هر کاربر برای ورود باید رمز واقعی خودش را هم وارد کند؛ در غیر این صورت فقط با کلیک روی سمت وارد می‌شود.</span>
      </div>
      <label class="swtoggle"><input type="checkbox" id="pwToggle" onchange="toggleRequirePassword(this.checked)"><span></span></label>
    </div>
    <div class="pwtoggle-row" id="profileFieldsToggleRow">
      <div>
        <b>فیلدهای پروفایل شخصی — جنسیت، عکس، بیو، نحوه تماس</b>
        <span>وقتی روشن است، همه‌ی کاربران در «پروفایل من» می‌توانند جنسیت، عکس پروفایل، بیو و نحوه‌ی تماس ترجیحی خود را تعیین کنند.</span>
      </div>
      <label class="swtoggle"><input type="checkbox" id="profileFieldsToggle" onchange="toggleProfileFieldsEnabled(this.checked)"><span></span></label>
    </div>
    <div class="pwtoggle-row" id="lightThemeToggleRow">
      <div>
        <b>تمِ روشن برای کاربران</b>
        <span>پیش‌فرض خاموش است — همه همیشه تمِ تیره می‌بینند. با روشن‌کردن این گزینه، دکمه‌ی تغییر تم دوباره در دسترس کاربران قرار می‌گیرد.</span>
      </div>
      <label class="swtoggle"><input type="checkbox" id="lightThemeToggle" onchange="toggleLightThemeEnabled(this.checked)"><span></span></label>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:16px">
      <input id="nh_name" class="fg" placeholder="نام بیمارستان جدید" style="padding:11px 15px;border-radius:10px;background:var(--subpanel-2);border:1px solid var(--bd);color:var(--th)">
      <button class="btn btn-g" onclick="superCreateHospital()">+ بیمارستان جدید</button>
    </div>
    <div id="hospList"><div class="empty">در حال بارگذاری…</div></div>
    <div class="panel g" style="margin-top:20px">
      <div class="phd"><div class="abadge">⛁</div><div><h3>بکاپ و بازگردانی</h3>
        <div class="sub">کل دیتابیس پلتفرم (همه‌ی بیمارستان‌ها) — عملیاتی پرریسک، با دقت استفاده شود.</div></div></div>
      <div class="pbody">
        <div style="margin-bottom:18px">
          <a class="btn btn-g btn-sm" href="/api/super/backup/download" target="_blank" rel="noopener">دانلود بکاپ</a>
          <span class="sub" style="display:block;margin-top:6px">یک اسنپ‌شات سازگار و کامل از فایل دیتابیس فعلی دانلود می‌شود.</span>
        </div>
        <div style="border-top:1px solid var(--bd);padding-top:16px">
          <b style="color:var(--dn)">بازگردانی از بکاپ — این عملیات همه‌ی داده‌ی فعلی را جایگزین می‌کند</b>
          <div class="sub" style="margin:6px 0 12px">پیش از جایگزینی، یک اسنپ‌شات ایمنی از دیتابیس فعلی به‌صورت خودکار روی سرور ذخیره می‌شود؛ اما این عملیات همچنان جدی و برگشت‌ناپذیر از دید کاربر است. بعد از بازگردانی، ری‌استارت دستی سرور لازم است.</div>
          <input type="file" id="rst_file" accept=".db" style="display:block;margin-bottom:10px" onchange="checkRestoreEnabled()">
          <div class="fg" style="margin-bottom:10px">
            <label>برای فعال‌شدن دکمه، عبارت «بازگردانی» را دقیقاً اینجا تایپ کنید</label>
            <input id="rst_phrase" placeholder="بازگردانی" oninput="checkRestoreEnabled()" style="direction:rtl">
          </div>
          <button class="btn btn-o btn-sm" id="rst_btn" disabled onclick="superDoRestore()">بازگردانی دیتابیس</button>
          <div id="rst_result" style="margin-top:10px"></div>
        </div>
      </div>
    </div>`;
  loadSuperHospitals();
  loadSuperSettings();
}

// ==================== سوپرادمین: لاگ خطاهای سرور ====================
async function renderSuperErrorsTab(){
  const box=$('superTabContent');
  box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">⚠</div>
    <div><h3>لاگ خطاهای سرور</h3><div class="sub">خطاهایی که در پاسخ به کاربر فقط «خطای سرور» نشان داده شد؛ جزئیات واقعی اینجاست.</div></div></div>
    <div class="pbody">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <div class="fg fg-date"><label>از تاریخ</label>${jalaliDateInputHtml('errFrom',{allowEmpty:true})}</div>
        <div class="fg fg-date"><label>تا تاریخ</label>${jalaliDateInputHtml('errTo',{allowEmpty:true})}</div>
        <div class="fg"><label>بیمارستان</label><select id="errHospital"><option value="">همه</option></select></div>
        <div style="align-self:flex-end"><button class="btn btn-g btn-sm" onclick="loadSuperErrors()">اعمال فیلتر</button></div>
      </div>
      <div id="errList"><div class="empty">در حال بارگذاری…</div></div>
    </div></div>`;
  await superFillHospitalSelect('errHospital');
  loadSuperErrors();
}
async function loadSuperErrors(){
  const params={};
  const f=readJalaliDateInputOpt('errFrom'), t=readJalaliDateInputOpt('errTo'), h=$('errHospital').value;
  if(f) params.from=f; if(t) params.to=t; if(h) params.hospital_id=h;
  $('errList').innerHTML='<div class="empty">در حال بارگذاری…</div>';
  try{
    const {errors}=await API.superErrorLog(params);
    if(!errors.length){ $('errList').innerHTML='<div class="empty">خطایی در این بازه ثبت نشده است</div>'; return; }
    $('errList').innerHTML=`<div class="tbl-wrap" style="max-height:520px;overflow:auto"><table>
      <thead><tr><th>زمان</th><th>روش/مسیر</th><th>کد</th><th>بیمارستان</th><th>کاربر</th><th>پیام</th><th></th></tr></thead>
      <tbody>${errors.map((e,i)=>`<tr>
        <td style="font-size:11px;direction:ltr;text-align:right">${esc(e.created_at||'—')}</td>
        <td style="font-size:11px;direction:ltr;text-align:right">${esc(e.method||'')} ${esc(e.route||'')}</td>
        <td><span class="bdg b3">${fa(e.status_code||'')}</span></td>
        <td>${esc(e.hospital_name||'—')}</td>
        <td>${esc(e.user_name||'—')}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.message||'')}</td>
        <td><a href="javascript:void(0)" onclick="toggleErrStack(${i})" style="color:var(--gdl)">جزئیات</a></td>
      </tr><tr id="errstk_${i}" style="display:none"><td colspan="7"><pre style="white-space:pre-wrap;font-size:11px;direction:ltr;text-align:left;background:var(--subpanel-2);padding:10px;border-radius:8px;max-height:220px;overflow:auto">${esc(e.stack||'—')}</pre></td></tr>`).join('')}</tbody>
    </table></div>`;
  }catch(e){ $('errList').innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
function toggleErrStack(i){ const r=$('errstk_'+i); if(r) r.style.display=r.style.display==='none'?'':'none'; }

// ==================== سوپرادمین: لاگ فعالیت کراس‌بیمارستان ====================
async function renderSuperActivityTab(){
  const box=$('superTabContent');
  box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">▤</div>
    <div><h3>لاگ فعالیت کاربران — همه‌ی بیمارستان‌ها</h3>
    <div class="sub">از audit_log موجود (ورود موفق/ناموفق و همه‌ی عملیات ثبت‌شده در هر بیمارستان)؛ چیز جدیدی ردیابی نمی‌شود، فقط اینجا کنار هم دیده می‌شود.</div></div></div>
    <div class="pbody">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <div class="fg fg-date"><label>از تاریخ</label>${jalaliDateInputHtml('actFrom',{allowEmpty:true})}</div>
        <div class="fg fg-date"><label>تا تاریخ</label>${jalaliDateInputHtml('actTo',{allowEmpty:true})}</div>
        <div class="fg"><label>بیمارستان</label><select id="actHospital"><option value="">همه</option></select></div>
        <div style="align-self:flex-end"><button class="btn btn-g btn-sm" onclick="loadSuperActivity()">اعمال فیلتر</button></div>
      </div>
      <div id="actList"><div class="empty">در حال بارگذاری…</div></div>
    </div></div>`;
  await superFillHospitalSelect('actHospital');
  loadSuperActivity();
}
async function loadSuperActivity(){
  const params={};
  const f=readJalaliDateInputOpt('actFrom'), t=readJalaliDateInputOpt('actTo'), h=$('actHospital').value;
  if(f) params.from=f; if(t) params.to=t; if(h) params.hospital_id=h;
  $('actList').innerHTML='<div class="empty">در حال بارگذاری…</div>';
  try{
    const {activity}=await API.superActivityLog(params);
    if(!activity.length){ $('actList').innerHTML='<div class="empty">رویدادی ثبت نشده است</div>'; return; }
    $('actList').innerHTML=`<div class="tbl-wrap" style="max-height:520px;overflow:auto"><table>
      <thead><tr><th>زمان</th><th>بیمارستان</th><th>کاربر</th><th>نقش</th><th>عملیات</th><th>موضوع</th></tr></thead>
      <tbody>${activity.map(a=>{
        const isLogin=(a.action||'').startsWith('user_login');
        const failed=a.action==='user_login_failed';
        return `<tr>
          <td style="font-size:11px;direction:ltr;text-align:right">${esc(a.created_at||'—')}</td>
          <td>${esc(a.hospital_name||'—')}</td>
          <td>${esc(a.actor_name||a.actor_username||'—')}</td>
          <td style="font-size:11px;color:var(--td)">${esc(a.actor_role||'—')}</td>
          <td>${isLogin?`<span class="bdg ${failed?'b3':'b1'}">${failed?'ورود ناموفق':'ورود موفق'}</span>`:esc(a.action)}</td>
          <td style="font-size:11px;color:var(--td)">${esc(a.target_table||'—')}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }catch(e){ $('actList').innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}

// گزینه‌های select بیمارستان — مشترک بین چند تب
async function superFillHospitalSelect(selectId){
  try{
    const {hospitals}=await API.superHospitals();
    const sel=$(selectId); if(!sel) return;
    hospitals.forEach(h=>{ const o=document.createElement('option'); o.value=h.id; o.textContent=h.name; sel.appendChild(o); });
  }catch(e){ /* غیرمهم */ }
}

// ==================== سوپرادمین: مدیریت کاربران («کنترل کامل») ====================
async function renderSuperUsersTab(){
  const box=$('superTabContent');
  box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">✦</div>
    <div><h3>مدیریت کاربران هر بیمارستان</h3>
    <div class="sub">بازنشانی رمز عبور، فعال/غیرفعال‌سازی، و تغییر نقش هر کاربر — بدون نیاز به دسترسی ادمین محلی همان بیمارستان.</div></div></div>
    <div class="pbody">
      <div class="fg" style="max-width:360px"><label>بیمارستان</label><select id="umHospital" onchange="loadSuperUserMgmt()"><option value="">— انتخاب کنید —</option></select></div>
      <div id="umList" style="margin-top:14px"></div>
    </div></div>`;
  await superFillHospitalSelect('umHospital');
}
async function loadSuperUserMgmt(){
  const hid=$('umHospital').value;
  const list=$('umList');
  if(!hid){ list.innerHTML=''; return; }
  list.innerHTML='<div class="empty">در حال بارگذاری…</div>';
  try{
    const {users,roles}=await API.superHospitalUsers(hid);
    if(!users.length){ list.innerHTML='<div class="empty">این بیمارستان هنوز کاربری ندارد</div>'; return; }
    list.innerHTML=`<div class="tbl-wrap"><table>
      <thead><tr><th>نام</th><th>نام کاربری</th><th>نقش</th><th>وضعیت</th><th>آخرین ورود</th><th>عملیات</th></tr></thead>
      <tbody>${users.map(u=>`<tr id="umrow_${u.id}">
        <td style="color:var(--th)">${esc(u.full_name)}</td>
        <td style="direction:ltr;text-align:right">${esc(u.username)}</td>
        <td><select onchange="superChangeUserRole('${u.id}',this.value)">${roles.map(r=>`<option value="${r.id}" ${r.id===u.role_id?'selected':''}>${esc(r.title_fa)}</option>`).join('')}</select></td>
        <td>${u.is_active?'<span class="bdg b1">فعال</span>':'<span class="bdg b3">غیرفعال</span>'}</td>
        <td style="font-size:11px;direction:ltr;text-align:right">${esc(u.last_login_at||'—')}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-o btn-sm" onclick="superToggleUserStatus('${u.id}',${u.is_active?0:1})">${u.is_active?'غیرفعال کردن':'فعال کردن'}</button>
          <button class="btn btn-o btn-sm" onclick="superResetPwForm('${u.id}')">بازنشانی رمز</button>
        </td></tr>
        <tr id="umpw_${u.id}" style="display:none"><td colspan="6">
          <div style="display:flex;gap:8px;align-items:center">
            <input id="umpwval_${u.id}" type="text" placeholder="رمز جدید (حداقل ۸ کاراکتر)" style="direction:ltr">
            <button class="btn btn-g btn-sm" onclick="superDoResetPw('${u.id}')">ثبت رمز جدید</button>
            <button class="btn btn-o btn-sm" onclick="document.getElementById('umpw_${u.id}').style.display='none'">انصراف</button>
          </div>
        </td></tr>`).join('')}</tbody>
    </table></div>`;
  }catch(e){ list.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
function superResetPwForm(uid){
  const row=$('umpw_'+uid); if(row) row.style.display=row.style.display==='none'?'':'none';
}
async function superDoResetPw(uid){
  const v=($('umpwval_'+uid).value||'').trim();
  if(v.length<8){ toast('رمز جدید حداقل ۸ کاراکتر',true); return; }
  try{ await API.superResetUserPassword(uid,v); toast('رمز عبور بازنشانی شد'); $('umpw_'+uid).style.display='none'; }
  catch(e){ toast(e.message,true); }
}
async function superToggleUserStatus(uid,active){
  try{ await API.superSetUserStatus(uid,!!active); toast(active?'کاربر فعال شد':'کاربر غیرفعال شد'); loadSuperUserMgmt(); }
  catch(e){ toast(e.message,true); }
}
async function superChangeUserRole(uid,roleId){
  try{ await API.superSetUserRole(uid,roleId); toast('نقش کاربر تغییر کرد'); }
  catch(e){ toast(e.message,true); loadSuperUserMgmt(); }
}
