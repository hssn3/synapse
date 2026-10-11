/**
 * fix-directives-perms.js
 * ---------------------------------------------------------------------------
 * مهاجرت اولیه manage_directives را به فهرست گسترده‌ای از نقش‌ها داده بود، از
 * جمله «پرستار» و «مددکار». ولی معنای درستِ «ابلاغیه و دستور» این نیست: فقط
 * کسی که پرسنلِ دیگر را در اختیار دارد می‌تواند دستور صادر کند — پرستار
 * «گیرنده» است نه «صادرکننده».
 *
 * قاعده‌ی نهایی (منطبق با سلسله‌مراتب roles.hierarchy_level ≤ ۲ و سمت‌های
 * سازمانیِ واقعی): مدیر ریشه (۰)، مدیران ارشد و واحدها (۱)،
 * سوپروایزر/سرپرستار (۲). پرستار (۳) و گزارش‌دهنده ناشناس (۴) حذف می‌شوند.
 */
const { db } = require('../src/config/database-sqlite');

const REMOVE_FROM = ['staff_nurse', 'nurse', 'anonymous_reporter', 'social_worker',
  'breastfeeding_specialist', 'nursing_office_assistant'];

const upd = db.prepare('UPDATE roles SET permissions = ? WHERE code = ?');
const tx = db.transaction(() => {
  for (const code of REMOVE_FROM) {
    const row = db.prepare('SELECT id, permissions FROM roles WHERE code = ?').get(code);
    if (!row) { console.log('[skip]', code, '(نقش وجود ندارد)'); continue; }
    let perms = [];
    try { perms = JSON.parse(row.permissions || '[]'); } catch (e) { perms = []; }
    if (!Array.isArray(perms)) perms = [];
    if (!perms.includes('manage_directives')) { console.log('[ok]  ', code, 'از قبل مجوز نداشت'); continue; }
    perms = perms.filter(p => p !== 'manage_directives');
    upd.run(JSON.stringify(perms), row.id);
    console.log('[fix] ', code, '-> manage_directives حذف شد');
  }
});
tx();

console.log('\nنقش‌های دارای manage_directives حالا:');
db.prepare(`SELECT code, title_fa, hierarchy_level FROM roles WHERE permissions LIKE '%manage_directives%' ORDER BY COALESCE(hierarchy_level, 99)`)
  .all().forEach(r => console.log('  lvl', String(r.hierarchy_level).padStart(2), r.code.padEnd(30), r.title_fa));

console.log('\nکنترل: پرستار؟', db.prepare(`SELECT COUNT(*) c FROM roles WHERE code='staff_nurse' AND permissions LIKE '%manage_directives%'`).get().c ? 'هنوز دارد!' : 'خیر ✓');
