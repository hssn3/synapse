const fs = require('fs');

const file = 'public/js/hassan-hubs.js';
let content = fs.readFileSync(file, 'utf8');

const target = "    const contentEl = document.getElementById('artifacts_content_' + measureCode);\n    if (!contentEl) return;\n\n    if (viewMode === 'table') {";
const targetCRLF = "    const contentEl = document.getElementById('artifacts_content_' + measureCode);\r\n    if (!contentEl) return;\r\n\r\n    if (viewMode === 'table') {";

const replacement = `    HassanHub._currentFilteredItems = HassanHub._currentFilteredItems || {};
    HassanHub._currentFilteredItems[measureCode] = allItems;

    const contentEl = document.getElementById('artifacts_content_' + measureCode);
    if (!contentEl) return;

    if (viewMode === 'table') {`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Saved _currentFilteredItems before render (LF)');
} else if (content.includes(targetCRLF)) {
  content = content.replace(targetCRLF, replacement.replace(/\n/g, '\r\n'));
  fs.writeFileSync(file, content, 'utf8');
  console.log('Saved _currentFilteredItems before render (CRLF)');
} else {
  console.log('Target not found');
}
