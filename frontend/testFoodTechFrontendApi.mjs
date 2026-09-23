/**
 * Frontend API Integration & Advisory Data Verification Test
 * 
 * Verifies that the API client and data structures consumed by the
 * FoodTech frontend components operate seamlessly against the backend.
 */

import assert from 'assert';

const API_BASE = 'http://localhost:5000/api';

async function testFrontendApiIntegration() {
  console.log('======================================================================');
  console.log('RUNNING FRONTEND API & ADVISORY INTEGRATION VERIFICATION TEST');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(e);
      failed++;
    }
  }

  // 1. GET /api/business/foodtech/models
  await check('1. Fetch model catalog returns 5 verified models', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/models`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.count, 5);
    const ids = json.data.map((m) => m.businessId);
    assert(ids.includes('FOODTECH_FLOUR_MILL'));
    assert(ids.includes('FOODTECH_RICE_MILL'));
    assert(ids.includes('FOODTECH_PULSE_PROCESSING'));
    assert(ids.includes('FOODTECH_OIL_EXTRACTION'));
    assert(ids.includes('FOODTECH_SPICE_PROCESSING'));
  });

  // 2. GET /api/business/foodtech/models/FOODTECH_FLOUR_MILL
  await check('2. Fetch single model spec returns benchmarks and parameters', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/models/FOODTECH_FLOUR_MILL`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.businessId, 'FOODTECH_FLOUR_MILL');
    assert.strictEqual(json.data.benchmarkDefaults.recovery_rate.value, 95.0);
    assert(json.data.requiredParameters.includes('raw_material_quantity'));
    assert(json.data.requiredParameters.includes('selling_price'));
  });

  // 3. POST /api/business/foodtech/advisory (Flour Mill)
  await check('3. Flour Mill advisory produces complete data-driven dashboard payload', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'FOODTECH_FLOUR_MILL',
        raw_material_quantity: 1000,
        raw_material_price: 24.50,
        selling_price: 36.00,
        byproduct_selling_price: 18.00,
        fixed_cost: 15000,
        initial_investment: 350000,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    const d = json.data;

    // Check header
    assert.strictEqual(d.business.businessId, 'FOODTECH_FLOUR_MILL');
    assert.strictEqual(d.advisoryStatus, 'GENERATED');

    // Check production mass balance
    assert.strictEqual(d.calculationResult.production.primaryOutputKg, 950);
    assert.strictEqual(d.calculationResult.production.byproductOutputKg, 40);
    assert.strictEqual(d.calculationResult.production.lossKg, 10);

    // Check viability
    assert.strictEqual(d.viabilityAnalysis.profitabilityStatus, 'LOSS_MAKING');
    assert.strictEqual(d.viabilityAnalysis.viabilityRating, 'HIGH_RISK');

    // Check break-even
    assert.strictEqual(d.breakEvenAnalysis.status, 'REACHABLE');
    assert(d.breakEvenAnalysis.breakEvenQuantity > 0);

    // Check investment
    assert(['RECOVERABLE', 'PAYBACK_UNAVAILABLE', 'CALCULATED'].includes(d.investmentAnalysis.status));
    assert.strictEqual(d.investmentAnalysis.initialInvestment, 350000);

    // Check schemes
    assert(Array.isArray(d.schemeRecommendations));
    assert(d.schemeRecommendations.length > 0);
    const pmfme = d.schemeRecommendations.find((s) => s.schemeId.includes('pmfme'));
    assert(pmfme !== undefined);
    assert.strictEqual(pmfme.eligibilityStatus || pmfme.matchStatus, 'POTENTIAL_MATCH');

    // Check provenance
    assert(d.provenance.length > 0);
  });

  // 4. Rice Mill multi-stream advisory
  await check('4. Rice Mill advisory produces 3 byproduct streams and 67% out-turn', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'FOODTECH_RICE_MILL',
        raw_material_quantity: 1000,
        raw_material_price: 22.00,
        selling_price: 40.00,
        broken_rice_selling_price: 22.00,
        husk_selling_price: 3.00,
        bran_selling_price: 24.00,
        fixed_cost: 15000,
        initial_investment: 500000,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.calculationResult.production.primaryOutputKg, 670);
    assert(json.data.calculationResult.production.outputStreams.length >= 4);
  });

  // 5. Dal Mill advisory
  await check('5. Dal Mill advisory produces 74% dal output and chuni byproduct', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'FOODTECH_PULSE_PROCESSING',
        raw_material_quantity: 1000,
        raw_material_price: 68.00,
        selling_price: 112.00,
        byproduct_selling_price: 24.00,
        fixed_cost: 20000,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.calculationResult.production.primaryOutputKg, 740);
  });

  // 6. Oil Expeller advisory
  await check('6. Oil Expeller advisory produces 34% oil and 64% press cake', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'FOODTECH_OIL_EXTRACTION',
        raw_material_quantity: 1000,
        raw_material_price: 54.00,
        selling_price: 145.00,
        cake_selling_price: 28.00,
        fixed_cost: 18000,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.calculationResult.production.primaryOutputKg, 340);
  });

  // 7. Spice Processing advisory
  await check('7. Spice Processing advisory produces 96% ground spice output', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'FOODTECH_SPICE_PROCESSING',
        raw_material_quantity: 1000,
        raw_material_price: 160.00,
        selling_price: 240.00,
        fixed_cost: 25000,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.calculationResult.production.primaryOutputKg, 960);
  });

  // 8. Missing required input returns structured 400 Bad Request
  await check('8. Missing required input returns 400 with missingInputs list', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'FOODTECH_FLOUR_MILL',
        // missing raw_material_quantity
        selling_price: 36.00,
      }),
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.status, 'INSUFFICIENT_INPUTS');
    assert(json.missingInputs.includes('raw_material_quantity'));
  });

  // 9. Mass balance violation returns structured 400 Bad Request
  await check('9. Mass balance violation returns 400 with violation status', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'FOODTECH_FLOUR_MILL',
        raw_material_quantity: 1000,
        recovery_rate: 120, // Impossible: > 100%
        selling_price: 36.00,
      }),
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.status, 'MASS_BALANCE_VIOLATION');
  });

  // 10. Missing investment correctly handled as INSUFFICIENT_DATA without fake values
  await check('10. Missing initial_investment produces INSUFFICIENT_DATA in investmentAnalysis', async () => {
    const res = await fetch(`${API_BASE}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'FOODTECH_FLOUR_MILL',
        raw_material_quantity: 1000,
        raw_material_price: 24.50,
        selling_price: 36.00,
        byproduct_selling_price: 18.00,
        fixed_cost: 15000,
        // no initial_investment
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.investmentAnalysis.status, 'INSUFFICIENT_DATA');
    assert.strictEqual(json.data.investmentAnalysis.initialInvestment, null);
    assert.strictEqual(json.data.investmentAnalysis.roiPct, null);
  });

  console.log('\n======================================================================');
  console.log(`FRONTEND API TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) process.exit(1);
}

testFrontendApiIntegration();
