const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(file, 'utf8');

if (!html.includes('indicator-slides.css')) {
  html = html.replace(
    'enterprise-components.css?v=20261006">',
    'enterprise-components.css?v=20261006">\r\n  <link rel="stylesheet" href="/css/indicator-slides.css?v=20261007">'
  );
}

if (!html.includes('indicator-slides-view.js')) {
  html = html.replace(
    '<script src="/js/views/quality/indicators-reports.js?v=20261006_mod"></script>',
    '<script src="/js/views/quality/indicators-reports.js?v=20261006_mod"></script>\r\n  <script src="/js/views/quality/indicator-slides-view.js?v=20261007"></script>'
  );
}

fs.writeFileSync(file, html, 'utf8');
console.log('Successfully updated index.html');
