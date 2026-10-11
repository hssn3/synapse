const fs = require('fs');
const path = require('path');

// 1. Update public/js/core/08-router-routes.js
{
  const p = path.join(__dirname, '../public/js/core/08-router-routes.js');
  let content = fs.readFileSync(p, 'utf8');

  // Replace line 90 indicator_slides item in navGroups
  const oldSnippet = `      ...(S.user && ['admin', 'nursing_director', 'hospital_president', 'quality_control_manager', 'accreditation_manager', 'clinical_supervisor', 'education_supervisor', 'infection_control_supervisor', 'head_nurse', 'superadmin'].includes(S.user.role_code) || (typeof canViewIndicators === 'function' && canViewIndicators()) ? [{k:'indicator_slides', i:ic('chart'), t:'داشبورد اسلایدی شاخص‌ها'}] : []),`;
  const newSnippet = `      {k:'indicator_slides', i:ic('chart'),     t:'شاخص‌ها'},`;

  if (content.includes(oldSnippet)) {
    content = content.replace(oldSnippet, newSnippet);
    fs.writeFileSync(p, content, 'utf8');
    console.log('[OK] 08-router-routes.js updated');
  } else {
    console.warn('[WARN] oldSnippet not found in 08-router-routes.js, trying regex');
    const regex = /\.\.\.\(S\.user && \[[\s\S]*?indicator_slides[\s\S]*?\],\n/m;
    if (regex.test(content)) {
      content = content.replace(regex, `      {k:'indicator_slides', i:ic('chart'),     t:'شاخص‌ها'},\n`);
      fs.writeFileSync(p, content, 'utf8');
      console.log('[OK] 08-router-routes.js updated via regex');
    } else {
      console.error('[ERR] Could not patch 08-router-routes.js');
    }
  }
}

// 2. Update public/js/core/core-router-routes.js if exists
{
  const p = path.join(__dirname, '../public/js/core/core-router-routes.js');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    const oldSnippet = `      ...(S.user && ['admin', 'nursing_director', 'hospital_president', 'quality_control_manager', 'accreditation_manager', 'clinical_supervisor', 'education_supervisor', 'infection_control_supervisor', 'head_nurse', 'superadmin'].includes(S.user.role_code) || (typeof canViewIndicators === 'function' && canViewIndicators()) ? [{k:'indicator_slides', i:ic('chart'), t:'داشبورد اسلایدی شاخص‌ها'}] : []),`;
    const newSnippet = `      {k:'indicator_slides', i:ic('chart'),     t:'شاخص‌ها'},`;
    if (content.includes(oldSnippet)) {
      content = content.replace(oldSnippet, newSnippet);
      fs.writeFileSync(p, content, 'utf8');
      console.log('[OK] core-router-routes.js updated');
    } else {
      const regex = /\.\.\.\(S\.user && \[[\s\S]*?indicator_slides[\s\S]*?\],\n/m;
      if (regex.test(content)) {
        content = content.replace(regex, `      {k:'indicator_slides', i:ic('chart'),     t:'شاخص‌ها'},\n`);
        fs.writeFileSync(p, content, 'utf8');
        console.log('[OK] core-router-routes.js updated via regex');
      }
    }
  }
}

// 3. Update public/js/core/core-router-nav.js ALL_APP_PAGES
{
  const p = path.join(__dirname, '../public/js/core/core-router-nav.js');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes("'indicator_slides'")) {
      content = content.replace("'indicators',", "'indicators', 'indicator_slides',");
      fs.writeFileSync(p, content, 'utf8');
      console.log('[OK] core-router-nav.js updated');
    }
  }
}

// 4. Update public/js/views/dashboard/dashboard-hubs.js
{
  const p = path.join(__dirname, '../public/js/views/dashboard/dashboard-hubs.js');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes("indicator_slides:'شاخص‌ها'")) {
      content = content.replace("indicators:'شاخص‌ها',", "indicators:'شاخص‌های قدیمی', indicator_slides:'شاخص‌ها',");
      fs.writeFileSync(p, content, 'utf8');
      console.log('[OK] dashboard-hubs.js updated');
    }
  }
}

// 5. Update index.html cache busters
{
  const p = path.join(__dirname, '../public/index.html');
  let content = fs.readFileSync(p, 'utf8');
  const nowVer = '20261007_v3';
  content = content.replace(/\/js\/core\/08-router-routes\.js\?v=[^"']+/g, `/js/core/08-router-routes.js?v=${nowVer}`);
  content = content.replace(/\/js\/views\/quality\/indicator-slides-view\.js\?v=[^"']+/g, `/js/views/quality/indicator-slides-view.js?v=${nowVer}`);
  content = content.replace(/\/css\/indicator-slides\.css\?v=[^"']+/g, `/css/indicator-slides.css?v=${nowVer}`);
  fs.writeFileSync(p, content, 'utf8');
  console.log('[OK] index.html cache busters updated to ' + nowVer);
}
