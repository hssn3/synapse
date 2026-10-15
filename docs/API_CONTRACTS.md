# قراردادهای API — سیناپس

> ⚠️ **استخراج ایستا از فایل‌های مسیر — اجرا/تست نشده؛ ممکن است جزئیات ریز جا افتاده باشد.**
> مبنا: `route-inventory.txt` (استخراج مکانیکی ۶۶۴ خطی مسیرها) + کدهای `middleware/security.js`، `middleware/auth.js`، `app.js` (L680–810 و هندلر خطای پایانی)، `modules/rbac/authorize.middleware.js`، `modules/forms/form.repository.js`. تاریخ استخراج: 2026-10-15.
> بدنهٔ دقیق درخواست/پاسخ همهٔ مسیرها استخراج نشده؛ هرجا مطمئن نیستیم «تأییدنشده» علامت خورده است. مسیرهای سوپرادمین (`/api/super/*`) در این سند فقط به‌صورت فرعی پوشش داده شده‌اند.

## بخش A — قراردادهای عمومی

### احراز هویت (کوکی/JWT — طبق `middleware/auth.js`)
- JWT در کوکی HttpOnly؛ نام‌ها: `sid` (کاربر عادی؛ پیش‌فرض ۸ ساعت)، `ssid` (سوپرادمین)، `pvid` (پیش‌نمایش نقش؛ ۱۵ دقیقه). هدر `Authorization: Bearer <token>` هم پذیرفته می‌شود.
- `authRequired`: نبود توکن → 401 «احراز هویت الزامی است»؛ توکن بلاک‌شده (logout) → 401 «نشست پایان یافته است»؛ منقضی → «نشست منقضی شده»؛ نامعتبر → «توکن نامعتبر». نقش/مجوز/فعال‌بودن در **هر درخواست** از DB تازه خوانده می‌شود (تغییر نقش/غیرفعال‌سازی فوری، بدون انتظار تا انقضای توکن).
- `authOptional` فقط روی `GET /api/auth/session`: برای بوت SPA همیشه 200 (`{authenticated:false}` وقتی نشستی نیست).
- سوپرادمین: claim متمایز `type:'super_admin'` + جدول جدا؛ با `superAdminRequired` محافظت می‌شود (هرگز با نشست کاربر عادی قاطی نمی‌شود).
- پیش‌نمایش نقش (کوکی `pvid`): `POST /api/preview/start/:userId` → کوکی پیش‌نمایش؛ `POST /api/preview/exit`؛ `GET /api/preview/status`. نشست واقعی ادمین (sid) دست‌نخورده می‌ماند؛ بررسی می‌شود که صاحب pvid همان صاحب sid باشد.
- CSRF/Origin: روی `/api/*` برای متدهای غیر GET/HEAD/OPTIONS؛ اگر Origin/Referer بفرستد و host با host فعلی/baseUrl مجاز نخواند → 403 «مبدأ درخواست مجاز نیست». ارسال‌نکردن هر دو هدر ⇒ عبور (سازگار با کلاینت موبایل/curl). مقادیر مجاز اضافه از env `CSRF_TRUSTED_ORIGINS` + `localhost:3000`/`127.0.0.1:3000`.

### فرم خطای استاندارد
- همهٔ خطاها JSON با کلید `error` (پیام فارسی): `{ "error": "…" }`. فیلدهای اضافه در بعضی جاها: `code` (مثلاً `feature_disabled`)، `feature`، `required_permission` (لایهٔ authorize).
- کدهای رایج: 400 (اعتبارسنجی؛ `JSON نامعتبر` برای بدنهٔ خراب؛ `حجم فایل زیاد است` برای سقف آپلود)، 401 (پیام‌های بخش احراز هویت)، 403 («دسترسی ندارید» / «دسترسی غیرمجاز» / «این بخش برای بیمارستان شما فعال نیست»)، 404 («یافت نشد» — هندلر پایانی برای همهٔ مسیرهای ثبت‌نشده)، 500 («خطای داخلی سرور»).
- هندلر خطای پایانی (`app.js`): جزئیات واقعی در جدول `error_log` ذخیره می‌شود؛ کاربر پیام عمومی می‌گیرد. بازخوانی: `GET /api/super/error-log` (سوپرادمین) — تأییدنشده: فهرست کامل خطاهای قابل‌مشاهده.

