# =====================================================================
# ایمیج تولیدی سیناپس — Node 22 + SQLite + آپلودهای ماندگار
#
# نکته‌ی مهم (این دقیقاً همان مشکلی است که در محیط توسعه‌ی ویندوز این پروژه یک بار
# وقت زیادی گرفت): better-sqlite3 و sharp هر دو ماژول native دارند. بسته‌بندی‌شان
# معمولاً باینری از‌پیش‌کامپایل‌شده (prebuild) برای Debian glibc دانلود می‌کند، اما
# اگر آن دانلود به هر دلیلی شکست بخورد یا برای نسخه‌ی Node تصویر باینری آماده نباشد،
# npm به کامپایل از سورس با node-gyp برمی‌گردد که به python3 + make + g++ نیاز دارد.
# base image «slim» این‌ها را ندارد — پس صریحاً نصب می‌شوند تا build هرگز به همان
# دیوار برخورد نکند.
#
# فایل عمداً با پایان‌خط LF ذخیره شده: با CRLF، بک‌اسلشِ پایانِ خط در sh یک CR را
# escape می‌کند و کل بلوک RUN می‌شکند (روی ویندوز اگر ادیتور خودکار CRLF بگذارد
# همین اتفاق می‌افتد؛ .gitattributes این فایل را LF نگه می‌دارد).
# =====================================================================
FROM node:22-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    libfreetype6 \
    libpng16-16 \
    && rm -rf /var/lib/apt/lists/*
# بالا: python3/make/g++ برای کامپایلِ احتمالیِ native، و کتابخانه‌های cairo/pango
# برای canvas که در src/services/pdf-pages.js برای استخراج متن PDF لازم است
# (sharp خودش libvips را همراه دارد و کتابخانه‌ی سیستمی نمی‌خواهد).

WORKDIR /app

COPY package.json package-lock.json ./
# npm ci به‌جای npm install چون package-lock.json در مخزن هست — نصب قطعی و تکرارپذیر
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads database/backups
# .dockerignore جلوی کپیِ node_modules ویندوزی، .git، دیتابیس محلی و uploads را می‌گیرد؛
# بدون آن، باینری‌های native با معماری غلط روی نسخه‌ی لینوکسی می‌نشستند.

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

# نقطه‌ی ورود در scripts/docker-entrypoint.sh است (نه CMD خطی): شرطِ «دیتابیس هست یا نه»
# باید روی مسیر واقعیِ DATA_DIR بررسی شود، وگرنه با DATA_DIR=/data در هر ری‌استارت
# زنجیره‌ی init-db دوباره اجرا می‌شد. سه حالت (دیتابیس موجود / بازگردانی عکس دمو /
# بوت با دیتابیس خالی) در همان فایل مستند است.
ENTRYPOINT ["sh", "/app/scripts/docker-entrypoint.sh"]
