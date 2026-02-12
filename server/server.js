import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import XLSX from "xlsx";
import { MongoClient, ObjectId } from "mongodb";
import MockDatabase from "./mockDb.js";

dotenv.config();

const app = express();

// Enable CORS with explicit options (Development + Production)
// 🔒 Development Origins:
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

// 🚀 Production Netlify Domain Support
// Add explicit Netlify domain if set in env
if (process.env.NETLIFY_DOMAIN) {
  allowedOrigins.push(`https://${process.env.NETLIFY_DOMAIN}`);
  console.log(`✅ CORS enabled for: https://${process.env.NETLIFY_DOMAIN}`);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // ✅ Allow if origin is in list OR ends with .netlify.app OR .vercel.app (catches all deployment domains)
    if (allowedOrigins.includes(origin) || origin.endsWith('.netlify.app') || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS REJECTED: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

// 🎙️ Serve uploaded files (voice recordings, documents, etc)
// This makes /uploads/{filename} accessible publicly
app.use("/uploads", express.static("uploads"));
console.log("✅ Static file serving enabled at /uploads");

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
const client = process.env.MONGO_URI ? new MongoClient(process.env.MONGO_URI) : null;
let db;
let isMongoConnected = false;

async function startServer() {
  try {
    if (client && process.env.MONGO_URI) {
      try {
        await client.connect();
        db = client.db("school_saas");
        isMongoConnected = true;
        console.log("✅ MongoDB connected successfully");
      } catch (mongoError) {
        console.warn("⚠️  MongoDB connection failed, running in fallback mode:", mongoError.message);
        console.log("💡 Tip: Install MongoDB locally or set MONGO_URI to a MongoDB Atlas connection string");
        db = new MockDatabase();
        isMongoConnected = false;
      }
    } else {
      console.warn("⚠️  MONGO_URI not set - running in fallback mode with in-memory database");
      console.log("💡 To enable MongoDB: Set MONGO_URI in .env file");
      db = new MockDatabase();
      isMongoConnected = false;
    }

    const PORT = process.env.PORT || 5000;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
      console.log(`✅ Health Check: GET http://localhost:${PORT}/`);
    });

    // Set timeout for large file uploads (5 minutes)
    server.setTimeout(5 * 60 * 1000);
    
    // Handle server errors
    server.on('error', (err) => {
      console.error("❌ SERVER ERROR:", err);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received, closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
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

// Configure multer to save voice files in /uploads/voice/ directory
const voiceUpload = multer({
  dest: "uploads/voice/",
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Keep original multer for other uploads
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

    // Fetch school name
    let schoolName = "School";
    try {
      const school = await db.collection("schools").findOne({ _id: user.schoolId });
      if (school && school.name) {
        schoolName = school.name;
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch school name:", err.message);
    }

    console.log("✅ ADMIN LOGIN (DB) - user:", email, "schoolId:", user.schoolId.toString());
    return res.json({ token, schoolName });
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
    console.log("🔍 STUDENT LOGIN REQUEST - Body:", JSON.stringify(req.body));
    
    const body = req.body || {};
    const studentEmail = body.email || "";
    const studentPassword = body.password || "";
    
    console.log("🔍 Extracted - Email:", studentEmail, "Password length:", studentPassword.length);
    
    if (!studentEmail || !studentPassword) {
      console.warn("⚠️ Missing email or password");
      return res.status(400).json({ error: "Email and password required" });
    }
    
    const normalizedEmail = studentEmail.toLowerCase().trim();
    console.log("🔍 Normalized email:", normalizedEmail);

    const user = await db.collection("users").findOne({
      email: normalizedEmail,
      role: "STUDENT",
    });
    console.log("🔍 User found:", !!user);

    if (!user) {
      console.warn(`⚠️ STUDENT LOGIN FAILED: User not found for email: ${normalizedEmail}`);
      return res.status(401).json({ error: "Student not found" });
    }

    const match = await bcrypt.compare(studentPassword, user.passwordHash);
    console.log("🔍 Password match:", match);
    
    if (!match) {
      console.warn(`⚠️ STUDENT LOGIN FAILED: Wrong password for email: ${normalizedEmail}`);
      return res.status(401).json({ error: "Wrong password" });
    }

    const student = await db.collection("students").findOne({
      userId: user._id,
    });
    console.log("🔍 Student profile found:", !!student);

    if (!student) {
      console.warn(`⚠️ STUDENT LOGIN FAILED: Student profile not found for email: ${normalizedEmail}`);
      return res.status(404).json({ error: "Student profile not found" });
    }

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

    // Fetch school name
    let schoolName = "School";
    try {
      const school = await db.collection("schools").findOne({ _id: student.schoolId });
      if (school && school.name) {
        schoolName = school.name;
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch school name:", err.message);
    }

    console.log(`✅ STUDENT LOGIN SUCCESS - email: ${normalizedEmail}, studentId: ${student._id}`);
    res.json({ token, schoolName, student: { ...student, _id: student._id.toString(), schoolId: student.schoolId.toString() } });
  } catch (err) {
    console.error("❌ STUDENT LOGIN ERROR - Full error:", err.message, "Stack:", err.stack);
    return res.status(500).json({ error: "Login failed - " + err.message });
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

    // Fetch school name
    let schoolName = "School";
    try {
      const school = await db.collection("schools").findOne({ _id: teacher.schoolId });
      if (school && school.name) {
        schoolName = school.name;
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch school name:", err.message);
    }

    console.log("✅ TEACHER LOGIN - teacherId:", teacher._id, "schoolId:", teacher.schoolId);
    res.json({
      token,
      schoolName,
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

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET not set in environment");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const user = await db.collection("users").findOne({
      email: String(email).toLowerCase(),
      role: "DEVELOPER",
    });

    if (!user) {
      console.warn("⚠️ DEVELOPER LOGIN FAILED: User not found for", email);
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
    console.error("❌ DEVELOPER LOGIN ERROR:", err.message || err);
    return res.status(500).json({ error: "Login failed - server error" });
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
    // include email from users collection
    try {
      const user = await db.collection("users").findOne({ _id: student.userId });
      if (user && user.email) student.email = user.email;
    } catch (e) {
      console.warn("STUDENT DASHBOARD: failed to fetch user email", e.message);
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
   DEBUG: Recent students (local only)
   ================================= */
app.get('/debug/recent-students', async (req, res) => {
  try {
    const backfill = req.query.backfill === '1' || req.query.backfill === 'true';
    const users = await db.collection('users').find({ role: 'STUDENT' }).sort({ createdAt: -1 }).limit(50).toArray();
    const out = [];
    let backfilled = 0;
    for (const u of users) {
      const student = await db.collection('students').findOne({ userId: u._id });
      if (backfill && student && !student.email && u.email) {
        await db.collection('students').updateOne({ _id: student._id }, { $set: { email: u.email } });
        backfilled++;
      }
      out.push({ user: { _id: u._id, email: u.email, createdAt: u.createdAt }, student });
    }
    const result = { rows: out, backfilled: backfilled };
    res.json(result);
  } catch (err) {
    console.error('DEBUG ERROR:', err);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// DEBUG: Backfill students.email from users collection
app.post('/debug/backfill-student-emails', async (req, res) => {
  try {
    const students = await db.collection('students').find({}).toArray();
    let updated = 0;
    for (const s of students) {
      if (s.email) continue;
      if (!s.userId) continue;
      const user = await db.collection('users').findOne({ _id: s.userId });
      if (user && user.email) {
        await db.collection('students').updateOne({ _id: s._id }, { $set: { email: user.email } });
        updated++;
      }
    }
    res.json({ updated });
  } catch (err) {
    console.error('BACKFILL ERROR:', err);
    res.status(500).json({ error: 'Backfill failed' });
  }
});
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
        class: String(teacher.class),
        section: String(teacher.section),
        schoolId,
      })
      .toArray();

    // Add 'marks' field for frontend (it stores as 'score')
    const enrichedMarks = marks.map(mark => ({
      ...mark,
      marks: mark.score,
    }));

    res.json(enrichedMarks);
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

    console.log("FILE:", req.file.path, "SIZE:", req.file.size);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("TOTAL ROWS TO PROCESS:", rows.length);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (row) => {
          try {
            if (!row.name || !row.class || !row.section) {
              throw new Error(`Missing required fields: name, class, or section`);
            }

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
                schoolId: schoolId,
                createdAt: new Date(),
              });
              user = { _id: r.insertedId };
              console.log("CREATED USER:", user._id);
            }

            await db.collection("students").updateOne(
              { userId: user._id, schoolId: schoolId },
              {
                $set: {
                  userId: user._id,
                  email: email,
                  name: row.name,
                  class: String(row.class),
                  className: String(row.class),
                  section: String(row.section),
                  rollNo: row.rollNo || "",
                  parentName: row.parentName || "",
                  phone: row.phone || "",
                  schoolId: schoolId,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );

            successCount++;
          } catch (rowError) {
            errorCount++;
            errors.push({
              row: row.name || "Unknown",
              error: rowError.message,
            });
            console.error("ROW ERROR:", rowError.message, row);
          }
        })
      );

      console.log(`BATCH PROGRESS: Processed ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }

    console.log(`UPLOAD COMPLETE: ${successCount} success, ${errorCount} errors`);
    res.json({ 
      success: true,
      message: `Students uploaded successfully`,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
      students: [] 
    });
  } catch (err) {
    console.error("UPLOAD STUDENTS ERROR:", err.message, err.stack);
    res.status(500).json({ 
      error: "Students upload failed",
      details: err.message 
    });
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

    console.log("FILE:", req.file.path, "SIZE:", req.file.size);
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log("TOTAL ROWS TO PROCESS:", rows.length);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (row) => {
          try {
            if (!row.name || !row.class || !row.section) {
              throw new Error(`Missing required fields: name, class, or section`);
            }

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
                schoolId: schoolId,
                createdAt: new Date(),
              });

              user = { _id: result.insertedId };
              console.log("CREATED USER:", user._id);
            }

            await db.collection("teachers").updateOne(
              { userId: user._id, schoolId: schoolId },
              {
                $set: {
                  userId: user._id,
                  email: email,
                  name: row.name,
                  subject: row.subject || "",
                  class: String(row.class),
                  section: String(row.section),
                  schoolId: schoolId,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );

            successCount++;
          } catch (rowError) {
            errorCount++;
            errors.push({
              row: row.name || "Unknown",
              error: rowError.message,
            });
            console.error("ROW ERROR:", rowError.message, row);
          }
        })
      );

      console.log(`BATCH PROGRESS: Processed ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }

    console.log(`UPLOAD COMPLETE: ${successCount} success, ${errorCount} errors`);
    res.json({ 
      success: true,
      message: `Teachers uploaded successfully`,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
      teachers: [] 
    });
  } catch (err) {
    console.error("UPLOAD TEACHERS ERROR:", err.message, err.stack);
    res.status(500).json({ 
      error: "Teacher upload failed",
      details: err.message 
    });
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

    const students = await db
      .collection("students")
      .find(query)
      .project({
        name: 1,
        _id: 1,
        class: 1,
        section: 1,
        rollNo: 1,
        parentName: 1,
        phone: 1,
        userId: 1,
        schoolId: 1,
      })
      .toArray();

    // ✅ Fetch emails from users collection
    const studentsWithEmails = await Promise.all(
      students.map(async (student) => {
        const user = await db.collection("users").findOne({ _id: student.userId });
        const studentData = {
          ...student,
          email: user?.email || "",
        };
        console.log("📧 STUDENT WITH EMAIL:", { name: student.name, email: studentData.email });
        return studentData;
      })
    );

    console.log("✅ FOUND STUDENTS:", studentsWithEmails.length);
    console.log("📋 SAMPLE STUDENT:", studentsWithEmails[0]);
    res.json(studentsWithEmails);
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
    const { name, email, rollNo, className, section, password, parentName, phone } = req.body;
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
      email: String(email).toLowerCase(),
      name,
      class: String(className ?? ""),
      section: String(section ?? ""),
      rollNo: rollNo || "",
      parentName: parentName || "",
      phone: phone || "",
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

      const students = await db
        .collection("students")
        .find(studentsQuery)
        .project({ name: 1, _id: 1, class: 1, section: 1, rollNo: 1, parentName: 1, phone: 1, email: 1 })
        .sort({ name: 1 })
        .toArray();
      const teachers = await db
        .collection("teachers")
        .find(teachersQuery)
        .project({ name: 1, _id: 1, class: 1, section: 1, subject: 1, email: 1 })
        .sort({ name: 1 })
        .toArray();

      res.json({ students, teachers });
    } catch (err) {
      console.error("ADMIN LIST USERS ERROR:", err);
      res.status(500).json({ error: "Failed to list users" });
    }
  }
);

/* ================================
   ADMIN: DELETE TEACHER
   ================================= */
app.delete(
  "/api/admin/teachers/:id",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const teacherId = safeObjectId(req.params.id);
      const schoolId = req.user.schoolIdObj;

      if (!teacherId || !schoolId) {
        return res.status(400).json({ error: "Invalid teacherId or schoolId" });
      }

      // ✅ TENANT CHECK: Verify teacher belongs to this school
      const teacher = await db.collection("teachers").findOne({
        _id: teacherId,
        schoolId,
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      // Delete related data
      await db.collection("attendance").deleteMany({ teacherId });
      await db.collection("marks").deleteMany({ teacherId });
      await db.collection("homework").deleteMany({ teacherId: teacher.userId });

      // Delete from teachers collection
      await db.collection("teachers").deleteOne({ _id: teacherId });

      // Optional: Delete user account
      if (teacher.userId) {
        await db.collection("users").deleteOne({ _id: teacher.userId });
      }

      // Log action
      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId: safeObjectId(req.user.userId),
        action: "DELETE_TEACHER",
        targetType: "TEACHER",
        targetId: teacherId,
        targetName: teacher.name,
        timestamp: new Date(),
        details: { email: teacher.email, class: teacher.class, section: teacher.section },
      });

      console.log("✅ TEACHER DELETED:", teacher.name, "ID:", teacherId);
      res.json({ success: true, message: `Teacher ${teacher.name} deleted` });
    } catch (err) {
      console.error("❌ DELETE TEACHER ERROR:", err);
      res.status(500).json({ error: "Failed to delete teacher" });
    }
  }
);

/* ================================
   ADMIN: DELETE STUDENT
   ================================= */
app.delete(
  "/api/admin/students/:id",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const studentId = safeObjectId(req.params.id);
      const schoolId = req.user.schoolIdObj;

      if (!studentId || !schoolId) {
        return res.status(400).json({ error: "Invalid studentId or schoolId" });
      }

      // ✅ TENANT CHECK: Verify student belongs to this school
      const student = await db.collection("students").findOne({
        _id: studentId,
        schoolId,
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Delete related data
      await db.collection("attendance").deleteMany({ studentId });
      await db.collection("marks").deleteMany({ studentId });
      await db.collection("homework").deleteMany({ "submittedBy.studentId": studentId });

      // Delete from students collection
      await db.collection("students").deleteOne({ _id: studentId });

      // Optional: Delete user account
      if (student.userId) {
        await db.collection("users").deleteOne({ _id: student.userId });
      }

      // Log action
      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId: safeObjectId(req.user.userId),
        action: "DELETE_STUDENT",
        targetType: "STUDENT",
        targetId: studentId,
        targetName: student.name,
        timestamp: new Date(),
        details: { email: student.email, class: student.class, section: student.section, rollNo: student.rollNo },
      });

      console.log("✅ STUDENT DELETED:", student.name, "ID:", studentId);
      res.json({ success: true, message: `Student ${student.name} deleted` });
    } catch (err) {
      console.error("❌ DELETE STUDENT ERROR:", err);
      res.status(500).json({ error: "Failed to delete student" });
    }
  }
);

/* ================================
   ADMIN: MIGRATE STUDENTS (CLASS/SECTION CHANGE)
   ================================= */
app.post(
  "/api/admin/students/migrate",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const { fromClass, fromSection, toClass, toSection, studentIds, migrateAll } = req.body;
      const schoolId = req.user.schoolIdObj;

      if (!fromClass || !fromSection || !toClass || !toSection) {
        return res.status(400).json({ error: "Missing required fields: fromClass, fromSection, toClass, toSection" });
      }

      // Build filter for students to migrate
      const filter = {
        schoolId,
        class: String(fromClass),
        section: String(fromSection),
      };

      // If specific studentIds provided, add to filter
      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        const validIds = studentIds.map((id) => safeObjectId(id)).filter(Boolean);
        if (validIds.length > 0) {
          filter._id = { $in: validIds };
        }
      }

      // Migrate students
      const result = await db.collection("students").updateMany(
        filter,
        {
          $set: {
            class: String(toClass),
            section: String(toSection),
            migratedAt: new Date(),
          },
          $push: {
            migrationHistory: {
              fromClass: String(fromClass),
              fromSection: String(fromSection),
              toClass: String(toClass),
              toSection: String(toSection),
              migratedAt: new Date(),
              migratedBy: safeObjectId(req.user.userId),
            },
          },
        }
      );

      // Log action
      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId: safeObjectId(req.user.userId),
        action: "MIGRATE_STUDENTS",
        targetType: "STUDENT",
        timestamp: new Date(),
        details: {
          from: `${fromClass}-${fromSection}`,
          to: `${toClass}-${toSection}`,
          studentCount: result.modifiedCount,
        },
      });

      console.log("✅ STUDENTS MIGRATED - Count:", result.modifiedCount);
      res.json({
        success: true,
        message: `${result.modifiedCount} student(s) migrated`,
        migratedCount: result.modifiedCount,
      });
    } catch (err) {
      console.error("❌ STUDENT MIGRATION ERROR:", err);
      res.status(500).json({ error: "Failed to migrate students" });
    }
  }
);

