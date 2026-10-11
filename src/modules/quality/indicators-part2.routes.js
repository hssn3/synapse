/**
 * Quality Indicators & KPIs Part 2 Routes
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

// ---- خروجی CSV ----
// همان فیلترهای فهرست را می‌پذیرد تا آنچه کاربر می‌بیند همان چیزی باشد که
// صادر می‌شود، و مثل بقیه‌ی خروجی‌ها فقط داده‌ی همین مرکز.
router.get('/indicators/export.csv', authRequired,
  requireAnyPermission('view_indicators', 'manage_indicators'), hospitalScope, (req, res) => {
    try {
      const rows = query(
        `SELECT * FROM hospital_kpis WHERE hospital_id = ? AND is_active = 1 ORDER BY ward_name, title`,
        [req.hospitalId]).rows;
      const cell = v => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const head = ['ردیف', 'عنوان', 'کد', 'بخش', 'جنبه', 'نوع', 'جهت مطلوب', 'واحد',
        'دوره اندازه‌گیری', 'روش گزارش', 'مبنا', 'منبع', 'هدف', 'حد بالا', 'حد پایین',
        'ایمنی بیمار', 'اجباری', 'سال', 'ابعاد کیفیت'];
      const lines = [head.map(cell).join(',')];
      rows.forEach((k, i) => lines.push([i + 1, k.title, k.code, k.ward_name, k.aspect, k.indicator_type,
        k.desirability, k.unit, k.measure_interval, k.report_type, k.basis, k.source,
        k.target_value, k.upper_limit, k.lower_limit,
        k.safety_related ? 'بله' : 'خیر', k.is_mandatory ? 'بله' : 'خیر', k.year,
        safeArray(parseJSON(k.quality_dimension)).join('؛')].map(cell).join(',')));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="indicators.csv"');
      res.send('﻿' + lines.join('\r\n'));
    } catch (err) { console.error('[Indicators/csv]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- شناسنامه‌ی یک شاخص + روند دوره‌ای ----
router.get('/indicators/:id', authRequired,
  requireAnyPermission('view_indicators', 'manage_indicators', 'view_bsc', 'manage_bsc'),
  hospitalScope, (req, res) => {
    try {
      const k = query('SELECT * FROM hospital_kpis WHERE id = ? AND hospital_id = ?',
        [req.params.id, req.hospitalId]).rows[0];
      if (!k) return res.status(404).json({ error: 'شاخص یافت نشد' });

      const year = bscYear(req.query.year);
      const vals = query(
        `SELECT v.jalali_year, v.jalali_month, v.value, v.note, v.status, v.source_note,
                v.recorded_at, v.approved_at, u.full_name AS recorded_by_name, a.full_name AS approved_by_name
         FROM bsc_monthly_values v
         LEFT JOIN users u ON u.id = v.recorded_by
         LEFT JOIN users a ON a.id = v.approved_by
         WHERE v.hospital_id = ? AND v.kpi_id = ? AND v.jalali_year = ?
         ORDER BY v.jalali_month`, [req.hospitalId, k.id, year]).rows;

      const months = new Array(12).fill(null);
      for (const v of vals) if (v.jalali_month >= 1 && v.jalali_month <= 12) months[v.jalali_month - 1] = v.value;

      const collectors = query(
        `SELECT c.id, c.user_id, COALESCE(c.display_name, u.full_name) AS name
         FROM kpi_collectors c LEFT JOIN users u ON u.id = c.user_id
         WHERE c.hospital_id = ? AND c.kpi_id = ?`, [req.hospitalId, k.id]).rows;

      // سال‌هایی که برای همین شاخص داده دارند — برای سوییچ سال در نمودار روند
      const years = query(
        `SELECT DISTINCT jalali_year y FROM bsc_monthly_values
         WHERE hospital_id = ? AND kpi_id = ? ORDER BY y DESC`, [req.hospitalId, k.id]).rows.map(r => r.y);

      res.json({
        indicator: indRow(k), year, years, collectors,
        months_fa: JMONTHS_FA,
        trend: months,
        trend_status: months.map(v => indJudge(v, k.target_value, k.higher_is_better)),
        values: vals,
      });
    } catch (err) { console.error('[Indicators/get]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- ساخت شاخص ----
router.post('/indicators', authRequired, requirePermission('manage_indicators'), hospitalScope,
  async (req, res) => {
    try {
      const b = indBody(req.body || {}, req.hospitalId);
      if (!b.title) return res.status(400).json({ error: 'عنوان شاخص الزامی است' });
      // عنوان تکراری در همان مرکز یعنی همان شاخص دو بار تعریف شده — و بعد دو
      // سری داده‌ی جدا می‌گیرد که هیچ‌کدام کامل نیست.
      const dup = query('SELECT id FROM hospital_kpis WHERE hospital_id = ? AND title = ? AND is_active = 1',
        [req.hospitalId, b.title]).rows[0];
      if (dup) return res.status(409).json({ error: 'شاخصی با همین عنوان از قبل وجود دارد' });
      if (b.upper_limit !== null && b.lower_limit !== null && b.upper_limit < b.lower_limit) {
        return res.status(400).json({ error: 'حد بالا نمی‌تواند کمتر از حد پایین باشد' });
      }

      const id = uuid();
      const cols = Object.keys(b);
      query(
        `INSERT INTO hospital_kpis (id, hospital_id, data_origin, created_at, updated_at, ${cols.join(', ')})
         VALUES (?, ?, 'local', datetime('now'), datetime('now'), ${cols.map(() => '?').join(', ')})`,
        [id, req.hospitalId, ...cols.map(c => b[c])]);

      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'indicator_create',
        entityType: 'hospital_kpis', entityId: id, details: b.title });
      res.status(201).json({ id, status: 'created' });
    } catch (err) { console.error('[Indicators/create]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- ویرایش شاخص ----
router.put('/indicators/:id', authRequired, requirePermission('manage_indicators'), hospitalScope,
  async (req, res) => {
    try {
      const existing = query('SELECT id, title FROM hospital_kpis WHERE id = ? AND hospital_id = ?',
        [req.params.id, req.hospitalId]).rows[0];
      if (!existing) return res.status(404).json({ error: 'شاخص یافت نشد' });

      const b = indBody(req.body || {}, req.hospitalId);
      if (!b.title) return res.status(400).json({ error: 'عنوان شاخص الزامی است' });
      const dup = query('SELECT id FROM hospital_kpis WHERE hospital_id = ? AND title = ? AND id <> ? AND is_active = 1',
        [req.hospitalId, b.title, existing.id]).rows[0];
      if (dup) return res.status(409).json({ error: 'شاخص دیگری با همین عنوان وجود دارد' });
      if (b.upper_limit !== null && b.lower_limit !== null && b.upper_limit < b.lower_limit) {
        return res.status(400).json({ error: 'حد بالا نمی‌تواند کمتر از حد پایین باشد' });
      }

      const cols = Object.keys(b);
      query(`UPDATE hospital_kpis SET ${cols.map(c => `${c} = ?`).join(', ')}, updated_at = datetime('now')
             WHERE id = ? AND hospital_id = ?`,
        [...cols.map(c => b[c]), existing.id, req.hospitalId]);

      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'indicator_update',
        entityType: 'hospital_kpis', entityId: existing.id, details: b.title });
      res.json({ status: 'updated' });
    } catch (err) { console.error('[Indicators/update]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- حذف (نرم) ----
// حذف سخت نمی‌کنیم: مقادیر دوره‌ای و ارجاع BSC به این ردیف وصل‌اند و پاک‌کردنشان
// یعنی از بین بردنِ سابقه‌ی چند سال داده. غیرفعال‌کردن همان کاری را می‌کند که
// کاربر می‌خواهد، بدون از دست رفتن تاریخچه.
router.delete('/indicators/:id', authRequired, requirePermission('manage_indicators'), hospitalScope,
  async (req, res) => {
    try {
      const k = query('SELECT id, title FROM hospital_kpis WHERE id = ? AND hospital_id = ?',
        [req.params.id, req.hospitalId]).rows[0];
      if (!k) return res.status(404).json({ error: 'شاخص یافت نشد' });
      query(`UPDATE hospital_kpis SET is_active = 0, updated_at = datetime('now') WHERE id = ?`, [k.id]);
      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'indicator_deactivate',
        entityType: 'hospital_kpis', entityId: k.id, details: k.title });
      res.json({ status: 'deactivated' });
    } catch (err) { console.error('[Indicators/delete]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- ثبت داده‌ی دوره‌ای ----
// بند ۱۰.۶ سند: «از ثبت داده تکراری برای یک شاخص، مرکز، سال و دوره جلوگیری کن؛
// مگر اینکه نسخه یا correction مشخص باشد.» ایندکس یکتای
// bsc_monthly_values(kpi_id, jalali_year, jalali_month) این را در سطح دیتابیس
// تضمین می‌کند و اینجا ثبتِ دوباره به‌جای ردیف تازه، همان ردیف را اصلاح می‌کند
// و در note ردّ اصلاح می‌گذارد.
router.put('/indicators/:id/values', authRequired, requirePermission('manage_indicators'), hospitalScope,
  async (req, res) => {
    try {
      const k = query('SELECT id, title FROM hospital_kpis WHERE id = ? AND hospital_id = ?',
        [req.params.id, req.hospitalId]).rows[0];
      if (!k) return res.status(404).json({ error: 'شاخص یافت نشد' });

      const year = bscYear(req.body.year);
      const month = parseInt(req.body.month, 10);
      if (!Number.isFinite(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'ماه باید بین ۱ تا ۱۲ باشد' });
      }
      const raw = req.body.value;
      const value = (raw === '' || raw === null || raw === undefined) ? null : Number(raw);
      if (value !== null && !Number.isFinite(value)) return res.status(400).json({ error: 'مقدار باید عدد باشد' });

      const note = req.body.note === undefined ? null : String(req.body.note).trim().slice(0, 500) || null;
      const sourceNote = req.body.source_note === undefined ? null : String(req.body.source_note).trim().slice(0, 300) || null;

      const prev = query(
        `SELECT id, value FROM bsc_monthly_values WHERE hospital_id = ? AND kpi_id = ? AND jalali_year = ? AND jalali_month = ?`,
        [req.hospitalId, k.id, year, month]).rows[0];

      if (prev) {
        // اصلاح: وضعیت به «ثبت‌شده» برمی‌گردد چون مقدارِ تأییدشده عوض شده و
        // تأیید قبلی دیگر معتبر نیست.
        query(`UPDATE bsc_monthly_values
               SET value = ?, note = ?, source_note = ?, status = 'ثبت‌شده',
                   approved_by = NULL, approved_at = NULL,
                   recorded_by = ?, recorded_at = datetime('now')
               WHERE id = ?`, [value, note, sourceNote, req.user.id, prev.id]);
      } else {
        query(`INSERT INTO bsc_monthly_values
                 (id, hospital_id, kpi_id, jalali_year, jalali_month, value, note, source_note,
                  status, recorded_by, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ثبت‌شده', ?, datetime('now'))`,
          [uuid(), req.hospitalId, k.id, year, month, value, note, sourceNote, req.user.id]);
      }

      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id,
        action: prev ? 'indicator_value_correct' : 'indicator_value_record',
        entityType: 'bsc_monthly_values', entityId: k.id,
        details: `${k.title} — ${year}/${month}: ${prev ? `${prev.value} ← ` : ''}${value}` });
      res.json({ status: prev ? 'corrected' : 'recorded' });
    } catch (err) { console.error('[Indicators/value]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- تأیید یا رد مقدار دوره‌ای ----
router.post('/indicators/:id/values/approve', authRequired, requirePermission('manage_indicators'),
  hospitalScope, async (req, res) => {
    try {
      const year = bscYear(req.body.year);
      const month = parseInt(req.body.month, 10);
      if (!Number.isFinite(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'ماه باید بین ۱ تا ۱۲ باشد' });
      }
      const status = matchFa(IND_VALUE_STATUS, req.body.status);
      if (!status || status === 'ثبت‌شده') return res.status(400).json({ error: 'وضعیت باید «تأییدشده» یا «ردشده» باشد' });

      const row = query(
        `SELECT id FROM bsc_monthly_values WHERE hospital_id = ? AND kpi_id = ? AND jalali_year = ? AND jalali_month = ?`,
        [req.hospitalId, req.params.id, year, month]).rows[0];
      if (!row) return res.status(404).json({ error: 'مقداری برای این دوره ثبت نشده است' });

      query(`UPDATE bsc_monthly_values SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
        [status, req.user.id, row.id]);
      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'indicator_value_approve',
        entityType: 'bsc_monthly_values', entityId: row.id, details: `${year}/${month} → ${status}` });
      res.json({ status });
    } catch (err) { console.error('[Indicators/approve]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- جمع‌آورندگان ----
router.put('/indicators/:id/collectors', authRequired, requirePermission('manage_indicators'),
  hospitalScope, async (req, res) => {
    try {
      const k = query('SELECT id, title FROM hospital_kpis WHERE id = ? AND hospital_id = ?',
        [req.params.id, req.hospitalId]).rows[0];
      if (!k) return res.status(404).json({ error: 'شاخص یافت نشد' });
      const ids = safeArray(req.body.user_ids).map(String).slice(0, 30);
      // فقط کاربرانِ همین بیمارستان — id از بدنه می‌آید و نباید به کاربر مرکز
      // دیگری اشاره کند.
      const valid = ids.length ? query(
        `SELECT id FROM users WHERE hospital_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
        [req.hospitalId, ...ids]).rows.map(r => r.id) : [];

      query('DELETE FROM kpi_collectors WHERE hospital_id = ? AND kpi_id = ?', [req.hospitalId, k.id]);
      for (const uid of valid) {
        query(`INSERT INTO kpi_collectors (id, hospital_id, kpi_id, user_id) VALUES (?, ?, ?, ?)`,
          [uuid(), req.hospitalId, k.id, uid]);
      }
      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'indicator_collectors',
        entityType: 'hospital_kpis', entityId: k.id, details: `${k.title} — ${valid.length} نفر` });
      res.json({ status: 'saved', count: valid.length });
    } catch (err) { console.error('[Indicators/collectors]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });


module.exports = router;
