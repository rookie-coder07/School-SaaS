import { MongoClient } from "mongodb";

const uri = "mongodb+srv://school_db_user:Getin123@school.b1ej8vp.mongodb.net/school_saas";

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
