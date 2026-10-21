/* آزمون پاسخ دانا — مسیر واقعی handleMessage؛ کلید LLM موقتاً خالی و در پایان بازگردانی میشود
 * اجرا:  npm run test:assistant-response */
const path = require('path');
const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const Database = require('better-sqlite3');
const chat = require('../src/services/assistant-chat');
const db = new Database(path.join(ROOT, 'database', 'hospital.db'));

const hospitalId = db.prepare('SELECT id FROM hospitals LIMIT 1').get().id;
const byCode = c => db.prepare('SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code=? AND u.is_active=1 LIMIT 1').get(c);
const admin = byCode('admin');
const busy = db.prepare("SELECT assigned_to id FROM tasks WHERE status <> 'completed' GROUP BY assigned_to ORDER BY COUNT(*) DESC LIMIT 1").get();
const lowPerm = byCode('nursing_office_assistant');
const created = [];
const hospitalName = db.prepare('SELECT name FROM hospitals WHERE id=?').get(hospitalId).name;
const permsOf = c => JSON.parse(db.prepare('SELECT permissions FROM roles WHERE code=?').get(c).permissions || '[]');

let failed = 0;
// مقایسهی متون فارسی باید نیمفاصلهکور باشد — «حوزهی» و «حوزه‌ی» یکیاند
const nz = v => String(v == null ? '' : v).replace(/\u200c/g, '');
function ok(name, cond, detail) {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failed++;
}

async function ask(u, text, perms, roleCode) {
  const r = await chat.handleMessage({
    hospitalId, userId: u.id, conversationId: null, text,
    hospitalName, roleCode: roleCode || 'admin', roleLabel: 'کاربر', permissions: perms || [],
  });
  created.push(r.conversationId);
  return r;
}

