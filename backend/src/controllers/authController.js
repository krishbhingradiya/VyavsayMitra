/**
 * VYAVSAYMITRA — Auth Controller
 * 
 * Manages OTP generation, sending, hashing, verification,
 * and user session resolution using sql.js backed models.
 */

const crypto = require('crypto');
const OtpModel = require('../models/otpModel');
const UserModel = require('../models/userModel');
const { sendOtpEmail } = require('../services/email');

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const MAX_OTP_REQUESTS_PER_WINDOW = 3;
const OTP_REQUEST_WINDOW_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp, salt) {
  const secret = process.env.OTP_SECRET || 'vyavsaymitra-default-otp-secret-change-me';
  return crypto
    .createHmac('sha256', secret)
    .update(otp + salt)
    .digest('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

exports.sendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const recentCount = OtpModel.findRecentRequests(email, OTP_REQUEST_WINDOW_MINUTES);
    if (recentCount >= MAX_OTP_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.',
      });
    }

    const latestOtp = OtpModel.findLatestRequest(email);
    if (latestOtp && !latestOtp.invalidated && !latestOtp.used_at) {
      const createdAt = new Date(latestOtp.created_at + 'Z').getTime();
      const elapsed = (Date.now() - createdAt) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remaining} seconds before requesting a new OTP.`,
          cooldownRemaining: remaining,
        });
      }
    }

    OtpModel.invalidatePending(email);

    const otp = generateOtp();
    const salt = generateSalt();
    const otpHash = hashOtp(otp, salt);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
      .toISOString()
      .replace('T', ' ')
      .replace(/\..+/, '');

    OtpModel.createOtpRecord({ email, otpHash, salt, expiresAt });
    UserModel.upsert(email);

    const sent = await sendOtpEmail(email, otp);
    if (!sent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: 'If the email is eligible, an OTP has been sent.',
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (err) {
    console.error('[AUTH] send-otp error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
};

exports.verifyOtp = (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = (req.body.otp || '').trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit OTP.',
      });
    }

    const record = OtpModel.findLatestActive(email);

    if (!record || record.attempt_count >= MAX_ATTEMPTS) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid. Please request a new OTP.',
        code: 'OTP_EXPIRED',
      });
    }

    const submittedHash = hashOtp(otp, record.salt);
    if (submittedHash !== record.otp_hash) {
      OtpModel.incrementAttempts(record.id);
      const newAttemptCount = record.attempt_count + 1;

      if (newAttemptCount >= MAX_ATTEMPTS) {
        OtpModel.invalidatePending(email);
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new OTP.',
          code: 'MAX_ATTEMPTS',
          attemptsRemaining: 0,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.',
        code: 'WRONG_OTP',
        attemptsRemaining: MAX_ATTEMPTS - newAttemptCount,
      });
    }

    OtpModel.markUsed(record.id);
    const user = UserModel.upsert(email);

    return res.json({
      success: true,
      message: 'OTP verified successfully.',
      user: {
        id: `user-${user.id}`,
        email: user.email,
        name: user.name || '',
        phone: user.phone || '',
      },
    });
  } catch (err) {
    console.error('[AUTH] verify-otp error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
};
