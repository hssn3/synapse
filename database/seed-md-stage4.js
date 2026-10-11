/**
 * Seed مرحله ۴ (313): یافته‌های بازخوانی عمیق G2+G3 — چک‌لیست‌های عملیاتی + اسناد + فرایند انتقال
 * چرا: ۱۷ یافته تازه مستند (ترالی 9701، شوک 1041، تمرین EOP، ایمنی دارو، برادن، پیگیری کودک،
 * ممیزی میدانی، کیس D3، نمونه LASA، HICS، فرایند انتقال 9608، استوک ICU VIP، برآورد نیرو).
 * بدون نام حقیقی. idempotent با چک کد/عنوان. همه hospital_id دارند.
 * Run: npm run seed-md-stage4
 */
const crypto = require('crypto');
function store() { return require('../src/config/database-sqlite'); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.floor(Math.random() * 1e9)); }

const CHECKLISTS = [
  ['OH.NM.CL.9701.03', 'چک‌لیست کنترل ترالی کد اورژانس', [
    'دمای محل استقرار ترالی کنترل و چارت شود (۲۵-۳۳ درجه)',
    'داروهای کمتر از ۶ ماه انقضا خارج و مارکرگذاری شوند',
    'لیبل قرمز پرخطر + برچسب زرد LASA + تست شوک هر شیفت + کپسول اکسیژن متصل',
  ]],
  ['OH.NM.CL.1041.41.44', 'چک‌لیست کار با الکتروشوک', [
    'فشار پدل: بزرگسال ۸-۱۱ کیلوگرم، کودک ۵ کیلوگرم',
    'انرژی مونو ۳۶۰ ژول / بای‌فازیک ۱۲۰-۲۰۰ ژول؛ اولین شوک ۱۲۰-۲۰۰',
    'پدل اول فضای ۲ راست استرنوم، دوم فضای ۵ میدکلاویکولار + ۲ دقیقه ماساژ پس از شوک',
  ]],
  ['EOP-DRILL-01', 'ارزیابی تمرین بحران (EOP)', [
    'دریافت خبر ۲۴ ساعته + اعلام سطح هشدار + ثبت درس‌آموخته (M1)',
    'تدوین IAP بر اساس EOP + تجهیزات ICP',
    'فرماندهی واحد + پشتیبانی ۲ روزه آب/غذا + تخلیه + S3-S11',
  ]],
  ['SAFE-MED-01', 'ایمنی دارو و شناسایی بیمار', [
    'هفت اصل تجویز + لیست تداخلات + شناخت پرخطر و محل نگهداری',
    'حمل خون با کلدباکس + ترانسفوزیون دوپرستاره + ست جدا هر واحد',
    'دستبند نوزاد به هر دو پا + تطابق دستبند + شناسه اول/دوم/سوم',
  ]],
  ['BRADEN-01', 'ارزیابی زخم فشاری برادن', [
    'ارزیابی برادن بدو پذیرش + ارزیابی مجدد',
    'تغییر وضعیت هر ۲ ساعت + وضعیت ۳۰ درجه پهلو',
    'آزادسازی پاشنه + تشک کاهنده فشار؛ فوری: قرمزی غیرسفیدشونده/تاول/MDRPI',
  ]],
  ['PED-FOLLOW-01', 'پیگیری کودک پس از جراحی', [
    'تماس: ۳ روز پس ترخیص، هفته‌ای دوبار، سپس هفتگی/دوهفته‌ای',
    'نام‌بردن ۲ علامت خطر + داروها + مراقبت سوند + زمان ویزیت',
    'ثبت تماس: تاریخ/موفقیت/ساعت/علت عدم پاسخ',
  ]],
  ['FIELD-AUDIT-01', 'ممیزی میدانی دارویی-تجهیزاتی', [
    'دارودهی صحیح/پرخطر/یخچالی/LASA + ترالی و آنتی‌دوت',
    'ترالی <۶ ماه انقضا + فارماکوپه در بخش + باکس جداگانه بیمار',
    'کالیبره + تست روزانه + UPS + هود شیمی‌درمانی',
  ]],
];
const DOCS = [
  ['HICS-01', 'ساختار فرماندهی بحران HICS', 'procedure', 'فرمانده + ستاد فرماندهی/عمومی (عملیات/برنامه/پشتیبانی/مالی)؛ وحدت فرماندهی؛ حیطه ۳-۷ نفر؛ IAP چهارعنصری'],
  ['TROLLEY-NICU-01', 'ساختار دفتر و لیبل ترالی NICU/اتاق عمل', 'instruction', 'دفتر جدا NICU و اتاق عمل/زایمان؛ لیبل داخل کشو و نوزادان؛ تفکیک کشو ۱-۲/۳ و طبقه ۴-۵'],
  ['TRANSFER-9608-DOC', 'فرایند انتقال بین‌بخشی OH.QI.PC.9608.07', 'procedure', 'تهیه ۱۳۹۶/۱۱/۰۱، بازنگری ۱۴۰۳/۰۹/۱۵، ابلاغ ۱۴۰۳/۰۹/۲۰، ویرایش هفتم'],
  ['OH.QI.PR.9658.07', 'افزایش ظرفیت بحران', 'procedure', 'ویرایش ۷، بازنگری ۱۴۰۳/۰۹/۰۱؛ فضای جایگزین لابی/درمانگاه/آندوسکوپی؛ اطلاع‌رسانی به همراهان'],
  ['OH.QI.PR.9657.00', 'ایمنی در برابر آتش‌سوزی', 'procedure', 'آموزش اطفا هر ۶ ماه؛ بازدید ماهانه دتکتور؛ حد ارت بالای ۲۱ اهم اقدام اصلاحی'],
  ['OH.QI.PR.9659.07', 'تداوم خدمات حیاتی', 'procedure', 'اورژانس + جراحی فوری + مادر و کودک؛ تفاهم بیمارستان هم‌جوار و هلال‌احمر؛ پایش آب/برق/اکسیژن'],
  ['OH.QI.PR.9605.07', 'گزارش حوادث و RCA', 'procedure', 'ویرایش ۷؛ اطلاع فوری مخابرات و سوپروایزر؛ فرم تا ۲۴ ساعت؛ کمیته RCA تا یک هفته'],
  ['OH.QI.PR.9604.07', 'نگهداشت سرمایش/گرمایش/تهویه', 'procedure', 'بازدید روزانه/هفتگی/ماهیانه دیگ بخار؛ ثبت در شناسنامه؛ قطعات در HIS انبار'],
  ['OH.QI.PR.9663.07', 'آزمایشگاه مرجع', 'procedure', 'ویرایش ۷؛ فقط مسئول فنی و یک پذیرش مجاز تغییر در HIS؛ جواب مکتوب با محدوده مرجع'],
  ['OH.QI.BK.9701.05', 'کتابچه بدو ورود بیمار', 'instruction', 'ویرایش پنجم؛ منشور بیمار؛ ۵ موقعیت دست؛ 7Right'],
  ['OH.ED.Tt.9601.02', 'تقویم آموزشی درون‌بخشی', 'form', 'ویرایش ۴؛ الکتروشوک/گازهای خونی/تزریق خون؛ ارزشیابی PRE/POST'],
  ['UNKNOWN-PT-01', 'صورتجلسه بیمار مجهول‌الهویه', 'form', '۶ امضا (مقیم/سوپروایزر/سرپرستار/تریاژ/حراست) + مشخصات ظاهری + اثر انگشت'],
];
const LEARNINGS = [
  ['کیس ویتامین D3 (stat تا BD)', 'گزارش خطا', 'دستور یک‌نوبته در کاردکس BD ثبت و تا ۳ روز اشتباه تزریق شد', '۷ Right + چک روزانه سرپرستار + تطبیق کاردکس + اطلاع ایمنی'],
];
const NOTES = [
  ['نمونه Tall Man در LASA', 'CEFOTAxime در برابر CEFTRIAxone؛ DOPAmin در برابر DOBUTamin — ثبت با حروف بزرگ متمایز'],
  ['دمای نگهداری دارو', 'یخچال ۲-۸ (منع یخ‌زدگی)؛ ۲-۲۵ قابل یخچال/اتاق؛ اتاق ۲۵-۳۰؛ ثبت روزانه دما/رطوبت سرم'],
  ['تشخیص پرستاری NANDA', 'راه هوایی: ترشحات/کلاپس/افت SPO2؛ پرفیوژن: ترومبوز/دیابت/هیپوتانسیون؛ یبوست: کم‌تحرکی/کم‌فیبر'],
  ['وضعیت‌دهی نوزاد', 'چک‌لیست ۲۴ گویه نمره ۱-۴؛ ارزیابی مجدد ۲ ماهه؛ تغییر وضعیت غیرهوشیار هر ۲-۳ ساعت دونفره'],
  ['نقش‌های احیا (۷ نقش)', 'لیدر/ماساژ/راه هوایی/دفی/دارو/ثبت/Runner؛ اپی بعد شوک دوم، آمیودارون بعد سوم؛ عمق ۵-۶cm؛ دبریف ۱۰-۱۵ دقیقه'],
  ['سرانه آموزش', '۱۴۰۳: مجموع نفرساعت بالا با نمونه CPR دو ساعته و اثربخشی ۱۰۰؛ کارنامه با امتیاز/شیوه/ارزیابی رفتاری'],
];
const STOCKVIP = [
  ['ST-SYR3', 'سرنگ ۳ سی‌سی', 'تجهیزات', 150, 30, null],
  ['ST-SYR5', 'سرنگ ۵ سی‌سی', 'تجهیزات', 150, 30, null],
  ['ST-SYR10', 'سرنگ ۱۰ سی‌سی', 'تجهیزات', 150, 30, null],
  ['ST-SYRINS', 'سرنگ انسولین', 'تجهیزات', 300, 50, null],
  ['ST-NS100', 'سرم شستشو', 'دارو', 100, 20, null],
  ['ST-MERO', 'مروپنم', 'دارو', 20, 5, null],
  ['ST-VANCO', 'ونکومایسین ۵۰۰', 'دارو', 20, 5, null],
];
const KPIHR = [
  ['نسبت نیرو به تخت', 1.76, 'برآورد ۱۴۰۵: نیاز ۳۷۰ (۲۶۹ حرفه‌ای + ۱۰۱ غیرحرفه‌ای) برای ۱۳۹ تخت؛ موجود ۱۷۶، کمبود ۴۴'],
  ['کمبود نیروی پرستاری', 44, 'NICU کمبود ۱۳؛ ICUS و LDR در اولویت جذب'],
  ['آگاهی از هزینه درمان', 100, 'پایه ۹۰٪؛ تحقق فصلی ۸۵/۸۵/۹۰٪'],
  ['رضایت آگاهانه تهاجمی', 100, 'پیشرفت فصلی ۱۰۰/۷۵/۸۰/۸۵/۹۰٪'],
];

