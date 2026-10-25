/**
 * Superadmin Documentation Part 1
 * Part of Modular Frontend Architecture (Zero-Monolith)
 */
const MODULE_DOCS=[
  {id:'dashboard', name:'داشبورد', purpose:'خلاصه‌ی وضعیت انطباق سنجه‌ها، شاخص‌ها و رویدادهای پیش‌رو در یک صفحه.',
    fe:'public/js/app.js → renderDash() (خط ۲۴۷۹)',
    be:'src/routes/api.js → GET /dashboard (خط ۴۰)، GET /accreditation/dashboard (خط ۱۴۷)، GET /kpis/dashboard (خط ۱۶۲۰)',
    roles:'همه‌ی کاربران واردشده (authRequired + hospitalScope) — محدودیت نقش خاصی ندارد.',
    deps:'از داده‌ی وضعیت سنجه‌ها و شاخص‌ها (KPI) می‌خواند؛ به هیچ ماژولی داده پس نمی‌فرستد.',
    apis:[{m:'GET',p:'/api/dashboard',auth:'ورود لازم',resp:'خلاصه‌ی کلی: شمار سنجه‌های منطبق/نسبی/نامنطبق + میانبرها'},
      {m:'GET',p:'/api/accreditation/dashboard',auth:'ورود لازم',resp:'ریز پیشرفت بخش/محور/استاندارد به‌صورت درختی'},
      {m:'GET',p:'/api/kpis/dashboard',auth:'ورود لازم',resp:'کارت‌های شاخص عملکردی با روند'}]},
  {id:'tree', name:'درخت سنجه‌ها', purpose:'مرور کامل بخش/استاندارد/محور/سنجه‌ی کتاب اعتباربخشی و دسترسی به هر گره.',
    fe:'public/js/app.js → renderTree() (خط ۲۴۳۰)',
    be:'src/routes/api.js → GET /accreditation/tree (خط ۸۱)، GET /accreditation/status (خط ۱۱۴)',
    roles:'مشاهده‌ی هر محور بر اساس نقش کاربر سمت سرور (deny-by-default)؛ ادمین می‌تواند override موردی کاربر↔سنجه ثبت کند.',
    deps:'پایه‌ی ماژول «وضعیت سنجه‌ها»ست؛ مدارک کنترل‌شده و شواهد الکترونیکی به محورهای همین درخت لینک می‌شوند.',
    apis:[{m:'GET',p:'/api/accreditation/tree',auth:'ورود لازم',resp:'درخت کامل بخش→استاندارد→محور→سنجه، فقط گره‌های مجاز کاربر'},
      {m:'GET',p:'/api/accreditation/status',auth:'ورود لازم',resp:'وضعیت فعلی هر سنجه (منطبق/نسبی/نامنطبق) برای بیمارستان'}]},
  {id:'measures', name:'وضعیت سنجه‌ها', purpose:'ثبت/ویرایش وضعیت هر سنجه (منطبق/نسبی/نامنطبق) با شواهد و یادداشت.',
    fe:'public/js/app.js → renderMeasures() (خط ۲۹۰۱)',
    be:'src/routes/api.js → PUT /accreditation/status/:measureId (خط ۱۲۴، نیازمند مجوز edit_measure_status)',
    roles:'کاربران دارای مجوز edit_measure_status، فقط روی محورهایی که نقش/override‌شان اجازه می‌دهد.',
    deps:'درخت سنجه‌ها؛ گزارش روند و داشبورد از همین داده تغذیه می‌شوند؛ شواهد الکترونیکی از /api/evidence/:entityType/:entityId پیوست می‌شود.',
    apis:[{m:'PUT',p:'/api/accreditation/status/:measureId',auth:'edit_measure_status',resp:'ثبت وضعیت جدید + یادداشت؛ بدنه: {status, note}'},
      {m:'GET/POST',p:'/api/evidence/:entityType/:entityId',auth:'ورود لازم',resp:'فهرست/آپلود فایل شواهد برای یک سنجه'}]},
  {id:'reports', name:'گزارش‌ها و نمودار روند', purpose:'نمودار روند پیشرفت انطباق در طول زمان.',
    fe:'public/js/app.js → renderReports() (خط ۳۲۱۲)',
    be:'src/routes/api.js → GET /reports/trend (خط ۳۹۴)',
    roles:'همه‌ی کاربران واردشده.', deps:'از وضعیت سنجه‌ها می‌خواند.',
    apis:[{m:'GET',p:'/api/reports/trend',auth:'ورود لازم',resp:'سری زمانی درصد انطباق برای رسم نمودار'}]},
  {id:'calendar', name:'تقویم رویدادها', purpose:'رویدادهای بیمارستان از جمله جلسات کمیته روی یک تقویم مشترک.',
    fe:'public/js/app.js → renderCalendar() (خط ۳۱۴۳)',
    be:'src/routes/api.js → GET /calendar/events (خط ۳۶۷)، POST /calendar/events (خط ۴۴۹، نیازمند manage_calendar_events)',
    roles:'مشاهده برای همه؛ ایجاد رویداد نیازمند manage_calendar_events.',
    deps:'جلسات کمیته هم به‌صورت ردیف در همین جدول calendar_events ذخیره می‌شوند.',
    apis:[{m:'GET',p:'/api/calendar/events',auth:'ورود لازم',resp:'فهرست رویدادهای بازه‌ی درخواستی'},
      {m:'POST',p:'/api/calendar/events',auth:'manage_calendar_events',resp:'ایجاد رویداد جدید'}]},
  {id:'inbox', name:'کارتابل شخصی', purpose:'اقلام کاری هر کاربر در یک صفحه، شامل اقلام کاربر جانشین.',
    fe:'public/js/app.js → renderInbox() (خط ۳۳۸۴)',
    be:'src/routes/api.js → GET /inbox (خط ۷۶۱)، GET/POST/DELETE /users/delegates (خط ۷۸۲-۸۱۶)',
    roles:'همه‌ی کاربران؛ اقلام جانشین با برچسب «به‌جای …» ادغام می‌شود.',
    deps:'تسک‌ها (/api/tasks)، یادآورها و راهنمای گام‌به‌گام همگی به همین کارتابل adjust می‌شوند، نه سیستم اعلان جدا.',
    apis:[{m:'GET',p:'/api/inbox',auth:'ورود لازم',resp:'اقلام کاری کاربر + اقلام کاربرانی که برایشان جانشین است'},
      {m:'POST',p:'/api/users/delegates',auth:'ورود لازم',resp:'ثبت کاربر جانشین؛ بدنه: {delegate_user_id, ...}'}]},
  {id:'messages', name:'پیام‌های داخلی', purpose:'پیام‌رسانی داخل‌سازمانی بین کاربران یک بیمارستان.',
    fe:'public/js/app.js → renderMessages() (خط ۳۷۴۴)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /messages* (خط ۸۵۱-۹۶۸)، GET /messages/unread-count (خط ۸۷۰)',
    roles:'همه‌ی کاربران واردشده.', deps:'شمارنده‌ی خوانده‌نشده در هدر سراسری از /api/nav-badges خوانده می‌شود.',
    apis:[{m:'GET',p:'/api/messages',auth:'ورود لازم',resp:'فهرست پیام‌های دریافتی/ارسالی'},
      {m:'POST',p:'/api/messages',auth:'ورود لازم',resp:'ارسال پیام؛ بدنه: {to_user_id, subject, body}'}]},
  {id:'committees', name:'کمیته‌ها', purpose:'مدیریت ۱۷+ کمیته‌ی بیمارستانی، صورت‌جلسه و زمان‌بندی جلسه/اتاق.',
    fe:'public/js/app.js → renderCommittees() (خط ۳۸۴۲)',
    be:'src/routes/api.js → GET/POST /committees (خط ۵۰۳-۵۲۳)، minutes (خط ۵۲۳-۵۵۲)، meeting-rooms (خط ۵۷۰-۵۸۸)، meetings (خط ۵۸۸-۶۸۸)',
    roles:'مشاهده برای hospitalScope؛ ثبت صورت‌جلسه/جلسه نیازمند manage_committees یا create_committee_minutes.',
    deps:'جلسات به تقویم و کارتابل/یادآور وصل‌اند؛ رزرو اتاق قفل تداخل با پاسخ ۴۰۹ دارد.',
    apis:[{m:'GET',p:'/api/committees',auth:'ورود لازم',resp:'فهرست کمیته‌های بیمارستان'},
      {m:'POST',p:'/api/committees/:id/meetings',auth:'create_committee_minutes',resp:'ثبت جلسه؛ ۴۰۹ در صورت تداخل اتاق'}]},
  {id:'documents', name:'مدارک کنترل‌شده', purpose:'خط‌مشی/روش اجرایی/دستورالعمل با گردش امضای الکترونیکی و تاریخچه‌ی نسخه.',
    fe:'public/js/app.js → renderDocuments()/drawDocList() (خط ۴۱۵۷)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /documents* (خط ۲۱۷۴-۲۳۵۰)، signoffs (خط ۲۲۶۱-۲۲۹۳)، attachment (خط ۲۳۱۳-۲۳۳۴)',
    roles:'مشاهده view_documents یا manage_documents؛ ثبت/ویرایش/امضا manage_documents (امضا خودِ signoff هم با view_documents ممکن است).',
    deps:'امضای الکترونیکی و شواهد پیوست؛ لینک به محورهای استاندارد؛ صفحه‌ی اسناد میزبان تب‌های کتابخانه و گواهینامه هم هست.',
    apis:[{m:'GET',p:'/api/documents',auth:'view_documents یا manage_documents',resp:'فهرست مدارک با فیلتر نوع/وضعیت'},
      {m:'POST',p:'/api/documents/:id/signoffs',auth:'manage_documents',resp:'افزودن ردیف گردش امضا'},
      {m:'POST',p:'/api/documents/signoffs/:signoffId/sign',auth:'view_documents یا manage_documents',resp:'امضای واقعی همان ردیف توسط کاربر جاری'}]},
  {id:'esignature', name:'امضای الکترونیکی', purpose:'تصویر امضای شخصی هر کاربر که در گردش امضای مدارک استفاده می‌شود.',
    fe:'بخشی از renderDocuments و renderSettings — مدیریت تصویر امضا در تنظیمات کاربر',
    be:'src/routes/api.js → GET/POST /signatures* (خط ۲۳۶۱-۲۴۱۶)، GET /signatures/image/:filename (خط ۲۳۷۱)',
    roles:'مشاهده hospitalScope؛ آپلود/فعال‌سازی manage_hospital_settings.',
    deps:'در گردش امضای مدارک کنترل‌شده (documents/signoffs) مصرف می‌شود.',
    apis:[{m:'POST',p:'/api/signatures',auth:'manage_hospital_settings',resp:'آپلود تصویر امضا (multipart)'}]},
  {id:'library', name:'کتابخانه‌ی دیجیتال', purpose:'مخزن ساده‌ی فایل برای منابع/مستندات عمومی بیمارستان.',
    fe:'public/js/app.js → renderLibrary() (خط ۵۵۷۶) — تب دوم صفحه‌ی اسناد',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /library* (خط ۲۴۶۴-۲۵۳۴)',
    roles:'مشاهده view_library یا manage_library؛ مدیریت manage_library.',
    deps:'می‌تواند به یک سند کنترل‌شده لینک شود.',
    apis:[{m:'GET',p:'/api/library',auth:'view_library یا manage_library',resp:'فهرست آیتم‌های کتابخانه'},
      {m:'POST',p:'/api/library/:id/file',auth:'manage_library',resp:'آپلود فایل آیتم (multipart)'}]},
  {id:'certifications', name:'نشان‌ها و گواهینامه‌ها', purpose:'ثبت گواهینامه/نشان بیمارستان با محاسبه‌ی وضعیت انقضا.',
    fe:'public/js/app.js → renderCertifications() (خط ۴۸۲۳) — تب سوم صفحه‌ی اسناد',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /certifications* (خط ۲۹۱۸-۲۹۸۳)',
    roles:'مشاهده view_certifications یا manage_certifications؛ مدیریت manage_certifications.',
    deps:'وضعیت انقضا در لحظه‌ی خواندن محاسبه می‌شود، ستون/جدول جدا ندارد.',
    apis:[{m:'GET',p:'/api/certifications',auth:'view_certifications یا manage_certifications',resp:'فهرست با وضعیت انقضای محاسبه‌شده'}]},
  {id:'checklists', name:'بانک چک‌لیست', purpose:'ساخت چک‌لیست با حیطه‌بندی، نمره‌دهی لیکرت/بله‌خیر و تعیین مسئول اندازه‌گیری.',
    fe:'public/js/app.js → renderChecklists()/drawChkList()/drawChkDetail() (خط ۵۷۱۶، ۵۷۳۱، ۵۹۸۹)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /checklists* (خط ۲۶۶۲-۲۸۸۱)، خروجی CSV: /checklists/:id/export.csv (خط ۲۷۶۵)',
    roles:'تکمیل submit_checklists؛ ساخت/ویرایش/تعیین مسئول manage_checklists.',
    deps:'حسابرسی داخلی یک دور چک‌لیست موجود را صدا می‌زند، فرم را دوباره نمی‌سازد.',
    apis:[{m:'GET',p:'/api/checklists/:id/export.csv',auth:'submit_checklists یا manage_checklists',resp:'فایل CSV نتایج'},
      {m:'POST',p:'/api/checklists/:id/submissions',auth:'submit_checklists',resp:'ثبت یک دور تکمیل‌شده'}]},
  {id:'audits', name:'حسابرسی داخلی', purpose:'اجرای دوره‌ای حسابرسی داخلی با استفاده از بانک چک‌لیست.',
    fe:'public/js/app.js → renderAudits() (خط ۴۹۶۹)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /audits* (خط ۳۰۰۷-۳۰۹۵)',
    roles:'مشاهده view_audits؛ مدیریت manage_audits.',
    deps:'روی همان چک‌لیست‌های موجود می‌چرخد.',
    apis:[{m:'POST',p:'/api/audits/:id/submission',auth:'manage_audits',resp:'ثبت نتیجه‌ی حسابرسی برای یک دور'}]},
  {id:'walkarounds', name:'واکراند (بازدید میدانی مدیریتی)', purpose:'ثبت بازدید میدانی مدیران با پیگیری مصوبات.',
    fe:'public/js/app.js → renderWalkarounds() (خط ۵۳۴۱)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /walkarounds* (خط ۳۱۴۵-۳۲۵۸)، خلاصه: /walkarounds/summary (خط ۳۱۶۴)',
    roles:'مشاهده view_walkarounds؛ مدیریت manage_walkarounds.',
    deps:'مصوبات (resolutions) در داشبورد مصوبات جدا نمایش داده می‌شود.',
    apis:[{m:'GET',p:'/api/walkarounds/summary',auth:'view_walkarounds یا manage_walkarounds',resp:'داشبورد مصوبات باز/بسته'}]},
  {id:'errors', name:'گزارش خطا/واقعه', purpose:'ثبت خطای پزشکی/واقعه با تحلیل ریشه‌ای شرطی (RCA) و کد پیگیری خودکار.',
    fe:'public/js/app.js → renderErrors() (خط ۴۶۸۸)',
    be:'src/routes/api.js → GET/POST/PUT /users/medical-errors* (خط ۱۳۰۱-۱۳۶۶)؛ فرم عمومی: POST /public/medical-error (خط ۲۰۳۴)',
    roles:'ثبت submit_medical_error_report یا manage_medical_error_reports؛ مدیریت manage_medical_error_reports.',
    deps:'کد پیگیری خودکار به‌شکل ERR-{بیمارستان}-{سال}-{شماره}؛ فرم عمومی بدون‌ورود جدا از این مسیر است.',
    apis:[{m:'POST',p:'/api/users/medical-errors',auth:'submit_medical_error_report یا manage_medical_error_reports',resp:'ثبت گزارش + کد پیگیری خودکار'},
      {m:'POST',p:'/api/public/medical-error',auth:'بدون ورود (rate-limit)',resp:'ثبت گزارش عمومی توسط بیمار/مراجعه‌کننده'}]},
  {id:'fmea', name:'FMEA', purpose:'تحلیل حالات بالقوه‌ی شکست و اثرات آن (Failure Mode and Effects Analysis).',
    fe:'public/js/app.js → renderFmea() (خط ۴۵۲۸)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /fmea* (خط ۱۹۰۵-۱۹۷۵)؛ فرم عمومی: POST /public/fmea (خط ۲۰۰۷)',
    roles:'submit_fmea یا manage_fmea.',
    deps:'فرم عمومی بدون‌ورود جدا با rate-limit مشابه گزارش خطا.',
    apis:[{m:'GET/POST',p:'/api/fmea',auth:'submit_fmea یا manage_fmea',resp:'فهرست/ثبت رکورد FMEA'}]},
  {id:'satisfaction', name:'نظرسنجی رضایت', purpose:'پرسشنامه‌ی رسمی رضایت‌سنجی ۱۰بخشی برای بیماران/مراجعه‌کنندگان و داشبورد نتایج.',
    fe:'public/js/app.js → renderSatisfactionResults() (خط ۷۳۰۸)؛ فرم عمومی در *-public.html',
    be:'src/routes/api.js → GET /satisfaction/results (خط ۲۰۹۴، نیازمند view_all_dashboards)؛ POST /public/satisfaction (خط ۲۰۵۳)',
    roles:'مشاهده‌ی نتایج فقط view_all_dashboards (معمولاً مدیر کیفیت)؛ ثبت پرسشنامه کاملاً عمومی و بدون‌ورود.',
    deps:'پرسشنامه از درگاه عمومی همان بیمارستان پر می‌شود.',
    apis:[{m:'GET',p:'/api/satisfaction/results',auth:'view_all_dashboards',resp:'تجمیع نتایج ۱۰بخشی'},
      {m:'POST',p:'/api/public/satisfaction',auth:'بدون ورود (rate-limit)',resp:'ثبت یک پرسشنامه‌ی تکمیل‌شده'}]},
  {id:'public_gateway', name:'دروازه‌ی عمومی/خدمات بدون‌ورود', purpose:'ورود دوگامی عمومی (لندینگ→انتخاب مرکز→صفحه‌ی اختصاصی) و خدمات بدون‌ورود هر بیمارستان.',
    fe:'public/js/app.js → renderEntry()/renderRoleMosaic()/renderHospitalLogin()/renderPickList() (خط ۱۳۶۴-۱۵۵۴)؛ صفحات مستقل public/*-public.html',
    be:'src/routes/entry.js (require-password، hospital/:id/roles، role-login)؛ src/routes/api.js → GET /public/hospitals، /public/hospital/:id، /public/hospital/:id/logo (خط ۱۹۷۵-۲۰۰۷)',
    roles:'بدون نیاز به ورود؛ فقط rate-limit روی فرم‌های ثبت.',
    deps:'لینک «درگاه همگانی ↗» کنار هر بیمارستان در تب «بیمارستان‌ها و بکاپ» همین پنل، به همین دروازه می‌رود.',
    apis:[{m:'GET',p:'/api/public/hospitals',auth:'بدون ورود',resp:'فهرست بیمارستان‌های فعال برای صفحه‌ی انتخاب مرکز'},
      {m:'GET',p:'/entry/hospital/:id/roles',auth:'بدون ورود',resp:'نقش‌های قابل ورود سریع برای آن بیمارستان (dev/demo)'}]},
  {id:'programs', name:'برنامه‌های بهبود', purpose:'پیشنهاد اقدام بهبود، جریان تأیید/رد و پیگیری پیشرفت.',
    fe:'public/js/app.js → renderPrograms() (خط ۶۹۲۸)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /programs* (خط ۳۲۸۸-۳۳۸۵)، approve/reject (خط ۳۳۵۸-۳۳۵۹)',
    roles:'ثبت پیشنهاد برای همه‌ی کاربران واردشده؛ تأیید/رد نیازمند approve_programs.',
    deps:'پیشرفت (progress) جدا از تأیید ثبت می‌شود.',
    apis:[{m:'PUT',p:'/api/programs/:id/approve',auth:'approve_programs',resp:'تغییر وضعیت به تأییدشده'},
      {m:'PUT',p:'/api/programs/:id/progress',auth:'ورود لازم',resp:'به‌روزرسانی درصد پیشرفت'}]},
  {id:'processes', name:'فرآیندها/فلوچارت', purpose:'ثبت و اطلاع‌رسانی فرآیندهای سازمانی با فایل فلوچارت پیوست.',
    fe:'public/js/app.js → renderProcesses() (خط ۵۱۶۹)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /processes* (خط ۳۴۳۳-۳۵۳۲)، notify-users (خط ۳۴۹۵)',
    roles:'مشاهده view_processes؛ مدیریت manage_processes.',
    deps:'فایل پیوست از همان مسیر مشترک آپلود.',
    apis:[{m:'PUT',p:'/api/processes/:id/notify-users',auth:'manage_processes',resp:'اطلاع‌رسانی کارتابل به کاربران مرتبط'}]},
  {id:'bsc', name:'کارت امتیازی متوازن (BSC)', purpose:'ثبت و پایش شاخص‌های BSC در چهار منظر با خروجی CSV.',
    fe:'public/js/app.js → renderBsc() (خط ۷۳۷۱)',
    be:'src/routes/api.js → GET /bsc، PUT values/indicators/:id، GET export.csv (خط ۳۶۰۴-۳۷۱۸)',
    roles:'مشاهده view_bsc؛ مدیریت manage_bsc.', deps:'مستقل از تعریف KPI داشبورد.',
    apis:[{m:'PUT',p:'/api/bsc/values',auth:'manage_bsc',resp:'ثبت مقدار دوره‌ای یک شاخص'}]},
  {id:'training', name:'نیازسنجی آموزشی', purpose:'جریان سه‌مرحله‌ای نیازسنجی آموزشی: کارمند → مافوق → سازمان.',
    fe:'public/js/app.js → renderTraining() (خط ۷۱۱۹)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /training-needs* (خط ۴۳۷۳-۴۴۷۱)، superior-review (خط ۴۴۳۶)، final-decision (خط ۴۴۵۴)',
    roles:'ثبت برای همه؛ بررسی مافوق review_training_needs؛ تصمیم نهایی approve_training.',
    deps:'—', apis:[{m:'PUT',p:'/api/training-needs/:id/final-decision',auth:'approve_training',resp:'تصویب/رد نهایی نیاز آموزشی'}]},
  {id:'org_structure', name:'ساختار سازمانی', purpose:'تعریف گروه شغلی/واحد/پست/ساختمان به‌عنوان زیرساخت چارت.',
    fe:'public/js/app.js → renderOrg() (خط ۷۴۹۷)',
    be:'src/routes/api.js → GET/POST/PUT/DELETE /org-structure/:kind* (خط ۳۷۱۸-۳۷۸۹)',
    roles:'مشاهده view_org_structure؛ مدیریت manage_org_structure.',
    deps:'چارت سازمانی و حوزه‌های مدیریت/پرستاری/پشتیبانی از همین پست‌ها تغذیه می‌شوند.',
    apis:[{m:'GET',p:'/api/org-structure/:kind',auth:'view_org_structure',resp:'فهرست یکی از انواع (گروه‌شغلی/واحد/پست/ساختمان)'}]},
  {id:'org_chart', name:'چارت سازمانی', purpose:'نمایش یکپارچه‌ی سه حوزه‌ی کلان (مدیریت/پرستاری/پشتیبانی) در یک نمودار.',
    fe:'public/js/app.js → renderOrgChart() (خط ۲۷۷۹)',
    be:'src/routes/api.js → GET /org-chart/admins (خط ۳۸۳۱)، GET/PUT /org-divisions* (خط ۳۷۸۹-۳۸۳۱)',
    roles:'مشاهده برای همه؛ ویرایش برچسب حوزه manage_org_divisions.',
    deps:'سه حوزه زیرشاخه‌ی جدا دارند (به رکوردهای زیر مراجعه کنید).',
    apis:[{m:'PUT',p:'/api/org-divisions/:code',auth:'manage_org_divisions',resp:'تغییر برچسب/رئیس یک حوزه'}]},
  {id:'mgmt_division', name:'حوزه‌ی مدیریت', purpose:'پست‌های نام‌دار حوزه‌ی مدیریت (مدیر بیمارستان، مدیر کیفیت، مسئول فنی...).',
    fe:'public/js/app.js → renderManagement() (خط ۲۶۱۲)',
    be:'src/routes/api.js → GET/PUT /management/positions* (خط ۳۸۵۶-۳۸۹۲)',
    roles:'مشاهده رئیس حوزه یا manage_org_divisions؛ انتصاب/تعویض همان دو گروه (mgmtCanManage سمت سرور).',
    deps:'برچسب/تعداد پست‌ها فقط از پنل سوپرادمین قابل تغییر است (دکمه «پست‌های حوزه‌ی مدیریت» در تب بیمارستان‌ها).',
    apis:[{m:'PUT',p:'/api/management/positions/:id',auth:'رئیس حوزه یا manage_org_divisions',resp:'انتصاب/تعویض فرد یک پست'}]},
  {id:'support_division', name:'حوزه‌ی پشتیبانی', purpose:'زیرمجموعه‌ی پشتیبانی چارت سازمانی.',
    fe:'public/js/app.js → renderSupport() (خط ۲۵۹۳)',
    be:'همان org-structure/org-divisions (کد حوزه support)',
    roles:'canViewSupportDivision (رئیس حوزه یا manage_org_divisions).', deps:'زیرمجموعه‌ی چارت سازمانی.', apis:[]},
  {id:'nursing_hierarchy', name:'سلسله‌مراتب پرستاری', purpose:'تعریف سوپروایزرها، بخش‌ها و پوشش متقاطع (cross-cover) پرستاری.',
    fe:'public/js/app.js → renderNursing() (خط ۷۶۴۱)',
    be:'src/routes/api.js → GET /nursing/hierarchy (خط ۳۹۳۳)، supervisors/wards/cross-cover (خط ۳۹۶۶-۴۰۹۶)',
    roles:'مشاهده view_nursing_hierarchy؛ مدیریت manage_nursing_hierarchy.',
    deps:'داشبورد سرپرستار بخش زیرمجموعه‌ی همین ماژول است.',
    apis:[{m:'POST',p:'/api/nursing/wards',auth:'manage_nursing_hierarchy',resp:'ایجاد بخش پرستاری جدید'}]},
  {id:'head_nurse', name:'داشبورد سرپرستار بخش', purpose:'حضورغیاب، مرخصی و چک‌لیست شیفت برای سرپرستار/جانشین بخش.',
    fe:'public/js/app.js → renderHeadNurse() (خط ۷۸۱۵)',
    be:'src/routes/api.js → nursing/head/my-wards، roster، presence، attendance، leave-requests، shift-tasks (خط ۴۱۴۹-۴۳۷۳)',
    roles:'سرپرستار یا جانشین بخش.', deps:'از سلسله‌مراتب پرستاری (بخش‌ها) تغذیه می‌شود.',
    apis:[{m:'PUT',p:'/api/nursing/head/attendance',auth:'ورود لازم (سرپرستار)',resp:'ثبت حضورغیاب روزانه‌ی بخش'}]},
  {id:'users_roles', name:'مدیریت کاربران و نقش‌ها', purpose:'ساخت کاربر، تعریف نقش سفارشی از کاتالوگ مجوز، override موردی کاربر↔سنجه.',
    fe:'public/js/app.js → renderUsers() (خط ۶۱۲۳)',
    be:'src/routes/api.js → GET/POST/PUT /users* (خط ۱۰۴۱-۱۲۳۵، ۱۸۴۶)، roles/permissions/catalog (خط ۱۱۲۷)، measure-overrides (خط ۱۰۷۵-۱۱۰۵)',
    roles:'manage_users برای کاربران؛ manage_roles برای نقش‌های سفارشی.',
    deps:'override موردی به درخت سنجه‌ها وصل است؛ پیش‌نمایش نقش هم از همین صفحه صدا زده می‌شود.',
    apis:[{m:'POST',p:'/api/users',auth:'manage_users',resp:'ایجاد کاربر جدید در بیمارستان جاری'},
      {m:'POST',p:'/api/roles',auth:'manage_roles',resp:'ساخت نقش سفارشی با فهرست مجوز از کاتالوگ'}]},
  {id:'role_preview', name:'پیش‌نمایش نقش', purpose:'دیدن موقت UI به چشم یک کاربر دیگر، بدون ورود واقعی به حسابش.',
    fe:'دکمه‌ی پیش‌نمایش در renderUsers()؛ نوار بالای صفحه renderPreviewBanner() (خط ۱۲۹۱)',
    be:'src/routes/api.js → POST /preview/start/:userId، POST /preview/exit، GET /preview/status (خط ۳۸۹۲-۳۹۳۳)',
    roles:'manage_org_divisions.', deps:'فقط سمت فرانت تغییر می‌کند؛ سرور هر درخواست را با نقش واقعی می‌سنجد، نه نقش پیش‌نمایش.',
    apis:[{m:'POST',p:'/api/preview/start/:userId',auth:'manage_org_divisions',resp:'شروع پیش‌نمایش؛ توکن session تغییر نمی‌کند'}]},
  {id:'settings', name:'تنظیمات بیمارستان', purpose:'پروفایل بیمارستان، دوره‌ی سراسری اعتباربخشی و قوانین یادآور.',
    fe:'public/js/app.js → renderSettings() (خط ۳۵۰۴)',
    be:'src/routes/api.js → users/settings، hospital/profile، policy/period، reminders/rules (خط ۱۳۹۶-۱۵۹۸)',
    roles:'manage_hospital_settings.', deps:'دوره‌ی سراسری و قوانین یادآور اینجا تنظیم می‌شوند.',
    apis:[{m:'PUT',p:'/api/hospital/profile',auth:'manage_hospital_settings',resp:'به‌روزرسانی نام/آدرس/تنظیمات بیمارستان'},
      {m:'PUT',p:'/api/policy/period',auth:'manage_hospital_settings',resp:'تنظیم دوره‌ی سراسری اعتباربخشی'}]},
  {id:'profile', name:'پروفایل کاربر', purpose:'اطلاعات حساب شخصی و تغییر رمز عبور.',
    fe:'public/js/app.js → renderProfile() (خط ۳۴۶۴)',
    be:'src/routes/auth.js → GET /me (خط ۲۲۴)، POST /change-password (خط ۲۴۲)',
    roles:'همه‌ی کاربران، فقط حساب خودشان.', deps:'امضای الکترونیکی شخصی هم از همین‌جا در دسترس است.',
    apis:[{m:'POST',p:'/api/auth/change-password',auth:'ورود لازم',resp:'تغییر رمز؛ نیازمند رمز فعلی'}]},
  {id:'guide_timeline', name:'راهنمای گام‌به‌گام (دستیار)', purpose:'نوار راهنمای شخصی‌سازی‌شده با نقاط عطف قطعی مشتق‌شده از داده‌ی واقعی.',
    fe:'public/js/app.js → renderRoleGuide() (خط ۶۵۳۱)، renderGuideWidget() (خط ۹۸۶)',
    be:'src/routes/api.js → GET /guide-timeline، POST dismiss/snooze (خط ۱۴۹۱-۱۵۲۴)',
    roles:'همه‌ی کاربران؛ محتوا per نقش فرق دارد.',
    deps:'نقاط عطف از داده‌ی واقعی سایر ماژول‌ها مشتق می‌شود، نه یک چک‌لیست دستی جدا.',
    apis:[{m:'GET',p:'/api/guide-timeline',auth:'ورود لازم',resp:'فهرست milestone با وضعیت انجام‌شده/باقی‌مانده'}]},
  {id:'activities', name:'فعالیت‌ها (فرم‌ساز داده‌محور)', purpose:'تعریف نوع فعالیت با فرم‌ساز سفارشی و ثبت رکورد آن.',
    fe:'public/js/app.js → renderActivities() (خط ۶۶۲۶)',
    be:'src/routes/api.js → activities/types* (خط ۲۶۶-۳۱۱)، activities/records* (خط ۳۱۱-۳۶۷، ۱۷۰۴)، mapping (خط ۱۶۳۱)',
    roles:'manage_activity_types برای تعریف نوع؛ submit_activity_record برای ثبت.',
    deps:'شواهد پیوست به هر رکورد از /activities/records/:id/evidence.',
    apis:[{m:'POST',p:'/api/activities/types',auth:'manage_activity_types',resp:'تعریف نوع فعالیت با form_schema سفارشی'},
      {m:'POST',p:'/api/activities/records',auth:'submit_activity_record',resp:'ثبت یک رکورد فعالیت طبق form_schema'}]},
  {id:'superadmin_panel', name:'پنل سوپرادمین (خودش)', purpose:'مدیریت پلتفرم بالادست همه‌ی بیمارستان‌ها: بکاپ، لاگ خطا، لاگ فعالیت، کاربران، همین مستندات.',
    fe:'public/js/app.js → renderSuperPanel() (خط ۱۶۸۹) و ۵ تب زیرش',
    be:'src/routes/super.js — hospitals*, error-log, activity-log, user-summary, users/:id/*, backup/download, backup/restore',
    roles:'superAdminRequired — فقط توکن type: super_admin؛ کاملاً جدا از توکن کاربران عادی بیمارستان.',
    deps:'بالادست همه‌ی بیمارستان‌هاست؛ به داده‌ی درون‌سازمانی (متن گزارش/صورت‌جلسه) دسترسی مستقیم ندارد، فقط فراداده‌ی مدیریتی.',
    apis:[{m:'GET',p:'/api/super/hospitals',auth:'superAdminRequired',resp:'فهرست همه‌ی بیمارستان‌ها با شمار کاربر/کمیته'},
      {m:'GET',p:'/api/super/backup/download',auth:'superAdminRequired',resp:'دانلود فایل .db کامل (اسنپ‌شات سازگار)'},
      {m:'POST',p:'/api/super/backup/restore',auth:'superAdminRequired',resp:'جایگزینی کل دیتابیس از فایل آپلودی'}]},
];

