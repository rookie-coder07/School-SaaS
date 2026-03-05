import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/school_saas";

const client = new MongoClient(uri);

async function test() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully");
    process.exit();
  } catch (e) {
    console.error(e);
  }
}

test();
