import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import XLSX from "xlsx";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ================================
   DB CONNECTION
================================ */
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function startServer() {
  await client.connect();
  db = client.db("school_saas");
  console.log("✅ MongoDB connected");

  app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
  });
}
startServer();

/* ================================
   MIDDLEWARE
================================ */
function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role)
      return res.status(403).json({ error: "Access denied" });
    next();
  };
}

const upload = multer({ dest: "uploads/" });

/* ================================
   ADMIN LOGIN
================================ */
app.post("/api/auth/login", async (req, res) => {
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
   STUDENT LOGIN
================================ */
app.post("/api/auth/student/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.collection("users").findOne({
    email,
    role: "STUDENT",
  });

  if (!user) return res.status(401).json({ error: "Student not found" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: "Wrong password" });

  const student = await db.collection("students").findOne({
    userId: user._id,
  });

  const token = jwt.sign(
    {
      userId: user._id,
      role: "STUDENT",
      class: student.class,
      section: student.section,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token, student });
});


/* ================================
   TEACHER LOGIN
================================ */
app.post("/api/auth/teacher/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.collection("users").findOne({
    email,
    role: "TEACHER",
  });

  if (!user) return res.status(401).json({ error: "Teacher not found" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Wrong password" });

  const teacher = await db.collection("teachers").findOne({
    userId: user._id,
  });

  const token = jwt.sign(
    {
      userId: user._id,
      role: "TEACHER",
      class: teacher.class,
      section: teacher.section,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

/* ================================
   STUDENT DASHBOARD
================================ */
app.get("/api/student/dashboard", requireAuth, requireRole("STUDENT"), async (req, res) => {
  const student = await db.collection("students").findOne({
    userId: new ObjectId(req.user.userId),
  });

  const teacher = await db.collection("teachers").findOne({
    class: student.class,
    section: student.section,
  });

  res.json({ student, teacher });
});

/* ================================
   STUDENT ATTENDANCE
================================ */
app.get("/api/student/attendance", requireAuth, async (req, res) => {
  const records = await db.collection("attendance")
    .find({ studentUserId: new ObjectId(req.user.userId) })
    .toArray();

  res.json(records);
});

/* ================================
   STUDENT MARKS
================================ */
app.get("/api/student/marks", requireAuth, async (req, res) => {
  const marks = await db.collection("marks")
    .find({ studentUserId: new ObjectId(req.user.userId) })
    .toArray();

  res.json(marks);
});

/* ================================
   UPLOAD STUDENTS (ADMIN)
================================ */
app.post("/api/admin/upload-students", upload.single("file"), async (req, res) => {
  const rows = XLSX.utils.sheet_to_json(
    XLSX.readFile(req.file.path).Sheets["Sheet1"]
  );

  for (const row of rows) {
    const email =
      row.email ||
      `${row.name.replace(/\s+/g, "").toLowerCase()}@school.com`;

    let user = await db.collection("users").findOne({ email });

    if (!user) {
      const hash = await bcrypt.hash("student123", 10);
      const r = await db.collection("users").insertOne({
        email,
        passwordHash: hash,
        role: "STUDENT",
      });
      user = { _id: r.insertedId };
    }

    await db.collection("students").updateOne(
      { userId: user._id },
      {
        $set: {
          name: row.name,
          class: row.class,
          section: row.section,
          rollNo: row.rollNo || "",
        },
      },
      { upsert: true }
    );
  }

  res.json({ message: "Students uploaded successfully" });
});
/* ================================
   UPLOAD TEACHERS (ADMIN)
================================ */
app.post("/api/admin/upload-teachers", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    for (const row of rows) {
      const email =
        row.email ||
        `${row.name.replace(/\s+/g, "").toLowerCase()}@school.com`;

      let user = await db.collection("users").findOne({ email });

      if (!user) {
        const hash = await bcrypt.hash("teacher123", 10);

        const result = await db.collection("users").insertOne({
          email,
          passwordHash: hash,
          role: "TEACHER",
        });

        user = { _id: result.insertedId };
      }

      await db.collection("teachers").updateOne(
        { userId: user._id },
        {
          $set: {
            name: row.name,
            subject: row.subject || "",
            class: row.class || "",
            section: row.section || "",
          },
        },
        { upsert: true }
      );
    }

    res.json({ message: "Teachers uploaded successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Teacher upload failed" });
  }
});
/* ================================
   TEACHER → GET STUDENTS
================================ */
app.get("/api/teacher/students", requireAuth, requireRole("TEACHER"), async (req, res) => {
  const students = await db.collection("students").find({
    class: req.user.class,
    section: req.user.section,
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
      {
        studentUserId: r.studentUserId,
        date,
      },
      {
        $set: {
          status: r.status,
          class: className,
          section,
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