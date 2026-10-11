/**
 * Clinical Shift Attendance & Leaves Routes
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

/* =====================================================================
   حضورِ شیفتی و گزارشِ ۲۴ ساعته — database/seed-shift-attendance.js
   ---------------------------------------------------------------------
   «سوپروایزر بالینی در همان شیفتی که مدیر پرستاری می‌نشیند نفرات را کنترل
   کند و روی شیفتِ همان نفر تیکِ حضورش را بزند؛ این فهرست تا آخرِ شیفتش در
   اختیارش باشد و در داشبورد مدیر پرستاری هم دیده شود که چند نفر در سازمان
   در حال شیفت‌دادن هستند.»

   سه تصمیمِ طراحی که بقیه از آن‌ها می‌آید:

   ۱. مرجعِ «چه کسی باید حاضر باشد» خودِ برنامه‌ی شیفت است، نه یک فهرستِ جدا.
      فهرستِ انتظارِ هر (بخش، تاریخ، شیفت) از shift_entries ساخته می‌شود — پس
      هرچه سرپرستار در گرید چید، همان‌جا برای تیک‌زدن ظاهر می‌شود و هیچ‌وقت با
      برنامه ناهمگام نمی‌شود. حرفِ ترکیبی هم درست می‌افتد: کسی که MEN دارد در
      هر سه شیفت انتظار می‌رود.

   ۲. «تا آخرِ شیفتش» = پنجره‌ی شیفتِ جاری، نه یک قفلِ دستی. سوپروایزر روی
      شیفتِ جاری همه‌ی بخش‌ها می‌نویسد و به‌محضِ عوض‌شدنِ شیفت، همان فهرست
      فقط‌خواندنی می‌شود. پس هیچ‌کس لازم نیست چیزی را ببندد و هیچ شیفتی هم
      بعداً دستکاری نمی‌شود.

   ۳. شیفتِ جاری از ساعتِ دیواریِ تهران حساب می‌شود با مرزهای سراسری
      (۰۷ تا ۱۴ صبح، ۱۴ تا ۱۹ عصر، ۱۹ تا ۰۷ شب). clock_m/e/n در
      shift_ward_settings متنِ نمایشیِ هر بخش است و بخش‌به‌بخش فرق می‌کند، پس
      برای یک عددِ سازمانی به‌درد نمی‌خورد. شبِ پیش از ۰۷ صبح متعلق به
      «دیروز» است، وگرنه شیفتِ شب هر شب نصف می‌شد.
   ===================================================================== */
const NSA_STATES = ['حاضر', 'غایب', 'تأخیر', 'جانشین'];
const NSA_SHIFTS = ['M', 'E', 'N'];
const NSA_SHIFT_FA = { M: 'صبح', E: 'عصر', N: 'شب' };
// همان ترتیبِ سلسله‌مراتبیِ برنامه‌ی شیفت، ولی با پیشوندِ جدول: در JOIN، ستون
// created_at هم در shift_schedules هست و بدون پیشوند مبهم می‌شود.
const SHIFT_STAFF_ORDER_W = SHIFT_STAFF_ORDER.replace(/\b(position|years_experience|created_at)\b/g, 'w.$1');

function nsaCurrentShift() {
  // گِترهای UTC روی tehranNow() ساعتِ دیواریِ تهران را می‌دهند (توضیح در config/jalali.js)
  const t = tehranNow();
  const h = t.getUTCHours();
  if (h >= 7 && h < 14) return { date: t.toISOString().slice(0, 10), shift: 'M' };
  if (h >= 14 && h < 19) return { date: t.toISOString().slice(0, 10), shift: 'E' };
  const base = h < 7 ? new Date(t.getTime() - 86400000) : t;
  return { date: base.toISOString().slice(0, 10), shift: 'N' };
}

function nsaIsSupervisor(req) {
  if (query('SELECT 1 FROM nursing_supervisor_slots WHERE hospital_id = ? AND user_id = ?',
    [req.hospitalId, req.user.id]).rows[0]) return true;
  return req.user.role_code === 'clinical_supervisor';
}

/**
 * چه کسی این (تاریخ، شیفت) را می‌بیند و چه کسی می‌نویسد.
 * نوشتن سه راه دارد: نظارتِ کامل (مدیر پرستاری/ادمین) هر زمان؛ سرپرستار/جانشینِ
 * همان بخش هر زمان؛ سوپروایزر بالینی روی همه‌ی بخش‌ها ولی فقط در پنجره‌ی شیفتِ
 * جاری. دیدن برای هر کسی که دسترسیِ نظارتیِ پرستاری دارد باز است.
 */
