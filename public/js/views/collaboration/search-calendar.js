/**
 * Search & Hospital Calendar
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function drawDocCodes(){
  const d = DCODE.data || { groups: [], total: 0 };
  const dupCount = d.groups.reduce((s,g)=>s+g.items.filter(i=>i.duplicate).length,0);
  const nonStd  = d.groups.reduce((s,g)=>s+g.items.filter(i=>!i.standard).length,0);

  $('content').innerHTML = `
  <div class="panel g">
    <div class="phd">${ic('docs','lg')}<div style="flex:1"><h3>دفتر کد مدارک</h3>
      <div class="sub">${fa(d.total)} سند در ${fa(d.groups.length)} دسته — کد هر سند اینجا ویرایش می‌شود
      بدون اینکه نسخه‌ی سند بالا برود.</div></div>
      <button class="btn btn-o btn-sm" onclick="renderDocCodes()">${ic('refresh')} تازه‌سازی</button>
    </div>
    <div class="pbody" style="padding-top:0">
      <div class="dcode-legend">
        <div><b>ساختار کد استاندارد</b>
          <span class="dcode-x">کد واحد — نوع سند — شماره ترتیبی</span>
          <span class="dcode-x">نمونه: <code class="ltr">IC-PR-01</code> یعنی روش اجرایی شماره ۱ واحد کنترل عفونت</span>
          <span class="dcode-x">PL خط‌مشی · PR روش اجرایی · WI دستورالعمل · FM فرم</span></div>
        <div class="dcode-stats">
          ${nonStd?`<span class="bdg b2">${fa(nonStd)} کد غیراستاندارد</span>`:'<span class="bdg b1">همه استاندارد</span>'}
          ${dupCount?`<span class="bdg b3">${fa(dupCount)} کد تکراری</span>`:''}
          ${nonStd?`<button class="btn btn-g btn-sm" onclick="dcodeAutoAll()">
            ${ic('wand')||'✦'} استانداردسازی هر ${fa(nonStd)} کد</button>`:''}
        </div>
      </div>
      ${d.groups.length ? d.groups.map(g=>dcodeGroup(g)).join('') :
        '<div class="empty">هنوز سندی ثبت نشده است.</div>'}
    </div>
  </div>
  <div id="docEditors"></div>
  <div id="dcodePrev"></div>`;
  drawDocEditors();
}

function dcodeGroup(g){
  return `<div class="dcode-grp">
    <div class="docsl">${esc(DOC_TYPE_FA[g.doc_type]||g.doc_type)} <span class="bdg b1 ltr">${esc(g.type_code)}</span>
      <span class="dcode-n">${fa(g.items.length)} سند</span></div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th style="width:170px">کد مدرک</th><th>عنوان سند</th>
        <th style="width:120px">وضعیت</th><th style="width:90px">نسخه</th>
        <th style="width:95px">سال تولید</th><th style="width:110px">ویرایش سالانه</th>
        <th style="width:290px">عملیات</th>
      </tr></thead>
      <tbody>${g.items.map(i=>dcodeRow(i)).join('')}</tbody>
    </table></div>
  </div>`;
}

function dcodeRow(i){
  const warn = i.duplicate ? ' dcode-dup' : (i.standard ? '' : ' dcode-nonstd');
  return `<tr>
    <td><input class="dcode-in${warn}" id="dc_${i.id}" value="${esc(i.doc_code||'')}"
          placeholder="بدون کد" dir="ltr" spellcheck="false"
          onkeydown="if(event.key==='Enter')dcodeSave('${i.id}')">
        ${i.duplicate?'<span class="dcode-msg dn">تکراری</span>':
          (i.standard?'':'<span class="dcode-msg wr">غیراستاندارد</span>')}</td>
    <td>${esc(i.title||'—')}
        ${i.responsible_person?`<span class="tsub">${esc(i.responsible_person)}</span>`:''}</td>
    <td><span class="bdg ${DOC_STATUS_BDG[i.status]||'b2'}">${DOC_STATUS_FA[i.status]||i.status||'—'}</span></td>
    <td>${fa(i.version_no||1)}</td>
    <td>${i.origin_year?fa(i.origin_year):'—'}</td>
    <td>${i.annual_revision?('و'+fa(i.annual_revision)):'—'}</td>
    <td style="white-space:nowrap">
      <button class="btn btn-g btn-sm" title="نام‌گذاری خودکار طبق استاندارد"
        onclick="dcodeAuto('${i.id}')">${ic('sparkle')} کد بعدی</button>
      <button class="btn btn-o btn-sm" onclick="dcodeSave('${i.id}')">${ic('check')} ثبت</button>
      <button class="btn btn-o btn-sm" title="آپلود فایل و استخراج متن با هوش مصنوعی"
        onclick="dcodeUpload('${i.id}')">${ic('docs')} آپلود فرم</button>
      <button class="btn btn-o btn-sm" onclick="dcodePreview('${i.id}')">${ic('eye')} پیش‌نمایش</button>
    </td></tr>
    <tr id="dcup_${i.id}" class="drow hide"><td colspan="7"></td></tr>`;
}

/* ---- آپلود فرم روی همان ردیفِ دفترچه + استخراج متن با هوش مصنوعی ----
   کارفرما خواست از داخلِ خودِ دفترچه بشود فرم را انتخاب کرد، فایلش را آپلود
   کرد و متنِ استخراج‌شده به‌صورت «متنِ قابلِ ویرایش» وارد فرم شود. مسیر
   استخراج همان /api/ocr/extract است که از قبل برای خواندن عکس/PDF ساخته شده
   بود — دوباره‌سازی نشد. متن پیش از ذخیره در یک کادرِ ویرایش‌پذیر نشان داده
   می‌شود، چون مدل ممکن است بخشی را [ناخوانا] برگردانده باشد و سندِ نیمه‌خوانده
   نباید بی‌تأیید در پرونده بنشیند. */
