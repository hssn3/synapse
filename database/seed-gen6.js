/**
 * Generation 6 Accreditation Data
 * - Ranking system from 1403 (Gen 6)
 * - 62 hospital KPI indicators from Excel
 * Run after main seed: node database/seed-gen6.js
 */
const { query, getClient } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

// Gen 6 Ranking Tiers
const GEN6_RANKINGS = [
  { rank: 'excellent', title_fa: 'عالی', min_total: 85, min_safety: 80, condition: 'هیچ محوری کمتر از ۸۰ نباشد + ۵ مزیت منحصر به فرد' },
  { rank: 'superior', title_fa: 'برتر', min_total: 75, min_safety: 70, condition: 'هیچ محوری کمتر از ۷۰ نباشد + ۵ مزیت منحصر به فرد' },
  { rank: 'level_1', title_fa: 'سطح یک', min_total: 65, min_safety: 60, condition: 'عدم سوابق نظارتی موثر' },
  { rank: 'level_2', title_fa: 'سطح دو', min_total: 60, min_safety: 55, condition: 'عدم سوابق نظارتی موثر' },
  { rank: 'level_3', title_fa: 'سطح سه', min_total: 52, min_safety: 50, condition: 'عدم سوابق نظارتی موثر' },
  { rank: 'level_4', title_fa: 'سطح چهار', min_total: 48, min_safety: 50, condition: 'عدم سوابق نظارتی موثر' },
];

