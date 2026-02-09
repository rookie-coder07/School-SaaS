import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

async function seedDeveloper() {
  try {
    await client.connect();
    const db = client.db("school_saas");

    // Check if DEVELOPER already exists
    const existing = await db.collection("users").findOne({
      email: "developer@example.com",
      role: "DEVELOPER",
    });

    if (existing) {
      console.log("✅ DEVELOPER user already exists:", existing.email);
      client.close();
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash("developer123", 10);

    // Create DEVELOPER user (note: NO schoolId)
    const result = await db.collection("users").insertOne({
      email: "developer@example.com",
      passwordHash,
      role: "DEVELOPER",
      createdAt: new Date(),
    });

    console.log("✅ DEVELOPER user created!");
    console.log("   Email: developer@example.com");
    console.log("   Password: developer123");
    console.log("   ID:", result.insertedId);
  } catch (err) {
    console.error("❌ SEED ERROR:", err);
  } finally {
    client.close();
  }
}

seedDeveloper();
