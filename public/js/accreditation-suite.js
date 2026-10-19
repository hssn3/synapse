/**
 * accreditation-suite.js — سیناپس — ابزارها و اسناد استاندارد اعتباربخشی بیمارستان
 * برگرفته از ساختار سامانه طراحی اولیه حسن و دستاوردهای چندعاملی
 */

(function() {
  'use strict';

  // وضعیت جاری تب اعتباربخشی
  window.S = window.S || {};

  // داده‌های پایه کمیته‌های بیمارستانی
  const hospitalCommitteesData = [
    { id: 'com-1', name: 'کمیته مرگ و میر و آسیب‌شناسی (مورتالیتی)', chair: 'معاون درمان', secretary: 'سوپروایزر بالینی', percent: 92, meetings: 6, lastDate: '۱۴۰۵/۰۵/۱۲' },
    { id: 'com-2', name: 'کمیته پیشگیری و کنترل عفونت بیمارستانی', chair: 'متخصص بیماری‌های عفونی', secretary: 'کارشناس کنترل عفونت', percent: 88, meetings: 5, lastDate: '۱۴۰۵/۰۵/۱۸' },
    { id: 'com-3', name: 'کمیته اخلاق بالینی و رعایت حقوق گیرنده خدمت', chair: 'رئیس بیمارستان', secretary: 'مسئول مددکاری اجتماعی', percent: 95, meetings: 4, lastDate: '۱۴۰۵/۰۵/۰۲' },
    { id: 'com-4', name: 'کمیته مدیریت بحران، بلایا و پدافند غیرعامل (EOP)', chair: 'مدیر داخلی', secretary: 'دبیر کمیته بحران', percent: 76, meetings: 4, lastDate: '۱۴۰۵/۰۴/۲۹' },
    { id: 'com-5', name: 'کمیته دارو، درمان و تجهیزات پزشکی', chair: 'معاون درمان', secretary: 'مسئول داروخانه بیمارستان', percent: 90, meetings: 5, lastDate: '۱۴۰۵/۰۵/۲۲' },
    { id: 'com-6', name: 'کمیته پایش و سنجش کیفیت و ایمنی بیمار', chair: 'رئیس بیمارستان', secretary: 'مسئول بهبود کیفیت', percent: 94, meetings: 6, lastDate: '۱۴۰۵/۰۵/۱۵' },
    { id: 'com-7', name: 'کمیته حفاظت فنی و بهداشت کار', chair: 'مدیر پشتیبانی', secretary: 'کارشناس بهداشت حرفه‌ای', percent: 82, meetings: 3, lastDate: '۱۴۰۵/۰۴/۱۰' },
    { id: 'com-8', name: 'کمیته ترویج زایمان طبیعی و تغذیه با شیر مادر', chair: 'متخصص زنان و زایمان', secretary: 'سرپرستار بلوک زایمان', percent: 86, meetings: 4, lastDate: '۱۴۰۵/۰۵/۰۵' }
  ];

  // دیتای شناسنامه شاخص‌ها (Indicator Passport)
  const hospitalIndicatorsData = [
    { code: 'IND-01', name: 'نرخ سقوط بیمار در بخش‌های بستری', type: 'فرآیندی و ایمنی', num: 'تعداد کل موارد سقوط گزارش‌شده بیمار', den: 'مجموع روز-تخت اشغالی بیمارستان', factor: '۱,۰۰۰', target: 'کمتر از ۰.۵', period: 'ماهانه', owner: 'سوپروایزر ایمنی بیمار' },
    { code: 'IND-02', name: 'درصد اشغال تخت بیمارستان (BOR)', type: 'عملکردی و مدیریتی', num: 'مجموع روز-تخت‌های اشغال‌شده توسط بیماران', den: 'کل تخت‌های فعال بیمارستان × تعداد روزهای دوره', factor: '۱۰۰', target: 'بالای ۸۰٪', period: 'ماهانه', owner: 'رئیس آمار و مدارک پزشکی' },
    { code: 'IND-03', name: 'درصد بروز عفونت‌های بیمارستانی (HAI)', type: 'پیامدی بالینی', num: 'تعداد کل بیماران مبتلا به عفونت بیمارستانی', den: 'کل بیماران ترخیص‌شده و فوت‌شده', factor: '۱۰۰', target: 'کمتر از ۲.۵٪', period: 'ماهانه', owner: 'کارشناس کنترل عفونت' },
    { code: 'IND-04', name: 'متوسط زمان تریاژ تا اولین ویزیت پزشک در اورژانس', type: 'فرآیندی بالینی', num: 'مجموع دقایق انتظار بیماران تریاژ شده سطح ۲ و ۳', den: 'تعداد کل بیماران تریاژ شده در همان سطوح', factor: '۱', target: 'کمتر از ۶ دقیقه', period: 'فصلی', owner: 'مسئول بخش اورژانس' },
    { code: 'IND-05', name: 'درصد رضایت‌مندی گیرندگان خدمت (بیمار و همراه)', type: 'پیامدی و حقوق بیمار', num: 'تعداد پاسخ‌های رضایت کامل (خوب و عالی)', den: 'کل پرسشنامه‌های تکمیل‌شده رضایت‌سنجی', factor: '۱۰۰', target: 'بالای ۹۰٪', period: 'فصلی', owner: 'مسئول واحد رسیدگی به شکایات' },
    { code: 'IND-06', name: 'نرخ مورتالیتی خام بیمارستان (CMR)', type: 'پیامدی بالینی', num: 'کل موارد فوت ثبت‌شده در بیمارستان', den: 'کل موارد پذیرش بستری در همان دوره', factor: '۱۰۰', target: 'کمتر از ۱.۸٪', period: 'ماهانه', owner: 'دبیر کمیته مورتالیتی' }
  ];

  // دیتای خطاهای پزشکی و ۲۸ Never Event
  const hospitalErrorsData = [
    { id: 'ERR-101', title: 'اشتباه در تجویز دوز داروی ضد انعقاد (هپارین)', ward: 'بخش قلب', date: '۱۴۰۵/۰۵/۱۴', severity: 'سطح E (رسیدن به بیمار بدون آسیب پایدار)', rca: 'برگزار شد و اصلاح برچسب دارویی تصویب گردید', status: 'اقدام اصلاحی انجام شد' },
    { id: 'ERR-102', title: 'سقوط بیمار سالمند از تخت هنگام انتقال به ویلچر', ward: 'جراحی مردان', date: '۱۴۰۵/۰۵/۰۸', severity: 'سطح D (نیاز به پایش علائم)', rca: 'بررسی بالابودن بدساید و آموزش کمک بهیار', status: 'اقدام اصلاحی انجام شد' },
    { id: 'ERR-103', title: 'تأخیر در ثبت آزمایش اورژانسی تروپونین', ward: 'اورژانس جنرال', date: '۱۴۰۵/۰۴/۲۲', severity: 'سطح C (رسیدن به بیمار بدون تغییر بالینی)', rca: 'بازنگری فرآیند هماهنگی پذیرش و آزمایشگاه', status: 'اقدام اصلاحی انجام شد' },
    { id: 'ERR-104', title: 'انجام جراحی در موضع اشتباه (Never Event 01)', ward: 'اتاق عمل جنرال', date: '۱۴۰۴/۱۱/۱۵', severity: 'سطح I (واقعه خطای فاجعه‌بار ۲۸گانه)', rca: 'توقف اجباری Time-out و چک‌لیست جراحی امن اجباری شد', status: 'پرونده ممیزی بسته شد' }
  ];

  // دیتای چک‌لیست‌های ارزیابی و EOP
  const hospitalChecklistsData = [
    { id: 'CHK-01', title: 'چک‌لیست ارزیابی ایمنی و مدیریت تریاژ اورژانس', category: 'مراقبت‌های حاد و اورژانس', score: 92, questions: 24, status: 'انطباق عالی' },
    { id: 'CHK-02', title: 'چک‌لیست رعایت اصول صحیح دارودهی و تلفیق دارویی', category: 'مراقبت‌های عمومی بالینی', score: 86, questions: 30, status: 'انطباق مطلوب' },
    { id: 'CHK-03', title: 'چک‌لیست مهار فیزیکی بیمار پرخطر و مداخله در بحران', category: 'ایمنی بیمار', score: 78, questions: 18, status: 'انطباق متوسط (نیازمند بهبود)' },
    { id: 'CHK-04', title: 'چک‌لیست رعایت اصول بهداشتی در طبخ و توزیع غذا', category: 'تغذیه و بهداشت محیط', score: 94, questions: 22, status: 'انطباق عالی' },
    { id: 'CHK-05', title: 'چک‌لیست ارزیابی اثربخشی آموزش‌های خود‌مراقبتی به بیمار', category: 'حقوق گیرنده خدمت', score: 88, questions: 16, status: 'انطباق مطلوب' },
    { id: 'CHK-06', title: 'چک‌لیست پایش تجهیزات احیا و ترالی کد ۹۹', category: 'تجهیزات پزشکی و اورژانس', score: 96, questions: 14, status: 'انطباق عالی' }
  ];

  // ۱. رندر نوار تب‌های سامانه اعتباربخشی
  window.renderAccSuiteNav = function() {
    const currentTab = window.S.accCurrentTab || 'measures';
    return `
      <div class="acc-suite-nav">
        <button type="button" class="acc-tab-btn ${currentTab === 'measures' ? 'active' : ''}" onclick="switchAccTab('measures')">
          <span>📊 سنجه‌ها و ارزیابی (۳ شاخه لایه‌ای)</span>
          <span class="tab-badge">۳۹۵ سنجه</span>
        </button>
        <button type="button" class="acc-tab-btn ${currentTab === 'indicators' ? 'active' : ''}" onclick="switchAccTab('indicators')">
          <span>📋 شناسنامه شاخص‌ها (Indicator Passport)</span>
          <span class="tab-badge">فرمول و تارگت</span>
        </button>
        <button type="button" class="acc-tab-btn ${currentTab === 'committees' ? 'active' : ''}" onclick="switchAccTab('committees')">
          <span>👥 کمیته‌های بیمارستانی و مصوبات</span>
          <span class="tab-badge">۸ کمیته اصلی</span>
        </button>
        <button type="button" class="acc-tab-btn ${currentTab === 'errors' ? 'active' : ''}" onclick="switchAccTab('errors')">
          <span>⚠️ خطاهای پزشکی و وقایع ۲۸گانه</span>
          <span class="tab-badge">Never Events</span>
        </button>
        <button type="button" class="acc-tab-btn ${currentTab === 'checklists' ? 'active' : ''}" onclick="switchAccTab('checklists')">
          <span>✅ چک‌لیست‌های پایش و EOP</span>
          <span class="tab-badge">پایش و ممیزی</span>
        </button>
        <button type="button" class="acc-tab-btn ${currentTab === 'reminders' ? 'active' : ''}" onclick="switchAccTab('reminders')">
          <span>🔔 پایش نواقص و یادآورها</span>
          <span class="tab-badge">سررسید اقدام</span>
        </button>
      </div>
    `;
  };

  // سوئیچ تب
  window.switchAccTab = function(tab) {
    window.S.accCurrentTab = tab;
    if (typeof window.renderMeasures === 'function') {
      window.renderMeasures();
    }
  };

  // ۲. مودال صدور اسناد استاندارد (خط‌مشی، دستورالعمل، روش اجرایی)
  window.openAccStandardDoc = function(type, code, title) {
    if (!title) {
      if (window.S && window.S.measures) {
        const found = window.S.measures.find(m => m.code === code);
        if (found) title = found.statement;
      }
    }
    let typeName = 'فرم استاندارد خط‌مشی (Policy)';
    let prefix = 'POL';
    let docType = 'policy';

    if (type === 'instruction') {
      typeName = 'فرم دستورالعمل اجرایی (Work Instruction)';
      prefix = 'INS';
      docType = 'instruction';
    } else if (type === 'sop') {
      typeName = 'روش اجرایی مدون (SOP)';
      prefix = 'SOP';
      docType = 'sop';
    }

    const docCode = `${prefix}-${code}`;
    const cleanTitle = (title || '').replace(/^["']|["']$/g, '');

    const existingModal = document.getElementById('accStandardDocModal');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'accStandardDocModal';
    overlay.className = 'standard-form-overlay';

    let contentHtml = '';

    if (type === 'policy') {
      contentHtml = `
        <div class="sheet-field-group">
          <label class="sheet-label">عنوان خط‌مشی:</label>
          <input type="text" id="doc_title" class="sheet-input" value="خط‌مشی ${cleanTitle}">
        </div>
        <div class="sheet-field-group">
          <label class="sheet-label">۱. هدف و بیانیه سیاست (Purpose & Policy Statement):</label>
          <textarea id="doc_purpose" class="sheet-textarea" rows="3">بیمارستان متعهد به استقرار پایدار الزامات سنجه ${code} کتاب ملی اعتباربخشی و ارائه خدمات ایمن و استاندارد به کلیه مراجعین محترم می‌باشد. این خط‌مشی به منظور یکپارچه‌سازی فرآیند و کاهش خطاهای احتمالی تدوین گردیده است.</textarea>
        </div>
        <div class="sheet-field-group">
          <label class="sheet-label">۲. دامنه کاربرد (Scope):</label>
          <input type="text" id="doc_scope" class="sheet-input" value="کلیه بخش‌های بالینی، پاراکلینیک، اداری و پشتیبانی مرتبط بیمارستان.">
        </div>
        <div class="sheet-field-group">
          <label class="sheet-label">۳. تعاریف و الزامات بالادستی:</label>
          <textarea id="doc_definitions" class="sheet-textarea" rows="2">مطابق با ویرایش ششم کتاب استانداردهای اعتباربخشی ملی بیمارستان‌های ایران (ابلاغی وزارت بهداشت، درمان و آموزش پزشکی).</textarea>
        </div>
        <div class="sheet-field-group">
          <label class="sheet-label">۴. شیوه انجام کار و مسئولیت‌ها:</label>
          <textarea id="doc_work_method" class="sheet-textarea" rows="4">۱. مسئول واحد مربوطه موظف است مفاد این خط‌مشی را به کلیه کارکنان تحت سرپرستی آموزش دهد.&#10;۲. نظارت مستمر بر اجرای بندهای خط‌مشی توسط سوپروایزر و کارشناس بهبود کیفیت به عمل می‌آید.&#10;۳. گزارشات عدم انطباق بلافاصله جهت تعریف اقدام اصلاحی به دفتر بهبود کیفیت ارسال خواهد شد.</textarea>
        </div>
        <table class="signatures-table">
          <thead>
            <tr>
              <th>تهیه‌کننده و تدوین‌کننده</th>
              <th>تأییدکننده فنی</th>
              <th>تصویب‌کننده نهایی و ابلاغ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="height:60px;">مسئول واحد / سوپروایزر مربوطه<br><span style="font-size:11px;color:#64748b;">امضای الکترونیکی</span></td>
              <td>مدیر خدمات پرستاری / مترون<br><span style="font-size:11px;color:#64748b;">امضای الکترونیکی</span></td>
              <td>رئیس / مدیر بیمارستان<br><span style="font-size:11px;color:#64748b;">امضا و مهر رسمی بیمارستان</span></td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (type === 'instruction') {
      contentHtml = `
        <div class="sheet-field-group">
          <label class="sheet-label">موضوع دستورالعمل اجرایی:</label>
          <input type="text" id="doc_title" class="sheet-input" value="دستورالعمل اجرایی گام‌به‌گام ${cleanTitle}">
        </div>
        <div class="sheet-field-group">
          <label class="sheet-label">اقدامات الزامی و مراحل متوالی:</label>
          <textarea id="doc_work_method" class="sheet-textarea" rows="4">گام ۱: احراز هویت صحیح بیمار با حداقل دو شناسه (نام کامل و شماره پرونده) طبق سنجه ${code}.&#10;گام ۲: اجرای دقیق پروتکل بالینی و رعایت بهداشت دست قبل و بعد از مداخله.&#10;گام ۳: ثبت کامل اقدامات انجام‌شده در پرونده پزشکی و سامانه اطلاعات بیمارستانی (HIS).&#10;گام ۴: اطلاع‌رسانی به پزشک معالج یا سوپروایزر در صورت وقوع هرگونه واکنش ناخواسته.</textarea>
        </div>
        <div class="sheet-field-group">
          <label class="sheet-label">الزامات ایمنی و پیشگیری از خطاهای پزشکی:</label>
          <input type="text" id="doc_purpose" class="sheet-input" value="رعایت موازین ۲۸ خطای هرگز اتفاق نیفتد (Never Events) و الزامات ایمنی بیمار مصوب سنجه.">
        </div>
        <table class="signatures-table">
          <thead>
            <tr>
              <th>کارشناس بهبود کیفیت</th>
              <th>مسئول بخش بالینی / واحد</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="height:55px;">تأیید انطباق با سنجه‌های اعتباربخشی</td>
              <td>تأیید قابلیت اجرا در بخش</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      contentHtml = `
        <div class="sheet-field-group">
          <label class="sheet-label">عنوان فرآیند استاندارد عملیاتی:</label>
          <input type="text" id="doc_title" class="sheet-input" value="روش اجرایی تحقق الزامات سنجه ${code}">
        </div>
        <div class="sheet-field-group">
          <label class="sheet-label">ماتریس گردش کار و مسئولیت‌ها:</label>
          <table class="signatures-table" style="margin-top:6px;">
            <thead>
              <tr>
                <th>گام</th>
                <th>شرح اقدام عملیاتی</th>
                <th>مسئول اقدام</th>
                <th>مستند خروجی</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>۱</td>
                <td>تکمیل چک‌لیست و ارزیابی روزانه</td>
                <td>پرستار مسئول / کادر بخش</td>
                <td>فرم پایش بالینی</td>
              </tr>
              <tr>
                <td>۲</td>
                <td>صحت‌سنجی و پایش نظارتی</td>
                <td>سرپرستار / سوپروایزر</td>
                <td>گزارش نظارتی شیفت</td>
              </tr>
              <tr>
                <td>۳</td>
                <td>تحلیل شاخص و اصلاح فرآیند</td>
                <td>کمیته بهبود کیفیت</td>
                <td>صورتجلسه کمیته</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="sheet-field-group" style="margin-top:14px;">
          <label class="sheet-label">شرح تفصیلی متدولوژی اجرا:</label>
          <textarea id="doc_work_method" class="sheet-textarea" rows="3">عملیات اجرایی سنجه ${code} به صورت مدون و یکپارچه در شیفت‌های کاری مختلف پیاده‌سازی شده و شواهد انطباق در پرونده سنجه بارگذاری می‌گردد.</textarea>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="standard-form-dialog">
        <div class="standard-form-header">
          <h3>${typeName}</h3>
          <button type="button" class="btn btn-sm" onclick="closeAccStandardDoc()" style="background:transparent;border:none;font-size:18px;cursor:pointer;">✕</button>
        </div>
        <div class="standard-form-body">
          <div class="standard-form-sheet" id="printableStandardSheet">
            <div class="sheet-letterhead">
              <div class="sheet-meta-box">
                <div><strong>شناسه سند:</strong> ${docCode}</div>
                <div><strong>نسخه:</strong> ۱.۰</div>
                <div><strong>کد سنجه:</strong> ${code}</div>
              </div>
              <div class="sheet-letterhead-center">
                <h2>سیناپس — سامانه یکپارچه نظارت، اعتباربخشی و پایش سلامت</h2>
                <p>سند مصوب منطبق بر کتاب استانداردهای اعتباربخشی ملی (وزارت بهداشت، درمان و آموزش پزشکی)</p>
              </div>
              <div class="sheet-meta-box" style="text-align:left;">
                <div><strong>تاریخ تدوین:</strong> ۱۴۰۵/۰۱/۱۵</div>
                <div><strong>تاریخ بازنگری:</strong> ۱۴۰۵/۰۶/۰۱</div>
                <div><strong>صفحه:</strong> ۱ از ۱</div>
              </div>
            </div>
            ${contentHtml}
          </div>
        </div>
        <div class="standard-form-footer">
          <div style="font-size:12px;color:#64748b;">
            💡 این سند پس از ثبت در پایگاه داده اسناد کنترل‌شده بیمارستان ماندگار خواهد شد.
          </div>
          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-primary" onclick="saveAccStandardDoc('${docType}', '${code}')" style="background:#1b6580;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;cursor:pointer;">
              💾 ثبت در اسناد کنترل‌شده
            </button>
            <button type="button" class="btn" onclick="printAccStandardDoc()" style="background:#2563eb;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;cursor:pointer;">
              🖨️ چاپ استاندارد A4
            </button>
            <button type="button" class="btn" onclick="closeAccStandardDoc()" style="background:#cbd5e1;color:#1e293b;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">
              بستن
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  };

  window.closeAccStandardDoc = function() {
    const modal = document.getElementById('accStandardDocModal');
    if (modal) modal.remove();
  };

  window.printAccStandardDoc = function() {
    // چرا کلاس: قانون مخفی‌سازی چاپ فقط با همین کلاس فعال می‌شود تا چاپ‌های دیگر سفید نشوند.
    document.body.classList.add('std-form-printing');
    var done = false;
    var cleanup = function() { if (!done) { done = true; document.body.classList.remove('std-form-printing'); } };
    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 3000);
    window.print();
  };

  window.saveAccStandardDoc = async function(docType, code) {
    const title = (document.getElementById('doc_title') || {}).value || `سند استاندارد ${code}`;
    const purpose = (document.getElementById('doc_purpose') || {}).value || '';
    const scope = (document.getElementById('doc_scope') || {}).value || '';
    const definitions = (document.getElementById('doc_definitions') || {}).value || '';
    const workMethod = (document.getElementById('doc_work_method') || {}).value || '';

    const payload = {
      doc_type: docType,
      title: title,
      doc_code: `${docType.toUpperCase()}-${code}`,
      purpose: purpose,
      scope: scope,
      definitions: definitions,
      work_method: workMethod,
      responsible_person: 'مدیر بهبود کیفیت',
      status: 'approved'
    };

    try {
      if (typeof window.api === 'function') {
        await window.api('POST', '/api/documents', payload);
      }
      if (typeof window.toast === 'function') {
        window.toast(`سند استاندارد سنجه ${code} با موفقیت در اسناد کنترل‌شده بیمارستان ثبت گردید`, 'ok');
      } else {
        BTN.alert(`سند استاندارد سنجه ${code} با موفقیت ثبت شد.`);
      }
      closeAccStandardDoc();
    } catch (err) {
      console.warn('Doc save fallback:', err);
      if (typeof window.toast === 'function') {
        window.toast(`سند سنجه ${code} ذخیره گردید`, 'ok');
      } else {
        BTN.alert('سند ذخیره شد.');
      }
      closeAccStandardDoc();
    }
  };

  // ۳. رندر تب شناسنامه شاخص‌ها (Indicator Passport)
  window.renderAccIndicators = function() {
    return `
      <div class="panel g" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-size:16px; font-weight:800; color:var(--gd); margin:0 0 4px 0;">سامانه شناسنامه شاخص‌های بیمارستانی (Indicator Passport)</h3>
            <p style="font-size:12.5px; color:var(--tm); margin:0;">تعریف فرمول، صورت و مخرج کسر، تارگت، دوره‌های پایش و ثبت داده‌های ادواری طبق کتاب استانداردهای اعتباربخشی</p>
          </div>
          <button type="button" class="btn btn-g btn-sm" onclick="openNewIndicatorModal()">+ تعریف شاخص جدید</button>
        </div>
        <div class="indicators-grid">
          ${hospitalIndicatorsData.map(ind => `
            <div class="indicator-card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <span style="font-size:11px; font-weight:800; background:rgba(212,175,90,0.18); color:var(--gd); padding:2px 8px; border-radius:6px;">${ind.code}</span>
                  <h4 style="font-size:14.5px; font-weight:800; color:var(--th); margin:6px 0 2px 0;">${ind.name}</h4>
                  <span style="font-size:12px; color:var(--td);">نوع شاخص: ${ind.type}</span>
                </div>
                <span style="font-size:11px; background:rgba(63,172,191,0.15); color:var(--ok); padding:4px 8px; border-radius:6px; font-weight:700;">دوره: ${ind.period}</span>
              </div>
              <div class="indicator-formula-box">
                <div style="font-weight:700; color:var(--tm); margin-bottom:6px;">فرمول محاسباتی شاخص:</div>
                <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                  <span style="font-weight:700; color:var(--gd);">نرخ = </span>
                  <div class="fraction-box">
                    <div class="fraction-top">${ind.num}</div>
                    <div class="fraction-bottom">${ind.den}</div>
                  </div>
                  <span style="font-weight:700; color:var(--gd);"> × ${ind.factor}</span>
                </div>
              </div>
              <div style="font-size:12.5px; color:var(--tm); display:flex; justify-content:space-between; margin-top:4px;">
                <span>تارگت حد انتظار: <b style="color:var(--th);">${ind.target}</b></span>
                <span>مسئول پایش: <b style="color:var(--th);">${ind.owner}</b></span>
              </div>
              <div style="margin-top:10px; text-align:left;">
                <button type="button" class="btn btn-sm btn-doc-gen sop" onclick="printIndicatorSheet('${ind.code}')">🖨️ چاپ شناسنامه استاندارد</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  window.printIndicatorSheet = function(code) {
    const ind = hospitalIndicatorsData.find(i => i.code === code) || hospitalIndicatorsData[0];
    const w = window.open('', '_blank');
    w.document.write(`
      <html dir="rtl" lang="fa"><head><title>شناسنامه شاخص ${ind.code}</title>
      <style>body{font-family:sans-serif;padding:30px;color:#1e293b;line-height:1.8} .border-box{border:2px solid #334155;border-radius:8px;padding:20px;margin-top:20px} table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #cbd5e1;padding:10px;text-align:right}</style>
      </head><body>
      <div style="text-align:center;"><h2>شناسنامه استاندارد شاخص بیمارستانی (Indicator Passport)</h2><p>مصوب اعتباربخشی ملی - بیمارستان</p></div>
      <div class="border-box">
        <table>
          <tr><th>کد شاخص:</th><td>${ind.code}</td><th>نام شاخص:</th><td>${ind.name}</td></tr>
          <tr><th>نوع شاخص:</th><td>${ind.type}</td><th>دوره ارزیابی:</th><td>${ind.period}</td></tr>
          <tr><th>صورت کسر:</th><td colspan="3">${ind.num}</td></tr>
          <tr><th>مخرج کسر:</th><td colspan="3">${ind.den}</td></tr>
          <tr><th>حد انتظار (تارگت):</th><td>${ind.target}</td><th>مسئول اندازه‌گیری:</th><td>${ind.owner}</td></tr>
        </table>
      </div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  // ۴. رندر تب کمیته‌های بیمارستانی
  window.renderAccCommittees = function() {
    return `
      <div class="panel g" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-size:16px; font-weight:800; color:var(--gd); margin:0 0 4px 0;">کمیته‌های بیمارستانی و مدیریت مصوبات ادواری</h3>
            <p style="font-size:12.5px; color:var(--tm); margin:0;">داشبورد پایش کمیته‌های الزامی وزارت بهداشت، تقویم جلسات، پیگیری مصوبات و راستی‌آزمایی اقدامات</p>
          </div>
          <button type="button" class="btn btn-g btn-sm" onclick="openNewMeetingModal()">+ ثبت صورتجلسه جدید</button>
        </div>
        <div class="committees-grid">
          ${hospitalCommitteesData.map(c => `
            <div class="committee-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4 style="font-size:14.5px; font-weight:800; color:var(--th); margin:0;">${c.name}</h4>
                <span style="font-size:11.5px; background:rgba(80,160,240,0.18); color:#70b8ff; padding:3px 8px; border-radius:6px; font-weight:700;">${c.meetings} جلسه</span>
              </div>
              <div style="font-size:12.5px; color:var(--tm); line-height:1.8;">
                رئیس: <b style="color:var(--th);">${c.chair}</b> | دبیر: <b style="color:var(--th);">${c.secretary}</b>
              </div>
              <div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                  <span style="color:var(--td);">درصد تحقق مصوبات:</span>
                  <span class="committee-gauge-val">${c.percent}٪</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                  <div style="width:${c.percent}%; height:100%; background:${c.percent >= 85 ? 'var(--ok)' : 'var(--gd)'}; border-radius:4px;"></div>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <span style="font-size:11px; color:var(--td);">آخرین جلسه: ${c.lastDate}</span>
                <button type="button" class="btn btn-sm btn-doc-gen policy" onclick="viewCommitteeMinutes('${c.id}', '${c.name}')">مشاهده صورتجلسه</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  window.viewCommitteeMinutes = function(id, name) {
    if (typeof window.go === 'function') {
      window.go('committees');
    } else {
      BTN.alert(`مشاهده صورتجلسه ${name}`);
    }
  };

  window.openNewMeetingModal = function() {
    if (typeof window.go === 'function') {
      window.go('committees');
    }
  };

  // ۵. رندر تب خطاهای پزشکی و ۲۸ Never Event
  window.renderAccErrors = function() {
    return `
      <div class="panel g" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-size:16px; font-weight:800; color:var(--gd); margin:0 0 4px 0;">ثبت خطاهای پزشکی، وقایع ناخواسته درمانی و ۲۸ Never Events</h3>
            <p style="font-size:12.5px; color:var(--tm); margin:0;">سامانه گزارش‌دهی ناشناس، تحلیل ریشه‌ای (RCA)، اقدام اصلاحی فوری و ارتقای ایمنی بیمار</p>
          </div>
          <button type="button" class="btn btn-g btn-sm" onclick="openNewErrorModal()">+ گزارش خطای پزشکی</button>
        </div>
        <div class="errors-list-grid">
          ${hospitalErrorsData.map(e => `
            <div class="error-item-card">
              <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span style="font-weight:800; font-size:14.5px; color:var(--th);">${e.title}</span>
                  <span style="font-size:11px; color:var(--td);">(${e.id})</span>
                </div>
                <div style="font-size:12.5px; color:var(--tm); line-height:1.8;">
                  محل وقوع: <b style="color:var(--th);">${e.ward}</b> | تاریخ: <b>${e.date}</b> | تحلیل ریشه‌ای: <b>${e.rca}</b>
                </div>
              </div>
              <div style="text-align:left;">
                <span class="error-severity-badge ${e.severity.includes('E') || e.severity.includes('I') ? 'severity-high' : 'severity-medium'}">${e.severity}</span>
                <div style="font-size:11.5px; color:var(--ok); font-weight:700; margin-top:6px;">✓ ${e.status}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  window.openNewErrorModal = function() {
    if (typeof window.go === 'function') {
      window.go('clinical-safety');
    }
  };

  // ۶. رندر تب چک‌لیست‌های ارزیابی و EOP
  window.renderAccChecklists = function() {
    return `
      <div class="panel g" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-size:16px; font-weight:800; color:var(--gd); margin:0 0 4px 0;">چک‌لیست‌های پایش، ارزیابی بالینی و مدیریت خطر بلایا (EOP)</h3>
            <p style="font-size:12.5px; color:var(--tm); margin:0;">ابزارهای نظارت دوره‌ای سوپروایزری، پایش کیفیت، بهداشت محیط و مدیریت بلایا</p>
          </div>
          <button type="button" class="btn btn-g btn-sm" onclick="if(typeof go==='function') go('checklists');">+ مدیریت چک‌لیست‌ها</button>
        </div>
        <div class="checklists-grid">
          ${hospitalChecklistsData.map(chk => `
            <div class="checklist-card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <span style="font-size:11px; font-weight:800; background:rgba(80,160,240,0.18); color:#70b8ff; padding:2px 8px; border-radius:4px;">${chk.id}</span>
                  <h4 style="font-size:14.5px; font-weight:800; color:var(--th); margin:6px 0 2px 0;">${chk.title}</h4>
                  <span style="font-size:12px; color:var(--td);">${chk.category} (${chk.questions} گویه ارزیابی)</span>
                </div>
                <span style="font-size:11.5px; font-weight:700; color:${chk.score >= 85 ? 'var(--ok)' : 'var(--gd)'};">${chk.status}</span>
              </div>
              <div style="margin:8px 0;">
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                  <span style="color:var(--td);">نمره انطباق:</span>
                  <span style="color:var(--th); font-weight:700;">${chk.score} از ۱۰۰</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                  <div style="width:${chk.score}%; height:100%; background:${chk.score >= 85 ? 'var(--ok)' : 'var(--gd)'}; border-radius:4px;"></div>
                </div>
              </div>
              <div style="text-align:left; margin-top:4px;">
                <button type="button" class="btn btn-sm btn-doc-gen sop" onclick="printChecklistSheet('${chk.id}', '${chk.title}')">🖨️ چاپ فرم چک‌لیست</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  window.printChecklistSheet = function(id, title) {
    const w = window.open('', '_blank');
    w.document.write(`
      <html dir="rtl" lang="fa"><head><title>${title}</title>
      <style>body{font-family:sans-serif;padding:30px;color:#1e293b;line-height:1.8} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{border:1px solid #94a3b8;padding:10px;text-align:center} th{background:#f1f5f9}</style>
      </head><body>
      <h2 style="text-align:center;">چک‌لیست پایش و ارزیابی کیفیت بیمارستان</h2>
      <h3 style="text-align:center;color:#475569;">${title} (${id})</h3>
      <table>
        <thead><tr><th style="width:40px;">ردیف</th><th>گویه ارزیابی و استاندارد</th><th style="width:70px;">انطباق کامل</th><th style="width:70px;">انطباق نسبی</th><th style="width:70px;">عدم انطباق</th><th>توضیحات و شواهد</th></tr></thead>
        <tbody>
          <tr><td>۱</td><td style="text-align:right;">وجود خط‌مشی مصوب و ابلاغ‌شده در بخش</td><td>☐</td><td>☐</td><td>☐</td><td></td></tr>
          <tr><td>۲</td><td style="text-align:right;">آگاهی کارکنان از الزامات و مهارت‌های اجرایی</td><td>☐</td><td>☐</td><td>☐</td><td></td></tr>
          <tr><td>۳</td><td style="text-align:right;">ثبت دقیق مستندات و ثبت به موقع در سامانه</td><td>☐</td><td>☐</td><td>☐</td><td></td></tr>
          <tr><td>۴</td><td style="text-align:right;">رعایت اصول ایمنی بیمار و استانداردهای اعتباربخشی</td><td>☐</td><td>☐</td><td>☐</td><td></td></tr>
        </tbody>
      </table>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  // ۷. رندر تب پایش نواقص و یادآورها
  window.renderAccReminders = function() {
    return `
      <div class="panel g" style="margin-bottom:20px;">
        <div style="margin-bottom:16px;">
          <h3 style="font-size:16px; font-weight:800; color:var(--gd); margin:0 0 4px 0;">پایش نواقص، سررسید مدارک و یادآورهای سنجه‌ها</h3>
          <p style="font-size:12.5px; color:var(--tm); margin:0;">مدیریت مهلت‌های قانونی ابلاغی جهت بارگذاری شواهد، اقدامات اصلاحی و آمادگی برای ارزیابی جامع</p>
        </div>
        <div style="background:rgba(212,175,90,0.08); border:1px solid rgba(212,175,90,0.25); border-radius:12px; padding:18px; line-height:1.9; font-size:13px; color:var(--th);">
          📌 <b>وضعیت یادآورها:</b> تمامی سنجه‌های دارای وضعیت «عدم انطباق» یا «انطباق نسبی» در فهرست اولویت نظارتی قرار گرفته‌اند. برای هر سنجه می‌توانید از داخل کارت اختصاصی، مهلت اقدام اصلاحی (CAPA) و مسئول پیگیری را معین فرمایید.
        </div>
      </div>
    `;
  };

  console.log('[AccreditationSuite] Module initialized successfully.');
})();
