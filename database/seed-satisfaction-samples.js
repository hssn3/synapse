/**
 * Seed: ده نظرسنجی رضایت بیمارِ نمونه برای بیمارستانِ نمونه
 *
 * چرا لازم است: ماژول «نظرسنجی رضایت بیمار» و داشبورد نتایجش (مدیر بهبود کیفیت) تا وقتی
 * حتی یک پاسخ ثبت نشده باشد کاملاً خالی است — نه میانگین محوری دارد، نه نمودار، نه چیزی
 * برای نشان‌دادن در ارائه. این فایل همان چیزی را می‌سازد که یک بیمارستانِ فعال بعد از
 * چند هفته می‌داشت.
 *
 * ساختار داده دقیقاً همان چیزی است که POST /api/public/satisfaction تولید می‌کند
 * (src/routes/api.js): شش محور SAT_SECTIONS، هر امتیاز عددی ۱..۵، و overall_score که
 * میانگینِ گِردشده تا یک رقم اعشار است. اینجا هم همان میانگین از روی همان امتیازها
 * محاسبه می‌شود، نه یک عدد دستیِ جداگانه — تا داشبورد دقیقاً مثل داده‌ی واقعی رفتار کند.
 *
 * پاسخ‌ها عمداً یکنواخت نیستند: چند پاسخ‌دهنده‌ی بسیار راضی، چند متوسط و دو مورد ناراضی
 * (با نظر منفی و «بازگشت: خیر») تا نمودار توزیع و میانگینِ محورها واقع‌گرایانه باشد؛
 * ده پاسخِ همه‌پنج، نه چیزی برای تحلیل می‌داد نه باورپذیر بود.
 *
 * Idempotent: اگر این بیمارستان از قبل نظرسنجی دارد، چیزی اضافه نمی‌شود.
 */
const crypto = require('crypto');
const { db } = require('../src/config/database-sqlite');
const { tehranNow } = require('../src/config/jalali');

const HOSPITAL_NAME = 'بیمارستان نمونه شماره یک';
const SECTIONS = ['admission', 'medical', 'nursing', 'nutrition', 'discharge', 'facilities'];

// تعداد سوال هر محور — دقیقاً همان چیزی که فرم عمومی می‌فرستد
// (public/satisfaction-public.html → SECTIONS[].qs). مجموعاً ۲۰ سوال.
// پیش از این هر محور فقط یک عدد ذخیره می‌شد، یعنی داده‌ی نمونه شکل داده‌ی واقعی
// را نداشت و در داشبورد فقط «سوال ۱» هر محور میانگین می‌گرفت.
const QUESTION_COUNTS = { admission: 2, medical: 3, nursing: 4, nutrition: 3, discharge: 4, facilities: 4 };

// نوسان تکرارپذیر حول امتیاز پایه‌ی هر محور: پاسخ‌دهنده‌ی واقعی به همه‌ی سوال‌های یک
// محور عدد یکسان نمی‌دهد. عمداً به‌جای Math.random از یک دنباله‌ی قطعی استفاده می‌شود
// تا میانگین‌های داشبورد بین بوت‌ها تکان نخورد و ارائه هر بار یک شکل باشد.
function vary(base, seed) {
  const delta = [0, 1, -1, 0, -1, 1, 0][seed % 7];
  return Math.min(5, Math.max(1, base + delta));
}

