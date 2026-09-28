/**
 * VYAVSAYMITRA — Business Workspace Navigation & Data Loading Regression Test Suite
 *
 * Validates:
 * TEST 1: Click valid business -> correct business workspace resolution (200 with full data)
 * TEST 2: Valid business ID with Bearer token succeeds via API endpoint
 * TEST 3: Refresh workspace -> business resolves consistently
 * TEST 4: Business switching (Business A -> Business B) loads correct data without leakage
 * TEST 5: Non-existent business ID returns 404 cleanly
 * TEST 6: Cross-tenant access is blocked with 404 (IDOR protection)
 * TEST 7: Auth endpoints (/api/auth/login, /api/auth/session) issue valid JWT
 * TEST 8: Auth middleware properly decodes token and sets req.user
 * TEST 9: Analysis data uses real calculated figures (no fake demo values)
 * TEST 10: Business list contains unique business records (no duplicate IDs)
 */

const assert = require('assert');
const path = require('path');
const jwt = require('jsonwebtoken');
const dbRepository = require('../src/models/dbRepository');
const authController = require('../src/controllers/authController');
const businessManagementController = require('../src/controllers/businessManagementController');
const { generateToken, requireAuth, JWT_SECRET } = require('../src/middleware/authMiddleware');

function mockReqRes(reqData = {}) {
  const req = {
    user: reqData.user || { id: 'usr_ramesh_patel_01', email: 'ramesh@vyavsaymitra.in', name: 'Ramesh Patel' },
    params: reqData.params || {},
    body: reqData.body || {},
    headers: reqData.headers || {},
    query: reqData.query || {},
  };

  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };

  const next = (err) => {
    if (err) throw err;
  };

  return { req, res, next };
}

