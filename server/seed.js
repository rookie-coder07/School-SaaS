/**
 * Seed Script - Development Only
 * Creates realistic test data for School-SaaS
 * 
 * Usage: node seed.js
 * 
 * Creates:
 * - 2 schools
 * - 20 teachers (10 per school)
 * - 1200 students (600 per school, 60 per teacher)
 * - 2 admin accounts (1 per school)
 */

import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// ============================================
// REALISTIC INDIAN NAMES DATA
// ============================================

const firstNames = {
  male: [
    "Rajesh", "Amit", "Vikram", "Arun", "Suresh", "Deepak", "Rohan", "Arjun",
    "Nikhil", "Sanjay", "Manoj", "Ashok", "Prakash", "Harsha", "Anand",
    "Karan", "Vivek", "Sandeep", "Varun", "Aditya", "Rahul", "Akshay",
    "Arpit", "Arnav", "Ritesh", "Naveen", "Pradeep", "Mohit", "Hari",
  ],
  female: [
    "Priya", "Neha", "Anjali", "Pooja", "Kavya", "Deepika", "Shruti",
    "Shweta", "Sneha", "Nidhi", "Isha", "Aisha", "Ananya", "Bhavna",
    "Charvi", "Divya", "Esha", "Fiona", "Gitika", "Harshita", "Isha",
  ],
};

const lastNames = [
  "Kumar", "Singh", "Patel", "Sharma", "Gupta", "Mishra", "Rao", "Verma",
  "Nair", "Iyer", "Menon", "Desai", "Joshi", "Bhatt", "Malhotra", "Saxena",
  "Tripathi", "Agarwal", "Reddy", "Bhat", "Srivastava", "Pandey", "Chakraborty",
  "Nambiar", "Pillai", "Das", "Roy", "Banerjee", "Mukherjee", "Chatterjee",
];

