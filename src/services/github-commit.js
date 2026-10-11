/* =====================================================================
   کامیت‌کردن یک فایل روی گیت‌هاب — از داخلِ خودِ برنامه
   ---------------------------------------------------------------------
   چرا این‌طور: فایل‌سیستمِ کانتینرِ ریلوی موقت است — هر ادیتِ مستقیم روی
   دیسک با اولین ریدیپلوی از بین می‌رود (مستندشده در تاریخچه‌ی همین پروژه،
   مبحثِ ماندگاریِ داده). تنها راهی که واقعاً «کد را عوض می‌کند» این است که
   تغییر به گیت‌هاب کامیت شود و ریلوی دوباره بیلد کند.

   امنیت: این سرویس هرگز مستقیم روی main/master کامیت نمی‌کند — همیشه یک
   شاخه‌ی کاری می‌سازد (یا از قبل موجود را ادامه می‌دهد) و کامیت روی همان
   می‌رود. ادغام با main تصمیمِ انسانی است، از طریق PR روی خودِ گیت‌هاب.

   از Contents API استفاده می‌شود (نه Git Data API خام) چون برای «یک فایل،
   یک کامیت» ساده‌تر و کم‌خطاتر است؛ خودِ گیت‌هاب SHA پایه و merge با
   تاریخچه را مدیریت می‌کند.
   ===================================================================== */
'use strict';

const DEFAULT_API_BASE = 'https://api.github.com';

async function ghFetch(apiBase, token, path, opts = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });
  const raw = await res.text();
  let data = {}; try { data = raw ? JSON.parse(raw) : {}; } catch (e) { /* پایین‌تر */ }
  return { ok: res.ok, status: res.status, data };
}

// مسیرهایی که هرگز نباید از این راه دست‌خورده شوند — دفاعِ دومی پشتِ
// «فقط روی شاخه‌ی کاری، نه main». حتی روی یک شاخه‌ی فرعی هم دست‌کاریِ این‌ها
// از داخلِ چت خطرناک است.
const BLOCKED_PATH_RE = /(^|\/)\.env(\.|$)|(^|\/)\.git\/|(^|\/)node_modules\/|(^|\/)database\/[^/]+\.db$|(^|\/)\.github\/workflows\//;

function validatePath(p) {
  const clean = String(p || '').trim().replace(/^\/+/, '');
  if (!clean) throw new Error('مسیر فایل الزامی است');
  if (clean.includes('..')) throw new Error('مسیر نامعتبر است');
  if (BLOCKED_PATH_RE.test(clean)) throw new Error('این مسیر از راه دستیار توسعه قابل تغییر نیست — امن نیست');
  return clean;
}

/**
 * یک فایل را روی یک شاخه (نه main) کامیت می‌کند؛ اگر شاخه نبود از رویِ
 * شاخه‌ی پایه می‌سازد.
 */
async function commitFile({ githubToken, owner, repo, apiBase, baseBranch, branch, path, content, message }) {
  if (!githubToken) { const e = new Error('توکن گیت‌هاب تنظیم نشده'); e.code = 'NO_GITHUB_TOKEN'; throw e; }
  if (!owner || !repo) throw new Error('owner/repo گیت‌هاب تنظیم نشده');
  const targetBranch = (branch || '').trim();
  if (!targetBranch) throw new Error('نام شاخه الزامی است');
  if (['main', 'master'].includes(targetBranch.toLowerCase())) {
    throw new Error('کامیت مستقیم روی شاخه‌ی اصلی مجاز نیست — یک شاخه‌ی کاری انتخاب کنید');
  }
  const cleanPath = validatePath(path);
  const base = (apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  // ۱. آیا شاخه‌ی مقصد وجود دارد؟
  let branchExists = true;
  let r = await ghFetch(base, githubToken, `${repoPath}/git/ref/heads/${encodeURIComponent(targetBranch)}`);
  if (r.status === 404) branchExists = false;
  else if (!r.ok) throw new Error(`خطای گیت‌هاب در بررسیِ شاخه (${r.status}) — ${r.data.message || ''}`);

  // ۲. اگر نبود، از شاخه‌ی پایه بسازش.
  if (!branchExists) {
    const baseRef = await ghFetch(base, githubToken, `${repoPath}/git/ref/heads/${encodeURIComponent(baseBranch || 'main')}`);
    if (!baseRef.ok) throw new Error(`شاخه‌ی پایه‌ی «${baseBranch || 'main'}» پیدا نشد — ${baseRef.data.message || ''}`);
    const createRef = await ghFetch(base, githubToken, `${repoPath}/git/refs`, {
      method: 'POST', body: JSON.stringify({ ref: `refs/heads/${targetBranch}`, sha: baseRef.data.object.sha }),
    });
    if (!createRef.ok) throw new Error(`ساختِ شاخه‌ی «${targetBranch}» شکست خورد (${createRef.status}) — ${createRef.data.message || ''}`);
  }

  // ۳. اگر فایل روی همین شاخه از قبل هست، SHA فعلی‌اش لازم است (وگرنه گیت‌هاب رد می‌کند).
  let existingSha = null;
  const existing = await ghFetch(base, githubToken,
    `${repoPath}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}?ref=${encodeURIComponent(targetBranch)}`);
  if (existing.ok && existing.data && existing.data.sha) existingSha = existing.data.sha;

  // ۴. خودِ کامیت.
  const put = await ghFetch(base, githubToken,
    `${repoPath}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: message || `به‌روزرسانی ${cleanPath} — دستیار توسعه`,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch: targetBranch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });
  if (!put.ok) throw new Error(`کامیت شکست خورد (${put.status}) — ${put.data.message || 'خطای نامشخص'}`);

  return {
    commitSha: put.data.commit && put.data.commit.sha,
    branch: targetBranch,
    path: cleanPath,
    compareUrl: `https://github.com/${owner}/${repo}/compare/${baseBranch || 'main'}...${targetBranch}`,
    fileUrl: put.data.content && put.data.content.html_url,
  };
}

/** محتوای فعلیِ یک فایل روی یک شاخه — برای نشان‌دادنِ «قبل» به سوپرادمین. */
async function readFile({ githubToken, owner, repo, apiBase, branch, path }) {
  if (!githubToken) { const e = new Error('توکن گیت‌هاب تنظیم نشده'); e.code = 'NO_GITHUB_TOKEN'; throw e; }
  const cleanPath = validatePath(path);
  const base = (apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  const r = await ghFetch(base, githubToken,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(cleanPath).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch || 'main')}`);
  if (r.status === 404) return { exists: false, content: '' };
  if (!r.ok) throw new Error(`خطای گیت‌هاب (${r.status}) — ${r.data.message || ''}`);
  return { exists: true, content: Buffer.from(r.data.content || '', 'base64').toString('utf8'), sha: r.data.sha };
}

module.exports = { commitFile, readFile, validatePath, DEFAULT_API_BASE };
