const { test, expect } = require("@playwright/test");
const { API, ADMIN, MEMBER, authHeaders, apiLogin } = require("./helpers");

test.describe("Messages", () => {
  test("API: GET /messages returns conversations list", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/messages`, { headers });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("API: GET /messages/unread-count returns number", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/messages/unread-count`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.unread).toBe("number");
  });

  test("API: send and receive message between two users", async ({ request }) => {
    const adminData = await apiLogin(request, ADMIN);
    const memberData = await apiLogin(request, MEMBER);
    const adminHeaders = { Authorization: `Bearer ${adminData.token}` };
    const memberHeaders = { Authorization: `Bearer ${memberData.token}` };

    // Member sends message to admin
    const send = await request.post(`${API}/messages/${adminData.user.id}`, {
      headers: memberHeaders,
      data: { body: "Regression test message — please ignore" },
    });
    expect([200, 201]).toContain(send.status());

    // Admin reads thread from member
    const thread = await request.get(`${API}/messages/${memberData.user.id}`, { headers: adminHeaders });
    expect(thread.status()).toBe(200);
    const msgs = await thread.json();
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.some((m) => m.body === "Regression test message — please ignore")).toBe(true);
  });
});
