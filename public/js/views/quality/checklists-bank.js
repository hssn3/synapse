/**
 * Checklists Definition Bank
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
let CHK={list:[], view:'list', current:null, domains:[], items:[], subs:[], editId:null,
         answers:{}, measurers:[], colleagues:[], docs:null, filters:{status:'', completion_type:'', q:'', mine:''}};
const canSubmitChecklists = () => { const p=S.user?.permissions||[]; return p.includes('submit_checklists')||p.includes('manage_checklists'); };
const canManageChecklists = () => (S.user?.permissions||[]).includes('manage_checklists');
// ثبت اقدام اصلاحی: assign_tasks یا manage_checklists — دقیقاً همان شرطی که روت
// سرور بررسی می‌کند. کسی که پایش را می‌گرداند باید بتواند یافته‌اش را ببندد
// (الف-۲-۲-۵: «…توسط مدیریت بیمارستان انجام و موارد عدم انطباق اصلاح شود»).
const canAssignTasks = () => { const p=S.user?.permissions||[];
  return p.includes('*')||p.includes('assign_tasks')||p.includes('manage_checklists'); };

async function renderChecklists(){
  $('ptitle').textContent='بانک چک‌لیست‌ها';
  if(CHK.view==='form') return drawChkForm();
  if(CHK.view==='fill'&&CHK.editId) return loadChkDetail(CHK.editId,'fill');
  if(CHK.view==='detail'&&CHK.editId) return loadChkDetail(CHK.editId,'detail');
  if(CHK.view==='sub'&&CHK.subId) return loadChkSubmission(CHK.subId);
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(CHK.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const {checklists}=await API.checklists(qs);
    CHK.list=checklists||[];
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(CHK.view!=='list') return;
    drawChkList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function drawChkList(){
  const f=CHK.filters;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">✓</div>
      <div style="flex:1"><h3>بانک چک‌لیست‌های بیمارستان</h3>
      <div class="sub">${fa(CHK.list.length)} چک‌لیست — با حیطه‌بندی، طیف پاسخ و نمره‌دهی خودکار</div></div>
      <button class="btn btn-o btn-sm" onclick="printChecklistBank()">${ic('print')} چاپ فهرست</button>
      ${canManageChecklists()?`<button class="btn btn-g btn-sm" onclick="newChecklist()">+ ساخت چک‌لیست</button>`:''}
    </div>
    <div class="pbody">
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>وضعیت ${help('flt_status')}</label>
          <select onchange="setChkFilter('status',this.value)">
            <option value="">همه وضعیت‌ها</option>
            ${Object.entries(CL_STATUS_FA).map(([k,v])=>`<option value="${k}" ${f.status===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0"><label>نحوه تکمیل ${help('flt_fillmode')}</label>
          <select onchange="setChkFilter('completion_type',this.value)">
            <option value="">همه</option>
            ${Object.entries(CL_COMPLETION_FA).map(([k,v])=>`<option value="${k}" ${f.completion_type===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0"><label>محول‌شده به من ${help('flt_assigned')}</label>
          <select onchange="setChkFilter('mine',this.value)">
            <option value="">همه چک‌لیست‌ها</option>
            <option value="1" ${f.mine==='1'?'selected':''}>چک‌لیست‌های محول‌شده به من</option>
          </select></div>
        <div class="fg" style="margin:0;flex:1.6"><label>جستجو در عنوان یا شماره چک‌لیست</label>
          <input id="chk_q" value="${esc(f.q)}" placeholder="مثال: بهداشت دست یا CL-01"
            onkeydown="if(event.key==='Enter')setChkFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="setChkFilter('q',$('chk_q').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!CHK.list.length?'<div class="empty"><div class="ei">✓</div>چک‌لیستی با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>شماره</th><th>عنوان چک‌لیست</th><th>تناوب پایش</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>${CHK.list.map(c=>{ const did=drowNext(); return `<tr>
          <td style="color:var(--gdl);white-space:nowrap">${esc(c.checklist_code||'—')}</td>
          <td style="color:var(--th);cursor:pointer" onclick="openChecklist('${c.id}')"><span style="font-weight:700;color:var(--gdl)">${esc(c.title)}</span>${exBdg(c)}
            <span class="tsub">${fa(c.item_count||0)} سؤال${c.domain_count?` در ${fa(c.domain_count)} حیطه`:''} — ${fa(c.submission_count||0)} پاسخ‌نامه ثبت‌شده</span></td>
          <td style="white-space:nowrap">${CL_CADENCE_SHORT[c.cadence]||'موردی'}
            ${c.due&&c.due.periodic?`<span class="tsub">${chkDueBadge(c.due)}</span>`:''}</td>
          <td><span class="bdg ${CL_STATUS_BDG[c.status]||'b2'}">${CL_STATUS_FA[c.status]||c.status}</span></td>
          <td style="white-space:nowrap">
            <button class="tgl prim" onclick="openChecklist('${c.id}')">مشاهده و پایش</button>
            ${canSubmitChecklists()?`<button class="tgl" onclick="fillChecklist('${c.id}')">✎ ثبت ارزیابی</button>`:''}
            ${drowBtn(did)}
          </td></tr>
          ${drowRow(did, 5, [
            dp('نحوه تکمیل', CL_COMPLETION_FA[c.completion_type]||esc(c.completion_type||'')),
            dp('تناوب پایش', CL_CADENCE_FA[c.cadence]||'موردی — بدون دوره‌ی ثابت'),
            dp('دوره‌ی جاری', c.due&&c.due.periodic?`${faDateISO(c.due.period_start)} تا ${faDateISO(c.due.period_end)}`:''),
            dp('آخرین تکمیل', c.due&&c.due.last_submitted_at?faDateISO(c.due.last_submitted_at):(c.submission_count?'':'هنوز هیچ‌بار پر نشده')),
            dp('تعداد حیطه', fa(c.domain_count||0)),
            dp('تعداد سؤال', fa(c.item_count||0)),
            dp('پاسخ‌نامه‌های ثبت‌شده', fa(c.submission_count||0)),
            dp('مسئولین اندازه‌گیری', c.measurer_count?fa(c.measurer_count)+' نفر':''),
            dp('محور اعتباربخشی مرتبط', c.section_id?esc(fixText(c.section_title||c.section_code||'')):''),
          ], `${canSubmitChecklists()?`<button class="tgl" onclick="openChecklist('${c.id}')">مشاهده و پاسخ‌نامه‌ها</button>`:''}
            ${canManageChecklists()?`<button class="tgl" onclick="editChecklist('${c.id}')">ویرایش</button>
            <button class="tgl dngr" onclick="removeChecklist('${c.id}')">حذف چک‌لیست</button>`:''}`)}`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setChkFilter(k,v){ CHK.filters[k]=v; CHK.view='list'; renderChecklists(); }

// فهرست بانک چک‌لیست‌ها روی کاغذ. برگه‌ی پاسخ‌نامه‌ی هر دور جداگانه چاپ می‌شود؛
// این یکی نمای برنامه‌ی پایش است: چه چک‌لیستی، با چه تناوبی، و آخرین‌بار کِی پر شد.
function printChecklistBank(){
  if(!CHK.list.length){ toast('چک‌لیستی با این فیلتر برای چاپ نیست',true); return; }
  const active=CHK.list.filter(c=>c.status==='active').length;
  const never=CHK.list.filter(c=>!c.submission_count).length;
  printListSheet({
    page:'checklists', title:'فهرست بانک چک‌لیست‌ها و برنامه‌ی پایش', code:'RPT-CHK',
    intro:'چک‌لیست‌های ثبت‌شده با تناوب پایش، تعداد سؤال، تعداد پاسخ‌نامه و آخرین تکمیل.',
    meta:[...activeFilters(CHK.filters,{status:'وضعیت',completion_type:'نحوه تکمیل',mine:'محول‌شده به من',q:'جست‌وجو'}),
      ['فعال', String(active)+' از '+CHK.list.length],
      ['هرگز پر نشده', String(never)]],
    headers:['شماره','عنوان چک‌لیست','تناوب پایش','نحوه تکمیل','حیطه','سؤال','پاسخ‌نامه','آخرین تکمیل','وضعیت'],
    rows:CHK.list.map(c=>[esc(c.checklist_code||'—'), esc(c.title),
      CL_CADENCE_FA[c.cadence]||'موردی',
      CL_COMPLETION_FA[c.completion_type]||esc(c.completion_type||'—'),
      fa(c.domain_count||0), fa(c.item_count||0), fa(c.submission_count||0),
      (c.due&&c.due.last_submitted_at)?faDateISO(c.due.last_submitted_at):'هرگز',
      CL_STATUS_FA[c.status]||esc(c.status||'—')]),
    foot:'بانک چک‌لیست‌ها',
  });
}

// ---------- فرم ساخت/ویرایش (سازنده چک‌لیست) ----------
// فهرست همکاران برای انتخابگر «مسئولین اندازه‌گیری» — همان endpoint سبک ماژول فرآیندها
async function loadChkColleagues(){
  if(CHK.colleagues.length) return;
  try{ const r=await API.colleagues(); CHK.colleagues=r.users||[]; }catch(e){ CHK.colleagues=[]; }
}
// فهرست مدارک کنترل‌شده برای انتخابگرِ «سند مادر» (الف-۱-۴-۶). فقط اسناد فعال —
// چک‌لیست نباید ذیل سندی برود که هنوز پیش‌نویس است یا بایگانی شده.
async function loadChkDocs(){
  if(CHK.docs) return;
  try{ const r=await API.documents('status=active'); CHK.docs=r.documents||[]; }
  catch(e){ CHK.docs=[]; }
}
async function newChecklist(){ CHK.view='form'; CHK.editId=null; CHK.current=null; CHK.domains=[]; CHK.items=[]; CHK.measurers=[];
  await Promise.all([loadChkColleagues(), loadChkDocs()]); drawChkForm(); }
async function editChecklist(id){
  try{
    const r=await API.checklist(id);
    CHK.current=r.checklist; CHK.editId=id; CHK.view='form';
    // id ها حفظ می‌شوند تا ویرایش، سؤالات موجود را جایگزین (و پاسخ‌نامه‌های قبلی را بی‌مرجع) نکند
    CHK.domains=(r.domains||[]).map(d=>({id:d.id, title:d.title, items:(d.items||[]).map(chkItemOf)}));
    CHK.items=(r.items||[]).map(chkItemOf);
    CHK.measurers=(r.measurers||[]).map(u=>u.user_id);
    await Promise.all([loadChkColleagues(), loadChkDocs()]);
    drawChkForm();
  }catch(e){ toast(e.message,true); }
}
const chkItemOf = i => ({id:i.id, question_text:i.question_text, answer_type:i.answer_type, weight:i.weight});
function chkVal(f){ return CHK.current? (CHK.current[f]??'') : ''; }

function drawChkForm(){
  const c=CHK.current;
  $('ptitle').textContent=CHK.editId?'ویرایش چک‌لیست':'ساخت چک‌لیست جدید';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">✓</div>
      <div style="flex:1"><h3>${CHK.editId?'ویرایش چک‌لیست':'چک‌لیست جدید'}</h3>
      <div class="sub">اطلاعات اولیه، حیطه‌بندی و سؤالات — همه در یک فرم</div></div>
      <button class="btn btn-o btn-sm" onclick="backToChkList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      ${exBanner(c)}
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان چک‌لیست *</label>
          <input id="cf_title" value="${esc(chkVal('title'))}" placeholder="مثال: چک‌لیست پایش بهداشت دست"></div>
        <div class="fg"><label>شماره چک‌لیست</label>
          <input id="cf_code" value="${esc(chkVal('checklist_code'))}" placeholder="CL-01" style="direction:ltr"></div>
        <div class="fg"><label>نحوه تکمیل این چک‌لیست</label>
          <select id="cf_completion">${Object.entries(CL_COMPLETION_FA).map(([k,v])=>
            `<option value="${k}" ${(chkVal('completion_type')||'per_department')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg"><label>وضعیت</label>
          <select id="cf_status">${Object.entries(CL_STATUS_FA).map(([k,v])=>
            `<option value="${k}" ${(chkVal('status')||'draft')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg" style="grid-column:span 2"><label>تناوب پایش — هر چند وقت یک‌بار باید پر شود؟ ${help('cl_cadence')}</label>
          <select id="cf_cadence">${Object.entries(CL_CADENCE_FA).map(([k,v])=>
            `<option value="${k}" ${(chkVal('cadence')||'ondemand')===k?'selected':''}>${v}</option>`).join('')}</select>
          <div style="font-size:10.5px;color:var(--td);margin-top:5px;line-height:1.8">با انتخاب یک تناوب، این چک‌لیست در هر دوره به‌صورت خودکار در کارتابلِ مسئولین اندازه‌گیری سررسید می‌خورد. دوره‌ها بر تقویم شمسی بسته می‌شوند.</div></div>
        <div class="fg" style="grid-column:span 2"><label>سند مادر (مستند سطح بالا) ${help('cl_parent')}</label>
          <select id="cf_parent">
            <option value="">— بدون سند مادر —</option>
            ${(CHK.docs||[]).map(d=>`<option value="${d.id}" ${chkVal('parent_document_id')===d.id?'selected':''}>${esc(d.doc_code||'بدون کد')} — ${esc(d.title)}</option>`).join('')}
          </select>
          <div style="font-size:10.5px;color:var(--td);margin-top:5px;line-height:1.8">طبق سنجه الف‑۱‑۴‑۶، چک‌لیست یک «مستند سطح پایین» است و باید ذیل یک خط‌مشی، روش اجرایی یا دستورالعمل استفاده شود.${!(CHK.docs||[]).length?' <b style="color:var(--wr)">هنوز سند کنترل‌شده‌ای ثبت نشده — ابتدا از «مدارک کنترل‌شده» سند مادر را بسازید.</b>':''}</div></div>
        <div class="fg" style="grid-column:span 2"><label>محور مرتبط در درخت اعتباربخشی</label>
          <select id="cf_section_id">
            <option value="">— بدون اتصال به محور —</option>
            ${S.sections.map(sec=>`<optgroup label="${esc(sec.title)}">${sec.axes.map(ax=>
              `<option value="${ax.id}" ${chkVal('section_id')===ax.id?'selected':''}>${esc(ax.code)} — ${esc(ax.title)}</option>`).join('')}</optgroup>`).join('')}
          </select></div>
      </div>
      <div class="fg"><label>هدف از ساخت چک‌لیست</label>
        <textarea id="cf_purpose" rows="3" placeholder="این چک‌لیست برای پایش چه چیزی ساخته می‌شود؟">${esc(chkVal('purpose'))}</textarea></div>
      <div class="docgrid">
        <div class="fg" style="margin:0"><label>چک‌لیست از حیطه‌های مختلف تشکیل شده است؟</label>
          <select id="cf_has_domains"><option value="0" ${!c||!c.has_domains?'selected':''}>خیر</option>
            <option value="1" ${c&&c.has_domains?'selected':''}>بله</option></select></div>
        <div class="fg" style="margin:0"><label>دارای اطلاعات پایه‌ای است؟</label>
          <select id="cf_has_baseline"><option value="0" ${!c||!c.has_baseline?'selected':''}>خیر</option>
            <option value="1" ${c&&c.has_baseline?'selected':''}>بله</option></select></div>
        <div class="fg" style="margin:0"><label>چک‌لیست عمومی است؟</label>
          <select id="cf_is_public"><option value="0" ${!c||!c.is_public?'selected':''}>خیر</option>
            <option value="1" ${c&&c.is_public?'selected':''}>بله</option></select></div>
      </div>
      <div class="fg"><label>اطلاعات پایه‌ای (در صورت نیاز)</label>
        <textarea id="cf_baseline" rows="2" placeholder="اطلاعاتی که پیش از پاسخ به سؤالات باید ثبت شود">${esc(chkVal('baseline_info'))}</textarea></div>

      <div class="docsec"><div class="docsl">مسئولین اندازه‌گیری</div>
        <div class="docsv">
          <div class="sub" style="margin-bottom:6px">کسانی که تکمیل و اندازه‌گیری این چک‌لیست بر عهده‌ی آن‌هاست (چند انتخابی — با Ctrl کلیک کنید). این چک‌لیست در کارتابل آن‌ها نمایش داده می‌شود.</div>
          <select id="cf_measurers" multiple size="6" style="width:100%">
            ${CHK.colleagues.map(u=>`<option value="${u.id}" ${CHK.measurers.includes(u.id)?'selected':''}>${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
          </select>
          ${!CHK.colleagues.length?'<div class="sub">کاربر دیگری در این بیمارستان ثبت نشده است</div>':''}
        </div></div>

      <div class="dsec" style="margin-top:16px">
        <div class="dl" style="color:var(--gdl)">◈ حیطه‌بندی و سؤالات</div>
        <div id="chkBuilder"></div>
        <div class="docgrid" style="margin-top:10px">
          <div class="fg" style="margin:0"><label>عنوان حیطه جدید</label><input id="chk_dom_title" placeholder="مثال: امکانات و تجهیزات"></div>
          <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="addChkDomain()">+ افزودن حیطه</button>
        </div>
      </div>

      <button class="btn btn-g" onclick="saveChecklist()">${CHK.editId?'ذخیره تغییرات':'ثبت چک‌لیست'}</button>
      <button class="btn btn-o" onclick="backToChkList()">انصراف</button>
    </div>
  </div>`;
  drawChkBuilder();
  applyFieldGuides({editing:!!CHK.editId});
}

// di = -1 یعنی سؤال بدون حیطه (فهرست تخت)
function chkItemRows(list, di){
  return list.length?`<div class="tbl-wrap"><table>
    <thead><tr><th>متن سؤال</th><th>نوع پاسخ</th><th>وزن</th><th></th></tr></thead>
    <tbody>${list.map((it,ii)=>`<tr><td style="color:var(--th)">${esc(it.question_text)}</td>
      <td>${CL_TYPE_FA[it.answer_type]||it.answer_type}</td><td>${it.weight?fa(it.weight):'۱'}</td>
      <td><button class="tgl" onclick="removeChkItem(${di},${ii})">حذف</button></td></tr>`).join('')}</tbody></table></div>`
    :'<div style="font-size:12px;color:var(--td)">هنوز سؤالی افزوده نشده است.</div>';
}
function chkItemAdder(di){
  const p='ci'+(di<0?'x':di);
  return `<div class="docgrid" style="margin-top:10px">
    <div class="fg" style="margin:0;grid-column:span 2"><label>متن سؤال</label><input id="${p}_q" placeholder="آیا محلول ضدعفونی دست در دسترس است؟"></div>
    <div class="fg" style="margin:0"><label>نوع پاسخ</label><select id="${p}_t">
      ${Object.entries(CL_TYPE_FA).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="fg" style="margin:0"><label>وزن (اختیاری)</label><input id="${p}_w" placeholder="۱" style="direction:ltr"></div>
    <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="addChkItem(${di})">+ افزودن سؤال</button>
  </div>`;
}
function drawChkBuilder(){
  const box=$('chkBuilder'); if(!box) return;
  box.innerHTML=`
    ${CHK.domains.map((d,di)=>`<div class="dsec" style="margin-bottom:10px">
      <div class="dl" style="color:var(--gdl)">◂ حیطه ${fa(di+1)}: ${esc(d.title)}
        <button class="tgl" style="margin-right:auto" onclick="removeChkDomain(${di})">حذف حیطه</button></div>
      ${chkItemRows(d.items, di)}
      ${chkItemAdder(di)}
    </div>`).join('')}
    <div class="dsec">
      <div class="dl" style="color:var(--gdl)">◂ سؤالات بدون حیطه</div>
      ${chkItemRows(CHK.items, -1)}
      ${chkItemAdder(-1)}
    </div>`;
}
function addChkDomain(){
  const t=$('chk_dom_title').value.trim(); if(!t){ toast('عنوان حیطه الزامی است',true); return; }
  CHK.domains.push({title:t, items:[]}); $('chk_dom_title').value=''; drawChkBuilder();
}
function removeChkDomain(di){ CHK.domains.splice(di,1); drawChkBuilder(); }
function addChkItem(di){
  const p='ci'+(di<0?'x':di);
  const q=($(p+'_q')?.value||'').trim(); if(!q){ toast('متن سؤال الزامی است',true); return; }
  const w=($(p+'_w')?.value||'').trim();
  const it={question_text:q, answer_type:$(p+'_t').value, weight:w?Number(w):null};
  (di<0?CHK.items:CHK.domains[di].items).push(it);
  drawChkBuilder();
}
function removeChkItem(di,ii){ (di<0?CHK.items:CHK.domains[di].items).splice(ii,1); drawChkBuilder(); }
function backToChkList(){ CHK.view='list'; CHK.current=null; CHK.editId=null; CHK.subId=null; CHK.measurers=[]; CHK.measurerRows=[]; renderChecklists(); }

function collectChkBody(){
  const v=id=>($(id)?.value||'').trim();
  return {
    title:v('cf_title'), checklist_code:v('cf_code'), completion_type:v('cf_completion'),
    purpose:v('cf_purpose'), baseline_info:v('cf_baseline'), status:v('cf_status'), section_id:v('cf_section_id'),
    cadence:v('cf_cadence'), parent_document_id:v('cf_parent'),
    has_domains:v('cf_has_domains')==='1', has_baseline:v('cf_has_baseline')==='1', is_public:v('cf_is_public')==='1',
    domains:CHK.domains, items:CHK.items,
    measurer_user_ids:[...($('cf_measurers')?.selectedOptions||[])].map(o=>o.value),
  };
}
async function saveChecklist(){
  const b=collectChkBody();
  if(!b.title){ toast('عنوان چک‌لیست الزامی است',true); return; }
  try{
    if(CHK.editId){ await API.updateChecklist(CHK.editId,b); toast('چک‌لیست ذخیره شد'); openChecklist(CHK.editId); }
    else { const r=await API.createChecklist(b); toast('چک‌لیست ثبت شد'); openChecklist(r.checklist.id); }
  }catch(e){ toast(e.message,true); }
}
async function removeChecklist(id){
  if(!await BTN.confirmDanger('این چک‌لیست و تمام سؤالات و پاسخ‌نامه‌های آن حذف شود؟')) return;
  try{ await API.deleteChecklist(id); toast('چک‌لیست حذف شد'); CHK.view='list'; renderChecklists(); }
  catch(e){ toast(e.message,true); }
}

// ---------- نمای جزئیات و تکمیل ----------
function chkGoto(view,id){ CHK.view=view; CHK.editId=id; S.page='checklists';
  document.querySelectorAll('.nitem[data-p]').forEach(n=>n.classList.toggle('on', n.dataset.p==='checklists'));
  loadChkDetail(id,view); }
function openChecklist(id){ chkGoto('detail',id); }
function fillChecklist(id){ CHK.answers={}; chkGoto('fill',id); }

async function loadChkDetail(id, view, wardPref){
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const r=await API.checklist(id);
    CHK.current=r.checklist; CHK.editId=id;
    CHK.domains=(r.domains||[]).map(d=>({id:d.id, title:d.title, items:d.items||[]}));
    CHK.items=r.items||[];
    CHK.measurerRows=r.measurers||[]; CHK.measurers=CHK.measurerRows.map(u=>u.user_id);
    if(view==='fill') return drawChkFill();
    const {submissions}=await API.checklistSubmissions(id).catch(()=>({submissions:[]}));
    CHK.subs=submissions||[];
    drawChkDetail();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function chkAllGroups(){
  const g=CHK.domains.map(d=>({title:d.title, items:d.items}));
  if(CHK.items.length) g.push({title:null, items:CHK.items});
  return g;
}

// وضعیتِ پایشِ چک‌لیست، بالای صفحه‌ی خودش. برای چک‌لیستِ «موردی» یک تذکر می‌گذارد که
// این چک‌لیست دوره ندارد — چون سکوت در این‌باره همان چیزی بود که کارفرما «انگار یک‌دفعه
// است و پایش نمی‌شود» می‌خواند.
function chkDuePanel(c){
  const d=c&&c.due;
  if(!d) return '';
  if(!d.periodic){
    return `<div class="docsec"><div class="docsl">تناوب پایش</div>
      <div class="docsv"><span class="bdg b3">موردی — بدون دوره‌ی ثابت</span>
      <div style="margin-top:7px;font-size:11.5px;color:var(--td);line-height:1.95">این چک‌لیست دوره‌ی ثابتی ندارد و فقط هنگام نیاز پر می‌شود، پس سامانه برای آن سررسید نمی‌سازد.
      ${canManageChecklists()?'اگر کتاب برای این موضوع پایش دوره‌ای می‌خواهد، از «ویرایش» یک تناوب برایش تعیین کنید.':''}</div></div></div>`;
  }
  const cad=CL_CADENCE_FA[d.cadence]||d.cadence;
  return `<div class="docsec"><div class="docsl">وضعیت پایش دوره‌ای</div>
    <div class="docsv">
      <span class="bdg b1" style="margin-left:6px">${esc(cad)}</span>${chkDueBadge(d)}
      <div style="margin-top:8px;font-size:11.5px;color:var(--td);line-height:1.95">
        دوره‌ی جاری: <b style="color:var(--gdl)">${faDateISO(d.period_start)}</b> تا <b style="color:var(--gdl)">${faDateISO(d.period_end)}</b>
        ${d.last_submitted_at
          ?` — آخرین تکمیل: <b style="color:var(--gdl)">${faDateISO(d.last_submitted_at)}</b>`
          :' — <b style="color:var(--wr)">تا امروز هیچ‌بار پر نشده است</b>'}
        ${d.previous_period_missed&&d.last_submitted_at?'<br><span style="color:var(--wr)">دوره‌ی قبل هم بدون تکمیل گذشت — این وقفه در روز ارزیابی دیده می‌شود.</span>':''}
      </div>
    </div></div>`;
}

// وضعیتِ «سند کنترل‌شده» بودنِ چک‌لیست — کد، نسخه و سند مادر.
// سنجه الف-۱-۴-۶: «هیچ یک از مستندات سطح پایین نباید بدون سند سطح بالا یا سند مادر،
// در سازمان استفاده شود.» پس نبودِ سند مادر یا کد، یک نقصِ قابل‌گزارش است نه یک فیلدِ
// خالیِ بی‌اهمیت — و باید همان‌جا به کاربر گفته شود، نه در روز ارزیابی.
function chkDocControlPanel(c){
  const pd=c.parent_document;
  const missing=[];
  if(!c.checklist_code) missing.push('کد چک‌لیست');
  if(!pd) missing.push('سند مادر');
  return `<div class="docsec${missing.length?' ncsec':''}">
    <div class="docsl">شناسنامه سند</div>
    <div class="docsv">
      <div class="doc-dates">
        <div><span>کد چک‌لیست</span><b class="${c.checklist_code?'':'over'}">${esc(c.checklist_code||'ثبت نشده')}</b></div>
        <div><span>نسخه</span><b>${fa(c.version_no||1)}</b></div>
        <div><span>سند مادر</span><b class="${pd?'':'over'}">${pd?esc((pd.doc_code?pd.doc_code+' — ':'')+pd.title):'ثبت نشده'}</b></div>
        <div><span>آخرین ویرایش</span><b>${faDateISO(c.updated_at)}</b></div>
      </div>
      ${missing.length?`<div class="rg-warn" style="margin-top:10px">${esc(missing.join(' و '))} برای این چک‌لیست ثبت نشده است.
        طبق سنجه الف‑۱‑۴‑۶، چک‌لیست یک «مستند سطح پایین» است و باید هم کد داشته باشد و هم ذیل یک سند مادر استفاده شود؛
        تا وقتی ${esc(missing.join(' و '))} ندارد، در روز ارزیابی شاهد محسوب نمی‌شود.
        ${canManageChecklists()?'از «ویرایش» این موارد را کامل کنید.':'از مدیر بهبود کیفیت بخواهید این موارد را کامل کند.'}</div>`
      :`<div style="margin-top:8px;font-size:11.5px;color:var(--td)">این چک‌لیست تحت کنترل سند است و ذیل «${esc(pd.title)}» استفاده می‌شود.</div>`}
    </div></div>`;
}

// هاب پایش و ارزیابی جامع چک‌لیست (Checklist Audit Hub)
function drawChkDetail(){
  const c = CHK.current;
  const d = c && c.due;
  const subs = CHK.subs || [];
  const wards = CHK.hospitalWards || ['اورژانس', 'مراقبت‌های ویژه (ICU)', 'قلب (CCU)', 'اتاق عمل جنرال', 'جراحی عمومی', 'داخلی', 'اطفال', 'زنان و زایمان', 'دیالیز', 'نوزادان (NICU)', 'آزمایشگاه', 'تصویربرداری', 'داروخانه', 'استریلیزاسیون (CSR)', 'بهداشت محیط', 'لاندری (رختشویخانه)', 'تغذیه و آشپزخانه', 'تأسیسات و مهندسی پزشکی'];

  // تحلیل آماری پاسخ‌نامه‌ها
  let totalScore = 0, totalMax = 0, ncCount = 0;
  subs.forEach(s => {
    totalScore += (s.score || 0);
    totalMax += (s.max_score || 0);
    if ((s.max_score || 0) > 0 && ((s.score / s.max_score) < 0.75)) ncCount++;
  });
  const avgPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;

  // تفکیک بخش‌های پایش‌شده در دوره جاری
  const periodStart = d && d.period_start ? d.period_start : null;
  const periodEnd = d && d.period_end ? d.period_end : null;
  const currentPeriodSubs = subs.filter(s => {
    if (!periodStart || !periodEnd) return true;
    const dt = s.submitted_at ? s.submitted_at.slice(0, 10) : '';
    return dt >= periodStart && dt <= periodEnd;
  });

  const auditedWardsMap = {};
  currentPeriodSubs.forEach(s => {
    const ref = (s.reference || '').trim();
    wards.forEach(w => {
      if (ref.includes(w) || w.includes(ref)) {
        auditedWardsMap[w] = s;
      }
    });
  });

  $('ptitle').textContent = 'هاب پایش و ارزیابی — ' + c.title;
  $('content').innerHTML = `
  ${pathCards(c.section_id)}

  <!-- ۱. شناسنامه سند و نوار ناوبری اصلی هاب -->
  <div class="panel g">
    <div class="phd">
      <div class="abadge">◈</div>
      <div style="flex:1">
        <h3 style="font-size:16px">${esc(c.title)}</h3>
        <div class="sub">
          کد: <b style="color:var(--gdl)">${esc(c.checklist_code || 'بدون کد')}</b> ·
          تناوب پایش: <b style="color:var(--gdl)">${CL_CADENCE_FA[c.cadence] || 'موردی'}</b> ·
          وضعیت: <span class="bdg ${CL_STATUS_BDG[c.status] || 'b2'}">${CL_STATUS_FA[c.status] || c.status}</span>
        </div>
      </div>
      <button class="btn btn-o btn-sm" onclick="backToChkList()">◂ فهرست چک‌لیست‌ها</button>
      ${canSubmitChecklists() ? `<button class="btn btn-g btn-sm" onclick="fillChecklist('${c.id}')">✎ + ثبت ارزیابی جدید</button>` : ''}
      <button class="btn btn-o btn-sm" onclick="printBlankChecklist('${c.id}')">${ic('print')} چاپ برگه خام ارزیابی</button>
      ${subs.length ? `<button class="btn btn-o btn-sm" onclick="exportChecklistCsv('${c.id}')">⤓ خروجی CSV</button>` : ''}
      ${canManageChecklists() ? `<button class="btn btn-o btn-sm" onclick="editChecklist('${c.id}')">✎ ویرایش</button>` : ''}
    </div>
    <div class="pbody">
      ${exBanner(c)}

      <!-- شناسنامه استاندارد و کنترل سند -->
      ${chkDocControlPanel(c)}

      <!-- ۲. تقویم سنجه و موتور سررسید پایش بعدی -->
      <div class="docsec ${d && d.previous_period_missed ? 'ncsec' : ''}" style="margin-top:12px;background:rgba(212,175,90,0.04);border:1px solid var(--gd)">
        <div class="docsl" style="color:var(--gdl);font-weight:700">تقویم سنجه اعتباربخشی و سررسید پایش</div>
        <div class="docsv">
          <div class="doc-dates">
            <div><span>تناوب مصوب سنجه</span><b>${CL_CADENCE_FA[c.cadence] || 'موردی'}</b></div>
            <div><span>دوره‌ی جاری شمسی</span><b>${d && d.period_start ? faDateISO(d.period_start) + ' تا ' + faDateISO(d.period_end) : 'موردی'}</b></div>
            <div><span>مهلت باقی‌مانده</span><b>${d && d.days_left !== undefined ? (d.days_left <= 0 ? 'امروز پایان مهلت است' : fa(d.days_left) + ' روز') : '—'}</b></div>
            <div><span>سررسید دوره بعدی</span><b style="color:var(--gdl)">${d && d.next_period_start ? faDateISO(d.next_period_start) + ' تا ' + faDateISO(d.next_period_end) : 'پس از اتمام دوره جاری'}</b></div>
          </div>
          <div style="margin-top:10px;font-size:12px;display:flex;align-items:center;gap:12px">
            <div>وضعیت دوره جاری: ${chkDueBadge(d)}</div>
            ${d && d.last_submitted_at ? `<div style="color:var(--td)">آخرین ارزیابی ثبت‌شده در این چک‌لیست: <b style="color:var(--th)">${faDateISO(d.last_submitted_at)}</b></div>` : '<div style="color:var(--wr)">در دوره جاری هنوز هیچ ارزیابی ثبت نشده است.</div>'}
          </div>
          ${d && d.previous_period_missed ? `<div class="rg-warn" style="margin-top:8px">دوره‌ی قبل بدون تکمیل گذشت — طبق سنجه‌های اعتباربخشی، وقفه در پایش ادواری یک عدم انطباق مدیریتی محسوب می‌شود.</div>` : ''}
        </div>
      </div>

      <!-- ۳. کارت‌های آماری افقی عملکرد (قاعده ۱۱ - Horizontal Flow) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-top:14px">
        <div class="panel g" style="margin:0;padding:12px 14px;border:1px solid var(--bdr);background:rgba(255,255,255,0.02)">
          <div style="font-size:11.5px;color:var(--td)">کل ارزیابی‌های ثبت‌شده</div>
          <div style="font-size:20px;font-weight:700;color:var(--th);margin-top:4px">${fa(subs.length)} <span style="font-size:12px;font-weight:400">مورد</span></div>
        </div>
        <div class="panel g" style="margin:0;padding:12px 14px;border:1px solid var(--bdr);background:rgba(255,255,255,0.02)">
          <div style="font-size:11.5px;color:var(--td)">میانگین نمره بیمارستان</div>
          <div style="font-size:20px;font-weight:700;color:${avgPct && avgPct >= 80 ? 'var(--ok)' : (avgPct && avgPct >= 65 ? 'var(--gdl)' : 'var(--wr)')};margin-top:4px">
            ${avgPct !== null ? fa(avgPct) + '٪' : '—'}
          </div>
        </div>
        <div class="panel g" style="margin:0;padding:12px 14px;border:1px solid var(--bdr);background:rgba(255,255,255,0.02)">
          <div style="font-size:11.5px;color:var(--td)">پوشش بخش‌ها در دوره جاری</div>
          <div style="font-size:20px;font-weight:700;color:var(--th);margin-top:4px">
            ${fa(Object.keys(auditedWardsMap).length)} <span style="font-size:12px;font-weight:400">از ${fa(wards.length)} بخش</span>
          </div>
        </div>
        <div class="panel g" style="margin:0;padding:12px 14px;border:1px solid var(--bdr);background:rgba(255,255,255,0.02)">
          <div style="font-size:11.5px;color:var(--td)">ارزیابی‌های دارای افت نمره (زیر ۷۵٪)</div>
          <div style="font-size:20px;font-weight:700;color:${ncCount ? 'var(--wr)' : 'var(--ok)'};margin-top:4px">
            ${fa(ncCount)} <span style="font-size:12px;font-weight:400">${ncCount ? 'نیازمند CAPA' : 'وضعیت مطلوب'}</span>
          </div>
        </div>
      </div>

      <!-- ۴. ماتریس پایش بخش‌های بیمارستان در دوره جاری (Ward Compliance Grid) -->
      <div class="docsec" style="margin-top:16px">
        <div class="docsl" style="color:var(--gdl);font-weight:700">ماتریس وضعیت پایش بخش‌های بیمارستان در دوره‌ی جاری</div>
        <div class="docsv">
          <div style="font-size:11.5px;color:var(--td);margin-bottom:10px">
            ارزیابی هر بخش را در دوره‌ی جاری پایش کنید. با کلیک بر روی «+ ثبت ارزیابی»، فرم مستقیماً برای آن بخش باز می‌شود:
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:8px">
            ${wards.map(w => {
              const sub = auditedWardsMap[w];
              const pct = sub && sub.max_score ? Math.round((sub.score / sub.max_score) * 100) : null;
              return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:6px;border:1px solid ${sub ? 'rgba(76,175,80,0.3)' : 'var(--bdr)'};background:${sub ? 'rgba(76,175,80,0.06)' : 'rgba(255,255,255,0.01)'}">
                <div>
                  <div style="font-size:12px;font-weight:600;color:${sub ? 'var(--th)' : 'var(--td)'}">${esc(w)}</div>
                  <div style="font-size:10.5px;color:${sub ? 'var(--ok)' : 'var(--td)'}">
                    ${sub ? `✓ انجام‌شده (نمره ${fa(pct)}٪)` : '⏳ در انتظار ارزیابی'}
                  </div>
                </div>
                <div>
                  ${sub ? `<button class="tgl" style="font-size:11px" onclick="openChkSubmission('${sub.id}')">مشاهده</button>`
                        : (canSubmitChecklists() ? `<button class="tgl prim" style="font-size:11px" onclick="fillChecklist('${c.id}','${esc(w)}')">+ ارزیابی</button>` : '')}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- ۵. هدف و مسئولین اندازه‌گیری -->
      ${c.purpose ? `<div class="docsec"><div class="docsl">هدف از ساخت چک‌لیست</div><div class="docsv">${esc(c.purpose)}</div></div>` : ''}
      <div class="docsec"><div class="docsl">مسئولین اندازه‌گیری</div>
        <div class="docsv">${(CHK.measurerRows || []).length
          ? (CHK.measurerRows || []).map(u => `<span class="bdg b1" style="margin-left:6px">${esc(u.full_name)}${u.department ? ' — ' + esc(u.department) : ''}</span>`).join('')
          : '<span style="color:var(--td)">تعیین نشده است</span>'}</div></div>
      ${c.baseline_info ? `<div class="docsec"><div class="docsl">اطلاعات پایه‌ای</div><div class="docsv">${esc(c.baseline_info)}</div></div>` : ''}

      <!-- ۶. جدول سنجه‌ها و سؤالات ارزیابی -->
      <div class="docsec" style="margin-top:14px">
        <div class="docsl" style="color:var(--gdl);font-weight:700">سؤالات و سنجه‌های مصوب چک‌لیست</div>
        <div class="docsv">
          ${chkAllGroups().map(g => `<div class="dsec" style="margin-bottom:12px">
            <div class="dl" style="color:var(--gdl)">◂ ${g.title ? esc(g.title) : 'سؤالات بدون حیطه'}</div>
            <div class="tbl-wrap"><table><thead><tr><th style="width:36px">#</th><th>متن سؤال / سنجه</th><th style="width:120px">نوع پاسخ</th><th style="width:60px">وزن</th></tr></thead>
            <tbody>${g.items.map((it, i) => `<tr><td>${fa(i + 1)}</td><td style="color:var(--th)">${esc(it.question_text)}</td>
              <td>${CL_TYPE_FA[it.answer_type] || it.answer_type}</td><td>${it.weight ? fa(it.weight) : '۱'}</td></tr>`).join('')}</tbody></table></div>
          </div>`).join('') || '<div class="empty">هنوز سؤالی تعریف نشده است</div>'}
        </div>
      </div>
    </div>
  </div>

  <!-- ۷. جدول پاسخ‌نامه‌های ثبت‌شده و سوابق پایش -->
  <div class="panel g">
    <div class="phd">
      <div class="abadge">▤</div>
      <div style="flex:1">
        <h3>سوابق و پاسخ‌نامه‌های ثبت‌شده</h3>
        <div class="sub">${fa(subs.length)} مورد ارزیابی تکمیل‌شده در سامانه</div>
      </div>
      ${subs.length ? `<button class="btn btn-o btn-sm" onclick="exportChecklistCsv('${c.id}')">⤓ خروجی CSV</button>` : ''}
    </div>
    <div class="pbody">
      ${!subs.length ? '<div class="empty">هنوز هیچ ارزیابی برای این چک‌لیست ثبت نشده است. از دکمه «+ ثبت ارزیابی جدید» نخستین مورد را ثبت کنید.</div>' : `
      <div class="tbl-wrap"><table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>بخش / مورد بررسی</th>
            <th style="width:120px">امتیاز مکتسبه</th>
            <th style="width:90px">درصد انطباق</th>
            <th style="width:140px">وضعیت کیفیت</th>
            <th>ارزیاب / تکمیل‌کننده</th>
            <th style="width:130px">تاریخ ثبت</th>
            <th style="width:120px">عملیات</th>
          </tr>
        </thead>
        <tbody>${subs.map((s, idx) => {
          const pct = s.max_score ? Math.round((s.score / s.max_score) * 100) : 0;
          const isGood = pct >= 80;
          const isWarning = pct >= 65 && pct < 80;
          const isDanger = pct < 65;
          return `<tr${s.is_example ? ' class="exrow"' : ''}>
            <td>${fa(idx + 1)}</td>
            <td style="color:var(--th);font-weight:600">${esc(s.reference || '—')}${exBdg(s)}</td>
            <td>${fa(s.score || 0)} از ${fa(s.max_score || 0)}</td>
            <td><b>${fa(pct)}٪</b></td>
            <td>
              <span class="bdg ${isGood ? 'b1' : (isWarning ? 'b2' : 'b3')}">
                ${isGood ? 'انطباق مطلوب' : (isWarning ? 'نیازمند بهبود' : 'عدم انطباق - CAPA')}
              </span>
            </td>
            <td>${esc(s.submitted_by_name || '—')}</td>
            <td style="white-space:nowrap">${faDateTime(s.submitted_at)}</td>
            <td style="white-space:nowrap">
              <button class="tgl prim" onclick="openChkSubmission('${s.id}')">مشاهده</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  </div>`;
}
