(function initializeTabbySelectI18n(root, factory) {
  const api = factory(root.chrome);
  const exported = Object.freeze({ ...api, createI18n: factory });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  root.TabbySelectI18n = exported;
})(typeof globalThis !== "undefined" ? globalThis : this, (chromeApi) => {
  "use strict";

  const DEFAULT_LOCALE = "en";
  const SUPPORTED_LOCALES = Object.freeze([
    "de",
    "en",
    "es",
    "ja",
    "ko",
    "zh_CN",
    "zh_TW"
  ]);

  function t(key, substitutions) {
    if (
      !chromeApi ||
      !chromeApi.i18n ||
      typeof chromeApi.i18n.getMessage !== "function"
    ) {
      return "";
    }

    return chromeApi.i18n.getMessage(key, substitutions) || "";
  }

  function getUiLanguage() {
    if (
      chromeApi &&
      chromeApi.i18n &&
      typeof chromeApi.i18n.getUILanguage === "function"
    ) {
      return chromeApi.i18n.getUILanguage() || DEFAULT_LOCALE;
    }

    return DEFAULT_LOCALE;
  }

  function resolveLocale(language = getUiLanguage()) {
    const normalized = typeof language === "string" ? language.replace(/-/g, "_") : "";
    const exactMatch = SUPPORTED_LOCALES.find(
      (locale) => locale.toLowerCase() === normalized.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch;
    }

    const baseLanguage = normalized.split("_")[0].toLowerCase();
    if (["de", "en", "es", "ja", "ko"].includes(baseLanguage)) {
      return baseLanguage;
    }

    return DEFAULT_LOCALE;
  }

  function localizeAttribute(documentObject, selector, attribute, messageAttribute) {
    for (const element of documentObject.querySelectorAll(selector)) {
      const message = t(element.getAttribute(messageAttribute));
      if (message) {
        element.setAttribute(attribute, message);
      }
    }
  }

  function localizeDocument(
    documentObject = typeof document !== "undefined" ? document : null
  ) {
    if (!documentObject || !documentObject.documentElement) {
      return;
    }

    documentObject.documentElement.lang = resolveLocale().replace(/_/g, "-");

    for (const element of documentObject.querySelectorAll("[data-i18n]")) {
      const message = t(element.getAttribute("data-i18n"));
      if (message) {
        element.textContent = message;
      }
    }

    localizeAttribute(
      documentObject,
      "[data-i18n-placeholder]",
      "placeholder",
      "data-i18n-placeholder"
    );
    localizeAttribute(
      documentObject,
      "[data-i18n-aria-label]",
      "aria-label",
      "data-i18n-aria-label"
    );
    localizeAttribute(
      documentObject,
      "[data-i18n-title]",
      "title",
      "data-i18n-title"
    );
  }

  function createMetadataFallback() {
    const fallback = t("notConfigured");
    return {
      contactEmail: fallback,
      copyright: fallback
    };
  }

  return Object.freeze({
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    t,
    getUiLanguage,
    resolveLocale,
    localizeDocument,
    createMetadataFallback
  });
});
