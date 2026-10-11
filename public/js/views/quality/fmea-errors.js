/**
 * FMEA & Medical Error Reports
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function renderFmea(){
  $('ptitle').textContent='عوامل تهدید کننده ایمنی بیمار (FMEA)';
  if(FME.view==='form') return drawFmeaForm();
  if(FME.view==='detail'&&FME.detail) return drawFmeaDetail();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(FME.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const r=await API.fmeaList(qs);
    FME.list=r.records||[];
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(FME.view!=='list') return;
    drawFmeaList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function setFmeaFilter(k,v){ FME.filters[k]=v; FME.view='list'; renderFmea(); }
function newFmea(){ FME.view='form'; drawFmeaForm(); }
function backToFmeaList(){ FME.view='list'; FME.detail=null; renderFmea(); }

function drawFmeaList(){
  const f=FME.filters;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⚑</div>
      <div style="flex:1"><h3>عوامل تهدید کننده ایمنی بیمار</h3>
      <div class="sub">${fa(FME.list.length)} فرم FMEA — تحلیل ریسکِ پیش‌نگر (خطر بالقوه، نه رخداد واقع‌شده)</div></div>
      <button class="btn btn-o btn-sm" onclick="printFmea()">${ic('print')} چاپ فهرست</button>
      ${canSubmitFmea()?`<button class="btn btn-g btn-sm" onclick="newFmea()">+ ثبت فرم FMEA</button>`:''}
    </div>
    <div class="pbody">
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>وضعیت ${help('flt_status')}</label>
          <select onchange="setFmeaFilter('status',this.value)">
            <option value="">همه وضعیت‌ها</option>
            ${Object.entries(FMEA_ST_FA).map(([k,v])=>`<option value="${k}" ${f.status===k?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0;flex:1.6"><label>جستجو در موضوع یا واحد گزارش‌دهنده</label>
          <input id="fm_q" value="${esc(f.q)}" placeholder="مثال: سقوط بیمار"
            onkeydown="if(event.key==='Enter')setFmeaFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="setFmeaFilter('q',$('fm_q').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!FME.list.length?'<div class="empty"><div class="ei">⚑</div>فرم FMEA‌ای با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>موضوع</th><th>واحد گزارش‌دهنده</th><th>حیطه خطر</th><th>دسته‌بندی</th>
          <th>منبع</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>${FME.list.map(r=>`<tr>
          <td style="color:var(--th)">${esc(r.subject)}${exBdg(r)}</td>
          <td>${esc(r.reporting_department)}</td>
          <td>${esc(r.related_hazard_area||'—')}</td>
          <td>${esc(r.hazard_type||'—')}</td>
          <td>${r.source==='public'?'فرم عمومی':'داخلی'}</td>
          <td><span class="bdg ${FMEA_ST_BDG[r.status]||'b2'}">${FMEA_ST_FA[r.status]||r.status}</span></td>
          <td style="white-space:nowrap">
            <button class="tgl" onclick="openFmea('${r.id}')">مشاهده</button>
            ${canManageFmea()?`<button class="tgl" onclick="removeFmea('${r.id}')">حذف</button>`:''}
          </td></tr>`).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}

async function openFmea(id){
  try{ const r=await API.fmea(id); FME.detail=r.record; FME.view='detail'; drawFmeaDetail(); }
  catch(e){ toast(e.message,true); }
}
function drawFmeaDetail(){
  const r=FME.detail;
  const sec=(l,v)=>`<div class="docsec"><div class="docsl">${l}</div><div class="docsv">${esc(v||'—')}</div></div>`;
  $('ptitle').textContent='FMEA — '+r.subject;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⚑</div>
      <div style="flex:1"><h3>${esc(r.subject)}</h3>
      <div class="sub">${esc(r.reporting_department)} — ${r.source==='public'?'ثبت‌شده از فرم عمومی':'ثبت داخلی'}</div></div>
      <span class="bdg ${FMEA_ST_BDG[r.status]||'b2'}">${FMEA_ST_FA[r.status]||r.status}</span>
      <button class="btn btn-o btn-sm" onclick="backToFmeaList()">◂ بازگشت</button>
    </div>
    <div class="pbody">
      ${exBanner(r)}
      ${sec('گزارش‌دهنده', r.reporter_name||'ناشناس')}
      ${sec('حیطه خطر مرتبط', r.related_hazard_area)}
      ${sec('دسته‌بندی عامل تهدیدکننده', r.hazard_type)}
      ${sec('خطرات احتمالی', r.failure_modes)}
      ${sec('علل خطا', r.root_causes)}
      ${sec('اثرات و تبعات', r.effects)}
      ${sec('اقدامات کنترلی موجود', r.existing_controls)}
      ${sec('اقدامات پیشنهادی', r.recommended_actions)}
      ${canManageFmea()?`<div class="docgrid" style="margin-top:10px">
        <div class="fg" style="margin:0"><label>وضعیت بررسی ${help('flt_status')}</label>
          <select onchange="setFmeaStatus('${r.id}',this.value)">
            ${Object.entries(FMEA_ST_FA).map(([k,v])=>`<option value="${k}" ${r.status===k?'selected':''}>${v}</option>`).join('')}
          </select></div></div>`:''}
    </div>
  </div>`;
}
async function setFmeaStatus(id,v){
  try{ await API.updateFmea(id,{status:v}); toast('وضعیت به‌روزرسانی شد'); openFmea(id); }
  catch(e){ toast(e.message,true); }
}
async function removeFmea(id){
  if(!await BTN.confirmDanger('این فرم FMEA حذف شود؟')) return;
  try{ await API.deleteFmea(id); toast('حذف شد'); backToFmeaList(); }
  catch(e){ toast(e.message,true); }
}

function drawFmeaForm(){
  $('ptitle').textContent='ثبت فرم FMEA';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⚑</div>
      <div style="flex:1"><h3>فرم عوامل تهدید کننده ایمنی بیمار</h3>
      <div class="sub">پنج ستون استاندارد FMEA — خطر بالقوه را پیش از وقوع تحلیل می‌کند</div></div>
      <button class="btn btn-o btn-sm" onclick="backToFmeaList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg"><label>نام گزارش‌دهنده (اختیاری)</label>
          <input id="fm_name" placeholder="در صورت تمایل خالی بگذارید (ناشناس)"></div>
        <div class="fg"><label>واحد گزارش‌دهنده *</label>
          <input id="fm_dept" placeholder="مثال: مدیریت خدمات پرستاری"></div>
        <div class="fg" style="grid-column:span 2"><label>موضوع *</label>
          <input id="fm_subject" placeholder="مثال: خطر سقوط بیمار در راهروی بخش"></div>
        <div class="fg"><label>حیطه خطر مرتبط</label>
          <input id="fm_area" placeholder="مثال: ایمنی محیط و تجهیزات"></div>
        <div class="fg"><label>دسته‌بندی عامل تهدیدکننده</label>
          <input id="fm_type" placeholder="مثال: فیزیکی / دارویی / فرآیندی"></div>
      </div>
      <div class="fg"><label>خطرات احتمالی *</label>
        <textarea id="fm_modes" rows="3" placeholder="چه چیزی ممکن است اشتباه پیش برود؟"></textarea></div>
      <div class="fg"><label>علل خطا *</label>
        <textarea id="fm_causes" rows="3" placeholder="چرا ممکن است این خطا رخ دهد؟"></textarea></div>
      <div class="fg"><label>اثرات و تبعات *</label>
        <textarea id="fm_effects" rows="3" placeholder="در صورت وقوع، چه پیامدی برای بیمار/سازمان دارد؟"></textarea></div>
      <div class="fg"><label>اقدامات کنترلی موجود *</label>
        <textarea id="fm_ctrl" rows="3" placeholder="هم‌اکنون چه کنترلی برای پیشگیری وجود دارد؟"></textarea></div>
      <div class="fg"><label>اقدامات پیشنهادی</label>
        <textarea id="fm_rec" rows="3" placeholder="چه اقدام اصلاحی پیشنهاد می‌کنید؟"></textarea></div>
      <div style="margin-top:12px">
        <button class="btn btn-g" onclick="saveFmea()">ثبت فرم</button>
        <button class="btn btn-o" onclick="backToFmeaList()">انصراف</button></div>
    </div>
  </div>`;
  applyFieldGuides();
}
async function saveFmea(){
  const v=id=>$(id).value.trim();
  const b={ reporter_name:v('fm_name'), reporting_department:v('fm_dept'), subject:v('fm_subject'),
    related_hazard_area:v('fm_area'), hazard_type:v('fm_type'), failure_modes:v('fm_modes'),
    root_causes:v('fm_causes'), effects:v('fm_effects'), existing_controls:v('fm_ctrl'),
    recommended_actions:v('fm_rec') };
  const req={subject:'موضوع', reporting_department:'واحد گزارش‌دهنده', failure_modes:'خطرات احتمالی',
    root_causes:'علل خطا', effects:'اثرات و تبعات', existing_controls:'اقدامات کنترلی موجود'};
  for(const [k,l] of Object.entries(req)) if(!b[k]){ toast(l+' الزامی است',true); return; }
  try{ await API.createFmea(b); toast('فرم FMEA ثبت شد'); backToFmeaList(); }
  catch(e){ toast(e.message,true); }
}

// ==================== گزارش خطا / واقعه (با تحلیل ریشه‌ای) ====================
const MER_EVAL=['در انتظار بررسی','در حال بررسی','بسته‌شده'];
const MER_EVAL_BDG={'در انتظار بررسی':'b2','در حال بررسی':'b3','بسته‌شده':'b1'};
const MER_SEVERITY=['خفیف','متوسط','شدید','بحرانی'];
let MER={list:[], view:'list', filters:{evaluation_status:''}, needsRca:false, lastCode:null};
const canManageErrors = () => (S.user?.permissions||[]).includes('manage_medical_error_reports');
const canSubmitErrors = () => { const p=S.user?.permissions||[]; return p.includes('submit_medical_error_report')||p.includes('manage_medical_error_reports'); };

async function renderErrors(){
  $('ptitle').textContent='گزارش خطا و وقایع';
  if(MER.view==='form') return drawErrForm();
  if(!canManageErrors()) { MER.view='form'; return drawErrForm(); }
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=MER.filters.evaluation_status?'evaluation_status='+encodeURIComponent(MER.filters.evaluation_status):'';
    const r=await API.medicalErrors(qs);
    MER.list=r.reports||[];
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(MER.view!=='list') return;
    drawErrList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function setErrFilter(v){ MER.filters.evaluation_status=v; renderErrors(); }
function newErrorReport(){ MER.view='form'; MER.needsRca=false; MER.lastCode=null; drawErrForm(); }
function backToErrList(){ MER.view='list'; renderErrors(); }

function drawErrList(){
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⚠</div>
      <div style="flex:1"><h3>گزارش خطا و وقایع ناخواسته</h3>
      <div class="sub">${fa(MER.list.length)} گزارش — با کد رهگیری، وضعیت بررسی و تحلیل ریشه‌ای (RCA)</div></div>
      <button class="btn btn-o btn-sm" onclick="printErrors()">${ic('print')} چاپ فهرست</button>
      ${canSubmitErrors()?`<button class="btn btn-g btn-sm" onclick="newErrorReport()">+ ثبت گزارش خطا</button>`:''}
    </div>
    <div class="pbody">
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>وضعیت بررسی ${help('flt_status')}</label>
          <select onchange="setErrFilter(this.value)">
            <option value="">همه وضعیت‌ها</option>
            ${MER_EVAL.map(v=>`<option value="${v}" ${MER.filters.evaluation_status===v?'selected':''}>${v}</option>`).join('')}
          </select></div>
      </div>
      ${!MER.list.length?'<div class="empty"><div class="ei">⚠</div>گزارشی با این فیلتر یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>کد رهگیری</th><th>شرح خطا</th><th>شدت</th><th>وضعیت بررسی</th><th>عملیات</th></tr></thead>
        <tbody>${MER.list.map(r=>{ const did=drowNext(); return `<tr>
          <td style="color:var(--gdl);white-space:nowrap">${esc(r.tracking_code||'—')}</td>
          <td style="color:var(--th)">${esc(String(r.description||'').slice(0,70))}
            <span class="tsub">${esc(r.error_ward||'بخش ثبت‌نشده')}</span></td>
          <td style="white-space:nowrap">${esc(r.severity||'—')}</td>
          <td><span class="bdg ${MER_EVAL_BDG[r.evaluation_status]||'b2'}">${esc(r.evaluation_status||'—')}</span></td>
          <td style="white-space:nowrap">${drowBtn(did)}</td></tr>
          ${drowRow(did, 5, [
            dp('بخش وقوع خطا', esc(r.error_ward||'')),
            dp('نوع اظهار', r.is_self_declaration?'خوداظهاری':'دگراظهاری'),
            dp('نیاز به تحلیل ریشه‌ای', r.needs_rca?'<span class="bdg b3">بله</span>':'خیر'),
            dp('ارجاع به دبیرخانه کمیته', r.referred_to_secretariat?'بله':'خیر'),
            dp('تحلیل ریشه‌ای (RCA)', r.needs_rca&&r.rca_text?esc(r.rca_text):''),
          ], `<label style="font-size:11.5px;color:var(--td);display:flex;align-items:center;gap:7px">تغییر وضعیت بررسی
              <select onchange="setErrStatus('${r.id}',this.value)">
                ${MER_EVAL.map(v=>`<option value="${v}" ${r.evaluation_status===v?'selected':''}>${v}</option>`).join('')}
              </select></label>`)}`;
        }).join('')}
        </tbody></table></div>`}
    </div>
  </div>`;
}
async function setErrStatus(id, v){
  try{ await API.updateMedicalError(id,{evaluation_status:v}); toast('وضعیت بررسی به‌روزرسانی شد'); renderErrors(); }
  catch(e){ toast(e.message,true); }
}

function drawErrForm(){
  const n=MER.needsRca;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⚠</div>
      <div style="flex:1"><h3>ثبت گزارش خطا / واقعه</h3>
      <div class="sub">پس از ثبت، کد رهگیری برای پیگیری به شما نمایش داده می‌شود</div></div>
      ${canManageErrors()?`<button class="btn btn-o btn-sm" onclick="backToErrList()">◂ بازگشت به فهرست</button>`:''}
    </div>
    <div class="pbody">
      ${MER.lastCode?`<div class="docsec"><div class="docsl">کد رهگیری گزارش ثبت‌شده</div>
        <div class="docsv" style="font-size:18px;color:var(--gdl)"><b>${esc(MER.lastCode)}</b></div></div>`:''}
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>شرح خطا / واقعه *</label>
          <textarea id="ef_desc" rows="3" placeholder="آنچه رخ داده است را دقیق شرح دهید"></textarea></div>
        <div class="fg"><label>بخشی که خطا در آن رخ داده است</label>
          <input id="ef_ward" placeholder="مثال: بخش جراحی زنان"></div>
        <div class="fg"><label>بخش گزارش‌دهنده</label>
          <input id="ef_dept" placeholder="مثال: مدیریت خدمات پرستاری"></div>
        <div class="fg"><label>دسته‌بندی خطا</label>
          <input id="ef_cat" placeholder="مثال: دارویی / تشخیصی / تجهیزات"></div>
        <div class="fg"><label>شدت خطا</label>
          <select id="ef_sev"><option value="">—</option>${MER_SEVERITY.map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div>
      </div>
      <div class="docgrid">
        <div class="fg" style="margin:0"><label>آیا این رویداد نیاز به تحلیل ریشه‌ای (RCA) دارد؟</label>
          <select id="ef_needs" onchange="toggleRca(this.value==='1')">
            <option value="0" ${n?'':'selected'}>خیر</option>
            <option value="1" ${n?'selected':''}>بله</option>
          </select></div>
        <div class="fg" style="margin:0"><label>ارجاع به دبیرخانه کمیته؟</label>
          <select id="ef_ref"><option value="0">خیر</option><option value="1">بله</option></select></div>
        <div class="fg" style="margin:0"><label>نوع اظهار (خوداظهاری یا دگراظهاری)</label>
          <select id="ef_self"><option value="0">دگراظهاری (خطای فرد دیگر)</option>
            <option value="1">خوداظهاری (خطای خودم)</option></select></div>
        <div class="fg" style="margin:0"><label>گزارش به‌صورت ناشناس ثبت شود؟</label>
          <select id="ef_anon"><option value="0">خیر</option><option value="1">بله</option></select></div>
      </div>
      <div class="fg" id="ef_rca_wrap" style="${n?'':'display:none'}">
        <label>متن تحلیل ریشه‌ای (RCA) *</label>
        <textarea id="ef_rca" rows="4" placeholder="علل ریشه‌ای، زنجیرهٔ رخداد و اقدامات اصلاحی پیشنهادی"></textarea></div>
      <div style="margin-top:12px"><button class="btn btn-g" onclick="saveErrorReport()">ثبت گزارش</button></div>
    </div>
  </div>`;
  applyFieldGuides();
}
function toggleRca(on){ MER.needsRca=on; const w=$('ef_rca_wrap'); if(w) w.style.display=on?'':'none'; }
async function saveErrorReport(){
  const b={ description:$('ef_desc').value.trim(), error_ward:$('ef_ward').value.trim(),
    department:$('ef_dept').value.trim(), error_category:$('ef_cat').value.trim(),
    severity:$('ef_sev').value, needs_rca:$('ef_needs').value==='1',
    referred_to_secretariat:$('ef_ref').value==='1', is_anonymous:$('ef_anon').value==='1',
    is_self_declaration:$('ef_self').value==='1',
    rca_text:$('ef_rca')?$('ef_rca').value.trim():'' };
  if(!b.description){ toast('شرح خطا الزامی است',true); return; }
  if(b.needs_rca&&!b.rca_text){ toast('در صورت نیاز به تحلیل ریشه‌ای، متن آن الزامی است',true); return; }
  try{
    const r=await API.createMedicalError(b);
    MER.lastCode=r.tracking_code;
    toast('گزارش ثبت شد — کد رهگیری: '+r.tracking_code);
    MER.needsRca=false; drawErrForm();
  }catch(e){ toast(e.message,true); }
}

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
