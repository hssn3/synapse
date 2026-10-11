/**
 * Seed مرحله ۳ (فولدر 313): تکمیل مجوز هر سمت + ۱۰ خط‌مشی کددار گمشده
 * چرا: خوانش کد نشان داد ۴ سمت مجوزهای حوزه خود را ناقص دارند و خوانش md نشان داد
 * این ۱۰ خط‌مشی با کد OH در controlled_documents نیستند. فقط ADD می‌کند، هیچ‌چیز
 * حذف/بازنویسی نمی‌شود (حتی سمت‌ها). بدون نام حقیقی. idempotent.
 * Run: npm run seed-md-stage3
 */
const crypto = require('crypto');
function store() { return require('../src/config/database-sqlite'); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.floor(Math.random() * 1e9)); }

// کمبود هر سمت (فقط افزودنی، از grantهای موجود در سیدهای ماژول‌ها)
const ROLE_GAPS = {
  breastfeeding_specialist: ['view_patientfocus'],
  nutrition_manager: ['view_documents', 'view_patientfocus'],
  accounting_manager: ['export_reports'],
  nursing_office_assistant: ['view_nursing_shift_reports'],
  staff_nurse: ['view_nursing_shift_reports'],
};

const POLICIES = [
  ['OH.QI.WI.9626.07', 'داروهای Multiple dose', 'procedure', '2024-09-01', 'سرنگ جدا/۲۸ روز/ضدعفونی ۷۰٪/تاریخ بازشدن/لیبل قرمز/دابل‌چک دوپرستاره'],
  ['OH.QI.PR.9660.07', 'ملزومات صرفاً یکبارمصرف', 'procedure', '2024-11-01', 'نسخه‌پیچی تکنسین/بازدید عفونت/کنترل سرپرستار/تایید فنی داروخانه'],
  ['OH.QI.WI.9628.07', 'انبارش ایمن با حداقل‌ها', 'instruction', '2024-08-01', '۳۴ بند: پالت/فاصله ۲ متر/درب فلزی/نردبان/اطفا/کروکی/MSDS'],
  ['OH.NM.PG.9502.02', 'فرم برنامه ماهیانه بخش', 'form', '2025-01-01', 'M/E/N، مرخصی، نقطه قرمز مسئول شیفت، تحویل ۲۵ام، جانشین ۱-۵'],
  ['OH.QI.PC.9616.07', 'تحول بین‌شیفت', 'procedure', '2024-09-15', 'SBAR، محیط آرام بدون وقفه، کنترل ایمنی تجهیزات'],
  ['OH.QI.WI.9703.05', 'ناشتایی جراحی الکتیو', 'instruction', '2024-09-17', 'شفاف ۲-۴h، شیرمادر ۴h، جامد ۶-۸h، ویرایش پنجم'],
  ['OH.QI.WI.9655.07', 'SOP آزمایشگاه انگل‌شناسی', 'instruction', '2024-09-01', '۱۴ بند: هدف/دامنه/نمونه/روش/کنترل کیفی/تفسیر'],
  ['OH.QI.PR.9658.07', 'تداوم خدمات حیاتی در بحران', 'procedure', '2024-01-01', 'خط‌مشی + فعالیت ۴ بازه + جدول جانشینان + EOC'],
  ['OH.QI.PO.9607.00', 'پیشگیری عفونت بیمارستانی', 'policy', '2024-01-01', 'هدف ۴٪→۲٪؛ آموزش/پایش فصلی؛ گزارش طغیان'],
  ['OH.QI.PR.9611.03', 'مهار فیزیکی', 'procedure', '2024-01-01', 'دستور کتبی، ۴ اندام ممنوع، پایش مستمر'],
];

function run() {
  const { query, db } = store();
  let hospitals = [];
  try { hospitals = query('SELECT id FROM hospitals WHERE is_active = 1').rows; } catch (e) { hospitals = []; }
  let added = 0;
  // الف) مجوزها — فقط union، با تراکنش
  try {
    const roles = db.prepare('SELECT id, code, permissions FROM roles').all();
    const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
    const tx = db.transaction(() => {
      for (const r of roles) {
        const want = ROLE_GAPS[r.code];
        if (!want) continue;
        let perms = [];
        try { perms = JSON.parse(r.permissions || '[]'); } catch (e) { perms = []; }
        if (!Array.isArray(perms)) perms = [];
        const missing = want.filter(p => !perms.includes(p));
        if (!missing.length) continue;
        upd.run(JSON.stringify(perms.concat(missing)), r.id);
        added++;
      }
    });
    tx();
    console.log('[Seed Stage3] role grants: ' + added + ' role(s) updated (additive only).');
  } catch (e) { console.error('[Seed Stage3] grants failed:', e.message); }
  // ب) خط‌مشی‌ها
  let docs = 0;
  for (const h of hospitals) {
    for (const [code, title, dtype, issued, purpose] of POLICIES) {
      try {
        if (query('SELECT 1 x FROM controlled_documents WHERE hospital_id=? AND doc_code=?', [h.id, code]).rows[0]) continue;
        query('INSERT INTO controlled_documents (id,hospital_id,doc_type,title,doc_code,issue_date,purpose,status,version_no) VALUES (?,?,?,?,?,?,?,? ,7)',
          [uid(), h.id, dtype, title, code, issued, purpose, 'draft']);
        docs++;
      } catch (e) { /* non-fatal */ }
    }
  }
  console.log('[Seed Stage3] policies: ' + docs + ' row(s) (idempotent).');
  return { grants: added, docs };
}
module.exports = { run, runMigration: run };
