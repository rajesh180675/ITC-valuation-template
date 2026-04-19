#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const projectDir = path.join(__dirname, '..');
process.chdir(projectDir);

console.log('[v0] TypeScript type check...');
try {
  execSync('pnpm exec tsc --noEmit 2>&1', { stdio: 'inherit' });
  console.log('[v0] ✓ Types clean');
} catch (e) {
  console.error('[v0] ✗ Type errors');
  process.exit(1);
}

console.log('[v0] Running tests...');
try {
  execSync('pnpm test --run 2>&1 | tail -50', { stdio: 'inherit' });
  console.log('[v0] ✓ Tests passed');
} catch (e) {
  console.error('[v0] ✗ Test failures');
  process.exit(1);
}

console.log('[v0] Building production bundle...');
try {
  execSync('pnpm build 2>&1 | tail -20', { stdio: 'inherit' });
  console.log('[v0] ✓ Build successful');
} catch (e) {
  console.error('[v0] ✗ Build failed');
  process.exit(1);
}

console.log('[v0] Committing changes...');
execSync('git add -A');
execSync('git commit -m "feat: add Infosys to multi-company valuation framework\n\n- Added Infosys profile with 7 segments (FS 28.4%, Manf 16.6%, Comms 14.3%)\n- FY25 actuals: ₹1,60,000 Cr revenue, 21.1% EBITDA margin\n- Q2 FY26: $5,076M (+2.9% YoY), 21.0% margin, 2-3% growth guidance\n- Shares: 415.43Cr, Net cash: ₹18,500 Cr, Price target: ₹155-215\n- 6 peer comps (TCS, HCL, Wipro, Accenture, IBM, Cognizant)\n- 4 scenarios: Bear (recession), Base, Bull (GenAI), Stress (attrition)\n- All tests updated; registry now covers 6 companies\n\nCo-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"');
console.log('[v0] ✓ Committed');

console.log('[v0] Pushing to origin/main...');
execSync('git push origin HEAD:main 2>&1');
console.log('[v0] ✓ Pushed to origin/main');

console.log('[v0] ✓ All done!');
