/**
 * دستیار هوشمند داخلی — پاسخ به دو پرسشِ کاربر روی دکمه‌ی شناور
 *
 *   ۱) «الان باید چه کار کنم؟»  → assistantNext()
 *   ۲) «بررسی وظایف من»          → assistantReview()
 *
 * چرا سرویس جدا و نه گسترش guide-timeline.js: آن ماژول یک «فهرست» تولید می‌کند
 * (همه‌ی گام‌ها با وضعیت done). دستیار همان داده را مصرف می‌کند اما کارش «تصمیم» است:
 * از میان گام‌های باقی‌مانده کدام یکی همین حالا در نوبت است، چرا، و اگر کاربر بپرسد
 * «چه چیزهایی مانده» دقیقاً چند مورد از چند مورد. هیچ منبع دومِ حقیقت ساخته نمی‌شود —
 * timelineFor تنها منبع است، پس اگر گامی در راهنما درست باشد در دستیار هم درست است.
 *
 * اصل کلیدی (همان اصل guide-timeline): هیچ درصد یا وضعیتی جعل نمی‌شود. «انجام‌شده» فقط
 * از داده‌ی واقعیِ همان لحظه می‌آید و «چقدر مانده» از progress({have,total}) خودِ گام.
 *
 * دامنه‌ی نقش: گام‌ها از قبل با مجوزِ کاربر فیلتر شده‌اند (permittedMilestones)، پس هر
 * سمت فقط وظایف خودش را می‌بیند — دستیار نقشِ موازی تعریف نمی‌کند.
 */
const { timelineFor } = require('./guide-timeline');
const { dutiesFor } = require('./role-duties');
const { query } = require('../config/database-sqlite');
// چرا: «امروز» همیشه تهران است، نه UTC سرور — وگرنه حوالی نیمه‌شب snooze یک روز خطا می‌خورد.
const { tehranTodayStr } = require('../config/jalali');

// ترتیب فازها = ترتیب اولویت. گامِ فازِ جلوتر همیشه قبل از گامِ فازِ بعدی در نوبت است،
// چون فازهای بعدی عملاً به خروجی فازهای قبلی متکی‌اند (مثلاً بدون ساخته‌شدن کمیته‌ها،
// «ثبت صورت‌جلسه» بی‌معناست).
// «وظایف جاری سمت من» پیش از گام‌های راه‌اندازی می‌آید: کارِ امروزِ خودِ کاربر بر
// مرحله‌ی راه‌اندازیِ بیمارستان مقدم است — کسی که وارد می‌شود اول می‌خواهد بداند
// «شغل من امروز چه اقتضا می‌کند»، نه «بیمارستان در کدام فاز استقرار است».
const DUTY_PHASE = 'وظایف سمت من';
const PHASE_ORDER = [DUTY_PHASE, 'ماه اول', 'سه‌ماهه‌ی اول', 'سه‌ماهه‌ی دوم', 'سه‌ماهه‌ی سوم به بعد'];
const phaseRank = (p) => {
  const i = PHASE_ORDER.indexOf(p);
  return i === -1 ? PHASE_ORDER.length : i;
};

// نقشِ کاربر برای انتخاب کاتالوگ وظایف. کاتالوگ بر پایه‌ی role code است، نه مجوز:
// دو نقش می‌توانند مجوزهای مشابه داشته باشند ولی شغلشان کاملاً فرق کند (مثلاً مدیر
// مالی و مدیر حسابداری) و همان تفاوت، چیزی است که دستیار باید نشان دهد.
function roleCodeOf(userId) {
  try {
    const r = query('SELECT r.code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?', [userId]).rows[0];
    return r ? r.code : null;
  } catch (e) { return null; }
}

// وظایفِ سمت + گام‌های راه‌اندازی، در یک فهرست. وظایفی که کاربر دستی «انجام دادم»
// زده، از همان جدول guide_dismissals خوانده می‌شود تا رفتار هر دو منبع یکسان باشد.
function combinedItems(userId, hospitalId, permissions) {
  const tl = timelineFor(userId, hospitalId, permissions);
  const duties = dutiesFor(roleCodeOf(userId), hospitalId, userId);
  let dismissed = new Map();
  try {
    dismissed = new Map(query(
      'SELECT milestone_key, state, snooze_until, created_at FROM guide_dismissals WHERE user_id = ?', [userId]
    ).rows.map((r) => [r.milestone_key, r]));
  } catch (e) { /* جدول هنوز ساخته نشده */ }
  const todayIso = tehranTodayStr();

  const dutyItems = [];
  for (const d of duties) {
    const rec = dismissed.get(d.key);
    // «بعداً یادآوری کن» — تا تاریخ تعیین‌شده اصلاً نشان داده نمی‌شود
    if (rec && rec.state === 'snoozed' && rec.snooze_until && rec.snooze_until > todayIso) continue;
    // «انجام دادم» فقط وقتی معتبر است که در همین دوره زده شده باشد. برای وظیفه‌ی
    // ماهانه/فصلی/سالانه، علامتِ دوره‌ی قبل نباید کارِ این دوره را تمام‌شده نشان دهد.
    const markedThisPeriod = !!rec && rec.state === 'done' &&
      (!d.since || String(rec.created_at || '').slice(0, 10) >= d.since);
    dutyItems.push(markedThisPeriod ? { ...d, done: true } : d);
  }
  return { startYear: tl.start_year, items: [...dutyItems, ...(tl.items || [])] };
}

