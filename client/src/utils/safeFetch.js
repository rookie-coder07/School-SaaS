const DEFAULT_TIMEOUT_MS = 15000;

const isDev = import.meta.env.DEV;

const debugLog = (tag, payload) => {
  if (!isDev) return;
  console.debug(`[${tag}]`, payload);
};

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

export async function safeFetchJson(url, options = {}) {
  const {
    method = "GET",
    headers = {},
    body,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    requestLabel = "safeFetchJson",
  } = options;

  const controller = signal ? null : new AbortController();
  const timeout = setTimeout(() => {
    if (controller) controller.abort();
  }, timeoutMs);

  try {
    debugLog("SAFE_FETCH_REQUEST", { requestLabel, method, url, timeoutMs });
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: signal || controller.signal,
    });

    const data = await parseJsonSafely(response);
    debugLog("SAFE_FETCH_RESPONSE", {
      requestLabel,
      method,
      url,
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        `Request failed with status ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.payload = data;
      throw err;
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    if (error?.name === "AbortError") {
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";
      throw abortError;
    }
    debugLog("SAFE_FETCH_ERROR", {
      requestLabel,
      method,
      url,
      message: error?.message || "Unknown fetch error",
      status: error?.status || null,
      payload: error?.payload || null,
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function createSubmitGuard(asyncHandler) {
  let inFlight = false;

  return async (...args) => {
    if (inFlight) {
      return { skipped: true, reason: "already_in_flight" };
    }
    inFlight = true;
    try {
      return await asyncHandler(...args);
    } finally {
      inFlight = false;
    }
  };
}

export function createAbortControllerBag() {
  const controllers = new Set();

  return {
    create() {
      const controller = new AbortController();
      controllers.add(controller);
      controller.signal.addEventListener(
        "abort",
        () => {
          controllers.delete(controller);
        },
        { once: true }
      );
      return controller;
    },
    abortAll() {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    },
    size() {
      return controllers.size;
    },
  };
}

