/**
 * Documents Clinical Processes Registry
 * Modular Frontend Component — Project 313
 */
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
            <span class="tsub">نسخه ${fa(p.version_no||1)} · ${revisionLabel(p.revision_no)}</span></td>
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

function drawProcKpisModal(){
  const selectedIds=new Set(PROC.kpi_ids||[]);
  const kpis=PROC.catalogKpis||[];
  const modalHtml=`
  <div id="procKpiModal" class="modal-backdrop" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px">
    <div class="modal-box" style="background:var(--bg,#fff);border-radius:12px;width:100%;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 12px 36px rgba(0,0,0,0.3);overflow:hidden">
      <div style="background:#1d4ed8;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between">
        <h3 style="margin:0;font-size:16px;font-weight:700">شاخص‌های مربوط به فرآیند</h3>
        <button type="button" onclick="closeProcKpisModal()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px;border-bottom:1px solid var(--bdr,#e2e8f0)">
        <div style="max-width:480px;margin:0 auto">
          <input type="text" id="proc_kpi_search" placeholder="نام شاخص را وارد کنید..." style="width:100%;padding:10px 16px;border-radius:24px;border:1px solid var(--bdr,#cbd5e1);text-align:center" onkeydown="if(event.key==='Enter')searchProcKpis()">
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px">
        <div class="tbl-wrap">
          <table style="width:100%;border-collapse:collapse;text-align:center;font-size:13px">
            <thead>
              <tr style="background:#2563eb;color:#fff">
                <th style="padding:10px 6px">ردیف</th>
                <th style="padding:10px 12px;text-align:right">عنوان شاخص</th>
                <th style="padding:10px 8px">نوع شاخص</th>
                <th style="padding:10px 8px">مطلوبیت شاخص</th>
                <th style="padding:10px 8px">دوره تناوب</th>
                <th style="padding:10px 8px">حد بالا</th>
                <th style="padding:10px 8px">حد پایین</th>
                <th style="padding:10px 8px">تارگت</th>
              </tr>
            </thead>
            <tbody>
              ${!kpis.length?'<tr><td colspan="8" style="padding:24px;color:var(--tsub,#64748b)">شاخصی با این عنوان یافت نشد</td></tr>':
                kpis.map((k,idx)=>{
                  const isChecked=selectedIds.has(k.id);
                  const bg=idx%2===0?'background:#fff':'background:#f8fafc';
                  return `
                    <tr style="${bg};border-bottom:1px solid var(--bdr,#f1f5f9)">
                      <td style="padding:8px 6px">
                        <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer">
                          <input type="checkbox" ${isChecked?'checked':''} onchange="toggleProcKpi('${k.id}')">
                          <span>${fa(idx+1)}</span>
                        </label>
                      </td>
                      <td style="padding:8px 12px;text-align:right;font-weight:600;color:var(--th,#0f172a)">${esc(k.title)}</td>
                      <td style="padding:8px 8px"><span class="bdg b2">${esc(k.indicator_type||'—')}</span></td>
                      <td style="padding:8px 8px"><span class="bdg b1">${esc(k.desirability||'—')}</span></td>
                      <td style="padding:8px 8px">${esc(k.measure_interval||'ماهانه')}</td>
                      <td style="padding:8px 8px">${k.upper_limit!=null?fa(k.upper_limit):'—'}</td>
                      <td style="padding:8px 8px">${k.lower_limit!=null?fa(k.lower_limit):'—'}</td>
                      <td style="padding:8px 8px;font-weight:bold">${k.target_value!=null?fa(k.target_value):'—'}</td>
                    </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--bdr,#e2e8f0);display:flex;justify-content:space-between;align-items:center;background:var(--bg2,#f8fafc)">
        <div class="sub">${fa((PROC.kpi_ids||[]).length)} شاخص انتخاب شده است</div>
        <button type="button" class="btn btn-g btn-sm" onclick="closeProcKpisModal()">تأیید و بستن</button>
      </div>
    </div>
  </div>`;
  const existing=$('procKpiModal');
  if(existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function searchProcKpis(){
  const val=$('proc_kpi_search')?$('proc_kpi_search').value.trim():'';
  openProcKpisModal(val);
}

function toggleProcKpi(id){
  PROC.kpi_ids=PROC.kpi_ids||[];
  PROC.kpis=PROC.kpis||[];
  const idx=PROC.kpi_ids.indexOf(id);
  if(idx>=0){
    PROC.kpi_ids.splice(idx,1);
    PROC.kpis=PROC.kpis.filter(k=>k.id!==id);
  }else{
    PROC.kpi_ids.push(id);
    const found=(PROC.catalogKpis||[]).find(k=>k.id===id);
    if(found) PROC.kpis.push(found);
  }
  updateSelectedKpisDisplay();
}

function removeProcKpi(id){
  PROC.kpi_ids=(PROC.kpi_ids||[]).filter(i=>i!==id);
  PROC.kpis=(PROC.kpis||[]).filter(k=>k.id!==id);
  updateSelectedKpisDisplay();
}

function updateSelectedKpisDisplay(){
  const box=$('pf_kpis_selected');
  if(!box) return;
  if(!PROC.kpis.length){
    box.innerHTML='<span class="tsub">هنوز شاخصی به این فرآیند متصل نشده است.</span>';
  }else{
    box.innerHTML=PROC.kpis.map(k=>`
      <span class="bdg b1" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px">
        ${esc(k.title)} <button type="button" onclick="removeProcKpi('${k.id}')" style="background:none;border:none;color:inherit;cursor:pointer;font-weight:bold">✕</button>
      </span>`).join('');
  }
}

function closeProcKpisModal(){
  const modal=$('procKpiModal');
  if(modal) modal.remove();
  updateSelectedKpisDisplay();
}

/* ---------- آپلود فایلِ فرآیند و ساختِ فلوچارت با هوش مصنوعی ----------
   کارفرما فایلِ PDFِ تک‌صفحه‌ایِ فرآیند را آپلود می‌کرد و انتظار داشت فلوچارت پر
   شود؛ ولی آپلودِ فرآیند تا امروز فقط «ضمیمه» بود و هیچ‌جا از مدل «گام» خواسته
   نمی‌شد. حالا مسیر /processes/extract-flowchart گام و یال برمی‌گرداند.

   نتیجه عمداً مستقیم ذخیره نمی‌شود: در همین فرم می‌نشیند تا کاربر ببیند و اصلاح
   کند، بعد با دکمه‌ی ذخیره‌ی همیشگی ثبت شود. اگر گام‌هایی از قبل هست، پرسیده
   می‌شود جایگزین شوند یا نه — وگرنه یک کلیک کارِ نیم‌ساعتِ کاربر را پاک می‌کرد. */
async function procExtractFlow(){
  const f = $('pf_aifile')?.files?.[0];
  const msg = $('pf_aimsg');
  if(!f){ if(msg) msg.textContent='اول یک فایل انتخاب کنید'; return; }
  if((PROC.steps||[]).some(s=>String(s.text||'').trim())
     && !await BTN.confirmDanger('گام‌های فعلیِ این فرآیند با نتیجه‌ی تشخیص جایگزین شوند؟')) return;
  if(msg) msg.textContent='در حال خواندن و تحلیل فایل…';
  $('pf_aiout').innerHTML='';
  try{
    const r = await API.processExtractFlow(f);
    const flow = r.flow||{};
    // شناسه‌ها به فرمتِ داخلیِ ویرایشگر بازنویسی می‌شوند تا با گام‌های دستی قاطی نشود
    const map = {};
    PROC.steps = (flow.steps||[]).map(s=>{ const id=procStepUid(); map[s.id]=id;
      return { id, step_type:s.step_type, text:s.text, owner:s.owner||'' }; });
    PROC.links = (flow.links||[]).filter(l=>map[l.from]&&map[l.to])
      .map(l=>({ uid:procStepUid(), from:map[l.from], to:map[l.to], label:l.label||'' }));
    if(flow.title && !$('pf_title').value.trim()) $('pf_title').value = flow.title;
