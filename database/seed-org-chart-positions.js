/**
 * Migration + Seed: افزودن پست‌های تازه‌ی نمودار سازمانی یکپارچه به management_position_slots
 *
 * زمینه: نمودار سازمانی یکپارچه (renderOrgChart در public/js/app.js) سه ردیف ثابت دارد؛ ردیف دوم
 * و سوم شامل «مدیر مالی»/«مدیر حسابداری»/«مدیر منابع انسانی»/«مدیر تغذیه»/«مسئول بهداشت حرفه‌ای»/
 * «مسئول بهداشت محیط» است. این شش پست قبلاً یا اصلاً وجود نداشتند یا فقط به‌صورت استاب بدون‌مسئول
 * در SUPPORT_DEPTS (public/js/app.js) بودند. طبق تصمیم صریح کاربر («می‌خوام روی چارت اسم افراد را
 * ببینم») این‌ها را به پست واقعی و قابل‌انتصاب تبدیل می‌کنیم.
 *
 * چرا جدول جداگانه نه: طبق استدلال seed-management-hierarchy.js، مدل مالکیت این شش پست دقیقاً
 * همان مدل management_position_slots است — برچسب/تعداد را فقط سوپرادمین پلتفرم تغییر می‌دهد
 * (super.js) و انتصاب فرد را ادمین بیمارستان/رئیس حوزه‌ی مدیریت با مجوز manage_org_divisions
 * انجام می‌دهد (routes/api.js: PUT /management/positions/:id). ساختن جدول موازی فقط برای این
 * شش ردیف، همان دوگانگیِ مجوزی را که seed-management-hierarchy.js آگاهانه ازش پرهیز کرده
 * بازتولید می‌کرد. پس فقط رکورد جدید در همان جدول اضافه می‌شود — idempotent، additive،
 * دست‌نخورده گذاشتنِ سه پست پیش‌فرض قبلی (ریاست بیمارستان/مدیر بهبود کیفیت/مسئول فنی).
 *
 * Run: npm run seed-org-chart-positions (یا خودکار روی هر boot، بعد از seed-management-hierarchy).
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

// ترتیب/برچسب دقیقاً مطابق درخواست کاربر — ردیف دوم (مالی/منابع‌انسانی) و ردیف سوم
// (تغذیه/بهداشت حرفه‌ای/بهداشت محیط) نمودار سازمانی
const NEW_LABELS = ['مدیر مالی', 'مدیر منابع انسانی', 'مدیر تغذیه', 'مسئول بهداشت حرفه‌ای', 'مسئول بهداشت محیط', 'مدیر حسابداری', 'مدیر اعتباربخشی'];

const uid = () => crypto.randomUUID();

function seedHospital(hospitalId) {
  const existing = db.prepare('SELECT label FROM management_position_slots WHERE hospital_id = ?').all(hospitalId).map(r => r.label);
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM management_position_slots WHERE hospital_id = ?').get(hospitalId).m;
  const ins = db.prepare('INSERT INTO management_position_slots (id, hospital_id, label, sort_order) VALUES (?, ?, ?, ?)');
  let n = 0, order = maxOrder;
  for (const label of NEW_LABELS) {
    if (existing.includes(label)) continue;
    order += 1;
    ins.run(uid(), hospitalId, label, order);
    n++;
  }
  return n;
}

function runMigration() {
  console.log('[Seed OrgChartPositions] Starting...');
  try {
    // اطمینان از وجود جدول (در صورتی که این migration زودتر از seed-management-hierarchy اجرا شود)
    db.exec(`CREATE TABLE IF NOT EXISTS management_position_slots (
      id TEXT PRIMARY KEY,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    const hospitals = db.prepare('SELECT id FROM hospitals').all();
    let total = 0;
    db.transaction(() => { for (const h of hospitals) total += seedHospital(h.id); })();
    console.log(`[Seed OrgChartPositions] ${total} position slot(s) inserted across ${hospitals.length} hospital(s)`);
    console.log('[Seed OrgChartPositions] ✅ management_position_slots extended');
  } catch (err) {
    console.error('[Seed OrgChartPositions] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration };
