/**
 * Core Router & History API
 * Modular Frontend Component — Project 313
 */
// ==================== مسیریابی عمیق و حفظ موقعیت صفحه و سطوح زیرین (SPA Deep Router & History) ====================
// طبق خواست کاربر: صفحه اصلی همیشه «اعتباربخشی» است و کلید بازگشت مرورگر نباید به اول بپرد.
const ALL_APP_PAGES = new Set([
  'acc', 'knowledge', 'duties', 'dash', 'inbox', 'messages', 'settings', 'measures',
  'reports', 'reviewgaps', 'users', 'committees', 'documents', 'checklists', 'audits',
  'walkarounds', 'processes', 'programs', 'training', 'bsc', 'indicators', 'indicator_slides', 'calendar',
  'orgstructure', 'orgchart', 'nursing', 'support', 'management', 'headnurse',
  'staffshift', 'shiftatt', 'assets', 'pharmacy', 'disaster', 'infection', 'occhealth',
  'hrdev', 'vendors', 'nsupervision', 'finance', 'patientfocus', 'education', 'blood',
  'lab', 'imaging', 'errors', 'fmea', 'activities', 'guide', 'profile', 'satisfaction',
  'followup', 'doccodes', 'tenures', 'crm', 'safesurgery', 'medrecon', 'waste',
  'patientrights', 'maternal', 'outpatient'
]);

function isValidAppPage(p){
  return typeof p === 'string' && ALL_APP_PAGES.has(p);
}

window.__navigatingViaGo = false;

function saveCurrentRouteState(p){
  p = p || S.page;
  if(!p) return;
  try {
    sessionStorage.setItem('p_last_page', p);
  } catch(e){}
}

function saveMeasuresSubState(){
  try {
    sessionStorage.setItem('p_measures_state', JSON.stringify({
      openSec: S.openSec,
      axis: S.axis,
      accDepth: S.accDepth,
      accCurrentTab: S.accCurrentTab
    }));
  } catch(e){}
}

function parseHashRoute(){
  const raw = (window.location.hash || '').replace(/^#[/]?/, '').trim();
  if(!raw) return null;
  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/').map(s => decodeURIComponent(s).trim()).filter(Boolean);
  const page = segments[0] || '';
  const subPath = segments.slice(1).join('/');
  const params = {};
  if(queryPart){
    queryPart.split('&').forEach(pair => {
      const idx = pair.indexOf('=');
      if(idx > -1){
        params[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
      }
    });
  }
  return { raw, page, segments, subPath, params };
}

function restoreSubRouteState(p, params){
  params = params || {};
  if(p === 'measures'){
    let saved = null;
    try {
      const raw = sessionStorage.getItem('p_measures_state');
      if(raw) saved = JSON.parse(raw);
    } catch(e){}

    if(params.sec) S.openSec = params.sec;
    else if(saved && saved.openSec) S.openSec = saved.openSec;

    if(params.axis) S.axis = params.axis;
    else if(saved && saved.axis) S.axis = saved.axis;

    if(params.depth !== undefined) S.accDepth = parseInt(params.depth, 10);
    else if(saved && saved.accDepth !== undefined) S.accDepth = saved.accDepth;

    if(params.tab) S.accCurrentTab = params.tab;
    else if(saved && saved.accCurrentTab) S.accCurrentTab = saved.accCurrentTab;
  }
  if((typeof HassanHub !== 'undefined' && typeof HassanHub.restoreState === 'function')){
    if(typeof HassanHub !== 'undefined') HassanHub.restoreState(); else if((typeof HassanHub !== 'undefined' || typeof HassanHub !== 'undefined')) HassanHub.restoreState();
  }
}

function syncRouteHash(p, opts = {}){
  p = p || S.page || defaultLanding();
  let targetHash = '#' + encodeURIComponent(p);
  if(p === 'measures'){
    if(S.accDepth === 1){
      if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined') && HassanState.currentSubView === 'standard_page' && HassanState.selectedStandardCode){
        targetHash = '#acc/standard/' + encodeURIComponent(HassanState.selectedStandardCode);
      } else if(S.openSec === 'ب'){
        if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined') && HassanState.currentSubView === 'procedures_flow'){
          targetHash = '#acc/care/procedures';
        } else if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined') && HassanState.currentSubView === 'general_care_sub'){
          targetHash = '#acc/care/general';
        } else if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined') && HassanState.currentSubView === 'sub_axis' && HassanState.selectedAxisCode){
          targetHash = '#acc/care/axis/' + encodeURIComponent(HassanState.selectedAxisCode);
        } else {
          targetHash = '#acc/care';
        }
      } else if(S.openSec === 'الف'){
        if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined') && HassanState.currentSubView === 'sub_axis' && HassanState.selectedAxisCode){
          targetHash = '#acc/management/axis/' + encodeURIComponent(HassanState.selectedAxisCode);
        } else {
          targetHash = '#acc/management';
        }
      } else if(S.openSec === 'ج'){
        if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined') && HassanState.currentSubView === 'sub_axis' && HassanState.selectedAxisCode){
          targetHash = '#acc/support/axis/' + encodeURIComponent(HassanState.selectedAxisCode);
        } else {
          targetHash = '#acc/support';
        }
      }
    } else if(S.accDepth === 2){
      targetHash = '#measures?sec=' + encodeURIComponent(S.openSec || '') + '&axis=' + encodeURIComponent(S.axis || '') + '&depth=2';
    } else {
      targetHash = '#acc';
    }
  }
  if(location.hash !== targetHash){
    if(opts.skipHashUpdate || opts.fromHistory) return;
    window.__navigatingViaGo = true;
    if(opts.replaceState || opts.isInitialBoot){
      if(window.history && history.replaceState) history.replaceState(null, '', targetHash);
      else location.hash = targetHash;
    } else {
      if(window.history && history.pushState) history.pushState(null, '', targetHash);
      else location.hash = targetHash;
    }
    setTimeout(()=>{ window.__navigatingViaGo = false; }, 60);
  }
}

