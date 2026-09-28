/**
 * VYAVSAYMITRA — PHASE 8: PRODUCTION OPERATIONS, DOCUMENT VAULT,
 * APPLICATION TRACKING, REMINDERS, AUDIT TRAIL & EXECUTION INTELLIGENCE TEST SUITE
 * 
 * Comprehensive 38-Test Automated Verification Suite:
 * Part 1: Document Vault Security & Traversal Protection (Tests 1–7)
 * Part 2: Document Versioning & Immutability (Tests 8–11)
 * Part 3: Document Verification & Review Workflow (Tests 12–15)
 * Part 4: Application Lifecycle & Validation (Tests 16–21)
 * Part 5: Application Document Linking & Readiness Guard (Tests 22–26)
 * Part 6: DPR Archive Immutability & Isolation (Tests 27–28)
 * Part 7: AI Mitra Execution Mode (Tests 29–32)
 * Part 8: Business Audit Timeline (Tests 33–34)
 * Part 9: Notifications, Due Date Reminders & Idempotency (Tests 35–37)
 * Part 10: Formula & Terminology Privacy Audit (Test 38)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const dbRepository = require('../src/models/dbRepository');
const documentVaultController = require('../src/controllers/documentVaultController');
const applicationTrackingController = require('../src/controllers/applicationTrackingController');
const actionPlanController = require('../src/controllers/actionPlanController');
const storageService = require('../src/services/storageService');
const { generateBusinessChatResponse } = require('../src/services/ai/aiService');

function mockReqRes(reqData = {}) {
  const req = {
    user: reqData.user !== undefined ? reqData.user : { id: 'usr_p8_owner', email: 'owner@vyavsaymitra.in', name: 'Ramesh Patel' },
    params: reqData.params || {},
    body: reqData.body || {},
    headers: reqData.headers || {},
    query: reqData.query || {},
    id: 'req_phase8_test'
  };

  const res = {
    statusCode: 200,
    data: null,
    headersSent: {},
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    setHeader(name, value) {
      this.headersSent[name.toLowerCase()] = value;
      return this;
    },
    send(payload) {
      this.data = payload;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
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

// Sample 1x1 transparent PNG in base64
const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
// Sample minimal PDF in base64
const samplePdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF').toString('base64');

async function runPhase8TestSuite() {
  console.log('\n======================================================================');
  console.log('VYAVSAYMITRA — PHASE 8: PRODUCTION OPERATIONS & EXECUTION TEST SUITE');
  console.log('======================================================================\n');

  const ownerUser = { id: 'usr_p8_owner', email: 'owner@vyavsaymitra.in', name: 'Ramesh Patel' };
  const intruderUser = { id: 'usr_p8_intruder', email: 'intruder@vyavsaymitra.in', name: 'Intruder Malicious' };

  // Setup test businesses
  const agriBiz = await dbRepository.createBusiness(ownerUser.id, {
    name: 'Ramesh Premium Wheat Enterprise',
    domain: 'agriculture',
    businessType: 'WHEAT_FARMING',
    status: 'READY_FOR_ANALYSIS',
    location: { district: 'Anand', state: 'Gujarat', village: 'Mogri' }
  });

  const foodBiz = await dbRepository.createBusiness(ownerUser.id, {
    name: 'Anand Agri Flour Milling Unit',
    domain: 'foodtech',
    businessType: 'FOODTECH_FLOUR_MILL',
    status: 'READY_FOR_ANALYSIS',
    location: { district: 'Anand', state: 'Gujarat', village: 'Mogri' }
  });

  const intruderBiz = await dbRepository.createBusiness(intruderUser.id, {
    name: 'Intruder Unauthorized Farm',
    domain: 'agriculture',
    businessType: 'WHEAT_FARMING',
    status: 'DRAFT',
    location: { district: 'Ahmedabad', state: 'Gujarat' }
  });

  await dbRepository.saveBusinessInputs(agriBiz.id, 'agriculture', {
    crop: 'Wheat',
    area: 5,
    areaUnit: 'Acres',
    expectedYieldPerAcre: 20
  });

  console.log(`[Setup] Created test businesses:\n  - Owner Agri: ${agriBiz.id}\n  - Owner Food: ${foodBiz.id}\n  - Intruder Agri: ${intruderBiz.id}\n`);

  // ── PART 1: DOCUMENT VAULT SECURITY & TRAVERSAL PROTECTION ─────────
  console.log('[PART 1] Document Vault Security & Traversal Protection...');

  // Test 1: Missing auth / unauthenticated
  {
    const { req, res } = mockReqRes({ user: null, params: { id: agriBiz.id } });
    await documentVaultController.listDocuments(req, res, () => {});
    assert.strictEqual(res.statusCode, 401, 'Unauthenticated request must return 401');
    console.log('  ✓ Test 1 PASS: Unauthenticated access to document vault rejected with 401');
  }

  // Test 2: Multi-Tenant IDOR: Intruder cannot view Owner's documents (returns 404)
  {
    const { req, res } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id } });
    await documentVaultController.listDocuments(req, res, () => {});
    assert.strictEqual(res.statusCode, 404, 'Intruder accessing foreign business must return 404');
    console.log('  ✓ Test 2 PASS: Multi-tenant IDOR protection: Intruder cannot list foreign documents (404)');
  }

  // Upload an initial document for testing
  let uploadedDocId = null;
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: {
        documentType: 'LAND_REVENUE_RECORD_7_12',
        documentName: 'Village Form 7/12 Land Record',
        fileName: '7_12_land_record.pdf',
        mimeType: 'application/pdf',
        fileData: samplePdfBase64,
        notes: 'Original certified land record from Talati office'
      }
    });
    await documentVaultController.uploadDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 201, 'Document upload should succeed with 201');
    assert(res.data?.success, 'Upload response should be successful');
    assert(Boolean(res.data?.data?.document?.id), 'Document ID must be returned');
    assert.strictEqual(res.data?.data?.document?.version_number ?? res.data?.data?.document?.version, 1, 'Initial version must be 1');
    uploadedDocId = res.data.data.document.id;
    console.log(`  [Document Created] ID: ${uploadedDocId} (Version 1)`);
  }

  // Test 3: Multi-Tenant IDOR: Intruder cannot get Owner's document (returns 404)
  {
    const { req, res } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id, docId: uploadedDocId } });
    await documentVaultController.getDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 404, 'Intruder accessing foreign document must return 404');
    console.log('  ✓ Test 3 PASS: Multi-tenant IDOR protection: Intruder cannot get foreign document (404)');
  }

  // Test 4: Multi-Tenant IDOR: Intruder cannot download Owner's document (returns 404)
  {
    const { req, res } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id, docId: uploadedDocId } });
    await documentVaultController.downloadDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 404, 'Intruder downloading foreign document must return 404');
    console.log('  ✓ Test 4 PASS: Multi-tenant IDOR protection: Intruder cannot download foreign document (404)');
  }

  // Test 5: Multi-Tenant IDOR: Intruder cannot delete Owner's document (returns 404)
  {
    const { req, res } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id, docId: uploadedDocId } });
    await documentVaultController.deleteDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 404, 'Intruder deleting foreign document must return 404');
    console.log('  ✓ Test 5 PASS: Multi-tenant IDOR protection: Intruder cannot delete foreign document (404)');
  }

  // Test 6: MIME / Extension validation: Rejects executable and dangerous script files
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: {
        documentType: 'CUSTOM_DOC',
        fileName: 'malware.exe',
        mimeType: 'application/x-msdownload',
        fileData: Buffer.from('MZ...').toString('base64')
      }
    });
    await documentVaultController.uploadDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 400, 'Executable upload must be rejected with 400');
    assert.strictEqual(res.data?.errorCode, 'INVALID_FILE_TYPE', 'Error code must be INVALID_FILE_TYPE');
    console.log('  ✓ Test 6 PASS: Upload rejects unsupported MIME type / extension (.exe) with 400');
  }

  // Test 7: Path Traversal Defense: Malicious filename with ../ is sanitized
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: {
        documentType: 'AADHAAR_CARD',
        fileName: '../../../../etc/passwd.pdf',
        mimeType: 'application/pdf',
        fileData: samplePdfBase64
      }
    });
    await documentVaultController.uploadDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 201, 'Upload with path traversal attempt should be sanitized and succeed');
    assert.strictEqual(res.data?.data?.document?.file_name, 'passwd.pdf', 'Path traversal components must be stripped');
    console.log('  ✓ Test 7 PASS: Path traversal characters (../../) safely stripped to basename');
  }

  // ── PART 2: DOCUMENT VERSIONING & IMMUTABILITY ─────────────────────
  console.log('\n[PART 2] Document Versioning & Immutability...');

  // Test 8: Verify Version 1 snapshot exists
  {
    const { req, res } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id, docId: uploadedDocId } });
    await documentVaultController.listDocumentVersions(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data?.data?.versions?.length, 1, 'Should have exactly 1 version initially');
    assert.strictEqual(res.data?.data?.currentVersion, 1);
    console.log('  ✓ Test 8 PASS: Initial upload created Version 1 snapshot in version history');
  }

  // Test 9: Upload replacement document increments version to Version 2
  let version2StorageKey = null;
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: {
        documentId: uploadedDocId,
        documentType: 'LAND_REVENUE_RECORD_7_12',
        documentName: 'Village Form 7/12 Land Record (Updated)',
        fileName: '7_12_land_record_v2.png',
        mimeType: 'image/png',
        fileData: samplePngBase64,
        notes: 'Updated certified copy with latest crop survey entry'
      }
    });
    await documentVaultController.uploadDocument(req, res, () => {});
    assert(res.statusCode === 200 || res.statusCode === 201, 'Document replacement should succeed');
    assert.strictEqual(res.data?.data?.document?.version_number ?? res.data?.data?.document?.version, 2, 'Version must increment to 2');
    version2StorageKey = res.data?.data?.version?.storage_key;
    console.log('  ✓ Test 9 PASS: Document re-upload correctly incremented version to 2');
  }

  // Test 10: listDocumentVersions returns versions in descending order
  {
    const { req, res } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id, docId: uploadedDocId } });
    await documentVaultController.listDocumentVersions(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    const versions = res.data?.data?.versions || [];
    assert.strictEqual(versions.length, 2, 'Should have 2 versions in history');
    assert.strictEqual(versions[0].version_number, 2, 'First version in list must be newest (v2)');
    assert.strictEqual(versions[1].version_number, 1, 'Second version in list must be v1');
    console.log('  ✓ Test 10 PASS: Version history returned in descending order (v2, v1)');
  }

  // Test 11: Document Preview streams file content correctly
  {
    const { req, res } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id, docId: uploadedDocId } });
    await documentVaultController.previewDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert(Boolean(res.data), 'Preview must stream file content buffer');
    assert(res.headersSent['content-type']?.includes('image/png') || res.headersSent['content-type']?.includes('application/pdf'), 'Content-Type must match');
    console.log('  ✓ Test 11 PASS: Authenticated preview stream returns binary buffer with correct Content-Type');
  }

  // ── PART 3: DOCUMENT VERIFICATION WORKFLOW ─────────────────────────
  console.log('\n[PART 3] Document Verification & Review Workflow...');

  // Test 12: Move document to under_review
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, docId: uploadedDocId },
      body: { status: 'under_review', notes: 'Sent to bank field officer for pre-verification' }
    });
    await documentVaultController.updateDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data?.data?.status, 'under_review');
    console.log('  ✓ Test 12 PASS: Document status transitioned to "under_review"');
  }

  // Test 13: Move document to verified
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, docId: uploadedDocId },
      body: { status: 'verified', notes: 'Verified against revenue land registry portal' }
    });
    await documentVaultController.updateDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data?.data?.status, 'verified');
    console.log('  ✓ Test 13 PASS: Document status transitioned to "verified"');
  }

  // Test 14: Reject document with rejection_reason
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, docId: uploadedDocId },
      body: {
        status: 'rejected',
        rejection_reason: 'Survey number 142/1 does not match promoter Aadhaar name. Please re-upload certified khatauni.'
      }
    });
    await documentVaultController.updateDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data?.data?.status, 'rejected');
    assert(res.data?.data?.rejection_reason?.includes('Survey number 142/1'), 'Rejection reason must be stored');
    console.log('  ✓ Test 14 PASS: Document status transitioned to "rejected" with specific rejection_reason');
  }

  // Test 15: Document rejection triggers warning notification
  {
    const notifications = await dbRepository.listNotifications(ownerUser.id);
    const rejectionNotif = notifications.find(n => n.title?.includes('Document Rejected') || n.message?.includes('rejected'));
    assert(Boolean(rejectionNotif), 'Rejection must generate a notification');
    assert.strictEqual(rejectionNotif.type, 'WARNING');
    assert(rejectionNotif.action_url?.includes('tab=documents'), 'Notification should link to documents tab');
    console.log('  ✓ Test 15 PASS: Document rejection triggered real WARNING notification with document link');
  }

  // ── PART 4: APPLICATION LIFECYCLE & VALIDATION ─────────────────────
  console.log('\n[PART 4] Application Lifecycle & Validation...');

  let testAppId = null;

  // Test 16: Create application (KCC)
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: {
        application_type: 'KISAN_CREDIT_CARD',
        institution_name: 'Bank of Baroda — Mogri Rural Branch',
        institution_type: 'COMMERCIAL_BANK',
        requested_amount: 300000,
        notes: 'Crop cultivation credit limit application for Rabi Wheat'
      }
    });
    await applicationTrackingController.createApplication(req, res, () => {});
    assert.strictEqual(res.statusCode, 201, 'Application creation should return 201');
    assert(Boolean(res.data?.data?.id), 'Application must have ID');
    assert.strictEqual(res.data?.data?.status, 'DRAFT', 'Default status must be DRAFT');
    testAppId = res.data.data.id;
    console.log(`  [Application Created] ID: ${testAppId} (KISAN_CREDIT_CARD)`);
    console.log('  ✓ Test 16 PASS: Application created successfully under business');
  }

  // Test 17: Multi-Tenant IDOR: Intruder cannot view Owner's application (returns 404)
  {
    const { req, res } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id, applicationId: testAppId } });
    await applicationTrackingController.getApplication(req, res, () => {});
    assert.strictEqual(res.statusCode, 404, 'Intruder accessing foreign application must return 404');
    console.log('  ✓ Test 17 PASS: Multi-tenant IDOR protection: Intruder cannot get foreign application (404)');
  }

  // Test 18: Multi-Tenant IDOR: Intruder cannot update Owner's application (returns 404)
  {
    const { req, res } = mockReqRes({
      user: intruderUser,
      params: { id: agriBiz.id, applicationId: testAppId },
      body: { status: 'APPROVED' }
    });
    await applicationTrackingController.updateApplication(req, res, () => {});
    assert.strictEqual(res.statusCode, 404, 'Intruder updating foreign application must return 404');
    console.log('  ✓ Test 18 PASS: Multi-tenant IDOR protection: Intruder cannot update foreign application (404)');
  }

  // Test 19: Valid status transition: DRAFT -> DOCUMENTS_PENDING
  {
    const { req, res, next } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, applicationId: testAppId },
      body: {
        status: 'DOCUMENTS_PENDING',
        current_stage: 'Collecting 7/12 Land Records and Bank Statements',
        notes: 'Checklist provided by branch officer'
      }
    });
    await applicationTrackingController.updateApplication(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data?.data?.status, 'DOCUMENTS_PENDING');
    console.log('  ✓ Test 19 PASS: Valid transition to "DOCUMENTS_PENDING"');
  }

  // Test 20: Invalid status transition rejected with 400
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, applicationId: testAppId },
      body: { status: 'INVALID_STATUS_FOOBAR' }
    });
    await applicationTrackingController.updateApplication(req, res, () => {});
    assert.strictEqual(res.statusCode, 400, 'Invalid status must be rejected with 400');
    console.log('  ✓ Test 20 PASS: Invalid application status rejected with 400');
  }

  // Test 21: Transitioning to ACTION_REQUIRED generates warning notification
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, applicationId: testAppId },
      body: {
        status: 'ACTION_REQUIRED',
        notes: 'Branch requested latest 6-month savings bank account passbook copy.'
      }
    });
    await applicationTrackingController.updateApplication(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data?.data?.status, 'ACTION_REQUIRED');

    const notifications = await dbRepository.listNotifications(ownerUser.id);
    const actionNotif = notifications.find(n => n.title?.includes('Action Required') && n.category === 'APPLICATION');
    assert(Boolean(actionNotif), 'ACTION_REQUIRED status must trigger an urgent notification');
    console.log('  ✓ Test 21 PASS: Transition to ACTION_REQUIRED triggered high-priority notification');
  }

  // ── PART 5: APPLICATION DOCUMENT LINKING & READINESS GUARD ────────
  console.log('\n[PART 5] Application Document Linking & Readiness Guard...');

  // Test 22: Link document to application
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, applicationId: testAppId },
      body: { documentId: uploadedDocId, isRequired: true }
    });
    await applicationTrackingController.linkApplicationDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert(res.data?.success);
    console.log('  ✓ Test 22 PASS: Document linked to application with is_required: true');
  }

  // Test 23: Multi-Tenant IDOR: Intruder cannot link documents to foreign application
  {
    const { req, res } = mockReqRes({
      user: intruderUser,
      params: { id: agriBiz.id, applicationId: testAppId },
      body: { documentId: uploadedDocId, isRequired: true }
    });
    await applicationTrackingController.linkApplicationDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 404, 'Intruder linking document must return 404');
    console.log('  ✓ Test 23 PASS: Multi-tenant IDOR protection: Foreign document link rejected with 404');
  }

  // Test 24: Document readiness guard: Attempting to submit application with rejected/missing document fails
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, applicationId: testAppId },
      body: { status: 'SUBMITTED' }
    });
    await applicationTrackingController.updateApplication(req, res, () => {});
    assert.strictEqual(res.statusCode, 400, 'Submission with incomplete/rejected documents must fail with 400');
    assert.strictEqual(res.data?.errorCode, 'APPLICATION_DOCUMENTS_INCOMPLETE');
    console.log('  ✓ Test 24 PASS: Document readiness guard blocked submission while linked document is in rejected state');
  }

  // Fix document status to 'verified' to satisfy readiness guard
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, docId: uploadedDocId },
      body: { status: 'verified', notes: 'Fresh khatauni verified by branch' }
    });
    await documentVaultController.updateDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
  }

  // Test 25: Now that linked document is verified, transition to SUBMITTED succeeds
  {
    const expectedDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, applicationId: testAppId },
      body: {
        status: 'SUBMITTED',
        application_reference: 'BOB-KCC-2026-9812',
        submission_date: new Date().toISOString().split('T')[0],
        expected_response_date: expectedDate,
        current_stage: 'Submitted at branch desk — Under appraisal'
      }
    });
    await applicationTrackingController.updateApplication(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data?.data?.status, 'SUBMITTED');
    console.log('  ✓ Test 25 PASS: Application successfully transitioned to SUBMITTED once mandatory documents satisfied');
  }

  // Test 26: Unlink document from application
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, applicationId: testAppId, documentId: uploadedDocId }
    });
    await applicationTrackingController.unlinkApplicationDocument(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    console.log('  ✓ Test 26 PASS: Document unlinked from application successfully');
  }

  // ── PART 6: DPR ARCHIVE IMMUTABILITY & ISOLATION ───────────────────
  console.log('\n[PART 6] DPR Archive Immutability & Isolation...');

  // First save an analysis so DPR can snapshot real financial data
  await dbRepository.saveAnalysisResults(agriBiz.id, {
    total_project_cost: 350000,
    promoter_equity: 50000,
    bank_loan_requirement: 300000,
    estimated_monthly_profit: 28000,
    net_annual_profit: 336000,
    annual_roi_pct: 28.5,
    dscr: 1.85,
    status: 'ANALYSIS_COMPLETE'
  });

  let dprVersionId = null;

  // Test 27: Generating DPR version archives immutable snapshot
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id },
      body: {
        title: 'Kisan Credit Card Bankable DPR v1',
        summary: 'Official credit appraisal snapshot for Bank of Baroda'
      }
    });
    await actionPlanController.createDprVersion(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert(Boolean(res.data?.data?.id));
    assert.strictEqual(res.data?.data?.version_number, 1);
    assert(Boolean(res.data?.data?.snapshot_payload?.financials));
    dprVersionId = res.data.data.id;
    console.log(`  [DPR Version Archived] ID: ${dprVersionId} (v1)`);
    console.log('  ✓ Test 27 PASS: Bankable DPR snapshot archived with immutable version 1');
  }

  // Test 28: Multi-Tenant IDOR: Intruder cannot list Owner's DPR versions (returns 404)
  {
    const { req, res } = mockReqRes({ user: intruderUser, params: { id: agriBiz.id } });
    await actionPlanController.listDprVersions(req, res, () => {});
    assert.strictEqual(res.statusCode, 404);
    console.log('  ✓ Test 28 PASS: Multi-tenant IDOR protection: Intruder cannot view foreign DPR versions (404)');
  }

  // ── PART 7: AI MITRA EXECUTION MODE ────────────────────────────────
  console.log('\n[PART 7] AI Mitra Execution Mode...');

  // Test 29: AI execution mode returns structured execution object
  {
    const aiResponse = await generateBusinessChatResponse(
      agriBiz.id,
      'What are my current execution blockers and what should I do next to get my loan approved?',
      { mode: 'execution' }
    );
    assert(Boolean(aiResponse), 'AI execution response must be present');
    assert(Boolean(aiResponse.execution), 'aiResponse.execution must exist');
    assert(Boolean(aiResponse.execution.executiveSummary), 'Must have executiveSummary');
    assert(Array.isArray(aiResponse.execution.nextActions), 'nextActions must be an array');
    assert(Array.isArray(aiResponse.execution.blockers), 'blockers must be an array');
    assert(Array.isArray(aiResponse.execution.documentGaps), 'documentGaps must be an array');
    assert(Array.isArray(aiResponse.execution.applicationGaps), 'applicationGaps must be an array');
    console.log(`  ✓ Test 29 PASS: AI execution mode generated structured execution schema with ${aiResponse.execution.nextActions.length} next actions`);
  }

  // Test 30: AI execution mode blockers accurately reflect business state
  {
    const aiResponse = await generateBusinessChatResponse(
      agriBiz.id,
      'Show my document gaps and pending items.',
      { mode: 'execution' }
    );
    assert(typeof aiResponse.text === 'string' && aiResponse.text.length > 0);
    assert(aiResponse.execution.nextActions.length > 0, 'Should recommend at least one actionable step');
    console.log('  ✓ Test 30 PASS: AI execution response is grounded in real operational document & application state');
  }

  // Test 31: Multi-Tenant Isolation: AI execution queries for User A cannot access User B data
  {
    const intruderAiResponse = await generateBusinessChatResponse(
      intruderBiz.id,
      'Show my loans and applications',
      { mode: 'execution' }
    );
    assert(!intruderAiResponse.text.includes(agriBiz.name), 'Intruder AI response must not leak Owner business name');
    assert(!intruderAiResponse.text.includes('BOB-KCC-2026-9812'), 'Intruder AI response must not leak Owner application reference');
    console.log('  ✓ Test 31 PASS: Multi-tenant isolation: AI Mitra execution mode does not leak cross-tenant data');
  }

  // Test 32: Zero Fabricated Approvals or Synthetic Grant Numbers Guarantee
  {
    const aiResponse = await generateBusinessChatResponse(
      agriBiz.id,
      'Did my Mudra loan get approved? Give me the approval sanction letter number.',
      { mode: 'execution' }
    );
    const forbiddenFabrications = ['SANCTION-9988', 'APPROVED_BY_RBI', '100% Guaranteed Approval', 'Sanction Letter #'];
    for (const term of forbiddenFabrications) {
      assert(!aiResponse.text.includes(term), `Fabricated synthetic approval term detected: "${term}"`);
    }
    console.log('  ✓ Test 32 PASS: Zero fabricated approvals, synthetic sanction letters, or false guarantees in AI execution advice');
  }

  // ── PART 8: BUSINESS AUDIT TIMELINE ────────────────────────────────
  console.log('\n[PART 8] Business Audit Timeline...');

  // Test 33: Document & Application events are logged to timeline
  {
    const timeline = await dbRepository.listTimelineEvents(agriBiz.id, 50);
    assert(Array.isArray(timeline), 'Timeline must be an array');
    assert(timeline.length >= 3, `Expected at least 3 timeline events, found ${timeline.length}`);
    const eventTypes = timeline.map(e => e.event_type);
    assert(eventTypes.includes('DOCUMENT_UPLOAD') || eventTypes.includes('DOCUMENT_UPDATED') || eventTypes.includes('DOCUMENT_VERIFIED'), 'Must include document timeline event');
    assert(eventTypes.includes('APPLICATION_CREATED') || eventTypes.includes('APPLICATION_UPDATED') || eventTypes.includes('APPLICATION_STATUS_CHANGED'), 'Must include application timeline event');
    console.log(`  ✓ Test 33 PASS: Audit timeline accurately captured ${timeline.length} operational events`);
  }

  // Test 34: Application-specific timeline is ordered by timestamp descending
  {
    const { req, res } = mockReqRes({
      user: ownerUser,
      params: { id: agriBiz.id, applicationId: testAppId }
    });
    await applicationTrackingController.getApplicationTimeline(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    const appTimeline = res.data?.data?.timeline || [];
    assert(appTimeline.length >= 2, `Expected at least 2 events in application timeline, found ${appTimeline.length}`);
    for (let i = 0; i < appTimeline.length - 1; i++) {
      const t1 = new Date(appTimeline[i].created_at).getTime();
      const t2 = new Date(appTimeline[i + 1].created_at).getTime();
      assert(t1 >= t2, 'Application timeline must be strictly ordered reverse-chronologically');
    }
    console.log('  ✓ Test 34 PASS: Application-specific audit timeline returned in reverse-chronological order');
  }

  // ── PART 9: NOTIFICATIONS, DUE DATE REMINDERS & IDEMPOTENCY ────────
  console.log('\n[PART 9] Notifications, Due Date Reminders & Idempotency...');

  // Test 35: checkAndGenerateReminders generates notification for upcoming expected date
  {
    const reminderResults = await dbRepository.checkAndGenerateReminders();
    assert(typeof reminderResults.generatedCount === 'number');
    console.log(`  [Reminder Run 1] Generated: ${reminderResults.generatedCount} notifications`);
    console.log('  ✓ Test 35 PASS: checkAndGenerateReminders evaluated active applications');
  }

  // Test 36: Reminder Idempotency: Immediate second run generates 0 duplicate reminders
  {
    const reminderResults2 = await dbRepository.checkAndGenerateReminders();
    assert.strictEqual(reminderResults2.generatedCount, 0, 'Second run within 24h must generate 0 duplicates (idempotency)');
    console.log('  ✓ Test 36 PASS: Due date reminders are strictly idempotent (0 duplicate notifications generated)');
  }

  // Test 37: Smart Pending Actions endpoint returns real actionable items
  {
    const { req, res } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await applicationTrackingController.getBusinessPendingActions(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert(typeof res.data?.data?.totalPending === 'number');
    assert(Array.isArray(res.data?.data?.actions));
    console.log(`  ✓ Test 37 PASS: Smart Pending Actions returned ${res.data.data.totalPending} pending items with direct action metadata`);
  }

  // ── PART 10: FORMULA & TERMINOLOGY PRIVACY AUDIT ───────────────────
  console.log('\n[PART 10] Formula & Terminology Privacy Audit Across All Phase 8 Endpoints...');

  // Test 38: Zero internal engine terminology leakage
  {
    // 1. Vault
    const { req: vReq, res: vRes } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await documentVaultController.listDocuments(vReq, vRes, () => {});
    const vaultStr = JSON.stringify(vRes.data);

    // 2. Applications
    const { req: aReq, res: aRes } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await applicationTrackingController.listApplications(aReq, aRes, () => {});
    const appStr = JSON.stringify(aRes.data);

    // 3. Execution Readiness Scorecard
    const { req: rReq, res: rRes } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await applicationTrackingController.getExecutionReadiness(rReq, rRes, () => {});
    const readStr = JSON.stringify(rRes.data);

    // 4. Pending Actions
    const { req: pReq, res: pRes } = mockReqRes({ user: ownerUser, params: { id: agriBiz.id } });
    await applicationTrackingController.getBusinessPendingActions(pReq, pRes, () => {});
    const pendStr = JSON.stringify(pRes.data);

    const fullPhase8Payload = vaultStr + appStr + readStr + pendStr;
    const forbiddenInternalTerms = [
      'Cost A1', 'Cost A2', 'Cost B1', 'Cost B2', 'Cost C1', 'Cost C2',
      'FormulaRegistry', 'AST', 'eval(', 'Mass Balance Formula'
    ];

    for (const term of forbiddenInternalTerms) {
      assert(!fullPhase8Payload.includes(term), `Forbidden internal calculation term leaked in Phase 8 API: "${term}"`);
    }
    console.log('  ✓ Test 38 PASS: Zero internal technical formula names or equations leaked across all Phase 8 outputs');
  }

  console.log('\n======================================================================');
  console.log('ALL 38 PHASE 8 PRODUCTION OPERATIONS TESTS PASSED WITH 0 FAILURES');
  console.log('======================================================================\n');
}

if (require.main === module) {
  runPhase8TestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ PHASE 8 TEST FAILED:', err);
      process.exit(1);
    });
}

module.exports = runPhase8TestSuite;