### صفحه‌بندی
- **صفحه‌بندی سراسری یکنواخت یافت نشد** (جستجو برای OFFSET/LIMIT صفحه‌ای نتیجه نداد). برخی مسیرها `limit` ساده دارند (نمونه: `GET /api/copilot/conversations?limit=20`).
- فیلترهای query رایج: `year` (شمسی)، `status`، `q`، `date`، `ward`. — «غیریکنواخت؛ جزئیات هر مسیر تأییدنشده»

### چندمستأجری (hospital_id / tenant)
- پس از `authRequired`، عملاً همهٔ مسیرهای ماژولی `hospitalScope` دارند: `req.hospitalId = req.user.hospital_id` و همهٔ کوئری‌ها مقید به همان بیمارستان. نبود بیمارستان → 403 «خطا: بیمارستان یافت نشد».
- `requireFeature('key')`: گیت «بخش خریداری‌شده» (جدا از مجوز نقش)؛ در صورت غیرفعال‌بودن بیمارستان×بخش → 403 با `code:'feature_disabled'`؛ نبودِ رکورد ⇒ عبور (امن-به‌سمت-باز). کلیدهای مشاهده‌شده: `measures, documents, checklists, audits, walkarounds, errors, fmea, satisfaction, committees, programs, training, bsc, orgstructure, processes, activities, patient_followup, management`.
- مسیرهای عمومی فقط با `hospital_id` ورودی/پارامتر کار می‌کنند (بدون نشست).

### الگوی مجوز
- `requirePermission(key)` → اگر key در `req.user.permissions` نباشد 403؛ `requireAnyPermission(k1, k2, …)` → داشتن یکی کافی است. پیام 403: «دسترسی ندارید».
- لایهٔ NIST RBAC/ABAC: `authorize(resource, action)` — fail-closed؛ 403 `{error:'دسترسی غیرمجاز', message, required_permission}` + ثبت `DENIED_<ACTION>` در `audit_log`. resource می‌تواند تابع باشد (استخراج از پارامتر مسیر، مثل id/form). نمونه‌ها: `authorize('form_engine:schema','create')`, `authorize('form_engine:permissions','manage')`, `authorize('system:rbac','view')`, `authorize('assistant:audit','view')`, `authorize(req=>req.params.id,'fill')`.
- نمونه کلیدهای مجوز (از inventory): `manage_users`، `manage_roles`، `manage_hospital_settings`، `manage_documents`/`view_documents`، `edit_measure_status`/`approve_measure_status`/`view_accreditation_full_tree`، `submit_checklists`/`manage_checklists`، `manage_fmea`/`submit_fmea`، `assign_tasks`، `manage_committees`/`create_committee_minutes`، `manage_patient_followup`، `manage_directives`، `manage_blood`/`manage_pharmacy`/`manage_lab`، `manage_nursing_hierarchy`، `review_training_needs`/`approve_training`، `manage_org_structure`، `view_audit_log`، `view_all_dashboards`.

### Idempotency فرم (client_token)
- `POST /api/forms/:id/submit` می‌تواند `client_token` بگیرد: ستون `form_submissions.client_token` + ایندکس یکتای جزئی (مهاجرت idempotent در بوت `app.js`). بازخوانی با `findSubmissionByClientToken(hospitalId, formId, clientToken)` انجام می‌شود تا ارسال دوبارهٔ همان توکن، رکورد تکراری نسازد (پاسخ دقیق کنترلر تأییدنشده؛ در repository دیده شد).
- بدون `client_token` رفتار قبلی بدون تغییر است؛ روی DB قدیمیِ بدون ستون، مسیر fallback دارد (بررسی وجود ستون با cache).

### آپلود فایل
- پیش‌فرض سقف: **۵MB** (`MAX_UPLOAD_SIZE_MB`, `config.upload.maxFileSize`)؛ middleware مشترک `modules/core/upload-middleware.js` با `fileFilter` (whitelist مایم‌تیپ — **فهرست دقیق whitelist دیده نشد: تأییدنشده**).
- سقف/فیلترهای اختصاصی: لوگوی بیمارستان (سوپر) 2MB و فقط تصویر؛ امضا و آواتار «فقط تصویر»؛ `POST /api/documents/bulk-extract` حداکثر ۸ فایل؛ restore (سوپر) 500MB؛ dev-upload 12MB.
- خطای سقف: 400 «حجم فایل زیاد است» (`LIMIT_FILE_SIZE`).

