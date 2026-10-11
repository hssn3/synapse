/**
 * Dashboard Organizational Divisions
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function loadPeriodProgress(){
  const box=$('periodProg'); if(!box) return;
  try{
    const r=await API.dutiesProgress();
    const order=['daily','weekly','monthly','quarterly','yearly'];
    box.innerHTML=order.map(k=>{
      const p=r[k]||{}; const has=p.pct!==null&&p.pct!==undefined;
      const tone=!has?'na':(p.pct>=100?'ok':(p.pct>=50?'mid':'low'));
      return `<div class="pp ${tone}${has&&tone!=='ok'?' needs-fill':''}">
        ${has&&tone!=='ok'?'<span class="fillring" aria-hidden="true"></span>':''}
        <div class="pp-l">${esc(p.label||k)}</div>
        <div class="pp-v">${has?`<b class="pp-pctnum" data-pct="${p.pct}">۰٪</b>`:'—'}</div>
        <div class="pp-bar"><span data-pct="${has?p.pct:0}" style="width:0%"></span></div>
        <div class="pp-n">${has?`${fa(p.done)} از ${fa(p.total)}`:'موردی در این بازه نیست'}</div>
      </div>`;
    }).join('');
    GAnim.staggerIn('.pp', box);
    box.querySelectorAll('.pp-bar > span[data-pct]').forEach((el,i)=>GAnim.growBar(el, +el.dataset.pct, {delay:.1+i*.06}));
    box.querySelectorAll('.pp-pctnum[data-pct]').forEach((el,i)=>GAnim.countUp(el, +el.dataset.pct, {suffix:'٪', toFa:fa, delay:.1+i*.06}));
    GAnim.pulseNeedsFill('.pp.needs-fill .fillring', box);
  }catch(e){
    box.innerHTML=`<div class="dempty">${esc(e.message||'خطا در بارگذاری پیشرفت')}</div>`;
  }
}

// شرح وظایف قانونی — جدا از کارهای دوره‌ای، چون جنسشان فرق دارد: این‌ها «شغلِ
// این سمت طبق سازمان» است و تیک انجام‌شده ندارد. منبع هر بند نشان داده می‌شود،
// وگرنه در ارائه به بیمارستان قابل دفاع نیست.
async function loadLegalDuties(){
  const box=$('legalList'); if(!box) return;
  try{
    const r=await API.legalDuties();
    const list=r.duties||[];
    if(!list.length){ box.innerHTML='<div class="dempty">برای این سمت هنوز شرح وظایفی ثبت نشده است. شرح وظایف را مدیر داخلی ثبت می‌کند — از پیام‌های داخلی پیگیری کنید.<br><br><button type="button" class="btn btn-o btn-sm" onclick="go(\'messages\')">رفتن به پیام‌های داخلی</button></div>'; return; }
    const src=list.find(d=>d.source);
    box.innerHTML=`<ol class="legal">${list.map(d=>`<li>${esc(d.duty_text)}</li>`).join('')}</ol>`+
      (src?`<div class="legal-src">منبع: ${esc(src.source)}${r.custom?' — ویرایش‌شده توسط این مرکز':''}</div>`:'');
    GAnim.staggerIn('.legal li', box);
  }catch(e){
    box.innerHTML=`<div class="dempty">${esc(e.message||'خطا در بارگذاری شرح وظایف')}</div>`;
  }
}

async function loadDuties(){
  const box=$('dutyList'); if(!box) return;
  try{
    const r=await API.assistantReview();
    if(!r || r.configured===false){
      const canCfg=((S.user&&S.user.permissions)||[]).includes('manage_hospital_settings'); box.innerHTML='<div class="dempty">' + esc((r&&r.message)||'هنوز تنظیم نشده است') + '<br>سال شروع دوره‌ی اعتباربخشی را مدیر داخلی در تنظیمات ثبت می‌کند.<br><br>' + (canCfg?'<button type="button" class="btn btn-o btn-sm" onclick="go(\'settings\')">رفتن به تنظیمات</button>':'<button type="button" class="btn btn-o btn-sm" onclick="go(\'messages\')">پیام به مدیر داخلی</button>') + '</div>'; return;
    }
    const groups=r.groups||[];
    if(!groups.length){ box.innerHTML='<div class="dempty">وظیفه‌ای برای این سمت ثبت نشده</div>'; return; }
    box.innerHTML=groups.map(g=>`
      <div class="duty-g">
        <div class="duty-gh">${esc(g.phaseLabel||'')}</div>
        ${(g.items||[]).map(it=>`
          <div class="duty${it.done?' done':''}"${it.page?` style="cursor:pointer" onclick="go('${it.page}')"`:''}>
            <span class="duty-x">${it.done?'✓':'○'}</span>
            <span class="duty-b">
              <span class="duty-t">${esc(it.title)}${it.cadenceLabel?`<span class="duty-cad">${esc(it.cadenceLabel)}</span>`:''}</span>
              <span class="duty-d">${esc(it.desc||'')}</span>
              ${it.gap?`<span class="duty-gap">${esc(it.gap)}</span>`:''}
            </span>
            ${it.page?`<button type="button" class="duty-go" onclick="event.stopPropagation();go('${it.page}')">برو</button>`:''}
          </div>`).join('')}
      </div>`).join('');
    GAnim.staggerIn('.duty', box);
  }catch(e){
    box.innerHTML=`<div class="dempty">${esc(e.message||'خطا در بارگذاری وظایف')}</div>`;
  }
}

function renderDash(){
  $('ptitle').textContent=getUserDashboardTitle();
  const mine=myAxes(); const ms=[]; mine.forEach(({ax})=>ax.measures.forEach(m=>ms.push(m)));
  const st=calc(ms);
  let rank='عدم احراز', rc='var(--dn)';
  if(st.wpct>=90){rank='درجه یک عالی';rc='var(--ok)';}
  else if(st.wpct>=75){rank='درجه یک';rc='var(--ok)';}
  else if(st.wpct>=60){rank='درجه دو';rc='var(--wr)';}
  else if(st.wpct>=45){rank='درجه سه';rc='var(--wr)';}
  const byAxis=mine.map(({ax})=>{ const s=calc(ax.measures); return {code:ax.code,name:ax.title,pct:s.pct,f:s.f,total:ax.measures.length}; })
                   .sort((a,b)=>b.pct-a.pct);
  const T=st.total||1;
  const a1=st.f/T*360, a2=(st.f+st.p)/T*360, a3=(st.f+st.p+st.n)/T*360;
  const gdeg = -90 + Math.max(0,Math.min(100,st.wpct))*1.8;

  const sfPct = st.sfT ? Math.round(st.sfF / st.sfT * 100) : 0;

  // ترتیبِ خواسته‌شده: اول آمارِ کار (کارت‌های شیشه‌ای KPI + نمودار توزیع)، بلافاصله
  // زیرش فهرستِ کارهای مهم (سنجه‌های ایمنی بیمارِ تکمیل‌نشده — اولویتِ اول
  // رسیدگی)، و بعد از آن‌ها میان‌برهای ثانویه (نمودار سازمانی، بخش اختصاصی
  // نقش، جزئیاتِ بیشتر).
  $('content').innerHTML=`
  <div id="periodBanner"></div>
  <div class="kpi-grid">
    <div class="kpi-card kpi-success" role="button" tabindex="0" onclick="go('measures')" title="مشاهده سنجه‌های اعتباربخشی">
      <div class="kpi-header">
        <span class="kpi-title">سنجه‌های تکمیل‌شده</span>
        <span class="kpi-icon">✓</span>
      </div>
      <div class="kpi-value">${fa(st.f)} <span style="font-size:1.1rem;font-weight:600;color:var(--tm);margin-right:2px">/ ${fa(st.all||520)}</span></div>
      <div class="kpi-footer">
        <span class="trend-badge trend-up">↑ ${fa(st.pct)}٪ انطباق</span>
        <span>از کل ۵۲۰ سنجه</span>
      </div>
      <div class="kpi-progress"><div class="kpi-progress-bar bar-ok" style="width:${st.pct}%"></div></div>
    </div>

    <div class="kpi-card kpi-info" role="button" tabindex="0" onclick="go('measures')" title="سنجه‌های ایمنی بیمار">
      <div class="kpi-header">
        <span class="kpi-title">ایمنی بیمار ${help('safety')}</span>
        <span class="kpi-icon">⛨</span>
      </div>
      <div class="kpi-value">${fa(sfPct)}٪</div>
      <div class="kpi-footer">
        <span class="trend-badge trend-up">${fa(st.sfF)} از ${fa(st.sfT||123)}</span>
        <span>سنجه‌های الزامی</span>
      </div>
      <div class="kpi-progress"><div class="kpi-progress-bar bar-pri" style="width:${sfPct}%"></div></div>
    </div>

    <div class="kpi-card ${st.wpct>=75?'kpi-success':(st.wpct>=45?'kpi-warning':'kpi-danger')}">
      <div class="kpi-header">
        <span class="kpi-title">امتیاز وزنی و رتبه</span>
        <span class="kpi-icon">◈</span>
      </div>
      <div class="kpi-value">${fa(st.wpct)}٪</div>
      <div class="kpi-footer">
        <span class="trend-badge ${st.wpct>=60?'trend-up':'trend-down'}">${rank}</span>
        <span style="color:${rc};font-weight:700">ارزش‌گذاری وزنی</span>
      </div>
      <div class="kpi-progress"><div class="kpi-progress-bar ${st.wpct>=75?'bar-ok':(st.wpct>=45?'bar-wr':'bar-dn')}" style="width:${st.wpct}%"></div></div>
    </div>

    <div class="kpi-card kpi-warning" role="button" tabindex="0" onclick="go('walkarounds')" title="مشاهده مصوبات و پیگیری‌ها">
      <div class="kpi-header">
        <span class="kpi-title">مصوبات و پیگیری‌ها</span>
        <span class="kpi-icon">⚡</span>
      </div>
      <div class="kpi-value" id="kpiActiveResolutions"><span style="font-size:1.3rem;color:var(--td)">…</span></div>
      <div class="kpi-footer">
        <span class="trend-badge trend-neutral" id="kpiResBadge">در حال استعلام</span>
        <span id="kpiResSub">مصوبات در گردش</span>
      </div>
      <div class="kpi-progress"><div class="kpi-progress-bar bar-wr" id="kpiResBar" style="width:100%"></div></div>
    </div>
  </div>
  <div class="chartwrap">
    <div class="chart g"><h4>◈ توزیع وضعیت سنجه‌ها</h4>
      <div class="donut">
        <div class="dring" style="background:conic-gradient(var(--ok) 0deg ${a1}deg,var(--wr) ${a1}deg ${a2}deg,var(--dn) ${a2}deg ${a3}deg,rgba(255,255,255,.09) ${a3}deg 360deg)">
          <div class="dctr"><div class="dv">${fa(st.pct)}٪</div><div class="dl2">تطابق کامل</div></div></div>
        <div class="leg">
          <div class="lg"><span class="dot" style="background:var(--ok)"></span>انطباق کامل<b>${fa(st.f)}</b></div>
          <div class="lg"><span class="dot" style="background:var(--wr)"></span>انطباق نسبی<b>${fa(st.p)}</b></div>
          <div class="lg"><span class="dot" style="background:var(--dn)"></span>عدم انطباق<b>${fa(st.n)}</b></div>
          <div class="lg"><span class="dot" style="background:rgba(255,255,255,.15)"></span>بررسی‌نشده<b>${fa(st.u)}</b></div>
          ${st.na?`<div class="lg"><span class="dot" style="background:var(--bds)"></span>غیرقابل ارزیابی<b>${fa(st.na)}</b></div>`:''}
        </div></div>
      ${st.na?`<div style="margin-top:10px;font-size:11px;color:var(--td);line-height:1.9">
        ${fa(st.na)} سنجه «غیرقابل ارزیابی» اعلام شده و از مخرج درصد آمادگی کنار گذاشته شده است —
        مخرج فعلی ${fa(st.total)} سنجه از ${fa(st.all)}.</div>`:''}
      <div style="margin-top:14px;padding-top:13px;border-top:1px dashed var(--bd);font-size:11.5px;color:var(--td)">
        سنجه‌های ایمنی بیمار: <b style="color:var(--gdl)">${fa(st.sfF)} از ${fa(st.sfT)}</b> تکمیل‌شده ${help('safety')}</div>
    </div>
  </div>
  <div class="panel g">
    <div class="phd"><div class="abadge">!</div><div><h3>سنجه‌های ایمنی بیمار تکمیل‌نشده</h3>
      <div class="sub">ضریب ۲ برابر — اولویت اول رسیدگی</div></div></div>
    <div class="pbody">${(()=>{ const pend=ms.filter(m=>m.patient_safety_flag&&!['full_compliant','not_applicable'].includes(statusOf(m.id))).slice(0,10);
      if(!pend.length) return '<div class="empty"><div class="ei">✓</div>همه سنجه‌های ایمنی بیمار تکمیل شده‌اند</div>';
      return `<div class="tbl-wrap"><table><thead><tr><th>کد</th><th>عنوان</th><th>مسئول</th><th>وضعیت</th></tr></thead><tbody>
      ${pend.map(m=>`<tr><td style="color:var(--gdl);white-space:nowrap">${esc(m.code)}</td>
      <td>${esc(fixText(m.statement)).slice(0,85)}…</td><td style="white-space:nowrap">${ROLE_FA[m.responsible_role]||'—'}</td>
      <td><span class="bdg ${statusOf(m.id)==='partial'?'b2':'b3'}">${({not_reviewed:'بررسی‌نشده',partial:'نسبی',non_compliant:'عدم انطباق'})[statusOf(m.id)]}</span></td></tr>`).join('')}
      </tbody></table></div>`; })()}</div>
  </div>
  <div class="panel g gold" style="margin-bottom:18px;cursor:pointer" onclick="go('orgchart')">
    <div class="phd"><div class="abadge">${ic('tree')}</div><div style="flex:1"><h3>نمودار سازمانی بیمارستان</h3>
      <div class="sub">ریاست بیمارستان، مسئول فنی، مدیر داخلی، پرستاری، مدیریت و پشتیبانی — یک نمودار یکپارچه</div></div>
      <button class="btn btn-g btn-sm" onclick="event.stopPropagation();go('orgchart')">مشاهده نمودار ›</button>
    </div>
  </div>
  <div id="roleSectionPanel"></div>
  <div class="moretoggle"><button class="btn btn-o" id="dashMoreBtn" onclick="toggleDashMore()">${dashMoreOpen()?'پنهان‌کردن جزئیات ▴':'نمایش جزئیات بیشتر ▾'}</button></div>
  <div class="chartwrap ${dashMoreOpen()?'':'hide'}" id="dashMore">
    <div class="chart g"><h4>▤ پیشرفت به تفکیک محور</h4>
      <div style="max-height:270px;overflow-y:auto;padding-left:5px">
      ${byAxis.map(a=>`<div class="hbar hbar-go" role="button" tabindex="0" onclick="selAxis('${esc(a.code)}')"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selAxis('${esc(a.code)}')}"
        title="ورود به محور «${esc(a.name)}» و دیدن سنجه‌هایش">
        <div class="hl"><span>${esc(a.name)}</span><span>${fa(a.f)}/${fa(a.total)}</span></div>
        <div class="hbt"><i style="width:${a.pct}%;background:${a.pct>=70?'linear-gradient(90deg,#1c8f68,var(--ok))':a.pct>=40?'linear-gradient(90deg,#b8912f,var(--wr))':'linear-gradient(90deg,#a5503f,var(--dn))'}"></i></div></div>`).join('')}
      </div></div>
    <div class="chart g"><h4>❖ گیج رتبه تخمینی ${help('safety')}</h4>
      <div class="gauge" style="--deg:${gdeg}deg">
        <div class="gtrack"></div><div class="gmask"></div>
        <div class="gneedle"></div><div class="gpin"></div>
        <div class="gtext"><div class="gval" style="color:${rc}">${fa(st.wpct)}٪</div><div class="glabel">${rank}</div></div>
      </div>
    </div>
  </div>`;
  loadPeriodBanner();
  loadRoleSectionPanel();
  loadDashResolutions();
}

async function loadDashResolutions(){
  try {
    const res = await API.get('/dashboard');
    const tasks = res.tasks || {};
    const act = (res.active_resolutions != null) ? res.active_resolutions : ((tasks.assigned || 0) + (tasks.in_progress || 0));
    const total = (res.total_resolutions != null) ? res.total_resolutions : (act + (tasks.completed || 0));
    const valEl = $('kpiActiveResolutions');
    const badgeEl = $('kpiResBadge');
    const subEl = $('kpiResSub');
    const barEl = $('kpiResBar');
    if(valEl) valEl.innerHTML = `${fa(act)} <span style="font-size:1.1rem;font-weight:600;color:var(--tm);margin-right:2px">مصوبه فعال</span>`;
    if(badgeEl){
      if(tasks.overdue){
        badgeEl.className = 'trend-badge trend-down';
        badgeEl.textContent = `! ${fa(tasks.overdue)} سررسیدشده`;
      } else {
        badgeEl.className = 'trend-badge trend-up';
        badgeEl.textContent = `✓ در گردش`;
      }
    }
    if(subEl) subEl.textContent = `از مجموع ${fa(total || act)} مصوبه`;
    if(barEl){
      const pct = total ? Math.round((total - act) / total * 100) : 50;
      barEl.style.width = `${Math.min(100, Math.max(15, pct))}%`;
    }
  } catch(e) {
    const valEl = $('kpiActiveResolutions');
    if(valEl) valEl.innerHTML = `${fa(0)} <span style="font-size:1.1rem;font-weight:600;color:var(--tm);margin-right:2px">مصوبه</span>`;
  }
}

// ==================== بخش اختصاصی نقش (سوپروایزر کنترل عفونت / سوپروایزر آموزشی) ====================
// کنار میانبر اعتباربخشی موجودشان روی داشبورد، نه به‌جای آن. برای بقیه‌ی نقش‌ها هیچ چیزی رندر نمی‌شود.
const ICS_DUTIES = [
  'بازدید روزانه از بخش‌ها برای کشف موارد جدید عفونت بیمارستانی',
  'تهیه گزارش موارد عفونت بر اساس بررسی پرونده بیماران و نتایج آزمایشگاه',
  'تدوین و ابلاغ دستورالعمل‌های پیشگیری و کنترل عفونت در بخش‌های ویژه و آسیب‌پذیر',
  'برگزاری و همکاری در برنامه‌های آموزشی کنترل عفونت برای پرستاران، دانشجویان و سایر کارکنان',
  'تشکیل پرونده بهداشتی و تنظیم برنامه معاینات دوره‌ای و واکسیناسیون کارکنان',
  'پایش اثربخشی برنامه‌های کنترل عفونت و روند کاهش بروز عفونت‌های بیمارستانی',
  'نظارت بر رعایت الزامات کنترل عفونت در نمونه‌برداری و انتقال نمونه‌های عفونی',
  'همکاری با کمیته کنترل عفونت در تدوین اهداف و برنامه سالانه',
  'پیگیری اقدامات اصلاحی موارد عدم‌انطباق شناسایی‌شده در بازدیدها',
];
const EDU_STUBS = [
  {t:'ایجاد چک‌لیست و آزمون', i:'✎'},
  {t:'آزمون بدو ورود', i:'⌘'},
  {t:'برنامه‌ی آموزشی و وبینار و فایل آموزشی', i:'▤'},
  {t:'صدور لایسنس', i:'✓'},
];

// ==================== حوزه‌ی پشتیبانی (زیر کارت «پشتیبانی» در org_divisions) ====================
// فقط استاب — بدون منبع/اسپک واقعی هنوز؛ همان الگوی بصری EDU_STUBS/drawEduSection را عیناً
// تکرار می‌کند. فهرست واحدها: چهار مورد از کاربر + چند مورد استاندارد چارت سازمانی پشتیبانی
// بیمارستان‌های ایران که در چارت‌های عمومی (امام خمینی تهران، بوشهر، گلستان و…) تکرار شده‌اند.
const canViewSupportDivision = () => (S.user?.permissions||[]).includes('manage_org_divisions') || !!S.user?.is_support_division_head;
// حوزه‌ی مدیریت — دیدن صفحه برای هرکس که رئیس حوزه است یا مجوز manage_org_divisions دارد؛
// انتصاب/تعویض فرد هم دقیقاً همین دو گروه (سرور همین قانون را در mgmtCanManage اعمال می‌کند)
const canViewManagementDivision = () => (S.user?.permissions||[]).includes('manage_org_divisions') || !!S.user?.is_management_division_head;
// منابع‌انسانی/امورمالی/بهداشت‌محیط/تغذیه دیگر استاب نیستند — به پست واقعی و قابل‌انتصاب در
// management_position_slots ارتقا یافتند (database/seed-org-chart-positions.js) و روی نمودار
// سازمانی یکپارچه (renderOrgChart) نشان داده می‌شوند، نه اینجا — برای جلوگیری از دوگانگی
const SUPPORT_DEPTS = [
  {t:'تأسیسات و تجهیزات پزشکی', i:'⚙', d:'شناسنامه‌ی تجهیزات، نگهداشت دوره‌ای و سوابق تعمیر', go:'assets', stat:{label:'تجهیز فعال', load:async()=>{ const r=await API.assets(); const a=Array.isArray(r)?r:(r.items||r.assets||[]); return a.length; }}},
  {t:'انبار و تدارکات', i:'▤', d:'پیمانکاران، تأمین‌کنندگان و ارزیابی دوره‌ای آن‌ها', go:'vendors', stat:{label:'پیمانکار/تأمین‌کننده', load:async()=>{ const r=await API.get('/vendors/vendors'); return ((r||{}).items||[]).length; }}},
  {t:'حراست و انتظامات', i:'⛨', d:'حوادث داخلی و امنیتی، عوامل خطرآفرین و مانورها', go:'disaster', stat:{label:'حادثه داخلی باز', load:async()=>{ const r=await API.get('/disaster/incidents'); return ((r||{}).items||[]).filter(x=>x.status!=='closed').length; }}},
  {t:'خدمات و نظافت', i:'✦', d:'بهداشت محیط، بهداشت دست و پایش نظافت بخش‌ها', go:'infection', stat:{label:'پایش بهداشت دست', load:async()=>{ const r=await API.get('/infection/handhygiene'); return ((r||{}).items||[]).length; }}},
];
async function renderSupport(){
  $('ptitle').textContent='حوزه‌ی پشتیبانی';
  $('content').innerHTML=`<div class="panel g" style="margin-bottom:18px">
    <div class="phd"><div class="abadge">⚙</div><div><h3>حوزه‌ی پشتیبانی</h3>
      <div class="sub">واحدهای پشتیبانی بیمارستان — هر کارت مستقیم به ماژول واقعی خودش می‌رود</div></div></div>
    <div class="pbody" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px" id="supGrid">
      ${SUPPORT_DEPTS.map((s,i)=>`<div class="st g" style="cursor:pointer" onclick="go('${s.go}')">
        <div class="l" style="font-size:14px">${s.i} ${esc(s.t)}</div>
        <div class="v" style="font-size:12px;color:var(--td);line-height:1.7">${esc(s.d)}</div>
        <div style="margin-top:8px;font-size:13px" id="supStat${i}">…</div>
        <div style="margin-top:6px"><button class="btn" onclick="event.stopPropagation();go('${s.go}')">ورود به ماژول ←</button></div>
      </div>`).join('')}
    </div>
  </div>`;
  // آمار زنده — هر کدام جدا خطا می‌گیرد تا یکی صفحه را خراب نکند
  SUPPORT_DEPTS.forEach(async (s,i)=>{
    const el=$('supStat'+i); if(!el) return;
    try{ const n=await s.stat.load(); el.innerHTML=`<b style="font-size:18px">${n}</b> <span style="color:var(--gdl);font-size:12px">${esc(s.stat.label)}</span>`; }
    catch(e){ el.innerHTML=`<span style="color:var(--gdl);font-size:12px">—</span>`; }
  });
}
// ==================== حوزه‌ی مدیریت (زیر کارت «مدیریت» در org_divisions) ====================
// پست‌های نام‌دار (برچسب/تعداد) فقط توسط سوپرادمین پلتفرم قابل تغییرند (renderSuperPanel)؛
// این‌جا فقط انتصاب فرد به هر پست موجود است — دقیقاً همان الگوی drawNursingManage اما بدون
// دکمه‌ی افزودن/تغییرنام/حذف پست (آن اختیار اینجا نیست).
let MGT={data:null, colleagues:null};
async function renderManagement(){
  $('ptitle').textContent='حوزه‌ی مدیریت';
  $('content').innerHTML='<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
  try{
    MGT.data=await API.managementPositions();
    if(MGT.data.can_manage && !MGT.colleagues) MGT.colleagues=(await API.colleagues()).users||[];
    drawManagement();
  }catch(e){ $('content').innerHTML=`<div class="panel g"><div class="empty">${esc(e.message)}</div></div>`; }
}
function mgtUserOpts(selId){
  return `<option value="">— تعیین‌نشده —</option>` +
    (MGT.colleagues||[]).map(u=>`<option value="${u.id}" ${u.id===selId?'selected':''}>${esc(u.full_name)}</option>`).join('');
}
function drawManagement(){
  const d=MGT.data||{positions:[], can_manage:false};
  const positions=d.positions||[];
  $('content').innerHTML=`
  <div class="panel g">
    <div class="phd"><div class="abadge">⌂</div><div style="flex:1"><h3>پست‌های حوزه‌ی مدیریت</h3>
      <div class="sub">فهرست و تعداد پست‌ها را سوپرادمین پلتفرم تعیین می‌کند؛ ${d.can_manage?'انتصاب فرد به هر پست از همین‌جا انجام می‌شود':'فقط مدیر داخلی یا رئیس حوزه‌ی مدیریت می‌تواند فرد را تغییر دهد'}</div></div></div>
    <div class="pbody">
      ${!positions.length?'<div class="empty"><div class="ei">⌂</div>هنوز پستی برای این بیمارستان تعریف نشده است — از پنل سوپرادمین پلتفرم اضافه کنید</div>':`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
      ${positions.map(p=>`<div class="st g">
        <div class="l" style="font-size:14px">${esc(p.label)}</div>
        <div class="v" style="font-size:15px">${p.user_name?esc(p.user_name):'بدون مسئول'}</div>
        ${d.can_manage?`<div style="margin-top:8px"><select onchange="mgtAssign('${p.id}',this.value)">${mgtUserOpts(p.user_id)}</select></div>`:''}
      </div>`).join('')}
      </div>`}
    </div>
  </div>`;
}
async function mgtAssign(id,userId){
  try{ await API.updateManagementPosition(id,{user_id:userId||null}); toast('ذخیره شد'); renderManagement(); }
  catch(e){ toast(e.message,true); renderManagement(); }
}

async function loadRoleSectionPanel(){
  const box=$('roleSectionPanel'); if(!box) return;
  const role=S.user?.role_code;
  if(role==='infection_control_supervisor'){ box.innerHTML=drawIcsSection('در حال بارگذاری چک‌لیست‌ها…'); await drawIcsSection_load(); }
  else if(role==='education_supervisor'){ box.innerHTML=drawEduSection(); }
  else box.innerHTML='';
}
function drawIcsSection(chkBody){
  return `<div class="panel g" style="margin-bottom:18px">
    <div class="phd"><div class="abadge">☤</div><div><h3>حوزه‌ی کنترل عفونت</h3>
      <div class="sub">وظایف اصلی و ابزارهای کمکی سوپروایزر کنترل عفونت</div></div></div>
    <div class="pbody">
      <div class="docsl">وظایف اصلی</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin-bottom:16px">
        ${ICS_DUTIES.map(d=>`<div class="st g" style="padding:9px 12px;font-size:12.5px;line-height:1.8">${esc(d)}</div>`).join('')}
      </div>

      <div class="docsl">کمک به پرکردن چک‌لیست‌های مربوطه</div>
      <div class="sub" style="margin-bottom:8px">چک‌لیست‌های فعالی که مجاز به تکمیل آن‌ها هستید</div>
      <div id="icsChkBody">${chkBody}</div>

      <div class="docsl" style="margin-top:16px">راهنمای پرکردن سایت‌های مربوط به وزارت بهداشت</div>
      <div class="st g" style="opacity:.85;margin-top:8px">
        <div class="l" style="font-size:14px">🖥 سامانه‌های وزارت بهداشت</div>
        <div class="v" style="font-size:12.5px;color:var(--td);line-height:1.7">به‌زودی — در انتظار مستندسازی گام‌به‌گام سامانه‌های مربوطه</div>
      </div>
    </div>
  </div>`;
}
async function drawIcsSection_load(){
  const bodyEl=$('icsChkBody'); if(!bodyEl) return;
  try{
    const {checklists}=await API.checklists('status=active');
    const list=checklists||[];
    bodyEl.innerHTML = !list.length
      ? '<div class="empty"><div class="ei">✓</div>چک‌لیست فعالی برای تکمیل موجود نیست</div>'
      : `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
      ${list.map(c=>`<div class="st g" style="cursor:pointer" onclick="fillChecklist('${c.id}')">
        <div class="l" style="font-size:13.5px">${esc(c.title)}</div>
        <div class="v" style="font-size:11.5px;color:var(--td)">${c.checklist_code?esc(c.checklist_code)+' · ':''}${esc(CL_COMPLETION_FA?.[c.completion_type]||c.completion_type||'')}</div>
      </div>`).join('')}
      </div>`;
  }catch(e){ bodyEl.innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}
function drawEduSection(){
  return `<div class="panel g" style="margin-bottom:18px">
    <div class="phd"><div class="abadge">✎</div><div><h3>حوزه‌ی آموزش</h3>
      <div class="sub">ابزارهای سوپروایزر آموزشی — این بخش هنوز در دست ساخت است</div></div></div>
    <div class="pbody" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
      ${EDU_STUBS.map(s=>`<div class="st g" style="opacity:.85">
        <div class="l" style="font-size:14px">${s.i} ${esc(s.t)}</div>
        <div class="v" style="font-size:12.5px;color:var(--td);line-height:1.7">به‌زودی</div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ==================== حوزه‌های کلان سازمانی: مدیریت/پرستاری/پشتیبانی ====================
// سه کارت ثابت بالای داشبورد. کلیک روی هر کارت رئیس فعلی را نشان می‌دهد؛ اگر کاربر
// اجازه داشته باشد (مدیر داخلی، یا خودِ رئیسِ همان حوزه) می‌تواند رئیس را عوض کند.
const ORGDIV={list:[], openCode:null, colleagues:null};
const DIVISION_ICON={management:'⌂',nursing:'✚',support:'⚙'};
async function loadDivisionsPanel(){
  const box=$('divisionsPanel'); if(!box) return;
  try{
    const r=await API.orgDivisions();
    ORGDIV.list=r.divisions||[];
    drawDivisionsPanel();
  }catch(e){ box.innerHTML=''; }
}
function drawDivisionsPanel(){
  const box=$('divisionsPanel'); if(!box) return;
  if(!ORGDIV.list.length){ box.innerHTML=''; return; }
  box.innerHTML=`<div class="panel g" style="margin-bottom:18px">
    <div class="phd"><div class="abadge">⌂</div><div><h3>حوزه‌های کلان سازمان</h3>
      <div class="sub">سه حوزه‌ی اصلی بیمارستان و مسئول هرکدام</div></div></div>
    <div class="pbody" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      ${ORGDIV.list.map(d=>{
        const open=ORGDIV.openCode===d.code;
        return `<div class="st g ${open?'gold':''}" style="cursor:pointer" onclick="toggleDivisionCard('${d.code}')">
          <div class="l" style="display:flex;align-items:center;gap:6px;font-size:14px">
            <span style="font-size:16px;color:var(--gdl)">${DIVISION_ICON[d.code]||'◆'}</span>${esc(d.title)}
          </div>
          <div class="v" style="font-size:15px">${d.head_name?esc(d.head_name):'بدون مسئول'}</div>
          ${d.head_role_title?`<div style="font-size:11px;color:var(--td);margin-top:2px">${esc(d.head_role_title)}</div>`:''}
          ${d.code==='support'&&canViewSupportDivision()?`<div style="margin-top:6px"><button class="tgl prim" onclick="event.stopPropagation();go('support')">مشاهده حوزه‌ی پشتیبانی ›</button></div>`:''}
          ${d.code==='management'&&canViewManagementDivision()?`<div style="margin-top:6px"><button class="tgl prim" onclick="event.stopPropagation();go('management')">مشاهده حوزه‌ی مدیریت ›</button></div>`:''}
          <div id="divcard_${d.code}" class="${open?'':'hide'}" style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--bd)" onclick="event.stopPropagation()">
            ${d.can_assign?drawDivisionEditor(d):'<div style="font-size:11.5px;color:var(--td)">فقط مدیر داخلی یا رئیسِ همین حوزه می‌تواند این را تغییر دهد</div>'}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function drawDivisionEditor(d){
  // colleagues خودِ کاربر جاری را شامل نمی‌شود (خودسرویس جانشین)؛ این‌جا لازم است چون
  // ممکن است خودِ کاربر جاری بخواهد خودش را مسئول یک حوزه کند
  const self=S.user?{id:S.user.id, full_name:S.user.full_name}:null;
  const list=self && !(ORGDIV.colleagues||[]).some(u=>u.id===self.id) ? [self,...(ORGDIV.colleagues||[])] : (ORGDIV.colleagues||[]);
  const opts=list.map(u=>`<option value="${u.id}" ${u.id===d.head_user_id?'selected':''}>${esc(u.full_name)}</option>`).join('');
  return `<select id="divsel_${d.code}" style="width:100%;margin-bottom:8px">
      <option value="">— بدون مسئول —</option>${opts}
    </select>
    <button class="btn btn-g" style="width:100%;padding:6px" onclick="saveDivisionHead('${d.code}')">ذخیره</button>`;
}
