/**
 * Collaboration Audit Reports & Trends
 * Modular Frontend Component — Project 313
 */
// ==================== REPORTS ====================
// گزارش اختلاف: «کجا خودمان را بالاتر از واقعیت دیده‌ایم؟»
// این تنها خروجی‌ای است که سه‌ستونه‌کردن نمره را ارزشمند می‌کند — بدون آن،
// ثبت نمره‌ی ارزیاب فقط یک بایگانی است.
async function renderReviewGaps(){
  $('ptitle').textContent='اختلاف خودارزیابی با ارزیاب';
  const box=$('content');
  box.innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  let d;
  try{ d=await API.reviewGaps(); }
  catch(e){ box.innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; return; }
  if(S.page!=='reviewgaps') return;

  const over=d.gaps.filter(g=>g.direction==='over');
  const under=d.gaps.filter(g=>g.direction==='under');
  const row=g=>`<tr>
    <td style="color:var(--gdl);white-space:nowrap">${esc(g.code)}</td>
    <td>${esc(fixText(g.statement)).slice(0,90)}${(g.statement||'').length>90?'…':''}</td>
    <td style="white-space:nowrap">${ROLE_FA[g.responsible_role]||'—'}</td>
    <td><span class="bdg ${REV_CLS[g.self_status]==='s-f'?'b1':(REV_CLS[g.self_status]==='s-p'?'b2':'b3')}">${REV_FA[g.self_status]||'—'}</span></td>
    <td><span class="bdg ${REV_CLS[g.review_status]==='s-f'?'b1':(REV_CLS[g.review_status]==='s-p'?'b2':'b3')}">${REV_FA[g.review_status]||'—'}</span>
      <span class="tsub">${g.review_kind==='external'?'ارزیاب وزارت':'ارزیاب دانشگاه'}</span></td>
    <td>${g.patient_safety_flag?'<span class="bdg bsf">✦</span>':''}<span class="bdg b${g.measure_level||1}">سطح ${fa(g.measure_level||1)}</span></td>
  </tr>`;
  const tbl=(list,head)=>list.length?`<div class="tbl-wrap"><table>
    <thead><tr><th>کد</th><th>سنجه</th><th>مسئول</th><th>خودارزیابی ما</th><th>نمره‌ی ارزیاب</th><th></th></tr></thead>
    <tbody>${list.map(row).join('')}</tbody></table></div>`
    : `<div class="empty">${head}</div>`;

  box.innerHTML=`
  <div class="stats">
    <div class="st g gold"><div class="l">خودمان را بالاتر دیده‌ایم</div>
      <div class="v" style="color:var(--dn)">${fa(over.length)}</div></div>
    <div class="st g"><div class="l">ارزیاب بالاتر داده</div><div class="v">${fa(under.length)}</div></div>
    <div class="st g"><div class="l">هم‌نظر</div><div class="v" style="color:var(--ok)">${fa(d.agreed)}</div></div>
    <div class="st g"><div class="l">کل سنجه‌های ارزیابی‌شده</div><div class="v">${fa(d.reviewed)}</div></div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">!</div><div style="flex:1"><h3>خوش‌بینی ما — اولویت اول</h3>
      <div class="sub">سنجه‌هایی که خودارزیابی ما از نمره‌ی ارزیاب بالاتر بوده. اینجا همان جایی است که در ارزیابی رسمی امتیاز از دست می‌رود.</div></div></div>
    <div class="pbody">${tbl(over,'در هیچ سنجه‌ای خودمان را بالاتر ندیده‌ایم — خودارزیابی واقع‌بینانه بوده است.')}</div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">◈</div><div style="flex:1"><h3>سخت‌گیری ما</h3>
      <div class="sub">ارزیاب نمره‌ی بالاتری داده است. اینجا احتمالاً شواهد موجود را در خودارزیابی به حساب نیاورده‌ایم.</div></div></div>
    <div class="pbody">${tbl(under,'موردی نیست.')}</div>
  </div>
  ${!d.reviewed?`<div class="sd-note">${ic('info')||'◇'}
    <div>هنوز هیچ نمره‌ی ارزیابی ثبت نشده است. نمره‌ی ارزیاب داخلی دانشگاه و ارزیاب بیرونی وزارت
    را از صفحه‌ی «سنجه‌ها و ارزیابی»، زیر هر سنجه، ثبت کنید تا این گزارش ساخته شود.</div></div>`:''}`;
}

