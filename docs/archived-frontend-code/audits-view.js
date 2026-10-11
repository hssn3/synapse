/**
 * Quality Internal Audits
 * Modular Frontend Component — Project 313
 */
// ==================== حسابرسی داخلی ====================
// حسابرسی = یک نمونهٔ بازرسی که یک چک‌لیست موجود را به‌عنوان «ابزار» به‌کار می‌گیرد.
// فرم پرسش‌نامه اینجا دوباره ساخته نمی‌شود؛ کاربر به صفحهٔ تکمیل چک‌لیست می‌رود و
// پاسخ‌نامهٔ حاصل به حسابرسی پیوند داده می‌شود.
const AUD_STATUS_FA={planned:'برنامه‌ریزی‌شده', in_progress:'در جریان', completed:'تکمیل‌شده', closed:'بسته‌شده'};
const AUD_STATUS_BDG={planned:'b2', in_progress:'b2', completed:'b1', closed:'b1'};

let AUD={list:[], view:'list', current:null, editId:null, subs:[], checklists:[],
         filters:{status:'', department:'', q:''}};
const canViewAudits = () => { const p=S.user?.permissions||[]; return p.includes('view_audits')||p.includes('manage_audits'); };
const canManageAudits = () => (S.user?.permissions||[]).includes('manage_audits');

