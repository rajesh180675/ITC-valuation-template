const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'public', 'data');
const SCRIPTS = path.join(__dirname, 'scripts');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch(e) { return null; }
}

// 1. nifty750_real.json
const n750 = readJSON(path.join(DATA, 'nifty750_real.json'));
if (n750) {
  console.log('=== NIFTY750_REAL.JSON ===');
  console.log('schemaVersion:', n750.schemaVersion);
  console.log('batches:', n750.batches?.length);
  let total750 = 0;
  n750.batches?.forEach(b => {
    total750 += b.companies?.length || 0;
    console.log('  ', b.indexSlug, b.companies?.length, 'cos', '(hasFinancials:', b.companies?.[0]?.history?.length > 0 ? 'yes' : 'no', ')');
  });
  console.log('total companies:', total750);
  console.log('fiscalYears:', n750.fiscalYears?.length, n750.fiscalYears);
}

// 2. nifty250_real.json
const n250 = readJSON(path.join(DATA, 'nifty250_real.json'));
if (n250) {
  console.log('\n=== NIFTY250_REAL.JSON ===');
  console.log('schemaVersion:', n250.schemaVersion);
  console.log('constituents:', n250.constituents?.length);
  console.log('fiscalYears:', n250.fiscalYears?.length, n250.fiscalYears);
  console.log('With BS (totalAssetsCr):', n250.constituents?.filter(c => c.history?.[0]?.totalAssetsCr)?.length);
  console.log('With ROCE (rocePct):', n250.constituents?.filter(c => c.history?.[0]?.rocePct !== undefined)?.length);
}

// 3. nifty_750_10y.json
const n750_10y = readJSON(path.join(DATA, 'nifty_750_10y.json'));
if (n750_10y) {
  console.log('\n=== NIFTY_750_10Y.JSON ===');
  console.log('schemaVersion:', n750_10y.schemaVersion);
  console.log('batches:', n750_10y.batches?.length);
  let total10y = 0;
  n750_10y.batches?.forEach(b => {
    total10y += b.companies?.length || 0;
    const first = b.companies?.[0];
    console.log('  ', b.indexSlug, b.companies?.length, 'cos', 'financialLength:', first?.history?.length, 'hasBS:', first?.history?.[0]?.totalAssetsCr === undefined ? 'no' : 'yes');
  });
  console.log('total companies:', total10y);
  console.log('fiscalYears:', n750_10y.fiscalYears?.length);
}

// 4. Overlap analysis
const t250 = new Set((n250?.constituents || []).map(c => c.id));
const t750 = new Set();
for (const b of (n750?.batches || [])) {
  for (const c of (b.companies || [])) t750.add(c.id);
}
const t10y = new Set();
for (const b of (n750_10y?.batches || [])) {
  for (const c of (b.companies || [])) t10y.add(c.id);
}
const overlap2575 = [...t250].filter(t => t750.has(t));
const only250 = [...t250].filter(t => !t750.has(t));
const only750 = [...t750].filter(t => !t250.has(t));
console.log('\n=== OVERLAP ===');
console.log('In 250:', t250.size);
console.log('In 750 (real):', t750.size);
console.log('In 750_10y:', t10y.size);
console.log('Overlap 250∩750:', overlap2575.length);
console.log('Only in 250:', only250.length, only250.join(','));
console.log('Only in 750:', only750.length);

// 5. Check source-pack constituents for the full universe
const sp750 = readJSON(path.join(SCRIPTS, 'nifty750', 'source-pack', 'constituents.json'));
if (sp750?.batches) {
  console.log('\n=== NSE SOURCE PACK (official) ===');
  let spTotal = 0;
  sp750.batches.forEach(b => {
    spTotal += b.companies?.length || 0;
    console.log('  ', b.indexSlug, b.companies?.length, 'companies');
  });
  console.log('Total in source pack:', spTotal);
  
  // Check what's missing from nifty750_real.json
  const spTickers = new Set();
  sp750.batches.forEach(b => b.companies?.forEach(c => spTickers.add(c.symbol || c.id)));
  const missing = [...spTickers].filter(t => !t750.has(t));
  console.log('Source pack has', spTickers.size, 'tickers');
  console.log('Missing from nifty750_real.json:', missing.length);
  if (missing.length <= 20) console.log('Missing:', missing.join(', '));
}

// 6. Check AR coverage
const arIndex = readJSON(path.join(DATA, 'ar', 'company_index.json'));
if (arIndex) {
  console.log('\n=== AR COVERAGE ===');
  console.log('Total companies in index:', arIndex.companies?.length);
  const withAr = arIndex.companies?.filter(c => c.hasAr)?.length || 0;
  console.log('Have AR data:', withAr);
}

// 7. Check Screener scraper output count
const arFiles = fs.readdirSync(path.join(DATA, 'ar')).filter(f => f.endsWith('.json') && f !== 'company_index.json');
console.log('\n=== AR FILES ===');
console.log('AR JSON files in public/data/ar/:', arFiles.length);
console.log('Sample:', arFiles.slice(0, 10).join(', '));
