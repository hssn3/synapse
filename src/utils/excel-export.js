/**
 * ابزار عمومی خروجی Excel (xlsx) سازگار با فارسی RTL
 * ---------------------------------------------------------------
 * چرا فایل جدا: خروجی CSV موجود (bsc/checklists/indicators) با BOM فارسی
 * کار می‌کند ولی فرمت/رنگ/عرض ستون ندارد و اکسل فارسی گاهی آن را UTF-8
 * نمی‌خواند. این helper یک فایل xlsx واقعی با هدر رنگی و عرض خودکار تولید
 * می‌کند — بدون تغییر در endpoint های CSV موجود (backward compatible).
 *
 * استفاده:
 *   const { buildXlsx } = require('../utils/excel-export');
 *   const buffer = await buildXlsx({
 *     sheetName: 'شاخص‌ها',
 *     columns: [ { header: 'عنوان', key: 'title', width: 40 }, ... ],
 *     rows: [ { title: 'فلان', ... }, ... ],
 *   });
 *   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 *   res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"');
 *   res.send(buffer);
 */
'use strict';

const ExcelJS = require('exceljs');

/**
 * ساخت فایل xlsx و برگرداندن Buffer
 * @param {object} opts
 * @param {string} opts.sheetName — نام شیت (فارسی)
 * @param {Array<{header:string, key:string, width?:number}>} opts.columns
 * @param {Array<object>} opts.rows — هر ردیف یک آبجکت با key های مطابق columns
 * @param {string} [opts.title] — عنوان بالای جدول (اختیاری)
 * @returns {Promise<Buffer>}
 */
async function buildXlsx(opts) {
  const { sheetName = 'Sheet1', columns, rows, title } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'سامانه اعتباربخشی بیمارستان';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    // راست‌به‌چپ برای فارسی
    views: [{ rightToLeft: true }],
  });

  let startRow = 1;

  // عنوان بالای جدول (اختیاری)
  if (title) {
    ws.mergeCells(1, 1, 1, columns.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: 'Vazirmatn', size: 14, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    ws.getRow(1).height = 32;
    startRow = 2;
  }

  // تعریف ستون‌ها
  ws.columns = columns.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width || Math.max(c.header.length * 2, 14),
  }));

  // استایل هدر
  if (title) {
    // اگر عنوان هست، هدر ستون‌ها باید دستی اضافه شود
    columns.forEach((c, i) => {
      const cell = ws.getCell(startRow, i + 1);
      cell.value = c.header;
    });
  }
  const hdrRowRef = ws.getRow(title ? startRow : 1);
  hdrRowRef.eachCell((cell) => {
    cell.font = { name: 'Vazirmatn', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });
  hdrRowRef.height = 28;

  // اضافه‌کردن ردیف‌ها
  const dataStartRow = title ? startRow + 1 : 2;
  rows.forEach((rowData, idx) => {
    const r = ws.getRow(dataStartRow + idx);
    columns.forEach((c, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = rowData[c.key] !== undefined && rowData[c.key] !== null ? rowData[c.key] : '';
      cell.font = { name: 'Vazirmatn', size: 10 };
      cell.alignment = { vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
      // ردیف‌های زوج رنگ ملایم
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
    r.height = 22;
  });

  // فریز هدر
  ws.views = [{ state: 'frozen', ySplit: title ? startRow : 1, rightToLeft: true }];

  return wb.xlsx.writeBuffer();
}

module.exports = { buildXlsx };
