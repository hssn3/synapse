/**
 * Migration + Seed: ساختار سازمانی — شکاف ۸ رقیب
 * چهار جدول مرجع: گروه شغلی، واحد/بخش، پست سازمانی، ساختمان.
 *
 * چرا جدول مرجع و نه ادامه‌ی متن آزاد؟ در حال حاضر «بخش» در سراسر برنامه یک رشته‌ی آزاد است
 * (users.department، internal_audits.audited_department، improvement_programs.department …).
 * نتیجه‌اش این است که «بلوک زايمان» و «بلوک زایمان» دو بخش متفاوت شمرده می‌شوند و هیچ
 * گزارشی به‌تفکیک بخش قابل اعتماد نیست.
 *
 * دامنه‌ی این گام عمداً محدود است: جدول‌ها + یک صفحه‌ی مدیریت ساده + استفاده در فهرست‌های
 * انتخابیِ ماژول‌های تازه. *مهاجرت* ستون‌های متنی موجود به این جدول‌ها انجام *نمی‌شود* —
 * آن کار به داده‌ی زنده‌ی هر بیمارستان دست می‌زند و باید جداگانه و با نگاشت دستی انجام شود.
 *
 * نام‌های seed از کرال واقعی رقیب استخراج شده‌اند (docs/hassan_ANALYSIS_V4.md بند ۵ برای
 * بخش‌ها، docs/hassan_ANALYSIS_V5_LEADERSHIP.md بندهای ۴.۳ و ۴.۴ برای پست و گروه شغلی)،
 * نه اسم‌های ساختگی.
 * Run: npm run seed-org-structure — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');
const crypto = require('crypto');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS job_groups (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    floors INTEGER,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // parent_id سلسله‌مراتب واحد در واحد را می‌سازد (مثلاً «اتاق عمل» زیرِ «بلوک جراحی»)؛
  // building_id جای فیزیکی واحد است. حذف ساختمان واحد را حذف نمی‌کند، فقط بی‌مکان می‌کند.
  `CREATE TABLE IF NOT EXISTS org_units (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    unit_type TEXT DEFAULT 'بخش بالینی',
    parent_id TEXT REFERENCES org_units(id) ON DELETE SET NULL,
    building_id TEXT REFERENCES buildings(id) ON DELETE SET NULL,
    bed_count INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS post_titles (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    job_group_id TEXT REFERENCES job_groups(id) ON DELETE SET NULL,
    is_managerial INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_jobgroup_uniq ON job_groups(hospital_id, title)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_building_uniq ON buildings(hospital_id, title)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orgunit_uniq ON org_units(hospital_id, title)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_posttitle_uniq ON post_titles(hospital_id, title)`,
];

// ارجاع اختیاری برنامه‌های بهبود به واحد سازمانی — ستون متنی department سرجای خود می‌ماند
// (داده‌ی موجود از بین نرود)، ولی فرم جدید می‌تواند واحد را از فهرست انتخاب کند.
const ADD_COLUMNS = [
  { table: 'improvement_programs', column: 'org_unit_id',
    ddl: 'ALTER TABLE improvement_programs ADD COLUMN org_unit_id TEXT REFERENCES org_units(id) ON DELETE SET NULL' },
];

const ROLE_PERMS = {
  admin: ['manage_org_structure', 'view_org_structure'],
  quality_control_manager: ['manage_org_structure', 'view_org_structure'],
  nursing_director: ['manage_org_structure', 'view_org_structure'],
  education_supervisor: ['view_org_structure'],
  clinical_supervisor: ['view_org_structure'],
  infection_control_supervisor: ['view_org_structure'],
  breastfeeding_specialist: ['view_org_structure'],
  staff_nurse: ['view_org_structure'],
};

// docs/hassan_ANALYSIS_V5_LEADERSHIP.md §4.4
const JOB_GROUPS = ['پزشک', 'پرستاری', 'مدیریت پرستاری', 'سرپرستار', 'ماما', 'اتاق عمل',
  'هوشبری', 'آزمایشگاه', 'داروخانه', 'رادیولوژی و تصویربرداری', 'بهبود کیفیت',
  'اداری و مالی', 'منشی و پذیرش', 'خدمات', 'انتظامات', 'تأسیسات و مهندسی', 'کمک بهیار'];

const BUILDINGS = [
  { title: 'ساختمان اصلی (درمانگاهی-بستری)', floors: 5 },
  { title: 'ساختمان اورژانس', floors: 2 },
  { title: 'ساختمان پشتیبانی و تأسیسات', floors: 2 },
];

// docs/hassan_ANALYSIS_V4.md §5 (فهرست ۴۱ بخش واقعی) + واحدهای اجباری generation6_analysis.md
const ORG_UNITS = [
  { title: 'اورژانس', unit_type: 'بخش بالینی', building: 'ساختمان اورژانس', bed_count: 20 },
  { title: 'داخلی', unit_type: 'بخش بالینی', building: 'ساختمان اصلی (درمانگاهی-بستری)', bed_count: 30 },
  { title: 'جراحی', unit_type: 'بخش بالینی', building: 'ساختمان اصلی (درمانگاهی-بستری)', bed_count: 28 },
  { title: 'اطفال', unit_type: 'بخش بالینی', building: 'ساختمان اصلی (درمانگاهی-بستری)', bed_count: 18 },
  { title: 'CCU', unit_type: 'بخش ویژه', building: 'ساختمان اصلی (درمانگاهی-بستری)', bed_count: 10 },
  { title: 'ICU', unit_type: 'بخش ویژه', building: 'ساختمان اصلی (درمانگاهی-بستری)', bed_count: 12 },
  { title: 'NICU', unit_type: 'بخش ویژه', building: 'ساختمان اصلی (درمانگاهی-بستری)', bed_count: 8 },
  { title: 'بلوک زایمان', unit_type: 'بخش بالینی', building: 'ساختمان اصلی (درمانگاهی-بستری)', bed_count: 8 },
  { title: 'اتاق عمل جنرال', unit_type: 'بخش بالینی', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'آنژیوگرافی', unit_type: 'بخش بالینی', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'کلینیک‌های سرپایی', unit_type: 'بخش سرپایی', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'آزمایشگاه', unit_type: 'واحد پاراکلینیک', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'رادیولوژی', unit_type: 'واحد پاراکلینیک', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'داروخانه', unit_type: 'واحد پاراکلینیک', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'بانک خون', unit_type: 'واحد پاراکلینیک', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'CSSD', unit_type: 'واحد پشتیبانی', building: 'ساختمان پشتیبانی و تأسیسات' },
  { title: 'رختشویخانه', unit_type: 'واحد پشتیبانی', building: 'ساختمان پشتیبانی و تأسیسات' },
  { title: 'تغذیه و آشپزخانه', unit_type: 'واحد پشتیبانی', building: 'ساختمان پشتیبانی و تأسیسات' },
  { title: 'تأسیسات و مهندسی', unit_type: 'واحد پشتیبانی', building: 'ساختمان پشتیبانی و تأسیسات' },
  { title: 'تجهیزات پزشکی', unit_type: 'واحد پشتیبانی', building: 'ساختمان پشتیبانی و تأسیسات' },
  { title: 'مدارک پزشکی', unit_type: 'واحد اداری', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'پذیرش و ترخیص', unit_type: 'واحد اداری', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'بهبود کیفیت', unit_type: 'واحد اداری', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'کنترل عفونت', unit_type: 'واحد اداری', building: 'ساختمان اصلی (درمانگاهی-بستری)' },
  { title: 'بهداشت محیط و حرفه‌ای', unit_type: 'واحد اداری', building: 'ساختمان پشتیبانی و تأسیسات' },
];

// docs/hassan_ANALYSIS_V5_LEADERSHIP.md §4.3
const POST_TITLES = [
  { title: 'مدیر عامل', group: 'اداری و مالی', mgr: 1 },
  { title: 'مدیر پرستاری', group: 'مدیریت پرستاری', mgr: 1 },
  { title: 'مدیر بهبود کیفیت', group: 'بهبود کیفیت', mgr: 1 },
  { title: 'سوپروایزر بالینی', group: 'مدیریت پرستاری', mgr: 1 },
  { title: 'سوپروایزر آموزشی', group: 'مدیریت پرستاری', mgr: 1 },
  { title: 'سوپروایزر کنترل عفونت', group: 'مدیریت پرستاری', mgr: 1 },
  { title: 'سوپروایزر آموزش به بیمار', group: 'مدیریت پرستاری', mgr: 1 },
  { title: 'سرپرستار', group: 'سرپرستار', mgr: 1 },
  { title: 'پرستار', group: 'پرستاری', mgr: 0 },
  { title: 'کمک پرستار', group: 'کمک بهیار', mgr: 0 },
  { title: 'ماما', group: 'ماما', mgr: 0 },
  { title: 'کارشناس هوشبری', group: 'هوشبری', mgr: 0 },
  { title: 'کارشناس اتاق عمل', group: 'اتاق عمل', mgr: 0 },
  { title: 'کارشناس آزمایشگاه', group: 'آزمایشگاه', mgr: 0 },
  { title: 'کارشناس رادیولوژی', group: 'رادیولوژی و تصویربرداری', mgr: 0 },
  { title: 'کارشناس تغذیه', group: 'خدمات', mgr: 0 },
  { title: 'کارشناس تجهیزات پزشکی', group: 'تأسیسات و مهندسی', mgr: 0 },
  { title: 'کارشناس بهداشت محیط', group: 'خدمات', mgr: 0 },
  { title: 'کارشناس بهداشت حرفه‌ای', group: 'خدمات', mgr: 0 },
  { title: 'کارشناس اطلاعات سلامت', group: 'اداری و مالی', mgr: 0 },
  { title: 'کارشناس منابع انسانی', group: 'اداری و مالی', mgr: 0 },
  { title: 'کارمند پذیرش', group: 'منشی و پذیرش', mgr: 0 },
  { title: 'کارشناس ترخیص', group: 'منشی و پذیرش', mgr: 0 },
  { title: 'مسئول انتظامات', group: 'انتظامات', mgr: 1 },
  { title: 'سرپرست فنی و مهندسی', group: 'تأسیسات و مهندسی', mgr: 1 },
];

const uid = () => crypto.randomUUID();

function seedHospital(h) {
  let n = 0;
  const getJG = db.prepare('SELECT id FROM job_groups WHERE hospital_id = ? AND title = ?');
  const insJG = db.prepare('INSERT INTO job_groups (id, hospital_id, title) VALUES (?, ?, ?)');
  for (const t of JOB_GROUPS) if (!getJG.get(h, t)) { insJG.run(uid(), h, t); n++; }

  const getB = db.prepare('SELECT id FROM buildings WHERE hospital_id = ? AND title = ?');
  const insB = db.prepare('INSERT INTO buildings (id, hospital_id, title, floors) VALUES (?, ?, ?, ?)');
  for (const b of BUILDINGS) if (!getB.get(h, b.title)) { insB.run(uid(), h, b.title, b.floors); n++; }

  const getU = db.prepare('SELECT id FROM org_units WHERE hospital_id = ? AND title = ?');
  const insU = db.prepare('INSERT INTO org_units (id, hospital_id, title, unit_type, building_id, bed_count) VALUES (?, ?, ?, ?, ?, ?)');
  for (const u of ORG_UNITS) {
    if (getU.get(h, u.title)) continue;
    const b = getB.get(h, u.building);
    insU.run(uid(), h, u.title, u.unit_type, b ? b.id : null, u.bed_count || null); n++;
  }

  const getP = db.prepare('SELECT id FROM post_titles WHERE hospital_id = ? AND title = ?');
  const insP = db.prepare('INSERT INTO post_titles (id, hospital_id, title, job_group_id, is_managerial) VALUES (?, ?, ?, ?, ?)');
  for (const p of POST_TITLES) {
    if (getP.get(h, p.title)) continue;
    const g = getJG.get(h, p.group);
    insP.run(uid(), h, p.title, g ? g.id : null, p.mgr); n++;
  }
  return n;
}

function runMigration() {
  console.log('[Seed OrgStructure] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    for (const c of ADD_COLUMNS) {
      const cols = db.prepare(`PRAGMA table_info(${c.table})`).all().map(r => r.name);
      if (!cols.includes(c.column)) { db.exec(c.ddl); console.log(`[Seed OrgStructure] + ${c.table}.${c.column}`); }
    }
    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    let total = 0;
    db.transaction(() => { for (const h of hospitals) total += seedHospital(h.id); })();
    console.log(`[Seed OrgStructure] ${total} lookup row(s) inserted across ${hospitals.length} hospital(s)`);
    grantPerms(ROLE_PERMS, 'Seed OrgStructure');
    console.log('[Seed OrgStructure] ✅ job_groups / org_units / post_titles / buildings ready');
  } catch (err) {
    console.error('[Seed OrgStructure] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
