// The HTTP app, without listening: the tests use it directly.
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { authRoutes } from "./auth/routes.js";
import type { Cache } from "./cache.js";
import type { ClickRecorder } from "./clicks/recorder.js";
import { config } from "./config.js";
import type { Db } from "./db/database.js";
import { HttpError, errorHandler } from "./http/errors.js";
import { linkRoutes } from "./links/routes.js";
import { redirectRoutes } from "./redirect/routes.js";
import { statsRoutes } from "./stats/routes.js";

export function createApp({ db, cache, clicks }: { db: Db; cache: Cache; clicks: ClickRecorder }) {
  const app = express();
  app.disable("x-powered-by");
  // Behind Nginx: the real visitor's address for limits and logs.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: config.webOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "16kb" }));

  // Changes only from our web app: a form on another site can't post here
  // with the visitor's cookie (with SameSite=Lax, this is a second lock).
  app.use((req, _res, next) => {
    const origin = req.get("origin");
    const safe = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
    if (!safe && origin && !config.webOrigins.includes(origin)) {
      throw new HttpError(403, "Not allowed from this site.");
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Guessing passwords: 10 tries per 15 minutes per address.
  const signInLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: config.env === "test" ? 1000 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many tries. Wait a few minutes." },
  });
  app.use(["/auth/login", "/auth/signup"], signInLimit);

  app.use("/auth", authRoutes(db));
  app.use("/links", linkRoutes(db, cache));
  app.use("/stats", statsRoutes(db));
  // Last: any other one-segment path is a short code.
  app.use(redirectRoutes(db, cache, clicks));

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });
  app.use(errorHandler);

  return app;
}
