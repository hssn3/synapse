/**
 * دانا — دستیار هوشمند داخلی بیمارستان
 *
 * معماری دو لایه، طبق تصمیم کارفرما:
 *
 *   لایه‌ی ۱ (assistant-context.js): بازیابی از داده‌ی خودِ سامانه. رایگان، فوری،
 *   بدون مصرف توکن. چهار منبع دارد: راهنمای ماژول‌های سامانه، کتاب ۳۹۵ سنجه‌ی اعتباربخشی،
 *   دانشِ تأییدشده‌ی همان بیمارستان، و آمارِ زنده‌ی همان بیمارستان.
 *
 *   لایه‌ی ۲ (ai-provider.js): تبدیلِ آن بافت به جوابِ فارسیِ روان.
 *
 * ــ دو بازنگریِ مهم که به این شکل رسید ــ
 *
 * الف) در طراحی اول، لایه‌ی ۱ اگر چیزی پیدا می‌کرد *جای* جواب می‌نشست و لایه‌ی ۲
 * اصلاً صدا زده نمی‌شد. نتیجه دو باگ بود که کارفرما هم دید: کاربر به‌جای جواب،
 * سه تا متنِ خامِ سنجه می‌گرفت؛ و هر پاسخِ لایه‌ی ۲ به‌عنوان draft ذخیره و دفعه‌ی
 * بعد بدون هیچ بازبینی به‌عنوان جواب برگردانده می‌شد (از دیدِ کاربر: «دانا دیگر
 * جواب نمی‌دهد»). حالا لایه‌ی ۱ *بافت* می‌سازد نه جواب، و draft هرگز سرو نمی‌شود.
 *
 * ب) بازیابی فقط دو جا را می‌گشت: متنِ سنجه‌ها و assistant_knowledge. یعنی به دو
 * دسته سؤالِ کاملاً طبیعی هیچ جوابی نداشت — «این کار را از کجای سامانه انجام
 * بدهم؟» و «وضعیتِ ما چطور است؟». هر دو حالا منبعِ خودشان را دارند (راهنمای
 * ماژول‌ها و آمارِ زنده)، پس دانا دیگر برای نصفِ سؤال‌ها دست‌خالی نیست.
 *
 * متنِ خامِ بافت فقط وقتی مستقیم نشان داده می‌شود که لایه‌ی ۲ در دسترس نباشد
 * (کلید تنظیم نشده، سقف توکن پر شده، یا سرویس خطا داد) — پس‌افتِ آبرومند، نه
 * مسیرِ اصلی.
 *
 * دو مرزِ سختِ لایه‌ی ۱ سرِ جایشان می‌مانند، چون امنیتی‌اند نه کیفیتی:
 * محدوده‌ی نقش (blocked) و محافظِ خارج‌از‌حوزه — هر دو *قبل* از خرجِ توکن.
 *
 * سقف توکن ماهانه‌ی هر بیمارستان از assistant_hospital_settings خوانده می‌شود؛
 * وقتی پر شود، فقط لایه‌ی ۱ کار می‌کند و کاربر با پیغام روشن مطلع می‌شود —
 * هرگز بی‌صدا شکست نمی‌خورد.
 */
const { db, query } = require('../config/database-sqlite');
// چرا: مرز ماه تهران است نه UTC — وگرنه ریست شمارنده مصرف دانا چند ساعت زود/دیر می‌افتاد.
const { tehranTodayStr } = require('../config/jalali');
const { uuid } = require('../utils/db');
const { chatComplete } = require('./ai-provider');
const { scopeFor } = require('../config/role-axes');
const ctxEngine = require('./assistant-context');

const ASSISTANT_NAME = 'دانا';

// ---------- لایه‌ی ۱: بازیابی ----------
//
// کلِ منطقِ بازیابی به src/services/assistant-context.js منتقل شد. اینجا فقط
// صدا زده می‌شود. دلیلِ جداسازی در سرِ همان فایل نوشته شده: بازیابی از دو منبع
// به چهار منبع رسید (راهنمای ماژول‌های سامانه، کتاب سنجه‌ها، دانشِ تأییدشده،
// آمارِ زنده) و ماندنش داخل این فایل، نقطه‌ی ورودِ گفت‌وگو را ناخوانا می‌کرد.
const { buildContext, contextBlock, fallbackFromContext, normalize } = ctxEngine;

