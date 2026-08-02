const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.TEST_BASE_URL || "https://the-quad-ek8.vercel.app";
const API = `${BASE_URL}/api`;

const ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || "winnie.tam@eduk8u.com",
  password: process.env.TEST_ADMIN_PASS || "ChangeMe123!",
};
const MEMBER = {
  email: process.env.TEST_MEMBER_EMAIL || "nurul.rahman@demo.thequad",
  password: process.env.TEST_MEMBER_PASS || "demo123",
};

function loadTokens() {
  const file = path.join(__dirname, ".auth-tokens.json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  return null;
}

// Returns cached token from global-setup; falls back to live login if missing
async function apiLogin(request, creds = ADMIN) {
  const tokens = loadTokens();
  if (tokens) {
    const isAdmin = creds.email === ADMIN.email;
    const cached = isAdmin ? tokens.admin : tokens.member;
    if (cached?.token) return { status: 200, token: cached.token, user: cached.user };
  }
  const res = await request.post(`${API}/auth/login`, { data: creds });
  const body = await res.json();
  return { status: res.status(), token: body.token, user: body.user };
}

async function authHeaders(request, creds = ADMIN) {
  const { token } = await apiLogin(request, creds);
  return { Authorization: `Bearer ${token}` };
}

async function uiLogin(page, creds = ADMIN) {
  await page.goto("/");
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole("button", { name: /enter the quad/i }).click();
  await page.locator("nav, [class*='nav'], [class*='sidebar']").first().waitFor({ timeout: 10000 });
}

module.exports = { BASE_URL, API, ADMIN, MEMBER, apiLogin, authHeaders, uiLogin };
