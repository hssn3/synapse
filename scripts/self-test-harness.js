/**
 * Enterprise Self-Test Harness
 * Orchestrates and executes all verification test suites:
 * 1. NIST RBAC / ABAC Matrix Suite
 * 2. Enterprise Schema-Driven Form Engine Suite
 * 3. AI Assistant Guardrails & Persona Suite
 * 4. Assistant Offline Retrieval Eval (21 Claims)
 * 5. Assistant Response & Role Boundary Eval (10 Claims)
 * 6. System Smoke Test (6 Health Probes)
 */
const { execSync } = require('child_process');

console.log('================================================================');
console.log('🚀 RUNNING ENTERPRISE SWARM VERIFICATION & SELF-TEST HARNESS');
console.log('================================================================\n');

const SUITES = [
  { name: '1. RBAC / ABAC NIST Matrix Test', cmd: 'node --test tests/rbac-matrix.test.js' },
  { name: '2. Enterprise Form Engine Test', cmd: 'node --test tests/form-engine.test.js' },
  { name: '3. AI Assistant Guardrails Test', cmd: 'node --test tests/assistant-guardrails.test.js' },
  { name: '4. Assistant Retrieval Eval (21 Claims)', cmd: 'node tests/assistant-retrieval-eval.js' },
  { name: '5. Assistant Response Eval (10 Claims)', cmd: 'node tests/assistant-response-eval.js' },
  { name: '6. Server Smoke Health Check (6 Probes)', cmd: 'node scripts/smoke-test.js' }
];

let allPassed = true;
const results = [];

for (const suite of SUITES) {
  process.stdout.write(`⏳ Running [${suite.name}]... `);
  const start = Date.now();
  try {
    const output = execSync(suite.cmd, { stdio: 'pipe', encoding: 'utf8' });
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✅ PASSED (${duration}s)`);
    results.push({ name: suite.name, status: 'PASSED', duration: `${duration}s` });
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`❌ FAILED (${duration}s)`);
    console.error(err.stdout || err.stderr || err.message);
    results.push({ name: suite.name, status: 'FAILED', duration: `${duration}s` });
    allPassed = false;
  }
}

console.log('\n================================================================');
console.log('📊 HARNESS EXECUTION SUMMARY MATRIX:');
console.log('================================================================');
console.table(results);

if (allPassed) {
  console.log('\n🎉 ALL ENTERPRISE TEST SUITES GREEN! ZERO DEFECTS DETECTED.\n');
  process.exit(0);
} else {
  console.error('\n💥 HARNESS DETECTED FAILURES. REVIEW LOGS ABOVE.\n');
  process.exit(1);
}
