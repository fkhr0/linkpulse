import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/database.js";
import { signedUp, testApp } from "./helpers.js";

let app: Awaited<ReturnType<typeof testApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await testApp());
});

describe("accounts", () => {
  it("sign up signs you in with an HttpOnly cookie", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Ali", email: "  Ali@Example.com ", password: "long enough" })
      .expect(201);
    expect(res.body).toMatchObject({ name: "Ali", email: "ali@example.com" });
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/lp_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it("the same email twice is refused", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ name: "Ali", email: "ali@example.com", password: "long enough" })
      .expect(409);
  });

  it("checks the input", async () => {
    const short = await request(app)
      .post("/auth/signup")
      .send({ name: "X", email: "x@example.com", password: "short" })
      .expect(400);
    expect(short.body.error).toMatch(/password/);
    await request(app).post("/auth/signup").send({ name: "X", email: "nope", password: "long enough" }).expect(400);
  });

  it("passwords are stored hashed, never as text", async () => {
    const row = await db.one<{ password_hash: string }>("SELECT password_hash FROM users WHERE email = $1", [
      "ali@example.com",
    ]);
    expect(row?.password_hash).toMatch(/^scrypt\$/);
    expect(row?.password_hash).not.toContain("long enough");
  });

  it("sign in, me, sign out", async () => {
    const agent = request.agent(app);
    await agent.get("/auth/me").expect(401);
    await agent.post("/auth/login").send({ email: "ali@example.com", password: "wrong one!" }).expect(401);
    await agent.post("/auth/login").send({ email: "ALI@example.com", password: "long enough" }).expect(200);
    const me = await agent.get("/auth/me").expect(200);
    expect(me.body.email).toBe("ali@example.com");

    await agent.post("/auth/logout").expect(204);
    await agent.get("/auth/me").expect(401);
  });

  it("a wrong email and a wrong password give the same answer", async () => {
    const unknown = await request(app).post("/auth/login").send({ email: "who@example.com", password: "x" });
    const wrong = await request(app).post("/auth/login").send({ email: "ali@example.com", password: "x" });
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("only the hash of the session token is stored", async () => {
    const agent = await signedUp(app, "token@example.com");
    const me = await agent.get("/auth/me").expect(200);
    const rows = await db.query<{ token_hash: string }>("SELECT token_hash FROM sessions WHERE user_id = $1", [
      me.body.id,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes from another website are refused", async () => {
    await request(app)
      .post("/auth/signup")
      .set("Origin", "https://evil.example")
      .send({ name: "E", email: "e@example.com", password: "long enough" })
      .expect(403);
  });
});
