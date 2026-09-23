/**
 * VYAVSAYMITRA — Production FoodTech API & Controller Test Suite (Phase 3 Step 3)
 * 
 * Verifies HTTP REST endpoints for FoodTech Business Model execution:
 * 1.  GET  /api/business/foodtech/models (Catalog of 5 verified models)
 * 2.  GET  /api/business/foodtech/models/FOODTECH_FLOUR_MILL (Specific model spec)
 * 3.  GET  /api/business/foodtech/models/FOODTECH_RICE_MILL (Specific model spec)
 * 4.  GET  /api/business/foodtech/models/NON_EXISTENT (404 Not Found)
 * 5.  POST /api/business/foodtech/calculate (Flour mill valid calculation)
 * 6.  POST /api/business/foodtech/calculate (Rice mill valid calculation)
 * 7.  POST /api/business/foodtech/calculate (Dal mill valid calculation)
 * 8.  POST /api/business/foodtech/calculate (Oil expeller valid calculation)
 * 9.  POST /api/business/foodtech/calculate (Spice processing valid calculation)
 * 10. POST /api/business/foodtech/calculate (Missing raw material returns 400)
 * 11. POST /api/business/foodtech/calculate (Mass balance violation returns 400)
 * 12. POST /api/business/foodtech/calculate (Negative cost returns 400)
 * 13. POST /api/business/foodtech/calculate (Non-INR currency returns 400)
 * 14. POST /api/business/foodtech/validate-mass-balance (Valid stream returns 200)
 * 15. POST /api/business/foodtech/validate-mass-balance (Excess stream returns 400)
 * 16. POST /api/business/calculate (Master calculation endpoint delegates FoodTech)
 * 17. POST /api/business/analyze (Master analysis endpoint delegates FoodTech)
 */

const assert = require('assert');
const http = require('http');
const express = require('express');
const businessRoutes = require('../src/routes/businessRoutes');

const app = express();
app.use(express.json());
app.use('/api/business', businessRoutes);

