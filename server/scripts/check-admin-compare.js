import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

dotenv.config();

(async ()=>{
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('school_saas');
  const user = await db.collection('users').findOne({ email: 'demo2_admin@example.com' });
  console.log('USER:', !!user);
  if (user) {
    console.log('HASH:', user.passwordHash);
    const ok = await bcrypt.compare('admin123', user.passwordHash);
    console.log('COMPARE admin123 =>', ok);
  }
  await client.close();
})().catch(e=>{console.error(e);process.exit(1)});
