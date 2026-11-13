import { Router, type Request } from "express";
import { z } from "zod";
import type { Db } from "../db/database.js";
import { HttpError, validate } from "../http/errors.js";
import { dummyHash, hashPassword, verifyPassword } from "./password.js";
import { endSession, startSession, userIdOf } from "./sessions.js";

export interface User {
  id: string;
  email: string;
  name: string;
}

const email = z.string().trim().toLowerCase().pipe(z.email("not a valid email")).pipe(z.string().max(254));
const password = z.string().min(8, "use at least 8 characters").max(200);

/** The signed-in user's id, or 401. */
export async function requireUser(db: Db, req: Request): Promise<string> {
  const id = await userIdOf(db, req);
  if (!id) throw new HttpError(401, "Sign in first.");
  return id;
}

export function authRoutes(db: Db) {
  const router = Router();

  // POST /auth/signup { name, email, password } -> 201 user (signed in)
  router.post("/signup", async (req, res) => {
    const body = validate(
      z.object({ name: z.string().trim().min(1, "required").max(80), email, password }),
      req.body,
    );
    const user = await db.one<User>(
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name`,
      [body.email, body.name, await hashPassword(body.password)],
    );
    if (!user) throw new HttpError(409, "An account with this email exists already.");
    await startSession(db, res, user.id);
    res.status(201).json(user);
  });

  // POST /auth/login { email, password } -> user (signed in)
  router.post("/login", async (req, res) => {
    const body = validate(z.object({ email, password: z.string().max(200) }), req.body);
    const row = await db.one<User & { password_hash: string }>(
      "SELECT id, email, name, password_hash FROM users WHERE email = $1",
      [body.email],
    );
    const ok = await verifyPassword(body.password, row?.password_hash ?? dummyHash);
    if (!row || !ok) throw new HttpError(401, "Wrong email or password.");
    await startSession(db, res, row.id);
    res.json({ id: row.id, email: row.email, name: row.name } satisfies User);
  });

  // POST /auth/logout -> 204
  router.post("/logout", async (req, res) => {
    await endSession(db, req, res);
    res.status(204).end();
  });

  // GET /auth/me -> user, or 401
  router.get("/me", async (req, res) => {
    const id = await requireUser(db, req);
    const user = await db.one<User>("SELECT id, email, name FROM users WHERE id = $1", [id]);
    if (!user) throw new HttpError(401, "Sign in first.");
    res.json(user);
  });

  return router;
}
