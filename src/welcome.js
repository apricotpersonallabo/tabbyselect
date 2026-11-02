(() => {
  "use strict";

  const i18n = globalThis.TabbySelectI18n;
  i18n.localizeDocument();

  document.getElementById("settingsButton").addEventListener("click", () => {
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) {
        document.getElementById("status").textContent = i18n.t("optionsOpenError");
      }
    });
  });
  document.getElementById("closeButton").addEventListener("click", () => window.close());
})();
