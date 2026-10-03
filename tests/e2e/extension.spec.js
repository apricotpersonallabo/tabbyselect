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
let frameServer;
let framePort;
let userDataDir;

function frameMarkup() {
  return `<button id="frameBefore">Before</button>
    <select id="frameSelect"><option>Initial</option><option>Alpha</option><option>Target</option></select>
    <button id="frameAfter">After</button>`;
}

function framesPageMarkup() {
  const srcdoc = frameMarkup().replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<!doctype html><html><body>
    <button id="parentBefore">Parent before</button>
    <iframe name="same" src="/frames/select"></iframe>
    <iframe name="cross" src="http://127.0.0.1:${framePort}/frames/select"></iframe>
    <iframe name="nestedParent" src="/frames/nested"></iframe>
    <iframe name="blank"></iframe>
    <iframe name="srcdoc" srcdoc="${srcdoc}"></iframe>
    <button id="parentAfter">Parent after</button>
    <script>document.querySelector('[name="blank"]').contentDocument.body.innerHTML =
      ${JSON.stringify(frameMarkup())};</script>
  </body></html>`;
}

async function openFrameSuggestion(frame) {
  await frame.locator("#frameBefore").click();
  await expect.poll(async () => {
    await frame.locator("#frameBefore").focus();
    await frame.locator("#frameSelect").focus();
    await frame.locator("#frameSelect").press("Home");
    return frame.evaluate(() => {
      const host = document.querySelector("[data-tabby-select-host]");
      return Boolean(host && !host.shadowRoot.querySelector(".root").hidden);
    });
  }).toBe(true);
}

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

function searchPageMarkup() {
  return `<!doctype html><html><body>
    <button id="searchBefore">Before</button>
    <select id="searchSelect">
      <option>Initial</option><option>Japan</option><option>Panama</option>
      <option>Japanese</option><option>New Japan</option><option value=""></option>
      <option disabled>Japan disabled</option>
      <optgroup label="Disabled" disabled><option>Japan grouped</option></optgroup>
    </select>
    <button id="searchAfter">After</button>
    <script>
      window.searchEvents = { input: 0, change: 0 };
      for (const type of ['input', 'change']) {
        document.getElementById('searchSelect').addEventListener(type, () => window.searchEvents[type]++);
      }
    </script>
  </body></html>`;
}

function unicodePageMarkup() {
  return `<!doctype html><html><body>
    <button id="unicodeBefore">Before</button>
    <select id="unicodeSelect">
      <option>Initial</option><option>日本</option><option>日本語</option><option>東京日本</option>
      <option>にほん</option><option>ニホン</option><option>ＡＢＣ</option><option>ABC</option>
      <option>１２３</option><option>😀日本</option><option disabled>日本 disabled</option>
      <optgroup disabled label="Disabled"><option>日本 grouped</option></optgroup>
    </select>
    <button id="unicodeAfter">After</button>
    <script>
      window.unicodeEvents = { input: 0, change: 0 };
      for (const type of ['input', 'change']) {
        document.getElementById('unicodeSelect').addEventListener(type, () => window.unicodeEvents[type]++);
      }
    </script>
  </body></html>`;
}

async function openUnicodeSearch(page, mode = "prefix") {
  await setSettings({ searchMode: mode, urlAllowPatterns: "", manualEnabledOverride: true });
  await page.goto(`http://127.0.0.1:${port}/allowed/ime`);
  await page.locator("#unicodeBefore").click();
  await page.locator("#unicodeSelect").focus();
  await page.keyboard.press("Home");
  await expect(page.locator("[data-tabby-select-host] .query")).toBeFocused();
}

async function setSettings(settings) {
  await worker.evaluate((value) => chrome.storage.local.set(value), settings);
}

async function openFocusedSelectSearch(page) {
  await page.keyboard.press("Home");
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-tabby-select-host]");
    const root = host && host.shadowRoot.querySelector(".root");
    return root && !root.hidden;
  });
}

