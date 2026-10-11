/**
 * Accreditation Evidence Binder
 * Modular Frontend Component — Project 313
 */
// ==================== پرونده‌ی الکترونیکی شواهد (مشترک بین ماژول‌ها) ====================
// چرا اینجا و نه در هر ماژول جدا: تا پیش از این «شواهد» فقط یک متن آزاد بود که کاربر در آن
// *محل نگهداری* مدرک کاغذی را می‌نوشت. حالا خودِ مدرک در سامانه بارگذاری می‌شود. همین یک
// کامپوننت روی سنجه، حسابرسی داخلی و مصوبه‌ی واکراند سوار می‌شود (روت مشترک /evidence/…).
function evidenceBox(type, id, editable){
  const k = type + '_' + id;
  return `<div class="evbox" id="evb_${k}" data-evtype="${type}" data-evid="${esc(id)}">
    <div class="evlist" id="evl_${k}"><span style="font-size:10.5px;color:var(--td)">در حال بارگذاری فایل‌ها…</span></div>
    ${editable?`<div class="evup">
      <input type="file" id="evf_${k}" accept="image/jpeg,image/png,image/webp,application/pdf" style="font-size:10.5px;color:var(--tm)">
      <button class="btn btn-o btn-sm" onclick="uploadEvidence('${type}','${id}')">⭱ بارگذاری فایل مدرک</button>
      <span style="font-size:10px;color:var(--td)">JPG/PNG/WEBP/PDF — حداکثر ۵ مگابایت</span>
    </div>`:''}
  </div>`;
}
// فایل‌ها بعد از رندر شدن DOM واکشی می‌شوند (تا mCard همچنان یک تابع رشته‌ساز بماند)
async function loadEvidence(type, id){
  const box=$('evl_'+type+'_'+id); if(!box) return;
  try{
    const {files}=await API.evidenceFiles(type,id);
    box.innerHTML = files.length ? files.map(f=>`<div class="evfile">
        <a href="${API.evidenceDownloadUrl(f.id)}" target="_blank">⇩ ${esc(f.file_name||'فایل')}</a>
        ${f.title?`<span class="evft">${esc(f.title)}</span>`:''}
        <span class="evfm">${fa(Math.max(1,Math.round((f.file_size_bytes||0)/1024)))} کیلوبایت · ${esc(f.uploaded_by_name||'')}</span>
        <button class="tgl" onclick="deleteEvidence('${type}','${id}','${f.id}')" title="حذف فایل" aria-label="حذف فایل">✕</button>
      </div>`).join('')
      : `<div style="font-size:10.5px;color:var(--wr)">هنوز هیچ مدرکی بارگذاری نشده — بدون فایل، ${type==='measure'?'این سنجه':'این رکورد'} در روز ارزیابی مستند محسوب نمی‌شود.</div>`;
  }catch(e){ box.innerHTML=`<span style="font-size:10.5px;color:var(--dn)">${esc(e.message)}</span>`; }
}
// همه‌ی کادرهای شواهدِ داخل صفحه‌ی جاری را یک‌جا پر می‌کند
function loadAllEvidence(){
  document.querySelectorAll('.evbox').forEach(el=>loadEvidence(el.dataset.evtype, el.dataset.evid));
}
async function uploadEvidence(type, id){
  const fi=$('evf_'+type+'_'+id);
  if(!fi||!fi.files||!fi.files[0]) return toast('ابتدا فایل را انتخاب کنید', true);
  const title = $('nt_'+id) ? $('nt_'+id).value.slice(0,120) : '';
  try{ await API.uploadEvidenceFile(type, id, fi.files[0], title); fi.value=''; toast('مدرک بارگذاری شد'); loadEvidence(type,id); }
  catch(e){ toast(e.message,true); }
}
async function deleteEvidence(type, id, fileId){
  if(!await BTN.confirmDanger('این فایل مدرک حذف شود؟')) return;
  try{ await API.deleteEvidenceFile(fileId); toast('فایل حذف شد'); loadEvidence(type,id); }
  catch(e){ toast(e.message,true); }
}

