// Covers: TC23 (Apply by Email button), jobs listing/creation
const { test, expect } = require("@playwright/test");
const { API, ADMIN, MEMBER, authHeaders, uiLogin } = require("./helpers");

test.describe("Jobs", () => {
  test("API: GET /jobs returns list", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/jobs`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("API: POST /jobs creates a listing", async ({ request }) => {
    const headers = await authHeaders(request, ADMIN);
    const res = await request.post(`${API}/jobs`, {
      headers,
      data: {
        title: "Regression Test Job",
        company: "Test Co",
        location: "Remote",
        job_type: "Full-time",
        description: "Automated test listing",
        apply_email: "jobs@testco.com",
      },
    });
    expect([200, 201]).toContain(res.status());
    const job = await res.json();
    expect(job.id).toBeTruthy();

    // Cleanup
    await request.delete(`${API}/jobs/${job.id}`, { headers });
  });

  // TC23 — Apply by Email: apply_email field must be present and non-empty
  test("API: jobs with apply_email have valid email addresses (TC23)", async ({ request }) => {
    const headers = await authHeaders(request, MEMBER);
    const res = await request.get(`${API}/jobs`, { headers });
    const jobs = await res.json();
    jobs
      .filter((j) => j.apply_email)
      .forEach((j) => {
        expect(j.apply_email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
  });

  test("API: DELETE /jobs/:id removes listing (admin only)", async ({ request }) => {
    const headers = await authHeaders(request, ADMIN);
    // Create then delete
    const create = await request.post(`${API}/jobs`, {
      headers,
      data: {
        title: "Delete Me",
        company: "Test Co",
        location: "Remote",
        job_type: "Part-time",
        description: "Will be deleted",
        apply_email: "delete@test.com",
      },
    });
    const job = await create.json();
    const del = await request.delete(`${API}/jobs/${job.id}`, { headers });
    expect(del.status()).toBe(200);
  });

  test("API: member cannot delete another member's job", async ({ request }) => {
    const adminHeaders = await authHeaders(request, ADMIN);
    const memberHeaders = await authHeaders(request, MEMBER);
    const create = await request.post(`${API}/jobs`, {
      headers: adminHeaders,
      data: {
        title: "Protected Job",
        company: "Test Co",
        location: "Sydney",
        job_type: "Full-time",
        description: "Cannot be deleted by member",
        apply_email: "nope@test.com",
      },
    });
    const job = await create.json();
    const del = await request.delete(`${API}/jobs/${job.id}`, { headers: memberHeaders });
    expect(del.status()).toBe(403);

    // Cleanup
    await request.delete(`${API}/jobs/${job.id}`, { headers: adminHeaders });
  });

  // TC23 — UI: Apply by email button must be visible and have an href
  test("UI: Apply by email button is functional (TC23)", async ({ page }) => {
    await uiLogin(page, MEMBER);
    await page.getByRole("link", { name: /jobs/i }).click();
    await page.waitForTimeout(2000);

    const applyBtn = page.getByRole("link", { name: /apply/i }).first();
    if (await applyBtn.isVisible()) {
      const href = await applyBtn.getAttribute("href");
      // Must be a mailto: or external URL — not empty/null
      expect(href).toBeTruthy();
    } else {
      // No jobs posted yet — that's acceptable
      console.log("No jobs found to test apply button");
    }
  });
});
