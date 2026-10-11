/**
 * Accreditation Corrective Actions Routes
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


/* ---------- چرخه‌ی عدم انطباق و اقدام اصلاحی روی سنجه ----------
 * سند مرجع (بخش ۹): سنجه → عدم انطباق → علت → اقدام اصلاحی → مسئول/مهلت
 * → پیشرفت → مدرک → راستی‌آزمایی → تأیید/رد → بستن. جدولش در
 * database/seed-corrective-actions.js است.
 *
 * مجوزها همان‌هایی است که خودِ سنجه دارد: edit_measure_status برای ساخت و
 * پیشبردِ اقدام (کسی که سنجه را پر می‌کند)، approve_measure_status برای
 * راستی‌آزمایی/تأیید/رد/بستن (همان نقش‌هایی که نمره‌ی داخلی/بیرونی می‌دهند).
 * دو مجوزِ تازه ساخته نشد چون این دقیقاً همان تفکیکِ نقشی است که سنجه از قبل
 * دارد؛ مجوزِ سوم یعنی دو منبع حقیقت برای یک مرز.
 */
const MCA_STATUSES = ['جدید', 'در حال بررسی', 'اقدام تعریف‌شده', 'در حال اجرا',
  'در انتظار راستی‌آزمایی', 'ردشده', 'تأییدشده', 'بسته‌شده'];
const MCA_PRIORITIES = ['پایین', 'متوسط', 'بالا', 'بحرانی'];
// وضعیتی که فقط با approve_measure_status قابل رسیدن است — راستی‌آزمایی و
// بستن، دقیقاً طبق قاعده‌ی سند: «بازگشت از تأیید فقط با مجوز و دلیل».
const MCA_REVIEWER_ONLY = new Set(['تأییدشده', 'ردشده', 'بسته‌شده']);
// گذارهای مجاز — کوتاه‌مدارِ خارج از این نقشه رد می‌شود، نه با یک متنِ عمومی
// «وضعیت نامعتبر». ردشده می‌تواند به «در حال اجرا» برگردد تا اصلاح شود.
const MCA_TRANSITIONS = {
  'جدید': ['در حال بررسی'],
  'در حال بررسی': ['اقدام تعریف‌شده'],
  'اقدام تعریف‌شده': ['در حال اجرا'],
  'در حال اجرا': ['در انتظار راستی‌آزمایی'],
  'در انتظار راستی‌آزمایی': ['تأییدشده', 'ردشده'],
  'ردشده': ['در حال اجرا'],
  'تأییدشده': ['بسته‌شده'],
  'بسته‌شده': [],
};

function mcaMeasureScoped(req, measureId) {
  const m = query('SELECT id, code FROM accreditation_sections WHERE id = ?', [measureId]).rows[0];
  if (!m) return null;
  const scope = scopeFor(req.user.role_code, req.user.permissions);
  if (!measureAllowed(scope, m, loadOverrides(req.user.id))) return false;
  return m;
}