// سه قضاوت روی یک سنجه، در یک ردیف: خودارزیابی (بالا، در mctl)، و اینجا
// نمره‌ی ارزیاب داخلی دانشگاه و ارزیاب بیرونی وزارت. اگر کاربر مجوز
// approve_measure_status نداشته باشد فقط می‌بیندشان.
const canReview = () => (S.user?.permissions||[]).includes('approve_measure_status');
const REV_FA = {'':'—', non_compliant:'عدم انطباق', partial:'انطباق نسبی',
                full_compliant:'انطباق کامل', not_applicable:'غیرقابل ارزیابی'};
const REV_CLS = {non_compliant:'s-n', partial:'s-p', full_compliant:'s-f', not_applicable:'s-na'};
function revOpts(v){
  return ['','non_compliant','partial','full_compliant','not_applicable']
    .map(k=>`<option value="${k}" ${v===k?'selected':''}>${k===''?'ثبت‌نشده':REV_FA[k]}</option>`).join('');
}
function reviewRow(m){
  const r=S.revMap[m.id]||{i:'',e:''};
  const mine=statusOf(m.id);
  // اختلاف فقط وقتی معنا دارد که هر دو نمره‌ی مقایسه‌پذیر باشند
  const rank={non_compliant:0,partial:1,full_compliant:2};
  const other=r.e||r.i, gap=(rank[mine]!==undefined&&rank[other]!==undefined&&rank[mine]!==rank[other])
    ? (rank[mine]>rank[other]?'over':'under') : null;
  const one=(kind,label,val)=>canReview()
    ? `<label class="rev-f"><span>${label}</span>
        <select class="sel sm ${REV_CLS[val]||''}" onchange="setRev('${kind}','${m.id}',this.value,this)">${revOpts(val)}</select></label>`
    : `<span class="rev-ro"><span>${label}</span><b>${REV_FA[val]||'—'}</b></span>`;
  if(!canReview() && !r.i && !r.e) return '';   // چیزی برای نشان دادن نیست
  return `<div class="revrow">
    ${one('internal','ارزیابی داخلی دانشگاه', r.i)}
    ${one('external','ارزیابی بیرونی وزارت', r.e)}
    ${gap?`<span class="rev-gap ${gap}">${gap==='over'
      ? 'خودارزیابی از نمره‌ی ارزیاب بالاتر است'
      : 'ارزیاب نمره‌ی بالاتری داده است'}</span>`:''}
  </div>`;
}
async function setRev(kind, id, v, el){
  const prev=(S.revMap[id]||{})[kind==='internal'?'i':'e']||'';
  const cur=S.revMap[id]||{i:'',e:''};
  cur[kind==='internal'?'i':'e']=v; S.revMap[id]=cur;
  el.className='sel sm '+(REV_CLS[v]||'');
  try{
    await API.setReview(kind, id, v===''?null:v, null);
    renderMeasures();
    toast(v==='' ? 'نمره‌ی ارزیاب پاک شد' : 'نمره‌ی ارزیاب ثبت شد');
  }catch(e){
    cur[kind==='internal'?'i':'e']=prev; toast(e.message,true); renderMeasures();
  }
}

