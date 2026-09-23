export const DEFAULT_POLL_INTERVAL_MS = 10_000;
export const DEFAULT_TIMEOUT_MS = 600_000;

export function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function responseDetail(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact ? `: ${compact.slice(0, 500)}` : "";
}

export async function readJsonResponse(response, operation) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${operation} failed with HTTP ${response.status}${responseDetail(text)}`);
  }

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${operation} returned invalid JSON.`);
  }
}

export async function pollOperation({
  getStatus,
  getState,
  isSucceeded,
  isFailed,
  describeFailure,
  sleepImpl = sleep,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  const maximumAttempts = Math.max(1, Math.ceil(timeoutMs / Math.max(1, intervalMs)));
  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    const status = await getStatus();
    const state = getState(status);
    if (isSucceeded(state)) {
      return status;
    }
    if (isFailed(state)) {
      throw new Error(describeFailure(status));
    }
    if (attempt + 1 < maximumAttempts) {
      await sleepImpl(intervalMs);
    }
  }

  throw new Error(`Operation timed out after ${timeoutMs}ms.`);
}

export function requireValues(values) {
  const missing = Object.entries(values)
    .filter(([, value]) => typeof value !== "string" || !value.trim())
    .map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing required values: ${missing.join(", ")}`);
  }
}
