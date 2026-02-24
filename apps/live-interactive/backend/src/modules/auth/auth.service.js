const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const env = require("../../config/env");
const authRepository = require("./auth.repository");

function publicUserShape(user) {
  return {
    id: user.id,
    login: user.email,
    email: user.email,
    displayName: user.display_name,
    status: user.status
  };
}

async function login({ login, password, userAgent, ip }) {
  const normalizedLogin = String(login || "").trim().toLowerCase();
  let user = await authRepository.findUserByLogin(normalizedLogin);

  // Backward compatibility for old seeded logins like admin@live.local.
  if (!user && normalizedLogin && !normalizedLogin.includes("@")) {
    user = await authRepository.findUserByLogin(`${normalizedLogin}@live.local`);
  }

  // Backward compatibility for users that type old login with domain.
  if (!user && normalizedLogin.includes("@")) {
    const shortLogin = normalizedLogin.split("@")[0];
    user = await authRepository.findUserByLogin(shortLogin);
  }

  if (!user) {
    return null;
  }

  if (user.status !== "active") {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password || "", user.password_hash);
  if (!isPasswordValid) {
    return null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.session.ttlMs);

  await authRepository.createSession({
    userId: user.id,
    token,
    expiresAt,
    userAgent: (userAgent || "").slice(0, 255),
    ip: (ip || "").slice(0, 64)
  });

  return {
    token,
    expiresAt,
    user: publicUserShape(user)
  };
}

async function logout(token) {
  if (!token) {
    return;
  }
  await authRepository.revokeSessionByToken(token);
}

async function getSessionContext(token, touch = false) {
  if (!token) {
    return null;
  }

  const sessionRow = await authRepository.findActiveSessionWithUser(token);
  if (!sessionRow || sessionRow.status !== "active") {
    return null;
  }

  if (touch) {
    await authRepository.touchSession(sessionRow.session_id);
  }

  return {
    sessionId: sessionRow.session_id,
    sessionExpiresAt: sessionRow.session_expires_at,
    user: {
      id: sessionRow.user_id,
      login: sessionRow.email,
      email: sessionRow.email,
      displayName: sessionRow.display_name,
      status: sessionRow.status
    }
  };
}

module.exports = {
  login,
  logout,
  getSessionContext
};
