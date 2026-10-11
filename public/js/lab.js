/* ==========================================================================
 * خدمات آزمایشگاه (محور ب-۸) — فقط «توصیف»، موتورش RPG است.
 * ========================================================================== */

const LAB_SECTIONS = ['بیوشیمی', 'هماتولوژی', 'انعقاد', 'میکروب‌شناسی',
  'ایمونولوژی و سرولوژی', 'هورمون', 'ادرار و مدفوع', 'پاتولوژی'];

RPG.define({
  key: 'lab',
  title: 'خدمات آزمایشگاه',
  sub: 'کنترل نمونه، کنترل کیفیت، مقادیر بحرانی، زمان پاسخ‌دهی و آزمایشگاه ارجاع',
  icon: '🔬',
  perms: ['view_lab', 'manage_lab'],
  tabs: [['dash', 'داشبورد'], ['samples', 'کنترل نمونه'], ['qc', 'کنترل کیفیت'],
    ['critical', 'مقادیر بحرانی'], ['criticalreports', 'گزارش بحرانی'],
    ['reference', 'جدول‌های ابلاغی'], ['tat', 'پایش زمان پاسخ'],
    ['referrals', 'آزمایشگاه ارجاع'], ['supervision', 'ارزیابی مرجع سلامت']],
  fa: {
    qc_kind: { internal: 'کنترل کیفی داخلی', external: 'ارزیابی خارجی کیفیت' },
    qc_result: { pass: 'قابل قبول', fail: 'غیرقابل قبول' },
  },
  spec: {
    samples: {
      title: 'کنترل نمونه‌ی ورودی', icon: '🧾',
      sub: 'ب-۸-۱-۲ دو شناسه و تاریخ/ساعت روی برچسب — ب-۸-۱-۴ معیارهای رد و قبول و پیگیری',
      formHint: 'نمونه‌ی ردشده باید مسئول پیگیری داشته باشد؛ کتاب «هماهنگی بلافاصله با بخش و تجدید نمونه» را الزام کرده، نه فقط ثبت رد.',
      fields: [
        { k: 'check_date', l: 'تاریخ کنترل *', t: 'date', list: 1 },
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'sample_type', l: 'نوع نمونه', t: 'select',
          opts: ['خون', 'ادرار', 'مدفوع', 'کشت/سواب', 'مایعات بدن', 'بافت', 'سایر'], list: 1 },
        { k: 'patient_ref', l: 'شناسه بیمار (بدون نام)', t: 'text' },
        { k: 'two_identifiers', l: 'دو شناسه‌ی منحصربه‌فرد روی برچسب', t: 'bool', def: 1, list: 1 },
        { k: 'collection_time_on_label', l: 'تاریخ و ساعت نمونه‌گیری روی برچسب', t: 'bool', def: 1, list: 1 },
        { k: 'label_complete', l: 'برچسب کامل', t: 'bool', def: 1, list: 1 },
        { k: 'accepted', l: 'پذیرفته شد', t: 'bool', def: 1, list: 1 },
        { k: 'reject_reason', l: 'علت رد', t: 'area' },
        { k: 'ward_notified', l: 'به بخش اطلاع داده شد', t: 'bool', list: 1 },
        { k: 'follow_up_owner', l: 'مسئول پیگیری', t: 'text', list: 1 },
        { k: 'resampled', l: 'نمونه‌ی مجدد گرفته شد', t: 'bool', list: 1 },
        { k: 'resample_date', l: 'تاریخ نمونه‌گیری مجدد', t: 'date' },
        { k: 'sampler_name', l: 'نمونه‌گیر', t: 'text' },
        { k: 'checked_by', l: 'کنترل‌کننده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    qc: {
      title: 'کنترل کیفیت', icon: '🧪',
      sub: 'ب-۸-۲-۳ کنترل کیفی داخلی در هر نوبت کاری — ب-۸-۲-۵ ارزیابی خارجی، سه نوبت در سال',
      formHint: 'نتیجه‌ی غیرقابل‌قبول بدون اقدام اصلاحی ثبت نمی‌شود؛ سابقه باید تا یک سال قابل بازیابی باشد.',
      fields: [
        { k: 'kind', l: 'نوع', t: 'select', opts: ['internal', 'external'], fa: 'qc_kind', list: 1, chip: 1 },
        { k: 'qc_date', l: 'تاریخ *', t: 'date', list: 1 },
        { k: 'shift', l: 'نوبت کاری', t: 'select', opts: ['صبح', 'عصر', 'شب'], list: 1 },
        { k: 'lab_section', l: 'بخش آزمایشگاه', t: 'select', opts: LAB_SECTIONS, list: 1 },
        { k: 'test_name', l: 'آزمایش *', t: 'text', list: 1 },
        { k: 'control_level', l: 'سطح نمونه‌ی کنترل', t: 'select', opts: ['', 'نرمال', 'پاتولوژیک', 'دو سطحی'], list: 1 },
        { k: 'lot_no', l: 'شماره سری ساخت (Lot)', t: 'text' },
        { k: 'result', l: 'نتیجه', t: 'select', opts: ['pass', 'fail'], fa: 'qc_result', list: 1, chip: 1 },
        { k: 'provider', l: 'برگزارکننده (ارزیابی خارجی)', t: 'text', list: 1 },
        { k: 'round_no', l: 'شماره نوبت/دوره', t: 'text' },
        { k: 'interpretation', l: 'تفسیر نتیجه', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی (در صورت مردودی)', t: 'area' },
        { k: 'performed_by', l: 'انجام‌دهنده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    critical: {
      title: 'دامنه‌ی مقادیر بحرانی', icon: '🚨',
      sub: 'ب-۸-۳-۱ — به تفکیک گروه بیمار (نوزاد، دیالیزی، …) و در معرض دید کارکنان',
      formHint: 'دست‌کم یکی از دو کران لازم است؛ ردیفی بدون کران هیچ نتیجه‌ای را بحرانی نمی‌کند.',
      fields: [
        { k: 'test_name', l: 'آزمایش *', t: 'text', list: 1 },
        { k: 'patient_group', l: 'گروه بیمار', t: 'select',
          opts: ['بزرگسال', 'نوزاد', 'کودک', 'بیمار دیالیزی', 'باردار'], list: 1 },
        { k: 'low_value', l: 'کران پایین', t: 'text', list: 1 },
        { k: 'high_value', l: 'کران بالا', t: 'text', list: 1 },
        { k: 'unit', l: 'واحد', t: 'text', list: 1 },
        { k: 'posted_visible', l: 'در معرض دید کارکنان نصب شده', t: 'bool', list: 1 },
        { k: 'approved_by', l: 'تأییدکننده', t: 'text', list: 1 },
        { k: 'approved_date', l: 'تاریخ تأیید', t: 'date' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    criticalreports: {
      title: 'گزارش آنی نتایج بحرانی', icon: '📞',
      sub: 'ب-۸-۳-۲ — اعلام آنی با Repeat Back، و کنترل مجدد نتیجه پس از اعلام',
      formHint: 'فاصله‌ی «آماده‌شدن نتیجه» تا «اعلام به بخش» در سرور از دو ساعت حساب می‌شود؛ «آنی بودن» با تیک اثبات نمی‌شود.',
      fields: [
        { k: 'report_date', l: 'تاریخ *', t: 'date', list: 1 },
        { k: 'test_name', l: 'آزمایش *', t: 'text', list: 1 },
        { k: 'result_value', l: 'مقدار نتیجه', t: 'text', list: 1 },
        { k: 'ward', l: 'بخش *', t: 'text', list: 1 },
        { k: 'patient_ref', l: 'شناسه بیمار (بدون نام)', t: 'text' },
        { k: 'result_time', l: 'ساعت آماده‌شدن نتیجه * (HH:MM)', t: 'text' },
        { k: 'reported_time', l: 'ساعت اعلام به بخش * (HH:MM)', t: 'text' },
        { k: 'minutes_to_report', l: 'فاصله (دقیقه)', t: 'num', computed: 1, list: 1,
          render: (r) => {
            const m = r.minutes_to_report;
            if (m == null) return '—';
            const c = m <= 15 ? '#0b7a3e' : (m <= 30 ? '#9a6b00' : '#c02626');
            return `<b style="color:${c}">${fa(m)}</b>`;
          } },
        { k: 'receiver_name', l: 'گیرنده در بخش *', t: 'text', list: 1 },
        { k: 'read_back_done', l: 'بازخوانی توسط گیرنده (Repeat Back) *', t: 'bool', list: 1 },
        { k: 'repeat_test_done', l: 'آزمایش تکرار شد', t: 'bool', list: 1 },
        { k: 'repeat_result', l: 'نتیجه‌ی تکرار', t: 'text' },
        { k: 'reported_by', l: 'اعلام‌کننده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    reference: {
      title: 'جدول‌های ابلاغی به بخش‌ها', icon: '📋',
      sub: 'ب-۸-۲-۴ مدت پایداری نمونه — ب-۸-۳-۳ زمان پاسخ‌دهی روتین و اورژانس',
      formHint: 'هر دو سنجه «اطلاع‌رسانی به بخش‌های بستری و اورژانس» را جزء الزام آورده‌اند؛ جدولی که ابلاغ نشده، برای بخش وجود ندارد.',
      fields: [
        { k: 'kind', l: 'نوع جدول', t: 'select', opts: ['زمان پاسخ‌دهی', 'پایداری نمونه'], list: 1, chip: 1 },
        { k: 'item_name', l: 'آزمایش / نوع نمونه *', t: 'text', list: 1 },
        { k: 'category', l: 'دسته (برای زمان پاسخ‌دهی)', t: 'select', opts: ['', 'روتین', 'اورژانس'], list: 1 },
        { k: 'limit_minutes', l: 'سقف زمانی (دقیقه) *', t: 'num', list: 1 },
        { k: 'storage_condition', l: 'شرایط نگهداری (برای پایداری)', t: 'text', list: 1 },
        { k: 'announced_to_wards', l: 'به بخش‌ها ابلاغ شد', t: 'bool', list: 1 },
        { k: 'announced_date', l: 'تاریخ ابلاغ', t: 'date' },
        { k: 'approved_by', l: 'تأییدکننده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    tat: {
      title: 'پایش زمان پاسخ‌دهی', icon: '⏱',
      sub: 'ب-۸-۳-۵ — اندازه‌گیری دوره‌ای شاخص کیفیت توسط مسئول فنی',
      formHint: 'درصد رعایت از «در مهلت ÷ بررسی‌شده» در سرور حساب می‌شود؛ زیر ۹۰٪ بدون اقدام اصلاحی ثبت نمی‌شود.',
      fields: [
        { k: 'audit_date', l: 'تاریخ پایش *', t: 'date', list: 1 },
        { k: 'category', l: 'دسته', t: 'select', opts: ['روتین', 'اورژانس'], list: 1, chip: 1 },
        { k: 'lab_section', l: 'بخش آزمایشگاه', t: 'select', opts: [''].concat(LAB_SECTIONS), list: 1 },
        { k: 'samples_checked', l: 'نمونه‌های بررسی‌شده *', t: 'num', list: 1 },
        { k: 'within_target', l: 'در مهلت *', t: 'num', list: 1 },
        { k: 'compliance_pct', l: 'درصد رعایت', t: 'num', computed: 1, list: 1,
          render: (r) => `<b style="color:${r.compliance_pct >= 90 ? '#0b7a3e' : (r.compliance_pct >= 75 ? '#9a6b00' : '#c02626')}">${fa(r.compliance_pct == null ? '—' : r.compliance_pct)}٪</b>` },
        { k: 'auditor', l: 'پایشگر', t: 'text' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    referrals: {
      title: 'آزمایشگاه طرف قرارداد (ارجاع)', icon: '🤝',
      sub: 'ب-۸-۲-۶ — قرارداد مکتوب و ارزیابی صلاحیت دوره‌ای با نگهداری سوابق',
      formHint: 'ارزیابی صلاحیت بدون تاریخ و نتیجه، سابقه نیست.',
      fields: [
        { k: 'lab_name', l: 'نام آزمایشگاه *', t: 'text', list: 1 },
        { k: 'contract_no', l: 'شماره قرارداد *', t: 'text', list: 1 },
        { k: 'contract_date', l: 'تاریخ عقد', t: 'date', list: 1 },
        { k: 'contract_expiry', l: 'تاریخ اعتبار', t: 'date', list: 1,
          render: (r) => {
            const today = new Date().toISOString().slice(0, 10);
            const bad = r.is_active && r.contract_expiry && r.contract_expiry < today;
            const t = faDateISO(r.contract_expiry);
            return bad ? `<b style="color:#c02626">${t}</b>` : t;
          } },
        { k: 'scope', l: 'دامنه‌ی آزمایش‌های ارجاعی', t: 'area' },
        { k: 'turnaround_agreed', l: 'زمان چرخه‌ی کاری توافق‌شده', t: 'text' },
        { k: 'packaging_standard', l: 'بسته‌بندی سه‌لایه‌ی استاندارد', t: 'bool', list: 1 },
        { k: 'competency_assessed', l: 'ارزیابی صلاحیت انجام شد', t: 'bool', list: 1 },
        { k: 'assessment_date', l: 'تاریخ ارزیابی صلاحیت', t: 'date' },
        { k: 'assessment_result', l: 'نتیجه‌ی ارزیابی صلاحیت', t: 'area' },
        { k: 'is_active', l: 'فعال', t: 'bool', def: 1, list: 1 },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    supervision: {
      title: 'ارزیابی آزمایشگاه مرجع سلامت', icon: '🎖',
      sub: 'ب-۸-۲-۱ — کسب امتیاز قابل قبول از چک‌لیست ابلاغی',
      formHint: 'حد نصاب را آزمایشگاه مرجع سلامت ابلاغ می‌کند و ثابت نیست؛ «قبولی» را سرور از مقایسه‌ی امتیاز با همان حد نصاب تعیین می‌کند.',
      fields: [
        { k: 'visit_date', l: 'تاریخ بازدید *', t: 'date', list: 1 },
        { k: 'assessor', l: 'ارزیاب', t: 'text', list: 1 },
        { k: 'score', l: 'امتیاز کسب‌شده *', t: 'num', list: 1 },
        { k: 'max_score', l: 'امتیاز کل', t: 'num', list: 1 },
        { k: 'min_required', l: 'حد نصاب ابلاغی *', t: 'num', list: 1 },
        { k: 'passed', l: 'قبول', t: 'bool', computed: 1, list: 1,
          render: (r) => r.passed ? '<span style="color:#0b7a3e">قبول</span>' : '<b style="color:#c02626">کمتر از حد نصاب</b>' },
        { k: 'findings', l: 'یافته‌ها', t: 'area' },
        { k: 'action_plan', l: 'برنامه‌ی اقدام اصلاحی', t: 'area' },
        { k: 'action_due', l: 'مهلت اقدام', t: 'date' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    const sup = d.supervision_last;
    const tat = d.tat_pct;
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.eqa_12m, 'ارزیابی خارجی کیفیت (۱۲ ماه — نیاز ۳)',
          d.eqa_12m >= 3 ? '#0b7a3e' : (d.eqa_12m ? '#9a6b00' : '#c02626'), 'qc')}
        ${c(d.qc_failed_90d, 'کنترل کیفی مردود (۹۰ روز)', d.qc_failed_90d ? '#c02626' : '#0b7a3e', 'qc')}
        ${c(d.qc_internal_30d, 'کنترل کیفی داخلی (۳۰ روز)', d.qc_internal_30d ? '#1550b8' : '#c02626', 'qc')}
        ${c(d.samples_rejected_open, 'نمونه‌ی ردشده بدون نمونه‌ی مجدد', d.samples_rejected_open ? '#c02626' : '#0b7a3e', 'samples')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.critical_values, 'دامنه‌ی بحرانی تعریف‌شده', d.critical_values ? '#0b7a3e' : '#c02626', 'critical')}
        ${c(d.critical_not_posted, 'دامنه‌ی نصب‌نشده در معرض دید', d.critical_not_posted ? '#9a6b00' : '#0b7a3e', 'critical')}
        ${c(d.critical_avg_minutes == null ? '—' : d.critical_avg_minutes, 'میانگین فاصله تا اعلام (دقیقه، ۹۰ روز)',
          d.critical_avg_minutes == null ? '#6b7280' : (d.critical_avg_minutes <= 15 ? '#0b7a3e' : (d.critical_avg_minutes <= 30 ? '#9a6b00' : '#c02626')), 'criticalreports')}
        ${c(d.critical_no_repeat, 'گزارش بحرانی بدون تکرار آزمایش', d.critical_no_repeat ? '#c02626' : '#0b7a3e', 'criticalreports')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(tat == null ? '—' : tat, 'رعایت زمان پاسخ‌دهی (۹۰ روز، ٪)',
          tat == null ? '#6b7280' : (tat >= 90 ? '#0b7a3e' : (tat >= 75 ? '#9a6b00' : '#c02626')), 'tat')}
        ${c(d.reference_unannounced, 'جدول ابلاغ‌نشده به بخش‌ها', d.reference_unannounced ? '#c02626' : '#0b7a3e', 'reference')}
        ${c(d.referrals_expired, 'قرارداد ارجاع منقضی', d.referrals_expired ? '#c02626' : '#0b7a3e', 'referrals')}
        ${c(d.referrals_unassessed, 'ارجاع بدون ارزیابی صلاحیت', d.referrals_unassessed ? '#c02626' : '#0b7a3e', 'referrals')}
      </div>
      ${sup ? `<div class="g" style="margin-top:16px;padding:12px 14px">
        <b>آخرین ارزیابی آزمایشگاه مرجع سلامت</b> —
        ${faDateISO(sup.visit_date)} · امتیاز ${fa(sup.score)} از حد نصاب ${fa(sup.min_required)} ·
        <b style="color:${sup.passed ? '#0b7a3e' : '#c02626'}">${sup.passed ? 'قبول' : 'کمتر از حد نصاب'}</b>
      </div>` : `<div style="margin-top:16px;color:#c02626;font-size:13px">
        هنوز هیچ ارزیابیِ آزمایشگاه مرجع سلامت ثبت نشده است (ب-۸-۲-۱).</div>`}
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        «فاصله تا اعلامِ نتیجه‌ی بحرانی»، «درصد رعایت زمان پاسخ‌دهی» و «قبولی در ارزیابی مرجع سلامت»
        هر سه در سرور از داده حساب می‌شوند، نه از تیکِ کاربر. راهنمای آمادگی بیمار و دستورالعمل انجام
        آزمایش‌ها (ب-۸-۱-۱ و ب-۸-۲-۲) سندِ مکتوب‌اند و جای‌شان ماژول «اسناد کنترل‌شده» است؛ چاپ خودکار
        برچسب و ابزار خون‌گیری خلأ (ب-۸-۱-۵ و ب-۸-۱-۶) وضعیتِ تجهیزاتی‌اند و در «اقلام و نگهداشت» ثبت می‌شوند.
      </div>`;
  },
});

const renderLab = () => RPG.render('lab');
const labCanView = () => RPG.canView('lab');