function nsaAccess(req, date, shift, ward) {
  const cur = nsaCurrentShift();
  const isCurrentWindow = date === cur.date && shift === cur.shift;
  const isSupervisor = nsaIsSupervisor(req);
  const overseer = nrsCanManage(req);
  // بخش‌هایی که این کاربر سرپرست یا جانشینشان است. سرپرستار بخش هیچ‌کدام از
  // مجوزهای سلسله‌مراتب پرستاری را ندارد (دسترسی‌اش reference-based است، مثل
  // داشبورد سرپرستار)، پس اگر این‌جا حساب نشود صفحه‌ی حضورِ بخشِ خودش را هم
  // نمی‌بیند.
  const ownWards = query(`SELECT title FROM nursing_wards
      WHERE hospital_id = ? AND (head_nurse_id = ? OR deputy1_id = ? OR deputy2_id = ?)`,
    [req.hospitalId, req.user.id, req.user.id, req.user.id]).rows.map(r => r.title);
  // بدونِ بخشِ مشخص (نمای «همه‌ی بخش‌ها») سرپرستار هم ویرایشگر است — چون فهرستی
  // که می‌بیند به بخش‌های خودش محدود شده. تکِ نوشتن همیشه بخش را می‌فرستد و
  // آن‌جا دقیق چک می‌شود، پس این سهل‌گیری چیزی را باز نمی‌کند.
  const wardWrite = ward ? ownWards.includes(ward) : ownWards.length > 0;
  const canWrite = overseer || wardWrite || (isSupervisor && isCurrentWindow);
  const canRead = canWrite || nrsCanView(req) || isSupervisor || ownWards.length > 0;
  // سرپرستارِ صرف فقط بخش‌های خودش را می‌بیند؛ سوپروایزر و ناظر همه را.
  const scopeWards = (overseer || isSupervisor || nrsCanView(req)) ? null : ownWards;
  return { canRead, canWrite, isSupervisor, isCurrentWindow, current: cur, overseer, ownWards, scopeWards };
}

/** فهرستِ انتظارِ یک (تاریخ، شیفت) از خودِ برنامه‌ی شیفت — همه‌ی بخش‌ها با یک پرس‌وجو. */
function nsaExpected(hospitalId, date, shift, ward) {
  const j = toJalali(...date.split('-').map(Number));
  const params = [hospitalId, j.jy, j.jm, j.jd, shift];
  const wardSql = ward ? ' AND s.ward = ?' : '';
  if (ward) params.push(ward);
  return query(`SELECT s.ward, e.staff_id, e.codes,
      w.first_name, w.last_name, w.position, w.personnel_code, w.years_experience
    FROM shift_schedules s
    JOIN shift_entries e ON e.schedule_id = s.id
    JOIN ward_staff w ON w.id = e.staff_id
    WHERE s.hospital_id = ? AND s.jalali_year = ? AND s.jalali_month = ? AND e.day = ?
      AND instr(e.codes, ?) > 0 AND w.is_active = 1${wardSql}
    ORDER BY s.ward, ${SHIFT_STAFF_ORDER_W}`, params).rows;
}

function nsaMarks(hospitalId, date, shift, ward) {
  const params = [hospitalId, date, shift];
  if (ward) params.push(ward);
  const rows = query(`SELECT ward, staff_id, state, note, substitute_staff_id, marked_at,
      (SELECT full_name FROM users WHERE id = marked_by) AS marked_by_name
    FROM nursing_shift_attendance
    WHERE hospital_id = ? AND att_date = ? AND shift_code = ?${ward ? ' AND ward = ?' : ''}`, params).rows;
  const by = {};
  for (const r of rows) by[r.ward + ' ' + r.staff_id] = r;
  return by;
}

/**
 * فهرستِ انتظار + تیک‌ها، گروه‌بندی‌شده بر اساس بخش، با شمارشِ هر بخش.
 * `scope` (اختیاری) فهرستِ بخش‌هایی است که کاربر حق دیدنشان را دارد؛ null یعنی همه.
 */
