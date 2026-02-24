const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getDbConfig() {
  return {
    host: required("MYSQL_HOST"),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: required("MYSQL_USER"),
    password: process.env.MYSQL_PASSWORD || "",
    database: required("MYSQL_DATABASE"),
    charset: process.env.MYSQL_CHARSET || "utf8mb4",
    multipleStatements: true
  };
}

async function createConnection() {
  return mysql.createConnection(getDbConfig());
}

async function ensureMigrationsTable(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      version VARCHAR(120) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_version (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
}

function parseVersion(filename) {
  return filename.split("_")[0];
}

async function readMigrationFiles() {
  const migrationsDir = path.resolve(__dirname, "../db/migrations");
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

module.exports = {
  createConnection,
  ensureMigrationsTable,
  readMigrationFiles,
  parseVersion
};
