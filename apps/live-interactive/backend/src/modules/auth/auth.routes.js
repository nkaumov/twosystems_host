const express = require("express");
const env = require("../../config/env");
const asyncHandler = require("../../middleware/async-handler");
const authService = require("./auth.service");

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const login = String(req.body?.login || req.body?.email || "");
    const password = String(req.body?.password || "");

    const result = await authService.login({
      login,
      password,
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip || req.socket?.remoteAddress || ""
    });

    if (!result) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    res.cookie(env.session.cookieName, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.session.secureCookie,
      maxAge: env.session.ttlMs,
      path: "/"
    });

    return res.status(200).json({
      user: result.user,
      expiresAt: result.expiresAt
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[env.session.cookieName];
    await authService.logout(token);
    res.clearCookie(env.session.cookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.session.secureCookie,
      path: "/"
    });
    return res.status(204).send();
  })
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[env.session.cookieName];
    const context = await authService.getSessionContext(token, true);

    if (!context) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    return res.status(200).json({
      user: context.user,
      sessionId: context.sessionId,
      sessionExpiresAt: context.sessionExpiresAt
    });
  })
);

module.exports = router;