function nsaRoster(hospitalId, date, shift, ward, scope) {
  let expected = nsaExpected(hospitalId, date, shift, ward);
  if (scope) expected = expected.filter(e => scope.includes(e.ward));
  const marks = nsaMarks(hospitalId, date, shift, ward);
  const byWard = new Map();
  for (const e of expected) {
    if (!byWard.has(e.ward)) byWard.set(e.ward, { ward: e.ward, staff: [], counts: { حاضر: 0, غایب: 0, تأخیر: 0, جانشین: 0, ثبت‌نشده: 0 } });
    const g = byWard.get(e.ward);
    const m = marks[e.ward + ' ' + e.staff_id];
    g.staff.push({
      staff_id: e.staff_id, full_name: `${e.first_name} ${e.last_name}`, position: e.position,
      personnel_code: e.personnel_code, codes: e.codes,
      state: m ? m.state : null, note: m ? m.note : null,
      substitute_staff_id: m ? m.substitute_staff_id : null,
      marked_by_name: m ? m.marked_by_name : null, marked_at: m ? m.marked_at : null,
    });
    g.counts[m && g.counts[m.state] !== undefined ? m.state : 'ثبت‌نشده']++;
  }
  return [...byWard.values()];
}

function nsaTotals(wards) {
  const t = { expected: 0, حاضر: 0, غایب: 0, تأخیر: 0, جانشین: 0, ثبت‌نشده: 0 };
  for (const w of wards) {
    t.expected += w.staff.length;
    for (const k of Object.keys(w.counts)) t[k] += w.counts[k];
  }
  // «سرِ شیفت» یعنی کسی که واقعاً آمده — تأخیر هم آمده، فقط دیر. جانشین جای
  // غایب ایستاده، پس او هم نفرِ حاضرِ شیفت است.
  t.on_duty = t['حاضر'] + t['تأخیر'] + t['جانشین'];
  return t;
}

const NSA_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function nsaParams(req) {
  const cur = nsaCurrentShift();
  const date = NSA_DATE_RE.test(req.query.date) ? req.query.date : cur.date;
  const shift = NSA_SHIFTS.includes(req.query.shift) ? req.query.shift : cur.shift;
  return { date, shift, cur };
}

