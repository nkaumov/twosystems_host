const pool = require("../../db/pool");

async function findUserByLogin(login) {
  const [rows] = await pool.execute(
    `SELECT id, email, password_hash, display_name, status
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [login]
  );
  return rows[0] || null;
}

async function findUserById(userId) {
  const [rows] = await pool.execute(
    `SELECT id, email, display_name, status
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function createSession({ userId, token, expiresAt, userAgent, ip }) {
  await pool.execute(
    `INSERT INTO auth_sessions (
      user_id, session_token, expires_at, user_agent, ip_address
    ) VALUES (?, ?, ?, ?, ?)`,
    [userId, token, expiresAt, userAgent, ip]
  );
}

async function revokeSessionByToken(token) {
  await pool.execute(
    `UPDATE auth_sessions
     SET revoked_at = NOW(3)
     WHERE session_token = ?
       AND revoked_at IS NULL`,
    [token]
  );
}

async function touchSession(sessionId) {
  await pool.execute(
    `UPDATE auth_sessions
     SET last_seen_at = NOW(3)
     WHERE id = ?`,
    [sessionId]
  );
}

async function findActiveSessionWithUser(token) {
  const [rows] = await pool.execute(
    `SELECT
       s.id AS session_id,
       s.user_id AS session_user_id,
       s.expires_at AS session_expires_at,
       u.id AS user_id,
       u.email,
       u.display_name,
       u.status
     FROM auth_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.session_token = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW(3)
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

module.exports = {
  findUserByLogin,
  findUserById,
  createSession,
  revokeSessionByToken,
  touchSession,
  findActiveSessionWithUser
};