/* ================================
   ADMIN: REASSIGN TEACHER (CLASS/SECTION CHANGE)
   ================================= */
app.put(
  "/api/admin/teachers/:id/reassign",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const teacherId = safeObjectId(req.params.id);
      const { fromClass, fromSection, toClass, toSection } = req.body;
      const schoolId = req.user.schoolIdObj;

      if (!teacherId || !schoolId) {
        return res.status(400).json({ error: "Invalid teacherId or schoolId" });
      }

      if (!toClass || !toSection) {
        return res.status(400).json({ error: "Missing required fields: toClass, toSection" });
      }

      // ✅ TENANT CHECK: Verify teacher belongs to this school
      const teacher = await db.collection("teachers").findOne({
        _id: teacherId,
        schoolId,
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const oldClass = teacher.class;
      const oldSection = teacher.section;

      // ✅ Prevent duplicate assignment
      if (oldClass === toClass && oldSection === toSection) {
        return res.status(400).json({
          error: "Teacher is already assigned to this class/section",
        });
      }

      // Update teacher
      const result = await db.collection("teachers").findOneAndUpdate(
        { _id: teacherId, schoolId },
        {
          $set: {
            class: String(toClass),
            section: String(toSection),
            reassignedAt: new Date(),
          },
          $push: {
            assignmentHistory: {
              fromClass: oldClass,
              fromSection: oldSection,
              toClass: String(toClass),
              toSection: String(toSection),
              timestamp: new Date(),
            },
          },
        },
        { returnDocument: "after" }
      );

      if (!result.value) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      // Log action
      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId: safeObjectId(req.user.userId),
        action: "REASSIGN_TEACHER",
        targetType: "TEACHER",
        targetId: teacherId,
        targetName: teacher.name,
        timestamp: new Date(),
        details: {
          from: `${oldClass}-${oldSection}`,
          to: `${toClass}-${toSection}`,
        },
      });

      console.log("✅ TEACHER REASSIGNED:", teacher.name, "From:", oldClass, oldSection, "To:", toClass, toSection);
      res.json({
        success: true,
        message: `Teacher ${teacher.name} reassigned`,
        teacher: result.value,
      });
    } catch (err) {
      console.error("❌ TEACHER REASSIGNMENT ERROR:", err);
      res.status(500).json({ error: "Failed to reassign teacher" });
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
   VOICE MESSAGES ROUTES
   ================================= */

/**
 * ADMIN: POST /api/admin/voice-broadcast
 * Admin broadcasts a voice message to teachers (all or selected)
 */
app.post("/api/admin/voice-broadcast", requireAuth, requireRole("ADMIN"), requireTenantId, voiceUpload.single("audio"), async (req, res) => {
  try {
    const { targetTeacherIds, broadcastToAll } = req.body;
    const schoolId = req.user.schoolIdObj;
    const senderId = safeObjectId(req.user.userId);

    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    // Log file details for debugging
    console.log(`📝 ADMIN VOICE UPLOAD: file=${req.file.filename}, size=${req.file.size} bytes, mimetype=${req.file.mimetype}`);

    // Check for empty files
    if (req.file.size === 0) {
      console.error("❌ ADMIN VOICE BROADCAST: Uploaded file is empty (0 bytes)");
      return res.status(400).json({ error: "Audio file is empty. Please record audio and try again." });
    }

    if (!senderId) {
      return res.status(400).json({ error: "Invalid admin ID" });
    }

    // Generate audio URL (public path to uploaded file)
    const audioUrl = `/uploads/voice/${req.file.filename}`;
    console.log(`✅ ADMIN VOICE BROADCAST: Audio URL = ${audioUrl}`);

    // Determine target teachers
    let targetUserIds = [];
    if (broadcastToAll === "true" || broadcastToAll === true) {
      // Get all teachers for this school
      const teachers = await db.collection("teachers").find({ schoolId }).toArray();
      targetUserIds = teachers.map((t) => t.userId);
    } else if (targetTeacherIds && Array.isArray(targetTeacherIds)) {
      targetUserIds = targetTeacherIds.map((id) => safeObjectId(id)).filter(Boolean);
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: "No target teachers selected" });
    }

    // Create voice message document
    const voiceMessage = {
      schoolId,
      senderRole: "ADMIN",
      senderId,
      targetRole: "TEACHER",
      targetUserIds,
      audioUrl,
      createdAt: new Date(),
    };

    const result = await db.collection("voiceMessages").insertOne(voiceMessage);

    console.log("✅ ADMIN VOICE BROADCAST - Recipients:", targetUserIds.length, "Audio URL:", audioUrl);
    res.json({
      success: true,
      messageId: result.insertedId.toString(),
      broadcastTo: targetUserIds.length,
      audioUrl,
    });
  } catch (err) {
    console.error("❌ ADMIN VOICE BROADCAST ERROR:", err);
    res.status(500).json({ error: "Failed to broadcast voice message" });
  }
});

