require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in env');
    process.exit(1);
  }

  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db('school_saas');

    const users = await db.collection('users').find({ role: 'STUDENT' }).sort({ createdAt: -1 }).limit(10).toArray();
    if (!users.length) {
      console.log('No student users found');
      return;
    }

    for (const u of users) {
      const student = await db.collection('students').findOne({ userId: u._id });
      console.log('---');
      console.log('user:', { _id: u._id.toString(), email: u.email, role: u.role, createdAt: u.createdAt });
      if (student) {
        console.log('student:', {
          _id: student._id.toString(),
          userId: student.userId.toString(),
          name: student.name,
          class: student.class,
          section: student.section,
          rollNo: student.rollNo,
          parentName: student.parentName,
          phone: student.phone,
          schoolId: student.schoolId ? student.schoolId.toString() : null,
          createdAt: student.createdAt,
        });
      } else {
        console.log('student: NOT FOUND');
      }
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
