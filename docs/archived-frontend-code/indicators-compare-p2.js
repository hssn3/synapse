/**
 * Quality Indicator Comparison Charts Part 2
 * Modular Frontend Component — Project 313
 */
  return `<div class="ind-ch"><div class="ind-cht">${head}</div>
    <div class="cmp-scale">
      <span class="cmp-lbl">دوره</span>
      ${grainBtn('month','ماهانه')}${grainBtn('quarter','فصلی')}${grainBtn('half','شش‌ماهه')}${grainBtn('year','سالانه')}
    </div>
    <div class="cmp-scale">
      <span class="cmp-lbl">چیدمان</span>
      ${alignBtn('timeline','خط زمان','همه‌ی دوره‌ها پشتِ‌هم، از ابتدای بازه تا انتها')}
      ${alignBtn('yoy','تطبیق سال‌به‌سال','هر سال یک سری؛ فروردین ۱۴۰۴ دقیقاً کنارِ فروردین ۱۴۰۵')}
      <button class="tgl ${CMP.table?'on':''}" onclick="cmpTable()">جدول دوره‌به‌دوره</button>
      <button class="tgl ${CMP.subtotals?'on':''}" ${CMP.grain!=='month'?'disabled title="فقط با دانه‌بندی ماهانه"':'title="ستون جمع فصلی کنار ماه‌ها و جمع کل در انتها"'}
        onclick="cmpSubtotals()">جمع‌های دوره‌ای</button>
      ${cmpPaletteUI()}
    </div>
    <div class="cmp-scale">
      ${kindBtn('bar','میله‌ای')}${kindBtn('line','خطی')}${kindBtn('pie','دایره‌ای')}
    </div>
    <div class="cmp-legend">${legend}</div>
    ${kind==='pie'?'':`<div class="cmp-scale">
      <button class="tgl ${shared?'on':''}" onclick="cmpScale('shared')">مقیاس مشترک</button>
      <button class="tgl ${shared?'':'on'}" onclick="cmpScale('own')">مقیاس هر شاخص</button>
      <span class="sub">${shared
        ? 'همه روی یک محور — برای شاخص‌های هم‌واحد'
        : 'هر شاخص در دامنه‌ی خودش (۰ تا ۱۰۰٪) — برای مقایسه‌ی روند وقتی واحدها یکی نیستند؛ عددِ واقعی روی خودِ میله و در جدول زیر'}</span>
    </div>`}
    ${body}
    ${CMP.table?gridTable:''}
    ${table}</div>`;
}

// دامنه‌ی نمایش را یک‌جا حساب می‌کند تا میله و خط دقیقاً یک مقیاس داشته باشند
// و کاربر با عوض‌کردنِ نوعِ نمودار، شکلِ داده‌اش عوض نشود.
function cmpDomain(d, shared){
  const all=d.series.flatMap(s=>s.points.filter(v=>v!==null));
  let lo=Math.min(...all), hi=Math.max(...all);
  // میله باید از صفر شروع شود، وگرنه اختلافِ دو میله چند برابرِ واقعیت دیده
  // می‌شود — کلاسیک‌ترین دروغِ نموداری. برای خط لازم نیست.
  if(shared && lo>0) lo=0;
  if(lo===hi){ lo=lo-1; hi=hi+1; }
  const own=d.series.map(s=>{
    const f=s.points.filter(v=>v!==null);
    if(!f.length) return {lo:0,hi:1};
    let a=Math.min(...f), b=Math.max(...f);
    if(a>0) a=0;
    if(a===b){ a-=1; b+=1; }
    return {lo:a,hi:b};
  });
  return {lo,hi,own};
}