### Rate limit (خلاصهٔ اعداد از security.js + config/app.js)
- عمومی `/api/`: پنجرهٔ ۱۵ دقیقه؛ سقف 2000 — برای کاربرِ لاگین‌شده به‌ازای خودِ توکن (نه IP، چون کارکنان پشت NAT مشترک‌اند)، برای مهمان به‌ازای IP. پیام: «درخواست زیاد. صبر کنید».
- ورود رمزدار: `/api/auth/login` و `/api/auth/super-login` → 5 در ۱۵ دقیقه به‌ازای IP، فقط تلاش ناموفق (`skipSuccessfulRequests`). پیام: «تلاش‌های زیاد. ۱۵ دقیقه صبر کنید».
- ورود کاشی: `/api/entry/role-login` و `/api/auth/dev-login` → 60 در ۱۵ دقیقه به‌ازای IP، فقط ناموفق. (قفل حساب پس از ۵ تلاش داخل `entry.js` جداست.)
- فرم‌های عمومی: فقط POST روی `/api/public/*` → 60 در ۱۵ دقیقه؛ GET/HEAD معاف (تا بازکردن فرم، سقف را نسوزاند).

### تاریخ جلالی
- مرجع: `config/jalali` (`tehranNow, tehranTodayStr, todayJalali, JMONTHS, TEHRAN_OFFSET_MS`). «امروز/اکنون» پیش‌فرض = ساعت دیواری تهران (Asia/Tehran)؛ پارامتر سال در گزارش‌ها معمولاً شمسی است (`year`, `endYear`) و با `safeYear` اعتبارسنجی می‌شود.
- `GET /api/server-time` (بدون ورود): `{utc, epoch_ms, tehran_date, tehran_time, jalali:{jy,jm,jd,month_name}}` — فرانت یک‌بار می‌گیرد و اختلاف ساعت خودش را کالیبره می‌کند.

### مسیرهای بدون ورود (فهرست عمومی)
- `GET /healthz` (`{status,uptime_seconds,version,env}`؛ خطای DB → 503)، `GET /api/version`، `GET /api/server-time`، `GET /api/site-contact` (`{email,phone}` — از env).
- `GET /api/public/hospitals`، `GET /api/public/hospital/:id`، `GET /api/public/hospital/:id/logo` + درگاه‌های POST: `/api/public/fmea | complaint | medical-error | satisfaction`.
- کل مسیرهای ورود/کاشی زیر `/api/auth/*` و `/api/entry/*`.
- صفحهٔ عمومی QR (HTML، بدون SPA): `/public/{slug}/:hospitalId` با slugهای `services, fmea, error-report, complaint, satisfaction`.

## بخش B — جدول‌های ماژول

> «ورود» = authRequired؛ «scope» = hospitalScope. ماژول‌های زیر `/api` روت mount شده‌اند (بدون پیشوند اختصاصی) مگر خلافش ذکر شود. مسیرهای «نماینده/مهم» فهرست شده‌اند، نه همهٔ ۶۶۴ خط.

### auth + entry (mount: `/api/auth`، `/api/entry`)
| Method | Path | نگهبان | توضیح |
|---|---|---|---|
| POST | /api/auth/login | عمومی + محدودکننده | ورود با username/password → ست کوکی sid |
| POST | /api/auth/logout | کوکی | خروج؛ توکن بلاک می‌شود |
| GET | /api/auth/me | ورود | هویت کاربر جاری |
| GET | /api/auth/session | اختیاری | بوت SPA؛ همیشه 200 |
| POST | /api/auth/change-password | ورود | رمز جدید ≥ ۸ کاراکتر |
| POST | /api/auth/super-login · /super-logout · GET /super-me | عمومی/سوپرادمین | چرخهٔ نشست سوپرادمین (ssid) |
| POST | /api/auth/dev-login · GET /dev-users | فقط dev | در production → 404 |
| GET | /api/entry/require-password | عمومی | آیا ورود کاشی‌ای رمز می‌خواهد |
| GET | /api/entry/theme-policy | عمومی | وضعیت تم روشن |
| GET | /api/entry/hospital/:id/roles | عمومی | کاشی‌های نقش بیمارستان فعال |
| POST | /api/entry/role-login | عمومی + محدودکننده | ورود بدون رمز با user_id (قفل حساب اگر require_password) |

