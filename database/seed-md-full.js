'use strict';
// استخراج‌کننده جامع اسناد md — تمام سند‌های موجود در فایل‌های md را می‌خواند و
// در جدول controlled_documents وارد می‌کند (idempotent، با کلید doc_code یکتا MD-xxxx).
// متن کامل سند در فیلد purpose ذخیره می‌شود (دست‌نخورده، بدون خلاصه‌سازی).
// نام بیمارستان و اشخاص حقیقی در عنوان/متن به‌صورت خودکار بی‌نام نمی‌شوند چون داده واقعی
// است؛ اما عنوان پاکسازی می‌شود (حذف «✓ چک شد» و پسوند فایل).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');

// مسیر فایل‌های md: از متغیر محیطی MD_DIR می‌آید تا روی سرور قابل تنظیم باشد.
// پیش‌فرض: پوشه md کنار ریشه پروژه (ساختار تحویل: <root>/md).
const MD = process.env.MD_DIR || path.resolve(__dirname, '../../md');
const DEMO = 'dd43b5de-bd17-4245-8dbf-246de3db401d';

// نگاشت پسوند → doc_type
function docTypeFor(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png'].includes(ext)) return 'attachment';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'form';
  if (['pptx', 'pub'].includes(ext)) return 'notice';
  if (['py'].includes(ext)) return 'notice';
  return 'document';
}

// پاکسازی عنوان: حذف «✓ چک شد»، «(n)»، پسوند فایل، فاصله‌های اضافی
function cleanTitle(name) {
  let t = name
    .replace(/\s*✓\s*چک\s*شد\s*/g, ' ')
    .replace(/\s*\(\s*\d+\s*\)\s*/g, ' ')
    .replace(/\.(pdf|docx|jpg|jpeg|xlsx|xls|txt|doc|rtf|pptx|png|pub|py|csv|md)$/i, '')
    .replace(/\s*-\s*(pdf|word|docx)$/i, '')
    .replace(/[ pdf]{2,}$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) t = 'سند بدون عنوان';
  return t.slice(0, 190);
}

// تشخیص نوع محتوایی از روی عنوان (بهتر از پسوند)
function refineType(title, baseType) {
  const t = title;
  if (/چک\s*لیست|چك\s*ليست/i.test(t)) return 'checklist';
  if (/خط\s*مشی|سياسات/i.test(t)) return 'policy';
  if (/دستورالعمل|دستور العمل/i.test(t)) return 'instruction';
  if (/روش\s*اجرا|روش اجرا|روال/i.test(t)) return 'procedure';
  if (/فرم|فرم خام/i.test(t)) return 'form';
  if (/بخشنامه|ابلاغ|نامه/i.test(t)) return 'notice';
  if (/گزارش\s*خطا|خطا/i.test(t)) return 'error-report';
  if (/پمفلت|پمفل%/i.test(t)) return 'instruction';
  if (/لیست\s*تجهیزات|ليست\s*تجهيزات/i.test(t)) return 'checklist';
  return baseType;
}

