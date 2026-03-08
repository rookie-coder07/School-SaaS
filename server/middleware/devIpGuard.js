const LOCAL_DEVELOPER_IPS = new Set(["127.0.0.1", "::1"]);

const normalizeIp = (value = "") => {
  const raw = String(value || "").split(",")[0].trim();
  if (!raw) return "";
  if (raw.startsWith("::ffff:")) return raw.slice(7);
  return raw;
};

const collectAllowedIps = () => {
  const envMany = String(process.env.DEVELOPER_ALLOWED_IPS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const values = envMany.length > 0 ? envMany : [...LOCAL_DEVELOPER_IPS];

  return new Set(values.map((ip) => normalizeIp(ip)).filter(Boolean));
};

export default function devIpGuard(req, res, next) {
  const allowedIps = collectAllowedIps();
  const directIp = normalizeIp(req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "");
  const forwardedIp = normalizeIp(req.headers["x-forwarded-for"]);
  const ip = forwardedIp || directIp;

  if (!allowedIps.has(ip)) {
    return res.status(403).json({
      success: false,
      message: "Developer IP not allowed",
    });
  }

  return next();
}
