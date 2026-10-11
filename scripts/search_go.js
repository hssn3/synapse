const fs = require('fs');
const path = require('path');

function search(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) search(full);
    else if (f.endsWith('.js')) {
      const c = fs.readFileSync(full, 'utf8');
      if (/\bfunction\s+go\s*\(/.test(c) || /\bconst\s+go\s*=/.test(c) || /\blet\s+go\s*=/.test(c) || /\bwindow\.go\s*=/.test(c)) {
        console.log('Found go in:', full);
      }
    }
  });
}
search('public/js');
