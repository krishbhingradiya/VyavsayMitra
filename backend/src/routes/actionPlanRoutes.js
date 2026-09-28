/**
 * VYAVSAYMITRA — ACTION PLAN & EXECUTION ROUTES (PHASE 7)
 * 
 * Routes for dynamic action planning, document readiness checklist,
 * immutable DPR snapshots, audit timeline, and verified market trends.
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/actionPlanController');

const router = Router();

// All execution endpoints require authentication
router.use(requireAuth);

// Action Plan Tasks
router.get('/:id/action-plan', ctrl.getActionPlan);
router.post('/:id/action-plan/tasks', ctrl.createTask);
router.patch('/:id/action-plan/tasks/:taskId', ctrl.updateTask);
router.delete('/:id/action-plan/tasks/:taskId', ctrl.deleteTask);

// Phase 8 Real Document Vault Endpoints
const docVaultCtrl = require('../controllers/documentVaultController');
const appTrackCtrl = require('../controllers/applicationTrackingController');

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

// Market Trends (Zero Fake Data Guarantee)
router.get('/:id/market/trends', ctrl.getMarketTrends);

module.exports = router;