### users (mount: `/api` — /users، /profile، /org-structure، /hospital، /management، /preview)
| GET·POST | /api/users | مجوز: manage_users | فهرست/ساخت کاربر |
| PUT | /api/users/:id | مجوز: manage_users | ویرایش کاربر |
| GET·PUT | /api/users/settings | مجوز: manage_hospital_settings | تنظیمات بیمارستان (نام/لوگو/سربرگ/امضا) |
| GET | /api/hospital/profile · /api/hospital/features | ورود | مشخصات و فیچرهای بیمارستان |
| PUT | /api/profile/me | ورود | ویرایش پروفایل خودم |
| POST | /api/profile/avatar | ورود | آپلود آواتار (فقط تصویر) |
| GET | /api/users/roles/list | ورود + scope | نقش‌های بیمارستان |
| GET | /api/users/audit-log | مجوز: view_audit_log | لاگ حسابرسی |
| GET | /api/org-structure(+/:kind) · POST·PUT·DELETE /api/org-structure/:kind/:id | ورود / مجوز: manage_org_structure | ساختار سازمانی |
| GET·PUT | /api/org-divisions(/…/:code) | ورود | بخش‌های سازمانی |
| POST·POST·GET | /api/preview/start/:userId · /exit · /status | مجوز: manage_org_divisions (استارت) | پیش‌نمایش نقش |
| GET·PUT | /api/users/complaints/list · /:id | مجوز: manage_patient_complaints | شکایات بیماران |
| GET·PUT | /api/users/suggestions/list · /:id | مجوز: review_staff_suggestions | پیشنهادهای کارکنان |

### rbac (mount: `/api/rbac`)
| GET | /api/rbac/my-permissions | ورود | مجموعهٔ مجوزهای من |
| GET | /api/rbac/matrix | authorize: system:rbac:view | ماتریس نقش×مجوز |
| POST | /api/rbac/grant · /api/rbac/revoke | authorize: system:rbac:manage | اعطا/سلب مجوز نقش |

### forms (mount: `/api/forms`)
| GET | /api/forms | ورود | فهرست فرم‌های بیمارستان |
| POST | /api/forms | authorize: form_engine:schema:create | ساخت فرم |
| GET | /api/forms/:idOrSlug | authorize: view | اسکیمای فرم (رندر پویا) |
| POST | /api/forms/:id/versions | authorize: edit | نسخهٔ جدید اسکیما |
| GET·PUT | /api/forms/:id/permissions | authorize: permissions:manage | ماتریس دسترسی فرم |
| POST | /api/forms/:id/submit | authorize: fill | ثبت داده فرم؛ `client_token` اختیاری |
| GET | /api/forms/:id/submissions | authorize: view | سوابق ارسال |
| POST | /api/forms/:id/submissions/:subId/review | authorize: approve | تأیید/رد در گردش‌کار |

### collaboration (mount: `/api` — /committees، /activities، /inbox، /messages، /tasks، /followup، /calendar، /reminders)
| GET·POST | /api/committees · GET /api/committees/dashboard-stats | ورود / مجوز: manage_committees (ساخت) | کمیته‌ها و آمار |
| GET·POST | /api/committees/:id/meetings · DELETE /api/committees/meetings/:eventId | مجوز: create_committee_minutes | جلسات کمیته |
| GET·POST·PUT·DELETE | /api/committees/:id/minutes · POST /:mid/sign | ورود / مجوز: create_committee_minutes | صورت‌جلسه و امضا |
| GET·POST | /api/activities/types | مجوز: manage_activity_types (ساخت) | انواع فعالیت |
| GET·POST | /api/activities/records(+/:id) | مجوز: submit_activity_record (ثبت) | ثبت/فهرست فعالیت |
| GET·POST | /api/calendar/events | مجوز: manage_calendar_events (ساخت) | تقویم |
| GET·POST·PUT | /api/tasks · /:id/status | مجوز: assign_tasks (ساخت) | وظایف |
| GET·POST·PUT | /api/followup(+/:id) · POST /:id/contacts | مجوز: manage_patient_followup | پیگیری بیماران |
| GET·POST·PUT·DELETE | /api/messages(+/:id) · GET /unread-count | ورود | پیام внутренی (inbox/sent/drafts) |
| GET | /api/inbox · /api/nav-badges | ورود | کارتابل و شمارنده‌ها |
| GET·POST·DELETE | /api/users/delegates(+/:id) | ورود | جانشین‌ها |
| GET·POST·DELETE | /api/shortcuts(+/:id) | ورود | میانبرهای کاربر |
| POST | /api/reminders/done · /snooze | ورود | یادآورها |
| GET·POST·PUT·DELETE | /api/reminders/rules(+/:id) | مجوز: manage_hospital_settings | قواعد یادآور |