// ---- بافتِ صفحه: شیفتِ جاری، نقشِ کاربر، و بخش‌هایی که برنامه دارند ----
router.get('/shift/attendance/context', authRequired, hospitalScope, (req, res) => {
  try {
    const cur = nsaCurrentShift();
    const acc = nsaAccess(req, cur.date, cur.shift, null);
    if (!acc.canRead) return res.status(403).json({ error: 'دسترسی ندارید' });
    res.json({
      current: cur, current_shift_fa: NSA_SHIFT_FA[cur.shift],
      is_supervisor: acc.isSupervisor, is_overseer: acc.overseer,
      supervisor_slot: query(`SELECT label FROM nursing_supervisor_slots WHERE hospital_id = ? AND user_id = ?`,
        [req.hospitalId, req.user.id]).rows[0] || null,
      shifts: NSA_SHIFTS.map(k => ({ code: k, title: NSA_SHIFT_FA[k] })),
      states: NSA_STATES,
    });
  } catch (err) { console.error('[ShiftAttendance]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- فهرستِ حضور: همه‌ی بخش‌ها یا یک بخش ----
router.get('/shift/attendance', authRequired, hospitalScope, (req, res) => {
  const { date, shift, cur } = nsaParams(req);
  const ward = req.query.ward ? String(req.query.ward) : null;
  const acc = nsaAccess(req, date, shift, ward);
  if (!acc.canRead) return res.status(403).json({ error: 'دسترسی ندارید' });
  try {
    const wards = nsaRoster(req.hospitalId, date, shift, ward, acc.scopeWards);
    res.json({
      date, shift, shift_fa: NSA_SHIFT_FA[shift], current: cur,
      is_current_window: acc.isCurrentWindow, can_edit: acc.canWrite,
      wards, totals: nsaTotals(wards), states: NSA_STATES,
    });
  } catch (err) { console.error('[ShiftAttendance]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- خلاصه‌ی زنده برای داشبورد مدیر پرستاری ----
router.get('/shift/attendance/live', authRequired, hospitalScope, (req, res) => {
  try {
    const cur = nsaCurrentShift();
    const acc = nsaAccess(req, cur.date, cur.shift, null);
    if (!acc.canRead) return res.status(403).json({ error: 'دسترسی ندارید' });
    const wards = nsaRoster(req.hospitalId, cur.date, cur.shift, null, acc.scopeWards);
    // سوپروایزرِ کشیک از خودِ برنامه‌ی شیفت خوانده می‌شود، نه یک جدولِ کشیکِ
    // جداگانه که کسی باید هر روز پرش کند: هر کسی که در اسلاتِ سوپروایزری است و
    // اسمش در فهرستِ انتظارِ همین شیفت آمده، کشیکِ همین شیفت است.
    const slotNames = query('SELECT u.full_name FROM nursing_supervisor_slots s JOIN users u ON u.id = s.user_id WHERE s.hospital_id = ?',
      [req.hospitalId]).rows.map(r => r.full_name);
    const onDutySupervisors = [];
    for (const w of wards) for (const s of w.staff) if (slotNames.includes(s.full_name)) onDutySupervisors.push(s.full_name);
    res.json({
      date: cur.date, shift: cur.shift, shift_fa: NSA_SHIFT_FA[cur.shift],
      totals: nsaTotals(wards),
      wards: wards.map(w => ({ ward: w.ward, expected: w.staff.length, counts: w.counts })),
      supervisors_on_duty: [...new Set(onDutySupervisors)],
      can_edit: acc.canWrite,
    });
  } catch (err) { console.error('[ShiftAttendance]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

// ---- تیکِ حضورِ یک نفر ----
router.put('/shift/attendance', authRequired, hospitalScope, (req, res) => {
  const b = req.body || {};
  const cur = nsaCurrentShift();
  const date = NSA_DATE_RE.test(b.date) ? b.date : cur.date;
  const shift = NSA_SHIFTS.includes(b.shift) ? b.shift : cur.shift;
  const ward = b.ward ? String(b.ward) : '';
  if (!ward || !b.staff_id) return res.status(400).json({ error: 'بخش و پرسنل الزامی است' });
  const acc = nsaAccess(req, date, shift, ward);
  if (!acc.canWrite) {
    return res.status(403).json({
      error: acc.isSupervisor && !acc.isCurrentWindow
        ? `سوپروایزر بالینی فقط شیفتِ جاری (${NSA_SHIFT_FA[cur.shift]}) را ثبت می‌کند؛ این شیفت بسته است`
        : 'دسترسی ندارید',
    });
  }
  try {
    // فقط کسی که واقعاً در برنامه‌ی همین شیفت هست تیک می‌خورد — وگرنه عددِ
    // «سرِ شیفت» از فهرستِ انتظار بزرگ‌تر می‌شد و بی‌معنا.
    const expected = nsaExpected(req.hospitalId, date, shift, ward);
    if (!expected.some(e => e.staff_id === b.staff_id)) {
      return res.status(400).json({ error: 'این پرسنل در برنامه‌ی این شیفت نیست' });
    }
    const clear = b.state === null || b.state === '';
    if (clear) {
      query('DELETE FROM nursing_shift_attendance WHERE hospital_id=? AND ward=? AND att_date=? AND shift_code=? AND staff_id=?',
        [req.hospitalId, ward, date, shift, b.staff_id]);
      return res.json({ status: 'cleared' });
    }
    const state = NSA_STATES.includes(b.state) ? b.state : 'حاضر';
    let sub = null;
    if (state === 'جانشین' && b.substitute_staff_id) {
      const s = query('SELECT id FROM ward_staff WHERE id = ? AND hospital_id = ? AND is_active = 1',
        [b.substitute_staff_id, req.hospitalId]).rows[0];
      if (!s) return res.status(400).json({ error: 'جانشین معتبر نیست' });
      sub = s.id;
    }
    const note = b.note ? String(b.note).trim().slice(0, 400) : null;
    const ex = query('SELECT id FROM nursing_shift_attendance WHERE hospital_id=? AND ward=? AND att_date=? AND shift_code=? AND staff_id=?',
      [req.hospitalId, ward, date, shift, b.staff_id]).rows[0];
    if (ex) {
      query(`UPDATE nursing_shift_attendance SET state=?, substitute_staff_id=?, note=?, marked_by=?, marked_at=datetime('now') WHERE id=?`,
        [state, sub, note, req.user.id, ex.id]);
    } else {
      query(`INSERT INTO nursing_shift_attendance (id, hospital_id, ward, att_date, shift_code, staff_id, state, substitute_staff_id, note, marked_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [uuid(), req.hospitalId, ward, date, shift, b.staff_id, state, sub, note, req.user.id]);
    }
    res.json({ status: 'updated', state });
  } catch (err) { console.error('[ShiftAttendance]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

/* ---------------------------------------------------------------------
   گزارشِ ۲۴ ساعته‌ی سوپروایزر — سنجه‌ی الف‑۴‑۳‑۱
   ---------------------------------------------------------------------
   «گزارش‌های بیست و چهار ساعته سوپروایزرها به صورت روزانه توسط تیم رهبری و
   مدیریت بررسی و اقدامات اصلاحی لازم به عمل می‌آید.»

   دو طرفِ سنجه لازم است، نه یکی: نوشتنِ سوپروایزر، و بررسیِ تیم رهبری با
   اقدام اصلاحی. پس ماشینِ وضعیت سه‌حالته است و «ثبت‌شده»هایی که هنوز بررسی
   نشده‌اند قابلِ شمردن‌اند — همان چیزی که ارزیاب می‌پرسد.

   سرشماری در لحظه‌ی ثبت عکس‌برداری می‌شود، نه اینکه هر بار زنده حساب شود:
   گزارشِ امضاشده باید همان عددی را نشان دهد که موقعِ امضا دیده شده.
   --------------------------------------------------------------------- */
const NSR_STATUSES = ['پیش‌نویس', 'ثبت‌شده', 'بررسی‌شده'];
const nsrCanReview = req => nrsCanManage(req) || (req.user.permissions || []).includes('view_all_dashboards');

const nsrSelect = `SELECT r.*, su.full_name AS supervisor_name, ru.full_name AS reviewed_by_name
  FROM nursing_supervisor_reports r
  LEFT JOIN users su ON su.id = r.supervisor_id
  LEFT JOIN users ru ON ru.id = r.reviewed_by`;

/** سوپروایزر گزارشِ امروز و دیروز را می‌نویسد — شیفتِ شب بعد از نیمه‌شب تمام می‌شود. */
function nsrCanWrite(req, date) {
  if (nrsCanManage(req)) return true;
  if (!nsaIsSupervisor(req)) return false;
  const today = tehranTodayStr();
  const yday = new Date(new Date(today).getTime() - 86400000).toISOString().slice(0, 10);
  return date === today || date === yday;
}

router.get('/shift/report', authRequired, hospitalScope, (req, res) => {
  const { date, shift } = nsaParams(req);
  const acc = nsaAccess(req, date, shift, null);
  if (!acc.canRead) return res.status(403).json({ error: 'دسترسی ندارید' });
  try {
    const row = query(`${nsrSelect} WHERE r.hospital_id = ? AND r.report_date = ? AND r.shift_code = ?`,
      [req.hospitalId, date, shift]).rows[0] || null;
    // پیش‌خورِ سرشماری: تا وقتی گزارش ثبت نشده، عددِ زنده نشان داده می‌شود؛ بعد از
    // ثبت، عکسِ ذخیره‌شده — وگرنه اصلاحِ بعدیِ حضور، گزارشِ امضاشده را عوض می‌کرد.
    const live = nsaTotals(nsaRoster(req.hospitalId, date, shift, null));
    res.json({
      date, shift, shift_fa: NSA_SHIFT_FA[shift], report: row,
      headcount: row && row.status !== 'پیش‌نویس' ? parseJSON(row.headcount_json, live) : live,
      live_headcount: live,
      can_write: nsrCanWrite(req, date), can_review: nsrCanReview(req), statuses: NSR_STATUSES,
    });
  } catch (err) { console.error('[ShiftReport]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/shift/report', authRequired, hospitalScope, async (req, res) => {
  const b = req.body || {};
  const cur = nsaCurrentShift();
  const date = NSA_DATE_RE.test(b.date) ? b.date : cur.date;
  const shift = NSA_SHIFTS.includes(b.shift) ? b.shift : cur.shift;
  if (!nsrCanWrite(req, date)) return res.status(403).json({ error: 'فقط سوپروایزر کشیک (برای امروز یا دیروز) یا مدیر پرستاری می‌تواند گزارش بنویسد' });
  const txt = v => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim().slice(0, 8000));
  const submit = !!b.submit;
  try {
    const ex = query('SELECT * FROM nursing_supervisor_reports WHERE hospital_id=? AND report_date=? AND shift_code=?',
      [req.hospitalId, date, shift]).rows[0];
    if (ex && ex.status === 'بررسی‌شده' && !nrsCanManage(req)) {
      return res.status(400).json({ error: 'این گزارش بررسی شده و دیگر قابل ویرایش نیست' });
    }
    const status = submit ? 'ثبت‌شده' : (ex ? (ex.status === 'بررسی‌شده' ? 'بررسی‌شده' : 'پیش‌نویس') : 'پیش‌نویس');
    const headcount = JSON.stringify(nsaTotals(nsaRoster(req.hospitalId, date, shift, null)));
    if (ex) {
      query(`UPDATE nursing_supervisor_reports SET events=?, actions=?, handover=?, status=?,
          headcount_json = CASE WHEN ? THEN ? ELSE headcount_json END,
          submitted_at = CASE WHEN ? THEN datetime('now') ELSE submitted_at END,
          supervisor_id = COALESCE(supervisor_id, ?), updated_at = datetime('now')
        WHERE id = ?`,
        [txt(b.events), txt(b.actions), txt(b.handover), status,
          submit ? 1 : 0, headcount, submit ? 1 : 0, req.user.id, ex.id]);
    } else {
      query(`INSERT INTO nursing_supervisor_reports
        (id, hospital_id, report_date, shift_code, supervisor_id, headcount_json, events, actions, handover, status, submitted_at)
        VALUES (?,?,?,?,?,?,?,?,?,?, CASE WHEN ? THEN datetime('now') ELSE NULL END)`,
        [uuid(), req.hospitalId, date, shift, req.user.id, headcount,
          txt(b.events), txt(b.actions), txt(b.handover), status, submit ? 1 : 0]);
    }
    if (submit) {
      await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'supervisor_report_submitted',
        targetTable: 'nursing_supervisor_reports', targetId: date + '/' + shift, ipAddress: req.ip });
    }
    res.json({ status });
  } catch (err) { console.error('[ShiftReport]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.get('/shift/reports', authRequired, hospitalScope, (req, res) => {
  const acc = nsaAccess(req, tehranTodayStr(), 'M', null);
  if (!acc.canRead) return res.status(403).json({ error: 'دسترسی ندارید' });
  try {
    const w = ['r.hospital_id = ?'], p = [req.hospitalId];
    if (NSR_STATUSES.includes(req.query.status)) { w.push('r.status = ?'); p.push(req.query.status); }
    if (NSA_DATE_RE.test(req.query.from)) { w.push('r.report_date >= ?'); p.push(req.query.from); }
    if (NSA_DATE_RE.test(req.query.to)) { w.push('r.report_date <= ?'); p.push(req.query.to); }
    const items = query(`${nsrSelect} WHERE ${w.join(' AND ')} ORDER BY r.report_date DESC, r.shift_code LIMIT 200`, p).rows
      .map(r => ({ ...r, headcount: parseJSON(r.headcount_json, {}), shift_fa: NSA_SHIFT_FA[r.shift_code] }));
    res.json({
      items, can_review: nsrCanReview(req), statuses: NSR_STATUSES,
      pending_review: query(`SELECT COUNT(*) c FROM nursing_supervisor_reports WHERE hospital_id = ? AND status = 'ثبت‌شده'`,
        [req.hospitalId]).rows[0].c,
    });
  } catch (err) { console.error('[ShiftReport]', err); res.status(500).json({ error: 'خطای سرور' }); }
});

router.put('/shift/reports/:id/review', authRequired, hospitalScope, async (req, res) => {
  if (!nsrCanReview(req)) return res.status(403).json({ error: 'فقط تیم رهبری و مدیریت گزارش را بررسی می‌کند' });
  try {
    const ex = query('SELECT * FROM nursing_supervisor_reports WHERE id = ? AND hospital_id = ?',
      [req.params.id, req.hospitalId]).rows[0];
    if (!ex) return res.status(404).json({ error: 'گزارش یافت نشد' });
    if (ex.status === 'پیش‌نویس') return res.status(400).json({ error: 'گزارشِ پیش‌نویس هنوز ثبت نشده است' });
    const b = req.body || {};
    const txt = v => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim().slice(0, 4000));
    query(`UPDATE nursing_supervisor_reports SET status='بررسی‌شده', reviewed_by=?, reviewed_at=datetime('now'),
        review_note=?, corrective_action=?, updated_at=datetime('now') WHERE id=?`,
      [req.user.id, txt(b.review_note), txt(b.corrective_action), ex.id]);
    await logAction({ hospitalId: req.hospitalId, userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id, action: 'supervisor_report_reviewed',
      targetTable: 'nursing_supervisor_reports', targetId: ex.id, ipAddress: req.ip });
    res.json({ status: 'بررسی‌شده' });
  } catch (err) { console.error('[ShiftReport]', err); res.status(500).json({ error: 'خطای سرور' }); }
});


module.exports = router;
