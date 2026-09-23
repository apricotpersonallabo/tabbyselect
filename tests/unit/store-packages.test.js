const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../..");
const sourceRoot = path.join(projectRoot, "src");

async function listFiles(root, current = root) {
  const files = [];
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, absolutePath)));
    } else {
      files.push(path.relative(root, absolutePath).split(path.sep).join("/"));
    }
  }
  return files.sort();
}

async function assertLocalHtmlResourcesExist(packageRoot, htmlFile) {
  const html = await fs.readFile(path.join(packageRoot, htmlFile), "utf8");
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|mailto:|#)/.test(reference));
  for (const reference of references) {
    await fs.access(path.join(packageRoot, reference));
  }
}

test("builds strict Chromium and Firefox store packages", async (context) => {
  const { buildStorePackages, RUNTIME_ENTRIES } = await import(
    "../../scripts/build-store-packages.mjs"
  );
  await fs.mkdir(path.join(projectRoot, "dist"), { recursive: true });
  const temporaryRoot = await fs.mkdtemp(
    path.join(projectRoot, "dist/dropdown-helper-store-")
  );
  context.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));

  const outputRoot = path.join(temporaryRoot, "packages");
  const result = await buildStorePackages({
    projectRoot,
    outputRoot,
    firefoxId: "tabby-select@tests.invalid"
  });
  const sourceManifest = JSON.parse(
    await fs.readFile(path.join(sourceRoot, "manifest.json"), "utf8")
  );
  const chromiumManifest = JSON.parse(
    await fs.readFile(path.join(result.chromiumRoot, "manifest.json"), "utf8")
  );
  const firefoxManifest = JSON.parse(
    await fs.readFile(path.join(result.firefoxRoot, "manifest.json"), "utf8")
  );

  assert.equal(result.version, sourceManifest.version);
  assert.deepEqual(chromiumManifest, sourceManifest);
  assert.deepEqual(firefoxManifest.background, {
    scripts: ["shared.js", "i18n.js", "background.js"]
  });
  assert.deepEqual(firefoxManifest.browser_specific_settings, {
    gecko: {
      id: "tabby-select@tests.invalid",
      strict_min_version: "140.0",
      data_collection_permissions: { required: ["none"] }
    },
    gecko_android: {
      strict_min_version: "142.0"
    }
  });

  const chromiumFiles = await listFiles(result.chromiumRoot);
  const firefoxFiles = await listFiles(result.firefoxRoot);
  assert.deepEqual(firefoxFiles, chromiumFiles);
  assert.deepEqual(
    (await fs.readdir(result.chromiumRoot)).sort(),
    [
      "_locales",
      "background.js",
      "content",
      "content.js",
      "i18n.js",
      "icons",
      "manifest.json",
      "metadata.json",
      "options.css",
      "options.html",
      "options.js",
      "popup.css",
      "popup.html",
      "popup.js",
      "shared.js"
    ]
  );
  assert.ok(chromiumFiles.includes("_locales/en/messages.json"));
  assert.ok(chromiumFiles.includes("content/select-session.js"));
  assert.ok(chromiumFiles.includes("icons/on-128.png"));
  assert.ok(chromiumFiles.includes("options.css"));
  assert.ok(chromiumFiles.includes("popup.css"));
  assert.ok(!chromiumFiles.includes("icons/dropdown-helper-concept.png"));
  assert.ok(!chromiumFiles.some((file) => file.startsWith("tests/")));
  assert.ok(!chromiumFiles.includes("README.md"));
  assert.ok(!chromiumFiles.includes("package.json"));
  for (const entry of RUNTIME_ENTRIES) {
    await fs.access(path.join(sourceRoot, entry));
    await assert.rejects(fs.access(path.join(projectRoot, entry)));
  }
  assert.match(
    await fs.readFile(path.join(result.firefoxRoot, "background.js"), "utf8"),
    /typeof importScripts === "function"/
  );
  await assertLocalHtmlResourcesExist(result.chromiumRoot, "popup.html");
  await assertLocalHtmlResourcesExist(result.chromiumRoot, "options.html");
  await assertLocalHtmlResourcesExist(result.firefoxRoot, "popup.html");
  await assertLocalHtmlResourcesExist(result.firefoxRoot, "options.html");
});

test("rejects missing, malformed, and unsafe package targets", async () => {
  const { buildStorePackages, isValidFirefoxExtensionId } = await import(
    "../../scripts/build-store-packages.mjs"
  );
  assert.equal(isValidFirefoxExtensionId("@tabby-select"), true);
  assert.equal(isValidFirefoxExtensionId("tabby-select@example.invalid"), true);
  assert.equal(isValidFirefoxExtensionId("not an id"), false);

  await assert.rejects(
    buildStorePackages({ projectRoot, outputRoot: projectRoot, firefoxId: "@valid" }),
    /child of the project dist directory/
  );
  for (const outputRoot of [
    path.join(projectRoot, "dist"),
    sourceRoot,
    path.join(projectRoot, ".git"),
    path.resolve(projectRoot, "../outside")
  ]) {
    await assert.rejects(
      buildStorePackages({ projectRoot, outputRoot, firefoxId: "@valid" }),
      /child of the project dist directory/
    );
  }
  await assert.rejects(
    buildStorePackages({
      projectRoot,
      outputRoot: path.join(projectRoot, "dist/test-invalid-id"),
      firefoxId: ""
    }),
    /valid Firefox extension ID/
  );
});