/**
 * TEACHER: POST /api/teacher/voice-broadcast
 * Teacher broadcasts a voice message to their class/section students
 */
app.post("/api/teacher/voice-broadcast", requireAuth, requireRole("TEACHER"), requireTenantId, voiceUpload.single("audio"), async (req, res) => {
  try {
    const { targetStudentIds, broadcastToClass } = req.body;
    const schoolId = req.user.schoolIdObj;
    const senderId = safeObjectId(req.user.userId);
    const className = req.user.class;
    const section = req.user.section;

    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    // Log file details for debugging
    console.log(`📝 TEACHER VOICE UPLOAD: file=${req.file.filename}, size=${req.file.size} bytes, mimetype=${req.file.mimetype}`);

    // Check for empty files
    if (req.file.size === 0) {
      console.error("❌ TEACHER VOICE BROADCAST: Uploaded file is empty (0 bytes)");
      return res.status(400).json({ error: "Audio file is empty. Please record audio and try again." });
    }

    if (!senderId) {
      return res.status(400).json({ error: "Invalid teacher ID" });
    }

    // Generate audio URL (public path to uploaded file)
    const audioUrl = `/uploads/voice/${req.file.filename}`;
    console.log(`✅ TEACHER VOICE BROADCAST: Audio URL = ${audioUrl}`);

    // Determine target students
    let targetUserIds = [];
    if (broadcastToClass === "true" || broadcastToClass === true) {
      // Get all students in teacher's class/section
      const students = await db.collection("students").find({
        schoolId,
        class: className,
        section: section,
      }).toArray();
      targetUserIds = students.map((s) => s.userId);
    } else if (targetStudentIds && Array.isArray(targetStudentIds)) {
      targetUserIds = targetStudentIds.map((id) => safeObjectId(id)).filter(Boolean);
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: "No target students selected" });
    }

    const voiceMessage = {
      schoolId,
      senderRole: "TEACHER",
      senderId,
      targetRole: "STUDENT",
      targetClass: className,
      targetSection: section,
      targetUserIds,
      audioUrl,
      createdAt: new Date(),
    };

    const result = await db.collection("voiceMessages").insertOne(voiceMessage);

    console.log("✅ TEACHER VOICE BROADCAST - Recipients:", targetUserIds.length, "Class:", className, "Section:", section, "Audio URL:", audioUrl);
    res.json({
      success: true,
      messageId: result.insertedId.toString(),
      broadcastTo: targetUserIds.length,
      audioUrl,
    });
  } catch (err) {
    console.error("❌ TEACHER VOICE BROADCAST ERROR:", err);
    res.status(500).json({ error: "Failed to broadcast voice message" });
  }
});

