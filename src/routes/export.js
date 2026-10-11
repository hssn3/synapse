/**
 * مسیرهای خروجی Excel (xlsx) و گزارش‌های پیشرفته
 * ---------------------------------------------------------------
 * چرا فایل جدا: api.js با ۷۲۳KB بزرگ‌ترین فایل پروژه است و تغییر مستقیم آن
 * ریسک merge conflict و باگ‌های ناخواسته دارد. طبق AGENTS.md «کنارش اضافه کن».
 *
 * این router در app.js import و روی /api mount می‌شود — دقیقاً کنار api.js.
 *
 * endpoint ها:
 *   GET /api/export/measures.xlsx      — خروجی سنجه‌ها
 *   GET /api/export/indicators.xlsx    — خروجی شاخص‌ها
 *   GET /api/export/bsc.xlsx           — خروجی BSC
 *   GET /api/export/users.xlsx         — خروجی کاربران
 *   GET /api/export/checklists/:id.xlsx — خروجی چک‌لیست
 *   GET /api/measures/:id/history      — تاریخچه تغییرات وضعیت سنجه
 *   GET /api/measures/:id/trend        — داده‌ی روند (برای نمودار)
 */
'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../config/database-sqlite');
const { authRequired, requireAnyPermission, requirePermission } = require('../middleware/auth');
const { hospitalScope } = require('../middleware/auth');
const { buildXlsx } = require('../utils/excel-export');
// چرا: سال سنجه‌ها شمسی است (۱۴۰۴/۱۴۰۵) — پیش‌فرض میلادی خروجی خالی می‌داد.
const { todayJalali } = require('../config/jalali');

// ========================== خروجی Excel ==========================

