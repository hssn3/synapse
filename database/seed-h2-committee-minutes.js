/**
 * seed-h2-committee-minutes.js
 * صورت‌جلسات رسمی ۶ بندی وزارت بهداشت برای تمامی ۳۴ کمیته بیمارستان ۲
 * بازه: فروردین ۱۴۰۵ تا شهریور ۱۴۰۵
 * idempotent
 */
'use strict';

const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');

function uid() { return crypto.randomUUID(); }

const MEETING_DATES = [
  '2026-03-28','2026-04-15','2026-05-05','2026-05-25',
  '2026-06-15','2026-07-05','2026-07-28','2026-08-18','2026-09-05',
];

const ATTENDEES = {
  quality: 'دکتر سعیدی (رئیس) · مهندس رضایی (مسئول کیفیت) · خانم احمدی (مترون) · خانم موسوی (ایمنی بیمار) · دکتر کریمی (نماینده پزشکی)',
  safety: 'دکتر موسوی (رئیس) · خانم احمدی (مترون) · دکتر رضایی (متخصص بیهوشی) · مهندس کریمی (ایمنی) · خانم صادقی (سوپروایزر)',
  infection: 'دکتر حسینی (رئیس) · خانم کریمی (کارشناس کنترل عفونت) · دکتر موسوی (داخلی) · خانم رضایی (سوپروایزر ICU)',
  pharmacy: 'دکتر قاسمی (داروساز ارشد) · دکتر نجفی (پزشک مسئول) · خانم شریفی (سرپرستار) · آقای محمدی (مدیر تدارکات)',
  executive: 'آقای مرادی (مدیر بیمارستان) · دکتر سعیدی (رئیس) · خانم احمدی (مترون) · آقای کریمی (مدیر مالی) · خانم موسوی (مدیر آموزش)',
  nursing: 'خانم احمدی (مترون) · خانم رضایی (سوپروایزر ۱) · خانم کریمی (سوپروایزر ۲) · خانم موسوی (سوپروایزر ۳) · آقای حسینی (برنامه‌ریزی)',
  general: 'دکتر مرادی (رئیس) · آقای کریمی (دبیر) · خانم احمدی (عضو) · دکتر رضایی (عضو) · آقای محمدی (عضو)',
};

function getAttendeeType(name) {
  if (name.includes('کیفیت') || name.includes('اعتباربخشی')) return 'quality';
  if (name.includes('ایمنی')) return 'safety';
  if (name.includes('عفونت')) return 'infection';
  if (name.includes('دارو') || name.includes('تجهیزات')) return 'pharmacy';
  if (name.includes('مدیریت اجرایی') || name.includes('رهبری')) return 'executive';
  if (name.includes('پرستاری')) return 'nursing';
  return 'general';
}

function runSeed() {
  console.log('[Seed H2 Committee Minutes] Starting...');
  const hosp = db.prepare("SELECT id FROM hospitals WHERE subdomain='h2'").get();
  if (!hosp) { console.log('[Seed H2 Committee Minutes] hospital h2 not found'); return; }
  const hospitalId = hosp.id;

  const committees = db.prepare('SELECT id, name FROM committees WHERE hospital_id=?').all(hospitalId);
  console.log('[Seed H2 Committee Minutes] committees:', committees.length);

  let inserted = 0;
  let skipped = 0;

  const checkExisting = db.prepare('SELECT COUNT(*) as c FROM committee_meeting_minutes WHERE committee_id=?');

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO committee_meeting_minutes (
      id, committee_id, meeting_date, start_time, end_time, location,
      attendees, absentees, agenda_items, previous_followup,
      discussion, decisions, next_meeting_date, signatures,
      minutes_code, created_by, created_at, is_example
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),0)
  `);

  const firstUser = db.prepare('SELECT id FROM users WHERE hospital_id=? LIMIT 1').get(hospitalId);
  const createdBy = firstUser ? firstUser.id : null;

  committees.forEach((committee, idx) => {
    const existing = checkExisting.get(committee.id).c;
    if (existing > 0) { skipped++; return; }

    const sessionCount = 3 + (idx % 3);
    const atype = getAttendeeType(committee.name);

    for (let s = 0; s < sessionCount; s++) {
      const dateStr = MEETING_DATES[s % MEETING_DATES.length];
      const nextDate = MEETING_DATES[(s + 1) % MEETING_DATES.length];
      const sNo = s + 1;
      const mCode = 'CMT-H2-' + String(idx + 1).padStart(3,'0') + '-' + sNo + '-1405';

      const agenda = JSON.stringify([
        'استماع گزارش پیگیری مصوبات جلسه قبل',
        'بررسی عملکرد و شاخص‌های ' + committee.name + ' در دوره گذشته',
        'بررسی موارد ارجاعی و شکایات مرتبط',
        'تحلیل روندها و تدوین برنامه اصلاحی',
        'تصویب برنامه آموزشی و توانمندسازی پرسنل',
        'سایر موارد و تعیین دستور جلسه بعد',
      ]);

      const discussion = 'رئیس جلسه گزارش مختصری از عملکرد ' + committee.name + ' ارائه نمود. اعضا درباره شاخص‌های کلیدی بحث کردند. پیشرفت نسبت به دوره مشابه قبل ۱۲٪ افزایش داشته است. موارد ارجاعی از واحدهای مختلف بررسی و تصمیم‌گیری گردید. دستور جلسه آینده با توافق اعضا تدوین شد.';

      const decisions = JSON.stringify([
        'تایید گزارش عملکرد دوره و ارسال به مدیریت بیمارستان',
        'مسئول ' + committee.name + ' موظف است ظرف ۱۵ روز کاری برنامه اصلاحی تهیه نماید',
        'برگزاری کارگاه آموزشی برای پرسنل مرتبط',
        'پایش ماهانه شاخص‌های کلیدی و گزارش به هیئت رئیسه',
      ]);

      const signatures = JSON.stringify({
        chair: { name: 'دکتر سعیدی', signed: true, signed_at: new Date().toISOString() },
        secretary: { name: 'مهندس کریمی', signed: true, signed_at: new Date().toISOString() },
        members_confirmed: true,
      });

      insertStmt.run(
        uid(), committee.id, dateStr, '08:30', '10:00',
        'سالن کنفرانس مرکزی بیمارستان — طبقه اول',
        ATTENDEES[atype],
        'هیچ‌کدام از اعضای اصلی غایب نبودند',
        agenda,
        'پیگیری مصوبات جلسه شماره ' + (sNo > 1 ? sNo - 1 : 'اول') + ': تمامی موارد در دست اقدام',
        discussion,
        decisions,
        nextDate,
        signatures,
        mCode,
        createdBy
      );
      inserted++;
    }
    console.log('  ' + committee.name + ': ' + sessionCount + ' sessions');
  });

  console.log('[Seed H2 Committee Minutes] done: ' + inserted + ' inserted, ' + skipped + ' skipped');
}

runSeed();
