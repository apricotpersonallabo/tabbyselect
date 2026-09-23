import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  pollOperation,
  readJsonResponse,
  requireValues,
  sleep
} from "./store-api-utils.mjs";

const API_ROOT = "https://api.addons.microsoftedge.microsoft.com/v1";

function edgeHeaders(clientId, apiKey, additional = {}) {
  return {
    Authorization: `ApiKey ${apiKey}`,
    "X-ClientID": clientId,
    ...additional
  };
}

async function assertAccepted(response, operation) {
  const text = await response.text();
  if (response.status !== 202) {
    const detail = text.replace(/\s+/g, " ").trim().slice(0, 500);
    throw new Error(
      `${operation} failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }
  return response.headers.get("location");
}

export function extractOperationId(location) {
  if (typeof location !== "string" || !location.trim()) {
    throw new Error("Edge response did not contain an operation ID.");
  }
  const segments = location.trim().replace(/\/+$/, "").split("/");
  const operationId = segments[segments.length - 1];
  if (!operationId) {
    throw new Error("Edge response contained an invalid operation ID.");
  }
  return operationId;
}

async function pollEdgeOperation({
  fetchImpl,
  sleepImpl,
  pollIntervalMs,
  timeoutMs,
  url,
  headers,
  operation
}) {
  return pollOperation({
    getStatus: async () => {
      const response = await fetchImpl(url, { headers });
      return readJsonResponse(response, operation);
    },
    getState: (status) => status.status,
    isSucceeded: (state) => state === "Succeeded",
    isFailed: (state) => state === "Failed",
    describeFailure: (status) => {
      const reason = status.errorCode || status.message || "unknown error";
      return `${operation} failed: ${reason}`;
    },
    sleepImpl,
    intervalMs: pollIntervalMs,
    timeoutMs
  });
}

export async function publishEdge({
  fetchImpl = fetch,
  sleepImpl = sleep,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  productId,
  clientId,
  apiKey,
  packageBytes,
  version,
  certificationNotes = ""
}) {
  requireValues({ productId, clientId, apiKey, version });
  if (!(packageBytes instanceof Uint8Array) || packageBytes.byteLength === 0) {
    throw new Error("Edge package is empty.");
  }

  const productUrl = `${API_ROOT}/products/${encodeURIComponent(productId)}`;
  const headers = edgeHeaders(clientId, apiKey);
  const uploadResponse = await fetchImpl(`${productUrl}/submissions/draft/package`, {
    method: "POST",
    headers: edgeHeaders(clientId, apiKey, { "Content-Type": "application/zip" }),
    body: packageBytes
  });
  const uploadOperationId = extractOperationId(
    await assertAccepted(uploadResponse, "Edge package upload")
  );
  const upload = await pollEdgeOperation({
    fetchImpl,
    sleepImpl,
    pollIntervalMs,
    timeoutMs,
    url: `${productUrl}/submissions/draft/package/operations/${encodeURIComponent(uploadOperationId)}`,
    headers,
    operation: "Edge upload status"
  });

  const notes = certificationNotes.trim() || `TabbySelect ${version}`;
  const publishResponse = await fetchImpl(`${productUrl}/submissions`, {
    method: "POST",
    headers: edgeHeaders(clientId, apiKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({ notes })
  });
  const publishOperationId = extractOperationId(
    await assertAccepted(publishResponse, "Edge review submission")
  );
  const submission = await pollEdgeOperation({
    fetchImpl,
    sleepImpl,
    pollIntervalMs,
    timeoutMs,
    url: `${productUrl}/submissions/operations/${encodeURIComponent(publishOperationId)}`,
    headers,
    operation: "Edge publish status"
  });

  return Object.freeze({
    version,
    uploadState: upload.status,
    submissionState: submission.status,
    submissionMessage: submission.message || ""
  });
}

async function main() {
  const packagePath = process.argv[2];
  const version = process.argv[3];
  requireValues({ packagePath, version });
  const result = await publishEdge({
    productId: process.env.EDGE_PRODUCT_ID,
    clientId: process.env.EDGE_CLIENT_ID,
    apiKey: process.env.EDGE_API_KEY,
    packageBytes: await readFile(packagePath),
    version,
    certificationNotes: process.env.EDGE_CERTIFICATION_NOTES || ""
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
