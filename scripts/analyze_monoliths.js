const fs = require('fs');

const apiContent = fs.readFileSync('src/routes/api.js', 'utf8');
const apiLines = apiContent.split('\n');

const routerMatches = [];
const pathRegex = /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
let match;
while ((match = pathRegex.exec(apiContent)) !== null) {
  routerMatches.push({ method: match[1], path: match[2] });
}

console.log('Total router endpoints in api.js:', routerMatches.length);

const prefixes = {};
for (const r of routerMatches) {
  const parts = r.path.split('/').filter(Boolean);
  const pfx = parts[0] || 'root';
  prefixes[pfx] = (prefixes[pfx] || 0) + 1;
}

console.log('Endpoint prefixes breakdown:');
console.log(JSON.stringify(prefixes, null, 2));

// Top largest functions / blocks in api.js
const mountCrudMatches = (apiContent.match(/mountCrud\(/g) || []).length;
console.log('mountCrud invocations:', mountCrudMatches);
