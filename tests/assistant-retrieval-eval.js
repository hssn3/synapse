/* آزمون بازیابی دانا — بدون کلید API و بدون شبکه، فقط لایهی ۱
 * اجرا:  npm run test:assistant   (به دیتابیسِ همین مخزن وصل میشود) */
const path = require('path');
const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const Database = require('better-sqlite3');
const ctx = require('../src/services/assistant-context');
const db = new Database(path.join(ROOT, 'database', 'hospital.db'), { readonly: true });

const hospitalId = db.prepare("SELECT id FROM hospitals WHERE name LIKE '%نمونه شماره یک'").get().id;
const admin = db.prepare("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='admin' AND u.is_active=1 LIMIT 1").get();
const adminId = admin ? admin.id : null;
const adminPermsArr = JSON.parse(db.prepare("SELECT permissions FROM roles WHERE code='admin'").get().permissions || '[]');
// کسی که واقعاً کار باز دارد (برای آزمون منبع «کارهای من») — داینامیک تا به داده بستگی نداشته باشد
const busy = db.prepare(
  "SELECT assigned_to AS id, COUNT(*) c FROM tasks WHERE status <> 'completed' GROUP BY assigned_to ORDER BY c DESC LIMIT 1").get();
console.log(`hospital=${hospitalId} admin=${adminId} busyUser=${busy ? busy.id : '—'} (${busy ? busy.c : 0} کار باز)`);

let failed = 0;
function ok(name, cond, detail) {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failed++;
}

// ---------- واحد ----------
ok('normalize: ی/ک عربی = فارسی', ctx.normalize('كاربراني و مجزمان') === ctx.normalize('کاربرانی و مجزمان'));
ok('normalize: ارقام فارسی به لاتین', ctx.normalize('سنجه ۱۲۳').includes('123'));
ok('normalize: ارقام عربی به لاتین', ctx.normalize('سنجه ١٢٣').includes('123'));
{
  const w = ctx.words('برای ثبت چکلیست چه کنم؟');
  ok('words: ایستواژهها حذف میشوند', w.includes('چکلیست') && !w.includes('برای'));
}
ok('needsHistoryContext: پرسش ارجاعی', ctx.needsHistoryContext('چرا؟') === true);

// ---------- راهنمای ماژولها (واژههای بدون ابهام ZWNJ) ----------
ok('guide: چکلیست (برگه پاسخ)', ctx.searchGuide('برگه پاسخ').some(x => x.key === 'checklists'));
ok('guide: کمیتهها', ctx.searchGuide('صورتجلسه کمیته چطور ثبت میشود؟').some(x => x.key === 'committees'));
ok('guide: OCR', ctx.searchGuide('چطور از عکس متن بخوانم؟').some(x => x.key === 'ocr'));

// ---------- کتاب سنجهها ----------
{
  const r = ctx.searchMeasures('بهداشت دست چطور پایش میشود؟', '*');
  ok('measures: بهداشت دست', r.measures.length > 0 && !r.blocked, r.measures.map(m => m.code).join(',').slice(0, 60));
}
{
  const r = ctx.searchMeasures('عفونت بیمارستان', ['ب-5']);
  ok('measures: مرز نقش', r.measures.length > 0 && r.measures.every(m => String(m.code).startsWith('ب-5')),
    r.measures.map(m => m.code).join(',').slice(0, 60));
}
ok('measures: نقش بیمجوز → blocked', ctx.searchMeasures('ایمنی اتاق عمل', []).blocked === true);
ok('measures: چندواژهای بدون کرش', Array.isArray(ctx.searchMeasures('رضایت کارکنان', '*').measures));

// ---------- buildContext ----------
{
  const c = ctx.buildContext({ hospitalId, userId: adminId, text: 'چند سنجه مانده؟', roleScope: '*' });
  ok('buildContext: آمار زنده', !c.empty && c.facts.length > 0 && c.facts.some(f => f.includes('سنجه')), c.facts[0] || '');
}
{
  const c = ctx.buildContext({ hospitalId, userId: adminId, text: 'الان چه کاری مانده؟', roleScope: '*' });
  ok('buildContext: منبع «کارهای باز من» فعال میشود', Array.isArray(c.mine), c.mine ? `${c.mine.length} مورد` : '—');
  if (busy) {
    const cb = ctx.buildContext({ hospitalId, userId: busy.id, text: 'چه کارهایی برای من مانده؟', roleScope: '*' });
    ok('buildContext: کاربر دارای وظیفه، فهرست میگیرد', (cb.mine || []).length > 0, (cb.mine || []).slice(0, 2).join(' // ').slice(0, 140));
  } else {
    ok('buildContext: کاربر دارای وظیفه، فهرست میگیرد', true, 'در این دیتابیس هیچ کار بازی نیست — آزمون رد شد');
  }
}
{
  const c = ctx.buildContext({ hospitalId, userId: adminId, text: 'qzxw qqxx', roleScope: '*' });
  ok('buildContext: متن بیارتباط → empty و بدون blocked', c.empty === true && c.blocked === false);
}
// منبع «کارهای من» نباید با پرسش عادیِ بدون نشانه شخصی فعال شود
ok('wantsMine گیتش را نگه میدارد', ctx.wantsMine('چکلیست ماهانه') === false && ctx.wantsMine('الان چه کاری مانده؟') === true);

// ---------- نشت بین بیمارستانها ----------
ok('myOpenItems: hospital ناشناخته → خالی', ctx.myOpenItems('hospital-does-not-exist', adminId).length === 0);
ok('searchKnowledge: hospital ناشناخته → خالی', ctx.searchKnowledge('hospital-does-not-exist', 'هر چیزی').length === 0);

// ---------- موجودیت واقعی (از مسیر buildContext) ----------
{
  const doc = db.prepare("SELECT title FROM controlled_documents WHERE hospital_id = ? AND title <> '' LIMIT 1").get(hospitalId);
  if (doc) {
    const firstWord = doc.title.split(/\s+/).map(w => w.replace(/[؟!،.؛:()«»]/g, '')).find(w => w.length >= 3 && !['برای', 'در', 'از'].includes(w));
    const c = ctx.buildContext({ hospitalId, userId: adminId, text: firstWord + ' کجاست؟', roleScope: '*', perms: adminPermsArr });
    ok('entities: سند واقعی از buildContext پیدا میشود', (c.entities || []).length > 0, `${(c.entities || []).length} مورد برای «${firstWord}»`);
  } else {
    ok('entities: سند واقعی پیدا میشود', true, 'دیتابیس سند ندارد — آزمون رد شد');
  }
}

console.log(failed === 0 ? '\n🎉 همهی ادعاها سبز است' : `\n💥 ${failed} ادعا قرمز`);
db.close();
process.exit(failed === 0 ? 0 : 1);
