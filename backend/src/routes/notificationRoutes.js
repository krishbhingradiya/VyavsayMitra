/**
 * VYAVSAYMITRA — User Notifications Routes
 * 
 * Provides endpoints for persistent notifications derived from business state:
 * - GET    /api/notifications         (List notifications for authenticated user)
 * - PATCH  /api/notifications/:id/read (Mark a single notification as read)
 * - POST   /api/notifications/read-all (Mark all notifications as read)
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/businessManagementController');

const router = Router();

router.use(requireAuth);

router.get('/', ctrl.listNotifications);
router.patch('/:id/read', ctrl.markNotificationRead);
router.post('/read-all', ctrl.markAllNotificationsRead);
router.post('/mark-all-read', ctrl.markAllNotificationsRead);

module.exports = router;
