# 08-agent-test-report — ایجنت خودمختار تست (فاز پایانی ۵)

اسکریپت: `scripts/agent-test.js` (۱۱ assert، روی 100.75.7.103:3000):

| # | تست | نتیجه |
|---|---|---|
| 1 | فرم لاگین با داده واقعی (hospital3_admin) | 200 |
| 2 | نقش‌ها (/me پس از لاگین) | 200 |
| 3 | فرم عمومی (public/hospitals بدون ورود) | 200 |
| 4 | تاریخ شمسی (tehranTodayStr + toGregorian 1405/7/2→2026/9/24 + toJalali) | درست |
| 5 | دکمه‌ها (سرو buttons-system.css/js + node --check هر ۵ فایل) | 200 + سبز |
| 6 | API احراز (me قبل/بعد logout + Bearer بلاک‌شده «نشست پایان یافته») | 200→401 |
| 7 | امنیت (evil Origin 403، بدون Origin عبور) | درست |
| 8 | چک‌لیست/نمودار/گزارش (DB counts: 104/3435/9/225) | موجود |
| 9 | smoke-test | ۶/۶ |
| 10 | integration + unit | ۵/۵ + ۴/۴ |
| 11 | E2E مرورگری | اجرا نشد (نیاز به کروم دستی) |

نتیجه هر تست ثبت شد. fallback: assistant/assistant-response سبز.