// هر ردیف: نوع پاسخ‌دهنده، جنسیت، بازگشت مجدد، امتیاز هر محور (به‌ترتیب SECTIONS)، نظر،
// و چند روز پیش ثبت شده باشد.
const SAMPLES = [
  { who: 'بستری', g: 'زن',  ret: 'بله', s: [5, 5, 5, 4, 5, 4], daysAgo: 3,
    c: 'برخورد پرستاران بخش بسیار محترمانه بود و پیگیری وضعیتم مرتب انجام می‌شد.' },
  { who: 'همراه', g: 'مرد', ret: 'بله', s: [4, 5, 5, 4, 4, 4], daysAgo: 6,
    c: 'پزشک معالج هر روز توضیح کاملی از روند درمان می‌داد. از این بابت راضی بودیم.' },
  { who: 'بستری', g: 'مرد', ret: 'بله', s: [4, 4, 4, 3, 4, 3], daysAgo: 9,
    c: null },
  { who: 'بستری', g: 'زن',  ret: 'بله', s: [3, 4, 4, 3, 3, 3], daysAgo: 12,
    c: 'روند پذیرش کمی طولانی بود ولی بقیه‌ی مراحل خوب پیش رفت.' },
  { who: 'همراه', g: 'زن',  ret: 'خیر', s: [2, 3, 3, 2, 2, 2], daysAgo: 15,
    c: 'زمان انتظار در پذیرش زیاد بود و کیفیت غذا برای بیمار مناسب نبود.' },
  { who: 'بستری', g: 'مرد', ret: 'بله', s: [5, 4, 5, 4, 5, 4], daysAgo: 18,
    c: 'ترخیص سریع انجام شد و آموزش‌های لازم هنگام ترخیص کامل داده شد.' },
  { who: 'بستری', g: 'زن',  ret: 'بله', s: [4, 5, 4, 4, 4, 5], daysAgo: 22,
    c: null },
  { who: 'همراه', g: 'مرد', ret: 'خیر', s: [2, 3, 2, 2, 3, 2], daysAgo: 26,
    c: 'در شیفت شب پاسخ‌گویی کند بود و چند بار مجبور شدیم پیگیری کنیم.' },
  { who: 'بستری', g: 'زن',  ret: 'بله', s: [5, 5, 4, 5, 4, 4], daysAgo: 31,
    c: 'نظافت اتاق و سرویس‌ها در حد انتظار و حتی بهتر بود.' },
  { who: 'بستری', g: 'مرد', ret: 'بله', s: [4, 4, 4, 4, 4, 3], daysAgo: 37,
    c: 'در مجموع تجربه‌ی خوبی بود؛ فقط پارکینگ مرکز کوچک است.' },

  // پاسخ‌های قدیمی‌تر — تا فیلتر بازه‌ی تاریخی چیزی برای فیلترکردن داشته باشد و
  // بشود روند رضایت را در چند ماه مقایسه کرد. عمداً میانگینِ ماه‌های دورتر کمی
  // پایین‌تر است تا نمودار یک روند رو به بهبود نشان دهد، نه نویز تصادفی.
  { who: 'بستری', g: 'زن',  ret: 'بله', s: [4, 5, 4, 3, 4, 4], daysAgo: 44,
    c: 'پیگیری پرونده بعد از ترخیص تلفنی انجام شد که برایم ارزشمند بود.' },
  { who: 'همراه', g: 'مرد', ret: 'بله', s: [3, 4, 4, 3, 3, 3], daysAgo: 52,
    c: null },
  { who: 'بستری', g: 'مرد', ret: 'خیر', s: [2, 2, 3, 2, 2, 2], daysAgo: 58,
    c: 'هماهنگی بین بخش‌ها ضعیف بود و چند بار اطلاعات تکراری از ما پرسیده شد.' },
  { who: 'بستری', g: 'زن',  ret: 'بله', s: [4, 4, 5, 4, 4, 4], daysAgo: 65,
    c: 'اتاق تمیز بود و پرستار شیفت صبح خیلی خوب توضیح می‌داد.' },
  { who: 'همراه', g: 'زن',  ret: 'بله', s: [3, 4, 3, 3, 4, 3], daysAgo: 73,
    c: null },
  { who: 'بستری', g: 'مرد', ret: 'بله', s: [4, 5, 4, 4, 5, 4], daysAgo: 81,
    c: 'تسویه‌حساب صندوق سریع بود و راهنمایی کامل انجام شد.' },
  { who: 'بستری', g: 'زن',  ret: 'خیر', s: [2, 3, 2, 2, 2, 3], daysAgo: 88,
    c: 'زنگ احضار پرستار دیر پاسخ داده می‌شد، مخصوصاً شب‌ها.' },
  { who: 'همراه', g: 'مرد', ret: 'بله', s: [3, 4, 4, 3, 3, 4], daysAgo: 96,
    c: null },
  { who: 'بستری', g: 'زن',  ret: 'بله', s: [4, 4, 4, 3, 4, 3], daysAgo: 104,
    c: 'روند پذیرش نسبت به مراجعه‌ی قبلی‌ام بهتر شده بود.' },
  { who: 'بستری', g: 'مرد', ret: 'بله', s: [3, 4, 3, 3, 3, 3], daysAgo: 112,
    c: null },
  { who: 'همراه', g: 'زن',  ret: 'خیر', s: [2, 3, 2, 2, 3, 2], daysAgo: 120,
    c: 'ساعت ملاقات محدود بود و فضای انتظار برای همراهان کافی نبود.' },
  { who: 'بستری', g: 'مرد', ret: 'بله', s: [3, 3, 4, 3, 3, 3], daysAgo: 129,
    c: null },
  { who: 'بستری', g: 'زن',  ret: 'بله', s: [4, 4, 3, 3, 4, 3], daysAgo: 138,
    c: 'برخورد پرسنل پذیرش خوب بود ولی فرم‌های کاغذی زیاد بود.' },
  { who: 'همراه', g: 'مرد', ret: 'بله', s: [3, 4, 3, 4, 3, 3], daysAgo: 147,
    c: null },
];

