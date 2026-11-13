import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { ClickRecorder } from "../src/clicks/recorder.js";
import type { Db } from "../src/db/database.js";
import { CHROME_ANDROID, FIREFOX_DESKTOP, signedUp, testApp } from "./helpers.js";

let app: Awaited<ReturnType<typeof testApp>>["app"];
let db: Db;
let clicks: ClickRecorder;
let sara: Awaited<ReturnType<typeof signedUp>>;
beforeAll(async () => {
  ({ app, db, clicks } = await testApp());
  sara = await signedUp(app);
});

const visit = (code: string, ua = CHROME_ANDROID) => request(app).get(`/${code}`).set("User-Agent", ua);

describe("redirects", () => {
  it("a short code sends you to the long address (302)", async () => {
    await sara.post("/links").send({ url: "https://example.com/very/long", alias: "go-here" }).expect(201);
    const res = await visit("go-here").expect(302);
    expect(res.headers.location).toBe("https://example.com/very/long");
    expect(res.headers["cache-control"]).toBe("private, max-age=0");
  });

  it("unknown codes are a 404 page", async () => {
    const res = await visit("nothing-here").expect(404);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("a turned-off link stops at once (no stale cache)", async () => {
    const { body: link } = await sara.post("/links").send({ url: "https://a.example", alias: "switch" }).expect(201);
    await visit("switch").expect(302); // now cached
    await sara.patch(`/links/${link.id}`).send({ disabled: true }).expect(200);
    await visit("switch").expect(404);
    await sara.patch(`/links/${link.id}`).send({ disabled: false, url: "https://b.example" }).expect(200);
    expect((await visit("switch").expect(302)).headers.location).toBe("https://b.example");
  });

  it("a deleted link stops at once", async () => {
    const { body: link } = await sara.post("/links").send({ url: "https://gone.example", alias: "gone" }).expect(201);
    await visit("gone").expect(302);
    await sara.delete(`/links/${link.id}`).expect(204);
    await visit("gone").expect(404);
  });

  it("an expired link is 410 Gone", async () => {
    const { body: link } = await sara
      .post("/links")
      .send({ url: "https://soon.example", alias: "soon", expiresAt: new Date(Date.now() + 60_000).toISOString() })
      .expect(201);
    await db.query("UPDATE links SET expires_at = now() - interval '1 minute' WHERE id = $1", [link.id]);
    await visit("soon").expect(410);
  });
});

describe("clicks", () => {
  it("are counted after the redirect, in one write", async () => {
    const { body: link } = await sara.post("/links").send({ url: "https://count.example", alias: "count" }).expect(201);
    await visit("count").set("Referer", "https://www.linkedin.com/feed/").expect(302);
    await visit("count", FIREFOX_DESKTOP).expect(302);
    await visit("count", FIREFOX_DESKTOP).expect(302);

    // Nothing written yet: the redirect didn't wait for the database.
    expect((await sara.get(`/links/${link.id}`)).body.clicks).toBe(0);
    await clicks.flush();
    expect((await sara.get(`/links/${link.id}`)).body.clicks).toBe(3);

    const rows = await db.query<Record<string, string | null>>(
      "SELECT device, browser, referrer FROM clicks WHERE link_id = $1",
      [link.id],
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        { device: "mobile", browser: "Chrome", referrer: "linkedin.com" },
        { device: "desktop", browser: "Firefox", referrer: null },
      ]),
    );
  });

  it("bots and link previews are not counted", async () => {
    const { body: link } = await sara.post("/links").send({ url: "https://bots.example", alias: "bots" }).expect(201);
    await visit("bots", "WhatsApp/2.23").expect(302);
    await visit("bots", "Googlebot/2.1").expect(302);
    await visit("bots", "").expect(302);
    await clicks.flush();
    expect((await sara.get(`/links/${link.id}`)).body.clicks).toBe(0);
  });

  it("no IP address is stored", async () => {
    const columns = await db.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'clicks'",
    );
    expect(columns.map((c) => c.column_name)).not.toContain("ip");
  });
});

describe("stats", () => {
  it("one link: totals, every day, sources and devices", async () => {
    const { body: link } = await sara.post("/links").send({ url: "https://stats.example", alias: "stats-me" }).expect(201);
    await visit("stats-me").set("Referer", "https://t.co/x").expect(302);
    await visit("stats-me").set("Referer", "https://t.co/y").expect(302);
    await visit("stats-me", FIREFOX_DESKTOP).expect(302);
    await clicks.flush();

    const { body } = await sara.get(`/stats/links/${link.id}`).query({ days: 7 }).expect(200);
    expect(body.total).toBe(3);
    expect(body.inPeriod).toBe(3);
    expect(body.byDay).toHaveLength(7);
    expect(body.byDay.at(-1).clicks).toBe(3);
    expect(body.referrers).toEqual([
      { label: "t.co", clicks: 2 },
      { label: "Direct", clicks: 1 },
    ]);
    expect(body.devices).toEqual([
      { label: "mobile", clicks: 2 },
      { label: "desktop", clicks: 1 },
    ]);
  });

  it("only your own links", async () => {
    const { body: link } = await sara.post("/links").send({ url: "https://mine.example" }).expect(201);
    const omar = await signedUp(app, "omar@example.com");
    await omar.get(`/stats/links/${link.id}`).expect(404);
    await request(app).get("/stats/overview").expect(401);
  });

  it("overview for the dashboard", async () => {
    const { body } = await sara.get("/stats/overview").expect(200);
    expect(body.links).toBeGreaterThan(5);
    // go-here 1, switch 2, count 3, stats-me 3 (bots not counted).
    expect(body.clicks).toBe(9);
    expect(body.last7Days).toHaveLength(7);
    // Two links with 3 clicks each lead; the newer one first.
    expect(body.topLinks.slice(0, 2).map((l: { code: string; clicks: number }) => [l.code, l.clicks])).toEqual([
      ["stats-me", 3],
      ["count", 3],
    ]);
  });
});
