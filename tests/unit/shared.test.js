const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../../src/shared.js");

test("normalizes settings with stable defaults", () => {
  assert.deepEqual(core.normalizeSettings(null), core.DEFAULT_SETTINGS);
  assert.deepEqual(
    core.normalizeSettings({
      debugLogEnabled: 1,
      urlAllowPatterns: ["invalid"],
      manualEnabledOverride: 0
    }),
    {
      debugLogEnabled: true,
      urlAllowPatterns: "",
      manualEnabledOverride: false,
      searchMode: "prefix"
    }
  );
});

test("defaults missing and invalid search modes to prefix", () => {
  for (const searchMode of [undefined, null, "", "suffix", "CONTAINS", 1, true]) {
    assert.equal(core.normalizeSettings({ searchMode }).searchMode, "prefix");
  }
  assert.equal(core.normalizeSettings({ searchMode: "prefix" }).searchMode, "prefix");
  assert.equal(core.normalizeSettings({ searchMode: "contains" }).searchMode, "contains");
});

test("matches prefix and contains queries with the same case and whitespace rules", () => {
  for (const [text, query, mode, expected] of [
    ["Japan", "Ja", "prefix", true],
    ["Japan", "pan", "prefix", false],
    ["Japan", "pan", "contains", true],
    ["Japan", "Ja", "contains", true],
    [" Japan ", " jA ", "prefix", true],
    [" Japan ", " PAN ", "contains", true],
    ["Japan", "zzz", "contains", false],
    ["Japan", "Japanese", "contains", false],
    ["", "pan", "contains", false],
    ["", "", "prefix", true],
    ["Japan", "  ", "contains", true],
    ["New Japan", "Japan", "contains", true],
    ["New Japan", "Japan", "prefix", false],
    ["Japan", "pan", "invalid", false],
    ["Japan", "pan", undefined, false]
  ]) {
    assert.equal(core.matchesSearchText(text, query, mode), expected,
      JSON.stringify({ text, query, mode }));
  }
});

test("parses URL patterns and applies HTTP(S)-only wildcard matching", () => {
  const patterns = "  https://example.com/*  \n\nhttps://*.example.org/forms/*\r\n";
  assert.deepEqual(core.parseUrlPatterns(patterns), [
    "https://example.com/*",
    "https://*.example.org/forms/*"
  ]);
  assert.equal(core.isUrlAllowed("https://example.com/a?b=1", patterns), true);
  assert.equal(core.isUrlAllowed("https://sub.example.org/forms/42", patterns), true);
  assert.equal(core.isUrlAllowed("https://sub.example.org/other/42", patterns), false);
  assert.equal(core.isUrlAllowed("file:///tmp/form.html", "*"), false);
  assert.equal(core.isUrlAllowed("chrome://extensions", "*"), false);
  assert.equal(core.isUrlAllowed("https://example.com/", ""), true);
});

test("combines URL matching and the manual override", () => {
  const settings = {
    debugLogEnabled: false,
    urlAllowPatterns: "https://example.com/*",
    manualEnabledOverride: true
  };
  assert.equal(core.isEnabledForUrl("https://example.com/form", settings), true);
  assert.equal(
    core.isEnabledForUrl("https://example.com/form", {
      ...settings,
      manualEnabledOverride: false
    }),
    false
  );
});

test("normalizes metadata with one shared fallback", () => {
  assert.deepEqual(core.normalizeMetadata(null), core.DEFAULT_METADATA);
  assert.deepEqual(
    core.normalizeMetadata({ contactEmail: " test@example.com ", copyright: " " }),
    {
      contactEmail: " test@example.com ",
      copyright: core.DEFAULT_METADATA.copyright
    }
  );
});

test("loads and normalizes metadata through an injected fetcher", async () => {
  const loaded = await core.loadMetadata(async (url) => {
    assert.equal(url, "extension://metadata.json");
    return {
      ok: true,
      async json() {
        return { contactEmail: "owner@example.com", copyright: "Copyright" };
      }
    };
  }, "extension://metadata.json");
  assert.deepEqual(loaded, {
    contactEmail: "owner@example.com",
    copyright: "Copyright"
  });

  assert.deepEqual(
    await core.loadMetadata(async () => ({ ok: false }), "missing"),
    core.DEFAULT_METADATA
  );
  assert.deepEqual(
    await core.loadMetadata(async () => {
      throw new Error("network failure");
    }, "missing"),
    core.DEFAULT_METADATA
  );
});
