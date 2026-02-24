import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import XLSX from "xlsx";
import { MongoClient, ObjectId } from "mongodb";
import MockDatabase from "./mockDb.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load environment variables from .env file in server directory
// We'll load the .env after __dirname is defined below

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

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in server directory
const envPath = path.join(__dirname, ".env");
dotenv.config({ path: envPath });

// Log environment loading
console.log(`📁 Loading .env from: ${envPath}`);
console.log(`✅ JWT_SECRET loaded: ${process.env.JWT_SECRET ? "YES" : "NO"}`);
console.log(`✅ MONGO_URI loaded: ${process.env.MONGO_URI ? "YES (first 50 chars): " + process.env.MONGO_URI.substring(0, 50) : "NO"}`);

// 🎙️ Serve uploaded files (voice recordings, documents, etc)
// This makes /uploads/{filename} accessible publicly
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));
console.log(`✅ Static file serving enabled at /uploads (${uploadsPath})`);

// 🔧 Serve built React frontend from /client/dist
// This allows the backend to serve the production build
const frontendBuildPath = path.join(__dirname, "../client/dist");

// Serve static assets (CSS, JS, images)
app.use(express.static(frontendBuildPath));
console.log(`✅ Frontend static files enabled at ${frontendBuildPath}`);

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

async function seedDeveloperUser() {
  try {
    const existing = await db.collection("users").findOne({
      email: "developer@example.com",
      role: "DEVELOPER",
    });

    if (existing) {
      console.log("✅ DEVELOPER user already exists");
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash("developer123", 10);

    // Create DEVELOPER user
    const result = await db.collection("users").insertOne({
      email: "developer@example.com",
      passwordHash,
      role: "DEVELOPER",
      createdAt: new Date(),
    });

    console.log("✅ DEVELOPER user created automatically on startup");
    console.log("   📧 Email: developer@example.com");
    console.log("   🔐 Password: developer123");
  } catch (err) {
    console.warn("⚠️  Could not auto-seed DEVELOPER user:", err.message);
  }
}

async function startServer() {
  try {
    if (client && process.env.MONGO_URI) {
      try {
        await client.connect();
        db = client.db("school_saas");
        isMongoConnected = true;
        console.log("✅ MongoDB connected successfully");
        
        // Auto-seed developer user if MongoDB is connected
        await seedDeveloperUser();
      } catch (mongoError) {
        console.warn("⚠️  MongoDB connection failed, running in fallback mode:", mongoError.message);
        console.log("💡 Tip: Install MongoDB locally or set MONGO_URI to a MongoDB Atlas connection string");
        db = new MockDatabase();
        isMongoConnected = false;
        
        // Auto-seed developer user in fallback mode too
        await seedDeveloperUser();
      }
    } else {
      console.warn("⚠️  MONGO_URI not set - running in fallback mode with in-memory database");
      console.log("💡 To enable MongoDB: Set MONGO_URI in .env file");
      db = new MockDatabase();
      isMongoConnected = false;
      
      // Auto-seed developer user in fallback mode
      await seedDeveloperUser();
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
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = "uploads/voice";
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // Save with timestamp and .webm extension
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webm`;
      cb(null, filename);
    }
  }),
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
   DEBUG: Check if uploads are being served
   ================================= */
app.get("/api/debug/uploads", (req, res) => {
  try {
    const files = fs.readdirSync(uploadsPath);
    let voiceFiles = [];
    const voicePath = path.join(uploadsPath, "voice");
    if (fs.existsSync(voicePath)) {
      voiceFiles = fs.readdirSync(voicePath);
    }
    
    res.json({
      uploadsPath,
      uploadsPathExists: fs.existsSync(uploadsPath),
      uploadsPathIsDir: fs.existsSync(uploadsPath) && fs.statSync(uploadsPath).isDirectory(),
      voicePathExists: fs.existsSync(voicePath),
      allFilesInUploads: files,
      voiceFiles,
      exampleUrlToTry: voiceFiles.length > 0 ? `/uploads/voice/${voiceFiles[0]}` : "/uploads/voice/[test-file-here]",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
      isDeleted: { $ne: true },
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
      isDeleted: { $ne: true },
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
      isDeleted: { $ne: true },
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
      isDeleted: { $ne: true },
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
   STUDENT: GET PERSONAL ANALYTICS
   ================================= */
app.get("/api/student/analytics", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    // ✅ TENANT SCOPED: Find student
    const student = await db.collection("students").findOne({
      userId: userObjectId,
      schoolId,
      isDeleted: { $ne: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const studentId = student._id;

    // ✅ Fetch student's marks
    const marks = await db.collection("marks").find({
      studentId: studentId,
      schoolId,
    }).sort({ createdAt: -1 }).toArray();

    // ✅ Fetch student's attendance
    const attendance = await db.collection("attendance").find({
      studentId: studentId,
      schoolId,
      submissionStatus: "SUBMITTED",
    }).sort({ date: -1 }).toArray();

    // ✅ COMPUTE ANALYTICS DATA
    
    // 1. Overall Attendance %
    const presentCount = attendance.filter(a => a.status?.toUpperCase() === "PRESENT").length;
    const totalAttendance = attendance.length;
    const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // 2. Subject-wise marks analysis
    const subjectMarksMap = {};
    marks.forEach(m => {
      if (!subjectMarksMap[m.subject]) {
        subjectMarksMap[m.subject] = [];
      }
      if (m.score !== "ABSENT") {
        subjectMarksMap[m.subject].push(Number(m.score));
      }
    });

    const subjectAnalysis = Object.entries(subjectMarksMap).map(([subject, scores]) => ({
      subject,
      total: scores.length,
      average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      highest: scores.length > 0 ? Math.max(...scores) : 0,
      lowest: scores.length > 0 ? Math.min(...scores) : 0,
    }));

    // 3. Overall average marks
    const allMarksScores = marks.filter(m => m.score !== "ABSENT").map(m => Number(m.score));
    const overallAverage = allMarksScores.length > 0 ? Math.round(allMarksScores.reduce((a, b) => a + b, 0) / allMarksScores.length) : 0;

    // 4. Identify strongest and weakest subjects
    const sortedByAverage = [...subjectAnalysis].sort((a, b) => b.average - a.average);
    const bestSubject = sortedByAverage.length > 0 ? sortedByAverage[0] : null;
    const weakestSubject = sortedByAverage.length > 0 ? sortedByAverage[sortedByAverage.length - 1] : null;

    // 5. Attendance trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAttendance = attendance.filter(a => new Date(a.date) >= thirtyDaysAgo);
    const attendanceTrend = recentAttendance.length > 0 ? Math.round((recentAttendance.filter(a => a.status?.toUpperCase() === "PRESENT").length / recentAttendance.length) * 100) : attendancePercentage;

    // 6. Marks trends - group by exam
    const examMarksMap = {};
    marks.forEach(m => {
      if (!examMarksMap[m.exam]) {
        examMarksMap[m.exam] = [];
      }
      if (m.score !== "ABSENT") {
        examMarksMap[m.exam].push(Number(m.score));
      }
    });

    const examTrends = Object.entries(examMarksMap).map(([exam, scores]) => ({
      exam,
      average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    })).slice(0, 5).reverse(); // Last 5 exams

    // 7. Risk indicators
    const riskIndicators = [];
    if (attendancePercentage < 70) riskIndicators.push(`Low Attendance: ${attendancePercentage}% (Below 70% threshold)`);
    if (overallAverage < 50) riskIndicators.push(`Low Overall Marks: ${overallAverage}/100 (Below passing threshold)`);
    if (weakestSubject && weakestSubject.average < 40) riskIndicators.push(`Critical weakness in ${weakestSubject.subject}: ${weakestSubject.average}/100`);

    // 8. Auto-generated suggestions
    const suggestions = [];
    
    if (attendancePercentage < 70) {
      suggestions.push(`📌 Your attendance is only ${attendancePercentage}%. Try to attend more classes regularly.`);
    } else if (attendancePercentage >= 90) {
      suggestions.push(`✨ Excellent attendance of ${attendancePercentage}%. Keep it up!`);
    }

    if (overallAverage >= 80) {
      suggestions.push(`🏆 Great overall performance with an average of ${overallAverage}%. You're doing excellent!`);
    } else if (overallAverage >= 60) {
      suggestions.push(`📚 Your average is ${overallAverage}/100. Focus on weak subjects for better performance.`);
    } else if (overallAverage > 0) {
      suggestions.push(`⚠️ Your overall marks are ${overallAverage}/100. Keep working hard and seek help when needed.`);
    }

    if (weakestSubject) {
      if (weakestSubject.average < 40) {
        suggestions.push(`🔴 You're struggling in ${weakestSubject.subject} (avg: ${weakestSubject.average}/100). Consider extra practice or guidance.`);
      } else if (weakestSubject.average < 60) {
        suggestions.push(`🟡 ${weakestSubject.subject} needs more attention (avg: ${weakestSubject.average}/100). More practice recommended.`);
      }
    }

    if (bestSubject && bestSubject.average >= 80) {
      suggestions.push(`⭐ Your strength is ${bestSubject.subject} (avg: ${bestSubject.average}/100). Great job!`);
    }

    // 9. Prepare response data
    const responseData = {
      student: {
        _id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        class: student.class,
        section: student.section,
        email: student.email,
      },
      attendance: {
        total: totalAttendance,
        present: presentCount,
        absent: totalAttendance - presentCount,
        percentage: attendancePercentage,
        recentTrend: attendanceTrend, // Last 30 days %
      },
      marks: {
        overallAverage,
        totalExams: marks.length,
        subjects: subjectAnalysis,
        bestSubject,
        weakestSubject,
        examTrends, // Trend over exams
      },
      riskIndicators,
      suggestions,
      rawData: {
        marks,
        attendance: recentAttendance.slice(0, 30), // Last 30 attendance records
      }
    };

    res.json(responseData);
  } catch (err) {
    console.error("❌ STUDENT ANALYTICS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch student analytics" });
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
          isDeleted: { $ne: true },
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
                  currentClass: String(row.class),
                  className: String(row.class),
                  section: String(row.section),
                  currentSection: String(row.section),
                  assignedTeacher: row.assignedTeacher ? safeObjectId(row.assignedTeacher) || null : null,
                  rollNo: row.rollNo || "",
                  parentName: row.parentName || "",
                  phone: row.phone || "",
                  isDeleted: false,
                  schoolId: schoolId,
                  createdAt: new Date(),
                },
                $setOnInsert: {
                  migrationHistory: [],
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
   GET ATTENDANCE (VIEW LOCK STATUS) - TEACHER
   ================================= */
app.get("/api/teacher/attendance", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { date, className, section } = req.query;
    if (!date) {
      return res.json({ date: null, isFinalized: false, presentCount: 0, absentCount: 0, leaveCount: 0, totalStudents: 0, records: [] });
    }

    const schoolId = req.user.schoolIdObj;

    console.log("📖 [GET] Fetching attendance for DATE ONLY:", date, "class:", className, "section:", section);

    // ✅ ONLY fetch records for this SPECIFIC DATE
    const query = {
      date: String(date),
      class: String(className),
      section: String(section),
      ...(schoolId ? { schoolId } : {}),
    };

    const records = await db.collection("attendance").find(query).toArray();
    console.log("📖 [GET] Found", records.length, "records for date:", date);

    // ✅ Get total class size
    const totalStudents = await db.collection("students").countDocuments({
      class: String(className),
      section: String(section),
      ...(schoolId ? { schoolId } : {}),
    });

    console.log("📖 [GET] Total students in class:", totalStudents);

    // ✅ Count by status from THIS DATE ONLY
    const presentCount = records.filter(r => r.status === "PRESENT").length;
    const absentCount = records.filter(r => r.status === "ABSENT").length;
    const leaveCount = records.filter(r => r.status === "LEAVE").length;

    console.log("📊 [GET] Date:", date, "| Present:", presentCount, "Absent:", absentCount, "Leave:", leaveCount, "Total students:", totalStudents);

    // ✅ Get ALL students in the class
    const allClassStudents = await db.collection("students").find({
      class: String(className),
      section: String(section),
      ...(schoolId ? { schoolId } : {}),
    }).toArray();

    // ✅ For EACH student in the class, calculate their overall attendance percentage (lifetime)
    // This ensures all students show their percentage, even if they don't have a record for this date
    const enhancedRecords = [];
    for (const student of allClassStudents) {
      const studentId = safeObjectId(student._id);  // ✅ Convert to ObjectId to match database storage
      
      // Get ALL attendance records for this student (across all dates)
      const allStudentRecords = await db.collection("attendance").find({
        studentId: studentId,  // ✅ Query with ObjectId, not string
        ...(schoolId ? { schoolId } : {}),
      }).toArray();
      
      const studentPresentCount = allStudentRecords.filter(r => r.status === "PRESENT").length;
      const studentTotalRecords = allStudentRecords.length;
      const overallPercentage = studentTotalRecords > 0 ? Math.round((studentPresentCount / studentTotalRecords) * 100) : 0;
      
      // Find if this student has a record for THIS specific date
      const dateRecord = records.find(r => String(r.studentId) === String(studentId));
      
      if (dateRecord) {
        console.log("📊 [GET] Student", String(studentId).slice(0, 8) + "... is", dateRecord.status, "on", date, " | Lifetime:", overallPercentage + "%", `(${studentPresentCount}/${studentTotalRecords})`);
        enhancedRecords.push({
          ...dateRecord,
          overallPercentage,  // ✅ Each student's lifetime percentage
        });
      } else {
        // Student has no record for this date - add with default PRESENT and their overall percentage
        console.log("📊 [GET] Student", String(studentId).slice(0, 8) + "... has NO record on", date, " | Lifetime:", overallPercentage + "%", `(${studentPresentCount}/${studentTotalRecords})`);
        enhancedRecords.push({
          studentId: studentId,
          date: String(date),
          status: null,  // No status yet
          class: String(className),
          section: String(section),
          overallPercentage,  // ✅ Each student's lifetime percentage
        });
      }
    }

    // ✅ Check finalization status for this date
    let isFinalized = false;
    if (records.length > 0) {
      const finalizedStates = [...new Set(records.map(r => r.isFinalized))];
      isFinalized = finalizedStates.includes(true);
    }

    console.log("🔒 [GET] isFinalized:", isFinalized);

    return res.json({
      date: String(date),
      isFinalized,
      presentCount,
      absentCount,
      leaveCount,
      totalStudents,
      records: enhancedRecords,  // ✅ Records now include overallPercentage for ALL students in class
    });
  } catch (err) {
    console.error("❌ [GET] FETCH ATTENDANCE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
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
    console.log("📝 [SAVE] Processing", records.length, "student records");

    // 🔒 CRITICAL: Check if ANY record for this date is already finalized
    const existingFinalized = await db.collection("attendance").findOne({
      schoolId,
      date: String(date),
      class: String(className),
      section: String(section),
      isFinalized: true,
    });

    if (existingFinalized) {
      console.warn("❌ [SAVE] BLOCKED - Attendance already finalized for", date);
      return res.status(403).json({
        error: "Cannot edit finalized attendance. This date is locked.",
      });
    }

    for (const r of records) {
      const studentId = safeObjectId(r.studentUserId || r.studentId);
      if (!studentId) {
        console.warn("⚠️ [SAVE] Skipping record - invalid studentId:", r.studentUserId, r.studentId);
        continue;
      }

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

      console.log("📝 [SAVE] Upserting record for student:", studentId.toString().slice(0, 8) + "...", "status:", r.status);

      const result = await db.collection("attendance").updateOne(filter, update, { upsert: true });
      console.log("   Result - matched:", result.matchedCount, "upserted:", result.upsertedCount);
    }

    // ✅ After saving, recalculate and return the counts - ONLY for this date
    const allRecordsAfterSave = await db.collection("attendance").find({
      schoolId,
      date: String(date),
      class: String(className),
      section: String(section),
    }).toArray();

    console.log("✅ [SAVE] After upsert - Found", allRecordsAfterSave.length, "records for recalculation");

    const presentCount = allRecordsAfterSave.filter(r => r.status === "PRESENT").length;
    const absentCount = allRecordsAfterSave.filter(r => r.status === "ABSENT").length;
    const leaveCount = allRecordsAfterSave.filter(r => r.status === "LEAVE").length;
    
    // ✅ Get total class size (not record count)
    const totalStudents = await db.collection("students").countDocuments({
      class: String(className),
      section: String(section),
      ...(schoolId ? { schoolId } : {}),
    });
    
    // ✅ Percentage = (present / total students in class) * 100
    const percentageForDate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    console.log("✅ ATTENDANCE DRAFT SAVED - records on this date:", allRecordsAfterSave.length, "total students in class:", totalStudents, "present:", presentCount, "absent:", absentCount, "leave:", leaveCount, "percentage:", percentageForDate + "%");
    res.json({ 
      success: true, 
      message: "Draft saved", 
      recordsSaved: records.length,
      presentCount,
      absentCount,
      leaveCount,
      percentageForDate,
      totalStudents,
    });
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

    // 🔒 Check if already finalized
    const alreadyFinalized = await db.collection("attendance").findOne({
      schoolId,
      date: String(date),
      class: String(className),
      section: String(section),
      isFinalized: true,
    });

    if (alreadyFinalized) {
      console.warn("⚠️ [SUBMIT] Already finalized for:", date);
      return res.status(403).json({
        error: "This attendance is already finalized and cannot be modified",
      });
    }

    // ✅ TENANT & CLASS/SECTION SCOPED: Only find DRAFT records from this school/class/section
    const filter = {
      schoolId,
      date: String(date),
      class: String(className),
      section: String(section),
      submissionStatus: "DRAFT",
    };

    console.log("✅ [SUBMIT] Looking for DRAFT records with filter:", JSON.stringify(filter));

    const result = await db.collection("attendance").updateMany(
      filter,
      {
        $set: {
          submissionStatus: "SUBMITTED",
          isFinalized: true,
          finalizedAt: new Date(),
          submittedAt: new Date(),
        },
      }
    );

    console.log("✅ [SUBMIT] UpdateMany result - matched:", result.matchedCount, "modified:", result.modifiedCount);

    if (result.matchedCount === 0) {
      console.warn("⚠️ [SUBMIT] No DRAFT records found. Checking what exists...");
      const allRecords = await db.collection("attendance").find({
        schoolId,
        date: String(date),
        class: String(className),
        section: String(section),
      }).toArray();
      console.warn("   Total records for this date/class/section:", allRecords.length);
      if (allRecords.length > 0) {
        console.warn("   Sample record:", JSON.stringify(allRecords[0], (key, value) => {
          if (key === "_id" || key === "schoolId" || key === "studentId") return String(value);
          return value;
        }));
      }
      return res.status(400).json({
        error: "No draft attendance found for this date. Please save attendance first.",
      });
    }

    // ✅ After finalization, recalculate and return the counts - ONLY for this date
    const finalizedRecords = await db.collection("attendance").find({
      schoolId,
      date: String(date),
      class: String(className),
      section: String(section),
    }).toArray();

    const presentCount = finalizedRecords.filter(r => r.status === "PRESENT").length;
    const absentCount = finalizedRecords.filter(r => r.status === "ABSENT").length;
    const leaveCount = finalizedRecords.filter(r => r.status === "LEAVE").length;
    
    // ✅ Get total class size (not record count)
    const totalStudents = await db.collection("students").countDocuments({
      class: String(className),
      section: String(section),
      ...(schoolId ? { schoolId } : {}),
    });
    
    // ✅ Percentage = (present / total students in class) * 100
    const percentageForDate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    console.log("✅ ATTENDANCE SUBMITTED - records finalized:", result.modifiedCount, "total students in class:", totalStudents, "present:", presentCount, "absent:", absentCount, "leave:", leaveCount, "percentage:", percentageForDate + "%");
    res.json({ 
      success: true, 
      message: "Attendance submitted",
      recordsFinalized: result.modifiedCount,
      presentCount,
      absentCount,
      leaveCount,
      percentageForDate,
      totalStudents,
    });
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
      isDeleted: { $ne: true },
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
   TEACHER: GET STUDENT ANALYTICS
   ================================= */
app.get("/api/teacher/students/:studentId/analytics", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.user.schoolIdObj;
    
    const studentIdObj = safeObjectId(studentId);
    if (!studentIdObj) {
      return res.status(400).json({ error: "Invalid studentId" });
    }

    // ✅ Fetch student details
    const student = await db.collection("students").findOne({
      _id: studentIdObj,
      schoolId,
      isDeleted: { $ne: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // ✅ Fetch student's marks
    const marks = await db.collection("marks").find({
      studentId: studentIdObj,
      schoolId,
    }).sort({ createdAt: -1 }).toArray();

    // ✅ Fetch student's attendance
    const attendance = await db.collection("attendance").find({
      studentId: studentIdObj,
      schoolId,
      submissionStatus: "SUBMITTED",
    }).sort({ date: -1 }).toArray();

    // ✅ COMPUTE ANALYTICS DATA
    
    // 1. Overall Attendance %
    const presentCount = attendance.filter(a => a.status?.toUpperCase() === "PRESENT").length;
    const totalAttendance = attendance.length;
    const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // 2. Subject-wise marks analysis
    const subjectMarksMap = {};
    marks.forEach(m => {
      if (!subjectMarksMap[m.subject]) {
        subjectMarksMap[m.subject] = [];
      }
      if (m.score !== "ABSENT") {
        subjectMarksMap[m.subject].push(Number(m.score));
      }
    });

    const subjectAnalysis = Object.entries(subjectMarksMap).map(([subject, scores]) => ({
      subject,
      total: scores.length,
      average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      highest: scores.length > 0 ? Math.max(...scores) : 0,
      lowest: scores.length > 0 ? Math.min(...scores) : 0,
    }));

    // 3. Overall average marks
    const allMarksScores = marks.filter(m => m.score !== "ABSENT").map(m => Number(m.score));
    const overallAverage = allMarksScores.length > 0 ? Math.round(allMarksScores.reduce((a, b) => a + b, 0) / allMarksScores.length) : 0;

    // 4. Identify strongest and weakest subjects
    const sortedByAverage = [...subjectAnalysis].sort((a, b) => b.average - a.average);
    const bestSubject = sortedByAverage.length > 0 ? sortedByAverage[0] : null;
    const weakestSubject = sortedByAverage.length > 0 ? sortedByAverage[sortedByAverage.length - 1] : null;

    // 5. Attendance trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAttendance = attendance.filter(a => new Date(a.date) >= thirtyDaysAgo);
    const attendanceTrend = recentAttendance.length > 0 ? Math.round((recentAttendance.filter(a => a.status?.toUpperCase() === "PRESENT").length / recentAttendance.length) * 100) : attendancePercentage;

    // 6. Marks trends - group by exam (last 3 exams)
    const examMarksMap = {};
    marks.forEach(m => {
      if (!examMarksMap[m.exam]) {
        examMarksMap[m.exam] = [];
      }
      if (m.score !== "ABSENT") {
        examMarksMap[m.exam].push(Number(m.score));
      }
    });

    const examTrends = Object.entries(examMarksMap).map(([exam, scores]) => ({
      exam,
      average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    })).slice(0, 5).reverse(); // Last 5 exams

    // 7. Gender insights
    const riskIndicators = [];
    if (attendancePercentage < 70) riskIndicators.push(`Low Attendance: ${attendancePercentage}% (Below 70% threshold)`);
    if (overallAverage < 50) riskIndicators.push(`Low Overall Marks: ${overallAverage}/100 (Below passing threshold)`);
    if (weakestSubject && weakestSubject.average < 40) riskIndicators.push(`Critical weakness in ${weakestSubject.subject}: ${weakestSubject.average}/100`);

    // 8. Auto-generated suggestions
    const suggestions = [];
    
    if (attendancePercentage < 70) {
      suggestions.push(`📌 Attendance Alert: ${student.name} has attended only ${attendancePercentage}% of classes. Encourage regular attendance.`);
    } else if (attendancePercentage >= 90) {
      suggestions.push(`✨ Excellent attendance of ${attendancePercentage}%. Keep it up!`);
    }

    if (overallAverage >= 80) {
      suggestions.push(`🏆 Strong overall performance with an average of ${overallAverage}%. ${student.name} is doing excellent!`);
    } else if (overallAverage >= 60) {
      suggestions.push(`📚 Average performance of ${overallAverage}/100. Focus on weak subjects for improvement.`);
    } else if (overallAverage > 0) {
      suggestions.push(`⚠️ Overall marks ${overallAverage}/100. Needs immediate academic support.`);
    }

    if (weakestSubject) {
      if (weakestSubject.average < 40) {
        suggestions.push(`🔴 ${student.name} is struggling in ${weakestSubject.subject} (avg: ${weakestSubject.average}/100). Consider extra coaching.`);
      } else if (weakestSubject.average < 60) {
        suggestions.push(`🟡 ${weakestSubject.subject} needs attention (avg: ${weakestSubject.average}/100). More practice recommended.`);
      }
    }

    if (bestSubject && bestSubject.average >= 80) {
      suggestions.push(`⭐ Strength: ${bestSubject.subject} (avg: ${bestSubject.average}/100) is a strong subject.`);
    }

    // 9. Prepare response data
    const responseData = {
      student: {
        _id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        class: student.class,
        section: student.section,
        email: student.email,
      },
      attendance: {
        total: totalAttendance,
        present: presentCount,
        absent: totalAttendance - presentCount,
        percentage: attendancePercentage,
        recentTrend: attendanceTrend, // Last 30 days %
      },
      marks: {
        overallAverage,
        totalExams: marks.length,
        subjects: subjectAnalysis,
        bestSubject,
        weakestSubject,
        examTrends, // Trend over exams
      },
      riskIndicators,
      suggestions,
      rawData: {
        marks,
        attendance: recentAttendance.slice(0, 30), // Last 30 attendance records
      }
    };

    res.json(responseData);
  } catch (err) {
    console.error("❌ STUDENT ANALYTICS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch student analytics" });
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
    const { name, email, rollNo, className, section, password, parentName, phone, assignedTeacher } = req.body;
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
      currentClass: String(className ?? ""),
      section: String(section ?? ""),
      currentSection: String(section ?? ""),
      assignedTeacher: assignedTeacher ? safeObjectId(assignedTeacher) || null : null,
      rollNo: rollNo || "",
      parentName: parentName || "",
      phone: phone || "",
      isDeleted: false,
      migrationHistory: [],
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

      const studentsQuery = withActiveStudents({ schoolId });
      const teachersQuery = { schoolId };

      const students = await db
        .collection("students")
        .find(studentsQuery)
        .project({
          name: 1,
          _id: 1,
          class: 1,
          section: 1,
          currentClass: 1,
          currentSection: 1,
          assignedTeacher: 1,
          rollNo: 1,
          parentName: 1,
          phone: 1,
          email: 1,
          migrationHistory: 1,
        })
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
      const adminId = safeObjectId(req.user.userId);

      if (!studentId || !schoolId || !adminId) {
        return res.status(400).json({ error: "Invalid studentId, schoolId, or adminId" });
      }

      const student = await db.collection("students").findOne({
        _id: studentId,
        schoolId,
        isDeleted: { $ne: true },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      await detachStudentsFromTeachers(db.collection("teachers"), [studentId], schoolId);
      await detachStudentsFromClassMappings([studentId], schoolId);

      await db.collection("students").updateOne(
        { _id: studentId, schoolId },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: adminId,
            previousAssignment: {
              class: student.class || student.currentClass || "",
              section: student.section || student.currentSection || "",
              assignedTeacher: student.assignedTeacher || null,
            },
          },
        }
      );

      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId,
        action: "SOFT_DELETE_STUDENT",
        targetType: "STUDENT",
        targetId: studentId,
        targetName: student.name,
        timestamp: new Date(),
        details: { email: student.email, class: student.class, section: student.section, rollNo: student.rollNo },
      });

      console.log("✅ STUDENT SOFT DELETED:", student.name, "ID:", studentId);
      res.json({ success: true, message: `Student ${student.name} deleted` });
    } catch (err) {
      console.error("❌ DELETE STUDENT ERROR:", err);
      res.status(500).json({ error: "Failed to delete student" });
    }
  }
);

/* ================================
   ADMIN: STUDENT MIGRATION HELPERS
   ================================= */
const normalizeClassOrSection = (value) => String(value ?? "").trim();
const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const activeStudentsFilter = { isDeleted: { $ne: true } };

const withActiveStudents = (query = {}) => ({
  ...query,
  ...activeStudentsFilter,
});

async function detachStudentsFromTeachers(teachersCol, studentObjectIds = [], schoolId) {
  if (!Array.isArray(studentObjectIds) || studentObjectIds.length === 0 || !schoolId) return;
  await teachersCol.updateMany(
    { schoolId, assignedStudents: { $in: studentObjectIds } },
    { $pull: { assignedStudents: { $in: studentObjectIds } } }
  );
}

async function detachStudentsFromClassMappings(studentObjectIds = [], schoolId) {
  if (!Array.isArray(studentObjectIds) || studentObjectIds.length === 0 || !schoolId) return;

  const idsAsString = studentObjectIds.map((id) => String(id));
  const mappingCollections = ["classSectionMappings", "classSectionMap", "classMappings"];
  await Promise.all(
    mappingCollections.map(async (collectionName) => {
      try {
        await db.collection(collectionName).updateMany(
          { schoolId },
          {
            $pull: {
              studentIds: { $in: studentObjectIds },
              students: { $in: [...studentObjectIds, ...idsAsString] },
            },
          }
        );
      } catch (err) {
        console.warn(`⚠️ CLASS MAPPING DETACH SKIPPED (${collectionName}):`, err.message);
      }
    })
  );
}

async function attachStudentToTeacher(teachersCol, schoolId, teacherId, studentId) {
  if (!schoolId || !teacherId || !studentId) return false;
  const teacherObjectId = safeObjectId(teacherId);
  const studentObjectId = safeObjectId(studentId);
  if (!teacherObjectId || !studentObjectId) return false;

  const teacher = await teachersCol.findOne({ _id: teacherObjectId, schoolId });
  if (!teacher) return false;

  await teachersCol.updateOne(
    { _id: teacherObjectId, schoolId },
    { $addToSet: { assignedStudents: studentObjectId } }
  );
  return true;
}

async function reattachStudentToClassMappings(schoolId, className, section, studentId) {
  if (!schoolId || !className || !section || !studentId) return false;
  const studentObjectId = safeObjectId(studentId);
  if (!studentObjectId) return false;
  const idsAsString = String(studentObjectId);
  const mappingCollections = ["classSectionMappings", "classSectionMap", "classMappings"];

  let attached = false;
  for (const collectionName of mappingCollections) {
    try {
      const result = await db.collection(collectionName).updateOne(
        { schoolId, class: String(className), section: String(section) },
        {
          $addToSet: {
            studentIds: studentObjectId,
            students: idsAsString,
          },
        }
      );
      if (result.matchedCount > 0) attached = true;
    } catch (err) {
      console.warn(`⚠️ CLASS MAPPING ATTACH SKIPPED (${collectionName}):`, err.message);
    }
  }
  return attached;
}

/* ================================
   ADMIN: BULK SOFT DELETE STUDENTS
   ================================= */
app.post(
  "/api/admin/students/bulk-delete",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const adminId = safeObjectId(req.user.userId);
      const studentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];
      const objectIds = studentIds.map((id) => safeObjectId(id)).filter(Boolean);

      if (!schoolId || !adminId) return res.status(400).json({ error: "Invalid schoolId or adminId" });
      if (objectIds.length === 0) return res.status(400).json({ error: "studentIds array is required" });

      const studentsCol = db.collection("students");
      const teachersCol = db.collection("teachers");

      const students = await studentsCol.find({
        _id: { $in: objectIds },
        schoolId,
        isDeleted: { $ne: true },
      }).toArray();

      const foundIds = new Set(students.map((s) => String(s._id)));
      const failed = [];
      objectIds.forEach((id) => {
        if (!foundIds.has(String(id))) failed.push({ studentId: String(id), reason: "Student not found or already deleted" });
      });

      if (students.length > 0) {
        const now = new Date();
        await detachStudentsFromTeachers(teachersCol, students.map((s) => s._id), schoolId);
        await detachStudentsFromClassMappings(students.map((s) => s._id), schoolId);

        await Promise.all(
          students.map((student) =>
            studentsCol.updateOne(
              { _id: student._id, schoolId, isDeleted: { $ne: true } },
              {
                $set: {
                  isDeleted: true,
                  deletedAt: now,
                  deletedBy: adminId,
                  previousAssignment: {
                    class: student.class || student.currentClass || "",
                    section: student.section || student.currentSection || "",
                    assignedTeacher: student.assignedTeacher || null,
                  },
                },
              }
            )
          )
        );
      }

      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId,
        action: "BULK_SOFT_DELETE_STUDENTS",
        targetType: "STUDENT",
        timestamp: new Date(),
        details: {
          requestedCount: objectIds.length,
          affectedCount: students.length,
          failedCount: failed.length,
        },
      });

      return res.json({
        affectedCount: students.length,
        failed,
      });
    } catch (err) {
      console.error("❌ BULK DELETE STUDENTS ERROR:", err);
      return res.status(500).json({ error: "Failed to bulk delete students" });
    }
  }
);

