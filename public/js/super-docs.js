/* =====================================================================
   دو بخش تازه‌ی پنل سوپرادمین
   ---------------------------------------------------------------------
   ۱) «ارائه برای فروش» — چیزی که جلوی خریدار باز می‌شود: چه مشکلی را حل
      می‌کنیم، چه خدماتی داریم، هر کدام چطور کار می‌کند، و پاسخ سؤال‌هایی
      که خریدارِ بیمارستانی واقعاً می‌پرسد.
   ۲) «نحوه‌ی عملکرد سامانه» — نقشه‌ی فنی کامل: معماری، جریان داده، مدل
      دسترسی، چرخه‌ی عمر یک سنجه، و چیزهایی که باید بداند تا بتواند سامانه
      را اداره کند.

   عمداً در فایل جداست: app.js از هشت‌هزار خط گذشته و متنِ ثابت نباید
   بیشتر بادش کند. هر دو تابع روی window می‌نشینند تا superSwitchTab
   بتواند صدایشان بزند.
   ===================================================================== */
(function (global) {
  'use strict';

  var e = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var I = function (n, c) { return (typeof ic === 'function') ? ic(n, c) : ''; };

  /* ------------------------------------------------------------------
     بخش ۱ — ارائه برای فروش
     ------------------------------------------------------------------ */

  // مشکل‌هایی که بیمارستان پیش از خرید دارد. اینها ادعای بازاریابی نیستند؛
  // هر کدام مستقیماً به یک ماژول موجود در همین سامانه وصل است.
  var PAINS = [
    { p: 'یک ماه پیش از ارزیابی، مستندات در ده جای مختلف پخش است: فلش سوپروایزر، ایمیل مدیر، زونکن دفتر بهبود.',
      s: 'مدارک کنترل‌شده + کتابخانه‌ی دیجیتال: هر سند یک کد، یک نسخه‌ی معتبر، یک گردش امضا و یک تاریخچه دارد.' },
    { p: 'معلوم نیست کدام سنجه پر شده و کدام نه؛ فهرست دستیِ اکسل همیشه از واقعیت عقب است.',
      s: 'درخت ۳۹۵ سنجه‌ی ویرایش ششم با وضعیت زنده، درصد پیشرفت به‌تفکیک محور، و شواهد پیوست‌شده زیر هر سنجه.' },
    { p: 'صورت‌جلسه‌ی کمیته نوشته می‌شود ولی مصوبه‌ها پیگیری نمی‌شوند و جلسه‌ی بعد همان بحث تکرار می‌شود.',
      s: '۱۷+ کمیته با صورت‌جلسه‌ی ساختاریافته؛ هر مصوبه مسئول و مهلت دارد و روی کارتابل همان فرد می‌نشیند.' },
    { p: 'خطاها گزارش نمی‌شوند چون کارکنان می‌ترسند نامشان جایی ثبت شود.',
      s: 'گزارش خطا بدون ورود و بدون نام، با کد رهگیری؛ گزارش‌دهنده وضعیت رسیدگی را با همان کد دنبال می‌کند.' },
    { p: 'شاخص‌های عملکردی سالی یک بار و شب ارزیابی محاسبه می‌شوند.',
      s: 'کارت امتیازی متوازن با ثبت ماهانه، تارگت و جهت مطلوب؛ روند هر شاخص در نمودار دیده می‌شود.' },
    { p: 'نیازسنجی آموزشی روی کاغذ انجام می‌شود و ربطی به برنامه‌ی آموزشی سال ندارد.',
      s: 'نیازسنجی از پایین (هر کارمند خودش ثبت می‌کند) به برنامه‌ی آموزشی و به سنجه‌های مرتبط وصل است.' },
    { p: 'هر بار که فردی جابه‌جا می‌شود، معلوم نیست کارهای نیمه‌کاره‌اش دست کیست.',
      s: 'کارتابل شخصی + کاربر جانشین: اقلام فرد غایب با برچسب «به‌جای …» روی کارتابل جانشین ادغام می‌شود.' },
    { p: 'بیمارستان بخش دیالیز ندارد، ولی سنجه‌های دیالیز در مخرج امتیازش می‌مانند و درصد آمادگی را پایین می‌آورند.',
      s: 'وضعیت «غیرقابل ارزیابی» با دلیل اجباری — دقیقاً مثل مرحله‌ی خوداظهاریِ فرایند رسمی، این سنجه‌ها از مخرج بیرون می‌روند.' },
    { p: 'خودارزیابی امسال روی پارسال نوشته می‌شود و نمی‌شود نشان داد کدام سنجه افت کرده.',
      s: 'هر دوره مستقل بایگانی می‌شود؛ با عوض کردن سال، خودارزیابی همان دوره می‌آید.' },
    { p: 'روز ارزیابی معلوم می‌شود خودمان را خیلی جاها بالاتر از واقعیت دیده بودیم.',
      s: 'نمره‌ی ارزیاب داخلی و بیرونی جدا از خودارزیابی ثبت می‌شود و گزارش «خوش‌بینی ما» دقیقاً همان شکاف‌ها را فهرست می‌کند — پیش از ارزیابی رسمی.' },
    { p: 'کسی که از سازمان می‌رود می‌تواند پیش از رفتن همه چیز را پاک کند.',
      s: 'هیچ حذفی نابودکننده نیست: هر رکورد پیش از حذف اسنپ‌شات می‌شود و سوپرادمین برش می‌گرداند.' },
    { p: 'ده‌ها خط‌مشی و روش اجرایی روی کاغذ یا PDF اسکن‌شده هستند و تایپ دوباره‌شان هفته‌ها طول می‌کشد.',
      s: 'همان فروشنده‌ی هوش مصنوعیِ سامانه (AvalAI یا هر فروشنده‌ی دیگر) متن PDF را می‌خواند — چه لایه‌ی متنی داشته باشد چه فقط اسکن باشد — و آماده‌ی درج در سند می‌کند.' },
    { p: 'قبل از راه‌اندازی، صدها فایل قدیمی باید یکی‌یکی باز و در ماژول درست ثبت شوند.',
      s: 'آپلود انبوه: چند فایل با هم بالا می‌روند، سامانه نوع هر کدام (خط‌مشی، روش اجرایی، دستورالعمل یا فرآیند) را حدس می‌زند و بعد از تأیید کاربر در همان ماژول درج می‌شوند.' }
  ];

  // خدمات — هر کدام: چه هست، چطور کار می‌کند، چه چیزی تحویل می‌دهد.
  var SERVICES = [
    { ic: 'clipboard', t: 'اعتباربخشی (ویرایش ششم)',
      w: 'درخت کامل ۸۸ استاندارد و ۳۹۵ سنجه در سه بخش کلان «رهبری و مدیریت»، «مراقبت و درمان» و «حمایت از گیرنده خدمت».',
      h: 'هر سنجه پنج وضعیت دارد (انطباق کامل / نسبی / عدم انطباق / بررسی‌نشده / غیرقابل ارزیابی)، به‌علاوه‌ی مسئول، مهلت، شواهد پیوست، و روش ارزیابیِ ارزیاب (مستندات، مشاهده، مصاحبه). نمره‌ی ارزیاب داخلی دانشگاه و ارزیاب بیرونی وزارت جدا از خودارزیابی ثبت می‌شود. دسترسی هر سمت با «محور» محدود می‌شود، پس کارشناس تغذیه فقط سنجه‌های خودش را می‌بیند.',
      o: 'درصد آمادگی به‌تفکیک محور و استاندارد، گزارش «کجا خودمان را بالاتر دیده‌ایم»، فهرست شکاف‌ها، و بسته‌ی شواهد آماده‌ی ارائه به ارزیاب. هر دوره جداگانه بایگانی می‌شود.' },
    { ic: 'docs', t: 'مدارک کنترل‌شده',
      w: 'خط‌مشی، روش اجرایی، دستورالعمل و فرم — با ساختار استانداردِ موردِ انتظار ارزیاب.',
      h: 'هر سند کد یکتا، شماره‌ی نسخه، جدول امضا (تهیه/بازنگری/تأیید/ابلاغ)، فهرست توزیع و تاریخ بازنگری بعدی دارد. نسخه‌ی قبلی بایگانی می‌شود، پاک نمی‌شود.',
      o: 'یک نسخه‌ی معتبر برای هر سند، تاریخچه‌ی کامل تغییرات، و هشدار سندهای سررسیدشده.' },
    { ic: 'users', t: 'کمیته‌ها',
      w: '۱۷+ کمیته‌ی الزامی بیمارستانی با اعضا، اهداف و شرح وظایف از پیش تعریف‌شده.',
      h: 'جلسه در تقویم رزرو می‌شود (با تشخیص تداخل اتاق)، صورت‌جلسه ساختاریافته ثبت می‌شود و هر مصوبه به یک مسئول و یک مهلت گره می‌خورد.',
      o: 'دفترچه‌ی کامل جلسات، و داشبورد «مصوبه‌های عقب‌افتاده» که در جلسه‌ی بعد روی میز است.' },
    { ic: 'alert', t: 'ایمنی بیمار و مدیریت خطر',
      w: 'گزارش خطا و وقایع ناخواسته، FMEA، و بازدید میدانی مدیریتی (واکراند).',
      h: 'گزارش خطا از دو مسیر می‌آید: داخل سامانه، یا فرم عمومی بدون ورود با محدودیت نرخ. هر گزارش کد رهگیری خودکار می‌گیرد و در صورت شدت بالا فرم RCA باز می‌شود.',
      o: 'نرخ گزارش‌دهی، طبقه‌بندی خطاها، و مستند FMEA برای فرایندهای پرخطر.' },
    { ic: 'chart', t: 'کارت امتیازی متوازن (BSC)',
      w: 'شاخص‌های عملکردی در چهار وجه، با تارگت و جهت مطلوب.',
      h: 'مقدار هر شاخص ماهانه ثبت می‌شود؛ سامانه خودش انحراف از تارگت و روند را حساب می‌کند.',
      o: 'داشبورد مدیریتی و نمودار روند برای هیئت‌مدیره — بدون اکسل دستی.' },
    { ic: 'check', t: 'چک‌لیست و حسابرسی داخلی',
      w: 'بانک چک‌لیست با نمره‌دهی لیکرت یا بله/خیر، و دورِ حسابرسی داخلی روی همان چک‌لیست‌ها.',
      h: 'چک‌لیست به حیطه و بخش تخصیص می‌یابد؛ نتیجه‌ی هر اجرا با تاریخ و اجراکننده ذخیره می‌شود و قابل مقایسه در زمان است.',
      o: 'روند انطباق هر بخش، و خروجی CSV برای تحلیل بیرونی.' },
    { ic: 'graduation', t: 'آموزش و بهبود مستمر',
      w: 'نیازسنجی آموزشی و برنامه‌های بهبود کیفیت.',
      h: 'نیازسنجی از پایین باز است: هر کارمند نیاز خودش را ثبت می‌کند؛ سوپروایزر آموزشی آن‌ها را در برنامه‌ی سالانه جمع می‌بندد.',
      o: 'برنامه‌ی آموزشی مستند و قابل دفاع، متصل به سنجه‌های مرتبط.' },
    { ic: 'tree', t: 'ساختار و سلسله‌مراتب سازمانی',
      w: 'چارت سازمانی، حوزه‌های مدیریت/پرستاری/پشتیبانی، پست سازمانی، واحد و ساختمان.',
      h: 'سلسله‌مراتب پرستاری جدا مدل شده: سوپروایزر، بخش، سرپرستار و پرسنل، به‌همراه داشبورد سرپرستار برای حضور و غیاب، مرخصی و وظایف شیفت.',
      o: 'نمودار سازمانی قابل چاپ و مبنای مشخصِ «چه کسی پاسخگوی چه چیزی است».' },
    { ic: 'heart', t: 'خدمات بدون احراز هویت',
      w: 'چهار فرم عمومی مخصوص هر مرکز: گزارش خطا، FMEA، انتقاد و پیشنهاد، نظرسنجی رضایت.',
      h: 'لینک هر مرکز شامل شناسه‌ی همان مرکز است؛ فرم‌ها rate-limit دارند و بدون ورود پر می‌شوند.',
      o: 'صدای بیمار و کارکنان بدون واسطه، مستقیم روی داشبورد مرکز.' },
    { ic: 'sparkle', t: 'دستیار هوشمند نقش‌محور',
      w: 'دو پرسش: «الان باید چه کار کنم؟» و «بررسی وظایف من».',
      h: 'کاتالوگ وظایف برای ۱۷ سمت بیمارستانی تعریف شده و هر وظیفه تناوب دارد (ماهانه/فصلی/سالانه). سامانه وضعیت واقعی داده را می‌خواند، نه یک چک‌لیست ثابت.',
      o: 'هر کاربر می‌داند دقیقاً کدام کار در دوره‌ی جاری مانده — بدون آموزش جداگانه.' },
    { ic: 'docs', t: 'خواندن PDF و عکس با هوش مصنوعی',
      w: 'استخراج متن از هر سندِ کاغذی یا اسکن‌شده، با هر فروشنده‌ی هوش مصنوعیِ متصل (AvalAI، OpenRouter، Anthropic، Gemini و غیره).',
      h: 'اگر PDF لایه‌ی متنی داشته باشد مستقیم خوانده می‌شود؛ اگر فقط اسکن باشد، صفحه به تصویر تبدیل و به مدل چندوجهی داده می‌شود. متن فارسی با جهت درست بازسازی می‌شود.',
      o: 'متنِ آماده برای درج در هر فیلد سند — بدون تایپ دوباره‌ی خط‌مشی‌های قدیمی.' },
    { ic: 'docs', t: 'آپلود انبوه اسناد',
      w: 'چند فایل هم‌زمان بالا می‌روند؛ سامانه نوع هر سند را حدس می‌زند.',
      h: 'محتوای هر فایل خوانده و بین خط‌مشی، روش اجرایی، دستورالعمل و فرآیند طبقه‌بندی می‌شود؛ کاربر پیش از درج نهایی همه‌چیز را تأیید می‌کند.',
      o: 'انتقال آرشیو کاغذی قدیم به سامانه در چند دقیقه، نه چند هفته.' }
  ];

  /* مسیر ارائه. ترتیبش تصادفی نیست: هر قدم چیزی را باز می‌کند که قدم بعد
     رویش سوار می‌شود، و «کجا» دقیقاً همان صفحه‌ای است که باید باز باشد —
     تا موقع ارائه کسی دنبال منو نگردد. */
  var DEMO = [
    { t: '۱) صفحه‌ی ورود', w: 'صفحه‌ی اصلی مرکز',
      d: 'چارت سمت‌ها را نشان دهید: ریاست بالا، بعد مسئول فنی و بقیه طبق چارت واقعی. ورود با کلیک روی سمت است، نه حفظ‌کردن نام کاربری.',
      say: 'کارکنان ما اسم کاربری یادشان نمی‌ماند — اینجا روی سمت خودشان کلیک می‌کنند.' },
    { t: '۲) داشبورد اعتباربخشی', w: 'داشبورد',
      d: 'درصد آمادگی، توزیع وضعیت ۳۹۵ سنجه، رتبه‌ی تخمینی، و سنجه‌های ایمنی بیمارِ باقی‌مانده. این همان عددی است که مدیر هر روز می‌خواهد.',
      say: 'این عدد هر روز زنده است، نه چیزی که شب ارزیابی در اکسل ساخته شود.' },
    { t: '۳) درخت سنجه‌ها', w: 'اعتباربخشی ← سنجه‌ها و ارزیابی',
      d: 'یک محور را باز کنید، یک سنجه را باز کنید: متن رسمی کتاب، اقدامات لازم، روش ارزیابی ارزیاب، شواهد پیوست، و مسئول.',
      say: 'ارزیاب همین سه چیز را می‌پرسد: سند، مشاهده، مصاحبه. سامانه برای هر سنجه می‌گوید کدامش.' },
    { t: '۴) غیرقابل ارزیابی', w: 'همان صفحه',
      d: 'روی یک سنجه وضعیت «غیرقابل ارزیابی» بگذارید و دلیل بنویسید؛ برگردید به داشبورد و نشان دهید مخرج کم شد.',
      say: 'بیمارستانی که دیالیز ندارد نباید بابت نداشتنش جریمه شود.' },
    { t: '۵) اختلاف با ارزیاب', w: 'اعتباربخشی ← اختلاف با ارزیاب',
      d: 'مهم‌ترین صفحه برای مدیر. «خوش‌بینی ما» یعنی جاهایی که در ارزیابی رسمی امتیاز از دست می‌رود.',
      say: 'این فهرست را یک ماه پیش از ارزیابی داشته باشید، دیگر غافلگیر نمی‌شوید.' },
    { t: '۶) مدارک کنترل‌شده', w: 'اعتباربخشی ← مدارک و کتابخانه',
      d: 'یک خط‌مشی را باز کنید: سربرگ، کد، نسخه، جدول امضا، تاریخ بازنگری بعدی. دکمه‌ی چاپ را بزنید و نشان دهید سربرگ روی هر صفحه می‌افتد.',
      say: 'همین را می‌شود همان لحظه چاپ کرد و جلوی ارزیاب گذاشت.' },
    { t: '۷) کمیته‌ها و مصوبه‌ها', w: 'کیفیت ← کمیته‌ها',
      d: 'یک کمیته را باز کنید و صورت‌جلسه‌ها را نشان دهید — هر مصوبه مسئول و مهلت دارد.',
      say: 'مصوبه‌ای که مسئول و مهلت ندارد، مصوبه نیست.' },
    { t: '۸) صدای بیمار', w: 'لینک عمومی مرکز',
      d: 'یکی از فرم‌های بدون ورود را روی موبایل باز کنید (QR روی دیوار بخش). گزارش خطا بدون نام و با کد رهگیری.',
      say: 'کارکنان وقتی خطا را گزارش می‌کنند که مطمئن باشند نامشان جایی نمی‌رود.' },
    { t: '۹) سطل بازیافت', w: 'پنل سوپرادمین ← سطل بازیافت',
      d: 'قدم پایانی و عمداً آخر: نشان دهید هیچ حذفی نابودکننده نیست و همه چیز برگشت‌پذیر است.',
      say: 'اگر فردا کسی از سازمان برود و همه چیز را پاک کند، یک کلیک برمی‌گردد.' }
  ];

  // سؤال‌هایی که خریدار بیمارستانی واقعاً می‌پرسد.
  var QA = [
    { q: 'داده‌ی ما جای دیگری می‌رود؟',
      a: 'خیر. سامانه چندمستأجری است و هر رکورد با شناسه‌ی بیمارستان محدود می‌شود. کاربر یک مرکز حتی با دستکاری آدرس هم به داده‌ی مرکز دیگر نمی‌رسد. سوپرادمین پلتفرم فقط فراداده‌ی مدیریتی (تعداد کاربر، تعداد کمیته) را می‌بیند، نه متن گزارش و صورت‌جلسه.' },
    { q: 'روی سرور خودمان نصب می‌شود یا ابری؟',
      a: 'هر دو. سامانه Node.js است و پیش‌فرض روی SQLite کار می‌کند؛ با ست‌کردن یک متغیر محیطی به PostgreSQL سوییچ می‌شود. برای نصب داخلی، فقط Node و یک پوشه‌ی داده لازم است.' },
    { q: 'اینترنت قطع شود چه؟',
      a: 'نسخه‌ی داخلی هیچ وابستگی بیرونی ندارد: فونت، آیکون و همه‌ی دارایی‌ها خودمیزبان‌اند و هیچ CDN یا سرویس شخص ثالثی صدا زده نمی‌شود.' },
    { q: 'کارکنان ما با کامپیوتر راحت نیستند.',
      a: 'ورود با انتخاب سمت انجام می‌شود نه حفظ‌کردن نام کاربری. کنار هر فیلد خالی یک راهنمای «؟» هست که می‌گوید دقیقاً چه باید نوشت، و یک دکمه‌ی جدا که نمونه را پر می‌کند. دستیار هم به هر سمت می‌گوید قدم بعدی‌اش چیست.' },
    { q: 'اگر ویرایش سنجه‌ها عوض شود؟',
      a: 'درخت سنجه داده است نه کد. ویرایش جدید با یک seed جایگزین می‌شود و داده‌ی ثبت‌شده‌ی سال‌های قبل دست‌نخورده می‌ماند.' },
    { q: 'پشتیبان‌گیری چطور است؟',
      a: 'بکاپ خودکار روزانه، به‌علاوه‌ی دانلود دستیِ اسنپ‌شات کامل از همین پنل و بازگردانی از فایل.' },
    { q: 'چند کاربر را تحمل می‌کند؟',
      a: 'مسیرهای داغ ایندکس‌گذاری شده‌اند و کوئری‌ها با محدوده‌ی بیمارستان اجرا می‌شوند. برای مقیاس بزرگ، مهاجرت به PostgreSQL بدون تغییر کد انجام می‌شود.' }
  ];

  global.renderSuperPitchTab = function () {
    var box = document.getElementById('superTabContent');
    if (!box) return;
    box.innerHTML =
      '<div class="panel g"><div class="phd">' + I('sparkle', 'lg') +
        '<div><h3>ارائه‌ی سامانه برای فروش</h3>' +
        '<div class="sub">این صفحه برای باز کردن جلوی خریدار ساخته شده: مسئله، خدمات، و پاسخ سؤال‌های رایج. قابل چاپ است.</div></div>' +
        '<div style="margin-inline-start:auto"><button class="btn btn-o btn-sm" onclick="window.print()">' +
          I('print') + ' چاپ</button></div></div>' +
      '<div class="pbody" style="padding-top:0">' +

        '<div class="sd-sec"><h4>' + I('play') + ' مسیر ارائه — به همین ترتیب نشان دهید</h4>' +
        '<p class="sd-lead">این ترتیب آزموده است: از دردِ شنیده‌شده شروع می‌کند، بعد راه‌حل را ' +
        '<b>روی داده‌ی واقعی</b> نشان می‌دهد، و با چیزی تمام می‌شود که مدیر آن را «ریسک» می‌فهمد. ' +
        'کل مسیر حدود ۱۲ دقیقه است.</p>' +
        '<ol class="sd-route">' + DEMO.map(function (d) {
          return '<li><div class="sd-r-hd"><b>' + e(d.t) + '</b><span class="sd-r-w">' + e(d.w) + '</span></div>' +
            '<p>' + e(d.d) + '</p>' +
            (d.say ? '<p class="sd-r-say">«' + e(d.say) + '»</p>' : '') + '</li>';
        }).join('') + '</ol></div>' +

        '<div class="sd-sec"><h4>' + I('target') + ' سامانه چه چیزی را حل می‌کند</h4>' +
        '<p class="sd-lead">اعتباربخشی یک پروژه‌ی یک‌ماهه پیش از ارزیابی نیست؛ کارِ همیشگیِ همه‌ی واحدهاست. ' +
        'مشکل بیشتر بیمارستان‌ها نبودِ تلاش نیست، پراکندگی است: مستند در یک‌جا، شاهد در جای دیگر، ' +
        'و مسئولیت در هیچ‌جا. این سامانه همان کارها را در یک بستر جمع می‌کند و هر قلم را به یک سمتِ ' +
        'مشخص و یک مهلت گره می‌زند.</p>' +
        '<div class="sd-pains">' + PAINS.map(function (x) {
          return '<div class="sd-pain"><div class="sd-pain-p"><b>مشکل امروز</b>' + e(x.p) + '</div>' +
                 '<div class="sd-pain-s"><b>پاسخ سامانه</b>' + e(x.s) + '</div></div>';
        }).join('') + '</div></div>' +

        '<div class="sd-sec"><h4>' + I('grid') + ' خدمات و نحوه‌ی کارشان</h4>' +
        '<div class="sd-svcs">' + SERVICES.map(function (s) {
          return '<div class="sd-svc"><div class="sd-svc-hd"><span class="sd-svc-ic">' + I(s.ic) + '</span>' +
            '<b>' + e(s.t) + '</b></div>' +
            '<div class="sd-svc-r"><span>چه هست</span><p>' + e(s.w) + '</p></div>' +
            '<div class="sd-svc-r"><span>چطور کار می‌کند</span><p>' + e(s.h) + '</p></div>' +
            '<div class="sd-svc-r"><span>چه تحویل می‌دهد</span><p>' + e(s.o) + '</p></div></div>';
        }).join('') + '</div></div>' +

        '<div class="sd-sec"><h4>' + I('help') + ' سؤال‌های رایج خریدار</h4>' +
        '<div class="sd-qa">' + QA.map(function (x) {
          return '<details class="sd-q"><summary>' + e(x.q) + '</summary><p>' + e(x.a) + '</p></details>';
        }).join('') + '</div></div>' +

        '<div class="sd-note">' + I('alert') +
        '<div><b>پیش از ارائه‌ی واقعی حتماً انجام شود:</b> رمزهای نمونه‌ی سامانه عمومی‌اند و باید عوض شوند؛ ' +
        'و اگر روی پلن رایگان میزبانی می‌شود، داده با هر استقرار از نو ساخته می‌شود — برای مشتری واقعی ' +
        'باید نصب داخلی یا میزبانی با فضای ذخیره‌ی پایدار انتخاب شود.</div></div>' +
      '</div></div>';
  };

  /* ------------------------------------------------------------------
     بخش ۲ — نحوه‌ی عملکرد کل سامانه
     ------------------------------------------------------------------ */

  var LAYERS = [
    { t: 'مرورگر (کلاینت)',
      d: 'یک SPA با جاوااسکریپت خالص، بدون فریم‌ورک و بدون هیچ وابستگی بیرونی. ' +
         'حالت در حافظه نگه داشته می‌شود و صفحه‌ها با go(page) عوض می‌شوند، نه با بارگذاری دوباره.',
      f: 'public/js/app.js · public/js/api.js · public/js/icons.js · public/css/app.css · public/css/design-system.css' },
    { t: 'لایه‌ی API',
      d: 'Express با مسیرهای REST. هر مسیرِ داخل‌سازمانی از میان‌افزار احراز هویت رد می‌شود، ' +
         'سپس از بررسی مجوز، سپس از محدودسازی به بیمارستانِ همان کاربر.',
      f: 'src/routes/*.js · src/middleware/*.js' },
    { t: 'منطق دامنه',
      d: 'محاسبه‌های واقعی سامانه: کاتالوگ وظایف نقش‌ها، منطق دستیار، تقویم جلالی و دامنه‌ی محورها.',
      f: 'src/services/assistant.js · src/services/role-duties.js · src/config/jalali.js · src/config/role-axes.js' },
    { t: 'داده',
      d: 'SQLite با better-sqlite3 (کوئری‌های همگام). با ست‌شدن DB_HOST خودکار به PostgreSQL سوییچ می‌کند. ' +
         'همه‌ی جدول‌های درون‌سازمانی ستون hospital_id دارند.',
      f: 'src/config/database.js · database/*.js' }
  ];

  var FLOW = [
    { n: 1, t: 'ورود', d: 'کاربر مرکز درمانی را انتخاب می‌کند، بعد سمت خودش را از موزاییک سمت‌ها. ' +
        'اگر سوپرادمین «رمز اجباری» را روشن کرده باشد، رمز هم گرفته می‌شود. خروجی، یک توکن JWT است.' },
    { n: 2, t: 'تشخیص دامنه', d: 'سرور از روی کد نقش، مجوزها و محورهای مجاز را حساب می‌کند ' +
        '(role-axes). از این لحظه هر کوئری با همین دو قید اجرا می‌شود.' },
    { n: 3, t: 'کار روزمره', d: 'کاربر سنجه پر می‌کند، شاهد پیوست می‌کند، صورت‌جلسه ثبت می‌کند یا ' +
        'چک‌لیست اجرا می‌کند. هر ثبت، رکوردی با hospital_id و شناسه‌ی کاربر می‌سازد.' },
    { n: 4, t: 'گره‌خوردن به مسئول', d: 'هر مصوبه، وظیفه یا سند در انتظار امضا، روی کارتابل شخصیِ ' +
        'همان سمت می‌نشیند — نه در یک صف عمومی که کسی نگاهش نمی‌کند.' },
    { n: 5, t: 'پایش', d: 'دستیار وضعیت واقعی داده را می‌خواند و به هر سمت می‌گوید در دوره‌ی جاری ' +
        'چه چیزی مانده. داشبورد و BSC همان داده را جمع می‌بندند.' },
    { n: 6, t: 'ارائه به ارزیاب', d: 'درخت سنجه با شواهد پیوست‌شده، به‌علاوه‌ی گزارش‌ها و نمودارهای ' +
        'قابل چاپ، بسته‌ی ارزیابی را می‌سازد.' }
  ];

  var ACCESS = [
    { k: 'مستأجر (بیمارستان)', d: 'بیرونی‌ترین حلقه. هر رکورد hospital_id دارد و هیچ کوئری بدون آن اجرا نمی‌شود.' },
    { k: 'مجوز (permission)', d: 'فهرستی از رشته‌ها روی نقش، مثل manage_users یا view_all_dashboards. ' +
        'کنترل می‌کند «چه کاری» مجاز است.' },
    { k: 'محور (axis)', d: 'کنترل می‌کند «روی کدام بخشِ کتاب سنجه». ریاست و مدیر اعتباربخشی «*» دارند؛ ' +
        'کارشناس تغذیه فقط «ب-۱». این لایه چیزی است که سامانه را از یک فرم‌سازِ ساده جدا می‌کند.' },
    { k: 'سوپرادمین پلتفرم', d: 'بالادست همه‌ی بیمارستان‌هاست ولی عمداً به محتوای درون‌سازمانی دسترسی ' +
        'مستقیم ندارد؛ فقط فراداده‌ی مدیریتی، تنظیمات و بکاپ.' }
  ];

  var OPS = [
    { t: 'مهاجرت‌ها', d: 'هیچ ابزار مهاجرتِ جداگانه‌ای لازم نیست: هر فایل database/seed-*.js ' +
        'خودش idempotent است و روی هر بوت از src/app.js اجرا می‌شود. اجرای دوباره باید صفر تغییر بدهد.' },
    { t: 'بکاپ', d: 'بکاپ خودکار روزانه روی دیسک، به‌علاوه‌ی دانلود/بازگردانی دستی از تب «بیمارستان‌ها و بکاپ».' },
    { t: 'آپلود فایل', d: 'یک مسیر مشترک multer + sharp برای شواهد، پیوست سند، کتابخانه و گواهینامه. ' +
        'برای نوع جدید، مسیر تازه ساخته نشود.' },
    { t: 'لاگ و خطا', d: 'winston برای لاگ، به‌علاوه‌ی نگهبان‌های سطح پروسه تا یک خطای مدیریت‌نشده ' +
        'کل سرویس را نیندازد. لاگ خطاها در همین پنل دیده می‌شود.' },
    { t: 'محدودیت نرخ', d: 'فرم‌های عمومی (بدون ورود) express-rate-limit دارند تا درگاه باز، به ابزار ' +
        'اسپم تبدیل نشود.' },
    { t: 'تقویم', d: 'همه‌ی تاریخ‌ها جلالی‌اند و منطقه‌ی زمانی تهران (UTC+3:30) مبناست. ' +
        'دوره‌های ماهانه/فصلی/سالانه‌ی دستیار از همین تقویم حساب می‌شوند، نه از تقویم میلادی.' },
    { t: 'دستیار توسعه', d: 'تب «دستیار توسعه» در پنل سوپرادمین یک AI جداگانه (با کلید و فروشنده‌ی خودش) را به کد ' +
        'واقعی پروژه وصل می‌کند. مدل فقط می‌خواند؛ هر پیشنهاد تغییر در یک بلوک کد جدا نمایش داده می‌شود که ' +
        'سوپرادمین می‌بیند، لازم شد ویرایش می‌کند و با یک کلیک صریح روی یک شاخه‌ی کاری (هرگز مستقیم روی main) ' +
        'به گیت‌هاب کامیت می‌کند — چون فایل‌سیستم سرور موقت است.' }
  ];

  global.renderSuperSystemTab = function () {
    var box = document.getElementById('superTabContent');
    if (!box) return;
    box.innerHTML =
      '<div class="panel g"><div class="phd">' + I('tree', 'lg') +
        '<div><h3>نحوه‌ی عملکرد کل سامانه</h3>' +
        '<div class="sub">نقشه‌ی فنی: از کلیک کاربر تا رکورد دیتابیس. برای کسی که باید سامانه را اداره کند یا توسعه بدهد.</div></div>' +
        '<div style="margin-inline-start:auto"><button class="btn btn-o btn-sm" onclick="window.print()">' +
          I('print') + ' چاپ</button></div></div>' +
      '<div class="pbody" style="padding-top:0">' +

        '<div class="sd-sec"><h4>' + I('grid') + ' چهار لایه</h4>' +
        '<div class="sd-layers">' + LAYERS.map(function (l, i) {
          return '<div class="sd-layer"><span class="sd-layer-n">' + (i + 1) + '</span>' +
            '<div><b>' + e(l.t) + '</b><p>' + e(l.d) + '</p>' +
            '<code class="sd-files">' + e(l.f) + '</code></div></div>';
        }).join('') + '</div>' +
        '<p class="sd-lead">جهت وابستگی همیشه از بالا به پایین است: مرورگر فقط با API حرف می‌زند، ' +
        'API با دامنه، دامنه با داده. هیچ لایه‌ای دو پله پایین‌تر را مستقیم صدا نمی‌زند.</p></div>' +

        '<div class="sd-sec"><h4>' + I('trend') + ' چرخه‌ی یک کار، از ورود تا ارزیابی</h4>' +
        '<div class="sd-flow">' + FLOW.map(function (f) {
          return '<div class="sd-step"><span class="sd-step-n">' + f.n + '</span>' +
            '<div><b>' + e(f.t) + '</b><p>' + e(f.d) + '</p></div></div>';
        }).join('') + '</div></div>' +

        '<div class="sd-sec"><h4>' + I('lock') + ' مدل دسترسی — چهار حلقه‌ی تودرتو</h4>' +
        '<div class="sd-access">' + ACCESS.map(function (a) {
          return '<div class="sd-acc"><b>' + e(a.k) + '</b><p>' + e(a.d) + '</p></div>';
        }).join('') + '</div></div>' +

        '<div class="sd-sec"><h4>' + I('settings') + ' نکات نگه‌داری</h4>' +
        '<div class="sd-ops">' + OPS.map(function (o) {
          return '<div class="sd-op"><b>' + e(o.t) + '</b><p>' + e(o.d) + '</p></div>';
        }).join('') + '</div></div>' +

        '<div class="sd-note">' + I('book') +
        '<div>برای جزئیات هر ماژول به‌صورت جداگانه (فایل فرانت، فایل بک‌اند، مسیرهای API و ' +
        'نقش‌های مجاز) به تب <b>«مستندات ماژول‌ها و API»</b> بروید.</div></div>' +
      '</div></div>';
  };
})(window);

