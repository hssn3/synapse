/* =====================================================================
   خواندن PDF — لایه‌ی متنی، و در نبودِ آن تبدیل صفحه به تصویر
   ---------------------------------------------------------------------
   چرا این فایل لازم شد:

   کارفرما کلیدِ avalai.org دارد و می‌خواهد انبوهِ خط‌مشی و فلوچارتِ PDF را
   بالا بدهد. ولی AvalAI (مثل z.ai و OpenRouter) روی اسکیمای
   chat/completions ِ OpenAI است و آن اسکیما «بلوکِ سند» ندارد — فقط
   image_url. برای همین extractText تا امروز برای PDF صریحاً می‌گفت
   «از Anthropic یا Gemini استفاده کنید». یعنی دقیقاً کاری که کارفرما
   می‌خواهد، با کلیدی که دارد، ممکن نبود.

   راه‌حل دو مرحله‌ای است و ترتیبش عمدی:

     ۱. **اول لایه‌ی متنی.** هر PDFی که از Word یا هر نرم‌افزارِ متنی
        ساخته شده، متنش را واقعاً داخل خودش دارد. خواندنش صفر توکن خرج
        دارد، صفر خطای خواندن دارد، و از هر OCRی دقیق‌تر است. یک
        خط‌مشیِ ۴۰ صفحه‌ای اگر تایپ‌شده باشد، همین‌جا تمام می‌شود.

     ۲. **بعد تصویر، فقط برای صفحه‌هایی که لازم است.** صفحه‌ی اسکن‌شده
        لایه‌ی متنی ندارد (یا چند کاراکترِ بی‌معنی دارد). همان صفحه — نه
        کلِ سند — به PNG تبدیل و به مدلِ چندوجهی داده می‌شود. سندِ
        دورگه (چند صفحه تایپی، چند صفحه اسکن) هم درست کار می‌کند و فقط
        برای صفحه‌های اسکن‌شده توکن خرج می‌شود.

   pdfjs عمداً بدونِ worker اجرا می‌شود: در Node راه‌اندازیِ worker فقط
   پیچیدگیِ اضافه است و این‌جا هم‌زمانی لازم نداریم — فایل‌ها یکی‌یکی و
   پشت‌سرهم پردازش می‌شوند.
   ===================================================================== */
'use strict';

// pdfjs نسخه‌ی ۴ فقط ESM است و این پروژه CommonJS؛ پس import پویا. ماژول
// یک‌بار بارگذاری و نگه داشته می‌شود، چون هر بار import کردن گران است.
let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsPromise;
}

// سقف‌ها. صفحه‌ی بیشتر از این یعنی یا سندِ اشتباهی آمده یا باید تکه‌تکه
// بالا برود؛ در هر دو حالت بهتر است کاربر بداند تا اینکه ده دقیقه منتظر
// بماند و اعتبار API را خرج کند.
const MAX_PAGES = 60;
// ۱۶۰۰ پیکسل عرض برای متنِ فارسیِ اسکن‌شده کافی است و base64 ِ آن حدود
// ۴۰۰KB می‌ماند. بالاتر از این، دقتِ خواندن بهتر نمی‌شود ولی حجمِ
// درخواست و هزینه‌ی توکن بالا می‌رود.
const RASTER_WIDTH = 1600;
// صفحه‌ای که کمتر از این تعداد کاراکترِ واقعی دارد «اسکن‌شده» فرض می‌شود.
// عدد از روی نمونه‌ها آمد: صفحه‌ی اسکن‌شده معمولاً صفر یا چند کاراکترِ
// پرتِ حاشیه دارد، صفحه‌ی تایپیِ حتی خلوت هم بالای ۱۲۰ کاراکتر است.
const TEXT_PAGE_MIN_CHARS = 120;