/* ================================
   ADMIN: BULK RESTORE STUDENTS
   ================================= */
app.post(
  "/api/admin/students/bulk-restore",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const adminId = safeObjectId(req.user.userId);
      const studentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];
      const objectIds = studentIds.map((id) => safeObjectId(id)).filter(Boolean);

      if (!schoolId || !adminId) return res.status(400).json({ error: "Invalid schoolId or adminId" });
      if (objectIds.length === 0) return res.status(400).json({ error: "studentIds array is required" });

      const studentsCol = db.collection("students");
      const teachersCol = db.collection("teachers");
      const failed = [];
      const warnings = [];
      let affectedCount = 0;

      const students = await studentsCol.find({
        _id: { $in: objectIds },
        schoolId,
        isDeleted: true,
      }).toArray();

      const foundIds = new Set(students.map((s) => String(s._id)));
      objectIds.forEach((id) => {
        if (!foundIds.has(String(id))) failed.push({ studentId: String(id), reason: "Deleted student not found" });
      });

      for (const student of students) {
        try {
          const previous = student.previousAssignment || {};
          const restoredClass = String(previous.class || student.class || student.currentClass || "").trim();
          const restoredSection = String(previous.section || student.section || student.currentSection || "").trim();
          const previousTeacherId = previous.assignedTeacher ? safeObjectId(previous.assignedTeacher) : null;

          const updateDoc = {
            isDeleted: false,
            restoredAt: new Date(),
            restoredBy: adminId,
          };

          if (restoredClass) {
            updateDoc.class = restoredClass;
            updateDoc.currentClass = restoredClass;
          }
          if (restoredSection) {
            updateDoc.section = restoredSection;
            updateDoc.currentSection = restoredSection;
          }

          if (previousTeacherId) {
            const attached = await attachStudentToTeacher(teachersCol, schoolId, previousTeacherId, student._id);
            if (attached) {
              updateDoc.assignedTeacher = previousTeacherId;
            } else {
              updateDoc.assignedTeacher = null;
              warnings.push({ studentId: String(student._id), reason: "Previous teacher not found; restored as Unassigned" });
            }
          } else {
            updateDoc.assignedTeacher = null;
            warnings.push({ studentId: String(student._id), reason: "No previous teacher mapping; restored as Unassigned" });
          }

          const classAttached = await reattachStudentToClassMappings(
            schoolId,
            restoredClass,
            restoredSection,
            student._id
          );
          if (!classAttached) {
            warnings.push({ studentId: String(student._id), reason: "Class/section mapping not found during restore" });
          }

          const result = await studentsCol.updateOne(
            { _id: student._id, schoolId, isDeleted: true },
            {
              $set: updateDoc,
              $unset: { deletedAt: "", deletedBy: "" },
            }
          );

          if (result.modifiedCount > 0) {
            affectedCount += 1;
          } else {
            failed.push({ studentId: String(student._id), reason: "Failed to restore student" });
          }
        } catch (rowErr) {
          failed.push({ studentId: String(student._id), reason: rowErr.message || "Restore failed" });
        }
      }

      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId,
        action: "BULK_RESTORE_STUDENTS",
        targetType: "STUDENT",
        timestamp: new Date(),
        details: {
          requestedCount: objectIds.length,
          affectedCount,
          failedCount: failed.length,
          warningCount: warnings.length,
        },
      });

      return res.json({
        affectedCount,
        failed,
        warnings,
      });
    } catch (err) {
      console.error("❌ BULK RESTORE STUDENTS ERROR:", err);
      return res.status(500).json({ error: "Failed to bulk restore students" });
    }
  }
);

