/**
 * VYAVSAYMITRA — Formula Engine Foundation & Safety Test Suite (Phase 1)
 * 
 * Verifies all 12 mandatory criteria:
 * 1. Valid formula definition
 * 2. Missing source rejection / unverified marking
 * 3. Invalid formula syntax
 * 4. Unknown parameter rejection
 * 5. Missing parameter rejection
 * 6. Invalid unit / type bounds enforcement
 * 7. Division by zero prevention
 * 8. Unsafe expression rejection (eval, Function, injection)
 * 9. Circular dependency detection
 * 10. Formula versioning
 * 11. Provenance traceability
 * 12. Formula status transitions
 * 13. Sourced initial formulas (Finance, Agriculture, FoodTech)
 */

const assert = require('assert');
const {
  FormulaRegistry,
  defaultRegistry,
  validateFormulaDefinition,
  createFormulaDefinition,
  transitionFormulaStatus,
  FORMULA_STATUSES,
  validateParameterDefinition,
  createParameterDefinition,
  validateParameterValue,
  DATA_STATUSES,
  tokenize,
  ExpressionParser,
  safeEvaluateExpression,
  DependencyResolver,
  buildFormulaProvenance,
  auditFormulaProvenance
} = require('../src/services/formulaEngine');

function runTests() {
  console.log('======================================================================');
  console.log('RUNNING FORMULA ENGINE FOUNDATION, SAFETY & PROVENANCE TEST SUITE');
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

  // ─── 1. Valid Formula Definition ────────────────────────────────────
  test('1. Valid formula definition and execution', () => {
    const registry = new FormulaRegistry();
    const formulaDef = registry.registerFormula({
      formulaId: 'TEST_REVENUE',
      formulaName: 'Test Revenue Formula',
      category: 'FINANCE',
      expression: 'price * quantity',
      inputs: [
        { parameterId: 'price', name: 'Price', dataType: 'number', unit: 'INR', required: true },
        { parameterId: 'quantity', name: 'Quantity', dataType: 'number', unit: 'units', required: true }
      ],
      outputs: ['revenue'],
      units: { price: 'INR', quantity: 'units', revenue: 'INR' },
      source: 'ICAI AS-9 Standard',
      sourceDate: '2024-01-01',
      methodology: 'Gross sales revenue calculation',
      status: FORMULA_STATUSES.VALIDATED,
      version: '1.0.0'
    });

    assert.strictEqual(formulaDef.status, FORMULA_STATUSES.VALIDATED);
    assert.strictEqual(formulaDef.sourceStatus, 'VERIFIED');

    const result = registry.executeFormula('TEST_REVENUE', { price: 50, quantity: 100 });
    assert.strictEqual(result.result, 5000);
    assert.strictEqual(result.outputs.revenue, 5000);
    assert.strictEqual(result.provenance.source, 'ICAI AS-9 Standard');
  });

  // ─── 2. Missing Source ──────────────────────────────────────────────
  test('2. Missing source marks UNVERIFIED and rejects VALIDATED status', () => {
    // A formula without an authoritative source cannot be created with status VALIDATED
    assert.throws(() => {
      createFormulaDefinition({
        formulaId: 'UNSOURCED_FORMULA',
        formulaName: 'Guesswork Formula',
        category: 'FINANCE',
        expression: 'a + b',
        inputs: ['a', 'b'],
        outputs: ['c'],
        source: '', // Missing source!
        methodology: 'None',
        status: FORMULA_STATUSES.VALIDATED,
        version: '1.0.0'
      });
    }, /CANNOT be marked VALIDATED without an identified, verifiable source authority/);

    // If source is missing or UNVERIFIED under RESEARCH_REQUIRED, it must be explicitly labeled UNVERIFIED
    const researchFormula = createFormulaDefinition({
      formulaId: 'CANDIDATE_FORMULA',
      formulaName: 'Candidate Formula',
      category: 'AGRICULTURE',
      expression: 'a * 2',
      inputs: ['a'],
      outputs: ['b'],
      source: 'UNVERIFIED',
      methodology: 'Preliminary hypothesis',
      status: FORMULA_STATUSES.RESEARCH_REQUIRED,
      version: '1.0.0'
    });

    assert.strictEqual(researchFormula.sourceStatus, 'UNVERIFIED');
    const prov = buildFormulaProvenance(researchFormula);
    assert.strictEqual(prov.sourceStatus, 'UNVERIFIED');
    assert.ok(prov.warning.includes('UNVERIFIED'));
  });

  // ─── 3. Invalid Formula Syntax ──────────────────────────────────────
  test('3. Invalid formula syntax is caught and rejected by AST parser', () => {
    // Malformed operator sequence
    assert.throws(() => {
      safeEvaluateExpression('price * * quantity', { price: 10, quantity: 5 });
    }, /Syntax Error/);

    // Unclosed parenthesis
    assert.throws(() => {
      safeEvaluateExpression('(price + quantity', { price: 10, quantity: 5 });
    }, /Syntax Error|Unexpected trailing/);

    // Malformed number with multiple dots
    assert.throws(() => {
      safeEvaluateExpression('10..5 + quantity', { quantity: 5 });
    }, /Malformed number/);

    // Unexpected character
    assert.throws(() => {
      safeEvaluateExpression('price @ quantity', { price: 10, quantity: 5 });
    }, /Unexpected character '@'/);
  });

  // ─── 4. Unknown Parameter ───────────────────────────────────────────
  test('4. Unknown parameter in expression is detected and rejected', () => {
    const expr = 'fixed_cost + variable_cost + ghost_variable';
    assert.throws(() => {
      safeEvaluateExpression(expr, { fixed_cost: 1000, variable_cost: 500 });
    }, /Unknown variable 'ghost_variable'/);
  });

  // ─── 5. Missing Parameter ───────────────────────────────────────────
  test('5. Missing parameter fails cleanly when required input is omitted', () => {
    const registry = new FormulaRegistry();
    registry.registerFormula({
      formulaId: 'TEST_PROFIT',
      formulaName: 'Profit Formula',
      category: 'FINANCE',
      expression: 'revenue - cost',
      inputs: ['revenue', 'cost'],
      outputs: ['profit'],
      source: 'ICAI Accounting Standard',
      sourceDate: '2024-01-01',
      methodology: 'Accounting surplus calculation',
      status: FORMULA_STATUSES.VALIDATED,
      version: '1.0.0'
    });

    assert.throws(() => {
      registry.executeFormula('TEST_PROFIT', { revenue: 10000 }); // 'cost' is missing!
    }, /Missing required parameter 'cost'/);
  });

  // ─── 6. Invalid Unit / Type Enforcement ─────────────────────────────
  test('6. Invalid unit and out-of-bounds parameter values are rejected', () => {
    const paramDef = createParameterDefinition({
      parameterId: 'recovery_rate_pct',
      name: 'Recovery Rate',
      dataType: 'number',
      unit: 'PERCENT',
      minimum: 1,
      maximum: 100,
      required: true,
      dataStatus: 'VERIFIED_DATA'
    });

    // Valid bounds
    const validCheck = validateParameterValue(paramDef, 75);
    assert.strictEqual(validCheck.valid, true);
    assert.strictEqual(validCheck.value, 75);

    // Negative out-of-bounds
    const lowCheck = validateParameterValue(paramDef, -5);
    assert.strictEqual(lowCheck.valid, false);
    assert.ok(lowCheck.errors[0].includes('is less than minimum'));

    // Exceeds 100%
    const highCheck = validateParameterValue(paramDef, 125);
    assert.strictEqual(highCheck.valid, false);
    assert.ok(highCheck.errors[0].includes('exceeds maximum'));

    // Non-numeric string
    const stringCheck = validateParameterValue(paramDef, 'not_a_number');
    assert.strictEqual(stringCheck.valid, false);
    assert.ok(stringCheck.errors[0].includes('requires a valid numeric value'));

    // UNKNOWN parameter dataStatus must NEVER be silently converted into a real value
    const unknownCheck = validateParameterValue(paramDef, 50, DATA_STATUSES.UNKNOWN);
    assert.strictEqual(unknownCheck.valid, false);
    assert.strictEqual(unknownCheck.value, null);
    assert.ok(unknownCheck.errors[0].includes('cannot convert to real value'));
  });

  // ─── 7. Division by Zero ────────────────────────────────────────────
  test('7. Division by zero is intercepted and throws clean descriptive error', () => {
    assert.throws(() => {
      safeEvaluateExpression('fixed_cost / units_produced', { fixed_cost: 50000, units_produced: 0 });
    }, /Division by zero encountered in formula execution/);

    assert.throws(() => {
      safeEvaluateExpression('fixed_cost % modulus_base', { fixed_cost: 50000, modulus_base: 0 });
    }, /Modulo by zero encountered in formula execution/);
  });

  // ─── 8. Unsafe Expression Rejection ─────────────────────────────────
  test('8. Unsafe expressions (eval, Function, injections) are strictly rejected', () => {
    // eval()
    assert.throws(() => {
      tokenize('eval("2 + 2")');
    }, /Unsafe expression rejected: forbidden pattern 'eval\\b'/);

    // new Function()
    assert.throws(() => {
      tokenize('function() { return 1; }()');
    }, /Unsafe expression rejected: forbidden pattern 'function\\b'/);

    // Arrow functions
    assert.throws(() => {
      tokenize('x => x * 2');
    }, /Unsafe expression rejected: forbidden pattern '=>'/);

    // process / require
    assert.throws(() => {
      tokenize('process.exit(1)');
    }, /Unsafe expression rejected: forbidden pattern 'process\\b'/);

    // Prototype pollution attempt
    assert.throws(() => {
      tokenize('__proto__.polluted = 1');
    }, /Unsafe expression rejected: forbidden pattern '__proto__'/);

    // Semicolon injection
    assert.throws(() => {
      tokenize('price * 10; doSomethingBad()');
    }, /Unsafe expression rejected/);

    // Bracket / template string injection
    assert.throws(() => {
      tokenize('`template string ${price}`');
    }, /Unsafe expression rejected/);
  });

  // ─── 9. Circular Dependency ─────────────────────────────────────────
  test('9. Circular dependency is detected in formula graph and prevented', () => {
    const resolver = new DependencyResolver();

    // Formula A needs 'b_output' to produce 'a_output'
    resolver.addFormula({
      formulaId: 'FORMULA_A',
      inputs: ['b_output'],
      outputs: ['a_output']
    });

    // Formula B needs 'c_output' to produce 'b_output'
    resolver.addFormula({
      formulaId: 'FORMULA_B',
      inputs: ['c_output'],
      outputs: ['b_output']
    });

    // Formula C needs 'a_output' to produce 'c_output' -> Creates cycle A -> B -> C -> A
    resolver.addFormula({
      formulaId: 'FORMULA_C',
      inputs: ['a_output'],
      outputs: ['c_output']
    });

    const cycleResult = resolver.detectCircularDependency();
    assert.strictEqual(cycleResult.hasCycle, true);
    assert.ok(Array.isArray(cycleResult.cycle));
    assert.ok(cycleResult.cycle.length >= 3);

    assert.throws(() => {
      resolver.resolveExecutionOrder();
    }, /Circular dependency detected in formula pipeline/);
  });

  // ─── 10. Formula Versioning ─────────────────────────────────────────
  test('10. Formula semantic versioning stores and retrieves specified versions', () => {
    const registry = new FormulaRegistry();

    registry.registerFormula({
      formulaId: 'TAX_FORMULA',
      formulaName: 'Tax v1',
      category: 'FINANCE',
      expression: 'income * 0.10',
      inputs: ['income'],
      outputs: ['tax'],
      source: 'Finance Act 2024',
      sourceDate: '2024-01-01',
      methodology: 'Flat 10% rate',
      status: FORMULA_STATUSES.VALIDATED,
      version: '1.0.0'
    });

    registry.registerFormula({
      formulaId: 'TAX_FORMULA',
      formulaName: 'Tax v2 (Updated Slab)',
      category: 'FINANCE',
      expression: 'income * 0.15',
      inputs: ['income'],
      outputs: ['tax'],
      source: 'Finance Act 2025',
      sourceDate: '2025-01-01',
      methodology: 'Revised 15% rate',
      status: FORMULA_STATUSES.VALIDATED,
      version: '2.0.0'
    });

    // Default 'latest' should be 2.0.0
    const latest = registry.getFormula('TAX_FORMULA');
    assert.strictEqual(latest.version, '2.0.0');

    // Pinned version 1.0.0 should be accessible
    const v1 = registry.getFormula('TAX_FORMULA', '1.0.0');
    assert.strictEqual(v1.version, '1.0.0');
    assert.strictEqual(v1.expression, 'income * 0.10');

    // Execution with pinned version
    const resV1 = registry.executeFormula('TAX_FORMULA', { income: 1000 }, { version: '1.0.0' });
    assert.strictEqual(resV1.result, 100);

    const resV2 = registry.executeFormula('TAX_FORMULA', { income: 1000 });
    assert.strictEqual(resV2.result, 150);
  });

  // ─── 11. Provenance Traceability ────────────────────────────────────
  test('11. Complete provenance metadata attached and verified in execution', () => {
    const formula = defaultRegistry.getFormula('FIN_BREAK_EVEN_QUANTITY');
    assert.ok(formula);
    assert.strictEqual(formula.sourceStatus, 'VERIFIED');
    assert.ok(formula.source.includes('ICMAI'));
    assert.ok(formula.sourceURL);
    assert.ok(formula.sourceDate);

    const execResult = defaultRegistry.executeFormula('FIN_BREAK_EVEN_QUANTITY', {
      fixed_cost: 100000,
      selling_price: 50,
      variable_cost_per_unit: 30
    });

    // Contribution margin = 50 - 30 = 20. Break-even = 100,000 / 20 = 5000 units
    assert.strictEqual(execResult.result, 5000);
    assert.ok(execResult.provenance);
    assert.strictEqual(execResult.provenance.sourceStatus, 'VERIFIED');
    assert.strictEqual(execResult.provenance.priorityRank, 2);
    assert.strictEqual(execResult.provenance.isProductionApproved, true);
  });

  // ─── 12. Formula Status Transitions ─────────────────────────────────
  test('12. Formula status transitions enforce valid lifecycle paths', () => {
    const formula = createFormulaDefinition({
      formulaId: 'DYNAMIC_YIELD',
      formulaName: 'Dynamic Yield Predictor',
      category: 'AGRICULTURE',
      expression: 'base_yield * 1.1',
      inputs: ['base_yield'],
      outputs: ['projected_yield'],
      source: 'ICAR Agronomic Research Paper 2024',
      sourceDate: '2024-03-01',
      methodology: 'Empirical multiplier',
      status: FORMULA_STATUSES.RESEARCH_REQUIRED,
      version: '1.0.0'
    });

    // 1. RESEARCH_REQUIRED -> SOURCE_IDENTIFIED (Valid)
    const step1 = transitionFormulaStatus(formula, FORMULA_STATUSES.SOURCE_IDENTIFIED, 'Source paper located');
    assert.strictEqual(step1.status, FORMULA_STATUSES.SOURCE_IDENTIFIED);

    // 2. SOURCE_IDENTIFIED -> VALIDATING (Valid)
    const step2 = transitionFormulaStatus(step1, FORMULA_STATUSES.VALIDATING, 'Running historical benchmark checks');
    assert.strictEqual(step2.status, FORMULA_STATUSES.VALIDATING);

    // 3. VALIDATING -> VALIDATED (Valid because source is verified)
    const step3 = transitionFormulaStatus(step2, FORMULA_STATUSES.VALIDATED, 'Benchmark passed error tolerance');
    assert.strictEqual(step3.status, FORMULA_STATUSES.VALIDATED);

    // 4. Illegal jump: VALIDATED -> SOURCE_IDENTIFIED (Must throw error)
    assert.throws(() => {
      transitionFormulaStatus(step3, FORMULA_STATUSES.SOURCE_IDENTIFIED);
    }, /Illegal lifecycle transition/);

    // 5. Formula with UNVERIFIED source cannot transition to VALIDATED
    const unverifiedFormula = createFormulaDefinition({
      formulaId: 'UNSOURCED_TEST',
      formulaName: 'Unsourced',
      category: 'FOODTECH',
      expression: 'x * 2',
      inputs: ['x'],
      outputs: ['y'],
      source: 'UNVERIFIED',
      methodology: '',
      status: FORMULA_STATUSES.RESEARCH_REQUIRED,
      version: '1.0.0'
    });

    const stepUnv = transitionFormulaStatus(unverifiedFormula, FORMULA_STATUSES.SOURCE_IDENTIFIED);
    const stepVal = transitionFormulaStatus(stepUnv, FORMULA_STATUSES.VALIDATING);

    assert.throws(() => {
      transitionFormulaStatus(stepVal, FORMULA_STATUSES.VALIDATED);
    }, /Cannot transition formula .* to VALIDATED without verified source/);
  });

  // ─── 13. Sourced Agriculture & FoodTech Initial Formulas ────────────
  test('13. Curated Agriculture (CACP Cost C2) & FoodTech (MoFPI Mass Balance) formulas execute accurately', () => {
    // 1. CACP Cost A2
    const costA2Res = defaultRegistry.executeFormula('AGRI_CACP_COST_A2', {
      paid_out_operational_expenses: 35000,
      rent_paid_leased_in_land: 5000
    });
    assert.strictEqual(costA2Res.result, 40000);

    // 2. CACP Cost A2+FL (MSP Benchmark)
    const costA2FLRes = defaultRegistry.executeFormula('AGRI_CACP_COST_A2_FL', {
      cost_a2: 40000,
      imputed_family_labour_value: 12000
    });
    assert.strictEqual(costA2FLRes.result, 52000);

    // 3. CACP Comprehensive Cost C2
    const costC2Res = defaultRegistry.executeFormula('AGRI_CACP_COMPREHENSIVE_COST_C2', {
      cost_a2_fl: 52000,
      imputed_interest_owned_capital: 3000,
      imputed_rental_owned_land: 8000
    });
    assert.strictEqual(costC2Res.result, 63000);

    // 4. Break-even Mandi Modal Price per Quintal (Cost C2 / Production)
    // Production = 30 Quintals, Total Cost C2 = 63,000 -> Price = 2,100 INR/qtl
    const breakEvenMandiRes = defaultRegistry.executeFormula('AGRI_BREAK_EVEN_MANDI_PRICE', {
      cost_c2: 63000,
      production_volume_qtl: 30
    });
    assert.strictEqual(breakEvenMandiRes.result, 2100);

    // 5. FoodTech Gross Raw Material Intake Requirement
    // Target = 10,000 kg, Loss = 4%, Recovery = 96%
    // 10000 / ((1 - 0.04) * 0.96) = 10000 / (0.96 * 0.96) = 10000 / 0.9216 = 10850.69 kg
    const rawReqRes = defaultRegistry.executeFormula('FOODTECH_RAW_MATERIAL_REQUIREMENT', {
      finished_goods_target: 10000,
      processing_loss_pct: 4,
      recovery_rate_pct: 96
    });
    assert.strictEqual(rawReqRes.result, 10850.69);

    // 6. FoodTech Byproduct Output (Wheat Bran / Chokar @ 4%)
    // Intake = 10,850.69 kg * 4% = 434.03 kg
    const byproductRes = defaultRegistry.executeFormula('FOODTECH_BYPRODUCT_OUTPUT', {
      raw_material_intake: 10850.69,
      byproduct_recovery_pct: 4
    });
    assert.strictEqual(byproductRes.result, 434.03);

    // 7. Unvalidated formula status check: AGRI_CROP_WATER_EVAPOTRANSPIRATION must be RESEARCH_REQUIRED and blocked from production execution
    const waterFormula = defaultRegistry.getFormula('AGRI_CROP_WATER_EVAPOTRANSPIRATION');
    assert.strictEqual(waterFormula.status, FORMULA_STATUSES.RESEARCH_REQUIRED);

    assert.throws(() => {
      defaultRegistry.executeFormula('AGRI_CROP_WATER_EVAPOTRANSPIRATION', {
        crop_reference_et0: 5.2,
        crop_coefficient_kc: 1.15
      });
    }, /cannot be executed as an authoritative business formula because its status is 'RESEARCH_REQUIRED'/);

    // But can execute when allowUnvalidated: true is explicitly passed for research simulation
    const simRes = defaultRegistry.executeFormula('AGRI_CROP_WATER_EVAPOTRANSPIRATION', {
      crop_reference_et0: 5.2,
      crop_coefficient_kc: 1.15
    }, { allowUnvalidated: true });
    assert.strictEqual(simRes.result, 5.98);
  });

  console.log('\n======================================================================');
  console.log(`FORMULA ENGINE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
