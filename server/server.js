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

const safeObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
};

/* ================================
   DB CONNECTION
   ================================= */
const client = new MongoClient(process.env.MONGO_URI);
let db;

async function startServer() {
  await client.connect();
  db = client.db("school_saas");
  console.log("✅ MongoDB connected");

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}
startServer();

/* ================================
   MIDDLEWARE
   ================================= */
function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      schoolId: decoded.schoolId || null,
      class: decoded.class,
      section: decoded.section,
    };

    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}
const upload = multer({ dest: "uploads/" });

/* ================================
   ADMIN LOGIN
   ================================= */
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
   ================================= */
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
      userId: student.userId,
      studentId: student._id,
      schoolId: student.schoolId,
      role: "STUDENT",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, student });
});

/* ================================
   TEACHER LOGIN
   ================================= */
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
    userId: user._id.toString(),
    role: "TEACHER",
    class: teacher.class,
    section: teacher.section,
    schoolId: teacher.schoolId ? teacher.schoolId.toString() : null,
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

res.json({
  token,
  teacher: {
    ...teacher,
    schoolId: teacher.schoolId ? teacher.schoolId.toString() : null,
  },
});
});

/* ================================
   STUDENT DASHBOARD
   ================================= */
app.get("/api/student/dashboard", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = safeObjectId(req.user?.schoolId);
    if (!userObjectId || !schoolObjectId) {
      return res.status(400).json({ error: "Missing or invalid userId/schoolId in token" });
    }

    // find the student doc (students._id is what teacher/client uses as studentUserId)
    const student = await db.collection("students").findOne({
      userId: userObjectId,
      ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const studentId = student._id;

    const attendance = await db
      .collection("attendance")
      .find({
        ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
        $or: [{ studentUserId: studentId }, { studentId: studentId }],
        submissionStatus: "SUBMITTED",
      })
      .sort({ date: -1 })
      .toArray();

    const marks = await db
      .collection("marks")
      .find({
        ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
        $or: [{ studentId: studentId }, { studentUserId: studentId }],
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("MARKS COUNT:", marks.length);
    console.log("ATTENDANCE COUNT:", attendance.length);

    res.json({ student, attendance, marks });
  } catch (err) {
    console.error("STUDENT DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});
/* ================================
   STUDENT: GET ATTENDANCE
   ================================= */
app.get("/api/student/attendance", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = safeObjectId(req.user?.schoolId);
    if (!userObjectId || !schoolObjectId) {
      return res.status(400).json({ error: "Missing or invalid userId/schoolId in token" });
    }

    const student = await db.collection("students").findOne({
      userId: userObjectId,
      ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
    });
    if (!student) return res.json([]);

    const studentId = student._id;

    const query = {
      ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
      $or: [{ studentUserId: studentId }, { studentId: studentId }],
      submissionStatus: "SUBMITTED",
    };

    console.log("ATTENDANCE QUERY:", query);

    const records = await db
      .collection("attendance")
      .find(query)
      .sort({ date: -1 })
      .toArray();

    console.log("ATTENDANCE COUNT:", records.length);
    res.json(records);
  } catch (err) {
    console.error("STUDENT ATTENDANCE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});
/* ================================
   STUDENT: GET MARKS
   ================================= */
app.get("/api/student/marks", requireAuth, requireRole("STUDENT"), async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = safeObjectId(req.user?.schoolId);
    if (!userObjectId || !schoolObjectId) {
      return res.status(400).json({ error: "Missing or invalid userId/schoolId in token" });
    }

    const student = await db.collection("students").findOne({
      userId: userObjectId,
      ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
    });
    if (!student) return res.json([]);

    const studentId = student._id;

    const query = {
      ...(schoolObjectId ? { schoolId: schoolObjectId } : {}),
      $or: [{ studentId: studentId }, { studentUserId: studentId }],
    };

    console.log("MARKS QUERY:", query);

    const marks = await db
      .collection("marks")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log("MARKS COUNT:", marks.length);
    res.json(marks);
  } catch (err) {
    console.error("STUDENT MARKS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch marks" });
  }
});
/* ================================
   TEACHER: ATTENDANCE SUMMARY
================================ */
app.get(
  "/api/teacher/attendance/summary",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    try {
      const { className, section } = req.query;
      const schoolId = req.user?.schoolId ? safeObjectId(req.user.schoolId) : null;
      if (!className) return res.status(400).json({ error: "Missing className" });

      const match = {
        class: String(className),
        ...(section ? { section: String(section) } : {}),
        submissionStatus: "SUBMITTED",
        ...(schoolId ? { schoolId } : {}),
      };

      // normalize status (trim + toUpper) then group by student key
      const pipeline = [
        { $match: match },
        {
          $project: {
            studentKey: { $ifNull: ["$studentUserId", "$studentId"] },
            statusNorm: {
              $toUpper: { $trim: { input: { $ifNull: ["$status", ""] } } },
            },
          },
        },
        {
          $group: {
            _id: "$studentKey",
            total: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $eq: ["$statusNorm", "PRESENT"] }, 1, 0],
              },
            },
          },
        },
      ];

      const agg = await db.collection("attendance").aggregate(pipeline).toArray();

      const out = (agg || []).map((r) => ({
        studentId: r._id ? String(r._id) : null,
        total: r.total || 0,
        present: r.present || 0,
      }));

      return res.json(out);
    } catch (err) {
      console.error("ATTENDANCE SUMMARY ERROR:", err);
      return res.status(500).json({ error: "Failed to compute summary" });
    }
  }
);
/* ================================
   TEACHER → GET STUDENTS
   ================================= */