/* ================================
   ADMIN: BULK UPDATE STUDENTS
   ================================= */
app.post(
  "/api/admin/students/bulk-update",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const adminId = safeObjectId(req.user.userId);
      const studentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];
      const updates = req.body?.updates || {};
      const objectIds = studentIds.map((id) => safeObjectId(id)).filter(Boolean);

      if (!schoolId || !adminId) return res.status(400).json({ error: "Invalid schoolId or adminId" });
      if (objectIds.length === 0) return res.status(400).json({ error: "studentIds array is required" });

      const hasClass = typeof updates.class !== "undefined" && String(updates.class).trim() !== "";
      const hasSection = typeof updates.section !== "undefined" && String(updates.section).trim() !== "";
      const hasAssignedTeacher = typeof updates.assignedTeacher !== "undefined";
      if (!hasClass && !hasSection && !hasAssignedTeacher) {
        return res.status(400).json({ error: "At least one field is required: class, section, assignedTeacher" });
      }

      const studentsCol = db.collection("students");
      const teachersCol = db.collection("teachers");
      const students = await studentsCol.find({
        _id: { $in: objectIds },
        schoolId,
        isDeleted: { $ne: true },
      }).toArray();

      const foundIds = new Set(students.map((s) => String(s._id)));
      const failed = [];
      objectIds.forEach((id) => {
        if (!foundIds.has(String(id))) failed.push({ studentId: String(id), reason: "Student not found or deleted" });
      });

      let affectedCount = 0;
      const assignedTeacherObjectId =
        hasAssignedTeacher && String(updates.assignedTeacher).trim()
          ? safeObjectId(updates.assignedTeacher)
          : null;

      for (const student of students) {
        try {
          const setDoc = {};
          if (hasClass) {
            const classValue = String(updates.class).trim();
            setDoc.class = classValue;
            setDoc.currentClass = classValue;
          }
          if (hasSection) {
            const sectionValue = String(updates.section).trim();
            setDoc.section = sectionValue;
            setDoc.currentSection = sectionValue;
          }

          if (hasAssignedTeacher) {
            await detachStudentsFromTeachers(teachersCol, [student._id], schoolId);
            if (assignedTeacherObjectId) {
              const attached = await attachStudentToTeacher(teachersCol, schoolId, assignedTeacherObjectId, student._id);
              setDoc.assignedTeacher = attached ? assignedTeacherObjectId : null;
              if (!attached) {
                failed.push({ studentId: String(student._id), reason: "Assigned teacher not found; set as Unassigned" });
              }
            } else {
              setDoc.assignedTeacher = null;
            }
          }

          if (Object.keys(setDoc).length > 0) {
            setDoc.updatedAt = new Date();
            const updateResult = await studentsCol.updateOne(
              { _id: student._id, schoolId, isDeleted: { $ne: true } },
              { $set: setDoc }
            );
            if (updateResult.modifiedCount > 0) affectedCount += 1;
          }
        } catch (rowErr) {
          failed.push({ studentId: String(student._id), reason: rowErr.message || "Bulk update failed" });
        }
      }

      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId,
        action: "BULK_UPDATE_STUDENTS",
        targetType: "STUDENT",
        timestamp: new Date(),
        details: {
          requestedCount: objectIds.length,
          affectedCount,
          failedCount: failed.length,
          updates: {
            class: hasClass ? String(updates.class).trim() : undefined,
            section: hasSection ? String(updates.section).trim() : undefined,
            assignedTeacher: hasAssignedTeacher ? String(updates.assignedTeacher || "") : undefined,
          },
        },
      });

      return res.json({ affectedCount, failed });
    } catch (err) {
      console.error("❌ BULK UPDATE STUDENTS ERROR:", err);
      return res.status(500).json({ error: "Failed to bulk update students" });
    }
  }
);

const getStudentPlacement = (student) => ({
  classValue: normalizeClassOrSection(student?.class || student?.currentClass),
  sectionValue: normalizeClassOrSection(student?.section || student?.currentSection),
});

async function resolveStudentForMigration(studentsCol, schoolId, item) {
  const studentId = safeObjectId(item?.studentId);
  if (studentId) {
    const student = await studentsCol.findOne(withActiveStudents({ _id: studentId, schoolId }));
    if (!student) return { ok: false, reason: "Student not found for given studentId" };
    return { ok: true, student };
  }

  if (item?.email) {
    const email = normalizeEmail(item.email);
    const student = await studentsCol.findOne(withActiveStudents({ schoolId, email }));
    if (!student) return { ok: false, reason: "Student not found for given email" };
    return { ok: true, student };
  }

  if (item?.rollNo) {
    const rollNo = String(item.rollNo).trim();
    if (!rollNo) return { ok: false, reason: "rollNo cannot be empty" };

    const rollMatches = await studentsCol.find(withActiveStudents({ schoolId, rollNo })).toArray();
    if (rollMatches.length === 0) {
      return { ok: false, reason: "Student not found for given rollNo" };
    }
    if (rollMatches.length === 1) {
      return { ok: true, student: rollMatches[0] };
    }

    const fromClass = normalizeClassOrSection(item?.fromClass);
    const fromSection = normalizeClassOrSection(item?.fromSection);
    if (!fromClass || !fromSection) {
      return {
        ok: false,
        reason: "rollNo matched multiple students. Provide studentId/email or include fromClass and fromSection",
      };
    }

    const matchedStudent = rollMatches.find((s) => {
      const placement = getStudentPlacement(s);
      return placement.classValue === fromClass && placement.sectionValue === fromSection;
    });

    if (!matchedStudent) {
      return { ok: false, reason: "No student found for rollNo in the provided fromClass/fromSection" };
    }
    return { ok: true, student: matchedStudent };
  }

  return { ok: false, reason: "Provide one identifier: studentId, rollNo, or email" };
}

async function migrateSingleStudentRecord({
  studentsCol,
  schoolId,
  student,
  toClass,
  toSection,
  adminObjectId,
  migratedByEmail,
}) {
  const targetClass = normalizeClassOrSection(toClass);
  const targetSection = normalizeClassOrSection(toSection);

  if (!targetClass || !targetSection) {
    return { ok: false, reason: "newClass and newSection are required" };
  }

  const { classValue: fromClass, sectionValue: fromSection } = getStudentPlacement(student);
  if (!fromClass || !fromSection) {
    return { ok: false, reason: "Student has invalid current class/section" };
  }

  if (fromClass === targetClass && fromSection === targetSection) {
    return { ok: false, reason: "Student is already in the target class/section" };
  }

  const rollNo = String(student.rollNo || "").trim();
  if (rollNo) {
    const duplicate = await studentsCol.findOne({
      schoolId,
      _id: { $ne: student._id },
      rollNo,
      class: targetClass,
      section: targetSection,
      isDeleted: { $ne: true },
    });

    if (duplicate) {
      return { ok: false, reason: `Duplicate roll number '${rollNo}' in Class ${targetClass}, Section ${targetSection}` };
    }
  }

  const now = new Date();
  const migrationEntry = {
    fromClass,
    fromSection,
    toClass: targetClass,
    toSection: targetSection,
    migratedAt: now,
    migratedBy: adminObjectId,
    migratedByEmail: migratedByEmail || "",
  };

  const updateResult = await studentsCol.updateOne(
    { _id: student._id, schoolId },
    {
      $set: {
        class: targetClass,
        section: targetSection,
        currentClass: targetClass,
        currentSection: targetSection,
        migratedAt: now,
        updatedAt: now,
      },
      $push: {
        migrationHistory: migrationEntry,
      },
    }
  );

  if (updateResult.modifiedCount === 0) {
    return { ok: false, reason: "Migration failed to update student record" };
  }

  return { ok: true, fromClass, fromSection, toClass: targetClass, toSection: targetSection, migrationEntry };
}

/* ================================
   ADMIN: MIGRATE SINGLE STUDENT
   ================================= */
app.post(
  "/api/admin/students/:id/migrate",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const adminObjectId = safeObjectId(req.user.userId);
      const studentId = safeObjectId(req.params.id);
      const toClass = req.body?.newClass;
      const toSection = req.body?.newSection;

      if (!schoolId || !adminObjectId || !studentId) {
        return res.status(400).json({ error: "Invalid schoolId, adminId, or studentId" });
      }

      const studentsCol = db.collection("students");
      const usersCol = db.collection("users");
      const adminUser = await usersCol.findOne({ _id: adminObjectId });
      const migratedByEmail = adminUser?.email || "";

      const student = await studentsCol.findOne(withActiveStudents({ _id: studentId, schoolId }));
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const migration = await migrateSingleStudentRecord({
        studentsCol,
        schoolId,
        student,
        toClass,
        toSection,
        adminObjectId,
        migratedByEmail,
      });

      if (!migration.ok) {
        const statusCode = migration.reason?.startsWith("Duplicate roll number") ? 409 : 400;
        return res.status(statusCode).json({ error: migration.reason });
      }

      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId: adminObjectId,
        action: "MIGRATE_SINGLE_STUDENT",
        targetType: "STUDENT",
        targetId: student._id,
        targetName: student.name,
        timestamp: new Date(),
        details: {
          rollNo: student.rollNo || "",
          fromClass: migration.fromClass,
          fromSection: migration.fromSection,
          toClass: migration.toClass,
          toSection: migration.toSection,
        },
      });

      console.log("✅ STUDENT MIGRATED:", student.name, "from", `${migration.fromClass}-${migration.fromSection}`, "to", `${migration.toClass}-${migration.toSection}`);
      return res.json({
        success: true,
        message: "Student migrated successfully",
        studentId: String(student._id),
        fromClass: migration.fromClass,
        fromSection: migration.fromSection,
        toClass: migration.toClass,
        toSection: migration.toSection,
      });
    } catch (err) {
      console.error("❌ SINGLE STUDENT MIGRATION ERROR:", err);
      return res.status(500).json({ error: "Failed to migrate student" });
    }
  }
);

/* ================================
   ADMIN: BULK MIGRATE STUDENTS
   ================================= */
