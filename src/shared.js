(function initializeTabbySelectCore(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.TabbySelectCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const STORAGE_KEYS = Object.freeze({
    debugLogEnabled: "debugLogEnabled",
    urlAllowPatterns: "urlAllowPatterns",
    manualEnabledOverride: "manualEnabledOverride"
  });
  const DEFAULT_SETTINGS = Object.freeze({
    debugLogEnabled: false,
    urlAllowPatterns: "",
    manualEnabledOverride: true
  });
  const DEFAULT_METADATA = Object.freeze({
    contactEmail: "Not configured",
    copyright: "Not configured"
  });
  const URL_CHANGED_MESSAGE_TYPE = "tabby-select:url-changed";

  function normalizeSettings(value) {
    const input = value && typeof value === "object" ? value : {};
    return {
      debugLogEnabled: Boolean(input[STORAGE_KEYS.debugLogEnabled]),
      urlAllowPatterns:
        typeof input[STORAGE_KEYS.urlAllowPatterns] === "string"
          ? input[STORAGE_KEYS.urlAllowPatterns]
          : DEFAULT_SETTINGS.urlAllowPatterns,
      manualEnabledOverride:
        typeof input[STORAGE_KEYS.manualEnabledOverride] === "undefined"
          ? DEFAULT_SETTINGS.manualEnabledOverride
          : Boolean(input[STORAGE_KEYS.manualEnabledOverride])
    };
  }

  function normalizeMetadata(value, fallback = DEFAULT_METADATA) {
    const input = value && typeof value === "object" ? value : {};
    const normalizedFallback = {
      contactEmail:
        fallback && typeof fallback.contactEmail === "string"
          ? fallback.contactEmail
          : DEFAULT_METADATA.contactEmail,
      copyright:
        fallback && typeof fallback.copyright === "string"
          ? fallback.copyright
          : DEFAULT_METADATA.copyright
    };

    return {
      contactEmail:
        typeof input.contactEmail === "string" && input.contactEmail.trim()
          ? input.contactEmail
          : normalizedFallback.contactEmail,
      copyright:
        typeof input.copyright === "string" && input.copyright.trim()
          ? input.copyright
          : normalizedFallback.copyright
    };
  }

  async function loadMetadata(fetcher, resourceUrl, fallback = DEFAULT_METADATA) {
    try {
      const response = await fetcher(resourceUrl);
      if (!response || !response.ok) {
        return normalizeMetadata(null, fallback);
      }

      return normalizeMetadata(await response.json(), fallback);
    } catch {
      return normalizeMetadata(null, fallback);
    }
  }

  function escapeForRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function wildcardPatternToRegExp(pattern) {
    const escaped = escapeForRegex(pattern).replace(/\\\*/g, ".*");
    return new RegExp(`^${escaped}$`);
  }

  function parseUrlPatterns(raw) {
    if (typeof raw !== "string") {
      return [];
    }

    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function isSupportedUrl(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url);
  }

  function isUrlAllowed(url, rawPatterns) {
    if (!isSupportedUrl(url)) {
      return false;
    }

    const patterns = parseUrlPatterns(rawPatterns);
    if (patterns.length === 0) {
      return true;
    }

    return patterns.some((pattern) =>
      wildcardPatternToRegExp(pattern).test(url)
    );
  }

  function isEnabledForUrl(url, settings) {
    const normalized = normalizeSettings(settings);
    return (
      normalized.manualEnabledOverride &&
      isUrlAllowed(url, normalized.urlAllowPatterns)
    );
  }

  return Object.freeze({
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    DEFAULT_METADATA,
    URL_CHANGED_MESSAGE_TYPE,
    normalizeSettings,
    normalizeMetadata,
    loadMetadata,
    escapeForRegex,
    wildcardPatternToRegExp,
    parseUrlPatterns,
    isSupportedUrl,
    isUrlAllowed,
    isEnabledForUrl
  });
});
