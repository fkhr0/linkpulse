import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { signedUp, testApp } from "./helpers.js";

type Agent = Awaited<ReturnType<typeof signedUp>>;
let app: Awaited<ReturnType<typeof testApp>>["app"];
let sara: Agent;
let omar: Agent;
beforeAll(async () => {
  ({ app } = await testApp());
  sara = await signedUp(app, "sara@example.com");
  omar = await signedUp(app, "omar@example.com");
});

describe("links", () => {
  it("need a signed-in user", async () => {
    await request(app).get("/links").expect(401);
    await request(app).post("/links").send({ url: "https://example.com" }).expect(401);
  });

  it("a new link gets a random 7-character code", async () => {
    const res = await sara.post("/links").send({ url: "https://example.com/a/long/path?x=1" }).expect(201);
    expect(res.body.code).toMatch(/^[A-Za-z2-9]{7}$/);
    expect(res.body.shortUrl).toBe(`http://localhost:4000/${res.body.code}`);
    expect(res.body).toMatchObject({ url: "https://example.com/a/long/path?x=1", clicks: 0, disabled: false });
  });

  it("a chosen alias, once", async () => {
    await sara.post("/links").send({ url: "https://github.com/fkhr0", alias: "my-github" }).expect(201);
    const taken = await omar.post("/links").send({ url: "https://example.com", alias: "my-github" }).expect(409);
    expect(taken.body.error).toMatch(/taken/);
  });

  it("refuses bad addresses and names", async () => {
    for (const url of ["example.com", "javascript:alert(1)", "ftp://x.org", "http://localhost:4000/abc"]) {
      await sara.post("/links").send({ url }).expect(400);
    }
    for (const alias of ["ab", "has space", "login", "ADMIN", "x".repeat(41)]) {
      await sara.post("/links").send({ url: "https://example.com", alias }).expect(400);
    }
    await sara.post("/links").send({ url: "https://example.com", expiresAt: "2001-01-01T00:00:00Z" }).expect(400);
  });

  it("lists your own links, newest first, with search", async () => {
    await sara.post("/links").send({ url: "https://react.dev", title: "React docs" }).expect(201);
    const all = await sara.get("/links").expect(200);
    expect(all.body.total).toBe(3);
    expect(all.body.items[0].title).toBe("React docs");

    const found = await sara.get("/links").query({ search: "react" }).expect(200);
    expect(found.body.items.map((l: { url: string }) => l.url)).toEqual(["https://react.dev"]);

    // % and _ are literal
    const percent = await sara.get("/links").query({ search: "%" }).expect(200);
    expect(percent.body.total).toBe(0);

    const omars = await omar.get("/links").expect(200);
    expect(omars.body.total).toBe(0);
  });

  it("pages", async () => {
    const page = await sara.get("/links").query({ pageSize: 2, page: 2 }).expect(200);
    expect(page.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(page.body.items).toHaveLength(1);
    await sara.get("/links").query({ pageSize: 500 }).expect(400);
  });

  it("change and delete your own link", async () => {
    const { body: link } = await sara.post("/links").send({ url: "https://old.example" }).expect(201);
    const changed = await sara
      .patch(`/links/${link.id}`)
      .send({ url: "https://new.example", title: "New", disabled: true })
      .expect(200);
    expect(changed.body).toMatchObject({ url: "https://new.example", title: "New", disabled: true, code: link.code });

    await sara.patch(`/links/${link.id}`).send({ code: "hacked" }).expect(400);
    await sara.delete(`/links/${link.id}`).expect(204);
    await sara.get(`/links/${link.id}`).expect(404);
  });

  it("another user's link is not found (no peeking by id)", async () => {
    const { body: link } = await sara.post("/links").send({ url: "https://private.example" }).expect(201);
    await omar.get(`/links/${link.id}`).expect(404);
    await omar.patch(`/links/${link.id}`).send({ title: "mine now" }).expect(404);
    await omar.delete(`/links/${link.id}`).expect(404);
    await sara.get(`/links/${link.id}`).expect(200);
  });

  it("a malformed id is a 400, not a server error", async () => {
    await sara.get("/links/not-a-uuid").expect(400);
  });
});
