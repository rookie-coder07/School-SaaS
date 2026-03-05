import { createElement, lazy } from "react";

const CHUNK_LOAD_ERROR_RE = /(Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk)/i;

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isChunkLoadError = (error) => {
  const message = String(error?.message || error || "");
  return CHUNK_LOAD_ERROR_RE.test(message);
};

const withRetries = async (importer, retries = 2, retryDelayMs = 400) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await importer();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }
  throw lastError;
};

export const lazyWithRetry = (importer, key = "chunk") =>
  lazy(async () => {
    try {
      return await withRetries(importer);
    } catch (error) {
      if (typeof window === "undefined" || !isChunkLoadError(error)) {
        throw error;
      }

      const storageKey = `lazy-retry-reloaded:${key}`;
      const alreadyReloaded = sessionStorage.getItem(storageKey) === "1";

      if (!alreadyReloaded) {
        sessionStorage.setItem(storageKey, "1");
        window.location.reload();
        return new Promise(() => {});
      }

      sessionStorage.removeItem(storageKey);
      // Gracefully degrade instead of crashing the whole route tree.
      return {
        default: function LazyChunkFallback() {
          return createElement(
            "div",
            {
              style: {
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "13px",
                lineHeight: 1.4,
              },
            },
            `Failed to load a UI section (${key}). Please refresh this page.`
          );
        },
      };
    }
  });

export default lazyWithRetry;
