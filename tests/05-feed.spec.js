const { test, expect } = require("@playwright/test");
const { API, ADMIN, MEMBER, authHeaders } = require("./helpers");

test.describe("Feed", () => {
  test("API: GET /feed returns posts", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/feed`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("API: POST /posts creates a post", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    // Post field is "body" not "content"
    const res = await request.post(`${API}/posts`, {
      headers,
      data: { body: "Automated regression test post — please ignore" },
    });
    expect(res.status()).toBe(200);
    const post = await res.json();
    expect(post.id).toBeTruthy();

    // Cleanup
    await request.delete(`${API}/posts/${post.id}`, { headers });
  });

  test("API: POST /posts/:id/like toggles like", async ({ request }) => {
    const adminHeaders = await authHeaders(request, ADMIN);
    const memberHeaders = await authHeaders(request, MEMBER);

    const create = await request.post(`${API}/posts`, {
      headers: adminHeaders,
      data: { body: "Like test post" },
    });
    const post = await create.json();

    const like = await request.post(`${API}/posts/${post.id}/like`, { headers: memberHeaders });
    expect(like.status()).toBe(200);

    // Cleanup
    await request.delete(`${API}/posts/${post.id}`, { headers: adminHeaders });
  });

  test("API: GET /posts/:id/comments returns array", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const feed = await request.get(`${API}/feed`, { headers });
    const posts = await feed.json();
    if (posts.length === 0) return;

    const res = await request.get(`${API}/posts/${posts[0].id}/comments`, { headers });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("API: empty content post rejected", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.post(`${API}/posts`, {
      headers,
      data: { body: "" },
    });
    expect(res.status()).toBe(400);
  });
});