// pdfjs برای رسمِ تصویرهای توکار (لوگو، آیکون) به یک «کارخانه‌ی کانواس»
// نیاز دارد تا خودش canvas بسازد — بدونِ این، صفحه‌ای که عکس دارد (نه فقط
// متن) با «Image or Canvas expected» می‌شکند. این همان الگویی است که
// نمونه‌ی رسمیِ pdfjs-dist برای Node مستند کرده.
class NodeCanvasFactory {
  create(width, height) {
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

// doc.canvasFactory یک getter است (نه قابلِ بازنویسی) که همان نمونه‌ای
// را برمی‌گرداند که این‌جا به getDocument داده شده — renderPages از همین
// getter برای رسمِ خودِ صفحه استفاده می‌کند.
function getDocument(pdfjs, buffer) {
  return pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // در Node فونت و کانواسِ مرورگر نیست؛ این سه گزینه هشدارها و
    // تلاش‌های بی‌فایده‌ی pdfjs برای دسترسی به آن‌ها را می‌بندد.
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
    canvasFactory: new NodeCanvasFactory(),
  }).promise;
}

/* ---------- بازسازیِ متنِ فارسی از لایه‌ی متنیِ PDF ----------

   لایه‌ی متنیِ یک PDF فارسی خامْ قابل‌استفاده نیست. اندازه‌گیری روی
   نمونه‌های واقعی نشان داد pdfjs هر *گلیف* را جدا برمی‌گرداند، با سه
   مشکل هم‌زمان:

     ۱. گلیف‌ها «شکلِ نمایشی»اند (U+FE70–FEFF و U+FB50–FDFF) نه حرفِ
        پایه: ﺑ به‌جای ب.
     ۲. ترتیب‌شان بر اساس مختصاتِ افقی است، و در متنِ راست‌به‌چپ حرفِ
        اولِ کلمه راست‌ترین است — یعنی خوانده‌شده معکوس درمی‌آید.
     ۳. هر گلیف یک آیتمِ جداست، پس اگر بینشان فاصله بگذاری کلمه
        تکه‌تکه می‌شود.

   نمونه‌ی واقعی: «ن ﺎ ت ﺳ ر ﺎ ﻤ ﯿ ﺑ» که باید «بیمارستان» باشد.

   این دقیقاً همان خانواده‌ی خرابی است که پیش‌تر در متنِ سنجه‌ها دیده شد
   («erutluC tsuJ» به‌جای «Just Culture») و در text-repair.js مستند است.

   بازسازی سه گام دارد: خطوط از روی مختصاتِ عمودی جدا می‌شوند، داخل هر
   خط گلیف‌ها به‌ترتیبِ افقی *بدون* فاصله‌ی ساختگی به‌هم می‌چسبند (خودِ
   PDF آیتمِ فاصله دارد)، و بعد خطِ «دیداری» به خطِ «منطقی» تبدیل می‌شود.

   هیچ‌کدام از این‌ها تضمینی نیست — بعضی تولیدکننده‌های PDF ترتیبِ منطقی
   می‌دهند و نباید معکوس شوند. برای همین خروجی از یک دروازه‌ی کیفیت رد
   می‌شود (looksReadable) و صفحه‌ای که رد شود «اسکن‌شده» علامت می‌خورد و
   به‌جای متن، تصویرش به مدل می‌رود. یعنی بدترین حالتِ این کد «کندتر و
   گران‌تر» است، نه «متنِ غلط». */

