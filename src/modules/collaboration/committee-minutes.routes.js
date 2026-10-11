/**
 * Collaboration Committee Minutes & Decisions Routes
 * Part of Modular Monolith (Clean Architecture) — Project 313
 */
const express = require('express');
const router = express.Router();
const common = require('../common');
const {
  query, db, authRequired, requirePermission, requireAnyPermission,
  hospitalScope, requireFeature, scopeFor, axisCodeOf, measureAllowed,
  jalaliYearRange, jalaliMonthRange, safeYear, toGregorian, toJalali,
  todayJalali, JMONTHS, tehranNow, tehranTodayStr, TEHRAN_OFFSET_MS,
  logAction, uuid, parseJSON, safeArray, buildTrackingCode,
  bcrypt, config,
  applyYearFilter, loadOverrides, evaluatePolicy,
  upload, uploadSingle, uploadMultiple, compressImage,
  path, fs, RULE_TYPES, RULE_TYPE_FA, reminderItemsFor,
  timelineFor, dismissMilestone, snoozeMilestone, setMilestoneState,
  assistantNext, assistantReview, periodProgress,
  getSmartDecisions, myWork, assistantChat,
  extractText, classifyDocument, extractFlowchart,
  crudNormalize,
  crudHasUpdatedAt,
  TIME_RE,
  DATE_RE,
  statusYear,
  codeCmp,
  sortTree,
  canAssignRole,
  hasPerm,
  normFa,
  matchFa,
  truthy,
  MER_EVAL_STATUSES,
  merValidate,
  merInsert,
  originalName,
  storeUploadedFile,
  sendStoredFile,
  LIB_CATEGORIES,
  libSectionId,
  getChecklist,
  saveChecklistMeasurers,
  chkMeasurers,
  itemHasSubmissions,
  BSC_PERSPECTIVES,
  JMONTHS_FA,
  matchPerspective,
  currentJalaliYear,
  bscYear,
  bscData,
  IND_ASPECTS,
  IND_TYPES,
  IND_INTERVALS,
  IND_DESIRABILITY,
  IND_VALUE_STATUS,
  IND_TEXT_FIELDS,
  IND_NUM_FIELDS,
  IND_FLAG_FIELDS,
  indBody,
  nrsCanManage,
  nrsCanView,
  headNurseWardsOf,
  hnAccessWard,
  hnHeadPresentToday,
  SHIFT_STAFF_ORDER,
  SHIFT_STAFF_ORDER_W,
  SHIFT_SETTINGS_DEFAULT,
  shiftCellHours,
  daysInJalaliMonth,
  shiftAccessUnit,
  getWardShiftSettings,
  parseHolidays,
  docCodes,
  signatureImageFor,
  resolveRecipient,
  nrsUserOrNull,
  FMEA_STATUSES,
  fmeaBody,
  fmeaInsert,
  CL_ANSWER_VALUES,
  CL_ANSWER_LABELS,
  CL_NONCONFORMITY,
  isNonConformity,
  indJudge,
  indRow
} = common;

// Helper to bind mountCrud to this module router
const mountCrud = (prefix, ...args) => common.mountCrud(router, prefix, ...args);

// ---- صورت‌جلسه‌ی کمیته ----
// سنجه‌ی الف-۱-۵-۲ شش بندِ حداقلی را برای فرم صورت‌جلسه نام می‌برد. تا پیش از این
// جدول فقط تاریخ/حاضرین/دستور کار/مصوبات داشت، پس پنج بند از شش بند اصلاً جایی
// برای ثبت نداشتند. این نگاشت هم منبعِ اعتبارسنجیِ «کامل بودن» است و هم متنی که
// در رابط کاربری کنار هشدار می‌آید — تا معلوم باشد کدام بندِ کتاب جا مانده.
const MIN_REQUIRED = [
  ['time_place', 'ساعت و محل برگزاری جلسه'],
  ['agenda', 'دستور کار جلسه'],
  ['attendance', 'فهرست افراد حاضر و غایب'],
  ['previous', 'نتایج پیگیری مصوبات جلسات قبل'],
  ['discussion', 'شرح مباحث و مذاکرات جلسه'],
  ['decisions', 'مصوبات با مسئول پیگیری و مهلت'],
  ['signatures', 'امضای اعضای حاضر'],
];

