import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const RUNTIME_ENTRIES = Object.freeze([
  "_locales",
  "background.js",
  "content",
  "content.js",
  "i18n.js",
  "icons/off-16.png",
  "icons/off-32.png",
  "icons/off-48.png",
  "icons/off-128.png",
  "icons/on-16.png",
  "icons/on-32.png",
  "icons/on-48.png",
  "icons/on-128.png",
  "manifest.json",
  "metadata.json",
  "options.css",
  "options.html",
  "options.js",
  "popup.css",
  "popup.html",
  "popup.js",
  "shared.js"
]);

const FIREFOX_BACKGROUND_SCRIPTS = Object.freeze([
  "shared.js",
  "i18n.js",
  "background.js"
]);

export function isValidFirefoxExtensionId(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const id = value.trim();
  return (
    /^@[A-Za-z0-9._-]+$/.test(id) ||
    /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/.test(id) ||
    /^\{[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}$/i.test(
      id
    )
  );
}

function assertSafeOutputRoot(projectRoot, outputRoot) {
  const distRoot = path.join(projectRoot, "dist");
  const relative = path.relative(distRoot, outputRoot);
  if (!relative || relative === "." || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Output directory must be a child of the project dist directory.");
  }
}

async function copyRuntime(sourceRoot, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of RUNTIME_ENTRIES) {
    const destinationPath = path.join(destination, entry);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(path.join(sourceRoot, entry), destinationPath, {
      recursive: true
    });
  }
}

export async function buildStorePackages({ projectRoot, outputRoot, firefoxId }) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const sourceRoot = path.join(resolvedProjectRoot, "src");
  assertSafeOutputRoot(resolvedProjectRoot, resolvedOutputRoot);

  if (!isValidFirefoxExtensionId(firefoxId)) {
    throw new Error("A valid Firefox extension ID is required.");
  }

  const sourceManifest = JSON.parse(
    await readFile(path.join(sourceRoot, "manifest.json"), "utf8")
  );
  if (typeof sourceManifest.version !== "string" || !sourceManifest.version) {
    throw new Error("manifest.json must contain a version.");
  }

  await rm(resolvedOutputRoot, { recursive: true, force: true });
  const chromiumRoot = path.join(resolvedOutputRoot, "chromium");
  const firefoxRoot = path.join(resolvedOutputRoot, "firefox");
  await copyRuntime(sourceRoot, chromiumRoot);
  await copyRuntime(sourceRoot, firefoxRoot);

  const firefoxManifest = {
    ...sourceManifest,
    background: {
      scripts: [...FIREFOX_BACKGROUND_SCRIPTS]
    },
    browser_specific_settings: {
      gecko: {
        id: firefoxId.trim(),
        strict_min_version: "140.0",
        data_collection_permissions: {
          required: ["none"]
        }
      },
      gecko_android: {
        strict_min_version: "142.0"
      }
    }
  };
  await writeFile(
    path.join(firefoxRoot, "manifest.json"),
    `${JSON.stringify(firefoxManifest, null, 2)}\n`,
    "utf8"
  );

  return Object.freeze({
    version: sourceManifest.version,
    chromiumRoot,
    firefoxRoot
  });
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key || !key.startsWith("--") || typeof value === "undefined") {
      throw new Error("Expected --output and --firefox-id arguments.");
    }
    values[key.slice(2)] = value;
  }
  return values;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await buildStorePackages({
    projectRoot,
    outputRoot: args.output || path.join(projectRoot, "dist/store-packages"),
    firefoxId: args["firefox-id"]
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
