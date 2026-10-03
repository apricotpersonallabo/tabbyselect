(() => {
  "use strict";

  const core = globalThis.TabbySelectCore;
  const namespace = globalThis.TabbySelectContent || (globalThis.TabbySelectContent = {});

  namespace.createPickerController = function createPickerController() {
    const attribute = "data-tabby-select-base-picker";
    const supported = core.supportsBaseSelect();
    const managed = new Map();
    let running = false;
    let enabled = false;
    let observer = null;
    const observerOptions = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["multiple", "size"]
    };

    function setSizeAttribute(select, value) {
      if (select.getAttribute("size") === value) {
        return;
      }
      const selectedIndex = select.selectedIndex;
      if (value === null) {
        select.removeAttribute("size");
      } else {
        select.setAttribute("size", value);
      }
      // Switching from a listbox to a dropdown can auto-select its first option.
      if (select.selectedIndex !== selectedIndex) {
        select.selectedIndex = selectedIndex;
      }
    }

    function restore(select, original) {
      // Leave subsequent changes made by the page intact.
      if (select.style.getPropertyValue("appearance") === "base-select" &&
          select.style.getPropertyPriority("appearance") === "important") {
        if (original.appearance) {
          select.style.setProperty("appearance", original.appearance, original.priority);
        } else {
          select.style.removeProperty("appearance");
        }
      }
      if (select.getAttribute(attribute) === "enabled") {
        if (original.attribute === null) {
          select.removeAttribute(attribute);
        } else {
          select.setAttribute(attribute, original.attribute);
        }
      }
      if (select.getAttribute("size") === "1") {
        setSizeAttribute(select, original.size);
      }
      if (!original.hadStyleAttribute && select.style.length === 0) {
        select.removeAttribute("style");
      }
      managed.delete(select);
    }

    function refresh() {
      const eligible = new Set(Array.from(document.querySelectorAll("select"))
        .filter((select) => !select.multiple && select.options.length > 1));
      for (const [select, original] of managed) {
        if (!eligible.has(select)) {
          restore(select, original);
        }
      }
      for (const select of eligible) {
        if (managed.has(select)) {
          if (select.getAttribute("size") !== "1") {
            setSizeAttribute(select, "1");
          }
          continue;
        }
        managed.set(select, {
          appearance: select.style.getPropertyValue("appearance"),
          priority: select.style.getPropertyPriority("appearance"),
          hadStyleAttribute: select.hasAttribute("style"),
          attribute: select.getAttribute(attribute),
          size: select.getAttribute("size")
        });
        // base-select cannot open a picker for a listbox (size > 1).
        // Keep the page's size separately and restore it when this mode ends.
        setSizeAttribute(select, "1");
        select.setAttribute(attribute, "enabled");
        select.style.setProperty("appearance", "base-select", "important");
      }
    }

    function rememberSizeChanges(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "size") {
          const original = managed.get(mutation.target);
          if (original) {
            original.size = mutation.target.getAttribute("size");
          }
        }
      }
    }

    function removeStyles() {
      if (observer) {
        rememberSizeChanges(observer.takeRecords());
      }
      observer?.disconnect();
      observer = null;
      for (const [select, original] of managed) {
        restore(select, original);
      }
    }

    function update() {
      if (!running || !enabled || !supported) {
        removeStyles();
        return;
      }
      if (observer) {
        return;
      }
      refresh();
      observer = new MutationObserver((mutations) => {
        rememberSizeChanges(mutations);
        // Ignore our own size normalization and restoration mutations.
        observer.disconnect();
        try {
          refresh();
        } finally {
          observer.observe(document.documentElement, observerOptions);
        }
      });
      observer.observe(document.documentElement, observerOptions);
    }

    function isManaged(select) {
      return managed.has(select) && getComputedStyle(select).appearance === "base-select";
    }

    function closePicker(select) {
      if (!isManaged(select) || !select.matches(":open")) {
        return;
      }
      const appearance = select.style.getPropertyValue("appearance");
      const priority = select.style.getPropertyPriority("appearance");
      // Changing appearance closes the internal picker, which has no hidePicker API.
      // Flush layout before restoring it so a later click can open a fresh picker.
      try {
        select.style.setProperty("appearance", "auto", "important");
        void select.offsetHeight;
      } finally {
        select.style.setProperty("appearance", appearance, priority);
      }
    }

    return Object.freeze({
      start() { running = true; update(); },
      stop() { running = false; removeStyles(); },
      setEnabled(value) { enabled = value === true; update(); },
      isManaged,
      closePicker
    });
  };
})();
