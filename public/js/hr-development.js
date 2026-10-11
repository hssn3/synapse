/* ==========================================================================
 * ارزیابی و توسعه‌ی کارکنان — الف‑۳‑۱، الف‑۳‑۲‑۳، الف‑۳‑۳، الف‑۳‑۴‑۲،
 * و الف‑۴‑۱‑۱/۲/۳. فقط «توصیف»، موتورش RPG است.
 * بک‌اند: src/routes/api.js بخش HRDev.
 * ========================================================================== */

// شرح‌شغل‌ها و مهارت‌ها برای کشویی‌ها — همان الگوی دستگاه‌ها در infection.js
const HRS = { profiles: [], competencies: [], appraisals: [], surveyCompliance: '' };

// الف‑۳‑۴‑۴ دو قید دارد و قیدِ دوم («با فاصله شش ماه») را نمی‌شود با شمردنِ
// رکورد نشان داد: دو نظرسنجی در یک ماه هم «دو تا»ست ولی سنجه را برآورده
// نمی‌کند. پس فاصله را سرور حساب می‌کند و این‌جا فقط سال‌به‌سال نشان داده
// می‌شود — همان چیزی که ارزیاب روی برگه می‌بیند.
const hrdSurveyComplianceHtml = (rows) => {
  if (!rows || !rows.length) return '';
  return `<div style="margin-top:14px">
    <div style="font-weight:700;margin-bottom:6px">رعایتِ قید «دو نوبت در سال با فاصله‌ی شش ماه»</div>
    ${rows.map(r => `<div style="display:flex;align-items:center;gap:10px;margin:4px 0;font-size:13px">
        <b style="min-width:52px">${fa(r.year)}</b>
        <span style="min-width:96px">${fa(r.rounds)} نوبت</span>
        <span style="min-width:130px;color:var(--mut)">بیشترین فاصله: ${fa(r.max_gap_days)} روز</span>
        <b style="color:${r.compliant ? '#0b7a3e' : '#c02626'}">${r.compliant ? '✔ برآورده شد' : '✘ برآورده نشد'}</b>
      </div>`).join('')}
  </div>`;
};

