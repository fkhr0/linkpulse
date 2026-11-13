import { randomBytes } from "node:crypto";
import type { Db } from "../db/database.js";
import { randomCode } from "../links/rules.js";

const LINKS = [
  { title: "Portfolio", url: "https://github.com/fkhr0", weight: 1 },
  { title: "Spring sale", url: "https://shop.example.com/sale?utm_source=linkpulse", weight: 0.8 },
  { title: "Conference talk", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", weight: 0.55 },
  { title: "Product docs", url: "https://docs.example.com/getting-started", weight: 0.35 },
  { title: "Event sign-up", url: "https://forms.example.com/meetup-december", weight: 0.2 },
  { title: "Old campaign", url: "https://example.com/campaign-2025", weight: 0.05 },
];

// [value, share]
const REFERRERS: [string | null, number][] = [
  ["linkedin.com", 0.32], [null, 0.24], ["t.co", 0.16], ["github.com", 0.12], ["google.com", 0.1], ["instagram.com", 0.06],
];
const DEVICES: [string, number][] = [["mobile", 0.58], ["desktop", 0.36], ["tablet", 0.06]];
const BROWSERS: [string, number][] = [["Chrome", 0.55], ["Safari", 0.25], ["Edge", 0.08], ["Firefox", 0.07], ["Samsung Internet", 0.05]];
const COUNTRIES: [string | null, number][] = [
  ["IQ", 0.34], ["AE", 0.16], ["DE", 0.12], ["US", 0.12], ["GB", 0.08], ["TR", 0.08], [null, 0.1],
];

function pick<T>(options: [T, number][]): T {
  let r = Math.random();
  for (const [value, share] of options) {
    r -= share;
    if (r <= 0) return value;
  }
  return options[0]![0];
}

// fresh demo account with 30 days of clicks
export async function createDemoUser(db: Db) {
  const user = await db.one<{ id: string; email: string; name: string }>(
    `INSERT INTO users (email, name, password_hash, is_demo) VALUES ($1, 'Demo user', 'none', true)
     RETURNING id, email, name`,
    [`demo-${randomBytes(6).toString("hex")}@demo.linkpulse`],
  );

  const now = Date.now();
  const clicks: { linkId: string; at: Date; device: string; browser: string; referrer: string | null; country: string | null }[] = [];
  for (const [i, spec] of LINKS.entries()) {
    const link = await db.one<{ id: string }>(
      `INSERT INTO links (user_id, code, url, title, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user!.id, randomCode(), spec.url, spec.title, new Date(now - (35 + i) * 86_400_000)],
    );
    for (let day = 29; day >= 0; day--) {
      const date = new Date(now - day * 86_400_000);
      const weekend = date.getUTCDay() === 5 || date.getUTCDay() === 6;
      // a rising trend with some noise
      const expected = spec.weight * (14 + (29 - day) * 0.6) * (weekend ? 0.6 : 1);
      const count = Math.max(0, Math.round(expected * (0.6 + Math.random() * 0.8)));
      for (let n = 0; n < count; n++) {
        const at = new Date(date);
        at.setUTCHours(6 + Math.floor(Math.random() * 16), Math.floor(Math.random() * 60));
        if (at.getTime() > now) at.setTime(now - Math.floor(Math.random() * 3_600_000));
        clicks.push({
          linkId: link!.id,
          at,
          device: pick(DEVICES),
          browser: pick(BROWSERS),
          referrer: pick(REFERRERS),
          country: pick(COUNTRIES),
        });
      }
    }
  }

  await db.query(
    `INSERT INTO clicks (link_id, clicked_at, device, browser, referrer, country)
     SELECT * FROM unnest($1::uuid[], $2::timestamptz[], $3::text[], $4::text[], $5::text[], $6::text[])`,
    [
      clicks.map((c) => c.linkId),
      clicks.map((c) => c.at.toISOString()),
      clicks.map((c) => c.device),
      clicks.map((c) => c.browser),
      clicks.map((c) => c.referrer),
      clicks.map((c) => c.country),
    ],
  );
  await db.query(
    `UPDATE links SET clicks = (SELECT count(*) FROM clicks WHERE link_id = links.id) WHERE user_id = $1`,
    [user!.id],
  );
  return user!;
}


export async function deleteOldDemoUsers(db: Db): Promise<number> {
  const rows = await db.query(
    "DELETE FROM users WHERE is_demo AND created_at < now() - interval '24 hours' RETURNING id",
  );
  return rows.length;
}
