/**
 * Hospital Indicators Presentation, Analytics & Data Entry Suite (1404-1405)
 * Comprehensive Interactive KPI Tool — Project 313
 * Zero Monolith — Zero Vertical Stacking — Luxury Health-Tech Theme
 */

function hasPerm(p) {
  return !!(window.S && S.user && (S.user.permissions || []).includes(p));
}

// مجوز دیدن «شاخص‌ها» — دقیقاً همان چیزی که روت /indicator-slides می‌خواهد.
// قبل از این، منوی اصلی این صفحه را به همه نشان می‌داد و برای نقش‌های بدون
// مجوز (مثل پرستار) صفحه با «دسترسی ندارید» بالا می‌آمد.
function slidesCanView() {
  return hasPerm('view_indicator_slides') || hasPerm('view_indicators') || hasPerm('view_bsc') || hasPerm('manage_indicators');
}

function getHospitalName() {
  return (ISLIDE_STATE && ISLIDE_STATE.hospitalName) || (window.S && S.user && S.user.hospital_name) || 'بیمارستان';
}

function cleanSlideTitle(str) {
  if (!str) return '';
  return String(str)
    .replace(/\{HOSPITAL_NAME\}/g, getHospitalName())
    .replace(/ب[یي]مارستان\s*ام[یي]د/g, getHospitalName())
    .replace(/ب[یي]مارستان\s*اميد/g, getHospitalName())
    .replace(/به\s*ام[یي]دارتقاء/g, 'در جهت ارتقاء')
    .replace(/به\s*امید\s*ارتقاء/g, 'در جهت ارتقاء');
}

let ISLIDE_STATE = {
  slides: [],
  sections: [],
  currentSlideIndex: 1, // Start on slide 2 (first actual indicator) or slide 1
  activeSection: 'all',
  viewMode: 'slide', // 'slide', 'grid', 'editor', 'national'
  chartFilter: 'all', // 'all', 'quarters', 'months'
  searchQuery: '',
  isPlaying: false,
  playTimer: null,
  selectedEditorSlide: 2,
  editorValues: {},
  loading: false
};

// پالت رنگ‌های حرفه‌ای و تفکیک‌شده برای سرفصل‌ها و نمودارها
const ISLIDE_THEMES = {
  hospital_macro: { primary: '#38bdf8', secondary: '#f59e0b', bg: 'rgba(56, 189, 248, 0.1)', border: '#0284c7', label: 'کلان و اورژانس', icon: '🏥' },
  surgical_maternity: { primary: '#a855f7', secondary: '#ec4899', bg: 'rgba(168, 85, 247, 0.1)', border: '#7e22ce', label: 'جراحی، زایمان و پاراکلینیک', icon: '🩺' },
  nursing_office: { primary: '#10b981', secondary: '#06b6d4', bg: 'rgba(16, 185, 129, 0.1)', border: '#059669', label: 'دفتر پرستاری', icon: '👩‍⚕️' },
  patient_safety: { primary: '#ef4444', secondary: '#f97316', bg: 'rgba(239, 68, 68, 0.1)', border: '#dc2626', label: 'ایمنی بیمار', icon: '🛡️' },
  infection_control: { primary: '#14b8a6', secondary: '#84cc16', bg: 'rgba(20, 184, 166, 0.1)', border: '#0d9488', label: 'کنترل عفونت', icon: '🦠' },
  patient_education: { primary: '#0ea5e9', secondary: '#8b5cf6', bg: 'rgba(14, 165, 233, 0.1)', border: '#0284c7', label: 'آموزش بیمار', icon: '📖' },
  staff_education: { primary: '#f59e0b', secondary: '#10b981', bg: 'rgba(245, 158, 11, 0.1)', border: '#d97706', label: 'آموزش کارکنان', icon: '🎓' }
};

// نگاشت دقیق به سنجه‌ها و فصول اعتباربخشی ملی بیمارستان‌های ایران
function getAccreditationStandardForSlide(slide) {
  if (!slide) return null;
  const sec = slide.section_id || '';
  const title = slide.title || '';

  if (sec === 'patient_safety' || /ایمنی|سقوط|زخم\s*بستر|خطا|دارویی|ترانسفوزیون|سنتینل/.test(title)) {
    return {
      code: 'الف-۳-۱',
      title: 'مدیریت ایمنی بیمار و خطاهای بالینی',
      clause: 'سنجه ۱ و ۲ ایمنی بیمار (الزامی و حیاتی)',
      target: 'صفر رساندن حوادث تهدیدکننده حیات، گزارش‌دهی فعال وقایع ناخواسته',
      level: 'حیاتی'
    };
  }
  if (sec === 'infection_control' || /عفونت|بهداشت\s*دست|نیدل|استریل|ایزولاسیون/.test(title)) {
    return {
      code: 'ب-۷-۱',
      title: 'پیشگیری و کنترل عفونت‌های بیمارستانی (IP&C)',
      clause: 'سنجه‌های ۱ تا ۴ کنترل عفونت و نظام مراقبت میکروبی',
      target: 'انطباق بالای ۸۰٪ بهداشت دست و نرخ عفونت بیمارستانی کمتر از ۱.۵٪',
      level: 'حیاتی'
    };
  }
  if (sec === 'surgical_maternity' || /جراحی|سزارین|زایمان|بیهوشی|پاتولوژی|ریکاوری/.test(title)) {
    if (/زایمان|سزارین/.test(title)) {
      return {
        code: 'ب-۵-۱',
        title: 'سلامت مادر و نوزاد و ترویج زایمان طبیعی',
        clause: 'سنجه کاهش سالانه سزارین بار اول و زایمان بدون درد',
        target: 'کاهش نرخ سزارین بار اول و توانمندسازی مادران باردار',
        level: 'توسعه‌ای'
      };
    }
    return {
      code: 'ب-۲-۱',
      title: 'خدمات جراحی ایمن و مراقبت‌های بیهوشی',
      clause: 'سنجه چک‌لیست جراحی ایمن WHO و نظارت بر ریکاوری',
      target: 'تکمیل ۱۰۰٪ چک‌لیست سه مرحله‌ای جراحی ایمن و کنترل عوارض حین عمل',
      level: 'حیاتی'
    };
  }
  if (sec === 'nursing_office' || /پرستار|تخت|ترخیص|اشغال|بستری/.test(title)) {
    return {
      code: 'ب-۳-۱',
      title: 'مدیریت خدمات پرستاری و مراقبت‌های بالینی',
      clause: 'سنجه استاندارد نسبت کادر پرستاری به تخت فعال',
      target: 'پایش فرآیندهای بالینی، استانداردسازی شیفت‌ها و کاهش زمان ترخیص',
      level: 'پایه‌ای'
    };
  }
  if (sec === 'patient_education' || /آموزش\s*بیمار|رضایت/.test(title)) {
    return {
      code: 'الف-۲-۱',
      title: 'حقوق گیرنده خدمت و آموزش سلامت به بیمار',
      clause: 'سنجه آموزش حین بستری و زمان ترخیص و ارزیابی اثربخشی',
      target: 'پوشش بالای ۹۰٪ آموزش چهره به چهره و ارتقای رضایت‌مندی مراجعین',
      level: 'توسعه‌ای'
    };
  }
  if (sec === 'staff_education' || /آموزش\s*کارکنان|توانمندسازی|پودمان/.test(title)) {
    return {
      code: 'الف-۲-۲',
      title: 'آموزش و توانمندسازی مداوم منابع انسانی',
      clause: 'سنجه سرانه آموزش ضمن خدمت و اثربخشی کرک‌پاتریک',
      target: 'تحقق حداقل ۴۰ ساعت آموزش سالانه برای هر پرسنل و پایش مهارت‌ها',
      level: 'توسعه‌ای'
    };
  }
  return {
    code: 'ب-۱-۱',
    title: 'مدیریت خدمات طب اورژانس و پذیرش بیمارستان',
    clause: 'سنجه تعیین تکلیف ۶ ساعته و پایش سطوح تریاژ ESI',
    target: 'تعیین تکلیف بالای ۹۲٪ بیماران زیر ۶ ساعت و ساماندهی تخت‌های حاد',
    level: 'حیاتی'
  };
}

