/**
 * VYAVSAYMITRA — Feedback Routes (Phase 11)
 *
 * Routes for submitting and reading user feedback.
 */

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/', feedbackController.submitFeedback);
router.get('/', feedbackController.getUserFeedback);

module.exports = router;