/* =====================================================================
   سطل بازیافت — تب سوپرادمین
   ---------------------------------------------------------------------
   هیچ حذفی در سامانه نابودکننده نیست: پیش از هر DELETE، ردیف اسنپ‌شات
   می‌شود. اینجا سوپرادمین می‌بیند چه چیزی، کِی و توسط چه کسی حذف شده و
   می‌تواند برگرداند. این همان محافظتی است که کاربر خواست: اگر کسی هنگام
   خروج از سازمان همه‌چیز را پاک کند، هیچ‌چیز از دست نمی‌رود.
   ===================================================================== */
(function (global) {
  'use strict';
  var e = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var I = function (n, c) { return (typeof ic === 'function') ? ic(n, c) : ''; };
  var F = function (n) { return (typeof fa === 'function') ? fa(n) : String(n); };

  var RB = { q: '', table: '', showRestored: false };

  global.renderSuperRecycleTab = function () {
    var box = document.getElementById('superTabContent');
    if (!box) return;
    box.innerHTML = '<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
    var qs = [];
    if (RB.q) qs.push('q=' + encodeURIComponent(RB.q));
    if (RB.table) qs.push('table=' + encodeURIComponent(RB.table));
    if (RB.showRestored) qs.push('include_restored=1');
    API.superRecycleBin(qs.join('&')).then(function (d) { drawBin(box, d); })
      .catch(function (err) { box.innerHTML = '<div class="panel g"><div class="empty">' + e(err.message) + '</div></div>'; });
  };

  function drawBin(box, d) {
    var items = d.items || [], counts = d.counts || [];
    var open = counts.reduce(function (s, c) { return s + c.n; }, 0);
    box.innerHTML =
      '<div class="panel g"><div class="phd">' + I('trash', 'lg') +
        '<div style="flex:1"><h3>سطل بازیافت</h3>' +
        '<div class="sub">' + F(open) + ' رکورد حذف‌شده و بازنگردانده — هیچ حذفی در سامانه نابودکننده نیست.</div></div>' +
        '<button class="btn btn-o btn-sm" onclick="renderSuperRecycleTab()">' + I('refresh') + ' تازه‌سازی</button>' +
      '</div><div class="pbody" style="padding-top:0">' +

      '<div class="rb-filters">' +
        '<input id="rbQ" placeholder="جستجو در عنوان یا نوع رکورد…" value="' + e(RB.q) + '">' +
        '<select id="rbT"><option value="">همه‌ی انواع</option>' +
          counts.map(function (c) {
            return '<option value="' + e(c.table_name) + '"' + (RB.table === c.table_name ? ' selected' : '') + '>' +
              e(c.table_fa) + ' (' + F(c.n) + ')</option>';
          }).join('') + '</select>' +
        '<label class="rb-chk"><input type="checkbox" id="rbR"' + (RB.showRestored ? ' checked' : '') +
          '> بازگردانده‌شده‌ها هم نشان داده شوند</label>' +
        '<button class="btn btn-g btn-sm" id="rbGo">' + I('search') + ' اعمال</button>' +
      '</div>' +

      (items.length ?
        '<div class="tbl-wrap"><table><thead><tr>' +
          '<th>نوع رکورد</th><th>عنوان</th><th style="width:150px">حذف‌کننده</th>' +
          '<th style="width:130px">تاریخ حذف</th><th style="width:120px">وضعیت</th>' +
        '</tr></thead><tbody>' +
        items.map(function (it) {
          return '<tr>' +
            '<td><span class="bdg b1">' + e(it.table_fa) + '</span></td>' +
            '<td>' + e(it.label || '—') +
              (it.hospital_name ? '<span class="tsub">' + e(it.hospital_name) + '</span>' : '') + '</td>' +
            '<td>' + e(it.deleted_by_name || '—') + '</td>' +
            '<td>' + (typeof faDateISO === 'function' ? faDateISO(it.deleted_at) : e(it.deleted_at)) + '</td>' +
            '<td>' + (it.restored_at
              ? '<span class="bdg b1">' + I('check') + ' بازگردانده شد</span>'
              : '<button class="btn btn-g btn-sm" onclick="rbRestore(\'' + e(it.id) + '\')">' +
                I('refresh') + ' بازگردانی</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty">سطل خالی است — چیزی حذف نشده.</div>') +

      '<div class="sd-note" style="margin-top:16px">' + I('lock') +
      '<div>بازگردانی رکورد فرزند (مثل سؤال چک‌لیست یا ردیف امضا) وقتی ممکن است که ' +
      '<b>والدش هم موجود باشد</b>. اگر والد هم حذف شده، اول والد را برگردانید.</div></div>' +
      '</div></div>';

    var go = document.getElementById('rbGo');
    if (go) go.onclick = function () {
      RB.q = (document.getElementById('rbQ') || {}).value || '';
      RB.table = (document.getElementById('rbT') || {}).value || '';
      RB.showRestored = !!(document.getElementById('rbR') || {}).checked;
      global.renderSuperRecycleTab();
    };
    var qi = document.getElementById('rbQ');
    if (qi) qi.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go.click(); });
  }

  global.rbRestore = async function (id) {
    if (!await BTN.confirmDanger('این رکورد به جدول خودش برگردانده شود؟')) return;
    API.superRestore(id).then(function () {
      if (typeof toast === 'function') toast('رکورد بازگردانده شد');
      global.renderSuperRecycleTab();
    }).catch(function (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); });
  };
})(window);

