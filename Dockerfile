# نکته‌ی مهم (این دقیقاً همان مشکلی است که در محیط توسعه‌ی ویندوز این پروژه یک بار وقت زیادی گرفت):
# better-sqlite3 و sharp هر دو ماژول native دارند. بسته‌بندی‌شان معمولاً باینری از‌پیش‌کامپایل‌شده
# (prebuild) برای Debian glibc دانلود می‌کند، اما اگر آن دانلود به هر دلیلی شکست بخورد یا برای
# نسخه‌ی Node تصویر باینری آماده نباشد، npm به کامپایل از سورس با node-gyp برمی‌گردد که به
# python3 + make + g++ نیاز دارد. base image «slim» این‌ها را ندارد — پس صریحاً نصب می‌شوند تا
# build هرگز به همان دیوار برخورد نکند.
FROM node:22-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# npm ci به‌جای npm install چون package-lock.json در مخزن هست — نصب قطعی و تکرارپذیر
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads database/backups

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

# در اولین اجرا (وقتی روی Volume هنوز database/hospital.db نیست) اسکیمای پایه ساخته و seed اولیه
# اجرا می‌شود؛ در اجراهای بعدی روی همان Volume فقط سرور بالا می‌آید و ~۴۵ مایگریشن idempotent
# داخل src/app.js خودشان را روی هر boot به‌روز نگه می‌دارند (هیچ‌کدام دوباره‌کاری نمی‌کنند).
CMD ["sh","-c","test -f database/hospital.db || npm run init-db; node src/app.js"]
