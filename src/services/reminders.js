/**
 * محاسبه‌ی اقلام ریمایندر — یک منبع حقیقت واحد
 *
 * تصمیم معماری: هیچ جدول notifications و هیچ زنگوله‌ی جداگانه‌ای ساخته نشد. اقلام ریمایندر
 * دقیقاً مثل بقیه‌ی اقلام کارتابل «در لحظه‌ی خواندن» محاسبه می‌شوند، پس هرگز با واقعیت
 * داده‌ها ناهمگام نمی‌شوند و بج منو (که همان اقلام کارتابل را می‌شمارد) خودبه‌خود درست است.
 * زمان‌بند (reminder-cron.js) فقط برای کانال‌های *خروجی* (ایمیل/پیامک) لازم است.
 */
const { query } = require('../config/database-sqlite');

const RULE_TYPES = ['document_review', 'period_end', 'certificate_expiry', 'shift_task_unfilled', 'checklist_due'];
const RULE_TYPE_FA = {
  document_review: 'بازبینی مدارک کنترل‌شده',
  period_end: 'پایان دوره اعتباربخشی',
  certificate_expiry: 'انقضای گواهینامه',
  shift_task_unfilled: 'چک‌لیست شیفت پر نشده',
  checklist_due: 'چک‌لیست دوره‌ای سررسیدشده',
};
// مجوزی که تعیین می‌کند این نوع ریمایندر به چه کسی نشان داده شود
// shift_task_unfilled استثناست: گیرنده‌اش نه بر اساس مجوز بلکه بر اساس عضویت در
// nursing_wards (head_nurse_id/deputy1_id/deputy2_id) همان بخش تعیین می‌شود — نگاه کنید
// به ward_recipients روی هر آیتم در dueItems() و استفاده‌اش در reminderItemsFor().
const RULE_PERMISSION = {
  document_review: 'manage_documents',
  period_end: 'manage_hospital_settings',
  certificate_expiry: 'manage_certifications',
  // checklist_due عمداً این‌جا نیست: گیرنده‌اش «مسئولین اندازه‌گیریِ» همان چک‌لیست‌اند،
  // نه دارندگان یک مجوز سراسری — دقیقاً مثل shift_task_unfilled. اگر چک‌لیستی مسئول
  // تعریف‌شده نداشته باشد، به مدیرانِ manage_checklists برمی‌گردد (نگاه کنید به
  // checklistDueItems) تا هیچ سررسیدی بی‌صاحب نماند.
};
// وقتی چک‌لیستی مسئول اندازه‌گیری ندارد، سررسیدش به این مجوز برمی‌گردد
const CHECKLIST_FALLBACK_PERMISSION = 'manage_checklists';

// شیفت صبح تا ۱۴، عصر تا ۲۰، شب تا ۸ صبح روز بعد — بعد از این ساعت «هنوز پر نشده» هشدار است
const SHIFT_CUTOFF_HOUR = { 'صبح': 14, 'عصر': 20, 'شب': 8 };
function shiftCutoffPassed(shiftDate, shiftType, todayStr, nowHour) {
  const cutoffDate = shiftType === 'شب' ? addDays(shiftDate, 1) : shiftDate;
  const cutoffHour = SHIFT_CUTOFF_HOUR[shiftType] || 20;
  if (todayStr > cutoffDate) return true;
  if (todayStr === cutoffDate && nowHour >= cutoffHour) return true;
  return false;
}

const { tehranTodayStr, tehranNow } = require('../config/jalali');
const { checklistStatus, CADENCE_FA } = require('./checklist-cadence');
// «امروز» به وقت تهران، نه ساعت محلی سرور — سررسیدها مقرراتی‌اند و خطای یک‌روزه پذیرفتنی نیست
const todayStr = () => tehranTodayStr();

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function rulesFor(hospitalId) {
  return query('SELECT * FROM reminder_rules WHERE hospital_id = ? AND enabled = 1', [hospitalId]).rows;
}

// اقلام سررسید یک بیمارستان، مستقل از کاربر
function dueItems(hospitalId, rules) {
  const items = [];
  const today = todayStr();
  for (const rule of rules || rulesFor(hospitalId)) {
    const until = addDays(today, Math.max(0, parseInt(rule.days_before, 10) || 7));
    if (rule.rule_type === 'document_review') {
      for (const d of query(`SELECT id, title, doc_code, review_date FROM controlled_documents
          WHERE hospital_id = ? AND status = 'active' AND review_date IS NOT NULL AND review_date <= ?`,
          [hospitalId, until]).rows) {
        items.push({ rule, type: 'document_review', page: 'documents', target_id: d.id,
          title: (String(d.review_date) < today ? 'بازبینی معوق: ' : 'مهلت بازبینی نزدیک: ') + d.title,
          due_date: d.review_date, dedupe_key: `docreview:${d.id}:${d.review_date}` });
      }
    } else if (rule.rule_type === 'period_end') {
      for (const p of query(`SELECT id, title, end_date FROM accreditation_periods
          WHERE hospital_id = ? AND is_active = 1 AND end_date IS NOT NULL AND end_date <= ?`,
          [hospitalId, until]).rows) {
        items.push({ rule, type: 'period_end', page: 'settings', target_id: p.id,
          title: (String(p.end_date) < today ? 'دوره اعتباربخشی پایان یافته: ' : 'پایان دوره اعتباربخشی نزدیک است: ')
            + (p.title || 'دوره جاری'),
          due_date: p.end_date, dedupe_key: `periodend:${p.id}:${p.end_date}` });
      }
    } else if (rule.rule_type === 'certificate_expiry') {
      for (const c of query(`SELECT id, title, expiry_date FROM certifications
          WHERE hospital_id = ? AND expiry_date IS NOT NULL AND expiry_date <= ?`,
          [hospitalId, until]).rows) {
        items.push({ rule, type: 'certificate_expiry', page: 'documents', target_id: c.id,
          title: (String(c.expiry_date) < today ? 'گواهینامه منقضی شده: ' : 'گواهینامه رو به انقضا: ') + c.title,
          due_date: c.expiry_date, dedupe_key: `certexp:${c.id}:${c.expiry_date}` });
      }
    } else if (rule.rule_type === 'shift_task_unfilled') {
      items.push(...shiftTaskUnfilledItems(hospitalId, today));
    } else if (rule.rule_type === 'checklist_due') {
      items.push(...checklistDueItems(hospitalId, today));
    }
  }
  return items;
}

// چک‌لیست شیفت پر نشده — گیرنده «بخش‌محور» است (سرپرستار/جانشین‌های همان بخش)، نه
// دارندگان یک مجوز سراسری؛ پس هر آیتم فهرست ward_recipients خودش را حمل می‌کند
// (نگاه کنید به استفاده‌اش در reminderItemsFor به‌جای recipientsFor عمومی).
function shiftTaskUnfilledItems(hospitalId, today) {
  const items = [];
  const nowHour = tehranNow().getUTCHours();
  const wards = query(`SELECT id, title, head_nurse_id, deputy1_id, deputy2_id FROM nursing_wards
      WHERE hospital_id = ? AND head_nurse_id IS NOT NULL`, [hospitalId]).rows;
  if (!wards.length) return items;
  const shiftTypes = ['صبح', 'عصر', 'شب'];
  // فقط دیروز و امروز بررسی می‌شود — کافی برای «هنوز پر نشده» بدون بار اضافی روی گذشته‌ی دور
  const candidateDates = [addDays(today, -1), today];
  for (const w of wards) {
    const recipients = [w.head_nurse_id, w.deputy1_id, w.deputy2_id].filter(Boolean);
    for (const d of candidateDates) {
      for (const st of shiftTypes) {
        if (!shiftCutoffPassed(d, st, today, nowHour)) continue;
        const row = query(`SELECT task_list FROM nursing_shift_tasks
            WHERE hospital_id = ? AND ward = ? AND shift_date = ? AND shift_type = ?`,
            [hospitalId, w.title, d, st]).rows[0];
        if (row && row.task_list && String(row.task_list).trim()) continue; // پر شده
        items.push({ type: 'shift_task_unfilled', page: 'headnurse', target_id: w.id,
          title: `چک‌لیست شیفت ${st} (${d}) بخش «${w.title}» هنوز پر نشده`,
          due_date: d, dedupe_key: `shifttask:${w.id}:${d}:${st}`,
          ward_recipients: recipients });
      }
    }
  }
  return items;
}

