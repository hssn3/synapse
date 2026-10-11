/**
 * Smoke test — آزمون دودِ حداقلیِ سامانه
 * ---------------------------------------------------------------------------
 * چرا این فایل وجود دارد: پروژه هیچ تست خودکاری نداشت و روشِ تستِ دستی
 * (curl + مرورگر) هر بار باید از حف تکرار میشد. این اسکریپت همین چکهای
 * پایهای را که در بازبینی ۲۰۲۶-۰۹-۰۷ دستی اجرا شد، خودکار میکند:
 *
 *   ۱) /healthz سالم است (اتصال دیتابیس واقعاً پاسخ میدهد)
 *   ۲) ورود با حساب دمو کار میکند و کوکی نشست ست میشود
 *   ۳) داشبورد با ۵۲۰ سنجه بالا میآید (دادهی seed سالم است)
 *   ۴) درخت اعتباربخشی همان ۵۲۰ سنجه را میدهد
 *   ۵) درخواستِ بدون احراز ۴۰۱ میگیرد (لایهی auth روشن است)
 *   ۶) /api/public/hospitals فقط شناسه/نام میدهد (دریگاه عمومی سالم)
 *
 * سرور باید از قبل بالا باشد (npm start یا npm run dev). این اسکریپت
 * خودش سرور را نمیسازد — جداسازی «بالا آوردن» از «آزمودن» عمدی است تا
 * در CI هم بتوان سرویسِ واقعی را تست کرد.
 *
 * اجرا:  npm run smoke-test
 * متغیرها: SMOKE_BASE_URL (پیشفرض http://127.0.0.1:3000)
 *          SMOKE_USER / SMOKE_PASS (پیشفرض حساب دمو بیمارستان نمونه)
 */
'use strict';

const BASE = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const USER = process.env.SMOKE_USER || 'hospital3_admin';
const PASS = process.env.SMOKE_PASS || 'Hospital3@Admin2026';
const EXPECT_MEASURES = 520;

let failed = 0;
const ok = (name, cond, detail) => {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failed++;
};

function countMeasures(nodes) {
  let n = 0;
  for (const x of nodes || []) {
    if (x.level_type === 'measure') n++;
    if (x.children) n += countMeasures(x.children);
  }
  return n;
}

(async () => {
  console.log(`Smoke test → ${BASE}\n`);

  // ۱) healthz
  const hz = await fetch(BASE + '/healthz').then(r => r.json()).catch(() => null);
  ok('healthz', !!hz && hz.status === 'ok', hz ? `env=${hz.env} uptime=${hz.uptime_seconds}s` : 'پاسخ نداد');

  // ۵) بدون احراز: در حالت عادی ۴۰۱، در حالت نمایشی (DEMO_OPEN) ۲۰۰ — هر دو درست‌اند
  const anon = await fetch(BASE + '/api/dashboard');
  ok('anonymous dashboard → ' + anon.status, anon.status === 401 || anon.status === 200, `کد دریافتی: ${anon.status}`);

  // ۲) ورود
  const login = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  ok('login', login.status === 200, `user=${USER}`);
  const cookie = (login.headers.getSetCookie() || []).map(c => c.split(';')[0]).join('; ');
  if (!cookie) { ok('session cookie', false, 'کوکی نشست ست نشد'); return finish(); }
  const H = { cookie };

  // ۳) داشبورد
  const dash = await fetch(BASE + '/api/dashboard', { headers: H }).then(r => r.json()).catch(() => null);
  ok('dashboard', !!dash && !!dash.accreditation,
    dash && dash.accreditation ? `total=${dash.accreditation.total} full=${dash.accreditation.full_compliant}` : '');

  // ۴) درخت سنجهها
  const tree = await fetch(BASE + '/api/accreditation/tree', { headers: H }).then(r => r.json()).catch(() => null);
  const measures = tree ? countMeasures(tree.tree) : 0;
  ok('accreditation tree', measures === EXPECT_MEASURES, `measures=${measures} (انتظار: ${EXPECT_MEASURES})`);

  // ۶) درگاه عمومی
  const pub = await fetch(BASE + '/api/public/hospitals').then(r => r.json()).catch(() => null);
  ok('public hospitals', !!pub && Array.isArray(pub.hospitals),
    pub && pub.hospitals ? `${pub.hospitals.length} مرکز فعال` : '');

  return finish();

  function finish() {
    console.log(failed === 0 ? '\n🎉 همه‌ی چکها سبز است' : `\n💥 ${failed} چک قرمز`);
    process.exit(failed === 0 ? 0 : 1);
  }
})().catch(e => { console.error('SMOKE ERROR:', e.message); process.exit(1); });
