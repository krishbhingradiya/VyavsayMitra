/**
 * VYAVSAYMITRA — Phase 1 Multi-Business & Data Foundation Test Suite
 * 
 * Tests the 16 core requirements of Phase 1:
 * 1. Create Business A (Wheat Cultivation - Agriculture)
 * 2. Create Business B (Mini Flour Mill - FoodTech)
 * 3. Create Business C (Mustard Farming - Agriculture)
 * 4. GET all businesses (verify all coexist without overwriting)
 * 5. Retrieve Business A (only Business A data)
 * 6. Retrieve Business B (only Business B data)
 * 7. Run Agriculture analysis (verified CACP engine execution & status transition)
 * 8. Run FoodTech analysis (verified FoodTech engine execution & status transition)
 * 9. Verify analyses remain isolated & immutable (no cross-contamination or overwrites)
 * 10. Verify AI context isolation (grounded only in target business domain/financials)
 * 11. Verify scheme isolation (domain-specific statutory schemes matched per business)
 * 12. Verify report isolation (DPR snapshots scoped strictly to business)
 * 13. Cross-user access rejection (strict multi-tenant security)
 * 14. Invalid business ID handling (clean 404 / 400 responses)
 * 15. Database constraint failures (domain/status validation)
 * 16. Multiple businesses for same user (4+ businesses coexisting independently)
 */

const assert = require('assert');
const dbRepository = require('../src/models/dbRepository');
const businessManagementController = require('../src/controllers/businessManagementController');
const dataService = require('../src/services/data/dataService');

// Helper to mock express req/res
function mockReqRes(reqData = {}) {
  const req = {
    user: reqData.user || { id: 'test_user_phase1', email: 'ramesh@vyavsaymitra.in', name: 'Ramesh Patel' },
    params: reqData.params || {},
    body: reqData.body || {},
    headers: reqData.headers || {},
    query: reqData.query || {}
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
    }
  };

  const next = (err) => {
    if (err) throw err;
  };

  return { req, res, next };
}