function dcodeUpload(id){
  const row = $('dcup_'+id); if(!row) return;
  const open = !row.classList.contains('hide');
  if(open){ row.classList.add('hide'); row.firstElementChild.innerHTML=''; return; }
  row.classList.remove('hide');
  row.firstElementChild.innerHTML = `
    <div class="dcup">
      <div class="fg" style="margin:0"><label>فایل فرم (عکس یا PDF)</label>
        <input type="file" id="dcupf_${id}" accept="image/*,application/pdf"></div>
      <button class="btn btn-g btn-sm" onclick="dcodeExtract('${id}')">${ic('sparkle')} خواندن با هوش مصنوعی</button>
      <span id="dcupmsg_${id}" class="tsub"></span>
      <div id="dcupout_${id}"></div>
    </div>`;
}

async function dcodeExtract(id){
  const f = $('dcupf_'+id)?.files?.[0];
  const msg = $('dcupmsg_'+id);
  if(!f){ if(msg) msg.textContent='اول یک فایل انتخاب کنید'; return; }
  if(msg) msg.textContent='در حال خواندن…';
  try{
    const r = await API.ocrExtract(f);
    if(msg) msg.textContent = 'خوانده شد' + (r.model?` (${r.model})`:'');
    $('dcupout_'+id).innerHTML = `
      <div class="fg" style="margin-top:8px"><label>متنِ استخراج‌شده — پیش از ذخیره ویرایش کنید</label>
        <textarea id="dcuptx_${id}" rows="8">${esc(r.text||'')}</textarea></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="dcupfield_${id}" class="sel" style="max-width:220px">
          <option value="work_method">محتوای اصلی سند (روش کار)</option>
          <option value="purpose">هدف</option>
          <option value="scope">دامنه</option>
          <option value="definitions">تعاریف</option>
        </select>
        <button class="btn btn-g btn-sm" onclick="dcodeSaveExtract('${id}')">${ic('check')} ذخیره در سند</button>
      </div>`;
  }catch(e){ if(msg) msg.textContent = e.message; }
}