test.beforeAll(async () => {
  const handleRequest = (request, response) => {
    const supportFiles = {
      "/support/index.html": ["index.html", "text/html; charset=utf-8"],
      "/support/manual.html": ["manual.html", "text/html; charset=utf-8"],
      "/support/privacy.html": ["privacy.html", "text/html; charset=utf-8"],
      "/support/styles.css": ["styles.css", "text/css; charset=utf-8"],
      "/support/site.js": ["site.js", "text/javascript; charset=utf-8"],
      "/support/assets/icon-128.png": ["assets/icon-128.png", "image/png"]
    };
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    if (pathname === "/allowed/picker-csp") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": "default-src 'self'; script-src 'none'; style-src 'self'"
      });
      response.end(searchPageMarkup());
      return;
    }
    if (pathname === "/allowed/ime") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(unicodePageMarkup());
      return;
    }
    if (pathname === "/allowed/search") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(searchPageMarkup());
      return;
    }
    if (pathname.endsWith("/frames")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(framesPageMarkup());
      return;
    }
    if (pathname.startsWith("/frames/")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><html><body>${frameMarkup()}${pathname === "/frames/nested"
        ? '<iframe name="nested" src="/frames/select"></iframe>' : ""}</body></html>`);
      return;
    }
    const supportFile = supportFiles[pathname];
    if (supportFile) {
      response.writeHead(200, { "content-type": supportFile[1] });
      response.end(fs.readFileSync(path.join(docsPath, supportFile[0])));
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(pageMarkup());
  };
  frameServer = http.createServer(handleRequest);
  await new Promise((resolve) => frameServer.listen(0, "127.0.0.1", resolve));
  framePort = frameServer.address().port;
  server = http.createServer(handleRequest);
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
  if (frameServer) {
    await new Promise((resolve) => frameServer.close(resolve));
  }
  if (userDataDir) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});

test("supports keyboard selection in all frame types using the top URL", async () => {
  await setSettings({
    urlAllowPatterns: `http://127.0.0.1:${port}/allowed/*`,
    manualEnabledOverride: true
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/frames`);
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.name = "dynamic";
    frame.src = "/frames/select";
    document.body.appendChild(frame);
  });
  await expect.poll(() => page.frames().some((frame) => frame.name() === "dynamic")).toBe(true);

  for (const name of ["same", "cross", "nested", "blank", "srcdoc", "dynamic"]) {
    const frame = page.frame({ name });
    await expect(frame.locator("#frameSelect")).toBeVisible();
    await frame.evaluate(() => {
      window.frameEvents = { input: 0, change: 0 };
      const select = document.getElementById("frameSelect");
      for (const type of ["input", "change"]) {
        select.addEventListener(type, () => window.frameEvents[type]++);
      }
    });
    await openFrameSuggestion(frame);
    await page.keyboard.type("Tar");
    await expect(frame.locator("[data-tabby-select-host] .item")).toHaveCount(1);
    await expect(frame.locator("[data-tabby-select-host] .pending")).toHaveText("Target");
    const bounds = await frame.locator("[data-tabby-select-host] .root").evaluate((root) => {
      const rect = root.getBoundingClientRect();
      return { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom,
        width: window.innerWidth, height: window.innerHeight };
    });
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.width);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    await page.keyboard.press("Enter");
    await expect(frame.locator("#frameSelect")).toHaveJSProperty("selectedIndex", 2);
    await expect(frame.locator("#frameAfter")).toBeFocused();
    expect(await frame.evaluate(() => window.frameEvents)).toEqual({ input: 1, change: 1 });
    await frame.locator("#frameSelect").focus();
    await page.keyboard.type("Al");
    await page.keyboard.press("Tab");
    await expect(frame.locator("#frameSelect")).toHaveJSProperty("selectedIndex", 1);
    await expect(frame.locator("#frameAfter")).toBeFocused();
    expect(await frame.evaluate(() => window.frameEvents)).toEqual({ input: 2, change: 2 });
  }

  // With no next element in the frame, native Tab continues into the parent.
  const dynamic = page.frame({ name: "dynamic" });
  await dynamic.locator("#frameAfter").evaluate((element) => element.remove());
  await page.evaluate(() => {
    const after = document.createElement("button");
    after.id = "afterDynamic";
    after.textContent = "After dynamic frame";
    document.body.appendChild(after);
  });
  await dynamic.locator("#frameSelect").focus();
  await page.keyboard.type("Tar");
  await page.keyboard.press("Tab");
  await expect(page.locator("#afterDynamic")).toBeFocused();
  await page.close();
});

test("keeps frames synchronized through SPA navigation, settings, and reload", async () => {
  await setSettings({
    urlAllowPatterns: `http://127.0.0.1:${port}/allowed/*`,
    manualEnabledOverride: true
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/frames`);
  const names = ["same", "cross", "nested", "blank", "srcdoc"];
  for (const name of names) {
    await openFrameSuggestion(page.frame({ name }));
  }
  await page.evaluate(() => history.pushState({}, "", "/blocked/frames"));
  for (const name of names) {
    await expect(page.frame({ name }).locator("[data-tabby-select-host]")).toHaveCount(0);
  }

  // Even a child URL matching the allow list remains disabled under a blocked parent.
  await page.locator('iframe[name="same"]').evaluate((frame) => { frame.src = "/allowed/child"; });
  await expect.poll(() => page.frame({ name: "same" }).url()).toContain("/allowed/child");
  const same = page.frame({ name: "same" });
  await same.locator("#before").click();
  await same.locator("#many").focus();
  await page.keyboard.type("Option");
  // Allow asynchronous initialization to settle before checking a disabled frame.
  await page.waitForTimeout(100);
  await expect(same.locator("[data-tabby-select-host]")).toHaveCount(0);

  await page.evaluate(() => history.pushState({}, "", "/allowed/frames"));
  await page.locator('iframe[name="same"]').evaluate((frame) => { frame.src = "/frames/select"; });
  await expect.poll(() => page.frame({ name: "same" }).url()).toContain("/frames/select");
  for (const name of names) {
    await openFrameSuggestion(page.frame({ name }));
  }
  await setSettings({ manualEnabledOverride: false });
  for (const name of names) {
    await expect(page.frame({ name }).locator("[data-tabby-select-host]")).toHaveCount(0);
  }
  await setSettings({ manualEnabledOverride: true });
  for (const name of names) {
    await openFrameSuggestion(page.frame({ name }));
  }
  await setSettings({ urlAllowPatterns: "https://unrelated.example/*" });
  for (const name of names) {
    await expect(page.frame({ name }).locator("[data-tabby-select-host]")).toHaveCount(0);
  }
  await page.close();
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
  await openFocusedSelectSearch(page);

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
  await openFocusedSelectSearch(page);
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
  await openFocusedSelectSearch(page);
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
  await openFocusedSelectSearch(page);
  await page.keyboard.type("Jap");
  await page.keyboard.press("Enter");

  await expect(page.locator("#country")).toHaveValue("Japan");
  await expect(page.locator("#department")).toBeFocused();
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await openFocusedSelectSearch(page);
  await expect(page.locator("[data-tabby-select-host] .query")).toBeFocused();
  await expect(page.locator("[data-tabby-select-host] .item")).toContainText([
    "Choose an option", "Accounting", "Design", "Engineering", "Marketing", "Sales", "Support"
  ]);
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
  await openFocusedSelectSearch(page);

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
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await openFocusedSelectSearch(page);
  await expect(page.locator("[data-tabby-select-host] .query")).toBeFocused();
  await expect(page.locator("[data-tabby-select-host] .item")).toHaveText(["Second A", "Second B"]);
  expect(await page.evaluate(() => window.eventCounts)).toEqual({ input: 1, change: 1 });

  await page.locator("#many").focus();
  await page.keyboard.type("Option 2");
  await page.keyboard.press("Backspace");
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector("[data-tabby-select-host]")
          .shadowRoot.querySelector(".query").value
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
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await openFocusedSelectSearch(page);
  await expect(page.locator("[data-tabby-select-host] .query")).toBeFocused();
  await expect(page.locator("[data-tabby-select-host] .item")).toHaveText(["Second A", "Second B"]);
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
  await openFocusedSelectSearch(page);

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
  await page.locator("[data-tabby-select-host] .query").evaluate((input) => {
    const select = document.getElementById("optionStates");
    select.options[3].disabled = true;
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, cancelable: true })
    );
  });
  await expect(page.locator("[data-tabby-select-host] .query")).toBeFocused();
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

test("saves and reloads the search mode without overwriting other settings", async () => {
  const allowedPattern = `http://127.0.0.1:${port}/allowed/*`;
  await setSettings({ urlAllowPatterns: allowedPattern, manualEnabledOverride: true });
  await worker.evaluate(() => chrome.storage.local.remove("searchMode"));
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.locator("#searchModePrefix")).toBeEnabled();
  await expect(options.locator("#searchModePrefix")).toBeChecked();
  await expect(options.locator("#searchModeContains")).not.toBeChecked();
  await expect(options.locator("#search-settings-title")).toHaveText("Search mode");
  // Change another control without submitting it; mode saving must not copy that value.
  await options.locator("#urlAllowPatterns").evaluate((input) => { input.value = "unsaved"; });
  await options.locator("#searchModeContains").check();
  await expect(options.locator("#status")).toHaveText("Settings saved.");
  expect(await worker.evaluate(() => chrome.storage.local.get(["searchMode", "urlAllowPatterns"])))
    .toEqual({ searchMode: "contains", urlAllowPatterns: allowedPattern });
  await options.reload();
  await expect(options.locator("#searchModeContains")).toBeEnabled();
  await expect(options.locator("#searchModeContains")).toBeChecked();
  await options.locator("#searchModePrefix").evaluate((input) => { input.checked = true; });
  await options.locator("#urlAllowPatterns").fill(`${allowedPattern}\nhttps://example.com/*`);
  await options.locator("#search-settings-title").click();
  await expect.poll(() => worker.evaluate(() => chrome.storage.local.get("urlAllowPatterns")))
    .toEqual({ urlAllowPatterns: `${allowedPattern}\nhttps://example.com/*` });
  expect(await worker.evaluate(() => chrome.storage.local.get("searchMode")))
    .toEqual({ searchMode: "contains" });
  await options.reload();
  await expect(options.locator("#searchModeContains")).toBeChecked();
  await options.screenshot({ path: path.join(os.tmpdir(), "tabbyselect-search-options.png"), fullPage: true });
  await options.close();
});

