export default function createUploadGuard({ controlState }) {
  return function uploadGuard(req, res, next) {
    if (!controlState?.uploadsDisabled) return next();

    const contentType = String(req.headers["content-type"] || "").toLowerCase();
    if (!contentType.includes("multipart/form-data")) return next();

    const role = String(req.user?.role || "").toUpperCase();
    if (role === "DEVELOPER") return next();

    return res.status(403).json({
      success: false,
      message: "Uploads temporarily disabled",
    });
  };
}
