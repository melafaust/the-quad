const { request } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.TEST_BASE_URL || "https://the-quad-ek8.vercel.app";
const TOKEN_FILE = path.join(__dirname, ".auth-tokens.json");

module.exports = async function globalSetup() {
  const ctx = await request.newContext({ baseURL: BASE_URL });

  async function login(email, password, label) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await ctx.post("/api/auth/login", { data: { email, password } });
      if (res.status() === 200) {
        const body = await res.json();
        console.log(`  ✓ ${label} logged in`);
        return { token: body.token, user: body.user };
      }
      if (res.status() === 429) {
        console.log(`  ⏳ Rate limited for ${label}, waiting 65s (attempt ${attempt}/3)…`);
        await new Promise((r) => setTimeout(r, 65000));
      } else {
        throw new Error(`${label} login failed: ${res.status()} ${await res.text()}`);
      }
    }
    throw new Error(`${label} login failed after 3 attempts (rate limited)`);
  }

  console.log("\n[global-setup] Logging in as admin and member…");
  const admin = await login(
    process.env.TEST_ADMIN_EMAIL || "winnie.tam@eduk8u.com",
    process.env.TEST_ADMIN_PASS || "ChangeMe123!",
    "admin"
  );
  const member = await login(
    process.env.TEST_MEMBER_EMAIL || "nurul.rahman@demo.thequad",
    process.env.TEST_MEMBER_PASS || "demo123",
    "member"
  );

  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ admin, member }));
  console.log("[global-setup] Tokens saved.\n");

  await ctx.dispose();
};
