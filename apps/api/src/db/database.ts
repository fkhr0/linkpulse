// One small interface over Postgres: the real server (pg) in production, or
// PGlite (Postgres compiled to WebAssembly, in memory) for tests and for
// running without Docker. Same SQL on both.
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  /** Several statements as one script, no parameters (migrations). */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export function connectPostgres(url: string): Db {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  return wrap(
    async (sql, params) => (await pool.query(sql, params)).rows,
    async (sql) => void (await pool.query(sql)),
    () => pool.end(),
  );
}

export function connectMemory(): Db {
  const db = new PGlite();
  return wrap(
    async (sql, params) => (await db.query(sql, params)).rows,
    async (sql) => void (await db.exec(sql)),
    () => db.close(),
  );
}

function wrap(
  run: (sql: string, params?: unknown[]) => Promise<unknown[]>,
  exec: (sql: string) => Promise<void>,
  close: () => Promise<void>,
): Db {
  return {
    exec,
    query: async <T>(sql: string, params?: unknown[]) => (await run(sql, params)) as T[],
    one: async <T>(sql: string, params?: unknown[]) => ((await run(sql, params)) as T[])[0],
    close,
  };
}
