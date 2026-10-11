/**
 * پیگیری بیمار و مادر باردار — مرحله‌ی ۶ نقشه‌راه نسخه‌ی ۲
 *
 * کارفرما ایراد گرفت: «این سامانه یک CRM هم هست ولی پیگیری بیمار/مادر باردار
 * ندارد». این ماژول همان را می‌دهد: پرونده‌ی پیگیری، زمان‌بندی مراجعه‌ی بعدی،
 * ثبت تماس، فهرست فراخوان (فیلترِ سررسید/گذشته در همان صفحه)، و پیامک
 * (با سرویسِ موجودِ src/config/notify.js — همان قرارداد «تا وقتی کلید واقعی
 * تنظیم نشود، بی‌خطر no-op است» که برای یادآورهای دیگر هم رعایت شده).
 *
 * دو نوعِ پرونده‌ی جدا (patient_type) در یک جدول، نه دو جدولِ جدا: چون فیلدهای
 * مشترک (نام، تلفن، تماس‌ها، مراجعه‌ی بعدی) یکسان‌اند و فقط مادرِ باردار دو
 * فیلدِ اضافه (تاریخ آخرین قاعدگی، تاریخ تخمینیِ زایمان) دارد.
 */
const { db } = require('../src/config/database-sqlite');

const ROLE_PERMS = {
  admin: ['view_patient_followup', 'manage_patient_followup'],
  nursing_director: ['view_patient_followup', 'manage_patient_followup'],
  staff_nurse: ['view_patient_followup', 'manage_patient_followup'],
  clinical_supervisor: ['view_patient_followup', 'manage_patient_followup'],
  breastfeeding_specialist: ['view_patient_followup', 'manage_patient_followup'],
  quality_control_manager: ['view_patient_followup', 'manage_patient_followup'],
};

function runMigration() {
  console.log('[Seed PatientFollowup] Starting...');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS patient_followups (
        id TEXT PRIMARY KEY,
        hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        patient_type TEXT NOT NULL DEFAULT 'general',   -- 'general' | 'pregnant'
        full_name TEXT NOT NULL,
        national_code TEXT,
        phone TEXT,
        file_number TEXT,
        reason TEXT,
        lmp_date TEXT,                                  -- تاریخ آخرین قاعدگی (فقط مادر باردار)
        edd_date TEXT,                                  -- تاریخ تخمینیِ زایمان (فقط مادر باردار)
        status TEXT NOT NULL DEFAULT 'active',          -- 'active' | 'closed'
        next_visit_date TEXT,
        assigned_to TEXT REFERENCES users(id),
        created_by TEXT REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_pf_hospital ON patient_followups(hospital_id, status, next_visit_date);

      -- فهرست فراخوان یعنی همین جدول فیلترشده روی next_visit_date، نه جدولِ جدا؛
      -- تماس‌ها جدولِ جداست چون هر پرونده چند بار پیگیری می‌شود.
      CREATE TABLE IF NOT EXISTS patient_followup_contacts (
        id TEXT PRIMARY KEY,
        followup_id TEXT NOT NULL REFERENCES patient_followups(id) ON DELETE CASCADE,
        contacted_at TEXT DEFAULT (datetime('now')),
        contacted_by TEXT REFERENCES users(id),
        method TEXT NOT NULL DEFAULT 'call',            -- 'call' | 'sms' | 'visit' | 'other'
        outcome TEXT,
        next_action TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_pfc_followup ON patient_followup_contacts(followup_id, contacted_at);
    `);

    const roles = db.prepare('SELECT id, code, permissions FROM roles').all();
    const upd = db.prepare('UPDATE roles SET permissions = ? WHERE id = ?');
    let changed = 0;
    const tx = db.transaction(() => {
      for (const r of roles) {
        const wanted = ROLE_PERMS[r.code];
        if (!wanted) continue;
        let perms;
        try { perms = JSON.parse(r.permissions || '[]'); } catch { perms = []; }
        if (!Array.isArray(perms)) perms = [];
        const missing = wanted.filter(p => !perms.includes(p));
        if (!missing.length) continue;
        upd.run(JSON.stringify(perms.concat(missing)), r.id);
        changed++;
      }
    });
    tx();

    // نمونه‌ی دمو — هر بیمارستانی که هنوز هیچ پرونده‌ای ندارد، سه نمونه می‌گیرد: یک بیمارِ
    // با سررسیدِ گذشته (برای نمایشِ فهرستِ فراخوان)، یک بیمارِ با سررسیدِ آینده، و یک
    // مادرِ باردار. idempotent با شرطِ «اگر بیمارستان هنوز پرونده‌ای ندارد».
    const { uuid } = require('../src/utils/db');
    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    let seededHospitals = 0;
    for (const h of hospitals) {
      const count = db.prepare('SELECT COUNT(*) c FROM patient_followups WHERE hospital_id = ?').get(h.id).c;
      if (count > 0) continue;
      const nurse = db.prepare(`SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id
        WHERE u.hospital_id = ? AND r.code = 'staff_nurse' AND u.is_active = 1 LIMIT 1`).get(h.id);
      const nurseId = nurse ? nurse.id : null;
      const p1 = uuid(), p2 = uuid(), p3 = uuid();
      const stx = db.transaction(() => {
        db.prepare(`INSERT INTO patient_followups
          (id, hospital_id, patient_type, full_name, phone, reason, status, next_visit_date, assigned_to, created_by)
          VALUES (?, ?, 'general', 'نمونه — بیمارِ زخم بستر', '09120000001', 'پیگیریِ بهبود زخم بستر پس از ترخیص', 'active',
                  date('now','-5 days'), ?, ?)`).run(p1, h.id, nurseId, nurseId);
        db.prepare(`INSERT INTO patient_followup_contacts (id, followup_id, contacted_by, method, outcome, next_action)
          VALUES (?, ?, ?, 'call', 'وضعیت زخم رو به بهبود بود', 'مراجعه‌ی حضوری برای تعویض پانسمان')`)
          .run(uuid(), p1, nurseId);
        db.prepare(`INSERT INTO patient_followups
          (id, hospital_id, patient_type, full_name, phone, reason, status, next_visit_date, assigned_to, created_by)
          VALUES (?, ?, 'general', 'نمونه — بیمارِ دیابتی', '09120000002', 'پیگیریِ کنترل قند خون', 'active',
                  date('now','+5 days'), ?, ?)`).run(p2, h.id, nurseId, nurseId);
        db.prepare(`INSERT INTO patient_followups
          (id, hospital_id, patient_type, full_name, phone, reason, lmp_date, edd_date, status, next_visit_date, assigned_to, created_by)
          VALUES (?, ?, 'pregnant', 'نمونه — مادرِ باردار', '09120000003', 'مراقبتِ دوره‌ایِ بارداری',
                  date('now','-90 days'), date('now','+150 days'), 'active', date('now','+2 days'), ?, ?)`).run(p3, h.id, nurseId, nurseId);
      });
      stx();
      seededHospitals++;
    }

    console.log(`[Seed PatientFollowup] ✅ جدول‌ها آماده‌اند (${changed} نقش مجوز پیگیری گرفت، ${seededHospitals} بیمارستان نمونه گرفت)`);
  } catch (err) {
    console.error('[Seed PatientFollowup] ❌ Failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}
module.exports = { runMigration };
