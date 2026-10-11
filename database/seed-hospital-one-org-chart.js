/**
 * Migration + Seed: تکمیل نمودار سازمانی «بیمارستان یک» با کاربران دمو واقعی
 *
 * زمینه: management_position_slots / nursing_supervisor_slots / nursing_wards برای بیمارستان
 * یک قبلاً ساخته شده‌اند (seed-management-hierarchy.js، seed-org-chart-positions.js،
 * seed-nursing-hierarchy.js) اما اغلب بدون فرد منصوب مانده بودند و nursing_supervisor_slots /
 * nursing_wards برای این بیمارستان اصلاً ردیفی نداشتند. این فایل، فقط برای بیمارستان یک:
 *   ۱) هر ردیف خالیِ management_position_slots را با یک کاربر دمو تازه پر می‌کند (ردیف‌های
 *      قبلاً مقداردهی‌شده — مثل «ریاست بیمارستان» — دست‌نخورده می‌مانند)
 *   ۲) اگر کمتر از ۷ نursing_supervisor_slots دارد، تا ۷ عدد می‌سازد و همه را با کاربر دمو پر
 *      می‌کند
 *   ۳) اگر کمتر از ۱۰ nursing_wards دارد، تا ۱۰ عدد می‌سازد؛ هر بخش سرپرستار می‌گیرد و چند
 *      بخش هم جانشین اول
 *
 * انتخاب role_code (طبق بررسی src/routes/api.js GET /users/colleagues: فقط کاربر فعال همان
 * بیمارستان لازم است، محدودیت role ندارد؛ و طبق پیشینه‌ی همین جدول در این بیمارستان — «ریاست
 * بیمارستان» قبلاً با یک کاربر role=staff_nurse پر شده بود):
 *   - عناوین مدیریتی که یک role اختصاصی و معادل دقیق در ROLE_DEFINITIONS (migrate-sqlite.js)
 *     دارند: «مدیر بهبود کیفیت» → quality_control_manager
 *   - بقیه‌ی عناوین مدیریتی (مسئول فنی/معاون اداری‌مالی/مدیر مالی/مدیر منابع انسانی/مدیر
 *     تغذیه/مسئول بهداشت حرفه‌ای/مسئول بهداشت محیط) role اختصاصی ندارند و صرفاً یک برچسبِ
 *     نمودار سازمانی‌اند نه نقش کاربری سیستمی؛ طبق همان الگویی که قبلاً برای «ریاست بیمارستان»
 *     همین جدول در همین بیمارستان استفاده شده، role=staff_nurse (کم‌امتیازترین/خنثی‌ترین نقش)
 *     گرفته می‌شود تا این افراد فقط به‌عنوان «نام روی چارت» دیده شوند، نه صاحب مجوز مدیریتی.
 *   - nursing_supervisor_slots → role=clinical_supervisor (معادل دقیق موجود در ROLE_DEFINITIONS)
 *   - nursing_wards.head_nurse_id / deputy1_id → role=staff_nurse (دقیقاً طبق توضیح
 *     seed-nursing-hierarchy.js: سرپرستار/جانشین صرفاً یک کاربر فعال بیمارستان است، نه role جدا)
 *
 * رمز عبور: طبق الگوی seed-hospital-two.js، bcryptjs با همان تعداد دور از config.bcrypt.rounds،
 * رمز یکسان و ساده برای همه‌ی کاربران دمو («Demo@2026»} — قابل تغییر توسط ادمین.
 *
 * Idempotent: هر تابع پیش از insert چک می‌کند (نام کاربری موجود / اسلات پر / تعداد کافی).
 * Persian text فقط از همین فایل .js می‌آید، هرگز از آرگومان shell.
 *
 * Run: npm run seed-hospital-one-org-chart (یا خودکار روی هر boot، بعد از
 * seed-org-chart-positions و seed-nursing-hierarchy).
 */
const { db } = require('../src/config/database-sqlite');
const bcrypt = require('bcryptjs');
const config = require('../src/config/app');
const crypto = require('crypto');
const uid = () => crypto.randomUUID();

const HOSPITAL_NAME = 'بیمارستان یک';
const DEMO_PASSWORD = 'Demo@2026';

function getRoleId(code) {
  const r = db.prepare('SELECT id FROM roles WHERE code = ?').get(code);
  if (!r) throw new Error(`role not found: ${code}`);
  return r.id;
}

