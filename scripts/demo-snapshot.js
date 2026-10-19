/**
 * ساختِ «عکسِ نمایشی» — دیتابیس بیمارستان نمونه، پاک‌سازی‌شده و فشرده، داخل مخزن
 * ---------------------------------------------------------------------------
 * چرا این فایل هست: سیدها یک بیمارستانِ *خالی از داده‌ی واقعی* می‌سازند. برای
 * نمایش به کارفرما لازم است همان داده‌ای که روی سایت دیده می‌شود — ۳۹۵ سنجه‌ی
 * وضعیت‌دار، ۴۵۰۰ سلولِ شیفت، صورت‌جلسه‌ها، شاخص‌ها — روی هر ماشینی بالا بیاید.
 * پس یک نسخه‌ی آماده در خودِ گیت می‌ماند تا اگر سایت بالا نیامد، با
 * `git clone` + `npm run demo-restore` + `npm start` همان نمایش تکرار شود.
 *
 * سه کار انجام می‌شود، به همین ترتیب:
 *
 *  ۱) کپیِ سازگار با VACUUM INTO (نه کپیِ مستقیم فایل) — تا اگر برنامه در حال
 *     اجراست، عکس نصفه‌کاره نگیریم. همین کار فایل را هم جمع‌وجور می‌کند.
 *
 *  ۲) پاک‌سازی. مخزن الان خصوصی است ولی تاریخچه‌ی گیت ماندگار است و یک روز ممکن
 *     است مخزن با کسی به اشتراک گذاشته شود؛ پس هرچه رازآلود است بیرون می‌رود:
 *       • api_key و github_token در تنظیمات دستیار و پنل توسعه
 *       • گفت‌وگوهای دستیار (ممکن است متنِ کارِ واقعی داخلشان باشد)
 *       • لاگ‌های ممیزی و خطا و سطل بازیافت (۵۰۰۰ ردیف، فقط حجم اضافه)
 *     رمزهای کاربران دست‌نخورده می‌مانند، چون رمزهای نمایشیِ مستندشده‌اند و
 *     بدون آن‌ها عکس به درد نمایش نمی‌خورد.
 *
 *  ۳) gzip با zlib خودِ Node — نه دستور بیرونیِ gzip — تا روی ویندوز هم بدون
 *     نصب چیزی کار کند. همین دلیلِ نبودِ tar هم هست.
 *
 *  ۴) فایل‌های آپلودیِ *ارجاع‌شده* هم کنار عکس کپی می‌شوند. لوگوی مرکز در
 *     uploads/ است نه در دیتابیس، و uploads/ در .gitignore است؛ بدون این قدم
 *     سربرگِ چاپی — که خودِ نمایش است — بی‌لوگو بالا می‌آمد. فقط فایل‌هایی
 *     برداشته می‌شوند که نامشان واقعاً در جایی از دیتابیس آمده باشد، تا آپلودهای
 *     پراکنده‌ی آزمایشی وارد مخزن نشوند.
 *
 * اجرا:  npm run demo-snapshot
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');
const { dbPath, uploadDir, REPO_ROOT } = require('../src/config/paths');

const OUT_DIR = path.join(REPO_ROOT, 'database', 'demo-snapshot');
const OUT_DB = path.join(OUT_DIR, 'hospital-demo.db');
const OUT_GZ = `${OUT_DB}.gz`;
const OUT_MANIFEST = path.join(OUT_DIR, 'manifest.json');

// ستون‌هایی که مقدارشان راز است → NULL می‌شوند.
//
// کلیدِ API دستیار هم اکنون پاک می‌شود (1405-07-20): پیش‌تر کارفرما گفته بود
// «کلید مهم نیست بزار باشه» چون مخزن را خصوصی فرض می‌کرد؛ بعداً مخزن عمومی
// شد و کلیدِ کامیت‌شده عملاً برای همه قابل دانلود بود. طبق سیاست امنیتی
// «هیچ رازی در مخزن»، کلید باید NULL شود. بدون کلید، دستیار فقط در حالتِ
// کمکِ پیشرفته جواب نمی‌دهد و جست‌وجوی داخلی سر جایش است، پس نمایش ناقص نمی‌شود.
const SECRET_COLUMNS = [
  ['superadmin_dev_settings', ['github_token']],
  ['assistant_hospital_settings', ['api_key']],
];

// جدول‌هایی که کلاً خالی می‌شوند: یا محتوای گفت‌وگو دارند یا فقط حجم‌اند.
const PURGE_TABLES = [
  'assistant_conversations',
  'assistant_messages',
  'dev_assistant_messages',
  'audit_log',
  'super_audit_log',
  'error_log',
  'deleted_records',
  'reminder_cron_logs',
];

// جدول‌هایی که برای «آیا عکس کامل است؟» شمرده و در manifest ثبت می‌شوند.
const COUNT_TABLES = [
  'hospitals', 'users', 'roles', 'measure_status', 'shift_entries',
  'committee_meeting_minutes', 'controlled_documents', 'hospital_kpis',
  'checklists', 'processes', 'facility_assets', 'blood_bags',
  'lab_qc_records', 'imaging_devices', 'patient_satisfaction_surveys',
  'nursing_shift_attendance', 'nursing_supervisor_reports', 'occ_hazards', 'occ_incidents',
  'fin_budget_lines', 'fin_donations', 'pf_coi_cases', 'pf_readmissions', 'pf_ama_discharges',
  'edu_policies', 'edu_sessions', 'edu_effectiveness', 'fin_cost_management',
  'service_disruptions', 'staff_surveys', 'stakeholders',
];

function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

/**
 * فایل‌های آپلودیِ ارجاع‌شده را پیدا و کپی می‌کند.
 *
 * چرا جست‌وجوی سراسری به‌جای فهرستِ دستیِ ستون‌ها: نامِ فایل در دست‌کم سه شکل
 * ذخیره می‌شود (hospitals.logo_url، مسیرِ ضمیمه‌ها، و داخل JSONهای فرم‌ساز). یک
 * فهرستِ دستی با اولین ماژولِ تازه عقب می‌ماند و آن‌وقت عکس، فایلِ گم‌شده دارد
 * بدون اینکه کسی بفهمد. پس برعکس عمل می‌کنیم: از روی فایل‌های موجود در uploads/
 * می‌گردیم که نامشان در کدام ستونِ متنی آمده — هرچه پیدا نشد، جا می‌ماند و
 * عمداً هم همین را می‌خواهیم (آپلودهای آزمایشی نباید وارد مخزن شوند).
 */
