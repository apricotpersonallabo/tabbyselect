(() => {
  "use strict";

  const namespace =
    globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});

  namespace.createFeatureRuntime = function createFeatureRuntime({
    session,
    view,
    pickerController,
    loadMetadata,
    debugLog
  }) {
    let enabled = false;
    let eventAbortController = null;
    let metadataPromise = null;

    function enable() {
      if (enabled) {
        return;
      }
      enabled = true;
      eventAbortController = new AbortController();
      const signal = eventAbortController.signal;
      pickerController.start();

      document.addEventListener(
        "mousedown",
        (event) => {
          // Listbox clicks target an option rather than the select itself.
          const select = event.target instanceof Element ? event.target.closest("select") : null;
          if (select instanceof HTMLSelectElement) {
            session.suppressForMouseDown(select);
          }
        },
        { capture: true, signal }
      );
      document.addEventListener(
        "focusin",
        (event) => {
          session.handleFocusin(event);
        },
        { capture: true, signal }
      );
      document.addEventListener(
        "focusout",
        (event) => {
          session.handleFocusout(event);
        },
        { capture: true, signal }
      );
      document.addEventListener("keydown", (event) => session.handleKeydown(event), {
        capture: true,
        signal
      });
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) {
            session.destroy();
          }
        },
        { signal }
      );
      window.addEventListener("blur", () => session.destroy(), { signal });
      window.addEventListener("scroll", () => session.reposition(), {
        capture: true,
        signal
      });
      window.addEventListener("resize", () => session.reposition(), { signal });

      if (!metadataPromise) {
        metadataPromise = loadMetadata();
      }
      metadataPromise.then((metadata) => {
        if (enabled) {
          session.setCopyright(metadata.copyright);
        }
      });
      debugLog("feature runtime enabled");
    }

    function disable() {
      pickerController.stop();
      if (!enabled) {
        view.destroy();
        return;
      }
      enabled = false;
      if (eventAbortController) {
        eventAbortController.abort();
        eventAbortController = null;
      }
      session.destroy();
      view.destroy();
      debugLog("feature runtime disabled");
    }

    function isEnabled() {
      return enabled;
    }

    return Object.freeze({ enable, disable, isEnabled });
  };
})();
