/* ==========================================================================
 * مدیریت خطر حوادث و بلایا (محور الف-۲) — فقط «توصیف»، موتورش RPG است.
 * ========================================================================== */

RPG.define({
  key: 'disaster',
  title: 'مدیریت خطر حوادث و بلایا',
  sub: 'ارزیابی ایمنی بیمارستان، عوامل خطرآفرین، مانورها و حوادث داخلی',
  icon: '🚨',
  perms: ['view_disaster', 'manage_disaster'],
  tabs: [['dash', 'داشبورد'], ['assessments', 'ارزیابی ایمنی'], ['hazards', 'عوامل خطرآفرین'],
    ['drills', 'مانور و تمرین'], ['incidents', 'حوادث داخلی']],
  fa: {
    hz_status: { planned: 'برنامه‌ریزی شد', in_progress: 'در حال اجرا', done: 'اجرا شد' },
    dr_status: { planned: 'برنامه‌ریزی شد', done: 'اجرا شد', analyzed: 'تحلیل شد' },
    in_status: { open: 'باز', investigated: 'بررسی شد', closed: 'بسته شد' },
  },
  spec: {
    assessments: {
      title: 'ارزیابی ایمنی بیمارستان (HSI)', icon: '🏥',
      sub: 'الف-۲-۱-۲ — ارزیابی سالیانه در سه حیطه‌ی سازه‌ای، غیرسازه‌ای و عملکردی',
      formHint: 'هر سه نمره الزامی است؛ نمره‌ی نهایی شاخص ایمنی بیمارستان از همین سه حیطه گزارش می‌شود.',
      fields: [
        { k: 'jalali_year', l: 'سال ارزیابی (شمسی) *', t: 'num', list: 1 },
        { k: 'assessed_date', l: 'تاریخ ارزیابی', t: 'date', list: 1 },
        { k: 'structural_score', l: 'نمره‌ی حیطه‌ی سازه‌ای *', t: 'num', step: '0.01', list: 1 },
        { k: 'nonstructural_score', l: 'نمره‌ی حیطه‌ی غیرسازه‌ای *', t: 'num', step: '0.01', list: 1 },
        { k: 'functional_score', l: 'نمره‌ی حیطه‌ی عملکردی *', t: 'num', step: '0.01', list: 1 },
        { k: 'total_score', l: 'نمره‌ی نهایی HSI', t: 'num', step: '0.01', list: 1 },
        { k: 'safety_level', l: 'سطح ایمنی', t: 'select', opts: ['', 'A', 'B', 'C'], list: 1 },
        { k: 'team_members', l: 'اعضای تیم ارزیابی', t: 'area' },
        { k: 'findings', l: 'یافته‌ها', t: 'area' },
        { k: 'action_plan', l: 'برنامه‌ی اقدام', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    hazards: {
      title: 'عوامل خطرآفرین و برآورد خطر', icon: '⚡',
      sub: 'الف-۲-۱-۳ — برآورد خطر، تعیین پنج مخاطره‌ی اولویت‌دار و برنامه‌ی کاهش خطر',
      formHint: 'امتیاز خطر از ضربِ احتمال × شدت در سرور حساب می‌شود و دستی قابل تغییر نیست.',
      fields: [
        { k: 'title', l: 'عنوان عامل خطرآفرین *', t: 'text', list: 1 },
        { k: 'category', l: 'دسته', t: 'select', opts: ['طبیعی', 'انسان‌ساخت', 'تکنولوژیک', 'زیستی', 'اجتماعی'], list: 1 },
        { k: 'likelihood', l: 'احتمال (۱ تا ۵) *', t: 'num', def: 3, list: 1 },
        { k: 'severity', l: 'شدت (۱ تا ۵) *', t: 'num', def: 3, list: 1 },
        { k: 'risk_score', l: 'امتیاز خطر', t: 'num', computed: 1, list: 1,
          render: (r) => `<b style="color:${r.risk_score >= 15 ? '#c02626' : (r.risk_score >= 8 ? '#9a6b00' : '#17576e')}">${fa(r.risk_score || 0)}</b>` },
        { k: 'is_priority', l: 'جزو مخاطرات اولویت‌دار', t: 'bool', list: 1 },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['planned', 'in_progress', 'done'], fa: 'hz_status', list: 1, chip: 1 },
        { k: 'responsible', l: 'مسئول', t: 'text' },
        { k: 'due_date', l: 'مهلت', t: 'date' },
        { k: 'committee_ref', l: 'ارجاع به صورت‌جلسه کمیته', t: 'text' },
        { k: 'expected_impact', l: 'اثرات احتمالی بر بیمارستان', t: 'area' },
        { k: 'mitigation_plan', l: 'برنامه‌ی کاهش خطر', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    drills: {
      title: 'مانور و تمرین شبیه‌سازی‌شده', icon: '🧯',
      sub: 'الف-۲-۴-۴ و الف-۲-۵-۲ — تمرین با سناریوی مدون، و تحلیل عملکرد پس از آن',
      formHint: 'مانورِ بدون تحلیل عملکرد و اقدام اصلاحی، در ممیزی حلقه‌ی باز شمرده می‌شود.',
      fields: [
        { k: 'title', l: 'عنوان مانور *', t: 'text', list: 1 },
        { k: 'drill_type', l: 'نوع', t: 'select', opts: ['مانور عملیاتی', 'مانور دورمیزی (TTX)', 'مانور اعلام خبر', 'تمرین تخلیه'], list: 1 },
        { k: 'drill_date', l: 'تاریخ مانور *', t: 'date', list: 1 },
        { k: 'hazard_ref', l: 'مخاطره‌ی مرتبط', t: 'text', list: 1 },
        { k: 'participant_count', l: 'تعداد شرکت‌کنندگان', t: 'num', list: 1 },
        { k: 'duration_min', l: 'مدت (دقیقه)', t: 'num' },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['planned', 'done', 'analyzed'], fa: 'dr_status', list: 1, chip: 1 },
        { k: 'observers', l: 'ناظران', t: 'text' },
        { k: 'scenario', l: 'سناریو *', t: 'area' },
        { k: 'participants', l: 'شرکت‌کنندگان / واحدها', t: 'area' },
        { k: 'performance_analysis', l: 'تحلیل عملکرد', t: 'area' },
        { k: 'weaknesses', l: 'نقاط ضعف شناسایی‌شده', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    incidents: {
      title: 'حوادث داخلی بیمارستان', icon: '🔥',
      sub: 'الف-۲-۲-۶ — گزارش، بررسی، تحلیل و اقدام اصلاحی مؤثر',
      formHint: 'این‌جا حادثه‌ی تأسیساتی و ایمنی ثبت می‌شود؛ خطای بالینیِ مرتبط با بیمار در ماژول «گزارش خطا» است.',
      fields: [
        { k: 'incident_date', l: 'تاریخ حادثه *', t: 'date', list: 1 },
        { k: 'incident_type', l: 'نوع حادثه', t: 'select',
          opts: ['آتش‌سوزی', 'قطع برق', 'قطع آب', 'نشت گاز/بخار', 'سیل/آبگرفتگی', 'زلزله', 'حادثه امنیتی', 'سقوط/آسیب محیطی', 'سایر'], list: 1 },
        { k: 'location', l: 'محل', t: 'text', list: 1 },
        { k: 'severity', l: 'شدت', t: 'select', opts: ['جزئی', 'متوسط', 'شدید', 'بحرانی'], list: 1 },
        { k: 'injuries', l: 'تعداد مصدوم', t: 'num', list: 1 },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['open', 'investigated', 'closed'], fa: 'in_status', list: 1, chip: 1 },
        { k: 'damage_estimate', l: 'برآورد خسارت', t: 'text' },
        { k: 'reported_by', l: 'گزارش‌دهنده', t: 'text' },
        { k: 'description', l: 'شرح حادثه *', t: 'area' },
        { k: 'immediate_response', l: 'اقدام فوری', t: 'area' },
        { k: 'root_cause', l: 'تحلیل ریشه‌ای', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const a = d.last_assessment;
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(a ? a.total_score : null, a ? `نمره‌ی HSI (سال ${fa(a.jalali_year)})` : 'ارزیابی ایمنی ثبت نشده',
          a ? '#17576e' : '#c02626', 'assessments')}
        ${c(d.hazards_priority, 'مخاطره‌ی اولویت‌دار', '#c02626', 'hazards')}
        ${c(d.hazards_open, 'برنامه‌ی کاهش خطرِ ناتمام', d.hazards_open ? '#9a6b00' : '#17576e', 'hazards')}
        ${c(d.drills_year, 'مانور در ۱۲ ماه گذشته', d.drills_year ? '#17576e' : '#c02626', 'drills')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.drills_unanalyzed, 'مانورِ بدون تحلیل عملکرد', d.drills_unanalyzed ? '#c02626' : '#17576e', 'drills')}
        ${c(d.incidents_open, 'حادثه‌ی باز', d.incidents_open ? '#c02626' : '#17576e', 'incidents')}
        ${c(d.incidents_year, 'حادثه در ۱۲ ماه گذشته', '#1550b8', 'incidents')}
        ${c(d.hazards_total, 'کل عوامل خطرآفرین شناسایی‌شده', '#1550b8', 'hazards')}
      </div>
      ${a ? `<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        ${c(a.structural_score, 'حیطه‌ی سازه‌ای', '#1550b8')}
        ${c(a.nonstructural_score, 'حیطه‌ی غیرسازه‌ای', '#1550b8')}
        ${c(a.functional_score, 'حیطه‌ی عملکردی', '#1550b8')}
      </div>` : ''}
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        بندهای کالبدیِ این محور — پله فرار، آسانسور، برق و آب و بخار و تهویه — از جنسِ «قلمِ دارای
        بازرسی دوره‌ای»اند و در ماژول <b>اقلام و نگهداشت دوره‌ای</b> با دسته‌ی «تأسیسات» یا
        «ایمنی و آتش‌نشانی» ثبت می‌شوند؛ این‌جا دوباره‌سازی نشده‌اند.
      </div>`;
  },
});

const renderDisaster = () => RPG.render('disaster');
const disasterCanView = () => RPG.canView('disaster');
