/* ==========================================================================
 * آموزش و اثربخشی — الف‑۳‑۲‑۴ و الف‑۴‑۲‑۳/۴/۵.
 * فقط «توصیف»، موتورش RPG است. بک‌اند: src/routes/api.js بخش Education.
 *
 * این ماژول جای ماژولِ «نیازسنجی آموزشی» را نمی‌گیرد؛ ادامه‌ی آن است:
 * آن‌جا نیاز ثبت می‌شود، این‌جا سیاست، برگزاری و سنجشِ اثربخشی.
 * ========================================================================== */

const EDS = { policies: [], sessions: [] };

const eduPolicyLabel = (id) => {
  const p = EDS.policies.find(x => x.id === id);
  return p ? esc(p.title) : '<span style="color:var(--td)">—</span>';
};
const eduSessionLabel = (id) => {
  const s = EDS.sessions.find(x => x.id === id);
  return s ? esc(`${s.title} — ${faDateISO(s.session_date)}`) : '<span style="color:var(--td)">—</span>';
};

// «اثربخش بودن» را سرور از مقایسه‌ی نتیجه با هدف درمی‌آورد؛ این‌جا فقط
// خوانا نشانش می‌دهیم تا کاربر نپرسد «این عدد از کجا آمد».
const eduEffective = (r) => r.effective
  ? '<b style="color:#17576e">به هدف رسید</b>'
  : '<b style="color:#c02626">به هدف نرسید</b>';

