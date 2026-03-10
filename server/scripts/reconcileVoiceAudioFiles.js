import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const MONGO_URI = String(process.env.MONGO_URI || "").trim();
const MONGO_DB_NAME = String(process.env.MONGO_DB_NAME || "school_saas").trim() || "school_saas";
const dryRun = process.argv.includes("--dry-run");

if (!MONGO_URI) {
  console.error("MONGO_URI is not configured. Set it in server/.env first.");
  process.exit(1);
}

const toLocalAudioPaths = (audioUrl = "") => {
  const value = String(audioUrl || "").trim();
  if (!value.startsWith("/uploads/voice/")) return null;
  const relativePath = value.replace(/^\//, "");
  return [
    path.resolve(process.cwd(), relativePath),
    path.resolve(process.cwd(), "server", relativePath),
  ];
};

const fileExists = async (absolutePath) => {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

async function run() {
  const client = new MongoClient(MONGO_URI);
  let scanned = 0;
  let withAudio = 0;
  let missingAudio = 0;
  let updated = 0;
  let alreadyAccurate = 0;

  try {
    await client.connect();
    const db = client.db(MONGO_DB_NAME);
    const collection = db.collection("voiceMessages");

    const cursor = collection.find(
      { isDeleted: { $ne: true } },
      { projection: { _id: 1, audioUrl: 1, audioMissing: 1 } }
    );

    const ops = [];
    for await (const doc of cursor) {
      scanned += 1;
      const localPaths = toLocalAudioPaths(doc?.audioUrl);
      const hasAudio = Array.isArray(localPaths) && localPaths.length > 0;
      if (hasAudio) withAudio += 1;

      let nextAudioMissing = false;
      if (hasAudio) {
        const checks = await Promise.all(localPaths.map((candidate) => fileExists(candidate)));
        nextAudioMissing = !checks.some(Boolean);
      }

      if (nextAudioMissing) missingAudio += 1;

      const current = Boolean(doc?.audioMissing);
      if (current === nextAudioMissing) {
        alreadyAccurate += 1;
        continue;
      }

      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { audioMissing: nextAudioMissing, updatedAt: new Date() } },
        },
      });
    }

    if (!dryRun && ops.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < ops.length; i += chunkSize) {
        const chunk = ops.slice(i, i + chunkSize);
        const result = await collection.bulkWrite(chunk, { ordered: false });
        updated += Number(result.modifiedCount || 0);
      }
    } else {
      updated = ops.length;
    }

    console.log("Voice audio reconciliation complete");
    console.log(`Database: ${MONGO_DB_NAME}`);
    console.log(`Dry run: ${dryRun ? "yes" : "no"}`);
    console.log(`Scanned: ${scanned}`);
    console.log(`With local audio URL: ${withAudio}`);
    console.log(`Marked missing: ${missingAudio}`);
    console.log(`Would update/Updated docs: ${updated}`);
    console.log(`Already accurate: ${alreadyAccurate}`);
  } catch (err) {
    console.error("Failed to reconcile voice audio files:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
