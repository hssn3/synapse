/* =====================================================================
   زمینه‌ی پروژه برای دستیارِ توسعه
   ---------------------------------------------------------------------
   کارفرما: «دستیار توسعه خودش همه‌ی ساختار پروژه را بداند» و «همان اول
   نیازِ اجباری به پوش‌کردن نداشته باشد».

   چرا لازم شد: تا امروز مدل *هیچ‌چیز* از پروژه نمی‌دید مگر اینکه سوپرادمین
   خودش مسیرِ فایل‌ها را دستی تایپ کند. یعنی برای پرسیدنِ ساده‌ترین سؤال،
   اول باید می‌دانستی جواب در کدام فایل است — که دقیقاً همان چیزی است که از
   دستیار می‌خواهی. نتیجه‌اش پاسخ‌های کلی و بی‌ربط بود.

   این ماژول دو چیز می‌سازد:

   ۱) نقشه‌ی پروژه (buildProjectMap): درختِ پوشه‌ها با تعداد و حجمِ فایل‌ها،
      به‌علاوه‌ی فهرستِ فایل‌های کلیدی. یک‌بار ساخته و کش می‌شود چون روی
      کانتینرِ ریلوی کدها بین دو دیپلوی عوض نمی‌شوند.

   ۲) انتخابِ خودکارِ فایل‌های مرتبط (pickRelevantFiles): از روی متنِ سؤال،
      فایل‌هایی که واقعاً به آن ربط دارند پیدا و ضمیمه می‌شوند. امتیازدهی
      عمداً ساده و قابل‌فهم است (نام فایل > مسیر > محتوا) نه یک embedding
      که نه قابلِ اشکال‌زدایی است و نه بدونِ سرویسِ بیرونی کار می‌کند.

   محدودیت‌ها عمدی‌اند: node_modules و .git و دیتابیس و آپلودها هرگز خوانده
   نمی‌شوند، و مجموعِ حجمِ ضمیمه سقف دارد تا یک سؤالِ ساده کلِ بودجه‌ی توکن
   را نخورد.
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');

const SKIP_DIRS = new Set(['node_modules', '.git', '.github', 'uploads', 'backups',
  'coverage', 'dist', 'build', '.cache', 'graphify-out', 'test-results', 'playwright-report']);
const CODE_EXT = new Set(['.js', '.json', '.md', '.css', '.html', '.ejs', '.yml', '.yaml', '.sql']);
// فایل‌های بزرگِ داده که کد نیستند و فقط بودجه‌ی توکن را می‌خورند
const SKIP_FILE = /\.(db|db-wal|db-shm|png|jpg|jpeg|webp|pdf|ico|woff2?|ttf|map|lock)$/i;

const MAX_FILES = 1200;
const MAX_ATTACH_BYTES = 150 * 1024;   // سقفِ مجموعِ فایل‌های ضمیمه در یک سؤال
const MAX_ONE_FILE = 70 * 1024;

let _cache = null;

function walk(dir, rel, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const ent of entries) {
    if (out.files.length >= MAX_FILES) return;
    if (ent.name.startsWith('.') && ent.name !== '.env.example') continue;
    const full = path.join(dir, ent.name);
    const r = rel ? rel + '/' + ent.name : ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(full, r, out);
    } else if (ent.isFile()) {
      if (SKIP_FILE.test(ent.name)) continue;
      if (!CODE_EXT.has(path.extname(ent.name))) continue;
      let size = 0;
      try { size = fs.statSync(full).size; } catch (e) { continue; }
      out.files.push({ path: r, size });
    }
  }
}

function scan() {
  if (_cache) return _cache;
  const out = { files: [] };
  walk(REPO_ROOT, '', out);
  out.files.sort((a, b) => a.path.localeCompare(b.path));
  const byDir = {};
  for (const f of out.files) {
    const d = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '.';
    (byDir[d] = byDir[d] || { count: 0, bytes: 0 });
    byDir[d].count++; byDir[d].bytes += f.size;
  }
  _cache = { files: out.files, byDir, builtAt: Date.now() };
  return _cache;
}

/** کش را دور می‌ریزد — برای وقتی که فایلی از راه کامیت/ریدیپلوی عوض شده */
function invalidate() { _cache = null; }

const kb = n => Math.round(n / 1024) + 'KB';

