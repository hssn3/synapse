/**
 * Migration + Seed: زیرساختار حوزه‌ی «مدیریت» (زیر کارت «مدیریت» در org_divisions)
 *
 * جدول سبک و idempotent، هم‌شکل با nursing_supervisor_slots (seed-nursing-hierarchy.js) اما
 * عمداً جدول جداگانه است، نه تعمیم آن جدول به یک جدول مشترک «اسلات زیرحوزه» پارامتری‌شده با
 * division code. دلیل: مالکیت/مجوز این دو جدول کاملاً متفاوت است —
 *  - nursing_supervisor_slots: مدیر پرستاری خودِ بیمارستان هم برچسب/تعداد اسلات‌ها را تعیین
 *    می‌کند و هم فرد را منصوب می‌کند (یک مالک، یک مجوز: manage_nursing_hierarchy).
 *  - management_position_slots: طبق اسپک کاربر، «برچسب/تعداد پست‌ها» را فقط سوپرادمین پلتفرم
 *    تعیین می‌کند (super.js، superAdminRequired) و «انتصاب فرد» را ادمین بیمارستان با همان
 *    مجوزی که رئیس حوزه‌ها را تعیین می‌کند (manage_org_divisions) انجام می‌دهد.
 *  اگر این دو را در یک جدول مشترک ادغام می‌کردیم، هر route باید بسته به division code بین دو
 *  قانون مجوز کاملاً متفاوت سوییچ می‌کرد (یکی superAdminRequired در router جدا، یکی
 *  authRequired+hospitalScope در router دیگر) — همان پیچیدگی یک جدول مشترک را بی‌فایده
 *  می‌کرد و ریسک نشتی مجوز بین دو حوزه را بالا می‌برد. جدول جدا و کوچک، امن‌تر و ساده‌تر است.
 *
 * پیش‌فرض هر بیمارستان (فقط وقتی صفر پست دارد — دست‌نخورده اگر سوپرادمین قبلاً تغییرش داده):
 *  - مدیر بیمارستان
 *  - مدیر بهبود کیفیت   (همان عنوانِ نقشِ از قبل موجود quality_control_manager / فیلد
 *    hospital_profile.quality_manager_name — این‌جا یک نقش یا فیلد تازه ساخته نمی‌شود، فقط
 *    همان برچسب متنی به‌عنوان پیش‌فرض یک اسلات مستقل قابل‌ویرایش تکرار شده)
 *  - مسئول فنی           (همان برچسبِ از قبل موجود در ROLE_LABELS.tech_officer / نگاشت
 *    database/migrate-roles.js — اسلات مستقل، نه نقش کاربری جدید)
 *
 * Run: npm run seed-management-hierarchy (یا خودکار روی هر boot). idempotent است.
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS management_position_slots (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
];

const DEFAULT_LABELS = ['ریاست بیمارستان', 'مدیر بهبود کیفیت', 'مسئول فنی'];

const uid = () => crypto.randomUUID();

function seedHospital(hospitalId) {
  const cnt = db.prepare('SELECT COUNT(*) as c FROM management_position_slots WHERE hospital_id = ?').get(hospitalId).c;
  if (cnt > 0) return 0;
  const ins = db.prepare('INSERT INTO management_position_slots (id, hospital_id, label, sort_order) VALUES (?, ?, ?, ?)');
  DEFAULT_LABELS.forEach((label, i) => ins.run(uid(), hospitalId, label, i + 1));
  return DEFAULT_LABELS.length;
}

function runMigration() {
  console.log('[Seed ManagementHierarchy] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    let total = 0;
    db.transaction(() => { for (const h of hospitals) total += seedHospital(h.id); })();
    console.log(`[Seed ManagementHierarchy] ${total} default position slot(s) inserted across ${hospitals.length} hospital(s)`);
    console.log('[Seed ManagementHierarchy] ✅ management_position_slots ready');
  } catch (err) {
    console.error('[Seed ManagementHierarchy] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
