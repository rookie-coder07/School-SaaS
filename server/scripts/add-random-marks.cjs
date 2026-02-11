#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set in .env');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('school_saas');

  try {
    const teachers = db.collection('teachers');
    const students = db.collection('students');
    const marksCollection = db.collection('marks');

    // Get first teacher to find their class/section
    const teacher = await teachers.findOne({});
    if (!teacher) {
      console.log('❌ No teachers found');
      await client.close();
      return;
    }

    console.log(`📚 Found teacher: Class ${teacher.class}, Section ${teacher.section}`);

    // Get students in that class
    let classStudents = await students
      .find({
        class: teacher.class,
        section: teacher.section,
      })
      .limit(10)
      .toArray();

    // If none found, get any students from the school
    if (!classStudents.length) {
      console.log('⚠️ No students in this class, getting any students...');
      classStudents = await students
        .find({
          schoolId: teacher.schoolId,
        })
        .limit(10)
        .toArray();
    }

    if (!classStudents.length) {
      console.log('❌ No students found in this school');
      return;
    }

    console.log(`👨‍🎓 Found ${classStudents.length} students`);

    // Create random marks
    const subjects = ['Math', 'English', 'Science', 'History', 'Geography'];
    const exams = ['Midterm', 'Final', 'Quiz', 'Test', 'Practical'];
    const marksToInsert = [];

    for (const student of classStudents) {
      for (let i = 0; i < 3; i++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const exam = exams[Math.floor(Math.random() * exams.length)];
        const score = Math.floor(Math.random() * 40) + 60; // 60-100

        marksToInsert.push({
          schoolId: teacher.schoolId,
          studentId: student._id,
          teacherId: teacher.userId,
          subject,
          exam,
          class: String(teacher.class),
          section: String(teacher.section),
          score,
          createdAt: new Date(),
        });
      }
    }

    // Clear existing marks for this class
    await marksCollection.deleteMany({
      class: String(teacher.class),
      section: String(teacher.section),
      schoolId: teacher.schoolId,
    });

    // Insert new marks
    const result = await marksCollection.insertMany(marksToInsert);
    console.log(`✅ Added ${result.insertedIds.length} random marks`);

    // Show top student
    const topMark = marksToInsert.reduce((max, m) => (m.score > max.score ? m : max));
    const topStudent = classStudents.find(s => s._id.equals(topMark.studentId));
    console.log(`🏆 Topper: ${topStudent.name} - ${topMark.score} in ${topMark.subject} (${topMark.exam})`);

    // Show lowest student
    const lowMark = marksToInsert.reduce((min, m) => (m.score < min.score ? m : min));
    const lowStudent = classStudents.find(s => s._id.equals(lowMark.studentId));
    console.log(`📉 Needs Improvement: ${lowStudent.name} - ${lowMark.score} in ${lowMark.subject} (${lowMark.exam})`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

main();
