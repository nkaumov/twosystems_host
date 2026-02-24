const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const {
  createConnection,
  ensureMigrationsTable,
  readMigrationFiles,
  parseVersion
} = require("./db-common");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function applyMigrations() {
  const connection = await createConnection();
  try {
    await ensureMigrationsTable(connection);
    const files = await readMigrationFiles();

    const [appliedRows] = await connection.query(
      "SELECT version, checksum FROM schema_migrations"
    );
    const appliedByVersion = new Map(
      appliedRows.map((row) => [row.version, row.checksum])
    );

    let appliedCount = 0;
    for (const filename of files) {
      const version = parseVersion(filename);
      const migrationPath = path.resolve(__dirname, "../db/migrations", filename);
      const sql = await fs.readFile(migrationPath, "utf8");
      const checksum = sha256(sql);

      if (appliedByVersion.has(version)) {
        const existingChecksum = appliedByVersion.get(version);
        if (existingChecksum !== checksum) {
          throw new Error(
            `Checksum mismatch for migration ${filename}. ` +
              `Applied checksum differs from file checksum.`
          );
        }
        continue;
      }

      console.log(`Applying migration: ${filename}`);
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.execute(
          `INSERT INTO schema_migrations (version, filename, checksum)
           VALUES (?, ?, ?)`,
          [version, filename, checksum]
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
      appliedCount += 1;
    }

    if (appliedCount === 0) {
      console.log("No pending migrations.");
    } else {
      console.log(`Done. Applied ${appliedCount} migration(s).`);
    }
  } finally {
    await connection.end();
  }
}

applyMigrations().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