function renderReports(){
  $('ptitle').textContent='گزارش و خروجی';
  const mine=myAxes(); const ms=[];
  mine.forEach(({sec,ax})=>ax.measures.forEach(m=>ms.push({...m,_sec:sec.title,_ax:ax.title})));
  const st=calc(ms); const byRole={};
  ms.forEach(m=>{ const r=ROLE_FA[m.responsible_role]||'—'; byRole[r]=byRole[r]||{t:0,f:0}; byRole[r].t++;
    if(statusOf(m.id)==='full_compliant') byRole[r].f++; });

  // گزارش هم روی کاغذ رسمی چاپ می‌شود؛ سربرگ در thead می‌نشیند تا روی
  // هر صفحه تکرار شود (فهرست اقدامات باقی‌مانده معمولاً چندصفحه‌ای است).
  $('content').innerHTML=`
  <table class="psheet">
  <thead><tr><td>${docLetterhead(`گزارش آمادگی اعتباربخشی — سال ${fa(S.year||todayJalali().jy)}`)}</td></tr></thead>
  <tfoot><tr><td><div class="psheet-foot"><span>${esc((S.user&&S.user.hospital_name)||'')}</span>
    <span>گزارش آمادگی اعتباربخشی</span></div></td></tr></tfoot>
  <tbody><tr><td>
  <div class="stats">
    <div class="st g gold"><div class="l">آمادگی کلی برای بازرسی</div><div class="v">${fa(st.wpct)}٪</div>
      <div class="bar"><i class="bf-gd" style="width:${st.wpct}%"></i></div></div>
    <div class="st g"><div class="l">تکمیل‌شده بدون مدرک ثبتی</div>
      <div class="v">${fa(ms.filter(m=>statusOf(m.id)==='full_compliant'&&!S.notesMap[m.id]).length)}</div></div>
    <div class="st g"><div class="l">نیازمند اقدام</div><div class="v" style="color:var(--dn)">${fa(st.n+st.u)}</div></div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">▤</div><div><h3>عملکرد به تفکیک مسئول</h3>
      <div class="sub">برای پیگیری از هر نقش</div></div>
      <div style="margin-right:auto;display:flex;gap:8px">
        <button class="btn btn-o btn-sm" onclick="exportCSV()">⤓ خروجی CSV</button>
        <a class="btn btn-o btn-sm" href="/api/export/measures.xlsx?year=${S.year||todayJalali().jy}" download="measures.xlsx">⤓ خروجی xlsx</a>
        <button class="btn btn-g btn-sm" onclick="dpPrint()">⎙ چاپ</button></div></div>
    <div class="pbody"><div class="tbl-wrap"><table>
      <thead><tr><th>نقش مسئول</th><th>سنجه</th><th>تکمیل</th><th>درصد</th><th></th></tr></thead>
      <tbody>${Object.entries(byRole).sort((a,b)=>b[1].t-a[1].t).map(([r,v])=>{
        const p=Math.round(v.f/v.t*100);
        return `<tr><td style="color:var(--th)">${esc(r)}</td><td>${fa(v.t)}</td><td>${fa(v.f)}</td>
        <td style="color:var(--gdl);font-weight:700">${fa(p)}٪</td>
        <td><span class="mini-bar" style="width:80px;display:inline-block"><i style="width:${p}%"></i></span></td></tr>`;
      }).join('')}</tbody></table></div></div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">!</div><div><h3>اقدامات باقی‌مانده</h3>
      <div class="sub">آنچه پیش از بازرسی باید تکمیل شود</div></div></div>
    <div class="pbody"><div class="tbl-wrap"><table>
      <thead><tr><th>کد</th><th>محور</th><th>سنجه</th><th>مسئول</th><th>سطح</th></tr></thead>
      <tbody>${ms.filter(m=>statusOf(m.id)!=='full_compliant').slice(0,60).map(m=>
        `<tr><td style="color:var(--gdl);white-space:nowrap">${esc(m.code)}</td><td style="white-space:nowrap">${esc(m._ax)}</td>
        <td>${esc(fixText(m.statement)).slice(0,70)}…</td><td style="white-space:nowrap">${ROLE_FA[m.responsible_role]||'—'}</td>
        <td><span class="bdg b${m.measure_level||1}">${fa(m.measure_level||1)}</span>${m.patient_safety_flag?' <span class="bdg bsf">✦</span>':''}</td></tr>`).join('')}
      </tbody></table></div>
      <div style="margin-top:12px;font-size:11px;color:var(--td)">نمایش ۶۰ مورد اول — فهرست کامل در خروجی CSV.</div></div>
  </div>
  <div class="panel g" id="trendPanel"><div class="empty">در حال بارگذاری نمودار روند…</div></div>
  </td></tr></tbody></table>`;
  loadTrend();
}

