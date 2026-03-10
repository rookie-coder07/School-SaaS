import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";
import {
  ensureDeveloperUser,
  DEFAULT_DEVELOPER_EMAIL,
  DEFAULT_DEVELOPER_PASSWORD,
} from "../services/developerSeedService.js";

const envPath = path.resolve(process.cwd(), "server/.env");
dotenv.config({ path: envPath });

console.log("Using Mongo URI:", process.env.MONGO_URI ? "FOUND" : "MISSING");

const MONGO_URI = String(process.env.MONGO_URI || "").trim();
if (!MONGO_URI) {
  console.error("✖ MONGO_URI is not configured. Set it in server/.env before running the seed script.");
  process.exit(1);
}

const MONGO_DB_NAME = String(process.env.MONGO_DB_NAME || "school_saas").trim() || "school_saas";

async function run() {
  const client = new MongoClient(MONGO_URI);
  try {
    console.log("Connecting to MongoDB Atlas…");
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    const db = client.db(MONGO_DB_NAME);
    const result = await ensureDeveloperUser(db);
    if (result.exists) {
      console.log("✅ Developer user already exists:", DEFAULT_DEVELOPER_EMAIL);
      return;
    }

    console.log("✅ Developer user seeded:");
    console.log(`   Email: ${DEFAULT_DEVELOPER_EMAIL}`);
    console.log(`   Password: ${DEFAULT_DEVELOPER_PASSWORD}`);
    console.log("   Access Code: Set DEVELOPER_ACCESS_CODE in your environment");
    if (result.insertedId) {
      console.log("   User ID:", result.insertedId);
    }
  } catch (err) {
    console.error("✖ Failed to connect to MongoDB Atlas. Check MONGO_URI or network access.");
    console.error("✖ Failed to seed developer user:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("✖ Unhandled error in seed script:", err?.message || err);
  process.exitCode = 1;
});
