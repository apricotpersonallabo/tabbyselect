import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = path.join(projectRoot, "src");
const docsPath = path.join(projectRoot, "docs");
const outputPath = path.join(projectRoot, "store-listing", "screenshots", "01-search.png");
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"]
]);

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://127.0.0.1").pathname;
      const relativePath = pathname === "/" ? "manual.html" : pathname.slice(1);
      const absolutePath = path.resolve(docsPath, relativePath);
      if (!absolutePath.startsWith(`${docsPath}${path.sep}`)) {
        response.writeHead(404).end();
        return;
      }
      const body = await readFile(absolutePath);
      response.writeHead(200, {
        "content-type": contentTypes.get(path.extname(absolutePath)) || "application/octet-stream"
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  const port = await listen(server);
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "tabbyselect-store-"));
  let context;
  try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      headless: true,
      locale: "en-US",
      viewport: { width: 1280, height: 800 },
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    let workers = context.serviceWorkers();
    if (!workers.length) {
      await context.waitForEvent("serviceworker");
      workers = context.serviceWorkers();
    }
    const worker = workers.find((candidate) => candidate.url().endsWith("/background.js"));
    if (!worker) throw new Error("TabbySelect service worker did not load.");
    await worker.evaluate(() => chrome.storage.local.set({
      urlAllowPatterns: "",
      manualEnabledOverride: true,
      debugLogEnabled: false
    }));

    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("tabby-select-support-language", "en"));
    await page.goto(`http://127.0.0.1:${port}/manual.html`);
    await page.locator(".playground-card").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Start practice" }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.type("Jap");
    await page.waitForFunction(() => {
      const host = document.querySelector("[data-tabby-select-host]");
      const root = host?.shadowRoot?.querySelector(".root");
      return root && !root.hidden && root.querySelectorAll(".item").length > 0;
    });
    await page.screenshot({ path: outputPath, type: "png" });
    process.stdout.write(`${outputPath}\n`);
  } finally {
    await context?.close();
    await close(server);
    await rm(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
