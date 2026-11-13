import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("health", () => {
  it("answers ok", async () => {
    const res = await request(createApp()).get("/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("unknown paths are a JSON 404", async () => {
    const res = await request(createApp()).get("/nope").expect(404);
    expect(res.body.error).toBe("Not found.");
  });
});
