/**
 * داده‌ی نمایشی هفت‌ماهه با دو بار جابه‌جایی متصدی هر سمت
 *
 * خواسته‌ی کارفرما: «از اول بهمن پارسال تا اول شهریور داده بساز… این وسط نفر هر
 * سمت دو بار عوض کن که نشون بده نفر هر سمت عوض بشه کار ادامه پیدا می‌کنه.»
 * (بازه قبلاً از اول اسفند بود؛ یک ماه به عقب، از اول بهمن، کشیده شد.)
 *
 * بازه: ۱۴۰۴/۱۱/۰۱ (۲۰۲۶-۰۱-۲۱) تا ۱۴۰۵/۰۶/۰۱ (۲۰۲۶-۰۸-۲۳) — ۲۱۴ روز.
 *
 * چیزی که این داده باید *ثابت* کند این است که کار به آدم گره نخورده. پس صرفاً
 * چند رکورد پراکنده نمی‌سازد؛ هر رکورد به **کسی نسبت داده می‌شود که در همان
 * تاریخ متصدی آن سمت بوده**. نتیجه‌اش این است که وقتی کارفرما یک سنجه را باز
 * می‌کند می‌بیند بهمن را نفر اول ثبت کرده، اردیبهشت را نفر دوم، تیر را نفر سوم —
 * و هیچ گسستی در کار نیست.
 *
 * هر سمت سه بازه‌ی تصدی می‌گیرد (یعنی دو جابه‌جایی)، تقریباً مساوی روی کل بازه:
 *   بازه‌ی ۱: ۲۰۲۶-۰۱-۲۱ … ۲۰۲۶-۰۴-۰۱   (متصدی قبلی — کاربر غیرفعال)
 *   بازه‌ی ۲: ۲۰۲۶-۰۴-۰۲ … ۲۰۲۶-۰۶-۱۱   (متصدی میانی — کاربر غیرفعال)
 *   بازه‌ی ۳: ۲۰۲۶-۰۶-۱۲ … تاکنون        (متصدی فعلی — همان کاربر موجود)
 *
 * متصدی‌های قبلی به‌عنوان کاربر «غیرفعال» ساخته می‌شوند: نه در فهرست ورود
 * می‌آیند و نه می‌شود با آن‌ها وارد شد، ولی کارِ ثبت‌شده‌شان سرِ جایش می‌ماند —
 * دقیقاً همان چیزی که تصدی سمت‌ها برای آن ساخته شد.
 *
 * idempotent: با نشانه‌گذاری روی username متصدی‌های ساختگی، اجرای دوباره چیزی
 * تکراری نمی‌سازد.
 */
const { db, query } = require('../src/config/database-sqlite');
const { uuid } = require('../src/utils/db');

const START = '2026-01-21';   // ۱۴۰۴/۱۱/۰۱
const END   = '2026-08-23';   // ۱۴۰۵/۰۶/۰۱

// مرز بازه‌های تصدی — سه بخشِ تقریباً مساوی روی کل بازه‌ی ۲۱۴ روزه
const SEG = [
  { from: '2026-01-21', to: '2026-04-01' },
  { from: '2026-04-02', to: '2026-06-11' },
  { from: '2026-06-12', to: null },
];

// سمت‌هایی که جابه‌جایی برایشان معنا دارد. پرستارها (۱۸ نفر) عمداً نیستند:
// جابه‌جایی یک پرستار داستانی برای کارفرما ندارد، جابه‌جایی مترون دارد.
const ROLES = [
  'hospital_president', 'admin', 'accreditation_manager', 'nursing_director',
  'quality_control_manager', 'education_supervisor', 'infection_control_supervisor',
  'technical_officer', 'clinical_supervisor', 'environmental_health_officer', 'hr_manager',
];

// accreditation_sections.responsible_role دیگر واژگان جدای خودش را ندارد —
// database/migrate-roles.js همان کدهای واقعی جدول roles را می‌نویسد (رفع شد:
// قبلاً 'quality_manager'/'env_health'/... می‌نوشت که هیچ نقشی با آن کد وجود
// نداشت). پس اینجا دیگر نیازی به نگاشتِ ترجمه نیست؛ roleCode مستقیماً همان
// چیزی است که در responsible_role نشسته.

