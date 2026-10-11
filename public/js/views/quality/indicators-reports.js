/**
 * Indicator Reports & Performance Trends
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function cmpPie(d){
  const parts=d.series.map((s,si)=>({ si, title:s.title, unit:s.unit,
    v:(s.avg===null||s.avg===undefined)?null:s.avg })).filter(p=>p.v!==null);
  if(!parts.length) return '<div class="empty" style="padding:26px">برای نمودار دایره‌ای مقداری در این بازه نیست</div>';
  if(parts.some(p=>p.v<0))
    return `<div class="empty" style="padding:26px">نمودار دایره‌ای برای مقادیر منفی معنا ندارد —
      از نمای میله‌ای یا خطی استفاده کنید.</div>`;
  const sum=parts.reduce((a,p)=>a+p.v,0);
  if(!(sum>0)) return '<div class="empty" style="padding:26px">مجموع مقادیر صفر است و سهمی قابل محاسبه نیست</div>';

  // بوم مربعی و دایره در مرکزِ خودش: نسخه‌ی اول یک بومِ ۷۶۰ پیکسلی داشت و دایره
  // را با یک آفستِ دستی سمتِ راست می‌نشاند، پس نیمِ چپِ بوم خالی می‌ماند و در
  // چیدمانِ دوستونی، فاصله‌ی بی‌دلیل می‌انداخت.
  const W=380, H=330, R=118, CXP=W/2, CYP=H/2;
  let ang=-Math.PI/2;   // شروع از بالا
  const arcs=parts.map(p=>{
    const frac=p.v/sum, sweep=frac*Math.PI*2;
    const a0=ang, a1=ang+sweep; ang=a1;
    const col=cmpColorAt(p.si);
    const P=(a,r)=>[(CXP+Math.cos(a)*r).toFixed(1),(CYP+Math.sin(a)*r).toFixed(1)];
    const [x0,y0]=P(a0,R), [x1,y1]=P(a1,R);
    // یک قطعه‌ی تک‌نفره (۱۰۰٪) با path قوسی رسم نمی‌شود چون شروع و پایان یکی
    // می‌شود؛ همان‌جا یک دایره‌ی کامل کشیده می‌شود.
    const shape = frac>=0.9999
      ? `<circle cx="${CXP}" cy="${CYP}" r="${R}" fill="${col}" opacity=".9"/>`
      : `<path d="M${CXP},${CYP} L${x0},${y0} A${R},${R} 0 ${sweep>Math.PI?1:0} 1 ${x1},${y1} Z"
          fill="${col}" opacity=".9" stroke="var(--bg2)" stroke-width="1.5"/>`;
    // برچسبِ درصد روی خودِ قطعه — کارفرما گفت عدد/درصد روی نمودار دیده شود.
    // قطعه‌ی خیلی نازک جا ندارد و برچسبش با بغلی‌اش قاطی می‌شود.
    const mid=(a0+a1)/2, [lx,ly]=P(mid,R*0.62);
    const pct=Math.round(frac*1000)/10;
    const lbl= frac<0.05 ? '' :
      `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="12" font-weight="700"
        fill="#0b1120">${fa(pct)}٪</text>`;
    return `<g>${shape}${lbl}<title>${esc(p.title)}: ${cmpNum(p.v)}${p.unit?' '+esc(p.unit):''} — ${fa(pct)}٪</title></g>`;
  }).join('');

  const rows=parts.map(p=>{
    const pct=Math.round((p.v/sum)*1000)/10;
    return `<div class="cmp-pierow"><i style="background:${cmpColorAt(p.si)}"></i>
      <span>${esc(p.title)}</span><b>${fa(pct)}٪</b><u>${cmpNum(p.v)}${p.unit?' '+esc(p.unit):''}</u></div>`;
  }).join('');

  return `<div class="cmp-pie">
    <div class="cmp-svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="cmp-svg" style="min-width:0;max-width:${W}px"
      role="img" aria-label="نمودار دایره‌ای سهم شاخص‌ها">${arcs}</svg></div>
    <div class="cmp-pielist">
      <div class="sub" style="margin-bottom:8px">سهم هر شاخص از مجموع، بر پایه‌ی
        <b>میانگینِ همین بازه</b> (نه یک ماهِ منفرد)</div>
      ${rows}
    </div>
  </div>`;
}

function cmpMode(m){ CMP.mode=m; cmpDraw(); }
function cmpScale(v){ CMP.scale=v; cmpDraw(); }
function cmpKind(v){ CMP.kind=v; cmpDraw(); }
// دانه‌بندی و چیدمان روی سرور اثر دارند (تجمیع آنجا انجام می‌شود)، پس باید
// دوباره واکشی شود؛ جدول و پالت فقط نمایش‌اند و رسمِ دوباره کافی است.
function cmpGrain(v){ CMP.grain=v; renderIndicators(); }
function cmpAlign(v){ CMP.align=v; renderIndicators(); }
function cmpTable(){ CMP.table=!CMP.table; cmpDraw(); }
// تجمیع روی سرور انجام می‌شود، پس باید دوباره واکشی شود.
function cmpSubtotals(){ CMP.subtotals=!CMP.subtotals; renderIndicators(); }

// ---- انتخابگرِ پالت ----
function cmpPaletteUI(){
  const cur=cmpPaletteKey(), custom=cmpCustom();
  const opts=Object.entries(CMP_PALETTES).map(([k,p])=>
    `<option value="${k}" ${!custom&&cur===k?'selected':''}>${esc(p.name)}</option>`).join('');
  const cols=cmpColors();
  return `<span class="cmp-pal">
    <span class="cmp-lbl">رنگ</span>
    <select onchange="cmpSetPalette(this.value)">${opts}
      <option value="__custom" ${custom?'selected':''}>دلخواه</option></select>
    <span class="cmp-sw">${cols.slice(0,8).map((c,i)=>
      `<input type="color" value="${esc(c)}" title="رنگ سری ${fa(i+1)}"
         onchange="cmpSetColor(${i},this.value)">`).join('')}</span>
    ${custom?`<button class="btn btn-o btn-xs" onclick="cmpResetColors()">بازنشانی</button>`:''}
  </span>`;
}
function cmpSetPalette(k){
  try{
    if(k==='__custom'){ localStorage.setItem('cmp_custom', JSON.stringify(cmpColors())); }
    else { localStorage.removeItem('cmp_custom'); localStorage.setItem('cmp_palette', k); }
  }catch(e){}
  cmpDraw();
}
// تغییرِ یک رنگ یعنی کاربر دارد پالتِ خودش را می‌سازد، پس از همان لحظه روی
// «دلخواه» می‌رود و بقیه‌ی رنگ‌ها هم از پالتِ فعلی کپی می‌شوند.
function cmpSetColor(i, val){
  const cols=cmpColors().slice(0,8);
  while(cols.length<8) cols.push('#888888');
  cols[i]=val;
  try{ localStorage.setItem('cmp_custom', JSON.stringify(cols)); }catch(e){}
  cmpDraw();
}
function cmpResetColors(){
  try{ localStorage.removeItem('cmp_custom'); }catch(e){}
  cmpDraw();
}
function cmpToggle(id){
  const i=CMP.ids.indexOf(id);
  if(i>=0) CMP.ids.splice(i,1);
  else{
    // سقفِ ۸ همان سقفِ سرور است و همان تعداد رنگِ قابلِ تفکیک روی نمودار.
    if(CMP.ids.length>=8){ toast('حداکثر ۸ شاخص هم‌زمان قابل مقایسه است',true); return; }
    CMP.ids.push(id);
  }
  cmpDraw();
}
function cmpApply(){
  const v=id=>{ const e=$(id); return e?e.value:''; };
  if(CMP.mode==='year') CMP.year=+v('cmpY')||CMP.year;
  if(CMP.mode==='month'){ CMP.month=+v('cmpM')||1; CMP.year=+v('cmpY')||CMP.year; CMP.years=+v('cmpN')||3; }
  if(CMP.mode==='manual'){ CMP.fy=+v('cmpFY')||CMP.fy; CMP.fm=+v('cmpFM')||1;
                           CMP.ty=+v('cmpTY')||CMP.ty; CMP.tm=+v('cmpTM')||12; }
  CMP.category=v('cmpCat');
  // انتخابِ دسته و انتخابِ دستی هر دو با هم بی‌معنی است؛ دسته برنده می‌شود چون
  // کاربر تازه رویش کلیک کرده.
  if(CMP.category) CMP.ids=[];
  renderIndicators();
}
function cmpReset(){ CMP.ids=[]; CMP.category=''; CMP.data=null; cmpDraw(); }
function cmpPrint(){
  if(!CMP.data||!CMP.data.series.length){ toast('اول نمودار را رسم کنید',true); return; }
  window.print();
}

// ================= گزارش شاخص‌ها =================
// نمای مقایسه برای «کنار هم دیدن» است؛ این نما برای «برگه‌ای که روی میزِ جلسه
// می‌گذاری». تفاوتش سه چیز است: خلاصه‌ی وضعیت نسبت به هدف، بلوکِ جدا برای هر
// شاخص، و برگه‌ای که با سربرگ و جای امضا چاپ می‌شود.
//
// هیچ کتابخانه‌ی تازه‌ای اضافه نشد: نمودارها همان cmpBars/cmpLine/cmpPie اند و
// برگه همان الگوی printSheet ِ بقیه‌ی ماژول‌ها. خروجی PDF از راهِ چاپِ مرورگر
// گرفته می‌شود که برخلافِ کتابخانه‌های PDF ِ سمتِ سرور، فارسی را درست می‌چیند.
const REP = { scope:'cat', id:'', category:'', kind:'bar', data:null, all:null, cats:null };

// درصدِ تحققِ هدف با توجه به جهتِ مطلوبیت. برای شاخصِ کاهنده (مثل عفونت) رسیدن
// به عددِ کمتر یعنی بهتر، پس کسر وارونه می‌شود.
function repPct(s){
  const t=s.target_value, v=s.avg;
  if(v===null||t===null||t===undefined) return null;
  const hib = !(s.higher_is_better===0||s.higher_is_better===false);
  if(hib){ if(!(t>0)) return null; return (v/t)*100; }
  if(!(v>0)) return v===0?100:null;   // صفر برای شاخصِ کاهنده یعنی هدفِ کامل
  return (t/v)*100;
}
function repStat(s){
  const raw=repPct(s);
  if(raw===null) return {k:'na', fa:'بدون هدف', pct:null};
  // تصمیم روی همان عددی گرفته می‌شود که چاپ می‌شود، وگرنه ۹۹٫۶٪ روی برگه «۱۰۰٪»
  // نوشته می‌شود ولی برچسبش «نزدیک هدف» می‌ماند و خواننده حق دارد گیج شود.
  const p=Math.round(raw);
  if(p>=100) return {k:'ok', fa:'بر هدف', pct:p};
  if(p>=80)  return {k:'wr', fa:'نزدیک هدف', pct:p};
  return {k:'dn', fa:'فاصله تا هدف', pct:p};
}
// روند بر پایه‌ی نخستین و آخرین مقدارِ همان بازه، نه شیبِ رگرسیون: برگه‌ی مدیریتی
// باید با یک نگاه خوانده شود.
function repTrend(s){
  if(s.first===null||s.last===null||s.count<2) return {k:'na', fa:'—'};
  const d=s.last-s.first;
  if(Math.abs(d)<1e-9) return {k:'na', fa:'بدون تغییر'};
  const hib = !(s.higher_is_better===0||s.higher_is_better===false);
  const good = hib ? d>0 : d<0;
  return {k:good?'ok':'dn', fa:(good?'رو به بهبود':'رو به افت')+` (${d>0?'+':'−'}${cmpNum(Math.abs(d))})`};
}

async function indLoadReport(){
  cmpDefaults();
  // گزارش فقط دو حالتِ بازه دارد: یک سالِ کامل، یا بازه‌ی دستی. حالتِ «یک ماه در
  // چند سال» ِ نمای مقایسه اینجا کنترلی ندارد، پس اگر کاربر با آن حالت از تبِ
  // مقایسه آمده باشد به سالِ کامل برمی‌گردد — وگرنه کنترل‌های روی صفحه با بازه‌ای
  // که واقعاً درخواست می‌شود یکی نمی‌ماند.
  if(CMP.mode==='month') CMP.mode='year';
  if(!REP.all){
    const l=await API.indicators('per_page=200&active=1');
    REP.all=l.indicators||[]; REP.cats=(l.facets&&l.facets.categories)||[];
    if(!REP.category && REP.cats.length) REP.category=REP.cats[0];
  }
  if(!REP.id && (REP.all||[]).length) REP.id=REP.all[0].id;
  const p=new URLSearchParams(cmpRange());
  if(REP.scope==='one' && REP.id) p.set('ids', REP.id);
  else if(REP.scope==='cat' && REP.category) p.set('category', REP.category);
  else if(REP.scope==='all') p.set('ids', (REP.all||[]).slice(0,8).map(k=>k.id).join(','));
  const has = (REP.scope==='one'&&REP.id) || (REP.scope==='cat'&&REP.category) || (REP.scope==='all'&&REP.all.length);
  REP.data = has ? await API.indicatorsCompare(p.toString()) : null;
  IND.view='rep';
  repDraw();
}

function repScope(v){ REP.scope=v; renderIndicators(); }
function repKind(v){ REP.kind=v; repDraw(); }
function repApply(){
  const v=id=>{ const e=$(id); return e?e.value:''; };
  if(CMP.mode==='year') CMP.year=+v('repY')||CMP.year;
  if(CMP.mode==='manual'){ CMP.fy=+v('repFY')||CMP.fy; CMP.fm=+v('repFM')||1;
                           CMP.ty=+v('repTY')||CMP.ty; CMP.tm=+v('repTM')||12; }
  if(REP.scope==='one') REP.id=v('repInd');
  if(REP.scope==='cat') REP.category=v('repCat');
  renderIndicators();
}
function repPrint(){
  if(!REP.data||!REP.data.series.length){ toast('اول گزارش را بسازید',true); return; }
  window.print();
}

// کارت‌های خلاصه: چند شاخص بر هدف، چند نزدیک، چند دور. مدیر معمولاً همین سه عدد
// را می‌خواهد و بعد سراغِ جزئیات می‌رود.
function repSummary(d){
  const st=d.series.map(repStat);
  const c=k=>st.filter(x=>x.k===k).length;
  const withData=d.series.filter(s=>s.count>0).length;
  const card=(n,l,k)=>`<div class="rep-card rep-${k}"><b>${fa(n)}</b><span>${esc(l)}</span></div>`;
  return `<div class="rep-cards">
    ${card(d.series.length,'شاخصِ گزارش','tot')}
    ${card(withData,'دارای داده','tot')}
    ${card(c('ok'),'بر هدف','ok')}
    ${card(c('wr'),'نزدیک هدف','wr')}
    ${card(c('dn'),'فاصله تا هدف','dn')}
  </div>`;
}

// بلوکِ هر شاخص: عنوان و دسته، چهار عددِ خلاصه، نمودار، و جدولِ ماه‌به‌ماه.
function repBlock(s, d){
  const st=repStat(s), tr=repTrend(s);
  const u=s.unit?' '+esc(s.unit):'';
  const one={periods:d.periods, series:[s]};
  const chart = REP.kind==='line' ? cmpLine(one,true) : cmpBars(one,true);
  const cell=v=> v===null||v===undefined ? '<span class="rep-nil">—</span>' : cmpNum(v);
  // یک سالِ ۱۲ ماهه افقی روی A4 جا می‌شود؛ بازه‌ی دوساله با ۲۵ ستون نه. آنجا
  // جدول می‌چرخد و هر دوره یک سطر می‌شود — ۲۴ سطرِ دوستونی روی کاغذ خوانا است،
  // ۲۵ ستونِ هفت‌میلی‌متری نه. (با table-layout:fixed ِ چاپ، ستون‌ها له می‌شدند.)
  const wide=d.periods.length>12;
  const table = wide
    ? `<table><thead><tr><th>دوره</th><th>مقدار${u}</th></tr></thead><tbody>
        ${d.periods.map((p,i)=>`<tr class="${p.roll?'cmp-roll':''}"><td>${cmpLbl(p.label)}</td><td>${cell(s.points[i])}</td></tr>`).join('')}
       </tbody></table>`
    : `<table>
        <thead><tr><th>دوره</th>${d.periods.map(p=>`<th>${cmpLbl(p.label)}</th>`).join('')}</tr></thead>
        <tbody><tr><th>مقدار${u}</th>${d.periods.map((p,i)=>`<td>${cell(s.points[i])}</td>`).join('')}</tr></tbody>
       </table>`;
  const num=(l,v)=>`<div><span>${esc(l)}</span><b>${v===null||v===undefined?'—':cmpNum(v)+u}</b></div>`;
  return `<div class="rep-blk">
    <div class="rep-blk-h">
      <div><h4>${esc(s.title)}</h4>
        <div class="sub">${esc(s.category||'بدون دسته')}${s.linked_axis_code?' · محور '+esc(s.linked_axis_code):''}</div></div>
      <span class="rep-badge rep-${st.k}">${esc(st.fa)}${st.pct!==null?` · ${fa(Math.round(st.pct))}٪`:''}</span>
    </div>
    <div class="doc-dates rep-nums">
      ${num('میانگین بازه', s.avg)}${num('کمینه', s.min)}${num('بیشینه', s.max)}
      ${num('هدف', s.target_value)}
      <div><span>روند</span><b class="rep-t-${tr.k}">${esc(tr.fa)}</b></div>
    </div>
    ${s.count?chart:'<div class="empty" style="padding:18px">در این بازه داده‌ای ثبت نشده است</div>'}
    ${s.count?`<div class="tbl-wrap rep-tbl${wide?' rep-tbl-v':''}">${table}</div>`:''}
  </div>`;
}

function repDraw(){
  cmpDefaults();
  const d=REP.data;
  const yOpts=(sel)=>{ let h=''; const base=S.year||1404;
    for(let y=base+1;y>=base-6;y--) h+=`<option value="${y}" ${y===sel?'selected':''}>${fa(y)}</option>`; return h; };
  const mOpts=(sel)=>JMONTHS.map((m,i)=>`<option value="${i+1}" ${i+1===sel?'selected':''}>${esc(m)}</option>`).join('');
  const scopeBtn=(k,t)=>`<button class="tgl ${REP.scope===k?'on':''}" onclick="repScope('${k}')">${t}</button>`;
  const kindBtn=(k,t)=>`<button class="tgl ${REP.kind===k?'on':''}" onclick="repKind('${k}')">${t}</button>`;

  const title = REP.scope==='one'
      ? (((REP.all||[]).find(k=>k.id===REP.id)||{}).title||'شاخص')
      : REP.scope==='cat' ? `دسته‌ی ${REP.category||'—'}` : 'همه‌ی شاخص‌ها';
  const rng = d&&d.range ? `${JMONTHS[d.range.from_month-1]} ${fa(d.range.from_year)} تا ${JMONTHS[d.range.to_month-1]} ${fa(d.range.to_year)}` : '—';

  $('content').innerHTML=`
  <div class="panel g rep-wrap">
    <div class="phd noprint"><div class="abadge">▤</div>
      <div style="flex:1"><h3>گزارش شاخص‌ها</h3>
        <div class="sub">برگه‌ی آماده‌ی چاپ — تکی، یک دسته، یا همه؛ با نمودار و جدول</div></div>
      <button class="btn btn-g btn-sm" style="align-self:end;margin-bottom:1px" onclick="repPrint()">${ic('print')} چاپ / PDF</button>
    </div>
    <div class="pbody">
      <div class="noprint">${indTabs('rep')}

        <div class="ind-ch"><div class="ind-cht">دامنه‌ی گزارش</div>
          <div class="pathbar" style="margin-bottom:10px">
            ${scopeBtn('one','یک شاخص')}${scopeBtn('cat','یک دسته')}${scopeBtn('all','همه‌ی شاخص‌ها')}
          </div>
          <div class="frow">
            ${REP.scope==='one'?`<div class="fg"><label>شاخص</label><select id="repInd">
              ${(REP.all||[]).map(k=>`<option value="${esc(k.id)}" ${REP.id===k.id?'selected':''}>${esc(k.title)}</option>`).join('')}
            </select></div>`:''}
            ${REP.scope==='cat'?`<div class="fg"><label>دسته</label><select id="repCat">
              ${(REP.cats||[]).map(c=>`<option value="${esc(c)}" ${REP.category===c?'selected':''}>${esc(c)}</option>`).join('')}
            </select></div>`:''}
            ${REP.scope==='all'?`<div class="fg"><label>&nbsp;</label>
              <div class="sub" style="padding-top:8px">هشت شاخصِ نخست — برای بیشتر، دسته‌به‌دسته بگیرید</div></div>`:''}
            ${CMP.mode==='year'?`<div class="fg"><label>سال</label><select id="repY">${yOpts(CMP.year)}</select></div>`:`
              <div class="fg"><label>از سال</label><select id="repFY">${yOpts(CMP.fy)}</select></div>
              <div class="fg"><label>از ماه</label><select id="repFM">${mOpts(CMP.fm)}</select></div>
              <div class="fg"><label>تا سال</label><select id="repTY">${yOpts(CMP.ty)}</select></div>
              <div class="fg"><label>تا ماه</label><select id="repTM">${mOpts(CMP.tm)}</select></div>`}
            <div class="fg"><label>&nbsp;</label><div style="display:flex;gap:6px">
              <button class="btn btn-g btn-sm" onclick="repApply()">ساخت گزارش</button>
              <button class="btn btn-o btn-sm" onclick="cmpMode('${CMP.mode==='year'?'manual':'year'}');renderIndicators()">
                ${CMP.mode==='year'?'بازه‌ی دستی':'یک سال کامل'}</button></div></div>
          </div>
        </div>

        <div class="ind-ch"><div class="ind-cht">نوع نمودار</div>
          <div class="pathbar">${kindBtn('bar','میله‌ای')}${kindBtn('line','خطی')}${kindBtn('pie','دایره‌ای (سهم)')}</div>
        </div>
      </div>

      ${!d||!d.series.length?`<div class="empty" style="padding:26px">
          دامنه و بازه را انتخاب کنید و «ساخت گزارش» را بزنید.</div>`:`
      <div class="rep-paper">
        <table class="psheet">
        <thead><tr><td>${docLetterhead(`گزارش شاخص‌ها — ${esc(title)}`)}</td></tr></thead>
        <tfoot><tr><td><div class="psheet-foot">
          <span>${esc((S.user&&S.user.hospital_name)||'')}</span>
          <span>RPT-KPI · گزارش شاخص‌های عملکردی</span>
        </div></td></tr></tfoot>
        <tbody><tr><td>
          <h3 style="margin:0 0 4px">گزارش شاخص‌های عملکردی — ${esc(title)}</h3>
          <div style="font-size:12px;color:var(--td);margin-bottom:12px">
            وضعیتِ هر شاخص نسبت به هدف، روندِ بازه، و مقادیرِ ماه‌به‌ماه.</div>
          <div class="doc-dates">
            <div><span>بازه‌ی گزارش</span><b>${esc(rng)}</b></div>
            <div><span>تاریخ تهیه</span><b>${faDateISO(todayISO())}</b></div>
            <div><span>تهیه‌کننده</span><b>${esc((S.user&&S.user.full_name)||'—')}</b></div>
            <div><span>تعداد شاخص</span><b>${fa(d.series.length)}</b></div>
          </div>
          ${repSummary(d)}
          ${REP.kind==='pie'
            ? `<div class="rep-blk"><div class="rep-blk-h"><div><h4>سهمِ نسبیِ شاخص‌ها</h4>
                 <div class="sub">بر پایه‌ی میانگینِ همین بازه</div></div></div>${cmpPie(d)}</div>`
            : d.series.map(s=>repBlock(s,d)).join('')}
          <div class="chksign">
            <div><span>نام و امضای تهیه‌کننده</span><i></i></div>
            <div><span>نام و امضای تأییدکننده</span><i></i></div>
          </div>
        </td></tr></tbody></table>
      </div>`}
    </div>
  </div>`;
}

// ---- ثبت و تأیید مقدار دوره‌ای ----
async function indSetValue(id, month){
  const d=IND.detailData; if(!d) return;
  const k=d.indicator;
  const cur=d.trend[month-1];
  const v=await BTN.prompt(`مقدار «${k.title}» در ${d.months_fa[month-1]} ${d.year}${k.unit?' ('+k.unit+')':''}\n(خالی بگذارید تا مقدار پاک شود)`,
                 cur===null?'':String(cur));
  if(v===null) return;
  try{
    const r=await API.setIndicatorValue(id,{year:d.year, month, value:v.trim()});
    toast(r.status==='corrected'?'مقدار اصلاح شد — تأیید قبلی باطل شد':'مقدار ثبت شد');
    renderIndicators();
  }catch(e){ toast(e.message,true); }
}

async function indApprove(id, month){
  const d=IND.detailData; if(!d) return;
  if(!await BTN.confirm(`مقدار ${d.months_fa[month-1]} ${fa(d.year)} تأیید شود؟`)) return;
  try{ await API.approveIndicatorValue(id,{year:d.year, month, status:'تأییدشده'});
    toast('تأیید شد'); renderIndicators();
  }catch(e){ toast(e.message,true); }
}

// ---- ساخت و ویرایش شناسنامه ----
// فرم ۲۱ فیلدیِ سند. به‌جای ۲۱ بار prompt (که غیرقابل استفاده است)، یک فرم
// درون‌خطی در همان پنل باز می‌شود.
function indForm(k){
  const sel=(id,list,val)=>`<select id="${id}">${['<option value=""></option>'].concat(
    list.map(v=>`<option value="${esc(v)}" ${val===v?'selected':''}>${esc(v)}</option>`)).join('')}</select>`;
  const txt=(id,val,ph)=>`<input id="${id}" value="${esc(val==null?'':val)}" ${ph?`placeholder="${esc(ph)}"`:''}>`;
  const num=(id,val)=>`<input id="${id}" type="number" step="any" value="${val==null?'':val}">`;
  const chk=(id,val,t)=>`<label class="ind-ck"><input type="checkbox" id="${id}" ${val?'checked':''}> ${t}</label>`;
  const q=k.quality_dimension||[];
  return `<div class="panel g" id="indFormPanel">
    <div class="phd"><div class="abadge">✎</div>
      <div style="flex:1"><h3>${k.id?'ویرایش شناسنامه‌ی شاخص':'شاخص جدید'}</h3>
        <div class="sub">فیلدهای ستاره‌دار الزامی‌اند</div></div></div>
    <div class="pbody">
      <div class="frow">
        <div class="fg" style="flex:2 1 300px"><label>۱. عنوان شاخص *</label>${txt('ifTitle',k.title)}</div>
        <div class="fg"><label>۲. کد</label>${txt('ifCode',k.code)}</div>
        <div class="fg"><label>۱۸. بخش / واحد</label>${txt('ifWard',k.ward_name)}</div>
      </div>
      <div class="fg"><label>۳. تعریف شاخص (صورت و مخرج)</label>
        <textarea id="ifDef" rows="4">${esc(k.definition||'')}</textarea></div>
      <div class="fg"><label>۴. منطق و دلیل جمع‌آوری</label>
        <textarea id="ifLogic" rows="3">${esc(k.logical_reasons||'')}</textarea></div>
      <div class="frow">
        <div class="fg"><label>۵. مبنا</label>${txt('ifBasis',k.basis)}</div>
        <div class="fg"><label>۶. جنبه</label>${sel('ifAspect',IND_ASPECTS_FA,k.aspect)}</div>
        <div class="fg"><label>۷. نوع شاخص</label>${sel('ifType',IND_TYPES_FA,k.indicator_type)}</div>
        <div class="fg"><label>۸. جهت مطلوب</label>${sel('ifDesir',IND_DESIR_FA,k.desirability)}</div>
      </div>
      <div class="frow">
        <div class="fg"><label>۹. واحد اندازه‌گیری</label>${txt('ifUnit',k.unit,'درصد، دقیقه، تعداد…')}</div>
        <div class="fg"><label>۱۰. روش گزارش</label>${txt('ifReport',k.report_type)}</div>
        <div class="fg"><label>۱۱. دوره اندازه‌گیری</label>${sel('ifInterval',IND_INTERVALS_FA,k.measure_interval)}</div>
        <div class="fg"><label>۱۲. مهلت ارسال</label>${txt('ifDelivery',k.delivery_respite)}</div>
      </div>
      <div class="frow">
        <div class="fg"><label>۱۳. سال</label>${num('ifYear',k.year==null?(S.year||''):k.year)}</div>
        <div class="fg"><label>۱۴. منبع</label>${txt('ifSource',k.source,'الزامی (دانشگاه) / اختیاری')}</div>
        <div class="fg"><label>۱۵. حد بالا</label>${num('ifUpper',k.upper_limit)}</div>
        <div class="fg"><label>۱۶. حد پایین</label>${num('ifLower',k.lower_limit)}</div>
        <div class="fg"><label>۱۷. هدف</label>${num('ifTarget',k.target_value)}</div>
      </div>
      <div class="fg"><label>۲۰. ابعاد کیفیت</label>
        <div class="ind-cks">${IND_QUALITY_FA.map((v,i)=>
          `<label class="ind-ck"><input type="checkbox" class="ifQ" value="${esc(v)}" ${q.includes(v)?'checked':''}> ${esc(v)}</label>`).join('')}</div></div>
      <div class="fg"><label>سایر</label>
        <div class="ind-cks">
          ${chk('ifSafety',k.safety_related,'شاخص ایمنی بیمار')}
          ${chk('ifMand',k.is_mandatory,'اجباری')}
          ${chk('ifKartabl',k.send_to_kartabl,'ارسال به کارتابل جمع‌آورنده')}
          ${chk('ifBsc',k.see_bsc,'۲۱. نمایش در کارت امتیازی متوازن')}
        </div></div>
      <div class="frow" style="justify-content:flex-end">
        <button class="btn btn-o btn-sm" onclick="indCancelForm()">انصراف</button>
        <button class="btn btn-g btn-sm" onclick="indSave('${k.id||''}')">ذخیره</button>
      </div>
    </div>
  </div>`;
}

function indNew(){ $('content').innerHTML=indForm({}); }
function indEdit(id){
  const k=(IND.detailData&&IND.detailData.indicator&&IND.detailData.indicator.id===id)
    ? IND.detailData.indicator
    : (IND.data&&IND.data.indicators||[]).find(x=>x.id===id);
  if(!k){ toast('شاخص پیدا نشد',true); return; }
  $('content').innerHTML=indForm(k);
}
function indCancelForm(){ renderIndicators(); }
