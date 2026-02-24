const { createConnection } = require("./db-common");

function parseSqlArg(argv) {
  const sqlFlag = argv.find((arg) => arg.startsWith("--sql="));
  if (sqlFlag) {
    return sqlFlag.slice("--sql=".length);
  }

  const sqlIndex = argv.indexOf("--sql");
  if (sqlIndex >= 0) {
    return argv[sqlIndex + 1];
  }

  return null;
}

async function runQuery() {
  const sql = parseSqlArg(process.argv.slice(2));
  if (!sql) {
    console.error("Usage: npm run db:query -- --sql \"SELECT * FROM users LIMIT 5\"");
    process.exit(1);
  }

  const connection = await createConnection();
  try {
    const [rows] = await connection.query(sql);
    if (!Array.isArray(rows)) {
      console.log(rows);
      return;
    }

    if (rows.length > 0 && Array.isArray(rows[0])) {
      rows.forEach((resultSet, index) => {
        console.log(`Result set #${index + 1}`);
        console.table(resultSet);
      });
      return;
    }

    console.table(rows);
  } finally {
    await connection.end();
  }
}

runQuery().catch((error) => {
  console.error("Query failed:", error.message);
  process.exit(1);
});
