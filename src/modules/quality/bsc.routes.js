/**
 * Quality Balanced Scorecard (BSC) Routes
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

// ===== کارت امتیازی متوازن (BSC) — ۴ وجه × ۱۲ ماه شمسی (database/seed-bsc.js) =====
// شاخص همان hospital_kpis است؛ اینجا فقط گروه‌بندی وجه + مقادیر ماهانه اضافه می‌شود.
const BSC_PERSPECTIVES = ['مالی', 'گیرنده خدمت', 'فرآیندهای داخلی', 'رشد و یادگیری'];
const JMONTHS_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

// کیبورد عربی «ي/ك» و نیم‌فاصله‌های متفاوت باعث می‌شد نام وجه با فهرست بالا برابر نشود و
// بی‌سروصدا NULL ذخیره شود. از normFa/matchFa مشترک (بالای همین فایل) استفاده می‌شود.
function matchPerspective(input) {
  return matchFa(BSC_PERSPECTIVES, input);
}

// سال شمسی جاری از تاریخ میلادی سرور (تقریب مرزی کافی است: ۲۱ مارس مبدأ سال)
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

  const perspectives = BSC_PERSPECTIVES.map(p => ({ perspective: p, indicators: [] }));
  const other = { perspective: 'دسته‌بندی‌نشده', indicators: [] };
  for (const k of kpis) {
    const months = byKpi[k.id] || {};
    const series = [];
    for (let m = 1; m <= 12; m++) series.push(months[m] === undefined ? null : months[m]);
    const recorded = series.filter(v => v !== null);
    const avg = recorded.length ? recorded.reduce((a, b) => a + b, 0) / recorded.length : null;
    // وضعیت هر ماه نسبت به تارگت — با احترام به جهت مطلوب شاخص (کمتر بهتر / بیشتر بهتر)
    const higher = k.higher_is_better === null || k.higher_is_better === undefined ? 1 : k.higher_is_better;
    const judge = v => {
      if (v === null || k.target_value === null || k.target_value === undefined) return null;
      const met = higher ? v >= k.target_value : v <= k.target_value;
      if (met) return 'ok';
      const gap = Math.abs(v - k.target_value) / (Math.abs(k.target_value) || 1);
      return gap <= 0.1 ? 'warn' : 'down';
    };
    const row = {
      id: k.id, title: k.title, unit: k.unit, target: k.target_value, definition: k.definition,
      dimension: k.dimension, higher_is_better: !!higher,
      months: series, month_status: series.map(judge),
      average: avg === null ? null : Math.round(avg * 100) / 100,
      average_status: judge(avg), recorded_count: recorded.length,
    };
    const canon = matchPerspective(k.bsc_perspective);
    const bucket = perspectives.find(p => p.perspective === canon) || other;
    bucket.indicators.push(row);
  }
  if (other.indicators.length) perspectives.push(other);
  return { year, months_fa: JMONTHS_FA, perspectives };
}

router.get('/bsc', authRequired, requireAnyPermission('view_bsc', 'manage_bsc'), hospitalScope, (req, res) => {
  try {
    const data = bscData(req.hospitalId, bscYear(req.query.year));
    res.json({ ...data, can_manage: (req.user.permissions || []).includes('manage_bsc') });
  } catch (err) { console.error('[BSC]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ثبت/به‌روزرسانی مقدار یک ماه — upsert روی کلید (شاخص، سال، ماه) تا ردیف تکراری نسازد.
// مقدار خالی یعنی «اندازه‌گیری نشده» و ردیف را حذف می‌کند (تا با صفرِ واقعی اشتباه نشود).
router.put('/bsc/values', authRequired, requirePermission('manage_bsc'), hospitalScope, (req, res) => {
  try {
    const { kpi_id } = req.body;
    const year = bscYear(req.body.jalali_year);
    const month = parseInt(req.body.jalali_month, 10);
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ error: 'ماه شمسی نامعتبر است' });
    const kpi = query('SELECT id FROM hospital_kpis WHERE id = ? AND hospital_id = ?', [kpi_id, req.hospitalId]).rows[0];
    if (!kpi) return res.status(404).json({ error: 'شاخص یافت نشد' });

    const raw = req.body.value;
    if (raw === null || raw === undefined || raw === '') {
      query('DELETE FROM bsc_monthly_values WHERE kpi_id = ? AND jalali_year = ? AND jalali_month = ?', [kpi.id, year, month]);
      return res.json({ status: 'cleared' });
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return res.status(400).json({ error: 'مقدار شاخص باید عدد باشد' });
    query(`INSERT INTO bsc_monthly_values (id, hospital_id, kpi_id, jalali_year, jalali_month, value, note, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(kpi_id, jalali_year, jalali_month)
      DO UPDATE SET value = excluded.value, note = excluded.note, recorded_by = excluded.recorded_by, recorded_at = datetime('now')`,
      [uuid(), req.hospitalId, kpi.id, year, month, value,
       req.body.note ? String(req.body.note) : null, req.user.id]);
    res.json({ status: 'saved', jalali_year: year, jalali_month: month, value });
  } catch (err) { console.error('[BSC]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// تعیین وجه BSC / واحد / تارگت یک شاخص موجود (بدون ساخت موجودیت شاخص جدید)
router.put('/bsc/indicators/:id', authRequired, requirePermission('manage_bsc'), hospitalScope, (req, res) => {
  try {
    const kpi = query('SELECT id FROM hospital_kpis WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!kpi) return res.status(404).json({ error: 'شاخص یافت نشد' });
    const wantPersp = req.body.bsc_perspective;
    const persp = wantPersp === '' || wantPersp === null || wantPersp === undefined ? null : matchPerspective(wantPersp);
    // نام وجه اشتباه را بی‌سروصدا NULL نمی‌کنیم — کاربر باید بفهمد ذخیره نشده
    if (persp === null && wantPersp) return res.status(400).json({ error: 'وجه کارت امتیازی نامعتبر است: ' + BSC_PERSPECTIVES.join(' / ') });
    const target = req.body.target_value === '' || req.body.target_value === null || req.body.target_value === undefined
      ? null : Number(req.body.target_value);
    if (target !== null && !Number.isFinite(target)) return res.status(400).json({ error: 'تارگت باید عدد باشد' });
    query(`UPDATE hospital_kpis SET bsc_perspective = ?, unit = ?, target_value = ?, higher_is_better = ? WHERE id = ?`,
      [persp, req.body.unit ? String(req.body.unit) : null, target,
       truthy(req.body.higher_is_better) ? 1 : 0, kpi.id]);
    res.json({ status: 'updated' });
  } catch (err) { console.error('[BSC]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// خروجی CSV سازگار با اکسل — BOM برای اینکه اکسل فارسی را UTF-8 بخواند و به‌هم‌ریخته نشود
router.get('/bsc/export.csv', authRequired, requireAnyPermission('view_bsc', 'manage_bsc'), hospitalScope, (req, res) => {
  try {
    const year = bscYear(req.query.year);
    const data = bscData(req.hospitalId, year);
    const cell = v => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [['وجه کارت امتیازی', 'عنوان شاخص', 'واحد', 'تارگت', ...JMONTHS_FA, 'میانگین'].map(cell).join(',')];
    for (const p of data.perspectives) {
      for (const i of p.indicators) {
        lines.push([p.perspective, i.title, i.unit, i.target, ...i.months, i.average].map(cell).join(','));
      }
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bsc-${year}.csv"`);
    res.send('﻿' + lines.join('\r\n'));
  } catch (err) { console.error('[BSC]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
