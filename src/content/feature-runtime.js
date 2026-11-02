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

      document.addEventListener("pointerdown", (event) => session.handlePointerDown(event), {
        capture: true, signal
      });
      document.addEventListener("mousedown", (event) => session.handleMouseDown(event), {
        capture: true, signal
      });
      document.addEventListener("pointerup", () => session.handlePointerEnd(), {
        capture: true, signal
      });
      document.addEventListener("pointercancel", () => session.handlePointerEnd(), {
        capture: true, signal
      });
      document.addEventListener("mouseup", () => session.handlePointerEnd(), {
        capture: true, signal
      });
      document.addEventListener("click", (event) => session.handleClick(event), {
        capture: true, signal
      });
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
