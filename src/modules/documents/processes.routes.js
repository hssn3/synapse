/**
 * Processes Registry & Flowchart Routes
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

// ===== رجیستری فرآیندها / فلوچارت فرآیند — database/seed-processes.js =====
// فایل فلوچارت روی همان مسیر مشترک آپلود (storeUploadedFile/sendStoredFile) ذخیره می‌شود
// نمادهای استاندارد فلوچارت. کتاب «فلوچارت ساده و قابل فهم» می‌خواهد (ج-۲-۳-۱،
// ج-۲-۳-۱)، پس همان نمادهای متعارف: بیضی شروع/پایان، مستطیل اقدام، لوزی تصمیم
// (بله/خیر)، متوازی‌الاضلاع سند/فرم.
const PROC_STEP_TYPES = ['start', 'action', 'decision', 'document', 'end'];
const PROC_STATUSES = ['draft', 'approved', 'archived'];

// ذخیره‌ی یکجای گام‌ها. no_target_id فقط بعد از درجِ همه‌ی گام‌ها معنا دارد (ممکن است
// به گامی جلوتر اشاره کند)، پس در گذرِ دوم ست می‌شود. شناسه‌ها از کلاینت می‌آیند تا
// ارجاعِ «خیر» بین ذخیره‌ها پایدار بماند.
// ذخیره‌ی یکجای گام‌ها و یال‌ها. یال‌ها فقط بعد از درجِ همه‌ی گام‌ها معنا دارند
// (ممکن است به گامی جلوتر یا عقب‌تر اشاره کنند)، پس در گذرِ دوم نوشته می‌شوند.
// شناسه‌ها از کلاینت می‌آیند تا ارجاع‌ها بین ذخیره‌ها پایدار بماند.
const saveProcessSteps = db.transaction((processId, hospitalId, steps, links) => {
  query('DELETE FROM process_links WHERE process_id = ?', [processId]);
  query('DELETE FROM process_steps WHERE process_id = ?', [processId]);
  const list = (Array.isArray(steps) ? steps : []).filter(s => s && String(s.text || '').trim());
  const ids = new Set();
  list.forEach((s, i) => {
    const id = String(s.id || '').trim() || uuid();
    ids.add(id);
    const type = PROC_STEP_TYPES.includes(s.step_type) ? s.step_type : 'action';
    query(`INSERT INTO process_steps (id, hospital_id, process_id, step_type, text, owner, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, hospitalId, processId, type, String(s.text).trim().slice(0, 400),
       s.owner ? String(s.owner).trim().slice(0, 120) : null, i]);
    s._id = id;
  });

  // یال‌ها — فقط آن‌هایی که هر دو سرشان گامِ واقعیِ همین فرآیند است. یالِ به‌خود
  // (from === to) رد می‌شود چون در رسم حلقه‌ی بی‌معنا می‌سازد.
  const ls = Array.isArray(links) ? links : null;
  if (ls) {
    let order = 0;
    for (const l of ls) {
      if (!l) continue;
      const from = String(l.from || '').trim(), to = String(l.to || '').trim();
      if (!ids.has(from) || !ids.has(to) || from === to) continue;
      query(`INSERT INTO process_links (id, hospital_id, process_id, from_step_id, to_step_id, label, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), hospitalId, processId, from, to,
         l.label ? String(l.label).trim().slice(0, 60) : null, order++]);
    }
  }
});

function processSteps(processId) {
  return query('SELECT * FROM process_steps WHERE process_id = ? ORDER BY sort_order', [processId]).rows;
}
function processLinks(processId) {
  return query(`SELECT id, from_step_id as "from", to_step_id as "to", label
    FROM process_links WHERE process_id = ? ORDER BY sort_order`, [processId]).rows;
}

const PROC_DOMAINS = ['main', 'managerial', 'support'];
const PROC_FIELDS = ['title', 'domain', 'process_code', 'referring_person', 'compiled_date', 'description', 'section_id', 'next_review_date'];

function procBody(body, hospitalId) {
  const out = {};
  for (const f of PROC_FIELDS) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]);
  if (!PROC_DOMAINS.includes(out.domain)) out.domain = 'main';
  out.section_id = libSectionId(out.section_id);
  // ارجاع‌دهنده می‌تواند کاربر سامانه باشد یا فقط یک نام آزاد
  let ref = body.referring_user_id || null;
  if (ref && !query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [ref, hospitalId]).rows[0]) ref = null;
  out.referring_user_id = ref;
  return out;
}

// «مسئولین آگاهی» — فقط کاربران همین بیمارستان، بدون تکرار (کلید مرکب)
const saveNotifyUsers = db.transaction((processId, hospitalId, userIds) => {
  query('DELETE FROM process_notify_users WHERE process_id = ?', [processId]);
  const seen = new Set();
  for (const raw of userIds) {
    const uid = String(raw || '');
    if (!uid || seen.has(uid)) continue;
    if (!query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [uid, hospitalId]).rows[0]) continue;
    seen.add(uid);
    query('INSERT INTO process_notify_users (process_id, user_id) VALUES (?, ?)', [processId, uid]);
  }
});

function procNotifyUsers(processId) {
  return query(`SELECT n.user_id, u.full_name, u.department FROM process_notify_users n
    JOIN users u ON n.user_id = u.id WHERE n.process_id = ? ORDER BY u.full_name`, [processId]).rows;
}

// «شاخص‌های مربوط به فرآیند» (تصویر ۳۰) — اتصال به hospital_kpis
const saveProcessKpis = db.transaction((processId, hospitalId, kpiIds) => {
  query('DELETE FROM process_kpis WHERE process_id = ?', [processId]);
  const seen = new Set();
  for (const raw of kpiIds) {
    const kid = String(raw || '');
    if (!kid || seen.has(kid)) continue;
    if (!query('SELECT id FROM hospital_kpis WHERE id = ? AND hospital_id = ?', [kid, hospitalId]).rows[0]) continue;
    seen.add(kid);
    query('INSERT INTO process_kpis (process_id, kpi_id, hospital_id) VALUES (?, ?, ?)', [processId, kid, hospitalId]);
  }
});

function procKpis(processId) {
  return query(`SELECT k.id, k.title, k.indicator_type, k.desirability, k.measure_interval,
    k.upper_limit, k.lower_limit, k.target_value
    FROM process_kpis pk
    JOIN hospital_kpis k ON pk.kpi_id = k.id
    WHERE pk.process_id = ? ORDER BY k.title`, [processId]).rows;
}

// کاتالوگ شاخص‌ها برای مدال انتخاب شاخص فرآیند (تصویر ۳۰)
router.get('/processes/kpis-catalog', authRequired, requireAnyPermission('view_processes', 'manage_processes'), hospitalScope, (req, res) => {
  try {
    const q = req.query.q ? '%' + req.query.q + '%' : null;
    let sql = `SELECT id, title, indicator_type, desirability, measure_interval, upper_limit, lower_limit, target_value
      FROM hospital_kpis WHERE hospital_id = ? AND is_active = 1`;
    const params = [req.hospitalId];
    if (q) {
      sql += ' AND title LIKE ?';
      params.push(q);
    }
    sql += ' ORDER BY title ASC';
    const rows = query(sql, params).rows;
    res.json({ kpis: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/processes', authRequired, requireAnyPermission('view_processes', 'manage_processes'), hospitalScope, (req, res) => {
  try {
    const where = ['p.hospital_id = ?'];
    const params = [req.hospitalId];
    if (req.query.domain && PROC_DOMAINS.includes(req.query.domain)) { where.push('p.domain = ?'); params.push(req.query.domain); }
    if (req.query.section_id) { where.push('p.section_id = ?'); params.push(req.query.section_id); }
    if (req.query.q) { where.push('(p.title LIKE ? OR IFNULL(p.process_code, \'\') LIKE ? OR IFNULL(p.description, \'\') LIKE ?)');
      params.push('%' + req.query.q + '%', '%' + req.query.q + '%', '%' + req.query.q + '%'); }
    const rows = query(`SELECT p.*, u.full_name as referring_full_name, c.full_name as created_by_name,
      sec.title as section_title, sec.code as section_code,
      (SELECT COUNT(*) FROM process_notify_users n WHERE n.process_id = p.id) as notify_count,
      (SELECT COUNT(*) FROM process_steps s WHERE s.process_id = p.id) as step_count,
      (SELECT COUNT(*) FROM process_kpis pk WHERE pk.process_id = p.id) as kpi_count
      FROM processes p
      LEFT JOIN users u ON p.referring_user_id = u.id
      LEFT JOIN users c ON p.created_by = c.id
      LEFT JOIN accreditation_sections sec ON p.section_id = sec.id
      WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC`, params).rows;
    res.json({ processes: rows });
  } catch (err) { console.error('[Processes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/processes/:id', authRequired, requireAnyPermission('view_processes', 'manage_processes'), hospitalScope, (req, res) => {
  try {
    const row = query(`SELECT p.*, u.full_name as referring_full_name, sec.title as section_title, sec.code as section_code
      FROM processes p LEFT JOIN users u ON p.referring_user_id = u.id
      LEFT JOIN accreditation_sections sec ON p.section_id = sec.id
      WHERE p.id = ? AND p.hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'فرآیند یافت نشد' });
    if (row.approved_by) {
      const a = query('SELECT full_name FROM users WHERE id = ?', [row.approved_by]).rows[0];
      row.approved_by_name = a ? a.full_name : null;
    }
    res.json({
      process: row,
      notify_users: procNotifyUsers(row.id),
      steps: processSteps(row.id),
      links: processLinks(row.id),
      kpis: procKpis(row.id)
    });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/processes', authRequired, requirePermission('manage_processes'), hospitalScope, async (req, res) => {
  const p = procBody(req.body, req.hospitalId);
  if (!p.title) return res.status(400).json({ error: 'عنوان فرآیند الزامی است' });
  try {
    const id = uuid();
    const versionNo = req.body.version_no ? Math.max(1, parseInt(req.body.version_no, 10) || 1) : 1;
    const revisionNo = req.body.revision_no !== undefined ? Math.max(0, parseInt(req.body.revision_no, 10) || 0) : 0;
    query(`INSERT INTO processes (id, hospital_id, ${PROC_FIELDS.join(', ')}, version_no, revision_no, referring_user_id, created_by)
      VALUES (${new Array(PROC_FIELDS.length + 6).fill('?').join(', ')})`,
      [id, req.hospitalId, ...PROC_FIELDS.map(f => p[f]), versionNo, revisionNo, p.referring_user_id, req.user.id]);
    saveNotifyUsers(id, req.hospitalId, safeArray(req.body.notify_user_ids));
    if (req.body.kpi_ids !== undefined) saveProcessKpis(id, req.hospitalId, safeArray(req.body.kpi_ids));
    if (req.body.steps !== undefined) saveProcessSteps(id, req.hospitalId, req.body.steps, req.body.links);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'process_created', targetTable: 'processes', targetId: id, ipAddress: req.ip });
    res.json({ process: { id, version_no: versionNo, revision_no: revisionNo } });
  } catch (err) { console.error('[Processes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/processes/:id', authRequired, requirePermission('manage_processes'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT * FROM processes WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'فرآیند یافت نشد' });
    const p = procBody(req.body, req.hospitalId);
    if (!p.title) return res.status(400).json({ error: 'عنوان فرآیند الزامی است' });

    const CONTENT = ['title', 'domain', 'process_code', 'description', 'section_id', 'next_review_date'];
    const metaChanged = CONTENT.some(f => String(existing[f] == null ? '' : existing[f]) !== String(p[f] == null ? '' : p[f]));
    const stepsChanged = req.body.steps !== undefined;
    const changed = metaChanged || stepsChanged;
    const wasApproved = existing.status === 'approved';
    const revoke = changed && wasApproved;

    const newVersionNo = req.body.version_no !== undefined && req.body.version_no !== null && req.body.version_no !== ''
      ? Math.max(1, parseInt(req.body.version_no, 10) || 1)
      : (existing.version_no || 1);
    const newRevisionNo = req.body.revision_no !== undefined && req.body.revision_no !== null && req.body.revision_no !== ''
      ? Math.max(0, parseInt(req.body.revision_no, 10) || 0)
      : ((existing.revision_no || 0) + (changed ? 1 : 0));

    query(`UPDATE processes SET ${PROC_FIELDS.map(f => f + ' = ?').join(', ')}, referring_user_id = ?,
      version_no = ?, revision_no = ?,
      ${revoke ? "status = 'draft', approved_by = NULL, approved_at = NULL," : ''}
      updated_at = datetime('now') WHERE id = ? AND hospital_id = ?`,
      [...PROC_FIELDS.map(f => p[f]), p.referring_user_id, newVersionNo, newRevisionNo, existing.id, req.hospitalId]);
    // فهرست آگاهی فقط وقتی جایگزین می‌شود که در بدنه آمده باشد
    if (req.body.notify_user_ids !== undefined) saveNotifyUsers(existing.id, req.hospitalId, safeArray(req.body.notify_user_ids));
    if (req.body.kpi_ids !== undefined) saveProcessKpis(existing.id, req.hospitalId, safeArray(req.body.kpi_ids));
    if (stepsChanged) saveProcessSteps(existing.id, req.hospitalId, req.body.steps, req.body.links);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'process_updated', targetTable: 'processes', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'updated', version_no: newVersionNo, revision_no: newRevisionNo, approval_revoked: revoke });
  } catch (err) { console.error('[Processes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ابلاغ / لغو ابلاغ فرآیند.
// الف-۱-۴-۲: «فرایند‌های شناسایی شده، کدگذاری شده و پس از تصویب تیم رهبری …».
// فرآیندِ ابلاغ‌شده همان نسخه‌ای است که کارکنان روی دیوار می‌زنند و ارزیاب می‌بیند،
// پس دو شرط سختگیرانه دارد: باید کد داشته باشد و باید فلوچارتِ واقعی داشته باشد —
// ابلاغِ یک فرآیندِ بی‌گام یعنی ورقی خالی روی دیوار.
router.post('/processes/:id/approval', authRequired, requirePermission('manage_processes'), hospitalScope, async (req, res) => {
  try {
    const row = query('SELECT * FROM processes WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'فرآیند یافت نشد' });
    const approve = req.body.approve !== false;

    if (approve) {
      if (!row.process_code) return res.status(400).json({ error: 'برای ابلاغ، فرآیند باید کد داشته باشد (الف-۱-۴-۲: فرآیندها کدگذاری می‌شوند)' });
      const n = query('SELECT COUNT(*) as c FROM process_steps WHERE process_id = ?', [row.id]).rows[0];
      if (!n || !n.c) return res.status(400).json({ error: 'برای ابلاغ، فرآیند باید حداقل یک گام فلوچارت داشته باشد' });
      query(`UPDATE processes SET status = 'approved', approved_by = ?, approved_at = datetime('now'),
        updated_at = datetime('now') WHERE id = ?`, [req.user.id, row.id]);
    } else {
      query(`UPDATE processes SET status = 'draft', approved_by = NULL, approved_at = NULL,
        updated_at = datetime('now') WHERE id = ?`, [row.id]);
    }
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id,
      action: approve ? 'process_approved' : 'process_approval_revoked',
      targetTable: 'processes', targetId: row.id, ipAddress: req.ip });
    res.json({ status: approve ? 'approved' : 'draft' });
  } catch (err) { console.error('[Processes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// مدیریت مستقل فهرست «مسئولین آگاهی» (بدون ویرایش خود فرآیند)
router.put('/processes/:id/notify-users', authRequired, requirePermission('manage_processes'), hospitalScope, (req, res) => {
  try {
    const existing = query('SELECT id FROM processes WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'فرآیند یافت نشد' });
    saveNotifyUsers(existing.id, req.hospitalId, safeArray(req.body.notify_user_ids));
    res.json({ notify_users: procNotifyUsers(existing.id) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/processes/:id', authRequired, requirePermission('manage_processes'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT id FROM processes WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'فرآیند یافت نشد' });
    query('DELETE FROM process_notify_users WHERE process_id = ?', [existing.id]);
    query('DELETE FROM processes WHERE id = ?', [existing.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'process_deleted', targetTable: 'processes', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/processes/:id/file', authRequired, requirePermission('manage_processes'), hospitalScope, uploadSingle('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
  try {
    const row = query('SELECT id FROM processes WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'فرآیند یافت نشد' });
    const saved = await storeUploadedFile(req.file);
    query('UPDATE processes SET file_path = ?, file_name = ?, file_size_bytes = ? WHERE id = ? AND hospital_id = ?',
      [saved.filename, req.file.originalname, saved.size, row.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'process_file_uploaded', targetTable: 'processes', targetId: row.id, ipAddress: req.ip });
    res.json({ file: { filename: saved.filename, original_name: req.file.originalname, size: saved.size } });
  } catch (err) {
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    console.error('[Process upload]', err);
    res.status(500).json({ error: 'خطای سرور در آپلود' });
  }
});

router.get('/processes/:id/file', authRequired, requireAnyPermission('view_processes', 'manage_processes'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT file_path, file_name FROM processes WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!row || !row.file_path) return res.status(404).json({ error: 'فایلی یافت نشد' });
    sendStoredFile(res, row.file_path, row.file_name);
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
