import jwt from "jsonwebtoken";

const sendDeveloperError = (res, message, status = 403) => {
  return res.status(status).json({ success: false, message });
};

export default function requireDeveloper(req, res, next) {
  const path = String(req.originalUrl || req.path || "");
  if (path.includes("/api/dev/login")) {
    return next();
  }

  if (!process.env.JWT_SECRET) {
    console.error("⚠ DEVELOPER GUARD ERROR: JWT_SECRET missing");
    return sendDeveloperError(res, "Server configuration error", 500);
  }

  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return sendDeveloperError(res, "Unauthorized", 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return sendDeveloperError(res, "Unauthorized", 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (String(payload?.role || "").toUpperCase() !== "DEVELOPER") {
      return sendDeveloperError(res, "Developer access required");
    }
    return next();
  } catch (err) {
    console.warn("⚠ DEVELOPER GUARD FAILED:", err?.message || err);
    return sendDeveloperError(res, "Unauthorized", 401);
  }
}
