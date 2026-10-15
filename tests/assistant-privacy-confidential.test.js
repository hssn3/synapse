/* آزمون حریم خصوصی دانا — متنِ رکوردهای محرمانه نباید به provider بیرونی برود.
 *
 * چرا این آزمون وجود دارد: گزارش‌های خطای پزشکی با `is_confidential = 1`
 * (پیش‌فرضِ همان ستون در اسکیما) ثبت می‌شوند و «شرحِ واقعه»ی آن‌ها متنِ آزادِ
 * کاربر است. منبعِ «گزارش خطا» در ENTITY_SOURCES هم دقیقاً همان شرح را به‌عنوان
 * kind برمی‌گرداند و contextBlock آن را داخل دستورِ سیستمیِ provider می‌گذاشت —
 * یعنی شرحِ واقعه‌ی بیمار از مرزِ سامانه بیرون می‌رفت.
 *
 * مرزِ آزمون‌شده: «ارسال به بیرون». نمایشِ همان رکورد به کاربرِ مجازِ داخلی (پاسخِ
 * آفلاین، وقتی کلید/provider نیست) عمداً دست‌نخورده می‌ماند و آزمونِ چهارم
 * بودنش را می‌سنجد.
 *
 * روی یک *کپی* از دیتابیس کار می‌کند (DATA_DIR روی scratch/…) و هیچ فراخوانی
 * شبکه‌ای واقعی ندارد: fetch شبیه‌سازی و بدنه‌ی درخواست ثبت می‌شود، و base_url
 * هم روی دامنه‌ی `.invalid` است (طبق RFC 2606 هرگز قابلِ تفکیک نیست).
 *
 * اجرا:  node --test tests/assistant-privacy-confidential.test.js
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { test, before } = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

// پوشه‌ی کپی — عمداً داخل scratch/ که در .gitignore است (هیچ داده‌ی بیمارستانی
// نباید به مخزن اضافه شود).
const SCRATCH = path.join(ROOT, 'scratch', 'w7-privacy');
// این متغیر باید *پیش از* اولین requireِ لایه‌ی داده ست شود، وگرنه paths.js به
// دیتابیسِ اصلیِ مخزن قفل می‌شود و آزمون روی داده‌ی واقعی می‌نویسد.
process.env.DATA_DIR = SCRATCH;

const CONF_TOKEN = 'w7confmarker';
const OPEN_TOKEN = 'w7openmarker';
const CONF_PHRASE = 'HN7-CONF-PHRASE-شرح-واقعه-محرمانه-بیمار';
const OPEN_PHRASE = 'HN7-OPEN-PHRASE-شرح-عادی';
const CONF_CODE = 'W7-CONF-001';
const OPEN_CODE = 'W7-OPEN-001';

let ctxEngine = null;      // src/services/assistant-context — همان چیزی که می‌سنجیم
let chat = null;           // src/services/assistant-chat — نقطه‌ی ورودِ گفت‌وگو
let db = null;             // اتصال به کپی
let hospitalId = null;
let adminId = null;
let perms = [];

before(async () => {
  // ۱) کپیِ تازه‌ی دیتابیس. backup() یک عکسِ سازگار می‌دهد؛ کپیِ خامِ فایل با
  //    WALِ سرورِ در حالِ اجرا می‌توانست نیمه‌کاره باشد.
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  fs.mkdirSync(path.join(SCRATCH, 'database'), { recursive: true });
  const Database = require('better-sqlite3');
  const src = new Database(path.join(ROOT, 'database', 'hospital.db'), { readonly: true });
  await src.backup(path.join(SCRATCH, 'database', 'hospital.db'));
  src.close();

  // ۲) ماژول‌های سامانه، حالا که DATA_DIR روی کپی است
  ctxEngine = require('../src/services/assistant-context');
  chat = require('../src/services/assistant-chat');
  ({ db } = require('../src/config/database-sqlite'));

  const hosp = db.prepare("SELECT id FROM hospitals WHERE name LIKE '%نمونه شماره یک'").get();
  const admin = db.prepare("SELECT u.id, u.role_id FROM users u JOIN roles r ON r.id = u.role_id" +
    " WHERE r.code = 'admin' AND u.is_active = 1 LIMIT 1").get();
  hospitalId = hosp && hosp.id;
  adminId = admin && admin.id;
  const roleRow = db.prepare("SELECT permissions FROM roles WHERE code = 'admin'").get();
  perms = JSON.parse((roleRow && roleRow.permissions) || '[]');
  assert.ok(hospitalId && adminId, 'دیتابیسِ نمونه بیمار/کاربرِ admin ندارد');

  // ۳) دو رکوردِ ساختگی: یکی محرمانه (مقدار پیش‌فرضِ اسکیما) و یکی غیرمحرمانه.
  //    هر دو فقط با واژه‌ی یکتای خودشان پیدا می‌شوند تا آزمون بی‌نویز بماند.
  db.prepare('DELETE FROM medical_error_reports WHERE tracking_code IN (?, ?)').run(CONF_CODE, OPEN_CODE);
  const ins = db.prepare(`INSERT INTO medical_error_reports
      (id, hospital_id, error_category, description, is_confidential, tracking_code, status, severity)
      VALUES (?, ?, ?, ?, ?, ?, 'new', 'متوسط')`);
  ins.run(crypto.randomUUID(), hospitalId, 'سقوط بیمار', `${CONF_TOKEN} — ${CONF_PHRASE}`, 1, CONF_CODE);
  ins.run(crypto.randomUUID(), hospitalId, 'دارویی', `${OPEN_TOKEN} — ${OPEN_PHRASE}`, 0, OPEN_CODE);

  // ۴) تنظیماتِ دانا: provider = custom (بدون کلید لازم) و نشانیِ .invalid،
  //    پس مسیرِ provider واقعاً اجرا می‌شود ولی هیچ بسته‌ای از دستگاه بیرون نمی‌رود.
  db.prepare(`UPDATE assistant_hospital_settings
     SET provider = 'custom', model = 'w7-model', api_key = NULL,
         base_url = 'https://w7.invalid/v1', monthly_token_budget = 1000000,
         tokens_used_this_period = 0
     WHERE hospital_id = ?`).run(hospitalId);
});

function build(text) {
  return ctxEngine.buildContext({ hospitalId, userId: adminId, text, roleScope: '*', perms });
}

// ---------- ۱) شکلی که به provider می‌رود ----------
test('contextBlock: شرحِ رکوردِ محرمانه و کدِ رهگیری‌اش بیرون نمی‌رود', () => {
  const ctx = build(`${CONF_TOKEN} ایمنی`);
  const hits = (ctx.entities || []).filter(x => x.fa === 'گزارش خطا');
  assert.ok(hits.length > 0, 'رکوردِ محرمانه اصلاً بازیابی نشد — آزمون بی‌اثر می‌شد');
  const block = ctxEngine.contextBlock(ctx);
  console.log(`  ↳ رکوردهای بازیابی‌شده=${ctx.entities.length} | طولِ بلوکِ پرامپت=${block.length}`
    + ` | شاملِ شرحِ محرمانه؟ ${block.includes(CONF_PHRASE)} | شاملِ کدِ رهگیری؟ ${block.includes(CONF_CODE)}`);
  assert.equal(block.includes(CONF_PHRASE), false, 'شرحِ رکوردِ محرمانه داخل بلوکِ پرامپت است');
  assert.equal(block.includes(CONF_CODE), false, 'کدِ رهگیریِ رکوردِ محرمانه داخل بلوکِ پرامپت است');
});

test('contextBlock: رکوردِ غیرمحرمانه دست‌نخورده می‌ماند (کنترلِ غیرِتوخالی)', () => {
  const ctx = build(`${OPEN_TOKEN} ایمنی`);
  const block = ctxEngine.contextBlock(ctx);
  console.log(`  ↳ شاملِ شرحِ رکوردِ عادی؟ ${block.includes(OPEN_PHRASE)}`);
  assert.ok(block.includes(OPEN_PHRASE), 'رکوردِ غیرمحرمانه هم حذف شد — تغییر بیش از حد لازم است');
});

// ---------- ۲) شاهدِ خام: بدنه‌ی درخواستی که به provider می‌رود ----------
test('بدنه‌ی درخواستِ provider: شرحِ محرمانه در آن نیست، شرحِ عادی هست', async () => {
  const bodies = [];
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    bodies.push({ url: String(url), body: String((opts && opts.body) || '') });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        model: 'w7-model',
        choices: [{ message: { content: 'پاسخِ آزمایشیِ آزمون' } }],
        usage: { total_tokens: 7 },
      }),
    };
  };
  try {
    const args = { hospitalId, userId: adminId, roleCode: 'admin', roleLabel: 'مدیر داخلی', permissions: perms };
    const a = await chat.handleMessage({ ...args, text: `${CONF_TOKEN} ایمنی` });
    const b = await chat.handleMessage({ ...args, text: `${OPEN_TOKEN} ایمنی` });
    assert.equal(a.source, 'external', 'مسیرِ provider برای پرسشِ محرمانه اجرا نشد');
    assert.equal(b.source, 'external', 'مسیرِ provider برای پرسشِ عادی اجرا نشد');
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(bodies.length, 2);
  const [conf, open] = bodies;
  console.log(`  ↳ نشانی=${conf.url} | طولِ بدنه‌ی محرمانه=${conf.body.length}`
    + ` | شاملِ شرحِ محرمانه؟ ${conf.body.includes(CONF_PHRASE)}`
    + ` | طولِ بدنه‌ی عادی=${open.body.length} | شاملِ شرحِ عادی؟ ${open.body.includes(OPEN_PHRASE)}`);
  assert.equal(conf.body.includes(CONF_PHRASE), false, 'شرحِ محرمانه در بدنه‌ی درخواستِ provider است');
  assert.equal(conf.body.includes(CONF_CODE), false, 'کدِ رهگیریِ محرمانه در بدنه‌ی درخواستِ provider است');
  assert.ok(open.body.includes(OPEN_PHRASE), 'رکوردِ غیرمحرمانه به provider نرسید — آزمون بی‌اثر می‌شد');
});

// ---------- ۳) آفلاین: نمایشِ داخلی به کاربرِ مجاز عوض نمی‌شود ----------
test('آفلاین (بدون کلید): نمایشِ داخلی دست‌نخورده می‌ماند', async () => {
  db.prepare(`UPDATE assistant_hospital_settings
     SET provider = 'gemini', base_url = NULL, api_key = NULL WHERE hospital_id = ?`).run(hospitalId);
  const r = await chat.handleMessage({
    hospitalId, userId: adminId, roleCode: 'admin', roleLabel: 'مدیر داخلی', permissions: perms,
    text: `${CONF_TOKEN} ایمنی`,
  });
  const sha = crypto.createHash('sha256').update(r.reply).digest('hex').slice(0, 16);
  console.log(`  ↳ source=${r.source} | طول=${r.reply.length} | sha256[0:16]=${sha}`
    + ` | کدِ رهگیری هست؟ ${r.reply.includes(CONF_CODE)}`);
  assert.equal(r.source, 'internal', 'مسیرِ آفلاین انتظار می‌رفت');
  assert.ok(r.reply.includes(CONF_CODE), 'کاربرِ مجازِ داخلی باید مثل قبل رکورد را ببیند');
  assert.equal(r.reply.includes(CONF_PHRASE), false, 'شرحِ خام هرگز در پاسخِ داخلی هم نبوده');
});
