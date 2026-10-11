/**
 * نظارت مدیریت پرستاری — الف‑۴‑۱‑۴/۵ و الف‑۴‑۳‑۲/۳/۴
 * ---------------------------------------------------------------------
 * پنج سنجه‌ی باقی‌مانده‌ی محورِ الف‑۴ که برنامه‌ی شیفت پوششش نمی‌داد: برنامه
 * می‌گوید «چه کسی کِی کار می‌کند»، ولی سنجه‌ها می‌پرسند «چند نفر لازم بود» و
 * «کیفیتِ مراقبت پایش شد یا نه».
 *
 * چهار جدول:
 *
 *  ۱) nsp_staffing — الف‑۴‑۱‑۴ «توزیع و چینش کارکنان … با استفاده از روش‌های
 *     علمی برآورد کمی و کیفی» و الف‑۴‑۱‑۵ «شیوه‌های اجرایی و نحوه چیدمان …
 *     مانع مراقبت‌های مستقیم نمی‌شوند».
 *     نکته‌ی طراحی: «برآورد» یعنی عددِ لازم در برابر عددِ موجود، در سطحِ
 *     (بخش × شیفت). یک ستونِ «تعداد پرسنل» تنها، برآورد نیست — کسری/مازاد در
 *     سرور از تفریقِ همان دو حساب می‌شود تا دو ستون همدیگر را نقض نکنند.
 *     نسبتِ پرستار به تخت و به بیمار جدا ستون دارند چون سنجه «کمی *و کیفی*»
 *     گفته و کیفی یعنی ترکیبِ مهارت (skill mix)، نه فقط سرشماری.
 *
 *  ۲) nsp_care_audits — الف‑۴‑۳‑۲ «نظارت مستمر بر نحوه ارائه مراقبت‌های
 *     پرستاری … و در صورت نیاز اقدامات اصلاحی مؤثر». «مستمر» یعنی دوره‌ای و
 *     ثبت‌شده؛ «اقدام اصلاحی» یعنی حلقه باید بسته شود، پس بستنِ یک پایش بدونِ
 *     اقدام، در API رد می‌شود.
 *
 *  ۳) nsp_record_audits — الف‑۴‑۳‑۳ «مدیریت پرستاری بر نحوه تکمیل پرونده‌های
 *     پزشکی **در حین بستری** نظارت می‌نماید». «در حین بستری» مهم است: این
 *     ممیزیِ پرونده‌ی بسته‌شده نیست، نمونه‌گیری از پرونده‌های فعال است — پس
 *     ستون sample_size و تاریخِ پایش دارد، نه شماره‌ی یک پرونده‌ی خاص.
 *
 *  ۴) nsp_referrals — الف‑۴‑۳‑۴ «نظارت بر روند اعزام و ارجاع بیماران برابر
 *     ضوابط و رعایت اصول ایمنی بیمار». هر اعزام یک رویداد است با مقصد، علت،
 *     هماهنگیِ قبلی و همراهِ حین انتقال — سه چیزی که ارزیاب دقیقاً می‌پرسد.
 *
 * الف‑۴‑۳‑۵ (تعامل بین بخشی) و الف‑۴‑۳‑۶ (خرد جمعی در دفتر پرستاری) عمداً
 * جدول نگرفتند: هر دو از جنسِ صورت‌جلسه‌اند و ماژول «کمیته‌ها و صورت‌جلسات»
 * از قبل میزبانشان است.
 *
 * Run: node database/seed-nursing-supervision.js (یا خودکار روی هر boot).
 */
const { db } = require('../src/config/database-sqlite');
const { grantPerms } = require('./seed-library');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS nsp_staffing (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    shift_code TEXT NOT NULL DEFAULT 'M',
    period TEXT,
    active_beds INTEGER,
    patient_count INTEGER,
    acuity_level TEXT,
    required_staff INTEGER,
    assigned_staff INTEGER,
    gap INTEGER,
    nurse_per_bed REAL,
    skill_mix TEXT,
    method TEXT,
    non_care_burden TEXT,
    action_plan TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_nsps_h ON nsp_staffing(hospital_id, ward, period)`,

  `CREATE TABLE IF NOT EXISTS nsp_care_audits (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    audit_date TEXT,
    audit_focus TEXT,
    sample_size INTEGER,
    compliance_pct REAL,
    findings TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    recheck_date TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    auditor TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_nspc_h ON nsp_care_audits(hospital_id, status, audit_date)`,

  `CREATE TABLE IF NOT EXISTS nsp_record_audits (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward TEXT NOT NULL,
    audit_date TEXT,
    sample_size INTEGER,
    complete_count INTEGER,
    completeness_pct REAL,
    common_defects TEXT,
    corrective_action TEXT,
    auditor TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_nspr_h ON nsp_record_audits(hospital_id, audit_date)`,

  `CREATE TABLE IF NOT EXISTS nsp_referrals (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    referral_date TEXT,
    patient_reference TEXT,
    from_ward TEXT,
    destination TEXT,
    reason TEXT NOT NULL DEFAULT 'نبود تخت ویژه',
    prior_coordination INTEGER DEFAULT 0,
    escort TEXT,
    transport_mode TEXT,
    patient_condition TEXT,
    safety_checklist_done INTEGER DEFAULT 0,
    outcome TEXT,
    note TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_nspf_h ON nsp_referrals(hospital_id, referral_date)`,
];

// هیچ‌کدام از این نقش‌ها در seed-management-roles.js نیستند، پس این‌جا امن‌اند.
const ROLE_PERMS = {
  admin: ['manage_nsupervision', 'view_nsupervision'],
  nursing_director: ['manage_nsupervision', 'view_nsupervision'],
  clinical_supervisor: ['view_nsupervision'],
  quality_control_manager: ['view_nsupervision'],
};

function runMigration() {
  console.log('[Seed NursingSupervision] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    grantPerms(ROLE_PERMS, 'Seed NursingSupervision');
    console.log('[Seed NursingSupervision] ✅ nsp_staffing / nsp_care_audits / nsp_record_audits / nsp_referrals ready');
  } catch (err) {
    console.error('[Seed NursingSupervision] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
