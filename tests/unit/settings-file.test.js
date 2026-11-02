const test = require("node:test");
const assert = require("node:assert/strict");
const { settingsToToml, parseSettingsToml } = require("../../src/settings-file.js");

test("round trips all portable settings and normalizes URL lines", () => {
  for (const urlFilterEnabled of [true, false]) {
    for (const searchMode of ["prefix", "contains"]) {
      for (const moveFocusAfterEnter of [true, false]) {
        for (const showSuggestionsOnMouseFocus of [true, false]) {
          const urls = ['https://example.com/日本語/*', 'https://example.com/"quote"/\\path#hash'];
          const settings = { urlFilterEnabled, searchMode, showSuggestionsOnMouseFocus, moveFocusAfterEnter,
            urlAllowPatterns: `  ${urls[0]}  \r\n\n${urls[1]}\n`,
            manualEnabledOverride: false, debugLogEnabled: true };
          const toml = settingsToToml(settings);
          assert.ok(toml.startsWith("# TabbySelect settings\n"));
          assert.equal(toml.includes("manualEnabledOverride"), false);
          assert.equal(toml.includes("debugLogEnabled"), false);
          assert.deepEqual(parseSettingsToml(toml), {
            urlFilterEnabled, searchMode, showSuggestionsOnMouseFocus, moveFocusAfterEnter,
            urlAllowPatterns: urls.join("\n")
          });
        }
      }
    }
  }
});

test("exports default values and an empty URL list", () => {
  const toml = settingsToToml({});
  assert.match(toml, /url_allow_patterns = \[\]/);
  assert.deepEqual(parseSettingsToml(toml), {
    urlFilterEnabled: false, urlAllowPatterns: "", searchMode: "contains",
    showSuggestionsOnMouseFocus: true, moveFocusAfterEnter: true
  });
});

test("imports partial files and ignores unknown and section-scoped settings", () => {
  assert.deepEqual(parseSettingsToml('\uFEFF# comment\r\n\r\nsearch_mode = "prefix"\r\n'),
    { searchMode: "prefix" });
  assert.deepEqual(parseSettingsToml('unknown = 42\nurl_filter_enabled = true\n' +
    'manualEnabledOverride = false\ndebugLogEnabled = true\n' +
    '[other]\nsearch_mode = "invalid"\n'), { urlFilterEnabled: true });
  assert.deepEqual(parseSettingsToml('url_allow_patterns = ["  https://a/*  ", "", "  "]'),
    { urlAllowPatterns: "https://a/*" });
});

test("rejects malformed, duplicate, unsupported, and empty files", () => {
  for (const source of [
    "", "# comment only", "unknown = true", '[other]\nsearch_mode = "prefix"',
    "url_filter_enabled = 1", 'url_filter_enabled = "true"',
    "url_filter_enabled = True", "url_filter_enabled = false # inline comment",
    "move_focus_after_enter = null", 'move_focus_after_enter = "false"',
    "move_focus_after_enter = 0", "move_focus_after_enter = true\nmove_focus_after_enter = false",
    "show_suggestions_on_mouse_focus = null", "search_mode = prefix",
    'search_mode = "suffix"', "search_mode = 0", "search_mode = true",
    "url_allow_patterns = {}", 'url_allow_patterns = "https://a/*"',
    "url_allow_patterns = [42]", 'url_allow_patterns = ["https://a/\\n*"]',
    'url_allow_patterns = ["https://a/\\r*"]', "url_allow_patterns = [", "url_filter_enabled =",
    "url_filter_enabled = true\nurl_filter_enabled = false", 'search_mode = "prefix"\nsearch_mode = "prefix"',
    'search_mode = "prefix"\nurl_filter_enabled = invalid',
    "invalid line"
  ]) {
    assert.throws(() => parseSettingsToml(source), undefined, source);
  }
});