let S_MODDOC = 'overview';
let S_MODDOC_Q = '';
function renderSuperHelpTab(){
  $('superTabContent').innerHTML=`<div class="panel g"><div class="phd"><div class="abadge">📖</div>
    <div><h3>مستندات ماژول‌ها و API داخلی</h3>
    <div class="sub">${fa(MODULE_DOCS.length)} ماژول مستقل — وقتی مشکلی هست، دقیقاً بگویید کدام ماژول (مثلاً «کمیته‌ها» یا «چک‌لیست‌ها») تا مستقیم سراغ فایل/مسیر همان برویم.</div></div></div>
    <div class="pbody" style="padding-top:0">
      <div style="display:grid;grid-template-columns:270px 1fr;gap:16px;align-items:start" class="moddoc-grid">
        <div>
          <input id="moddocQ" placeholder="جستجوی ماژول (نام، فایل، مسیر API)…" value="${esc(S_MODDOC_Q)}" oninput="moddocSearch(this.value)"
            style="width:100%;padding:9px 12px;border-radius:9px;background:var(--subpanel-2);border:1px solid var(--bd);color:var(--th);margin-bottom:10px;box-sizing:border-box">
          <div id="moddocList" style="display:flex;flex-direction:column;gap:4px;max-height:600px;overflow:auto"></div>
        </div>
        <div id="moddocDetail" style="min-height:200px"></div>
      </div>
    </div></div>`;
  drawModdocList(); drawModdocDetail();
}
function moddocSearch(v){ S_MODDOC_Q=v; drawModdocList(); }
function moddocMatch(m,q){
  if(!q) return true;
  const hay=[m.name,m.purpose,m.fe,m.be,m.roles,m.deps,...(m.apis||[]).map(a=>a.p)].join(' ');
  return hay.toLowerCase().includes(q.toLowerCase()) || hay.includes(q);
}
function drawModdocList(){
  const box=$('moddocList'); if(!box) return;
  const q=S_MODDOC_Q.trim();
  const overview={id:'overview',name:'▸ نمای کلی سامانه (چندمستأجری، نقش‌ها، بکاپ)'};
  const items=[overview,...MODULE_DOCS].filter(m=>m.id==='overview'?(!q||moddocMatch({name:m.name,purpose:'',fe:'',be:'',roles:'',deps:'',apis:[]},q)):moddocMatch(m,q));
  box.innerHTML = items.length? items.map(m=>`<button class="btn btn-sm ${m.id===S_MODDOC?'btn-g':'btn-o'}"
    style="text-align:right;justify-content:flex-start;white-space:normal;line-height:1.5" onclick="selectModdoc('${m.id}')">${esc(m.name)}</button>`).join('')
    : '<div class="empty">ماژولی با این عبارت پیدا نشد</div>';
}
function selectModdoc(id){ S_MODDOC=id; drawModdocList(); drawModdocDetail(); }
function drawModdocDetail(){
  const box=$('moddocDetail'); if(!box) return;
  if(S_MODDOC==='overview'){ box.innerHTML=`<div class="panel" style="line-height:2;font-size:14px;padding:16px">${SUPER_HELP_HTML}</div>`; return; }
  const m=MODULE_DOCS.find(x=>x.id===S_MODDOC);
  if(!m){ box.innerHTML='<div class="empty">از فهرست سمت راست یک ماژول را انتخاب کنید</div>'; return; }
  box.innerHTML=`<div class="panel" style="line-height:1.9;padding:18px">
    <h3 style="color:var(--gdl);margin-bottom:4px">${esc(m.name)}</h3>
    <p style="margin:6px 0 16px;color:var(--th)">${esc(m.purpose)}</p>
    <div style="margin-bottom:12px"><b style="color:var(--gdl)">فایل‌های اصلی</b>
      <div class="sub" style="direction:ltr;text-align:right;font-family:monospace;font-size:12.5px;margin-top:5px;line-height:2;background:var(--subpanel);border-radius:8px;padding:8px 10px">
        فرانت: ${esc(m.fe)}<br>بک‌اند: ${esc(m.be)}</div></div>
    <div style="margin-bottom:12px"><b style="color:var(--gdl)">کاربران مجاز</b><div class="sub" style="margin-top:5px">${esc(m.roles)}</div></div>
    <div style="margin-bottom:16px"><b style="color:var(--gdl)">وابستگی‌ها</b><div class="sub" style="margin-top:5px">${esc(m.deps||'—')}</div></div>
    ${m.apis&&m.apis.length?`<div style="border-top:1px solid var(--bd);padding-top:14px">
      <b style="color:var(--gdl)">مرجع API</b>
      <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>متد و مسیر</th><th>احراز هویت</th><th>پاسخ/رفتار</th></tr></thead>
      <tbody>${m.apis.map(a=>`<tr><td style="direction:ltr;text-align:right;font-family:monospace;font-size:12.5px;color:var(--th);white-space:nowrap">${esc(a.m)} ${esc(a.p)}</td>
        <td style="font-size:12px">${esc(a.auth)}</td><td style="font-size:12px">${esc(a.resp)}</td></tr>`).join('')}</tbody></table></div>
    </div>`:''}
  </div>`;
}
function checkRestoreEnabled(){
  const f=$('rst_file'), p=$('rst_phrase'), b=$('rst_btn');
  if(!f||!p||!b) return;
  b.disabled = !(f.files && f.files[0] && p.value.trim()==='بازگردانی');
}
async function superDoRestore(){
  const f=$('rst_file'), p=$('rst_phrase'), b=$('rst_btn'), out=$('rst_result');
  if(!f.files||!f.files[0]){ toast('فایل بکاپ را انتخاب کنید',true); return; }
  if(!await BTN.confirmDanger('آیا مطمئن هستید؟ تمام داده‌های فعلی با محتوای این فایل جایگزین می‌شود.')) return;
  b.disabled=true; out.innerHTML='<div class="empty">در حال بازگردانی…</div>';
  try{
    const r = await API.superRestoreBackup(f.files[0], p.value.trim());
    out.innerHTML = `<div class="bdg b1" style="display:block;padding:10px">${esc(r.message||'بازگردانی انجام شد')}</div>`;
    toast('دیتابیس بازگردانی شد — سرور را ری‌استارت کنید');
  }catch(e){
    out.innerHTML = `<div class="bdg b3" style="display:block;padding:10px">${esc(e.message)}</div>`;
    toast(e.message,true);
  } finally {
    checkRestoreEnabled();
  }
}
async function loadSuperSettings(){
  try{
    const {require_password, profile_fields_enabled, light_theme_enabled}=await API.superSettings();
    const cb=$('pwToggle'); if(cb) cb.checked=!!require_password;
    const cb2=$('profileFieldsToggle'); if(cb2) cb2.checked=profile_fields_enabled!==false;
    const cb3=$('lightThemeToggle'); if(cb3) cb3.checked=!!light_theme_enabled;
  }
  catch(e){ /* غیرمهم — پیش‌فرض خاموش می‌ماند */ }
}
async function toggleRequirePassword(checked){
  try{ await API.superSetRequirePassword(checked); toast(checked?'پسورد اجباری روشن شد':'پسورد اجباری خاموش شد'); }
  catch(e){ toast(e.message,true); const cb=$('pwToggle'); if(cb) cb.checked=!checked; }
}
async function toggleProfileFieldsEnabled(checked){
  try{ await API.superSetProfileFieldsEnabled(checked); toast(checked?'فیلدهای پروفایل شخصی روشن شد':'فیلدهای پروفایل شخصی خاموش شد'); }
  catch(e){ toast(e.message,true); const cb=$('profileFieldsToggle'); if(cb) cb.checked=!checked; }
}
async function toggleLightThemeEnabled(checked){
  try{ await API.superSetLightThemeEnabled(checked); toast(checked?'تمِ روشن برای کاربران فعال شد':'تمِ روشن غیرفعال شد — همه تمِ تیره می‌بینند'); }
  catch(e){ toast(e.message,true); const cb=$('lightThemeToggle'); if(cb) cb.checked=!checked; }
}
// مرکز درمانی‌ای که پنل اختصاصی‌اش باز است؛ null یعنی فهرست مراکز نمایش داده می‌شود.
//
// چرا این حالت اضافه شد: قبلاً همه‌ی مراکز در یک جدول بودند و هفت دکمه‌ی عملیاتی هر
// مرکز کنار هم در یک ردیف می‌نشست، و فرم‌های زیرین همه در یک #superSub مشترک زیر کلِ
// جدول باز می‌شدند. با چند مرکز، تشخیص اینکه فرمِ بازشده مال کدام مرکز است سخت می‌شد.
// حالا روی نام مرکز که بزنی، پنل مدیریت همان مرکز و فقط همان باز می‌شود.
let SUPER_HOSP=null;
let SUPER_HOSP_CACHE=[];

