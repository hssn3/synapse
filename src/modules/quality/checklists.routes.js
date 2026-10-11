/**
 * Quality Checklists Bank Routes
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
  indJudge,
  indRow
} = common;

// Helper to bind mountCrud to this module router
const mountCrud = (prefix, ...args) => common.mountCrud(router, prefix, ...args);

// ===== بانک چک‌لیست‌ها / ساخت چک‌لیست =====
// تناوبِ پایش — چرا و چگونه در src/services/checklist-cadence.js توضیح داده شده
const { CADENCES: CL_CADENCES, CADENCE_FA: CL_CADENCE_FA, checklistStatus } = require('../../services/checklist-cadence');

const CL_COMPLETION_TYPES = ['per_patient', 'per_staff', 'per_department', 'per_shift', 'general'];
const CL_STATUSES = ['draft', 'active', 'archived'];
const CL_ANSWER_TYPES = ['likert5', 'yes_no'];
// ارزش عددی هر گزینه برای نمره‌دهی
const CL_ANSWER_VALUES = {
  likert5: { empty: 0, low: 1, medium: 2, good: 3, excellent: 4 },
  yes_no: { no: 0, yes: 1 },
};
// برچسب فارسی گزینه‌ها (برای خروجی CSV) — معادل CL_OPTIONS در public/js/app.js
const CL_ANSWER_LABELS = {
  likert5: { empty: 'خالی', low: 'کم', medium: 'متوسط', good: 'خوب', excellent: 'عالی' },
  yes_no: { no: 'خیر', yes: 'بله' },
};
// پاسخ‌هایی که «عدم انطباق» شمرده می‌شوند. کتاب فقط پر شدن چک‌لیست را نمی‌خواهد،
// اصلاحِ یافته‌ها را می‌خواهد: «چک لیستی … تدوین و بررسی دوره‌ای آن … انجام و
// موارد عدم انطباق اصلاح شود» (الف-۲-۲-۵). پس اول باید معلوم شود کدام پاسخ
// عدم انطباق است تا بتوان برایش اقدام اصلاحی ساخت.
// از روی خودِ پاسخ استنتاج می‌شود نه یک فیلد جدا، تا پاسخ‌نامه‌های قبلی هم
// بدون مهاجرت داده، یافته‌هایشان معلوم شود.
const CL_NONCONFORMITY = { yes_no: ['no'], likert5: ['empty', 'low'] };
function isNonConformity(answerType, answer) {
  return (CL_NONCONFORMITY[answerType] || CL_NONCONFORMITY.likert5).includes(String(answer || ''));
}
const CL_FIELDS = ['title', 'checklist_code', 'completion_type', 'purpose', 'baseline_info', 'status', 'section_id', 'cadence', 'parent_document_id'];

function clBody(body, hospitalId) {
  const out = {};
  for (const f of CL_FIELDS) out[f] = body[f] === undefined || body[f] === '' ? null : String(body[f]);
  if (!CL_COMPLETION_TYPES.includes(out.completion_type)) out.completion_type = 'per_department';
  if (!CL_STATUSES.includes(out.status)) out.status = 'draft';
  // تناوب نامعتبر یا خالی → موردی، تا چک‌لیست بی‌دلیل «معوق» علامت نخورد
  if (!CL_CADENCES.includes(out.cadence)) out.cadence = 'ondemand';
  // سند مادر باید سندِ همین بیمارستان باشد — وگرنه IDOR: اتصال چک‌لیست به سند بیمارستان دیگر
  if (out.parent_document_id && !query('SELECT id FROM controlled_documents WHERE id = ? AND hospital_id = ?',
      [out.parent_document_id, hospitalId]).rows[0]) {
    out.parent_document_id = null;
  }
  if (out.section_id && !query('SELECT id FROM accreditation_sections WHERE id = ?', [out.section_id]).rows[0]) {
    out.section_id = null;
  }
  out.has_domains = body.has_domains ? 1 : 0;
  out.has_baseline = body.has_baseline ? 1 : 0;
  out.is_public = body.is_public ? 1 : 0;
  return out;
}

function getChecklist(id, hospitalId) {
  return query('SELECT * FROM checklists WHERE id = ? AND hospital_id = ?', [id, hospitalId]).rows[0];
}

// «مسئولین اندازه‌گیری» — همان الگوی process_notify_users: فقط کاربران همین بیمارستان، بدون تکرار
const saveChecklistMeasurers = db.transaction((checklistId, hospitalId, userIds) => {
  query('DELETE FROM checklist_measurers WHERE checklist_id = ?', [checklistId]);
  const seen = new Set();
  for (const raw of userIds) {
    const uid = String(raw || '');
    if (!uid || seen.has(uid)) continue;
    if (!query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [uid, hospitalId]).rows[0]) continue;
    seen.add(uid);
    query('INSERT INTO checklist_measurers (checklist_id, user_id) VALUES (?, ?)', [checklistId, uid]);
  }
});

function chkMeasurers(checklistId) {
  return query(`SELECT m.user_id, u.full_name, u.department FROM checklist_measurers m
    JOIN users u ON m.user_id = u.id WHERE m.checklist_id = ? ORDER BY u.full_name`, [checklistId]).rows;
}

// حیطه‌ها و سؤالات به‌صورت یکجا (nested) جایگزین می‌شوند — ساده‌ترین شکل سازگار با ویرایش فرم
// تراکنش better-sqlite3 (همان الگوی database/seed-*.js) تا سؤالِ نیمه‌ذخیره‌شده باقی نماند
// شمارش پاسخ‌نامه‌هایی که به یک سؤال ارجاع داده‌اند (answers یک آرایه JSON از {item_id,...} است)
function itemHasSubmissions(checklistId, itemId) {
  const r = query(`SELECT COUNT(*) as c FROM checklist_submissions
    WHERE checklist_id = ? AND answers LIKE ?`, [checklistId, '%"item_id":"' + itemId + '"%']).rows[0];
  return !!(r && r.c);
}

// به‌روزرسانی درجا: سؤال/حیطهٔ موجود با همان id آپدیت می‌شود تا پاسخ‌نامه‌های قبلی نشکنند.
// سؤالِ حذف‌شده اگر پاسخ‌نامه داشته باشد فقط is_active = 0 می‌شود (از فرم زنده حذف، تاریخچه سالم).
const saveChecklistTree = db.transaction((checklistId, hospitalId, domains, flatItems) => {
  const prevItems = query('SELECT id FROM checklist_items WHERE checklist_id = ? AND hospital_id = ?', [checklistId, hospitalId]).rows.map(r => r.id);
  const prevDomains = query('SELECT id FROM checklist_domains WHERE checklist_id = ? AND hospital_id = ?', [checklistId, hospitalId]).rows.map(r => r.id);
  const prevItemSet = new Set(prevItems), prevDomainSet = new Set(prevDomains);
  const keptItems = new Set(), keptDomains = new Set();

  const saveItem = (domainId, it, order) => {
    const text = String(it.question_text || '').trim();
    if (!text) return;
    const at = CL_ANSWER_TYPES.includes(it.answer_type) ? it.answer_type : 'likert5';
    const w = it.weight === undefined || it.weight === null || it.weight === '' ? null : Number(it.weight);
    const weight = Number.isFinite(w) ? w : null;
    if (it.id && prevItemSet.has(it.id)) {
      query(`UPDATE checklist_items SET domain_id = ?, question_text = ?, answer_type = ?, weight = ?, sort_order = ?, is_active = 1
        WHERE id = ? AND checklist_id = ?`, [domainId, text, at, weight, order, it.id, checklistId]);
      keptItems.add(it.id);
      return;
    }
    const id = uuid();
    query(`INSERT INTO checklist_items (id, hospital_id, checklist_id, domain_id, question_text, answer_type, weight, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, hospitalId, checklistId, domainId, text, at, weight, order]);
    keptItems.add(id);
  };

  (domains || []).forEach((d, di) => {
    const title = String(d.title || '').trim();
    if (!title) return;
    let domainId;
    if (d.id && prevDomainSet.has(d.id)) {
      domainId = d.id;
      query('UPDATE checklist_domains SET title = ?, sort_order = ? WHERE id = ? AND checklist_id = ?', [title, di, domainId, checklistId]);
    } else {
      domainId = uuid();
      query('INSERT INTO checklist_domains (id, hospital_id, checklist_id, title, sort_order) VALUES (?, ?, ?, ?, ?)',
        [domainId, hospitalId, checklistId, title, di]);
    }
    keptDomains.add(domainId);
    (d.items || []).forEach((it, ii) => saveItem(domainId, it, ii));
  });
  // چک‌لیست بدون حیطه = فهرست تخت سؤالات (domain_id = NULL)
  (flatItems || []).forEach((it, ii) => saveItem(null, it, ii));

  // سؤالاتی که در payload جدید نیستند
  for (const id of prevItems) {
    if (keptItems.has(id)) continue;
    if (itemHasSubmissions(checklistId, id)) query('UPDATE checklist_items SET is_active = 0 WHERE id = ?', [id]);
    else query('DELETE FROM checklist_items WHERE id = ?', [id]);
  }
  // حیطه‌ای که هنوز سؤالِ (غیرفعالِ) وابسته دارد حذف نمی‌شود تا ON DELETE CASCADE تاریخچه را نبرد
  for (const id of prevDomains) {
    if (keptDomains.has(id)) continue;
    const left = query('SELECT COUNT(*) as c FROM checklist_items WHERE domain_id = ?', [id]).rows[0];
    if (!left || !left.c) query('DELETE FROM checklist_domains WHERE id = ?', [id]);
  }
});

router.get('/checklists', authRequired, requireAnyPermission('submit_checklists', 'manage_checklists'), hospitalScope, (req, res) => {
  try {
    const where = ['c.hospital_id = ?'];
    const params = [req.hospitalId];
    if (req.query.status && CL_STATUSES.includes(req.query.status)) { where.push('c.status = ?'); params.push(req.query.status); }
    if (req.query.completion_type && CL_COMPLETION_TYPES.includes(req.query.completion_type)) { where.push('c.completion_type = ?'); params.push(req.query.completion_type); }
    if (req.query.q) { where.push('(c.title LIKE ? OR IFNULL(c.checklist_code, \'\') LIKE ?)'); params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
    if (req.query.section_id) { where.push('c.section_id = ?'); params.push(req.query.section_id); }
    // «چک‌لیست‌های محول‌شده به من» — فیلتر روی جدول مسئولین اندازه‌گیری
    if (truthy(req.query.mine)) {
      where.push('EXISTS (SELECT 1 FROM checklist_measurers m WHERE m.checklist_id = c.id AND m.user_id = ?)');
      params.push(req.user.id);
    }
    const result = query(`SELECT c.id, c.title, c.checklist_code, c.completion_type, c.status, c.has_domains,
      c.is_public, c.section_id, c.updated_at, c.is_example, c.cadence, u.full_name as created_by_name,
      sec.title as section_title, sec.code as section_code,
      (SELECT COUNT(*) FROM checklist_measurers m WHERE m.checklist_id = c.id) as measurer_count,
      (SELECT COUNT(*) FROM checklist_items i WHERE i.checklist_id = c.id AND i.is_active = 1) as item_count,
      (SELECT COUNT(*) FROM checklist_domains d WHERE d.checklist_id = c.id) as domain_count,
      (SELECT COUNT(*) FROM checklist_submissions s WHERE s.checklist_id = c.id) as submission_count,
      (SELECT MAX(s.submitted_at) FROM checklist_submissions s WHERE s.checklist_id = c.id) as last_submitted_at
      FROM checklists c LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN accreditation_sections sec ON c.section_id = sec.id
      WHERE ${where.join(' AND ')} ORDER BY c.updated_at DESC`, params);
    // وضعیتِ پایش در لحظه‌ی خواندن حساب می‌شود، نه ذخیره — همان تصمیم معماریِ reminders.js:
    // هیچ ستونِ «معوق/انجام‌شده»ای وجود ندارد که با گذشتِ زمان بی‌اعتبار شود.
    const checklists = result.rows.map(c => ({
      ...c, due: checklistStatus(c.cadence || 'ondemand', c.last_submitted_at),
    }));
    res.json({ checklists, cadence_fa: CL_CADENCE_FA });
  } catch (err) { console.error('[Checklists]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// جزئیات کامل: چک‌لیست + حیطه‌ها با سؤالاتشان + سؤالات بدون حیطه
router.get('/checklists/:id', authRequired, requireAnyPermission('submit_checklists', 'manage_checklists'), hospitalScope, (req, res) => {
  try {
    const checklist = getChecklist(req.params.id, req.hospitalId);
    if (!checklist) return res.status(404).json({ error: 'چک‌لیست یافت نشد' });
    if (checklist.section_id) {
      const sec = query('SELECT code, title FROM accreditation_sections WHERE id = ?', [checklist.section_id]).rows[0];
      checklist.section_title = sec ? (sec.title || sec.code) : null;
      checklist.section_code = sec ? sec.code : null;
    }
    const items = query('SELECT * FROM checklist_items WHERE checklist_id = ? AND is_active = 1 ORDER BY sort_order', [checklist.id]).rows;
    const domains = query('SELECT * FROM checklist_domains WHERE checklist_id = ? ORDER BY sort_order', [checklist.id]).rows
      .map(d => ({ ...d, items: items.filter(i => i.domain_id === d.id) }));
    const lastSub = query('SELECT MAX(submitted_at) as t FROM checklist_submissions WHERE checklist_id = ?', [checklist.id]).rows[0];
    checklist.due = checklistStatus(checklist.cadence || 'ondemand', lastSub && lastSub.t);
    if (checklist.parent_document_id) {
      const pd = query('SELECT id, title, doc_code, doc_type, status, version_no FROM controlled_documents WHERE id = ? AND hospital_id = ?',
        [checklist.parent_document_id, req.hospitalId]).rows[0];
      checklist.parent_document = pd || null;
    }
    const dbWards = query('SELECT DISTINCT title FROM nursing_wards WHERE hospital_id = ? ORDER BY sort_order, title', [req.hospitalId]).rows.map(w => w.title);
    const standardWards = ['اورژانس', 'مراقبت‌های ویژه (ICU)', 'قلب (CCU)', 'اتاق عمل جنرال', 'جراحی عمومی', 'داخلی', 'اطفال', 'زنان و زایمان', 'دیالیز', 'نوزادان (NICU)', 'آزمایشگاه', 'تصویربرداری', 'داروخانه', 'استریلیزاسیون (CSR)', 'بهداشت محیط', 'لاندری (رختشویخانه)', 'تغذیه و آشپزخانه', 'تأسیسات و مهندسی پزشکی'];
    const hospital_wards = [...new Set([...dbWards, ...standardWards])];
    res.json({ checklist, domains, items: items.filter(i => !i.domain_id), measurers: chkMeasurers(checklist.id), cadence_fa: CL_CADENCE_FA, hospital_wards });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/checklists', authRequired, requirePermission('manage_checklists'), hospitalScope, async (req, res) => {
  const c = clBody(req.body, req.hospitalId);
  if (!c.title) return res.status(400).json({ error: 'عنوان چک‌لیست الزامی است' });
  try {
    const id = uuid();
    query(`INSERT INTO checklists (id, hospital_id, ${CL_FIELDS.join(', ')}, has_domains, has_baseline, is_public, created_by, updated_by)
      VALUES (${new Array(CL_FIELDS.length + 7).fill('?').join(', ')})`,
      [id, req.hospitalId, ...CL_FIELDS.map(f => c[f]), c.has_domains, c.has_baseline, c.is_public, req.user.id, req.user.id]);
    saveChecklistTree(id, req.hospitalId, req.body.domains, req.body.items);
    saveChecklistMeasurers(id, req.hospitalId, safeArray(req.body.measurer_user_ids));
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'checklist_created', targetTable: 'checklists', targetId: id, ipAddress: req.ip });
    res.json({ checklist: { id } });
  } catch (err) { console.error('[Checklists]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/checklists/:id', authRequired, requirePermission('manage_checklists'), hospitalScope, async (req, res) => {
  try {
    const existing = getChecklist(req.params.id, req.hospitalId);
    if (!existing) return res.status(404).json({ error: 'چک‌لیست یافت نشد' });
    const c = clBody(req.body, req.hospitalId);
    if (!c.title) return res.status(400).json({ error: 'عنوان چک‌لیست الزامی است' });
    // نسخه فقط وقتی بالا می‌رود که *محتوای* چک‌لیست عوض شده باشد (عنوان، هدف، سؤالات،
    // حیطه‌ها، تناوب، سند مادر) — نه با تغییر مسئولین اندازه‌گیری یا جابه‌جاییِ وضعیت.
    // سند کنترل‌شده با هر دست‌زدنی نسخه نمی‌خورد؛ فقط وقتی چیزی که کاربر با آن کار
    // می‌کند تغییر کرده باشد. الف-۱-۴-۶: «آخرین ویرایش و نسخه معتبر».
    const CONTENT_FIELDS = ['title', 'purpose', 'baseline_info', 'completion_type', 'cadence', 'parent_document_id', 'checklist_code'];
    const metaChanged = CONTENT_FIELDS.some(f => String(existing[f] == null ? '' : existing[f]) !== String(c[f] == null ? '' : c[f]));
    const treeChanged = req.body.domains !== undefined || req.body.items !== undefined;
    const bump = metaChanged || treeChanged ? 1 : 0;
    query(`UPDATE checklists SET ${CL_FIELDS.map(f => f + ' = ?').join(', ')},
      has_domains = ?, has_baseline = ?, is_public = ?, version_no = IFNULL(version_no, 1) + ?,
      updated_by = ?, updated_at = datetime('now')
      WHERE id = ? AND hospital_id = ?`,
      [...CL_FIELDS.map(f => c[f]), c.has_domains, c.has_baseline, c.is_public, bump, req.user.id, existing.id, req.hospitalId]);
    if (req.body.domains !== undefined || req.body.items !== undefined) {
      saveChecklistTree(existing.id, req.hospitalId, req.body.domains, req.body.items);
    }
    // فهرست مسئولین فقط وقتی جایگزین می‌شود که در بدنه آمده باشد (همان قرارداد notify_user_ids)
    if (req.body.measurer_user_ids !== undefined) {
      saveChecklistMeasurers(existing.id, req.hospitalId, safeArray(req.body.measurer_user_ids));
    }
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'checklist_updated', targetTable: 'checklists', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[Checklists]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.delete('/checklists/:id', authRequired, requirePermission('manage_checklists'), hospitalScope, async (req, res) => {
  try {
    const existing = getChecklist(req.params.id, req.hospitalId);
    if (!existing) return res.status(404).json({ error: 'چک‌لیست یافت نشد' });
    query('DELETE FROM checklists WHERE id = ? AND hospital_id = ?', [existing.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'checklist_deleted', targetTable: 'checklists', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

module.exports = router;