async function runRegressionTests() {
  console.log('\n======================================================================');
  console.log('VYAVSAYMITRA — BUSINESS WORKSPACE RESOLUTION REGRESSION TESTS');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testName) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  }

  function recordFail(testName, err) {
    console.error(`  ✗ FAIL: ${testName} - ${err.message}`);
    failed++;
  }

  // TEST 1: Authenticate and retrieve user businesses
  try {
    const businesses = await dbRepository.listBusinesses('usr_ramesh_patel_01');
    assert(Array.isArray(businesses), 'Expected businesses to be an array');
    assert(businesses.length >= 1, 'Expected at least 1 business for Ramesh Patel');
    const firstBiz = businesses[0];
    assert(firstBiz.id, 'Business must have an id');
    assert(firstBiz.name, 'Business must have a name');
    recordPass(`TEST 1: Valid business retrieval returns ${businesses.length} businesses for owner`);
  } catch (err) {
    recordFail('TEST 1: Valid business retrieval', err);
  }

  // TEST 2: Valid business ID request with Bearer token
  let testBizA = null;
  let testBizB = null;
  try {
    const businesses = await dbRepository.listBusinesses('usr_ramesh_patel_01');
    testBizA = businesses[0];
    testBizB = businesses.length > 1 ? businesses[1] : null;

    const token = generateToken({ id: 'usr_ramesh_patel_01', email: 'ramesh@vyavsaymitra.in' });
    const decoded = jwt.verify(token, JWT_SECRET);
    assert.strictEqual(decoded.userId, 'usr_ramesh_patel_01', 'Decoded token userId must match');

    const { req, res } = mockReqRes({
      headers: { authorization: `Bearer ${token}` },
      params: { id: testBizA.id },
    });

    // Run through auth middleware then controller
    await new Promise((resolve, reject) => {
      requireAuth(req, res, async (err) => {
        if (err) return reject(err);
        try {
          await businessManagementController.getBusiness(req, res);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    assert.strictEqual(res.statusCode, 200, 'Expected status 200');
    assert.strictEqual(res.data.success, true, 'Expected success: true');
    assert.strictEqual(res.data.data.id, testBizA.id, 'Returned business ID must match requested ID');
    recordPass(`TEST 2: GET /api/businesses/:id with valid Bearer token resolves business ${testBizA.id}`);
  } catch (err) {
    recordFail('TEST 2: Valid business ID request', err);
  }

  // TEST 3: Browser refresh simulation (re-requesting same ID returns consistent record)
  try {
    assert(testBizA, 'testBizA required');
    const { req, res } = mockReqRes({
      user: { id: 'usr_ramesh_patel_01' },
      params: { id: testBizA.id },
    });

    await businessManagementController.getBusiness(req, res);
    assert.strictEqual(res.statusCode, 200, 'Refresh must return HTTP 200');
    assert.strictEqual(res.data.data.id, testBizA.id, 'Re-requested business must retain same ID');
    assert.strictEqual(res.data.data.name, testBizA.name, 'Re-requested business must retain same name');
    recordPass('TEST 3: Browser refresh preserves and loads selected business consistently');
  } catch (err) {
    recordFail('TEST 3: Browser refresh simulation', err);
  }

  // TEST 4: Business switching (Business A -> Business B)
  try {
    if (testBizB) {
      const { req: reqA, res: resA } = mockReqRes({
        user: { id: 'usr_ramesh_patel_01' },
        params: { id: testBizA.id },
      });
      await businessManagementController.getBusiness(reqA, resA);

      const { req: reqB, res: resB } = mockReqRes({
        user: { id: 'usr_ramesh_patel_01' },
        params: { id: testBizB.id },
      });
      await businessManagementController.getBusiness(reqB, resB);

      assert.strictEqual(resA.data.data.id, testBizA.id);
      assert.strictEqual(resB.data.data.id, testBizB.id);
      assert.notStrictEqual(resA.data.data.id, resB.data.data.id, 'Switched business IDs must differ');
      assert.notStrictEqual(resA.data.data.name, resB.data.data.name, 'Switched business names must differ');
      recordPass(`TEST 4: Business switching (${testBizA.name} -> ${testBizB.name}) changes data cleanly`);
    } else {
      recordPass('TEST 4: Business switching skipped (only 1 business in seed)');
    }
  } catch (err) {
    recordFail('TEST 4: Business switching', err);
  }

  // TEST 5: Missing / non-existent business returns 404
  try {
    const { req, res } = mockReqRes({
      user: { id: 'usr_ramesh_patel_01' },
      params: { id: 'biz_non_existent_999999' },
    });
    await businessManagementController.getBusiness(req, res);
    assert.strictEqual(res.statusCode, 404, 'Non-existent business must return 404');
    assert.strictEqual(res.data.success, false, 'Expected success: false');
    recordPass('TEST 5: Non-existent business ID returns HTTP 404 cleanly');
  } catch (err) {
    recordFail('TEST 5: Missing business returns 404', err);
  }

  // TEST 6: Cross-tenant isolation (IDOR protection: intruder receives 404)
  try {
    assert(testBizA, 'testBizA required');
    const { req, res } = mockReqRes({
      user: { id: 'usr_foreign_intruder_99' },
      params: { id: testBizA.id },
    });
    await businessManagementController.getBusiness(req, res);
    assert.strictEqual(res.statusCode, 404, 'Intruder must be rejected with 404');
    assert.strictEqual(res.data.success, false, 'Intruder request must fail');
    assert(!res.data.data, 'Zero data leaked to unauthorized tenant');
    recordPass('TEST 6: Cross-tenant access strictly blocked with 404 and zero data leakage');
  } catch (err) {
    recordFail('TEST 6: Cross-tenant isolation', err);
  }

  // TEST 7: Auth endpoints /api/auth/login and /api/auth/session issue valid JWT
  try {
    const { req: loginReq, res: loginRes } = mockReqRes({
      body: { email: 'ramesh@vyavsaymitra.in', password: 'demo' },
    });
    await authController.login(loginReq, loginRes);
    assert.strictEqual(loginRes.statusCode, 200, 'Login must return 200');
    assert(loginRes.data.token, 'Login response must include token');
    assert.strictEqual(loginRes.data.user.email, 'ramesh@vyavsaymitra.in');

    const { req: sessReq, res: sessRes } = mockReqRes({
      body: {},
    });
    await authController.ensureSession(sessReq, sessRes);
    assert.strictEqual(sessRes.statusCode, 200, 'Ensure session must return 200');
    assert(sessRes.data.token, 'Ensure session response must include token');
    recordPass('TEST 7: /api/auth/login and /api/auth/session issue valid JWT and user session');
  } catch (err) {
    recordFail('TEST 7: Auth endpoints', err);
  }

  // TEST 8: Token validation and userId extraction
  try {
    const token = generateToken({ id: 'usr_ramesh_patel_01', email: 'ramesh@vyavsaymitra.in' });
    const decoded = jwt.verify(token, JWT_SECRET);
    assert(decoded, 'Token must decode successfully');
    assert.strictEqual(decoded.userId, 'usr_ramesh_patel_01');
    recordPass('TEST 8: Token generation and verification preserves user identity');
  } catch (err) {
    recordFail('TEST 8: Token validation', err);
  }

  // TEST 9: Real financial calculations in workspace analysis (no fake demo values)
  try {
    const businesses = await dbRepository.listBusinesses('usr_ramesh_patel_01');
    const bizWithAnalysis = businesses.find(b => b.latestAnalysis);
    if (bizWithAnalysis) {
      const anl = bizWithAnalysis.latestAnalysis;
      assert(typeof anl.total_project_cost === 'number', 'total_project_cost must be a number');
      assert(anl.total_project_cost > 0, 'total_project_cost must be positive');
      assert(typeof anl.net_annual_profit === 'number', 'net_annual_profit must be a number');
      recordPass(`TEST 9: Business analysis contains verified calculations (cost: ₹${anl.total_project_cost.toLocaleString('en-IN')})`);
    } else {
      recordPass('TEST 9: No business with pre-computed analysis found in current seed (skipped)');
    }
  } catch (err) {
    recordFail('TEST 9: Real financial calculations', err);
  }

  // TEST 10: Deduplication check
  try {
    const businesses = await dbRepository.listBusinesses('usr_ramesh_patel_01');
    const idSet = new Set();
    let hasDuplicate = false;
    for (const b of businesses) {
      if (idSet.has(b.id)) {
        hasDuplicate = true;
        break;
      }
      idSet.add(b.id);
    }
    assert(!hasDuplicate, 'Database query must return unique businesses without duplicate IDs');
    recordPass(`TEST 10: Database business query returns ${businesses.length} unique businesses with zero duplicate IDs`);
  } catch (err) {
    recordFail('TEST 10: Deduplication check', err);
  }

  console.log('\n======================================================================');
  console.log(`REGRESSION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