async function dcodeSaveExtract(id){
  const txt = $('dcuptx_'+id)?.value || '';
  const field = $('dcupfield_'+id)?.value || 'work_method';
  const msg = $('dcupmsg_'+id);
  if(!txt.trim()){ if(msg) msg.textContent='متن خالی است'; return; }
  try{
    await API.updateDocument(id, { [field]: txt });
    if(msg) msg.textContent='در سند ذخیره شد';
    toast('متن در سند ذخیره شد');
  }catch(e){ if(msg) msg.textContent = e.message; toast(e.message, true); }
}

// «کد بعدی» — سرور شماره‌ی آزادِ بعدی همان واحد و نوع را می‌سازد و ذخیره می‌کند
async function dcodeAuto(id){
  try{
    const r = await API.saveDocCode(id, null, true);
    toast('کد خودکار ثبت شد: ' + r.code);
    await renderDocCodes();
  }catch(e){ toast(e.message,true); }
}
// استانداردسازی گروهی — بدون این، مدیر اعتباربخشی باید روی هر ردیف دو کلیک
// جدا بزند؛ روی ۱۵ سندِ قدیمی یعنی سی کلیک برای کاری که یک تصمیم است.
async function dcodeAutoAll(){
  const ids = (((DCODE.data||{}).groups)||[]).flatMap(g => (g.items||[])
    .filter(it => !it.standard).map(it => it.id));
  if(!ids.length){ toast('کد غیراستانداردی نمانده است'); return; }
  if(!await BTN.confirmDanger(`کد ${fa(ids.length)} سند به شکل استاندارد بازنویسی شود؟\n`+
              'کدهای فعلی در همان لحظه عوض می‌شوند و این کار برگشت‌پذیر نیست.')) return;
  let done=0, failed=0;
  for(const id of ids){
    try{ await API.saveDocCode(id, null, true); done++; }
    catch(e){ failed++; }
  }
  toast(failed ? `${fa(done)} کد استاندارد شد، ${fa(failed)} کد ناموفق`
               : `${fa(done)} کد استاندارد شد`, !!failed);
  await renderDocCodes();
}
async function dcodeSave(id){
  const el = $('dc_'+id); if(!el) return;
  try{
    const r = await API.saveDocCode(id, el.value.trim(), false);
    toast('کد ثبت شد: ' + r.code);
    await renderDocCodes();
  }catch(e){ toast(e.message,true); }
}

