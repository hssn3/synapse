/**
 * Superadmin Documentation Part 2
 * Modular Frontend Component — Project 313
 */
  box.innerHTML=`<div class="panel" style="line-height:1.9;padding:18px">
    <h3 style="color:var(--gdl);margin-bottom:4px">${esc(m.name)}</h3>
    <p style="margin:6px 0 16px;color:var(--th)">${esc(m.purpose)}</p>
    <div style="margin-bottom:12px"><b style="color:var(--gdl)">فایل‌های اصلی</b>
      <div class="sub" style="direction:ltr;text-align:right;font-family:monospace;font-size:12.5px;margin-top:5px;line-height:2;background:var(--subpanel);border-radius:8px;padding:8px 10px">
        فرانت: ${esc(m.fe)}<br>بک‌اند: ${esc(m.be)}</div></div>
    <div style="margin-bottom:12px"><b style="color:var(--gdl)">کاربران مجاز</b><div class="sub" style="margin-top:5px">${esc(m.roles)}</div></div>
    <div style="margin-bottom:16px"><b style="color:var(--gdl)">وابستگی‌ها</b><div class="sub" style="margin-top:5px">${esc(m.deps||'—')}</div></div>
    ${m.apis&&m.apis.length?`<div style="border-top:1px solid var(--bd);padding-top:14px">
      <b style="color:var(--gdl)">مرجع API</b>
      <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>متد و مسیر</th><th>احراز هویت</th><th>پاسخ/رفتار</th></tr></thead>
      <tbody>${m.apis.map(a=>`<tr><td style="direction:ltr;text-align:right;font-family:monospace;font-size:12.5px;color:var(--th);white-space:nowrap">${esc(a.m)} ${esc(a.p)}</td>
        <td style="font-size:12px">${esc(a.auth)}</td><td style="font-size:12px">${esc(a.resp)}</td></tr>`).join('')}</tbody></table></div>
    </div>`:''}
  </div>`;
}
function checkRestoreEnabled(){
  const f=$('rst_file'), p=$('rst_phrase'), b=$('rst_btn');
  if(!f||!p||!b) return;
  b.disabled = !(f.files && f.files[0] && p.value.trim()==='بازگردانی');
}
async function superDoRestore(){
  const f=$('rst_file'), p=$('rst_phrase'), b=$('rst_btn'), out=$('rst_result');
  if(!f.files||!f.files[0]){ toast('فایل بکاپ را انتخاب کنید',true); return; }
  if(!await BTN.confirmDanger('آیا مطمئن هستید؟ تمام داده‌های فعلی با محتوای این فایل جایگزین می‌شود.')) return;
  b.disabled=true; out.innerHTML='<div class="empty">در حال بازگردانی…</div>';
  try{
    const r = await API.superRestoreBackup(f.files[0], p.value.trim());
    out.innerHTML = `<div class="bdg b1" style="display:block;padding:10px">${esc(r.message||'بازگردانی انجام شد')}</div>`;
    toast('دیتابیس بازگردانی شد — سرور را ری‌استارت کنید');
  }catch(e){
    out.innerHTML = `<div class="bdg b3" style="display:block;padding:10px">${esc(e.message)}</div>`;
    toast(e.message,true);
  } finally {
    checkRestoreEnabled();
  }
}
async function loadSuperSettings(){
  try{
    const {require_password, profile_fields_enabled, light_theme_enabled}=await API.superSettings();
    const cb=$('pwToggle'); if(cb) cb.checked=!!require_password;
    const cb2=$('profileFieldsToggle'); if(cb2) cb2.checked=profile_fields_enabled!==false;
    const cb3=$('lightThemeToggle'); if(cb3) cb3.checked=!!light_theme_enabled;
  }
  catch(e){ /* غیرمهم — پیش‌فرض خاموش می‌ماند */ }
}
async function toggleRequirePassword(checked){
  try{ await API.superSetRequirePassword(checked); toast(checked?'پسورد اجباری روشن شد':'پسورد اجباری خاموش شد'); }
  catch(e){ toast(e.message,true); const cb=$('pwToggle'); if(cb) cb.checked=!checked; }
}
async function toggleProfileFieldsEnabled(checked){
  try{ await API.superSetProfileFieldsEnabled(checked); toast(checked?'فیلدهای پروفایل شخصی روشن شد':'فیلدهای پروفایل شخصی خاموش شد'); }
  catch(e){ toast(e.message,true); const cb=$('profileFieldsToggle'); if(cb) cb.checked=!checked; }
}
async function toggleLightThemeEnabled(checked){
  try{ await API.superSetLightThemeEnabled(checked); toast(checked?'تمِ روشن برای کاربران فعال شد':'تمِ روشن غیرفعال شد — همه تمِ تیره می‌بینند'); }
  catch(e){ toast(e.message,true); const cb=$('lightThemeToggle'); if(cb) cb.checked=!checked; }
}
// مرکز درمانی‌ای که پنل اختصاصی‌اش باز است؛ null یعنی فهرست مراکز نمایش داده می‌شود.
//
// چرا این حالت اضافه شد: قبلاً همه‌ی مراکز در یک جدول بودند و هفت دکمه‌ی عملیاتی هر
// مرکز کنار هم در یک ردیف می‌نشست، و فرم‌های زیرین همه در یک #superSub مشترک زیر کلِ
// جدول باز می‌شدند. با چند مرکز، تشخیص اینکه فرمِ بازشده مال کدام مرکز است سخت می‌شد.
// حالا روی نام مرکز که بزنی، پنل مدیریت همان مرکز و فقط همان باز می‌شود.
let SUPER_HOSP=null;
let SUPER_HOSP_CACHE=[];

