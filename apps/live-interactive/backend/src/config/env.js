const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numeric(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

function bool(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return fallback;
}

const sessionTtlHours = numeric(process.env.SESSION_TTL_HOURS, 12);

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: numeric(process.env.PORT, 4010),
  publicBaseUrl: String(process.env.PUBLIC_BASE_URL || "").trim(),
  trustProxy: bool(process.env.TRUST_PROXY, false),
  db: {
    host: required("MYSQL_HOST"),
    port: numeric(process.env.MYSQL_PORT, 3306),
    user: required("MYSQL_USER"),
    password: process.env.MYSQL_PASSWORD || "",
    database: required("MYSQL_DATABASE"),
    charset: process.env.MYSQL_CHARSET || "utf8mb4",
    collation: process.env.MYSQL_COLLATION || "utf8mb4_general_ci"
  },
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || "li_session",
    ttlHours: sessionTtlHours,
    ttlMs: sessionTtlHours * 60 * 60 * 1000,
    secureCookie: bool(process.env.SESSION_SECURE_COOKIE, false)
  }
};