// آیتمی که چپ‌به‌راست خوانده می‌شود — لاتین، رقمِ لاتین، یا رقمِ
// فارسی/عربی.
const LTR_ITEM = /^[A-Za-z0-9٠-٩۰-۹]+$/;
// جداکننده‌هایی که خودشان جهت ندارند ولی *وسطِ* یک دنباله‌ی چپ‌به‌راست
// جزوِ همان دنباله‌اند. بدون این، «CL-TAS-07» سرِ هر خط تیره به سه تکه
// می‌شکست و «07-TAS-CL» درمی‌آمد.
const LTR_JOINER = /^[-_./:+]+$/;
// جداکننده‌هایی که نشانه‌ی «این یک عددِ قالب‌بندی‌شده است» (تاریخ، ساعت،
// اعشار) هستند. اندازه‌گیریِ روی PDFهای واقعیِ خودِ این پروژه نشان داد
// این تشخیص لازم است: تاریخِ «۱۴۰۵/۰۶/۰۷» و ساعتِ «۱۱:۲۸» در چاپِ کروم
// به‌صورت یک بلوکِ چپ‌به‌راست جا می‌گیرند و باید بعدِ معکوسِ کلیِ خط سرِ
// جایشان برگردند. ولی کدِ سنجه‌ی «الف-۲-۳-۱» — که رقم‌های فارسیِ تنها با
// خط‌تیره از هم جدا شده‌اند، نه / یا : — اصلاً به‌صورتِ یک بلوکِ
// چپ‌به‌راست جا نمی‌گیرد؛ هر رقمش مثل یک حرفِ معمولیِ متنِ راست‌به‌چپ در
// کنارِ بقیه می‌نشیند و با معکوسِ کلیِ خط (بدون هیچ تصحیحِ اضافه) خودش
// درست درمی‌آید. لاتین از این قاعده مستثناست: حتی با تنها خط‌تیره هم
// («CL-TAS-07») باید تصحیح شود، چون رقم/حرفِ لاتین هیچ‌وقت در کنارِ متنِ
// فارسی به‌شکلِ حرف‌به‌حرف معکوس نمی‌شود.
const NUMBER_FORMAT_JOINER = /^[./:+]+$/;
const HAS_LATIN_LETTER = /[A-Za-z]/;
const PRESENTATION_FORM = /[ﭐ-﷿ﹰ-﻿]/;
const PERSIAN_LETTER = /[؀-ۿ]/;

// شکلِ نمایشی → حرفِ پایه. NFKC دقیقاً همین کار را می‌کند و جدولِ رسمیِ
// یونیکد است، پس دستی جدول نمی‌نویسیم. لیگاتورِ «لا» هم درست به دو حرف
// باز می‌شود.
function toBaseLetters(s) {
  return s.normalize('NFKC');
}

// خطِ دیداری → خطِ منطقی.
//
// معکوس‌کردن باید روی *آیتم‌ها* باشد نه روی نویسه‌ها. اندازه‌گیری نشان
// داد بعضی آیتم‌ها دو نویسه دارند («ره» به‌عنوان یک آیتم) و آن دو نویسه
// از قبل به‌ترتیبِ منطقی‌اند؛ معکوسِ نویسه‌به‌نویسه آن‌ها را خراب می‌کرد و
// «شماره» را «شماهر» می‌ساخت.
//
// بعد از معکوس‌کردن، دنباله‌های چپ‌به‌راست (لاتین و ارقام) دوباره سرِ
// جایشان برمی‌گردند، وگرنه «CL-TAS-07» می‌شد «70-SAT-LC».
function visualToLogical(parts) {
  const rev = parts.slice().reverse();
  const isLtr = s => LTR_ITEM.test(s);
  const isJoin = s => LTR_JOINER.test(s);
  for (let i = 0; i < rev.length; i++) {
    if (!isLtr(rev[i])) continue;
    // دنباله را تا جایی جلو می‌بریم که آیتمِ چپ‌به‌راست باشد یا
    // جداکننده‌ای که *بعدش* باز هم چپ‌به‌راست می‌آید — خط تیره‌ی آخرِ
    // دنباله جزوِ آن نیست.
    let j = i;
    const joiners = [];
    for (let k = i + 1; k < rev.length; k++) {
      if (isLtr(rev[k])) { j = k; continue; }
      if (isJoin(rev[k]) && k + 1 < rev.length && isLtr(rev[k + 1])) { joiners.push(rev[k]); continue; }
      break;
    }
    // تصحیح فقط وقتی اعمال می‌شود که این واقعاً یک بلوکِ چپ‌به‌راست
    // باشد: لاتین دارد، یا با جداکننده‌ی «عددِ قالب‌بندی‌شده» به‌هم
    // وصل شده — نه صرفاً چند رقمِ فارسیِ کنارِ هم با خط‌تیره.
    const runText = rev.slice(i, j + 1).join('');
    const eligible = j > i && (HAS_LATIN_LETTER.test(runText) || joiners.every(g => NUMBER_FORMAT_JOINER.test(g)));
    if (eligible) {
      const run = rev.slice(i, j + 1).reverse();
      for (let k = 0; k < run.length; k++) rev[i + k] = run[k];
    }
    i = j;
  }
  return rev.join('');
}

