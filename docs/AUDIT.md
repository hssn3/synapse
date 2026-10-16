# AUDIT — حسابرسی جامع (۱۴۰۵/۰۷/۲۰)

> روش: بازرسی مستقیم فایل‌ها + اجرای واقعی تست‌ها در محیط MODE A (ترمینال + گیت).
> هیچ ادعایی بدون شاهد اجرا در این سند نیست. موارد تأییدنشده صریحاً «unverified» علامت دارند.

## ۱) پشته و مقیاس (تأییدشده)

| متریک | مقدار | منبع |
|---|---|---|
| Node | v22.23.1 | `node -v` |
| endpointها | ~۴۶۵ | شمارش `router.*`/`app.*` در `src/` |
| ماژول‌های دامنه | ۱۱ | `src/modules/*/` |
| جدول‌های DB | ۲۲۱ | کوئری `sqlite_master` روی دیتابیس دمو |
| ایندکس‌ها | ۴۷۳ | همان |
| فایل‌های JS فرانت | ۸۹ | `find public/js` |
| فایل‌های CSS | ۲۲ | `find public/css` |
| مایگریشن | ۱۳ | `database/migrate*.js` |
| seed | ۱۳۵ | `database/seed*.js` |
| مجوزها/نقش‌ها | ۲۸ نقش / ۴۷ کاربر فعال (دمو) | کوئری DB |
| CI | **ندارد** (`.github` نیست) | `ls .github` → ENOENT |

## ۲) Baseline تست‌ها (اجراشده — همه سبز)

```
node --test tests/unit.test.js tests/integration.test.js tests/rbac-matrix.test.js \
          tests/form-engine.test.js tests/assistant-guardrails.test.js
→ tests 35 | pass 35 | fail 0

SMOKE_BASE_URL=http://127.0.0.1:3311 node scripts/smoke-test.js   → ۶/۶ سبز
node tests/assistant-retrieval-eval.js                            → همه‌ی ادعاها سبز
node tests/assistant-response-eval.js                             → همه‌ی پاسخ‌ها سبز
```

## ۳) طبقه‌بندی یافته‌ها (این ممیزی + نشست‌های مرتبط)

### ✅ رفع‌شده در این ممیزی (کامیت `d07d5b0`)
| یافته | شدت | شاهد قبل | اقدام |
|---|---|---|---|
| کلید API در اسنپ‌شات دموی مخزن عمومی | 🔴 بالا | بازرسی بایتی gz: ۱ یافته `AIza…` | ستون NULL شد؛ اسنپ‌شات بازسازی؛ ریشه در `demo-snapshot.js` بسته شد |
| `npm run assistant:key` شکسته (MODULE_NOT_FOUND) | 🟠 متوسط | اجرای واقعی اسکریپت | `maskKey` inline؛ اجرای دوباره clean |
| پلیس‌هولدر JWT docker-compose از چک رد می‌شد | 🟠 متوسط | اجرای `config/app.js` با آن مقدار | افزودن به `WEAK_JWT_SECRETS`؛ تست رد/قبول |
| `docs/nginx.conf` گمشده → سرویس nginx کامپوز بالا نمی‌آمد | 🟠 متوسط | `docker-compose.yml:53` + `ls` منفی | فایل ساخته شد (HTTP فعال، ۴۴۳ آماده) |
| کش SW پس از logout پاک نمی‌شد | 🟡 کم | بازرسی `logout()` | پیام `CLEAR_SHELL` + bump v13 |

### 🔴 باز (نیازمند اقدام مالک یا تصمیم)
| یافته | توضیح |
|---|---|
| Revoke کلید Gemini قدیمی | از توان این محیط خارج است؛ مالک باید در کنسول Google باطلش کند |
| دیپلوی production | هیچ provider در دسترس نیست؛ سرویس قبلی Railway مرده |
| LICENSE | انتخاب مجوز = تصمیم مالک |
| سندباکس گواهی SSL واقعی | بدون گواهی، `upgrade-insecure-requests` خاموش می‌ماند (رفتار درست فعلی) |

