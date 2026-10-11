const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');
const lines = content.split('\n');

const markers = [];
lines.forEach((l, idx) => {
  if (l.match(/^\/\/\s*={4,}.*={4,}/) || l.match(/^\/\/\s*=====/)) {
    markers.push({ line: idx + 1, text: l.trim().slice(0, 70) });
  }
});
console.log('Found', markers.length, 'section headers.');
markers.forEach((m, i) => {
  const nextLine = (i + 1 < markers.length) ? markers[i+1].line : lines.length;
  console.log(`[${m.line} - ${nextLine - 1}] (${nextLine - m.line} lines): ${m.text}`);
});
