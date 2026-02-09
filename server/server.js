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

// Enable CORS with explicit options (Development + Production)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

// Add production Netlify domain if set in env
if (process.env.NETLIFY_DOMAIN) {
  allowedOrigins.push(`https://${process.env.NETLIFY_DOMAIN}`);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || origin.endsWith('.netlify.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

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
if (!process.env.MONGO_URI) {
  console.error("❌ FATAL ERROR: MONGO_URI is not set in environment variables");
  console.error("Please set MONGO_URI in your .env file before starting the server");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function startServer() {
  try {
    await client.connect();
    db = client.db("school_saas");
    console.log("✅ MongoDB connected successfully");

    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
      console.log(`✅ Health Check: GET http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error("❌ FATAL ERROR: Failed to connect to MongoDB");
    console.error("Error:", err.message);
    process.exit(1);
  }
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
    console.log("AUTH DECODED:", { userId: decoded.userId, role: decoded.role });

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      schoolId: decoded.schoolId || null,
      class: decoded.class,
      section: decoded.section,
    };

    next();
  } catch (e) {
    console.error("AUTH ERROR:", e.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}
function requireRole(role) {
  return (req, res, next) => {
    console.log("ROLE CHECK - Required:", role, "Actual:", req.user?.role);
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

/* ================================
   TENANT ENFORCEMENT MIDDLEWARE
   ================================= */
function requireTenantId(req, res, next) {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    console.error("❌ TENANT CHECK FAILED: Missing schoolId in token");
    return res.status(400).json({ error: "Missing schoolId in authentication token" });
  }
  const schoolObjectId = safeObjectId(schoolId);
  if (!schoolObjectId) {
    console.error("❌ TENANT CHECK FAILED: Invalid schoolId format:", schoolId);
    return res.status(400).json({ error: "Invalid schoolId format" });
  }
  req.user.schoolIdObj = schoolObjectId;
  console.log("✅ TENANT CHECK: schoolId valid -", schoolObjectId.toString());
  next();
}
const upload = multer({ dest: "uploads/" });

/* ================================
   HEALTH CHECK
   ================================= */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "School SaaS Backend is running 🚀",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* ================================
   ADMIN LOGIN
   ================================= */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, schoolId } = req.body;
    // Database-stored admin - check `users` collection for ADMIN role
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({ email, role: "ADMIN" });
    if (!user) {
      console.warn("⚠️ ADMIN LOGIN FAILED: User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      console.warn("⚠️ ADMIN LOGIN FAILED: Wrong password for", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ensure schoolId is present on the admin user record
    if (!user.schoolId) {
      console.error("❌ ADMIN LOGIN BLOCKED: No schoolId for admin user", user._id);
      return res.status(500).json({ error: "Admin account not associated with a school" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: "ADMIN", schoolId: user.schoolId.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("✅ ADMIN LOGIN (DB) - user:", email, "schoolId:", user.schoolId.toString());
    return res.json({ token });
  } catch (err) {
    console.error("❌ ADMIN LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/* ================================
   STUDENT LOGIN
   ================================= */
app.post("/api/auth/student/login", async (req, res) => {
  try {
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

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    // ✅ TENANT CHECK: Student must have schoolId
    if (!student.schoolId) {
      console.error("❌ STUDENT LOGIN BLOCKED: Student has no schoolId", student._id);
      return res.status(500).json({ error: "Student profile incomplete (missing schoolId)" });
    }

    const token = jwt.sign(
      {
        userId: student.userId.toString(),
        studentId: student._id.toString(),
        schoolId: student.schoolId.toString(),
        role: "STUDENT",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ STUDENT LOGIN - studentId:", student._id, "schoolId:", student.schoolId);
    res.json({ token, student: { ...student, _id: student._id.toString(), schoolId: student.schoolId.toString() } });
  } catch (err) {
    console.error("❌ STUDENT LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/* ================================
   TEACHER LOGIN
   ================================= */
app.post("/api/auth/teacher/login", async (req, res) => {
  try {
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

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    // ✅ TENANT CHECK: Teacher must have schoolId
    if (!teacher.schoolId) {
      console.error("❌ TEACHER LOGIN BLOCKED: Teacher has no schoolId", teacher._id);
      return res.status(500).json({ error: "Teacher profile incomplete (missing schoolId)" });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        teacherId: teacher._id.toString(),
        role: "TEACHER",
        class: teacher.class,
        section: teacher.section,
        schoolId: teacher.schoolId.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("✅ TEACHER LOGIN - teacherId:", teacher._id, "schoolId:", teacher.schoolId);
    res.json({
      token,
      teacher: {
        ...teacher,
        _id: teacher._id.toString(),
        userId: teacher.userId.toString(),
        schoolId: teacher.schoolId.toString(),
      },
    });
  } catch (err) {
    console.error("❌ TEACHER LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/* ================================
   DEVELOPER LOGIN
   ================================= */
app.post("/api/auth/developer/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.collection("users").findOne({
      email,
      role: "DEVELOPER",
    });

    if (!user) {
      console.warn("⚠️ DEVELOPER LOGIN FAILED: User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      console.warn("⚠️ DEVELOPER LOGIN FAILED: Wrong password for", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ DEVELOPER ROLE: No schoolId required (it should be null)
    const token = jwt.sign(
      { userId: user._id.toString(), role: "DEVELOPER", schoolId: null },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ DEVELOPER LOGIN - user:", email);
    return res.json({ token });
  } catch (err) {
    console.error("❌ DEVELOPER LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/* ================================
   LOGOUT (ALL ROLES)
   ================================= */
app.post("/api/auth/logout", requireAuth, (req, res) => {
  // Token invalidation is handled client-side (localStorage removal)
  // Server just confirms logout success
  console.log("✅ LOGOUT - User:", req.user?.userId, "Role:", req.user?.role);
  return res.json({ success: true, message: "Logged out successfully" });
});

/* ================================
   STUDENT DASHBOARD
   ================================= */
app.get("/api/student/dashboard", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    // ✅ TENANT SCOPED: Find student with both userId AND schoolId
    const student = await db.collection("students").findOne({
      userId: userObjectId,
      schoolId: schoolObjectId,
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const studentId = student._id;

    // ✅ TENANT SCOPED: Only SUBMITTED attendance from this school
    const attendance = await db
      .collection("attendance")
      .find({
        schoolId: schoolObjectId,
        studentId: studentId,
        submissionStatus: "SUBMITTED",
      })
      .sort({ date: -1 })
      .toArray();

    // ✅ TENANT SCOPED: Only marks from this school
    const marks = await db
      .collection("marks")
      .find({
        schoolId: schoolObjectId,
        studentId: studentId,
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("✅ STUDENT DASHBOARD - schoolId:", schoolObjectId, "marks:", marks.length, "attendance:", attendance.length);
    // find the assigned teacher for the student's class+section (if any)
    let teacher = null;
    try {
      teacher = await db.collection("teachers").findOne({
        class: student.class,
        section: student.section,
        schoolId: schoolObjectId,
      });
    } catch (e) {
      console.warn("TEACHER LOOKUP FAILED:", e.message);
    }

    res.json({ student, attendance, marks, teacher });
  } catch (err) {
    console.error("❌ STUDENT DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});
/* ================================
   STUDENT: GET ATTENDANCE
   ================================= */
app.get("/api/student/attendance", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    // ✅ TENANT SCOPED: Find student
    const student = await db.collection("students").findOne({
      userId: userObjectId,
      schoolId: schoolObjectId,
    });
    if (!student) return res.json([]);

    const studentId = student._id;

    // ✅ TENANT SCOPED: Only SUBMITTED attendance from this school
    const query = {
      schoolId: schoolObjectId,
      studentId: studentId,
      submissionStatus: "SUBMITTED",
    };

    console.log("✅ STUDENT ATTENDANCE QUERY - schoolId:", schoolObjectId, "studentId:", studentId);

    const records = await db
      .collection("attendance")
      .find(query)
      .sort({ date: -1 })
      .toArray();

    console.log("✅ ATTENDANCE RECORDS:", records.length);
    res.json(records);
  } catch (err) {
    console.error("❌ STUDENT ATTENDANCE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});
/* ================================
   STUDENT: GET MARKS
   ================================= */
app.get("/api/student/marks", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    // ✅ TENANT SCOPED: Find student
    const student = await db.collection("students").findOne({
      userId: userObjectId,
      schoolId: schoolObjectId,
    });
    if (!student) return res.json([]);

    const studentId = student._id;

    // ✅ TENANT SCOPED: Only marks from this school for this student
    const query = {
      schoolId: schoolObjectId,
      studentId: studentId,
    };

    console.log("✅ STUDENT MARKS QUERY - schoolId:", schoolObjectId, "studentId:", studentId);

    const marks = await db
      .collection("marks")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log("✅ MARKS COUNT:", marks.length);
    res.json(marks);
  } catch (err) {
    console.error("❌ STUDENT MARKS ERROR:", err);
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
  requireTenantId,
  async (req, res) => {
    try {
      const { className, section } = req.query;
      const schoolId = req.user.schoolIdObj;
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
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const students = await db
        .collection("students")
        .find({
          class: req.user.class,
          section: req.user.section,
          schoolId,
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
app.get("/api/teacher/marks", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const teacher = await db.collection("teachers").findOne({
      userId: new ObjectId(req.user.userId),
      schoolId,
    });

    if (!teacher) return res.json([]);

    const marks = await db
      .collection("marks")
      .find({
        className: teacher.class,
        section: teacher.section,
        schoolId,
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
app.post("/api/admin/upload-students", requireAuth, requireRole("ADMIN"), requireTenantId, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const schoolId = req.user.schoolIdObj;
    if (!schoolId) return res.status(400).json({ error: "Missing or invalid schoolId in token" });

    console.log("FILE:", req.file.path);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

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
app.post("/api/admin/upload-teachers", requireAuth, requireRole("ADMIN"), requireTenantId, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const schoolId = req.user.schoolIdObj;
    if (!schoolId) return res.status(400).json({ error: "Invalid schoolId in token" });

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
            schoolId: schoolId,
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
app.post("/api/teacher/attendance/save", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { date, className, section, records } = req.body;

    if (!date || !className || !section || !Array.isArray(records)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const schoolId = req.user.schoolIdObj; // From requireTenantId middleware
    const teacherId = safeObjectId(req.user.userId);

    if (!teacherId) {
      return res.status(400).json({ error: "Invalid teacherId in token" });
    }

    // ✅ VALIDATE: Teacher's class/section matches request
    if (req.user.class !== className || req.user.section !== section) {
      console.error("❌ ATTENDANCE SAVE REJECTED: Teacher class/section mismatch");
      return res.status(403).json({ error: "You can only enter attendance for your own class/section" });
    }

    console.log("✅ ATTENDANCE SAVE - schoolId:", schoolId, "class:", className, "section:", section, "date:", date);

    for (const r of records) {
      const studentId = safeObjectId(r.studentUserId || r.studentId);
      if (!studentId) continue;

      // ✅ TENANT & CLASS/SECTION SCOPED: Update filter
      const filter = {
        schoolId,
        studentId,
        date: String(date),
        class: String(className),
        section: String(section),
      };

      const update = {
        $set: {
          schoolId, // ✅ TENANT SCOPED
          studentId,
          teacherId,
          class: String(className),
          section: String(section),
          date: String(date),
          status: r.status,
          submissionStatus: "DRAFT",
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      };

      await db.collection("attendance").updateOne(filter, update, { upsert: true });
    }

    console.log("✅ ATTENDANCE DRAFT SAVED - count:", records.length);
    res.json({ success: true, message: "Draft saved", count: records.length });
  } catch (err) {
    console.error("❌ SAVE ATTENDANCE ERROR:", err);
    res.status(500).json({ error: "Attendance save failed" });
  }
});
/* ================================
   SUBMIT ATTENDANCE (FINALIZE ONLY) - TEACHER
   ================================= */
app.post("/api/teacher/attendance/submit", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { date, className, section } = req.body;

    if (!date || !className || !section) {
      return res.status(400).json({ error: "Missing date/class/section" });
    }

    const schoolId = req.user.schoolIdObj; // From requireTenantId middleware

    // ✅ VALIDATE: Teacher's class/section matches request
    if (req.user.class !== className || req.user.section !== section) {
      console.error("❌ ATTENDANCE SUBMIT REJECTED: Teacher class/section mismatch");
      return res.status(403).json({ error: "You can only submit attendance for your own class/section" });
    }

    console.log("✅ ATTENDANCE SUBMIT - schoolId:", schoolId, "class:", className, "section:", section, "date:", date);

    // ✅ TENANT & CLASS/SECTION SCOPED: Only find DRAFT records from this school/class/section
    const filter = {
      schoolId,
      date: String(date),
      class: String(className),
      section: String(section),
      submissionStatus: "DRAFT",
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
        error: "No draft attendance found for this date. Please save attendance first.",
      });
    }

    console.log("✅ ATTENDANCE SUBMITTED - count:", result.modifiedCount);
    res.json({ success: true, message: "Attendance submitted", submitted: result.modifiedCount });
  } catch (err) {
    console.error("❌ SUBMIT ATTENDANCE ERROR:", err);
    res.status(500).json({ error: "Attendance submit failed" });
  }
});
/* ================================
   TEACHER: GET ATTENDANCE BY DATE
   ================================= */
app.get("/api/teacher/students", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    console.log("✅ TEACHER TOKEN USER:", req.user);

    const className = String(req.user.class);
    const section = String(req.user.section);
    const schoolId = req.user.schoolIdObj; // From requireTenantId middleware

    // ✅ TENANT & CLASS/SECTION SCOPED: Only students from same school, class, section
    const query = {
      class: className,
      section: section,
      schoolId: schoolId,
    };

    console.log("✅ STUDENT QUERY - schoolId:", schoolId, "class:", className, "section:", section);

    const students = await db.collection("students").find(query).toArray();

    console.log("✅ FOUND STUDENTS:", students.length);
    res.json(students);
  } catch (err) {
    console.error("❌ TEACHER STUDENTS ERROR:", err);
    res.status(500).json({ error: "Failed to load students" });
  }
});
/* ================================
   SAVE MARKS (TEACHER)
   ================================= */
app.post("/api/teacher/marks/save", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { subject, exam, className, section, records } = req.body;

    if (!subject || !exam || !className || !section || !Array.isArray(records)) {
      return res.status(400).json({ error: "Missing required fields: subject, exam, className, section, records" });
    }

    const schoolId = req.user.schoolIdObj; // From requireTenantId middleware
    const teacherId = safeObjectId(req.user.userId);

    if (!teacherId) {
      return res.status(400).json({ error: "Invalid teacherId in token" });
    }

    // ✅ VALIDATE: Teacher's class/section matches request
    if (req.user.class !== className || req.user.section !== section) {
      console.error("❌ MARKS SAVE REJECTED: Teacher class/section mismatch");
      return res.status(403).json({ error: "You can only enter marks for your own class/section" });
    }

    const docs = (records || [])
      .map((r) => {
        const studentId = safeObjectId(r.studentId || r.studentUserId);
        if (!studentId) return null;
        return {
          schoolId, // ✅ TENANT SCOPED
          studentId,
          teacherId,
          subject,
          exam,
          class: String(className),
          section: String(section),
          score: r.marks === "ABSENT" || r.marks === "AB" ? "ABSENT" : Number(r.marks),
          date: new Date(),
          createdAt: new Date(),
        };
      })
      .filter(Boolean);

    console.log("✅ MARKS SAVE - schoolId:", schoolId, "subject:", subject, "records:", docs.length);

    // ✅ TENANT SCOPED: Only delete marks from this school
    const deleteFilter = {
      schoolId,
      subject,
      exam,
      class: String(className),
      section: String(section),
    };

    await db.collection("marks").deleteMany(deleteFilter);

    if (docs.length) {
      await db.collection("marks").insertMany(docs);
      console.log("✅ MARKS INSERTED:", docs.length);
    }

    res.json({ success: true, count: docs.length });
  } catch (err) {
    console.error("❌ SAVE MARKS ERROR:", err);
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
  requireTenantId,
  async (req, res) => {
    try {
      if (!req.user?.userId || !req.user?.schoolId) {
        return res.status(400).json({ error: "Missing userId or schoolId in token" });
      }

      const studentUserId = safeObjectId(req.user.userId);
      const schoolId = req.user.schoolIdObj;

      const query = {
        studentUserId: studentUserId, // ✅ matches DB field
        schoolId: schoolId, // ✅ ObjectId
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
app.post("/api/admin/add-student", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { name, email, rollNo, className, section, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Missing name or email" });
    const schoolId = req.user.schoolIdObj;
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

app.post("/api/admin/add-teacher", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { name, email, className, section, password, subject } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Missing name or email" });
    const schoolId = req.user.schoolIdObj;
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
   ADMIN: MANAGE SUBJECTS
   ================================= */
app.post(
  "/api/admin/subjects",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const { subjectName, class: cls, section } = req.body;

      if (!subjectName || !cls || !section) {
        return res.status(400).json({ error: "Subject name, class, and section are required" });
      }

      const schoolId = req.user.schoolIdObj; // From requireTenantId middleware
      console.log("CREATE SUBJECT - Input:", { subjectName, cls, section, schoolId });

      // Check if subject already exists for this class/section in this school
      const existing = await db.collection("subjects").findOne({
        subjectName,
        class: cls,
        section,
        schoolId,
      });

      if (existing) {
        return res.status(400).json({ error: "Subject already exists for this class/section" });
      }

      const newSubject = {
        subjectName,
        class: cls,
        section,
        schoolId,
        createdAt: new Date(),
      };

      console.log("CREATE SUBJECT - Saving:", newSubject);
      const result = await db.collection("subjects").insertOne(newSubject);
      newSubject._id = result.insertedId;

      res.json({ success: true, subject: newSubject });
    } catch (err) {
      console.error("CREATE SUBJECT ERROR:", err);
      res.status(500).json({ error: "Failed to create subject" });
    }
  }
);

/* ================================
   ADMIN: GET SUBJECTS FOR CLASS/SECTION
   ================================= */
app.get(
  "/api/admin/subjects",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const { class: cls, section } = req.query;

      if (!cls || !section) {
        return res.status(400).json({ error: "Class and section are required" });
      }

      const schoolId = req.user.schoolIdObj; // From requireTenantId middleware
      console.log("GET SUBJECTS - Query:", { cls, section, schoolId });

      const subjects = await db
        .collection("subjects")
        .find({
          class: cls,
          section,
          schoolId,
        })
        .sort({ subjectName: 1 })
        .toArray();

      console.log("GET SUBJECTS - Found:", subjects.length, "subjects");
      res.json(subjects);
    } catch (err) {
      console.error("GET SUBJECTS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  }
);

/* ================================
   ADMIN: DELETE SUBJECT
   ================================= */
app.delete(
  "/api/admin/subjects/:id",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj; // From requireTenantId middleware
      
      const result = await db.collection("subjects").deleteOne({
        _id: new ObjectId(req.params.id),
        schoolId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Subject not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("DELETE SUBJECT ERROR:", err);
      res.status(500).json({ error: "Failed to delete subject" });
    }
  }
);

/* ================================
   ADMIN: LIST TEACHERS & STUDENTS
   ================================= */
app.get(
  "/api/admin/users",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;

      const studentsQuery = { schoolId };
      const teachersQuery = { schoolId };

      const students = await db.collection("students").find(studentsQuery).project({ name: 1, class: 1, section: 1, rollNo: 1 }).sort({ name: 1 }).toArray();
      const teachers = await db.collection("teachers").find(teachersQuery).project({ name: 1, class: 1, section: 1, subject: 1 }).sort({ name: 1 }).toArray();

      res.json({ students, teachers });
    } catch (err) {
      console.error("ADMIN LIST USERS ERROR:", err);
      res.status(500).json({ error: "Failed to list users" });
    }
  }
);

/* ================================
   DEV: Seed Demo Public School 2 + users (dev-only)

   Usage (dev only):
   - Set NODE_ENV to anything except 'production' (default for dev)
   - Optionally set DEV_SEED_KEY in your .env and provide it as query `?key=...` or header `x-dev-key` to protect the endpoint
   - POST /dev/seed/demo-school

   This endpoint will:
   - Create (or reuse if exists) a `schools` document named "Demo Public School 2"
   - Create 1 admin user, 1 teacher user, and 2 student users
   - Create corresponding `teachers` and `students` documents with `schoolId` set to the school's ObjectId
   - Ensure `users`, `teachers`, `students` documents include `schoolId` as an ObjectId
   - Passwords are hashed with bcrypt

   Console logs show the new `schoolId` and created users' emails and roles.
   NOTE: This route is intentionally dev-only and will return 404 in production.
*/
app.post("/dev/seed/demo-school", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }

    const providedKey = req.query.key || req.headers["x-dev-key"];
    if (process.env.DEV_SEED_KEY && providedKey !== process.env.DEV_SEED_KEY) {
      return res.status(403).json({ error: "Forbidden - invalid dev key" });
    }

    const schoolsCol = db.collection("schools");
    const usersCol = db.collection("users");
    const teachersCol = db.collection("teachers");
    const studentsCol = db.collection("students");

    // Create or reuse school
    let school = await schoolsCol.findOne({ name: "Demo Public School 2" });
    if (!school) {
      const r = await schoolsCol.insertOne({ name: "Demo Public School 2", createdAt: new Date() });
      school = await schoolsCol.findOne({ _id: r.insertedId });
    }
    const schoolId = school._id; // ObjectId

    // helper to make unique email if collision exists
    const makeUniqueEmail = async (base) => {
      let email = base.toLowerCase();
      let i = 1;
      while (await usersCol.findOne({ email })) {
        const parts = base.split("@");
        email = `${parts[0]}+${i}@${parts[1]}`.toLowerCase();
        i += 1;
      }
      return email;
    };

    // create admin
    const adminEmail = await makeUniqueEmail("demo2_admin@example.com");
    const adminPwd = "admin123";
    const adminHash = await bcrypt.hash(adminPwd, 10);
    const adminInsert = await usersCol.insertOne({
      email: adminEmail,
      passwordHash: adminHash,
      role: "ADMIN",
      schoolId: schoolId,
      createdAt: new Date(),
    });

    // create teacher
    const teacherEmail = await makeUniqueEmail("demo2_teacher@example.com");
    const teacherPwd = "teacher123";
    const teacherHash = await bcrypt.hash(teacherPwd, 10);
    const teacherInsert = await usersCol.insertOne({
      email: teacherEmail,
      passwordHash: teacherHash,
      role: "TEACHER",
      schoolId: schoolId,
      createdAt: new Date(),
    });
    const teacherUserId = teacherInsert.insertedId;
    await teachersCol.updateOne(
      { userId: teacherUserId },
      {
        $set: {
          userId: teacherUserId,
          name: "Demo Teacher 2",
          subject: "General",
          class: "10",
          section: "A",
          schoolId: schoolId,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // create two students
    const studentResults = [];
    for (let i = 1; i <= 2; i++) {
      const base = `demo2_student${i}@example.com`;
      const email = await makeUniqueEmail(base);
      const pwd = `student123`;
      const hash = await bcrypt.hash(pwd, 10);
      const u = await usersCol.insertOne({
        email,
        passwordHash: hash,
        role: "STUDENT",
        schoolId: schoolId,
        createdAt: new Date(),
      });
      const userId = u.insertedId;
      await studentsCol.updateOne(
        { userId },
        {
          $set: {
            userId,
            name: `Demo Student ${i} 2`,
            class: "10",
            section: "A",
            rollNo: `${100 + i}`,
            schoolId: schoolId,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      studentResults.push({ email, role: "STUDENT" });
    }

    // console output for visibility
    console.log("DEV SEED: Created/used schoolId:", schoolId.toString());
    console.log("DEV SEED: Created users:", [
      { email: adminEmail, role: "ADMIN" },
      { email: teacherEmail, role: "TEACHER" },
      ...studentResults,
    ]);

    // Response
    return res.json({
      success: true,
      school: { _id: schoolId, name: school.name },
      created: {
        admin: { email: adminEmail, password: adminPwd, role: "ADMIN" },
        teacher: { email: teacherEmail, password: teacherPwd, role: "TEACHER" },
        students: studentResults.map((s, idx) => ({ email: s.email, password: "student123", role: s.role })),
      },
    });
  } catch (err) {
    console.error("DEV SEED ERROR:", err);
    return res.status(500).json({ error: "Dev seed failed" });
  }
});

/*
  How to manually verify multi-tenant isolation after running the seeder:

  1) Seed school B (Demo Public School 2):
     POST http://localhost:5000/dev/seed/demo-school
     If you set DEV_SEED_KEY, include it as ?key=VALUE or header x-dev-key: VALUE

  2) Note the returned `school._id` (logged to server console as well).

  3) Log in as a teacher for School A (existing teacher) via the normal login flow.
     - The teacher's JWT contains `schoolId` in the token payload.
     - When the teacher requests `/api/teacher/students` or similar teacher-scoped routes,
       the server will include `schoolId` in queries (see `requireTenantId` and usages in code),
       so only students with the same `schoolId` will be returned.

  4) Log in as the Demo Public School 2 teacher (email shown in the response). Use the returned password.
     - Repeat the same teacher-scoped requests and observe you only get School 2 students.

  5) To test attendance/marks isolation:
     - Create attendance/marks entries (as teacher) for School A students and School B students separately.
     - The server stores `schoolId` on attendance/marks documents and filters queries by `schoolId`.
     - Query student/marks endpoints for a teacher from School A — you should NOT see School B data.

  The above demonstrates that the app enforces tenant isolation by including `schoolId` in
  document writes and query filters. If you want, I can also add automated tests that
  programmatically create records for both schools and assert queries are scoped correctly.
*/

/* ================================
   TEACHER: GET SUBJECTS FOR CLASS
   ================================= */
app.get(
  "/api/teacher/subjects",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj; // From requireTenantId middleware
      
      const teacher = await db.collection("teachers").findOne({
        userId: new ObjectId(req.user.userId),
        schoolId,
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const { class: cls, section } = req.query;
      const searchClass = cls || teacher.class;
      const searchSection = section || teacher.section;

      console.log("GET TEACHER SUBJECTS - Query:", { searchClass, searchSection, schoolId });

      const subjects = await db
        .collection("subjects")
        .find({
          class: searchClass,
          section: searchSection,
          schoolId,
        })
        .sort({ subjectName: 1 })
        .toArray();

      console.log("GET TEACHER SUBJECTS - Found:", subjects.length, "subjects");
      res.json(subjects);
    } catch (err) {
      console.error("GET TEACHER SUBJECTS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  }
);

/* ================================
   TEACHER: CLASS SUMMARY
   ================================= */
app.get(
  "/api/teacher/class-summary",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const teacher = await db.collection("teachers").findOne({
        userId: new ObjectId(req.user.userId),
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const studentCount = await db.collection("students").countDocuments({
        class: teacher.class,
        section: teacher.section,
        schoolId: req.user.schoolIdObj,
      });

      res.json({
        className: teacher.class,
        section: teacher.section,
        totalStudents: studentCount,
      });
    } catch (err) {
      console.error("CLASS SUMMARY ERROR:", err);
      res.status(500).json({ error: "Failed to fetch class summary" });
    }
  }
);

/* ================================
   TEACHER: HOMEWORK - ADD
   ================================= */
app.post(
  "/api/teacher/homework/add",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const { title, description, subject, dueDate } = req.body;
      if (!title || !subject || !dueDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const teacher = await db.collection("teachers").findOne({
        userId: new ObjectId(req.user.userId),
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const homework = {
        _id: new ObjectId(),
        schoolId: req.user.schoolIdObj,
        teacherId: new ObjectId(req.user.userId),
        class: teacher.class,
        section: teacher.section,
        title,
        description: description || "",
        subject,
        dueDate: String(dueDate),
        createdAt: new Date(),
      };

      await db.collection("homework").insertOne(homework);
      res.json({ success: true, homeworkId: homework._id });
    } catch (err) {
      console.error("ADD HOMEWORK ERROR:", err);
      res.status(500).json({ error: "Failed to add homework" });
    }
  }
);

/* ================================
   TEACHER: HOMEWORK - GET
   ================================= */
app.get(
  "/api/teacher/homework",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const teacher = await db.collection("teachers").findOne({
        userId: new ObjectId(req.user.userId),
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const homework = await db
        .collection("homework")
        .find({
          class: teacher.class,
          section: teacher.section,
          schoolId: req.user.schoolIdObj,
        })
        .sort({ dueDate: -1 })
        .toArray();

      res.json(homework);
    } catch (err) {
      console.error("GET HOMEWORK ERROR:", err);
      res.status(500).json({ error: "Failed to fetch homework" });
    }
  }
);

/* ================================
   TEACHER: EVENTS - GET
   ================================= */
app.get(
  "/api/teacher/events",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const events = await db
        .collection("events")
        .find({
          schoolId: req.user.schoolIdObj,
        })
        .sort({ eventDate: 1 })
        .toArray();

      res.json(events);
    } catch (err) {
      console.error("GET EVENTS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  }
);

/* ================================
   TEACHER: EVENTS - CREATE
   ================================= */
app.post(
  "/api/teacher/events",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const { eventName, description, eventDate, isHoliday, class: cls, section } = req.body || {};

      if (!eventName || !eventDate) {
        return res.status(400).json({ error: "eventName and eventDate are required" });
      }

      // find teacher to default class/section if not provided
      const teacher = await db.collection("teachers").findOne({
        userId: new ObjectId(req.user.userId),
      });

      const schoolId = req.user.schoolIdObj;

      const newEvent = {
        eventName,
        description: description || "",
        eventDate: new Date(eventDate),
        isHoliday: !!isHoliday,
        class: cls || (teacher ? teacher.class : null),
        section: section || (teacher ? teacher.section : null),
        schoolId,
        createdBy: new ObjectId(req.user.userId),
        createdAt: new Date(),
      };

      const result = await db.collection("events").insertOne(newEvent);
      newEvent._id = result.insertedId;

      res.json({ success: true, event: newEvent });
    } catch (err) {
      console.error("CREATE EVENT ERROR:", err);
      res.status(500).json({ error: "Failed to create event" });
    }
  }
);

/* ================================
   STUDENT: HOMEWORK - GET
   ================================= */
app.get(
  "/api/teacher/student/homework",
  requireAuth,
  requireRole("STUDENT"),
  requireTenantId,
  async (req, res) => {
    try {
      const student = await db.collection("students").findOne({
        userId: new ObjectId(req.user.userId),
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const homework = await db
        .collection("homework")
        .find({
          class: student.class,
          section: student.section,
          schoolId: req.user.schoolIdObj,
        })
        .sort({ dueDate: -1 })
        .toArray();

      res.json(homework);
    } catch (err) {
      console.error("STUDENT HOMEWORK ERROR:", err);
      res.status(500).json({ error: "Failed to fetch homework" });
    }
  }
);

/* ================================
   STUDENT: EVENTS - GET
   ================================= */
app.get(
  "/api/teacher/student/events",
  requireAuth,
  requireRole("STUDENT"),
  requireTenantId,
  async (req, res) => {
    try {
      const events = await db
        .collection("events")
        .find({ schoolId: req.user.schoolIdObj })
        .sort({ eventDate: 1 })
        .toArray();

      res.json(events);
    } catch (err) {
      console.error("STUDENT EVENTS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  }
);

/* ================================
   DEVELOPER PANEL ROUTES
   ================================= */

/* Create School + Admin User */
app.post("/api/dev/schools", requireAuth, async (req, res) => {
  try {
    // Check if token has DEVELOPER role
    if (req.user?.role !== "DEVELOPER") {
      return res.status(403).json({ error: "Developer access required" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "School name is required" });
    }

    const schoolsCol = db.collection("schools");
    const usersCol = db.collection("users");

    // Check if school already exists
    const existing = await schoolsCol.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: "School already exists" });
    }

    // Create school
    const schoolResult = await schoolsCol.insertOne({
      name,
      createdAt: new Date(),
    });
    const schoolId = schoolResult.insertedId;

    // Create admin user for this school
    const adminEmail = `admin_${name.toLowerCase().replace(/\s+/g, "_")}@devpanel.com`;
    const adminPassword = "admin123";
    const adminHash = await bcrypt.hash(adminPassword, 10);

    const adminResult = await usersCol.insertOne({
      email: adminEmail,
      passwordHash: adminHash,
      role: "ADMIN",
      schoolId,
      createdAt: new Date(),
    });

    console.log("✅ DEV: School created -", name, "SchoolId:", schoolId.toString());
    console.log("✅ DEV: Admin created -", adminEmail);

    res.json({
      success: true,
      school: { _id: schoolId.toString(), name },
      admin: {
        _id: adminResult.insertedId.toString(),
        email: adminEmail,
        password: adminPassword,
      },
    });
  } catch (err) {
    console.error("❌ DEV CREATE SCHOOL ERROR:", err);
    res.status(500).json({ error: "Failed to create school" });
  }
});

/* Create User (Teacher/Student/Admin) for a School */
app.post("/api/dev/users", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "DEVELOPER") {
      return res.status(403).json({ error: "Developer access required" });
    }

    const { schoolId, name, email, role, password, className, section, subject } = req.body;
    if (!schoolId || !name || !email || !role) {
      return res.status(400).json({ error: "Missing required fields: schoolId, name, email, role" });
    }

    const validRoles = ["ADMIN", "TEACHER", "STUDENT"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }

    const schoolObjectId = safeObjectId(schoolId);
    if (!schoolObjectId) {
      return res.status(400).json({ error: "Invalid schoolId format" });
    }

    const usersCol = db.collection("users");

    // Check if user already exists
    const existing = await usersCol.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Create user
    const pwd = password || "user123";
    const hash = await bcrypt.hash(pwd, 10);

    const userResult = await usersCol.insertOne({
      email: email.toLowerCase(),
      passwordHash: hash,
      role,
      schoolId: schoolObjectId,
      createdAt: new Date(),
    });

    const userId = userResult.insertedId;

    // Create profile if TEACHER or STUDENT
    if (role === "TEACHER") {
      await db.collection("teachers").updateOne(
        { userId },
        {
          $set: {
            name,
            subject: subject || "",
            class: className || "",
            section: section || "",
            schoolId: schoolObjectId,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    } else if (role === "STUDENT") {
      await db.collection("students").updateOne(
        { userId },
        {
          $set: {
            name,
            class: className || "",
            section: section || "",
            rollNo: "",
            schoolId: schoolObjectId,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    console.log("✅ DEV: User created -", email, "Role:", role, "School:", schoolId);

    res.json({
      success: true,
      user: {
        _id: userId.toString(),
        email,
        password: pwd,
        role,
      },
    });
  } catch (err) {
    console.error("❌ DEV CREATE USER ERROR:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

/* List All Schools */
app.get("/api/dev/schools", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "DEVELOPER") {
      return res.status(403).json({ error: "Developer access required" });
    }

    const schools = await db.collection("schools").find({}).sort({ createdAt: -1 }).toArray();
    const result = schools.map((s) => ({
      _id: s._id.toString(),
      name: s.name,
      createdAt: s.createdAt,
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ DEV LIST SCHOOLS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});

/* Get Analytics */
app.get("/api/dev/analytics", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "DEVELOPER") {
      return res.status(403).json({ error: "Developer access required" });
    }

    const schoolCount = await db.collection("schools").countDocuments();
    const adminCount = await db.collection("users").countDocuments({ role: "ADMIN" });
    const teacherCount = await db.collection("users").countDocuments({ role: "TEACHER" });
    const studentCount = await db.collection("users").countDocuments({ role: "STUDENT" });

    res.json({
      schools: schoolCount,
      admins: adminCount,
      teachers: teacherCount,
      students: studentCount,
      total: adminCount + teacherCount + studentCount,
    });
  } catch (err) {
    console.error("❌ DEV ANALYTICS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/* ================================
   DEVELOPER: Delete User
   ================================= */
app.post("/api/dev/users/delete", requireAuth, requireRole("DEVELOPER"), async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }
    
    const usersCol = db.collection("users");
    const result = await usersCol.deleteOne({ email });
    
    if (result.deletedCount > 0) {
      console.log(`✅ User deleted: ${email}`);
      return res.json({ success: true, message: `User ${email} deleted` });
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error("❌ DELETE USER ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ================================
   ADMIN PASSWORD RESET (for troubleshooting)
   ================================= */
app.post("/api/admin/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and newPassword required" });
    }
    
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({ email, role: "ADMIN" });
    
    if (!user) {
      return res.status(404).json({ error: "Admin user not found" });
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await usersCol.updateOne(
      { _id: user._id },
      { $set: { passwordHash } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Password reset for ${email}`);
      return res.json({ success: true, message: `Password reset to: ${newPassword}` });
    } else {
      return res.status(500).json({ error: "Failed to update password" });
    }
  } catch (err) {
    console.error("❌ PASSWORD RESET ERROR:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

/* ================================
   GENERAL FALLBACK
   ================================= */
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});