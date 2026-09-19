/**
 * VYAVSAYMITRA — Comprehensive Business Advisory & Data Pipeline Test Suite
 * 
 * Verifies domain engines (Dairy, Poultry, Crop, Agro-Processing),
 * Classifier for novel business ideas, ML inference, and Data Service queries.
 */

const assert = require('assert');
const dataService = require('../services/data/dataService');
const { calculateDairyEconomics } = require('../services/business/dairyEngine');
const { calculatePoultryEconomics } = require('../services/business/poultryEngine');
const { calculateCropEconomics } = require('../services/business/cropEngine');
const { calculateFoodProcessingEconomics } = require('../services/business/foodProcessingEngine');
const { classifyBusinessIdea } = require('../services/business/classifier');
const { analyzeBusiness } = require('../services/calculations/calculationEngine');
const modelService = require('../services/ml/modelService');

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING VYAVSAYMITRA DATA & BUSINESS TEST SUITE');
  console.log('====================================================\n');

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

  // ─── 1. Data Service Tests ─────────────────────────────────────────
  console.log('[1] Testing Data Service & Reference Lookups...');

  test('DataService loads NABARD benchmarks', () => {
    const dairyBench = dataService.getNabardBenchmark('dairy', 'two_animal_unit');
    assert(dairyBench, 'Dairy benchmark should exist');
    assert.strictEqual(dairyBench.capital_costs.total_fixed_capital, 168500);
    assert.strictEqual(dairyBench.operational_parameters.avg_milk_yield_litres_per_day, 12.5);
  });

  test('DataService queries Mandi Prices for Wheat in Maharashtra', () => {
    const mandiPrice = dataService.getMandiPrice('wheat', 'Maharashtra', 'Ahmadnagar');
    assert(mandiPrice, 'Mandi price should be returned');
    assert(mandiPrice.modal_price > 1000, 'Modal price should be realistic');
    assert.strictEqual(mandiPrice.provenance.source_type, 'dataset');
    assert.strictEqual(mandiPrice.provenance.dataset, 'validated_mandi_prices.csv');
  });

  test('DataService queries Crop Yield for Rice in Assam', () => {
    const yieldData = dataService.getCropYield('rice', 'Assam');
    assert(yieldData, 'Yield data should exist');
    assert(yieldData.avg_yield_tonnes_per_ha > 0.5, 'Yield should be positive');
    assert.strictEqual(yieldData.provenance.dataset, 'validated_crop_yield.csv');
  });

  test('DataService queries Cost of Cultivation for Cotton', () => {
    const costData = dataService.getCropCostOfCultivation('Cotton');
    assert(costData, 'Cost of cultivation should exist');
    assert.strictEqual(costData.cost_per_hectare, 28286);
  });

  test('DataService matches Government Schemes for Dairy unit', () => {
    const schemes = dataService.getEligibleSchemes({
      businessType: 'dairy',
      projectCost: 200000,
      isRural: true
    });
    assert(Array.isArray(schemes) && schemes.length >= 3, 'Should match multiple eligible schemes');
    const pmegp = schemes.find(s => s.id === 'pmegp');
    assert(pmegp, 'PMEGP should be eligible for rural dairy');
    assert.strictEqual(pmegp.subsidy_percentage, 25.0); // Rural general = 25%
  });

  // ─── 2. Dairy Engine Tests ─────────────────────────────────────────
  console.log('\n[2] Testing Dairy Business Calculation Engine...');

  test('Dairy Engine calculates 2-cow micro-dairy unit', () => {
    const res = calculateDairyEconomics({ animalCount: 2, state: 'Gujarat' });
    assert.strictEqual(res.businessType, 'dairy');
    assert(res.capitalInvestment.totalProjectCost > 150000, 'Project cost should include cattle and shed');
    assert(res.operationalMetrics.annualTotalMilkLitres >= 7000, 'Annual milk production should be realistic');
    assert(res.financialViability.netAnnualProfit > 0, 'Net profit should be positive');
    assert(res.financialViability.dscr >= 1.2, 'DSCR should be institutionally viable');
    assert(res.financialViability.annualRoiPct >= 15, 'ROI should be attractive');
    assert(res.financialViability.breakEvenDailyYieldPerCowLitres < 12.5, 'Break-even yield must be below full capacity');
    assert(res.stressAnalysis.feedCostIncrease10, 'Stress analysis should include feed cost rise');
    assert.strictEqual(res.provenance.source_type, 'dataset');
  });

  test('Dairy Engine scales to 10-cow commercial unit with bulk cooler', () => {
    const res = calculateDairyEconomics({ animalCount: 10, state: 'Maharashtra' });
    assert(res.capitalInvestment.totalProjectCost > 1000000, 'Commercial unit should exceed 10 lakhs');
    assert(res.operatingExpenses.laborAnnual > 0, 'Commercial unit must include permanent labor');
    assert(res.financialViability.dscr > 1.5, 'Commercial DSCR should be robust');
  });

  // ─── 3. Poultry Engine Tests ───────────────────────────────────────
  console.log('\n[3] Testing Poultry Business Calculation Engine...');

  test('Poultry Engine calculates 500-bird broiler batch cycle', () => {
    const res = calculatePoultryEconomics({ birdCapacity: 500, state: 'Maharashtra' });
    assert.strictEqual(res.businessType, 'poultry');
    assert.strictEqual(res.operationalMetrics.batchesPerYear, 6);
    assert.strictEqual(res.operationalMetrics.feedConversionRatioFcr, 1.65);
    assert(res.financialViability.netProfitPerBatch > 0, 'Batch profit should be positive');
    assert(res.financialViability.annualRoiPct >= 20, 'Annual ROI should be attractive');
    assert(res.financialViability.breakEvenLiveBirdPricePerKg < 115.0, 'Break-even price must be below market price');
    assert.strictEqual(res.provenance.source_type, 'dataset');
  });

  // ─── 4. Crop Engine Tests ─────────────────────────────────────────
  console.log('\n[4] Testing Agriculture & Crop Calculation Engine...');

  await testAsync('Crop Engine calculates Wheat cultivation in Maharashtra', async () => {
    const res = await calculateCropEconomics({
      crop: 'Wheat',
      state: 'Maharashtra',
      areaHa: 2.0
    });
    assert.strictEqual(res.businessType, 'agriculture');
    assert(res.productionEstimates.totalProductionTonnes > 0, 'Production should be positive');
    assert(res.costOfCultivation.totalOperationalCost > 0, 'Operational cost should be calculated');
    assert(res.revenue.totalRevenue > res.costOfCultivation.totalOperationalCost, 'Revenue should exceed operational cost');
    assert(res.financialViability.benefitCostRatio >= 1.0, 'Benefit cost ratio should be >= 1');
    assert(res.financingStructure.kccEligibleLimit > 0, 'KCC limit should be computed');
    assert(res.stressAnalysis.droughtDeficit20, 'Should test drought deficit');
  });

  // ─── 5. Food Processing Engine Tests ──────────────────────────────
  console.log('\n[5] Testing Agro & Food Processing Calculation Engine...');

  test('Food Processing Engine calculates Mini Flour Mill (Atta Chakki)', () => {
    const res = calculateFoodProcessingEconomics({ monthlyCapacityKg: 16000, state: 'Maharashtra' });
    assert.strictEqual(res.businessType, 'food-processing');
    assert(res.capitalInvestment.totalProjectCost > 150000, 'Capital cost must cover mill machinery');
    assert(res.financialViability.netAnnualProfit > 100000, 'Annual profit should be healthy');
    assert(res.financialViability.breakEvenCapacityUtilizationPct < 65.0, 'Break-even capacity should be viable');
    assert(res.eligibleSchemes.some(s => s.id === 'pmfme_micro_food'), 'PMFME 35% subsidy must be matched');
  });

  // ─── 6. Classifier & Novel Business Ideas Tests ────────────────────
  console.log('\n[6] Testing Business Idea Classifier & Novel Categorization...');

  test('Classifier identifies native Dairy from text', () => {
    const res = classifyBusinessIdea('I want to start a 4 cow dairy farm in Anand Gujarat');
    assert.strictEqual(res.detectedCategory, 'dairy');
    assert.strictEqual(res.mappedCalculationTemplate, 'dairy');
    assert.strictEqual(res.isCoreCategory, true);
    assert.strictEqual(res.extractedScale.animalCount, 4);
  });

  test('Classifier identifies native Poultry from text', () => {
    const res = classifyBusinessIdea('Setup 1000 broiler chicks poultry farm');
    assert.strictEqual(res.detectedCategory, 'poultry');
    assert.strictEqual(res.extractedScale.birdCapacity, 1000);
  });

  test('Classifier handles NOVEL idea (Mushroom cultivation) without crashing', () => {
    const res = classifyBusinessIdea('Commercial button mushroom farming in humidity controlled room');
    assert.strictEqual(res.mappedCalculationTemplate, 'crop');
    assert(res.confidence > 0.6, 'Confidence should be positive');
    assert(res.missingParameters.length > 0, 'Should prompt for missing parameters');
    assert(res.defaultAssumptions.length > 0, 'Should provide transparent assumptions');
  });

  test('Classifier handles NOVEL non-agri idea (Tractor repair workshop)', () => {
    const res = classifyBusinessIdea('Tractor and agricultural machinery repair workshop');
    assert.strictEqual(res.detectedCategory, 'rural_service_retail');
    assert.strictEqual(res.isCoreCategory, false);
    assert(res.archetypeProfile.name.includes('Retail') || res.archetypeProfile.name.includes('Service'), 'Should profile as service/retail');
  });

  await testAsync('Master Calculation Engine processes novel business idea without crashing', async () => {
    const res = await analyzeBusiness({
      businessIdea: 'Organic vermicompost production unit with 5 pits',
      investmentRequired: 120000,
      monthlyOpex: 15000,
      state: 'Rajasthan'
    });
    assert(res.unitTitle, 'Should generate unit title');
    assert(res.capitalInvestment.totalProjectCost >= 120000, 'Total project cost should match');
    assert(res.financialViability.netAnnualProfit > 0, 'Should compute net profit');
    assert(res.financialViability.dscr > 0, 'Should compute DSCR');
    assert(res.eligibleSchemes.length > 0, 'Should match MUDRA/PMEGP');
  });

  // ─── 7. Machine Learning Inference Tests ─────────────────────────
  console.log('\n[7] Testing Machine Learning Model Pipelines...');

  await testAsync('ML Crop Yield Regressor predicts expected yield', async () => {
    const res = await modelService.predictCropYield({
      product: 'Rice',
      season: 'Kharif',
      state: 'Assam',
      area: 2.0,
      annual_rainfall: 2000.0,
      fertilizer: 400.0
    });
    assert(res.predicted_yield_per_ha > 0, 'Predicted yield should be positive');
    assert(res.confidence >= 0.75, 'Model confidence should be >= 0.75');
    assert(res.model_version, 'Model version should be specified');
  });

  await testAsync('ML Crop Suitability Classifier predicts top crops', async () => {
    const res = await modelService.predictCropSuitability({
      n: 90, p: 42, k: 43,
      temperature: 24.5, humidity: 80.0, ph: 6.5, rainfall: 200.0
    });
    assert(res.recommended_crop, 'Should have recommended crop');
    assert(Array.isArray(res.top_recommendations) && res.top_recommendations.length > 0, 'Top recommendations must be an array');
    assert.strictEqual(res.source_type, 'ml_model');
  });

  await testAsync('Mandi Price Service respects stale_data gate and falls back to verified historical dataset', async () => {
    const res = await modelService.predictMandiPrice({
      product: 'Wheat(Husked)',
      state: 'Maharashtra',
      month: 'April',
      year: 2026,
      arrival_quantity: 250.0
    });
    assert(res.predicted_modal_price_inr_per_qtl > 1000, 'Modal price should be realistic');
    assert(res.predicted_farmgate_price_per_kg > 10, 'Farmgate price should be realistic');
    assert.strictEqual(res.source_type, 'DATABASE_VALUE');
    assert.strictEqual(res.dataStatus, 'historical_reference');
    assert.strictEqual(res.latestObservationDate, '2016-11-01');
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