/**
 * نقشه‌ی پروژه به‌صورت متن، برای گذاشتن در systemPrompt.
 * عمداً «درختِ کامل» نیست: با ۱۲۰۰ فایل، درختِ کامل خودش چند هزار توکن
 * می‌شود. به‌جایش پوشه‌ها با تعداد فایل، و بعد فایل‌های مهمِ هر پوشه.
 */
function buildProjectMap() {
  const s = scan();
  const dirs = Object.keys(s.byDir).sort();
  const lines = [];
  lines.push('# نقشه‌ی پروژه (ساختارِ واقعیِ همین مخزن)');
  lines.push(`تعداد فایلِ کد: ${s.files.length}`);
  lines.push('');
  for (const d of dirs) {
    const info = s.byDir[d];
    const inDir = s.files.filter(f => (f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '.') === d);
    // پوشه‌های خیلی پرفایل (مثل database/ با ده‌ها seed) فقط نمونه می‌دهند
    const show = inDir.length > 28 ? inDir.slice(0, 28) : inDir;
    lines.push(`## ${d === '.' ? '(ریشه)' : d}/  — ${info.count} فایل، ${kb(info.bytes)}`);
    lines.push(show.map(f => `  - ${f.path.split('/').pop()} (${kb(f.size)})`).join('\n'));
    if (inDir.length > show.length) lines.push(`  … و ${inDir.length - show.length} فایل دیگر در همین پوشه`);
    lines.push('');
  }
  return lines.join('\n');
}

// کلمه‌های پرتکرارِ فارسی/انگلیسی که برای امتیازدهی بی‌فایده‌اند
const STOP = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'code', 'file', 'کن',
  'را', 'در', 'به', 'از', 'که', 'با', 'این', 'برای', 'است', 'می', 'یک', 'ها', 'های', 'کد', 'فایل',
  'اضافه', 'بده', 'کنم', 'کند', 'باشه', 'شود', 'چرا', 'چطور', 'کجا', 'لطفا', 'لطفاً']);

/* نگاشتِ مفهومِ فارسی → واژه‌ی انگلیسیِ داخلِ کد.
   بدون این، امتیازدهی روی نامِ فایل عملاً بی‌فایده بود: کاربر فارسی می‌پرسد
   («ماژول شیفت چطور کارکرد را حساب می‌کند؟») ولی فایل‌ها اسمِ انگلیسی دارند
   (shift-schedule.js). نتیجه‌اش این می‌شد که امتیازدهی به محتوا می‌افتاد و
   فایل‌های بزرگِ بی‌ربط که واژه‌های عمومی زیاد دارند بالا می‌آمدند — دقیقاً
   همان «جوابِ بی‌ربط»ی که کارفرما گزارش کرد. */
