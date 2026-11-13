import { createApp } from "./app.js";
import { memoryCache, redisCache } from "./cache.js";
import { clickRecorder } from "./clicks/recorder.js";
import { config } from "./config.js";
import { connectMemory, connectPostgres } from "./db/database.js";
import { migrate } from "./db/migrate.js";
import { deleteOldDemoUsers } from "./demo/demo.js";

if (config.isProduction && !config.databaseUrl) {
  console.error("DATABASE_URL is required in production.");
  process.exit(1);
}

const db = config.databaseUrl ? connectPostgres(config.databaseUrl) : connectMemory();
if (!config.databaseUrl) console.log("No DATABASE_URL: using an in-memory database (lost on restart).");

const applied = await migrate(db);
if (applied.length) console.log(`Database updated: ${applied.join(", ")}`);

const cleanup = () => deleteOldDemoUsers(db).catch((err) => console.error("Demo cleanup:", err));
await cleanup();
setInterval(cleanup, 3_600_000).unref();

const cache = config.redisUrl ? redisCache(config.redisUrl) : memoryCache();
const clicks = clickRecorder(db);

const server = createApp({ db, cache, clicks }).listen(config.port, () => {
  console.log(`LinkPulse API on http://localhost:${config.port}`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    server.close(async () => {
      await clicks.stop();
      await cache.close();
      await db.close();
      process.exit(0);
    });
  });
}