// ---------- محافظِ خارج‌از‌حوزه (جلوی هدررفتن توکنِ API روی سؤالِ بی‌ربط) ----------
//
// کارفرما صریح خواست: کاربر نباید بتواند با سؤالِ درسی/عمومی («این مسئله‌ی
// ریاضی چطور حل می‌شود؟») توکنِ API را هدر بدهد. این یک فیلتر ابتدایی و
// محافظه‌کارانه است — فقط وقتی متن هیچ نشانه‌ای از حوزه‌ی بیمارستان/اعتباربخشی
// ندارد و صریحاً یک نشانه‌ی رایجِ خارج از حوزه دارد مسدود می‌کند، نه هر متنِ
// نامفهوم را (تا سؤالِ واقعی کاربر اشتباهی رد نشود).
const DOMAIN_HINTS = ['بیمار', 'بیمارستان', 'اعتباربخش', 'سنجه', 'استاندارد', 'کمیته', 'پرستار',
  'ایمنی', 'کیفیت', 'آموزش', 'ممیز', 'حسابرس', 'پروتکل', 'دستورالعمل', 'شاخص', 'گزارش', 'وظیف',
  'سمت', 'پرونده', 'درمان', 'عفونت', 'دارو', 'تجهیز', 'فرآیند', 'خطا', 'حادثه', 'رضایت', 'مادر',
  'باردار', 'پزشک', 'بخش', 'واحد', 'مدیریت', 'سازمان', 'کارکنان', 'نیرو', 'آزمایشگاه', 'رادیولوژی',
  'بالینی', 'اورژانس', 'دانا', 'سیستم', 'سامانه', 'کارتابل', 'داشبورد'];
const OFFTOPIC_SIGNALS = [
  'ریاضی', 'معادله', 'انتگرال', 'مشتق', 'لگاریتم', 'هندسه', 'فیزیک', 'شیمی آلی',
  'پایتخت', 'جغرافیا', 'کشورهای جهان', 'قاره', 'اقیانوس', 'فرانسه', 'لهستان', 'نروژ', 'هلند', 'اسلواکی',
  'آلمان', 'انگلیس', 'بریتانیا', 'ایتالیا', 'اسپانیا', 'روسیه', 'آمریکا', 'کانادا', 'برزیل', 'چین', 'ژاپن', 'ترکیه',
  'تاریخ جهان', 'جنگ جهانی', 'پادشاه', 'سلسله', 'امپراتوری', 'رئیس جمهور', 'انتخابات', 'سیاست خارجی',
  'ترجمه کن', 'شعر', 'شعر بگو', 'داستان', 'داستان بنویس', 'انشا', 'جوک', 'لطیفه', 'طنز', 'فیلم سینما',
  'سینما', 'سریال', 'بازیگر', 'سلبریتی', 'آهنگ بخون', 'موسیقی', 'کنسرت', 'خواننده', 'بازی کامپیوتری',
  'گیم', 'پلی استیشن', 'کد پایتون', 'کد جاوا', 'برنامه‌نویسی',
  'آب و هوا', 'پیش‌بینی هوا', 'ارز دیجیتال', 'بیت کوین', 'اتریوم', 'سهام بورس', 'قیمت طلا', 'قیمت دلار',
  'دستور پخت', 'آشپزی', 'طرز تهیه', 'طالع بینی', 'فال', 'فوتبال', 'جام جهانی', 'لیگ برتر', 'والیبال', 'بسکتبال',
  'قیمت ماشین', 'قیمت خودرو', 'تعمیر خودرو'
];

function isOffTopic(text) {
  const t = normalize(text);
  if (DOMAIN_HINTS.some(w => t.includes(normalize(w)))) return false;
  return OFFTOPIC_SIGNALS.some(w => t.includes(normalize(w)));
}

// ---------- سقف توکن ----------

function getSettings(hospitalId) {
  let row = query('SELECT * FROM assistant_hospital_settings WHERE hospital_id = ?', [hospitalId]).rows[0];
  if (!row) {
    query(`INSERT INTO assistant_hospital_settings (hospital_id) VALUES (?)`, [hospitalId]);
    row = query('SELECT * FROM assistant_hospital_settings WHERE hospital_id = ?', [hospitalId]).rows[0];
  }
  // ریست ماهانه: اگر period_start از ماه جاری قدیمی‌تر است، شمارنده صفر می‌شود
  const thisMonth = tehranTodayStr().slice(0, 7);
  if ((row.period_start || '').slice(0, 7) !== thisMonth) {
    query(`UPDATE assistant_hospital_settings
           SET tokens_used_this_period = 0, period_start = ?
           WHERE hospital_id = ?`, [thisMonth + '-01', hospitalId]);
    row.tokens_used_this_period = 0;
  }
  return row;
}

