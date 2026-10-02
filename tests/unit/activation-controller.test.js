const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../../src/shared.js");

function event() {
  const listeners = new Set();
  return {
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    fire: (...args) => listeners.forEach((listener) => listener(...args)),
    listeners
  };
}

function setup() {
  const storageCallbacks = [];
  const urlCallbacks = [];
  const states = [];
  const chromeApi = {
    storage: {
      local: { get: (_, callback) => storageCallbacks.push(callback) },
      onChanged: event()
    },
    runtime: {
      onMessage: event(),
      sendMessage(message, callback) {
        assert.deepEqual(message.type, core.GET_TOP_URL_MESSAGE_TYPE);
        urlCallbacks.push(callback);
      }
    }
  };
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,
    "../../src/content/activation-controller.js"), "utf8"), sandbox);
  const controller = sandbox.TabbySelectContent.createActivationController({
    core, chromeApi, onStateChange: (state) => states.push(state)
  });
  return { controller, chromeApi, storageCallbacks, urlCallbacks, states };
}

for (const urlFirst of [true, false]) {
  test(`waits for both settings and top URL (URL first: ${urlFirst})`, () => {
    const fixture = setup();
    const { controller, storageCallbacks, urlCallbacks, states } = fixture;
    controller.start();
    controller.start();
    assert.equal(urlCallbacks.length, 1);
    const settings = () => storageCallbacks[0]({ ...core.DEFAULT_SETTINGS,
      urlAllowPatterns: "https://parent.example/*" });
    const url = () => urlCallbacks[0]({ url: "https://parent.example/form" });
    (urlFirst ? url : settings)();
    assert.equal(states.at(-1).active, false);
    (urlFirst ? settings : url)();
    assert.equal(states.at(-1).active, true);
  });
}

test("URL notifications win over an older initial response", () => {
  const { controller, chromeApi, storageCallbacks, urlCallbacks, states } = setup();
  controller.start();
  chromeApi.runtime.onMessage.fire({ type: core.URL_CHANGED_MESSAGE_TYPE,
    url: "https://parent.example/allowed" });
  storageCallbacks[0]({ ...core.DEFAULT_SETTINGS,
    urlAllowPatterns: "https://parent.example/*" });
  urlCallbacks[0]({ url: "https://blocked.example/" });
  assert.equal(states.at(-1).active, true);
  assert.equal(states.at(-1).url, "https://parent.example/allowed");
  chromeApi.runtime.onMessage.fire({ type: core.URL_CHANGED_MESSAGE_TYPE,
    url: "https://blocked.example/" });
  assert.equal(states.at(-1).active, false);
});

test("setting changes during loading survive the initial storage response", () => {
  const { controller, chromeApi, storageCallbacks, urlCallbacks, states } = setup();
  controller.start();
  chromeApi.storage.onChanged.fire({ manualEnabledOverride: { newValue: false } }, "local");
  urlCallbacks[0]({ url: "https://parent.example/" });
  storageCallbacks[0]({ ...core.DEFAULT_SETTINGS,
    urlAllowPatterns: "https://parent.example/*" });
  assert.equal(states.at(-1).active, false);
  assert.equal(states.at(-1).settings.urlAllowPatterns, "https://parent.example/*");
  chromeApi.storage.onChanged.fire({ manualEnabledOverride: { newValue: true } }, "local");
  assert.equal(states.at(-1).active, true);
});

test("propagates the search mode during initialization and later changes", () => {
  const { controller, chromeApi, storageCallbacks, urlCallbacks, states } = setup();
  controller.start();
  chromeApi.storage.onChanged.fire({ searchMode: { newValue: "contains" } }, "local");
  storageCallbacks[0](core.DEFAULT_SETTINGS);
  urlCallbacks[0]({ url: "https://parent.example/" });
  assert.equal(states.at(-1).settings.searchMode, "contains");
  assert.equal(states.at(-1).active, true);
  chromeApi.storage.onChanged.fire({ searchMode: { newValue: "prefix" } }, "local");
  assert.equal(states.at(-1).settings.searchMode, "prefix");
  assert.equal(states.at(-1).active, true);
});

