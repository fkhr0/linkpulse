import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/database.js";
import { deleteOldDemoUsers } from "../src/demo/demo.js";
import { testApp } from "./helpers.js";

let app: Awaited<ReturnType<typeof testApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await testApp());
});

describe("demo", () => {
  it("each visitor gets their own account with links and clicks", async () => {
    const one = request.agent(app);
    const two = request.agent(app);
    const a = await one.post("/auth/demo").expect(201);
    const b = await two.post("/auth/demo").expect(201);
    expect(a.body.isDemo).toBe(true);
    expect(a.body.id).not.toBe(b.body.id);

    const links = await one.get("/links").expect(200);
    expect(links.body.total).toBe(6);
    const overview = await one.get("/stats/overview").expect(200);
    expect(overview.body.clicks).toBeGreaterThan(100);
    expect(overview.body.last7Days).toHaveLength(7);

    const first = links.body.items[0];
    await one.patch(`/links/${first.id}`).send({ title: "Changed" }).expect(200);
    await two.get(`/links/${first.id}`).expect(404);
  });

  it("the link totals match the click rows", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/demo").expect(201);
    const { body } = await agent.get("/links").expect(200);
    const link = body.items[0];
    const stats = await agent.get(`/stats/links/${link.id}`).query({ days: 30 }).expect(200);
    expect(stats.body.total).toBe(link.clicks);
    expect(stats.body.referrers.length).toBeGreaterThan(1);
  });

  it("can't be signed into with a password", async () => {
    const { body } = await request(app).post("/auth/demo").expect(201);
    await request(app).post("/auth/login").send({ email: body.email, password: "none" }).expect(401);
  });

  it("is deleted after a day", async () => {
    const { body } = await request(app).post("/auth/demo").expect(201);
    await db.query("UPDATE users SET created_at = now() - interval '25 hours' WHERE id = $1", [body.id]);
    expect(await deleteOldDemoUsers(db)).toBe(1);
    const left = await db.one("SELECT id FROM links WHERE user_id = $1", [body.id]);
    expect(left).toBeUndefined();
  });

  it("normal accounts are not demo", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Real", email: "real@example.com", password: "long enough" })
      .expect(201);
    expect(res.body.isDemo).toBe(false);
  });
});
