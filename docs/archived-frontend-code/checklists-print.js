/**
 * Quality Checklists Print Sheet
 * Modular Frontend Component — Project 313
 */
// ==================== برگه‌ی چاپیِ فهرست ====================
// بازبینیِ سراسری نشان داد شش ماژول (برنامه‌های بهبود، ممیزی داخلی، خطاها، FMEA،
// آموزش و کارت امتیازی) مدل داده‌ی کاملی دارند ولی هیچ خروجی کاغذی ندارند — در
// حالی که ارزیاب سرِ میز کاغذ می‌خواهد، نه اسکرول کردنِ صفحه. ساختنِ برگه‌ی
// جداگانه برای هر کدام یعنی شش‌بار تکرارِ همان سربرگ/پانویس/شناسنامه؛ پس یک
// سازنده‌ی مشترک نوشته شد و هر ماژول فقط ستون‌ها و سطرهایش را می‌دهد.
//
// چرا «فهرست» و نه «برگه‌ی تک‌رکورد»: خواسته‌ی کتاب در این شش ماژول گزارشِ دوره‌ای
// است، نه فرمِ تکی — «تهیه گزارشات تحلیلی حاصل از نتایج پایش و ارائه به تیم
// رهبری» (الف-۱-۱۰-۲). فیلترهای فعالِ صفحه هم روی برگه نوشته می‌شوند، وگرنه
// معلوم نیست این فهرست از کجا آمده و کدام بازه را پوشش می‌دهد.
let PRINTV=null;   // {back:'programs'} — برای بازگشت به همان صفحه
// گزارشِ ۱۱ ستونی روی A4 عمودی از کاغذ بیرون می‌زند — در رندر واقعی دیده شد که
// دو ستون آخر (وضعیت و تأییدکننده) بریده می‌شدند. `overflow-x:auto` فقط روی
// صفحه‌ی نمایش کار می‌کند و روی کاغذ هیچ کاری نمی‌کند. راه‌حل همان کاری است که
// هر کسی در اکسل می‌کند: کاغذ افقی. `@page` را نمی‌شود به یک عنصر محدود کرد، پس
// همان لحظه‌ای که برگه‌ی پهن ساخته می‌شود یک استایل تزریق و موقع خروج برداشته
// می‌شود — بدون این، بقیه‌ی چاپ‌های سامانه هم افقی می‌شدند.
function setLandscape(on){
  const id='plLandscape';
  const cur=document.getElementById(id);
  if(!on){ if(cur) cur.remove(); return; }
  if(cur) return;
  const st=document.createElement('style');
  // حاشیه صفر، به همان دلیلِ @page اصلی: هر حاشیه‌ای که به مرورگر بدهیم، عنوانِ
  // صفحه و تاریخ/ساعت را داخلش چاپ می‌کند. حاشیه‌ی واقعی را برگه خودش می‌گذارد.
  st.id=id; st.textContent='@media print{@page{size:A4 landscape;margin:0}}';
  document.head.appendChild(st);
}
/* برگه‌ی رسمی هنگام چاپ از دلِ پوسته‌ی اپ بیرون کشیده می‌شود.
   ---------------------------------------------------------------------------
   کارفرما گزارش داد صفحه‌ی اولِ چاپ سفید درمی‌آید. با رندر واقعیِ PDF بازتولید و
   با حذفِ تک‌تکِ قاعده‌ها ریشه‌یابی شد: هیچ‌کدام از حاشیه‌ها و padding‌ها مقصر
   نبودند — تنها آزمایشی که صفحه‌ی اول را از «صفر نویسه» درآورد، بلوکی‌کردنِ
   پوسته بود. یعنی علت این است که برگه یک flex item است، و کروم یک flex item را
   وسطِ خودش نمی‌شکند؛ وقتی برگه بلندتر از یک صفحه باشد، کل آن را به صفحه‌ی بعد
   هل می‌دهد و صفحه‌ی اول خالی می‌ماند.

   همان درمانی که برای برنامه‌ی شیفت جواب داد این‌جا هم به‌کار می‌رود و به‌جای
   جنگیدن با ارث‌بریِ CSS، ریشه‌ی مشکل را برمی‌دارد: برگه مستقیم زیر <body>
   می‌رود و #root پنهان می‌شود. با این کار هیچ ظرفِ میانی‌ای — نه flex، نه
   position، نه عرضِ پنجره — روی صفحه‌بندی اثر ندارد.

   خروج هم روی afterprint بسته می‌شود، وگرنه بعد از بستنِ پنجره‌ی چاپ کاربر یک
   صفحه‌ی خالی می‌دید. beforeprint هم گوش داده می‌شود تا Ctrl+P هم همین مسیر را
   برود، نه فقط دکمه‌ی چاپِ خودمان. */
