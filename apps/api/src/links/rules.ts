import { randomInt } from "node:crypto";
import { z } from "zod";
import { config } from "../config.js";

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes
export const CODE_LENGTH = 7;

export function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

const RESERVED = new Set([
  "api", "auth", "app", "admin", "assets", "dashboard", "health", "links",
  "login", "logout", "signup", "settings", "static", "stats", "www",
]);

export const alias = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{3,40}$/, "3 to 40 letters, digits, - or _")
  .refine((a) => !RESERVED.has(a.toLowerCase()), "this name is reserved");

export const targetUrl = z
  .string()
  .trim()
  .max(2048, "the address is too long")
  .superRefine((value, ctx) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      url = new URL("invalid:");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      ctx.addIssue({ code: "custom", message: "use a full address starting with http:// or https://" });
    } else if (url.origin === new URL(config.publicUrl).origin) {
      ctx.addIssue({ code: "custom", message: "that is already a short link" });
    }
  });