function hasBudget(settings) {
  return settings.tokens_used_this_period < settings.monthly_token_budget;
}

function spendTokens(hospitalId, n) {
  query(`UPDATE assistant_hospital_settings
         SET tokens_used_this_period = tokens_used_this_period + ?
         WHERE hospital_id = ?`, [n, hospitalId]);
}

// ---------- گفت‌وگو ----------

function ensureConversation(hospitalId, userId, conversationId) {
  if (conversationId) {
    const c = query('SELECT id FROM assistant_conversations WHERE id = ? AND hospital_id = ? AND user_id = ?',
      [conversationId, hospitalId, userId]).rows[0];
    if (c) return conversationId;
  }
  const id = uuid();
  query(`INSERT INTO assistant_conversations (id, hospital_id, user_id, title) VALUES (?, ?, ?, ?)`,
    [id, hospitalId, userId, null]);
  return id;
}

function saveMessage(conversationId, role, content, source, tokens) {
  query(`INSERT INTO assistant_messages (id, conversation_id, role, content, source, tokens_used)
         VALUES (?, ?, ?, ?, ?, ?)`,
    [uuid(), conversationId, role, content, source || null, tokens || 0]);
  query(`UPDATE assistant_conversations SET updated_at = datetime('now'), title = COALESCE(title, ?)
         WHERE id = ?`, [content.slice(0, 60), conversationId]);
}

