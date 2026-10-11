/**
 * Migration + Seed: زمان‌بندی جلسات کمیته‌ها (اتاق جلسه + تقویم)
 *
 * تصمیم معماری: «جلسه‌ی زمان‌بندی‌شده» یک ردیف مستقل نیست، بلکه همان `calendar_events` است که
 * با چند ستون اضافه (committee_id / room_id / start_time / end_time / event_type) غنی شده.
 * دلیل: تقویم بیمارستان باید یک منبع واحد حقیقت برای «چه چیزی چه زمانی» بماند؛ ساخت جدول موازی
 * committee_meetings یعنی هر نمای تقویمی باید دو منبع را UNION کند و تضاد رزرو هم دو جا چک شود.
 * صورت‌جلسه (committee_meeting_minutes) همچنان رکورد «بعد از جلسه» است و دست‌نخورده می‌ماند؛
 * این ماژول رکورد «قبل از جلسه» را اضافه می‌کند که قبلاً اصلاً وجود نداشت.
 *
 * قفل رزرو: در سطح سرور، تداخل بازه‌ی زمانی روی یک اتاق در یک روز و یک بیمارستان رد می‌شود (409).
 * Run: npm run seed-meetings — idempotent است و روی هر boot امن اجرا می‌شود.
 */
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS committee_meeting_rooms (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER,
    location TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_meeting_rooms_hospital ON committee_meeting_rooms(hospital_id, is_active)`,
];

// ستون‌های افزوده به تقویم موجود (بدون شکستن ردیف‌های قدیمی: event_type پیش‌فرض 'general')
const COLUMNS = [
  ['calendar_events', 'event_type', "TEXT DEFAULT 'general'"],
  ['calendar_events', 'committee_id', 'TEXT'],
  ['calendar_events', 'room_id', 'TEXT'],
  ['calendar_events', 'start_time', 'TEXT'],
  ['calendar_events', 'end_time', 'TEXT'],
];

// نام‌های عمومی و منطقی — عمداً نام اختصاصی «واقعی» جعل نشده است
const DEFAULT_ROOMS = [
  { name: 'اتاق کنفرانس ۱', capacity: 20, location: 'طبقه همکف' },
  { name: 'اتاق کنفرانس ۲', capacity: 12, location: 'طبقه اول' },
  { name: 'سالن جلسات', capacity: 60, location: 'طبقه دوم' },
  { name: 'دفتر مدیریت', capacity: 8, location: 'طبقه اداری' },
];

function addColumns() {
  for (const [table, col, def] of COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  }
}

function seedRooms() {
  const hospitals = db.prepare('SELECT id FROM hospitals').all();
  const exists = db.prepare('SELECT id FROM committee_meeting_rooms WHERE hospital_id = ? AND name = ?');
  const ins = db.prepare('INSERT INTO committee_meeting_rooms (id, hospital_id, name, capacity, location) VALUES (?, ?, ?, ?, ?)');
  let added = 0;
  const tx = db.transaction(() => {
    for (const h of hospitals) {
      for (const r of DEFAULT_ROOMS) {
        if (exists.get(h.id, r.name)) continue;
        ins.run(crypto.randomUUID(), h.id, r.name, r.capacity, r.location);
        added++;
      }
    }
  });
  tx();
  return added;
}

function runMigration() {
  console.log('[Seed Meetings] Starting...');
  try {
    for (const sql of TABLES) db.exec(sql);
    addColumns();
    db.exec(`CREATE INDEX IF NOT EXISTS idx_calendar_room ON calendar_events(hospital_id, room_id, event_date)`);
    const added = seedRooms();
    console.log(`[Seed Meetings] ✅ rooms ready (${added} new)`);
  } catch (err) {
    console.error('[Seed Meetings] ❌ Failed:', err);
    throw err;
  }
}

if (require.main === module) {
  runMigration();
  process.exit(0);
}

module.exports = { runMigration, DEFAULT_ROOMS };