// ==================== نمودار روند ثبت‌ها ====================
// بدون کتابخانه: میله‌ها روی canvas رسم می‌شوند + جدول اعداد کامل زیر نمودار (برای خواندن دقیق و چاپ).
// سال اصلی طلایی، سال مقایسه خاکستری.
const TREND = { period:'month', year:null, compare:'', metric:'all', data:null };
const TREND_METRICS = [
  ['minutes','صورت‌جلسه'],['meetings','جلسه کمیته'],['checklists','تکمیل چک‌لیست'],
  ['activities','ثبت فعالیت'],['errors','گزارش خطا'],['fmea','FMEA'],['audits','حسابرسی'],
];
const TREND_PERIOD_FA = { month:'ماهانه', quarter:'سه‌ماهه', year:'سالانه' };

async function loadTrend(){
  if(TREND.year===null) TREND.year = S.year || todayJalali().jy;
  try{ TREND.data = await API.reportsTrend(TREND.period, TREND.year, TREND.compare||null); }
  catch(e){ const el=$('trendPanel'); if(el) el.innerHTML='<div class="empty">خطا در دریافت نمودار: '+esc(e.message)+'</div>'; return; }
  drawTrend();
}
// تغییر «متریک» فقط روی داده‌ی موجود اثر دارد و نیازی به رفت‌وبرگشت سرور ندارد
function trendSet(k,v){ TREND[k] = (k==='year') ? +v : v; if(k==='metric') drawTrend(); else loadTrend(); }

function trendSum(b){ return TREND_METRICS.reduce((a,[k])=>a+(b[k]||0),0); }
function trendVal(b){ return TREND.metric!=='all' ? (b[TREND.metric]||0) : trendSum(b); }

function drawTrend(){
  const el=$('trendPanel'); if(!el||!TREND.data) return;
  const d=TREND.data, main=d.buckets||[], cmp=(d.compare&&d.compare.buckets)||null;
  const cur=todayJalali().jy;
  let yOpts=''; for(let y=cur+1;y>=cur-4;y--) yOpts+='<option value="'+y+'"'+(y===TREND.year?' selected':'')+'>'+fa(y)+'</option>';
  let cOpts='<option value="">بدون مقایسه</option>';
  for(let y=cur+1;y>=cur-4;y--) if(y!==TREND.year) cOpts+='<option value="'+y+'"'+(String(y)===String(TREND.compare)?' selected':'')+'>'+fa(y)+'</option>';
  let pOpts=''; Object.entries(TREND_PERIOD_FA).forEach(([k,v])=>{ pOpts+='<option value="'+k+'"'+(k===TREND.period?' selected':'')+'>'+v+'</option>'; });
  let mOpts='<option value="all"'+(TREND.metric==='all'?' selected':'')+'>همه‌ی ثبت‌ها</option>';
  TREND_METRICS.forEach(([k,t])=>{ mOpts+='<option value="'+k+'"'+(k===TREND.metric?' selected':'')+'>'+t+'</option>'; });

  const total=main.reduce((a,b)=>a+trendVal(b),0);
  const cmpTotal=cmp?cmp.reduce((a,b)=>a+trendVal(b),0):null;

  el.innerHTML =
   '<div class="phd"><div class="abadge">📈</div><div><h3>نمودار روند ثبت‌ها</h3>'+
     '<div class="sub">'+TREND_PERIOD_FA[TREND.period]+' — سال '+fa(TREND.year)+' · مجموع '+fa(total)+' ثبت'+
     (cmpTotal!==null?' (سال '+fa(d.compare.year)+': '+fa(cmpTotal)+')':'')+'</div></div>'+
     '<div style="margin-right:auto;display:flex;gap:8px;flex-wrap:wrap">'+
       '<select onchange="trendSet(\'period\',this.value)">'+pOpts+'</select>'+
       '<select onchange="trendSet(\'year\',this.value)">'+yOpts+'</select>'+
       '<select onchange="trendSet(\'compare\',this.value)">'+cOpts+'</select>'+
       '<select onchange="trendSet(\'metric\',this.value)">'+mOpts+'</select>'+
     '</div></div>'+
   '<div class="pbody">'+
     '<div style="display:flex;gap:16px;font-size:11.5px;color:var(--td);margin-bottom:8px">'+
       '<span><i style="display:inline-block;width:11px;height:11px;background:var(--gd,#c9a227);border-radius:2px;vertical-align:-1px"></i> سال '+fa(TREND.year)+'</span>'+
       (cmp?'<span><i style="display:inline-block;width:11px;height:11px;background:#9aa0a6;border-radius:2px;vertical-align:-1px"></i> سال '+fa(d.compare.year)+'</span>':'')+
     '</div>'+
     '<div style="overflow-x:auto"><canvas id="trendCv" height="260" style="width:100%;min-width:560px;display:block"></canvas></div>'+
     ((total===0&&!cmpTotal)?'<div class="empty">در این بازه ثبتی وجود ندارد</div>':'')+
     '<div class="tbl-wrap" style="margin-top:14px"><table><thead><tr><th>بازه</th>'+
       TREND_METRICS.map(([,t])=>'<th>'+t+'</th>').join('')+'<th>جمع</th>'+
       (cmp?'<th style="color:#9aa0a6">جمع '+fa(d.compare.year)+'</th>':'')+'</tr></thead><tbody>'+
       main.map((b,i)=>'<tr><td style="white-space:nowrap;color:var(--gdl)">'+esc(b.label)+'</td>'+
         TREND_METRICS.map(([k])=>'<td>'+fa(b[k]||0)+'</td>').join('')+
         '<td><b>'+fa(trendSum(b))+'</b></td>'+
         (cmp?'<td style="color:#9aa0a6">'+fa(cmp[i]?trendSum(cmp[i]):0)+'</td>':'')+
         '</tr>').join('')+
     '</tbody></table></div></div>';

  paintTrendCanvas(main, cmp);
}

// رسم دستی میله‌ها (بدون کتابخانه). اندازه‌ی بوم با devicePixelRatio بالا می‌رود تا روی صفحه‌ی رتینا تار نشود.
function paintTrendCanvas(main, cmp){
  const cv=$('trendCv'); if(!cv) return;
  const dpr=window.devicePixelRatio||1;
  const cssW=cv.clientWidth||600, cssH=260;
  cv.width=Math.round(cssW*dpr); cv.height=Math.round(cssH*dpr);
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,cssW,cssH);

  const padL=34, padR=10, padT=14, padB=34;
  const W=cssW-padL-padR, H=cssH-padT-padB;
  const vals=main.map(trendVal), cvals=cmp?cmp.map(trendVal):null;
  const max=Math.max(1, ...vals, ...(cvals||[0]));
  // سقف محور را به مضرب گرد بالا می‌بریم تا برچسب خطوط راهنما همیشه عدد صحیح باشد
  const stepV=Math.max(1, Math.ceil(max/4)), top=stepV*4;

  const css=getComputedStyle(document.body);
  const gold=(css.getPropertyValue('--gd')||'').trim()||'#c9a227';
  const grid='rgba(128,128,128,.22)';
  const txt=(css.getPropertyValue('--td')||'').trim()||'#888';

  g.font='10px Tahoma, sans-serif'; g.textBaseline='middle';
  for(let i=0;i<=4;i++){
    const v=stepV*i, y=padT+H-(v/top)*H;
    g.strokeStyle=grid; g.beginPath(); g.moveTo(padL,y); g.lineTo(padL+W,y); g.stroke();
    g.fillStyle=txt; g.textAlign='right'; g.fillText(fa(v), padL-5, y);
  }

  const n=main.length||1, slot=W/n;
  const pair=!!cmp, bw=Math.min(pair?slot*0.30:slot*0.52, 30);
  for(let i=0;i<n;i++){
    // چیدمان راست‌به‌چپ: اولین بازه (فروردین / سه‌ماهه ۱) سمت راست می‌نشیند
    const center=padL+W-(i+0.5)*slot;
    const bar=(v,cx,color)=>{ const h=(v/top)*H; if(h>0){ g.fillStyle=color; g.fillRect(cx-bw/2, padT+H-h, bw, h); } };
    if(pair){ bar(vals[i], center-bw*0.6, gold); bar(cvals[i], center+bw*0.6, '#9aa0a6'); }
    else bar(vals[i], center, gold);
    g.fillStyle=txt; g.textAlign='center';
    g.fillText(main[i].label, center, padT+H+12);
  }
}
function exportCSV(){
  const rows=[['کد','بخش','محور','استاندارد','سنجه','سطح','ایمنی بیمار','مسئول','وضعیت','مدرک','صفحه']];
  const FAST={not_reviewed:'بررسی‌نشده',non_compliant:'عدم انطباق',partial:'انطباق نسبی',full_compliant:'انطباق کامل'};
  myAxes().forEach(({sec,ax})=>ax.measures.forEach(m=>{
    rows.push([m.code,sec.title,ax.title,m._std,fixText(m.statement),m.measure_level||1,
      m.patient_safety_flag?'بله':'خیر',ROLE_FA[m.responsible_role]||'—',
      FAST[statusOf(m.id)],(S.notesMap[m.id]||'').replace(/\n/g,' '),m.page||'']);
  }));
  const csv='\uFEFF'+rows.map(r=>r.map(c=>`"${String(c==null?'':c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download='گزارش-اعتباربخشی.csv'; a.click();
  toast('فایل CSV دانلود شد');
}

