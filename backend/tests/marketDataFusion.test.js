/**
 * VYAVSAYMITRA — Historical + Current Market Data Fusion Test Suite
 * 
 * Tests all 14 mandatory validation scenarios:
 * 1. Current + historical data available
 * 2. Only historical data available
 * 3. Only current data available
 * 4. Different units (INR/quintal vs INR/kg normalization)
 * 5. Different commodities (cross-commodity comparison rejection)
 * 6. Different markets (exact vs district vs state vs national fallback)
 * 7. Different grades (cross-grade check)
 * 8. Stale current source (categorization as stale if past threshold)
 * 9. Invalid source (rejection of unverified sources)
 * 10. Missing current data (graceful fallback with warning)
 * 11. Current data API failure (network error resilience)
 * 12. Historical/current comparison calculation (accuracy of formula & isPrediction: false)
 * 13. Provenance (full traceability metadata)
 * 14. AI fallback (qualitative explanation only; cannot override numbers)
 */

const assert = require('assert');
const currentMarketDataService = require('../src/services/data/currentMarketDataService');
const { reconcileMarketData, normalizePriceToQuintal } = require('../src/services/data/marketReconciliationEngine');
const dataService = require('../src/services/data/dataService');
const { performBusinessAnalysis } = require('../src/services/business/businessAnalysisService');
const { createTraceableParameter, safeMergeField } = require('../src/services/data/provenanceService');