function handleRoute(route, opts = {}){
  if(!route || !route.page){
    go(defaultLanding(), { replaceState: true });
    return;
  }

  const normCode = (s) => (typeof window.hassanNormCode === 'function' ? window.hassanNormCode(s) : String(s||'').replace(/[۰-۹]/g, d=>'0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]).replace(/[٠-٩]/g, d=>'0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, '').trim());

  // ۱. مسیرهای ساختاریافته اعتباربخشی (طراحی اولیه حسن)
  if(route.page === 'acc'){
    const HState = window.HassanState || window.HassanState;
    const HHub = window.HassanHub || window.HassanHub;

    if(route.subPath && route.subPath.startsWith('measure/') && route.subPath.endsWith('/checklists')){
      const rawM = decodeURIComponent(route.subPath.replace(/^measure\//, '').replace(/\/checklists$/, '').trim());
      const mCode = normCode(rawM);
      S.page = 'measures'; S.accDepth = 1;
      if(HState){
        HState.currentSubView = 'measure_checklists';
        HState.selectedMeasureCode = mCode;
        if(HHub && HHub.saveState) HHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }

    if(route.subPath && route.subPath.startsWith('measure/')){
      const rawM = decodeURIComponent(route.subPath.replace(/^measure\//, '').trim());
      const mCode = normCode(rawM);
      S.page = 'measures'; S.accDepth = 1;
      if(HState){
        HState.currentSubView = 'measure_page';
        HState.selectedMeasureCode = mCode;
        if(HHub && HHub.saveState) HHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }

    if(route.subPath === 'management/safety'){
      S.page = 'measures'; S.openSec = 'الف'; S.accDepth = 1;
      if(HState){
        HState.currentSection = 'management';
        HState.currentSubView = 'safety_hub';
        if(HHub && HHub.saveState) HHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }

    if(route.subPath === 'management/safety-measures'){
      S.page = 'measures'; S.openSec = 'الف'; S.accDepth = 1;
      if(HState){
        HState.currentSection = 'management';
        HState.currentSubView = 'safety_measures';
        if(HHub && HHub.saveState) HHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath && route.subPath.startsWith('standard/')){
      const rawStd = decodeURIComponent(route.subPath.replace(/^standard\//, '').trim());
      const stdCode = normCode(rawStd);
      let secCode = 'ب';
      let secName = 'care';
      if(stdCode.startsWith('الف-')){
        secCode = 'الف';
        secName = 'management';
      } else if(stdCode.startsWith('ج-')){
        secCode = 'ج';
        secName = 'support';
      }
      S.page = 'measures'; S.openSec = secCode; S.accDepth = 1;
      if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined')){
        HassanState.currentSection = secName;
        HassanState.currentSubView = 'standard_page';
        HassanState.selectedStandardCode = stdCode;
        if((typeof HassanHub !== 'undefined' || typeof HassanHub !== 'undefined') && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath === 'care/procedures'){
      S.page = 'measures'; S.openSec = 'ب'; S.accDepth = 1;
      if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined')){
        HassanState.currentSection = 'care';
        HassanState.currentSubView = 'procedures_flow';
        if((typeof HassanHub !== 'undefined' || typeof HassanHub !== 'undefined') && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath === 'care/general'){
      S.page = 'measures'; S.openSec = 'ب'; S.accDepth = 1;
      if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined')){
        HassanState.currentSection = 'care';
        HassanState.currentSubView = 'general_care_sub';
        if((typeof HassanHub !== 'undefined' || typeof HassanHub !== 'undefined') && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath && route.subPath.startsWith('care/axis/')){
      const rawAxis = decodeURIComponent(route.segments[3] || route.params.axis || '');
      const axisCode = normCode(rawAxis);
      S.page = 'measures'; S.openSec = 'ب'; S.accDepth = 1;
      if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined')){
        HassanState.currentSection = 'care';
        HassanState.currentSubView = 'sub_axis';
        if(axisCode) HassanState.selectedAxisCode = axisCode;
        if((typeof HassanHub !== 'undefined' || typeof HassanHub !== 'undefined') && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath && route.subPath.startsWith('management/axis/')){
      const rawAxis = decodeURIComponent(route.segments[3] || route.params.axis || '');
      const axisCode = normCode(rawAxis);
      S.page = 'measures'; S.openSec = 'الف'; S.accDepth = 1;
      if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined')){
        HassanState.currentSection = 'management';
        HassanState.currentSubView = 'sub_axis';
        if(axisCode) HassanState.selectedAxisCode = axisCode;
        if((typeof HassanHub !== 'undefined' || typeof HassanHub !== 'undefined') && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath && route.subPath.startsWith('support/axis/')){
      const rawAxis = decodeURIComponent(route.segments[3] || route.params.axis || '');
      const axisCode = normCode(rawAxis);
      S.page = 'measures'; S.openSec = 'ج'; S.accDepth = 1;
      if((typeof HassanState !== 'undefined' || typeof HassanState !== 'undefined')){
        HassanState.currentSection = 'support';
        HassanState.currentSubView = 'sub_axis';
        if(axisCode) HassanState.selectedAxisCode = axisCode;
        if((typeof HassanHub !== 'undefined' || typeof HassanHub !== 'undefined') && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath === 'care'){
      S.page = 'measures'; S.openSec = 'ب'; S.accDepth = 1;
      if(typeof HassanState !== 'undefined'){
        HassanState.currentSection = 'care';
        HassanState.currentSubView = 'grid';
        HassanState.selectedAxisCode = null;
        HassanState.selectedAxisTitle = '';
        HassanState.selectedStandardCode = null;
        HassanState.selectedStandardTitle = '';
        HassanState.selectedMeasureCode = null;
        HassanState.selectedMeasureTitle = '';
        if(typeof HassanHub !== 'undefined' && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath === 'management'){
      S.page = 'measures'; S.openSec = 'الف'; S.accDepth = 1;
      if(typeof HassanState !== 'undefined'){
        HassanState.currentSection = 'management';
        HassanState.currentSubView = 'grid';
        HassanState.selectedAxisCode = null;
        HassanState.selectedAxisTitle = '';
        HassanState.selectedStandardCode = null;
        HassanState.selectedStandardTitle = '';
        HassanState.selectedMeasureCode = null;
        HassanState.selectedMeasureTitle = '';
        if(typeof HassanHub !== 'undefined' && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }
    if(route.subPath === 'support'){
      S.page = 'measures'; S.openSec = 'ج'; S.accDepth = 1;
      if(typeof HassanState !== 'undefined'){
        HassanState.currentSection = 'support';
        HassanState.currentSubView = 'grid';
        HassanState.selectedAxisCode = null;
        HassanState.selectedAxisTitle = '';
        HassanState.selectedStandardCode = null;
        HassanState.selectedStandardTitle = '';
        HassanState.selectedMeasureCode = null;
        HassanState.selectedMeasureTitle = '';
        if(typeof HassanHub !== 'undefined' && HassanHub.saveState) HassanHub.saveState();
      }
      go('measures', { skipHashUpdate: true, fromHistory: opts.fromHistory });
      return;
    }

    go('acc', { skipHashUpdate: true, fromHistory: opts.fromHistory });
    return;
  }

  // ۲. مسیر مستقیم سنجه‌ها
  if(route.page === 'measures'){
    restoreSubRouteState('measures', route.params);
    go('measures', { skipHashUpdate: true });
    return;
  }

  // ۳. کلیه صفحات مجزای دیگر سامانه
  if(isValidAppPage(route.page)){
    restoreSubRouteState(route.page, route.params);
    go(route.page, { skipHashUpdate: true });
    return;
  }

  // ۴. در غیر این صورت: بازگشت به صفحه اصلی اعتباربخشی
  go(defaultLanding(), { replaceState: true });
}

function getInitialRoute(){
  const hashRoute = parseHashRoute();
  if(hashRoute && hashRoute.page && (hashRoute.page === 'acc' || isValidAppPage(hashRoute.page))){
    return hashRoute;
  }

  try {
    const lastPage = sessionStorage.getItem('p_last_page');
    if(lastPage && (lastPage === 'acc' || isValidAppPage(lastPage))){
      return { raw: '#' + lastPage, page: lastPage, segments: [lastPage], subPath: '', params: {} };
    }
  } catch(e){}

  return { raw: '#acc', page: 'acc', segments: ['acc'], subPath: '', params: {} };
}

function initHashRouting(){
  if(window.__hashRoutingInitialized) return;
  window.__hashRoutingInitialized = true;

  const onNavChange = () => {
    if(window.__navigatingViaGo) return;
    const r = parseHashRoute();
    handleRoute(r, { fromHistory: true });
  };

  window.addEventListener('hashchange', onNavChange);
  window.addEventListener('popstate', onNavChange);
}

// تولید پیشوند احترامی کاربر (خانم / آقای / دکتر / مهندس / سرکار خانم / جناب آقای / استاد)
function getUserTitlePrefix(u = S.user){
  if(!u) return '';
  if(u.title_prefix && u.title_prefix.trim()) return u.title_prefix.trim();
  if(u.gender==='female'||u.gender==='زن') return 'خانم';
  if(u.gender==='male'||u.gender==='مرد') return 'آقای';
  return '';
}

// ساخت عنوان پویای سربرگ: «داشبورد [سمت] [پیشوند] [نام کاربر]»
function getUserDashboardTitle(){
  const u = S.user;
  if(!u) return 'داشبورد';
  const roleName = ROLE_FA[u.role_code] || u.role_title || '';
  const prefix = getUserTitlePrefix(u);
  let name = (u.full_name || '').trim();
  // اگر پیشوند قبلاً در ابتدای نام ثبت شده، مجدداً تکرار نشود
  let titleWithPrefix = name;
  if(prefix){
    if(!name.startsWith(prefix)){
      titleWithPrefix = `${prefix} ${name}`;
    }
  }
  let res = 'داشبورد';
  if(roleName) res += ` ${roleName}`;
  if(titleWithPrefix) res += ` ${titleWithPrefix}`;
  return res.replace(/\s+/g, ' ').trim();
}
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
