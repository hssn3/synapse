# 05-fix-report — اصلاح و تکمیل کد (فاز پایانی ۲)

## باگ‌های رفع‌شده
1. کوکی Secure روی http://IP:port لاگین را می‌شکست (مرورگر پس نمی‌فرستاد). اصلاح: secure فقط روی https واقعی (req.secure/x-forwarded-proto)؛ sameSite strict→lax. اثبات: Set-Cookie بدون Secure روی http + /me 200.
2. logout بدون بلاک‌لیست (توکن تا ۸ ساعت زنده). اصلاح: jwt-blocklist + چک در ۳ middleware. اثبات: Bearer قدیمی 401 «نشست پایان یافته».
3. نداشتن Origin/Referer چک. اصلاح: middleware ملایم در security.js. اثبات: evil 403، بدون هدر عبور.
4. tracking_code تیکت داخلی از کلاینت می‌آمد. اصلاح: تولید سمت سرور TCK-… با یکتایی.
5. تاریخ RPG مقدار قبلی را نشان نمی‌داد. اصلاح: jalaliDateInputHtml(id,{value}).
6. موبایل/کدملی با ارقام فارسی NaN می‌داد. اصلاح: inputmode/maxlength/dir=ltr در موتور + اسپک CRM.
7. CRM admission/discharge متنی بودند. اصلاح: t:date. نمره بدون سقف. اصلاح: min/max.

## امنیت
- XSS: esc() موجود؛ ادامه دارد. CSRF: SameSite=Lax + Origin چک. JWT: blocklist. RateLimit: دست نخورد (سخاوتمندانه بیمارستانی).

## استاندارد فایل‌ها
- موجود از قبل: .env.example, .gitignore, docker-compose.yml, dockerfile, eslint. اضافه شد: buttons-system.css/js, jwt-blocklist.js, seed-telegram-docs.js, seed-md-package-c.js, scripts/agent-test.js. JSDoc «چرا»محور بالای هر تابع تازه.

## بدهی مانده (صادقانه)
- ۴۸ confirm/prompt بومی دیگر (app.js ۳۶، سایر ۱۲) هنوز به BTN نرفته‌اند — قرارداد آماده است.
- E2E مرورگری واقعی انجام نشد.
