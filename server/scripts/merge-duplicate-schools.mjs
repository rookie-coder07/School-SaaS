import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: "server/.env" });

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("MONGO_URI is required");
}

const apply = process.argv.includes("--apply");
const dbNameArgIndex = process.argv.findIndex((arg) => arg === "--db");
const explicitDbName = dbNameArgIndex > -1 ? process.argv[dbNameArgIndex + 1] : null;

const normalizeSchoolName = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const schoolNameKey = (value = "") => normalizeSchoolName(value).toLowerCase();

const collectionsToMigrate = [
  "users",
  "teachers",
  "attendance",
  "homework",
  "exams",
  "marks",
  "notifications",
  "voiceMessages",
];

async function migrateStudentsCollection({
  db,
  duplicateSchoolId,
  duplicateSchoolIdStr,
  canonicalSchoolId,
  apply,
}) {
  const studentsCol = db.collection("students");
  const attendanceCol = db.collection("attendance");
  const marksCol = db.collection("marks");

  const duplicateStudents = await studentsCol.find({
    $or: [{ schoolId: duplicateSchoolId }, { schoolId: duplicateSchoolIdStr }],
  }).toArray();

  if (!apply) {
    return duplicateStudents.length;
  }

  let moved = 0;
  for (const student of duplicateStudents) {
    const classValue = String(student.class || student.className || "").trim();
    const sectionValue = String(student.section || "").trim();
    const rollNoValue = String(student.rollNo || student.admissionNumber || "").trim();

    const conflict = await studentsCol.findOne({
      _id: { $ne: student._id },
      schoolId: canonicalSchoolId,
      class: classValue,
      section: sectionValue,
      rollNo: rollNoValue,
    });

    if (!conflict) {
      const result = await studentsCol.updateOne(
        { _id: student._id },
        { $set: { schoolId: canonicalSchoolId, updatedAt: new Date() } }
      );
      moved += Number(result.modifiedCount || 0);
      continue;
    }

    // Resolve unique-key collision by merging dependent records into canonical student.
    await Promise.all([
      attendanceCol.updateMany(
        { $or: [{ schoolId: duplicateSchoolId }, { schoolId: duplicateSchoolIdStr }], studentId: student._id },
        { $set: { schoolId: canonicalSchoolId, studentId: conflict._id, updatedAt: new Date() } }
      ),
      marksCol.updateMany(
        { $or: [{ schoolId: duplicateSchoolId }, { schoolId: duplicateSchoolIdStr }], studentId: student._id },
        { $set: { schoolId: canonicalSchoolId, studentId: conflict._id, updatedAt: new Date() } }
      ),
    ]);

    const archivalRollNo = `MIG-${rollNoValue || "NA"}-${String(student._id).slice(-5)}`;
    const archiveResult = await studentsCol.updateOne(
      { _id: student._id },
      {
        $set: {
          schoolId: canonicalSchoolId,
          rollNo: archivalRollNo,
          admissionNumber: archivalRollNo,
          isDeleted: true,
          mergedIntoStudentId: conflict._id,
          mergedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    moved += Number(archiveResult.modifiedCount || 0);
  }

  return moved;
}

const client = new MongoClient(uri);
await client.connect();
const db = explicitDbName ? client.db(explicitDbName) : client.db();

const duplicateGroups = await db.collection("schools").aggregate([
  {
    $project: {
      _id: 1,
      name: 1,
      normalizedName: {
        $trim: { input: { $toString: { $ifNull: ["$name", ""] } } },
      },
    },
  },
  {
    $group: {
      _id: { $toLower: "$normalizedName" },
      count: { $sum: 1 },
      schools: { $push: { _id: "$_id", name: "$name", normalizedName: "$normalizedName" } },
    },
  },
  { $match: { count: { $gt: 1 }, _id: { $ne: "" } } },
]).toArray();

if (!duplicateGroups.length) {
  console.log("No duplicate school groups found.");
  await client.close();
  process.exit(0);
}

console.log(`Duplicate groups found: ${duplicateGroups.length}`);

const summary = [];

for (const group of duplicateGroups) {
  const schoolRows = group.schools || [];
  const scored = [];

  for (const school of schoolRows) {
    const schoolId = school._id;
    const schoolIdStr = String(schoolId);
    const [studentsObj, studentsStr] = await Promise.all([
      db.collection("students").countDocuments({ schoolId, isDeleted: { $ne: true } }),
      db.collection("students").countDocuments({ schoolId: schoolIdStr, isDeleted: { $ne: true } }),
    ]);
    scored.push({
      schoolId,
      schoolIdStr,
      name: school.name,
      normalizedName: school.normalizedName,
      studentCount: studentsObj + studentsStr,
    });
  }

  scored.sort((a, b) => b.studentCount - a.studentCount);
  const canonical = scored[0];
  const duplicates = scored.slice(1);

  console.log(`\nSchool group: "${canonical.normalizedName}"`);
  console.log(`Canonical: ${canonical.schoolIdStr} (students=${canonical.studentCount})`);
  duplicates.forEach((d) => {
    console.log(`Duplicate: ${d.schoolIdStr} (students=${d.studentCount})`);
  });

  const migrationStats = [];

  for (const duplicate of duplicates) {
    const movedStudents = await migrateStudentsCollection({
      db,
      duplicateSchoolId: duplicate.schoolId,
      duplicateSchoolIdStr: duplicate.schoolIdStr,
      canonicalSchoolId: canonical.schoolId,
      apply,
    });
    if (movedStudents > 0) {
      migrationStats.push({
        fromSchoolId: duplicate.schoolIdStr,
        collection: "students",
        moved: movedStudents,
      });
    }

    for (const collectionName of collectionsToMigrate) {
      const collection = db.collection(collectionName);
      const [resObj, resStr] = apply
        ? await Promise.all([
            collection.updateMany(
              { schoolId: duplicate.schoolId },
              { $set: { schoolId: canonical.schoolId, updatedAt: new Date() } }
            ),
            collection.updateMany(
              { schoolId: duplicate.schoolIdStr },
              { $set: { schoolId: canonical.schoolId, updatedAt: new Date() } }
            ),
          ])
        : await Promise.all([
            collection.countDocuments({ schoolId: duplicate.schoolId }),
            collection.countDocuments({ schoolId: duplicate.schoolIdStr }),
          ]);

      const changedCount = apply
        ? Number(resObj.modifiedCount || 0) + Number(resStr.modifiedCount || 0)
        : Number(resObj || 0) + Number(resStr || 0);

      if (changedCount > 0) {
        migrationStats.push({
          fromSchoolId: duplicate.schoolIdStr,
          collection: collectionName,
          moved: changedCount,
        });
      }
    }
  }

  if (apply) {
    await db.collection("schools").updateOne(
      { _id: canonical.schoolId },
      {
        $set: {
          name: normalizeSchoolName(canonical.name),
          nameKey: schoolNameKey(canonical.name),
          updatedAt: new Date(),
        },
      }
    );

    await db.collection("schools").deleteMany({
      _id: { $in: duplicates.map((d) => d.schoolId) },
    });
  }

  summary.push({
    schoolName: canonical.normalizedName,
    canonicalSchoolId: canonical.schoolIdStr,
    duplicates: duplicates.map((d) => d.schoolIdStr),
    migrationStats,
  });
}

console.log("\nSummary:");
console.log(JSON.stringify(summary, null, 2));
console.log(apply ? "\nApplied changes successfully." : "\nDry run complete. Re-run with --apply to execute.");

if (apply) {
  try {
    await db.collection("schools").createIndex(
      { name: 1 },
      { unique: true, name: "schools_name_unique_idx" }
    );
    console.log('Created unique index: schools_name_unique_idx');
  } catch (err) {
    console.warn("Could not create schools_name_unique_idx:", err.message);
  }

  try {
    await db.collection("schools").createIndex(
      { nameKey: 1 },
      { unique: true, name: "schools_nameKey_unique_idx" }
    );
    console.log('Created unique index: schools_nameKey_unique_idx');
  } catch (err) {
    console.warn("Could not create schools_nameKey_unique_idx:", err.message);
  }
}

await client.close();
