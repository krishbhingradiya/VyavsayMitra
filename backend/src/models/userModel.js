/**
 * VYAVSAYMITRA — User Model
 * Data access layer for users table using sql.js
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

const UserModel = {
  findByEmail(email) {
    return queryOne('SELECT * FROM users WHERE email = ?', [email]);
  },

  findById(id) {
    return queryOne('SELECT * FROM users WHERE id = ?', [id]);
  },

  upsert(email, name = '', phone = '') {
    const db = getDb();
    const existing = this.findByEmail(email);

    if (existing) {
      db.run(
        `UPDATE users SET name = CASE WHEN ? != '' THEN ? ELSE name END,
                          phone = CASE WHEN ? != '' THEN ? ELSE phone END,
                          updated_at = datetime('now')
         WHERE email = ?`,
        [name, name, phone, phone, email]
      );
      saveDb();
      return this.findByEmail(email);
    }

    db.run(
      `INSERT INTO users (email, name, phone) VALUES (?, ?, ?)`,
      [email, name || email.split('@')[0], phone]
    );
    saveDb();
    return this.findByEmail(email);
  },
};

module.exports = UserModel;
