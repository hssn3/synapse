/**
 * Common utilities, helpers, and middleware shared across domain modules
 * Clean Architecture Modular Monolith — Project 313
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const { query, db } = require('../config/database-sqlite');
const config = require('../config/app');
const {
  authRequired, requirePermission, requireAnyPermission,
  hospitalScope, requireFeature
} = require('../middleware/auth');
const { scopeFor, axisCodeOf, measureAllowed } = require('../config/role-axes');
const {
  jalaliYearRange, jalaliMonthRange, safeYear, toGregorian, toJalali,
  todayJalali, JMONTHS, tehranNow, tehranTodayStr, TEHRAN_OFFSET_MS
} = require('../config/jalali');
const { logAction } = require('../middleware/audit');
const { uuid, parseJSON, safeArray } = require('../utils/db');
const { buildTrackingCode } = require('../utils/tracking');

const { mountCrud, crudNormalize, crudHasUpdatedAt } = require('./core/crud-engine');
const { evaluatePolicy } = require('./rbac/policy-engine');
const { upload, uploadSingle, uploadMultiple, compressImage } = require('./core/upload-middleware');

const { RULE_TYPES, RULE_TYPE_FA, reminderItemsFor } = require('../services/reminders');
const { timelineFor, dismissMilestone, snoozeMilestone, setMilestoneState } = require('../services/guide-timeline');
const { assistantNext, assistantReview } = require('../services/assistant');
const { periodProgress } = require('../services/role-duties');
const { getSmartDecisions } = require('../services/decision-engine');
const { myWork } = require('../services/my-work');
const assistantChat = require('../services/assistant-chat');
const { extractText, classifyDocument, extractFlowchart } = require('../services/ai-provider');

// Regex patterns
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Jalali & year filtering helpers
function applyYearFilter(req, params, col) {
  const y = safeYear(req.query && req.query.year);
  if (!y) return '';
  const r = jalaliYearRange(y);
  params.push(r.start, r.end);
  return ` AND date(${col}) >= ? AND date(${col}) < ?`;
}

function loadOverrides(userId) {
  const rows = query('SELECT measure_id, access_type FROM user_measure_overrides WHERE user_id = ?', [userId]).rows;
  const grants = new Set(), denies = new Set();
  for (const r of rows) (r.access_type === 'grant' ? grants : denies).add(r.measure_id);
  return { grants, denies };
}

function statusYear(req) {
  const q = safeYear(req.query && req.query.year) || safeYear(req.body && req.body.year);
  if (q) return String(q);
  try {
    const p = query(
      `SELECT start_year FROM accreditation_periods WHERE hospital_id = ? AND is_active = 1 AND start_year IS NOT NULL LIMIT 1`,
      [req.hospitalId]
    ).rows[0];
    if (p && p.start_year) return String(p.start_year);
  } catch (e) { /* ignore */ }
  return String(todayJalali().jy);
}

function codeCmp(a, b) {
  const pa = String(a || '').split('-'), pb = String(b || '').split('-');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = parseInt(x, 10), ny = parseInt(y, 10);
    const bothNum = !Number.isNaN(nx) && !Number.isNaN(ny);
    if (bothNum) { if (nx !== ny) return nx - ny; }
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function sortTree(list) {
  list.sort((a, b) => codeCmp(a.code, b.code));
  for (const n of list) if (n.children && n.children.length) sortTree(n.children);
}

// User & Role helpers
function canAssignRole(actor, roleRow) {
  if (!roleRow) return false;
  if (roleRow.code === 'admin') return actor.permissions.includes('manage_roles');
  const rolePerms = typeof roleRow.permissions === 'string' ? JSON.parse(roleRow.permissions) : (roleRow.permissions || []);
  if (rolePerms.includes('manage_roles')) return actor.permissions.includes('manage_roles');
  return true;
}

function hasPerm(req, perm) {
  const p = req.user.permissions || [];
  return p.includes('*') || p.includes(perm);
}

// Persian text helpers
function normFa(s) {
  return String(s == null ? '' : s)
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ؤ/g, 'و')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, ' ')
    .replace(/[_\u2010-\u2015\u2212-]/g, ' ')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function matchFa(list, input) {
  if (input === null || input === undefined || input === '') return null;
  const n = normFa(input);
  return list.find(v => normFa(v) === n) || null;
}