let DP_MOVED = null, DP_MARK = null;
function dpEnter(){
  if(DP_MOVED) return;
  if(document.body.classList.contains('ss-printing')||document.body.classList.contains('fc-printing')) return;
  const el=document.querySelector('#content .docprint');
  if(!el||el.parentNode===document.body) return;
  DP_MARK=document.createComment('docprint');
  el.parentNode.insertBefore(DP_MARK,el);
  document.body.appendChild(el);
  DP_MOVED=el;
  document.body.classList.add('dp-printing');
}
function dpExit(){
  if(!DP_MOVED) return;
  if(DP_MARK&&DP_MARK.parentNode) DP_MARK.parentNode.insertBefore(DP_MOVED,DP_MARK);
  if(DP_MARK) DP_MARK.remove();
  DP_MOVED=null; DP_MARK=null;
  document.body.classList.remove('dp-printing');
}
function dpPrint(){ dpEnter(); window.print(); setTimeout(dpExit,400); }
window.addEventListener('beforeprint',dpEnter);
window.addEventListener('afterprint',dpExit);

function printListSheet({page, title, code, intro, meta, headers, rows, foot}){
  PRINTV={page};
  // آستانه‌ی ۸ ستون تجربی است: تا هفت ستون روی A4 عمودی خوانا می‌ماند
  const wide=headers.length>=8;
  setLandscape(wide);
  $('ptitle').textContent=title;
  $('content').innerHTML=`
  <div class="panel g docprint${wide?' pl-wide':''}">
    <div class="phd noprint"><div class="abadge">▤</div>
      <div style="flex:1"><h3>${esc(title)}</h3><div class="sub">${fa(rows.length)} ردیف — آماده‌ی چاپ</div></div>
      <button class="btn btn-o btn-sm" onclick="go('${page}')">◂ بازگشت</button>
      <button class="btn btn-g btn-sm" onclick="dpPrint()">${ic('print')} چاپ</button>
    </div>
    <div class="pbody">
      <table class="psheet">
      <thead><tr><td>${docLetterhead(`${esc(title)} — ${esc(code)}`)}</td></tr></thead>
      <tfoot><tr><td><div class="psheet-foot">
        <span>${esc((S.user&&S.user.hospital_name)||'')}</span>
        <span>${esc(code)} · ${esc(foot||title)}</span>
      </div></td></tr></tfoot>
      <tbody><tr><td>
        <h3 style="margin:0 0 4px">${esc(title)}</h3>
        ${intro?`<div style="font-size:12px;color:var(--td);margin-bottom:12px">${esc(intro)}</div>`:''}
        <div class="doc-dates">
          <div><span>تاریخ تهیه گزارش</span><b>${faDateISO(todayISO())}</b></div>
          <div><span>تهیه‌کننده</span><b>${esc((S.user&&S.user.full_name)||'—')}</b></div>
          <div><span>سال کاری</span><b>${fa(S.year)}</b></div>
          <div><span>تعداد ردیف</span><b>${fa(rows.length)}</b></div>
        </div>
        ${meta&&meta.length?`<div class="doc-dates" style="margin-top:8px">
          ${meta.map(([l,v])=>`<div><span>${esc(l)}</span><b>${esc(fa(v))}</b></div>`).join('')}</div>`:''}
        ${!rows.length?'<div class="empty">ردیفی برای چاپ نیست</div>':`
        <div class="tbl-wrap" style="margin-top:12px"><table>
          <thead><tr><th>#</th>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r,i)=>`<tr><td>${fa(i+1)}</td>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`}
        <div class="chksign">
          <div><span>نام و امضای تهیه‌کننده</span><i></i></div>
          <div><span>نام و امضای تأییدکننده</span><i></i></div>
        </div>
      </td></tr></tbody></table>
    </div>
  </div>`;
}
// فیلترهای فعالِ صفحه، برای نوشتن روی برگه. فیلترِ خالی روی کاغذ نمی‌آید.
function activeFilters(filters, labels){
  return Object.entries(filters||{}).filter(([k,v])=>v&&labels[k]).map(([k,v])=>[labels[k], String(v)]);
}

function printPrograms(){
  printListSheet({
    page:'programs', title:'گزارش برنامه‌های بهبود، عملیاتی و استراتژیک', code:'RPT-PRG',
    intro:'فهرست برنامه‌های ثبت‌شده با پیشنهاددهنده، درصد پیشرفت، مهلت و وضعیت تأیید.',
    meta:activeFilters(PRG.filters,{type:'نوع برنامه',status:'وضعیت',department:'بخش/واحد',q:'جست‌وجو'}),
    headers:['عنوان برنامه','نوع','بخش/واحد','پیشنهاددهنده','هدف استراتژیک','شروع','مهلت','پیشرفت','وضعیت','تأییدکننده'],
    rows:PRG.list.map(p=>[esc(p.title), esc(p.program_type||'—'), esc(p.department||'—'),
      esc(p.proposed_by_name||'—'), esc(p.strategic_goal||'—'),
      p.start_date?faDateISO(p.start_date):'—', p.due_date?faDateISO(p.due_date):'—',
      fa(p.progress_percent||0)+'٪', PROG_STATUS_FA[p.status]||esc(p.status||'—'),
      esc(p.approved_by_name||'—')]),
    foot:'برنامه‌های بهبود',
  });
}
function printAudits(){
  printListSheet({
    page:'audits', title:'گزارش ممیزی‌های داخلی', code:'RPT-AUD',
    intro:'فهرست ممیزی‌های داخلی با بخش ممیزی‌شده، تاریخ، نتیجه و وضعیت پیگیری.',
    meta:activeFilters(AUD.filters,{status:'وضعیت',department:'بخش ممیزی‌شده',q:'جست‌وجو'}),
    headers:['عنوان ممیزی','بخش ممیزی‌شده','تاریخ','نتیجه','وضعیت'],
    rows:AUD.list.map(a=>[esc(a.title), esc(a.audited_department||'—'),
      a.audit_date?faDateISO(a.audit_date):'—',
      String(audScore(a)).replace(/<[^>]*>/g,''), AUD_STATUS_FA[a.status]||esc(a.status||'—')]),
    foot:'ممیزی داخلی',
  });
}
function printErrors(){
  printListSheet({
    page:'errors', title:'گزارش خطاها و وقایع ناخواسته', code:'RPT-ERR',
    intro:'فهرست خطاهای گزارش‌شده با کد رهگیری، بخش، شدت و وضعیت بررسی. هویت گزارش‌دهنده روی این برگه نمی‌آید.',
    meta:activeFilters(MER.filters,{evaluation_status:'وضعیت بررسی'}),
    headers:['کد رهگیری','شرح خطا','بخش','شدت','وضعیت بررسی','تاریخ ثبت'],
    rows:MER.list.map(r=>[esc(r.tracking_code||'—'), esc(r.description||'—'),
      esc(r.error_ward||'—'), esc(r.severity||'—'), esc(r.evaluation_status||'—'),
      r.created_at?faDateISO(r.created_at):'—']),
    foot:'خطاها و وقایع',
  });
}
function printFmea(){
  printListSheet({
    page:'fmea', title:'گزارش عوامل تهدیدکننده ایمنی بیمار (FMEA)', code:'RPT-FMEA',
    intro:'تحلیل ریسکِ پیش‌نگر — خطر بالقوه، نه رخداد واقع‌شده.',
    meta:activeFilters(FME.filters,{status:'وضعیت',q:'جست‌وجو'}),
    headers:['موضوع','واحد گزارش‌دهنده','حیطه خطر','دسته‌بندی','منبع ثبت','وضعیت'],
    rows:FME.list.map(r=>[esc(r.subject), esc(r.reporting_department||'—'),
      esc(r.related_hazard_area||'—'), esc(r.hazard_type||'—'),
      r.source==='public'?'فرم عمومی':'داخلی', FMEA_ST_FA[r.status]||esc(r.status||'—')]),
    foot:'FMEA',
  });
}
function printTraining(){
  printListSheet({
    page:'training', title:'گزارش نیازسنجی آموزشی کارکنان', code:'RPT-TRN',
    intro:'فهرست نیازهای آموزشی ثبت‌شده با نظر مافوق و تصمیم سازمان.',
    meta:activeFilters(TRN.filters,{status:'وضعیت',department:'بخش/واحد',q:'جست‌وجو'}),
    headers:['عنوان نیاز آموزشی','نوع','بخش/واحد','سال','درخواست‌دهنده','مافوق','وضعیت'],
    rows:TRN.list.map(n=>[esc(n.title), esc(n.requested_course_type||'—'),
      esc(n.department||'—'), fa(n.year||'—'), esc(n.employee_name||'—'),
      esc(n.superior_name||'تعیین‌نشده'), TRN_STATUS_FA[n.status]||esc(n.status||'—')]),
    foot:'نیازسنجی آموزشی',
  });
}
// کارت امتیازی درختِ «وجه ← شاخص ← دوازده ماه» است، نه فهرستِ ساده. ستون‌های
// ماهانه روی کاغذ می‌مانند چون همان چیزی‌اند که تیم رهبری در جلسه نگاه می‌کند؛
// وجه به‌جای سرستونِ جداگانه، ستونِ اول هر سطر می‌شود تا یک جدول بماند و روی A4
// نشکند.
function printBsc(){
  const d=BSC.data;
  if(!d){ toast('اول کارت امتیازی را باز کنید',true); return; }
  const months=d.months_fa||[];
  const rows=[];
  for(const p of (d.perspectives||[])){
    for(const i of (p.indicators||[])){
      rows.push([esc(p.perspective), esc(i.title), esc(i.unit||'—'),
        i.target===null?'—':fa(i.target),
        ...months.map((m,mi)=>{ const v=(i.months||[])[mi]; return v==null?'—':fa(v); }),
        i.average==null?'—':fa(i.average),
        i.higher_is_better?'بیشتر بهتر':'کمتر بهتر']);
    }
  }
  printListSheet({
    page:'bsc', title:`گزارش کارت امتیازی متوازن — سال ${fa(d.year||BSC.year||S.year)}`, code:'RPT-BSC',
    intro:'شاخص‌های کارت امتیازی متوازن به تفکیک وجه، با تارگت، مقدار هر ماه و میانگین سال.',
    meta:[['سال گزارش', String(d.year||BSC.year||S.year)],
          ['تعداد وجه', String((d.perspectives||[]).length)],
          ['تعداد شاخص', String(rows.length)]],
    headers:['وجه','عنوان شاخص','واحد','تارگت', ...months, 'میانگین','جهت مطلوب'],
    rows, foot:'کارت امتیازی متوازن',
  });
}

function printWalkarounds(){
  const s=WA.sum||{}, t=s.totals||{};
  printListSheet({
    page:'walkarounds', title:'گزارش بازدیدهای میدانی مدیریتی', code:'RPT-WLK',
    intro:'فهرست بازدیدهای میدانی با بخش بازدیدشده، بازدیدکننده، و درصد اجرای مصوبه‌های هر بازدید.',
    meta:[...activeFilters(WA.filters,{status:'وضعیت بازدید',department:'بخش بازدیدشده',q:'جست‌وجو'}),
      ['کل مصوبه‌ها', String(t.total||0)],
      ['درصد اجرای مصوبه‌ها', (t.completion_pct||0)+'٪'],
      ['معوق', String(t.overdue||0)]],
    headers:['عنوان بازدید','بخش بازدیدشده','تاریخ','بازدیدکننده','حاضران','مصوبه‌ها','اجراشده','درصد اجرا','وضعیت'],
    rows:WA.list.map(w=>{
      const pct=w.resolution_count?Math.round(w.resolution_done_count/w.resolution_count*100):0;
      return [esc(w.title), esc(w.department||'—'),
        w.visit_date?faDateISO(w.visit_date):'—', esc(w.conducted_by_name||'—'),
        esc(safeList(w.attendees).join('، ')||'—'),
        fa(w.resolution_count||0), fa(w.resolution_done_count||0),
        w.resolution_count?fa(pct)+'٪':'—',
        WA_STATUS_FA[w.status]||esc(w.status||'—')];
    }),
    foot:'بازدید میدانی',
  });
}
// نظرسنجی یک «فهرست» ساده نیست: هم خلاصه‌ی آماری دارد هم پاسخ‌های تک‌تک. برگه هر
// دو را نگه می‌دارد — میانگینِ هر محور در نوار شناسنامه (چون همان چیزی است که در
// جلسه‌ی رهبری خوانده می‌شود) و پاسخ‌ها در جدول. متن آزادِ بیمار عمداً می‌ماند:
// خودِ همان جمله‌هاست که ارزیاب دنبالش می‌گردد.
function printSatisfaction(){
  const d=SATR.data;
  if(!d||!d.total){ toast('در این بازه پاسخی برای چاپ نیست',true); return; }
  const retTotal=(d.would_return.yes||0)+(d.would_return.no||0);
  const meta=[['میانگین کلی رضایت', (d.overall_average!=null?d.overall_average:'—')+' از ۵'],
    ['تعداد پاسخ‌ها', String(d.total)],
    ['انتخاب مجدد بیمارستان', retTotal?Math.round(d.would_return.yes/retTotal*100)+'٪':'—']];
  // میانگین محورها از همان منبعی که صفحه استفاده می‌کند (SURVEY_SECTIONS)، تا
  // ترتیب و عنوان‌ها روی کاغذ با آنچه کاربر دیده یکی باشد
  for(const sec of (typeof SURVEY_SECTIONS!=='undefined'?SURVEY_SECTIONS:[])){
    const avg=(d.section_averages||{})[sec.key]?.section_average;
    if(avg!=null) meta.push([sec.title, String(avg)+' از ۵']);
  }
  printListSheet({
    page:'satisfaction', title:'گزارش نظرسنجی رضایت گیرندگان خدمت', code:'RPT-SAT',
    intro:'میانگین هر محور و متن پاسخ‌های ثبت‌شده. هویت پاسخ‌دهنده ثبت و چاپ نمی‌شود.',
    meta,
    headers:['تاریخ','وضعیت پاسخ‌دهنده','جنسیت','انتخاب مجدد','امتیاز کلی','توضیحات'],
    rows:(d.surveys||[]).map(s=>[
      esc(s.created_at?faDateISO(s.created_at.slice(0,10)):'—'), esc(s.respondent_type||'—'),
      esc(s.patient_gender||'—'), esc(s.would_return||'—'),
      s.overall_score!=null?fa(s.overall_score):'—', esc(s.comment||'—')]),
    foot:'نظرسنجی رضایت',
  });
}



// چاپ برگه‌ی خام ارزیابی میدانی — برای ارزیابی کاغذی در بخش‌ها و روز اعتباربخشی
async function printBlankChecklist(id){
  try {
    let c = CHK.current && CHK.current.id === id ? CHK.current : null;
    if (!c || !CHK.domains || !CHK.items) {
      const r = await API.checklist(id);
      c = r.checklist;
      CHK.current = c;
      CHK.domains = (r.domains || []).map(d => ({ id: d.id, title: d.title, items: d.items || [] }));
      CHK.items = r.items || [];
    }
    const code = c.checklist_code || 'بدون کد';
    const groups = typeof chkAllGroups === 'function' ? chkAllGroups() : (CHK.domains || []).map(d => ({ title: d.title, items: d.items || [] }));
    if (CHK.items && CHK.items.length && typeof chkAllGroups !== 'function') {
      groups.push({ title: null, items: CHK.items });
    }
    const pd = c.parent_document;

    $('ptitle').textContent = 'برگه خام ارزیابی — ' + c.title;
    $('content').innerHTML = `
    <div class="panel g docprint">
      <div class="phd noprint"><div class="abadge">✓</div>
        <div style="flex:1"><h3>برگه خام ارزیابی میدانی: ${esc(c.title)}</h3>
        <div class="sub">${esc(code)} · آماده چاپ جهت تکمیل دستی و ارزیابی میدانی</div></div>
        <button class="btn btn-o btn-sm" onclick="openChecklist('${c.id}')">◂ بازگشت</button>
        <button class="btn btn-g btn-sm" onclick="dpPrint()">${ic('print')} چاپ برگه خام</button>
      </div>
      <div class="pbody">
        <table class="psheet">
        <thead><tr><td>${docLetterhead(`برگه ارزیابی میدانی (خام) — ${esc(code)}`)}</td></tr></thead>
        <tfoot><tr><td><div class="psheet-foot">
          <span>${esc((S.user && S.user.hospital_name) || '')}</span>
          <span>${esc(code)} · ${esc(c.title)}</span>
        </div></td></tr></tfoot>
        <tbody><tr><td>
          <h3 style="margin:0 0 6px;text-align:center">${esc(c.title)}</h3>
          ${c.purpose ? `<div style="font-size:12px;color:var(--td);margin-bottom:12px;text-align:center">${esc(c.purpose)}</div>` : ''}

          <!-- شناسنامه و کنترل سند -->
          <div class="doc-dates" style="margin-bottom:10px">
            <div><span>کد چک‌لیست</span><b>${esc(code)}</b></div>
            <div><span>نسخه سند</span><b>${fa(c.version_no || 1)}</b></div>
            <div><span>تناوب پایش</span><b>${CL_CADENCE_SHORT[c.cadence] || 'موردی'}</b></div>
            <div><span>سند مادر</span><b>${pd ? esc((pd.doc_code ? pd.doc_code + ' — ' : '') + pd.title) : 'ثبت نشده'}</b></div>
          </div>

          <!-- کادر مشخصات ارزیابی میدانی -->
          <div style="border:1px solid var(--bdr);border-radius:6px;padding:10px 14px;margin-bottom:14px;background:rgba(255,255,255,0.02)">
            <div style="font-weight:700;font-size:12px;color:var(--gdl);margin-bottom:8px">مشخصات ارزیابی میدانی:</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:12px">
              <div>تاریخ ارزیابی: <span style="display:inline-block;border-bottom:1px dotted var(--td);width:160px">&nbsp;</span></div>
              <div>بخش / واحد ارزیابی‌شونده: <span style="display:inline-block;border-bottom:1px dotted var(--td);width:160px">&nbsp;</span></div>
              <div>نام و سمت ارزیاب: <span style="display:inline-block;border-bottom:1px dotted var(--td);width:160px">&nbsp;</span></div>
              <div>مورد بررسی (بیمار / تجهیز / شیفت): <span style="display:inline-block;border-bottom:1px dotted var(--td);width:160px">&nbsp;</span></div>
            </div>
          </div>

          ${c.baseline_info ? `
          <div style="border:1px dashed var(--bdr);border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:11.5px;color:var(--td)">
            <b style="color:var(--th)">اطلاعات پایه‌ای و راهنما:</b> ${esc(c.baseline_info)}
          </div>` : ''}

          <!-- جدول سوالات با چک‌باکس‌های چاپی -->
          ${groups.map(g => `
            <div style="margin-top:14px">
              <div style="font-weight:700;font-size:12.5px;color:var(--gdl);margin-bottom:6px;padding-right:4px;border-right:3px solid var(--gd)">
                ${g.title ? esc(g.title) : 'سؤالات ارزیابی'}
              </div>
              <div class="tbl-wrap">
                <table style="width:100%;border-collapse:collapse;font-size:11.5px">
                  <thead>
                    <tr style="background:rgba(212,175,90,0.08)">
                      <th style="width:36px;text-align:center">#</th>
                      <th>شرح سنجه / سؤال ارزیابی</th>
                      <th style="width:45px;text-align:center">وزن</th>
                      <th style="width:190px;text-align:center">گزینه‌های ارزیابی میدانی</th>
                      <th style="width:140px;text-align:center">شواهد و توضیحات</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${g.items.map((it, idx) => `
                      <tr>
                        <td style="text-align:center">${fa(idx + 1)}</td>
                        <td style="color:var(--th);font-weight:500;line-height:1.7">${esc(it.question_text)}</td>
                        <td style="text-align:center">${it.weight ? fa(it.weight) : '۱'}</td>
                        <td style="text-align:center;white-space:nowrap;font-size:11px">
                          ${it.answer_type === 'yes_no' ? `
                            <span style="display:inline-block;margin:0 4px">☐ بله</span>
                            <span style="display:inline-block;margin:0 4px">☐ خیر</span>
                            <span style="display:inline-block;margin:0 4px">☐ ندارد</span>
                          ` : `
                            <span style="display:inline-block;margin:0 2px">☐ عالی</span>
                            <span style="display:inline-block;margin:0 2px">☐ خوب</span>
                            <span style="display:inline-block;margin:0 2px">☐ متوسط</span>
                            <span style="display:inline-block;margin:0 2px">☐ کم</span>
                            <span style="display:inline-block;margin:0 2px">☐ خالی</span>
                          `}
                        </td>
                        <td style="border-bottom:1px dotted var(--bdr)">&nbsp;</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}

          <!-- خلاصه ارزیابی و امضاها -->
          <div style="border:1px solid var(--bdr);border-radius:6px;padding:10px 14px;margin-top:16px;background:rgba(255,255,255,0.02)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
              <div>جمع امتیاز مکتسبه: <span style="display:inline-block;border-bottom:1px dotted var(--td);width:80px">&nbsp;</span> از <span style="display:inline-block;border-bottom:1px dotted var(--td);width:80px">&nbsp;</span> ( _____ ٪)</div>
              <div>نتیجه کلی پایش: <span style="margin-right:10px">☐ انطباق کامل</span> <span style="margin-right:10px">☐ عدم انطباق نیازمند CAPA</span></div>
            </div>
          </div>

          <div class="chksign" style="margin-top:20px">
            <div><span>نام و امضای ارزیاب</span><i></i></div>
            <div><span>نام و امضای سرپرستار / مسئول بخش</span><i></i></div>
            <div><span>تأییدیه دفتر بهبود کیفیت و ایمنی</span><i></i></div>
          </div>
        </td></tr></tbody>
        </table>
      </div>
    </div>`;
  } catch(e) {
    toast('خطا در آماده‌سازی برگه خام: ' + e.message, true);
  }
}
