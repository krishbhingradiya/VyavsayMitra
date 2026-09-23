/**
 * VYAVSAYMITRA — FoodTech Business Model Foundation & Verified Formula Test Suite (Phase 3 Step 1)
 * 
 * Verifies all 18 mandatory specifications:
 *  1. Registry loads correctly
 *  2. Valid FoodTech business definition
 *  3. Unknown business
 *  4. Missing parameter
 *  5. Invalid parameter
 *  6. Invalid unit
 *  7. Recovery > 100%
 *  8. Negative recovery
 *  9. Impossible mass balance
 * 10. Formula provenance
 * 11. Formula versioning
 * 12. FormulaRegistry integration
 * 13. AST-safe execution
 * 14. No eval()
 * 15. No new Function()
 * 16. Unknown benchmark does not become fake value
 * 17. Research-required formula cannot execute as validated
 * 18. Existing Agriculture tests remain unaffected
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  defaultFoodTechRegistry,
  FoodTechRegistry,
  BUSINESS_STATUSES,
  RESOLUTION_TIERS,
  FOODTECH_PARAMETERS,
  validateFoodTechParameter,
  validateMassBalance,
  FOODTECH_FORMULAS
} = require('../src/services/business/foodtech');

const { defaultRegistry } = require('../src/services/formulaEngine');
const { safeEvaluateExpression } = require('../src/services/formulaEngine/expressionParser');

console.log('======================================================================');
console.log('RUNNING FOODTECH BUSINESS MODEL FOUNDATION TEST SUITE (PHASE 3 STEP 1)');
console.log('======================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
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

// ─────────────────────────────────────────────────────────────────────
// 1. Registry loads correctly
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 1: Registry loads correctly with authoritative institutional models', () => {
  assert(defaultFoodTechRegistry instanceof FoodTechRegistry, 'defaultFoodTechRegistry must be instance of FoodTechRegistry');
  const models = defaultFoodTechRegistry.listBusinessModels();
  assert(models.length >= 5, `Expected at least 5 models, got ${models.length}`);

  const requiredIds = [
    'FOODTECH_FLOUR_MILL',
    'FOODTECH_RICE_MILL',
    'FOODTECH_PULSE_PROCESSING',
    'FOODTECH_OIL_EXTRACTION',
    'FOODTECH_SPICE_PROCESSING'
  ];

  for (const id of requiredIds) {
    const model = defaultFoodTechRegistry.getBusinessModel(id);
    assert(model, `Model '${id}' must be registered`);
    assert.strictEqual(model.businessId, id);
    assert(model.businessName, `Model '${id}' must have businessName`);
    assert(Array.isArray(model.requiredParameters), `Model '${id}' must have requiredParameters`);
    assert(Array.isArray(model.formulaIds), `Model '${id}' must have formulaIds`);
    assert(Array.isArray(model.dataSources) && model.dataSources.length > 0, `Model '${id}' must have verified dataSources`);
    assert.strictEqual(model.status, BUSINESS_STATUSES.VALIDATED);
  }
});

// ─────────────────────────────────────────────────────────────────────
// 2. Valid FoodTech business definition
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 2: Valid FoodTech business definition resolves and validates correctly', () => {
  const resolution = defaultFoodTechRegistry.resolveFoodTechModel('mini flour mill chakki');
  assert.strictEqual(resolution.tier, RESOLUTION_TIERS.KNOWN);
  assert.strictEqual(resolution.businessId, 'FOODTECH_FLOUR_MILL');

  const validation = defaultFoodTechRegistry.validateBusinessInputs('FOODTECH_FLOUR_MILL', {
    raw_material_quantity: 1000,
    raw_material_price: 24.50,
    selling_price: 36.00,
    fixed_cost: 15000,
    labour_cost: 8000,
    electricity_cost: 5000
  });

  assert.strictEqual(validation.isValid, true, `Validation failed: ${validation.errors.join('; ')}`);
  assert.strictEqual(validation.missingParameters.length, 0);
  assert(validation.massBalance, 'Mass balance assessment must be present');
  assert.strictEqual(validation.massBalance.isMassConserved, true);
});

// ─────────────────────────────────────────────────────────────────────
// 3. Unknown business handled cleanly without guessing
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 3: Unknown business returns INSUFFICIENT tier without guessing fake structure', () => {
  const unknownResolution = defaultFoodTechRegistry.resolveFoodTechModel('commercial aircraft engine repair');
  assert.strictEqual(unknownResolution.tier, RESOLUTION_TIERS.INSUFFICIENT);
  assert.strictEqual(unknownResolution.businessId, null);
  assert(Array.isArray(unknownResolution.missingRequirements));
  assert(unknownResolution.missingRequirements.length > 0);

  const emptyResolution = defaultFoodTechRegistry.resolveFoodTechModel({});
  assert.strictEqual(emptyResolution.tier, RESOLUTION_TIERS.INSUFFICIENT);
  assert(emptyResolution.missingRequirements.length >= 3);
});

// ─────────────────────────────────────────────────────────────────────
// 4. Missing parameter
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 4: Missing required parameter fails validation and reports missing parameter ID', () => {
  const validation = defaultFoodTechRegistry.validateBusinessInputs('FOODTECH_FLOUR_MILL', {
    raw_material_quantity: 1000,
    // raw_material_price omitted (no benchmark default allowed for raw procurement price)
    selling_price: 36.00,
    fixed_cost: 15000
  });

  assert.strictEqual(validation.isValid, false, 'Validation must fail when required parameter is missing');
  assert(validation.missingParameters.includes('raw_material_price'));
  assert(validation.errors.some(e => e.includes('raw_material_price')));
});

// ─────────────────────────────────────────────────────────────────────
// 5. Invalid parameter
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 5: Out-of-bounds or negative parameter is caught and rejected', () => {
  const negativePriceValidation = defaultFoodTechRegistry.validateBusinessInputs('FOODTECH_FLOUR_MILL', {
    raw_material_quantity: 1000,
    raw_material_price: -25.0,
    selling_price: 36.0,
    fixed_cost: 15000
  });

  assert.strictEqual(negativePriceValidation.isValid, false);
  assert(negativePriceValidation.errors.some(e => e.includes('raw_material_price') && e.includes('below minimum')));

  const negativeCostValidation = defaultFoodTechRegistry.validateBusinessInputs('FOODTECH_FLOUR_MILL', {
    raw_material_quantity: 1000,
    raw_material_price: 25.0,
    selling_price: 36.0,
    fixed_cost: -500
  });

  assert.strictEqual(negativeCostValidation.isValid, false);
  assert(negativeCostValidation.errors.some(e => e.includes('fixed_cost') && e.includes('below minimum')));
});

// ─────────────────────────────────────────────────────────────────────
// 6. Invalid unit
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 6: Invalid parameter unit returns unit mismatch error', () => {
  const unitCheck = validateFoodTechParameter('raw_material_unit', 'lightyears');
  assert.strictEqual(unitCheck.valid, false);
  assert(unitCheck.error.includes('not among allowed'));

  const unitMismatch = validateFoodTechParameter('raw_material_quantity', 1000, 'litres_per_hectare');
  assert.strictEqual(unitMismatch.valid, false);
  assert(unitMismatch.error.includes('Unit mismatch'));

  // Currency mismatch check
  const currencyMismatch = validateFoodTechParameter('raw_material_price', 25, 'INR/kg', 'USD');
  assert.strictEqual(currencyMismatch.valid, false);
  assert(currencyMismatch.error.includes('Currency mismatch'));

  const unsupportedCurrency = validateFoodTechParameter('raw_material_quantity', 500, 'kg', 'EUR');
  assert.strictEqual(unsupportedCurrency.valid, false);
  assert(unsupportedCurrency.error.includes('Unsupported currency'));
});

// ─────────────────────────────────────────────────────────────────────
// 7. Recovery > 100%
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 7: Recovery rate > 100% is strictly rejected by mass balance engine', () => {
  const result = validateMassBalance({
    rawMaterialInputKg: 1000,
    recoveryRatePct: 108.0
  });

  assert.strictEqual(result.isValid, false);
  assert(result.errors.some(e => e.includes('cannot exceed 100%')));
});

// ─────────────────────────────────────────────────────────────────────
// 8. Negative recovery
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 8: Negative recovery rate is strictly rejected as physically impossible', () => {
  const result = validateMassBalance({
    rawMaterialInputKg: 1000,
    recoveryRatePct: -15.0
  });

  assert.strictEqual(result.isValid, false);
  assert(result.errors.some(e => e.includes('Negative recovery rate') && e.includes('physically impossible')));
});

// ─────────────────────────────────────────────────────────────────────
// 9. Impossible mass balance
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 9: Primary output > input or output streams exceeding input fail mass conservation', () => {
  // Scenario A: Primary finished goods output > raw material intake
  const singleExcess = validateMassBalance({
    rawMaterialInputKg: 500,
    primaryOutputKg: 650
  });
  assert.strictEqual(singleExcess.isValid, false);
  assert(singleExcess.errors.some(e => e.includes('exceeds raw material input')));

  // Scenario B: Combined streams (Primary + Byproducts + Losses) exceed raw intake
  const combinedExcess = validateMassBalance({
    rawMaterialInputKg: 1000,
    primaryOutputKg: 850,
    byproductOutputKg: 250, // 850 + 250 = 1100 kg > 1000 kg
    processingLossKg: 20
  });
  assert.strictEqual(combinedExcess.isValid, false);
  assert(combinedExcess.errors.some(e => e.includes('Mass balance violation')));
});

// ─────────────────────────────────────────────────────────────────────
// 10. Formula provenance
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 10: Executing FoodTech formula produces complete auditable provenance metadata', () => {
  const execution = defaultRegistry.executeFormula('FOODTECH_RAW_MATERIAL_COST', {
    raw_material_quantity: 2500,
    raw_material_price: 26.50
  });

  assert.strictEqual(execution.outputs.raw_material_cost, 66250);
  assert.strictEqual(execution.result, 66250);
  assert(execution.provenance, 'Provenance metadata must be attached');
  assert.strictEqual(execution.provenance.formulaId, 'FOODTECH_RAW_MATERIAL_COST');
  assert.strictEqual(execution.provenance.validationStatus, 'VALIDATED');
  assert.strictEqual(execution.provenance.isProductionApproved, true);
  assert(execution.provenance.source.includes('ICMAI'));
  assert(execution.provenance.sourceURL);
});

// ─────────────────────────────────────────────────────────────────────
// 11. Formula versioning
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 11: Formula versioning retrieves pinned and latest versions accurately', () => {
  const latestFormula = defaultRegistry.getFormula('FOODTECH_OUTPUT_FROM_RECOVERY', 'latest');
  assert(latestFormula);
  assert.strictEqual(latestFormula.version, '1.0.0');

  const pinnedFormula = defaultRegistry.getFormula('FOODTECH_OUTPUT_FROM_RECOVERY', '1.0.0');
  assert(pinnedFormula);
  assert.strictEqual(pinnedFormula.formulaId, 'FOODTECH_OUTPUT_FROM_RECOVERY');

  const nonexistentVersion = defaultRegistry.getFormula('FOODTECH_OUTPUT_FROM_RECOVERY', '99.0.0');
  assert.strictEqual(nonexistentVersion, null);
});

// ─────────────────────────────────────────────────────────────────────
// 12. FormulaRegistry integration
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 12: FoodTech formulas are seeded and executable via central FormulaRegistry', () => {
  const formula = defaultRegistry.getFormula('FOODTECH_OUTPUT_FROM_RECOVERY');
  assert(formula, 'FOODTECH_OUTPUT_FROM_RECOVERY must be registered in defaultRegistry');
  assert.strictEqual(formula.category, 'FOODTECH');

  const result = defaultRegistry.executeFormula('FOODTECH_OUTPUT_FROM_RECOVERY', {
    raw_material_quantity: 1000,
    recovery_rate: 95.0
  });

  assert.strictEqual(result.outputs.finished_product_quantity, 950);
  assert.strictEqual(result.result, 950);

  // Business-Specific: Rice Mill Broken Rice & Head Rice
  const riceBrokenResult = defaultRegistry.executeFormula('FOODTECH_RICE_MILL_BROKEN_RICE_OUTPUT', {
    paddy_input: 1000,
    broken_rice_recovery_rate: 14.0
  });
  assert.strictEqual(riceBrokenResult.outputs.broken_rice_output, 140);

  const riceHeadResult = defaultRegistry.executeFormula('FOODTECH_RICE_MILL_HEAD_RICE_OUTPUT', {
    paddy_input: 1000,
    head_rice_recovery_rate: 53.0
  });
  assert.strictEqual(riceHeadResult.outputs.head_rice_output, 530);

  // Business-Specific: Flour Mill Processing Loss
  const flourLossResult = defaultRegistry.executeFormula('FOODTECH_FLOUR_MILL_PROCESSING_LOSS', {
    wheat_input: 2000,
    processing_loss_rate: 1.2
  });
  assert.strictEqual(flourLossResult.outputs.flour_milling_loss, 24);

  // Business-Specific: Oil Expeller Cake Value
  const oilCakeResult = defaultRegistry.executeFormula('FOODTECH_OIL_EXPELLER_CAKE_VALUE', {
    oil_cake_output: 640,
    cake_selling_price: 28.50
  });
  assert.strictEqual(oilCakeResult.outputs.oil_cake_value, 18240);

  // Generic: Raw Material Requirement from Effective Net Yield
  const rawReqResult = defaultRegistry.executeFormula('FOODTECH_RAW_MATERIAL_FROM_EFFECTIVE_YIELD', {
    target_output: 940,
    effective_yield: 94.0
  });
  assert.strictEqual(rawReqResult.outputs.raw_material_required, 1000);
});

// ─────────────────────────────────────────────────────────────────────
// 13. AST-safe execution
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 13: Mathematical relationships evaluate deterministically via safe AST parser', () => {
  const expr = 'round(fixed_cost / (selling_price - variable_cost_per_unit), 2)';
  const evaluated = safeEvaluateExpression(expr, {
    fixed_cost: 20000,
    selling_price: 36,
    variable_cost_per_unit: 26
  });

  // 20000 / (36 - 26) = 20000 / 10 = 2000
  assert.strictEqual(evaluated.result, 2000);
});

// ─────────────────────────────────────────────────────────────────────
// 14. No eval()
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 14: Strict safety guarantee: eval() is forbidden in calculations and rejected if injected', () => {
  // Check source files for any executable eval usage (excluding comments)
  const filesToCheck = [
    'src/services/formulaEngine/expressionParser.js',
    'src/services/formulaEngine/formulaRegistry.js',
    'src/services/business/foodtech/foodtechFormulas.js',
    'src/services/business/foodtech/foodtechRegistry.js',
    'src/services/business/foodtech/massBalance.js'
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.resolve(__dirname, '..', relPath);
    const rawContent = fs.readFileSync(fullPath, 'utf8');
    const cleanCode = rawContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    assert(!/\beval\s*\(/.test(cleanCode), `eval() detected in executable code of ${relPath}`);
  }

  // Verify that an injected eval expression in safeEvaluateExpression fails
  assert.throws(() => {
    safeEvaluateExpression('eval("1 + 1")', {});
  }, /forbidden pattern|Unsafe expression/i);
});

// ─────────────────────────────────────────────────────────────────────
// 15. No new Function()
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 15: Strict safety guarantee: new Function() is forbidden in calculations and rejected if injected', () => {
  const filesToCheck = [
    'src/services/formulaEngine/expressionParser.js',
    'src/services/formulaEngine/formulaRegistry.js',
    'src/services/business/foodtech/foodtechFormulas.js',
    'src/services/business/foodtech/foodtechRegistry.js',
    'src/services/business/foodtech/massBalance.js'
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.resolve(__dirname, '..', relPath);
    const rawContent = fs.readFileSync(fullPath, 'utf8');
    const cleanCode = rawContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    assert(!/new\s+Function\s*\(/.test(cleanCode), `new Function() detected in executable code of ${relPath}`);
  }

  assert.throws(() => {
    safeEvaluateExpression('Function("return 1")()', {});
  }, /forbidden pattern|Unsafe expression/i);
});

// ─────────────────────────────────────────────────────────────────────
// 16. Unknown benchmark does not become fake value
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 16: Unknown benchmark is not silently converted to zero or fake numbers', () => {
  const validation = defaultFoodTechRegistry.validateBusinessInputs('FOODTECH_FLOUR_MILL', {
    raw_material_quantity: 1000,
    // selling_price omitted
    raw_material_price: 24.50,
    fixed_cost: 15000
  });

  assert.strictEqual(validation.isValid, false);
  assert(validation.missingParameters.includes('selling_price'));
  // Ensure selling price wasn't fabricated into 0
  assert(!validation.errors.some(e => e.includes('selling_price (0)')));
});

// ─────────────────────────────────────────────────────────────────────
// 17. Research-required formula cannot execute as validated
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 17: Research-required formula strictly cannot execute in production as validated', () => {
  const uncalibratedFormula = defaultRegistry.getFormula('FOODTECH_EXTRUSION_EXPANSION_RATIO');
  assert(uncalibratedFormula, 'FOODTECH_EXTRUSION_EXPANSION_RATIO must be registered');
  assert.strictEqual(uncalibratedFormula.status, 'RESEARCH_REQUIRED');

  assert.throws(() => {
    defaultRegistry.executeFormula('FOODTECH_EXTRUSION_EXPANSION_RATIO', {
      die_diameter: 3.5,
      expansion_factor: 2.1
    });
  }, /cannot be executed .* status is 'RESEARCH_REQUIRED'/i);

  // Check additional RESEARCH_REQUIRED formula: Osmotic Dehydration
  const osmoticFormula = defaultRegistry.getFormula('FOODTECH_FRUIT_OSMOTIC_DEHYDRATION_WATER_LOSS');
  assert(osmoticFormula);
  assert.strictEqual(osmoticFormula.status, 'RESEARCH_REQUIRED');
  assert.throws(() => {
    defaultRegistry.executeFormula('FOODTECH_FRUIT_OSMOTIC_DEHYDRATION_WATER_LOSS', {
      initial_fruit_weight: 100,
      mass_transfer_rate: 25
    });
  }, /cannot be executed .* status is 'RESEARCH_REQUIRED'/i);
});

// ─────────────────────────────────────────────────────────────────────
// 18. Existing Agriculture tests remain unaffected
// ─────────────────────────────────────────────────────────────────────
runTest('TEST 18: Existing Agriculture CACP formulas and parameters continue executing perfectly', () => {
  const cacpResult = defaultRegistry.executeFormula('AGRI_CACP_COST_A2', {
    paid_out_operational_expenses: 18500,
    rent_paid_leased_in_land: 3500
  });

  assert.strictEqual(cacpResult.outputs.cost_a2, 22000);
  assert.strictEqual(cacpResult.result, 22000);
  assert.strictEqual(cacpResult.provenance.validationStatus, 'VALIDATED');
  assert.strictEqual(cacpResult.provenance.isProductionApproved, true);
  assert(cacpResult.provenance.source.includes('CACP'));
});

// ─────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────
console.log('\n======================================================================');
console.log(`FOODTECH MODEL FOUNDATION TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