### 🟡 جزئی (بعداً / کم‌ریسک)
| یافته | توضیح |
|---|---|
| `scripts/split_backend_monolith.js` | ابزار یک‌بارمصرف تاریخی؛ requireهای شکسته؛ از اجرا خارج است. پیشنهاد: آرشیو |
| `.freebuff/project-id` | شناسه پلتفرم بی‌مصرف در مخزن |
| README آمار قدیمی | «۳,۴۳۳ سند / ۱,۹۷۳ شکایت…» مربوط به آرشیو کامل md است که در این مخزن نیست؛ اعداد دموی واقعی: 306 سند / 669 شکایت / 103 KPI / 69 کاربر |
| داک شناور قبلی روی محتوا در موبایل | با ری‌دیزاین ۱۴۰۵/۰۷/۲۰ حل شد (دانا در تب‌بار، داک مخفی در موبایل) |

## ۴) امنیت — کنترل‌های تأییدشده با اجرا

- **Fail-closed auth:** `GET /api/dashboard` بدون کوکی → `401` ✅ (smoke)
- **RBAC نقش‌ها:** پرستار روی `DELETE /api/users/:id` → دسترسی رد؛ خواندن لیست کاربران → 403 ✅ (تست دستی + rbac-matrix)
- **کوکی‌ها:** httpOnly؛ Secure فقط پشت HTTPS واقعی (تست‌شده در `auth.js`/`entry.js`)
- **Rate limit:** ورود روی IP با `skipSuccessfulRequests`؛ سطلِ کاربر-محور برای API ✅ (بازرسی `security.js` + تست دستی قبلی)
- **CSRF ملایم:** چک Origin/Referer روی متدهای تغییردهنده ✅ (بازرسی + تست evil-origin در CHANGELOG باگ‌ها)
- **آپلود:** whitelist نوع (jpg/png/webp/pdf) + سقف حجم + ذخیره‌سازی خارج web-root ✅
- **IDOR:** نمونه‌گیری از مسیرهای `:id` با hospitalScope تست شد (پرستار → 403/404) ✅؛
  ماتریس کامل per-endpoint **unverified** (تست خودکار صریح ندارد — کار باقی‌مانده)
- **هدرهای امنیتی:** helmet + CSP (با unsafe-inline به‌خاطر onclick های موجود — بدهی فنی شناخته‌شده)

## ۵) RTL / PWA / موبایل (اجرای واقعی در این نشست و نشست قبل)

- نوار تب پایین موبایل (۵ دکمه، دانا وسط): تست 390px — دانا center diff = 0px ✅
- شیت منو: ۱۶ آیتم + کارت کاربر؛ بدون بریدگی ✅
- دسکتاپ 1440px: سایدبار راست تمام‌قد؛ داک پایین-راست؛ هدر/فوتر حذف ✅
- تبلت 820px: تب‌بار فعال، هیچ سرریز ✅
- اسکرول ته ۹ صفحه کلیدی: هیچ محتوایی زیر تب‌بار پنهان نمی‌ماند ✅
- QA ۲۴/۲۴ نقش (ورود واقعی + ۶ صفحه/نقش): صفر خطای JS ✅
- PWA: manifest + آیکون‌ها (شامل maskable) + SW پوسته‌محور؛ API هرگز کش نمی‌شود ✅
- **Lighthouse/a11y عددی: اندازه‌گیری نشده** (ابزار در این محیط نبود)

## ۶) داده و پرایوسی

- اسنپ‌شات دمو: همه‌ی داده‌ها **ساختگی** (نام‌های «بیمارستان نمونه شماره یک»، شماره‌های 0912-0000000+، یوزرهای h3.*) ✅
- اسکن بایتی اسنپ‌شات جدید: صفر راز (AIza/ghp/sk-/pat) ✅
- گفت‌وگوهای دانا/لاگ‌های ممیزیِ اسنپ‌شات قبلاً پاک‌سازی می‌شوند (PURGE_TABLES) ✅
- گزارش‌دهنده‌ی ناشناس: کاربر بدون ذخیره‌ی user id روی گزارش (بازرسی روت‌های public) — تست صریح خودکار **unverified**

