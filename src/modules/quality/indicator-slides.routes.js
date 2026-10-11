/**
 * Indicator Presentation Slides & Hospital KPIs Routes
 * Part of Modular Monolith (Clean Architecture) — Project 313
 */
const express = require('express');
const router = express.Router();
const common = require('../common');
const ExcelJS = require('exceljs');

const {
  query, authRequired, requireAnyPermission,
  hospitalScope, logAction, parseJSON
} = common;

// 1. دریافت فهرست تمام اسلایدها و شاخص‌ها
router.get('/indicator-slides', authRequired,
  requireAnyPermission('view_indicator_slides', 'view_indicators', 'view_bsc', 'manage_indicators'),
  hospitalScope, (req, res) => {
    try {
      const { section_id, search } = req.query;
      let sql = `SELECT * FROM hospital_indicator_slides WHERE hospital_id = ?`;
      const params = [req.hospitalId];

      if (section_id) {
        sql += ` AND section_id = ?`;
        params.push(section_id);
      }

      if (search) {
        sql += ` AND (title LIKE ? OR slide_text LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ` ORDER BY slide_number ASC`;

      const rows = query(sql, params).rows;

      const slides = rows.map(r => ({
        id: r.id,
        slide_number: r.slide_number,
        section_id: r.section_id,
        section_title: r.section_title,
        title: r.title,
        slide_text: r.slide_text,
        chart_type: r.chart_type,
        unit: r.unit,
        headers: parseJSON(r.headers_json, []),
        data: parseJSON(r.data_json, []),
        corrective_actions: r.corrective_actions,
        year_from: r.year_from,
        year_to: r.year_to,
        updated_at: r.updated_at
      }));

      // آمار سرفصل‌ها
      const sectionsCount = {};
      const allRows = query(`SELECT section_id, section_title, COUNT(*) as c FROM hospital_indicator_slides WHERE hospital_id = ? GROUP BY section_id, section_title ORDER BY MIN(slide_number) ASC`, [req.hospitalId]).rows;
      
      const hospRow = query(`SELECT name FROM hospitals WHERE id = ?`, [req.hospitalId]).rows[0];
      const hospitalName = hospRow ? hospRow.name : 'بیمارستان';

      res.json({
        total: slides.length,
        hospital_name: hospitalName,
        slides,
        sections: allRows.map(s => ({ id: s.section_id, title: s.section_title, count: s.c }))
      });
    } catch (err) {
      console.error('[IndicatorSlides/list]', err);
      res.status(500).json({ error: 'خطای سرور در دریافت اسلایدهای شاخص' });
    }
  });

// 2. دریافت اطلاعات یک اسلاید خاص
router.get('/indicator-slides/:slideNumber', authRequired,
  requireAnyPermission('view_indicator_slides', 'view_indicators', 'view_bsc', 'manage_indicators'),
  hospitalScope, (req, res) => {
    try {
      const sNum = parseInt(req.params.slideNumber, 10);
      const r = query(`SELECT * FROM hospital_indicator_slides WHERE hospital_id = ? AND slide_number = ?`, [req.hospitalId, sNum]).rows[0];
      if (!r) {
        return res.status(404).json({ error: 'اسلاید یافت نشد' });
      }

      res.json({
        slide: {
          id: r.id,
          slide_number: r.slide_number,
          section_id: r.section_id,
          section_title: r.section_title,
          title: r.title,
          slide_text: r.slide_text,
          chart_type: r.chart_type,
          unit: r.unit,
          headers: parseJSON(r.headers_json, []),
          data: parseJSON(r.data_json, []),
          corrective_actions: r.corrective_actions,
          year_from: r.year_from,
          year_to: r.year_to,
          updated_at: r.updated_at
        }
      });
    } catch (err) {
      console.error('[IndicatorSlides/get]', err);
      res.status(500).json({ error: 'خطای سرور در دریافت اسلاید' });
    }
  });

// 3. به‌روزرسانی مقادیر دوره‌ای یک شاخص / اسلاید (زیرساخت ثبت داده)
router.put('/indicator-slides/:slideNumber/values', authRequired,
  requireAnyPermission('manage_indicator_slides', 'manage_indicators', 'manage_bsc'),
  hospitalScope, async (req, res) => {
    try {
      const sNum = parseInt(req.params.slideNumber, 10);
      const { data, rows, corrective_actions, title, unit } = req.body;
      const incomingData = data || rows;

      const existing = query(`SELECT id, title FROM hospital_indicator_slides WHERE hospital_id = ? AND slide_number = ?`, [req.hospitalId, sNum]).rows[0];
      if (!existing) {
        return res.status(404).json({ error: 'شاخص/اسلاید مورد نظر یافت نشد' });
      }

      const updates = ['updated_at = CURRENT_TIMESTAMP'];
      const params = [];

      if (Array.isArray(incomingData)) {
        updates.push('data_json = ?');
        params.push(JSON.stringify(incomingData));
      }
      if (corrective_actions !== undefined) {
        updates.push('corrective_actions = ?');
        params.push(String(corrective_actions || ''));
      }
      if (title !== undefined && String(title).trim()) {
        updates.push('title = ?');
        params.push(String(title).trim());
      }
      if (unit !== undefined) {
        updates.push('unit = ?');
        params.push(String(unit || ''));
      }

      params.push(req.hospitalId, sNum);
      query(`UPDATE hospital_indicator_slides SET ${updates.join(', ')} WHERE hospital_id = ? AND slide_number = ?`, params);

      try {
        await logAction({
          hospitalId: req.hospitalId,
          userId: (req.previewAdmin && req.previewAdmin.id) || req.user.id,
          action: 'indicator_slide_update',
          targetTable: 'hospital_indicator_slides',
          targetId: existing.id
        });
      } catch (logErr) { /* non-fatal */ }

      const updated = query(`SELECT * FROM hospital_indicator_slides WHERE hospital_id = ? AND slide_number = ?`, [req.hospitalId, sNum]).rows[0];

      res.json({
        status: 'updated',
        slide_number: sNum,
        slide: {
          id: updated.id,
          slide_number: updated.slide_number,
          section_id: updated.section_id,
          section_title: updated.section_title,
          title: updated.title,
          slide_text: updated.slide_text,
          chart_type: updated.chart_type,
          unit: updated.unit,
          headers: parseJSON(updated.headers_json, []),
          data: parseJSON(updated.data_json, []),
          corrective_actions: updated.corrective_actions,
          year_from: updated.year_from,
          year_to: updated.year_to,
          updated_at: updated.updated_at
        }
      });
    } catch (err) {
      console.error('[IndicatorSlides/update]', err);
      res.status(500).json({ error: 'خطای سرور در به‌روزرسانی مقادیر شاخص' });
    }
  });

// 4. خروجی اکسل جامع کلیه شاخص‌ها با تفکیک سرفصل‌ها
router.get('/indicator-slides/export/excel', authRequired,
  requireAnyPermission('view_indicator_slides', 'view_indicators', 'view_bsc', 'manage_indicators'),
  hospitalScope, async (req, res) => {
    try {
      const rows = query(`SELECT * FROM hospital_indicator_slides WHERE hospital_id = ? ORDER BY slide_number ASC`, [req.hospitalId]).rows;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'سامانه جامع اعتباربخشی و مدیریت بیمارستان';
      workbook.created = new Date();

      // سرفصل‌ها
      const sectionsMap = {};
      rows.forEach(r => {
        if (!sectionsMap[r.section_id]) {
          sectionsMap[r.section_id] = { title: r.section_title, slides: [] };
        }
        sectionsMap[r.section_id].slides.push(r);
      });

      // شیت خلاصه کل
      const summarySheet = workbook.addWorksheet('فهرست کلی شاخص‌ها', { views: [{ rightToLeft: true }] });
      summarySheet.columns = [
        { header: 'شماره اسلاید', key: 'slide_number', width: 14 },
        { header: 'سرفصل', key: 'section_title', width: 35 },
        { header: 'عنوان شاخص', key: 'title', width: 55 },
        { header: 'نوع شاخص', key: 'chart_type', width: 16 },
        { header: 'واحد', key: 'unit', width: 14 },
        { header: 'تعداد ردیف داده', key: 'data_count', width: 16 }
      ];

      // استایل هدر
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

      rows.forEach(r => {
        const d = parseJSON(r.data_json, []);
        summarySheet.addRow({
          slide_number: r.slide_number,
          section_title: r.section_title,
          title: r.title,
          chart_type: r.chart_type,
          unit: r.unit || '—',
          data_count: d.length
        });
      });

      // برای هر سرفصل یک شیت تفصیلی
      let sheetIndex = 1;
      for (const [secId, sec] of Object.entries(sectionsMap)) {
        const sheetName = `${sheetIndex}. ${sec.title.slice(0, 24)}`;
        const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });
        sheetIndex++;

        let curRow = 1;
        sec.slides.forEach(s => {
          const headers = parseJSON(s.headers_json, []);
          const data = parseJSON(s.data_json, []);

          // عنوان شاخص
          const titleRow = sheet.getRow(curRow);
          titleRow.getCell(1).value = `اسلاید ${s.slide_number}: ${s.title}`;
          titleRow.font = { bold: true, size: 12, color: { argb: 'FF0F766E' } };
          curRow++;

          if (s.slide_text && s.slide_text !== s.title) {
            sheet.getRow(curRow).getCell(1).value = `توضیحات: ${s.slide_text}`;
            curRow++;
          }

          if (headers.length && data.length) {
            const hRow = sheet.getRow(curRow);
            headers.forEach((h, idx) => {
              const cell = hRow.getCell(idx + 1);
              cell.value = h || 'دوره';
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
            });
            curRow++;

            data.forEach(dRow => {
              const r = sheet.getRow(curRow);
              dRow.forEach((val, idx) => {
                const num = Number(val);
                r.getCell(idx + 1).value = (!isNaN(num) && val !== '') ? num : val;
              });
              curRow++;
            });
          }

          if (s.corrective_actions) {
            sheet.getRow(curRow).getCell(1).value = `اقدامات اصلاحی: ${s.corrective_actions}`;
            sheet.getRow(curRow).font = { italic: true, color: { argb: 'FFB45309' } };
            curRow++;
          }

          curRow += 2; // فاصله بین شاخص‌ها
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Hospital_Indicators_1404_1405.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('[IndicatorSlides/exportExcel]', err);
      res.status(500).json({ error: 'خطای سرور در خروجی اکسل' });
    }
  });

module.exports = router;
