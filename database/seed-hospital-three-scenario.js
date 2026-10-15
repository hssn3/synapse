/**
 * Migration + Seed: سناریوی کامل «بیمارستان سوم» — بیمارستان خصوصی ۱۱۵ تخته با نمودار سازمانی
 * کامل و اعتباربخشی پُر شده از ابتدای سال ۱۴۰۵.
 *
 * طبق تصمیم صریح کاربر، برای همه‌ی سمت‌ها (ریاست/مدیران/سوپروایزرها/سرپرستاران) از اسم واقعی یا
 * جعلیِ شخص استفاده نمی‌شود — فقط برچسبِ سمت + شماره‌ی بیمارستان («ریاست بیمارستان شماره سه»)
 * و برای سمت‌های دارای جنسیت پیشوند «خانم/آقای» (تا وقتی جنسیت واقعی فرد از پروفایل شخصی‌اش —
 * database/seed-user-profile-fields.js — تعیین شود، جایگزین این پیشوند شود).
 *
 * این migration:
 *  ۱) اگر «بیمارستان سوم» وجود ندارد، دقیقاً با همان ستون‌هایی که POST /hospitals در
 *     src/routes/super.js پر می‌کند می‌سازد، و سپس migration های پایه‌ای هر بیمارستان را
 *     (کمیته‌ها، ساختار سازمانی، سلسله‌مراتب پرستاری/مدیریت، پست‌های نمودار سازمانی) صدا می‌زند.
 *  ۲) یک ادمین («ادمین بیمارستان سوم» / hospital3_admin) می‌سازد.
 *  ۳) نمودار سازمانی (مدیریت/سوپروایزرهای پرستاری/بخش‌ها) را با برچسب‌های عمومی پر می‌کند —
 *     ۹ پست مدیریتی (شامل مدیر حسابداری)، ۶ سوپروایزر بالینی، و ۱۲ بخش بستری مطابق یک
 *     بیمارستان خصوصی ۱۱۵ تخته.
 *  ۴) از ۱ فروردین ۱۴۰۵ تا امروز (به‌وقت تهران) را با مدارک کنترل‌شده، صورت‌جلسه‌ی چند کمیته،
 *     و وضعیتِ همه‌ی سنجه‌های اعتباربخشی (نه فقط نمونه) پر می‌کند.
 *
 * Idempotent: هر بخش پیش از insert چک می‌کند. اجرای دوباره باید صفر ردیف تازه اضافه کند.
 * Persian text فقط از همین فایل .js (Write) می‌آید، هرگز از آرگومان shell.
 *
 * Run: node database/seed-hospital-three-scenario.js (یا خودکار روی هر boot، در src/app.js).
 */
const { db } = require('../src/config/database-sqlite');
const bcrypt = require('bcryptjs');
const config = require('../src/config/app');
const crypto = require('crypto');
const { tehranNow, tehranTodayStr, jalaliYearRange } = require('../src/config/jalali');
const uid = () => crypto.randomUUID();

const HOSPITAL_NAME = 'بیمارستان نمونه شماره یک';
const OLD_HOSPITAL_NAMES = ['بیمارستان سوم'];  // نام‌های پیشین، برای تغییرنام دیتابیس‌های موجود
const HOSPITAL_ORD = 'یک'; // برای برچسب‌های عمومی «... بیمارستان شماره یک»
const ADMIN_USERNAME = 'hospital3_admin';
const ADMIN_PASSWORD = 'Hospital3@Admin2026';
const PERIOD_JYEAR = 1405;

