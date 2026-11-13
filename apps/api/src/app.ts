import cookieParser from "cookie-parser";
import cors from "cors";
import { existsSync } from "node:fs";
import path from "node:path";
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
  // behind nginx
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:"],
        },
      },
    }),
  );
  app.use(cors({ origin: config.webOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "16kb" }));

  // csrf: only our own origin may write
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

  const signInLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: config.env === "test" ? 1000 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many tries. Wait a few minutes." },
  });
  app.use(["/api/auth/login", "/api/auth/signup", "/api/auth/demo"], signInLimit);

  const api = express.Router();
  api.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  api.use("/auth", authRoutes(db));
  api.use("/links", linkRoutes(db, cache));
  api.use("/stats", statsRoutes(db));
  api.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });
  app.use("/api", api);

  if (config.webDir && existsSync(config.webDir)) {
    const webDir = path.resolve(config.webDir);
    const index = path.join(webDir, "index.html");
    // hashed file names, safe to cache for a year
    app.use("/assets", express.static(path.join(webDir, "assets"), { immutable: true, maxAge: "1y" }));
    app.get(["/", "/login", "/signup", "/links", "/links/:id"], (_req, res) => {
      res.set("Cache-Control", "no-cache").sendFile(index);
    });
  }

  // must be last
  app.use(redirectRoutes(db, cache, clicks));

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });
  app.use(errorHandler);

  return app;
}
