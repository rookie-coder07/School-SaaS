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
      name: 1,
      email: 1,
      isDeleted: 1,
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
      students: {
        $push: {
          _id: "$_id",
          name: "$name",
          email: "$email",
          isDeleted: "$isDeleted",
          updatedAt: "$updatedAt",
          createdAt: "$createdAt",
        },
      },
    },
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1, "_id.schoolId": 1, "_id.class": 1, "_id.section": 1, "_id.rollNo": 1 } },
];

async function run() {
  const uri = String(process.env.MONGO_URI || "").trim();
  if (!uri) throw new Error("MONGO_URI is required");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("school_saas");
    const duplicates = await db.collection("students").aggregate(pipeline).toArray();
    console.log(JSON.stringify({ duplicateGroups: duplicates.length, duplicates }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("FIND_STUDENT_DUPLICATES_ERROR:", error.message);
  process.exit(1);
});
