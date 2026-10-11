const fs = require('fs');
const path = require('path');

// 1. Update dashboard-analytics.js
{
  const p = path.join(__dirname, '../public/js/views/dashboard/dashboard-analytics.js');
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(
    "{ title: 'شاخص‌ها', sub: 'پایش سنجه‌ها و KPI', icon: '📈', action: \"go('indicators')\" }",
    "{ title: 'شاخص‌ها', sub: 'پایش سنجه‌ها و KPI', icon: '📈', action: \"go('indicator_slides')\" }"
  );
  fs.writeFileSync(p, content, 'utf8');
  console.log('[OK] dashboard-analytics.js patched');
}

// 2. Update 08-router-routes.js
{
  const p = path.join(__dirname, '../public/js/core/08-router-routes.js');
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(
    "indicators:renderIndicators,",
    "indicators:(typeof renderIndicatorSlidesView==='function'?renderIndicatorSlidesView:renderIndicators),"
  );
  fs.writeFileSync(p, content, 'utf8');
  console.log('[OK] 08-router-routes.js patched');
}

// 3. Update core-router-routes.js
{
  const p = path.join(__dirname, '../public/js/core/core-router-routes.js');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(
      "indicators:renderIndicators,",
      "indicators:(typeof renderIndicatorSlidesView==='function'?renderIndicatorSlidesView:renderIndicators),"
    );
    fs.writeFileSync(p, content, 'utf8');
    console.log('[OK] core-router-routes.js patched');
  }
}

// 4. Update index.html cache busters
{
  const p = path.join(__dirname, '../public/index.html');
  let content = fs.readFileSync(p, 'utf8');
  const nowVer = '20261007_v4';
  content = content.replace(/\/js\/views\/dashboard\/dashboard-analytics\.js\?v=[^"']+/g, `/js/views/dashboard/dashboard-analytics.js?v=${nowVer}`);
  content = content.replace(/\/js\/core\/08-router-routes\.js\?v=[^"']+/g, `/js/core/08-router-routes.js?v=${nowVer}`);
  content = content.replace(/\/js\/views\/quality\/indicator-slides-view\.js\?v=[^"']+/g, `/js/views/quality/indicator-slides-view.js?v=${nowVer}`);
  content = content.replace(/\/css\/indicator-slides\.css\?v=[^"']+/g, `/css/indicator-slides.css?v=${nowVer}`);
  content = content.replace(/\/js\/api\.js\?v=[^"']+/g, `/js/api.js?v=${nowVer}`);
  fs.writeFileSync(p, content, 'utf8');
  console.log('[OK] index.html cache busters updated to ' + nowVer);
}

// 5. Bump service worker CACHE version in sw.js
{
  const p = path.join(__dirname, '../public/sw.js');
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/const CACHE = '[^']+';/, `const CACHE = 'hosp-v7';`);
  fs.writeFileSync(p, content, 'utf8');
  console.log('[OK] sw.js bumped to hosp-v7');
}
