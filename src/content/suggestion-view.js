(() => {
  "use strict";

  const namespace =
    globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});

  namespace.createSuggestionView = function createSuggestionView({ queryLabel }) {
    let host = null;
    let root = null;
    let queryInput = null;
    let inputHandlers = {};
    let list = null;
    let copyrightLine = null;

    function ensureCreated() {
      if (host && host.isConnected) {
        return;
      }

      host = document.createElement("tabby-select-root");
      host.setAttribute("data-tabby-select-host", "");
      host.style.setProperty("all", "initial", "important");
      host.style.setProperty("display", "block", "important");
      host.style.setProperty("position", "fixed", "important");
      host.style.setProperty("inset", "0 auto auto 0", "important");
      host.style.setProperty("width", "0", "important");
      host.style.setProperty("height", "0", "important");
      host.style.setProperty("z-index", "2147483647", "important");
      host.style.setProperty("pointer-events", "none", "important");

      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `
        :host {
          all: initial !important;
        }

        .root {
          position: fixed;
          z-index: 2147483647;
          box-sizing: border-box;
          min-width: 220px;
          max-width: 360px;
          padding: 8px;
          border: 1px solid rgba(0, 0, 0, 0.16);
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
          color: #1f2937;
          font: 12px "Segoe UI", sans-serif;
          pointer-events: none;
          overflow-y: auto;
        }

        .query {
          box-sizing: border-box;
          width: 100%;
          min-height: 32px;
          margin-bottom: 6px;
          padding: 6px 8px;
          border: 1px solid transparent;
          border-radius: 4px;
          background: #e5e7eb;
          color: inherit;
          font: inherit;
          font-weight: 600;
          pointer-events: auto;
        }

        .query:focus {
          outline: 2px solid #2563eb;
          outline-offset: -2px;
        }

        .list {
          max-height: 320px;
          margin: 0;
          padding: 2px 0;
          overflow-y: auto;
          border-radius: 4px;
          background: #fafbfc;
          list-style: none;
        }

        .item {
          padding: 3px 8px;
          line-height: 1.3;
        }

        .item.pending {
          background: #dbeafe;
          color: #000000;
          font-weight: 700;
        }

        .item.empty {
          color: #b91c1c;
        }

        .copyright {
          margin-top: 8px;
          padding: 8px;
          border-radius: 4px;
          background: #e5e7eb;
          color: #374151;
          font-size: 10px;
          line-height: 1.4;
        }
      `;

      root = document.createElement("div");
      root.className = "root";
      root.hidden = true;

      queryInput = document.createElement("input");
      queryInput.type = "text";
      queryInput.className = "query";
      queryInput.tabIndex = -1;
      queryInput.autocomplete = "off";
      queryInput.spellcheck = false;
      queryInput.setAttribute("aria-label", queryLabel);
      queryInput.setAttribute("role", "combobox");
      queryInput.setAttribute("aria-autocomplete", "list");
      queryInput.setAttribute("aria-controls", "tabby-select-options");
      for (const [type, handler] of [
        ["input", "onInput"],
        ["compositionstart", "onCompositionStart"],
        ["compositionend", "onCompositionEnd"]
      ]) {
        queryInput.addEventListener(type, (event) => {
          event.stopPropagation();
          if (event.target !== queryInput) {
            return;
          }
          inputHandlers[handler]?.(event);
        });
      }

      list = document.createElement("ul");
      list.className = "list";
      list.id = "tabby-select-options";
      list.setAttribute("role", "listbox");

      copyrightLine = document.createElement("div");
      copyrightLine.className = "copyright";

      root.append(queryInput, list, copyrightLine);
      shadow.append(style, root);
      document.documentElement.appendChild(host);
    }

    function reposition(select) {
      if (!root || root.hidden) {
        return;
      }

      const viewportPadding = 8;
      const selectGap = 6;
      const selectRect = select.getBoundingClientRect();
      const availableWidth = Math.max(1, window.innerWidth - viewportPadding * 2);
      const maxWidth = Math.min(360, availableWidth);
      const minWidth = Math.min(maxWidth, Math.max(220, Math.floor(selectRect.width)));

      root.style.minWidth = `${minWidth}px`;
      root.style.maxWidth = `${maxWidth}px`;
      root.style.maxHeight = "";
      list.style.maxHeight = `${Math.max(
        48,
        Math.min(320, Math.floor(window.innerHeight * 0.5))
      )}px`;

      const initialRootRect = root.getBoundingClientRect();
      const initialListRect = list.getBoundingClientRect();
      const nonListHeight = initialRootRect.height - initialListRect.height;
      const spaceBelow = Math.max(
        0,
        window.innerHeight - selectRect.bottom - selectGap - viewportPadding
      );
      const spaceAbove = Math.max(0, selectRect.top - selectGap - viewportPadding);
      const placeAbove = spaceBelow < initialRootRect.height && spaceAbove > spaceBelow;
      const verticalSpace = placeAbove ? spaceAbove : spaceBelow;

      list.style.maxHeight = `${Math.max(
        48,
        Math.min(320, Math.floor(verticalSpace - nonListHeight))
      )}px`;
      // Keep the search field off its select even in short iframe viewports.
      root.style.maxHeight = `${verticalSpace}px`;

      const rootRect = root.getBoundingClientRect();
      const desiredTop = placeAbove
        ? selectRect.top - selectGap - rootRect.height
        : selectRect.bottom + selectGap;
      const maxTop = Math.max(
        viewportPadding,
        window.innerHeight - rootRect.height - viewportPadding
      );
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - rootRect.width - viewportPadding
      );

      root.style.top = `${Math.min(maxTop, Math.max(viewportPadding, desiredTop))}px`;
      root.style.left = `${Math.min(
        maxLeft,
        Math.max(viewportPadding, selectRect.left)
      )}px`;
    }

    function scrollPendingIntoView(pendingItem) {
      if (!pendingItem) {
        list.scrollTop = 0;
        return;
      }

      const listRect = list.getBoundingClientRect();
      const itemRect = pendingItem.getBoundingClientRect();
      if (itemRect.top < listRect.top) {
        list.scrollTop -= listRect.top - itemRect.top;
      } else if (itemRect.bottom > listRect.bottom) {
        list.scrollTop += itemRect.bottom - listRect.bottom;
      }
    }

    function show({
      select,
      query,
      suggestions,
      pendingIndex,
      composing,
      copyright,
      emptyMessage
    }) {
      ensureCreated();
      if (!composing && queryInput.value !== query) {
        queryInput.value = query;
      }
      queryInput.setAttribute("aria-expanded", "true");
      queryInput.removeAttribute("aria-activedescendant");
      copyrightLine.textContent = copyright;
      list.textContent = "";
      let pendingItem = null;

      if (suggestions.length === 0) {
        const item = document.createElement("li");
        item.className = "item empty";
        item.textContent = emptyMessage;
        list.appendChild(item);
      } else {
        for (const suggestion of suggestions) {
          const item = document.createElement("li");
          item.className = "item";
          item.textContent = suggestion.text;
          item.id = `tabby-select-option-${suggestion.index}`;
          item.setAttribute("role", "option");
          if (suggestion.index === pendingIndex && pendingIndex >= 0) {
            item.classList.add("pending");
            item.setAttribute("aria-selected", "true");
            pendingItem = item;
            queryInput.setAttribute("aria-activedescendant", item.id);
          }
          list.appendChild(item);
        }
      }

      root.hidden = false;
      reposition(select);
      scrollPendingIntoView(pendingItem);
    }

    function hide() {
      if (root) {
        root.hidden = true;
        queryInput.setAttribute("aria-expanded", "false");
      }
    }

    function destroy() {
      if (host) {
        host.remove();
      }
      host = null;
      root = null;
      queryInput = null;
      list = null;
      copyrightLine = null;
    }

    function isVisible() {
      return Boolean(root && !root.hidden);
    }

    function focusQuery() {
      if (isVisible()) {
        queryInput.focus({ preventScroll: true });
      }
    }

    function hasQueryFocus() {
      return Boolean(queryInput && host.shadowRoot.activeElement === queryInput);
    }

    function isQueryEvent(event) {
      return Boolean(queryInput && event.composedPath().includes(queryInput));
    }

    function containsFocusTarget(target) {
      return Boolean(host && (target === host || target === queryInput));
    }

    function setInputHandlers(handlers) {
      inputHandlers = handlers;
    }

    return Object.freeze({ show, hide, destroy, reposition, isVisible,
      focusQuery, hasQueryFocus, isQueryEvent, containsFocusTarget, setInputHandlers });
  };
})();