test("updates an active search without committing and preserves keyboard selection", async () => {
  await setSettings({ searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const items = page.locator("[data-tabby-select-host] .item");
  const query = page.locator("[data-tabby-select-host] .query");
  const pending = page.locator("[data-tabby-select-host] .pending");
  await page.locator("#searchBefore").click();
  await select.focus();
  await openFocusedSelectSearch(page);
  await expect(items).toHaveCount(6);
  await page.keyboard.type("pan");
  await expect(items).toHaveText(["Panama"]);
  await expect(pending).toHaveText("Panama");

  await setSettings({ searchMode: "contains" });
  await expect(query).toHaveValue("pan");
  await expect(items).toHaveText(["Japan", "Panama", "Japanese", "New Japan"]);
  await expect(pending).toHaveText("Japan");
  await expect(select).toHaveJSProperty("selectedIndex", 0);
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
  await setSettings({ searchMode: "prefix" });
  await expect(items).toHaveText(["Panama"]);
  await expect(pending).toHaveText("Panama");
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
  await setSettings({ searchMode: "contains" });
  await expect(pending).toHaveText("Japan");
  await page.keyboard.press("Enter");
  await expect(select).toHaveJSProperty("selectedIndex", 1);
  await expect(page.locator("#searchAfter")).toBeFocused();
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 1, change: 1 });

  await select.focus();
  await page.keyboard.type("pan");
  await expect(pending).toHaveText("Panama");
  await page.keyboard.press("ArrowDown");
  await expect(pending).toHaveText("Japanese");
  await page.keyboard.press("Tab");
  await expect(select).toHaveJSProperty("selectedIndex", 3);
  await expect(page.locator("#searchAfter")).toBeFocused();
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 2, change: 2 });

  await select.focus();
  await page.keyboard.type("pan");
  await expect(pending).toHaveText("New Japan");
  await page.keyboard.press("ArrowDown");
  await expect(pending).toHaveText("Japan");
  await page.keyboard.press("ArrowUp");
  await expect(pending).toHaveText("New Japan");
  await page.keyboard.press("Escape");
  await expect(items).toHaveCount(6);
  await page.keyboard.type(" Japan ");
  await expect(items).toHaveText(["Japan", "Japanese", "New Japan"]);
  await page.keyboard.press("Escape");
  await page.keyboard.type("zzz");
  await expect(items).toHaveText(["No matching options"]);
  await page.keyboard.press("Enter");
  await expect(select).toHaveJSProperty("selectedIndex", 3);
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 2, change: 2 });
  await page.close();
});

test("applies search mode changes to all frame types", async () => {
  await setSettings({ searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/frames`);
  for (const name of ["same", "cross", "nested", "blank", "srcdoc"]) {
    const frame = page.frame({ name });
    await setSettings({ searchMode: "prefix" });
    await frame.locator("#frameSelect").evaluate((select) => {
      select.innerHTML = '<option>Initial</option><option>Japan</option>';
      window.searchEvents = { input: 0, change: 0 };
      for (const type of ["input", "change"]) {
        select.addEventListener(type, () => window.searchEvents[type]++);
      }
    });
    await openFrameSuggestion(frame);
    await page.keyboard.type("pan");
    await expect(frame.locator("[data-tabby-select-host] .item")).toHaveText(["No matching options"]);
    await setSettings({ searchMode: "contains" });
    await expect(frame.locator("[data-tabby-select-host] .query")).toHaveValue("pan");
    await expect(frame.locator("[data-tabby-select-host] .pending")).toHaveText("Japan");
    await expect(frame.locator("#frameSelect")).toHaveJSProperty("selectedIndex", 0);
    expect(await frame.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
    await setSettings({ searchMode: "prefix" });
    await expect(frame.locator("[data-tabby-select-host] .item")).toHaveText(["No matching options"]);
    await expect(frame.locator("[data-tabby-select-host] .pending")).toHaveCount(0);
    await setSettings({ searchMode: "contains" });
    await expect(frame.locator("[data-tabby-select-host] .pending")).toHaveText("Japan");
    await page.keyboard.press("Enter");
    await expect(frame.locator("#frameSelect")).toHaveJSProperty("selectedIndex", 1);
    await expect(frame.locator("#frameAfter")).toBeFocused();
    expect(await frame.evaluate(() => window.searchEvents)).toEqual({ input: 1, change: 1 });
  }
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.name = "dynamicSearch";
    frame.src = "/frames/select";
    document.body.appendChild(frame);
  });
  await expect.poll(() => page.frames().some((frame) => frame.name() === "dynamicSearch")).toBe(true);
  const dynamic = page.frame({ name: "dynamicSearch" });
  await openFrameSuggestion(dynamic);
  await page.keyboard.type("get");
  await expect(dynamic.locator("[data-tabby-select-host] .pending")).toHaveText("Target");
  await page.keyboard.press("Tab");
  await expect(dynamic.locator("#frameSelect")).toHaveJSProperty("selectedIndex", 2);
  await page.close();
});

test("handles native IME composition without committing the select", async () => {
  const page = await context.newPage();
  await openUnicodeSearch(page);
  const input = page.getByRole("combobox", { name: "Search options" });
  const items = page.locator("[data-tabby-select-host] .item");
  const cdp = await context.newCDPSession(page);
  await expect(input).toHaveAttribute("tabindex", "-1");
  await expect(items).toHaveCount(10);
  await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
  await expect(input).toHaveValue("にほん");
  await expect(items).toHaveCount(10);
  for (const key of ["Enter", "ArrowDown", "Escape", "Tab"]) {
    expect(await input.evaluate((element, key) => element.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true, isComposing: true })
    ), key)).toBe(true);
  }
  await cdp.send("Input.imeSetComposition", { text: "日本", selectionStart: 2, selectionEnd: 2 });
  await setSettings({ searchMode: "contains" });
  await page.locator("#unicodeSelect").evaluate((select) => select.appendChild(new Option("日本国")));
  await expect(items).toHaveCount(11);
  await expect(input).toHaveValue("日本");
  await cdp.send("Input.insertText", { text: "日本" });
  await expect(input).toHaveValue("日本");
  await expect(items).toHaveText(["日本", "日本語", "東京日本", "😀日本", "日本国"]);
  await expect(page.locator("#unicodeSelect")).toHaveJSProperty("selectedIndex", 0);
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
  await page.keyboard.press("Enter");
  await expect(page.locator("#unicodeSelect")).toHaveJSProperty("selectedIndex", 1);
  await expect(page.locator("#unicodeAfter")).toBeFocused();
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 1, change: 1 });
  await cdp.detach();
  await page.close();
});

test("supports full-width text, paste, replacement, and native deletion in both modes", async () => {
  const page = await context.newPage();
  for (const mode of ["prefix", "contains"]) {
    await openUnicodeSearch(page, mode);
    const input = page.locator("[data-tabby-select-host] .query");
    const items = page.locator("[data-tabby-select-host] .item");
    await page.keyboard.insertText("ＡＢ");
    await expect(items).toHaveText(["ＡＢＣ"]);
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText("AB");
    await expect(items).toHaveText(["ABC"]);
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText("にほん");
    await expect(items).toHaveText(["にほん"]);
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText("ニホン");
    await expect(items).toHaveText(["ニホン"]);
    await input.evaluate((element) => element.setSelectionRange(0, element.value.length));
    await page.keyboard.insertText("１２３");
    await expect(input).toHaveValue("１２３");
    await expect(items).toHaveText(["１２３"]);
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText("😀日");
    await page.keyboard.press("Backspace");
    await expect(input).toHaveValue("😀");
    await page.keyboard.press("Backspace");
    await expect(input).toHaveValue("");
    await expect(items).toHaveCount(10);
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: `http://127.0.0.1:${port}`
    });
    await page.evaluate(() => navigator.clipboard.writeText("日本語"));
    await page.keyboard.press("Control+v");
    await expect(input).toHaveValue("日本語");
    await expect(items).toHaveText(["日本語"]);
    expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
    await page.keyboard.press("Tab");
    await expect(page.locator("#unicodeSelect")).toHaveJSProperty("selectedIndex", 2);
    await expect(page.locator("#unicodeAfter")).toBeFocused();
    expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 1, change: 1 });
  }
  await page.close();
});

