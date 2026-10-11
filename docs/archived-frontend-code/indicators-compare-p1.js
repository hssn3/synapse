/**
 * Quality Indicator Comparison Charts Part 1
 * Modular Frontend Component — Project 313
 */
// ==================== نمودار مقایسه‌ای ====================
//
// کارفرما: «نمودارهای مقایسه‌ای را با فیلتر ماه و سال یا تاریخ دستی ایجاد کن.»
// تا امروز فقط روندِ یک شاخص در یک سال دیده می‌شد، پس نه دو شاخص را می‌شد کنار
// هم گذاشت و نه امسال را با پارسال سنجید.
//
// سه حالتِ آماده که کارفرما نام برد، همه روی یک بازه‌ی پیوسته سوارند (سرور
// فقط همین یک شکل را می‌فهمد؛ حالت‌ها فقط میان‌برِ پرکردنِ همان چهار عددند):
//   «سال»       → فروردین تا اسفندِ یک سال
//   «ماه»       → یک ماهِ مشخص، در چند سالِ پیاپی
//   «بازه‌ی دستی» → هر شروع و پایانی که کاربر بخواهد
const CMP = { mode:'year', year:null, month:1, years:3,
  fy:null, fm:1, ty:null, tm:12, category:'', ids:[], data:null, loading:false,
  // '' = خودکار (مشترک اگر واحدها یکی باشند)، 'shared'، 'own'
  scale:'',
  // نوعِ نمودار. پیش‌فرضِ میله‌ای، طبق خواسته‌ی کارفرما: 'bar' | 'line' | 'pie'
  kind:'bar',
  // دانه‌بندیِ دوره: 'month' | 'quarter' | 'half' | 'year'
  grain:'month',
  // چیدمان: 'timeline' خطِ زمانِ پیوسته، 'yoy' تطبیقِ سال‌به‌سال (فروردین ۱۴۰۴
  // دقیقاً کنارِ فروردین ۱۴۰۵)
  align:'timeline',
  // جدولِ مقایسه‌ای زیرِ نمودار
  table:true,
  // ستونِ جمعِ فصلی درهمِ ماه‌ها + جمعِ کل، مثل نمودارهای خودِ کارفرما
  subtotals:false };

// ---- پالتِ رنگ ----
// کارفرما خواست بتواند رنگِ نمودارها را خودش تعریف کند. انتخابش در همین مرورگر
// می‌ماند (per-viewer)، چون سلیقه‌ی رنگ شخصی است و به داده‌ی بیمارستان ربطی ندارد.
const CMP_PALETTES = {
  classic: { name:'کلاسیک', colors:['#e0ab2e','#38bdf8','#4ade80','#f472b6','#a78bfa','#fb923c','#22d3ee','#facc15'] },
  season:  { name:'فصلی', colors:['#4ade80','#facc15','#fb923c','#38bdf8','#a78bfa','#f472b6','#22d3ee','#e0ab2e'] },
  calm:    { name:'ملایم', colors:['#7dd3fc','#86efac','#fcd34d','#fda4af','#c4b5fd','#5eead4','#fdba74','#a5b4fc'] },
  bold:    { name:'پررنگ', colors:['#dc2626','#2563eb','#16a34a','#d97706','#7c3aed','#0891b2','#db2777','#65a30d'] },
  print:   { name:'مناسبِ چاپ', colors:['#1d4ed8','#b91c1c','#15803d','#a16207','#6d28d9','#0e7490','#be185d','#3f6212'] },
};
// رنگِ چهار فصل، برای وقتی محورِ افقی فصل است. خواسته‌ی صریحِ کارفرما بود که
// «رنگ فصل‌های نموداری با هم فرق داشته باشد» — سبزِ بهار، زردِ تابستان،
// نارنجیِ پاییز، آبیِ زمستان.
const CMP_SEASON_COLORS = ['#4ade80','#facc15','#fb923c','#38bdf8'];
const CMP_HALF_COLORS = ['#4ade80','#38bdf8'];

function cmpPaletteKey(){
  try{ return localStorage.getItem('cmp_palette') || 'classic'; }catch(e){ return 'classic'; }
}
function cmpCustom(){
  try{ return JSON.parse(localStorage.getItem('cmp_custom')||'null'); }catch(e){ return null; }
}
// رنگ‌های فعال: یا پالتِ آماده، یا رنگ‌هایی که کاربر تک‌تک انتخاب کرده.
function cmpColors(){
  const c=cmpCustom();
  if(c && Array.isArray(c) && c.length) return c;
  return (CMP_PALETTES[cmpPaletteKey()] || CMP_PALETTES.classic).colors;
}
function cmpColorAt(i){ const c=cmpColors(); return c[i % c.length]; }

// رنگِ یک میله. وقتی محورِ افقی «فصل» یا «نیمه»ی سال است و فقط یک سری روی
// نمودار است، رنگ از خودِ فصل می‌آید (بهار سبز، تابستان زرد، …) — خواسته‌ی
// کارفرما. با چند سری این کار غلط می‌شود: آنجا رنگ باید سری‌ها را از هم جدا
// کند، وگرنه دو سریِ متفاوت در یک فصل هم‌رنگ می‌شوند و نمودار بی‌معنا.
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