RPG.define({
  key: 'hrdev',
  title: 'ارزیابی و توسعه‌ی کارکنان',
  sub: 'شرح شغل و شرایط احراز، صلاحیت، ارزشیابی سالیانه، جانشین‌پروری و دفتر مرخصی',
  icon: '🎓',
  perms: ['view_hrdev', 'manage_hrdev'],
  tabs: [['dash', 'داشبورد'], ['profiles', 'شرح شغل'], ['hiring', 'احراز بدو بکارگیری'],
    ['competencies', 'فهرست صلاحیت‌ها'], ['records', 'احراز صلاحیت افراد'],
    ['appraisals', 'ارزشیابی سالیانه'], ['disciplinary', 'اقدام انضباطی'],
    ['exemplary', 'کارکنان نمونه'], ['succession', 'جانشین‌پروری'], ['leaves', 'دفتر مرخصی'],
    ['surveys', 'نظرسنجی کارکنان']],
  fa: {},
  spec: {
    profiles: {
      title: 'شرح شغل و شرایط احراز', icon: '📄',
      sub: 'الف-۳-۱-۱ و الف-۳-۱-۲ — بکارگیری بر اساس شرح شغل، و توانمندی عمومی و اختصاصی هر شغل',
      formHint: 'این سندِ مرجع است: یک ردیف برای هر شغل، نه برای هر نفر. احراز بدو بکارگیری به همین ردیف ارجاع می‌دهد.',
      fields: [
        { k: 'title', l: 'عنوان شغل *', t: 'text', list: 1 },
        { k: 'job_group', l: 'گروه شغلی', t: 'text', list: 1 },
        { k: 'unit', l: 'واحد', t: 'text', list: 1 },
        { k: 'education_required', l: 'حداقل مدرک تحصیلی *', t: 'text', list: 1 },
        { k: 'experience_required', l: 'حداقل سابقه', t: 'text', list: 1 },
        { k: 'license_required', l: 'پروانه/گواهی لازم', t: 'text' },
        { k: 'doc_code', l: 'کد سند', t: 'text', list: 1 },
        { k: 'approved_date', l: 'تاریخ ابلاغ', t: 'date' },
        { k: 'is_active', l: 'فعال', t: 'bool', list: 1 },
        { k: 'summary', l: 'خلاصه‌ی نقش', t: 'area' },
        { k: 'duties', l: 'شرح وظایف', t: 'area' },
        { k: 'general_competencies', l: 'توانمندی‌های عمومی *', t: 'area' },
        { k: 'specific_competencies', l: 'توانمندی‌های اختصاصی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    hiring: {
      title: 'احراز شرایط در بدو بکارگیری', icon: '✅',
      sub: 'الف-۳-۱-۱ و الف-۳-۱-۳ — احراز شرایط و مهارت ارتباطی، پیش از بکارگیری',
      formHint: 'برای اعلامِ «واجد شرایط»، تیکِ مهارت ارتباطی الزامی است — الف-۳-۱-۳ آن را «پیش از بکارگیری» خواسته.',
      fields: [
        { k: 'person_name', l: 'نام و نام‌خانوادگی *', t: 'text', list: 1 },
        { k: 'personnel_code', l: 'کد پرسنلی', t: 'text', list: 1 },
        { k: 'job_profile_id', l: 'شغل (از شرح شغل) *', t: 'select',
          opts: () => HRS.profiles.map(p => [p.id, p.title + (p.unit ? ' — ' + p.unit : '')]),
          list: 1, render: (r) => {
            const p = HRS.profiles.find(x => x.id === r.job_profile_id);
            return p ? esc(p.title) : '<span style="color:var(--td)">—</span>';
          } },
        { k: 'unit', l: 'واحد', t: 'text', list: 1 },
        { k: 'hire_date', l: 'تاریخ بکارگیری', t: 'date', list: 1 },
        { k: 'education_ok', l: 'مدرک تحصیلی احراز شد', t: 'bool' },
        { k: 'experience_ok', l: 'سابقه احراز شد', t: 'bool' },
        { k: 'license_ok', l: 'پروانه/گواهی احراز شد', t: 'bool' },
        { k: 'communication_skill_ok', l: 'مهارت ارتباطی احراز شد (الف-۳-۱-۳)', t: 'bool', list: 1 },
        { k: 'orientation_done', l: 'توجیه بدو ورود انجام شد', t: 'bool' },
        { k: 'verdict', l: 'نتیجه', t: 'select',
          opts: ['در_بررسی', 'واجد شرایط', 'واجد شرایط با ملاحظه', 'فاقد شرایط'], list: 1, chip: 1 },
        { k: 'checked_by', l: 'بررسی‌کننده', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    competencies: {
      title: 'فهرست مهارت‌ها و صلاحیت‌های سازمان', icon: '📋',
      sub: 'الف-۴-۱-۱/۲/۳ — مهارت‌های عمومی بالینی، تخصصی بخش، و ارتباطی',
      formHint: 'این فهرستِ سازمان است. احرازِ هر نفر در تبِ بعدی ثبت می‌شود، تا افزودنِ یک مهارت تازه رکوردِ همه‌ی پرسنل را دست‌کاری نکند.',
      fields: [
        { k: 'title', l: 'عنوان مهارت *', t: 'text', list: 1 },
        { k: 'kind', l: 'نوع', t: 'select', opts: ['عمومی بالینی', 'تخصصی بخش', 'ارتباطی'], list: 1, chip: 1 },
        { k: 'job_group', l: 'گروه شغلی هدف', t: 'text', list: 1 },
        { k: 'unit', l: 'بخش/واحد', t: 'text', list: 1 },
        { k: 'valid_months', l: 'اعتبار (ماه)', t: 'num', def: 12, list: 1 },
        { k: 'is_active', l: 'فعال', t: 'bool', list: 1 },
        { k: 'method', l: 'روش ارزیابی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    records: {
      title: 'احراز صلاحیت افراد', icon: '🎯',
      sub: 'الف-۴-۱-۱/۲/۳ و الف-۳-۳-۳ — احراز با تاریخ انقضا',
      formHint: 'تاریخ انقضا اگر خالی بماند، از دوره‌ی اعتبارِ همان مهارت خودکار حساب می‌شود. احرازِ پنج‌سال‌پیش، احراز نیست.',
      fields: [
        { k: 'competency_id', l: 'مهارت *', t: 'select',
          opts: () => HRS.competencies.map(c => [c.id, `${c.kind} — ${c.title}`]),
          list: 1, render: (r) => {
            const c = HRS.competencies.find(x => x.id === r.competency_id);
            return c ? esc(c.title) : '<span style="color:var(--td)">—</span>';
          } },
        { k: 'person_name', l: 'نام و نام‌خانوادگی *', t: 'text', list: 1 },
        { k: 'personnel_code', l: 'کد پرسنلی', t: 'text', list: 1 },
        { k: 'unit', l: 'بخش/واحد', t: 'text', list: 1 },
        { k: 'assessed_date', l: 'تاریخ ارزیابی *', t: 'date', list: 1 },
        { k: 'expires_on', l: 'انقضا', t: 'date', list: 1,
          render: (r) => {
            if (!r.expires_on) return '<span style="color:var(--td)">—</span>';
            const late = new Date(r.expires_on) < new Date();
            return `<span style="color:${late ? '#c02626' : 'inherit'};font-weight:${late ? 700 : 400}">${faDateISO(r.expires_on)}</span>`;
          } },
        { k: 'result', l: 'نتیجه', t: 'select', opts: ['احراز شد', 'نیازمند آموزش', 'احراز نشد'], list: 1, chip: 1 },
        { k: 'assessor', l: 'ارزیاب', t: 'text' },
        { k: 'gap_action', l: 'اقدام جبرانی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    appraisals: {
      title: 'ارزشیابی سالیانه', icon: '⭐',
      sub: 'الف-۳-۳-۲ و الف-۳-۳-۳ — نتیجه باید در برنامه‌ی آموزشی و ارتقا استفاده شود',
      formHint: '«خروجی آموزشی» اجباری است: سنجه بندِ دومی دارد که استفاده از نتیجه را می‌خواهد، نه صرفِ ثبت نمره.',
      fields: [
        { k: 'person_name', l: 'نام و نام‌خانوادگی *', t: 'text', list: 1 },
        { k: 'personnel_code', l: 'کد پرسنلی', t: 'text', list: 1 },
        { k: 'unit', l: 'بخش/واحد', t: 'text', list: 1 },
        { k: 'jalali_year', l: 'سال (شمسی) *', t: 'num', list: 1 },
        { k: 'appraised_date', l: 'تاریخ ارزشیابی', t: 'date', list: 1 },
        { k: 'score', l: 'نمره', t: 'num', step: '0.1', list: 1 },
        { k: 'grade', l: 'رتبه', t: 'select', opts: ['عالی', 'خوب', 'قابل قبول', 'نیازمند بهبود'], list: 1, chip: 1 },
        { k: 'appraiser', l: 'ارزشیاب', t: 'text' },
        { k: 'strengths', l: 'نقاط قوت', t: 'area' },
        { k: 'improvement_areas', l: 'زمینه‌های بهبود', t: 'area' },
        { k: 'training_outcome', l: 'خروجی آموزشی (چه آموزشی لازم شد) *', t: 'area' },
        { k: 'promotion_outcome', l: 'خروجی ارتقا شغلی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    disciplinary: {
      title: 'کنترل‌های انضباطی', icon: '⚖',
      sub: 'الف-۳-۳-۱ — بر اساس ارزیابی مستمر و با رعایت قوانین مرتبط',
      formHint: 'ارجاع به ارزشیابی، همان «بر اساس ارزیابی مستمر» را اثبات می‌کند. اقدام سنگین بدون مستند قانونی ذخیره نمی‌شود.',
      fields: [
        { k: 'person_name', l: 'نام و نام‌خانوادگی *', t: 'text', list: 1 },
        { k: 'personnel_code', l: 'کد پرسنلی', t: 'text', list: 1 },
        { k: 'unit', l: 'بخش/واحد', t: 'text', list: 1 },
        { k: 'action_date', l: 'تاریخ اقدام', t: 'date', list: 1 },
        { k: 'action_type', l: 'نوع اقدام', t: 'select',
          opts: ['تذکر شفاهی', 'تذکر کتبی', 'اخطار کتبی', 'کسر مزایا', 'ارجاع به کمیته انضباطی'], list: 1, chip: 1 },
        { k: 'based_on_appraisal_id', l: 'بر اساس کدام ارزشیابی', t: 'select',
          opts: () => [['', '—']].concat(HRS.appraisals.map(a => [a.id, `${a.person_name} — ${fa(a.jalali_year || '')}`])) },
        { k: 'legal_reference', l: 'مستند قانونی', t: 'text', list: 1 },
        { k: 'person_notified', l: 'به فرد ابلاغ شد', t: 'bool', list: 1 },
        { k: 'reason', l: 'علت اقدام *', t: 'area' },
        { k: 'follow_up', l: 'پیگیری', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    exemplary: {
      title: 'کارکنان نمونه', icon: '🏅',
      sub: 'الف-۳-۳-۴ — شناسایی بر اساس عوامل کلیدیِ معین، و تشویق',
      formHint: 'معیار انتخاب اجباری است: انتخابِ بی‌معیار همان چیزی است که ارزیاب رد می‌کند.',
      fields: [
        { k: 'person_name', l: 'نام و نام‌خانوادگی *', t: 'text', list: 1 },
        { k: 'personnel_code', l: 'کد پرسنلی', t: 'text', list: 1 },
        { k: 'unit', l: 'بخش/واحد', t: 'text', list: 1 },
        { k: 'period', l: 'دوره (مثلاً بهار ۱۴۰۵)', t: 'text', list: 1 },
        { k: 'selected_date', l: 'تاریخ انتخاب', t: 'date', list: 1 },
        { k: 'reward_type', l: 'نوع تشویق', t: 'select',
          opts: ['لوح تقدیر', 'پاداش نقدی', 'مرخصی تشویقی', 'معرفی در تابلوی افتخارات', 'سایر'], list: 1 },
        { k: 'announced', l: 'اعلام عمومی شد', t: 'bool', list: 1 },
        { k: 'criteria', l: 'معیار انتخاب *', t: 'area' },
        { k: 'achievement', l: 'دستاورد', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    succession: {
      title: 'جانشین‌پروری و انتقال تجربه', icon: '🔗',
      sub: 'الف-۳-۲-۳ — برنامه‌ریزی جانشینی و انتقال تجربیات بین کارکنان',
      formHint: 'سمتی که «جانشین ندارد» ثبت شود، خودش یک یافته‌ی قابل‌دفاع است — پنهان‌کردنش کمکی نمی‌کند.',
      fields: [
        { k: 'position_title', l: 'سمت کلیدی *', t: 'text', list: 1 },
        { k: 'incumbent', l: 'متصدی فعلی', t: 'text', list: 1 },
        { k: 'successor1', l: 'جانشین اول', t: 'text', list: 1 },
        { k: 'successor2', l: 'جانشین دوم', t: 'text', list: 1 },
        { k: 'readiness', l: 'وضعیت آمادگی', t: 'select',
          opts: ['در حال آماده‌سازی', 'آماده در کوتاه‌مدت', 'آماده', 'جانشین ندارد'], list: 1, chip: 1 },
        { k: 'target_date', l: 'افق زمانی', t: 'date', list: 1 },
        { k: 'development_plan', l: 'برنامه‌ی توسعه', t: 'area' },
        { k: 'knowledge_transfer', l: 'روش انتقال تجربه', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    leaves: {
      title: 'دفتر مرخصی منابع انسانی', icon: '🗓',
      sub: 'الف-۳-۴-۲ — نگهداری اطلاعات مرخصی به تفکیک بخش‌ها در واحد منابع انسانی',
      formHint: 'این دفترِ سراسری منابع انسانی است؛ درخواست مرخصیِ پرستاری جای خودش در داشبورد سرپرستار می‌ماند. «بخش» اجباری است چون سنجه «به تفکیک بخش‌ها» را صریح گفته.',
      fields: [
        { k: 'person_name', l: 'نام و نام‌خانوادگی *', t: 'text', list: 1 },
        { k: 'personnel_code', l: 'کد پرسنلی', t: 'text', list: 1 },
        { k: 'unit', l: 'بخش/واحد *', t: 'text', list: 1 },
        { k: 'leave_type', l: 'نوع مرخصی', t: 'select',
          opts: ['استحقاقی', 'استعلاجی', 'بدون حقوق', 'زایمان', 'تشویقی', 'ساعتی'], list: 1, chip: 1 },
        { k: 'start_date', l: 'از تاریخ *', t: 'date', list: 1 },
        { k: 'end_date', l: 'تا تاریخ *', t: 'date', list: 1 },
        { k: 'days', l: 'تعداد روز', t: 'num', computed: 1, list: 1 },
        { k: 'approved_by', l: 'تأییدکننده', t: 'text' },
        { k: 'replacement', l: 'جانشین در غیاب', t: 'text' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    surveys: {
      title: 'نظرسنجی رضایت کارکنان', icon: '💬',
      sub: 'الف-۳-۴-۴ و الف-۳-۴-۵ — حداقل دو نوبت در سال با فاصله‌ی شش ماه، و توصیه‌ی اشتغال',
      formHint: 'در متنِ کتاب واژه‌ی «رضایت» بر اثر خطای اسکن «رعایت» تایپ شده؛ شرحِ خودِ سنجه بی‌ابهام نشان می‌دهد منظور رضایت است. سنجه پرسشنامه‌ی «پایا و روا» خواسته، پس تأیید پایایی و روایی اجباری است. رعایت‌شدنِ قیدِ «دو نوبت با فاصله‌ی شش ماه» را کارتِ داشبورد به تفکیک سال نشان می‌دهد.',
      fields: [
        { k: 'year', l: 'سال *', t: 'text', list: 1 },
        { k: 'round', l: 'نوبت', t: 'select', list: 1, chip: 1,
          opts: ['نوبت اول', 'نوبت دوم', 'نوبت فوق‌العاده'] },
        { k: 'survey_date', l: 'تاریخ نظرسنجی *', t: 'date', list: 1 },
        { k: 'instrument', l: 'پرسشنامه', t: 'text' },
        { k: 'validity_checked', l: 'پایایی و روایی تأیید شد *', t: 'bool', list: 1 },
        { k: 'invited_count', l: 'جامعه‌ی هدف', t: 'num' },
        { k: 'participants_count', l: 'پاسخ‌دهنده', t: 'num', list: 1 },
        { k: 'response_rate', l: 'نرخ پاسخ', t: 'num', computed: 1, list: 1,
          render: (r) => r.response_rate == null ? '<span style="color:var(--td)">—</span>' : `${fa(r.response_rate)}٪` },
        { k: 'satisfaction_score', l: 'امتیاز رضایت *', t: 'num', step: '0.1', list: 1 },
        { k: 'recommend_score', l: 'توصیه‌ی اشتغال به دیگران *', t: 'num', step: '0.1', list: 1 },
        { k: 'prev_satisfaction_score', l: 'امتیاز دوره‌ی قبل', t: 'num', step: '0.1' },
        { k: 'trend', l: 'روند', t: 'num', computed: 1, list: 1,
          render: (r) => {
            if (r.trend == null) return '<span style="color:var(--td)">—</span>';
            const t = Number(r.trend);
            const clr = t > 0 ? '#0b7a3e' : (t < 0 ? '#c02626' : 'inherit');
            return `<b style="color:${clr}">${t > 0 ? '▲ +' : (t < 0 ? '▼ ' : '')}${fa(Math.abs(t))}</b>`;
          } },
        { k: 'action_owner', l: 'مسئول اقدام', t: 'text' },
        { k: 'top_issues', l: 'مهم‌ترین مشکلات مطرح‌شده', t: 'area' },
        { k: 'corrective_action', l: 'اقدام اصلاحی / برنامه بهبود', t: 'area' },
        { k: 'followup_result', l: 'نتیجه‌ی پیگیری', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.profiles, 'شرح شغل تعریف‌شده', d.profiles ? '#0b7a3e' : '#c02626', 'profiles')}
        ${c(d.hiring_pending, 'احرازِ بدو بکارگیریِ ناتمام', d.hiring_pending ? '#9a6b00' : '#0b7a3e', 'hiring')}
        ${c(d.hiring_year, 'بکارگیری در ۱۲ ماه گذشته', '#1550b8', 'hiring')}
        ${c(d.competencies, 'مهارتِ تعریف‌شده', d.competencies ? '#0b7a3e' : '#c02626', 'competencies')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.competency_expired, 'احرازِ منقضی‌شده', d.competency_expired ? '#c02626' : '#0b7a3e', 'records')}
        ${c(d.competency_failed, 'صلاحیتِ احرازنشده', d.competency_failed ? '#9a6b00' : '#0b7a3e', 'records')}
        ${c(d.appraisals_year, 'ارزشیابی در ۱۲ ماه گذشته', d.appraisals_year ? '#0b7a3e' : '#c02626', 'appraisals')}
        ${c(d.appraisals_low, 'رتبه‌ی «نیازمند بهبود»', d.appraisals_low ? '#9a6b00' : '#0b7a3e', 'appraisals')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.disciplinary_year, 'اقدام انضباطی در ۱۲ ماه', '#1550b8', 'disciplinary')}
        ${c(d.exemplary_year, 'کارمند نمونه در ۱۲ ماه', d.exemplary_year ? '#0b7a3e' : '#9a6b00', 'exemplary')}
        ${c(d.succession_gaps, 'سمتِ بدون جانشین', d.succession_gaps ? '#c02626' : '#0b7a3e', 'succession')}
        ${c(d.leaves_month, 'مرخصی در ۳۰ روز گذشته', '#1550b8', 'leaves')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        ${c(d.surveys_total, 'نظرسنجیِ کارکنان', d.surveys_total ? '#0b7a3e' : '#c02626', 'surveys')}
        ${c(d.survey_years_short, 'سالِ با کمتر از دو نوبت', d.survey_years_short ? '#c02626' : '#0b7a3e', 'surveys')}
        ${c(d.surveys_no_action, 'مشکلِ ثبت‌شده بدون اقدام', d.surveys_no_action ? '#c02626' : '#0b7a3e', 'surveys')}
        ${c(d.survey_last_recommend == null ? '—' : fa(d.survey_last_recommend),
    'آخرین امتیازِ توصیه‌ی اشتغال', d.survey_last_recommend == null ? '#9a6b00' : '#1550b8', 'surveys')}
      </div>
      ${HRS.surveyCompliance}
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        «صفرِ کارمند نمونه» در ۱۲ ماه گذشته یعنی الف‑۳‑۳‑۴ بی‌مدرک است، نه اینکه کارمند
        نمونه‌ای نبوده.<br>
        نیازسنجی و برگزاریِ خودِ دوره‌های آموزشی در ماژول <b>نیازسنجی آموزشی</b> است و
        این‌جا دوباره‌سازی نشده؛ این‌جا فقط <em>نتیجه‌ی</em> ارزشیابی و صلاحیت ثبت می‌شود.<br>
        سوابقِ حوادث شغلی که الف‑۳‑۴‑۲ کنارِ مرخصی خواسته، در ماژول
        <b>سلامت حرفه‌ای</b> ثبت می‌شود.
      </div>`;
  },
  onGo() { RPG.__hrdLoadRefs(); },
});

RPG.__hrdLoadRefs = async function () {
  // مجوز پیش از درخواست — همان دلیلِ vendors.js
  if (!RPG.canView('hrdev')) return;
  try {
    const [p, c, a, s] = await Promise.all([
      API.get('/hrdev/profiles'), API.get('/hrdev/competencies'), API.get('/hrdev/appraisals'),
      API.get('/hrdev/surveys-compliance'),
    ]);
    HRS.profiles = p.items || []; HRS.competencies = c.items || []; HRS.appraisals = a.items || [];
    HRS.surveyCompliance = hrdSurveyComplianceHtml(s.items || []);
  } catch (e) { /* بی‌صدا: کشویی‌ها خالی می‌مانند */ }
};

const renderHrDev = async () => { await RPG.__hrdLoadRefs(); return RPG.render('hrdev'); };
const hrDevCanView = () => RPG.canView('hrdev');
