/**
 * VYAVSAYMITRA — Admin Routes (Phase 11)
 *
 * Operational and analytics endpoints protected strictly by requireAdmin.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// All admin routes strictly require admin privileges
router.use(requireAdmin);

router.get('/metrics', adminController.getAdminMetrics);
router.get('/health', adminController.getAdminHealth);
router.get('/usage', adminController.getAdminUsage);
router.get('/feedback', adminController.getAdminFeedback);
router.get('/outcomes', adminController.getAdminOutcomes);
router.get('/operations', adminController.getAdminOperations);
router.get('/reliability', adminController.getAdminReliability);

module.exports = router;

