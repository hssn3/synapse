'use strict';
// داده نمونه ۳ ماژول خالی — مورد ۳۷ چک‌لیست (hrdev / vendors / nsupervision)
// چرا فایل جدا: seedهای اصلی فقط DDL می‌سازند تا کاربر خودش پر کند؛ این فایل
// فقط برای بیمارستان دموی اصلی، اگر جدول خالی بود، ۳ ردیف نمونه واقعی می‌گذارد.
// idempotent: اگر ردیف هست، هیچ کاری نمی‌کند.
const { db } = require('../src/config/database-sqlite');
const crypto = require('crypto');

const DEMO_HOSPITAL = 'dd43b5de-bd17-4245-8dbf-246de3db401d';

function count(table) {
  try {
    const r = db.prepare(`SELECT COUNT(*) c FROM ${table} WHERE hospital_id = ?`).get(DEMO_HOSPITAL);
    return r ? r.c : 0;
  } catch (e) { return -1; }
}

function runMigration() {
  // vendors — حداقل ۳ ردیف نمونه برای دموی اصلی
  try {
    const c = count('vendors');
    if (c >= 0 && c < 3) {
      const ins = db.prepare(`INSERT INTO vendors (id, hospital_id, kind, title, service_scope, contract_no, is_active) VALUES (?,?,?,?,?,?,1)`);
      const need = 3 - c;
      const samples = [
        ['پیمانکار', 'شرکت خدمات پرستاری نمونه', 'تأمین نیروی پرستاری بخش‌ها', '۱۴۰۴/۱۰۱'],
        ['تأمین‌کننده', 'تجهیزات پزشکی نمونه', 'تأمین تجهیزات مصرفی', '۱۴۰۴/۱۰۲'],
        ['پیمانکار', 'خدمات تغذیه نمونه', 'طبخ و توزیع غذای بیمار', '۱۴۰۴/۱۰۳'],
      ];
      for (let i = 0; i < need; i++) ins.run(crypto.randomUUID(), DEMO_HOSPITAL, ...samples[(c + i) % 3]);
      console.log(`[Seed Sample3] vendors: ${need} نمونه درج شد`);
    }
  } catch (e) { console.error('[Seed Sample3] vendors:', e.message); }

  // hr_job_profiles — حداقل ۳ پروفایل
  try {
    const c = count('hr_job_profiles');
    if (c >= 0 && c < 3) {
      const ins = db.prepare(`INSERT INTO hr_job_profiles (id, hospital_id, title, job_group, unit) VALUES (?,?,?,?,?)`);
      const need = 3 - c;
      const samples = [
        ['پرستار بخش عمومی', 'پرستاری', 'پرستاری'],
        ['کارشناس کنترل عفونت', 'پیراپزشکی', 'کنترل عفونت'],
        ['مسئول پذیرش', 'اداری', 'پذیرش'],
      ];
      for (let i = 0; i < need; i++) ins.run(crypto.randomUUID(), DEMO_HOSPITAL, ...samples[(c + i) % 3]);
      console.log(`[Seed Sample3] hr_job_profiles: ${need} نمونه درج شد`);
    }
  } catch (e) { console.error('[Seed Sample3] hrdev:', e.message); }

  // nsp_staffing — حداقل ۳ ردیف
  try {
    const c = count('nsp_staffing');
    if (c >= 0 && c < 3) {
      const ins = db.prepare(`INSERT INTO nsp_staffing (id, hospital_id, ward, shift_code, required_staff, assigned_staff, method) VALUES (?,?,?,?,?,?,?)`);
      const need = 3 - c;
      const samples = [
        ['داخلی', 'M', 8, 6, 'روش برآورد وزارت'],
        ['جراحی', 'E', 6, 6, 'روش برآورد وزارت'],
        ['اورژانس', 'N', 10, 7, 'روش برآورد وزارت'],
      ];
      for (let i = 0; i < need; i++) ins.run(crypto.randomUUID(), DEMO_HOSPITAL, ...samples[(c + i) % 3]);
      console.log(`[Seed Sample3] nsp_staffing: ${need} نمونه درج شد`);
    }
  } catch (e) { console.error('[Seed Sample3] nsupervision:', e.message); }
}

if (require.main === module) { runMigration(); process.exit(0); }
module.exports = { runMigration };
