/**
 * آداپتور مستقل از فروشنده برای کمکِ بیرونیِ دستیار.
 *
 * چرا این لایه‌ی جدا لازم است: کارفرما صریح گفت می‌خواهد بتواند از z.ai، Gemini،
 * OpenRouter، avalai.org «یا هر مدل API دیگری» استفاده کند و بینشان جابه‌جا شود.
 * اگر کد جاهای مختلف مستقیم fetch به یک URL خاص می‌زد، آن سوییچ یعنی گشتن در کل
 * کد. با این آداپتور، فقط ردیف provider/model/api_key/base_url در
 * assistant_hospital_settings عوض می‌شود.
 *
 * تصمیم اصلی: اکثر قریب به اتفاق فروشنده‌ها (z.ai، avalai، OpenRouter، Together،
 * Groq، Fireworks، DeepSeek، vLLM و Ollama خودمیزبان و…) همان فرمتِ
 * chat/completions ِ OpenAI را پیاده می‌کنند. پس *یک* پیاده‌سازی نوشته شده و
 * فروشنده‌های نام‌دار فقط «پیش‌تنظیم» اند: نشانی و مدل پیش‌فرض. نتیجه‌اش این است
 * که افزودن فروشنده‌ی تازه یک ردیف در PRESETS است، نه یک آداپتور تازه.
 * فقط دو فروشنده فرمت خودشان را دارند و پیاده‌سازی جدا گرفته‌اند:
 * Anthropic (Messages API) و Gemini (generateContent).
 *
 * قاعده‌ی ایمنی که همین‌جا اعمال می‌شود، نه در لایه‌ی بالاتر: هیچ‌کدام از این
 * توابع فیلدهای هویتی بیمار نمی‌گیرند و انتظار نمی‌رود بگیرند — فراخوان‌کننده
 * (assistant-chat.js) فقط عنوان/متنِ سنجه و اسناد را پاس می‌دهد، نه پرونده‌ی
 * بیمار. این‌جا برای اطمینانِ دوم، systemPrompt همیشه یک خط صریح دارد که مدل
 * را از خواستن اطلاعات هویتی منع می‌کند.
 */

