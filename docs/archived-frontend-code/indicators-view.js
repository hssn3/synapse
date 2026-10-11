/**
 * Quality Hospital KPIs & Indicators Bank
 * Modular Frontend Component — Project 313
 */
// ==================== ماژول شاخص ====================
// سند مرجعِ کارفرما (بخش ۱۰) سه نما می‌خواهد: داشبورد، فهرست، و شناسنامه‌ی تکی.
// هر سه در همان #content عوض می‌شوند — همان الگویی که بقیه‌ی صفحه‌ها دارند —
// نه پنجره‌ی شناور، چون این پروژه اصلاً سیستم modal ندارد و ساختنش برای یک
// صفحه یعنی یک الگوی تازه که جای دیگری تکرار نمی‌شود.
let IND = { view:'list', page:1, per:10, filters:{}, data:null, detail:null, facets:null, canManage:false };

const IND_ASPECTS_FA = ['بالینی','مدیریتی'];
const IND_TYPES_FA = ['ساختاری','فرآیندی','پیامدی'];
const IND_INTERVALS_FA = ['ماهانه','سه ماه یکبار','شش ماه یکبار','سالانه'];
const IND_DESIR_FA = ['افزاینده','کاهنده'];
const IND_QUALITY_FA = ['ایمنی','اثربخشی','کارایی','بیمار محوری','رضایتمندی','به موقع بودن خدمات','عدالت'];
const IND_STATUS_COLOR = { ok:'var(--ok)', warn:'var(--wr)', down:'var(--dn)' };

const canViewIndicators = () => { const p=S.user?.permissions||[]; return p.includes('view_indicators')||p.includes('manage_indicators')||p.includes('view_bsc')||p.includes('manage_bsc'); };
function indCan(){ const p=S.user?.permissions||[]; return p.includes('manage_indicators'); }

// ---- پیوندِ شاخص با درختِ اعتباربخشی ----
//
// کارفرما گفت شاخص‌ها «منطق ندارند» و معلوم نیست ارتباطشان با سنجه‌ها چیست.
// هر شاخص حالا در دیتابیس یک linked_axis_code دارد (نگاشتِ دسته‌ی شاخص به محور،
// در database/seed-indicators.js با دلیلِ هرکدام). این‌جا فقط نمایش داده می‌شود
// و کلیک‌پذیر است تا کاربر از شاخص به همان محورِ سنجه‌ها برود — همان چیزی که
// کارفرما خواست: «بشه استفاده کرد».
function axisTitleOf(code){
  if(!code) return '';
  for(const sec of (S.sections||[])) for(const ax of (sec.axes||[])) if(ax.code===code) return ax.title;
  return '';
}
// آیا این محور اصلاً در دامنه‌ی نقشِ کاربر هست؟ اگر نه، برچسب نشان داده می‌شود
// ولی کلیک‌پذیر نیست — وگرنه کاربر روی چیزی می‌زند که برایش باز نمی‌شود.
function axisReachable(code){ return !!axisTitleOf(code); }
function indAxisChip(code, big){
  if(!code) return '';
  const t=axisTitleOf(code), ok=!!t;
  return `<span class="ind-axis${big?' big':''}${ok?' go':''}"
    ${ok?`role="link" tabindex="0" onclick="indGoAxis('${esc(code)}')" title="رفتن به سنجه‌های این محور"`:'title="این محور در دامنه‌ی سمت شما نیست"'}>
    <b>${escn(code)}</b>${t?`<span>${esc(t)}</span>`:''}</span>`;
}
function indGoAxis(code){ S.axis=code; go('measures'); }