// آیا این خط اصلاً راست‌به‌چپ است؟ خطی که فقط لاتین/عدد دارد نباید
// معکوس شود.
function isRtlLine(line) {
  return PERSIAN_LETTER.test(line);
}

// دروازه‌ی کیفیت. اگر بعد از بازسازی هنوز شکلِ نمایشی مانده، یا نسبتِ
// حروفِ فارسی به کلِ نویسه‌ها خیلی کم است، به این متن اعتماد نمی‌کنیم.
function looksReadable(text) {
  if (!text) return false;
  if (PRESENTATION_FORM.test(text)) return false;
  const solid = text.replace(/\s/g, '');
  if (solid.length < TEXT_PAGE_MIN_CHARS) return false;
  // تک‌حرفی‌های جدا‌افتاده نشانه‌ی همان خرابیِ گلیف‌به‌گلیف‌اند: در متنِ
  // سالمِ فارسی «و» و «به» و امثالشان هستند ولی نه بیشتر از یک‌سومِ
  // کلمه‌ها.
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 12) {
    const singles = words.filter(w => [...w].length === 1).length;
    if (singles / words.length > 0.34) return false;
  }
  return true;
}

// آیتم‌ها به خط تقسیم می‌شوند. مبنا مختصاتِ عمودی است؛ اختلافِ کمتر از
// نصفِ ارتفاعِ خط یعنی همان خط (زیرنویس و بالانویس نباید خطِ جدید شوند).
function groupLines(items) {
  const rows = [];
  for (const it of items) {
    if (typeof it.str !== 'string' || !it.str) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const h = Math.abs(it.height || it.transform[3] || 10) || 10;
    const w = Math.abs(it.width || 0);
    const row = rows.find(r => Math.abs(r.y - y) <= Math.max(2, h * 0.5));
    if (row) { row.items.push({ x, w, str: it.str }); row.y = (row.y + y) / 2; }
    else rows.push({ y, h, items: [{ x, w, str: it.str }] });
  }
  // از بالای صفحه به پایین: در PDF مبدأ پایین‌چپ است، پس y نزولی
  rows.sort((a, b) => b.y - a.y);
  return rows;
}

function pageItemsToText(content) {
  const lines = [];
  for (const row of groupLines(content.items)) {
    // ترتیبِ افقی = ترتیبِ دیداری. فاصله‌ی ساختگی اضافه نمی‌کنیم چون هر
    // گلیف یک آیتم است و خودِ PDF آیتمِ فاصله دارد.
    const sorted = row.items.sort((a, b) => a.x - b.x);
    // خانه‌های کنارِ هم در یک جدول روی یک خط می‌افتند و بدون این، متنشان
    // به‌هم می‌چسبد («همه انواعهمه وضعیت‌ها»). فاصله‌ی افقیِ بزرگ‌تر از
    // نصفِ ارتفاعِ خط یعنی مرزِ خانه، پس یک فاصله گذاشته می‌شود.
    const gapMin = Math.max(2, (row.h || 10) * 0.5);
    const parts = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      if (i > 0) {
        const prev = sorted[i - 1];
        const gap = cur.x - (prev.x + prev.w);
        if (gap > gapMin && !/\s$/.test(prev.str) && !/^\s/.test(cur.str)) parts.push(' ');
      }
      parts.push(toBaseLetters(cur.str));
    }
    const flat = parts.join('');
    lines.push(isRtlLine(flat) ? visualToLogical(parts) : flat);
  }
  return lines.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * لایه‌ی متنیِ همه‌ی صفحه‌ها.
 * برمی‌گرداند: { pageCount, pages: [{ page, text, scanned }] }
 * scanned=true یعنی این صفحه متنِ قابل‌استفاده نداشت و باید تصویر شود.
 */
