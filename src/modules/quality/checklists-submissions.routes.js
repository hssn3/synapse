/**
 * Quality Checklists Submissions & Measurers Routes
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


// مدیریت مستقل فهرست «مسئولین اندازه‌گیری» (بدون ویرایش خود چک‌لیست)
router.put('/checklists/:id/measurers', authRequired, requirePermission('manage_checklists'), hospitalScope, (req, res) => {
  try {
    const existing = getChecklist(req.params.id, req.hospitalId);
    if (!existing) return res.status(404).json({ error: 'چک‌لیست یافت نشد' });
    saveChecklistMeasurers(existing.id, req.hospitalId, safeArray(req.body.measurer_user_ids));
    res.json({ measurers: chkMeasurers(existing.id) });
  } catch (err) { console.error('[Checklists]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// خروجی CSV پاسخ‌نامه‌ها — همان الگوی /bsc/export.csv (BOM برای اکسل فارسی)
// هر سطر = یک پاسخ‌نامه، هر سؤال یک ستون (متن گزینه) تا مدیر کیفیت بتواند در اکسل فیلتر/محاسبه کند.
router.get('/checklists/:id/export.csv', authRequired, requireAnyPermission('submit_checklists', 'manage_checklists'), hospitalScope, (req, res) => {
  try {
    const checklist = getChecklist(req.params.id, req.hospitalId);
    if (!checklist) return res.status(404).json({ error: 'چک‌لیست یافت نشد' });
    // ستون‌ها به ترتیب حیطه (و سپس ترتیب سؤال) می‌آیند تا در اکسل، سؤالات هر حیطه کنار هم باشند
    const items = query(`SELECT i.* FROM checklist_items i
      LEFT JOIN checklist_domains d ON i.domain_id = d.id
      WHERE i.checklist_id = ? ORDER BY IFNULL(d.sort_order, 9999), i.sort_order`, [checklist.id]).rows;
    const domains = Object.fromEntries(query('SELECT id, title FROM checklist_domains WHERE checklist_id = ?', [checklist.id]).rows.map(d => [d.id, d.title]));
    const params = [checklist.id, req.hospitalId];
    let sql = `SELECT s.*, u.full_name as submitted_by_name FROM checklist_submissions s
      LEFT JOIN users u ON s.submitted_by = u.id WHERE s.checklist_id = ? AND s.hospital_id = ?`;
    sql += applyYearFilter(req, params, 's.submitted_at');
    sql += ' ORDER BY s.submitted_at DESC';
    const subs = query(sql, params).rows;

    const cell = v => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const label = (type, val) => {
      const opts = CL_ANSWER_LABELS[type] || CL_ANSWER_LABELS.likert5;
      return opts[val] === undefined ? val : opts[val];
    };
    const header = ['مورد بررسی', 'تکمیل‌کننده', 'تاریخ ثبت', 'امتیاز', 'حداکثر امتیاز', 'درصد',
      ...items.map(i => (i.domain_id && domains[i.domain_id] ? domains[i.domain_id] + ' — ' : '') + i.question_text),
      'توضیح کلی'];
    const lines = [header.map(cell).join(',')];
    for (const s of subs) {
      const byItem = {};
      for (const a of safeArray(s.answers)) byItem[a.item_id] = a;
      const pct = s.max_score ? Math.round((s.score / s.max_score) * 100) : '';
      lines.push([s.reference, s.submitted_by_name, s.submitted_at, s.score, s.max_score, pct,
        ...items.map(i => {
          const a = byItem[i.id];
          if (!a) return '';
          return label(i.answer_type, a.answer) + (a.note ? ' — ' + a.note : '');
        }), s.note].map(cell).join(','));
    }
    const slug = (checklist.checklist_code || checklist.id).replace(/[^A-Za-z0-9_-]/g, '') || 'checklist';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="checklist-${slug}.csv"`);
    res.send('﻿' + lines.join('\r\n'));
  } catch (err) { console.error('[Checklists]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- تکمیل چک‌لیست ----
router.get('/checklists/:id/submissions', authRequired, requireAnyPermission('submit_checklists', 'manage_checklists'), hospitalScope, (req, res) => {
  try {
    const checklist = getChecklist(req.params.id, req.hospitalId);
    if (!checklist) return res.status(404).json({ error: 'چک‌لیست یافت نشد' });
    const params = [checklist.id, req.hospitalId];
    let sql = `SELECT s.id, s.reference, s.score, s.max_score, s.note, s.submitted_at, s.is_example, u.full_name as submitted_by_name
      FROM checklist_submissions s LEFT JOIN users u ON s.submitted_by = u.id
      WHERE s.checklist_id = ? AND s.hospital_id = ?`;
    sql += applyYearFilter(req, params, 's.submitted_at');
    sql += ' ORDER BY s.submitted_at DESC';
    const rows = query(sql, params).rows;
    res.json({ submissions: rows });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/checklists/:id/submissions', authRequired, requirePermission('submit_checklists'), hospitalScope, async (req, res) => {
  try {
    const checklist = getChecklist(req.params.id, req.hospitalId);
    if (!checklist) return res.status(404).json({ error: 'چک‌لیست یافت نشد' });
    const items = query('SELECT * FROM checklist_items WHERE checklist_id = ? AND is_active = 1', [checklist.id]).rows;
    const byId = Object.fromEntries(items.map(i => [i.id, i]));
    const incoming = safeArray(req.body.answers);
    const answers = [];
    let score = 0, maxScore = 0;
    for (const a of incoming) {
      const item = byId[a && a.item_id];
      if (!item) continue; // پاسخ به سؤالِ چک‌لیست دیگر پذیرفته نمی‌شود
      const scale = CL_ANSWER_VALUES[item.answer_type] || CL_ANSWER_VALUES.likert5;
      const val = String(a.answer || '');
      if (!(val in scale)) continue;
      const w = item.weight === null || item.weight === undefined ? 1 : Number(item.weight) || 0;
      const top = Math.max(...Object.values(scale));
      score += scale[val] * w;
      maxScore += top * w;
      answers.push({ item_id: item.id, answer: val, note: a.note ? String(a.note) : null });
    }
    if (!answers.length) return res.status(400).json({ error: 'حداقل یک پاسخ معتبر لازم است' });
    const id = uuid();
    query(`INSERT INTO checklist_submissions (id, hospital_id, checklist_id, reference, answers, score, max_score, note, submitted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, checklist.id, req.body.reference || null, JSON.stringify(answers),
       score, maxScore, req.body.note || null, req.user.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'checklist_submitted', targetTable: 'checklist_submissions', targetId: id, ipAddress: req.ip });
    res.json({ submission: { id, score, max_score: maxScore } });
  } catch (err) { console.error('[Checklists]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// یک پاسخ‌نامه با متن سؤال‌ها برای نمایش
router.get('/checklists/submissions/:sid', authRequired, requireAnyPermission('submit_checklists', 'manage_checklists'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT * FROM checklist_submissions WHERE id = ? AND hospital_id = ?', [req.params.sid, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'پاسخ‌نامه یافت نشد' });
    const checklist = getChecklist(row.checklist_id, req.hospitalId);
    const items = query('SELECT * FROM checklist_items WHERE checklist_id = ?', [row.checklist_id]).rows;
    const domains = query('SELECT id, title FROM checklist_domains WHERE checklist_id = ? ORDER BY sort_order', [row.checklist_id]).rows;
    const byId = Object.fromEntries(items.map(i => [i.id, i]));
    const domainTitle = Object.fromEntries(domains.map(d => [d.id, d.title]));
    const answers = safeArray(row.answers).map(a => {
      const it = byId[a.item_id] || {};
      return { ...a, question_text: it.question_text || null, answer_type: it.answer_type || null,
               domain_title: it.domain_id ? (domainTitle[it.domain_id] || null) : null,
               is_nonconformity: isNonConformity(it.answer_type, a.answer) };
    });
    // اقدامات اصلاحیِ ساخته‌شده از روی همین پاسخ‌نامه — تا کاربر ببیند یافته‌ها
    // پیگیری شده‌اند یا نه (شرطِ «موارد عدم انطباق اصلاح شود» در الف-۲-۲-۵)
    const actions = query(`SELECT t.id, t.title, t.status, t.due_date, t.completed_at, u.full_name as assigned_to_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.hospital_id = ? AND t.description LIKE ? ORDER BY t.created_at DESC`,
      [req.hospitalId, '%[CHK:' + row.id + ']%']).rows;
    // سمت و بخشِ تکمیل‌کننده هم لازم است: روی برگه‌ی چاپی باید معلوم باشد «چه کسی، با چه
    // سمتی» این پاسخ‌نامه را پر کرده — نامِ تنها برای سندی که ارزیاب می‌بیند کافی نیست.
    const user = query(`SELECT u.full_name, u.department, r.title_fa as role_title, r.code as role_code
      FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`, [row.submitted_by]).rows[0];
    res.json({
      submission: {
        ...row, answers,
        submitted_by_name: user ? user.full_name : null,
        submitted_by_role: user ? (user.role_title || user.role_code || null) : null,
        submitted_by_department: user ? (user.department || null) : null,
        nonconformity_count: answers.filter(a => a.is_nonconformity).length,
        corrective_actions: actions,
      },
      // سند مادر روی برگه‌ی چاپی لازم است: ارزیاب باید ببیند این چک‌لیست ذیل کدام سند
      // سطح‌بالا استفاده می‌شود (الف-۱-۴-۶).
      checklist: checklist ? {
        ...checklist,
        parent_document: checklist.parent_document_id
          ? query('SELECT id, title, doc_code FROM controlled_documents WHERE id = ? AND hospital_id = ?',
              [checklist.parent_document_id, req.hospitalId]).rows[0] || null
          : null,
      } : checklist,
    });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// اقدام اصلاحی برای یافته‌های یک پاسخ‌نامه.
// چرا این‌جا و نه استفاده از همان POST /tasks: تا پیوندِ «این وظیفه از کدام پاسخ‌نامه
// آمده» ثبت شود. جدول tasks ستون منبع ندارد و افزودن ستون به جدولی که چند ماژول از آن
// استفاده می‌کنند برای یک ماژول، بدهیِ بی‌دلیل است؛ پس شناسه‌ی پاسخ‌نامه به‌شکل
// [CHK:<id>] در انتهای description می‌آید — همان الگویی که خواندنش در روت پاسخ‌نامه است.
// دسترسی: assign_tasks (ارجاع عمومی وظیفه) *یا* manage_checklists.
// چرا manage_checklists هم کافی است: الف-۲-۲-۵ می‌گوید بررسی دوره‌ای چک‌لیست
// «توسط مدیریت بیمارستان انجام و موارد عدم انطباق اصلاح شود» — یعنی همان کسی که
// پایش را می‌گرداند باید بتواند یافته‌اش را ببندد. مدیر داخلی از قبل
// manage_walkarounds دارد و در بازدید میدانی مصوبه با مسئول و مهلت ثبت می‌کند
// (walkaround_resolutions.responsible_user_id/due_date)، پس نداشتنِ همین حق روی
// چک‌لیست یک ناسازگاریِ تصادفی بود نه سیاست. این مجوز عمداً باریک است: فقط
// اقدامِ برخاسته از یک پاسخ‌نامه، نه ارجاع آزادِ وظیفه در کل سامانه.
router.post('/checklists/submissions/:sid/corrective-action', authRequired,
  requireAnyPermission('assign_tasks', 'manage_checklists'), hospitalScope, async (req, res) => {
  try {
    const row = query('SELECT * FROM checklist_submissions WHERE id = ? AND hospital_id = ?',
      [req.params.sid, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'پاسخ‌نامه یافت نشد' });
    const { title, assigned_to, due_date, description } = req.body;
    if (!title || !assigned_to) return res.status(400).json({ error: 'عنوان و مسئول پیگیری الزامی است' });
    if (!query('SELECT id FROM users WHERE id = ? AND hospital_id = ?', [assigned_to, req.hospitalId]).rows[0]) {
      return res.status(400).json({ error: 'مسئول انتخاب‌شده نامعتبر است' });
    }
    const checklist = getChecklist(row.checklist_id, req.hospitalId);
    const origin = `برخاسته از پاسخ‌نامه‌ی چک‌لیست «${checklist ? checklist.title : ''}»`
      + (checklist && checklist.checklist_code ? ` (${checklist.checklist_code})` : '')
      + (row.reference ? ` — مورد بررسی: ${row.reference}` : '');
    const desc = (description ? String(description).trim() + '\n\n' : '') + origin + `\n[CHK:${row.id}]`;
    const id = uuid();
    query(`INSERT INTO tasks (id, hospital_id, title, description, assigned_by, assigned_to, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.hospitalId, String(title).slice(0, 255), desc, req.user.id, assigned_to, due_date || null]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'checklist_corrective_action',
      targetTable: 'tasks', targetId: id, ipAddress: req.ip });
    res.json({ task: { id } });
  } catch (err) { console.error('[Checklists]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// حذف یک پاسخ‌نامه — تا پیش از این فقط با حذف کل چک‌لیست (cascade) ممکن بود،
// بنابراین پاسخ‌نامه‌ی نمونه/اشتباه به‌تنهایی قابل پاک‌کردن نبود.
router.delete('/checklists/submissions/:sid', authRequired, requirePermission('manage_checklists'), hospitalScope, (req, res) => {
  try {
    const row = query('SELECT id FROM checklist_submissions WHERE id = ? AND hospital_id = ?', [req.params.sid, req.hospitalId]).rows[0];
    if (!row) return res.status(404).json({ error: 'پاسخ‌نامه یافت نشد' });
    // حسابرسی‌هایی که به این پاسخ‌نامه ارجاع داده‌اند نباید یتیم بمانند (FK بدون ON DELETE)
    query('UPDATE internal_audits SET checklist_submission_id = NULL WHERE checklist_submission_id = ?', [row.id]);
    query('DELETE FROM checklist_submissions WHERE id = ?', [row.id]);
    res.json({ ok: true });
  } catch (err) { console.error('[Submission delete]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
