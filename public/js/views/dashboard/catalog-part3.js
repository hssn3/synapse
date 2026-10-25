/**
 * Corporate Catalog Part 3
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
function renderEntry(){
  window.scrollTo(0,0);
  localStorage.removeItem(HOSP_KEY);
  setTimeout(initRevealOnScroll,30);
  setTimeout(loadSiteContact,0);
  $('root').innerHTML=`
  <div id="login" class="lscroll">
    <div class="lpage">
      <div class="ltop">
        <div class="ltop-brand"><img class="syn-lg" src="/img/synapse-header.png" alt="سیناپس" height="52">
          <div><span>سامانه یکپارچه نظارت، اعتباربخشی و پایش سلامت</span></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-o btn-sm shine" onclick="openSystemCatalogModal()" style="border-color:var(--gd);color:var(--gdl);font-weight:700;padding:4px 12px">📖 کاتالوگ آنلاین امکانات ✨</button>
          ${S.user?`<a href="javascript:void(0)" class="ltop-lnk" onclick="renderApp()">بازگشت به داشبورد ›</a>`:''}
        </div>
      </div>

      <div class="lhero g gold">
        <span class="lglow lglow-a" aria-hidden="true"></span>
        <span class="lglow lglow-b" aria-hidden="true"></span>
        <p class="lpill"><span class="ldot" aria-hidden="true"></span> سامانه یکپارچه نظارت، اعتباربخشی و پایش سلامت — یک بستر ابری</p>
        <h1>ابر سیستم مدیریت بیمارستان، <span class="lgrad">یکپارچه و شفاف</span></h1>
        <p>ساختار سازمانی و سلسله‌مراتب پرستاری، کارتابل و پیام‌رسانی، کمیته‌ها، مدیریت خطر و ایمنی بیمار،
           کارت امتیازی متوازن (BSC)، آموزش کارکنان و مستندات کنترل‌شده — و در کنار همه‌ی این‌ها، ماژول
           اعتباربخشی با درخت کامل سنجه‌های ویرایش ششم. همه در یک سامانه‌ی واحد برای هر مرکز درمانی.
           خدمات بدون‌ورود (گزارش خطا، FMEA، انتقادات، نظرسنجی رضایت و…) هم پس از انتخاب مرکز، مخصوص همان مرکز در دسترس‌اند.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;justify-content:center">
          <button class="btn btn-g shine anim" onclick="openSystemCatalogModal()" style="background:linear-gradient(135deg,#e0ab2e,#b88615);border:none;box-shadow:0 0 20px rgba(224,171,46,.45);font-weight:700">📖 کاتالوگ آنلاین و تور تعاملی امکانات سامانه ✨</button>
          <button class="btn btn-g" onclick="showHospitalPicker()">ورود به سامانه / انتخاب مرکز درمانی ›</button>
          <button class="btn btn-o" onclick="goFeaturesPublic()">مشاهده ماژول‌های سامانه</button>
        </div>
      </div>

      <div class="lsec reveal" id="pub-features">
        <span class="leyebrow">ماژول‌های سامانه</span>
        <h2 class="lsec-t">یک بستر برای همه‌ی لایه‌های مدیریت بیمارستان</h2>
        <p class="lsec-s">مجموعه‌ای یکپارچه از ساختار سازمانی، پرستاری، کیفیت و ایمنی بیمار، پلتفرم چندمستأجری — و اعتباربخشی به‌عنوان یکی از این ماژول‌ها:</p>
        <div class="pfgrid">${PUB_FEATURES.map(f=>`
          <div class="pfcard g"><span class="pfic">${f.ic}</span><b>${esc(f.t)}</b><span>${esc(f.d)}</span></div>
        `).join('')}</div>
      </div>

            <div class="lsec reveal" id="pub-showcase-teaser" style="padding-top:10px;padding-bottom:10px">
        <div class="cat-showcase-section">
          <div class="cat-laser-indicator"></div>
          
          <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:18px;margin-bottom:20px">
            <div>
              <div style="display:inline-flex;align-items:center;gap:10px;padding:6px 16px;background:rgba(16,160,185,0.14);border:1px solid rgba(16,160,185,0.4);border-radius:100px;color:#6ed5e7;font-size:0.8rem;font-weight:700;margin-bottom:12px">
                <span style="width:8px;height:8px;background:#34bbd3;border-radius:50%;box-shadow:0 0 10px #34bbd3"></span>
                <span>کاتالوگ دیجیتال و تعاملی // ویرایش ششم کشوری وزارت بهداشت</span>
              </div>
              <h2 style="font-size:1.75rem;font-weight:900;color:#ffffff;line-height:1.4;margin:0 0 8px 0">
                سیناپس — <span class="gold-gradient-text">کیفیت، ایمنی بیمار</span> و <span class="emerald-gradient-text">اعتباربخشی پیشرفته</span>
              </h2>
              <p style="font-size:0.92rem;color:var(--text-sub,#c7d8db);max-width:760px;line-height:1.85;margin:0">
                پلتفرم هوشمند انطباق با ۳۹۵ سنجه ملی، پایش بلادرنگ ۲۸ واقعه ناخواسته، اجرای افقی ۲۳ پروتکل بالینی SOP و هدایت‌شده با مغز هوش مصنوعی دانا.
              </p>
            </div>
            
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <a href="/catalog.html" target="_blank" class="btn-catalog-gold" style="font-size:0.88rem;padding:11px 22px">
                <span>📖 ورود به کاتالوگ تمام‌صفحه دیجیتال ✨</span>
                <span style="font-size:14px">↗</span>
              </a>
              <a href="/accreditation/policy.html" target="_blank" class="btn-catalog-emerald" style="font-size:0.88rem;padding:11px 20px">
                <span>📋 پورتال سنجه‌ها و خط‌مشی‌ها</span>
                <span style="font-size:14px">↗</span>
              </a>
            </div>
          </div>

          <!-- ۴ شاخص آماری کلیدی با کارت‌های گوشه‌پخ‌خورده ۳بعدی و هالوهای نوری -->
          <div class="stat-counters-grid">
            <div class="stat-counter-card folded-corner" onclick="openSystemCatalogModal('accreditation')" style="cursor:pointer">
              <div class="stat-icon-halo">
                <svg fill="none" height="30" viewbox="0 0 24 24" width="30">
                  <circle cx="12" cy="12" r="9" stroke="var(--gold-400,#ecd599)" stroke-dasharray="3 3" stroke-width="1.8"></circle>
                  <path d="M8 12l2.5 2.5L16 9" stroke="#fff0c7" stroke-linecap="round" stroke-width="2"></path>
                </svg>
              </div>
              <div class="stat-number gold-gradient-text">۳۹۵</div>
              <div class="stat-label">سنجه ملی مصوب</div>
              <div class="stat-meta">پوشش ۱۰۰٪ ویرایش ششم وزارت بهداشت</div>
            </div>

            <div class="stat-counter-card folded-corner" onclick="openSystemCatalogModal('safety-never-events')" style="cursor:pointer">
              <div class="stat-icon-halo">
                <svg fill="none" height="30" viewbox="0 0 24 24" width="30">
                  <path d="M12 2l8 4.5v6c0 5-3.5 9.5-8 11.5-4.5-2-8-6.5-8-11.5v-6l8-4.5z" stroke="#ef4444" stroke-width="1.8"></path>
                  <path d="M12 8v5M12 16h.01" stroke="#fca5a5" stroke-linecap="round" stroke-width="2"></path>
                </svg>
              </div>
              <div class="stat-number" style="color:#f87171;text-shadow:0 0 15px rgba(248,113,113,0.4)">۱۲۱</div>
              <div class="stat-label">پرچم ایمنی بیمار</div>
              <div class="stat-meta">پرچم ایمنی بیمار در کتاب ویرایش ششم</div>
            </div>

            <div class="stat-counter-card folded-corner" onclick="openSystemCatalogModal('accreditation')" style="cursor:pointer">
              <div class="stat-icon-halo">
                <svg fill="none" height="30" viewbox="0 0 24 24" width="30">
                  <rect height="16" rx="4" stroke="var(--emerald-400,#34bbd3)" stroke-width="1.8" width="16" x="4" y="4"></rect>
                  <path d="M9 12h6M12 9v6" stroke="#bbeef7" stroke-linecap="round" stroke-width="2"></path>
                </svg>
              </div>
              <div class="stat-number emerald-gradient-text">۱۸</div>
              <div class="stat-label">محور تخصصی</div>
              <div class="stat-meta">در ۳ هاب راهبردی، درمانی و پشتیبانی</div>
            </div>

            <div class="stat-counter-card folded-corner" onclick="openSystemCatalogModal('accreditation')" style="cursor:pointer">
              <div class="stat-icon-halo">
                <svg fill="none" height="30" viewbox="0 0 24 24" width="30">
                  <polygon fill="rgba(212,175,90,0.1)" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="var(--gold-400,#ecd599)" stroke-width="1.8"></polygon>
                </svg>
              </div>
              <div class="stat-number" style="color:var(--gold-300,#fff0c7);text-shadow:0 0 15px rgba(212,175,90,0.4)">۸۸</div>
              <div class="stat-label">استاندارد کشوری</div>
              <div class="stat-meta">با ماتریس شواهد و ممیزی ادواری</div>
            </div>
          </div>

          <!-- شبکه فصول و بخش‌های اختصاصی کاتالوگ -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin:28px 0 14px 0;flex-wrap:wrap;gap:10px">
            <div style="font-size:1.15rem;font-weight:900;color:#ffffff;display:flex;align-items:center;gap:8px">
              <span>✦</span><span>فصول و محورهای اصلی کاتالوگ دیجیتال سامانه:</span>
            </div>
            <span style="font-size:0.8rem;color:var(--text-muted,#96aeb2)">برای مشاهده جزئیات هر بخش کلیک کنید</span>
          </div>

          <div class="cat-chapters-grid">
            <a class="cat-chapter-box folded-corner" href="/catalog.html#accreditation" target="_blank">
              <div>
                <span class="cat-chapter-tag">بخش ۱ // ارزیابی</span>
                <div class="cat-chapter-title">🏛️ موتور سنجه‌ها و اعتباربخشی</div>
                <div class="cat-chapter-desc">۳ هاب کلان، ۸۸ استاندارد، درخت کامل ۳۹۵ سنجه با بارگذاری سبک و چک‌لیست‌های رسمی</div>
              </div>
              <div class="cat-chapter-link"><span>مشاهده فصل و سنجه‌ها</span> <span>⟵</span></div>
            </a>

            <a class="cat-chapter-box folded-corner" href="/catalog.html#clinical-sop" target="_blank">
              <div>
                <span class="cat-chapter-tag">بخش ۲ // درمان و بالین</span>
                <div class="cat-chapter-title">🩺 فرآیندهای ۲۳گانه SOP بالینی</div>
                <div class="cat-chapter-desc">مهار فیزیکی، تلفیق دارویی، سقوط مورس، جراحی ایمن WHO، هموویژیلانس و کنترل عفونت</div>
              </div>
              <div class="cat-chapter-link"><span>مشاهده مسیر افقی SOP</span> <span>⟵</span></div>
            </a>

            <a class="cat-chapter-box folded-corner" href="/catalog.html#safety-never-events" target="_blank">
              <div>
                <span class="cat-chapter-tag" style="background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.4);color:#fca5a5">بخش ۳ // ایمنی بیمار</span>
                <div class="cat-chapter-title">🛡️ وقایع ۲۸گانه Never Events</div>
                <div class="cat-chapter-desc">گزارش‌دهی محرمانه ۲۴ ساعته بدون سرزنش، ماژول ریشه‌یابی خطای RCA و متدولوژی FMEA</div>
              </div>
              <div class="cat-chapter-link"><span>مشاهده سیستم ایمنی</span> <span>⟵</span></div>
            </a>

            <a class="cat-chapter-box folded-corner" href="/catalog.html#intelligence" target="_blank">
              <div>
                <span class="cat-chapter-tag">بخش ۴ // داشبورد مدیران</span>
                <div class="cat-chapter-title">📊 کارت امتیازی (BSC) و نظارت</div>
                <div class="cat-chapter-desc">۴ منظر مالی، فرایند، یادگیری و مشتری؛ محاسبه هوشمند تارگت‌ها و توزیع زنده شیفت‌ها</div>
              </div>
              <div class="cat-chapter-link"><span>مشاهده هوش مدیریتی</span> <span>⟵</span></div>
            </a>

            <a class="cat-chapter-box folded-corner" href="/catalog.html#dana-copilot" target="_blank">
              <div>
                <span class="cat-chapter-tag" style="background:rgba(16,160,185,0.15);border-color:rgba(16,160,185,0.4);color:#6ed5e7">بخش ۵ // هوش مصنوعی</span>
                <div class="cat-chapter-title">🧠 دستیار هوشمند بالینی دانا</div>
                <div class="cat-chapter-desc">تسلط بر کلیه سنجه‌ها، ارزیابی عدم‌انطباق‌ها، پیشنهاد CAPA و بازیابی فوری شواهد</div>
              </div>
              <div class="cat-chapter-link"><span>مشاهده دستیار دانا AI</span> <span>⟵</span></div>
            </a>

            <a class="cat-chapter-box folded-corner" href="/catalog.html#comparison" target="_blank">
              <div>
                <span class="cat-chapter-tag">بخش ۶ // مقایسه</span>
                <div class="cat-chapter-title">⚖️ ماتریس تمایز با سیستم‌های سنتی</div>
                <div class="cat-chapter-desc">مقایسه ویژگی‌به‌ویژگی پلتفرم نسل ششم ما با نرم‌افزارهای قدیمی و سیستم‌های دستی</div>
              </div>
              <div class="cat-chapter-link"><span>مشاهده جدول مقایسه</span> <span>⟵</span></div>
            </a>

            <a class="cat-chapter-box folded-corner" href="/accreditation/policy.html" target="_blank">
              <div>
                <span class="cat-chapter-tag">بخش ۷ // مستندات رسمی</span>
                <div class="cat-chapter-title">📑 خط‌مشی‌ها، چک‌لیست و فلوچارت</div>
                <div class="cat-chapter-desc">پورتال تمام‌صفحه مستقل با سربرگ استاندارد A4، امضاهای رسمی و گردش تأیید اعتباربخشی</div>
              </div>
              <div class="cat-chapter-link"><span>مشاهده پورتال اسناد</span> <span>⟵</span></div>
            </a>

            <a class="cat-chapter-box folded-corner" href="/catalog.html#demo" target="_blank">
              <div>
                <span class="cat-chapter-tag" style="background:rgba(212,175,90,0.22);color:#fff">بخش ۸ // استقرار</span>
                <div class="cat-chapter-title">🚀 جلسه دمو و ارزیابی مقدماتی</div>
                <div class="cat-chapter-desc">آمادگی بیمارستان برای رتبه یک عالی، همراه با مشاوره کارشناسان ارشد ارزیابی کشوری</div>
              </div>
              <div class="cat-chapter-link"><span>رزرو جلسه ارزیابی</span> <span>⟵</span></div>
            </a>
          </div>

        </div>
      </div>

      <div class="lsec reveal" id="pub-process">
        <span class="leyebrow">مسیر استقرار</span>
        <h2 class="lsec-t">از راه‌اندازی سامانه تا اعتباربخشی موفق</h2>
        <p class="lsec-s">مدیریت روزمره‌ی بیمارستان از یک مجموعه ابزار پراکنده، به یک جریان کاری یکپارچه و قابل‌پیگیری تبدیل می‌شود — که اعتباربخشی هم بخشی طبیعی از همان جریان است:</p>
        <ol class="lsteps">
          <li class="lstep g"><b aria-hidden="true">۱</b><h4>پیکربندی مرکز</h4><p>تعریف ساختار سازمانی، بخش‌ها، سلسله‌مراتب پرستاری، نقش‌ها و دسترسی‌ها روی بستر اختصاصی مرکز.</p></li>
          <li class="lstep g"><b aria-hidden="true">۲</b><h4>راه‌اندازی ماژول‌ها</h4><p>کمیته‌ها، کارتابل، BSC و — در کنار همه‌ی این‌ها — درخت کامل سنجه‌های اعتباربخشی ویرایش ششم.</p></li>
          <li class="lstep g"><b aria-hidden="true">۳</b><h4>پایش و مستندسازی</h4><p>ثبت روزمره‌ی شواهد، خودارزیابی، ممیزی داخلی و اقدامات اصلاحی.</p></li>
          <li class="lstep g"><b aria-hidden="true">۴</b><h4>ممیزی رسمی</h4><p>خروجی یکپارچه و آماده‌ی ارائه به تیم ارزیاب، بدون آشفتگی لحظه‌ی آخر.</p></li>
        </ol>
      </div>

      <div class="lsec reveal" id="pub-about">
        <h2 class="lsec-t">درباره ما</h2>
        <div class="lhero g" style="padding:26px">
          <p>سامانه‌ی جامع مدیریت بیمارستانی، برای پشتیبانی مراکز درمانی در ساختار سازمانی، سلسله‌مراتب
             پرستاری، کارتابل و ارتباطات داخلی، کمیته‌ها، کیفیت و ایمنی بیمار ساخته شده است — و
             اعتباربخشی (با تمرکز بر استانداردهای ملی ویرایش ششم) یکی از ماژول‌های همین سامانه است،
             نه کل آن. هر مرکز درمانی به‌صورت مستقل و با داده‌ها و کاربران خودش از سامانه استفاده می‌کند.</p>
        </div>
      </div>

      <div class="lsec reveal hide" id="pub-contact">
        <h2 class="lsec-t">تماس با ما</h2>
        <div class="lhero g" style="padding:26px">
          <p>برای پشتیبانی، راه‌اندازی مرکز جدید یا سؤالات مربوط به سامانه:</p>
          <div id="pub-contact-lines" style="margin-top:8px"></div>
        </div>
      </div>

      <div class="lsec reveal" id="pub-cta">
        <div class="lcta-band g gold">
          <span class="leyebrow">شروع کنید</span>
          <h2 class="lsec-t" style="justify-content:center">همین امروز مرکز درمانی خود را وارد سامانه کنید</h2>
          ${/* «ورود کارکنان» این‌جا کلیک‌پذیر است، چون کارفرما روی همین عبارت
               کلیک کرد و هیچ اتفاقی نیفتاد: عبارتی که کاربر دنبالش می‌گردد در
               متن بود ولی دکمه‌اش نامِ دیگری داشت. متنِ توضیحی که واژه‌ی
               کلیدیِ کاربر را دارد، خودش باید در را باز کند. */''}
          <p class="lsec-s" style="max-width:640px;margin:0 auto 18px">با انتخاب مرکز خود، هم به
            <a href="javascript:void(0)" onclick="showHospitalPicker()" style="color:var(--gdl);font-weight:700;text-decoration:underline">فرم ورود کارکنان</a>
            و هم خدمات بدون‌ورود مخصوص همان مرکز دسترسی خواهید داشت.</p>
          <button class="btn btn-g" onclick="showHospitalPicker()">ورود کارکنان / انتخاب مرکز ›</button>
        </div>
      </div>

      <div class="lsec hide" id="hpick">
        <h2 class="lsec-t">انتخاب مرکز</h2>
        <p class="lsec-s">مرکز درمانی خود را از فهرست زیر انتخاب کنید — پس از انتخاب، دکمه‌ی
           <b>«ورود کارکنان»</b> را بزنید تا فهرست سمت‌ها باز شود. خدمات بدون‌ورودِ همان مرکز
           هم در همان صفحه است.</p>
        <div class="hpick-card g gold">
          <input id="hpsearch" class="dsearch" placeholder="نام مرکز موردنظر را جست‌وجو کنید…" oninput="renderPickList()">
          <div id="hplist"><div class="dempty">در حال بارگذاری فهرست مراکز…</div></div>
        </div>
      </div>
    </div>
  </div>`;
  loadPublicHospitals();
}
function showHospitalPicker(){
  const el=$('hpick'); if(!el) return;
  el.classList.remove('hide');
  el.scrollIntoView({behavior:'smooth',block:'start'});
  const s=$('hpsearch'); if(s) s.focus();
}
async function loadPublicHospitals(){
  try{ const {hospitals}=await API.publicHospitals(); PUB_HOSPS=hospitals||[]; renderPickList(); }
  catch(e){ const l=$('hplist'); if(l) l.innerHTML=`<div class="dempty">${esc(e.message)}</div>`; }
}
function renderPickList(){
  const wrap=$('hplist'); if(!wrap) return;
  const q=($('hpsearch')?.value||'').trim().toLowerCase();
  const list=PUB_HOSPS.filter(h=>!q||(h.name||'').toLowerCase().includes(q));
  if(!list.length){ wrap.innerHTML='<div class="dempty">مرکزی با این نام یافت نشد</div>'; return; }
  wrap.innerHTML=`<div class="hpgrid">${list.map(h=>`
    <button type="button" class="hpitem" onclick="pickHospital('${esc(h.id)}')">
      <span class="hplogo">${h.has_logo
        ? `<img src="/api/public/hospital/${encodeURIComponent(h.id)}/logo" alt="" onerror="this.parentNode.textContent='▣'">`
        : '▣'}</span>
      <b>${esc(h.name)}</b>
    </button>`).join('')}</div>`;
}
function pickHospital(id){
  localStorage.setItem(HOSP_KEY,id);
  history.replaceState(null,'','/?hospital='+encodeURIComponent(id));
  window.scrollTo(0,0);
  renderHospitalLogin(id);
}
function backToPicker(){
  localStorage.removeItem(HOSP_KEY);
  history.replaceState(null,'','/');
  renderEntry();
}

// ---- مرحله ۲: صفحه‌ی اختصاصی یک مرکز — بدون فرم لاگین؛ ورود فقط با کلیک روی کاشیِ سمت ----
// طبق تصمیم: در این صفحه دیگر نام هیچ مرکز دیگری نشان داده نمی‌شود (نه فهرست، نه لینک
// «انتخاب مرکز دیگر») — کاربر یا مستقیم با QR/نشانی همین مرکز وارد شده یا از صفحه‌ی
// ورودی عمومی انتخابش کرده و دیگر نیازی به دیدن رقبا/سایر مراکز ندارد.
async function renderHospitalLogin(hid){
  window.scrollTo(0,0);
  if(document.documentElement) document.documentElement.scrollTop=0;
  if(document.body) document.body.scrollTop=0;
  const isWanted=loginZoneWanted();
  $('root').innerHTML=`
  <div id="login" class="lscroll hosp-portal${isWanted?' has-roles':''}">
    <div class="lpage narrow">
      <div class="lcard g gold">
        <div class="lbrand">
          <div class="lmark shine anim" id="hlogo"><img class="syn-ico" src="/img/synapse-mark-64.png" alt="سیناپس" width="26" height="26"></div>
          <h1 id="hname">در حال بارگذاری…</h1>
          <p>خدمت مورد نظر خود را انتخاب کنید</p>
        </div>
        <div id="lerr" style="color:var(--dn);font-size:13px;margin-bottom:10px;display:none"></div>
        <div class="svcbar" id="svcbar">${svcBar(hid)}</div>
        <div id="loginZone" class="hide">
          <div class="lcard-sep"><span>سمت خود را انتخاب کنید</span></div>
          <div id="roleMosaic"><div class="dempty">در حال بارگذاری سمت‌ها…</div></div>
        </div>
      </div>
    </div>
  </div>`;
  loadHospitalRoles(hid);
  // اگر کاربر پیش از رفرش «ورود کارکنان» را زده بود، همان‌جا بازش می‌کنیم.
  if(isWanted) toggleLoginZone(false);
  try{
    const {hospital}=await API.publicHospital(hid);
    const nm=$('hname'); if(nm) nm.textContent=hospital.name;
    if(hospital.has_logo){
      const lm=$('hlogo');
      if(lm){ lm.classList.add('img');
        lm.innerHTML=`<img src="/api/public/hospital/${encodeURIComponent(hid)}/logo" alt=""
          onerror="this.parentNode.classList.remove('img');this.parentNode.textContent='✦'">`; }
    }
  }catch(e){
    // فقط «واقعاً پیدا نشد» یعنی شناسه‌ی ذخیره‌شده بی‌اعتبار است و باید به انتخاب مرکز برگردیم.
    // قبلاً هر خطایی همین رفتار را داشت: یک قطعی لحظه‌ای شبکه، خطای ۵۰۰ یا خوردن به سقف
    // درخواست، کاربر را بی‌صدا به صفحه‌ی اول پرت می‌کرد بدون آنکه بفهمد چه شد.
    if(e && e.status===404){ backToPicker(); return; }
    const nm=$('hname'); if(nm) nm.textContent='این مرکز درمانی';
    const box=$('lerr');
    if(box){
      box.style.display='block';
      box.innerHTML=`${esc(e.message||'ارتباط با سرور برقرار نشد')} — `+
        `<a href="javascript:void(0)" onclick="renderHospitalLogin('${esc(hid)}')">تلاش دوباره</a>`;
    }
  }
}

// آیکون هر سمت — نامِ آیکون از ست SVG (public/js/icons.js). قبلاً کاراکترهای
// یونیکد بودند که روی هر سیستم‌عامل شکل دیگری می‌گرفتند و کنار متن ناهمگون
// می‌نشستند. نگاشت‌نشده‌ها آیکون خنثای پیش‌فرض می‌گیرند.
const ROLE_ICONS={
  admin:'settings', hospital_president:'badge', technical_officer:'shield',
  accreditation_manager:'clipboard', quality_control_manager:'target',
  nursing_director:'stethoscope', clinical_supervisor:'pulse',
  infection_control_supervisor:'shield', education_supervisor:'graduation',
  nursing_office_assistant:'doc', breastfeeding_specialist:'heart',
  staff_nurse:'bed', hr_manager:'users', financial_manager:'chart',
  accounting_manager:'scale', nutrition_manager:'heart',
  occupational_health_officer:'shield', environmental_health_officer:'flag',
  anonymous_reporter:'message'
};
function roleIcon(code){ return ic(ROLE_ICONS[code]||'user'); }

let HOSP_ROLES=[]; let REQUIRE_PW=false; let CUR_HID=null;
async function loadHospitalRoles(hid){
  CUR_HID=hid;
  const box=$('roleMosaic'); if(!box) return;
  try{
    const {roles,require_password}=await API.hospitalRoles(hid);
    HOSP_ROLES=roles||[]; REQUIRE_PW=!!require_password;
    if(!HOSP_ROLES.length){ box.innerHTML='<div class="dempty">هنوز کاربری برای این مرکز تعریف نشده</div>'; return; }
    renderRoleMosaic();
  }catch(e){ box.innerHTML=`<div class="dempty">${esc(e.message)}</div>`; }
}
const ROLE_OPEN=new Set();
function toggleRoleTile(roleId){
  if(ROLE_OPEN.has(roleId)) ROLE_OPEN.delete(roleId); else ROLE_OPEN.add(roleId);
  renderRoleMosaic();
}
// سلسله‌مراتب: سمت‌ها به شکل یک چارت عمودی چیده می‌شوند — بالاترین رده در بالا و
// هر رده با یک پله تورفتگی زیر رده‌ی بالادستش. ترتیب و عمق از roles.hierarchy_order
// و hierarchy_level می‌آید که سوپرادمین با کشیدن کارت‌ها تنظیمشان می‌کند.
// قبلاً یک شبکه‌ی چهارستونه بود و «ریاست بیمارستان» وسط شبکه گم می‌شد.
// هر ردیف یک «سمت» است، بدون نمایش اسم افراد. اگر آن سمت چند نفره باشد، با کلیک باز
// می‌شود و کاربران همان سمت موزاییکی درون همان ردیف می‌آیند (اینجا نام لازم است).
// دسته‌بندی سمت‌ها برای صفحه‌ی ورود — مدیران کنار هم، سوپروایزرها کنار هم،
// کادر درمان کنار هم. کارفرما همین را خواست و درست هم هست: چارتِ عمودیِ قبلی
// یک ستونِ نوزده‌ردیفه بود که کاربر باید تا ته اسکرول می‌کرد تا سمتِ خودش را
// پیدا کند.
//
// چرا نگاشتِ صریحِ کد نقش و نه صرفاً hierarchy_level: در همین دیتابیس، رده‌ی ۲
// هم «مدیر منابع انسانی» را دارد و هم «سوپروایزر بالینی» را — یعنی سطحِ چارت،
// نوعِ سمت را از هم جدا نمی‌کند. برای نقشی که در نگاشت نیست، از روی خودِ عنوان
// حدس زده می‌شود (سوپروایزر/پرستار/مدیر) و در آخرین حالت به رده‌ی چارت
// برمی‌گردیم، تا مرکزی که سمتِ سفارشی تعریف کرده همه‌چیزش در «سایر» نیفتد.
const ROLE_BANDS=[
  { k:'exec', t:'ریاست و مدیریت ارشد',
    codes:['hospital_president','technical_officer','admin','hospital_admin','nursing_director',
           'accreditation_manager','quality_control_manager','quality_manager'] },
  { k:'unit', t:'مدیران و مسئولان واحدها',
    codes:['hr_manager','hr_officer','financial_manager','accounting_manager','nutrition_manager',
           'occupational_health_officer','environmental_health_officer','env_health','safety_officer',
           'equipment','pharmacist','lab_manager','imaging_manager','blood_bank','him_officer','disaster_officer'] },
  { k:'sup', t:'سوپروایزرها و دفتر پرستاری',
    codes:['clinical_supervisor','education_supervisor','infection_control_supervisor','infection_supervisor',
           'nursing_office_assistant','head_nurse'] },
  { k:'care', t:'کادر درمان',
    codes:['staff_nurse','breastfeeding_specialist','breastfeeding','social_worker'] },
  { k:'other', t:'سایر', codes:[] },
];
function bandOf(r){
  const code=r.role_code||'';
  const b=ROLE_BANDS.find(x=>x.codes.includes(code));
  if(b) return b.k;
  const t=r.role_title||'';
  if(/سوپروایزر|سرپرستار/.test(t)) return 'sup';
  if(/پرستار|کارشناس|ماما/.test(t)) return 'care';
  if(/ریاست|رئیس/.test(t)) return 'exec';
  if(/مدیر|مسئول/.test(t)) return 'unit';
  const lvl=r.level||0;
  if(lvl<=1) return 'exec';
  if(lvl===2) return 'unit';
  if(lvl===3) return 'care';
  return 'other';
}
