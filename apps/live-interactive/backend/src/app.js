const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const privateNoCache = require("./middleware/private-no-cache");
const {
  requireApiSession,
  requirePageSession,
  attachSessionIfAny
} = require("./middleware/session-guards");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");
const healthRoutes = require("./modules/health/health.routes");
const authRoutes = require("./modules/auth/auth.routes");
const presentationsRoutes = require("./modules/presentations/presentations.routes");
const realtimeRoutes = require("./modules/realtime/realtime.routes");
const qrRoutes = require("./modules/qr/qr.routes");

const app = express();
const frontendDir = path.resolve(__dirname, "../../frontend");
const publicDir = path.resolve(__dirname, "../../public");

app.disable("x-powered-by");
if (env.trustProxy) {
  app.set("trust proxy", 1);
}
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/styles", express.static(path.join(frontendDir, "styles")));
app.use("/scripts", express.static(path.join(frontendDir, "scripts")));
app.use("/media", express.static(path.join(publicDir, "media")));
app.use("/public", express.static(publicDir));
app.get("/logo.png", (req, res) => {
  res.sendFile(path.join(publicDir, "media", "logo.png"));
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", privateNoCache, authRoutes);
app.use("/api/presentations", privateNoCache, requireApiSession, presentationsRoutes);
app.use("/api/realtime", privateNoCache, requireApiSession, realtimeRoutes);
app.use("/api/qr", privateNoCache, qrRoutes);

app.get(
  "/",
  attachSessionIfAny,
  (req, res) => {
    if (req.auth) {
      return res.redirect("/presentations");
    }
    return res.redirect("/login");
  }
);

app.get(
  "/login",
  attachSessionIfAny,
  privateNoCache,
  (req, res) => {
    if (req.auth) {
      return res.redirect("/presentations");
    }
    return res.sendFile(path.join(frontendDir, "pages/login.html"));
  }
);

app.get(
  "/presentations",
  privateNoCache,
  requirePageSession,
  (req, res) => res.sendFile(path.join(frontendDir, "pages/presentations.html"))
);

app.get(
  "/presentations/:id/editor",
  privateNoCache,
  requirePageSession,
  (req, res) => res.sendFile(path.join(frontendDir, "pages/editor.html"))
);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = {
  app,
  env
};