test("handles composition cancellation and alternate event ordering", async () => {
  const page = await context.newPage();
  await openUnicodeSearch(page);
  const input = page.locator("[data-tabby-select-host] .query");
  const items = page.locator("[data-tabby-select-host] .item");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
  await cdp.send("Input.imeSetComposition", { text: "", selectionStart: 0, selectionEnd: 0 });
  await expect(input).toHaveValue("");
  await expect(items).toHaveCount(10);
  await input.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    element.value = "日本";
    element.dispatchEvent(new InputEvent("input", { bubbles: true, isComposing: true, data: "日本" }));
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "日本" }));
    element.dispatchEvent(new InputEvent("input", { bubbles: true, data: "日本" }));
  });
  await expect(input).toHaveValue("日本");
  await expect(items).toHaveText(["日本", "日本語"]);
  expect(await input.evaluate((element) => element.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Enter", keyCode: 229, bubbles: true, composed: true, cancelable: true
  })))).toBe(true);
  await expect(page.locator("#unicodeSelect")).toHaveJSProperty("selectedIndex", 0);
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#unicodeBefore")).toBeFocused();
  await expect(page.locator("#unicodeSelect")).toHaveJSProperty("selectedIndex", 1);
  await cdp.detach();
  await page.close();
});

test("preserves mouse interaction and cleans up focused composition sessions", async () => {
  const page = await context.newPage();
  await openUnicodeSearch(page);
  let input = page.locator("[data-tabby-select-host] .query");
  await input.click();
  await page.keyboard.insertText("日本");
  await expect(input).toHaveValue("日本");
  await page.locator("#unicodeSelect").evaluate((select) => {
    select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    select.focus();
  });
  await expect(page.locator("#unicodeSelect")).toBeFocused();
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await page.locator("#unicodeBefore").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Home");
  await expect(input).toBeFocused();
  await page.locator("#unicodeAfter").click();
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await page.locator("#unicodeSelect").evaluate((select) => {
    select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    select.focus();
  });
  await expect(page.locator("#unicodeSelect")).toBeFocused();
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await page.locator("#unicodeBefore").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Home");
  await expect(input).toBeFocused();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
  await setSettings({ manualEnabledOverride: false });
  await expect(page.locator("[data-tabby-select-host]")).toHaveCount(0);
  await expect(page.locator("#unicodeSelect")).toBeFocused();
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
  await setSettings({ manualEnabledOverride: true });
  await page.locator("#unicodeBefore").focus();
  await page.keyboard.press("Tab");
  input = page.locator("[data-tabby-select-host] .query");
  await page.keyboard.press("Home");
  await expect(input).toHaveValue("");
  await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
  await page.locator("#unicodeSelect").evaluate((select) => select.remove());
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
  await cdp.detach();
  await page.close();
});

