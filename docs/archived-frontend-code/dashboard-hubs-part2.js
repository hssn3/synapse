/**
 * Dashboard Hubs Part 2
 * Modular Frontend Component — Project 313
 */
    <span class="hcard-b">
      <span class="hcard-t">${esc(label)}${locked?' <span class="hcard-lock">🔒</span>':''}</span>
      <span class="hcard-d">${esc(CARD_DESC[k]||'')}</span>
    </span>
    <span class="hcard-go">‹</span>
  </button>`;
}

// تولید کارت بزرگ و شیوا برای جریان افقی کارهای اصلی (خواسته صریح کاربر: کارت‌های بزرگ و شیوا، بدون زیر هم بودن)
function hubCardLargeHtml(k, label, icon, idx, total){
  const locked=!featureEnabled(k);
  const desc = CARD_DESC[k] || '';
  const numBadge = (typeof idx === 'number') ? `ماژول ${fa(idx + 1)} از ${fa(total)}` : 'ماژول استاندارد';
  return `<button type="button" class="hcard-lg${locked?' locked':''}" onclick="go('${esc(k)}')" title="${esc(label)}">
    <div class="hcard-lg-top">
      <span class="hcard-lg-ic">${icon}</span>
      <span class="hcard-lg-badge">${numBadge}${locked?' 🔒':''}</span>
    </div>
    <div class="hcard-lg-body">
      <span class="hcard-lg-t">${esc(label)}</span>
      <span class="hcard-lg-d">${esc(desc)}</span>
    </div>
    <div class="hcard-lg-footer">
      <span class="hcard-lg-cta">ورود به ماژول ‹</span>
      <span style="font-size:0.75rem;color:rgba(255,255,255,0.38);letter-spacing:0.04em;direction:ltr">${esc(k.toUpperCase())}</span>
    </div>
  </button>`;
}

function hubCardConnectorHtml(){
  return `<div class="hub-card-connector" aria-hidden="true">
    <div class="hub-card-connector-line"></div>
  </div>`;
}

// حالتِ باز/بسته‌ی دسته‌های صفحه‌ی اعتباربخشی — برای حفظ سازگاری
function accCatState(){ try{ return JSON.parse(localStorage.getItem('acccats')||'{}'); }catch(e){ return {}; } }
function accCatOpen(t, dflt){ const st=accCatState(); return st[t]===undefined ? !!dflt : !!st[t]; }
function accCatToggle(t, open){
  const st=accCatState(); st[t]=!!open; localStorage.setItem('acccats',JSON.stringify(st));
}

// ناوبری و پرش سریع به سرشاخه‌های متصل در صفحه
window.scrollToBranch = function(branchKey){
  const el = $('branch_' + branchKey);
  if(el){
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.borderColor = 'var(--gd, #c9a84c)';
    el.style.boxShadow = '0 0 35px rgba(201,168,76,0.45)';
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.boxShadow = '';
    }, 1200);
  }
};

// بارگذاری و رندر هوشمند موتور تصمیم‌گیرنده اعتباربخشی
async function loadAccDecisionEngine() {
  const box = $('accDecisionEngine');
  if (!box) return;
  try {
    const data = await API.smartDecisions();
    if (!data) { box.remove(); return; }

    const top = data.topAction;
    const roadmap = data.roadmap || {};
    const measures = data.measuresAtRisk || [];

    box.innerHTML = `
      <div class="acc-decision-hd">
        <div class="acc-decision-title">
          <span>🧠</span>
          <span>موتور تصمیم‌گیرنده هوشمند سنجه‌های اعتباربخشی</span>
        </div>
        <div class="acc-decision-badge">
          <span>✨</span>
          <span>توصیه برخط بر اساس ${fa(520)} سنجه ملی</span>
        </div>
      </div>

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
    `;

    window.__accDecisionData = data;
  } catch (e) {
    if (box) box.remove();
  }
}

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
          <span>به پنل کاربری سامانه نوین جامع اطلاعات بیمارستانی و اعتباربخشی خوش آمدید</span>
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
