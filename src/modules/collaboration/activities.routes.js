/**
 * Collaboration Activity Types & Calendar Routes
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

// ===== Activity Types + فرم‌ساز پویا (form_schema) =====
// فرم‌ساز داده‌محور نباید درخت محتوایی جدیدی بسازد؛ روی
// activity_types.form_schema که از قبل وجود دارد سوار می‌شود.
// شکل form_schema: آرایه‌ای از
//   {key, label, data_type: text|number|date|select|boolean, required, options?:[], condition?:{field, equals}}
const FS_TYPES = ['text', 'number', 'date', 'select', 'boolean'];
const FS_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;

// ورودی را اعتبارسنجی می‌کند؛ خروجی { schema } یا { error }
function parseFormSchema(raw) {
  if (raw === undefined || raw === null || raw === '') return { schema: [] };
  let arr = raw;
  if (typeof arr === 'string') {
    if (!arr.trim() || arr.trim() === '{}') return { schema: [] };
    try { arr = JSON.parse(arr); } catch { return { error: 'form_schema باید JSON معتبر باشد' }; }
  }
  if (!Array.isArray(arr)) return { error: 'form_schema باید یک آرایه از فیلدها باشد' };
  if (arr.length > 50) return { error: 'حداکثر ۵۰ فیلد سفارشی مجاز است' };
  const schema = [];
  const seen = new Set();
  for (const f of arr) {
    if (!f || typeof f !== 'object') return { error: 'هر فیلد باید یک شیء باشد' };
    const key = String(f.key || '').trim();
    if (!FS_KEY_RE.test(key)) return { error: `کلید فیلد نامعتبر است: ${key || '(خالی)'} — فقط حروف لاتین، عدد و _` };
    if (seen.has(key)) return { error: `کلید تکراری: ${key}` };
    seen.add(key);
    const label = String(f.label || '').trim();
    if (!label) return { error: `عنوان فیلد «${key}» الزامی است` };
    const data_type = String(f.data_type || '').trim();
    if (!FS_TYPES.includes(data_type)) return { error: `نوع دادهٔ نامعتبر برای «${key}»: ${data_type}` };
    const field = { key, label, data_type, required: !!f.required };
    if (data_type === 'select') {
      const options = Array.isArray(f.options) ? f.options.map(o => String(o).trim()).filter(Boolean) : [];
      if (!options.length) return { error: `فیلد «${key}» از نوع انتخابی است و باید گزینه داشته باشد` };
      field.options = options;
    } else if (f.options !== undefined && f.options !== null && (!Array.isArray(f.options) || f.options.length)) {
      return { error: `فیلد «${key}» نباید گزینه داشته باشد` };
    }
    if (f.condition !== undefined && f.condition !== null && f.condition !== '') {
      const c = f.condition;
      if (typeof c !== 'object' || Array.isArray(c)) return { error: `شرط نمایش فیلد «${key}» نامعتبر است` };
      const cf = String(c.field || '').trim();
      if (!cf) return { error: `شرط نمایش فیلد «${key}» باید فیلد مرجع داشته باشد` };
      if (cf === key) return { error: `فیلد «${key}» نمی‌تواند به خودش شرط بخورد` };
      if (!seen.has(cf)) return { error: `فیلد مرجع شرط «${cf}» باید پیش از «${key}» تعریف شده باشد` };
      field.condition = { field: cf, equals: c.equals === undefined ? null : c.equals };
    }
    schema.push(field);
  }
  return { schema };
}

const fsEq = (a, b) => String(a === undefined || a === null ? '' : a) === String(b === undefined || b === null ? '' : b);

// مقادیر ورودی را بر اساس schema پاک‌سازی و اعتبارسنجی می‌کند؛ { values } یا { error }
function validateCustomFields(schema, input) {
  if (!schema.length) return { values: {} };
  if (input === undefined || input === null || input === '') input = {};
  if (typeof input === 'string') { try { input = JSON.parse(input); } catch { return { error: 'custom_fields باید JSON معتبر باشد' }; } }
  if (typeof input !== 'object' || Array.isArray(input)) return { error: 'custom_fields باید یک شیء باشد' };
  const values = {};
  for (const f of schema) {
    // فیلدی که شرط نمایشش برقرار نیست، نه ذخیره می‌شود نه الزامی است
    if (f.condition && !fsEq(values[f.condition.field], f.condition.equals)) continue;
    let v = input[f.key];
    const empty = v === undefined || v === null || v === '';
    if (empty) {
      if (f.required && f.data_type !== 'boolean') return { error: `فیلد «${f.label}» الزامی است` };
      if (f.data_type === 'boolean') { values[f.key] = false; if (f.required) return { error: `فیلد «${f.label}» الزامی است` }; }
      continue;
    }
    switch (f.data_type) {
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n)) return { error: `فیلد «${f.label}» باید عدد باشد` };
        values[f.key] = n; break;
      }
      case 'date': {
        const s = String(v).trim();
        if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) return { error: `فیلد «${f.label}» باید تاریخ به شکل YYYY-MM-DD باشد` };
        values[f.key] = s; break;
      }
      case 'select': {
        const s = String(v);
        if (!f.options.includes(s)) return { error: `مقدار فیلد «${f.label}» باید یکی از گزینه‌ها باشد` };
        values[f.key] = s; break;
      }
      case 'boolean': {
        const b = v === true || v === 1 || v === '1' || v === 'true';
        if (f.required && !b) return { error: `فیلد «${f.label}» الزامی است` };
        values[f.key] = b; break;
      }
      default: {
        const s = String(v).trim();
        if (!s && f.required) return { error: `فیلد «${f.label}» الزامی است` };
        if (s.length > 2000) return { error: `فیلد «${f.label}» بیش از حد طولانی است` };
        values[f.key] = s;
      }
    }
  }
  return { values };
}

const typeRow = t => ({ ...t, form_schema: parseFormSchema(t.form_schema).schema || [] });

router.get('/activities/types', authRequired, hospitalScope, (req, res) => {
  try {
    const result = query('SELECT * FROM activity_types WHERE hospital_id = ? AND is_active = 1 ORDER BY module, title', [req.hospitalId]);
    res.json({ types: result.rows.map(typeRow) });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

router.post('/activities/types', authRequired, requirePermission('manage_activity_types'), hospitalScope, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const module = String(req.body.module || '').trim();
  if (!title || !module) return res.status(400).json({ error: 'عنوان و ماژول نوع فعالیت الزامی است' });
  const fs = parseFormSchema(req.body.form_schema);
  if (fs.error) return res.status(400).json({ error: fs.error });
  try {
    const id = uuid();
    query(`INSERT INTO activity_types (id, hospital_id, module, title, description, form_schema, requires_evidence_upload, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, req.hospitalId, module, title, req.body.description || null, JSON.stringify(fs.schema), req.body.requires_evidence_upload ? 1 : 0]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'activity_type_created', targetTable: 'activity_types', targetId: id, ipAddress: req.ip });
    res.json({ type: { id } });
  } catch (err) { console.error('[ActivityTypes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/activities/types/:id', authRequired, requirePermission('manage_activity_types'), hospitalScope, async (req, res) => {
  try {
    const existing = query('SELECT * FROM activity_types WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!existing) return res.status(404).json({ error: 'نوع فعالیت یافت نشد' });
    const title = String(req.body.title === undefined ? existing.title : req.body.title || '').trim();
    const module = String(req.body.module === undefined ? existing.module : req.body.module || '').trim();
    if (!title || !module) return res.status(400).json({ error: 'عنوان و ماژول نوع فعالیت الزامی است' });
    const fs = parseFormSchema(req.body.form_schema === undefined ? existing.form_schema : req.body.form_schema);
    if (fs.error) return res.status(400).json({ error: fs.error });
    query(`UPDATE activity_types SET module = ?, title = ?, description = ?, form_schema = ?, requires_evidence_upload = ?, is_active = ?
      WHERE id = ? AND hospital_id = ?`,
      [module, title, req.body.description === undefined ? existing.description : (req.body.description || null),
       JSON.stringify(fs.schema),
       (req.body.requires_evidence_upload === undefined ? existing.requires_evidence_upload : (req.body.requires_evidence_upload ? 1 : 0)),
       (req.body.is_active === undefined ? existing.is_active : (req.body.is_active ? 1 : 0)),
       existing.id, req.hospitalId]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'activity_type_updated', targetTable: 'activity_types', targetId: existing.id, ipAddress: req.ip });
    res.json({ status: 'updated' });
  } catch (err) { console.error('[ActivityTypes]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// Activity records
router.get('/activities/records', authRequired, hospitalScope, (req, res) => {
  try {
    let sql = `SELECT ar.*, at.title as type_title, at.module, u.full_name as recorder_name
      FROM activity_records ar JOIN activity_types at ON ar.activity_type_id = at.id
      JOIN users u ON ar.recorded_by = u.id WHERE ar.hospital_id = ?`;
    const params = [req.hospitalId];
    if (!req.user.permissions.includes('view_all_activity_records')) { sql += ' AND ar.recorded_by = ?'; params.push(req.user.id); }
    sql += applyYearFilter(req, params, 'ar.created_at');
    sql += ' ORDER BY ar.created_at DESC LIMIT 50';
    const result = query(sql, params);
    res.json({ records: result.rows.map(recordRow), total: result.rows.length });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// مقادیر فیلدهای سفارشی داخل همان form_data (کلید custom_fields) نگهداری می‌شوند — بدون تغییر schema
function recordRow(r) {
  const fd = parseJSON(r.form_data, {}) || {};
  const custom = fd.custom_fields && typeof fd.custom_fields === 'object' ? fd.custom_fields : {};
  return { ...r, form_data: fd, custom_fields: custom };
}

router.get('/activities/records/:id', authRequired, hospitalScope, (req, res) => {
  try {
    const r = query(`SELECT ar.*, at.title as type_title, at.module, at.form_schema, u.full_name as recorder_name
      FROM activity_records ar JOIN activity_types at ON ar.activity_type_id = at.id
      JOIN users u ON ar.recorded_by = u.id WHERE ar.id = ? AND ar.hospital_id = ?`, [req.params.id, req.hospitalId]).rows[0];
    if (!r) return res.status(404).json({ error: 'فعالیت یافت نشد' });
    if (!req.user.permissions.includes('view_all_activity_records') && r.recorded_by !== req.user.id) {
      return res.status(403).json({ error: 'دسترسی ندارید' });
    }
    const schema = parseFormSchema(r.form_schema).schema || [];
    res.json({ record: { ...recordRow(r), form_schema: schema } });
  } catch (err) { res.status(500).json({ error: 'خطای سرور' }); }
});

// Create activity record
router.post('/activities/records', authRequired, requirePermission('submit_activity_record'), hospitalScope, (req, res) => {
  const { activity_type_id, form_data, occurred_at, department, is_confidential } = req.body;
  if (!activity_type_id || !occurred_at) return res.status(400).json({ error: 'نوع فعالیت و زمان الزامی است' });
  try {
    const type = query('SELECT * FROM activity_types WHERE id = ? AND hospital_id = ?', [activity_type_id, req.hospitalId]).rows[0];
    if (!type) return res.status(404).json({ error: 'نوع فعالیت یافت نشد' });
    const schema = parseFormSchema(type.form_schema).schema || [];
    const cf = validateCustomFields(schema, req.body.custom_fields);
    if (cf.error) return res.status(400).json({ error: cf.error });
    const fd = (form_data && typeof form_data === 'object' && !Array.isArray(form_data)) ? { ...form_data } : {};
    if (schema.length) fd.custom_fields = cf.values;
    const id = uuid();
    query(`INSERT INTO activity_records (id, hospital_id, activity_type_id, recorded_by, department, form_data, status, occurred_at, is_confidential)
      VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
      [id, req.hospitalId, activity_type_id, req.user.id, department||null, JSON.stringify(fd), occurred_at, is_confidential?1:0]);
    res.json({ record: { id, custom_fields: cf.values } });
  } catch (err) { console.error('[ActivityRecords]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ===== Calendar =====
router.get('/calendar/events', authRequired, hospitalScope, (req, res) => {
  try {
    // year (+ اختیاری month) بازه‌ی شمسی را محدود می‌کند تا صفحه‌ی تقویم فقط همان ماه را بگیرد.
    // نام کمیته/اتاق برای نمایش داخل خانه‌ی روز الحاق می‌شود (جلسه = ردیف calendar_events).
    const params = [req.hospitalId];
    let sql = `SELECT e.*, c.name as committee_name, r.name as room_name, r.location as room_location,
        u.full_name as created_by_name
      FROM calendar_events e
      LEFT JOIN committees c ON e.committee_id = c.id
      LEFT JOIN committee_meeting_rooms r ON e.room_id = r.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.hospital_id = ?`;
    const y = safeYear(req.query.year);
    if (y) {
      const m = parseInt(req.query.month, 10);
      const rng = (m >= 1 && m <= 12) ? jalaliMonthRange(y, m) : jalaliYearRange(y);
      sql += ' AND date(e.event_date) >= ? AND date(e.event_date) < ?';
      params.push(rng.start, rng.end);
    }
    sql += ' ORDER BY e.event_date ASC, e.start_time ASC';
    res.json({ events: query(sql, params).rows });
  } catch (err) { console.error('[Calendar]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
