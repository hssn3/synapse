/* ==========================================================================
 * نظارت مدیریت پرستاری — الف‑۴‑۱‑۴/۵ و الف‑۴‑۳‑۲/۳/۴.
 * فقط «توصیف»، موتورش RPG است. بک‌اند: src/routes/api.js بخش NursingSupervision.
 *
 * چرا جدا از «برنامه‌ی شیفت»: برنامه می‌گوید «چه کسی کِی کار می‌کند»، این‌جا
 * می‌گوید «چند نفر لازم بود» و «کیفیتِ مراقبت پایش شد یا نه» — دو سؤال متفاوت.
 * ========================================================================== */

RPG.define({
  key: 'nsupervision',
  title: 'نظارت مدیریت پرستاری',
  sub: 'برآورد نیرو، پایش مراقبت، نظارت بر پرونده، و اعزام و ارجاع بیمار',
  icon: '🩺',
  perms: ['view_nsupervision', 'manage_nsupervision'],
  tabs: [['dash', 'داشبورد'], ['staffing', 'برآورد نیرو'], ['care_audits', 'پایش مراقبت'],
    ['record_audits', 'نظارت بر پرونده'], ['referrals', 'اعزام و ارجاع']],
  fa: { nsp_status: { open: 'باز', in_progress: 'در حال اقدام', closed: 'بسته' } },
  spec: {
    staffing: {
      title: 'برآورد کمی و کیفی نیروی پرستاری', icon: '🧮',
      sub: 'الف-۴-۱-۴ و الف-۴-۱-۵ — چینش با روش علمی، و اینکه مانع مراقبت مستقیم نشود',
      formHint: 'کسری/مازاد و نسبتِ پرستار به تخت در سرور از خودِ اعداد حساب می‌شوند. «روش برآورد» اجباری است چون سنجه «روش‌های علمی» را صریح خواسته.',
      fields: [
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'shift_code', l: 'شیفت', t: 'select', opts: ['M', 'E', 'N'], list: 1, chip: 1 },
        { k: 'period', l: 'دوره (مثلاً شهریور ۱۴۰۵)', t: 'text', list: 1 },
        { k: 'active_beds', l: 'تخت فعال', t: 'num', list: 1 },
        { k: 'patient_count', l: 'تعداد بیمار', t: 'num', list: 1 },
        { k: 'acuity_level', l: 'شدت مراقبت', t: 'select', opts: ['سبک', 'متوسط', 'سنگین', 'بحرانی'], list: 1 },
        { k: 'required_staff', l: 'نفرِ لازم (برآورد) *', t: 'num', list: 1 },
        { k: 'assigned_staff', l: 'نفرِ چیده‌شده *', t: 'num', list: 1 },
        { k: 'gap', l: 'کسری / مازاد', t: 'num', computed: 1, list: 1,
          render: (r) => r.gap == null ? '—'
            : `<b style="color:${r.gap < 0 ? '#c02626' : (r.gap > 0 ? '#1550b8' : '#0b7a3e')}">${r.gap > 0 ? '+' : ''}${fa(r.gap)}</b>` },
        { k: 'nurse_per_bed', l: 'پرستار به تخت', t: 'num', computed: 1, list: 1 },
        { k: 'method', l: 'روش برآورد *', t: 'text' },
        { k: 'skill_mix', l: 'ترکیب مهارت (کیفی)', t: 'area' },
        { k: 'non_care_burden', l: 'بارِ کارِ غیرمراقبتی (الف-۴-۱-۵)', t: 'area' },
        { k: 'action_plan', l: 'برنامه‌ی اقدام برای کسری', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    care_audits: {
      title: 'پایش مستمر مراقبت پرستاری', icon: '🔎',
      sub: 'الف-۴-۳-۲ — نظارت مستمر، و اقدام اصلاحی مؤثر در صورت نیاز',
      formHint: 'پایشی که انطباقش زیر ۱۰۰٪ است، بدون اقدام اصلاحی بسته نمی‌شود — حلقه‌ی باز همان چیزی است که ارزیاب می‌گیرد.',
      fields: [
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'audit_date', l: 'تاریخ پایش *', t: 'date', list: 1 },
        { k: 'audit_focus', l: 'موضوع پایش *', t: 'text', list: 1 },
        { k: 'sample_size', l: 'حجم نمونه', t: 'num', list: 1 },
        { k: 'compliance_pct', l: 'درصد انطباق', t: 'num', step: '0.1', list: 1,
          render: (r) => r.compliance_pct == null ? '—'
            : `<b style="color:${r.compliance_pct >= 90 ? '#0b7a3e' : (r.compliance_pct >= 70 ? '#9a6b00' : '#c02626')}">${fa(r.compliance_pct)}٪</b>` },
        { k: 'status', l: 'وضعیت', t: 'select', opts: ['open', 'in_progress', 'closed'], fa: 'nsp_status', list: 1, chip: 1 },
        { k: 'recheck_date', l: 'تاریخ بازبینی', t: 'date', list: 1 },
        { k: 'auditor', l: 'پایشگر', t: 'text' },
        { k: 'findings', l: 'یافته‌ها', t: 'area' },
        { k: 'root_cause', l: 'علت ریشه‌ای', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    record_audits: {
      title: 'نظارت بر تکمیل پرونده در حین بستری', icon: '📁',
      sub: 'الف-۴-۳-۳ — مدیریت پرستاری بر تکمیل پرونده‌های پزشکی نظارت می‌کند',
      formHint: '«در حین بستری» یعنی نمونه‌گیری از پرونده‌های فعال، نه ممیزیِ پرونده‌ی بسته‌شده. درصد کامل‌بودن در سرور حساب می‌شود.',
      fields: [
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'audit_date', l: 'تاریخ پایش *', t: 'date', list: 1 },
        { k: 'sample_size', l: 'تعداد پرونده‌ی بررسی‌شده *', t: 'num', list: 1 },
        { k: 'complete_count', l: 'تعداد پرونده‌ی کامل *', t: 'num', list: 1 },
        { k: 'completeness_pct', l: 'درصد کامل‌بودن', t: 'num', computed: 1, list: 1,
          render: (r) => r.completeness_pct == null ? '—'
            : `<b style="color:${r.completeness_pct >= 90 ? '#0b7a3e' : (r.completeness_pct >= 70 ? '#9a6b00' : '#c02626')}">${fa(r.completeness_pct)}٪</b>` },
        { k: 'auditor', l: 'پایشگر', t: 'text', list: 1 },
        { k: 'common_defects', l: 'نقص‌های پرتکرار', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    referrals: {
      title: 'اعزام و ارجاع بیمار', icon: '🚑',
      sub: 'الف-۴-۳-۴ — نظارت بر روند اعزام، برابر ضوابط و با رعایت ایمنی بیمار',
      formHint: 'هماهنگیِ قبلی با مقصد و همراهِ حین انتقال هر دو اجباری‌اند — این دو دقیقاً همان چیزی است که ارزیاب می‌پرسد.',
      fields: [
        { k: 'referral_date', l: 'تاریخ اعزام *', t: 'date', list: 1 },
        { k: 'patient_reference', l: 'شناسه‌ی بیمار (بدون نام)', t: 'text', list: 1 },
        { k: 'from_ward', l: 'از بخش', t: 'text', list: 1 },
        { k: 'destination', l: 'مقصد *', t: 'text', list: 1 },
        { k: 'reason', l: 'علت اعزام', t: 'select',
          opts: ['نبود تخت ویژه', 'نبود تخصص', 'نبود تجهیزات', 'درخواست بیمار/همراه', 'ادامه‌ی درمان تخصصی', 'سایر'], list: 1, chip: 1 },
        { k: 'prior_coordination', l: 'هماهنگی قبلی با مقصد *', t: 'bool', list: 1 },
        { k: 'escort', l: 'همراه حین انتقال *', t: 'text', list: 1 },
        { k: 'transport_mode', l: 'وسیله‌ی انتقال', t: 'select',
          opts: ['آمبولانس بیمارستان', 'آمبولانس ۱۱۵', 'آمبولانس خصوصی', 'خودروی شخصی'], list: 1 },
        { k: 'safety_checklist_done', l: 'چک‌لیست ایمنی انتقال تکمیل شد', t: 'bool', list: 1 },
        { k: 'patient_condition', l: 'وضعیت بیمار حین اعزام', t: 'area' },
        { k: 'outcome', l: 'پیامد / بازخورد مقصد', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.staffing_rows, 'ردیفِ برآورد نیرو', d.staffing_rows ? '#0b7a3e' : '#c02626', 'staffing')}
        ${c(d.staffing_short, 'بخش/شیفتِ دارای کسری', d.staffing_short ? '#c02626' : '#0b7a3e', 'staffing')}
        ${c(d.care_audits_year, 'پایش مراقبت در ۱۲ ماه', d.care_audits_year ? '#0b7a3e' : '#c02626', 'care_audits')}
        ${c(d.care_audits_open, 'پایشِ بازِ بدون بسته‌شدن', d.care_audits_open ? '#9a6b00' : '#0b7a3e', 'care_audits')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.record_audits_year, 'نظارت بر پرونده در ۱۲ ماه', d.record_audits_year ? '#0b7a3e' : '#c02626', 'record_audits')}
        ${c(d.record_completeness, 'میانگین کامل‌بودن پرونده (٪)',
          d.record_completeness >= 90 ? '#0b7a3e' : (d.record_completeness >= 70 ? '#9a6b00' : '#c02626'), 'record_audits')}
        ${c(d.referrals_year, 'اعزام در ۱۲ ماه گذشته', '#1550b8', 'referrals')}
        ${c(d.referrals_unsafe, 'اعزامِ بدون چک‌لیست ایمنی', d.referrals_unsafe ? '#c02626' : '#0b7a3e', 'referrals')}
      </div>
      ${d.staffing_worst ? `<div style="margin-top:14px" class="sd-note">${typeof ic === 'function' ? ic('alert') : ''}
        <div>بیشترین کسریِ نیرو: <b>${esc(d.staffing_worst)}</b></div></div>` : ''}
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        الف‑۴‑۳‑۵ (تعامل بین بخش‌ها) و الف‑۴‑۳‑۶ (خرد جمعی در دفتر پرستاری) از جنسِ
        صورت‌جلسه‌اند و در ماژول <b>کمیته‌ها و صورت‌جلسات</b> ثبت می‌شوند؛ این‌جا
        دوباره‌سازی نشده‌اند.<br>
        گزارش ۲۴ ساعته و حضورِ شیفتی (الف‑۴‑۳‑۱) صفحه‌ی خودشان را دارند:
        <b>حضور شیفت و گزارش ۲۴ ساعته</b>.
      </div>`;
  },
});

const renderNsupervision = () => RPG.render('nsupervision');
const nsupervisionCanView = () => RPG.canView('nsupervision');
