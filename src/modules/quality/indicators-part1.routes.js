/**
 * Quality Indicators & KPIs Part 1 Routes
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
  isNonConformity
} = common;

// Helper to bind mountCrud to this module router
const mountCrud = (prefix, ...args) => common.mountCrud(router, prefix, ...args);

// ===== ماژول شاخص — شناسنامه، داده‌ی دوره‌ای، روند و داشبورد =====
//
// سند مرجعِ کارفرما (بخش ۱۰) یک ماژول شاخصِ مستقل می‌خواهد: ۶۱ شاخص استاندارد،
// شناسنامه‌ی ۳۴ فیلدی، فهرست با جست‌وجو و صفحه‌بندی، ثبت داده‌ی دوره‌ای بدون
// امکان تکرار، نمودار روند، و داشبورد. زیرساختش از قبل بود ولی فقط از داخل
// صفحه‌ی BSC دیده می‌شد. این بلوک همان جدول‌ها را از بیرونِ BSC هم در دسترس
// می‌گذارد — نه جدول تازه، نه شاخصِ موازی.
//
// چرا مسیر /indicators و نه گسترشِ /kpis: سه روتِ /kpis از قبل مصرف‌کننده دارند
// (داشبورد قدیمی) و شکلِ پاسخشان قرارداد است. مسیر تازه آن‌ها را دست نمی‌زند.

const IND_ASPECTS = ['بالینی', 'مدیریتی'];
const IND_TYPES = ['ساختاری', 'فرآیندی', 'پیامدی'];
const IND_INTERVALS = ['ماهانه', 'سه ماه یکبار', 'شش ماه یکبار', 'سالانه'];
const IND_DESIRABILITY = ['افزاینده', 'کاهنده'];
const IND_VALUE_STATUS = ['ثبت‌شده', 'تأییدشده', 'ردشده'];

// ستون‌هایی که کاربر اجازه‌ی نوشتنشان را دارد. فهرستِ سفید است نه سیاه: ستونی
// مثل data_origin یا hospital_id هرگز از بدنه‌ی درخواست نمی‌آید.
const IND_TEXT_FIELDS = ['title', 'code', 'definition', 'logical_reasons', 'basis', 'unit',
  'report_type', 'delivery_respite', 'source', 'ward_name', 'category',
  'numerator_description', 'denominator_description', 'numerator_formula', 'denominator_formula',
  // محورِ اعتباربخشیِ مرتبط. قابلِ ویرایش است چون نگاشتِ خودکارِ
  // database/seed-indicators.js از روی دسته‌ی شاخص حدس می‌زند و مدیرِ مرکز باید
  // بتواند اصلاحش کند — همان چیزی که کارفرما خواست: «ارتباطشان را درست کن».
  'linked_axis_code',
  'bsc_perspective'];
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
  // is_active استثناست: نبودنش در بدنه یعنی «کاری به فعال‌بودن ندارم»، نه
  // «غیرفعالش کن». بدون این، شاخصِ تازه‌ساخته بلافاصله از فهرست غیب می‌شد و
  // حتی کنترلِ عنوانِ تکراری هم آن را نمی‌دید (فهرست فقط فعال‌ها را می‌بیند).
  if (body.is_active === undefined) out.is_active = 1;
  // فیلدهای فهرست‌بسته: مقدار خارج از فهرست پذیرفته نمی‌شود، ولی خالی‌بودن مجاز است.
  out.aspect = matchFa(IND_ASPECTS, body.aspect);
  out.indicator_type = matchFa(IND_TYPES, body.indicator_type);
  out.measure_interval = matchFa(IND_INTERVALS, body.measure_interval);
  out.desirability = matchFa(IND_DESIRABILITY, body.desirability);
  // جهت مطلوب دو نمایش دارد (متن برای انسان، عدد برای محاسبه‌ی BSC) و باید
  // همیشه با هم بخوانند، وگرنه نمودار BSC خلافِ شناسنامه قضاوت می‌کند.
  out.higher_is_better = out.desirability === 'افزاینده' ? 1 : 0;
  out.managemental = out.aspect === 'مدیریتی' ? 1 : 0;
  // ابعاد کیفیت: آرایه‌ی متنی، هر عضو کوتاه‌شده تا فیلد به سند تبدیل نشود
  const qd = Array.isArray(body.quality_dimension) ? body.quality_dimension
    : (typeof body.quality_dimension === 'string' ? safeArray(parseJSON(body.quality_dimension)) : []);
  out.quality_dimension = JSON.stringify(qd.map(s => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 12));
  if (out.bsc_perspective) out.bsc_perspective = matchPerspective(out.bsc_perspective);
  return out;
}

// همان قضاوتی که bscData می‌کند، اینجا هم لازم است. یک تابع مشترک، چون اگر دو
// جا دو منطق داشته باشند، همان شاخص در دو صفحه دو رنگ می‌گیرد.
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

// ---- فهرست: جست‌وجو + فیلتر + مرتب‌سازی فارسی + صفحه‌بندی سمت سرور ----
router.get('/indicators', authRequired,
  requireAnyPermission('view_indicators', 'manage_indicators', 'view_bsc', 'manage_bsc'),
  hospitalScope, (req, res) => {
    try {
      const q = req.query || {};
      const where = ['hospital_id = ?'];
      const args = [req.hospitalId];
      // «غیرفعال» حذفِ نرم است؛ پیش‌فرض نشان داده نمی‌شود ولی با active=all دیده می‌شود.
      if (q.active !== 'all') { where.push('is_active = ?'); args.push(q.active === '0' ? 0 : 1); }
      if (q.search) {
        where.push('(title LIKE ? OR code LIKE ? OR ward_name LIKE ? OR definition LIKE ?)');
        const like = `%${String(q.search).trim()}%`;
        args.push(like, like, like, like);
      }
      for (const [param, col] of [['ward', 'ward_name'], ['aspect', 'aspect'],
        ['type', 'indicator_type'], ['interval', 'measure_interval'], ['basis', 'basis'],
        ['category', 'category'], ['axis', 'linked_axis_code']]) {
        if (q[param]) { where.push(`${col} = ?`); args.push(String(q[param])); }
      }
      if (q.year) { const y = parseInt(q.year, 10); if (Number.isFinite(y)) { where.push('year = ?'); args.push(y); } }
      if (q.safety === '1') where.push('safety_related = 1');
      if (q.mandatory === '1') where.push('is_mandatory = 1');
      if (q.mandatory === '0') where.push('is_mandatory = 0');

      const sql = `FROM hospital_kpis WHERE ${where.join(' AND ')}`;
      const total = query(`SELECT COUNT(*) c ${sql}`, args).rows[0].c;
      // سند ۱۰ رکورد در صفحه می‌خواهد؛ سقف ۲۰۰ می‌گذاریم تا یک درخواست
      // نتواند کلِ جدول را بکشد.
      const per = Math.min(Math.max(parseInt(q.per_page, 10) || 10, 1), 200);
      const page = Math.max(parseInt(q.page, 10) || 1, 1);
      // ترتیب بر اساس دسته، بعد عنوان. قبلاً ward_name بود که برای این داده عملاً
      // همان دسته است ولی برای شاخصِ دستیِ یک مرکز می‌تواند خالی باشد و آن ردیف‌ها
      // را بی‌دلیل اولِ فهرست می‌نشاند. COALESCE آن‌ها را ته فهرست می‌برد.
      const rows = query(
        `SELECT * ${sql} ORDER BY COALESCE(NULLIF(category,''), 'ی') , title LIMIT ? OFFSET ?`,
        args.concat([per, (page - 1) * per])).rows;

      // گزینه‌های فیلتر از خودِ داده می‌آیند، نه از فهرست ثابت — بیمارستانی که
      // بخش تازه‌ای اضافه کند، بدون تغییر کد در فیلتر می‌بیندش.
      const facet = (col) => query(
        `SELECT DISTINCT ${col} v FROM hospital_kpis WHERE hospital_id = ? AND ${col} IS NOT NULL AND ${col} <> '' ORDER BY ${col}`,
        [req.hospitalId]).rows.map(r => r.v);

      res.json({
        indicators: rows.map(indRow),
        total, page, per_page: per, pages: Math.max(Math.ceil(total / per), 1),
        facets: { wards: facet('ward_name'), aspects: facet('aspect'), types: facet('indicator_type'),
          intervals: facet('measure_interval'), bases: facet('basis'), years: facet('year'),
          categories: facet('category'), axes: facet('linked_axis_code') },
      });
    } catch (err) { console.error('[Indicators]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- داشبورد شاخص: ۴ KPI اصلی + تفکیک‌ها + پنج شاخص اخیر ----
// قبل از /indicators/:id ثبت می‌شود، وگرنه 'dashboard' به‌عنوان id گرفته می‌شود.
router.get('/indicators/dashboard', authRequired,
  requireAnyPermission('view_indicators', 'manage_indicators', 'view_bsc', 'manage_bsc'),
  hospitalScope, (req, res) => {
    try {
      const year = bscYear(req.query.year);
      const kpis = query(
        `SELECT id, title, unit, target_value, higher_is_better, ward_name, aspect, indicator_type,
                safety_related, is_mandatory, measure_interval, updated_at
         FROM hospital_kpis WHERE hospital_id = ? AND is_active = 1`, [req.hospitalId]).rows;
      const vals = query(
        `SELECT kpi_id, jalali_month, value FROM bsc_monthly_values
         WHERE hospital_id = ? AND jalali_year = ?`, [req.hospitalId, year]).rows;

      const byKpi = {};
      for (const v of vals) (byKpi[v.kpi_id] = byKpi[v.kpi_id] || []).push(v);

      let withData = 0, onTarget = 0, offTarget = 0;
      for (const k of kpis) {
        const series = byKpi[k.id] || [];
        if (!series.length) continue;
        withData++;
        // آخرین ماهِ ثبت‌شده مبنای «سرِ هدف بودن» است، نه میانگین — مدیر
        // می‌خواهد بداند الان کجاست، نه امسال روی‌هم‌رفته کجا بود.
        const last = series.reduce((a, b) => (b.jalali_month > a.jalali_month ? b : a));
        const j = indJudge(last.value, k.target_value, k.higher_is_better);
        if (j === 'ok') onTarget++; else if (j !== null) offTarget++;
      }

      const countBy = (fn) => kpis.reduce((acc, k) => {
        const key = fn(k) || 'نامشخص';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      res.json({
        year,
        // ۴ KPI اصلیِ سند
        summary: {
          total: kpis.length,
          with_data: withData,
          on_target: onTarget,
          off_target: offTarget,
          coverage_percent: kpis.length ? Math.round((withData / kpis.length) * 100) : 0,
        },
        by_ward: countBy(k => k.ward_name),            // نمودار میله‌ای
        by_aspect: countBy(k => k.aspect),             // بالینی / مدیریتی
        by_type: countBy(k => k.indicator_type),       // نمودار دایره‌ای
        by_interval: countBy(k => k.measure_interval),
        safety_count: kpis.filter(k => k.safety_related).length,
        mandatory_count: kpis.filter(k => k.is_mandatory).length,
        recent: kpis.slice().sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
          .slice(0, 5).map(k => ({ id: k.id, title: k.title, ward_name: k.ward_name, unit: k.unit })),
      });
    } catch (err) { console.error('[Indicators/dashboard]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });

// ---- نمودار مقایسه‌ای ----
//
// کارفرما خواست: «نمودارهای مقایسه‌ای را با فیلتر ماه و سال یا تاریخ دستی
// ایجاد کن.» تا امروز فقط نمودارِ روندِ *یک* شاخص در *یک* سال وجود داشت، پس
// مقایسه‌ی دو شاخص یا دو سال اصلاً ممکن نبود.
//
// یک بازه‌ی پیوسته (سال+ماهِ شروع تا سال+ماهِ پایان) برمی‌گرداند، نه یک سالِ
// ثابت — همین یک تصمیم، هر سه حالتی که کارفرما خواست را پوشش می‌دهد:
// یک سالِ کامل، یک ماهِ مشخص در چند سال، و بازه‌ی دلخواه.
//
// مرزها مثل بقیه: فقط hospital_id همین کاربر، و فقط شاخص‌هایی که واقعاً مالِ
// همین مرکزند (id هایی که از بیرون بیایند و مالِ مرکز نباشند بی‌صدا کنار
// می‌روند، نه اینکه داده‌ی مرکزِ دیگری را برگردانند).
// نام ماه‌ها از همان JMONTHS_FA ِ بالای همین فایل می‌آید که BSC هم استفاده می‌کند —
// یک فهرستِ دوم برای همان دوازده کلمه، فقط راهی می‌شد که روزی از هم دربروند.
router.get('/indicators/compare', authRequired,
  requireAnyPermission('view_indicators', 'manage_indicators', 'view_bsc', 'manage_bsc'),
  hospitalScope, (req, res) => {
    try {
      const q = req.query || {};
      const clamp = (v, lo, hi, dflt) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : dflt;
      };
      const thisYear = bscYear(undefined);
      const fromYear = clamp(q.from_year, 1300, 1500, thisYear);
      const toYear = clamp(q.to_year, 1300, 1500, fromYear);
      const fromMonth = clamp(q.from_month, 1, 12, 1);
      const toMonth = clamp(q.to_month, 1, 12, 12);

      // بازه‌ی وارونه (پایان قبل از شروع) خطا نیست، اشتباهِ تایپیِ کاربر است —
      // جایشان عوض می‌شود تا به‌جای نمودارِ خالی، همان چیزی را ببیند که می‌خواست.
      let a = fromYear * 12 + (fromMonth - 1);
      let b = toYear * 12 + (toMonth - 1);
      if (a > b) { const t = a; a = b; b = t; }
      // سقفِ ۶۰ ماه (پنج سال): بیش از این نه روی نمودار خوانا است و نه لازم.
      if (b - a > 59) b = a + 59;

      // دانه‌بندی: ماهانه، فصلی، شش‌ماهه، سالانه. کارفرما هر چهار را خواست چون
      // گزارشِ فصلی و نیم‌سالانه همان چیزی است که در جلسه‌ی مدیریت ارائه می‌شود،
      // و دوازده ستونِ ماهانه برای آن جلسه زیادی ریز است.
      const GRAINS = { month: 1, quarter: 3, half: 6, year: 12 };
      const grain = Object.prototype.hasOwnProperty.call(GRAINS, q.grain) ? q.grain : 'month';
      const gsize = GRAINS[grain];
      // برچسبِ سطلِ درون‌سال. «فصل» اینجا یعنی سه‌ماهه‌ی تقویمِ شمسی (فروردین—خرداد
      // = بهار)، نه سه‌ماهه‌ی مالیِ میلادی.
      const SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
      const HALVES = ['نیمه‌ی اول', 'نیمه‌ی دوم'];
      const bucketName = (bi) => grain === 'month' ? JMONTHS_FA[bi]
        : grain === 'quarter' ? SEASONS[bi]
          : grain === 'half' ? HALVES[bi] : 'کل سال';
      const bucketsPerYear = 12 / gsize;

      // چیدمان: «پیوسته» یعنی خطِ زمان از ابتدا تا انتها؛ «تطبیقی» یعنی محورِ افقی
      // سطلِ درون‌سال است و هر سال یک سریِ جداگانه — یعنی فروردین ۱۴۰۴ دقیقاً کنارِ
      // فروردین ۱۴۰۵ می‌ایستد. خواسته‌ی صریحِ کارفرما، و کاری که خطِ زمانِ پیوسته
      // ذاتاً نمی‌تواند بکند چون آن دو ماه دوازده ستون از هم فاصله دارند.
      const align = q.align === 'yoy' ? 'yoy' : 'timeline';

      const yearsInRange = [];
      for (let y = Math.floor(a / 12); y <= Math.floor(b / 12); y++) yearsInRange.push(y);

      // periods = ستون‌های محورِ افقی. در حالتِ پیوسته سطلِ زمانی، در حالتِ تطبیقی
      // سطلِ درون‌سال.
      // «جمع‌های دوره‌ای درهم»: ستونِ سه‌ماهه بلافاصله بعد از سه ماهِ خودش و
      // جمعِ کل در انتها، دقیقاً مثل نمودارهای خودِ کارفرما:
      //   فروردین | اردیبهشت | خرداد | سه ماهه اول | تیر | … | سه ماهه چهارم | جمع کل
      // فقط با دانه‌بندیِ ماهانه معنا دارد؛ روی فصلی/سالانه ستونِ جمع تکرارِ
      // خودِ ستون می‌شود.
      const subtotals = String(q.subtotals || '') === '1' && grain === 'month';

      const periods = [];
      if (align === 'yoy') {
        for (let bi = 0; bi < bucketsPerYear; bi++) {
          periods.push({ bucket: bi, label: bucketName(bi) });
          if (subtotals && bi % 3 === 2) {
            periods.push({ roll: [bi - 2, bi - 1, bi], label: SEASONS[(bi - 2) / 3] });
          }
        }
        if (subtotals) periods.push({ roll: 'all', label: 'کل سال' });
      } else {
        for (let m = a; m <= b; m += gsize) {
          const y = Math.floor(m / 12), bi = Math.floor((m % 12) / gsize);
          periods.push({ year: y, bucket: bi,
            label: grain === 'year' ? String(y) : `${bucketName(bi)} ${y}` });
          if (subtotals && bi % 3 === 2) {
            periods.push({ year: y, roll: [bi - 2, bi - 1, bi], label: `${SEASONS[(bi - 2) / 3]} ${y}` });
          }
        }
        if (subtotals) {
          for (const y of yearsInRange) periods.push({ year: y, roll: 'all', label: `جمع کل ${y}` });
        }
      }

      const ids = String(q.ids || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 8);
      let kpis;
      if (ids.length) {
        kpis = query(
          `SELECT id, title, unit, target_value, higher_is_better, category, linked_axis_code
           FROM hospital_kpis WHERE hospital_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
          [req.hospitalId, ...ids]).rows;
      } else if (q.category) {
        // بدونِ انتخابِ صریح، یک دسته‌ی کامل مقایسه می‌شود — کاربر لازم نباشد
        // اول هشت شاخص را تک‌تک پیدا کند.
        kpis = query(
          `SELECT id, title, unit, target_value, higher_is_better, category, linked_axis_code
           FROM hospital_kpis WHERE hospital_id = ? AND is_active = 1 AND category = ?
           ORDER BY title LIMIT 8`, [req.hospitalId, String(q.category)]).rows;
      } else {
        kpis = [];
      }

      let series = [];
      if (kpis.length) {
        const kids = kpis.map(k => k.id);
        const vals = query(
          `SELECT kpi_id, jalali_year, jalali_month, value FROM bsc_monthly_values
           WHERE hospital_id = ? AND kpi_id IN (${kids.map(() => '?').join(',')})`,
          [req.hospitalId, ...kids]).rows;
        const at = {};
        for (const v of vals) at[`${v.kpi_id}|${v.jalali_year}|${v.jalali_month}`] = v.value;

        // شمارشی جمع می‌شود، نرخ میانگین. همان قاعده‌ای که خودِ کارفرما در
        // نمودارهایش به‌کار برده: «تعداد بیماران پذیرش‌شده» ِ بهار = ۲۹۴+۴۵۵+۳۶۸
        // = ۱۱۱۷، ولی «درصد اعزام» ِ بهار میانگینِ سه ماه است نه جمع‌شان (که
        // ۱۲٪ می‌شد و بی‌معنا). جمعِ درصدها عددی می‌سازد که هیچ‌چیز نیست.
        const isCount = k => /^(تعداد|نفر|مورد)$/.test(String(k.unit || '').trim());

        const monthsOf = (year, p) => {
          if (p.roll === 'all') return Array.from({ length: 12 }, (_, i) => i);
          if (Array.isArray(p.roll)) {
            // سطلِ فصلی روی دانه‌بندیِ ماهانه: هر عضوِ roll یک ماه است
            return p.roll.slice();
          }
          const bi = p.bucket;
          return Array.from({ length: gsize }, (_, i) => bi * gsize + i);
        };

        const bucketValue = (k, year, p) => {
          const acc = [];
          for (const m of monthsOf(year, p)) {
            // فقط ماه‌هایی که واقعاً داخلِ بازه‌ی درخواستی‌اند
            const abs = year * 12 + m;
            if (abs < a || abs > b) continue;
            const raw = at[`${k.id}|${year}|${m + 1}`];
            if (raw !== undefined && raw !== null) acc.push(raw);
          }
          if (!acc.length) return null;
          const sum = acc.reduce((x, y) => x + y, 0);
          // ماهِ بدون داده در میانگین شرکت نمی‌کند تا یک ماهِ خالی کلِ فصل را
          // پایین نکشد.
          return isCount(k) ? sum : sum / acc.length;
        };

        const summarize = (k, label, year, points) => {
          // ستون‌های جمعِ دوره‌ای از خلاصه بیرون می‌مانند: «بهار» خودش جمعِ سه
          // ماهِ کنارش است و اگر در میانگین/کمینه/بیشینه بیاید همان داده دو بار
          // شمرده می‌شود — بیشینه‌ی یک شاخصِ شمارشی همیشه «جمع کل» می‌شد.
          const filled = points.filter((v, i) => v !== null && !periods[i].roll);
          return {
            id: k.id, title: k.title, label, year,
            unit: k.unit, category: k.category,
            target_value: k.target_value, higher_is_better: k.higher_is_better,
            linked_axis_code: k.linked_axis_code,
            points,
            // خلاصه‌ی همان بازه، تا کاربر برای «کدام بهتر شد» مجبور نباشد
            // خودش از روی نمودار حساب کند.
            count: filled.length,
            min: filled.length ? Math.min(...filled) : null,
            max: filled.length ? Math.max(...filled) : null,
            avg: filled.length ? filled.reduce((x, y) => x + y, 0) / filled.length : null,
            first: filled.length ? filled[0] : null,
            last: filled.length ? filled[filled.length - 1] : null,
          };
        };

        if (align === 'yoy') {
          // یک سری به ازای هر (شاخص × سال). با دو شاخص و سه سال می‌شود شش سری —
          // سقفِ ۸ همان سقفِ رنگ‌های قابلِ تفکیک است، پس اگر ضرب از آن رد شد،
          // سال‌های نزدیک‌تر می‌مانند: مقایسه با پارسال مهم‌تر از پنج سال پیش است.
          const years = yearsInRange.slice(-Math.max(1, Math.floor(8 / kpis.length)));
          for (const k of kpis) {
            for (const y of years) {
              const points = periods.map(p => bucketValue(k, y, p));
              series.push(summarize(k, `${k.title} — ${y}`, y, points));
            }
          }
          series = series.slice(0, 8);
        } else {
          series = kpis.map(k =>
            summarize(k, k.title, null, periods.map(p => bucketValue(k, p.year, p))));
        }
      }

      res.json({ periods, series, grain, align, subtotals,
        years: yearsInRange,
        range: { from_year: Math.floor(a / 12), from_month: (a % 12) + 1,
          to_year: Math.floor(b / 12), to_month: (b % 12) + 1 } });
    } catch (err) { console.error('[Indicators/compare]', err); res.status(500).json({ error: 'خطای سرور' }); }
  });


module.exports = router;