// بعد از هر تغییر، همان نمایی که کاربر در آن است بازسازی می‌شود — نه اینکه از پنل
// یک مرکز پرت شود بیرون به فهرست.
function superRefreshHospitals(){
  // کش عمداً خالی می‌شود: این تابع بعد از تغییر (تغییر نام، لوگو، فعال/غیرفعال) صدا
  // زده می‌شود و اگر از کش بخوانیم، پنل همان مقدار قدیمی را دوباره می‌کشد.
  SUPER_HOSP_CACHE=[];
  if(SUPER_HOSP) superOpenHospital(SUPER_HOSP); else loadSuperHospitals();
}

function superBackToHospitals(){ SUPER_HOSP=null; loadSuperHospitals(); }

async function loadSuperHospitals(){
  SUPER_HOSP=null;
  try{
    const {hospitals}=await API.superHospitals();
    SUPER_HOSP_CACHE=hospitals;
    if(!hospitals.length){ $('hospList').innerHTML='<div class="empty">هنوز مرکز درمانی‌ای ثبت نشده است</div>'; return; }
    $('hospList').innerHTML=`<div class="hgrid">${hospitals.map(h=>`
      <button type="button" class="hcard" onclick="superOpenHospital('${h.id}')">
        <div class="hcard-top">
          ${h.logo_url?`<img class="hcard-logo" src="/api/super/hospitals/${h.id}/logo?t=${Date.now()}" alt="" onerror="this.remove()">`
                      :'<span class="hcard-logo hcard-logo-ph">✦</span>'}
          <span class="hcard-name">${esc(h.name)}</span>
          ${h.is_active?'<span class="bdg b1">فعال</span>':'<span class="bdg b3">غیرفعال</span>'}
        </div>
        <div class="hcard-meta">
          <span><b>${fa(h.user_count)}</b> کاربر</span>
          <span><b>${fa(h.committee_count)}</b> کمیته</span>
        </div>
        <div class="hcard-cta">مدیریت این مرکز ›</div>
      </button>`).join('')}</div>`;
  }catch(e){ $('hospList').innerHTML=`<div class="empty">${esc(e.message)}</div>`; }
}