// یک جمله‌ی کوتاه که می‌گوید دقیقاً چه چیزی از این گام کم است — از progress واقعی، نه حدس.
function gapText(item) {
  const p = item.progress;
  if (!p || typeof p.total !== 'number' || p.total <= 0) return null;
  const missing = Math.max(p.total - p.have, 0);
  if (missing <= 0) return null;
  return { have: p.have, total: p.total, missing };
}

// مرتب‌سازی گام‌های باقی‌مانده به‌ترتیب اولویت: اول فاز، بعد «نزدیک‌بودن به اتمام»
// (گامی که ۹ از ۱۰ موردش انجام شده زودتر از گامی که صفر از ۲۰ دارد تمام می‌شود، پس
// جلوتر پیشنهاد می‌شود — کاربر سریع‌تر یک گام را می‌بندد و مسیر واقعاً جلو می‌رود).
function prioritize(remaining) {
  return remaining.slice().sort((a, b) => {
    const pr = phaseRank(a.phase) - phaseRank(b.phase);
    if (pr !== 0) return pr;
    const ga = gapText(a), gb = gapText(b);
    const ra = ga ? ga.missing / ga.total : 0.5;
    const rb = gb ? gb.missing / gb.total : 0.5;
    return ra - rb;
  });
}

/**
 * «الان باید چه کار کنم؟» — یک کار در نوبت + دو کار بعدی، نه یک فهرست بلند.
 * عمداً فقط یک مورد به‌عنوان «الان» برمی‌گردد: پرسش کاربر «چه کار کنم» است نه
 * «چه کارهایی مانده»؛ دادن ده مورد همان سردرگمی‌ای است که این دکمه قرار بود حل کند.
 */
function assistantNext(userId, hospitalId, permissions) {
  const tl = combinedItems(userId, hospitalId, permissions);
  if (!tl.startYear && !(tl.items || []).length) {
    return {
      configured: false,
      message: 'هنوز «سال شروع دوره‌ی اعتباربخشی» ثبت نشده است. تا وقتی این تاریخ مشخص نشود، برنامه‌ی زمانی ساخته نمی‌شود.',
      page: 'settings',
    };
  }
  const remaining = prioritize((tl.items || []).filter(i => !i.done));
  if (!remaining.length) {
    return {
      configured: true,
      all_done: true,
      message: 'همه‌ی وظایفی که در دامنه‌ی سمت شماست انجام شده است. کار جدیدی در نوبت نیست.',
      done_count: (tl.items || []).length,
    };
  }
  const top = remaining[0];
  return {
    configured: true,
    all_done: false,
    now: {
      key: top.key,
      title: top.title,
      desc: top.desc,
      page: top.page,
      field: top.field || null,
      phaseLabel: top.phaseLabel,
      cadenceLabel: top.cadenceLabel || null,
      gap: gapText(top),
    },
    then: remaining.slice(1, 3).map(i => ({ key: i.key, title: i.title, page: i.page, phaseLabel: i.phaseLabel })),
    remaining_count: remaining.length,
  };
}

/**
 * «بررسی وظایف من» — تفکیک کاملِ انجام‌شده/مانده، گروه‌بندی‌شده بر اساس فاز، با
 * جزئیات «چند از چند» برای هر موردی که قابل شمارش است.
 */
function assistantReview(userId, hospitalId, permissions) {
  const tl = combinedItems(userId, hospitalId, permissions);
  if (!tl.startYear && !(tl.items || []).length) {
    return { configured: false, message: 'هنوز «سال شروع دوره‌ی اعتباربخشی» ثبت نشده است.', page: 'settings' };
  }
  const items = tl.items || [];
  const doneCount = items.filter(i => i.done).length;

  const byPhase = new Map();
  for (const ph of PHASE_ORDER) byPhase.set(ph, []);
  for (const it of items) {
    if (!byPhase.has(it.phase)) byPhase.set(it.phase, []);
    byPhase.get(it.phase).push({
      key: it.key,
      title: it.title,
      desc: it.desc,
      page: it.page,
      field: it.field || null,
      done: it.done,
      // «ماهانه/فصلی/سالانه» — بدون این، کاربر نمی‌فهمد کاری که تیک خورده دوباره
      // برمی‌گردد یا برای همیشه تمام شده است.
      cadenceLabel: it.cadenceLabel || null,
      phaseLabel: it.phaseLabel,
      gap: it.done ? null : gapText(it),
    });
  }

  const groups = [];
  for (const [phase, list] of byPhase) {
    if (!list.length) continue;
    groups.push({
      phase,
      phaseLabel: (list[0] && list[0].phaseLabel) || phase,
      done: list.filter(i => i.done).length,
      total: list.length,
      items: list,
    });
  }

  return {
    configured: true,
    total: items.length,
    done_count: doneCount,
    remaining_count: items.length - doneCount,
    percent: items.length ? Math.round((doneCount / items.length) * 100) : 0,
    groups,
  };
}

module.exports = { assistantNext, assistantReview };
