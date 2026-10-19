/* =====================================================================
   نمونه‌ی کاملِ سه‌ماهه‌ی اول — بیمارستان نمونه
   ---------------------------------------------------------------------
   هدف: وقتی سامانه را جلوی خریدار باز می‌کنیم، سه‌ماهه‌ی اولِ سال ۱۴۰۵
   باید «واقعاً کار شده» به‌نظر برسد: شاخص‌ها ماهانه ثبت شده باشند، کمیته‌ها
   جلسه گرفته و مصوبه داشته باشند، چک‌لیست اجرا شده باشد، خطا گزارش شده
   باشد، برنامه‌ی بهبود و نیازسنجی آموزشی وجود داشته باشد.

   قاعده‌های این فایل:
   - idempotent است: اجرای دوباره باید صفر ردیف اضافه کند. کلید یکتاییِ
     هر بخش صریحاً چک می‌شود، نه با «اگر جدول خالی بود».
   - تاریخ‌ها میلادیِ ISO ذخیره می‌شوند (قرارداد موجود سامانه)، ولی از روی
     تاریخ جلالی حساب می‌شوند تا واقعاً داخل سه‌ماهه‌ی اول ۱۴۰۵ بیفتند.
   - داده‌ی نمونه با is_example=1 علامت می‌خورد هرجا ستونش وجود دارد.
   - هیچ نام واقعیِ شخصی ساخته نمی‌شود؛ فقط عنوان سمت (خواسته‌ی صریح کاربر).
   ===================================================================== */
'use strict';

const crypto = require('crypto');
const { query } = require('../src/config/database');
const { toGregorian } = require('../src/config/jalali');

const uid = () => crypto.randomUUID();

// تاریخ جلالی → رشته‌ی میلادیِ ISO، همان قالبی که بقیه‌ی جدول‌ها دارند
function g(jy, jm, jd) {
  const d = toGregorian(jy, jm, jd);
  return `${d.gy}-${String(d.gm).padStart(2, '0')}-${String(d.gd).padStart(2, '0')}`;
}

const YEAR = 1405;                      // سالِ دوره‌ی فعال بیمارستان نمونه
const Q1 = [1, 2, 3];                   // فروردین، اردیبهشت، خرداد

function colExists(table, col) {
  try { return query(`PRAGMA table_info(${table})`).rows.some(c => c.name === col); }
  catch (e) { return false; }
}
function safeJson(v) {
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; }
}
const safeLen = (v) => safeJson(v).length;
function count(sql, params) {
  try { return query(sql, params).rows[0].c; } catch (e) { return -1; }
}

