/* ==========================================================================
 * منابع مالی و مشارکت‌های مردمی — الف‑۱‑۹‑۱ و الف‑۱‑۹‑۳.
 * فقط «توصیف»، موتورش RPG است. بک‌اند: src/routes/api.js بخش Finance.
 * ========================================================================== */

// مبلغ‌ها ریالی و بزرگ‌اند؛ عددِ خام خوانده نمی‌شود، پس همه‌جا سه‌رقم‌جدا با
// ارقام فارسی نشان داده می‌شود.
const finMoney = (v) => (v == null || v === '')
  ? '<span style="color:var(--td)">—</span>'
  : fa(Number(v).toLocaleString('en-US'));

// انحراف، هم علامت دارد هم آستانه: بالای ۱۰٪ همان چیزی است که سنجه اقدام
// می‌خواهد، پس همان‌جا قرمز می‌شود و کاربر لازم نیست خودش حساب کند.
const finVariance = (r) => {
  if (r.variance_pct == null) return '<span style="color:var(--td)">—</span>';
  const p = Number(r.variance_pct);
  const clr = Math.abs(p) > 10 ? '#c02626' : (Math.abs(p) > 5 ? '#9a6b00' : '#17576e');
  const sign = p > 0 ? 'مانده' : (p < 0 ? 'بیش‌هزینه' : 'منطبق');
  return `<span style="color:${clr};font-weight:700">${fa(Math.abs(p))}٪</span>
          <small style="color:var(--mut)"> ${sign}</small>`;
};

