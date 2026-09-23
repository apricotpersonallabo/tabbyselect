if (typeof importScripts === "function") {
  importScripts("shared.js", "i18n.js");
}

(() => {
  const core = globalThis.TabbySelectCore;
  const i18n = globalThis.TabbySelectI18n;
  const { STORAGE_KEYS, DEFAULT_SETTINGS, URL_CHANGED_MESSAGE_TYPE } = core;
  const ACTION_ICON_ON = {
    16: "icons/on-16.png",
    32: "icons/on-32.png",
    48: "icons/on-48.png",
    128: "icons/on-128.png"
  };
  const ACTION_ICON_OFF = {
    16: "icons/off-16.png",
    32: "icons/off-32.png",
    48: "icons/off-48.png",
    128: "icons/off-128.png"
  };

  function setActionIcon(tabId, enabled) {
    chrome.action.setIcon({
      tabId,
      path: enabled ? ACTION_ICON_ON : ACTION_ICON_OFF
    });
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({
      tabId,
      title: i18n.t(enabled ? "actionTitleOn" : "actionTitleOff")
    });
  }

  function getSettings(callback) {
    chrome.storage.local.get(
      {
        ...DEFAULT_SETTINGS
      },
      (items) => {
        if (chrome.runtime.lastError) {
          callback(core.normalizeSettings(DEFAULT_SETTINGS));
          return;
        }

        callback(core.normalizeSettings(items));
      }
    );
  }

  function updateTabActionState(tabId, tabUrl) {
    if (typeof tabId !== "number") {
      return;
    }

    getSettings((settings) => {
      const enabled = core.isEnabledForUrl(tabUrl, settings);
      setActionIcon(tabId, enabled);
    });
  }

  function notifyContentScriptUrlChanged(tabId, url) {
    if (typeof tabId !== "number" || typeof url !== "string") {
      return;
    }

    chrome.tabs.sendMessage(
      tabId,
      {
        type: URL_CHANGED_MESSAGE_TYPE,
        url
      },
      () => {
        // Restricted pages and newly loading documents may not have a content script.
        // Reading lastError prevents those expected cases from producing console noise.
        void chrome.runtime.lastError;
      }
    );
  }

  function refreshTabState(tabId) {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        return;
      }

      updateTabActionState(tab.id, tab.url);
    });
  }

  function refreshAllTabs() {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError || !Array.isArray(tabs)) {
        return;
      }

      for (let i = 0; i < tabs.length; i += 1) {
        const tab = tabs[i];
        if (typeof tab.id !== "number") {
          continue;
        }

        updateTabActionState(tab.id, tab.url);
      }
    });
  }

  chrome.tabs.onActivated.addListener((activeInfo) => {
    refreshTabState(activeInfo.tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (typeof changeInfo.url === "string") {
      updateTabActionState(tabId, changeInfo.url);
      notifyContentScriptUrlChanged(tabId, changeInfo.url);
      return;
    }

    if (changeInfo.status === "complete") {
      updateTabActionState(tabId, tab && tab.url);
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (
      !changes[STORAGE_KEYS.urlAllowPatterns] &&
      !changes[STORAGE_KEYS.manualEnabledOverride]
    ) {
      return;
    }

    refreshAllTabs();
  });

  chrome.runtime.onInstalled.addListener(() => {
    refreshAllTabs();
  });

  chrome.runtime.onStartup.addListener(() => {
    refreshAllTabs();
  });
})();