function collectUploads(db, destDir) {
  if (!fs.existsSync(uploadDir)) return { copied: [], skipped: [] };
  const files = fs.readdirSync(uploadDir).filter((f) => fs.statSync(path.join(uploadDir, f)).isFile());
  if (!files.length) return { copied: [], skipped: [] };

  // همه‌ی ستون‌های متنیِ همه‌ی جدول‌ها، یک بار
  const textCols = [];
  for (const { name: t } of db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()) {
    for (const c of db.prepare(`PRAGMA table_info(${t})`).all()) {
      if (/CHAR|TEXT|CLOB|JSON|^$/i.test(c.type || '')) textCols.push([t, c.name]);
    }
  }
  const referenced = new Set();
  for (const f of files) {
    for (const [t, c] of textCols) {
      if (referenced.has(f)) break;
      try {
        const hit = db.prepare(`SELECT 1 FROM ${t} WHERE "${c}" LIKE ? LIMIT 1`).get(`%${f}%`);
        if (hit) referenced.add(f);
      } catch (e) { /* ستون‌های عجیب را رد کن */ }
    }
  }

  fs.rmSync(destDir, { recursive: true, force: true });
  const copied = [];
  if (referenced.size) {
    fs.mkdirSync(destDir, { recursive: true });
    for (const f of referenced) {
      fs.copyFileSync(path.join(uploadDir, f), path.join(destDir, f));
      copied.push(f);
    }
  }
  return { copied, skipped: files.filter((f) => !referenced.has(f)) };
}