/**
 * TEACHER: GET /api/teacher/voice-messages
 * Get voice messages received by this teacher from admin
 */
app.get("/api/teacher/voice-messages", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const messages = await db.collection("voiceMessages")
      .find({
        schoolId,
        targetRole: "TEACHER",
        targetUserIds: userId,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with sender info
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const admin = await db.collection("users").findOne({ _id: msg.senderId });
        return {
          ...msg,
          senderName: admin?.email || "Admin",
          _id: msg._id.toString(),
        };
      })
    );

    console.log("✅ TEACHER VOICE MESSAGES - Count:", messages.length);
    res.json(enrichedMessages);
  } catch (err) {
    console.error("❌ TEACHER VOICE MESSAGES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch voice messages" });
  }
});

/**
 * STUDENT: GET /api/student/voice-messages
 * Get voice messages received by this student from teachers/admin
 */
app.get("/api/student/voice-messages", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const messages = await db.collection("voiceMessages")
      .find({
        schoolId,
        targetRole: "STUDENT",
        targetUserIds: userId,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with sender info
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        let senderName = "Unknown";
        if (msg.senderRole === "TEACHER") {
          const teacher = await db.collection("teachers").findOne({ userId: msg.senderId });
          senderName = teacher?.name || "Teacher";
        } else if (msg.senderRole === "ADMIN") {
          const admin = await db.collection("users").findOne({ _id: msg.senderId });
          senderName = admin?.email || "Admin";
        }
        return {
          ...msg,
          senderName,
          _id: msg._id.toString(),
        };
      })
    );

    console.log("✅ STUDENT VOICE MESSAGES - Count:", messages.length);
    res.json(enrichedMessages);
  } catch (err) {
    console.error("❌ STUDENT VOICE MESSAGES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch voice messages" });
  }
});