### quality (mount: `/api` — /audits، /bsc، /certifications، /checklists، /fmea، /indicators، /indicator-slides، /programs، /walkarounds، /users/medical-errors)
| GET·POST·PUT·DELETE | /api/audits(+/:id) · POST /:id/submission | مجوزهای view/manage_audits | حسابرسی داخلی |
| GET·PUT | /api/bsc · /values · /indicators/:id · GET /export.csv | مجوزهای view/manage_bsc | کارت امتیاز متوازن |
| GET·POST·PUT·DELETE | /api/certifications(+/:id) · POST·GET /:id/file | مجوزهای certifications | گواهینامه‌ها + فایل |
| GET·POST·PUT·DELETE | /api/checklists(+/:id) | submit/manage_checklists | چک‌لیست‌ها |
| GET·POST·GET·DELETE | /api/checklists/:id/submissions · /submissions/:sid | submit/manage_checklists | اجرای چک‌لیست |
| POST | /api/checklists/submissions/:sid/corrective-action | مجوز: assign_tasks / manage_checklists | اقدام اصلاحی |
| GET·POST·PUT·DELETE | /api/fmea(+/:id) | مجوزهای manage/submit_fmea | FMEA |
| GET·POST·PUT | /api/users/medical-errors(+/list) · /:id | مجوزهای medical_error_reports | خطاهای پزشکی |
| GET | /api/indicators(+/:id, /dashboard, /compare, /export.csv) | مجوزهای indicators/bsc | شاخص‌ها |
| POST·PUT·DELETE | /api/indicators(/…) · /:id/values · /:id/values/approve · /:id/collectors | مجوز: manage_indicators | مدیریت شاخص/مقادیر |
| GET·PUT | /api/indicator-slides(+/:slideNumber/values) · GET /export/excel | مجوزهای indicator_slides | اسلایدهای شاخص |
| GET·POST·PUT·DELETE | /api/programs(+/:id) · PUT /:id/approve|reject|progress | مجوز: approve_programs | برنامه‌های بهبود |
| GET·POST·PUT·DELETE | /api/walkarounds(+/:id) · /summary · PUT /resolutions/:rid | مجوزهای walkarounds | بازدید مدیریتی |

### accreditation (mount: `/api` — /accreditation، /gap-analysis، /policy، /corrective-actions، /users/:userId/measure-overrides)
| GET | /api/accreditation/tree | هر یک از: view_accreditation_full_tree / edit_measure_status / view_measure_status_readonly | درخت سنجه‌ها |
| GET | /api/accreditation/status | ورود + scope | وضعیت سنجه‌ها (سال) |
| PUT | /api/accreditation/status/:measureId | مجوز: edit_measure_status | ثبت وضعیت (شامل «غیرقابل ارزیابی») |
| PUT | /api/accreditation/review/:kind/:measureId | مجوز: approve_measure_status | تأیید/رد بازبینی |
| GET | /api/accreditation/review-gaps | view tree / approve | شکاف‌های بازبینی |
| GET | /api/accreditation/measures/:code/artifacts · /measures-full | ورود + scope | شواهد سنجه |
| GET·POST·PUT | /api/accreditation/measures/:measureId/corrective-actions · /api/corrective-actions/:id(/transition, /history) | مجوزهای edit/approve/view | اقدام اصلاحی + گردش‌کار |
| GET | /api/gap-analysis · /report · /trends | view tree / readonly | تحلیل شکاف |
| POST | /api/gap-analysis/save | مجوز: edit_measure_status | ذخیره تحلیل |
| GET·PUT | /api/policy/period | ورود (PUT: مدیر بهبود کیفیت/سامانه) | دورهٔ اعتباربخشی |
| GET | /api/guide-timeline | ورود | تایم‌لاین راهنما |
| GET·POST·DELETE | /api/users/:userId/measure-overrides(+/:id) | مجوز: manage_users | استثناهای دسترسی سنجه |
| GET | /api/accreditation/dashboard · /scoring | ورود | داشبورد/وزن‌ها |

