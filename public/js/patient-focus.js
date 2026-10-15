/* ==========================================================================
 * بیمارمحوری و علت‌کاوی — الف‑۱‑۷‑۴، الف‑۱‑۸‑۶، الف‑۱‑۸‑۷.
 * فقط «توصیف»، موتورش RPG است. بک‌اند: src/routes/api.js بخش PatientFocus.
 * ========================================================================== */

// «شمارش‌پذیر» یعنی این مورد واقعاً مصداقِ سنجه است: ناخواسته، ظرف ۳۰ روز، و
// بیرون از استثناهای صریحِ متن. رکوردی که شمارش نمی‌شود باید در فهرست هم پیدا
// باشد، وگرنه کاربر فکر می‌کند آمارش غلط است.
const pfCountable = (r) => r.countable
  ? '<b style="color:#c02626">مصداق سنجه</b>'
  : '<span style="color:var(--mut)">خارج از تعریف</span>';

const pfDays = (r) => {
  if (r.days_gap == null) return '<span style="color:var(--td)">—</span>';
  const clr = r.days_gap <= 7 ? '#c02626' : (r.days_gap <= 30 ? '#9a6b00' : 'inherit');
  return `<span style="color:${clr};font-weight:${r.days_gap <= 30 ? 700 : 400}">${fa(r.days_gap)} روز</span>`;
};

// نمودارِ میله‌ای متنی برای «روندِ تکرارِ علت‌ها» — الف‑۱‑۸‑۷ صریحاً تحلیلِ
// تکرارِ علت‌ها را خواسته و فهرستِ خام آن را نشان نمی‌دهد.
const pfBars = (rows, title) => {
  if (!rows || !rows.length) return '';
  const max = Math.max(...rows.map(r => r.n)) || 1;
  return `<div style="margin-top:14px">
    <div style="font-weight:700;margin-bottom:6px">${esc(title)}</div>
    ${rows.map(r => `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
        <div style="min-width:190px;font-size:13px">${esc(r.k || '—')}</div>
        <div style="flex:1;background:rgba(127,127,127,.15);border-radius:6px;height:14px;overflow:hidden">
          <i style="display:block;float:right;height:100%;width:${Math.round(r.n / max * 100)}%;background:#c9772b"></i>
        </div>
        <div style="min-width:34px;text-align:left;font-weight:700">${fa(r.n)}</div>
      </div>`).join('')}
  </div>`;
};

