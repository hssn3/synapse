/**
 * fix-directive-roles.js
 * ---------------------------------------------------------------------------
 * مهاجرت اولیه، مجوز manage_directives را به ۲۳ نقش داده بود — از جمله
 * «پرستار» و «پرستار (نقش قدیمی)». این اشتباه است: پرستار تابع دستور است،
 * صادرکننده نیست. صدور ابلاغیه مخصوص سمت‌های مدیریتی است.
 *
 * این اسکریپت مجوز را از نقش‌های غیرمدیریتی برمی‌دارد (idempotent).
 */
const { db } = require('../src/config/database-sqlite');

const REMOVE = ['staff_nurse', 'nurse', 'anonymous_reporter', 'social_worker', 'breastfeeding_specialist', 'medical_records_manager'];

const upd = db.prepare('UPDATE roles SET permissions = ? WHERE code = ?');
const tx = db.transaction(() => {
  for (const code of REMOVE) {
    const row = db.prepare('SELECT id, permissions FROM roles WHERE code = ?').get(code);
    if (!row) continue;
    let perms = [];
    try { perms = JSON.parse(row.permissions || '[]'); } catch (e) { perms = []; }
    if (!Array.isArray(perms)) perms = [];
    if (!perms.includes('manage_directives')) continue;
    perms = perms.filter(p => p !== 'manage_directives');
    upd.run(JSON.stringify(perms), row.id);
  }
});
tx();

console.log('[directives] نقش‌های دارای مجوز صدور ابلاغیه حالا:');
db.prepare(`SELECT code FROM roles WHERE permissions LIKE '%manage_directives%' ORDER BY code`).all()
  .forEach(r => console.log('  -', r.code));
console.log('[directives] مجموع:', db.prepare(`SELECT COUNT(*) c FROM roles WHERE permissions LIKE '%manage_directives%'`).get().c);