/* ================================
   TIMETABLE ROUTES
   ================================= */

/**
 * TEACHER: POST /api/teacher/timetable
 * Create or update a timetable entry
 */
app.post("/api/teacher/timetable", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { day, period, subject, startTime, endTime, timetableId } = req.body;
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    if (!day || !period || !subject || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields: day, period, subject, startTime, endTime" });
    }

    const timetableEntry = {
      schoolId,
      class: className,
      section,
      day: String(day),
      period: Number(period),
      subject: String(subject),
      startTime: String(startTime),
      endTime: String(endTime),
      updatedAt: new Date(),
    };

    let result;
    if (timetableId && timetableId !== "undefined") {
      // Update existing entry
      const objId = safeObjectId(timetableId);
      result = await db.collection("timetables").findOneAndUpdate(
        { _id: objId, schoolId, class: className, section },
        { $set: timetableEntry },
        { returnDocument: "after" }
      );
      console.log("✅ TIMETABLE UPDATED - ID:", timetableId, "Day:", day, "Period:", period);
    } else {
      // Create new entry
      timetableEntry.createdAt = new Date();
      const insertResult = await db.collection("timetables").insertOne(timetableEntry);
      console.log("✅ TIMETABLE CREATED - ID:", insertResult.insertedId, "Day:", day, "Period:", period);
      result = { value: { ...timetableEntry, _id: insertResult.insertedId } };
    }

    res.json({
      success: true,
      timetable: {
        ...result.value,
        _id: result.value._id.toString(),
      },
    });
  } catch (err) {
    console.error("❌ TIMETABLE SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to save timetable" });
  }
});

