// Short links of the signed-in user: list, create, read, change, delete.
// Every query includes user_id, so nobody can see or touch another
// person's links by guessing an id.
import { Router } from "express";
import { z } from "zod";
import { requireUser } from "../auth/routes.js";
import type { Cache } from "../cache.js";
import { config } from "../config.js";
import type { Db } from "../db/database.js";
import { HttpError, validate } from "../http/errors.js";
import { cacheKey } from "../redirect/routes.js";
import { alias, randomCode, targetUrl } from "./rules.js";

interface LinkRow {
  id: string;
  code: string;
  url: string;
  title: string;
  disabled: boolean;
  expires_at: Date | null;
  clicks: string; // BIGINT comes back as text
  created_at: Date;
}

const COLUMNS = "id, code, url, title, disabled, expires_at, clicks, created_at";

const toJson = (row: LinkRow) => ({
  id: row.id,
  code: row.code,
  shortUrl: `${config.publicUrl}/${row.code}`,
  url: row.url,
  title: row.title,
  disabled: row.disabled,
  expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  clicks: Number(row.clicks),
  createdAt: new Date(row.created_at).toISOString(),
});

const uuid = z.uuid("not a valid id");
const expiresAt = z.iso.datetime({ offset: true }).nullable();
const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === "23505";

export function linkRoutes(db: Db, cache: Cache) {
  const router = Router();

  async function findOr404(userId: string, id: string) {
    const row = await db.one<LinkRow>(`SELECT ${COLUMNS} FROM links WHERE id = $1 AND user_id = $2`, [
      validate(uuid, id),
      userId,
    ]);
    if (!row) throw new HttpError(404, "Link not found.");
    return row;
  }

  // GET /links?search=&page=1&pageSize=20 -> { items, total, page, pageSize }
  router.get("/", async (req, res) => {
    const userId = await requireUser(db, req);
    const q = validate(
      z.object({
        search: z.string().trim().max(100).default(""),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
      }),
      req.query,
    );
    // The search is a parameter, never pasted into the SQL.
    const filter = "user_id = $1 AND ($2 = '' OR code ILIKE $3 OR url ILIKE $3 OR title ILIKE $3)";
    const like = `%${q.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const [items, count] = await Promise.all([
      db.query<LinkRow>(
        `SELECT ${COLUMNS} FROM links WHERE ${filter} ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
        [userId, q.search, like, q.pageSize, (q.page - 1) * q.pageSize],
      ),
      db.one<{ n: string }>(`SELECT count(*) AS n FROM links WHERE ${filter}`, [userId, q.search, like]),
    ]);
    res.json({ items: items.map(toJson), total: Number(count?.n ?? 0), page: q.page, pageSize: q.pageSize });
  });

  // POST /links { url, alias?, title?, expiresAt? } -> 201 link
  router.post("/", async (req, res) => {
    const userId = await requireUser(db, req);
    const body = validate(
      z.object({
        url: targetUrl,
        alias: alias.optional(),
        title: z.string().trim().max(120).default(""),
        expiresAt: expiresAt.optional(),
      }),
      req.body,
    );
    if (body.expiresAt && new Date(body.expiresAt) <= new Date()) {
      throw new HttpError(400, "expiresAt: must be in the future");
    }

    // A chosen alias must be free; a random code is retried on the rare clash.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = body.alias ?? randomCode();
      try {
        const row = await db.one<LinkRow>(
          `INSERT INTO links (user_id, code, url, title, expires_at) VALUES ($1, $2, $3, $4, $5)
           RETURNING ${COLUMNS}`,
          [userId, code, body.url, body.title, body.expiresAt ?? null],
        );
        res.status(201).json(toJson(row!));
        return;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        if (body.alias) throw new HttpError(409, "This short name is taken.");
      }
    }
    throw new HttpError(503, "Could not make a short code, try again.");
  });

  // GET /links/:id -> link
  router.get("/:id", async (req, res) => {
    const userId = await requireUser(db, req);
    res.json(toJson(await findOr404(userId, req.params.id)));
  });

  // PATCH /links/:id { url?, title?, disabled?, expiresAt? } -> link
  router.patch("/:id", async (req, res) => {
    const userId = await requireUser(db, req);
    const link = await findOr404(userId, req.params.id);
    const body = validate(
      z
        .object({
          url: targetUrl.optional(),
          title: z.string().trim().max(120).optional(),
          disabled: z.boolean().optional(),
          expiresAt: expiresAt.optional(),
        })
        .strict(),
      req.body,
    );
    const row = await db.one<LinkRow>(
      `UPDATE links SET url = $3, title = $4, disabled = $5, expires_at = $6, updated_at = now()
       WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
      [
        link.id,
        userId,
        body.url ?? link.url,
        body.title ?? link.title,
        body.disabled ?? link.disabled,
        body.expiresAt === undefined ? link.expires_at : body.expiresAt,
      ],
    );
    // The next click must see the change, not a cached copy.
    await cache.del(cacheKey(link.code)).catch(() => {});
    res.json(toJson(row!));
  });

  // DELETE /links/:id -> 204
  router.delete("/:id", async (req, res) => {
    const userId = await requireUser(db, req);
    const link = await findOr404(userId, req.params.id);
    await db.query("DELETE FROM links WHERE id = $1 AND user_id = $2", [link.id, userId]);
    await cache.del(cacheKey(link.code)).catch(() => {});
    res.status(204).end();
  });

  return router;
}
