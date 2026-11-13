import { Router } from "express";
import { z } from "zod";
import { requireUser } from "../auth/routes.js";
import type { Db } from "../db/database.js";
import { HttpError, validate } from "../http/errors.js";

type Count = { label: string; clicks: number };

export function statsRoutes(db: Db) {
  const router = Router();

  const byDay = (where: string, params: unknown[], days: number) =>
    db.query<{ date: string; clicks: string }>(
      `SELECT d::date::text AS date, count(c.id) AS clicks
       FROM generate_series(current_date - ($${params.length + 1}::int - 1), current_date, interval '1 day') d
       LEFT JOIN clicks c ON c.clicked_at >= d AND c.clicked_at < d + interval '1 day' AND ${where}
       GROUP BY d ORDER BY d`,
      [...params, days],
    );

  const top = (column: string, linkId: string, days: number, fallback: string) =>
    db.query<{ label: string; clicks: string }>(
      `SELECT COALESCE(${column}, $3) AS label, count(*) AS clicks FROM clicks
       WHERE link_id = $1 AND clicked_at >= current_date - ($2::int - 1)
       GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 6`,
      [linkId, days, fallback],
    );

  const counts = (rows: { label: string; clicks: string }[]): Count[] =>
    rows.map((r) => ({ label: r.label, clicks: Number(r.clicks) }));

  // GET /stats/links/:id?days=30 -> { total, inPeriod, byDay, referrers, devices, browsers, countries }
  router.get("/links/:id", async (req, res) => {
    const userId = await requireUser(db, req);
    const id = validate(z.uuid("not a valid id"), req.params.id);
    const { days } = validate(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }), req.query);
    const link = await db.one<{ clicks: string }>("SELECT clicks FROM links WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);
    if (!link) throw new HttpError(404, "Link not found.");

    const [daily, referrers, devices, browsers, countries] = await Promise.all([
      byDay("c.link_id = $1", [id], days),
      top("referrer", id, days, "Direct"),
      top("device", id, days, "Unknown"),
      top("browser", id, days, "Unknown"),
      top("country", id, days, "Unknown"),
    ]);
    const series = daily.map((d) => ({ date: d.date, clicks: Number(d.clicks) }));
    res.json({
      total: Number(link.clicks),
      inPeriod: series.reduce((sum, d) => sum + d.clicks, 0),
      byDay: series,
      referrers: counts(referrers),
      devices: counts(devices),
      browsers: counts(browsers),
      countries: counts(countries),
    });
  });

  // GET /stats/overview -> { links, clicks, last7Days, topLinks }
  router.get("/overview", async (req, res) => {
    const userId = await requireUser(db, req);
    const ownLinks = "c.link_id IN (SELECT id FROM links WHERE user_id = $1)";
    const [totals, daily, topLinks] = await Promise.all([
      db.one<{ links: string; clicks: string | null }>(
        "SELECT count(*) AS links, sum(clicks) AS clicks FROM links WHERE user_id = $1",
        [userId],
      ),
      byDay(ownLinks, [userId], 7),
      db.query<{ id: string; code: string; title: string; url: string; clicks: string }>(
        `SELECT l.id, l.code, l.title, l.url, count(c.id) AS clicks
         FROM links l JOIN clicks c ON c.link_id = l.id AND c.clicked_at >= current_date - 29
         WHERE l.user_id = $1 GROUP BY l.id ORDER BY clicks DESC, l.created_at DESC LIMIT 5`,
        [userId],
      ),
    ]);
    res.json({
      links: Number(totals?.links ?? 0),
      clicks: Number(totals?.clicks ?? 0),
      last7Days: daily.map((d) => ({ date: d.date, clicks: Number(d.clicks) })),
      topLinks: topLinks.map((l) => ({ ...l, clicks: Number(l.clicks) })),
    });
  });

  return router;
}