RPG.define({
  key: 'patientfocus',
  title: 'بیمارمحوری و علت‌کاوی',
  sub: 'تعارض منافع، بستری مجدد، و ترخیص با میل شخصی — شناسایی، علت‌کاوی، اقدام اصلاحی',
  icon: '🫱',
  perms: ['view_patientfocus', 'manage_patientfocus'],
  tabs: [['dash', 'داشبورد'], ['coi', 'تعارض منافع'], ['readmissions', 'بستری مجدد'],
    ['ama', 'ترخیص با میل شخصی']],
  fa: {},
  spec: {
    coi: {
      title: 'ثبت و مدیریت تعارض منافع', icon: '⚖️',
      sub: 'الف-۱-۷-۴ — شناسایی مصادیق، اطلاع‌رسانی به کارکنان، پیشگیری و اقدام اصلاحی',
      formHint: 'مصادیقِ فهرست، همان‌هایی است که متنِ سنجه نام برده؛ انتخاب از فهرست باعث می‌شود «تکرارِ یک مصداق» قابل شمردن باشد. پرونده‌ای که حقوق بیمار در آن نقض شده، بدون اقدام اصلاحی بسته نمی‌شود.',
      fields: [
        { k: 'case_date', l: 'تاریخ *', t: 'date', list: 1 },
        { k: 'title', l: 'عنوان مورد *', t: 'text', list: 1 },
        { k: 'kind', l: 'مصداق', t: 'select', list: 1, chip: 1,
          opts: ['اخذ وجه غیرقانونی از بیمار', 'نقض محرمانگی یا حریم بیمار', 'خدمات القایی',
            'تبانی در دارو و تجهیزات', 'هدایت بیمار به مرکز دیگر', 'تعارض صنفی یا گروهی', 'سایر'] },
        { k: 'involved_unit', l: 'واحد مرتبط', t: 'text', list: 1 },
        { k: 'source', l: 'منبع شناسایی', t: 'select', list: 1,
          opts: ['گزارش کارکنان', 'شکایت بیمار', 'بازدید مدیریتی', 'کمیته اخلاق بالینی', 'ممیزی داخلی'] },
        { k: 'reported_by', l: 'گزارش‌دهنده', t: 'text' },
        { k: 'patient_right_violated', l: 'حقوق بیمار نقض شد', t: 'bool', list: 1 },
        { k: 'staff_informed', l: 'اطلاع‌رسانی به کارکنان', t: 'bool', list: 1 },
        { k: 'status', l: 'وضعیت', t: 'select', list: 1, chip: 1,
          opts: ['شناسایی‌شده', 'در حال بررسی', 'اقدام‌شده', 'بسته'] },
        { k: 'closed_date', l: 'تاریخ بسته‌شدن', t: 'date' },
        { k: 'ethics_committee_ref', l: 'ارجاع به کمیته اخلاق بالینی', t: 'text' },
        { k: 'description', l: 'شرح مورد', t: 'area' },
        { k: 'preventive_measure', l: 'پیشنهاد پیشگیرانه', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    readmissions: {
      title: 'بستری مجدد و تحلیل ریشه‌ای', icon: '🔁',
      sub: 'الف-۱-۸-۶ — بستری ناخواسته ظرف یک ماه پس از ترخیص',
      formHint: 'فاصله‌ی روز و «مصداقِ سنجه بودن» را سرور از تاریخ‌ها حساب می‌کند: ناخواسته، حداکثر ۳۰ روز، و بیرون از استثناهای متن (روان‌پزشکی، شیمی‌درمانی، دیالیز، مراجعه‌ی برنامه‌ریزی‌شده). نامِ بیمار ثبت نمی‌شود، فقط کد پرونده.',
      fields: [
        { k: 'patient_code', l: 'کد پرونده *', t: 'text', list: 1 },
        { k: 'age', l: 'سن', t: 'num' },
        { k: 'sex', l: 'جنسیت', t: 'select', opts: ['زن', 'مرد'] },
        { k: 'prev_discharge_date', l: 'ترخیص قبلی *', t: 'date', list: 1 },
        { k: 'prev_ward', l: 'بخش قبلی', t: 'text', list: 1 },
        { k: 'prev_service', l: 'سرویس تخصصی قبلی', t: 'text' },
        { k: 'prev_diagnosis', l: 'تشخیص نهاییِ ترخیص قبلی', t: 'text' },
        { k: 'readmit_date', l: 'بستری مجدد *', t: 'date', list: 1 },
        { k: 'readmit_ward', l: 'بخش بستری مجدد', t: 'text', list: 1 },
        { k: 'readmit_diagnosis', l: 'تشخیص هنگام بستری مجدد', t: 'text' },
        { k: 'days_gap', l: 'فاصله', t: 'num', computed: 1, list: 1, render: pfDays },
        { k: 'unplanned', l: 'بدون برنامه‌ریزی قبلی', t: 'bool' },
        { k: 'exclusion', l: 'استثنا', t: 'select',
          opts: ['ندارد', 'بستری برنامه‌ریزی‌شده', 'روان‌پزشکی', 'شیمی‌درمانی', 'دیالیز'] },
        { k: 'countable', l: 'وضعیت', t: 'bool', computed: 1, list: 1, render: pfCountable },
        { k: 'root_cause_done', l: 'تحلیل ریشه‌ای انجام شد', t: 'bool', list: 1 },
        { k: 'discharge_safety_related', l: 'مرتبط با ایمنیِ ترخیص (ب-۱-۱۲-۱)', t: 'bool', list: 1 },
        { k: 'action_team', l: 'اعضای تیم اقدام', t: 'text' },
        { k: 'root_cause', l: 'نتیجه‌ی تحلیل ریشه‌ای', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی / برنامه بهبود', t: 'area' },
        { k: 'followup_result', l: 'پایش نتیجه‌ی اقدام', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    ama: {
      title: 'ترخیص با رعایت و با میل شخصی', icon: '🚪',
      sub: 'الف-۱-۸-۷ — ثبت دقیق علت، تحلیل تکرار علت‌ها، و اقدام پیشگیرانه',
      formHint: 'متنِ سنجه می‌گوید علتِ این ترخیص‌ها «معمولاً به درستی ثبت نمی‌شود»؛ برای همین علت از فهرست انتخاب می‌شود و «سایر» بدونِ شرح پذیرفته نیست. موردی که قابل پیشگیری بوده، بدون اقدام اصلاحی ذخیره نمی‌شود.',
      fields: [
        { k: 'patient_code', l: 'کد پرونده *', t: 'text', list: 1 },
        { k: 'discharge_date', l: 'تاریخ ترخیص *', t: 'date', list: 1 },
        { k: 'kind', l: 'نوع', t: 'select', list: 1, chip: 1, opts: ['با میل شخصی', 'با رعایت'] },
        { k: 'ward', l: 'بخش', t: 'text', list: 1 },
        { k: 'service', l: 'سرویس تخصصی', t: 'text' },
        { k: 'cause_category', l: 'دسته‌ی علت *', t: 'select', list: 1, chip: 1,
          opts: ['نارضایتی از کیفیت خدمات', 'برخورد کارکنان', 'هزینه و مسائل مالی',
            'طولانی‌شدن بستری', 'امکانات رفاهی و اقامتی', 'مشکل خانوادگی یا شغلی',
            'عدم پذیرش روند درمان', 'انتقال به مرکز دیگر', 'سایر'] },
        { k: 'preventable', l: 'قابل پیشگیری بود', t: 'bool', list: 1 },
        { k: 'consent_form_signed', l: 'فرم رضایت امضا شد', t: 'bool', list: 1 },
        { k: 'risk_explained', l: 'عوارض توضیح داده شد', t: 'bool', list: 1 },
        { k: 'followup_call_done', l: 'پیگیری تلفنی انجام شد', t: 'bool', list: 1 },
        { k: 'recorded_by', l: 'ثبت‌کننده', t: 'text' },
        { k: 'cause_detail', l: 'شرح دقیق علت', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی / پیشگیرانه', t: 'area' },
        { k: 'followup_result', l: 'نتیجه‌ی پیگیری', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.coi_total, 'موردِ تعارض منافع', d.coi_total ? '#17576e' : '#9a6b00', 'coi')}
        ${c(d.coi_open, 'پرونده‌ی باز', d.coi_open ? '#c02626' : '#17576e', 'coi')}
        ${c(d.coi_violations, 'موردِ نقض حقوق بیمار', d.coi_violations ? '#c02626' : '#17576e', 'coi')}
        ${c(d.coi_not_informed, 'بدون اطلاع‌رسانی به کارکنان', d.coi_not_informed ? '#9a6b00' : '#17576e', 'coi')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.readmits_year, 'بستری مجددِ ۱۲ ماه گذشته', d.readmits_year ? '#9a6b00' : '#17576e', 'readmissions')}
        ${c(d.readmits_no_rca, 'بدون تحلیل ریشه‌ای', d.readmits_no_rca ? '#c02626' : '#17576e', 'readmissions')}
        ${c(d.readmits_discharge_related, 'مرتبط با ایمنیِ ترخیص', d.readmits_discharge_related ? '#c02626' : '#17576e', 'readmissions')}
        ${c(d.readmits_excluded, 'خارج از تعریفِ سنجه', '#6b7280', 'readmissions')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.ama_year, 'ترخیص با میل شخصیِ ۱۲ ماه', d.ama_year ? '#9a6b00' : '#17576e', 'ama')}
        ${c(d.ama_preventable, 'قابل پیشگیری', d.ama_preventable ? '#c02626' : '#17576e', 'ama')}
        ${c(d.ama_no_action, 'قابل پیشگیری و بدون اقدام', d.ama_no_action ? '#c02626' : '#17576e', 'ama')}
        ${c(d.ama_no_consent, 'بدون فرم رضایت', d.ama_no_consent ? '#c02626' : '#17576e', 'ama')}
      </div>
      ${pfBars(d.ama_top_causes, 'پرتکرارترین علل ترخیص با میل شخصی')}
      ${pfBars(d.coi_top_kinds, 'پرتکرارترین مصادیق تعارض منافع')}
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        هر سه بخشِ این صفحه یک چرخه دارند و ارزیاب هم همان را دنبال می‌کند:
        <b>مورد ثبت شده؟ علتش کاویده شده؟ اقدام اصلاحی دارد؟</b> عددهای قرمز دقیقاً
        همان‌هایی‌اند که یکی از این سه حلقه در آن‌ها باز مانده است.
      </div>`;
  },
});

const renderPatientFocus = () => RPG.render('patientfocus');
const patientFocusCanView = () => RPG.canView('patientfocus');