/**
 * TEACHER: GET /api/teacher/timetable
 * Get timetable for teacher's class/section
 */
app.get("/api/teacher/timetable", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    const timetable = await db.collection("timetables")
      .find({
        schoolId,
        class: className,
        section,
      })
      .sort({ day: 1, period: 1 })
      .toArray();

    console.log("✅ TEACHER TIMETABLE - Count:", timetable.length, "Class:", className, "Section:", section);
    res.json(timetable);
  } catch (err) {
    console.error("❌ TEACHER TIMETABLE FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

/**
 * STUDENT: GET /api/student/timetable
 * Get timetable for student's class/section
 */
app.get("/api/student/timetable", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Find student profile to get class/section
    const student = await db.collection("students").findOne({
      userId,
      schoolId,
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const timetable = await db.collection("timetables")
      .find({
        schoolId,
        class: student.class,
        section: student.section,
      })
      .sort({ day: 1, period: 1 })
      .toArray();

    console.log("✅ STUDENT TIMETABLE - Count:", timetable.length, "Class:", student.class, "Section:", student.section);
    res.json(timetable);
  } catch (err) {
    console.error("❌ STUDENT TIMETABLE FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

/**
 * TEACHER: DELETE /api/teacher/timetable/:id
 * Delete a timetable entry
 */
app.delete("/api/teacher/timetable/:id", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const timetableId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;

    if (!timetableId) {
      return res.status(400).json({ error: "Invalid timetable ID" });
    }

    const result = await db.collection("timetables").deleteOne({
      _id: timetableId,
      schoolId,
      class: req.user.class,
      section: req.user.section,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Timetable entry not found" });
    }

    console.log("✅ TIMETABLE DELETED - ID:", timetableId);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ TIMETABLE DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete timetable" });
  }
});

/* ================================
   GENERAL FALLBACK
   ================================= */
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});