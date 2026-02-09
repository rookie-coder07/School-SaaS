import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const client = new MongoClient(process.env.MONGO_URI);
(async ()=>{
  await client.connect();
  const db = client.db('school_saas');
  const u = await db.collection('users').findOne({ email: 'demo2_admin@example.com' });
  console.log(JSON.stringify(u, null, 2));
  await client.close();
})();