// یک مصوبه ممکن است رشته‌ی ساده (داده‌ی قدیمی) یا شیء ساختاریافته باشد.
const decWhat = (d) => (typeof d === 'string' ? d : (d && d.what) || '');
// بند ۵ «مسئول پیگیری» و «مهلت» می‌خواهد — نه لزوماً کاربرِ سامانه. مسئول ممکن است
// فردی باشد که حساب کاربری ندارد (نماینده‌ی پیمانکار، مسئول واحدی خارج از سامانه)؛
// اجبار به انتخاب از فهرست کاربران سخت‌گیرانه‌تر از خودِ کتاب بود. اگر کاربرِ سامانه
// انتخاب شود، مصوبه به کارتابلش هم می‌رود.
const decHasOwner = (d) => !!(d && typeof d === 'object' && d.deadline
  && (d.responsible_user_id || String(d.responsible_name || '').trim()));

// بند ۳ کتاب «نتایج پیگیری» می‌خواهد، نه صرفاً «فهرست مصوبات قبل». اگر جلسه‌ی قبلی
// وجود نداشته باشد این بند موضوعاً منتفی است و نباید هشدار بدهد — اولین جلسه‌ی یک
// کمیته مصوبه‌ی قبلی ندارد.
function minutesMissing(row, hasPrevious) {
  const agenda = safeArray(row.agenda_items);
  const decisions = safeArray(row.decisions);
  const missing = [];
  if (!row.start_time || !row.location) missing.push('time_place');
  if (!agenda.length) missing.push('agenda');
  if (!safeArray(row.attendees).length) missing.push('attendance');
  if (hasPrevious && !safeArray(row.previous_followup).length) missing.push('previous');
  if (!String(row.discussion || '').trim()) missing.push('discussion');
  // مصوبه‌ی بدون مسئول و مهلت از نگاه بند ۵ مصوبه نیست؛ ولی صورت‌جلسه‌ای که اصلاً
  // مصوبه ندارد (جلسه‌ی صرفاً گزارشی) ایراد نیست — فقط مصوبه‌ی ناقص ایراد است.
  if (decisions.length && !decisions.every(decHasOwner)) missing.push('decisions');
  if (!safeArray(row.signatures).length) missing.push('signatures');
  return missing;
}

// خروجیِ یکسانِ صورت‌جلسه برای فهرست و نمای تکی: فیلدهای JSON باز می‌شوند و وضعیت
// *زنده‌ی* وظیفه‌ی هر مصوبه از جدول tasks خوانده می‌شود (نه ذخیره‌ی وضعیت در خود
// صورت‌جلسه) — همان تصمیمِ «محاسبه در لحظه‌ی خواندن» که در reminders.js گرفته شد،
// وگرنه صورت‌جلسه و کارتابل از هم واگرا می‌شوند.
function minuteOut(row, taskById) {
  const decisions = safeArray(row.decisions).map(d => {
    if (typeof d === 'string') return { what: d };
    const t = d.task_id ? taskById[d.task_id] : null;
    return { ...d, task_status: t ? t.status : null, task_completed_at: t ? t.completed_at : null };
  });
  return {
    ...row,
    attendees: safeArray(row.attendees),
    absentees: safeArray(row.absentees),
    agenda_items: safeArray(row.agenda_items),
    previous_followup: safeArray(row.previous_followup),
    signatures: safeArray(row.signatures),
    decisions,
  };
}

// وظیفه‌های ساخته‌شده از مصوبات این کمیته، یک‌جا — تا نمای فهرست به ازای هر مصوبه
// یک پرس‌وجو نزند.
function decisionTasks(hospitalId, committeeId) {
  const rows = query(`SELECT id, status, completed_at FROM tasks
    WHERE hospital_id = ? AND description LIKE ?`, [hospitalId, '%[MIN:' + committeeId + ':%']).rows;
  return Object.fromEntries(rows.map(t => [t.id, t]));
}

