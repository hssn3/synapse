# استقرار سیناپس روی اروان‌کلاد (Cloud Container / PaaS)

> این سند فقط چیزهایی است که با آزمایش واقعی روی همین حساب کشف شد — نه آنچه در مستندات اروان نوشته شده.
> تاریخ: ۱۴۰۵/۰۸/۱۶ (۲۰۲۶-۱۱-۰۷) · منطقه: `ir-central1` (تهران) · پروژه: `synapse` · اپ: `synapse-app`

## ۱) وضعیت فعلی (چه چیزی بالا است)

| مورد | مقدار |
|---|---|
| آدرس | `https://synaaps.my.id` |
| اپ / namespace | `synapse-app` در namespace `synapse` |
| ایمیج | `ghcr.io/hssn3/synapse:sha-<کامیت>` (پکیج عمومی GHCR) |
| منابع | ۰٫۵ هسته · ۱ گیگ رم · ۱ گیگ ephemeral |
| دیسک ماندگار | PVC `synapse-app-disk-yv8un` → مانت روی `/data` |
| داده | `/data/database/hospital.db` + `/data/uploads` + `/data/.jwt-secret` |
| پورت | کانتینر روی `3000`؛ سرویس `80 → targetPort: http (3000)` |
| ورود دمو | `hospital3_admin / Hospital3@Admin2026` |

## ۲) تله‌های واقعی این پلتفرم (همه تجربه‌شده)

1. **پنل بعد از ساخت، تغییرات را ذخیره نمی‌کند.** ایمیج، متغیرهای محیطی، مانیفست و دامنه
   با reload به حالت قبل برمی‌گردند. تنها چیزی که می‌ماند، مقادیرِ لحظهٔ ساخت است.
   ⇒ به‌روزرسانی باید با `kubectl` انجام شود، نه از پنل.
2. **در ساخت اپ، «پورت کانتینر» را ۳۰۰۰ بگذارید.** نام پورت `http` می‌شود و سرویس
   خودکار `80 → http` ساخته می‌شود.
3. **اینگرس دستی ساخته می‌شود، ولی به سرویس قدیمی اشاره می‌ماند.** اگر اپی حذف/جایگزین شد،
   بک‌اند اینگرس را دستی به سرویس زنده بچرخانید:
   ```bash
   kubectl -n synapse patch ingress synapse-ingress --type=json \
     -p '[{"op":"replace","path":"/spec/rules/0/http/paths/0/backend/service/name","value":"synapse-app"}]'
   ```
4. **متغیرهای محیطی را در ایمیج بگذارید، نه در پنل.** حالا `NODE_ENV/PORT/DATA_DIR/BASE_URL`
   در `Dockerfile` هستند و `JWT_SECRET` را `scripts/docker-entrypoint.sh` یک‌بار می‌سازد و در
   `/data/.jwt-secret` نگه می‌دارد (پس با ری‌استارت و ری‌دیپلوی عوض نمی‌شود).
5. **نام اپ باید یکتا باشد در کل حساب** (نه فقط پروژه)؛ `synapse` قبلاً اشغال بود.
6. **کش ایمیج:** تگ `latest` با `IfNotPresent` نمی‌شود روی نود تازه‌سازی کرد؛ به همین دلیل
   استقرار با تگ `sha-<کامیت>` و `kubectl set image` انجام می‌شود.

## ۳) جریان استقرار خودکار

```
push روی main
   → CI (تست‌ها: unit/integration/rbac/forms/guardrails/smoke/dana)
   → Docker Image  (build و push با tag  sha-<۷ کاراکتر> و latest)
   → Deploy Arvan  (kubectl set image + rollout status + curl /healthz)
```

فایل‌های مربوطه:
- `.github/workflows/docker-image.yml` — ساخت و انتشار ایمیج روی GHCR
- `.github/workflows/deploy-arvan.yml` — نشاندن ایمیج روی کلاستر و تست سلامت

راز لازم در GitHub: **`ARVAN_KUBECONFIG`** (فقط همین یکی). بقیه با `GITHUB_TOKEN` خودکار است.
یعنی حتی اگر توکن شخصی مالک باطل شود، زنجیره کار می‌کند.

### استقرار دستی (وقتی Actions در دسترس نیست)
```bash
kubectl -n synapse set image deployment/synapse-app synapse-app=ghcr.io/hssn3/synapse:sha-<short>
kubectl -n synapse rollout status deployment/synapse-app
```

### بازگشت به نسخهٔ قبل (rollback)
```bash
kubectl -n synapse rollout undo deployment/synapse-app
kubectl -n synapse rollout status deployment/synapse-app
```

## ۴) مسیر جایگزین: به‌روزرسانِ درون‌کلاستری

اگر خواستید استقرار حتی به GitHub Actions هم وابسته نباشد، یک CronJob داخل کلاستر هست که
هر ۵ دقیقه آخرین کامیت `main` را می‌خواند و ایمیج را به‌روز می‌کند (بدون هیچ توکنی، چون مخزن و
پکیج عمومی‌اند):

```bash
kubectl create configmap synapse-autoupdate -n synapse \
  --from-file=arvan-autoupdate.js=scripts/arvan-autoupdate.js
kubectl apply -f scripts/arvan/autoupdate-rbac.yaml
kubectl apply -f scripts/arvan/autoupdate-cronjob.yaml
```

اجرای دستی و آزمایش خشک:
```bash
node scripts/arvan-autoupdate.js --check   # فقط sha/CI/دیجست را نشان می‌دهد
kubectl -n synapse create job --from=cronjob/synapse-autoupdate autoupdate-manual
```

> هر دو مسیر «نصب ایمیج با تگ» را به دیجست/تگ امن تبدیل می‌کنند و برای هم بی‌خطرند (idempotent).

## ۵) کارهای باقی‌مانده (مالک)

- `require_password` در این نصب خاموش است (ورود کاشی‌ای دمو). برای استفادهٔ واقعی از پنل
  سوپرادمین روشنش کنید.
- اعتبار حساب اروان: منابع فعلی ≈ ۸۷۴ هزار تومان در ماه (۰٫۵ هسته + ۱ گیگ رم + ۱ گیگ دیسک).
- کلید/توکن‌هایی که در گفتگو رد و بدل شدند (GitHub PAT و کلید Gemini) باید revoke شوند.
