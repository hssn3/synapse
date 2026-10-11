/* =====================================================================
   تبِ «دستیار توسعه» در پنل سوپرادمین
   ---------------------------------------------------------------------
   کارفرما: یک AI جدا (با کلید خودش، مثلاً AvalAI) وصل کند و از داخل خودِ
   سایت درباره‌ی کدِ پروژه گفت‌وگو کند. مدل فایل‌های واقعی را می‌بیند
   (فقط خواندن) و اگر پیشنهادِ تغییر داشت، محتوای کاملِ فایل را در یک
   بلوکِ کدِ برچسب‌دار می‌دهد. سوپرادمین آن را می‌بیند، لازم شد ویرایش
   می‌کند، و با یک کلیکِ صریح روی یک شاخه‌ی کاری (هرگز main) به گیت‌هاب
   کامیت می‌شود — چون فایل‌سیستمِ ریلوی موقت است و تنها راهِ ماندگارشدنِ
   کد همین است.

   عمداً در فایل جداست، مثل super-docs.js — app.js نباید بیشتر باد کند.
   ===================================================================== */
(function (global) {
  'use strict';
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const DC = { settings: null, messages: [], busy: false, proposals: {},
    showSettings: false, attachment: null, lastUsedFiles: [] };

  async function api(path, opts) {
    const r = await fetch('/api/super' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'خطا در ارتباط با سرور');
    return d;
  }

  async function renderSuperDevChatTab() {
    const box = document.getElementById('superTabContent');
    box.innerHTML = '<div class="empty">در حال بارگذاری…</div>';
    try {
      const [settings, msgs] = await Promise.all([api('/dev/settings'), api('/dev/messages')]);
      DC.settings = settings; DC.messages = msgs.messages || [];
      drawDevChatTab();
    } catch (err) { box.innerHTML = `<div class="empty">${e(err.message)}</div>`; }
  }
  global.renderSuperDevChatTab = renderSuperDevChatTab;

  function drawDevChatTab() {
    const s = DC.settings;
    const aiReady = s.api_key_set || s.provider === 'custom';
    const ghReady = s.github_token_set && s.github_owner && s.github_repo;
    document.getElementById('superTabContent').innerHTML = `
    <div class="panel g">
      <div class="phd"><div class="abadge">💬</div><div style="flex:1"><h3>گفت‌وگو با دستیارِ توسعه</h3>
        <div class="sub">دستیار ساختارِ کاملِ پروژه را می‌شناسد و فایل‌های مرتبط را خودش پیدا می‌کند —
          لازم نیست مسیر بدهی یا چیزی را از قبل پوش کنی.</div></div>
        <button class="btn btn-o btn-sm" onclick="dcToggleSettings()">${DC.showSettings ? '▴ بستن تنظیمات' : '⚙ تنظیمات'}</button>
      </div>
      <div class="pbody">
        ${aiReady ? '' : `<div class="rg-warn" style="margin-bottom:12px">برای شروع فقط یک چیز لازم است:
          کلید API را در «⚙ تنظیمات» بگذار. تنظیمِ گیت‌هاب <b>اجباری نیست</b> و فقط وقتی لازم می‌شود
          که بخواهی یک تغییرِ پیشنهادی را کامیت کنی.</div>`}

        <div id="dcThread" style="display:flex;flex-direction:column;gap:12px;max-height:520px;overflow-y:auto;margin-bottom:12px">
          ${DC.messages.map(m => dcMessageHtml(m)).join('')
            || '<div class="empty">هنوز گفت‌وگویی نیست — مثلاً بپرس: «ماژول شیفت چطور کارکرد ماهانه را حساب می‌کند؟»</div>'}
        </div>

        ${DC.lastUsedFiles.length ? `<div class="dc-used">
          <b>فایل‌هایی که دستیار خواند:</b>
          ${DC.lastUsedFiles.map(f => `<code>${e(f.path)}</code>`).join(' ')}
        </div>` : ''}

        <div class="fg"><label>پیام</label>
          <textarea id="dc_message" rows="4" placeholder="مثلاً: چرا چاپ برنامه‌ی شیفت چند صفحه می‌شود؟"></textarea></div>

        <div class="dc-bar">
          <label class="btn btn-o btn-sm" style="cursor:pointer;margin:0">
            📎 پیوستِ عکس یا PDF
            <input type="file" id="dc_file" accept="image/*,application/pdf" style="display:none" onchange="dcAttachFile()">
          </label>
          <span id="dc_attach_info" class="tsub">${DC.attachment ? `پیوست: ${e(DC.attachment.name)}` : ''}</span>
          <details style="flex:1;min-width:200px">
            <summary class="tsub" style="cursor:pointer">فایل‌های زمینه‌ی دستی (اختیاری)</summary>
            <input id="dc_context" style="direction:ltr;margin-top:6px" placeholder="src/routes/api.js, public/js/app.js">
          </details>
          <button class="btn btn-g btn-sm" id="dcSendBtn" onclick="dcSendMessage()">ارسال</button>
        </div>
        <div id="dc_attach_out"></div>
      </div>
    </div>

    <div class="panel g" style="margin-top:16px;${DC.showSettings ? '' : 'display:none'}" id="dcSettingsPanel">
      <div class="phd"><div class="abadge">⚙</div><div><h3>تنظیمِ AI و گیت‌هاب</h3>
        <div class="sub">اتصالی کاملاً جدا — ربطی به «دانا»یی که کاربرانِ بیمارستان می‌بینند ندارد</div></div></div>
      <div class="pbody">
        <div class="docgrid">
          <div class="fg"><label>فروشنده‌ی هوش مصنوعی</label>
            <select id="dc_provider" onchange="dcProviderChange()">
              ${Object.entries(s.presets).map(([k, v]) => `<option value="${k}" ${s.provider === k ? 'selected' : ''}>${e(v.label)}</option>`).join('')}
            </select></div>
          <div class="fg"><label>مدل (خالی = پیش‌فرضِ فروشنده)</label><input id="dc_model" value="${e(s.model || '')}" style="direction:ltr"></div>
          <div class="fg" style="grid-column:span 2"><label>نشانی پایه (Base URL)</label>
            <input id="dc_baseurl" value="${e(s.base_url || '')}" style="direction:ltr" placeholder="https://api.avalai.ir/v1"></div>
          <div class="fg" style="grid-column:span 2"><label>کلید API ${s.api_key_set ? `(تنظیم‌شده، آخرش: ${e(s.api_key_hint)})` : '(تنظیم نشده)'}</label>
            <input id="dc_apikey" type="password" placeholder="برای تغییر، کلید تازه را اینجا بگذار" style="direction:ltr"></div>
          <div class="fg"><label>سقفِ توکنِ ماهانه</label><input id="dc_budget" type="number" value="${s.monthly_token_budget}"></div>
          <div class="fg"><label>مصرفِ این ماه</label><input value="${s.tokens_used_this_period} از ${s.monthly_token_budget}" disabled></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-o btn-sm" onclick="dcTestConnection()">تستِ اتصال</button>
          <button class="btn btn-g btn-sm" onclick="dcSaveAiSettings()">ذخیره‌ی تنظیمِ AI</button>
          <button class="btn btn-o btn-sm" onclick="dcShowProjectMap()">دیدنِ نقشه‌ی پروژه</button>
        </div>
        <div id="dcTestResult" style="margin-top:8px;font-size:12px"></div>
        <div id="dcMapOut"></div>

        <hr style="margin:16px 0;border-color:var(--bd)">
        <div class="sub" style="margin-bottom:8px"><b>گیت‌هاب (اختیاری)</b> — فقط برای کامیتِ تغییراتِ پیشنهادی لازم است.
          بدون آن هم می‌توانی بپرسی و کد بگیری. فایل‌سیستمِ سرور موقت است، پس ماندگارشدنِ کد
          فقط از این راه ممکن است. ${ghReady ? '<span style="color:var(--ok)">✓ تنظیم‌شده</span>' : ''}</div>
        <div class="docgrid">
          <div class="fg"><label>owner</label><input id="dc_gh_owner" value="${e(s.github_owner || '')}" style="direction:ltr" placeholder="hssn3"></div>
          <div class="fg"><label>repo</label><input id="dc_gh_repo" value="${e(s.github_repo || '')}" style="direction:ltr" placeholder="hospital-accreditation-platform"></div>
          <div class="fg"><label>شاخه‌ی پایه</label><input id="dc_gh_base" value="${e(s.github_default_branch || 'main')}" style="direction:ltr"></div>
          <div class="fg"><label>توکن گیت‌هاب ${s.github_token_set ? '(تنظیم‌شده)' : '(تنظیم نشده)'}</label>
            <input id="dc_gh_token" type="password" placeholder="برای تغییر، توکنِ تازه را اینجا بگذار" style="direction:ltr"></div>
        </div>
        <button class="btn btn-g btn-sm" style="margin-top:8px" onclick="dcSaveGithubSettings()">ذخیره‌ی تنظیمِ گیت‌هاب</button>
      </div>
    </div>`;
  }

  global.dcToggleSettings = function () { DC.showSettings = !DC.showSettings; drawDevChatTab(); };

  global.dcShowProjectMap = async function () {
    const out = document.getElementById('dcMapOut');
    out.innerHTML = '<div class="tsub">در حال خواندن…</div>';
    try {
      const r = await api('/dev/project-map');
      out.innerHTML = `<textarea rows="14" style="direction:ltr;font-family:monospace;font-size:11px;margin-top:8px" readonly>${e(r.map)}</textarea>`;
    } catch (err) { out.innerHTML = `<span style="color:var(--dn)">${e(err.message)}</span>`; }
  };

  global.dcAttachFile = async function () {
    const inp = document.getElementById('dc_file');
    const f = inp && inp.files && inp.files[0];
    const info = document.getElementById('dc_attach_info');
    if (!f) return;
    info.textContent = 'در حال خواندن فایل…';
    try {
      const fd = new FormData(); fd.append('file', f);
      const r = await fetch('/api/super/dev/attach', { method: 'POST', credentials: 'include', body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'خطا در خواندن فایل');
      DC.attachment = { name: d.name, text: d.text };
      info.textContent = `پیوست: ${d.name} — ${d.text.length} نویسه خوانده شد`;
      document.getElementById('dc_attach_out').innerHTML =
        `<details style="margin-top:8px"><summary class="tsub" style="cursor:pointer">متنِ خوانده‌شده از پیوست</summary>
         <textarea rows="6" style="margin-top:6px" readonly>${e(d.text.slice(0, 4000))}</textarea></details>`;
    } catch (err) { info.textContent = err.message; DC.attachment = null; }
  };

  function dcMessageHtml(m) {
    if (m.role === 'user') return `<div style="align-self:flex-end;max-width:80%;background:var(--surface-2,rgba(255,255,255,.06));border-radius:12px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${e(m.content)}</div>`;
    const proposals = extractProposals(m.content);
    const bodyText = m.content.replace(/```file:[^\n]+\n[\s\S]*?```/g, '').trim();
    return `<div style="align-self:flex-start;max-width:92%;background:var(--surface-2,rgba(120,140,190,.08));border-radius:12px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${e(bodyText)}
      ${proposals.map((p, i) => dcProposalHtml(m.id, i, p)).join('')}</div>`;
  }

  function extractProposals(text) {
    const re = /```file:([^\n`]+)\n([\s\S]*?)```/g;
    const out = []; let m;
    while ((m = re.exec(text || ''))) out.push({ path: m[1].trim(), content: m[2].replace(/\n$/, '') });
    return out;
  }

  function dcProposalHtml(msgId, i, p) {
    const key = msgId + '_' + i;
    DC.proposals[key] = p;
    return `<div class="panel g" style="margin-top:10px;background:var(--bg)">
      <div class="pbody" style="padding:10px">
        <b style="direction:ltr;display:block;font-size:12px;color:var(--gdl)">${e(p.path)}</b>
        <textarea id="dc_prop_${key}" rows="10" style="direction:ltr;font-family:monospace;font-size:11.5px;margin-top:6px">${e(p.content)}</textarea>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <input id="dc_branch_${key}" placeholder="نام شاخه‌ی کاری (نه main)" style="direction:ltr;max-width:220px">
          <input id="dc_commitmsg_${key}" placeholder="پیامِ کامیت (اختیاری)" style="flex:1;min-width:160px">
          <button class="btn btn-g btn-sm" onclick="dcCommitProposal('${key}')">ثبت کامیت روی گیت‌هاب</button>
        </div>
        <div id="dc_commit_result_${key}" style="margin-top:6px;font-size:11.5px"></div>
      </div>
    </div>`;
  }

  global.dcProviderChange = function () {
    const k = document.getElementById('dc_provider').value;
    const p = DC.settings.presets[k];
    if (p) {
      if (p.base_url) document.getElementById('dc_baseurl').value = p.base_url;
      if (p.model) document.getElementById('dc_model').value = p.model;
    }
  };

  global.dcTestConnection = async function () {
    const out = document.getElementById('dcTestResult');
    out.textContent = 'در حال تست…';
    try {
      const r = await api('/dev/test', { method: 'POST', body: JSON.stringify({
        provider: document.getElementById('dc_provider').value,
        model: document.getElementById('dc_model').value || null,
        api_key: document.getElementById('dc_apikey').value || undefined,
        base_url: document.getElementById('dc_baseurl').value || null,
      }) });
      out.innerHTML = r.ok ? `<span style="color:var(--ok)">✓ اتصال برقرار شد — پاسخ: ${e(r.reply)} (${r.ms}ms)</span>`
        : `<span style="color:var(--dn)">✗ ${e(r.error)}</span>`;
    } catch (err) { out.innerHTML = `<span style="color:var(--dn)">✗ ${e(err.message)}</span>`; }
  };

  global.dcSaveAiSettings = async function () {
    try {
      await api('/dev/settings', { method: 'PUT', body: JSON.stringify({
        provider: document.getElementById('dc_provider').value,
        model: document.getElementById('dc_model').value || null,
        api_key: document.getElementById('dc_apikey').value || undefined,
        base_url: document.getElementById('dc_baseurl').value || null,
        monthly_token_budget: Number(document.getElementById('dc_budget').value) || undefined,
      }) });
      if (typeof toast === 'function') toast('ذخیره شد'); else BTN.alert('ذخیره شد');
      renderSuperDevChatTab();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };

  global.dcSaveGithubSettings = async function () {
    try {
      await api('/dev/settings', { method: 'PUT', body: JSON.stringify({
        github_owner: document.getElementById('dc_gh_owner').value || null,
        github_repo: document.getElementById('dc_gh_repo').value || null,
        github_default_branch: document.getElementById('dc_gh_base').value || 'main',
        github_token: document.getElementById('dc_gh_token').value || undefined,
      }) });
      if (typeof toast === 'function') toast('ذخیره شد'); else BTN.alert('ذخیره شد');
      renderSuperDevChatTab();
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
  };

  global.dcSendMessage = async function () {
    if (DC.busy) return;
    const msgEl = document.getElementById('dc_message');
    const message = msgEl.value.trim();
    if (!message) return;
    const ctxEl = document.getElementById('dc_context');
    const contextRaw = ctxEl ? ctxEl.value.trim() : '';
    const context_paths = contextRaw ? contextRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    DC.busy = true;
    const btn = document.getElementById('dcSendBtn'); btn.disabled = true; btn.textContent = 'در حال پردازش…';
    try {
      const r = await api('/dev/chat', { method: 'POST', body: JSON.stringify({
        message, context_paths,
        attachment_text: DC.attachment ? DC.attachment.text : undefined,
        attachment_name: DC.attachment ? DC.attachment.name : undefined,
      }) });
      DC.messages.push({ id: 'tmp-u-' + Date.now(), role: 'user',
        content: message + (DC.attachment ? `\n[پیوست: ${DC.attachment.name}]` : '') });
      DC.messages.push({ id: 'tmp-a-' + Date.now(), role: 'assistant', content: r.reply });
      // نشان‌دادنِ فایل‌هایی که دستیار خودش انتخاب کرد — بدون این، کاربر
      // نمی‌فهمد جواب از کجا آمده و به آن اعتماد نمی‌کند.
      DC.lastUsedFiles = r.used_files || [];
      DC.attachment = null;
      msgEl.value = '';
      drawDevChatTab();
      const thread = document.getElementById('dcThread'); if (thread) thread.scrollTop = thread.scrollHeight;
    } catch (err) { if (typeof toast === 'function') toast(err.message, true); else BTN.alert(err.message); }
    finally { DC.busy = false; if (document.getElementById('dcSendBtn')) { document.getElementById('dcSendBtn').disabled = false; document.getElementById('dcSendBtn').textContent = 'ارسال'; } }
  };

  global.dcCommitProposal = async function (key) {
    const p = DC.proposals[key]; if (!p) return;
    const branch = document.getElementById('dc_branch_' + key).value.trim();
    const content = document.getElementById('dc_prop_' + key).value;
    const commitMsg = document.getElementById('dc_commitmsg_' + key).value.trim();
    const out = document.getElementById('dc_commit_result_' + key);
    if (!branch) { out.innerHTML = '<span style="color:var(--dn)">نامِ شاخه را بنویس</span>'; return; }
    out.textContent = 'در حال کامیت…';
    try {
      const r = await api('/dev/commit', { method: 'POST', body: JSON.stringify({ path: p.path, content, branch, message: commitMsg || undefined }) });
      out.innerHTML = `<span style="color:var(--ok)">✓ کامیت شد روی ${e(r.branch)} — <a href="${e(r.compareUrl)}" target="_blank" rel="noopener">باز کردن مقایسه/PR روی گیت‌هاب</a></span>`;
    } catch (err) { out.innerHTML = `<span style="color:var(--dn)">✗ ${e(err.message)}</span>`; }
  };
})(window);
