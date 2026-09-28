/**
 * VYAVSAYMITRA — Multi-Business Architecture & Workspace Test Suite
 * 
 * Verifies:
 * 1. Profile management and session derivation
 * 2. Multi-business creation (Agriculture + FoodTech)
 * 3. Domain-specific calculation orchestration
 * 4. Multi-tenant business isolation
 * 5. Real market data & statutory schemes retrieval
 * 6. Business-context grounded AI Mitra chat
 * 7. Report snapshot generation
 */

const assert = require('assert');
const dbRepository = require('../src/models/dbRepository');
const { generateToken } = require('../src/middleware/authMiddleware');
const businessManagementController = require('../src/controllers/businessManagementController');

async function runTests() {
  console.log('\n======================================================================');
  console.log('RUNNING BUSINESS MANAGEMENT & WORKSPACE TEST SUITE');
  console.log('======================================================================\n');

  const userA = { id: 'test_user_a', email: 'ramesh.patel@anand.in', name: 'Ramesh Patel' };
  const userB = { id: 'test_user_b', email: 'suresh.shah@vadodara.in', name: 'Suresh Shah' };

  // 1. Profile Management
  console.log('[1] Testing Profile Management...');
  const profA = await dbRepository.upsertProfile(userA.id, {
    email: userA.email,
    name: userA.name,
    state: 'Gujarat',
    district: 'Anand',
    village: 'Changa',
    capital_available: 250000
  });
  assert.strictEqual(profA.name, 'Ramesh Patel');
  assert.strictEqual(profA.district, 'Anand');
  console.log('  ✓ PASS: Profile upserted and retrieved successfully');

  // 2. Agriculture Business Creation
  console.log('[2] Testing Agriculture Business Creation...');
  const agriBiz = await dbRepository.createBusiness(userA.id, {
    name: 'Wheat & Mustard Cultivation',
    domain: 'agriculture',
    business_type: 'crop_farming',
    location: { state: 'Gujarat', district: 'Anand', village: 'Changa', is_rural: true },
    inputs: { crop: 'Wheat', areaAcres: 5, season: 'Rabi' }
  });
  assert.ok(agriBiz.id.startsWith('biz_'));
  assert.strictEqual(agriBiz.domain, 'agriculture');
  assert.strictEqual(agriBiz.user_id, userA.id);
  console.log('  ✓ PASS: Agriculture business entity created with location & inputs');

  // 3. FoodTech Business Creation
  console.log('[3] Testing FoodTech Business Creation...');
  const foodBiz = await dbRepository.createBusiness(userA.id, {
    name: 'Modern Mini Flour Mill',
    domain: 'foodtech',
    business_type: 'FOODTECH_FLOUR_MILL',
    location: { state: 'Gujarat', district: 'Anand', village: 'Bakrol', is_rural: true },
    inputs: { businessId: 'FOODTECH_FLOUR_MILL', raw_material_quantity: 500, selling_price: 36 }
  });
  assert.strictEqual(foodBiz.domain, 'foodtech');
  console.log('  ✓ PASS: FoodTech business entity created');

  // 4. List Businesses per User
  console.log('[4] Testing Multi-Business Listing...');
  const listA = await dbRepository.listBusinesses(userA.id);
  assert.ok(listA.length >= 2, `Expected at least 2 businesses, got ${listA.length}`);
  const hasAgri = listA.some(b => b.domain === 'agriculture');
  const hasFood = listA.some(b => b.domain === 'foodtech');
  assert.ok(hasAgri && hasFood, 'User businesses include both Agriculture and FoodTech');
  console.log('  ✓ PASS: User can maintain multiple businesses concurrently');

  // 5. Multi-Tenant Isolation
  console.log('[5] Testing Multi-Tenant Access Isolation...');
  const listB = await dbRepository.listBusinesses(userB.id);
  assert.strictEqual(listB.length, 0, 'User B has zero businesses initially');
  const crossAccess = await dbRepository.getBusiness(agriBiz.id, userB.id);
  assert.strictEqual(crossAccess, null, 'User B strictly cannot access User A business');
  console.log('  ✓ PASS: Strict user isolation prevents cross-tenant access');

  // 6. Agriculture Analysis Run
  console.log('[6] Testing Agriculture Analysis Execution...');
  const mockReqAgri = {
    user: userA,
    params: { id: agriBiz.id },
    body: { crop: 'Wheat', areaAcres: 5, season: 'Rabi', state: 'Gujarat', district: 'Anand' }
  };
  let agriResponseData = null;
  const mockResAgri = {
    json: (d) => { agriResponseData = d; },
    status: () => mockResAgri
  };
  await businessManagementController.analyzeBusiness(mockReqAgri, mockResAgri, (err) => { throw err; });
  assert.ok(agriResponseData?.success, 'Agriculture analysis ran successfully');
  assert.ok(agriResponseData?.data?.analysis?.total_project_cost > 0, 'Total cost calculated');
  assert.ok(agriResponseData?.data?.analysis?.net_annual_profit > 0, 'Net profit calculated');
  console.log(`  ✓ PASS: Agriculture analysis executed (Project Cost: ₹${agriResponseData.data.analysis.total_project_cost}, Profit: ₹${agriResponseData.data.analysis.net_annual_profit})`);

  // 7. FoodTech Analysis Run
  console.log('[7] Testing FoodTech Analysis Execution...');
  const mockReqFood = {
    user: userA,
    params: { id: foodBiz.id },
    body: { businessId: 'FOODTECH_FLOUR_MILL', raw_material_quantity: 500, selling_price: 36 }
  };
  let foodResponseData = null;
  const mockResFood = {
    json: (d) => { foodResponseData = d; },
    status: () => mockResFood
  };
  await businessManagementController.analyzeBusiness(mockReqFood, mockResFood, (err) => { throw err; });
  assert.ok(foodResponseData?.success, 'FoodTech analysis ran successfully');
  assert.ok(foodResponseData?.data?.analysis?.total_project_cost > 0, 'FoodTech Capex calculated');
  console.log(`  ✓ PASS: FoodTech analysis executed (Capex: ₹${foodResponseData.data.analysis.total_project_cost})`);

  // 8. Market Intelligence Retrieval
  console.log('[8] Testing Verified Market Intelligence...');
  const mockReqMarket = { user: userA, params: { id: agriBiz.id } };
  let marketData = null;
  const mockResMarket = { json: (d) => { marketData = d; } };
  await businessManagementController.getBusinessMarket(mockReqMarket, mockResMarket, (err) => { throw err; });
  assert.ok(marketData?.success, 'Market data returned');
  assert.ok(marketData?.data?.modalPricePerQtl > 0, 'Modal Mandi price retrieved');
  console.log(`  ✓ PASS: Fused Mandi rate retrieved: ₹${marketData.data.modalPricePerQtl}/quintal (${marketData.data.dataStatus})`);

  // 9. Statutory Schemes Matching
  console.log('[9] Testing Statutory Schemes Matching...');
  const mockReqSchemes = { user: userA, params: { id: agriBiz.id } };
  let schemesData = null;
  const mockResSchemes = { json: (d) => { schemesData = d; } };
  await businessManagementController.getBusinessSchemes(mockReqSchemes, mockResSchemes, (err) => { throw err; });
  assert.ok(schemesData?.success, 'Schemes returned');
  assert.ok(schemesData?.count > 0, 'Eligible schemes identified');
  console.log(`  ✓ PASS: ${schemesData.count} statutory schemes matched for agriculture enterprise`);

  // 10. Context-Aware AI Mitra Chat
  console.log('[10] Testing Context-Aware AI Mitra Chat...');
  const mockReqAi = {
    user: userA,
    params: { id: agriBiz.id },
    body: { message: 'Can you explain my loan requirements and key risks?' }
  };
  let aiData = null;
  const mockResAi = { json: (d) => { aiData = d; }, status: () => mockResAi };
  await businessManagementController.chatAi(mockReqAi, mockResAi, (err) => { throw err; });
  assert.ok(aiData?.success, 'AI Mitra chat completed');
  assert.ok(aiData?.data?.reply?.length > 50, 'Substantive advice generated');
  assert.strictEqual(aiData?.data?.contextUsed?.domain, 'agriculture');
  console.log('  ✓ PASS: AI Mitra generated advice strictly grounded in verified business context');

  // 11. Reports & DPR Creation
  console.log('[11] Testing DPR & Reports Creation...');
  const mockReqRep = {
    user: userA,
    params: { id: agriBiz.id },
    body: { title: 'Bankable DPR — Wheat Cultivation 5 Acres', reportType: 'BANKABLE_DPR' }
  };
  let repData = null;
  const mockResRep = { json: (d) => { repData = d; }, status: () => mockResRep };
  await businessManagementController.createReport(mockReqRep, mockResRep, (err) => { throw err; });
  assert.ok(repData?.success, 'Report created');
  assert.strictEqual(repData?.data?.report_type, 'BANKABLE_DPR');
  console.log('  ✓ PASS: Bankable DPR snapshot generated and persisted');

  console.log('\n======================================================================');
  console.log('ALL 11 BUSINESS MANAGEMENT TESTS PASSED WITH 0 FAILURES');
  console.log('======================================================================\n');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