test("supports Japanese IME composition inside all supported frame types", async () => {
  await setSettings({ searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/frames`);
  const cdp = await context.newCDPSession(page);
  for (const name of ["same", "cross", "nested", "blank", "srcdoc"]) {
    const frame = page.frame({ name });
    await frame.locator("#frameSelect").evaluate((select) => {
      select.innerHTML = '<option>Initial</option><option>日本</option><option>日本語</option>';
    });
    await openFrameSuggestion(frame);
    const input = frame.locator("[data-tabby-select-host] .query");
    await expect(input).toBeFocused();
    await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
    await expect(input).toHaveValue("にほん");
    await expect(frame.locator("[data-tabby-select-host] .item")).toHaveCount(3);
    await cdp.send("Input.insertText", { text: "日本" });
    await expect(input).toHaveValue("日本");
    await expect(frame.locator("[data-tabby-select-host] .item")).toHaveText(["日本", "日本語"]);
    await expect(frame.locator("#frameSelect")).toHaveJSProperty("selectedIndex", 0);
    await page.keyboard.press("Enter");
    await expect(frame.locator("#frameSelect")).toHaveJSProperty("selectedIndex", 1);
    await expect(frame.locator("#frameAfter")).toBeFocused();
  }
  await cdp.detach();
  await page.close();
});

test("omits the key trigger setting even when a legacy value is stored", async () => {
  await setSettings({ searchMode: "contains", urlAllowPatterns: "https://example.com/*", manualEnabledOverride: true });
  const options = await context.newPage();
  for (const legacyValue of [false, true, undefined]) {
    if (legacyValue === undefined) {
      await worker.evaluate(() => chrome.storage.local.remove("showSuggestionsOnKeydown"));
    } else {
      await setSettings({ showSuggestionsOnKeydown: legacyValue });
    }
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(options.locator("#status")).toHaveText("Current settings loaded.");
    await expect(options.locator("#showSuggestionsOnKeydown")).toHaveCount(0);
    await expect(options.locator("#suggestion-trigger-description")).toHaveCount(0);
    await expect(options.locator("#switchFromPickerOnKeydown")).toBeEnabled();
    await expect(options.locator("#searchModeContains")).toBeChecked();
    await expect(options.locator("#urlAllowPatterns")).toHaveValue("https://example.com/*");
  }
  await options.close();
});

async function mouseFocusSelect(select) {
  await select.evaluate((element) => {
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    element.focus();
  });
  await expect(select).toBeFocused();
}

test("always opens on a focused select key and ignores stored or live legacy values", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  const select = page.locator("#searchSelect");
  const input = page.locator("[data-tabby-select-host] .query");
  for (const legacyValue of [false, true, undefined]) {
    if (legacyValue === undefined) {
      await worker.evaluate(() => chrome.storage.local.remove("showSuggestionsOnKeydown"));
    } else {
      await setSettings({ showSuggestionsOnKeydown: legacyValue });
    }
    await page.goto(`http://127.0.0.1:${port}/allowed/search`);
    // A real mouse click still opens the browser's native dropdown.
    await select.click();
    await page.keyboard.press("Escape");
    await expect(select).toBeFocused();
    await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
    await page.keyboard.press("Shift");
    await page.keyboard.press("Control+a");
    await expect(select).toBeFocused();
    await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
    await page.keyboard.press("j");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("j");
    await expect(page.locator("[data-tabby-select-host] .item")).toHaveText(["Japan", "Japanese"]);
    await expect(select).toHaveJSProperty("selectedIndex", 0);
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
    await setSettings({ showSuggestionsOnKeydown: false });
    await expect(input).toHaveValue("j");
    await page.keyboard.press("Enter");
    await expect(select).toHaveJSProperty("selectedIndex", 1);
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 1, change: 1 });
    await expect(page.locator("#searchAfter")).toBeFocused();
    await mouseFocusSelect(select);
    await page.keyboard.press("Home");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");
    await expect(select).toHaveJSProperty("selectedIndex", 1);
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 1, change: 1 });
  }
  await page.close();
});

test("does not open suggestions for arrow or Escape keys on a focused select or its open picker", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const root = page.locator("[data-tabby-select-host] .root");
  for (const size of [1, 5]) {
    await select.evaluate((element, size) => { element.size = size; }, size);
    for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"]) {
      await mouseFocusSelect(select);
      await page.keyboard.press(key);
      await expect(select).toBeFocused();
      await expect(root).toBeHidden();
      // These keys retain their default browser handling.
      expect(await select.evaluate((element, key) => element.dispatchEvent(new KeyboardEvent("keydown", {
        key, bubbles: true, cancelable: true
      })), key)).toBe(true);
    }
  }
  await setSettings({ switchFromPickerOnKeydown: true });
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"]) {
    await openSelectPicker(select);
    await page.keyboard.press(key);
    await expect(root).toBeHidden();
    await page.keyboard.press("Escape");
    await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
  }
  await setSettings({ switchFromPickerOnKeydown: false });
  await page.close();
});

test("keeps search closed when its select regains focus without a trigger key", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const input = page.locator("[data-tabby-select-host] .query");
  const root = page.locator("[data-tabby-select-host] .root");
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"]) {
    await mouseFocusSelect(select);
    await page.keyboard.press("j");
    await expect(input).toBeFocused();
    // A page or browser may return focus directly, without a mouse event.
    await select.focus();
    await expect(select).toBeFocused();
    await expect(root).toBeHidden();
    await page.keyboard.press(key);
    await expect(select).toBeFocused();
    await expect(root).toBeHidden();
  }
  await page.close();
});

test("does not open suggestions when IME masks arrow or Escape key names", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/ime`);
  const select = page.locator("#unicodeSelect");
  const root = page.locator("[data-tabby-select-host] .root");
  const cdp = await context.newCDPSession(page);
  for (const code of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"]) {
    await mouseFocusSelect(select);
    // With an IME enabled, key can be Process and keyCode 229 for physical navigation keys.
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown", key: "Process", code, windowsVirtualKeyCode: 229
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp", key: "Process", code, windowsVirtualKeyCode: 229
    });
    await expect(select).toBeFocused();
    await expect(root).toBeHidden();
  }
  for (const keyCode of [27, 37, 38, 39, 40]) {
    await mouseFocusSelect(select);
    expect(await select.evaluate((element, keyCode) => element.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Unidentified", keyCode, bubbles: true, cancelable: true
    })), keyCode)).toBe(true);
    await expect(select).toBeFocused();
    await expect(root).toBeHidden();
  }
  await cdp.detach();
  await page.close();
});

test("opens with control and IME keys without committing and keeps native Tab navigation", async () => {
  await setSettings({ searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/ime`);
  const select = page.locator("#unicodeSelect");
  const input = page.locator("[data-tabby-select-host] .query");
  for (const key of ["Enter", "Home", "End", "Backspace", "Delete"]) {
    await mouseFocusSelect(select);
    await page.keyboard.press(key);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");
    await expect(select).toHaveJSProperty("selectedIndex", 0);
    expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
  }
  await mouseFocusSelect(select);
  await page.keyboard.press("Tab");
  await expect(page.locator("#unicodeAfter")).toBeFocused();
  await mouseFocusSelect(select);
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#unicodeBefore")).toBeFocused();
  // Autofocus is suppressed on a fresh page but may be opened explicitly with a key.
  await page.reload();
  await select.focus();
  await expect(select).toBeFocused();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Process", windowsVirtualKeyCode: 229 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Process", windowsVirtualKeyCode: 229 });
  await expect(input).toBeFocused();
  await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
  await expect(input).toHaveValue("にほん");
  await expect(select).toHaveJSProperty("selectedIndex", 0);
  await cdp.send("Input.insertText", { text: "日本" });
  await expect(input).toHaveValue("日本");
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
  await page.keyboard.press("Enter");
  await expect(select).toHaveJSProperty("selectedIndex", 1);
  await expect(page.locator("#unicodeAfter")).toBeFocused();
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 1, change: 1 });
  await cdp.detach();
  await setSettings({ showSuggestionsOnKeydown: false });
  await page.close();
});