function createUser(hospitalId, fullName, username, roleId, department) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return existing.id;
  const id = uid();
  const hash = bcrypt.hashSync(DEMO_PASSWORD, config.bcrypt.rounds);
  db.prepare(`INSERT INTO users (id, hospital_id, full_name, username, password_hash, role_id, department, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run(id, hospitalId, fullName, username, hash, roleId, department);
  return id;
}

// عناوین مدیریتی خالی که ممکن است در این بیمارستان وجود داشته باشند → نام دمو + دپارتمان
const MGMT_CANDIDATES = [
  { label: 'ریاست بیمارستان', name: 'دکتر بهروز صادقی', username: 'h1.riasat', dept: 'ریاست' },
  { label: 'مدیر بهبود کیفیت', name: 'دکتر شیرین کاویانی', username: 'h1.kayfiat', dept: 'کنترل کیفیت', role: 'quality_control_manager' },
  { label: 'مسئول فنی', name: 'دکتر آرمان طاهری', username: 'h1.fanni', dept: 'فنی' },
  { label: 'معاون اداری‌مالی', name: 'آقای کامران یوسفی', username: 'h1.edarimali', dept: 'اداری‌مالی' },
  { label: 'مدیر مالی', name: 'خانم لادن قاسمی', username: 'h1.mali', dept: 'مالی' },
  { label: 'مدیر منابع انسانی', name: 'آقای فرهاد نجفی', username: 'h1.manabe', dept: 'منابع انسانی' },
  { label: 'مدیر تغذیه', name: 'خانم پروین اسدی', username: 'h1.taghzie', dept: 'تغذیه' },
  { label: 'مسئول بهداشت حرفه‌ای', name: 'آقای بابک شریفی', username: 'h1.beh_herfei', dept: 'بهداشت حرفه‌ای' },
  { label: 'مسئول بهداشت محیط', name: 'خانم الهام صابری', username: 'h1.beh_mohit', dept: 'بهداشت محیط' },
];

function seedManagement(hospitalId) {
  const staffNurseRole = getRoleId('staff_nurse');
  const slots = db.prepare('SELECT * FROM management_position_slots WHERE hospital_id = ?').all(hospitalId);
  let filled = 0;
  const filledLabels = [];
  for (const slot of slots) {
    if (slot.user_id) continue; // قبلاً پر شده، دست نمی‌زنیم
    const cand = MGMT_CANDIDATES.find(c => c.label === slot.label);
    if (!cand) continue; // برچسب ناشناخته (احتمالاً از یک ایجنت دیگر) — دست نمی‌زنیم
    const roleId = cand.role ? getRoleId(cand.role) : staffNurseRole;
    const userId = createUser(hospitalId, cand.name, cand.username, roleId, cand.dept);
    db.prepare(`UPDATE management_position_slots SET user_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, slot.id);
    filled++;
    filledLabels.push(`${cand.label} → ${cand.name}`);
  }
  return { filled, filledLabels };
}

const SUPERVISOR_NAMES = [
  { name: 'خانم نگار رحیمی', username: 'h1.sup1' },
  { name: 'خانم شهلا عابدی', username: 'h1.sup2' },
  { name: 'آقای وحید مرادی', username: 'h1.sup3' },
  { name: 'خانم فریبا نوروزی', username: 'h1.sup4' },
  { name: 'خانم آزاده کرمی', username: 'h1.sup5' },
  { name: 'آقای سهراب امینی', username: 'h1.sup6' },
  { name: 'خانم مهسا قربانی', username: 'h1.sup7' },
];

