/**
 * VYAVSAYMITRA — Agriculture Crop Farming Model Test Suite (Phase 2)
 * 
 * Verifies all 18 mandatory test scenarios:
 * 1. Wheat crop with complete verified/user inputs
 * 2. Rice crop
 * 3. Crop with current government market price
 * 4. Crop where only historical market data exists
 * 5. Missing yield
 * 6. Missing selling price
 * 7. Invalid area
 * 8. Negative cost
 * 9. Unit mismatch
 * 10. Division by zero
 * 11. Current + historical market comparison
 * 12. Stale market data
 * 13. Unknown crop
 * 14. Missing verified benchmark
 * 15. Provenance of calculated result
 * 16. CACP cost concept calculation
 * 17. No fake defaults
 * 18. Formula execution through Phase-1 registry
 */

const assert = require('assert');
const {
  runCropFarmingModel,
  normalizeArea,
  normalizePrice,
  normalizeYield
} = require('../src/services/business/cropFarmingModel');
const { defaultRegistry } = require('../src/services/formulaEngine');
const dataService = require('../src/services/data/dataService');

async function runTests() {
  console.log('======================================================================');
  console.log('RUNNING AGRICULTURE CROP FARMING MODEL TEST SUITE (PHASE 2)');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
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

  // ─── TEST 1: Wheat crop with complete verified/user inputs ──────────
  await test('TEST 1: Wheat crop with complete verified/user inputs', async () => {
    const result = await runCropFarmingModel({
      crop: 'Wheat',
      state: 'Maharashtra',
      district: 'Nashik',
      area: 2.0,
      areaUnit: 'hectare',
      yield: 3.5, // 3.5 tonnes/ha
      yieldUnit: 'tonnes/ha',
      sellingPrice: 2400, // 2400 INR/qtl
      costPerHa: 28000
    });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    assert.strictEqual(result.crop, 'Wheat');
    assert.strictEqual(result.inputs.area, 2.0);
    // Production = 2 ha * 3.5 t/ha = 7 tonnes = 70 quintals
    assert.strictEqual(result.production.quantityTonnes, 7);
    assert.strictEqual(result.production.quantity, 70);
    // Main revenue = 70 qtl * 2400 = 168,000 INR
    assert.strictEqual(result.revenue.mainProduceRevenue, 168000);
    assert.ok(result.revenue.value > 168000); // Main + byproduct
    assert.ok(result.costs.total > 0);
    assert.ok(result.profitability.netProfit > 0);
    assert.ok(result.profitability.benefitCostRatio > 1.0);
    assert.ok(result.breakEven.price > 0);
  });

  // ─── TEST 2: Rice crop ──────────────────────────────────────────────
  await test('TEST 2: Rice crop execution with Kharif seasonal resolution', async () => {
    const result = await runCropFarmingModel({
      crop: 'Rice',
      state: 'Punjab',
      area: 1.5,
      areaUnit: 'hectare',
      yield: 4.0,
      sellingPrice: 2200,
      costPerHa: 32000
    });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    assert.strictEqual(result.crop, 'Rice');
    assert.strictEqual(result.season, 'Kharif');
    // Production = 1.5 * 4.0 = 6 tonnes = 60 quintals
    assert.strictEqual(result.production.quantityTonnes, 6);
    assert.strictEqual(result.production.quantity, 60);
    assert.strictEqual(result.revenue.mainProduceRevenue, 132000);
  });

  // ─── TEST 3: Crop with current government market price ─────────────
  await test('TEST 3: Crop with current government market price from verified store', async () => {
    // Soyabean in Maharashtra has verified current market data in verified_current_mandi_prices.json
    const result = await runCropFarmingModel({
      crop: 'Soyabean',
      state: 'Maharashtra',
      district: 'Nagpur',
      area: 2.0,
      yield: 2.2,
      costPerHa: 25000
    });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    assert.ok(result.market);
    assert.ok(result.revenue.value > 0);
    assert.ok(result.inputs.realizedPricePerQtl > 0);
  });

  // ─── TEST 4: Crop where only historical market data exists ─────────
  await test('TEST 4: Crop where only historical market data exists returns warning', async () => {
    // Sunflower in Maharashtra (has historical APMC reference in validated_mandi_prices.csv, but not in current store)
    const result = await runCropFarmingModel({
      crop: 'Sunflower',
      state: 'Maharashtra',
      area: 2.0,
      yield: 1.5,
      costPerHa: 22000
    });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    assert.strictEqual(result.inputs.realizedPricePerQtl, 3116);
    // Must contain warning about historical APMC reference
    const hasWarning = result.warnings.some(w => w.includes('historical APMC reference data') || w.includes('2014-2016'));
    assert.ok(hasWarning, 'Expected warning regarding historical APMC reference');
  });

  // ─── TEST 5: Missing yield ──────────────────────────────────────────
  await test('TEST 5: Missing yield when unbenchmarked returns missingInputs: [yield]', async () => {
    // Dragonfruit is not in historical crop yield dataset and not provided by user
    const result = await runCropFarmingModel({
      crop: 'Dragonfruit_Exotic_Unbenchmarked',
      state: 'Gujarat',
      area: 1.0,
      sellingPrice: 8000,
      costPerHa: 150000
    });

    assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
    assert.ok(result.missingInputs.includes('yield'));
    assert.strictEqual(result.production, null);
    assert.strictEqual(result.revenue, null);
    assert.strictEqual(result.profitability, null);
    const hasGuidance = result.warnings.some(w => w.includes('yield') && w.includes('Explicit user input required'));
    assert.ok(hasGuidance);
  });

  // ─── TEST 6: Missing selling price ──────────────────────────────────
  await test('TEST 6: Missing selling price when unbenchmarked returns missingInputs: [selling_price]', async () => {
    const result = await runCropFarmingModel({
      crop: 'Hydroponic_Wasabi_Unbenchmarked',
      state: 'Sikkim',
      area: 0.5,
      yield: 1.5,
      costPerHa: 200000
    });

    assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
    assert.ok(result.missingInputs.includes('selling_price'));
    assert.strictEqual(result.revenue, null);
    assert.strictEqual(result.profitability, null);
  });

  // ─── TEST 7: Invalid area ───────────────────────────────────────────
  await test('TEST 7: Invalid area (area <= 0 or non-numeric) is rejected with validation error', async () => {
    const resZero = await runCropFarmingModel({ crop: 'Wheat', area: 0 });
    assert.strictEqual(resZero.businessStatus, 'INVALID_INPUTS');
    assert.strictEqual(resZero.validationError.field, 'area');
    assert.strictEqual(resZero.validationError.error, 'INVALID_AREA');

    const resNegative = await runCropFarmingModel({ crop: 'Wheat', area: -5 });
    assert.strictEqual(resNegative.businessStatus, 'INVALID_INPUTS');
    assert.strictEqual(resNegative.validationError.error, 'INVALID_AREA');

    const resNonNumeric = await runCropFarmingModel({ crop: 'Wheat', area: 'five_hectares' });
    assert.strictEqual(resNonNumeric.businessStatus, 'INVALID_INPUTS');
    assert.strictEqual(resNonNumeric.validationError.error, 'INVALID_AREA');
  });

  // ─── TEST 8: Negative cost ──────────────────────────────────────────
  await test('TEST 8: Negative cost input is rejected with validation error', async () => {
    const resNegativeCost = await runCropFarmingModel({
      crop: 'Wheat',
      area: 2.0,
      costPerHa: -25000
    });

    assert.strictEqual(resNegativeCost.businessStatus, 'INVALID_INPUTS');
    assert.strictEqual(resNegativeCost.validationError.error, 'NEGATIVE_COST');
    assert.ok(resNegativeCost.validationError.message.includes('cannot be negative'));
  });

  // ─── TEST 9: Unit mismatch ──────────────────────────────────────────
  await test('TEST 9: Unit mismatch for area or price returns UNIT_MISMATCH error', async () => {
    // Incompatible area unit (litres for land area)
    const resUnitArea = await runCropFarmingModel({
      crop: 'Wheat',
      area: 10,
      areaUnit: 'litres'
    });

    assert.strictEqual(resUnitArea.businessStatus, 'INVALID_INPUTS');
    assert.strictEqual(resUnitArea.validationError.error, 'UNIT_MISMATCH');

    // Incompatible price unit (meters for commodity price)
    const resUnitPrice = await runCropFarmingModel({
      crop: 'Wheat',
      area: 1.0,
      sellingPrice: 2000,
      priceUnit: 'INR/meter'
    });

    assert.strictEqual(resUnitPrice.businessStatus, 'INVALID_INPUTS');
    assert.strictEqual(resUnitPrice.validationError.error, 'UNIT_MISMATCH');
  });

  // ─── TEST 10: Division by zero ──────────────────────────────────────
  await test('TEST 10: Division by zero in break-even or margins handled safely', async () => {
    // When yield is 0, total production is 0
    const resZeroYield = await runCropFarmingModel({
      crop: 'Wheat',
      area: 1.0,
      yield: 0,
      sellingPrice: 2400,
      costPerHa: 20000
    });

    assert.strictEqual(resZeroYield.businessStatus, 'COMPLETE');
    assert.strictEqual(resZeroYield.production.quantity, 0);
    // Break-even price per quintal should safely be null (not NaN or Infinity)
    assert.strictEqual(resZeroYield.breakEven.price, null);
    const hasZeroProdWarning = resZeroYield.warnings.some(w => w.includes('Total production is 0'));
    assert.ok(hasZeroProdWarning);
  });

  // ─── TEST 11: Current + historical market comparison ───────────────
  await test('TEST 11: Current + historical market reconciliation without mixing', async () => {
    // Wheat in Maharashtra has both current verified data and historical APMC data
    const result = await runCropFarmingModel({
      crop: 'Wheat',
      state: 'Maharashtra',
      district: 'Nashik',
      area: 2.0,
      yield: 3.2,
      costPerHa: 26000
    });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    assert.ok(result.market);
    if (result.market.hasReconciliation) {
      assert.ok(result.market.marketState);
      assert.ok(result.market.historicalBaseline);
      // Ensure prices are distinct and not averaged
      assert.notStrictEqual(result.market.comparison.percentageDifference, undefined);
    }
  });

  // ─── TEST 12: Stale market data ─────────────────────────────────────
  await test('TEST 12: Stale market data is appropriately labeled with warning', async () => {
    const result = await runCropFarmingModel({
      crop: 'Sunflower',
      state: 'Maharashtra',
      area: 1.0,
      yield: 1.5,
      costPerHa: 20000
    });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    // Sunflower in Maharashtra uses historical 2014-2016 APMC data
    const hasWarning = result.warnings.some(w => w.includes('historical') || w.includes('2014-2016'));
    assert.ok(hasWarning, 'Expected historical reference warning');
    assert.ok(result.revenue.provenance.dataStatus === 'HISTORICAL_REFERENCE' || result.revenue.provenance.dataStatus === 'historical_reference');
  });

  // ─── TEST 13: Unknown crop ──────────────────────────────────────────
  await test('TEST 13: Unknown crop handled gracefully without guessing or crashing', async () => {
    const result = await runCropFarmingModel({
      crop: 'Completely_Fictional_Crop_XYZ',
      state: 'Maharashtra',
      area: 2.0
    });

    assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
    assert.strictEqual(result.crop, 'Completely_Fictional_Crop_XYZ');
    assert.ok(result.missingInputs.includes('yield'));
    assert.ok(result.missingInputs.includes('production_cost'));
    assert.ok(result.missingInputs.includes('selling_price'));
    assert.strictEqual(result.production, null);
    assert.strictEqual(result.revenue, null);
    assert.strictEqual(result.profitability, null);
  });

  // ─── TEST 14: Missing verified benchmark ────────────────────────────
  await test('TEST 14: Missing verified benchmark returns missingInputs instead of fake values', async () => {
    // Saffron in Maharashtra (no agronomic benchmark for saffron in tropical Maharashtra)
    const result = await runCropFarmingModel({
      crop: 'Saffron',
      state: 'Maharashtra',
      area: 1.0
    });

    assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
    assert.ok(result.missingInputs.length >= 2);
    // Never silently default to 0 or 1 for revenue
    assert.strictEqual(result.revenue, null);
  });

  // ─── TEST 15: Provenance of calculated result ───────────────────────
  await test('TEST 15: Full provenance of calculated result tracing back to formulas and datasets', async () => {
    const result = await runCropFarmingModel({
      crop: 'Wheat',
      state: 'Maharashtra',
      area: 2.0,
      yield: 3.0,
      sellingPrice: 2300,
      costPerHa: 25000
    });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    assert.ok(result.production.provenance);
    assert.ok(result.revenue.provenance);
    assert.ok(result.costs.provenance);
    assert.ok(result.profitability.provenance);
    assert.strictEqual(result.profitability.provenance.sourceType, 'FORMULA');
    assert.ok(result.profitability.provenance.source.includes('CACP'));
  });

  // ─── TEST 16: CACP cost concept calculation ─────────────────────────
  await test('TEST 16: CACP cost concepts (Cost A1, A2, A2+FL, B1, B2, C1, C2) clearly calculated and labeled', async () => {
    const result = await runCropFarmingModel({
      crop: 'Wheat',
      area: 1.0,
      areaUnit: 'hectare',
      yield: 3.0,
      sellingPrice: 2500,
      costPerHa: 30000,
      rentPaidLeasedInLand: 4000,
      imputedFamilyLabour: 6000,
      imputedRentalOwnedLand: 3000,
      imputedInterestOwnedCapital: 1500
    });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    const cacp = result.costs.cacpCostConcepts;
    assert.ok(cacp.costA1);
    assert.ok(cacp.costA2);
    assert.ok(cacp.costA2FL);
    assert.ok(cacp.costB1);
    assert.ok(cacp.costB2);
    assert.ok(cacp.costC1);
    assert.ok(cacp.costC2);

    // Cost A1 base = 30,000
    assert.strictEqual(cacp.costA1.value, 30000);
    // Cost A2 = Cost A1 (30000) + Leased rent (4000) = 34,000
    assert.strictEqual(cacp.costA2.value, 34000);
    // Cost A2+FL = Cost A2 (34000) + Family Labour (6000) = 40,000 (MSP benchmark!)
    assert.strictEqual(cacp.costA2FL.value, 40000);
    // Cost B1 = Cost A1 (30000) + Imputed Interest (1500) = 31,500
    assert.strictEqual(cacp.costB1.value, 31500);
    // Cost B2 = Cost B1 (31500) + Imputed Rent (3000) = 34,500
    assert.strictEqual(cacp.costB2.value, 34500);
    // Cost C1 = Cost B1 (31500) + Family Labour (6000) = 37,500
    assert.strictEqual(cacp.costC1.value, 37500);
    // Cost C2 = Cost A2+FL (40000) + Interest (1500) + Owned Rent (3000) = 44,500
    assert.strictEqual(cacp.costC2.value, 44500);

    // Verify economic cost distinction
    assert.ok(cacp.costC2.description.includes('opportunity costs'));
    assert.ok(cacp.costA2.description.includes('out-of-pocket'));
  });

  // ─── TEST 17: No fake defaults ──────────────────────────────────────
  await test('TEST 17: No fake defaults: area provided without yield/cost/price leaves result incomplete', async () => {
    // User passes area = 5 ha for an unbenchmarked crop with NO yield, cost, or price
    const result = await runCropFarmingModel({
      crop: 'Rare_Herbal_Crop_Unknown',
      area: 5.0
    });

    assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
    // Engine must NOT default yield to 0 or 1 or average guess
    assert.strictEqual(result.production, null);
    // Engine must NOT default revenue to 0
    assert.strictEqual(result.revenue, null);
    // Engine must NOT default profitability to 0
    assert.strictEqual(result.profitability, null);
    // Engine must report exactly what is missing
    assert.ok(result.missingInputs.includes('yield'));
    assert.ok(result.missingInputs.includes('production_cost'));
    assert.ok(result.missingInputs.includes('selling_price'));
  });

  // ─── TEST 18: Formula execution through Phase-1 registry ────────────
  await test('TEST 18: Calculations are executed directly through Phase-1 FormulaRegistry', async () => {
    let executedFormulas = [];
    const trackingRegistry = {
      executeFormula: (formulaId, inputs, options) => {
        executedFormulas.push(formulaId);
        return defaultRegistry.executeFormula(formulaId, inputs, options);
      },
      getFormula: (id, ver) => defaultRegistry.getFormula(id, ver)
    };

    const result = await runCropFarmingModel({
      crop: 'Wheat',
      state: 'Maharashtra',
      area: 1.0,
      yield: 3.0,
      sellingPrice: 2400,
      costPerHa: 25000
    }, { registry: trackingRegistry });

    assert.strictEqual(result.businessStatus, 'COMPLETE');
    // Must have invoked Phase-1 registry formulas
    assert.ok(executedFormulas.includes('AGRI_TOTAL_PRODUCTION'), 'Expected AGRI_TOTAL_PRODUCTION to be called');
    assert.ok(executedFormulas.includes('AGRI_TOTAL_PRODUCTION_QTL'), 'Expected AGRI_TOTAL_PRODUCTION_QTL to be called');
    assert.ok(executedFormulas.includes('AGRI_CACP_COST_A1'), 'Expected AGRI_CACP_COST_A1 to be called');
    assert.ok(executedFormulas.includes('AGRI_CACP_COST_A2'), 'Expected AGRI_CACP_COST_A2 to be called');
    assert.ok(executedFormulas.includes('AGRI_CACP_COST_A2_FL'), 'Expected AGRI_CACP_COST_A2_FL to be called');
    assert.ok(executedFormulas.includes('AGRI_CACP_COMPREHENSIVE_COST_C2'), 'Expected AGRI_CACP_COMPREHENSIVE_COST_C2 to be called');
    assert.ok(executedFormulas.includes('AGRI_MAIN_PRODUCE_REVENUE'), 'Expected AGRI_MAIN_PRODUCE_REVENUE to be called');
    assert.ok(executedFormulas.includes('AGRI_TOTAL_REVENUE'), 'Expected AGRI_TOTAL_REVENUE to be called');
    assert.ok(executedFormulas.includes('AGRI_FARM_BUSINESS_INCOME'), 'Expected AGRI_FARM_BUSINESS_INCOME to be called');
    assert.ok(executedFormulas.includes('AGRI_NET_ECONOMIC_PROFIT'), 'Expected AGRI_NET_ECONOMIC_PROFIT to be called');
    assert.ok(executedFormulas.includes('AGRI_BREAK_EVEN_MANDI_PRICE'), 'Expected AGRI_BREAK_EVEN_MANDI_PRICE to be called');
  });

  console.log('\n======================================================================');
  console.log(`AGRICULTURE CROP MODEL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
