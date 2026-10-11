/**
 * Indicator Comparative Analytics
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function cmpBarColor(d, si, pi){
  if(d && d.series && d.series.length===1){
    if(d.grain==='quarter') return CMP_SEASON_COLORS[pi % CMP_SEASON_COLORS.length];
    if(d.grain==='half') return CMP_HALF_COLORS[pi % CMP_HALF_COLORS.length];
  }
  return cmpColorAt(si);
}

function cmpDefaults(){
  const y=S.year||1404;
  if(CMP.year===null) CMP.year=y;
  if(CMP.fy===null){ CMP.fy=y; CMP.ty=y; }
}
// حالت‌ها را به همان چهار عددی ترجمه می‌کند که سرور می‌خواهد.
function cmpRange(){
  cmpDefaults();
  if(CMP.mode==='year')  return {from_year:CMP.year, from_month:1, to_year:CMP.year, to_month:12};
  if(CMP.mode==='month') return {from_year:CMP.year-(CMP.years-1), from_month:CMP.month,
                                 to_year:CMP.year, to_month:CMP.month};
  return {from_year:CMP.fy, from_month:CMP.fm, to_year:CMP.ty, to_month:CMP.tm};
}

async function indLoadCompare(){
  cmpDefaults();
  // فهرستِ شاخص‌ها برای انتخاب‌گر، یک‌بار و کامل (نه صفحه‌بندی‌شده) — کاربر باید
  // بتواند هر شاخصی را انتخاب کند، نه فقط ده‌تای صفحه‌ی جاری.
  if(!CMP.all){
    const l=await API.indicators('per_page=200&active=1');
    CMP.all=l.indicators||[]; CMP.cats=(l.facets&&l.facets.categories)||[];
  }
  const r=cmpRange();
  const p=new URLSearchParams(r);
  p.set('grain', CMP.grain||'month');
  p.set('align', CMP.align||'timeline');
  if(CMP.subtotals) p.set('subtotals','1');
  if(CMP.ids.length) p.set('ids', CMP.ids.join(','));
  else if(CMP.category) p.set('category', CMP.category);
  CMP.data = (CMP.ids.length||CMP.category) ? await API.indicatorsCompare(p.toString()) : null;
  IND.view='cmp';
  cmpDraw();
}

function cmpDraw(){
  cmpDefaults();
  const d=CMP.data;
  const yOpts=(sel)=>{ let h=''; const base=S.year||1404;
    for(let y=base+1;y>=base-6;y--) h+=`<option value="${y}" ${y===sel?'selected':''}>${fa(y)}</option>`; return h; };
  const mOpts=(sel)=>JMONTHS.map((m,i)=>`<option value="${i+1}" ${i+1===sel?'selected':''}>${esc(m)}</option>`).join('');
  const modeBtn=(k,t)=>`<button class="tgl ${CMP.mode===k?'on':''}" onclick="cmpMode('${k}')">${t}</button>`;

  const picker=`<div class="cmp-pick">
    ${(CMP.all||[]).map(k=>`<label class="cmp-chip${CMP.ids.includes(k.id)?' on':''}">
      <input type="checkbox" value="${esc(k.id)}" ${CMP.ids.includes(k.id)?'checked':''}
        onchange="cmpToggle('${esc(k.id)}')"><span>${esc(k.title)}</span></label>`).join('')}
  </div>`;

  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">◈</div>
      <div style="flex:1"><h3>نمودار مقایسه‌ای شاخص‌ها</h3>
        <div class="sub">چند شاخص را کنار هم، در یک سال یا در چند سال، مقایسه کنید</div></div>
      <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="cmpPrint()">${ic('print')} چاپ</button>
    </div>
    <div class="pbody">
      ${indTabs('cmp')}

      <div class="ind-ch"><div class="ind-cht">بازه‌ی مقایسه</div>
        <div class="pathbar" style="margin-bottom:10px">
          ${modeBtn('year','یک سال کامل')}${modeBtn('month','یک ماه در چند سال')}${modeBtn('manual','بازه‌ی دستی')}
        </div>
        <div class="frow">
          ${CMP.mode==='year'?`
            <div class="fg"><label>سال</label><select id="cmpY">${yOpts(CMP.year)}</select></div>`:''}
          ${CMP.mode==='month'?`
            <div class="fg"><label>ماه</label><select id="cmpM">${mOpts(CMP.month)}</select></div>
            <div class="fg"><label>تا سالِ</label><select id="cmpY">${yOpts(CMP.year)}</select></div>
            <div class="fg"><label>چند سال اخیر</label>
              <select id="cmpN">${[2,3,4,5].map(n=>`<option value="${n}" ${n===CMP.years?'selected':''}>${fa(n)} سال</option>`).join('')}</select></div>`:''}
          ${CMP.mode==='manual'?`
            <div class="fg"><label>از سال</label><select id="cmpFY">${yOpts(CMP.fy)}</select></div>
            <div class="fg"><label>از ماه</label><select id="cmpFM">${mOpts(CMP.fm)}</select></div>
            <div class="fg"><label>تا سال</label><select id="cmpTY">${yOpts(CMP.ty)}</select></div>
            <div class="fg"><label>تا ماه</label><select id="cmpTM">${mOpts(CMP.tm)}</select></div>`:''}
          <div class="fg"><label>یا کلِ یک دسته</label>
            <select id="cmpCat"><option value="">— انتخاب دسته —</option>
              ${(CMP.cats||[]).map(c=>`<option value="${esc(c)}" ${CMP.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
          <div class="fg"><label>&nbsp;</label><div style="display:flex;gap:6px">
            <button class="btn btn-g btn-sm" onclick="cmpApply()">رسم نمودار</button>
            <button class="btn btn-o btn-sm" onclick="cmpReset()">پاک‌کردن</button></div></div>
        </div>
      </div>

      <div class="ind-ch"><div class="ind-cht">شاخص‌های انتخاب‌شده${CMP.ids.length?` (${fa(CMP.ids.length)} از حداکثر ۸)`:''}</div>
        ${picker}</div>

      ${!d?`<div class="empty" style="padding:26px">
          برای دیدن نمودار، دستِ‌کم یک شاخص را از فهرست بالا انتخاب کنید یا یک دسته را برگزینید.
        </div>`
       :!d.series.length?'<div class="empty" style="padding:26px">شاخصی برای این انتخاب پیدا نشد</div>'
       :cmpChart(d)}
    </div>
  </div>`;
}

// نمودارِ خطیِ چندسری با SVG خام — نه یک کتابخانه‌ی تازه.
// این پروژه هیچ کتابخانه‌ی نموداری ندارد و اسپارک‌لاینِ شاخص هم دستی کشیده شده؛
// آوردنِ یک وابستگیِ جدید برای یک نما، هم حجم اضافه است و هم دو زبانِ بصریِ
// متفاوت روی یک صفحه.
// سه نوع نمودار روی همان یک داده: میله‌ای (پیش‌فرض)، خطی، دایره‌ای.
//
// کارفرما هر سه را خواست و گفت پیش‌فرض میله‌ای باشد و عدد/درصد بالای هر میله
// نوشته شود. انتخابِ پیش‌فرضِ درستی هم هست: برای «این ماه چقدر بود» چشم، ارتفاعِ
// میله را دقیق‌تر از شیبِ خط می‌خواند.
//
// هر سه از همان cmpScale (مقیاس مشترک / مقیاس هر شاخص) پیروی می‌کنند، جز
// دایره‌ای که ذاتاً سهمِ نسبی را نشان می‌دهد و مقیاس برایش بی‌معنی است.
// رنگ‌ها از پالتِ فعال می‌آیند (cmpColorAt بالاتر) تا انتخابِ کاربر همه‌جا اثر کند.
// گردکردنِ یکدست برای همه‌ی برچسب‌ها: عددِ ۱۲ رقمیِ اعشاری روی میله خوانده نمی‌شود.
function cmpNum(v){ return fa(Math.round(v*100)/100); }
// برچسبِ دوره از سرور به‌صورت «فروردین 1405» می‌آید — نامِ ماه فارسی ولی سالْ
// لاتین. روی نموداری که بقیه‌ی اعدادش فارسی است، این ناهماهنگی توی چشم می‌زند.
// fa() به تنظیمِ ارقامِ کاربر احترام می‌گذارد، پس اگر کسی لاتین را انتخاب کرده
// باشد همه‌چیز لاتین می‌ماند.
function cmpLbl(s){ return esc(fa(String(s == null ? '' : s))); }

// سطرِ «تغییرِ سال‌به‌سال» زیرِ جدولِ دوره‌به‌دوره.
//
// فقط در حالتِ تطبیقی و فقط وقتی دقیقاً دو سالِ همان شاخص روی جدول است معنا
// دارد: با سه سال، «تغییر» مبهم است (نسبت به کدام؟) و با دو شاخصِ مختلف اصلاً
// قابلِ تفریق نیست. در بقیه‌ی حالت‌ها سطر نمی‌آید — سطرِ گمراه‌کننده بدتر از
// نبودنِ سطر است.
function cmpDiffRow(d){
  if(d.align!=='yoy') return '';
  const byKpi={};
  for(const s of d.series){ (byKpi[s.id]=byKpi[s.id]||[]).push(s); }
  const ids=Object.keys(byKpi);
  if(ids.length!==1) return '';
  const pair=byKpi[ids[0]].slice().sort((x,y)=>(x.year||0)-(y.year||0));
  if(pair.length!==2) return '';
  const [older,newer]=pair;
  const hib = !(older.higher_is_better===0||older.higher_is_better===false);
  const cells=d.periods.map((p,i)=>{
    const a=older.points[i], b=newer.points[i];
    if(a===null||b===null||a===undefined||b===undefined) return '<td><span class="rep-nil">—</span></td>';
    const dv=b-a;
    if(Math.abs(dv)<1e-9) return '<td>۰</td>';
    const good = hib ? dv>0 : dv<0;
    return `<td><b style="color:${good?'var(--ok)':'var(--dn)'}">${dv>0?'▲':'▼'} ${cmpNum(Math.abs(dv))}</b></td>`;
  }).join('');
  const da=older.avg, db=newer.avg;
  let avgCell='<td>—</td>';
  if(da!==null&&db!==null){
    const dv=db-da, good = hib ? dv>0 : dv<0;
    avgCell = Math.abs(dv)<1e-9 ? '<td>۰</td>'
      : `<td><b style="color:${good?'var(--ok)':'var(--dn)'}">${dv>0?'▲':'▼'} ${cmpNum(Math.abs(dv))}</b></td>`;
  }
  return `<tr class="cmp-diff"><th>تغییر ${cmpLbl(newer.year)} نسبت به ${cmpLbl(older.year)}</th>${cells}${avgCell}</tr>`;
}

function cmpChart(d){
  const all=d.series.flatMap(s=>s.points.filter(v=>v!==null));
  if(!all.length) return '<div class="empty" style="padding:26px">در این بازه هیچ مقداری ثبت نشده است</div>';

  // مقیاس: مشترک یا به‌ازای هر شاخص.
  //
  // در تست، سه شاخص با واحدهای «ساعت»، «در هزار» و «دقیقه» با هم رسم شدند و روی
  // یک محورِ مشترک، دو سری عملاً روی خطِ کفِ نمودار له شدند — یعنی نمودار
  // «مقایسه‌ای» هیچ‌چیز را مقایسه نمی‌کرد. وقتی واحدها یکی نیستند، مقایسه‌ی
  // معنادار روی *روند* است نه روی عدد، پس پیش‌فرض در آن حالت مقیاسِ جداگانه
  // می‌شود: هر سری در دامنه‌ی خودش کشیده می‌شود و عددِ واقعی روی برچسبِ میله و
  // در جدولِ خلاصه می‌ماند. اگر همه یک واحد داشته باشند، مقیاسِ مشترک درست است.
  const units=new Set(d.series.map(s=>(s.unit||'').trim()));
  const sameUnit=units.size<=1;
  const shared = CMP.scale==='shared' || (CMP.scale!=='own' && sameUnit);
  const kind = CMP.kind || 'bar';

  // در حالتِ تطبیقی، هر سری یک (شاخص × سال) است و برچسبش سال را دارد؛ در حالتِ
  // پیوسته برچسب همان عنوانِ شاخص است. سرور هر دو را در s.label می‌گذارد.
  const nameOf=s=>s.label||s.title;
  const legend=d.series.map((s,si)=>`<span class="cmp-lg">
    <i style="background:${cmpColorAt(si)}"></i>${cmpLbl(nameOf(s))}${s.unit?` <u>(${esc(s.unit)})</u>`:''}</span>`).join('');

  const kindBtn=(k,t)=>`<button class="tgl ${kind===k?'on':''}" onclick="cmpKind('${k}')">${t}</button>`;
  const body = kind==='pie' ? cmpPie(d)
             : kind==='line' ? cmpLine(d, shared)
             : cmpBars(d, shared);

  // جدولِ خلاصه: «چه شد» را نمی‌شود از روی نمودار دقیق خواند.
  const delta=s=>{
    if(s.first===null||s.last===null) return '—';
    const dv=s.last-s.first;
    if(!dv) return 'بدون تغییر';
    // «بهتر/بدتر» از روی جهتِ مطلوبِ خودِ شاخص، نه از روی علامتِ عدد — برای
    // شاخصی مثل «عفونت بیمارستانی» کاهش خوب است.
    const good = s.higher_is_better===0 ? dv<0 : dv>0;
    return `<b style="color:${good?'var(--ok)':'var(--dn)'}">${dv>0?'▲':'▼'} ${cmpNum(Math.abs(dv))}</b>`;
  };
  const table=`<div class="tbl-wrap" style="margin-top:12px"><table>
    <thead><tr><th>شاخص</th><th>تعداد داده</th><th>کمینه</th><th>بیشینه</th><th>میانگین</th>
      <th>اولین</th><th>آخرین</th><th>تغییر</th><th>هدف</th></tr></thead>
    <tbody>${d.series.map((s,si)=>`<tr>
      <td><span class="cmp-lg"><i style="background:${cmpColorAt(si)}"></i>${cmpLbl(nameOf(s))}</span></td>
      <td>${fa(s.count)}</td>
      <td>${s.min===null?'—':cmpNum(s.min)}</td><td>${s.max===null?'—':cmpNum(s.max)}</td>
      <td>${s.avg===null?'—':cmpNum(s.avg)}</td>
      <td>${s.first===null?'—':cmpNum(s.first)}</td><td>${s.last===null?'—':cmpNum(s.last)}</td>
      <td>${delta(s)}</td>
      <td>${s.target_value===null||s.target_value===undefined?'—':cmpNum(s.target_value)}</td>
    </tr>`).join('')}</tbody></table></div>`;

  // جدولِ دوره‌به‌دوره: خواسته‌ی صریحِ کارفرما بود که «علاوه بر نمودار به‌صورت
  // جدولی هم بشود مقایسه کرد». جدولِ بالا خلاصه‌ی کلِ بازه است؛ این یکی خودِ
  // عددهاست، دوره در ستون و سری در سطر — همان چیدمانی که چشم برای «فروردین
  // ۱۴۰۴ در برابر فروردین ۱۴۰۵» می‌خواهد.
  //
  // در حالتِ تطبیقی یک ستونِ «تغییر» هم می‌آید: اختلافِ همان دوره با سالِ قبل،
  // که کلِ نکته‌ی مقایسه‌ی سال‌به‌سال است و کاربر نباید با دست حسابش کند.
  const gridTable = (()=>{
    if(kind==='pie') return '';
    const n=d.periods.length;
    // ستونِ زیاد روی صفحه له می‌شود؛ بالای ۱۳ دوره جدول می‌چرخد.
    const flip = n>13;
    const cell=v=> v===null||v===undefined ? '<span class="rep-nil">—</span>' : cmpNum(v);
    const uni=sameUnit ? (d.series[0]&&d.series[0].unit ? ' '+esc(d.series[0].unit) : '') : '';
    const dot=si=>`<i class="cmp-dot" style="background:${cmpColorAt(si)}"></i>`;
    if(flip){
      return `<div class="tbl-wrap cmp-grid" style="margin-top:12px"><table>
        <thead><tr><th>دوره</th>${d.series.map((s,si)=>
          `<th>${dot(si)}${cmpLbl(nameOf(s))}</th>`).join('')}</tr></thead>
        <tbody>${d.periods.map((p,i)=>`<tr class="${p.roll?'cmp-roll':''}"><th>${cmpLbl(p.label)}</th>
          ${d.series.map(s=>`<td>${cell(s.points[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    return `<div class="tbl-wrap cmp-grid" style="margin-top:12px"><table>
      <thead><tr><th>سری${uni}</th>${d.periods.map(p=>
          `<th class="${p.roll?'cmp-roll':''}">${cmpLbl(p.label)}</th>`).join('')}
        <th>میانگین</th></tr></thead>
      <tbody>${d.series.map((s,si)=>`<tr>
        <th>${dot(si)}${cmpLbl(nameOf(s))}</th>
        ${d.periods.map((p,i)=>`<td class="${p.roll?'cmp-roll':''}">${cell(s.points[i])}</td>`).join('')}
        <td><b>${s.avg===null?'—':cmpNum(s.avg)}</b></td></tr>`).join('')}
      ${cmpDiffRow(d)}</tbody></table></div>`;
  })();

  const grainBtn=(k,t)=>`<button class="tgl ${CMP.grain===k?'on':''}" onclick="cmpGrain('${k}')">${t}</button>`;
  const alignBtn=(k,t,ttl)=>`<button class="tgl ${CMP.align===k?'on':''}" title="${esc(ttl)}" onclick="cmpAlign('${k}')">${t}</button>`;
  const head = d.align==='yoy'
    ? `مقایسه‌ی سال‌به‌سال — ${cmpLbl((d.years||[]).join(' و '))}`
    : `مقایسه — ${cmpLbl(d.periods[0].label)} تا ${cmpLbl(d.periods[d.periods.length-1].label)}`;

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
