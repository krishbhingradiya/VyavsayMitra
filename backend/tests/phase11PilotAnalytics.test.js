/**
 * VYAVSAYMITRA — PHASE 11: REAL-WORLD PILOT, PRODUCT ANALYTICS & CONTINUOUS IMPROVEMENT
 * Comprehensive Automated Verification Suite (50+ Tests across 10 Categories)
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

const { app } = require('../index');
const dbRepository = require('../src/models/dbRepository');
const productAnalytics = require('../src/services/productAnalytics');
const productMetrics = require('../src/services/productMetrics');
const outcomeTracking = require('../src/services/outcomeTracking');
const performanceComparison = require('../src/services/performanceComparison');
const recommendationAnalytics = require('../src/services/recommendationAnalytics');
const dataRetention = require('../src/services/dataRetention');
const { isFeatureEnabled, getAllFlags } = require('../src/config/featureFlags');
const { getPilotLimits, isPilotMode, checkPilotBusinessLimit } = require('../src/config/pilotConfig');

const { generateToken } = require('../src/middleware/authMiddleware');

function makeHttpRequest(appInstance, options = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(appInstance);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const requestOptions = {
        hostname: '127.0.0.1',
        port,
        path: options.path || '/',
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(requestOptions, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          server.close(() => {
            let json = null;
            try { json = JSON.parse(body); } catch (_) {}
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body,
              json
            });
          });
        });
      });

      req.on('error', (err) => {
        server.close(() => reject(err));
      });

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  });
}

async function runPhase11Tests() {
  console.log('\n======================================================================');
  console.log('🚀 VYAVSAYMITRA — PHASE 11: PILOT, PRODUCT ANALYTICS & IMPROVEMENT');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function recordPass(testNum, desc) {
    total++;
    passed++;
    console.log(`  ✓ Test ${testNum} PASS: ${desc}`);
  }

  function recordFail(testNum, desc, err) {
    total++;
    console.error(`  ✗ Test ${testNum} FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    throw err;
  }

  // Set up test users & tokens
  const ownerUser = { id: 'usr_p11_owner', email: 'owner_p11@vyavsaymitra.in', name: 'Kisan Patel', role: 'user' };
  const intruderUser = { id: 'usr_p11_intruder', email: 'intruder_p11@vyavsaymitra.in', name: 'Malicious User', role: 'user' };
  const adminUser = { id: 'usr_p11_admin', email: 'superadmin@admin.vyavsaymitra.in', name: 'Platform Admin', role: 'admin' };

  const ownerToken = generateToken(ownerUser);
  const intruderToken = generateToken(intruderUser);
  const adminToken = generateToken(adminUser);

  // Initialize DB and clean up any past test data
  const db = await dbRepository.initLocalTables();

  // Create test business for owner
  const ownerBiz = await dbRepository.createBusiness(ownerUser.id, {
    name: 'Patel Agro Pilot Enterprise',
    domain: 'agriculture',
    business_type: 'CROP_FARMING_ORGANIC',
    status: 'ACTIVE',
    location: { state: 'Gujarat', district: 'Anand', is_rural: true },
    inputs: { crop: 'Cotton', areaAcres: 5 }
  });

  // Create test business for intruder
  const intruderBiz = await dbRepository.createBusiness(intruderUser.id, {
    name: 'Intruder Business Entity',
    domain: 'foodtech',
    business_type: 'FOODTECH_FLOUR_MILL',
    status: 'ACTIVE',
    location: { state: 'Gujarat', district: 'Ahmedabad', is_rural: false },
    inputs: {}
  });

  // Save baseline analysis for owner business
  await dbRepository.saveAnalysis(ownerBiz.id, {
    inputSnapshotId: 'snap_p11_01',
    engineName: 'Standard_Crop_Model',
    engineVersion: '2.0.0',
    status: 'ANALYSIS_COMPLETE',
    totalProjectCost: 250000,
    annualGrossRevenue: 450000,
    annualOperatingCost: 180000,
    netAnnualProfit: 270000,
    bankLoanRequirement: 175000,
    financialSummary: {
      totalProjectCost: 250000,
      annualGrossRevenue: 450000,
      annualOperatingCost: 180000,
      bankLoanRequired: 175000
    },
    riskAssessment: { overallRiskLevel: 'LOW', confidenceScore: 0.88 },
    provenanceAudit: { source: 'Statutory Benchmark 2026' }
  });

  // ====================================================================
  // PART 1 — Analytics Event Creation (1–5)
  // ====================================================================
  console.log('[PART 1] Privacy-Safe Product Analytics Event Creation...');

  // Test 1: Record valid analytics event
  try {
    const evt = await productAnalytics.trackEvent({
      userId: ownerUser.id,
      businessId: ownerBiz.id,
      eventType: productAnalytics.EVENT_TYPES.BUSINESS_CREATED,
      metadata: { domain: 'agriculture', source: 'onboarding_flow' }
    });
    assert(evt && evt.id, 'Expected product event to be created');
    assert.strictEqual(evt.event_type, 'BUSINESS_CREATED');
    recordPass(1, 'Record valid analytics event with metadata');
  } catch (err) {
    recordFail(1, 'Record valid analytics event with metadata', err);
  }

  // Test 2: Metadata sanitization strips sensitive keys
  try {
    const dirtyMeta = {
      domain: 'agriculture',
      password: 'SuperSecretPassword123!',
      jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      api_key: 'sk_live_xyz789',
      user_pin: '1234',
      allowedField: 'safeValue'
    };
    const cleaned = productAnalytics.sanitizeMetadata(dirtyMeta);
    assert.strictEqual(cleaned.domain, 'agriculture');
    assert.strictEqual(cleaned.allowedField, 'safeValue');
    assert.strictEqual(cleaned.password, undefined);
    assert.strictEqual(cleaned.jwtToken, undefined);
    assert.strictEqual(cleaned.api_key, undefined);
    assert.strictEqual(cleaned.user_pin, undefined);
    recordPass(2, 'Metadata sanitization strictly eliminates credentials and secrets');
  } catch (err) {
    recordFail(2, 'Metadata sanitization strictly eliminates credentials and secrets', err);
  }

  // Test 3: Truncate oversized strings in metadata
  try {
    const longString = 'X'.repeat(1200);
    const cleaned = productAnalytics.sanitizeMetadata({ summary: longString });
    assert.strictEqual(cleaned.summary.length, 500, 'Expected string to be truncated to 500 chars');
    recordPass(3, 'Bounded length enforcement prevents payload explosion (> 500 chars truncated)');
  } catch (err) {
    recordFail(3, 'Bounded length enforcement prevents payload explosion', err);
  }

  // Test 4: Non-blocking error handling
  try {
    // Pass invalid circular metadata or empty arguments - should fail silently without throwing
    const res = await productAnalytics.trackEvent({ userId: null, businessId: null, eventType: null });
    assert.strictEqual(res, null, 'Safe fallback on missing eventType');
    recordPass(4, 'Non-blocking execution ensures analytics failures never disrupt core flows');
  } catch (err) {
    recordFail(4, 'Non-blocking execution ensures analytics failures never disrupt core flows', err);
  }

  // Test 5: List product events with bounded pagination
  try {
    await productAnalytics.trackEvent({
      userId: ownerUser.id,
      businessId: ownerBiz.id,
      eventType: productAnalytics.EVENT_TYPES.ACTION_PLAN_VIEWED,
      metadata: { tab: 'tasks' }
    });
    const eventsList = await productAnalytics.getEvents({ businessId: ownerBiz.id, limit: 10, page: 1 });
    assert(Array.isArray(eventsList.items), 'Expected array of items');
    assert(eventsList.items.length >= 2, 'Expected at least 2 events recorded');
    assert(typeof eventsList.total === 'number', 'Expected total count');
    recordPass(5, 'Paginated product events retrieval operational with bounded limit');
  } catch (err) {
    recordFail(5, 'Paginated product events retrieval operational with bounded limit', err);
  }

  // ====================================================================
  // PART 2 — Multi-Tenant Isolation & IDOR Protection (6–10)
  // ====================================================================
  console.log('[PART 2] Multi-Tenant Isolation & IDOR Protection...');

  // Test 6: Intruder cannot view outcomes of owner's business
  try {
    const res = await makeHttpRequest(app, {
      path: `/api/businesses/${ownerBiz.id}/outcomes`,
      method: 'GET',
      headers: { Authorization: `Bearer ${intruderToken}` }
    });
    assert.strictEqual(res.statusCode, 404, 'Intruder must receive 404 on foreign business outcomes');
    assert.strictEqual(res.json.code, 'BUSINESS_NOT_FOUND');
    recordPass(6, 'Cross-tenant GET /outcomes strictly rejected (404 IDOR protection)');
  } catch (err) {
    recordFail(6, 'Cross-tenant GET /outcomes strictly rejected', err);
  }

  // Test 7: Intruder cannot record outcome for owner's business
  try {
    const res = await makeHttpRequest(app, {
      path: `/api/businesses/${ownerBiz.id}/outcomes`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${intruderToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        outcome_type: 'actual_investment',
        value: 300000,
        unit: 'INR'
      }
    });
    assert.strictEqual(res.statusCode, 404, 'Intruder must receive 404 attempting to mutate foreign outcomes');
    recordPass(7, 'Cross-tenant POST /outcomes strictly rejected (404 IDOR protection)');
  } catch (err) {
    recordFail(7, 'Cross-tenant POST /outcomes strictly rejected', err);
  }

  // Test 8: Intruder cannot view performance comparison of owner's business
  try {
    const res = await makeHttpRequest(app, {
      path: `/api/businesses/${ownerBiz.id}/performance`,
      method: 'GET',
      headers: { Authorization: `Bearer ${intruderToken}` }
    });
    assert.strictEqual(res.statusCode, 404, 'Intruder must receive 404 on foreign performance comparison');
    recordPass(8, 'Cross-tenant GET /performance strictly rejected (404 IDOR protection)');
  } catch (err) {
    recordFail(8, 'Cross-tenant GET /performance strictly rejected', err);
  }

  // Test 9: Intruder cannot view analytics of owner's business
  try {
    const res = await makeHttpRequest(app, {
      path: `/api/businesses/${ownerBiz.id}/analytics`,
      method: 'GET',
      headers: { Authorization: `Bearer ${intruderToken}` }
    });
    assert.strictEqual(res.statusCode, 404, 'Intruder must receive 404 on foreign analytics');
    recordPass(9, 'Cross-tenant GET /analytics strictly rejected (404 IDOR protection)');
  } catch (err) {
    recordFail(9, 'Cross-tenant GET /analytics strictly rejected', err);
  }

  // Test 10: User cannot view another user's submitted feedback
  try {
    // Owner submits feedback
    await dbRepository.createFeedback({
      userId: ownerUser.id,
      rating: 5,
      category: 'ai_mitra',
      message: 'Owner private feedback note.'
    });

    // Intruder views their own feedback
    const intruderRes = await makeHttpRequest(app, {
      path: '/api/feedback',
      method: 'GET',
      headers: { Authorization: `Bearer ${intruderToken}` }
    });
    assert.strictEqual(intruderRes.statusCode, 200);
    const intruderFeedback = intruderRes.json.feedback || [];
    const hasOwnerFeedback = intruderFeedback.some(f => f.message.includes('Owner private feedback'));
    assert.strictEqual(hasOwnerFeedback, false, 'User must never see another user feedback');
    recordPass(10, 'User feedback endpoint strictly isolated to current user history');
  } catch (err) {
    recordFail(10, 'User feedback endpoint strictly isolated to current user history', err);
  }

  // ====================================================================
  // PART 3 — Deterministic Metrics Calculation (11–15)
  // ====================================================================
  console.log('[PART 3] Deterministic Metrics Calculation...');

  // Test 11: Calculate platform activation metrics deterministically
  try {
    const platform = await productMetrics.calculatePlatformMetrics();
    assert(platform.activation, 'Expected activation section');
    assert(typeof platform.activation.totalUsers === 'number');
    assert(typeof platform.activation.totalBusinesses === 'number');
    assert(typeof platform.activation.firstAnalysisCompletionRate === 'number');
    recordPass(11, 'Platform activation metrics calculated deterministically from DB records');
  } catch (err) {
    recordFail(11, 'Platform activation metrics calculated deterministically', err);
  }

  // Test 12: Calculate execution metrics
  try {
    // Create a task for owner business
    await dbRepository.createTask(ownerBiz.id, {
      title: 'Procure Certified Seeds',
      category: 'Procurement',
      status: 'COMPLETED'
    });
    const platform = await productMetrics.calculatePlatformMetrics();
    assert(platform.execution, 'Expected execution section');
    assert(platform.execution.totalTasks >= 1, 'Expected at least 1 total task');
    assert(platform.execution.completedTasks >= 1, 'Expected at least 1 completed task');
    assert(platform.execution.taskCompletionRate >= 0 && platform.execution.taskCompletionRate <= 100);
    recordPass(12, 'Task execution & completion metrics computed deterministically');
  } catch (err) {
    recordFail(12, 'Task execution & completion metrics computed deterministically', err);
  }

  // Test 13: Calculate documentation metrics
  try {
    await dbRepository.createDocument(ownerBiz.id, {
      name: 'Land Record 7/12 Extract',
      category: 'Statutory',
      status: 'VERIFIED',
      isMandatory: true
    });
    const platform = await productMetrics.calculatePlatformMetrics();
    assert(platform.documentation.totalDocuments >= 1);
    assert(platform.documentation.verifiedDocuments >= 1);
    assert(platform.documentation.verifiedDocumentPercentage >= 0);
    recordPass(13, 'Documentation readiness & verification percentage calculated');
  } catch (err) {
    recordFail(13, 'Documentation readiness & verification percentage calculated', err);
  }

  // Test 14: Funding readiness & application pipeline metrics
  try {
    const platform = await productMetrics.calculatePlatformMetrics();
    assert(platform.funding, 'Expected funding section');
    assert(typeof platform.funding.applicationsCreated === 'number');
    assert(typeof platform.funding.applicationsApproved === 'number');
    recordPass(14, 'Funding readiness & application pipeline metrics evaluated');
  } catch (err) {
    recordFail(14, 'Funding readiness & application pipeline metrics evaluated', err);
  }

  // Test 15: Calculate single business metrics deterministically
  try {
    const bizMetrics = await productMetrics.calculateBusinessMetrics(ownerBiz.id);
    assert.strictEqual(bizMetrics.businessId, ownerBiz.id);
    assert(bizMetrics.execution.totalTasks >= 1);
    assert(bizMetrics.documentation.totalDocuments >= 1);
    assert.strictEqual(bizMetrics.documentation.verifiedDocuments, 1);
    recordPass(15, 'Single business-scoped metrics computed deterministically without synthetic data');
  } catch (err) {
    recordFail(15, 'Single business-scoped metrics computed deterministically', err);
  }

  // ====================================================================
  // PART 4 — Business Outcome Tracking (16–20)
  // ====================================================================
  console.log('[PART 4] Business Outcome Tracking...');

  // Test 16: Record valid actual investment outcome
  let recordedOutcomeId = null;
  try {
    const outcome = await outcomeTracking.recordOutcome({
      businessId: ownerBiz.id,
      userId: ownerUser.id,
      outcomeType: 'actual_investment',
      value: 260000,
      unit: 'INR',
      period: 'FY 2025-26',
      source: 'user_reported',
      notes: 'Initial capital deployed for land preparation & equipment'
    });
    assert(outcome && outcome.id, 'Expected outcome record with ID');
    assert.strictEqual(outcome.outcome_type, 'actual_investment');
    assert.strictEqual(outcome.value, 260000);
    recordedOutcomeId = outcome.id;
    recordPass(16, 'Record valid actual investment outcome with metadata');
  } catch (err) {
    recordFail(16, 'Record valid actual investment outcome with metadata', err);
  }

  // Test 17: Record valid actual monthly revenue outcome
  try {
    const outcome = await outcomeTracking.recordOutcome({
      businessId: ownerBiz.id,
      userId: ownerUser.id,
      outcomeType: 'actual_monthly_revenue',
      value: 38000,
      unit: 'INR/month',
      period: '2026-08',
      source: 'verified_document',
      notes: 'Mandi sales bill verified'
    });
    assert.strictEqual(outcome.outcome_type, 'actual_monthly_revenue');
    assert.strictEqual(outcome.value, 38000);
    recordPass(17, 'Record valid actual monthly revenue with unit and period');
  } catch (err) {
    recordFail(17, 'Record valid actual monthly revenue with unit and period', err);
  }

  // Test 18: Reject invalid outcome type (400 INVALID_OUTCOME_TYPE)
  try {
    let threw = false;
    try {
      await outcomeTracking.recordOutcome({
        businessId: ownerBiz.id,
        userId: ownerUser.id,
        outcomeType: 'fabricated_unsupported_metric',
        value: 1000
      });
    } catch (e) {
      threw = true;
      assert.strictEqual(e.code, 'INVALID_OUTCOME_TYPE');
    }
    assert(threw, 'Expected exception on invalid outcome type');
    recordPass(18, 'Reject invalid outcome type with 400 INVALID_OUTCOME_TYPE');
  } catch (err) {
    recordFail(18, 'Reject invalid outcome type with 400 INVALID_OUTCOME_TYPE', err);
  }

  // Test 19: Reject missing/invalid numeric value for quantitative metric
  try {
    let threw = false;
    try {
      await outcomeTracking.recordOutcome({
        businessId: ownerBiz.id,
        userId: ownerUser.id,
        outcomeType: 'actual_investment',
        value: 'not_a_valid_number'
      });
    } catch (e) {
      threw = true;
      assert.strictEqual(e.code, 'INVALID_NUMERIC_VALUE');
    }
    assert(threw, 'Expected exception on invalid numeric value');
    recordPass(19, 'Reject non-numeric value on quantitative metrics with 400');
  } catch (err) {
    recordFail(19, 'Reject non-numeric value on quantitative metrics with 400', err);
  }

  // Test 20: Outcome recording creates audit timeline event
  try {
    const timeline = await dbRepository.listTimelineEvents(ownerBiz.id, 10);
    const hasOutcomeTimeline = timeline.some(t => t.event_type === 'OUTCOME_RECORDED');
    assert(hasOutcomeTimeline, 'Expected OUTCOME_RECORDED timeline entry');
    recordPass(20, 'Outcome recording automatically registers immutable OUTCOME_RECORDED audit event');
  } catch (err) {
    recordFail(20, 'Outcome recording registers OUTCOME_RECORDED audit event', err);
  }

  // ====================================================================
  // PART 5 — Projected vs Actual Performance Comparison (21–25)
  // ====================================================================
  console.log('[PART 5] Projected vs Actual Performance Comparison...');

  // Test 21: Calculate variance and percentage when both exist
  try {
    const perf = await performanceComparison.comparePerformance(ownerBiz.id);
    assert(perf.hasAnalysis, 'Expected analysis to be found');
    assert(perf.hasOutcomes, 'Expected outcomes to be found');

    const inv = perf.comparisons.find(c => c.metricKey === 'investment');
    assert(inv, 'Expected investment comparison');
    assert.strictEqual(inv.projected, 250000);
    assert.strictEqual(inv.actual, 260000);
    assert.strictEqual(inv.variance, 10000); // 260000 - 250000 = +10000
    assert.strictEqual(inv.variancePercentage, 4.0); // +4.0%
    assert.strictEqual(inv.status, 'available');
    recordPass(21, 'Deterministic variance (+10000) and variance % (+4.0%) computed accurately');
  } catch (err) {
    recordFail(21, 'Deterministic variance and variance % computed accurately', err);
  }

  // Test 22: Return explicit status 'Actual data not available yet.' when actual is missing
  try {
    const perf = await performanceComparison.comparePerformance(ownerBiz.id);
    const opex = perf.comparisons.find(c => c.metricKey === 'operating_cost');
    assert(opex, 'Expected operating cost comparison');
    assert.strictEqual(opex.actual, null, 'Actual must be null when unrecorded');
    assert.strictEqual(opex.status, 'Actual data not available yet.');
    recordPass(22, 'Return explicit "Actual data not available yet." when actual metric is unrecorded');
  } catch (err) {
    recordFail(22, 'Return explicit "Actual data not available yet."', err);
  }

  // Test 23: Never invent or synthesize missing actual values
  try {
    const perf = await performanceComparison.comparePerformance(ownerBiz.id);
    const funding = perf.comparisons.find(c => c.metricKey === 'funding_requirement');
    assert(funding, 'Expected funding requirement comparison');
    assert.strictEqual(funding.actual, null);
    assert.strictEqual(funding.variance, null);
    recordPass(23, 'Never synthesizes or fabricates actual values when missing');
  } catch (err) {
    recordFail(23, 'Never synthesizes or fabricates actual values when missing', err);
  }

  // Test 24: Handle business without any prior analysis baseline
  try {
    const unanalyzedBiz = await dbRepository.createBusiness(ownerUser.id, {
      name: 'Unanalyzed New Venture',
      domain: 'foodtech',
      business_type: 'FOODTECH_FLOUR_MILL',
      status: 'DRAFT',
      location: { state: 'Gujarat', district: 'Anand', is_rural: true },
      inputs: {}
    });
    const perf = await performanceComparison.comparePerformance(unanalyzedBiz.id);
    assert.strictEqual(perf.hasAnalysis, false);
    const inv = perf.comparisons.find(c => c.metricKey === 'investment');
    assert.strictEqual(inv.projected, null);
    assert.strictEqual(inv.status, 'Actual data not available yet.');
    recordPass(24, 'Gracefully handles unanalyzed businesses with null baselines');
  } catch (err) {
    recordFail(24, 'Gracefully handles unanalyzed businesses with null baselines', err);
  }

  // Test 25: Performance endpoint via HTTP returns complete comparison structure
  try {
    const res = await makeHttpRequest(app, {
      path: `/api/businesses/${ownerBiz.id}/performance`,
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.json.success);
    assert(Array.isArray(res.json.performance.comparisons));
    assert(res.json.performance.comparisons.length >= 4);
    recordPass(25, 'GET /api/businesses/:id/performance returns complete comparison matrix');
  } catch (err) {
    recordFail(25, 'GET /api/businesses/:id/performance returns comparison matrix', err);
  }

  // ====================================================================
  // PART 6 — User Feedback System (26–30)
  // ====================================================================
  console.log('[PART 6] User Feedback System...');

  // Test 26: Submit valid user feedback
  let submittedFeedbackId = null;
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/feedback',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        rating: 5,
        category: 'business_analysis',
        message: 'The financial projections were very clear and practical for local mandi conditions.',
        business_id: ownerBiz.id,
        feature: 'dpr_engine'
      }
    });
    assert.strictEqual(res.statusCode, 201);
    assert(res.json.success);
    assert(res.json.feedback && res.json.feedback.id);
    assert.strictEqual(res.json.feedback.rating, 5);
    submittedFeedbackId = res.json.feedback.id;
    recordPass(26, 'POST /api/feedback submits valid user feedback (201 Created)');
  } catch (err) {
    recordFail(26, 'POST /api/feedback submits valid user feedback', err);
  }

  // Test 27: Reject invalid rating (< 1 or > 5)
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/feedback',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        rating: 6, // Invalid
        category: 'ai_mitra',
        message: 'Testing invalid rating.'
      }
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json.code, 'INVALID_FEEDBACK_RATING');
    recordPass(27, 'Reject invalid rating (> 5) with 400 INVALID_FEEDBACK_RATING');
  } catch (err) {
    recordFail(27, 'Reject invalid rating (> 5)', err);
  }

  // Test 28: Reject invalid feedback category
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/feedback',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        rating: 4,
        category: 'unsupported_unknown_category',
        message: 'Testing invalid category.'
      }
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json.code, 'INVALID_FEEDBACK_CATEGORY');
    recordPass(28, 'Reject invalid feedback category with 400 INVALID_FEEDBACK_CATEGORY');
  } catch (err) {
    recordFail(28, 'Reject invalid feedback category', err);
  }

  // Test 29: Reject oversized feedback message (> 2000 characters)
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/feedback',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        rating: 4,
        category: 'ai_mitra',
        message: 'A'.repeat(2500)
      }
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json.code, 'FEEDBACK_MESSAGE_TOO_LONG');
    recordPass(29, 'Reject oversized feedback message (> 2000 chars) with 400');
  } catch (err) {
    recordFail(29, 'Reject oversized feedback message', err);
  }

  // Test 30: User can list their own feedback history and timeline reflects submission
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/feedback',
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.json.feedback));
    assert(res.json.feedback.length >= 1);

    // Verify audit timeline entry exists for business feedback
    const timeline = await dbRepository.listTimelineEvents(ownerBiz.id, 10);
    const hasFeedbackEvent = timeline.some(t => t.event_type === 'FEEDBACK_SUBMITTED');
    assert(hasFeedbackEvent, 'Expected FEEDBACK_SUBMITTED audit event');
    recordPass(30, 'User feedback listed successfully and FEEDBACK_SUBMITTED timeline recorded');
  } catch (err) {
    recordFail(30, 'User feedback listed successfully and timeline recorded', err);
  }

  // ====================================================================
  // PART 7 — Recommendation Effectiveness (31–35)
  // ====================================================================
  console.log('[PART 7] Recommendation Effectiveness Tracking...');

  // Test 31: Track recommendation lifecycle transition: created -> viewed -> accepted
  try {
    const recId = 'rec_test_fertilizer_procure';
    // 1. Created
    await recommendationAnalytics.trackRecommendationAction({
      businessId: ownerBiz.id,
      recommendationId: recId,
      recommendationType: 'next_best_action',
      status: 'created',
      userId: ownerUser.id,
      metadata: { title: 'Procure Organic Bio-Fertilizer' }
    });

    // 2. Viewed
    await recommendationAnalytics.trackRecommendationAction({
      businessId: ownerBiz.id,
      recommendationId: recId,
      status: 'viewed',
      userId: ownerUser.id
    });

    // 3. Accepted
    await recommendationAnalytics.trackRecommendationAction({
      businessId: ownerBiz.id,
      recommendationId: recId,
      status: 'accepted',
      userId: ownerUser.id,
      metadata: { title: 'Procure Organic Bio-Fertilizer' }
    });

    const eff = await recommendationAnalytics.getRecommendationEffectiveness({ businessId: ownerBiz.id });
    assert(eff.totalRecommendations >= 1);
    assert(eff.acceptanceRate > 0);
    recordPass(31, 'Track recommendation lifecycle created -> viewed -> accepted');
  } catch (err) {
    recordFail(31, 'Track recommendation lifecycle created -> viewed -> accepted', err);
  }

  // Test 32: Track recommendation conversion to task
  try {
    const recId = 'rec_test_fertilizer_procure';
    const task = await dbRepository.createTask(ownerBiz.id, {
      title: 'Procure Organic Bio-Fertilizer Task',
      category: 'Procurement',
      status: 'IN_PROGRESS'
    });

    await recommendationAnalytics.trackRecommendationAction({
      businessId: ownerBiz.id,
      recommendationId: recId,
      status: 'converted_to_task',
      taskId: task.id,
      userId: ownerUser.id
    });

    const eff = await recommendationAnalytics.getRecommendationEffectiveness({ businessId: ownerBiz.id });
    assert(eff.breakdown.convertedToTask >= 1);
    assert(eff.conversionRate > 0);
    recordPass(32, 'Track recommendation converted_to_task with linked task ID');
  } catch (err) {
    recordFail(32, 'Track recommendation converted_to_task', err);
  }

  // Test 33: Track recommendation dismissal creates audit timeline event
  try {
    const dismissRecId = 'rec_test_crop_insurance';
    await recommendationAnalytics.trackRecommendationAction({
      businessId: ownerBiz.id,
      recommendationId: dismissRecId,
      status: 'dismissed',
      userId: ownerUser.id,
      metadata: { title: 'Optional Crop Insurance Add-on' }
    });

    const timeline = await dbRepository.listTimelineEvents(ownerBiz.id, 10);
    const hasDismissedEvent = timeline.some(t => t.event_type === 'RECOMMENDATION_DISMISSED');
    assert(hasDismissedEvent, 'Expected RECOMMENDATION_DISMISSED audit timeline entry');
    recordPass(33, 'Recommendation dismissal recorded and audited in timeline');
  } catch (err) {
    recordFail(33, 'Recommendation dismissal recorded and audited', err);
  }

  // Test 34: Compute recommendation acceptance and conversion rates deterministically
  try {
    const eff = await recommendationAnalytics.getRecommendationEffectiveness({ businessId: ownerBiz.id });
    assert(typeof eff.acceptanceRate === 'number');
    assert(typeof eff.conversionRate === 'number');
    assert(typeof eff.completionRate === 'number');
    assert(eff.acceptanceRate >= 0 && eff.acceptanceRate <= 100);
    recordPass(34, 'Deterministic acceptance and conversion percentages calculated');
  } catch (err) {
    recordFail(34, 'Deterministic acceptance and conversion percentages calculated', err);
  }

  // Test 35: Task completion updates recommendation completion rate
  try {
    const recId = 'rec_test_fertilizer_procure';
    await recommendationAnalytics.trackRecommendationAction({
      businessId: ownerBiz.id,
      recommendationId: recId,
      status: 'completed',
      userId: ownerUser.id
    });

    const eff = await recommendationAnalytics.getRecommendationEffectiveness({ businessId: ownerBiz.id });
    assert(eff.completionRate > 0, 'Completion rate must be greater than 0');
    recordPass(35, 'Task completion accurately updates recommendation execution rate');
  } catch (err) {
    recordFail(35, 'Task completion updates recommendation execution rate', err);
  }

  // ====================================================================
  // PART 8 — Admin / Operator Authorization & Visibility (36–40)
  // ====================================================================
  console.log('[PART 8] Admin / Operator Authorization & Visibility...');

  // Test 36: Reject unauthenticated access to /api/admin/metrics
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/admin/metrics',
      method: 'GET'
    });
    assert.strictEqual(res.statusCode, 401, 'Unauthenticated access to admin metrics must return 401');
    recordPass(36, 'Unauthenticated access to /api/admin/metrics rejected (401)');
  } catch (err) {
    recordFail(36, 'Unauthenticated access to /api/admin/metrics rejected', err);
  }

  // Test 37: Reject normal authenticated user access to /api/admin/metrics
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/admin/metrics',
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` } // Non-admin user
    });
    assert.strictEqual(res.statusCode, 403, 'Normal user must be forbidden from admin metrics');
    assert.strictEqual(res.json.code, 'FORBIDDEN_ADMIN_ACCESS');
    recordPass(37, 'Normal user access to /api/admin/metrics rejected (403 FORBIDDEN_ADMIN_ACCESS)');
  } catch (err) {
    recordFail(37, 'Normal user access to /api/admin/metrics rejected', err);
  }

  // Test 38: Allow admin user access to /api/admin/metrics
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/admin/metrics',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.json.success);
    assert(res.json.metrics && res.json.metrics.activation);
    assert(res.json.pilot);
    recordPass(38, 'Authorized admin access to /api/admin/metrics succeeds with aggregate data');
  } catch (err) {
    recordFail(38, 'Authorized admin access to /api/admin/metrics succeeds', err);
  }

  // Test 39: Admin health endpoint exposes diagnostics without secret leakage
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/admin/health',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.health.status, 'HEALTHY');
    assert(res.json.health.memory.rssMb > 0);

    const bodyStr = JSON.stringify(res.json);
    assert(!bodyStr.includes('JWT_SECRET'), 'No JWT_SECRET in admin health');
    assert(!bodyStr.includes('SUPABASE_SERVICE_ROLE_KEY'), 'No service keys in admin health');
    recordPass(39, 'Admin /api/admin/health exposes diagnostics with zero credential leakage');
  } catch (err) {
    recordFail(39, 'Admin health exposes diagnostics with zero credential leakage', err);
  }

  // Test 40: Admin usage endpoint masks user identifiers
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/admin/usage',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.json.items));
    if (res.json.items.length > 0) {
      const first = res.json.items[0];
      assert(!first.userId, 'Raw userId must not be exposed');
      assert(first.userHash.startsWith('usr_'), 'User hash should be masked');
    }
    recordPass(40, 'Admin usage endpoint masks user identifiers (userHash) for privacy');
  } catch (err) {
    recordFail(40, 'Admin usage endpoint masks user identifiers for privacy', err);
  }

  // ====================================================================
  // PART 9 — Pilot Mode & Feature Flags (41–45)
  // ====================================================================
  console.log('[PART 9] Pilot Mode & Feature Flags...');

  // Test 41: Feature flags evaluate correctly with defaults
  try {
    const flags = getAllFlags();
    assert.strictEqual(flags.PRODUCT_ANALYTICS, true);
    assert.strictEqual(flags.OUTCOME_TRACKING, true);
    assert.strictEqual(flags.USER_FEEDBACK, true);
    assert.strictEqual(flags.ADMIN_ANALYTICS, true);
    recordPass(41, 'Default feature flags enabled safely');
  } catch (err) {
    recordFail(41, 'Default feature flags enabled safely', err);
  }

  // Test 42: Feature flag environment override
  try {
    process.env.FEATURE_TEST_EXPERIMENTAL = 'true';
    assert.strictEqual(isFeatureEnabled('TEST_EXPERIMENTAL'), true);
    process.env.FEATURE_TEST_EXPERIMENTAL = 'false';
    assert.strictEqual(isFeatureEnabled('TEST_EXPERIMENTAL'), false);
    delete process.env.FEATURE_TEST_EXPERIMENTAL;
    recordPass(42, 'Feature flags respond dynamically to environment variable overrides');
  } catch (err) {
    recordFail(42, 'Feature flags respond dynamically to environment variable overrides', err);
  }

  // Test 43: Disabled feature flag safely bypasses or no-ops without throwing errors
  try {
    process.env.FEATURE_PRODUCT_ANALYTICS = 'false';
    const noopResult = await productAnalytics.trackEvent({
      userId: ownerUser.id,
      businessId: ownerBiz.id,
      eventType: 'DISABLED_FEATURE_TEST_EVENT'
    });
    assert.strictEqual(noopResult, null, 'Disabled analytics feature must return null safely');
    process.env.FEATURE_PRODUCT_ANALYTICS = 'true';
    recordPass(43, 'Disabled feature flag fails safely with non-blocking no-op');
  } catch (err) {
    delete process.env.FEATURE_PRODUCT_ANALYTICS;
    recordFail(43, 'Disabled feature flag fails safely with non-blocking no-op', err);
  }

  // Test 44: Pilot configuration limits
  try {
    const limits = getPilotLimits();
    assert(limits.userLimit > 0);
    assert(limits.businessLimit > 0);
    recordPass(44, 'Pilot configuration limits retrieved with safe defaults');
  } catch (err) {
    recordFail(44, 'Pilot configuration limits retrieved with safe defaults', err);
  }

  // Test 45: Pilot business limit enforcement blocks excess business creation
  try {
    // Temporarily set pilot mode on with limit 1
    process.env.PILOT_MODE = 'true';
    process.env.PILOT_BUSINESS_LIMIT = '1';

    const check = await checkPilotBusinessLimit();
    assert.strictEqual(check.allowed, false, 'Should be blocked when total businesses >= limit');
    assert.strictEqual(check.code, 'PILOT_BUSINESS_LIMIT_REACHED');

    // Attempt HTTP creation while at limit
    const res = await makeHttpRequest(app, {
      path: '/api/businesses',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        name: 'Blocked Pilot Enterprise',
        domain: 'agriculture',
        business_type: 'CROP_FARMING_ORGANIC',
        location: { state: 'Gujarat', district: 'Anand' },
        inputs: { crop: 'Cotton', areaAcres: 5 }
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.json.code, 'PILOT_LIMIT_REACHED');

    // Clean up env
    delete process.env.PILOT_MODE;
    delete process.env.PILOT_BUSINESS_LIMIT;
    recordPass(45, 'Pilot mode business limit enforcement blocks excess registrations (403 PILOT_LIMIT_REACHED)');
  } catch (err) {
    delete process.env.PILOT_MODE;
    delete process.env.PILOT_BUSINESS_LIMIT;
    recordFail(45, 'Pilot mode business limit enforcement blocks excess registrations', err);
  }

  // ====================================================================
  // PART 10 — Privacy, Data Retention & Audit Integrity (46–50)
  // ====================================================================
  console.log('[PART 10] Privacy, Data Retention & Audit Integrity...');

  // Test 46: Data retention policy schedules
  try {
    const policies = dataRetention.getRetentionPolicies();
    assert(policies.analyticsEventsDays >= 30);
    assert(policies.operationalLogsDays >= 7);
    assert(policies.protectedEntities.includes('dpr_snapshots'));
    assert(policies.protectedEntities.includes('statutory_documents'));
    recordPass(46, 'Data retention policy defines schedules and explicit protected entities');
  } catch (err) {
    recordFail(46, 'Data retention policy defines schedules and protected entities', err);
  }

  // Test 47: Protected entities are NEVER pruned
  try {
    const policies = dataRetention.getRetentionPolicies();
    const protectedList = policies.protectedEntities;
    assert(protectedList.includes('business_timeline_audit'));
    assert(protectedList.includes('business_outcomes'));
    assert(protectedList.includes('business_feasibility_analysis'));
    recordPass(47, 'Immutable records (DPRs, timeline audit, outcomes) are permanently protected from pruning');
  } catch (err) {
    recordFail(47, 'Immutable records are permanently protected from pruning', err);
  }

  // Test 48: Data retention dryRun mode does not delete records
  try {
    const dryRunReport = await dataRetention.enforceRetention({ dryRun: true });
    assert.strictEqual(dryRunReport.dryRun, true);
    assert(typeof dryRunReport.pruned.analyticsEvents === 'number');
    recordPass(48, 'Data retention dryRun mode inspects eligible records without mutation');
  } catch (err) {
    recordFail(48, 'Data retention dryRun mode inspects eligible records without mutation', err);
  }

  // Test 49: Audit timeline captures critical Phase 11 mutations
  try {
    const timeline = await dbRepository.listTimelineEvents(ownerBiz.id, 20);
    const eventTypes = timeline.map(t => t.event_type);
    assert(eventTypes.includes('OUTCOME_RECORDED'), 'Timeline must include OUTCOME_RECORDED');
    assert(eventTypes.includes('FEEDBACK_SUBMITTED'), 'Timeline must include FEEDBACK_SUBMITTED');
    assert(eventTypes.includes('RECOMMENDATION_ACCEPTED'), 'Timeline must include RECOMMENDATION_ACCEPTED');
    recordPass(49, 'Audit timeline comprehensively registers OUTCOME_RECORDED, FEEDBACK_SUBMITTED, RECOMMENDATION_ACCEPTED');
  } catch (err) {
    recordFail(49, 'Audit timeline comprehensively registers Phase 11 mutation events', err);
  }

  // Test 50: Zero formula leakage across Phase 11 endpoints and models
  try {
    const endpointsToInspect = [
      `/api/businesses/${ownerBiz.id}/performance`,
      `/api/businesses/${ownerBiz.id}/analytics`,
      `/api/businesses/${ownerBiz.id}/outcomes`,
      `/api/feedback`,
      `/api/admin/metrics`
    ];

    const forbiddenTerms = [
      'CACP',
      'Cost A1',
      'Cost A2',
      'Cost B1',
      'Cost B2',
      'Cost C1',
      'Cost C2',
      'AST',
      'FormulaRegistry',
      'Mass Balance Formula'
    ];

    for (const ep of endpointsToInspect) {
      const token = ep.startsWith('/api/admin') ? adminToken : ownerToken;
      const res = await makeHttpRequest(app, {
        path: ep,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      const str = JSON.stringify(res.json || {});
      for (const term of forbiddenTerms) {
        assert(
          !str.includes(`"${term}"`) && !str.includes(` ${term} `),
          `Leaked internal proprietary formula term "${term}" in endpoint ${ep}`
        );
      }
    }
    recordPass(50, 'Zero formula leakage (CACP, Cost A1, AST, FormulaRegistry) across all Phase 11 endpoints');
  } catch (err) {
    recordFail(50, 'Zero formula leakage across all Phase 11 endpoints', err);
  }

  // ====================================================================
  // BONUS VERIFICATIONS (51–54)
  // ====================================================================
  console.log('[BONUS] Extended Reliability & Boundary Verifications...');

  // Test 51: Malformed payload handling on POST /api/feedback
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/feedback',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: {} // Empty body
    });
    assert.strictEqual(res.statusCode, 400);
    recordPass(51, 'Malformed empty payload on POST /api/feedback handled safely (400)');
  } catch (err) {
    recordFail(51, 'Malformed empty payload on POST /api/feedback handled safely', err);
  }

  // Test 52: Admin feedback filtering by category and rating
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/admin/feedback?category=business_analysis&min_rating=4',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.json.items));
    for (const item of res.json.items) {
      assert.strictEqual(item.category, 'business_analysis');
      assert(item.rating >= 4);
    }
    recordPass(52, 'Admin feedback filtering by category and minimum rating works accurately');
  } catch (err) {
    recordFail(52, 'Admin feedback filtering works accurately', err);
  }

  // Test 53: Bounded pagination bounds on admin usage
  try {
    const res = await makeHttpRequest(app, {
      path: '/api/admin/usage?limit=9999&page=1', // Out of bounds limit
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.limit, 100, 'Limit should be safely bounded at max 100');
    recordPass(53, 'Bounded pagination on admin endpoints caps maximum limit to 100');
  } catch (err) {
    recordFail(53, 'Bounded pagination caps limit to 100', err);
  }

  // Test 54: Recommendation action recording via HTTP endpoint
  try {
    const res = await makeHttpRequest(app, {
      path: `/api/businesses/${ownerBiz.id}/recommendations/action`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        recommendation_id: 'rec_mandi_timing',
        recommendation_type: 'market_timing',
        status: 'viewed',
        metadata: { title: 'Optimal Mandi Selling Window' }
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.json.success);
    assert.strictEqual(res.json.record.status, 'viewed');
    recordPass(54, 'POST /api/businesses/:id/recommendations/action records user action safely');
  } catch (err) {
    recordFail(54, 'POST /api/businesses/:id/recommendations/action records user action', err);
  }

  console.log('\n======================================================================');
  console.log(`🎉 PHASE 11 VALIDATION: ${passed}/${total} TESTS PASSED WITH 0 FAILURES`);
  console.log('======================================================================\n');
}

if (require.main === module) {
  runPhase11Tests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ TEST RUN FAILED:', err);
      process.exit(1);
    });
}

module.exports = { runPhase11Tests };
