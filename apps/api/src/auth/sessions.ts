import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { config } from "../config.js";
import type { Db } from "../db/database.js";

export const COOKIE = "lp_session";
const LIFETIME_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function startSession(db: Db, res: Response, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + LIFETIME_DAYS * 86_400_000);
  await db.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    hash(token),
    userId,
    expires,
  ]);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    expires,
    path: "/",
  });
}

export async function userIdOf(db: Db, req: Request): Promise<string | undefined> {
  const token: unknown = req.cookies?.[COOKIE];
  if (typeof token !== "string" || token.length > 100) return undefined;
  const row = await db.one<{ user_id: string }>(
    "SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()",
    [hash(token)],
  );
  return row?.user_id;
}

export async function endSession(db: Db, req: Request, res: Response): Promise<void> {
  const token: unknown = req.cookies?.[COOKIE];
  if (typeof token === "string") {
    await db.query("DELETE FROM sessions WHERE token_hash = $1", [hash(token)]);
  }
  res.clearCookie(COOKIE, { path: "/" });
}