async function readTextLayer(buffer) {
  const pdfjs = await loadPdfjs();
  const doc = await getDocument(pdfjs, buffer);
  try {
    const pageCount = doc.numPages;
    const limit = Math.min(pageCount, MAX_PAGES);
    const pages = [];
    for (let i = 1; i <= limit; i++) {
      const page = await doc.getPage(i);
      let text = '';
      try {
        text = pageItemsToText(await page.getTextContent());
      } finally {
        page.cleanup();
      }
      // یک دروازه، نه دو تا: looksReadable هم کوتاهیِ متن را می‌گیرد
      // (صفحه‌ی اسکن‌شده) هم بازسازیِ ناموفق را. هر صفحه‌ای که رد شود
      // متنش دور ریخته می‌شود تا هیچ‌جا متنِ نصفه‌خراب جا نیفتد.
      const ok = looksReadable(text);
      pages.push({ page: i, text: ok ? text : '', scanned: !ok });
    }
    return { pageCount, truncated: pageCount > limit, pages };
  } finally {
    await doc.destroy();
  }
}

/**
 * تبدیلِ صفحه‌های خواسته‌شده به PNG.
 * pageNumbers: آرایه‌ی شماره‌ی صفحه (۱-پایه). خالی یعنی هیچ‌کدام.
 * برمی‌گرداند: [{ page, buffer, mimeType }]
 */
async function renderPages(buffer, pageNumbers) {
  const wanted = (pageNumbers || []).filter(n => Number.isInteger(n) && n > 0);
  if (!wanted.length) return [];
  const pdfjs = await loadPdfjs();
  const doc = await getDocument(pdfjs, buffer);
  try {
    const out = [];
    for (const n of wanted) {
      if (n > doc.numPages) continue;
      const page = await doc.getPage(n);
      try {
        const base = page.getViewport({ scale: 1 });
        // مقیاس از عرضِ هدف می‌آید، نه یک عددِ ثابت — وگرنه صفحه‌ی A3
        // و A5 دو کیفیتِ کاملاً متفاوت می‌گرفتند.
        const viewport = page.getViewport({ scale: RASTER_WIDTH / base.width });
        // کانواس از همان کارخانه‌ای می‌آید که getDocument گرفت (canvas
        // factory بالا) — همان چیزی که تصویرهای توکارِ PDF (لوگو، آیکون)
        // را هم می‌تواند رسم کند.
        const canvasAndCtx = doc.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const ctx = canvasAndCtx.context;
        // PDF پس‌زمینه‌ی شفاف دارد؛ بدون این، متنِ سیاه روی شفاف می‌نشیند
        // و بعضی مدل‌ها آن را سیاهِ روی سیاه می‌بینند.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasAndCtx.canvas.width, canvasAndCtx.canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvasFactory: doc.canvasFactory }).promise;
        out.push({ page: n, buffer: canvasAndCtx.canvas.toBuffer('image/png'), mimeType: 'image/png' });
        doc.canvasFactory.destroy(canvasAndCtx);
      } finally {
        page.cleanup();
      }
    }
    return out;
  } finally {
    await doc.destroy();
  }
}

/**
 * تصمیمِ کامل برای یک PDF: چه چیزی از لایه‌ی متنی درآمد، و کدام صفحه‌ها
 * باید به مدل داده شوند. خودِ صدازننده تصمیم می‌گیرد تصویرها را بفرستد
 * یا نه (ممکن است کاربر نخواهد توکن خرج شود).
 */
async function planExtraction(buffer) {
  const { pageCount, truncated, pages } = await readTextLayer(buffer);
  const scannedPages = pages.filter(p => p.scanned).map(p => p.page);
  return {
    pageCount,
    truncated,
    pages,
    scannedPages,
    // سندی که هیچ صفحه‌ی متن‌داری ندارد، کلاً اسکن است
    fullyScanned: scannedPages.length === pages.length && pages.length > 0,
    textOnly: scannedPages.length === 0,
  };
}

module.exports = {
  readTextLayer, renderPages, planExtraction,
  MAX_PAGES, RASTER_WIDTH, TEXT_PAGE_MIN_CHARS,
};
