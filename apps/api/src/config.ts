// Settings from the environment, checked once at start.
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // Where the web app runs (CORS). Several: comma separated.
  WEB_ORIGINS: z.string().default("http://localhost:5173"),
});

const env = schema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  webOrigins: env.WEB_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
};
