/**
 * Controlled Documents & Revisions Routes
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

// ===== مدارک کنترل‌شده (خط‌مشی / روش اجرایی / دستورالعمل) =====
const DOC_TYPES = ['policy', 'procedure', 'instruction'];
const DOC_STATUSES = ['draft', 'active', 'archived'];
const SIGNOFF_ROLES = ['preparer', 'approver', 'ratifier'];
// فیلدهای متنی قابل ویرایش سند — یک منبع واحد برای INSERT/UPDATE/اسنپ‌شات نسخه
const docCodes = require('../../services/doc-codes');

/**
 * ویرایش فرم‌ها: یا مجوز کاملِ manage_documents، یا دسترسی موردیِ
 * document_editors که مدیر اعتباربخشی به یک فرد مشخص داده است.
 * ساخت و حذفِ سند همچنان فقط با مجوز کامل انجام می‌شود؛ این میان‌افزار
 * عمداً فقط برای «ویرایش» است.
 */
function canEditDocuments(req, res, next) {
  const perms = (req.user && req.user.permissions) || [];
  const scope = scopeFor(req.user.role_code, perms);
  // مدیران کلان با دسترسی کامل به همه‌ی محورها
  if (scope === "*" || perms.includes("view_all_dashboards") || req.user.role_code === "admin") {
    return next();
  }
  // بررسی ویرایشگرهای موردی منتصب
  try {
    const ok = query(
      "SELECT 1 FROM document_editors WHERE hospital_id = ? AND user_id = ? AND revoked_at IS NULL",
      [req.user.hospital_id, req.user.id]).rows.length;
    if (ok) return next();
  } catch (e) { /* جدول هنوز ساخته نشده */ }

  // بررسی تطابق با دامنه‌ی تخصصی و سلسله‌مراتب سمتی
  try {
    const docId = req.params.id;
    if (docId) {
      const existing = getDoc(docId, req.hospitalId);
      if (existing) {
        let docAxis = null;
        if (existing.section_id) {
          const sec = query("SELECT code FROM accreditation_sections WHERE id = ?", [existing.section_id]).rows[0];
          if (sec) docAxis = axisCodeOf(sec.code);
        }
        if (!docAxis && existing.doc_code) {
          docAxis = axisCodeOf(existing.doc_code);
        }
        if (docAxis && Array.isArray(scope) && scope.includes(docAxis) && (perms.includes("manage_documents") || perms.includes("edit_measure_status"))) {
          return next();
        }
      }
    }
  } catch(e) {}

  return res.status(403).json({ error: "شما فقط مجاز به ویرایش اسناد در حیطه وظایف سازمانی خود هستید" });
}
const DOC_FIELDS = ['doc_type','title','doc_code','decree_text','issue_date','last_review_date','prepared_date','review_date',
  'purpose','scope','legal_references','definitions','resources','related_staff','responsible_person',
  'monitoring_method','work_method','related_documents','status','section_id'];

// existing (در ویرایش) باعث می‌شود فیلدهای NOT NULL که در بدنه نیامده‌اند مقدار فعلی سند را
// حفظ کنند؛ پیش از این doc_type غایب به NULL تبدیل می‌شد و به‌جای ۴۰۰/حفظ مقدار، خطای ۵۰۰
// «NOT NULL constraint failed» می‌داد.
function docBody(body, existing) {
  const out = {};
  for (const f of DOC_FIELDS) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]);
  if (!DOC_TYPES.includes(out.doc_type)) out.doc_type = (existing && existing.doc_type) || 'procedure';
  if (!DOC_STATUSES.includes(out.status)) out.status = (existing && existing.status) || 'draft';
  // گره درخت سراسری است (بدون hospital_id) — فقط وجود آن اعتبارسنجی می‌شود
  if (out.section_id && !query('SELECT id FROM accreditation_sections WHERE id = ?', [out.section_id]).rows[0]) {
    out.section_id = null;
  }
  return out;
}

function getDoc(id, hospitalId) {
  return query('SELECT * FROM controlled_documents WHERE id = ? AND hospital_id = ?', [id, hospitalId]).rows[0];
}

