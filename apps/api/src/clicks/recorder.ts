// Clicks are counted after the redirect, not during it: they wait in memory
// and are written together every few seconds, one INSERT for many clicks.
// A redirect never waits for the database. On shutdown the rest is written.
import type { Db } from "../db/database.js";
import type { Visitor } from "./visitor.js";

export interface Click extends Visitor {
  linkId: string;
  at: Date;
}

export interface ClickRecorder {
  record(click: Click): void;
  /** Writes what is waiting now (tests, shutdown). */
  flush(): Promise<void>;
  stop(): Promise<void>;
}

const MAX_WAITING = 10_000;

export function clickRecorder(db: Db, { every = 2000, batch = 500 } = {}): ClickRecorder {
  let waiting: Click[] = [];
  let writing: Promise<void> = Promise.resolve();

  async function write(clicks: Click[]) {
    // One row of parameters per click: $1..$6, $7..$12, ...
    const values = clicks.map((_, i) => `($${i * 6 + 1}::uuid, $${i * 6 + 2}::timestamptz, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`);
    const params = clicks.flatMap((c) => [c.linkId, c.at, c.device, c.browser, c.referrer, c.country]);
    // The click rows and the links' running totals, in one statement. A link
    // deleted meanwhile simply drops its clicks (the join finds nothing).
    await db.query(
      `WITH new (link_id, clicked_at, device, browser, referrer, country) AS (VALUES ${values.join(", ")}),
       kept AS (
         INSERT INTO clicks (link_id, clicked_at, device, browser, referrer, country)
         SELECT n.* FROM new n JOIN links l ON l.id = n.link_id
         RETURNING link_id
       )
       UPDATE links SET clicks = links.clicks + t.n
       FROM (SELECT link_id, count(*) AS n FROM kept GROUP BY link_id) t
       WHERE links.id = t.link_id`,
      params,
    );
  }

  function flush(): Promise<void> {
    writing = writing.then(async () => {
      while (waiting.length) {
        const next = waiting.slice(0, batch);
        waiting = waiting.slice(batch);
        try {
          await write(next);
        } catch (err) {
          console.error("Clicks not saved:", err);
        }
      }
    });
    return writing;
  }

  const timer = setInterval(flush, every);
  timer.unref();

  return {
    record(click) {
      // Under a flood, keep the server alive rather than every click.
      if (waiting.length < MAX_WAITING) waiting.push(click);
    },
    flush,
    async stop() {
      clearInterval(timer);
      await flush();
    },
  };
}
