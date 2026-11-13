import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectMemory, connectPostgres } from "./db/database.js";
import { migrate } from "./db/migrate.js";

if (config.isProduction && !config.databaseUrl) {
  console.error("DATABASE_URL is required in production.");
  process.exit(1);
}

const db = config.databaseUrl ? connectPostgres(config.databaseUrl) : connectMemory();
if (!config.databaseUrl) console.log("No DATABASE_URL: using an in-memory database (lost on restart).");

const applied = await migrate(db);
if (applied.length) console.log(`Database updated: ${applied.join(", ")}`);

createApp({ db }).listen(config.port, () => {
  console.log(`LinkPulse API on http://localhost:${config.port}`);
});
