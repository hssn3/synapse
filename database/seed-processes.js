/**
 * Migration + Seed: رجیستری فرآیندها و فلوچارت فرآیند — شکاف ۳ تحلیل رقیب
 * ساخت جدول‌های processes و process_notify_users و افزودن مجوزهای
 * manage_processes / view_processes.
 *
 * چرا ماژول جدا و نه یک دسته در «مدارک کنترل‌شده»؟
 *  مدرک کنترل‌شده گردش امضا و نسخه‌بندی دارد؛ فلوچارت فرآیند فقط یک فایل با
 *  حوزهٔ فرآیند، ارجاع‌دهنده، تاریخ تدوین و «مسئولین آگاهی» است. بستنش پشت
 *  manage_documents، ثبت فرآیند را بی‌دلیل به گردش امضا گره می‌زد.
 *
 * چرا «مسئولین آگاهی» جدول واسط است و نه ستون JSON؟
 *  باید بتوان از سمت کاربر هم پرسید «کدام فرآیندها را باید بدانم؟» — با ستون JSON
 *  این پرسش به پیمایش کل جدول می‌انجامید. کلید مرکب از رکورد تکراری جلوگیری می‌کند.
 *
 * فایل فلوچارت روی همان مسیر مشترک multer/sharp اسناد/کتابخانه ذخیره می‌شود
 * (storeUploadedFile/sendStoredFile در src/routes/api.js) — مسیر آپلود جدیدی ساخته نشده.
 * Run: npm run seed-processes — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS processes (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT 'main',   -- main | managerial | support (اصلی | مدیریتی | پشتیبانی)
    process_code TEXT,
    referring_person TEXT,
    referring_user_id TEXT REFERENCES users(id),
    compiled_date TEXT,
    description TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size_bytes INTEGER,
    section_id TEXT,                       -- گره درخت سنجه‌ها (سراسری، بدون hospital_id)
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS process_notify_users (
    process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (process_id, user_id)
  )`,
  // ---- گام‌های فلوچارت ----
  // تا پیش از این «فلوچارت» فقط یک فایلِ آپلودی بود؛ یعنی سامانه هیچ نمی‌دانست فرآیند
  // چه گام‌هایی دارد و نمی‌شد چیزی رسم یا چاپ کرد. کتاب صریح است:
  //   «تدوین فرآیند … با ذکر نام صاحبان فرایند به صورت فلوچارت ساده و قابل فهم»
  //   «نصب فرآیند مذکور … در معرض دید گیرندگان خدمت»        (ج-۲-۳-۱)
  //   «فرایند‌ها می‌توانند به صورت فلوچارت و یا … الگوریتم تدوین شوند»  (الف-۱-۴-۲)
  //
  // مدل عمداً ساده است: یک ستون فقراتِ عمودی از گام‌ها. گامِ تصمیم شاخه‌ی «بله» را به
  // گام بعدی می‌دهد و شاخه‌ی «خیر» را به گامی که no_target_id می‌گوید (یا پایان).
  // این برای فلوچارت‌های واقعیِ بیمارستانی (مثل رسیدگی به شکایات) کافی است و
  // نیازی به بوم کشیدنی و مختصات دستی ندارد.
  `CREATE TABLE IF NOT EXISTS process_steps (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    step_type TEXT NOT NULL DEFAULT 'action',  -- start | action | decision | document | end
    text TEXT NOT NULL,
    owner TEXT,                                 -- صاحب فرایند (کتاب: «با ذکر نام صاحبان فرایند»)
    no_target_id TEXT,                          -- فقط برای decision: مقصدِ شاخه‌ی «خیر»
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // ---- یال‌های فلوچارت ----
  // نسخه‌ی اول فقط یک ستون فقراتِ خطی با یک شاخه‌ی «خیر» را می‌شناخت (no_target_id
  // روی خودِ گام). فلوچارت‌های واقعیِ بیمارستانی چندشاخه‌اند: تصمیمِ سه‌حالته،
  // پرش به گامِ دورتر، و حلقه‌ی بازگشتی («اگر رفع نشد، برگرد به اصلاح»).
  // پس مدل به یک **گراف جهت‌دار** تبدیل شد: هر یال برچسب خودش را دارد.
  // ستون no_target_id سرِ جایش می‌ماند (داده‌ی قدیمی) ولی دیگر منبع حقیقت نیست.
  `CREATE TABLE IF NOT EXISTS process_links (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    from_step_id TEXT NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    to_step_id TEXT NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    label TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_proclink ON process_links(process_id, from_step_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_procstep ON process_steps(process_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_proc_hospital ON processes(hospital_id, domain)`,
  `CREATE INDEX IF NOT EXISTS idx_proc_section ON processes(section_id)`,
  `CREATE INDEX IF NOT EXISTS idx_procnotify_user ON process_notify_users(user_id)`,
  `CREATE TABLE IF NOT EXISTS process_kpis (
    process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    kpi_id TEXT NOT NULL REFERENCES hospital_kpis(id) ON DELETE CASCADE,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (process_id, kpi_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_proc_kpis_pid ON process_kpis(process_id)`,
  `CREATE INDEX IF NOT EXISTS idx_proc_kpis_kid ON process_kpis(kpi_id)`,
];

// مشاهده عمداً گسترده است — هر کسی که در فرآیند نقش دارد باید فلوچارت را ببیند
const ROLE_PERMS = {
  admin: ['manage_processes', 'view_processes'],
  quality_control_manager: ['manage_processes', 'view_processes'],
  nursing_director: ['manage_processes', 'view_processes'],
  education_supervisor: ['view_processes'],
  clinical_supervisor: ['view_processes'],
  infection_control_supervisor: ['view_processes'],
  staff_nurse: ['view_processes'],
};

// ستون‌هایی که بعداً اضافه شده‌اند (روی دیتابیس‌های موجود هم باید ساخته شوند).
// وضعیت ابلاغ: کتاب می‌گوید فرآیند باید «کدگذاری شده و پس از تصویب تیم رهبری» به کار
// رود (الف-۱-۴-۲). بدون این، معلوم نبود کدام نسخه‌ی فلوچارت رسمی است و کارکنان
// نمی‌دانستند کدام را روی دیوار بزنند. پیش‌فرض draft است تا فرآیندهای موجود
// ناگهان «ابلاغ‌شده» جا نزنند.
const ADD_COLUMNS = [
  { table: 'processes', column: 'status', ddl: "ALTER TABLE processes ADD COLUMN status TEXT DEFAULT 'draft'" },
  { table: 'processes', column: 'version_no', ddl: 'ALTER TABLE processes ADD COLUMN version_no INTEGER DEFAULT 1' },
  { table: 'processes', column: 'approved_by', ddl: 'ALTER TABLE processes ADD COLUMN approved_by TEXT REFERENCES users(id)' },
  { table: 'processes', column: 'approved_at', ddl: 'ALTER TABLE processes ADD COLUMN approved_at TEXT' },
  { table: 'processes', column: 'next_review_date', ddl: 'ALTER TABLE processes ADD COLUMN next_review_date TEXT' },
];

// تبدیل داده‌ی «ستون فقراتِ» قدیمی به یال‌های صریح — یک‌بار، و بدون از دست رفتن
// چیزی: هر گام به گام بعدی وصل می‌شود، و گامِ تصمیم شاخه‌ی «بله» به گام بعدی و
// «خیر» به no_target_id می‌رود؛ دقیقاً همان چیزی که رندرِ قدیمی نشان می‌داد.
// فقط فرآیندهایی که گام دارند و هنوز هیچ یالی ندارند دست‌کاری می‌شوند، پس اجرای
// دوباره صفر تغییر می‌دهد.
function migrateSpineToLinks() {
  const crypto = require('crypto');
  const withSteps = db.prepare(`SELECT DISTINCT process_id FROM process_steps`).all();
  const ins = db.prepare(`INSERT INTO process_links
    (id, hospital_id, process_id, from_step_id, to_step_id, label, sort_order)
    VALUES (?,?,?,?,?,?,?)`);
  let n = 0;
  for (const row of withSteps) {
    const pid = row.process_id;
    if (db.prepare('SELECT COUNT(*) c FROM process_links WHERE process_id = ?').get(pid).c) continue;
    const steps = db.prepare('SELECT * FROM process_steps WHERE process_id = ? ORDER BY sort_order').all(pid);
    if (!steps.length) continue;
    const ids = new Set(steps.map(s => s.id));
    let order = 0;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i], nxt = steps[i + 1];
      if (s.step_type === 'end') continue;
      if (nxt) {
        ins.run(crypto.randomUUID(), s.hospital_id, pid, s.id, nxt.id,
          s.step_type === 'decision' ? 'بله' : null, order++);
      }
      if (s.step_type === 'decision' && s.no_target_id && ids.has(s.no_target_id)) {
        ins.run(crypto.randomUUID(), s.hospital_id, pid, s.id, s.no_target_id, 'خیر', order++);
      }
    }
    n++;
  }
  return n;
}

function runMigration() {
  console.log('[Seed Processes] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    for (const c of ADD_COLUMNS) {
      const cols = db.prepare(`PRAGMA table_info(${c.table})`).all().map(r => r.name);
      if (!cols.includes(c.column)) { db.exec(c.ddl); console.log(`[Seed Processes] + ${c.table}.${c.column}`); }
    }
    const migrated = migrateSpineToLinks();
    grantPerms(ROLE_PERMS, 'Seed Processes');
    console.log('[Seed Processes] ✅ processes + steps + links + approval ready'
      + (migrated ? ` — ${migrated} فرآیند از مدل خطی به گراف تبدیل شد` : ''));
  } catch (err) {
    console.error('[Seed Processes] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
