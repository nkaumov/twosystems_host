const { app, env } = require("./app");
const pool = require("./db/pool");

async function bootstrap() {
  await pool.query("SELECT 1");
  app.listen(env.port, () => {
    console.log(`live-interactive backend listening on http://localhost:${env.port}`);
    if (env.publicBaseUrl) {
      console.log(`live-interactive public url: ${env.publicBaseUrl}`);
    }
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
