const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const regex = /src="([^"]+)"/g;
let match;
while ((match = regex.exec(html)) !== null) {
  const src = match[1].split('?')[0].replace(/^\//, '');
  if (fs.existsSync(src)) {
    const code = fs.readFileSync(src, 'utf8');
    if (code.includes('function go(')) {
      console.log('function go( is in loaded script:', src);
    }
  }
}