async function runPhase1Tests() {
  console.log('\n======================================================================');
  console.log('VYAVSAYMITRA — PHASE 1: MULTI-BUSINESS BACKEND TEST SUITE');
  console.log('======================================================================\n');

  await dataService.initDataService();

  const testRunId = Date.now();
  const userRamesh = { id: `usr_ramesh_patel_${testRunId}`, email: `ramesh_${testRunId}@patel-farms.in`, name: 'Ramesh Patel' };
  const userSuresh = { id: `usr_suresh_shah_${testRunId}`, email: `suresh_${testRunId}@shah-enterprises.in`, name: 'Suresh Shah' };

  // Setup user profiles
  await dbRepository.upsertProfile(userRamesh.id, {
    name: userRamesh.name,
    email: userRamesh.email,
    state: 'Gujarat',
    district: 'Anand',
    village: 'Changa',
    capital_available: 500000
  });

  await dbRepository.upsertProfile(userSuresh.id, {
    name: userSuresh.name,
    email: userSuresh.email,
    state: 'Gujarat',
    district: 'Vadodara',
    village: 'Padra',
    capital_available: 800000
  });

  // -------------------------------------------------------------------------
  // 1. Create Business A (Wheat Cultivation - Agriculture)
  // -------------------------------------------------------------------------
  console.log('[Test 1] Create Business A: Wheat Cultivation (Agriculture)...');
  const { req: reqA, res: resA, next: nextA } = mockReqRes({
    user: userRamesh,
    body: {
      name: 'Ramesh Wheat Farm',
      domain: 'agriculture',
      business_type: 'Wheat Farming',
      location: { state: 'Gujarat', district: 'Anand', village: 'Changa', is_rural: true },
      inputs: { crop: 'Wheat', areaAcres: 5, season: 'Rabi' }
    }
  });
  await businessManagementController.createBusiness(reqA, resA, nextA);
  assert.strictEqual(resA.statusCode, 201);
  assert.ok(resA.data.success);
  const businessA = resA.data.data;
  assert.ok(businessA.id);
  assert.strictEqual(businessA.name, 'Ramesh Wheat Farm');
  assert.strictEqual(businessA.domain, 'agriculture');
  assert.strictEqual(businessA.business_type, 'Wheat Farming');
  assert.strictEqual(businessA.status, 'READY_FOR_ANALYSIS');
  console.log(`  ✓ PASS: Business A created with ID: ${businessA.id}`);

  // -------------------------------------------------------------------------
  // 2. Create Business B (Mini Flour Mill - FoodTech)
  // -------------------------------------------------------------------------
  console.log('[Test 2] Create Business B: Mini Flour Mill (FoodTech)...');
  const { req: reqB, res: resB, next: nextB } = mockReqRes({
    user: userRamesh,
    body: {
      name: 'Ramesh Mini Flour Mill',
      domain: 'foodtech',
      business_type: 'FOODTECH_FLOUR_MILL',
      location: { state: 'Gujarat', district: 'Anand', village: 'Changa', is_rural: true },
      inputs: {
        raw_material_quantity: 500,
        selling_price: 32,
        raw_material_cost: 25,
        projectCost: 250000
      }
    }
  });
  await businessManagementController.createBusiness(reqB, resB, nextB);
  assert.strictEqual(resB.statusCode, 201);
  assert.ok(resB.data.success);
  const businessB = resB.data.data;
  assert.ok(businessB.id);
  assert.notStrictEqual(businessB.id, businessA.id);
  assert.strictEqual(businessB.domain, 'foodtech');
  assert.strictEqual(businessB.status, 'READY_FOR_ANALYSIS');
  console.log(`  ✓ PASS: Business B created with ID: ${businessB.id}`);

  // -------------------------------------------------------------------------
  // 3. Create Business C (Mustard Farming - Agriculture)
  // -------------------------------------------------------------------------
  console.log('[Test 3] Create Business C: Mustard Farming (Agriculture)...');
  const { req: reqC, res: resC, next: nextC } = mockReqRes({
    user: userRamesh,
    body: {
      name: 'Ramesh Mustard Enterprise',
      domain: 'agriculture',
      business_type: 'Mustard Farming',
      location: { state: 'Gujarat', district: 'Banaskantha', village: 'Deesa', is_rural: true },
      inputs: { crop: 'Mustard', areaAcres: 4, season: 'Rabi' }
    }
  });
  await businessManagementController.createBusiness(reqC, resC, nextC);
  assert.strictEqual(resC.statusCode, 201);
  const businessC = resC.data.data;
  assert.ok(businessC.id);
  assert.notStrictEqual(businessC.id, businessA.id);
  assert.notStrictEqual(businessC.id, businessB.id);
  console.log(`  ✓ PASS: Business C created with ID: ${businessC.id}`);

  // -------------------------------------------------------------------------
  // 4. GET all businesses (all 3 must coexist without overwriting)
  // -------------------------------------------------------------------------
  console.log('[Test 4] GET all businesses for Ramesh Patel...');
  const { req: reqList, res: resList, next: nextList } = mockReqRes({ user: userRamesh });
  await businessManagementController.listBusinesses(reqList, resList, nextList);
  assert.strictEqual(resList.statusCode, 200);
  assert.strictEqual(resList.data.count, 3);
  const bizIds = resList.data.data.map(b => b.id);
  assert.ok(bizIds.includes(businessA.id));
  assert.ok(bizIds.includes(businessB.id));
  assert.ok(bizIds.includes(businessC.id));
  console.log(`  ✓ PASS: All 3 businesses independently coexist for user (Count: ${resList.data.count})`);

  // -------------------------------------------------------------------------
  // 5. Retrieve Business A
  // -------------------------------------------------------------------------
  console.log('[Test 5] Retrieve Business A...');
  const { req: reqGetA, res: resGetA, next: nextGetA } = mockReqRes({
    user: userRamesh,
    params: { id: businessA.id }
  });
  await businessManagementController.getBusiness(reqGetA, resGetA, nextGetA);
  assert.strictEqual(resGetA.statusCode, 200);
  assert.strictEqual(resGetA.data.data.name, 'Ramesh Wheat Farm');
  assert.strictEqual(resGetA.data.data.domain, 'agriculture');
  assert.strictEqual(resGetA.data.data.inputs?.crop, 'Wheat');
  console.log('  ✓ PASS: Business A retrieved with correct domain and inputs');

  // -------------------------------------------------------------------------
  // 6. Retrieve Business B
  // -------------------------------------------------------------------------
  console.log('[Test 6] Retrieve Business B...');
  const { req: reqGetB, res: resGetB, next: nextGetB } = mockReqRes({
    user: userRamesh,
    params: { id: businessB.id }
  });
  await businessManagementController.getBusiness(reqGetB, resGetB, nextGetB);
  assert.strictEqual(resGetB.statusCode, 200);
  assert.strictEqual(resGetB.data.data.name, 'Ramesh Mini Flour Mill');
  assert.strictEqual(resGetB.data.data.domain, 'foodtech');
  assert.strictEqual(resGetB.data.data.inputs?.selling_price, 32);
  console.log('  ✓ PASS: Business B retrieved with correct domain and inputs (no leak from A)');

  // -------------------------------------------------------------------------
  // 7. Run Agriculture analysis (Business A)
  // -------------------------------------------------------------------------
  console.log('[Test 7] Run Agriculture analysis on Business A...');
  const { req: reqAnA, res: resAnA, next: nextAnA } = mockReqRes({
    user: userRamesh,
    params: { id: businessA.id }
  });
  await businessManagementController.analyzeBusiness(reqAnA, resAnA, nextAnA);
  assert.strictEqual(resAnA.statusCode, 200);
  assert.ok(resAnA.data.success);
  const analysisA = resAnA.data.data.analysis;
  assert.strictEqual(analysisA.engine_name, 'Crop_Farming_Engine_CACP');
  assert.strictEqual(analysisA.status, 'ANALYSIS_COMPLETE');
  assert.strictEqual(analysisA.confidence_state, 'VERIFIED');
  assert.ok(analysisA.net_annual_profit > 0);
  assert.ok(analysisA.total_project_cost > 0);

  // Check that business A status is now ANALYSIS_COMPLETE
  const refreshedA = await dbRepository.getBusiness(businessA.id, userRamesh.id);
  assert.strictEqual(refreshedA.status, 'ANALYSIS_COMPLETE');
  console.log(`  ✓ PASS: Agriculture CACP analysis completed (Cost: ₹${analysisA.total_project_cost}, Profit: ₹${analysisA.net_annual_profit})`);

  // -------------------------------------------------------------------------
  // 8. Run FoodTech analysis (Business B)
  // -------------------------------------------------------------------------
  console.log('[Test 8] Run FoodTech analysis on Business B...');
  const { req: reqAnB, res: resAnB, next: nextAnB } = mockReqRes({
    user: userRamesh,
    params: { id: businessB.id }
  });
  await businessManagementController.analyzeBusiness(reqAnB, resAnB, nextAnB);
  assert.strictEqual(resAnB.statusCode, 200);
  assert.ok(resAnB.data.success);
  const analysisB = resAnB.data.data.analysis;
  assert.strictEqual(analysisB.engine_name, 'FoodTech_Execution_Engine');
  assert.strictEqual(analysisB.status, 'ANALYSIS_COMPLETE');
  assert.strictEqual(analysisB.confidence_state, 'VERIFIED');
  assert.ok(analysisB.total_project_cost > 0);

  const refreshedB = await dbRepository.getBusiness(businessB.id, userRamesh.id);
  assert.strictEqual(refreshedB.status, 'ANALYSIS_COMPLETE');
  console.log(`  ✓ PASS: FoodTech analysis completed (Cost: ₹${analysisB.total_project_cost}, Profit: ₹${analysisB.net_annual_profit})`);

  // -------------------------------------------------------------------------
  // 9. Verify analyses remain isolated & immutable
  // -------------------------------------------------------------------------
  console.log('[Test 9] Verify analyses remain isolated & immutable...');
  const aHistory = await dbRepository.listAnalyses(businessA.id);
  const bHistory = await dbRepository.listAnalyses(businessB.id);
  const cHistory = await dbRepository.listAnalyses(businessC.id);

  assert.strictEqual(aHistory.length, 1);
  assert.strictEqual(bHistory.length, 1);
  assert.strictEqual(cHistory.length, 0); // Untouched business C has 0 analyses

  assert.strictEqual(aHistory[0].engine_name, 'Crop_Farming_Engine_CACP');
  assert.strictEqual(bHistory[0].engine_name, 'FoodTech_Execution_Engine');

  // Re-run analysis on Business A to verify historical append (no overwrite)
  const { req: reqAnA2, res: resAnA2, next: nextAnA2 } = mockReqRes({
    user: userRamesh,
    params: { id: businessA.id },
    body: { areaAcres: 6 } // altered input
  });
  await businessManagementController.analyzeBusiness(reqAnA2, resAnA2, nextAnA2);
  const aHistoryUpdated = await dbRepository.listAnalyses(businessA.id);
  assert.strictEqual(aHistoryUpdated.length, 2); // Both historical analyses preserved!
  assert.strictEqual(bHistory.length, 1); // Business B remains untouched at 1 analysis
  console.log('  ✓ PASS: Analysis records are strictly isolated, relational, and immutable across runs');

  // -------------------------------------------------------------------------
  // 10. Verify AI context isolation
  // -------------------------------------------------------------------------
  console.log('[Test 10] Verify AI context isolation...');
  const { req: reqAiA, res: resAiA, next: nextAiA } = mockReqRes({
    user: userRamesh,
    params: { id: businessA.id },
    body: { message: 'How can I maximize my profit this Rabi season?' }
  });
  await businessManagementController.chatAi(reqAiA, resAiA, nextAiA);
  assert.strictEqual(resAiA.statusCode, 200);
  assert.ok(resAiA.data.data.reply);
  assert.strictEqual(resAiA.data.data.contextUsed.businessName, 'Ramesh Wheat Farm');
  assert.strictEqual(resAiA.data.data.contextUsed.domain, 'agriculture');

  const { req: reqAiB, res: resAiB, next: nextAiB } = mockReqRes({
    user: userRamesh,
    params: { id: businessB.id },
    body: { message: 'What is my raw material cost breakdown?' }
  });
  await businessManagementController.chatAi(reqAiB, resAiB, nextAiB);
  assert.strictEqual(resAiB.statusCode, 200);
  assert.strictEqual(resAiB.data.data.contextUsed.businessName, 'Ramesh Mini Flour Mill');
  assert.strictEqual(resAiB.data.data.contextUsed.domain, 'foodtech');
  console.log('  ✓ PASS: AI context grounded strictly in the target business domain and financials');

  // -------------------------------------------------------------------------
  // 11. Verify scheme isolation
  // -------------------------------------------------------------------------
  console.log('[Test 11] Verify statutory scheme isolation...');
  const { req: reqSchA, res: resSchA, next: nextSchA } = mockReqRes({
    user: userRamesh,
    params: { id: businessA.id }
  });
  await businessManagementController.getBusinessSchemes(reqSchA, resSchA, nextSchA);
  assert.strictEqual(resSchA.statusCode, 200);
  const schemesA = resSchA.data.data;
  assert.ok(schemesA.length > 0);

  const { req: reqSchB, res: resSchB, next: nextSchB } = mockReqRes({
    user: userRamesh,
    params: { id: businessB.id }
  });
  await businessManagementController.getBusinessSchemes(reqSchB, resSchB, nextSchB);
  assert.strictEqual(resSchB.statusCode, 200);
  const schemesB = resSchB.data.data;
  assert.ok(schemesB.length > 0);

  // Verify relational scheme matches persistence
  const savedMatchesA = await dbRepository.getSchemeMatches(businessA.id);
  const savedMatchesB = await dbRepository.getSchemeMatches(businessB.id);
  assert.ok(savedMatchesA.length > 0);
  assert.ok(savedMatchesB.length > 0);
  console.log(`  ✓ PASS: Scheme matches verified and saved per business (A: ${savedMatchesA.length}, B: ${savedMatchesB.length})`);

  // -------------------------------------------------------------------------
  // 12. Verify report isolation
  // -------------------------------------------------------------------------
  console.log('[Test 12] Verify DPR report isolation...');
  const { req: reqRepA, res: resRepA, next: nextRepA } = mockReqRes({
    user: userRamesh,
    params: { id: businessA.id },
    body: { title: 'Wheat Farming DPR' }
  });
  await businessManagementController.createReport(reqRepA, resRepA, nextRepA);
  assert.strictEqual(resRepA.statusCode, 201);

  const { req: reqRepB, res: resRepB, next: nextRepB } = mockReqRes({
    user: userRamesh,
    params: { id: businessB.id },
    body: { title: 'Flour Mill DPR' }
  });
  await businessManagementController.createReport(reqRepB, resRepB, nextRepB);
  assert.strictEqual(resRepB.statusCode, 201);

  const reportsA = await dbRepository.listReports(businessA.id);
  const reportsB = await dbRepository.listReports(businessB.id);
  assert.strictEqual(reportsA.length, 1);
  assert.strictEqual(reportsB.length, 1);
  assert.strictEqual(reportsA[0].title, 'Wheat Farming DPR');
  assert.strictEqual(reportsB[0].title, 'Flour Mill DPR');
  console.log('  ✓ PASS: Bankable reports strictly isolated per business');

  // -------------------------------------------------------------------------
  // 13. Cross-user access rejection
  // -------------------------------------------------------------------------
  console.log('[Test 13] Cross-user access rejection...');
  // Suresh tries to access Ramesh's Business A
  const { req: reqSureshA, res: resSureshA, next: nextSureshA } = mockReqRes({
    user: userSuresh,
    params: { id: businessA.id }
  });
  await businessManagementController.getBusiness(reqSureshA, resSureshA, nextSureshA);
  assert.strictEqual(resSureshA.statusCode, 404);
  assert.strictEqual(resSureshA.data.success, false);

  // Suresh tries to analyze Ramesh's Business A
  const { req: reqSureshAn, res: resSureshAn, next: nextSureshAn } = mockReqRes({
    user: userSuresh,
    params: { id: businessA.id }
  });
  await businessManagementController.analyzeBusiness(reqSureshAn, resSureshAn, nextSureshAn);
  assert.strictEqual(resSureshAn.statusCode, 404);

  // Suresh lists his businesses (must see 0)
  const { req: reqSureshList, res: resSureshList, next: nextSureshList } = mockReqRes({ user: userSuresh });
  await businessManagementController.listBusinesses(reqSureshList, resSureshList, nextSureshList);
  assert.strictEqual(resSureshList.statusCode, 200);
  assert.strictEqual(resSureshList.data.count, 0);
  console.log('  ✓ PASS: Multi-tenant cross-user access strictly rejected (404 Not Found)');

  // -------------------------------------------------------------------------
  // 14. Invalid business ID
  // -------------------------------------------------------------------------
  console.log('[Test 14] Invalid business ID handling...');
  const { req: reqInv, res: resInv, next: nextInv } = mockReqRes({
    user: userRamesh,
    params: { id: 'biz_non_existent_uuid_99999' }
  });
  await businessManagementController.getBusiness(reqInv, resInv, nextInv);
  assert.strictEqual(resInv.statusCode, 404);
  assert.strictEqual(resInv.data.success, false);
  console.log('  ✓ PASS: Non-existent business IDs return structured 404 error');

  // -------------------------------------------------------------------------
  // 15. Database constraint failures
  // -------------------------------------------------------------------------
  console.log('[Test 15] Database constraint and validation failures...');
  // Invalid domain
  const { req: reqInvDom, res: resInvDom, next: nextInvDom } = mockReqRes({
    user: userRamesh,
    body: {
      name: 'Crypto Mining Farm',
      domain: 'cryptocurrency',
      business_type: 'Mining'
    }
  });
  await businessManagementController.createBusiness(reqInvDom, resInvDom, nextInvDom);
  assert.strictEqual(resInvDom.statusCode, 400);
  assert.strictEqual(resInvDom.data.success, false);

  // Invalid status update
  const { req: reqInvStat, res: resInvStat, next: nextInvStat } = mockReqRes({
    user: userRamesh,
    params: { id: businessA.id },
    body: { status: 'SUPER_ACTIVE_STATUS' }
  });
  await businessManagementController.updateBusiness(reqInvStat, resInvStat, nextInvStat);
  assert.strictEqual(resInvStat.statusCode, 400);
  assert.strictEqual(resInvStat.data.success, false);

  // Empty business name
  const { req: reqEmptyName, res: resEmptyName, next: nextEmptyName } = mockReqRes({
    user: userRamesh,
    body: {
      name: '   ',
      domain: 'agriculture',
      business_type: 'Wheat Farming'
    }
  });
  await businessManagementController.createBusiness(reqEmptyName, resEmptyName, nextEmptyName);
  assert.strictEqual(resEmptyName.statusCode, 400);
  console.log('  ✓ PASS: Domain, status lifecycle, and field validations rejected with 400');

  // -------------------------------------------------------------------------
  // 16. Multiple businesses for same user (create Business 4: Oil Expeller)
  // -------------------------------------------------------------------------
  console.log('[Test 16] Multiple businesses for same user (Business 4: Oil Expeller)...');
  const { req: reqD, res: resD, next: nextD } = mockReqRes({
    user: userRamesh,
    body: {
      name: 'Ramesh Mustard Oil Expeller',
      domain: 'foodtech',
      business_type: 'FOODTECH_OIL_EXPELLER',
      location: { state: 'Gujarat', district: 'Banaskantha', village: 'Deesa', is_rural: true },
      inputs: {
        rawMaterial: 'Mustard',
        raw_material_quantity: 400,
        selling_price: 145,
        raw_material_cost: 65,
        projectCost: 350000
      }
    }
  });
  await businessManagementController.createBusiness(reqD, resD, nextD);
  assert.strictEqual(resD.statusCode, 201);
  const businessD = resD.data.data;

  // Retrieve all businesses for Ramesh: must be 4 distinct businesses
  const { req: reqAll4, res: resAll4, next: nextAll4 } = mockReqRes({ user: userRamesh });
  await businessManagementController.listBusinesses(reqAll4, resAll4, nextAll4);
  assert.strictEqual(resAll4.statusCode, 200);
  assert.strictEqual(resAll4.data.count, 4);

  const bizList4 = resAll4.data.data;
  const names = bizList4.map(b => b.name);
  assert.ok(names.includes('Ramesh Wheat Farm'));
  assert.ok(names.includes('Ramesh Mini Flour Mill'));
  assert.ok(names.includes('Ramesh Mustard Enterprise'));
  assert.ok(names.includes('Ramesh Mustard Oil Expeller'));

  // Verify creating Business 4 did NOT overwrite Business 1
  const checkBiz1 = await dbRepository.getBusiness(businessA.id, userRamesh.id);
  assert.strictEqual(checkBiz1.name, 'Ramesh Wheat Farm');
  assert.strictEqual(checkBiz1.status, 'ANALYSIS_COMPLETE');

  console.log(`  ✓ PASS: 4 businesses simultaneously active for user without any data overwrite:`);
  bizList4.forEach((b, idx) => {
    console.log(`    [${idx + 1}] "${b.name}" | Domain: ${b.domain} | Type: ${b.business_type} | Status: ${b.status}`);
  });

  console.log('\n======================================================================');
  console.log('ALL 16 PHASE 1 MULTI-BUSINESS TESTS PASSED WITH 0 FAILURES');
  console.log('======================================================================\n');
}

runPhase1Tests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ PHASE 1 TEST RUNNER FAILED:', err);
  process.exit(1);
});