test("applies the key trigger to existing and newly added frames", async () => {
  await setSettings({ searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/frames`);
  await openFrameSuggestion(page.frame({ name: "same" }));
  await page.evaluate(() => {
    const iframe = document.createElement("iframe");
    iframe.name = "dynamic";
    iframe.src = "/frames/select";
    document.body.append(iframe);
  });
  await expect.poll(() => Boolean(page.frame({ name: "dynamic" }))).toBe(true);
  for (const name of ["same", "cross", "nested", "blank", "srcdoc", "dynamic"]) {
    const frame = page.frame({ name });
    const select = frame.locator("#frameSelect");
    await frame.locator("#frameBefore").focus();
    await select.focus();
    await expect(select).toBeFocused();
    await expect(frame.locator("[data-tabby-select-host] .root")).toBeHidden();
    await mouseFocusSelect(select);
    await page.keyboard.press("a");
    const input = frame.locator("[data-tabby-select-host] .query");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("a");
    await expect(frame.locator("[data-tabby-select-host] .item")).toHaveText(["Alpha"]);
    await expect(select).toHaveJSProperty("selectedIndex", 0);
    await page.keyboard.press("Shift+Tab");
    await expect(select).toHaveJSProperty("selectedIndex", 1);
    await expect(frame.locator("#frameBefore")).toBeFocused();
  }
  await setSettings({ showSuggestionsOnKeydown: false });
  const frame = page.frame({ name: "cross" });
  await mouseFocusSelect(frame.locator("#frameSelect"));
  await page.keyboard.press("Home");
  await expect(frame.locator("[data-tabby-select-host] .query")).toBeFocused();
  await expect(frame.locator("#frameSelect")).toHaveJSProperty("selectedIndex", 1);
  await page.close();
});

test("always waits for a select key after Tab and programmatic focus", async () => {
  await setSettings({ searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const root = page.locator("[data-tabby-select-host] .root");
  const input = page.locator("[data-tabby-select-host] .query");
  await page.locator("#searchBefore").click();
  await page.keyboard.press("Tab");
  await expect(select).toBeFocused();
  await expect(root).toBeHidden();
  // Refreshes and setting updates must also leave the UI hidden while waiting.
  await select.evaluate((element) => element.add(new Option("Jamaica")));
  await setSettings({ searchMode: "contains" });
  await page.keyboard.press("Shift");
  await page.keyboard.press("Control+a");
  await expect(select).toBeFocused();
  await expect(root).toBeHidden();
  await expect(select).toHaveJSProperty("selectedIndex", 0);
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
  await page.keyboard.press("j");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("j");
  await expect(page.locator("[data-tabby-select-host] .item")).toHaveText(["Japan", "Japanese", "New Japan", "Jamaica"]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(select).toBeFocused();
  await expect(root).toBeHidden();
  await page.locator("#searchBefore").focus();
  await select.focus();
  await expect(select).toBeFocused();
  await expect(root).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(page.locator("#searchAfter")).toBeFocused();
  await expect(root).toBeHidden();
  await select.focus();
  await expect(root).toBeHidden();
  await page.keyboard.press("Home");
  await expect(input).toBeFocused();
  await expect(select).toHaveJSProperty("selectedIndex", 0);
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
  await setSettings({ showSuggestionsOnKeydown: false });
  await expect(input).toBeFocused();
  await page.locator("#searchBefore").focus();
  await page.keyboard.press("Tab");
  await expect(select).toBeFocused();
  await expect(root).toBeHidden();
  await page.keyboard.press("j");
  await expect(input).toBeFocused();
  await page.close();
});

test("saves the open-list switch independently and reports missing browser support", async () => {
  await setSettings({ searchMode: "contains", urlAllowPatterns: "https://example.com/*" });
  await worker.evaluate(() => chrome.storage.local.remove("switchFromPickerOnKeydown"));
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  const trigger = options.locator("#switchFromPickerOnKeydown");
  await expect(trigger).toBeEnabled();
  await expect(trigger).not.toBeChecked();
  await expect(options.locator("#picker-unavailable")).toBeHidden();
  await options.locator("#urlAllowPatterns").evaluate((input) => { input.value = "unsaved"; });
  await trigger.check();
  await expect.poll(() => worker.evaluate(() => chrome.storage.local.get([
    "switchFromPickerOnKeydown", "searchMode", "urlAllowPatterns"
  ]))).toEqual({ switchFromPickerOnKeydown: true, searchMode: "contains", urlAllowPatterns: "https://example.com/*" });
  await options.reload();
  await expect(trigger).toBeEnabled();
  await expect(trigger).toBeChecked();
  await trigger.uncheck();
  await expect.poll(() => worker.evaluate(() => chrome.storage.local.get("switchFromPickerOnKeydown")))
    .toEqual({ switchFromPickerOnKeydown: false });
  await options.screenshot({ path: path.join(os.tmpdir(), "tabbyselect-picker-options.png"), fullPage: true });
  await options.close();
  const unsupported = await context.newPage();
  await unsupported.addInitScript(() => { CSS.supports = () => false; });
  await unsupported.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(unsupported.locator("#status")).toHaveText("Current settings loaded.");
  await expect(unsupported.locator("#switchFromPickerOnKeydown")).toBeDisabled();
  await expect(unsupported.locator("#picker-unavailable")).toBeVisible();
  await unsupported.close();
});

async function openSelectPicker(select) {
  await expect.poll(() => select.evaluate((element) => getComputedStyle(element).appearance)).toBe("base-select");
  await select.click();
  await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(true);
}

const selectSizeAttributes = [null, "", "0", "1", "2", "5", "100", "-1", "invalid", "4294967295"];

test("keeps suggestions hidden when clicking listbox options", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const root = page.locator("[data-tabby-select-host] .root");
  const input = page.locator("[data-tabby-select-host] .query");
  const option = select.locator("option").filter({ hasText: /^Japan$/ });
  for (const showSuggestionsOnKeydown of [false, true]) {
    await setSettings({ showSuggestionsOnKeydown });
    for (const size of [2, 5, 100]) {
      await select.evaluate((element, size) => { element.size = size; }, size);
      await page.locator("#searchBefore").click();
      await option.click();
      await expect(select).toBeFocused();
      await expect(select).toHaveJSProperty("selectedIndex", 1);
      await expect(root).toBeHidden();

      // A key after keyboard focus opens search; clicking an option hides it again.
      await page.locator("#searchBefore").focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("j");
      await expect(input).toBeFocused();
      await option.click();
      await expect(select).toBeFocused();
      await expect(root).toBeHidden();
      await option.click();
      await expect(root).toBeHidden();
    }
  }
  await page.close();
});

test("opens suggestions on a key after clicking a listbox option", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const input = page.locator("[data-tabby-select-host] .query");
  const option = select.locator("option").filter({ hasText: /^Initial$/ });
  for (const size of [2, 5, 100]) {
    await select.evaluate((element, size) => { element.size = size; }, size);
    for (const key of ["j", "Home", "Enter"]) {
      await page.locator("#searchBefore").click();
      await option.click();
      await expect(select).toBeFocused();
      await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
      await page.keyboard.press(key);
      await expect(input).toBeFocused();
      await expect(input).toHaveValue(key === "j" ? "j" : "");
      await expect(select).toHaveJSProperty("selectedIndex", 0);
    }
  }
  await page.close();
});

test("searches and confirms single selects independently of their size", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const input = page.locator("[data-tabby-select-host] .query");
  for (const size of selectSizeAttributes) {
    await select.evaluate((element, size) => {
      if (size === null) element.removeAttribute("size");
      else element.setAttribute("size", size);
      element.selectedIndex = 0;
      window.searchEvents = { input: 0, change: 0 };
    }, size);
    await page.locator("#searchBefore").focus();
    await page.keyboard.press("Tab");
    await expect(select).toBeFocused();
    await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
    await page.keyboard.press("p");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("p");
    await input.fill("pan");
    await expect(page.locator("[data-tabby-select-host] .pending")).toHaveText("Panama");
    await expect(select).toHaveJSProperty("selectedIndex", 0);
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
    await page.keyboard.press("Tab");
    await expect(select).toHaveJSProperty("selectedIndex", 2);
    await expect(page.locator("#searchAfter")).toBeFocused();
    expect(await select.getAttribute("size")).toBe(size);
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 1, change: 1 });
  }
  await page.close();
});

test("switches open lists to search for every size and restores the size attribute", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const input = page.locator("[data-tabby-select-host] .query");
  for (const size of selectSizeAttributes) {
    await select.evaluate((element, size) => {
      if (size === null) element.removeAttribute("size");
      else element.setAttribute("size", size);
      element.selectedIndex = 0;
      window.searchEvents = { input: 0, change: 0 };
    }, size);
    await setSettings({ switchFromPickerOnKeydown: true });
    await expect(select).toHaveJSProperty("size", 1);
    await openSelectPicker(select);
    await page.keyboard.type("pan");
    await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("pan");
    await expect(select).toHaveJSProperty("selectedIndex", 0);
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
    await page.keyboard.press("Enter");
    await expect(select).toHaveJSProperty("selectedIndex", 2);
    await expect(page.locator("#searchAfter")).toBeFocused();
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 1, change: 1 });
    await setSettings({ switchFromPickerOnKeydown: false });
    await expect.poll(() => select.getAttribute("size")).toBe(size);
  }
  await page.close();
});

test("preserves an unselected listbox and page size changes during search", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  const input = page.locator("[data-tabby-select-host] .query");
  await select.evaluate((element) => { element.size = 5; element.selectedIndex = -1; });
  await setSettings({ switchFromPickerOnKeydown: true });
  await expect(select).toHaveJSProperty("size", 1);
  await expect(select).toHaveJSProperty("selectedIndex", -1);
  await openSelectPicker(select);
  await page.keyboard.type("pan");
  await expect(input).toHaveValue("pan");
  await expect(input).toBeFocused();
  await select.evaluate((element) => { element.size = 12; });
  await expect(select).toHaveJSProperty("size", 1);
  await expect(select).toHaveJSProperty("selectedIndex", -1);
  await expect(input).toHaveValue("pan");
  await expect(input).toBeFocused();
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
  await setSettings({ switchFromPickerOnKeydown: false });
  await expect(select).toHaveJSProperty("size", 12);
  await expect(select).toHaveJSProperty("selectedIndex", -1);
  for (const size of [null, "invalid", "1"]) {
    await setSettings({ switchFromPickerOnKeydown: true });
    await expect(select).toHaveJSProperty("size", 1);
    await select.evaluate((element, size) => {
      if (size === null) element.removeAttribute("size");
      else element.setAttribute("size", size);
    }, size);
    await expect.poll(() => select.getAttribute("size")).toBe("1");
    const selectedIndex = await select.evaluate((element) => element.selectedIndex);
    await setSettings({ switchFromPickerOnKeydown: false });
    await expect.poll(() => select.getAttribute("size")).toBe(size);
    await expect(select).toHaveJSProperty("selectedIndex", selectedIndex);
  }
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
  await page.close();
});

test("switches a clicked-open list to search while preserving text, values, and mouse selection", async () => {
  await setSettings({ switchFromPickerOnKeydown: true, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  for (const mode of ["prefix", "contains"]) {
    await setSettings({ searchMode: mode });
    await page.goto(`http://127.0.0.1:${port}/allowed/search`);
    const select = page.locator("#searchSelect");
    const input = page.locator("[data-tabby-select-host] .query");
    await openSelectPicker(select);
    await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
    await page.keyboard.press("Shift");
    await page.keyboard.press("Control+a");
    await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(true);
    await page.keyboard.type("pan");
    await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("pan");
    await expect(select).toHaveJSProperty("selectedIndex", 0);
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
    await expect(page.locator("[data-tabby-select-host] .item")).toHaveText(mode === "prefix"
      ? ["Panama"] : ["Japan", "Panama", "Japanese", "New Japan"]);
    await page.keyboard.press("Enter");
    await expect(select).toHaveJSProperty("selectedIndex", mode === "prefix" ? 2 : 1);
    await expect(page.locator("#searchAfter")).toBeFocused();
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 1, change: 1 });
    await openSelectPicker(select);
    // Mouse-only selection continues to use the select's own options and events.
    await select.locator("option").filter({ hasText: /^Japanese$/ }).click();
    await expect(select).toHaveJSProperty("selectedIndex", 3);
    await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
    await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
    expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 2, change: 2 });
  }
  await setSettings({ switchFromPickerOnKeydown: false });
  await page.close();
});

