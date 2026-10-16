/**
 * Improvement Programs & Strategic Wizard
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function renderPrograms(){
  $('ptitle').textContent='برنامه‌های بهبود';
  if(PRG.view==='form') return drawProgForm();
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const qs=Object.entries(PRG.filters).filter(([,v])=>v).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    const r=await API.programs(qs);
    PRG.list=r.programs||[]; PRG.canApprove=!!r.can_approve;
    // پاسخِ دیرهنگامِ شبکه نباید فرمی را که کاربر در همین فاصله باز کرده
    // (و شاید داخلش تایپ کرده) پاک کند — همان ایرادی که در مدارک دیده شد.
    if(PRG.view!=='list') return;
    drawProgList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function progBar(p){
  const pct=Math.max(0,Math.min(100,p.progress_percent||0));
  const col=pct>=100?'var(--ok)':(pct>=40?'var(--wr)':'var(--dn)');
  return `<div style="display:flex;align-items:center;gap:7px;min-width:110px">
    <div class="hbt" style="flex:1"><i style="width:${pct}%;background:${col}"></i></div>
    <b style="font-size:12px;white-space:nowrap">${fa(pct)}٪</b></div>`;
}

function drawProgList(){
  const f=PRG.filters;
  const mine=id=>id===S.user?.id;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">◎</div>
      <div style="flex:1"><h3>برنامه‌های استراتژیک، عملیاتی و بهبود کیفیت</h3>
      <div class="sub">${fa(PRG.list.length)} برنامه — هر کارمند می‌تواند برنامه پیشنهاد دهد؛ تأیید بر عهدهٔ مدیریت کیفیت است</div></div>
      <button class="btn btn-o btn-sm" onclick="openStrategicWizardModal()" style="border-color:#2563eb;color:#2563eb;font-weight:700">⚙️ پیکربندی برنامه استراتژیک</button>
      <button class="btn btn-o btn-sm" onclick="printPrograms()">${ic('print')} چاپ فهرست</button>
      <button class="btn btn-g btn-sm" onclick="newProgram()">+ پیشنهاد برنامه جدید</button>
    </div>
    <div class="pbody">

      <!-- روبان‌های سه‌گانه انتخاب دسته‌بندی برنامه (مطابق تصاویر ۳۱ و ۳۲) -->
      <div style="display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap">
        <div style="flex:1;min-width:210px;background:${f.type==='استراتژیک'?'linear-gradient(135deg, rgba(30, 64, 175, 0.9), rgba(59, 130, 246, 0.9))':'rgba(18, 32, 50, 0.8)'};color:#ffffff;border:1.5px solid ${f.type==='استراتژیک'?'#60a5fa':'rgba(255, 255, 255, 0.12)'};border-radius:14px;padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;box-shadow:${f.type==='استراتژیک'?'0 0 16px rgba(59,130,246,0.35)':'0 4px 14px rgba(0,0,0,0.3)'};transition:all .2s ease"
             onclick="setProgFilter('type','استراتژیک')">
          <div>
            <div style="font-weight:800;font-size:13.5px;color:#ffffff">🎯 برنامه استراتژیک</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">اهداف کلان، رسالت، چشم‌انداز و SWOT</div>
          </div>
          <span class="bdg ${f.type==='استراتژیک'?'b1':'b2'}" style="${f.type==='استراتژیک'?'background:#2563eb;color:#fff':'background:rgba(255,255,255,0.08);color:#cbd5e1'}">${fa(PRG.list.filter(x=>x.program_type==='استراتژیک').length)}</span>
        </div>

        <div style="flex:1;min-width:210px;background:${f.type==='عملیاتی'?'linear-gradient(135deg, rgba(18,66,83,0.9), rgba(16,160,185,0.9))':'rgba(18, 32, 50, 0.8)'};color:#ffffff;border:1.5px solid ${f.type==='عملیاتی'?'#34bbd3':'rgba(255, 255, 255, 0.12)'};border-radius:14px;padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;box-shadow:${f.type==='عملیاتی'?'0 0 16px rgba(16,160,185,0.35)':'0 4px 14px rgba(0,0,0,0.3)'};transition:all .2s ease"
             onclick="setProgFilter('type','عملیاتی')">
          <div>
            <div style="font-weight:800;font-size:13.5px;color:#ffffff">⚙️ برنامه عملیاتی</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">اقدامات سالیانه واحدها و فعالیت‌های اسمارت</div>
          </div>
          <span class="bdg ${f.type==='عملیاتی'?'b1':'b2'}" style="${f.type==='عملیاتی'?'background:#1b6580;color:#fff':'background:rgba(255,255,255,0.08);color:#cbd5e1'}">${fa(PRG.list.filter(x=>x.program_type==='عملیاتی').length)}</span>
        </div>

        <div style="flex:1;min-width:210px;background:${f.type==='بهبود'?'linear-gradient(135deg, rgba(146, 64, 14, 0.9), rgba(245, 158, 11, 0.9))':'rgba(18, 32, 50, 0.8)'};color:#ffffff;border:1.5px solid ${f.type==='بهبود'?'#fbbf24':'rgba(255, 255, 255, 0.12)'};border-radius:14px;padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;box-shadow:${f.type==='بهبود'?'0 0 16px rgba(245,158,11,0.35)':'0 4px 14px rgba(0,0,0,0.3)'};transition:all .2s ease"
             onclick="setProgFilter('type','بهبود')">
          <div>
            <div style="font-weight:800;font-size:13.5px;color:#ffffff">✨ برنامه بهبود کیفیت</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">پروژه‌های ارتقای کیفیت، ایمنی و اثربخشی</div>
          </div>
          <span class="bdg ${f.type==='بهبود'?'b1':'b2'}" style="${f.type==='بهبود'?'background:#d97706;color:#fff':'background:rgba(255,255,255,0.08);color:#cbd5e1'}">${fa(PRG.list.filter(x=>x.program_type==='بهبود'||x.program_type==='بهبود کیفیت').length)}</span>
        </div>

        <div style="min-width:90px;background:${!f.type?'linear-gradient(135deg, #0284c7, #38bdf8)':'rgba(18, 32, 50, 0.8)'};color:#ffffff;border:1.5px solid ${!f.type?'#38bdf8':'rgba(255, 255, 255, 0.12)'};border-radius:14px;padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12.5px;box-shadow:${!f.type?'0 0 16px rgba(56,189,248,0.35)':'0 4px 14px rgba(0,0,0,0.3)'};transition:all .2s ease"
             onclick="setProgFilter('type','')">
          نمایش همه
        </div>
      </div>

      <div class="docfilters">
        <div class="fg" style="margin:0"><label>نوع برنامه ${help('flt_progtype')}</label>
          <select onchange="setProgFilter('type',this.value)">
            <option value="">همه انواع</option>
            ${PROG_TYPES.map(t=>`<option value="${t}" ${f.type===t?'selected':''}>برنامه ${t}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0"><label>وضعیت ${help('flt_status')}</label>
          <select onchange="setProgFilter('status',this.value)">
            <option value="">همه وضعیت‌ها</option>
            ${PROG_STATUSES.map(s=>`<option value="${s}" ${f.status===s?'selected':''}>${PROG_STATUS_FA[s]}</option>`).join('')}
          </select></div>
        <div class="fg" style="margin:0"><label>بخش/واحد</label>
          <input id="prg_dept" value="${esc(f.department)}" placeholder="مثال: بلوک زایمان"
            onkeydown="if(event.key==='Enter')setProgFilter('department',this.value)"></div>
        <div class="fg" style="margin:0;flex:1.4"><label>جستجو در عنوان یا هدف استراتژیک</label>
          <input id="prg_q" value="${esc(f.q)}" placeholder="مثال: کاهش عفونت"
            onkeydown="if(event.key==='Enter')setProgFilter('q',this.value)"></div>
        <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px"
          onclick="setProgFilter('department',$('prg_dept').value)">⌕ اعمال فیلتر</button>
      </div>
      ${!PRG.list.length?'<div class="empty"><div class="ei">◎</div>برنامه‌ای با این فیلترها یافت نشد</div>':`
      <div class="tbl-wrap"><table>
        <thead><tr><th>عنوان برنامه</th><th>نوع</th><th>پیشنهاددهنده</th><th>پیشرفت</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>${PRG.list.map(p=>{ const did=drowNext();
          const editable=PRG.canApprove||(mine(p.proposed_by)&&p.status==='پیشنهاد_شده');
          const canProg=(PRG.canApprove||mine(p.proposed_by))&&p.status!=='پیشنهاد_شده'&&p.status!=='رد_شده';
          return `<tr>
          <td style="color:var(--th)">${esc(p.title)}
            <span class="tsub">${esc(p.department||'بخش ثبت‌نشده')}</span></td>
          <td><span class="bdg ${PROG_TYPE_BDG[p.program_type]||'b2'}">${esc(p.program_type)}</span></td>
          <td style="white-space:nowrap">${esc(p.proposed_by_name||'—')}</td>
          <td>${progBar(p)}</td>
          <td><span class="bdg ${PROG_STATUS_BDG[p.status]||'b2'}">${PROG_STATUS_FA[p.status]||p.status}</span></td>
          <td style="white-space:nowrap">
            ${PRG.canApprove&&p.status==='پیشنهاد_شده'?`
              <button class="tgl prim" onclick="decideProgram('${p.id}','approve')">تأیید</button>
              <button class="tgl dngr" onclick="decideProgram('${p.id}','reject')">رد</button>`:''}
            ${canProg?`<button class="tgl" onclick="askProgProgress('${p.id}',${p.progress_percent||0})">ثبت پیشرفت</button>`:''}
            ${drowBtn(did)}
          </td></tr>
          ${drowRow(did, 6, [
            dp('هدف استراتژیک', esc(p.strategic_goal||'—')),
            dp('شرح برنامه', esc(p.description||'—')),
            dp('تاریخ شروع', p.start_date?faDateISO(p.start_date):'—'),
            dp('مهلت انجام', p.due_date?faDateISO(p.due_date):'—'),
            dp('تأییدکننده', esc(p.approved_by_name||'—')),
            dp('یادداشت تصمیم', esc(p.decision_note||'—')),
          ], `${editable?`<button class="tgl prim" onclick="editProgram('${p.id}')">ویرایش</button> `:''}${editable?`<button class="tgl dngr" onclick="removeProgram('${p.id}')">حذف برنامه</button>`:''}`)}`;
        }).join('')}</tbody></table></div>`}
    </div>
  </div>`;
}
function setProgFilter(k,v){
  PRG.filters[k]=v;
  if($('prg_q')) PRG.filters.q=$('prg_q').value;
  PRG.view='list'; renderPrograms();
}
function newProgram(){ PRG.view='form'; PRG.editId=null; PRG.current=null; drawProgForm(); }
async function editProgram(id){
  try{ const r=await API.program(id); PRG.current=r.program; PRG.editId=id; PRG.view='form'; drawProgForm(); }
  catch(e){ toast(e.message,true); }
}
function backToProgList(){ PRG.view='list'; PRG.current=null; PRG.editId=null; renderPrograms(); }
function progVal(f){ return PRG.current? (PRG.current[f]??'') : ''; }

function drawProgForm(){
  const p=PRG.current;
  $('ptitle').textContent=PRG.editId?'ویرایش برنامه':'پیشنهاد برنامه جدید';
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">◎</div>
      <div style="flex:1"><h3>${PRG.editId?'ویرایش برنامه':'پیشنهاد برنامه جدید'}</h3>
      <div class="sub">پس از ثبت، برنامه در وضعیت «پیشنهاد شده» می‌ماند تا مدیریت کیفیت آن را تأیید یا رد کند</div></div>
      <button class="btn btn-o btn-sm" onclick="backToProgList()">◂ بازگشت به فهرست</button>
    </div>
    <div class="pbody">
      <div class="docgrid">
        <div class="fg" style="grid-column:span 2"><label>عنوان برنامه *</label>
          <input id="pf_title" value="${esc(progVal('title'))}" placeholder="مثال: کاهش عفونت محل جراحی در اتاق عمل جنرال"></div>
        <div class="fg"><label>نوع برنامه</label>
          <select id="pf_type">${PROG_TYPES.map(t=>`<option value="${t}" ${(progVal('program_type')||'بهبود')===t?'selected':''}>برنامه ${t}</option>`).join('')}</select></div>
        <div class="fg"><label>بخش/واحد مجری</label>
          <input id="pf_dept" list="pf_dept_list" value="${esc(progVal('department'))}" placeholder="مثال: اتاق عمل جنرال">
          <datalist id="pf_dept_list"></datalist></div>
        <div class="fg" style="grid-column:span 2"><label>هدف استراتژیک مرتبط</label>
          <input id="pf_goal" value="${esc(progVal('strategic_goal'))}" placeholder="اختیاری — مثال: ارتقای ایمنی بیمار تا پایان سال"></div>
      </div>
      <div class="fg" style="margin-top:12px"><label>شرح برنامه</label>
        <textarea id="pf_desc" rows="4" placeholder="مسئله، اقدام پیشنهادی و نتیجهٔ مورد انتظار">${esc(progVal('description'))}</textarea></div>
      <div class="docdates">
        <div class="fg" style="margin:0"><label>تاریخ شروع</label>${jalaliDateInputHtml('pf_start')}</div>
        <div class="fg" style="margin:0"><label>مهلت انجام</label>${jalaliDateInputHtml('pf_due')}</div>
      </div>
      <div style="margin-top:14px"><button class="btn btn-g" onclick="saveProgram()">${PRG.editId?'ذخیره تغییرات':'ثبت پیشنهاد'}</button></div>
    </div>
  </div>`;
  if(p){ setJalaliDateInput('pf_start', p.start_date); setJalaliDateInput('pf_due', p.due_date); }
  fillOrgDatalist('pf_dept_list','unit');
}

async function saveProgram(){
  const b={ title:$('pf_title').value.trim(), program_type:$('pf_type').value,
    department:$('pf_dept').value.trim(), strategic_goal:$('pf_goal').value.trim(),
    description:$('pf_desc').value.trim(), start_date:readJalaliDateInput('pf_start'),
    due_date:readJalaliDateInput('pf_due') };
  if(!b.title){ toast('عنوان برنامه الزامی است',true); return; }
  try{
    if(PRG.editId){ await API.updateProgram(PRG.editId,b); toast('برنامه به‌روزرسانی شد'); }
    else { await API.createProgram(b); toast('پیشنهاد برنامه ثبت شد و در انتظار تأیید است'); }
    backToProgList();
  }catch(e){ toast(e.message,true); }
}
async function decideProgram(id, kind){
  const note=await BTN.prompt(kind==='approve'?'یادداشت تأیید (اختیاری):':'دلیل رد برنامه (اختیاری):','');
  if(note===null) return;
  try{
    if(kind==='approve') await API.approveProgram(id, note); else await API.rejectProgram(id, note);
    toast(kind==='approve'?'برنامه تأیید شد':'برنامه رد شد');
    renderPrograms();
  }catch(e){ toast(e.message,true); }
}
async function askProgProgress(id, cur){
  const v=await BTN.prompt('درصد پیشرفت برنامه (۰ تا ۱۰۰):', String(cur||0));
  if(v===null) return;
  const n=Number(v);
  if(!Number.isFinite(n)){ toast('عدد معتبر وارد کنید',true); return; }
  try{ await API.setProgramProgress(id, n); toast('پیشرفت ثبت شد'); renderPrograms(); }
  catch(e){ toast(e.message,true); }
}
async function removeProgram(id){
  if(!await BTN.confirmDanger('این برنامه حذف شود؟')) return;
  try{ await API.deleteProgram(id); toast('برنامه حذف شد'); renderPrograms(); }
  catch(e){ toast(e.message,true); }
}

// ==================== ویزارد ۸ مرحله‌ای تدوین برنامه استراتژیک (مطابق تصویر ۳۳) ====================
let STRAT_WIZARD = {
  step: 1,
  data: {
    mission: 'ارائه خدمات درمانی ایمن، باکیفیت و بیمارمحور با اتکا به دانش روز پزشکی، رعایت اخلاق حرفه‌ای و کرامت انسانی.',
    vision: 'تبدیل شدن به مرکز درمانی پیشرو و الگوی کشوری در کیفیت خدمات، ایمنی بیمار و رضایتمندی مراجعین تا سال ۱۴۰۸.',
    values: 'بیمارمحوری، پاسخگویی و شفافیت، کار تیمی، کرامت انسانی، تعهد به ایمنی و عدالت در سلامت.',
    macro_goals: '۱. ارتقای ایمنی بیمار و به حداقل رساندن وقایع ناخواسته درمانی\n۲. بهبود مستمر کیفیت خدمات بالینی و پاراکلینیکی\n۳. ارتقای رضایت گیرندگان خدمت و کرامت بیماران\n۴. توانمندسازی و ارتقای انگیزه و مهارت‌های منابع انسانی\n۵. انضباط مالی، بهینه‌سازی مصرف منابع و اقتصاد مقاومتی',
    stakeholders: [
      { name: 'بیماران و خانواده‌ها', needs: 'درمان ایمن، تکریم، کاهش زمان انتظار و هزینه‌های شفاف', power: 'بالا', interest: 'بسیار بالا' },
      { name: 'پزشکان و کادر پرستاری', needs: 'امنیت شغلی، تجهیزات به‌روز، انگیزش و آموزش مداوم', power: 'بالا', interest: 'بالا' },
      { name: 'وزارت بهداشت و دانشگاه', needs: 'رعایت استانداردهای اعتباربخشی و قوانین بالادستی', power: 'بسیار بالا', interest: 'بالا' },
      { name: 'شرکت‌های بیمه‌گر', needs: 'انضباط در ارسال اسناد، رعایت پروتکل‌ها و تعادل مالی', power: 'متوسط', interest: 'بالا' }
    ],
    swot: {
      strengths: 'کادر تخصصی مجرب و متعهد؛ وجود بخش‌های ویژه مجهز (ICU, CCU)؛ اعتباربخشی درجه یک؛ استقرار پرونده الکترونیک سلامت.',
      weaknesses: 'فرسودگی بخشی از تجهیزات قدیمی؛ تراکم بالای مراجعین در بخش اورژانس؛ کمبود نیروی پرستاری در شیفت‌های عصر و شب.',
      opportunities: 'رشد تقاضای خدمات سرپایی و تشخیصی؛ امکان جلب مشارکت خیرین سلامت؛ اجرای برنامه‌های تحول دیجیتال سلامت.',
      threats: 'تورم و افزایش قیمت ملزومات مصرفی و داروها؛ تأخیر بیمه‌ها در پرداخت مطالبات بیمارستان؛ نوسانات تعرفه‌های درمانی.'
    },
    ife_score: '2.78',
    efe_score: '2.65',
    ie_quadrant: 'حفظ و نگهداری (محافظه‌کارانه/رشد انتخابی)',
    strategies: [
      { code: 'SO-1', title: 'توسعه کلینیک‌های فوق تخصصی با اتکا به پزشکان برجسته مرکز', priority: 'بالا' },
      { code: 'WO-1', title: 'نوسازی ناوگان تجهیزات پزشکی حساس از طریق اعتبارات دانشگاهی و خیرین', priority: 'خیلی بالا' },
      { code: 'ST-1', title: 'مدیریت بهینه زنجیره تأمین ملزومات و کاهش هدررفت جهت مقابله با تورم', priority: 'بالا' },
      { code: 'WT-1', title: 'بازطراحی فرآیند تریاژ و پذیرش اورژانس جهت کاهش زمان انتظار', priority: 'خیلی بالا' }
    ]
  }
};

function openStrategicWizardModal(){
  const saved = localStorage.getItem('strat_wizard_data_' + (S.hospitalId||'default'));
  if(saved) { try { STRAT_WIZARD.data = JSON.parse(saved); } catch(e){} }
  STRAT_WIZARD.step = 1;
  renderStrategicWizardContent();
}

function renderStrategicWizardContent(){
  const cur = STRAT_WIZARD.step;
  const d = STRAT_WIZARD.data;
  const steps = [
    { num: 1, title: 'اطلاعات اولیه' },
    { num: 2, title: 'تحلیل ذینفعان' },
    { num: 3, title: 'تحلیل ماتریس SWOT' },
    { num: 4, title: 'ارزیابی عوامل داخلی IFE' },
    { num: 5, title: 'ارزیابی عوامل خارجی EFE' },
    { num: 6, title: 'ماتریس داخلی و خارجی IE' },
    { num: 7, title: 'تدوین استراتژی‌ها' },
    { num: 8, title: 'اولویت‌بندی استراتژی‌ها' }
  ];

  let bodyHtml = '';
  if(cur === 1){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">رسالت، چشم‌انداز، ارزش‌های محوری و اهداف کلان راهبردی بیمارستان را در این مرحله ثبت نمایید:</div>
      <div class="fg"><label>رسالت (Mission) بیمارستان *</label><textarea id="sw_mission" rows="3">${esc(d.mission)}</textarea></div>
      <div class="fg"><label>چشم‌انداز (Vision) افق ۵ ساله *</label><textarea id="sw_vision" rows="3">${esc(d.vision)}</textarea></div>
      <div class="fg"><label>ارزش‌های محوری (Core Values)</label><textarea id="sw_values" rows="2">${esc(d.values)}</textarea></div>
      <div class="fg"><label>اهداف کلان (Macro Goals)</label><textarea id="sw_macro_goals" rows="4">${esc(d.macro_goals)}</textarea></div>
    `;
  } else if(cur === 2){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">شناسایی گروه‌های ذینفع، انتظارات و ماتریس قدرت-علاقه (Mendelow Matrix):</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>گروه ذینفع</th><th>انتظارات و نیازهای کلیدی</th><th>سطح قدرت</th><th>سطح منفعت</th></tr></thead>
        <tbody>${d.stakeholders.map(s=>`<tr>
          <td style="font-weight:700;color:var(--th)">${esc(s.name)}</td>
          <td>${esc(s.needs)}</td>
          <td><span class="bdg b1">${esc(s.power)}</span></td>
          <td><span class="bdg b2">${esc(s.interest)}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>
    `;
  } else if(cur === 3){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">تحلیل چهارگانه نقاط قوت، نقاط ضعف، فرصت‌ها و تهدیدها (ماتریس SWOT):</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="background:rgba(16,160,185,0.08);border:1.5px solid #10a0b9;border-radius:10px;padding:12px">
          <h4 style="margin:0 0 8px 0;color:#124253">💪 نقاط قوت (Strengths)</h4>
          <textarea id="sw_strengths" rows="5" style="width:100%;font-size:12px">${esc(d.swot.strengths)}</textarea>
        </div>
        <div style="background:rgba(239,68,68,0.08);border:1.5px solid #ef4444;border-radius:10px;padding:12px">
          <h4 style="margin:0 0 8px 0;color:#991b1b">⚠️ نقاط ضعف (Weaknesses)</h4>
          <textarea id="sw_weaknesses" rows="5" style="width:100%;font-size:12px">${esc(d.swot.weaknesses)}</textarea>
        </div>
        <div style="background:rgba(59,130,246,0.08);border:1.5px solid #3b82f6;border-radius:10px;padding:12px">
          <h4 style="margin:0 0 8px 0;color:#1e40af">🌟 فرصت‌ها (Opportunities)</h4>
          <textarea id="sw_opportunities" rows="5" style="width:100%;font-size:12px">${esc(d.swot.opportunities)}</textarea>
        </div>
        <div style="background:rgba(245,158,11,0.08);border:1.5px solid #f59e0b;border-radius:10px;padding:12px">
          <h4 style="margin:0 0 8px 0;color:#92400e">⚡ تهدیدها (Threats)</h4>
          <textarea id="sw_threats" rows="5" style="width:100%;font-size:12px">${esc(d.swot.threats)}</textarea>
        </div>
      </div>
    `;
  } else if(cur === 4){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">ماتریس ارزیابی عوامل داخلی (Internal Factor Evaluation - IFE):</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>عامل داخلی</th><th>نوع</th><th>ضریب اهمیت (۰ تا ۱)</th><th>رتبه (۱ تا ۴)</th><th>نمره نهایی</th></tr></thead>
        <tbody>
          <tr><td>کادر تخصصی مجرب و بخش‌های فعال ویژه</td><td>قوت</td><td>۰.۲۵</td><td>۴</td><td>۱.۰۰</td></tr>
          <tr><td>استقرار پرونده الکترونیک و سامانه HIS</td><td>قوت</td><td>۰.۱۵</td><td>۳</td><td>۰.۴۵</td></tr>
          <tr><td>تراکم مراجعین و زمان انتظار اورژانس</td><td>ضعف</td><td>۰.۳۰</td><td>۱</td><td>۰.۳۰</td></tr>
          <tr><td>فرسودگی تجهیزات پزشکی اتاق عمل</td><td>ضعف</td><td>۰.۳۰</td><td>۲</td><td>۰.۶۰</td></tr>
          <tr style="font-weight:800;background:var(--bg-card,#f1f5f9)"><td colspan="2">مجموع نمره وزنی عوامل داخلی (IFE Score):</td><td>۱.۰۰</td><td>—</td><td style="color:var(--pri,#2563eb);font-size:14px">۲.۳۵ از ۴.۰۰</td></tr>
        </tbody>
      </table></div>
    `;
  } else if(cur === 5){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">ماتریس ارزیابی عوامل خارجی (External Factor Evaluation - EFE):</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>عامل خارجی</th><th>نوع</th><th>ضریب اهمیت</th><th>رتبه (۱ تا ۴)</th><th>نمره نهایی</th></tr></thead>
        <tbody>
          <tr><td>رشد تقاضای خدمات سرپایی و تشخیصی تخصصی</td><td>فرصت</td><td>۰.۲۵</td><td>۳</td><td>۰.۷۵</td></tr>
          <tr><td>حمایت خیرین سلامت در نوسازی بخش‌ها</td><td>فرصت</td><td>۰.۲۰</td><td>۳</td><td>۰.۶۰</td></tr>
          <tr><td>تأخیر سازمان‌های بیمه‌گر در پرداخت مطالبات</td><td>تهدید</td><td>۰.۳۰</td><td>۲</td><td>۰.۶۰</td></tr>
          <tr><td>تورم و افزایش قیمت تجهیزات و داروها</td><td>تهدید</td><td>۰.۲۵</td><td>۲</td><td>۰.۵۰</td></tr>
          <tr style="font-weight:800;background:var(--bg-card,#f1f5f9)"><td colspan="2">مجموع نمره وزنی عوامل خارجی (EFE Score):</td><td>۱.۰۰</td><td>—</td><td style="color:var(--pri,#2563eb);font-size:14px">۲.۴۵ از ۴.۰۰</td></tr>
        </tbody>
      </table></div>
    `;
  } else if(cur === 6){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">ماتریس داخلی و خارجی (Internal-External Matrix - IE):</div>
      <div style="background:var(--bg-card,#f8fafc);border:1.5px solid var(--bdr,#cbd5e1);border-radius:12px;padding:20px;text-align:center">
        <div style="font-size:15px;font-weight:800;color:var(--pri,#2563eb);margin-bottom:10px">
          موقعیت راهبردی بیمارستان بر اساس تلاقی IFE (۲.۳۵) و EFE (۲.۴۵):
        </div>
        <div style="display:inline-block;padding:12px 28px;background:rgba(59,130,246,0.12);border:2px solid #3b82f6;border-radius:12px;font-weight:800;font-size:16px;color:#1e40af">
          منطقه حفظ و نگهداری (Hold & Maintain - خانه V)
        </div>
        <div style="margin-top:12px;font-size:12.5px;color:var(--td,#64748b);line-height:1.7;max-width:600px;margin-inline:auto">
          در این وضعیت، استراتژی‌های رسوخ در بازار و توسعه خدمت و بهینه‌سازی فرآیندهای داخلی بدون هزینه‌تراشی سنگین، بهترین رویکرد برای هدایت سازمان بیمارستانی است.
        </div>
      </div>
    `;
  } else if(cur === 7){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">استراتژی‌های استخراج‌شده بر اساس ماتریس TOWS/SWOT:</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>کد استراتژی</th><th>عنوان و شرح راهبرد</th><th>اولویت اولیه</th></tr></thead>
        <tbody>${d.strategies.map(st=>`<tr>
          <td style="font-family:monospace;font-weight:700;color:var(--gdl,#2563eb)">${esc(st.code)}</td>
          <td style="font-weight:700;color:var(--th,#0f172a)">${esc(st.title)}</td>
          <td><span class="bdg ${st.priority==='خیلی بالا'?'b3':'b1'}">${esc(st.priority)}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>
    `;
  } else if(cur === 8){
    bodyHtml = `
      <div style="font-size:12.5px;color:var(--td);margin-bottom:14px">اولویت‌بندی استراتژی‌ها با ماتریس برنامه‌ریزی استراتژیک کمی (QSPM Matrix):</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>رتبه</th><th>کد</th><th>عنوان استراتژی منتخب</th><th>نمره جذابیت کل (TAS)</th><th>وضعیت تصویب</th></tr></thead>
        <tbody>
          <tr><td>۱</td><td style="font-family:monospace;font-weight:700;color:var(--gdl)">WO-1</td><td style="font-weight:700">نوسازی ناوگان تجهیزات پزشکی حساس از طریق اعتبارات دانشگاهی و خیرین</td><td><b>۵.۴۰</b></td><td><span class="bdg b1">مصوب هیئت رئیسه</span></td></tr>
          <tr><td>۲</td><td style="font-family:monospace;font-weight:700;color:var(--gdl)">WT-1</td><td style="font-weight:700">بازطراحی فرآیند تریاژ و پذیرش اورژانس جهت کاهش زمان انتظار</td><td><b>۵.۱۵</b></td><td><span class="bdg b1">مصوب هیئت رئیسه</span></td></tr>
          <tr><td>۳</td><td style="font-family:monospace;font-weight:700;color:var(--gdl)">SO-1</td><td style="font-weight:700">توسعه کلینیک‌های فوق تخصصی با اتکا به پزشکان برجسته مرکز</td><td><b>۴.۸۰</b></td><td><span class="bdg b1">در حال ابلاغ</span></td></tr>
          <tr><td>۴</td><td style="font-family:monospace;font-weight:700;color:var(--gdl)">ST-1</td><td style="font-weight:700">مدیریت بهینه زنجیره تأمین ملزومات و کاهش هدررفت جهت مقابله با تورم</td><td><b>۴.۴۵</b></td><td><span class="bdg b2">در دست بررسی</span></td></tr>
        </tbody>
      </table></div>
    `;
  }

  const modalHtml = `
  <div id="stratModalWrap" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)">
    <div style="background:var(--bg-panel,#ffffff);border-radius:18px;box-shadow:0 20px 40px rgba(0,0,0,0.25);width:100%;max-width:980px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border:1.5px solid var(--bdr,#cbd5e1)">
      
      <!-- هدر ویزارد -->
      <div style="padding:16px 22px;border-bottom:1.5px solid var(--bdr,#e2e8f0);display:flex;align-items:center;justify-content:space-between;background:var(--bg-card,#f8fafc)">
        <div>
          <h3 style="margin:0;font-size:16px;color:var(--th,#0f172a);display:flex;align-items:center;gap:8px">
            <span>🎯</span> ویزارد تدوین برنامه استراتژیک بیمارستان
          </h3>
          <div style="font-size:11.5px;color:var(--td,#64748b);margin-top:2px">الگوی ۸ مرحله‌ای استاندارد تدوین و اولویت‌بندی سند راهبردی</div>
        </div>
        <button class="btn btn-o btn-sm" onclick="closeStrategicWizardModal()" style="border-radius:8px">✕ بستن</button>
      </div>

      <!-- استپر مراحل ۸ گانه -->
      <div style="display:flex;overflow-x:auto;padding:10px 16px;background:var(--bg-card,#f1f5f9);border-bottom:1px solid var(--bdr,#cbd5e1);gap:6px">
        ${steps.map(s=>`
          <button style="padding:6px 10px;border-radius:8px;border:1px solid ${s.num===cur?'var(--pri,#2563eb)':'var(--bdr,#cbd5e1)'};background:${s.num===cur?'var(--pri,#2563eb)':'var(--bg-panel,#ffffff)'};color:${s.num===cur?'#ffffff':'var(--th,#0f172a)'};font-size:11.5px;font-weight:700;white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:5px"
                  onclick="setStrategicWizardStep(${s.num})">
            <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:${s.num===cur?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.06)'};font-size:10px">${fa(s.num)}</span>
            <span>${esc(s.title)}</span>
          </button>
        `).join('')}
      </div>

      <!-- بدنه محتوا -->
      <div style="padding:22px;overflow-y:auto;flex:1">
        ${bodyHtml}
      </div>

      <!-- فوتر و دکمه‌های ناوبری -->
      <div style="padding:14px 22px;border-top:1.5px solid var(--bdr,#e2e8f0);display:flex;align-items:center;justify-content:space-between;background:var(--bg-card,#f8fafc)">
        <div>
          ${cur>1?`<button class="btn btn-o btn-sm" onclick="setStrategicWizardStep(${cur-1})">◂ مرحله قبلی</button>`:''}
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-o btn-sm" onclick="saveStrategicWizardData(false)">💾 ذخیره پیش‌نویس</button>
          ${cur<8?`<button class="btn btn-g btn-sm" onclick="setStrategicWizardStep(${cur+1})">مرحله بعدی ▸</button>`:`<button class="btn btn-g btn-sm" onclick="saveStrategicWizardData(true)">✓ تصویب و اتمام ویزارد</button>`}
        </div>
      </div>

    </div>
  </div>`;

  let wrap = $('stratModalWrap');
  if(wrap) wrap.outerHTML = modalHtml;
  else document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function setStrategicWizardStep(step){
  saveStrategicWizardCurrentStepInputs();
  STRAT_WIZARD.step = Math.max(1, Math.min(8, step));
  renderStrategicWizardContent();
}

function saveStrategicWizardCurrentStepInputs(){
  const cur = STRAT_WIZARD.step;
  const d = STRAT_WIZARD.data;
  if(cur === 1){
    if($('sw_mission')) d.mission = $('sw_mission').value;
    if($('sw_vision')) d.vision = $('sw_vision').value;
    if($('sw_values')) d.values = $('sw_values').value;
    if($('sw_macro_goals')) d.macro_goals = $('sw_macro_goals').value;
  } else if(cur === 3){
    if($('sw_strengths')) d.swot.strengths = $('sw_strengths').value;
    if($('sw_weaknesses')) d.swot.weaknesses = $('sw_weaknesses').value;
    if($('sw_opportunities')) d.swot.opportunities = $('sw_opportunities').value;
    if($('sw_threats')) d.swot.threats = $('sw_threats').value;
  }
}