// 62 KPI Indicators from Excel (key subset with full definitions)
const KPI_INDICATORS = [
  { title: 'میزان سقوط بیمار', category: 'patient_safety', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: 0, definition: 'سقوط بیمار از تخت، برانکارد، صندلی یا در سرویس بهداشتی', numerator: 'تعداد موارد سقوط بیمار', denominator: 'کل بیماران بستری' },
  { title: 'نرخ مرگ و میر در اثر MI', category: 'patient_safety', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'بیماران با تشخیص MI که فوت شده‌اند', numerator: 'بیماران فوتی MI', denominator: 'کل بیماران بستری MI' },
  { title: 'میزان عوارض انتقال خون', category: 'patient_safety', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'علائم ناخواسته در حین یا ۲۴ ساعت پس از انتقال خون', numerator: 'موارد عارضه', denominator: 'کل انتقال خون' },
  { title: 'میزان جدا شدن زخم محل جراحی', category: 'patient_safety', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'تعداد موارد جدا شدن زخم محل جراحی', numerator: 'موارد جداشدن زخم', denominator: 'کل جراحی‌ها' },
  { title: 'میزان زخم بستر (فشاری)', category: 'patient_safety', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'بیماران بستری که دچار زخم بستر شده‌اند', numerator: 'بیماران با زخم بستر جدید', denominator: 'کل بیماران ترخیص شده' },
  { title: 'میزان عفونت زخم محل جراحی', category: 'patient_safety', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'بیماران با عفونت زخم محل عمل با کشت مثبت', numerator: 'موارد عفونت', denominator: 'کل جراحی‌ها' },
  { title: 'میزان عفونت بیمارستانی', category: 'infection_control', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'عفونت ۴۸-۷۲ ساعت بعد از پذیرش', numerator: 'موارد عفونت بیمارستانی', denominator: 'کل بیماران بستری' },
  { title: 'میزان عوارض بیهوشی', category: 'patient_safety', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'عوارض مراقبت‌های بیهوشی', numerator: 'موارد عارضه', denominator: 'کل بیهوشی‌ها' },
  { title: 'درصد CPR موفق در اورژانس', category: 'emergency', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'نسبت CPR موفق به کل CPR', numerator: 'CPR موفق', denominator: 'کل CPR' },
  { title: 'درصد CPR ناموفق در اورژانس', category: 'emergency', dimension: 'ایمنی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'نسبت CPR ناموفق به کل CPR', numerator: 'CPR ناموفق', denominator: 'کل CPR' },
  { title: 'درصد ترک بیماران با مسئولیت شخصی', category: 'emergency', dimension: 'رضایتمندی', type: 'پیامدی', aspect: 'بالینی', target: null, definition: 'بیمارانی که درمان را نیمه‌کاره رها می‌کنند', numerator: 'ترک با مسئولیت شخصی', denominator: 'کل بیماران بستری اورژانس' },
  { title: 'میانگین زمان انتظار برای اولین ویزیت (تریاژ ۱)', category: 'emergency', dimension: 'به‌موقع بودن', type: 'فرآیندی', aspect: 'بالینی', target: null, definition: 'زمان بین تریاژ پرستار و ویزیت پزشک', numerator: 'مجموع زمان انتظار', denominator: 'تعداد بیماران' },
  { title: 'میانه زمان خروج بیماران بستری اورژانس', category: 'emergency', dimension: 'به‌موقع بودن', type: 'فرآیندی', aspect: 'بالینی', target: null, definition: 'میانه زمان ماندگاری در اورژانس', numerator: 'زمان خروج - زمان ورود', denominator: 'تعداد بیماران' },
  { title: 'درصد خروج بیماران زیر ۱۲ ساعت از اورژانس', category: 'emergency', dimension: 'به‌موقع بودن', type: 'ساختاری', aspect: 'بالینی', target: null, definition: 'بیمارانی که ظرف ۱۲ ساعت تعیین تکلیف شده‌اند', numerator: 'خروج زیر ۱۲ ساعت', denominator: 'کل بیماران اورژانس' },
];

async function createKPITable() {
  console.log('[Gen6] Creating KPI table...');
  await query(`
    CREATE TABLE IF NOT EXISTS hospital_kpis (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      category VARCHAR(100),
      dimension VARCHAR(100),
      indicator_type VARCHAR(50),
      aspect VARCHAR(50),
      definition TEXT,
      numerator_description TEXT,
      denominator_description TEXT,
      target_value DECIMAL(10,2),
      upper_limit DECIMAL(10,2),
      lower_limit DECIMAL(10,2),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_kpis_hospital ON hospital_kpis(hospital_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_kpis_category ON hospital_kpis(category)');
  console.log('[Gen6] KPI table created');
}

async function createRankingTable() {
  console.log('[Gen6] Creating Gen6 ranking table...');
  await query(`
    CREATE TABLE IF NOT EXISTS gen6_rankings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rank_code VARCHAR(50) NOT NULL UNIQUE,
      rank_title_fa VARCHAR(100) NOT NULL,
      min_total_percent INT NOT NULL,
      min_safety_percent INT NOT NULL,
      special_conditions TEXT,
      created_at TIMESTAMP DEFAULT now()
    )
  `);

  // Seed rankings
  for (const r of GEN6_RANKINGS) {
    await query(
      `INSERT INTO gen6_rankings (rank_code, rank_title_fa, min_total_percent, min_safety_percent, special_conditions)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (rank_code) DO UPDATE SET min_total_percent = $3, min_safety_percent = $4, special_conditions = $5`,
      [r.rank, r.title_fa, r.min_total, r.min_safety, r.condition]
    );
  }
  console.log('[Gen6] Rankings seeded');
}

async function seedKPIs(hospitalId) {
  console.log('[Gen6] Seeding KPI indicators...');
  for (const kpi of KPI_INDICATORS) {
    await query(
      `INSERT INTO hospital_kpis (hospital_id, title, category, dimension, indicator_type, aspect, definition, numerator_description, denominator_description, target_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [hospitalId, kpi.title, kpi.category, kpi.dimension, kpi.type, kpi.aspect, kpi.definition, kpi.numerator, kpi.denominator, kpi.target]
    );
  }
  console.log(`[Gen6] ${KPI_INDICATORS.length} KPI indicators seeded`);
}

async function run() {
  console.log('========================================');
  console.log('  Gen 6 Accreditation Seed');
  console.log('========================================\n');

  try {
    await createKPITable();
    await createRankingTable();

    const hospitalRes = await query('SELECT id FROM hospitals LIMIT 1');
    if (hospitalRes.rows.length === 0) {
      console.error('[Gen6] No hospital found. Run main seed first.');
      process.exit(1);
    }
    const hospitalId = hospitalRes.rows[0].id;
    await seedKPIs(hospitalId);

    console.log('\n[Gen6] ✅ Gen 6 data seeded successfully!');
  } catch (err) {
    console.error('\n[Gen6] ❌ Seeding failed:', err);
    process.exit(1);
  }
  process.exit(0);
}

run();