/* =====================================================================
   چارت سلسله‌مراتب سمت‌ها — با کشیدنِ کارت
   ---------------------------------------------------------------------
   کارت‌ها با Pointer Events جابه‌جا می‌شوند، نه HTML5 drag-and-drop.
   دلیلش صریح است: drag-and-drop بومیِ HTML5 روی مرورگرهای موبایل
   (که نیمی از کاربران این سامانه‌اند) اصلاً رویداد نمی‌دهد. Pointer
   Events هم موس و هم لمس را با یک کد پوشش می‌دهد.

   کنار کشیدن، دو دکمه‌ی «بالا/پایین» و دو دکمه‌ی تورفتگی هم هست: هم برای
   کیبورد و صفحه‌خوان، هم برای وقتی روی موبایل کشیدن دقیق سخت است.

   ذخیره صریح است (دکمه‌ی ذخیره)، نه خودکار پس از هر جابه‌جایی: چارت را
   معمولاً چند حرکت پشت‌سرهم می‌چینند و هر حرکت یک درخواست، هم پرنویز است
   هم نیمه‌ذخیره‌های بی‌معنی می‌سازد.
   ===================================================================== */
(function (global) {
  'use strict';
  var e = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var I = function (n, c) { return (typeof ic === 'function') ? ic(n, c) : ''; };
  var F = function (n) { return (typeof fa === 'function') ? fa(n) : String(n); };

  var RH = { rows: [], dirty: false };

  global.renderSuperChartTab = function () {
    var box = document.getElementById('superTabContent');
    if (!box) return;
    box.innerHTML = '<div class="panel g"><div class="empty">در حال بارگذاری…</div></div>';
    API.superRoleHierarchy().then(function (d) {
      RH.rows = (d.roles || []).map(function (r) {
        return { id: r.id, code: r.code, title: r.title_fa, level: r.hierarchy_level || 0, users: r.user_count || 0 };
      });
      RH.dirty = false;
      drawChart();
    }).catch(function (err) {
      box.innerHTML = '<div class="panel g"><div class="empty">' + e(err.message) + '</div></div>';
    });
  };

  /* ضریب وزنی سطح سنجه — کنار چارت می‌نشیند چون هر دو «تنظیمات سراسریِ
     محاسبه/نمایش» هستند و تب جدا برای دو کنترل، منو را بی‌جهت شلوغ می‌کند. */
  function weightsHtml(w) {
    var row = function (lv, label) {
      return '<label class="lw-f"><span>سطح ' + F(lv) + '<em>' + label + '</em></span>' +
        '<input type="number" id="lw' + lv + '" step="0.1" min="0.1" max="5" value="' + (w[lv] || 1) + '"></label>';
    };
    return '<div class="panel g" style="margin-top:16px"><div class="phd">' + I('chart', 'lg') +
      '<div style="flex:1"><h3>ضریب وزنی سطح سنجه</h3>' +
      '<div class="sub">در محاسبه‌ی درصد آمادگی ضرب می‌شود. ضریب ایمنی بیمار (۲ برابر) مستقل از این است و روی آن اعمال می‌شود.</div></div>' +
      '</div><div class="pbody" style="padding-top:0">' +
      '<div class="sd-note">' + I('info') +
      '<div>پیش‌فرض هر سه سطح <b>۱</b> است، یعنی دقیقاً رفتار فعلی سامانه. ' +
      'ضرایب رسمی هر دوره را وزارت اعلام می‌کند؛ تا وقتی اعلام نشده، دست نزدن به این عددها ' +
      'محافظه‌کارانه‌ترین انتخاب است — چون تغییرشان درصد آمادگیِ همه‌ی بیمارستان‌ها را جابه‌جا می‌کند.</div></div>' +
      '<div class="lw-grid">' +
        row(1, 'انتظار پایه') + row(2, 'تحقق متوسط') + row(3, 'فراتر از انتظار') +
      '</div>' +
      '<div class="rh-actions"><button class="btn btn-g" id="lwSave">' + I('check') + ' ذخیره ضرایب</button>' +
      '<button class="btn btn-o" id="lwReset">بازگشت به ۱/۱/۱</button>' +
      '<span class="rh-hint" id="lwHint"></span></div>' +
      '</div></div>';
  }

  function bindWeights() {
    var save = function (vals) {
      API.superSaveScoring(vals).then(function (d) {
        var h = document.getElementById('lwHint');
        if (h) h.textContent = 'ذخیره شد: ' + [1, 2, 3].map(function (k) { return F(d.level_weights[k]); }).join(' / ');
        [1, 2, 3].forEach(function (k) {
          var el = document.getElementById('lw' + k); if (el) el.value = d.level_weights[k];
        });
        if (typeof toast === 'function') toast('ضریب سطح سنجه ذخیره شد');
      }).catch(function (err) {
        if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message);
      });
    };
    var b = document.getElementById('lwSave');
    if (b) b.onclick = function () {
      save({ 1: +document.getElementById('lw1').value, 2: +document.getElementById('lw2').value, 3: +document.getElementById('lw3').value });
    };
    var r = document.getElementById('lwReset');
    if (r) r.onclick = function () { save({ 1: 1, 2: 1, 3: 1 }); };
  }

  function drawChart() {
    var box = document.getElementById('superTabContent');
    if (!box) return;
    box.innerHTML =
      '<div class="panel g"><div class="phd">' + I('users', 'lg') +
        '<div style="flex:1"><h3>چارت سلسله‌مراتب سمت‌ها</h3>' +
        '<div class="sub">ترتیب همین فهرست، ترتیب کارت‌های صفحه‌ی ورود هر بیمارستان است.</div></div>' +
        '<button class="btn btn-o btn-sm" onclick="renderSuperChartTab()">' + I('refresh') + ' بازنشانی</button>' +
      '</div><div class="pbody" style="padding-top:0">' +
      '<div class="sd-note">' + I('info') +
        '<div>کارت را با نگه‌داشتن و کشیدن (روی موبایل هم کار می‌کند) بالا و پایین ببرید، یا از دکمه‌های ▲▼ استفاده کنید. ' +
        'دکمه‌های ⇥ و ⇤ سمت را یک پله زیرمجموعه‌تر یا بالاتر می‌کنند.</div></div>' +
      '<div class="rh-list" id="rhList">' + RH.rows.map(rowHtml).join('') + '</div>' +
      '<div class="rh-actions">' +
        '<button class="btn btn-g" id="rhSave"' + (RH.dirty ? '' : ' disabled') + '>' + I('check') + ' ذخیره چارت</button>' +
        '<span class="rh-hint" id="rhHint">' + (RH.dirty ? 'تغییرات ذخیره نشده' : 'چارت با نسخه‌ی ذخیره‌شده یکی است') + '</span>' +
      '</div></div></div>';
    var s = document.getElementById('rhSave');
    if (s) s.onclick = saveChart;
    bindDrag();
    // ضرایب بعد از چارت رندر می‌شوند تا اگر درخواستشان کند بود، چارت معطل نماند
    API.superScoring().then(function (d) {
      box.insertAdjacentHTML('beforeend', weightsHtml(d.level_weights || { 1: 1, 2: 1, 3: 1 }));
      bindWeights();
    }).catch(function () { /* بدون ضرایب هم چارت کارش را می‌کند */ });
  }

  function rowHtml(r, i) {
    return '<div class="rh-card" data-i="' + i + '" style="--lvl:' + r.level + '">' +
      '<span class="rh-grip" title="برای جابه‌جایی بکشید">⠿</span>' +
      '<span class="rh-rank">' + F(i + 1) + '</span>' +
      '<span class="rh-title"><b>' + e(r.title) + '</b>' +
        '<span class="rh-sub">' + e(r.code) + ' — ' + F(r.users) + ' کاربر فعال</span></span>' +
      '<span class="rh-btns">' +
        '<button class="rh-b" onclick="rhMove(' + i + ',-1)" title="یک پله بالا" aria-label="یک پله بالا">▲</button>' +
        '<button class="rh-b" onclick="rhMove(' + i + ',1)" title="یک پله پایین" aria-label="یک پله پایین">▼</button>' +
        '<button class="rh-b" onclick="rhIndent(' + i + ',1)" title="زیرمجموعه‌تر" aria-label="زیرمجموعه‌تر">⇥</button>' +
        '<button class="rh-b" onclick="rhIndent(' + i + ',-1)" title="یک سطح بالاتر" aria-label="یک سطح بالاتر">⇤</button>' +
      '</span></div>';
  }

  global.rhMove = function (i, d) {
    var j = i + d;
    if (j < 0 || j >= RH.rows.length) return;
    var t = RH.rows[i]; RH.rows[i] = RH.rows[j]; RH.rows[j] = t;
    RH.dirty = true; drawChart();
  };
  global.rhIndent = function (i, d) {
    var r = RH.rows[i]; if (!r) return;
    var v = Math.max(0, Math.min(4, (r.level || 0) + d));
    if (v === r.level) return;
    r.level = v; RH.dirty = true; drawChart();
  };

  /* کشیدن با Pointer Events — یک کد برای موس و لمس */
  function bindDrag() {
    var list = document.getElementById('rhList');
    if (!list) return;
    var drag = null;

    list.addEventListener('pointerdown', function (ev) {
      var grip = ev.target.closest ? ev.target.closest('.rh-grip') : null;
      var card = ev.target.closest ? ev.target.closest('.rh-card') : null;
      if (!card || (!grip && ev.pointerType === 'mouse')) return;
      if (ev.target.closest('.rh-b')) return;
      drag = { card: card, from: +card.dataset.i, y: ev.clientY, moved: false };
      card.setPointerCapture(ev.pointerId);
      card.classList.add('dragging');
    });

    list.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var dy = ev.clientY - drag.y;
      if (!drag.moved && Math.abs(dy) < 4) return;
      drag.moved = true;
      ev.preventDefault();
      drag.card.style.transform = 'translateY(' + dy + 'px)';
      // کارتی که مرکزش زیر انگشت است، هدفِ رها کردن می‌شود
      var cards = list.querySelectorAll('.rh-card');
      var over = -1;
      for (var k = 0; k < cards.length; k++) {
        if (cards[k] === drag.card) continue;
        var b = cards[k].getBoundingClientRect();
        cards[k].classList.remove('drop-before', 'drop-after');
        if (ev.clientY >= b.top && ev.clientY <= b.bottom) {
          over = +cards[k].dataset.i;
          cards[k].classList.add(ev.clientY < b.top + b.height / 2 ? 'drop-before' : 'drop-after');
        }
      }
      drag.over = over;
      drag.after = false;
      if (over >= 0) {
        var t = list.querySelector('.rh-card[data-i="' + over + '"]');
        drag.after = t && t.classList.contains('drop-after');
      }
    });

    var end = function (ev) {
      if (!drag) return;
      var d = drag; drag = null;
      d.card.classList.remove('dragging');
      d.card.style.transform = '';
      list.querySelectorAll('.drop-before,.drop-after').forEach(function (c) {
        c.classList.remove('drop-before', 'drop-after');
      });
      if (!d.moved || d.over == null || d.over < 0 || d.over === d.from) return;
      var item = RH.rows.splice(d.from, 1)[0];
      var to = d.over + (d.after ? 1 : 0);
      if (d.from < to) to--;
      RH.rows.splice(Math.max(0, Math.min(RH.rows.length, to)), 0, item);
      RH.dirty = true;
      drawChart();
    };
    list.addEventListener('pointerup', end);
    list.addEventListener('pointercancel', end);
  }

  function saveChart() {
    var b = document.getElementById('rhSave');
    if (b) b.disabled = true;
    API.superSaveRoleHierarchy(RH.rows.map(function (r) { return { id: r.id, level: r.level }; }))
      .then(function () {
        RH.dirty = false;
        if (typeof toast === 'function') toast('چارت ذخیره شد — صفحه‌ی ورود از همین ترتیب استفاده می‌کند');
        drawChart();
      })
      .catch(function (err) {
        if (b) b.disabled = false;
        if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message);
      });
  }
})(window);
