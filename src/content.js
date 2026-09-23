(() => {
  "use strict";

  const core = globalThis.TabbySelectCore;
  const i18n = globalThis.TabbySelectI18n;
  const modules = globalThis.TabbySelectContent;
  let debugLogEnabled = false;
  let traceSequence = 0;
  let pageJustLoaded = true;

  function debugLog(message, detail) {
    if (!debugLogEnabled) {
      return;
    }
    if (typeof detail === "undefined") {
      console.debug("[TabbySelect]", message);
    } else {
      console.debug("[TabbySelect]", message, detail);
    }
  }

  function createTraceId(type) {
    traceSequence += 1;
    return `${type}-${Date.now().toString(36)}-${traceSequence}`;
  }

  function debugLogWithTrace(traceId, message, detail) {
    debugLog(`[${traceId}] ${message}`, detail);
  }

  function markPageAsLoaded() {
    pageJustLoaded = false;
  }

  window.addEventListener("mousedown", markPageAsLoaded, { once: true });
  window.addEventListener("keydown", markPageAsLoaded, { once: true });

  const view = modules.createSuggestionView();
  const focusNavigator = modules.createFocusNavigator({
    isDebugEnabled: () => debugLogEnabled,
    debugLogWithTrace
  });
  const session = modules.createSelectSession({
    view,
    focusNavigator,
    isPageJustLoaded: () => pageJustLoaded,
    createTraceId,
    debugLog,
    debugLogWithTrace,
    initialCopyright: i18n.createMetadataFallback().copyright,
    noSuggestionsMessage: i18n.t("noSuggestions"),
    emptyOptionLabel: i18n.t("emptyOptionLabel")
  });
  const featureRuntime = modules.createFeatureRuntime({
    session,
    view,
    debugLog,
    loadMetadata: () =>
      core.loadMetadata(
        fetch,
        chrome.runtime.getURL("metadata.json"),
        i18n.createMetadataFallback()
      )
  });
  const activationController = modules.createActivationController({
    core,
    chromeApi: chrome,
    getCurrentUrl: () => window.location.href,
    onStateChange({ active, settings, url }) {
      debugLogEnabled = settings.debugLogEnabled;
      if (active) {
        featureRuntime.enable();
      } else {
        featureRuntime.disable();
      }
      debugLog("activation state updated", { active, url });
    }
  });

  activationController.start();
})();
