/**
 * Dashboard Live Analytics
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
async function loadAccDecisionEngine() {
  const box = $('accDecisionEngine');
  if (!box) return;

  // کرکره (خواست مالک ۱۴۰۵/۰۷/۲۴): پیش‌فرض جمع — فقط سرشاخه دیده می‌شود؛ انتخاب کاربر در طول همین نشستِ صفحه حفظ می‌شود
  const isOpen = !!window.__accDecisionOpen;
  box.classList.toggle('collapsed', !isOpen);

  try {
    const data = await API.smartDecisions();
    if (!data) { box.remove(); return; }

    const top = data.topAction;
    const roadmap = data.roadmap || {};
    const measures = data.measuresAtRisk || [];

    box.innerHTML = `
      <div class="acc-decision-hd" role="button" tabindex="0" aria-expanded="${isOpen ? 'true' : 'false'}"
           title="باز و بستن بخش" onclick="toggleAccDecisionEngine()"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccDecisionEngine();}">
        <div class="acc-decision-title">
          <span>🧠</span>
          <span>موتور تصمیم‌گیرنده هوشمند سنجه‌های اعتباربخشی</span>
        </div>
        <div class="acc-decision-badge">
          <span>✨</span>
          <span>توصیه برخط بر اساس ${fa(395)} سنجه ملی</span>
        </div>
        <span class="acc-decision-chevron" aria-hidden="true">▾</span>
      </div>

      <div class="acc-decision-body">
      ${top ? `
        <div class="acc-top-action-hero">
          <div class="acc-top-action-info">
            <span class="acc-top-action-tag">اقدام فوری امروز (توصیه هوشمند)</span>
            <div class="acc-top-action-t">${esc(top.title)}</div>
            <div class="acc-top-action-d">${esc(top.desc)}</div>
            <div style="font-size:0.82rem;color:#fef08a;margin-top:6px;display:flex;align-items:center;gap:6px">
              <span>💡</span>
              <span>${esc(top.aiRecommendation)}</span>
            </div>
          </div>
          <button type="button" class="acc-top-action-btn" onclick="go('${esc(top.page)}')" title="انجام فوری اقدام">
            برو و انجام بده ‹
          </button>
        </div>
      ` : ''}

      <div class="acc-decision-tabs">
        <button type="button" class="acc-decision-tab active" onclick="switchDecisionTab('daily', this)">
          ☀️ امروز و روزانه <span class="dt-count">${fa((roadmap.daily||[]).length)}</span>
        </button>
        <button type="button" class="acc-decision-tab" onclick="switchDecisionTab('weekly', this)">
          📅 این هفته <span class="dt-count">${fa((roadmap.weekly||[]).length)}</span>
        </button>
        <button type="button" class="acc-decision-tab" onclick="switchDecisionTab('monthly', this)">
          🗓️ این ماه <span class="dt-count">${fa((roadmap.monthly||[]).length)}</span>
        </button>
        <button type="button" class="acc-decision-tab" onclick="switchDecisionTab('risk', this)">
          ⚠️ سنجه‌های نیازمند اقدام <span class="dt-count">${fa(measures.length)}</span>
        </button>
      </div>

      <div id="accDecisionTabContent">
        <div class="acc-duty-list">
          ${(roadmap.daily || []).map(d => `
            <div class="acc-duty-item ${d.done ? 'done' : ''}" onclick="go('${esc(d.page)}')">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:16px">${d.done ? '✅' : '⏳'}</span>
                <div>
                  <div style="font-size:0.92rem;font-weight:700;color:#fff">${esc(d.title)}</div>
                  <div style="font-size:0.78rem;color:#94a3b8">سنجه مرتبط: <bdi dir="ltr">${esc(d.measureCode)}</bdi> · ${esc(d.cadenceLabel)}</div>
                </div>
              </div>
              <span style="font-size:12px;color:var(--gd,#c9a84c)">انجام ‹</span>
            </div>
          `).join('')}
        </div>
      </div>
      </div>
    `;

    window.__accDecisionData = data;
  } catch (e) {
    if (box) box.remove();
  }
}

// کرکرهٔ موتور تصمیم‌گیرنده — کلیک/کیبورد روی سرشاخه، کل بدنه را جمع/باز می‌کند
window.toggleAccDecisionEngine = function () {
  const box = $('accDecisionEngine');
  if (!box) return;
  const nowCollapsed = box.classList.toggle('collapsed');
  window.__accDecisionOpen = !nowCollapsed;
  const hd = box.querySelector('.acc-decision-hd');
  if (hd) hd.setAttribute('aria-expanded', window.__accDecisionOpen ? 'true' : 'false');
};

window.switchDecisionTab = function(tabKey, btn) {
  document.querySelectorAll('.acc-decision-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const cont = $('accDecisionTabContent');
  if (!cont || !window.__accDecisionData) return;

  const data = window.__accDecisionData;
  const roadmap = data.roadmap || {};
  const measures = data.measuresAtRisk || [];

  if (tabKey === 'risk') {
    cont.innerHTML = `
      <div class="acc-duty-list">
        ${measures.map(m => `
          <div class="acc-duty-item" onclick="if(window.HassanHub&&HassanHub.openMeasureDetailPage) HassanHub.openMeasureDetailPage('${esc(m.code)}'); else go('measures');">
            <div>
              <div style="font-size:0.92rem;font-weight:700;color:#fca5a5"><bdi dir="ltr">${esc(m.code)}</bdi> — ${esc(m.riskLabel)}</div>
              <div style="font-size:0.8rem;color:#cbd5e1;margin-top:2px">${esc(m.title)}</div>
            </div>
            <span style="font-size:12px;color:var(--gd,#c9a84c);white-space:nowrap">مشاهده سنجه ‹</span>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  const list = roadmap[tabKey] || [];
  cont.innerHTML = `
    <div class="acc-duty-list">
      ${list.map(d => `
        <div class="acc-duty-item ${d.done ? 'done' : ''}" onclick="go('${esc(d.page)}')">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:16px">${d.done ? '✅' : '⏳'}</span>
            <div>
              <div style="font-size:0.92rem;font-weight:700;color:#fff">${esc(d.title)}</div>
              <div style="font-size:0.78rem;color:#94a3b8">سنجه مرتبط: <bdi dir="ltr">${esc(d.measureCode)}</bdi> · ${esc(d.cadenceLabel)}</div>
            </div>
          </div>
          <span style="font-size:12px;color:var(--gd,#c9a84c)">انجام ‹</span>
        </div>
      `).join('')}
    </div>
  `;
};

function renderAccHub(){
  GAnim.killAllIn($('content'));
  $('ptitle').textContent='اعتباربخشی';

  // سه بخش اصلی اعتباربخشی (الف، ب، ج)
  const SEC_ICON={'الف':ic('badge'),'ب':ic('stethoscope'),'ج':ic('heart')};
  let overallDone=0, overallTotal=0;
  const secs=(S.sections||[]).map(sec=>{
    const p=secProgress(sec.code);
    overallDone+=p.done; overallTotal+=p.total;
    return `<button type="button" class="secard${p.pct<100?' needs-fill':''}" onclick="openSection('${esc(sec.code)}')">
      ${p.pct<100?'<span class="fillring" aria-hidden="true"></span>':''}
      <span class="secard-top">
        <span class="secard-ic">${SEC_ICON[sec.code]||ic('clipboard')}</span>
        <span class="secard-code">${esc(sec.code)}</span>
      </span>
      <span class="secard-t">${esc(sec.title)}</span>
      <span class="secard-bar"><span data-pct="${p.pct}" style="width:0%"></span></span>
      <span class="secard-n">${fa(p.done)} از ${fa(p.total)} سنجه · <b class="secard-pctnum" data-pct="${p.pct}">۰٪</b></span>
    </button>`;
  }).join('');
  const overallPct = overallTotal ? Math.round(overallDone*100/overallTotal) : 0;
  const CIRC = 2*Math.PI*45;
  const ring = secs ? `<div class="hub-ring-wrap">
      <svg class="hub-ring" viewBox="0 0 100 100">
        <circle class="hub-ring-track" cx="50" cy="50" r="45"></circle>
        <circle class="hub-ring-val" cx="50" cy="50" r="45" data-pct="${overallPct}"
          stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"></circle>
      </svg>
      <div class="hub-ring-mid">
        <b class="hub-ring-pctnum" data-pct="${overallPct}">۰٪</b>
        <span>پیشرفت کل</span>
      </div>
    </div>` : '';

  // کارت‌های میانبر اصلی مطابق تصویر مرجع ۲
  const shortcutCards = [
    { title: 'دستور کارها', sub: 'پیگیری وظایف و اقدامات', icon: '🗂️', action: "go('duties')" },
    { title: 'صورت جلسات کمیته‌ها', sub: 'ثبت و پیگیری مصوبات', icon: '👥', action: "go('committees')" },
    { title: 'شاخص‌ها', sub: 'پایش سنجه‌ها و KPI', icon: '📈', action: "go('indicator_slides')" },
    { title: 'چک لیست‌های ارزیابی', sub: 'ممیزی و ارزیابی بخش‌ها', icon: '📋', action: "go('checklists')" },

    { title: 'ماژول آموزش', sub: 'آموزش و توانمندسازی کارکنان', icon: '🎓', action: "go('training')" },
    { title: 'برنامه‌ها', sub: 'برنامه‌های بهبود کیفیت', icon: '📝', action: "go('programs')" },
    { title: 'فلوچارت فرآیندها', sub: 'نمودار گردش کارهای بالینی', icon: '🔄', action: "go('processes')" },
    { title: 'پیام‌ها', sub: 'کارتابل ارتباطی و اعلانات', icon: '✉️', action: "go('inbox')" },

    { title: 'روش‌های اجرایی', sub: 'روش‌های اجرایی مدون (SOP)', icon: '⚙️', action: "if(window.HassanHub&&HassanHub.openDocumentHubModal) HassanHub.openDocumentHubModal('procedure', '', 'روش‌های اجرایی'); else go('documents');" },
    { title: 'دستورالعمل‌ها', sub: 'دستورالعمل‌های ابلاغی وزارت', icon: '📖', action: "if(window.HassanHub&&HassanHub.openDocumentHubModal) HassanHub.openDocumentHubModal('instruction', '', 'دستورالعمل‌ها'); else go('documents');" },
    { title: 'خط مشی‌ها', sub: 'خط‌مشی‌های مصوب مرکز', icon: '🎖️', action: "if(window.HassanHub&&HassanHub.openDocumentHubModal) HassanHub.openDocumentHubModal('policy', '', 'خط‌مشی‌ها'); else go('documents');" },
    { title: 'کتابخانه دیجیتال', sub: 'مخزن مستندات و منابع', icon: '📁', action: "go('knowledge')" },

    { title: 'بازدید میدانی ایمنی بیمار', sub: 'واک‌اراند و ممیزی میدانی', icon: '🛡️', action: "go('walkarounds')" },
    { title: 'انتقادات و پیشنهادات', sub: 'رسیدگی به شکایات و CRM', icon: '⭐', action: "go('satisfaction')" }
  ];

  const shortcutsHtml = shortcutCards.map(c => `
    <div class="acc-mcard" onclick="${c.action}" role="button" tabindex="0">
      <div class="acc-mcard-info">
        <span class="acc-mcard-t">${esc(c.title)}</span>
        <span class="acc-mcard-sub">${esc(c.sub)}</span>
      </div>
      <div class="acc-mcard-icon">${c.icon}</div>
    </div>
  `).join('');

  $('content').innerHTML = `
    <div class="acc-hub-container">
      <!-- نوار خوش‌آمدگویی بالا -->
      <div class="acc-welcome-bar">
        <div class="acc-welcome-bar-right">
          <span style="color:#f7d070">✦</span>
          <span>به پنل کاربری سیناپس خوش آمدید</span>
        </div>
        <div class="acc-welcome-bar-left">
          <span>سال ارزشیابی: <b>${fa(S.year||'1405')}</b></span>
          <span>مرکز: <b>${esc(S.user.hospital_name||'بیمارستان نمونه')}</b></span>
        </div>
      </div>

      <!-- موتور هوشمند تصمیم‌گیرنده اعتباربخشی -->
      <div id="accDecisionEngine" class="acc-decision-box">
        <div style="color:#94a3b8;font-size:0.9rem;text-align:center;padding:12px">در حال تحلیل سنجه‌ها و تولید برنامه هوشمند…</div>
      </div>

      <!-- سه بخش اصلی اعتباربخشی (الف، ب، ج) -->
      ${secs ? `
        <div class="hub-sec">
          <h3 class="hub-h">سه بخش اصلی اعتباربخشی بیمارستان</h3>
          ${ring}
          <div class="secard-row">${secs}</div>
        </div>
      ` : ''}

      <!-- ساختار دو ستونه مطابق اسکرین‌شات مرجع ۲ -->
      <div class="acc-main-layout">
        <!-- ستون راست: کارت‌های هشدار و اقدام سریع -->
        <div class="acc-side-alerts">
          <div class="acc-alert-card" onclick="go('errors')" role="button" tabindex="0" title="مشاهده خطاهای ثبت‌شده">
            <div class="acc-alert-icon-box acc-alert-icon-red">⚠️</div>
            <div class="acc-alert-title">خطاهای گزارش شده</div>
            <div class="acc-alert-badge" id="accErrorBadgeCount">در انتظار بررسی</div>
          </div>

          <div class="acc-alert-card" onclick="go('errors')" role="button" tabindex="0" title="ثبت فوری خطای بالینی یا واقعه ناخواسته">
            <div class="acc-alert-icon-box acc-alert-icon-yellow">⚙️</div>
            <div class="acc-alert-title">گزارش خطاها و وقایع بخش</div>
            <div class="acc-alert-badge">ثبت سریع واقعه</div>
          </div>

          <div class="acc-alert-card" onclick="go('walkarounds')" role="button" tabindex="0" title="گزارش بازدیدهای مدیریتی و ایمنی بیمار">
            <div class="acc-alert-icon-box acc-alert-icon-blue">👥</div>
            <div class="acc-alert-title">گزارش واک‌تراندهای مدیریتی</div>
            <div class="acc-alert-badge">ایمنی و بازدید میدانی</div>
          </div>
        </div>

        <!-- ستون چپ: کارت بزرگ کمیته‌ها و شبکه کلیدهای ماستر -->
        <div class="acc-content-col">
          <!-- کارت بزرگ و شاخص کمیته‌ها (خواست قطعی کاربر: کارت کمیته‌ها هم بزرگ باشه) -->
          <div class="acc-committee-hero-card" onclick="go('committees')" role="button" tabindex="0" title="مشاهده کمیته‌ها و جلسات">
            <div class="acc-committee-hero-right">
              <div class="acc-committee-hero-icon">🏛️</div>
              <div>
                <div class="acc-committee-hero-t">کمیته‌های تخصصی و راهبردی بیمارستان</div>
                <div class="acc-committee-hero-d">
                  ۱۴ کمیته مصوب وزارت بهداشت · جلسات ماهانه و فصلی، دستور جلسات و مصوبات در حال اجرا
                </div>
              </div>
            </div>
            <div class="acc-committee-hero-btn">
              ورود به کمیته‌ها ‹
            </div>
          </div>

          <!-- شبکه کلیدهای میانبر اصلی -->
          <div class="acc-shortcuts-container">
            <div class="acc-shortcuts-hd">
              <div class="acc-shortcuts-title">
                <span>🗂️</span>
                <span>کلیدهای میانبر و فرآیندهای اصلی</span>
              </div>
              <span style="font-size:0.8rem;color:#94a3b8">دسترسی سریع به ماژول‌های پرکاربرد</span>
            </div>
            <div class="acc-master-grid">
              ${shortcutsHtml}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // بارگذاری داده‌های موتور تصمیم‌گیرنده
  loadAccDecisionEngine();

  // شمارش واقعی خطاهای باز برای بج (در صورت داشتن مجوز)
  const uPerms = (S.user && S.user.permissions) || [];
  if (uPerms.includes('manage_medical_error_reports')) {
    API.medicalErrors().then(res => {
      const list = res.reports || res.errors || (Array.isArray(res) ? res : []);
      const b = $('accErrorBadgeCount');
      if (b && list.length) b.textContent = `${fa(list.length)} مورد ثبت‌شده`;
    }).catch(() => {});
  }

  // انیمیشن‌های ورود
  const root=$('content');
  GAnim.staggerIn('.hub-h', root);
  GAnim.staggerIn('.hub-ring-wrap', root);
  GAnim.staggerIn('.secard', root);
  GAnim.staggerIn('.acc-alert-card', root);
  GAnim.staggerIn('.acc-mcard', root);
  root.querySelectorAll('.secard-bar > span[data-pct]').forEach((el,i)=>GAnim.growBar(el, +el.dataset.pct, {delay:.15+i*.08}));
  root.querySelectorAll('.secard-pctnum[data-pct]').forEach((el,i)=>GAnim.countUp(el, +el.dataset.pct, {suffix:'٪', toFa:fa, delay:.15+i*.08}));
  const ringVal=root.querySelector('.hub-ring-val[data-pct]');
  if(ringVal) GAnim.growRing(ringVal, +ringVal.dataset.pct, CIRC, {delay:.1});
  const ringNum=root.querySelector('.hub-ring-pctnum[data-pct]');
  if(ringNum) GAnim.countUp(ringNum, +ringNum.dataset.pct, {suffix:'٪', toFa:fa, delay:.1});
  GAnim.pulseNeedsFill('.secard.needs-fill .fillring', root);
}

// از کارت بخش، مستقیم به سنجه‌های همان بخش.
// اولین محورِ *در دسترسِ خودِ کاربر* انتخاب می‌شود، نه صرفاً اولین محورِ بخش؛ وگرنه
// برای نقشی که محور اولِ بخش را ندارد، renderMeasures به محورِ mine[0] برمی‌گشت که
// ممکن بود اصلاً در بخشِ کلیک‌شده نباشد — یعنی کاربر روی «ب» می‌زد و در «الف» می‌افتاد.
function openSection(code){
  S.openSec=code;
  S.accDepth=1;
  const mine=myAxes();
  const firstAx=(mine.find(x=>x.sec.code===code)||{}).ax;
  if(firstAx) S.axis=firstAx.code;
  saveMeasuresSubState();
  if (typeof HassanState !== 'undefined') {
    HassanState.currentSubView = 'grid';
    HassanState.selectedAxisCode = null;
    HassanState.selectedAxisTitle = '';
    HassanState.selectedStandardCode = null;
    HassanState.selectedStandardTitle = '';
  }
  if (code === 'ب') {
    if (typeof HassanState !== 'undefined') HassanState.currentSection = 'care';
    if (window.history && history.pushState) history.pushState(null, '', '#acc/care');
    else location.hash = '#acc/care';
  } else if (code === 'الف') {
    if (typeof HassanState !== 'undefined') HassanState.currentSection = 'management';
    if (window.history && history.pushState) history.pushState(null, '', '#acc/management');
    else location.hash = '#acc/management';
  } else if (code === 'ج') {
    if (typeof HassanState !== 'undefined') HassanState.currentSection = 'support';
    if (window.history && history.pushState) history.pushState(null, '', '#acc/support');
    else location.hash = '#acc/support';
  }
  go('measures', { skipHashUpdate: true });
}

function renderDutiesHub(){
  GAnim.killAllIn($('content'));
  $('ptitle').textContent='مسئولیت من';
  const roleFa=ROLE_FA[S.user.role_code]||S.user.role_title||'';
  const mine=[{k:'inbox',t:'کارتابل من',i:ic('inbox')},{k:'messages',t:'پیام‌های داخلی',i:ic('message')},
    {k:'activities',t:'ثبت فعالیت‌ها',i:ic('pulse')},{k:'calendar',t:'تقویم',i:ic('calendar')},
    {k:'dash',t:'داشبورد من',i:ic('dashboard')},{k:'guide',t:'راهنمای نقش من',i:ic('help')}]
    .filter(c=>c.k!=='activities'||canSeeActivities());
  // چیدمانِ تازه، طبق بازخورد «رابط خیلی شلوغ است» و «هر کاربر باید بداند روزانه
  // چه کار کند»: اولین چیزی که دیده می‌شود «کار من» است — امروز، این هفته، این
  // ماه. بقیه (پیشرفت، شرح وظایف قانونی، کاتالوگ وظایف، میان‌برها) به بخش‌های
  // جمع‌شونده‌ی بسته منتقل شدند. هیچ‌چیز حذف نشده؛ فقط چیزی که هر روز لازم است
  // بالا آمده و چیزی که ماهی یک‌بار لازم است، یک کلیک پایین‌تر رفته.
  $('content').innerHTML=`
    <div class="hub">
      <div class="hub-role g">
        <div class="hub-role-t">${esc(roleFa)}</div>
        <div class="hub-role-s">${esc(S.user.full_name||'')} · ${esc(S.user.hospital_name||'')}</div>
        <button class="btn btn-o btn-sm noprint" onclick="printDutiesHub()" style="align-self:flex-start">${ic('print')} چاپ کارهای من</button>
      </div>
      <div id="myWork" class="mywork"><div class="dempty">در حال بارگذاری کارهای شما…</div></div>
      <details class="hub-fold">
        <summary class="hub-fold-h">پیشرفت کارها به تفکیک دوره</summary>
        <div id="periodProg" class="pprog"><div class="dempty">در حال بارگذاری…</div></div>
      </details>
      <details class="hub-fold">
        <summary class="hub-fold-h">کارهای دوره‌ای من در سامانه</summary>
        <div id="dutyList"><div class="dempty">در حال بارگذاری…</div></div>
      </details>
      <details class="hub-fold">
        <summary class="hub-fold-h">شرح وظایف قانونی این سمت</summary>
        <div id="legalList"><div class="dempty">در حال بارگذاری…</div></div>
      </details>
      <details class="hub-fold">
        <summary class="hub-fold-h">میان‌برها</summary>
        <div class="hcard-grid">${mine.map(c=>hubCardHtml(c.k,c.t,c.i)).join('')}</div>
      </details>
    </div>`;  const root=$('content');
  GAnim.staggerIn('.hub-role', root);
  loadMyWork();
  loadDuties();
  loadLegalDuties();
  loadPeriodProgress();
}

// چاپ «مسئولیت من» — کارهای بازِ امروز/این هفته/این ماه برای یک کاربر.
// منبع همان داده‌ی صفحه است (MYWORK) تا پرینت با آنچه کاربر می‌بیند یکی باشد.
function printDutiesHub(){
  const secs=(typeof MYWORK_SECS!=='undefined'?MYWORK_SECS:[]).map(s=>({k:s.k,t:s.t}));
  if(!secs.length){ toast('کاری برای چاپ نیست',true); return; }
  const rows=secs.map(s=>{
    const box=document.getElementById('my-'+s.k)||document.getElementById(s.k);
    const items=box?[...box.querySelectorAll('.tk,.tktitle,.tkt,.mywork-item,.titem')].map(e=>(e.innerText||'').trim()).filter(Boolean):[];
    return [s.t, items.length?items.length+' کار':(box?'خالی':'—')];
  });
  printListSheet({
    page:'duties', title:'مسئولیت من — کارهای باز', code:'RPT-DUT',
    intro:'کارهای بازِ این سمت به تفکیک بازه‌ی زمانی.',
    meta:[['سمت', ROLE_FA[S.user.role_code]||S.user.role_title||'—'],
          ['کاربر', S.user.full_name||'—']],
    headers:['بازه','وضعیت'],
    rows,
    foot:'مسئولیت من',
  });
}

// «کار من» — امروز / این هفته / این ماه.
//
// سه ستون نیست، سه بخشِ پشتِ‌هم است: روی موبایل ستون‌ها آن‌قدر باریک می‌شدند که
// عنوانِ هر کار دو خط می‌شکست، و اولین چیزی که کاربر می‌بیند نباید شکسته باشد.
// «امروز» همیشه باز است؛ دو تای دیگر فقط وقتی خالی نیستند.
const MYWORK_SECS=[
  {k:'today', t:'امروز', hint:'کارهایی که سررسیدشان گذشته یا همین حالا باز است'},
  {k:'week',  t:'این هفته', hint:'تا هفت روز آینده سررسید می‌شوند'},
  {k:'month', t:'این ماه', hint:'کارِ دوره‌ای این ماه'},
];
async function loadMyWork(){
  const box=$('myWork'); if(!box) return;
  try{
    const r=await API.myWork();
    if(!r.total){
      // صفحه‌ی خالی به کسی نمی‌گوید مسئولیتش چیست. وقتی کاری باقی نمانده،
      // همان کارهای انجام‌شده‌ی این دوره فهرست می‌شوند — هم تأیید است، هم
      // یادآوریِ اینکه شغلِ این سمت در سامانه چیست.
      const dn=r.done||[];
      box.innerHTML=`<div class="mw-clear g">
        <div class="mw-clear-i">✓</div>
        <div><b>کارِ سررسیدشده‌ای ندارید</b>
        <span>هر کاری که سررسید شود یا اتفاقی در ماژول‌های شما بیفتد، همین‌جا می‌آید.</span></div>
      </div>`+(dn.length?`<div class="mw-sec mw-done">
        <div class="mw-h"><b>انجام‌شده‌های این دوره</b><span class="mw-n">${fa(dn.length)}</span>
          <i>مسئولیت‌های شما که در دوره‌ی جاری ثبت شده‌اند</i></div>
        <div class="mw-list">${dn.map(it=>`
          <button type="button" class="mw-item" onclick="go('${esc(it.page)}')">
            <span class="mw-t">✓ ${esc(it.title)}</span>
            ${it.cadence?`<span class="mw-cad">${esc(it.cadence)}</span>`:''}
            <span class="mw-go">برو ◂</span>
          </button>`).join('')}</div>
      </div>`:'');
      return;
    }
    box.innerHTML=MYWORK_SECS.map(sec=>{
      const items=r[sec.k]||[];
      if(!items.length) return '';
      return `<div class="mw-sec mw-${sec.k}">
        <div class="mw-h"><b>${esc(sec.t)}</b><span class="mw-n">${fa(items.length)}</span>
          <i>${esc(sec.hint)}</i></div>
        <div class="mw-list">${items.map(it=>`
          <button type="button" class="mw-item" onclick="go('${esc(it.page)}')">
            <span class="mw-t">${esc(String(it.title).replace('{n}', fa(it.count==null?'':it.count)))}</span>
            <span class="mw-w">${esc(it.why||'')}</span>
            ${it.cadence?`<span class="mw-cad">${esc(it.cadence)}</span>`:''}
            <span class="mw-go">برو ◂</span>
          </button>`).join('')}</div>
      </div>`;
    }).join('');
    GAnim.staggerIn('.mw-item', box);
  }catch(e){
    box.innerHTML=`<div class="dempty">${esc(e.message||'خطا در بارگذاری کارها')}</div>`;
  }
}
