/* =====================================================================
   APP-NAV.JS — ناوبری اپلیکیشن‌مانند (App-Shell Navigation)
   ---------------------------------------------------------------------
   خواسته‌ی کارفرما (۱۴۰۵-۰۷-۲۰):
   «می‌خوام برای نسخه موبایل و دسکتاپ کل صفحات ری‌دیزاین بشه یعنی یه منو
   داشته باشه با آیکون‌های زیبا و از حالت وب‌سایتی خارج بشه. مثلاً در نسخه
   موبایل و تبلت منوی اصلی بیاد زیر صفحه ثابت باشه و کلیدهایی که در منوی
   سمت چپ هست اون پایین دیده بشه که فضای بیشتری داشته باشیم. کلید دستیار
   هوشمند هم توی اون زیرمنو باشه، آیکون زیرمنو خیلی زیبا باشه. برای نسخه
   دسکتاپ این بره کلا سمت راست و کلیدها اونجا باشند. هدر و فوتر بعد از
   وارد شدن در سمت نمی‌خوام باشند — می‌خوام طرف وارد سمتش شد انگار وارد
   نرم‌افزار شده.»

   معماری این فایل:
   ۱) موبایل/تبلت (≤1024px): نوار تب پایین ثابت (Bottom Tab Bar) شامل
      میزکار، اعتباربخشی، «دانا» در مرکز (دستیار هوشمند)، کارتابل و
      «بیشتر» که شیت کامل منو را باز می‌کند (همه‌ی آیتم‌های منو + پروفایل).
      سایدبار کلاسیک جایش را به این دو می‌دهد تا فضای بیشتری آزاد شود.
   ۲) دسکتاپ (>1024px): سایدبارِ راست می‌ماند ولی «تمام‌قد» می‌شود و
      کلیدهای شناور گوشه‌ی چپ (دانا/منو/تنظیمات ظاهری) به پایین-راست،
      محدوده‌ی سایدبار منتقل می‌شوند — «کلیدها سمت راست».
   ۳) هدر/فوتر سراسری وقتی کاربر وارد شده کاملاً حذف می‌شوند (body.app-shell).

   این فایل فقط با APIهای عمومی موجود کار می‌کند (go, NAV_GROUPS, ic, fa,
   S, closeSidebar, logout, openEnterpriseAssistant, toggleSettDrawer) و
   هیچ‌کدام را بازنویسی نمی‌کند.
   ===================================================================== */
