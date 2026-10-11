/**
 * Core Route Table Dispatcher
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function renderApp(){
  // ---- ناوبری دوسطحی: موارد پرکاربرد مسطح می‌مانند، بقیه در گروه‌های جمع‌شونده ----
  const hasDocsPage=canViewDocs()||canViewLibrary()||canViewCerts();
  const quality=[];
  if(canSubmitChecklists()) quality.push({k:'checklists',i:ic('check'),t:'بانک چک‌لیست‌ها'});
  if(canViewAudits())       quality.push({k:'audits',i:ic('scale'),t:'حسابرسی داخلی'});
  if(canViewWalks())        quality.push({k:'walkarounds',i:ic('eye'),t:'بازدید میدانی مدیریتی'});
  if(fasCanView())          quality.push({k:'assets',i:ic('building'),t:'اقلام و نگهداشت دوره‌ای'});
  if(phCanView())           quality.push({k:'pharmacy',i:ic('plus'),t:'مدیریت دارویی'});
  if(infectionCanView())    quality.push({k:'infection',i:ic('shield'),t:'پیشگیری و کنترل عفونت'});
  if(bloodCanView())        quality.push({k:'blood',i:ic('pulse'),t:'طب انتقال خون و هموویژیلانس'});
  if(labCanView())          quality.push({k:'lab',i:ic('search'),t:'خدمات آزمایشگاه'});
  if(imagingCanView())      quality.push({k:'imaging',i:ic('sparkle'),t:'تصویربرداری و ایمنی پرتو'});
  if(disasterCanView())     quality.push({k:'disaster',i:ic('alert'),t:'مدیریت خطر حوادث و بلایا'});
  if(occHealthCanView())    quality.push({k:'occhealth',i:ic('book'),t:'سلامت حرفه‌ای و بهداشت کار'});
  if(nsupervisionCanView()) quality.push({k:'nsupervision',i:ic('stethoscope'),t:'نظارت مدیریت پرستاری'});
  if(patientFocusCanView()) quality.push({k:'patientfocus',i:ic('heart'),t:'بیمارمحوری و علت‌کاوی'});
  if(canSubmitErrors())     quality.push({k:'errors',i:ic('flag'),t:'گزارش خطا و وقایع'});
  if(canSubmitFmea())       quality.push({k:'fmea',i:ic('target'),t:'عوامل تهدید ایمنی (FMEA)'});
  // بانک دانش دانا — برای صاحبان مدارک (بازبینی پاسخهای draft دستیار)
  if(canViewDocs()) quality.push({k:'knowledge',i:ic('docs'),t:'بانک دانش دانا'});
  if(canViewSatisfactionResults()) quality.push({k:'satisfaction',i:ic('star'),t:'نتایج نظرسنجی رضایت بیمار'});
  if(canViewFollowup())    quality.push({k:'followup',i:ic('message'),t:'پیگیری بیمار و مادر باردار'});
  // ماژول‌های CRM و ایمنی بالینی — فقط برای نقش‌هایی که مجوز مربوطه دارند
  if(typeof RPG!=='undefined'&&RPG.mods&&RPG.mods['crm']&&RPG.canView('crm'))
    quality.push({k:'crm',i:'🤝',t:'مدیریت بیمار و CRM'});
  if(typeof RPG!=='undefined'&&RPG.mods&&RPG.mods['safety']&&RPG.canView('safety')){
    quality.push({k:'safesurgery',i:'🛡️',t:'جراحی ایمن WHO'});
    quality.push({k:'medrecon',i:'💊',t:'تلفیق دارویی'});
    quality.push({k:'waste',i:'♻️',t:'پسماند پزشکی'});
  }
  // هاب‌های تخصصی اعتباربخشی استخراج‌شده از تصاویر (Rule 11)
  quality.push({k:'patientrights',i:'🤝',t:'حمایت از گیرنده خدمت'});
  quality.push({k:'maternal',i:'🤱',t:'مراقبت مادر و نوزاد'});
  quality.push({k:'outpatient',i:'🩺',t:'خدمات سرپایی و کلینیک‌ها'});
  const org=[{k:'orgchart',i:ic('tree'),t:'نمودار سازمانی'},{k:'committees',i:ic('users'),t:'کمیته‌ها'}];
  // پیشنهاد برنامه عمداً برای همه باز است (الگوی پایین‌به‌بالا)، پس مدخل ناوبری هم مشروط نیست
  org.push({k:'programs',i:ic('trend'),t:'برنامه‌های بهبود'});
  // ثبت نیاز آموزشی هم مثل پیشنهاد برنامه برای همه باز است، پس مدخل ناوبری مشروط نیست
  org.push({k:'training',i:ic('graduation'),t:'نیازسنجی آموزشی'});
  if(hrDevCanView())  org.push({k:'hrdev',i:ic('edit'),t:'ارزیابی و توسعه‌ی کارکنان'});
  if(vendorsCanView()) org.push({k:'vendors',i:ic('users'),t:'پیمانکاران و تأمین‌کنندگان'});
  if(financeCanView()) org.push({k:'finance',i:ic('chart'),t:'منابع مالی و مشارکت مردمی'});
  if(educationCanView()) org.push({k:'education',i:ic('play'),t:'آموزش و اثربخشی'});
  if(canViewBsc()) org.push({k:'bsc',i:ic('chart'),t:'کارت امتیازی متوازن'});
  if(canViewIndicators()) org.push({k:'indicators',i:ic('trend'),t:'شاخص‌های بیمارستان'});
  if(canViewOrg()) org.push({k:'orgstructure',i:ic('tree'),t:'ساختار سازمانی'});
  if(canViewNursing()) org.push({k:'nursing',i:ic('stethoscope'),t:'سلسله‌مراتب پرستاری'});
  if(canViewNursing()||(S.user.head_nurse_wards||[]).length) org.push({k:'staffshift',i:ic('calendar'),t:'پرسنل و برنامه‌ی شیفت'});
  if(canViewNursing()||(S.user.head_nurse_wards||[]).length) org.push({k:'shiftatt',i:ic('clipboard'),t:'حضور شیفت و گزارش ۲۴ ساعته'});
  if(canViewSupportDivision()) org.push({k:'support',i:ic('grid'),t:'حوزه‌ی پشتیبانی'});
  if(canViewManagementDivision()) org.push({k:'management',i:ic('badge'),t:'حوزه‌ی مدیریت'});
  if((S.user.head_nurse_wards||[]).length) org.push({k:'headnurse',i:ic('bed'),t:'داشبورد سرپرستار بخش'});
  if(canViewProcesses()) org.push({k:'processes',i:ic('refresh'),t:'فرآیندها و فلوچارت‌ها'});
  if(canSeeActivities()) org.push({k:'activities',i:ic('doc'),t:'ثبت فعالیت‌ها'});
  org.push({k:'tenures',i:ic('clock'),t:'تصدی سمت‌ها'});
  org.push({k:'calendar',i:ic('calendar'),t:'تقویم'});
  org.push({k:'reports',i:ic('download'),t:'گزارش و خروجی'});
  if((S.user.permissions||[]).includes('manage_users')) org.push({k:'users',i:ic('user'),t:'مدیریت کاربران'});
  if((S.user.permissions||[]).includes('manage_hospital_settings')) org.push({k:'settings',i:ic('settings'),t:'تنظیمات بیمارستان'});

  // اعتباربخشی («سنجه‌ها و ارزیابی» + «مدارک و کتابخانه») طبق درخواست کاربر باید
  // «یک بخش از منو» باشد نه اینکه مسطح و کنار داشبورد/کارتابل بنشیند و به‌چشم بیاید
  // که انگار کل منو مال اعتباربخشی است — پس مثل quality/org یک گروه جمع‌شونده‌ی
  // مستقل با عنوان روشن می‌گیرد، هم‌تراز با بقیه‌ی ماژول‌ها.
  const accreditation=[{k:'measures',i:ic('list'),t:'سنجه‌ها و ارزیابی'}]
    // گزارش اختلاف فقط برای کسی معنا دارد که اجازه‌ی ثبت نمره‌ی ارزیاب را هم دارد
    .concat(canReview()?[{k:'reviewgaps',i:ic('chart')||ic('list'),t:'اختلاف با ارزیاب'}]:[])
    .concat(canManageDocs()?[{k:'doccodes',i:ic('list'),t:'دفتر کد مدارک'}]:[])
    .concat(hasDocsPage?[{k:'documents',i:ic('docs'),t:canViewDocs()?'مدارک و کتابخانه':(canViewLibrary()?'کتابخانه دیجیتال':'نشان‌ها و گواهینامه‌ها')}]:[]);
  // ---- ناوبری: فقط دو تب ----
  //
  // کارفرما رابط قبلی را «شلوغ» رد کرد و حق داشت: منو تا ۲۹ مدخل در چهار گروهِ
  // جمع‌شونده داشت و کاربر باید حدس می‌زد کارش زیر کدام گروه است. حالا دو تب
  // می‌ماند — «اعتباربخشی» و «مسئولیت من» — و هر چیز دیگری از داخل همین دو صفحه
  // به‌شکل کارت باز می‌شود. هیچ صفحه‌ای حذف نشده؛ فقط مسیر رسیدن به آن عوض شده،
  // پس همه‌ی ماژول‌ها و مجوزهای قبلی دست‌نخورده کار می‌کنند.
  //
  // دسته‌بندی‌های accreditation/quality/org بالا هنوز ساخته می‌شوند، چون صفحه‌ی
  // «اعتباربخشی» همان‌ها را به‌عنوان کارت نشان می‌دهد و مجوزسنجی‌شان همان‌جا لازم است.
  HUB_CARDS = { accreditation, quality, org };
  const navGroups=[
    {g:null, items:[
      {k:'dash',       i:ic('dashboard'), t:'میزکار'},
      {k:'acc',        i:ic('clipboard'), t:'اعتباربخشی'},
      ...((typeof slidesCanView==='function'&&slidesCanView())?[{k:'indicator_slides', i:ic('chart'),     t:'شاخص‌ها'}]:[]),
      {k:'duties',     i:ic('badge'),     t:'کارتابل و مسئولیت‌ها'},
      {k:'directives', i:ic('message'), t:'ابلاغیه و دستور'},
      {k:'profile',    i:ic('user'),      t:'تنظیمات کاربری'},
    ].concat(typeof canManageDocs==='function'&&canManageDocs()?[{k:'knowledge',  i:ic('message'),   t:'گفتگو آنلاین (دانا)'}]:[])},
    {g:'reports_menu', t:'فرم‌های گزارش‌دهی', i:ic('doc'), items:[
      {k:'errors',      i:ic('flag'),     t:'گزارش خطا و وقایع بخش'},
      ...((typeof canSubmitChecklists==='function'&&canSubmitChecklists())?[{k:'checklists',  i:ic('list'),     t:'چک‌لیست‌های ارزیابی'}]:[]),
      ...(typeof canViewWalks==='function'&&canViewWalks()?[{k:'walkarounds', i:ic('target'),   t:'بازدیدهای مدیریتی'}]:[]),
      {k:'committees',  i:ic('users'),    t:'کمیته‌ها و جلسات'},
      ...((typeof canViewNursing==='function'&&canViewNursing())||(S.user.head_nurse_wards||[]).length?[{k:'staffshift',  i:ic('calendar'), t:'مدیریت پرسنل و شیفت'}]:[]),
    ]}
  ];
  // همه‌ی کلیدهای قابل‌دسترس — برای تشخیص گروهِ صفحه‌ی جاری
  NAV_GROUPS = navGroups;
  const pfx = getUserTitlePrefix(S.user);
  const displayName = pfx && !S.user.full_name.startsWith(pfx) ? `${pfx} ${S.user.full_name}` : S.user.full_name;
  const initial=(S.user.full_name||'؟').replace(/^(دکتر|خانم|آقای|مهندس|استاد)\s+/,'').charAt(0);

  $('root').innerHTML=`
  <div id="app">
    <div class="soverlay" id="soverlay" onclick="closeSidebar()"></div>
    <aside class="side g" id="side">
      <div class="shead">
        <div class="brand">
          <div class="bmark shine anim">
            ${(S.user&&S.user.hospital_has_logo)?`<img src="/api/hospital/logo" alt="" class="hosp-logo" onerror="this.src='/img/hospital-logo-sample.svg'">`:'<img src="/img/hospital-logo-sample.svg" alt="" class="hosp-logo">'}
          </div>
          <div class="brand-info">
            <h1>${esc(S.user.hospital_name||'سامانه جامع بیمارستانی')}</h1>
            <p>سازمان، کیفیت و اعتباربخشی</p>
          </div>
          <button type="button" id="sideCollapseBtn" class="side-collapse-toggle" onclick="toggleSidebarCollapse()" title="جمع کردن منو">⇤</button>
        </div>

        <!-- کارت بزرگ پروفایل کاربر در بالای سایدبار راست (مطابق تصویر مرجع ۲) -->
        <div class="side-user-hero">
          <div class="side-user-avatar-wrap">
            <div class="side-user-avatar" title="${esc(displayName)}">
              ${esc(initial)}
            </div>
            <span class="side-user-online-dot" title="کاربر فعال"></span>
          </div>
          <div class="side-user-name">${esc(displayName)}</div>
          <div class="side-user-role">${esc(ROLE_FA[S.user.role_code]||S.user.role_title||'مدیر')}</div>
          <div class="side-user-actions">
            <button type="button" class="side-act" data-p="profile" onclick="go('profile');closeSidebar()" title="پروفایل من">
              <span class="ic">${ic('user')}</span>
              <span class="act-txt">پروفایل</span>
            </button>
            <button type="button" class="side-act out" onclick="logout()" title="خروج از سامانه">
              <span class="ic">${ic('logout')}</span>
              <span class="act-txt">خروج</span>
            </button>
          </div>
        </div>
      </div>
      <div class="snav">
        ${navGroups.map(grp=>{
          // جای بج خالی از ابتدا در DOM هست تا refreshNavBadges فقط متن را عوض کند
          const items=grp.items.map(n=>{
            const locked=!featureEnabled(n.k);
            return `<div class="nitem${locked?' nitem-locked':''}" data-p="${n.k}" data-title="${esc(n.t)}" title="${locked?'برای فعال‌سازی این بخش خرید کنید':esc(n.t)}" onclick="go('${n.k}');closeSidebar()"><span class="ic">${n.i}</span><span class="ntxt">${esc(n.t)}</span>${locked?'<span class="nlock">🔒</span>':''}<span class="nbadge" data-badge="${n.k}"></span></div>`;
          }).join('');
          if(!grp.g) return items;
          const open=navGroupOpen(grp.g);
          return `<div class="navgroup" data-g="${grp.g}">
            <div class="navgroup-hd ${open?'on':''}" data-title="${esc(grp.t)}" title="${esc(grp.t)}" onclick="toggleNavGroup('${grp.g}')">
              <span class="ic">${grp.i}</span><span class="ngt">${esc(grp.t)}</span>
              <span class="cnt">${fa(grp.items.length)}</span><span class="chev">◂</span></div>
            <div class="navgroup-bd ${open?'on':''}">${items}</div></div>`;
        }).join('')}
        <div class="navfoot">
          <div class="nitem" data-p="guide" data-title="راهنمای نقش من" title="راهنمای نقش من" onclick="go('guide');closeSidebar()"><span class="ic">${ic('help')}</span><span class="ntxt">راهنمای نقش من</span></div>
          <div class="nitem" data-title="راهنمای گام‌به‌گام" title="راهنمای گام‌به‌گام" onclick="openTour();closeSidebar()"><span class="ic">${ic('sparkle')}</span><span class="ntxt">راهنمای گام‌به‌گام</span></div>
        </div>
      </div>
      <div class="ssearch"><input id="sq" placeholder="جستجوی سنجه یا کد…" oninput="onSearch(this.value)"></div>
      <div class="tree" id="tree"></div>
    </aside>
    <main class="main">
      <div class="top g">
        <button class="mbtn" onclick="toggleSidebarOrCollapse()" aria-label="منو" title="منوی ناوبری">☰</button>
        <h2 id="ptitle">${esc(getUserDashboardTitle())}</h2>
        <div class="gsearch">
          <input id="gsq" type="search" autocomplete="off" placeholder="جست‌وجو در همه‌ی سامانه… (Ctrl+K)"
            oninput="gsInput(this.value)" onfocus="gsInput(this.value)" onkeydown="gsKey(event)">
          <div id="gsres" class="gsres hide"></div>
        </div>
        <div class="scut" id="scut"></div>
        <div class="ysel"><label>سال</label>${yearSelectHtml()}</div>
      </div>
      <div id="navcrumb"></div>
      <div id="content"></div>
    </main>
  </div>
  ${S.user.role_code==='admin'?`
  <button type="button" id="adminGearBtn" class="admin-gear" title="تنظیمات سریع مدیر داخلی" onclick="toggleAdminGear(event)">⚙</button>
  <div id="adminGearPanel" class="admin-gear-panel g hide"></div>`:''}`;
  try {
    if (localStorage.getItem('side_collapsed') === '1') {
      const s = $('side');
      if (s) s.classList.add('collapsed');
      const btn = $('sideCollapseBtn');
      if (btn) { btn.innerHTML = '⇥'; btn.title = 'باز کردن منو'; }
    }
  } catch(e) {}
  renderTree();
  const initRoute = getInitialRoute();
  handleRoute(initRoute, { isInitialBoot: true });
  if (!location.hash || location.hash === '#') {
    if (window.history && history.replaceState) history.replaceState(null, '', '#acc');
    else location.hash = '#acc';
  }
  initHashRouting();
  refreshNavBadges(); refreshShortcuts(); renderGuideWidget(); initFieldGuideObserver();
  // ترتیب اولین ورود: گردش عمومی محصول (یک‌بار) ← بستنِ آن ← راهنمای اختصاصی نقش (یک‌بار) ← کار عادی.
  // اگر گردش را قبلاً دیده ولی راهنمای نقشش را نه (مثلاً نقشش عوض شده)، مستقیم راهنمای نقش باز می‌شود.
  // طبق درخواست مالک (۱۴۰۵/۰۶/۱۸): فرودِ همهی کاربران بعد از ورود «داشبورد» است؛
  // تور و راهنمای نقش دیگر خودکار روی داشبورد باز نمیشوند و از منو در دسترساند
  // (راهنمای نقش من / راهنمای گامبهگام). برای بازگردانی رفتار قدیمی، این دو خط را برگردانید.
}

/* ==================== جست‌وجوی سراسری و زنده ====================
   کارفرما: «هرجای سامانه بود بتواند سرچ کند — مدیر پرستاری بنویسد پذیرش و
   همه‌ی موارد مربوط به پذیرش را ببیند، از خط‌مشی تا بقیه».

   جست‌وجوی کنارِ درخت (#sq) فقط سنجه‌ها را می‌گشت و کاربر باید *اول* می‌دانست
   دنبالِ چیز در کدام صفحه بگردد. این یکی همه‌ی ماژول‌ها را با هم می‌گردد و
   سرور خودش نتیجه‌ها را با مجوزِ همان کاربر فیلتر می‌کند.

   تأخیرِ ۲۵۰ms عمدی است: بدون آن، هر حرفِ تایپ‌شده یک درخواست می‌شد و روی
   اتصالِ کند نتیجه‌ها بی‌ترتیب می‌رسیدند. شماره‌ی درخواست هم نگه داشته می‌شود
   تا پاسخِ کهنه روی پاسخِ تازه ننشیند. */
