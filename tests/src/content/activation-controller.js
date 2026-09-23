(() => {
  "use strict";

  const namespace =
    globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});

  namespace.createActivationController = function createActivationController({
    core,
    chromeApi,
    getCurrentUrl,
    onStateChange
  }) {
    let started = false;
    let settingsLoaded = false;
    let settings = core.normalizeSettings(core.DEFAULT_SETTINGS);
    let currentUrl = getCurrentUrl();

    function emit() {
      onStateChange({
        active: settingsLoaded && core.isEnabledForUrl(currentUrl, settings),
        settings,
        url: currentUrl
      });
    }

    function handleStorageChanged(changes, areaName) {
      if (areaName !== "local") {
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
        }
      }
      settings = core.normalizeSettings(next);
      settingsLoaded = true;
      emit();
    }

    function handleRuntimeMessage(message) {
      if (!message || message.type !== core.URL_CHANGED_MESSAGE_TYPE) {
        return;
      }
      currentUrl = typeof message.url === "string" ? message.url : getCurrentUrl();
      emit();
    }

    function start() {
      if (started) {
        return;
      }
      started = true;
      chromeApi.storage.onChanged.addListener(handleStorageChanged);
      chromeApi.runtime.onMessage.addListener(handleRuntimeMessage);
      chromeApi.storage.local.get({ ...core.DEFAULT_SETTINGS }, (items) => {
        if (!started || chromeApi.runtime.lastError) {
          emit();
          return;
        }
        settings = core.normalizeSettings(items);
        settingsLoaded = true;
        currentUrl = getCurrentUrl();
        emit();
      });
    }

    function destroy() {
      if (!started) {
        return;
      }
      started = false;
      chromeApi.storage.onChanged.removeListener(handleStorageChanged);
      chromeApi.runtime.onMessage.removeListener(handleRuntimeMessage);
      settingsLoaded = false;
      emit();
    }

    return Object.freeze({ start, destroy });
  };
})();
