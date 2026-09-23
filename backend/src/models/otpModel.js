/**
 * VYAVSAYMITRA — OTP Model
 * Data access layer for otp_records table using sql.js
 */

const { getDb, saveDb } = require('../config/db');

function queryOne(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

const OtpModel = {
  createOtpRecord({ email, otpHash, salt, expiresAt }) {
    const db = getDb();
    db.run(
      `INSERT INTO otp_records (email, otp_hash, salt, expires_at) VALUES (?, ?, ?, ?)`,
      [email, otpHash, salt, expiresAt]
    );
    saveDb();
    return this.findLatestActive(email);
  },

  findRecentRequests(email, windowMinutes = 15) {
    const row = queryOne(
      `SELECT COUNT(*) as count FROM otp_records 
       WHERE email = ? AND created_at > datetime('now', '-' || ? || ' minutes')`,
      [email, windowMinutes]
    );
    return row ? row.count : 0;
  },

  findLatestRequest(email) {
    return queryOne(
      `SELECT * FROM otp_records WHERE email = ? ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
  },

  findLatestActive(email) {
    return queryOne(
      `SELECT * FROM otp_records 
       WHERE email = ? AND invalidated = 0 AND used_at IS NULL AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
  },

  invalidatePending(email) {
    const db = getDb();
    db.run(
      `UPDATE otp_records SET invalidated = 1 
       WHERE email = ? AND used_at IS NULL AND invalidated = 0`,
      [email]
    );
    saveDb();
  },

  incrementAttempts(id) {
    const db = getDb();
    db.run(`UPDATE otp_records SET attempt_count = attempt_count + 1 WHERE id = ?`, [id]);
    saveDb();
  },

  markUsed(id) {
    const db = getDb();
    db.run(`UPDATE otp_records SET used_at = datetime('now') WHERE id = ?`, [id]);
    saveDb();
  },
};

module.exports = OtpModel;