let __gsTimer = null, __gsSeq = 0, __gsItems = [], __gsActive = -1;

function gsInput(v){
  clearTimeout(__gsTimer);
  const q = String(v || '').trim();
  if(q.length < 2){ gsClose(); return; }
  __gsTimer = setTimeout(() => gsRun(q), 250);
}

async function gsRun(q){
  const seq = ++__gsSeq;
  const box = $('gsres'); if(!box) return;
  box.classList.remove('hide');
  box.innerHTML = '<div class="gs-empty">در حال جست‌وجو…</div>';
  try{
    const r = await API.globalSearch(q);
    if(seq !== __gsSeq) return;            // پاسخِ کهنه — دور ریخته شود
    gsDraw(r, q);
  }catch(e){
    if(seq !== __gsSeq) return;
    box.innerHTML = `<div class="gs-empty">${esc(e.message)}</div>`;
  }
}

function gsDraw(r, q){
  const box = $('gsres'); if(!box) return;
  __gsItems = []; __gsActive = -1;
  let html = '';
  try{
    const nq = String(q || '').trim();
    const hits = [];
    if(nq.length >= 2){
      const seen = {};
      const consider = (it) => {
        if(!it || !it.k || seen[it.k] || hits.length >= 8) return;
        if((it.t && it.t.indexOf(nq) !== -1) || String(it.k).toLowerCase().indexOf(nq.toLowerCase()) !== -1){ seen[it.k] = 1; hits.push(it); }
      };
      // تب‌ها + همه‌ی کارت‌های هاب اعتباربخشی (هر دو از قبل با مجوز همین کاربر فیلتر شده‌اند)
      if(Array.isArray(NAV_GROUPS)) for(const g of NAV_GROUPS) for(const it of (g.items || [])) consider(it);
      if(typeof HUB_CARDS === 'object' && HUB_CARDS) for(const gk of ['accreditation','quality','org']) for(const it of (HUB_CARDS[gk] || [])) consider(it);
    }
    if(hits.length){
      html += `<div class="gs-grp"><span>🧭 رفتن به صفحه</span><i>${fa(hits.length)}</i></div>`;
      for(const it of hits){
        const idx = __gsItems.length;
        __gsItems.push({ page: it.k });
        html += `<div class="gs-item" data-i="${idx}" onclick="gsOpen(${idx})">
          <div class="gs-t">${esc(it.t)}</div>
          <div class="gs-s">صفحه‌ی سامانه</div>
        </div>`;
      }
    }
  }catch(e){ /* navigation hints are decorative; must never break search */ }
  if((!r.groups || !r.groups.length) && !__gsItems.length){
    box.innerHTML = `<div class="gs-empty">چیزی برای «${esc(q)}» پیدا نشد</div>`;
    return;
  }
  const hi = (t) => {
    const s = String(t || '');
    const i = s.toLowerCase().indexOf(q.toLowerCase());
    if(i < 0) return esc(s);
    return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
  };
  html += `<div class="gs-head">${fa(r.total)} نتیجه برای «${esc(q)}»</div>`;
  for(const g of (r.groups || [])){
    html += `<div class="gs-grp"><span>${g.icon} ${esc(g.fa)}</span><i>${fa(g.items.length)}</i></div>`;
    for(const it of g.items){
      const idx = __gsItems.length;
      __gsItems.push({ page: g.page, id: it.id, key: g.key });
      html += `<div class="gs-item" data-i="${idx}" onclick="gsOpen(${idx})">
        <div class="gs-t">${hi(it.title)}</div>
        <div class="gs-s">${it.code ? `<code>${esc(it.code)}</code>` : ''}${it.sub ? esc(it.sub) : ''}</div>
      </div>`;
    }
  }
  box.innerHTML = html;
}

