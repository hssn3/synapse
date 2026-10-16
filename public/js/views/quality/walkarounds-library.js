/**
 * Management Walkarounds & Digital Library
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function printProcesses(){
  if(!PROC.list.length){ toast('فرآیندی با این فیلتر برای چاپ نیست',true); return; }
  const approved=PROC.list.filter(p=>p.status==='approved').length;
  const charted=PROC.list.filter(p=>p.step_count>0).length;
  printListSheet({
    page:'processes', title:'رجیستری فرآیندهای سازمانی', code:'RPT-PRC',
    intro:'فهرست فرآیندهای ثبت‌شده با کد، حوزه، تعداد گام فلوچارت، وضعیت ابلاغ و تاریخ تدوین.',
    meta:[...activeFilters(PROC.filters,{domain:'حوزه فرآیند',q:'جست‌وجو'}),
      ['ابلاغ‌شده', String(approved)+' از '+PROC.list.length],
      ['دارای فلوچارت', String(charted)+' از '+PROC.list.length]],
    headers:['کد فرآیند','عنوان فرآیند','حوزه','گام فلوچارت','نسخه','وضعیت ابلاغ','تاریخ تدوین','ارجاع‌دهنده'],
    rows:PROC.list.map(p=>[esc(p.process_code||'بدون کد'), esc(p.title),
      PROC_DOMAIN_FA[p.domain]||esc(p.domain||'—'),
      p.step_count?fa(p.step_count):'بدون فلوچارت', fa(p.version_no||1),
      PROC_ST_FA[p.status]||'پیش‌نویس',
      p.compiled_date?faDateISO(p.compiled_date):'—',
      esc(p.referring_full_name||p.referring_person||'—')]),
    foot:'رجیستری فرآیندها',
  });
}

async function toggleProcApproval(id, approve){
  if(approve && !await BTN.confirm('این فرآیند ابلاغ شود؟ پس از ابلاغ، نسخه‌ی رسمی است و کارکنان می‌توانند آن را چاپ و نصب کنند.')) return;
  if(!approve && !await BTN.confirm('ابلاغ این فرآیند لغو شود؟ نسخه‌ی چاپ‌شده‌ی روی دیوار دیگر معتبر نخواهد بود.')) return;
  try{
    await API.setProcessApproval(id, approve);
    toast(approve?'فرآیند ابلاغ شد':'ابلاغ لغو شد');
    viewProcessChart(id);
  }catch(e){ toast(e.message,true); }
}

async function removeProcess(id){
  if(!await BTN.confirmDanger('این فرآیند و فهرست مسئولین آگاهی آن حذف شود؟')) return;
  try{ await API.deleteProcess(id); toast('فرآیند حذف شد'); renderProcesses(); }
  catch(e){ toast(e.message,true); }
}

// ==================== بازدید میدانی مدیریتی (واکراند) ====================
// بازدید ساخت‌یافته از بخش‌ها که «مصوبه» تولید می‌کند؛ ارزش اصلی، داشبورد درصد اجراست.
const WA_STATUS_FA={planned:'برنامه‌ریزی‌شده', done:'انجام‌شده', closed:'بسته‌شده'};
const WA_STATUS_BDG={planned:'b2', done:'b1', closed:'b1'};
const RES_STATUS_FA={not_done:'انجام‌نشده', in_progress:'در دست اقدام', done:'انجام‌شده'};
const RES_STATUS_BDG={not_done:'b3', in_progress:'b2', done:'b1'};

let WA={list:[], sum:null, view:'list', current:null, editId:null, rows:[], colleagues:[],
        att:[], abs:[], filters:{status:'', department:'', q:''}};
const canViewWalks = () => { const p=S.user?.permissions||[]; return p.includes('view_walkarounds')||p.includes('manage_walkarounds'); };
const canManageWalks = () => (S.user?.permissions||[]).includes('manage_walkarounds');

async function renderWalkarounds(){
  $('ptitle').textContent='بازدید میدانی مدیریتی';
  if(WA.view==='form') return drawWaForm();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(WA.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const [lr,sr]=await Promise.all([API.walkarounds(qs), API.walkaroundSummary()]);
    WA.list=lr.walkarounds||[]; WA.sum=sr||null;
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(WA.view!=='list') return;
    drawWaList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

// نوار درصد اجرا — همان الگوی hbar داشبورد اصلی، بدون کد نمودار جدید
function waBars(rows){
  if(!rows||!rows.length) return '<div class="sub">داده‌ای ثبت نشده است</div>';
  return rows.map(r=>`<div class="hbar"><div class="hl"><span>${esc(r.name)}</span>
      <span>${fa(r.done)}/${fa(r.total)} — ${fa(r.completion_pct)}٪</span></div>
    <div class="hbt"><i style="width:${r.completion_pct}%;background:${r.completion_pct>=70?'linear-gradient(90deg,#1c7e8f,var(--ok))':r.completion_pct>=40?'linear-gradient(90deg,#b8912f,var(--wr))':'linear-gradient(90deg,#a5503f,var(--dn))'}"></i></div></div>`).join('');
}

function drawWaDashboard(){
  const s=WA.sum; if(!s) return '';
  const t=s.totals||{};
  return `
  <div class="stats">
    <div class="st g"><div class="l">کل مصوبه‌ها</div><div class="v">${fa(t.total||0)}</div></div>
    <div class="st g gold"><div class="l">درصد اجرای مصوبه‌ها</div><div class="v">${fa(t.completion_pct||0)}٪</div>
      <div class="bar"><i class="bf-gd" style="width:${t.completion_pct||0}%"></i></div></div>
    <div class="st g"><div class="l">در دست اقدام</div><div class="v">${fa(t.in_progress||0)}</div></div>
    <div class="st g"><div class="l">معوق (از مهلت گذشته)</div><div class="v" style="color:${(t.overdue||0)?'var(--dn)':'var(--ok)'}">${fa(t.overdue||0)}</div></div>
  </div>
  <div class="chartwrap">
    <div class="chart g"><h4>▤ درصد اجرا به تفکیک بخش</h4>
      <div style="max-height:230px;overflow-y:auto;padding-left:5px">${waBars(s.by_department)}</div></div>
    <div class="chart g"><h4>✦ درصد اجرا به تفکیک مسئول</h4>
      <div style="max-height:230px;overflow-y:auto;padding-left:5px">${waBars(s.by_responsible)}</div>
      <div style="margin-top:12px;padding-top:11px;border-top:1px dashed var(--bd);font-size:11.5px;color:var(--td)">
        حضور تیم بازدیدکننده در ${fa(s.walkaround_count||0)} بازدید:
        <b style="color:var(--gdl)">${fa(s.attendance?.present_pct||0)}٪</b>
        (${fa(s.attendance?.present||0)} حاضر · ${fa(s.attendance?.absent||0)} غایب)</div>
    </div>
  </div>`;
}

function drawWaList(){
  const f=WA.filters;
  $('content').innerHTML=`
  ${drawWaDashboard()}
  <div class="panel g">
    <div class="phd"><div class="abadge">◎</div>
      <div style="flex:1"><h3>بازدیدهای میدانی مدیریتی</h3>
      <div class="sub">${fa(WA.list.length)} بازدید — هر بازدید مصوبه‌هایی با مسئول، مهلت و وضعیت تولید می‌کند
        ${!canManageWalks()?' — ثبت بازدید جدید فقط برای مدیر داخلی، مدیر بهبود کیفیت و مدیر خدمات پرستاری باز است؛ شما فقط بازدیدهای ثبت‌شده را می‌بینید.':''}</div></div>
      <button class="btn btn-o btn-sm" onclick="printWalkarounds()">${ic('print')} چاپ گزارش</button>
      ${canManageWalks()?`<button class="btn btn-g btn-sm" onclick="newWalkaround()">+ بازدید جدید</button>`:''}
    </div>
    <div class="pbody">
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>وضعیت بازدید ${help('flt_status')}</label>
          <select onchange="setWaFilter('status',this.value)">
            <option value="">همه وضعیت‌ها</option>
            ${Object.entries(WA_STATUS_FA).map(([k,v])=>`<option value="${k}" ${f.status===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0"><label>بخش بازدیدشده</label>
          <input id="wa_dept" value="${esc(f.department)}" placeholder="مثال: اورژانس"
            onkeydown="if(event.key==='Enter')setWaFilter('department',this.value)"></div>
        <div class="fg" style="margin:0;flex:1.4"><label>جستجو در عنوان یا خلاصه</label>
          <input id="wa_q" value="${esc(f.q)}" placeholder="مثال: ایمنی بیمار"
            onkeydown="if(event.key==='Enter')setWaFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px"
          onclick="setWaFilter('department',$('wa_dept').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!WA.list.length?'<div class="empty"><div class="ei">◎</div>بازدیدی با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>عنوان بازدید</th><th>تاریخ</th><th>مصوبه‌ها</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>${WA.list.map(w=>{ const did=drowNext();
          const pct=w.resolution_count?Math.round(w.resolution_done_count/w.resolution_count*100):0;
          return `<tr>
          <td style="color:var(--th)">${esc(w.title)}${exBdg(w)}
            <span class="tsub">${esc(w.department||'بخش ثبت‌نشده')}</span></td>
          <td style="white-space:nowrap">${faDateISO(w.visit_date)}</td>
          <td style="white-space:nowrap">${w.resolution_count?`<span class="bdg ${pct>=80?'b1':(pct>=50?'b2':'b3')}">${fa(w.resolution_done_count)}/${fa(w.resolution_count)} — ${fa(pct)}٪</span>`:'—'}</td>
          <td><span class="bdg ${WA_STATUS_BDG[w.status]||'b2'}">${WA_STATUS_FA[w.status]||w.status}</span></td>
          <td style="white-space:nowrap">
            ${canManageWalks()?`<button class="tgl prim" onclick="editWalkaround('${w.id}')">ویرایش</button>`:''}
            ${drowBtn(did)}
          </td></tr>
          ${drowRow(did, 5, [
            exBanner(w,'inrow'),
            dp('بازدیدکننده اصلی', esc(w.conducted_by_name||'')),
            dp('حاضران', esc(safeList(w.attendees).join('، '))),
            dp('غایبان', esc(safeList(w.absentees).join('، '))),
            dp('خلاصه بازدید', esc(w.summary||'')),
          ], canManageWalks()?`<button class="tgl dngr" onclick="removeWalkaround('${w.id}')">حذف بازدید</button>`:'')}`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function safeList(v){ try{ const a=JSON.parse(v||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function setWaFilter(k,v){
  WA.filters[k]=v;
  if($('wa_q')) WA.filters.q=$('wa_q').value;
  WA.view='list'; renderWalkarounds();
}

function newWalkaround(){ WA.view='form'; WA.editId=null; WA.current=null; WA.rows=[]; WA.att=[]; WA.abs=[]; loadWaForm(); }
async function editWalkaround(id){
  try{
    const r=await API.walkaround(id);
    WA.current=r.walkaround; WA.editId=id;
    WA.rows=(r.resolutions||[]).map(x=>({id:x.id, description:x.description, responsible_user_id:x.responsible_user_id||'',
      department:x.department||'', status:x.status, due_date:x.due_date||''}));
    WA.att=safeList(r.walkaround.attendees); WA.abs=safeList(r.walkaround.absentees);
    WA.view='form'; loadWaForm();
  }catch(e){ toast(e.message,true); }
}
async function loadWaForm(){
  try{ const r=await API.colleagues(); WA.colleagues=r.users||[]; }catch(e){ WA.colleagues=[]; }
  drawWaForm();
}
function waVal(f){ return WA.current? (WA.current[f]??'') : ''; }

function drawWaForm(){
  const w=WA.current;
  $('ptitle').textContent=WA.editId?'ویرایش بازدید میدانی':'ثبت بازدید میدانی';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">◎</div>
      <div style="flex:1"><h3>${WA.editId?'ویرایش بازدید':'بازدید میدانی جدید'}</h3>
      <div class="sub">مصوبه‌های بازدید با مسئول و مهلت ثبت می‌شوند و در داشبورد درصد اجرا دیده می‌شوند</div></div>
      <button class="btn btn-o btn-sm" onclick="backToWaList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      ${exBanner(w)}
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان بازدید *</label>
          <input id="wf_title" value="${esc(waVal('title'))}" placeholder="مثال: بازدید مدیریتی ایمنی بیمار — بخش اورژانس"></div>
        <div class="fg"><label>بخش بازدیدشده</label>
          <input id="wf_dept" value="${esc(waVal('department'))}" placeholder="مثال: اورژانس"></div>
        <div class="fg"><label>وضعیت بازدید</label>
          <select id="wf_status">${Object.entries(WA_STATUS_FA).map(([k,v])=>
            `<option value="${k}" ${waVal('status')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg" style="margin:0"><label>تاریخ بازدید</label>${jalaliDateInputHtml('wf_date')}</div>
      </div>
      <div class="docgrid">
        <div class="fg"><label>حاضران تیم بازدیدکننده (هر نام در یک خط)</label>
          <textarea id="wf_att" rows="3" placeholder="دکتر احمدی&#10;خانم رضایی">${esc(WA.att.join('\n'))}</textarea></div>
        <div class="fg"><label>غایبان (هر نام در یک خط)</label>
          <textarea id="wf_abs" rows="3" placeholder="نام اعضای غایب">${esc(WA.abs.join('\n'))}</textarea></div>
      </div>
      <div class="fg"><label>خلاصه بازدید</label>
        <textarea id="wf_summary" rows="3" placeholder="مشاهدات کلیدی بازدید">${esc(waVal('summary'))}</textarea></div>

      <div class="docsec"><div class="docsl">مصوبه‌های بازدید</div>
        <div class="docsv">
          <div id="wf_rows">${WA.rows.map((r,i)=>waRowHtml(r,i)).join('')||'<div class="sub" id="wf_empty">هنوز مصوبه‌ای افزوده نشده است</div>'}</div>
          <button class="btn btn-o btn-sm" style="margin-top:8px" onclick="addWaRow()">+ افزودن مصوبه</button>
        </div></div>
      ${WA.editId?`<div class="docsec"><div class="docsl">مستندات بازدید (فایل)</div>
        <div class="docsv">${evidenceBox('walkaround', WA.editId, canManageWalks())}
        <div class="sub">عکس مورد مشاهده‌شده، صورت‌جلسه‌ی بازدید یا مستند اجرای مصوبه را همین‌جا بارگذاری کنید — نه ارجاع به بایگانی بیرونی.</div></div></div>`:''}
      <div style="margin-top:12px"><button class="btn btn-g" onclick="saveWalkaround()">ذخیره</button></div>
    </div>
  </div>`;
  if(w) setJalaliDateInput('wf_date', w.visit_date);
  WA.rows.forEach((r,i)=>{ if(r.due_date) setJalaliDateInput('wr_due_'+i, r.due_date); });
  applyFieldGuides({editing:!!WA.editId});
  loadAllEvidence();
}
function waRowHtml(r,i){
  return `<div class="docgrid wa-row" data-i="${i}" style="border-top:1px dashed var(--bd);padding-top:9px;margin-top:9px">
    <div class="fg" style="grid-column:span 3"><label>شرح مصوبه ${fa(i+1)} *</label>
      <input id="wr_desc_${i}" value="${esc(r.description||'')}" placeholder="مثال: نصب برچسب هشدار روی ترالی اورژانس"></div>
    <div class="fg"><label>مسئول اجرا</label>
      <select id="wr_user_${i}"><option value="">— تعیین‌نشده —</option>
        ${WA.colleagues.map(u=>`<option value="${u.id}" ${r.responsible_user_id===u.id?'selected':''}>${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
      </select></div>
    <div class="fg"><label>بخش مسئول</label>
      <input id="wr_dept_${i}" value="${esc(r.department||'')}" placeholder="بخش مجری"></div>
    <div class="fg"><label>وضعیت</label>
      <select id="wr_status_${i}">${Object.entries(RES_STATUS_FA).map(([k,v])=>
        `<option value="${k}" ${(r.status||'not_done')===k?'selected':''}>${v}</option>`).join('')}</select></div>
    <div class="fg"><label>مهلت اجرا</label>${jalaliDateInputHtml('wr_due_'+i)}</div>
    <div class="fg" style="align-self:end"><button class="tgl dngr" onclick="removeWaRow(${i})">حذف مصوبه</button></div>
  </div>`;
}
function readWaRows(){
  const out=[];
  document.querySelectorAll('.wa-row').forEach(el=>{
    const i=el.dataset.i;
    out.push({ description:($('wr_desc_'+i)||{}).value||'', responsible_user_id:($('wr_user_'+i)||{}).value||'',
      department:($('wr_dept_'+i)||{}).value||'', status:($('wr_status_'+i)||{}).value||'not_done',
      due_date:readJalaliDateInput('wr_due_'+i)||'' });
  });
  return out;
}
function addWaRow(){ WA.rows=readWaRows(); WA.rows.push({description:'',status:'not_done'}); syncWaFormState(); drawWaForm(); }
function removeWaRow(i){ WA.rows=readWaRows().filter((_,k)=>k!==i); syncWaFormState(); drawWaForm(); }
// نگه‌داشتن مقادیر فرم قبل از بازترسیم ردیف‌ها (بازترسیم نباید ورودی‌های بالای فرم را پاک کند)
function syncWaFormState(){
  WA.current=Object.assign({}, WA.current||{}, {
    title:($('wf_title')||{}).value||'', department:($('wf_dept')||{}).value||'',
    status:($('wf_status')||{}).value||'planned', summary:($('wf_summary')||{}).value||'',
    visit_date:readJalaliDateInput('wf_date')||'' });
  WA.att=lines($('wf_att')); WA.abs=lines($('wf_abs'));
}
function lines(el){ return (el&&el.value||'').split('\n').map(s=>s.trim()).filter(Boolean); }
function backToWaList(){ WA.view='list'; WA.current=null; WA.editId=null; WA.rows=[]; renderWalkarounds(); }

async function saveWalkaround(){
  const b={ title:$('wf_title').value.trim(), department:$('wf_dept').value.trim(),
    status:$('wf_status').value, visit_date:readJalaliDateInput('wf_date'),
    summary:$('wf_summary').value.trim(), attendees:lines($('wf_att')), absentees:lines($('wf_abs')),
    resolutions:readWaRows().filter(r=>r.description.trim()) };
  if(!b.title){ toast('عنوان بازدید الزامی است',true); return; }
  try{
    if(WA.editId){ await API.updateWalkaround(WA.editId,b); toast('بازدید به‌روزرسانی شد'); }
    else { await API.createWalkaround(b); toast('بازدید ثبت شد'); }
    backToWaList();
  }catch(e){ toast(e.message,true); }
}
async function removeWalkaround(id){
  if(!await BTN.confirmDanger('این بازدید و همه مصوبه‌هایش حذف شود؟')) return;
  try{ await API.deleteWalkaround(id); toast('بازدید حذف شد'); renderWalkarounds(); }
  catch(e){ toast(e.message,true); }
}

// ==================== کتابخانه دیجیتال ====================
// مخزن ساده فایل — بدون گردش‌کار امضا و نسخه‌بندی
const LIB_CAT_FA={regulation:'آیین‌نامه', pamphlet:'پمفلت', issued_form:'فرم ابلاغی',
  booklet:'کتابچه', training_handout:'جزوه آموزشی'};
const LIB_CAT_ICON={regulation:'§', pamphlet:'✧', issued_form:'▤', booklet:'▣', training_handout:'✎'};

let LIB={list:[], view:'list', current:null, editId:null, filters:{category:'', q:''}};
const canViewLibrary = () => { const p=S.user?.permissions||[]; return p.includes('view_library')||p.includes('manage_library'); };
const canManageLibrary = () => (S.user?.permissions||[]).includes('manage_library');

async function renderLibrary(){
  $('ptitle').textContent='کتابخانه دیجیتال';
  if(LIB.view==='form') return drawLibForm();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(LIB.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const {items}=await API.library(qs);
    LIB.list=items||[];
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(LIB.view!=='list') return;
    drawLibList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function drawLibList(){
  const f=LIB.filters;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">📚</div>
      <div style="flex:1"><h3>کتابخانه دیجیتال بیمارستان</h3>
      <div class="sub">${fa(LIB.list.length)} مورد — آیین‌نامه، پمفلت، فرم ابلاغی، کتابچه و جزوه آموزشی (بدون گردش امضا)</div></div>
      ${canManageLibrary()?`<button class="btn btn-g btn-sm" onclick="newLibItem()">+ افزودن مورد</button>`:''}
    </div>
    <div class="pbody">
      ${docTabs('library')}
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>دسته‌بندی</label>
          <select onchange="setLibFilter('category',this.value)">
            <option value="">همه دسته‌ها</option>
            ${Object.entries(LIB_CAT_FA).map(([k,v])=>`<option value="${k}" ${f.category===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0;flex:1.6"><label>جستجو در عنوان یا توضیح</label>
          <input id="lib_q" value="${esc(f.q)}" placeholder="مثال: پمفلت بهداشت دست"
            onkeydown="if(event.key==='Enter')setLibFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="setLibFilter('q',$('lib_q').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!LIB.list.length?'<div class="empty"><div class="ei">📚</div>موردی با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>دسته</th><th>عنوان</th><th>فایل</th><th>عملیات</th></tr></thead>
        <tbody>${LIB.list.map(it=>{ const did=drowNext(); return `<tr>
          <td style="white-space:nowrap"><span class="bdg b2">${LIB_CAT_ICON[it.category]||'▤'} ${LIB_CAT_FA[it.category]||esc(it.category)}</span></td>
          <td style="color:var(--th)">${esc(it.title)}${exBdg(it)}
            <span class="tsub">${esc((it.description||'').slice(0,80))||'بدون توضیح'}</span></td>
          <td style="white-space:nowrap">${it.file_path?`<a href="/api/library/${it.id}/file" target="_blank" style="color:var(--gdl)">⤓ ${esc(it.file_name||'دریافت')}</a>`:'—'}</td>
          <td style="white-space:nowrap">${drowBtn(did)}</td></tr>
          ${drowRow(did, 4, [
            exBanner(it,'inrow'),
            dp('توضیح', esc(it.description||'')),
            dp('محور اعتباربخشی مرتبط', it.section_id?esc(fixText(it.section_title||it.section_code||'')):''),
            dp('بارگذاری‌کننده', esc(it.uploaded_by_name||'')),
            dp('تاریخ افزودن', faDateTime(it.created_at)),
          ], canManageLibrary()?`<button class="tgl" onclick="editLibItem('${it.id}')">ویرایش</button>
            <button class="tgl dngr" onclick="removeLibItem('${it.id}')">حذف مورد</button>`:'')}`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setLibFilter(k,v){ LIB.filters[k]=v; LIB.view='list'; renderLibrary(); }

function newLibItem(){ LIB.view='form'; LIB.editId=null; LIB.current=null; drawLibForm(); }
function editLibItem(id){
  LIB.current=LIB.list.find(x=>x.id===id)||null; LIB.editId=id; LIB.view='form'; drawLibForm();
}
function libVal(f){ return LIB.current? (LIB.current[f]||'') : ''; }

function drawLibForm(){
  $('ptitle').textContent=LIB.editId?'ویرایش مورد کتابخانه':'افزودن به کتابخانه دیجیتال';
  const cur=LIB.current;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">📚</div>
      <div style="flex:1"><h3>${LIB.editId?'ویرایش مورد':'مورد جدید کتابخانه'}</h3>
      <div class="sub">فقط دسته‌بندی، عنوان و فایل — این مخزن نیازی به گردش امضا ندارد</div></div>
      <button class="btn btn-o btn-sm" onclick="backToLibList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      ${exBanner(cur)}
      <div class="docgrid">
        <div class="fg"><label>دسته‌بندی *</label>
          <select id="lf_category">${Object.entries(LIB_CAT_FA).map(([k,v])=>
            `<option value="${k}" ${libVal('category')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg" style="grid-column:span 2"><label>عنوان *</label>
          <input id="lf_title" value="${esc(libVal('title'))}" placeholder="مثال: آیین‌نامه داخلی بخش اورژانس"></div>
        <div class="fg" style="grid-column:span 3"><label>توضیح (اختیاری)</label>
          <textarea id="lf_description" rows="2" placeholder="توضیح کوتاه درباره این مورد">${esc(libVal('description'))}</textarea></div>
        <div class="fg" style="grid-column:span 3"><label>محور مرتبط در درخت اعتباربخشی (اختیاری)</label>
          <select id="lf_section_id">
            <option value="">— بدون اتصال به محور —</option>
            ${S.sections.map(sec=>`<optgroup label="${esc(sec.title)}">${sec.axes.map(ax=>
              `<option value="${ax.id}" ${libVal('section_id')===ax.id?'selected':''}>${esc(ax.code)} — ${esc(ax.title)}</option>`).join('')}</optgroup>`).join('')}
          </select></div>
      </div>
      <div class="docsec"><div class="docsl">فایل (JPG/PNG/WEBP/PDF — حداکثر ۵ مگابایت)</div>
        <div class="docsv">
          ${cur&&cur.file_path?`<div style="margin-bottom:6px"><a href="/api/library/${cur.id}/file" target="_blank" style="color:var(--gdl)">⤓ ${esc(cur.file_name||'فایل فعلی')}</a></div>`:''}
          <input type="file" id="lf_file" accept=".jpg,.jpeg,.png,.webp,.pdf">
          <div class="sub" style="margin-top:4px">${LIB.editId?'انتخاب فایل جدید، فایل قبلی را جایگزین می‌کند':'فایل پس از ذخیره مورد بارگذاری می‌شود'}</div>
        </div></div>
      <div style="margin-top:12px"><button class="btn btn-g" onclick="saveLibItem()">ذخیره</button></div>
    </div>
  </div>`;
  applyFieldGuides({editing:!!LIB.editId});
}
function backToLibList(){ LIB.view='list'; LIB.current=null; LIB.editId=null; renderLibrary(); }

async function saveLibItem(){
  const b={ category:$('lf_category').value, title:$('lf_title').value.trim(),
            description:$('lf_description').value.trim(), section_id:$('lf_section_id').value };
  if(!b.title){ toast('عنوان الزامی است',true); return; }
  try{
    let id=LIB.editId;
    if(id) await API.updateLibraryItem(id,b);
    else { const r=await API.createLibraryItem(b); id=r.item.id; }
    const fi=$('lf_file');
    if(fi&&fi.files&&fi.files[0]) await API.uploadLibraryFile(id, fi.files[0]);
    toast(LIB.editId?'مورد به‌روزرسانی شد':'مورد به کتابخانه افزوده شد');
    backToLibList();
  }catch(e){ toast(e.message,true); }
}
async function removeLibItem(id){
  if(!await BTN.confirmDanger('این مورد از کتابخانه حذف شود؟')) return;
  try{ await API.deleteLibraryItem(id); toast('مورد حذف شد'); renderLibrary(); }
  catch(e){ toast(e.message,true); }
}

// ==================== بانک چک‌لیست‌ها ====================
const CL_COMPLETION_FA={per_patient:'به ازای هر بیمار', per_staff:'به ازای هر کارمند',
  per_department:'به ازای هر بخش/واحد', per_shift:'به ازای هر شیفت', general:'عمومی (یک‌بار)'};
const CL_STATUS_FA={draft:'پیش‌نویس', active:'فعال', archived:'بایگانی'};
const CL_STATUS_BDG={draft:'b2', active:'b1', archived:'b3'};
const CL_TYPE_FA={likert5:'طیف ۵ گزینه‌ای', yes_no:'بله / خیر'};
// گزینه‌های طیف لیکرت (خالی/کم/متوسط/خوب/عالی)
const CL_OPTIONS={
  likert5:[['empty','خالی'],['low','کم'],['medium','متوسط'],['good','خوب'],['excellent','عالی']],
  yes_no:[['no','خیر'],['yes','بله']],
};
// تناوبِ پایش — معادل CADENCE_FA در src/services/checklist-cadence.js
const CL_CADENCE_FA={daily:'روزانه', weekly:'هفتگی', monthly:'ماهانه', quarterly:'فصلی (سه‌ماهه)',
  biannual:'شش‌ماهه', annual:'سالانه', ondemand:'موردی — بدون دوره‌ی ثابت'};
// برچسبِ کوتاهِ همان تناوب، برای جدول
const CL_CADENCE_SHORT={daily:'روزانه', weekly:'هفتگی', monthly:'ماهانه', quarterly:'فصلی',
  biannual:'شش‌ماهه', annual:'سالانه', ondemand:'موردی'};

// نشانِ وضعیتِ پایش. سرور در c.due وضعیت را در لحظه حساب می‌کند (نگاه کنید به
// checklistStatus)؛ این‌جا فقط به نشانِ رنگی ترجمه می‌شود.
function chkDueBadge(due){
  if(!due||!due.periodic) return '';
  const d={
    done:     ['b1','✓ این دوره انجام شده'],
    due:      ['b2','در انتظار تکمیل'],
    due_soon: ['b2','مهلت نزدیک است'],
    last_day: ['b3','امروز آخرین مهلت'],
  }[due.state];
  if(!d) return '';
  const left = due.state==='due'||due.state==='due_soon'
    ? ` (${fa(due.days_left)} روز مانده)` : '';
  return `<span class="bdg ${d[0]}" title="دوره‌ی جاری: ${faDateISO(due.period_start)} تا ${faDateISO(due.period_end)}">${d[1]}${left}</span>`;
}
