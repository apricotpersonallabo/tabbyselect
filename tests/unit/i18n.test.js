const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const i18nModule = require("../../src/i18n.js");

const projectRoot = path.resolve(__dirname, "../..");
const sourceRoot = path.join(projectRoot, "src");
const localesRoot = path.join(sourceRoot, "_locales");
const supportedLocales = ["de", "en", "es", "ja", "ko", "zh_CN", "zh_TW"];

function readMessages(locale) {
  return JSON.parse(
    fs.readFileSync(path.join(localesRoot, locale, "messages.json"), "utf8")
  );
}

test("ships exactly the supported locales with complete message catalogs", () => {
  const actualLocales = fs
    .readdirSync(localesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(actualLocales, supportedLocales);

  const englishKeys = Object.keys(readMessages("en")).sort();
  assert.ok(englishKeys.length > 0);

  for (const locale of supportedLocales) {
    const messages = readMessages(locale);
    assert.deepEqual(Object.keys(messages).sort(), englishKeys, `${locale} keys`);
    for (const key of englishKeys) {
      assert.equal(typeof messages[key].message, "string", `${locale}.${key}`);
      assert.ok(messages[key].message.trim(), `${locale}.${key} is empty`);
    }
  }
});

test("uses English as the manifest fallback and localizes manifest fields", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(sourceRoot, "manifest.json"), "utf8")
  );
  const englishMessages = readMessages("en");

  assert.equal(manifest.default_locale, "en");
  assert.equal(manifest.name, "__MSG_extensionName__");
  assert.equal(manifest.description, "__MSG_extensionDescription__");
  assert.equal(manifest.action.default_title, "__MSG_actionDefaultTitle__");
  assert.ok(englishMessages.extensionName.message);
  assert.ok(englishMessages.extensionDescription.message);
  assert.ok(englishMessages.actionDefaultTitle.message);
});

test("i18n runtime delegates fallback lookup and localizes document attributes", () => {
  const englishMessages = readMessages("en");
  const chromeApi = {
    i18n: {
      getMessage(key) {
        return englishMessages[key] ? englishMessages[key].message : "";
      },
      getUILanguage() {
        return "fr_FR";
      }
    }
  };
  const i18n = i18nModule.createI18n(chromeApi);
  const textElement = {
    textContent: "",
    getAttribute: () => "openOptions"
  };
  const placeholderElement = {
    attributes: {},
    getAttribute: () => "urlPlaceholder",
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const documentObject = {
    documentElement: { lang: "" },
    querySelectorAll(selector) {
      if (selector === "[data-i18n]") {
        return [textElement];
      }
      if (selector === "[data-i18n-placeholder]") {
        return [placeholderElement];
      }
      return [];
    }
  };

  i18n.localizeDocument(documentObject);

  assert.deepEqual(i18n.SUPPORTED_LOCALES, supportedLocales);
  assert.equal(i18n.resolveLocale("de_DE"), "de");
  assert.equal(i18n.resolveLocale("zh-TW"), "zh_TW");
  assert.equal(i18n.resolveLocale("fr_FR"), "en");
  assert.equal(documentObject.documentElement.lang, "en");
  assert.equal(textElement.textContent, "Open settings");
  assert.equal(
    placeholderElement.attributes.placeholder,
    englishMessages.urlPlaceholder.message
  );
  assert.deepEqual(i18n.createMetadataFallback(), {
    contactEmail: "Not configured",
    copyright: "Not configured"
  });
});

test("every referenced message key exists in the English fallback catalog", () => {
  const englishMessages = readMessages("en");
  const files = [
    "background.js",
    "content.js",
    "i18n.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js"
  ];
  const referencedKeys = new Set();

  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");
    for (const call of source.matchAll(/i18n\.t\(([^)]*)\)/g)) {
      for (const match of call[1].matchAll(/["']([^"']+)["']/g)) {
        referencedKeys.add(match[1]);
      }
    }
    for (const match of source.matchAll(/data-i18n(?:-[a-z-]+)?=["']([^"']+)["']/g)) {
      referencedKeys.add(match[1]);
    }
  }

  for (const key of referencedKeys) {
    assert.ok(englishMessages[key], `missing English message: ${key}`);
  }
});
