import { ObjectId } from "mongodb";

const safeObjectId = (id) => {
  try {
    if (!id) return null;
    return new ObjectId(id);
  } catch {
    return null;
  }
};

export const createAuditLogger = (getDb) => {
  return function logAuditEvent({
    schoolId = null,
    userId = null,
    userRole = null,
    action = "",
    entityType = "",
    entityId = null,
    description = "",
  } = {}) {
    // Fire-and-forget by design, should never block request-response flow.
    setImmediate(async () => {
      try {
        const db = typeof getDb === "function" ? getDb() : getDb;
        if (!db) return;

        const doc = {
          schoolId: safeObjectId(schoolId) || schoolId || null,
          userId: safeObjectId(userId) || userId || null,
          userRole: String(userRole || "").toUpperCase() || null,
          action: String(action || "").toUpperCase() || "UNKNOWN",
          entityType: String(entityType || "").toLowerCase() || "unknown",
          entityId: safeObjectId(entityId) || entityId || null,
          description: String(description || "").trim(),
          timestamp: new Date(),
        };

        await db.collection("auditLogs").insertOne(doc);
      } catch (error) {
        console.warn("AUDIT_LOG_WRITE_FAILED:", error?.message || error);
      }
    });
  };
};