// --- سنجه‌ها ---
router.get('/export/measures.xlsx', authRequired, hospitalScope, async (req, res) => {
  try {
    const year = req.query.year || todayJalali().jy;
    const rows = query(`
      SELECT s.code, s.title, s.responsible_role, s.measure_level,
             CASE WHEN s.patient_safety_flag = 1 THEN 'بله' ELSE 'خیر' END as safety,
             COALESCE(ms.status, 'not_reviewed') as status,
             ms.internal_status, ms.external_status, ms.na_reason, ms.notes
      FROM accreditation_sections s
      LEFT JOIN measure_status ms ON s.id = ms.measure_id AND ms.hospital_id = ? AND ms.year = ?
      WHERE s.level_type = 'measure'
      ORDER BY s.code
    `, [req.hospitalId, year]).rows;

    // ترجمه وضعیت
    const STATUS_FA = {
      'full_compliant': 'تطابق کامل', 'partial': 'تطابق جزئی',
      'non_compliant': 'عدم تطابق', 'not_reviewed': 'بررسی نشده',
      'not_applicable': 'نامرتبط'
    };
    rows.forEach(r => { r.status = STATUS_FA[r.status] || r.status; });

    const buffer = await buildXlsx({
      sheetName: 'سنجه‌ها',
      title: `وضعیت سنجه‌های اعتباربخشی — سال ${year}`,
      columns: [
        { header: 'کد', key: 'code', width: 16 },
        { header: 'عنوان', key: 'title', width: 50 },
        { header: 'مسئول', key: 'responsible_role', width: 22 },
        { header: 'سطح', key: 'measure_level', width: 14 },
        { header: 'ایمنی بیمار', key: 'safety', width: 14 },
        { header: 'وضعیت', key: 'status', width: 18 },
        { header: 'ارزیابی داخلی', key: 'internal_status', width: 16 },
        { header: 'ارزیابی خارجی', key: 'external_status', width: 16 },
        { header: 'دلیل نامرتبط', key: 'na_reason', width: 30 },
        { header: 'یادداشت', key: 'notes', width: 30 },
      ],
      rows,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="measures-${year}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Export/measures.xlsx]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// --- شاخص‌ها ---
router.get('/export/indicators.xlsx', authRequired, requireAnyPermission('view_indicators', 'manage_indicators'), hospitalScope, async (req, res) => {
  try {
    const rows = query(`
      SELECT k.code, k.title, k.unit, k.target_value, k.bsc_perspective,
             CASE WHEN k.is_active = 1 THEN 'فعال' ELSE 'غیرفعال' END as active_fa,
             CASE WHEN k.safety_related = 1 THEN 'بله' ELSE 'خیر' END as safety_fa,
             k.category, k.linked_axis_code
      FROM hospital_kpis k
      WHERE k.hospital_id = ? AND k.is_active = 1
      ORDER BY k.code
    `, [req.hospitalId]).rows;

    const buffer = await buildXlsx({
      sheetName: 'شاخص‌ها',
      title: 'فهرست شاخص‌های بیمارستان',
      columns: [
        { header: 'کد', key: 'code', width: 14 },
        { header: 'عنوان', key: 'title', width: 45 },
        { header: 'واحد', key: 'unit', width: 14 },
        { header: 'هدف', key: 'target_value', width: 12 },
        { header: 'وجه BSC', key: 'bsc_perspective', width: 18 },
        { header: 'وضعیت', key: 'active_fa', width: 12 },
        { header: 'ایمنی', key: 'safety_fa', width: 10 },
        { header: 'دسته‌بندی', key: 'category', width: 18 },
        { header: 'محور اعتباربخشی', key: 'linked_axis_code', width: 20 },
      ],
      rows,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="indicators.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Export/indicators.xlsx]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// --- کاربران ---
router.get('/export/users.xlsx', authRequired, requirePermission('manage_users'), hospitalScope, async (req, res) => {
  try {
    const rows = query(`
      SELECT u.full_name, u.username, u.email, u.phone, u.department,
             r.title_fa as role_title,
             CASE WHEN u.is_active = 1 THEN 'فعال' ELSE 'غیرفعال' END as active_fa,
             u.last_login_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.hospital_id = ?
      ORDER BY r.title_fa, u.full_name
    `, [req.hospitalId]).rows;

    const buffer = await buildXlsx({
      sheetName: 'کاربران',
      title: 'فهرست کاربران بیمارستان',
      columns: [
        { header: 'نام و نام خانوادگی', key: 'full_name', width: 30 },
        { header: 'نام کاربری', key: 'username', width: 20 },
        { header: 'ایمیل', key: 'email', width: 30 },
        { header: 'تلفن', key: 'phone', width: 16 },
        { header: 'واحد', key: 'department', width: 20 },
        { header: 'نقش', key: 'role_title', width: 22 },
        { header: 'وضعیت', key: 'active_fa', width: 12 },
        { header: 'آخرین ورود', key: 'last_login_at', width: 22 },
      ],
      rows,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Export/users.xlsx]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// --- BSC: مقادیر ماهانه + شاخص‌ها ---
router.get('/export/bsc.xlsx', authRequired, hospitalScope, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || todayJalali().jy;
    const rows = query(`
      SELECT k.code, k.title, k.bsc_perspective, k.unit, k.target_value,
             v.jalali_month, v.value, v.note
      FROM hospital_kpis k
      LEFT JOIN bsc_monthly_values v ON v.kpi_id = k.id AND v.jalali_year = ? AND v.hospital_id = ?
      WHERE k.hospital_id = ?
      ORDER BY k.bsc_perspective, k.code, v.jalali_month
    `, [year, req.hospitalId, req.hospitalId]).rows;

    const buffer = await buildXlsx({
      sheetName: 'BSC',
      title: `کارت امتیازی متوازن — سال ${year}`,
      columns: [
        { header: 'کد', key: 'code', width: 14 },
        { header: 'شاخص', key: 'title', width: 45 },
        { header: 'وجه', key: 'bsc_perspective', width: 18 },
        { header: 'واحد', key: 'unit', width: 12 },
        { header: 'هدف', key: 'target_value', width: 12 },
        { header: 'ماه', key: 'jalali_month', width: 10 },
        { header: 'مقدار', key: 'value', width: 12 },
        { header: 'یادداشت', key: 'note', width: 30 },
      ],
      rows,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bsc-${year}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Export/bsc.xlsx]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// --- چک‌لیست خاص: اقلام + ارسال‌ها ---
router.get('/export/checklists/:id.xlsx', authRequired, hospitalScope, async (req, res) => {
  try {
    const cl = query('SELECT id, title FROM checklists WHERE id = ? AND hospital_id = ?', [req.params.id, req.hospitalId]).rows[0];
    if (!cl) return res.status(404).json({ error: 'چک‌لیست یافت نشد' });
    const items = query(`
      SELECT d.title as domain, i.question_text, i.answer_type, i.weight, i.sort_order
      FROM checklist_items i
      LEFT JOIN checklist_domains d ON i.domain_id = d.id
      WHERE i.checklist_id = ? AND i.hospital_id = ?
      ORDER BY i.sort_order
    `, [req.params.id, req.hospitalId]).rows;

    const buffer = await buildXlsx({
      sheetName: 'چک‌لیست',
      title: `چک‌لیست: ${cl.title}`,
      columns: [
        { header: 'دامنه', key: 'domain', width: 25 },
        { header: 'سوال', key: 'question_text', width: 60 },
        { header: 'نوع پاسخ', key: 'answer_type', width: 16 },
        { header: 'وزن', key: 'weight', width: 10 },
        { header: 'ترتیب', key: 'sort_order', width: 10 },
      ],
      rows: items,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="checklist-${req.params.id}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Export/checklist.xlsx]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});


// ==================== تاریخچه وضعیت سنجه ====================

// --- GET /api/measures/:id/history — لیست تغییرات وضعیت یک سنجه ---
router.get('/measures/:id/history', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(`
      SELECT msh.id, msh.old_status, msh.new_status, msh.changed_at, msh.note,
             u.full_name as changed_by_name
      FROM measure_status_history msh
      LEFT JOIN users u ON msh.changed_by = u.id
      WHERE msh.measure_id = ? AND msh.hospital_id = ?
      ORDER BY msh.changed_at DESC
    `, [req.params.id, req.hospitalId]).rows;

    // ترجمه وضعیت‌ها برای فرانت
    const STATUS_FA = {
      'full_compliant': 'تطابق کامل', 'partial': 'تطابق جزئی',
      'non_compliant': 'عدم تطابق', 'not_reviewed': 'بررسی نشده',
      'not_applicable': 'نامرتبط'
    };
    rows.forEach(r => {
      r.old_status_fa = STATUS_FA[r.old_status] || r.old_status || '—';
      r.new_status_fa = STATUS_FA[r.new_status] || r.new_status;
    });

    res.json({ history: rows });
  } catch (err) {
    console.error('[MeasureHistory]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// --- GET /api/measures/:id/trend — داده‌ی روند ماه‌به‌ماه ---
router.get('/measures/:id/trend', authRequired, hospitalScope, (req, res) => {
  try {
    const rows = query(`
      SELECT msh.new_status as status, msh.changed_at,
             strftime('%Y-%m', msh.changed_at) as month
      FROM measure_status_history msh
      WHERE msh.measure_id = ? AND msh.hospital_id = ?
      ORDER BY msh.changed_at ASC
    `, [req.params.id, req.hospitalId]).rows;

    // تبدیل وضعیت به امتیاز عددی (برای نمودار)
    const SCORE = { 'full_compliant': 3, 'partial': 2, 'non_compliant': 1, 'not_reviewed': 0, 'not_applicable': null };
    const trend = rows.map(r => ({
      month: r.month,
      date: r.changed_at,
      status: r.status,
      score: SCORE[r.status] !== undefined ? SCORE[r.status] : 0,
    }));

    res.json({ trend });
  } catch (err) {
    console.error('[MeasureTrend]', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;
