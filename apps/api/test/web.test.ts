import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/config.js";
import { signedUp, testApp } from "./helpers.js";

let app: Awaited<ReturnType<typeof testApp>>["app"];
beforeAll(async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "lp-web-"));
  mkdirSync(path.join(dir, "assets"));
  writeFileSync(path.join(dir, "index.html"), "<!doctype html><div id=root></div>");
  writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log(1)");
  config.webDir = dir;
  ({ app } = await testApp());
  config.webDir = "";
});

describe("one address for app, api and short links", () => {
  it("app pages get index.html", async () => {
    for (const page of ["/", "/login", "/links", "/links/123"]) {
      const res = await request(app).get(page).expect(200);
      expect(res.text).toContain('id=root');
      expect(res.headers["cache-control"]).toBe("no-cache");
    }
  });

  it("assets are cached for a year", async () => {
    const res = await request(app).get("/assets/app-abc123.js").expect(200);
    expect(res.headers["cache-control"]).toMatch(/max-age=31536000, immutable/);
  });

  it("api under /api, short links at the root", async () => {
    await request(app).get("/api/health").expect(200);
    await request(app).get("/api/nope").expect(404);
    const sara = await signedUp(app);
    await sara.post("/api/links").send({ url: "https://example.com", alias: "root-link" }).expect(201);
    const res = await request(app).get("/root-link").set("User-Agent", "Mozilla/5.0").expect(302);
    expect(res.headers.location).toBe("https://example.com");
  });

  it("the page may load Google Fonts and nothing else from outside", async () => {
    const csp = (await request(app).get("/")).headers["content-security-policy"];
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(csp).toContain("script-src 'self'");
  });
});
