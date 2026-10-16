/**
 * Evidence Binder & Corrective Actions
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
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
      ${note?`<div style="margin-top:11px;padding-top:10px;border-top:1px dashed rgba(63,172,191,.25)">
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

// ==================== عدم انطباق و اقدام اصلاحی روی سنجه ====================
// سند مرجع (بخش ۹): سنجه → عدم انطباق → علت → اقدام اصلاحی → مسئول/مهلت →
// پیشرفت → مدرک → راستی‌آزمایی → تأیید/رد → بستن. دکمه‌اش فقط وقتی روی کارتِ
// سنجه ظاهر می‌شود که وضعیت «عدم انطباق» یا «انطباق نسبی» باشد — جایی که این
// چرخه واقعاً معنی دارد.
const MCA = { byMeasure:{}, colleagues:null, editing:null, newOpen:null };
const MCA_STATUS_COLOR = {
  'جدید':'var(--tm)', 'در حال بررسی':'var(--wr)', 'اقدام تعریف‌شده':'var(--wr)',
  'در حال اجرا':'var(--gd)', 'در انتظار راستی‌آزمایی':'var(--wr)',
  'ردشده':'var(--dn)', 'تأییدشده':'var(--ok)', 'بسته‌شده':'var(--ok)',
};
const MCA_NEXT = {
  'جدید':['در حال بررسی'], 'در حال بررسی':['اقدام تعریف‌شده'], 'اقدام تعریف‌شده':['در حال اجرا'],
  'در حال اجرا':['در انتظار راستی‌آزمایی'], 'در انتظار راستی‌آزمایی':['تأییدشده','ردشده'],
  'ردشده':['در حال اجرا'], 'تأییدشده':['بسته‌شده'], 'بسته‌شده':[],
};
const MCA_PRIORITIES = ['پایین','متوسط','بالا','بحرانی'];

function mcaToggle(mid){
  const e=$('mca_'+mid); if(!e) return;
  e.classList.toggle('on');
  if(e.classList.contains('on')) mcaLoad(mid);
}

async function mcaLoad(mid){
  const box=$('mcaBody_'+mid); if(!box) return;
  box.innerHTML='<div class="empty" style="padding:14px">در حال بارگذاری…</div>';
  try{
    if(!MCA.colleagues){ try{ const r=await API.colleagues(); MCA.colleagues=r.users||[]; }catch(e){ MCA.colleagues=[]; } }
    const r=await API.correctiveActions(mid);
    MCA.byMeasure[mid]=r.actions||[];
    mcaDraw(mid);
  }catch(e){ box.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}

function mcaBadge(status){
  return `<span class="bdg" style="background:transparent;border:1px solid ${MCA_STATUS_COLOR[status]||'var(--bd)'};color:${MCA_STATUS_COLOR[status]||'var(--tm)'}">${esc(status)}</span>`;
}

function mcaDraw(mid){
  const box=$('mcaBody_'+mid); if(!box) return;
  const list=MCA.byMeasure[mid]||[];
  const canRev=canReview();
  box.innerHTML=`
    ${!list.length?'<div style="font-size:11.5px;color:var(--td);margin-bottom:10px">هنوز عدم انطباقی برای این سنجه ثبت نشده است.</div>':
      list.map(a=>mcaItem(mid,a,canRev)).join('')}
    ${MCA.newOpen===mid?mcaNewForm(mid):`<button class="btn btn-o btn-sm" onclick="mcaOpenNew('${mid}')">+ ثبت عدم انطباق جدید</button>`}
  `;
}

function mcaItem(mid, a, canRev){
  const editing=MCA.editing===a.id;
  const next=MCA_NEXT[a.status]||[];
  const canAct = a.status==='ردشده' ? canRev : true; // بازگشتِ ردشده هم راستی‌آزما تصمیم می‌گیرد
  const reviewerOnly=new Set(['تأییدشده','ردشده','بسته‌شده']);
  return `<div class="mca-item">
    <div class="mca-hd">
      <b>${esc(a.title)}</b>${mcaBadge(a.status)}
      <span class="bdg" style="border-color:var(--bd);color:var(--tm)">${esc(a.priority)}</span>
      ${a.due_date?`<span class="tsub">مهلت: ${esc(a.due_date)}</span>`:''}
    </div>
    <div class="mca-meta">
      <span>مسئول: ${esc(a.responsible_name||'—')}</span>
      <span>واحد: ${esc(a.department||'—')}</span>
      <span>پیشرفت: ${fa(a.progress_percent||0)}٪</span>
    </div>
    <div class="bar" style="margin:6px 0"><i class="bf-gd" style="width:${a.progress_percent||0}%"></i></div>
    ${a.description?`<div class="mca-tx"><b>شرح:</b> ${esc(a.description)}</div>`:''}
    ${a.root_cause?`<div class="mca-tx"><b>علت:</b> ${esc(a.root_cause)}</div>`:''}
    ${a.action_text?`<div class="mca-tx"><b>اقدام اصلاحی:</b> ${esc(a.action_text)}</div>`:''}
    ${a.evidence_note?`<div class="mca-tx"><b>مدرک:</b> ${esc(a.evidence_note)}</div>`:''}
    ${a.verification_note?`<div class="mca-tx"><b>یادداشتِ راستی‌آزمایی:</b> ${esc(a.verification_note)}</div>`:''}
    <div class="mca-actions">
      ${a.status!=='بسته‌شده'&&a.status!=='تأییدشده'?`<button class="tgl" onclick="mcaEdit('${mid}','${a.id}')">${editing?'انصراف از ویرایش':'ویرایش / پیشرفت'}</button>`:''}
      ${next.filter(n=>!reviewerOnly.has(n)||canRev).map(n=>
        `<button class="tgl" onclick="mcaTransition('${mid}','${a.id}','${n}')">→ ${esc(n)}</button>`).join('')}
    </div>
    ${editing?mcaEditForm(mid,a):''}
  </div>`;
}

function mcaOpenNew(mid){ MCA.newOpen=mid; mcaDraw(mid); }
function mcaCancelNew(mid){ MCA.newOpen=null; mcaDraw(mid); }

function mcaUserOptions(sel){
  return ['<option value="">— انتخاب مسئول —</option>'].concat(
    (MCA.colleagues||[]).map(u=>`<option value="${u.id}" ${sel===u.id?'selected':''}>${esc(u.full_name)}</option>`)).join('');
}
function mcaPriorityOptions(sel){
  return MCA_PRIORITIES.map(p=>`<option value="${p}" ${sel===p?'selected':''}>${p}</option>`).join('');
}

function mcaNewForm(mid){
  return `<div class="mca-item mca-form">
    <div class="fg"><label>عنوانِ عدم انطباق *</label><input id="mcaT_${mid}" placeholder="مثال: عدم وجود صورت‌جلسه‌ی بازدید ایمنی"></div>
    <div class="fg"><label>شرح مشکل</label><textarea id="mcaD_${mid}" rows="2"></textarea></div>
    <div class="fg"><label>علتِ ریشه‌ای</label><textarea id="mcaR_${mid}" rows="2"></textarea></div>
    <div class="fg"><label>اقدام اصلاحی</label><textarea id="mcaA_${mid}" rows="2"></textarea></div>
    <div class="frow">
      <div class="fg"><label>مسئول</label><select id="mcaU_${mid}">${mcaUserOptions('')}</select></div>
      <div class="fg"><label>واحد</label><input id="mcaDept_${mid}"></div>
      <div class="fg"><label>اولویت</label><select id="mcaP_${mid}">${mcaPriorityOptions('متوسط')}</select></div>
      <div class="fg fg-date"><label>مهلت</label>${jalaliDateInputHtml('mcaDue_'+mid,{allowEmpty:true})}</div>
    </div>
    <div class="frow" style="justify-content:flex-end">
      <button class="btn btn-o btn-sm" onclick="mcaCancelNew('${mid}')">انصراف</button>
      <button class="btn btn-g btn-sm" onclick="mcaCreate('${mid}')">ثبت عدم انطباق</button>
    </div>
  </div>`;
}

async function mcaCreate(mid){
  const v=id=>{ const e=$(id); return e?e.value.trim():''; };
  const title=v('mcaT_'+mid);
  if(!title){ toast('عنوانِ عدم انطباق الزامی است',true); return; }
  try{
    await API.createCorrectiveAction(mid, {
      title, description:v('mcaD_'+mid), root_cause:v('mcaR_'+mid), action_text:v('mcaA_'+mid),
      responsible_user_id:v('mcaU_'+mid)||null, department:v('mcaDept_'+mid), priority:v('mcaP_'+mid), due_date:readJalaliDateInputOpt('mcaDue_'+mid)||null,
    });
    toast('عدم انطباق ثبت شد'); MCA.newOpen=null; await mcaLoad(mid);
  }catch(e){ toast(e.message,true); }
}

function mcaEdit(mid, aid){ MCA.editing = MCA.editing===aid ? null : aid; mcaDraw(mid); }

function mcaEditForm(mid, a){
  return `<div class="mca-form" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--bd)">
    <div class="fg"><label>شرح مشکل</label><textarea id="mcaeD_${a.id}" rows="2">${esc(a.description||'')}</textarea></div>
    <div class="fg"><label>علتِ ریشه‌ای</label><textarea id="mcaeR_${a.id}" rows="2">${esc(a.root_cause||'')}</textarea></div>
    <div class="fg"><label>اقدام اصلاحی</label><textarea id="mcaeA_${a.id}" rows="2">${esc(a.action_text||'')}</textarea></div>
    <div class="fg"><label>مدرکِ اجرا</label><textarea id="mcaeEv_${a.id}" rows="2">${esc(a.evidence_note||'')}</textarea></div>
    <div class="frow">
      <div class="fg"><label>مسئول</label><select id="mcaeU_${a.id}">${mcaUserOptions(a.responsible_user_id)}</select></div>
      <div class="fg"><label>واحد</label><input id="mcaeDept_${a.id}" value="${esc(a.department||'')}"></div>
      <div class="fg"><label>اولویت</label><select id="mcaeP_${a.id}">${mcaPriorityOptions(a.priority)}</select></div>
      <div class="fg fg-date"><label>مهلت</label>${jalaliDateInputHtml('mcaeDue_'+a.id,{allowEmpty:true,value:a.due_date})}</div>
      <div class="fg"><label>پیشرفت (٪)</label><input id="mcaePr_${a.id}" type="number" min="0" max="100" value="${a.progress_percent||0}"></div>
    </div>
    <div class="frow" style="justify-content:flex-end">
      <button class="btn btn-g btn-sm" onclick="mcaSave('${mid}','${a.id}')">ذخیره</button>
    </div>
  </div>`;
}

async function mcaSave(mid, aid){
  const v=id=>{ const e=$(id); return e?e.value.trim():''; };
  try{
    await API.updateCorrectiveAction(aid, {
      description:v('mcaeD_'+aid), root_cause:v('mcaeR_'+aid), action_text:v('mcaeA_'+aid),
      evidence_note:v('mcaeEv_'+aid), responsible_user_id:v('mcaeU_'+aid)||null,
      department:v('mcaeDept_'+aid), priority:v('mcaeP_'+aid), due_date:readJalaliDateInputOpt('mcaeDue_'+aid)||null,
      progress_percent:v('mcaePr_'+aid),
    });
    toast('ذخیره شد'); MCA.editing=null; await mcaLoad(mid);
  }catch(e){ toast(e.message,true); }
}

async function mcaTransition(mid, aid, status){
  let note=null;
  // رد یا بازگشت از ردشده بدون توضیح یعنی گم‌شدنِ اینکه چرا — سرور هم همین
  // را الزام می‌کند؛ اینجا زودتر می‌پرسیم تا کاربر دوباره فرم را پر نکند.
  if(status==='ردشده' || status==='در حال اجرا'){
    note=await BTN.prompt(status==='ردشده'?'دلیلِ رد شدن راستی‌آزمایی چیست؟':'دلیلِ بازگشت به اجرا چیست؟','');
    if(note===null) return;
  } else if(status==='تأییدشده'){
    note=await BTN.prompt('یادداشتِ راستی‌آزمایی (اختیاری):','') || null;
  }
  try{
    await API.transitionCorrectiveAction(aid, status, note);
    toast('وضعیت به «'+status+'» تغییر کرد'); await mcaLoad(mid);
  }catch(e){ toast(e.message,true); }
}

async function setSt(id, v, el){
  const prev=S.statusMap[id];
  // «غیرقابل ارزیابی» بدون دلیل ثبت نمی‌شود — سرور هم مستقل همین را الزام
  // می‌کند. دلیل را ارزیاب بیرونی می‌خواند، پس اینجا هم پرسیده می‌شود.
  let reason=null;
  if(v==='not_applicable'){
    reason=await BTN.prompt('چرا این سنجه در این مرکز قابل ارزیابی نیست؟\n'+
      'مثال: «این بیمارستان بخش دیالیز ندارد.»\n'+
      'این دلیل در خوداظهاری و برای تیم ارزیاب ثبت می‌شود.',
      S.naMap[id]||'');
    if(reason===null){ el.value=prev||'not_reviewed'; return; }   // انصراف
    reason=reason.trim();
    if(reason.length<5){ toast('دلیل باید دست‌کم ۵ نویسه باشد',true); el.value=prev||'not_reviewed'; return; }
  }
  S.statusMap[id]=v; el.className='sel '+({full_compliant:'s-f',partial:'s-p',non_compliant:'s-n',not_applicable:'s-na'}[v]||'');
  // نمایش شرطی فیلد: انتخاب وضعیت غیرمنطبق، بلافاصله کادر مستندسازی را باز می‌کند
  if((v==='partial'||v==='non_compliant') && !S.notesMap[id]){
    const box=$('n_'+id);
    if(box && !box.classList.contains('on')){ togNote(id); $('nt_'+id)?.focus(); }
  }
  try{
    await API.setStatus(id, v, S.notesMap[id]||null, reason);
    if(v==='not_applicable') S.naMap[id]=reason; else delete S.naMap[id];
    renderTree(); renderMeasures();
    toast(v==='not_applicable' ? 'غیرقابل ارزیابی ثبت شد — از مخرج امتیاز کنار گذاشته می‌شود' : 'وضعیت ثبت شد');
  }
  catch(e){ S.statusMap[id]=prev; toast(e.message,true); renderMeasures(); }
}
async function saveNote(id){
  const v=$('nt_'+id).value;
  // دلیلِ «غیرقابل ارزیابی» را هم دوباره می‌فرستیم، وگرنه ذخیره‌ی یک یادداشت
  // ساده دلیل ثبت‌شده را پاک می‌کند و سرور درخواست را رد می‌کند.
  try{ await API.setStatus(id, statusOf(id), v, S.naMap[id]||null); S.notesMap[id]=v; toast('مدرک ذخیره شد'); }
  catch(e){ toast(e.message,true); }
}

// ==================== SEARCH ====================
function onSearch(q){
  q=q.trim();
  if(!q){ renderMeasures(); return; }
  const pool=[]; myAxes().forEach(({ax})=>ax.measures.forEach(m=>pool.push({...m,_ax:ax.code})));
  const res=pool.filter(m=>(m.code||'').includes(q)||fixText(m.statement).includes(q)||fixText(m.detail_text||'').includes(q)).slice(0,60);
  $('ptitle').textContent=`جستجو: ${q}`;
  $('content').innerHTML=`<div class="panel g">
    <div class="phd"><div class="abadge">⌕</div><div><h3>${fa(res.length)} نتیجه</h3>
      <div class="sub">در محورهای در دسترس شما</div></div></div>
    <div class="pbody">${res.length?res.map(m=>mCard(m,canEditMeasure(m,m._ax))).join(''):'<div class="empty"><div class="ei">⌕</div>موردی یافت نشد</div>'}</div></div>`;
}


/* ==================== دفتر کد مدارک ====================
   صفحه‌ی مدیر اعتباربخشی. همه‌ی کدها یک‌جا، گروه‌بندی‌شده بر اساس نوع سند،
   با ویرایش درجای کد، دکمه‌ی «کد بعدی» که خودکار نام‌گذاری می‌کند، و پیش‌نمایش
   خودِ فرم بدون خروج از جدول. */
const DCODE = { data: null, loading: false, open: {} };

async function renderDocCodes(){
  $('ptitle').textContent = 'دفتر کد مدارک';
  const box = $('content');
  if(!canManageDocs()){
    box.innerHTML = '<div class="panel g"><div class="empty">این صفحه مخصوص مدیر اعتباربخشی است.</div></div>';
    return;
  }
  box.innerHTML = '<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{ DCODE.data = await API.docCodes(); }
  catch(e){ box.innerHTML = `<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; return; }
  drawDocCodes();
}
