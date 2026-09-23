(() => {
  const core = globalThis.TabbySelectCore;
  const i18n = globalThis.TabbySelectI18n;
  const { STORAGE_KEYS, DEFAULT_SETTINGS } = core;

  i18n.localizeDocument();

  const manifest = chrome.runtime.getManifest();
  const popupTitle = document.getElementById("popupTitle");
  const iconToggle = document.getElementById("iconToggleEnabled");
  const toggleHelp = document.getElementById("toggleHelp");
  const openOptionsButton = document.getElementById("openOptions");
  const status = document.getElementById("status");
  const metaContactEmail = document.getElementById("metaContactEmail");
  const metaCopyright = document.getElementById("metaCopyright");
  const metaName = document.getElementById("metaName");
  const metaDescription = document.getElementById("metaDescription");
  const metaVersion = document.getElementById("metaVersion");

  if (
    !(popupTitle instanceof HTMLElement) ||
    !(iconToggle instanceof HTMLInputElement) ||
    !(toggleHelp instanceof HTMLElement) ||
    !(openOptionsButton instanceof HTMLButtonElement) ||
    !(status instanceof HTMLElement)
  ) {
    return;
  }

  function setOptionalTextContent(element, text) {
    if (element instanceof HTMLElement) {
      element.textContent = text;
    }
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function renderManifestInfo(metadata) {
    popupTitle.textContent = manifest.name || i18n.t("actionDefaultTitle");
    setOptionalTextContent(metaContactEmail, metadata.contactEmail);
    setOptionalTextContent(metaCopyright, metadata.copyright);
    setOptionalTextContent(metaName, manifest.name || "");
    setOptionalTextContent(metaDescription, manifest.description || "");
    setOptionalTextContent(metaVersion, manifest.version || "");
  }

  function renderState(currentUrl, urlMatched, iconToggleEnabled) {
    iconToggle.disabled = !urlMatched;
    iconToggle.checked = urlMatched ? iconToggleEnabled : false;

    if (!currentUrl) {
      toggleHelp.textContent = i18n.t("popupTabUnavailable");
      return;
    }

    if (!urlMatched) {
      toggleHelp.textContent = i18n.t("popupUrlNotMatched");
      return;
    }

    toggleHelp.textContent = iconToggleEnabled
      ? i18n.t("popupEnabled")
      : i18n.t("popupDisabled");
  }

  function loadState() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        setStatus(i18n.t("activeTabLoadError"));
        return;
      }

      const activeTab = Array.isArray(tabs) ? tabs[0] : null;
      const currentUrl = activeTab && typeof activeTab.url === "string" ? activeTab.url : "";

      chrome.storage.local.get(
        { ...DEFAULT_SETTINGS },
        (items) => {
          if (chrome.runtime.lastError) {
            setStatus(i18n.t("settingsLoadError"));
            return;
          }

          const settings = core.normalizeSettings(items);
          const urlMatched = core.isUrlAllowed(currentUrl, settings.urlAllowPatterns);
          renderState(currentUrl, urlMatched, settings.manualEnabledOverride);
          setStatus("");
        }
      );
    });
  }

  function saveToggle() {
    chrome.storage.local.set(
      { [STORAGE_KEYS.manualEnabledOverride]: iconToggle.checked },
      () => {
        if (chrome.runtime.lastError) {
          setStatus(i18n.t("toggleSaveError"));
          return;
        }

        setStatus(i18n.t("toggleSaved"));
        loadState();
      }
    );
  }

  function openOptionsPage() {
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) {
        setStatus(i18n.t("optionsOpenError"));
      }
    });
  }

  iconToggle.addEventListener("change", saveToggle);
  openOptionsButton.addEventListener("click", openOptionsPage);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (
      !changes[STORAGE_KEYS.manualEnabledOverride] &&
      !changes[STORAGE_KEYS.urlAllowPatterns]
    ) {
      return;
    }

    loadState();
  });

  core
    .loadMetadata(
      fetch,
      chrome.runtime.getURL("metadata.json"),
      i18n.createMetadataFallback()
    )
    .then(renderManifestInfo);
  loadState();
})();