function gsClose(){ const b = $('gsres'); if(b){ b.classList.add('hide'); b.innerHTML = ''; } __gsItems = []; __gsActive = -1; }

// رفتن به نتیجه: به صفحه‌ی مربوط می‌رود و — جایی که ماژول پشتیبانی می‌کند —
// همان مورد را باز می‌کند. برای بقیه، دست‌کم کاربر روی صفحه‌ی درست می‌نشیند
// به‌جای اینکه بین منوها بگردد.
function gsOpen(i){
  const it = __gsItems[i]; if(!it) return;
  gsClose();
  const inp = $('gsq'); if(inp) inp.blur();
  S.searchTarget = it;                 // ماژول‌ها می‌توانند بعد از رندر بخوانندش
  go(it.page);
  if(it.key === 'measure') setTimeout(() => { if(typeof openMeasure === 'function') openMeasure(it.id); }, 250);
}

function gsKey(ev){
  const box = $('gsres');
  if(ev.key === 'Escape'){ gsClose(); return; }
  if(!box || box.classList.contains('hide') || !__gsItems.length) return;
  if(ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
    ev.preventDefault();
    __gsActive = Math.max(0, Math.min(__gsItems.length - 1, __gsActive + (ev.key === 'ArrowDown' ? 1 : -1)));
    box.querySelectorAll('.gs-item').forEach(el => el.classList.toggle('on', +el.dataset.i === __gsActive));
    const el = box.querySelector('.gs-item.on'); if(el) el.scrollIntoView({ block: 'nearest' });
  } else if(ev.key === 'Enter'){
    ev.preventDefault();
    gsOpen(__gsActive >= 0 ? __gsActive : 0);
  }
}

