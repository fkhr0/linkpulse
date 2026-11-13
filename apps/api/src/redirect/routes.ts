import { Router, type Response } from "express";
import type { Cache } from "../cache.js";
import type { ClickRecorder } from "../clicks/recorder.js";
import { isBot, visitorOf } from "../clicks/visitor.js";
import type { Db } from "../db/database.js";

interface Target {
  id: string;
  url: string;
  disabled: boolean;
  expiresAt: string | null;
}

const CACHE_SECONDS = 300;
const MISSING = "-";
const MISSING_SECONDS = 60;

export const cacheKey = (code: string) => `link:${code}`;

export function redirectRoutes(db: Db, cache: Cache, clicks: ClickRecorder) {
  const router = Router();

  async function targetOf(code: string): Promise<Target | null> {
    const cached = await cache.get(cacheKey(code)).catch(() => null);
    if (cached === MISSING) return null;
    if (cached) return JSON.parse(cached) as Target;

    const row = await db.one<{ id: string; url: string; disabled: boolean; expires_at: Date | null }>(
      "SELECT id, url, disabled, expires_at FROM links WHERE code = $1",
      [code],
    );
    const target = row
      ? { id: row.id, url: row.url, disabled: row.disabled, expiresAt: row.expires_at?.toISOString() ?? null }
      : null;
    await cache
      .set(cacheKey(code), target ? JSON.stringify(target) : MISSING, target ? CACHE_SECONDS : MISSING_SECONDS)
      .catch(() => {});
    return target;
  }

  router.get("/:code", async (req, res, next) => {
    const { code } = req.params;
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(code)) return next();

    const target = await targetOf(code);
    if (!target || target.disabled) return notFound(res, 404, "This link doesn't exist or was turned off.");
    if (target.expiresAt && new Date(target.expiresAt) <= new Date()) {
      return notFound(res, 410, "This link has expired.");
    }

    // 302 so it can change and every click is counted
    res.set("Cache-Control", "private, max-age=0");
    res.set("Referrer-Policy", "no-referrer-when-downgrade");
    res.redirect(302, target.url);

    if (!isBot(req.get("user-agent") ?? "")) {
      clicks.record({ linkId: target.id, at: new Date(), ...visitorOf(req) });
    }
  });

  return router;
}

function notFound(res: Response, status: number, message: string) {
  res
    .status(status)
    .type("html")
    .send(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">` +
        `<title>LinkPulse</title>` +
        `<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;color:#334155">` +
        `<div style="text-align:center"><h1 style="color:#0f172a">Link not available</h1><p>${message}</p></div>`,
    );
}