// ---- میله‌ای (پیش‌فرض) ----
// هر دوره یک خوشه، هر شاخص یک میله در آن خوشه، و عدد بالای هر میله.
function cmpBars(d, shared){
  const n=d.periods.length, m=d.series.length;
  const {lo,hi,own}=cmpDomain(d, shared);
  // عرض به تعدادِ میله وابسته است: با ۱۲ دوره × ۸ شاخص، عرضِ ثابتِ ۱۰۰۰ یعنی
  // میله‌های یک‌پیکسلی. wrap افقی اسکرول می‌گیرد.
  const PADX=54, PADY=30, H=340, GAP=3;
  // اول تلاش می‌کنیم همه‌چیز در عرضِ استانداردِ ۱۰۰۰ جا شود و فقط اگر میله‌ها
  // آن‌قدر باریک شوند که دیده نشوند، بوم را پهن‌تر می‌کنیم و اسکرول می‌دهیم.
  // نسخه‌ی اول برعکس عمل می‌کرد (اول عرض، بعد میله) و نتیجه‌اش این بود که با ۱۲
  // ماه و ۳ شاخص، بوم ۱۱۶۴ پیکسل می‌شد و نیمی از میله‌ها بیرونِ کادر می‌ماندند.
  const FITW=1000;
  let CLUS=(FITW-PADX*2)/Math.max(1,n);
  let BW=Math.floor((CLUS-16)/Math.max(1,m))-GAP;
  if(BW<9){ BW=9; CLUS=m*(BW+GAP)+16; }
  else BW=Math.min(BW, 34);
  const W=Math.max(FITW, PADX*2+n*CLUS);
  const plot=t=>H-PADY-t*(H-PADY*2);
  const tOf=(v,si)=>shared ? (v-lo)/(hi-lo) : (v-own[si].lo)/(own[si].hi-own[si].lo);

  const grid=[0,.25,.5,.75,1].map(t=>{
    const yy=plot(t);
    const lbl=shared ? cmpNum(lo+(hi-lo)*t) : fa(Math.round(t*100))+'٪';
    return `<line x1="${PADX}" x2="${W-PADX+10}" y1="${yy}" y2="${yy}" stroke="var(--bd)" stroke-width="1" opacity=".45"/>
      <text x="${PADX-8}" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--td)">${lbl}</text>`;
  }).join('');

  // ترتیبِ راست‌به‌چپ: فروردین سمتِ راست. رابط کاربری فارسی است و اسپارک‌لاینِ
  // شناسنامه‌ی شاخص هم (چون flex در RTL است) از قبل همین ترتیب را دارد؛ اگر
  // این نمودار برعکس می‌ماند، دو نمای همان داده دو جهت داشتند.
  const col_=i=>n-1-i;
  const cx=i=>PADX+col_(i)*CLUS+CLUS/2;
  const step=Math.ceil(n/14);
  const xlabels=d.periods.map((p,i)=> i%step?'':
    `<text x="${cx(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="var(--td)">${cmpLbl(p.label)}</text>`).join('');

  // برچسبِ عدد بالای میله فقط وقتی جا دارد؛ با میله‌ی خیلی باریک روی هم می‌افتد
  // و به‌جای کمک، ناخوانا می‌شود.
  const showLbl = BW>=14;
  const bars=d.periods.map((p,i)=>d.series.map((s,si)=>{
    const v=s.points[i];
    if(v===null||v===undefined) return '';
    const col=cmpBarColor(d, si, i);
    // ستونِ جمعِ دوره‌ای هم‌جنسِ ماه‌ها نیست (یا جمعشان است یا میانگینشان)، پس
    // نباید مثل آن‌ها دیده شود؛ وگرنه چشم آن را ماهِ سیزدهم می‌خواند.
    const isRoll=!!(d.periods[i]&&d.periods[i].roll);
    const t=Math.max(0, Math.min(1, tOf(v,si)));
    const yTop=plot(t), h=Math.max(2, (H-PADY)-yTop);
    const bx=PADX+col_(i)*CLUS+8+si*(BW+GAP);
    const lbl=showLbl?`<text x="${(bx+BW/2).toFixed(1)}" y="${(yTop-5).toFixed(1)}" text-anchor="middle"
      font-size="9.5" fill="${col}">${cmpNum(v)}</text>`:'';
    return `<g><rect x="${bx.toFixed(1)}" y="${yTop.toFixed(1)}" width="${BW}" height="${h.toFixed(1)}"
      rx="2.5" fill="${col}" opacity="${isRoll?'.42':'.88'}"
      ${isRoll?`stroke="${col}" stroke-width="1.4" stroke-dasharray="3 2"`:''}><title>${cmpLbl(s.label||s.title)} — ${cmpLbl(p.label)}: ${cmpNum(v)}${s.unit?' '+esc(s.unit):''}</title></rect>${lbl}</g>`;
  }).join('')).join('');

  // خطِ هدف فقط در مقیاسِ مشترک: در مقیاسِ جداگانه هر سری محورِ خودش را دارد و
  // یک خطِ افقی نمی‌تواند هدفِ همه باشد.
  const targets=!shared?'':d.series.map((s,si)=>{
    if(s.target_value===null||s.target_value===undefined) return '';
    const t=(s.target_value-lo)/(hi-lo);
    if(t<0||t>1) return '';
    const yy=plot(t), col=cmpColorAt(si);
    return `<line x1="${PADX}" x2="${W-PADX+10}" y1="${yy}" y2="${yy}" stroke="${col}" stroke-width="1.2"
      stroke-dasharray="5 5" opacity=".6"><title>هدف ${esc(s.title)}: ${cmpNum(s.target_value)}</title></line>`;
  }).join('');

  // min-width فقط وقتی که بوم واقعاً پهن‌تر از عرضِ استاندارد شده (میله‌های زیاد)؛
  // در حالت عادی SVG با پنل کوچک می‌شود. نسخه‌ی اول همیشه min-width می‌گذاشت و
  // نتیجه‌اش این بود که ستونِ برچسبِ محورِ عمودی بیرونِ کادر می‌افتاد.
  return `<div class="cmp-svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="cmp-svg"
    ${W>FITW?`style="min-width:${Math.min(W,1400)}px"`:'style="min-width:0"'}
    role="img" aria-label="نمودار میله‌ای مقایسه‌ای">${grid}${targets}${bars}${xlabels}</svg></div>`;
}