app.get(
  "/api/teacher/students",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    try {
      const students = await db
        .collection("students")
        .find({
          class: req.user.class,
          section: req.user.section,
          schoolId: req.user.schoolId ? new ObjectId(req.user.schoolId) : undefined,
        })
        .toArray();

      res.json(students);
    } catch (err) {
      console.error("TEACHER STUDENTS ERROR:", err);
      res.json([]);
    }
  }
);

/* ================================
   TEACHER VIEW MARKS
   ================================= */
app.get("/api/teacher/marks", requireAuth, requireRole("TEACHER"), async (req, res) => {
  try {
    const teacher = await db.collection("teachers").findOne({
      userId: new ObjectId(req.user.userId),
    });

    if (!teacher) return res.json([]);

    const marks = await db
      .collection("marks")
      .find({
        className: teacher.class,
        section: teacher.section,
        schoolId: new ObjectId(req.user.schoolId),
      })
      .toArray();

    res.json(marks);
  } catch (err) {
    console.error("TEACHER MARKS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch marks" });
  }
});

/* ================================
   UPLOAD STUDENTS (ADMIN)
   ================================= */
app.post("/api/admin/upload-students", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!req.user?.schoolId) {
      return res.status(400).json({ error: "Missing schoolId in token" });
    }

    console.log("FILE:", req.file.path);
console.log("REQ.USER:", req.user);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    

   const schoolId = safeObjectId(req.user.schoolId);
if (!schoolId) {
  return res.status(400).json({ error: "Invalid schoolId in token" });
}

    for (const row of rows) {
      console.log("UPLOADING ROW:", row);

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
        console.log("CREATED USER:", user._id);
      }

      const result = await db.collection("students").updateOne(
        { userId: user._id },
        {
          $set: {
            name: row.name,
            class: String(row.class),
            section: String(row.section),
            rollNo: row.rollNo || "",
            schoolId: schoolId,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      console.log("STUDENT UPSERT RESULT:", result.upsertedId || result.matchedCount);
    }

    res.json({ message: "Students uploaded successfully" });
  } catch (err) {
    console.error("UPLOAD STUDENTS ERROR:", err);
    res.status(500).json({ error: "Students upload failed" });
  }
});

/* ================================
   UPLOAD TEACHERS (ADMIN)
   ================================= */
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
            schoolId: process.env.SCHOOL_ID ? new ObjectId(process.env.SCHOOL_ID) : undefined,
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
   SAVE ATTENDANCE (DRAFT ONLY) - TEACHER
   ================================= */
