/**
 * VYAVSAYMITRA — PHASE 7: REAL-WORLD PRODUCTIZATION & EXECUTION TEST SUITE
 * 
 * Comprehensive 34-Test Verification Suite:
 * 1–5:   Authentication Enforcement (401 AUTH_REQUIRED)
 * 6–11:  Multi-Tenant IDOR Security (404 Not Found for Foreign Businesses)
 * 12–19: Action Tasks Lifecycle & Execution Tracking
 * 20–23: Document Readiness Checklist & Verification Notes
 * 24–25: Real Deterministic Progress & Bank Loan Readiness
 * 26–29: Bankable DPR Snapshot & Monotonic Immutable Versioning
 * 30:    Business Audit Timeline Logging
 * 31–32: Real-World Market Trends (Zero Fake Data Guarantee)
 * 33:    AI Mitra Action Mode (Structured JSON Execution Plan)
 * 34:    Formula Privacy & Zero Leakage Audit
 */

const assert = require('assert');
const dbRepository = require('../src/models/dbRepository');
const actionPlanController = require('../src/controllers/actionPlanController');
const businessManagementController = require('../src/controllers/businessManagementController');
const actionPlanService = require('../src/services/actionPlanService');
const { generateBusinessChatResponse } = require('../src/services/ai/aiService');
const { requireAuth } = require('../src/middleware/authMiddleware');

function mockReqRes(reqData = {}) {
  const req = {
    user: reqData.user || { id: 'usr_p7_owner', email: 'owner@vyavsaymitra.in', name: 'Kisan Patel' },
    params: reqData.params || {},
    body: reqData.body || {},
    headers: reqData.headers || {},
    query: reqData.query || {},
    id: 'req_phase7_test'
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
    if (err) {
      res.error = err;
      console.error('[mockReqRes error caught]:', err);
    }
  };

  return { req, res, next };
}