function seedQuarterOneSample() {
  // بیمارستانِ هدف: همان مرکزی که دوره‌ی فعالِ سال ۱۴۰۵ دارد.
  const hosp = query(
    `SELECT h.id, h.name FROM hospitals h
       JOIN accreditation_periods p ON p.hospital_id = h.id AND p.is_active = 1
      WHERE h.is_active = 1 AND p.start_year = ?
      ORDER BY h.created_at LIMIT 1`, [YEAR]).rows[0];
  if (!hosp) { console.log('[seed-q1] هیچ بیمارستانی با دوره‌ی فعال ۱۴۰۵ نیست — رد شد'); return; }
  const HID = hosp.id;

  // اصلاح یک باگ نسخه‌ی قبلی: management_walkarounds.status فقط planned/done/closed
  // معتبر است (WA_STATUSES در app.js)، ولی این فایل یک ردیف را با 'in_progress' ساخته
  // بود که هرگز مقدار معتبری برای وضعیتِ خودِ بازدید نبوده (آن مقدار مخصوص وضعیت
  // مصوبه‌هاست، نه خودِ بازدید) — روی سایت زنده به‌صورت کد خام «in_progress» ترجمه‌نشده
  // به کاربر نشان داده می‌شد. بازدیدی که این وضعیت را دارد در واقع برگزار شده، پس 'done'.
  query("UPDATE management_walkarounds SET status='done' WHERE hospital_id=? AND status='in_progress'", [HID]);

  // همین باگ در برنامه‌های بهبود هم بود: این فایل status را با کدهای انگلیسی
  // ('in_progress'/'completed'/'proposed') ساخته بود، درحالی‌که واژگان معتبرِ
  // improvement_programs.status رشته‌ی فارسی است (PROG_STATUS_FA در app.js،
  // همان چیزی که مسیر API خودش موقع ساخت رکورد جدید می‌نویسد) — نتیجه: کد خام
  // انگلیسی به‌جای برچسب فارسی روی صفحه‌ی «برنامه‌های بهبود» نشان داده می‌شد.
  query("UPDATE improvement_programs SET status='در_حال_اجرا' WHERE hospital_id=? AND status='in_progress'", [HID]);
  query("UPDATE improvement_programs SET status='تکمیل‌شده' WHERE hospital_id=? AND status='completed'", [HID]);
  query("UPDATE improvement_programs SET status='پیشنهاد_شده' WHERE hospital_id=? AND status='proposed'", [HID]);

  // همین باگ در نیازسنجی آموزشی هم بود: کدهای انگلیسی approved/pending_superior/
  // pending_org/rejected به‌جای واژگان معتبر TRN_STATUS_FA (ثبت_شده/بررسی_مافوق/
  // تأییدشده/رد_شده در app.js) نوشته شده بود.
  query("UPDATE training_needs SET status='تأییدشده' WHERE hospital_id=? AND status='approved'", [HID]);
  query("UPDATE training_needs SET status='ثبت_شده' WHERE hospital_id=? AND status='pending_superior'", [HID]);
  query("UPDATE training_needs SET status='بررسی_مافوق' WHERE hospital_id=? AND status='pending_org'", [HID]);
  query("UPDATE training_needs SET status='رد_شده' WHERE hospital_id=? AND status='rejected'", [HID]);

  // همین باگ در وظایف کارتابل (tasks) هم بود: کدهای معتبر assigned/in_progress/
  // completed/overdue است (src/routes/api.js، هم در آمار داشبورد و هم در فیلتر
  // کارتابل status != 'completed')؛ 'pending'/'done' هیچ‌کدام نیست، پس یک وظیفه‌ی
  // واقعاً تمام‌شده با status='done' هرگز از فهرست «در انتظار اقدام شما» بیرون
  // نمی‌رفت (چون فیلتر فقط دقیقاً 'completed' را حذف می‌کند).
  query("UPDATE tasks SET status='assigned' WHERE hospital_id=? AND status='pending'", [HID]);
  query("UPDATE tasks SET status='completed' WHERE hospital_id=? AND status='done'", [HID]);

  // یک کاربر برای ستون‌های *_by. سمت مدیر اعتباربخشی/مدیر داخلی اولویت دارد.
  const actor = query(
    `SELECT u.id FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.hospital_id = ?
      ORDER BY CASE r.code WHEN 'accreditation_manager' THEN 0 WHEN 'hospital_admin' THEN 1
                           WHEN 'hospital_president' THEN 2 ELSE 9 END LIMIT 1`, [HID]).rows[0];
  if (!actor) { console.log('[seed-q1] کاربری برای این بیمارستان نیست — رد شد'); return; }
  const BY = actor.id;

  let added = 0;

  /* ---------- ۱) کارت امتیازی متوازن: مقدار ماهانه‌ی هر شاخص در Q1 ---------- */
  // الگوی مقادیر عمداً «کاملِ بی‌نقص» نیست: یک شاخص زیر تارگت می‌ماند تا
  // داشبورد چیزی برای نشان‌دادن داشته باشد و دمو واقع‌گرایانه بماند.
  const KPI_SERIES = {
    'درصد اشغال تخت':                       [68.4, 71.2, 74.6],
    'میانگین مدت اقامت بیمار':              [3.6, 3.4, 3.1],
    'درصد رضایت گیرنده خدمت':               [84.5, 87.2, 88.9],
    'میانگین ساعت آموزش به ازای هر کارمند': [1.5, 2.2, 3.4]
  };
  const KPI_NOTES = {
    'درصد اشغال تخت': ['فروردین به‌دلیل تعطیلات نوروز پایین‌تر از میانگین سال.',
      'روند صعودی با بازگشایی کامل بخش جراحی.', 'نزدیک‌شدن به تارگت ۷۵ درصد.'],
    'میانگین مدت اقامت بیمار': ['پایه‌ی ابتدای سال.',
      'کاهش با اجرای فرایند ترخیص زودهنگام.', 'در محدوده‌ی مطلوب قرار گرفت.'],
    'درصد رضایت گیرنده خدمت': ['۱۰ نظرسنجی تکمیل‌شده؛ بیشترین شکایت از زمان انتظار پذیرش.',
      'بهبود پس از افزایش باجه‌ی پذیرش در شیفت صبح.',
      'همچنان زیر تارگت ۹۰ درصد — موضوع به کمیته‌ی پایش کیفیت ارجاع شد.'],
    'میانگین ساعت آموزش به ازای هر کارمند': ['شروع برنامه‌ی آموزشی سال.',
      'دو دوره‌ی احیای قلبی‌ریوی برگزار شد.',
      'تجمعی سه‌ماهه ۷.۱ ساعت؛ برای رسیدن به ۲۰ ساعت سالانه در مسیر است.']
  };
  // روی دیتابیس تازه، این مرکز هنوز هیچ شاخصی ندارد: seed-bsc زودتر از ساخته‌شدن
  // بیمارستان نمونه اجرا می‌شود، پس فقط ستون‌ها را اضافه می‌کند و ردیفی برای این
  // مرکز نمی‌سازد. نتیجه‌اش این بود که روی Railway هر ۱۲ مقدار ماهانه بی‌صدا رد
  // می‌شد و صفحه‌ی کارت امتیازی خالی می‌ماند. پس اگر شاخص‌ها نبودند، خودمان
  // می‌سازیم — همان چهار وجه استاندارد BSC.
  const KPI_DEFS = [
    { t: 'درصد اشغال تخت', p: 'مالی', u: 'درصد', tv: 75, hb: 1,
      d: 'نسبت تخت‌روز اشغالی به تخت‌روز فعال در ماه — شاخص بهره‌وری ظرفیت بستری.' },
    { t: 'میانگین مدت اقامت بیمار', p: 'فرآیندهای داخلی', u: 'روز', tv: 3, hb: 0,
      d: 'مجموع روزهای بستری تقسیم بر تعداد بیماران ترخیص‌شده در ماه.' },
    { t: 'درصد رضایت گیرنده خدمت', p: 'گیرنده خدمت', u: 'درصد', tv: 90, hb: 1,
      d: 'میانگین امتیاز پرسشنامه‌ی رضایت‌سنجی، تبدیل‌شده به مقیاس صد.' },
    { t: 'میانگین ساعت آموزش به ازای هر کارمند', p: 'رشد و یادگیری', u: 'ساعت', tv: 20, hb: 1,
      d: 'مجموع نفر-ساعت آموزش برگزارشده تقسیم بر تعداد کل کارکنان.' }
  ];
  for (const k of KPI_DEFS) {
    if (count('SELECT COUNT(*) c FROM hospital_kpis WHERE hospital_id=? AND title=?', [HID, k.t]) !== 0) continue;
    query(`INSERT INTO hospital_kpis
             (id, hospital_id, title, definition, target_value, is_active,
              bsc_perspective, unit, higher_is_better, created_at)
           VALUES (?,?,?,?,?,1,?,?,?,datetime('now'))`,
      [uid(), HID, k.t, k.d, k.tv, k.p, k.u, k.hb]);
    added++;
  }

  const kpis = query('SELECT id, title FROM hospital_kpis WHERE hospital_id = ?', [HID]).rows;
  for (const k of kpis) {
    const series = KPI_SERIES[k.title];
    if (!series) continue;
    Q1.forEach((m, i) => {
      const dup = count(
        'SELECT COUNT(*) c FROM bsc_monthly_values WHERE hospital_id=? AND kpi_id=? AND jalali_year=? AND jalali_month=?',
        [HID, k.id, YEAR, m]);
      if (dup !== 0) return;
      query(`INSERT INTO bsc_monthly_values
               (id, hospital_id, kpi_id, jalali_year, jalali_month, value, note, recorded_by, recorded_at)
             VALUES (?,?,?,?,?,?,?,?,?)`,
        [uid(), HID, k.id, YEAR, m, series[i], (KPI_NOTES[k.title] || [])[i] || null, BY,
         g(YEAR, m, 28)]);
      added++;
    });
  }

  /* ---------- ۲) جلسه‌های کمیته در تقویم + صورت‌جلسه و مصوبه ---------- */
  // چهار کمیته‌ی پرکار، هرکدام یک جلسه در هر ماهِ سه‌ماهه‌ی اول.
  const MEET = [
    { c: 'پایش و سنجش کیفیت', day: 12, from: '10:00', to: '11:30',
      agenda: ['بررسی درصد پیشرفت سنجه‌های محور رهبری و مدیریت',
               'گزارش شاخص‌های کارت امتیازی متوازن سه‌ماهه‌ی اول',
               'وضعیت اجرای برنامه‌های بهبود مصوب سال گذشته'],
      dec: ['شاخص رضایت گیرنده خدمت زیر تارگت است؛ دفتر بهبود کیفیت تا پایان تیر تحلیل علت را ارائه کند.',
            'برای هر محورِ زیر ۷۰ درصد پیشرفت، یک مسئول پیگیری با مهلت مشخص تعیین شود.',
            'گزارش سه‌ماهه به ریاست بیمارستان ارسال گردد.'] },
    { c: 'کنترل عفونت', day: 18, from: '09:00', to: '10:30',
      agenda: ['گزارش پایش بهداشت دست در بخش‌های بستری',
               'بررسی موارد عفونت مرتبط با کاتتر',
               'وضعیت موجودی محلول‌های ضدعفونی'],
      dec: ['پایش بهداشت دست در بخش‌های ویژه به‌صورت هفتگی انجام شود.',
            'فرم مراقبت روزانه‌ی کاتتر در همه‌ی بخش‌های بستری اجباری شود.',
            'کارشناس کنترل عفونت گزارش ماهانه را به کمیته ارائه کند.'] },
    { c: 'دارو و تجهیزات پزشکی', day: 22, from: '11:00', to: '12:30',
      agenda: ['بررسی داروهای پرخطر و نحوه‌ی نگهداری آن‌ها',
               'وضعیت کالیبراسیون تجهیزات پزشکی',
               'گزارش داروهای نزدیک به انقضا'],
      dec: ['برچسب‌گذاری داروهای پرخطر در همه‌ی بخش‌ها تا پایان اردیبهشت تکمیل شود.',
            'برنامه‌ی کالیبراسیون سالانه تدوین و به واحد تجهیزات ابلاغ گردد.'] },
    { c: 'اخلاق پزشکی و رفتار حرفه‌ای', day: 26, from: '13:00', to: '14:30',
      agenda: ['بررسی شکایات دریافتی از گیرندگان خدمت',
               'وضعیت رضایت‌نامه‌های آگاهانه در بخش جراحی'],
      dec: ['فرم رضایت آگاهانه‌ی بازنگری‌شده از ابتدای خرداد در بخش جراحی استفاده شود.',
            'موارد شکایت با موضوع «نحوه‌ی برخورد» به سوپروایزر بالینی ارجاع شود.'] }
  ];
  // شرح مباحث (بند ۴ سنجه‌ی الف-۱-۵-۲) و محل برگزاری (بند ۱). بدون این‌ها
  // صورت‌جلسه‌ی نمونه خودش نمونه‌ی ناقصی می‌شد و در ستون «کامل بودن» هشدار می‌گرفت.
  const MEET_DISC = {
    'پایش و سنجش کیفیت':
      'دفتر بهبود کیفیت درصد پیشرفت هر محور را ارائه کرد. اعضا بر این نکته توافق داشتند که محورهای با پیشرفت زیر ۷۰ درصد بیشتر از آن‌که مشکل منابع داشته باشند، مسئول پیگیریِ مشخص ندارند. درباره‌ی شاخص رضایت گیرنده خدمت بحث شد که افت آن با زمان انتظار پذیرش سرپایی هم‌زمان بوده و پیش از هر اقدامی باید تحلیل علت انجام شود.',
    'کنترل عفونت':
      'کارشناس کنترل عفونت نتیجه‌ی پایش بهداشت دست را به تفکیک بخش ارائه کرد؛ پایین‌ترین رعایت مربوط به شیفت شب بخش‌های ویژه بود. درباره‌ی موارد عفونت مرتبط با کاتتر مطرح شد که ثبت مراقبت روزانه در همه‌ی بخش‌ها یکسان نیست و همین مقایسه را ناممکن کرده است. موجودی محلول‌های ضدعفونی کافی گزارش شد.',
    'دارو و تجهیزات پزشکی':
      'فهرست داروهای پرخطر و نحوه‌ی نگهداری آن‌ها در بخش‌ها بررسی شد؛ در دو بخش برچسب‌گذاری استاندارد انجام نشده بود. درباره‌ی کالیبراسیون مطرح شد که برنامه‌ی مدونی وجود ندارد و اقدام‌ها موردی است. فهرست داروهای نزدیک به انقضا ارائه و مقرر شد گردش آن‌ها با انبار هماهنگ شود.',
    'اخلاق پزشکی و رفتار حرفه‌ای':
      'شکایات دریافتی از گیرندگان خدمت دسته‌بندی شد؛ بیشترین فراوانی مربوط به «نحوه‌ی برخورد» بود. درباره‌ی رضایت‌نامه‌های آگاهانه در بخش جراحی مطرح شد که نسخه‌ی در حال استفاده بازنگری‌شده نیست و برخی بندهای آن برای بیمار قابل فهم نبوده است.',
  };
  const MIN_LOCATION = 'سالن جلسات — طبقه دوم';
  const rooms = query('SELECT id, name FROM committee_meeting_rooms WHERE hospital_id = ? ORDER BY name', [HID]).rows;
  const hasMinuteExample = colExists('committee_meeting_minutes', 'is_example');

  for (let ci = 0; ci < MEET.length; ci++) {
    const spec = MEET[ci];
    const com = query('SELECT id, name FROM committees WHERE hospital_id = ? AND name = ?', [HID, spec.c]).rows[0];
    if (!com) continue;
    for (const m of Q1) {
      const date = g(YEAR, m, spec.day);
      const room = rooms.length ? rooms[ci % rooms.length] : null;

      // رویداد تقویم
      const evDup = count(
        "SELECT COUNT(*) c FROM calendar_events WHERE hospital_id=? AND committee_id=? AND event_date=? AND event_type='committee_meeting'",
        [HID, com.id, date]);
      if (evDup === 0) {
        query(`INSERT INTO calendar_events
                 (id, hospital_id, title, description, event_date, is_recurring, event_type,
                  committee_id, room_id, start_time, end_time, created_by, created_at)
               VALUES (?,?,?,?,?,0,'committee_meeting',?,?,?,?,?,datetime('now'))`,
          [uid(), HID, `جلسه‌ی کمیته‌ی ${com.name}`,
           `جلسه‌ی ماهانه‌ی کمیته‌ی ${com.name} — سه‌ماهه‌ی اول ${YEAR}`,
           date, com.id, room ? room.id : null, spec.from, spec.to, BY]);
        added++;
      }

      // صورت‌جلسه
      const mnDup = count('SELECT COUNT(*) c FROM committee_meeting_minutes WHERE committee_id=? AND meeting_date=?',
        [com.id, date]);
      if (mnDup === 0) {
        const nextM = m < 12 ? m + 1 : 1;
        const nextY = m < 12 ? YEAR : YEAR + 1;
        // آرایه‌ی JSON، نه متنِ چندخطی: رابط کاربری و روت هر دو آرایه می‌خوانند و
        // نسخه‌ی قبلیِ این seed متن می‌نوشت، پس ستون‌های «دستور کار» و «مصوبات»
        // برای همه‌ی صورت‌جلسه‌های نمونه خالی دیده می‌شد.
        const cols = ['id', 'committee_id', 'meeting_date', 'attendees', 'agenda_items',
                      'decisions', 'next_meeting_date', 'created_by'];
        const vals = [uid(), com.id, date,
          JSON.stringify([{ user_id: null, name: 'اعضای ثابت کمیته طبق ابلاغ' }]),
          JSON.stringify(spec.agenda),
          // مصوبه با مسئول پیگیری و مهلت (بند ۵ سنجه) — مهلت پایان همان ماه.
          JSON.stringify(spec.dec.map(d => ({
            what: d, responsible_user_id: null, responsible_name: 'دبیر کمیته',
            deadline: g(nextY, nextM, spec.day),
          }))),
          g(nextY, nextM, spec.day), BY];
        if (hasMinuteExample) { cols.push('is_example'); vals.push(1); }
        // ستون‌های شش‌بندیِ الف-۱-۵-۲ فقط اگر مهاجرت اجرا شده باشد (روی دیتابیس
        // قدیمی که این seed زودتر بالا بیاید، بی‌سروصدا رد می‌شوند)
        const extra = {
          start_time: spec.from, end_time: spec.to, location: MIN_LOCATION,
          minutes_code: `MIN-${YEAR}-${String(ci + 1).padStart(2, '0')}-${String(m).padStart(2, '0')}`,
          discussion: MEET_DISC[spec.c] || null,
          absentees: JSON.stringify([{ user_id: null, name: 'نماینده‌ی واحد تدارکات', reason: 'مأموریت اداری' }]),
          // بند ۳ برای همه‌ی این جلسه‌ها پر می‌شود: کمیته‌های نمونه پیش از سه‌ماهه‌ی اول
          // هم جلسه داشته‌اند (سناریوی بیمارستان)، پس هیچ‌کدام «اولین جلسه» نیستند.
          previous_followup: JSON.stringify(spec.dec.map(d => ({
            what: d, result: 'partial', note: 'در جلسه‌ی این ماه پیگیری و وضعیت آن گزارش شد.',
          }))),
        };
        for (const [k, v] of Object.entries(extra)) {
          if (v !== null && colExists('committee_meeting_minutes', k)) { cols.push(k); vals.push(v); }
        }
        query(`INSERT INTO committee_meeting_minutes (${cols.join(',')}, created_at)
               VALUES (${cols.map(() => '?').join(',')}, datetime('now'))`, vals);
        added++;
      }
    }
  }

  /* ---------- ۲-ب) تکمیل صورت‌جلسه‌های نمونه‌ی موجود طبق الف-۱-۵-۲ ---------- */
  // شرطِ «تکراری نباش» بالا جلوی درجِ دوباره را می‌گیرد، پس صورت‌جلسه‌هایی که در
  // اجراهای قبلی ساخته شده‌اند هرگز ستون‌های تازه را نمی‌گرفتند و همگی «۵ بند ناقص»
  // می‌ماندند. همان الگوی بک‌فیلی که در #34 و #40 لازم شد.
  // فقط رکوردِ نمونه، فقط ستونی که خالی است، و نوشتن فقط وقتی چیزی واقعاً عوض شود.
  if (colExists('committee_meeting_minutes', 'discussion')) {
    let fixedMinutes = 0;
    for (let ci = 0; ci < MEET.length; ci++) {
      const spec = MEET[ci];
      const com = query('SELECT id, chairperson_id FROM committees WHERE hospital_id = ? AND name = ?',
        [HID, spec.c]).rows[0];
      if (!com) continue;
      const rows = query(`SELECT * FROM committee_meeting_minutes
                          WHERE committee_id = ? ORDER BY meeting_date`, [com.id]).rows
                     .filter(r => !hasMinuteExample || r.is_example);
      rows.forEach((r, idx) => {
        const set = {}, jm = Q1[idx] || Q1[Q1.length - 1];
        if (!r.start_time) { set.start_time = spec.from; set.end_time = spec.to; }
        if (!r.location) set.location = MIN_LOCATION;
        if (!r.minutes_code) set.minutes_code = `MIN-${YEAR}-${String(ci + 1).padStart(2, '0')}-${String(jm).padStart(2, '0')}`;
        if (!r.discussion) set.discussion = MEET_DISC[spec.c] || null;
        if (!safeLen(r.absentees)) {
          set.absentees = JSON.stringify([{ user_id: null, name: 'نماینده‌ی واحد تدارکات', reason: 'مأموریت اداری' }]);
        }
        if (!safeLen(r.previous_followup)) {
          set.previous_followup = JSON.stringify(spec.dec.map(d => ({
            what: d, result: 'partial', note: 'در جلسه‌ی این ماه پیگیری و وضعیت آن گزارش شد.' })));
        }
        // مصوبه‌ی نمونه هم باید مسئول و مهلت داشته باشد (بند ۵)، وگرنه خودش
        // نمونه‌ی کاری است که کتاب نمی‌پذیرد.
        const dec = safeJson(r.decisions);
        if (dec.length && dec.some(d => typeof d === 'string' || !d.deadline)) {
          set.decisions = JSON.stringify(dec.map(d => (typeof d === 'string'
            ? { what: d, responsible_user_id: null, responsible_name: 'دبیر کمیته', deadline: r.next_meeting_date }
            : { deadline: r.next_meeting_date, responsible_name: 'دبیر کمیته', ...d })));
        }
        // بند ۶ — امضا. رکورد «نمونه» است و در همه‌جای رابط با نشانِ نمونه دیده
        // می‌شود؛ بدون امضا، هر دوازده صورت‌جلسه‌ی دمو «ناقص» علامت می‌خوردند.
        if (!safeLen(r.signatures)) {
          const signer = com.chairperson_id || BY;
          const u = query('SELECT u.full_name, r.title_fa FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?',
            [signer]).rows[0];
          set.signatures = JSON.stringify([{ user_id: signer, name: u ? u.full_name : 'رئیس کمیته',
            role: u ? u.title_fa : null, was_absent: false, signed_at: `${r.meeting_date}T12:00:00.000Z` }]);
        }
        const keys = Object.keys(set).filter(k => colExists('committee_meeting_minutes', k));
        if (!keys.length) return;
        query(`UPDATE committee_meeting_minutes SET ${keys.map(k => k + ' = ?').join(', ')} WHERE id = ?`,
          [...keys.map(k => set[k]), r.id]);
        fixedMinutes++;
      });
    }
    if (fixedMinutes) console.log(`[seed-q1] ${fixedMinutes} صورت‌جلسه‌ی نمونه طبق الف-۱-۵-۲ تکمیل شد`);
  }

  /* ---------- ۳) برنامه‌های بهبود مستمر ---------- */
  const PROGRAMS = [
    { t: 'کاهش زمان انتظار پذیرش سرپایی به کمتر از ۱۵ دقیقه', ty: 'بهبود کیفیت',
      goal: 'ارتقای رضایت گیرنده خدمت', dep: 'پذیرش و ترخیص', st: 'در_حال_اجرا', pr: 45, sd: [1, 10], dd: [6, 31],
      d: 'میانگین زمان انتظار پذیرش سرپایی در نظرسنجی سه‌ماهه‌ی اول ۲۶ دقیقه گزارش شد. برنامه شامل افزودن یک باجه در شیفت صبح، بازطراحی صف و نصب سامانه‌ی نوبت‌دهی است. سنجش با نمونه‌گیری هفتگی ۲۰ مراجعه.' },
    { t: 'استقرار کامل بسته‌ی مراقبتی پیشگیری از عفونت کاتتر', ty: 'ایمنی بیمار',
      goal: 'کاهش عفونت مرتبط با مراقبت', dep: 'کنترل عفونت', st: 'در_حال_اجرا', pr: 60, sd: [1, 20], dd: [9, 30],
      d: 'اجرای همزمان پنج اقدام بسته‌ی مراقبتی در همه‌ی بخش‌های بستری، به‌همراه فرم مراقبت روزانه و پایش ماهانه‌ی تکمیل فرم. شاخص هدف: تکمیل بالای ۹۰ درصد فرم‌ها.' },
    { t: 'یکسان‌سازی فرم رضایت آگاهانه در بخش‌های جراحی', ty: 'بهبود فرایند',
      goal: 'رعایت حقوق گیرنده خدمت', dep: 'اتاق عمل', st: 'تکمیل‌شده', pr: 100, sd: [1, 5], dd: [3, 15],
      d: 'بازنگری فرم رضایت آگاهانه بر اساس الزامات اعتباربخشی و اخلاق پزشکی، تصویب در کمیته‌ی اخلاق و ابلاغ به بخش‌های جراحی. فرم جدید از ابتدای خرداد در همه‌ی اعمال جراحی استفاده می‌شود.' },
    { t: 'برنامه‌ی آموزش احیای قلبی‌ریوی پایه برای همه‌ی پرسنل بالینی', ty: 'آموزش',
      goal: 'ارتقای توانمندی کارکنان', dep: 'دفتر پرستاری', st: 'در_حال_اجرا', pr: 35, sd: [2, 1], dd: [12, 20],
      d: 'دوره‌ی چهار ساعته با آزمون عملی برای ۱۸۰ نفر پرسنل بالینی. در سه‌ماهه‌ی اول دو دوره برگزار و ۶۳ نفر آموزش دیدند.' },
    { t: 'کاهش موارد سقوط بیمار در بخش‌های بستری', ty: 'ایمنی بیمار',
      goal: 'کاهش آسیب قابل پیشگیری', dep: 'دفتر پرستاری', st: 'پیشنهاد_شده', pr: 0, sd: [4, 1], dd: [12, 29],
      d: 'پیشنهاد شده بر اساس دو مورد سقوط ثبت‌شده در سه‌ماهه‌ی اول. شامل ارزیابی ریسک سقوط هنگام پذیرش، برچسب شناسایی و آموزش همراه بیمار. در انتظار تصویب کمیته‌ی پایش و سنجش کیفیت.' }
  ];
  for (const p of PROGRAMS) {
    if (count('SELECT COUNT(*) c FROM improvement_programs WHERE hospital_id=? AND title=?', [HID, p.t]) !== 0) continue;
    query(`INSERT INTO improvement_programs
             (id, hospital_id, title, program_type, description, strategic_goal, department,
              proposed_by, status, progress_percent, start_date, due_date, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
      [uid(), HID, p.t, p.ty, p.d, p.goal, p.dep, BY, p.st, p.pr,
       g(YEAR, p.sd[0], p.sd[1]), g(YEAR, p.dd[0], p.dd[1])]);
    added++;
  }

  /* ---------- ۴) نیازسنجی آموزشی ---------- */
  const NEEDS = [
    { t: 'احیای قلبی‌ریوی پیشرفته (ACLS)', ty: 'حضوری', jg: 'پرستاری', dep: 'بخش ویژه قلب', st: 'تأییدشده',
      d: 'پرسنل بخش ویژه باید دوره‌ی ACLS معتبر داشته باشند؛ گواهی چهار نفر امسال منقضی می‌شود.' },
    { t: 'تفسیر پایه‌ی نوار قلب', ty: 'حضوری', jg: 'پرستاری', dep: 'اورژانس', st: 'تأییدشده',
      d: 'تشخیص زودهنگام آریتمی در تریاژ اورژانس نیازمند مهارت پایه‌ی تفسیر نوار قلب برای همه‌ی پرستاران تریاژ است.' },
    { t: 'ثبت صحیح در پرونده‌ی الکترونیک و الزامات مستندسازی', ty: 'کارگاه', jg: 'پرستاری', dep: 'همه‌ی بخش‌های بستری', st: 'تأییدشده',
      d: 'در حسابرسی داخلی، نقص مستندسازی پرتکرارترین یافته بود.' },
    { t: 'بهداشت دست و پیشگیری از عفونت‌های مرتبط با مراقبت', ty: 'حضوری', jg: 'خدمات', dep: 'خدمات و نظافت', st: 'ثبت_شده',
      d: 'پرسنل خدمات در دوره‌های کنترل عفونت شرکت داده نشده‌اند، در حالی که در تماس مستقیم با محیط بیمار هستند.' },
    { t: 'اصول ایمنی و کار با تجهیزات پرتوی', ty: 'حضوری', jg: 'پیراپزشکی', dep: 'تصویربرداری', st: 'بررسی_مافوق',
      d: 'الزام دوره‌ای واحد بهداشت پرتوها؛ گواهی دو نفر از کارشناسان تمدید نشده است.' },
    { t: 'مدیریت خشم و برخورد با همراه ناراضی', ty: 'کارگاه', jg: 'اداری', dep: 'پذیرش و ترخیص', st: 'ثبت_شده',
      d: 'بیشترین موضوع شکایات ثبت‌شده در سه‌ماهه‌ی اول، نحوه‌ی برخورد در باجه‌ی پذیرش بوده است.' },
    { t: 'آشنایی با سنجه‌های اعتباربخشی ویرایش ششم — ویژه‌ی مسئولان بخش', ty: 'کارگاه', jg: 'پرستاری', dep: 'همه‌ی بخش‌ها', st: 'تأییدشده',
      d: 'مسئولان بخش باید بدانند کدام سنجه به بخش آن‌ها مربوط است و چه شاهدی لازم دارد.' },
    { t: 'ارگونومی و پیشگیری از آسیب‌های اسکلتی‌عضلانی', ty: 'مجازی', jg: 'پرستاری', dep: 'همه‌ی بخش‌های بستری', st: 'رد_شده',
      d: 'درخواست پرسنل؛ به‌دلیل تداخل با اولویت‌های ایمنی بیمار به سال آینده موکول شد.' }
  ];
  for (const n of NEEDS) {
    if (count('SELECT COUNT(*) c FROM training_needs WHERE hospital_id=? AND title=?', [HID, n.t]) !== 0) continue;
    query(`INSERT INTO training_needs
             (id, hospital_id, employee_id, title, description, requested_course_type, job_group,
              department, year, status, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
      [uid(), HID, BY, n.t, n.d, n.ty, n.jg, n.dep, String(YEAR), n.st]);
    added++;
  }

  /* ---------- ۵) گزارش خطا و وقایع ناخواسته ---------- */
  // کدهای رهگیری با همان الگوی سامانه: ERR-{کد مرکز}-{سال}-{شماره}
  const ERRORS = [
    { c: 'دارویی', sev: 'کم', ward: 'بخش داخلی زنان', m: 1, d: 8, st: 'reviewed', rca: 0,
      x: 'داروی تجویزشده با دوز نادرست در کاردکس ثبت شده بود. پیش از تجویز به بیمار توسط پرستار شیفت بعد شناسایی و اصلاح شد. به بیمار آسیبی نرسید.' },
    { c: 'سقوط بیمار', sev: 'متوسط', ward: 'بخش داخلی مردان', m: 1, d: 24, st: 'reviewed', rca: 1,
      x: 'بیمار سالمند هنگام رفتن به سرویس بهداشتی از تخت پایین افتاد. نرده‌ی تخت پایین بوده است. معاینه انجام و آسیب جدی مشاهده نشد.',
      r: 'علت ریشه‌ای: نبود ارزیابی ریسک سقوط هنگام پذیرش و پایین بودن نرده‌ی تخت در شیفت شب. اقدام اصلاحی: افزودن ارزیابی ریسک سقوط به فرم پذیرش، برچسب شناسایی برای بیماران پرخطر، و کنترل نرده‌ها در راند شیفت.' },
    { c: 'تجهیزات', sev: 'کم', ward: 'اتاق عمل', m: 2, d: 5, st: 'in_review', rca: 0,
      x: 'پمپ سرنگ در میانه‌ی عمل هشدار خطا داد و با دستگاه پشتیبان جایگزین شد. عمل بدون وقفه ادامه یافت. دستگاه به واحد تجهیزات ارسال شد.' },
    { c: 'ارتباطی', sev: 'کم', ward: 'اورژانس', m: 2, d: 17, st: 'reviewed', rca: 0,
      x: 'نتیجه‌ی آزمایش بحرانی با تأخیر ۴۰ دقیقه‌ای به پزشک اطلاع داده شد. فرایند اعلام مقادیر بحرانی بازبینی شد.' },
    { c: 'دارویی', sev: 'کم', ward: 'بخش کودکان', m: 3, d: 3, st: 'new', rca: 0,
      x: 'دو دارو با نام مشابه در قفسه کنار هم چیده شده بودند. پیش از تجویز شناسایی شد. درخواست جداسازی فیزیکی داروهای هم‌نام ثبت گردید.' },
    { c: 'سقوط بیمار', sev: 'کم', ward: 'بخش جراحی', m: 3, d: 19, st: 'new', rca: 0,
      x: 'بیمار پس از بی‌حسی نخاعی هنگام برخاستن دچار سرگیجه و افتادن شد. همراه بیمار حضور نداشت. بدون آسیب.' }
  ];
  // «وضعیت بررسی»ای که کاربر واقعاً روی صفحه‌ی «گزارش خطا» می‌بیند از ستون
  // evaluation_status می‌آید (MER_EVAL در app.js)، نه از status بالا (که مقداری
  // داخلی/بدون نمایش است) — قبلاً اصلاً ست نمی‌شد، پس هر ۶ گزارش برای همیشه
  // «در انتظار بررسی» نشان داده می‌شدند، حتی آن‌هایی که علت ریشه‌ای/اقدام
  // اصلاحی‌شان همین‌جا نوشته شده. اینجا از روی st همان رکورد استنتاج می‌شود.
  const EVAL_STATUS_FROM_ST = { reviewed: 'بسته‌شده', in_review: 'در حال بررسی', new: 'در انتظار بررسی' };
  const hasEvalStatus = colExists('medical_error_reports', 'evaluation_status');
  const hasSelfDecl = colExists('medical_error_reports', 'is_self_declaration');
  ERRORS.forEach((er, i) => {
    const code = `ERR-${YEAR}-${String(i + 1).padStart(3, '0')}`;
    if (count('SELECT COUNT(*) c FROM medical_error_reports WHERE hospital_id=? AND tracking_code=?', [HID, code]) !== 0) return;
    const cols = ['id', 'hospital_id', 'error_category', 'description', 'is_confidential',
      'is_anonymous_submission', 'severity', 'reported_by', 'department', 'status',
      'needs_rca', 'rca_text', 'tracking_code', 'error_ward', 'created_at'];
    const vals = [uid(), HID, er.c, er.x, 1, 0, er.sev, BY, er.ward, er.st, er.rca, er.r || null,
      code, er.ward, g(YEAR, er.m, er.d)];
    if (hasSelfDecl) { cols.push('is_self_declaration'); vals.push(0); }
    if (hasEvalStatus) { cols.push('evaluation_status'); vals.push(EVAL_STATUS_FROM_ST[er.st] || 'در انتظار بررسی'); }
    query(`INSERT INTO medical_error_reports (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
    added++;
  });
  // بک‌فیل برای دیتابیس‌هایی که این شش ردیف را قبلاً بدون evaluation_status ساخته‌اند
  if (hasEvalStatus) {
    for (const [code, ev] of [['reviewed', 'بسته‌شده'], ['in_review', 'در حال بررسی']]) {
      query(`UPDATE medical_error_reports SET evaluation_status=? WHERE hospital_id=? AND status=? AND (evaluation_status IS NULL OR evaluation_status='در انتظار بررسی')`,
        [ev, HID, code]);
    }
  }

  /* ---------- ۶) بازدید میدانی مدیریتی (واکراند) ---------- */
  const WALKS = [
    { t: 'بازدید میدانی مدیریتی — بخش اورژانس', dep: 'اورژانس', m: 1, d: 15, st: 'closed',
      s: 'مسیر تریاژ تا تخت بررسی شد. زمان تریاژ در محدوده‌ی استاندارد بود. دو مشاهده: نبود برچسب تاریخ روی ست‌های استریل در ترالی اورژانس، و شلوغی راهروی ورودی در ساعت اوج. هر دو مورد با مسئول بخش در میان گذاشته شد و مصوبه‌ی رفع ثبت گردید.' },
    { t: 'بازدید میدانی مدیریتی — بخش‌های ویژه', dep: 'بخش ویژه قلب', m: 2, d: 11, st: 'closed',
      s: 'رعایت بهداشت دست در پنج موقعیت مشاهده و مطلوب ارزیابی شد. تجهیزات کالیبره و دارای برچسب معتبر بودند. یک مورد: کمبود پرستار در شیفت شب پنج‌شنبه‌ها که به دفتر پرستاری ارجاع شد.' },
    { t: 'بازدید میدانی مدیریتی — واحد تغذیه و آشپزخانه', dep: 'تغذیه', m: 3, d: 9, st: 'done',
      s: 'دمای یخچال‌ها و سردخانه ثبت روزانه داشت. کارت سلامت پرسنل معتبر بود. دو مورد نیازمند پیگیری: نبود تفکیک مسیر ظروف تمیز و کثیف، و ناکافی بودن تهویه‌ی آشپزخانه در ساعات اوج پخت.' }
  ];
  for (const w of WALKS) {
    if (count('SELECT COUNT(*) c FROM management_walkarounds WHERE hospital_id=? AND title=? AND visit_date=?',
      [HID, w.t, g(YEAR, w.m, w.d)]) !== 0) continue;
    query(`INSERT INTO management_walkarounds
             (id, hospital_id, title, visit_date, department, attendees, absentees, summary,
              status, conducted_by, created_by, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
      [uid(), HID, w.t, g(YEAR, w.m, w.d), w.dep,
       'ریاست بیمارستان، مدیر خدمات پرستاری، مسئول دفتر بهبود کیفیت، مسئول همان بخش',
       'نماینده‌ی واحد تدارکات', w.s, w.st, BY, BY]);
    added++;
  }

  /* ---------- ۷) اجرای چک‌لیست در بخش‌های مختلف ---------- */
  const chk = query('SELECT id FROM checklists WHERE hospital_id = ? ORDER BY created_at LIMIT 1', [HID]).rows[0];
  if (chk) {
    const items = query('SELECT id FROM checklist_items WHERE checklist_id = ? ORDER BY rowid', [chk.id]).rows;
    if (items.length) {
      const RUNS = [
        { ref: 'بخش داخلی زنان', m: 1, d: 22, vals: [4, 4, 4, 2, 4],
          note: 'انطباق کلی مطلوب. یک مورد: فهرست اسناد کنترل‌شده در محل به‌روزرسانی نشده بود و همان روز اصلاح شد.' },
        { ref: 'اورژانس', m: 2, d: 14, vals: [4, 2, 4, 4, 2],
          note: 'دو مورد عدم انطباق جزئی: یک نسخه‌ی منسوخ در ترالی، و نبود مستند توجیه برای یک پرسنل جدید. هر دو به مسئول بخش ارجاع شد.' },
        { ref: 'بخش ویژه قلب', m: 3, d: 7, vals: [4, 4, 4, 4, 4],
          note: 'انطباق کامل. بخش می‌تواند به‌عنوان الگو به سایر بخش‌ها معرفی شود.' },
        { ref: 'اتاق عمل', m: 3, d: 25, vals: [4, 4, 2, 4, 4],
          note: 'یک مورد: تاریخ بازنگری دو دستورالعمل گذشته بود؛ درخواست بازنگری به دفتر بهبود کیفیت ارسال شد.' }
      ];
      const hasSubExample = colExists('checklist_submissions', 'is_example');
      for (const r of RUNS) {
        const when = g(YEAR, r.m, r.d);
        if (count('SELECT COUNT(*) c FROM checklist_submissions WHERE hospital_id=? AND checklist_id=? AND reference=? AND submitted_at=?',
          [HID, chk.id, r.ref, when]) !== 0) continue;
        const answers = items.map((it, i) => ({ item_id: it.id, value: r.vals[i] != null ? r.vals[i] : 4, note: '' }));
        const score = answers.reduce((s, a) => s + (a.value === 4 ? 2 : a.value === 2 ? 1 : 0), 0);
        const cols = ['id', 'hospital_id', 'checklist_id', 'reference', 'answers', 'score', 'max_score',
          'note', 'submitted_by', 'submitted_at'];
        const vals = [uid(), HID, chk.id, r.ref, JSON.stringify(answers), score, items.length * 2,
          r.note, BY, when];
        if (hasSubExample) { cols.push('is_example'); vals.push(1); }
        query(`INSERT INTO checklist_submissions (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, vals);
        added++;
      }
    }
  }

  /* ---------- ۸) انتقادات و پیشنهادهای گیرنده خدمت ---------- */
  const COMPLAINTS = [
    { ty: 'انتقاد', st: 'resolved', m: 1, d: 11,
      c: 'زمان انتظار در باجه‌ی پذیرش سرپایی صبح‌ها بیش از نیم ساعت است.',
      r: 'با افزودن یک باجه در شیفت صبح از ابتدای اردیبهشت، میانگین زمان انتظار کاهش یافت. موضوع در برنامه‌ی بهبود «کاهش زمان انتظار پذیرش» پیگیری می‌شود.' },
    { ty: 'پیشنهاد', st: 'reviewed', m: 1, d: 28,
      c: 'نصب تابلوی راهنمای مسیر بخش‌ها در ورودی اصلی، چون پیدا کردن بخش‌ها سخت است.',
      r: 'پیشنهاد پذیرفته و به واحد تدارکات برای برآورد هزینه ارجاع شد.' },
    { ty: 'تقدیر', st: 'closed', m: 2, d: 6,
      c: 'از برخورد و پیگیری پرسنل شیفت شب بخش داخلی مردان سپاسگزارم.', r: 'مراتب به بخش مربوط اعلام و در جلسه‌ی دفتر پرستاری قدردانی شد.' },
    { ty: 'انتقاد', st: 'in_review', m: 2, d: 19,
      c: 'سرد بودن غذای بیماران در وعده‌ی شام.', r: null },
    { ty: 'پیشنهاد', st: 'new', m: 3, d: 4,
      c: 'امکان دریافت نوبت اینترنتی برای درمانگاه تخصصی فراهم شود.', r: null },
    { ty: 'انتقاد', st: 'resolved', m: 3, d: 21,
      c: 'نبود صندلی کافی در سالن انتظار تصویربرداری.',
      r: 'هشت صندلی به سالن انتظار اضافه شد.' }
  ];
  for (const cm of COMPLAINTS) {
    if (count('SELECT COUNT(*) c FROM patient_complaints_suggestions WHERE hospital_id=? AND content=?', [HID, cm.c]) !== 0) continue;
    query(`INSERT INTO patient_complaints_suggestions
             (id, hospital_id, type, content, is_anonymous, status, response, created_at, source)
           VALUES (?,?,?,?,1,?,?,?, 'نمونه')`,
      [uid(), HID, cm.ty, cm.c, cm.st, cm.r, g(YEAR, cm.m, cm.d)]);
    added++;
  }

  /* ---------- ۹) وظایف روی کارتابل ---------- */
  // نکته: کلیدِ روزِ ماه اینجا `day` است نه `d`. در نسخه‌ی قبلی هر رکورد `d` را
  // دوبار داشت (روزِ ماه و شرح) و در جاوااسکریپت کلیدِ دوم برنده می‌شود، پس روز
  // هرگز به g() نمی‌رسید و due_date به «-100100-03-01» تبدیل می‌شد — همان باگی که
  // بالاتر برای compiled_date ِ فرآیندها توضیح داده شد.
  const TASKS = [
    { t: 'ارسال گزارش سه‌ماهه‌ی شاخص‌های کارت امتیازی به ریاست', m: 4, day: 10, st: 'assigned',
      d: 'مصوبه‌ی جلسه‌ی خرداد کمیته‌ی پایش و سنجش کیفیت.' },
    { t: 'تحلیل علت پایین‌ماندن شاخص رضایت گیرنده خدمت', m: 4, day: 31, st: 'assigned',
      d: 'شاخص سه ماه پیاپی زیر تارگت ۹۰ درصد مانده است؛ تحلیل علت و اقدام اصلاحی لازم است.' },
    { t: 'تکمیل برچسب‌گذاری داروهای پرخطر در همه‌ی بخش‌ها', m: 2, day: 31, st: 'completed',
      d: 'مصوبه‌ی کمیته‌ی دارو و تجهیزات پزشکی.' },
    { t: 'بازنگری دو دستورالعمل سررسیدشده‌ی اتاق عمل', m: 4, day: 15, st: 'assigned',
      d: 'یافته‌ی اجرای چک‌لیست مستندسازی در اتاق عمل، خرداد ۱۴۰۵.' },
    { t: 'پیگیری تفکیک مسیر ظروف تمیز و کثیف در آشپزخانه', m: 4, day: 20, st: 'assigned',
      d: 'یافته‌ی بازدید میدانی مدیریتی واحد تغذیه.' }
  ];
  for (const t of TASKS) {
    if (count('SELECT COUNT(*) c FROM tasks WHERE hospital_id=? AND title=?', [HID, t.t]) !== 0) continue;
    query(`INSERT INTO tasks
             (id, hospital_id, title, description, assigned_by, assigned_to, due_date, status,
              completed_at, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`,
      [uid(), HID, t.t, t.d, BY, BY, g(YEAR, t.m, t.day), t.st,
       t.st === 'completed' ? g(YEAR, t.m, Math.max(1, t.day - 3)) : null]);
    added++;
  }

  /* ---------- ۱۰) فرآیندها و فلوچارت‌ها ---------- */

  // درجِ گام‌های فلوچارت. هر گام [نوع، متن، صاحبِ گام, مقصدِ«خیر»؟] است و مقصدِ «خیر»
  // با *اندیسِ* گام داده می‌شود (نه شناسه) تا نوشتنِ داده‌ی نمونه خوانا بماند؛
  // ترجمه به شناسه در گذرِ دوم انجام می‌شود.
  // تاپلِ گام: [نوع، متن، صاحب، مقصدِ «خیر»، مقصدِ «بله»]
  // مقصدها اندیسِ گام‌اند. «بله» اگر ذکر نشود گامِ بعدی است.
  //
  // چرا یال‌ها این‌جا صریح نوشته می‌شوند و به مدلِ «ستون فقرات» تکیه نمی‌کنیم:
  // در آن مدل شاخه‌ی «بله» *همیشه* گام بعدی بود، و چون مقصدِ «خیر» هم در
  // داده‌ی نمونه همان گام بعدی بود، هر دو شاخه به یک جا می‌رفتند — یعنی
  // تصمیمی که هیچ اثری ندارد، و روی نمودار دو برچسب روی هم. در رندر واقعی
  // دیده شد.
  function seedProcessSteps(processId, hospitalId, steps) {
    if (!Array.isArray(steps) || !steps.length) return;
    const ids = steps.map(() => uid());
    steps.forEach((s, i) => {
      query(`INSERT INTO process_steps (id, hospital_id, process_id, step_type, text, owner, sort_order)
             VALUES (?,?,?,?,?,?,?)`,
        [ids[i], hospitalId, processId, s[0], s[1], s[2] || null, i]);
    });
    steps.forEach((s, i) => {
      const noIdx = s[3];
      if (s[0] !== 'decision' || noIdx == null || !ids[noIdx]) return;
      query('UPDATE process_steps SET no_target_id = ? WHERE id = ?', [ids[noIdx], ids[i]]);
    });
    writeProcessLinks(processId, hospitalId, steps, ids);
  }

  function writeProcessLinks(processId, hospitalId, steps, ids) {
    if (!colExists('process_links', 'id')) return;
    query('DELETE FROM process_links WHERE process_id = ?', [processId]);
    let order = 0;
    const add = (fi, ti, label) => {
      if (ids[fi] == null || ids[ti] == null) return;
      query(`INSERT INTO process_links (id, hospital_id, process_id, from_step_id, to_step_id, label, sort_order)
             VALUES (?,?,?,?,?,?,?)`,
        [uid(), hospitalId, processId, ids[fi], ids[ti], label || null, order++]);
    };
    steps.forEach((s, i) => {
      if (s[0] === 'end') return;
      if (s[0] === 'decision') {
        const yes = s[4] != null ? s[4] : i + 1;
        const no = s[3];
        add(i, yes, 'بله');
        // «خیر»ی که به همان مقصدِ «بله» برود تصمیم نیست — نوشته نمی‌شود
        if (no != null && no !== yes) add(i, no, 'خیر');
      } else if (i + 1 < steps.length) {
        add(i, i + 1, null);
      }
    });
  }

  // بک‌فیل رکوردهای خرابِ نسخه‌های قبلی. چون شرطِ idempotency بالا («اگر عنوان هست رد
  // شو») جلوی درجِ دوباره را می‌گیرد، تنها راهِ رساندنِ اصلاح به دیتابیس‌های موجود
  // همین است. هر دو شرط محافظه‌کارانه‌اند: فقط مقدارِ خرابِ شناخته‌شده عوض می‌شود.
  const DOMAIN_FIX = {
    'مراقبت و درمان': 'main',
    'حمایت از گیرنده خدمت': 'support',
    'رهبری و مدیریت': 'managerial',
  };
  for (const [bad, good] of Object.entries(DOMAIN_FIX)) {
    query('UPDATE processes SET domain = ? WHERE hospital_id = ? AND domain = ?', [good, HID, bad]);
  }
  // تاریخِ تدوینِ خراب (نتیجه‌ی کلیدِ تکراری) — به تاریخ درستِ همان فرآیند برمی‌گردد
  for (const [code, mm, dd] of [['PR-ADM-01', 1, 9], ['PR-DIS-01', 1, 26], ['PR-LAB-02', 2, 22],
                                ['PR-CMP-01', 3, 12], ['PR-ERR-01', 3, 27]]) {
    query(`UPDATE processes SET compiled_date = ? WHERE hospital_id = ? AND process_code = ?
             AND (compiled_date IS NULL OR compiled_date LIKE '-%')`, [g(YEAR, mm, dd), HID, code]);
  }

  // همان باگِ کلیدِ تکراری دو جای دیگر هم زده بود و تا امروز دیده نشده بود، چون
  // برخلافِ فرآیندها کسی تاریخشان را چاپ نمی‌کرد: سررسیدِ وظایفِ کارتابل و تاریخِ
  // ثبتِ اقلامِ کتابخانه هر دو «-100100-03-01» بودند. مثل بالا فقط مقدارِ خرابِ
  // شناخته‌شده عوض می‌شود.
  for (const [title, mm, dd, st] of [
    ['ارسال گزارش سه‌ماهه‌ی شاخص‌های کارت امتیازی به ریاست', 4, 10, 'assigned'],
    ['تحلیل علت پایین‌ماندن شاخص رضایت گیرنده خدمت', 4, 31, 'assigned'],
    ['تکمیل برچسب‌گذاری داروهای پرخطر در همه‌ی بخش‌ها', 2, 31, 'completed'],
    ['بازنگری دو دستورالعمل سررسیدشده‌ی اتاق عمل', 4, 15, 'assigned'],
    ['پیگیری تفکیک مسیر ظروف تمیز و کثیف در آشپزخانه', 4, 20, 'assigned']]) {
    query(`UPDATE tasks SET due_date = ?,
             completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END
           WHERE hospital_id = ? AND title = ? AND due_date LIKE '-%'`,
      [g(YEAR, mm, dd), st, g(YEAR, mm, Math.max(1, dd - 3)), HID, title]);
  }
  for (const [title, mm, dd] of [
    ['راهنمای کشوری پیشگیری از عفونت‌های مرتبط با مراقبت', 1, 8],
    ['سنجه‌های اعتباربخشی ملی بیمارستان‌های ایران — ویرایش ششم', 1, 20],
    ['راهنمای ایمنی بیمار — نه راه‌حل جهانی', 2, 14],
    ['جزوه‌ی آموزشی احیای قلبی‌ریوی پایه', 3, 6]]) {
    query(`UPDATE digital_library_items SET created_at = ?, updated_at = ?
           WHERE hospital_id = ? AND title = ? AND created_at LIKE '-%'`,
      [g(YEAR, mm, dd), g(YEAR, mm, dd), HID, title]);
  }

  // نکته: در نسخه‌ی قبلی هر رکورد کلید `d` را *دوبار* داشت (یک‌بار روزِ ماه، یک‌بار شرح).
  // در جاوااسکریپت کلید دوم برنده می‌شود، پس روزِ ماه هرگز به g() نمی‌رسید و
  // compiled_date به «-100100-03-01» تبدیل می‌شد. کلید روز به `day` تغییر نام داد.
  // همچنین `dom` متن فارسی می‌گرفت در حالی که مقادیر معتبر main/managerial/support اند
  // (PROC_DOMAINS در src/routes/api.js) — نتیجه‌اش این بود که فیلترِ حوزه هیچ‌وقت
  // نتیجه نمی‌داد و برچسب فارسیِ درست هم نمایش داده نمی‌شد.
  //
  // گام‌های فلوچارت هم اضافه شدند: تا پیش از این هر پنج فرآیند «۰ گام» داشتند، یعنی
  // ماژول فقط متن بود. کتاب فرآیند را «به صورت فلوچارت ساده و قابل فهم» و قابل «نصب
  // در معرض دید گیرندگان خدمت» می‌خواهد (ج-۲-۳-۱).
  let fixedLinks = 0;
  const PROCESSES = [
    { t: 'فرایند پذیرش بیمار بستری', dom: 'main', code: 'PR-ADM-01', m: 1, day: 9,
      d: 'از مراجعه‌ی بیمار با دستور بستری تا استقرار در تخت: احراز هویت، تشکیل پرونده، ارزیابی اولیه‌ی پرستاری، معرفی بخش و همراه، و ثبت در سامانه. نقاط تصمیم: نیاز به بستری در بخش ویژه، و وضعیت بیمه.',
      steps: [
        ['start',    'مراجعه بیمار با دستور بستری', 'واحد پذیرش'],
        ['action',   'احراز هویت بیمار و کنترل مدارک', 'مسئول پذیرش'],
        ['decision', 'آیا مدارک بیمه کامل است؟', 'مسئول پذیرش', 3, 4],
        ['action',   'ثبت پوشش بیمه‌ای در پرونده', 'مسئول پذیرش'],
        ['document', 'تشکیل پرونده و صدور برگه بستری', 'واحد پذیرش'],
        ['decision', 'آیا بیمار نیاز به بخش ویژه دارد؟', 'پزشک معالج', 7, 6],
        ['action',   'هماهنگی تخت در بخش ویژه', 'سوپروایزر بالینی'],
        ['action',   'استقرار در تخت و ارزیابی اولیه پرستاری', 'پرستار بخش'],
        ['end',      'پایان — معرفی بخش و همراه به بیمار', 'پرستار بخش'],
      ] },
    { t: 'فرایند ترخیص و آموزش به بیمار', dom: 'main', code: 'PR-DIS-01', m: 1, day: 26,
      d: 'از صدور دستور ترخیص تا خروج بیمار: تسویه، آموزش دارویی و مراقبت در منزل، تحویل خلاصه‌ی پرونده و تعیین زمان پیگیری.',
      steps: [
        ['start',    'صدور دستور ترخیص توسط پزشک معالج', 'پزشک معالج'],
        ['action',   'کنترل نهایی پرونده و دستورات دارویی', 'پرستار بخش'],
        ['decision', 'آیا تسویه حساب انجام شده است؟', 'واحد حسابداری', 3, 4],
        ['action',   'انجام تسویه و صدور رسید', 'واحد حسابداری'],
        ['action',   'آموزش دارویی و مراقبت در منزل به بیمار و همراه', 'پرستار بخش'],
        ['document', 'تحویل خلاصه پرونده و برگه آموزش به بیمار', 'پرستار بخش'],
        ['end',      'پایان — تعیین زمان پیگیری و خروج بیمار', 'منشی بخش'],
      ] },
    { t: 'فرایند اعلام و پیگیری مقادیر بحرانی آزمایشگاه', dom: 'main', code: 'PR-LAB-02', m: 2, day: 22,
      d: 'از شناسایی مقدار بحرانی توسط آزمایشگاه تا ثبت اقدام پزشک؛ با سقف زمانی ۱۵ دقیقه برای اعلام و الزام ثبت گیرنده‌ی پیام. این فرایند پس از واقعه‌ی تأخیر ۴۰ دقیقه‌ای بازنگری شد.',
      steps: [
        ['start',    'شناسایی مقدار بحرانی در نتیجه آزمایش', 'کارشناس آزمایشگاه'],
        ['action',   'تماس فوری با بخش — حداکثر ۱۵ دقیقه', 'کارشناس آزمایشگاه'],
        ['document', 'ثبت نام گیرنده پیام، ساعت و مقدار در دفتر مقادیر بحرانی', 'کارشناس آزمایشگاه'],
        ['decision', 'آیا پزشک معالج در دسترس است؟', 'پرستار بخش', 5, 4],
        ['action',   'اطلاع به پزشک کشیک و ثبت در پرونده', 'پرستار بخش'],
        ['action',   'ثبت اقدام درمانی پزشک در پرونده بیمار', 'پزشک معالج'],
        ['end',      'پایان — پایش زمان پاسخ در کمیته پایش و سنجش کیفیت', 'بهبود کیفیت'],
      ] },
    // این یکی دقیقاً همان فرآیندی است که کتاب صریحاً فلوچارتش را می‌خواهد
    { t: 'فرایند رسیدگی به شکایت گیرنده خدمت', dom: 'support', code: 'PR-CMP-01', m: 3, day: 12,
      d: 'از ثبت شکایت (حضوری، صندوق، یا فرم بدون ورود) تا اعلام نتیجه به شاکی، با مهلت پاسخ حداکثر ۱۰ روز کاری و ارجاع موارد تکرارشونده به کمیته‌ی اخلاق. مطابق سنجه ج-۲-۳-۱ این فرآیند باید به صورت فلوچارت ساده در معرض دید گیرندگان خدمت نصب شود.',
      steps: [
        ['start',    'اعلام شکایت، انتقاد یا پیشنهاد توسط گیرنده خدمت', 'گیرنده خدمت'],
        ['document', 'ثبت در فرم شکایات و صدور کد رهگیری', 'مسئول رسیدگی به شکایات'],
        ['decision', 'آیا موضوع در همان واحد قابل حل است؟', 'مسئول واحد', 4, 3],
        ['action',   'رفع موضوع در واحد و اعلام نتیجه به شاکی', 'مسئول واحد'],
        ['action',   'بررسی موضوع و جمع‌آوری مستندات', 'مسئول رسیدگی به شکایات'],
        ['decision', 'آیا مورد تکرارشونده یا دارای بُعد اخلاقی است؟', 'مدیر داخلی', 6, 7],
        ['action',   'ارجاع به کمیته اخلاق و تصویب اقدام اصلاحی', 'دبیر کمیته اخلاق'],
        ['action',   'اعلام نتیجه به شاکی — حداکثر ۱۰ روز کاری', 'مسئول رسیدگی به شکایات'],
        ['end',      'پایان — ثبت در سوابق و پایش رضایت شاکی', 'بهبود کیفیت'],
      ] },
    { t: 'فرایند گزارش‌دهی خطا و وقایع ناخواسته', dom: 'managerial', code: 'PR-ERR-01', m: 3, day: 27,
      d: 'مسیر گزارش بدون سرزنش: ثبت (با نام یا ناشناس) → صدور کد رهگیری → طبقه‌بندی شدت → در صورت شدت بالا تحلیل ریشه‌ای → اقدام اصلاحی → بازخورد به گزارش‌دهنده با همان کد.',
      steps: [
        ['start',    'مشاهده خطا یا واقعه ناخواسته توسط کارکنان', 'کارکنان بیمارستان'],
        ['document', 'ثبت گزارش (با نام یا ناشناس) و صدور کد رهگیری', 'مسئول ایمنی بیمار'],
        ['action',   'طبقه‌بندی شدت واقعه بر اساس دستورالعمل', 'مسئول ایمنی بیمار'],
        ['decision', 'آیا شدت واقعه بالا است؟', 'مسئول ایمنی بیمار', 5, 4],
        ['action',   'انجام تحلیل ریشه‌ای (RCA) با تیم مربوط', 'کمیته ایمنی بیمار'],
        ['action',   'تعیین و اجرای اقدام اصلاحی با مسئول و مهلت', 'مدیر بهبود کیفیت'],
        ['end',      'پایان — بازخورد به گزارش‌دهنده با همان کد رهگیری', 'مسئول ایمنی بیمار'],
      ] },
  ];
  for (const pr of PROCESSES) {
    const existing = query('SELECT id FROM processes WHERE hospital_id=? AND title=?', [HID, pr.t]).rows[0];
    if (existing) {
      // فرآیند از قبل هست ولی با نسخه‌های قبلی ساخته شده و هیچ گامی ندارد — گام‌ها را
      // اضافه کن، ولی اگر کاربر خودش گام تعریف کرده دست نزن.
      if (count('SELECT COUNT(*) c FROM process_steps WHERE process_id=?', [existing.id]) === 0) {
        seedProcessSteps(existing.id, HID, pr.steps);
        added++;
      } else if (colExists('process_links', 'id')) {
        // تعمیرِ یال‌های نمونه: نسخه‌ی قبلی برای هر تصمیم، «بله» و «خیر» را به یک
        // گام می‌فرستاد (تصمیمی بی‌اثر، و دو برچسب روی هم روی نمودار). فقط وقتی
        // شکلِ گام‌ها دقیقاً همان نمونه است بازنویسی می‌شود — اگر کاربر گام‌ها را
        // عوض کرده باشد، دست نمی‌خورد.
        const cur = query(`SELECT id, step_type, text FROM process_steps
                           WHERE process_id = ? ORDER BY sort_order`, [existing.id]).rows;
        const same = cur.length === pr.steps.length
          && cur.every((c, i) => c.step_type === pr.steps[i][0] && c.text === pr.steps[i][1]);
        const dup = count(`SELECT COUNT(*) c FROM (SELECT from_step_id, to_step_id
                             FROM process_links WHERE process_id = ?
                             GROUP BY from_step_id, to_step_id HAVING COUNT(*) > 1)`, [existing.id]);
        if (same && dup > 0) {
          writeProcessLinks(existing.id, HID, pr.steps, cur.map(c => c.id));
          fixedLinks++;
        }
      }
      continue;
    }
    const pid = uid();
    query(`INSERT INTO processes
             (id, hospital_id, title, domain, process_code, referring_person, compiled_date,
              description, created_by, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
      [pid, HID, pr.t, pr.dom, pr.code, 'دفتر بهبود کیفیت', g(YEAR, pr.m, pr.day), pr.d, BY]);
    seedProcessSteps(pid, HID, pr.steps);
    added++;
  }
  if (fixedLinks) console.log(`[seed-q1] ${fixedLinks} فلوچارت نمونه — شاخه‌های تصمیم اصلاح شد`);

  console.log(`[seed-q1] «${hosp.name}» — ${added} ردیف نمونه‌ی سه‌ماهه‌ی اول ${YEAR} افزوده شد` +
              (added === 0 ? ' (قبلاً کامل بود)' : ''));
}

module.exports = { seedQuarterOneSample };

if (require.main === module) {
  seedQuarterOneSample();
}
