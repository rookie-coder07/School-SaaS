const normalizeMetadata = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
};

const normalizeField = (value) => String(value || "").trim();

export default function createAuditLogModel(db) {
  if (!db?.collection) {
    throw new Error("AuditLog model requires a MongoDB db instance");
  }

  const collection = db.collection("auditLogs");

  return {
    async create({
      adminId,
      action,
      targetType,
      targetId,
      metadata = {},
      timestamp = new Date(),
    } = {}) {
      const doc = {
        adminId: normalizeField(adminId),
        action: normalizeField(action),
        targetType: normalizeField(targetType),
        targetId: normalizeField(targetId),
        metadata: normalizeMetadata(metadata),
        timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
      };

      return collection.insertOne(doc);
    },
  };
}

export const AUDIT_LOG_INDEXES = [
  { key: { adminId: 1, timestamp: -1 }, name: "audit_admin_timestamp_idx" },
  { key: { action: 1, timestamp: -1 }, name: "audit_action_timestamp_idx" },
  { key: { targetType: 1, targetId: 1, timestamp: -1 }, name: "audit_target_timestamp_idx" },
];