// ---------- بازه‌ی زمانی سناریو: ۱ فروردین ۱۴۰۵ تا امروز ----------
const PERIOD_START = jalaliYearRange(PERIOD_JYEAR).start; // YYYY-MM-DD میلادی
const TODAY = tehranTodayStr();
function daysBetween(aISO, bISO) {
  return Math.round((new Date(bISO + 'T00:00:00Z') - new Date(aISO + 'T00:00:00Z')) / 86400000);
}
const SPAN_DAYS = Math.max(daysBetween(PERIOD_START, TODAY), 1);
function addDays(aISO, n) {
  const d = new Date(aISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// نقطه‌ای در بازه‌ی سناریو بر اساس کسر ۰..۱ (۰=ابتدای سال، ۱=امروز)
function dateAtFraction(f) {
  return addDays(PERIOD_START, Math.round(Math.min(Math.max(f, 0), 1) * SPAN_DAYS));
}

function getRoleId(code) {
  const r = db.prepare('SELECT id FROM roles WHERE code = ? AND hospital_id IS NULL').get(code);
  if (!r) throw new Error(`role not found: ${code}`);
  return r.id;
}

function createGenericUser(hospitalId, label, username, roleId, department) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return existing.id;
  const id = uid();
  const hash = bcrypt.hashSync('Demo@2026', config.bcrypt.rounds);
  db.prepare(`INSERT INTO users (id, hospital_id, full_name, username, password_hash, role_id, department, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run(id, hospitalId, label, username, hash, roleId, department);
  return id;
}

// اجرای قبلی این فایل ممکن است سمت‌ها را با نسخه‌ی قدیمیِ برچسب (بدون «شماره سه» / پیشوند
// جنسیت) پر کرده باشد. چون کاربرهای این سناریو همیشه با پیشوند نام‌کاربری «h3.» ساخته می‌شوند
// (نه یک حساب واقعی که ادمین دستی متصل کرده)، امن است که نامشان را به برچسب تازه به‌روز کنیم.
function renameIfGeneric(userId, newLabel) {
  const u = db.prepare('SELECT username, full_name FROM users WHERE id = ?').get(userId);
  if (u && u.username && u.username.startsWith('h3.') && u.full_name !== newLabel) {
    db.prepare(`UPDATE users SET full_name = ?, updated_at = datetime('now') WHERE id = ?`).run(newLabel, userId);
  }
}

// ---------- ۱) ساخت بیمارستان (دقیقاً هم‌شکل POST /hospitals در super.js) ----------
function getOrCreateHospital() {
  // دیتابیس‌هایی که با نام قدیمی («بیمارستان سوم») ساخته شده‌اند تغییرنام می‌گیرند، نه
  // اینکه یک بیمارستان دومِ تکراری کنارشان ساخته شود.
  for (const oldName of OLD_HOSPITAL_NAMES) {
    const old = db.prepare('SELECT id FROM hospitals WHERE name = ?').get(oldName);
    if (old && !db.prepare('SELECT id FROM hospitals WHERE name = ?').get(HOSPITAL_NAME)) {
      db.prepare('UPDATE hospitals SET name = ? WHERE id = ?').run(HOSPITAL_NAME, old.id);
      console.log(`[Seed HospitalThreeScenario] نام بیمارستان از «${oldName}» به «${HOSPITAL_NAME}» تغییر کرد`);
    }
  }
  const existing = db.prepare('SELECT id FROM hospitals WHERE name = ?').get(HOSPITAL_NAME);
  if (existing) return { id: existing.id, created: false };
  const superAdmin = db.prepare('SELECT id FROM super_admins LIMIT 1').get();
  const id = uid();
  db.prepare(`INSERT INTO hospitals (id, name, subdomain, is_active, created_by_super_admin, subscription_status)
     VALUES (?, ?, ?, 1, ?, 'active')`)
    .run(id, HOSPITAL_NAME, 'h3', superAdmin ? superAdmin.id : null);
  return { id, created: true };
}

function seedBaseInfra(hospitalId) {
  const steps = [
    'seed-committees', 'seed-org-structure', 'seed-org-divisions',
    'seed-nursing-hierarchy', 'seed-management-hierarchy', 'seed-org-chart-positions',
  ];
  for (const s of steps) {
    try { require(`./${s}`).runMigration(); }
    catch (e) { console.error(`[Seed HospitalThreeScenario] ${s} failed:`, e.message); }
  }
  try { require('./seed-examples').seedHospital(hospitalId); }
  catch (e) { console.error('[Seed HospitalThreeScenario] seed-examples failed:', e.message); }
}

// ---------- ۲) ادمین بیمارستان ----------
function seedAdmin(hospitalId) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME);
  if (existing) return { id: existing.id, created: false };
  const role = db.prepare("SELECT id FROM roles WHERE code = 'admin' AND hospital_id IS NULL").get();
  if (!role) throw new Error('نقش ادمین یافت نشد');
  const id = uid();
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, config.bcrypt.rounds);
  db.prepare(`INSERT INTO users (id, hospital_id, full_name, username, password_hash, role_id, department, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
    .run(id, hospitalId, `ادمین ${HOSPITAL_NAME}`, ADMIN_USERNAME, hash, role.id, 'مدیریت');
  db.prepare('UPDATE hospitals SET admin_user_id = ? WHERE id = ? AND admin_user_id IS NULL').run(id, hospitalId);
  return { id, created: true };
}

// ---------- ۳) نمودار سازمانی — فقط برچسب‌های عمومیِ سمت + شماره‌ی بیمارستان ----------
// «ریاست بیمارستان» بدون پیشوند جنسیتی (عنوانِ نهاد)؛ بقیه با پیشوند «خانم/آقای» چون شخص‌محورند.
const MGMT_GENERIC = {
  'ریاست بیمارستان': `ریاست بیمارستان شماره ${HOSPITAL_ORD}`,
  'مدیر بهبود کیفیت': `خانم/آقای مدیر بهبود کیفیت بیمارستان شماره ${HOSPITAL_ORD}`,
  'مسئول فنی': `خانم/آقای مسئول فنی بیمارستان شماره ${HOSPITAL_ORD}`,
  'مدیر مالی': `خانم/آقای مدیر مالی بیمارستان شماره ${HOSPITAL_ORD}`,
  'مدیر حسابداری': `خانم/آقای مدیر حسابداری بیمارستان شماره ${HOSPITAL_ORD}`,
  'مدیر اعتباربخشی': `خانم/آقای مدیر اعتباربخشی بیمارستان شماره ${HOSPITAL_ORD}`,
  'مدیر منابع انسانی': `خانم/آقای مدیر منابع انسانی بیمارستان شماره ${HOSPITAL_ORD}`,
  'مدیر تغذیه': `خانم/آقای مدیر تغذیه بیمارستان شماره ${HOSPITAL_ORD}`,
  'مسئول بهداشت حرفه‌ای': `خانم/آقای مسئول بهداشت حرفه‌ای بیمارستان شماره ${HOSPITAL_ORD}`,
  'مسئول بهداشت محیط': `خانم/آقای مسئول بهداشت محیط بیمارستان شماره ${HOSPITAL_ORD}`,
};

function seedManagementGeneric(hospitalId) {
  const staffNurseRole = getRoleId('staff_nurse');
  const qcRole = getRoleId('quality_control_manager');
  const slots = db.prepare('SELECT * FROM management_position_slots WHERE hospital_id = ?').all(hospitalId);
  let filled = 0;
  let n = 1;
  for (const slot of slots) {
    const label = MGMT_GENERIC[slot.label] || `خانم/آقای ${slot.label} بیمارستان شماره ${HOSPITAL_ORD}`;
    if (slot.user_id) { renameIfGeneric(slot.user_id, label); continue; }
    const roleId = slot.label === 'مدیر بهبود کیفیت' ? qcRole : staffNurseRole;
    const username = 'h3.mgmt' + (n++) + '.' + Math.abs(hashCode(slot.label)).toString(36).slice(0, 5);
    const userId = createGenericUser(hospitalId, label, username, roleId, 'مدیریت');
    db.prepare(`UPDATE management_position_slots SET user_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, slot.id);
    filled++;
  }
  return filled;
}

const FA_ORD = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'شش'];
function seedSupervisorsGeneric(hospitalId) {
  const roleId = getRoleId('clinical_supervisor');
  let slots = db.prepare('SELECT * FROM nursing_supervisor_slots WHERE hospital_id = ? ORDER BY sort_order').all(hospitalId);
  const maxOrder = slots.reduce((m, s) => Math.max(m, s.sort_order || 0), 0);
  let order = maxOrder;
  const insSlot = db.prepare('INSERT INTO nursing_supervisor_slots (id, hospital_id, label, sort_order) VALUES (?, ?, ?, ?)');
  while (slots.length < FA_ORD.length) {
    order += 1;
    const id = uid();
    insSlot.run(id, hospitalId, `سوپروایزر بالینی شماره ${FA_ORD[slots.length]}`, order);
    slots.push(db.prepare('SELECT * FROM nursing_supervisor_slots WHERE id = ?').get(id));
  }
  // اصلاح یک خرابیِ داده‌ی قبلی: بعضی اسلات‌ها user_id داشتند ولی به کاربری با
  // نقشی غیر از clinical_supervisor اشاره می‌کردند (مثلاً حساب ادمین) — احتمالاً
  // از دوره‌ای که این اسلات‌ها دستی/موقت پر شده بودند. چنین اسلاتی از دید این
  // تابع «هنوز پر نشده» حساب می‌شود تا با کاربر واقعیِ سوپروایزر جایگزین شود.
  const userHasRole = (userId) => {
    if (!userId) return false;
    const u = db.prepare('SELECT role_id FROM users WHERE id = ?').get(userId);
    return !!u && u.role_id === roleId;
  };
  let filled = 0, idx = 0;
  for (const slot of slots.slice(0, FA_ORD.length)) {
    const label = `خانم/آقای سوپروایزر بالینی شماره ${FA_ORD[idx]} بیمارستان شماره ${HOSPITAL_ORD}`;
    if (slot.user_id && userHasRole(slot.user_id)) { renameIfGeneric(slot.user_id, label); idx++; continue; }
    const username = 'h3.sup' + (idx + 1);
    idx++;
    const userId = createGenericUser(hospitalId, label, username, roleId, 'پرستاری');
    db.prepare(`UPDATE nursing_supervisor_slots SET user_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, slot.id);
    filled++;
  }
  return filled;
}

// بخش‌های بستری یک بیمارستان خصوصی ۱۱۵ تخته — طیف عمومی/جراحی/فوق‌تخصصی رایج
const WARD_GENERIC = [
  { title: 'اورژانس', icon: '🚑', hasDeputy: true },
  { title: 'مراقبت‌های ویژه (ICU)', icon: '🫀', hasDeputy: true },
  { title: 'قلب (CCU)', icon: '❤️', hasDeputy: false },
  { title: 'جراحی عمومی', icon: '🔪', hasDeputy: true },
  { title: 'داخلی', icon: '🩺', hasDeputy: false },
  { title: 'اطفال', icon: '🧸', hasDeputy: true },
  { title: 'زنان و زایمان', icon: '🤱', hasDeputy: false },
  { title: 'ارتوپدی', icon: '🦴', hasDeputy: false },
  { title: 'اتاق عمل', icon: '⚕️', hasDeputy: true },
  { title: 'ریکاوری (بعد از عمل)', icon: '🛏️', hasDeputy: false },
  { title: 'دیالیز', icon: '🩸', hasDeputy: false },
  { title: 'مراقبت‌های ویژه نوزادان (NICU)', icon: '👶', hasDeputy: true },
];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h;
}

function seedWardsGeneric(hospitalId) {
  const roleId = getRoleId('staff_nurse');
  let wards = db.prepare('SELECT * FROM nursing_wards WHERE hospital_id = ? ORDER BY sort_order').all(hospitalId);
  const existingTitles = new Set(wards.map(w => w.title));
  const maxOrder = wards.reduce((m, w) => Math.max(m, w.sort_order || 0), 0);
  let order = maxOrder;
  const insWard = db.prepare('INSERT INTO nursing_wards (id, hospital_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)');
  for (const cand of WARD_GENERIC) {
    if (existingTitles.has(cand.title)) continue;
    order += 1;
    const id = uid();
    insWard.run(id, hospitalId, cand.title, cand.icon, order);
    wards.push(db.prepare('SELECT * FROM nursing_wards WHERE id = ?').get(id));
  }
  let filledHead = 0, filledDep = 0;
  for (const ward of wards) {
    const cand = WARD_GENERIC.find(c => c.title === ward.title);
    if (!cand) continue;
    const headLabel = `خانم/آقای سرپرستار بخش ${ward.title} بیمارستان شماره ${HOSPITAL_ORD}`;
    if (ward.head_nurse_id) {
      renameIfGeneric(ward.head_nurse_id, headLabel);
    } else {
      const uname = 'h3.wh.' + Math.abs(hashCode(ward.title)).toString(36).slice(0, 8);
      const userId = createGenericUser(hospitalId, headLabel, uname, roleId, 'پرستاری - ' + ward.title);
      db.prepare(`UPDATE nursing_wards SET head_nurse_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, ward.id);
      filledHead++;
    }
    if (cand.hasDeputy) {
      const depLabel = `خانم/آقای جانشین سرپرستار بخش ${ward.title} بیمارستان شماره ${HOSPITAL_ORD}`;
      if (ward.deputy1_id) {
        renameIfGeneric(ward.deputy1_id, depLabel);
      } else {
        const uname = 'h3.wd.' + Math.abs(hashCode(ward.title)).toString(36).slice(0, 8);
        const userId = createGenericUser(hospitalId, depLabel, uname, roleId, 'پرستاری - ' + ward.title);
        db.prepare(`UPDATE nursing_wards SET deputy1_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, ward.id);
        filledDep++;
      }
    }
  }
  return { filledHead, filledDep, total: wards.length };
}

// ---------- ۴) پروفایل بیمارستان + دوره‌ی اعتباربخشی (سال ۱۴۰۵) ----------
function seedProfile(hospitalId) {
  const existing = db.prepare('SELECT hospital_id FROM hospital_profiles WHERE hospital_id = ?').get(hospitalId);
  const ceoName = MGMT_GENERIC['ریاست بیمارستان'];
  const qmName = MGMT_GENERIC['مدیر بهبود کیفیت'];
  if (existing) {
    // اگر قبلاً با نسخه‌ی قدیمی (عمومی/۱۸۰ تخت) ساخته شده، به مشخصات درخواست‌شده به‌روزش می‌کنیم
    db.prepare(`UPDATE hospital_profiles SET hospital_type = ?, beds_count = ?, ceo_name = ?, quality_manager_name = ?, updated_at = datetime('now')
      WHERE hospital_id = ?`).run('خصوصی', 115, ceoName, qmName, hospitalId);
    return 0;
  }
  db.prepare(`INSERT INTO hospital_profiles
    (hospital_id, hospital_type, beds_count, province, city, ceo_name, quality_manager_name, phone, established_year, website, completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .run(hospitalId, 'خصوصی', 115, 'تهران', 'تهران', ceoName, qmName, '۰۲۱-۸۸۷۷۶۶۵۵', 1390, null);
  return 1;
}

// start_year هم پر می‌شود، نه فقط start_date: راهنمای مسیر و دستیار هوشمند
// (src/services/guide-timeline.js و assistant.js) مبنای برنامه‌ریزی‌شان همین ستون است و
// اگر خالی بماند هر دو برای این بیمارستان خاموش می‌مانند («هنوز برنامه‌ریزی شروع نشده»)
// — یعنی دقیقاً روی بیمارستانِ نمونه، شاخص‌ترین قابلیت محصول دیده نمی‌شد.
// ستون با seed-guide-timeline.js اضافه می‌شود که ممکن است بعد از این فایل اجرا شود، پس
// اینجا وجودش چک می‌شود و در صورت نبود، همان‌جا ساخته می‌شود.
function ensureStartYearColumn() {
  const cols = db.prepare('PRAGMA table_info(accreditation_periods)').all().map(c => c.name);
  if (!cols.includes('start_year')) {
    db.prepare('ALTER TABLE accreditation_periods ADD COLUMN start_year INTEGER').run();
  }
}

function seedAccreditationPeriod(hospitalId, adminUserId) {
  ensureStartYearColumn();
  const existing = db.prepare('SELECT id FROM accreditation_periods WHERE hospital_id = ?').get(hospitalId);
  const range = jalaliYearRange(PERIOD_JYEAR);
  const note = `دوره‌ی اعتباربخشی سال ${PERIOD_JYEAR} — تکمیل‌شده از ابتدای سال برای ${HOSPITAL_NAME}`;
  if (existing) {
    db.prepare(`UPDATE accreditation_periods SET title = ?, start_date = ?, end_date = ?, note = ?, start_year = ? WHERE id = ?`)
      .run(`دوره‌ی ارزیابی اعتباربخشی سال ${PERIOD_JYEAR}`, range.start, range.end, note, PERIOD_JYEAR, existing.id);
    return 0;
  }
  db.prepare(`INSERT INTO accreditation_periods (id, hospital_id, title, start_date, end_date, note, is_active, created_by, start_year)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`)
    .run(uid(), hospitalId, `دوره‌ی ارزیابی اعتباربخشی سال ${PERIOD_JYEAR}`, range.start, range.end,
      note, adminUserId, PERIOD_JYEAR);
  return 1;
}

// ---------- ۵) مدارک کنترل‌شده (خط‌مشی/روش‌اجرایی/دستورالعمل) — پخش‌شده در بازه‌ی ۱۴۰۵ ----------
const DOCS = [
  { type: 'policy', title: 'خط‌مشی پذیرش و ترخیص بیمار', code: 'POL-H3-001', respLabel: 'مدیر بهبود کیفیت', frac: 0.05 },
  { type: 'policy', title: 'خط‌مشی کنترل عفونت بیمارستانی', code: 'POL-H3-002', respLabel: 'سرپرستار بخش مراقبت‌های ویژه (ICU)', frac: 0.15 },
  { type: 'policy', title: 'خط‌مشی مدیریت دارو و تجهیزات پزشکی', code: 'POL-H3-003', respLabel: 'مسئول فنی', frac: 0.22 },
  { type: 'policy', title: 'خط‌مشی ایمنی بیمار و پیشگیری از سقوط', code: 'POL-H3-004', respLabel: 'مدیر بهبود کیفیت', frac: 0.30 },
  { type: 'policy', title: 'خط‌مشی مدیریت مالی و حسابداری', code: 'POL-H3-005', respLabel: 'مدیر حسابداری', frac: 0.35 },
  { type: 'procedure', title: 'روش اجرایی گزارش خطای پزشکی', code: 'PRO-H3-001', respLabel: 'سوپروایزر بالینی شماره یک', frac: 0.42 },
  { type: 'procedure', title: 'روش اجرایی تریاژ اورژانس', code: 'PRO-H3-002', respLabel: 'سرپرستار بخش اورژانس', frac: 0.50 },
  { type: 'procedure', title: 'روش اجرایی پذیرش اتاق عمل', code: 'PRO-H3-003', respLabel: 'سرپرستار بخش اتاق عمل', frac: 0.58 },
  { type: 'instruction', title: 'دستورالعمل شستشوی دست و بهداشت فردی', code: 'INS-H3-001', respLabel: 'سوپروایزر بالینی شماره دو', frac: 0.66 },
  { type: 'instruction', title: 'دستورالعمل مراقبت از نوزاد در NICU', code: 'INS-H3-002', respLabel: 'سرپرستار بخش مراقبت‌های ویژه نوزادان (NICU)', frac: 0.74 },
  { type: 'instruction', title: 'دستورالعمل مدیریت پسماند بیمارستانی', code: 'INS-H3-003', respLabel: 'مسئول بهداشت محیط', frac: 0.85 },
  { type: 'instruction', title: 'دستورالعمل ایمنی و بهداشت شغلی کارکنان', code: 'INS-H3-004', respLabel: 'مسئول بهداشت حرفه‌ای', frac: 0.95 },
];

function respName(label) {
  return `خانم/آقای ${label} بیمارستان شماره ${HOSPITAL_ORD}`;
}

function seedDocuments(hospitalId, adminUserId) {
  let inserted = 0;
  for (const d of DOCS) {
    const issueDate = dateAtFraction(d.frac);
    const existing = db.prepare('SELECT id FROM controlled_documents WHERE hospital_id = ? AND doc_code = ?').get(hospitalId, d.code);
    if (existing) {
      // اجرای قبلی همین سناریو ممکن است این سند را با تاریخ/مسئولِ فرمت قدیمی ساخته باشد؛ به‌روزش می‌کنیم
      db.prepare(`UPDATE controlled_documents SET issue_date = ?, last_review_date = ?, prepared_date = ?, responsible_person = ?, updated_by = ?
        WHERE id = ?`).run(issueDate, issueDate, issueDate, respName(d.respLabel), adminUserId, existing.id);
      continue;
    }
    db.prepare(`INSERT INTO controlled_documents
      (id, hospital_id, doc_type, title, doc_code, decree_text, issue_date, last_review_date, prepared_date,
       purpose, scope, responsible_person, status, version_no, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, ?, ?)`)
      .run(uid(), hospitalId, d.type, d.title, d.code, `مصوب کمیته اعتباربخشی ${HOSPITAL_NAME}`,
        issueDate, issueDate, issueDate,
        'تدوین رویه‌ی استاندارد جهت رعایت الزامات اعتباربخشی', `کلیه واحدهای ${HOSPITAL_NAME}`,
        respName(d.respLabel), adminUserId, adminUserId);
    inserted++;
  }
  return inserted;
}

// ---------- ۶) صورت‌جلسه‌های کمیته — ماهانه در بازه‌ی ۱۴۰۵ ----------
const MEETINGS = [
  { committee: 'کنترل عفونت', fracs: [0.08, 0.25, 0.42, 0.6, 0.78, 0.95], respLabel: 'سوپروایزر بالینی شماره یک' },
  { committee: 'پایش و سنجش کیفیت', fracs: [0.1, 0.3, 0.5, 0.7, 0.9], respLabel: 'مدیر بهبود کیفیت' },
  { committee: 'اورژانس بیمارستانی', fracs: [0.15, 0.45, 0.75], respLabel: 'سرپرستار بخش اورژانس' },
  { committee: 'حفاظت فنی و بهداشت کار', fracs: [0.2, 0.6], respLabel: 'مسئول بهداشت حرفه‌ای' },
  { committee: 'دارو و درمان', fracs: [0.25, 0.65], respLabel: 'مسئول فنی' },
];

function seedMeetings(hospitalId, adminUserId) {
  let inserted = 0;
  for (const m of MEETINGS) {
    const c = db.prepare('SELECT id FROM committees WHERE hospital_id = ? AND name = ?').get(hospitalId, m.committee);
    if (!c) continue;
    const resp = respName(m.respLabel);
    // اجرای قبلی همین سناریو ممکن است صورت‌جلسه‌هایی با تاریخ‌های قدیمی (فرمول isoDaysAgo پیشین)
    // برای همین کمیته ساخته باشد؛ چون این ردیف‌ها فقط توسط ادمین بات همین سناریو ساخته می‌شوند
    // (نه ادمین واقعی)، پیش از درج دوباره پاک‌سازی می‌شوند تا صورت‌جلسه‌ی تکراری/قدیمی نماند.
    db.prepare(`DELETE FROM committee_meeting_minutes WHERE committee_id = ? AND created_by = ?`).run(c.id, adminUserId);
    // ستون‌های شش‌بندیِ الف-۱-۵-۲ ممکن است روی دیتابیس قدیمی هنوز ساخته نشده باشند
    const cols = db.prepare('PRAGMA table_info(committee_meeting_minutes)').all().map(r => r.name);
    const has = (k) => cols.includes(k);
    m.fracs.forEach((frac, idx) => {
      const meetingDate = dateAtFraction(frac);
      const existing = db.prepare('SELECT id FROM committee_meeting_minutes WHERE committee_id = ? AND meeting_date = ?').get(c.id, meetingDate);
      if (existing) return;
      const agenda = ['بررسی گزارش عملکرد دوره‌ی قبل', 'مرور شاخص‌های کیفی بخش‌های مرتبط', 'بررسی موارد عدم انطباق ثبت‌شده'];
      const decisions = [
        { what: 'پیگیری اجرای مصوبات جلسه‌ی قبل', responsible_name: resp, deadline: dateAtFraction(Math.min(frac + 0.05, 1)) },
        { what: 'به‌روزرسانی مستندات مرتبط با موضوع جلسه', responsible_name: resp, deadline: dateAtFraction(Math.min(frac + 0.08, 1)) },
      ];
      // بندهای ۱، ۲ (غایبین)، ۳، ۴ و ۶ — بدون این‌ها صورت‌جلسه‌ی این سناریو در ستون
      // «کامل بودن» ناقص علامت می‌خورد، چون کتاب همه‌ی شش بند را حداقل می‌داند.
      const extra = {
        start_time: '09:00', end_time: '10:30',
        location: 'اتاق کنفرانس ۱ — طبقه همکف',
        minutes_code: `MIN-${m.committee.slice(0, 3)}-${String(idx + 1).padStart(2, '0')}`,
        discussion: `گزارش عملکرد دوره‌ی قبل ارائه و شاخص‌های کیفی بخش‌های مرتبط مرور شد. `
          + `درباره‌ی موارد عدم انطباق ثبت‌شده بحث و علت اصلی آن‌ها بررسی شد و اعضا بر ضرورت `
          + `پیگیری مصوبات با مسئول و مهلت مشخص توافق کردند.`,
        absentees: JSON.stringify([]),
        // بند ۳ همیشه پر می‌شود: این کمیته‌ها پیش از بازه‌ی سناریو هم جلسه داشته‌اند
        previous_followup: JSON.stringify([
          { what: 'پیگیری اجرای مصوبات جلسه‌ی قبل', result: 'done', note: 'انجام و به کمیته گزارش شد.' },
          { what: 'به‌روزرسانی مستندات مرتبط با موضوع جلسه', result: 'partial', note: 'بخشی از مستندات به‌روز شد؛ ادامه دارد.' },
        ]),
        signatures: JSON.stringify([{ user_id: adminUserId, name: `ادمین ${HOSPITAL_NAME}`,
          role: 'مدیر داخلی', was_absent: false, signed_at: `${meetingDate}T10:30:00.000Z` }]),
      };
      const keys = Object.keys(extra).filter(has);
      db.prepare(`INSERT INTO committee_meeting_minutes
        (id, committee_id, meeting_date, attendees, agenda_items, decisions, created_by${keys.length ? ', ' + keys.join(', ') : ''})
        VALUES (?, ?, ?, ?, ?, ?, ?${keys.map(() => ', ?').join('')})`)
        .run(uid(), c.id, meetingDate, JSON.stringify([resp, `ادمین ${HOSPITAL_NAME}`]),
          JSON.stringify(agenda), JSON.stringify(decisions), adminUserId, ...keys.map(k => extra[k]));
      inserted++;
    });
  }
  return inserted;
}

// ---------- ۷) وضعیت همه‌ی سنجه‌های اعتباربخشی — پخش‌شده در کل بازه‌ی ۱۴۰۵ ----------
// طبق درخواست کاربر («موارد اعتباربخشی از اول سال پر شده») اکثریت سنجه‌ها منطبق/کامل ثبت می‌شوند؛
// بخش کوچکی جزئی یا نیازمند اقدام اصلاحی باقی می‌مانند تا سناریو واقع‌گرایانه بماند (نه ۱۰۰٪ مصنوعی).
const STATUS_WEIGHTS = [
  'full_compliant', 'full_compliant', 'full_compliant', 'full_compliant',
  'partial', 'full_compliant', 'full_compliant', 'non_compliant',
  'full_compliant', 'partial', 'full_compliant', 'full_compliant',
];
function seedMeasureStatuses(hospitalId, adminUserId) {
  const measures = db.prepare("SELECT id FROM accreditation_sections WHERE level_type = 'measure' ORDER BY code").all();
  let inserted = 0;
  // measure_status از یک نقطه به بعد ستون year گرفت (دوره‌ای شدن خودارزیابی).
  // این seed هم پیش از آن migration اجرا می‌شود و هم بعد از آن روی پایگاه‌داده‌ی
  // موجود؛ پس وجود ستون را می‌سنجد به‌جای اینکه فرضش کند.
  const hasYear = db.prepare("PRAGMA table_info(measure_status)").all().some(c => c.name === 'year');
  const YEAR = String(PERIOD_JYEAR);
  measures.forEach((m, i) => {
    const status = STATUS_WEIGHTS[i % STATUS_WEIGHTS.length];
    const reviewDate = dateAtFraction(i / measures.length);
    const notes = status === 'non_compliant' ? 'نیازمند اقدام اصلاحی — پیگیری توسط سوپروایزر بالینی مربوطه' : null;
    const existing = hasYear
      ? db.prepare('SELECT id FROM measure_status WHERE hospital_id = ? AND measure_id = ? AND year = ?').get(hospitalId, m.id, YEAR)
      : db.prepare('SELECT id FROM measure_status WHERE hospital_id = ? AND measure_id = ?').get(hospitalId, m.id);
    if (existing) {
      // اجرای قبلی همین سناریو ممکن است این سنجه را با توزیع/تاریخ قدیمی پر کرده باشد؛ به‌روزش می‌کنیم
      db.prepare(`UPDATE measure_status SET status = ?, notes = ?, last_reviewed_by = ?, last_reviewed_at = ? WHERE id = ?`)
        .run(status, notes, adminUserId, reviewDate + ' 09:00:00', existing.id);
      return;
    }
    if (hasYear) {
      db.prepare(`INSERT INTO measure_status (id, hospital_id, measure_id, year, status, notes, last_reviewed_by, last_reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(uid(), hospitalId, m.id, YEAR, status, notes, adminUserId, reviewDate + ' 09:00:00');
    } else {
      db.prepare(`INSERT INTO measure_status (id, hospital_id, measure_id, status, notes, last_reviewed_by, last_reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(uid(), hospitalId, m.id, status, notes, adminUserId, reviewDate + ' 09:00:00');
    }
    inserted++;
  });
  return inserted;
}

// ---------- ۸) حذف بیمارستانِ خالیِ پیش‌فرض ----------
// طبق درخواست کاربر، فقط یک بیمارستانِ نمونه بماند. «بیمارستان پیش‌فرض» را
// migrate-sqlite به‌عنوان بوت‌استرپِ اولیه می‌سازد و عملاً خالی است (نه نمودار سازمانی
// کامل دارد، نه سنجه‌ی پرشده) — کنار بیمارستان نمونه فقط باعث سردرگمی در صفحه‌ی انتخاب
// مرکز می‌شود.
// سه محافظ ایمنی، چون این تنها جای پروژه است که داده‌ی یک بیمارستان را واقعاً حذف می‌کند:
//   ۱) فقط بیمارستانی که نامش دقیقاً همان نام پیش‌فرضِ بوت‌استرپ است (نه هر بیمارستانی
//      که ادمین بعداً ساخته)،
//   ۲) فقط وقتی بیمارستان نمونه واقعاً موجود است، تا هرگز به صفر بیمارستان نرسیم،
//   ۳) فقط وقتی هیچ داده‌ی واقعی‌ای در آن ثبت نشده — اگر کسی روی همان بیمارستان کار
//      کرده باشد (سنجه/سند/صورت‌جلسه)، دست‌نخورده می‌ماند و فقط هشدار داده می‌شود.
// ---------- ۸.۵) جاروی ارجاع‌های معلقِ بیمارستانی ----------
// تاریخچه‌ی حادثه (چرا این تابع وجود دارد): نسخه‌ی پیشینِ همین فایل بیمارستانِ بوت‌استرپ را
// با «DELETE FROM hospitals» حذف می‌کرد، ولی SQLite فقط برای جدول‌هایی که کلید خارجیِ
// «ON DELETE CASCADE» به hospitals دارند وابسته‌ها را خودکار می‌برد. از ۲۲۱ جدول، ۳۴ جدول
// فقط ستون hospital_id دارند و هیچ FK ندارند؛ نتیجه اینکه روی دیتابیس دمو ردیف‌هایی با
// hospital_id = '7a8c6616-2c77-4176-8219-f8ec522ff35b' (شناسه‌ی بیمارستانی که دیگر در
// hospitals نیست) جا ماندند — اندازه‌گیری واقعی: reminder_rules = ۱ ردیف،
// example_seed_log = ۶ ردیف. این ردیف‌ها چون همه‌ی کوئری‌های واقعی با hospitalScope فیلتر
// می‌شوند در UI نامرئی‌اند، ولی در هر گزارشِ بدون فیلتر یا بررسی یکپارچگی به‌شکل «یتیم»
// بیرون می‌زنند و به شناسه‌ی مرده اشاره می‌کنند.
// راه‌حل عمومی (نه فهرست دستی جدول‌ها): اسکیما را می‌پرسیم و هر جدولی که ستون hospital_id
// دارد و وابستگی‌اش با CASCADE پاک نمی‌شود را جارو می‌کنیم؛ این‌طور اگر فردا جدول تازه‌ای
// بدون FK اضافه شود، همین تابع پوشش می‌دهد و فهرست کهنه نمی‌شود.
function hospitalIdTablesWithoutCascade() {
  const tables = db.prepare(`SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'hospitals'`).all();
  const out = [];
  for (const t of tables) {
    const hasCol = db.prepare(`PRAGMA table_info("${t.name}")`).all().some(c => c.name === 'hospital_id');
    if (!hasCol) continue;
    const cascade = db.prepare(`PRAGMA foreign_key_list("${t.name}")`).all()
      .some(fk => fk.table === 'hospitals' && fk.from === 'hospital_id' && String(fk.on_delete || '').toUpperCase() === 'CASCADE');
    if (!cascade) out.push(t.name);
  }
  return out;
}

function purgeDanglingHospitalRefs() {
  // محافظ: اگر hospitals خالی است (پایگاه‌داده‌ی نیمه‌ساخته یا بوت نیمه‌کاره)، «نبودِ بیمارستان»
  // معنای واقعی ندارد و اجرای جارو می‌توانست کلِ داده‌ی بیمارستانی را پاک کند — دست‌نخورده برمی‌گردیم.
  const hospitalCount = db.prepare('SELECT COUNT(*) c FROM hospitals').get().c;
  if (hospitalCount === 0) {
    console.log('[Seed HospitalThreeScenario] 🧹 جاروی ارجاع معلق: هیچ بیمارستانی ثبت نشده — رد شد');
    return 0;
  }
  const counts = {};
  let total = 0;
  // یک تراکنش برای همه‌ی جدول‌ها: یا کل پاک‌سازی ثبت می‌شود یا هیچ‌کدام (شکست نیمه‌کاره نداریم).
  db.transaction(() => {
    for (const table of hospitalIdTablesWithoutCascade()) {
      const info = db.prepare(`DELETE FROM "${table}"
        WHERE hospital_id IS NOT NULL AND TRIM(hospital_id) <> ''
          AND NOT EXISTS (SELECT 1 FROM hospitals h WHERE h.id = "${table}".hospital_id)`).run();
      if (info.changes > 0) { counts[table] = info.changes; total += info.changes; }
    }
  })();
  if (total === 0) {
    console.log('[Seed HospitalThreeScenario] 🧹 ارجاع معلقِ بیمارستانی پیدا نشد (idempotent)');
  } else {
    const parts = Object.entries(counts).map(([t, n]) => `${t}=${n}`).join('، ');
    console.log(`[Seed HospitalThreeScenario] 🧹 ${total} ردیفِ یتیمِ بیمارستانی پاک شد — ${parts}`);
  }
  return total;
}

function dropPlaceholderHospital(sampleHospitalId) {
  const config = require('../src/config/app');
  // نامِ بیمارستانِ بوت‌استرپ ثابت نیست: هم به DEFAULT_HOSPITAL_NAME بستگی دارد (که روی
  // Railway «بیمارستان نمونه» است و به‌صورت محلی «بیمارستان پیش‌فرض»)، و هم
  // seed-hospital-rename.js پیش از اجرای این تابع «بیمارستان نمونه» را به «بیمارستان یک»
  // تغییر نام می‌دهد. نسخه‌ی اول فقط config.defaultHospitalName را چک می‌کرد، برای همین
  // محلی کار می‌کرد ولی روی Railway بی‌صدا رد می‌شد و دو بیمارستان باقی می‌ماند.
  const CANDIDATES = [config.defaultHospitalName, 'بیمارستان پیش‌فرض', 'بیمارستان نمونه', 'بیمارستان یک'];
  let target = null;
  for (const name of CANDIDATES) {
    if (!name) continue;
    const row = db.prepare('SELECT id, name FROM hospitals WHERE name = ?').get(name);
    if (row && row.id !== sampleHospitalId) { target = row; break; }
  }
  if (!target) { console.log('[Seed HospitalThreeScenario] بیمارستان اضافه‌ای برای حذف پیدا نشد'); return; }
  if (!db.prepare('SELECT id FROM hospitals WHERE id = ?').get(sampleHospitalId)) { // محافظ ۲
    console.log('[Seed HospitalThreeScenario] بیمارستان نمونه موجود نیست — حذف انجام نشد');
    return;
  }

  // محافظ ۳ — «کارِ واقعی» یعنی وضعیت سنجه‌ی ثبت‌شده. عمداً روی تعداد سند یا صورت‌جلسه
  // شرط نمی‌گذاریم: seed-sections-documents و seed-committees برای *هر* بیمارستانی چند
  // سند و صورت‌جلسه‌ی نمونه می‌سازند، پس وجودشان نشانه‌ی کار کاربر نیست و با شرط‌گذاشتن
  // رویشان این بیمارستانِ بوت‌استرپ هرگز حذف نمی‌شد. ثبت وضعیت سنجه اما فقط با اقدام
  // آگاهانه‌ی کاربر رخ می‌دهد.
  const measures = db.prepare('SELECT COUNT(*) c FROM measure_status WHERE hospital_id = ?').get(target.id).c;
  if (measures > 0) {
    console.log(`[Seed HospitalThreeScenario] «${target.name}» ${measures} سنجه‌ی ثبت‌شده دارد — حذف نشد`);
    return;
  }
  // کلیدهای خارجی با ON DELETE CASCADE تعریف شده‌اند، ولی SQLite فقط وقتی اعمالشان
  // می‌کند که foreign_keys روشن باشد (در database-sqlite.js روشن است) — پس یک DELETE
  // روی خودِ بیمارستان، کاربران و داده‌های وابسته‌اش را هم پاک می‌کند.
  // توجه: جدول‌های بدون FK (۳۴ جدول — مانند reminder_rules و example_seed_log) با این
  // DELETE پاک نمی‌شوند؛ به همین دلیل بلافاصله بعد از این تابع، purgeDanglingHospitalRefs
  // صدا زده می‌شود (همان تابع ردیف‌های یتیمِ جامانده از نسخه‌های قدیمی را هم جارو می‌کند).
  db.prepare('DELETE FROM hospitals WHERE id = ?').run(target.id);
  console.log(`[Seed HospitalThreeScenario] ✅ بیمارستان خالیِ «${target.name}» حذف شد — فقط «${HOSPITAL_NAME}» می‌ماند`);
}

function runMigration() {
  console.log('[Seed HospitalThreeScenario] Starting...');
  try {
    const { id: hospitalId, created } = getOrCreateHospital();
    console.log(`[Seed HospitalThreeScenario] hospital ${created ? 'created' : 'already exists'}: ${hospitalId}`);
    seedBaseInfra(hospitalId);
    const { id: adminUserId, created: adminCreated } = seedAdmin(hospitalId);
    console.log(`[Seed HospitalThreeScenario] admin ${adminCreated ? 'created' : 'already exists'}: ${ADMIN_USERNAME}`);
    if (adminCreated) { try { require('./seed-examples').seedHospital(hospitalId); } catch (e) { /* idempotent */ } }

    let mgmtFilled = 0, supFilled = 0, wardResult = { filledHead: 0, filledDep: 0, total: 0 };
    let profileIns = 0, periodIns = 0, docsIns = 0, meetingsIns = 0, measuresIns = 0;
    db.transaction(() => {
      mgmtFilled = seedManagementGeneric(hospitalId);
      supFilled = seedSupervisorsGeneric(hospitalId);
      wardResult = seedWardsGeneric(hospitalId);
      profileIns = seedProfile(hospitalId);
      periodIns = seedAccreditationPeriod(hospitalId, adminUserId);
      docsIns = seedDocuments(hospitalId, adminUserId);
      meetingsIns = seedMeetings(hospitalId, adminUserId);
      measuresIns = seedMeasureStatuses(hospitalId, adminUserId);
    })();

    console.log(`[Seed HospitalThreeScenario] management filled: ${mgmtFilled} | supervisors filled: ${supFilled} | wards head/deputy filled: ${wardResult.filledHead}/${wardResult.filledDep} (total ${wardResult.total})`);
    console.log(`[Seed HospitalThreeScenario] profile: ${profileIns} | accreditation period: ${periodIns} (۱ فروردین ${PERIOD_JYEAR} تا امروز) | documents: ${docsIns} | meeting minutes: ${meetingsIns} | measure statuses: ${measuresIns}`);
    dropPlaceholderHospital(hospitalId);
    purgeDanglingHospitalRefs();
    console.log('[Seed HospitalThreeScenario] ✅ done');
  } catch (err) {
    console.error('[Seed HospitalThreeScenario] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