RPG.define({
  key: 'education',
  title: 'آموزش و اثربخشی',
  sub: 'سیاست آموزش بیمار، برگزاری برنامه‌ها، و سنجش اثربخشی در دو حیطه‌ی آگاهی و مهارت',
  icon: '🎯',
  perms: ['view_education', 'manage_education'],
  tabs: [['dash', 'داشبورد'], ['policies', 'سیاست آموزشی'], ['sessions', 'برنامه‌های برگزارشده'],
    ['effectiveness', 'ارزیابی اثربخشی']],
  fa: {},
  spec: {
    policies: {
      title: 'سیاست‌های آموزشی', icon: '📜',
      sub: 'الف-۴-۲-۳ — تدوین و ابلاغ سیاست آموزش بیماران، متناسب با سطح و نوع مراقبت',
      formHint: '«تدوین» و «ابلاغ» دو کارِ جدا هستند: سیاستی که تصویب شده ولی ابلاغ نشده، در ممیزی نصفِ سنجه است. اگر تاریخ بازنگری بزنید، باید بگویید بر پایه‌ی کدام نتیجه‌ی اثربخشی بازنگری شده (الف-۴-۲-۵).',
      fields: [
        { k: 'title', l: 'عنوان سیاست *', t: 'text', list: 1 },
        { k: 'audience', l: 'مخاطب', t: 'select', opts: ['بیماران', 'کارکنان پرستاری'], list: 1, chip: 1 },
        { k: 'care_level', l: 'سطح و نوع مراقبت *', t: 'text', list: 1 },
        { k: 'version', l: 'نسخه', t: 'text' },
        { k: 'approved_by', l: 'تصویب‌کننده', t: 'text', list: 1 },
        { k: 'approved_date', l: 'تاریخ تصویب', t: 'date', list: 1 },
        { k: 'communicated', l: 'ابلاغ شد', t: 'bool', list: 1 },
        { k: 'communication_method', l: 'روش ابلاغ', t: 'text' },
        { k: 'communication_date', l: 'تاریخ ابلاغ', t: 'date' },
        { k: 'last_review_date', l: 'آخرین بازنگری', t: 'date', list: 1 },
        { k: 'next_review_due', l: 'سررسید بازنگری بعدی', t: 'date', list: 1,
          render: (r) => {
            if (!r.next_review_due) return '<span style="color:var(--td)">—</span>';
            const late = new Date(r.next_review_due) < new Date();
            return `<span style="color:${late ? '#c02626' : 'inherit'};font-weight:${late ? 700 : 400}">${faDateISO(r.next_review_due)}</span>`;
          } },
        { k: 'is_active', l: 'فعال', t: 'bool', list: 1 },
        { k: 'content', l: 'متن سیاست', t: 'area' },
        { k: 'revision_basis', l: 'مبنای بازنگری (نتایج اثربخشی)', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    sessions: {
      title: 'برنامه‌های آموزشیِ برگزارشده', icon: '👥',
      sub: 'الف-۴-۲-۴ — برنامه‌ریزی آموزش بیماران در چارچوب سیاست‌های مدیریت پرستاری',
      formHint: 'برنامه‌ی آموزشِ بیمار باید به یک سیاست متصل باشد؛ سنجه صریحاً «در چارچوب سیاست‌ها» گفته. دوره‌ی کارکنان این الزام را ندارد.',
      fields: [
        { k: 'session_date', l: 'تاریخ برگزاری *', t: 'date', list: 1 },
        { k: 'title', l: 'عنوان برنامه *', t: 'text', list: 1 },
        { k: 'audience', l: 'مخاطب', t: 'select', opts: ['کارکنان', 'بیماران و همراهان'], list: 1, chip: 1 },
        { k: 'policy_id', l: 'سیاست مرتبط', t: 'select',
          opts: () => EDS.policies.map(p => [p.id, p.title]),
          list: 1, render: (r) => eduPolicyLabel(r.policy_id) },
        { k: 'topic', l: 'موضوع', t: 'text' },
        { k: 'ward', l: 'بخش', t: 'text', list: 1 },
        { k: 'target_group', l: 'گروه هدف', t: 'text' },
        { k: 'method', l: 'روش', t: 'select', list: 1,
          opts: ['حضوری', 'کارگاه عملی', 'چهره‌به‌چهره کنار تخت', 'جزوه و پمفلت', 'مجازی'] },
        { k: 'trainer', l: 'مدرس', t: 'text', list: 1 },
        { k: 'duration_hours', l: 'مدت (ساعت)', t: 'num', step: '0.5' },
        { k: 'invited_count', l: 'دعوت‌شده', t: 'num' },
        { k: 'participants_count', l: 'شرکت‌کننده', t: 'num', list: 1 },
        { k: 'planned', l: 'طبق برنامه‌ی مصوب', t: 'bool', list: 1 },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
    effectiveness: {
      title: 'ارزیابی اثربخشی', icon: '📊',
      sub: 'الف-۳-۲-۴ — سنجش در دو حیطه: آگاهی با پیش/پس‌آزمون، مهارت با ارزیابی عملی',
      formHint: 'روشِ سنجش را خودِ سنجه تعیین کرده، نه ما: حیطه‌ی آگاهی با پیش‌آزمون و پس‌آزمون، حیطه‌ی مهارت با بررسی عملی. «به هدف رسیدن» را سرور از مقایسه با شاخصِ اثربخشی حساب می‌کند؛ دوره‌ای که نرسیده، بدون اقدام اصلاحی ذخیره نمی‌شود.',
      fields: [
        { k: 'session_id', l: 'برنامه‌ی آموزشی *', t: 'select',
          opts: () => EDS.sessions.map(s => [s.id, `${s.title} — ${s.session_date || ''}`]),
          list: 1, render: (r) => eduSessionLabel(r.session_id) },
        { k: 'eval_date', l: 'تاریخ ارزیابی *', t: 'date', list: 1 },
        { k: 'target_pct', l: 'شاخص/هدف اثربخشی *', t: 'num', step: '0.1', list: 1 },
        { k: 'pre_test_score', l: 'پیش‌آزمون *', t: 'num', step: '0.1', list: 1 },
        { k: 'post_test_score', l: 'پس‌آزمون *', t: 'num', step: '0.1', list: 1 },
        { k: 'knowledge_gain', l: 'رشد آگاهی', t: 'num', computed: 1, list: 1,
          render: (r) => {
            if (r.knowledge_gain == null) return '<span style="color:var(--td)">—</span>';
            const g = Number(r.knowledge_gain);
            return `<span style="color:${g > 0 ? '#17576e' : '#c02626'};font-weight:700">${g > 0 ? '+' : ''}${fa(g)}</span>`;
          } },
        { k: 'skill_method', l: 'روش ارزیابی مهارت *', t: 'text' },
        { k: 'skill_score', l: 'امتیاز مهارت *', t: 'num', step: '0.1', list: 1 },
        { k: 'effective', l: 'نتیجه', t: 'bool', computed: 1, list: 1, render: eduEffective },
        { k: 'evaluated_count', l: 'تعداد ارزیابی‌شده', t: 'num' },
        { k: 'evaluator', l: 'ارزیاب', t: 'text' },
        { k: 'used_in_policy_review', l: 'در بازنگری سیاست استفاده شد', t: 'bool', list: 1 },
        { k: 'policy_review_ref', l: 'ارجاع به بازنگری', t: 'text' },
        { k: 'corrective_action', l: 'اقدام اصلاحی', t: 'area' },
        { k: 'note', l: 'توضیح', t: 'area' },
      ],
    },
  },
  dashboard(d, key) {
    const c = (n, l, clr, tab) => RPG.card(key, n, l, clr, tab);
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.policies, 'سیاستِ آموزشیِ فعال', d.policies ? '#17576e' : '#c02626', 'policies')}
        ${c(d.policies_uncommunicated, 'تصویب‌شده ولی ابلاغ‌نشده', d.policies_uncommunicated ? '#c02626' : '#17576e', 'policies')}
        ${c(d.policies_stale, 'سررسیدِ بازنگری گذشته', d.policies_stale ? '#9a6b00' : '#17576e', 'policies')}
        ${c(d.sessions_year, 'برنامه‌ی ۱۲ ماه گذشته', d.sessions_year ? '#17576e' : '#c02626', 'sessions')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        ${c(d.patient_sessions, 'برنامه‌ی آموزشِ بیمار', d.patient_sessions ? '#17576e' : '#9a6b00', 'sessions')}
        ${c(d.sessions_unevaluated, 'برگزارشده و سنجیده‌نشده', d.sessions_unevaluated ? '#c02626' : '#17576e', 'effectiveness')}
        ${c(d.evals, 'ارزیابیِ اثربخشی', d.evals ? '#17576e' : '#c02626', 'effectiveness')}
        ${c(d.evals_ineffective, 'دوره‌ای که به هدف نرسید', d.evals_ineffective ? '#9a6b00' : '#17576e', 'effectiveness')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${c(d.evals_no_action, 'نرسیده به هدف و بدون اقدام', d.evals_no_action ? '#c02626' : '#17576e', 'effectiveness')}
        ${c(d.evals_fed_back, 'نتیجه‌ای که به بازنگری سیاست رسید', d.evals_fed_back ? '#17576e' : '#9a6b00', 'effectiveness')}
      </div>
      <div style="margin-top:16px;color:var(--mut);font-size:13px;line-height:2">
        عددِ «برگزارشده و سنجیده‌نشده» مهم‌ترینِ این صفحه است: الف‑۳‑۲‑۴ برگزاریِ دوره را
        امتیاز نمی‌دهد، <b>سنجشِ اثربخشی‌اش</b> را امتیاز می‌دهد. و آخرین کارت، حلقه‌ی
        الف‑۴‑۲‑۵ است — نتیجه‌ای که به بازنگریِ سیاست برنگردد، حلقه‌اش باز مانده.
      </div>`;
  },
  onGo() { RPG.__eduLoadRefs(); },
});

RPG.__eduLoadRefs = async function () {
  // مجوز پیش از درخواست چک می‌شود، وگرنه کاربرِ بی‌دسترسی یک ۴۰۳ بی‌فایده
  // در کنسول می‌ساخت.
  if (!RPG.canView('education')) return;
  try {
    const [p, s] = await Promise.all([
      API.get('/education/policies'), API.get('/education/sessions'),
    ]);
    EDS.policies = p.items || [];
    EDS.sessions = s.items || [];
  } catch (e) { /* کشوها خالی می‌مانند */ }
};

const renderEducation = async () => { await RPG.__eduLoadRefs(); return RPG.render('education'); };
const educationCanView = () => RPG.canView('education');