// نامِ متصدی‌های قبلی — هم‌سبک با همان الگوی «خانم/آقای {عنوان سمت} شماره N» که
// بقیه‌ی کاربرهای نمونه در این سامانه دارند (مثلاً «سوپروایزر بالینی شماره یک»).
const ORDINAL_FA = ['یک', 'دو'];

const MARK = 'prev';   // نشانه در username تا دوباره ساخته نشوند

function dateIn(from, to) {
  const a = new Date(from).getTime();
  const b = new Date(to || END).getTime();
  return new Date(a + Math.floor((b - a) * 0.45)).toISOString().slice(0, 10);
}

function runMigration() {
  console.log('[Seed SixMonth] Starting...');
  try {
    const hosp = query('SELECT id, name FROM hospitals ORDER BY created_at LIMIT 1').rows[0];
    if (!hosp) { console.log('[Seed SixMonth] بیمارستانی وجود ندارد — رد شد'); return; }

    let usersMade = 0, tenuresMade = 0, measuresTouched = 0, activitiesMade = 0;

    const tx = db.transaction(() => {
      for (const roleCode of ROLES) {
        const role = query('SELECT id, title_fa FROM roles WHERE code = ? LIMIT 1', [roleCode]).rows[0];
        if (!role) continue;
        const current = query(
          `SELECT id, full_name FROM users
           WHERE hospital_id = ? AND role_id = ? AND is_active = 1
             AND username NOT LIKE ? ORDER BY created_at LIMIT 1`,
          [hosp.id, role.id, `%.${MARK}%`]).rows[0];
        if (!current) continue;

        // --- متصدی‌های پیشین ---
        const holders = [];
        for (let i = 0; i < 2; i++) {
          const uname = `${roleCode}.${MARK}${i + 1}`;
          const fullName = `خانم/آقای ${role.title_fa} شماره ${ORDINAL_FA[i]}`;
          let u = query('SELECT id FROM users WHERE username = ? AND hospital_id = ?',
            [uname, hosp.id]).rows[0];
          if (!u) {
            const id = uuid();
            query(
              `INSERT INTO users (id, hospital_id, full_name, username, password_hash,
                                  role_id, is_active, created_at)
               VALUES (?, ?, ?, ?, '', ?, 0, ?)`,
              [id, hosp.id, fullName, uname, role.id, SEG[i].from + 'T08:00:00.000Z']);
            u = { id };
            usersMade++;
          } else {
            // اجراهای قبلی این اسکریپت نامِ قدیمی («متصدی پیشین/میانی») را ساخته بودند؛
            // با نام تازه هماهنگ می‌شود تا دیتابیس‌های قبلاً seed‌شده هم به‌روز شوند.
            query('UPDATE users SET full_name = ? WHERE id = ?', [fullName, u.id]);
          }
          holders.push(u.id);
        }
        holders.push(current.id);   // متصدی فعلی، بازه‌ی سوم

        // --- بازه‌های تصدی ---
// idempotency واقعی (اصلاح ۲۰۲۶-۰۹-۲۹): قبلاً در هر بوت همه‌ی ردیف‌های این
// بازه حذف و دوباره درج می‌شد و هر ری‌استارت ۳۳+ ردیف به سطل بازیافت می‌افزود.
// حالا فقط وقتی حذف+درج می‌شود که دادهٔ موجود با الگوی مورد انتظار فرق داشته باشد،
// و حذف صرفاً روی ردیف‌های «خودِ همین seed» (با note نشانه‌گذاری‌شده) انجام می‌شود —
// ردیف‌های «ثبت خودکار» که seed-tenure-and-editors برای سایر کاربران همان سمت می‌سازد
// نباید هر بوت پاک و بازساخته شوند (علت واقعی نوسان سطل بازیافت).
const intendedTenures = SEG.map((seg, i) => ({ user_id: holders[i], started_on: seg.from, ended_on: seg.to, role_id: role.id, role_title: role.title_fa }));
const existingTenures = query(
  'SELECT user_id, started_on, ended_on, role_id, role_title FROM role_tenures WHERE hospital_id = ? AND role_code = ? AND started_on >= ? AND note IN (\'پایان تصدی — تحویل به نفر بعد\', \'متصدی فعلی\')',
  [hosp.id, roleCode, START]).rows.map(r => ({ user_id: r.user_id, started_on: r.started_on, ended_on: r.ended_on, role_id: r.role_id, role_title: r.role_title }));
const tenuresKey = list => JSON.stringify(list.map(x => [x.user_id, x.started_on, x.ended_on, x.role_id, x.role_title]).sort());
if (tenuresKey(intendedTenures) !== tenuresKey(existingTenures)) {
  query('DELETE FROM role_tenures WHERE hospital_id = ? AND role_code = ? AND started_on >= ? AND note IN (\'پایان تصدی — تحویل به نفر بعد\', \'متصدی فعلی\')',
    [hosp.id, roleCode, START]);
  SEG.forEach((seg, i) => {
    query(
      `INSERT INTO role_tenures (id, hospital_id, user_id, role_id, role_code, role_title,
                                 started_on, ended_on, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), hosp.id, holders[i], role.id, roleCode, role.title_fa,
       seg.from, seg.to, i < 2 ? 'پایان تصدی — تحویل به نفر بعد' : 'متصدی فعلی']);
    tenuresMade++;
  });
}

        // --- کارِ ثبت‌شده، پخش‌شده روی هر سه بازه ---
        // سنجه‌های همین سمت را برمی‌داریم و بازبینی‌شان را بین سه متصدی تقسیم
        // می‌کنیم؛ تاریخ بازبینی داخل بازه‌ی خودِ همان متصدی می‌افتد.
        const measures = query(
          `SELECT id FROM accreditation_sections
           WHERE level_type = 'measure' AND responsible_role = ? ORDER BY code`,
          [roleCode]).rows;
        measures.forEach((m, idx) => {
          const seg = idx % 3;
          query(
            `UPDATE measure_status SET last_reviewed_by = ?, last_reviewed_at = ?
             WHERE hospital_id = ? AND measure_id = ?`,
            [holders[seg], dateIn(SEG[seg].from, SEG[seg].to) + 'T09:30:00.000Z',
             hosp.id, m.id]);
          measuresTouched++;
        });

        // --- فعالیت ماهانه‌ی هر متصدی در بازه‌ی خودش ---
        const atype = query('SELECT id FROM activity_types WHERE hospital_id = ? LIMIT 1',
          [hosp.id]).rows[0];
        if (atype) {
          SEG.forEach((seg, i) => {
            const when = dateIn(seg.from, seg.to);
            const exists = query(
              `SELECT id FROM activity_records
               WHERE hospital_id = ? AND recorded_by = ? AND date(occurred_at) = date(?)`,
              [hosp.id, holders[i], when]).rows[0];
            if (exists) return;
            query(
              `INSERT INTO activity_records (id, hospital_id, activity_type_id, recorded_by,
                                             department, form_data, status, occurred_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
              [uuid(), hosp.id, atype.id, holders[i], role.title_fa,
               JSON.stringify({ شرح: `فعالیت دوره‌ای ${role.title_fa} در بازه‌ی تصدی` }),
               when + 'T10:00:00.000Z', when + 'T10:00:00.000Z']);
            activitiesMade++;
          });
        }
      }
    });
    tx();

    console.log(`[Seed SixMonth] ✅ ${ROLES.length} سمت | ${usersMade} متصدی پیشین ساخته شد | ` +
      `${tenuresMade} بازه‌ی تصدی | ${measuresTouched} سنجه بازتوزیع شد | ${activitiesMade} فعالیت`);
  } catch (err) {
    console.error('[Seed SixMonth] ❌ Failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}
module.exports = { runMigration, START, END, SEG, ROLES };
