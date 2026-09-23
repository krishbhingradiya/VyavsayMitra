/**
 * VYAVSAYMITRA — SQLite Database Initialization (sql.js — pure JS)
 *
 * Configurable via DB_PATH environment variable.
 * Tables:
 * - otp_records: Stores hashed OTPs with expiration, attempts, usage tracking
 * - users: Minimal user record for email-based lookup
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '../../data', 'vyavsaymitra.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/** @type {import('sql.js').Database | null} */
let db = null;

/**
 * Initialize the database. Must be called (and awaited) before any queries.
 * @returns {Promise<import('sql.js').Database>}
 */
async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB file or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS otp_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      used_at TEXT DEFAULT NULL,
      invalidated INTEGER DEFAULT 0
    );
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_otp_email_expires ON otp_records (email, expires_at);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_otp_email_active ON otp_records (email, invalidated, used_at);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`);

  // Persist to disk
  saveDb();

  // Cleanup expired OTPs on startup
  cleanupExpiredOtps();

  // Run cleanup every 30 minutes
  setInterval(() => {
    cleanupExpiredOtps();
    saveDb();
  }, 30 * 60 * 1000);

  console.log('[DB] SQLite database initialized at', DB_PATH);
  return db;
}

/** Persist the in-memory database to disk */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/** Clean up expired OTP records older than 1 hour */
function cleanupExpiredOtps() {
  if (!db) return;
  db.run(`DELETE FROM otp_records WHERE expires_at < datetime('now', '-1 hour')`);
  saveDb();
}

/** Get the initialized database instance */
function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

// Save on process exit
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

module.exports = { initDb, getDb, saveDb, DB_PATH };