// آخرین چند نوبتِ همین گفت‌وگو، برای اینکه پرسشِ پیگیرانه («چرا؟»، «مثالش را
// بگو») بافت داشته باشد. سقفِ ۸ پیام عمدی است: هم هزینه‌ی توکن را مهار می‌کند و
// هم جلوی این را می‌گیرد که یک گفت‌وگوی طولانی کم‌کم از سقفِ context مدل بزند
// بیرون. پیام‌های 'internal' (خطاها و پیغام‌های سیستمی) کنار گذاشته می‌شوند —
// اینها حرفِ دستیار نیستند و در تاریخچه فقط مدل را گمراه می‌کنند.
const HISTORY_TURNS = 8;
function recentHistory(conversationId) {
  const rows = query(
    `SELECT role, content, source FROM assistant_messages
     WHERE conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    [conversationId, HISTORY_TURNS * 2]).rows;
  // فقط نوبت‌هایی که واقعاً *جواب* گرفتند وارد تاریخچه می‌شوند. پرسشی که به مرزِ
  // نقش خورد یا خارج‌از‌حوزه رد شد، پاسخِ external ندارد و باید کنار برود —
  // وگرنه در نوبتِ بعد به مدل داده می‌شود و در تست دیده شد که مدل وسطِ جوابِ یک
  // سؤالِ بی‌ربط، به همان پرسشِ مسدودشده اشاره می‌کند. حرفِ درستی می‌زند، ولی
  // پرسشِ مسدودشده اصلاً نباید دوباره جلوی چشمش برود.
  const answered = [];
  let pending = [];
  for (const m of rows.reverse()) {
    if (!String(m.content || '').trim()) continue;
    if (m.role === 'user') { pending.push({ role: 'user', content: String(m.content).slice(0, 2000) }); continue; }
    if (m.source === 'external') {
      answered.push(...pending, { role: 'assistant', content: String(m.content).slice(0, 2000) });
    }
    pending = [];   // پاسخِ internal یعنی آن پرسش رد شد؛ خودش و پرسشش هر دو حذف
  }
  const kept = answered.slice(-HISTORY_TURNS);
  // Anthropic (و چند سرویس دیگر) نمی‌پذیرند که تاریخچه با پیامِ دستیار شروع شود.
  // چون پیام‌های internal حذف شده‌اند، این حالت واقعاً پیش می‌آید.
  while (kept.length && kept[0].role === 'assistant') kept.shift();
  return kept;
}

// نقطه‌ی ورود اصلی. هرگز مستقیم فراخوان‌کننده را با فروشنده‌ی بیرونی درگیر
// نمی‌کند — فقط متن پاسخ و اینکه از کدام لایه آمد را برمی‌گرداند.
//
// roleCode/permissions همان چیزی است که middleware احراز هویت روی req.user
// می‌گذارد (بدون درخواستِ اضافه به دیتابیس) — برای محدودکردنِ حوزه‌ی جست‌وجوی
// داخلی به نقشِ همان کاربر (نه فیلترِ سطحِ بالاتر، بلکه دقیقاً همان چیزی که در
// رابط اصلیِ سنجه‌ها هم اعمال می‌شود).
// ---------- دستورِ سیستمی ----------
//
// این متن، شخصیت و مرزهای دانا را تعیین می‌کند و مهم‌ترین چیزی است که کیفیتِ
// جواب را می‌سازد. سه چیز عمداً در آن هست که قبلاً نبود:
//
//   ۱. دانا می‌داند *چه چیزی* هست: نامِ مرکز، سمتِ پرسنده، و اینکه این یک سامانه‌ی
//      عملیاتی است — پس جوابش «برو به فلان صفحه و این کار را بکن» است، نه یک
//      مقاله‌ی عمومی درباره‌ی اعتباربخشی.
//   ۲. قاعده‌ی صریحِ استناد: هرچه از بافت آمده باید با کدِ سنجه یا نامِ مسیر ارجاع
//      داده شود، و هرچه در بافت نیست باید صریح «نمی‌دانم» بگیرد. بدون این بند،
//      مدل خلأ را با دانشِ عمومیِ خودش پر می‌کند و کاربر فرق آن را نمی‌فهمد.
//   ۳. قاعده‌ی عدد: عددها فقط از آمارِ زنده. مدل حق ندارد عددِ قابل‌باور بسازد —
//      در یک پرونده‌ی اعتباربخشی، عددِ ساختگی بدتر از سکوت است.
function buildSystemPrompt({ hospitalName, roleLabel, roleScope, ctx }) {
  const who = roleLabel ? `کاربری که الان می‌پرسد، «${roleLabel}» است.` : '';
  const roleScopeNote = roleScope === '*' ? ''
    : ' این کاربر فقط به بخشی از محورهای اعتباربخشی دسترسی دارد؛ اگر سؤال درباره‌ی حوزه‌ی سمتِ دیگری بود، '
      + 'بگو این اطلاعات در اختیار این سمت نیست و درباره‌اش توضیح نده.';

  const lines = [
    `تو «${ASSISTANT_NAME}» هستی، دستیار داخلی سامانه‌ی جامع مدیریت بیمارستانی «${hospitalName || 'این مرکز'}».`,
    who,
    'این سامانه یک ابزار عملیاتیِ روزمره است، نه دایرةالمعارف. جوابِ خوب یعنی کاربر بعد از خواندنش بداند '
      + 'دقیقاً چه کاری، در کدام بخشِ سامانه، انجام بدهد.',
    'کوتاه و ساخت‌یافته بنویس: حداکثر چند جمله یا یک فهرستِ کوتاه. فارسیِ رسمی و روان، بدون تعارف و بدون مقدمه‌چینی.',
    'هیچ‌وقت متنِ داده‌شده را عیناً رونویسی نکن؛ خلاصه و ترجمه‌اش کن به «کاربر باید چه کند».',
    'اگر چیزی را نمی‌دانی یا در اطلاعاتِ داده‌شده نیست، صریح بگو نمی‌دانم و بگو از چه کسی/کجا باید بپرسد. هرگز حدس نزن.',
    'فقط درباره‌ی همین بیمارستان صحبت کن؛ هیچ اطلاعاتی از مرکز دیگری نداری و نباید فرض کنی داری.'
      + roleScopeNote,
    `اگر سؤال ربطی به اعتباربخشی، کیفیت، ایمنی بیمار، یا اداره‌ی همین بیمارستان نداشت (سؤال درسی، ریاضی، `
      + 'سرگرمی، برنامه‌نویسی و مانند آن)، مؤدبانه بگو خارج از حوزه‌ی کاری توست و پاسخ نده.',
    // بدون این بند، پرسشِ کوتاهِ پیگیرانه («چرا؟»، «یعنی چه؟») به‌عنوان سؤالِ
    // بی‌ربط رد می‌شد — در تست دیده شد که مدل به «چرا؟» گفت «خارج از حوزه‌ی کاری
    // من است»، درحالی‌که نوبتِ قبلِ همان گفت‌وگو درباره‌ی بهداشت دست بود.
    'اگر پیامِ کاربر کوتاه یا ارجاعی بود («چرا؟»، «یعنی چه؟»، «مثال بزن»، «ادامه بده»)، آن را دنباله‌ی '
      + 'همان موضوعِ نوبتِ قبلیِ همین گفت‌وگو بگیر و در همان زمینه جواب بده؛ خارج از حوزه حسابش نکن.',
    'هیچ عددی از خودت نساز. عدد فقط از بخشِ «آمارِ زنده» مجاز است؛ اگر آماری داده نشده، بگو باید از خودِ صفحه‌ی مربوطه دید.',
    'نامِ افراد، شماره‌ی ملی، شماره‌ی تماس و هر داده‌ی شخصیِ دیگر را در پاسخ نیاور، حتی اگر در متن دیدی.',
  ].filter(Boolean);

  if (!ctx.empty) {
    lines.push(
      '',
      'اطلاعاتِ زیر از داده‌ی خودِ همین سامانه بازیابی شده است. پاسخت را فقط بر پایه‌ی همین‌ها بساز:',
      '- هرجا به سنجه‌ای استناد می‌کنی، کدش را بیاور (مثلاً «سنجه‌ی الف-۱-۲-۳»).',
      '- هرجا مسیری را معرفی می‌کنی، عیناً همان مسیرِ نوشته‌شده را بگو و مسیرِ من‌درآوردی نساز.',
      '- اگر این اطلاعات به پرسش ربط ندارد، اصلاً به آن اشاره نکن و صریح بگو در سامانه چیزی پیدا نشد.',
      '',
      contextBlock(ctx),
    );
  } else {
    lines.push('',
      'برای این پرسش هیچ اطلاعاتِ مرتبطی در داده‌ی سامانه پیدا نشد. اگر پاسخِ عمومی و مطمئنی درباره‌ی '
      + 'اعتباربخشی یا مدیریت بیمارستان داری، کوتاه بده و صریح بگو که این از دانشِ عمومی است نه از داده‌ی '
      + 'همین مرکز؛ وگرنه بگو نمی‌دانم.');
  }
  return lines.join('\n');
}

async function handleMessage({ hospitalId, userId, conversationId, text, hospitalName, roleCode, roleLabel, permissions }) {
  const convId = ensureConversation(hospitalId, userId, conversationId);
  // تاریخچه *قبل* از ذخیره‌ی پیامِ فعلی خوانده می‌شود، وگرنه پیامِ جاری دو بار
  // به مدل می‌رسید (یک‌بار در history و یک‌بار به‌عنوان userText).
  const history = recentHistory(convId);
  saveMessage(convId, 'user', text, null, 0);

  // لایه‌ی ۱ — بازیابی، محدود به حوزه‌ی نقشِ همین کاربر
  const roleScope = scopeFor(roleCode, permissions);
  let ctx = buildContext({ hospitalId, userId, text, roleScope, perms: permissions });

  // پرسشِ پیگیرانه («برای همان موضوع اولین قدم چیست؟»، «چرا؟»، «مثال بزن») هیچ
  // کلمه‌ی موضوعی ندارد، پس بازیابی روی خودش همیشه دست‌خالی برمی‌گشت و دانا
  // می‌گفت «چیزی پیدا نشد» — درحالی‌که موضوع در پیامِ قبلیِ همان گفت‌وگو بود.
  // در تست دقیقاً همین دیده شد: پرسشِ «بهداشت دست» درست جواب گرفت و پیگیریِ
  // بلافاصله بعدش دست‌خالی ماند.
  //
  // راه‌حل: اگر بازیابی چیزی نیافت، یک‌بار دیگر با «پرسشِ قبلی + پرسشِ فعلی»
  // امتحان می‌شود. فقط وقتی نتیجه‌ی بهتری داد جایگزین می‌شود، و مرزِ نقش دوباره
  // روی همان متنِ ترکیبی اعمال می‌گردد — پس هیچ راهِ دور‌زدنی باز نمی‌کند.
  if (ctx.empty || ctxEngine.needsHistoryContext(text)) {
    // دو نوبتِ آخرِ کاربر، نه یکی: زنجیره‌ی «… ← چرا؟ ← یعنی چه؟» وگرنه در گامِ
    // دوم به یک پرسشِ ارجاعیِ دیگر می‌رسد که خودش هم موضوعی ندارد.
    const prevUsers = history.filter(m => m.role === 'user').slice(-2).map(m => m.content);
    if (prevUsers.length) {
      const merged = buildContext({
        hospitalId, userId, text: `${prevUsers.join(' ')} ${text}`, roleScope, perms: permissions,
      });
      if (!merged.blocked && !merged.empty) ctx = merged;
    }
  }

  // تنها موردی که هنوز کوتاه‌مدار می‌کند: موضوع در کتابِ سنجه هست ولی بیرون از
  // حوزه‌ی این سمت است و هیچ منبعِ دیگری هم چیزی نداشت. مرزِ دسترسی است، نه
  // کمبودِ اطلاعات — پس لایه‌ی ۲ هم نباید ببیندش.
  if (ctx.blocked) {
    const msg = 'این موضوع مربوط به حوزه‌ی کاری سمتِ شما در این سامانه نیست، پس نمی‌توانم دراین‌باره اطلاعات بدهم. '
      + 'اگر سؤالتان درباره‌ی سنجه‌ها یا وظایفِ خودِ سمتتان است، دوباره بپرسید.';
    saveMessage(convId, 'assistant', msg, 'internal', 0);
    return { conversationId: convId, reply: msg, source: 'internal', roleBlocked: true };
  }

  // محافظِ خارج‌از‌حوزه — قبل از رسیدن به لایه‌ی ۲ (همان‌جایی که توکن مصرف می‌شود)
  if (isOffTopic(text)) {
    const msg = `این سؤال به حوزه‌ی کاری ${ASSISTANT_NAME} (اعتباربخشی و مدیریت همین بیمارستان) مربوط نیست، پس پاسخ داده نمی‌شود.`;
    saveMessage(convId, 'assistant', msg, 'internal', 0);
    return { conversationId: convId, reply: msg, source: 'internal', offTopic: true };
  }

  // لایه‌ی ۲ — فقط اگر بودجه باشد. اگر نبود و لایه‌ی ۱ چیزی پیدا کرده بود،
  // به‌جای «نمی‌توانم»، همان بافتِ خام داده می‌شود؛ ناقص است ولی بهتر از هیچ.
  const settings = getSettings(hospitalId);
  if (!hasBudget(settings)) {
    const why = 'سقف توکن این ماه برای کمکِ پیشرفته تمام شده، پس نتوانستم جواب را به زبان ساده توضیح بدهم. '
              + 'سوپرادمین می‌تواند سقف را از پنل خودش افزایش دهد.';
    const msg = ctx.empty
      ? 'سقف توکن این ماه برای کمکِ پیشرفته تمام شده و در اطلاعات سامانه هم چیزی درباره‌ی این سؤال پیدا نکردم. '
        + 'سوپرادمین می‌تواند سقف را از پنل خودش افزایش دهد.'
      : fallbackFromContext(ctx, why);
    saveMessage(convId, 'assistant', msg, 'internal', 0);
    return { conversationId: convId, reply: msg, source: 'internal', budgetExceeded: true };
  }
  if (!settings.api_key && settings.provider !== 'custom') {
    const why = 'کلید سرویس کمکی هنوز برای این مرکز تنظیم نشده، پس نتوانستم جواب را به زبان ساده توضیح بدهم. '
              + 'سوپرادمین باید کلید را از پنل خودش وارد کند.';
    const msg = ctx.empty
      ? 'برای پاسخ به این سؤال به کمکِ پیشرفته نیاز دارم که هنوز برای این مرکز تنظیم نشده. '
        + 'سوپرادمین باید کلید سرویس را از پنل خودش وارد کند.'
      : fallbackFromContext(ctx, why);
    saveMessage(convId, 'assistant', msg, 'internal', 0);
    return { conversationId: convId, reply: msg, source: 'internal', notConfigured: true };
  }

  const systemPrompt = buildSystemPrompt({ hospitalName, roleLabel, roleScope, ctx });

  let ext;
  try {
    ext = await chatComplete({
      provider: settings.provider, apiKey: settings.api_key, model: settings.model,
      baseUrl: settings.base_url, systemPrompt, userText: text, history,
    });
  } catch (err) {
    // سرویس بیرونی خطا داد. اگر لایه‌ی ۱ چیزی داشت، همان را بدهیم — کاربر
    // دستِ‌خالی نماند.
    const why = `ارتباط با سرویس کمکی برقرار نشد: ${err.message}`;
    const msg = ctx.empty ? why : fallbackFromContext(ctx, why);
    saveMessage(convId, 'assistant', msg, 'internal', 0);
    return { conversationId: convId, reply: msg, source: 'internal', error: true };
  }

  // پاسخِ خالی از سرویس (سقفِ توکن مدل، فیلترِ محتوا، یا مدلی که فقط
  // reasoning پر کرده) نباید به‌شکل حبابِ خالی به کاربر برسد.
  if (!ext.text || !ext.text.trim()) {
    const why = 'سرویس کمکی پاسخ خالی برگرداند — ممکن است مدل انتخاب‌شده برای این پرسش مناسب نباشد.';
    const msg = ctx.empty ? why : fallbackFromContext(ctx, why);
    saveMessage(convId, 'assistant', msg, 'internal', 0);
    return { conversationId: convId, reply: msg, source: 'internal', error: true };
  }

  spendTokens(hospitalId, ext.tokens || 0);
  saveMessage(convId, 'assistant', ext.text, 'external', ext.tokens || 0);

  // «یاد گرفتن»: پاسخ به‌عنوان پیش‌نویس ذخیره می‌شود تا انسانی بازبینی و تأیید
  // کند؛ تا آن موقع لایه‌ی ۱ سرو نمی‌کندش (بالا توضیح داده شد).
  //
  // شرایط سخت‌گیرانه برای جلوگیری از انباشت سؤالات نامربوط یا جواب‌های بی‌ارزش:
  // ۱) حداقل ۸۰ نویسه و بدون آمارِ زنده
  // ۲) سؤال نباید خارج از حوزه (off-topic) باشد
  // ۳) سؤال باید حداقل یک نشانه از حوزه‌ی بیمارستان/سلامت/اعتباربخشی داشته باشد یا بافت غیرخالی
  // ۴) عنوان نباید دنباله یا تکه‌کلام مبهم باشد (مانند «چرا؟»، «برای همان موضوع...»)
  // ۵) پاسخ نباید انصراف، نفی یا خطا باشد («خارج از حوزه»، «نمی‌دانم»، «پیدا نشد»، «پاسخ بدل»)
  const isRefusalOrJunk = /خارج از حوز|نمی‌دانم|پیدا نشد|موجود نیست|پاسخِ بدل|ارتباط با سرویس|سقف توکن|سرویس کمکی/i.test(ext.text);
  const isEllipticalQuery = /^(چرا\??|برای همان|بله|خیر|ادامه|بیشتر بگو)$/i.test(text.trim());
  const isHospitalDomain = DOMAIN_HINTS.some(w => normalize(text).includes(normalize(w))) || !ctx.empty;

  if (ext.text.trim().length >= 80 && !ctx.facts.length && !isOffTopic(text) && !isRefusalOrJunk && !isEllipticalQuery && isHospitalDomain) {
    query(`INSERT INTO assistant_knowledge (id, hospital_id, title, content, source_type, status, created_by)
           VALUES (?, ?, ?, ?, 'ai_answer', 'draft', ?)`,
      [uuid(), hospitalId, text.slice(0, 120), ext.text, userId]);
  }

  return { conversationId: convId, reply: ext.text, source: 'external', tokensUsed: ext.tokens || 0 };
}

function listConversations(hospitalId, userId) {
  return query(
    `SELECT id, title, updated_at FROM assistant_conversations
     WHERE hospital_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 30`,
    [hospitalId, userId]).rows;
}

function listMessages(hospitalId, userId, conversationId) {
  const c = query('SELECT id FROM assistant_conversations WHERE id = ? AND hospital_id = ? AND user_id = ?',
    [conversationId, hospitalId, userId]).rows[0];
  if (!c) return null;
  return query(
    `SELECT role, content, source, created_at FROM assistant_messages
     WHERE conversation_id = ? ORDER BY created_at ASC`, [conversationId]).rows;
}

module.exports = { handleMessage, listConversations, listMessages, getSettings, ASSISTANT_NAME };