let savedKey = null, savedProvider = null;
(async () => {
  const st = db.prepare('SELECT api_key, provider FROM assistant_hospital_settings WHERE hospital_id=?').get(hospitalId);
  if (st) { savedKey = st.api_key; savedProvider = st.provider; db.prepare('UPDATE assistant_hospital_settings SET api_key=NULL WHERE hospital_id=?').run(hospitalId); }
  console.log('keyless mode:', savedKey ? 'کلید قبلی موقتاً برداشته شد' : 'از قبل بیکلید');

  const adminPermsArr = permsOf('admin');

  const r1 = await ask(admin, 'چکلیست را کجا ثبت کنم؟', adminPermsArr);
  ok('راهنما: پاسخ به «چکلیست کجا»', !r1.roleBlocked && !r1.offTopic && /چکلیست|چک لیست/i.test(nz(r1.reply)), nz(r1.reply).slice(0, 130));

  const r2 = await ask(busy, 'چه کارهایی برای من مانده؟', permsOf('admin'));
  ok('کارهای من: فهرست واقعی در پاسخ', /کارتابل|کارهای باز/i.test(nz(r2.reply)), nz(r2.reply).slice(0, 160));

  const r3 = await ask(admin, 'چند سنجه مانده؟', adminPermsArr);
  ok('آمار: عدد واقعی در پاسخ', /سنجه/.test(nz(r3.reply)), nz(r3.reply).slice(0, 130));

  const r4 = await ask(lowPerm, 'ایمنی اتاق عمل را چه کسی باید ثبت کند؟', permsOf('nursing_office_assistant'), 'nursing_office_assistant');
  ok('مرز نقش + بدون نشت موجودیت', r4.roleBlocked === true && /حوزهی کاری|حوزه کاری/.test(nz(r4.reply)), nz(r4.reply).slice(0, 120));

  const r5 = await ask(admin, 'یک شعر درباره بهار بگو', adminPermsArr);
  ok('خارج از حوزه: رد مؤدبانه', r5.offTopic === true, nz(r5.reply).slice(0, 110));

  const r6 = await ask(admin, 'qzxw qqxx', adminPermsArr);
  ok('متن بیقرینه: دستخالی آبرومند', r6.reply && r6.reply.length > 10 && !r6.roleBlocked && !r6.offTopic, nz(r6.reply).slice(0, 130));

  // ---------- مهلت provider: باید خودِ درخواست را abort کند، نه فقط Promise.race ----------
  // fetch شبیه‌سازی می‌شود و تا ابد معلق می‌ماند؛ فقط با AbortSignal رد می‌شود.
  // اگر سیگنال تا fetch نرود، گاردِ ۳ ثانیه‌ای این آزمون را قرمز می‌کند.
  {
    const full = db.prepare('SELECT provider, model, api_key, base_url FROM assistant_hospital_settings WHERE hospital_id=?').get(hospitalId);
    const realFetch = global.fetch;
    let sawAbort = false;
    try {
      db.prepare("UPDATE assistant_hospital_settings SET provider='custom', model='timeout-test', api_key=NULL, base_url='https://timeout.invalid/v1' WHERE hospital_id=?").run(hospitalId);
      global.fetch = (url, opts) => new Promise((_, reject) => {
        const sig = opts && opts.signal;
        const onAbort = () => {
          sawAbort = true;
          const e = new Error('aborted by test');
          e.name = 'AbortError';
          reject(e);
        };
        if (sig) {
          if (sig.aborted) onAbort();
          else sig.addEventListener('abort', onAbort, { once: true });
        }
      });
      let guard;
      const guardP = new Promise((_, reject) => {
        guard = setTimeout(() => reject(new Error('آزمون timeout خودش گیر کرد')), 3000);
      });
      const t0 = Date.now();
      let rt;
      try {
        rt = await Promise.race([
          chat.handleMessage({
            hospitalId, userId: admin.id, conversationId: null, text: 'چکلیست را کجا ثبت کنم؟',
            hospitalName, roleCode: 'admin', roleLabel: 'کاربر', permissions: adminPermsArr, timeoutMs: 120,
          }),
          guardP,
        ]);
      } finally { clearTimeout(guard); }
      created.push(rt.conversationId);
      const elapsed = Date.now() - t0;
      ok('مهلت provider: abort واقعی + پاسخ آبرومند',
        rt.providerTimeout === true && sawAbort === true && elapsed < 2000 && /پاسخ نداد|رها شد/.test(nz(rt.reply)),
        `providerTimeout=${rt.providerTimeout} abort=${sawAbort} ${elapsed}ms`);
    } finally {
      global.fetch = realFetch;
      if (full) {
        db.prepare('UPDATE assistant_hospital_settings SET provider=?, model=?, api_key=?, base_url=? WHERE hospital_id=?')
          .run(full.provider, full.model, full.api_key, full.base_url, hospitalId);
      }
    }
  }

  const conv = db.prepare('SELECT COUNT(*) c FROM assistant_conversations WHERE id=?').get(r1.conversationId).c;
  const msgs = db.prepare('SELECT COUNT(*) c FROM assistant_messages WHERE conversation_id=?').get(r1.conversationId).c;
  ok('ماندگاری: گفتوگو و پیامها ذخیره شدند', conv === 1 && msgs >= 2, `${conv} گفتوگو / ${msgs} پیام`);

  if (created.length) {
    const ph = created.map(() => '?').join(',');
    db.prepare(`DELETE FROM assistant_messages WHERE conversation_id IN (${ph})`).run(...created);
    db.prepare(`DELETE FROM assistant_conversations WHERE id IN (${ph})`).run(...created);
    ok('پاکسازی: ردیفهای آزمون حذف شدند', true, `${created.length} گفتوگو`);
  }

  if (process.env.DANA_LIVE_KEY && savedProvider) {
    try {
      db.prepare('UPDATE assistant_hospital_settings SET api_key=?, provider=? WHERE hospital_id=?').run(process.env.DANA_LIVE_KEY, 'openai', hospitalId);
      const rl = await ask(admin, 'خلاصه کن وضعیت اعتباربخشی این بیمارستان را', adminPermsArr);
      ok('شاخهی زنده: پاسخ لایهی ۲', rl.source === 'external' && (rl.reply || '').length > 10, nz(rl.reply).slice(0, 120));
    } catch (e) { ok('شاخهی زنده', false, String(e.message).slice(0, 100)); }
  } else {
    ok('شاخهی زنده (نیاز به DANA_LIVE_KEY)', true, 'رد شد — بدون کلید طراحی شده');
  }

  if (savedKey !== null || savedProvider !== null) {
    db.prepare('UPDATE assistant_hospital_settings SET api_key=?, provider=? WHERE hospital_id=?').run(savedKey, savedProvider, hospitalId);
    console.log('کلید اصلی بازگردانی شد');
  }

  console.log(failed === 0 ? '\n🎉 همهی پاسخها سبز است' : `\n💥 ${failed} پاسخ قرمز`);
  db.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => {
  if (savedKey !== null || savedProvider !== null) {
    try { db.prepare('UPDATE assistant_hospital_settings SET api_key=?, provider=? WHERE hospital_id=?').run(savedKey, savedProvider, hospitalId); console.log('کلید اصلی در مسیر خطا بازگردانی شد'); } catch (x) {}
  }
  console.error('FATAL:', e.message);
  try { db.close(); } catch (x) {}
  process.exit(1);
});
