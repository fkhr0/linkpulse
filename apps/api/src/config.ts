// Settings from the environment, checked once at start.
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // Where the web app runs (CORS). Several: comma separated.
  WEB_ORIGINS: z.string().default("http://localhost:5173"),
  // Postgres. Empty: an in-memory database (development and tests).
  DATABASE_URL: z.string().default(""),
  // The address short links start with, e.g. https://lp.example.com
  PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  // Redis for the redirect cache. Empty: a cache in this process.
  REDIS_URL: z.string().default(""),
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
};
