/**
 * VYAVSAYMITRA — OTP Authentication Routes
 *
 * POST /api/auth/send-otp   — Generate & send OTP
 * POST /api/auth/verify-otp — Verify OTP & authenticate
 *
 * Uses sql.js (pure JS SQLite) — all DB calls are synchronous on the
 * in-memory database instance; the DB is persisted to disk after writes.
 */

const { Router } = require('express');
const crypto = require('crypto');
const { getDb, saveDb } = require('../db');
const { sendOtpEmail } = require('../services/email');

const router = Router();

// ─── Configuration ────────────────────────────────────────────────
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const MAX_OTP_REQUESTS_PER_WINDOW = 3;
const OTP_REQUEST_WINDOW_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

// ─── Helpers ──────────────────────────────────────────────────────

/** Normalize email: trim, lowercase */
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

/** Basic email format validation */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Generate cryptographically secure 6-digit OTP */
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/** Hash OTP with HMAC-SHA256 using server secret + per-record salt */
function hashOtp(otp, salt) {
  const secret = process.env.OTP_SECRET || 'vyavsaymitra-default-otp-secret-change-me';
  return crypto
    .createHmac('sha256', secret)
    .update(otp + salt)
    .digest('hex');
}

/** Generate a random salt */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// ─── sql.js helper: run a query and return first row ──────────────
function queryOne(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
  }
  stmt.free();
  return row;
}

function runSql(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
}

// ─── POST /api/auth/send-otp ──────────────────────────────────────

router.post('/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    // 1. Validate email format
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    // 2. Rate limit: max requests per window
    const countRow = queryOne(
      `SELECT COUNT(*) as cnt FROM otp_records WHERE email = ? AND created_at > datetime('now', '-${OTP_REQUEST_WINDOW_MINUTES} minutes')`,
      [email]
    );
    if (countRow && countRow.cnt >= MAX_OTP_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.',
      });
    }

    // 3. Resend cooldown check
    const latestOtp = queryOne(
      `SELECT created_at FROM otp_records WHERE email = ? AND invalidated = 0 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    if (latestOtp) {
      const createdAt = new Date(latestOtp.created_at + 'Z').getTime();
      const now = Date.now();
      const elapsed = (now - createdAt) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remaining} seconds before requesting a new OTP.`,
          cooldownRemaining: remaining,
        });
      }
    }

    // 4. Invalidate any previous active OTPs for this email
    runSql(
      `UPDATE otp_records SET invalidated = 1 WHERE email = ? AND invalidated = 0 AND used_at IS NULL`,
      [email]
    );

    // 5. Generate OTP
    const otp = generateOtp();
    const salt = generateSalt();
    const otpHash = hashOtp(otp, salt);

    // 6. Store hashed OTP
    runSql(
      `INSERT INTO otp_records (email, otp_hash, salt, expires_at) VALUES (?, ?, ?, datetime('now', '+${OTP_EXPIRY_MINUTES} minutes'))`,
      [email, otpHash, salt]
    );

    // 7. Ensure user exists (create minimal record if not)
    runSql(`INSERT OR IGNORE INTO users (email) VALUES (?)`, [email]);

    // Persist DB to disk
    saveDb();

    // 8. Send OTP email
    const sent = await sendOtpEmail(email, otp);
    if (!sent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

    // 9. Generic success response (never reveal OTP)
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
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────

router.post('/verify-otp', (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = (req.body.otp || '').trim();

    // 1. Validate input
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

    // 2. Find active OTP record
    const record = queryOne(
      `SELECT id, otp_hash, salt, expires_at, attempt_count, used_at, invalidated
       FROM otp_records
       WHERE email = ?
         AND invalidated = 0
         AND used_at IS NULL
         AND expires_at > datetime('now')
         AND attempt_count < ${MAX_ATTEMPTS}
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid. Please request a new OTP.',
        code: 'OTP_EXPIRED',
      });
    }

    // 3. Compare hashed OTP
    const submittedHash = hashOtp(otp, record.salt);
    if (submittedHash !== record.otp_hash) {
      // Increment failed attempt count
      runSql(`UPDATE otp_records SET attempt_count = attempt_count + 1 WHERE id = ?`, [record.id]);

      const newAttemptCount = record.attempt_count + 1;

      // Invalidate if max attempts reached
      if (newAttemptCount >= MAX_ATTEMPTS) {
        runSql(`UPDATE otp_records SET invalidated = 1 WHERE id = ?`, [record.id]);
        saveDb();
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new OTP.',
          code: 'MAX_ATTEMPTS',
          attemptsRemaining: 0,
        });
      }

      saveDb();
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.',
        code: 'WRONG_OTP',
        attemptsRemaining: MAX_ATTEMPTS - newAttemptCount,
      });
    }

    // 4. OTP matches — mark as used (single-use)
    runSql(`UPDATE otp_records SET used_at = datetime('now') WHERE id = ?`, [record.id]);

    // 5. Get or create user
    let user = queryOne(`SELECT id, email, name, phone FROM users WHERE email = ?`, [email]);
    if (!user) {
      runSql(`INSERT OR IGNORE INTO users (email) VALUES (?)`, [email]);
      user = queryOne(`SELECT id, email, name, phone FROM users WHERE email = ?`, [email]);
    }

    saveDb();

    // 6. Return success with user info
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
});

module.exports = router;
