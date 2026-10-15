'use strict';
/**
 * w5-session-and-duplicate.test.js — سه آزمونِ W5 روی مسیرِ واقعیِ HTTP
 * ===========================================================================
 * چرا این فایل: بریفِ W5 سه سؤالِ رفتاری را خواسته بود که تا امروز پوشش نداشتند:
 *   ۱) نشستِ منقضی — توکنِ JWT با exp گذشته باید رد شود یا نه؟
 *   ۲) ارسالِ تکراریِ فرم — دو ثبتِ یکسان، دو رکورد می‌سازد یا گارد دارد؟
 *   ۳) ویرایشِ همزمان — «آخرین‌نویسنده برنده» است یا گاردِ نسخه/قفل وجود دارد؟
 * این سه سؤال جای «نظر» قابل تثبیت نیستند؛ پس اینجا روی همان مسیرِ واقعیِ HTTP
 * (روترهای تولید: /api/auth، /api/entry، /api/modules) اجرا و «رفتارِ امروز» قفل می‌شود.
 *
 * نتیجه‌ی واقعی که این فایل تثبیت می‌کند (شاهدش خودِ اجرای همین فایل است):
 *   ۱) گارد هست: توکنِ منقضی روی /api/auth/me و /api/dashboard → 401 «نشست منقضی شده».
 *   ۲) این حفره باز است: POST /api/forms/monthly-program/submit با همان بدنه‌ی کمینه
 *      دو بار → هر دو ۲۰۱ و دو رکوردِ جدا. هدرِ Idempotency-Key هم هیچ‌جا خوانده
 *      نمی‌شود (گشت‌وگذار در src هیچ نتیجه‌ای نداشت) → دو ثبتِ دیگر با همان هدر.
 *   ۳) آخرین‌نویسنده برنده است و هیچ گاردِ نسخه‌ای وجود ندارد: نوشتنِ دوم مقدارِ
 *      نهایی را می‌گذارد؛ نوشتنِ «کهنه» با If-Match قدیمی هم ۲۰۰ می‌گیرد. علاوه بر آن
 *      PUT جایگزینِ کامل (full replace) است، نه merge — یعنی نوشتنِ بدنه‌ی ناقص
 *      فیلدهای غایب را بی‌صدا NULL می‌کند (همان تله‌ی «از دست رفتنِ خاموشِ داده»).
 *
 * ایزولاسیونِ داده: آزمون‌ها نوشتنی‌اند (ثبت فرم + سه PUT)، پس هرگز روی
 * database/hospital.db مالک اجرا نمی‌شوند. در بالای فایل و «پیش از اولین require از
 * src» یک کپیِ لحظه‌ای با VACUUM INTO از دیتابیسِ دمو داخل scratch/w5/ ساخته می‌شود
 * (scratch/ در .gitignore است) و DATA_DIR/DB_DIR/UPLOAD_DIR روی همان کپی ست می‌شود.
 * خودِ کپی با اتصالِ read-only از دمو گرفته می‌شود: نه فایلِ دمو نوشته می‌شود و نه
 * قفل — همان روشِ توصیه‌شده‌ی SQLite برای بکاپِ امنِ یک دیتابیسِ زنده.
 *
 * ورود: مثل tests/rbac-endpoint-matrix.test.js از مسیرِ کاشی‌ایِ ورود استفاده می‌شود
 * (POST /api/entry/role-login با user_id). دلیلش این است که در دیتابیسِ دمو
 * require_password خاموش است و همین مسیرِ روزمره‌ی کارکنان در این دمو است؛ به‌علاوه
 * هیچ رمزی در این فایل به‌صورت لفظی نمی‌آید (قاعده‌ی «رمز هرگز داخل فایل/پرامت»).
 *
 * سرورِ آزمون: روی پورتِ ۳۳۵۶ بالا می‌آید (۳۳۱۱ سرورِ در حالِ اجرای مالک است و
 * هرگز لمس نمی‌شود)؛ اگر اشغال بود، خودکار روی پورتِ آزادِ سیستم می‌رود. در پایانِ
 * فایل بسته و کپی پاک می‌شود. میان‌افزارِ محدودکنندهٔ نرخ عمداً نصب نمی‌شود، چون این
 * آزمون‌ها چند درخواستِ پشت‌سرهم از یک IP می‌زنند و موضوعشان نرخ نیست.
 *
 * اجرا:
 *   & 'C:\Program Files\nodejs\node.exe' --test tests/w5-session-and-duplicate.test.js
 * (نسخه‌ی node روی PATH نسخه‌ی ۲۴ است و درایور better-sqlite3 رویش شکست می‌خورد، پس
 * مسیرِ کاملِ node 22 ضروری است.)
 *
 * داده‌ها: بیمارستان دموی ساختگی. هیچ رازی در این فایل چاپ یا ذخیره نمی‌شود؛ رازِ JWT
 * فقط از config خودِ پروژه خوانده می‌شود تا همان رازی باشد که سرورِ آزمون امضا می‌کند.
 */
