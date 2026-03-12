import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const MONGO_URI = String(process.env.MONGO_URI || "").trim();
const MONGO_DB_NAME = String(process.env.MONGO_DB_NAME || "school_saas").trim() || "school_saas";
const dryRun = !process.argv.includes("--apply");

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

const hasAnyText = (doc) => {
  const textMessage = String(doc?.textMessage || "").trim();
  const message = String(doc?.message || "").trim();
  return Boolean(textMessage || message);
};

async function deleteMissingForCollection(db, collectionName) {
  const collection = db.collection(collectionName);
  const query = {
    isDeleted: { $ne: true },
    audioUrl: { $type: "string", $ne: "" },
  };

  let scanned = 0;
  let missingAudio = 0;
  let skippedWithText = 0;
  const idsToDelete = [];

  const cursor = collection.find(query, {
    projection: { _id: 1, audioUrl: 1, textMessage: 1, message: 1 },
  });

  for await (const doc of cursor) {
    scanned += 1;
    const localPaths = toLocalAudioPaths(doc?.audioUrl);
    if (!localPaths || localPaths.length === 0) continue;

    const checks = await Promise.all(localPaths.map((candidate) => fileExists(candidate)));
    const isMissing = !checks.some(Boolean);
    if (!isMissing) continue;

    missingAudio += 1;
    if (hasAnyText(doc)) {
      skippedWithText += 1;
      continue;
    }

    idsToDelete.push(doc._id);
  }

  let deleted = 0;
  if (!dryRun && idsToDelete.length > 0) {
    const result = await collection.deleteMany({ _id: { $in: idsToDelete } });
    deleted = Number(result.deletedCount || 0);
  } else {
    deleted = idsToDelete.length;
  }

  return { scanned, missingAudio, skippedWithText, deleted };
}

async function run() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(MONGO_DB_NAME);
    const collections = ["voiceMessages", "voice_messages"];
    const results = {};

    for (const name of collections) {
      results[name] = await deleteMissingForCollection(db, name);
    }

    console.log("Missing voice cleanup complete");
    console.log(`Database: ${MONGO_DB_NAME}`);
    console.log(`Dry run: ${dryRun ? "yes" : "no"}`);
    for (const [name, stats] of Object.entries(results)) {
      console.log(`Collection: ${name}`);
      console.log(`  Scanned: ${stats.scanned}`);
      console.log(`  Missing audio: ${stats.missingAudio}`);
      console.log(`  Skipped (has text): ${stats.skippedWithText}`);
      console.log(`  Would delete/Deleted: ${stats.deleted}`);
    }
  } catch (err) {
    console.error("Failed to delete missing voice messages:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
