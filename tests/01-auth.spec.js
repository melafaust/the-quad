const { test, expect } = require("@playwright/test");
const { API, ADMIN, MEMBER, apiLogin } = require("./helpers");

test.describe("Authentication", () => {
  test("admin login returns token and user", async ({ request }) => {
    const { status, token, user } = await apiLogin(request, ADMIN);
    expect(status).toBe(200);
    expect(token).toBeTruthy();
    expect(user.email.toLowerCase()).toBe(ADMIN.email.toLowerCase());
    expect(user.role).toBe("admin");
  });

  test("member login returns token and user", async ({ request }) => {
    const { status, token, user } = await apiLogin(request, MEMBER);
    expect(status).toBe(200);
    expect(token).toBeTruthy();
    expect(user.role).toBe("member");
  });

  test("wrong password returns 401", async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN.email, password: "wrongpassword" },
    });
    expect(res.status()).toBe(401);
  });

  test("unknown email returns 401", async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: "nobody@example.com", password: "anything" },
    });
    expect(res.status()).toBe(401);
  });

  test("missing fields returns 400", async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("UI: login page loads and shows both tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /redeem invite/i })).toBeVisible();
  });

  test("UI: successful login navigates into the app", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.getByRole("button", { name: /enter the quad/i }).click();
    // App lands on "/" (root = Home) after login — wait for nav to appear
    await expect(page.locator("nav, [class*='nav'], [class*='sidebar']").first()).toBeVisible({ timeout: 10000 });
  });

  test("UI: wrong credentials shows error message", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill("wrongpass");
    await page.getByRole("button", { name: /enter the quad/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong|unauthorized/i)).toBeVisible();
  });

  test("invalid invite code rejected on redeem tab", async ({ request }) => {
    const res = await request.post(`${API}/auth/redeem`, {
      data: {
        code: "INVALID-CODE-XYZ",
        name: "Test User",
        email: "test.nobody@example.com",
        password: "Password123!",
      },
    });
    expect([400, 404]).toContain(res.status()); // 404 = code not found
  });
});
