const normalizeText = (value) => String(value || "").trim();

const normalizeMetadata = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
};

export default function createDeveloperActionLogModel(db) {
  if (!db?.collection) {
    throw new Error("DeveloperActionLog model requires a MongoDB db instance");
  }

  const collection = db.collection("developerActionLogs");

  return {
    async create({
      developerId,
      action,
      targetType,
      targetId,
      metadata = {},
      ip = "",
      timestamp = new Date(),
    } = {}) {
      const doc = {
        developerId: normalizeText(developerId),
        action: normalizeText(action),
        targetType: normalizeText(targetType),
        targetId: normalizeText(targetId),
        metadata: normalizeMetadata(metadata),
        ip: normalizeText(ip),
        timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
      };
      return collection.insertOne(doc);
    },
  };
}

export const DEVELOPER_ACTION_LOG_INDEXES = [
  { key: { developerId: 1, timestamp: -1 }, name: "dev_action_developer_timestamp_idx" },
  { key: { action: 1, timestamp: -1 }, name: "dev_action_action_timestamp_idx" },
  { key: { targetType: 1, targetId: 1, timestamp: -1 }, name: "dev_action_target_timestamp_idx" },
];

