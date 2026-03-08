export default function createActivityLogModel(db) {
  if (!db?.collection) throw new Error("ActivityLog model requires db");
  const collection = db.collection("activityLogs");
  return {
    collection,
    async create(payload = {}) {
      return collection.insertOne({
        action: String(payload.action || "").trim(),
        userId: payload.userId ? String(payload.userId) : null,
        role: String(payload.role || "unknown"),
        schoolId: payload.schoolId ? String(payload.schoolId) : null,
        metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
        createdAt: payload.createdAt instanceof Date ? payload.createdAt : new Date(),
      });
    },
  };
}
