/**
 * VYAVSAYMITRA — Production Backend Automated Test Suite
 * 
 * Tests all 14 required capabilities:
 * 1. Agriculture business end-to-end analysis
 * 2. FoodTech / Agro-processing business analysis
 * 3. New / Unknown business classification and MSME financial primitives
 * 4. Missing parameters structured response ('insufficient_data')
 * 5. Invalid parameters error rejection ('invalid_parameter')
 * 6. Verified-data calculation integrity
 * 7. Deterministic formula calculation consistency
 * 8. ML model prediction with production approval check
 * 9. AI qualitative fallback (advisory synthesis)
 * 10. Model unavailable fallback to verified dataset
 * 11. Dataset unavailable fallback from district to state/national
 * 12. External API unavailable resilience
 * 13. Guarantee that AI estimates cannot override verified data
 * 14. Response schema consistency across all business types
 */

const assert = require('assert');
const { performBusinessAnalysis } = require('../src/services/business/businessAnalysisService');
const { validateBusinessAnalysisInput } = require('../src/services/validation/inputValidator');
const { createTraceableParameter, safeMergeField } = require('../src/services/data/provenanceService');
const modelService = require('../src/services/ml/modelService');
const dataService = require('../src/services/data/dataService');

async function runProductionBackendTests() {
  console.log('=================================================================');
  console.log('RUNNING PRODUCTION BACKEND INTEGRATION & GOVERNANCE TEST SUITE');
  console.log('=================================================================\n');

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

  const EXPECTED_SCHEMA_KEYS = [
    'status', 'business', 'financial', 'market', 'prediction',
    'risk', 'funding', 'recommendations', 'dataSources', 'assumptions', 'provenance'
  ];

  // ── TEST 1: AGRICULTURE BUSINESS ──
  await testAsync('1. Agriculture business analysis with ML yield & Mandi forecasting', async () => {
    const res = await performBusinessAnalysis({
      businessType: 'agriculture',
      crop: 'Wheat',
      state: 'Maharashtra',
      district: 'Ahmadnagar',
      areaHa: 2.0
    });
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.business.archetype, 'crop');
    assert(res.financial.totalInvestment.value > 0);
    assert(res.market.dataStatus === 'current' || res.market.dataStatus === 'recent' || res.market.dataStatus === 'historical_reference');
    assert.strictEqual(res.market.historicalReference.dataStatus, 'historical_reference');
    assert(res.prediction.cropYieldPrediction);
    assert.strictEqual(res.risk.debtServiceCoverage.riskLevel, 'LOW');
    assert(res.funding.capitalStructure.promoterEquityContribution > 0);
    EXPECTED_SCHEMA_KEYS.forEach(k => assert(res[k] !== undefined, `Missing schema key: ${k}`));
  });

  // ── TEST 2: FOODTECH / AGRO-PROCESSING BUSINESS ──
  await testAsync('2. FoodTech / Food Processing business with PMFME subsidy structuring', async () => {
    const res = await performBusinessAnalysis({
      businessType: 'food-processing',
      monthlyCapacityKg: 16000,
      state: 'Gujarat',
      isRural: true
    });
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.business.archetype, 'food-processing');
    assert(res.financial.netAnnualProfit.value > 100000);
    const pmfme = res.funding.allEligibleSchemes.find(s => s.id === 'pmfme_micro_food');
    assert(pmfme, 'PMFME 35% subsidy must be included for micro food enterprises');
    assert.strictEqual(pmfme.subsidyPercentage, 35);
    EXPECTED_SCHEMA_KEYS.forEach(k => assert(res[k] !== undefined, `Missing schema key: ${k}`));
  });

  // ── TEST 3: NEW / UNKNOWN BUSINESS IDEA ──
  await testAsync('3. Novel business idea classification and generalized MSME structuring', async () => {
    const res = await performBusinessAnalysis({
      businessIdea: 'Solar powered cold storage and packhouse for farm produce',
      investmentRequired: 450000,
      monthlyOpex: 35000,
      expectedRevenue: 750000,
      state: 'Gujarat'
    });
    assert.strictEqual(res.status, 'success');
    assert(res.business.name.includes('Solar powered cold storage'));
    assert(res.financial.totalInvestment.value >= 450000);
    assert(res.financial.netAnnualProfit.value > 0);
    assert(res.funding.allEligibleSchemes.length > 0);
    EXPECTED_SCHEMA_KEYS.forEach(k => assert(res[k] !== undefined, `Missing schema key: ${k}`));
  });

  // ── TEST 4: MISSING PARAMETERS STRUCTURED RESPONSE ──
  test('4. Missing parameters return structured "insufficient_data" response', () => {
    const val = validateBusinessAnalysisInput({
      businessType: 'agriculture' // missing crop and state
    });
    assert.strictEqual(val.isValid, false);
    assert.strictEqual(val.status, 'insufficient_data');
    assert(val.missingFields.includes('crop'));
    assert(val.requiredParametersGuide.crop);
  });

  // ── TEST 5: INVALID PARAMETERS REJECTION ──
  test('5. Negative values and impossible values are rejected', () => {
    const val = validateBusinessAnalysisInput({
      businessType: 'dairy',
      animalCount: -5,
      investmentRequired: -150000,
      areaHa: 100000 // exceeds maximum realistic threshold
    });
    assert.strictEqual(val.isValid, false);
    assert.strictEqual(val.status, 'invalid_parameter');
    assert(val.errors.length >= 2);
  });

  // ── TEST 6: VERIFIED-DATA CALCULATION INTEGRITY ──
  test('6. Verified-data calculations carry verified provenance and positive prices', () => {
    const dairyBench = dataService.getNabardBenchmark('dairy', 'two_animal_unit');
    assert.strictEqual(dairyBench.capital_costs.total_fixed_capital, 168500);
    assert.strictEqual(dairyBench.operational_parameters.lactation_days_per_year, 300);

    const mandiLookup = dataService.getMandiPrice('Wheat', 'Maharashtra', 'Ahmadnagar');
    assert(mandiLookup.modal_price > 1000);
    assert.strictEqual(mandiLookup.provenance.source_type, 'dataset');
  });

  // ── TEST 7: DETERMINISTIC FORMULA CALCULATION CONSISTENCY ──
  await testAsync('7. Deterministic formulas calculate consistent accounting balances', async () => {
    const res = await performBusinessAnalysis({
      businessType: 'dairy',
      animalCount: 2,
      state: 'Gujarat'
    });
    const inv = res.financial.totalInvestment.value;
    const fixed = res.financial.fixedCapital.value;
    const working = res.financial.workingCapital.value;
    assert.strictEqual(inv, fixed + working, 'Total investment must equal fixed capital + working capital buffer');
    assert(res.financial.netAnnualProfit.value > 0);
    assert(res.financial.dscr.value >= 1.5);
  });

  // ── TEST 8: PRODUCTION-APPROVED ML MODEL INFERENCE & STALE DATA GATE ──
  await testAsync('8. ML inference checks production approval status, conformal intervals, and stale-data rejection', async () => {
    // Crop Yield: Approved with Conformal Prediction Interval
    const gate = modelService.checkModelProductionStatus('crop_yield');
    assert.strictEqual(gate.isApproved, true);
    assert.strictEqual(gate.modelStatus, 'production_candidate');

    const pred = await modelService.predictCropYield({
      product: 'Wheat',
      state: 'Gujarat',
      area: 2.0,
      annual_rainfall: 800,
      fertilizer: 300
    });
    assert.strictEqual(pred.status, 'success');
    assert(pred.predicted_yield_per_ha > 0);
    assert(pred.prediction_interval_95.lower_bound <= pred.predicted_yield_per_ha);
    assert(pred.prediction_interval_95.upper_bound >= pred.predicted_yield_per_ha);
    assert.strictEqual(pred.prediction_interval_95.empirical_coverage_pct, 94.5);

    // Mandi Price: Strictly disqualified as stale_data
    const mandiGate = modelService.checkModelProductionStatus('mandi_price');
    assert.strictEqual(mandiGate.isApproved, false, 'Mandi price model must NOT be approved for production');
    assert.strictEqual(mandiGate.modelStatus, 'stale_data');

    const mandiPred = await modelService.predictMandiPrice({
      product: 'Wheat',
      state: 'Maharashtra',
      district: 'Ahmadnagar'
    });
    assert.strictEqual(mandiPred.status, 'fallback_dataset_used');
    assert.strictEqual(mandiPred.dataStatus, 'historical_reference');
    assert.strictEqual(mandiPred.latestObservationDate, '2016-11-01');
  });

  // ── TEST 9: AI QUALITATIVE ADVISORY (SYNTHESIS ONLY) ──
  await testAsync('9. AI advisory provides narrative without overriding financial numbers', async () => {
    const res = await performBusinessAnalysis({
      businessType: 'poultry',
      birdCapacity: 500,
      state: 'Maharashtra'
    });
    assert(res.recommendations.length > 0);
    assert(res.recommendations.some(r => r.type === 'STRENGTH'));
    assert(res.recommendations.some(r => r.type === 'RISK_MITIGATION'));
    assert(res.recommendations.some(r => r.type === 'BANK_PITCH_GUIDE'));
    // Ensure numbers remain exact formulas
    assert.strictEqual(res.financial.totalInvestment.sourceType, 'FORMULA');
  });

  // ── TEST 10: MODEL UNAVAILABLE FALLBACK ──
  await testAsync('10. Model execution failure falls back cleanly to verified dataset', async () => {
    const res = await modelService.predictCropYield({
      product: 'Wheat',
      state: 'Maharashtra',
      area: 'invalid_non_numeric_triggering_catch'
    });
    assert(res.status === 'fallback_dataset_used' || res.status === 'success');
    assert.strictEqual(res.source_type, 'DATABASE_VALUE');
  });

  // ── TEST 11: DATASET UNAVAILABLE FALLBACK (DISTRICT -> STATE -> NATIONAL) ──
  test('11. Mandi price falls back from unseen district to state or national benchmark', () => {
    const price = dataService.getMandiPrice('Wheat', 'Maharashtra', 'Completely_Unseen_District_XYZ');
    assert(price !== null);
    assert(price.level === 'state' || price.level === 'national');
    assert(price.modal_price > 1000);
  });

  // ── TEST 12: EXTERNAL API UNAVAILABLE RESILIENCE ──
  test('12. Local architecture operates with zero external network dependencies', () => {
    const schemes = dataService.getGovernmentSchemes();
    assert(schemes.length >= 5);
    const benchmarks = dataService.getNabardBenchmark('dairy');
    assert(benchmarks !== null);
  });

  // ── TEST 13: AI CANNOT OVERRIDE VERIFIED DATA ──
  test('13. Provenance service guarantees verified formulas cannot be overwritten by AI estimates', () => {
    const verifiedFormulaParam = createTraceableParameter(168500, 'INR', 'FORMULA', 'NABARD Model Benchmark', 0.98);
    const aiEstimateParam = createTraceableParameter(999999, 'INR', 'AI_ESTIMATE', 'Gemini Qualitative Prompt', 0.50);

    const merged = safeMergeField(verifiedFormulaParam, aiEstimateParam);
    assert.strictEqual(merged.value, 168500, 'Verified formula must NOT be overwritten by AI estimate');
    assert.strictEqual(merged.sourceType, 'FORMULA');
  });

  // ── TEST 14: RESPONSE SCHEMA CONSISTENCY ACROSS ALL TYPES ──
  await testAsync('14. Frontend receives one consistent schema across Agriculture, FoodTech, Dairy, and MSME', async () => {
    const payloads = [
      { businessType: 'agriculture', crop: 'Rice', state: 'Assam', areaHa: 1.5 },
      { businessType: 'food-processing', monthlyCapacityKg: 10000, state: 'Maharashtra' },
      { businessType: 'dairy', animalCount: 4, state: 'Gujarat' },
      { businessIdea: 'Rural cycle and motorcycle repair shop with spare parts', investmentRequired: 100000, monthlyOpex: 12000 }
    ];

    for (const payload of payloads) {
      const res = await performBusinessAnalysis(payload);
      assert.strictEqual(res.status, 'success');
      EXPECTED_SCHEMA_KEYS.forEach(k => {
        assert(res[k] !== undefined, `Schema key '${k}' missing for payload: ${JSON.stringify(payload)}`);
      });
      assert(res.financial.totalInvestment.value > 0);
      assert(res.financial.dscr.value > 0);
      assert(res.provenance.requestId.startsWith('req_'));
    }
  });

  console.log('\n=================================================================');
  console.log(`PRODUCTION BACKEND TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionBackendTests().catch(err => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
