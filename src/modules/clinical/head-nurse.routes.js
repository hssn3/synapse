/**
 * Clinical Head Nurse Dashboard Routes
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

// ===== داشبورد سرپرستار/جانشین بخش — database/seed-head-nurse.js =====
// دسترسی reference-based است: نه یک permission سراسری، بلکه «آیا این کاربر در
// nursing_wards.head_nurse_id/deputy1_id/deputy2_id هر بخشی دیده می‌شود؟». دلیل در
// database/seed-head-nurse.js توضیح داده شده.
function headNurseWardsOf(hospitalId, userId) {
  return query(`SELECT id, title, icon, head_nurse_id, deputy1_id, deputy2_id FROM nursing_wards
    WHERE hospital_id = ? AND (head_nurse_id = ? OR deputy1_id = ? OR deputy2_id = ?)
    ORDER BY sort_order, created_at`, [hospitalId, userId, userId, userId]).rows;
}
// دسترسی مدیریتی کامل (مدیر پرستاری/ادمین) هم می‌تواند این صفحات را ببیند (نظارت)
function hnAccessWard(req, wardTitleOrId, byId) {
  const ward = byId
    ? query('SELECT * FROM nursing_wards WHERE id = ? AND hospital_id = ?', [wardTitleOrId, req.hospitalId]).rows[0]
    : query('SELECT * FROM nursing_wards WHERE title = ? AND hospital_id = ?', [wardTitleOrId, req.hospitalId]).rows[0];
  if (!ward) return { error: 'بخش یافت نشد', status: 404 };
  const uid_ = req.user.id;
  const isHead = ward.head_nurse_id === uid_;
  const isDeputy = ward.deputy1_id === uid_ || ward.deputy2_id === uid_;
  const isOverseer = nrsCanManage(req); // مدیر پرستاری/ادمین
  if (!isHead && !isDeputy && !isOverseer) return { error: 'دسترسی ندارید', status: 403 };
  return { ward, isHead, isDeputy, isOverseer };
}
function hnHeadPresentToday(hospitalId, ward, date) {
  const row = query('SELECT head_present FROM nursing_head_presence WHERE hospital_id = ? AND ward = ? AND p_date = ?',
    [hospitalId, ward, date]).rows[0];
  return row ? !!row.head_present : true; // پیش‌فرض: سرپرستار حاضر است
}
const HN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HN_SHIFT_TYPES = ['صبح', 'عصر', 'شب'];
const HN_LEAVE_STATUSES = ['در_انتظار', 'تأییدشده', 'ردشده'];

// ---- بخش‌های خودِ من (سرپرستار/جانشین) ----
router.get('/nursing/head/my-wards', authRequired, hospitalScope, (req, res) => {
  try {
    res.json({ wards: headNurseWardsOf(req.hospitalId, req.user.id) });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- روستر پرستاران یک بخش (برای حضور‌غیاب) ----
router.get('/nursing/head/roster', authRequired, hospitalScope, (req, res) => {
  const wardId = req.query.ward_id;
  if (!wardId) return res.status(400).json({ error: 'بخش الزامی است' });
  const acc = hnAccessWard(req, wardId, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  try {
    const nurses = query(`SELECT u.id, u.full_name FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.hospital_id = ? AND u.is_active = 1 AND u.department = ? ORDER BY u.full_name`,
      [req.hospitalId, acc.ward.title]).rows;
    res.json({ ward: acc.ward, nurses, can_edit: acc.isHead || acc.isDeputy || acc.isOverseer });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- ویرایش جانشین‌های بخش خودِ سرپرستار (نه کل بخش) ----
// PUT /nursing/wards/:id عمومی از قبل با manage_nursing_hierarchy محافظت می‌شود؛ اینجا یک
// مسیر جدا و محدودتر برای خودِ سرپرستار می‌سازیم تا مسیر ادمین دست‌نخورده بماند.
router.put('/nursing/head/wards/:id/deputies', authRequired, hospitalScope, (req, res) => {
  const acc = hnAccessWard(req, req.params.id, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  if (!acc.isHead && !acc.isOverseer) return res.status(403).json({ error: 'فقط سرپرستار بخش می‌تواند جانشین‌ها را تغییر دهد' });
  try {
    const b = req.body || {};
    const d1 = b.deputy1_id !== undefined ? nrsUserOrNull(b.deputy1_id, req.hospitalId) : undefined;
    const d2 = b.deputy2_id !== undefined ? nrsUserOrNull(b.deputy2_id, req.hospitalId) : undefined;
    query(`UPDATE nursing_wards SET
        deputy1_id = CASE WHEN ? THEN ? ELSE deputy1_id END,
        deputy2_id = CASE WHEN ? THEN ? ELSE deputy2_id END,
        updated_at = datetime('now') WHERE id = ?`,
      [d1 !== undefined ? 1 : 0, d1, d2 !== undefined ? 1 : 0, d2, acc.ward.id]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- پرچم «سرپرستار امروز حاضر است؟» ----
router.get('/nursing/head/presence', authRequired, hospitalScope, (req, res) => {
  const wardId = req.query.ward_id; const date = req.query.date || tehranTodayStr();
  const acc = hnAccessWard(req, wardId, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  res.json({ head_present: hnHeadPresentToday(req.hospitalId, acc.ward.title, date), date });
});
router.put('/nursing/head/presence', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  const acc = hnAccessWard(req, b.ward_id, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  const date = HN_DATE_RE.test(b.date) ? b.date : tehranTodayStr();
  const present = b.head_present ? 1 : 0;
  try {
    const ex = query('SELECT id FROM nursing_head_presence WHERE hospital_id = ? AND ward = ? AND p_date = ?',
      [req.hospitalId, acc.ward.title, date]).rows[0];
    if (ex) query(`UPDATE nursing_head_presence SET head_present = ?, set_by = ?, updated_at = datetime('now') WHERE id = ?`,
      [present, req.user.id, ex.id]);
    else query(`INSERT INTO nursing_head_presence (id, hospital_id, ward, p_date, head_present, set_by) VALUES (?,?,?,?,?,?)`,
      [uuid(), req.hospitalId, acc.ward.title, date, present, req.user.id]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- حضور‌غیاب روزانه ----
router.get('/nursing/head/attendance', authRequired, hospitalScope, (req, res) => {
  const wardId = req.query.ward_id; const date = req.query.date || tehranTodayStr();
  const acc = hnAccessWard(req, wardId, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  try {
    const nurses = query(`SELECT id, full_name FROM users
      WHERE hospital_id = ? AND is_active = 1 AND department = ? ORDER BY full_name`, [req.hospitalId, acc.ward.title]).rows;
    const att = query('SELECT nurse_id, present, note FROM nursing_daily_attendance WHERE hospital_id = ? AND ward = ? AND att_date = ?',
      [req.hospitalId, acc.ward.title, date]).rows;
    const byNurse = {}; att.forEach(a => byNurse[a.nurse_id] = a);
    res.json({ date, nurses: nurses.map(n => ({ ...n, present: byNurse[n.id] ? !!byNurse[n.id].present : null, note: byNurse[n.id]?.note || null })),
      head_present: hnHeadPresentToday(req.hospitalId, acc.ward.title, date) });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});
router.put('/nursing/head/attendance', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  const acc = hnAccessWard(req, b.ward_id, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  if (!acc.isHead && !acc.isDeputy && !acc.isOverseer) return res.status(403).json({ error: 'دسترسی ندارید' });
  if (!b.nurse_id) return res.status(400).json({ error: 'پرستار الزامی است' });
  const date = HN_DATE_RE.test(b.date) ? b.date : tehranTodayStr();
  const present = b.present ? 1 : 0;
  const note = b.note ? String(b.note).trim() : null;
  try {
    const nurse = query('SELECT id FROM users WHERE id = ? AND hospital_id = ? AND department = ?',
      [b.nurse_id, req.hospitalId, acc.ward.title]).rows[0];
    if (!nurse) return res.status(400).json({ error: 'این پرستار عضو این بخش نیست' });
    const ex = query('SELECT id FROM nursing_daily_attendance WHERE hospital_id = ? AND ward = ? AND att_date = ? AND nurse_id = ?',
      [req.hospitalId, acc.ward.title, date, nurse.id]).rows[0];
    if (ex) query(`UPDATE nursing_daily_attendance SET present = ?, note = ?, marked_by = ?, updated_at = datetime('now') WHERE id = ?`,
      [present, note, req.user.id, ex.id]);
    else query(`INSERT INTO nursing_daily_attendance (id, hospital_id, ward, att_date, nurse_id, present, note, marked_by)
      VALUES (?,?,?,?,?,?,?,?)`, [uuid(), req.hospitalId, acc.ward.title, date, nurse.id, present, note, req.user.id]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- درخواست مرخصی: ثبت (خودسرویسِ هر پرستار)، بررسی/تصمیم (سرپرستار/جانشین) ----
router.post('/nursing/leave-requests', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  const ward = req.user.department ? String(req.user.department).trim() : (b.ward ? String(b.ward).trim() : '');
  if (!ward) return res.status(400).json({ error: 'بخش شما مشخص نیست (فیلد department کاربر خالی است)' });
  if (!HN_DATE_RE.test(b.start_date) || !HN_DATE_RE.test(b.end_date)) return res.status(400).json({ error: 'بازه‌ی تاریخ نامعتبر است' });
  if (b.end_date < b.start_date) return res.status(400).json({ error: 'تاریخ پایان نباید قبل از شروع باشد' });
  try {
    const id = uuid();
    query(`INSERT INTO nursing_leave_requests (id, hospital_id, nurse_id, ward, start_date, end_date, reason, status)
      VALUES (?,?,?,?,?,?,?, 'در_انتظار')`,
      [id, req.hospitalId, req.user.id, ward, b.start_date, b.end_date, b.reason ? String(b.reason).trim() : null]);
    res.json({ item: { id } });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});
router.get('/nursing/leave-requests/mine', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(`SELECT l.*, ru.full_name as reviewed_by_name FROM nursing_leave_requests l
      LEFT JOIN users ru ON ru.id = l.reviewed_by
      WHERE l.hospital_id = ? AND l.nurse_id = ? ORDER BY l.created_at DESC`, [req.hospitalId, req.user.id]).rows;
    res.json({ items: rows });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});
router.get('/nursing/head/leave-requests', authRequired, hospitalScope, (req, res) => {
  const wardId = req.query.ward_id;
  const acc = hnAccessWard(req, wardId, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  try {
    const rows = query(`SELECT l.*, nu.full_name as nurse_name FROM nursing_leave_requests l
      JOIN users nu ON nu.id = l.nurse_id
      WHERE l.hospital_id = ? AND l.ward = ? ORDER BY (l.status = 'در_انتظار') DESC, l.created_at DESC`,
      [req.hospitalId, acc.ward.title]).rows;
    res.json({ items: rows });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});
router.put('/nursing/head/leave-requests/:id', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  try {
    const lr = query('SELECT * FROM nursing_leave_requests WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!lr) return res.status(404).json({ error: 'یافت نشد' });
    const acc = hnAccessWard(req, lr.ward, false);
    if (acc.error) return res.status(acc.status).json({ error: acc.error });
    if (!acc.isHead && !acc.isDeputy && !acc.isOverseer) return res.status(403).json({ error: 'دسترسی ندارید' });
    if (!HN_LEAVE_STATUSES.includes(b.status) || b.status === 'در_انتظار') return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    query(`UPDATE nursing_leave_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'),
        review_comment = ?, updated_at = datetime('now') WHERE id = ?`,
      [b.status, req.user.id, b.review_comment ? String(b.review_comment).trim() : null, lr.id]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- چک‌لیست/فهرست‌کار شیفت ----
router.get('/nursing/head/shift-tasks', authRequired, hospitalScope, (req, res) => {
  const wardId = req.query.ward_id; const date = req.query.date || tehranTodayStr();
  const acc = hnAccessWard(req, wardId, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  try {
    const rows = query(`SELECT shift_type, task_list, filled_by, filled_at, u.full_name as filled_by_name
      FROM nursing_shift_tasks t LEFT JOIN users u ON u.id = t.filled_by
      WHERE t.hospital_id = ? AND t.ward = ? AND t.shift_date = ?`, [req.hospitalId, acc.ward.title, date]).rows;
    const byType = {}; rows.forEach(r => byType[r.shift_type] = r);
    res.json({ date, shifts: HN_SHIFT_TYPES.map(st => ({ shift_type: st, ...(byType[st] || { task_list: null, filled_by: null, filled_by_name: null, filled_at: null }) })) });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});
router.put('/nursing/head/shift-tasks', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  const acc = hnAccessWard(req, b.ward_id, true);
  if (acc.error) return res.status(acc.status).json({ error: acc.error });
  if (!HN_SHIFT_TYPES.includes(b.shift_type)) return res.status(400).json({ error: 'نوع شیفت نامعتبر است' });
  const date = HN_DATE_RE.test(b.shift_date) ? b.shift_date : tehranTodayStr();
  // چه کسی مجاز به پرکردن است: اگر سرپرستار حاضر است فقط خودِ او، وگرنه هر جانشین
  const headPresent = hnHeadPresentToday(req.hospitalId, acc.ward.title, date);
  const allowed = acc.isOverseer || (headPresent ? acc.isHead : (acc.isHead || acc.isDeputy));
  if (!allowed) return res.status(403).json({ error: 'امروز مسئول پرکردن چک‌لیست این بخش نیستید' });
  const taskList = b.task_list !== undefined ? String(b.task_list).trim() : null;
  try {
    const ex = query('SELECT id FROM nursing_shift_tasks WHERE hospital_id = ? AND ward = ? AND shift_date = ? AND shift_type = ?',
      [req.hospitalId, acc.ward.title, date, b.shift_type]).rows[0];
    if (ex) query(`UPDATE nursing_shift_tasks SET task_list = ?, filled_by = ?, filled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [taskList, req.user.id, ex.id]);
    else query(`INSERT INTO nursing_shift_tasks (id, hospital_id, ward, shift_date, shift_type, task_list, filled_by, filled_at)
      VALUES (?,?,?,?,?,?,?, datetime('now'))`, [uuid(), req.hospitalId, acc.ward.title, date, b.shift_type, taskList, req.user.id]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[HeadNurse]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
