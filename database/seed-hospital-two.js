/**
 * Seed Hospital: بیمارستان دو (Demo)
 * Run: node database/seed-hospital-two.js
 */
const { db } = require('../src/config/database-sqlite');
const bcrypt = require('bcryptjs');

function uuid() {
  return require('crypto').randomUUID();
}

async function seedHospitalTwo() {
  console.log('========================================');
  console.log('  Seed: بیمارستان دو (Demo Hospital)');
  console.log('========================================\n');

  try {
    // Check if already exists
    const existing = db.prepare('SELECT id FROM hospitals WHERE subdomain = ?').get('h2');
    if (existing) {
      console.log('[Seed] بیمارستان دو already exists, skipping');
      return;
    }

    // Get super admin
    const superAdmin = db.prepare('SELECT id FROM super_admins LIMIT 1').get();
    if (!superAdmin) {
      console.error('[Seed] No super admin found. Run migrate-multi-tenant.js first!');
      process.exit(1);
    }

    // Get roles
    const roles = {};
    const roleRows = db.prepare('SELECT id, code FROM roles').all();
    roleRows.forEach(r => { roles[r.code] = r.id; });

    // 1. Create hospital
    const hospitalId = uuid();
    db.prepare(`
      INSERT INTO hospitals (
        id, name, subdomain, logo_url,
        letterhead_config, signature_config,
        created_by_super_admin, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      hospitalId,
      'بیمارستان دو',
      'h2',
      null, // لوگو بعداً آپلود می‌شود
      JSON.stringify({
        header_text: 'بیمارستان دو',
        footer_text: 'تهران، خیابان ولیعصر، نبش خیابان شهید بهشتی | تلفن: ۰۲۱-۸۸۷۷۶۶۵۵',
        address: 'تهران، خیابان ولیعصر، نبش خیابان شهید بهشتی',
        phone: '۰۲۱-۸۸۷۷۶۶۵۵'
      }),
      JSON.stringify({
        enabled: false
      }),
      superAdmin.id
    );
    console.log('[Seed] Hospital created:', 'بیمارستان دو');
    console.log('   Subdomain: h2');
    console.log('   URL: https://platform.ir/h2\n');

    // 2. Create hospital admin
    const adminUserId = uuid();
    const adminPassword = bcrypt.hashSync('Hospital2@Admin2026', 12);
    db.prepare(`
      INSERT INTO users (
        id, hospital_id, full_name, username, password_hash,
        role_id, department, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      adminUserId,
      hospitalId,
      'دکتر محمد احمدی',
      'hospital2_admin',
      adminPassword,
      roles.admin,
      'مدیریت'
    );

    // Update hospital.admin_user_id
    db.prepare('UPDATE hospitals SET admin_user_id = ? WHERE id = ?').run(adminUserId, hospitalId);
    console.log('[Seed] Hospital admin created:');
    console.log('   Username: hospital2_admin');
    console.log('   Password: Hospital2@Admin2026');
    console.log('   ⚠️  Must change password on first login\n');

    // 3. Create staff users
    const staff = [
      { name: 'خانم فاطمه رضایی', username: 'f.rezaei', role: 'quality_control_manager', dept: 'کنترل کیفیت' },
      { name: 'خانم زهرا کریمی', username: 'z.karimi', role: 'nursing_director', dept: 'پرستاری' },
      { name: 'خانم مریم حسینی', username: 'm.hosseini', role: 'infection_control_supervisor', dept: 'پرستاری' },
      { name: 'آقای علی محمدی', username: 'a.mohammadi', role: 'education_supervisor', dept: 'آموزش' },
      { name: 'خانم سارا احمدی', username: 's.ahmadi', role: 'clinical_supervisor', dept: 'پرستاری' },
      { name: 'خانم نرگس زارعی', username: 'n.zarei', role: 'breastfeeding_specialist', dept: 'زایشگاه' },
      { name: 'خانم مینا رستمی', username: 'm.rostami', role: 'staff_nurse', dept: 'جراحی' },
      { name: 'آقای رضا کاظمی', username: 'r.kazemi', role: 'staff_nurse', dept: 'داخلی' },
    ];

    console.log('[Seed] Creating staff users...');
    for (const person of staff) {
      const password = bcrypt.hashSync('123456', 12); // رمز ساده برای دمو
      db.prepare(`
        INSERT INTO users (
          id, hospital_id, full_name, username, password_hash,
          role_id, department, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        uuid(),
        hospitalId,
        person.name,
        person.username,
        password,
        roles[person.role],
        person.dept
      );
      console.log(`   ✓ ${person.name} (${person.username})`);
    }
    console.log('   Default password for all staff: 123456\n');

    // 4. Create committees for this hospital
    const committees = [
      { name: 'کمیته کنترل عفونت بیمارستان دو', type: 'infection_control' },
      { name: 'کمیته اعتباربخشی بیمارستان دو', type: 'accreditation' },
      { name: 'کمیته ایمنی بیمار بیمارستان دو', type: 'patient_safety' },
      { name: 'کمیته پرستاری بیمارستان دو', type: 'nursing' },
      { name: 'کمیته دارویی بیمارستان دو', type: 'pharmacy' },
      { name: 'کمیته اخلاق پزشکی بیمارستان دو', type: 'ethics' },
    ];

    console.log('[Seed] Creating committees...');
    for (const c of committees) {
      db.prepare(`
        INSERT INTO committees (id, hospital_id, name, committee_type, meeting_frequency)
        VALUES (?, ?, ?, ?, 'ماهانه')
      `).run(uuid(), hospitalId, c.name, c.type);
      console.log(`   ✓ ${c.name}`);
    }
    console.log('');

    // 5. Create calendar events for this hospital
    const currentYear = new Date().getFullYear();
    const events = [
      { title: 'روز جهانی بهداشت دست', desc: 'یادآوری اهمیت شستشوی دست', month: 5, day: 5 },
      { title: 'هفته جهانی شیر مادر', desc: 'ترویج شیردهی', month: 8, day: 1 },
      { title: 'روز ملی پرستار', desc: 'بزرگداشت پرستاران', month: 5, day: 12 },
      { title: 'روز جهانی بیمار', desc: 'حقوق بیمار', month: 8, day: 9 },
    ];

    console.log('[Seed] Creating calendar events...');
    for (const evt of events) {
      const date = `${currentYear}-${String(evt.month).padStart(2,'0')}-${String(evt.day).padStart(2,'0')}`;
      db.prepare(`
        INSERT INTO calendar_events (
          id, hospital_id, title, description, event_date,
          is_recurring, recurrence_rule, reminder_days_before
        ) VALUES (?, ?, ?, ?, ?, 1, 'yearly', 3)
      `).run(uuid(), hospitalId, evt.title, evt.desc, date);
      console.log(`   ✓ ${evt.title}`);
    }
    console.log('');

    console.log('[Seed] ✅ بیمارستان دو seeded successfully!\n');
    console.log('=== Login Credentials ===');
    console.log('Hospital Admin:');
    console.log('  URL: https://platform.ir/h2/login');
    console.log('  Username: hospital2_admin');
    console.log('  Password: Hospital2@Admin2026\n');
    console.log('QC Manager:');
    console.log('  Username: f.rezaei | Password: 123456\n');
    console.log('Nursing Director:');
    console.log('  Username: z.karimi | Password: 123456\n');
    console.log('Infection Control:');
    console.log('  Username: m.hosseini | Password: 123456\n');
    console.log('All staff: Password: 123456');
    console.log('========================================');

  } catch (err) {
    console.error('[Seed] ❌ Failed:', err);
    throw err;
  }
}

async function run() {
  await seedHospitalTwo();
  process.exit(0);
}

run();
