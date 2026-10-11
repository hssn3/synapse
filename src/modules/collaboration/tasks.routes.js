/**
 * Collaboration Tasks & Trends Routes
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

// ===== روند ثبت‌ها =====
// period=month|quarter|year روی سال شمسی + compareYear برای مقایسه‌ی دو سال.
// برای هر ماژول یک کوئری (خارج از حلقه‌ی بازه‌ها) زده و نتیجه در JS بین سطل‌ها توزیع می‌شود.
router.get('/reports/trend', authRequired, hospitalScope, (req, res) => {
  try {
    const period = ['month', 'quarter', 'year'].includes(req.query.period) ? req.query.period : 'month';
    const y = safeYear(req.query.year) || todayJalali().jy;
    const compare = safeYear(req.query.compareYear);

    const SOURCES = [
      ['minutes', `SELECT date(m.meeting_date) as d FROM committee_meeting_minutes m
                     JOIN committees c ON m.committee_id = c.id WHERE c.hospital_id = ?`],
      ['meetings', `SELECT date(e.event_date) as d FROM calendar_events e
                      WHERE e.hospital_id = ? AND e.event_type = 'committee_meeting'`],
      ['checklists', `SELECT date(s.submitted_at) as d FROM checklist_submissions s WHERE s.hospital_id = ?`],
      ['activities', `SELECT date(ar.created_at) as d FROM activity_records ar WHERE ar.hospital_id = ?`],
      ['errors', `SELECT date(created_at) as d FROM medical_error_reports WHERE hospital_id = ?`],
      ['fmea', `SELECT date(submitted_at) as d FROM fmea_records WHERE hospital_id = ?`],
      ['audits', `SELECT date(IFNULL(audit_date, created_at)) as d FROM internal_audits WHERE hospital_id = ?`],
    ];
    const METRICS = SOURCES.map(s => s[0]);
    const iso = g => `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;

    const buildBuckets = (year) => {
      const buckets = [];
      const push = (label, start, end) => {
        const b = { label, start, end };
        for (const k of METRICS) b[k] = 0;
        buckets.push(b);
      };
      if (period === 'month') {
        for (let m = 1; m <= 12; m++) { const r = jalaliMonthRange(year, m); push(JMONTHS[m - 1], r.start, r.end); }
      } else if (period === 'quarter') {
        for (let q = 1; q <= 4; q++) {
          const s = jalaliMonthRange(year, (q - 1) * 3 + 1).start;
          const e = jalaliMonthRange(year, q * 3).end; // انتهای ماه سوم فصل — برای فصل ۴ همان انتهای سال
          push(`سه‌ماهه ${q}`, s, e);
        }
      } else {
        for (let yy = Math.max(year - 3, 1390); yy <= year; yy++) { const r = jalaliYearRange(yy); push(`سال ${yy}`, r.start, r.end); }
      }
      // پنجره‌ی کوئری = کل بازه‌ی سطل‌ها (برای period=year چند سال است، نه فقط یک سال)
      const from = buckets[0].start, to = buckets[buckets.length - 1].end;
      for (const [key, sql] of SOURCES) {
        for (const row of query(`SELECT d FROM (${sql}) WHERE d >= ? AND d < ?`, [req.hospitalId, from, to]).rows) {
          const b = buckets.find(x => row.d >= x.start && row.d < x.end);
          if (b) b[key]++;
        }
      }
      return buckets;
    };

    const out = { period, year: y, metrics: METRICS, buckets: buildBuckets(y) };
    if (compare) out.compare = { year: compare, buckets: buildBuckets(compare) };
    res.json(out);
  } catch (err) { console.error('[Trend]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/calendar/events', authRequired, requirePermission('manage_calendar_events'), hospitalScope, (req, res) => {
  const { title, description, event_date, is_recurring, recurrence_rule, reminder_days_before } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'عنوان و تاریخ الزامی است' });
  try {
    const id = uuid();
    query(`INSERT INTO calendar_events (id, hospital_id, title, description, event_date, is_recurring, recurrence_rule, reminder_days_before, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, title, description||null, event_date, is_recurring?1:0, recurrence_rule||null, reminder_days_before||1, req.user.id]);
    res.json({ event: { id } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== Tasks =====
router.get('/tasks', authRequired, hospitalScope, (req, res) => {
  try {
    let sql = `SELECT t.*, ab.full_name as assigned_by_name, atu.full_name as assigned_to_name
      FROM tasks t JOIN users ab ON t.assigned_by = ab.id JOIN users atu ON t.assigned_to = atu.id
      WHERE t.hospital_id = ?`;
    const params = [req.hospitalId];
    if (!req.user.permissions.includes('view_all_tasks')) { sql += ' AND t.assigned_to = ?'; params.push(req.user.id); }
    sql += ' ORDER BY t.created_at DESC LIMIT 300'; // سقف ایمن برای مقیاس‌پذیری با رشد تعداد وظایف در طول زمان
    const result = query(sql, params);
    res.json({ tasks: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/tasks', authRequired, requirePermission('assign_tasks'), hospitalScope, (req, res) => {
  const { title, description, assigned_to, due_date } = req.body;
  if (!title || !assigned_to) return res.status(400).json({ error: 'عنوان و مسئول الزامی است' });
  try {
    // مسئول وظیفه باید کاربر همین بیمارستان باشد — وگرنه IDOR: تخصیص وظیفه به شناسه‌ی کاربرِ بیمارستان دیگر
    if (!query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [assigned_to, req.hospitalId]).rows[0]) {
      return res.status(400).json({ error: 'مسئول انتخاب‌شده نامعتبر است' });
    }
    const id = uuid();
    query(`INSERT INTO tasks (id, hospital_id, title, description, assigned_by, assigned_to, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, title, description||null, req.user.id, assigned_to, due_date||null]);
    res.json({ task: { id } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/tasks/:id/status', authRequired, hospitalScope, (req, res) => {
  const { status } = req.body;
  if (!['assigned', 'in_progress', 'completed', 'overdue'].includes(status)) return res.status(400).json({ error: 'وضعیت نامعتبر' });
  try {
    // جلوگیری از تغییر وظایف بیمارستان دیگر (IDOR) و محدود کردن به مسئول وظیفه یا دارنده مجوز مدیریت همه وظایف
    const existing = query('SELECT id, assigned_to FROM tasks WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'وظیفه یافت نشد' });
    const isOwner = existing.rows[0].assigned_to === req.user.id;
    if (!isOwner && !req.user.permissions.includes('view_all_tasks') && !req.user.permissions.includes('assign_tasks')) {
      return res.status(403).json({ error: 'دسترسی ندارید' });
    }
    query('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ? AND hospital_id = ?', [status, status === 'completed' ? new Date().toISOString() : null, req.params.id, req.hospitalId]);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
