(() => {
  "use strict";

  const namespace =
    globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});

  namespace.createFeatureRuntime = function createFeatureRuntime({
    session,
    view,
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

      document.addEventListener(
        "mousedown",
        (event) => {
          if (event.target instanceof HTMLSelectElement) {
            session.suppressForMouseDown(event.target);
          }
        },
        { capture: true, signal }
      );
      document.addEventListener(
        "focusin",
        (event) => {
          if (event.target instanceof HTMLSelectElement && !event.target.multiple) {
            session.activate(event.target);
          }
        },
        { capture: true, signal }
      );
      document.addEventListener(
        "focusout",
        (event) => {
          if (event.target instanceof HTMLSelectElement) {
            session.close(event.target);
          }
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