const subjects = [
  "Mathematics", "English", "Science", "Hindi", "Social Studies", "Physics",
  "Chemistry", "Biology", "History", "Geography", "Computer Science",
  "Physical Education", "Art", "Music", "Economics", "Accounting",
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomName(isMale = Math.random() > 0.5) {
  const firstName = getRandomElement(isMale ? firstNames.male : firstNames.female);
  const lastName = getRandomElement(lastNames);
  return { firstName, lastName, fullName: `${firstName} ${lastName}`, isMale };
}

function generateEmail(firstName, lastName, domain) {
  const cleanFirst = firstName.toLowerCase().replace(/\s+/g, "");
  const cleanLast = lastName.toLowerCase().replace(/\s+/g, "");
  const random = Math.floor(Math.random() * 1000);
  return `${cleanFirst}.${cleanLast}${random}@${domain}`;
}

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seed() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db("school_saas");

    console.log("\n🌱 Starting database seed...\n");

    // Clear existing data (optional - comment out if you want to keep data)
    // await db.collection("schools").deleteMany({});
    // await db.collection("users").deleteMany({});
    // await db.collection("teachers").deleteMany({});
    // await db.collection("students").deleteMany({});

    let schoolsCreated = 0;
    let adminsCreated = 0;
    let teachersCreated = 0;
    let studentsCreated = 0;

    // ============================================
    // CREATE 2 SCHOOLS
    // ============================================

    const schoolNames = [
      "Delhi Public Academy",
      "Mumbai International School",
    ];

    const schools = [];

    for (const schoolName of schoolNames) {
      const schoolDoc = {
        name: schoolName,
        address: `${schoolName} Campus, India`,
        phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `admin@${schoolName.toLowerCase().replace(/\s+/g, "")}edu.in`,
        createdAt: new Date(),
      };

      const result = await db.collection("schools").insertOne(schoolDoc);
      schools.push({ _id: result.insertedId, name: schoolName });
      schoolsCreated++;
      console.log(`✅ School created: ${schoolName}`);
    }

    // ============================================
    // CREATE ADMINS (1 PER SCHOOL)
    // ============================================

    for (let schoolIdx = 0; schoolIdx < schools.length; schoolIdx++) {
      const school = schools[schoolIdx];
      const adminName = getRandomName(true);
      const adminEmail = `admin${schoolIdx + 1}@${school.name.toLowerCase().replace(/\s+/g, "")}.com`;
      const adminPassword = "Password@123";
      const adminPasswordHash = await hashPassword(adminPassword);

      const adminUser = await db.collection("users").insertOne({
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        schoolId: school._id,
        createdAt: new Date(),
      });

      adminsCreated++;
      console.log(`  👤 Admin created: ${adminEmail}`);
    }

    // ============================================
    // CREATE TEACHERS (10 PER SCHOOL)
    // ============================================

    const teachersPerSchool = 10;
    const teachersBySchool = {};

    for (let schoolIdx = 0; schoolIdx < schools.length; schoolIdx++) {
      const school = schools[schoolIdx];
      const classes = ["A", "B", "C"];
      const sections = ["I", "II", "III", "IV"];
      teachersBySchool[schoolIdx] = [];

      for (let t = 0; t < teachersPerSchool; t++) {
        const teacherName = getRandomName(Math.random() > 0.4);
        const teacherEmail = generateEmail(
          teacherName.firstName,
          teacherName.lastName,
          `${school.name.toLowerCase().replace(/\s+/g, "")}.edu.in`
        );

        // Assign class/section
        const classNum = (t % 3) + 1; // 1, 2, 3
        const sectionIdx = (t % 4); // Index for section
        const sections_list = ["A", "B", "C", "D"];

        // Check if email already exists
        const existingUser = await db.collection("users").findOne({ email: teacherEmail });
        if (existingUser) {
          console.log(`  ⚠️  Teacher email already exists: ${teacherEmail}`);
          continue;
        }

        const teacherPassword = "Password@123";
        const teacherPasswordHash = await hashPassword(teacherPassword);

        const userResult = await db.collection("users").insertOne({
          email: teacherEmail,
          passwordHash: teacherPasswordHash,
          role: "TEACHER",
          schoolId: school._id,
          createdAt: new Date(),
        });

        const subject = getRandomElement(subjects);

        const teacherDoc = {
          userId: userResult.insertedId,
          name: teacherName.fullName,
          email: teacherEmail,
          subject: subject,
          class: String(classNum),
          section: sections_list[sectionIdx],
          schoolId: school._id,
          createdAt: new Date(),
        };

        await db.collection("teachers").insertOne(teacherDoc);
        teachersCreated++;

        teachersBySchool[schoolIdx].push({
          _id: userResult.insertedId,
          name: teacherName.fullName,
          email: teacherEmail,
          class: String(classNum),
          section: sections_list[sectionIdx],
        });
      }

      console.log(`  ✅ ${teachersPerSchool} teachers created for ${school.name}`);
    }

    // ============================================
    // CREATE STUDENTS (600 PER SCHOOL)
    // ============================================

    const studentsPerSchool = 600;

    for (let schoolIdx = 0; schoolIdx < schools.length; schoolIdx++) {
      const school = schools[schoolIdx];
      const teachers = teachersBySchool[schoolIdx];
      const studentsPerTeacher = Math.floor(studentsPerSchool / teachers.length);

      let currentStudentCount = 0;

      for (let teacherIdx = 0; teacherIdx < teachers.length; teacherIdx++) {
        const teacher = teachers[teacherIdx];
        let rollNo = 1;

        // Create students for this teacher's class/section
        for (let s = 0; s < studentsPerTeacher && currentStudentCount < studentsPerSchool; s++) {
          const studentName = getRandomName();
          const studentEmail = generateEmail(
            studentName.firstName,
            studentName.lastName,
            "gmail.com"
          );

          // Check if email already exists
          const existingUser = await db.collection("users").findOne({ email: studentEmail });
          if (existingUser) {
            continue; // Skip if email exists
          }

          const studentPassword = "Password@123";
          const studentPasswordHash = await hashPassword(studentPassword);

          const userResult = await db.collection("users").insertOne({
            email: studentEmail,
            passwordHash: studentPasswordHash,
            role: "STUDENT",
            createdAt: new Date(),
          });

          const parentLastName = studentName.lastName;
          const parentFirstNames = ["Mr.", "Mrs.", "Ms."];
          const parentName = `${getRandomElement(parentFirstNames)} ${studentName.firstName} ${parentLastName}`;
          const parentPhone = `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`;

          const studentDoc = {
            userId: userResult.insertedId,
            name: studentName.fullName,
            email: studentEmail,
            class: teacher.class,
            section: teacher.section,
            rollNo: String(rollNo),
            parentName: parentName,
            parentPhone: parentPhone,
            phone: parentPhone,
            schoolId: school._id,
            createdAt: new Date(),
          };

          await db.collection("students").insertOne(studentDoc);
          studentsCreated++;
          rollNo++;
          currentStudentCount++;

          // Log progress every 100 students
          if (currentStudentCount % 100 === 0) {
            console.log(`  📚 ${currentStudentCount}/${studentsPerSchool} students created for ${school.name}...`);
          }
        }
      }

      console.log(`  ✅ ${currentStudentCount} students created for ${school.name}`);
    }

    // ============================================
    // SUMMARY
    // ============================================

    console.log("\n" + "=".repeat(50));
    console.log("✅ SEEDING COMPLETED SUCCESSFULLY");
    console.log("=".repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   Schools created: ${schoolsCreated}`);
    console.log(`   Admins created: ${adminsCreated}`);
    console.log(`   Teachers created: ${teachersCreated}`);
    console.log(`   Students created: ${studentsCreated}`);
    console.log("=".repeat(50));

    console.log("\n🔑 Test Credentials:");
    console.log("   Admin Login: admin1@delhipublicacademy.com / Password@123");
    console.log("   Admin Login: admin2@mumbaiinternationalschool.com / Password@123");
    console.log("   Sample Teacher: firstname.lastname@schoolname.edu.in / Password@123");
    console.log("   Sample Student: firstname.lastname### @gmail.com / Password@123");
    console.log("\n");
  } catch (err) {
    console.error("❌ SEEDING ERROR:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// ============================================
// RUN SEED
// ============================================

seed();
