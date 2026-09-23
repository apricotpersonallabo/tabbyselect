const { test, expect, chromium } = require("@playwright/test");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test.describe.configure({ mode: "serial" });

const extensionPath = process.env.TABBYSELECT_EXTENSION_PATH
  ? path.resolve(process.env.TABBYSELECT_EXTENSION_PATH)
  : path.resolve(__dirname, "../../src");
const docsPath = path.resolve(__dirname, "../../docs");
const expectedCopyright =
  "Copyright (c) 2026 apricot.personal.labo. All rights reserved.";
let context;
let worker;
let extensionId;
let server;
let port;
let userDataDir;

function pageMarkup() {
  const options = Array.from(
    { length: 60 },
    (_, index) => `<option>Option ${String(index + 1).padStart(2, "0")}</option>`
  ).join("");

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>TabbySelect E2E</title>
        <style>
          tabby-select-root *, tabby-select-root li {
            color: rgb(255, 0, 0) !important;
            font-size: 40px !important;
          }
        </style>
      </head>
      <body>
        <select id="positiveSelect" tabindex="1">
          <option>Initial</option><option>Target</option>
        </select>
        <button id="positiveTarget" tabindex="2">Positive target</button>
        <button id="before">Before</button>
        <select id="many" style="position:fixed;right:2px;bottom:2px;width:260px">${options}</select>
        <select id="second"><option>Second A</option><option>Second B</option></select>
        <button id="after">After</button>
        <select id="skipSelect"><option>Initial</option><option>Target</option></select>
        <fieldset disabled><button id="fieldsetDisabled">Disabled</button></fieldset>
        <div inert><button id="inertButton">Inert</button></div>
        <button id="skipTarget">Skip target</button>
        <select id="optionStates">
          <option value=""></option>
          <option disabled>Disabled option</option>
          <optgroup label="Disabled group" disabled>
            <option>Disabled group option</option>
          </optgroup>
          <option selected>Enabled option</option>
        </select>
        <button id="optionStatesAfter">After option states</button>
        <select id="radioSelect"><option>Initial</option><option>Target</option></select>
        <input id="radioFirst" type="radio" name="choice" />
        <input id="radioChecked" type="radio" name="choice" checked />
        <input id="radioThird" type="radio" name="choice" />
        <button id="radioAfter">After radio group</button>
        <script>
          window.eventCounts = { input: 0, change: 0 };
          window.optionStateEvents = { input: 0, change: 0 };
          const select = document.getElementById("many");
          select.addEventListener("input", () => window.eventCounts.input += 1);
          select.addEventListener("change", () => window.eventCounts.change += 1);
          const optionStates = document.getElementById("optionStates");
          optionStates.addEventListener("input", () => window.optionStateEvents.input += 1);
          optionStates.addEventListener("change", () => window.optionStateEvents.change += 1);
        </script>
      </body>
    </html>`;
}

async function setSettings(settings) {
  await worker.evaluate((value) => chrome.storage.local.set(value), settings);
}

async function waitForSuggestion(page) {
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-tabby-select-host]");
    const root = host && host.shadowRoot.querySelector(".root");
    return root && !root.hidden;
  });
}

test.beforeAll(async () => {
  server = http.createServer((request, response) => {
    const supportFiles = {
      "/support/index.html": ["index.html", "text/html; charset=utf-8"],
      "/support/manual.html": ["manual.html", "text/html; charset=utf-8"],
      "/support/privacy.html": ["privacy.html", "text/html; charset=utf-8"],
      "/support/styles.css": ["styles.css", "text/css; charset=utf-8"],
      "/support/site.js": ["site.js", "text/javascript; charset=utf-8"],
      "/support/assets/icon-128.png": ["assets/icon-128.png", "image/png"]
    };
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const supportFile = supportFiles[pathname];
    if (supportFile) {
      response.writeHead(200, { "content-type": supportFile[1] });
      response.end(fs.readFileSync(path.join(docsPath, supportFile[0])));
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(pageMarkup());
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tabby-select-e2e-"));

  context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    locale: "fr-FR",
    viewport: { width: 800, height: 600 },
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
  worker = workers.find((candidate) => candidate.url().endsWith("/background.js"));
  if (!worker) {
    throw new Error("TabbySelect service worker did not load");
  }
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  if (context) {
    await context.close();
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (userDataDir) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});

test("loads all extension contexts and controls the feature lifecycle", async () => {
  const allowedPattern = `http://127.0.0.1:${port}/allowed/*`;
  await setSettings({
    debugLogEnabled: false,
    urlAllowPatterns: allowedPattern,
    manualEnabledOverride: true
  });
  expect(worker.url()).toBe(`chrome-extension://${extensionId}/background.js`);

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/blocked/start`);
  await page.locator("#before").click();
  await page.locator("#many").focus();
  await page.waitForTimeout(100);
  await expect(page.locator("[data-tabby-select-host]")).toHaveCount(0);

  await page.evaluate(() => history.pushState({}, "", "/allowed/start"));
  await page.locator("#before").focus();
  await page.waitForTimeout(100);
  await page.locator("#many").focus();
  await waitForSuggestion(page);

  const initialUi = await page.evaluate(() => {
    const host = document.querySelector("[data-tabby-select-host]");
    const shadow = host.shadowRoot;
    const root = shadow.querySelector(".root");
    const list = shadow.querySelector(".list");
    const rect = root.getBoundingClientRect();
    const selectRect = document.getElementById("many").getBoundingClientRect();
    return {
      hostCount: document.querySelectorAll("[data-tabby-select-host]").length,
      copyright: shadow.querySelector(".copyright").textContent,
      itemCount: list.children.length,
      scrollable: list.scrollHeight > list.clientHeight,
      color: getComputedStyle(root).color,
      fontSize: getComputedStyle(root).fontSize,
      rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom },
      selectTop: selectRect.top
    };
  });
  expect(initialUi).toMatchObject({
    hostCount: 1,
    copyright: expectedCopyright,
    itemCount: 60,
    scrollable: true,
    color: "rgb(31, 41, 55)",
    fontSize: "12px"
  });
  expect(initialUi.rect.top).toBeGreaterThanOrEqual(0);
  expect(initialUi.rect.left).toBeGreaterThanOrEqual(0);
  expect(initialUi.rect.right).toBeLessThanOrEqual(800);
  expect(initialUi.rect.bottom).toBeLessThanOrEqual(600);
  expect(initialUi.rect.top).toBeLessThan(initialUi.selectTop);

  await page.locator("#second").focus();
  await waitForSuggestion(page);
  await expect(page.locator("[data-tabby-select-host]")).toHaveCount(1);
  await page.locator("#second").evaluate((select) => {
    select.appendChild(new Option("Second C"));
  });
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-tabby-select-host]");
    return host.shadowRoot.querySelectorAll(".item").length === 3;
  });
  await page.locator("#second").evaluate((select) => select.remove());
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-tabby-select-host]");
    return host && host.shadowRoot.querySelector(".root").hidden;
  });

  await setSettings({ manualEnabledOverride: false });
  await expect(page.locator("[data-tabby-select-host]")).toHaveCount(0);
  await page.locator("#many").evaluate((select) => select.appendChild(new Option("Late")));
  await page.waitForTimeout(100);
  await expect(page.locator("[data-tabby-select-host]")).toHaveCount(0);

  await setSettings({ manualEnabledOverride: true });
  await page.locator("#before").focus();
  await page.waitForTimeout(100);
  await page.locator("#many").focus();
  await waitForSuggestion(page);
  await page.evaluate(() => history.pushState({}, "", "/blocked/end"));
  await expect(page.locator("[data-tabby-select-host]")).toHaveCount(0);
  await page.close();
});

test("runs the installed extension in the support site playground", async () => {
  await setSettings({
    urlAllowPatterns: "",
    manualEnabledOverride: true
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/support/manual.html`);

  await page.getByRole("button", { name: "Start practice" }).focus();
  await page.keyboard.press("Tab");
  await waitForSuggestion(page);
  await page.keyboard.type("Jap");
  await page.keyboard.press("Enter");

  await expect(page.locator("#country")).toHaveValue("Japan");
  await expect(page.locator("#department")).toBeFocused();
  await expect(page.locator("[data-selection-status]")).toContainText(
    "Country or region: Japan"
  );
  await expect(page.locator("[data-event-log]")).toContainText("input");
  await expect(page.locator("[data-event-log]")).toContainText("change");
  await page.close();
});

