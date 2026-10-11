/* =====================================================================
   سه قضاوت مستقل روی هر سنجه
   ---------------------------------------------------------------------
   در فرایند رسمی، یک سنجه سه بار و توسط سه مرجع قضاوت می‌شود:

     ۱) خودارزیابی بیمارستان        (مرحله‌ی ۲ چرخه)
     ۲) ارزیابی داخلی دانشگاه       (مرحله‌ی ۳)
     ۳) ارزیابی بیرونی وزارت بهداشت (مرحله‌ی ۴)

   و مهم‌ترین سیگنال مدیریتیِ پیش از ارزیابی رسمی، خودِ *اختلاف* این سه
   است: «کجا خودمان را بالاتر از واقعیت دیده‌ایم؟»

   تا امروز جدول فقط یک ستون status داشت؛ ثبت نمره‌ی ارزیاب یعنی پاک کردن
   خودارزیابی، و آن گزارش اصلاً ساختنی نبود.

   ستون status دست‌نخورده می‌ماند و همان «خودارزیابی» است — هم برای
   سازگاری با هر کد موجود، و هم چون این ستونی است که کاربر روزمره پر
   می‌کند. دو قضاوت دیگر ستون‌های تازه‌اند و پیش‌فرضشان NULL است، یعنی
   «هنوز ارزیابی نشده» که با «بررسی‌نشده»ی خودارزیابی فرق دارد: آن یکی
   کارِ نکرده‌ی بیمارستان است، این یکی ارزیابی‌ای که هنوز انجام نشده.
   ===================================================================== */
'use strict';

const { query } = require('../src/config/database');

const COLS = [
  ['internal_status', 'TEXT'],      // نمره‌ی ارزیاب داخلی دانشگاه
  ['internal_note', 'TEXT'],
  ['internal_by', 'TEXT'],
  ['internal_at', 'TEXT'],
  ['external_status', 'TEXT'],      // نمره‌ی ارزیاب بیرونی وزارت
  ['external_note', 'TEXT'],
  ['external_by', 'TEXT'],
  ['external_at', 'TEXT'],
];

function hasCol(table, col) {
  try { return query(`PRAGMA table_info(${table})`).rows.some(r => r.name === col); }
  catch (e) { return false; }
}

function runMigration() {
  try {
    let added = 0;
    for (const [name, type] of COLS) {
      if (!hasCol('measure_status', name)) {
        query(`ALTER TABLE measure_status ADD COLUMN ${name} ${type}`);
        added++;
      }
    }
    console.log(added
      ? `[Seed ThreeScores] ✅ ${added} ستون ارزیابی داخلی/بیرونی به measure_status اضافه شد`
      : '[Seed ThreeScores] ✅ ستون‌های ارزیابی داخلی/بیرونی از قبل موجودند');
  } catch (err) {
    console.error('[Seed ThreeScores] failed:', err.message);
  }
}

module.exports = { runMigration, COLS };
if (require.main === module) runMigration();