// مصوبه‌ای که مسئول و مهلت دارد باید در کارتابل همان شخص بنشیند، وگرنه «مسئول
// پیگیری» فقط یک نام روی کاغذ است. شناسه‌ی صورت‌جلسه به‌شکل [MIN:<committee>:<minute>]
// در انتهای description می‌آید — همان الگوی [CHK:<id>] در چک‌لیست‌ها، به همان دلیل
// (جدول tasks ستون منبع ندارد و چند ماژول از آن استفاده می‌کنند).
// فقط مصوبه‌ی تازه وظیفه می‌سازد؛ مصوبه‌ای که از قبل task_id دارد دست نمی‌خورد.
function syncDecisionTasks(req, committee, minuteId, meetingDate, decisions) {
  return (decisions || []).map(d => {
    if (typeof d === 'string' || !d) return d;
    if (d.task_id || !d.responsible_user_id) return d;
    const ok = query('SELECT id FROM users WHERE id = ? AND hospital_id = ?',
      [d.responsible_user_id, req.hospitalId]).rows[0];
    if (!ok) return { ...d, responsible_user_id: null };
    const tid = uuid();
    const desc = `مصوبه‌ی جلسه‌ی کمیته‌ی «${committee.name}» مورخ ${meetingDate}\n[MIN:${committee.id}:${minuteId}]`;
    query(`INSERT INTO tasks (id, hospital_id, title, description, assigned_by, assigned_to, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tid, req.hospitalId, String(d.what || 'مصوبه‌ی کمیته').slice(0, 255), desc,
       req.user.id, d.responsible_user_id, d.deadline || null]);
    return { ...d, task_id: tid };
  });
}

// بدنه‌ی مشترک ثبت و ویرایش
function minutesBody(body) {
  return {
    meeting_date: body.meeting_date,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
    location: body.location ? String(body.location).slice(0, 255) : null,
    minutes_code: body.minutes_code ? String(body.minutes_code).slice(0, 60) : null,
    discussion: body.discussion ? String(body.discussion) : null,
    next_meeting_date: body.next_meeting_date || null,
    attendees: JSON.stringify(body.attendees || []),
    absentees: JSON.stringify(body.absentees || []),
    agenda_items: JSON.stringify(body.agenda_items || []),
    previous_followup: JSON.stringify(body.previous_followup || []),
  };
}

router.get('/committees/:id/minutes', authRequired, hospitalScope, (req, res) => {
  try {
    // تأیید تعلق کمیته به همین بیمارستان قبل از نمایش صورت‌جلسات (جلوگیری از دسترسی متقاطع بین بیمارستان‌ها)
    const committee = query('SELECT id FROM committees WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    if (committee.rows.length === 0) return res.status(404).json({ error: 'کمیته یافت نشد' });
    const params = [req.params.id];
    let sql = 'SELECT * FROM committee_meeting_minutes WHERE committee_id = ?';
    sql += applyYearFilter(req, params, 'meeting_date');
    sql += ' ORDER BY meeting_date DESC';
    const rows = query(sql, params).rows;
    const taskById = decisionTasks(req.hospitalId, req.params.id);
    // «جلسه‌ی قبلی دارد یا نه» از کل تاریخچه‌ی کمیته می‌آید، نه از همین صفحه‌ی
    // فیلترشده؛ وگرنه اولین جلسه‌ی سالِ انتخاب‌شده اشتباهاً «اولین جلسه» شمرده می‌شد.
    const earliest = query('SELECT MIN(meeting_date) m FROM committee_meeting_minutes WHERE committee_id = ?',
      [req.params.id]).rows[0].m;
    const minutes = rows.map(r => ({
      ...minuteOut(r, taskById),
      missing: minutesMissing(r, !!earliest && r.meeting_date > earliest),
    }));
    res.json({ minutes, required: MIN_REQUIRED });
  } catch (err) { console.error('[Minutes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// یک صورت‌جلسه با همه‌ی جزئیات — برگه‌ی چاپی از این می‌خواند
router.get('/committees/:id/minutes/:mid', authRequired, hospitalScope, (req, res) => {
  try {
    const committee = query('SELECT * FROM committees WHERE id = ? AND hospital_id = ?',
      [req.params.id, req.hospitalId]).rows[0];
    if (!committee) return res.status(404).json({ error: 'کمیته یافت نشد' });
    const row = query('SELECT * FROM committee_meeting_minutes WHERE id = ? AND committee_id = ?',
      [req.params.mid, req.params.id]).rows[0];
    if (!row) return res.status(404).json({ error: 'صورت‌جلسه یافت نشد' });
    const prev = query(`SELECT MIN(meeting_date) m FROM committee_meeting_minutes WHERE committee_id = ?`,
      [req.params.id]).rows[0].m;
    const author = query('SELECT full_name FROM users WHERE id = ?', [row.created_by]).rows[0];
    res.json({
      minute: {
        ...minuteOut(row, decisionTasks(req.hospitalId, req.params.id)),
        missing: minutesMissing(row, !!prev && row.meeting_date > prev),
        created_by_name: author ? author.full_name : null,
      },
      committee: { id: committee.id, name: committee.name, meeting_frequency: committee.meeting_frequency },
      required: MIN_REQUIRED,
    });
  } catch (err) { console.error('[Minutes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// مصوبات جلسه‌ی قبل، همراه وضعیت زنده‌ی وظیفه‌شان — ورودیِ بند ۳ («نتایج پیگیری
// مصوبات جلسات قبل»). کاربر نباید مصوبات قبلی را دستی دوباره تایپ کند؛ فرم آن‌ها را
// پیش‌پر می‌کند و او فقط نتیجه را می‌نویسد.
router.get('/committees/:id/previous-decisions', authRequired, hospitalScope, (req, res) => {
  try {
    const committee = query('SELECT id FROM committees WHERE id = ? AND hospital_id = ?',
      [req.params.id, req.hospitalId]).rows[0];
    if (!committee) return res.status(404).json({ error: 'کمیته یافت نشد' });
    const params = [req.params.id];
    let sql = 'SELECT * FROM committee_meeting_minutes WHERE committee_id = ?';
    if (req.query.before) { sql += ' AND date(meeting_date) < date(?)'; params.push(req.query.before); }
    if (req.query.exclude) { sql += ' AND id <> ?'; params.push(req.query.exclude); }
    sql += ' ORDER BY meeting_date DESC LIMIT 1';
    const prev = query(sql, params).rows[0];
    if (!prev) return res.json({ previous: null, decisions: [] });
    const taskById = decisionTasks(req.hospitalId, req.params.id);
    const decisions = safeArray(prev.decisions).map(d => {
      const what = decWhat(d);
      const t = (d && d.task_id) ? taskById[d.task_id] : null;
      return { what, responsible_name: (d && d.responsible_name) || null,
               deadline: (d && d.deadline) || null, task_status: t ? t.status : null };
    }).filter(d => d.what);
    res.json({ previous: { id: prev.id, meeting_date: prev.meeting_date }, decisions });
  } catch (err) { console.error('[Minutes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/committees/:id/minutes', authRequired, requirePermission('create_committee_minutes'), hospitalScope, (req, res) => {
  const { meeting_date } = req.body;
  if (!meeting_date) return res.status(400).json({ error: 'تاریخ الزامی است' });
  try {
    const committee = query('SELECT id, name FROM committees WHERE id = ? AND hospital_id = ?',
      [req.params.id, req.hospitalId]).rows[0];
    if (!committee) return res.status(404).json({ error: 'کمیته یافت نشد' });
    const id = uuid();
    const b = minutesBody(req.body);
    const decisions = syncDecisionTasks(req, committee, id, meeting_date, req.body.decisions);
    const cols = Object.keys(b);
    query(`INSERT INTO committee_meeting_minutes
      (id, committee_id, ${cols.join(', ')}, decisions, signatures, created_by, updated_at)
      VALUES (?, ?, ${cols.map(() => '?').join(', ')}, ?, '[]', ?, datetime('now'))`,
      [id, req.params.id, ...cols.map(c => b[c]), JSON.stringify(decisions), req.user.id]);
    res.json({ minutes: { id } });
  } catch (err) { console.error('[Minutes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ویرایش صورت‌جلسه — تا پیش از این ممکن نبود و صورت‌جلسه‌ی ناقص فقط با حذف و ثبت
// دوباره اصلاح می‌شد. لازم است چون امضاها و «نتایج پیگیری» معمولاً *بعد* از ثبت
// اولیه تکمیل می‌شوند.
router.put('/committees/:id/minutes/:mid', authRequired, requirePermission('create_committee_minutes'), hospitalScope, (req, res) => {
  try {
    const committee = query('SELECT id, name FROM committees WHERE id = ? AND hospital_id = ?',
      [req.params.id, req.hospitalId]).rows[0];
    if (!committee) return res.status(404).json({ error: 'کمیته یافت نشد' });
    const row = query('SELECT * FROM committee_meeting_minutes WHERE id = ? AND committee_id = ?',
      [req.params.mid, req.params.id]).rows[0];
    if (!row) return res.status(404).json({ error: 'صورت‌جلسه یافت نشد' });
    const b = minutesBody({ ...req.body, meeting_date: req.body.meeting_date || row.meeting_date });
    const decisions = syncDecisionTasks(req, committee, row.id, b.meeting_date,
      req.body.decisions !== undefined ? req.body.decisions : safeArray(row.decisions));
    const cols = Object.keys(b);
    query(`UPDATE committee_meeting_minutes SET ${cols.map(c => c + ' = ?').join(', ')},
      decisions = ?, updated_at = datetime('now') WHERE id = ?`,
      [...cols.map(c => b[c]), JSON.stringify(decisions), row.id]);
    res.json({ ok: true });
  } catch (err) { console.error('[Minutes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// بند ۶: «امضای اعضای حاضر و ذکر اسامی اعضای غایب … و اخذ امضای غایبین پس از جلسه».
// امضا را خودِ شخص ثبت می‌کند نه دبیر جلسه — امضایی که دیگری از طرف کسی بزند از نگاه
// ارزیاب امضا نیست. اگر نامِ کاربر در فهرست غایبین باشد، امضایش «امضای غایب پس از
// جلسه» علامت می‌خورد؛ همان تفکیکی که خودِ کتاب می‌خواهد.
router.post('/committees/:id/minutes/:mid/sign', authRequired, hospitalScope, (req, res) => {
  try {
    const committee = query('SELECT id FROM committees WHERE id = ? AND hospital_id = ?',
      [req.params.id, req.hospitalId]).rows[0];
    if (!committee) return res.status(404).json({ error: 'کمیته یافت نشد' });
    const row = query('SELECT * FROM committee_meeting_minutes WHERE id = ? AND committee_id = ?',
      [req.params.mid, req.params.id]).rows[0];
    if (!row) return res.status(404).json({ error: 'صورت‌جلسه یافت نشد' });
    const sigs = safeArray(row.signatures);
    if (sigs.some(s => s && s.user_id === req.user.id)) {
      return res.status(400).json({ error: 'شما این صورت‌جلسه را امضا کرده‌اید' });
    }
    const me = query(`SELECT u.full_name, u.department, r.title_fa as role_title, r.code as role_code
      FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`, [req.user.id]).rows[0] || {};
    const nameOf = (p) => (typeof p === 'string' ? p : (p && (p.name || p.full_name)) || '');
    const wasAbsent = safeArray(row.absentees)
      .some(a => (a && a.user_id) === req.user.id || nameOf(a) === me.full_name);
    sigs.push({
      user_id: req.user.id, name: me.full_name || '',
      role: me.role_title || me.role_code || null,
      was_absent: wasAbsent, signed_at: new Date().toISOString(),
    });
    query("UPDATE committee_meeting_minutes SET signatures = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(sigs), row.id]);
    res.json({ ok: true, was_absent: wasAbsent });
  } catch (err) { console.error('[Minutes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// حذف صورت‌جلسه — تا پیش از این هیچ مسیر حذفی وجود نداشت و صورت‌جلسه‌ی اشتباه/نمونه
// فقط با حذف کل کمیته پاک می‌شد. تعلق کمیته به بیمارستان قبل از حذف بررسی می‌شود.
router.delete('/committees/:id/minutes/:mid', authRequired, requirePermission('create_committee_minutes'), hospitalScope, (req, res) => {
  try {
    const committee = query('SELECT id FROM committees WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    if (committee.rows.length === 0) return res.status(404).json({ error: 'کمیته یافت نشد' });
    const row = query('SELECT id FROM committee_meeting_minutes WHERE id = ? AND committee_id = ?',
      [req.params.mid, req.params.id]).rows[0];
    if (!row) return res.status(404).json({ error: 'صورت‌جلسه یافت نشد' });
    query('DELETE FROM committee_meeting_minutes WHERE id = ?', [row.id]);
    res.json({ ok: true });
  } catch (err) { console.error('[Minutes delete]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
