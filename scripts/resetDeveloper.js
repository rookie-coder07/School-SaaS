import dotenv from "dotenv";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import fs from "fs";
import readline from "readline";

const envPath = path.resolve(process.cwd(), "server/.env");
dotenv.config({ path: envPath });

const MONGO_URI = String(process.env.MONGO_URI || "").trim();
const MONGO_DB_NAME = String(process.env.MONGO_DB_NAME || "school_saas").trim() || "school_saas";

if (!MONGO_URI) {
  console.error("MONGO_URI is not configured. Set it in server/.env before running the reset script.");
  process.exit(1);
}

const createPrompt = () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) =>
    new Promise((resolve) => {
      rl.question(question, (answer) => resolve(String(answer || "").trim()));
    });
  return { rl, ask };
};

const updateEnvValue = (content, key, value) => {
  if (!value) return content;
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  const suffix = content.endsWith("\n") ? "" : "\n";
  return `${content}${suffix}${line}`;
};

async function run() {
  console.log("Developer reset tool");
  console.log("Using Mongo URI:", MONGO_URI ? "FOUND" : "MISSING");

  const { rl, ask } = createPrompt();
  let client;
  try {
    const emailInput = await ask("New developer email (leave blank to keep current): ");
    const passwordInput = await ask("New developer password (leave blank to keep current): ");
    const accessCodeInput = await ask("New developer access code (leave blank to keep current): ");
    rl.close();

    const nextEmail = emailInput ? emailInput.toLowerCase() : "";
    const nextPassword = passwordInput;
    const nextAccessCode = accessCodeInput;

    client = new MongoClient(MONGO_URI);
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db(MONGO_DB_NAME);

    const developerUser = await db.collection("users").findOne({
      role: "DEVELOPER",
      isDeleted: { $ne: true },
    });

    if (!developerUser) {
      console.error("No developer account found. Run npm run seed:developer first.");
      process.exit(1);
    }

    const updates = {};
    if (nextEmail) {
      updates.email = nextEmail;
    }
    if (nextPassword) {
      updates.passwordHash = await bcrypt.hash(nextPassword, 10);
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.collection("users").updateOne({ _id: new ObjectId(developerUser._id) }, { $set: updates });
      console.log("Developer credentials updated in database.");
    } else {
      console.log("No database changes requested.");
    }

    if (nextAccessCode) {
      let envContent = "";
      try {
        envContent = fs.readFileSync(envPath, "utf8");
      } catch {
        envContent = "";
      }
      envContent = updateEnvValue(envContent, "DEVELOPER_ACCESS_CODE", nextAccessCode);
      fs.writeFileSync(envPath, envContent, "utf8");
      process.env.DEVELOPER_ACCESS_CODE = nextAccessCode;
      console.log("Developer access code updated in server/.env. Restart the server to apply.");
    } else {
      console.log("Access code unchanged.");
    }
  } catch (err) {
    console.error("Developer reset failed:", err?.message || err);
    process.exitCode = 1;
  } finally {
    try {
      await client?.close();
    } catch {
      // ignore
    }
  }
}

run();
