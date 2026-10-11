const db = require('better-sqlite3')('database/hospital.db');
const jalali = require('../src/config/jalali');
const { v4: uuid } = require('uuid');

const wards = db.prepare('SELECT id, title FROM nursing_wards').all();
const hospitalId = db.prepare('SELECT id FROM hospitals LIMIT 1').get().id;
const year = 1405;
const month = 7;

for (const ward of wards) {
  const staffList = db.prepare('SELECT id FROM ward_staff WHERE ward = ?').all(ward.title);
  if (staffList.length === 0) continue;

  let sched = db.prepare('SELECT id FROM shift_schedules WHERE ward = ? AND jalali_year = ? AND jalali_month = ?').get(ward.title, year, month);
  
  if (!sched) {
    const id = uuid();
    db.prepare(`
      INSERT INTO shift_schedules (id, hospital_id, ward, jalali_year, jalali_month, note, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, hospitalId, ward.title, year, month, 'برنامه مصوب مهرماه - تایید شده', 'توضیحات تکمیلی: همه پرسنل ملزم به رعایت شیفت هستند.');
    sched = { id };
  } else {
    db.prepare('UPDATE shift_schedules SET note = ?, description = ? WHERE id = ?')
      .run('برنامه مصوب مهرماه - تایید شده', 'توضیحات تکمیلی.', sched.id);
  }

  db.prepare('DELETE FROM shift_entries WHERE schedule_id = ?').run(sched.id);
  const insertCell = db.prepare('INSERT INTO shift_entries (id, schedule_id, staff_id, day, codes) VALUES (?, ?, ?, ?, ?)');
  
  for (const staff of staffList) {
    for (let day = 1; day <= 30; day++) {
      const codes = ['M', 'E', 'N', 'OFF'][Math.floor(Math.random() * 4)];
      insertCell.run(uuid(), sched.id, staff.id, day, codes);
    }
  }
  console.log(`Generated schedule for ${ward.title}`);
}
console.log('Successfully populated schedules for Mehr month.');
