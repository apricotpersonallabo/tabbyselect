const test = require("node:test");
const assert = require("node:assert/strict");

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) }
  });
}

function emptyResponse(status, headers = {}) {
  return new Response("", { status, headers });
}

function queuedFetch(responses, calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) {
      throw new Error(`Unexpected request: ${url}`);
    }
    return typeof next === "function" ? next(url, init) : next;
  };
}

const chromeConfig = {
  publisherId: "publisher",
  extensionId: "extension",
  clientId: "client",
  clientSecret: "secret",
  refreshToken: "refresh",
  packageBytes: new Uint8Array([1, 2, 3]),
  version: "1.2.3"
};

test("Chrome client refreshes OAuth, waits for upload, and submits review", async () => {
  const { publishChrome } = await import("../../scripts/publish-chrome.mjs");
  const calls = [];
  const sleeps = [];
  const result = await publishChrome({
    ...chromeConfig,
    fetchImpl: queuedFetch(
      [
        jsonResponse({ access_token: "access-token" }),
        jsonResponse({ uploadState: "IN_PROGRESS" }),
        jsonResponse({
          lastAsyncUploadState: "SUCCEEDED",
          submittedItemRevisionStatus: {
            distributionChannels: [{ crxVersion: "1.2.3" }]
          }
        }),
        jsonResponse({ state: "PENDING_REVIEW", warningInfo: { warnings: [] } })
      ],
      calls
    ),
    sleepImpl: async (milliseconds) => sleeps.push(milliseconds),
    pollIntervalMs: 5,
    timeoutMs: 20
  });

  assert.deepEqual(result, {
    version: "1.2.3",
    uploadState: "SUCCEEDED",
    submissionState: "PENDING_REVIEW",
    warnings: []
  });
  assert.equal(calls.length, 4);
  assert.match(calls[1].url, /\/upload\/v2\/publishers\/publisher\/items\/extension:upload$/);
  assert.equal(calls[1].init.headers.Authorization, "Bearer access-token");
  assert.deepEqual(sleeps, []);
  assert.deepEqual(JSON.parse(calls[3].init.body), {
    publishType: "DEFAULT_PUBLISH",
    skipReview: false
  });
});

test("Chrome client verifies a synchronous upload version", async () => {
  const { publishChrome } = await import("../../scripts/publish-chrome.mjs");
  const result = await publishChrome({
    ...chromeConfig,
    fetchImpl: queuedFetch(
      [
        jsonResponse({ access_token: "access-token" }),
        jsonResponse({ uploadState: "SUCCEEDED", crxVersion: "1.2.3" }),
        jsonResponse({ state: "PENDING_REVIEW" })
      ],
      []
    )
  });

  assert.equal(result.uploadState, "SUCCEEDED");
  assert.equal(result.version, "1.2.3");
});

test("Chrome client reports HTTP failures and upload timeouts", async () => {
  const { publishChrome } = await import("../../scripts/publish-chrome.mjs");
  await assert.rejects(
    publishChrome({
      ...chromeConfig,
      fetchImpl: queuedFetch(
        [
          jsonResponse({ access_token: "token" }),
          jsonResponse({ uploadState: "SUCCEEDED", crxVersion: "9.9.9" })
        ],
        []
      )
    }),
    /accepted version 9\.9\.9, but workflow expected 1\.2\.3/
  );

  await assert.rejects(
    publishChrome({
      ...chromeConfig,
      fetchImpl: queuedFetch(
        [
          jsonResponse({ access_token: "token" }),
          jsonResponse({ uploadState: "IN_PROGRESS" }),
          jsonResponse({ lastAsyncUploadState: "SUCCEEDED" })
        ],
        []
      ),
      sleepImpl: async () => {},
      pollIntervalMs: 1,
      timeoutMs: 2
    }),
    /accepted version could not be verified/
  );

  await assert.rejects(
    publishChrome({
      ...chromeConfig,
      fetchImpl: queuedFetch(
        [
          jsonResponse({ access_token: "token" }),
          jsonResponse({ uploadState: "FAILED" })
        ],
        []
      )
    }),
    /upload failed with state FAILED/
  );

  await assert.rejects(
    publishChrome({
      ...chromeConfig,
      fetchImpl: queuedFetch([jsonResponse({ error: "denied" }, { status: 401 })], [])
    }),
    /OAuth token refresh failed with HTTP 401/
  );

  await assert.rejects(
    publishChrome({
      ...chromeConfig,
      fetchImpl: queuedFetch(
        [
          jsonResponse({ access_token: "token" }),
          jsonResponse({ uploadState: "IN_PROGRESS" }),
          jsonResponse({ lastAsyncUploadState: "IN_PROGRESS" }),
          jsonResponse({ lastAsyncUploadState: "IN_PROGRESS" })
        ],
        []
      ),
      sleepImpl: async () => {},
      pollIntervalMs: 1,
      timeoutMs: 2
    }),
    /timed out/
  );
});

const edgeConfig = {
  productId: "product-id",
  clientId: "edge-client",
  apiKey: "edge-key",
  packageBytes: new Uint8Array([4, 5, 6]),
  version: "1.2.3",
  certificationNotes: "Release notes"
};

test("Edge client waits for upload and publishing operations", async () => {
  const { publishEdge } = await import("../../scripts/publish-edge.mjs");
  const calls = [];
  const result = await publishEdge({
    ...edgeConfig,
    fetchImpl: queuedFetch(
      [
        emptyResponse(202, { Location: "upload-operation" }),
        jsonResponse({ status: "InProgress" }),
        jsonResponse({ status: "Succeeded" }),
        emptyResponse(202, { Location: "/operations/publish-operation" }),
        jsonResponse({ status: "Succeeded", message: "Submitted" })
      ],
      calls
    ),
    sleepImpl: async () => {},
    pollIntervalMs: 1,
    timeoutMs: 5
  });

  assert.deepEqual(result, {
    version: "1.2.3",
    uploadState: "Succeeded",
    submissionState: "Succeeded",
    submissionMessage: "Submitted"
  });
  assert.equal(calls[0].init.headers.Authorization, "ApiKey edge-key");
  assert.equal(calls[0].init.headers["X-ClientID"], "edge-client");
  assert.deepEqual(JSON.parse(calls[3].init.body), { notes: "Release notes" });
  assert.match(calls[4].url, /\/submissions\/operations\/publish-operation$/);
});

test("Edge client reports operation failures and timeouts", async () => {
  const { publishEdge } = await import("../../scripts/publish-edge.mjs");
  await assert.rejects(
    publishEdge({
      ...edgeConfig,
      fetchImpl: queuedFetch([jsonResponse({ error: "denied" }, { status: 401 })], [])
    }),
    /package upload failed with HTTP 401/
  );

  await assert.rejects(
    publishEdge({
      ...edgeConfig,
      fetchImpl: queuedFetch(
        [
          emptyResponse(202, { Location: "upload-operation" }),
          jsonResponse({ status: "Failed", errorCode: "InvalidPackage" })
        ],
        []
      )
    }),
    /InvalidPackage/
  );

  await assert.rejects(
    publishEdge({
      ...edgeConfig,
      fetchImpl: queuedFetch(
        [
          emptyResponse(202, { Location: "upload-operation" }),
          jsonResponse({ status: "InProgress" }),
          jsonResponse({ status: "InProgress" })
        ],
        []
      ),
      sleepImpl: async () => {},
      pollIntervalMs: 1,
      timeoutMs: 2
    }),
    /timed out/
  );
});