(function () {
  'use strict';

  const MOBILE_MAX = 1024;
  function isMobile() { return window.innerWidth <= MOBILE_MAX; }
  function iconOf(name) {
    try { return (typeof ic === 'function') ? ic(name) : ''; } catch (e) { return ''; }
  }
  function esc2(s) {
    try { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }
    catch (e) { return String(s == null ? '' : s); }
  }

  // تب‌های ثابت نوار پایین (وسط نوار: دانا). «کارتابل» برای همه هست چون
  // «کارتابل و مسئولیت‌ها» در منوی همه‌ی نقش‌ها وجود دارد.
  function buildTabs() {
    return [
      { k: 'dash',  t: 'میزکار',     i: iconOf('dashboard') },
      { k: 'acc',   t: 'اعتباربخشی', i: iconOf('clipboard') },
      // اینجا دانا می‌نشیند (دکمه‌ی ویژه‌ی مرکزی)
      { k: 'duties', t: 'کارتابل',   i: iconOf('badge') },
    ];
  }

  // ---- ساخت نوار تب پایین ----
  function ensureBottomBar() {
    if (!S.user) { const old = document.getElementById('appTabbar'); if (old) old.remove(); return; }
    let bar = document.getElementById('appTabbar');
    if (!bar) {
      bar = document.createElement('nav');
      bar.id = 'appTabbar';
      bar.className = 'app-tabbar';
      bar.setAttribute('aria-label', 'ناوبری اصلی');
      document.body.appendChild(bar);
    }
    const tabs = buildTabs();
    const [t1, t2, t3] = tabs;
    bar.innerHTML =
      `<button type="button" class="app-tab" data-p="${t1.k}" onclick="go('${t1.k}');appNavSync()">
         <span class="app-tab-ic">${t1.i}</span><span class="app-tab-t">${t1.t}</span></button>` +
      `<button type="button" class="app-tab" data-p="${t2.k}" onclick="go('${t2.k}');appNavSync()">
         <span class="app-tab-ic">${t2.i}</span><span class="app-tab-t">${t2.t}</span></button>` +
      // دکمه‌ی ویژه‌ی «دانا» — دقیقاً در وسط نوار (ترتیب DOM در RTL مستقیماً پنجره‌ی وسط را می‌سازد)
      `<button type="button" class="app-tab app-tab-dana" id="appTabDana" onclick="appNavOpenDana()" aria-label="دستیار هوشمند دانا">
         <span class="app-tab-ic dana-ic">${iconOf('sparkle')}<i class="dana-orbit"></i></span>
         <span class="app-tab-t">دانا</span>
       </button>` +
      `<button type="button" class="app-tab" data-p="${t3.k}" onclick="go('${t3.k}');appNavSync()">
         <span class="app-tab-ic">${t3.i}</span><span class="app-tab-t">${t3.t}</span></button>` +
      `<button type="button" class="app-tab" id="appTabMore" onclick="appNavOpenMore()" aria-label="همه‌ی منو">
         <span class="app-tab-ic">${iconOf('menu')}</span><span class="app-tab-t">بیشتر</span></button>`;
    document.body.classList.add('has-app-tabbar');
    appNavSync();
  }

  // همگام‌سازی حالت فعال تب‌ها با صفحه‌ی جاری (شامل زیرصفحه‌ها از طریق HUB_OF)
  function appNavSync() {
    let cur = (typeof S !== 'undefined' && S && S.page) || '';
    const bar = document.getElementById('appTabbar');
    if (bar) {
      const keys = buildTabs().map(t => t.k);
      let activeKey = keys.includes(cur) ? cur : null;
      // نقشه‌برداری زیرصفحه‌ها: زیرمجموعه‌های هَب «اعتباربخشی» → تب اعتباربخشی؛
      // زیرمجموعه‌های هَب «کارتابل» → فقط صفحات واقعاً کارتابلی تب کارتابل را
      // روشن می‌کنند (نه راهنما/پروفایل که فقط در همان هَب فهرست شده‌اند و
      // از نظر کاربر جزو کارتابل نیستند).
      if (!activeKey) {
        const dutiesSubpages = ['duties', 'inbox', 'messages', 'activities', 'calendar', 'headnurse'];
        // چند صفحه‌ی دیگر که در HUB_OF نیامده‌اند ولی کاربر آن‌ها را زیر
        // اعتباربخشی/شیفت می‌بیند — فقط برای روشنماندن تب درست.
        const accSubpages = ['indicator_slides', 'measures', 'reviewgaps', 'doccodes', 'documents',
          'checklists', 'audits', 'walkarounds', 'errors', 'fmea', 'satisfaction', 'followup',
          'committees', 'bsc', 'indicators', 'programs', 'processes', 'orgchart', 'orgstructure',
          'nursing', 'support', 'management', 'training', 'reports', 'users', 'settings', 'tenures',
          'staffshift', 'shiftatt', 'assets', 'pharmacy', 'disaster', 'infection', 'blood', 'lab',
          'imaging', 'knowledge', 'occhealth', 'hrdev', 'vendors', 'nsupervision', 'finance',
          'patientfocus', 'education', 'crm', 'safesurgery', 'medrecon', 'waste',
          'patientrights', 'maternal', 'outpatient'];
        try {
          if (dutiesSubpages.includes(cur) && keys.includes('duties')) activeKey = 'duties';
          else if (accSubpages.includes(cur) && keys.includes('acc')) activeKey = 'acc';
          else {
            const hub = (typeof HUB_OF !== 'undefined') ? HUB_OF[cur] : null;
            if (hub === 'acc' && keys.includes('acc')) activeKey = 'acc';
          }
        } catch (e) {}
      }
      bar.querySelectorAll('.app-tab[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === activeKey));
      const more = document.getElementById('appTabMore');
      if (more) more.classList.toggle('on', !activeKey);
    }
    // برجسته‌سازی آیتم‌های منوی کامل هم اگر باز باشد
    document.querySelectorAll('#appSheet .nitem[data-p]').forEach(n => {
      n.classList.toggle('on', n.dataset.p === cur);
    });
  }
  window.appNavSync = appNavSync;

  // ---- شیت «همه‌ی منو» (Bottom Sheet) ----
  // همان آیتم‌های سایدبار (NAV_GROUPS) دوباره استفاده می‌شوند تا منبعِ
  // حقیقت یکی بماند؛ اگر سایدبار گروهی جدید بگیرد، اینجا هم خودکار می‌آید.
  function ensureSheet() {
    let sh = document.getElementById('appSheet');
    if (!sh) {
      sh = document.createElement('div');
      sh.id = 'appSheet';
      sh.className = 'app-sheet';
      const displayName = (S.user && S.user.full_name) || '';
      const initial = displayName.replace(/^(دکتر|خانم|آقای|مهندس|استاد)\s+/, '').charAt(0) || '؟';
      const roleTitle = (typeof ROLE_FA !== 'undefined' && S.user && ROLE_FA[S.user.role_code]) || (S.user && S.user.role_title) || '';
      sh.innerHTML = `
        <div class="app-sheet-ov" onclick="appNavCloseMore()"></div>
        <div class="app-sheet-bd" role="dialog" aria-label="همه‌ی منو">
          <div class="app-sheet-grip"></div>
          <div class="app-sheet-hd">
            <span class="app-sheet-ttl">منوی کامل</span>
            <button type="button" class="app-sheet-x" onclick="appNavCloseMore()" aria-label="بستن">✕</button>
          </div>
          <div class="app-sheet-user">
            <span class="as-avatar">${esc2(initial)}</span>
            <span class="as-info"><b>${esc2(displayName)}</b><i>${esc2(roleTitle)}</i></span>
            <button type="button" class="as-act" onclick="go('profile');appNavCloseMore();" title="پروفایل">${iconOf('user')}</button>
            <button type="button" class="as-act out" onclick="logout()" title="خروج">${iconOf('logout')}</button>
          </div>
          <div class="app-sheet-scroll" id="appSheetScroll"></div>
        </div>`;
      document.body.appendChild(sh);
    }
    return sh;
  }

  function fillSheet() {
    const box = document.getElementById('appSheetScroll');
    if (!box || typeof NAV_GROUPS === 'undefined') return;
    const items = g => g.items.map(n =>
      `<button type="button" class="nitem app-nitem" data-p="${n.k}" onclick="go('${n.k}');appNavCloseMore();">
         <span class="ic">${n.i}</span><span class="ntxt">${esc2(n.t)}</span>
         <span class="nbadge" data-badge="${n.k}"></span>
       </button>`).join('');
    box.innerHTML = NAV_GROUPS.map(g => g.g
      ? `<div class="app-sheet-grp"><div class="app-sheet-grp-t"><span class="ic">${g.i}</span>${esc2(g.t)}</div><div class="app-sheet-grid">${items(g)}</div></div>`
      : `<div class="app-sheet-grid">${items(g)}</div>`).join('')
      + `<div class="app-sheet-grp"><div class="app-sheet-grp-t"><span class="ic">${iconOf('sparkle')}</span>ابزارها</div><div class="app-sheet-grid">
           <button type="button" class="nitem app-nitem" onclick="go('guide');appNavCloseMore();"><span class="ic">${iconOf('help')}</span><span class="ntxt">راهنمای نقش من</span></button>
           <button type="button" class="nitem app-nitem" onclick="openTour();appNavCloseMore();"><span class="ic">${iconOf('star')}</span><span class="ntxt">راهنمای گام‌به‌گام</span></button>
           <button type="button" class="nitem app-nitem" onclick="appNavCloseMore();appNavOpenDana()"><span class="ic">${iconOf('message')}</span><span class="ntxt">گفتگو با دانا</span></button>
           <button type="button" class="nitem app-nitem" onclick="appNavCloseMore();if(window.toggleSettDrawer)window.toggleSettDrawer(true);"><span class="ic">${iconOf('palette')}</span><span class="ntxt">تنظیمات ظاهری</span></button>
         </div></div>`;
    // بج‌های کارتابل را هم به آیتم‌های شیت منتقل کن
    try {
      const b = {}; document.querySelectorAll('#side .nbadge[data-badge]').forEach(el => { b[el.dataset.badge] = el.textContent; });
      box.querySelectorAll('.nbadge[data-badge]').forEach(el => {
        const v = b[el.dataset.badge]; if (v) { el.textContent = v; el.classList.add('on'); }
      });
    } catch (e) {}
    appNavSync();
  }

  window.appNavOpenMore = function () {
    const sh = ensureSheet();
    fillSheet();
    sh.classList.add('open');
    document.body.classList.add('app-sheet-open');
  };
  window.appNavCloseMore = function () {
    const sh = document.getElementById('appSheet');
    if (sh) sh.classList.remove('open');
    document.body.classList.remove('app-sheet-open');
  };
  window.appNavOpenDana = function () {
    if (window.openEnterpriseAssistant) window.openEnterpriseAssistant();
    else if (window.toggleEnterpriseAssistant) window.toggleEnterpriseAssistant();
  };

  // ---- دسکتاپ: کلیدهای شناور «از نظر بصری» به پایین-راست (محدوده‌ی سایدبار) ----
  // جابجایی فیزیکی DOM نه — چون renderApp() بعدی کل #root را بازمی‌سازد و
  // داکِ منتقل‌شده نابود می‌شد. فقط کلاس عوض می‌کنیم و CSS آن را پایین-راست
  // می‌نشاند. عرض سایدبار را هم در متغیر CSS می‌گذاریم تا کشوهای دیگر
  // (تنظیمات ظاهری) هوشمند کنارش باز شوند.
  function positionDock() {
    const dock = document.getElementById('floatDock');
    if (!dock) return;
    dock.classList.toggle('in-side', window.innerWidth > MOBILE_MAX);
    const side = document.getElementById('side');
    if (side) {
      const w = Math.round(side.getBoundingClientRect().width || 326);
      if (w > 0) document.documentElement.style.setProperty('--side-w', w + 'px');
      dock.classList.toggle('side-narrow', w < 120);
    }
  }

  // ---- کلاس app-shell روی body: وقتی کاربر وارد شده، هدر/فوتر حذف و پوسته‌ی اپ فعال شود ----
  function syncShellClass() {
    const inside = !!(S && S.user);
    document.body.classList.toggle('app-shell', inside);
    if (!inside) {
      const b = document.getElementById('appTabbar');
      if (b) b.remove();
      document.body.classList.remove('has-app-tabbar', 'app-sheet-open');
      if (window.appNavCloseMore) window.appNavCloseMore();
    }
  }

  // ---- راه‌اندازی و هم‌گام‌سازی با تغییر اندازه ----
  let raf = null;
  function refresh() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      try {
        syncShellClass();
        if (!S.user) return;
        ensureBottomBar();
        positionDock();
        appNavSync();
      } catch (e) { console.warn('[AppNav]', e && e.message); }
    });
  }
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  document.addEventListener('DOMContentLoaded', () => { refresh(); });

  // بعد از هر رندر مجدد (renderApp کل #root را عوض می‌کند) همگام شو.
  // مراقبِ #root هستیم (نه کل body) تا افزودن نوار تب/شیت به body خودش
  // باعث حلقه‌ی بی‌نهایت نشود.
  let moT = null;
  const mo = new MutationObserver(() => {
    if (moT) return;
    moT = setTimeout(() => {
      moT = null;
      if (!S.user) { syncShellClass(); return; }
      if (!document.getElementById('appTabbar') || !document.querySelector('.app-tab')) refresh();
      else { positionDock(); appNavSync(); }
    }, 160);
  });
  function attachRootObserver() {
    const rootEl = document.getElementById('root');
    if (rootEl && !rootEl.__appNavObserved) {
      rootEl.__appNavObserved = true;
      try { mo.observe(rootEl, { childList: true, subtree: true }); } catch (e) {}
    }
  }
  attachRootObserver();

  // API عمومی
  window.appNavRefresh = refresh;
  window.appNavIsMobile = isMobile;

  // پس از ورود موفق (doRoleLogin / doLogin / dev-login) فوراً کلاس پوسته را اعمال کن
  // — از طریق بازنویسی نرمِ توابع موجود، بدون دست‌زدن به فایل‌های اصلی آن‌ها.
  function hookAfter(fnName) {
    try {
      const orig = window[fnName];
      if (typeof orig !== 'function' || orig.__appNavHooked) return;
      const wrapped = function () {
        const r = orig.apply(this, arguments);
        Promise.resolve(r).then(() => { refresh(); setTimeout(refresh, 350); }).catch(() => {});
        return r;
      };
      wrapped.__appNavHooked = true;
      window[fnName] = wrapped;
    } catch (e) {}
  }
  function hookLateFunctions() {
    ['doRoleLogin', 'doLogin', 'doDevLogin', 'enterApp', 'logout', 'renderApp', 'renderLogin'].forEach(hookAfter);
  }
  hookLateFunctions();
  setTimeout(hookLateFunctions, 900);
  setTimeout(hookLateFunctions, 2600);
  window.addEventListener('load', () => { attachRootObserver(); hookLateFunctions(); refresh(); });
})();
