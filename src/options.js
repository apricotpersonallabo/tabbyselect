(() => {
  const core = globalThis.TabbySelectCore;
  const i18n = globalThis.TabbySelectI18n;
  const { STORAGE_KEYS, DEFAULT_SETTINGS } = core;
  const settingsFile = globalThis.TabbySelectSettingsFile;

  i18n.localizeDocument();

  const manifest = chrome.runtime.getManifest();

  const urlFilterEnabledInput = document.getElementById("urlFilterEnabled");
  const urlAllowPatternsInput = document.getElementById("urlAllowPatterns");
  const searchModeInputs = Array.from(document.querySelectorAll('input[name="searchMode"]'));
  const moveFocusAfterEnterInput = document.getElementById("moveFocusAfterEnter");
  const showSuggestionsOnMouseFocusInput = document.getElementById("showSuggestionsOnMouseFocus");
  const metaContactEmail = document.getElementById("metaContactEmail");
  const metaCopyright = document.getElementById("metaCopyright");
  const metaName = document.getElementById("metaName");
  const metaDescription = document.getElementById("metaDescription");
  const metaVersion = document.getElementById("metaVersion");
  const status = document.getElementById("status");
  const exportButton = document.getElementById("exportSettings");
  const importButton = document.getElementById("importSettings");
  const importFile = document.getElementById("importFile");
  let settingsLoaded = false;
  let busy = false;
  let pendingSaves = Promise.resolve();

  if (
    !(urlFilterEnabledInput instanceof HTMLInputElement) ||
    !(urlAllowPatternsInput instanceof HTMLTextAreaElement) ||
    !(showSuggestionsOnMouseFocusInput instanceof HTMLInputElement) ||
    !(moveFocusAfterEnterInput instanceof HTMLInputElement) ||
    !(exportButton instanceof HTMLButtonElement) ||
    !(importButton instanceof HTMLButtonElement) ||
    !(importFile instanceof HTMLInputElement) ||
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

  function updateControls() {
    const disabled = !settingsLoaded || busy;
    urlFilterEnabledInput.disabled = disabled;
    urlAllowPatternsInput.disabled = disabled || !urlFilterEnabledInput.checked;
    showSuggestionsOnMouseFocusInput.disabled = disabled;
    moveFocusAfterEnterInput.disabled = disabled;
    for (const input of searchModeInputs) {
      input.disabled = disabled;
    }
    exportButton.disabled = disabled;
    importButton.disabled = disabled;
    importFile.disabled = disabled;
  }

  function renderSettings(settings) {
    urlFilterEnabledInput.checked = settings.urlFilterEnabled;
    urlAllowPatternsInput.value = settings.urlAllowPatterns;
    showSuggestionsOnMouseFocusInput.checked = settings.showSuggestionsOnMouseFocus;
    moveFocusAfterEnterInput.checked = settings.moveFocusAfterEnter;
    for (const input of searchModeInputs) {
      input.checked = input.value === settings.searchMode;
    }
    updateControls();
  }

  function readForm() {
    return {
      urlFilterEnabled: urlFilterEnabledInput.checked,
      urlAllowPatterns: urlAllowPatternsInput.value,
      searchMode: searchModeInputs.find((input) => input.checked)?.value,
      moveFocusAfterEnter: moveFocusAfterEnterInput.checked,
      showSuggestionsOnMouseFocus: showSuggestionsOnMouseFocusInput.checked
    };
  }

  function readSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get({ ...DEFAULT_SETTINGS }, (items) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(core.normalizeSettings(items));
        }
      });
    });
  }

  function writeSettings(patch) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(patch, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async function loadSetting() {
    try {
      const settings = await readSettings();
      settingsLoaded = true;
      renderSettings(settings);
      setStatus(i18n.t("settingsLoaded"));
    } catch {
      setStatus(i18n.t("settingsLoadError"));
    }
  }

  function saveSetting(key, value) {
    pendingSaves = pendingSaves.then(() => writeSettings({ [key]: value }))
      .then(() => {
        if (!busy) setStatus(i18n.t("settingsSaved"));
      }).catch(() => {
        if (!busy) setStatus(i18n.t("settingsSaveError"));
      });
  }

  exportButton.addEventListener("click", async () => {
    if (!settingsLoaded || busy) return;
    busy = true;
    updateControls();
    let url;
    try {
      await pendingSaves;
      const toml = settingsFile.settingsToToml(readForm());
      url = URL.createObjectURL(new Blob([toml], { type: "application/toml" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "tabbyselect-settings.toml";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus(i18n.t("settingsExported"));
    } catch {
      setStatus(i18n.t("settingsExportError"));
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 0);
      busy = false;
      updateControls();
    }
  });

  importButton.addEventListener("click", () => {
    if (settingsLoaded && !busy) importFile.click();
  });

  importFile.addEventListener("change", async () => {
    const file = importFile.files?.[0];
    if (!file || !settingsLoaded || busy) return;
    busy = true;
    updateControls();
    try {
      const imported = settingsFile.parseSettingsToml(await file.text());
      await pendingSaves;
      const current = await readSettings();
      await writeSettings(imported);
      renderSettings(core.normalizeSettings({ ...current, ...imported }));
      setStatus(i18n.t("settingsImported"));
    } catch {
      setStatus(i18n.t("settingsImportError"));
    } finally {
      importFile.value = "";
      busy = false;
      updateControls();
    }
  });

  urlFilterEnabledInput.addEventListener("change", () => {
    updateControls();
    saveSetting(STORAGE_KEYS.urlFilterEnabled, urlFilterEnabledInput.checked);
  });
  urlAllowPatternsInput.addEventListener("change", () => {
    saveSetting(STORAGE_KEYS.urlAllowPatterns, urlAllowPatternsInput.value);
  });
  moveFocusAfterEnterInput.addEventListener("change", () => {
    saveSetting(STORAGE_KEYS.moveFocusAfterEnter, moveFocusAfterEnterInput.checked);
  });
  showSuggestionsOnMouseFocusInput.addEventListener("change", () => {
    saveSetting(STORAGE_KEYS.showSuggestionsOnMouseFocus, showSuggestionsOnMouseFocusInput.checked);
  });
  for (const input of searchModeInputs) {
    input.addEventListener("change", () => {
      if (input.checked) {
        saveSetting(STORAGE_KEYS.searchMode, input.value);
      }
    });
  }

  updateControls();
  loadSetting();

  core
    .loadMetadata(
      fetch,
      chrome.runtime.getURL("metadata.json"),
      i18n.createMetadataFallback()
    )
    .then((metadata) => {
      renderManifestMeta(metadata);
    });
})();
