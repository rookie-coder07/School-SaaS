import crypto from "crypto";

const DUPLICATE_WINDOW_MS = 5000;
const MAX_BODY_PREVIEW = 160;
const CLEANUP_INTERVAL_MS = 30000;

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return "\"[unserializable]\"";
  }
};

const summarizeBody = (body) => {
  if (!body || typeof body !== "object") {
    return body || null;
  }
  const keys = Object.keys(body);
  return {
    keys: keys.slice(0, 15),
    preview: safeStringify(body).slice(0, MAX_BODY_PREVIEW),
  };
};

export function createQaObservabilityMiddleware() {
  const recentWrites = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [fingerprint, ts] of recentWrites.entries()) {
      if (now - ts > DUPLICATE_WINDOW_MS) {
        recentWrites.delete(fingerprint);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref();

  return (req, res, next) => {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    const method = String(req.method || "GET").toUpperCase();
    const isWrite = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

    req.qaRequestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    if (isWrite) {
      const actor = req.user?.userId || "anonymous";
      const bodySignature = safeStringify(req.body || {});
      const fingerprint = `${method}:${req.originalUrl}:${actor}:${bodySignature}`;
      const previousAt = recentWrites.get(fingerprint);
      if (previousAt && Date.now() - previousAt <= DUPLICATE_WINDOW_MS) {
        console.warn(
          JSON.stringify({
            tag: "QA_DUPLICATE_WRITE_DETECTED",
            requestId,
            method,
            path: req.originalUrl,
            actor,
            role: req.user?.role || "UNKNOWN",
            body: summarizeBody(req.body),
          })
        );
      }
      recentWrites.set(fingerprint, Date.now());
    }

    console.log(
      JSON.stringify({
        tag: "QA_REQUEST_START",
        requestId,
        method,
        path: req.originalUrl,
        role: req.user?.role || "UNKNOWN",
      })
    );

    res.on("finish", () => {
      const durationMs = Date.now() - started;
      const statusCode = Number(res.statusCode) || 0;
      const logPayload = {
        tag: "QA_REQUEST_END",
        requestId,
        method,
        path: req.originalUrl,
        statusCode,
        durationMs,
        role: req.user?.role || "UNKNOWN",
      };
      console.log(JSON.stringify(logPayload));

      if (statusCode >= 400 && statusCode < 500) {
        console.warn(
          JSON.stringify({
            tag: "QA_VALIDATION_OR_AUTH_WARNING",
            requestId,
            method,
            path: req.originalUrl,
            statusCode,
            role: req.user?.role || "UNKNOWN",
            body: summarizeBody(req.body),
          })
        );
      }
    });

    next();
  };
}