app.post("/api/teacher/attendance/save", requireAuth, async (req, res) => {
  try {
    const { date, className, section, records } = req.body;

    if (!date || !className || !section || !Array.isArray(records)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const schoolId = req.user?.schoolId ? safeObjectId(req.user.schoolId) : null;
    const teacherUserObjId = safeObjectId(req.user.userId);

    for (const r of records) {
      // accept r.studentUserId or r.studentId (whichever the client sent)
      const studentObjId = safeObjectId(r.studentUserId || r.studentId);
      if (!studentObjId) continue; // skip invalid entries

      const filter = {
        studentUserId: studentObjId,
        date: String(date),
        class: String(className),
        section: String(section),
        ...(schoolId ? { schoolId } : {}),
      };

      const update = {
        $set: {
          // store both fields for compatibility
          studentUserId: studentObjId,
          studentId: studentObjId,
          teacherUserId: teacherUserObjId,
          class: String(className),
          section: String(section),
          date: String(date),
          status: r.status,
          submissionStatus: "DRAFT",
          updatedAt: new Date(),
          ...(schoolId ? { schoolId } : {}),
        },
        $setOnInsert: { createdAt: new Date() },
      };

      await db.collection("attendance").updateOne(filter, update, { upsert: true });
    }

    res.json({ success: true, message: "Draft saved" });
  } catch (err) {
    console.error("SAVE ATTENDANCE ERROR:", err);
    res.status(500).json({ error: "Attendance save failed" });
  }
});
/* ================================
   SUBMIT ATTENDANCE (FINALIZE ONLY) - TEACHER
   ================================= */
app.post("/api/teacher/attendance/submit", requireAuth, async (req, res) => {
  try {
    const { date, className, section } = req.body;

    if (!date || !className || !section) {
      return res.status(400).json({ error: "Missing date/class/section" });
    }

    const schoolId = req.user.schoolId ? new ObjectId(req.user.schoolId) : null;

    const filter = {
      date: String(date),
      class: String(className),
      section: String(section),
      submissionStatus: "DRAFT",
      ...(schoolId ? { schoolId } : {}),
    };

    const result = await db.collection("attendance").updateMany(
      filter,
      {
        $set: {
          submissionStatus: "SUBMITTED",
          submittedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({
        error: "No draft attendance found. Please save first.",
      });
    }

    res.json({ success: true, message: "Attendance submitted" });
  } catch (err) {
    console.error("SUBMIT ATTENDANCE ERROR:", err);
    res.status(500).json({ error: "Attendance submit failed" });
  }
});
/* ================================
   TEACHER: GET ATTENDANCE BY DATE
   ================================= */
app.get("/api/teacher/students", requireAuth, requireRole("TEACHER"), async (req, res) => {
  try {
    console.log("TEACHER TOKEN USER:", req.user);

    const className = String(req.user.class);
    const section = String(req.user.section);

    const schoolId = req.user.schoolId ? new ObjectId(String(req.user.schoolId)) : null;

    const query = {
      class: className,
      section: section,
      ...(schoolId ? { schoolId } : {}),
    };

    console.log("STUDENT QUERY:", query);

    const students = await db.collection("students").find(query).toArray();

    res.json(students);
  } catch (err) {
    console.error("TEACHER STUDENTS ERROR:", err);
    res.status(500).json({ error: "Failed to load students" });
  }
});
/* ================================
   SAVE MARKS (TEACHER)
   ================================= */
app.post("/api/teacher/marks/save", requireAuth, requireRole("TEACHER"), async (req, res) => {
  try {
    const { subject, exam, className, section, records } = req.body;

    if (!subject || !exam || !className || !section || !Array.isArray(records)) {
      return res.status(400).json({ error: "Missing data" });
    }

    const schoolId = req.user?.schoolId ? safeObjectId(req.user.schoolId) : null;
    const teacherObjId = safeObjectId(req.user.userId);

    const docs = (records || [])
      .map((r) => {
        const studentObjId = safeObjectId(r.studentId || r.studentUserId);
        if (!studentObjId) return null;
        return {
          schoolId,
          // store both fields
          studentId: studentObjId,
          studentUserId: studentObjId,
          teacherId: teacherObjId,
          subject,
          exam,
          class: String(className),
          section: String(section),
          score: r.marks === "ABSENT" || r.marks === "AB" ? "ABSENT" : Number(r.marks),
          createdAt: new Date(),
        };
      })
      .filter(Boolean);

    // prevent duplicates: overwrite same exam/class/section/subject
    const deleteFilter = {
      ...(schoolId ? { schoolId } : {}),
      subject,
      exam,
      class: String(className),
      section: String(section),
    };

    await db.collection("marks").deleteMany(deleteFilter);

    if (docs.length) await db.collection("marks").insertMany(docs);

    res.json({ success: true });
  } catch (err) {
    console.error("SAVE MARKS ERROR:", err);
    res.status(500).json({ error: "Failed to save marks" });
  }
});
/* ================================
   STUDENT: GET ATTENDANCE
   ================================= */
app.get(
  "/api/student/attendance",
  requireAuth,
  requireRole("STUDENT"),
  async (req, res) => {
    try {
      if (!req.user?.userId || !req.user?.schoolId) {
        return res.status(400).json({ error: "Missing userId or schoolId in token" });
      }

      const studentUserId = new ObjectId(req.user.userId);
      const schoolId = new ObjectId(req.user.schoolId);

      const query = {
        studentUserId: studentUserId,      // ✅ matches DB field
        schoolId: schoolId,                 // ✅ ObjectId
        submissionStatus: "SUBMITTED",
      };

      console.log("ATTENDANCE QUERY:", query);

      const records = await db
        .collection("attendance")
        .find(query)
        .sort({ date: -1 })
        .toArray();

      console.log("ATTENDANCE COUNT:", records.length);

      res.json(records);
    } catch (err) {
      console.error("STUDENT ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  }
);


/* ================================
   ADMIN: MANUAL CREATE STUDENT & TEACHER
   ================================= */
app.post("/api/admin/add-student", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, email, rollNo, className, section, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Missing name or email" });

    const schoolId = req.user?.schoolId ? safeObjectId(req.user.schoolId) : safeObjectId(process.env.SCHOOL_ID);
    if (!schoolId) return res.status(400).json({ error: "Missing schoolId" });

    const usersCol = db.collection("users");
    const studentsCol = db.collection("students");

    const existing = await usersCol.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ error: "User with this email already exists" });

    const pwd = password || "student123";
    const passwordHash = await bcrypt.hash(pwd, 10);

    const r = await usersCol.insertOne({
      email: String(email).toLowerCase(),
      passwordHash,
      role: "STUDENT",
      createdAt: new Date(),
    });

    const userId = r.insertedId;
    const studentDoc = {
      userId,
      name,
      class: String(className ?? ""),
      section: String(section ?? ""),
      rollNo: rollNo || "",
      schoolId,
      createdAt: new Date(),
    };

    await studentsCol.updateOne({ userId }, { $set: studentDoc }, { upsert: true });

    res.json({ success: true, userId: String(userId), password: pwd });
  } catch (err) {
    console.error("ADMIN ADD STUDENT ERROR:", err);
    res.status(500).json({ error: "Failed to add student" });
  }
});

app.post("/api/admin/add-teacher", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, email, className, section, password, subject } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Missing name or email" });

    const schoolId = req.user?.schoolId ? safeObjectId(req.user.schoolId) : safeObjectId(process.env.SCHOOL_ID);
    if (!schoolId) return res.status(400).json({ error: "Missing schoolId" });

    const usersCol = db.collection("users");
    const teachersCol = db.collection("teachers");

    const existing = await usersCol.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ error: "User with this email already exists" });

    const pwd = password || "teacher123";
    const passwordHash = await bcrypt.hash(pwd, 10);

    const r = await usersCol.insertOne({
      email: String(email).toLowerCase(),
      passwordHash,
      role: "TEACHER",
      createdAt: new Date(),
    });

    const userId = r.insertedId;
    const teacherDoc = {
      userId,
      name,
      subject: subject || "",
      class: String(className ?? ""),
      section: String(section ?? ""),
      schoolId,
      createdAt: new Date(),
    };

    await teachersCol.updateOne({ userId }, { $set: teacherDoc }, { upsert: true });

    res.json({ success: true, userId: String(userId), password: pwd });
  } catch (err) {
    console.error("ADMIN ADD TEACHER ERROR:", err);
    res.status(500).json({ error: "Failed to add teacher" });
  }
});
/* ================================
   GENERAL FALLBACK
   ================================= */
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});