import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const pipeline = [
  {
    $project: {
      _id: 1,
      schoolId: 1,
      role: 1,
      email: 1,
      normalizedEmail: { $toLower: { $trim: { input: { $toString: { $ifNull: ["$email", ""] } } } } },
      updatedAt: 1,
      createdAt: 1,
    },
  },
  {
    $match: {
      normalizedEmail: { $ne: "" },
    },
  },
  {
    $group: {
      _id: "$normalizedEmail",
      count: { $sum: 1 },
      ids: { $push: "$_id" },
    },
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1, _id: 1 } },
];

const toTime = (value) => {
  const date = value ? new Date(value) : null;
  const ms = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  return ms;
};

async function run() {
  const uri = String(process.env.MONGO_URI || "").trim();
  if (!uri) throw new Error("MONGO_URI is required");

  const dbName = String(process.env.MONGO_DB_NAME || "school_saas").trim() || "school_saas";
  const dryRun = !process.argv.includes("--apply");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");
    const duplicateGroups = await users.aggregate(pipeline).toArray();

    console.log(`Duplicate email groups found: ${duplicateGroups.length}`);
    if (duplicateGroups.length === 0) return;

    let deleteCount = 0;
    for (const group of duplicateGroups) {
      const docs = await users
        .find({ _id: { $in: group.ids } })
        .project({ _id: 1, email: 1, role: 1, schoolId: 1, updatedAt: 1, createdAt: 1 })
        .toArray();

      docs.sort((a, b) => {
        const byUpdated = toTime(b.updatedAt) - toTime(a.updatedAt);
        if (byUpdated !== 0) return byUpdated;
        const byCreated = toTime(b.createdAt) - toTime(a.createdAt);
        if (byCreated !== 0) return byCreated;
        return String(b._id).localeCompare(String(a._id));
      });

      const keep = docs[0];
      const remove = docs.slice(1).map((doc) => doc._id);

      console.log(`email=${group._id} keep=${keep._id} delete=${remove.join(",")}`);
      if (!dryRun && remove.length) {
        const result = await users.deleteMany({ _id: { $in: remove } });
        deleteCount += result.deletedCount;
        console.log(`deleted=${result.deletedCount}`);
      }
    }

    console.log(
      dryRun
        ? "Dry run complete. Re-run with --apply to delete duplicates."
        : `Cleanup complete. Deleted users: ${deleteCount}`
    );
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("CLEANUP_USER_EMAIL_DUPLICATES_ERROR:", error.message);
  process.exit(1);
});
