/**
 * Seed فارماکوپه کامل ۱۴۰۳ از md (10-20.md جدول ۵۳۲ ردیفه)
 * چرا: فارماکوپه بیمارستان ۵۳۲ قلم است و فقط ~۳۲۹ قلم داشتیم. این سید جدول واقعی
 * md را سطر‌به‌سطر می‌خواند (ستون ژنریک/دوز/کد/قیمت/پرچم) و فقط قلم‌های غایب را
 * با پرچم واقعی (پرخطر/یخچالی/LASA/شیمی/مخدر/حیاتی) وارد می‌کند. قیمت و کد در
 * note حفظ می‌شود. بدون جعل: فقط سطرهای واقعی جدول. idempotent (چک نام لاتین/فارسی).
 * اگر پوشه md نباشد، بی‌صدا رد می‌شود (مثل TelegramDocs).
 * Run: npm run seed-md-formulary-full
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function store() { return require('../src/config/database-sqlite'); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.floor(Math.random() * 1e9)); }

const MD_CANDIDATES = [
  path.join(__dirname, '..', '..', 'خروجی اصلی', 'md', '10-20.md'),
  'C:\\Users\\NvDAdmin\\Desktop\\خروجی اصلی\\md\\10-20.md',
];
const FORMS = ['TAB', 'CAP', 'AMP', 'VIAL', 'SYRINGE', 'CREAM', 'DROP', 'SPRAY', 'POWDER', 'SUSP', 'SOL', 'INH', 'GEL', 'OINT', 'LOT', 'SHAMP', 'INJ', 'SUPP', 'PATCH'];

function findMd() {
  for (const p of MD_CANDIDATES) { try { if (fs.existsSync(p)) return p; } catch (e) { /* next */ } }
  return null;
}
function splitPair(s) {
  const parts = String(s || '').split('/').map(x => x.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const hasFa = /[\u0600-\u06FF]/.test(parts[0]);
    return hasFa ? { fa: parts[0], en: parts.slice(1).join(' / ') } : { fa: parts.slice(1).join(' / '), en: parts[0] };
  }
  return { fa: String(s || '').trim(), en: '' };
}
function flagsOf(note) {
  const n = String(note || '');
  return {
    ha: /پرخطر/.test(n) ? 1 : 0,
    rf: /یخچال|۲ تا ۸|2 تا 8|سرد/.test(n) ? 1 : 0,
    la: /مشابه/.test(n) ? 1 : 0,
    cy: /شیمی|سرطان/.test(n) ? 1 : 0,
    na: /مخدر|نارکوتیک/.test(n) ? 1 : 0,
    vi: /حیاتی/.test(n) ? 1 : 0,
  };
}
function formOf(dose) {
  const d = String(dose || '').toUpperCase();
  for (const f of FORMS) if (d.includes(f)) return f;
  return '—';
}

function run() {
  const { query } = store();
  const md = findMd();
  if (!md) { console.log('[Seed FormularyFull] md NOT FOUND. 0 rows.'); return { added: 0 }; }
  const lines = fs.readFileSync(md, 'utf8').split('\n');
  let hi = lines.findIndex(l => l.trim().startsWith('|') && l.includes('قیمت'));
  if (hi < 0) { console.log('[Seed FormularyFull] table header NOT FOUND. 0 rows.'); return { added: 0 }; }
  let hospitals = [];
  try { hospitals = query('SELECT id FROM hospitals WHERE is_active = 1').rows; } catch (e) { hospitals = []; }
  if (!hospitals.length) { console.log('[Seed FormularyFull] no hospitals. 0 rows.'); return { added: 0 }; }
  const existing = query('SELECT generic_name FROM drug_formulary').rows.map(r => String(r.generic_name || ''));
  const seen = (fa, en) => existing.some(g => (en && g.includes(en)) || (fa && fa.length > 2 && g.includes(fa)));
  let parsed = 0, added = 0;
  for (let i = hi + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) continue;
    const c = l.split('|').map(x => x.trim());
    if (c.length < 7 || /ردیف|:-/.test(l)) continue;
    const pair = splitPair(c[2]);
    if (!pair.fa && !pair.en) continue;
    parsed++;
    if (seen(pair.fa, pair.en)) continue;
    const fl = flagsOf(c[6]);
    const gen = pair.fa + (pair.en ? ' (' + pair.en + ')' : '');
    const note = ('کد ' + (c[4] || '—') + ' | قیمت ' + (c[5] || '—') + ' | ' + (c[6] || '—')).slice(0, 400);
    for (const h of hospitals) {
      try {
        query('INSERT INTO drug_formulary (id,hospital_id,generic_name,brand_name,dosage_form,strength,is_high_alert,is_lasa,is_refrigerated,is_cytotoxic,is_narcotic,is_vital,is_essential,note,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [uid(), h.id, gen, '', formOf(c[3]), c[3] || '', fl.ha, fl.la, fl.rf, fl.cy, fl.na, fl.vi, 0, note, 1]);
        added++;
      } catch (e) { /* non-fatal */ }
    }
  }
  console.log('[Seed FormularyFull] parsed=' + parsed + ' added=' + added + ' (idempotent).');
  return { added };
}
module.exports = { run, runMigration: run };
