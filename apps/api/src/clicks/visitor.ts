import type { Request } from "express";

export interface Visitor {
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  referrer: string | null;
  country: string | null;
}

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless/i;

export const isBot = (userAgent: string) => !userAgent || BOTS.test(userAgent);

export function visitorOf(req: Request): Visitor {
  const ua = req.get("user-agent") ?? "";
  return {
    device: /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop",
    browser: browserOf(ua),
    referrer: hostOf(req.get("referer")),
    country: countryOf(req.get("cf-ipcountry")),
  };
}

// order matters
function browserOf(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

function hostOf(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.replace(/^www\./, "").slice(0, 100) || null;
  } catch {
    return null;
  }
}

function countryOf(code: string | undefined): string | null {
  return code && /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}
