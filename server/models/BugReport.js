export default function createBugReportModel(db) {
  if (!db?.collection) throw new Error("BugReport model requires db");
  const collection = db.collection("bugReports");
  return {
    collection,
    async create(payload = {}) {
      return collection.insertOne({
        type: String(payload.type || "runtime"),
        route: String(payload.route || "unknown"),
        message: String(payload.message || "Unknown error"),
        statusCode: Number(payload.statusCode) || 500,
        userId: payload.userId ? String(payload.userId) : null,
        role: String(payload.role || "system"),
        schoolId: payload.schoolId ? String(payload.schoolId) : null,
        metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
        createdAt: payload.createdAt instanceof Date ? payload.createdAt : new Date(),
      });
    },
  };
}
