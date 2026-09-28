/**
 * VYAVSAYMITRA — Field Operations Routes
 * Phase 12: Real-World Pilot Operations, External Integrations & Scale Readiness
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { fieldOperationsController } = require('../controllers/fieldOperationsController');

const router = Router({ mergeParams: true });

// All field operations routes require authentication
router.use(requireAuth);

router.get('/', (req, res, next) => fieldOperationsController.listVisits(req, res, next));
router.post('/', (req, res, next) => fieldOperationsController.createVisit(req, res, next));
router.patch('/:visitId', (req, res, next) => fieldOperationsController.updateVisit(req, res, next));
router.post('/:visitId/checklist', (req, res, next) => fieldOperationsController.updateChecklistItem(req, res, next));

module.exports = router;