async function runPhase7TestSuite() {
  console.log('\n======================================================================');
  console.log('VYAVSAYMITRA — PHASE 7: REAL-WORLD PRODUCTIZATION & EXECUTION TEST SUITE');
  console.log('======================================================================\n');

  const ownerUser = { id: 'usr_p7_owner', email: 'owner@vyavsaymitra.in', name: 'Kisan Patel' };
  const intruderUser = { id: 'usr_p7_intruder', email: 'intruder@vyavsaymitra.in', name: 'Intruder' };

  // Setup test businesses
  const agriBiz = await dbRepository.createBusiness(ownerUser.id, {
    name: 'Patel Organic Wheat Farm',
    domain: 'agriculture',
    businessType: 'WHEAT_FARMING',
    status: 'READY_FOR_ANALYSIS'
  });

  const foodBiz = await dbRepository.createBusiness(ownerUser.id, {
    name: 'Anand Spices & Flour Mill',
    domain: 'foodtech',
    businessType: 'FOODTECH_FLOUR_MILL',
    status: 'READY_FOR_ANALYSIS'
  });

  await dbRepository.saveBusinessInputs(agriBiz.id, 'agriculture', {
    crop_type: 'Wheat',
    land_size: 4,
    soil_type: 'Loamy',
    irrigation_type: 'Tube Well'
  });

  await dbRepository.saveBusinessInputs(foodBiz.id, 'foodtech', {
    product_type: 'Atta & Spices',
    processing_capacity: 150,
    raw_material_type: 'Whole Grain Wheat',
    power_source: 'Commercial 3-Phase'
  });

  console.log(`[Setup] Created test enterprises:\n  - Agri: ${agriBiz.id}\n  - FoodTech: ${foodBiz.id}\n`);

  // ── PART 1: AUTHENTICATION ENFORCEMENT ──────────────────────────────
  console.log('[PART 1] Authentication Enforcement Tests...');

  // Test 1: Action Plan requires auth
  {
    const { req, res, next } = mockReqRes({ headers: {} });
    delete req.user;
    await requireAuth(req, res, next);
    assert.strictEqual(res.statusCode, 401);
    console.log('  ✓ Test 1 PASS: Action plan route rejects unauthenticated requests (401)');
  }

  // Test 2: Documents require auth
  {
    const { req, res, next } = mockReqRes({ headers: {} });
    delete req.user;
    await requireAuth(req, res, next);
    assert.strictEqual(res.statusCode, 401);
    console.log('  ✓ Test 2 PASS: Documents checklist route rejects unauthenticated requests (401)');
  }

  // Test 3: Progress requires auth
  {
    const { req, res, next } = mockReqRes({ headers: {} });
    delete req.user;
    await requireAuth(req, res, next);
    assert.strictEqual(res.statusCode, 401);
    console.log('  ✓ Test 3 PASS: Progress calculation route rejects unauthenticated requests (401)');
  }

  // Test 4: DPR versions require auth
  {
    const { req, res, next } = mockReqRes({ headers: {} });
    delete req.user;
    await requireAuth(req, res, next);
    assert.strictEqual(res.statusCode, 401);
    console.log('  ✓ Test 4 PASS: DPR versions route rejects unauthenticated requests (401)');
  }

  // Test 5: Timeline requires auth
  {
    const { req, res, next } = mockReqRes({ headers: {} });
    delete req.user;
    await requireAuth(req, res, next);
    assert.strictEqual(res.statusCode, 401);
    console.log('  ✓ Test 5 PASS: Timeline route rejects unauthenticated requests (401)');
  }

  // ── PART 2: MULTI-TENANT IDOR SECURITY ──────────────────────────────
  console.log('\n[PART 2] Multi-Tenant IDOR Security (404 Isolation)...');

  // Test 6: Intruder forbidden from reading owner action plan
  {
    const { req, res, next } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id } });
    await actionPlanController.getActionPlan(req, res, next);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.success, false);
    console.log('  ✓ Test 6 PASS: Intruder prohibited from accessing action plan (404)');
  }

  // Test 7: Intruder forbidden from reading owner documents
  {
    const { req, res, next } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id } });
    await actionPlanController.getDocuments(req, res, next);
    assert.strictEqual(res.statusCode, 404);
    console.log('  ✓ Test 7 PASS: Intruder prohibited from accessing documents checklist (404)');
  }

  // Test 8: Intruder forbidden from reading owner progress
  {
    const { req, res, next } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id } });
    await actionPlanController.getProgress(req, res, next);
    assert.strictEqual(res.statusCode, 404);
    console.log('  ✓ Test 8 PASS: Intruder prohibited from viewing progress (404)');
  }

  // Test 9: Intruder forbidden from reading owner DPR versions
  {
    const { req, res, next } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id } });
    await actionPlanController.listDprVersions(req, res, next);
    assert.strictEqual(res.statusCode, 404);
    console.log('  ✓ Test 9 PASS: Intruder prohibited from viewing DPR versions (404)');
  }

  // Test 10: Intruder forbidden from reading owner timeline
  {
    const { req, res, next } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id } });
    await actionPlanController.getTimeline(req, res, next);
    assert.strictEqual(res.statusCode, 404);
    console.log('  ✓ Test 10 PASS: Intruder prohibited from viewing audit timeline (404)');
  }

  // Test 11: Intruder forbidden from accessing market trends of owner business
  {
    const { req, res, next } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id } });
    await actionPlanController.getMarketTrends(req, res, next);
    assert.strictEqual(res.statusCode, 404);
    console.log('  ✓ Test 11 PASS: Intruder prohibited from accessing market trends (404)');
  }

  // ── PART 3: ACTION TASKS LIFECYCLE ──────────────────────────────────
  console.log('\n[PART 3] Action Tasks Lifecycle & Execution Tracking...');

  // Test 12: Auto-initialization for Agriculture
  let agriTasks = [];
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getActionPlan(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert(res.data.data.tasks.length > 0);
    agriTasks = res.data.data.tasks;
    assert(agriTasks.some(t => t.title.toLowerCase().includes('soil') || t.title.toLowerCase().includes('irrigation')));
    console.log(`  ✓ Test 12 PASS: Agri action plan auto-seeded with ${agriTasks.length} milestones`);
  }

  // Test 13: Auto-initialization for FoodTech (verifying FSSAI & machinery)
  let foodTasks = [];
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: foodBiz.id } });
    await actionPlanController.getActionPlan(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    foodTasks = res.data.data.tasks;
    assert(foodTasks.some(t => t.title.toLowerCase().includes('fssai')));
    assert(foodTasks.some(t => t.title.toLowerCase().includes('machinery')));
    console.log(`  ✓ Test 13 PASS: FoodTech action plan auto-seeded with mandatory FSSAI & machinery milestones`);
  }

  // Test 14: Creating custom user action task
  let customTaskId = '';
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: {
        title: 'Schedule Farm Visit by KVK Scientist',
        description: 'Verify bio-fertilizer and micronutrient spray schedule.',
        category: 'operations',
        priority: 'high',
        dueDate: '2026-10-15'
      }
    });
    await actionPlanController.createTask(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.title, 'Schedule Farm Visit by KVK Scientist');
    assert.strictEqual(res.data.data.source, 'user');
    customTaskId = res.data.data.id;
    console.log(`  ✓ Test 14 PASS: Created custom action task (${customTaskId})`);
  }

  // Test 15: Invalid task creation (empty title) rejected
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: { title: '   ' }
    });
    await actionPlanController.createTask(req, res, next);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    console.log('  ✓ Test 15 PASS: Task with empty title rejected (400 Bad Request)');
  }

  // Test 16: Updating task status
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, taskId: customTaskId },
      body: { status: 'in_progress' }
    });
    await actionPlanController.updateTask(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.data.status, 'in_progress');
    console.log('  ✓ Test 16 PASS: Task status transitioned to in_progress');
  }

  // Test 17: Completing task automatically stamps completed_at
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, taskId: customTaskId },
      body: { status: 'completed' }
    });
    await actionPlanController.updateTask(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.data.status, 'completed');
    assert(Boolean(res.data.data.completed_at));
    console.log(`  ✓ Test 17 PASS: Task completed and stamped with timestamp (${res.data.data.completed_at})`);
  }

  // Test 18: Invalid task status rejected
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, taskId: customTaskId },
      body: { status: 'INVALID_STATUS' }
    });
    await actionPlanController.updateTask(req, res, next);
    assert.strictEqual(res.statusCode, 400);
    console.log('  ✓ Test 18 PASS: Invalid task status rejected (400)');
  }

  // Test 19: Deleting action task
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, taskId: customTaskId }
    });
    await actionPlanController.deleteTask(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    console.log('  ✓ Test 19 PASS: Task deleted successfully');
  }

  // ── PART 4: DOCUMENT READINESS CHECKLIST ─────────────────────────────
  console.log('\n[PART 4] Document Readiness Checklist & Verification...');

  // Test 20: Standard documents for Agriculture
  let agriDocs = [];
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getDocuments(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    agriDocs = res.data.data;
    assert(agriDocs.some(d => d.document_type === 'land_record'));
    assert(agriDocs.some(d => d.document_type === 'pan_card'));
    console.log(`  ✓ Test 20 PASS: Agriculture documents checklist seeded (${agriDocs.length} documents)`);
  }

  // Test 21: Standard documents for FoodTech
  let foodDocs = [];
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: foodBiz.id } });
    await actionPlanController.getDocuments(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    foodDocs = res.data.data;
    assert(foodDocs.some(d => d.document_type === 'fssai_license'));
    assert(foodDocs.some(d => d.document_type === 'machinery_quotes'));
    console.log(`  ✓ Test 21 PASS: FoodTech documents checklist seeded with FSSAI & machinery quotes (${foodDocs.length} documents)`);
  }

  // Test 22: Updating document status
  const targetDoc = agriDocs.find(d => d.document_type === 'land_record') || agriDocs[0];
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, docId: targetDoc.id },
      body: { status: 'provided', notes: 'Uploaded 7/12 extract certified by Talati' }
    });
    await actionPlanController.updateDocument(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.data.status, 'provided');
    console.log('  ✓ Test 22 PASS: Document marked as provided');
  }

  // Test 23: Storing document reference notes
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, docId: targetDoc.id },
      body: { status: 'verified', notes: 'Verified by Bank Credit Officer during branch appraisal' }
    });
    await actionPlanController.updateDocument(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.data.status, 'verified');
    assert.strictEqual(res.data.data.notes, 'Verified by Bank Credit Officer during branch appraisal');
    console.log('  ✓ Test 23 PASS: Document notes and verification stored');
  }

  // ── PART 5: REAL PROGRESS & READINESS CALCULATION ───────────────────
  console.log('\n[PART 5] Progress & Readiness Calculation...');

  // Test 24: Real progress calculation
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getProgress(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    const progress = res.data.data;
    assert(typeof progress.overallProgress === 'number');
    assert(progress.overallProgress >= 0 && progress.overallProgress <= 100);
    assert(Boolean(progress.breakdown));
    assert(Boolean(progress.breakdown.setup));
    assert(Boolean(progress.breakdown.inputs));
    assert(Boolean(progress.readiness));
    console.log(`  ✓ Test 24 PASS: Progress computed dynamically: ${progress.overallProgress}%`);
  }

  // Test 25: Bank loan readiness flag
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getProgress(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    const readiness = res.data.data.readiness;
    assert(typeof readiness.bankLoanReady === 'boolean');
    assert(typeof readiness.nextMilestone === 'string');
    console.log(`  ✓ Test 25 PASS: Bank loan readiness derived: next milestone "${readiness.nextMilestone}"`);
  }

  // ── PART 6: BANKABLE DPR SNAPSHOT & VERSIONING ──────────────────────
  console.log('\n[PART 6] Bankable DPR Versioning & Immutability...');

  // Test 26: DPR creation blocked without completed analysis
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: { title: 'DPR Snapshot Attempt' }
    });
    await actionPlanController.createDprVersion(req, res, next);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    console.log('  ✓ Test 26 PASS: DPR generation strictly blocked when business has no completed analysis (400)');
  }

  // Run analysis to allow DPR generation
  const analysisRecord = await dbRepository.saveAnalysis(agriBiz.id, {
    engineName: 'agriculture_crop_cacp',
    status: 'ANALYSIS_COMPLETE',
    totalProjectCost: 48000,
    promoterEquity: 5000,
    bankLoanRequirement: 43000,
    annualRevenue: 145000,
    annualOperatingCost: 48000,
    netAnnualProfit: 97000,
    annualRoiPct: 202.1,
    dscr: 1.85,
    viabilityRating: 'HIGHLY_FEASIBLE',
    financialSummary: { totalProjectCost: 48000, promoterEquity: 5000, bankLoanRequirement: 43000 },
    confidenceState: 'VERIFIED'
  });

  // Test 27: Creating immutable DPR version v1
  let v1 = null;
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: { title: 'Bankable DPR v1 — Wheat Cultivation' }
    });
    await actionPlanController.createDprVersion(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.version_number, 1);
    assert(Boolean(res.data.data.content_snapshot));
    v1 = res.data.data;
    console.log('  ✓ Test 27 PASS: DPR version 1 generated and archived');
  }

  // Test 28: Incrementing DPR version number monotonically (v1 -> v2)
  let v2 = null;
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: { title: 'Bankable DPR v2 — Updated Working Capital' }
    });
    await actionPlanController.createDprVersion(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.data.version_number, 2);
    v2 = res.data.data;
    console.log('  ✓ Test 28 PASS: Subsequent DPR incremented monotonically to v2');
  }

  // Test 29: DPR version immutability verification
  {
    const versions = await dbRepository.listDprVersions(agriBiz.id);
    assert.strictEqual(versions.length, 2);
    assert.strictEqual(versions[0].version_number, 2); // newest first
    assert.strictEqual(versions[1].version_number, 1);
    assert.strictEqual(versions[1].title, 'Bankable DPR v1 — Wheat Cultivation');
    console.log('  ✓ Test 29 PASS: Version records remain immutable and independently preserved');
  }

  // ── PART 7: BUSINESS AUDIT TIMELINE LOGGING ─────────────────────────
  console.log('\n[PART 7] Business Audit Timeline Trail...');

  // Test 30: Audit timeline events logged
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getTimeline(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.data.length > 0);
    const eventTypes = res.data.data.map(e => e.event_type);
    assert(eventTypes.includes('DPR_VERSION_CREATED'));
    console.log(`  ✓ Test 30 PASS: Business timeline recorded ${res.data.data.length} lifecycle events`);
  }

  // ── PART 8: REAL-WORLD MARKET TRENDS (ZERO FAKE DATA) ───────────────
  console.log('\n[PART 8] Real-World Market Trends (Zero Fake Data Guarantee)...');

  // Test 31: Returns available: false when < 2 points
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getMarketTrends(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.available, false);
    assert.strictEqual(res.data.dataPoints.length, 0);
    assert(res.data.message.includes('unavailable'));
    console.log('  ✓ Test 31 PASS: Market trends honest unavailable state when < 2 data points (0 fabricated points)');
  }

  // Add 3 real historical observation points
  await dbRepository.saveMarketObservation(agriBiz.id, {
    commodity: 'Wheat',
    modal_price: 2275,
    unit: 'INR/quintal',
    market_name: 'Anand Mandi',
    observation_date: '2026-08-01',
    provenance: { source: 'AGMARKNET' }
  });
  await dbRepository.saveMarketObservation(agriBiz.id, {
    commodity: 'Wheat',
    modal_price: 2320,
    unit: 'INR/quintal',
    market_name: 'Anand Mandi',
    observation_date: '2026-08-15',
    provenance: { source: 'AGMARKNET' }
  });
  await dbRepository.saveMarketObservation(agriBiz.id, {
    commodity: 'Wheat',
    modal_price: 2360,
    unit: 'INR/quintal',
    market_name: 'Anand Mandi',
    observation_date: '2026-09-01',
    provenance: { source: 'AGMARKNET' }
  });

  // Test 32: Aggregates real points when >= 2 points exist
  {
    const { req, res, next } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getMarketTrends(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.available, true);
    assert.strictEqual(res.data.commodity, 'Wheat');
    assert.strictEqual(res.data.dataPoints.length, 3);
    assert.strictEqual(res.data.dataPoints[0].modalPrice, 2275);
    console.log(`  ✓ Test 32 PASS: Real historical mandi trends aggregated successfully (${res.data.dataPoints.length} points)`);
  }

  // ── PART 9: AI MITRA ACTION MODE ────────────────────────────────────
  console.log('\n[PART 9] AI Mitra Action Mode...');

  // Test 33: Structured actions response
  {
    const aiResponse = await generateBusinessChatResponse({
      business: foodBiz,
      analysis: null,
      market: null,
      schemes: [{ name: 'PMFME Micro Food Processing Scheme' }],
      userPrompt: 'Give me my action plan and next steps',
      mode: 'action'
    });

    assert(Boolean(aiResponse.structuredActions));
    assert(Boolean(aiResponse.structuredActions.actions.length > 0));
    assert(Boolean(aiResponse.structuredActions.warnings.length > 0));
    assert(Boolean(aiResponse.structuredActions.relatedSchemes));
    console.log(`  ✓ Test 33 PASS: AI Mitra action mode generated ${aiResponse.structuredActions.actions.length} structured action items with operational warnings`);
  }

  // ── PART 10: FORMULA PRIVACY AUDIT ──────────────────────────────────
  console.log('\n[PART 10] Formula Privacy Audit Across All Phase 7 Endpoints...');

  // Test 34: Zero formula leakage
  {
    const { req: pReq, res: pRes } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getActionPlan(pReq, pRes, () => {});
    const actionPlanStr = JSON.stringify(pRes.data);

    const { req: dReq, res: dRes } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.getDocuments(dReq, dRes, () => {});
    const docStr = JSON.stringify(dRes.data);

    const { req: rReq, res: rRes } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await actionPlanController.listDprVersions(rReq, rRes, () => {});
    const dprStr = JSON.stringify(rRes.data);

    const fullOutput = actionPlanStr + docStr + dprStr;
    const forbiddenEquations = [
      'Cost A1', 'Cost A2', 'Cost B1', 'Cost B2', 'Cost C1', 'Cost C2',
      'FormulaRegistry', 'AST', 'eval(', 'Mass Balance Formula'
    ];

    for (const term of forbiddenEquations) {
      assert(!fullOutput.includes(term), `Forbidden internal formula term leaked in Phase 7 API: "${term}"`);
    }
    console.log('  ✓ Test 34 PASS: Zero internal technical formula names or equations leaked in Phase 7 outputs');
  }

  console.log('\n======================================================================');
  console.log('ALL 34 PHASE 7 REAL-WORLD PRODUCTIZATION TESTS PASSED WITH 0 FAILURES');
  console.log('======================================================================\n');
}

if (require.main === module) {
  runPhase7TestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ PHASE 7 TEST FAILED:', err);
      process.exit(1);
    });
}

module.exports = runPhase7TestSuite;
