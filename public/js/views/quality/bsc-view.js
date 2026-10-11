/**
 * Balanced Scorecard & Patient Survey
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function satrDrawProfile(){
  const host=$('satrProfile'); if(!host) return;
  const s=((SATR.data&&SATR.data.surveys)||[]).find(x=>String(x.id)===String(SATR.detail));
  if(!s){ host.innerHTML=''; return; }
  let sc={}; try{ sc=JSON.parse(s.scores||'{}'); }catch(e){ sc={}; }
  const SC_FA=['—','خیلی کم','کم','متوسط','زیاد','خیلی زیاد'];
  const secs=SURVEY_SECTIONS.map(sec=>{
    const arr=sc[sec.key]||[];
    const rows=sec.qs.map((q,i)=>{
      const v=arr[i];
      const cls = v==null?'' : v>=4?'satr-v-ok' : v>=3?'satr-v-mid' : 'satr-v-bad';
      return `<tr><td>${esc(q)}</td>
        <td class="${cls}" style="white-space:nowrap;text-align:center;font-weight:700">
          ${v==null?'<span class="rep-nil">بی‌پاسخ</span>':`${fa(v)} — ${esc(SC_FA[v]||'')}`}</td></tr>`;
    }).join('');
    const filled=sec.qs.map((q,i)=>arr[i]).filter(v=>v!=null);
    const avg=filled.length?Math.round(filled.reduce((a,b)=>a+b,0)/filled.length*10)/10:null;
    return `<div class="satr-psec"><div class="satr-psec-h">${esc(sec.title)}
      <span>${avg==null?'بی‌پاسخ':`میانگین ${fa(avg)} از ۵`}</span></div>
      <table class="satr-ptbl"><tbody>${rows}</tbody></table></div>`;
  }).join('');
  host.innerHTML=`<div class="ovl satr-ovl" onclick="if(event.target===this)satrClose()">
    <div class="panel g ocard satr-ocard">
      <div class="phd"><div class="abadge">◔</div>
        <div style="flex:1"><h3>پروفایل پاسخ نظرسنجی</h3>
          <div class="sub">${faDateISO(s.created_at)} · ${esc(s.respondent_type||'—')} · ${esc(s.patient_gender||'—')}</div></div>
        <button class="btn btn-o btn-sm" onclick="satrClose()">✕ بستن</button></div>
      <div class="pbody satr-obody">
        <div class="doc-dates" style="margin-bottom:14px">
          <div><span>امتیاز کلی</span><b>${s.overall_score!=null?fa(s.overall_score)+' از ۵':'—'}</b></div>
          <div><span>وضعیت پاسخ‌دهنده</span><b>${esc(s.respondent_type||'—')}</b></div>
          <div><span>جنسیت بیمار</span><b>${esc(s.patient_gender||'—')}</b></div>
          <div><span>انتخاب مجدد بیمارستان</span><b>${esc(s.would_return||'—')}</b></div>
        </div>
        ${secs}
        <div class="satr-psec"><div class="satr-psec-h">نظر نوشتاری</div>
          <div class="satr-cmbox">${(s.comment||'').trim()?esc(s.comment):'<span class="rep-nil">نظری نوشته نشده است</span>'}</div></div>
      </div>
      <div class="ofoot" style="justify-content:flex-end">
        <button class="btn btn-g btn-sm" onclick="satrClose()">بستن</button></div>
    </div></div>`;
}

// ==================== پیگیری بیمار و مادر باردار (مرحله‌ی ۶ نقشه‌راه) ====================
// «فهرست فراخوان» صفحه‌ی جدا نیست — همین صفحه با فیلترِ «فقط سررسیدها» (due=1).
// دو نوعِ پرونده (عمومی/مادر باردار) در یک فرم؛ فیلدهای بارداری فقط برای نوعِ
// «مادر باردار» نمایش داده می‌شوند.
let FUP = { list:[], filters:{status:'active', patient_type:'', due:'', search:''}, detailId:null, detail:null };

async function renderFollowup(){
  $('ptitle').textContent='پیگیری بیمار و مادر باردار';
  $('content').innerHTML=`
    <div class="panel g gold" style="margin-bottom:14px">
      <div class="pbody" style="padding:16px 20px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="fg" style="min-width:160px;margin-bottom:0"><label>وضعیت</label>
          <select id="fup_f_status" class="sel" onchange="fupApplyFilters()">
            <option value="active">در حالِ پیگیری</option>
            <option value="closed">بسته‌شده</option>
            <option value="all">همه</option>
          </select></div>
        <div class="fg" style="min-width:160px;margin-bottom:0"><label>نوع</label>
          <select id="fup_f_type" class="sel" onchange="fupApplyFilters()">
            <option value="">همه</option>
            <option value="general">بیمارِ عادی</option>
            <option value="pregnant">مادرِ باردار</option>
          </select></div>
        <div class="fg" style="min-width:220px;margin-bottom:0"><label>جست‌وجو (نام/تلفن/کد ملی/پرونده)</label>
          <input type="text" id="fup_f_search" class="inp" onkeydown="if(event.key==='Enter')fupApplyFilters()"></div>
        <label class="tgl" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="fup_f_due" onchange="fupApplyFilters()" style="width:auto"> فقط فهرستِ فراخوان (سررسیدِ امروز یا گذشته)
        </label>
        <button type="button" class="btn-g" style="padding:10px 22px;border:none;border-radius:12px;font-weight:800;font-size:12.5px;cursor:pointer" onclick="fupApplyFilters()">اعمال فیلتر</button>
        ${canManageFollowup()?`<button type="button" class="tgl gold" onclick="fupToggleNewForm()">+ پرونده‌ی جدید</button>`:''}
      </div>
    </div>
    <div id="fupNewForm"></div>
    <div id="fupBody"><div class="panel g"><div class="empty">در حال بارگذاری…</div></div></div>`;
  await fupLoadList();
}

function fupApplyFilters(){
  FUP.filters.status = $('fup_f_status').value;
  FUP.filters.patient_type = $('fup_f_type').value;
  FUP.filters.search = $('fup_f_search').value.trim();
  FUP.filters.due = $('fup_f_due').checked ? '1' : '';
  fupLoadList();
}

async function fupLoadList(){
  const body=$('fupBody'); if(!body) return;
  try{
    const {followups} = await API.followupList(FUP.filters);
    FUP.list = followups||[];
    fupDrawList();
  }catch(e){ body.innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function fupDrawList(){
  const body=$('fupBody'); if(!body) return;
  if(!FUP.list.length){ body.innerHTML='<div class="panel g"><div class="empty">پرونده‌ای با این فیلتر یافت نشد</div></div>'; return; }
  const tj=todayJalali(); const tg=toGregorian(tj.jy,tj.jm,tj.jd);
  const today = `${tg.gy}-${String(tg.gm).padStart(2,'0')}-${String(tg.gd).padStart(2,'0')}`;
  const rows = FUP.list.map(f=>{
    const overdue = f.next_visit_date && f.status==='active' && f.next_visit_date <= today;
    return `<tr style="cursor:pointer" onclick="fupOpenDetail('${f.id}')">
      <td>${esc(f.full_name)}${f.patient_type==='pregnant'?' <span class="bdg b2">مادر باردار</span>':''}</td>
      <td style="color:var(--td)">${esc(f.phone||'—')}</td>
      <td style="color:var(--td)">${esc(f.reason||'—')}</td>
      <td>${f.next_visit_date?`<span style="${overdue?'color:var(--dn);font-weight:800':''}">${faDateISO(f.next_visit_date)}</span>`:'—'}</td>
      <td style="color:var(--td)">${fa(f.contacts_count||0)}</td>
      <td>${f.status==='active'?'<span class="bdg b1">در حال پیگیری</span>':'<span class="bdg b3">بسته‌شده</span>'}</td>
    </tr>`;
  }).join('');
  body.innerHTML=`<div class="panel g">
    <div class="phd noprint"><div class="abadge">☎</div>
      <div style="flex:1"><h3>پرونده‌های پیگیری</h3>
        <div class="sub">${fa(FUP.list.length)} پرونده با فیلتر فعلی</div></div>
      <button class="btn btn-g btn-sm" onclick="printFollowup()">${ic('print')} چاپ فهرست</button>
    </div>
    <div class="pbody"><div class="tbl-wrap"><table><thead><tr>
    <th>بیمار</th><th>تلفن</th><th>دلیل پیگیری</th><th>مراجعه‌ی بعدی</th><th>تعداد تماس</th><th>وضعیت</th>
  </tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
}
// برگه‌ی فهرست پیگیری. شماره‌ی تلفن و کد ملی روی کاغذ نمی‌آید مگر همان تلفنی که
// برای تماس لازم است — این برگه دستِ کارکنانِ فراخوان است، نه سندِ بایگانی.
function printFollowup(){
  if(!FUP.list.length){ toast('با این فیلتر پرونده‌ای برای چاپ نیست',true); return; }
  const FUP_ST_FA={active:'در حال پیگیری', closed:'بسته‌شده'};
  printListSheet({
    page:'followup', title:'فهرست پیگیری بیمار و مادر باردار', code:'RPT-FUP',
    intro:'پرونده‌های پیگیری با دلیل، تاریخ مراجعه‌ی بعدی، تعداد تماس و وضعیت.',
    meta:activeFilters(FUP.filters,{status:'وضعیت',patient_type:'نوع پرونده',search:'جست‌وجو',due:'فقط سررسیدشده'}),
    headers:['بیمار','نوع','تلفن','دلیل پیگیری','مراجعه‌ی بعدی','تعداد تماس','وضعیت'],
    rows:FUP.list.map(f=>[esc(f.full_name), f.patient_type==='pregnant'?'مادر باردار':'بیمار عادی',
      esc(f.phone||'—'), esc(f.reason||'—'),
      f.next_visit_date?faDateISO(f.next_visit_date):'—',
      fa(f.contacts_count||0), FUP_ST_FA[f.status]||esc(f.status||'—')]),
    foot:'پیگیری بیمار',
  });
}

function fupToggleNewForm(){
  const box=$('fupNewForm');
  if(box.innerHTML){ box.innerHTML=''; return; }
  box.innerHTML=`<div class="panel g"><div class="phd"><b>پرونده‌ی پیگیریِ جدید</b></div>
    <div class="pbody" style="display:flex;flex-direction:column;gap:10px;max-width:520px">
      <div class="fg" style="margin-bottom:0"><label>نوع پرونده</label>
        <select id="fup_n_type" class="sel" onchange="document.getElementById('fup_n_pregnant').style.display=this.value==='pregnant'?'':'none'">
          <option value="general">بیمارِ عادی</option>
          <option value="pregnant">مادرِ باردار</option>
        </select></div>
      <div class="fg" style="margin-bottom:0"><label>نام و نام خانوادگی *</label><input type="text" id="fup_n_name" class="inp"></div>
      <div class="fg" style="margin-bottom:0"><label>تلفن</label><input type="text" id="fup_n_phone" class="inp" dir="ltr"></div>
      <div class="fg" style="margin-bottom:0"><label>کد ملی</label><input type="text" id="fup_n_nc" class="inp" dir="ltr"></div>
      <div class="fg" style="margin-bottom:0"><label>شماره پرونده</label><input type="text" id="fup_n_file" class="inp" dir="ltr"></div>
      <div class="fg" style="margin-bottom:0"><label>دلیل پیگیری</label><input type="text" id="fup_n_reason" class="inp"></div>
      <div id="fup_n_pregnant" style="display:none">
        <div class="fg" style="margin-bottom:8px"><label>تاریخ آخرین قاعدگی</label>${jalaliDateInputHtml('fup_n_lmp')}</div>
        <div class="fg" style="margin-bottom:0"><label>تاریخ تخمینیِ زایمان</label>${jalaliDateInputHtml('fup_n_edd')}</div>
      </div>
      <div class="fg" style="margin-bottom:0"><label>تاریخ مراجعه‌ی بعدی</label>${jalaliDateInputHtml('fup_n_visit')}</div>
      <div style="display:flex;gap:8px">
        <button class="btn-g" style="padding:10px 22px;border:none;border-radius:12px;font-weight:800;cursor:pointer" onclick="fupSubmitNew()">ثبت پرونده</button>
        <button class="tgl" onclick="fupToggleNewForm()">انصراف</button>
      </div>
    </div></div>`;
}

async function fupSubmitNew(){
  const full_name=$('fup_n_name').value.trim();
  if(!full_name){ toast('نام بیمار الزامی است',true); return; }
  const type=$('fup_n_type').value;
  const body={
    patient_type: type, full_name,
    phone: $('fup_n_phone').value.trim()||null,
    national_code: $('fup_n_nc').value.trim()||null,
    file_number: $('fup_n_file').value.trim()||null,
    reason: $('fup_n_reason').value.trim()||null,
    next_visit_date: readJalaliDateInput('fup_n_visit'),
  };
  if(type==='pregnant'){
    body.lmp_date = readJalaliDateInput('fup_n_lmp');
    body.edd_date = readJalaliDateInput('fup_n_edd');
  }
  try{
    await API.followupCreate(body);
    toast('پرونده ثبت شد');
    fupToggleNewForm();
    fupLoadList();
  }catch(e){ toast(e.message,true); }
}

async function fupOpenDetail(id){
  FUP.detailId=id;
  const box=$('fupBody');
  box.innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    const [{contacts}] = await Promise.all([API.followupContacts(id)]);
    const f = FUP.list.find(x=>x.id===id);
    FUP.detail = { f, contacts };
    fupDrawDetail();
  }catch(e){ box.innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function fupDrawDetail(){
  const box=$('fupBody'); if(!box || !FUP.detail) return;
  const {f, contacts} = FUP.detail;
  const METHOD_FA={call:'تماس تلفنی', sms:'پیامک', visit:'مراجعه‌ی حضوری', other:'سایر'};
  const timeline = contacts.length ? contacts.map(c=>`
    <div class="gwid-row" style="margin-bottom:8px">
      <div class="gwid-row-b">
        <div class="gwid-row-t">${esc(METHOD_FA[c.method]||c.method)} — ${esc(c.contacted_by_name||'')}
          <span class="duty-cad">${faDateTime(c.contacted_at)}</span></div>
        ${c.outcome?`<div class="gwid-row-d">${esc(c.outcome)}</div>`:''}
        ${c.next_action?`<div class="gwid-prog">اقدام بعدی: ${esc(c.next_action)}</div>`:''}
      </div>
    </div>`).join('') : '<div class="empty">هنوز تماسی ثبت نشده</div>';
  box.innerHTML=`<div class="panel g"><div class="phd">
      <div><h3>${esc(f?.full_name||'')}${f?.patient_type==='pregnant'?' <span class="bdg b2">مادر باردار</span>':''}</h3>
      <div class="sub">${esc(f?.reason||'')}${f?.phone?' — تلفن: '+esc(f.phone):''}${f?.next_visit_date?' — مراجعه‌ی بعدی: '+faDateISO(f.next_visit_date):''}</div></div>
    </div>
    <div class="pbody">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn-g" style="padding:8px 16px;border:none;border-radius:10px;font-weight:700;cursor:pointer" onclick="fupBackToList()">‹ بازگشت به فهرست</button>
        ${canManageFollowup() && f?.status==='active'?`<button class="tgl" onclick="fupCloseRecord('${f.id}')">بستن پرونده</button>`:''}
      </div>
      ${canManageFollowup()?`<div class="panel g" style="margin-bottom:16px"><div class="phd"><b>ثبتِ تماسِ جدید</b></div>
        <div class="pbody" style="display:flex;flex-direction:column;gap:10px;max-width:480px">
          <div class="fg" style="margin-bottom:0"><label>نوع تماس</label>
            <select id="fup_c_method" class="sel">
              <option value="call">تماس تلفنی</option>
              <option value="sms">پیامک</option>
              <option value="visit">مراجعه‌ی حضوری</option>
              <option value="other">سایر</option>
            </select></div>
          <div class="fg" style="margin-bottom:0"><label>نتیجه</label><input type="text" id="fup_c_outcome" class="inp"></div>
          <div class="fg" style="margin-bottom:0"><label>اقدام بعدی</label><input type="text" id="fup_c_next" class="inp"></div>
          <div class="fg" style="margin-bottom:0"><label>به‌روزرسانیِ تاریخ مراجعه‌ی بعدی (اختیاری)</label>${jalaliDateInputHtml('fup_c_visit')}</div>
          <button class="btn-g" style="padding:10px 22px;border:none;border-radius:12px;font-weight:800;cursor:pointer" onclick="fupSubmitContact('${f.id}')">ثبت</button>
        </div></div>`:''}
      <div class="panel g"><div class="phd"><b>تاریخچه‌ی تماس‌ها</b></div><div class="pbody">${timeline}</div></div>
    </div></div>`;
}

function fupBackToList(){ FUP.detail=null; fupDrawList(); }

async function fupSubmitContact(id){
  const method=$('fup_c_method').value;
  const body={ method, outcome:$('fup_c_outcome').value.trim()||null, next_action:$('fup_c_next').value.trim()||null };
  // فیلد تاریخِ مراجعه‌ی بعدی اختیاری است؛ اگر کاربر دست نزده باشد چیزی به بدنه اضافه نمی‌شود
  // تا next_visit_date موجود پاک نشود (undefined یعنی «دست‌نخورده بماند»، نه «خالی شود»).
  try{
    const wantsVisitUpdate = await BTN.confirm('آیا تاریخ مراجعه‌ی بعدی هم به‌روزرسانی شود؟');
    if(wantsVisitUpdate) body.next_visit_date = readJalaliDateInput('fup_c_visit');
    const r = await API.followupAddContact(id, body);
    if(method==='sms' && r.sms && !r.sms.delivered) toast('پیامک تنظیم نشده — فقط در تاریخچه ثبت شد',true);
    else toast('ثبت شد');
    await fupOpenDetail(id);
  }catch(e){ toast(e.message,true); }
}

async function fupCloseRecord(id){
  if(!await BTN.confirmDanger('این پرونده بسته شود؟')) return;
  try{ await API.followupUpdate(id, {status:'closed'}); toast('پرونده بسته شد'); fupOpenDetail(id); fupLoadList(); }
  catch(e){ toast(e.message,true); }
}

let BSC={data:null, year:null, canManage:false, editing:null};
const canViewBsc = () => { const p=S.user?.permissions||[]; return p.includes('view_bsc')||p.includes('manage_bsc'); };
const BSC_CELL_COLOR={ok:'var(--ok)', warn:'var(--wr)', down:'var(--dn)'};

async function renderBsc(){
  $('ptitle').textContent='کارت امتیازی متوازن (BSC)';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  // سالِ صفحه از انتخابگرِ سالِ بالای صفحه می‌آید، نه از یک انتخابگر دومِ
  // داخل پنل. باگ گزارش‌شده دقیقاً همین بود: کاربر سال بالا را ۱۴۰۴ می‌کرد و
  // BSC که حالت سالِ خودش را داشت، همچنان ۱۴۰۵ نشان می‌داد.
  BSC.year = S.year || BSC.year;
  try{
    const d=await API.bsc(BSC.year||undefined);
    BSC.data=d; BSC.year=d.year; BSC.canManage=!!d.can_manage;
    // اگر سرور سال دیگری برگرداند (خارج از بازه‌ی مجاز)، انتخابگر بالا هم
    // همان را نشان دهد تا عنوان و فیلتر هرگز از هم جدا نیفتند.
    if(S.year !== d.year){ S.year = d.year; try{ localStorage.setItem('sel_year', d.year); }catch(e){} }
    drawBsc();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function bscYearOptions(){
  const cur=todayJalali().jy;
  let h='';
  for(let y=cur+1;y>=cur-4;y--) h+=`<option value="${y}" ${y===BSC.year?'selected':''}>${fa(y)}</option>`;
  return h;
}

function bscCell(ind, mi){
  const v=ind.months[mi], st=ind.month_status[mi];
  const col=BSC_CELL_COLOR[st]||'';
  const txt=v===null?'—':fa(v);
  const click=BSC.canManage?` onclick="editBscCell('${ind.id}',${mi+1})" style="cursor:pointer;${col?'color:'+col+';font-weight:700':''}" title="کلیک برای ثبت مقدار"`
                           :(col?` style="color:${col};font-weight:700"`:'');
  return `<td class="bsc-c"${click}>${txt}</td>`;
}

function drawBsc(){
  const d=BSC.data;
  const months=d.months_fa;
  const total=d.perspectives.reduce((a,p)=>a+p.indicators.length,0);
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">▦</div>
      <div style="flex:1"><h3>کارت امتیازی متوازن — سال ${fa(d.year)}</h3>
      <div class="sub">${fa(total)} شاخص در ${fa(d.perspectives.length)} وجه — رنگ هر خانه از مقایسه با تارگت و جهت مطلوب شاخص می‌آید</div></div>
      <div class="fg" style="margin:0;min-width:120px"><label>سال شمسی</label>
        <span class="bsc-yr">${fa(BSC.year)}</span>
        <span class="bsc-yr-h">سال از نوار بالای صفحه انتخاب می‌شود</span></div>
      <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="printBsc()">${ic('print')} چاپ</button>
      <a class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" href="${API.bscExportUrl(d.year)}"
         download="bsc-${d.year}.csv">⤓ خروجی اکسل (CSV)</a>
      <a class="btn btn-g btn-sm" style="align-self:end;margin-bottom:1px" href="/api/export/bsc.xlsx?year=${d.year}"
         download="bsc-${d.year}.xlsx">⤓ خروجی xlsx</a>
    </div>
    <div class="pbody">
      <div class="bsc-lg">
        <span><i style="background:var(--ok)"></i>در حد تارگت یا بهتر</span>
        <span><i style="background:var(--wr)"></i>تا ۱۰٪ فاصله با تارگت</span>
        <span><i style="background:var(--dn)"></i>بیش از ۱۰٪ فاصله با تارگت</span>
        ${BSC.canManage?'<span class="sub">برای ثبت مقدار روی خانهٔ ماه کلیک کنید</span>':''}
      </div>
      ${d.perspectives.map(p=>`
        <div class="bsc-p">
          <div class="bsc-ph">وجه ${esc(p.perspective)}<span class="cnt">${fa(p.indicators.length)}</span></div>
          ${!p.indicators.length?'<div class="empty" style="padding:14px">شاخصی در این وجه تعریف نشده است</div>':`
          <div class="tbl-wrap"><table class="bsc-t">
            <thead><tr><th style="min-width:190px">عنوان شاخص</th><th>واحد</th><th>تارگت</th>
              ${months.map(m=>`<th>${m}</th>`).join('')}<th>میانگین</th>${BSC.canManage?'<th></th>':''}</tr></thead>
            <tbody>${p.indicators.map(i=>`<tr>
              <td style="color:var(--th)">${esc(i.title)}
                <span class="tsub">${i.higher_is_better?'بیشتر بهتر':'کمتر بهتر'}${i.recorded_count?` — ${fa(i.recorded_count)} ماه ثبت‌شده`:' — بدون اندازه‌گیری'}</span></td>
              <td>${esc(i.unit||'—')}</td>
              <td><b>${i.target===null?'—':fa(i.target)}</b></td>
              ${months.map((m,mi)=>bscCell(i,mi)).join('')}
              <td style="${i.average_status?'color:'+BSC_CELL_COLOR[i.average_status]+';font-weight:700':''}">${i.average===null?'—':fa(i.average)}</td>
              ${BSC.canManage?`<td><button class="tgl" onclick="editBscIndicator('${i.id}')">تنظیم</button></td>`:''}
            </tr>`).join('')}</tbody></table></div>`}
        </div>`).join('')}
    </div>
  </div>`;
}
// تنها یک «سال جاری» در کل برنامه وجود دارد. هر تغییری از این تابع هم
// همان را عوض می‌کند تا دو منبع حقیقت نداشته باشیم.
function setBscYear(y){ setYear(+y); }

async function editBscCell(kpiId, month){
  openBscCellModal(kpiId, month);
}
function openBscCellModal(kpiId, month){
  const ind=bscFindIndicator(kpiId); if(!ind) return;
  const cur=ind.months[month-1];
  const mName=BSC.data.months_fa[month-1];
  let overlay=$('bscModalOverlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='bscModalOverlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML=`
  <div class="panel g gold" style="max-width:440px;width:100%;border-radius:18px;box-shadow:var(--shadow-card);padding:20px;border:1px solid var(--bds)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-weight:800;font-size:15px;color:var(--th)">ثبت مقدار شاخص BSC</div>
      <button class="btn btn-o btn-sm" onclick="$('bscModalOverlay').remove()" style="padding:2px 8px;font-size:12px">✕</button>
    </div>
    <div style="margin-bottom:12px;font-size:13.5px;color:var(--gdl);font-weight:700">${esc(ind.title)}</div>
    <div style="display:flex;gap:8px;font-size:12px;color:var(--tm);margin-bottom:14px;background:rgba(255,255,255,.04);padding:8px 12px;border-radius:10px">
      <span>ماه: <b>${esc(mName)} ${fa(BSC.year)}</b></span>
      <span>•</span>
      <span>تارگت: <b>${ind.target===null?'تعیین‌نشده':fa(ind.target)} ${esc(ind.unit||'')}</b></span>
      <span>•</span>
      <span><b>${ind.higher_is_better?'بیشتر مطلوب':'کمتر مطلوب'}</b></span>
    </div>
    <div class="fg" style="margin-bottom:14px">
      <label>مقدار اندازه‌گیری‌شده ${ind.unit?'('+esc(ind.unit)+')':''}</label>
      <input type="number" step="any" id="bsc_cell_val_input" class="dsearch" style="font-size:15px;text-align:center;font-weight:700;padding:10px"
             value="${cur===null?'':cur}" placeholder="خالی بگذارید تا حذف شود">
      <div style="font-size:11px;color:var(--mut);margin-top:4px">برای پاک‌کردن مقدار، کادر را خالی بگذارید و ذخیره کنید.</div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-g" id="bsc_cell_save_btn">💾 ثبت و محاسبه</button>
      <button class="btn btn-o" onclick="$('bscModalOverlay').remove()">انصراف</button>
    </div>
  </div>`;
  const input=$('bsc_cell_val_input');
  if(input){
    input.focus();
    input.select();
    input.onkeydown=(e)=>{ if(e.key==='Enter') $('bsc_cell_save_btn').click(); };
  }
  $('bsc_cell_save_btn').onclick=async()=>{
    const v=input.value.trim();
    try{
      await API.setBscValue({kpi_id:kpiId, jalali_year:BSC.year, jalali_month:month, value:v});
      toast('مقدار ماه با موفقیت ثبت و محاسبه شد');
      overlay.remove();
      renderBsc();
    }catch(e){ toast(e.message,true); }
  };
}
function bscFindIndicator(id){
  for(const p of (BSC.data?.perspectives||[])){ const f=p.indicators.find(i=>i.id===id); if(f) return f; }
  return null;
}
async function editBscIndicator(id){
  openBscIndicatorModal(id);
}
