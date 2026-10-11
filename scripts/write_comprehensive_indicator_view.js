const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../public/js/views/quality/indicator-slides-view.js');

const code = `/**
 * Hospital Indicators Presentation, Analytics & Data Entry Suite (1404-1405)
 * Comprehensive Interactive KPI Tool — Project 313
 * Zero Monolith — Zero Vertical Stacking
 */

function hasPerm(p) {
  return !!(window.S && S.user && (S.user.permissions || []).includes(p));
}

let ISLIDE_STATE = {
  slides: [],
  sections: [],
  currentSlideIndex: 1, // Start on slide 2 (first actual indicator) or slide 1
  activeSection: 'all',
  viewMode: 'slide', // 'slide', 'grid', 'editor', 'national'
  searchQuery: '',
  isPlaying: false,
  playTimer: null,
  selectedEditorSlide: 2,
  editorValues: {},
  loading: false
};

// پالت رنگ‌های حرفه‌ای و تفکیک‌شده برای سرفصل‌ها و نمودارها
const ISLIDE_THEMES = {
  hospital_macro: { primary: '#38bdf8', secondary: '#f59e0b', bg: 'rgba(56, 189, 248, 0.08)', border: '#0284c7', label: 'کلان و اورژانس', icon: '🏥' },
  surgical_maternity: { primary: '#a855f7', secondary: '#ec4899', bg: 'rgba(168, 85, 247, 0.08)', border: '#7e22ce', label: 'جراحی، زایمان و پاراکلینیک', icon: '🩺' },
  nursing_office: { primary: '#10b981', secondary: '#06b6d4', bg: 'rgba(16, 185, 129, 0.08)', border: '#059669', label: 'دفتر پرستاری', icon: '👩‍⚕️' },
  patient_safety: { primary: '#ef4444', secondary: '#f97316', bg: 'rgba(239, 68, 68, 0.08)', border: '#dc2626', label: 'ایمنی بیمار', icon: '🛡️' },
  infection_control: { primary: '#14b8a6', secondary: '#84cc16', bg: 'rgba(20, 184, 166, 0.08)', border: '#0d9488', label: 'کنترل عفونت', icon: '🦠' },
  patient_education: { primary: '#0ea5e9', secondary: '#8b5cf6', bg: 'rgba(14, 165, 233, 0.08)', border: '#0284c7', label: 'آموزش بیمار', icon: '📖' },
  staff_education: { primary: '#f59e0b', secondary: '#10b981', bg: 'rgba(245, 158, 11, 0.08)', border: '#d97706', label: 'آموزش کارکنان', icon: '🎓' }
};

// ماه‌های استاندارد شمسی برای تحلیل و جداول
const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'سه ماهه اول',
  'تیر', 'مرداد', 'شهریور', 'سه ماهه دوم',
  'مهر', 'آبان', 'آذر', 'سه ماهه سوم',
  'دی', 'بهمن', 'اسفند', 'سه ماهه چهارم', 'کل سال'
];

async function renderIndicatorSlidesView() {
  const c = $('content');
  if (!c) return;

  const pt = $('ptitle');
  if (pt) pt.textContent = 'شاخص‌های بیمارستان (سامانه جامع تحلیلی و پرزنتیشن)';

  c.innerHTML = \`
    <div class="islide-wrap" id="islideWrap">
      <div class="islide-loading" style="padding:56px;text-align:center;color:#94a3b8">
        <div class="spin" style="width:44px;height:44px;border:3px solid rgba(56,189,248,.2);border-top-color:#38bdf8;border-radius:50%;margin:0 auto 16px;animation:spin .8s linear infinite"></div>
        در حال واکشی و آماده‌سازی ماتریس جامع ۷۶ شاخص بیمارستان (۱۴۰۴ - ۱۴۰۵)…
      </div>
    </div>
  \`;

  try {
    const res = await API.indicatorSlides();
    ISLIDE_STATE.slides = res.slides || [];
    ISLIDE_STATE.sections = res.sections || [];
    drawIndicatorSlidesView();
  } catch (err) {
    c.innerHTML = \`
      <div class="panel g" style="padding:36px;text-align:center">
        <h3 style="color:#ef4444;margin-bottom:8px">خطا در بارگذاری سامانه شاخص‌ها</h3>
        <p style="color:#94a3b8">\${esc(err.message || 'ارتباط با سرور برقرار نشد')}</p>
        <button class="btn btn-g btn-sm" style="margin-top:16px" onclick="renderIndicatorSlidesView()">تلاش مجدد</button>
      </div>
    \`;
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
  
  // Slide selection
  if (ISLIDE_STATE.currentSlideIndex >= filtered.length) {
    ISLIDE_STATE.currentSlideIndex = 0;
  }
  const currentSlide = filtered[ISLIDE_STATE.currentSlideIndex] || filtered[0] || null;

  c.innerHTML = \`
    <div class="islide-container" id="islideContainer">
      
      <!-- ۱. کارت‌های کلان شاخص‌های بیمارستان (KPI Executive Cards) -->
      <div class="islide-kpi-summary-row">
        <div class="islide-kpi-card" style="--kpi-col:#38bdf8">
          <div class="kpi-icon">🏥</div>
          <div class="kpi-body">
            <div class="kpi-title">کل مراجعین و پذیرش سالانه</div>
            <div class="kpi-val">۴,۴۷۵ <span class="kpi-unit">بیمار</span></div>
            <div class="kpi-sub">شش‌ماهه اول: ۲,۱۷۳ | شش‌ماهه دوم: ۲,۳۰۲ (+۵.۹٪)</div>
          </div>
        </div>

        <div class="islide-kpi-card" style="--kpi-col:#f59e0b">
          <div class="kpi-icon">🚨</div>
          <div class="kpi-body">
            <div class="kpi-title">مراجعین بخش اورژانس</div>
            <div class="kpi-val">۳,۹۶۴ <span class="kpi-unit">مراجعه</span></div>
            <div class="kpi-sub">۸۸.۵٪ کل مراجعین، پایش سریع تریاژ</div>
          </div>
        </div>

        <div class="islide-kpi-card" style="--kpi-col:#a855f7">
          <div class="kpi-icon">🩺</div>
          <div class="kpi-body">
            <div class="kpi-title">اعمال جراحی بیمارستان</div>
            <div class="kpi-val">۱,۲۹۱ <span class="kpi-unit">عمل جراحی</span></div>
            <div class="kpi-sub">عمومی، ارتوپدی، زنان، مغز و اعصاب، زیبایی</div>
          </div>
        </div>

        <div class="islide-kpi-card" style="--kpi-col:#10b981">
          <div class="kpi-icon">👶</div>
          <div class="kpi-body">
            <div class="kpi-title">ترویج زایمان طبیعی و سزارین</div>
            <div class="kpi-val">۵۹۹ <span class="kpi-unit">زایمان</span></div>
            <div class="kpi-sub">طبیعی: ۳۳۸ (۵۶.۴٪) | سزارین: ۲۶۱ (۴۳.۶٪)</div>
          </div>
        </div>
      </div>

      <!-- ۲. نوار کنترل و تب‌های ابزاری اصلی سامانه -->
      <div class="islide-topbar panel g">
        <div class="islide-header-info">
          <div class="islide-badge-chip">◈ سامانه جامع پایش، تحلیل و ثبت شاخص‌های بیمارستان امید</div>
          <h2 class="islide-page-title">داشبورد تحلیلی و ابزار جامع شاخص‌ها (۱۴۰۴ - ۱۴۰۵)</h2>
          <div class="islide-page-sub">تحلیل خط‌به‌خط، داده‌های ماهانه، نمودارهای مقایسه‌ای و ثبت مقادیر ۷۶ شاخص در ۷ سرفصل</div>
        </div>

        <div class="islide-top-actions">
          <div class="islide-search-box">
            <input type="text" placeholder="جستجو در ۷۶ شاخص…" value="\${esc(ISLIDE_STATE.searchQuery)}" oninput="onSlideSearch(this.value)">
          </div>

          <!-- کلیدهای سوئیچ ابزار -->
          <div class="btn-group">
            <button class="btn btn-o btn-sm \${ISLIDE_STATE.viewMode === 'slide' ? 'btn-active' : ''}" onclick="setSlideViewMode('slide')" title="پرزنتیشن و اسلایدهای تحلیلی">
              📽️ پرزنتیشن و اسلایدها
            </button>
            <button class="btn btn-o btn-sm \${ISLIDE_STATE.viewMode === 'grid' ? 'btn-active' : ''}" onclick="setSlideViewMode('grid')" title="گالری تمام ۷۶ شاخص">
              ▦ گالری شاخص‌ها (\${fa(totalCount)})
            </button>
            <button class="btn btn-o btn-sm \${ISLIDE_STATE.viewMode === 'editor' ? 'btn-active' : ''}" onclick="setSlideViewMode('editor')" title="ابزار ورود و ویرایش داده‌های ماهانه اکسل">
              ✏️ ابزار ورود مقادیر ماهانه
            </button>
            <button class="btn btn-o btn-sm \${ISLIDE_STATE.viewMode === 'national' ? 'btn-active' : ''}" onclick="setSlideViewMode('national')" title="شناسنامه شاخص‌های ملی اعتباربخشی">
              📋 ۶۱ شاخص اعتباربخشی
            </button>
          </div>

          <a href="\${API.indicatorSlidesExcelUrl()}" class="btn btn-g btn-sm" download title="دانلود فایل اکسل کامل شاخص‌ها">
            📥 خروجی اکسل
          </a>

          <button class="btn btn-o btn-sm" onclick="printSlidePresentation()" title="چاپ رسمی و گزارش‌گیری">
            🖨️ چاپ
          </button>
        </div>
      </div>

      <!-- ۳. نوار فیلتر سرفصل‌های هفت‌گانه (Horizontal RTL Flow طبق Rule 11) -->
      \${ISLIDE_STATE.viewMode !== 'national' ? \`
        <div class="islide-sections-bar">
          <button class="islide-sec-tab \${ISLIDE_STATE.activeSection === 'all' ? 'on' : ''}" onclick="setSlideSection('all')">
            همه سرفصل‌ها <span class="sec-cnt">(\${fa(totalCount)})</span>
          </button>
          \${ISLIDE_STATE.sections.map(sec => {
            const theme = ISLIDE_THEMES[sec.id] || { primary: '#38bdf8', icon: '📊' };
            return \`
              <button class="islide-sec-tab \${ISLIDE_STATE.activeSection === sec.id ? 'on' : ''}" onclick="setSlideSection('\${sec.id}')" style="--theme-col:\${theme.primary}">
                \${theme.icon || ''} \${esc(sec.title)} <span class="sec-cnt">(\${fa(sec.count)})</span>
              </button>
            \`;
          }).join('')}
        </div>
      \` : ''}

      <!-- ۴. محتوای فعال بر اساس حالت ابزار -->
      \${renderActiveViewMode(currentSlide, filtered)}
    </div>
  \`;
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
    return \`<div class="panel g empty" style="padding:48px;text-align:center">شاخصی با فیلترهای انتخابی یافت نشد.</div>\`;
  }

  const idx = list.indexOf(slide);
  const total = list.length;
  const theme = ISLIDE_THEMES[slide.section_id] || { primary: '#38bdf8', secondary: '#f59e0b', bg: 'rgba(56,189,248,0.08)', border: '#0284c7' };
  const canEdit = hasPerm('manage_indicators') || hasPerm('manage_indicator_slides') || hasPerm('manage_bsc') || (S.user && ['admin', 'nursing_director', 'hospital_president', 'quality_control_manager'].includes(S.user.role_code));

  // اگر اسلاید ۱ (کاور بیمارستان امید) باشد، داشبورد نمایی شکیل نشان دهیم
  if (slide.slide_number === 1) {
    return renderSlide1Cover(slide, theme, list);
  }

  return \`
    <div class="islide-player-card panel g" style="--card-border:\${theme.border};--card-glow:\${theme.primary}">
      <!-- نوار ناوبری بالای اسلاید -->
      <div class="islide-nav-header">
        <div class="islide-meta-tags">
          <span class="islide-sec-tag" style="background:\${theme.bg};color:\${theme.primary};border:1px solid \${theme.border}">
            \${theme.icon || '📌'} \${esc(slide.section_title)}
          </span>
          <span class="islide-num-tag">اسلاید \${fa(slide.slide_number)} از ۷۶ (شاخص \${fa(idx + 1)} از \${fa(total)})</span>
          \${slide.unit ? \`<span class="islide-unit-tag">واحد سنجش: \${esc(slide.unit)}</span>\` : ''}
        </div>

        <div class="islide-nav-controls">
          <button class="btn btn-o btn-sm" onclick="navPrevSlide()" \${idx === 0 ? 'disabled' : ''} title="اسلاید قبلی">
            ‹ قبلی
          </button>
          
          <div class="islide-progress-pill">
            <input type="range" min="0" max="\${total - 1}" value="\${idx}" oninput="jumpToSlide(this.value)">
          </div>

          <button class="btn btn-o btn-sm" onclick="navNextSlide()" \${idx === total - 1 ? 'disabled' : ''} title="اسلاید بعدی">
            بعدی ›
          </button>

          <button class="btn btn-o btn-sm islide-play-btn \${ISLIDE_STATE.isPlaying ? 'on' : ''}" onclick="toggleSlidePlay()" title="\${ISLIDE_STATE.isPlaying ? 'توقف پخش' : 'پخش خودکار'}">
            \${ISLIDE_STATE.isPlaying ? '⏸ توقف' : '▶ پخش خودکار'}
          </button>

          <button class="btn btn-o btn-sm" onclick="toggleFullscreenPresentation()" title="حالت تمام صفحه">
            ⛶ تمام‌صفحه
          </button>

          \${canEdit ? \`
            <button class="btn btn-g btn-sm" onclick="openDirectEditorForSlide(\${slide.slide_number})" title="ورود و اصلاح داده‌های این شاخص">
              ✏️ ورود/ویرایش مقادیر
            </button>
          \` : ''}
        </div>
      </div>

      <!-- صفحه نمایش اصلی اسلاید (Screen) -->
      <div class="islide-screen" id="islideScreen">
        
        <!-- عنوان شاخص -->
        <div class="islide-title-box">
          <div class="islide-title-badge">شاخص شماره \${fa(slide.slide_number)}</div>
          <h3 class="islide-main-title" style="color:\${theme.primary}">
            \${esc(slide.title)}
          </h3>
          \${slide.slide_text && slide.slide_text !== slide.title ? \`
            <div class="islide-text-banner">\${esc(slide.slide_text)}</div>
          \` : ''}
        </div>

        <!-- نمودار برداری SVG تمام رنگی و شارپ -->
        <div class="islide-chart-viewport">
          \${renderSvgChart(slide, theme)}
        </div>

        <!-- کارت‌های تحلیل بالینی و اقدامات اصلاحی (Horizontal Flow) -->
        <div class="islide-insights-row">
          \${slide.analysis_note ? \`
            <div class="islide-insight-card analysis">
              <div class="ins-title">💡 تحلیل بالینی و مدیریتی شاخص:</div>
              <div class="ins-body">\${esc(slide.analysis_note)}</div>
            </div>
          \` : \`
            <div class="islide-insight-card analysis">
              <div class="ins-title">💡 تحلیل بالینی و مدیریتی شاخص:</div>
              <div class="ins-body">روند شاخص بر اساس اهداف استراتژیک بیمارستان امید پایش شده و گزارش دوره‌ای آن به کمیته پایش کیفیت و اعتباربخشی ارائه می‌گردد.</div>
            </div>
          \`}

          \${slide.corrective_actions ? \`
            <div class="islide-insight-card corrective">
              <div class="ins-title">⚡ اقدامات اصلاحی و پایش مصوب:</div>
              <div class="ins-body">\${esc(slide.corrective_actions)}</div>
            </div>
          \` : ''}
        </div>

        <!-- جدول داده‌های عددی ماهانه و فصلی خط‌به‌خط -->
        <div class="islide-table-section">
          <div class="islide-table-hd">
            <span class="hd-title">📋 جدول داده‌های عددی و مقایسه عملکرد سال‌های ۱۴۰۴ و ۱۴۰۵</span>
            <div class="hd-actions">
              <span class="sub-txt">واحد: \${esc(slide.unit || 'عدد')}</span>
              \${canEdit ? \`<button class="btn btn-o btn-sm" onclick="openDirectEditorForSlide(\${slide.slide_number})">✏️ ویرایش داده‌های جدول</button>\` : ''}
            </div>
          </div>
          <div class="islide-table-wrap">
            \${renderSlideDataTable(slide)}
          </div>
        </div>

      </div>
    </div>
  \`;
}

// رندر کاور شکیل اسلاید ۱ (بیمارستان امید در یک نگاه)
function renderSlide1Cover(slide, theme, list) {
  return \`
    <div class="islide-player-card panel g" style="--card-border:\${theme.border};--card-glow:\${theme.primary}">
      <div class="islide-cover-hero">
        <div class="cover-badge">◈ گزارش جامع و تحلیلی شاخص‌های بیمارستان امید</div>
        <h1 class="cover-title">بیمارستان امید در یک نگاه</h1>
        <h2 class="cover-years">ارزیابی، مقایسه و تحلیل عملکرد سال‌های ۱۴۰۴ - ۱۴۰۵</h2>
        <p class="cover-desc">
          سامانه پایش هوشمند ۷۶ شاخص عملکردی، بالینی، ایمنی و اعتباربخشی در ۷ حوزه کلان بیمارستانی به همراه ماتریس داده‌های ۱۲ ماهه، فصلی و اقدامات اصلاحی مصوب.
        </p>

        <div class="cover-sections-grid">
          \${ISLIDE_STATE.sections.map(sec => {
            const th = ISLIDE_THEMES[sec.id] || { primary: '#38bdf8', icon: '📊' };
            return \`
              <div class="cover-sec-item" onclick="jumpToSection('\${sec.id}')" style="--c-col:\${th.primary}">
                <div class="cs-icon">\${th.icon || '📌'}</div>
                <div class="cs-title">\${esc(sec.title)}</div>
                <div class="cs-count">\${fa(sec.count)} شاخص</div>
              </div>
            \`;
          }).join('')}
        </div>

        <div class="cover-action-bar">
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
  \`;
}

// رندر نمودار SVG برداری پیشرفته
function renderSvgChart(slide, theme) {
  const rows = slide.data || [];
  if (!rows || !rows.length) {
    return \`
      <div class="islide-chart-empty">
        <div style="font-size:36px;margin-bottom:8px">📄</div>
        <div style="font-size:15px;font-weight:700;color:#94a3b8">اسلاید عنوان و بدون نمودار عددی مستقیم</div>
        <div style="font-size:13px;color:#64748b;margin-top:6px">\${esc(slide.slide_text || slide.title)}</div>
      </div>
    \`;
  }

  // Categories & Series
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
    return \`<div class="islide-chart-empty">داده‌ای برای ترسیم نمودار یافت نشد.</div>\`;
  }

  const has1405 = vals1405.some(v => v !== null && v > 0);

  // SVG Dimensions
  const W = 880;
  const H = 340;
  const padLeft = 60;
  const padRight = 30;
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

  // Grid lines
  const gridLines = [];
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxVal / gridSteps) * i;
    const y = padTop + chartH - (val / maxVal) * chartH;
    gridLines.push(\`
      <line x1="\${padLeft}" y1="\${y}" x2="\${W - padRight}" y2="\${y}" stroke="rgba(148,163,184,0.12)" stroke-dasharray="3,3" />
      <text x="\${padLeft - 10}" y="\${y + 4}" fill="#64748b" font-size="11" text-anchor="end">\${fa(Math.round(val * 10) / 10)}</text>
    \`);
  }

  // Bars and categories
  const barsSvg = categories.map((cat, i) => {
    const v1404 = vals1404[i] || 0;
    const v1405 = vals1405[i];

    const h1404 = (v1404 / maxVal) * chartH;
    const y1404 = padTop + chartH - h1404;

    const groupX = padLeft + i * groupW + groupW / 2;

    let barsBlock = '';

    if (has1405 && v1405 !== null) {
      const h1405 = (v1405 / maxVal) * chartH;
      const y1405 = padTop + chartH - h1405;

      const x1 = groupX - barW - 2;
      const x2 = groupX + 2;

      barsBlock = \`
        <!-- 1404 Bar (Sky Blue) -->
        <rect x="\${x1}" y="\${y1404}" width="\${barW}" height="\${Math.max(h1404, 2)}" rx="4" fill="url(#grad1404)" opacity="0.95" class="chart-bar">
          <title>\${esc(cat)} - ۱۴۰۴: \${v1404}</title>
        </rect>
        \${v1404 > 0 ? \`<text x="\${x1 + barW / 2}" y="\${y1404 - 6}" fill="#38bdf8" font-size="10" font-weight="700" text-anchor="middle">\${fa(v1404)}</text>\` : ''}

        <!-- 1405 Bar (Amber) -->
        <rect x="\${x2}" y="\${y1405}" width="\${barW}" height="\${Math.max(h1405, 2)}" rx="4" fill="url(#grad1405)" opacity="0.95" class="chart-bar">
          <title>\${esc(cat)} - ۱۴۰۵: \${v1405}</title>
        </rect>
        \${v1405 > 0 ? \`<text x="\${x2 + barW / 2}" y="\${y1405 - 6}" fill="#f59e0b" font-size="10" font-weight="700" text-anchor="middle">\${fa(v1405)}</text>\` : ''}
      \`;
    } else {
      const x = groupX - barW / 2;
      barsBlock = \`
        <rect x="\${x}" y="\${y1404}" width="\${barW}" height="\${Math.max(h1404, 2)}" rx="4" fill="url(#grad1404)" opacity="0.95" class="chart-bar">
          <title>\${esc(cat)}: \${v1404}</title>
        </rect>
        \${v1404 > 0 ? \`<text x="\${x + barW / 2}" y="\${y1404 - 6}" fill="#38bdf8" font-size="10" font-weight="700" text-anchor="middle">\${fa(v1404)}</text>\` : ''}
      \`;
    }

    // Category label (RTL rotated if many)
    const isSpecialPeriod = cat.includes('سه ماهه') || cat.includes('شش ماهه') || cat.includes('کل');
    const labelCol = isSpecialPeriod ? '#38bdf8' : '#94a3b8';
    const labelWeight = isSpecialPeriod ? '700' : '500';

    const lblY = H - padBottom + 20;
    const catLabel = \`
      <text x="\${groupX}" y="\${lblY}" fill="\${labelCol}" font-size="11" font-weight="\${labelWeight}" text-anchor="middle" transform="\${barCount > 8 ? \`rotate(25, \${groupX}, \${lblY})\` : ''}">
        \${esc(cat)}
      </text>
    \`;

    return \`<g class="chart-group">\${barsBlock}\${catLabel}</g>\`;
  }).join('');

  return \`
    <div class="islide-svg-wrap">
      <div class="islide-legend-bar">
        <div class="leg-item"><span class="leg-dot" style="background:#38bdf8"></span> عملکرد سال ۱۴۰۴ (پایه)</div>
        \${has1405 ? \`<div class="leg-item"><span class="leg-dot" style="background:#f59e0b"></span> هدف / عملکرد سال ۱۴۰۵</div>\` : ''}
        <div class="leg-item"><span class="sub-pill">واحد: \${esc(slide.unit || 'تعداد')}</span></div>
      </div>

      <svg viewBox="0 0 \${W} \${H}" class="islide-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grad1404" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="1" />
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.8" />
          </linearGradient>
          <linearGradient id="grad1405" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fbbf24" stop-opacity="1" />
            <stop offset="100%" stop-color="#d97706" stop-opacity="0.8" />
          </linearGradient>
        </defs>

        <!-- خطوط راهنما -->
        \${gridLines.join('')}

        <!-- خط مبنا -->
        <line x1="\${padLeft}" y1="\${padTop + chartH}" x2="\${W - padRight}" y2="\${padTop + chartH}" stroke="rgba(148,163,184,0.3)" stroke-width="1.5" />

        <!-- میله‌ها و مقادیر -->
        \${barsSvg}
      </svg>
    </div>
  \`;
}

// رندر جدول داده‌های ماهانه
function renderSlideDataTable(slide) {
  const rows = slide.data || [];
  if (!rows || !rows.length) {
    return \`<div class="empty" style="padding:16px;text-align:center">جدول داده‌ای برای این اسلاید ثبت نشده است.</div>\`;
  }

  const tableRowsHtml = rows.map((r, i) => {
    const period = r[0] || '';
    const v1404 = r[1] !== null && r[1] !== undefined && r[1] !== '' ? r[1] : '—';
    const v1405 = r[2] !== null && r[2] !== undefined && r[2] !== '' ? r[2] : '—';

    let diffText = '—';
    let diffClass = '';
    const num4 = parseFloat(v1404);
    const num5 = parseFloat(v1405);
    if (!isNaN(num4) && !isNaN(num5) && num4 > 0) {
      const diffPct = Math.round(((num5 - num4) / num4) * 1000) / 10;
      if (diffPct > 0) {
        diffText = \`+\${diffPct}٪ ↗\`;
        diffClass = 'diff-up';
      } else if (diffPct < 0) {
        diffText = \`\${diffPct}٪ ↘\`;
        diffClass = 'diff-down';
      } else {
        diffText = '۰٪ ＝';
      }
    }

    const isSum = period.includes('سه ماهه') || period.includes('شش ماهه') || period.includes('کل');

    return \`
      <tr class="\${isSum ? 'tr-summary' : ''}">
        <td class="td-period">\${esc(period)}</td>
        <td class="td-val val-1404">\${v1404 !== '—' ? fa(v1404) : '—'}</td>
        <td class="td-val val-1405">\${v1405 !== '—' ? fa(v1405) : '<span style="color:#64748b;font-size:12px">ثبت نشده</span>'}</td>
        <td class="td-diff \${diffClass}">\${diffText !== '—' ? fa(diffText) : '—'}</td>
      </tr>
    \`;
  }).join('');

  return \`
    <table class="islide-table">
      <thead>
        <tr>
          <th>دوره زمانی / ماه</th>
          <th>عملکرد سال ۱۴۰۴ (پایه)</th>
          <th>هدف / عملکرد سال ۱۴۰۵</th>
          <th>تغییرات و انحراف (Δ٪)</th>
        </tr>
      </thead>
      <tbody>
        \${tableRowsHtml}
      </tbody>
    </table>
  \`;
}

// --------------------------------------------------------------------------
// حالت ۲: گالری تمام ۷۶ شاخص (Grid Mode)
// --------------------------------------------------------------------------
function renderSlideGrid(list) {
  if (!list.length) {
    return \`<div class="panel g empty" style="padding:48px;text-align:center">شاخصی با این فیلترها یافت نشد.</div>\`;
  }

  const cardsHtml = list.map(s => {
    const theme = ISLIDE_THEMES[s.section_id] || { primary: '#38bdf8', icon: '📊' };
    const rows = s.data || [];
    
    // Quick summary
    let sum1404 = '—';
    const sumRow = rows.find(r => (r[0]||'').includes('کل') || (r[0]||'').includes('شش ماهه اول'));
    if (sumRow && sumRow[1]) {
      sum1404 = fa(sumRow[1]);
    } else if (rows.length) {
      sum1404 = \`\${fa(rows.length)} دوره ماهانه\`;
    }

    return \`
      <div class="islide-grid-card panel g" onclick="jumpToSlideByNumber(\${s.slide_number})" style="--card-border:\${theme.border}">
        <div class="card-head">
          <span class="card-sec-badge" style="background:\${theme.bg};color:\${theme.primary}">\${theme.icon || ''} \${esc(s.section_title)}</span>
          <span class="card-num-badge">#\${fa(s.slide_number)}</span>
        </div>
        <h4 class="card-title">\${esc(s.title)}</h4>
        \${s.slide_text && s.slide_text !== s.title ? \`<div class="card-sub">\${esc(s.slide_text.slice(0, 75))}…</div>\` : ''}
        
        <div class="card-footer">
          <div class="card-stat">
            <span class="lbl">واحد:</span>
            <span class="val">\${esc(s.unit || 'تعداد')}</span>
          </div>
          <button class="btn btn-o btn-sm" onclick="event.stopPropagation();jumpToSlideByNumber(\${s.slide_number})">
            مشاهده اسلاید ‹
          </button>
        </div>
      </div>
    \`;
  }).join('');

  return \`
    <div class="islide-grid-container">
      <div class="islide-grid-hd">
        <span>نمایش تمام شاخص‌ها (\${fa(list.length)} مورد)</span>
        <button class="btn btn-o btn-sm" onclick="setSlideViewMode('slide')">بازگشت به پرزنتیشن 📽️</button>
      </div>
      <div class="islide-cards-grid">
        \${cardsHtml}
      </div>
    </div>
  \`;
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

  return \`
    <div class="islide-editor-container panel g">
      <div class="editor-top-bar">
        <div class="editor-select-box">
          <label>انتخاب شاخص جهت ورود یا اصلاح داده‌های ماهانه:</label>
          <select class="form-ctrl" onchange="onEditorSlideSelect(this.value)">
            \${ISLIDE_STATE.slides.filter(s => s.slide_number > 1 && s.slide_number < 76).map(s => \`
              <option value="\${s.slide_number}" \${s.slide_number === slide.slide_number ? 'selected' : ''}>
                اسلاید \${s.slide_number}: \${s.title}
              </option>
            \`).join('')}
          </select>
        </div>

        <div class="editor-quick-info">
          <span class="badge" style="background:\${theme.bg};color:\${theme.primary}">\${esc(slide.section_title)}</span>
          <span class="unit-tag">واحد: \${esc(slide.unit || 'تعداد')}</span>
        </div>
      </div>

      <div class="editor-sheet-box">
        <div class="sheet-title-row">
          <h3>\${esc(slide.title)}</h3>
          <p>مقادیر ثبت‌شده سال ۱۴۰۴ به عنوان پایه نمایش داده می‌شود. مقادیر عملکرد یا هدف سال ۱۴۰۵ را در ستون مربوطه وارد کنید:</p>
        </div>

        <form id="slideDataEntryForm" onsubmit="saveSlideDataEntry(event, \${slide.slide_number})">
          <table class="islide-table islide-editor-table">
            <thead>
              <tr>
                <th style="width:25%">دوره / ماه</th>
                <th style="width:25%">عملکرد سال ۱۴۰۴ (مرجع)</th>
                <th style="width:30%">عملکرد / هدف سال ۱۴۰۵ (ورود داده)</th>
                <th style="width:20%">محاسبه خودکار انحراف</th>
              </tr>
            </thead>
            <tbody>
              \${rows.map((r, idx) => {
                const label = r[0] || '';
                const v1404 = r[1] !== null && r[1] !== undefined ? r[1] : '';
                const v1405 = r[2] !== null && r[2] !== undefined ? r[2] : '';
                const isSum = label.includes('سه ماهه') || label.includes('شش ماهه') || label.includes('کل');

                return \`
                  <tr class="\${isSum ? 'tr-summary' : ''}">
                    <td>
                      <input type="hidden" name="period_\${idx}" value="\${esc(label)}">
                      <strong>\${esc(label)}</strong>
                    </td>
                    <td>
                      <input type="number" step="any" class="form-ctrl input-readonly" name="val1404_\${idx}" value="\${v1404}" readonly title="مقدار ثبت‌شده ۱۴۰۴">
                    </td>
                    <td>
                      <input type="number" step="any" class="form-ctrl input-editable" name="val1405_\${idx}" value="\${v1405}" placeholder="مقدار ۱۴۰۵…" \${isSum ? 'readonly style=\"background:rgba(255,255,255,0.05);color:#f59e0b\"' : ''}>
                    </td>
                    <td class="td-calc" id="calcDiff_\${idx}">
                      \${v1405 && v1404 ? fa(Math.round(((v1405 - v1404) / v1404) * 100)) + '٪' : '—'}
                    </td>
                  </tr>
                \`;
              }).join('')}
            </tbody>
          </table>

          <div class="editor-actions-row">
            <button type="submit" class="btn btn-g btn-lg">
              💾 ذخیره تغییرات مقادیر شاخص در سامانه
            </button>
            <button type="button" class="btn btn-o btn-lg" onclick="setSlideViewMode('slide')">
              انصراف و بازگشت به پرزنتیشن
            </button>
          </div>
        </form>
      </div>
    </div>
  \`;
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
    const period = form[\`period_\${idx}\`].value;
    const v1404 = form[\`val1404_\${idx}\`].value;
    const v1405 = form[\`val1405_\${idx}\`].value;
    updatedRows.push([
      period,
      v1404 !== '' ? v1404 : null,
      v1405 !== '' ? v1405 : null
    ]);
  });

  try {
    const res = await API.updateIndicatorSlideValues(slideNum, {
      rows: updatedRows
    });
    
    // Update local state
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
  return \`
    <div class="panel g" style="padding:24px;text-align:center">
      <div class="spin" style="width:32px;height:32px;border:3px solid rgba(56,189,248,.2);border-top-color:#38bdf8;border-radius:50%;margin:0 auto 12px;animation:spin .8s linear infinite"></div>
      در حال انتقال به شناسنامه ۶۱ شاخص استاندارد اعتباربخشی…
    </div>
  \`;
}

// --------------------------------------------------------------------------
// تعویض نما و فیلترها
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
`;

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully written new indicator-slides-view.js');