### clinical (mount: `/api/clinical` + بخشی زیر `/api`)
| GET·POST | /api/clinical/morse · /api/clinical/braden | مجوزهای view/add_clinical_assessments | ارزیابی سقوط/زخم فشاری |
| GET·POST·PUT | /api/clinical/critical-values(+/:id/acknowledge) | view/add/edit_critical_values | مقادیر بحرانی |
| GET·POST·PUT | /api/clinical/adr(+/:id/review) | view/add/review_adr_reports | گزارش ADR |
| GET·POST | /api/clinical/hsi · GET /api/clinical/dashboard | view/add_hsi_inspections | بهداشت دست + داشبورد |
| GET | /api/nursing/hierarchy · /api/nursing/roster | ورود (nrsCanView) | سلسله‌مراتب پرستاری |
| POST·PUT·DELETE | /api/nursing/supervisors(+/:id) · /api/nursing/wards(+/:id) | مجوز: manage_nursing_hierarchy | سرپرست‌ها/بخش‌ها |
| GET·PUT | /api/nursing/head/presence · /attendance | ورود (head-nurse) | حضور/تردد بخش |
| GET·PUT | /api/nursing/head/roster · /shift-tasks · /my-wards | ورود | روستر/وظایف شیفت |
| POST·GET·PUT | /api/nursing/leave-requests · /mine · /head/leave-requests(+/:id) | ورود | مرخصی پرستاری |
| GET·PUT | /api/shift/schedule(+/cell, /note, /custom-rows) | ورود (shiftAccessUnit) | برنامهٔ شیفت |
| GET·PUT | /api/shift/settings · /print-config · POST /register-form | مجوز: manage_hospital_settings (eligibility) | تنظیمات/فرم ثبت شیفت |
| GET·POST·PUT·DELETE | /api/shift/staff(+/:id) · /api/shift/units(+/:id) | ورود | پرسنل و واحدهای شیفت |
| GET·PUT | /api/shift/attendance(+/live) · /api/shift/report(s)(+/:id/review) | ورود (نقش‌محور) | حضور و گزارش شیفت |
| GET·POST·PUT·DELETE | /api/training-needs(+/:id) · /:id/superior-review · /:id/final-decision | review_training_needs / approve_training | نیازهای آموزشی |
| GET | /api/safety-dashboard | مجوزهای safe_surgery | داشبورد ایمنی |

### operations (mount: `/api`)
| GET·POST | /api/blood-temp/:unitId · GET /api/blood-dashboard | مجوزهای view/manage_blood | دمای بانک خون |
| GET·POST | /api/pharmacy-temp/:fridgeId · GET /api/pharmacy-dashboard | مجوزهای view/manage_pharmacy | یخچال دارو |
| GET·POST | /api/crm-dashboard · /api/crm/send-sms | مجوز: manage_crm | CRM و پیامک |
| GET·POST·PUT·DELETE | /api/assets(+/:id, /:id/plans, /:id/logs, /assets-due, /assets/plans/:planId, /assets/logs/:logId) | مجوزهای facility_assets | تجهیزات و PM |
| GET | /api/{disaster,education,finance,hrdev,imaging,infection,lab,nsupervision,occhealth,patientfocus,vendors}-dashboard | مجوزهای view_*/manage_* متناظر | داشبورد ماژول‌های عملیاتی |
| GET | /api/hrdev/surveys-compliance | مجوزهای hrdev | انطباق نظرسنجی‌ها |

