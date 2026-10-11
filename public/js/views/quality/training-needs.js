/**
 * Training Needs Assessment
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function saveStrategicWizardData(finalize){
  saveStrategicWizardCurrentStepInputs();
  localStorage.setItem('strat_wizard_data_' + (S.hospitalId||'default'), JSON.stringify(STRAT_WIZARD.data));
  if(finalize){
    toast('برنامه استراتژیک ۸ مرحله‌ای با موفقیت تصویب و ذخیره شد');
    closeStrategicWizardModal();
    renderPrograms();
  } else {
    toast('اطلاعات پیش‌نویس ذخیره شد');
  }
}

function closeStrategicWizardModal(){
  const el = $('stratModalWrap');
  if(el) el.remove();
}

// ==================== نیازسنجی آموزشی (کاربر → مافوق → سازمان) ====================
// سه تب = سه نمای همان جدول training_needs، دقیقاً مثل سه آدرس رقیب
// (/nr/education/{user,superior,supervisor}). تب‌های ۲ و ۳ فقط برای دارندگان مجوز دیده می‌شوند.
let TRN={list:[], tab:'mine', view:'list', current:null, editId:null,
         canReview:false, canApprove:false, colleagues:[], filters:{q:'', department:''}};
const canReviewTraining = () => (S.user?.permissions||[]).includes('review_training_needs');
const canApproveTraining = () => (S.user?.permissions||[]).includes('approve_training');
const TRN_TYPES=['عمومی','اختصاصی','خارج از فهرست'];
const TRN_STATUS_FA={'ثبت_شده':'در انتظار نظر مافوق','بررسی_مافوق':'در انتظار تأیید سازمان','تأییدشده':'تأیید نهایی شده','رد_شده':'رد شده'};
const TRN_STATUS_BDG={'ثبت_شده':'b2','بررسی_مافوق':'b2','تأییدشده':'b1','رد_شده':'b3'};
// کاتالوگ نمونه — عناوین واقعی استخراج‌شده از کرال رقیب (docs/HASSAN_ANALYSIS_V4.md بند ۲)
const TRN_CATALOG=['اصول اولیه اطفاء حریق','مدیریت خطر و بلایا','اصول پایه کنترل عفونت',
  'ارتقاء مهارت‌های رفتاری و ارتباطی','تکنیک تحلیل ریشه‌ای وقایع و FMEA','شاخص‌ها و جمع‌آوری داده‌ها',
  'آموزش بهداشت دست','استانداردهای اعتباربخشی و سنجه‌خوانی','مروری بر اصول اعتباربخشی',
  'آشنایی با اصول ممیزی بالینی','ملاحظات قانونی در پرستاری','اصول اولیه ارگونومی','تغذیه سالم',
  'بهداشت محیط و پسماندها','آموزش تدوین صحیح روش اجرایی و خط‌مشی (ویژه مسئولین)'];

function trnTabs(){
  const t=[{k:'mine', t:'درخواست‌های من'}];
  if(canReviewTraining()) t.push({k:'superior', t:'در انتظار نظر من (مافوق)'});
  if(canApproveTraining()) t.push({k:'org', t:'تأیید نهایی سازمان'});
  t.push({k:'all', t:'همهٔ نیازسنجی‌ها'});
  return t;
}

async function renderTraining(){
  $('ptitle').textContent='نیازسنجی آموزشی';
  if(TRN.view==='form') return drawTrnForm();
  if(!trnTabs().some(x=>x.k===TRN.tab)) TRN.tab='mine';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const parts=[];
    if(TRN.tab!=='all') parts.push('stage='+TRN.tab);
    for(const [k,v] of Object.entries(TRN.filters)) if(v) parts.push(k+'='+encodeURIComponent(v));
    const r=await API.trainingNeeds(parts.join('&'));
    TRN.list=r.needs||[]; TRN.canReview=!!r.can_review; TRN.canApprove=!!r.can_approve;
    drawTrnList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function trnSubtitle(){
  if(TRN.tab==='superior') return 'همکاران شما نیاز آموزشی خود را ثبت کرده‌اند — نظر خود را به‌عنوان مافوق ثبت کنید';
  if(TRN.tab==='org') return 'تأیید نهایی نیازهای آموزشی کل سازمان پس از تأیید مافوق';
  if(TRN.tab==='all') return 'همهٔ نیازسنجی‌های ثبت‌شده در این بیمارستان';
  return 'نیاز آموزشی خود را ثبت کنید تا ابتدا مافوق و سپس دفتر آموزش سازمان دربارهٔ آن نظر بدهند';
}

function drawTrnList(){
  const f=TRN.filters;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">🎓</div>
      <div style="flex:1"><h3>نیازسنجی آموزشی</h3>
      <div class="sub">${fa(TRN.list.length)} مورد — ${trnSubtitle()}</div></div>
      <button class="btn btn-o btn-sm" onclick="printTraining()">${ic('print')} چاپ فهرست</button>
      <button class="btn btn-g btn-sm" onclick="newTrainingNeed()">+ ثبت نیاز آموزشی</button>
    </div>
    <div class="pbody">
      <div class="doctabs">
        ${trnTabs().map(t=>`<button class="btn btn-sm ${TRN.tab===t.k?'btn-g':'btn-o'}" onclick="setTrnTab('${t.k}')">${t.t}</button>`).join('')}
      </div>
      <div class="docfilters">
        <div class="fg" style="margin:0"><label>بخش/واحد</label>
          <input id="trn_dept" value="${esc(f.department)}" placeholder="مثال: بلوک زایمان"
            onkeydown="if(event.key==='Enter')setTrnFilter('department',this.value)"></div>
        <div class="fg" style="margin:0;flex:1.4"><label>جستجو در عنوان یا شرح</label>
          <input id="trn_q" value="${esc(f.q)}" placeholder="مثال: کنترل عفونت"
            onkeydown="if(event.key==='Enter')setTrnFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px"
          onclick="setTrnFilter('department',$('trn_dept').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!TRN.list.length?'<div class="empty"><div class="ei">🎓</div>نیاز آموزشی‌ای در این نما یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>عنوان نیاز آموزشی</th><th>نوع</th><th>درخواست‌دهنده</th><th>مافوق</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>${TRN.list.map(n=>{ const did=drowNext();
          const editable=n.employee_id===S.user?.id&&n.status==='ثبت_شده';
          const reviewable=TRN.canReview&&n.status==='ثبت_شده'&&(!n.superior_id||n.superior_id===S.user?.id);
          const finalable=TRN.canApprove&&n.status==='بررسی_مافوق';
          return `<tr>
          <td style="color:var(--th)">${esc(n.title)}
            <span class="tsub">${esc(n.department||'بخش ثبت‌نشده')} — سال ${fa(n.year||'')}</span></td>
          <td><span class="bdg b2">${esc(n.requested_course_type||'—')}</span></td>
          <td style="white-space:nowrap">${esc(n.employee_name||'—')}</td>
          <td style="white-space:nowrap">${esc(n.superior_name||'تعیین‌نشده')}</td>
          <td><span class="bdg ${TRN_STATUS_BDG[n.status]||'b2'}">${TRN_STATUS_FA[n.status]||n.status}</span></td>
          <td style="white-space:nowrap">
            ${reviewable?`<button class="tgl prim" onclick="decideTrn('${n.id}','superior','تأیید')">تأیید مافوق</button>
              <button class="tgl dngr" onclick="decideTrn('${n.id}','superior','رد')">رد</button>`:''}
            ${finalable?`<button class="tgl prim" onclick="decideTrn('${n.id}','org','تأیید')">تأیید نهایی</button>
              <button class="tgl dngr" onclick="decideTrn('${n.id}','org','رد')">رد نهایی</button>`:''}
            ${drowBtn(did)}
          </td></tr>
          ${drowRow(did, 6, [
            dp('شرح و دلیل نیاز', esc(n.description||'—')),
            dp('گروه شغلی', esc(n.job_group||'—')),
            dp('تاریخ ثبت', n.created_at?faDateTime(n.created_at):'—'),
            dp('نظر مافوق', n.superior_decision?`${esc(n.superior_decision)} — ${esc(n.superior_comment||'بدون توضیح')}`:'در انتظار'),
            dp('تاریخ بررسی مافوق', n.superior_reviewed_at?faDateTime(n.superior_reviewed_at):'—'),
            dp('تصمیم سازمان', n.org_decision?`${esc(n.org_decision)} — ${esc(n.org_comment||'بدون توضیح')}`:'در انتظار'),
            dp('تصمیم‌گیرندهٔ نهایی', esc(n.decided_by_name||'—')),
            dp('تاریخ تصمیم نهایی', n.decided_at?faDateTime(n.decided_at):'—'),
          ], `${editable?`<button class="tgl prim" onclick="editTrainingNeed('${n.id}')">ویرایش</button> <button class="tgl dngr" onclick="removeTrainingNeed('${n.id}')">حذف</button>`:''}`)}`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setTrnTab(k){ TRN.tab=k; TRN.view='list'; renderTraining(); }
function setTrnFilter(k,v){
  TRN.filters[k]=v;
  if($('trn_q')) TRN.filters.q=$('trn_q').value;
  TRN.view='list'; renderTraining();
}
function newTrainingNeed(){ TRN.view='form'; TRN.editId=null; TRN.current=null; drawTrnForm(); }
async function editTrainingNeed(id){
  try{ const r=await API.trainingNeed(id); TRN.current=r.need; TRN.editId=id; TRN.view='form'; drawTrnForm(); }
  catch(e){ toast(e.message,true); }
}
function backToTrnList(){ TRN.view='list'; TRN.current=null; TRN.editId=null; renderTraining(); }
function trnVal(f){ return TRN.current? (TRN.current[f]??'') : ''; }

function drawTrnForm(){
  $('ptitle').textContent=TRN.editId?'ویرایش نیاز آموزشی':'ثبت نیاز آموزشی';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">🎓</div>
      <div style="flex:1"><h3>${TRN.editId?'ویرایش نیاز آموزشی':'ثبت نیاز آموزشی'}</h3>
      <div class="sub">پس از ثبت، ابتدا مافوق شما نظر می‌دهد و سپس دفتر آموزش سازمان تصمیم نهایی را می‌گیرد</div></div>
      <button class="btn btn-o btn-sm" onclick="backToTrnList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان نیاز آموزشی *</label>
          <input id="tf_title" list="tf_catalog" value="${esc(trnVal('title'))}" placeholder="از فهرست انتخاب کنید یا عنوان تازه بنویسید">
          <datalist id="tf_catalog">${TRN_CATALOG.map(t=>`<option value="${esc(t)}"></option>`).join('')}</datalist></div>
        <div class="fg"><label>نوع دوره</label>
          <select id="tf_type">${TRN_TYPES.map(t=>`<option value="${t}" ${(trnVal('requested_course_type')||'عمومی')===t?'selected':''}>${t}</option>`).join('')}</select></div>
        <div class="fg"><label>سال (شمسی)</label>
          <input id="tf_year" value="${esc(trnVal('year')||'')}" placeholder="مثال: ۱۴۰۵"></div>
        <div class="fg"><label>بخش/واحد</label>
          <input id="tf_dept" list="tf_dept_list" value="${esc(trnVal('department')||S.user?.department||'')}" placeholder="مثال: اتاق عمل">
          <datalist id="tf_dept_list"></datalist></div>
        <div class="fg"><label>گروه شغلی</label>
          <input id="tf_group" list="tf_group_list" value="${esc(trnVal('job_group'))}" placeholder="مثال: بهبود کیفیت">
          <datalist id="tf_group_list"></datalist></div>
        <div class="fg" style="grid-column:span 2"><label>مافوق (بررسی‌کنندهٔ مرحله دوم)</label>
          <select id="tf_superior">
            <option value="">— تعیین‌نشده (به کارتابل همهٔ سرپرستان می‌رود) —</option>
            ${TRN.colleagues.map(u=>`<option value="${u.id}"${trnVal('superior_id')===u.id?' selected':''}>${esc(u.full_name)}${u.department?' — '+esc(u.department):''}</option>`).join('')}
          </select></div>
      </div>
      <div class="fg" style="margin-top:12px"><label>شرح — چرا این آموزش لازم است؟</label>
        <textarea id="tf_desc" rows="4" placeholder="شکاف مهارتی، الزام سنجه یا رویدادی که این نیاز را ایجاد کرده است">${esc(trnVal('description'))}</textarea></div>
      <div style="margin-top:14px"><button class="btn btn-g" onclick="saveTrainingNeed()">${TRN.editId?'ذخیره تغییرات':'ثبت نیاز آموزشی'}</button></div>
    </div>
  </div>`;
  fillOrgDatalist('tf_dept_list','unit');
  fillOrgDatalist('tf_group_list','job_group');
  // فهرست همکاران فقط یک‌بار گرفته می‌شود (پرچم جدا از طول آرایه تا حلقه‌ی بی‌پایان رخ ندهد)
  if(!TRN.colleaguesLoaded){
    TRN.colleaguesLoaded=true;
    API.colleagues().then(r=>{ TRN.colleagues=r.users||[]; if(TRN.view==='form'&&$('tf_superior')) drawTrnForm(); }).catch(()=>{});
  }
}

async function saveTrainingNeed(){
  const b={ title:$('tf_title').value.trim(), requested_course_type:$('tf_type').value,
    // ارقام فارسی/عربی سال به لاتین تبدیل می‌شوند تا سرور بتواند آن را عدد بخواند
    year:$('tf_year').value.trim().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)),
    department:$('tf_dept').value.trim(),
    job_group:$('tf_group').value.trim(), description:$('tf_desc').value.trim(),
    superior_id:$('tf_superior').value||null };
  if(!b.title){ toast('عنوان نیاز آموزشی الزامی است',true); return; }
  try{
    if(TRN.editId){ await API.updateTrainingNeed(TRN.editId,b); toast('نیاز آموزشی به‌روزرسانی شد'); }
    else { await API.createTrainingNeed(b); toast('نیاز آموزشی ثبت شد و برای نظر مافوق ارسال گردید'); }
    backToTrnList();
  }catch(e){ toast(e.message,true); }
}

async function decideTrn(id, stage, decision){
  const label=stage==='superior'
    ? (decision==='تأیید'?'نظر مافوق (اختیاری):':'دلیل رد توسط مافوق (اختیاری):')
    : (decision==='تأیید'?'نظر نهایی سازمان (اختیاری):':'دلیل رد نهایی (اختیاری):');
  const note=await BTN.prompt(label,'');
  if(note===null) return;
  try{
    if(stage==='superior') await API.superiorReviewTraining(id,{superior_decision:decision, superior_comment:note});
    else await API.finalDecideTraining(id,{org_decision:decision, org_comment:note});
    toast(decision==='تأیید'?'تأیید ثبت شد':'رد ثبت شد');
    renderTraining();
  }catch(e){ toast(e.message,true); }
}
async function removeTrainingNeed(id){
  if(!await BTN.confirmDanger('این نیاز آموزشی حذف شود؟')) return;
  try{ await API.deleteTrainingNeed(id); toast('حذف شد'); renderTraining(); }
  catch(e){ toast(e.message,true); }
}

// ==================== کارت امتیازی متوازن (BSC) ====================
// شاخص‌ها همان hospital_kpis هستند؛ اینجا فقط بر اساس «وجه» گروه می‌شوند و
// ۱۲ خانه‌ی ماه شمسی می‌گیرند. رنگ هر خانه از مقایسه‌ی مقدار با تارگت می‌آید
// (سرور قضاوت می‌کند تا جهت مطلوب شاخص — کمتر بهتر / بیشتر بهتر — رعایت شود).
// ==================== نتایج نظرسنجی رضایت بیمار (برای مدیر بهبود کیفیت) ====================
// ساختار محورها/سوال‌ها اینجا هاردکد است ولی هم‌شکل با satisfaction-public.html و SAT_SECTIONS سمت سرور؛
// نقطه‌ی تمدید آینده: این آبجکت می‌تواند بعداً از یک جدول DB (قابل‌ویرایش توسط سوپرادمین) بیاید بدون تغییر ساختار مصرف‌کننده‌ها.
const SURVEY_SECTIONS = [
  { key:'admission', title:'پذیرش بیمارستان', qs:['طرز برخورد پرسنل پذیرش','ارائه آموزش‌های لازم بدو پذیرش'] },
  { key:'medical', title:'کادر پزشکی', qs:['طرز برخورد و پاسخگویی پزشکان','ارائه آموزش‌های لازم در طول درمان و ترخیص توسط پزشک','حفظ حریم شما هنگام معاینه پزشکی'] },
  { key:'nursing', title:'کادر پرستاری', qs:['طرز برخورد و پاسخگویی پرسنل پرستاری','میزان رسیدگی پرستاران و ارائه خدمات','ارائه اطلاعات مراقبت از خود توسط پرستار','حفظ حریم شما هنگام مراقبت پرستاری'] },
  { key:'nutrition', title:'تغذیه', qs:['کیفیت غذا','ساعت توزیع غذا','طرز برخورد مسئول توزیع غذا'] },
  { key:'discharge', title:'ترخیص و صندوق', qs:['سرعت انجام ترخیص','راهنمایی امور بیمه‌گری','پرداخت هزینه فقط در صندوق','طرز برخورد پرسنل صندوق و ترخیص'] },
  { key:'facilities', title:'امکانات رفاهی', qs:['آرامش در بخش (سر و صدا، نور و…)','وضعیت تهویه اتاق‌ها','وضعیت بهداشتی و نظافتی','علائم راهنما'] },
];
const canViewSatisfactionResults = () => (S.user?.permissions||[]).includes('view_all_dashboards');
const canViewFollowup = () => (S.user?.permissions||[]).some(p=>['view_patient_followup','manage_patient_followup','view_all_dashboards'].includes(p));
const canManageFollowup = () => (S.user?.permissions||[]).includes('manage_patient_followup');
// preset: بازه‌ی آماده (روز/هفته/ماه) یا 'custom' برای بازه‌ی دستی شمسی.
// kind: نوعِ نمودارِ توزیع. detail: شناسه‌ی پاسخی که پروفایلش باز است.
let SATR = { data:null, preset:'', kind:'bar', detail:null };

// بازه‌های آماده، به تاریخ میلادیِ ISO که سرور می‌خواهد. مبنا «امروز» است و
// بازه‌ها گذشته‌نگرند: «هفتگی» یعنی هفت روزِ گذشته، نه هفته‌ی تقویمی — مدیر
// معمولاً «همین اواخر» را می‌خواهد نه «از شنبه تا امروز».
const SATR_PRESETS = {
  day:   { label:'امروز',        days:0 },
  week:  { label:'۷ روز اخیر',   days:6 },
  month: { label:'۳۰ روز اخیر',  days:29 },
  q:     { label:'۳ ماه اخیر',   days:89 },
  year:  { label:'یک سال اخیر',  days:364 },
};
function satrPresetRange(k){
  const p=SATR_PRESETS[k]; if(!p) return null;
  const to=new Date();
  const from=new Date(to.getTime() - p.days*86400000);
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return { from:iso(from), to:iso(to) };
}
function satrPreset(k){
  SATR.preset = (SATR.preset===k) ? '' : k;
  SATR.noFilter = !SATR.preset;
  loadSatisfactionResults();
}
function satrKind(k){ SATR.kind=k; drawSatisfactionResults(); }
async function renderSatisfactionResults(){
  $('ptitle').textContent='نتایج نظرسنجی رضایت بیمار';
  // روی گوشی فیلتر تاریخ جمع‌شده باز می‌شود. باز بودنش دو ردیف انتخابگر سه‌تایی و
  // دو دکمه بود که تقریباً کل ارتفاع صفحه‌ی یک موبایل را می‌گرفت و کاربر پیش از
  // دیدن حتی یک نتیجه باید از کنارش رد می‌شد — گزارش کاربر: «روی موبایل خوب
  // نتیجه نداد». روی دسکتاپ که جا هست، مثل قبل باز می‌ماند.
  const narrow = (window.matchMedia && window.matchMedia('(max-width:768px)').matches);
  $('content').innerHTML=`<div class="panel g gold satr-filter${narrow?' collapsed':''}" id="satrFilter">
    <div class="phd"><b>بازه‌ی تاریخی</b>
      <button type="button" class="tgl satr-ftgl" onclick="toggleSatisfactionFilter()">
        <span class="satr-ftgl-open">نمایش فیلتر</span><span class="satr-ftgl-close">بستن فیلتر</span></button></div>
    <div class="pbody satr-fbody" style="padding:16px 20px;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
      <div style="flex:1 1 100%">
        <label style="display:block;font-size:12px;color:var(--td);margin-bottom:7px">بازه‌ی آماده</label>
        <div class="pathbar" style="margin:0">
          ${Object.entries(SATR_PRESETS).map(([k,p])=>
            `<button type="button" class="tgl ${SATR.preset===k?'on':''}" onclick="satrPreset('${k}')">${esc(p.label)}</button>`).join('')}
        </div>
      </div>
      <div class="fg" style="min-width:220px;margin-bottom:0"><label>از تاریخ</label>${jalaliDateInputHtml('sr_from')}</div>
      <div class="fg" style="min-width:220px;margin-bottom:0"><label>تا تاریخ</label>${jalaliDateInputHtml('sr_to')}</div>
      <button type="button" class="btn-g" style="position:relative;overflow:hidden;padding:10px 22px;border:none;border-radius:12px;font-weight:800;font-size:12.5px;cursor:pointer" onclick="loadSatisfactionResults()">اعمال فیلتر</button>
      <button type="button" class="tgl" onclick="clearSatisfactionResultsFilter()">همه‌ی بازه‌ها</button>
    </div></div>
    <div id="satrBody"><div class="panel g"><div class="empty">در حال بارگذاری…</div></div></div>`;
  await loadSatisfactionResults(true);
}
function clearSatisfactionResultsFilter(){ SATR.noFilter=true; loadSatisfactionResults(); }
function toggleSatisfactionFilter(){ const p=$('satrFilter'); if(p) p.classList.toggle('collapsed'); }
async function loadSatisfactionResults(initial){
  const body=$('satrBody'); if(!body) return;
  try{
    let from=null, to=null;
    // بازه‌ی آماده بر بازه‌ی دستی می‌چربد: کاربر تازه رویش کلیک کرده.
    const pr = SATR.preset ? satrPresetRange(SATR.preset) : null;
    if(pr){ from=pr.from; to=pr.to; SATR.noFilter=false; }
    else if(!SATR.noFilter || initial===undefined){
      if(!initial){ from=readJalaliDateInput('sr_from'); to=readJalaliDateInput('sr_to'); SATR.noFilter=false; }
    }
    const d=await API.satisfactionResults(from, to);
    SATR.data=d;
    drawSatisfactionResults();
  }catch(e){ body.innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function drawSatisfactionResults(){
  const body=$('satrBody'); if(!body) return;
  const d=SATR.data;
  if(!d || !d.total){ body.innerHTML='<div class="panel g"><div class="empty">در این بازه هیچ نظرسنجی‌ای ثبت نشده است</div></div>'; return; }
  const barsHtml = SURVEY_SECTIONS.map(sec=>{
    const avg = d.section_averages[sec.key]?.section_average;
    const pct = avg ? Math.round(avg/5*100) : 0;
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--th);margin-bottom:5px">
        <span>${esc(sec.title)}</span><span style="color:var(--gdl);font-weight:800">${avg? fa(avg):'—'} / ۵</span></div>
      <div class="bar"><i class="bf-gd" style="width:${pct}%"></i></div></div>`;
  }).join('');
  const retTotal=(d.would_return.yes||0)+(d.would_return.no||0);
  const retPct = retTotal ? Math.round(d.would_return.yes/retTotal*100) : 0;
  const rowsHtml = d.surveys.slice(0,200).map(s=>{
    // slice(0,10) ِ قبلی تاریخِ میلادیِ خام را با رقمِ لاتین چاپ می‌کرد
    // («2026-08-24») — تنها جای برنامه که تاریخ شمسی نمی‌شد.
    const dt = faDateISO(s.created_at);
    // کلِ سطر بازکننده‌ی پروفایل است، نه فقط متن: مدیر ممکن است روی امتیاز یا
    // تاریخ کلیک کند و انتظار همان پنجره را داشته باشد.
    const cm=(s.comment||'').trim();
    return `<tr class="satr-row" onclick="satrOpen('${esc(s.id)}')" tabindex="0"
      onkeydown="if(event.key==='Enter'){event.preventDefault();satrOpen('${esc(s.id)}')}">
      <td>${dt}</td><td>${esc(s.respondent_type||'—')}</td><td>${esc(s.patient_gender||'—')}</td>
      <td>${esc(s.would_return||'—')}</td><td style="font-weight:800;color:var(--gdl)">${s.overall_score!=null?fa(s.overall_score):'—'}</td>
      <td class="satr-cm">${cm?`<span class="satr-cmt">${esc(cm)}</span>`:'<span class="rep-nil">—</span>'}</td>
      <td class="satr-go">مشاهده ›</td></tr>`;
  }).join('');

  // ---- نمودارِ توزیعِ امتیازها (۱ تا ۵) ----
  // «چند نفر چه امتیازی دادند» چیزی است که میانگینِ محورها پنهانش می‌کند: دو
  // مرکز با میانگینِ یکسان می‌توانند یکی همه‌ی پاسخ‌ها را روی ۳ داشته باشند و
  // دیگری نیمی ۱ و نیمی ۵ — و آن دو وضعیتِ کاملاً متفاوتی‌اند.
  const dist=[0,0,0,0,0];
  for(const s of (d.surveys||[])){
    let sc={}; try{ sc=JSON.parse(s.scores||'{}'); }catch(e){ sc={}; }
    for(const k in sc) for(const v of (sc[k]||[])) if(v>=1&&v<=5) dist[v-1]++;
  }
  const distTotal=dist.reduce((a,b)=>a+b,0);
  const SAT_LABELS=['خیلی کم','کم','متوسط','زیاد','خیلی زیاد'];
  // از قرمز به سبز: رتبه‌ای است، پس رنگ هم باید رتبه‌ای باشد نه دلبخواه.
  const SAT_COLORS=['#c0392b','#e07a3a','#e0ab2e','#7fbf5a','#2f9e63'];
  const chartHtml = !distTotal ? '<div class="empty" style="padding:22px">داده‌ای برای نمودار نیست</div>'
    : SATR.kind==='pie' ? satrPie(dist, distTotal, SAT_LABELS, SAT_COLORS)
    : SATR.kind==='dot' ? satrDots(d.surveys||[])
    : satrBars(dist, distTotal, SAT_LABELS, SAT_COLORS);
  const kindBtn=(k,t)=>`<button class="tgl ${SATR.kind===k?'on':''}" onclick="satrKind('${k}')">${t}</button>`;
  body.innerHTML=`
    <div class="stats">
      <div class="panel g st"><div class="l">تعداد پاسخ‌ها</div><div class="v">${fa(d.total)}</div></div>
      <div class="panel g st gold"><div class="l">میانگین کلی رضایت</div><div class="v">${d.overall_average!=null?fa(d.overall_average):'—'} / ۵</div></div>
      <div class="panel g st"><div class="l">تمایل به انتخاب مجدد</div><div class="v">${fa(retPct)}٪</div>
        <div class="bar"><i class="bf-ok" style="width:${retPct}%"></i></div></div>
    </div>
    <div class="panel g"><div class="phd"><b>میانگین هر محور (از ۵)</b></div><div class="pbody" style="padding:18px 20px">${barsHtml}</div></div>
    <div class="panel g"><div class="phd" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <b style="flex:1">توزیع امتیازها</b>
      <div class="pathbar noprint" style="margin:0">${kindBtn('bar','میله‌ای')}${kindBtn('pie','دایره‌ای')}${kindBtn('dot','نقطه‌ای')}</div></div>
      <div class="pbody" style="padding:16px 20px">${chartHtml}</div></div>
    <div class="panel g"><div class="phd" style="display:flex;align-items:center;gap:10px"><b style="flex:1">فهرست پاسخ‌ها</b>
      <button class="btn btn-o btn-sm noprint" onclick="printSatisfaction()">${ic('print')} چاپ گزارش</button></div>
      <div class="pbody"><div class="sub" style="margin-bottom:8px">روی هر سطر بزنید تا پاسخ‌های کاملِ همان نفر باز شود.</div>
      <div class="tbl-wrap"><table class="satr-tbl"><thead><tr>
        <th>تاریخ</th><th>وضعیت</th><th>جنسیت</th><th>انتخاب مجدد</th><th>امتیاز کلی</th><th>نظر نوشتاری</th><th></th>
      </tr></thead><tbody>${rowsHtml}</tbody></table></div></div></div>
    <div id="satrProfile"></div>`;
  if(SATR.detail) satrDrawProfile();
}

// ---- نمودارها ----
// SVG دست‌نویس، مثل بقیه‌ی نمودارهای پروژه — بدون کتابخانه‌ی تازه.
function satrBars(dist, total, labels, colors){
  const W=760,H=250,PADX=44,PADY=26;
  const max=Math.max(...dist)||1;
  const n=dist.length, CLUS=(W-PADX*2)/n, BW=Math.min(74, CLUS-16);
  // راست‌به‌چپ، مثل نمودارهای شاخص
  const col_=i=>n-1-i;
  const bars=dist.map((v,i)=>{
    const h=Math.max(2,(v/max)*(H-PADY*2));
    const x=PADX+col_(i)*CLUS+(CLUS-BW)/2, y=H-PADY-h;
    const pct=Math.round(v/total*1000)/10;
    return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BW}" height="${h.toFixed(1)}" rx="4"
        fill="${colors[i]}" opacity=".9"><title>${esc(labels[i])}: ${fa(v)} پاسخ (${fa(pct)}٪)</title></rect>
      <text x="${(x+BW/2).toFixed(1)}" y="${(y-7).toFixed(1)}" text-anchor="middle" font-size="12"
        font-weight="700" fill="${colors[i]}">${fa(v)}</text>
      <text x="${(x+BW/2).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="11.5" fill="var(--td)">${esc(labels[i])}</text></g>`;
  }).join('');
  return `<div class="cmp-svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="cmp-svg" style="min-width:0"
    role="img" aria-label="نمودار میله‌ای توزیع امتیازها">${bars}</svg></div>`;
}
function satrPie(dist, total, labels, colors){
  const W=380,H=250,cx=W/2,cy=H/2,R=95;
  let a=-Math.PI/2;
  const arcs=dist.map((v,i)=>{
    if(!v) return '';
    const ang=(v/total)*Math.PI*2, a2=a+ang;
    const x1=cx+R*Math.cos(a), y1=cy+R*Math.sin(a), x2=cx+R*Math.cos(a2), y2=cy+R*Math.sin(a2);
    const big=ang>Math.PI?1:0;
    const pct=Math.round(v/total*1000)/10;
    const mid=a+ang/2, lx=cx+R*0.62*Math.cos(mid), ly=cy+R*0.62*Math.sin(mid);
    a=a2;
    return `<g><path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 ${big} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z"
        fill="${colors[i]}" opacity=".9"><title>${esc(labels[i])}: ${fa(v)} (${fa(pct)}٪)</title></path>
      ${pct>=6?`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="12"
        font-weight="700" fill="#0d1a14">${fa(pct)}٪</text>`:''}</g>`;
  }).join('');
  const rows=dist.map((v,i)=>!v?'':`<div class="cmp-pierow"><i style="background:${colors[i]}"></i>
    <span>${esc(labels[i])}</span><b>${fa(Math.round(v/total*1000)/10)}٪</b><u>${fa(v)} پاسخ</u></div>`).join('');
  return `<div class="cmp-pie"><div class="cmp-svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="cmp-svg"
    style="min-width:0;max-width:${W}px" role="img" aria-label="نمودار دایره‌ای توزیع امتیازها">${arcs}</svg></div>
    <div class="cmp-pielist">${rows}</div></div>`;
}
// نقطه‌ای: هر پاسخ یک نقطه — محورِ افقی زمان، عمودی امتیازِ کلیِ همان نفر.
// چیزی را نشان می‌دهد که میله و دایره نمی‌توانند: پراکندگی در طولِ زمان، و
// اینکه آیا نمره‌های پایین در یک بازه‌ی خاص خوشه شده‌اند یا در کلِ دوره پخش‌اند.
function satrDots(surveys){
  const pts=surveys.map(s=>({t:Date.parse(s.created_at||''), v:s.overall_score}))
    .filter(p=>Number.isFinite(p.t) && p.v!=null);
  if(!pts.length) return '<div class="empty" style="padding:22px">پاسخی با امتیاز و تاریخ معتبر نیست</div>';
  const W=760,H=250,PADX=44,PADY=26;
  const t0=Math.min(...pts.map(p=>p.t)), t1=Math.max(...pts.map(p=>p.t));
  const span=(t1-t0)||1;
  // راست‌به‌چپ: قدیمی‌ترین سمتِ راست
  const x=t=>PADX+(1-(t-t0)/span)*(W-PADX*2);
  const y=v=>H-PADY-((v-1)/4)*(H-PADY*2);
  const grid=[1,2,3,4,5].map(v=>`<line x1="${PADX}" x2="${W-PADX}" y1="${y(v)}" y2="${y(v)}"
    stroke="var(--bd)" stroke-width="1" opacity=".4"/>
    <text x="${PADX-8}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--td)">${fa(v)}</text>`).join('');
  const dots=pts.map(p=>{
    const c = p.v>=4 ? '#2f9e63' : p.v>=3 ? '#e0ab2e' : '#c0392b';
    return `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4.5" fill="${c}" opacity=".75">
      <title>${faDateISO(new Date(p.t).toISOString())}: ${fa(Math.round(p.v*10)/10)} از ۵</title></circle>`;
  }).join('');
  return `<div class="cmp-svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="cmp-svg" style="min-width:0"
      role="img" aria-label="نمودار نقطه‌ای امتیاز هر پاسخ در طول زمان">${grid}${dots}
      <text x="${W-PADX}" y="${H-6}" text-anchor="start" font-size="11" fill="var(--td)">${faDateISO(new Date(t0).toISOString())}</text>
      <text x="${PADX}" y="${H-6}" text-anchor="end" font-size="11" fill="var(--td)">${faDateISO(new Date(t1).toISOString())}</text>
    </svg></div>
    <div class="sub" style="margin-top:6px">هر نقطه یک پاسخ‌دهنده است؛ محور عمودی امتیازِ کلیِ او و محور افقی تاریخِ ثبت.</div>`;
}

// ---- پروفایل یک پاسخ ----
function satrOpen(id){ SATR.detail=id; satrDrawProfile(); }
function satrClose(){ SATR.detail=null; const h=$('satrProfile'); if(h) h.innerHTML=''; }
