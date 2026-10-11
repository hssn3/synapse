/* ==========================================================================
 * تصویربرداری و ایمنی پرتو (محور ب-۷) — فقط «توصیف»، موتورش RPG است.
 * ========================================================================== */

const IMGS = { devices: [] };
const IMG_MODALITIES = ['رادیوگرافی', 'CT', 'MRI', 'فلوروسکوپی', 'سونوگرافی', 'ماموگرافی', 'دانسیتومتری'];

RPG.define({
  key: 'imaging',
  title: 'تصویربرداری و ایمنی پرتو',
  sub: 'کنترل کیفی و کالیبراسیون، دزیمتری پرتوکاران، فرم آمادگی، یافته‌ی بحرانی و بازبینی کیفیت',
  icon: '🩻',
  perms: ['view_imaging', 'manage_imaging'],
  tabs: [['dash', 'داشبورد'], ['devices', 'دستگاه‌ها'], ['qc', 'کنترل کیفی'],
    ['dosimetry', 'دزیمتری'], ['prep', 'فرم آمادگی'], ['criticalreports', 'یافته‌ی بحرانی'],
    ['reviews', 'بازبینی کیفیت']],
  fa: { qc_result: { pass: 'قابل قبول', fail: 'مردود' } },
  spec: {
    devices: {
      title: 'دستگاه‌های تصویربرداری', icon: '🖥',
      sub: 'ب-۷-۳-۷ — خروجی دیجیتال استاندارد (دایکام) و اتصال به سامانه‌ی بایگانی تصاویر',
      fields: [
        { k: 'title', l: 'عنوان دستگاه *', t: 'text', list: 1 },
        { k: 'modality', l: 'نوع', t: 'select', opts: IMG_MODALITIES, list: 1, chip: 1 },
        { k: 'manufacturer', l: 'سازنده', t: 'text', list: 1 },
        { k: 'model', l: 'مدل', t: 'text', list: 1 },
        { k: 'serial_no', l: 'شماره سریال', t: 'text' },
        { k: 'install_date', l: 'تاریخ نصب', t: 'date' },
        { k: 'location', l: 'محل', t: 'text', list: 1 },
        { k: 'digital_output', l: 'خروجی دیجیتال (دایکام)', t: 'bool', list: 1 },
        { k: 'pacs_connected', l: 'متصل به PACS', t: 'bool', list: 1 },
        { k: 'responsible', l: 'مسئول', t: 'text' },
        { k: 'is_active', l: 'فعال', t: 'bool', def: 1, list: 1 },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    qc: {
      title: 'کنترل کیفی و کالیبراسیون', icon: '📐',
      sub: 'ب-۷-۳-۶ — تأییدیه حداقل سالانه از شرکت‌های موردتأیید سازمان انرژی اتمی، و کالیبراسیون اختصاصی سازنده',
      formHint: 'تأییدیه‌ی شرکتِ تأییدنشده ثبت نمی‌شود؛ و «معتبر بودن» را سرور از تاریخ اعتبار حساب می‌کند، نه با تیک.',
      fields: [
        { k: 'device_id', l: 'دستگاه *', t: 'select', opts: () => IMGS.devices.map(d => [d.id, d.title]),
          list: 1, render: (r) => esc((IMGS.devices.find(d => d.id === r.device_id) || {}).title || '—') },
        { k: 'kind', l: 'نوع', t: 'select', opts: ['کنترل کیفی سالانه', 'کالیبراسیون اختصاصی سازنده'], list: 1, chip: 1 },
        { k: 'performed_date', l: 'تاریخ انجام *', t: 'date', list: 1 },
        { k: 'company', l: 'شرکت انجام‌دهنده', t: 'text', list: 1 },
        { k: 'aeoi_approved', l: 'موردتأیید سازمان انرژی اتمی', t: 'bool', list: 1 },
        { k: 'certificate_no', l: 'شماره تأییدیه', t: 'text' },
        { k: 'valid_until', l: 'تاریخ اعتبار', t: 'date', list: 1 },
        { k: 'is_valid', l: 'معتبر', t: 'bool', computed: 1, list: 1,
          render: (r) => r.is_valid ? '<span style="color:#0b7a3e">معتبر</span>'
            : (r.valid_until ? '<b style="color:#c02626">منقضی</b>' : '—') },
        { k: 'result', l: 'نتیجه', t: 'select', opts: ['pass', 'fail'], fa: 'qc_result', list: 1, chip: 1 },
        { k: 'findings', l: 'یافته‌ها', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی (در صورت مردودی)', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    dosimetry: {
      title: 'دزیمتری پرتوکاران', icon: '☢️',
      sub: 'ب-۷-۱-۳ — از وظایف محوله‌ی مسئول فیزیک بهداشت طبق ضوابط سازمان انرژی اتمی',
      formHint: 'حد مجاز بر حسب بازه و نوع پرتوکار فرق می‌کند، پس روی خودِ رکورد است؛ ولی «عبور از حد» را سرور تعیین می‌کند.',
      fields: [
        { k: 'staff_name', l: 'نام پرتوکار *', t: 'text', list: 1 },
        { k: 'job_title', l: 'سمت', t: 'text', list: 1 },
        { k: 'badge_no', l: 'شماره فیلم‌بج', t: 'text', list: 1 },
        { k: 'period_from', l: 'از تاریخ *', t: 'date', list: 1 },
        { k: 'period_to', l: 'تا تاریخ *', t: 'date', list: 1 },
        { k: 'dose_msv', l: 'دز دریافتی (mSv) *', t: 'num', list: 1 },
        { k: 'dose_limit_msv', l: 'حد مجاز همان بازه (mSv) *', t: 'num', list: 1 },
        { k: 'over_limit', l: 'عبور از حد', t: 'bool', computed: 1, list: 1,
          render: (r) => r.over_limit ? '<b style="color:#c02626">بله</b>' : '<span style="color:#0b7a3e">خیر</span>' },
        { k: 'action_taken', l: 'اقدام انجام‌شده (در صورت عبور)', t: 'area' },
        { k: 'reported_by', l: 'ثبت‌کننده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    prep: {
      title: 'فرم‌های آمادگی پروسیجر', icon: '📄',
      sub: 'ب-۷-۲-۲ — شناسایی پروسیجرهای نیازمند آمادگی، تهیه‌ی فرم، و دسترسی بخش‌ها',
      formHint: '«فرم آماده» با «در دسترس بخش‌ها» یکی نیست؛ فرمی که در کشوی واحد بماند، برای بخشِ بستری وجود ندارد.',
      fields: [
        { k: 'procedure_name', l: 'نام پروسیجر *', t: 'text', list: 1 },
        { k: 'modality', l: 'نوع تصویربرداری', t: 'select', opts: [''].concat(IMG_MODALITIES), list: 1 },
        { k: 'needs_prep', l: 'نیازمند آمادگی', t: 'bool', def: 1, list: 1 },
        { k: 'form_ready', l: 'فرم تهیه شده', t: 'bool', list: 1 },
        { k: 'available_to_wards', l: 'در دسترس بخش‌ها و سرپایی', t: 'bool', list: 1 },
        { k: 'prep_summary', l: 'خلاصه‌ی آمادگی لازم', t: 'area' },
        { k: 'approved_by', l: 'تأییدکننده', t: 'text' },
        { k: 'approved_date', l: 'تاریخ تأیید', t: 'date' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    criticalreports: {
      title: 'گزارش یافته‌ی بحرانی', icon: '📞',
      sub: 'ب-۷-۳-۵ — خط آزاد ارتباطی و اطلاع‌رسانی به‌موقع مقادیر بحرانی',
      formHint: 'فاصله‌ی «آماده‌شدن گزارش» تا «اعلام به بخش» را سرور از دو ساعت حساب می‌کند.',
      fields: [
        { k: 'report_date', l: 'تاریخ *', t: 'date', list: 1 },
        { k: 'modality', l: 'نوع تصویربرداری', t: 'select', opts: [''].concat(IMG_MODALITIES), list: 1 },
        { k: 'finding', l: 'یافته‌ی بحرانی *', t: 'text', list: 1 },
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'patient_ref', l: 'شناسه بیمار (بدون نام)', t: 'text' },
        { k: 'result_time', l: 'ساعت آماده‌شدن گزارش * (HH:MM)', t: 'text' },
        { k: 'reported_time', l: 'ساعت اعلام به بخش * (HH:MM)', t: 'text' },
        { k: 'minutes_to_report', l: 'فاصله (دقیقه)', t: 'num', computed: 1, list: 1,
          render: (r) => {
            const m = r.minutes_to_report;
            if (m == null) return '—';
            const c = m <= 15 ? '#0b7a3e' : (m <= 30 ? '#9a6b00' : '#c02626');
            return `<b style="color:${c}">${fa(m)}</b>`;
          } },
        { k: 'receiver_name', l: 'گیرنده در بخش *', t: 'text', list: 1 },
        { k: 'read_back_done', l: 'بازخوانی توسط گیرنده *', t: 'bool', list: 1 },
        { k: 'reported_by', l: 'اعلام‌کننده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    reviews: {
      title: 'بازبینی دوره‌ای کیفیت', icon: '📈',
      sub: 'ب-۷-۳-۴ — حداقل ماهیانه، با اقدام اصلاحی و ارائه‌ی راهکار به تیم رهبری',
      formHint: 'بازبینیِ بدون اقدام اصلاحی فقط یک یادداشت است؛ کتاب هر دو را با هم خواسته.',
      fields: [
        { k: 'review_date', l: 'تاریخ بازبینی *', t: 'date', list: 1 },
        { k: 'period_label', l: 'دوره (مثلاً مرداد ۱۴۰۵)', t: 'text', list: 1 },
        { k: 'factors_found', l: 'عوامل شناسایی‌شده *', t: 'area' },
        { k: 'priorities', l: 'اولویت‌بندی', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی / برنامه بهبود *', t: 'area' },
        { k: 'presented_to_leadership', l: 'به تیم رهبری ارائه شد', t: 'bool', list: 1 },
        { k: 'presented_date', l: 'تاریخ ارائه', t: 'date', list: 1 },
        { k: 'reviewer', l: 'بازبین (مسئول فنی)', t: 'text', list: 1 },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.devices, 'دستگاه فعال', '#1550b8', 'devices')}
        ${c(d.devices_no_valid_qc, 'دستگاه بدون تأییدیه‌ی معتبر', d.devices_no_valid_qc ? '#c02626' : '#0b7a3e', 'qc')}
        ${c(d.qc_expiring_60d, 'تأییدیه‌ی رو به انقضا (۶۰ روز)', d.qc_expiring_60d ? '#9a6b00' : '#0b7a3e', 'qc')}
        ${c(d.devices_no_pacs, 'دستگاه بدون اتصال PACS', d.devices_no_pacs ? '#9a6b00' : '#0b7a3e', 'devices')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.dosimetry_records, 'رکورد دزیمتری', d.dosimetry_records ? '#0b7a3e' : '#c02626', 'dosimetry')}
        ${c(d.dosimetry_over_limit, 'عبور از حد مجاز دز', d.dosimetry_over_limit ? '#c02626' : '#0b7a3e', 'dosimetry')}
        ${c(d.prep_missing_form, 'پروسیجر بدون فرم آمادگی', d.prep_missing_form ? '#c02626' : '#0b7a3e', 'prep')}
        ${c(d.prep_not_available, 'فرم آماده ولی در دسترس بخش‌ها نیست', d.prep_not_available ? '#9a6b00' : '#0b7a3e', 'prep')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.critical_reports_90d, 'یافته‌ی بحرانی (۹۰ روز)', '#1550b8', 'criticalreports')}
        ${c(d.critical_avg_minutes == null ? '—' : d.critical_avg_minutes, 'میانگین فاصله تا اعلام (دقیقه)',
          d.critical_avg_minutes == null ? '#6b7280' : (d.critical_avg_minutes <= 15 ? '#0b7a3e' : (d.critical_avg_minutes <= 30 ? '#9a6b00' : '#c02626')), 'criticalreports')}
        ${c(d.reviews_90d, 'بازبینی کیفیت (۹۰ روز — نیاز ۳)',
          d.reviews_90d >= 3 ? '#0b7a3e' : (d.reviews_90d ? '#9a6b00' : '#c02626'), 'reviews')}
        ${c(d.reviews_not_presented, 'بازبینی ارائه‌نشده به تیم رهبری', d.reviews_not_presented ? '#c02626' : '#0b7a3e', 'reviews')}
      </div>
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        «دستگاه بدون تأییدیه‌ی معتبر» یعنی هیچ کنترل کیفیِ سالانه‌ای که امروز هنوز اعتبار داشته باشد ندارد —
        همان چیزی که ارزیابِ ب-۷-۳-۶ اول می‌پرسد. اعتبارِ تأییدیه، عبور از حدِ دز و فاصله تا اعلامِ یافته‌ی
        بحرانی هر سه در سرور از داده حساب می‌شوند.
        بندهای کالبدیِ این محور (فضای مستقل، علائم و چراغ‌های هشدار پرتو — ب-۷-۱-۱) وضعیتِ ساختمانی‌اند و
        جای‌شان چک‌لیست است؛ شناسایی بیمار و رضایت آگاهانه‌ی پروسیجر (ب-۷-۱-۲، ب-۷-۳-۱) به پرونده‌ی بیمار
        گره خورده‌اند. مهلتِ مصوبِ کمیته برای تصویربرداری اورژانس (ب-۷-۳-۲) را می‌توان در «پایش زمان
        پاسخ‌دهی» ماژول آزمایشگاه ثبت کرد؛ شکلِ داده دقیقاً همان است.
      </div>`;
  },
  onGo() { RPG.__imgLoadDevices(); },
});

RPG.__imgLoadDevices = async function () {
  try { IMGS.devices = (await API.get('/imaging/devices')).items || []; } catch (e) { /* بی‌صدا */ }
};

const renderImaging = async () => { await RPG.__imgLoadDevices(); return RPG.render('imaging'); };
const imagingCanView = () => RPG.canView('imaging');
