const env = require("../config/env");
const authService = require("../modules/auth/auth.service");

function unauthorizedApi(res) {
  res.status(401).json({ error: "Требуется авторизация" });
}

async function resolveSession(req, touch = false) {
  const token = req.cookies?.[env.session.cookieName];
  const context = await authService.getSessionContext(token, touch);
  if (context) {
    req.auth = context;
  } else {
    req.auth = null;
  }
  return context;
}

async function requireApiSession(req, res, next) {
  const context = await resolveSession(req, true);
  if (!context) {
    return unauthorizedApi(res);
  }
  return next();
}

async function requirePageSession(req, res, next) {
  const context = await resolveSession(req, true);
  if (!context) {
    return res.redirect("/login");
  }
  return next();
}

async function attachSessionIfAny(req, res, next) {
  await resolveSession(req, false);
  next();
}

module.exports = {
  requireApiSession,
  requirePageSession,
  attachSessionIfAny
};
