// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const BASE_URL = process.env.TEST_BASE_URL || "https://the-quad-ek8.vercel.app";

module.exports = defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.js",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["html", { outputFolder: "tests/report", open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