app.post(
  "/api/admin/students/bulk-migrate",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const adminObjectId = safeObjectId(req.user.userId);
      if (!schoolId || !adminObjectId) {
        return res.status(400).json({ error: "Invalid schoolId or adminId" });
      }

      const studentsCol = db.collection("students");
      const usersCol = db.collection("users");
      const adminUser = await usersCol.findOne({ _id: adminObjectId });
      const migratedByEmail = adminUser?.email || "";

      let records = [];
      if (Array.isArray(req.body)) {
        records = req.body;
      } else if (Array.isArray(req.body?.records)) {
        records = req.body.records;
      } else if (Array.isArray(req.body?.migrations)) {
        records = req.body.migrations;
      } else if (req.body?.migrateAll) {
        const fromClass = normalizeClassOrSection(req.body?.fromClass);
        const fromSection = normalizeClassOrSection(req.body?.fromSection);
        const toClass = normalizeClassOrSection(req.body?.toClass || req.body?.newClass);
        const toSection = normalizeClassOrSection(req.body?.toSection || req.body?.newSection);
        if (!fromClass || !fromSection || !toClass || !toSection) {
          return res.status(400).json({ error: "fromClass, fromSection, toClass, and toSection are required for migrateAll" });
        }

        const allSourceStudents = await studentsCol.find(withActiveStudents({
          schoolId,
          class: fromClass,
          section: fromSection,
        })).toArray();

        records = allSourceStudents.map((s) => ({
          studentId: String(s._id),
          newClass: toClass,
          newSection: toSection,
          fromClass,
          fromSection,
        }));
      } else {
        return res.status(400).json({ error: "Invalid payload. Send an array or { records: [] }" });
      }

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "No migration records provided" });
      }

      let successCount = 0;
      const failed = [];

      for (let index = 0; index < records.length; index++) {
        const row = records[index] || {};
        const identifier = row.studentId || row.email || row.rollNo || `row-${index + 1}`;
        const toClass = row.newClass || row.toClass;
        const toSection = row.newSection || row.toSection;

        try {
          const resolved = await resolveStudentForMigration(studentsCol, schoolId, row);
          if (!resolved.ok) {
            failed.push({ student: identifier, reason: resolved.reason });
            continue;
          }

          const migration = await migrateSingleStudentRecord({
            studentsCol,
            schoolId,
            student: resolved.student,
            toClass,
            toSection,
            adminObjectId,
            migratedByEmail,
          });

          if (!migration.ok) {
            failed.push({
              student: resolved.student.email || resolved.student.rollNo || String(resolved.student._id),
              reason: migration.reason,
            });
            continue;
          }

          successCount += 1;
        } catch (rowErr) {
          console.error("❌ BULK MIGRATION ROW ERROR:", rowErr);
          failed.push({ student: identifier, reason: rowErr.message || "Unexpected migration error" });
        }
      }

      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId: adminObjectId,
        action: "BULK_MIGRATE_STUDENTS",
        targetType: "STUDENT",
        timestamp: new Date(),
        details: {
          requestedCount: records.length,
          successCount,
          failedCount: failed.length,
        },
      });

      console.log("✅ BULK STUDENT MIGRATION SUMMARY:", { requested: records.length, successCount, failedCount: failed.length });
      return res.json({ successCount, failed });
    } catch (err) {
      console.error("❌ BULK STUDENT MIGRATION ERROR:", err);
      return res.status(500).json({ error: "Failed to bulk migrate students" });
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
      const adminObjectId = safeObjectId(req.user.userId);
      const adminUser = await db.collection("users").findOne({ _id: adminObjectId });
      const migratedByEmail = adminUser?.email || "";

      if (!fromClass || !fromSection || !toClass || !toSection) {
        return res.status(400).json({ error: "Missing required fields: fromClass, fromSection, toClass, toSection" });
      }

      // Build filter for students to migrate
      const filter = {
        schoolId,
        class: String(fromClass),
        section: String(fromSection),
        isDeleted: { $ne: true },
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
            currentClass: String(toClass),
            currentSection: String(toSection),
            migratedAt: new Date(),
          },
          $push: {
            migrationHistory: {
              fromClass: String(fromClass),
              fromSection: String(fromSection),
              toClass: String(toClass),
              toSection: String(toSection),
              migratedAt: new Date(),
              migratedBy: adminObjectId,
              migratedByEmail,
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

      // 🔍 DEBUG LOGGING
      console.log("📋 REASSIGN REQUEST DEBUG:");
      console.log("  - Params ID:", req.params.id);
      console.log("  - TeacherId (after safeObjectId):", teacherId);
      console.log("  - SchoolId:", schoolId);
      console.log("  - Raw Body:", req.body);
      console.log("  - Parsed values - toClass:", toClass, "(type:", typeof toClass, ", length:", String(toClass || "").length, ")");
      console.log("  - Parsed values - toSection:", toSection, "(type:", typeof toSection, ", length:", String(toSection || "").length, ")");
      console.log("  - req.user:", { userId: req.user.userId, schoolId: req.user.schoolId });

      if (!teacherId || !schoolId) {
        console.error("❌ VALIDATION FAILED: teacherId or schoolId missing");
        console.error("   teacherId:", teacherId, "schoolId:", schoolId);
        return res.status(400).json({ 
          error: "Invalid teacher ID or school ID",
          details: "Could not parse teacher ID or school context"
        });
      }

      if (!toClass || !toSection) {
        console.error("❌ VALIDATION FAILED: Missing toClass or toSection");
        console.error("   toClass:", toClass, "(type:", typeof toClass, ")");
        console.error("   toSection:", toSection, "(type:", typeof toSection, ")");
        return res.status(400).json({ 
          error: "Missing required fields",
          details: `Target class and section are required. Received: class='${toClass}', section='${toSection}'`
        });
      }

      // Ensure values are strings and trim
      const cleanToClass = String(toClass).trim();
      const cleanToSection = String(toSection).trim();

      if (!cleanToClass || !cleanToSection) {
        console.error("❌ VALIDATION FAILED: toClass or toSection are empty after trimming");
        console.error("   cleanToClass:", cleanToClass);
        console.error("   cleanToSection:", cleanToSection);
        return res.status(400).json({ 
          error: "Invalid class or section",
          details: `Class and section cannot be empty. After trimming: class='${cleanToClass}', section='${cleanToSection}'`
        });
      }

      // ✅ TENANT CHECK: Verify teacher belongs to this school
      const teacher = await db.collection("teachers").findOne({
        _id: teacherId,
        schoolId,
      });

      if (!teacher) {
        console.error("❌ TEACHER NOT FOUND: ", { teacherId, schoolId });
        return res.status(404).json({ 
          error: "Teacher not found",
          details: `Teacher with ID ${teacherId} not found in this school`
        });
      }
      
      console.log("✅ Teacher found:", { name: teacher.name, id: teacherId });

      const oldClass = teacher.class;
      const oldSection = teacher.section;

      // ✅ Prevent duplicate assignment
      if (oldClass === cleanToClass && oldSection === cleanToSection) {
        return res.status(400).json({
          error: "Teacher is already assigned to this class/section",
        });
      }

      // Update teacher
      const result = await db.collection("teachers").findOneAndUpdate(
        { _id: teacherId, schoolId },
        {
          $set: {
            class: cleanToClass,
            section: cleanToSection,
            reassignedAt: new Date(),
          },
          $push: {
            assignmentHistory: {
              fromClass: oldClass,
              fromSection: oldSection,
              toClass: cleanToClass,
              toSection: cleanToSection,
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
          to: `${cleanToClass}-${cleanToSection}`,
        },
      });

      console.log("✅ TEACHER REASSIGNED:", teacher.name, "From:", oldClass, oldSection, "To:", cleanToClass, cleanToSection);
      res.json({
        success: true,
        message: `Teacher ${teacher.name} reassigned`,
        teacher: result.value,
      });
    } catch (err) {
      console.error("❌ TEACHER REASSIGNMENT ERROR:", err);
      res.status(500).json({ 
        error: "Failed to reassign teacher",
        details: err.message
      });
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
   DEV: Comprehensive Data Seed (dev-only)
   ================================= */

/**
 * POST /dev/seed/realistic
 * 
 * Creates realistic test data (DEVELOPMENT ONLY):
 * - 2 schools
 * - 10 teachers per school
 * - 600 students per school
 * - 1 admin per school
 * 
 * Usage: POST http://localhost:5000/dev/seed/realistic
 * With optional header: x-dev-key: <DEV_SEED_KEY>
 */
app.post("/dev/seed/realistic", async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }

    // Optional dev key check
    const providedKey = req.query.key || req.headers["x-dev-key"];
    if (process.env.DEV_SEED_KEY && providedKey !== process.env.DEV_SEED_KEY) {
      return res.status(403).json({ error: "Forbidden - invalid dev key" });
    }

    console.log("\n🌱 Starting realistic data seed...\n");

    const schoolsCol = db.collection("schools");
    const usersCol = db.collection("users");
    const teachersCol = db.collection("teachers");
    const studentsCol = db.collection("students");

    // ============================================
    // REALISTIC NAMES DATA
    // ============================================

    const firstNamesMale = [
      "Rajesh", "Amit", "Vikram", "Arun", "Suresh", "Deepak", "Rohan", "Arjun",
      "Nikhil", "Sanjay", "Manoj", "Ashok", "Prakash", "Harsha", "Anand",
      "Karan", "Vivek", "Sandeep", "Varun", "Aditya", "Rahul", "Akshay",
    ];

    const firstNamesFemale = [
      "Priya", "Neha", "Anjali", "Pooja", "Kavya", "Deepika", "Shruti",
      "Shweta", "Sneha", "Nidhi", "Isha", "Aisha", "Ananya", "Bhavna",
      "Charvi", "Divya", "Esha", "Gitika", "Harshita", "Isha",
    ];

    const lastNames = [
      "Kumar", "Singh", "Patel", "Sharma", "Gupta", "Mishra", "Rao", "Verma",
      "Nair", "Iyer", "Menon", "Desai", "Joshi", "Bhatt", "Malhotra", "Saxena",
      "Tripathi", "Agarwal", "Reddy", "Bhat", "Srivastava", "Pandey",
    ];

    const subjects = [
      "Mathematics", "English", "Science", "Hindi", "Social Studies", "Physics",
      "Chemistry", "Biology", "History", "Geography", "Computer Science",
    ];

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    const getRandomName = () => {
      const isMale = Math.random() > 0.5;
      const firstName = isMale 
        ? getRandomElement(firstNamesMale)
        : getRandomElement(firstNamesFemale);
      const lastName = getRandomElement(lastNames);
      return { firstName, lastName, fullName: `${firstName} ${lastName}` };
    };

    const generateEmail = (firstName, lastName, domain) => {
      const cleanFirst = firstName.toLowerCase().replace(/\s+/g, "");
      const cleanLast = lastName.toLowerCase().replace(/\s+/g, "");
      const random = Math.floor(Math.random() * 100);
      return `${cleanFirst}.${cleanLast}${random}@${domain}`.toLowerCase();
    };

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

      const result = await schoolsCol.insertOne(schoolDoc);
      schools.push({ _id: result.insertedId, name: schoolName });
      schoolsCreated++;
      console.log(`✅ School created: ${schoolName}`);
    }

    // ============================================
    // CREATE ADMINS (1 PER SCHOOL)
    // ============================================

    for (let idx = 0; idx < schools.length; idx++) {
      const school = schools[idx];
      const adminEmail = `admin${idx + 1}@${school.name.toLowerCase().replace(/\s+/g, "")}.edu.in`;
      const adminPassword = "Password@123";
      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

      // Check if admin already exists
      const existing = await usersCol.findOne({ email: adminEmail });
      if (!existing) {
        await usersCol.insertOne({
          email: adminEmail,
          passwordHash: adminPasswordHash,
          role: "ADMIN",
          schoolId: school._id,
          createdAt: new Date(),
        });
        adminsCreated++;
      }
      console.log(`  👤 Admin: ${adminEmail}`);
    }

    // ============================================
    // CREATE TEACHERS (10 PER SCHOOL)
    // ============================================

    const teachersPerSchool = 10;
    const teachersBySchool = {};

    for (let schoolIdx = 0; schoolIdx < schools.length; schoolIdx++) {
      const school = schools[schoolIdx];
      const sections = ["A", "B", "C", "D"];
      teachersBySchool[schoolIdx] = [];

      for (let t = 0; t < teachersPerSchool; t++) {
        const teacherName = getRandomName();
        const teacherEmail = generateEmail(
          teacherName.firstName,
          teacherName.lastName,
          `${school.name.toLowerCase().replace(/\s+/g, "")}.edu.in`
        );

        // Check if email already exists
        const existing = await usersCol.findOne({ email: teacherEmail });
        if (existing) continue;

        const teacherPassword = "Password@123";
        const teacherPasswordHash = await bcrypt.hash(teacherPassword, 10);

        const userResult = await usersCol.insertOne({
          email: teacherEmail,
          passwordHash: teacherPasswordHash,
          role: "TEACHER",
          schoolId: school._id,
          createdAt: new Date(),
        });

        const classNum = String((t % 3) + 1);
        const section = sections[t % sections.length];
        const subject = getRandomElement(subjects);

        await teachersCol.insertOne({
          userId: userResult.insertedId,
          name: teacherName.fullName,
          email: teacherEmail,
          subject: subject,
          class: classNum,
          section: section,
          schoolId: school._id,
          createdAt: new Date(),
        });

        teachersCreated++;
        teachersBySchool[schoolIdx].push({
          class: classNum,
          section: section,
        });
      }

      console.log(`  ✅ ${teachersPerSchool} teachers created for ${school.name}`);
    }

    // ============================================
    // CREATE STUDENTS (600 PER SCHOOL)
    // ============================================

    const studentsPerSchool = 600;
    const studentsPerTeacher = Math.ceil(studentsPerSchool / teachersPerSchool);

    for (let schoolIdx = 0; schoolIdx < schools.length; schoolIdx++) {
      const school = schools[schoolIdx];
      const teachers = teachersBySchool[schoolIdx];
      let batch = [];

      for (let s = 0; s < studentsPerSchool; s++) {
        const studentName = getRandomName();
        const studentEmail = generateEmail(
          studentName.firstName,
          studentName.lastName,
          "gmail.com"
        );

        // Check if email exists
        const existing = await usersCol.findOne({ email: studentEmail });
        if (existing) continue;

        const studentPassword = "Password@123";
        const studentPasswordHash = await bcrypt.hash(studentPassword, 10);

        const userResult = await usersCol.insertOne({
          email: studentEmail,
          passwordHash: studentPasswordHash,
          role: "STUDENT",
          createdAt: new Date(),
        });

        // Distribute students across teachers
        const teacherIdx = Math.floor(s / studentsPerTeacher) % teachers.length;
        const teacher = teachers[teacherIdx];
        const rollNo = String((s % studentsPerTeacher) + 1);

        batch.push({
          userId: userResult.insertedId,
          name: studentName.fullName,
          email: studentEmail,
          class: teacher.class,
          section: teacher.section,
          rollNo: rollNo,
          parentName: `Mr. ${studentName.lastName}`,
          phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          schoolId: school._id,
          createdAt: new Date(),
        });

        // Batch insert every 50
        if (batch.length >= 50) {
          await studentsCol.insertMany(batch);
          studentsCreated += batch.length;
          batch = [];
        }

        // Log progress
        if ((s + 1) % 100 === 0) {
          console.log(`  📚 ${s + 1}/${studentsPerSchool} students for ${school.name}...`);
        }
      }

      // Insert remaining
      if (batch.length > 0) {
        await studentsCol.insertMany(batch);
        studentsCreated += batch.length;
      }

      console.log(`  ✅ ~${studentsPerSchool} students created for ${school.name}`);
    }

    // ============================================
    // RESPONSE
    // ============================================

    console.log("\n" + "=".repeat(60));
    console.log("✅ SEEDING COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Schools created: ${schoolsCreated}`);
    console.log(`   Admins created: ${adminsCreated}`);
    console.log(`   Teachers created: ${teachersCreated}`);
    console.log(`   Students created: ~${studentsCreated}`);
    console.log("=".repeat(60));
    console.log(`\n🔑 Test Credentials:`);
    console.log(`   Admin 1: admin1@delhipublicacademy.edu.in / Password@123`);
    console.log(`   Admin 2: admin2@mumbaiinternationalschool.edu.in / Password@123`);
    console.log(`   Teachers: firstname.lastname### @schoolname.edu.in / Password@123`);
    console.log(`   Students: firstname.lastname### @gmail.com / Password@123`);
    console.log("\n");

    return res.json({
      success: true,
      message: "Realistic data seeding completed",
      summary: {
        schools: schoolsCreated,
        admins: adminsCreated,
        teachers: teachersCreated,
        students: studentsCreated,
      },
      testCredentials: {
        admin1: "admin1@delhipublicacademy.edu.in / Password@123",
        admin2: "admin2@mumbaiinternationalschool.edu.in / Password@123",
        teachers: "firstname.lastname### @schoolname.edu.in / Password@123",
        students: "firstname.lastname### @gmail.com / Password@123",
      },
    });
  } catch (err) {
    console.error("❌ SEED ERROR:", err);
    return res.status(500).json({ error: "Seeding failed", details: err.message });
  }
});

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

      const result = await db.collection("homework").insertOne(homework);
      const homeworkId = result.insertedId;

      // ✅ CREATE NOTIFICATIONS FOR ALL STUDENTS IN THIS CLASS/SECTION
      const students = await db.collection("students").find({
        schoolId: req.user.schoolIdObj,
        class: teacher.class,
        section: teacher.section,
      }).toArray();

      if (students.length > 0) {
        const notifications = students.map((student) => ({
          title: `New Homework: ${title}`,
          message: `Your teacher assigned new homework in ${subject}`,
          type: "homework",
          targetRole: "STUDENT",
          targetUser: student.userId,
          schoolId: req.user.schoolIdObj,
          referenceId: homeworkId,
          targetRoute: `/student/dashboard?section=homework&id=${homeworkId.toString()}`,
          metadata: {
            homeworkId: homeworkId.toString(),
            subject,
            dueDate,
          },
          isRead: false,
          createdAt: new Date(),
        }));

        await db.collection("notifications").insertMany(notifications);
        console.log("✅ HOMEWORK NOTIFICATIONS CREATED:", notifications.length, "for homework:", homeworkId);
      }

      res.json({ success: true, homeworkId: homeworkId });
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

      // ✅ CREATE NOTIFICATIONS FOR ALL STUDENTS IN THIS CLASS/SECTION
      if (!isHoliday) {
        const students = await db.collection("students").find({
          schoolId: schoolId,
          class: cls || (teacher ? teacher.class : null),
          section: section || (teacher ? teacher.section : null),
        }).toArray();

        if (students.length > 0) {
          const notifications = students.map((student) => ({
            title: `New Event: ${eventName}`,
            message: `A new event has been scheduled: ${eventName}`,
            type: "event",
            targetRole: "STUDENT",
            targetUser: student.userId,
            schoolId: schoolId,
            referenceId: result.insertedId,
            targetRoute: `/student/dashboard?section=events&id=${result.insertedId.toString()}`,
            metadata: {
              eventId: result.insertedId.toString(),
              eventDate,
              eventName,
            },
            isRead: false,
            createdAt: new Date(),
          }));

          await db.collection("notifications").insertMany(notifications);
          console.log("✅ EVENT NOTIFICATIONS CREATED:", notifications.length, "for event:", result.insertedId);
        }
      }

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

/* List All Schools with Stats */
app.get("/api/dev/schools", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "DEVELOPER") {
      return res.status(403).json({ error: "Developer access required" });
    }

    const schools = await db.collection("schools").find({}).sort({ createdAt: -1 }).toArray();
    const result = await Promise.all(schools.map(async (s) => {
      const schoolId = safeObjectId(s._id);
      const studentCount = await db.collection("users").countDocuments({ schoolId, role: "STUDENT" });
      const teacherCount = await db.collection("users").countDocuments({ schoolId, role: "TEACHER" });
      const adminCount = await db.collection("users").countDocuments({ schoolId, role: "ADMIN" });
      
      return {
        _id: s._id.toString(),
        name: s.name,
        code: s.code || "N/A",
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalAdmins: adminCount,
        createdAt: s.createdAt,
      };
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ DEV LIST SCHOOLS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});

/* Get School Details */
app.get("/api/dev/schools/:schoolId/details", requireAuth, requireRole("DEVELOPER"), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const schoolObjId = safeObjectId(schoolId);
    
    if (!schoolObjId) {
      return res.status(400).json({ error: "Invalid school ID" });
    }

    const school = await db.collection("schools").findOne({ _id: schoolObjId });
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    // Count users by role
    const admins = await db.collection("users").find({ schoolId: schoolObjId, role: "ADMIN" }).toArray();
    const teachers = await db.collection("users").find({ schoolId: schoolObjId, role: "TEACHER" }).toArray();
    const students = await db.collection("users").find({ schoolId: schoolObjId, role: "STUDENT" }).toArray();

    // Count data records
    const attendanceCount = await db.collection("attendance").countDocuments({ schoolId: schoolObjId });
    const homeworkCount = await db.collection("homework").countDocuments({ schoolId: schoolObjId });
    const announcementCount = await db.collection("announcements").countDocuments({ schoolId: schoolObjId });
    const marksCount = await db.collection("marks").countDocuments({ schoolId: schoolObjId });

    res.json({
      school: {
        _id: school._id.toString(),
        name: school.name,
        code: school.code,
        createdAt: school.createdAt,
      },
      stats: {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalAdmins: admins.length,
        totalAttendance: attendanceCount,
        totalHomework: homeworkCount,
        totalAnnouncements: announcementCount,
        totalMarks: marksCount,
      },
      admins: admins.map(u => ({
        _id: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
        createdAt: u.createdAt,
      })),
      teachers: teachers.map(u => ({
        _id: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
        class: u.class,
        section: u.section,
        subject: u.subject,
        createdAt: u.createdAt,
      })),
      students: students.map(u => ({
        _id: u._id.toString(),
        name: u.name || u.email,
        email: u.email,
        class: u.class,
        section: u.section,
        rollNo: u.rollNo,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error("❌ DEV SCHOOL DETAILS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch school details" });
  }
});

/* Delete User by ID */
app.delete("/api/dev/users/:userId", requireAuth, requireRole("DEVELOPER"), async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjId = safeObjectId(userId);
    
    if (!userObjId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await db.collection("users").findOne({ _id: userObjId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await db.collection("users").deleteOne({ _id: userObjId });
    
    if (result.deletedCount > 0) {
      console.log(`✅ User deleted: ${user.email} (${user.role})`);
      return res.json({ success: true, message: `User ${user.email} deleted` });
    } else {
      return res.status(404).json({ error: "Failed to delete user" });
    }
  } catch (err) {
    console.error("❌ DELETE USER ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* Delete Entire School - Cascading Delete */
app.delete("/api/dev/schools/:schoolId", requireAuth, requireRole("DEVELOPER"), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const schoolObjId = safeObjectId(schoolId);
    
    if (!schoolObjId) {
      return res.status(400).json({ error: "Invalid school ID" });
    }

    const school = await db.collection("schools").findOne({ _id: schoolObjId });
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    // Delete all related data for this school
    await db.collection("users").deleteMany({ schoolId: schoolObjId });
    await db.collection("attendance").deleteMany({ schoolId: schoolObjId });
    await db.collection("homework").deleteMany({ schoolId: schoolObjId });
    await db.collection("announcements").deleteMany({ schoolId: schoolObjId });
    await db.collection("marks").deleteMany({ schoolId: schoolObjId });
    await db.collection("timetables").deleteMany({ schoolId: schoolObjId });
    await db.collection("events").deleteMany({ schoolId: schoolObjId });
    await db.collection("subjects").deleteMany({ schoolId: schoolObjId });
    await db.collection("notifications").deleteMany({ schoolId: schoolObjId });
    await db.collection("admissions").deleteMany({ schoolId: schoolObjId });
    await db.collection("voiceMessages").deleteMany({ schoolId: schoolObjId });

    // Delete the school itself
    const deleteResult = await db.collection("schools").deleteOne({ _id: schoolObjId });

    if (deleteResult.deletedCount > 0) {
      console.log(`✅ School deleted: ${school.name} - All related data removed`);
      return res.json({ 
        success: true, 
        message: `School "${school.name}" and all related data deleted successfully` 
      });
    } else {
      return res.status(500).json({ error: "Failed to delete school" });
    }
  } catch (err) {
    console.error("❌ DELETE SCHOOL ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* Delete School Data by Type */
app.delete("/api/dev/schools/:schoolId/data", requireAuth, requireRole("DEVELOPER"), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { type } = req.query; // attendance, homework, announcements, marks, timetables, etc.
    
    const schoolObjId = safeObjectId(schoolId);
    if (!schoolObjId) {
      return res.status(400).json({ error: "Invalid school ID" });
    }

    if (!type) {
      return res.status(400).json({ error: "Data type required (attendance, homework, announcements, marks, timetables, events, subjects)" });
    }

    const collectionMap = {
      attendance: "attendance",
      homework: "homework",
      announcements: "announcements",
      marks: "marks",
      timetables: "timetables",
      events: "events",
      subjects: "subjects",
      voiceMessages: "voiceMessages",
    };

    const collection = collectionMap[type];
    if (!collection) {
      return res.status(400).json({ error: "Invalid data type" });
    }

    const result = await db.collection(collection).deleteMany({ schoolId: schoolObjId });
    console.log(`✅ Deleted ${result.deletedCount} ${type} records for school ${schoolId}`);

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} ${type} records`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("❌ DELETE DATA ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
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
      type: "VOICE",
      schoolId,
      senderRole: "ADMIN",
      senderId,
      targetRole: "TEACHER",
      targetUserIds,
      audioUrl,
      status: "SENT",
      deliveredCount: targetUserIds.length,
      failedCount: 0,
      createdAt: new Date(),
    };

    const result = await db.collection("voiceMessages").insertOne(voiceMessage);
    const voiceMessageId = result.insertedId;

    // ✅ CREATE NOTIFICATIONS FOR ALL TARGET TEACHERS
    const notifications = targetUserIds.map((teacherUserId) => ({
      userId: teacherUserId,
      role: "TEACHER",
      schoolId,
      title: "New Voice Message from Admin",
      message: "Admin sent a new voice message",
      type: "voice",
      targetRole: "TEACHER",
      targetUser: teacherUserId,
      referenceId: voiceMessageId,
      audioUrl: audioUrl,
      targetRoute: `/teacher/dashboard?section=announcements&id=${voiceMessageId.toString()}`,
      isRead: false,
      createdAt: new Date(),
    }));

    if (notifications.length > 0) {
      await db.collection("notifications").insertMany(notifications);
      console.log("✅ NOTIFICATIONS CREATED:", notifications.length, "for admin voice message");
    }

    console.log("✅ ADMIN VOICE BROADCAST - Recipients:", targetUserIds.length, "Audio URL:", audioUrl);
    res.json({
      success: true,
      messageId: voiceMessageId.toString(),
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
    const { broadcastToClass } = req.body;
    let { targetStudentIds } = req.body;
    const schoolId = req.user.schoolIdObj;
    const senderUserId = safeObjectId(req.user.userId);
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

    if (!senderUserId) {
      return res.status(400).json({ error: "Invalid teacher ID" });
    }

    const teacherDoc =
      (await db.collection("teachers").findOne({
        userId: senderUserId,
        schoolId,
      })) ||
      (await db.collection("teachers").findOne({
        userId: senderUserId,
      }));
    if (!teacherDoc?._id) {
      console.warn("⚠️ TEACHER PROFILE LOOKUP: Not found in teachers collection, using token userId as senderId fallback");
    }

    const senderId = teacherDoc?._id || senderUserId;
    console.log("🧾 TEACHER VOICE SENDER IDS:", {
      senderId: String(senderId),
      senderUserId: String(senderUserId),
      teacherDocFound: Boolean(teacherDoc?._id),
    });

    if (typeof targetStudentIds === "string") {
      try {
        const parsed = JSON.parse(targetStudentIds);
        if (Array.isArray(parsed)) {
          targetStudentIds = parsed;
        }
      } catch (e) {
        console.warn("⚠️ targetStudentIds JSON parse failed:", e.message);
      }
    }

    const teacherLookup = await db.collection("teachers").findOne({
      userId: senderUserId,
      schoolId,
    });
    if (!teacherLookup?._id) {
      console.warn("⚠️ TEACHER LOOKUP FOR CLASS/SECTION missing for schoolId, relying on token class/section");
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

    console.log("🔍 TEACHER VOICE TARGETS:", {
      broadcastToClass,
      requestedTargetCount: Array.isArray(targetStudentIds) ? targetStudentIds.length : 0,
      resolvedTargetCount: targetUserIds.length,
    });

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: "No target students selected" });
    }

    const voiceMessage = {
      type: "VOICE",
      schoolId,
      senderRole: "TEACHER",
      senderId,
      senderUserId,
      targetRole: "STUDENT",
      targetClass: className,
      targetSection: section,
      targetUserIds,
      audioUrl,
      status: "SENT",
      deliveredCount: targetUserIds.length,
      failedCount: 0,
      createdAt: new Date(),
    };

    const result = await db.collection("voiceMessages").insertOne(voiceMessage);
    const voiceMessageId = result.insertedId;

    // ✅ CREATE NOTIFICATIONS FOR ALL TARGET STUDENTS
    const notifications = targetUserIds.map((studentUserId) => ({
      userId: studentUserId,
      role: "STUDENT",
      schoolId,
      title: "New Voice Message",
      message: `Your teacher sent a new voice message for class ${className}-${section}`,
      type: "voice",
      targetRole: "STUDENT",
      targetUser: studentUserId,
      referenceId: voiceMessageId,
      audioUrl: audioUrl,
      targetRoute: `/student/dashboard?section=voice&id=${voiceMessageId.toString()}`,
      isRead: false,
      createdAt: new Date(),
    }));

    if (notifications.length > 0) {
      await db.collection("notifications").insertMany(notifications);
      console.log("✅ NOTIFICATIONS CREATED:", notifications.length, "for voice message");
    }

    console.log("✅ TEACHER VOICE BROADCAST - Recipients:", targetUserIds.length, "Class:", className, "Section:", section, "Audio URL:", audioUrl, "Type:", voiceMessage.type, "SenderRole:", voiceMessage.senderRole);
    res.json({
      success: true,
      messageId: voiceMessageId.toString(),
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

      // ✅ CREATE NOTIFICATIONS FOR ALL STUDENTS IN THIS CLASS/SECTION
      const students = await db.collection("students").find({
        schoolId,
        class: className,
        section,
      }).toArray();

      if (students.length > 0) {
        const notifications = students.map((student) => ({
          title: `Timetable Updated: ${subject}`,
          message: `New class schedule added - ${subject} on ${day}`,
          type: "timetable",
          targetRole: "STUDENT",
          targetUser: student.userId,
          schoolId,
          referenceId: insertResult.insertedId,
          targetRoute: `/student/dashboard?section=timetable`,
          metadata: {
            timetableId: insertResult.insertedId.toString(),
            day,
            period,
            subject,
            startTime,
            endTime,
          },
          isRead: false,
          createdAt: new Date(),
        }));

        await db.collection("notifications").insertMany(notifications);
        console.log("✅ TIMETABLE NOTIFICATIONS CREATED:", notifications.length, "for timetable:", insertResult.insertedId);
      }
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
      isDeleted: { $ne: true },
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

/* ====================================================================
   🎓 EXAM-LEVEL SYLLABUS MANAGEMENT (New System)
   Supports multiple subjects per exam
   ==================================================================== */

/**
 * TEACHER: POST /api/teacher/exam-syllabus
 * Create new exam with initial subjects only
 * Does NOT append to existing exams - use POST /subject for that
 */
app.post("/api/teacher/exam-syllabus", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { examName, subjects } = req.body;
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;
    const teacherId = safeObjectId(req.user.userId);

    console.log("📝 CREATING EXAM SYLLABUS - Teacher:", teacherId, "Class:", className, "Section:", section, "School:", schoolId);

    // Validate inputs
    if (!examName || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "Exam name and at least one subject are required" });
    }

    // Validate subjects
    for (const subj of subjects) {
      if (!subj.subjectName || !subj.syllabusText) {
        return res.status(400).json({ error: "Subject name and syllabus text are required for all subjects" });
      }
    }

    // Check if exam already exists for this class/section
    const existingExam = await db.collection("examSyllabus").findOne({
      schoolId,
      class: className,
      section,
      examName: examName.trim(),
    });

    if (existingExam) {
      return res.status(400).json({ error: "Exam with this name already exists. Use the add subject endpoint to add more subjects." });
    }

    // Create new exam with subjects that have _id
    const newExam = {
      schoolId,
      class: className,
      section,
      examName: examName.trim(),
      subjects: subjects.map((s) => ({
        _id: new ObjectId(),
        subjectName: s.subjectName.trim(),
        syllabusText: s.syllabusText.trim(),
      })),
      createdBy: teacherId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("📝 EXAM OBJECT:", JSON.stringify({
      schoolId: newExam.schoolId,
      class: newExam.class,
      section: newExam.section,
      examName: newExam.examName,
      subjects: newExam.subjects.length,
    }));

    const insertResult = await db.collection("examSyllabus").insertOne(newExam);
    let isNew = true;

    console.log("✅ EXAM CREATED - ID:", insertResult.insertedId, "Name:", examName);

    // ✅ CREATE NOTIFICATIONS FOR ALL STUDENTS IN THIS CLASS/SECTION
    const students = await db.collection("students")
      .find({
        schoolId,
        class: className,
        section,
      })
      .toArray();

    console.log("📬 Found students for notification:", students.length, "in class:", className, "section:", section);

    if (students.length > 0) {
      const subjectList = newExam.subjects.map((s) => s.subjectName).join(", ");
      const notifications = students.map((student) => ({
        title: `📖 ${examName} Syllabus Available`,
        message: `Syllabus for ${examName} (${subjectList}) has been shared`,
        type: "syllabus",
        targetRole: "STUDENT",
        targetUser: student.userId,
        schoolId,
        referenceId: insertResult.insertedId,
        targetRoute: `/student/dashboard?section=exam-syllabus&examId=${insertResult.insertedId.toString()}`,
        metadata: {
          examId: insertResult.insertedId.toString(),
          examName,
          subjects: subjectList,
        },
        isRead: false,
        createdAt: new Date(),
      }));

      await db.collection("notifications").insertMany(notifications);
      console.log("✅ EXAM SYLLABUS NOTIFICATIONS CREATED:", notifications.length, "for exam:", examName);
    }

    console.log("✅ EXAM SYLLABUS CREATED - ID:", insertResult.insertedId, "Exam:", examName, "Subjects:", subjects.length, "Students notified:", students.length);

    res.json({
      success: true,
      examId: insertResult.insertedId.toString(),
      isNew: true,
      message: "Exam syllabus created successfully!",
    });
  } catch (err) {
    console.error("❌ EXAM SYLLABUS CREATE/UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to create or update exam syllabus" });
  }
});

/**
 * TEACHER: GET /api/teacher/exam-syllabus
 * Get all exam syllabuses for teacher's class/section
 */
app.get("/api/teacher/exam-syllabus", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    const exams = await db.collection("examSyllabus")
      .find({
        schoolId,
        class: className,
        section: section,
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("✅ TEACHER EXAM SYLLABUSES - Count:", exams.length);
    res.json(exams.map((e) => ({ ...e, _id: e._id.toString() })));
  } catch (err) {
    console.error("❌ TEACHER EXAM SYLLABUSES FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch exam syllabuses" });
  }
});

/**
 * TEACHER: PUT /api/teacher/exam-syllabus/:id
 * Update exam name only - does NOT touch subjects
 */
app.put("/api/teacher/exam-syllabus/:id", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const examId = safeObjectId(req.params.id);
    const { examName } = req.body;
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    if (!examId) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }

    if (!examName || !examName.trim()) {
      return res.status(400).json({ error: "Exam name is required" });
    }

    const result = await db.collection("examSyllabus").updateOne(
      {
        _id: examId,
        schoolId,
        class: className,
        section: section,
      },
      { $set: { examName: examName.trim(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Exam syllabus not found" });
    }

    console.log("✅ EXAM NAME UPDATED - ID:", examId);
    res.json({ success: true, message: "Exam name updated successfully" });
  } catch (err) {
    console.error("❌ EXAM UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update exam" });
  }
});

/**
 * TEACHER: POST /api/teacher/exam-syllabus/:examId/subject
 * Add a new subject to an existing exam (APPEND, not replace)
 */
app.post("/api/teacher/exam-syllabus/:examId/subject", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const examId = safeObjectId(req.params.examId);
    const { subjectName, syllabusText } = req.body;
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    if (!examId) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }

    if (!subjectName || !syllabusText) {
      return res.status(400).json({ error: "Subject name and syllabus text are required" });
    }

    // Check if subject already exists in this exam
    const existingExam = await db.collection("examSyllabus").findOne({
      _id: examId,
      schoolId,
      class: className,
      section,
    });

    if (!existingExam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Check if subject name already exists
    if (existingExam.subjects?.some((s) => s.subjectName.toLowerCase() === subjectName.toLowerCase())) {
      return res.status(400).json({ error: "Subject with this name already exists in this exam" });
    }

    // APPEND new subject using $push (does NOT replace array)
    const result = await db.collection("examSyllabus").updateOne(
      {
        _id: examId,
        schoolId,
        class: className,
        section,
      },
      {
        $push: {
          subjects: {
            _id: new ObjectId(),
            subjectName: subjectName.trim(),
            syllabusText: syllabusText.trim(),
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Exam not found" });
    }

    console.log("✅ SUBJECT ADDED TO EXAM - Exam ID:", examId, "Subject:", subjectName);
    res.json({ success: true, message: "Subject added successfully!" });
  } catch (err) {
    console.error("❌ ADD SUBJECT ERROR:", err);
    res.status(500).json({ error: "Failed to add subject" });
  }
});

/**
 * TEACHER: PUT /api/teacher/exam-syllabus/:examId/subject/:subjectId
 * Update a specific subject's name and/or syllabus text
 */
app.put("/api/teacher/exam-syllabus/:examId/subject/:subjectId", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const examId = safeObjectId(req.params.examId);
    const subjectId = safeObjectId(req.params.subjectId);
    const { subjectName, syllabusText } = req.body;
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    if (!examId || !subjectId) {
      return res.status(400).json({ error: "Invalid exam ID or subject ID" });
    }

    if (!subjectName && !syllabusText) {
      return res.status(400).json({ error: "At least subject name or syllabus text is required" });
    }

    // Prepare update for this specific subject in array
    const updateData = {};

    if (subjectName) {
      updateData["subjects.$.subjectName"] = subjectName.trim();
    }
    if (syllabusText) {
      updateData["subjects.$.syllabusText"] = syllabusText.trim();
    }

    const result = await db.collection("examSyllabus").updateOne(
      {
        _id: examId,
        schoolId,
        class: className,
        section,
        "subjects._id": subjectId,
      },
      {
        $set: { ...updateData, updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Exam or subject not found" });
    }

    console.log("✅ SUBJECT UPDATED - Exam ID:", examId, "Subject ID:", subjectId);
    res.json({ success: true, message: "Subject updated successfully!" });
  } catch (err) {
    console.error("❌ UPDATE SUBJECT ERROR:", err);
    res.status(500).json({ error: "Failed to update subject" });
  }
});

/**
 * TEACHER: DELETE /api/teacher/exam-syllabus/:examId/subject/:subjectId
 * Remove a specific subject by ID (does not delete other subjects)
 */
app.delete("/api/teacher/exam-syllabus/:examId/subject/:subjectId", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const examId = safeObjectId(req.params.examId);
    const subjectId = safeObjectId(req.params.subjectId);
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    if (!examId || !subjectId) {
      return res.status(400).json({ error: "Invalid exam ID or subject ID" });
    }

    const result = await db.collection("examSyllabus").updateOne(
      {
        _id: examId,
        schoolId,
        class: className,
        section,
      },
      {
        $pull: { subjects: { _id: subjectId } },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Exam not found" });
    }

    console.log("✅ SUBJECT DELETED - Exam ID:", examId, "Subject ID:", subjectId);
    res.json({ success: true, message: "Subject deleted successfully!" });
  } catch (err) {
    console.error("❌ DELETE SUBJECT ERROR:", err);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

/**
 * TEACHER: DELETE /api/teacher/exam-syllabus/:id
 * Delete entire exam syllabus
 */
app.delete("/api/teacher/exam-syllabus/:id", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const examId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    if (!examId) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }

    const result = await db.collection("examSyllabus").deleteOne({
      _id: examId,
      schoolId,
      class: className,
      section: section,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Exam syllabus not found" });
    }

    console.log("✅ EXAM SYLLABUS DELETED - ID:", examId);
    res.json({ success: true, message: "Exam syllabus deleted successfully" });
  } catch (err) {
    console.error("❌ EXAM SYLLABUS DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete exam syllabus" });
  }
});

/**
 * TEACHER: DELETE /api/teacher/exam-syllabus/:id/subject/:subjectName
 * Remove a specific subject from an exam
 */
app.delete(
  "/api/teacher/exam-syllabus/:id/subject/:subjectName",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const examId = safeObjectId(req.params.id);
      const subjectName = decodeURIComponent(req.params.subjectName);
      const schoolId = req.user.schoolIdObj;
      const className = req.user.class;
      const section = req.user.section;

      if (!examId) {
        return res.status(400).json({ error: "Invalid exam ID" });
      }

      const result = await db.collection("examSyllabus").updateOne(
        {
          _id: examId,
          schoolId,
          class: className,
          section: section,
        },
        {
          $pull: {
            subjects: { subjectName: subjectName },
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Exam syllabus not found" });
      }

      console.log("✅ SUBJECT REMOVED FROM EXAM - Exam ID:", examId, "Subject:", subjectName);
      res.json({ success: true, message: "Subject removed successfully" });
    } catch (err) {
      console.error("❌ SUBJECT REMOVE ERROR:", err);
      res.status(500).json({ error: "Failed to remove subject" });
    }
  }
);

/**
 * STUDENT: GET /api/student/exam-syllabus
 * Get all exam syllabuses for student's class/section
 */
app.get("/api/student/exam-syllabus", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    console.log("📚 STUDENT EXAM SYLLABUS - Fetching for userId:", userObjectId, "schoolId:", schoolObjectId);

    // ✅ FIRST: Find student with userId and schoolId to get their class/section
    const student = await db.collection("students").findOne({
      userId: userObjectId,
      schoolId: schoolObjectId,
      isDeleted: { $ne: true },
    });

    if (!student) {
      console.warn("⚠️ STUDENT EXAM SYLLABUS - Student not found");
      return res.status(404).json({ error: "Student profile not found" });
    }

    console.log("📚 STUDENT EXAM SYLLABUS - Found student class:", student.class, "section:", student.section);

    // ✅ NOW: Get exam syllabuses for this student's class and section
    const exams = await db
      .collection("examSyllabus")
      .find({
        schoolId: schoolObjectId,
        class: student.class,
        section: student.section,
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("✅ STUDENT EXAM SYLLABUSES - Count:", exams.length, "for class:", student.class, "section:", student.section);
    exams.forEach((exam) => {
      console.log(`   📖 ${exam.examName} (ID: ${exam._id}, Subjects: ${exam.subjects?.length || 0})`);
    });

    res.json(exams.map((e) => ({ ...e, _id: e._id.toString() })));
  } catch (err) {
    console.error("❌ STUDENT EXAM SYLLABUSES FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch exam syllabuses" });
  }
});

/* ================================
   EXAM TIMETABLE ROUTES
   ================================= */

/**
 * TEACHER: POST /api/teacher/exams
 * Create a new exam
 */
app.post("/api/teacher/exams", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { subject, examName, examDate, startTime, endTime } = req.body;
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    const className = req.user.class;
    const section = req.user.section;

    if (!subject || !examName || !examDate || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields: subject, examName, examDate, startTime, endTime" });
    }

    const exam = {
      schoolId,
      class: className,
      section: section,
      subject,
      examName,
      examDate: new Date(examDate),
      startTime,
      endTime,
      createdBy: teacherId,
      createdAt: new Date(),
    };

    const result = await db.collection("exams").insertOne(exam);

    console.log("✅ EXAM CREATED - ID:", result.insertedId, "Name:", examName, "Subject:", subject);
    res.json({
      success: true,
      examId: result.insertedId.toString(),
      exam: { ...exam, _id: result.insertedId.toString(), examDate: exam.examDate.toISOString() },
    });
  } catch (err) {
    console.error("❌ EXAM CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create exam" });
  }
});

/**
 * TEACHER: GET /api/teacher/exams
 * Get exams for teacher's class/section
 */
app.get("/api/teacher/exams", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    const exams = await db.collection("exams")
      .find({
        schoolId,
        class: className,
        section: section,
      })
      .sort({ examDate: 1 })
      .toArray();

    console.log("✅ TEACHER EXAMS - Count:", exams.length);
    res.json(exams.map(e => ({ ...e, _id: e._id.toString(), examDate: e.examDate.toISOString() })));
  } catch (err) {
    console.error("❌ TEACHER EXAMS FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

/**
 * TEACHER: DELETE /api/teacher/exams/:id
 * Delete an exam
 */
app.delete("/api/teacher/exams/:id", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const examId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;

    if (!examId) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }

    const result = await db.collection("exams").deleteOne({
      _id: examId,
      schoolId,
      class: req.user.class,
      section: req.user.section,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Exam not found" });
    }

    console.log("✅ EXAM DELETED - ID:", examId);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ EXAM DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete exam" });
  }
});

/**
 * STUDENT: GET /api/student/exams
 * Get exams for student's class/section
 */
app.get("/api/student/exams", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get student's class and section
    const student = await db.collection("students").findOne({ userId, schoolId, isDeleted: { $ne: true } });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const exams = await db.collection("exams")
      .find({
        schoolId,
        class: student.class,
        section: student.section,
      })
      .sort({ examDate: 1 })
      .toArray();

    console.log("✅ STUDENT EXAMS - Count:", exams.length, "Class:", student.class, "Section:", student.section);
    res.json(exams.map(e => ({ ...e, _id: e._id.toString(), examDate: e.examDate.toISOString() })));
  } catch (err) {
    console.error("❌ STUDENT EXAMS FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

/* ================================
   SIMPLIFIED VOICE ANNOUNCE API (for all teachers and students)
   ================================= */

/**
 * ADMIN: POST /api/admin/voice-announce
 * Broadcast voice to teachers and/or students of the school
 * 
 * Body:
 * - audio: audio file (multipart)
 * - title: optional announcement title
 * - broadcastTo: "all" (default), "teachers", or "students"
 */
app.post("/api/admin/voice-announce", requireAuth, requireRole("ADMIN"), requireTenantId, voiceUpload.single("audio"), async (req, res) => {
  try {
    const { title, broadcastTo = "all" } = req.body;
    const schoolId = req.user.schoolIdObj;
    const senderId = safeObjectId(req.user.userId);

    console.log(`🎙️ VOICE ANNOUNCE: Starting upload, file info:`, req.file ? {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    } : "NO FILE");

    if (!req.file) {
      console.error("❌ VOICE ANNOUNCE: No file uploaded");
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    if (req.file.size === 0) {
      console.error("❌ VOICE ANNOUNCE: Uploaded file is empty");
      return res.status(400).json({ error: "Audio file is empty. Please record audio and try again." });
    }

    if (!senderId) {
      console.error("❌ VOICE ANNOUNCE: Invalid admin ID");
      return res.status(400).json({ error: "Invalid admin ID" });
    }

    // Validate broadcastTo parameter
    if (!["all", "teachers", "students"].includes(broadcastTo)) {
      return res.status(400).json({ error: "Invalid broadcastTo value. Must be 'all', 'teachers', or 'students'" });
    }

    // Use the filename that multer already saved with our custom storage
    const audioUrl = `/uploads/voice/${req.file.filename}`;
    const filePath = req.file.path;

    console.log(`✅ VOICE ANNOUNCE: File uploaded successfully`);
    console.log(`   📁 File path on disk: ${filePath}`);
    console.log(`   🌐 Public URL: ${audioUrl}`);
    console.log(`   📝 Title: ${title || "School Announcement"}`);
    console.log(`   👥 Broadcast to: ${broadcastTo}`);

    // Get all teachers and students for this school
    const [teachers, students] = await Promise.all([
      db.collection("teachers").find({ schoolId }).toArray(),
      db.collection("students").find({ schoolId }).toArray(),
    ]);

    // Extract user IDs
    const teacherUserIds = teachers.map((t) => t.userId);
    const studentUserIds = students.map((s) => s.userId);

    let broadcastToTeachers = 0;
    let broadcastToStudents = 0;

    // Create announcements for teachers if broadcastTo is "all" or "teachers"
    if ((broadcastTo === "all" || broadcastTo === "teachers") && teacherUserIds.length > 0) {
      const teacherAnnouncement = {
        type: "VOICE",
        schoolId,
        senderRole: "ADMIN",
        senderId,
        title: title || "School Announcement",
        audioUrl,
        targetRole: "TEACHER",
        targetUserIds: teacherUserIds,
        status: "SENT",
        deliveredCount: teacherUserIds.length,
        failedCount: 0,
        createdAt: new Date(),
      };
      await db.collection("voice_messages").insertOne(teacherAnnouncement);
      broadcastToTeachers = teacherUserIds.length;
      console.log(`✅ Voice announcement sent to ${broadcastToTeachers} teachers`);
    }

    // Create announcements for students if broadcastTo is "all" or "students"
    if ((broadcastTo === "all" || broadcastTo === "students") && studentUserIds.length > 0) {
      const studentAnnouncement = {
        type: "VOICE",
        schoolId,
        senderRole: "ADMIN",
        senderId,
        title: title || "School Announcement",
        audioUrl,
        targetRole: "STUDENT",
        targetUserIds: studentUserIds,
        status: "SENT",
        deliveredCount: studentUserIds.length,
        failedCount: 0,
        createdAt: new Date(),
      };
      await db.collection("voice_messages").insertOne(studentAnnouncement);
      broadcastToStudents = studentUserIds.length;
      console.log(`✅ Voice announcement sent to ${broadcastToStudents} students`);
    }

    res.json({
      success: true,
      title: title || "School Announcement",
      audioUrl,
      broadcastToTeachers,
      broadcastToStudents,
      totalRecipients: broadcastToTeachers + broadcastToStudents,
    });
  } catch (err) {
    console.error("❌ VOICE ANNOUNCE ERROR:", err);
    res.status(500).json({ error: "Failed to broadcast voice announcement" });
  }
});

/**
 * ADMIN: GET /api/admin/voice-announces
 * Get all voice announcements sent by this admin
 */
app.get("/api/admin/voice-announces", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    console.log(`🔍 GET /api/admin/voice-announces - Admin ID: ${req.user.userId}`);
    
    const schoolId = req.user.schoolIdObj;
    const senderId = safeObjectId(req.user.userId);

    if (!senderId) {
      console.error("❌ Invalid admin ID");
      return res.status(400).json({ error: "Invalid admin ID" });
    }

    console.log(`🔍 Fetching announcements for schoolId: ${schoolId}, senderId: ${senderId}`);

    // Get all unique announcements (we store them twice - once for teachers, once for students)
    // So we need to deduplicate by audioUrl
    const announcements = await db.collection("voice_messages")
      .find({
        schoolId,
        senderId,
        senderRole: "ADMIN",
        targetRole: "TEACHER", // Only get the teacher version to avoid duplicates
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Format for frontend
    const formatted = announcements.map((a) => ({
      _id: a._id.toString(),
      title: a.title || "School Announcement",
      audioUrl: a.audioUrl,
      createdAt: a.createdAt,
      createdAtFormatted: new Date(a.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    console.log(`✅ ADMIN VOICE ANNOUNCES: ${formatted.length} announcements found`);
    formatted.forEach((a, idx) => {
      console.log(`   [${idx + 1}] "${a.title}" - audioUrl: ${a.audioUrl}`);
    });
    res.json(formatted);
  } catch (err) {
    console.error("❌ GET VOICE ANNOUNCES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

/**
 * ADMIN: POST /api/admin/announcements
 * Create a text announcement for all teachers and students
 */
app.post("/api/admin/announcements", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { title, message, recipientRole } = req.body;
    const schoolId = req.user.schoolIdObj;
    const senderId = safeObjectId(req.user.userId);

    if (!title || !message || !recipientRole) {
      return res.status(400).json({ error: "title, message, and recipientRole are required" });
    }

    // Create announcement document
    const announcement = {
      type: "ANNOUNCEMENT",
      schoolId,
      senderId,
      senderRole: "ADMIN",
      title,
      message,
      recipientRole, // 'TEACHER', 'STUDENT', or 'ALL'
      createdAt: new Date(),
    };

    const result = await db.collection("announcements").insertOne(announcement);
    const announcementId = result.insertedId;

    // ✅ CREATE NOTIFICATIONS FOR ALL TEACHERS OR STUDENTS
    let targetRole = [];
    let query = { schoolId };

    if (recipientRole === "TEACHER" || recipientRole === "ALL") {
      targetRole.push("TEACHER");
    }
    if (recipientRole === "STUDENT" || recipientRole === "ALL") {
      targetRole.push("STUDENT");
    }

    // Create notifications for each recipient role
    for (const role of targetRole) {
      let recipients = [];
      
      if (role === "TEACHER") {
        recipients = await db.collection("teachers").find(query).toArray();
      } else if (role === "STUDENT") {
        recipients = await db.collection("students").find(query).toArray();
      }

      if (recipients.length > 0) {
        const targetPath = role === "TEACHER" ? "/teacher/dashboard?section=announcements" : "/student/dashboard?section=announcements";
        const notifications = recipients.map((recipient) => ({
          title: `Announcement: ${title}`,
          message,
          type: "announcement",
          targetRole: role,
          targetUser: recipient.userId,
          schoolId,
          referenceId: announcementId,
          targetRoute: targetPath,
          metadata: {
            announcementId: announcementId.toString(),
            title,
          },
          isRead: false,
          createdAt: new Date(),
        }));

        await db.collection("notifications").insertMany(notifications);
        console.log("✅ ANNOUNCEMENT NOTIFICATIONS CREATED:", notifications.length, `for ${role}s`);
      }
    }

    console.log("✅ ANNOUNCEMENT CREATED - ID:", announcementId, "Title:", title, "Recipients:", recipientRole);
    res.json({
      success: true,
      announcementId: announcementId.toString(),
      announcement: { ...announcement, _id: announcementId.toString() },
    });
  } catch (err) {
    console.error("❌ ANNOUNCEMENT CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

/**
 * TEACHER: GET /api/teacher/voice-announces
 * Get all voice announcements for this teacher (from admin and personal)
 */
app.get("/api/teacher/voice-announces", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get announcements where this teacher is in the target list
    const announcements = await db.collection("voice_messages")
      .find({
        schoolId,
        targetRole: "TEACHER",
        targetUserIds: { $in: [userId] },
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with sender info
    const enriched = await Promise.all(
      announcements.map(async (a) => {
        let senderName = "School";
        if (a.senderId) {
          const user = await db.collection("users").findOne({ _id: a.senderId });
          senderName = user?.email?.split("@")[0] || "Admin";
        }
        return {
          _id: a._id.toString(),
          title: a.title || "School Announcement",
          audioUrl: a.audioUrl,
          senderName,
          createdAt: a.createdAt,
          createdAtFormatted: new Date(a.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      })
    );

    console.log(`✅ TEACHER VOICE ANNOUNCES: ${enriched.length} announcements found`);
    enriched.forEach((a, idx) => {
      console.log(`   [${idx + 1}] "${a.title}" - audioUrl: ${a.audioUrl}`);
    });
    res.json(enriched);
  } catch (err) {
    console.error("❌ TEACHER VOICE ANNOUNCES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

/**
 * STUDENT: GET /api/student/voice-announces
 * Get all voice announcements for this student (from admin and teacher)
 */
app.get("/api/student/voice-announces", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get announcements where this student is in the target list
    const announcements = await db.collection("voice_messages")
      .find({
        schoolId,
        targetRole: "STUDENT",
        targetUserIds: { $in: [userId] },
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with sender info
    const enriched = await Promise.all(
      announcements.map(async (a) => {
        let senderName = "School";
        let senderType = "Admin";

        if (a.senderId) {
          if (a.senderRole === "TEACHER") {
            const teacher = await db.collection("teachers").findOne({ userId: a.senderId });
            senderName = teacher?.name || "Teacher";
            senderType = "Teacher";
          } else {
            const user = await db.collection("users").findOne({ _id: a.senderId });
            senderName = user?.email?.split("@")[0] || "Admin";
            senderType = "Admin";
          }
        }

        return {
          _id: a._id.toString(),
          title: a.title || "School Announcement",
          audioUrl: a.audioUrl,
          senderName,
          senderType,
          createdAt: a.createdAt,
          createdAtFormatted: new Date(a.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      })
    );

    console.log(`✅ STUDENT VOICE ANNOUNCES: ${enriched.length} announcements found`);
    enriched.forEach((a, idx) => {
      console.log(`   [${idx + 1}] "${a.title}" from ${a.senderName} (${a.senderType}) - audioUrl: ${a.audioUrl}`);
    });
    res.json(enriched);
  } catch (err) {
    console.error("❌ STUDENT VOICE ANNOUNCES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

/* ================================
   NOTIFICATION SYSTEM ROUTES
   ================================= */

// ✅ GET /api/notifications - Get notifications for current user
app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const schoolId = req.user.schoolId;

    // Get all notifications for this user (role-based filtering)
    // Support both old schema (userId/role) and new schema (targetRole/targetUser)
    const notifications = await db.collection("notifications")
      .find({
        $and: [
          {
            $or: [
              // New schema
              { targetRole: role },
              { targetRole: null },
              // Old schema
              { role: role },
            ],
          },
          {
            $or: [
              // New schema
              { targetUser: safeObjectId(userId) },
              { targetUser: null },
              // Old schema
              { userId: safeObjectId(userId) },
            ],
          },
          schoolId ? {
            $or: [
              { schoolId: safeObjectId(schoolId) },
              { schoolId: null },
            ]
          } : {},
        ].filter(q => Object.keys(q).length > 0),
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Get unread count (support both old and new schema)
    const unreadCount = await db.collection("notifications")
      .countDocuments({
        $and: [
          {
            $or: [
              // New schema
              { targetRole: role },
              { targetRole: null },
              // Old schema
              { role: role },
            ],
          },
          {
            $or: [
              // New schema
              { targetUser: safeObjectId(userId) },
              { targetUser: null },
              // Old schema
              { userId: safeObjectId(userId) },
            ],
          },
          { isRead: false },
          schoolId ? {
            $or: [
              { schoolId: safeObjectId(schoolId) },
              { schoolId: null },
            ]
          } : {},
        ].filter(q => Object.keys(q).length > 0),
      });

    // Convert ObjectId to string for JSON response
    const formattedNotifications = notifications.map((n) => ({
      ...n,
      _id: n._id.toString(),
      targetUser: n.targetUser?.toString() || null,
      createdBy: n.createdBy?.toString() || null,
      schoolId: n.schoolId?.toString() || null,
    }));

    res.json({
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ✅ POST /api/notifications - Create a new notification
app.post("/api/notifications", requireAuth, async (req, res) => {
  try {
    const { title, message, type, targetRole, targetUser, metadata } = req.body;

    // Validate required fields
    if (!title || !message || !targetRole) {
      return res.status(400).json({
        error: "title, message, and targetRole are required",
      });
    }

    // Create notification
    const notification = {
      title,
      message,
      type: type || "info",
      targetRole,
      targetUser: targetUser ? safeObjectId(targetUser) : null,
      schoolId: req.user.schoolId ? safeObjectId(req.user.schoolId) : null,
      createdBy: safeObjectId(req.user.userId),
      metadata: metadata || {},
      isRead: false,
      createdAt: new Date(),
    };

    const result = await db.collection("notifications").insertOne(notification);
    notification._id = result.insertedId;

    res.json({
      success: true,
      notification: {
        ...notification,
        _id: notification._id.toString(),
        targetUser: notification.targetUser?.toString() || null,
        createdBy: notification.createdBy?.toString() || null,
        schoolId: notification.schoolId?.toString() || null,
      },
    });
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// ✅ PUT /api/notifications/:id/read - Mark notification as read
app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const notificationId = safeObjectId(id);

    if (!notificationId) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const result = await db.collection("notifications").updateOne(
      { _id: notificationId },
      { $set: { isRead: true, readAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// ✅ PUT /api/notifications/mark-all-read - Mark all notifications as read
app.put("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const schoolId = req.user.schoolId;

    const filter = {
      $and: [
        {
          $or: [
            { targetRole: role },
            { targetRole: null },
            { role: role },
          ],
        },
        {
          $or: [
            { targetUser: safeObjectId(userId) },
            { targetUser: null },
            { userId: safeObjectId(userId) },
          ],
        },
        { isRead: false },
        schoolId ? {
          $or: [
            { schoolId: safeObjectId(schoolId) },
            { schoolId: null },
          ]
        } : {},
      ].filter(q => Object.keys(q).length > 0),
    };

    const result = await db.collection("notifications").updateMany(filter, {
      $set: { isRead: true, readAt: new Date() },
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Error marking all as read:", error);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// ✅ GET /api/notifications/unread-count - Get unread notification count
app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const schoolId = req.user.schoolId;

    // Support both old schema (userId/role) and new schema (targetRole/targetUser)
    const unreadCount = await db.collection("notifications")
      .countDocuments({
        $and: [
          {
            $or: [
              // New schema
              { targetRole: role },
              { targetRole: null },
              // Old schema
              { role: role },
            ],
          },
          {
            $or: [
              // New schema
              { targetUser: safeObjectId(userId) },
              { targetUser: null },
              // Old schema
              { userId: safeObjectId(userId) },
            ],
          },
          { isRead: false },
          schoolId ? {
            $or: [
              { schoolId: safeObjectId(schoolId) },
              { schoolId: null },
            ]
          } : {},
        ].filter(q => Object.keys(q).length > 0),
      });

    res.json({ unreadCount });
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// ✅ DELETE /api/notifications/:id - Delete a notification
app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const notificationId = safeObjectId(id);

    if (!notificationId) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const result = await db.collection("notifications").deleteOne({
      _id: notificationId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

/* ================================
   USER SESSION TRACKING
   ================================= */

// Log session events (login/logout)
app.post("/api/tracking/session-log", requireAuth, requireTenantId, async (req, res) => {
  try {
    const { userId, role, schoolId, eventType, startTime, duration, date } = req.body;

    if (!userId || !role || !schoolId || !eventType) {
      console.warn('⚠️ SessionLog: Missing fields -', { userId, role, schoolId, eventType });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Store schoolId as string for consistency with token
    const sessionLog = {
      userId: String(userId), // Ensure it's a string
      role,
      schoolId: String(schoolId), // Store as string to match token
      eventType, // 'login' or 'logout'
      startTime: new Date(startTime),
      duration: eventType === 'logout' ? duration : null, // in seconds
      logoutTime: eventType === 'logout' ? new Date() : null,
      recordedAt: new Date(date),
      date: new Date(date).toISOString().split('T')[0],
    };

    console.log('📝 SessionLog: Storing event -', { 
      userId: sessionLog.userId, 
      role: sessionLog.role, 
      schoolId: sessionLog.schoolId, 
      eventType: sessionLog.eventType,
      timestamp: new Date().toISOString()
    });

    const result = await db.collection("sessionLogs").insertOne(sessionLog);
    console.log('✅ SessionLog: Event stored with ID:', result.insertedId);

    res.json({ success: true, message: "Session logged" });
  } catch (error) {
    console.error("❌ Error logging session:", error);
    res.status(500).json({ error: "Failed to log session" });
  }
});

// Get concurrent users (currently logged-in users)
app.get("/api/tracking/concurrent-users", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const schoolId = String(req.user?.schoolId); // Get from token via requireAuth middleware

    console.log('🔍 ConcurrentUsers: Querying for schoolId:', schoolId);

    // Get all login events without matching logout events in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentLogins = await db.collection("sessionLogs").aggregate([
      {
        $match: {
          schoolId: schoolId,
          eventType: 'login',
          recordedAt: { $gte: twentyFourHoursAgo },
        },
      },
      {
        $sort: { recordedAt: -1 },
      },
      {
        $group: {
          _id: '$userId',
          latestLogin: { $first: '$recordedAt' },
          role: { $first: '$role' },
        },
      },
    ]).toArray();

    console.log('📊 ConcurrentUsers: Found', recentLogins.length, 'login events');

    // Get logout times for these users
    const logoutTimes = await db.collection("sessionLogs").aggregate([
      {
        $match: {
          schoolId: schoolId,
          eventType: 'logout',
          recordedAt: { $gte: twentyFourHoursAgo },
        },
      },
      {
        $sort: { recordedAt: -1 },
      },
      {
        $group: {
          _id: '$userId',
          latestLogout: { $first: '$recordedAt' },
        },
      },
    ]).toArray();

    console.log('📊 ConcurrentUsers: Found', logoutTimes.length, 'logout events');

    // Find active users (logged in after latest logout)
    const activeUsersWithoutNames = recentLogins
      .filter(login => {
        const logout = logoutTimes.find(l => l._id === login._id);
        // User is active if they have no logout OR logout before login
        const isActive = !logout || new Date(login.latestLogin) > new Date(logout.latestLogout);
        return isActive;
      })
      .map(user => ({
        userId: user._id,
        role: user.role,
        loginTime: user.latestLogin,
      }));

    // Fetch user names from students/teachers collections
    const activeUsers = await Promise.all(
      activeUsersWithoutNames.map(async (user) => {
        let userName = "Unknown User";
        
        try {
          // Try to find in students collection (by userId field)
          const student = await db.collection("students").findOne({
            userId: user.userId,
            schoolId: schoolId,
          });
          
          if (student?.name) {
            userName = student.name;
          } else {
            // Try to find in teachers collection (by userId field)
            const teacher = await db.collection("teachers").findOne({
              userId: user.userId,
              schoolId: schoolId,
            });
            
            if (teacher?.name) {
              userName = teacher.name;
            } else {
              // Try users collection as fallback
              const userDoc = await db.collection("users").findOne({
                _id: user.userId,
              });
              
              if (userDoc?.name) {
                userName = userDoc.name;
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ Failed to fetch name for userId ${user.userId}:`, err.message);
        }
        
        return {
          ...user,
          userName: userName,
        };
      })
    );

    console.log('✅ ConcurrentUsers: Returning', activeUsers.length, 'active users with names');
    res.json(activeUsers);
  } catch (error) {
    console.error("❌ Error fetching concurrent users:", error);
    res.status(500).json({ error: "Failed to fetch concurrent users" });
  }
});

// Get daily statistics
app.get("/api/tracking/daily-stats", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { date, role } = req.query;
    const schoolId = String(req.user?.schoolId); // Get from token via requireAuth middleware

    if (!date) {
      return res.status(400).json({ error: "Date parameter required" });
    }

    console.log('🔍 DailyStats: Querying for schoolId:', schoolId, 'date:', date, 'role:', role);

    // Parse the date to create range for the entire day
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const matchStage = {
      schoolId: schoolId,
      recordedAt: { $gte: startOfDay, $lte: endOfDay },
    };

    if (role && role !== 'all') {
      matchStage.role = role;
    }

    // Get all session logs for the day
    const sessionLogs = await db.collection("sessionLogs").find(matchStage).toArray();
    console.log('📊 DailyStats: Found', sessionLogs.length, 'session log entries');

    // Group by userId to pair logins with logouts
    const userSessions = {};
    sessionLogs.forEach(log => {
      if (!userSessions[log.userId]) {
        userSessions[log.userId] = {
          userId: log.userId,
          role: log.role,
          loginTime: null,
          logoutTime: null,
          duration: 0,
          events: [],
        };
      }
      userSessions[log.userId].events.push(log);
      if (log.eventType === 'login') {
        userSessions[log.userId].loginTime = log.recordedAt;
      } else if (log.eventType === 'logout') {
        userSessions[log.userId].logoutTime = log.recordedAt;
        userSessions[log.userId].duration = log.duration || 0;
      }
    });

    const sessionsWithoutNames = Object.values(userSessions).filter(s => s.loginTime);
    console.log('✅ DailyStats: Processed', sessionsWithoutNames.length, 'user sessions');

    // Fetch user names for each session
    const sessions = await Promise.all(
      sessionsWithoutNames.map(async (session) => {
        let userName = "Unknown User";
        
        try {
          // Try to find in students collection (by userId field)
          const student = await db.collection("students").findOne({
            userId: session.userId,
            schoolId: schoolId,
          });
          
          if (student?.name) {
            userName = student.name;
          } else {
            // Try to find in teachers collection (by userId field)
            const teacher = await db.collection("teachers").findOne({
              userId: session.userId,
              schoolId: schoolId,
            });
            
            if (teacher?.name) {
              userName = teacher.name;
            } else {
              // Try users collection as fallback
              const userDoc = await db.collection("users").findOne({
                _id: session.userId,
              });
              
              if (userDoc?.name) {
                userName = userDoc.name;
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ Failed to fetch name for userId ${session.userId}:`, err.message);
        }
        
        return {
          ...session,
          userName: userName,
        };
      })
    );

    res.json({
      date,
      sessions: sessions,
      totalSessions: sessions.length,
    });
  } catch (error) {
    console.error("❌ Error fetching daily stats:", error);
    res.status(500).json({ error: "Failed to fetch daily statistics" });
  }
});

/* ================================
   DEBUG - Create Sample Data (No Auth for testing)
   ================================= */

app.post("/api/debug/create-sample-data", async (req, res) => {
  try {
    // Find the first school
    const school = await db.collection("schools").findOne({});
    if (!school) {
      return res.status(400).json({ error: "No school found in database" });
    }
    
    const schoolId = school._id;
    console.log(`🔄 Creating sample data for schoolId: ${schoolId}`);
    
    // Sample data
    const classes = ["1", "2", "3", "4"];
    const sections = ["A", "B", "C"];
    const subjects = ["Mathematics", "English", "Science", "Hindi", "Social Studies"];
    
    let createdCount = 0;
    
    for (const classNum of classes) {
      for (const section of sections) {
        // Create 10 students per class-section
        for (let i = 1; i <= 10; i++) {
          const student = {
            name: `Student ${classNum}-${section}-${i}`,
            email: `student.${classNum}.${section}.${i}@school.com`,
            class: classNum,
            section: section,
            rollNo: String(i),
            parentName: `Parent ${classNum}-${section}-${i}`,
            phone: "+91 9876543210",
            schoolId: schoolId,
            createdAt: new Date(),
          };
          
          await db.collection("students").updateOne(
            { email: student.email, schoolId },
            { $set: student },
            { upsert: true }
          );
          createdCount++;
        }
      }
    }
    
    // Create sample attendance records
    const allStudents = await db.collection("students").find({ schoolId }).toArray();
    let attendanceCount = 0;
    for (const student of allStudents.slice(0, 20)) {
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        await db.collection("attendance").updateOne(
          { studentId: student._id, schoolId, date: new Date(date.toDateString()) },
          {
            $set: {
              studentId: student._id,
              schoolId,
              date: new Date(date.toDateString()),
              status: Math.random() > 0.2 ? "present" : "absent",
              submissionStatus: "SUBMITTED",
              createdAt: new Date(),
            }
          },
          { upsert: true }
        );
        attendanceCount++;
      }
    }
    
    // Create sample marks
    let marksCount = 0;
    for (const student of allStudents.slice(0, 20)) {
      for (const subject of subjects) {
        const marks = Math.floor(Math.random() * 50) + 50; // 50-100
        await db.collection("marks").updateOne(
          { studentId: student._id, schoolId, subject },
          {
            $set: {
              studentId: student._id,
              schoolId,
              subject,
              marks,
              maxMarks: 100,
              createdAt: new Date(),
            }
          },
          { upsert: true }
        );
        marksCount++;
      }
    }
    
    console.log(`✅ Created ${createdCount} sample students, ${attendanceCount} attendance records, ${marksCount} marks`);
    res.json({ success: true, message: `Created ${createdCount} students, ${attendanceCount} attendance, ${marksCount} marks` });
  } catch (error) {
    console.error("❌ SAMPLE DATA ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================================
   ADMIN: DEBUG - Create Sample Data
   ================================= */

app.post("/api/admin/debug/create-sample-data", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    console.log(`🔄 Creating sample data for schoolId: ${schoolId}`);
    
    // Sample data
    const classes = ["1", "2", "3", "4"];
    const sections = ["A", "B", "C"];
    const subjects = ["Mathematics", "English", "Science", "Hindi", "Social Studies"];
    
    let  createdCount = 0;
    
    for (const classNum of classes) {
      for (const section of sections) {
        // Create 10 students per class-section
        for (let i = 1; i <= 10; i++) {
          const student = {
            name: `Student ${classNum}-${section}-${i}`,
            email: `student.${classNum}.${section}.${i}@school.com`,
            class: classNum,
            section: section,
            rollNo: String(i),
            parentName: `Parent ${classNum}-${section}-${i}`,
            phone: "+91 9876543210",
            schoolId: schoolId,
            createdAt: new Date(),
          };
          
          await db.collection("students").updateOne(
            { email: student.email, schoolId },
            { $set: student },
            { upsert: true }
          );
          createdCount++;
        }
      }
    }
    
    // Create sample attendance records
    const allStudents = await db.collection("students").find({ schoolId }).toArray();
    for (const student of allStudents.slice(0, 20)) {
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        await db.collection("attendance").updateOne(
          { studentId: student._id, schoolId, date: new Date(date.toDateString()) },
          {
            $set: {
              studentId: student._id,
              schoolId,
              date: new Date(date.toDateString()),
              status: Math.random() > 0.2 ? "present" : "absent",
              submissionStatus: "SUBMITTED",
              createdAt: new Date(),
            }
          },
          { upsert: true }
        );
      }
    }
    
    // Create sample marks
    for (const student of allStudents.slice(0, 20)) {
      for (const subject of subjects) {
        const marks = Math.floor(Math.random() * 50) + 50; // 50-100
        await db.collection("marks").updateOne(
          { studentId: student._id, schoolId, subject },
          {
            $set: {
              studentId: student._id,
              schoolId,
              subject,
              marks,
              maxMarks: 100,
              createdAt: new Date(),
            }
          },
          { upsert: true }
        );
      }
    }
    
    console.log(`✅ Created ${createdCount} sample students and data`);
    res.json({ success: true, message: `Created ${createdCount} sample students with attendance and marks` });
  } catch (error) {
    console.error("❌ SAMPLE DATA ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================================
   ADMIN: DEBUG - Database Status
   ================================= */

app.get("/api/admin/debug/db-status", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    
    const totalStudents = await db.collection("students").countDocuments({});
    const totalSchools = await db.collection("schools").countDocuments({});
    const mySchoolStudents = await db.collection("students").countDocuments({ schoolId });
    const allSchools = await db.collection("schools").find({}).toArray();
    const sampleStudents = await db.collection("students").find({}).limit(5).toArray();
    
    res.json({
      totalStudentsInDB: totalStudents,
      totalSchools,
      mySchoolId: schoolId.toString(),
      mySchoolStudents,
      schools: allSchools.map(s => ({ _id: s._id.toString(), name: s.name })),
      sampleStudents: sampleStudents.map(s => ({ _id: s._id, schoolId: s.schoolId?.toString(), class: s.class, section: s.section, name: s.name })),
    });
  } catch (error) {
    console.error("❌ DEBUG ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================================
   ADMIN: GET CLASSES AND SECTIONS METADATA
   ================================= */

// Get unique classes and sections for the school
app.get("/api/admin/meta/classes-sections", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj; // Use ObjectId from middleware
    console.log(`🎯 META: Fetching classes and sections for schoolId: ${schoolId}`);
    
    // Get all students for this school
    const students = await db.collection("students").find(withActiveStudents({ schoolId })).toArray();
    console.log(`✅ Found ${students.length} students for schoolId ${schoolId}`);

    // Extract unique classes and sections
    const classesSet = new Set();
    const sectionsSet = new Set();

    students.forEach(student => {
      if (student.class) {
        classesSet.add(String(student.class).trim());
      }
      if (student.section) {
        sectionsSet.add(String(student.section).trim());
      }
    });

    // Convert to sorted arrays
    const classes = Array.from(classesSet).sort((a, b) => {
      // Try to sort numerically if all are numbers
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    const sections = Array.from(sectionsSet).sort();

    console.log(`✅ Unique classes: ${classes.join(", ") || "NONE"}`);
    console.log(`✅ Unique sections: ${sections.join(", ") || "NONE"}`);

    res.json({
      classes,
      sections,
      hasData: classes.length > 0 && sections.length > 0
    });
  } catch (error) {
    console.error("❌ META ERROR:", error);
    res.status(500).json({ error: "Failed to fetch classes and sections" });
  }
});

/* ================================
   ADMIN: GET STUDENTS BY CLASS AND SECTION
   ================================= */

// Get students for a specific class and section
app.get("/api/admin/students-by-class", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    let { class: classParam, section: sectionParam } = req.query;
    
    console.log(`🔍 STUDENTS: Fetching for class=${classParam}, section=${sectionParam}, schoolId=${schoolId}`);
    
    // Validate required params
    if (!classParam || !sectionParam) {
      return res.status(400).json({ error: "Class and section are required" });
    }

    // Convert class to number if it looks like a number
    const classValue = isNaN(classParam) ? classParam : Number(classParam);
    const sectionValue = String(sectionParam).trim();

    console.log(`📌 Query params after conversion: class=${classValue} (type: ${typeof classValue}), section=${sectionValue}`);

    // Query students - try both number and string formats for class
    let students = await db.collection("students").find(withActiveStudents({
      schoolId,
      $or: [
        { class: classValue, section: sectionValue },
        { class: String(classValue), section: sectionValue },
      ]
    })).toArray();

    console.log(`✅ Found ${students.length} students for class ${classValue}, section ${sectionValue}`);

    // Format response - only return necessary fields
    const formattedStudents = students.map(s => ({
      _id: s._id,
      name: s.name || "N/A",
      rollNo: s.rollNo || "N/A",
      class: s.class,
      section: s.section,
      email: s.email || "N/A",
    }));

    res.json({
      success: true,
      count: formattedStudents.length,
      students: formattedStudents
    });
  } catch (error) {
    console.error("❌ STUDENTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

/* ================================
   ADMIN: CLASS PERFORMANCE COMPARISON
   ================================= */

// Get school performance analytics with class comparison
// Supports query parameters: ?class=X&section=Y for filtering
app.get("/api/admin/analytics/class-comparison", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj; // Use ObjectId from middleware
    const filterClass = req.query.class ? String(req.query.class).trim() : null;
    const filterSection = req.query.section ? String(req.query.section).trim() : null;
    
    console.log(`📊 CLASS COMPARISON: schoolId=${schoolId}, filterClass=${filterClass}, filterSection=${filterSection}`);

    // Get all students for this school
    let studentQuery = withActiveStudents({ schoolId });
    if (filterClass) studentQuery.class = filterClass;
    if (filterSection) studentQuery.section = filterSection;
    
    const students = await db.collection("students").find(studentQuery).toArray();
    console.log(`✅ Found ${students.length} students for query:`, studentQuery);

    if (students.length === 0) {
      console.log(`⚠️ No students found. Returning empty array.`);
      return res.json({
        data: [],
        summary: {
          avgAttendance: 0,
          avgMarks: 0,
          totalStudents: 0,
          excellentClassesCount: 0,
          topPerformer: null,
        },
        hasData: false,
      });
    }

    // Get all attendance records for this school
    const attendanceRecords = await db.collection("attendance").find({ schoolId }).toArray();
    console.log(`✅ Found ${attendanceRecords.length} total attendance records`);

    // Get all marks records for this school
    const marksRecords = await db.collection("marks").find({ schoolId }).toArray();
    console.log(`✅ Found ${marksRecords.length} total marks records`);

    // Create lookup maps for faster access
    const attendanceMap = {};
    const marksMap = {};

    // Debug: show first few attendance studentIds
    if (attendanceRecords.length > 0) {
      console.log(`📌 FIRST 5 ATTENDANCE studentIds:`);
      attendanceRecords.slice(0, 5).forEach(rec => {
        console.log(`   - ${rec.studentId} (type: ${typeof rec.studentId}, constructor: ${rec.studentId?.constructor?.name})`);
      });
    }

    attendanceRecords.forEach(record => {
      const studentIdStr = String(record.studentId);
      if (!attendanceMap[studentIdStr]) {
        attendanceMap[studentIdStr] = [];
      }
      attendanceMap[studentIdStr].push(record);
    });

    // Debug: show attendance map keys
    console.log(`📌 ATTENDANCE MAP KEYS (${Object.keys(attendanceMap).length} unique students):`);
    Object.keys(attendanceMap).slice(0, 5).forEach(key => {
      console.log(`   - ${key}: ${attendanceMap[key].length} records`);
    });

    // Debug: Show actual attendance status values
    console.log(`📌 SAMPLE ATTENDANCE STATUS VALUES:`);
    attendanceRecords.slice(0, 10).forEach(rec => {
      console.log(`   - status: "${rec.status}" (type: ${typeof rec.status})`);
    });

    // Count attendance by status
    const statusCounts = {};
    attendanceRecords.forEach(rec => {
      const status = String(rec.status || 'null').toLowerCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log(`📌 ATTENDANCE STATUS COUNTS:`, statusCounts);

    marksRecords.forEach(record => {
      const studentIdStr = String(record.studentId);
      if (!marksMap[studentIdStr]) {
        marksMap[studentIdStr] = [];
      }
      marksMap[studentIdStr].push(record);
    });

    // Debug: show marks map keys
    console.log(`📌 MARKS MAP KEYS (${Object.keys(marksMap).length} unique students):`);
    Object.keys(marksMap).slice(0, 5).forEach(key => {
      console.log(`   - ${key}: ${marksMap[key].length} records`);
    });

    // Debug: Show sample marks values
    console.log(`📌 SAMPLE MARKS VALUES:`);
    marksRecords.slice(0, 10).forEach(rec => {
      console.log(`   - marks: ${rec.marks} (type: ${typeof rec.marks}), subject: ${rec.subject}`);
    });

    // Debug: Show FULL marks document structure
    console.log(`📌 SAMPLE FULL MARKS DOCUMENT:`);
    if (marksRecords.length > 0) {
      console.log(JSON.stringify(marksRecords[0], null, 2));
    }

    // Group students by class and section
    const classGroups = {};
    students.forEach(student => {
      const key = `${student.class}-${student.section}`;
      if (!classGroups[key]) {
        classGroups[key] = {
          class: student.class,
          section: student.section,
          students: [],
        };
      }
      classGroups[key].students.push(student);
    });

    // Debug: show student IDs and matching
    console.log(`📌 FIRST 5 STUDENT IDs (students collection):`);
    students.slice(0, 5).forEach(s => {
      console.log(`   - ${s._id} (type: ${typeof s._id}, constructor: ${s._id?.constructor?.name})`);
    });

    // Calculate metrics for each class
    const classMetrics = Object.values(classGroups).map(classGroup => {
      const totalStudents = classGroup.students.length;
      let totalAttendanceDays = 0;
      let totalPresentDays = 0;
      const allMarks = [];
      const subjectMarks = {};

      // Calculate attendance and marks for all students in this class
      let studentsWithAttendance = 0;
      let studentsWithMarks = 0;
      let attendanceByStatus = {};
      
      classGroup.students.forEach((student, idx) => {
        const studentIdStr = String(student._id);
        
        // Attendance calculation
        const studentAttendance = attendanceMap[studentIdStr] || [];
        if (studentAttendance.length > 0) studentsWithAttendance++;
        
        // Count by status for debugging
        studentAttendance.forEach(a => {
          const status = String(a.status || 'null').toLowerCase();
          attendanceByStatus[status] = (attendanceByStatus[status] || 0) + 1;
        });
        
        // Check for present status (case-insensitive)
        const presentCount = studentAttendance.filter(a => {
          const status = String(a.status || '').toLowerCase();
          return status === 'present';
        }).length;
        
        totalAttendanceDays += studentAttendance.length;
        totalPresentDays += presentCount;

        // Marks calculation
        const studentMarks = marksMap[studentIdStr] || [];
        if (studentMarks.length > 0) studentsWithMarks++;
        
        studentMarks.forEach(mark => {
          const markValue = Number(mark.score) || 0;
          allMarks.push(markValue);

          if (!subjectMarks[mark.subject]) {
            subjectMarks[mark.subject] = [];
          }
          subjectMarks[mark.subject].push(markValue);
        });
      });

      // Calculate average attendance percentage
      const avgAttendancePercent = totalAttendanceDays > 0 
        ? Math.round((totalPresentDays / totalAttendanceDays) * 100)
        : 0;

      // Calculate average marks percentage
      const avgMarksPercent = allMarks.length > 0
        ? Math.round(allMarks.reduce((a, b) => a + b, 0) / allMarks.length)
        : 0;

      // Find top and weakest subjects
      const subjectAverages = {};
      Object.keys(subjectMarks).forEach(subject => {
        const marksArray = subjectMarks[subject];
        const avg = marksArray.reduce((a, b) => a + b, 0) / marksArray.length;
        subjectAverages[subject] = Math.round(avg);
      });

      const sortedSubjects = Object.entries(subjectAverages).sort((a, b) => b[1] - a[1]);
      const topSubject = sortedSubjects[0]?.[0] || "N/A";
      const weakestSubject = sortedSubjects[sortedSubjects.length - 1]?.[0] || "N/A";

      const overall = avgMarksPercent >= 75 ? 'Excellent' : avgMarksPercent >= 60 ? 'Good' : 'Needs Attention';

      console.log(`📌 CLASS ${classGroup.class}-${classGroup.section}: students=${totalStudents} (with_attendance=${studentsWithAttendance}, with_marks=${studentsWithMarks}), totalAttendanceDays=${totalAttendanceDays}, totalPresentDays=${totalPresentDays}, attendance=${avgAttendancePercent}%, marks=${avgMarksPercent}%, status=${overall}`);
      console.log(`   Attendance status breakdown:`, attendanceByStatus);

      return {
        class: classGroup.class,
        section: classGroup.section,
        totalStudents: totalStudents,
        avgAttendancePercent: avgAttendancePercent,
        avgMarksPercent: avgMarksPercent,
        topSubject: topSubject,
        weakestSubject: weakestSubject,
        overall: overall,
      };
    });

    // Sort by overall marks (descending)
    classMetrics.sort((a, b) => b.avgMarksPercent - a.avgMarksPercent);

    // Calculate summary statistics
    const totalAllStudents = students.length;
    const avgAttendanceAll = classMetrics.length > 0
      ? Math.round(classMetrics.reduce((sum, c) => sum + c.avgAttendancePercent, 0) / classMetrics.length)
      : 0;
    const avgMarksAll = classMetrics.length > 0
      ? Math.round(classMetrics.reduce((sum, c) => sum + c.avgMarksPercent, 0) / classMetrics.length)
      : 0;
    const excellentCount = classMetrics.filter(c => c.overall === 'Excellent').length;
    const topPerformer = classMetrics.length > 0
      ? {
          class: classMetrics[0].class,
          section: classMetrics[0].section,
          attendance: classMetrics[0].avgAttendancePercent,
          marks: classMetrics[0].avgMarksPercent,
        }
      : null;

    console.log(`✅ CLASS COMPARISON: Returning ${classMetrics.length} classes`);
    res.json({
      data: classMetrics,
      summary: {
        avgAttendance: avgAttendanceAll,
        avgMarks: avgMarksAll,
        totalStudents: totalAllStudents,
        excellentClassesCount: excellentCount,
        topPerformer: topPerformer,
      },
      hasData: classMetrics.length > 0,
    });
  } catch (error) {
    console.error("❌ CLASS COMPARISON ERROR:", error);
    res.status(500).json({ error: "Failed to fetch class comparison data", details: error.message });
  }
});

/* ================================
   SPA FALLBACK - Serve index.html for client-side routing
   ================================= */
// All requests that don't match static files or API routes
// should return index.html so React Router can handle them
app.get("*", (req, res) => {
  // Don't serve API routes (this shouldn't happen as they're already defined)
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  
  // For all other routes, serve index.html so React Router on the client handles it
  const indexPath = path.join(frontendBuildPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("❌ Error serving index.html:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

/**
 * TEACHER: GET /api/teacher/announcements
 * Only admin text announcements for this school
 */
app.get("/api/teacher/announcements", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    console.log("🔍 TEACHER ANNOUNCEMENTS QUERY:", {
      schoolId: String(schoolId),
      type: "ANNOUNCEMENT",
      senderRole: "ADMIN",
    });

    const announcements = await db.collection("announcements")
      .find({
        schoolId,
        type: "ANNOUNCEMENT",
        senderRole: "ADMIN",
        recipientRole: { $in: ["TEACHER", "ALL"] },
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("✅ TEACHER ANNOUNCEMENTS COUNT:", announcements.length);
    res.json(
      announcements.map((a) => ({
        _id: a._id.toString(),
        type: a.type,
        senderRole: a.senderRole,
        senderId: a.senderId ? String(a.senderId) : null,
        schoolId: a.schoolId ? String(a.schoolId) : null,
        title: a.title || "Announcement",
        message: a.message || "",
        createdAt: a.createdAt,
      }))
    );
  } catch (err) {
    console.error("❌ TEACHER ANNOUNCEMENTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

/**
 * TEACHER: GET /api/teacher/voice-messages/history
 * Only this teacher's sent voice history
 */
app.get("/api/teacher/voice-messages/history", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const teacherUserId = safeObjectId(req.user.userId);
    if (!teacherUserId) {
      return res.status(400).json({ error: "Invalid teacher user ID" });
    }

    const teacherDoc =
      (await db.collection("teachers").findOne({
        userId: teacherUserId,
        schoolId,
      })) ||
      (await db.collection("teachers").findOne({
        userId: teacherUserId,
      }));
    const teacherId = teacherDoc?._id || teacherUserId;
    console.log("🔍 TEACHER VOICE HISTORY QUERY:", {
      schoolId: String(schoolId),
      type: "VOICE",
      senderRole: "TEACHER",
      senderId: String(teacherId),
      senderUserId: String(teacherUserId),
    });

    const baseQuery = {
      schoolId,
      senderRole: "TEACHER",
      $or: [
        { senderId: teacherId },
        { senderId: teacherUserId },
        { senderUserId: teacherUserId },
      ],
    };

    const typeQuery = {
      $or: [
        { type: "VOICE" },
        { type: "voice" },
        { type: { $exists: false } }, // backward compatibility
      ],
    };

    const [historyPrimary, historyLegacy] = await Promise.all([
      db.collection("voiceMessages").find({ ...baseQuery, ...typeQuery }).toArray(),
      db.collection("voice_messages").find({ ...baseQuery, ...typeQuery }).toArray(),
    ]);

    const merged = [...historyPrimary, ...historyLegacy];
    const uniqueById = new Map();
    merged.forEach((item) => uniqueById.set(String(item._id), item));
    const history = Array.from(uniqueById.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    console.log("✅ TEACHER VOICE HISTORY COUNTS:", {
      primary: historyPrimary.length,
      legacy: historyLegacy.length,
      merged: history.length,
    });
    res.json(
      history.map((m) => ({
        _id: m._id.toString(),
        type: m.type || "VOICE",
        senderRole: m.senderRole || "TEACHER",
        senderId: m.senderId ? String(m.senderId) : null,
        schoolId: m.schoolId ? String(m.schoolId) : null,
        audioUrl: m.audioUrl,
        status: m.status || "SENT",
        deliveredCount: Number(m.deliveredCount || (Array.isArray(m.targetUserIds) ? m.targetUserIds.length : 0)),
        failedCount: Number(m.failedCount || 0),
        createdAt: m.createdAt,
      }))
    );
  } catch (err) {
    console.error("❌ TEACHER VOICE HISTORY ERROR:", err);
    res.status(500).json({ error: "Failed to fetch voice history" });
  }
});