RPG.define({
  key: 'finance',
  title: 'منابع مالی و مشارکت‌های مردمی',
  sub: 'بودجه‌ی عملیاتی در برابر هزینه‌ی واقعی، گزارش تحلیلی ماهانه، و جذب کمک خیرین',
  icon: '💰',
  perms: ['view_finance', 'manage_finance'],
  tabs: [['dash', 'داشبورد'], ['budget', 'بودجه و هزینه'], ['reports', 'گزارش ماهانه'],
    ['donations', 'کمک خیرین'], ['targets', 'هدف‌گذاری جذب'],
    ['costs', 'گلوبال و هتلینگ'], ['disruptions', 'اختلال خدمت']],
  fa: {},
  spec: {
    budget: {
      title: 'بودجه‌ی عملیاتی در برابر هزینه', icon: '📑',
      sub: 'الف-۱-۹-۱ — هزینه‌کردِ منابع تخصیصی مطابق اهداف برنامه‌های ابلاغی',
      formHint: 'واحدِ هر ردیف «برنامه» است نه سرفصل حسابداری؛ سنجه انطباقِ هزینه با هدفِ برنامه را می‌خواهد. انحراف و درصدش را سرور حساب می‌کند. انحرافِ بیش از ۱۰٪ بدون دلیل و اقدام اصلاحی پذیرفته نمی‌شود.',
      fields: [
        { k: 'year', l: 'سال *', t: 'text', list: 1 },
        { k: 'period', l: 'دوره (ماه/فصل)', t: 'text', list: 1 },
        { k: 'program_title', l: 'برنامه‌ی مربوط *', t: 'text', list: 1 },
        { k: 'budget_code', l: 'کد بودجه', t: 'text' },
        { k: 'source', l: 'منبع', t: 'select', list: 1, chip: 1,
          opts: ['ردیف بودجه‌ای', 'کمک برنامه‌ای وزارت', 'درآمد اختصاصی', 'خیرین و مشارکت مردمی', 'سایر'] },
        { k: 'allocated_amount', l: 'مبلغ تخصیصی (ریال) *', t: 'num', list: 1, render: (r) => finMoney(r.allocated_amount) },
        { k: 'spent_amount', l: 'هزینه‌ی واقعی (ریال)', t: 'num', list: 1, render: (r) => finMoney(r.spent_amount) },
        { k: 'variance', l: 'انحراف (ریال)', t: 'num', computed: 1, render: (r) => finMoney(r.variance) },
        { k: 'variance_pct', l: 'انحراف', t: 'num', computed: 1, list: 1, render: finVariance },
        { k: 'aligned_with_program', l: 'منطبق با اهداف برنامه', t: 'bool', list: 1 },
        { k: 'responsible', l: 'مسئول برنامه', t: 'text' },
        { k: 'approved_by', l: 'تأییدکننده', t: 'text' },
        { k: 'deviation_reason', l: 'دلیل انحراف', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    reports: {
      title: 'گزارش تفسیری و تحلیلی ماهانه', icon: '📈',
      sub: 'الف-۱-۹-۱ — گزارشِ مدیر مالی به تیم رهبری و مدیریت، و کنترل داخلی حسابداری',
      formHint: 'گزارشی که به تیم رهبری نرسیده باشد، در ممیزی همان گزارشِ نانوشته است؛ پس تحویل و تاریخِ بررسی ستون جدا دارند. اگر انحرافی ثبت کنید، «اقدام لازم» اجباری می‌شود.',
      fields: [
        { k: 'year', l: 'سال *', t: 'text', list: 1 },
        { k: 'month', l: 'ماه *', t: 'text', list: 1 },
        { k: 'total_allocated', l: 'جمع تخصیص (ریال)', t: 'num', list: 1, render: (r) => finMoney(r.total_allocated) },
        { k: 'total_spent', l: 'جمع هزینه (ریال)', t: 'num', list: 1, render: (r) => finMoney(r.total_spent) },
        { k: 'variance_pct', l: 'انحراف', t: 'num', computed: 1, list: 1, render: finVariance },
        { k: 'internal_control_done', l: 'کنترل داخلی حسابداری انجام شد', t: 'bool', list: 1 },
        { k: 'submitted_to_leadership', l: 'تحویلِ تیم رهبری شد', t: 'bool', list: 1 },
        { k: 'leadership_review_date', l: 'تاریخ بررسی تیم رهبری', t: 'date', list: 1 },
        { k: 'prepared_by', l: 'تهیه‌کننده', t: 'text' },
        { k: 'analysis', l: 'تفسیر و تحلیل *', t: 'area' },
        { k: 'deviations', l: 'انحراف‌های مشاهده‌شده', t: 'area' },
        { k: 'actions', l: 'اقدامات لازم برای انطباق', t: 'area' },
        { k: 'leadership_decision', l: 'تصمیم تیم رهبری', t: 'area' },
        { k: 'internal_control_note', l: 'شرح کنترل داخلی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    donations: {
      title: 'کمک خیرین و مشارکت‌های مردمی', icon: '🤲',
      sub: 'الف-۱-۹-۳ — جذب منابع از خیرین و مؤسسه‌های خیریه در چارچوب ضوابط',
      formHint: 'دو قاعده از خودِ متنِ سنجه اجباری‌اند: هزینه‌ی درمانِ مددجو با هماهنگی مددکاری، و کمکِ عمرانی و تجهیزاتی با تأیید تیم رهبری. نامِ بیمار ثبت نمی‌شود، فقط کد پرونده.',
      fields: [
        { k: 'donation_date', l: 'تاریخ کمک *', t: 'date', list: 1 },
        { k: 'year', l: 'سال', t: 'text', list: 1 },
        { k: 'donor_name', l: 'نام خیّر / مؤسسه *', t: 'text', list: 1 },
        { k: 'donor_kind', l: 'نوع خیّر', t: 'select', list: 1, chip: 1,
          opts: ['خیّر حقیقی', 'مؤسسه خیریه', 'مجمع خیرین سلامت', 'سازمان/شرکت'] },
        { k: 'kind', l: 'نوع کمک', t: 'select', list: 1, chip: 1,
          opts: ['نقدی', 'تجهیزات پزشکی', 'ساخت و توسعه', 'بازسازی و بهسازی', 'هزینه درمان مددجو', 'سایر'] },
        { k: 'amount', l: 'مبلغ / ارزش (ریال)', t: 'num', list: 1, render: (r) => finMoney(r.amount) },
        { k: 'target_program', l: 'برنامه‌ی هدف', t: 'text', list: 1 },
        { k: 'patient_case_code', l: 'کد پرونده‌ی مددجو', t: 'text' },
        { k: 'social_work_coordinated', l: 'هماهنگی با مددکاری', t: 'bool', list: 1 },
        { k: 'leadership_approved', l: 'تأیید تیم رهبری', t: 'bool', list: 1 },
        { k: 'recorded_in_accounting', l: 'ثبت در سامانه حسابداری', t: 'bool', list: 1 },
        { k: 'receipt_no', l: 'شماره رسید', t: 'text' },
        { k: 'purpose', l: 'شرح موضوع', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    targets: {
      title: 'هدف‌گذاری و سهم خیرین', icon: '🎯',
      sub: 'الف-۱-۹-۳ — تعیین سهم کمک‌ها در سال‌های گذشته و هدف‌گذاری برای سال آینده',
      formHint: 'سنجه صریحاً «هدف‌گذاری برای سال‌های آینده» و «برنامه‌های تبلیغی و ترویجی» را خواسته؛ هر دو اجباری‌اند. درصدِ تحقق را سرور از هدف و عملکرد حساب می‌کند.',
      fields: [
        { k: 'year', l: 'سال *', t: 'text', list: 1 },
        { k: 'target_amount', l: 'مبلغ هدف (ریال) *', t: 'num', list: 1, render: (r) => finMoney(r.target_amount) },
        { k: 'achieved_amount', l: 'مبلغ محقق‌شده (ریال)', t: 'num', list: 1, render: (r) => finMoney(r.achieved_amount) },
        { k: 'achieved_pct', l: 'درصد تحقق', t: 'num', computed: 1, list: 1,
          render: (r) => {
            if (r.achieved_pct == null) return '<span style="color:var(--td)">—</span>';
            const p = Number(r.achieved_pct);
            const clr = p >= 100 ? '#17576e' : (p >= 70 ? '#9a6b00' : '#c02626');
            return `<b style="color:${clr}">${fa(p)}٪</b>`;
          } },
        { k: 'share_of_budget_pct', l: 'سهم از کل منابع (٪)', t: 'num', step: '0.1', list: 1 },
        { k: 'meetings_held', l: 'تعداد جلسه با خیرین', t: 'num', list: 1 },
        { k: 'approved_by', l: 'تصویب‌کننده', t: 'text' },
        { k: 'promotion_plan', l: 'برنامه‌ی تبلیغی و ترویجی *', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    costs: {
      title: 'مدیریت هزینه‌ی گلوبال و هتلینگ', icon: '⚖️',
      sub: 'الف-۱-۹-۴ و الف-۱-۹-۵ — در چارچوب ضوابط، و با رعایت اصول کیفیت و ایمنی بیمار',
      formHint: 'قیدِ آخرِ هر دو سنجه همان چیزی است که این را از یک جدولِ حسابداری جدا می‌کند: کاهشِ هزینه‌ای که به کیفیت یا ایمنی زده باشد، امتیاز نیست. پس «بررسی اثر بر کیفیت و ایمنی» اجباری است و اگر اثری ثبت کنید، اقدام اصلاحی هم اجباری می‌شود.',
      fields: [
        { k: 'kind', l: 'موضوع', t: 'select', list: 1, chip: 1,
          opts: ['خدمات گلوبال', 'سهم هتلینگ خدمات پرستاری'] },
        { k: 'title', l: 'عنوان خدمت / بخش *', t: 'text', list: 1 },
        { k: 'ward', l: 'بخش', t: 'text', list: 1 },
        { k: 'year', l: 'سال *', t: 'text', list: 1 },
        { k: 'period', l: 'دوره', t: 'text', list: 1 },
        { k: 'cases_count', l: 'تعداد مورد', t: 'num', list: 1 },
        { k: 'tariff_amount', l: 'تعرفه/درآمد (ریال)', t: 'num', list: 1, render: (r) => finMoney(r.tariff_amount) },
        { k: 'actual_cost', l: 'هزینه‌ی واقعی (ریال)', t: 'num', list: 1, render: (r) => finMoney(r.actual_cost) },
        { k: 'variance', l: 'مابه‌التفاوت (ریال)', t: 'num', computed: 1, render: (r) => finMoney(r.variance) },
        { k: 'variance_pct', l: 'انحراف', t: 'num', computed: 1, list: 1, render: finVariance },
        { k: 'nursing_share_pct', l: 'سهم خدمات پرستاری (٪)', t: 'num', step: '0.1', list: 1 },
        { k: 'regulation_ref', l: 'ارجاع به ضابطه/تعرفه *', t: 'text' },
        { k: 'quality_safety_reviewed', l: 'اثر بر کیفیت و ایمنی بررسی شد *', t: 'bool', list: 1 },
        { k: 'responsible', l: 'مسئول', t: 'text' },
        { k: 'quality_safety_impact', l: 'اثرِ مشاهده‌شده بر کیفیت/ایمنی', t: 'area' },
        { k: 'deviation_reason', l: 'دلیل انحراف', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    disruptions: {
      title: 'اختلال و تأخیر خدمت به‌دلیل کمبود منابع', icon: '⛔',
      sub: 'الف-۱-۹-۷ — سنجه‌ای که هدفش صفر است: «هیچ موردی مشاهده نمی‌شود»',
      formHint: 'این دفتر برعکسِ بقیه است: خالی‌بودنش امتیاز است. ولی دفترِ نداشته را نمی‌شود خالی نشان داد، پس هر مورد ثبت و تا اقدام اصلاحی دنبال می‌شود — بدون اقدام اصلاحی ذخیره نمی‌شود.',
      fields: [
        { k: 'event_date', l: 'تاریخ *', t: 'date', list: 1 },
        { k: 'kind', l: 'نوع', t: 'select', list: 1, chip: 1,
          opts: ['تأخیر در ارائه خدمت', 'اختلال در ارائه خدمت', 'توقف موقت خدمت'] },
        { k: 'ward', l: 'بخش', t: 'text', list: 1 },
        { k: 'service', l: 'خدمت', t: 'text', list: 1 },
        { k: 'cause_category', l: 'علت', t: 'select', list: 1, chip: 1,
          opts: ['کمبود تجهیزات', 'خرابی تجهیزات', 'کمبود دارو و ملزومات',
            'کمبود نیروی انسانی', 'کمبود فضای فیزیکی', 'قطع برق/آب/گاز', 'سایر'] },
        { k: 'duration_minutes', l: 'مدت (دقیقه)', t: 'num', list: 1 },
        { k: 'patients_affected', l: 'بیمارِ متأثر', t: 'num', list: 1 },
        { k: 'harm_occurred', l: 'آسیب به بیمار', t: 'bool', list: 1 },
        { k: 'resolved', l: 'رفع شد', t: 'bool', list: 1 },
        { k: 'reported_by', l: 'گزارش‌دهنده', t: 'text' },
        { k: 'description', l: 'شرح مورد *', t: 'area' },
        { k: 'resolution', l: 'شرح رفع', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی *', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.budget_lines, 'ردیف بودجه‌ی ثبت‌شده', d.budget_lines ? '#17576e' : '#c02626', 'budget')}
        ${c(d.big_deviation, 'انحرافِ بیش از ۱۰٪', d.big_deviation ? '#c02626' : '#17576e', 'budget')}
        ${c(d.overspent, 'بیش‌هزینه نسبت به تخصیص', d.overspent ? '#9a6b00' : '#17576e', 'budget')}
        ${c(d.not_aligned, 'ناهم‌راستا با اهداف برنامه', d.not_aligned ? '#c02626' : '#17576e', 'budget')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.reports_year, 'گزارش ماهانه‌ی آخرین سال', d.reports_year ? '#17576e' : '#c02626', 'reports')}
        ${c(d.reports_not_submitted, 'تحویلِ تیم رهبری نشده', d.reports_not_submitted ? '#c02626' : '#17576e', 'reports')}
        ${c(d.no_internal_control, 'بدون کنترل داخلی حسابداری', d.no_internal_control ? '#c02626' : '#17576e', 'reports')}
        ${c(d.donations_count, 'کمکِ ثبت‌شده', d.donations_count ? '#17576e' : '#9a6b00', 'donations')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.donations_uncoordinated, 'کمکِ مددجو بدون هماهنگی مددکاری', d.donations_uncoordinated ? '#c02626' : '#17576e', 'donations')}
        ${c(d.donations_unrecorded, 'ثبت‌نشده در حسابداری', d.donations_unrecorded ? '#c02626' : '#17576e', 'donations')}
        ${c(d.targets, 'سالِ هدف‌گذاری‌شده', d.targets ? '#17576e' : '#c02626', 'targets')}
        ${c(d.target_gap, 'سالِ زیرِ هدف', d.target_gap ? '#9a6b00' : '#17576e', 'targets')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        ${c(d.cost_rows, 'ردیفِ گلوبال و هتلینگ', d.cost_rows ? '#17576e' : '#c02626', 'costs')}
        ${c(d.cost_overrun, 'هزینه‌ی بالاتر از تعرفه', d.cost_overrun ? '#9a6b00' : '#17576e', 'costs')}
        ${c(d.cost_quality_hit, 'با اثرِ ثبت‌شده بر کیفیت/ایمنی', d.cost_quality_hit ? '#c02626' : '#17576e', 'costs')}
        ${/* این یکی برعکسِ بقیه رنگ می‌گیرد: الف‑۱‑۹‑۷ می‌گوید «هیچ موردی
             مشاهده نمی‌شود»، پس صفر سبز است و هر عددی قرمز. */''}
        ${c(d.disruptions_year, 'اختلالِ خدمت در ۱۲ ماه', d.disruptions_year ? '#c02626' : '#17576e', 'disruptions')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        ${c(d.disruptions_open, 'اختلالِ رفع‌نشده', d.disruptions_open ? '#c02626' : '#17576e', 'disruptions')}
        ${c(d.disruptions_harm, 'منجر به آسیبِ بیمار', d.disruptions_harm ? '#c02626' : '#17576e', 'disruptions')}
      </div>
      <div style="margin-top:14px;padding:10px 14px;border-radius:12px;background:var(--cardbg,rgba(127,127,127,.07))">
        <div style="color:var(--mut);font-size:13px">جمعِ کمک‌های ثبت‌شده‌ی خیرین</div>
        <div style="font-size:20px;font-weight:800">${finMoney(d.donations_sum)} <small style="font-weight:400;color:var(--mut)">ریال</small></div>
      </div>
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        دو عددِ «انحرافِ بیش از ۱۰٪» و «تحویلِ تیم رهبری نشده» مهم‌ترین‌های این صفحه‌اند:
        الف‑۱‑۹‑۱ نه فقط هزینه‌کردِ درست، بلکه <b>پاسخگویی</b> را خواسته — یعنی انحراف باید
        دیده، توضیح داده و اصلاح شود، و گزارشش باید به تیم رهبری برسد.
        <br>کارتِ «اختلالِ خدمت» برعکسِ بقیه خوانده می‌شود: الف‑۱‑۹‑۷ می‌گوید
        <b>هیچ موردی نباید دیده شود</b>، پس صفرِ سبز همان امتیازِ کامل است.
      </div>`;
  },
});

const renderFinance = () => RPG.render('finance');
const financeCanView = () => RPG.canView('finance');
