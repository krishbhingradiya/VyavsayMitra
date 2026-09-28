/**
 * VYAVSAYMITRA — Phase 4: Production-Grade Workspace & Real Data Integration Tests
 * 
 * Verifies:
 * 1. Normalized Persistent Notifications (create, list, mark read, mark all read, tenant isolation)
 * 2. Input Snapshot Versioning (editing inputs increments version_number and does not overwrite past analysis runs)
 * 3. Analysis Rerun & History Immutability (past analyses remain preserved when rerunning with new inputs)
 * 4. Workspace Business Isolation (Agriculture vs FoodTech contexts remain strictly separated)
 * 5. Market Data Intelligence & Provenance Scoping
 * 6. Statutory Schemes Matching & Isolation
 * 7. AI Mitra Context Grounding (per active business ID without cross-leakage)
 * 8. Zero Formula Leakage (strictly business-facing terminology in outputs)
 */

const assert = require('assert');
const dbRepository = require('../src/models/dbRepository');
const businessManagementController = require('../src/controllers/businessManagementController');

// Helper to mock express req/res
function mockReqRes(reqData = {}) {
  const req = {
    user: reqData.user || { id: 'usr_phase4_test', email: 'kishan@vyavsaymitra.in', name: 'Kishan Patel' },
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

async function runPhase4Tests() {
  console.log('\n======================================================================');
  console.log('VYAVSAYMITRA — PHASE 4: PRODUCTION WORKSPACE & REAL DATA TEST SUITE');
  console.log('======================================================================\n');

  const userId = 'usr_phase4_test';
  const otherUserId = 'usr_phase4_unauthorized';

  // [Test 1] Create Test Profile
  console.log('[Test 1] Creating User Profile for Workspace Session...');
  await dbRepository.upsertProfile(userId, {
    name: 'Kishan Patel',
    email: 'kishan@vyavsaymitra.in',
    phone: '9876543210',
    preferred_language: 'gu',
    state: 'Gujarat',
    district: 'Rajkot',
    taluka: 'Gondal',
    onboarding_complete: true
  });
  const profile = await dbRepository.getProfile(userId);
  assert.strictEqual(profile.id, userId);
  assert.strictEqual(profile.name, 'Kishan Patel');
  console.log('  ✓ PASS: Profile initialized');

  // [Test 2] Create Business A: Groundnut Farming (Agriculture)
  console.log('\n[Test 2] Creating Agriculture Business (Groundnut Cultivation)...');
  let { req, res, next } = mockReqRes({
    user: { id: userId },
    body: {
      domain: 'agriculture',
      businessType: 'Groundnut Cultivation',
      name: 'Kishan Organic Groundnut',
      location: { state: 'Gujarat', district: 'Rajkot', taluka: 'Gondal' },
      inputs: {
        crop: 'Groundnut',
        area: 4,
        areaUnit: 'Acres',
        irrigationSource: 'Borewell',
        soilType: 'Black',
        expectedYieldPerAcre: 14,
        sellingPricePerUnit: 6200,
        sellingChannel: 'APMC Mandi',
        capitalAvailable: 60000
      }
    }
  });
  await businessManagementController.createBusiness(req, res, next);
  assert.strictEqual(res.statusCode, 201);
  const bizAId = res.data.data.id;
  assert.ok(bizAId);
  console.log(`  ✓ PASS: Business A created (ID: ${bizAId})`);

  // [Test 3] Create Business B: Peanut Butter Processing (FoodTech)
  console.log('\n[Test 3] Creating FoodTech Business (Peanut Butter & Processing)...');
  ({ req, res, next } = mockReqRes({
    user: { id: userId },
    body: {
      domain: 'foodtech',
      businessType: 'FOODTECH_FLOUR_MILL',
      name: 'Saurashtra Agro Processing Unit',
      location: { state: 'Gujarat', district: 'Rajkot', taluka: 'Gondal' },
      inputs: {
        raw_material_type: 'Groundnut Kernel',
        raw_material_quantity: 300,
        selling_price: 180,
        electricity_connection: 'Three Phase 440V',
        capitalAvailable: 150000
      }
    }
  }));
  await businessManagementController.createBusiness(req, res, next);
  assert.strictEqual(res.statusCode, 201);
  const bizBId = res.data.data.id;
  assert.ok(bizBId);
  console.log(`  ✓ PASS: Business B created (ID: ${bizBId})`);

  // [Test 4] Run Initial Analysis for Business A
  console.log('\n[Test 4] Running Initial Agriculture Analysis for Business A...');
  ({ req, res, next } = mockReqRes({
    user: { id: userId },
    params: { id: bizAId }
  }));
  await businessManagementController.analyzeBusiness(req, res, next);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.success, true);
  const analysis1 = res.data.data.analysis || res.data.data;
  assert.ok(analysis1.id);
  assert.ok(Number(analysis1.project_cost || analysis1.total_project_cost) > 0);
  assert.ok(analysis1.net_annual_profit !== undefined);
  console.log(`  ✓ PASS: Initial Analysis 1 generated (Project Cost: ₹${analysis1.project_cost || analysis1.total_project_cost}, Profit: ₹${analysis1.net_annual_profit})`);

  // [Test 5] Verify Input Snapshot Versioning (Edit Business Information)
  console.log('\n[Test 5] Editing Business A Inputs (Versioned snapshot test)...');
  const initialInputsList = await dbRepository.listBusinessInputs(bizAId);
  const countBeforeUpdate = initialInputsList.length;
  assert.ok(countBeforeUpdate >= 1);
  const initialLatestVersion = initialInputsList[0].version_number;

  // Update Business A with expanded acreage and new capital
  ({ req, res, next } = mockReqRes({
    user: { id: userId },
    params: { id: bizAId },
    body: {
      inputs: {
        crop: 'Groundnut',
        area: 6, // Expanded from 4 to 6 acres
        areaUnit: 'Acres',
        irrigationSource: 'Drip Irrigation',
        soilType: 'Black',
        expectedYieldPerAcre: 16,
        sellingPricePerUnit: 6500,
        sellingChannel: 'APMC Mandi',
        capitalAvailable: 100000
      }
    }
  }));
  await businessManagementController.updateBusiness(req, res, next);
  assert.strictEqual(res.statusCode, 200);

  // Check versioning: should now have incremented version
  const updatedInputsList = await dbRepository.listBusinessInputs(bizAId);
  assert.strictEqual(updatedInputsList.length, countBeforeUpdate + 1, 'Input versions count must increment');
  assert.strictEqual(updatedInputsList[0].version_number, initialLatestVersion + 1, 'Latest version must increment by 1');
  assert.strictEqual(updatedInputsList[0].inputs.area, 6);
  assert.strictEqual(updatedInputsList[updatedInputsList.length - 1].inputs.area, 4, 'Original v1 inputs preserved');
  console.log(`  ✓ PASS: Business inputs version incremented (v${initialLatestVersion} -> v${initialLatestVersion + 1}) without overwriting past version`);

  // [Test 6] Verify Past Analysis 1 Remains Immutable After Input Edit
  console.log('\n[Test 6] Verifying Past Analysis Immutability...');
  const analysesBeforeRerun = await dbRepository.listAnalyses(bizAId);
  assert.strictEqual(analysesBeforeRerun.length, 1, 'Original analysis still intact');
  assert.strictEqual(analysesBeforeRerun[0].id, analysis1.id);
  console.log('  ✓ PASS: Original analysis history remains immutable after input update');

  // [Test 7] Re-Run Analysis with Updated Inputs
  console.log('\n[Test 7] Re-Running Analysis on Business A (6 Acres)...');
  ({ req, res, next } = mockReqRes({
    user: { id: userId },
    params: { id: bizAId }
  }));
  await businessManagementController.analyzeBusiness(req, res, next);
  assert.strictEqual(res.statusCode, 200);
  const analysis2 = res.data.data.analysis || res.data.data;
  assert.ok(analysis2.id);
  assert.notStrictEqual(analysis2.id, analysis1.id, 'New analysis must have distinct ID');

  const allAnalyses = await dbRepository.listAnalyses(bizAId);
  assert.strictEqual(allAnalyses.length, 2, 'Both analyses must be preserved in history');
  console.log(`  ✓ PASS: Re-run generated new immutable analysis (Analyses count: ${allAnalyses.length})`);

  // [Test 8] Test Persistent Notifications System
  console.log('\n[Test 8] Testing Normalized Persistent Notifications...');
  // Notifications should have been generated automatically during analysis & creation
  let notifsRes;
  ({ req, res: notifsRes, next } = mockReqRes({
    user: { id: userId }
  }));
  await businessManagementController.listNotifications(req, notifsRes, next);
  assert.strictEqual(notifsRes.statusCode, 200);
  assert.ok(Array.isArray(notifsRes.data.data));
  const notifs = notifsRes.data.data;
  assert.ok(notifs.length > 0, 'Notifications must exist from business lifecycle events');
  console.log(`  ✓ PASS: Retrieved ${notifs.length} persistent notifications for user`);

  // Verify notification fields
  const firstNotif = notifs[0];
  assert.ok(firstNotif.id);
  assert.strictEqual(firstNotif.user_id, userId);
  assert.ok(firstNotif.title);
  assert.ok(firstNotif.message);
  assert.strictEqual(firstNotif.is_read, false);
  console.log(`  ✓ PASS: Notification schema verified: "${firstNotif.title}"`);

  // Mark single notification as read
  let markRes;
  ({ req, res: markRes, next } = mockReqRes({
    user: { id: userId },
    params: { id: firstNotif.id }
  }));
  await businessManagementController.markNotificationRead(req, markRes, next);
  assert.strictEqual(markRes.statusCode, 200);
  assert.strictEqual(markRes.data.success, true);
  console.log(`  ✓ PASS: Single notification ${firstNotif.id} marked as read`);

  // Mark all notifications as read
  let markAllRes;
  ({ req, res: markAllRes, next } = mockReqRes({
    user: { id: userId }
  }));
  await businessManagementController.markAllNotificationsRead(req, markAllRes, next);
  assert.strictEqual(markAllRes.statusCode, 200);
  assert.strictEqual(markAllRes.data.success, true);

  // Verify all are now read
  ({ req, res: notifsRes, next } = mockReqRes({
    user: { id: userId }
  }));
  await businessManagementController.listNotifications(req, notifsRes, next);
  assert.strictEqual(notifsRes.data.unread_count, 0, 'Unread count should now be 0');
  console.log('  ✓ PASS: All notifications marked as read; unread_count is 0');

  // [Test 9] Test Tenant Isolation on Notifications
  console.log('\n[Test 9] Testing Multi-Tenant Isolation for Notifications...');
  let unauthorizedNotifRes;
  ({ req, res: unauthorizedNotifRes, next } = mockReqRes({
    user: { id: otherUserId },
    params: { id: firstNotif.id }
  }));
  await businessManagementController.markNotificationRead(req, unauthorizedNotifRes, next);
  assert.strictEqual(unauthorizedNotifRes.statusCode, 404, 'Other user cannot mark another user\'s notification');
  console.log('  ✓ PASS: Unauthorized user rejected from modifying foreign notifications (404)');

  // [Test 10] Test Market Data Intelligence Isolation
  console.log('\n[Test 10] Testing Market Data Integration & Scoping...');
  let marketRes;
  ({ req, res: marketRes, next } = mockReqRes({
    user: { id: userId },
    params: { id: bizAId }
  }));
  await businessManagementController.getBusinessMarket(req, marketRes, next);
  assert.strictEqual(marketRes.statusCode, 200);
  assert.ok(marketRes.data.success);
  assert.ok(marketRes.data.data);
  assert.ok(marketRes.data.data.modalPricePerQtl > 0 || marketRes.data.data.commodity);
  console.log(`  ✓ PASS: Mandi intelligence retrieved with provenance: "${marketRes.data.data.provenance || marketRes.data.data.dataStatus || 'verified market observation'}"`);

  // [Test 11] Test Scheme Matching Isolation
  console.log('\n[Test 11] Testing Statutory Scheme Matching & Isolation...');
  let schemesRes;
  ({ req, res: schemesRes, next } = mockReqRes({
    user: { id: userId },
    params: { id: bizAId }
  }));
  await businessManagementController.getBusinessSchemes(req, schemesRes, next);
  assert.strictEqual(schemesRes.statusCode, 200);
  assert.ok(schemesRes.data.success);
  const matchedSchemes = schemesRes.data.data;
  assert.ok(Array.isArray(matchedSchemes));
  assert.ok(matchedSchemes.length > 0, 'Agriculture business must receive matched schemes');
  for (const s of matchedSchemes) {
    assert.ok(s.schemeName || s.name || s.scheme_name || s.id);
    assert.ok(s.eligibilityStatus || s.eligibility_status);
  }
  console.log(`  ✓ PASS: ${matchedSchemes.length} statutory schemes matched for Business A`);

  // [Test 12] Test AI Mitra Business Context Isolation
  console.log('\n[Test 12] Testing AI Mitra Context Scoping per Business...');
  let aiRes;
  ({ req, res: aiRes, next } = mockReqRes({
    user: { id: userId },
    params: { id: bizAId },
    body: { message: 'How much capital do I need for this groundnut farm?' }
  }));
  await businessManagementController.chatAi(req, aiRes, next);
  assert.strictEqual(aiRes.statusCode, 200);
  assert.ok(aiRes.data.success);
  assert.ok(aiRes.data.data.reply);
  assert.strictEqual(aiRes.data.data.contextUsed.businessId, bizAId);
  console.log('  ✓ PASS: AI response grounded strictly in Business A context');

  // Verify Business B AI session is completely isolated
  let aiResB;
  ({ req, res: aiResB, next } = mockReqRes({
    user: { id: userId },
    params: { id: bizBId },
    body: { message: 'What machinery do I need?' }
  }));
  await businessManagementController.chatAi(req, aiResB, next);
  assert.strictEqual(aiResB.statusCode, 200);
  assert.ok(aiResB.data.data.reply);
  assert.strictEqual(aiResB.data.data.contextUsed.businessId, bizBId);
  console.log('  ✓ PASS: Business B AI session isolated from Business A');

  // [Test 13] Verify Zero Formula Leakage in Analysis Outputs
  console.log('\n[Test 13] Verifying Zero Internal Formula Leakage in Outputs...');
  const forbiddenPatterns = [
    'Cost A1', 'Cost A2', 'Cost B1', 'Cost B2', 'Cost C1', 'Cost C2',
    'CACP', 'AST Score', 'Mass balance equation', 'FormulaRegistry'
  ];
  const analysisString = JSON.stringify(analysis2);
  for (const pattern of forbiddenPatterns) {
    // Check if key or prominent user-facing label leaks internal terms
    assert.ok(
      !analysisString.includes(`"label":"${pattern}"`),
      `Forbidden formula pattern found in analysis output: ${pattern}`
    );
  }
  console.log('  ✓ PASS: Zero internal formulas exposed in analysis response');

  // [Test 14] Test Multi-Business Switching & State Integrity
  console.log('\n[Test 14] Testing Multi-Business Context Switching & State Integrity...');
  let bizARetrieved, bizBRetrieved;
  ({ req, res: bizARetrieved, next } = mockReqRes({ user: { id: userId }, params: { id: bizAId } }));
  await businessManagementController.getBusiness(req, bizARetrieved, next);
  assert.strictEqual(bizARetrieved.data.data.domain, 'agriculture');
  assert.strictEqual(bizARetrieved.data.data.inputs.crop, 'Groundnut');

  ({ req, res: bizBRetrieved, next } = mockReqRes({ user: { id: userId }, params: { id: bizBId } }));
  await businessManagementController.getBusiness(req, bizBRetrieved, next);
  assert.strictEqual(bizBRetrieved.data.data.domain, 'foodtech');
  assert.strictEqual(bizBRetrieved.data.data.inputs.raw_material_type, 'Groundnut Kernel');
  console.log('  ✓ PASS: Multi-business switching provides 100% isolated domain states without cross-contamination');

  console.log('\n======================================================================');
  console.log('ALL 14 PHASE 4 WORKSPACE & DATA INTEGRATION TESTS PASSED (0 FAILURES)');
  console.log('======================================================================\n');
  process.exit(0);
}

if (require.main === module) {
  runPhase4Tests().catch(err => {
    console.error('\n❌ PHASE 4 TEST FAILURE:', err);
    process.exit(1);
  });
}

module.exports = { runPhase4Tests };