// پیش‌نمایش فرم داخل همان صفحه — بدون خروج از جدول
async function dcodePreview(id){
  const box = $('dcodePrev'); if(!box) return;
  box.innerHTML = '<div class="panel g"><div class="empty">در حال بارگذاری پیش‌نمایش…</div></div>';
  box.scrollIntoView({behavior:'smooth', block:'start'});
  try{
    const { document: d } = await API.document(id);
    const sec = (lbl, val) => val ? `<div class="dcode-sec"><span>${lbl}</span>${docHtml(val)}</div>` : '';
    box.innerHTML = `
    <div class="panel g docprint" style="margin-top:14px">
      <div class="phd noprint">${ic('eye','lg')}<div style="flex:1"><h3>پیش‌نمایش سند</h3>
        <div class="sub">همان چیزی که در چاپ دیده می‌شود</div></div>
        <button class="btn btn-o btn-sm" onclick="dpPrint()">${ic('print')} چاپ</button>
        <button class="btn btn-o btn-sm" onclick="openDocument('${id}')">${ic('edit')} باز کردن کامل</button>
        <button class="btn btn-o btn-sm" onclick="$('dcodePrev').innerHTML=''">${ic('close')} بستن</button>
      </div>
      <div class="pbody">
        <table class="psheet">
        <thead><tr><td>${docLetterhead(`${DOC_TYPE_FA[d.doc_type]||d.doc_type||''} — ${esc(d.doc_code||'بدون کد')}`)}</td></tr></thead>
        <tfoot><tr><td><div class="psheet-foot"><span>${esc(S.user.hospital_name||'')}</span>
          <span>${esc(d.doc_code||'')} · ${esc(d.title||'')}</span></div></td></tr></tfoot>
        <tbody><tr><td>
        ${docDatesBar(d)}
        <h3 style="margin:0 0 12px">${esc(d.title||'—')}</h3>
        ${sec('هدف', d.purpose)}
        ${sec('دامنه کاربرد', d.scope)}
        ${sec('فرد پاسخگو', d.responsible_person)}
        ${sec('شیوه انجام کار', d.work_method)}
        ${sec('نحوه نظارت بر اجرا', d.monitoring_method)}
        ${(!d.purpose && !d.scope && !d.work_method)
          ? '<div class="empty">این سند هنوز محتوایی ندارد.</div>' : ''}
        </td></tr></tbody></table>
      </div>
    </div>`;
  }catch(e){ box.innerHTML = `<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}


/* ==================== تصدی سمت‌ها ====================
   «چه کسی، چه سمتی، از کِی تا کِی». مسئله‌ی واقعی این نیست که داده‌ی متصدی
   قبلی پاک شود — نمی‌شود، چون هر رکورد created_by دارد و کاربر هرگز حذف
   نمی‌شود. مسئله این است که بدون بازه‌ی زمانی نمی‌شود گفت فلان صورت‌جلسه
   مالِ دوره‌ی کدام مدیر پرستاری بوده. این صفحه همان را نشان می‌دهد. */
const TEN = { data:null };

async function renderTenures(){
  $('ptitle').textContent='تصدی سمت‌ها';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{ TEN.data = await API.tenures(); }
  catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; return; }
  const d=TEN.data, changed=d.groups.filter(g=>g.changed);
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd">${ic('clock','lg')}<div style="flex:1"><h3>تصدی سمت‌ها</h3>
      <div class="sub">${fa(d.total)} دوره‌ی تصدی روی ${fa(d.groups.length)} سمت.
      ${changed.length?`${fa(changed.length)} سمت بیش از یک متصدی داشته است.`:'هیچ سمتی هنوز جابه‌جا نشده.'}</div></div>
    </div>
    <div class="pbody" style="padding-top:0">
      <div class="sd-note" style="margin-bottom:16px">${ic('lock')}
        <div>کاربر هرگز از سامانه حذف نمی‌شود؛ فقط غیرفعال می‌شود. پس کارهای متصدی
        قبلی به نام خودش باقی می‌ماند. این جدول بازه‌ی هر تصدی را نشان می‌دهد تا
        بشود گفت هر رکورد در دوره‌ی <b>کدام</b> متصدی ثبت شده است.</div></div>
      ${d.groups.length? d.groups.map(g=>tenGroup(g)).join('') : '<div class="empty">هنوز تصدی‌ای ثبت نشده.</div>'}
    </div>
  </div>`;
}

function tenGroup(g){
  return `<div class="ten-grp">
    <div class="docsl">${esc(g.role_title)}
      ${g.changed?`<span class="bdg b2">${fa(g.holders.length)} متصدی</span>`:'<span class="bdg b1">بدون جابه‌جایی</span>'}</div>
    <div class="ten-line">${g.holders.map((h,i)=>`
      <div class="ten-item${h.ended_on?'':' ten-now'}">
        <span class="ten-dot"></span>
        <div>
          <b>${esc(h.full_name)}</b>
          ${h.ended_on?'':'<span class="bdg b1">متصدی فعلی</span>'}
          ${h.is_active?'':'<span class="bdg b3">غیرفعال</span>'}
          <span class="ten-range">از ${faDateISO(h.started_on)} ${h.ended_on?`تا ${faDateISO(h.ended_on)}`:'تا کنون'}</span>
          ${h.note?`<span class="tsub">${esc(h.note)}</span>`:''}
        </div>
      </div>`).join('')}</div>
  </div>`;
}

/* ---------- ویرایشگران مجازِ فرم‌ها (روی صفحه‌ی دفتر کد) ---------- */
async function drawDocEditors(){
  const box=$('docEditors'); if(!box) return;
  try{
    const {granted, candidates} = await API.docEditors();
    box.innerHTML=`
    <div class="panel g" style="margin-top:14px">
      <div class="phd">${ic('users','lg')}<div style="flex:1"><h3>ویرایشگران مجاز فرم‌ها</h3>
        <div class="sub">افرادی که شما به آن‌ها اجازه‌ی ویرایش فرم‌ها داده‌اید — بدون اینکه مجوز کامل مدیریت مدارک بگیرند.</div></div></div>
      <div class="pbody" style="padding-top:0">
        <div class="rb-filters">
          <select id="deU"><option value="">انتخاب کاربر…</option>
            ${candidates.map(c=>`<option value="${esc(c.id)}">${esc(c.full_name)}${c.role_title?' — '+esc(c.role_title):''}</option>`).join('')}
          </select>
          <input id="deN" placeholder="توضیح (اختیاری) — مثلاً «فقط فرم‌های واحد تغذیه»">
          <button class="btn btn-g btn-sm" onclick="grantDocEditor()">${ic('plus')} دادن دسترسی</button>
        </div>
        ${granted.length?`<div class="tbl-wrap"><table>
          <thead><tr><th>نام</th><th>سمت</th><th>توضیح</th><th style="width:130px">تاریخ اعطا</th><th style="width:110px"></th></tr></thead>
          <tbody>${granted.map(x=>`<tr>
            <td>${esc(x.full_name)}</td><td>${esc(x.role_title||'—')}</td>
            <td>${esc(x.note||'—')}</td><td>${faDateISO(x.granted_at)}</td>
            <td><button class="btn btn-o btn-sm" onclick="revokeDocEditor('${esc(x.id)}')">${ic('close')} لغو</button></td>
          </tr>`).join('')}</tbody></table></div>`
        :'<div class="empty">هنوز به کسی دسترسی ویرایش داده نشده.</div>'}
      </div>
    </div>`;
  }catch(e){ box.innerHTML=''; }
}
async function grantDocEditor(){
  const u=$('deU')?.value, n=$('deN')?.value||'';
  if(!u){ toast('اول کاربر را انتخاب کنید',true); return; }
  try{ const r=await API.grantDocEditor(u,n); toast(`دسترسی ویرایش به «${r.full_name}» داده شد`); drawDocEditors(); }
  catch(e){ toast(e.message,true); }
}
async function revokeDocEditor(id){
  if(!await BTN.confirmDanger('دسترسی ویرایش فرم‌ها از این کاربر گرفته شود؟')) return;
  try{ await API.revokeDocEditor(id); toast('دسترسی لغو شد'); drawDocEditors(); }
  catch(e){ toast(e.message,true); }
}

// ==================== CALENDAR ====================
// شبکه‌ی ماهانه‌ی شمسی. ستون‌ها شنبه→جمعه؛ چون RTL است، ستون اول (شنبه) سمت راست می‌افتد.
// رویدادها از calendar_events می‌آیند (جلسه‌ی کمیته هم همان‌جاست) و داخل خانه‌ی روز نشان داده می‌شوند.
const CAL = { y:null, m:null, events:[], sel:null };
const JMONTHS_FA=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const JDOW_FA=['شنبه','یک‌شنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه'];
// نام هر ماه شمسی برگرفته از نامِ ایزد/امشاسپندِ نگهبانِ همان روز در تقویم باستانی
// ایرانی است (سنت رایج «هم‌نامیِ روز و ماه»)؛ آیکون هم بر همان مفهوم منطبق است —
// نه یک زینتِ دلبخواهی. فقط برای نمایش در هدر/انتخابگر تقویم است.
const JMONTHS_ANCIENT=[
 {n:'فروَشی‌ها (فروهر)', ic:'🕊'},   // فروردین
 {n:'اَشا · راستی و آتش', ic:'🔥'},  // اردیبهشت
 {n:'خرداد · کمال و آب', ic:'💧'},   // خرداد
 {n:'تیشتر · باران‌آور', ic:'🏹'},   // تیر
 {n:'اَمرداد · جاودانگیِ گیاه', ic:'🌿'}, // مرداد
 {n:'شهریور · فلز و کشور آرمانی', ic:'⚔'}, // شهریور
 {n:'مهر · پیمان و خورشید', ic:'☀'}, // مهر
 {n:'آبان · ایزدبانوی آب', ic:'🌊'}, // آبان
 {n:'آذر · آتش', ic:'🔥'},           // آذر
 {n:'دی · آفریدگار', ic:'✨'},       // دی
 {n:'بهمن · نیک‌اندیشی', ic:'🐄'},   // بهمن
 {n:'اسفند · فروتنی و زمین', ic:'🌍'}, // اسفند
];

// شماره‌ی ستون (۰=شنبه) برای ۱ام ماه. getDay(): ۰=یک‌شنبه … ۶=شنبه ⇒ شنبه باید ۰ شود.
function jalaliFirstDow(jy,jm){
  const g=toGregorian(jy,jm,1);
  return (new Date(g.gy,g.gm-1,g.gd).getDay()+1)%7;
}
function jIso(jy,jm,jd){
  const g=toGregorian(jy,jm,jd);
  return g.gy+'-'+String(g.gm).padStart(2,'0')+'-'+String(g.gd).padStart(2,'0');
}
async function renderCalendar(){
  $('ptitle').textContent='تقویم';
  const t=todayJalali();
  if(CAL.y===null){ CAL.y=S.year||t.jy; CAL.m=(S.year&&S.year!==t.jy)?1:t.jm; }
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{ CAL.events=(await API.calendarEvents(CAL.y,CAL.m)).events||[]; }
  catch(e){ CAL.events=[]; toast(e.message,true); }
  drawCalendar();
}
function calNav(dm){
  let m=CAL.m+dm, y=CAL.y;
  if(m<1){ m=12; y--; } if(m>12){ m=1; y++; }
  CAL.y=y; CAL.m=m; CAL.sel=null; renderCalendar();
}
function calToday(){ const t=todayJalali(); CAL.y=t.jy; CAL.m=t.jm; CAL.sel=jIso(t.jy,t.jm,t.jd); renderCalendar(); }
function calSetYear(v){ CAL.y=+v; CAL.sel=null; renderCalendar(); }
function calSetMonth(v){ CAL.m=+v; CAL.sel=null; renderCalendar(); }
function calPick(iso){ CAL.sel=(CAL.sel===iso?null:iso); drawCalendar(); }

function drawCalendar(){
  const y=CAL.y, m=CAL.m;
  const days=jalaliDaysInMonth(y,m), lead=jalaliFirstDow(y,m);
  const t=todayJalali(), todayIso=jIso(t.jy,t.jm,t.jd);
  const byDate={};
  for(const e of CAL.events){ const k=(e.event_date||'').slice(0,10); (byDate[k]=byDate[k]||[]).push(e); }

  let cells='';
  for(let i=0;i<lead;i++) cells+='<div class="cal-cell cal-off"></div>';
  for(let d=1;d<=days;d++){
    const iso=jIso(y,m,d), evs=byDate[iso]||[];
    cells+='<div class="cal-cell'+(iso===todayIso?' cal-today':'')+(CAL.sel===iso?' cal-sel':'')+
      '" onclick="calPick(\''+iso+'\')"><div class="cal-dn">'+fa(d)+'</div>'+
      evs.slice(0,3).map(e=>'<div class="cal-ev'+(e.event_type==='committee_meeting'?' cal-ev-mt':'')+'" title="'+esc(e.title||'')+'">'+esc(e.title||'')+'</div>').join('')+
      (evs.length>3?'<div class="cal-more">+'+fa(evs.length-3)+' مورد</div>':'')+'</div>';
  }

  const sel=CAL.sel?(byDate[CAL.sel]||[]):null;
  const selJ=CAL.sel?(()=>{const p=CAL.sel.split('-');return toJalali(+p[0],+p[1],+p[2]);})():null;
  let yOpts=''; for(let yy=y+2;yy>=y-4;yy--) yOpts+='<option value="'+yy+'"'+(yy===y?' selected':'')+'>'+fa(yy)+'</option>';
  // در <option> نمی‌شود SVG گذاشت، پس آنجا نام برج نوشته می‌شود؛ آیکونِ برج در سربرگ می‌آید.
  let mOpts=''; JMONTHS_FA.forEach((n,i)=>{ const b=(typeof monthInfo==='function')?monthInfo(i+1):null;
    mOpts+='<option value="'+(i+1)+'"'+(i+1===m?' selected':'')+'>'+n+(b?' — برج '+b.burj:'')+'</option>'; });
  const amonth=JMONTHS_ANCIENT[m-1]||{n:'',ic:''};
  const burj=(typeof monthInfo==='function')?monthInfo(m):null;
  const monBadge=(typeof monthIcon==='function')?monthIcon(m):'';

  $('content').innerHTML=
  '<div class="panel g"><div class="phd">'+monBadge+
    '<div><h3 class="cal-mname">'+JMONTHS_FA[m-1]+' '+fa(y)+
      (burj?'<span class="cal-mancient">برج '+esc(burj.burj)+' — '+esc(burj.sym)+' · نام باستانی: '+esc(amonth.n)+'</span>':'<span class="cal-mancient">نام باستانی: '+esc(amonth.n)+'</span>')+'</h3>'+
    '<div class="sub">'+fa(CAL.events.length)+' رویداد در این ماه</div></div>'+
    '<div style="margin-right:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<select onchange="calSetMonth(this.value)">'+mOpts+'</select>'+
      '<select onchange="calSetYear(this.value)">'+yOpts+'</select>'+
      '<button class="btn btn-o btn-sm" onclick="calNav(-1)">‹ ماه قبل</button>'+
      '<button class="btn btn-g btn-sm" onclick="calToday()">امروز</button>'+
      '<button class="btn btn-o btn-sm" onclick="calNav(1)">ماه بعد ›</button>'+
    '</div></div>'+
    '<div class="cal-grid cal-head">'+JDOW_FA.map(d=>'<div class="cal-dow">'+d+'</div>').join('')+'</div>'+
    '<div class="cal-grid">'+cells+'</div>'+
  '</div>'+
  (sel?'<div class="panel g"><div class="phd"><div class="abadge">◈</div><div><h3>'+
     fa(selJ.jd)+' '+JMONTHS_FA[selJ.jm-1]+' '+fa(selJ.jy)+'</h3>'+
     '<div class="sub">'+fa(sel.length)+' رویداد</div></div></div>'+
     (sel.length?'<div class="tbl-wrap"><table><thead><tr><th>عنوان</th><th>ساعت</th><th>اتاق</th><th>کمیته</th></tr></thead><tbody>'+
       sel.map(e=>'<tr><td>'+esc(e.title||'—')+'</td><td>'+
         (e.start_time?fa(e.start_time)+(e.end_time?' تا '+fa(e.end_time):''):'—')+'</td><td>'+
         esc(e.room_name||'—')+(e.room_location?' ('+esc(e.room_location)+')':'')+'</td><td>'+
         esc(e.committee_name||'—')+'</td></tr>').join('')+
       '</tbody></table></div>':'<div class="empty">رویدادی در این روز ثبت نشده است</div>')+
   '</div>':'');
}

// ==================== REPORTS ====================
// گزارش اختلاف: «کجا خودمان را بالاتر از واقعیت دیده‌ایم؟»
// این تنها خروجی‌ای است که سه‌ستونه‌کردن نمره را ارزشمند می‌کند — بدون آن،
// ثبت نمره‌ی ارزیاب فقط یک بایگانی است.
async function renderReviewGaps(){
  $('ptitle').textContent='اختلاف خودارزیابی با ارزیاب';
  const box=$('content');
  box.innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  let d;
  try{ d=await API.reviewGaps(); }
  catch(e){ box.innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; return; }
  if(S.page!=='reviewgaps') return;

  const over=d.gaps.filter(g=>g.direction==='over');
  const under=d.gaps.filter(g=>g.direction==='under');
  const row=g=>`<tr>
    <td style="color:var(--gdl);white-space:nowrap">${esc(g.code)}</td>
    <td>${esc(fixText(g.statement)).slice(0,90)}${(g.statement||'').length>90?'…':''}</td>
    <td style="white-space:nowrap">${ROLE_FA[g.responsible_role]||'—'}</td>
    <td><span class="bdg ${REV_CLS[g.self_status]==='s-f'?'b1':(REV_CLS[g.self_status]==='s-p'?'b2':'b3')}">${REV_FA[g.self_status]||'—'}</span></td>
    <td><span class="bdg ${REV_CLS[g.review_status]==='s-f'?'b1':(REV_CLS[g.review_status]==='s-p'?'b2':'b3')}">${REV_FA[g.review_status]||'—'}</span>
      <span class="tsub">${g.review_kind==='external'?'ارزیاب وزارت':'ارزیاب دانشگاه'}</span></td>
    <td>${g.patient_safety_flag?'<span class="bdg bsf">✦</span>':''}<span class="bdg b${g.measure_level||1}">سطح ${fa(g.measure_level||1)}</span></td>
  </tr>`;
  const tbl=(list,head)=>list.length?`<div class="tbl-wrap"><table>
    <thead><tr><th>کد</th><th>سنجه</th><th>مسئول</th><th>خودارزیابی ما</th><th>نمره‌ی ارزیاب</th><th></th></tr></thead>
    <tbody>${list.map(row).join('')}</tbody></table></div>`
    : `<div class="empty">${head}</div>`;

  box.innerHTML=`
  <div class="stats">
    <div class="st g gold"><div class="l">خودمان را بالاتر دیده‌ایم</div>
      <div class="v" style="color:var(--dn)">${fa(over.length)}</div></div>
    <div class="st g"><div class="l">ارزیاب بالاتر داده</div><div class="v">${fa(under.length)}</div></div>
    <div class="st g"><div class="l">هم‌نظر</div><div class="v" style="color:var(--ok)">${fa(d.agreed)}</div></div>
    <div class="st g"><div class="l">کل سنجه‌های ارزیابی‌شده</div><div class="v">${fa(d.reviewed)}</div></div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">!</div><div style="flex:1"><h3>خوش‌بینی ما — اولویت اول</h3>
      <div class="sub">سنجه‌هایی که خودارزیابی ما از نمره‌ی ارزیاب بالاتر بوده. اینجا همان جایی است که در ارزیابی رسمی امتیاز از دست می‌رود.</div></div></div>
    <div class="pbody">${tbl(over,'در هیچ سنجه‌ای خودمان را بالاتر ندیده‌ایم — خودارزیابی واقع‌بینانه بوده است.')}</div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">◈</div><div style="flex:1"><h3>سخت‌گیری ما</h3>
      <div class="sub">ارزیاب نمره‌ی بالاتری داده است. اینجا احتمالاً شواهد موجود را در خودارزیابی به حساب نیاورده‌ایم.</div></div></div>
    <div class="pbody">${tbl(under,'موردی نیست.')}</div>
  </div>
  ${!d.reviewed?`<div class="sd-note">${ic('info')||'◇'}
    <div>هنوز هیچ نمره‌ی ارزیابی ثبت نشده است. نمره‌ی ارزیاب داخلی دانشگاه و ارزیاب بیرونی وزارت
    را از صفحه‌ی «سنجه‌ها و ارزیابی»، زیر هر سنجه، ثبت کنید تا این گزارش ساخته شود.</div></div>`:''}`;
}
