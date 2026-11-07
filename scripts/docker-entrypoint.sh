#!/bin/sh
# =====================================================================
# نقطه‌ی ورود کانتینر (استقرار اروان‌کلاد، ۱۴۰۵/۰۸/۱۶)
#
# چرا این فایل و نه CMD قبلی:
# CMD قبلی همیشه «database/hospital.db» نسبی را چک می‌کرد. روی استقرار واقعی
# DATA_DIR=/data ست می‌شود، پس آن مسیر هیچ‌وقت وجود ندارد → هر ری‌استارت کل
# زنجیره‌ی init-db را دوباره اجرا می‌کرد (کند و پرریسک). اینجا همان شرط روی
# مسیر واقعیِ دیتابیس بررسی می‌شود و فقط یک‌بار عکس دمو بازگردانی می‌شود.
#
# سه حالت:
#   ۱) دیتابیس هست              → فقط سرور بالا می‌آید (داده دست‌نخورده)
#   ۲) دیتابیس نیست + عکس دمو   → عکس نمایشی بازگردانی و سرور بالا می‌آید
#   ۳) دیتابیس نیست + بدون عکس  → سرور خودش زنجیره‌ی init-db را اجرا می‌کند
#      (بخش bootstrapEmptyDatabase در src/app.js)
# =====================================================================
set -e

DATA_ROOT="${DATA_DIR:-/app}"
DB_FILE="${DB_ROOT:-$DATA_ROOT/database}/hospital.db"

echo "[entrypoint] DATA_DIR=$DATA_ROOT"
echo "[entrypoint] db=$DB_FILE"

# ---- رازِ نشست ----
# در NODE_ENV=production نبودِ JWT_SECRET یا کوتاهیِ آن ⇒ FATAL و exit(1)
# (src/config/app.js). چون پنل اروان در این نصب متغیر محیطی را ذخیره نمی‌کرد، اگر راز
# از بیرون نرسیده باشد همین‌جا یک‌بار ساخته و در DATA_DIR نگه‌داری می‌شود: با والیوم
# بین دیپلوی‌ها پایدار می‌ماند و بدون والیوم حداقل در طول عمر همان کانتینر.
if [ -z "$JWT_SECRET" ]; then
  mkdir -p "$DATA_ROOT"
  SECRET_FILE="$DATA_ROOT/.jwt-secret"
  if [ -f "$SECRET_FILE" ]; then
    JWT_SECRET=$(cat "$SECRET_FILE")
    echo "[entrypoint] JWT_SECRET از فایل خوانده شد"
  else
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
    printf '%s' "$JWT_SECRET" > "$SECRET_FILE"
    echo "[entrypoint] JWT_SECRET ساخته و در $SECRET_FILE ذخیره شد"
  fi
  export JWT_SECRET
fi

if [ ! -f "$DB_FILE" ]; then
  echo "[entrypoint] پایگاه‌داده نیست — بازگردانیِ عکس نمایشی…"
  # شکستِ بازگردانی نباید سرور را بخواباند: src/app.js خودش دیتابیس خالی را می‌سازد.
  npm run demo-restore -- --force || echo "[entrypoint] ⚠ بازگردانی نشد؛ بوت با دیتابیس خالی ادامه می‌یابد"
else
  echo "[entrypoint] پایگاه‌داده موجود است — بدون بازگردانی"
fi

exec node src/app.js
