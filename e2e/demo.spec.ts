import { expect, test } from "@playwright/test";

test("demo: dashboard, new link, a click is counted", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/Demo account with sample data/)).toBeVisible();

  await page.getByRole("link", { name: "Links", exact: true }).click();
  const alias = `e2e-${Date.now()}`;
  await page.getByLabel("Long address").fill("https://example.com/from-e2e");
  await page.getByRole("button", { name: "+ Custom name and title" }).click();
  await page.getByLabel("Custom name (optional)").fill(alias);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.getByRole("status")).toContainText(`/${alias}`);

  const visit = await request.get(`/${alias}`, {
    maxRedirects: 0,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0" },
  });
  expect(visit.status()).toBe(302);
  expect(visit.headers()["location"]).toBe("https://example.com/from-e2e");

  await page.getByRole("link", { name: `Edit http://localhost:4100/${alias}` }).click();
  const total = page.getByText("Clicks, all time").locator("..");
  // clicks are written every 2 s
  await expect(async () => {
    await page.reload();
    await expect(total).toContainText("1", { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
});

test("unknown short links get a not-found page", async ({ page }) => {
  const res = await page.goto("/no-such-link");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Link not available" })).toBeVisible();
});
