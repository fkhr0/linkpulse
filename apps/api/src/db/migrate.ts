import type { Db } from "./database.js";

const migrations: [name: string, sql: string][] = [
  [
    "001_accounts_and_links",
    `
    CREATE TABLE users (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email          TEXT NOT NULL UNIQUE,
      name           TEXT NOT NULL,
      password_hash  TEXT NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE sessions (
      token_hash  TEXT PRIMARY KEY,
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX sessions_user ON sessions (user_id);

    CREATE TABLE links (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code        TEXT NOT NULL UNIQUE,
      url         TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT '',
      disabled    BOOLEAN NOT NULL DEFAULT false,
      expires_at  TIMESTAMPTZ,
      clicks      BIGINT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX links_user_created ON links (user_id, created_at DESC);
    `,
  ],
  [
    "002_clicks",
    `
    CREATE TABLE clicks (
      id          BIGSERIAL PRIMARY KEY,
      link_id     UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      clicked_at  TIMESTAMPTZ NOT NULL,
      device      TEXT NOT NULL,
      browser     TEXT NOT NULL,
      referrer    TEXT,
      country     TEXT
    );
    CREATE INDEX clicks_link_time ON clicks (link_id, clicked_at);
    `,
  ],
];

export async function migrate(db: Db): Promise<string[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS migrations (
    name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const done = new Set((await db.query<{ name: string }>("SELECT name FROM migrations")).map((r) => r.name));

  const applied: string[] = [];
  for (const [name, sql] of migrations) {
    if (done.has(name)) continue;
    // one script = one connection
    await db.exec(`BEGIN;
${sql}
INSERT INTO migrations (name) VALUES ('${name}');
COMMIT;`);
    applied.push(name);
  }
  return applied;
}
