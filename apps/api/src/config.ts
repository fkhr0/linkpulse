import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // comma separated
  WEB_ORIGINS: z.string().default("http://localhost:5173"),
  // empty = in-memory
  DATABASE_URL: z.string().default(""),
  PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  // empty = in-memory
  REDIS_URL: z.string().default(""),
  // built web app to serve; empty = api only
  WEB_DIR: z.string().default(""),
});

const env = schema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  webOrigins: env.WEB_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
  databaseUrl: env.DATABASE_URL,
  publicUrl: env.PUBLIC_URL.replace(/\/$/, ""),
  redisUrl: env.REDIS_URL,
  webDir: env.WEB_DIR,
};
