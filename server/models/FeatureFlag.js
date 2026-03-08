export default function createFeatureFlagModel(db) {
  if (!db?.collection) throw new Error("FeatureFlag model requires db");
  const collection = db.collection("featureFlags");
  return {
    collection,
    async upsert(name, enabled) {
      return collection.updateOne(
        { name: String(name || "").trim() },
        {
          $set: {
            name: String(name || "").trim(),
            enabled: Boolean(enabled),
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    },
  };
}