function seedSupervisors(hospitalId) {
  const roleId = getRoleId('clinical_supervisor');
  let slots = db.prepare('SELECT * FROM nursing_supervisor_slots WHERE hospital_id = ? ORDER BY sort_order').all(hospitalId);
  const maxOrder = slots.reduce((m, s) => Math.max(m, s.sort_order || 0), 0);
  let order = maxOrder;
  // اگر کمتر از ۷ عدد داریم، تا ۷ عدد اسلات جدید می‌سازیم (طبق الگوی nursing_supervisor_slots: برچسب دلخواه)
  const insSlot = db.prepare('INSERT INTO nursing_supervisor_slots (id, hospital_id, label, sort_order) VALUES (?, ?, ?, ?)');
  while (slots.length < 7) {
    order += 1;
    const id = uid();
    insSlot.run(id, hospitalId, `سوپروایزر بالینی ${slots.length + 1}`, order);
    slots.push(db.prepare('SELECT * FROM nursing_supervisor_slots WHERE id = ?').get(id));
  }
  let filled = 0;
  const filledNames = [];
  let nameIdx = 0;
  for (const slot of slots.slice(0, 7)) {
    if (slot.user_id) continue;
    const cand = SUPERVISOR_NAMES[nameIdx++] || SUPERVISOR_NAMES[SUPERVISOR_NAMES.length - 1];
    const userId = createUser(hospitalId, cand.name, cand.username, roleId, 'پرستاری');
    db.prepare(`UPDATE nursing_supervisor_slots SET user_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, slot.id);
    filled++;
    filledNames.push(`${slot.label} → ${cand.name}`);
  }
  return { filled, filledNames, total: slots.length };
}

// عنوان + آیکون یونیکد بخش‌های رایج بیمارستانی (هم‌راستا با آیکون‌های موجود ✚ در seed-nursing-hierarchy)
const WARD_CANDIDATES = [
  { title: 'اورژانس', icon: '🚑', head: 'خانم سمیرا فتحی', dep: 'آقای رامین ذوالفقاری' },
  { title: 'مراقبت‌های ویژه (ICU)', icon: '🫀', head: 'آقای امیر حسینی', dep: 'خانم مینا اکبری' },
  { title: 'جراحی عمومی', icon: '🔪', head: 'خانم سپیده رضوانی', dep: null },
  { title: 'داخلی', icon: '🩺', head: 'آقای پیمان یزدانی', dep: 'خانم رویا محسنی' },
  { title: 'اطفال', icon: '🧸', head: 'خانم ندا کیانی', dep: null },
  { title: 'زنان و زایمان', icon: '🤱', head: 'خانم طاهره جعفری', dep: 'خانم مریم شیخی' },
  { title: 'ارتوپدی', icon: '🦴', head: 'آقای کوروش بهرامی', dep: null },
  { title: 'قلب (CCU)', icon: '❤️', head: 'خانم الناز رستگار', dep: 'آقای داریوش فرهادی' },
  { title: 'دیالیز', icon: '🩸', head: 'آقای حمید قنبری', dep: null },
  { title: 'پست‌جراحی', icon: '🛏️', head: 'خانم گلناز عزیزی', dep: null },
];

function seedWards(hospitalId) {
  const roleId = getRoleId('staff_nurse');
  let wards = db.prepare('SELECT * FROM nursing_wards WHERE hospital_id = ? ORDER BY sort_order').all(hospitalId);
  const existingTitles = new Set(wards.map(w => w.title));
  const maxOrder = wards.reduce((m, w) => Math.max(m, w.sort_order || 0), 0);
  let order = maxOrder;
  const insWard = db.prepare('INSERT INTO nursing_wards (id, hospital_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)');
  const created = [];
  for (const cand of WARD_CANDIDATES) {
    if (wards.length >= 10) break;
    if (existingTitles.has(cand.title)) continue;
    order += 1;
    const id = uid();
    insWard.run(id, hospitalId, cand.title, cand.icon, order);
    wards.push(db.prepare('SELECT * FROM nursing_wards WHERE id = ?').get(id));
    created.push(cand.title);
  }
  let filledHead = 0, filledDep = 0;
  const assigned = [];
  let ci = 0;
  for (const ward of wards) {
    const cand = WARD_CANDIDATES.find(c => c.title === ward.title) || WARD_CANDIDATES[ci++ % WARD_CANDIDATES.length];
    let changed = false;
    if (!ward.head_nurse_id && cand) {
      const uname = 'h1.wh.' + cand.head.replace(/[^a-zA-Z0-9آ-ی]/g, '').slice(0, 12) + Math.abs(hashCode(ward.title)).toString(36).slice(0, 4);
      const userId = createUser(hospitalId, cand.head, uname, roleId, 'پرستاری - ' + ward.title);
      db.prepare(`UPDATE nursing_wards SET head_nurse_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, ward.id);
      filledHead++;
      changed = true;
      assigned.push(`${ward.title} سرپرستار → ${cand.head}`);
    }
    if (!ward.deputy1_id && cand && cand.dep) {
      const uname = 'h1.wd.' + cand.dep.replace(/[^a-zA-Z0-9آ-ی]/g, '').slice(0, 12) + Math.abs(hashCode(ward.title)).toString(36).slice(0, 4);
      const userId = createUser(hospitalId, cand.dep, uname, roleId, 'پرستاری - ' + ward.title);
      db.prepare(`UPDATE nursing_wards SET deputy1_id = ?, updated_at = datetime('now') WHERE id = ?`).run(userId, ward.id);
      filledDep++;
      changed = true;
      assigned.push(`${ward.title} جانشین → ${cand.dep}`);
    }
    if (changed) void 0;
  }
  return { created, filledHead, filledDep, assigned, total: wards.length };
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h;
}

function runMigration() {
  console.log('[Seed HospitalOneOrgChart] Starting...');
  try {
    const hospital = db.prepare('SELECT id, name FROM hospitals WHERE name = ?').get(HOSPITAL_NAME);
    if (!hospital) {
      console.log('[Seed HospitalOneOrgChart] بیمارستان یک یافت نشد — رد شد');
      return;
    }
    const hospitalId = hospital.id;
    let mgmtResult, supResult, wardResult;
    db.transaction(() => {
      mgmtResult = seedManagement(hospitalId);
      supResult = seedSupervisors(hospitalId);
      wardResult = seedWards(hospitalId);
    })();
    console.log(`[Seed HospitalOneOrgChart] management filled: ${mgmtResult.filled} (${mgmtResult.filledLabels.join(' | ')})`);
    console.log(`[Seed HospitalOneOrgChart] supervisors filled: ${supResult.filled}/${supResult.total} (${supResult.filledNames.join(' | ')})`);
    console.log(`[Seed HospitalOneOrgChart] wards created: ${wardResult.created.join(', ') || 'هیچ'} | head filled: ${wardResult.filledHead} | deputy filled: ${wardResult.filledDep} total wards: ${wardResult.total}`);
    console.log('[Seed HospitalOneOrgChart] ✅ done');
  } catch (err) {
    console.error('[Seed HospitalOneOrgChart] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
