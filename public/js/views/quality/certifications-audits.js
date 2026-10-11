/**
 * Certifications & Internal Audits
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
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

// ==================== رجیستری فرآیندها / فلوچارت فرآیند ====================
// هر فرآیند = فایل فلوچارت + حوزه + ارجاع‌دهنده + تاریخ تدوین + «مسئولین آگاهی»
const PROC_DOMAIN_FA={main:'اصلی', managerial:'مدیریتی', support:'پشتیبانی'};
const PROC_DOMAIN_ICON={main:'◆', managerial:'▣', support:'◇'};

let PROC={list:[], view:'list', current:null, editId:null, notify:[], steps:[], links:[], colleagues:[], kpis:[], kpi_ids:[], catalogKpis:[], filters:{domain:'', q:''}};
const canViewProcesses = () => { const p=S.user?.permissions||[]; return p.includes('view_processes')||p.includes('manage_processes'); };
const canManageProcesses = () => (S.user?.permissions||[]).includes('manage_processes');

async function renderProcesses(){
  $('ptitle').textContent='فرآیندها و فلوچارت‌ها';
  if(PROC.view==='form') return drawProcForm();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(PROC.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const r=await API.processes(qs);
    PROC.list=r.processes||[];
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(PROC.view!=='list') return;
    drawProcList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function drawProcList(){
  const f=PROC.filters;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⟳</div>
      <div style="flex:1"><h3>رجیستری فرآیندهای سازمانی</h3>
      <div class="sub">${fa(PROC.list.length)} فرآیند — هر فرآیند فلوچارت، حوزه، ارجاع‌دهنده و مسئولین آگاهی دارد</div></div>
      <button class="btn btn-o btn-sm" onclick="printProcesses()">${ic('print')} چاپ رجیستری</button>
      ${canManageProcesses()?`<button class="btn btn-g btn-sm" onclick="newProcess()">+ فرآیند جدید</button>`:''}
    </div>
    <div class="pbody">
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>حوزه فرآیند ${help('flt_procarea')}</label>
          <select onchange="setProcFilter('domain',this.value)">
            <option value="">همه حوزه‌ها</option>
            ${Object.entries(PROC_DOMAIN_FA).map(([k,v])=>`<option value="${k}" ${f.domain===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0;flex:1.4"><label>جستجو در عنوان، کد یا شرح</label>
          <input id="proc_q" value="${esc(f.q)}" placeholder="مثال: پذیرش بیمار"
            onkeydown="if(event.key==='Enter')setProcFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px"
          onclick="setProcFilter('q',$('proc_q').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!PROC.list.length?'<div class="empty"><div class="ei">⟳</div>فرآیندی با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>حوزه</th><th>عنوان فرآیند</th><th>فلوچارت</th><th>شاخص‌های مربوطه</th><th>وضعیت ابلاغ</th><th>عملیات</th></tr></thead>
        <tbody>${PROC.list.map(p=>{ const did=drowNext(); return `<tr>
          <td style="white-space:nowrap"><span class="bdg b2">${PROC_DOMAIN_ICON[p.domain]||'◆'} ${PROC_DOMAIN_FA[p.domain]||esc(p.domain)}</span></td>
          <td style="color:var(--th)">${esc(p.title)}${exBdg(p)}
            <span class="tsub">${esc(p.process_code||'بدون کد')}</span></td>
          <td style="white-space:nowrap">${p.step_count
            ?`<span class="bdg b1">${fa(p.step_count)} گام</span>`
            :`<span class="bdg b3">بدون فلوچارت</span>`}
            ${p.file_path?`<a href="/api/processes/${p.id}/file" target="_blank" style="color:var(--gdl);margin-right:6px">⤓ ضمیمه</a>`:''}</td>
          <td style="white-space:nowrap">${p.kpi_count
            ?`<span class="bdg b1">${fa(p.kpi_count)} شاخص</span>`
            :`<span class="tsub">بدون شاخص</span>`}</td>
          <td style="white-space:nowrap"><span class="bdg ${PROC_ST_BDG[p.status]||'b2'}">${PROC_ST_FA[p.status]||'پیش‌نویس'}</span>
            <span class="tsub">نسخه ${fa(p.version_no||1)}</span></td>
          <td style="white-space:nowrap">
            <button class="tgl prim" onclick="viewProcessChart('${p.id}')">فلوچارت</button>
            ${drowBtn(did)}
          </td></tr>
          ${drowRow(did, 6, [
            exBanner(p,'inrow'),
            dp('شرح فرآیند', esc(p.description||'')),
            dp('ارجاع‌دهنده', esc(p.referring_full_name||p.referring_person||'')),
            dp('تاریخ تدوین', p.compiled_date?faDateISO(p.compiled_date):''),
            dp('تاریخ بازنگری بعدی', p.next_review_date?faDateISO(p.next_review_date):'—'),
            dp('محور اعتباربخشی مرتبط', p.section_id?esc(fixText(p.section_title||p.section_code||'')):''),
            dp('ثبت‌کننده', esc(p.created_by_name||'')),
          ], canManageProcesses()?`<button class="tgl dngr" onclick="removeProcess('${p.id}')">حذف فرآیند</button>`:'')}`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setProcFilter(k,v){ PROC.filters[k]=v; PROC.view='list'; renderProcesses(); }

function newProcess(){ PROC.view='form'; PROC.editId=null; PROC.current=null; PROC.notify=[]; PROC.steps=[]; PROC.links=[]; PROC.kpis=[]; PROC.kpi_ids=[]; loadProcForm(); }
async function editProcess(id){
  try{
    const r=await API.process(id);
    PROC.current=r.process; PROC.editId=id; PROC.notify=(r.notify_users||[]).map(u=>u.user_id);
    PROC.kpis=r.kpis||[];
    PROC.kpi_ids=(r.kpis||[]).map(k=>k.id);
    // شناسه‌ها از سرور می‌آیند و دست‌نخورده می‌مانند تا ارجاعِ یال‌ها نشکند
    PROC.steps=(r.steps||[]).map(s=>({id:s.id, step_type:s.step_type, text:s.text||'',
      owner:s.owner||''}));
    PROC.links=(r.links||[]).map(l=>({uid:procStepUid(), from:l.from, to:l.to, label:l.label||''}));
    PROC.view='form'; loadProcForm();
  }catch(e){ toast(e.message,true); }
}
async function loadProcForm(){
  try{ const r=await API.colleagues(); PROC.colleagues=r.users||[]; }catch(e){ PROC.colleagues=[]; }
  drawProcForm();
}
function procVal(f){ return PROC.current? (PROC.current[f]??'') : ''; }

function drawProcForm(){
  const p=PROC.current;
  $('ptitle').textContent=PROC.editId?'ویرایش فرآیند':'ثبت فرآیند جدید';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⟳</div>
      <div style="flex:1"><h3>${PROC.editId?'ویرایش فرآیند':'فرآیند جدید'}</h3>
      <div class="sub">فایل فلوچارت (JPG/PNG/WEBP/PDF) به همراه حوزه، ارجاع‌دهنده و مسئولین آگاهی ثبت می‌شود</div></div>
      <button class="btn btn-o btn-sm" onclick="backToProcList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      ${exBanner(p)}
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان فرآیند *</label>
          <input id="pf_title" value="${esc(procVal('title'))}" placeholder="مثال: فرآیند پذیرش بیمار اورژانسی"></div>
        <div class="fg"><label>حوزه فرآیند *</label>
          <select id="pf_domain">${Object.entries(PROC_DOMAIN_FA).map(([k,v])=>
            `<option value="${k}" ${procVal('domain')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg"><label>کد فرآیند</label>
          <input id="pf_code" value="${esc(procVal('process_code'))}" placeholder="مثال: PR-EM-01"></div>
        <div class="fg"><label>ارجاع‌دهنده (کاربر سامانه)</label>
          <select id="pf_ref_user"><option value="">— انتخاب نشده —</option>
            ${PROC.colleagues.map(u=>`<option value="${u.id}" ${procVal('referring_user_id')===u.id?'selected':''}>${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
          </select></div>
        <div class="fg"><label>نام ارجاع‌دهنده (اگر کاربر سامانه نیست)</label>
          <input id="pf_ref_name" value="${esc(procVal('referring_person'))}" placeholder="نام و سمت"></div>
        <div class="fg" style="grid-column:span 3"><label>شرح فرآیند</label>
          <textarea id="pf_desc" rows="2" placeholder="توضیح کوتاه درباره دامنه و هدف این فرآیند">${esc(procVal('description'))}</textarea></div>
        <div class="fg" style="grid-column:span 3"><label>محور مرتبط در درخت اعتباربخشی (اختیاری)</label>
          <select id="pf_section_id">
            <option value="">— بدون اتصال به محور —</option>
            ${S.sections.map(sec=>`<optgroup label="${esc(sec.title)}">${sec.axes.map(ax=>
              `<option value="${ax.id}" ${procVal('section_id')===ax.id?'selected':''}>${esc(ax.code)} — ${esc(ax.title)}</option>`).join('')}</optgroup>`).join('')}
          </select></div>
      </div>
      <div class="docdates">
        <div class="fg" style="margin:0"><label>تاریخ تدوین</label>${jalaliDateInputHtml('pf_compiled')}</div>
        <div class="fg" style="margin:0"><label>تاریخ بازنگری بعدی</label>${jalaliDateInputHtml('pf_next_review')}</div>
      </div>

      <div class="docsec"><div class="docsl">شاخص‌های مربوط به فرآیند</div>
        <div class="docsv">
          <div class="sub" style="margin-bottom:8px">شاخص‌های پایش و ارزیابی مرتبط با این فرآیند (از کتابچه شاخص‌های بیمارستان)</div>
          <div id="pf_kpis_selected" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
            ${(PROC.kpis||[]).length ? (PROC.kpis||[]).map(k=>`
              <span class="bdg b1" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px">
                ${esc(k.title)} <button type="button" onclick="removeProcKpi('${k.id}')" style="background:none;border:none;color:inherit;cursor:pointer;font-weight:bold">✕</button>
              </span>`).join('') : '<span class="tsub">هنوز شاخصی به این فرآیند متصل نشده است.</span>'}
          </div>
          <button type="button" class="btn btn-o btn-sm" onclick="openProcKpisModal()">+ انتخاب شاخص‌های مربوطه</button>
        </div></div>

      <div class="docsec"><div class="docsl">گام‌های فلوچارت ${help('proc_steps')}</div>
        <div class="docsv">
          <div class="sub" style="margin-bottom:8px">گام‌ها را به ترتیب بنویسید؛ فلوچارت خودکار از روی همین‌ها رسم و چاپ می‌شود.
            گامِ «تصمیم» دو شاخه دارد: «بله» به گام بعدی می‌رود و «خیر» به گامی که انتخاب می‌کنید.</div>
          <div id="pf_steps" class="psteps-box"></div>
          <button type="button" class="btn btn-o btn-sm" style="margin-top:8px" onclick="addProcStep()">+ افزودن گام</button>
        </div></div>

      <div class="docsec"><div class="docsl">آپلود فایل فرآیند</div>
        <div class="docsv">
          <div class="sub" style="margin-bottom:10px">دو کار متفاوت است؛ هرکدام را لازم دارید انتخاب کنید:</div>

          <div class="pfup">
            <div class="pfup-t">۱ — آپلود و تشخیص خودکار، جای‌گذاری در فرآیند</div>
            <div class="sub">فایلِ فرآیند (PDF یا عکس) خوانده می‌شود و گام‌های فلوچارت، شاخه‌های «بله/خیر»
              و عنوان از رویِ متنِ آن ساخته و در همین فرم گذاشته می‌شوند. پیش از ذخیره می‌توانید اصلاح کنید.</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
              <input type="file" id="pf_aifile" accept=".jpg,.jpeg,.png,.webp,.pdf">
              <button type="button" class="btn btn-g btn-sm" onclick="procExtractFlow()">${ic('sparkle')} تشخیص و جای‌گذاری</button>
              <span id="pf_aimsg" class="tsub"></span>
            </div>
            <div id="pf_aiout"></div>
          </div>

          <div class="pfup" style="margin-top:10px">
            <div class="pfup-t">۲ — آپلود ضمیمه آماده</div>
            <div class="sub">فایل فقط به‌عنوان پیوستِ این فرآیند ذخیره می‌شود و چیزی در فرم تغییر نمی‌کند
              (JPG/PNG/WEBP/PDF، حداکثر ۵ مگابایت). برای چاپ و ابلاغ، گام‌های بالا ملاک‌اند.</div>
            ${p&&p.file_path?`<div style="margin:6px 0"><a href="/api/processes/${p.id}/file" target="_blank" style="color:var(--gdl)">⤓ ${esc(p.file_name||'فایل فعلی')}</a></div>`:''}
            <input type="file" id="pf_file" accept=".jpg,.jpeg,.png,.webp,.pdf" style="margin-top:8px">
          </div>
        </div></div>

      <div class="docsec"><div class="docsl">مسئولین آگاهی</div>
        <div class="docsv">
          <div class="sub" style="margin-bottom:6px">کسانی که باید از این فرآیند آگاه باشند (چند انتخابی — با Ctrl کلیک کنید)</div>
          <select id="pf_notify" multiple size="6" style="width:100%">
            ${PROC.colleagues.map(u=>`<option value="${u.id}" ${PROC.notify.includes(u.id)?'selected':''}>${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
          </select>
          ${!PROC.colleagues.length?'<div class="sub">کاربر دیگری در این بیمارستان ثبت نشده است</div>':''}
        </div></div>
      <div style="margin-top:12px"><button class="btn btn-g" onclick="saveProcess()">ذخیره</button></div>
    </div>
  </div>`;
  if(p) {
    setJalaliDateInput('pf_compiled', p.compiled_date);
    setJalaliDateInput('pf_next_review', p.next_review_date);
  }
}

// ---------- مدال انتخاب شاخص‌های فرآیند (تصویر ۳۰ طراحی اولیه حسن) ----------
async function openProcKpisModal(q=''){
  try{
    const r=await API.processKpisCatalog(q);
    PROC.catalogKpis=r.kpis||[];
    drawProcKpisModal();
  }catch(e){ toast(e.message,true); }
}