for (const response of [undefined, { url: null }, { url: 123 }, { url: "about:blank" }]) {
  test(`stays disabled with an unavailable or unsupported top URL: ${JSON.stringify(response)}`, () => {
    const { controller, storageCallbacks, urlCallbacks, states } = setup();
    controller.start();
    storageCallbacks[0](core.DEFAULT_SETTINGS);
    urlCallbacks[0](response);
    assert.equal(states.at(-1).active, false);
  });
}

test("handles runtime failure without enabling the feature", () => {
  const { controller, chromeApi, storageCallbacks, urlCallbacks, states } = setup();
  controller.start();
  storageCallbacks[0](core.DEFAULT_SETTINGS);
  chromeApi.runtime.lastError = { message: "No receiver" };
  urlCallbacks[0]({ url: "https://parent.example/" });
  assert.equal(states.at(-1).active, false);
});

test("does not enable before settings are loaded when storage fails", () => {
  const { controller, chromeApi, storageCallbacks, urlCallbacks, states } = setup();
  controller.start();
  urlCallbacks[0]({ url: "https://parent.example/" });
  chromeApi.runtime.lastError = { message: "Storage unavailable" };
  storageCallbacks[0]();
  delete chromeApi.runtime.lastError;
  chromeApi.storage.onChanged.fire({ debugLogEnabled: { newValue: true } }, "local");
  assert.equal(states.at(-1).active, false);
});

test("ignores callbacks after destroy and from a previous start", () => {
  const { controller, chromeApi, storageCallbacks, urlCallbacks, states } = setup();
  controller.start();
  controller.destroy();
  const count = states.length;
  storageCallbacks[0](core.DEFAULT_SETTINGS);
  urlCallbacks[0]({ url: "https://parent.example/" });
  assert.equal(states.length, count);
  assert.equal(chromeApi.runtime.onMessage.listeners.size, 0);
  assert.equal(chromeApi.storage.onChanged.listeners.size, 0);
  controller.start();
  storageCallbacks[0](core.DEFAULT_SETTINGS);
  urlCallbacks[0]({ url: "https://old.example/" });
  assert.equal(states.length, count);
  storageCallbacks[1](core.DEFAULT_SETTINGS);
  urlCallbacks[1]({ url: "https://new.example/" });
  assert.equal(states.at(-1).active, true);
  assert.equal(states.at(-1).url, "https://new.example/");
});

test("background resolves the sender's tab rather than its frame URL", () => {
  let listener;
  let getTabCallback;
  const chromeApi = {
    runtime: {
      onMessage: { addListener: (callback) => { listener = callback; } },
      onInstalled: event(), onStartup: event()
    },
    tabs: {
      get(tabId, callback) {
        assert.equal(tabId, 42);
        getTabCallback = callback;
      },
      onActivated: event(), onUpdated: event()
    },
    storage: { onChanged: event() }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../src/background.js"), "utf8"), {
    chrome: chromeApi, TabbySelectCore: core, TabbySelectI18n: {}
  });
  let response;
  const receive = (value) => { response = JSON.parse(JSON.stringify(value)); };
  assert.equal(listener({ type: "unrelated" }, {}, receive), undefined);
  assert.equal(listener({ type: core.GET_TOP_URL_MESSAGE_TYPE }, {
    tab: { id: 42 }, url: "https://child.example/"
  }, receive), true);
  getTabCallback({ url: "https://parent.example/" });
  assert.deepEqual(response, { url: "https://parent.example/" });
  chromeApi.runtime.lastError = { message: "Tab closed" };
  getTabCallback();
  assert.deepEqual(response, { url: null });
  delete chromeApi.runtime.lastError;
  listener({ type: core.GET_TOP_URL_MESSAGE_TYPE }, {}, receive);
  assert.deepEqual(response, { url: null });
});