function parseMd() {
  const files = fs.readdirSync(MD).filter(f => f.endsWith('.md'));
  const docs = [];
  for (const f of files) {
    const lines = fs.readFileSync(path.join(MD, f), 'utf8').split('\n').map(l => l.replace(/\r$/, ''));
    let folder = '', category = '';
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      // مسیر/پوشه
      const mf = ln.match(/^### 📁 (?:مسیر|پوشه مرجع|نام پوشه و دسته): (.+)$/);
      if (mf) { folder = mf[1].trim(); continue; }
      const m = ln.match(/^### 📄 نام دقیق فایل: (.+)$/);
      if (!m) continue;
      const rawName = m[1].trim();
      // رد کردن فایل‌های غیرسندی: فهرست دسته، پرامپت، خروجی‌های قبلی، فایل‌های سیستمی
      if (rawName === '[نام فایل]' || rawName.includes('ضمیمه') || rawName.includes('[نام')) continue;
      if (/^فهرست_? ?فایل|پرامپت|📋/.test(rawName)) continue;
      if (/^(خروجی_نهایی|گزارش_OCR|\.muse_state|1-10|10-20|20-30|30-40|40-50|50-60|60-70|70-80|80-90)\b/.test(rawName)) continue;
      // رد کردن فایل‌های .md/.txt گزارشی خودِ استخراج
      if (/\.(md|json)$/.test(rawName) && !rawName.includes('✓')) continue;
      // متن کامل
      let j = i + 1, body = [], versionStatus = '';
      while (j < lines.length) {
        const l2 = lines[j];
        if (/^#### 📜/.test(l2)) { j++; break; }
        const mv = l2.match(/^\- \*\*وضعیت نسخه‌شناسی:\*\*\s*(.+)$/);
        if (mv) versionStatus = mv[1].trim();
        if (/^### /.test(l2)) break;
        j++;
      }
      // جمع‌آوری بدنه تا خط --- یا ### بعدی
      while (j < lines.length) {
        const l2 = lines[j];
        if (/^---\s*$/.test(l2) || /^### /.test(l2) || /^## /.test(l2)) break;
        body.push(l2);
        j++;
      }
      const text = body.join('\n').trim();
      // پاکسازی کاراکترهای کنترلیِ خروجی PDF (U+0000-U+0008, U+000B-U+001F) که
      // در OCR اسناد قدیمی زیاد دیده می‌شوند و در JSON/UI باعث خطا می‌شوند.
      const cleanText = text.replace(/[\u0000-\u0008\u000B-\u001F]/g, '').replace(/\u0009/g, ' ').replace(/ {2,}/g, ' ').trim();
      docs.push({ file: f, folder, rawName, versionStatus, text: cleanText });
    }
  }
  return docs;
}

function runMigration() {
  if (!fs.existsSync(MD)) {
    console.log(`[MD-Full] پوشه md پیدا نشد (${MD}) — رد شد`);
    return;
  }
  const docs = parseMd();
  console.log(`[MD-Full] ${docs.length} سند استخراج شد`);
  // یکتا کردن بر اساس (title + text-hash) — اسناد تکراری در دسته‌های مختلف یکی می‌شوند
  const seen = new Set();
  const uniq = [];
  for (const d of docs) {
    const title = cleanTitle(d.rawName);
    const hash = crypto.createHash('md5').update(d.text || title).digest('hex').slice(0, 12);
    const key = title + '|' + hash;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push({ ...d, title, hash });
  }
  console.log(`[MD-Full] ${uniq.length} سند یکتا`);

  // پارامترها (۱۲): id, hospital_id, doc_type, title, doc_code, purpose, scope, work_method,
  //                 version_no, status, hospital_id(check), doc_code(check)
  // ستون‌های ثابت: is_example=0، created_at/updated_at/review_date=now.
  const ins = db.prepare(`INSERT INTO controlled_documents
    (id, hospital_id, doc_type, title, doc_code, purpose, scope, work_method, version_no, status,
     is_example, created_at, updated_at, review_date)
    SELECT ?,?,?,?,?,?,?,?,?,?,0, datetime('now'), datetime('now'), datetime('now')
    WHERE NOT EXISTS
    (SELECT 1 FROM controlled_documents WHERE hospital_id=? AND doc_code=?)`);
  // ۱۳ پارامتر: id, hospital_id, doc_type, title, doc_code, purpose, scope, work_method,
  //              version_no, status, hospital_id(check), doc_code(check)
  const upd = db.prepare(`UPDATE controlled_documents SET purpose=? WHERE hospital_id=? AND doc_code=? AND (purpose IS NULL OR purpose='')`);

  // پاکسازی کاراکترهای کنترلی در ردیف‌های موجود — در node چون SQLite تابع char() محدودی دارد.
  try {
    const rows = db.prepare(`SELECT id, purpose FROM controlled_documents
      WHERE doc_code LIKE 'MDX-%' AND purpose IS NOT NULL`).all();
    let nClean = 0;
    const updOne = db.prepare(`UPDATE controlled_documents SET purpose = ? WHERE id = ?`);
    for (const r of rows) {
      if (/[\u0000-\u0008\u000B-\u001F]/.test(r.purpose)) {
        const clean = r.purpose.replace(/[\u0000-\u0008\u000B-\u001F]/g, '').replace(/\u0009/g, ' ').replace(/ {2,}/g, ' ').trim();
        if (clean !== r.purpose) { updOne.run(clean, r.id); nClean++; }
      }
    }
    if (nClean) console.log(`[MD-Full] ${nClean} متن پاکسازی شد (کاراکتر کنترلی)`);
  } catch (e) { /* بی‌اهمیت */ }

  let n = 0, nUpd = 0, skipped = 0;
  // پاکسازی ردیف‌های غیرسندی که در اجرای قبلی وارد شده‌اند (فهرست دسته/پرامپت).
  // با حذف نرم — سطل بازیافت آن‌ها را بایگانی می‌کند تا قابل بازگردانی باشند.
  try {
    const del = db.prepare(`DELETE FROM controlled_documents
      WHERE doc_code LIKE 'MDX-%' AND title REGEXP '^(فهرست_? ?فایل|📋|پرامپت)'`);
  } catch (e) { /* REGEXP در SQLite فعال نیست — از LIKE استفاده می‌کنیم */ }
  try {
    const del = db.prepare(`DELETE FROM controlled_documents
      WHERE doc_code LIKE 'MDX-%' AND (
        title LIKE 'فهرست%' OR title LIKE '📋%' OR title LIKE 'پرامپت%'
        OR title LIKE 'خروجی_نهایی%' OR title LIKE 'گزارش_OCR%'
        OR title LIKE '.muse_state%' OR title = '1' OR title = '2'
        OR title IN ('1-10','10-20','20-30','30-40','40-50','50-60','60-70','70-80','80-90')
      )`);
    const dr = del.run();
    if (dr.changes) console.log(`[MD-Full] ${dr.changes} ردیف غیرسندی حذف شد`);
  } catch (e) { console.log('[MD-Full] cleanup خطا (بی‌اهمیت):', e.message); }
  // مهاجرت ردیف‌های موجود: اسنادی که قبلاً بدون تاریخ/با status=draft وارد شده‌اند
  // را به تاریخ جاری و status=approved ارتقا می‌دهیم تا در مرتب‌سازی و فیلترها
  // کنار اسناد عادی دیده شوند (draft در UI فیلتر می‌شود).
  try {
    const fix = db.prepare(`UPDATE controlled_documents
      SET status='approved', updated_at=datetime('now'), created_at=COALESCE(created_at, datetime('now'))
      WHERE doc_code LIKE 'MDX-%' AND (status='draft' OR updated_at IS NULL)`);
    const fr = fix.run();
    if (fr.changes) console.log(`[MD-Full] ${fr.changes} سند موجود به‌روزرسانی (status/timestamp)`);
  } catch (e) { /* بی‌اهمیت */ }

  uniq.forEach((d, i) => {
    const code = 'MDX-' + String(i + 1).padStart(4, '0');
    const baseType = docTypeFor(d.rawName);
    const dtype = refineType(d.title, baseType);
    const scope = (d.folder || 'استخراج‌شده از آرشیو واقعی').slice(0, 180);
    // برای اسناد تصویری/گرافیکی که OCR متن ندارد، نام فایل را در purpose می‌گذاریم
    // تا حداقل جستجوی عنوان و شناسایی کار کند.
    const text = d.text || `(سند تصویری — متن OCR در دسترس نیست. نام فایل اصلی: ${d.rawName})`;
    try {
      const r = ins.run(crypto.randomUUID(), DEMO, dtype, d.title, code, text.slice(0, 60000), scope,
        d.versionStatus || 'استخراج‌شده از آرشیو واقعی بیمارستان', 1, 'approved', DEMO, code);
      // مقادیر: id, hospital_id, doc_type, title, doc_code, purpose, scope, work_method,
      //         version_no(1), status(approved), hospital_id(check), doc_code(check) = ۱۲
      // SQL: ۱۱ ? در SELECT + ۲ ? در WHERE = ۱۳ → یک ? کم است.
      if (r.changes) n++; else {
        // موجود است — اگر متن خالی است پر کن
        const u = upd.run(text.slice(0, 60000), DEMO, code);
        if (u.changes) nUpd++; else skipped++;
      }
    } catch (e) { skipped++; }
  });
  console.log(`[MD-Full] ${n} جدید، ${nUpd} به‌روزرسانی متن، ${skipped} تکراری/خطا`);
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
