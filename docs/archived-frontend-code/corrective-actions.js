/**
 * Accreditation Corrective Actions
 * Modular Frontend Component — Project 313
 */
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

