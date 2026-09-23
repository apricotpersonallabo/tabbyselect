(() => {
  const core = globalThis.TabbySelectCore;
  const i18n = globalThis.TabbySelectI18n;
  const { STORAGE_KEYS, DEFAULT_SETTINGS } = core;

  i18n.localizeDocument();

  const manifest = chrome.runtime.getManifest();

  const urlAllowPatternsInput = document.getElementById("urlAllowPatterns");
  const metaContactEmail = document.getElementById("metaContactEmail");
  const metaCopyright = document.getElementById("metaCopyright");
  const metaName = document.getElementById("metaName");
  const metaDescription = document.getElementById("metaDescription");
  const metaVersion = document.getElementById("metaVersion");
  const status = document.getElementById("status");

  if (
    !(urlAllowPatternsInput instanceof HTMLTextAreaElement) ||
    !(status instanceof HTMLElement)
  ) {
    return;
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function setOptionalTextContent(element, text) {
    if (element instanceof HTMLElement) {
      element.textContent = text;
    }
  }

  function renderManifestMeta(metadata) {
    setOptionalTextContent(metaContactEmail, metadata.contactEmail);
    setOptionalTextContent(metaCopyright, metadata.copyright);
    setOptionalTextContent(metaName, manifest.name || "");
    setOptionalTextContent(metaDescription, manifest.description || "");
    setOptionalTextContent(metaVersion, manifest.version || "");
  }

  function loadSetting() {
    chrome.storage.local.get(
      { ...DEFAULT_SETTINGS },
      (items) => {
        if (chrome.runtime.lastError) {
          setStatus(i18n.t("settingsLoadError"));
          return;
        }

        const settings = core.normalizeSettings(items);
        urlAllowPatternsInput.value = settings.urlAllowPatterns;
        setStatus(i18n.t("settingsLoaded"));
      }
    );
  }

  function saveSetting() {
    chrome.storage.local.set(
      {
        [STORAGE_KEYS.urlAllowPatterns]: urlAllowPatternsInput.value
      },
      () => {
        if (chrome.runtime.lastError) {
          setStatus(i18n.t("settingsSaveError"));
          return;
        }

        setStatus(i18n.t("settingsSaved"));
      }
    );
  }

  urlAllowPatternsInput.addEventListener("change", saveSetting);

  core
    .loadMetadata(
      fetch,
      chrome.runtime.getURL("metadata.json"),
      i18n.createMetadataFallback()
    )
    .then((metadata) => {
      renderManifestMeta(metadata);
      loadSetting();
    });
})();