// روش ارزیابی: مستندات همیشه هست؛ مشاهده و مصاحبه قابل تغییرند. اگر مقدار
// هنوز حدسِ سامانه باشد (eval_source='inferred') صریح گفته می‌شود — کاربر
// باید بداند کجا با یک استنتاج طرف است و کجا با تأییدِ آدم.
function evalMethodRow(m){
  // S.sections کپیِ گره‌های درخت را نگه می‌دارد، پس تغییر روی S.byId به کارت
  // نمی‌رسد. مثل statusMap/naMap، یک نقشه‌ی سبکِ همپوشان نگه می‌داریم که بر
  // مقدار آمده از سرور اولویت دارد.
  const ov=S.evalMap[m.id];
  const obs=ov?ov.obs:(m.eval_obs?1:0);
  const itv=ov?ov.itv:(m.eval_itv?1:0);
  const inferred=(ov?ov.src:(m.eval_source||'inferred'))!=='confirmed';
  const chip=(on,label)=>`<span class="evm ${on?'on':''}">${on?'✓':'○'} ${label}</span>`;
  const editable=canManageDocs();
  return `<div class="evmrow">
    <span class="evm-l">روش ارزیابی ارزیاب:</span>
    ${chip(1,'بررسی مستندات')}
    ${editable
      ? `<label class="evm tgl-chip ${obs?'on':''}">
           <input type="checkbox" ${obs?'checked':''} onchange="setEvalM('${m.id}',this)" data-k="obs"> مشاهده‌ی میدانی</label>
         <label class="evm tgl-chip ${itv?'on':''}">
           <input type="checkbox" ${itv?'checked':''} onchange="setEvalM('${m.id}',this)" data-k="itv"> مصاحبه</label>`
      : `${chip(obs,'مشاهده‌ی میدانی')}${chip(itv,'مصاحبه')}`}
    ${inferred?`<span class="evm-src">حدسِ سامانه از متن سنجه${editable?' — با تیک زدن تأیید/اصلاحش کنید':''}</span>`
              :`<span class="evm-src ok">تأییدشده</span>`}
  </div>`;
}
async function setEvalM(id, el){
  const card=el.closest('.mcard');
  const obs=card.querySelector('input[data-k="obs"]')?.checked?1:0;
  const itv=card.querySelector('input[data-k="itv"]')?.checked?1:0;
  try{
    await API.setEvalMethod(id, obs, itv);
    S.evalMap[id]={obs, itv, src:'confirmed'};
    const node=S.byId&&S.byId[id];
    if(node){ node.eval_obs=obs; node.eval_itv=itv; node.eval_source='confirmed'; }
    toast('روش ارزیابی این سنجه ثبت شد');
    renderMeasures();
  }catch(e){ el.checked=!el.checked; toast(e.message,true); }
}

