const { test, expect } = require("@playwright/test");
const { API, ADMIN, MEMBER, authHeaders } = require("./helpers");

test.describe("Events", () => {
  test("API: GET /events returns list", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/events`, { headers });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("API: admin can create and delete event", async ({ request }) => {
    const headers = await authHeaders(request, ADMIN);
    const create = await request.post(`${API}/events`, {
      headers,
      data: {
        title: "Regression Test Event",
        description: "Automated test",
        event_date: new Date(Date.now() + 86400000).toISOString(),
        location: "Online",
      },
    });
    expect([200, 201]).toContain(create.status());
    const event = await create.json();
    expect(event.id).toBeTruthy();

    const del = await request.delete(`${API}/events/${event.id}`, { headers });
    expect(del.status()).toBe(200);
  });

  test("API: member cannot create event", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.post(`${API}/events`, {
      headers,
      data: {
        title: "Unauthorized Event",
        description: "Should fail",
        date: new Date().toISOString(),
        location: "Nowhere",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("API: RSVP to event", async ({ request }) => {
    const adminHeaders = await authHeaders(request, ADMIN);
    const memberHeaders = await authHeaders(request, MEMBER);

    const create = await request.post(`${API}/events`, {
      headers: adminHeaders,
      data: {
        title: "RSVP Test Event",
        description: "Test",
        event_date: new Date(Date.now() + 86400000).toISOString(),
        location: "Online",
      },
    });
    const event = await create.json();

    const rsvp = await request.post(`${API}/events/${event.id}/rsvp`, { headers: memberHeaders });
    expect([200, 201]).toContain(rsvp.status());

    // Cleanup
    await request.delete(`${API}/events/${event.id}`, { headers: adminHeaders });
  });
});
