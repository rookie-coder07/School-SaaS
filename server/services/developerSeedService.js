import bcrypt from "bcryptjs";

export const DEFAULT_DEVELOPER_EMAIL = "dev@edunest.dev";
export const DEFAULT_DEVELOPER_PASSWORD = "developer123";
export const DEFAULT_DEVELOPER_NAME = "Platform Developer";

export async function ensureDeveloperUser(db) {
  if (!db) {
    throw new Error("Database connection required for developer seeding.");
  }

  const existing = await db.collection("users").findOne({
    email: DEFAULT_DEVELOPER_EMAIL,
    role: "DEVELOPER",
  });

  if (existing) {
    return { exists: true, user: existing };
  }

  const passwordHash = await bcrypt.hash(DEFAULT_DEVELOPER_PASSWORD, 10);
  const timestamp = new Date();
  const result = await db.collection("users").insertOne({
    name: DEFAULT_DEVELOPER_NAME,
    email: DEFAULT_DEVELOPER_EMAIL,
    passwordHash,
    role: "DEVELOPER",
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return { exists: false, insertedId: result.insertedId };
}
