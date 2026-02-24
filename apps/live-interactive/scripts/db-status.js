const {
  createConnection,
  ensureMigrationsTable,
  readMigrationFiles,
  parseVersion
} = require("./db-common");

async function showStatus() {
  const connection = await createConnection();
  try {
    await ensureMigrationsTable(connection);
    const files = await readMigrationFiles();

    const [appliedRows] = await connection.query(
      "SELECT version, filename, applied_at FROM schema_migrations ORDER BY version ASC"
    );
    const appliedByVersion = new Map(appliedRows.map((row) => [row.version, row]));

    const rows = files.map((filename) => {
      const version = parseVersion(filename);
      const applied = appliedByVersion.get(version);
      return {
        version,
        filename,
        status: applied ? "applied" : "pending",
        appliedAt: applied ? applied.applied_at : null
      };
    });

    console.table(rows);
  } finally {
    await connection.end();
  }
}

showStatus().catch((error) => {
  console.error("Status failed:", error.message);
  process.exit(1);
});
