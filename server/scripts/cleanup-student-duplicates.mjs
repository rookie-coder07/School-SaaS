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
      class: { $trim: { input: { $toString: { $ifNull: ["$class", ""] } } } },
      section: { $trim: { input: { $toString: { $ifNull: ["$section", ""] } } } },
      rollNo: { $trim: { input: { $toString: { $ifNull: ["$rollNo", ""] } } } },
      updatedAt: 1,
      createdAt: 1,
    },
  },
  {
    $match: {
      schoolId: { $ne: null },
      class: { $ne: "" },
      section: { $ne: "" },
      rollNo: { $ne: "" },
    },
  },
  {
    $group: {
      _id: {
        schoolId: "$schoolId",
        class: "$class",
        section: "$section",
        rollNo: "$rollNo",
      },
      count: { $sum: 1 },
      ids: { $push: "$_id" },
    },
  },
  { $match: { count: { $gt: 1 } } },
];

const toTime = (value) => {
  const date = value ? new Date(value) : null;
  const ms = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  return ms;
};

async function run() {
  const uri = String(process.env.MONGO_URI || "").trim();
  if (!uri) throw new Error("MONGO_URI is required");

  const dryRun = !process.argv.includes("--apply");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("school_saas");
    const students = db.collection("students");
    const duplicateGroups = await students.aggregate(pipeline).toArray();

    console.log(`Duplicate groups found: ${duplicateGroups.length}`);
    if (duplicateGroups.length === 0) {
      return;
    }

    const deletedIds = [];
    for (const group of duplicateGroups) {
      const groupIds = group.ids || [];
      const docs = await students
        .find({ _id: { $in: groupIds }, schoolId: group._id.schoolId })
        .project({ _id: 1, updatedAt: 1, createdAt: 1 })
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
      if (!remove.length) continue;

      console.log(
        `schoolId=${group._id.schoolId} class=${group._id.class} section=${group._id.section} rollNo=${group._id.rollNo} keep=${keep._id} delete=${remove.join(",")}`
      );

      if (!dryRun) {
        const result = await students.deleteMany({
          _id: { $in: remove },
          schoolId: group._id.schoolId,
        });
        console.log(`deleted=${result.deletedCount}`);
      }

      deletedIds.push(...remove.map(String));
    }

    console.log(
      dryRun
        ? `Dry run complete. Candidates to delete: ${deletedIds.length}`
        : `Cleanup complete. Deleted students: ${deletedIds.length}`
    );
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("CLEANUP_STUDENT_DUPLICATES_ERROR:", error.message);
  process.exit(1);
});
