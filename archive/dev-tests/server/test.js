import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("MONGO_URI is required. Set it in your environment before running this script.");
  process.exit(1);
}

const client = new MongoClient(uri);
\nasync function test() {\n  try {\n    await client.connect();\n    console.log("MongoDB connected successfully");\n    process.exit();\n  } catch (e) {\n    console.error(e);\n  }\n}\n\ntest();\n