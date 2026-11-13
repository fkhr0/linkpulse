// What a click says about the visitor, without storing who they are: no IP
// address, only the device type, browser, the site they came from, and the
// country when a CDN (Cloudflare) tells us.
import type { Request } from "express";

export interface Visitor {
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  referrer: string | null;
  country: string | null;
}

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless/i;

/** Link previews and crawlers open links too: those aren't people clicking. */
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

// Order matters: Edge and Opera also say "Chrome", Chrome also says "Safari".
function browserOf(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

/** Only the site, never the full address (it may hold private details). */
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
