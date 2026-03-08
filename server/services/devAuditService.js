import createDeveloperActionLogModel from "../models/DeveloperActionLog.js";

const normalizeIp = (value = "") => {
  const raw = String(value || "").split(",")[0].trim();
  if (!raw) return "";
  if (raw.startsWith("::ffff:")) return raw.slice(7);
  return raw;
};

const getRequestIp = (req) => {
  const forwarded = normalizeIp(req?.headers?.["x-forwarded-for"]);
  const direct = normalizeIp(req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || "");
  return forwarded || direct;
};

export async function logDeveloperAction({
  db,
  developerId,
  action,
  targetType,
  targetId,
  metadata,
  req,
} = {}) {
  try {
    if (!db?.collection) return;
    const model = createDeveloperActionLogModel(db);
    await model.create({
      developerId: developerId || req?.user?.userId || "unknown",
      action: String(action || "UNKNOWN"),
      targetType: String(targetType || "unknown"),
      targetId: String(targetId || ""),
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      ip: getRequestIp(req),
      timestamp: new Date(),
    });
  } catch (error) {
    console.warn("DEV_AUDIT_LOG_WRITE_FAILED:", error?.message || error);
  }
}

