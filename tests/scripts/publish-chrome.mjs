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

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://chromewebstore.googleapis.com";
const SUCCESS_STATES = new Set(["SUCCEEDED", "UPLOAD_SUCCEEDED"]);
const IN_PROGRESS_STATES = new Set(["IN_PROGRESS", "UPLOAD_IN_PROGRESS"]);
const FAILED_STATES = new Set(["FAILED", "UPLOAD_FAILED", "NOT_FOUND"]);

function authorizationHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

function getUploadedVersions(upload, completedUpload) {
  const versions = new Set();
  if (typeof upload.crxVersion === "string" && upload.crxVersion) {
    versions.add(upload.crxVersion);
  }

  const channels =
    completedUpload?.submittedItemRevisionStatus?.distributionChannels;
  if (Array.isArray(channels)) {
    for (const channel of channels) {
      if (typeof channel?.crxVersion === "string" && channel.crxVersion) {
        versions.add(channel.crxVersion);
      }
    }
  }

  return [...versions];
}

export async function publishChrome({
  fetchImpl = fetch,
  sleepImpl = sleep,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  publisherId,
  extensionId,
  clientId,
  clientSecret,
  refreshToken,
  packageBytes,
  version
}) {
  requireValues({ publisherId, extensionId, clientId, clientSecret, refreshToken, version });
  if (!(packageBytes instanceof Uint8Array) || packageBytes.byteLength === 0) {
    throw new Error("Chrome package is empty.");
  }

  const tokenResponse = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const token = await readJsonResponse(tokenResponse, "Chrome OAuth token refresh");
  if (typeof token.access_token !== "string" || !token.access_token) {
    throw new Error("Chrome OAuth token response did not contain an access token.");
  }

  const itemName = `publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(extensionId)}`;
  const uploadUrl = `${API_ROOT}/upload/v2/${itemName}:upload`;
  const statusUrl = `${API_ROOT}/v2/${itemName}:fetchStatus`;
  const publishUrl = `${API_ROOT}/v2/${itemName}:publish`;
  const uploadResponse = await fetchImpl(uploadUrl, {
    method: "POST",
    headers: {
      ...authorizationHeaders(token.access_token),
      "Content-Type": "application/zip"
    },
    body: packageBytes
  });
  const upload = await readJsonResponse(uploadResponse, "Chrome package upload");

  let uploadState = upload.uploadState;
  let completedUpload = upload;
  if (IN_PROGRESS_STATES.has(uploadState)) {
    completedUpload = await pollOperation({
      getStatus: async () => {
        const response = await fetchImpl(statusUrl, {
          headers: authorizationHeaders(token.access_token)
        });
        return readJsonResponse(response, "Chrome upload status");
      },
      getState: (status) => status.lastAsyncUploadState,
      isSucceeded: (state) => SUCCESS_STATES.has(state),
      isFailed: (state) => FAILED_STATES.has(state),
      describeFailure: (status) =>
        `Chrome package upload failed with state ${status.lastAsyncUploadState || "unknown"}.`,
      sleepImpl,
      intervalMs: pollIntervalMs,
      timeoutMs
    });
    uploadState = completedUpload.lastAsyncUploadState;
  }

  if (!SUCCESS_STATES.has(uploadState)) {
    throw new Error(`Chrome package upload failed with state ${uploadState || "unknown"}.`);
  }
  const uploadedVersions = getUploadedVersions(upload, completedUpload);
  if (uploadedVersions.length === 0) {
    throw new Error("Chrome upload succeeded, but the accepted version could not be verified.");
  }
  if (!uploadedVersions.includes(version)) {
    throw new Error(
      `Chrome accepted version ${uploadedVersions.join(", ")}, but workflow expected ${version}.`
    );
  }

  const publishResponse = await fetchImpl(publishUrl, {
    method: "POST",
    headers: {
      ...authorizationHeaders(token.access_token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ publishType: "DEFAULT_PUBLISH", skipReview: false })
  });
  const submission = await readJsonResponse(publishResponse, "Chrome review submission");
  if (typeof submission.state !== "string" || !submission.state) {
    throw new Error("Chrome publish response did not contain a submission state.");
  }

  return Object.freeze({
    version,
    uploadState,
    submissionState: submission.state,
    warnings: submission.warningInfo?.warnings || []
  });
}

async function main() {
  const packagePath = process.argv[2];
  const version = process.argv[3];
  requireValues({ packagePath, version });
  const result = await publishChrome({
    publisherId: process.env.CHROME_PUBLISHER_ID,
    extensionId: process.env.CHROME_EXTENSION_ID,
    clientId: process.env.CHROME_CLIENT_ID,
    clientSecret: process.env.CHROME_CLIENT_SECRET,
    refreshToken: process.env.CHROME_REFRESH_TOKEN,
    packageBytes: await readFile(packagePath),
    version
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
