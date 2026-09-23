/**
 * VYAVSAYMITRA — Production FoodTech Advisory, Viability & Financing Test Suite (Phase 3 Step 4)
 * 
 * Verifies the Advisory & Recommendation Layer:
 *  TEST 1: Valid flour mill produces complete advisory structure
 *  TEST 2: Valid rice mill produces advisory with multi-stream revenue
 *  TEST 3: Valid dal mill produces advisory
 *  TEST 4: Valid oil expeller produces advisory with cake byproduct
 *  TEST 5: Valid spice processing produces advisory
 *  TEST 6: Loss-making business is correctly identified (LOSS_MAKING)
 *  TEST 7: Profitable business is correctly identified (PROFITABLE)
 *  TEST 8: Zero revenue handled safely without NaN or Infinity
 *  TEST 9: Unavailable break-even handled safely with factual reason
 *  TEST 10: Missing investment data handled correctly (INSUFFICIENT_DATA)
 *  TEST 11: Missing financing inputs do not generate fake values
 *  TEST 12: Scheme eligibility does not claim definitive match without required data
 *  TEST 13: Existing provenance is preserved through advisory response
 *  TEST 14: Advisory does not modify underlying calculation outputs
 *  TEST 15: FoodTech FormulaRegistry remains the source of calculations
 *  TEST 16: Unknown FoodTech business handled correctly
 *  TEST 17: Mass-balance violation prevents advisory generation
 *  TEST 18: Strict safety guarantee: no eval()
 *  TEST 19: Strict safety guarantee: no new Function()
 *  TEST 20: Existing Agriculture tests remain unchanged
 *  TEST 21: HTTP POST /api/business/foodtech/advisory returns 200 OK for valid request
 *  TEST 22: HTTP POST /api/business/foodtech/advisory returns 400 Bad Request for mass balance violation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const {
  runFoodTechBusinessModel,
  generateFoodTechAdvisory
} = require('../src/services/business/foodtech');

const { runCropFarmingModel } = require('../src/services/business/cropFarmingModel');
const businessRoutes = require('../src/routes/businessRoutes');

const app = express();
app.use(express.json());
app.use('/api/business', businessRoutes);

console.log('======================================================================');
console.log('RUNNING FOODTECH ADVISORY & FINANCING TEST SUITE (PHASE 3 STEP 4)');
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
    console.error(err);
    failedTests++;
  }
}

async function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}/api/business`;
      resolve({ server, baseUrl });
    });
  });
}

async function runAllTests() {
  // ── TEST 1: Valid flour mill produces complete advisory structure ───
  await runAsyncTest('TEST 1: Valid flour mill produces complete advisory structure', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      byproduct_selling_price: 18.00,
      fixed_cost: 5000,
      labour_cost: 3000,
      electricity_cost: 2000,
      packaging_cost: 1000,
      initial_investment: 150000
    });

    const advisory = generateFoodTechAdvisory(calcResult, { availableCapital: 50000 });

    assert.strictEqual(advisory.advisoryStatus, 'GENERATED');
    assert.strictEqual(advisory.business.businessId, 'FOODTECH_FLOUR_MILL');
    assert.strictEqual(advisory.business.tier, 'KNOWN');

    // Financial summary
    assert(typeof advisory.financialSummary.totalRevenue === 'number');
    assert(typeof advisory.financialSummary.totalCost === 'number');
    assert(typeof advisory.financialSummary.grossProfit === 'number');
    assert(typeof advisory.financialSummary.netProfit === 'number');

    // Viability analysis
    assert(advisory.viabilityAnalysis);
    assert(['PROFITABLE', 'LOSS_MAKING', 'BREAK_EVEN'].includes(advisory.viabilityAnalysis.profitabilityStatus));
    assert(['POSITIVE_MARGIN', 'NEGATIVE_MARGIN', 'ZERO_MARGIN'].includes(advisory.viabilityAnalysis.marginStatus));
    assert(['REACHABLE', 'UNREACHABLE', 'BREAK_EVEN_UNAVAILABLE'].includes(advisory.viabilityAnalysis.breakEvenStatus));

    // Cost analysis
    assert(Array.isArray(advisory.costAnalysis.components));
    assert(advisory.costAnalysis.largestCostComponent);
    assert(typeof advisory.costAnalysis.largestCostSharePct === 'number');

    // Revenue analysis
    assert(advisory.revenueAnalysis.totalRevenue > 0);
    assert(advisory.revenueAnalysis.hasByproductCommercialization);

    // Advisory items & Provenance
    assert(Array.isArray(advisory.advisory));
    assert(advisory.advisory.length >= 3);
    assert(advisory.provenance.length >= 8);
  });

  // ── TEST 2: Valid rice mill produces advisory with multi-stream revenue
  await runAsyncTest('TEST 2: Valid rice mill produces advisory with multi-stream revenue', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_RICE_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 22.00,
      selling_price: 42.00,
      byproduct_selling_price: 12.00,
      fixed_cost: 8000,
      labour_cost: 4000,
      electricity_cost: 3000
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.advisoryStatus, 'GENERATED');
    assert.strictEqual(advisory.business.businessId, 'FOODTECH_RICE_MILL');
    assert(advisory.revenueAnalysis.primaryRevenue > 0);
    assert(advisory.revenueAnalysis.byproductRevenue > 0);
    assert(advisory.revenueAnalysis.byproductRevenueSharePct > 0);
  });

  // ── TEST 3: Valid dal mill produces advisory ────────────────────────
  await runAsyncTest('TEST 3: Valid dal mill produces advisory', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_PULSE_PROCESSING',
      raw_material_quantity: 1000,
      raw_material_price: 65.00,
      selling_price: 95.00,
      byproduct_selling_price: 22.00,
      fixed_cost: 10000,
      labour_cost: 5000,
      electricity_cost: 3000
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.advisoryStatus, 'GENERATED');
    assert.strictEqual(advisory.business.businessId, 'FOODTECH_PULSE_PROCESSING');
    assert(advisory.costAnalysis.components.some(c => c.component === 'Raw Material Procurement'));
  });

  // ── TEST 4: Valid oil expeller produces advisory with cake byproduct ─
  await runAsyncTest('TEST 4: Valid oil expeller produces advisory with cake byproduct', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_OIL_EXTRACTION',
      raw_material_quantity: 1000,
      raw_material_price: 52.00,
      selling_price: 145.00,
      cake_selling_price: 28.00,
      fixed_cost: 12000,
      labour_cost: 6000,
      electricity_cost: 4000
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.advisoryStatus, 'GENERATED');
    assert.strictEqual(advisory.business.businessId, 'FOODTECH_OIL_EXTRACTION');
    assert(advisory.revenueAnalysis.hasByproductCommercialization);
  });

  // ── TEST 5: Valid spice processing produces advisory ────────────────
  await runAsyncTest('TEST 5: Valid spice processing produces advisory', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_SPICE_PROCESSING',
      raw_material_quantity: 500,
      raw_material_price: 180.00,
      selling_price: 280.00,
      fixed_cost: 12000,
      labour_cost: 6000,
      electricity_cost: 3500
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.advisoryStatus, 'GENERATED');
    assert.strictEqual(advisory.business.businessId, 'FOODTECH_SPICE_PROCESSING');
    assert(advisory.viabilityAnalysis);
  });

  // ── TEST 6: Loss-making business is correctly identified ────────────
  await runAsyncTest('TEST 6: Loss-making business is correctly identified (LOSS_MAKING)', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 30.00, // Expensive wheat
      selling_price: 20.00,      // Below cost
      fixed_cost: 25000,         // High fixed cost
      labour_cost: 10000,
      electricity_cost: 8000
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.viabilityAnalysis.profitabilityStatus, 'LOSS_MAKING');
    assert.strictEqual(advisory.viabilityAnalysis.investmentRecoveryStatus, 'NON_RECOVERABLE');
    assert(advisory.advisory.some(a => a.type === 'FINANCIAL_HEALTH' && a.message.includes('deficit')));
  });

  // ── TEST 7: Profitable business is correctly identified ─────────────
  await runAsyncTest('TEST 7: Profitable business is correctly identified (PROFITABLE)', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 20.00,
      selling_price: 45.00,
      byproduct_selling_price: 18.00,
      fixed_cost: 3000,
      labour_cost: 2000,
      electricity_cost: 1500,
      initial_investment: 100000
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.viabilityAnalysis.profitabilityStatus, 'PROFITABLE');
    assert.strictEqual(advisory.viabilityAnalysis.marginStatus, 'POSITIVE_MARGIN');
    assert(advisory.advisory.some(a => a.type === 'FINANCIAL_HEALTH' && a.message.includes('positive operational profitability')));
  });

  // ── TEST 8: Zero revenue handled safely ─────────────────────────────
  await runAsyncTest('TEST 8: Zero revenue handled safely without NaN or Infinity', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 0, // Zero revenue
      fixed_cost: 10000
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.financialSummary.totalRevenue, 0);
    assert.strictEqual(advisory.revenueAnalysis.primaryRevenueSharePct, null);
    assert.strictEqual(advisory.revenueAnalysis.byproductRevenueSharePct, null);
    assert.strictEqual(advisory.viabilityAnalysis.marginStatus, 'MARGIN_UNAVAILABLE');
  });

  // ── TEST 9: Unavailable break-even handled safely with factual reason
  await runAsyncTest('TEST 9: Unavailable break-even handled safely with factual reason', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 10.00, // Price < Unit variable cost
      fixed_cost: 10000
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.breakEvenAnalysis.status, 'UNREACHABLE');
    assert(advisory.breakEvenAnalysis.reason.includes('less than or equal to unit variable cost'));
    assert(advisory.advisory.some(a => a.type === 'BREAK_EVEN_GUIDANCE' && a.message.includes('unreachable')));
  });

  // ── TEST 10: Missing investment data handled correctly ──────────────
  await runAsyncTest('TEST 10: Missing investment data handled correctly (INSUFFICIENT_DATA)', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      fixed_cost: 10000
      // initial_investment omitted
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.investmentAnalysis.status, 'INSUFFICIENT_DATA');
    assert.strictEqual(advisory.investmentAnalysis.initialInvestment, null);
    assert.strictEqual(advisory.investmentAnalysis.roiPct, null);
    assert.strictEqual(advisory.investmentAnalysis.paybackPeriodYears, null);
  });

  // ── TEST 11: Missing financing inputs do not generate fake values ───
  await runAsyncTest('TEST 11: Missing financing inputs do not generate fake values', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      fixed_cost: 10000
    });

    const advisory = generateFoodTechAdvisory(calcResult, {});
    assert.strictEqual(advisory.financingAnalysis.ownContribution, null);
    assert.strictEqual(advisory.financingAnalysis.loanAmount, null);
    assert.strictEqual(advisory.financingAnalysis.fundingGap, null);
    assert.strictEqual(advisory.financingAnalysis.financingStatus, 'INSUFFICIENT_INPUTS');
  });

  // ── TEST 12: Scheme eligibility does not claim definitive match ─────
  await runAsyncTest('TEST 12: Scheme eligibility does not claim definitive match without required data', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      fixed_cost: 10000,
      initial_investment: 200000
    });

    const advisory = generateFoodTechAdvisory(calcResult, {});
    assert(advisory.schemeRecommendations.length > 0);

    const pmfme = advisory.schemeRecommendations.find(s => s.schemeId === 'pmfme_micro_food');
    assert(pmfme);
    assert.strictEqual(pmfme.eligibilityStatus, 'POTENTIAL_MATCH');
    assert(pmfme.missingEligibilityInputs.length > 0);

    const pmegp = advisory.schemeRecommendations.find(s => s.schemeId === 'pmegp');
    assert(pmegp);
    assert.strictEqual(pmegp.eligibilityStatus, 'POTENTIAL_MATCH');
    assert(pmegp.missingEligibilityInputs.includes('promoter_age (Must be 18+ years)'));
  });

  // ── TEST 13: Existing provenance is preserved through advisory ──────
  await runAsyncTest('TEST 13: Existing provenance is preserved through advisory response', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      fixed_cost: 10000
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert(Array.isArray(advisory.provenance));
    assert(advisory.provenance.length >= 8);
    assert(advisory.provenance.some(p => p.formulaId === 'FOODTECH_FLOUR_MILL_ATOMIC_FLOUR_OUTPUT'));
  });

  // ── TEST 14: Advisory does not modify underlying calculation outputs
  await runAsyncTest('TEST 14: Advisory does not modify underlying calculation outputs', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      raw_material_price: 24.50,
      selling_price: 36.00,
      byproduct_selling_price: 18.00,
      fixed_cost: 15000,
      labour_cost: 8000,
      electricity_cost: 5000
    });

    const originalRevenue = calcResult.revenue.totalRevenue;
    const originalCost = calcResult.costs.totalCost;
    const originalNetProfit = calcResult.profitability.netProfit;

    const advisory = generateFoodTechAdvisory(calcResult);

    assert.strictEqual(advisory.financialSummary.totalRevenue, originalRevenue);
    assert.strictEqual(advisory.financialSummary.totalCost, originalCost);
    assert.strictEqual(advisory.financialSummary.netProfit, originalNetProfit);
    assert.strictEqual(calcResult.revenue.totalRevenue, originalRevenue);
  });

  // ── TEST 15: FoodTech FormulaRegistry remains the source of calculations
  await runAsyncTest('TEST 15: FoodTech FormulaRegistry remains the source of calculations', async () => {
    const advisoryModule = fs.readFileSync(
      path.join(__dirname, '../src/services/business/foodtech/foodtechAdvisoryService.js'),
      'utf-8'
    );
    // Advisory service must not compute raw multiplications of price * quantity or margin = profit / rev
    assert(!advisoryModule.includes('raw_material_quantity * raw_material_price'));
    assert(!advisoryModule.includes('paddy_input * total_rice_recovery_rate'));
  });

  // ── TEST 16: Unknown FoodTech business handled correctly ────────────
  await runAsyncTest('TEST 16: Unknown FoodTech business returns appropriate non-calculated response', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'UNKNOWN_NON_EXISTENT_BUSINESS'
    });

    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.advisoryStatus, 'CALCULATION_UNAVAILABLE');
    assert.strictEqual(advisory.businessStatus, 'INSUFFICIENT_INPUTS');
  });

  // ── TEST 17: Mass-balance violation prevents advisory generation ────
  await runAsyncTest('TEST 17: Mass-balance violation prevents advisory generation', async () => {
    const calcResult = await runFoodTechBusinessModel({
      businessId: 'FOODTECH_FLOUR_MILL',
      raw_material_quantity: 1000,
      recovery_rate: 110.0, // Violation > 100%
      selling_price: 36.00
    });

    assert.strictEqual(calcResult.businessStatus, 'MASS_BALANCE_VIOLATION');
    const advisory = generateFoodTechAdvisory(calcResult);
    assert.strictEqual(advisory.advisoryStatus, 'CALCULATION_UNAVAILABLE');
    assert.strictEqual(advisory.businessStatus, 'MASS_BALANCE_VIOLATION');
  });

  // ── TEST 18: Strict safety guarantee: no eval() ─────────────────────
  await runAsyncTest('TEST 18: Strict safety guarantee: no eval()', async () => {
    const advisoryCode = fs.readFileSync(
      path.join(__dirname, '../src/services/business/foodtech/foodtechAdvisoryService.js'),
      'utf-8'
    );
    const codeWithoutComments = advisoryCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const hasEval = /\beval\s*\(/.test(codeWithoutComments);
    assert.strictEqual(hasEval, false, 'foodtechAdvisoryService.js must contain zero eval() calls');
  });

  // ── TEST 19: Strict safety guarantee: no new Function() ────────────
  await runAsyncTest('TEST 19: Strict safety guarantee: no new Function()', async () => {
    const advisoryCode = fs.readFileSync(
      path.join(__dirname, '../src/services/business/foodtech/foodtechAdvisoryService.js'),
      'utf-8'
    );
    const codeWithoutComments = advisoryCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const hasNewFunction = /new\s+Function\s*\(/.test(codeWithoutComments);
    assert.strictEqual(hasNewFunction, false, 'foodtechAdvisoryService.js must contain zero new Function() calls');
  });

  // ── TEST 20: Existing Agriculture execution remains unchanged ──────
  await runAsyncTest('TEST 20: Existing Agriculture execution remains unchanged', async () => {
    const agriResult = await runCropFarmingModel({
      crop: 'Wheat',
      state: 'Maharashtra',
      district: 'Pune',
      area: 2.0,
      area_unit: 'hectare'
    });
    assert.strictEqual(agriResult.businessStatus, 'COMPLETE');
    assert(agriResult.costs.cacpCostConcepts.costC2.value > 0);
    assert(agriResult.costs.total > 0);
  });

  // ── TEST 21: HTTP POST /api/business/foodtech/advisory (200 OK) ────
  const { server, baseUrl } = await startServer();
  try {
    await runAsyncTest('TEST 21: HTTP POST /foodtech/advisory returns 200 OK for valid request', async () => {
      const res = await fetch(`${baseUrl}/foodtech/advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_FLOUR_MILL',
          raw_material_quantity: 1000,
          raw_material_price: 24.50,
          selling_price: 36.00,
          byproduct_selling_price: 18.00,
          fixed_cost: 15000,
          labour_cost: 8000,
          electricity_cost: 5000,
          availableCapital: 50000
        })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.advisoryStatus, 'GENERATED');
      assert.strictEqual(json.data.business.businessId, 'FOODTECH_FLOUR_MILL');
      assert(json.data.viabilityAnalysis);
      assert(json.data.costAnalysis);
      assert(json.data.revenueAnalysis);
      assert(json.data.financingAnalysis);
      assert(Array.isArray(json.data.schemeRecommendations));
      assert(Array.isArray(json.data.advisory));
    });

    // ── TEST 22: HTTP POST /api/business/foodtech/advisory (400 Bad Request)
    await runAsyncTest('TEST 22: HTTP POST /foodtech/advisory returns 400 Bad Request for mass balance violation', async () => {
      const res = await fetch(`${baseUrl}/foodtech/advisory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_FLOUR_MILL',
          raw_material_quantity: 1000,
          recovery_rate: 110.0, // Violation > 100%
          selling_price: 36.00
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.status, 'MASS_BALANCE_VIOLATION');
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log('\n======================================================================');
  console.log(`FOODTECH ADVISORY TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
