(() => {
  "use strict";

  const namespace =
    globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});

  namespace.createActivationController = function createActivationController({
    core,
    chromeApi,
    onStateChange
  }) {
    let started = false;
    let settingsLoaded = false;
    let settings = core.normalizeSettings(core.DEFAULT_SETTINGS);
    let currentUrl = null;
    let lifecycle = 0;
    let urlRevision = 0;
    let pendingSettings = {};

    function emit() {
      onStateChange({
        active: settingsLoaded && core.isEnabledForUrl(currentUrl, settings),
        settings,
        url: currentUrl
      });
    }

    function handleStorageChanged(changes, areaName) {
      if (!started || areaName !== "local") {
        return;
      }

      const relevantKeys = Object.values(core.STORAGE_KEYS);
      if (!relevantKeys.some((key) => changes[key])) {
        return;
      }

      const next = { ...settings };
      for (const key of relevantKeys) {
        if (changes[key]) {
          next[key] = changes[key].newValue;
          if (!settingsLoaded) {
            pendingSettings[key] = changes[key].newValue;
          }
        }
      }
      settings = core.normalizeSettings(next);
      emit();
    }

    function handleRuntimeMessage(message) {
      if (!started || !message || message.type !== core.URL_CHANGED_MESSAGE_TYPE) {
        return;
      }
      urlRevision += 1;
      currentUrl = typeof message.url === "string" ? message.url : null;
      emit();
    }

    function start() {
      if (started) {
        return;
      }
      started = true;
      const currentLifecycle = ++lifecycle;
      const initialUrlRevision = urlRevision;
      settingsLoaded = false;
      settings = core.normalizeSettings(core.DEFAULT_SETTINGS);
      pendingSettings = {};
      currentUrl = null;
      chromeApi.storage.onChanged.addListener(handleStorageChanged);
      chromeApi.runtime.onMessage.addListener(handleRuntimeMessage);
      chromeApi.storage.local.get({ ...core.DEFAULT_SETTINGS }, (items) => {
        const failed = Boolean(chromeApi.runtime.lastError);
        if (!started || lifecycle !== currentLifecycle) {
          return;
        }
        if (failed) {
          emit();
          return;
        }
        settings = core.normalizeSettings({ ...items, ...pendingSettings });
        pendingSettings = {};
        settingsLoaded = true;
        emit();
      });
      chromeApi.runtime.sendMessage({ type: core.GET_TOP_URL_MESSAGE_TYPE }, (response) => {
        const failed = Boolean(chromeApi.runtime.lastError);
        if (!started || lifecycle !== currentLifecycle || urlRevision !== initialUrlRevision) {
          return;
        }
        currentUrl = !failed && response && typeof response.url === "string"
          ? response.url
          : null;
        emit();
      });
    }

    function destroy() {
      if (!started) {
        return;
      }
      started = false;
      lifecycle += 1;
      chromeApi.storage.onChanged.removeListener(handleStorageChanged);
      chromeApi.runtime.onMessage.removeListener(handleRuntimeMessage);
      settingsLoaded = false;
      currentUrl = null;
      emit();
    }

    return Object.freeze({ start, destroy });
  };
})();