test("does not commit opening control or IME keys and preserves Tab traversal", async () => {
  await setSettings({ switchFromPickerOnKeydown: true, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/ime`);
  const select = page.locator("#unicodeSelect");
  const input = page.locator("[data-tabby-select-host] .query");
  for (const key of ["Enter", "Home", "End", "Backspace", "Delete"]) {
    await openSelectPicker(select);
    await page.keyboard.press(key);
    await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");
    await expect(select).toHaveJSProperty("selectedIndex", 0);
    expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
  }
  await openSelectPicker(select);
  await page.keyboard.press("Tab");
  // The browser's base picker uses the first Tab to close and focus its select.
  await expect(select).toBeFocused();
  await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(page.locator("#unicodeAfter")).toBeFocused();
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await openSelectPicker(select);
  await page.keyboard.press("Shift+Tab");
  await expect(select).toBeFocused();
  await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#unicodeBefore")).toBeFocused();
  await openSelectPicker(select);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Process", windowsVirtualKeyCode: 229 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Process", windowsVirtualKeyCode: 229 });
  await expect(input).toBeFocused();
  await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
  await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
  await expect(input).toHaveValue("にほん");
  await cdp.send("Input.insertText", { text: "日本" });
  await expect(input).toHaveValue("日本");
  await expect(select).toHaveJSProperty("selectedIndex", 0);
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 0, change: 0 });
  await page.keyboard.press("Enter");
  await expect(select).toHaveJSProperty("selectedIndex", 1);
  await expect(page.locator("#unicodeAfter")).toBeFocused();
  expect(await page.evaluate(() => window.unicodeEvents)).toEqual({ input: 1, change: 1 });
  await cdp.detach();
  await setSettings({ switchFromPickerOnKeydown: false });
  await page.close();
});

test("restores original styles and handles dynamic selects, eligibility, and activation", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: `http://127.0.0.1:${port}/allowed/*`, manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/search`);
  const select = page.locator("#searchSelect");
  await select.evaluate((element) => {
    element.style.setProperty("appearance", "none", "important");
    element.style.color = "red";
    element.setAttribute("data-tabby-select-base-picker", "page-owned");
  });
  await setSettings({ switchFromPickerOnKeydown: true });
  await openSelectPicker(select);
  await setSettings({ switchFromPickerOnKeydown: false });
  await expect.poll(() => select.evaluate((element) => ({
    appearance: element.style.getPropertyValue("appearance"),
    priority: element.style.getPropertyPriority("appearance"),
    attribute: element.getAttribute("data-tabby-select-base-picker"),
    open: element.matches(":open")
  }))).toEqual({ appearance: "none", priority: "important", attribute: "page-owned", open: false });
  expect(await page.evaluate(() => window.searchEvents)).toEqual({ input: 0, change: 0 });
  await setSettings({ switchFromPickerOnKeydown: true });
  await expect.poll(() => select.evaluate((element) => getComputedStyle(element).appearance)).toBe("base-select");
  await select.evaluate((element) => { element.multiple = true; });
  await expect.poll(() => select.evaluate((element) => element.style.appearance)).toBe("none");
  await select.evaluate((element) => { element.multiple = false; element.size = 3; });
  await expect.poll(() => select.evaluate((element) => element.style.appearance)).toBe("base-select");
  await expect(select).toHaveJSProperty("size", 1);
  await setSettings({ switchFromPickerOnKeydown: false });
  await expect(select).toHaveJSProperty("size", 3);
  await setSettings({ switchFromPickerOnKeydown: true });
  await expect(select).toHaveJSProperty("size", 1);
  await select.evaluate((element) => { element.size = 12; });
  await expect(select).toHaveJSProperty("size", 1);
  await setSettings({ switchFromPickerOnKeydown: false });
  await expect(select).toHaveJSProperty("size", 12);
  await setSettings({ switchFromPickerOnKeydown: true });
  await expect(select).toHaveJSProperty("size", 1);
  await select.evaluate((element) => { element.size = 1; element.style.color = "blue"; });
  await expect.poll(() => select.evaluate((element) => element.style.appearance)).toBe("base-select");
  await page.evaluate(() => {
    const dynamic = document.createElement("select");
    dynamic.id = "dynamicSelect";
    dynamic.size = 5;
    dynamic.innerHTML = '<option>Initial</option><option>Target</option>';
    document.body.append(dynamic);
  });
  const dynamic = page.locator("#dynamicSelect");
  await openSelectPicker(dynamic);
  await page.keyboard.press("t");
  await expect(page.locator("[data-tabby-select-host] .query")).toHaveValue("t");
  const removed = await dynamic.elementHandle();
  await dynamic.evaluate((element) => element.remove());
  await expect(page.locator("[data-tabby-select-host] .root")).toBeHidden();
  await expect.poll(() => removed.evaluate((element) => element.style.appearance)).toBe("");
  expect(await removed.evaluate((element) => element.size)).toBe(5);
  await setSettings({ manualEnabledOverride: false });
  await expect.poll(() => select.evaluate((element) => element.style.appearance)).toBe("none");
  await expect(page.locator("[data-tabby-select-host]")).toHaveCount(0);
  await setSettings({ manualEnabledOverride: true });
  await expect.poll(() => select.evaluate((element) => element.style.appearance)).toBe("base-select");
  await page.evaluate(() => history.pushState({}, "", "/blocked/search"));
  await expect.poll(() => select.evaluate((element) => element.style.appearance)).toBe("none");
  await page.evaluate(() => history.pushState({}, "", "/allowed/search"));
  await expect.poll(() => select.evaluate((element) => element.style.appearance)).toBe("base-select");
  // Later page changes to inline appearance must survive cleanup.
  await select.evaluate((element) => element.style.setProperty("appearance", "auto"));
  await setSettings({ switchFromPickerOnKeydown: false });
  await expect.poll(() => select.evaluate((element) => element.getAttribute("data-tabby-select-base-picker"))).toBe("page-owned");
  await expect(select).toHaveCSS("color", "rgb(0, 0, 255)");
  expect(await select.evaluate((element) => element.style.appearance)).toBe("auto");
  expect(await select.evaluate((element) => element.size)).toBe(1);
  await page.close();
});

test("applies picker switching to existing and new frames and pages with restrictive CSP", async () => {
  await setSettings({ switchFromPickerOnKeydown: false, searchMode: "prefix", urlAllowPatterns: "", manualEnabledOverride: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/allowed/frames`);
  await openFrameSuggestion(page.frame({ name: "same" }));
  await setSettings({ switchFromPickerOnKeydown: true });
  await page.evaluate(() => {
    const iframe = document.createElement("iframe");
    iframe.name = "dynamic";
    iframe.src = "/frames/select";
    document.body.append(iframe);
  });
  await expect.poll(() => Boolean(page.frame({ name: "dynamic" }))).toBe(true);
  for (const name of ["same", "cross", "nested", "blank", "srcdoc", "dynamic"]) {
    const frame = page.frame({ name });
    const select = frame.locator("#frameSelect");
    await openSelectPicker(select);
    await expect(frame.locator("[data-tabby-select-host] .root")).toBeHidden();
    await page.keyboard.press("t");
    await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
    await expect(frame.locator("[data-tabby-select-host] .query")).toHaveValue("t");
    await expect(select).toHaveJSProperty("selectedIndex", 0);
    await page.keyboard.press("Enter");
    await expect(select).toHaveJSProperty("selectedIndex", 2);
    await expect(frame.locator("#frameAfter")).toBeFocused();
  }
  await page.goto(`http://127.0.0.1:${port}/allowed/picker-csp`);
  const select = page.locator("#searchSelect");
  await openSelectPicker(select);
  await page.keyboard.press("j");
  await expect.poll(() => select.evaluate((element) => element.matches(":open"))).toBe(false);
  await expect(page.locator("[data-tabby-select-host] .query")).toHaveValue("j");
  await expect(select).toHaveJSProperty("selectedIndex", 0);
  await setSettings({ switchFromPickerOnKeydown: false });
  await expect.poll(() => select.evaluate((element) => element.style.appearance)).toBe("");
  await expect(select).not.toHaveAttribute("style", /.+/);
  await page.close();
});