## ۷) توصیه‌های بعدی (اولویت‌دار)

1. تست خودکار ماتریس per-endpoint مجاز/ممنوع (بدون UI، مستقیم HTTP) برای همه نقش‌ها.
2. چرخهٔ `require_password` روی production + چک‌لیست سخت‌سازی استقرار.
3. بازبینی CSP و حذف تدریجی `unsafe-inline` (onclick → addEventListener) — بدهی بزرگ ولی ارزشمند.
4. اندازه‌گیری Lighthouse در محیط دارای Chromium کامل (اینجا ممکن نبود).
5. آرشیو ابزارهای تاریخی و تمیزکاری ریشه‌ی مخزن (LICENSE، .freebuff).

---

## ۸) حسابرسی موازی (۱۴۰۵/۰۷/۲۵) — موج ۵ زیرعامل

> ستون «تأیید»: ✅ = خودم در کد یا اجرا دیدم · 🟡 = گزارش زیرعامل، من بازبینی خط‌به‌خط نکرده‌ام.
> گزارش‌های خام روی دیسک: `audit/02-db.md`، `audit/03-frontend.md`، `audit/04-tests-devops.md` (دو گزارش دیگر به‌دلیل تمام‌شدن بودجه‌ی ابزار زیرعامل نوشته نشد؛ یافته‌هایشان در همین سند ثبت است).

### ۸.۱ API و RBAC (زیرعامل ۱)
| یافته | عدد | شاهد | تأیید |
|---|---|---|---|
| مسیرها (استاتیک + تولیدی mountCrud) | ~۸۴۲ (۴۷۰ + ۳۷۲) | شمارش `router.*` | 🟡 |
| مسیر بی‌احراز | ۶۸ (شامل عمومی‌های عمدی) | فهرست زیرعامل | 🟡 |
| `authRequired` بدون `requirePermission` | ۱۶۶ | sweep | 🟡 |
| بدون `hospitalScope` | ۳۴ | sweep | 🟡 |
| `UPDATE`/`DELETE` بدون `hospital_id` | ۷۴ | sweep | 🟡 |
| افشای فهرست کاربران فعال + `username` بدون احراز در `GET /api/entry/hospital/:id/roles` | — | `src/routes/entry.js:40` | ✅ |
| `dev-users`/`dev-login` بدون احراز (فقط غیر-production) | — | `src/routes/auth.js:167,182` گیتِ `config.isProduction \|\| DISABLE_DEV_LOGIN` | ✅ |

### ۸.۲ داده و schema (زیرعامل ۲ — `audit/02-db.md`)
| یافته | شاهد | تأیید |
|---|---|---|
| ۲۲۰ جدول در دیتابیس دمو (AGENTS.md: ۲۲۱) | کوئری `sqlite_master` | 🟡 |
| `quick_check=ok`، صفر نقض FK؛ ۴۷ جدول بدون FK؛ ۳۴ جدول با `hospital_id` بدون ایندکس | کوئری | 🟡 |
| ارجاع یتیم: `reminder_rules`(۱) + `example_seed_log`(۶) → بیمارستان حذف‌شده | ریشه: `seed-hospital-three-scenario.js:504` | 🟡 (در W3 بررسی می‌شود) |
| `document_signoffs`: ۶۰۲/۶۰۲ ردیف با `user_id=NULL` | کوئری | 🟡 |
| `accreditation_sections`: ۵۲۰ سنجه با `title=NULL` (متن در `statement`) | کوئری | 🟡 |
| `seed-measure-status-year.js:65` → `DROP TABLE measure_status` و کپی فقط ۱۰ ستون (خطر ازدست‌رفتن ستون) | بازرسی کد | 🟡 (در W3 اصلاح) |
| خطای seed در بوت فقط لاگ می‌شود | `src/app.js` ~۱۱۰-۱۱۱ | 🟡 (در W3 نمایان می‌شود) |
| بکاپ/restore بدون راست‌آزمایی پس از بازگردانی (فقط `demo-restore` راست‌آزمایی می‌کند) | بازرسی اسکریپت‌ها | 🟡 |

