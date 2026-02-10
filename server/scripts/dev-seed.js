'use strict';

import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

// load .env from current working directory (server)
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

async function makeUniqueEmail(usersCol, base) {
  let email = base.toLowerCase();
  let i = 1;
  while (await usersCol.findOne({ email })) {
    const parts = base.split('@');
    email = `${parts[0]}+${i}@${parts[1]}`.toLowerCase();
    i += 1;
  }
  return email;
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('school_saas');

  const schoolsCol = db.collection('schools');
  const usersCol = db.collection('users');
  const teachersCol = db.collection('teachers');
  const studentsCol = db.collection('students');

  // Create or reuse school
  let school = await schoolsCol.findOne({ name: 'Demo Public School 2' });
  if (!school) {
    const r = await schoolsCol.insertOne({ name: 'Demo Public School 2', createdAt: new Date() });
    school = await schoolsCol.findOne({ _id: r.insertedId });
  }
  const schoolId = school._id;

  // create admin
  const adminEmail = await makeUniqueEmail(usersCol, 'demo2_admin@example.com');
  const adminPwd = 'admin123';
  const adminHash = await bcrypt.hash(adminPwd, 10);
  await usersCol.insertOne({
    email: adminEmail,
    passwordHash: adminHash,
    role: 'ADMIN',
    schoolId: schoolId,
    createdAt: new Date(),
  });

  // create teacher
  const teacherEmail = await makeUniqueEmail(usersCol, 'demo2_teacher@example.com');
  const teacherPwd = 'teacher123';
  const teacherHash = await bcrypt.hash(teacherPwd, 10);
  const tRes = await usersCol.insertOne({
    email: teacherEmail,
    passwordHash: teacherHash,
    role: 'TEACHER',
    schoolId: schoolId,
    createdAt: new Date(),
  });
  const teacherUserId = tRes.insertedId;
  await teachersCol.updateOne(
    { userId: teacherUserId },
    { $set: { userId: teacherUserId, name: 'Demo Teacher 2', subject: 'General', class: '10', section: 'A', schoolId: schoolId, createdAt: new Date() } },
    { upsert: true }
  );

  // create two students
  const studentResults = [];
  for (let i = 1; i <= 2; i++) {
    const base = `demo2_student${i}@example.com`;
    const email = await makeUniqueEmail(usersCol, base);
    const pwd = 'student123';
    const hash = await bcrypt.hash(pwd, 10);
    const u = await usersCol.insertOne({ email, passwordHash: hash, role: 'STUDENT', schoolId: schoolId, createdAt: new Date() });
    const userId = u.insertedId;
    await studentsCol.updateOne(
      { userId },
      { $set: { userId, name: `Demo Student ${i} 2`, class: '10', section: 'A', rollNo: `${100 + i}`, schoolId: schoolId, createdAt: new Date() } },
      { upsert: true }
    );
    studentResults.push({ email, role: 'STUDENT' });
  }

  console.log('SEED COMPLETE');
  console.log('schoolId:', schoolId.toString());
  console.log('users:');
  console.log('- admin:', adminEmail, '/', adminPwd);
  console.log('- teacher:', teacherEmail, '/', teacherPwd);
  studentResults.forEach((s, idx) => console.log(`- student${idx + 1}:`, s.email, '/ student123'));

  await client.close();
}

main().catch((e) => {
  console.error('SEED ERROR', e);
  process.exit(1);
});