const CONCEPT = {
  'شیفت': ['shift'], 'برنامه‌ی شیفت': ['shift'], 'کارکرد': ['shift', 'hours'],
  'اضافه‌کار': ['shift', 'overtime'], 'پرسنل': ['staff', 'ward_staff', 'shift'],
  'سرپرستار': ['head-nurse', 'nursing'], 'پرستاری': ['nursing'], 'بخش': ['ward', 'nursing'],
  'دارو': ['pharmacy', 'drug'], 'دارویی': ['pharmacy', 'drug'], 'فرمولاری': ['pharmacy', 'formulary'],
  'عفونت': ['infection'], 'استریل': ['infection', 'sterilizer'], 'بهداشت دست': ['infection', 'hygiene'],
  'حوادث': ['disaster'], 'بلایا': ['disaster'], 'مانور': ['disaster', 'drill'],
  'تجهیزات': ['facility-assets', 'asset'], 'نگهداشت': ['facility-assets', 'maintenance'],
  'اقلام': ['facility-assets', 'asset'],
  'سنجه': ['accreditation', 'measure'], 'اعتباربخشی': ['accreditation'], 'محور': ['accreditation'],
  'سند': ['document'], 'اسناد': ['document'], 'خط‌مشی': ['document', 'policy'],
  'دفترچه': ['doc-codes'], 'کد مدرک': ['doc-codes'], 'کد سند': ['doc-codes'],
  'فرآیند': ['process', 'flowchart'], 'فرایند': ['process', 'flowchart'], 'فلوچارت': ['flowchart', 'process'],
  'چک‌لیست': ['checklist'], 'ممیزی': ['audit'], 'حسابرسی': ['audit'],
  'کمیته': ['committee'], 'صورت‌جلسه': ['committee', 'minutes'],
  'شاخص': ['indicator', 'kpi'], 'نمودار': ['chart', 'indicator'],
  'خطا': ['error'], 'گزارش خطا': ['error-report'],
  'نظرسنجی': ['satisfaction'], 'رضایت': ['satisfaction'],
  'چاپ': ['print', 'psheet'], 'پرینت': ['print'], 'صفحه': ['print', 'page'],
  'دستیار': ['assistant', 'dev'], 'دانا': ['assistant'], 'هوش مصنوعی': ['ai-provider', 'assistant'],
  'جست‌وجو': ['search'], 'سرچ': ['search'],
  'ورود': ['auth', 'login'], 'دسترسی': ['auth', 'permission', 'roles'], 'مجوز': ['permission', 'roles'],
  'نقش': ['roles'], 'کاربر': ['users', 'auth'],
  'تقویم': ['calendar', 'jalali'], 'تاریخ': ['jalali'], 'شمسی': ['jalali'],
  'دیتابیس': ['database'], 'مهاجرت': ['seed', 'migrate'], 'سید': ['seed'],
  'بکاپ': ['backup'], 'پشتیبان': ['backup'],
  'بیمار': ['patient', 'followup'], 'پیگیری': ['followup'],
  'آموزش': ['training'], 'ساختار سازمانی': ['org-structure'], 'چارت': ['org-chart'],
  'قالب': ['css', 'design-system'], 'استایل': ['css'], 'رنگ': ['css', 'design-system'],
};

function conceptTokens(text) {
  const t = String(text || '');
  const out = [];
  for (const [fa, ens] of Object.entries(CONCEPT)) {
    if (t.includes(fa)) out.push(...ens);
  }
  return out;
}

function tokenize(text) {
  return String(text || '')
    .split(/[^A-Za-z0-9_؀-ۿ]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !STOP.has(t.toLowerCase()))
    .slice(0, 40);
}

/**
 * فایل‌های مرتبط با یک سؤال را پیدا می‌کند.
 * امتیاز: نام فایل ۱۰ ← مسیر ۴ ← محتوا ۱ (سقف‌دار تا یک فایلِ پرتکرار
 * همه‌چیز را نبرد). فایل‌هایی که سوپرادمین خودش صریح خواسته، همیشه اول‌اند.
 */
