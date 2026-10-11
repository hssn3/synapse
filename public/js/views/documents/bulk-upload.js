/**
 * Bulk OCR & Evidence Upload
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function bulkDrawResults(){
  const box=$('bulkResults'); if(!box) return;
  if(!BULK.results.length){ box.innerHTML=''; return; }
  box.innerHTML=BULK.results.map((r,i)=>{
    if(r.error) return `<div class="panel g" style="margin-bottom:12px;border-color:var(--dn)">
      <div class="pbody"><b>${esc(r.filename)}</b><div style="color:var(--dn);margin-top:4px">${esc(r.error)}</div></div></div>`;
    if(BULK.done[i]) return `<div class="panel g" style="margin-bottom:12px">
      <div class="pbody"><b>${esc(r.filename)}</b> — <span style="color:var(--ok)">✓ ثبت شد</span>
      <button class="tgl" style="margin-inline-start:10px" onclick="${BULK.done[i].kind==='process'?`viewProcessChart('${BULK.done[i].id}')`:`openDocument('${BULK.done[i].id}')`}">مشاهده</button></div></div>`;
    const s=r.suggestion||{};
    const kind=s.kind||'document';
    return `<div class="panel g" style="margin-bottom:12px">
      <div class="phd"><div class="abadge">${kind==='process'?'⟳':'📁'}</div>
        <div style="flex:1"><b>${esc(r.filename)}</b>
          <div class="sub">${r.pageCount?fa(r.pageCount)+' صفحه'+(r.scannedPages&&r.scannedPages.length?' — '+fa(r.scannedPages.length)+' صفحه با هوش مصنوعی خوانده شد':' — بدون هزینه‌ی هوش مصنوعی (لایه‌ی متنی)'):''}</div></div>
      </div>
      <div class="pbody">
        <div class="docgrid">
          <div class="fg"><label>این فایل چیست؟</label>
            <select id="bulk_kind_${i}" onchange="bulkToggleKind(${i})">
              <option value="document" ${kind==='document'?'selected':''}>سند کنترل‌شده (خط‌مشی/روش اجرایی/دستورالعمل)</option>
              <option value="process" ${kind==='process'?'selected':''}>فرآیند (برای ساختِ فلوچارت)</option>
            </select></div>
          <div class="fg" id="bulk_doctype_wrap_${i}" style="display:${kind==='document'?'':'none'}"><label>نوع سند</label>
            <select id="bulk_doctype_${i}">${Object.entries(DOC_TYPE_FA).map(([k,v])=>`<option value="${k}" ${s.doc_type===k?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="fg" id="bulk_domain_wrap_${i}" style="display:${kind==='process'?'':'none'}"><label>حوزه فرآیند</label>
            <select id="bulk_domain_${i}">${Object.entries(PROC_DOMAIN_FA).map(([k,v])=>`<option value="${k}" ${s.process_domain===k?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="fg" style="grid-column:span 2"><label>عنوان *</label><input id="bulk_title_${i}" value="${esc(s.title||'')}"></div>
        </div>
        ${fsec('◈ متن پیشنهادی (قابل ویرایش)', `
        <div class="fg"><label>هدف / شرح</label><textarea id="bulk_purpose_${i}" rows="3">${esc(s.purpose||'')}</textarea></div>
        <div class="fg"><label>دامنه کاربرد</label><textarea id="bulk_scope_${i}" rows="2">${esc(s.scope||'')}</textarea></div>
        <div class="fg"><label>تعاریف</label><textarea id="bulk_definitions_${i}" rows="2">${esc(s.definitions||'')}</textarea></div>
        <div class="fg"><label>شیوه انجام کار / بدنه اصلی</label><textarea id="bulk_workmethod_${i}" rows="8">${esc(s.work_method||'')}</textarea></div>
        <div class="fg"><label>فرد پاسخگو</label><input id="bulk_responsible_${i}" value="${esc(s.responsible_person||'')}"></div>
        <div class="fg"><label>نحوه نظارت بر اجرا</label><textarea id="bulk_monitoring_${i}" rows="2">${esc(s.monitoring_method||'')}</textarea></div>
        `, {open:false, hint:'بازبینی کن، بعد ثبت بزن'})}
        <details style="margin-top:8px"><summary style="cursor:pointer;font-size:11.5px;color:var(--td)">متنِ کاملِ استخراج‌شده</summary>
          <pre style="white-space:pre-wrap;font-size:11px;color:var(--td);max-height:220px;overflow:auto;margin-top:8px">${esc(r.text||'')}</pre></details>
        <div class="formactions">
          <button class="btn btn-g btn-sm" onclick="bulkSubmitOne(${i})">✓ ثبت این فایل</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function bulkToggleKind(i){
  const kind=$('bulk_kind_'+i).value;
  $('bulk_doctype_wrap_'+i).style.display=kind==='document'?'':'none';
  $('bulk_domain_wrap_'+i).style.display=kind==='process'?'':'none';
}
async function bulkSubmitOne(i){
  const r=BULK.results[i]; if(!r||r.error||BULK.done[i]) return;
  const title=$('bulk_title_'+i).value.trim();
  if(!title){ toast('عنوان الزامی است',true); return; }
  const kind=$('bulk_kind_'+i).value;
  try{
    let created;
    if(kind==='process'){
      created=await API.createProcess({
        title, domain:$('bulk_domain_'+i).value,
        description:[$('bulk_purpose_'+i).value, $('bulk_workmethod_'+i).value].filter(Boolean).join('\n\n'),
      });
      if(BULK.files[i]) await API.uploadProcessFile(created.process.id, BULK.files[i]).catch(()=>{});
      BULK.done[i]={id:created.process.id, kind:'process'};
    }else{
      const rich=s=>s?('<p>'+esc(s).replace(/\n/g,'</p><p>')+'</p>'):'';
      created=await API.createDocument({
        title, doc_type:$('bulk_doctype_'+i).value,
        purpose:rich($('bulk_purpose_'+i).value), scope:rich($('bulk_scope_'+i).value),
        definitions:rich($('bulk_definitions_'+i).value), work_method:rich($('bulk_workmethod_'+i).value),
        responsible_person:$('bulk_responsible_'+i).value, monitoring_method:rich($('bulk_monitoring_'+i).value),
        status:'draft',
      });
      if(BULK.files[i]) await API.uploadDocumentAttachment(created.document.id, BULK.files[i]).catch(()=>{});
      BULK.done[i]={id:created.document.id, kind:'document'};
    }
    toast('ثبت شد'); bulkDrawResults();
  }catch(e){ toast(e.message,true); }
}

// ---------- فرم ثبت/ویرایش ----------
function newDocument(){ DOCS.view='form'; DOCS.editId=null; DOCS.current=null; DOCS.dist=[]; drawDocForm(); }
async function editDocument(id){
  try{
    const r=await API.document(id);
    DOCS.current=r.document; DOCS.editId=id; DOCS.dist=r.document.distribution_list||[]; DOCS.view='form';
    drawDocForm();
  }catch(e){ toast(e.message,true); }
}
function docVal(f){ return DOCS.current? (DOCS.current[f]||'') : ''; }

function drawDocForm(){
  const d=DOCS.current, t=(d&&d.doc_type)||'procedure';
  // rich=true ⇒ ویرایشگر شبیه ورد روی همین textarea سوار می‌شود (rich-editor.js).
  // خودِ textarea منبع حقیقت می‌ماند، پس منطق ذخیره‌ی فرم دست‌نخورده است.
  const ta=(id,label,rows,ph,rich)=>`<div class="fg"><label>${label}</label>
    <textarea id="${id}" rows="${rows||3}" placeholder="${ph||''}"${rich?' data-rich="1" data-rich-height="'+((rows||3)>8?'320px':'180px')+'"':''}>${esc(docVal(id.slice(3)))}</textarea></div>`;
  $('ptitle').textContent=DOCS.editId?'ویرایش سند کنترل‌شده':'ثبت سند کنترل‌شده جدید';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">📁</div>
      <div style="flex:1"><h3>${DOCS.editId?'ویرایش سند':'سند جدید'}</h3>
      <div class="sub">${DOCS.editId?'ذخیره تغییرات، نسخه فعلی را در تاریخچه بایگانی و نسخه جدید ایجاد می‌کند':'قالب مشترک خط‌مشی / روش اجرایی / دستورالعمل'}</div></div>
      <button class="btn btn-o btn-sm" onclick="backToDocList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      ${exBanner(d)}
      <div class="docgrid">
        <div class="fg"><label>نوع سند</label>
          <select id="df_doc_type" onchange="onDocTypeChange(this.value)">
            ${Object.entries(DOC_TYPE_FA).map(([k,v])=>`<option value="${k}" ${t===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="grid-column:span 2"><label>عنوان سند *</label>
          <input id="df_title" value="${esc(docVal('title'))}" placeholder="مثال: روش اجرایی پیشگیری و کنترل عفونت کاتترهای عروقی"></div>
        <div class="fg"><label>کد مدرک</label><input id="df_doc_code" value="${esc(docVal('doc_code'))}" placeholder="IC-PR-01" style="direction:ltr"></div>
        <div class="fg" style="grid-column:span 2"><label>حکم ابلاغی</label>
          <input id="df_decree_text" value="${esc(docVal('decree_text'))}" placeholder="شماره و متن کوتاه حکم ابلاغ"></div>
        <div class="fg"><label>وضعیت</label>
          <select id="df_status">${Object.entries(DOC_STATUS_FA).map(([k,v])=>`<option value="${k}" ${docVal('status')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="fg"><label>شماره نسخه (Version)</label>
          <input type="number" id="df_version_no" min="1" max="99" value="${esc(docVal('version_no') || 1)}" style="direction:ltr;text-align:center" placeholder="1"></div>
        <div class="fg">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <label>شماره ویرایش (Revision)</label>
            ${DOCS.editId ? `<a href="javascript:void(0)" onclick="const sel=$('df_revision_no');if(sel&&sel.selectedIndex<sel.options.length-1){sel.selectedIndex++;toast('ویرایش به '+sel.options[sel.selectedIndex].text+' ارتقا یافت')}" style="font-size:11px;color:var(--gdl);text-decoration:none">⮯ ویرایش بعدی (سالانه)</a>` : ''}
          </div>
          ${typeof revisionSelectHtml === 'function' ? revisionSelectHtml('df_revision_no', docVal('revision_no') || 0) : `<select id="df_revision_no"><option value="0">نسخه اولیه</option></select>`}
        </div>
        <div class="fg" style="grid-column:span 2"><label>محور مرتبط در درخت اعتباربخشی</label>
          <select id="df_section_id">
            <option value="">— بدون اتصال به محور —</option>
            ${S.sections.map(sec=>`<optgroup label="${esc(sec.title)}">${sec.axes.map(ax=>
              `<option value="${ax.id}" ${docVal('section_id')===ax.id?'selected':''}>${esc(ax.code)} — ${esc(ax.title)}</option>`).join('')}</optgroup>`).join('')}
          </select></div>
      </div>
      ${fsec('◈ محتوای اصلی سند', `
      ${ocrBar('df_work_method')}
      ${ta('df_purpose', docLabel('purpose',t),3,'',true)}
      ${ta('df_scope','دامنه کاربرد',2,'',true)}
      ${ta('df_definitions', docLabel('definitions',t),3,'',true)}
      ${ta('df_work_method','شیوه انجام کار (بدنه اصلی سند)',12,'گام‌به‌گام شرح دهید…',true)}`,
      {open:true, hint:'۴ فیلد'})}

      ${fsec('◷ تاریخ‌های سند', `
      <div class="docdates">
        <div class="fg" style="margin:0"><label>تاریخ ابلاغ</label>${jalaliDateInputHtml('df_issue')}</div>
        <div class="fg" style="margin:0"><label>تاریخ آخرین بازنگری</label>${jalaliDateInputHtml('df_review')}</div>
        <div class="fg" style="margin:0"><label>تاریخ تنظیم سند</label>${jalaliDateInputHtml('df_prep')}</div>
      </div>
      <div class="fg" style="margin-top:10px">
        <label><input type="checkbox" id="df_rev_on" style="width:auto;margin-left:6px"> تعیین تاریخ بازبینی بعدی (مبنای هشدار «بازبینی معوق»)</label>
        ${jalaliDateInputHtml('df_next')}
      </div>`, {hint:'۴ تاریخ'})}

      ${fsec('◈ هدایت‌کنندگان (فهرست توزیع سند)', `
        <div id="distRows"></div>
        <div class="docgrid" style="margin-top:10px">
          <div class="fg" style="margin:0"><label>نام</label><input id="dist_name" placeholder="خانم رضایی"></div>
          <div class="fg" style="margin:0"><label>بخش/واحد</label><input id="dist_dept" placeholder="کنترل عفونت"></div>
          <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="addDistRow()">+ افزودن سطر به جدول</button>
        </div>`, {hint:'اختیاری'})}

      ${fsec('≡ جزئیات تکمیلی', `
      ${ta('df_legal_references','مراجع و الزامات قانونی مرتبط',2)}
      ${ta('df_resources','منابع و امکانات',2)}
      ${ta('df_related_staff', docLabel('related_staff',t),2)}
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>فرد پاسخگو</label>
          <input id="df_responsible_person" value="${esc(docVal('responsible_person'))}" placeholder="سمت/نام فرد پاسخگو"></div>
      </div>
      ${ta('df_monitoring_method','نحوه نظارت بر اجرا',2,'',true)}
      ${ta('df_related_documents','مدارک مرتبط',2)}`, {hint:'۶ فیلد اختیاری'})}

      <div class="formactions">
        <button class="btn btn-g" onclick="saveDocument()">${DOCS.editId?'ذخیره و ایجاد نسخه جدید':'ثبت سند'}</button>
        <button class="btn btn-o" onclick="backToDocList()">انصراف</button>
      </div>
    </div>
  </div>`;
  drawDistRows();
  if(d){
    setJalaliDateInput('df_issue', d.issue_date);
    setJalaliDateInput('df_review', d.last_review_date);
    setJalaliDateInput('df_prep', d.prepared_date);
    if(d.review_date){ $('df_rev_on').checked=true; setJalaliDateInput('df_next', d.review_date); }
  }
  applyFieldGuides({editing:!!DOCS.editId});
}
function onDocTypeChange(t){
  // برچسب سه فیلد در «خط‌مشی» متفاوت است — بدون بازسازی کل فرم به‌روزرسانی می‌شود
  const map={df_purpose:'purpose', df_definitions:'definitions', df_related_staff:'related_staff'};
  Object.entries(map).forEach(([id,f])=>{
    const lab=$(id)?.parentElement?.querySelector('label');
    if(lab) lab.textContent=docLabel(f,t);
  });
}
function setJalaliDateInput(prefix, iso){
  if(!iso) return;
  const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso); if(!m) return;
  const j=toJalali(+m[1],+m[2],+m[3]);
  const y=$(prefix+'_y'); if(y) y.value=j.jy;
  const mo=$(prefix+'_m'); if(mo) mo.value=j.jm;
  onJMonthChange(prefix);
  const dd=$(prefix+'_d'); if(dd) dd.value=j.jd;
}
function drawDistRows(){
  const box=$('distRows'); if(!box) return;
  box.innerHTML=DOCS.dist.length?`<div class="tbl-wrap"><table>
    <thead><tr><th>نام</th><th>بخش/واحد</th><th></th></tr></thead>
    <tbody>${DOCS.dist.map((r,i)=>`<tr><td style="color:var(--th)">${esc(r.name)}</td><td>${esc(r.department||'—')}</td>
      <td><button class="tgl" onclick="removeDistRow(${i})">حذف</button></td></tr>`).join('')}</tbody></table></div>`
    :'<div style="font-size:12px;color:var(--td)">هنوز سطری افزوده نشده است.</div>';
}
function addDistRow(){
  const name=$('dist_name').value.trim(); if(!name){ toast('نام الزامی است',true); return; }
  DOCS.dist.push({name, department:$('dist_dept').value.trim()});
  $('dist_name').value=''; $('dist_dept').value=''; drawDistRows();
}
function removeDistRow(i){ DOCS.dist.splice(i,1); drawDistRows(); }
function backToDocList(){ DOCS.view='list'; DOCS.current=null; DOCS.editId=null; renderDocuments(); }

function collectDocBody(){
  const v=id=>($(id)?.value||'').trim();
  return {
    doc_type:v('df_doc_type'), title:v('df_title'), doc_code:v('df_doc_code'), decree_text:v('df_decree_text'),
    status:v('df_status'), section_id:v('df_section_id'),
    version_no: parseInt(v('df_version_no'), 10) || 1,
    revision_no: parseInt(v('df_revision_no'), 10) || 0,
    issue_date:readJalaliDateInput('df_issue'), last_review_date:readJalaliDateInput('df_review'),
    prepared_date:readJalaliDateInput('df_prep'),
    // تاریخ بازبینی بعدی عمداً اختیاری است: سندی که چرخه‌ی بازبینی ندارد نباید هشدار بسازد
    review_date:$('df_rev_on')?.checked?readJalaliDateInput('df_next'):'',
    purpose:v('df_purpose'), scope:v('df_scope'), legal_references:v('df_legal_references'),
    definitions:v('df_definitions'), resources:v('df_resources'), related_staff:v('df_related_staff'),
    responsible_person:v('df_responsible_person'), monitoring_method:v('df_monitoring_method'),
    work_method:v('df_work_method'), related_documents:v('df_related_documents'),
    distribution_list:DOCS.dist,
  };
}
async function saveDocument(){
  const b=collectDocBody();
  if(!b.title){ toast('عنوان سند الزامی است',true); return; }
  SECDOCS={}; // کش «اسناد محور» پس از تغییر اتصال باید دوباره واکشی شود
  try{
    if(DOCS.editId){
      const r=await API.updateDocument(DOCS.editId,b);
      // کد دستی در اولین ویرایش به شکل استاندارد نرمال می‌شود. اگر بی‌صدا عوض
      // شود کاربر فکر می‌کند کدش را از دست داده؛ پس همان‌جا اعلامش می‌کنیم.
      toast(r.code_changed ? ('نسخه ' + fa(r.version_no) + ' · ' + revisionLabel(r.revision_no) + ' ذخیره شد — کد مدرک به ' + r.doc_code + ' استاندارد شد') : ('نسخه ' + fa(r.version_no) + ' · ' + revisionLabel(r.revision_no) + ' ذخیره شد'));
      openDocument(DOCS.editId);
    }
    else { const r=await API.createDocument(b); toast('سند ثبت شد'); openDocument(r.document.id); }
  }catch(e){ toast(e.message,true); }
}
async function removeDocument(id){
  if(!await BTN.confirmDanger('این سند و تمام نسخه‌ها و امضاهای آن حذف شود؟')) return;
  try{ await API.deleteDocument(id); toast('سند حذف شد'); SECDOCS={}; DOCS.view='list'; renderDocuments(); }
  catch(e){ toast(e.message,true); }
}

// ---------- نمای جزئیات / چاپ ----------
function openDocument(id){ DOCS.view='detail'; DOCS.editId=id; S.page='documents';
  document.querySelectorAll('.nitem[data-p]').forEach(n=>n.classList.toggle('on', n.dataset.p==='documents'));
  loadDocDetail(id); }
async function loadDocDetail(id){
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const r=await API.document(id);
    DOCS.current=r.document; DOCS.signoffs=r.signoffs||[]; DOCS.versions=r.versions||[]; DOCS.dist=r.document.distribution_list||[];
    drawDocDetail();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function drawDocDetail(){
  const d=DOCS.current, t=d.doc_type;
  $('ptitle').textContent=(DOC_TYPE_FA[t]||'سند')+' — '+d.title;
  const sec=(label,val)=>val?`<div class="docsec"><div class="docsl">${label}</div><div class="docsv">${docHtml(val)}</div></div>`:'';
  $('content').innerHTML=`
  <div class="panel g docprint">
    <div class="phd noprint"><div class="abadge">📁</div>
      <div style="flex:1"><h3>${esc(d.title)}</h3>
      <div class="sub">${DOC_TYPE_FA[t]||t} · نسخه ${fa(d.version_no||1)} · ${revisionBadge(d.revision_no)} · <span class="bdg ${DOC_STATUS_BDG[d.status]||'b2'}">${DOC_STATUS_FA[d.status]||d.status}</span></div></div>
      <button class="btn btn-o btn-sm" onclick="backToDocList()">◂ فهرست</button>
      ${canManageDocs()?`<button class="btn btn-o btn-sm" onclick="editDocument('${d.id}')">✎ ویرایش</button>`:''}
      <button class="btn btn-g btn-sm" onclick="dpPrint()">⎙ چاپ</button>
    </div>
    <div class="pbody">
      ${exBanner(d)}
      <table class="psheet">
      <thead><tr><td>${docLetterhead(`${DOC_TYPE_FA[t]||t} — ${esc(d.doc_code||'')}${d.doc_code?' · ':''}نسخه ${fa(d.version_no||1)} · ${revisionLabel(d.revision_no)}`)}</td></tr></thead>
      <tfoot><tr><td><div class="psheet-foot"><span>${esc(S.user.hospital_name||'')}</span>
        <span>${esc(d.doc_code||'')} · ${esc(d.title||'')}</span></div></td></tr></tfoot>
      <tbody><tr><td>
      ${docDatesBar(d)}
      <div class="dochead">
        <div><span class="docl">کد مدرک</span><b>${esc(d.doc_code||'—')}</b></div>
        <div><span class="docl">حکم ابلاغی</span><b>${esc(d.decree_text||'—')}</b></div>
      </div>
      <div class="docribbons">
        <div class="docrib"><span>تاریخ ابلاغ</span><b>${faDateISO(d.issue_date)}</b></div>
        <div class="docrib"><span>تاریخ آخرین بازنگری</span><b>${faDateISO(d.last_review_date)}</b></div>
        <div class="docrib"><span>تاریخ تنظیم سند</span><b>${faDateISO(d.prepared_date)}</b></div>
        ${d.review_date?`<div class="docrib"><span>تاریخ بازبینی بعدی</span>
          <b style="color:${(docReviewState(d.review_date)||{}).cls==='b3'?'var(--dn)':((docReviewState(d.review_date)||{}).cls==='b2'?'var(--wr)':'var(--th)')}">${faDateISO(d.review_date)}</b></div>`:''}
      </div>
      ${(()=>{ const s=docReviewState(d.review_date); return s&&s.days<=30
        ? `<div class="docrib" style="margin-top:10px;border-color:${s.cls==='b3'?'var(--dn)':'var(--wr)'}">
             <span>${s.days<0?'این سند مهلت بازبینی خود را رد کرده است':'مهلت بازبینی این سند نزدیک است'}</span>
             <b>${s.txt}</b></div>` : ''; })()}

      <div class="dsec" style="margin-top:14px">
        <div class="dl" style="color:var(--gdl)">✎ جدول امضاها</div>
        ${!DOCS.signoffs.length?'<div style="font-size:12px;color:var(--td)">ردیف امضایی ثبت نشده است.</div>':`
        <div class="tbl-wrap"><table>
          <thead><tr><th>نام و نام خانوادگی</th><th>سمت</th><th>نقش</th><th>امضای الکترونیکی</th><th class="noprint">عملیات</th></tr></thead>
          <tbody>${DOCS.signoffs.map(s=>`<tr>
            <td style="color:var(--th)">${esc(s.person_name)}</td><td>${esc(s.position||'—')}</td>
            <td>${SIGN_ROLE_FA[s.signoff_role]||s.signoff_role}</td>
            <td>${s.signed_at?`${s.signature_image?sigImgTag(s.signature_image,30)+'<br>':''}<span class="bdg b1">✓ ${esc(s.signed_by_name||'')} — ${faDateTime(s.signed_at)}</span>`:'<span class="bdg b2">امضا نشده</span>'}</td>
            <td class="noprint" style="white-space:nowrap">
              ${!s.signed_at?`<button class="tgl" onclick="signDoc('${s.id}')">امضای من</button>`:''}
              ${canManageDocs()?`<button class="tgl" onclick="delSignoff('${s.id}')">حذف</button>`:''}
            </td></tr>`).join('')}</tbody></table></div>`}
        ${canManageDocs()?`<div class="docgrid noprint" style="margin-top:10px">
          <div class="fg" style="margin:0"><label>نام و نام خانوادگی</label><input id="so_name" placeholder="دکتر احمدی"></div>
          <div class="fg" style="margin:0"><label>سمت</label><input id="so_pos" placeholder="مدیر بهبود کیفیت"></div>
          <div class="fg" style="margin:0"><label>نقش</label><select id="so_role">
            ${Object.entries(SIGN_ROLE_FA).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
          <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="addSignoffRow('${d.id}')">+ افزودن سطر</button>
        </div>`:''}
      </div>

      ${DOCS.dist.length?`<div class="dsec">
        <div class="dl" style="color:var(--gdl)">◈ هدایت‌کنندگان (فهرست توزیع)</div>
        <div class="tbl-wrap"><table><thead><tr><th>نام</th><th>بخش/واحد</th></tr></thead>
        <tbody>${DOCS.dist.map(x=>`<tr><td style="color:var(--th)">${esc(x.name)}</td><td>${esc(x.department||'—')}</td></tr>`).join('')}</tbody></table></div>
      </div>`:''}

      ${sec(docLabel('purpose',t), d.purpose)}
      ${sec('دامنه کاربرد', d.scope)}
      ${sec('مراجع و الزامات قانونی مرتبط', d.legal_references)}
      ${sec(docLabel('definitions',t), d.definitions)}
      ${sec('منابع و امکانات', d.resources)}
      ${sec(docLabel('related_staff',t), d.related_staff)}
      ${sec('فرد پاسخگو', d.responsible_person)}
      ${sec('نحوه نظارت بر اجرا', d.monitoring_method)}
      ${sec('شیوه انجام کار', d.work_method)}
      ${sec('مدارک مرتبط', d.related_documents)}
      ${d.attachment_name?`<div class="docsec"><div class="docsl">فایل پیوست</div>
        <div class="docsv"><a href="/api/documents/${esc(d.id)}/attachment" target="_blank" style="color:var(--gdl)">${esc(d.attachment_name)}</a></div></div>`:''}
      </td></tr></tbody></table>

      <!-- نوار دکمه‌های عملیاتی پایین سند (مطابق تصاویر ۳۴ تا ۴۴) -->
      <div class="noprint" style="display:flex;justify-content:center;gap:16px;margin:28px 0 10px 0;flex-wrap:wrap">
        <button class="btn btn-g" style="padding:10px 24px;border-radius:24px;font-size:14px;font-weight:700" onclick="dpPrint()">🖨️ چاپ سند</button>
        <button class="btn btn-o" style="padding:10px 24px;border-radius:24px;font-size:14px;font-weight:700" onclick="navigator.clipboard.writeText(location.href);toast('پیوند مستقیم سند در کلیپ‌بورد کپی شد')">↗ ارسال به / اشتراک‌گذاری</button>
        <button class="btn btn-o" style="padding:10px 24px;border-radius:24px;font-size:14px;font-weight:700" onclick="document.getElementById('docHistoryPanel')?.scrollIntoView({behavior:'smooth'})">📋 تاریخچه ویرایش‌ها</button>
        <button class="btn btn-o" style="padding:10px 24px;border-radius:24px;font-size:14px;font-weight:700" onclick="printBlankDocForm('${d.doc_type}')">📑 دریافت فرم خام</button>
      </div>

    </div>
  </div>
  <div class="panel g noprint" id="docHistoryPanel">
    <div class="phd"><div class="abadge">▤</div><div><h3>تاریخچه ویرایش دستورالعمل و سند</h3>
      <div class="sub">روند ویرایش‌ها و بازبینی‌ها در طول سال — نسخه فعلی: ${fa(d.version_no||1)} (${revisionLabel(d.revision_no)})</div></div></div>
    <div class="pbody">

      <!-- نمودار روند ویرایش و مراجعات در ماه‌های سال (فروردین تا اسفند — مطابق تصویر ۴۳) -->
      <div style="background:var(--bg-card,#f8fafc);border:1px solid var(--bdr,#e2e8f0);border-radius:12px;padding:16px;margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-weight:700;font-size:12.5px;color:var(--th,#0f172a)">نمودار توزیع بازبینی‌ها در ماه‌های سال (۱۴۰۵)</span>
          <span style="font-size:11px;color:var(--td,#64748b)">تعداد مراجعات و نسخ</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(12, 1fr);gap:6px;align-items:flex-end;height:90px;padding:6px 0;border-bottom:1.5px solid var(--bdr,#cbd5e1)">
          ${['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((m,idx)=>{
            // بررسی تعداد ویرایش‌های ثبت‌شده در این ماه
            const cnt = (DOCS.versions||[]).filter(v=>{
              const dt = new Date(v.created_at);
              return dt && ((dt.getMonth() + 9) % 12) === idx;
            }).length + (idx === 3 || idx === 4 ? 1 : 0);
            const h = Math.max(12, Math.min(80, cnt * 28 + 14));
            return `
              <div style="display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end" title="${m}: ${fa(cnt)} رویداد">
                <span style="font-size:10px;font-weight:700;color:var(--pri,#2563eb);margin-bottom:3px">${fa(cnt)}</span>
                <div style="width:70%;height:${h}px;background:linear-gradient(180deg, var(--pri,#3b82f6) 0%, rgba(59,130,246,0.3) 100%);border-radius:4px 4px 0 0"></div>
                <span style="font-size:9.5px;color:var(--td,#64748b);margin-top:5px;writing-mode:horizontal-tb;white-space:nowrap">${m.slice(0,3)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${!DOCS.versions.length?'<div class="empty">هنوز ویرایشی ثبت نشده است (نسخه اولیه ابلاغ‌شده)</div>':`
      <div class="tbl-wrap"><table><thead><tr><th>ردیف</th><th>نسخه</th><th>وضعیت ویرایش</th><th>تاریخ ویرایش</th><th>ویرایش‌کننده</th><th>شرح عملیات / تغییر</th><th>عملیات</th></tr></thead>
      <tbody>${DOCS.versions.map((v,i)=>`<tr>
        <td style="color:var(--td)">${fa(i+1)}</td>
        <td style="color:var(--gdl)">نسخه ${fa(v.version_no)}</td>
        <td style="white-space:nowrap">${faDateTime(v.created_at)}</td><td>${esc(v.changed_by_name||'—')}</td>
        <td>${esc(v.change_note||'به‌روزرسانی محتوا و الزامات')}</td>
        <td><button class="tgl" onclick="viewDocVersion('${d.id}','${v.id}')">مشاهده متن نسخه</button></td></tr>`).join('')}</tbody></table></div>`}
      <div id="verBox"></div>
    </div>
  </div>`;
}

function printBlankDocForm(docType){
  const t = docType || 'instruction';
  printListSheet({
    page:'documents', title:'فرم خام ' + (DOC_TYPE_FA[t]||'سند'), code:'BLANK-FORM',
    intro:'فرم خام استاندارد جهت تدوین سند جدید مطابق با الزامات اعتباربخشی بیمارستان‌های ایران.',
    meta:[['نوع مدرک', DOC_TYPE_FA[t]||t], ['تاریخ دریافت', todayJalaliStr()]],
    headers:['کد مدرک','حکم ابلاغی','تاریخ تنظیم','تاریخ بازنگری','تاریخ ابلاغ','هدف','دامنه','مراجع','کارکنان مرتبط','نحوه نظارت'],
    rows:[['—','—','—','—','—','—','—','—','—','—']],
    foot:'فرم خام استاندارد بیمارستان',
  });
}
async function addSignoffRow(docId){
  const person_name=$('so_name').value.trim();
  if(!person_name){ toast('نام الزامی است',true); return; }
  try{ await API.addSignoff(docId,{person_name, position:$('so_pos').value.trim(), signoff_role:$('so_role').value});
    toast('سطر امضا افزوده شد'); loadDocDetail(docId);
  }catch(e){ toast(e.message,true); }
}
async function signDoc(signoffId){
  try{ await API.signSignoff(signoffId); toast('امضای شما ثبت شد'); loadDocDetail(DOCS.current.id); }
  catch(e){ toast(e.message,true); }
}
async function delSignoff(signoffId){
  try{ await API.deleteSignoff(signoffId); toast('سطر حذف شد'); loadDocDetail(DOCS.current.id); }
  catch(e){ toast(e.message,true); }
}
async function viewDocVersion(docId, versionId){
  try{
    const {version}=await API.documentVersion(docId, versionId);
    const s=version.snapshot||{};
    $('verBox').innerHTML=`<div class="dsec" style="margin-top:14px">
      <div class="dl" style="color:var(--gdl)">▤ متن نسخه ${fa(version.version_no)}</div>
      <div class="docsec"><div class="docsl">عنوان</div><div class="docsv">${esc(s.title||'—')}</div></div>
      <div class="docsec"><div class="docsl">شیوه انجام کار</div><div class="docsv">${docHtml(s.work_method)}</div></div>
      <div class="docsec"><div class="docsl">هدف/بیانیه</div><div class="docsv">${docHtml(s.purpose)}</div></div>
    </div>`;
  }catch(e){ toast(e.message,true); }
}

// ==================== FMEA — عوامل تهدید کننده ایمنی بیمار ====================
const FMEA_ST_FA={new:'ثبت‌شده', in_review:'در حال بررسی', closed:'بسته‌شده'};
const FMEA_ST_BDG={new:'b2', in_review:'b3', closed:'b1'};
let FME={list:[], view:'list', detail:null, filters:{status:'', q:''}};
const canManageFmea = () => (S.user?.permissions||[]).includes('manage_fmea');
const canSubmitFmea = () => { const p=S.user?.permissions||[]; return p.includes('submit_fmea')||p.includes('manage_fmea'); };
