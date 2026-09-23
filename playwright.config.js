const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    viewport: { width: 800, height: 600 },
    trace: "retain-on-failure"
  }
});