// محاسبه معیارهای آماری ۴‌گانه برای نوار خلاصه اجرایی
function calculateSlideMetrics(slide) {
  const rows = slide.data || [];
  if (!rows.length) return null;

  const monthlyRows = rows.filter(r => {
    const lbl = r[0] || '';
    return !lbl.includes('سه ماهه') && !lbl.includes('شش ماهه') && !lbl.includes('کل');
  });

  const calcTargetRows = monthlyRows.length > 0 ? monthlyRows : rows;

  let total1404 = 0;
  let total1405 = 0;
  let count4 = 0;
  let count5 = 0;
  let peakMonth = '—';
  let peakVal = -Infinity;

  calcTargetRows.forEach(r => {
    const lbl = r[0] || '';
    const v4 = parseFloat(r[1]);
    const v5 = parseFloat(r[2]);
    if (!isNaN(v4)) {
      total1404 += v4;
      count4++;
      if (v4 > peakVal) {
        peakVal = v4;
        peakMonth = lbl;
      }
    }
    if (!isNaN(v5)) {
      total1405 += v5;
      count5++;
    }
  });

  const avg1404 = count4 ? Math.round((total1404 / count4) * 10) / 10 : 0;
  const avg1405 = count5 ? Math.round((total1405 / count5) * 10) / 10 : 0;

  const isRate = (slide.unit && (slide.unit.includes('درصد') || slide.unit.includes('٪'))) ||
                 (avg1404 <= 100 && avg1404 > 0 && (String(slide.title).includes('نرخ') || String(slide.title).includes('درصد')));

  const displayTotal1404 = isRate ? avg1404 : Math.round(total1404 * 10) / 10;
  const displayTotal1405 = isRate ? avg1405 : Math.round(total1405 * 10) / 10;

  let deltaPct = 0;
  if (displayTotal1404 > 0) {
    deltaPct = Math.round(((displayTotal1405 - displayTotal1404) / displayTotal1404) * 1000) / 10;
  }

  return {
    avgMonthly: avg1404,
    peakMonth: peakMonth,
    peakVal: peakVal > -Infinity ? peakVal : 0,
    total1404: displayTotal1404,
    total1405: displayTotal1405,
    deltaPct: deltaPct,
    isRate: isRate
  };
}

// بج رنگی انحراف و تغییرات عملکرد با تشخیص جهت بهینه شاخص
function getDeltaBadge(v1404, v1405, slideTitle) {
  const num4 = parseFloat(v1404);
  const num5 = parseFloat(v1405);
  if (isNaN(num4) || isNaN(num5) || num4 === 0) {
    if (v1405 && v1405 !== '—') {
      return `<span class="diff-badge diff-neutral">ثبت‌شده</span>`;
    }
    return `<span class="diff-badge diff-neutral">—</span>`;
  }

  const diffPct = Math.round(((num5 - num4) / num4) * 1000) / 10;
  if (diffPct === 0) {
    return `<span class="diff-badge diff-stable">۰.۰٪ ＝ بدون انحراف</span>`;
  }

  // در خطاهای بالینی، سقوط، عفونت، زخم بستر و مرگ‌ومیر، کاهش شاخص مطلوب است
  const isAdverse = /خطا|سقوط|عفونت|مرگ|میر|زخم|عارضه|شکایت|تاخیر|طولانی|تلفات/.test(slideTitle || '');

  if (diffPct > 0) {
    const isGood = !isAdverse;
    const cls = isGood ? 'diff-good' : 'diff-warn';
    const arrow = isGood ? '↗ رشد مطلوب' : '⚠️ افزایش نامطلوب';
    return `<span class="diff-badge ${cls}">+${fa(diffPct)}٪ ${arrow}</span>`;
  } else {
    const isGood = isAdverse;
    const cls = isGood ? 'diff-good' : 'diff-warn';
    const arrow = isGood ? '↘ کاهش مطلوب' : '🔻 افت عملکرد';
    return `<span class="diff-badge ${cls}">${fa(diffPct)}٪ ${arrow}</span>`;
  }
}

async function renderIndicatorSlidesView() {
  const c = $('content');
  if (!c) return;

  const pt = $('ptitle');
  if (pt) pt.textContent = 'شاخص‌های بیمارستان (سامانه جامع تحلیلی و پرزنتیشن)';

  c.innerHTML = `
    <div class="islide-wrap" id="islideWrap">
      <div class="islide-loading" style="padding:56px;text-align:center;color:#94a3b8">
        <div class="spin" style="width:44px;height:44px;border:3px solid rgba(56,189,248,.2);border-top-color:#38bdf8;border-radius:50%;margin:0 auto 16px;animation:spin .8s linear infinite"></div>
        در حال واکشی و آماده‌سازی ماتریس جامع ۷۶ شاخص بیمارستان (۱۴۰۴ - ۱۴۰۵)…
      </div>
    </div>
  `;

  try {
    const res = await API.indicatorSlides();
    ISLIDE_STATE.slides = res.slides || [];
    ISLIDE_STATE.sections = res.sections || [];
    ISLIDE_STATE.hospitalName = res.hospital_name || (window.S && S.user && S.user.hospital_name) || 'بیمارستان';
    drawIndicatorSlidesView();
  } catch (err) {
    c.innerHTML = `
      <div class="panel g" style="padding:36px;text-align:center">
        <h3 style="color:#ef4444;margin-bottom:8px">خطا در بارگذاری سامانه شاخص‌ها</h3>
        <p style="color:#94a3b8">${esc(err.message || 'ارتباط با سرور برقرار نشد')}</p>
        <button class="btn btn-g btn-sm" style="margin-top:16px" onclick="renderIndicatorSlidesView()">تلاش مجدد</button>
      </div>
    `;
  }
}

function getFilteredSlides() {
  return ISLIDE_STATE.slides.filter(s => {
    const secMatch = ISLIDE_STATE.activeSection === 'all' || s.section_id === ISLIDE_STATE.activeSection;
    const q = ISLIDE_STATE.searchQuery.trim().toLowerCase();
    const searchMatch = !q || (s.title && s.title.toLowerCase().includes(q)) || (s.slide_text && s.slide_text.toLowerCase().includes(q));
    return secMatch && searchMatch;
  });
}