### ۸.۳ فرانت‌اند (زیرعامل ۳ — `audit/03-frontend.md`)
| یافته | عدد/شاهد | تأیید |
|---|---|---|
| فایل‌های `public` | ۱۳۷ فایل · JS ۹۲ فایل/۴۵٬۱۱۴ خط · CSS ۲۴ فایل/۱۴٬۴۴۱ خط | 🟡 |
| `index.html`: اسکریپت‌ها | ۸۹ اسکریپت، صفر `defer`، صفر `module` | 🟡 |
| `innerHTML` / `esc()` | ۵۵۱ مورد در ۷۲ فایل / ۱٬۳۹۲ فراخوان | 🟡 |
| برچسب فرم | ۶۱۸ `label` با فقط ۲۱ `for` | 🟡 |
| 🔴 XSS ذخیره‌شده: درج خام `title` اسلاید (نویسنده: `indicator-slides.routes.js:134`) | `public/js/views/quality/indicator-slides-view.js:1079` — تنها جای فایل که `esc()` ندارد | ✅ (خودم خواندم) |
| 🔴 اسکیپر ناقص: `'` اسکیپ نمی‌شود ولی داخل `onclick='…'` تزریق می‌شود | `public/js/shift-schedule.js:22` + مصرف در `:131` | ✅ (خودم خواندم) |
| CSP با `unsafe-inline` در `script-src` و `script-src-attr` | `src/middleware/security.js:25-26` | 🟡 |
| `aria-current` در ناوبری | صفر مورد | 🟡 |
| `alt` گمشده | `reports-kartabl.js:270` | 🟡 |
| `activeCardId` (Card Docking پرامت فاز ۴) | صفر نتیجه در کد | 🟡 |
| SW: کش نکردن `/api` + پاک‌سازی در logout | `public/sw.js:24-37` | 🟡 |

### ۸.۴ تست، CI و استقرار (زیرعامل ۴ — `audit/04-tests-devops.md`)
| یافته | شاهد | تأیید |
|---|---|---|
| بیس‌لاین همین نشست | `test:all` ۳۵/۳۵ · smoke ۶/۶ · endpoint-matrix ۱۵/۱۵ · دانا ۲۱+۱۰ · `npm audit` ۰ | ✅ (اجرای من) |
| lint | ۳۲۷ فایل، ۰ error / ۱۳٬۴۹۸ warning (quotes + no-unused-vars) | 🟡 |
| CI | ۵ ران؛ ران اول مردود، آخرین سبز روی `2b9c489`؛ سه کامیت آخر بدون ران CI | 🟡 |
| مسیر compose در production بالا نمی‌آید (پلیس‌هولدر JWT در لیست ضعیف‌ها) | بررسی ترکیب env + محافظ | 🟡 (W4) |
| ارسال تکراری و ویرایش همزمان: نه گارد، نه تست | بازرسی مسیرها/تست‌ها | 🟡 (W5) |
| انقضای نشست و مایگریشن down: بدون پوشش تست | بازرسی | 🟡 (W5) |

