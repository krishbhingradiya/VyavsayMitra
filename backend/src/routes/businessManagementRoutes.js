/**
 * VYAVSAYMITRA — Business Management & Workspace Routes
 * 
 * Implements clean business-centric API endpoints:
 * - GET    /api/businesses          (List businesses for authenticated user)
 * - POST   /api/businesses          (Create business)
 * - GET    /api/businesses/:id      (Get business details & workspace state)
 * - PATCH  /api/businesses/:id      (Update business metadata or status)
 * - POST   /api/businesses/:id/analyze (Run deterministic business analysis)
 * - GET    /api/businesses/:id/market  (Get verified mandi market intelligence)
 * - GET    /api/businesses/:id/schemes (Get business-matched schemes)
 * - POST   /api/businesses/:id/ai      (Context-grounded AI Mitra advisory)
 * - GET    /api/businesses/:id/reports (List saved reports & DPRs)
 * - POST   /api/businesses/:id/reports (Generate and save a report)
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/businessManagementController');

const router = Router();

// All business workspace routes require authenticated session
router.use(requireAuth);

router.get('/', ctrl.listBusinesses);
router.post('/', ctrl.createBusiness);
router.get('/stats', ctrl.getDashboardStats);

// Notifications
router.get('/notifications', ctrl.listNotifications);
router.patch('/notifications/:id/read', ctrl.markNotificationRead);
router.post('/notifications/read-all', ctrl.markAllNotificationsRead);
router.post('/notifications/mark-all-read', ctrl.markAllNotificationsRead);

router.get('/:id', ctrl.getBusiness);
router.patch('/:id', ctrl.updateBusiness);

const actionCtrl = require('../controllers/actionPlanController');

// Business Workspace sub-resources
router.get('/:id/analyses', ctrl.listAnalyses);
router.post('/:id/analyze', ctrl.analyzeBusiness);
router.get('/:id/market', ctrl.getBusinessMarket);
router.get('/:id/market/trends', actionCtrl.getMarketTrends);
router.get('/:id/schemes', ctrl.getBusinessSchemes);
router.post('/:id/ai', ctrl.chatAi);
router.get('/:id/reports', ctrl.listReports);
router.post('/:id/reports', ctrl.createReport);

const docVaultCtrl = require('../controllers/documentVaultController');
const appTrackCtrl = require('../controllers/applicationTrackingController');

// User-level pending actions
router.get('/execution/pending-actions', appTrackCtrl.getPendingActions);

// Phase 7 Action Plan & Execution Endpoints
router.get('/:id/action-plan', actionCtrl.getActionPlan);
router.post('/:id/action-plan/tasks', actionCtrl.createTask);
router.patch('/:id/action-plan/tasks/:taskId', actionCtrl.updateTask);
router.delete('/:id/action-plan/tasks/:taskId', actionCtrl.deleteTask);

// Phase 8 Real Document Vault Endpoints
router.get('/:id/documents', docVaultCtrl.listDocuments);
router.post('/:id/documents/upload', docVaultCtrl.uploadDocument);
router.get('/:id/documents/:documentId', docVaultCtrl.getDocument);
router.get('/:id/documents/:documentId/preview', docVaultCtrl.previewDocument);
router.get('/:id/documents/:documentId/download', docVaultCtrl.downloadDocument);
router.patch('/:id/documents/:documentId', docVaultCtrl.updateDocument);
router.delete('/:id/documents/:documentId', docVaultCtrl.deleteDocument);
router.get('/:id/documents/:documentId/versions', docVaultCtrl.listVersions);

// Phase 8 Application Tracking Endpoints
router.get('/:id/applications', appTrackCtrl.listApplications);
router.post('/:id/applications', appTrackCtrl.createApplication);
router.get('/:id/applications/:applicationId', appTrackCtrl.getApplication);
router.patch('/:id/applications/:applicationId', appTrackCtrl.updateApplication);
router.delete('/:id/applications/:applicationId', appTrackCtrl.deleteApplication);
router.get('/:id/applications/:applicationId/timeline', appTrackCtrl.getTimeline);
router.post('/:id/applications/:applicationId/documents', appTrackCtrl.linkDocument);
router.delete('/:id/applications/:applicationId/documents/:documentId', appTrackCtrl.unlinkDocument);

// Phase 8 Execution Readiness & Smart Pending Actions
router.get('/:id/execution/readiness', appTrackCtrl.getExecutionReadiness);
router.get('/:id/execution/pending-actions', appTrackCtrl.getPendingActions);

// Phase 7 Real Progress & Audit Timeline Endpoints
router.get('/:id/progress', actionCtrl.getProgress);
router.get('/:id/timeline', actionCtrl.getTimeline);

// Phase 7 Immutable Bankable DPR Versions
router.get('/:id/dpr-versions', actionCtrl.listDprVersions);
router.post('/:id/dpr-versions', actionCtrl.createDprVersion);
router.get('/:id/dpr-versions/:versionId', actionCtrl.getDprVersion);

// ── Business Intelligence Pipeline Endpoints ──
router.get('/:id/scenarios', ctrl.getScenarioAnalysis);
router.post('/:id/scenarios', ctrl.getScenarioAnalysis);
router.get('/:id/loan-comparison', ctrl.getLoanComparison);
router.post('/:id/loan-comparison', ctrl.getLoanComparison);
router.get('/:id/intelligence', ctrl.getStructuredAnalysis);
router.post('/:id/intelligence', ctrl.getStructuredAnalysis);
router.get('/:id/competitors', ctrl.getBusinessCompetitors);

// ── Phase 9 Execution Intelligence Endpoints ──
const executionIntelligence = require('../services/executionIntelligence');

router.get('/:id/health', async (req, res) => {
  try {
    const health = await executionIntelligence.calculateBusinessHealth(req.params.id, req.user.id);
    if (!health) return res.status(404).json({ success: false, message: 'Business not found.' });
    return res.json({ success: true, data: health });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to calculate business health.' });
  }
});

router.get('/:id/next-action', async (req, res) => {
  try {
    const action = await executionIntelligence.getNextBestAction(req.params.id, req.user.id);
    return res.json({ success: true, data: action });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to determine next action.' });
  }
});

router.get('/:id/changes', async (req, res) => {
  try {
    const since = req.query.since || null;
    const changes = await executionIntelligence.detectChanges(req.params.id, req.user.id, since);
    if (!changes) return res.status(404).json({ success: false, message: 'Business not found.' });
    return res.json({ success: true, data: changes });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to detect changes.' });
  }
});

// ── Phase 11 Performance, Outcomes & Recommendation Effectiveness Endpoints ──
const perfCtrl = require('../controllers/businessPerformanceController');

router.get('/:id/outcomes', perfCtrl.listOutcomes);
router.post('/:id/outcomes', perfCtrl.createOutcome);
router.get('/:id/performance', perfCtrl.getPerformance);
router.get('/:id/analytics', perfCtrl.getAnalytics);
router.get('/:id/recommendations/effectiveness', perfCtrl.getRecommendationEffectiveness);
router.post('/:id/recommendations/action', perfCtrl.recordRecommendationAction);

// ── Phase 12 Field Operations, Journey, Evidence, Quality & Scale Endpoints ──
const { businessExecutionScaleController } = require('../controllers/businessExecutionScaleController');
const fieldOpsRouter = require('./fieldOperationsRoutes');

// Journey & Execution Center
router.get('/:id/journey', (req, res, next) => businessExecutionScaleController.getJourney(req, res, next));
router.get('/:id/data-quality', (req, res, next) => businessExecutionScaleController.getDataQuality(req, res, next));
router.get('/:id/stale-data', (req, res, next) => businessExecutionScaleController.getStaleData(req, res, next));
router.get('/:id/execution-center', (req, res, next) => businessExecutionScaleController.getExecutionCenter(req, res, next));

// Evidence Vault
router.get('/:id/evidence', (req, res, next) => businessExecutionScaleController.listEvidence(req, res, next));
router.post('/:id/evidence', (req, res, next) => businessExecutionScaleController.createEvidence(req, res, next));
router.patch('/:id/evidence/:evidenceId', (req, res, next) => businessExecutionScaleController.updateEvidence(req, res, next));
router.delete('/:id/evidence/:evidenceId', (req, res, next) => businessExecutionScaleController.deleteEvidence(req, res, next));

// Outcome Verification
router.post('/:id/outcomes/:outcomeId/verify', (req, res, next) => businessExecutionScaleController.verifyOutcome(req, res, next));

// Partner Assignments
router.get('/:id/partners', (req, res, next) => businessExecutionScaleController.listPartners(req, res, next));
router.post('/:id/partners', (req, res, next) => businessExecutionScaleController.createPartner(req, res, next));
router.patch('/:id/partners/:partnerId', (req, res, next) => businessExecutionScaleController.updatePartner(req, res, next));

// Field Visits
router.use('/:id/field-visits', fieldOpsRouter);

module.exports = router;


