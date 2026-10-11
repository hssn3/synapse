/**
 * Corporate Catalog Part 2
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function openSystemCatalogModal(initialIndex = 0) {
  let anchor = '';
  if (typeof initialIndex === 'string') {
    anchor = initialIndex.startsWith('#') ? initialIndex : '#' + initialIndex;
  } else if (typeof initialIndex === 'number' && initialIndex > 0) {
    const map = ['hero', 'accreditation', 'clinical-sop', 'safety-never-events', 'intelligence', 'dana-copilot', 'comparison', 'demo'];
    anchor = '#' + (map[initialIndex] || 'hero');
  }
  const targetUrl = '/catalog.html' + anchor;
  try {
    const win = window.open(targetUrl, '_blank');
    if (win && !win.closed && typeof win.closed !== 'undefined') return;
  } catch (e) {}
  window.location.href = targetUrl;
  return;
  ACTIVE_CATALOG_CHAPTER = Math.max(0, Math.min(initialIndex, SYSTEM_CATALOG_CHAPTERS.length - 1));
  let overlay = $('systemCatalogOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'systemCatalogOverlay';
    overlay.className = 'cat-booklet-overlay';
    document.body.appendChild(overlay);
  }
  renderSystemCatalogModalContent();
  document.body.style.overflow = 'hidden';

  // کی‌بورد: کلیدهای چپ و راست برای ورق زدن آسان کاتالوگ
  window.onCatalogKeyDown = function(e) {
    if (e.key === 'ArrowLeft') {
      if (ACTIVE_CATALOG_CHAPTER < SYSTEM_CATALOG_CHAPTERS.length - 1) {
        ACTIVE_CATALOG_CHAPTER++;
        renderSystemCatalogModalContent();
      }
    } else if (e.key === 'ArrowRight') {
      if (ACTIVE_CATALOG_CHAPTER > 0) {
        ACTIVE_CATALOG_CHAPTER--;
        renderSystemCatalogModalContent();
      }
    } else if (e.key === 'Escape') {
      closeSystemCatalogModal();
    }
  };
  window.addEventListener('keydown', window.onCatalogKeyDown);
}

function closeSystemCatalogModal() {
  const overlay = $('systemCatalogOverlay');
  if (overlay) overlay.remove();
  document.body.style.overflow = '';
  if (window.onCatalogKeyDown) {
    window.removeEventListener('keydown', window.onCatalogKeyDown);
  }
}

function renderSystemCatalogModalContent() {
  const overlay = $('systemCatalogOverlay');
  if (!overlay) return;
  const ch = SYSTEM_CATALOG_CHAPTERS[ACTIVE_CATALOG_CHAPTER];

  // فهرست کشویی فصول
  const selectOptions = SYSTEM_CATALOG_CHAPTERS.map((c, i) => `
    <option value="${i}" ${i === ACTIVE_CATALOG_CHAPTER ? 'selected' : ''}>
      ${c.num}: ${c.icon} ${esc(c.title)}
    </option>
  `).join('');

  // آمار کلیدی
  const statsHtml = ch.stats.map(s => `
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(212,175,90,.2);border-radius:14px;padding:12px 14px;text-align:center">
      <div style="font-size:22px;font-weight:900;color:var(--gdl);font-family:var(--sf)">${esc(s.num)}</div>
      <div style="font-size:11.5px;color:var(--tm);margin-top:4px">${esc(s.lbl)}</div>
    </div>`).join('');

  // کارت‌های اینفوگرافیک با رنگ‌بندی شاداب
  const featureCardsHtml = (ch.featureCards || []).map(fc => `
    <div class="cat-feature-card" style="border-top:3px solid ${fc.color}">
      <div class="cat-feature-icon" style="background:${fc.bg};color:${fc.color}">${fc.icon}</div>
      <b style="font-size:13.5px;color:var(--th)">${esc(fc.title)}</b>
      <div style="font-size:11.5px;color:var(--td);line-height:1.8">${esc(fc.desc)}</div>
    </div>
  `).join('');

  // جریان فرآیند افقی (Rule 11)
  const flowStepsHtml = (ch.flowSteps || []).map((st, i) => `
    <div class="cat-step-card">
      <div class="cat-step-num">${st.step}</div>
      <b style="font-size:13px;color:var(--th);margin-bottom:6px">${esc(st.t)}</b>
      <div style="font-size:11.5px;color:var(--td);line-height:1.8">${esc(st.d)}</div>
    </div>
    ${i < ch.flowSteps.length - 1 ? `<div style="display:flex;align-items:center;color:var(--gdl);font-size:20px;opacity:.7;padding:0 2px" aria-hidden="true">⟵</div>` : ''}
  `).join('');

  // مقایسه با سیستم‌های سنتی
  const compHtml = (ch.comparison || []).map(cp => `
    <div style="flex:1;min-width:240px;background:${cp.highlight ? 'rgba(212,175,90,.07)' : 'rgba(0,0,0,.25)'};border:1px solid ${cp.highlight ? 'var(--gd)' : 'var(--bd)'};border-radius:16px;padding:18px">
      <div style="font-size:13.5px;font-weight:800;color:${cp.highlight ? 'var(--gdl)' : 'var(--tm)'};margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <span>${cp.highlight ? '★' : '▫️'}</span><span>${esc(cp.title)}</span>
      </div>
      <ul style="margin:0;padding-inline-start:18px;font-size:12px;color:var(--td);line-height:1.9">
        ${cp.items.map(it => `<li style="margin-bottom:4px">${esc(it)}</li>`).join('')}
      </ul>
    </div>`).join('');

  // نقطه‌های پیشرفت فصول — کاربر همیشه بداند کجای کاتالوگ است (خواسته: مرتب و مشخص، نه گیج‌کننده)
  const dotsHtml = SYSTEM_CATALOG_CHAPTERS.map((c, i) => `
    <span title="${esc(c.num)}: ${esc(c.title)}" onclick="ACTIVE_CATALOG_CHAPTER=${i};renderSystemCatalogModalContent()"
      style="width:${i === ACTIVE_CATALOG_CHAPTER ? '26px' : '9px'};height:9px;border-radius:99px;cursor:pointer;transition:all .25s;background:${i === ACTIVE_CATALOG_CHAPTER ? 'var(--gdl)' : (i < ACTIVE_CATALOG_CHAPTER ? 'rgba(212,175,90,.55)' : 'rgba(255,255,255,.18)')}"></span>
  `).join('');

  // سرفصل شماره‌دار بخش‌ها — هر بخش صفحه شماره و نام مشخص دارد تا گیج‌کننده نباشد
  const secHead = (n, icon, t) => `
    <div style="font-size:14px;font-weight:800;color:var(--th);margin-bottom:14px;display:flex;align-items:center;gap:8px">
      <span style="min-width:26px;height:26px;border-radius:8px;background:rgba(212,175,90,.14);border:1px solid rgba(212,175,90,.4);color:var(--gdl);display:inline-flex;align-items:center;justify-content:center;font-size:13px">${fa(n)}</span>
      <span>${icon}</span><span>${t}</span>
    </div>`;

  overlay.innerHTML = `
    <!-- نوار هدر بالای کاتالوگ -->
    <div class="cat-booklet-topbar">
      <div class="cat-brand">
        <div class="lmark sm shine anim" style="width:38px;height:38px;font-size:18px;border-radius:10px">✦</div>
        <div>
          <b style="font-size:14px;color:var(--th)">کاتالوگ رسمی و دیجیتال ابر سامانه بیمارستان</b>
          <div style="font-size:11px;color:var(--tm)">ارائه جامع امکانات، فرآیندها و مقایسه با روش‌های سنتی</div>
        </div>
      </div>
      <div class="cat-controls">
        <select class="cat-toc-select" onchange="ACTIVE_CATALOG_CHAPTER=parseInt(this.value);renderSystemCatalogModalContent()">
          ${selectOptions}
        </select>
        <span class="cat-page-counter">صفحه ${fa(ACTIVE_CATALOG_CHAPTER + 1)} از ${fa(SYSTEM_CATALOG_CHAPTERS.length)}</span>
        <button class="btn btn-o btn-sm" onclick="ACTIVE_CATALOG_CHAPTER=Math.max(0,ACTIVE_CATALOG_CHAPTER-1);renderSystemCatalogModalContent()"
          ${ACTIVE_CATALOG_CHAPTER === 0 ? 'disabled style="opacity:.3"' : ''}>▸ قبلی</button>
        <button class="btn btn-g btn-sm" onclick="ACTIVE_CATALOG_CHAPTER=Math.min(SYSTEM_CATALOG_CHAPTERS.length-1,ACTIVE_CATALOG_CHAPTER+1);renderSystemCatalogModalContent()"
          ${ACTIVE_CATALOG_CHAPTER === SYSTEM_CATALOG_CHAPTERS.length - 1 ? 'disabled style="opacity:.3"' : ''}>بعدی ◂</button>
        <button class="btn btn-o btn-sm" onclick="closeSystemCatalogModal()" style="border-radius:20px">✕ بستن</button>
      </div>
    </div>

    <!-- بدنه اصلی صفحه کاتالوگ -->
    <div class="cat-booklet-body">
      <div class="cat-sheet">
        <!-- تیتر و برچسب فصل -->
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:26px">${ch.icon}</span>
            <span class="lpill" style="margin:0;font-size:12px"><span class="ldot"></span> ${esc(ch.num)}: ${esc(ch.badge)}</span>
          </div>
          <h2 style="margin:6px 0;font-size:22px;color:var(--th);font-weight:900">${esc(ch.title)}</h2>
          <div style="font-size:13.5px;color:var(--gdl);font-weight:700">${esc(ch.sub)}</div>
        </div>

        <!-- کتیبه گیومه بیانیه ارزش (طراحی اولیه حسن) -->
        ${secHead(1, '💬', 'بیانیه ارزش این فصل:')}
        <div class="cat-quote-box ${ch.quoteClass || ''}">
          <div class="q-mark">“</div>
          <div>${esc(ch.quote)}</div>
        </div>

        <!-- شاخص‌های آماری -->
        ${secHead(2, '📊', 'نگاه آماری در یک نگاه:')}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
          ${statsHtml}
        </div>

        <!-- کارت‌های قابلیت‌ها و مزایا (طراحی تمیز و متقارن) -->
        <div>
          ${secHead(3, '❖', 'قابلیت‌ها، ماژول‌ها و توانمندی‌های کلیدی:')}
          <div class="cat-feature-grid">
            ${featureCardsHtml}
          </div>
        </div>

        <!-- فرایند و چرخه گردش کار (جریان کاملاً افقی RTL طبق Rule 11) -->
        <div>
          ${secHead(4, '⟵', esc(ch.flowTitle))}
          <div class="cat-steps-axis">
            ${flowStepsHtml}
          </div>
        </div>

        <!-- مقایسه دوتایی با سیستم‌های سنتی -->
        <div>
          ${secHead(5, '⚖️', 'بررسی تطبیقی و وجه تمایز با سیستم‌های نسل قبل:')}
          <div style="display:flex;gap:14px;flex-wrap:wrap">
            ${compHtml}
          </div>
        </div>
      </div>
    </div>

    <!-- نوار ناوبری پایین کاتالوگ -->
    <div class="cat-bottom-nav">
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-o btn-sm" onclick="ACTIVE_CATALOG_CHAPTER=Math.max(0,ACTIVE_CATALOG_CHAPTER-1);renderSystemCatalogModalContent()"
          ${ACTIVE_CATALOG_CHAPTER === 0 ? 'disabled style="opacity:.3"' : ''}>▸ صفحه قبلی</button>
        <button class="btn btn-g btn-sm" onclick="ACTIVE_CATALOG_CHAPTER=Math.min(SYSTEM_CATALOG_CHAPTERS.length-1,ACTIVE_CATALOG_CHAPTER+1);renderSystemCatalogModalContent()"
          ${ACTIVE_CATALOG_CHAPTER === SYSTEM_CATALOG_CHAPTERS.length - 1 ? 'disabled style="opacity:.3"' : ''}>صفحه بعدی ◂</button>
        <span style="display:flex;gap:6px;align-items:center;margin-right:10px" title="فصول کاتالوگ — برای پرش کلیک کنید">${dotsHtml}</span>
      </div>
        <span style="font-size:12px;color:var(--td);margin-right:12px">از کلیدهای جهت‌نمای کی‌بورد (چپ / راست) نیز می‌توانید استفاده کنید.</span>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btn-g btn-sm shine anim" onclick="closeSystemCatalogModal();showHospitalPicker()">ورود به سامانه / انتخاب مرکز درمانی ›</button>
      </div>
    </div>
  `;
}

function svcBar(hid){
  const pub = PUB_SERVICES.map(s=>`
    <a class="svcbar-item" href="/public/${s.path}/${encodeURIComponent(hid)}">
      <span class="svcbar-ic">${s.ic}</span><span>${s.title}</span>
    </a>`).join('');
  return pub + `
    <button type="button" class="svcbar-item" onclick="openSystemCatalogModal()" style="border-color:rgba(212,175,90,.3)">
      <span class="svcbar-ic">📖</span><span>کاتالوگ آنلاین سامانه</span>
    </button>
    <button type="button" class="svcbar-item svc-login" id="svcLoginBtn" onclick="toggleLoginZone()">
      <span class="svcbar-ic">${ic('user')}</span><span>ورود کارکنان</span>
    </button>`;
}

// کارت‌های سمت تا وقتی کاربر روی «ورود کارکنان» نزده پنهان‌اند — طبق خواسته‌ی
// کارفرما، صفحه‌ی مرکز در نگاهِ اول فقط باید همان چند کارتِ کنارِ هم باشد، نه یک
// فهرستِ بلندِ ۱۹ سمتی که بلافاصله صفحه را پر می‌کند.
// حالتِ باز/بسته در sessionStorage می‌ماند. علتش یک گزارشِ واقعیِ کارفرما بود:
// «ورود کارکنان می‌زنم، سمت‌ها می‌آید، یهو غیب می‌شود». لاگِ HTTP نشان داد هیچ
// خطایی رخ نداده — بلکه ۱۶ ثانیه بعد یک `GET /` آمده، یعنی صفحه از نو بار شده
// (روی کروم موبایل، pull-to-refresh با یک کشیدنِ ساده رخ می‌دهد). با بارِ دوباره
// این ناحیه با کلاس hide ساخته می‌شد و کاربر می‌دید سمت‌ها ناپدید شدند.
//
// sessionStorage و نه localStorage: این یک ترجیحِ ماندگار نیست، فقط «کاربر همین
// حالا داشت وارد می‌شد». با بستنِ تب پاک می‌شود و دفعه‌ی بعد صفحه باز هم جمع‌وجور
// شروع می‌شود — همان چیزی که کارفرما خواسته بود.
const LOGINZONE_KEY='hosp_login_open';
function loginZoneWanted(){ try{ return sessionStorage.getItem(LOGINZONE_KEY)==='1'; }catch(e){ return false; } }
function setLoginZoneWanted(v){ try{ v? sessionStorage.setItem(LOGINZONE_KEY,'1') : sessionStorage.removeItem(LOGINZONE_KEY); }catch(e){} }

function toggleLoginZone(scroll){
  const z=$('loginZone'); if(!z) return;
  const open=z.classList.contains('hide');
  z.classList.toggle('hide', !open);
  const b=$('svcLoginBtn'); if(b) b.classList.toggle('on', open);
  const portal=$('login'); if(portal && portal.classList.contains('hosp-portal')) portal.classList.toggle('has-roles', open);
  setLoginZoneWanted(open);
  // هنگام بازگرداندنِ حالت پس از رفرش اسکرول نمی‌کنیم؛ پرشِ ناگهانیِ صفحه در
  // لحظه‌ی بارگذاری، خودش شبیهِ همان باگی است که داریم رفعش می‌کنیم.
  if(open && scroll!==false){
    setTimeout(()=>{
      const ghdr=$('ghdr');
      const hdrH=ghdr?ghdr.offsetHeight:78;
      const top=z.getBoundingClientRect().top+window.scrollY-hdrH-16;
      window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    },50);
  }
}

function renderLogin(){
  window.scrollTo(0,0);
  // مرکز از نشانی یا آخرین انتخاب کاربر
  const q=new URLSearchParams(location.search).get('hospital');
  const hid=q||localStorage.getItem(HOSP_KEY);
  if(hid) renderHospitalLogin(hid); else renderEntry();
}

// ---- مرحله ۱: صفحه‌ی ورودی عمومی (بدون مرکز مشخص) ----
// نشانی تماس از سرور می‌آید (SUPPORT_EMAIL / SUPPORT_PHONE). اگر هیچ‌کدام ست نشده
// باشد بخش «تماس با ما» اصلاً نمایش داده نمی‌شود — نبودنش از یک نشانی نمونه بهتر است.
// تا وقتی پاسخ نیامده، goContactPublic() باید منتظر بماند وگرنه به بخشی اسکرول می‌کند
// که هنوز پنهان است. یک Promise مشترک نگه می‌داریم تا هر دو مسیر از یک نتیجه استفاده کنند.
let SITE_CONTACT=null;
async function loadSiteContact(){
  const sec=$('pub-contact'), box=$('pub-contact-lines');
  if(!sec||!box) return;
  try{
    if(!SITE_CONTACT) SITE_CONTACT=API.get('/site-contact');
    const c=await SITE_CONTACT;
    const lines=[];
    if(c.email) lines.push(`<p><a class="ltr" href="mailto:${esc(c.email)}" style="color:var(--gdl)">${esc(c.email)}</a></p>`);
    if(c.phone) lines.push(`<p><a class="ltr" href="tel:${esc(c.phone)}" style="color:var(--gdl)">${esc(c.phone)}</a></p>`);
    if(!lines.length) return;   // چیزی پیکربندی نشده: بخش و لینک منو هر دو پنهان می‌مانند
    box.innerHTML=lines.join('');
    sec.classList.remove('hide');
    document.querySelectorAll('.navcontact').forEach(a=>a.classList.remove('hide'));
  }catch(e){
    // خطای شبکه نباید صفحه‌ی معرفی را خراب کند؛ دفعه‌ی بعد دوباره تلاش شود
    SITE_CONTACT=null;
  }
}