### ۸.۵ دستیار (M7) و جست‌وجو (زیرعامل ۵)
| یافته | شاهد | تأیید |
|---|---|---|
| مسیر چت قدیمی فقط `authRequired`+`hospitalScope` بدون مجوز | `src/modules/assistant/assistant-legacy.routes.js:218` | 🟡 (W2) |
| مسیر چت سازمانی بدون سقف طول ورودی | `src/modules/assistant/assistant.routes.js:12` | 🟡 (W2) |
| نبود تایم‌اوت برای provider | مسیر فراخوانی | 🟡 (W2) |
| شرح گزارش‌های `is_confidential=1` بدون فیلتر به provider بیرونی | `src/services/assistant-context.js:484` → `:573` | 🟡 (W7) |
| باگ تودرتویی «کارهای باز من» و اعمال‌نشدن override سطح کاربر | `assistant-context.js:628-631` | 🟡 (Backlog) |
| evalهای دانا | retrieval ۲۱/۲۱ · response ۱۰/۱۰ (بدون کلید provider) | ✅ (اجرای من) |

### ۸.۶ نتیجه‌ی فاز ۱
- از میان یافته‌ها، **شش مورد بحرانی/بالا** انتخاب و به واحدهای اجرایی W1–W3 سپرده شد؛ بقیه در `docs/IMPLEMENTATION_PLAN.md` با شرط ورود/خروج ثبت‌اند.
- مواردی که با شاهد کافی به «کم‌ریسک/خارج از دامنه» طبقه‌بندی شدند: دسترسی عمومی‌های عمدی (فرم‌های بی‌ورود، پالیسی تم)، `dev-*` (production-gated) و موارد Backlog.


## ۹) به‌روزرسانی ۱۴۰۵/۰۷/۲۳b — بیس‌لاین کلون ویندوزی + بازرسی مجوزدهی (۴۷۳ مسیر)

- **بیس‌لاین کامل روی کلون تازه (Windows، Node v22.22.0):** smoke ۶/۶ · سوئیت‌ها ۳۵/۳۵ · ماتریس per-endpoint ۱۵/۱۵ · دانا ۲۱+۱۰ ادعا · privacy ۴/۴ · w5 ۴/۴ · `npm audit --omit=dev`=۰ · lint ۰ خطا · E2E واقعی (ورود/رندر/موبایل ۳۹۰) بدون خطا. جزئیات خام: پوشهٔ کار نشست (`.cluster/new313-master-prompt/` — خارج از مخزن، مطابق رویهٔ DECISIONS بند ۸).
- **بازرسی مجوزدهی (استخراج مکانیکی ۴۷۳ مسیر از ۱۳۰ فایل):**
  - فهرست A — «`authRequired` بدون نگهبان استاندارد در context اسکن»: **۱۶۶ مسیر** (هم‌خوان با رقم گزارش‌شدهٔ نشست ۱۴۰۵/۰۷/۲۵).
  - فهرست B — «بدون `authRequired`»: **۵۳** = ۴۶ مسیر `/api/super/*` (کل روتر پشت `superAdminRequired` — تأیید سورس `super.js:39`) + ۷ مسیر auth عمدی (login/logout/dev با گارد محیطی).
  - **۲۲ نمونهٔ دستی در سورس:** سوگیری منفی اسکن اثبات شد — اکثریت قاطع نمونه‌ها دارای نگهبان درون‌تابعی (`nrsCanManage`، `shiftAccessUnit`، `hnAccessWard`، `hasPerm`، `canApprovePrograms`، `canEditPeriod`، `mgmtCanManage`) یا میان‌افزار نام‌دار (`authorize()`، `superAdminRequired`، `canEditDocuments`، `requireFeature`) بودند.
  - **کاندیدهای بازبینی دقیق‌تر (تأییدنشده، برای پاس بعد):** `assistant-enterprise/chat` (بدهی مستند دو-منبع مجوز)، خانوادهٔ `/api/kpis*`، `/api/export/*.xlsx`، چند read اکریدیشن (`scoring/dashboard/status`) و داشبوردها — فعلاً فقط `authRequired + hospitalScope`.
- این دور هیچ تغییر کدی در سیستم مجوز ایجاد نکرد؛ خروجی = دادهٔ طبقه‌بندی‌شده + فهرست اولویت‌دار برای پاس بعدی.

