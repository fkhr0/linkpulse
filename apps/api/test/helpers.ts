// A fresh app on an empty in-memory database for each test file.
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectMemory, type Db } from "../src/db/database.js";
import { migrate } from "../src/db/migrate.js";

export async function testApp() {
  const db: Db = connectMemory();
  await migrate(db);
  return { app: createApp({ db }), db };
}

/** A signed-up user's agent: it keeps the session cookie like a browser. */
export async function signedUp(app: ReturnType<typeof createApp>, email = "sara@example.com") {
  const agent = request.agent(app);
  await agent.post("/auth/signup").send({ name: "Sara", email, password: "correct horse" }).expect(201);
  return agent;
}