// چک‌لیست دوره‌ای که در دوره‌ی جاری هنوز پر نشده.
// گیرنده مثل shift_task_unfilled «موردمحور» است: مسئولین اندازه‌گیریِ خودِ همان چک‌لیست.
// اگر مسئولی تعریف نشده باشد، سررسید بی‌صاحب نمی‌ماند و به مدیرانِ چک‌لیست می‌رسد.
//
// فقط چک‌لیست‌های active شمرده می‌شوند: پیش‌نویس هنوز ابلاغ نشده و بایگانی‌شده از رده
// خارج است؛ هیچ‌کدام سررسید ندارند. نمونه‌های آموزشی (is_example) هم کنار گذاشته
// می‌شوند تا کارتابلِ بیمارستان با داده‌ی نمایشی شلوغ نشود.
function checklistDueItems(hospitalId, today) {
  const items = [];
  const rows = query(`SELECT c.id, c.title, c.checklist_code, c.cadence,
      (SELECT MAX(s.submitted_at) FROM checklist_submissions s WHERE s.checklist_id = c.id) as last_submitted_at
    FROM checklists c
    WHERE c.hospital_id = ? AND c.status = 'active'
      AND IFNULL(c.cadence, 'ondemand') <> 'ondemand'
      AND IFNULL(c.is_example, 0) = 0`, [hospitalId]).rows;
  if (!rows.length) return items;

  for (const c of rows) {
    const st = checklistStatus(c.cadence, c.last_submitted_at, today);
    if (!st.periodic || st.done_this_period) continue;
    // تا وقتی به بازه‌ی هشدارِ آن تناوب نرسیده‌ایم، سررسید نشان داده نمی‌شود — وگرنه یک
    // چک‌لیست سالانه از روز اول سال در کارتابل می‌ماند و کارتابل را بی‌معنا می‌کند.
    if (st.state === 'due') continue;

    const measurers = query('SELECT user_id FROM checklist_measurers WHERE checklist_id = ?', [c.id])
      .rows.map(r => r.user_id);
    const label = CADENCE_FA[c.cadence] || c.cadence;
    const code = c.checklist_code ? ` (${c.checklist_code})` : '';
    const lapsed = st.previous_period_missed && st.last_submitted_at;
    items.push({
      type: 'checklist_due', page: 'checklists', target_id: c.id,
      title: st.state === 'last_day'
        ? `امروز آخرین روزِ تکمیل چک‌لیست ${label} «${c.title}»${code}`
        : `چک‌لیست ${label} «${c.title}»${code} هنوز در این دوره پر نشده`
          + (lapsed ? ' — دوره‌ی قبل هم پر نشده بود' : ''),
      due_date: st.period_end,
      dedupe_key: `chkdue:${c.id}:${st.period_start}`,
      ward_recipients: measurers.length ? measurers : null,
    });
  }
  return items;
}

// کاربران فعالِ دارنده‌ی مجوز مربوط به یک نوع ریمایندر
function recipientsFor(hospitalId, ruleType, permOverride) {
  const perm = permOverride || RULE_PERMISSION[ruleType];
  if (!perm) return [];   // نوعی که گیرنده‌اش مجوزمحور نیست (مثل shift_task_unfilled)
  const rows = query(`SELECT u.id, u.full_name, u.email, u.phone, r.permissions FROM users u
    JOIN roles r ON r.id = u.role_id WHERE u.hospital_id = ? AND u.is_active = 1`, [hospitalId]).rows;
  return rows.filter(u => {
    let perms = [];
    try { perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || []); }
    catch (e) { perms = []; }
    return perms.includes(perm) || perms.includes('*');
  });
}

// اقلام ریمایندرِ یک کاربر، پس از حذف مواردی که «انجام شد» یا هنوز در بازه‌ی تعویق‌اند.
// خروجی عمداً همان شکل اقلام کارتابل است تا بدون تغییر در مصرف‌کننده کنار بقیه بنشیند.
function reminderItemsFor(userId, hospitalId) {
  try {
    const rules = rulesFor(hospitalId);
    if (!rules.length) return [];
    const today = todayStr();
    const dismissed = new Map();
    for (const d of query('SELECT dedupe_key, state, snooze_until FROM reminder_dismissals WHERE user_id = ?', [userId]).rows) {
      dismissed.set(d.dedupe_key, d);
    }
    const out = [];
    for (const item of dueItems(hospitalId, rules)) {
      const seen = dismissed.get(item.dedupe_key);
      if (seen && (seen.state === 'done' || (seen.snooze_until && seen.snooze_until > today))) continue;
      if (item.type === 'shift_task_unfilled') {
        if (!(item.ward_recipients || []).includes(userId)) continue;
      } else if (item.type === 'checklist_due') {
        // مسئولِ اندازه‌گیری تعریف شده → فقط خودِ او؛ وگرنه مدیرانِ چک‌لیست
        if (item.ward_recipients) {
          if (!item.ward_recipients.includes(userId)) continue;
        } else if (!recipientsFor(hospitalId, item.type, CHECKLIST_FALLBACK_PERMISSION).some(u => u.id === userId)) continue;
      } else if (!recipientsFor(hospitalId, item.type).some(u => u.id === userId)) continue;
      out.push({ type: 'reminder', type_fa: RULE_TYPE_FA[item.type] || 'یادآوری', page: item.page,
        target_id: item.target_id, title: item.title, detail_label: 'سررسید', detail_date: item.due_date,
        created_at: item.due_date, dedupe_key: item.dedupe_key });
    }
    return out;
  } catch (err) {
    // ریمایندر یک لایه‌ی کمکی است — خطایش نباید کل کارتابل را از کار بیندازد
    console.error('[Reminders] محاسبه ناموفق بود (نادیده گرفته شد):', err.message);
    return [];
  }
}

module.exports = { RULE_TYPES, RULE_TYPE_FA, RULE_PERMISSION, dueItems, recipientsFor, reminderItemsFor, todayStr, addDays };