// ---- خطی ----
function cmpLine(d, shared){
  const W=1000, H=330, PADX=54, PADY=28;
  const n=d.periods.length;
  const {lo,hi,own}=cmpDomain(d, shared);
  const plot=t=>H-PADY-t*(H-PADY*2);
  // همان ترتیبِ راست‌به‌چپِ نمودار میله‌ای
  const x=i=>PADX+(n===1?(W-PADX*2)/2:(n-1-i)*(W-PADX*2)/(n-1));
  const yOf=(v,si)=>plot(shared ? (v-lo)/(hi-lo) : (v-own[si].lo)/(own[si].hi-own[si].lo));

  const grid=[0,.25,.5,.75,1].map(t=>{
    const yy=plot(t);
    const lbl=shared ? cmpNum(lo+(hi-lo)*t) : fa(Math.round(t*100))+'٪';
    return `<line x1="${PADX}" x2="${W-PADX}" y1="${yy}" y2="${yy}" stroke="var(--bd)" stroke-width="1" opacity=".45"/>
      <text x="${PADX-8}" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--td)">${lbl}</text>`;
  }).join('');

  const step=Math.ceil(n/12);
  const xlabels=d.periods.map((p,i)=> i%step?'':
    `<text x="${x(i)}" y="${H-6}" text-anchor="middle" font-size="10" fill="var(--td)">${cmpLbl(p.label)}</text>`).join('');

  const lines=d.series.map((s,si)=>{
    const col=cmpColorAt(si);
    // شکافِ داده = شکستِ خط، نه یک خطِ مستقیمِ ساختگی روی ماهِ ثبت‌نشده.
    const segs=[]; let cur=[];
    s.points.forEach((v,i)=>{ if(v===null){ if(cur.length)segs.push(cur); cur=[]; } else cur.push([x(i),yOf(v,si)]); });
    if(cur.length) segs.push(cur);
    const path=segs.map(sg=>'M'+sg.map(pt=>pt[0].toFixed(1)+','+pt[1].toFixed(1)).join('L')).join(' ');
    const dots=s.points.map((v,i)=>v===null?'':
      `<circle cx="${x(i).toFixed(1)}" cy="${yOf(v,si).toFixed(1)}" r="3.5" fill="${col}"><title>${esc(s.title)} — ${cmpLbl(d.periods[i].label)}: ${cmpNum(v)}</title></circle>`).join('');
    // خطِ هدف فقط وقتی معنی دارد که روی همان مقیاسی کشیده شود که خودِ سری
    // رویش است؛ اگر بیرونِ کادر بیفتد رسم نمی‌شود.
    const tY=(s.target_value===null||s.target_value===undefined)?null:yOf(s.target_value,si);
    const tgt=(tY===null||tY<PADY||tY>H-PADY)?'':
      `<line x1="${PADX}" x2="${W-PADX}" y1="${tY}" y2="${tY}"
        stroke="${col}" stroke-width="1.2" stroke-dasharray="5 5" opacity=".55"><title>هدف ${esc(s.title)}: ${cmpNum(s.target_value)}</title></line>`;
    return `<g>${tgt}<path d="${path}" fill="none" stroke="${col}" stroke-width="2.2"
      stroke-linejoin="round" stroke-linecap="round"/>${dots}</g>`;
  }).join('');

  return `<div class="cmp-svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="cmp-svg" role="img"
    aria-label="نمودار خطی مقایسه‌ای">${grid}${xlabels}${lines}</svg></div>`;
}

// ---- دایره‌ای ----
// یک نمودار دایره‌ای نمی‌تواند «روند» را نشان بدهد، پس هر شاخص با *میانگینِ همان
// بازه* در آن شرکت می‌کند و همین صریح نوشته می‌شود — وگرنه کاربر فکر می‌کند
// عددِ یک ماهِ مشخص است.
//
// شرط سلامت: سهم فقط وقتی معنی دارد که همه‌ی مقادیر نامنفی باشند و جمعشان مثبت
// باشد. اگر شاخصی منفی باشد (مثلاً اختلاف نسبت به هدف)، «۳۰٪ از کل» عددی
// بی‌معنی است و به‌جای نمودارِ گمراه‌کننده، پیغام داده می‌شود.
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