// فهرست با فیلتر نوع/وضعیت/جستجو در عنوان و کد مدرک
router.get('/documents', authRequired, requireAnyPermission('view_documents', 'manage_documents'), hospitalScope, (req, res) => {
  try {
    const where = ['d.hospital_id = ?'];
    const params = [req.hospitalId];
    if (req.query.doc_type && DOC_TYPES.includes(req.query.doc_type)) { where.push('d.doc_type = ?'); params.push(req.query.doc_type); }
    if (req.query.status && DOC_STATUSES.includes(req.query.status)) { where.push('d.status = ?'); params.push(req.query.status); }
    if (req.query.q) { where.push('(d.title LIKE ? OR IFNULL(d.doc_code, \'\') LIKE ?)'); params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    // فیلتر بر اساس گره درخت اعتباربخشی — پل «سنجه/محور ↔ سند»
    if (req.query.section_id) { where.push('d.section_id = ?'); params.push(req.query.section_id); }
    const result = query(`SELECT d.id, d.doc_type, d.title, d.doc_code, d.status, d.version_no, d.revision_no, d.issue_date,
      d.last_review_date, d.prepared_date, d.review_date, d.responsible_person, d.updated_at, d.section_id, d.is_example,
      u.full_name as created_by_name, sec.title as section_title, sec.code as section_code,
      (SELECT COUNT(*) FROM document_signoffs s WHERE s.document_id = d.id) as signoff_count,
      (SELECT COUNT(*) FROM document_signoffs s WHERE s.document_id = d.id AND s.signed_at IS NOT NULL) as signed_count
      FROM controlled_documents d LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN accreditation_sections sec ON d.section_id = sec.id
      WHERE ${where.join(' AND ')} ORDER BY d.updated_at DESC`, params);
    res.json({ documents: result.rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// جزئیات سند + جدول امضاها + تاریخچه نسخه‌ها
router.get('/documents/:id', authRequired, requireAnyPermission('view_documents', 'manage_documents'), hospitalScope, (req, res) => {
  try {
    const document = getDoc(req.params.id, req.hospitalId);
    if (!document) return res.status(404).json({ error: 'سند یافت نشد' });
    document.distribution_list = safeArray(document.distribution_list);
    if (document.section_id) {
      const sec = query('SELECT id, code, title, level_type FROM accreditation_sections WHERE id = ?', [document.section_id]).rows[0];
      document.section_title = sec ? (sec.title || sec.code) : null;
      document.section_code = sec ? sec.code : null;
    }
    const signoffs = query(`SELECT s.*, u.full_name as signed_by_name FROM document_signoffs s
      LEFT JOIN users u ON s.signed_by = u.id WHERE s.document_id = ? ORDER BY s.created_at`, [req.params.id]).rows;
    const versions = query(`SELECT v.id, v.version_no, v.revision_no, v.change_note, v.created_at, u.full_name as changed_by_name
      FROM document_versions v LEFT JOIN users u ON v.changed_by = u.id
      WHERE v.document_id = ? ORDER BY v.created_at DESC`, [req.params.id]).rows;
    res.json({ document, signoffs, versions });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/documents', authRequired, hospitalScope, async (req, res) => {
  const perms = (req.user && req.user.permissions) || [];
  const scope = scopeFor(req.user.role_code, perms);
  const isGlobalManager = scope === "*" || perms.includes("view_all_dashboards") || req.user.role_code === "admin";

  if (!isGlobalManager) {
    if (!perms.includes("manage_documents") && !perms.includes("edit_measure_status")) {
      return res.status(403).json({ error: "اجازه ایجاد یا ثبت سند را ندارید" });
    }
    let targetAxis = null;
    if (req.body.section_id) {
      const sec = query("SELECT code FROM accreditation_sections WHERE id = ?", [req.body.section_id]).rows[0];
      if (sec) targetAxis = axisCodeOf(sec.code);
    }
    if (!targetAxis && req.body.doc_code) {
      targetAxis = axisCodeOf(req.body.doc_code);
    }
    if (!targetAxis || !Array.isArray(scope) || !scope.includes(targetAxis)) {
      return res.status(403).json({ error: "شما فقط مجاز به ایجاد اسناد در حیطه وظایف سازمانی خود هستید" });
    }
  }

  const d = docBody(req.body);
  if (!d.title) return res.status(400).json({ error: "عنوان سند الزامی است" });
  try {
    const id = uuid();
    const versionNo = req.body.version_no ? Math.max(1, parseInt(req.body.version_no, 10) || 1) : 1;
    const revisionNo = req.body.revision_no !== undefined && req.body.revision_no !== null ? Math.max(0, parseInt(req.body.revision_no, 10) || 0) : 0;
    query(`INSERT INTO controlled_documents (id, hospital_id, ${DOC_FIELDS.join(", ")}, version_no, revision_no, distribution_list, created_by, updated_by)
      VALUES (${new Array(DOC_FIELDS.length + 7).fill("?").join(", ")})`,
      [id, req.hospitalId, ...DOC_FIELDS.map(f => d[f]), versionNo, revisionNo, JSON.stringify(req.body.distribution_list || []), req.user.id, req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: "document_created", targetTable: "controlled_documents", targetId: id, ipAddress: req.ip });
    res.json({ document: { id, version_no: versionNo, revision_no: revisionNo } });
  } catch (err) { res.status(500).json({ error: "خطای سرور" }); }
});

// هر ویرایش، نسخه قبلی را به‌صورت append-only در document_versions اسنپ‌شات می‌کند
router.put('/documents/:id', authRequired, hospitalScope, canEditDocuments, async (req, res) => {
  try {
    const existing = getDoc(req.params.id, req.hospitalId);
    if (!existing) return res.status(404).json({ error: 'سند یافت نشد' });
    const d = docBody(req.body, existing);
    if (!d.title) return res.status(400).json({ error: 'عنوان سند الزامی است' });

    const newVersionNo = req.body.version_no !== undefined && req.body.version_no !== null && req.body.version_no !== ''
      ? Math.max(1, parseInt(req.body.version_no, 10) || 1)
      : (existing.version_no || 1);

    const newRevisionNo = req.body.revision_no !== undefined && req.body.revision_no !== null && req.body.revision_no !== ''
      ? Math.max(0, parseInt(req.body.revision_no, 10) || 0)
      : ((existing.revision_no || 0) + 1);

    query(`INSERT INTO document_versions (id, hospital_id, document_id, version_no, revision_no, snapshot, change_note, changed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), req.hospitalId, existing.id, existing.version_no || 1, existing.revision_no || 0, JSON.stringify(existing), req.body.change_note || null, req.user.id]);

    // کد مدرک: مرحله‌ی اول دستی است، ولی از اولین ویرایش به بعد به شکل استاندارد نرمال می‌شود
    try { d.doc_code = docCodes.normalizeOnEdit(req.hospitalId, d, d.doc_code, existing.id); }
    catch (e) { /* اگر نرمال‌سازی نشد، کد دستیِ کاربر می‌ماند */ }

    query(`UPDATE controlled_documents SET ${DOC_FIELDS.map(f => f + ' = ?').join(', ')},
      distribution_list = ?, version_no = ?, revision_no = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ? AND hospital_id = ?`,
      [...DOC_FIELDS.map(f => d[f]), JSON.stringify(req.body.distribution_list || safeArray(existing.distribution_list)),
       newVersionNo, newRevisionNo, req.user.id, existing.id, req.hospitalId]);

    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'document_updated', targetTable: 'controlled_documents', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'updated', version_no: newVersionNo, revision_no: newRevisionNo,
               doc_code: d.doc_code, code_changed: d.doc_code !== existing.doc_code });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

/* ---------- تصدی سمت‌ها ----------
   «چه کسی، چه سمتی، از کِی تا کِی» — و برای هر سمت، ترتیب متصدیان. */
router.get('/tenures', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(
      `SELECT t.id, t.user_id, t.role_code, t.role_title, t.started_on, t.ended_on, t.note,
              u.full_name, u.is_active
         FROM role_tenures t JOIN users u ON u.id = t.user_id
        WHERE t.hospital_id = ?
        ORDER BY t.role_title, t.started_on DESC`, [req.hospitalId]).rows;
    // گروه‌بندی بر اساس سمت تا «مدیر پرستاری اول و دوم» کنار هم دیده شوند
    const byRole = {};
    for (const r of rows) {
      const k = r.role_title || r.role_code || 'بدون سمت';
      (byRole[k] = byRole[k] || { role_title: k, role_code: r.role_code, holders: [] }).holders.push(r);
    }
    const groups = Object.values(byRole)
      .map(g => ({ ...g, changed: g.holders.length > 1 }))
      .sort((a, b) => (b.holders.length - a.holders.length) || a.role_title.localeCompare(b.role_title, 'fa'));
    res.json({ groups, total: rows.length });
  } catch (err) { console.error('[Tenures]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// متصدیِ یک سمت در یک تاریخ مشخص — «این صورت‌جلسه مالِ دوره‌ی کدام مدیر بود؟»
router.get('/tenures/at', authRequired, hospitalScope, (req, res) => {
  try {
    const on = String(req.query.date || '').slice(0, 10);
    const code = req.query.role_code || null;
    if (!on) return res.status(400).json({ error: 'تاریخ الزامی است' });
    const rows = query(
      `SELECT t.role_code, t.role_title, t.started_on, t.ended_on, u.full_name, u.id AS user_id
         FROM role_tenures t JOIN users u ON u.id = t.user_id
        WHERE t.hospital_id = ? ${code ? 'AND t.role_code = ?' : ''}
          AND t.started_on <= ? AND (t.ended_on IS NULL OR t.ended_on >= ?)
        ORDER BY t.role_title`,
      code ? [req.hospitalId, code, on, on] : [req.hospitalId, on, on]).rows;
    res.json({ date: on, holders: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

/* ---------- ویرایشگران مجازِ فرم‌ها ----------
   مدیر اعتباربخشی می‌تواند به افراد مشخصی اجازه‌ی ویرایش فرم‌ها بدهد،
   بدون اینکه مجوز کاملِ manage_documents را به آن‌ها بسپارد. */
router.get('/document-editors', authRequired, requirePermission('manage_documents'), hospitalScope, (req, res) => {
  try {
    const granted = query(
      `SELECT e.id, e.user_id, e.granted_at, e.note, u.full_name, r.title_fa AS role_title
         FROM document_editors e JOIN users u ON u.id = e.user_id
         LEFT JOIN roles r ON r.id = u.role_id
        WHERE e.hospital_id = ? AND e.revoked_at IS NULL
        ORDER BY e.granted_at DESC`, [req.hospitalId]).rows;
    const candidates = query(
      `SELECT u.id, u.full_name, r.title_fa AS role_title
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.hospital_id = ? AND u.is_active = 1
        ORDER BY r.title_fa, u.full_name`, [req.hospitalId]).rows;
    res.json({ granted, candidates });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/document-editors', authRequired, requirePermission('manage_documents'), hospitalScope, async (req, res) => {
  try {
    const userId = req.body.user_id;
    const u = query('SELECT id, full_name FROM users WHERE id = ? AND hospital_id = ?', [userId, req.hospitalId]).rows[0];
    if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' });
    const dup = query('SELECT 1 FROM document_editors WHERE hospital_id = ? AND user_id = ? AND revoked_at IS NULL',
      [req.hospitalId, userId]).rows.length;
    if (dup) return res.status(409).json({ error: 'این کاربر از قبل دسترسی ویرایش فرم‌ها را دارد' });
    query(`INSERT INTO document_editors (id, hospital_id, user_id, granted_by, note)
           VALUES (?,?,?,?,?)`, [uuid(), req.hospitalId, userId, req.user.id, req.body.note || null]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'document_editor_granted',
      targetTable: 'document_editors', targetId: userId, ipAddress: req.ip });
    res.json({ status: 'granted', full_name: u.full_name });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/document-editors/:id', authRequired, requirePermission('manage_documents'), hospitalScope, async (req, res) => {
  try {
    // لغو دسترسی، حذف تاریخچه نیست — ردیف می‌ماند و فقط تاریخ لغو می‌خورد
    query("UPDATE document_editors SET revoked_at = datetime('now') WHERE id = ? AND hospital_id = ?",
      [req.params.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'document_editor_revoked',
      targetTable: 'document_editors', targetId: req.params.id, ipAddress: req.ip });
    res.json({ status: 'revoked' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

/* ---------- دفتر کد مدارک ----------
   صفحه‌ی مدیر اعتباربخشی: همه‌ی کدها، گروه‌بندی‌شده بر اساس نوع سند، با
   امکان ویرایش کد و یک دکمه‌ی «کد بعدی» که خودکار نام‌گذاری می‌کند. */
router.get('/doc-codes', authRequired, requirePermission('manage_documents'), hospitalScope, (req, res) => {
  try { res.json(docCodes.register(req.hospitalId)); }
  catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// کد استاندارد بعدی برای یک سند مشخص — بدون ذخیره، فقط پیشنهاد
router.get('/doc-codes/:id/next', authRequired, requirePermission('manage_documents'), hospitalScope, (req, res) => {
  try {
    const doc = getDoc(req.params.id, req.hospitalId);
    if (!doc) return res.status(404).json({ error: 'سند یافت نشد' });
    res.json({ code: docCodes.buildCode(req.hospitalId, doc, doc.doc_code, doc.id) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ثبت کد (دستی یا همان پیشنهادِ خودکار). فقط ستون doc_code را می‌نویسد تا
// ویرایش کد، نسخه‌ی سند را بالا نبرد.
router.put('/doc-codes/:id', authRequired, requirePermission('manage_documents'), hospitalScope, async (req, res) => {
  try {
    const doc = getDoc(req.params.id, req.hospitalId);
    if (!doc) return res.status(404).json({ error: 'سند یافت نشد' });
    let code = String(req.body.code || '').toUpperCase().trim();
    if (req.body.auto) code = docCodes.buildCode(req.hospitalId, doc, doc.doc_code, doc.id);
    if (!code) return res.status(400).json({ error: 'کد مدرک نمی‌تواند خالی باشد' });
    if (docCodes.isDuplicate(req.hospitalId, code, doc.id))
      return res.status(409).json({ error: `کد «${code}» قبلاً برای سند دیگری ثبت شده است` });
    query("UPDATE controlled_documents SET doc_code = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ? AND hospital_id = ?",
      [code, req.user.id, doc.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'document_code_updated',
      targetTable: 'controlled_documents', targetId: doc.id, ipAddress: req.ip });
    res.json({ status: 'updated', code });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/documents/:id', authRequired, requirePermission('manage_documents'), hospitalScope, async (req, res) => {
  try {
    const existing = getDoc(req.params.id, req.hospitalId);
    if (!existing) return res.status(404).json({ error: 'سند یافت نشد' });
    query('DELETE FROM controlled_documents WHERE id = ? AND hospital_id = ?', [existing.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'document_deleted', targetTable: 'controlled_documents', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// ردیف‌افزودنی جدول امضاها
router.post('/documents/:id/signoffs', authRequired, requirePermission('manage_documents'), hospitalScope, (req, res) => {
  const { person_name, position, signoff_role, user_id } = req.body;
  if (!person_name) return res.status(400).json({ error: 'نام و نام خانوادگی الزامی است' });
  try {
    const document = getDoc(req.params.id, req.hospitalId);
    if (!document) return res.status(404).json({ error: 'سند یافت نشد' });
    // کاربر تخصیص‌یافته باید عضو همین بیمارستان باشد (جلوگیری از IDOR/نشت نام کاربر بیمارستان دیگر)
    const safeUserId = user_id && query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [user_id, req.hospitalId]).rows[0] ? user_id : null;
    const id = uuid();
    query(`INSERT INTO document_signoffs (id, hospital_id, document_id, person_name, position, signoff_role, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, document.id, person_name, position || null,
       SIGNOFF_ROLES.includes(signoff_role) ? signoff_role : 'preparer', safeUserId]);
    res.json({ signoff: { id } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// «امضای من» — ثبت شناسه کاربر و مهر زمانی؛ امضای الکترونیکی رمزنگاری‌شده در این نسخه لازم نیست
router.post('/documents/signoffs/:signoffId/sign', authRequired, requireAnyPermission('view_documents', 'manage_documents'), hospitalScope, async (req, res) => {
  try {
    const row = query('SELECT * FROM document_signoffs WHERE id = ? AND hospital_id = ?', [req.params.signoffId, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'ردیف امضا یافت نشد' });
    if (row.signed_at) return res.status(400).json({ error: 'این ردیف قبلاً امضا شده است' });
    // ردیف تخصیص‌یافته به کاربر دیگر را فقط همان کاربر می‌تواند امضا کند
    if (row.user_id && row.user_id !== req.user.id) return res.status(403).json({ error: 'این ردیف به کاربر دیگری تخصیص یافته است' });
    // تصویر امضا در همین لحظه اسنپ‌شات می‌شود (نه ارجاع) — تغییر یا حذف بعدیِ نمونه‌ی امضا
    // نباید سندی را که قبلاً امضا شده تغییر دهد
    query("UPDATE document_signoffs SET signed_at = datetime('now'), signed_by = ?, user_id = COALESCE(user_id, ?), signature_image = ? WHERE id = ?",
      [req.user.id, req.user.id, signatureImageFor(req.user.id, req.hospitalId), row.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'document_signed', targetTable: 'document_signoffs', targetId: row.id, ipAddress: req.ip });
    res.json({ status: 'signed' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/documents/signoffs/:signoffId', authRequired, requirePermission('manage_documents'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id FROM document_signoffs WHERE id = ? AND hospital_id = ?', [req.params.signoffId, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'ردیف امضا یافت نشد' });
    query('DELETE FROM document_signoffs WHERE id = ?', [row.id]);
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// یک محتوای نسخه بایگانی‌شده (برای نمایش در «تاریخچه ویرایش‌ها»)
router.get('/documents/:id/versions/:versionId', authRequired, requireAnyPermission('view_documents', 'manage_documents'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT * FROM document_versions WHERE id = ? AND document_id = ? AND hospital_id = ?',
      [req.params.versionId, req.params.id, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'نسخه یافت نشد' });
    res.json({ version: { ...row, snapshot: parseJSON(row.snapshot, {}) } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// بارگذاری فایل سند آماده — همان الگوی آپلود شواهد فعالیت (فقط آخرین فایل نگهداری می‌شود)
router.post('/documents/:id/attachment', authRequired, requirePermission('manage_documents'), hospitalScope, uploadSingle('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
  try {
    const document = getDoc(req.params.id, req.hospitalId);
    if (!document) return res.status(404).json({ error: 'سند یافت نشد' });
    const isImage = req.file.mimetype.startsWith('image/');
    const filename = `${uuid()}.${isImage ? 'webp' : 'pdf'}`;
    const filePath = path.join(config.upload.dir, filename);
    if (isImage) await compressImage(req.file.buffer, filePath);
    else fs.writeFileSync(filePath, req.file.buffer);
    query('UPDATE controlled_documents SET attachment_file = ?, attachment_name = ? WHERE id = ? AND hospital_id = ?',
      [filename, req.file.originalname, document.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'document_file_uploaded', targetTable: 'controlled_documents', targetId: document.id, ipAddress: req.ip });
    res.json({ file: { filename, original_name: req.file.originalname } });
  } catch (err) {
    if (err.isUploadValidation) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'خطای سرور در آپلود' });
  }
});

// دانلود فایل پیوست سند — فایل‌ها زیر public سرو نمی‌شوند تا بین بیمارستان‌ها نشت نکنند
router.get('/documents/:id/attachment', authRequired, requireAnyPermission('view_documents', 'manage_documents'), hospitalScope, (req, res) => {
  try {
    const document = getDoc(req.params.id, req.hospitalId);
    if (!document || !document.attachment_file) return res.status(404).json({ error: 'فایلی یافت نشد' });
    sendStoredFile(res, document.attachment_file, document.attachment_name);
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
