/**
 * VYAVSAYMITRA — Production FoodTech Business Execution Engine Test Suite (Phase 3 Step 2)
 * 
 * Comprehensive 28-point test suite:
 *  TEST 1: Flour mill complete valid calculation
 *  TEST 2: Rice mill complete valid calculation
 *  TEST 3: Dal mill complete valid calculation
 *  TEST 4: Oil expeller complete valid calculation
 *  TEST 5: Spice processing complete valid calculation
 *  TEST 6: Missing raw material input
 *  TEST 7: Missing recovery rate where no verified benchmark exists
 *  TEST 8: Missing selling price
 *  TEST 9: Negative cost rejected
 *  TEST 10: Invalid unit rejected
 *  TEST 11: Non-INR currency rejected
 *  TEST 12: Recovery > 100% rejected
 *  TEST 13: Negative recovery rejected
 *  TEST 14: Output > raw input rejected
 *  TEST 15: Multiple output streams exceeding raw input rejected
 *  TEST 16: Historical market fallback produces warning
 *  TEST 17: Current and historical prices are not blended
 *  TEST 18: Zero revenue does not generate NaN/Infinity
 *  TEST 19: Zero production does not generate invalid break-even
 *  TEST 20: Unknown FoodTech business returns appropriate unsupported/insufficient result
 *  TEST 21: RESEARCH_REQUIRED extrusion formula cannot execute
 *  TEST 22: RESEARCH_REQUIRED solvent extraction formula cannot execute
 *  TEST 23: RESEARCH_REQUIRED osmotic dehydration formula cannot execute
 *  TEST 24: Provenance exists for every calculated metric
 *  TEST 25: FormulaRegistry is actually used rather than duplicated arithmetic
 *  TEST 26: Strict safety guarantee: no eval()
 *  TEST 27: Strict safety guarantee: no new Function()
 *  TEST 28: Existing Agriculture execution remains unchanged
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  runFoodTechBusinessModel,
  normalizeWeight,
  normalizePrice
} = require('../src/services/business/foodtech/foodtechExecutionEngine');

const { defaultRegistry } = require('../src/services/formulaEngine');
const { runCropFarmingModel } = require('../src/services/business/cropFarmingModel');

console.log('======================================================================');
console.log('RUNNING FOODTECH BUSINESS EXECUTION ENGINE TEST SUITE (PHASE 3 STEP 2)');
console.log('======================================================================\n');

let passedTests = 0;
let failedTests = 0;

async function runAsyncTest(testName, testFn) {
  try {
    await testFn();
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(`    ${err.stack.split('\n')[1]}`);
    failedTests++;
  }
}

function runSyncTest(testName, testFn) {
  try {
    testFn();
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(`    ${err.stack.split('\n')[1]}`);
    failedTests++;
  }
}

async function runAllTests() {
  // ── TEST 1: Flour mill complete valid calculation ──────────────────
  await runAsyncTest('TEST 1: Flour mill complete valid calculation', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      byproduct_selling_price: 18.00,
      fixed_cost: 15000,
      labour_cost: 8000,
      electricity_cost: 5000,
      packaging_cost: 1200,
      initial_investment: 150000
    });

    assert.strictEqual(result.businessStatus, 'CALCULATED');
    assert.strictEqual(result.production.rawMaterialInputKg, 1000);
    assert.strictEqual(result.production.primaryOutputKg, 950); // 95% whole wheat flour
    assert.strictEqual(result.production.byproductOutputKg, 40); // 4% wheat bran
    assert.strictEqual(result.production.lossKg, 10); // 1% handling loss
    assert.strictEqual(result.massBalance.isMassConserved, true);

    assert.strictEqual(result.costs.rawMaterialCost, 24500); // 1000 * 24.50
    assert.strictEqual(result.costs.totalVariableCost, 24500 + 8000 + 5000 + 1200); // 38700
    assert.strictEqual(result.costs.fixedCost, 15000);
    assert.strictEqual(result.costs.totalCost, 38700 + 15000); // 53700

    assert.strictEqual(result.revenue.primaryRevenue, 950 * 36); // 34200
    assert.strictEqual(result.revenue.byproductRevenue, 40 * 18); // 720
    assert.strictEqual(result.revenue.totalRevenue, 34920);

    assert(typeof result.profitability.grossProfit === 'number');
    assert(typeof result.profitability.netProfit === 'number');
    assert(typeof result.profitability.grossMarginPct === 'number');
    assert(typeof result.profitability.netMarginPct === 'number');
    assert(result.provenance.length >= 8, 'Provenance must trace formula executions');
  });

  // ── TEST 2: Rice mill complete valid calculation ───────────────────
  await runAsyncTest('TEST 2: Rice mill complete valid calculation', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_RICE_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 22.00,
      selling_price: 42.00,
      byproduct_selling_price: 12.00,
      fixed_cost: 20000,
      labour_cost: 10000,
      electricity_cost: 7000
    });

    assert.strictEqual(result.businessStatus, 'CALCULATED');
    assert.strictEqual(result.production.rawMaterialInputKg, 1000);
    assert.strictEqual(result.production.primaryOutputKg, 670); // 67% statutory custom milling out-turn
    assert.strictEqual(result.massBalance.isMassConserved, true);
    assert(result.production.outputStreams.some(s => s.name.includes('Head Rice')));
    assert(result.production.outputStreams.some(s => s.name.includes('Broken Rice')));
    assert(result.production.outputStreams.some(s => s.name.includes('Husk')));
    assert(result.production.outputStreams.some(s => s.name.includes('Bran')));
    assert(result.revenue.totalRevenue > 0);
  });

  // ── TEST 3: Dal mill complete valid calculation ────────────────────
  await runAsyncTest('TEST 3: Dal mill complete valid calculation', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_PULSE_PROCESSING',
      raw_material_quantity: 1000,
      raw_material_price: 65.00,
      selling_price: 95.00,
      byproduct_selling_price: 24.00,
      fixed_cost: 18000,
      labour_cost: 9000,
      electricity_cost: 6000
    });

    assert.strictEqual(result.businessStatus, 'CALCULATED');
    assert.strictEqual(result.production.primaryOutputKg, 740); // 74% split dehulled dal
    assert.strictEqual(result.production.byproductOutputKg, 220); // 22% chuni/husk cattle feed
    assert.strictEqual(result.massBalance.isMassConserved, true);
    assert.strictEqual(result.revenue.primaryRevenue, 740 * 95);
    assert.strictEqual(result.revenue.byproductRevenue, 220 * 24);
  });

  // ── TEST 4: Oil expeller complete valid calculation ────────────────
  await runAsyncTest('TEST 4: Oil expeller complete valid calculation', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_OIL_EXTRACTION',
      raw_material_quantity: 1000,
      raw_material_price: 52.00,
      selling_price: 140.00,
      cake_selling_price: 28.50,
      fixed_cost: 25000,
      labour_cost: 12000,
      electricity_cost: 8000,
      initial_investment: 300000
    });

    assert.strictEqual(result.businessStatus, 'CALCULATED');
    assert.strictEqual(result.production.primaryOutputKg, 340); // 34% raw oil recovery
    assert.strictEqual(result.production.byproductOutputKg, 640); // 64% high-protein oil cake
    assert.strictEqual(result.revenue.byproductRevenue, 640 * 28.50); // 18240
    assert.strictEqual(result.massBalance.isMassConserved, true);
  });

  // ── TEST 5: Spice processing complete valid calculation ────────────
  await runAsyncTest('TEST 5: Spice processing complete valid calculation', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_SPICE_PROCESSING',
      raw_material_quantity: 500,
      raw_material_price: 180.00,
      selling_price: 280.00,
      fixed_cost: 12000,
      labour_cost: 6000,
      electricity_cost: 4000
    });

    assert.strictEqual(result.businessStatus, 'CALCULATED');
    assert.strictEqual(result.production.primaryOutputKg, 480); // 96% pure ground spice
    assert.strictEqual(result.production.byproductOutputKg, 0); // No commercial byproduct
    assert.strictEqual(result.massBalance.isMassConserved, true);
    assert.strictEqual(result.revenue.primaryRevenue, 480 * 280);
  });

  // ── TEST 6: Missing raw material input ─────────────────────────────
  await runAsyncTest('TEST 6: Missing raw material input', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      // raw_material_quantity omitted
      raw_material_price: 24.50,
      selling_price: 36.00,
      fixed_cost: 15000
    });

    assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
    assert(result.missingInputs.includes('raw_material_quantity'));
  });

  // ── TEST 7: Missing recovery rate where no verified benchmark exists
  await runAsyncTest('TEST 7: Missing recovery rate where no verified benchmark exists', async () => {
    // Calling unbenchmarked/generic model without recovery rate
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_GENERIC_AGRO_PROCESSING',
      raw_material_quantity: 1000,
      raw_material_price: 25.00,
      selling_price: 40.00
      // recovery_rate omitted and model has no defaults
    });

    assert(
      result.businessStatus === 'INSUFFICIENT_INPUTS' ||
      result.businessStatus === 'STRUCTURE_RECOGNIZED_UNCODIFIED' ||
      result.missingInputs.includes('recovery_rate') ||
      result.missingInputs.includes('verified_recovery_rate'),
      'Must flag missing recovery rate without inventing fake efficiency'
    );
  });

  // ── TEST 8: Missing selling price ──────────────────────────────────
  await runAsyncTest('TEST 8: Missing selling price', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      // selling_price omitted
      fixed_cost: 15000
    });

    assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
    assert(result.missingInputs.includes('selling_price'));
  });

  // ── TEST 9: Negative cost rejected ─────────────────────────────────
  await runAsyncTest('TEST 9: Negative cost rejected', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      fixed_cost: -15000 // Negative cost!
    });

    assert.strictEqual(result.businessStatus, 'VALIDATION_ERROR');
    assert.strictEqual(result.error, 'NEGATIVE_COST');
  });

  // ── TEST 10: Invalid unit rejected ─────────────────────────────────
  await runAsyncTest('TEST 10: Invalid unit rejected', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_unit: 'litres_per_hectare', // Incompatible unit
      raw_material_price: 24.50,
      selling_price: 36.00
    });

    assert.strictEqual(result.businessStatus, 'VALIDATION_ERROR');
    assert.strictEqual(result.error, 'UNIT_MISMATCH');
  });

  // ── TEST 11: Non-INR currency rejected ─────────────────────────────
  await runAsyncTest('TEST 11: Non-INR currency rejected', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      currency: 'USD' // Foreign currency rejected
    });

    assert.strictEqual(result.businessStatus, 'VALIDATION_ERROR');
    assert.strictEqual(result.error, 'CURRENCY_MISMATCH');
  });

  // ── TEST 12: Recovery > 100% rejected ──────────────────────────────
  await runAsyncTest('TEST 12: Recovery > 100% rejected', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      recovery_rate: 108.0, // Impossible > 100%
      raw_material_price: 24.50,
      selling_price: 36.00
    });

    assert.strictEqual(result.businessStatus, 'MASS_BALANCE_VIOLATION');
    assert(result.error.includes('cannot exceed 100%'));
  });

  // ── TEST 13: Negative recovery rejected ────────────────────────────
  await runAsyncTest('TEST 13: Negative recovery rejected', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      recovery_rate: -12.0, // Physically impossible
      raw_material_price: 24.50,
      selling_price: 36.00
    });

    assert.strictEqual(result.businessStatus, 'MASS_BALANCE_VIOLATION');
    assert(result.error.includes('Negative recovery rate') && result.error.includes('physically impossible'));
  });

  // ── TEST 14: Output > raw input rejected ───────────────────────────
  await runAsyncTest('TEST 14: Output > raw input rejected', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 500,
      recovery_rate: 110.0, // Will produce 550 kg > 500 kg
      raw_material_price: 24.50,
      selling_price: 36.00
    });

    assert.strictEqual(result.businessStatus, 'MASS_BALANCE_VIOLATION');
  });

  // ── TEST 15: Multiple output streams exceeding raw input rejected ──
  await runAsyncTest('TEST 15: Multiple output streams exceeding raw input rejected', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      recovery_rate: 90.0, // 900 kg primary
      byproduct_recovery: 20.0, // 200 kg byproduct -> 900 + 200 = 1100 kg > 1000 kg!
      raw_material_price: 24.50,
      selling_price: 36.00
    });

    assert.strictEqual(result.businessStatus, 'MASS_BALANCE_VIOLATION');
    assert(result.error.includes('Mass balance violation'));
  });

  // ── TEST 16: Historical market fallback produces warning ───────────
  await runAsyncTest('TEST 16: Historical market fallback produces warning', async () => {
    // When raw_material_price is omitted, the engine queries market services.
    // For commodities where live government API is not active, it uses APMC historical fallback.
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_SPICE_PROCESSING',
      raw_material_quantity: 500,
      spiceType: 'Chilli',
      state: 'Andhra Pradesh',
      // raw_material_price omitted
      selling_price: 280.00,
      fixed_cost: 10000
    });

    if (result.businessStatus === 'CALCULATED') {
      if (result.inputs.dataStatuses.rawMaterialPrice === 'HISTORICAL_REFERENCE') {
        assert(result.warnings.some(w => w.includes('historical benchmark') || w.includes('unavailable')));
      }
    } else {
      // If no market data could be resolved, it cleanly flags missing raw_material_price
      assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
      assert(result.missingInputs.includes('raw_material_price'));
    }
  });

  // ── TEST 17: Current and historical prices are not blended ─────────
  await runAsyncTest('TEST 17: Current and historical prices are not blended', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00
    });

    assert.strictEqual(result.inputs.dataStatuses.rawMaterialPrice, 'USER_INPUT');
    assert.strictEqual(result.inputs.dataStatuses.sellingPrice, 'USER_INPUT');
    // Ensure no blended synthetic average was created
    assert.strictEqual(result.inputs.rawMaterialPrice, 24.50);
  });

  // ── TEST 18: Zero revenue does not generate NaN/Infinity ───────────
  await runAsyncTest('TEST 18: Zero revenue does not generate NaN/Infinity', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 0, // Zero selling price -> 0 revenue
      fixed_cost: 15000
    });

    assert.strictEqual(result.businessStatus, 'CALCULATED');
    assert.strictEqual(result.revenue.totalRevenue, 0);
    // Margins must be null, never NaN or Infinity
    assert.strictEqual(result.profitability.grossMarginPct, null);
    assert.strictEqual(result.profitability.netMarginPct, null);
    assert(result.warnings.some(w => w.includes('revenue is zero')));
  });

  // ── TEST 19: Zero production does not generate invalid break-even ──
  await runAsyncTest('TEST 19: Zero production does not generate invalid break-even', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 15.00, // Selling price lower than unit variable cost!
      fixed_cost: 15000,
      labour_cost: 5000
    });

    assert.strictEqual(result.businessStatus, 'CALCULATED');
    // Break-even quantity must be null because contribution margin is negative
    assert.strictEqual(result.breakEven.breakEvenQuantity, null);
    assert(result.warnings.some(w => w.includes('contribution margin is non-positive') || w.includes('break-even')));
  });

  // ── TEST 20: Unknown FoodTech business returns unsupported/insufficient result
  await runAsyncTest('TEST 20: Unknown FoodTech business returns appropriate unsupported/insufficient result', async () => {
    const result = await runFoodTechBusinessModel({
      businessType: 'cryptocurrency mining farm and blockchain data center'
    });

    assert.strictEqual(result.businessStatus, 'INSUFFICIENT_INPUTS');
    assert(Array.isArray(result.missingRequirements));
    assert(result.missingRequirements.length >= 3);
  });

  // ── TEST 21: RESEARCH_REQUIRED extrusion formula cannot execute ────
  runSyncTest('TEST 21: RESEARCH_REQUIRED extrusion formula cannot execute', () => {
    const formula = defaultRegistry.getFormula('FOODTECH_EXTRUSION_EXPANSION_RATIO');
    assert(formula);
    assert.strictEqual(formula.status, 'RESEARCH_REQUIRED');

    assert.throws(() => {
      defaultRegistry.executeFormula('FOODTECH_EXTRUSION_EXPANSION_RATIO', {
        die_diameter: 3.5,
        expansion_factor: 2.1
      });
    }, /cannot be executed .* status is 'RESEARCH_REQUIRED'/i);
  });

  // ── TEST 22: RESEARCH_REQUIRED solvent extraction formula cannot execute
  runSyncTest('TEST 22: RESEARCH_REQUIRED solvent extraction formula cannot execute', () => {
    const formula = defaultRegistry.getFormula('FOODTECH_SOLVENT_EXTRACTION_RESIDUAL_OIL');
    assert(formula);
    assert.strictEqual(formula.status, 'RESEARCH_REQUIRED');

    assert.throws(() => {
      defaultRegistry.executeFormula('FOODTECH_SOLVENT_EXTRACTION_RESIDUAL_OIL', {
        initial_oil_pct: 18.0,
        retention_factor: 0.05
      });
    }, /cannot be executed .* status is 'RESEARCH_REQUIRED'/i);
  });

  // ── TEST 23: RESEARCH_REQUIRED osmotic dehydration formula cannot execute
  runSyncTest('TEST 23: RESEARCH_REQUIRED osmotic dehydration formula cannot execute', () => {
    const formula = defaultRegistry.getFormula('FOODTECH_FRUIT_OSMOTIC_DEHYDRATION_WATER_LOSS');
    assert(formula);
    assert.strictEqual(formula.status, 'RESEARCH_REQUIRED');

    assert.throws(() => {
      defaultRegistry.executeFormula('FOODTECH_FRUIT_OSMOTIC_DEHYDRATION_WATER_LOSS', {
        initial_fruit_weight: 100,
        mass_transfer_rate: 25.0
      });
    }, /cannot be executed .* status is 'RESEARCH_REQUIRED'/i);
  });

  // ── TEST 24: Provenance exists for every calculated metric ─────────
  await runAsyncTest('TEST 24: Provenance exists for every calculated metric', async () => {
    const result = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 2000,
      raw_material_price: 25.00,
      selling_price: 38.00,
      fixed_cost: 20000
    });

    assert(Array.isArray(result.provenance));
    assert(result.provenance.length >= 6);

    for (const p of result.provenance) {
      assert(p.formulaId, 'Provenance item must contain formulaId');
      assert(p.source, 'Provenance item must contain source');
      assert(p.validationStatus === 'VALIDATED', 'Executed formula must be VALIDATED');
      assert.strictEqual(p.isProductionApproved, true);
    }
  });

  // ── TEST 25: FormulaRegistry is actually used rather than duplicated arithmetic
  await runAsyncTest('TEST 25: FormulaRegistry is actually used rather than duplicated arithmetic', async () => {
    // Spy on registry.executeFormula to guarantee it was invoked
    let formulaCalls = 0;
    const origExecute = defaultRegistry.executeFormula.bind(defaultRegistry);
    defaultRegistry.executeFormula = function(id, inputs) {
      formulaCalls++;
      return origExecute(id, inputs);
    };

    try {
      const result = await runFoodTechBusinessModel({
        businessId: 'FOODTECH_OIL_EXTRACTION',
        raw_material_quantity: 1000,
        raw_material_price: 52.00,
        selling_price: 140.00,
        cake_selling_price: 28.50,
        fixed_cost: 20000
      });

      assert(formulaCalls >= 7, `Expected at least 7 FormulaRegistry calls, received ${formulaCalls}`);
      assert.strictEqual(result.businessStatus, 'CALCULATED');
    } finally {
      defaultRegistry.executeFormula = origExecute;
    }
  });

  // ── TEST 26: Strict safety guarantee: no eval() ────────────────────
  runSyncTest('TEST 26: Strict safety guarantee: no eval()', () => {
    const filesToCheck = [
      'src/services/business/foodtech/foodtechExecutionEngine.js',
      'src/services/business/foodtech/foodtechRegistry.js',
      'src/services/business/foodtech/foodtechFormulas.js',
      'src/services/business/foodtech/massBalance.js'
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      const rawContent = fs.readFileSync(fullPath, 'utf8');
      const cleanCode = rawContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      assert(!/\beval\s*\(/.test(cleanCode), `eval() detected in executable code of ${relPath}`);
    }
  });

  // ── TEST 27: Strict safety guarantee: no new Function() ────────────
  runSyncTest('TEST 27: Strict safety guarantee: no new Function()', () => {
    const filesToCheck = [
      'src/services/business/foodtech/foodtechExecutionEngine.js',
      'src/services/business/foodtech/foodtechRegistry.js',
      'src/services/business/foodtech/foodtechFormulas.js',
      'src/services/business/foodtech/massBalance.js'
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      const rawContent = fs.readFileSync(fullPath, 'utf8');
      const cleanCode = rawContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      assert(!/new\s+Function\s*\(/.test(cleanCode), `new Function() detected in executable code of ${relPath}`);
    }
  });

  // ── TEST 28: Existing Agriculture execution remains unchanged ──────
  await runAsyncTest('TEST 28: Existing Agriculture execution remains unchanged', async () => {
    const agriResult = await runCropFarmingModel({
      crop: 'Wheat',
      area: 2.5,
      areaUnit: 'hectare',
      state: 'Punjab',
      customPricePerQtl: 2275,
      customYieldTonnesPerHa: 4.8
    });

    assert.strictEqual(agriResult.businessStatus, 'COMPLETE');
    assert.strictEqual(agriResult.crop, 'Wheat');
    assert.strictEqual(agriResult.production.quantityTonnes, 12);
    assert(agriResult.costs.cacpCostConcepts.costA1);
    assert(agriResult.costs.cacpCostConcepts.costC2);
    assert(agriResult.profitability.farmBusinessIncome > 0);
  });

  // ── SUMMARY ────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(`FOODTECH EXECUTION ENGINE TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
