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
    const marks = db.collection('marks');

    // Get first teacher
    const teacher = await teachers.findOne({});
    if (!teacher) {
      console.log('❌ No teachers found');
      await client.close();
      return;
    }

    console.log('📚 Teacher Details:');
    console.log(`  Class: ${teacher.class}`);
    console.log(`  Section: ${teacher.section}`);
    console.log(`  SchoolId: ${teacher.schoolId}`);
    console.log('');

    // Check marks in database
    const allMarks = await marks.find({}).toArray();
    console.log(`📊 Total marks in database: ${allMarks.length}`);
    
    if (allMarks.length > 0) {
      console.log('Sample mark:', JSON.stringify(allMarks[0], null, 2));
    }
    console.log('');

    // Check marks for this teacher's class
    const classMarks = await marks.find({
      class: String(teacher.class),
      section: String(teacher.section),
      schoolId: teacher.schoolId,
    }).toArray();

    console.log(`🎯 Marks for teacher's class (${teacher.class}-${teacher.section}): ${classMarks.length}`);
    
    if (classMarks.length > 0) {
      console.log('Sample:', JSON.stringify(classMarks[0], null, 2));
    } else {
      console.log('⚠️ No marks found for this class!');
      
      // Show all marks with different classes
      const marksWithClasses = await marks.aggregate([
        { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } }
      ]).toArray();
      console.log('Marks by class:');
      marksWithClasses.forEach(m => {
        console.log(`  ${m._id.class}-${m._id.section}: ${m.count}`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

main();
