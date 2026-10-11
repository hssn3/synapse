/**
 * Quality Certifications & Badges
 * Modular Frontend Component — Project 313
 */
// ==================== نشان‌ها و گواهینامه‌ها ====================
// چراغ راهنمای انقضا با همان قرارداد رنگی بقیه سامانه: b1=سبز، b2=زرد، b3=قرمز
const CERT_STATUS_FA={active:'معتبر', expired:'منقضی', pending_renewal:'در انتظار تمدید', near_expiry:'نزدیک به انقضا'};
const CERT_STATUS_BDG={active:'b1', expired:'b3', pending_renewal:'b2', near_expiry:'b2'};

let CERT={list:[], view:'list', current:null, editId:null, filters:{status:'', q:''}};
const canViewCerts = () => { const p=S.user?.permissions||[]; return p.includes('view_certifications')||p.includes('manage_certifications'); };
const canManageCerts = () => (S.user?.permissions||[]).includes('manage_certifications');

async function renderCertifications(){
  $('ptitle').textContent='نشان‌ها و گواهینامه‌ها';
  if(CERT.view==='form') return drawCertForm();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(CERT.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const {certifications}=await API.certifications(qs);
    CERT.list=certifications||[];
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(CERT.view!=='list') return;
    drawCertList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function certExpiryCell(c){
  if(!c.expiry_date) return '<span class="sub">بدون تاریخ انقضا</span>';
  const d=c.days_to_expiry;
  const note=d<0?`${fa(Math.abs(d))} روز گذشته`:`${fa(d)} روز مانده`;
  return `${faDateISO(c.expiry_date)} <span class="bdg ${CERT_STATUS_BDG[c.effective_status]||'b2'}">${note}</span>`;
}

function drawCertList(){
  const f=CERT.filters;
  const near=CERT.list.filter(c=>c.effective_status==='near_expiry'||c.effective_status==='expired').length;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">🏅</div>
      <div style="flex:1"><h3>نشان‌ها و گواهینامه‌های بیمارستان</h3>
      <div class="sub">${fa(CERT.list.length)} گواهینامه${near?` — <span style="color:var(--dn)">${fa(near)} مورد منقضی یا نزدیک به انقضا</span>`:''}</div></div>
      ${canManageCerts()?`<button class="btn btn-g btn-sm" onclick="newCert()">+ ثبت گواهینامه</button>`:''}
    </div>
    <div class="pbody">
      ${docTabs('certs')}
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>وضعیت ${help('flt_status')}</label>
          <select onchange="setCertFilter('status',this.value)">
            <option value="">همه وضعیت‌ها</option>
            ${['active','pending_renewal','expired'].map(k=>`<option value="${k}" ${f.status===k?'selected':''}>${CERT_STATUS_FA[k]}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0;flex:1.6"><label>جستجو در عنوان یا مرجع صادرکننده</label>
          <input id="cert_q" value="${esc(f.q)}" placeholder="مثال: گواهینامه ایزو"
            onkeydown="if(event.key==='Enter')setCertFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="setCertFilter('q',$('cert_q').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!CERT.list.length?'<div class="empty"><div class="ei">🏅</div>گواهینامه‌ای با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>عنوان</th><th>مرجع صادرکننده</th><th>تاریخ صدور</th><th>انقضا</th>
          <th>وضعیت</th><th>محور مرتبط</th><th>فایل</th><th>عملیات</th></tr></thead>
        <tbody>${CERT.list.map(c=>`<tr>
          <td style="color:var(--th)">${esc(c.title)}${exBdg(c)}</td>
          <td>${esc(c.issuing_body||'—')}</td>
          <td style="white-space:nowrap">${faDateISO(c.issue_date)}</td>
          <td style="white-space:nowrap">${certExpiryCell(c)}</td>
          <td><span class="bdg ${CERT_STATUS_BDG[c.effective_status]||'b2'}">${CERT_STATUS_FA[c.effective_status]||c.effective_status}</span></td>
          <td style="font-size:11px">${c.section_id?esc(fixText(c.section_title||c.section_code||'')):'—'}</td>
          <td style="white-space:nowrap">${c.file_path?`<a href="/api/certifications/${c.id}/file" target="_blank" style="color:var(--gdl)">⤓ ${esc(c.file_name||'دریافت')}</a>`:'—'}</td>
          <td style="white-space:nowrap">
            ${canManageCerts()?`<button class="tgl" onclick="editCert('${c.id}')">ویرایش</button>
            <button class="tgl" onclick="removeCert('${c.id}')">حذف</button>`:'—'}
          </td></tr>`).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setCertFilter(k,v){ CERT.filters[k]=v; CERT.view='list'; renderCertifications(); }

function newCert(){ CERT.view='form'; CERT.editId=null; CERT.current=null; drawCertForm(); }
function editCert(id){ CERT.current=CERT.list.find(x=>x.id===id)||null; CERT.editId=id; CERT.view='form'; drawCertForm(); }
function certVal(f){ return CERT.current? (CERT.current[f]||'') : ''; }

function drawCertForm(){
  const c=CERT.current;
  $('ptitle').textContent=CERT.editId?'ویرایش گواهینامه':'ثبت گواهینامه جدید';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">🏅</div>
      <div style="flex:1"><h3>${CERT.editId?'ویرایش گواهینامه':'گواهینامه جدید'}</h3>
      <div class="sub">تاریخ انقضا برای هشدار خودکار «نزدیک به انقضا» (۶۰ روز) استفاده می‌شود</div></div>
      <button class="btn btn-o btn-sm" onclick="backToCertList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      ${exBanner(c)}
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان گواهینامه / نشان *</label>
          <input id="cf2_title" value="${esc(certVal('title'))}" placeholder="مثال: گواهینامه بیمارستان دوستدار کودک"></div>
        <div class="fg"><label>مرجع صادرکننده</label>
          <input id="cf2_body" value="${esc(certVal('issuing_body'))}" placeholder="مثال: وزارت بهداشت"></div>
        <div class="fg"><label>وضعیت</label>
          <select id="cf2_status">${['active','pending_renewal','expired'].map(k=>
            `<option value="${k}" ${certVal('status')===k?'selected':''}>${CERT_STATUS_FA[k]}</option>`).join('')}</select></div>
        <div class="fg" style="grid-column:span 2"><label>محور مرتبط در درخت اعتباربخشی (اختیاری)</label>
          <select id="cf2_section">
            <option value="">— بدون اتصال به محور —</option>
            ${S.sections.map(sec=>`<optgroup label="${esc(sec.title)}">${sec.axes.map(ax=>
              `<option value="${ax.id}" ${certVal('section_id')===ax.id?'selected':''}>${esc(ax.code)} — ${esc(ax.title)}</option>`).join('')}</optgroup>`).join('')}
          </select></div>
      </div>
      <div class="docdates">
        <div class="fg" style="margin:0"><label>تاریخ صدور</label>${jalaliDateInputHtml('cf2_issue')}</div>
        <div class="fg" style="margin:0"><label>تاریخ انقضا</label>${jalaliDateInputHtml('cf2_exp')}</div>
      </div>
      <div class="fg" style="margin-top:14px"><label>توضیح (اختیاری)</label>
        <textarea id="cf2_note" rows="2">${esc(certVal('note'))}</textarea></div>
      <div class="docsec"><div class="docsl">تصویر/فایل گواهینامه (JPG/PNG/WEBP/PDF)</div>
        <div class="docsv">
          ${c&&c.file_path?`<div style="margin-bottom:6px"><a href="/api/certifications/${c.id}/file" target="_blank" style="color:var(--gdl)">⤓ ${esc(c.file_name||'فایل فعلی')}</a></div>`:''}
          <input type="file" id="cf2_file" accept=".jpg,.jpeg,.png,.webp,.pdf"></div></div>
      <div style="margin-top:12px"><button class="btn btn-g" onclick="saveCert()">ذخیره</button></div>
    </div>
  </div>`;
  if(c){ setJalaliDateInput('cf2_issue', c.issue_date); setJalaliDateInput('cf2_exp', c.expiry_date); }
  applyFieldGuides({editing:!!CERT.editId});
}
function backToCertList(){ CERT.view='list'; CERT.current=null; CERT.editId=null; renderCertifications(); }

async function saveCert(){
  const b={ title:$('cf2_title').value.trim(), issuing_body:$('cf2_body').value.trim(),
    status:$('cf2_status').value, section_id:$('cf2_section').value,
    issue_date:readJalaliDateInput('cf2_issue'), expiry_date:readJalaliDateInput('cf2_exp'),
    note:$('cf2_note').value.trim() };
  if(!b.title){ toast('عنوان گواهینامه الزامی است',true); return; }
  try{
    let id=CERT.editId;
    if(id) await API.updateCertification(id,b);
    else { const r=await API.createCertification(b); id=r.certification.id; }
    const fi=$('cf2_file');
    if(fi&&fi.files&&fi.files[0]) await API.uploadCertificationFile(id, fi.files[0]);
    toast(CERT.editId?'گواهینامه به‌روزرسانی شد':'گواهینامه ثبت شد');
    backToCertList();
  }catch(e){ toast(e.message,true); }
}
async function removeCert(id){
  if(!await BTN.confirmDanger('این گواهینامه حذف شود؟')) return;
  try{ await API.deleteCertification(id); toast('گواهینامه حذف شد'); renderCertifications(); }
  catch(e){ toast(e.message,true); }
}