function isoDaysAgo(n) {
  const t = new Date(tehranNow().getTime() - n * 86400000);
  return t.toISOString().slice(0, 19).replace('T', ' ');
}

function runMigration() {
  console.log('[Seed SatisfactionSamples] Starting...');
  try {
    const h = db.prepare('SELECT id FROM hospitals WHERE name = ?').get(HOSPITAL_NAME);
    if (!h) { console.log('[Seed SatisfactionSamples] بیمارستان نمونه هنوز ساخته نشده — رد شد'); return; }

    const already = db.prepare('SELECT COUNT(*) c FROM public_satisfaction_surveys WHERE hospital_id = ?').get(h.id).c;
    if (already > 0) {
      console.log(`[Seed SatisfactionSamples] از قبل ${already} نظرسنجی دارد — چیزی اضافه نشد`);
      return;
    }

    // ستون source روی این جدول وجود ندارد (seed-satisfaction فقط به medical_error_reports
    // و patient_complaints_suggestions اضافه‌اش می‌کند) — این جدول ذاتاً فقط ورودی عمومی
    // می‌گیرد، پس چیزی برای تفکیک ندارد.
    const ins = db.prepare(`INSERT INTO public_satisfaction_surveys
      (id, hospital_id, respondent_type, patient_gender, would_return, scores, overall_score, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    let n = 0;
    db.transaction(() => {
      for (const row of SAMPLES) {
        const scores = {};
        let total = 0, answered = 0;
        SECTIONS.forEach((key, i) => {
          const base = row.s[i];
          const arr = [];
          for (let q = 0; q < QUESTION_COUNTS[key]; q++) {
            const v = vary(base, row.daysAgo + i * 3 + q);
            arr.push(v); total += v; answered++;
          }
          scores[key] = arr;
        });
        // همان فرمول route عمومی، تا داشبورد تفاوتی بین این داده و داده‌ی واقعی نبیند
        const overall = Math.round((total / answered) * 10) / 10;
        ins.run(crypto.randomUUID(), h.id, row.who, row.g, row.ret,
          JSON.stringify(scores), overall, row.c, isoDaysAgo(row.daysAgo));
        n++;
      }
    })();
    console.log(`[Seed SatisfactionSamples] ✅ ${n} نظرسنجی نمونه برای «${HOSPITAL_NAME}» ثبت شد`);
  } catch (err) {
    console.error('[Seed SatisfactionSamples] ❌ Failed:', err.message);
  }
}

if (require.main === module) { runMigration(); process.exit(0); }

module.exports = { runMigration };
