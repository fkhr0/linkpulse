import request from "supertest";
import { createApp } from "../src/app.js";
import { memoryCache } from "../src/cache.js";
import { clickRecorder } from "../src/clicks/recorder.js";
import { connectMemory, type Db } from "../src/db/database.js";
import { migrate } from "../src/db/migrate.js";

export async function testApp() {
  const db: Db = connectMemory();
  await migrate(db);
  const clicks = clickRecorder(db, { every: 60_000 });
  const cache = memoryCache();
  return { app: createApp({ db, cache, clicks }), db, clicks, cache };
}

export async function signedUp(app: ReturnType<typeof createApp>, email = "sara@example.com") {
  const agent = request.agent(app);
  await agent.post("/auth/signup").send({ name: "Sara", email, password: "correct horse" }).expect(201);
  return agent;
}

export const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
export const FIREFOX_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0";
