import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { testApp } from "./helpers.js";

let app: Awaited<ReturnType<typeof testApp>>["app"];
beforeAll(async () => {
  ({ app } = await testApp());
});

describe("health", () => {
  it("answers ok", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("unknown paths are a JSON 404", async () => {
    const res = await request(app).get("/nope").expect(404);
    expect(res.body.error).toBe("Not found.");
  });

  it("sends security headers", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
