/**
 * clinical-hubs.js — هاب‌های فرآیندی تخصصی اعتباربخشی با رعایت کامل Rule 11
 * ۱. هاب جامع حمایت از گیرنده خدمت (۳ سرشاخه افقی پیوسته و کارت‌های بزرگ)
 * ۲. هاب جامع مراقبت‌های مادر و نوزاد (زنجیره افقی ۶ گانه)
 * ۳. هاب جامع خدمات سرپایی و کلینیک‌های تخصصی (زنجیره افقی ۴ گانه)
 * 
 * بر اساس تحلیل و تطبیق ۵۴۴ اسکرین‌شات سامانه
 * جریان افقی RTL، کارت‌های بزرگ و شیوا، بدون هیچ انباشت عمودی (Zero Vertical Stacking)
 */

(function() {
  'use strict';

  // ==========================================
  // ۱. هاب جامع حمایت از گیرنده خدمت
  // ==========================================
  window.renderPatientRightsHub = function() {
    GAnim.killAllIn($('content'));
    $('ptitle').textContent = 'حمایت از گیرنده خدمت و حقوق بیمار';

    const branches = [
      {
        id: 'facilities',
        title: 'تامین تسهیلات برای گیرنده خدمت',
        icon: '🏨',
        desc: 'تسهیلات رفاهی، اقامتی، هدایت مراجعین، امکانات تردد سالمندان و معلولین',
        items: [
          { code: 'FAC-01', title: 'تسهیلات اقامتی و سالن‌های انتظار همراهان', desc: 'تجهیز سالن‌های انتظار مراجعین به نمایشگرهای نوبت‌دهی، امکانات رفاهی و پذیرایی.', action: "go('satisfaction')" },
          { code: 'POL-PTS-05', title: 'خط‌مشی تکریم، راهنمایی و هدایت مراجعین', desc: 'میز خدمت ورودی، تابلوهای راهنمای دو زبانه و سیستم خطوط رنگی مسیریابی کف بیمارستان.', action: "filterAndOpenDoc('POL-PTS-05')" },
          { code: 'POL-PTS-03', title: 'خط‌مشی حمایت از گروه‌های آسیب‌پذیر', desc: 'مناسب‌سازی رمپ‌ها، ویلچرها و اولویت پذیرش سالمندان، جانبازان و معلولین عزیز.', action: "filterAndOpenDoc('POL-PTS-03')" },
          { code: 'POL-PTS-07', title: 'مدیریت و جذب کمک‌های خیرین سلامت', desc: 'هدایت نذورات و مشارکت‌های مردمی جهت تهیه ملزومات و بهبود امکانات بیماران نیازمند.', action: "filterAndOpenDoc('POL-PTS-07')" }
        ]
      },
      {
        id: 'rights',
        title: 'احترام به حقوق گیرنده خدمت',
        icon: '⚖️',
        desc: 'منشور حقوق بیمار، خط‌مشی‌های ۸ گانه، رضایت آگاهانه، حفظ حریم و صیانت از اموال',
        items: [
          { code: 'POL-PTS-04', title: 'خط‌مشی رعایت و حفظ حریم خصوصی بیمار', desc: 'پرده‌های جداساز، گان‌های معاینه استاندارد، محرمانگی اطلاعات و ممنوعیت تصویربرداری.', action: "filterAndOpenDoc('POL-PTS-04')" },
          { code: 'INS-PTS-CNS01', title: 'دستورالعمل اخذ رضایت و برائت آگاهانه', desc: 'توضیح خطرات درمان توسط شخص پزشک، روش‌های جایگزین و ثبت رضایت قانونی.', action: "filterAndOpenDoc('INS-PTS-CNS01')" },
          { code: 'INS-PTS-PRP01', title: 'دستورالعمل حفاظت و نگهداری اموال بیمار', desc: 'صورتجلسه رسمی اموال قیمتی، نگهداری در کیسه امنیتی پلمپ و صندوق نسوز حراست.', action: "filterAndOpenDoc('INS-PTS-PRP01')" },
          { code: 'POL-PTS-01', title: 'خط‌مشی پذیرش بیماران مجهول‌الهویه', desc: 'شروع فوری اقدامات نجات‌بخش بدون قید و شرط مالی و پیگیری هویت از بهزیستی و مراجع قضایی.', action: "filterAndOpenDoc('POL-PTS-01')" },
          { code: 'POL-PTS-08', title: 'خط‌مشی نظرخواهی از پزشک دوم (Second Opinion)', desc: 'تسهیل حق بیمار جهت اخذ نظر مشورتی از پزشک متخصص دیگر و ارائه کپی مدارک.', action: "filterAndOpenDoc('POL-PTS-08')" },
          { code: 'INS-PTS-MOR01', title: 'دستورالعمل رعایت حقوق متوفی و محتضر', desc: 'تسکین درد، آرامش معنوی، حضور همراهان و تحویل محترمانه جسد با دو شناسه هویتی.', action: "filterAndOpenDoc('INS-PTS-MOR01')" }
        ]
      },
      {
        id: 'feedback',
        title: 'نظام انتقادات، پیشنهادات و CRM',
        icon: '💬',
        desc: 'رسیدگی به شکایات، نظرسنجی دوره‌ای رضایت، افشای صادقانه خطای درمانی و پیگیری بیمار',
        items: [
          { code: 'CRM-01', title: 'سامانه مدیریت ارتباط با بیمار (CRM)', desc: 'ثبت شکایات، کارتابل پاسخگویی ۴۸ ساعته و پیگیری تلفنی احوال بیمار پس از ترخیص.', action: "go('crm')" },
          { code: 'POL-PTS-06', title: 'خط‌مشی افشای صادقانه خطاهای درمانی (Disclosure)', desc: 'گفتگوی رسمی با خانواده در صورت وقوع عارضه ناخواسته، عذرخواهی و جبران خسارت.', action: "filterAndOpenDoc('POL-PTS-06')" },
          { code: 'SAT-01', title: 'تحلیل نتایج نظرسنجی رضایت‌مندی', desc: 'پایش مستمر شاخص‌های رضایت بیماران از خدمات پزشکان، پرستاران، تغذیه و هتلینگ.', action: "go('satisfaction')" },
          { code: 'FLW-01', title: 'پیگیری پس از ترخیص (Follow-up Call)', desc: 'تماس تلفنی با بیماران پرخطر جراحی و داخلی ظرف ۷۲ ساعت اول پس از ترخیص.', action: "go('followup')" }
        ]
      }
    ];

    $('content').innerHTML = renderGenericRtlFlowHub({
      hubKey: 'patient_rights',
      title: 'سامانه جامع حمایت از گیرنده خدمت و احترام به حقوق بیمار',
      subtitle: 'فرآیند سه‌گانه متصل: تامین تسهیلات رفاهی ➔ احترام به حقوق و خط‌مشی‌ها ➔ نظام انتقادات، پیشنهادات و CRM',
      badge: 'محور استاندارد اعتباربخشی ملی',
      branches: branches
    });

    initHubAnimations();
  };

  // ==========================================
  // ۲. هاب جامع مراقبت‌های مادر و نوزاد
  // ==========================================
  window.renderMaternalNeonatalHub = function() {
    GAnim.killAllIn($('content'));
    $('ptitle').textContent = 'مراقبت‌های مادر و نوزاد';

    const branches = [
      {
        id: 'highrisk',
        title: 'مراقبت از مادران پرخطر و زایمان ایمن',
        icon: '🤰',
        desc: 'تریاژ مامایی، پروتکل‌های شوک هموراژیک، اکلامپسی و پایش مستمر سلامت جنین',
        items: [
          { code: 'MAT-01', title: 'سیستم تریاژ مامایی و پیگیری مادران باردار', desc: 'سطح‌بندی فوری مادران باردار در بدو ورود به بلوک زایمان و آماده‌باش کد ۷۲۴/۲۴۷.', action: "go('followup')" },
          { code: 'MAT-02', title: 'پروتکل تریاژ و کنترل هموراژی مامایی (PPH)', desc: 'مدیریت فوری خونریزی پس از زایمان، ترالی دارویی اکسی‌توسین و جراحی نجات‌بخش.', action: "go('documents')" },
          { code: 'MAT-03', title: 'کمیته ترویج زایمان طبیعی و شیر مادر', desc: 'پایش شاخص سزارین نخست‌زا، کلاس‌های آمادگی زایمان فیزیولوژیک و ترغیب مادران.', action: "go('committees')" }
        ]
      },
      {
        id: 'neonatal',
        title: 'مدیریت مراقبت‌های ویژه نوزادان (NICU)',
        icon: '👶',
        desc: 'احیای نوزاد، روش‌های تغذیه ایمن، تزریق خون اطفال و پیشگیری از هیپوترمی',
        items: [
          { code: 'SOP-CLN-BLD01', title: 'روش اجرایی تزریق ایمن خون به نوزادان', desc: 'تزریق پدیاتریک خون با پمپ سرنگی، استفاده از کیسه‌های Pedipak و پایش دو نفره.', action: "filterAndOpenDoc('SOP-CLN-BLD01')" },
          { code: 'NEO-02', title: 'پروتکل احیای نوزاد در اتاق زایمان (NRP)', desc: 'برقراری حرارت، ساکشن ملایم، تهویه با فشار مثبت و ماساژ قلبی با تخت احیای نوزاد.', action: "go('documents')" },
          { code: 'SOP-OPT-EEG02', title: 'روش اجرایی نوار مغز اطفال و نوزادان', desc: 'ثبت دقیق EEG در خواب با رعایت پروتکل سدیشن و پایش مداوم اشباع اکسیژن.', action: "filterAndOpenDoc('SOP-OPT-EEG02')" }
        ]
      },
      {
        id: 'maternal_docs',
        title: 'مستندات و کتابخانه دیجیتال مادر و نوزاد',
        icon: '📚',
        desc: 'دستورالعمل‌ها، روش‌های اجرایی و پمفلت‌های آموزش سلامت به مادران',
        items: [
          { code: 'LIB-PAM-04', title: 'پمفلت علائم خطر بارداری پرخطر', desc: 'آموزش نشانه‌های هشدار پره‌اکلامپسی، دکولمان و زمان مراجعه فوری به زایشگاه.', action: "go('documents')" },
          { code: 'LIB-BOK-02', title: 'کتابچه بیمارستان دوستدار کودک', desc: 'مجموعه راهنماهای عملی ۱۰ گانه بیمارستان دوستدار کودک و تماس پوست‌به‌پوست.', action: "go('documents')" },
          { code: 'LIB-FRM-02', title: 'فرم برائت و رضایت زایمان ایمن', desc: 'فرم استاندارد رضایت آگاهانه روش‌های تسکین درد زایمان و بیهوشی اپیدورال.', action: "go('documents')" }
        ]
      }
    ];

    $('content').innerHTML = renderGenericRtlFlowHub({
      hubKey: 'maternal_neonatal',
      title: 'سامانه جامع مراقبت‌های مادر و نوزاد (Maternal & Neonatal Care)',
      subtitle: 'جریان پیوسته افقی: مراقبت مادران پرخطر ➔ مدیریت مراقبت نوزادان ➔ مستندات و آموزش سلامت',
      badge: 'استاندارد دوستدار کودک و مادر',
      branches: branches
    });

    initHubAnimations();
  };

  // ==========================================
  // ۳. هاب جامع خدمات سرپایی و کلینیک‌های تخصصی
  // ==========================================
  window.renderOutpatientHub = function() {
    GAnim.killAllIn($('content'));
    $('ptitle').textContent = 'خدمات سرپایی و کلینیک‌ها';

    const branches = [
      {
        id: 'general_outpatient',
        title: 'خدمات تشخیصی و درمانی سرپایی',
        icon: '🩺',
        desc: 'نوبت‌دهی درمانگاه، فیزیک بهداشت و حفاظت در برابر اشعه، خدمات ۲۴ ساعته پاراکلینیک',
        items: [
          { code: 'INS-OPT-CLN01', title: 'دستورالعمل انضباط کاری و نوبت‌دهی درمانگاه‌ها', desc: 'پذیرش چندکاناله آنلاین و تلفنی، کنترل زمان انتظار زیر ۳۰ دقیقه و پایش حضور پزشکان.', action: "filterAndOpenDoc('INS-OPT-CLN01')" },
          { code: 'INS-OPT-RAD01', title: 'دستورالعمل پیشگیری از سوانح پرتوی و ALARA', desc: 'پایش دوزیمتری TLD، کنترل سالم بودن روپوش‌های سربی و قطع اضطراری پرتو.', action: "filterAndOpenDoc('INS-OPT-RAD01')" },
          { code: 'SOP-CLN-PC24', title: 'روش اجرایی خدمات پاراکلینیکی شبانه‌روزی', desc: 'پاسخگویی مستمر تصویربرداری و آزمایشگاه در ۲۴ ساعت و ثبت Turn Around Time.', action: "filterAndOpenDoc('SOP-CLN-PC24')" }
        ]
      },
      {
        id: 'dental',
        title: 'خدمات تخصصی دندانپزشکی و CSSD',
        icon: '🦷',
        desc: 'کنترل آئروسل، شستشو و بسته‌بندی ابزار، پایش بیولوژیک اتوکلاو و گرافی پری‌اپیکال',
        items: [
          { code: 'INS-OPT-DNT01', title: 'دستورالعمل کنترل آئروسل و ایمنی دندانپزشکی', desc: 'ساکشن پرقدرت، رابردم، دهانشویه کلرهگزیدین و پوشش حفاظتی کامل جراحی دهان.', action: "filterAndOpenDoc('INS-OPT-DNT01')" },
          { code: 'INS-OPT-DNT02', title: 'دستورالعمل شستشو و پک ابزار دندانپزشکی', desc: 'حمام التراسونیک آنزیمی، روغن‌کاری توربین‌ها و بسته‌بندی با اندیکاتور کلاس ۵.', action: "filterAndOpenDoc('INS-OPT-DNT02')" },
          { code: 'INS-OPT-DNT03', title: 'پایش تست‌های بیولوژیک کشت اتوکلاو دندانپزشکی', desc: 'تست بووی‌دیک روزانه، اندیکاتور بیولوژیک اسپور هفتگی و اقدامات در زمان مثبت شدن.', action: "filterAndOpenDoc('INS-OPT-DNT03')" },
          { code: 'SOP-OPT-DNT01', title: 'روش اجرایی تهیه گرافی پری‌اپیکال دندان', desc: 'تکنیک موازی (Parallel)، استفاده از شیلد سربی تیروئید و ذخیره در آرشیو PACS.', action: "filterAndOpenDoc('SOP-OPT-DNT01')" },
          { code: 'SOP-OPT-IMP01', title: 'ثبت و پیگیری ایمپلنت‌های ناموفق (Failed)', desc: 'آنالیز ریشه‌ای علل عدم موفقیت فیکسچر، ارزیابی کمپانی و برنامه بازسازی استخوان.', action: "filterAndOpenDoc('SOP-OPT-IMP01')" }
        ]
      },
      {
        id: 'specialty_sops',
        title: 'روش‌های اجرایی (SOP) کلینیک‌های قلب، نورولوژی و زنان',
        icon: '🔬',
        desc: 'تست ورزش، تست تیلت، نوار مغز، آنژیوگرافی چشم، پاپ‌اسمیر و کولپوسکوپی',
        items: [
          { code: 'SOP-OPT-EXC01', title: 'روش اجرایی تست ورزش قلبی (Stress Test)', desc: 'پروتکل بروس با پایش مداوم ۱۲ لید نوار قلب در حضور متخصص قلب و ترالی احیا.', action: "filterAndOpenDoc('SOP-OPT-EXC01')" },
          { code: 'SOP-OPT-TLT01', title: 'روش اجرایی تست تیلت جهت بررسی سنکوپ', desc: 'قرارگیری روی تخت شیب‌دار موتوردار تحت پایش پیوسته ECG و آمادگی سنکوپ.', action: "filterAndOpenDoc('SOP-OPT-TLT01')" },
          { code: 'SOP-OPT-EEG01', title: 'روش اجرایی ثبت نوار مغز بزرگسالان (EEG)', desc: 'سیستم ۱۰-۲۰ بین‌المللی، مانورهای هایپرونتیلاسیون و تحریک نوری متناوب.', action: "filterAndOpenDoc('SOP-OPT-EEG01')" },
          { code: 'SOP-OPT-EYE01', title: 'آنژیوگرافی عروق شبکیه چشم (فلورسین FAG)', desc: 'تزریق وریدی رنگ فلورسین، عکسبرداری فوندوس و آمادگی کامل شوک آنافیلاکسی.', action: "filterAndOpenDoc('SOP-OPT-EYE01')" },
          { code: 'SOP-OPT-PAP01', title: 'روش اجرایی اخذ تست پاپ‌اسمیر سیتولوژی', desc: 'نمونه‌برداری ۳۶۰ درجه با سیتوبراش و انتقال مایع و فیکساسیون سریع زیر ۵ ثانیه.', action: "filterAndOpenDoc('SOP-OPT-PAP01')" },
          { code: 'SOP-OPT-CLP01', title: 'روش اجرایی کولپوسکوپی و بیوپسی سرویکس', desc: 'معاینه ذره‌بینی با اسید استیک و فیلتر سبز، بیوپسی هدفمند و کنترل هموستاز.', action: "filterAndOpenDoc('SOP-OPT-CLP01')" }
        ]
      }
    ];

    $('content').innerHTML = renderGenericRtlFlowHub({
      hubKey: 'outpatient_services',
      title: 'سامانه جامع خدمات سرپایی و کلینیک‌های تخصصی',
      subtitle: 'جریان افقی متصل: خدمات تشخیصی سرپایی ➔ کلینیک دندانپزشکی و CSSD ➔ روش‌های اجرایی کلینیک‌های قلب، نورولوژی و زنان',
      badge: 'پایش اعتباربخشی خدمات سرپایی',
      branches: branches
    });

    initHubAnimations();
  };

  // ==========================================
  // موتور رندر جریان افقی RTL متصل با کارت‌های بزرگ
  // مطابق صریح Rule 11 (Zero Vertical Stacking)
  // ==========================================
  function renderGenericRtlFlowHub(config) {
    const branches = config.branches || [];

    // نوار شاخص ناوبری سرشاخه‌ها در بالای صفحه
    let spineSteps = '';
    branches.forEach((b, idx) => {
      spineSteps += '<button type="button" class="hub-spine-step" onclick="scrollToHubSection(\'' + esc(b.id) + '\')" title="پرش به ' + esc(b.title) + '">' +
        '<span class="hub-spine-step-num">' + fa(idx + 1) + '</span>' +
        '<span>' + esc(b.title) + '</span>' +
        '<span style="font-size:0.75rem;opacity:0.7">(' + fa(b.items.length) + ')</span>' +
      '</button>';
    });

    const spineNav = '<div class="hub-spine-nav" style="margin-bottom:24px">' +
      '<div style="font-size:0.85rem;font-weight:800;color:var(--gd,#c9a84c);margin-left:12px;display:flex;align-items:center;gap:6px">' +
        '<span>⛓️</span> اتصال سرشاخه‌های فرآیند:' +
      '</div>' + spineSteps + '</div>';

    // بخش‌های متوالی سرشاخه‌ها با کارت‌های بزرگ و شیوا
    let branchesHtml = '';
    branches.forEach((b, bIdx) => {
      let cardsHtml = '';
      b.items.forEach((item) => {
        cardsHtml += '<div class="hcard-lg" onclick="' + item.action + '" title="' + esc(item.title) + '">' +
          '<div class="hcard-lg-top">' +
            '<span class="hcard-lg-ic" style="font-size:22px">' + b.icon + '</span>' +
            '<span class="hcard-lg-badge">' + esc(item.code) + '</span>' +
          '</div>' +
          '<div class="hcard-lg-body">' +
            '<span class="hcard-lg-t">' + esc(item.title) + '</span>' +
            '<span class="hcard-lg-d">' + esc(item.desc) + '</span>' +
          '</div>' +
          '<div class="hcard-lg-footer">' +
            '<span class="hcard-lg-cta">مشاهده و اجرا ‹</span>' +
            '<span style="font-size:0.75rem;color:rgba(255,255,255,0.4);direction:ltr">' + esc(item.code) + '</span>' +
          '</div>' +
        '</div>';
      });

      const connectorDown = (bIdx < branches.length - 1) ? 
        '<div class="hub-branch-connector-down" aria-hidden="true" style="margin:20px 0">' +
          '<div class="hub-branch-connector-line"></div>' +
          '<div class="hub-branch-connector-dot">▼</div>' +
          '<div class="hub-branch-connector-line"></div>' +
        '</div>' : '';

      branchesHtml += '<section class="hub-branch-section" id="section_' + esc(b.id) + '" style="margin-bottom:12px">' +
        '<div class="hub-branch-header">' +
          '<div class="hub-branch-header-right">' +
            '<div class="hub-branch-icon-box">' + b.icon + '</div>' +
            '<div>' +
              '<h4 class="hub-branch-title">' +
                '<span>' + fa(bIdx + 1) + '. ' + esc(b.title) + '</span>' +
              '</h4>' +
              '<div style="font-size:0.84rem;color:#94a3b8;margin-top:2px">' + esc(b.desc) + '</div>' +
            '</div>' +
          '</div>' +
          '<span class="hub-branch-badge">' + fa(b.items.length) + ' ماژول و مدرک استاندارد</span>' +
        '</div>' +
        '<div class="hub-branch-cards-grid">' +
          cardsHtml +
        '</div>' +
      '</section>' + connectorDown;
    });

    return '<div class="panel g" style="background:transparent;border:none;box-shadow:none">' +
      '<!-- بنر شیشه‌ای طلایی بالای هاب -->' +
      '<div style="background:linear-gradient(135deg, rgba(30, 48, 42, 0.95), rgba(18, 30, 49, 0.95));border:1.5px solid rgba(201, 168, 76, 0.45);border-radius:20px;padding:22px 28px;margin-bottom:22px;box-shadow:0 12px 36px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">' +
        '<div>' +
          '<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(201,168,76,0.18);border:1px solid rgba(201,168,76,0.4);padding:3px 12px;border-radius:20px;color:var(--gd,#c9a84c);font-size:0.8rem;font-weight:800;margin-bottom:8px">' +
            '<span>✦</span> ' + esc(config.badge) +
          '</div>' +
          '<h2 style="margin:0;font-size:1.45rem;font-weight:800;color:#fff;letter-spacing:-0.01em">' + esc(config.title) + '</h2>' +
          '<div style="font-size:0.9rem;color:#cbd5e1;margin-top:6px;line-height:1.6">' + esc(config.subtitle) + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px">' +
          '<button class="btn btn-o btn-sm" onclick="go(\'acc\')">◂ بازگشت به اعتباربخشی</button>' +
          '<button class="btn btn-g btn-sm" onclick="go(\'documents\')">📁 بانک اسناد</button>' +
        '</div>' +
      '</div>' +
      spineNav +
      branchesHtml +
    '</div>';
  }

  // پرش نرم به بخش سرشاخه
  window.scrollToHubSection = function(sectionId) {
    const el = document.getElementById('section_' + sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.style.borderColor = 'var(--gd, #c9a84c)';
      el.style.boxShadow = '0 0 35px rgba(201,168,76,0.45)';
      setTimeout(() => {
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }, 1200);
    }
  };

  // باز کردن مستقیم یک سند بر اساس کد مدرک
  window.filterAndOpenDoc = async function(docCode) {
    try {
      const { documents } = await API.documents('q=' + encodeURIComponent(docCode));
      if (documents && documents.length > 0) {
        const found = documents.find(d => d.doc_code === docCode) || documents[0];
        openDocument(found.id);
      } else {
        toast('سند ' + docCode + ' در حال بارگذاری از سرور است...', false);
        go('documents');
      }
    } catch(e) {
      go('documents');
    }
  };

  function initHubAnimations() {
    const root = $('content');
    if (window.GAnim) {
      GAnim.staggerIn('.hub-branch-section', root);
      GAnim.staggerIn('.hcard-lg', root);
    }
  }

})();
