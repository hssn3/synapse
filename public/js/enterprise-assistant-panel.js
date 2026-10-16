/**
 * Enterprise Persona-Aware AI Assistant Floating Panel
 * Health-Tech Luxury Floating UI with Guardrail Alerts, Citations, and Smart Chips.
 * Mounted at the top of the float dock directly above the main menu button.
 */
(function(window) {
  'use strict';

  function initAssistantPanel() {
    if (document.getElementById('ent-assistant-trigger')) return;

    // Clean up any legacy duplicate guide elements
    const legacyGuideBtn = document.getElementById('guideDockBtn');
    if (legacyGuideBtn) legacyGuideBtn.remove();
    const legacyGuidePanel = document.getElementById('guidePanel');
    if (legacyGuidePanel) legacyGuidePanel.remove();

    // 1. Ensure float dock container exists and is visible
    let dock = document.getElementById('floatDock');
    if (!dock) {
      if (typeof window.ensureFloatDock === 'function') {
        dock = window.ensureFloatDock();
      } else {
        dock = document.createElement('div');
        dock.id = 'floatDock';
        dock.className = 'floatdock';
        document.body.appendChild(dock);
      }
    }
    if (dock) dock.style.display = 'flex';

    // 2. Create the luxury Dana capsule trigger button
    const trigger = document.createElement('div');
    trigger.id = 'ent-assistant-trigger';
    trigger.className = 'ent-assistant-bubble';
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    trigger.innerHTML = `
      <span class="bubble-icon"><img class="bubble-img" src="/img/synapse-flower.png" alt="دستیار سیناپس" draggable="false"></span>
    `;

    // Insert at the top of the dock, above the main menu button
    dock.insertBefore(trigger, dock.firstChild);

    // 3. Create the assistant drawer attached to body
    let drawer = document.getElementById('ent-assistant-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'ent-assistant-drawer';
      drawer.className = 'ent-assistant-drawer';
      drawer.style.display = 'none';
      drawer.setAttribute('dir', 'rtl');
      drawer.innerHTML = `
        <div class="drawer-header">
          <div class="drawer-title-box">
            <span class="drawer-badge"><img src="/img/synapse-dana.png" alt="" draggable="false"></span>
            <div>
              <h4 id="drawer-persona-title" class="drawer-title">دستیار سیناپس</h4>
              <span id="drawer-persona-role" class="drawer-subtitle">نقش: در حال بارگذاری...</span>
            </div>
          </div>
          <div class="drawer-header-actions">
            <button id="drawer-reset-btn" class="drawer-action-btn" type="button" title="شروع گفتگوی تازه">🔄</button>
            <button id="drawer-close-btn" class="drawer-close" type="button" title="بستن پنجره">&times;</button>
          </div>
        </div>

        <div id="drawer-chips-bar" class="drawer-chips-bar">
          <button type="button" class="ent-chip" data-q="وضعیت سنجه‌های ایمنی بیمار چطوره؟">🛡️ سنجه‌های ایمنی</button>
          <button type="button" class="ent-chip" data-q="چطور خطای پزشکی و وقایع ۲۸گانه را ثبت کنم؟">⚠️ وقایع ۲۸گانه</button>
          <button type="button" class="ent-chip" data-q="الان چه کار کنم؟">⏱️ الان چه کار کنم؟</button>
          <button type="button" class="ent-chip" data-q="بررسی وظایف و برنامه‌های من">📋 وظایف من</button>
          <button type="button" class="ent-chip" data-q="تحلیل FMEA و اقدامات اصلاحی RCA">🔍 تحلیل RCA/FMEA</button>
          <button type="button" class="ent-chip" data-q="الزامات و مدارک اعتباربخشی">📑 مستندات</button>
        </div>

        <div id="drawer-messages" class="drawer-messages">
          <div class="msg-bot">
            درود بر شما. در حال بازیابی پرسونای اختصاصی نقش شما و دسترسی‌های مجاز...
          </div>
        </div>

        <div class="drawer-input-row">
          <input type="text" id="drawer-input" class="drawer-input" placeholder="پرسش یا اقدام مورد نظر را بنویسید..." autocomplete="off" />
          <button id="drawer-send-btn" class="btn btn--primary btn--sm drawer-send" type="button">ارسال</button>
        </div>
      `;
      document.body.appendChild(drawer);
    }

    const closeBtn = document.getElementById('drawer-close-btn');
    const resetBtn = document.getElementById('drawer-reset-btn');
    const sendBtn = document.getElementById('drawer-send-btn');
    const input = document.getElementById('drawer-input');
    const messagesBox = document.getElementById('drawer-messages');
    const chipsBar = document.getElementById('drawer-chips-bar');

    let currentPersona = null;

    function openDrawer() {
      drawer.style.display = 'flex';
      loadPersona();
      setTimeout(() => { if (input) input.focus(); }, 150);
    }

    function closeDrawer() {
      drawer.style.display = 'none';
    }

    function toggleDrawer() {
      if (drawer.style.display === 'none' || !drawer.style.display) {
        openDrawer();
      } else {
        closeDrawer();
      }
    }

    // Global helpers
    window.toggleEnterpriseAssistant = toggleDrawer;
    window.openEnterpriseAssistant = openDrawer;
    window.closeEnterpriseAssistant = closeDrawer;
    window.updateEnterpriseAssistantBadge = function(count) {
      const b = document.getElementById('ent-assistant-badge');
      if (!b) return;
      if (count && Number(count) > 0) {
        b.textContent = String(count);
        b.style.display = 'inline-flex';
      } else {
        b.style.display = 'none';
      }
    };

    let closeTimeout;
    
    trigger.addEventListener('mouseenter', () => {
      clearTimeout(closeTimeout);
      openDrawer();
    });

    drawer.addEventListener('mouseenter', () => {
      clearTimeout(closeTimeout);
    });

    trigger.addEventListener('mouseleave', () => {
      closeTimeout = setTimeout(closeDrawer, 300);
    });

    drawer.addEventListener('mouseleave', () => {
      closeTimeout = setTimeout(closeDrawer, 300);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDrawer();
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer();
    });

    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      messagesBox.innerHTML = '';
      if (currentPersona) {
        setWelcomeMessage(currentPersona);
      } else {
        loadPersona();
      }
    });

    // Dismiss on click outside
    document.addEventListener('mousedown', (e) => {
      if (drawer.style.display !== 'none' && !drawer.contains(e.target) && !trigger.contains(e.target)) {
        closeDrawer();
      }
    });

    // Dismiss on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.style.display !== 'none') {
        closeDrawer();
      }
    });

    // Quick prompt chips
    chipsBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.ent-chip');
      if (!btn) return;
      const q = btn.dataset.q;
      if (q) {
        input.value = q;
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });

    function setWelcomeMessage(p) {
      messagesBox.innerHTML = `
        <div class="msg-bot">
          سلام! به عنوان <b>${p.title || 'کاربر سامانه'}</b> در خدمت شما هستم. کلیه راهنمایی‌ها و ابزارهای من بر اساس حدود اختیارات و وظایف این نقش تنظیم شده‌اند. می‌توانید از پرسش‌های آمادهٔ بالا استفاده کنید یا سوال خود را بنویسید.
        </div>
      `;
    }

    async function loadPersona() {
      if (currentPersona) return;
      try {
        const res = await fetch('/api/assistant-enterprise/persona', { credentials: 'same-origin' });
        if (res.ok) {
          const p = await res.json();
          currentPersona = p;
          const titleEl = document.getElementById('drawer-persona-title');
          const roleEl = document.getElementById('drawer-persona-role');
          if (titleEl) titleEl.innerText = p.title || 'دستیار سیناپس';
          if (roleEl) {
            var _roleFa = (typeof ROLE_FA !== 'undefined' && ROLE_FA[p.role_code]) || (typeof S !== 'undefined' && S.user && S.user.role_title) || p.role_code || '';
            roleEl.innerText = 'نقش: ' + _roleFa;
          }
          setWelcomeMessage(p);
        }
      } catch (e) {
        console.warn('[AssistantPanel] Persona load error:', e.message);
      }
    }

    function formatText(text) {
      if (!text) return '';
      let safe = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      const lines = safe.split('\n');
      const formattedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('— ') || trimmed.startsWith('- ')) {
          return '<div class="msg-bullet"><span class="bullet-dot">•</span> ' + trimmed.substring(2) + '</div>';
        }
        return line ? '<div>' + line + '</div>' : '<div class="msg-spacer"></div>';
      });

      return formattedLines.join('');
    }

    async function sendMessage(explicitText) {
      const text = (explicitText || input.value || '').trim();
      if (!text) return;
      input.value = '';

      appendMessage('user', text);

      const loadingMsg = appendMessage('bot', 'در حال پردازش و استناد به منابع...', false, true);

      try {
        const res = await fetch('/api/assistant-enterprise/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            message: text,
            context: {
              route: window.location.hash,
              headers: Array.from(document.querySelectorAll("h1, h2, h3, .sec-h")).map(h => h.innerText).join(" | "),
              fields: Array.from(document.querySelectorAll("input, select, textarea")).map(e => (e.placeholder || e.name || e.id) + ":" + e.value)
            }
          })
        });

        const data = await res.json();
        loadingMsg.remove();

        let citationsHtml = '';
        if (data.citations && data.citations.length > 0) {
          citationsHtml = `<div class="msg-citations">${data.citations.map(c => `<span class="cite-pill">🏷️ ${c}</span>`).join('')}</div>`;
        }

        let guardrailBadge = '';
        if (data.guardrail_status === 'blocked_unauthorized_action') {
          guardrailBadge = `<div class="guardrail-warning">🚫 اقدام خارج از حدود اختیارات نقش (NIST RBAC Guardrail)</div>`;
        }

        const formattedResponse = formatText(data.response || data.error || 'پاسخی دریافت نشد.');

        appendMessage('bot', `
          ${guardrailBadge}
          <div class="msg-content">${formattedResponse}</div>
          ${citationsHtml}
        `, true);
      } catch (err) {
        loadingMsg.remove();
        appendMessage('bot', 'خطا در برقراری ارتباط با سرور دستیار.');
      }
    }

    function appendMessage(sender, htmlContent, isRaw = false, isLoading = false) {
      const msg = document.createElement('div');
      msg.className = sender === 'user' ? 'msg-user' : 'msg-bot';
      if (isLoading) msg.classList.add('msg-loading');
      if (isRaw) {
        msg.innerHTML = htmlContent;
      } else {
        msg.innerText = htmlContent;
      }
      messagesBox.appendChild(msg);
      messagesBox.scrollTop = messagesBox.scrollHeight;
      return msg;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssistantPanel);
  } else {
    initAssistantPanel();
  }
})(window);
