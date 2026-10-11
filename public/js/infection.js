/* ==========================================================================
 * پیشگیری و کنترل عفونت (محور ب-۵) — فقط «توصیف»، موتورش RPG است.
 * ========================================================================== */

// فهرستِ دستگاه‌های استریل‌کننده برای کشوییِ «کدام دستگاه». چون تبِ فعال فقط
// آیتم‌های خودش را دارد، این فهرست جدا نگه داشته و در ورود به صفحه پر می‌شود.
const ICS = { sterilizers: [] };

RPG.define({
  key: 'infection',
  title: 'پیشگیری و کنترل عفونت',
  sub: 'استریلیزاسیون، بهداشت دست، عفونت‌های بیمارستانی و مقاومت میکروبی',
  icon: '🧫',
  perms: ['view_infection', 'manage_infection'],
  tabs: [['dash', 'داشبورد'], ['sterilizers', 'دستگاه‌های استریل'], ['tests', 'آزمون‌های استریل'],
    ['batches', 'بسته‌های استریل'], ['handhygiene', 'بهداشت دست'], ['hai', 'عفونت بیمارستانی'],
    ['antibiograms', 'مقاومت میکروبی']],
  fa: {
    result: { pass: 'قبول', fail: 'مردود' },
    batch_status: { released: 'ترخیص‌شده', quarantined: 'قرنطینه', recalled: 'فراخوان‌شده', used: 'مصرف‌شده' },
    hai_status: { open: 'باز', controlled: 'کنترل‌شده', closed: 'بسته شد' },
  },
  spec: {
    sterilizers: {
      title: 'دستگاه‌های استریل‌کننده', icon: '♨️',
      sub: 'ب-۵-۲-۴ — سوابق عملکرد هر دستگاه باید جداگانه و حداقل یک سال نگهداری شود',
      fields: [
        { k: 'title', l: 'عنوان دستگاه *', t: 'text', list: 1 },
        { k: 'device_type', l: 'نوع', t: 'select',
          opts: ['اتوکلاو بخار', 'پلاسما', 'اتیلن اکساید', 'فور (حرارت خشک)', 'شست‌وشوگر-ضدعفونی‌کننده'], list: 1 },
        { k: 'location', l: 'محل', t: 'text', list: 1 },
        { k: 'serial_no', l: 'شماره سریال', t: 'text', list: 1 },
        { k: 'manufacturer', l: 'سازنده', t: 'text', list: 1 },
        { k: 'responsible', l: 'مسئول', t: 'text', list: 1 },
        { k: 'is_active', l: 'فعال', t: 'bool', def: 1, list: 1 },
      ],
    },
    tests: {
      title: 'آزمون‌های اطمینان از عملکرد', icon: '🧪',
      sub: 'ب-۵-۲-۱ — آزمون بیولوژیک، بوی-دیک، شیمیایی و نشتی خلأ',
      formHint: 'برای آزمون مردود، ثبت اقدام انجام‌شده الزامی است — وگرنه بارهای همان سیکل بی‌تکلیف می‌مانند.',
      sections: [
        { title: 'اطلاعات آزمون و دستگاه', icon: '♨️', fields: ['sterilizer_id', 'test_date', 'test_type', 'cycle_no'] },
        { title: 'نتیجه و اپراتور', icon: '👤', fields: ['result', 'operator'] },
        { title: 'اقدام اصلاحی و مستندات', icon: '📝', fields: ['action_taken', 'note'] },
      ],
      fields: [
        { k: 'sterilizer_id', l: 'دستگاه *', t: 'select', opts: () => ICS.sterilizers.map(s => [s.id, s.title]),
          list: 1, render: (r) => esc((ICS.sterilizers.find(s => s.id === r.sterilizer_id) || {}).title || '—') },
        { k: 'test_date', l: 'تاریخ آزمون *', t: 'date', list: 1 },
        { k: 'test_type', l: 'نوع آزمون', t: 'select', opts: ['بیولوژیک', 'بوی-دیک (Bowie-Dick)', 'شیمیایی', 'آزمون نشتی خلأ'], list: 1 },
        { k: 'cycle_no', l: 'شماره سیکل', t: 'text', list: 1 },
        { k: 'result', l: 'نتیجه', t: 'select', opts: ['pass', 'fail'], fa: 'result', list: 1, chip: 1 },
        { k: 'operator', l: 'اپراتور', t: 'text', list: 1 },
        { k: 'action_taken', l: 'اقدام انجام‌شده (در صورت مردودی)', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    batches: {
      title: 'بسته‌های استریل', icon: '📦',
      sub: 'ب-۵-۲-۵ — برچسب هر بسته باید حداقل اطلاعات لازم برای فراخوان را داشته باشد',
      formHint: 'ترخیص بسته بدون شماره سیکل و دستگاه ممکن نیست؛ بدون آن‌ها فراخوانِ یک بسته عملاً شدنی نیست.',
      sections: [
        { title: 'مشخصات بسته و دستگاه استریل', icon: '📦', fields: ['batch_label', 'pack_content', 'sterilizer_id', 'cycle_no'] },
        { title: 'زمان‌بندی، اندیکاتور و وضعیت ترخیص', icon: '⏱️', fields: ['sterilized_date', 'expiry_date', 'chemical_indicator_ok', 'status'] },
        { title: 'مسئول و مقصد بسته', icon: '🏥', fields: ['operator', 'destination', 'note'] },
      ],
      fields: [
        { k: 'batch_label', l: 'برچسب بسته *', t: 'text', list: 1 },
        { k: 'pack_content', l: 'محتوای بسته *', t: 'text', list: 1 },
        { k: 'sterilizer_id', l: 'دستگاه', t: 'select', opts: () => [['', '—']].concat(ICS.sterilizers.map(s => [s.id, s.title])),
          list: 1, render: (r) => esc((ICS.sterilizers.find(s => s.id === r.sterilizer_id) || {}).title || '—') },
        { k: 'cycle_no', l: 'شماره سیکل', t: 'text', list: 1 },
        { k: 'sterilized_date', l: 'تاریخ استریل *', t: 'date', list: 1 },
        { k: 'expiry_date', l: 'تاریخ انقضا', t: 'date', list: 1 },
        { k: 'chemical_indicator_ok', l: 'اندیکاتور شیمیایی تأیید شد', t: 'bool', def: 1, list: 1 },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['released', 'quarantined', 'recalled', 'used'], fa: 'batch_status', list: 1, chip: 1 },
        { k: 'operator', l: 'اپراتور', t: 'text' },
        { k: 'destination', l: 'مقصد (بخش/واحد)', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    handhygiene: {
      title: 'پایش بهداشت دست', icon: '🧼',
      sub: 'ب-۵-۴-۲ — اندازه‌گیری میزان رعایت با روش استاندارد و اقدام اصلاحی بر اساس نتایج',
      formHint: 'درصد رعایت از «موارد رعایت‌شده ÷ فرصت‌های مشاهده‌شده» در سرور حساب می‌شود و دستی وارد نمی‌شود.',
      sections: [
        { title: 'زمان، مکان و موقعیت پایش', icon: '📍', fields: ['audit_date', 'ward', 'staff_group', 'moment'] },
        { title: 'فرصت‌ها و موارد رعایت استاندارد', icon: '📊', fields: ['opportunities', 'compliant'] },
        { title: 'پایشگر و اقدامات تکمیلی', icon: '📝', fields: ['auditor', 'corrective_action', 'note'] },
      ],
      fields: [
        { k: 'audit_date', l: 'تاریخ پایش *', t: 'date', list: 1 },
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'staff_group', l: 'گروه شغلی', t: 'text', list: 1 },
        { k: 'moment', l: 'موقعیت', t: 'select', opts: ['هر پنج موقعیت', 'پیش از تماس با بیمار', 'پیش از اقدام آسپتیک',
          'پس از تماس با مایعات بدن', 'پس از تماس با بیمار', 'پس از تماس با محیط بیمار'], list: 1 },
        { k: 'opportunities', l: 'فرصت‌های مشاهده‌شده *', t: 'num', list: 1 },
        { k: 'compliant', l: 'موارد رعایت‌شده *', t: 'num', list: 1 },
        { k: 'compliance_pct', l: 'درصد رعایت', t: 'num', computed: 1, list: 1,
          render: (r) => `<b style="color:${r.compliance_pct >= 80 ? '#0b7a3e' : (r.compliance_pct >= 60 ? '#9a6b00' : '#c02626')}">${fa(r.compliance_pct == null ? '—' : r.compliance_pct)}٪</b>` },
        { k: 'auditor', l: 'پایشگر', t: 'text' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    hai: {
      title: 'عفونت‌های بیمارستانی', icon: '🦠',
      sub: 'ب-۵-۵ — بیماریابی مستمر، گزارش ماهیانه به سامانه، و کنترل طغیان',
      formHint: 'برای موردِ طغیان، اقدامات فوری کنترلی (ایزولاسیون، کوهورتینگ، نمونه‌برداری محیطی) و گزارش به سامانه کشوری الزامی است.',
      sections: [
        { title: 'مشخصات بیمار و زمان‌بندی شناسایی', icon: '📅', fields: ['detected_date', 'ward', 'patient_ref'] },
        { title: 'تشخیص بالینی و میکروارگانیسم', icon: '🔬', fields: ['infection_type', 'organism', 'device_related'] },
        { title: 'پایش طغیان و نظام مراقبت کشوری', icon: '🚨', fields: ['is_outbreak', 'reported_to_system', 'reported_date', 'status'] },
        { title: 'اقدامات کنترلی و پیامد بالینی', icon: '🛡️', fields: ['control_measures', 'outcome', 'note'] },
      ],
      fields: [
        { k: 'detected_date', l: 'تاریخ شناسایی *', t: 'date', list: 1 },
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'infection_type', l: 'نوع عفونت', t: 'select',
          opts: ['عفونت محل جراحی', 'پنومونی مرتبط با ونتیلاتور (VAP)', 'عفونت ادراری مرتبط با سوند (CAUTI)',
            'عفونت خونی مرتبط با کاتتر (CLABSI)', 'سایر'], list: 1 },
        { k: 'organism', l: 'میکروارگانیسم', t: 'text', list: 1 },
        { k: 'device_related', l: 'وسیله‌ی مرتبط', t: 'text' },
        { k: 'patient_ref', l: 'شناسه بیمار (بدون نام)', t: 'text' },
        { k: 'is_outbreak', l: 'طغیان (Outbreak)', t: 'bool', list: 1,
          hint: 'افزایش غیرمنتظره و خوشه‌ای موارد عفونت همسان در بخش؛ الزام به فعال‌سازی پروتکل‌های ایزولاسیون و گزارش فوری ۲۴ ساعته به سامانه کشوری' },
        { k: 'reported_to_system', l: 'به سامانه‌ی کشوری گزارش شد', t: 'bool', list: 1 },
        { k: 'reported_date', l: 'تاریخ گزارش', t: 'date' },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['open', 'controlled', 'closed'], fa: 'hai_status', list: 1, chip: 1 },
        { k: 'control_measures', l: 'اقدامات کنترلی', t: 'area' },
        { k: 'outcome', l: 'پیامد', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    antibiograms: {
      title: 'گزارش مقاومت میکروبی (آنتی‌بیوگرام)', icon: '📊',
      sub: 'ب-۵-۶-۲ — حداقل هر سه ماه یک‌بار، با اعمال نتایج در روند تجویز',
      formHint: 'ثبت «تغییرات اعمال‌شده در تجویز» الزامی است؛ گزارشی که چیزی را تغییر نداده، این سنجه را پاسخ نمی‌دهد.',
      sections: [
        { title: 'دوره و مسئولین گزارش مقاومت میکروبی', icon: '📋', fields: ['jalali_year', 'quarter', 'report_date', 'scope', 'approved_by'] },
        { title: 'تحلیل بالینی، ارگانیسم‌های مقاوم و تجویز دارو', icon: '💊', fields: ['key_findings', 'resistant_organisms', 'prescribing_changes', 'restricted_antibiotics', 'note'] },
      ],
      fields: [
        { k: 'jalali_year', l: 'سال (شمسی) *', t: 'num', list: 1 },
        { k: 'quarter', l: 'فصل (۱ تا ۴) *', t: 'num', def: 1, list: 1 },
        { k: 'report_date', l: 'تاریخ گزارش', t: 'date', list: 1 },
        { k: 'scope', l: 'دامنه (بخش/نمونه)', t: 'text', list: 1 },
        { k: 'approved_by', l: 'تأییدکننده', t: 'text', list: 1 },
        { k: 'key_findings', l: 'یافته‌های کلیدی *', t: 'area' },
        { k: 'resistant_organisms', l: 'ارگانیسم‌های مقاوم', t: 'area' },
        { k: 'prescribing_changes', l: 'تغییرات اعمال‌شده در روند تجویز *', t: 'area' },
        { k: 'restricted_antibiotics', l: 'آنتی‌بیوتیک‌های محدودشده', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    const hh = d.hand_hygiene_pct;
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(hh, 'رعایت بهداشت دست (۹۰ روز، ٪)', hh == null ? '#6b7280' : (hh >= 80 ? '#0b7a3e' : (hh >= 60 ? '#9a6b00' : '#c02626')), 'handhygiene')}
        ${c(d.hand_hygiene_opportunities, 'فرصت مشاهده‌شده (۹۰ روز)', '#1550b8', 'handhygiene')}
        ${c(d.failed_tests_90d, 'آزمون استریل مردود (۹۰ روز)', d.failed_tests_90d ? '#c02626' : '#0b7a3e', 'tests')}
        ${c(d.quarantined_batches, 'بسته‌ی قرنطینه/فراخوان‌شده', d.quarantined_batches ? '#9a6b00' : '#0b7a3e', 'batches')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.hai_open, 'مورد عفونت باز', d.hai_open ? '#c02626' : '#0b7a3e', 'hai')}
        ${c(d.hai_outbreaks, 'طغیان ثبت‌شده', d.hai_outbreaks ? '#c02626' : '#0b7a3e', 'hai')}
        ${c(d.hai_unreported, 'گزارش‌نشده به سامانه', d.hai_unreported ? '#c02626' : '#0b7a3e', 'hai')}
        ${c(d.antibiograms, 'گزارش مقاومت میکروبی', d.antibiograms ? '#0b7a3e' : '#c02626', 'antibiograms')}
      </div>
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        درصد بهداشت دست میانگینِ وزن‌دار است — مجموع رعایت‌ها بر مجموع فرصت‌ها — نه میانگینِ درصدها؛
        وگرنه یک پایشِ پنج‌موردی همان وزنِ پایشِ دویست‌موردی را می‌گرفت. بندهای کالبدیِ این محور
        (تفکیک فضای کثیف/تمیز/استریل و مسیر انتقال در اتاق عمل) وضعیتِ ساختمانی‌اند نه داده‌ی
        دوره‌ای؛ جای‌شان چک‌لیست و ممیزیِ موجود است.
      </div>`;
  },
  // فهرست دستگاه‌ها برای کشویی‌ها، پیش از هر تب تازه می‌شود
  onGo() { RPG.__icLoadSterilizers(); },
});

RPG.__icLoadSterilizers = async function () {
  try { ICS.sterilizers = (await API.get('/infection/sterilizers')).items || []; } catch (e) { /* بی‌صدا: کشویی خالی می‌ماند */ }
};

const renderInfection = async () => { await RPG.__icLoadSterilizers(); return RPG.render('infection'); };
const infectionCanView = () => RPG.canView('infection');
