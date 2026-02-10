require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('school_saas');

    const students = await db.collection('students').find({}).toArray();
    console.log('Found students:', students.length);

    let updated = 0;
    for (const s of students) {
      if (s.email) continue; // already has email
      if (!s.userId) continue;
      const user = await db.collection('users').findOne({ _id: s.userId });
      if (!user || !user.email) continue;
      await db.collection('students').updateOne({ _id: s._id }, { $set: { email: user.email } });
      updated++;
      console.log('Updated student', s._id.toString(), 'email', user.email);
    }

    console.log('Backfill complete. Updated:', updated);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