router.get('/accreditation/measures/:measureId/corrective-actions', authRequired,
  requireAnyPermission('edit_measure_status', 'approve_measure_status', 'view_accreditation_full_tree'),
  hospitalScope, (req, res) => {
    try {
      const m = mcaMeasureScoped(req, req.params.measureId);
      if (m === null) return res.status(404).json({ error: 'سنجه یافت نشد' });
      if (m === false) return res.status(403).json({ error: 'این سنجه خارج از دامنه دسترسی شماست' });
      const rows = query(
        `SELECT a.*, u.full_name AS responsible_name, v.full_name AS verifier_name
         FROM measure_corrective_actions a
         LEFT JOIN users u ON u.id = a.responsible_user_id
         LEFT JOIN users v ON v.id = a.verifier_user_id
         WHERE a.hospital_id = ? AND a.measure_id = ? ORDER BY a.created_at DESC`,
        [req.hospitalId, req.params.measureId]).rows;
      res.json({ actions: rows });
    } catch (err) { console.error('[CorrectiveActions/list]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

router.post('/accreditation/measures/:measureId/corrective-actions', authRequired,
  requirePermission('edit_measure_status'), hospitalScope, async (req, res) => {
    try {
      const m = mcaMeasureScoped(req, req.params.measureId);
      if (m === null) return res.status(404).json({ error: 'سنجه یافت نشد' });
      if (m === false) return res.status(403).json({ error: 'این سنجه خارج از دامنه دسترسی شماست' });
      const b = req.body || {};
      const title = String(b.title || '').trim();
      if (!title) return res.status(400).json({ error: 'عنوانِ عدم انطباق الزامی است' });
      const priority = MCA_PRIORITIES.includes(b.priority) ? b.priority : 'متوسط';
      if (b.responsible_user_id) {
        const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ?',
          [b.responsible_user_id, req.hospitalId]).rows[0];
        if (!u) return res.status(400).json({ error: 'مسئولِ انتخاب‌شده نامعتبر است' });
      }
      const year = statusYear(req);
      const id = uuid();
      query(`INSERT INTO measure_corrective_actions
               (id, hospital_id, measure_id, year, title, description, root_cause, action_text,
                responsible_user_id, department, priority, start_date, due_date, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'جدید', ?)`,
        [id, req.hospitalId, req.params.measureId, year, title.slice(0, 255),
          b.description || null, b.root_cause || null, b.action_text || null,
          b.responsible_user_id || null, b.department || null, priority,
          b.start_date || null, b.due_date || null, req.user.id]);
      query(`INSERT INTO measure_corrective_action_history (id, action_id, from_status, to_status, changed_by)
             VALUES (?, ?, NULL, 'جدید', ?)`, [uuid(), id, req.user.id]);
      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'measure_nonconformity_open',
        entityType: 'measure_corrective_actions', entityId: id, details: `${m.code} — ${title}` });
      res.status(201).json({ id, status: 'created' });
    } catch (err) { console.error('[CorrectiveActions/create]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// null = رکورد نیست، false = رکورد هست ولی سنجه‌اش خارج از دامنه‌ی نقشِ کاربر است
function mcaOwn(req, id) {
  const row = query('SELECT a.*, m.code, m.id AS m_id FROM measure_corrective_actions a JOIN accreditation_sections m ON m.id = a.measure_id WHERE a.id = ? AND a.hospital_id = ?',
    [id, req.hospitalId]).rows[0];
  if (!row) return null;
  const scope = scopeFor(req.user.role_code, req.user.permissions);
  if (!measureAllowed(scope, { id: row.m_id, code: row.code }, loadOverrides(req.user.id))) return false;
  return row;
}

// ویرایشِ محتوا (نه وضعیت) — علت، اقدام، مسئول، مهلت، درصدِ پیشرفت، مدرک.
// همان مجوزِ ساخت، چون این کسی است که دارد اقدام را واقعاً پیش می‌برد.
router.put('/corrective-actions/:id', authRequired, requirePermission('edit_measure_status'), hospitalScope,
  async (req, res) => {
    try {
      const row = mcaOwn(req, req.params.id);
      if (row === null) return res.status(404).json({ error: 'اقدام اصلاحی یافت نشد' });
      if (row === false) return res.status(403).json({ error: 'این سنجه خارج از دامنه دسترسی شماست' });
      if (['بسته‌شده', 'تأییدشده'].includes(row.status)) {
        return res.status(409).json({ error: 'اقدامِ تأییدشده/بسته‌شده دیگر قابل ویرایش نیست' });
      }
      const b = req.body || {};
      if (b.responsible_user_id) {
        const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ?',
          [b.responsible_user_id, req.hospitalId]).rows[0];
        if (!u) return res.status(400).json({ error: 'مسئولِ انتخاب‌شده نامعتبر است' });
      }
      const progress = b.progress_percent === undefined ? row.progress_percent
        : Math.max(0, Math.min(100, parseInt(b.progress_percent, 10) || 0));
      const priority = MCA_PRIORITIES.includes(b.priority) ? b.priority : row.priority;
      query(`UPDATE measure_corrective_actions SET
               title = ?, description = ?, root_cause = ?, action_text = ?,
               responsible_user_id = ?, department = ?, priority = ?,
               start_date = ?, due_date = ?, progress_percent = ?, evidence_note = ?,
               updated_at = datetime('now')
             WHERE id = ?`,
        [String(b.title || row.title).slice(0, 255), b.description ?? row.description,
          b.root_cause ?? row.root_cause, b.action_text ?? row.action_text,
          b.responsible_user_id ?? row.responsible_user_id, b.department ?? row.department, priority,
          b.start_date ?? row.start_date, b.due_date ?? row.due_date, progress,
          b.evidence_note ?? row.evidence_note, row.id]);
      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'measure_corrective_action_update',
        entityType: 'measure_corrective_actions', entityId: row.id, details: row.code });
      res.json({ status: 'updated' });
    } catch (err) { console.error('[CorrectiveActions/update]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// گذارِ وضعیت — تنها مسیرِ تغییرِ status. قاعده‌ی سند اینجا اجرا می‌شود: هر
// گذار باید در نقشه باشد، و رسیدن/رد/بستن فقط با approve_measure_status.
router.post('/corrective-actions/:id/transition', authRequired,
  requireAnyPermission('edit_measure_status', 'approve_measure_status'), hospitalScope, async (req, res) => {
    try {
      const row = mcaOwn(req, req.params.id);
      if (row === null) return res.status(404).json({ error: 'اقدام اصلاحی یافت نشد' });
      if (row === false) return res.status(403).json({ error: 'این سنجه خارج از دامنه دسترسی شماست' });
      const to = req.body && req.body.status;
      if (!MCA_STATUSES.includes(to)) return res.status(400).json({ error: 'وضعیتِ مقصد نامعتبر است' });
      const allowedNext = MCA_TRANSITIONS[row.status] || [];
      if (!allowedNext.includes(to)) {
        return res.status(409).json({ error: `از وضعیتِ «${row.status}» نمی‌توان مستقیم به «${to}» رفت` });
      }
      if (MCA_REVIEWER_ONLY.has(to) && !(req.user.permissions || []).includes('approve_measure_status')) {
        return res.status(403).json({ error: 'این گذار فقط با مجوزِ راستی‌آزماییِ سنجه ممکن است' });
      }
      // بستن بدون تکلیف‌های لازم ممنوع است: فقط از «تأییدشده» می‌توان بست،
      // یعنی راستی‌آزمایی واقعاً رخ داده — همان قیدی که سند صریح می‌خواهد.
      if (to === 'بسته‌شده' && row.status !== 'تأییدشده') {
        return res.status(409).json({ error: 'فقط اقدامِ تأییدشده قابل بستن است' });
      }
      const note = req.body.note ? String(req.body.note).trim().slice(0, 500) : null;
      // بازگشتِ ردشده به اجرا بدون دلیل یعنی گم‌شدنِ اینکه چرا رد شده بود.
      if (row.status === 'ردشده' && to === 'در حال اجرا' && !note) {
        return res.status(400).json({ error: 'برای بازگشت از «ردشده»، ثبتِ توضیح الزامی است' });
      }

      const set = ["status = ?", "updated_at = datetime('now')"];
      const vals = [to];
      if (to === 'تأییدشده' || to === 'ردشده') {
        set.push('verifier_user_id = ?', 'verification_result = ?', 'verification_note = ?', "verified_at = datetime('now')");
        vals.push(req.user.id, to, note);
      }
      if (to === 'بسته‌شده') { set.push('closed_by = ?', "closed_at = datetime('now')"); vals.push(req.user.id); }
      vals.push(row.id);
      query(`UPDATE measure_corrective_actions SET ${set.join(', ')} WHERE id = ?`, vals);
      query(`INSERT INTO measure_corrective_action_history (id, action_id, from_status, to_status, note, changed_by)
             VALUES (?, ?, ?, ?, ?, ?)`, [uuid(), row.id, row.status, to, note, req.user.id]);

      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'measure_corrective_action_transition',
        entityType: 'measure_corrective_actions', entityId: row.id, details: `${row.code}: ${row.status} → ${to}` });
      res.json({ status: to });
    } catch (err) { console.error('[CorrectiveActions/transition]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

router.get('/corrective-actions/:id/history', authRequired,
  requireAnyPermission('edit_measure_status', 'approve_measure_status', 'view_accreditation_full_tree'),
  hospitalScope, (req, res) => {
    try {
      const row = mcaOwn(req, req.params.id);
      if (row === null) return res.status(404).json({ error: 'اقدام اصلاحی یافت نشد' });
      if (row === false) return res.status(403).json({ error: 'این سنجه خارج از دامنه دسترسی شماست' });
      const hist = query(
        `SELECT h.from_status, h.to_status, h.note, h.changed_at, u.full_name AS changed_by_name
         FROM measure_corrective_action_history h LEFT JOIN users u ON u.id = h.changed_by
         WHERE h.action_id = ? ORDER BY h.changed_at`, [row.id]).rows;
      res.json({ history: hist });
    } catch (err) { console.error('[CorrectiveActions/history]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

/* ---------- روش ارزیابی هر سنجه ----------
   مقدار اولیه از استنتاج کلیدواژه‌ای می‌آید و eval_source='inferred' است؛
   با اولین ویرایش انسانی 'confirmed' می‌شود و migration دیگر دستش نمی‌زند.
   ویرایش، مجوز manage_documents می‌خواهد (همان مجوز مدیر اعتباربخشی): این
   یک واقعیتِ کتاب است، نه قضاوتِ روزمره‌ی هر کاربر. */
router.put('/accreditation/eval-method/:measureId', authRequired,
  requirePermission('manage_documents'), hospitalScope, (req, res) => {
  try {
    const m = query("SELECT id FROM accreditation_sections WHERE id = ? AND level_type = 'measure'",
      [req.params.measureId]).rows[0];
    if (!m) return res.status(404).json({ error: 'سنجه یافت نشد' });
    const b = req.body || {};
    // مستندات همیشه روشن می‌ماند: هر سنجه‌ای دست‌کم یک ردّ مکتوب لازم دارد،
    // و خاموش کردن هر سه یعنی «این سنجه اصلاً راستی‌آزمایی نمی‌شود».
    const doc = 1;
    const obs = b.eval_obs ? 1 : 0;
    const itv = b.eval_itv ? 1 : 0;
    query(`UPDATE accreditation_sections
              SET eval_doc = ?, eval_obs = ?, eval_itv = ?, eval_source = 'confirmed'
            WHERE id = ?`, [doc, obs, itv, m.id]);
    res.json({ ok: true, eval_doc: doc, eval_obs: obs, eval_itv: itv, eval_source: 'confirmed' });
  } catch (err) { console.error('[EvalMethod]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

/* ضریب وزنی سطح سنجه — از platform_settings، نه از کد. کلاینت همین را
   می‌خواند تا محاسبه‌ی سمت مرورگر و سمت سرور یکی بماند. */
const scoringWeights = require('../../../database/seed-scoring-weights');
router.get('/accreditation/scoring', authRequired, (req, res) => {
  try { res.json({ level_weights: scoringWeights.read() }); }
  catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// Accreditation dashboard
router.get('/accreditation/dashboard', authRequired, hospitalScope, (req, res) => {
  try {
    const overall = query(`SELECT
      SUM(CASE WHEN ms.status = 'full_compliant' THEN 1 ELSE 0 END) as full_compliant,
      SUM(CASE WHEN ms.status = 'partial' THEN 1 ELSE 0 END) as partial,
      SUM(CASE WHEN ms.status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant,
      SUM(CASE WHEN ms.status IS NULL OR ms.status = 'not_reviewed' THEN 1 ELSE 0 END) as not_reviewed,
      SUM(CASE WHEN ms.status = 'not_applicable' THEN 1 ELSE 0 END) as not_applicable,
      -- سنجه‌ی غیرقابل ارزیابی در total نمی‌آید: مخرجِ درصد آمادگی باید فقط
      -- سنجه‌هایی باشد که این مرکز واقعاً می‌تواند رویشان ارزیابی شود.
      SUM(CASE WHEN ms.status = 'not_applicable' THEN 0 ELSE 1 END) as total
      FROM accreditation_sections m LEFT JOIN measure_status ms ON ms.measure_id = m.id AND ms.hospital_id = ? AND ms.year = ?
      WHERE m.level_type = 'measure'`, [req.hospitalId, statusYear(req)]).rows[0];
    res.json({ overall });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