function pickRelevantFiles(question, explicitPaths, limit) {
  const s = scan();
  // واژه‌های خودِ سؤال + معادلِ انگلیسیِ مفهوم‌های فارسی
  const terms = [...new Set(tokenize(question).map(t => t.toLowerCase())
    .concat(conceptTokens(question)))];
  const concepts = new Set(conceptTokens(question));
  const picked = [];
  const seen = new Set();
  let budget = MAX_ATTACH_BYTES;

  /* فایلِ بزرگ حذف نمی‌شود، بریده می‌شود.
     src/routes/api.js و public/js/app.js هرکدام صدها کیلوبایت‌اند و مهم‌ترین
     فایل‌های پروژه هم همان‌ها هستند. با ردکردنِ ساده‌ی «بزرگ‌تر از سقف»،
     دستیار هیچ‌وقت قلبِ پروژه را نمی‌دید. حالا بخش‌هایی از فایل که به واژه‌های
     سؤال نزدیک‌اند با کمی متنِ اطراف برداشته می‌شوند و جای بریدگی صریح علامت
     می‌خورد تا مدل فکر نکند فایل همین‌قدر است. */
  const excerpt = (text, tokens) => {
    const lines = text.split('\n');
    const hit = new Set();
    for (let i = 0; i < lines.length; i++) {
      const low = lines[i].toLowerCase();
      if (tokens.some(t => low.includes(t))) {
        for (let j = Math.max(0, i - 12); j <= Math.min(lines.length - 1, i + 24); j++) hit.add(j);
      }
    }
    if (!hit.size) return null;
    const keep = [...hit].sort((a, b) => a - b);
    const out = [];
    let prev = -2;
    for (const i of keep) {
      if (i !== prev + 1) out.push(`\n… (خطوط ${prev < 0 ? 1 : prev + 2} تا ${i} حذف شد) …\n`);
      out.push(`${i + 1}: ${lines[i]}`);
      prev = i;
      if (out.length > 700) { out.push('\n… (ادامه‌ی فایل حذف شد) …'); break; }
    }
    return out.join('\n');
  };

  const add = (rel, why, tokens) => {
    if (seen.has(rel)) return;
    const full = path.join(REPO_ROOT, rel);
    try {
      const st = fs.statSync(full);
      if (!st.isFile() || budget <= 0) return;
      const raw = fs.readFileSync(full, 'utf8');
      let content = raw, note = why;
      if (st.size > MAX_ONE_FILE || st.size > budget) {
        const ex = tokens && tokens.length ? excerpt(raw, tokens) : null;
        if (!ex) return;
        content = ex.slice(0, Math.min(MAX_ONE_FILE, budget));
        note = why + ' — بخش‌های مرتبطِ یک فایلِ بزرگ، با شماره‌ی خط';
      }
      budget -= Buffer.byteLength(content, 'utf8');
      seen.add(rel);
      picked.push({ path: rel, content, why: note });
    } catch (e) { /* فایلِ نخواندنی کلِ درخواست را خراب نکند */ }
  };

  for (const rel of (explicitPaths || [])) {
    const clean = String(rel || '').trim().replace(/^\/+/, '');
    if (clean && !clean.includes('..')) add(clean, 'انتخابِ صریحِ سوپرادمین', tokenize(question).map(t => t.toLowerCase()));
  }
  if (!terms.length) return picked;

  const scored = [];
  for (const f of s.files) {
    const lowerPath = f.path.toLowerCase();
    const base = lowerPath.split('/').pop();
    let score = 0;
    for (const t of terms) {
      // مفهومِ نگاشت‌شده امتیازِ بیشتری می‌گیرد: وقتی کاربر «شیفت» گفته،
      // فایلی که shift در نامش دارد قطعاً از فایلی که اتفاقی این واژه را
      // در متنش دارد مهم‌تر است.
      const w = concepts.has(t) ? 2 : 1;
      if (base.includes(t)) score += 10 * w;
      else if (lowerPath.includes(t)) score += 4 * w;
    }
    if (score > 0) scored.push({ f, score });
  }
  /* امتیازِ محتوا همیشه هم حساب می‌شود، ولی فقط روی «کدِ زنده» (src/ و
     public/js/) نه روی کلِ مخزن. دلیلش با اندازه‌گیری روشن شد: مهم‌ترین
     فایل‌های پروژه (api.js و app.js) اسمِ عمومی دارند و هیچ‌وقت با نامِ فایل
     پیدا نمی‌شدند؛ ولی خواندنِ محتوای هر ۱۲۰۰ فایل برای هر پیام گران است.
     این زیرمجموعه چند ده فایل است و هزینه‌اش ناچیز.
     امتیازِ محتوا سقف‌دار است تا یک فایلِ بزرگ که واژه را صدبار دارد،
     فایلِ کوچکِ دقیقاً مرتبط را کنار نزند. */
  const liveCode = s.files.filter(f =>
    (f.path.startsWith('src/') || f.path.startsWith('public/js/')) && f.size <= 600 * 1024);
  const byPath = new Map(scored.map(x => [x.f.path, x]));
  for (const f of liveCode) {
    let text;
    try { text = fs.readFileSync(path.join(REPO_ROOT, f.path), 'utf8').toLowerCase(); } catch (e) { continue; }
    let score = 0;
    for (const t of terms) {
      const n = text.split(t).length - 1;
      if (n) score += Math.min(8, n) * (concepts.has(t) ? 2 : 1);
    }
    if (!score) continue;
    const prev = byPath.get(f.path);
    if (prev) prev.score += score;
    else { const rec = { f, score }; scored.push(rec); byPath.set(f.path, rec); }
  }
  scored.sort((a, b) => b.score - a.score || a.f.size - b.f.size);
  for (const { f, score } of scored.slice(0, (limit || 5) * 3)) {
    if (picked.length >= (limit || 5)) break;
    add(f.path, `مرتبط با سؤال (امتیاز ${score})`, terms);
  }
  return picked;
}

module.exports = { buildProjectMap, pickRelevantFiles, invalidate, REPO_ROOT };