// ---------- پیش‌تنظیم فروشنده‌ها ----------
// kind: کدام پیاده‌سازی؛ baseUrl: نشانی پیش‌فرض (کاربر می‌تواند بازنویسی کند)؛
// model: مدل پیش‌فرض وقتی کاربر چیزی ننوشته؛ needsBaseUrl: نشانی الزامی است؟
const PRESETS = {
  anthropic: { kind: 'anthropic', label: 'Anthropic (Claude)', model: 'claude-opus-5',
    keyHint: 'console.anthropic.com' },
  // gemini-2.0-flash از سمتِ گوگل کاملاً از رده خارج شده (۴۰۴ «no longer
  // available» — با کلیدِ واقعیِ کارفرما تأیید شد)؛ هر بیمارستانی که فروشنده
  // را روی Gemini گذاشته بود و مدل را خالی رها کرده بود، همین‌جا ساکت شکست
  // می‌خورد. gemini-3.5-flash-lite سبک‌ترینِ خانواده‌ی پایدارِ فعلی است و
  // متن/تصویر/PDF هر سه را می‌خواند — با همان کلید تست شد.
  gemini: { kind: 'gemini', label: 'Google Gemini', model: 'gemini-3.5-flash-lite',
    keyHint: 'aistudio.google.com' },
  openrouter: { kind: 'openai', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.0-flash-exp:free', keyHint: 'openrouter.ai/keys' },
  zai: { kind: 'openai', label: 'Z.ai', baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-4.6', keyHint: 'z.ai' },
  avalai: { kind: 'openai', label: 'AvalAI', baseUrl: 'https://api.avalai.ir/v1',
    model: 'gpt-4o-mini', keyHint: 'avalai.ir' },
  openai: { kind: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini', keyHint: 'platform.openai.com' },
  custom: { kind: 'openai', label: 'سفارشی (هر API سازگار با OpenAI)', needsBaseUrl: true,
    model: 'gpt-3.5-turbo', keyHint: 'نشانی سرویس را خودتان وارد کنید' },
};

// ---------- ابزارهای مشترک ----------
function estimateTokens(str) {
  // تخمین درشت وقتی فروشنده تعداد توکن واقعی را برنمی‌گرداند — فقط برای سقفِ
  // مصرف، نه محاسبه‌ی دقیق صورتحساب.
  return Math.ceil((str || '').length / 4);
}

// کاربر ممکن است نشانی را به هر شکلی بچسباند: با اسلشِ آخر، بدون /v1، یا حتی
// کاملِ «…/v1/chat/completions». هر سه باید کار کند، وگرنه اولین تجربه‌ی کاربر
// یک ۴۰۴ ِ گیج‌کننده است.
function chatUrl(baseUrl) {
  let u = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(u)) return u;
  return u + '/chat/completions';
}

// محتوای پاسخ در همه‌ی سرویس‌ها رشته‌ی ساده نیست: بعضی (طبق همان اسکیمای OpenAI)
// آرایه‌ای از بلوک‌ها برمی‌گردانند، و بعضی مدل‌های استدلالی متنِ نهایی را کنارِ
// reasoning_content می‌گذارند. اگر فقط رشته را بخوانیم، پاسخ خالی دیده می‌شود.
function openaiText(msg) {
  if (!msg) return '';
  const c = msg.content;
  if (typeof c === 'string' && c.trim()) return c;
  if (Array.isArray(c)) {
    const t = c.map(b => (typeof b === 'string' ? b : (b && (b.text || b.content)) || '')).join('');
    if (t.trim()) return t;
  }
  // آخرین تلاش: مدل‌هایی که فقط reasoning_content پر می‌کنند
  if (typeof msg.reasoning_content === 'string') return msg.reasoning_content;
  return '';
}

// پیامِ خطای فروشنده در چند شکل مختلف می‌آید (error.message، error رشته‌ای،
// detail، message). سوپرادمینی که دارد کلید را تست می‌کند باید علت را ببیند.
function openaiError(data, status, label) {
  const e = data && data.error;
  const msg = (e && (e.message || (typeof e === 'string' ? e : null)))
    || (data && (data.detail || data.message))
    || null;
  if (status === 401 || status === 403) return `کلید API ${label} پذیرفته نشد (${status})${msg ? ' — ' + msg : ''}`;
  if (status === 404) return `نشانی یا نام مدل پیدا نشد (۴۰۴)${msg ? ' — ' + msg : ''} — Base URL و نام مدل را بررسی کنید`;
  if (status === 429) return `سقف نرخ درخواست ${label} پر شده — کمی بعد دوباره تلاش کنید`;
  if (status >= 500) return `سرویس ${label} خطای داخلی داد (${status})${msg ? ' — ' + msg : ''}`;
  return msg ? `خطای ${label} (${status}) — ${String(msg).slice(0, 200)}` : `خطای ${label} (${status})`;
}

// ---------- پیاده‌سازی‌ها ----------
const KINDS = {
  // https://docs.anthropic.com/en/api/messages
  async anthropic({ apiKey, model, systemPrompt, userText, baseUrl, history, signal }) {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
    let res;
    try {
      res = await client.messages.create({
        model: model || PRESETS.anthropic.model,
        max_tokens: 4096,
        // پاسخِ دستیار یک جوابِ کوتاهِ فارسی به پرسشِ کارکنان است، نه کارِ
        // استدلالیِ سنگین؛ تلاشِ «متوسط» کیفیت را نگه می‌دارد و هزینه را پایین.
        output_config: { effort: 'medium' },
        system: systemPrompt,
        messages: [...(history || []), { role: 'user', content: userText }],
      }, signal ? { signal } : undefined);
    } catch (err) {
      // abort باید دست‌نخورده به chatComplete برسد؛ اگر اول با APIError
      // تطبیق داده شود، پیامِ timeout به «خطای آنتروپیک (undefined)» تبدیل می‌شود.
      if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR')) throw err;
      if (err instanceof Anthropic.AuthenticationError) throw new Error('کلید API آنتروپیک نامعتبر است');
      if (err instanceof Anthropic.RateLimitError) throw new Error('سقف نرخ درخواست آنتروپیک پر شده — کمی بعد دوباره تلاش کنید');
      if (err instanceof Anthropic.BadRequestError) throw new Error(`درخواست نامعتبر — نام مدل را بررسی کنید (${String(err.message).slice(0, 120)})`);
      if (err instanceof Anthropic.APIError) throw new Error(`خطای آنتروپیک (${err.status}) — ${String(err.message).slice(0, 120)}`);
      throw err;
    }
    // آنتروپیک ممکن است به‌دلایل ایمنی پاسخ ندهد؛ این خطا نیست (HTTP 200) و اگر
    // بی‌صدا رد شود، کاربر یک جوابِ خالی می‌بیند بدون اینکه بفهمد چرا.
    if (res.stop_reason === 'refusal') throw new Error('مدل به این درخواست پاسخ نداد (محدودیت ایمنی سرویس)');
    const text = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const u = res.usage || {};
    const tokens = (u.input_tokens || 0) + (u.output_tokens || 0) || estimateTokens(systemPrompt + userText + text);
    return { text, tokens, model: res.model || model || PRESETS.anthropic.model };
  },

  // https://ai.google.dev/gemini-api/docs
  async gemini({ apiKey, model, systemPrompt, userText, baseUrl, history, signal }) {
    const mdl = model || PRESETS.gemini.model;
    const root = (baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    const url = `${root}/models/${encodeURIComponent(mdl)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    // جمنای نقشِ دستیار را 'model' می‌نامد، نه 'assistant'.
    const past = (history || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }],
    }));
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [...past, { role: 'user', parts: [{ text: userText }] }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(openaiError(data, res.status, 'Gemini'));
    const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    const tokens = data?.usageMetadata?.totalTokenCount || estimateTokens(systemPrompt + userText + text);
    return { text, tokens, model: mdl };
  },

  // فرمت chat/completions ِ OpenAI — مشترکِ z.ai، AvalAI، OpenRouter، OpenAI و
  // هر سرویس سفارشی/خودمیزبان.
  async openai({ apiKey, model, systemPrompt, userText, baseUrl, preset, label, history, signal }) {
    const base = baseUrl || (preset && preset.baseUrl);
    if (!base) {
      const err = new Error('نشانی (Base URL) این سرویس تنظیم نشده');
      err.code = 'NO_BASE_URL';
      throw err;
    }
    const mdl = model || (preset && preset.model) || 'gpt-3.5-turbo';
    const res = await fetch(chatUrl(base), {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        // OpenRouter این دو هدر را برای شناسایی برنامه می‌خواهد؛ بقیه‌ی
        // سرویس‌ها نادیده‌شان می‌گیرند، پس فرستادنشان بی‌ضرر است.
        'HTTP-Referer': 'https://hospital-accreditation.app',
        'X-Title': 'Hospital Accreditation Platform',
      },
      body: JSON.stringify({
        model: mdl,
        messages: [{ role: 'system', content: systemPrompt }, ...(history || []),
          { role: 'user', content: userText }],
        // بعضی سرویس‌ها (از جمله چند مدل z.ai) بدون max_tokens پاسخ را می‌برند
        // یا خطا می‌دهند؛ مقدار صریح، رفتار را بین فروشنده‌ها یکسان می‌کند.
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });
    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (e) { /* پاسخِ غیر-JSON پایین‌تر گزارش می‌شود */ }
    if (!res.ok) throw new Error(openaiError(data, res.status, label || 'سرویس'));
    if (!data || !Array.isArray(data.choices)) {
      // سرویسی که ۲۰۰ می‌دهد ولی اسکیمای OpenAI ندارد — معمولاً یعنی Base URL
      // به جای اشتباهی (مثلاً صفحه‌ی HTML) اشاره می‌کند.
      throw new Error(`پاسخ ${label || 'سرویس'} با فرمت OpenAI نمی‌خواند — Base URL را بررسی کنید`
        + (raw ? ` (${raw.slice(0, 120)})` : ''));
    }
    const text = openaiText(data.choices[0] && data.choices[0].message).trim();
    const tokens = data?.usage?.total_tokens || estimateTokens(systemPrompt + userText + text);
    return { text, tokens, model: data.model || mdl };
  },
};

// ---------- خواندن متن از عکس / PDF ----------
// کارفرما: «کاربر عکس بگیره از یه صفحه، متن رو بخونه، بعد بذاره توی قسمت مورد
// نظر — مثلاً خط‌مشی». این یک OCR محلی نیست؛ همان مدلِ چندوجهیِ فروشنده‌ی
// انتخاب‌شده این کار را می‌کند، پس کیفیتِ فارسی‌خوانی‌اش هم‌سطحِ همان مدل است.
//
// چرا جدا از chatComplete: شکلِ «بلوکِ تصویر» در هر سه خانواده‌ی API متفاوت است و
// چپاندنش در همان تابع، امضای آن را برای مسیرِ متنیِ ساده هم پیچیده می‌کرد.
const OCR_PROMPT =
  'متنِ این تصویر/سند را دقیقاً همان‌طور که هست استخراج کن. '
  + 'ساختار را حفظ کن: عنوان‌ها، بندها، شماره‌گذاری و جدول‌ها (جدول را خط‌به‌خط بنویس). '
  + 'چیزی به متن اضافه نکن، خلاصه نکن، و توضیح یا مقدمه ننویس — فقط خودِ متن. '
  + 'اگر بخشی خوانا نیست، به‌جایش [ناخوانا] بگذار.';

// یک یا چند تصویر را به مدل می‌دهد و متنِ استخراج‌شده را برمی‌گرداند. سه
// شکلِ بلوکِ متفاوت (Anthropic/Gemini/OpenAI-compatible) این‌جا جمع شده تا
// هم مسیرِ «یک عکس» هم مسیرِ «چند صفحه‌ی اسکن‌شده از یک PDF» از همین یک
// پیاده‌سازی استفاده کنند.
async function extractFromImages({ preset, apiKey, model, baseUrl, images, promptText }) {
  if (preset.kind === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
    const blocks = images.map(im => ({ type: 'image',
      source: { type: 'base64', media_type: im.mimeType, data: im.buffer.toString('base64') } }));
    let res;
    try {
      res = await client.messages.create({
        model: model || preset.model, max_tokens: 8000,
        messages: [{ role: 'user', content: [...blocks, { type: 'text', text: promptText }] }],
      });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new Error('کلید API آنتروپیک نامعتبر است');
      if (err instanceof Anthropic.APIError) throw new Error(`خطای آنتروپیک (${err.status}) — ${String(err.message).slice(0, 140)}`);
      throw err;
    }
    if (res.stop_reason === 'refusal') throw new Error('مدل خواندن این سند را نپذیرفت');
    const u = res.usage || {};
    return { text: (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim(),
             tokens: (u.input_tokens || 0) + (u.output_tokens || 0), model: res.model || model || preset.model };
  }

  if (preset.kind === 'gemini') {
    const mdl = model || preset.model;
    const root = (baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    const parts = images.map(im => ({ inlineData: { mimeType: im.mimeType, data: im.buffer.toString('base64') } }));
    const res = await fetch(`${root}/models/${encodeURIComponent(mdl)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [...parts, { text: promptText }] }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(openaiError(data, res.status, 'Gemini'));
    return { text: (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim(),
             tokens: data?.usageMetadata?.totalTokenCount || 0, model: mdl };
  }

  // OpenAI-compatible — همین شکل برای z.ai، avalai، OpenRouter، OpenAI و سفارشی.
  const base = baseUrl || preset.baseUrl;
  if (!base) { const e = new Error('نشانی (Base URL) این سرویس تنظیم نشده'); e.code = 'NO_BASE_URL'; throw e; }
  const mdl = model || preset.model;
  const imgBlocks = images.map(im => ({ type: 'image_url',
    image_url: { url: `data:${im.mimeType};base64,${im.buffer.toString('base64')}` } }));
  const res = await fetch(chatUrl(base), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      'HTTP-Referer': 'https://hospital-accreditation.app',
      'X-Title': 'Hospital Accreditation Platform',
    },
    body: JSON.stringify({
      model: mdl, max_tokens: 8000,
      messages: [{ role: 'user', content: [{ type: 'text', text: promptText }, ...imgBlocks] }],
    }),
  });
  const raw = await res.text();
  let data = {}; try { data = raw ? JSON.parse(raw) : {}; } catch (e) { /* پایین‌تر */ }
  if (!res.ok) throw new Error(openaiError(data, res.status, preset.label));
  if (!data || !Array.isArray(data.choices)) {
    throw new Error(`پاسخ ${preset.label} با فرمت OpenAI نمی‌خواند — Base URL را بررسی کنید`);
  }
  return { text: openaiText(data.choices[0] && data.choices[0].message).trim(),
           tokens: data?.usage?.total_tokens || 0, model: data.model || mdl };
}

// نشانه‌ای که صفحه‌ها را در پاسخِ مدل از هم جدا می‌کند — یک رشته‌ی بی‌ربط به
// هر متنِ واقعی، تا split هرگز اشتباهی وسطِ متنِ سند نبرد.
const PAGE_MARK = p => `\n<<<SAHFE-${p}>>>\n`;
const PAGE_MARK_RE = /\n?<<<SAHFE-(\d+)>>>\n?/g;

// حجمِ خامِ base64 حدود ۱.۳۳ برابرِ فایل است؛ سقفِ آپلود سمت روت اعمال می‌شود.
async function extractText({ provider, apiKey, model, baseUrl, buffer, mimeType }) {
  const preset = PRESETS[provider];
  if (!preset) throw new Error(`فروشنده‌ی هوش مصنوعی نامعتبر: ${provider}`);
  if (!apiKey && provider !== 'custom') {
    const err = new Error('کلید API برای این بیمارستان تنظیم نشده — از پنل سوپرادمین تنظیم کنید');
    err.code = 'NO_API_KEY';
    throw err;
  }
  const isPdf = mimeType === 'application/pdf';

  // ---------- PDF ----------
  // راهبرد سه‌مرحله‌ای، از ارزان به گران:
  //   ۱. اگر همه‌ی صفحه‌ها لایه‌ی متنیِ سالم دارند (سندِ تایپی)، اصلاً به مدل
  //      نمی‌رود — صفر توکن، صفر خطای خواندن.
  //   ۲. اگر بخشی اسکن‌شده است، فقط همان صفحه‌ها به تصویر تبدیل و در یک
  //      درخواست (نه یکی‌یکی) به مدل داده می‌شوند؛ صفحه‌های تایپی از لایه‌ی
  //      متنی می‌آیند و نتیجه به‌ترتیبِ صفحه به‌هم می‌چسبد.
  //   ۳. این مسیر AvalAI و هر فروشنده‌ی دیگرِ سازگار با OpenAI را هم پوشش
  //      می‌دهد — قبل از این، آن‌ها اصلاً PDF نمی‌خواندند چون chat/completions
  //      بلوکِ سند ندارد؛ حالا سند به تصویر تبدیل می‌شود، نه به بلوکِ سند.
  if (isPdf) {
    const pdfPages = require('./pdf-pages');
    const plan = await pdfPages.planExtraction(buffer);
    if (!plan.pageCount) throw new Error('این PDF صفحه‌ای ندارد یا خراب است');

    if (plan.textOnly) {
      return {
        text: plan.pages.map(p => p.text).join('\n\n').trim(),
        tokens: 0, model: 'لایه‌ی متنیِ PDF (بدون هوش مصنوعی)',
        pageCount: plan.pageCount, truncated: plan.truncated,
      };
    }

    const images = await pdfPages.renderPages(buffer, plan.scannedPages);
    let aiResult = null;
    if (images.length) {
      const promptText = plan.scannedPages.length > 1
        ? `${OCR_PROMPT} چند تصویر داده شده که هرکدام یک صفحه از یک سند هستند. `
          + `متنِ هر تصویر را جدا استخراج کن و درست قبل از متنِ هر تصویر (به همان ترتیبی که آمده‌اند)، `
          + `دقیقاً همین برچسب را با شماره‌ی تصویر بگذار: ${PAGE_MARK('N').trim()}`
        : OCR_PROMPT;
      aiResult = await extractFromImages({
        preset, apiKey, model, baseUrl,
        images: images.map((im, i) => ({ ...im, index: i + 1 })),
        promptText,
      });
    }

    // متنِ برگشتی از مدل (اگر چند تصویر بود) بر اساسِ برچسب‌ها به صفحه تفکیک
    // می‌شود؛ اگر مدل برچسب نگذاشت (ممکن است نادیده بگیرد)، کلِ متن به
    // ترتیبِ همان صفحه‌های اسکن‌شده تقسیم می‌شود — تلاشِ بهترین‌حالت، نه خطا.
    const scannedText = new Map();
    if (aiResult) {
      const raw = aiResult.text || '';
      if (images.length > 1 && PAGE_MARK_RE.test(raw)) {
        PAGE_MARK_RE.lastIndex = 0;
        const chunks = raw.split(PAGE_MARK_RE);
        // split با گروهِ گیرنده، بینِ متن‌ها شماره هم برمی‌گرداند:
        // [قبل‌ازاولی, شماره1, بعدازاولی, شماره2, ...]
        for (let i = 1; i < chunks.length; i += 2) {
          scannedText.set(Number(chunks[i]), (chunks[i + 1] || '').trim());
        }
      } else if (images.length === 1) {
        scannedText.set(images[0].page, raw.trim());
      } else {
        // بدونِ برچسب و چندصفحه‌ای: بهترین‌حالت — همه زیرِ اولین صفحه
        scannedText.set(images[0].page, raw.trim());
      }
    }

    const text = plan.pages
      .map(p => (p.scanned ? (scannedText.get(p.page) || '[ناخوانا]') : p.text))
      .join('\n\n').trim();
    return {
      text, tokens: aiResult ? aiResult.tokens : 0,
      model: aiResult ? aiResult.model : 'لایه‌ی متنیِ PDF (بدون هوش مصنوعی)',
      pageCount: plan.pageCount, truncated: plan.truncated, scannedPages: plan.scannedPages,
    };
  }

  // ---------- تصویرِ تنها ----------
  return extractFromImages({ preset, apiKey, model, baseUrl,
    images: [{ buffer, mimeType }], promptText: OCR_PROMPT });
}

const SAFETY_LINE =
  'هرگز نام، کد ملی، شماره پرونده یا هر اطلاعات هویتی‌کننده‌ی بیمار را در پاسخ درخواست یا تکرار نکن؛ ' +
  'اگر متن ورودی چنین اطلاعاتی داشت، آن را نادیده بگیر.';

// history: پیام‌های پیشینِ همین گفت‌وگو به شکل [{role:'user'|'assistant', content}]،
// از قدیمی به جدید و بدون پیامِ فعلی. بدون این، هر پرسشِ پیگیرانه («چرا؟»، «مثال
// بزن») بی‌بافت به مدل می‌رسید و جوابِ بی‌ربط می‌گرفت.
async function chatComplete({ provider, apiKey, model, systemPrompt, userText, baseUrl, history, signal }) {
  const preset = PRESETS[provider];
  if (!preset) throw new Error(`فروشنده‌ی هوش مصنوعی نامعتبر: ${provider}`);
  // سرویسِ خودمیزبان ممکن است بدون کلید باشد (مثلاً vLLM یا Ollama پشتِ شبکه‌ی
  // داخلی)؛ برای بقیه‌ی فروشنده‌ها کلید همچنان الزامی است.
  if (!apiKey && provider !== 'custom') {
    const err = new Error('کلید API برای این بیمارستان تنظیم نشده — از پنل سوپرادمین تنظیم کنید');
    err.code = 'NO_API_KEY';
    throw err;
  }
  const impl = KINDS[preset.kind];
  try {
    return await impl({
      apiKey, model, baseUrl, preset, label: preset.label,
      systemPrompt: `${systemPrompt}\n\n${SAFETY_LINE}`, userText,
      history: Array.isArray(history) ? history : [],
      // سیگنال تا خودِ fetch/SDK می‌رود؛ پیش از این فقط Promise.race در روت
      // بود و درخواستِ HTTP بعد از تایم‌اوت هم باز می‌ماند.
      signal,
    });
  } catch (err) {
    // abort از سمتِ لایه‌ی بالاتر (مهلتِ چت) خطای شبکه نیست؛ پیامِ خامِ
    // «This operation was aborted» نباید به کاربر برسد.
    if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR' || err.code === 'PROVIDER_TIMEOUT')) {
      const e = new Error(`سرویس ${preset.label} به موقع پاسخ نداد`);
      e.code = 'PROVIDER_TIMEOUT';
      throw e;
    }
    // خطای شبکه‌ی خامِ fetch («fetch failed») برای کاربری که دارد لینک را دستی
    // تست می‌کند بی‌معناست — نشانی/پورت را ببیند بهتر می‌فهمد مشکل کجاست.
    if (err instanceof TypeError && /fetch failed/i.test(err.message)) {
      const cause = err.cause && err.cause.code ? ` (${err.cause.code})` : '';
      throw new Error(`اتصال به ${baseUrl || preset.baseUrl || 'سرویس'} برقرار نشد${cause} — نشانی/پورت را بررسی کنید`);
    }
    throw err;
  }
}

// ---------- طبقه‌بندیِ سندِ آپلودشده در آپلودِ انبوه ----------
// کارفرما: انبوهِ خط‌مشی و فلوچارت را آپلود کند و خودِ سامانه بفهمد کدام
// خط‌مشی است، کدام فرآیند/فلوچارت، و فیلدهای فرم را از رویِ متنِ استخراج‌شده
// پر کند — کاربر فقط تأیید می‌کند، از صفر تایپ نمی‌کند.
//
// چرا JSON آزاد و نه tool-calling: نه هر سه خانواده‌ی API این‌جا (Anthropic،
// Gemini، OpenAI-compatible) را یکسان پیاده نمی‌کنند، و کیفیتِ tool-calling
// در فروشنده‌های کوچک‌تر (avalai، z.ai) نامطمئن است. یک پرامپتِ صریح که
// خروجی را «فقط JSON» می‌خواهد، با parse مقاوم در برابرِ ```json دورش،
// روی هر مدلی جواب می‌دهد.
const CLASSIFY_SCHEMA_HINT =
  '{"kind":"document یا process","doc_type":"policy یا procedure یا instruction",'
  + '"title":"...","purpose":"...","scope":"...","definitions":"...","work_method":"...",'
  + '"responsible_person":"...","monitoring_method":"...","process_domain":"main یا managerial یا support"}';

const CLASSIFY_PROMPT =
  'متنِ زیر از یک سندِ بیمارستانی استخراج شده — ممکن است خط‌مشی، روش اجرایی، '
  + 'دستورالعمل، یا شرحِ یک فرآیند/فلوچارت باشد. این متن را بخوان و دقیقاً همین '
  + `ساختارِ JSON را برگردان، بدون هیچ متنِ اضافه قبل یا بعدش:\n${CLASSIFY_SCHEMA_HINT}\n\n`
  + 'راهنما: اگر متن شرحِ گام‌به‌گامِ یک فرآیند/جریانِ کار است (نه یک خط‌مشیِ رسمی '
  + 'با هدف/دامنه)، kind را "process" بگذار. title را از رویِ محتوا خودت بساز اگر '
  + 'در متن صریح نیامده. هر فیلدی که در متن نبود را رشته‌ی خالی بگذار — حدس نزن. '
  + 'purpose/scope/definitions/work_method/monitoring_method را از رویِ متنِ واقعی '
  + 'خلاصه یا نقل کن، اختراع نکن.';

function parseJsonLoose(raw) {
  const cleaned = String(raw || '').replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('پاسخ مدل JSON نبود');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// متنِ استخراج‌شده از یک سند را می‌گیرد و پیشنهادِ ساختاریافته برمی‌گرداند.
// متنِ خیلی بلند را کامل نمی‌فرستد — چند هزار کاراکترِ اول برای تشخیصِ نوع و
// خلاصه‌سازی کافی است و هزینه/زمان را پایین نگه می‌دارد.
async function classifyDocument({ provider, apiKey, model, baseUrl, text }) {
  const clipped = String(text || '').slice(0, 6000);
  const r = await chatComplete({
    provider, apiKey, model, baseUrl,
    systemPrompt: 'تو دستیارِ طبقه‌بندیِ اسناد یک بیمارستان هستی. فقط JSON خروجی می‌دهی.',
    userText: `${CLASSIFY_PROMPT}\n\n---\n${clipped}`,
    history: [],
  });
  let parsed;
  try { parsed = parseJsonLoose(r.text); }
  catch (e) { parsed = { kind: 'document', doc_type: 'procedure', title: '', purpose: '', scope: '',
    definitions: '', work_method: clipped.slice(0, 2000), responsible_person: '', monitoring_method: '',
    process_domain: 'main', parseError: true }; }
  const kind = parsed.kind === 'process' ? 'process' : 'document';
  const docType = ['policy', 'procedure', 'instruction'].includes(parsed.doc_type) ? parsed.doc_type : 'procedure';
  const domain = ['main', 'managerial', 'support'].includes(parsed.process_domain) ? parsed.process_domain : 'main';
  return {
    suggestion: {
      kind, doc_type: docType, process_domain: domain,
      title: String(parsed.title || '').slice(0, 300),
      purpose: String(parsed.purpose || ''), scope: String(parsed.scope || ''),
      definitions: String(parsed.definitions || ''), work_method: String(parsed.work_method || ''),
      responsible_person: String(parsed.responsible_person || '').slice(0, 200),
      monitoring_method: String(parsed.monitoring_method || ''),
    },
    tokens: r.tokens, model: r.model,
  };
}

// ---------------------------------------------------------------------------
// استخراجِ گام‌های فلوچارت از متنِ یک فرآیند
// ---------------------------------------------------------------------------
// چرا جدا از classifyDocument: آن تابع فیلدهای *متنیِ* یک سند را برمی‌گرداند
// (هدف، دامنه، روش کار) و هیچ‌وقت گام و یال نمی‌دهد. کارفرما فایلِ PDFِ یک
// فرآیندِ تک‌صفحه‌ای را آپلود می‌کرد و انتظار داشت فلوچارت پر شود، ولی از مدل
// اصلاً «گام» خواسته نشده بود — پس هرچقدر هم مدل خوب بود، خروجی نداشت.
//
// خروجی عمداً گراف است نه فهرستِ خطی: مدلِ داده‌ی فلوچارتِ سامانه گراف جهت‌دار
// است (شاخه‌ی بله/خیر و حلقه‌ی بازگشت) و اگر این‌جا فقط زنجیره برگردانیم،
// تصمیم‌ها بی‌شاخه می‌مانند و کاربر باید دستی بسازد — یعنی همان کاری که
// می‌خواست انجام ندهد.
const FLOW_SCHEMA_HINT =
  '{"title":"...","description":"...","steps":[{"n":1,"text":"...","step_type":"start|action|decision|document|end","owner":"..."}],'
  + '"links":[{"from":1,"to":2,"label":""}]}';

const FLOW_PROMPT =
  'متنِ زیر از یک سندِ فرآیندِ بیمارستانی استخراج شده (ممکن است خودش فلوچارت باشد). '
  + `آن را به گام‌های فلوچارت تبدیل کن و دقیقاً همین JSON را برگردان، بدون هیچ متنِ اضافه:\n${FLOW_SCHEMA_HINT}\n\n`
  + 'قواعد:\n'
  + '۱) هر گام یک شماره‌ی یکتا (n) از ۱ به بالا دارد. links با همین شماره‌ها ارجاع می‌دهند.\n'
  + '۲) دقیقاً یک گام از نوع start و حداقل یک گام از نوع end بگذار.\n'
  + '۳) هر جا در متن پرسش یا شرط هست (اگر…، در صورت…، آیا…) آن را step_type=decision '
  + 'بگذار و از آن دو یال بیرون بیاور با label «بله» و «خیر». تصمیمِ بدونِ دو شاخه ننویس.\n'
  + '۴) اگر گامی به گامِ قبلی برمی‌گردد (اصلاح و تکرار)، همان یالِ بازگشتی را بنویس؛ حلقه اشکالی ندارد.\n'
  + '۵) step_type=document برای تکمیل/صدور فرم و سند.\n'
  + '۶) owner را فقط اگر متن صریح گفته چه کسی/چه واحدی انجام می‌دهد بنویس، وگرنه خالی.\n'
  + '۷) متنِ هر گام کوتاه و کاری باشد (حداکثر حدود ۱۲ کلمه)، از خودت گام اختراع نکن.\n'
  + '۸) بین ۳ تا ۱۸ گام. اگر متن واقعاً فرآیند نیست، steps را خالی برگردان.';

async function extractFlowchart({ provider, apiKey, model, baseUrl, text }) {
  const clipped = String(text || '').slice(0, 12000);
  const r = await chatComplete({
    provider, apiKey, model, baseUrl,
    systemPrompt: 'تو دستیارِ تبدیلِ شرحِ فرآیند به فلوچارتِ استاندارد در یک بیمارستان هستی. فقط JSON خروجی می‌دهی.',
    userText: `${FLOW_PROMPT}\n\n---\n${clipped}`,
    history: [],
  });
  let parsed;
  try { parsed = parseJsonLoose(r.text); }
  catch (e) { return { flow: { title: '', description: '', steps: [], links: [], parseError: true }, tokens: r.tokens, model: r.model }; }

  const TYPES = ['start', 'action', 'decision', 'document', 'end'];
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 24) : [];
  // شماره‌ی مدل → شناسه‌ی داخلی. مدل گاهی شماره‌ها را غیرترتیبی یا تکراری
  // می‌دهد؛ نگاشت صریح باعث می‌شود یالِ بی‌مقصد ساخته نشود.
  const byNum = new Map();
  const steps = [];
  for (let i = 0; i < rawSteps.length; i++) {
    const s = rawSteps[i] || {};
    const txt = String(s.text || '').trim();
    if (!txt) continue;
    const n = Number.isFinite(+s.n) ? +s.n : (i + 1);
    if (byNum.has(n)) continue;
    const id = 'ai' + (steps.length + 1);
    byNum.set(n, id);
    steps.push({
      id,
      step_type: TYPES.includes(s.step_type) ? s.step_type : 'action',
      text: txt.slice(0, 300),
      owner: String(s.owner || '').trim().slice(0, 120),
    });
  }
  const seen = new Set();
  const links = (Array.isArray(parsed.links) ? parsed.links : []).reduce((acc, l) => {
    const from = byNum.get(Number.isFinite(+(l || {}).from) ? +l.from : NaN);
    const to = byNum.get(Number.isFinite(+(l || {}).to) ? +l.to : NaN);
    // یالِ بی‌مبدأ/بی‌مقصد یا به خودش، فلوچارت را خراب می‌کند — دور ریخته می‌شود
    if (!from || !to || from === to) return acc;
    const key = from + '>' + to + '>' + String((l && l.label) || '');
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push({ from, to, label: String((l && l.label) || '').trim().slice(0, 40) });
    return acc;
  }, []);

  return {
    flow: {
      title: String(parsed.title || '').trim().slice(0, 300),
      description: String(parsed.description || '').trim().slice(0, 2000),
      steps, links,
    },
    tokens: r.tokens, model: r.model,
  };
}

module.exports = {
  chatComplete, extractText, classifyDocument, extractFlowchart, estimateTokens, PRESETS,
  PROVIDERS: Object.keys(PRESETS),
};
