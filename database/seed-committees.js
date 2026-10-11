/**
 * Migration + Seed: کمیته‌های الزامی بیمارستانی
 * افزودن ستون رنگ اختصاصی به کمیته‌ها و بارگذاری ۱۷ کمیته استاندارد برای هر بیمارستان موجود
 * (بر اساس تحلیل ساختار سامانه طراحی اولیه حسن - docs/hassan_ANALYSIS.md بخش ۴)
 * Run: npm run seed-committees
 */
const { db } = require('../src/config/database-sqlite');

function uuid() {
  return require('crypto').randomUUID();
}

const COMMITTEES = [
  { name: 'پایش و سنجش کیفیت', type: 'quality', color: '#3fbf8f', freq: 'ماهانه' },
  { name: 'مدیریت خطر حوادث و بلایا', type: 'risk_disaster', color: '#8d6bff', freq: 'فصلی' },
  { name: 'مدیریت اطلاعات سلامت و فناوری', type: 'him_it', color: '#2fb8b0', freq: 'فصلی' },
  { name: 'اخلاق پزشکی و رفتار حرفه‌ای', type: 'ethics', color: '#d968a0', freq: 'فصلی' },
  { name: 'دارو و تجهیزات پزشکی', type: 'pharmacy_equipment', color: '#d4af5a', freq: 'ماهانه' },
  { name: 'طب انتقال خون', type: 'blood_bank', color: '#d97a6a', freq: 'فصلی' },
  { name: 'حفاظت فنی و بهداشت کار', type: 'occupational_safety', color: '#2a56b0', freq: 'فصلی' },
  { name: 'مرگ‌ومیر و عارضه‌شناسی', type: 'mortality_morbidity', color: '#e0b84e', freq: 'ماهانه' },
  { name: 'کنترل عفونت', type: 'infection_control', color: '#5ec2e6', freq: 'ماهانه' },
  { name: 'بهداشت محیط', type: 'environmental_health', color: '#7fd858', freq: 'فصلی' },
  { name: 'اورژانس بیمارستانی', type: 'emergency', color: '#c95ee0', freq: 'ماهانه' },
  { name: 'ترویج تغذیه با شیر مادر', type: 'breastfeeding', color: '#e08f3c', freq: 'فصلی' },
  { name: 'ترویج زایمان طبیعی و ایمن', type: 'safe_delivery', color: '#4fd1c5', freq: 'فصلی' },
  { name: 'اقتصاد درمان دارو و تجهیزات پزشکی', type: 'pharmacoeconomics', color: '#b0855a', freq: 'فصلی' },
  { name: 'تیم مدیریت اجرایی', type: 'executive', color: '#6e7fe0', freq: 'ماهانه' },
  { name: 'هم‌اندیشی مدیریت پرستاری', type: 'nursing_management', color: '#e0567a', freq: 'ماهانه' },
  { name: 'کارگروه آموزش به بیمار بخش‌ها', type: 'patient_education', color: '#7ac9a0', freq: 'فصلی' },
];

/**
 * محتوای عملیاتی کمیته — «اهداف/بیانیه» و «شرح وظایف».
 * منبع: docs/hassan_ANALYSIS_V6.md §۴.۲ — تنها متنِ واقعیِ ثبت‌شده‌ای که در کراول ضبط شد.
 * هشدار صداقتی: سند V6 فقط سرآغازِ این متن‌ها را نگه داشته (بدنهٔ کامل ~۱.۵KB/~۲.۵KB
 * در مخزن موجود نیست). این‌جا فقط همان بخشِ عیناً ضبط‌شده seed می‌شود و با یک
 * یادداشتِ صریح مشخص شده که ادامهٔ متن هنوز وارد نشده — متنِ مقرراتیِ ساختگی نمی‌نویسیم.
 */
const EXCERPT_NOTE = '\n\n[ادامهٔ این متن هنوز از منبع اصلی وارد نشده است.]';
const COMMITTEE_CONTENT = [
  {
    name: 'کنترل عفونت',
    statement: 'اهداف کلی کمیته\n۱ - کاهش مرگ و میر' + EXCERPT_NOTE,
    program: 'الف) تیم کنترل عفونت بیمارستان:' + EXCERPT_NOTE,
  },
];

function runMigration() {
  console.log('[Seed Committees] Starting...');
  try {
    const cols = db.prepare('PRAGMA table_info(committees)').all();
    if (!cols.some(c => c.name === 'theme_color')) {
      db.exec("ALTER TABLE committees ADD COLUMN theme_color TEXT DEFAULT '#d4af5a'");
      console.log('[Seed Committees] Column theme_color added');
    }
    if (!cols.some(c => c.name === 'statement')) {
      db.exec('ALTER TABLE committees ADD COLUMN statement TEXT');
      console.log('[Seed Committees] Column statement added');
    }
    if (!cols.some(c => c.name === 'program')) {
      db.exec('ALTER TABLE committees ADD COLUMN program TEXT');
      console.log('[Seed Committees] Column program added');
    }

    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    const existsStmt = db.prepare('SELECT id FROM committees WHERE hospital_id = ? AND name = ?');
    const insertStmt = db.prepare(
      `INSERT INTO committees (id, hospital_id, name, committee_type, meeting_frequency, theme_color) VALUES (?, ?, ?, ?, ?, ?)`
    );

    let inserted = 0;
    const tx = db.transaction(() => {
      for (const h of hospitals) {
        for (const c of COMMITTEES) {
          if (existsStmt.get(h.id, c.name)) continue;
          insertStmt.run(uuid(), h.id, c.name, c.type, c.freq, c.color);
          inserted++;
        }
      }
    });
    tx();

    // محتوای عملیاتی (اهداف/شرح وظایف) — فقط روی ردیف‌هایی که هنوز خالی‌اند
    const findStmt = db.prepare("SELECT id, statement, program FROM committees WHERE name = ?");
    const contentStmt = db.prepare('UPDATE committees SET statement = ?, program = ? WHERE id = ?');
    let contentSeeded = 0;
    const tx2 = db.transaction(() => {
      for (const c of COMMITTEE_CONTENT) {
        for (const row of findStmt.all(c.name)) {
          const hasStatement = row.statement && row.statement.trim();
          const hasProgram = row.program && row.program.trim();
          if (hasStatement && hasProgram) continue;
          contentStmt.run(hasStatement ? row.statement : c.statement, hasProgram ? row.program : c.program, row.id);
          contentSeeded++;
        }
      }
    });
    tx2();

    console.log(`[Seed Committees] ✅ ${inserted} committee rows inserted across ${hospitals.length} hospital(s), ` +
      `${contentSeeded} committee(s) given goals/duties content`);
  } catch (err) {
    console.error('[Seed Committees] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration, COMMITTEES };
