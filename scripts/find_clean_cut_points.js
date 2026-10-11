const fs = require('fs');
const acorn = require('acorn'); // If available, or manual AST parser

const content = fs.readFileSync('public/js/app.js', 'utf8');
const lines = content.split('\n');

// Parse top-level statements
// If acorn is not in node_modules, we can use simple statement parser with Node vm
console.log('Total lines:', lines.length);

// Let's test if acorn exists
try {
  const ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'script' });
  console.log('Acorn successfully parsed app.js! Top-level statements:', ast.body.length);
  
  // Now we have the exact character positions and line numbers of all top-level statements!
  const statements = ast.body.map(s => {
    // find line number
    const line = content.slice(0, s.start).split('\n').length;
    const endLine = content.slice(0, s.end).split('\n').length;
    return { type: s.type, startLine: line, endLine };
  });

  console.log('Sample statements:', statements.slice(0, 10));

  // Now we can group statements into chunks where chunk length <= 480 lines!
  const chunks = [];
  let currentStart = 1;
  let currentEnd = 1;

  for (let i = 0; i < statements.length; i++) {
    const s = statements[i];
    if (s.endLine - currentStart > 450) {
      // close previous chunk at statements[i-1].endLine
      if (i > 0) {
        chunks.push({ start: currentStart, end: statements[i - 1].endLine });
        currentStart = statements[i].startLine;
      }
    }
    currentEnd = s.endLine;
  }
  chunks.push({ start: currentStart, end: lines.length });

  console.log(`Grouped into ${chunks.length} clean AST-boundary chunks!`);
  let maxChunk = 0;
  chunks.forEach((c, idx) => {
    const size = c.end - c.start + 1;
    if (size > maxChunk) maxChunk = size;
    console.log(`Chunk ${idx + 1}: lines ${c.start} to ${c.end} (${size} LOC)`);
  });
  console.log('Max chunk size:', maxChunk);

} catch (err) {
  console.error('Acorn parse error or not found:', err.message);
}