function mCard(m, editable){
  const s=statusOf(m.id), lvl=m.measure_level||1;
  const {acts,note}=parseGuide(m.detail_text||'');
  const ev=evidenceOf((m.statement||'')+' '+(m.detail_text||''));
  const sel={full_compliant:'s-f',partial:'s-p',non_compliant:'s-n',not_applicable:'s-na'}[s]||'';
  const role=ROLE_FA[m.responsible_role]||'—';
  const pageNum = m.page ? fa(m.page) : '—';
  
  return `<div class="mcard luxury-mcard" id="mcard_${m.id}">
    <!-- ۱. نوار فراداده و استناد رسمی سنجه طبق کتاب ملی وزارت بهداشت -->
    <div class="mcard-header-bar">
      <div class="mcard-id-cluster">
        <span class="mc-badge">${esc(m.code)}</span>
        <span class="bdg b${lvl}">سطح ${fa(lvl)}</span>${help('level')}
        ${m.patient_safety_flag?`<span class="bdg bsf">✦ ایمنی بیمار</span>`:''}
        <span class="bdg brole">${esc(role)}</span>${help('role')}
      </div>
      <div class="mcard-ref-cluster">
        <span class="acc-book-pill">📖 کتاب استانداردهای ملی اعتباربخشی <b>صفحه ${pageNum}</b></span>
      </div>
    </div>

    <!-- ۲. شرح رسمی سنجه -->
    <div class="mst luxury-mst">${esc(fixText(m.statement))}</div>
    ${statusOf(m.id)==='not_applicable'?`<div class="na-note">${ic('info')||'◇'}
      <div><b>غیرقابل ارزیابی در این مرکز</b><span>${esc(S.naMap[m.id]||'دلیلی ثبت نشده')}</span></div></div>`:''}

    <!-- ۳. بلوک یکپارچه ارزیابی و قضاوت سنجه (Evaluation Zone) -->
    <div class="mcard-eval-zone">
      <div class="eval-primary-row">
        <div class="eval-status-box">
          <span class="eval-label">وضعیت خوداظهاری:</span>
          ${editable?`<select class="sel sel-lg ${sel}" onchange="setSt('${m.id}',this.value,this)">
            <option value="not_reviewed" ${s==='not_reviewed'?'selected':''}>○ بررسی‌نشده</option>
            <option value="non_compliant" ${s==='non_compliant'?'selected':''}>✕ عدم انطباق</option>
            <option value="partial" ${s==='partial'?'selected':''}>◐ انطباق نسبی</option>
            <option value="full_compliant" ${s==='full_compliant'?'selected':''}>✓ انطباق کامل</option>
            <option value="not_applicable" ${s==='not_applicable'?'selected':''}>— غیرقابل ارزیابی</option>
          </select>${help('status')}`
          :`<span class="lockmsg">🔒 تکمیل بر عهده «${esc(role)}» است</span>`}
        </div>
        <div class="eval-action-btns">
          ${editable?`<button type="button" class="btn-mcard-action btn-mcard-evidence" onclick="togNote('${m.id}')">
            <span class="action-icon">✎</span>
            <span>ثبت مدارک و شواهد الکترونیکی</span>
          </button>${help('note')}`:''}
          ${(s==='non_compliant'||s==='partial')?`<button type="button" class="btn-mcard-action btn-mcard-capa" onclick="mcaToggle('${m.id}')">
            <span class="action-icon">⚑</span>
            <span>عدم انطباق و اقدام اصلاحی (CAPA)</span>
          </button>`:''}
        </div>
      </div>
      ${reviewRow(m)}
    </div>

    <!-- ۴. نوار استاندارد صدور اسناد اعتباربخشی (Standard Issuance Strip) -->
    <div class="mcard-doc-strip">
      <div class="doc-strip-label">
        <span class="doc-strip-ic">⚡</span>
        <span>صدور اسناد استاندارد سنجه:</span>
      </div>
      <div class="acc-doc-gen-btns">
        <button type="button" class="btn-doc-gen policy" onclick="event.stopPropagation(); openAccStandardDoc('policy', '${esc(m.code)}')">
          <span class="btn-ic">📝</span>
          <span class="btn-text">صدور فرم خط‌مشی (Policy)</span>
        </button>
        <button type="button" class="btn-doc-gen instruction" onclick="event.stopPropagation(); openAccStandardDoc('instruction', '${esc(m.code)}')">
          <span class="btn-ic">📋</span>
          <span class="btn-text">صدور دستورالعمل اجرایی</span>
        </button>
        <button type="button" class="btn-doc-gen sop" onclick="event.stopPropagation(); openAccStandardDoc('sop', '${esc(m.code)}')">
          <span class="btn-ic">⚙️</span>
          <span class="btn-text">صدور روش اجرایی (SOP)</span>
        </button>
      </div>
    </div>

    <!-- ۵. نوار راهنماها و استناد به کتاب ملی (Reference Strip) -->
    <div class="mcard-ref-strip">
      <button type="button" class="btn-mcard-ref guide" onclick="tog('g_${m.id}')">
        <span class="ref-ic">◈</span>
        <span>راهنمای اقدامات الزامی و مدارک کتاب</span>
      </button>
      <button type="button" class="btn-mcard-ref book" onclick="tog('b_${m.id}')">
        <span class="ref-ic">▤</span>
        <span>متن کامل کتاب استانداردهای اعتباربخشی (ص. ${pageNum})</span>
      </button>
    </div>

    <!-- بخش‌های بازشونده (Drops) -->
    <div class="drop" id="g_${m.id}"><div class="dsec guide">
      <div class="dl">◈ اقدامات و مدارک الزامی طبق کتاب ملی اعتباربخشی ${help('evidence')} <span class="acc-book-page-pill" style="float:left">ص. ${pageNum}</span></div>
      ${acts.length?`<ul class="acts">${acts.map(a=>`<li>
        <span class="acc-doc-type-badge ${detectDocType(a)}">${docTypeLabel(a)}</span>
        <span>${esc(a)}</span>
        <span style="font-size:10px;color:var(--gd);margin-right:8px">【مستند کتاب: ص. ${pageNum}】</span>
      </li>`).join('')}</ul>`
        :'<div style="font-size:11.5px;color:var(--td)">فهرست اقدام مجزا ثبت نشده — به متن اصلی کتاب مراجعه کنید.</div>'}
      ${note?`<div style="margin-top:11px;padding-top:10px;border-top:1px dashed rgba(63,191,143,.25)">
        <div style="font-size:10px;color:var(--ok);font-weight:700;margin-bottom:6px">شرط احراز — توضیح تکمیلی کتاب (ص. ${pageNum})</div>
        <div style="font-size:11.5px;line-height:1.9;color:var(--tm)">${esc(note)}</div></div>`:''}
      ${evalMethodRow(m)}
      <div class="evrow"><span style="font-size:10px;color:var(--td);align-self:center">مدارک مورد انتظار بازرس وزارت بهداشت:</span>
        ${ev.map(e=>`<span class="ev">${e}</span>`).join('')}</div>
    </div></div>
    <div class="drop" id="b_${m.id}"><div class="dsec book">
      <div class="dl">▤ عین متن رسمی کتاب استانداردهای اعتباربخشی (صفحه ${pageNum}) ${help('book')}</div>
      <div class="booktext">${esc(fixText(m.detail_text)||'در حال بارگذاری متن کامل کتاب…')}</div></div></div>
    <div class="drop" id="n_${m.id}"><div class="dsec">
      <div class="dl" style="color:var(--gdl)">✎ پرونده شواهد و مدرک الکترونیکی سنجه ${esc(m.code)} ${help('note')}</div>
      ${evidenceBox('measure', m.id, editable)}
      <div style="font-size:10px;color:var(--td);margin:12px 0 5px">توضیح سند (شماره و تاریخ ابلاغ، مسئول اجرا، انطباق با صفحه ${pageNum} کتاب):</div>
      <textarea rows="3" id="nt_${m.id}" placeholder="مثال: خط‌مشی شماره ۱۲ مورخ ۱۴۰۳/۰۲/۱۵ — تصویر سند امضاشده بالا بارگذاری شد — مطابق با صفحه ${pageNum} کتاب اعتباربخشی"
        style="width:100%;padding:10px 13px;border-radius:9px;background:var(--subpanel-2);border:1px solid var(--bd);color:var(--th);font-family:inherit;font-size:11.5px">${esc(S.notesMap[m.id]||'')}</textarea>
      <button class="btn btn-g btn-sm" style="margin-top:9px" onclick="saveNote('${m.id}')">ذخیره توضیح</button>
    </div></div>
    <div class="drop" id="mca_${m.id}"><div class="dsec">
      <div class="dl" style="color:var(--gdl)">⚑ عدم انطباق و اقدام اصلاحی (CAPA)</div>
      <div id="mcaBody_${m.id}"><div class="empty" style="padding:14px">در حال بارگذاری…</div></div>
    </div></div>
  </div>`;
}
function tog(id){ const e=$(id); if(e) e.classList.toggle('on'); }
// کادر «ثبت مدرک» — فایل‌های شواهد فقط هنگام باز شدن واکشی می‌شوند (نه برای هر ۱۰۰ سنجه‌ی صفحه)
const __evLoaded = {};
function togNote(id){
  const e=$('n_'+id); if(!e) return;
  e.classList.toggle('on');
  if(e.classList.contains('on') && !__evLoaded['measure_'+id]){ __evLoaded['measure_'+id]=1; loadEvidence('measure', id); }
}

