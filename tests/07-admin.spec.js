const { test, expect } = require("@playwright/test");
const { API, ADMIN, MEMBER, authHeaders } = require("./helpers");

test.describe("Admin", () => {
  test("API: GET /admin/stats returns counts (admin only)", async ({ request }) => {
    const headers = await authHeaders(request, ADMIN);
    const res = await request.get(`${API}/admin/stats`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("members");
    expect(body).toHaveProperty("invites_pending");
  });

  test("API: member cannot access admin stats", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/admin/stats`, { headers });
    expect(res.status()).toBe(403);
  });

  test("API: GET /admin/invites returns invite list", async ({ request }) => {
    const headers = await authHeaders(request, ADMIN);
    const res = await request.get(`${API}/admin/invites`, { headers });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("API: POST /admin/invites creates invite code", async ({ request }) => {
    const headers = await authHeaders(request, ADMIN);
    const code = `TEST-${Date.now()}`;
    const res = await request.post(`${API}/admin/invites`, {
      headers,
      data: { name: "Test User", email: `invitetest-${Date.now()}@example.com`, brand: "EDUK8U", programme: "Alumni" },
    });
    expect([200, 201]).toContain(res.status());
    const invite = await res.json();
    expect(invite.code).toBeTruthy();

    // Cleanup: find by code then delete
    const list = await request.get(`${API}/admin/invites`, { headers });
    const invites = await list.json();
    const created = invites.find((i) => i.code === invite.code);
    if (created?.id) await request.delete(`${API}/admin/invites/${created.id}`, { headers });
  });

  test("API: GET /admin/members returns full member list", async ({ request }) => {
    const headers = await authHeaders(request, ADMIN);
    const res = await request.get(`${API}/admin/members`, { headers });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("API: member cannot access admin members list", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/admin/members`, { headers });
    expect(res.status()).toBe(403);
  });
});