### documents (mount: `/api` — /documents، /library، /processes، /evidence، /signatures، /tenures)
| GET·POST·PUT·DELETE | /api/documents(+/:id) | مجوزهای view/manage_documents | اسناد کنترل‌شده |
| POST·POST | /api/documents/:id/signoffs · /api/documents/signoffs/:signoffId/sign | مجوزهای manage/view | امضاهای سند |
| GET | /api/documents/:id/versions/:versionId · /api/documents/:id/attachment | مجوزهای view/manage | نسخه و پیوست |
| GET·GET·PUT | /api/doc-codes · /:id/next · /:id | مجوز: manage_documents | کدگذاری اسناد |
| GET·GET·POST·DELETE | /api/document-editors(+/:id) | مجوز: manage_documents | ویراستاران سند |
| GET·POST·PUT·DELETE | /api/library(+/:id, /:id/file) | مجوزهای view/manage_library | کتابخانهٔ دیجیتال |
| GET·POST·PUT·DELETE | /api/processes(+/:id) · /:id/approval · /:id/notify-users · /:id/file | مجوز: manage_processes | فرآیندها |
| POST | /api/processes/extract-flowchart | مجوز: manage_processes | استخراج فلوچارت (آپلود) |
| GET·POST·GET·DELETE | /api/evidence/:entityType/:entityId · /file/:id/download · /file/:id | ورود + scope | شواهد موجودیت‌ها |
| GET·POST·POST·DELETE | /api/signatures(+/:id, /:id/active, /image/:filename) | مجوز: manage_hospital_settings | امضاهای الکترونیک |
| GET | /api/tenures · /api/tenures/at · GET /api/hospital/logo | ورود | تصدی‌ها و لوگو |

### core + public (mount: `/api` + `/api/public`)
| GET | /api/server-time · /api/version · /api/site-contact · /healthz | عمومی | متادیتا/سلامت (پیش از میدل‌ور احراز هویت) |
| GET·POST | /api/public/hospitals · /hospital/:id(/logo) · POST /fmea|complaint|medical-error|satisfaction | عمومی (POST محدودکننده) | درگاه‌های عمومی |
| GET | /api/dashboard | ورود + scope | داشبورد اصلی |
| GET | /api/kpis(+/dashboard, /rankings) | ورود (scope) | KPIهای بیمارستان |
| GET·POST | /api/activities/mapping | ورود / مجوز: manage_activity_measure_mapping | نقشه فعالیت↔سنجه |
| POST | /api/ocr/extract | ورود | OCR تک‌فایل |
| POST | /api/documents/bulk-extract | مجوز: manage_documents | OCR گروهی (≤۸ فایل) |
| POST | /api/activities/records/:id/evidence | ورود | شاهد فعالیت (آپلود) |
| GET | /api/satisfaction/results | مجوز: view_all_dashboards | نتایج رضایت |
| GET | /api/export/measures.xlsx · /indicators.xlsx · /users.xlsx · /bsc.xlsx · /checklists/:id.xlsx | مجوزهای متناظر | خروجی‌های اکسل |
| GET | /api/measures/:id/history · /trend | ورود | تاریخچه/روند سنجه |
| GET·POST·PATCH | /api/notifications · /:id/read | ورود (POST: manage_users) | اعلان داخل اپ |

### assistant (mount: `/api/assistant-enterprise` + زیر `/api`)
| POST | /api/assistant-enterprise/chat | ورود | چت دستیار سازمانی |
| GET | /api/assistant-enterprise/persona · /audit | ورود / authorize: assistant:audit:view | پرسونا و لاگ |
| POST·GET | /api/assistant/chat · /status · /conversations(+/:id/messages) · /usage | ورود | چت دستیار (legacy) |
| GET·POST·DELETE | /api/assistant/knowledge(+/:id/approve, /:id/reject, /:id) | مجوز: manage_documents | دانش دستیار |
| GET | /api/assistant/next · /review · /api/my-work · /api/duties/progress|smart-decisions · /api/legal-duties | ورود | پیشنهاد کار و وظایف |
| POST·GET·GET·DELETE | /api/copilot/conversations/start · /:id/message · /conversations(+/:id) · /stats · /personas | ورود | کاپایلوت مکالمه |
| POST | /api/guide-timeline/dismiss · /snooze | ورود | تایم‌لاین راهنما |

---

### نکات پایانی
- مسیرهایی که در بخش B با `·` ادغام شده‌اند همگی از یک خانوادهٔ روت‌اند؛ برای لیست کامل، `route-inventory.txt` مرجع است.
- پیشوندها: `app.js` → `/api/auth`, `/api/super`, `/api/entry`, `/api/copilot`, `/api/clinical`, و `/api` برای modules/directives/export/notifications؛ `modules/index.js` → `/rbac`, `/forms`, `/assistant-enterprise` (بقیهٔ ماژول‌ها روی روت `/api`).
- هر جای این سند که با «تأییدنشده» علامت خورده، قبل از اتکا باید از سورس همان فایل دوباره راستی‌آزمایی شود.
