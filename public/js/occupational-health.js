/* ==========================================================================
 * سلامت حرفه‌ای و بهداشت کار (الف-۳-۵، الف-۳-۶، الف-۳-۷) — فقط «توصیف»،
 * موتورش RPG است. بک‌اند: src/routes/api.js بخش OccHealth.
 *
 * نقشِ مسئول بهداشت حرفه‌ای از قبل در سامانه بود ولی هیچ ابزاری نداشت؛ ده سنجه
 * بی‌مدرک می‌ماندند. شرحِ کشف در docs/ANALYSIS-V3-MANAGEMENT.md.
 * ========================================================================== */

// فهرستِ عوامل زیان‌آور برای کشویی و برچسبِ ستونِ اندازه‌گیری — همان الگوی
// دستگاه‌های استریل‌کننده در infection.js
const OHS = { hazards: [] };

RPG.define({
  key: 'occhealth',
  title: 'سلامت حرفه‌ای و بهداشت کار',
  sub: 'عوامل زیان‌آور محیط کار، اندازه‌گیری دوره‌ای، حوادث شغلی و معاینات',
  icon: '🦺',
  perms: ['view_occhealth', 'manage_occhealth'],
  tabs: [['dash', 'داشبورد'], ['hazards', 'عوامل زیان‌آور'], ['measurements', 'اندازه‌گیری'],
    ['incidents', 'حوادث و شبه‌حوادث'], ['exams', 'معاینات شغلی']],
  fa: {
    oh_status: { open: 'باز', investigated: 'بررسی شد', closed: 'بسته شد' },
  },
  spec: {
    hazards: {
      title: 'شناسنامه‌ی عوامل زیان‌آور محیط کار', icon: '☣',
      sub: 'الف-۳-۵-۲ تا الف-۳-۵-۵ — شیمیایی، فیزیکی، بیولوژیکی و ارگونومیک',
      formHint: 'هر چهار نوع باید پوشش داده شود؛ نوعی که هیچ ردیفی ندارد یعنی یک سنجه‌ی بی‌مدرک. «گروه‌های در معرض» اجباری است چون سنجه، شناسایی را همین می‌داند.',
      fields: [
        { k: 'kind', l: 'نوع عامل *', t: 'select', opts: ['شیمیایی', 'فیزیکی', 'بیولوژیکی', 'ارگونومیک'], list: 1, chip: 1 },
        { k: 'title', l: 'عنوان عامل *', t: 'text', list: 1 },
        { k: 'ward', l: 'بخش / واحد', t: 'text', list: 1 },
        { k: 'exposed_groups', l: 'گروه‌های شغلی در معرض *', t: 'text', list: 1 },
        { k: 'exposed_count', l: 'تعداد افراد در معرض', t: 'num', list: 1 },
        { k: 'limit_value', l: 'حد مجاز', t: 'num', step: '0.001', list: 1 },
        { k: 'limit_unit', l: 'واحد حد مجاز', t: 'text', list: 1 },
        { k: 'review_interval_months', l: 'دوره‌ی بازنگری (ماه)', t: 'num', def: 12 },
        { k: 'responsible', l: 'مسئول پایش', t: 'text' },
        { k: 'is_active', l: 'فعال', t: 'bool', list: 1 },
        { k: 'source', l: 'منبع انتشار', t: 'area' },
        { k: 'control_measures', l: 'اقدامات کنترلی اجراشده', t: 'area' },
        { k: 'ppe_required', l: 'وسایل حفاظت فردی لازم (الف-۳-۵-۱)', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    measurements: {
      title: 'اندازه‌گیری دوره‌ای', icon: '📏',
      sub: 'بندِ دومِ همان چهار سنجه — شناسایی بدون اندازه‌گیری دوره‌ای مدرک نیست',
      formHint: 'قضاوتِ «داخل / خارج از حد مجاز» در سرور از مقایسه با حد مجازِ همان عامل حساب می‌شود، نه دستی. اگر عامل حد مجاز عددی ندارد، خالی می‌ماند.',
      fields: [
        { k: 'hazard_id', l: 'عامل زیان‌آور *', t: 'select',
          opts: () => OHS.hazards.map(h => [h.id, `${h.kind} — ${h.title}${h.ward ? ' (' + h.ward + ')' : ''}`]),
          list: 1, render: (r) => {
            const h = OHS.hazards.find(x => x.id === r.hazard_id);
            return h ? esc(h.kind + ' — ' + h.title) : '<span style="color:var(--td)">—</span>';
          } },
        { k: 'measured_date', l: 'تاریخ اندازه‌گیری *', t: 'date', list: 1 },
        { k: 'value', l: 'مقدار اندازه‌گیری‌شده *', t: 'num', step: '0.001', list: 1 },
        { k: 'value_unit', l: 'واحد', t: 'text', list: 1 },
        { k: 'within_limit', l: 'داخل حد مجاز', t: 'bool', computed: 1, list: 1,
          render: (r) => r.within_limit === null || r.within_limit === undefined
            ? '<span style="color:var(--td)">—</span>'
            : (r.within_limit ? '<b style="color:#17576e">داخل حد</b>' : '<b style="color:#c02626">خارج از حد</b>') },
        { k: 'method', l: 'روش اندازه‌گیری', t: 'text' },
        { k: 'lab_name', l: 'آزمایشگاه مجری', t: 'text' },
        { k: 'action_taken', l: 'اقدام انجام‌شده', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    incidents: {
      title: 'حوادث و شبه‌حوادث شغلی کارکنان', icon: '⚠',
      sub: 'الف-۳-۶-۲ و الف-۳-۶-۳ — کنترل و مدیریت حوادث، و پیش‌گیری از شبه‌حوادث',
      formHint: 'شبه‌حادثه صراحتاً در متن سنجه آمده و ثبتش هم‌ارزِ حادثه است. برای بستنِ رخداد، علت ریشه‌ای و اقدام اصلاحی هر دو الزامی‌اند.',
      fields: [
        { k: 'incident_date', l: 'تاریخ رخداد *', t: 'date', list: 1 },
        { k: 'kind', l: 'نوع *', t: 'select', opts: ['حادثه', 'شبه‌حادثه'], list: 1, chip: 1 },
        { k: 'category', l: 'دسته', t: 'select',
          opts: ['فرورفتن سوزن/جسم تیز', 'تماس با خون و ترشحات', 'مواجهه با ماده‌ی شیمیایی',
            'سقوط و لغزش', 'برق‌گرفتگی', 'سوختگی', 'آسیب ناشی از جابه‌جایی بیمار', 'خشونت محل کار', 'سایر'], list: 1 },
        { k: 'person_name', l: 'نام فرد', t: 'text', list: 1 },
        { k: 'job_title', l: 'سمت', t: 'text', list: 1 },
        { k: 'ward', l: 'بخش / واحد', t: 'text', list: 1 },
        { k: 'shift_code', l: 'شیفت', t: 'select', opts: ['', 'M', 'E', 'N'] },
        { k: 'lost_work_days', l: 'روزهای کاری ازدست‌رفته', t: 'num', list: 1 },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['open', 'investigated', 'closed'], fa: 'oh_status', list: 1, chip: 1 },
        { k: 'reported_by', l: 'گزارش‌دهنده', t: 'text' },
        { k: 'description', l: 'شرح رخداد *', t: 'area' },
        { k: 'injury', l: 'نوع و شدت آسیب', t: 'area' },
        { k: 'immediate_action', l: 'اقدام فوری', t: 'area' },
        { k: 'root_cause', l: 'علت ریشه‌ای', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    exams: {
      title: 'معاینات شغلی و بیماری‌های شغلی', icon: '🩺',
      sub: 'الف-۳-۷-۱ و الف-۳-۷-۲ — گروه‌های در معرض، و مدیریت بیماری شناسایی‌شده',
      formHint: '«تاریخ معاینه‌ی بعدی» را پر کنید تا معاینه‌ی سررسیدشده در داشبورد و کارتابل دیده شود. نتیجه‌ی «بیماری شغلی» بدون برنامه‌ی پیگیری ذخیره نمی‌شود.',
      fields: [
        { k: 'person_name', l: 'نام و نام‌خانوادگی *', t: 'text', list: 1 },
        { k: 'personnel_code', l: 'کد پرسنلی', t: 'text', list: 1 },
        { k: 'job_group', l: 'گروه شغلی', t: 'text', list: 1 },
        { k: 'ward', l: 'بخش / واحد', t: 'text', list: 1 },
        { k: 'exam_type', l: 'نوع معاینه *', t: 'select',
          opts: ['بدو استخدام', 'دوره‌ای', 'بازگشت به کار', 'خاتمه‌ی کار'], list: 1, chip: 1 },
        { k: 'exam_date', l: 'تاریخ معاینه *', t: 'date', list: 1 },
        { k: 'next_due', l: 'معاینه‌ی بعدی', t: 'date', list: 1,
          render: (r) => {
            if (!r.next_due) return '<span style="color:var(--td)">—</span>';
            const late = new Date(r.next_due) < new Date();
            return `<span style="color:${late ? '#c02626' : 'inherit'};font-weight:${late ? 700 : 400}">${faDateISO(r.next_due)}</span>`;
          } },
        { k: 'result', l: 'نتیجه', t: 'select',
          opts: ['سالم', 'نیازمند پیگیری', 'محدودیت شغلی', 'بیماری شغلی'], list: 1, chip: 1 },
        { k: 'exposure', l: 'مواجهه‌ی شغلی', t: 'text' },
        { k: 'findings', l: 'یافته‌ها', t: 'area' },
        { k: 'restrictions', l: 'محدودیت‌های شغلی', t: 'area' },
        { k: 'follow_up', l: 'برنامه‌ی پیگیری', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    const k = d.hazards_by_kind || {};
    // پوششِ چهار نوع اولین چیزی است که مسئول بهداشت حرفه‌ای باید ببیند: هر نوعِ
    // صفر یعنی یکی از چهار سنجه‌ی الف‑۳‑۵ هیچ مدرکی ندارد، پس قرمز است نه خاکستری.
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(k['شیمیایی'], 'عامل شیمیایی (الف-۳-۵-۲)', k['شیمیایی'] ? '#17576e' : '#c02626', 'hazards')}
        ${c(k['فیزیکی'], 'عامل فیزیکی (الف-۳-۵-۳)', k['فیزیکی'] ? '#17576e' : '#c02626', 'hazards')}
        ${c(k['بیولوژیکی'], 'عامل بیولوژیکی (الف-۳-۵-۴)', k['بیولوژیکی'] ? '#17576e' : '#c02626', 'hazards')}
        ${c(k['ارگونومیک'], 'عامل ارگونومیک (الف-۳-۵-۵)', k['ارگونومیک'] ? '#17576e' : '#c02626', 'hazards')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.hazards_unmeasured, 'عاملِ بدون هیچ اندازه‌گیری', d.hazards_unmeasured ? '#c02626' : '#17576e', 'measurements')}
        ${c(d.measurements_year, 'اندازه‌گیری در ۱۲ ماه گذشته', d.measurements_year ? '#17576e' : '#c02626', 'measurements')}
        ${c(d.measurements_out_of_limit, 'موردِ خارج از حد مجاز', d.measurements_out_of_limit ? '#c02626' : '#17576e', 'measurements')}
        ${c(d.hazards_total, 'کل عوامل فعال', '#1550b8', 'hazards')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.incidents_open, 'رخدادِ باز', d.incidents_open ? '#c02626' : '#17576e', 'incidents')}
        ${c(d.incidents_year, 'رخداد در ۱۲ ماه گذشته', '#1550b8', 'incidents')}
        ${c(d.near_miss_year, 'شبه‌حادثه در ۱۲ ماه گذشته', d.near_miss_year ? '#17576e' : '#9a6b00', 'incidents')}
        ${c(d.occupational_disease, 'بیماری شغلی شناسایی‌شده', d.occupational_disease ? '#9a6b00' : '#17576e', 'exams')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.exams_overdue, 'معاینه‌ی سررسیدگذشته', d.exams_overdue ? '#c02626' : '#17576e', 'exams')}
        ${c(d.exams_due_soon, 'معاینه‌ی سررسید تا ۳۰ روز آینده', d.exams_due_soon ? '#9a6b00' : '#17576e', 'exams')}
      </div>
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        شبه‌حادثه‌ی صفر خبرِ خوبی نیست: الف‑۳‑۶‑۳ صراحتاً پیش‌گیری از <b>شبه‌حوادث</b> را
        می‌خواهد، و سازمانی که هیچ شبه‌حادثه‌ای ثبت نمی‌کند معمولاً گزارش‌دهی ندارد، نه
        اینکه شبه‌حادثه ندارد.<br>
        ایمنیِ شیمیاییِ مدون (الف‑۳‑۶‑۱) و کتابچه‌ی MSDS از جنسِ سندِ کنترل‌شده‌اند و در
        <b>مدارک و کتابخانه</b> ثبت می‌شوند؛ این‌جا فقط عاملِ شیمیایی و اندازه‌گیری‌اش می‌آید.
      </div>`;
  },
  // فهرست عوامل پیش از هر تب تازه می‌شود، وگرنه کشوییِ اندازه‌گیری خالی می‌ماند
  onGo() { RPG.__ohLoadHazards(); },
});

RPG.__ohLoadHazards = async function () {
  try { OHS.hazards = (await API.get('/occhealth/hazards')).items || []; } catch (e) { /* بی‌صدا: کشویی خالی می‌ماند */ }
};

const renderOccHealth = async () => { await RPG.__ohLoadHazards(); return RPG.render('occhealth'); };
const occHealthCanView = () => RPG.canView('occhealth');