function run() {
  const { query } = store();
  let hospitals = [];
  try { hospitals = query('SELECT id FROM hospitals WHERE is_active = 1').rows; } catch (e) { hospitals = []; }
  if (!hospitals.length) { console.log('[Seed Stage4] no hospitals. 0 rows.'); return { added: 0 }; }
  let added = 0;
  for (const h of hospitals) {
    const hid = h.id;
    for (const [code, title, items] of CHECKLISTS) {
      try {
        let row = query('SELECT id FROM checklists WHERE hospital_id=? AND checklist_code=?', [hid, code]).rows[0];
        let cid = row && row.id;
        if (!cid) {
          cid = uid();
          query('INSERT INTO checklists (id,hospital_id,title,checklist_code,status) VALUES (?,?,?,?,?)', [cid, hid, title, code, 'active']);
          added++;
        }
        const n = query('SELECT COUNT(*) c FROM checklist_items WHERE checklist_id=?', [cid]).rows[0].c;
        if (!n) items.forEach((q, i) => {
          try { query('INSERT INTO checklist_items (id,hospital_id,checklist_id,question_text,answer_type,sort_order) VALUES (?,?,?,?,?,?)', [uid(), hid, cid, q, 'yes_no', i + 1]); added++; }
          catch (e) { /* non-fatal */ }
        });
      } catch (e) { /* non-fatal */ }
    }
    for (const [code, title, dt, purpose] of DOCS) {
      try {
        if (query('SELECT 1 x FROM controlled_documents WHERE hospital_id=? AND doc_code=?', [hid, code]).rows[0]) continue;
        query('INSERT INTO controlled_documents (id,hospital_id,doc_type,title,doc_code,purpose,status,version_no) VALUES (?,?,?,?,?,?,?,?)',
          [uid(), hid, dt, title, code, purpose, 'draft', 1]);
        added++;
      } catch (e) { /* non-fatal */ }
    }
    try {
      let pr = query('SELECT id FROM processes WHERE hospital_id=? AND process_code=?', [hid, 'OH.QI.PC.9608.07']).rows[0];
      let pid = pr && pr.id;
      if (!pid) {
        pid = uid();
        query('INSERT INTO processes (id,hospital_id,title,domain,process_code,description) VALUES (?,?,?,?,?,?)',
          [pid, hid, 'فرایند انتقال بین‌بخشی', 'main', 'OH.QI.PC.9608.07', 'تهیه ۱۳۹۶/۱۱/۰۱، بازنگری ۱۴۰۳/۰۹/۱۵، ابلاغ ۱۴۰۳/۰۹/۲۰']);
        added++;
        ['درخواست انتقال با اندیکاسیون', 'هماهنگی بخش مقصد + رضایت', 'انتقال با حضور پرستار + تحویل SBAR'].forEach((t, i) => {
          try { query('INSERT INTO process_steps (id,hospital_id,process_id,step_type,text,sort_order) VALUES (?,?,?,?,?,?)', [uid(), hid, pid, 'action', t, i + 1]); added++; } catch (e) { /* non-fatal */ }
        });
      }
    } catch (e) { /* non-fatal */ }
    for (const [t, s, l, a] of LEARNINGS)
      try {
        if (query('SELECT 1 x FROM incident_learning WHERE hospital_id=? AND title=?', [hid, t]).rows[0]) continue;
        query('INSERT INTO incident_learning (id,hospital_id,title,source,lesson,action) VALUES (?,?,?,?,?,?)', [uid(), hid, t, s, l, a]);
        added++;
      } catch (e) { /* non-fatal */ }
    for (const [t, s] of NOTES)
      try {
        if (query('SELECT 1 x FROM clinical_notes WHERE hospital_id=? AND topic=?', [hid, t]).rows[0]) continue;
        query('INSERT INTO clinical_notes (id,hospital_id,topic,summary) VALUES (?,?,?,?)', [uid(), hid, t, s]);
        added++;
      } catch (e) { /* non-fatal */ }
    for (const [code, name, cat, q, rp, exp] of STOCKVIP)
      try {
        if (query('SELECT 1 x FROM stock_items WHERE hospital_id=? AND item_code=?', [hid, code]).rows[0]) continue;
        query('INSERT INTO stock_items (id,hospital_id,item_code,item_name,category,qty,reorder_point,exp_date) VALUES (?,?,?,?,?,?,?,?)', [uid(), hid, code, name, cat, q, rp, exp]);
        added++;
      } catch (e) { /* non-fatal */ }
    for (const [t, tg, df] of KPIHR)
      try {
        if (query('SELECT 1 x FROM hospital_kpis WHERE hospital_id=? AND title=?', [hid, t]).rows[0]) continue;
        query('INSERT INTO hospital_kpis (id,hospital_id,title,target_value,definition,is_active) VALUES (?,?,?,?,?,1)', [uid(), hid, t, tg, df]);
        added++;
      } catch (e) { /* non-fatal */ }
  }
  console.log('[Seed Stage4] ' + added + ' rows (idempotent).');
  return { added };
}
module.exports = { run, runMigration: run };
