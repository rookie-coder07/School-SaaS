export default function createRequestTraceModel(db) {
  if (!db?.collection) throw new Error("RequestTrace model requires db");
  const collection = db.collection("requestTraces");
  return {
    collection,
    async create(payload = {}) {
      return collection.insertOne({
        route: String(payload.route || "/"),
        method: String(payload.method || "GET"),
        responseTime: Number(payload.responseTime) || 0,
        statusCode: Number(payload.statusCode) || 200,
        userId: payload.userId ? String(payload.userId) : null,
        schoolId: payload.schoolId ? String(payload.schoolId) : null,
        createdAt: payload.createdAt instanceof Date ? payload.createdAt : new Date(),
      });
    },
  };
}