async function renderIndicators(){
  $('ptitle').textContent='شاخص‌های بیمارستان';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  IND.canManage = indCan();
  try{
    if(IND.view==='detail' && IND.detail){ await indLoadDetail(IND.detail); return; }
    if(IND.view==='dash'){ await indLoadDash(); return; }
    if(IND.view==='cmp'){ await indLoadCompare(); return; }
    if(IND.view==='rep'){ await indLoadReport(); return; }
    await indLoadList();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}

function indQuery(){
  const f=IND.filters, p=new URLSearchParams();
  p.set('page', IND.page); p.set('per_page', IND.per);
  for(const k of ['search','category','ward','aspect','type','interval','basis','safety','mandatory','active','axis']){
    if(f[k]) p.set(k, f[k]);
  }
  return p.toString();
}

async function indLoadList(){
  const d=await API.indicators(indQuery());
  IND.data=d; IND.facets=d.facets; IND.view='list';
  indDrawList();
}

// ---- نوار نماها ----
function indTabs(active){
  const tab=(k,t)=>`<button class="tgl ${active===k?'on':''}" onclick="indGo('${k}')">${t}</button>`;
  return `<div class="pathbar" style="margin-bottom:12px">
    ${tab('dash','داشبورد شاخص‌ها')}${tab('list','فهرست شاخص‌ها')}${tab('cmp','نمودار مقایسه‌ای')}${tab('rep','گزارش')}</div>`;
}
function indGo(v){ IND.view=v; IND.detail=null; renderIndicators(); }

function indDrawList(){
  const d=IND.data, f=IND.filters;
  const opt=(list,sel)=>['<option value="">همه</option>'].concat(
    (list||[]).map(v=>`<option value="${esc(v)}" ${String(sel)===String(v)?'selected':''}>${esc(v)}</option>`)).join('');
  const from=(d.page-1)*d.per_page;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">◈</div>
      <div style="flex:1"><h3>فهرست شاخص‌ها</h3>
        <div class="sub">${fa(d.total)} شاخص — صفحه‌ی ${fa(d.page)} از ${fa(d.pages)}</div></div>
      ${IND.canManage?`<button class="btn btn-g btn-sm" style="align-self:end;margin-bottom:1px" onclick="indNew()">+ شاخص جدید</button>`:''}
      <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="indPrint()">${ic('print')} چاپ</button>
      <a class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" href="${API.indicatorsExportUrl()}"
         download="indicators.csv">⤓ خروجی اکسل (CSV)</a>
      <a class="btn btn-g btn-sm" style="align-self:end;margin-bottom:1px" href="/api/export/indicators.xlsx"
         download="indicators.xlsx">⤓ خروجی xlsx</a>
    </div>
    <div class="pbody">
      ${indTabs('list')}
      <div class="frow">
        <div class="fg"><label>جست‌وجو در عنوان، کد و تعریف</label>
          <input id="indSearch" value="${esc(f.search||'')}" placeholder="مثلاً سقوط بیمار" onkeydown="if(event.key==='Enter')indApply()"></div>
        <div class="fg"><label>دسته</label><select id="indCat">${opt(d.facets.categories,f.category)}</select></div>
        <div class="fg"><label>بخش / واحد</label><select id="indWard">${opt(d.facets.wards,f.ward)}</select></div>
        <div class="fg"><label>جنبه</label><select id="indAspect">${opt(d.facets.aspects,f.aspect)}</select></div>
        <div class="fg"><label>نوع شاخص</label><select id="indType">${opt(d.facets.types,f.type)}</select></div>
        <div class="fg"><label>دوره اندازه‌گیری</label><select id="indInterval">${opt(d.facets.intervals,f.interval)}</select></div>
        <div class="fg"><label>فقط ایمنی بیمار</label>
          <select id="indSafety"><option value="">همه</option><option value="1" ${f.safety==='1'?'selected':''}>بله</option></select></div>
        <div class="fg"><label>الزام</label>
          <select id="indMand"><option value="">همه</option>
            <option value="1" ${f.mandatory==='1'?'selected':''}>اجباری</option>
            <option value="0" ${f.mandatory==='0'?'selected':''}>اختیاری</option></select></div>
        <div class="fg"><label>&nbsp;</label>
          <div style="display:flex;gap:6px">
            <button class="btn btn-g btn-sm" onclick="indApply()">اعمال</button>
            <button class="btn btn-o btn-sm" onclick="indReset()">پاک‌کردن</button></div></div>
      </div>
      ${!d.indicators.length?'<div class="empty" style="padding:26px">شاخصی با این فیلترها پیدا نشد</div>':`
      ${indGroupedTable(d, from)}
      ${indPager(d)}`}
    </div>
  </div>`;
}

// جدولِ فهرست، گروه‌بندی‌شده بر اساس دسته‌ی شاخص.
//
// قبلاً یک جدولِ تختِ ۷۱ ردیفی بود و کارفرما همان را دید: «مرتبشان کن، منطق
// بهشان بده». دسته (category) همان چیزی است که خودِ سندِ مرجع با آن شاخص‌ها را
// دسته کرده — «کنترل عفونت»، «اورژانس»، «ایمنی بیمار» و… — پس گروه‌بندی روی آن
// یک دسته‌بندیِ ساختگیِ ما نیست.
//
// سرِ هر گروه، محورِ اعتباربخشیِ آن دسته هم می‌آید و کلیک‌پذیر است؛ یعنی از
// همین‌جا می‌شود به سنجه‌های همان محور رفت.
function indGroupedTable(d, from){
  const groups=[]; const idx={};
  d.indicators.forEach((k,i)=>{
    const g=k.category||'بدون دسته';
    if(idx[g]===undefined){ idx[g]=groups.length; groups.push({g, axis:k.linked_axis_code||'', rows:[]}); }
    groups[idx[g]].rows.push({k, n:from+i+1});
  });
  const head=`<thead><tr><th style="width:42px">#</th><th style="min-width:230px">عنوان شاخص</th>
    <th>جنبه</th><th>نوع</th><th>واحد</th><th>جهت</th><th>دوره</th>
    <th>هدف</th><th>ایمنی</th><th></th></tr></thead>`;
  return groups.map(gr=>`
    <div class="ind-grp">
      <div class="ind-grp-h">
        <b>${esc(gr.g)}</b>
        <span class="ind-grp-n">${fa(gr.rows.length)} شاخص</span>
        ${indAxisChip(gr.axis)}
      </div>
      <div class="tbl-wrap"><table>${head}
        <tbody>${gr.rows.map(({k,n})=>`<tr>
          <td>${fa(n)}</td>
          <td style="color:var(--th)"><a href="#" onclick="indOpen('${k.id}');return false">${esc(k.title)}</a>
            ${k.code?`<span class="tsub">کد: ${esc(k.code)}</span>`:''}</td>
          <td>${esc(k.aspect||'—')}</td>
          <td>${esc(k.indicator_type||'—')}</td><td>${esc(k.unit||'—')}</td>
          <td>${esc(k.desirability||'—')}</td><td>${esc(k.measure_interval||'—')}</td>
          <td>${k.target_value===null||k.target_value===undefined?'—':fa(k.target_value)}</td>
          <td>${k.safety_related?'✓':'—'}</td>
          <td><button class="tgl" onclick="indOpen('${k.id}')">شناسنامه</button></td>
        </tr>`).join('')}</tbody></table></div>
    </div>`).join('');
}

function indPager(d){
  if(d.pages<=1) return '';
  const btn=(p,t,on)=>`<button class="tgl ${on?'on':''}" ${p?`onclick="indPage(${p})"`:'disabled'}>${t}</button>`;
  let h='';
  // پنجره‌ی ۷تایی دور صفحه‌ی جاری — با ۷ صفحه هم فهرست دکمه‌ها کوتاه می‌ماند
  const first=Math.max(1, d.page-3), last=Math.min(d.pages, first+6);
  for(let p=first;p<=last;p++) h+=btn(p, fa(p), p===d.page);
  return `<div class="pathbar" style="margin-top:12px;justify-content:center">
    ${btn(d.page>1?d.page-1:0,'قبلی',false)}${h}${btn(d.page<d.pages?d.page+1:0,'بعدی',false)}
    <span class="sub" style="margin-inline-start:8px">${fa(d.total)} شاخص</span></div>`;
}

function indPage(p){ IND.page=p; renderIndicators(); }
function indApply(){
  const v=id=>{ const e=$(id); return e?e.value.trim():''; };
  IND.filters={ search:v('indSearch'), category:v('indCat'), ward:v('indWard'),
    aspect:v('indAspect'), type:v('indType'),
    interval:v('indInterval'), safety:v('indSafety'), mandatory:v('indMand') };
  IND.page=1; renderIndicators();
}
function indReset(){ IND.filters={}; IND.page=1; renderIndicators(); }

// ---- داشبورد ----
async function indLoadDash(){
  const d=await API.indicatorsDashboard(S.year||undefined);
  const s=d.summary;
  const bars=(obj,title)=>{
    const ent=Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]);
    const max=Math.max(1, ...ent.map(e=>e[1]));
    return `<div class="ind-ch"><div class="ind-cht">${title}</div>
      ${ent.map(([k,v])=>`<div class="ind-bar">
        <span class="ind-bl">${esc(k)}</span>
        <span class="ind-bt"><i style="width:${Math.round(v/max*100)}%"></i></span>
        <span class="ind-bv">${fa(v)}</span></div>`).join('')}</div>`;
  };
  const kpi=(t,v,sub,col)=>`<div class="ind-kpi"><div class="ind-kv" ${col?`style="color:${col}"`:''}>${fa(v)}</div>
    <div class="ind-kt">${t}</div>${sub?`<div class="ind-ks">${sub}</div>`:''}</div>`;
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">◈</div>
      <div style="flex:1"><h3>داشبورد شاخص‌ها — سال ${fa(d.year)}</h3>
        <div class="sub">وضعیت «سرِ هدف بودن» از آخرین ماهِ ثبت‌شده‌ی هر شاخص می‌آید، نه از میانگین سال</div></div>
      <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="indGo('list')">فهرست شاخص‌ها ›</button>
    </div>
    <div class="pbody">
      ${indTabs('dash')}
      <div class="ind-kpis">
        ${kpi('کل شاخص‌ها', s.total, `${fa(d.safety_count)} شاخص ایمنی بیمار`)}
        ${kpi('دارای داده در امسال', s.with_data, `پوشش ${fa(s.coverage_percent)}٪`)}
        ${kpi('در حد هدف', s.on_target, 'بر پایه‌ی آخرین ماه', 'var(--ok)')}
        ${kpi('دور از هدف', s.off_target, 'نیازمند اقدام', 'var(--dn)')}
      </div>
      ${s.with_data===0?`<div class="empty" style="padding:20px">
        هنوز برای هیچ شاخصی در سال ${fa(d.year)} داده‌ای ثبت نشده است.
        از فهرست شاخص‌ها، شناسنامه‌ی هر شاخص را باز کنید و مقدار ماهانه را وارد کنید.</div>`:''}
      <div class="ind-chs">
        ${bars(d.by_ward,'تفکیک بخش')}
        ${bars(d.by_type,'تفکیک نوع شاخص')}
        ${bars(d.by_aspect,'بالینی در برابر مدیریتی')}
        ${bars(d.by_interval,'دوره‌ی اندازه‌گیری')}
      </div>
      ${d.recent&&d.recent.length?`<div class="ind-ch"><div class="ind-cht">آخرین شاخص‌های به‌روزشده</div>
        ${d.recent.map(r=>`<div class="ind-bar"><a href="#" onclick="indOpen('${r.id}');return false"
          style="flex:1">${esc(r.title)}</a><span class="ind-bv">${esc(r.ward_name||'')}</span></div>`).join('')}</div>`:''}
    </div>
  </div>`;
}

// ---- شناسنامه‌ی یک شاخص ----
function indOpen(id){ IND.view='detail'; IND.detail=id; renderIndicators(); }

async function indLoadDetail(id){
  const d=await API.indicator(id, S.year||undefined);
  IND.detailData=d;
  const k=d.indicator;
  const row=(t,v)=>`<div class="ind-f"><span class="ind-fl">${t}</span><span class="ind-fv">${v||'—'}</span></div>`;
  const max=Math.max(1, ...d.trend.filter(v=>v!==null).map(v=>Math.abs(v)));
  const spark=d.trend.map((v,i)=>{
    const st=d.trend_status[i], col=IND_STATUS_COLOR[st]||'var(--gdl)';
    const h=v===null?0:Math.max(3, Math.round(Math.abs(v)/max*100));
    return `<span class="ind-sp" title="${esc(d.months_fa[i])}: ${v===null?'بدون داده':fa(v)}"
      onclick="${IND.canManage?`indSetValue('${k.id}',${i+1})`:''}" ${IND.canManage?'style="cursor:pointer"':''}>
      <i style="height:${h}%;background:${v===null?'rgba(255,255,255,.12)':col}"></i>
      <b>${esc(d.months_fa[i].slice(0,3))}</b>
      <u>${v===null?'—':fa(v)}</u></span>`;
  }).join('');

  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">◈</div>
      <div style="flex:1"><h3>${esc(k.title)}</h3>
        <div class="sub">${esc(k.ward_name||'بدون بخش')} — ${esc(k.aspect||'')} ${k.code?`— کد ${esc(k.code)}`:''}</div>
        ${k.linked_axis_code?`<div style="margin-top:7px">${indAxisChip(k.linked_axis_code,true)}</div>`:''}</div>
      <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="indGo('list')">‹ بازگشت به فهرست</button>
      ${IND.canManage?`<button class="btn btn-g btn-sm" style="align-self:end;margin-bottom:1px" onclick="indEdit('${k.id}')">ویرایش شناسنامه</button>
      <button class="btn btn-o btn-sm" style="align-self:end;margin-bottom:1px" onclick="indDeactivate('${k.id}')">غیرفعال‌کردن</button>`:''}
    </div>
    <div class="pbody">
      <div class="ind-ch"><div class="ind-cht">روند سال ${fa(d.year)}${IND.canManage?' — برای ثبت مقدار روی ستون ماه کلیک کنید':''}</div>
        <div class="ind-spark">${spark}</div></div>

      <div class="ind-ch"><div class="ind-cht">شناسنامه</div>
        <div class="ind-fs">
          ${row('کد شاخص', esc(k.code||''))}
          ${row('بخش / واحد مسئول', esc(k.ward_name||''))}
          ${row('جنبه', esc(k.aspect||''))}
          ${row('نوع شاخص', esc(k.indicator_type||''))}
          ${row('جهت مطلوب', esc(k.desirability||''))}
          ${row('واحد اندازه‌گیری', esc(k.unit||''))}
          ${row('دوره‌ی اندازه‌گیری', esc(k.measure_interval||''))}
          ${row('روش گزارش', esc(k.report_type||''))}
          ${row('مبنا', esc(k.basis||''))}
          ${row('منبع', esc(k.source||''))}
          ${row('مهلت ارسال', esc(k.delivery_respite||''))}
          ${row('سال', k.year?fa(k.year):'')}
          ${row('هدف', k.target_value===null||k.target_value===undefined?'':fa(k.target_value))}
          ${row('حد بالا', k.upper_limit===null||k.upper_limit===undefined?'':fa(k.upper_limit))}
          ${row('حد پایین', k.lower_limit===null||k.lower_limit===undefined?'':fa(k.lower_limit))}
          ${row('شاخص ایمنی بیمار', k.safety_related?'بله':'خیر')}
          ${row('الزام', k.is_mandatory?'اجباری':'اختیاری')}
          ${row('ارسال به کارتابل', k.send_to_kartabl?'بله':'خیر')}
          ${row('در کارت امتیازی', k.see_bsc?'بله':'خیر')}
          ${row('ابعاد کیفیت', (k.quality_dimension||[]).map(esc).join('، '))}
          ${row('محور اعتباربخشیِ مرتبط', k.linked_axis_code
            ? escn(k.linked_axis_code)+(axisTitleOf(k.linked_axis_code)?' — '+esc(axisTitleOf(k.linked_axis_code)):'') : '')}
        </div>
      </div>

      ${k.definition?`<div class="ind-ch"><div class="ind-cht">تعریف شاخص</div>
        <div class="ind-tx">${esc(k.definition).replace(/\n/g,'<br>')}</div></div>`:''}
      ${k.logical_reasons?`<div class="ind-ch"><div class="ind-cht">منطق و دلیل جمع‌آوری</div>
        <div class="ind-tx">${esc(k.logical_reasons).replace(/\n/g,'<br>')}</div></div>`:''}

      <div class="ind-ch"><div class="ind-cht">مقادیر ثبت‌شده‌ی سال ${fa(d.year)}</div>
        ${!d.values.length?'<div class="empty" style="padding:16px">برای این سال مقداری ثبت نشده است</div>':`
        <div class="tbl-wrap"><table>
          <thead><tr><th>ماه</th><th>مقدار</th><th>وضعیت</th><th>ثبت‌کننده</th><th>تأییدکننده</th><th>یادداشت</th>
            ${IND.canManage?'<th></th>':''}</tr></thead>
          <tbody>${d.values.map(v=>`<tr>
            <td>${esc(d.months_fa[v.jalali_month-1]||v.jalali_month)}</td>
            <td><b>${v.value===null?'—':fa(v.value)}</b></td>
            <td>${esc(v.status||'')}</td>
            <td>${esc(v.recorded_by_name||'—')}</td>
            <td>${esc(v.approved_by_name||'—')}</td>
            <td>${esc(v.note||'—')}</td>
            ${IND.canManage?`<td><button class="tgl" onclick="indSetValue('${k.id}',${v.jalali_month})">ویرایش</button>
              ${v.status!=='تأییدشده'?`<button class="tgl" onclick="indApprove('${k.id}',${v.jalali_month})">تأیید</button>`:''}</td>`:''}
          </tr>`).join('')}</tbody></table></div>`}
      </div>
    </div>
  </div>`;
}

