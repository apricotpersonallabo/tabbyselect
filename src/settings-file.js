(function initializeSettingsFile(root, factory) {
  const api = factory(typeof module !== "undefined" && module.exports
    ? require("./shared.js") : root.TabbySelectCore);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.TabbySelectSettingsFile = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (core) => {
  "use strict";

  const fields = Object.freeze({
    url_filter_enabled: "urlFilterEnabled",
    url_allow_patterns: "urlAllowPatterns",
    search_mode: "searchMode",
    show_suggestions_on_mouse_focus: "showSuggestionsOnMouseFocus",
    move_focus_after_enter: "moveFocusAfterEnter"
  });

  function settingsToToml(value) {
    const settings = core.normalizeSettings(value);
    return [
      "# TabbySelect settings",
      `url_filter_enabled = ${settings.urlFilterEnabled}`,
      `url_allow_patterns = ${JSON.stringify(core.parseUrlPatterns(settings.urlAllowPatterns))}`,
      `search_mode = ${JSON.stringify(settings.searchMode)}`,
      `show_suggestions_on_mouse_focus = ${settings.showSuggestionsOnMouseFocus}`,
      `move_focus_after_enter = ${settings.moveFocusAfterEnter}`,
      ""
    ].join("\n");
  }

  // This deliberately reads the single-line TOML values produced above,
  // rather than accepting the full TOML language.
  function parseSettingsToml(source) {
    const imported = {};
    let section = "";
    const seen = new Set();
    for (const sourceLine of source.replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        section = sectionMatch[1];
        continue;
      }
      const pair = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.*)$/);
      if (!pair) {
        throw new Error("Invalid settings line");
      }
      const [, key, raw] = pair;
      if (section || !Object.hasOwn(fields, key)) {
        continue;
      }
      if (seen.has(key)) {
        throw new Error(`Duplicate setting: ${key}`);
      }
      seen.add(key);
      const value = raw.trim();
      let parsed;
      if (key === "url_allow_patterns") {
        parsed = JSON.parse(value);
        if (!Array.isArray(parsed) || parsed.some((pattern) =>
          typeof pattern !== "string" || /[\r\n]/.test(pattern))) {
          throw new Error("URL patterns must be an array of single-line strings");
        }
        parsed = core.parseUrlPatterns(parsed.join("\n")).join("\n");
      } else if (key === "search_mode") {
        parsed = JSON.parse(value);
        if (parsed !== "prefix" && parsed !== "contains") {
          throw new Error("Invalid search mode");
        }
      } else {
        if (value !== "true" && value !== "false") {
          throw new Error("Expected true or false");
        }
        parsed = value === "true";
      }
      imported[fields[key]] = parsed;
    }
    if (!seen.size) {
      throw new Error("No TabbySelect settings found");
    }
    return imported;
  }

  return Object.freeze({ settingsToToml, parseSettingsToml });
});
