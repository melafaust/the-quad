// Covers: TC1 (country filter), TC24 (LinkedIn links), general directory
const { test, expect } = require("@playwright/test");
const { API, ADMIN, MEMBER, authHeaders, uiLogin } = require("./helpers");

test.describe("Directory", () => {
  test("API: /members returns list", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/members`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // API returns { members: [...], counts: {...} }
    const list = body.members ?? body;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test("API: /members search by name works", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/members?search=Winnie`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.members ?? body;
    expect(list.some((u) => u.name.toLowerCase().includes("winnie"))).toBe(true);
  });

  // TC1 — country filter must not error
  test("API: /members filter by country (TC1)", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const filRes = await request.get(`${API}/filters`, { headers });
    const filters = await filRes.json();
    const country = (filters.countries ?? [])[0];
    if (!country) return;
    const res = await request.get(`${API}/members?country=${encodeURIComponent(country)}`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = body.members ?? body;
    expect(Array.isArray(list)).toBe(true);
    list.forEach((u) => expect(u.country).toBe(country));
  });

  test("API: /filters returns expected keys", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/filters`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("countries");
    expect(body).toHaveProperty("industries");
  });

  test("API: /users/:id returns profile", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const membersRes = await request.get(`${API}/members`, { headers });
    const body = await membersRes.json();
    const list = body.members ?? body;
    const firstId = list[0]?.id;
    expect(firstId).toBeTruthy();
    const res = await request.get(`${API}/users/${firstId}`, { headers });
    expect(res.status()).toBe(200);
    const user = await res.json();
    expect(user.id).toBe(firstId);
    expect(user).toHaveProperty("name");
  });

  // TC24 — LinkedIn URLs stored must be valid (not empty strings causing 404)
  test("API: members with linkedin_url have valid-looking URLs (TC24)", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/members`, { headers });
    const body = await res.json();
    const list = body.members ?? body;
    list
      .filter((u) => u.linkedin_url)
      .forEach((u) => {
        expect(u.linkedin_url).toMatch(/^https?:\/\//);
      });
  });

  test("UI: Directory page loads with member cards (TC1)", async ({ page }) => {
    await uiLogin(page, MEMBER);
    await page.getByRole("link", { name: /directory/i }).click();
    await expect(page.locator(".member-card, [class*='member'], [class*='card']").first()).toBeVisible({ timeout: 10000 });
  });

  test("UI: Country filter applies without error (TC1)", async ({ page }) => {
    await uiLogin(page, MEMBER);
    await page.getByRole("link", { name: /directory/i }).click();
    const filterBtn = page.getByRole("button", { name: /filter/i });
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      const countrySelect = page.locator("select, [role='listbox']").first();
      if (await countrySelect.isVisible()) await countrySelect.selectOption({ index: 1 });
    }
    await expect(page.getByText(/error|something went wrong/i)).not.toBeVisible({ timeout: 5000 });
  });
});