function run() {
  if (!fs.existsSync(dbPath)) {
    console.error(`[DemoSnapshot] ❌ دیتابیس پیدا نشد: ${dbPath}`);
    console.error('               اول یک بار `npm start` بزنید تا ساخته شود.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of [OUT_DB, OUT_GZ]) if (fs.existsSync(f)) fs.unlinkSync(f);

  // ۱) کپیِ سازگار
  const src = new Database(dbPath, { readonly: true });
  src.exec(`VACUUM INTO '${OUT_DB.replace(/'/g, "''")}'`);
  src.close();

  // ۲) پاک‌سازی روی همان کپی
  const snap = new Database(OUT_DB);
  const scrubbed = [];
  for (const [table, cols] of SECRET_COLUMNS) {
    if (!tableExists(snap, table)) continue;
    const have = new Set(snap.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    const hit = cols.filter((c) => have.has(c));
    if (!hit.length) continue;
    snap.prepare(`UPDATE ${table} SET ${hit.map((c) => `${c} = NULL`).join(', ')}`).run();
    scrubbed.push(`${table}.${hit.join('/')}`);
  }
  const purged = [];
  for (const table of PURGE_TABLES) {
    if (!tableExists(snap, table)) continue;
    const n = snap.prepare(`DELETE FROM ${table}`).run().changes;
    if (n) purged.push(`${table} (${n})`);
  }
  if (tableExists(snap, 'assistant_knowledge')) {
    const nk = snap.prepare(`
      DELETE FROM assistant_knowledge
      WHERE source_type = 'ai_answer'
         OR content LIKE '%پاسخِ بدل%'
         OR title LIKE '%فرانسه%'
         OR title LIKE '%لهستان%'
         OR title LIKE '%نروژ%'
         OR title LIKE '%هلند%'
         OR title LIKE '%اسلواکی%'
         OR title = 'چرا؟'
         OR title LIKE 'برای همان موضوع%'
         OR trim(content) = 'سلام'
    `).run().changes;
    if (nk) purged.push(`assistant_knowledge (test/dummy: ${nk})`);
  }

  const counts = {};
  for (const t of COUNT_TABLES) {
    if (tableExists(snap, t)) counts[t] = snap.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  }
  const hospitals = snap.prepare('SELECT name, subdomain FROM hospitals').all();
  const uploads = collectUploads(snap, path.join(OUT_DIR, 'uploads'));

  // بعد از حذف‌ها فایل را دوباره جمع کن، وگرنه صفحه‌های آزادشده در gzip می‌مانند
  snap.exec('VACUUM');
  snap.close();

  // آخرین بازبینی: مطمئن شو هیچ رازی جا نمانده
  const leftover = [];
  const check = new Database(OUT_DB, { readonly: true });
  for (const [table, cols] of SECRET_COLUMNS) {
    if (!tableExists(check, table)) continue;
    const have = new Set(check.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    for (const c of cols.filter((x) => have.has(x))) {
      const n = check.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${c} IS NOT NULL AND ${c} <> ''`).get().c;
      if (n) leftover.push(`${table}.${c} (${n})`);
    }
  }
  check.close();
  if (leftover.length) {
    fs.unlinkSync(OUT_DB);
    console.error('[DemoSnapshot] ❌ پاک‌سازی ناقص بود، عکس ساخته نشد:', leftover.join('، '));
    process.exit(1);
  }

  // ۳) فشرده‌سازی با zlib (بدون وابستگی به gzip سیستم — مهم برای ویندوز)
  const raw = fs.readFileSync(OUT_DB);
  fs.writeFileSync(OUT_GZ, zlib.gzipSync(raw, { level: 9 }));
  fs.unlinkSync(OUT_DB);

  const manifest = {
    createdAt: new Date().toISOString(),
    sourceDb: dbPath,
    rawBytes: raw.length,
    gzipBytes: fs.statSync(OUT_GZ).size,
    hospitals,
    counts,
    scrubbedColumns: scrubbed,
    purgedTables: purged,
    uploads: uploads.copied,
  };
  fs.writeFileSync(OUT_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;
  console.log('[DemoSnapshot] ✅ عکس نمایشی ساخته شد');
  console.log(`               فایل   : ${path.relative(REPO_ROOT, OUT_GZ)}`);
  console.log(`               حجم    : ${mb(raw.length)} → ${mb(manifest.gzipBytes)} فشرده`);
  console.log(`               مرکز   : ${hospitals.map((h) => h.name).join('، ') || '—'}`);
  console.log(`               پاک‌شد : ${scrubbed.join('، ') || '—'}`);
  console.log(`               خالی‌شد: ${purged.join('، ') || '—'}`);
  console.log(`               آپلودها: ${uploads.copied.join('، ') || '—'}`
    + (uploads.skipped.length ? `  (${uploads.skipped.length} فایلِ بی‌ارجاع برداشته نشد)` : ''));
  console.log(`               نمونه  : ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
}

if (require.main === module) run();
module.exports = { run, OUT_GZ, OUT_MANIFEST };
