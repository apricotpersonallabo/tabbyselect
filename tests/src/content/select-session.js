(() => {
  "use strict";

  const namespace =
    globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});

  namespace.createSelectSession = function createSelectSession({
    view,
    focusNavigator,
    isPageJustLoaded,
    createTraceId,
    debugLog,
    debugLogWithTrace,
    initialCopyright,
    noSuggestionsMessage,
    emptyOptionLabel
  }) {
    let activeSelect = null;
    let query = "";
    let pendingIndex = -1;
    let suppressUiForCurrentFocus = false;
    let mouseSuppressedSelect = null;
    let refreshRafId = null;
    let optionObserver = null;
    let removalObserver = null;
    let copyright = initialCopyright;

    function normalize(text) {
      return text.trim().toLowerCase();
    }

    function getOptionText(option) {
      return (option.textContent || option.label || "").trim();
    }

    function isOptionSelectable(option) {
      return (
        option instanceof HTMLOptionElement &&
        !option.disabled &&
        !(
          option.parentElement instanceof HTMLOptGroupElement &&
          option.parentElement.disabled
        )
      );
    }

    function getSuggestions(select, rawQuery) {
      const normalizedQuery = normalize(rawQuery);
      const suggestions = [];
      for (let index = 0; index < select.options.length; index += 1) {
        const option = select.options[index];
        if (!isOptionSelectable(option)) {
          continue;
        }
        const text = getOptionText(option);
        if (!normalizedQuery || (text && normalize(text).startsWith(normalizedQuery))) {
          suggestions.push({ index, text: text || emptyOptionLabel });
        }
      }
      return suggestions;
    }

    function findMatchingOption(select, rawQuery) {
      const normalizedQuery = normalize(rawQuery);
      if (!normalizedQuery) {
        return -1;
      }

      const start = Math.max(0, select.selectedIndex + 1);
      for (let offset = 0; offset < select.options.length; offset += 1) {
        const index = (start + offset) % select.options.length;
        const option = select.options[index];
        if (!isOptionSelectable(option)) {
          continue;
        }
        const text = normalize(getOptionText(option));
        if (text.startsWith(normalizedQuery)) {
          return index;
        }
      }
      return -1;
    }

    function cancelRefresh() {
      if (refreshRafId !== null) {
        window.cancelAnimationFrame(refreshRafId);
        refreshRafId = null;
      }
    }

    function disconnectObservers() {
      if (optionObserver) {
        optionObserver.disconnect();
        optionObserver = null;
      }
      if (removalObserver) {
        removalObserver.disconnect();
        removalObserver = null;
      }
    }

    function render() {
      if (!(activeSelect instanceof HTMLSelectElement) || suppressUiForCurrentFocus) {
        view.hide();
        return;
      }

      view.show({
        select: activeSelect,
        query,
        suggestions: getSuggestions(activeSelect, query),
        pendingIndex,
        copyright,
        emptyMessage: noSuggestionsMessage
      });
    }

    function updatePendingSelection() {
      pendingIndex = query ? findMatchingOption(activeSelect, query) : -1;
    }

    function scheduleRefresh() {
      cancelRefresh();
      refreshRafId = window.requestAnimationFrame(() => {
        refreshRafId = null;
        if (
          activeSelect instanceof HTMLSelectElement &&
          document.activeElement === activeSelect &&
          !suppressUiForCurrentFocus
        ) {
          updatePendingSelection();
          render();
        }
      });
    }

    function close(select = activeSelect) {
      if (!(activeSelect instanceof HTMLSelectElement) || select !== activeSelect) {
        return;
      }

      const closingSelect = activeSelect;
      cancelRefresh();
      disconnectObservers();
      view.hide();
      activeSelect = null;
      query = "";
      pendingIndex = -1;
      suppressUiForCurrentFocus = false;
      if (mouseSuppressedSelect === closingSelect) {
        mouseSuppressedSelect = null;
      }
    }

    function startObservers(select) {
      optionObserver = new MutationObserver((mutations) => {
        if (
          mutations.length &&
          activeSelect === select &&
          document.activeElement === select &&
          !suppressUiForCurrentFocus
        ) {
          debugLog("active select options mutated", { mutationCount: mutations.length });
          scheduleRefresh();
        }
      });
      optionObserver.observe(select, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["label", "disabled", "value", "selected"]
      });

      removalObserver = new MutationObserver(() => {
        if (activeSelect === select && !select.isConnected) {
          close(select);
        }
      });
      removalObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    function activate(select, { fromKeydown = false } = {}) {
      if (!(select instanceof HTMLSelectElement) || select.multiple) {
        return;
      }

      if (activeSelect !== select) {
        if (activeSelect) {
          close(activeSelect);
        }
        activeSelect = select;
        query = "";
        pendingIndex = -1;
        suppressUiForCurrentFocus =
          mouseSuppressedSelect === select || (!fromKeydown && isPageJustLoaded());
        if (mouseSuppressedSelect === select) {
          mouseSuppressedSelect = null;
        }
        startObservers(select);
      }

      render();
      scheduleRefresh();
    }

    function suppressForMouseDown(select) {
      if (!(select instanceof HTMLSelectElement)) {
        return;
      }
      mouseSuppressedSelect = select;
      if (activeSelect === select) {
        suppressUiForCurrentFocus = true;
        view.hide();
      }
    }

    function dispatchNativeLikeEvents(select) {
      select.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    function commitPendingSelection(select) {
      const pendingOption = pendingIndex >= 0 ? select.options[pendingIndex] : null;
      if (!isOptionSelectable(pendingOption)) {
        pendingIndex = -1;
        return false;
      }
      if (pendingIndex !== select.selectedIndex) {
        select.selectedIndex = pendingIndex;
      }
      pendingIndex = -1;
      dispatchNativeLikeEvents(select);
      return true;
    }

    function handleKeydown(event) {
      const select = event.target;
      if (
        !(select instanceof HTMLSelectElement) ||
        select.disabled ||
        select.multiple ||
        select.options.length <= 1 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (activeSelect !== select) {
        activate(select, { fromKeydown: true });
      }
      scheduleRefresh();

      const isCharacter = event.key.length === 1;
      const isBackspace = event.key === "Backspace";
      const isEnter = event.key === "Enter";
      const isTab = event.key === "Tab";
      const isEscape = event.key === "Escape";
      const isArrowUp = event.key === "ArrowUp";
      const isArrowDown = event.key === "ArrowDown";
      if (
        !isCharacter &&
        !isBackspace &&
        !isEnter &&
        !isTab &&
        !isEscape &&
        !isArrowUp &&
        !isArrowDown
      ) {
        return;
      }

      if (isArrowUp || isArrowDown) {
        if (!view.isVisible()) {
          return;
        }
        const suggestions = getSuggestions(select, query);
        if (suggestions.length === 0) {
          return;
        }
        const currentIndex = pendingIndex >= 0 ? pendingIndex : select.selectedIndex;
        const suggestionIndex = suggestions.findIndex(({ index }) => index === currentIndex);
        const nextIndex = isArrowUp
          ? suggestionIndex > 0
            ? suggestionIndex - 1
            : suggestions.length - 1
          : suggestionIndex < suggestions.length - 1
            ? suggestionIndex + 1
            : 0;
        pendingIndex = suggestions[nextIndex].index;
        cancelRefresh();
        render();
        event.preventDefault();
        return;
      }

      if (isEnter) {
        const traceId = createTraceId("enter");
        const snapshot = focusNavigator.createSnapshot(select);
        const committed = commitPendingSelection(select);
        query = "";
        debugLogWithTrace(traceId, "enter pressed", {
          committed,
          selectedIndex: select.selectedIndex
        });
        if (committed) {
          focusNavigator.moveAfterEnter(select, snapshot, traceId);
        } else {
          render();
        }
        event.preventDefault();
        return;
      }

      if (isTab) {
        commitPendingSelection(select);
        query = "";
        pendingIndex = -1;
        return;
      }

      if (isEscape) {
        if (query) {
          query = "";
          pendingIndex = -1;
          render();
        } else {
          close(select);
        }
        event.preventDefault();
        return;
      }

      if (isBackspace) {
        query = query.slice(0, -1);
      } else {
        query += event.key;
      }
      updatePendingSelection();
      render();
      event.preventDefault();
    }

    function setCopyright(value) {
      copyright = value;
      if (activeSelect) {
        render();
      }
    }

    function reposition() {
      if (activeSelect && view.isVisible()) {
        view.reposition(activeSelect);
      }
    }

    function destroy() {
      if (activeSelect) {
        close(activeSelect);
      } else {
        cancelRefresh();
        disconnectObservers();
        view.hide();
      }
      mouseSuppressedSelect = null;
    }

    return Object.freeze({
      activate,
      close,
      suppressForMouseDown,
      handleKeydown,
      setCopyright,
      reposition,
      destroy
    });
  };
})();
