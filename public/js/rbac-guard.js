/**
 * Enterprise RBAC Frontend Guard
 * Provides window.can(resource, action) and automated UI hardening.
 */
(function(window) {
  'use strict';

  let userPermissions = new Set();
  let currentRoleCode = null;

  async function syncPermissions() {
    try {
      const res = await fetch('/api/rbac/my-permissions', { credentials: 'same-origin' });
      if (res.status === 401) {
        // پیش از ورود هیچ نشستی وجود ندارد؛ این «خطا» نیست و نباید کنسول را قرمز کند.
        // گاردریل پس از ورود دوباره همگام می‌شود (enterApp → RbacGuard.sync).
        userPermissions = new Set();
        currentRoleCode = null;
        return;
      }
      if (res.ok) {
        const data = await res.json();
        currentRoleCode = data.role_code;
        userPermissions = new Set(data.permissions || []);
        applyRbacUiGuards();
      }
    } catch (e) {
      console.warn('[RbacGuard] Could not sync permissions:', e.message);
    }
  }

  function can(resource, action) {
    if (userPermissions.has('*') || userPermissions.has('*:*:*')) return true;
    
    let domain = 'form';
    let target = resource;
    if (resource.includes(':')) {
      const parts = resource.split(':');
      domain = parts[0];
      target = parts[1];
    }

    const key = `${domain}:${target}:${action}`;
    const wildcard = `${domain}:${target}:*`;
    
    return userPermissions.has(key) || userPermissions.has(wildcard);
  }

  function applyRbacUiGuards() {
    document.querySelectorAll('[data-can]').forEach(el => {
      const canSpec = el.getAttribute('data-can'); // format: "monthly_program:edit" or "form:monthly_program:approve"
      const [res, act] = canSpec.split(':');
      const isAllowed = can(res, act || 'view');

      const behavior = el.getAttribute('data-can-behavior') || 'disable';

      if (!isAllowed) {
        if (behavior === 'hide') {
          el.style.display = 'none';
        } else {
          el.setAttribute('disabled', 'true');
          el.setAttribute('aria-disabled', 'true');
          el.classList.add('rbac-disabled');
          el.title = `عدم صلاحیت دسترسی — اقدام «${act}» برای نقش شما مجاز نیست.`;
        }
      } else {
        if (behavior === 'hide') {
          el.style.display = '';
        } else {
          el.removeAttribute('disabled');
          el.removeAttribute('aria-disabled');
          el.classList.remove('rbac-disabled');
          el.removeAttribute('title');
        }
      }
    });
  }

  window.RbacGuard = {
    sync: syncPermissions,
    can,
    apply: applyRbacUiGuards,
    getRole: () => currentRoleCode
  };

  window.can = can;

  // همگام‌سازی پس از بارگذاری DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncPermissions);
  } else {
    syncPermissions();
  }
})(window);
