/**
 * Activities Log & Dynamic FormBuilder
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function rgSections(){
  const g=roleGuide();
  // فهرست محورها را در لحظه از همان منبعی می‌گیریم که درخت ناوبری از آن ساخته می‌شود
  // (myAxes → roleScope → src/config/role-axes.js) تا متن راهنما هرگز از دسترسی واقعی جدا نیفتد.
  let axes=[]; try{ axes=myAxes(); }catch(e){ axes=[]; }
  const axHtml = axes.length
    ? `<div class="rg-axes">${axes.map(({sec,ax})=>
        `<div class="rg-ax" role="button" tabindex="0" onclick="selAxis('${esc(ax.code)}')"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selAxis('${esc(ax.code)}')}"
           title="ورود به محور «${esc(ax.title)}» و دیدن سنجه‌هایش">
           <b>${esc(ax.code)}</b> ${esc(ax.title)}
           <i>${esc(sec.title)} — ${fa((ax.measures||[]).length)} سنجه</i>
           <span class="rg-axgo">دیدن سنجه‌ها ◂</span></div>`).join('')}</div>`
    : `<div class="rg-note">در حال حاضر هیچ محوری به شما اختصاص نیافته است. اگر فکر می‌کنید باید محوری داشته باشید، از «پیام‌های داخلی» به مدیر داخلی اطلاع دهید.</div>`;

  return [
    {h:'نقش شما در این سامانه چیست؟', b:`<p>${g.who}</p>`},

    {h:'چه چیزی می‌بینید و چرا؟', b:`<p>${g.why}</p>
      <p class="rg-h">محورهایی که هم‌اکنون به شما اختصاص دارد:</p>
      ${axHtml}`},

    {h:'وضعیت‌های سنجه یعنی چه؟', b:`
      <p>کنار هر سنجه یک کشوی وضعیت با چهار حالت است. انتخاب درست آن، مهم‌ترین کار روزانه‌ی شما در این سامانه است.</p>
      <div class="rg-st">${RG_STATUS.map(s=>`
        <div class="rg-sti ${s.c}"><div class="rg-stt">${s.t}</div>
          <div class="rg-std">${s.d}</div><div class="rg-ste">${s.e}</div></div>`).join('')}</div>
      <p class="rg-h">یک نمونه‌ی درست برای کار شما (فایل بارگذاری‌شده + توضیح):</p>
      <div class="rg-ex">${g.ev}</div>
      <div class="rg-warn">قانون طلایی: مدرک باید <b>در خود سامانه</b> باشد. در کادر «✎ ثبت مدرک» هر سنجه، فایل واقعی مدرک را بارگذاری کنید و توضیح را کنار آن بنویسید؛ نوشتن آدرسِ بایگانی کاغذی («در زونکن فلان») دیگر شاهد محسوب نمی‌شود. «انطباق کاملِ» بدون فایل، در روز ارزیابی از «انطباق نسبیِ» صادقانه بدتر است.</div>`},

    {h:'اولین قدم چیست؟', b:`
      <div class="rg-steps">${g.steps.map((s,i)=>`
        <div class="rg-step"><div class="rg-sn">${fa(i+1)}</div>
          <div class="rg-sb"><b>${s.t}</b><span>${s.x}</span>
            <button class="btn btn-g" onclick="go('${s.p}')">بریم به این بخش ◂</button></div></div>`).join('')}</div>`},

    {h:'چند چیز که خوب است بدانید', b:`
      <div class="rg-abc">${RG_ABC.map(a=>`<div class="rg-abci"><b>${a.t}</b><span>${a.x}</span></div>`).join('')}</div>`},

    {h:'اگر گیر کردید', b:`<p>${g.help}</p>
      <div class="rg-act">
        <button class="btn btn-g" onclick="go('messages')">✍ ارسال پیام داخلی</button>
        <button class="btn btn-o" onclick="openTour()">◉ گردش گام‌به‌گام سامانه</button>
      </div>`},
  ];
}

// keep=true یعنی روی بخش جاری بمان (ناوبری داخلی / رد کردن راهنما)؛
// بدون آرگومان — یعنی ورود از منو — همیشه از بخش یک شروع می‌شود.
function renderRoleGuide(keep){
  $('ptitle').textContent='راهنمای نقش من';
  const roleName=ROLE_FA[S.user.role_code]||S.user.role_title||S.user.role_code||'کاربر';
  const secs=rgSections();
  if(!keep) rgStep=0;
  if(rgStep>=secs.length) rgStep=secs.length-1;
  if(rgStep<0) rgStep=0;
  const i=rgStep, last=(i===secs.length-1), s=secs[i];

  $('content').innerHTML=`
  <div class="rg">
    <div class="rg-hero g">
      <div class="rg-eb">راهنمای اختصاصی شما</div>
      <h1>${esc(S.user.full_name||'')} عزیز، خوش آمدید</h1>
      <p class="rg-sub">سمت شما در این سامانه: <b>${esc(roleName)}</b></p>
      <p class="rg-lead">این راهنما ${fa(secs.length)} بخش کوتاه دارد و هر بار یک بخش نشان داده می‌شود. با دکمه‌های پایین صفحه جلو و عقب بروید. هر وقت خواستید می‌توانید از منوی کنار صفحه دوباره به همین راهنما برگردید.</p>
    </div>

    <div class="rg-prog">
      <div class="odots rg-dots">${secs.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div>
      <span class="rg-cnt">بخش ${fa(i+1)} از ${fa(secs.length)}</span>
    </div>

    <section class="rg-s g"><h2><span class="rg-n">${fa(i+1)}</span> ${esc(s.h)}</h2>
      ${s.b}</section>

    <div class="rg-foot g">
      <div class="rg-navb">
        ${i>0 ? `<button class="btn btn-o" onclick="rgGo(${i-1})">◂ صفحه قبل</button>` : `<span></span>`}
      </div>
      ${last
        ? (rgSeen()
            ? `<span class="rg-ok">✓ این راهنما دیگر خودکار باز نمی‌شود. هر وقت خواستید از منوی «راهنمای نقش من» به همین صفحه برگردید.</span>`
            : `<span>وقتی مطالب بالا را خواندید، این دکمه را بزنید تا این صفحه دیگر خودکار باز نشود:</span>
               <button class="btn btn-g" onclick="rgDismiss()">خواندم — دیگر خودکار نشان نده</button>`)
        : `<button class="btn btn-g" onclick="rgGo(${i+1})">خواندم — بعدی</button>`}
    </div>
  </div>`;
}

// ==================== TOUR ====================
const TOUR=[
 {e:'گام ۱ از ۵',t:'بخش مورد نظر را باز کنید',
  v:`<div style="width:78%"><div class="spot">الف — رهبری و مدیریت</div>
     <div style="margin-top:9px;padding-right:16px;font-size:11.5px;color:var(--td)">└ الف‑۴ مدیریت خدمات پرستاری</div></div>`,
  x:'در ستون راست، بخش‌های اصلی کتاب را می‌بینید. روی نام هر بخش کلیک کنید تا فقط همان باز شود و محورهای زیرمجموعه‌اش نمایش داده شود. بخش قبلی خودکار بسته می‌شود.'},
 {e:'گام ۲ از ۵',t:'محور خود را انتخاب کنید',
  v:`<div style="width:78%"><div style="font-size:11.5px;color:var(--td);margin-bottom:7px">الف — رهبری و مدیریت</div>
     <div class="spot" style="margin-right:16px">الف‑۴ مدیریت خدمات پرستاری &nbsp;<span style="color:var(--td);font-size:10px">۳/۱۶</span></div></div>`,
  x:'کنار هر محور، تعداد سنجه‌های تکمیل‌شده از کل نمایش داده می‌شود. فقط محورهایی را می‌بینید که به نقش شما مربوط است.'},
 {e:'گام ۳ از ۵',t:'استاندارد را باز کنید تا سنجه‌ها ظاهر شوند',
  v:`<div style="width:82%"><div class="spot" style="font-size:11.5px">الف‑۴‑۱ &nbsp; صلاحیت کارکنان پرستاری احراز می‌شود &nbsp;<span style="color:var(--td)">۲/۵</span></div></div>`,
  x:'هر محور از چند استاندارد و هر استاندارد از چند سنجه تشکیل شده. با کلیک روی استاندارد، سنجه‌های زیرمجموعه‌اش باز می‌شود.'},
 {e:'گام ۴ از ۵',t:'راهنمای تکمیل را بخوانید',
  v:`<div style="display:flex;gap:9px;align-items:center"><div class="spot">◈ راهنمای تکمیل</div>
     <div style="font-size:11px;color:var(--td)">یا</div><div class="spot">▤ متن اصلی کتاب</div></div>`,
  x:'«راهنمای تکمیل» فهرست اقدامات لازم و مدارکی که بازرس می‌خواهد را نشان می‌دهد. برای دیدن عین متن رسمی وزارت بهداشت، «متن اصلی کتاب» را باز کنید. علامت ؟ طلایی کنار هر گزینه توضیح آن را می‌دهد.'},
 {e:'گام ۵ از ۵',t:'وضعیت و محل مدرک را ثبت کنید',
  v:`<div style="display:flex;gap:9px;align-items:center"><div class="spot" style="color:var(--ok);border-color:var(--ok)">انطباق کامل</div>
     <div class="spot">✎ ثبت مدرک</div></div>`,
  x:'پس از بررسی، وضعیت واقعی را انتخاب و در «ثبت مدرک» بنویسید سند کجاست و مسئولش کیست. داشبورد و گزارش‌ها بلافاصله به‌روز می‌شوند و می‌توانید خروجی CSV برای بازرس بگیرید.'},
];
let ti=0, __tourFirst=false;
function openTour(){ ti=0; drawTour(); }
function drawTour(){
  const s=TOUR[ti]; const old=$('tourOvl'); if(old) old.remove();
  const w=document.createElement('div'); w.className='ovl'; w.id='tourOvl';
  w.innerHTML=`<div class="ocard gs"><div class="obody"><div class="oeb">${s.e}</div><h2>${s.t}</h2>
    <div class="ovis">${s.v}</div><p>${s.x}</p></div>
    <div class="odots">${TOUR.map((_,i)=>`<i class="${i===ti?'on':''}"></i>`).join('')}</div>
    <div class="ofoot"><button class="btn btn-o" onclick="closeTour()">بستن</button>
    <button class="btn btn-g" onclick="nextTour()">${ti===TOUR.length-1?'شروع کار':'بعدی ◂'}</button></div></div>`;
  document.body.appendChild(w);
}
function nextTour(){ if(ti<TOUR.length-1){ti++;drawTour();} else closeTour(); }
function closeTour(){
  const e=$('tourOvl'); if(e) e.remove();
  // فقط بعد از گردشِ اولین ورود، کاربر را به راهنمای نقشش می‌بریم؛
  // اگر خودش گردش را از منو باز کرده باشد، صفحه‌اش عوض نمی‌شود.
  if(__tourFirst){ __tourFirst=false; if(S.user && !rgSeen()) go('guide'); }
}


// ==================== ثبت فعالیت‌ها + فرم‌ساز پویا (activity_types.form_schema) ====================
// فرم‌سازِ داده‌محور روی activity_types سوار می‌شود، نه به‌شکل یک درخت محتوایی جدید.
// هر نوع فعالیت می‌تواند فیلدهای سفارشی خودش را داشته باشد.
const FS_TYPE_FA = {text:'متن', number:'عدد', date:'تاریخ', select:'انتخاب از فهرست', boolean:'بله/خیر'};
let ACT = {view:'list', types:[], records:[], fields:[], editTypeId:null, typeId:'', current:null};

const actPerm = p => (S.user?.permissions||[]).includes(p);
const canManageActTypes = () => actPerm('manage_activity_types');
const canSubmitAct = () => actPerm('submit_activity_record');
const canSeeActivities = () => canManageActTypes() || canSubmitAct() ||
  actPerm('view_own_activity_records') || actPerm('view_all_activity_records');

async function renderActivities(){
  $('ptitle').textContent='ثبت فعالیت‌ها';
  if(ACT.view==='typeForm') return drawActTypeForm();
  if(ACT.view==='recordForm') return drawActRecordForm();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [t,r]=await Promise.all([API.activityTypes(), API.activityRecords().catch(()=>({records:[]}))]);
    ACT.types=t.types||[]; ACT.records=r.records||[];
    drawActList();
  }catch(e){ $('content').innerHTML='<div class="panel g"><div class="empty">'+esc(e.message)+'</div></div>'; }
}

function drawActList(){
  const byId=Object.fromEntries(ACT.types.map(t=>[t.id,t]));
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⧉</div>
      <div style="flex:1"><h3>انواع فعالیت</h3>
      <div class="sub">${fa(ACT.types.length)} نوع فعالیت — هر نوع می‌تواند فیلدهای سفارشی خودش را داشته باشد</div></div>
      ${canSubmitAct()?`<button class="btn btn-g btn-sm" onclick="newActRecord()">+ ثبت فعالیت</button>`:''}
      ${canManageActTypes()?`<button class="btn btn-o btn-sm" onclick="newActType()">+ نوع فعالیت جدید</button>`:''}
    </div>
    <div class="pbody">
      ${!ACT.types.length?'<div class="empty"><div class="ei">⧉</div>هنوز نوع فعالیتی تعریف نشده است</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>عنوان</th><th>ماژول</th><th>فیلد سفارشی</th><th>سند الزامی</th><th>عملیات</th></tr></thead>
        <tbody>${ACT.types.map(t=>`<tr>
          <td style="color:var(--th)">${esc(t.title)}</td>
          <td>${esc(t.module)}</td>
          <td>${(t.form_schema||[]).length?`<span class="bdg b1">${fa(t.form_schema.length)} فیلد</span>`:'<span style="color:var(--td)">—</span>'}</td>
          <td>${t.requires_evidence_upload?'بله':'خیر'}</td>
          <td style="white-space:nowrap">
            ${canSubmitAct()?`<button class="tgl" onclick="newActRecord('${t.id}')">ثبت فعالیت</button>`:''}
            ${canManageActTypes()?`<button class="tgl" onclick="editActType('${t.id}')">ویرایش فیلدها</button>`:''}
          </td></tr>`).join('')}</tbody></table></div>`}
    </div>
  </div>
  <div class="panel g" style="margin-top:14px">
    <div class="phd"><div class="abadge">▤</div>
      <div style="flex:1"><h3>آخرین فعالیت‌های ثبت‌شده</h3><div class="sub">${fa(ACT.records.length)} رکورد</div></div></div>
    <div class="pbody">
      ${!ACT.records.length?'<div class="empty">فعالیتی ثبت نشده است</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>نوع فعالیت</th><th>ثبت‌کننده</th><th>بخش</th><th>زمان</th><th>فیلدهای سفارشی</th></tr></thead>
        <tbody>${ACT.records.map(r=>{
          const sch=(byId[r.activity_type_id]&&byId[r.activity_type_id].form_schema)||[];
          const cf=r.custom_fields||{};
          const txt=sch.filter(f=>cf[f.key]!==undefined).map(f=>esc(f.label)+': '+esc(actFmtVal(f,cf[f.key]))).join(' · ');
          return `<tr><td style="color:var(--th)">${esc(r.type_title||'')}</td><td>${esc(r.recorder_name||'')}</td>
            <td>${esc(r.department||'—')}</td><td style="white-space:nowrap;color:var(--gdl)">${r.occurred_at?faDateTime(r.occurred_at):''}</td>
            <td>${txt||'<span style="color:var(--td)">—</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
// تاریخِ ذخیره‌شده میلادی است ولی مثل بقیه‌ی سامانه شمسی نمایش داده می‌شود
const actFmtVal = (f,v) => f.data_type==='boolean' ? (v?'بله':'خیر')
  : f.data_type==='date' ? faDateISO(String(v))
  : (typeof v==='number'?fa(v):String(v));
function backToActList(){ ACT.view='list'; ACT.editTypeId=null; ACT.current=null; renderActivities(); }

// ---------- سازندهٔ فیلدهای سفارشی (همان الگوی سطرهای تکرارشوندهٔ چک‌لیست/فهرست توزیع) ----------
function newActType(){ ACT.view='typeForm'; ACT.editTypeId=null; ACT.current=null; ACT.fields=[]; drawActTypeForm(); }
function editActType(id){
  const t=ACT.types.find(x=>x.id===id); if(!t) return;
  ACT.view='typeForm'; ACT.editTypeId=id; ACT.current=t;
  ACT.fields=JSON.parse(JSON.stringify(t.form_schema||[]));
  drawActTypeForm();
}
function drawActTypeForm(){
  const t=ACT.current||{};
  $('ptitle').textContent=ACT.editTypeId?'ویرایش نوع فعالیت':'نوع فعالیت جدید';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⧉</div>
      <div style="flex:1"><h3>${ACT.editTypeId?'ویرایش نوع فعالیت':'نوع فعالیت جدید'}</h3>
      <div class="sub">اطلاعات پایه و فیلدهای سفارشی فرم ثبت این فعالیت</div></div>
      <button class="btn btn-o btn-sm" onclick="backToActList()">◂ بازگشت</button>
    </div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان نوع فعالیت *</label>
          <input id="at_title" value="${esc(t.title||'')}" placeholder="مثال: گزارش خطای دارویی"></div>
        <div class="fg"><label>ماژول *</label>
          <input id="at_module" value="${esc(t.module||'')}" placeholder="مثال: incident" style="direction:ltr"></div>
        <div class="fg"><label>بارگذاری سند الزامی است؟</label>
          <select id="at_evidence"><option value="0" ${!t.requires_evidence_upload?'selected':''}>خیر</option>
            <option value="1" ${t.requires_evidence_upload?'selected':''}>بله</option></select></div>
      </div>
      <div class="fg"><label>توضیح</label>
        <textarea id="at_desc" rows="2">${esc(t.description||'')}</textarea></div>

      <div class="dsec" style="margin-top:16px">
        <div class="dl" style="color:var(--gdl)">◈ فیلدهای سفارشی</div>
        <div id="actFieldBox"></div>
        <div class="docgrid" style="margin-top:10px">
          <div class="fg" style="margin:0"><label>کلید (لاتین) *</label><input id="af_key" placeholder="patient_code" style="direction:ltr"></div>
          <div class="fg" style="margin:0"><label>عنوان نمایشی *</label><input id="af_label" placeholder="کد بیمار"></div>
          <div class="fg" style="margin:0"><label>نوع داده</label><select id="af_type" onchange="actFieldTypeChanged()">
            ${Object.entries(FS_TYPE_FA).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="fg" style="margin:0"><label>الزامی؟</label><select id="af_req">
            <option value="0">خیر</option><option value="1">بله</option></select></div>
          <div class="fg" style="margin:0;grid-column:span 2" id="af_opt_wrap" hidden><label>گزینه‌ها (با ویرگول جدا کنید)</label>
            <input id="af_options" placeholder="کم، متوسط، زیاد"></div>
          <div class="fg" style="margin:0"><label>فقط وقتی نمایش داده شود که…</label>
            <select id="af_cond_field">
              <option value="">— همیشه نمایش داده شود —</option>
              ${ACT.fields.map(f=>`<option value="${esc(f.key)}">${esc(f.label)}</option>`).join('')}
            </select></div>
          <div class="fg" style="margin:0"><label>برابر باشد با</label><input id="af_cond_val" placeholder="مثال: بله یا زیاد"></div>
          <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="addActField()">+ افزودن فیلد</button>
        </div>
      </div>

      <button class="btn btn-g" onclick="saveActType()">${ACT.editTypeId?'ذخیره تغییرات':'ثبت نوع فعالیت'}</button>
      <button class="btn btn-o" onclick="backToActList()">انصراف</button>
    </div>
  </div>`;
  drawActFieldRows(); actFieldTypeChanged();
}
function actFieldTypeChanged(){
  const w=$('af_opt_wrap'); if(w) w.hidden = $('af_type').value!=='select';
}
function drawActFieldRows(){
  const box=$('actFieldBox'); if(!box) return;
  box.innerHTML = !ACT.fields.length
    ? '<div style="font-size:12px;color:var(--td)">هنوز فیلد سفارشی‌ای تعریف نشده است — این نوع فعالیت فقط فرم استاندارد را نشان می‌دهد.</div>'
    : `<div class="tbl-wrap"><table>
        <thead><tr><th>کلید</th><th>عنوان</th><th>نوع</th><th>الزامی</th><th>گزینه‌ها</th><th>شرط نمایش</th><th></th></tr></thead>
        <tbody>${ACT.fields.map((f,i)=>`<tr>
          <td style="direction:ltr">${esc(f.key)}</td><td style="color:var(--th)">${esc(f.label)}</td>
          <td>${FS_TYPE_FA[f.data_type]||f.data_type}</td><td>${f.required?'بله':'خیر'}</td>
          <td>${(f.options||[]).map(esc).join('، ')||'—'}</td>
          <td>${f.condition?esc(actLabelOf(f.condition.field))+' = '+esc(actCondText(f.condition.equals)):'—'}</td>
          <td><button class="tgl" onclick="removeActField(${i})">حذف</button></td></tr>`).join('')}</tbody></table></div>`;
}
const actLabelOf = k => (ACT.fields.find(f=>f.key===k)||{}).label || k;
const actCondText = v => v===true?'بله':(v===false?'خیر':String(v));

function addActField(){
  const key=($('af_key').value||'').trim(), label=($('af_label').value||'').trim();
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)){ toast('کلید باید لاتین باشد و با حرف شروع شود',true); return; }
  if(ACT.fields.some(f=>f.key===key)){ toast('این کلید تکراری است',true); return; }
  if(!label){ toast('عنوان نمایشی الزامی است',true); return; }
  const data_type=$('af_type').value;
  const f={key:key,label:label,data_type:data_type,required:$('af_req').value==='1'};
  if(data_type==='select'){
    const opts=($('af_options').value||'').split(/[,،]/).map(s=>s.trim()).filter(Boolean);
    if(!opts.length){ toast('برای فیلد انتخابی حداقل یک گزینه لازم است',true); return; }
    f.options=opts;
  }
  const cf=$('af_cond_field').value;
  if(cf){
    const raw=($('af_cond_val').value||'').trim();
    const ref=ACT.fields.find(x=>x.key===cf);
    f.condition={field:cf, equals: ref && ref.data_type==='boolean' ? (raw==='بله'||raw==='1'||raw==='true') : raw};
  }
  ACT.fields.push(f);
  drawActTypeForm();
}
function removeActField(i){ ACT.fields.splice(i,1); drawActTypeForm(); }

async function saveActType(){
  const b={ title:($('at_title').value||'').trim(), module:($('at_module').value||'').trim(),
            description:($('at_desc').value||'').trim(), requires_evidence_upload:$('at_evidence').value==='1',
            form_schema:ACT.fields };
  if(!b.title||!b.module){ toast('عنوان و ماژول الزامی است',true); return; }
  try{
    if(ACT.editTypeId) await API.updateActivityType(ACT.editTypeId,b);
    else await API.createActivityType(b);
    toast('نوع فعالیت ذخیره شد'); backToActList();
  }catch(e){ toast(e.message,true); }
}

// ---------- فرم ثبت فعالیت با رندر پویای فیلدهای سفارشی ----------
function newActRecord(typeId){ ACT.view='recordForm'; ACT.typeId=typeId||((ACT.types[0]||{}).id||''); drawActRecordForm(); }
const actCurType = () => ACT.types.find(t=>t.id===ACT.typeId);

function drawActRecordForm(){
  $('ptitle').textContent='ثبت فعالیت';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⧉</div>
      <div style="flex:1"><h3>ثبت فعالیت جدید</h3><div class="sub">فرم استاندارد + فیلدهای سفارشیِ همین نوع فعالیت</div></div>
      <button class="btn btn-o btn-sm" onclick="backToActList()">◂ بازگشت</button>
    </div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>نوع فعالیت *</label>
          <select id="ar_type" onchange="onActTypeChange(this.value)">
            ${ACT.types.map(t=>`<option value="${t.id}" ${t.id===ACT.typeId?'selected':''}>${esc(t.title)} (${esc(t.module)})</option>`).join('')}
          </select></div>
        <div class="fg fg-date"><label>تاریخ وقوع (شمسی) *</label>${jalaliDateInputHtml('ar_when')}</div>
        <div class="fg"><label>ساعت وقوع</label><input id="ar_when_time" type="time" value="08:00" style="direction:ltr"></div>
        <div class="fg"><label>بخش</label><input id="ar_dept" placeholder="مثال: اورژانس"></div>
      </div>
      <div id="actDynBox"></div>
      <button class="btn btn-g" onclick="saveActRecord()">ثبت فعالیت</button>
      <button class="btn btn-o" onclick="backToActList()">انصراف</button>
    </div>
  </div>`;
  drawActDynFields();
  applyFieldGuides();
}
function onActTypeChange(id){ ACT.typeId=id; drawActDynFields(); }

function drawActDynFields(){
  const box=$('actDynBox'); if(!box) return;
  const t=actCurType(); const schema=(t&&t.form_schema)||[];
  // نوع فعالیتِ بدون form_schema دقیقاً مثل قبل رفتار می‌کند — هیچ چیزی به فرم اضافه نمی‌شود
  if(!schema.length){ box.innerHTML=''; return; }
  box.innerHTML=`<div class="dsec" style="margin-top:6px">
    <div class="dl" style="color:var(--gdl)">◈ فیلدهای سفارشی این نوع فعالیت</div>
    <div class="docgrid">${schema.map(f=>`
      <div class="fg" style="margin:0" id="cfw_${esc(f.key)}" data-key="${esc(f.key)}">
        <label>${esc(f.label)}${f.required?' *':''}</label>${actFieldInput(f)}</div>`).join('')}</div>
  </div>`;
  // ویجت شمسی onchange خودش را دارد (onJMonthChange)، پس شرط‌ها را جداگانه وصل می‌کنیم
  schema.filter(f=>f.data_type==='date').forEach(f=>{
    ['_d','_m','_y'].forEach(sfx=>$('cf_'+f.key+sfx)?.addEventListener('change', applyActConditions));
  });
  applyActConditions();
}
function actFieldInput(f){
  const id='cf_'+f.key;
  const oc=' onchange="applyActConditions()"';
  if(f.data_type==='select') return `<select id="${id}"${oc}><option value="">— انتخاب کنید —</option>${
    (f.options||[]).map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
  if(f.data_type==='boolean') return `<select id="${id}"${oc}><option value="0">خیر</option><option value="1">بله</option></select>`;
  if(f.data_type==='number') return `<input id="${id}" type="number" step="any" style="direction:ltr"${oc}>`;
  // تاریخ = همان ویجت شمسی بقیه‌ی سامانه (روز/ماه/سال) — نه input type=date میلادی مرورگر.
  // فیلد غیرالزامی با یک چک‌باکس فعال می‌شود (همان الگوی «تاریخ بازنگری بعدی» در فرم اسناد)،
  // چون ویجت شمسی همیشه مقدار دارد و بدون این کلید نمی‌شود «خالی» فرستاد.
  if(f.data_type==='date') return `${f.required?'':`<label style="display:flex;gap:6px;align-items:center;font-size:12px;margin-bottom:4px;color:var(--tm)">
      <input type="checkbox" id="${id}_on" onchange="applyActConditions()"> ثبت تاریخ</label>`}
    ${jalaliDateInputHtml(id)}`;
  return `<input id="${id}"${oc}>`;
}
// نمایش/عدم‌نمایش شرطی (فقط تساوی ساده). مقدارِ فیلدِ پنهان ارسال نمی‌شود و الزامی هم به‌حساب نمی‌آید.
function actRawVal(f){
  // ویجت شمسی سه select است نه یک input؛ خروجی همان ISO میلادی (YYYY-MM-DD) است که
  // validateCustomFields در بک‌اند انتظار دارد — دقیقاً مثل فرم صورت‌جلسه/اسناد.
  if(f.data_type==='date'){
    const id='cf_'+f.key;
    if(!$(id+'_y')) return undefined;
    const gate=$(id+'_on');
    if(gate&&!gate.checked) return '';
    return readJalaliDateInput(id);
  }
  const el=$('cf_'+f.key); if(!el) return undefined;
  if(f.data_type==='boolean') return el.value==='1';
  return el.value;
}
function actVisible(schema, key){
  const f=schema.find(x=>x.key===key); if(!f) return false;
  if(!f.condition) return true;
  if(!actVisible(schema, f.condition.field)) return false;
  const ref=schema.find(x=>x.key===f.condition.field);
  const cur=ref?actRawVal(ref):undefined;
  const s=v=>String(v===undefined||v===null?'':v);
  return s(cur)===s(f.condition.equals);
}
function applyActConditions(){
  const t=actCurType(); const schema=(t&&t.form_schema)||[];
  schema.forEach(f=>{ const w=$('cfw_'+f.key); if(w) w.hidden=!actVisible(schema,f.key); });
}
async function saveActRecord(){
  const t=actCurType();
  if(!t){ toast('نوع فعالیت را انتخاب کنید',true); return; }
  // تاریخ وقوع از تقویم جلالی داخلی + ساعت جداگانه (جایگزین datetime-local میلادی).
  const whenD=readJalaliDateInput('ar_when');
  const whenT=(($('ar_when_time')?.value||'').trim()||'08:00');
  if(!whenD){ toast('تاریخ وقوع الزامی است',true); return; }
  const when=whenD+' '+whenT;
  const schema=t.form_schema||[];
  const custom={};
  for(const f of schema){
    if(!actVisible(schema,f.key)) continue;
    const v=actRawVal(f);
    if(f.data_type==='boolean'){
      if(f.required&&!v){ toast('فیلد «'+f.label+'» الزامی است',true); return; }
      custom[f.key]=!!v; continue;
    }
    if(v===undefined||v===''){ if(f.required){ toast('فیلد «'+f.label+'» الزامی است',true); return; } continue; }
    custom[f.key]=v;
  }
  try{
    await API.createActivityRecord({activity_type_id:t.id, occurred_at:when.replace('T',' '),
      department:($('ar_dept').value||'').trim()||null, custom_fields:custom});
    toast('فعالیت ثبت شد'); backToActList();
  }catch(e){ toast(e.message,true); }
}

// ==================== برنامه‌های بهبود / عملیاتی / استراتژیک ====================
// گردش‌کار دو مرحله‌ای: هر کاربری «پیشنهاد برنامه» می‌دهد → نقش مدیریتی تأیید/رد می‌کند →
// سپس درصد پیشرفت ثبت می‌شود و وضعیت خودکار بین «در حال اجرا» و «تکمیل‌شده» جابه‌جا می‌شود.
const PROG_TYPES=['بهبود','عملیاتی','استراتژیک'];
const PROG_TYPE_BDG={'بهبود':'b2','عملیاتی':'b3','استراتژیک':'b1'};
const PROG_STATUSES=['پیشنهاد_شده','تأییدشده','رد_شده','در_حال_اجرا','تکمیل‌شده'];
const PROG_STATUS_FA={'پیشنهاد_شده':'پیشنهاد شده','تأییدشده':'تأیید شده','رد_شده':'رد شده','در_حال_اجرا':'در حال اجرا','تکمیل‌شده':'تکمیل شده'};
const PROG_STATUS_BDG={'پیشنهاد_شده':'b2','تأییدشده':'b1','رد_شده':'b3','در_حال_اجرا':'b2','تکمیل‌شده':'b1'};

let PRG={list:[], view:'list', current:null, editId:null, canApprove:false,
         filters:{type:'', status:'', department:'', q:''}};
const canApprovePrograms = () => (S.user?.permissions||[]).includes('approve_programs');
