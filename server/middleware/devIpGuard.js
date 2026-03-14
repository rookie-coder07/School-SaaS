export default function devIpGuard(req, res, next) {
  const expectedCode = String(process.env.DEVELOPER_ACCESS_CODE || "").trim();
  const providedCode = String(req.headers["x-dev-access"] || "").trim();

  if (!expectedCode || providedCode !== expectedCode) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized developer access",
    });
  }

  return next();
}