console.log('======================================================================');
console.log('RUNNING FOODTECH REST API & CONTROLLER TEST SUITE (PHASE 3 STEP 3)');
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
  const { server, baseUrl } = await startServer();

  try {
    // ── TEST 1: GET /api/business/foodtech/models ───────────────────────
    await runAsyncTest('TEST 1: GET /foodtech/models returns all 5 verified models', async () => {
      const res = await fetch(`${baseUrl}/foodtech/models`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.count, 5);
      assert(Array.isArray(json.data));
      const modelIds = json.data.map(m => m.businessId);
      assert(modelIds.includes('FOODTECH_FLOUR_MILL'));
      assert(modelIds.includes('FOODTECH_RICE_MILL'));
      assert(modelIds.includes('FOODTECH_PULSE_PROCESSING'));
      assert(modelIds.includes('FOODTECH_OIL_EXTRACTION'));
      assert(modelIds.includes('FOODTECH_SPICE_PROCESSING'));
    });

    // ── TEST 2: GET /api/business/foodtech/models/FOODTECH_FLOUR_MILL ──
    await runAsyncTest('TEST 2: GET /foodtech/models/FOODTECH_FLOUR_MILL returns model spec', async () => {
      const res = await fetch(`${baseUrl}/foodtech/models/FOODTECH_FLOUR_MILL`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.businessId, 'FOODTECH_FLOUR_MILL');
      assert.strictEqual(json.data.benchmarkDefaults.recovery_rate.value, 95.0);
      assert.strictEqual(json.data.benchmarkDefaults.byproduct_recovery.value, 4.0);
      assert.strictEqual(json.data.benchmarkDefaults.processing_loss.value, 1.0);
    });

    // ── TEST 3: GET /api/business/foodtech/models/FOODTECH_RICE_MILL ───
    await runAsyncTest('TEST 3: GET /foodtech/models/FOODTECH_RICE_MILL returns model spec', async () => {
      const res = await fetch(`${baseUrl}/foodtech/models/FOODTECH_RICE_MILL`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.businessId, 'FOODTECH_RICE_MILL');
      assert.strictEqual(json.data.benchmarkDefaults.recovery_rate.value, 67.0);
      assert.strictEqual(json.data.benchmarkDefaults.byproduct_recovery.value, 28.0);
      assert.strictEqual(json.data.benchmarkDefaults.processing_loss.value, 5.0);
    });

    // ── TEST 4: GET /api/business/foodtech/models/NON_EXISTENT (404) ───
    await runAsyncTest('TEST 4: GET /foodtech/models/UNKNOWN_MODEL returns 404', async () => {
      const res = await fetch(`${baseUrl}/foodtech/models/UNKNOWN_MODEL_ABC`);
      assert.strictEqual(res.status, 404);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert(json.message.includes('not found'));
    });

    // ── TEST 5: POST /api/business/foodtech/calculate (Flour Mill) ─────
    await runAsyncTest('TEST 5: POST /foodtech/calculate (Flour Mill) returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
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
          packaging_cost: 1200
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.businessStatus, 'CALCULATED');
      assert.strictEqual(json.data.production.primaryOutputKg, 950);
      assert.strictEqual(json.data.production.byproductOutputKg, 40);
      assert.strictEqual(json.data.massBalance.isMassConserved, true);
      assert.strictEqual(json.data.revenue.totalRevenue, 34920);
      assert(json.data.provenance.length >= 8);
    });

    // ── TEST 6: POST /api/business/foodtech/calculate (Rice Mill) ──────
    await runAsyncTest('TEST 6: POST /foodtech/calculate (Rice Mill) returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_RICE_MILL',
          raw_material_quantity: 1000,
          raw_material_price: 22.00,
          selling_price: 42.00,
          byproduct_selling_price: 12.00,
          fixed_cost: 20000,
          labour_cost: 10000,
          electricity_cost: 7000
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.businessStatus, 'CALCULATED');
      assert.strictEqual(json.data.production.primaryOutputKg, 670);
      assert.strictEqual(json.data.massBalance.isMassConserved, true);
    });

    // ── TEST 7: POST /api/business/foodtech/calculate (Dal Mill) ───────
    await runAsyncTest('TEST 7: POST /foodtech/calculate (Dal Mill) returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_PULSE_PROCESSING',
          raw_material_quantity: 1000,
          raw_material_price: 65.00,
          selling_price: 95.00,
          byproduct_selling_price: 22.00,
          fixed_cost: 18000,
          labour_cost: 9000,
          electricity_cost: 6000
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.businessStatus, 'CALCULATED');
      assert.strictEqual(json.data.production.primaryOutputKg, 740);
      assert.strictEqual(json.data.production.byproductOutputKg, 220);
      assert.strictEqual(json.data.massBalance.isMassConserved, true);
    });

    // ── TEST 8: POST /api/business/foodtech/calculate (Oil Expeller) ───
    await runAsyncTest('TEST 8: POST /foodtech/calculate (Oil Expeller) returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_OIL_EXTRACTION',
          raw_material_quantity: 1000,
          raw_material_price: 52.00,
          selling_price: 145.00,
          byproduct_selling_price: 28.00,
          fixed_cost: 25000,
          labour_cost: 12000,
          electricity_cost: 8000
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.businessStatus, 'CALCULATED');
      assert.strictEqual(json.data.production.primaryOutputKg, 340);
      assert.strictEqual(json.data.production.byproductOutputKg, 640);
      assert.strictEqual(json.data.massBalance.isMassConserved, true);
    });

    // ── TEST 9: POST /api/business/foodtech/calculate (Spice Pulverizing)
    await runAsyncTest('TEST 9: POST /foodtech/calculate (Spice Pulverizing) returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_SPICE_PROCESSING',
          raw_material_quantity: 500,
          raw_material_price: 180.00,
          selling_price: 280.00,
          fixed_cost: 16000,
          labour_cost: 7000,
          electricity_cost: 4500
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.businessStatus, 'CALCULATED');
      assert.strictEqual(json.data.production.primaryOutputKg, 480);
      assert.strictEqual(json.data.massBalance.isMassConserved, true);
    });

    // ── TEST 10: Missing raw material returns 400 Bad Request ───────────
    await runAsyncTest('TEST 10: Missing raw material input returns 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_FLOUR_MILL',
          selling_price: 36.00
          // raw_material_quantity omitted
        })
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.status, 'INSUFFICIENT_INPUTS');
      assert(json.missingInputs.includes('raw_material_quantity'));
    });

    // ── TEST 11: Mass balance violation returns 400 Bad Request ─────────
    await runAsyncTest('TEST 11: Mass balance violation returns 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_FLOUR_MILL',
          raw_material_quantity: 1000,
          recovery_rate: 105.0, // Impossible recovery > 100%
          selling_price: 36.00
        })
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.status, 'MASS_BALANCE_VIOLATION');
    });

    // ── TEST 12: Negative cost returns 400 Bad Request ──────────────────
    await runAsyncTest('TEST 12: Negative cost input returns 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_FLOUR_MILL',
          raw_material_quantity: 1000,
          raw_material_price: 24.50,
          selling_price: 36.00,
          labour_cost: -5000 // Negative cost rejected
        })
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.status, 'VALIDATION_ERROR');
    });

    // ── TEST 13: Non-INR currency returns 400 Bad Request ───────────────
    await runAsyncTest('TEST 13: Non-INR currency returns 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/foodtech/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'FOODTECH_FLOUR_MILL',
          raw_material_quantity: 1000,
          raw_material_price: 24.50,
          selling_price: 36.00,
          currency: 'USD' // Strictly rejected
        })
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.status, 'VALIDATION_ERROR');
    });

    // ── TEST 14: Valid mass balance preflight returns 200 OK ───────────
    await runAsyncTest('TEST 14: Valid mass balance preflight returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/foodtech/validate-mass-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawMaterialInputKg: 1000,
          recoveryRatePct: 95.0,
          byproductRecoveryPct: 4.0,
          processingLossPct: 1.0
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.isValid, true);
      assert.strictEqual(json.massBalance.isMassConserved, true);
    });

    // ── TEST 15: Excess mass balance preflight returns 400 Bad Request ──
    await runAsyncTest('TEST 15: Excess output stream preflight returns 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/foodtech/validate-mass-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawMaterialInputKg: 1000,
          recoveryRatePct: 90.0,
          byproductRecoveryPct: 15.0 // 90 + 15 = 105% > 100%
        })
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.isValid, false);
      assert(json.errors.some(e => e.includes('exceed')));
    });

    // ── TEST 16: Master calculate endpoint delegates FoodTech ──────────
    await runAsyncTest('TEST 16: Master /calculate endpoint delegates FoodTech models', async () => {
      const res = await fetch(`${baseUrl}/calculate`, {
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
          electricity_cost: 5000
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.businessStatus, 'CALCULATED');
      assert.strictEqual(json.data.isFoodTech, true);
      assert(json.data.financialViability);
      assert(Array.isArray(json.data.eligibleSchemes));
    });

    // ── TEST 17: Master analyze endpoint delegates FoodTech ────────────
    await runAsyncTest('TEST 17: Master /analyze endpoint delegates FoodTech models', async () => {
      const res = await fetch(`${baseUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessIdea: 'Flour mill Atta Chakki business in rural cluster',
          businessId: 'FOODTECH_FLOUR_MILL',
          raw_material_quantity: 1000,
          raw_material_price: 24.50,
          selling_price: 36.00,
          fixed_cost: 15000,
          labour_cost: 8000,
          electricity_cost: 5000
        })
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.status, 'success');
      assert(json.financial);
      assert(json.financial.annualRevenue);
      assert(json.provenance);
      assert(json.provenance.formulasUsed.some(f => f.includes('FoodTech')));
    });

  } finally {
    server.close();
  }

  console.log('\n======================================================================');
  console.log(`FOODTECH API TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
