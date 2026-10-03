(() => {
  "use strict";

  const core = globalThis.TabbySelectCore;

  const namespace =
    globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});

  namespace.createSelectSession = function createSelectSession({
    view,
    focusNavigator,
    pickerController,
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
    let refreshRafId = null;
    let optionObserver = null;
    let removalObserver = null;
    let copyright = initialCopyright;
    let searchMode = core.DEFAULT_SETTINGS.searchMode;
    let composing = false;
    let returningFocus = false;
    const navigationKeys = new Set([
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape",
      "Up", "Down", "Left", "Right", "Esc"
    ]);

    function isNavigationKey(event) {
      return navigationKeys.has(event.key) || navigationKeys.has(event.code) ||
        [27, 37, 38, 39, 40].includes(event.keyCode);
    }

    function getSelectTarget(target) {
      if (target instanceof HTMLSelectElement) {
        return target;
      }
      const select = target instanceof Element ? target.closest("select") : null;
      return select && pickerController.isManaged(select) ? select : null;
    }

    function hasSessionFocus() {
      return document.activeElement === activeSelect || view.hasQueryFocus() ||
        (activeSelect && pickerController.isManaged(activeSelect) &&
          activeSelect.contains(document.activeElement));
    }

    function restoreSelectFocus(select) {
      if (!view.hasQueryFocus() || !select.isConnected || !document.hasFocus()) {
        return;
      }
      returningFocus = true;
      try {
        select.focus({ preventScroll: true });
      } finally {
        returningFocus = false;
      }
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
      const suggestions = [];
      for (let index = 0; index < select.options.length; index += 1) {
        const option = select.options[index];
        if (!isOptionSelectable(option)) {
          continue;
        }
        const text = getOptionText(option);
        if (core.matchesSearchText(text, rawQuery, searchMode)) {
          suggestions.push({ index, text: text || emptyOptionLabel });
        }
      }
      return suggestions;
    }

    function findMatchingOption(select, rawQuery) {
      if (!rawQuery.trim()) {
        return -1;
      }

      const start = Math.max(0, select.selectedIndex + 1);
      for (let offset = 0; offset < select.options.length; offset += 1) {
        const index = (start + offset) % select.options.length;
        const option = select.options[index];
        if (!isOptionSelectable(option)) {
          continue;
        }
        if (core.matchesSearchText(getOptionText(option), rawQuery, searchMode)) {
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
        composing,
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
          hasSessionFocus() &&
          !suppressUiForCurrentFocus
        ) {
          updatePendingSelection();
          render();
        }
      });
    }

    function close(select = activeSelect, { restoreFocus = false } = {}) {
      if (!(activeSelect instanceof HTMLSelectElement) || select !== activeSelect) {
        return;
      }

      const closingSelect = activeSelect;
      if (restoreFocus) {
        restoreSelectFocus(closingSelect);
      }
      cancelRefresh();
      disconnectObservers();
      view.hide();
      activeSelect = null;
      query = "";
      pendingIndex = -1;
      composing = false;
      suppressUiForCurrentFocus = false;
    }

    function startObservers(select) {
      optionObserver = new MutationObserver((mutations) => {
        if (
          mutations.length &&
          activeSelect === select &&
          hasSessionFocus() &&
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
      if (!(select instanceof HTMLSelectElement) || select.disabled || select.multiple || select.options.length <= 1) {
        return;
      }

      if (activeSelect !== select) {
        if (activeSelect) {
          close(activeSelect);
        }
        activeSelect = select;
        query = "";
        pendingIndex = -1;
        composing = false;
        suppressUiForCurrentFocus = !fromKeydown;
        startObservers(select);
      }

      if (fromKeydown) {
        suppressUiForCurrentFocus = false;
      }

      render();
      if (!suppressUiForCurrentFocus) {
        view.focusQuery();
      }
      scheduleRefresh();
    }

    function handleFocusin(event) {
      if (!returningFocus && event.target instanceof HTMLSelectElement) {
        // Returning from the query to its select starts a new waiting session.
        // Otherwise activate() would reuse the open search and steal focus back.
        if (activeSelect === event.target) {
          close();
        }
        activate(event.target);
      }
    }

    function handleFocusout(event) {
      if (returningFocus || !activeSelect ||
          (getSelectTarget(event.target) !== activeSelect && !view.isQueryEvent(event))) {
        return;
      }
      if (getSelectTarget(event.relatedTarget) === activeSelect || view.containsFocusTarget(event.relatedTarget)) {
        return;
      }
      close();
    }

    function handleInput(event) {
      if (!activeSelect || composing || event.isComposing) {
        return;
      }
      const value = event.target.value;
      if (query === value) {
        return;
      }
      query = value;
      cancelRefresh();
      updatePendingSelection();
      render();
    }

    function handleCompositionStart() {
      if (activeSelect) {
        composing = true;
        cancelRefresh();
      }
    }

    function handleCompositionEnd(event) {
      if (!activeSelect) {
        return;
      }
      composing = false;
      handleInput(event);
    }

    function suppressForMouseDown(select) {
      if (!(select instanceof HTMLSelectElement)) {
        return;
      }
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
      const fromQuery = view.isQueryEvent(event);
      const select = fromQuery ? activeSelect : getSelectTarget(event.target);
      if (
        !(select instanceof HTMLSelectElement) ||
        select.disabled ||
        select.multiple ||
        select.options.length <= 1
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (!fromQuery) {
        const fromPicker = pickerController.isManaged(select) && select.matches(":open");
        if (isNavigationKey(event) || event.key === "Tab" ||
            ["Shift", "Control", "Alt", "Meta", "AltGraph"].includes(event.key)) {
          return;
        }
        const imeKey = event.isComposing || event.keyCode === 229;
        if (fromPicker) {
          returningFocus = true;
          try {
            pickerController.closePicker(select);
          } finally {
            returningFocus = false;
          }
          query = "";
          pendingIndex = -1;
          composing = false;
        }
        activate(select, { fromKeydown: true });
        // Opening the UI is separate from moving or confirming a candidate.
        // Printable keys and IME keys continue into the newly focused text input.
        if (!imeKey && ["Enter", "Home", "End", "PageUp", "PageDown", "Backspace", "Delete"].includes(event.key)) {
          event.preventDefault();
        }
        return;
      }

      if (composing || event.isComposing || event.keyCode === 229) {
        return;
      }

      const isEnter = event.key === "Enter";
      const isTab = event.key === "Tab";
      const isEscape = event.key === "Escape";
      const isArrowUp = event.key === "ArrowUp";
      const isArrowDown = event.key === "ArrowDown";
      if (
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
          close(select, { restoreFocus: true });
          focusNavigator.moveAfterEnter(select, snapshot, traceId);
        } else {
          render();
        }
        event.preventDefault();
        return;
      }

      if (isTab) {
        commitPendingSelection(select);
        close(select, { restoreFocus: true });
        return;
      }

      if (isEscape) {
        if (query) {
          query = "";
          pendingIndex = -1;
          render();
        } else {
          close(select, { restoreFocus: true });
        }
        event.preventDefault();
        return;
      }

    }

    function setCopyright(value) {
      copyright = value;
      if (activeSelect) {
        render();
      }
    }

    function setSearchMode(value) {
      const nextMode = core.normalizeSearchMode(value);
      if (searchMode === nextMode) {
        return;
      }
      searchMode = nextMode;
      if (activeSelect) {
        cancelRefresh();
        updatePendingSelection();
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
        close(activeSelect, { restoreFocus: true });
      } else {
        cancelRefresh();
        disconnectObservers();
        view.hide();
      }
    }

    view.setInputHandlers({
      onInput: handleInput,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd
    });

    return Object.freeze({
      activate,
      close,
      suppressForMouseDown,
      handleKeydown,
      handleFocusin,
      handleFocusout,
      setCopyright,
      setSearchMode,
      reposition,
      destroy
    });
  };
})();
