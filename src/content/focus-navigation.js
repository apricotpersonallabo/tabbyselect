(() => {
  "use strict";

  const namespace =
    globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});
  const TAB_OUT_RETRY_FRAMES = 3;

  namespace.createFocusNavigator = function createFocusNavigator({
    isDebugEnabled,
    debugLogWithTrace
  }) {
    function isTabbable(element) {
      if (!(element instanceof HTMLElement) || element.tabIndex < 0) {
        return false;
      }
      if (element.matches(":disabled") || element.closest("[inert]")) {
        return false;
      }
      if (element instanceof HTMLInputElement && element.type === "hidden") {
        return false;
      }
      if (element.getClientRects().length === 0) {
        return false;
      }

      const style = window.getComputedStyle(element);
      return style.visibility !== "hidden" && style.display !== "none";
    }

    function getTabbableElements() {
      const selector =
        'a[href], area[href], input, select, textarea, button, iframe, [tabindex], [contenteditable="true"]';
      const candidates = Array.from(document.querySelectorAll(selector)).filter(isTabbable);
      const radioGroups = [];

      for (const element of candidates) {
        if (
          !(element instanceof HTMLInputElement) ||
          element.type !== "radio" ||
          !element.name
        ) {
          continue;
        }

        let group = radioGroups.find(
          (candidate) =>
            candidate.name === element.name &&
            candidate.form === element.form &&
            candidate.root === element.getRootNode()
        );
        if (!group) {
          group = {
            name: element.name,
            form: element.form,
            root: element.getRootNode(),
            radios: []
          };
          radioGroups.push(group);
        }
        group.radios.push(element);
      }

      const radioStops = new Set(
        radioGroups.map((group) => group.radios.find((radio) => radio.checked) || group.radios[0])
      );
      const tabStops = candidates.filter(
        (element) =>
          !(element instanceof HTMLInputElement) ||
          element.type !== "radio" ||
          !element.name ||
          radioStops.has(element)
      );

      return tabStops
        .map((element, documentIndex) => ({ element, documentIndex }))
        .sort((a, b) => {
          const aPositive = a.element.tabIndex > 0;
          const bPositive = b.element.tabIndex > 0;
          if (aPositive && bPositive && a.element.tabIndex !== b.element.tabIndex) {
            return a.element.tabIndex - b.element.tabIndex;
          }
          if (aPositive !== bPositive) {
            return aPositive ? -1 : 1;
          }
          return a.documentIndex - b.documentIndex;
        })
        .map(({ element }) => element);
    }

    function createSnapshot(currentElement) {
      const tabbables = getTabbableElements();
      const currentIndex = tabbables.indexOf(currentElement);
      return {
        currentIndex,
        preferredNext: currentIndex >= 0 ? tabbables[currentIndex + 1] || null : null
      };
    }

    function logFocusSettle(traceId, label, currentElement, preferredNext) {
      if (!isDebugEnabled()) {
        return;
      }

      const tabbables = getTabbableElements();
      debugLogWithTrace(traceId, "focus settle", {
        label,
        activeElement: document.activeElement && document.activeElement.tagName,
        activeEqualsCurrent: document.activeElement === currentElement,
        activeEqualsPreferred: document.activeElement === preferredNext,
        currentIndex: tabbables.indexOf(currentElement),
        preferredIndex: tabbables.indexOf(preferredNext),
        tabbableCount: tabbables.length
      });
    }

    function moveAfterEnter(currentElement, snapshot, traceId) {
      const preferredNext = snapshot.preferredNext;

      const tryMove = (attempt) => {
        if (preferredNext && preferredNext.isConnected && isTabbable(preferredNext)) {
          preferredNext.focus();
          if (document.activeElement === preferredNext) {
            logFocusSettle(traceId, `attempt-${attempt}`, currentElement, preferredNext);
            return;
          }
        }

        if (
          document.activeElement !== currentElement &&
          document.activeElement instanceof HTMLElement &&
          document.activeElement !== document.body &&
          document.activeElement !== document.documentElement
        ) {
          return;
        }

        const tabbables = getTabbableElements();
        const currentIndex = tabbables.indexOf(currentElement);
        const fallbackIndex = currentIndex >= 0 ? currentIndex + 1 : snapshot.currentIndex;
        const candidate = tabbables[fallbackIndex] || null;
        if (candidate) {
          candidate.focus();
          if (document.activeElement === candidate) {
            logFocusSettle(traceId, `fallback-${attempt}`, currentElement, candidate);
            return;
          }
        } else if (currentElement.isConnected) {
          currentElement.blur();
          return;
        }

        if (attempt >= TAB_OUT_RETRY_FRAMES) {
          if (currentElement.isConnected) {
            currentElement.blur();
          }
          return;
        }

        window.requestAnimationFrame(() => tryMove(attempt + 1));
      };

      window.requestAnimationFrame(() => tryMove(0));
    }

    return Object.freeze({ isTabbable, getTabbableElements, createSnapshot, moveAfterEnter });
  };
})();