const fs = require('fs');
const path = require('path');
const { once } = require('node:events');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEMO_DB = path.join(REPO_ROOT, 'database', 'hospital.db');
// پورتِ اختصاصی این واحد؛ ۳۳۱۱ پورتِ سرورِ در حالِ اجرای مالک است.
const PORT = Number(process.env.W5_TEST_PORT || 3356);
const ADMIN_USERNAME = 'hospital3_admin'; // حسابِ دموی ساختگی — نام، نه راز

// ---------------------------------------------------------------------------
// ۱) ایزولاسیونِ داده — باید پیش از هر require از src اتفاق بیفتد، چون
//    src/config/paths.js مسیرها را همان لحظه‌ی require می‌خواند.
// ---------------------------------------------------------------------------
const DATA_ROOT = path.join(REPO_ROOT, 'scratch', 'w5', `session-dup-${process.pid}`);
const DATA_DIR_DB = path.join(DATA_ROOT, 'database');
const DATA_DB = path.join(DATA_DIR_DB, 'hospital.db');

// DATA_DIR/DB_DIR/UPLOAD_DIR/BACKUP_DIR هر چهارتا صریح ست می‌شوند: dotenv مقادیرِ
// از قبل ست‌شده را بازنویسی نمی‌کند، پس یک .env محلی هم نمی‌تواند داده‌ی آزمون را
// به پوشه‌ی واقعی برگرداند. گاردِ fail-closed در before() همین را تأیید می‌کند.
process.env.DATA_DIR = DATA_ROOT;
process.env.DB_DIR = DATA_DIR_DB;
process.env.UPLOAD_DIR = path.join(DATA_ROOT, 'uploads');
process.env.BACKUP_DIR = path.join(DATA_ROOT, 'backups');

function prepareIsolatedCopy() {
  if (!fs.existsSync(DEMO_DB)) {
    throw new Error(`دیتابیسِ دمو پیدا نشد: ${DEMO_DB} — اول «npm run demo-restore» را اجرا کنید.`);
  }
  // پوشه‌ی هم‌نام از اجرای قبلی (اگر همان pid دوباره استفاده شده باشد) پاک می‌شود؛
  // اگر فایلِ رهاشده‌ای روی ویندوز قفل باشد، نامِ پوشهٔ pid-محور جلوی تداخل را می‌گیرد.
  try { fs.rmSync(DATA_ROOT, { recursive: true, force: true }); } catch (e) { /* بهترین تلاش */ }
  fs.mkdirSync(DATA_DIR_DB, { recursive: true });
  fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
  const Database = require('better-sqlite3');
  const src = new Database(DEMO_DB, { readonly: true });
  try {
    // مسیر با اسلشِ رو به جلو داده می‌شود: SQLite روی ویندوز هر دو را می‌پذیرد و
    // دیگر نیازی به escape کردنِ بک‌اسلش در رشته‌ی SQL نیست.
    src.exec(`VACUUM INTO '${DATA_DB.replace(/\\/g, '/').replace(/'/g, "''")}'`);
  } finally {
    src.close();
  }
}
prepareIsolatedCopy();

/** همان اتصالِ دیتابیسِ اپ، ولی روی کپی (سرورِ آزمون هم در همین پروسه بالا می‌آید). */
function db() {
  return require('../src/config/database-sqlite').db;
}

function cookiesFrom(res, name) {
  const all = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')];
  const hit = all.map((c) => String(c || '').split(';')[0]).find((c) => c.startsWith(name + '='));
  if (!hit) throw new Error(`کوکیِ ${name} در پاسخ نبود`);
  return hit;
}

let server = null;
let base = '';
let sid = ''; // کوکیِ نشستِ ادمین برای آزمون‌های نوشتنیِ ۲ و ۳