test("publishes the privacy policy in Japanese and English", async () => {
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/support/privacy.html`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy Policy");
  await expect(page.getByRole("heading", { name: "Information processed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Collection, transmission, and sharing" })).toBeVisible();
  await page.getByRole("button", { name: "Switch to Japanese" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("プライバシーポリシー");
  await expect(page.locator('a[href="mailto:apricot.personal.labo@gmail.com"]')).toBeVisible();
  await page.close();
});

test("preserves keyboard selection and light-DOM focus behavior", async () => {
  await setSettings({
    urlAllowPatterns: `http://127.0.0.1:${port}/allowed/*`,
    manualEnabledOverride: true
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/keyboard`);
  await page.locator("#before").click();
  await page.locator("#many").focus();
  await waitForSuggestion(page);

  await page.keyboard.type("zzz");
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector("[data-tabby-select-host]")
          .shadowRoot.querySelector(".item.empty").textContent
    )
  ).toBe("No matching options");
  await page.keyboard.press("Escape");

  const selectedBefore = await page.locator("#many").evaluate((select) => select.selectedIndex);
  await page.keyboard.type("Option 5");
  await page.keyboard.press("ArrowDown");
  const pending = await page.evaluate(() => {
    const shadow = document.querySelector("[data-tabby-select-host]").shadowRoot;
    const list = shadow.querySelector(".list");
    const item = shadow.querySelector(".pending");
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    return {
      selectedIndex: document.getElementById("many").selectedIndex,
      visible: itemRect.top >= listRect.top && itemRect.bottom <= listRect.bottom
    };
  });
  expect(pending).toEqual({ selectedIndex: selectedBefore, visible: true });

  await page.keyboard.press("Enter");
  await expect(page.locator("#second")).toBeFocused();
  expect(await page.evaluate(() => window.eventCounts)).toEqual({ input: 1, change: 1 });

  await page.locator("#many").focus();
  await page.keyboard.type("Option 2");
  await page.keyboard.press("Backspace");
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector("[data-tabby-select-host]")
          .shadowRoot.querySelector(".query span").textContent
    )
  ).toBe("Option ");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector("[data-tabby-select-host]")
          .shadowRoot.querySelectorAll(".item").length
    )
  ).toBe(60);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-tabby-select-host]")
      .shadowRoot.querySelector(".root").hidden
  );

  await page.locator("#many").focus();
  await page.keyboard.type("Option 1");
  await page.keyboard.press("Tab");
  await expect(page.locator("#second")).toBeFocused();
  expect(await page.evaluate(() => window.eventCounts)).toEqual({ input: 2, change: 2 });

  await page.locator("#positiveSelect").focus();
  await page.keyboard.type("Target");
  await page.keyboard.press("Enter");
  await expect(page.locator("#positiveTarget")).toBeFocused();

  await page.locator("#skipSelect").focus();
  await page.keyboard.type("Target");
  await page.keyboard.press("Enter");
  await expect(page.locator("#skipTarget")).toBeFocused();

  await page.locator("#radioSelect").focus();
  await page.keyboard.type("Target");
  await page.keyboard.press("Enter");
  await expect(page.locator("#radioChecked")).toBeFocused();
  await page.close();
});

test("handles empty and disabled options without bypassing native constraints", async () => {
  await setSettings({
    urlAllowPatterns: `http://127.0.0.1:${port}/allowed/*`,
    manualEnabledOverride: true
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/options`);
  await page.locator("#before").click();
  await page.locator("#optionStates").focus();
  await waitForSuggestion(page);

  expect(
    await page.evaluate(() => {
      const items = document
        .querySelector("[data-tabby-select-host]")
        .shadowRoot.querySelectorAll(".item");
      return Array.from(items, (item) => item.textContent);
    })
  ).toEqual(["(Empty)", "Enabled option"]);

  await page.keyboard.type("Disabled");
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector("[data-tabby-select-host]")
          .shadowRoot.querySelector(".item.empty").textContent
    )
  ).toBe("No matching options");
  await page.keyboard.press("Escape");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#optionStatesAfter")).toBeFocused();
  expect(await page.locator("#optionStates").evaluate((select) => select.selectedIndex)).toBe(0);
  expect(await page.evaluate(() => window.optionStateEvents)).toEqual({ input: 1, change: 1 });

  await page.locator("#optionStates").focus();
  await page.keyboard.type("Enabled");
  await page.locator("#optionStates").evaluate((select) => {
    select.options[3].disabled = true;
    select.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
  });
  await expect(page.locator("#optionStates")).toBeFocused();
  expect(await page.locator("#optionStates").evaluate((select) => select.selectedIndex)).toBe(0);
  expect(await page.evaluate(() => window.optionStateEvents)).toEqual({ input: 1, change: 1 });
  await page.close();
});

test("renders the popup and URL settings", async () => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator("#iconToggleEnabled")).toBeDisabled();
  expect(await popup.evaluate(() => navigator.language)).toBe("fr-FR");
  await expect(popup.locator("html")).toHaveAttribute("lang", "en");
  await expect(popup.locator("#openOptions")).toHaveText("Open settings");
  expect(
    await popup.evaluate(() => {
      const body = getComputedStyle(document.body);
      const switchControl = getComputedStyle(document.querySelector(".switch"));
      const button = document.querySelector("#openOptions").getBoundingClientRect();

      return {
        bodyWidth: body.width,
        bodyMargin: body.margin,
        bodyColor: body.color,
        switchWidth: switchControl.width,
        switchHeight: switchControl.height,
        buttonWidth: button.width
      };
    })
  ).toEqual({
    bodyWidth: "200px",
    bodyMargin: "10px",
    bodyColor: "rgb(31, 41, 51)",
    switchWidth: "38px",
    switchHeight: "22px",
    buttonWidth: 200
  });

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.locator("#settings-title")).toHaveText("Settings");
  await expect(options.locator("#urlAllowPatterns")).toHaveValue(
    `http://127.0.0.1:${port}/allowed/*`
  );
  await popup.close();
  await options.close();
});