function truthy(v) {
  return v === true || v === 1 || v === '1' || v === 'true' || v === 'بله';
}

// Medical Errors & RCA
const MER_EVAL_STATUSES = ['در انتظار بررسی', 'در حال بررسی', 'بسته‌شده'];

function merValidate(b) {
  if (!b.description) return 'توضیحات الزامی است';
  if (truthy(b.needs_rca) && !String(b.rca_text || '').trim())
    return 'در صورت نیاز به تحلیل ریشه‌ای، متن تحلیل ریشه‌ای الزامی است';
  if (b.evaluation_status) {
    const canon = matchFa(MER_EVAL_STATUSES, b.evaluation_status);
    if (!canon) return 'وضعیت بررسی نامعتبر است';
    b.evaluation_status = canon;
  }
  return null;
}

function merInsert(b, hospitalId, reportedBy, source) {
  const id = uuid();
  const code = buildTrackingCode(db, hospitalId);
  query(`INSERT INTO medical_error_reports
    (id, hospital_id, error_category, description, is_confidential, is_anonymous_submission, severity,
     reported_by, department, needs_rca, rca_text, tracking_code, error_ward, referred_to_secretariat,
     evaluation_status, is_self_declaration, source, never_event_code, sentinel_event, rca_lead)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, hospitalId, b.error_category || null, b.description, b.is_anonymous !== false ? 1 : 0,
     b.severity || null, reportedBy || null, b.department || null,
     truthy(b.needs_rca) ? 1 : 0, truthy(b.needs_rca) ? String(b.rca_text).trim() : null,
     code, b.error_ward || null, truthy(b.referred_to_secretariat) ? 1 : 0,
     b.evaluation_status || 'در انتظار بررسی', truthy(b.is_self_declaration) ? 1 : 0,
     source || 'form', b.never_event_code || null, truthy(b.sentinel_event) ? 1 : 0,
     b.rca_lead || null]);
  return { id, tracking_code: code };
}

// File handling
function originalName(file) {
  try { return Buffer.from(file.originalname, 'latin1').toString('utf8'); }
  catch (e) { return file.originalname; }
}

async function storeUploadedFile(file) {
  const isImage = file.mimetype.startsWith('image/');
  const filename = `${uuid()}.${isImage ? 'webp' : 'pdf'}`;
  const filePath = path.join(config.upload.dir, filename);
  if (isImage) await compressImage(file.buffer, filePath);
  else fs.writeFileSync(filePath, file.buffer);
  return { filename, size: fs.statSync(filePath).size };
}

function sendStoredFile(res, storedName, origName) {
  const safe = path.basename(String(storedName));
  const abs = path.join(config.upload.dir, safe);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'فایل روی سرور موجود نیست' });
  res.download(abs, origName || safe);
}

const LIB_CATEGORIES = ['regulation', 'pamphlet', 'issued_form', 'booklet', 'training_handout'];

function libSectionId(v) {
  if (!v) return null;
  return query('SELECT id FROM accreditation_sections WHERE id = ?', [v]).rows[0] ? String(v) : null;
}

// Checklists
function getChecklist(id, hospitalId) {
  return query('SELECT * FROM checklists WHERE id = ? AND hospital_id = ?', [id, hospitalId]).rows[0];
}

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

function itemHasSubmissions(checklistId, itemId) {
  const r = query(`SELECT COUNT(*) as c FROM checklist_submissions
    WHERE checklist_id = ? AND answers LIKE ?`, [checklistId, '%"item_id":"' + itemId + '"%']).rows[0];
  return r && r.c > 0;
}

// BSC & KPIs
const BSC_PERSPECTIVES = ['مالی', 'گیرنده خدمت', 'فرآیندهای داخلی', 'رشد و یادگیری'];
const JMONTHS_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function matchPerspective(input) {
  return matchFa(BSC_PERSPECTIVES, input);
}

function currentJalaliYear() {
  const n = new Date();
  const gy = n.getFullYear(), gm = n.getMonth() + 1, gd = n.getDate();
  return (gm > 3 || (gm === 3 && gd >= 21)) ? gy - 621 : gy - 622;
}

function bscYear(q) {
  const y = parseInt(q, 10);
  return Number.isFinite(y) && y >= 1390 && y <= 1450 ? y : currentJalaliYear();
}

function bscData(hospitalId, year) {
  const kpis = query(`SELECT id, title, unit, target_value, upper_limit, lower_limit, bsc_perspective,
    higher_is_better, definition, dimension FROM hospital_kpis
    WHERE hospital_id = ? AND is_active = 1 ORDER BY bsc_perspective, title`, [hospitalId]).rows;
  const vals = query('SELECT kpi_id, jalali_month, value FROM bsc_monthly_values WHERE hospital_id = ? AND jalali_year = ?',
    [hospitalId, year]).rows;
  const byKpi = {};
  for (const v of vals) (byKpi[v.kpi_id] = byKpi[v.kpi_id] || {})[v.jalali_month] = v.value;
  return { kpis, byKpi };
}

const IND_ASPECTS = ['بالینی', 'مدیریتی'];
const IND_TYPES = ['ساختاری', 'فرآیندی', 'پیامدی'];
const IND_INTERVALS = ['ماهانه', 'سه ماه یکبار', 'شش ماه یکبار', 'سالانه'];
const IND_DESIRABILITY = ['افزاینده', 'کاهنده'];
const IND_VALUE_STATUS = ['ثبت‌شده', 'تأییدشده', 'ردشده'];
const IND_TEXT_FIELDS = ['title', 'code', 'definition', 'logical_reasons', 'basis', 'unit',
  'report_type', 'delivery_respite', 'source', 'ward_name', 'category',
  'numerator_description', 'denominator_description', 'numerator_formula', 'denominator_formula',
  'linked_axis_code', 'bsc_perspective'];
const IND_NUM_FIELDS = ['target_value', 'upper_limit', 'lower_limit', 'bsc_weight', 'year'];
const IND_FLAG_FIELDS = ['safety_related', 'send_to_kartabl', 'see_bsc', 'is_mandatory', 'is_active'];

function indBody(body, hospitalId) {
  const out = {};
  for (const f of IND_TEXT_FIELDS) {
    const v = body[f];
    out[f] = (v === undefined || v === null || String(v).trim() === '') ? null : String(v).trim();
  }
  for (const f of IND_NUM_FIELDS) {
    const n = Number(body[f]);
    out[f] = (body[f] === undefined || body[f] === null || body[f] === '' || !Number.isFinite(n)) ? null : n;
  }
  for (const f of IND_FLAG_FIELDS) out[f] = truthy(body[f]) ? 1 : 0;
  return out;
}

// Nursing & Clinical
function nrsCanManage(req) { return (req.user.permissions || []).includes('manage_nursing_hierarchy'); }
function nrsCanView(req) {
  const p = req.user.permissions || [];
  return p.includes('manage_nursing_hierarchy') || p.includes('view_nursing_hierarchy');
}

function headNurseWardsOf(hospitalId, userId) {
  return query(`SELECT id, title, icon, head_nurse_id, deputy1_id, deputy2_id FROM nursing_wards
    WHERE hospital_id = ? AND (head_nurse_id = ? OR deputy1_id = ? OR deputy2_id = ?)
    ORDER BY sort_order, created_at`, [hospitalId, userId, userId, userId]).rows;
}

function hnAccessWard(req, wardTitleOrId, byId) {
  const ward = byId
    ? query('SELECT * FROM nursing_wards WHERE id = ? AND hospital_id = ?', [wardTitleOrId, req.hospitalId]).rows[0]
    : query('SELECT * FROM nursing_wards WHERE title = ? AND hospital_id = ?', [wardTitleOrId, req.hospitalId]).rows[0];
  if (!ward) return { error: 'بخش یافت نشد', status: 404 };
  const uid_ = req.user.id;
  const isHead = ward.head_nurse_id === uid_;
  const isDeputy = ward.deputy1_id === uid_ || ward.deputy2_id === uid_;
  const isOverseer = nrsCanManage(req);
  if (!isHead && !isDeputy && !isOverseer) return { error: 'دسترسی ندارید', status: 403 };
  return { ward, isHead, isDeputy, isOverseer };
}

function hnHeadPresentToday(hospitalId, ward, date) {
  const row = query('SELECT head_present FROM nursing_head_presence WHERE hospital_id = ? AND ward = ? AND p_date = ?',
    [hospitalId, ward, date]).rows[0];
  return row ? row.head_present : null;
}

const SHIFT_STAFF_ORDER = `CASE
    WHEN position LIKE '%مدیر پرستاری%' OR position LIKE '%مترون%' THEN 1
    WHEN position LIKE '%سوپروایزر بالینی%' THEN 2
    WHEN position LIKE '%کنترل عفونت%' THEN 3
    WHEN position LIKE '%آموزش%' THEN 4
    WHEN position LIKE '%سوپروایزر%' THEN 5
    WHEN position LIKE '%سرپرستار%' THEN 6
    WHEN position LIKE '%کمک%' OR position LIKE '%بهیار%' THEN 8
    WHEN position LIKE '%منشی%' THEN 9
    WHEN position LIKE '%پرستار%' THEN 7
    ELSE 10 END, IFNULL(years_experience, -1) DESC, created_at`;

const SHIFT_STAFF_ORDER_W = SHIFT_STAFF_ORDER.replace(/\b(position|years_experience|created_at)\b/g, 'w.$1');

const SHIFT_SETTINGS_DEFAULT = { hour_m: 6, clock_m: '07:00-13:30', hour_e: 6, clock_e: '13:00-19:00', hour_n: 12, clock_n: '19:00-07:00', hour_h: 6 };

function shiftCellHours(codes, hrs) {
  hrs = hrs || SHIFT_SETTINGS_DEFAULT;
  if (!codes) return 0;
  if (codes.includes('H')) return hrs.hour_h;
  let h = 0;
  if (codes.includes('M')) h += hrs.hour_m;
  if (codes.includes('E')) h += hrs.hour_e;
  if (codes.includes('N')) h += hrs.hour_n;
  return h;
}

function daysInJalaliMonth(jy, jm) {
  const r = jalaliMonthRange(jy, jm);
  return Math.round((new Date(r.end) - new Date(r.start)) / 86400000);
}

function shiftAccessUnit(req, title) {
  const asWard = hnAccessWard(req, title, false);
  if (!asWard.error) return asWard;
  if (asWard.status === 403 && nrsCanView(req)) {
    const w = query('SELECT id, title, icon FROM nursing_wards WHERE hospital_id = ? AND title = ?',
      [req.hospitalId, title]).rows[0];
    if (w) return { ward: w, isHead: false, isDeputy: false, isOverseer: false, isViewer: true };
  }
  const unit = query('SELECT * FROM shift_units WHERE hospital_id = ? AND title = ?',
    [req.hospitalId, title]).rows[0];
  if (!unit) return { error: 'بخش/واحد یافت نشد', status: 404 };
  if (!nrsCanManage(req)) return { error: 'دسترسی ندارید', status: 403 };
  return { ward: { id: unit.id, title: unit.title, icon: null }, isHead: false, isDeputy: false, isOverseer: true, isCustomUnit: true };
}

function getWardShiftSettings(hospitalId, ward) {
  const row = query('SELECT * FROM shift_ward_settings WHERE hospital_id = ? AND ward = ?', [hospitalId, ward]).rows[0];
  return row ? {
    hour_m: row.hour_m, clock_m: row.clock_m, hour_e: row.hour_e, clock_e: row.clock_e,
    hour_n: row.hour_n, clock_n: row.clock_n, hour_h: row.hour_h
  } : { ...SHIFT_SETTINGS_DEFAULT };
}

function parseHolidays(csv) {
  return String(csv || '').split(',').map(s => parseInt(s, 10)).filter(n => Number.isFinite(n) && n >= 1 && n <= 31);
}

const docCodes = require('../services/doc-codes');

function signatureImageFor(userId, hospitalId) {
  const mine = query(`SELECT file_name FROM electronic_signatures WHERE hospital_id = ? AND user_id = ?
    ORDER BY is_active DESC, created_at DESC LIMIT 1`, [hospitalId, userId]).rows[0];
  if (mine) return mine.file_name;
  const active = query(`SELECT file_name FROM electronic_signatures WHERE hospital_id = ? AND user_id IS NULL AND is_active = 1
    LIMIT 1`, [hospitalId]).rows[0];
  return active ? active.file_name : null;
}

function resolveRecipient(recipientId, hospitalId) {
  if (!recipientId) return null;
  return query('SELECT id, full_name FROM users WHERE id = ? AND hospital_id = ? AND is_active = 1',
    [recipientId, hospitalId]).rows[0] || null;
}

function nrsUserOrNull(id, hospitalId) {
  if (!id) return null;
  const u = query('SELECT id FROM users WHERE id = ? AND hospital_id = ? AND is_active = 1', [id, hospitalId]).rows[0];
  return u ? u.id : null;
}

const FMEA_STATUSES = ['new', 'in_review', 'closed'];
const FMEA_REQUIRED = ['subject', 'reporting_department', 'failure_modes', 'root_causes', 'effects', 'existing_controls'];
const FMEA_LABELS = {
  subject: 'موضوع', reporting_department: 'واحد گزارش‌دهنده', failure_modes: 'خطرات احتمالی',
  root_causes: 'علل خطا', effects: 'اثرات و تبعات', existing_controls: 'اقدامات کنترلی موجود',
};

function fmeaBody(b) {
  for (const f of FMEA_REQUIRED) {
    if (!String(b?.[f] || '').trim()) return { error: `${FMEA_LABELS[f]} الزامی است` };
  }
  if (b.status && !FMEA_STATUSES.includes(b.status)) return { error: 'وضعیت نامعتبر است' };
  return {
    value: {
      reporter_name: String(b.reporter_name || '').trim() || null,
      subject: String(b.subject).trim(),
      reporting_department: String(b.reporting_department).trim(),
      related_hazard_area: String(b.related_hazard_area || '').trim() || null,
      hazard_type: String(b.hazard_type || '').trim() || null,
      failure_modes: String(b.failure_modes).trim(),
      root_causes: String(b.root_causes).trim(),
      effects: String(b.effects).trim(),
      existing_controls: String(b.existing_controls).trim(),
      recommended_actions: String(b.recommended_actions || '').trim() || null,
    },
  };
}

function fmeaInsert(v, hospitalId, createdBy, source) {
  const id = uuid();
  query(`INSERT INTO fmea_records (id, hospital_id, reporter_name, subject, reporting_department,
    related_hazard_area, hazard_type, failure_modes, root_causes, effects, existing_controls,
    recommended_actions, source, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    [id, hospitalId, v.reporter_name, v.subject, v.reporting_department, v.related_hazard_area,
     v.hazard_type, v.failure_modes, v.root_causes, v.effects, v.existing_controls,
     v.recommended_actions, source, createdBy || null]);
  return id;
}

const CL_ANSWER_VALUES = {
  likert5: { empty: 0, low: 1, medium: 2, good: 3, excellent: 4 },
  yes_no: { no: 0, yes: 1 },
};
const CL_ANSWER_LABELS = {
  likert5: { empty: 'خالی', low: 'کم', medium: 'متوسط', good: 'خوب', excellent: 'عالی' },
  yes_no: { no: 'خیر', yes: 'بله' },
};
const CL_NONCONFORMITY = { yes_no: ['no'], likert5: ['empty', 'low'] };
function isNonConformity(answerType, answer) {
  return (CL_NONCONFORMITY[answerType] || CL_NONCONFORMITY.likert5).includes(String(answer || ''));
}

function indJudge(value, target, higherIsBetter) {
  if (value === null || value === undefined || target === null || target === undefined) return null;
  const met = higherIsBetter ? value >= target : value <= target;
  if (met) return 'ok';
  const gap = Math.abs(value - target) / (Math.abs(target) || 1);
  return gap <= 0.1 ? 'warn' : 'down';
}

function indRow(k) {
  return { ...k, quality_dimension: safeArray(parseJSON(k.quality_dimension)) };
}

module.exports = {
  express, query, db, path, fs, bcrypt, config,
  authRequired, requirePermission, requireAnyPermission, hospitalScope, requireFeature,
  scopeFor, axisCodeOf, measureAllowed,
  jalaliYearRange, jalaliMonthRange, safeYear, toGregorian, toJalali, todayJalali, JMONTHS,
  tehranNow, tehranTodayStr, TEHRAN_OFFSET_MS,
  logAction, uuid, parseJSON, safeArray, buildTrackingCode,
  mountCrud, crudNormalize, crudHasUpdatedAt, evaluatePolicy,
  upload, uploadSingle, uploadMultiple, compressImage,
  RULE_TYPES, RULE_TYPE_FA, reminderItemsFor,
  timelineFor, dismissMilestone, snoozeMilestone, setMilestoneState,
  assistantNext, assistantReview, periodProgress, getSmartDecisions, myWork, assistantChat,
  extractText, classifyDocument, extractFlowchart,
  TIME_RE, DATE_RE, applyYearFilter, loadOverrides, statusYear, codeCmp, sortTree,
  canAssignRole, hasPerm, normFa, matchFa, truthy,
  MER_EVAL_STATUSES, merValidate, merInsert, originalName, storeUploadedFile, sendStoredFile,
  LIB_CATEGORIES, libSectionId, getChecklist, saveChecklistMeasurers, chkMeasurers, itemHasSubmissions,
  BSC_PERSPECTIVES, JMONTHS_FA, matchPerspective, currentJalaliYear, bscYear, bscData,
  IND_ASPECTS, IND_TYPES, IND_INTERVALS, IND_DESIRABILITY, IND_VALUE_STATUS,
  IND_TEXT_FIELDS, IND_NUM_FIELDS, IND_FLAG_FIELDS, indBody,
  nrsCanManage, nrsCanView, headNurseWardsOf, hnAccessWard, hnHeadPresentToday,
  SHIFT_STAFF_ORDER, SHIFT_STAFF_ORDER_W, SHIFT_SETTINGS_DEFAULT, shiftCellHours, daysInJalaliMonth,
  shiftAccessUnit, getWardShiftSettings, parseHolidays,
  docCodes, signatureImageFor, resolveRecipient, nrsUserOrNull,
  FMEA_STATUSES, FMEA_REQUIRED, FMEA_LABELS, fmeaBody, fmeaInsert,
  CL_ANSWER_VALUES, CL_ANSWER_LABELS, CL_NONCONFORMITY, isNonConformity,
  indJudge, indRow
};