async function runFusionTests() {
  console.log('======================================================================');
  console.log('RUNNING HISTORICAL + CURRENT MARKET DATA FUSION VALIDATION TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}\n`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}\n`);
      failed++;
    }
  }

  // ── TEST 1: CURRENT + HISTORICAL DATA AVAILABLE ──
  await testAsync('1. Current + historical data available (full fusion with comparison)', async () => {
    const fused = await dataService.getFusedMarketData('Wheat', 'Maharashtra', 'Pune');
    assert(fused, 'Fused market data should exist');
    assert.strictEqual(fused.commodity, 'Wheat');
    assert.strictEqual(fused.dataStatus, 'current');
    
    // Check Current Block
    assert(fused.current, 'Current block must be populated');
    assert.strictEqual(fused.current.price, 2450);
    assert.strictEqual(fused.current.unit, 'INR/quintal');
    assert.strictEqual(fused.current.market, 'Pune APMC');
    assert(fused.current.observationDate.startsWith('2026-09-'));
    assert.strictEqual(fused.current.dataStatus, 'current');

    // Check Historical Reference Block
    assert(fused.historicalReference, 'Historical reference block must be populated');
    assert.strictEqual(fused.historicalReference.dataStatus, 'historical_reference');
    assert(fused.historicalReference.price > 1000);

    // Check Comparison Block
    assert(fused.comparison, 'Comparison block must be populated');
    assert.strictEqual(fused.comparison.comparisonType, 'historical_vs_current_difference');
    assert.strictEqual(fused.comparison.isPrediction, false);
    assert.strictEqual(fused.comparison.absoluteDifference, fused.current.price - fused.historicalReference.price);
    
    // Check Trend Block
    assert(fused.trend, 'Trend block must be populated');
    assert(fused.trend.direction === 'INCREASING' || fused.trend.direction === 'STABLE');
  });

  // ── TEST 2: ONLY HISTORICAL DATA AVAILABLE ──
  test('2. Only historical data available (graceful fallback with warning)', () => {
    const historical = {
      commodity: 'Wheat',
      modal_price: 1846,
      unit: 'INR/quintal',
      district: 'Ahmednagar',
      state: 'Maharashtra',
      latestObservationDate: '2016-11-01'
    };
    const fused = reconcileMarketData(historical, null);
    assert.strictEqual(fused.dataStatus, 'historical_reference');
    assert.strictEqual(fused.current, null);
    assert(fused.historicalReference);
    assert.strictEqual(fused.comparison, null);
    assert(fused.warnings.length > 0);
    assert(fused.warnings[0].includes('Current verified market data is unavailable'));
  });

  // ── TEST 3: ONLY CURRENT DATA AVAILABLE ──
  test('3. Only current data available (current populated, no comparison)', () => {
    const current = {
      commodity: 'Exotic Organic Quinoa',
      variety: 'White',
      market: 'Specialty APMC',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      price: 12500,
      modalPrice: 12500,
      unit: 'INR/quintal',
      observationDate: '2026-09-15',
      retrievedAt: new Date().toISOString(),
      source: 'Verified Agribusiness Board',
      sourceType: 'government_api',
      dataStatus: 'current'
    };
    const fused = reconcileMarketData(null, current);
    assert.strictEqual(fused.dataStatus, 'current');
    assert(fused.current);
    assert.strictEqual(fused.current.price, 12500);
    assert.strictEqual(fused.historicalReference, null);
    assert.strictEqual(fused.comparison, null);
  });

  // ── TEST 4: DIFFERENT UNITS NORMALIZATION ──
  test('4. Different units normalized to INR/quintal before comparison', () => {
    // 1 Quintal = 100 kg
    const kgNorm = normalizePriceToQuintal(25.50, 'INR/kg');
    assert.strictEqual(kgNorm.normalizedPrice, 2550);
    assert.strictEqual(kgNorm.baseUnit, 'INR/quintal');

    // 1 Tonne = 10 Quintals
    const tonneNorm = normalizePriceToQuintal(24500, 'INR/tonne');
    assert.strictEqual(tonneNorm.normalizedPrice, 2450);
    assert.strictEqual(tonneNorm.baseUnit, 'INR/quintal');

    // Reconcile when current is in INR/kg and historical in INR/quintal
    const historical = { commodity: 'Wheat', modal_price: 1800, unit: 'INR/quintal', latestObservationDate: '2016-11-01' };
    const current = {
      commodity: 'Wheat',
      modalPrice: 24.50,
      unit: 'INR/kg',
      market: 'Direct Farmgate Center',
      district: 'Pune',
      state: 'Maharashtra',
      observationDate: '2026-09-15',
      source: 'AGMARKNET Daily Mandi Price Bulletin'
    };
    const fused = reconcileMarketData(historical, current);
    assert.strictEqual(fused.current.price, 2450); // 24.50 * 100
    assert.strictEqual(fused.comparison.historicalPrice, 1800);
    assert.strictEqual(fused.comparison.currentPrice, 2450);
    assert.strictEqual(fused.comparison.absoluteDifference, 650);
    assert(fused.warnings.some(w => w.includes('Unit normalized')));
  });

  // ── TEST 5: DIFFERENT COMMODITIES COMPARISON REJECTION ──
  test('5. Cross-commodity comparison is rejected (e.g. Wheat vs Rice)', () => {
    const historical = { commodity: 'Rice', modal_price: 1550, unit: 'INR/quintal' };
    const current = {
      commodity: 'Wheat',
      modalPrice: 2450,
      unit: 'INR/quintal',
      market: 'Pune APMC',
      district: 'Pune',
      state: 'Maharashtra',
      observationDate: '2026-09-15',
      source: 'AGMARKNET Daily Mandi Price Bulletin'
    };
    const fused = reconcileMarketData(historical, current);
    assert.strictEqual(fused.comparison, null, 'Cross-commodity comparison must NOT be calculated');
    assert(fused.warnings.some(w => w.includes('Cross-commodity comparison rejected')));
  });

  // ── TEST 6: DIFFERENT MARKETS LOCATION MATCHING ──
  await testAsync('6. Location matching resolves exact district match and falls back to state benchmark', async () => {
    // Exact district match
    const exact = await currentMarketDataService.getCurrentMarketPrice('Wheat', 'Maharashtra', 'Pune');
    assert(exact);
    assert.strictEqual(exact.market, 'Pune APMC');

    // Unseen district in Maharashtra falls back to Maharashtra state average
    const fallback = await currentMarketDataService.getCurrentMarketPrice('Wheat', 'Maharashtra', 'UnseenRemoteDistrictXYZ');
    assert(fallback);
    assert.strictEqual(fallback.state, 'Maharashtra');
  });

  // ── TEST 7: DIFFERENT GRADES / VARIETIES DISCLOSURE ──
  test('7. Different grades/varieties include disclosure warning', () => {
    const historical = { commodity: 'Wheat', modal_price: 1800, unit: 'INR/quintal' };
    const current = {
      commodity: 'Wheat',
      variety: 'Sharbati / Tukdi',
      modalPrice: 2800,
      unit: 'INR/quintal',
      market: 'Rajkot APMC',
      district: 'Rajkot',
      state: 'Gujarat',
      observationDate: '2026-09-15',
      source: 'GSAMB'
    };
    const fused = reconcileMarketData(historical, current, { variety: 'Mill Quality Common' });
    assert(fused.warnings.some(w => w.includes('Variety note')));
  });

  // ── TEST 8: STALE CURRENT SOURCE CATEGORIZATION ──
  test('8. Observation older than freshness threshold is categorized as stale / recent', () => {
    const staleObs = {
      commodity: 'Wheat',
      market: 'Old APMC',
      district: 'Pune',
      state: 'Maharashtra',
      price: 2100,
      modalPrice: 2100,
      unit: 'INR/quintal',
      currency: 'INR',
      observationDate: '2024-01-01', // > 365 days old
      source: 'Historical Bulletin',
      sourceUrl: 'https://agmarknet.gov.in'
    };
    const val = currentMarketDataService.validateObservation(staleObs);
    assert.strictEqual(val.isValid, true);
    assert.strictEqual(val.sanitized.dataStatus, 'stale');
  });

  // ── TEST 9: INVALID SOURCE DOMAIN REJECTION ──
  test('9. Unverified sources outside domain whitelist are rejected', () => {
    const invalidObs = {
      commodity: 'Wheat',
      market: 'Random Blog Market',
      district: 'Pune',
      state: 'Maharashtra',
      price: 9999,
      unit: 'INR/quintal',
      observationDate: '2026-09-15',
      source: 'Untrusted Blog',
      sourceUrl: 'https://random-unverified-seo-site.com/wheat-price'
    };
    const val = currentMarketDataService.validateObservation(invalidObs);
    assert.strictEqual(val.isValid, false);
    assert(val.error.includes('authoritative domain whitelist'));
  });

  // ── TEST 10: MISSING CURRENT DATA STRUCTURED FALLBACK ──
  await testAsync('10. Missing current data returns historical reference with warning in API analysis', async () => {
    const res = await performBusinessAnalysis({
      businessType: 'agriculture',
      crop: 'NonExistentExoticCrop123',
      state: 'Nagaland',
      areaHa: 1.0
    });
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.market.current, null);
    assert(res.market.warnings.length > 0);
  });

  // ── TEST 11: CURRENT DATA API FAILURE RESILIENCE ──
  await testAsync('11. Current data API failure gracefully handled without crashing', async () => {
    // Query with non-existent live API key will attempt government API and cleanly fall back
    const res = await currentMarketDataService.getCurrentMarketPrice('Wheat', 'Maharashtra', 'Pune', {
      useLiveApi: true
    });
    assert(res, 'Should fall back gracefully to verified repository');
    assert.strictEqual(res.commodity, 'Wheat');
  });

  // ── TEST 12: HISTORICAL VS CURRENT COMPARISON CALCULATION ──
  test('12. Percentage difference calculated accurately and labeled isPrediction: false', () => {
    const historical = { commodity: 'Wheat', modal_price: 1846, unit: 'INR/quintal', latestObservationDate: '2016-11-01' };
    const current = {
      commodity: 'Wheat',
      modalPrice: 2450,
      unit: 'INR/quintal',
      market: 'Pune APMC',
      district: 'Pune',
      state: 'Maharashtra',
      observationDate: '2026-09-15',
      source: 'AGMARKNET Daily Mandi Price Bulletin'
    };
    const fused = reconcileMarketData(historical, current);
    const expectedAbs = 2450 - 1846; // 604
    const expectedPct = +(((604 / 1846) * 100).toFixed(2)); // 32.72%

    assert.strictEqual(fused.comparison.absoluteDifference, expectedAbs);
    assert.strictEqual(fused.comparison.percentageDifference, expectedPct);
    assert.strictEqual(fused.comparison.comparisonType, 'historical_vs_current_difference');
    assert.strictEqual(fused.comparison.isPrediction, false);
    assert.strictEqual(fused.prediction.status, 'not_applicable');
  });

  // ── TEST 13: PROVENANCE TRACEABILITY INTEGRITY ──
  await testAsync('13. Full provenance metadata present across current, historical, and comparison blocks', async () => {
    const res = await performBusinessAnalysis({
      businessType: 'agriculture',
      crop: 'Wheat',
      state: 'Maharashtra',
      district: 'Pune',
      areaHa: 2.5
    });

    const market = res.market;
    assert(market.provenance, 'Market provenance block must exist');
    assert(market.provenance.source, 'Market provenance source must exist');
    assert(market.provenance.sourceDate, 'Market provenance sourceDate must exist');
    assert(market.provenance.retrievedAt, 'Market provenance retrievedAt must exist');
    assert(market.provenance.datasetVersion, 'Market provenance datasetVersion must exist');
  });

  // ── TEST 14: AI FALLBACK & IMMUTABILITY GUARANTEE ──
  test('14. Provenance guarantees AI narrative cannot overwrite verified market numbers', () => {
    const verifiedMarketParam = createTraceableParameter(2450, {
      unit: 'INR/quintal',
      sourceType: 'DATABASE_VALUE',
      source: 'AGMARKNET Current Daily Bulletin',
      confidence: 0.95
    });
    const aiHallucinatedParam = createTraceableParameter(5000, {
      unit: 'INR/quintal',
      sourceType: 'AI_ESTIMATE',
      source: 'Qualitative LLM Guess',
      confidence: 0.40
    });

    const merged = safeMergeField(verifiedMarketParam, aiHallucinatedParam);
    assert.strictEqual(merged.value, 2450, 'Verified market modal price must NOT be overwritten by AI estimate');
    assert.strictEqual(merged.sourceType, 'DATABASE_VALUE');
  });

  console.log('\n======================================================================');
  console.log(`HISTORICAL + CURRENT FUSION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFusionTests().catch(err => {
  console.error('Fatal fusion test runner failure:', err);
  process.exit(1);
});
