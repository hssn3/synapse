> ⚡ **از ۲۰۲۶-۰۹-۰۸ به بعد: اول `AGENTS.md` را بخوان** — نقطهی ورود بهروز با آخرین
> وضعیت گیت/تستها/کارهای باز؛ این فایل سندِ تاریخی-معماری است و AGENTS.md میگوید
> برای هر کار کدام بخش از کدام سند لازم است (صرفهجویی در توکن).
## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## زبان گفت‌وگو

همیشه **فارسی** توضیح بده. کارفرمای این پروژه فارسی‌زبان است و خواسته‌ی صریحش
همین است. کد، نام فایل و پیام خطای انگلیسی سرِ جایش می‌ماند، ولی توضیح، خلاصه،
گزارش و پرسش از کاربر فارسی نوشته می‌شود.

## کار جاری — نسخه‌ی ۲

پیش از شروع هر کاری روی این پروژه، `docs/ROADMAP-V2.md` را بخوان.

کارفرما نسخه‌ی ۱ را به‌دلیل شلوغیِ رابط کاربری نپذیرفت و بازسازی در جریان است.
آن فایل می‌گوید چه تصمیم‌هایی قطعی شده، کدام مرحله تمام شده و از کجا باید ادامه
داد. حافظه‌ی این کار همان فایل است، نه تاریخچه‌ی گفت‌وگو — پس هر مرحله که تمام
شد، همان‌جا به‌روزش کن.
