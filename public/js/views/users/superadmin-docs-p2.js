/**
 * Superadmin Documentation & Packages
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
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
// ==================== سوپرادمین: امکانات و پکیج هر بیمارستان ====================
// فروش پکیج یعنی همین: هر «بخش» (=آیتم منوی کناری کاربر بیمارستان) را می‌شود جدا فعال/غیرفعال کرد.
// وقتی غیرفعال است، همان بخش در منوی کاربر با قفل دیده می‌شود و باز کردنش پیام خرید نشان می‌دهد
// (نه پیام «دسترسی ندارید» — چون دلیل نداشتن است نه نبود مجوز).
async function superFeaturesForm(hospitalId, hospitalName){
  const box=$('superSub');
  box.innerHTML='<div class="panel g"><div class="pbody"><div class="empty">در حال بارگذاری…</div></div></div>';
  try{
    const {features}=await API.superHospitalFeatures(hospitalId);
    box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">🔒</div>
      <div><h3>امکانات و پکیج — ${esc(hospitalName||'')}</h3>
      <div class="sub">هر بخش که اینجا خاموش شود، برای کاربران همین بیمارستان قفل می‌شود و پیام «برای فعال‌سازی خرید کنید» می‌بینند؛ داده‌ی قبلی آن بخش پاک نمی‌شود، فقط دسترسی موقتاً بسته است.</div></div></div>
      <div class="pbody">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px">
        ${features.map(f=>`<div class="pwtoggle-row" id="sf_row_${f.key}" style="padding:10px 0">
          <div><b>${esc(f.label_fa)}</b></div>
          <label class="swtoggle"><input type="checkbox" ${f.enabled?'checked':''} onchange="superToggleFeature('${hospitalId}','${f.key}',this.checked)"><span></span></label>
        </div>`).join('')}
        </div>
        <button class="btn btn-o btn-sm" style="margin-top:14px" onclick="document.getElementById('superSub').innerHTML=''">بستن</button>
      </div></div>`;
  }catch(e){ box.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
async function superToggleFeature(hospitalId, key, enabled){
  try{ await API.superSetHospitalFeature(hospitalId, key, enabled); toast(enabled?'بخش فعال شد':'بخش غیرفعال شد'); }
  catch(e){
    toast(e.message,true);
    const row=$('sf_row_'+key); const cb=row&&row.querySelector('input[type=checkbox]'); if(cb) cb.checked=!enabled;
  }
}
// تنظیمات دستیار «دانا» برای هر بیمارستان — فروشنده/کلید/سقف توکن. کلید کامل هرگز از
// سرور برنمی‌گردد (فقط چهار رقم آخر به‌عنوان راهنما)، پس فیلد خالی همیشه یعنی «تغییر نده»
// نه «پاک کن» — دقیقاً همان قاعده‌ای که در PUT /api/super/hospitals/:id/assistant اعمال شده.
// «سفارشی» یعنی هر API که فرمت chat/completions سبکِ OpenAI را پیاده کند — اکثر
// فروشنده‌ها و سرورهای خودمیزبان. کارفرما خواست بتواند هر لینک/مدل/توکنی را
// وارد و پیش از ذخیره با یک دکمه امتحان کند، پس Base URL و «تست اتصال» هم اینجاست.
function asfBaseUrlRow(baseUrl){
  return `<div id="asf_baseurl_row" style="margin-bottom:10px">نشانی سرویس (Base URL)<span id="asf_url_note"></span><br>
    <input type="text" id="asf_baseurl" value="${esc(baseUrl||'')}" placeholder="مثلاً https://api.example.com/v1" style="width:100%;margin-top:4px" dir="ltr">
  </div>`;
}
// پیش‌تنظیم فروشنده‌ها از سرور می‌آید (همان PRESETS در ai-provider.js) تا فهرست
// یک منبع حقیقت داشته باشد؛ افزودن فروشنده‌ی تازه نباید نیاز به دست‌زدن به فرانت
// داشته باشد. تا وقتی پاسخ نرسیده، این خالی است و فرم چیزی نشان نمی‌دهد.
let ASF_PRESETS={};
async function superAssistantForm(hospitalId, hospitalName){
  const box=$('superSub');
  box.innerHTML='<div class="panel g"><div class="pbody"><div class="empty">در حال بارگذاری…</div></div></div>';
  try{
    const s=await API.superAssistantSettings(hospitalId);
    ASF_PRESETS=s.presets||{};
    box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">✦</div>
      <div><h3>تنظیمات دستیار «دانا» — ${esc(hospitalName||'')}</h3>
      <div class="sub">دانا اول همیشه در خودِ سامانه جست‌وجو می‌کند و رایگان است. این تنظیمات فقط لایه‌ی
      دوم (کمکِ بیرونی) را کنترل می‌کند — وقتی جست‌وجوی داخلی جوابی پیدا نکند. هر مقدار را قبل از
      ذخیره می‌توانید با دکمه‌ی «تست اتصال» امتحان کنید.</div></div></div>
      <div class="pbody">
        <div style="margin-bottom:10px">فروشنده‌ی سرویس<br>
          <select id="asf_provider" style="margin-top:4px" onchange="asfPickProvider()">
            ${Object.entries(ASF_PRESETS).map(([k,v])=>
              `<option value="${k}" ${s.provider===k?'selected':''}>${esc(v.label||k)}</option>`).join('')}
          </select>
        </div>
        <div id="asf_hint" class="gwid-sub" style="margin-bottom:10px"></div>
        <div style="margin-bottom:10px">مدل (اختیاری — خالی یعنی پیش‌فرض)<br>
          <input type="text" id="asf_model" value="${esc(s.model||'')}" placeholder="claude-opus-5" style="width:100%;margin-top:4px" dir="ltr">
        </div>
        ${asfBaseUrlRow(s.base_url)}
        <div style="margin-bottom:10px">کلید / توکن API${s.api_key_set?` (تنظیم‌شده، پایان با ${esc(s.api_key_hint||'')})`:' (تنظیم نشده)'}<br>
          <input type="password" id="asf_apikey" placeholder="برای تغییر وارد کنید — برای نگه‌داشتن، خالی بگذارید" style="width:100%;margin-top:4px" dir="ltr">
        </div>
        <div style="margin-bottom:10px">سقف توکن ماهانه — هر عددی (مثلاً ۲۰۰۰۰۰ یا ۱۰۰۰۰۰۰۰۰۰) برای تست وارد کنید<br>
          <input type="number" id="asf_budget" min="1000" step="1" value="${Number(s.monthly_token_budget)||200000}" style="width:100%;margin-top:4px" dir="ltr">
        </div>
        <label style="display:flex;align-items:center;gap:9px;cursor:pointer;margin-bottom:10px;
                      padding:11px 13px;border:1px solid var(--bd);border-radius:10px;background:var(--subpanel)">
          <input type="checkbox" id="asf_chat" ${s.chat_enabled?'checked':''} style="width:auto;margin:0">
          <span><b>گفت‌وگوی آزاد با دانا برای این بیمارستان فعال باشد</b>
          <span class="gwid-sub" style="display:block">خاموش که باشد، تبِ «بپرس» به کاربران نشان داده نمی‌شود و
          درخواست‌های چت هم از سمت سرور رد می‌شوند (یعنی توکنی خرج نمی‌شود). راهنمای
          «الان چه کار کنم» مستقل است و همیشه کار می‌کند.</span></span>
        </label>
        <div class="gwid-sub">مصرف این ماه: ${fa(s.tokens_used_this_period)} از ${fa(s.monthly_token_budget)} توکن</div>
        <div id="asf_test_result" style="margin-top:8px"></div>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <button class="btn btn-o btn-sm" id="asf_test_btn" onclick="superTestAssistant('${hospitalId}')">تست اتصال</button>
          <button class="btn btn-g btn-sm" onclick="superSaveAssistant('${hospitalId}','${(hospitalName||'').replace(/'/g,"\\'")}')">ذخیره</button>
          <button class="btn btn-o btn-sm" onclick="document.getElementById('superSub').innerHTML=''">بستن</button>
        </div>
      </div></div>`;
    asfRefreshProviderUi();
  }catch(e){ box.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
// وقتی کاربر فروشنده را عوض می‌کند، نشانی و مدلِ پیش‌فرضِ همان فروشنده پر می‌شود —
// کسی نباید نشانی z.ai یا AvalAI را حفظ باشد. ولی اگر کاربر خودش چیزی نوشته
// (نشانیِ پروکسی یا مدل خاص)، دست‌نخورده می‌ماند مگر اینکه دقیقاً پیش‌فرضِ
// فروشنده‌ی قبلی باشد؛ وگرنه یک کلیک اشتباه، تنظیماتش را پاک می‌کرد.
function asfPickProvider(){
  const p=$('asf_provider'); if(!p) return;
  const cur=ASF_PRESETS[p.value]||{};
  const urlBox=$('asf_baseurl');
  if(urlBox){
    const typed=urlBox.value.trim();
    const wasPreset=!typed||Object.values(ASF_PRESETS).some(v=>v.base_url===typed);
    if(wasPreset) urlBox.value=cur.base_url||'';
  }
  const mdl=$('asf_model');
  if(mdl){
    const typed=mdl.value.trim();
    const wasPreset=!typed||Object.values(ASF_PRESETS).some(v=>v.model===typed);
    if(wasPreset) mdl.value='';
  }
  asfRefreshProviderUi();
}
// نمایش را با فروشنده‌ی انتخاب‌شده هماهنگ می‌کند: نشانی برای فروشنده‌ای که خودش
// نشانی ثابت دارد پنهان نمی‌شود بلکه فقط «اختیاری» علامت می‌خورد — کاربر ممکن است
// پشت پروکسی باشد و باید بتواند عوضش کند.
function asfRefreshProviderUi(){
  const p=$('asf_provider'); if(!p) return;
  const k=p.value, cur=ASF_PRESETS[k]||{};
  const note=$('asf_url_note');
  if(note) note.textContent = cur.needs_base_url ? ' — الزامی است' : ' — اختیاری (پیش‌فرض پر شده؛ برای پروکسی عوضش کنید)';
  const urlBox=$('asf_baseurl');
  if(urlBox) urlBox.placeholder = cur.base_url || 'مثلاً https://api.example.com/v1';
  const mdl=$('asf_model');
  if(mdl) mdl.placeholder = cur.model || 'خالی یعنی پیش‌فرض سرویس';
  const hint=$('asf_hint');
  if(hint){
    hint.textContent = (cur.key_hint ? `کلید را از ${cur.key_hint} بگیرید. ` : '')
      + (cur.model ? `مدل پیش‌فرض «${cur.model}» است؛ خالی بگذارید تا همین استفاده شود. ` : '')
      + (cur.needs_base_url ? 'نشانی سرویس الزامی است.' : '');
  }
}
// نامِ قدیمی، برای هر جای دیگری که ممکن است صدایش بزند
function asfToggleBaseUrl(){ asfRefreshProviderUi(); }
async function superTestAssistant(hospitalId){
  const btn=$('asf_test_btn'), out=$('asf_test_result');
  const body={ provider:$('asf_provider').value, model:$('asf_model').value.trim()||null,
    base_url:$('asf_baseurl').value.trim()||null };
  const key=$('asf_apikey').value.trim();
  if(key) body.api_key=key;
  btn.disabled=true; btn.textContent='در حال تست…';
  out.innerHTML=`<div class="gwid-sub">در حال اتصال به سرویس…</div>`;
  try{
    const r=await API.superTestAssistantSettings(hospitalId, body);
    if(r.ok){
      out.innerHTML=`<div class="assist-empty" style="text-align:right;border-inline-start:3px solid var(--ok,#3ecf8e);background:rgba(62,207,142,.08);border-radius:8px;padding:10px 12px">
        <div class="assist-empty-t">✅ اتصال موفق بود (${fa(r.ms)} میلی‌ثانیه)</div>
        <div class="assist-empty-d">پاسخ آزمایشی: «${esc((r.reply||'').slice(0,200))}»${r.tokens?` — ${fa(r.tokens)} توکن مصرف شد`:''}${r.model?`<br>مدلی که پاسخ داد: <b dir="ltr">${esc(r.model)}</b>`:''}</div>
      </div>`;
    } else {
      out.innerHTML=`<div class="assist-empty" style="text-align:right;border-inline-start:3px solid var(--dn);background:rgba(220,80,80,.08);border-radius:8px;padding:10px 12px">
        <div class="assist-empty-t">❌ اتصال ناموفق</div>
        <div class="assist-empty-d">${esc(r.error||'خطای نامشخص')}</div>
      </div>`;
    }
  }catch(e){
    out.innerHTML=`<div class="assist-empty" style="text-align:right;border-inline-start:3px solid var(--dn);background:rgba(220,80,80,.08);border-radius:8px;padding:10px 12px">
      <div class="assist-empty-t">❌ اتصال ناموفق</div>
      <div class="assist-empty-d">${esc(e.message)}</div>
    </div>`;
  }
  btn.disabled=false; btn.textContent='تست اتصال';
}
async function superSaveAssistant(hospitalId, hospitalName){
  const body={ provider:$('asf_provider').value, model:$('asf_model').value.trim()||null,
    base_url:$('asf_baseurl').value.trim()||null,
    monthly_token_budget: parseInt($('asf_budget').value,10) || undefined,
    chat_enabled: !!$('asf_chat')?.checked };
  const key=$('asf_apikey').value.trim();
  if(key) body.api_key=key;
  try{ await API.superSaveAssistantSettings(hospitalId, body); toast('ذخیره شد'); superAssistantForm(hospitalId, hospitalName); }
  catch(e){ toast(e.message,true); }
}
// لاگِ کاملِ گفت‌وگوهای «دانا» — کارفرما صریح خواست سوپرادمین بتواند پایش کند،
// از جمله وقتی سؤالی بیرون از حوزه‌ی نقش کاربر مسدود شده (متنِ مسدودسازی خودش
// در پیامِ دستیار ذخیره می‌شود، پس همین‌جا هم دیده می‌شود، بدون فیلد جداگانه).
// کاربرِ عادی فقط گفت‌وگوی خودش را می‌بیند (GET /api/assistant/conversations)؛
// این‌جا برعکس است — سوپرادمین کل مرکز را می‌بیند، بدون فیلترِ user_id.
async function superAssistantLog(hospitalId, hospitalName){
  const box=$('superSub');
  box.innerHTML='<div class="panel g"><div class="pbody"><div class="empty">در حال بارگذاری…</div></div></div>';
  try{
    const {conversations}=await API.superAssistantConversations(hospitalId);
    box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">📋</div>
      <div><h3>لاگ گفت‌وگوهای «دانا» — ${esc(hospitalName||'')}</h3>
      <div class="sub">هر گفت‌وگوی هر کاربر با دانا، برای پایش — از جمله وقتی سؤالی بیرون از حوزه‌ی
      سمتِ کاربر یا خارج از موضوع بوده و دانا خودش پاسخ را رد کرده.</div></div></div>
      <div class="pbody">
        ${!conversations.length?'<div class="empty">هنوز گفت‌وگویی ثبت نشده است</div>':`
        <div class="tbl-wrap"><table><thead><tr><th>کاربر</th><th>سمت</th><th>موضوع</th><th>تعداد پیام</th><th>آخرین فعالیت</th><th></th></tr></thead><tbody>
        ${conversations.map(c=>`<tr>
          <td>${esc(c.full_name||c.username)}</td>
          <td style="color:var(--td)">${esc(c.role_title||'')}</td>
          <td>${esc(c.title||'—')}</td>
          <td>${fa(c.message_count)}</td>
          <td style="color:var(--td);white-space:nowrap">${faDateTime(c.updated_at)}</td>
          <td><button class="btn btn-o btn-sm" onclick="superAssistantLogView('${hospitalId}','${c.id}','${(hospitalName||'').replace(/'/g,"\\'")}')">مشاهده ›</button></td>
        </tr>`).join('')}
        </tbody></table></div>`}
        <button class="btn btn-o btn-sm" style="margin-top:14px" onclick="document.getElementById('superSub').innerHTML=''">بستن</button>
      </div></div>`;
  }catch(e){ box.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
async function superAssistantLogView(hospitalId, conversationId, hospitalName){
  const box=$('superSub');
  box.innerHTML='<div class="panel g"><div class="pbody"><div class="empty">در حال بارگذاری…</div></div></div>';
  try{
    const {user,messages}=await API.superAssistantConversationMessages(hospitalId, conversationId);
    box.innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">📋</div>
      <div><h3>گفت‌وگوی ${esc(user.full_name||user.username)} ${user.role_title?'— '+esc(user.role_title):''}</h3>
      <div class="sub">همان چیزی که کاربر با دانا رد و بدل کرده — کامل، بدون سانسور.</div></div></div>
      <div class="pbody">
        <div class="chat-list" style="max-height:60vh">${messages.map(m=>`<div class="chat-msg ${m.role==='user'?'me':'ai'}">
          <div class="chat-bub">${esc(m.content)}${m.source==='external'?`<span class="chat-src">کمک پیشرفته${m.tokens_used?' — '+fa(m.tokens_used)+' توکن':''}</span>`:''}
            <div style="font-size:9.5px;color:var(--td);margin-top:4px">${faDateTime(m.created_at)}</div>
          </div>
        </div>`).join('')}</div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-o btn-sm" onclick="superAssistantLog('${hospitalId}','${(hospitalName||'').replace(/'/g,"\\'")}')">بازگشت به فهرست ‹</button>
          <button class="btn btn-o btn-sm" onclick="document.getElementById('superSub').innerHTML=''">بستن</button>
        </div>
      </div></div>`;
  }catch(e){ box.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
async function superCreateHospital(){
  const name=$('nh_name').value.trim();
  if(!name){ toast('نام بیمارستان الزامی است',true); return; }
  try{ await API.superCreateHospital(name); $('nh_name').value=''; toast('بیمارستان ساخته شد'); superBackToHospitals(); }
  catch(e){ toast(e.message,true); }
}
async function superToggleHospital(id,active){
  try{ await API.superSetHospitalActive(id,!!active); superRefreshHospitals(); }catch(e){ toast(e.message,true); }
}
async function superLogout(){ try{ await API.superLogout(); }catch(e){} S.superAdmin=null; renderLogin(); }
async function logout(){ try{ await API.logout(); }catch(e){} S.user=null; GUIDE_STATE=null;
  try {
    sessionStorage.removeItem('p_last_page');
    sessionStorage.removeItem('p_measures_state');
    sessionStorage.removeItem('p_hassan_state'); sessionStorage.removeItem('p_hassan_state');
    if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    else location.hash = '';
  } catch(e) {}
  const gb=$('guideDockBtn'); if(gb) gb.remove(); const gp=$('guidePanel'); if(gp) gp.classList.remove('open');
  renderGlobalHeader(); renderGlobalFooter(); renderLogin(); }