// کلیک بیرون = بستن؛ Ctrl+K = پرش به جست‌وجو (همان میان‌بری که کاربران از
// بقیه‌ی ابزارها انتظار دارند)
document.addEventListener('click', (e) => {
  const w = document.querySelector('.gsearch');
  if(w && !w.contains(e.target)) gsClose();
});
document.addEventListener('keydown', (e) => {
  if((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){
    const inp = $('gsq'); if(inp){ e.preventDefault(); inp.focus(); inp.select(); }
  }
});

// ---- شمارنده‌های «جدید» کنار موارد منو ----
// یک درخواست سبک، سه عدد. عمداً هیچ polling ای ندارد: بعد از هر اقدامی که می‌تواند
// عدد را عوض کند (خواندن/حذف/ارسال پیام) خودِ همان اقدام صداش می‌زند.
async function refreshNavBadges(){
  try{
    const r=await API.navBadges();
    const b=r.badges||{};
    document.querySelectorAll('.nbadge[data-badge]').forEach(el=>{
      const n=Number(b[el.dataset.badge]||0);
      el.textContent=n>0?fa(n):'';
      el.classList.toggle('on',n>0);
    });
  }catch(e){ /* بج تزئینی است؛ خطایش نباید چیزی را بشکند */ }
}

// ---- میانبرهای شخصی ----
// صفحه‌هایی که می‌شود سنجاق کرد = دقیقاً همان‌هایی که در منوی همین کاربر هست
// (NAV_GROUPS از دسترسی‌های او ساخته شده)، پس میانبر هرگز به صفحه‌ی غیرمجاز نمی‌رسد.
function shortcutCandidates(){
  const out=[];
  NAV_GROUPS.forEach(g=>g.items.forEach(i=>out.push({k:i.k,t:i.t,i:i.i})));
  return out;
}
async function refreshShortcuts(){
  const box=$('scut'); if(!box) return;
  try{
    const r=await API.shortcuts();
    const cand=shortcutCandidates();
    const pinned=(r.shortcuts||[]).filter(s=>cand.some(c=>c.k===s.target_page));
    box.innerHTML=pinned.map(s=>{
      const c=cand.find(x=>x.k===s.target_page);
      return `<button class="scut-i" onclick="go('${s.target_page}')" title="${esc(s.label)}">
        <span class="ic">${c?c.i:'★'}</span>${esc(s.label)}
        <i class="x" onclick="event.stopPropagation();unpinShortcut('${s.id}')" title="برداشتن میانبر">×</i></button>`;
    }).join('')+`<button class="scut-i scut-add" onclick="pinCurrentPage()" title="سنجاق‌کردن صفحه‌ی فعلی">★ +</button>`;
  }catch(e){ box.innerHTML=''; }
}
// ---- گوشه‌ی چرخ‌دنده‌ی «مدیر داخلی» ----
// میان‌بر کشف‌پذیرِ محدود، مخصوصِ نقش admin («مدیر داخلی»): فقط لینک به مدیریت
// نقش‌ها/کاربران (که خودِ صفحه‌ی کاربران از قبل دارد) + سایر تنظیمات ادمینیِ
// موجود که خانه‌ی مستقل دارند. عمداً سنجه‌ها/درخت اعتباربخشی را نشان نمی‌دهد و
// دوباره‌سازی نوار ناوبری ادمین نیست.
function toggleAdminGear(ev){
  if(ev) ev.stopPropagation();
  const box=$('adminGearPanel'); if(!box) return;
  if(!box.classList.contains('hide')){ box.classList.add('hide'); return; }
  box.innerHTML=`
    <div class="agp-t">تنظیمات سریع — مدیر داخلی</div>
    <button type="button" class="agp-i" onclick="closeAdminGear();go('users')"><span class="ic">✦</span>
      <div><b>نقش‌ها و کاربران</b><span>مدیریت نقش/مجوز، ساخت کاربر، افزودن مدیر داخلی دیگر</span></div></button>
    <button type="button" class="agp-i" onclick="closeAdminGear();openAdminGearNewAdmin()"><span class="ic">◆</span>
      <div><b>مدیر داخلی جدید</b><span>ساخت مستقیم یک کاربر دیگر با همین نقش</span></div></button>
    <div class="agp-sep"></div>
    <div class="agp-sub">باقی مطالب</div>
    <button type="button" class="agp-i" onclick="closeAdminGear();go('settings')"><span class="ic">⚙</span>
      <div><b>تنظیمات بیمارستان</b><span>مشخصات، دوره‌ی اعتباربخشی، امضا، ریمایندر</span></div></button>
  `;
  box.classList.remove('hide');
  setTimeout(()=>document.addEventListener('click',closeAdminGearOnce,{once:true}),0);
}
function closeAdminGearOnce(){ const box=$('adminGearPanel'); if(box) box.classList.add('hide'); }
function closeAdminGear(){ const box=$('adminGearPanel'); if(box) box.classList.add('hide'); }
// از گوشه‌ی چرخ‌دنده: می‌رود به صفحه‌ی کاربران و مستقیم روی «افزودن کاربر جدید»
// با نقش مدیر داخلی (admin) از پیش انتخاب‌شده تمرکز می‌کند — بدون endpoint جدید،
// همان POST /api/users که با manage_roles اجازه‌ی تخصیص نقش admin را می‌دهد.
function openAdminGearNewAdmin(){
  go('users');
  // renderUsers() لود آسنکرون دارد؛ چون go() خودش Promise را برنمی‌گرداند، منتظر ظاهرشدن
  // select نقش می‌مانیم (حداکثر ~۲ ثانیه) پیش از پیش‌انتخاب گزینه‌ی «مدیر داخلی».
  let tries=0;
  const tick=()=>{
    const sel=$('nu_role');
    if(sel && sel.options.length){
      const adminOpt=[...sel.options].find(o=>o.textContent.trim()==='مدیر داخلی');
      if(adminOpt) sel.value=adminOpt.value;
      const nm=$('nu_name'); if(nm){ nm.scrollIntoView({behavior:'smooth',block:'center'}); nm.focus(); }
      toast('نقش «مدیر داخلی» برای کاربر جدید انتخاب شد — نام و مشخصات را کامل کنید');
      return;
    }
    if(++tries<40) setTimeout(tick,50);
  };
  tick();
}
async function pinCurrentPage(){
  const c=shortcutCandidates().find(x=>x.k===S.page);
  if(!c){ toast('این صفحه قابل سنجاق‌کردن نیست',true); return; }
  try{ await API.addShortcut({target_page:c.k,label:c.t}); toast('به میانبرها اضافه شد'); refreshShortcuts(); }
  catch(e){ toast(e.message,true); }
}
async function unpinShortcut(id){
  try{ await API.deleteShortcut(id); refreshShortcuts(); }
  catch(e){ toast(e.message,true); }
}
function toggleSidebar(){ const s=$('side'), ov=$('soverlay'); if(!s) return; const o=s.classList.toggle('mo'); s.classList.toggle('open',o); if(ov) ov.classList.toggle('on',o); }
function closeSidebar(){ const s=$('side'), ov=$('soverlay'); if(s){ s.classList.remove('mo'); s.classList.remove('open'); } if(ov) ov.classList.remove('on'); }

function toggleSidebarCollapse(){
  const s = $('side');
  if(!s) return;
  const isCollapsed = s.classList.toggle('collapsed');
  try{ localStorage.setItem('side_collapsed', isCollapsed ? '1' : '0'); }catch(e){}
  const btn = $('sideCollapseBtn');
  if(btn) {
    btn.innerHTML = isCollapsed ? '⇥' : '⇤';
    btn.title = isCollapsed ? 'باز کردن منو' : 'جمع کردن منو';
  }
}

function toggleSidebarOrCollapse(){
  if (window.innerWidth <= 1000) {
    toggleSidebar();
  } else {
    toggleSidebarCollapse();
  }
}

function go(p, opts = {}){
  if(!isValidAppPage(p)) p = defaultLanding();
  if(!$('content')) return;
  S.page=p;
  saveCurrentRouteState(p);
  if(!opts.skipHashUpdate){
    syncRouteHash(p, opts);
  }
  if(p==='dash'){
    const pt = $('ptitle');
    if(pt) pt.textContent = getUserDashboardTitle();
  }
  if(p==='measures' && S.accDepth === undefined) S.accDepth = 0;
  // خروج از برگه‌ی چاپیِ پهن، کاغذِ افقی را هم پس می‌گیرد (توضیح در setLandscape)
  if(typeof setLandscape==='function') setLandscape(false);
  document.querySelectorAll('.nitem[data-p]').forEach(n=>n.classList.toggle('on', n.dataset.p===p));
  // منوی سمت راست طبق خواسته صریح کاربر باید در تمام صفحات ۱۰۰٪ یکسان، تمیز و بدون درختچه باشد
  { const sd=$('side'); if(sd) sd.classList.toggle('show-tree', false); }
  // دو تب اصلی باید وقتی کاربر داخل یکی از صفحه‌های زیرمجموعه است هم روشن بمانند،
  // وگرنه کاربر نمی‌فهمد کجای سامانه ایستاده.
  { const t=HUB_OF[p]; if(t){ const el=document.querySelector(`.nitem[data-p="${t}"]`); if(el) el.classList.add('on'); } }
  revealNavGroup(p);
  // نوارِ مسیر پیش از خودِ صفحه ساخته می‌شود، چون تابعِ رندرِ صفحه فقط #content را
  // عوض می‌کند و نوار بیرونِ آن است — اگر بعدش صدا زده شود، برای یک لحظه مسیرِ
  // صفحه‌ی قبلی بالای محتوای صفحه‌ی جدید دیده می‌شود.
  renderPageCrumbs(p);
  // بخش خریداری‌نشده — به‌جای صفحه‌ی واقعی، صفحه‌ی قفل/خرید نشان داده می‌شود (سرور هم مستقل همین را
  // با requireFeature اجرا می‌کند؛ این‌جا فقط برای تجربه‌ی کاربری، بدون رفت‌وبرگشت به سرور)
  if(!featureEnabled(p)){ renderFeatureGate(p); return; }
  ({acc:renderAccHub, knowledge:renderKnowledge, duties:renderDutiesHub, dash:renderDash, inbox:renderInbox, messages:renderMessages, settings:renderSettings, measures:renderMeasures, reports:renderReports, reviewgaps:renderReviewGaps, users:renderUsers, committees:renderCommittees, documents:renderDocuments, checklists:renderChecklists, audits:renderAudits, walkarounds:renderWalkarounds, processes:renderProcesses, programs:renderPrograms, training:renderTraining, bsc:renderBsc, indicators:(typeof renderIndicatorSlidesView==='function'?renderIndicatorSlidesView:renderIndicators), calendar:renderCalendar, orgstructure:renderOrg, orgchart:renderOrgChart, nursing:renderNursing, support:renderSupport, management:renderManagement, headnurse:renderHeadNurse, staffshift:renderShiftSchedule, shiftatt:renderShiftAttendance, assets:renderFacilityAssets, pharmacy:renderPharmacy, disaster:renderDisaster, infection:renderInfection, occhealth:renderOccHealth, hrdev:renderHrDev, vendors:renderVendors, nsupervision:renderNsupervision, finance:renderFinance, patientfocus:renderPatientFocus, education:renderEducation, blood:renderBlood, lab:renderLab, imaging:renderImaging, errors:renderErrors, fmea:renderFmea, activities:renderActivities, guide:renderRoleGuide, profile:renderProfile, satisfaction:renderSatisfactionResults, followup:renderFollowup, doccodes:renderDocCodes, tenures:renderTenures, formbuilder:renderFormBuilder, forms:renderFormFiller,
    // ماژول‌های CRM و ایمنی بالینی — اضافه‌شده در فاز CRM
    crm:renderCrm, safesurgery:renderSafeSurgery, medrecon:renderMedRecon, waste:renderWasteLog,
    directives:renderDirectives,
    // هاب‌های تخصصی فرآیندی اعتباربخشی (Rule 11)
    patientrights:(typeof renderPatientRightsHub==='function'?renderPatientRightsHub:renderDash),
    maternal:(typeof renderMaternalNeonatalHub==='function'?renderMaternalNeonatalHub:renderDash),
    outpatient:(typeof renderOutpatientHub==='function'?renderOutpatientHub:renderDash),
    indicator_slides:(typeof renderIndicatorSlidesView==='function'?renderIndicatorSlidesView:renderDash),
  }[p]||renderDash)();
}

