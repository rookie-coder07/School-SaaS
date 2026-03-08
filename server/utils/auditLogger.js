import createAuditLogModel from "../models/AuditLog.js";

let auditLogModel = null;

export function initAuditLogger(db) {
  try {
    auditLogModel = createAuditLogModel(db);
  } catch (error) {
    auditLogModel = null;
    console.error("Audit logger init error:", error);
  }
}

export async function logAdminAction({
  adminId,
  action,
  targetType,
  targetId,
  metadata = {},
}) {
  try {
    if (!auditLogModel) return;

    await auditLogModel.create({
      adminId,
      action,
      targetType,
      targetId,
      metadata,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