// پنل اختصاصی یک مرکز درمانی — همه‌ی عملیات همان مرکز، و فرم‌هایش داخل همین پنل
// باز می‌شوند (#superSub اینجاست، نه زیر فهرست همه‌ی مراکز).
async function superOpenHospital(id){
  SUPER_HOSP=id;
  let h=SUPER_HOSP_CACHE.find(x=>x.id===id);
  if(!h){
    try{ const {hospitals}=await API.superHospitals(); SUPER_HOSP_CACHE=hospitals; h=hospitals.find(x=>x.id===id); }
    catch(e){ $('hospList').innerHTML=`<div class="empty">${esc(e.message)}</div>`; return; }
  }
  if(!h){ superBackToHospitals(); return; }
  const nameJs=jsArg(h.name);
  $('hospList').innerHTML=`
    <div class="hdet">
      <div class="hdet-hd">
        <button type="button" class="btn btn-o btn-sm" onclick="superBackToHospitals()">‹ همه‌ی مراکز</button>
        <div class="hdet-title">
          ${h.logo_url?`<img class="hcard-logo" src="/api/super/hospitals/${h.id}/logo?t=${Date.now()}" alt="" onerror="this.remove()">`
                      :'<span class="hcard-logo hcard-logo-ph">✦</span>'}
          <span id="hname_${h.id}">${esc(h.name)}</span>
          <a href="javascript:void(0)" title="ویرایش نام" onclick="superEditName('${h.id}')" style="color:var(--gdl)">✎</a>
          ${h.is_active?'<span class="bdg b1">فعال</span>':'<span class="bdg b3">غیرفعال</span>'}
        </div>
      </div>
      <div class="hdet-meta">
        <span><b>${fa(h.user_count)}</b> کاربر</span>
        <span><b>${fa(h.committee_count)}</b> کمیته</span>
      </div>
      <div class="hdet-actions">
        <button class="btn btn-o btn-sm" onclick="superToggleHospital('${h.id}',${h.is_active?0:1})">${h.is_active?'غیرفعال کردن':'فعال کردن'}</button>
        <button class="btn btn-o btn-sm" onclick="superAuditLog('${h.id}')">مشاهده لاگ</button>
        <button class="btn btn-o btn-sm" onclick="superAdminForm('${h.id}')">تعیین ادمین</button>
        <button class="btn btn-o btn-sm" onclick="superMgmtPositionsForm('${h.id}')">پست‌های حوزه‌ی مدیریت</button>
        <button class="btn btn-o btn-sm" onclick="superFeaturesForm('${h.id}','${nameJs}')">امکانات و پکیج</button>
        <button class="btn btn-o btn-sm" onclick="superAssistantForm('${h.id}','${nameJs}')">تنظیمات دستیار «دانا»</button>
        <button class="btn btn-o btn-sm" onclick="superAssistantLog('${h.id}','${nameJs}')">لاگ گفت‌وگوهای «دانا»</button>
        <button class="btn btn-o btn-sm" onclick="superPickLogo('${h.id}')">${h.logo_url?'تعویض لوگو':'بارگذاری لوگو'}</button>
        <a class="btn btn-o btn-sm" href="/public/services/${h.id}" target="_blank" rel="noopener"
           title="نشانی قابل اشتراک‌گذاری/QR فرم‌های همگانی این مرکز">درگاه همگانی ↗</a>
      </div>
      <div id="superSub" style="margin-top:16px"></div>
    </div>`;
}
// بارگذاری لوگوی بیمارستان — انتخاب فایل بدون افزودن فیلد دائمی به جدول
// راهنمای اندازه‌ی لوگو — خواسته‌ی صریح کاربر: «قبلش به کاربر بگو چند در چند
// آپلود کند». اعداد دلبخواهی نیستند: سربرگ لوگو را با ارتفاع ۴۶px و حداکثر عرض
// ۱۲۰px می‌کشد، و برای چاپ و صفحه‌ی رتینا ضریب ۴ لازم است ⇒ حدود ۵۱۲px.
// سرور هم هر تصویر را داخل جعبه‌ی ۵۱۲×۵۱۲ جا می‌دهد.
const LOGO_SPEC = {
  box: 512,
  title: 'پیش از انتخاب فایل — اندازه‌ی لوگو',
  html: `
    <p><b>اندازه‌ی پیشنهادی: ۵۱۲ × ۵۱۲ پیکسل</b> (مربع). تصویر بزرگ‌تر هم قبول
    می‌شود و خودکار کوچک می‌شود؛ کوچک‌تر از این، در چاپ محو می‌افتد.</p>
    <ul>
      <li><b>نسبت:</b> ترجیحاً مربع. لوگوی عریض هم کار می‌کند، ولی در سربرگ با
      ارتفاع ۴۶ پیکسل و حداکثر عرض ۱۲۰ پیکسل کشیده می‌شود — پس اگر خیلی عریض
      باشد، ریز دیده می‌شود.</li>
      <li><b>قالب:</b> PNG با زمینه‌ی شفاف بهترین نتیجه را می‌دهد. JPG و WEBP هم
      قبول است. حداکثر حجم: ۵ مگابایت.</li>
      <li><b>حاشیه:</b> دور نشان چند پیکسل فضای خالی بگذارید تا در سربرگ به خط
      جداکننده نچسبد.</li>
      <li><b>رنگ:</b> نشان روی زمینه‌ی سفید چاپ می‌شود؛ از نشانِ سفیدِ توپر
      پرهیز کنید چون در چاپ ناپدید می‌شود.</li>
    </ul>`
};