async function req(method, urlPath, { cookie, body, headers } = {}) {
  const res = await fetch(base + urlPath, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...(headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* پاسخِ غیر-JSON */ }
  return { status: res.status, json, text };
}

async function listen(app, port) {
  const s = app.listen(port, '127.0.0.1');
  try {
    await once(s, 'listening');
  } catch (err) {
    try { s.close(); } catch (e) { /* بی‌اهمیت */ }
    if (err && err.code === 'EADDRINUSE' && port !== 0) return listen(app, 0);
    throw err;
  }
  return s;
}

describe('W5 — نشستِ منقضی، ارسالِ تکراریِ فرم، ویرایشِ همزمان (HTTP واقعی، روی کپیِ دمو)', () => {
  before(async () => {
    // گاردِ fail-closed: اگر مسیرِ دیتابیس روی کپی نایستاده باشد، همین‌جا می‌ترکد و
    // هیچ نوشتنی روی دیتابیسِ دموی مالک انجام نمی‌شود.
    const { dbPath } = require('../src/config/paths');
    assert.equal(
      path.resolve(dbPath),
      path.resolve(DATA_DB),
      'لایه‌ی ایزولاسیون شکست خورد: مسیرِ دیتابیس روی کپیِ scratch/w5 نیست — آزمون متوقف می‌شود'
    );

    require('express-async-errors');
    const express = require('express');
    const cookieParser = require('cookie-parser');
    const app = express();
    app.use(cookieParser());
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));
    // همان سیم‌کشیِ src/app.js برای روترهای واقعی
    app.use('/api/auth', require('../src/routes/auth'));
    app.use('/api/entry', require('../src/routes/entry'));
    app.use('/api', require('../src/modules'));

    server = await listen(app, PORT);
    base = `http://127.0.0.1:${server.address().port}`;

    const adminId = db().prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME).id;
    // ورودِ کاشی‌ای (همان الگوی tests/rbac-endpoint-matrix.test.js): در دیتابیسِ دمو
    // require_password خاموش است، پس ورود با user_id جواب می‌دهد. اگر این مسیر ۲۰۰
    // ندهد کلِ فایل باید بترکد — نه اینکه آزمون‌ها با نشستِ جعلی سبز شوند.
    const login = await fetch(base + '/api/entry/role-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: adminId }),
    });
    assert.equal(login.status, 200, `ورودِ کاشی‌ای ${ADMIN_USERNAME} باید ۲۰۰ بدهد`);
    const cookieName = require('../src/config/app').jwt.cookieName;
    sid = cookiesFrom(login, cookieName);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    try { require('../src/config/database-sqlite').db.close(); } catch (e) { /* بی‌اهمیت */ }
    try { fs.rmSync(DATA_ROOT, { recursive: true, force: true }); } catch (e) { /* ویندوز ممکن است فایل را باز نگه دارد */ }
  });

  // =========================================================================
  // ۱) انقضای نشست — گارد هست
  // =========================================================================
  it('۱) نشستِ منقضی: توکنِ JWT با exp گذشته روی مسیرِ محافظت‌شده ۴۰۱ می‌گیرد (گارد هست)', async () => {
    const jwt = require('jsonwebtoken');
    const config = require('../src/config/app');
    const adminId = db().prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME).id;
    const cookieName = config.jwt.cookieName;

    // راز همان رازی است که خودِ سرورِ آزمون امضا می‌کند (config پروژه). مقدارش هرگز
    // چاپ یا ذخیره نمی‌شود؛ فقط برای «امضای معتبر» استفاده می‌شود.
    const freshToken = jwt.sign({ id: adminId }, config.jwt.secret, { expiresIn: '8h' });
    const expiredToken = jwt.sign({ id: adminId }, config.jwt.secret, { expiresIn: -60 });

    // کنترل: با توکنِ تازه، همان مسیر ۲۰۰ می‌دهد. بدون این کنترل، ۴۰۱ پایین می‌توانست
    // از هر چیزِ بی‌ربطی (مسیرِ اشتباه، کاربرِ ناشناس) بیاید نه از انقضا.
    const ok = await req('GET', '/api/auth/me', { cookie: `${cookieName}=${freshToken}` });
    assert.equal(ok.status, 200, 'توکنِ تازه باید ۲۰۰ بدهد (کنترلِ آزمون)');
    assert.equal(ok.json.user.username, ADMIN_USERNAME);

    const expiredMe = await req('GET', '/api/auth/me', { cookie: `${cookieName}=${expiredToken}` });
    assert.equal(expiredMe.status, 401, 'توکنِ منقضی باید ۴۰۱ بدهد');
    // پیام باید شاخه‌ی انقضا باشد؛ اگر روزی این پیام عوض شود، قفلِ آزمون می‌شکند و
    // بازبین می‌فهمد رفتارِ گارد تغییر کرده — همان چیزی که این فایل می‌خواهد تثبیت کند.
    assert.match(String(expiredMe.json && expiredMe.json.error), /منقضی/, 'پیامِ ۴۰۱ باید «نشست منقضی شده» باشد');

    // مسیرِ محافظت‌شده‌ی دوم، تا «۴۰۱» فقط به یک endpoint خاص گره نخورد.
    const expiredDash = await req('GET', '/api/dashboard', { cookie: `${cookieName}=${expiredToken}` });
    assert.equal(expiredDash.status, 401, 'توکنِ منقضی روی /api/dashboard هم باید ۴۰۱ بدهد');
  });

  // =========================================================================
  // ۲) ارسالِ تکراریِ فرم — این حفره باز است
  // =========================================================================
  it('۲) ارسالِ تکراریِ فرم: دو ثبتِ یکسان با همان بدنه دو رکورد می‌سازد — این حفره باز است', async () => {
    const form = db().prepare("SELECT id, slug FROM forms WHERE slug = 'monthly-program'").get();
    assert.ok(form, 'فرمِ monthly-program باید در کپیِ دمو باشد');
    const published = db().prepare(
      "SELECT schema_json FROM form_versions WHERE form_id = ? AND status = 'published' ORDER BY version_number DESC LIMIT 1"
    ).get(form.id);
    assert.ok(published, 'فرم باید نسخه‌ی منتشرشده داشته باشد');

    // بدنه‌ی کمینه = فقط سه فیلدِ required اسکیمای منتشرشده: ward_name، month_jalali،
    // head_nurse_notes (مقادیر enum از خودِ اسکیما). اعتبارِ آن با پذیرشِ ۲۰۱ سرور تأیید می‌شود.
    const schema = JSON.parse(published.schema_json);
    assert.deepEqual(schema.required, ['ward_name', 'month_jalali', 'head_nurse_notes']);
    const marker = `W5-DUP-${Date.now()}`; // نشانگرِ یکتا تا شمارشِ رکوردها دقیق باشد
    const body = {
      ward_name: schema.properties.ward_name.enum[0],
      month_jalali: schema.properties.month_jalali.enum[0],
      head_nurse_notes: marker,
    };

    const count = () => db().prepare(
      'SELECT COUNT(*) AS n FROM form_submissions WHERE form_id = ? AND data_json LIKE ?'
    ).get(form.id, `%${marker}%`).n;

    const before = count();
    const first = await req('POST', `/api/forms/${form.slug}/submit`, { cookie: sid, body });
    const second = await req('POST', `/api/forms/${form.slug}/submit`, { cookie: sid, body });
    assert.equal(first.status, 201, 'ثبتِ اول باید ۲۰۱ بدهد');
    assert.equal(second.status, 201, 'ثبتِ دوم با همان بدنه هم ۲۰۱ می‌دهد (لایه‌ی گاردی وجود ندارد)');
    assert.notEqual(first.json.submissionId, second.json.submissionId, 'دو ثبت، دو شناسه‌ی جدا گرفتند');
    assert.equal(count(), before + 2, 'حفره‌ی تکراری‌بودن باز است: هر دو ارسال یک رکورد تازه ساختند');

    // لایه‌ی دومِ همان حفره: هدرِ Idempotency-Key. کد این مخزن هیچ‌جا این هدر را
    // نمی‌خواند، پس دو ارسالِ دیگر با هدرِ یکسان هم دو رکوردِ تازه می‌سازد. اگر روزی
    // گاردی اضافه شود این assertion می‌شکند — همان سیگنالِ درست برای بازبین.
    const keyed1 = await req('POST', `/api/forms/${form.slug}/submit`, {
      cookie: sid, body, headers: { 'idempotency-key': `w5-key-${marker}` },
    });
    const keyed2 = await req('POST', `/api/forms/${form.slug}/submit`, {
      cookie: sid, body, headers: { 'idempotency-key': `w5-key-${marker}` },
    });
    assert.equal(keyed1.status, 201, 'ثبت با Idempotency-Key باید ۲۰۱ بدهد');
    assert.equal(keyed2.status, 201, 'ثبتِ تکراری با همان Idempotency-Key هم ۲۰۱ می‌دهد (هدر بی‌اثر است)');
    assert.equal(count(), before + 4, 'هدرِ Idempotency-Key هیچ محافظتی نمی‌دهد: چهار رکورد ساخته شد');
  });

  // =========================================================================
  // ۳) ویرایشِ همزمان — آخرین‌نویسنده برنده، بدون هیچ گاردِ نسخه
  // =========================================================================
  it('۳) ویرایشِ همزمان: مقدارِ نوشته‌ی دوم می‌ماند و گاردِ نسخه (If-Match) وجود ندارد', async () => {
    const wastePath = '/api/safety/waste';
    const readRow = async (id) => {
      const list = await req('GET', `${wastePath}?per_page=200`, { cookie: sid });
      assert.equal(list.status, 200, 'فهرستِ پسماند باید ۲۰۰ بدهد');
      const found = ((list.json && list.json.items) || []).find((x) => x.id === id);
      assert.ok(found, `رکوردِ ${id} در فهرستِ پسماند پیدا نشد`);
      return found;
    };

    // رکوردِ آزمون روی کپی ساخته می‌شود (نه روی دیتابیسِ دمو).
    const create = await req('POST', wastePath, {
      cookie: sid,
      body: { log_date: '1405-07-01', total_waste_kg: 11, infectious_kg: 2, operator_name: 'W5-CREATE' },
    });
    assert.equal(create.status, 200, 'ساختِ رکوردِ پسماند باید ۲۰۰ بدهد');
    const id = create.json.item.id;

    // دو به‌روزرسانیِ سریعِ پشت‌سرهم با بدنه‌ی کامل (فقط مقدارِ فیلدها فرق دارد).
    const a = await req('PUT', `${wastePath}/${id}`, {
      cookie: sid,
      body: { log_date: '1405-07-01', total_waste_kg: 11, infectious_kg: 2, operator_name: 'W5-WRITER-A' },
    });
    const b = await req('PUT', `${wastePath}/${id}`, {
      cookie: sid,
      body: { log_date: '1405-07-01', total_waste_kg: 22, infectious_kg: 3, operator_name: 'W5-WRITER-B' },
    });
    assert.equal(a.status, 200, 'به‌روزرسانیِ A باید ۲۰۰ بدهد');
    assert.equal(b.status, 200, 'به‌روزرسانیِ B باید ۲۰۰ بدهد');

    // انتظارِ اصلیِ بریف: حالتِ نهایی باید مقدارِ نوشته‌ی دوم (B) باشد.
    const finalRow = await readRow(id);
    assert.equal(finalRow.operator_name, 'W5-WRITER-B', 'آخرین‌نویسنده باید برنده باشد');
    assert.equal(finalRow.total_waste_kg, 22, 'مقدارِ نهایی باید از نوشته‌ی دوم بیاید');

    // حفره‌ی همراه: نوشتنِ «کهنه» — بدنه‌ی دارای updated_at قدیمی به‌همراه هدرِ If-Match
    // قدیمی — هم ۲۰۰ می‌گیرد و روی داده می‌نویسد. یعنی هیچ قفلِ خوش‌بینانه/گاردِ نسخه‌ای
    // نیست و دو تبِ هم‌زمانِ یک کاربر می‌توانند بی‌صدا روی هم بنویسند.
    const stale = await req('PUT', `${wastePath}/${id}`, {
      cookie: sid,
      headers: { 'if-match': '"2000-01-01 00:00:00"' },
      body: { log_date: '1405-07-01', total_waste_kg: 33, infectious_kg: 4, operator_name: 'W5-STALE', updated_at: '2000-01-01 00:00:00' },
    });
    assert.equal(stale.status, 200, 'نوشتنِ کهنه با If-Match قدیمی رد نمی‌شود (گاردِ نسخه وجود ندارد)');
    assert.equal((await readRow(id)).operator_name, 'W5-STALE', 'نوشته‌ی کهنه روی داده نشست — آخرین‌نویسنده برنده است');

    // تله‌ی دومِ همان مکانیزم: PUT جایگزینِ کامل است، نه merge. بدنه‌ای که یک فیلد را
    // جا بیندازد، آن فیلد را بی‌صدا NULL می‌کند — از دیدِ کاربر یعنی «داده پاک شد» بدون
    // هیچ خطایی. این هم بخشی از رفتارِ امروزِ ویرایشِ همزمان است و همین‌جا قفل می‌شود.
    const partial = await req('PUT', `${wastePath}/${id}`, {
      cookie: sid,
      body: { log_date: '1405-07-01', total_waste_kg: 44 },
    });
    assert.equal(partial.status, 200, 'به‌روزرسانیِ ناقص هم ۲۰۰ می‌گیرد (بدونِ هیچ هشداری)');
    const afterPartial = await readRow(id);
    assert.equal(afterPartial.total_waste_kg, 44, 'فیلدِ ارسال‌شده نوشته شد');
    assert.equal(afterPartial.operator_name, null, 'فیلدِ غایبِ بدنه بی‌صدا NULL شد (جایگزینِ کامل، نه merge)');
    assert.equal(afterPartial.infectious_kg, null, 'فیلدِ غایبِ دوم هم NULL شد');
  });
});