// بعد از هر تغییر، همان نمایی که کاربر در آن است بازسازی می‌شود — نه اینکه از پنل
// یک مرکز پرت شود بیرون به فهرست.
function superRefreshHospitals(){
  // کش عمداً خالی می‌شود: این تابع بعد از تغییر (تغییر نام، لوگو، فعال/غیرفعال) صدا
  // زده می‌شود و اگر از کش بخوانیم، پنل همان مقدار قدیمی را دوباره می‌کشد.
  SUPER_HOSP_CACHE=[];
  if(SUPER_HOSP) superOpenHospital(SUPER_HOSP); else loadSuperHospitals();
}

function superBackToHospitals(){ SUPER_HOSP=null; loadSuperHospitals(); }

async function loadSuperHospitals(){
  SUPER_HOSP=null;
  try{
    const {hospitals}=await API.superHospitals();
    SUPER_HOSP_CACHE=hospitals;
    if(!hospitals.length){ $('hospList').innerHTML='<div class="empty">هنوز مرکز درمانی‌ای ثبت نشده است</div>'; return; }
    $('hospList').innerHTML=`<div class="hgrid">${hospitals.map(h=>`
      <button type="button" class="hcard" onclick="superOpenHospital('${h.id}')">
        <div class="hcard-top">
          ${h.logo_url?`<img class="hcard-logo" src="/api/super/hospitals/${h.id}/logo?t=${Date.now()}" alt="" onerror="this.remove()">`
                      :'<span class="hcard-logo hcard-logo-ph">✦</span>'}
          <span class="hcard-name">${esc(h.name)}</span>
          ${h.is_active?'<span class="bdg b1">فعال</span>':'<span class="bdg b3">غیرفعال</span>'}
        </div>
        <div class="hcard-meta">
          <span><b>${fa(h.user_count)}</b> کاربر</span>
          <span><b>${fa(h.committee_count)}</b> کمیته</span>
        </div>
        <div class="hcard-cta">مدیریت این مرکز ›</div>
      </button>`).join('')}</div>`;
  }catch(e){ $('hospList').innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}

// پنل اختصاصی یک مرکز درمانی — همه‌ی عملیات همان مرکز، و فرم‌هایش داخل همین پنل
// باز می‌شوند (#superSub اینجاست، نه زیر فهرست همه‌ی مراکز).
async function superOpenHospital(id){
  SUPER_HOSP=id;
  let h=SUPER_HOSP_CACHE.find(x=>x.id===id);
  if(!h){
    try{ const {hospitals}=await API.superHospitals(); SUPER_HOSP_CACHE=hospitals; h=hospitals.find(x=>x.id===id); }
    catch(e){ $('hospList').innerHTML=`<div class="empty">${esc(e.message)}</div>`; return; }
  }
  if(!h){ superBackToHospitals(); return; }
  const nameJs=esc(h.name).replace(/'/g,"\\'");
  $('hospList').innerHTML=`
    <div class="hdet">
      <div class="hdet-hd">
        <button type="button" class="btn btn-o btn-sm" onclick="superBackToHospitals()">‹ همه‌ی مراکز</button>
        <div class="hdet-title">
          ${h.logo_url?`<img class="hcard-logo" src="/api/super/hospitals/${h.id}/logo?t=${Date.now()}" alt="" onerror="this.remove()">`
                      :'<span class="hcard-logo hcard-logo-ph">✦</span>'}
          <span id="hname_${h.id}">${esc(h.name)}</span>
          <a href="javascript:void(0)" title="ویرایش نام" onclick="superEditName('${h.id}')" style="color:var(--gdl)">✎</a>
          ${h.is_active?'<span class="bdg b1">فعال</span>':'<span class="bdg b3">غیرفعال</span>'}
        </div>
      </div>
      <div class="hdet-meta">
        <span><b>${fa(h.user_count)}</b> کاربر</span>
        <span><b>${fa(h.committee_count)}</b> کمیته</span>
      </div>
      <div class="hdet-actions">
        <button class="btn btn-o btn-sm" onclick="superToggleHospital('${h.id}',${h.is_active?0:1})">${h.is_active?'غیرفعال کردن':'فعال کردن'}</button>
        <button class="btn btn-o btn-sm" onclick="superAuditLog('${h.id}')">مشاهده لاگ</button>
        <button class="btn btn-o btn-sm" onclick="superAdminForm('${h.id}')">تعیین ادمین</button>
        <button class="btn btn-o btn-sm" onclick="superMgmtPositionsForm('${h.id}')">پست‌های حوزه‌ی مدیریت</button>
        <button class="btn btn-o btn-sm" onclick="superFeaturesForm('${h.id}','${nameJs}')">امکانات و پکیج</button>
        <button class="btn btn-o btn-sm" onclick="superAssistantForm('${h.id}','${nameJs}')">تنظیمات دستیار «دانا»</button>
        <button class="btn btn-o btn-sm" onclick="superAssistantLog('${h.id}','${nameJs}')">لاگ گفت‌وگوهای «دانا»</button>
        <button class="btn btn-o btn-sm" onclick="superPickLogo('${h.id}')">${h.logo_url?'تعویض لوگو':'بارگذاری لوگو'}</button>
        <a class="btn btn-o btn-sm" href="/public/services/${h.id}" target="_blank" rel="noopener"
           title="نشانی قابل اشتراک‌گذاری/QR فرم‌های همگانی این مرکز">درگاه همگانی ↗</a>
      </div>
      <div id="superSub" style="margin-top:16px"></div>
    </div>`;
}
// بارگذاری لوگوی بیمارستان — انتخاب فایل بدون افزودن فیلد دائمی به جدول
// راهنمای اندازه‌ی لوگو — خواسته‌ی صریح کاربر: «قبلش به کاربر بگو چند در چند
// آپلود کند». اعداد دلبخواهی نیستند: سربرگ لوگو را با ارتفاع ۴۶px و حداکثر عرض
// ۱۲۰px می‌کشد، و برای چاپ و صفحه‌ی رتینا ضریب ۴ لازم است ⇒ حدود ۵۱۲px.
// سرور هم هر تصویر را داخل جعبه‌ی ۵۱۲×۵۱۲ جا می‌دهد.
const LOGO_SPEC = {
  box: 512,
  title: 'پیش از انتخاب فایل — اندازه‌ی لوگو',
  html: `
    <p><b>اندازه‌ی پیشنهادی: ۵۱۲ × ۵۱۲ پیکسل</b> (مربع). تصویر بزرگ‌تر هم قبول
    می‌شود و خودکار کوچک می‌شود؛ کوچک‌تر از این، در چاپ محو می‌افتد.</p>
    <ul>
      <li><b>نسبت:</b> ترجیحاً مربع. لوگوی عریض هم کار می‌کند، ولی در سربرگ با
      ارتفاع ۴۶ پیکسل و حداکثر عرض ۱۲۰ پیکسل کشیده می‌شود — پس اگر خیلی عریض
      باشد، ریز دیده می‌شود.</li>
      <li><b>قالب:</b> PNG با زمینه‌ی شفاف بهترین نتیجه را می‌دهد. JPG و WEBP هم
      قبول است. حداکثر حجم: ۵ مگابایت.</li>
      <li><b>حاشیه:</b> دور نشان چند پیکسل فضای خالی بگذارید تا در سربرگ به خط
      جداکننده نچسبد.</li>
      <li><b>رنگ:</b> نشان روی زمینه‌ی سفید چاپ می‌شود؛ از نشانِ سفیدِ توپر
      پرهیز کنید چون در چاپ ناپدید می‌شود.</li>
    </ul>`
};
async function superPickLogo(id){
  if(!await BTN.confirm(`اندازه‌ی پیشنهادی لوگو: ۵۱۲ × ۵۱۲ پیکسل (مربع)

• PNG با زمینه‌ی شفاف بهترین نتیجه را می‌دهد؛ JPG و WEBP هم قبول است
• حداکثر حجم ۵ مگابایت
• در سربرگ با ارتفاع ۴۶ و حداکثر عرض ۱۲۰ پیکسل نمایش داده می‌شود
• دور نشان کمی فضای خالی بگذارید
• از نشانِ سفیدِ توپر پرهیز کنید — روی کاغذ سفید ناپدید می‌شود

برای انتخاب فایل «تأیید» را بزنید.`)) return;
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/png,image/jpeg,image/webp';
  inp.onchange=async()=>{
    if(!inp.files[0]) return;
    try{ await API.superUploadHospitalLogo(id, inp.files[0]); toast('لوگو بارگذاری شد'); superRefreshHospitals(); }
    catch(e){ toast(e.message,true); }
  };
  inp.click();
}
// ویرایش درجای نام بیمارستان (PUT /api/super/hospitals/:id)
function superEditName(id){
  const cell=$('hname_'+id); if(!cell || cell.dataset.editing) return;
  const cur=cell.textContent; cell.dataset.editing='1';
  cell.innerHTML=`<input id="hne_${id}" value="${esc(cur)}" style="padding:5px 9px;border-radius:7px;background:var(--subpanel-2);border:1px solid var(--bd);color:var(--th);font-family:inherit">`;
  const inp=$('hne_'+id); inp.focus(); inp.select();
  const save=async()=>{
    const v=inp.value.trim();
    if(!v || v===cur){ cell.textContent=cur; delete cell.dataset.editing; return; }
    try{ await API.superRenameHospital(id,v); toast('نام بیمارستان به‌روزرسانی شد'); superRefreshHospitals(); }
    catch(e){ toast(e.message,true); cell.textContent=cur; delete cell.dataset.editing; }
  };
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') save(); if(e.key==='Escape'){ cell.textContent=cur; delete cell.dataset.editing; } });
  inp.addEventListener('blur',save);
}
// لاگ فعالیت بیمارستان — فقط فراداده‌ی عملیات، بدون محتوای درون‌سازمانی
async function superAuditLog(id){
  const box=$('superSub'); box.innerHTML='<div class="empty">در حال بارگذاری لاگ…</div>';
  try{
    const {hospital,logs}=await API.superHospitalAuditLog(id);
    box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">▤</div>
      <div><h3>لاگ فعالیت — ${esc(hospital.name)}</h3><div class="sub">${fa(logs.length)} رویداد اخیر (جدیدترین در بالا)</div></div></div>
      <div class="pbody">${logs.length?`<div class="tbl-wrap" style="max-height:420px;overflow:auto"><table>
        <thead><tr><th>عملیات</th><th>کاربر</th><th>موضوع</th><th>زمان</th></tr></thead>
        <tbody>${logs.map(l=>`<tr><td style="color:var(--th)">${esc(l.action)}</td>
          <td>${esc(l.actor_name||l.actor_username||'—')}</td>
          <td style="font-size:11px;color:var(--td)">${esc(l.target_table||'—')}</td>
          <td style="font-size:11px;direction:ltr;text-align:right">${esc(l.created_at||'—')}</td></tr>`).join('')}</tbody>
      </table></div>`:'<div class="empty">رویدادی ثبت نشده است</div>'}
      <button class="btn btn-o btn-sm" style="margin-top:12px" onclick="document.getElementById('superSub').innerHTML=''">بستن</button>
      </div></div>`;
  }catch(e){ box.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
// تعیین ادمین برای بیمارستان — ادمین موجود دست‌نخورده می‌ماند، فقط ادمین جدید افزوده می‌شود
function superAdminForm(id){
  $('superSub').innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">✦</div>
    <div><h3>تعیین ادمین بیمارستان</h3><div class="sub">کاربر جدیدی با نقش «مدیر داخلی» در این بیمارستان ساخته می‌شود؛ ادمین‌های فعلی تغییری نمی‌کنند.</div></div></div>
    <div class="pbody">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="fg"><label>نام و نام خانوادگی</label><input id="sa_name" placeholder="مثال: آقای احمدی"></div>
        <div class="fg"><label>نام کاربری</label><input id="sa_user" placeholder="h1_admin" style="direction:ltr"></div>
        <div class="fg"><label>رمز عبور اولیه</label><input id="sa_pass" type="text" placeholder="حداقل ۸ کاراکتر" style="direction:ltr"></div>
      </div>
      <button class="btn btn-g btn-sm" onclick="superCreateAdmin('${id}')">ایجاد ادمین</button>
      <button class="btn btn-o btn-sm" onclick="document.getElementById('superSub').innerHTML=''">انصراف</button>
    </div></div>`;
  $('sa_name').focus();
}
async function superCreateAdmin(id){
  const b={ full_name:$('sa_name').value.trim(), username:$('sa_user').value.trim(), password:$('sa_pass').value };
  if(!b.full_name||!b.username||!b.password){ toast('نام، نام کاربری و رمز الزامی است',true); return; }
  try{ await API.superAssignHospitalAdmin(id,b); toast('ادمین بیمارستان ایجاد شد'); $('superSub').innerHTML=''; superRefreshHospitals(); }
  catch(e){ toast(e.message,true); }
}
// پیکربندی پست‌های حوزه‌ی مدیریت یک بیمارستان — افزودن/تغییرنام/حذف برچسب پست (نه انتصاب فرد؛
// انتصاب فرد کار ادمین همان بیمارستان است: renderManagement در سمت اپ اصلی)
async function superMgmtPositionsForm(hospitalId){
  const box=$('superSub');
  box.innerHTML='<div class="panel g"><div class="pbody"><div class="empty">در حال بارگذاری…</div></div></div>';
  try{
    const {positions}=await API.superManagementPositions(hospitalId);
    box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">⌂</div>
      <div><h3>پست‌های حوزه‌ی مدیریت</h3><div class="sub">برچسب/تعداد پست‌های این بیمارستان — انتصاب فرد کار مدیر داخلی همان بیمارستان است</div></div></div>
      <div class="pbody">
        ${!positions.length?'<div class="empty">هنوز پستی تعریف نشده است</div>':`
        <div class="tbl-wrap"><table><thead><tr><th>عنوان پست</th><th>فرد منصوب فعلی</th><th>عملیات</th></tr></thead><tbody>
        ${positions.map(p=>`<tr>
          <td><input value="${esc(p.label)}" style="min-width:180px" onchange="superRenameMgmtPosition('${p.id}',this.value,'${hospitalId}')"></td>
          <td style="color:var(--td)">${p.user_name?esc(p.user_name):'بدون مسئول'}</td>
          <td><button class="tgl dngr" onclick="superDeleteMgmtPosition('${p.id}','${hospitalId}')">حذف</button></td>
        </tr>`).join('')}
        </tbody></table></div>`}
        <div style="display:flex;gap:8px;margin-top:14px">
          <input id="smp_new" placeholder="عنوان پست تازه (مثلاً «معاون اداری‌مالی»)" style="flex:1">
          <button class="btn btn-g btn-sm" onclick="superAddMgmtPosition('${hospitalId}')">+ افزودن پست</button>
        </div>
        <button class="btn btn-o btn-sm" style="margin-top:12px" onclick="document.getElementById('superSub').innerHTML=''">بستن</button>
      </div></div>`;
  }catch(e){ box.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
async function superAddMgmtPosition(hospitalId){
  const inp=$('smp_new'); const label=(inp.value||'').trim();
  if(!label){ toast('عنوان پست الزامی است',true); return; }
  try{ await API.superAddManagementPosition(hospitalId,label); toast('پست افزوده شد'); superMgmtPositionsForm(hospitalId); }
  catch(e){ toast(e.message,true); }
}
async function superRenameMgmtPosition(id,label,hospitalId){
  const v=(label||'').trim();
  if(!v){ toast('عنوان پست نمی‌تواند خالی باشد',true); superMgmtPositionsForm(hospitalId); return; }
  try{ await API.superRenameManagementPosition(id,v); toast('ذخیره شد'); }
  catch(e){ toast(e.message,true); superMgmtPositionsForm(hospitalId); }
}
async function superDeleteMgmtPosition(id,hospitalId){
  if(!await BTN.confirmDanger('این پست از حوزه‌ی مدیریت این بیمارستان حذف شود؟')) return;
  try{ await API.superDeleteManagementPosition(id); toast('حذف شد'); superMgmtPositionsForm(hospitalId); }
  catch(e){ toast(e.message,true); }
}