function drawIndicatorSlidesView() {
  const c = $('content');
  if (!c) return;

  const filtered = getFilteredSlides();
  const totalCount = ISLIDE_STATE.slides.length;
  
  if (ISLIDE_STATE.currentSlideIndex >= filtered.length) {
    ISLIDE_STATE.currentSlideIndex = 0;
  }
  const currentSlide = filtered[ISLIDE_STATE.currentSlideIndex] || filtered[0] || null;

  c.innerHTML = `
    <div class="islide-container" id="islideContainer">
      
      <!-- ۱. کارت‌های کلان ۶‌گانه مدیریتی بیمارستان (Executive KPI Cards Deck) -->
      <div class="islide-kpi-summary-row">
        <div class="islide-kpi-card" style="--kpi-col:#38bdf8;--kpi-glow:rgba(56,189,248,0.25)">
          <div class="kpi-icon">🏥</div>
          <div class="kpi-body">
            <div class="kpi-title">کل پذیرش و مراجعین سالانه</div>
            <div class="kpi-val">۴,۴۷۵ <span class="kpi-unit">بیمار</span></div>
            <div class="kpi-sub">
              <span>شش‌ماهه اول: ۲,۱۷۳ | دوم: ۲,۳۰۲</span>
              <span class="kpi-trend-pill">+۵.۹٪ ↗</span>
            </div>
          </div>
        </div>

        <div class="islide-kpi-card" style="--kpi-col:#f59e0b;--kpi-glow:rgba(245,158,11,0.25)">
          <div class="kpi-icon">🚨</div>
          <div class="kpi-body">
            <div class="kpi-title">مراجعین بخش اورژانس</div>
            <div class="kpi-val">۳,۹۶۴ <span class="kpi-unit">مراجعه</span></div>
            <div class="kpi-sub">
              <span>۸۸.۵٪ مراجعین | تعیین تکلیف زیر ۶ساعت</span>
              <span class="kpi-trend-pill" style="background:rgba(245,158,11,0.18);color:#fbbf24;border-color:rgba(245,158,11,0.35)">۹۴.۲٪</span>
            </div>
          </div>
        </div>

        <div class="islide-kpi-card" style="--kpi-col:#a855f7;--kpi-glow:rgba(168,85,247,0.25)">
          <div class="kpi-icon">🩺</div>
          <div class="kpi-body">
            <div class="kpi-title">اعمال جراحی اتاق عمل</div>
            <div class="kpi-val">۱,۲۹۱ <span class="kpi-unit">عمل جراحی</span></div>
            <div class="kpi-sub">
              <span>عمومی، ارتوپدی، زنان، مغز و زیبایی</span>
              <span class="kpi-trend-pill">+۴.۸٪ ↗</span>
            </div>
          </div>
        </div>

        <div class="islide-kpi-card" style="--kpi-col:#10b981;--kpi-glow:rgba(16,185,129,0.25)">
          <div class="kpi-icon">👶</div>
          <div class="kpi-body">
            <div class="kpi-title">ترویج زایمان طبیعی و ایمن</div>
            <div class="kpi-val">۵۹۹ <span class="kpi-unit">تولد نوزاد</span></div>
            <div class="kpi-sub">
              <span>طبیعی: ۳۳۸ (۵۶.۴٪) | سزارین: ۲۶۱</span>
              <span class="kpi-trend-pill">شاخص ممتاز</span>
            </div>
          </div>
        </div>

        <div class="islide-kpi-card" style="--kpi-col:#ef4444;--kpi-glow:rgba(239,68,68,0.25)">
          <div class="kpi-icon">🛡️</div>
          <div class="kpi-body">
            <div class="kpi-title">شاخص ایمنی بیمار و وقایع</div>
            <div class="kpi-val">۹۶.۴٪ <span class="kpi-unit">انطباق استاندارد</span></div>
            <div class="kpi-sub">
              <span>۶۸ گزارش خطای بدون آسیب | صفر Sentinel</span>
              <span class="kpi-trend-pill" style="background:rgba(239,68,68,0.18);color:#fca5a5;border-color:rgba(239,68,68,0.35)">حیاتی</span>
            </div>
          </div>
        </div>

        <div class="islide-kpi-card" style="--kpi-col:#14b8a6;--kpi-glow:rgba(20,184,166,0.25)">
          <div class="kpi-icon">🧼</div>
          <div class="kpi-body">
            <div class="kpi-title">کنترل عفونت و بهداشت دست</div>
            <div class="kpi-val">۷۸.۵٪ <span class="kpi-unit">بهداشت دست</span></div>
            <div class="kpi-sub">
              <span>عفونت بیمارستانی: ۰.۸۲٪ (مطلوب کشوری)</span>
              <span class="kpi-trend-pill">+۵.۱٪ ↗</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ۲. نوار کنترل و تب‌های ابزاری اصلی سامانه -->
      <div class="islide-topbar panel g">
        <div class="islide-header-info">
          <div class="islide-badge-chip">◈ سامانه جامع پایش، تحلیل و ثبت شاخص‌های ${esc(getHospitalName())}</div>
          <h2 class="islide-page-title">داشبورد تحلیلی و ابزار جامع شاخص‌ها (۱۴۰۴ - ۱۴۰۵)</h2>
          <div class="islide-page-sub">تحلیل خط‌به‌خط، داده‌های ماهانه، نمودارهای مقایسه‌ای و ثبت مقادیر ۷۶ شاخص در ۷ سرفصل کلان</div>
        </div>

        <div class="islide-top-actions">
          <div class="islide-search-box">
            <input type="text" placeholder="جستجو در ۷۶ شاخص…" value="${esc(ISLIDE_STATE.searchQuery)}" oninput="onSlideSearch(this.value)">
            <span class="search-icon-hint">🔍</span>
          </div>

          <!-- کلیدهای سوئیچ ابزار -->
          <div class="btn-group">
            <button class="btn btn-o btn-sm ${ISLIDE_STATE.viewMode === 'slide' ? 'btn-active' : ''}" onclick="setSlideViewMode('slide')" title="پرزنتیشن و اسلایدهای تحلیلی">
              📽️ پرزنتیشن و اسلایدها
            </button>
            <button class="btn btn-o btn-sm ${ISLIDE_STATE.viewMode === 'grid' ? 'btn-active' : ''}" onclick="setSlideViewMode('grid')" title="گالری تمام ۷۶ شاخص">
              ▦ گالری شاخص‌ها (${fa(totalCount)})
            </button>
            <button class="btn btn-o btn-sm ${ISLIDE_STATE.viewMode === 'editor' ? 'btn-active' : ''}" onclick="setSlideViewMode('editor')" title="ابزار ورود و ویرایش داده‌های ماهانه اکسل">
              ✏️ ابزار ورود مقادیر ماهانه
            </button>
            <button class="btn btn-o btn-sm ${ISLIDE_STATE.viewMode === 'national' ? 'btn-active' : ''}" onclick="setSlideViewMode('national')" title="شناسنامه شاخص‌های ملی اعتباربخشی">
              📋 ۶۱ شاخص اعتباربخشی
            </button>
          </div>

          <a href="${API.indicatorSlidesExcelUrl()}" class="btn btn-g btn-sm" download title="دانلود فایل اکسل کامل شاخص‌ها">
            📥 خروجی اکسل
          </a>

          <button class="btn btn-o btn-sm" onclick="printSlidePresentation()" title="چاپ رسمی و گزارش‌گیری">
            🖨️ چاپ
          </button>
        </div>
      </div>

      <!-- ۳. نوار فیلتر سرفصل‌های هفت‌گانه (Horizontal RTL Flow طبق Rule 11) -->
      ${ISLIDE_STATE.viewMode !== 'national' ? `
        <div class="islide-sections-bar">
          <button class="islide-sec-tab ${ISLIDE_STATE.activeSection === 'all' ? 'on' : ''}" onclick="setSlideSection('all')">
            همه سرفصل‌ها <span class="sec-cnt">(${fa(totalCount)})</span>
          </button>
          ${ISLIDE_STATE.sections.map(sec => {
            const theme = ISLIDE_THEMES[sec.id] || { primary: '#38bdf8', icon: '📊' };
            return `
              <button class="islide-sec-tab ${ISLIDE_STATE.activeSection === sec.id ? 'on' : ''}" onclick="setSlideSection('${sec.id}')" style="--theme-col:${theme.primary}">
                ${theme.icon || ''} ${esc(sec.title)} <span class="sec-cnt">(${fa(sec.count)})</span>
              </button>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- ۴. محتوای فعال بر اساس حالت ابزار -->
      ${renderActiveViewMode(currentSlide, filtered)}
    </div>
  `;
}

function renderActiveViewMode(currentSlide, filtered) {
  if (ISLIDE_STATE.viewMode === 'national') {
    return renderNationalIndicatorsTab();
  }
  if (ISLIDE_STATE.viewMode === 'grid') {
    return renderSlideGrid(filtered);
  }
  if (ISLIDE_STATE.viewMode === 'editor') {
    return renderExcelEditor();
  }
  return renderSlidePlayer(currentSlide, filtered);
}

// --------------------------------------------------------------------------
// حالت ۱: پرزنتیشن و اسلاید تحلیلی (Presentation Mode)
// --------------------------------------------------------------------------
function renderSlidePlayer(slide, list) {
  if (!slide) {
    return `<div class="panel g empty" style="padding:48px;text-align:center">شاخصی با فیلترهای انتخابی یافت نشد.</div>`;
  }

  const idx = list.indexOf(slide);
  const total = list.length;
  const theme = ISLIDE_THEMES[slide.section_id] || { primary: '#38bdf8', secondary: '#f59e0b', bg: 'rgba(56,189,248,0.08)', border: '#0284c7' };
  const canEdit = hasPerm('manage_indicators') || hasPerm('manage_indicator_slides') || hasPerm('manage_bsc') || (S.user && ['admin', 'nursing_director', 'hospital_president', 'quality_control_manager'].includes(S.user.role_code));
  const accred = getAccreditationStandardForSlide(slide);
  const metrics = calculateSlideMetrics(slide);

  // اگر اسلاید ۱ (کاور بیمارستان) باشد، کاور لوکس نشان می‌دهیم
  if (slide.slide_number === 1) {
    return renderSlide1Cover(slide, theme, list);
  }

  return `
    <div class="islide-player-card panel g" style="--card-border:${theme.border};--card-glow:${theme.primary}">
      <!-- نوار ناوبری بالای اسلاید -->
      <div class="islide-nav-header">
        <div class="islide-meta-tags">
          <span class="islide-sec-tag" style="background:${theme.bg};color:${theme.primary};border:1px solid ${theme.border}">
            ${theme.icon || '📌'} ${esc(slide.section_title)}
          </span>
          <span class="islide-num-tag">اسلاید ${fa(slide.slide_number)} از ۷۶ (شاخص ${fa(idx + 1)} از ${fa(total)})</span>
          ${slide.unit ? `<span class="islide-unit-tag">واحد سنجش: ${esc(slide.unit)}</span>` : ''}
          ${accred ? `
            <span class="islide-accred-badge" title="${esc(accred.title)}">
              🏅 سنجه ملی: <strong>${esc(accred.code)}</strong> (${esc(accred.level)})
            </span>
          ` : ''}
        </div>

        <div class="islide-nav-controls">
          <button class="btn btn-o btn-sm" onclick="navPrevSlide()" ${idx === 0 ? 'disabled' : ''} title="اسلاید قبلی">
            ‹ قبلی
          </button>
          
          <div class="islide-progress-pill">
            <input type="range" min="0" max="${total - 1}" value="${idx}" oninput="jumpToSlide(this.value)">
          </div>

          <button class="btn btn-o btn-sm" onclick="navNextSlide()" ${idx === total - 1 ? 'disabled' : ''} title="اسلاید بعدی">
            بعدی ›
          </button>

          <button class="btn btn-o btn-sm islide-play-btn ${ISLIDE_STATE.isPlaying ? 'on' : ''}" onclick="toggleSlidePlay()" title="${ISLIDE_STATE.isPlaying ? 'توقف پخش' : 'پخش خودکار'}">
            ${ISLIDE_STATE.isPlaying ? '⏸ توقف' : '▶ پخش خودکار'}
          </button>

          <button class="btn btn-o btn-sm" onclick="toggleFullscreenPresentation()" title="حالت تمام صفحه">
            ⛶ تمام‌صفحه
          </button>

          ${canEdit ? `
            <button class="btn btn-g btn-sm" onclick="openDirectEditorForSlide(${slide.slide_number})" title="ورود و اصلاح داده‌های این شاخص">
              ✏️ ورود/ویرایش مقادیر
            </button>
          ` : ''}
        </div>
      </div>

      <!-- صفحه نمایش اصلی اسلاید (Screen) -->
      <div class="islide-screen" id="islideScreen">
        
        <!-- عنوان شاخص -->
        <div class="islide-title-box">
          <div class="islide-title-badge">شاخص شماره ${fa(slide.slide_number)}</div>
          <h3 class="islide-main-title" style="color:${theme.primary}">
            ${esc(cleanSlideTitle(slide.title))}
          </h3>
          ${slide.slide_text && slide.slide_text !== slide.title ? `
            <div class="islide-text-banner">${esc(cleanSlideTitle(slide.slide_text))}</div>
          ` : ''}
        </div>

        <!-- نوار ۴ متری خلاصه عملکرد اجرایی این شاخص -->
        ${metrics ? `
          <div class="islide-exec-strip">
            <div class="islide-metric-pill" style="--m-color:#38bdf8">
              <span class="m-label">میانگین عملکرد ماهانه</span>
              <span class="m-value">
                ${fa(metrics.avgMonthly)}
                <span class="sub">${esc(slide.unit || '')}</span>
              </span>
              <span class="m-detail">عملکرد پایه ۱۴۰۴ بر اساس دوره‌های ماهانه</span>
            </div>

            <div class="islide-metric-pill" style="--m-color:#f59e0b">
              <span class="m-label">بیشترین مقدار ثبت‌شده (پیک)</span>
              <span class="m-value">
                ${fa(metrics.peakVal)}
                <span class="sub">(${esc(metrics.peakMonth)})</span>
              </span>
              <span class="m-detail">ماه اوج فعالیت و بار مراجعات بیمارستان</span>
            </div>

            <div class="islide-metric-pill" style="--m-color:#10b981">
              <span class="m-label">${metrics.isRate ? 'هدف میانگین سال ۱۴۰۵' : 'مجموع هدف‌گذاری سال ۱۴۰۵'}</span>
              <span class="m-value">
                ${fa(metrics.total1405)}
                <span class="sub">${esc(slide.unit || '')}</span>
              </span>
              <span class="m-detail">پایه ۱۴۰۴: ${fa(metrics.total1404)} ${esc(slide.unit || '')}</span>
            </div>

            <div class="islide-metric-pill" style="--m-color:${metrics.deltaPct >= 0 ? '#34d399' : '#f87171'}">
              <span class="m-label">نرخ رشد / تغییر هدف (Δ٪)</span>
              <span class="m-value">
                ${metrics.deltaPct >= 0 ? '+' + fa(metrics.deltaPct) + '٪' : fa(metrics.deltaPct) + '٪'}
                <span class="sub">${metrics.deltaPct >= 0 ? '↗ رشد' : '↘ کاهش'}</span>
              </span>
              <span class="m-detail">محاسبه انحراف هدف ۱۴۰۵ نسبت به مرجع ۱۴۰۴</span>
            </div>
          </div>
        ` : ''}

        <!-- نمودار برداری SVG تمام رنگی و شارپ -->
        <div class="islide-chart-viewport">
          ${renderSvgChart(slide, theme)}
        </div>

        <!-- ۴ کارت تحلیلی، اصلاحی، افق استراتژیک و اعتباربخشی (Horizontal RTL Flow) -->
        <div class="islide-insights-row">
          <div class="islide-insight-card analysis">
            <div class="ins-title">💡 تحلیل بالینی و مدیریتی شاخص</div>
            <div class="ins-body">
              ${slide.analysis_note ? esc(cleanSlideTitle(slide.analysis_note)) : `بررسی روندهای عددی سال ۱۴۰۴ نشان‌دهنده انضباط عملکردی در بخش مربوطه است. پایش مستمر این شاخص در کمیته پایش کیفیت و اعتباربخشی مطرح و گلوگاه‌های اجرایی بررسی می‌گردد.`}
            </div>
          </div>

          <div class="islide-insight-card corrective">
            <div class="ins-title">⚡ اقدامات اصلاحی و پایش مصوب</div>
            <div class="ins-body">
              ${slide.corrective_actions ? esc(slide.corrective_actions) : getDefaultCorrectiveAction(slide)}
            </div>
          </div>

          <div class="islide-insight-card strategic">
            <div class="ins-title">🎯 افق استراتژیک و هدف‌گذاری ۱۴۰۵</div>
            <div class="ins-body">
              هدف‌گذاری سال ۱۴۰۵ با رویکرد ارتقای بهره‌وری و بهبود بالینی تدوین شده و ماتریس فصلی آن جهت تحقق ۱۰۰ درصدی در کارتابل مسئولین بخش‌ها قرار گرفته است.
            </div>
          </div>

          ${accred ? `
            <div class="islide-insight-card accreditation">
              <div class="ins-title">🏅 سنجه اعتباربخشی ملی (${esc(accred.code)})</div>
              <div class="ins-body">
                <strong>${esc(accred.title)}</strong><br>
                <span>${esc(accred.clause)} — الزامات: ${esc(accred.target)}</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- جدول داده‌های عددی ماهانه و فصلی خط‌به‌خط -->
        <div class="islide-table-section">
          <div class="islide-table-hd">
            <span class="hd-title">📋 جدول داده‌های عددی و مقایسه عملکرد سال‌های ۱۴۰۴ و ۱۴۰۵</span>
            <div class="hd-actions">
              <span class="sub-txt" style="color:#94b2a5;font-size:12.5px;margin-left:12px">واحد سنجش: <strong>${esc(slide.unit || 'عدد')}</strong></span>
              ${canEdit ? `<button class="btn btn-o btn-sm" onclick="openDirectEditorForSlide(${slide.slide_number})">✏️ ویرایش مقادیر جدول</button>` : ''}
            </div>
          </div>
          <div class="islide-table-wrap">
            ${renderSlideDataTable(slide)}
          </div>
        </div>

      </div>
    </div>
  `;
}

// تولید اقدامات اصلاحی بالینی متناسب در صورت خالی بودن
function getDefaultCorrectiveAction(slide) {
  const sec = slide.section_id || '';
  if (sec === 'patient_safety') {
    return '۱. ثبت به‌موقع وقایع در سامانه ۲. برگزاری تحلیل ریشه‌ای (RCA) خطاهای با شدت بالا ۳. برگزاری راندهای ماهانه ایمنی بیمار و آموزش سرپرستاران';
  }
  if (sec === 'infection_control') {
    return '۱. پایش گام‌های پنج‌گانه بهداشت دست طبق استاندارد WHO ۲. نظارت مداوم بر ایزولاسیون و ضدعفونی سطوح ۳. غربالگری میکروبی بخش‌های پرخطر';
  }
  if (sec === 'surgical_maternity') {
    return '۱. ممیزی مستمر چک‌لیست جراحی ایمن ۲. کلاس‌های آمادگی برای زایمان طبیعی فیزیولوژیک ۳. بهینه‌سازی زمان انتقال بیمار از ریکاوری به بخش';
  }
  if (sec === 'nursing_office') {
    return '۱. پایش استاندارد نسبت کادر پرستاری به تخت ۲. بهینه‌سازی فرآیند ترخیص بالینی ۳. ارزیابی مهارت‌های بالینی در تحویل شیفت';
  }
  if (sec === 'patient_education') {
    return '۱. ارائه پمفلت‌ها و آموزش‌های چندرسانه‌ای حین بستری ۲. پیگیری تلفنی بیماران پس از ترخیص ۳. سنجش اثربخشی آموزش‌های ارائه‌شده';
  }
  if (sec === 'staff_education') {
    return '۱. برگزاری کارگاه‌های عملی مبتنی بر شبیه‌سازی ۲. سنجش اثربخشی دوره‌ها بر اساس الگوی کرک‌پاتریک ۳. جبران ساعات آموزشی کادر درمان';
  }
  return '۱. پایش منظم زمان تریاژ و تعیین تکلیف ۲. تسهیل پذیرش بستری و ترخیص ۳. گزارش‌دهی دوره‌ای به ریاست و تیم رهبری بیمارستان';
}

// رندر کاور شکیل اسلاید ۱ (بیمارستان در یک نگاه)
function renderSlide1Cover(slide, theme, list) {
  return `
    <div class="islide-player-card panel g" style="--card-border:${theme.border};--card-glow:${theme.primary}">
      <div class="islide-cover-hero">
        <div class="cover-badge">◈ گزارش جامع و تحلیلی شاخص‌های ${esc(getHospitalName())}</div>
        <h1 class="cover-title">${esc(getHospitalName())} در یک نگاه</h1>
        <h2 class="cover-years">ارزیابی، مقایسه و تحلیل عملکرد سال‌های ۱۴۰۴ - ۱۴۰۵</h2>
        <p class="cover-desc">
          سامانه پایش هوشمند ۷۶ شاخص عملکردی، بالینی، ایمنی و اعتباربخشی در ۷ حوزه کلان بیمارستانی به همراه ماتریس داده‌های ۱۲ ماهه، فصلی و اقدامات اصلاحی مصوب.
        </p>

        <div class="cover-sections-grid">
          ${ISLIDE_STATE.sections.map(sec => {
            const th = ISLIDE_THEMES[sec.id] || { primary: '#38bdf8', icon: '📊' };
            return `
              <div class="cover-sec-item" onclick="jumpToSection('${sec.id}')" style="--c-col:${th.primary}">
                <div class="cs-icon">${th.icon || '📌'}</div>
                <div class="cs-title">${esc(sec.title)}</div>
                <div class="cs-count">${fa(sec.count)} شاخص</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="islide-chart-viewport" style="margin-top:24px;border-radius:18px;background:rgba(15,23,42,0.7);padding:20px;border:1px solid rgba(56,189,248,0.25)">
          <div style="font-weight:800;color:#38bdf8;margin-bottom:14px;display:flex;align-items:center;gap:8px;font-size:15px">
            📊 نمودار مقایسه‌ای شاخص‌های کلان عملکردی بیمارستان سال‌های ۱۴۰۴ و ۱۴۰۵
          </div>
          ${renderSvgChart(slide, theme)}
        </div>

        <div class="islide-table-section" style="margin-top:22px">
          <div class="islide-table-hd">
            <span class="hd-title">📋 ماتریس مقایسه‌ای شاخص‌های کلان بیمارستان</span>
            <span class="sub-txt" style="color:#94b2a5">عملکرد پایه ۱۴۰۴ و اهداف استراتژیک ۱۴۰۵</span>
          </div>
          <div class="islide-table-wrap">
            ${renderSlideDataTable(slide)}
          </div>
        </div>

        <div class="cover-action-bar" style="margin-top:26px">
          <button class="btn btn-g btn-lg" onclick="navNextSlide()">
            ورود و مشاهده شاخص‌های کلان بیمارستان (اسلاید ۲) ‹
          </button>
          <button class="btn btn-o btn-lg" onclick="setSlideViewMode('grid')">
            نمایش گالری همه ۷۶ شاخص ▦
          </button>
          <button class="btn btn-o btn-lg" onclick="setSlideViewMode('editor')">
            ابزار ورود و ویرایش مقادیر ماهانه ✏️
          </button>
        </div>
      </div>
    </div>
  `;
}

// رندر نمودار SVG برداری پیشرفته با فیلتر دوره‌ها و خط مبنای هدف
function renderSvgChart(slide, theme) {
  const allRows = slide.data || [];
  if (!allRows || !allRows.length) {
    return `
      <div class="islide-chart-empty">
        <div style="font-size:36px;margin-bottom:8px">📄</div>
        <div style="font-size:15px;font-weight:700;color:#94a3b8">اسلاید عنوان و بدون نمودار عددی مستقیم</div>
        <div style="font-size:13px;color:#64748b;margin-top:6px">${esc(slide.slide_text || slide.title)}</div>
      </div>
    `;
  }

  // اعمال فیلتر دوره‌ها (همه، فقط فصول، ۱۲ ماهه)
  let rows = allRows;
  const filter = ISLIDE_STATE.chartFilter || 'all';

  if (filter === 'quarters') {
    const qRows = allRows.filter(r => (r[0] || '').includes('سه ماهه') || (r[0] || '').includes('شش ماهه') || (r[0] || '').includes('کل'));
    if (qRows.length > 0) rows = qRows;
  } else if (filter === 'months') {
    const mRows = allRows.filter(r => !(r[0] || '').includes('سه ماهه') && !(r[0] || '').includes('شش ماهه') && !(r[0] || '').includes('کل'));
    if (mRows.length > 0) rows = mRows;
  }

  // استخراج محورها و مقادیر
  const categories = [];
  const vals1404 = [];
  const vals1405 = [];

  rows.forEach(r => {
    const label = r[0] || '';
    if (!label.trim()) return;
    categories.push(label);
    vals1404.push(r[1] !== null && r[1] !== undefined && r[1] !== '' ? parseFloat(r[1]) : 0);
    vals1405.push(r[2] !== null && r[2] !== undefined && r[2] !== '' ? parseFloat(r[2]) : null);
  });

  if (!categories.length) {
    return `<div class="islide-chart-empty">داده‌ای برای ترسیم نمودار یافت نشد.</div>`;
  }

  const has1405 = vals1405.some(v => v !== null && v > 0);

  // محاسبه ابعاد SVG
  const W = 900;
  const H = 340;
  const padLeft = 65;
  const padRight = 35;
  const padTop = 35;
  const padBottom = 65;

  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const maxVal = Math.max(
    ...vals1404,
    ...vals1405.filter(v => v !== null),
    1
  ) * 1.15;

  const barCount = categories.length;
  const groupW = chartW / barCount;
  const barW = Math.min(groupW * (has1405 ? 0.38 : 0.55), 32);

  // خطوط راهنمای افقی
  const gridLines = [];
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxVal / gridSteps) * i;
    const y = padTop + chartH - (val / maxVal) * chartH;
    gridLines.push(`
      <line x1="${padLeft}" y1="${y}" x2="${W - padRight}" y2="${y}" stroke="rgba(148,163,184,0.14)" stroke-dasharray="3,3" />
      <text x="${padLeft - 10}" y="${y + 4}" fill="#64748b" font-size="11" text-anchor="end">${fa(Math.round(val * 10) / 10)}</text>
    `);
  }

  // محاسبه خط مبنای هدف سال ۱۴۰۵
  let targetLineSvg = '';
  const valid1405Vals = vals1405.filter(v => v !== null && v > 0);
  if (valid1405Vals.length > 0) {
    const avgTarget = valid1405Vals.reduce((a, b) => a + b, 0) / valid1405Vals.length;
    const yTarget = padTop + chartH - (avgTarget / maxVal) * chartH;
    if (yTarget >= padTop && yTarget <= padTop + chartH) {
      targetLineSvg = `
        <line x1="${padLeft}" y1="${yTarget}" x2="${W - padRight}" y2="${yTarget}" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="6,4" class="chart-target-line" opacity="0.85" />
        <text x="${W - padRight - 6}" y="${yTarget - 6}" fill="#f59e0b" font-size="10.5" font-weight="800" text-anchor="end">خط میانگین هدف ۱۴۰۵ (${fa(Math.round(avgTarget * 10) / 10)})</text>
      `;
    }
  }

  // ترسیم ستون‌های مقایسه‌ای
  const barsSvg = categories.map((cat, i) => {
    const v1404 = vals1404[i] || 0;
    const v1405 = vals1405[i];

    const h1404 = (v1404 / maxVal) * chartH;
    const y1404 = padTop + chartH - h1404;

    const groupX = padLeft + i * groupW + groupW / 2;

    let barsBlock = '';

    const isQuarter = cat.includes('سه ماهه') || cat.includes('شش ماهه');
    const isYear = cat.includes('کل') || cat.includes('سالانه');

    const fill1404 = isYear ? 'url(#gradY1404)' : isQuarter ? 'url(#gradQ1404)' : 'url(#grad1404)';
    const fill1405 = isYear ? 'url(#gradY1405)' : isQuarter ? 'url(#gradQ1405)' : 'url(#grad1405)';

    const textCol1404 = isYear ? '#c084fc' : isQuarter ? '#34d399' : '#38bdf8';
    const textCol1405 = isYear ? '#a855f7' : isQuarter ? '#10b981' : '#f59e0b';

    if (has1405 && v1405 !== null) {
      const h1405 = (v1405 / maxVal) * chartH;
      const y1405 = padTop + chartH - h1405;

      const x1 = groupX - barW - 2;
      const x2 = groupX + 2;

      barsBlock = `
        <!-- 1404 Bar -->
        <rect x="${x1}" y="${y1404}" width="${barW}" height="${Math.max(h1404, 2)}" rx="4" fill="${fill1404}" filter="url(#glassGlow)" opacity="0.85" class="chart-bar">
          <title>${esc(cat)} - ۱۴۰۴: ${v1404}</title>
        </rect>
        ${v1404 > 0 ? `<text x="${x1 + barW / 2}" y="${y1404 - 6}" fill="${textCol1404}" font-size="10" font-weight="700" text-anchor="middle">${fa(v1404)}</text>` : ''}

        <!-- 1405 Bar -->
        <rect x="${x2}" y="${y1405}" width="${barW}" height="${Math.max(h1405, 2)}" rx="4" fill="${fill1405}" filter="url(#glassGlow)" opacity="0.85" class="chart-bar">
          <title>${esc(cat)} - هدف ۱۴۰۵: ${v1405}</title>
        </rect>
        ${v1405 > 0 ? `<text x="${x2 + barW / 2}" y="${y1405 - 6}" fill="${textCol1405}" font-size="10" font-weight="700" text-anchor="middle">${fa(v1405)}</text>` : ''}
      `;
    } else {
      const x = groupX - barW / 2;
      barsBlock = `
        <rect x="${x}" y="${y1404}" width="${barW}" height="${Math.max(h1404, 2)}" rx="4" fill="${fill1404}" filter="url(#glassGlow)" opacity="0.85" class="chart-bar">
          <title>${esc(cat)}: ${v1404}</title>
        </rect>
        ${v1404 > 0 ? `<text x="${x + barW / 2}" y="${y1404 - 6}" fill="${textCol1404}" font-size="10" font-weight="700" text-anchor="middle">${fa(v1404)}</text>` : ''}
      `;
    }

    const isSpecialPeriod = cat.includes('سه ماهه') || cat.includes('شش ماهه') || cat.includes('کل');
    const labelCol = isSpecialPeriod ? '#38bdf8' : '#94a3b8';
    const labelWeight = isSpecialPeriod ? '800' : '500';

    const lblY = H - padBottom + 20;
    const catLabel = `
      <text x="${groupX}" y="${lblY}" fill="${labelCol}" font-size="11" font-weight="${labelWeight}" text-anchor="middle" transform="${barCount > 8 ? `rotate(25, ${groupX}, ${lblY})` : ''}">
        ${esc(cat)}
      </text>
    `;

    return `<g class="chart-group">${barsBlock}${catLabel}</g>`;
  }).join('');

  return `
    <div class="islide-svg-wrap">
      <div class="islide-chart-controls-bar">
        <div class="islide-legend-bar">
          <div class="leg-item"><span class="leg-dot" style="background:#38bdf8"></span> عملکرد سال ۱۴۰۴ (پایه)</div>
          ${has1405 ? `<div class="leg-item"><span class="leg-dot" style="background:#f59e0b"></span> هدف / عملکرد سال ۱۴۰۵</div>` : ''}
          <div class="leg-item"><span class="sub-pill" style="background:rgba(212,175,90,0.15);color:#fce7b0;padding:2px 8px;border-radius:6px;font-size:11.5px">واحد: ${esc(slide.unit || 'تعداد')}</span></div>
        </div>

        <div class="islide-chart-filter-pills">
          <button class="islide-chart-filter-btn ${filter === 'all' ? 'active' : ''}" onclick="setChartPeriodFilter('all')">
            همه دوره‌ها (${fa(allRows.length)})
          </button>
          <button class="islide-chart-filter-btn ${filter === 'quarters' ? 'active' : ''}" onclick="setChartPeriodFilter('quarters')">
            فقط فصول و تجمیعی
          </button>
          <button class="islide-chart-filter-btn ${filter === 'months' ? 'active' : ''}" onclick="setChartPeriodFilter('months')">
            ۱۲ ماهه پیوسته
          </button>
        </div>
      </div>

      <svg viewBox="0 0 ${W} ${H}" class="islide-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grad1404" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="1" />
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.85" />
          </linearGradient>
          <linearGradient id="grad1405" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fbbf24" stop-opacity="1" />
            <stop offset="100%" stop-color="#d97706" stop-opacity="0.85" />
          </linearGradient>
          
          <linearGradient id="gradQ1404" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#34d399" stop-opacity="1" />
            <stop offset="100%" stop-color="#059669" stop-opacity="0.85" />
          </linearGradient>
          <linearGradient id="gradQ1405" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="1" />
            <stop offset="100%" stop-color="#047857" stop-opacity="0.85" />
          </linearGradient>
          
          <linearGradient id="gradY1404" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#c084fc" stop-opacity="1" />
            <stop offset="100%" stop-color="#7e22ce" stop-opacity="0.85" />
          </linearGradient>
          <linearGradient id="gradY1405" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a855f7" stop-opacity="1" />
            <stop offset="100%" stop-color="#6b21a8" stop-opacity="0.85" />
          </linearGradient>

          <filter id="glassGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
            <feFlood flood-color="white" flood-opacity="0.3" />
            <feComposite in2="shadowDiff" operator="in" />
            <feComposite in2="SourceGraphic" operator="over" />
          </filter>
        </defs>

        <!-- خطوط راهنما -->
        ${gridLines.join('')}

        <!-- خط مبنای افقی -->
        <line x1="${padLeft}" y1="${padTop + chartH}" x2="${W - padRight}" y2="${padTop + chartH}" stroke="rgba(148,163,184,0.3)" stroke-width="1.5" />

        <!-- خط مبنای هدف سال ۱۴۰۵ -->
        ${targetLineSvg}

        <!-- میله‌ها و برچسب‌های متنی -->
        ${barsSvg}
      </svg>
    </div>
  `;
}

function setChartPeriodFilter(filter) {
  ISLIDE_STATE.chartFilter = filter;
  drawIndicatorSlidesView();
}

// رندر جدول داده‌های ماهانه خط‌به‌خط
function renderSlideDataTable(slide) {
  const rows = slide.data || [];
  if (!rows || !rows.length) {
    return `<div class="empty" style="padding:16px;text-align:center">جدول داده‌ای برای این اسلاید ثبت نشده است.</div>`;
  }

  const tableRowsHtml = rows.map((r, i) => {
    const period = r[0] || '';
    const v1404 = r[1] !== null && r[1] !== undefined && r[1] !== '' ? r[1] : '—';
    const v1405 = r[2] !== null && r[2] !== undefined && r[2] !== '' ? r[2] : '—';

    const diffBadge = getDeltaBadge(v1404, v1405, slide.title);
    const isQuarter = period.includes('سه ماهه') || period.includes('شش ماهه');
    const isAnnual = period.includes('کل') || period.includes('سالانه');

    let rowClass = '';
    if (isAnnual) rowClass = 'tr-annual';
    else if (isQuarter) rowClass = 'tr-summary';

    return `
      <tr class="${rowClass}">
        <td class="td-period">
          ${isAnnual ? '🌟 ' : isQuarter ? '📊 ' : ''}
          ${esc(period)}
        </td>
        <td class="td-val val-1404">${v1404 !== '—' ? fa(v1404) : '—'}</td>
        <td class="td-val val-1405">${v1405 !== '—' ? fa(v1405) : '<span style="color:#64748b;font-size:12px">ثبت نشده</span>'}</td>
        <td class="td-diff">${diffBadge}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="islide-table">
      <thead>
        <tr>
          <th>دوره زمانی / ماه</th>
          <th class="th-1404">عملکرد سال ۱۴۰۴ (مرجع پایه)</th>
          <th class="th-1405">هدف / عملکرد سال ۱۴۰۵</th>
          <th class="th-diff">تغییرات و انحراف عملکرد (Δ٪)</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `;
}

// --------------------------------------------------------------------------
// حالت ۲: گالری تمام ۷۶ شاخص (Grid Mode)
// --------------------------------------------------------------------------
function renderSlideGrid(list) {
  if (!list.length) {
    return `<div class="panel g empty" style="padding:48px;text-align:center">شاخصی با این فیلترها یافت نشد.</div>`;
  }

  const cardsHtml = list.map(s => {
    const theme = ISLIDE_THEMES[s.section_id] || { primary: '#38bdf8', icon: '📊', border: '#0284c7', bg: 'rgba(56,189,248,0.1)' };
    const rows = s.data || [];
    
    // خلاصه عملکرد ۱۴۰۴ و ۱۴۰۵
    let sum1404 = '—';
    let sum1405 = '—';
    const sumRow = rows.find(r => (r[0]||'').includes('کل') || (r[0]||'').includes('شش ماهه اول'));
    if (sumRow) {
      if (sumRow[1]) sum1404 = fa(sumRow[1]);
      if (sumRow[2]) sum1405 = fa(sumRow[2]);
    } else if (rows.length) {
      sum1404 = `${fa(rows.length)} دوره`;
    }

    const diffBadge = getDeltaBadge(sumRow ? sumRow[1] : null, sumRow ? sumRow[2] : null, s.title);

    return `
      <div class="islide-grid-card panel g" onclick="jumpToSlideByNumber(${s.slide_number})" style="--card-border:${theme.border}">
        <div class="card-head">
          <span class="card-sec-badge" style="background:${theme.bg};color:${theme.primary}">${theme.icon || ''} ${esc(s.section_title)}</span>
          <span class="card-num-badge">#${fa(s.slide_number)}</span>
        </div>
        <h4 class="card-title">${esc(cleanSlideTitle(s.title))}</h4>
        ${s.slide_text && s.slide_text !== s.title ? `<div class="card-sub">${esc(cleanSlideTitle(s.slide_text.slice(0, 80)))}…</div>` : ''}
        
        <div class="card-metrics-row">
          <div class="cm-item">
            <span class="cm-lbl">عملکرد ۱۴۰۴:</span>
            <span class="cm-val" style="color:#38bdf8">${sum1404}</span>
          </div>
          <div class="cm-item">
            <span class="cm-lbl">هدف ۱۴۰۵:</span>
            <span class="cm-val" style="color:#f59e0b">${sum1405}</span>
          </div>
          <div class="cm-item">
            ${diffBadge}
          </div>
        </div>

        <div class="card-footer">
          <div class="card-stat">
            <span class="lbl" style="font-size:11px;color:#94a3b8">واحد:</span>
            <span class="val" style="font-size:12px;font-weight:700;color:#e2e8f0">${esc(s.unit || 'تعداد')}</span>
          </div>
          <button class="btn btn-o btn-sm" onclick="event.stopPropagation();jumpToSlideByNumber(${s.slide_number})">
            مشاهده اسلاید ‹
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="islide-grid-container">
      <div class="islide-grid-hd" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span style="font-size:16px;font-weight:800;color:#ffffff">گالری تمام شاخص‌ها (${fa(list.length)} مورد فعال)</span>
        <button class="btn btn-o btn-sm" onclick="setSlideViewMode('slide')">بازگشت به پرزنتیشن 📽️</button>
      </div>
      <div class="islide-cards-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// حالت ۳: ابزار ورود داده و ویرایش مقادیر ماهانه اکسل (Excel Grid Editor)
// --------------------------------------------------------------------------
function renderExcelEditor() {
  const currentSlideNum = ISLIDE_STATE.selectedEditorSlide || 2;
  const slide = ISLIDE_STATE.slides.find(s => s.slide_number === currentSlideNum) || ISLIDE_STATE.slides[1] || ISLIDE_STATE.slides[0];
  if (!slide) return '<div class="panel g">اسلایدی یافت نشد.</div>';

  const theme = ISLIDE_THEMES[slide.section_id] || { primary: '#38bdf8', icon: '📊' };
  const rows = slide.data || [];

  return `
    <div class="islide-editor-container panel g">
      <div class="editor-top-bar">
        <div class="editor-select-box">
          <label style="font-weight:700;color:#cbd5e1">انتخاب شاخص جهت ورود یا اصلاح داده‌های ماهانه:</label>
          <select class="form-ctrl" onchange="onEditorSlideSelect(this.value)">
            ${ISLIDE_STATE.slides.filter(s => s.slide_number > 1 && s.slide_number <= 76).map(s => `
              <option value="${s.slide_number}" ${s.slide_number === slide.slide_number ? 'selected' : ''}>
                اسلاید ${s.slide_number}: ${cleanSlideTitle(s.title)}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="editor-quick-info">
          <span class="badge" style="background:${theme.bg};color:${theme.primary};padding:6px 12px;border-radius:10px">${esc(slide.section_title)}</span>
          <span class="unit-tag" style="background:rgba(212,175,90,0.15);color:#fce7b0;padding:6px 12px;border-radius:10px;font-weight:700">واحد: ${esc(slide.unit || 'تعداد')}</span>
        </div>
      </div>

      <div class="editor-sheet-box">
        <div class="sheet-title-row" style="margin-bottom:14px">
          <h3 style="font-size:18px;font-weight:800;color:#38bdf8;margin:0 0 4px 0">${esc(cleanSlideTitle(slide.title))}</h3>
          <p style="color:#94a3b8;font-size:13px;margin:0">مقادیر سال ۱۴۰۴ به عنوان مرجع پایه قفل شده است. مقادیر هدف یا عملکرد ۱۴۰۵ را وارد نموده یا از ابزارهای هوشمند زیر استفاده کنید:</p>
        </div>

        <!-- ابزارهای هوشمند ورود سریع داده‌ها -->
        <div class="editor-quick-helpers">
          <span style="font-size:12px;font-weight:800;color:#d4af5a;margin-left:8px">⚡ ابزارهای سریع محاسباتی:</span>
          <button type="button" class="editor-helper-btn" onclick="autoCalculateEditorQuarters()">
            ⚡ محاسبه خودکار مجموع فصول (Q1 تا Q4 و کل)
          </button>
          <button type="button" class="editor-helper-btn" onclick="applyEditorPreset(1.05)" style="background:rgba(56,189,248,0.15);border-color:rgba(56,189,248,0.4);color:#7dd3fc">
            📈 اعمال افزایش ۵٪ هدف نسبت به ۱۴۰۴
          </button>
          <button type="button" class="editor-helper-btn" onclick="applyEditorPreset(0.90)" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.4);color:#fcd34d">
            📉 اعمال کاهش ۱۰٪ نسبت به ۱۴۰۴ (کاهش خطاها)
          </button>
          <button type="button" class="editor-helper-btn" onclick="resetEditorForm()" style="background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.4);color:#fca5a5">
            🔄 بازنشانی فرم
          </button>
        </div>

        <form id="slideDataEntryForm" onsubmit="saveSlideDataEntry(event, ${slide.slide_number})">
          <table class="islide-table islide-editor-table">
            <thead>
              <tr>
                <th style="width:25%">دوره / ماه</th>
                <th style="width:25%">عملکرد سال ۱۴۰۴ (مرجع پایه)</th>
                <th style="width:30%">عملکرد / هدف سال ۱۴۰۵ (ورود داده)</th>
                <th style="width:20%">محاسبه خودکار انحراف (Δ٪)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, idx) => {
                const label = r[0] || '';
                const v1404 = r[1] !== null && r[1] !== undefined ? r[1] : '';
                const v1405 = r[2] !== null && r[2] !== undefined ? r[2] : '';
                const isSum = label.includes('سه ماهه') || label.includes('شش ماهه') || label.includes('کل');

                return `
                  <tr class="${isSum ? 'tr-summary' : ''}">
                    <td>
                      <input type="hidden" name="period_${idx}" value="${esc(label)}">
                      <strong>${isSum ? '📊 ' : ''}${esc(label)}</strong>
                    </td>
                    <td>
                      <input type="number" step="any" class="form-ctrl input-readonly" name="val1404_${idx}" id="val1404_${idx}" value="${v1404}" readonly title="مقدار ثبت‌شده ۱۴۰۴">
                    </td>
                    <td>
                      <input type="number" step="any" class="form-ctrl input-editable" name="val1405_${idx}" id="val1405_${idx}" value="${v1405}" placeholder="مقدار ۱۴۰۵…" oninput="onEditorInputChanged(${idx})" ${isSum ? 'style="border-color:#10b981;font-weight:900"' : ''}>
                    </td>
                    <td class="td-calc" id="calcDiff_${idx}">
                      ${getDeltaBadge(v1404, v1405, slide.title)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="editor-actions-row" style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end">
            <button type="submit" class="btn btn-g btn-lg">
              💾 ذخیره تغییرات مقادیر شاخص در پایگاه‌داده
            </button>
            <button type="button" class="btn btn-o btn-lg" onclick="setSlideViewMode('slide')">
              انصراف و بازگشت به پرزنتیشن
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// به‌روزرسانی زنده تغییرات انحراف حین تایپ کاربر
function onEditorInputChanged(idx) {
  const v4Input = document.getElementById(`val1404_${idx}`);
  const v5Input = document.getElementById(`val1405_${idx}`);
  const calcEl = document.getElementById(`calcDiff_${idx}`);
  if (!v4Input || !v5Input || !calcEl) return;

  const currentSlideNum = ISLIDE_STATE.selectedEditorSlide || 2;
  const slide = ISLIDE_STATE.slides.find(s => s.slide_number === currentSlideNum);
  const title = slide ? slide.title : '';

  calcEl.innerHTML = getDeltaBadge(v4Input.value, v5Input.value, title);
}

// محاسبه خودکار فصول در فرم اکسل
function autoCalculateEditorQuarters() {
  const form = document.getElementById('slideDataEntryForm');
  if (!form) return;

  const currentSlideNum = ISLIDE_STATE.selectedEditorSlide || 2;
  const slide = ISLIDE_STATE.slides.find(s => s.slide_number === currentSlideNum);
  if (!slide || !slide.data) return;

  const rows = slide.data;
  let q1Sum = 0, q2Sum = 0, q3Sum = 0, q4Sum = 0;
  let hasQ = false;

  rows.forEach((r, idx) => {
    const period = r[0] || '';
    const v5El = document.getElementById(`val1405_${idx}`);
    if (!v5El) return;
    const val = parseFloat(v5El.value) || 0;

    if (period.includes('فروردین') || period.includes('اردیبهشت') || period.includes('خرداد')) q1Sum += val;
    else if (period.includes('تیر') || period.includes('مرداد') || period.includes('شهریور')) q2Sum += val;
    else if (period.includes('مهر') || period.includes('آبان') || period.includes('آذر')) q3Sum += val;
    else if (period.includes('دی') || period.includes('بهمن') || period.includes('اسفند')) q4Sum += val;

    if (period.includes('سه ماهه اول')) { v5El.value = Math.round(q1Sum * 10) / 10; onEditorInputChanged(idx); hasQ = true; }
    else if (period.includes('سه ماهه دوم')) { v5El.value = Math.round(q2Sum * 10) / 10; onEditorInputChanged(idx); hasQ = true; }
    else if (period.includes('سه ماهه سوم')) { v5El.value = Math.round(q3Sum * 10) / 10; onEditorInputChanged(idx); hasQ = true; }
    else if (period.includes('سه ماهه چهارم')) { v5El.value = Math.round(q4Sum * 10) / 10; onEditorInputChanged(idx); hasQ = true; }
    else if (period.includes('کل سال') || period.includes('جمع کل')) {
      v5El.value = Math.round((q1Sum + q2Sum + q3Sum + q4Sum) * 10) / 10;
      onEditorInputChanged(idx);
      hasQ = true;
    }
  });

  if (hasQ) {
    alert('مجموع فصول چهارگانه و جمع کل سال با موفقیت محاسبه و در فیلدها درج شد.');
  } else {
    alert('این شاخص ساختار ماهانه استاندارد ندارد یا فیلدهای فصلی تفکیک نشده است.');
  }
}

// اعمال ضریب افزایشی یا کاهشی هدف نسبت به سال پایه
function applyEditorPreset(factor) {
  const currentSlideNum = ISLIDE_STATE.selectedEditorSlide || 2;
  const slide = ISLIDE_STATE.slides.find(s => s.slide_number === currentSlideNum);
  if (!slide || !slide.data) return;

  slide.data.forEach((r, idx) => {
    const v4El = document.getElementById(`val1404_${idx}`);
    const v5El = document.getElementById(`val1405_${idx}`);
    if (v4El && v5El && v4El.value !== '') {
      const v4 = parseFloat(v4El.value);
      if (!isNaN(v4)) {
        v5El.value = Math.round(v4 * factor * 10) / 10;
        onEditorInputChanged(idx);
      }
    }
  });
}

function resetEditorForm() {
  const currentSlideNum = ISLIDE_STATE.selectedEditorSlide || 2;
  const slide = ISLIDE_STATE.slides.find(s => s.slide_number === currentSlideNum);
  if (!slide || !slide.data) return;

  slide.data.forEach((r, idx) => {
    const v5El = document.getElementById(`val1405_${idx}`);
    if (v5El) {
      v5El.value = r[2] !== null && r[2] !== undefined ? r[2] : '';
      onEditorInputChanged(idx);
    }
  });
}

function onEditorSlideSelect(val) {
  ISLIDE_STATE.selectedEditorSlide = parseInt(val, 10);
  drawIndicatorSlidesView();
}

function openDirectEditorForSlide(slideNum) {
  ISLIDE_STATE.selectedEditorSlide = slideNum;
  ISLIDE_STATE.viewMode = 'editor';
  drawIndicatorSlidesView();
}

async function saveSlideDataEntry(e, slideNum) {
  e.preventDefault();
  const form = e.target;
  const slide = ISLIDE_STATE.slides.find(s => s.slide_number === slideNum);
  if (!slide) return;

  const rows = slide.data || [];
  const updatedRows = [];

  rows.forEach((r, idx) => {
    const period = form[`period_${idx}`].value;
    const v1404 = form[`val1404_${idx}`].value;
    const v1405 = form[`val1405_${idx}`].value;
    updatedRows.push([
      period,
      v1404 !== '' ? v1404 : null,
      v1405 !== '' ? v1405 : null
    ]);
  });

  try {
    await API.updateIndicatorSlideValues(slideNum, {
      rows: updatedRows
    });
    
    slide.data = updatedRows;
    alert('مقادیر شاخص با موفقیت در پایگاه‌داده بیمارستان ذخیره شد.');
    setSlideViewMode('slide');
  } catch (err) {
    alert('خطا در ذخیره مقادیر: ' + (err.message || 'خطای سرور'));
  }
}

// --------------------------------------------------------------------------
// حالت ۴: شناسنامه شاخص‌های استاندارد اعتباربخشی (۶۱ شاخص)
// --------------------------------------------------------------------------
function renderNationalIndicatorsTab() {
  setTimeout(() => {
    if (typeof renderIndicators === 'function') {
      renderIndicators();
    }
  }, 50);
  return `
    <div class="panel g" style="padding:24px;text-align:center">
      <div class="spin" style="width:32px;height:32px;border:3px solid rgba(56,189,248,.2);border-top-color:#38bdf8;border-radius:50%;margin:0 auto 12px;animation:spin .8s linear infinite"></div>
      در حال انتقال به شناسنامه ۶۱ شاخص استاندارد اعتباربخشی…
    </div>
  `;
}

// --------------------------------------------------------------------------
// تعویض نما، فیلترها و کلیدهای ناوبری
// --------------------------------------------------------------------------
function setSlideViewMode(mode) {
  ISLIDE_STATE.viewMode = mode;
  drawIndicatorSlidesView();
}

function setSlideSection(secId) {
  ISLIDE_STATE.activeSection = secId;
  ISLIDE_STATE.currentSlideIndex = 0;
  drawIndicatorSlidesView();
}

function onSlideSearch(val) {
  ISLIDE_STATE.searchQuery = val;
  ISLIDE_STATE.currentSlideIndex = 0;
  drawIndicatorSlidesView();
}

function navPrevSlide() {
  if (ISLIDE_STATE.currentSlideIndex > 0) {
    ISLIDE_STATE.currentSlideIndex--;
    drawIndicatorSlidesView();
  }
}

function navNextSlide() {
  const filtered = getFilteredSlides();
  if (ISLIDE_STATE.currentSlideIndex < filtered.length - 1) {
    ISLIDE_STATE.currentSlideIndex++;
    drawIndicatorSlidesView();
  }
}

function jumpToSlide(idx) {
  ISLIDE_STATE.currentSlideIndex = parseInt(idx, 10);
  drawIndicatorSlidesView();
}

function jumpToSlideByNumber(slideNum) {
  const filtered = getFilteredSlides();
  const target = filtered.find(s => s.slide_number === slideNum);
  if (target) {
    ISLIDE_STATE.currentSlideIndex = filtered.indexOf(target);
  } else {
    ISLIDE_STATE.activeSection = 'all';
    ISLIDE_STATE.searchQuery = '';
    const all = getFilteredSlides();
    const t = all.find(s => s.slide_number === slideNum);
    ISLIDE_STATE.currentSlideIndex = t ? all.indexOf(t) : 0;
  }
  ISLIDE_STATE.viewMode = 'slide';
  drawIndicatorSlidesView();
}

function jumpToSection(secId) {
  ISLIDE_STATE.activeSection = secId;
  ISLIDE_STATE.currentSlideIndex = 0;
  ISLIDE_STATE.viewMode = 'slide';
  drawIndicatorSlidesView();
}

function toggleSlidePlay() {
  ISLIDE_STATE.isPlaying = !ISLIDE_STATE.isPlaying;
  if (ISLIDE_STATE.isPlaying) {
    ISLIDE_STATE.playTimer = setInterval(() => {
      const filtered = getFilteredSlides();
      if (ISLIDE_STATE.currentSlideIndex < filtered.length - 1) {
        ISLIDE_STATE.currentSlideIndex++;
      } else {
        ISLIDE_STATE.currentSlideIndex = 0;
      }
      drawIndicatorSlidesView();
    }, 5000);
  } else {
    clearInterval(ISLIDE_STATE.playTimer);
    ISLIDE_STATE.playTimer = null;
  }
  drawIndicatorSlidesView();
}

function toggleFullscreenPresentation() {
  const el = document.getElementById('islideContainer');
  if (!el) return;
  if (!document.fullscreenElement) {
    el.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function printSlidePresentation() {
  window.print();
}

// کیبوردهای ناوبری اسلاید (کلیدهای جهت‌نما راست و چپ)
window.addEventListener('keydown', (e) => {
  if (S.page !== 'indicator_slides' && S.page !== 'indicators') return;
  if (ISLIDE_STATE.viewMode !== 'slide') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    navPrevSlide();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === ' ') {
    navNextSlide();
  }
});

// اکسپورت‌های سراسری
window.getHospitalName = getHospitalName;
window.cleanSlideTitle = cleanSlideTitle;
window.renderIndicatorSlidesView = renderIndicatorSlidesView;
window.ISLIDE_STATE = ISLIDE_STATE;
window.jumpToSlideByNumber = jumpToSlideByNumber;
window.jumpToSlide = jumpToSlide;
window.navNextSlide = navNextSlide;
window.navPrevSlide = navPrevSlide;
window.setSlideViewMode = setSlideViewMode;
window.setSlideSection = setSlideSection;
window.onSlideSearch = onSlideSearch;
window.onEditorSlideSelect = onEditorSlideSelect;
window.openDirectEditorForSlide = openDirectEditorForSlide;
window.saveSlideDataEntry = saveSlideDataEntry;
window.toggleSlidePlay = toggleSlidePlay;
window.toggleFullscreenPresentation = toggleFullscreenPresentation;
window.printSlidePresentation = printSlidePresentation;
window.setChartPeriodFilter = setChartPeriodFilter;
window.autoCalculateEditorQuarters = autoCalculateEditorQuarters;
window.applyEditorPreset = applyEditorPreset;
window.resetEditorForm = resetEditorForm;
window.onEditorInputChanged = onEditorInputChanged;
