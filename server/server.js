import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";
import teacherRoutes from "./routes/teacher.js";
import { MongoClient } from "mongodb";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/teacher", teacherRoutes);
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("🔥 UNHANDLED PROMISE:", reason);
});

/* =======================
   ADMIN AUTH (ONLY ONCE)
======================= */
function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Attach to request
    req.user = decoded;

    next();
  } catch (err) {
    console.error("ADMIN AUTH ERROR:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
/* ============================
   DATABASE CONNECTION
============================ */
const client = new MongoClient(process.env.MONGO_URI);
let db;

(async () => {
  await client.connect();
  db = client.db("school_saas");
  console.log("✅ MongoDB Connected");
})();


/* ============================
   FILE UPLOAD CONFIG
============================ */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}
const upload = multer({ dest: "uploads/" });

/* ============================
   BASIC TEST
============================ */
app.get("/", (req, res) => {
  res.json({ message: "Backend Running" });
});

/* ============================
   ADMIN LOGIN
============================ */
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
  {
    role: "ADMIN",
    schoolId: "DEFAULT_SCHOOL"   // 👈 IMPORTANT
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

  res.json({ token });
});

/* ============================
   UPLOAD TEACHERS (ONLY ONCE)
============================ */
app.post(
  "/api/admin/upload-teachers",
  adminAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const users = db.collection("users");
      const teachers = db.collection("teachers");

      for (const row of rows) {
        if (!row.email || !row.name) continue;

        const exists = await users.findOne({ email: row.email });
        if (exists) continue;

        const hash = await bcrypt.hash("teacher123", 10);

        const user = await users.insertOne({
          email: row.email,
          passwordHash: hash,
          role: "TEACHER",
          createdAt: new Date(),
        });

        await teachers.insertOne({
          userId: user.insertedId,
          name: row.name,
          class: row.class,
          section: row.section,
          schoolId: req.user.schoolId, // ✅ now safe
          createdAt: new Date(),
        });
      }

      res.json({ message: "Teachers uploaded successfully" });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);
 /* ============================
   UPLOAD STUDENTS (ADMIN)
============================ */
app.post(
  "/api/admin/upload-students",
  adminAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      console.log("📥 Student upload hit");

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const students = db.collection("students");

      for (const row of rows) {
        if (!row.name || !row.class || !row.section) continue;

        await students.insertOne({
          name: row.name,
          class: row.class,
          section: row.section,
          rollNo: row.rollNo || "",
          createdAt: new Date(),
        });
      }

      fs.unlinkSync(req.file.path);

      res.json({ message: "Students uploaded successfully" });
    } catch (err) {
      console.error("STUDENT UPLOAD ERROR:", err);
      res.status(500).json({ error: "Student upload failed" });
    }
  }
);



/* ============================
   TEACHER LOGIN
============================ */
app.post("/api/auth/teacher/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.collection("users").findOne({
      email,
      role: "TEACHER",
    });

    if (!user) {
      return res.status(401).json({ error: "Teacher not found" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Wrong password" });
    }

    // ✅ Fetch teacher profile
    const teacher = await db.collection("teachers").findOne({
      userId: user._id,
    });

    if (!teacher) {
      return res.status(400).json({
        error: "Teacher profile missing. Contact admin.",
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: "TEACHER" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ SEND CLASS + SECTION
    res.json({
      token,
      class: teacher.class,
      section: teacher.section,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/teacher/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.collection("users").findOne({
      email,
      role: "TEACHER",
    });

    if (!user) {
      return res.status(401).json({ error: "Teacher not found" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Wrong password" });
    }

    // 🔥 Correct lookup
    const teacher = await db.collection("teachers").findOne({
      userId: user._id
    });

    if (!teacher) {
      return res.status(404).json({
        error: "Teacher profile missing. Contact admin."
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: "TEACHER",
        class: teacher.class,
        section: teacher.section
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      class: teacher.class,
      section: teacher.section
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});


/* ============================
   GET STUDENTS
============================ */
app.get("/api/teacher/students", async (req, res) => {
  const teacher = await db.collection("teachers").findOne({
    userId: new ObjectId(req.user.userId),
  });

  if (!teacher) {
    return res.status(404).json({ error: "Teacher not found" });
  }

  const students = await db.collection("students").find({
    class: teacher.class,
    section: teacher.section,
  }).toArray();

  res.json(students);
});

/* ============================
   ATTENDANCE SAVE
============================ */
app.post("/api/teacher/attendance/save", async (req, res) => {
  const { date, className, section, records } = req.body;

  const attendance = db.collection("attendance");

  for (const r of records) {
    await attendance.updateOne(
      { studentUserId: r.studentUserId, date },
      {
        $set: {
          studentUserId: r.studentUserId,
          date,
          class: className,
          section,
          status: r.status,
          submissionStatus: "DRAFT",
        },
      },
      { upsert: true }
    );
  }

  res.json({ message: "Attendance saved" });
});

/* ============================
   ATTENDANCE SUBMIT
============================ */
app.post("/api/teacher/attendance/submit", async (req, res) => {
  const { date, className, section } = req.body;

  await db.collection("attendance").updateMany(
    { date, class: className, section },
    { $set: { submissionStatus: "SUBMITTED" } }
  );

  res.json({ message: "Attendance submitted" });
});
app.post("/api/admissions", async (req, res) => {
  try {
    const {
      studentName,
      dob,
      classApplying,
      parentName,
      phone,
      email,
    } = req.body;

    if (!studentName || !classApplying || !parentName) {
      return res.status(400).json({ error: "Missing fields" });
    }

    await db.collection("admissions").insertOne({
      studentName,
      dob,
      classApplying,
      parentName,
      phone,
      email,
      status: "PENDING",
      createdAt: new Date(),
    });

    res.json({ message: "Admission submitted successfully" });
  } catch (err) {
    console.error("ADMISSION ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================
   START SERVER
============================ */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION:", reason);
});
