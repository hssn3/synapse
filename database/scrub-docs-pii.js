// اسکراب PII اسناد کنترل‌شده — فقط جایگزینی متنی، بدون حذف ردیف
// الگوها با regex-literal صریح (بدون الحاق براکت) تا باگ [[...]] تکرار نشود.
// بکاپ: database/backups/pre-scrub-2026-09-26.db — idempotent.
const { query, db } = require('../src/config/database-sqlite');

const STOP = new Set(['به', 'از', 'در', 'با', 'که', 'را', 'بخش', 'بیمارستان', 'برای', 'شد', 'است', 'بود', 'شود', 'شوند', 'دارو', 'درمان', 'پرستار', 'بیمار', 'شیفت', 'دفتر', 'کنترل', 'آموزش', 'کیفیت', 'کمیته', 'جلسه', 'صورت', 'فرم', 'سند', 'نسخه', 'توسط', 'مدیریت', 'واحد', 'مرکز', 'نظر', 'تحت', 'عدم', 'نحوه', 'چگونگی', 'بدون', 'طبق', 'جهت', 'طی', 'میان', 'بین', 'مورد', 'کلیه', 'سراسر', 'امور', 'خدمات', 'دکتر', 'دكتر', 'آقای', 'خانم', 'جناب', 'سرکار', 'تهیه‌کننده', 'تاییدکننده', 'تصویب‌کننده', 'مسئول', 'مدیر', 'سرپرستار', 'سوپروایزر', 'رئیس', 'معاون', 'کارشناس']);
const W2 = '[\u0600-\u06FF]{2,}';
const W3 = '[\u0600-\u06FF]{3,}';

function cleanText(s) {
  if (!s) return s;
  // نرمال‌سازی ی/ک عربی به فارسی + حذف اعراب (ً-ٟ) پیش از هر الگو
  let t = String(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[ً-ٰٟ]/g, '');
  // ۱) بیمارستان: فقط عبارت‌های دقیق (نه «آشامیدنی»)
  t = t.replace(/بیمارستان تخصصی و فوق تخصصی امید/g, 'بیمارستان');
  t = t.replace(/بیمارستان امید/g, 'بیمارستان');
  t = t.replace(/\(Omid Hospital\)/gi, '');
  t = t.replace(/\bOmid(\s+Hospital)?\b/gi, '');
  // ۲) متای استخراج (تا آخر خط — نام مدل خودش متاست؛ نقطه وسط نسخه مانع نیست)
  t = t.replace(/\d+\s*-\s*Gemini[^(\n]*(\([^)]*\))?/g, '');
  t = t.replace(/مدل پیشنهادی در [^\n]*/g, '');
  // خطی که هم «مدل» و هم «Gemini» دارد = متای استخراج (متن بالینی هرگز این دو را یکجا ندارد)
  t = t.split('\n').filter(l => !(l.includes('مدل') && l.includes('Gemini'))).join('\n');
  t = t.replace(/راهنمای_این_مدل_و_نحوه_ارسال/g, '');
  t = t.replace(/✓ چک شد\.(pdf|docx|xlsx|xls|pptx|doc|rtf|txt|pub|py|csv)/gi, '');
  t = t.replace(/\bGoogle Gemini\b/g, 'مدل زبانی');
  t = t.replace(/دسته\s*\d+(\s*\([^)]*\))?/g, '');
  // ۳) دکتر + نام (نگه‌بان: واژه ممنوعه/کوتاه؛ اگر کلمه دوم سمت بود فقط نام می‌رود)
  t = t.replace(new RegExp('(جناب آقای |سرکار خانم |آقای |خانم )?((?:دکتر|دكتر))\\s+(' + W2 + ')(?:\\s+(' + W2 + '))?', 'g'),
    (m, hon, dr, w1, w2) => {
      if (!w1 || STOP.has(w1) || w1.length < 2) return m;
      if (w2 && (STOP.has(w2) || w2.length < 2)) return (hon || '') + 'دکتر [حذف شد] ' + w2;
      return (hon || '') + 'دکتر [حذف شد]';
    });
  // ۴) آقا/خانم + نام (تکی یا «و»دار)
  t = t.replace(new RegExp('(آقای|خانم|جناب|سرکار)\\s+(' + W2 + ')(?:\\s+و\\s+(' + W2 + '))?', 'g'),
    (m, hon, w1, w2) => {
      if (!w1 || STOP.has(w1) || w1.length < 2) return m;
      if (w2 && (STOP.has(w2) || w2.length < 2)) return hon + ' [حذف شد] ' + w2;
      return hon + ' [حذف شد]';
    });
  // ۵) نام فارسی تنها + سمت (مثل مهرداد معصومی سرپرستار) — سمت نگه داشته می‌شود
  t = t.replace(new RegExp('(' + W3 + ')\\s+(' + W3 + ')\\s+((?:سرپرستار|سوپروایزر))(?![\u0600-\u06FF])', 'g'),
    (m, w1, w2, role) => {
      if (STOP.has(w1) || STOP.has(w2)) return m;
      return '[حذف شد] ' + role;
    });
  // ۶) نام‌خانوادگی لاتین تنها بعد از فارسی
  const ALLOW = new Set(['hospital', 'checklist', 'checklists', 'guideline', 'protocol', 'form', 'code', 'version', 'update', 'tablet', 'capsule', 'syrup', 'his', 'vip', 'icu', 'or']);
  t = t.replace(/(?<=[\u0600-\u06FF] )[a-z]{4,}(?![a-z])/g,
    (m) => (ALLOW.has(m.toLowerCase()) ? m : '[حذف شد]'));
  return t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function run() {
  const cols = query('PRAGMA table_info(controlled_documents)').rows.map(r => r.name)
    .filter(c => !['id', 'hospital_id', 'doc_code', 'created_at', 'updated_at', 'version_no', 'issue_date', 'last_review_date', 'prepared_date'].includes(c));
  const rows = query('SELECT * FROM controlled_documents').rows;
  let cells = 0, prov = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      const set = {};
      for (const c of cols) {
        if (typeof r[c] !== 'string' || !r[c]) continue;
        const nv = cleanText(r[c]);
        if (nv !== r[c]) { set[c] = nv; cells++; }
      }
      if (Object.keys(set).length) {
        if (set.scope && /^(1- Gemini|دسته \d)/.test(set.scope.trim())) { set.scope = null; prov++; }
        const keys = Object.keys(set);
        db.prepare('UPDATE controlled_documents SET ' + keys.map(k => k + ' = ?').join(', ') + ' WHERE id = ?')
          .run(...keys.map(k => set[k]), r.id);
      } else if (r.scope && /^(1- Gemini|دسته \d)/.test(String(r.scope).trim())) {
        db.prepare('UPDATE controlled_documents SET scope = NULL WHERE id = ?').run(r.id);
        prov++;
      }
    }
  });
  tx();
  console.log('SCRUB cells_changed=' + cells + ' pure_meta_nulled=' + prov);
  const left = (p) => query('SELECT COUNT(*) c FROM controlled_documents WHERE title LIKE ? OR decree_text LIKE ? OR purpose LIKE ? OR scope LIKE ? OR work_method LIKE ?',
    Array(5).fill('%' + p + '%')).rows[0].c;
  console.log('LEFT بیمارستان-امید:' + left('بیمارستان امید') + ' Gemini:' + left('Gemini') + ' دکتر-:' + left('دکتر '));
  return { cells, prov };
}
module.exports = { run, cleanText };
if (require.main === module) run();
