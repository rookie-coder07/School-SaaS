import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/* ================================
   DATABASE CONNECTION
================================ */
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function startServer() {
  await client.connect();
  db = client.db("school_saas");
  console.log("✅ MongoDB Connected");

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}
startServer();

/* ================================
   MIDDLEWARES
================================ */
const upload = multer({ dest: "uploads/" });

function adminAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN")
      return res.status(403).json({ error: "Admin only" });

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function teacherAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "TEACHER")
      return res.status(403).json({ error: "Teacher only" });

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ================================
   ADMIN LOGIN
================================ */
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { role: "ADMIN", schoolId: process.env.SCHOOL_ID },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

/* ================================
   UPLOAD TEACHERS
================================ */
app.post(
  "/api/admin/upload-teachers",
  
  upload.single("file"),
  async (req, res) => {
    const rows = XLSX.utils.sheet_to_json(
      XLSX.readFile(req.file.path).Sheets[
        XLSX.readFile(req.file.path).SheetNames[0]
      ]
    );

    for (const row of rows) {
      let user = await db.collection("users").findOne({ email: row.email });

      if (!user) {
        const hash = await bcrypt.hash("teacher123", 10);
        const u = await db.collection("users").insertOne({
          email: row.email,
          passwordHash: hash,
          role: "TEACHER",
          schoolId: process.env.SCHOOL_ID,
        });
        user = { _id: u.insertedId };
      }

      await db.collection("teachers").updateOne(
        { userId: user._id },
        {
          $set: {
            name: row.name,
            class: row.class,
            section: row.section,
            subject: row.subject || "",
            schoolId: process.env.SCHOOL_ID,
          },
        },
        { upsert: true }
      );
    }

    res.json({ message: "Teachers uploaded successfully" });
  }
);

/* ================================
   UPLOAD STUDENTS
================================ */
app.post(
  "/api/admin/upload-students",
  
  upload.single("file"),
  async (req, res) => {
    const rows = XLSX.utils.sheet_to_json(
      XLSX.readFile(req.file.path).Sheets[
        XLSX.readFile(req.file.path).SheetNames[0]
      ]
    );

    for (const row of rows) {
      await db.collection("students").insertOne({
        name: row.name,
        class: row.class,
        section: row.section,
        rollNo: row.rollNo || "",
        schoolId: process.env.SCHOOL_ID,
        createdAt: new Date(),
      });
    }

    res.json({ message: "Students uploaded successfully" });
  }
);

/* ================================
   TEACHER LOGIN
================================ */
app.post("/api/auth/teacher/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.collection("users").findOne({ email });
  if (!user) return res.status(401).json({ error: "User not found" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Wrong password" });

  const teacher = await db.collection("teachers").findOne({
    userId: user._id,
  });

  if (!teacher)
    return res.status(400).json({ error: "Teacher profile missing" });

  const token = jwt.sign(
    {
      userId: user._id,
      role: "TEACHER",
      class: teacher.class,
      section: teacher.section,
      schoolId: process.env.SCHOOL_ID,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    class: teacher.class,
    section: teacher.section,
  });
});

/* ================================
   GET STUDENTS (MAPPING)
================================ */
app.get("/api/teacher/students", teacherAuth, async (req, res) => {
  const students = await db.collection("students").find({
    class: req.user.class,
    section: req.user.section,
    schoolId: req.user.schoolId,
  }).toArray();

  res.json(students);
});

/* ================================
   SAVE ATTENDANCE
================================ */
app.post("/api/teacher/attendance/save", async (req, res) => {
  const { date, className, section, records } = req.body;

  for (const r of records) {
    await db.collection("attendance").updateOne(
      { studentUserId: r.studentUserId, date },
      {
        $set: {
          studentUserId: r.studentUserId,
          date,
          class: className,
          section,
          status: r.status,
        },
      },
      { upsert: true }
    );
  }

  res.json({ message: "Attendance saved" });
});

/* ================================
   SUBMIT ATTENDANCE
================================ */
app.post("/api/teacher/attendance/submit", async (req, res) => {
  const { date, className, section } = req.body;

  await db.collection("attendance").updateMany(
    { date, class: className, section },
    { $set: { submissionStatus: "SUBMITTED" } }
  );

  res.json({ message: "Attendance submitted" });
});