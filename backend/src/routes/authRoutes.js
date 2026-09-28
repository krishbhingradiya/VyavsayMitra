/**
 * VYAVSAYMITRA — Auth Routes
 */

const { Router } = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.post('/session', authController.ensureSession);

router.get('/me', requireAuth, (req, res) => res.json({ success: true, user: req.user }));
router.post('/logout', requireAuth, (req, res) => res.json({ success: true, message: 'Logged out successfully.' }));

router.get('/profile', requireAuth, authController.getProfile);
router.put('/profile', requireAuth, authController.updateProfile);

module.exports = router;
