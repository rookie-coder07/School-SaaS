const DEFAULT_EXCLUDED_PATHS = new Set([
  "/health",
  "/auth/login",
  "/auth/teacher/login",
  "/auth/student/login",
]);

export default function createMaintenanceGuard({ controlState }) {
  return function maintenanceGuard(req, res, next) {
    const pathValue = String(req.path || "");
    if (pathValue.startsWith("/dev/")) return next();
    if (DEFAULT_EXCLUDED_PATHS.has(pathValue)) return next();
    if (!controlState?.maintenanceMode) return next();

    const role = String(req.user?.role || "").toUpperCase();
    if (role === "DEVELOPER") return next();

    return res.status(503).json({
      success: false,
      message: "Platform is currently in maintenance mode",
    });
  };
}