async function renderAudits(){
  $('ptitle').textContent='حسابرسی داخلی';
  if(AUD.view==='form') return drawAudForm();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(AUD.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const {audits}=await API.audits(qs);
    AUD.list=audits||[];
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(AUD.view!=='list') return;
    drawAudList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function audScore(a){
  if(a.submission_score===null||a.submission_score===undefined||!a.submission_max_score) return '—';
  const pct=Math.round(a.submission_score/a.submission_max_score*100);
  const cls=pct>=80?'b1':(pct>=50?'b2':'b3');
  return `<span class="bdg ${cls}">${fa(pct)}٪</span>`;
}

function drawAudList(){
  const f=AUD.filters;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⚖</div>
      <div style="flex:1"><h3>حسابرسی داخلی بیمارستان</h3>
      <div class="sub">${fa(AUD.list.length)} حسابرسی — هر حسابرسی یک چک‌لیست را به‌عنوان پرسش‌نامهٔ بازرسی به‌کار می‌گیرد</div></div>
      <button class="btn btn-o btn-sm" onclick="printAudits()">${ic('print')} چاپ فهرست</button>
      ${canManageAudits()?`<button class="btn btn-g btn-sm" onclick="newAudit()">+ حسابرسی جدید</button>`:''}
    </div>
    <div class="pbody">
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>وضعیت ${help('flt_status')}</label>
          <select onchange="setAudFilter('status',this.value)">
            <option value="">همه وضعیت‌ها</option>
            ${Object.entries(AUD_STATUS_FA).map(([k,v])=>`<option value="${k}" ${f.status===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0"><label>بخش مورد حسابرسی</label>
          <input id="aud_dept" value="${esc(f.department)}" placeholder="مثال: بلوک زایمان"
            onkeydown="if(event.key==='Enter')setAudFilter('department',this.value)"></div>
        <div class="fg" style="margin:0;flex:1.4"><label>جستجو در عنوان یا یافته‌ها</label>
          <input id="aud_q" value="${esc(f.q)}" placeholder="مثال: بهداشت دست"
            onkeydown="if(event.key==='Enter')setAudFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px"
          onclick="setAudFilter('department',$('aud_dept').value);">⌕ اعمال فیلتر</button>
      </div>
      ${!AUD.list.length?'<div class="empty"><div class="ei">⚖</div>حسابرسی‌ای با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>عنوان حسابرسی</th><th>تاریخ</th><th>نتیجه</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>${AUD.list.map(a=>{ const did=drowNext(); return `<tr>
          <td style="color:var(--th)">${esc(a.title)}${exBdg(a)}
            <span class="tsub">${esc(a.audited_department||'بخش ثبت‌نشده')}</span></td>
          <td style="white-space:nowrap">${faDateISO(a.audit_date)}</td>
          <td style="white-space:nowrap">${audScore(a)}</td>
          <td><span class="bdg ${AUD_STATUS_BDG[a.status]||'b2'}">${AUD_STATUS_FA[a.status]||a.status}</span></td>
          <td style="white-space:nowrap">
            ${canManageAudits()?`<button class="tgl prim" onclick="editAudit('${a.id}')">ویرایش</button>`:''}
            ${drowBtn(did)}
          </td></tr>
          ${drowRow(did, 5, [
            exBanner(a,'inrow'),
            dp('حسابرس', esc(a.auditor_name||a.auditor_full_name||'')),
            dp('چک‌لیست ابزار بازرسی', esc(a.checklist_title||'')),
            dp('اقدام اصلاحی', a.corrective_action_required?'<span class="bdg b3">لازم است</span>':'لازم نیست'),
            dp('تاریخ پیگیری', a.follow_up_date?faDateISO(a.follow_up_date):''),
            dp('خلاصه یافته‌ها', esc(a.finding_summary||'')),
            dp('شرح اقدام اصلاحی', esc(a.corrective_action_text||'')),
          ], canManageAudits()?`<button class="tgl dngr" onclick="removeAudit('${a.id}')">حذف حسابرسی</button>`:'')}`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setAudFilter(k,v){
  AUD.filters[k]=v;
  if($('aud_q')) AUD.filters.q=$('aud_q').value;
  AUD.view='list'; renderAudits();
}

function newAudit(){ AUD.view='form'; AUD.editId=null; AUD.current=null; AUD.subs=[]; loadAudForm(); }
async function editAudit(id){
  try{ const r=await API.audit(id); AUD.current=r.audit; AUD.subs=r.submissions||[]; AUD.editId=id; AUD.view='form'; loadAudForm(); }
  catch(e){ toast(e.message,true); }
}
async function loadAudForm(){
  // فهرست چک‌لیست‌های فعال به‌عنوان ابزار بازرسی (اگر کاربر دسترسی چک‌لیست دارد)
  try{ const r=await API.checklists('status=active'); AUD.checklists=r.checklists||[]; }
  catch(e){ AUD.checklists=[]; }
  drawAudForm();
}
function audVal(f){ return AUD.current? (AUD.current[f]??'') : ''; }

function drawAudForm(){
  const a=AUD.current;
  $('ptitle').textContent=AUD.editId?'ویرایش حسابرسی داخلی':'ثبت حسابرسی داخلی';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⚖</div>
      <div style="flex:1"><h3>${AUD.editId?'ویرایش حسابرسی':'حسابرسی داخلی جدید'}</h3>
      <div class="sub">پرسش‌نامهٔ بازرسی از بانک چک‌لیست‌ها انتخاب می‌شود و جداگانه تکمیل می‌گردد</div></div>
      <button class="btn btn-o btn-sm" onclick="backToAudList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      ${exBanner(a)}
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان حسابرسی *</label>
          <input id="af_title" value="${esc(audVal('title'))}" placeholder="مثال: حسابرسی داخلی بهداشت دست — بلوک زایمان"></div>
        <div class="fg"><label>بخش مورد حسابرسی</label>
          <input id="af_dept" value="${esc(audVal('audited_department'))}" placeholder="مثال: بلوک زایمان"></div>
        <div class="fg"><label>نام حسابرس</label>
          <input id="af_auditor" value="${esc(audVal('auditor_name'))}" placeholder="نام و نام خانوادگی حسابرس"></div>
        <div class="fg"><label>وضعیت</label>
          <select id="af_status">${Object.entries(AUD_STATUS_FA).map(([k,v])=>
            `<option value="${k}" ${audVal('status')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg" style="grid-column:span 2"><label>چک‌لیست ابزار بازرسی</label>
          <select id="af_checklist">
            <option value="">— بدون چک‌لیست —</option>
            ${AUD.checklists.map(c=>`<option value="${c.id}" ${audVal('checklist_id')===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}
          </select></div>
      </div>
      <div class="docdates">
        <div class="fg" style="margin:0"><label>تاریخ حسابرسی</label>${jalaliDateInputHtml('af_date')}</div>
        <div class="fg" style="margin:0"><label>تاریخ پیگیری</label>${jalaliDateInputHtml('af_follow')}</div>
      </div>
      <div class="fg" style="margin-top:14px"><label>خلاصه یافته‌ها</label>
        <textarea id="af_finding" rows="3" placeholder="مهم‌ترین یافته‌های بازرسی">${esc(audVal('finding_summary'))}</textarea></div>
      <div class="docgrid">
        <div class="fg"><label>آیا اقدام اصلاحی لازم است؟</label>
          <select id="af_ca_req" onchange="toggleAudCa(this.value==='1')">
            <option value="0" ${a&&a.corrective_action_required?'':'selected'}>خیر</option>
            <option value="1" ${a&&a.corrective_action_required?'selected':''}>بله</option>
          </select></div>
      </div>
      <div class="fg" id="af_ca_wrap" style="${a&&a.corrective_action_required?'':'display:none'}">
        <label>شرح اقدام اصلاحی</label>
        <textarea id="af_ca" rows="3" placeholder="اقدام اصلاحی توافق‌شده و مسئول اجرا">${esc(audVal('corrective_action_text'))}</textarea></div>
      ${AUD.editId?drawAudSubmissionBox():'<div class="sub" style="margin-top:10px">پس از ذخیره، می‌توانید پاسخ‌نامهٔ چک‌لیست بازرسی را به این حسابرسی پیوند دهید.</div>'}
      ${AUD.editId?`<div class="docsec"><div class="docsl">مستندات حسابرسی (فایل)</div>
        <div class="docsv">${evidenceBox('audit', AUD.editId, canManageAudits())}
        <div class="sub">تصویر فرم بازرسی تکمیل‌شده، عکس مورد عدم انطباق یا مستند اقدام اصلاحی را همین‌جا بارگذاری کنید — نه ارجاع به بایگانی بیرونی.</div></div></div>`:''}
      <div style="margin-top:12px"><button class="btn btn-g" onclick="saveAudit()">ذخیره</button></div>
    </div>
  </div>`;
  if(a){ setJalaliDateInput('af_date', a.audit_date); setJalaliDateInput('af_follow', a.follow_up_date); }
  applyFieldGuides({editing:!!AUD.editId});
  loadAllEvidence();
}
function toggleAudCa(on){ const w=$('af_ca_wrap'); if(w) w.style.display=on?'':'none'; }

function drawAudSubmissionBox(){
  const a=AUD.current||{};
  if(!a.checklist_id) return '<div class="docsec"><div class="docsl">پاسخ‌نامهٔ بازرسی</div><div class="docsv">ابتدا یک چک‌لیست ابزار انتخاب و ذخیره کنید.</div></div>';
  const linked=AUD.subs.find(s=>s.id===a.checklist_submission_id);
  return `<div class="docsec"><div class="docsl">پاسخ‌نامهٔ چک‌لیست بازرسی</div>
    <div class="docsv">
      ${linked?`<div style="margin-bottom:8px">پیوندشده: نمره ${fa(Math.round((linked.score/(linked.max_score||1))*100))}٪ —
        <button class="tgl" onclick="chkGoto('sub','${linked.id}')">مشاهده پاسخ‌نامه</button></div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-o btn-sm" onclick="chkGoto('fill','${a.checklist_id}')">✎ تکمیل چک‌لیست بازرسی</button>
        ${AUD.subs.length?`<select id="af_sub" style="max-width:320px">
          <option value="">— انتخاب پاسخ‌نامه برای پیوند —</option>
          ${AUD.subs.map(s=>`<option value="${s.id}" ${s.id===a.checklist_submission_id?'selected':''}>${esc(s.reference||'بدون عنوان')} — ${faDateISO(s.submitted_at)}</option>`).join('')}
        </select><button class="btn btn-o btn-sm" onclick="linkAudSub()">پیوند دادن</button>`:'<span class="sub">هنوز پاسخ‌نامه‌ای برای این چک‌لیست ثبت نشده است</span>'}
      </div>
    </div></div>`;
}
async function linkAudSub(){
  const sid=$('af_sub')?$('af_sub').value:'';
  if(!sid){ toast('یک پاسخ‌نامه انتخاب کنید',true); return; }
  try{ await API.linkAuditSubmission(AUD.editId, sid); toast('پاسخ‌نامه پیوند داده شد'); editAudit(AUD.editId); }
  catch(e){ toast(e.message,true); }
}
function backToAudList(){ AUD.view='list'; AUD.current=null; AUD.editId=null; renderAudits(); }

async function saveAudit(){
  const b={ title:$('af_title').value.trim(), audited_department:$('af_dept').value.trim(),
    auditor_name:$('af_auditor').value.trim(), status:$('af_status').value,
    checklist_id:$('af_checklist').value, audit_date:readJalaliDateInput('af_date'),
    follow_up_date:readJalaliDateInput('af_follow'), finding_summary:$('af_finding').value.trim(),
    corrective_action_required:$('af_ca_req').value==='1',
    corrective_action_text:$('af_ca')?$('af_ca').value.trim():'' };
  if(!b.title){ toast('عنوان حسابرسی الزامی است',true); return; }
  try{
    if(AUD.editId){ await API.updateAudit(AUD.editId,b); toast('حسابرسی به‌روزرسانی شد'); }
    else { await API.createAudit(b); toast('حسابرسی ثبت شد'); }
    backToAudList();
  }catch(e){ toast(e.message,true); }
}
async function removeAudit(id){
  if(!await BTN.confirmDanger('این حسابرسی حذف شود؟')) return;
  try{ await API.deleteAudit(id); toast('حسابرسی حذف شد'); renderAudits(); }
  catch(e){ toast(e.message,true); }
}

