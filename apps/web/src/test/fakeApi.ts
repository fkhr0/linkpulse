import { vi } from "vitest";
import type { Link, User } from "../api/types";

export function fakeApi({ signedIn = true } = {}) {
  let user: User | null = signedIn ? { id: "u1", email: "sara@example.com", name: "Sara", isDemo: false } : null;
  const links: Link[] = [];
  const calls: { method: string; path: string; body?: unknown }[] = [];

  const reply = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const path = url.pathname.replace(/^\/api/, "");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });

    if (path === "/auth/me") return user ? reply(200, user) : reply(401, { error: "Sign in first." });
    if (path === "/auth/login") {
      if (body.password !== "correct horse") return reply(401, { error: "Wrong email or password." });
      user = { id: "u1", email: body.email, name: "Sara", isDemo: false };
      return reply(200, user);
    }
    if (path === "/auth/demo") {
      user = { id: "d1", email: "demo-1@demo.linkpulse", name: "Demo user", isDemo: true };
      return reply(201, user);
    }
    if (path === "/stats/overview") {
      const days = ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"];
      return reply(200, {
        links: links.length,
        clicks: links.reduce((sum, l) => sum + l.clicks, 0),
        last7Days: days.map((date, i) => ({ date, clicks: i * 3 })),
        topLinks: links.slice(0, 5).map(({ id, code, title, url, clicks }) => ({ id, code, title, url, clicks })),
      });
    }
    const stats = path.match(/^\/stats\/links\/([^/]+)$/);
    if (stats) {
      const days = Number(url.searchParams.get("days") ?? 30);
      return reply(200, {
        total: 42,
        inPeriod: days === 7 ? 12 : 30,
        byDay: Array.from({ length: days }, (_, i) => ({ date: `2026-10-${String((i % 28) + 1).padStart(2, "0")}`, clicks: i % 5 })),
        referrers: [{ label: "linkedin.com", clicks: 20 }, { label: "Direct", clicks: 10 }],
        devices: [{ label: "mobile", clicks: 25 }, { label: "desktop", clicks: 5 }],
        browsers: [{ label: "Chrome", clicks: 30 }],
        countries: [{ label: "IQ", clicks: 18 }, { label: "Unknown", clicks: 12 }],
      });
    }
    if (path === "/auth/logout") {
      user = null;
      return reply(204);
    }
    if (path === "/links" && method === "GET") {
      const search = url.searchParams.get("search") ?? "";
      const found = links.filter((l) => !search || l.url.includes(search) || l.title.includes(search));
      return reply(200, { items: found, total: found.length, page: 1, pageSize: 10 });
    }
    if (path === "/links" && method === "POST") {
      if (!/^https?:\/\//.test(body.url)) {
        return reply(400, { error: "url: use a full address starting with http:// or https://" });
      }
      const code = body.alias ?? `c${links.length + 1}aaaaa`;
      const link: Link = {
        id: `id-${code}`,
        code,
        shortUrl: `https://lp.test/${code}`,
        url: body.url,
        title: body.title ?? "",
        disabled: false,
        expiresAt: null,
        clicks: 0,
        createdAt: new Date().toISOString(),
      };
      links.unshift(link);
      return reply(201, link);
    }
    const one = path.match(/^\/links\/([^/]+)$/);
    if (one) {
      const index = links.findIndex((l) => l.id === one[1]);
      if (index < 0) return reply(404, { error: "Link not found." });
      if (method === "DELETE") {
        links.splice(index, 1);
        return reply(204);
      }
      if (method === "PATCH") links[index] = { ...links[index]!, ...body };
      return reply(200, links[index]);
    }
    return reply(404, { error: "Not found." });
  });

  vi.stubGlobal("fetch", fetchMock);
  return { calls, links };
}
