import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import XLSX from "xlsx";
import { MongoClient, ObjectId } from "mongodb";
import cluster from "cluster";
import os from "os";
import MockDatabase from "./mockDb.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createQaObservabilityMiddleware } from "./middleware/qaObservability.js";

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

app.use(compression());
app.use(express.json());
app.use(createQaObservabilityMiddleware());

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    if (durationMs > 500) {
      console.warn(`SLOW_API ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    }
  });
  next();
});

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

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT_EXCEPTION:", error);
});

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

const activeStudentFilter = (base = {}) => ({
  ...base,
  isDeleted: { $ne: true },
});

const activeTeacherFilter = (base = {}) => ({
  ...base,
  isDeleted: { $ne: true },
});

const parseObjectIds = (ids = []) =>
  (Array.isArray(ids) ? ids : []).map((id) => safeObjectId(id)).filter(Boolean);

const parseStudentObjectIds = (studentIds = []) => parseObjectIds(studentIds);
const parseTeacherObjectIds = (teacherIds = []) => parseObjectIds(teacherIds);
const MONGO_DUPLICATE_KEY_CODE = 11000;

const isMongoDuplicateKeyError = (error) => Number(error?.code) === MONGO_DUPLICATE_KEY_CODE;

const normalizeStudentIdentity = ({ classValue, sectionValue, rollNo }) => ({
  class: String(classValue ?? "").trim(),
  section: String(sectionValue ?? "").trim(),
  rollNo: String(rollNo ?? "").trim(),
});

async function findStudentIdentityConflict({ schoolId, classValue, sectionValue, rollNo, excludeStudentId = null }) {
  const identity = normalizeStudentIdentity({ classValue, sectionValue, rollNo });
  if (!schoolId || !identity.class || !identity.section || !identity.rollNo) return null;

  const query = {
    schoolId,
    class: identity.class,
    section: identity.section,
    rollNo: identity.rollNo,
  };
  if (excludeStudentId) {
    query._id = { $ne: excludeStudentId };
  }
  return db.collection("students").findOne(query, { projection: { _id: 1, name: 1, class: 1, section: 1, rollNo: 1 } });
}

const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const authLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

app.use("/api/debug", publicRateLimit);
app.use("/dev", publicRateLimit);

const writeAuditLog = async ({ action, actorId = null, actorRole = null, schoolId = null, targetId = null, metadata = {} } = {}) => {
  try {
    if (!db) return;
    const safeSchoolId = safeObjectId(schoolId) || schoolId || null;
    const safeActorId = safeObjectId(actorId) || actorId || null;
    const safeTargetId = safeObjectId(targetId) || targetId || null;
    await db.collection("auditLogs").insertOne({
      action: String(action || "UNKNOWN"),
      actorId: safeActorId,
      actorRole: actorRole || null,
      schoolId: safeSchoolId,
      targetId: safeTargetId,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn("⚠️ AUDIT LOG WRITE FAILED:", err.message);
  }
};

const extractParentContact = (payload = {}) => {
  const parentName = String(payload?.parentName ?? "").trim();
  const parentPhone = String(payload?.parentPhone ?? payload?.phone ?? "").trim();
  return { parentName, parentPhone };
};

const extractTeacherPhone = (payload = {}) =>
  String(payload?.phone ?? payload?.mobile ?? payload?.contact ?? payload?.contactNumber ?? "").trim();

const getPagination = (query = {}, defaults = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || defaults.page || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || defaults.limit || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const normalizeSubjectName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeExamSubjects = (subjects = []) => {
  const map = new Map();
  (Array.isArray(subjects) ? subjects : []).forEach((item) => {
    const name = normalizeSubjectName(item?.name || item?.subject || item?.subjectName);
    const maxMarks = Number(item?.maxMarks);
    if (!name || !(maxMarks > 0)) return;
    map.set(name.toLowerCase(), { name, maxMarks });
  });
  return Array.from(map.values());
};

const getSubjectNameAliases = (subjectDoc = {}) => {
  const aliases = new Set();
  const primary = normalizeSubjectName(subjectDoc?.name);
  const secondary = normalizeSubjectName(subjectDoc?.subjectName);
  if (primary) aliases.add(primary);
  if (secondary) aliases.add(secondary);
  return Array.from(aliases);
};

const toSubjectKeySet = (names = []) =>
  new Set(
    (Array.isArray(names) ? names : [])
      .map((name) => normalizeSubjectName(name).toLowerCase())
      .filter(Boolean)
  );

async function getActiveSubjectKeySet({ schoolId, className, section }) {
  const subjectDocs = await db.collection("subjects")
    .find({
      schoolId,
      class: className,
      section,
      isDeleted: { $ne: true },
    })
    .project({ name: 1, subjectName: 1 })
    .toArray();

  const keys = new Set();
  subjectDocs.forEach((doc) => {
    getSubjectNameAliases(doc).forEach((name) => keys.add(name.toLowerCase()));
  });
  return keys;
}

const filterScoresByActiveSubjects = (scores = [], activeSubjectKeys = new Set()) =>
  (Array.isArray(scores) ? scores : []).filter((score) => {
    const key = normalizeSubjectName(score?.subject).toLowerCase();
    return key && activeSubjectKeys.has(key);
  });

const parseCsvTextRows = (text = "") => {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const headers = lines[0].split(",").map((h) => String(h || "").trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = String(cols[idx] ?? "").trim();
    });
    return row;
  });
};

const parseDateStart = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseDateEnd = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildDateRangeQuery = (field, from, to) => {
  const start = parseDateStart(from);
  const end = parseDateEnd(to);
  if (!start && !end) return {};
  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return { [field]: range };
};

const DEFAULT_TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_TIMETABLE_ROWS = [
  { type: "period", label: "Period 1", startTime: "08:00", endTime: "08:45" },
  { type: "period", label: "Period 2", startTime: "08:45", endTime: "09:30" },
  { type: "break", label: "Break", startTime: "09:30", endTime: "09:45" },
  { type: "period", label: "Period 3", startTime: "09:45", endTime: "10:30" },
  { type: "period", label: "Period 4", startTime: "10:30", endTime: "11:15" },
  { type: "break", label: "Lunch Break", startTime: "11:15", endTime: "11:45" },
  { type: "period", label: "Period 5", startTime: "11:45", endTime: "12:30" },
  { type: "period", label: "Period 6", startTime: "12:30", endTime: "13:15" },
  { type: "period", label: "Period 7", startTime: "13:15", endTime: "14:00" },
  { type: "period", label: "Period 8", startTime: "14:00", endTime: "14:45" },
];

const normalizeTimetableDays = (days = []) => {
  const unique = new Set();
  (Array.isArray(days) ? days : []).forEach((d) => {
    const value = String(d || "").trim();
    if (value) unique.add(value);
  });
  return Array.from(unique);
};

const normalizeTimetableRows = (rows = []) => {
  const normalized = (Array.isArray(rows) ? rows : []).map((row, idx) => {
    const type = String(row?.type || "period").toLowerCase() === "break" ? "break" : "period";
    const labelDefault = type === "period" ? `Period ${idx + 1}` : "Break";
    const label = String(row?.label || labelDefault).trim() || labelDefault;
    const startTime = String(row?.startTime || "").trim();
    const endTime = String(row?.endTime || "").trim();
    const rowKeyRaw = String(row?.rowKey || row?.key || "").trim();
    const rowKey = rowKeyRaw || `row_${idx + 1}_${type}`;
    return { rowKey, type, label, startTime, endTime };
  });

  const valid = normalized.filter((row) => row.label && row.startTime && row.endTime);
  const hasPeriod = valid.some((row) => row.type === "period");
  if (!hasPeriod) return [];
  return valid;
};

const buildDefaultTimetableConfig = ({ schoolId, classId, sectionId }) => {
  const rows = normalizeTimetableRows(DEFAULT_TIMETABLE_ROWS);
  return {
    schoolId,
    classId: String(classId || "").trim(),
    sectionId: String(sectionId || "").trim(),
    days: DEFAULT_TIMETABLE_DAYS,
    rows,
  };
};

async function getTimetableConfigDoc({ schoolId, classId, sectionId }) {
  const classValue = String(classId || "").trim();
  const sectionValue = String(sectionId || "").trim();
  const existing = await db.collection("timetableConfigs").findOne({
    schoolId,
    classId: classValue,
    sectionId: sectionValue,
    isDeleted: { $ne: true },
  });
  if (existing) {
    const days = normalizeTimetableDays(existing.days);
    const rows = normalizeTimetableRows(existing.rows);
    if (days.length > 0 && rows.length > 0) {
      return {
        ...existing,
        days,
        rows,
      };
    }
  }
  return buildDefaultTimetableConfig({ schoolId, classId: classValue, sectionId: sectionValue });
}

const getPeriodRowsFromConfig = (config = {}) =>
  (Array.isArray(config.rows) ? config.rows : []).filter((row) => row.type === "period");

const isValidParentPhone = (phone) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

const isValidTeacherPhone = (phone) => {
  if (!String(phone || "").trim()) return true; // optional field
  const digitsOnly = String(phone || "").replace(/\D/g, "");
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

const isValidEmailAddress = (email) => {
  const value = String(email || "").trim();
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const normalizeStudentSnapshot = (student) => ({
  ...student,
  _id: safeObjectId(student?._id),
  userId: safeObjectId(student?.userId),
  schoolId: safeObjectId(student?.schoolId),
  assignedTeacher: student?.assignedTeacher ? safeObjectId(student.assignedTeacher) : null,
  parentName: String(student?.parentName ?? "").trim(),
  parentPhone: String(student?.parentPhone ?? student?.phone ?? "").trim(),
});

const normalizeTeacherSnapshot = (teacher) => ({
  ...teacher,
  _id: safeObjectId(teacher?._id),
  userId: safeObjectId(teacher?.userId),
  schoolId: safeObjectId(teacher?.schoolId),
  phone: String(teacher?.phone ?? teacher?.mobile ?? teacher?.contact ?? teacher?.contactNumber ?? "").trim(),
});

async function runBestEffortTransaction(operationName, work) {
  const session = client?.startSession ? client.startSession() : null;
  if (!session) return work(null);

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    console.warn(`⚠️ ${operationName}: transaction unavailable/fallback -`, error.message);
    return work(null);
  } finally {
    await session.endSession();
  }
}

async function removeStudentReferences({ schoolId, studentIds, session = null }) {
  const options = session ? { session } : {};

  await Promise.all([
    db.collection("teachers").updateMany(
      { schoolId },
      { $pull: { assignedStudents: { $in: studentIds } } },
      options
    ),
    db.collection("classSections").updateMany(
      { schoolId },
      { $pull: { studentIds: { $in: studentIds }, students: { $in: studentIds } } },
      options
    ),
    db.collection("classSectionMappings").updateMany(
      { schoolId },
      { $pull: { studentIds: { $in: studentIds }, students: { $in: studentIds } } },
      options
    ),
  ]);
}

async function removeTeacherReferences({ schoolId, teacherIds, session = null }) {
  const options = session ? { session } : {};

  await Promise.all([
    db.collection("students").updateMany(
      { schoolId, assignedTeacher: { $in: teacherIds } },
      { $set: { assignedTeacher: null } },
      options
    ),
    db.collection("classAssignments").updateMany(
      { schoolId },
      { $pull: { teacherIds: { $in: teacherIds } } },
      options
    ),
    db.collection("subjectMappings").updateMany(
      { schoolId },
      { $pull: { teacherIds: { $in: teacherIds } } },
      options
    ),
    db.collection("subjects").updateMany(
      { schoolId, teacherId: { $in: teacherIds } },
      { $set: { teacherId: null } },
      options
    ),
    db.collection("classSections").updateMany(
      { schoolId },
      { $pull: { teacherIds: { $in: teacherIds } } },
      options
    ),
    db.collection("classSectionMappings").updateMany(
      { schoolId },
      { $pull: { teacherIds: { $in: teacherIds } } },
      options
    ),
  ]);
}

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

async function ensureMongoIndexes() {
  if (!isMongoConnected) return;
  try {
    await Promise.all([
      db.collection("users").createIndexes([
        { key: { email: 1, role: 1, schoolId: 1 }, name: "users_email_role_school_idx" },
      ]),
      db.collection("students").createIndexes([
        { key: { schoolId: 1, class: 1, section: 1, isDeleted: 1 }, name: "students_school_class_section_deleted_idx" },
      ]),
      db.collection("teachers").createIndexes([
        { key: { schoolId: 1, class: 1, section: 1, isDeleted: 1 }, name: "teachers_school_class_section_deleted_idx" },
      ]),
      db.collection("attendance").createIndexes([
        { key: { schoolId: 1, date: 1, class: 1, section: 1 }, name: "attendance_school_date_class_section_idx" },
        { key: { schoolId: 1, studentId: 1, date: -1 }, name: "attendance_school_student_date_idx" },
      ]),
      db.collection("marks").createIndexes([
        { key: { schoolId: 1, studentId: 1, examId: 1 }, name: "marks_school_student_exam_idx" },
        { key: { schoolId: 1, subject: 1, exam: 1 }, name: "marks_school_subject_exam_idx" },
      ]),
      db.collection("notifications").createIndexes([
        { key: { schoolId: 1, targetRole: 1, createdAt: -1 }, name: "notifications_school_targetRole_createdAt_idx" },
        { key: { schoolId: 1, isRead: 1, createdAt: -1 }, name: "notifications_school_isRead_createdAt_idx" },
      ]),
      db.collection("voiceMessages").createIndexes([
        { key: { schoolId: 1, senderId: 1, createdAt: -1 }, name: "voice_school_sender_createdAt_idx" },
        { key: { schoolId: 1, targetRole: 1, createdAt: -1 }, name: "voice_school_targetRole_createdAt_idx" },
      ]),
      db.collection("passwordResetRequests").createIndexes([
        { key: { schoolId: 1, status: 1, userType: 1, handlerId: 1 }, name: "resetreq_school_status_type_handler_idx" },
      ]),
    ]);

    const usersCollection = db.collection("users");
    try {
      await usersCollection.createIndex(
        { email: 1 },
        { unique: true, name: "users_email_unique_idx" }
      );
      console.log("Users unique index ensured (email)");
    } catch (userIndexErr) {
      if (isMongoDuplicateKeyError(userIndexErr)) {
        console.warn("Users unique index not created: duplicate emails exist.");
      } else {
        throw userIndexErr;
      }
    }

    const studentsCollection = db.collection("students");
    try {
      const existingIndexes = await studentsCollection.indexes();
      const legacyIndex = existingIndexes.find((idx) => idx.name === "students_school_class_section_roll_idx");
      if (legacyIndex) {
        await studentsCollection.dropIndex("students_school_class_section_roll_idx");
        console.log("Dropped legacy non-unique students roll index");
      }
    } catch (dropErr) {
      console.warn("Failed to drop legacy students roll index:", dropErr.message);
    }

    try {
      await studentsCollection.createIndex(
        { schoolId: 1, class: 1, section: 1, rollNo: 1 },
        { unique: true, name: "students_school_class_section_roll_unique_idx" }
      );
      console.log("Students unique index ensured (schoolId+class+section+rollNo)");
    } catch (indexErr) {
      if (isMongoDuplicateKeyError(indexErr)) {
        console.warn("Students unique index not created: duplicate records exist. Run duplicate cleanup first.");
      } else {
        throw indexErr;
      }
    }

    console.log("MongoDB indexes ensured");
  } catch (err) {
    console.warn("Failed to ensure indexes:", err.message);
  }
}

async function startServer() {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    if (client && process.env.MONGO_URI) {
      try {
        await client.connect();
        db = client.db("school_saas");
        isMongoConnected = true;
        console.log("✅ MongoDB connected successfully");
        
        // Auto-seed developer user if MongoDB is connected
        await seedDeveloperUser();
        await ensureMongoIndexes();
      } catch (mongoError) {
        if (isProduction) {
          throw new Error(`MongoDB connection failed in production: ${mongoError.message}`);
        }
        console.warn("⚠️  MongoDB connection failed, running in fallback mode:", mongoError.message);
        console.log("💡 Tip: Install MongoDB locally or set MONGO_URI to a MongoDB Atlas connection string");
        db = new MockDatabase();
        isMongoConnected = false;
        
        // Auto-seed developer user in fallback mode too
        await seedDeveloperUser();
      }
    } else {
      if (isProduction) {
        throw new Error("MONGO_URI is required in production");
      }
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

if (process.env.CLUSTER_MODE === "true" && cluster.isPrimary) {
  const workerCount = Number(process.env.WEB_CONCURRENCY || os.cpus().length);
  console.log(`Starting cluster mode with ${workerCount} workers`);
  for (let i = 0; i < workerCount; i += 1) {
    cluster.fork();
  }
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Restarting...`);
    cluster.fork();
  });
} else {
  startServer();
}

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
    console.log(
      JSON.stringify({
        tag: "QA_ROLE_CHECK",
        requestId: req.qaRequestId || null,
        requiredRole: role,
        actualRole: req.user?.role || null,
        path: req.originalUrl,
      })
    );
    if (!req.user || req.user.role !== role) {
      console.warn(
        JSON.stringify({
          tag: "QA_ROLE_DENY",
          requestId: req.qaRequestId || null,
          requiredRole: role,
          actualRole: req.user?.role || null,
          path: req.originalUrl,
        })
      );
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
app.get("/", publicRateLimit, (req, res) => {
  res.json({
    status: "OK",
    message: "School SaaS Backend is running 🚀",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/api/health", publicRateLimit, async (req, res) => {
  const memory = process.memoryUsage();
  let database = isMongoConnected ? "connected" : "disconnected";
  if (isMongoConnected && db) {
    try {
      await db.command({ ping: 1 });
      database = "connected";
    } catch {
      database = "degraded";
    }
  }

  return res.json({
    status: database === "connected" ? "ok" : "degraded",
    db: database,
    uptime: process.uptime(),
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/debug/health", publicRateLimit, async (req, res) => {
  try {
    const memory = process.memoryUsage();
    let mongoStatus = isMongoConnected ? "connected" : "disconnected";
    if (isMongoConnected && db) {
      try {
        await db.command({ ping: 1 });
        mongoStatus = "connected";
      } catch {
        mongoStatus = "degraded";
      }
    }

    let teacherCount = 0;
    let studentCount = 0;
    if (db && mongoStatus === "connected") {
      [teacherCount, studentCount] = await Promise.all([
        db.collection("teachers").countDocuments({ isDeleted: { $ne: true } }),
        db.collection("students").countDocuments({ isDeleted: { $ne: true } }),
      ]);
    }

    let jwtWorking = false;
    try {
      const probe = jwt.sign({ probe: true }, process.env.JWT_SECRET, { expiresIn: "1m" });
      const decoded = jwt.verify(probe, process.env.JWT_SECRET);
      jwtWorking = Boolean(decoded?.probe);
    } catch {
      jwtWorking = false;
    }

    return res.json({
      uptime: process.uptime(),
      memoryUsage: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
      },
      mongoStatus,
      jwtWorking,
      teacherCount,
      studentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DEBUG_HEALTH_ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch debug health" });
  }
});

/* ================================
   DEBUG: Check if uploads are being served
   ================================= */
app.get("/api/debug/uploads", publicRateLimit, (req, res) => {
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
app.post("/api/auth/login", authLoginRateLimit, async (req, res) => {
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
app.post("/api/auth/student/login", authLoginRateLimit, async (req, res) => {
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

    const student = await db.collection("students").findOne(activeStudentFilter({
      userId: user._id,
    }));
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

    const mustChangePassword = Boolean(user?.forcePasswordChange);
    console.log(`✅ STUDENT LOGIN SUCCESS - email: ${normalizedEmail}, studentId: ${student._id}, mustChangePassword: ${mustChangePassword}`);
    res.json({
      token,
      schoolName,
      mustChangePassword,
      student: { ...student, _id: student._id.toString(), schoolId: student.schoolId.toString() },
    });
  } catch (err) {
    console.error("❌ STUDENT LOGIN ERROR - Full error:", err.message, "Stack:", err.stack);
    return res.status(500).json({ error: "Login failed - " + err.message });
  }
});

/* ================================
   TEACHER LOGIN
   ================================= */
app.post("/api/auth/teacher/login", authLoginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.collection("users").findOne({
      email,
      role: "TEACHER",
    });

    if (!user) return res.status(401).json({ error: "Teacher not found" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Wrong password" });

    const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
      userId: user._id,
    }));

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

    const mustChangePassword = Boolean(user?.forcePasswordChange);
    console.log("✅ TEACHER LOGIN - teacherId:", teacher._id, "schoolId:", teacher.schoolId, "mustChangePassword:", mustChangePassword);
    res.json({
      token,
      schoolName,
      mustChangePassword,
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
app.post("/api/auth/developer/login", authLoginRateLimit, async (req, res) => {
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
   STUDENT FORGOT PASSWORD (TEACHER-ASSISTED)
   ================================= */
app.post("/api/student/password-reset-request", forgotPasswordRateLimit, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await db.collection("users").findOne({
      email,
      role: "STUDENT",
      isDeleted: { $ne: true },
    });
    if (!user) {
      // Deliberately return generic success message to avoid account enumeration.
      return res.json({ success: true, message: "If your account exists, your request has been sent to your class teacher." });
    }

    const schoolId = safeObjectId(user.schoolId);
    if (!schoolId) {
      return res.json({ success: true, message: "If your account exists, your request has been sent to your class teacher." });
    }

    const student = await db.collection("students").findOne(
      activeStudentFilter({ userId: user._id, schoolId }),
      { projection: { _id: 1, name: 1, class: 1, section: 1, rollNo: 1 } }
    );
    if (!student) {
      return res.json({ success: true, message: "If your account exists, your request has been sent to your class teacher." });
    }

    const teacher = await db.collection("teachers").findOne(
      activeTeacherFilter({ schoolId, class: student.class, section: student.section }),
      { projection: { _id: 1, userId: 1, name: 1 } }
    );
    if (!teacher) {
      return res.status(400).json({ error: "No class teacher assigned for your class/section. Contact school admin." });
    }

    const existingPending = await db.collection("passwordResetRequests").findOne({
      schoolId,
      studentId: student._id,
      status: "PENDING",
    });
    if (existingPending) {
      return res.json({ success: true, message: "A reset request is already pending with your class teacher." });
    }

    await db.collection("passwordResetRequests").insertOne({
      schoolId,
      studentId: student._id,
      studentUserId: user._id,
      studentName: student.name || "",
      rollNo: student.rollNo || "",
      class: String(student.class || ""),
      section: String(student.section || ""),
      email,
      teacherId: teacher._id,
      teacherUserId: teacher.userId || null,
      status: "PENDING",
      createdAt: new Date(),
    });

    await writeAuditLog({
      action: "STUDENT_FORGOT_PASSWORD_REQUESTED",
      actorId: user._id,
      actorRole: "STUDENT",
      schoolId,
      targetId: student._id,
      metadata: {
        class: String(student.class || ""),
        section: String(student.section || ""),
      },
    });

    return res.json({ success: true, message: "Request submitted to your class teacher." });
  } catch (err) {
    console.error("❌ PASSWORD RESET REQUEST ERROR:", err);
    return res.status(500).json({ error: "Failed to submit reset request" });
  }
});

/* ================================
   TEACHER FORGOT PASSWORD (ADMIN-HANDLED)
   ================================= */
app.post("/api/auth/teacher/forgot-password", forgotPasswordRateLimit, async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || req.body?.email || "").trim();
    if (!identifier) return res.status(400).json({ error: "Teacher ID or Email is required" });

    let teacher = null;
    let user = null;

    if (identifier.includes("@")) {
      const email = identifier.toLowerCase();
      user = await db.collection("users").findOne({
        email,
        role: "TEACHER",
        isDeleted: { $ne: true },
      });
      if (user) {
        const schoolId = safeObjectId(user.schoolId);
        if (schoolId) {
          teacher = await db.collection("teachers").findOne(
            activeTeacherFilter({ userId: user._id, schoolId })
          );
        }
      }
    } else {
      const teacherId = safeObjectId(identifier);
      if (teacherId) {
        teacher = await db.collection("teachers").findOne(activeTeacherFilter({ _id: teacherId }));
        if (teacher?.userId) {
          user = await db.collection("users").findOne({
            _id: safeObjectId(teacher.userId),
            role: "TEACHER",
            isDeleted: { $ne: true },
          });
        }
      } else {
        teacher = await db.collection("teachers").findOne(
          activeTeacherFilter({
            $or: [
              { teacherId: identifier },
              { employeeId: identifier },
              { id: identifier },
            ],
          })
        );
        if (teacher?.userId) {
          user = await db.collection("users").findOne({
            _id: safeObjectId(teacher.userId),
            role: "TEACHER",
            isDeleted: { $ne: true },
          });
        }
      }
    }

    if (!teacher || !user) {
      return res.json({ success: true, message: "If account exists, reset request has been sent to admin." });
    }

    const schoolId = safeObjectId(teacher.schoolId || user.schoolId);
    if (!schoolId) {
      return res.json({ success: true, message: "If account exists, reset request has been sent to admin." });
    }

    const adminUser = await db.collection("users").findOne({
      schoolId,
      role: "ADMIN",
      isDeleted: { $ne: true },
    });
    if (!adminUser) {
      return res.status(400).json({ error: "No admin available to handle reset request." });
    }

    const existingPending = await db.collection("passwordResetRequests").findOne({
      schoolId,
      userType: "teacher",
      userId: user._id,
      status: "pending",
    });
    if (existingPending) {
      return res.json({ success: true, message: "A reset request is already pending with admin." });
    }

    await db.collection("passwordResetRequests").insertOne({
      schoolId,
      userType: "teacher",
      userId: user._id,
      teacherId: teacher._id,
      handlerId: adminUser._id,
      status: "pending",
      createdAt: new Date(),
      teacherName: teacher.name || "",
      teacherEmail: String(user.email || "").toLowerCase(),
    });

    await writeAuditLog({
      action: "TEACHER_FORGOT_PASSWORD_REQUESTED",
      actorId: user._id,
      actorRole: "TEACHER",
      schoolId,
      targetId: teacher._id,
      metadata: {
        teacherEmail: String(user.email || "").toLowerCase(),
      },
    });

    return res.json({ success: true, message: "Reset request submitted to admin." });
  } catch (err) {
    console.error("❌ TEACHER FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ error: "Failed to submit reset request" });
  }
});

/* ================================
   ADMIN: TEACHER PASSWORD RESET REQUESTS
   ================================= */
app.get("/api/admin/password-reset-requests", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const schoolId = req.user.schoolIdObj;
    const adminUserId = safeObjectId(req.user.userId);
    const type = String(req.query?.type || "").trim().toLowerCase();

    if (!adminUserId) return res.status(400).json({ error: "Invalid admin user id" });

    const query = {
      schoolId,
      status: "pending",
      handlerId: adminUserId,
    };

    if (type) query.userType = type;

    const [requests, totalCount] = await Promise.all([
      db.collection("passwordResetRequests")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("passwordResetRequests").countDocuments(query),
    ]);

    return res.json({
      data: requests,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
  } catch (err) {
    console.error("❌ ADMIN FETCH PASSWORD RESET REQUESTS ERROR:", err);
    return res.status(500).json({ error: "Failed to load reset requests" });
  }
});

/* ================================
   ADMIN: RESET TEACHER PASSWORD
   ================================= */
app.post("/api/admin/reset-teacher-password", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const adminUserId = safeObjectId(req.user.userId);
    const requestId = safeObjectId(req.body?.requestId);
    const newPassword = String(req.body?.newPassword || "");

    if (!adminUserId || !requestId) return res.status(400).json({ error: "Invalid request" });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });

    const resetRequest = await db.collection("passwordResetRequests").findOne({
      _id: requestId,
      schoolId,
      userType: "teacher",
      status: "pending",
      handlerId: adminUserId,
    });
    if (!resetRequest) return res.status(404).json({ error: "Reset request not found" });

    const teacherUserId = safeObjectId(resetRequest.userId);
    if (!teacherUserId) return res.status(400).json({ error: "Invalid teacher user id in request" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runBestEffortTransaction("ADMIN_RESET_TEACHER_PASSWORD", async (session) => {
      const options = session ? { session } : {};

      await db.collection("users").updateOne(
        {
          _id: teacherUserId,
          schoolId,
          role: "TEACHER",
          isDeleted: { $ne: true },
        },
        {
          $set: {
            passwordHash,
            forcePasswordChange: true,
            passwordUpdatedAt: new Date(),
          },
        },
        options
      );

      await db.collection("passwordResetRequests").updateOne(
        { _id: resetRequest._id },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            completedBy: adminUserId,
          },
        },
        options
      );
    });

    await writeAuditLog({
      action: "ADMIN_RESET_TEACHER_PASSWORD",
      actorId: adminUserId,
      actorRole: "ADMIN",
      schoolId,
      targetId: teacherUserId,
      metadata: {
        requestId: String(resetRequest._id),
      },
    });

    return res.json({ success: true, message: "Teacher password reset successfully." });
  } catch (err) {
    console.error("❌ ADMIN RESET TEACHER PASSWORD ERROR:", err);
    return res.status(500).json({ error: "Failed to reset teacher password" });
  }
});

/* ================================
   TEACHER: VIEW PENDING RESET REQUESTS
   ================================= */
app.get("/api/teacher/password-reset-requests", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const schoolId = req.user.schoolIdObj;
    const teacherUserId = safeObjectId(req.user.userId);
    if (!teacherUserId) return res.status(400).json({ error: "Invalid teacher user id" });

    const teacher = await db.collection("teachers").findOne(
      activeTeacherFilter({ userId: teacherUserId, schoolId }),
      { projection: { _id: 1 } }
    );
    if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

    const query = { schoolId, teacherId: teacher._id, status: "PENDING" };
    const [requests, totalCount] = await Promise.all([
      db.collection("passwordResetRequests")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("passwordResetRequests").countDocuments(query),
    ]);

    return res.json({
      data: requests,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
  } catch (err) {
    console.error("❌ FETCH RESET REQUESTS ERROR:", err);
    return res.status(500).json({ error: "Failed to load reset requests" });
  }
});

/* ================================
   TEACHER: RESET STUDENT PASSWORD FROM REQUEST
   ================================= */
app.put("/api/teacher/password-reset-requests/:id/reset", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const teacherUserId = safeObjectId(req.user.userId);
    const requestId = safeObjectId(req.params.id);
    const newPassword = String(req.body?.newPassword || "");

    if (!teacherUserId || !requestId) return res.status(400).json({ error: "Invalid request" });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });

    const teacher = await db.collection("teachers").findOne(
      activeTeacherFilter({ userId: teacherUserId, schoolId }),
      { projection: { _id: 1 } }
    );
    if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

    const resetRequest = await db.collection("passwordResetRequests").findOne({
      _id: requestId,
      schoolId,
      teacherId: teacher._id,
      status: "PENDING",
    });
    if (!resetRequest) return res.status(404).json({ error: "Reset request not found" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runBestEffortTransaction("TEACHER_RESET_STUDENT_PASSWORD", async (session) => {
      const options = session ? { session } : {};
      await db.collection("users").updateOne(
        {
          _id: resetRequest.studentUserId,
          schoolId,
          role: "STUDENT",
          isDeleted: { $ne: true },
        },
        {
          $set: {
            passwordHash,
            forcePasswordChange: true,
            passwordUpdatedAt: new Date(),
          },
        },
        options
      );

      await db.collection("passwordResetRequests").updateOne(
        { _id: resetRequest._id },
        {
          $set: {
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolvedBy: teacherUserId,
          },
        },
        options
      );
    });

    await writeAuditLog({
      action: "TEACHER_RESET_STUDENT_PASSWORD",
      actorId: teacherUserId,
      actorRole: "TEACHER",
      schoolId,
      targetId: resetRequest.studentUserId,
      metadata: {
        requestId: String(resetRequest._id),
      },
    });

    return res.json({ success: true, message: "Student password reset successfully." });
  } catch (err) {
    console.error("❌ RESET STUDENT PASSWORD ERROR:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

/* ================================
   CHANGE PASSWORD (ALL LOGGED-IN USERS)
   ================================= */
const handleChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const userId = safeObjectId(req.user?.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user id" });

    const user = await db.collection("users").findOne({ _id: userId, isDeleted: { $ne: true } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(String(currentPassword), String(user.passwordHash || ""));
    if (!ok) return res.status(400).json({ error: "Current password is incorrect" });

    const sameAsCurrent = await bcrypt.compare(String(newPassword), String(user.passwordHash || ""));
    if (sameAsCurrent) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash,
          forcePasswordChange: false,
          passwordUpdatedAt: new Date(),
        },
      }
    );

    await writeAuditLog({
      action: "USER_CHANGED_OWN_PASSWORD",
      actorId: userId,
      actorRole: req.user?.role || null,
      schoolId: req.user?.schoolId || null,
      targetId: userId,
    });

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("❌ CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({ error: "Failed to change password" });
  }
};

app.put("/api/auth/change-password", requireAuth, handleChangePassword);
app.post("/api/auth/change-password", requireAuth, handleChangePassword);

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
    const student = await db.collection("students").findOne(activeStudentFilter({
      userId: userObjectId,
      schoolId: schoolObjectId,
    }));

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
      teacher = await db.collection("teachers").findOne(activeTeacherFilter({
        class: student.class,
        section: student.section,
        schoolId: schoolObjectId,
      }), {
        projection: {
          _id: 1,
          name: 1,
          class: 1,
          section: 1,
          phone: 1,
          mobile: 1,
          contact: 1,
          contactNumber: 1,
        },
      });
    } catch (e) {
      console.warn("TEACHER LOOKUP FAILED:", e.message);
    }
    let mustChangePassword = false;
    // include email + password-change flag from users collection
    try {
      const user = await db.collection("users").findOne({ _id: student.userId });
      if (user && user.email) student.email = user.email;
      mustChangePassword = Boolean(user?.forcePasswordChange);
    } catch (e) {
      console.warn("STUDENT DASHBOARD: failed to fetch user email", e.message);
    }
    res.json({ student, attendance, marks, teacher, mustChangePassword });
  } catch (err) {
    console.error("❌ STUDENT DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

/* ================================
   STUDENT: DASHBOARD SUMMARY (COMBINED)
   ================================= */
app.get("/api/student/dashboard-summary", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = req.user.schoolIdObj;
    if (!userObjectId) return res.status(400).json({ error: "Invalid userId in token" });

    const student = await db.collection("students").findOne(activeStudentFilter({
      userId: userObjectId,
      schoolId: schoolObjectId,
    }));
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const [attendanceCount, marksCount, unreadNotifications] = await Promise.all([
      db.collection("attendance").countDocuments({ schoolId: schoolObjectId, studentId: student._id, submissionStatus: "SUBMITTED" }),
      db.collection("marks").countDocuments({ schoolId: schoolObjectId, studentId: student._id }),
      db.collection("notifications").countDocuments({
        $and: [
          { $or: [{ targetRole: "STUDENT" }, { targetRole: null }, { role: "STUDENT" }] },
          { $or: [{ targetUser: userObjectId }, { targetUser: null }, { userId: userObjectId }] },
          { isRead: false },
          { $or: [{ schoolId: schoolObjectId }, { schoolId: null }] },
          { isDeleted: { $ne: true } },
        ],
      }),
    ]);

    return res.json({
      className: student.class || "",
      section: student.section || "",
      attendanceCount,
      marksCount,
      unreadNotifications,
    });
  } catch (err) {
    console.error("❌ STUDENT DASHBOARD SUMMARY ERROR:", err);
    return res.status(500).json({ error: "Failed to load dashboard summary" });
  }
});
/* ================================
   STUDENT: GET ATTENDANCE
   ================================= */
app.get("/api/student/attendance", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const usePagination = Boolean(req.query.page || req.query.limit);
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    // ✅ TENANT SCOPED: Find student
    const student = await db.collection("students").findOne(activeStudentFilter({
      userId: userObjectId,
      schoolId: schoolObjectId,
    }));
    if (!student) return res.json([]);

    const studentId = student._id;

    // ✅ TENANT SCOPED: Only SUBMITTED attendance from this school
    const query = {
      schoolId: schoolObjectId,
      submissionStatus: "SUBMITTED",
      $or: [
        { studentId: studentId },
        { studentUserId: userObjectId },
      ],
    };

    console.log("✅ STUDENT ATTENDANCE QUERY - schoolId:", schoolObjectId, "studentId:", studentId);

    const cursor = db
      .collection("attendance")
      .find(query)
      .sort({ date: -1 });

    const records = await (usePagination ? cursor.skip(skip).limit(limit) : cursor).toArray();
    const totalCount = usePagination ? await db.collection("attendance").countDocuments(query) : records.length;

    console.log("✅ ATTENDANCE RECORDS:", records.length);
    if (usePagination) {
      return res.json({
        data: records,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }
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
    const format = String(req.query.format || "legacy").toLowerCase();
    const usePagination = Boolean(req.query.page || req.query.limit);
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    // ✅ TENANT SCOPED: Find student
    const student = await db.collection("students").findOne(activeStudentFilter({
      userId: userObjectId,
      schoolId: schoolObjectId,
    }));
    if (!student) return res.json([]);

    const studentId = student._id;
    const studentClass = String(student.class || "").trim();
    const studentSection = String(student.section || "").trim();

    const activeExamDocs = await db
      .collection("exams")
      .find({
        schoolId: schoolObjectId,
        class: studentClass,
        section: studentSection,
        isDeleted: { $ne: true },
      })
      .sort({ createdAt: -1 })
      .toArray();
    const activeExamIdSet = new Set(activeExamDocs.map((e) => String(e._id)));
    const activeSubjectKeys = await getActiveSubjectKeySet({
      schoolId: schoolObjectId,
      className: studentClass,
      section: studentSection,
    });

    if (format !== "v2") {
      const baseQuery = {
        schoolId: schoolObjectId,
        studentId,
      };
      const cursor = db
        .collection("marks")
        .find(baseQuery)
        .sort({ createdAt: -1 });
      const marksRaw = await (usePagination ? cursor.skip(skip).limit(limit) : cursor).toArray();
      const sanitizedMarks = marksRaw
        .map((mark) => {
          if (mark?.examId && !activeExamIdSet.has(String(mark.examId))) return null;

          if (Array.isArray(mark?.scores) && mark.scores.length > 0) {
            const filteredScores = filterScoresByActiveSubjects(mark.scores, activeSubjectKeys);
            if (filteredScores.length === 0) return null;
            return { ...mark, scores: filteredScores };
          }

          const legacySubjectKey = normalizeSubjectName(mark?.subject || mark?.subjectName).toLowerCase();
          if (legacySubjectKey && !activeSubjectKeys.has(legacySubjectKey)) return null;
          return mark;
        })
        .filter(Boolean);
      if (usePagination) {
        const totalCount = await db.collection("marks").countDocuments(baseQuery);
        return res.json({
          data: sanitizedMarks,
          page,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          totalCount,
        });
      }
      return res.json(sanitizedMarks);
    }

    // V2: marks per exam with subject-wise max marks
    const examDocs = activeExamDocs;

    const examIds = examDocs.map((e) => e._id);
    const marksV2 = examIds.length
      ? await db
          .collection("marks")
          .find({
            schoolId: schoolObjectId,
            studentId,
            examId: { $in: examIds },
            scores: { $exists: true },
          })
          .toArray()
      : [];
    const marksByExamId = new Map(marksV2.map((m) => [String(m.examId), m]));

    const exams = examDocs
      .filter((examDoc) => Array.isArray(examDoc.subjects) && examDoc.subjects.length > 0)
      .map((examDoc) => {
        const subjects = normalizeExamSubjects(examDoc.subjects).filter((subj) => activeSubjectKeys.has(subj.name.toLowerCase()));
        const scoreDoc = marksByExamId.get(String(examDoc._id));
        const scoreMap = new Map(
          filterScoresByActiveSubjects(scoreDoc?.scores || [], activeSubjectKeys)
            .map((s) => [normalizeSubjectName(s?.subject).toLowerCase(), Number(s?.obtained)])
            .filter(([key]) => Boolean(key))
        );

        const subjectRows = subjects.map((subj) => {
          const value = scoreMap.has(subj.name.toLowerCase()) ? Number(scoreMap.get(subj.name.toLowerCase())) : null;
          return {
            subject: subj.name,
            obtained: Number.isFinite(value) ? value : null,
            maxMarks: subj.maxMarks,
          };
        });

        const totalMax = subjectRows.reduce((sum, row) => sum + Number(row.maxMarks || 0), 0);
        const totalObtained = subjectRows.reduce((sum, row) => sum + Number(row.obtained || 0), 0);
        const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;

        return {
          examId: examDoc._id.toString(),
          examName: examDoc.name,
          date: examDoc.date || null,
          class: examDoc.class,
          section: examDoc.section,
          subjects: subjectRows,
          totalObtained,
          totalMax,
          percentage,
        };
      })
      .filter((exam) => Array.isArray(exam.subjects) && exam.subjects.length > 0);

    // Fallback for legacy marks-only data if no V2 exam rows exist yet.
    if (exams.length === 0) {
      const legacyMarksRaw = await db
        .collection("marks")
        .find({
          schoolId: schoolObjectId,
          studentId: studentId,
        })
        .sort({ createdAt: -1 })
        .toArray();
      const legacyMarks = legacyMarksRaw
        .map((mark) => {
          if (mark?.examId && !activeExamIdSet.has(String(mark.examId))) return null;
          if (Array.isArray(mark?.scores) && mark.scores.length > 0) {
            const filteredScores = filterScoresByActiveSubjects(mark.scores, activeSubjectKeys);
            if (filteredScores.length === 0) return null;
            return { ...mark, scores: filteredScores };
          }
          const legacySubjectKey = normalizeSubjectName(mark?.subject || mark?.subjectName).toLowerCase();
          if (legacySubjectKey && !activeSubjectKeys.has(legacySubjectKey)) return null;
          return mark;
        })
        .filter(Boolean);
      return res.json({ exams: [], legacyMarks });
    }

    return res.json({ exams, legacyMarks: [] });
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
    if (String(req.user?.role || "").toUpperCase() !== "STUDENT") {
      return res.status(403).json({ error: "Access denied" });
    }

    const userObjectId = safeObjectId(req.user?.userId);
    const schoolId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    // ✅ TENANT SCOPED: Find student
    const student = await db.collection("students").findOne(activeStudentFilter({
      userId: userObjectId,
      schoolId,
    }));

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
        parentName: student.parentName || "",
        parentPhone: student.parentPhone || student.phone || "",
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

      const classFilter = {
        schoolId,
        class: String(className),
        ...(section ? { section: String(section) } : {}),
      };

      const activeStudents = await db.collection("students")
        .find(activeStudentFilter(classFilter))
        .project({ _id: 1, userId: 1 })
        .toArray();

      if (!activeStudents.length) {
        return res.json([]);
      }

      const attendanceKeyToStudentId = new Map();
      const validAttendanceKeys = [];
      for (const student of activeStudents) {
        const studentIdStr = String(student._id);
        attendanceKeyToStudentId.set(studentIdStr, studentIdStr);
        validAttendanceKeys.push(student._id);

        if (student.userId) {
          const userIdStr = String(student.userId);
          attendanceKeyToStudentId.set(userIdStr, studentIdStr);
          validAttendanceKeys.push(student.userId);
        }
      }

      const match = {
        ...classFilter,
        submissionStatus: "SUBMITTED",
        $or: [
          { studentId: { $in: validAttendanceKeys } },
          { studentUserId: { $in: validAttendanceKeys } },
        ],
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

      const merged = new Map();
      for (const row of agg || []) {
        const attendanceKey = row?._id ? String(row._id) : "";
        const canonicalStudentId = attendanceKeyToStudentId.get(attendanceKey);
        if (!canonicalStudentId) continue;
        const current = merged.get(canonicalStudentId) || { total: 0, present: 0 };
        current.total += Number(row?.total) || 0;
        current.present += Number(row?.present) || 0;
        merged.set(canonicalStudentId, current);
      }

      const out = Array.from(merged.entries()).map(([studentId, stats]) => ({
        studentId,
        total: stats.total,
        present: stats.present,
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
app.get('/debug/recent-students', requireAuth, requireRole("DEVELOPER"), async (req, res) => {
  try {
    const schoolId = safeObjectId(req.query.schoolId);
    if (!schoolId) return res.status(400).json({ error: "schoolId query param is required" });
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const backfill = req.query.backfill === '1' || req.query.backfill === 'true';
    const users = await db.collection('users')
      .find({ role: 'STUDENT', schoolId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const totalCount = await db.collection("users").countDocuments({ role: "STUDENT", schoolId });
    const out = [];
    let backfilled = 0;
    for (const u of users) {
      const student = await db.collection('students').findOne(activeStudentFilter({ userId: u._id, schoolId }));
      if (backfill && student && !student.email && u.email) {
        await db.collection('students').updateOne({ _id: student._id }, { $set: { email: u.email } });
        backfilled++;
      }
      out.push({ user: { _id: u._id, email: u.email, createdAt: u.createdAt }, student });
    }
    const result = {
      rows: out,
      backfilled,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    };
    res.json(result);
  } catch (err) {
    console.error('DEBUG ERROR:', err);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// DEBUG: Backfill students.email from users collection
app.post('/debug/backfill-student-emails', requireAuth, requireRole("DEVELOPER"), async (req, res) => {
  try {
    const schoolId = safeObjectId(req.query.schoolId || req.body?.schoolId);
    if (!schoolId) return res.status(400).json({ error: "schoolId is required" });
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const query = activeStudentFilter({ schoolId });
    const students = await db.collection('students').find(query).skip(skip).limit(limit).toArray();
    const totalCount = await db.collection("students").countDocuments(query);
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
    res.json({
      updated,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
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
        .find(activeStudentFilter({
          class: req.user.class,
          section: req.user.section,
          schoolId,
        }))
        .sort({ rollNo: 1 })
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
    const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
      userId: new ObjectId(req.user.userId),
      schoolId,
    }));

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
            const classValue = row.class ?? row.className;
            const { parentName, parentPhone } = extractParentContact(row);
            const identity = normalizeStudentIdentity({
              classValue,
              sectionValue: row.section,
              rollNo: row.rollNo,
            });
            if (!row.name || !identity.class || !identity.section || !identity.rollNo || !parentName || !parentPhone) {
              throw new Error("Missing required fields: name, class/className, section, rollNo, parentName, parentPhone");
            }
            if (!isValidParentPhone(parentPhone)) {
              throw new Error("Invalid parentPhone format");
            }

            const email =
              row.email ||
              `${row.name.replace(/\s+/g, "").toLowerCase()}@school.com`;
            const normalizedEmail = String(email || "").trim().toLowerCase();

            let user = await db.collection("users").findOne({ email: normalizedEmail });

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

            const duplicate = await db.collection("students").findOne({
              schoolId,
              class: identity.class,
              section: identity.section,
              rollNo: identity.rollNo,
              userId: { $ne: user._id },
            });
            if (duplicate) {
              throw new Error("Duplicate student identity found in school for class/section/rollNo");
            }

            await db.collection("students").updateOne(
              { userId: user._id, schoolId: schoolId },
              {
                $set: {
                  userId: user._id,
                  email: email,
                  name: row.name,
                  class: identity.class,
                  className: identity.class,
                  section: identity.section,
                  rollNo: identity.rollNo,
                  parentName,
                  parentPhone,
                  phone: parentPhone,
                  assignedTeacher: null,
                  isDeleted: false,
                  schoolId: schoolId,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );

            successCount++;
          } catch (rowError) {
            const safeMessage = isMongoDuplicateKeyError(rowError)
              ? "Student already exists for this class/section/rollNo in this school"
              : rowError.message;
            errorCount++;
            errors.push({
              row: row.name || "Unknown",
              error: safeMessage,
            });
            console.error("ROW ERROR:", safeMessage, row);
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
            const classValue = String(row.class ?? row.className ?? "").trim();
            const sectionValue = String(row.section ?? "").trim();
            const teacherPhone = extractTeacherPhone(row);

            if (!row.name || !classValue || !sectionValue) {
              throw new Error(`Missing required fields: name, class, or section`);
            }
            if (!isValidTeacherPhone(teacherPhone)) {
              throw new Error("Invalid phone format (must be 7-15 digits)");
            }

            const email =
              row.email ||
              `${row.name.replace(/\s+/g, "").toLowerCase()}@school.com`;

            let user = await db.collection("users").findOne({ email });

            if (!user) {
              const hash = await bcrypt.hash("teacher123", 10);

              const result = await db.collection("users").insertOne({
                email: normalizedEmail,
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
                  email: normalizedEmail,
                  name: row.name,
                  subject: row.subject || "",
                  class: classValue,
                  section: sectionValue,
                  phone: teacherPhone,
                  mobile: teacherPhone,
                  assignedStudents: [],
                  isDeleted: false,
                  schoolId: schoolId,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );

            successCount++;
          } catch (rowError) {
            const safeMessage = isMongoDuplicateKeyError(rowError)
              ? "Duplicate user or teacher identity"
              : rowError.message;
            errorCount++;
            errors.push({
              row: row.name || "Unknown",
              error: safeMessage,
            });
            console.error("ROW ERROR:", safeMessage, row);
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
      isDeleted: { $ne: true },
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
      isDeleted: { $ne: true },
    }).sort({ rollNo: 1 }).toArray();

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
      isDeleted: { $ne: true },
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
      isDeleted: { $ne: true },
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

    const studentsCursor = db
      .collection("students")
      .find(query)
      .project({
        name: 1,
        _id: 1,
        class: 1,
        section: 1,
        rollNo: 1,
        parentName: 1,
        parentPhone: 1,
        phone: 1,
        userId: 1,
        schoolId: 1,
      })
      .sort({ rollNo: 1 });

    const students = await (usePagination ? studentsCursor.skip(skip).limit(limit) : studentsCursor).toArray();
    const totalCount = usePagination ? await db.collection("students").countDocuments(query) : students.length;

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
    if (usePagination) {
      return res.json({
        data: studentsWithEmails,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }
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

    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    if (!teacherId) {
      return res.status(400).json({ error: "Invalid teacherId in token" });
    }

    if (req.user.class !== className || req.user.section !== section) {
      console.error("MARKS SAVE REJECTED: Teacher class/section mismatch");
      return res.status(403).json({ error: "You can only enter marks for your own class/section" });
    }

    const validStudents = await db.collection("students")
      .find(activeStudentFilter({ schoolId, class: String(className), section: String(section) }))
      .project({ _id: 1 })
      .toArray();
    const validStudentIds = new Set(validStudents.map((s) => String(s._id)));

    const docs = (records || [])
      .map((r) => {
        const studentId = safeObjectId(r.studentId || r.studentUserId);
        if (!studentId || !validStudentIds.has(String(studentId))) return null;
        return {
          schoolId,
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

    console.log("MARKS SAVE - schoolId:", schoolId, "subject:", subject, "records:", docs.length);

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
      console.log("MARKS INSERTED:", docs.length);
    }

    res.json({ success: true, count: docs.length });
  } catch (err) {
    console.error("SAVE MARKS ERROR:", err);
    res.status(500).json({ error: "Failed to save marks" });
  }
});
/* ================================
   IMPORT MULTI-SUBJECT MARKS (TEACHER)
   ================================= */
app.post("/api/teacher/marks/import-multi", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { class: classNameRaw, section: sectionRaw, examName, subjects, marks } = req.body || {};
    const className = String(classNameRaw || "").trim();
    const section = String(sectionRaw || "").trim();

    if (!className || !section || !examName) {
      return res.status(400).json({ error: "class, section and examName are required" });
    }
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "subjects[] is required" });
    }
    if (!Array.isArray(marks)) {
      return res.status(400).json({ error: "marks[] is required" });
    }

    if (String(req.user.class || "").trim() !== className || String(req.user.section || "").trim() !== section) {
      return res.status(403).json({ error: "You can only enter marks for your own class/section" });
    }

    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    if (!teacherId) return res.status(400).json({ error: "Invalid teacher ID" });
    const validStudents = await db.collection("students")
      .find(activeStudentFilter({ schoolId, class: className, section }))
      .project({ _id: 1 })
      .toArray();
    const validStudentIds = new Set(validStudents.map((s) => String(s._id)));

    const examDocs = await db.collection("exams")
      .find({
        schoolId,
        class: className,
        section,
        name: String(examName).trim(),
        subjectName: { $in: subjects.map((s) => String(s || "").trim()).filter(Boolean) },
        isDeleted: { $ne: true },
      })
      .toArray();

    const examBySubject = new Map();
    examDocs.forEach((ex) => examBySubject.set(String(ex.subjectName || "").trim(), ex));
    const missingExamSubjects = subjects.filter((sub) => !examBySubject.has(String(sub || "").trim()));
    if (missingExamSubjects.length > 0) {
      return res.status(400).json({ error: `Exam not found for subjects: ${missingExamSubjects.join(", ")} (Create exam entries first)` });
    }

    let savedCount = 0;
    const errors = [];
    for (const row of marks) {
      const studentId = safeObjectId(row?.studentId || row?.studentUserId);
      if (!studentId) {
        errors.push({ row, reason: "studentId missing/invalid" });
        continue;
      }
      if (!validStudentIds.has(String(studentId))) {
        errors.push({ row, reason: "Invalid studentId for this class/section" });
        continue;
      }
      const scores = row?.scores || {};

      for (const subject of subjects) {
        const subjectName = String(subject || "").trim();
        if (!subjectName) continue;

        if (!(subjectName in scores)) continue;
        const rawScore = scores[subjectName];
        if (rawScore === "" || rawScore === null || rawScore === undefined) continue;

        const examDoc = examBySubject.get(subjectName);
        if (!examDoc) continue;
        const subjectMaxMarks = Number(examDoc.maxMarks);
        const numericScore = Number(rawScore);
        if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > subjectMaxMarks) {
          errors.push({ row, reason: `Invalid score for ${subjectName}. Allowed range: 0 - ${subjectMaxMarks}` });
          continue;
        }

        await db.collection("marks").updateOne(
          {
            schoolId,
            examId: examDoc._id,
            studentId,
            class: className,
            section,
            subject: subjectName,
            exam: String(examName).trim(),
          },
          {
            $set: {
              schoolId,
              studentId,
              teacherId,
              class: className,
              section,
              subject: subjectName,
              examId: examDoc._id,
              exam: String(examName).trim(),
              examName: String(examName).trim(),
              marksObtained: numericScore,
              maxMarks: subjectMaxMarks,
              score: numericScore,
              date: new Date(),
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
        savedCount += 1;
      }
    }

    return res.json({ success: true, savedCount, failedCount: errors.length, errors });
  } catch (err) {
    console.error("MULTI MARKS IMPORT ERROR:", err);
    return res.status(500).json({ error: "Failed to import multi-subject marks" });
  }
});

app.post("/api/teacher/marks/bulk", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { examId, marks } = req.body || {};
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    const examObjectId = safeObjectId(examId);

    if (!examObjectId || !Array.isArray(marks)) {
      return res.status(400).json({ error: "examId and marks[] are required" });
    }

    const exam = await db.collection("exams").findOne({
      _id: examObjectId,
      schoolId,
      class: String(req.user.class || "").trim(),
      section: String(req.user.section || "").trim(),
      isDeleted: { $ne: true },
    });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const maxMarks = Number(exam.maxMarks);
    if (!(maxMarks > 0)) return res.status(400).json({ error: "Exam maxMarks is invalid" });

    let savedCount = 0;
    for (const row of marks) {
      const studentId = safeObjectId(row?.studentId || row?.studentUserId);
      const marksObtained = Number(row?.marksObtained);
      if (!studentId) continue;
      if (Number.isNaN(marksObtained) || marksObtained < 0 || marksObtained > maxMarks) {
        return res.status(400).json({ error: `Invalid marksObtained for a student. Allowed range: 0 - ${maxMarks}` });
      }

      await db.collection("marks").updateOne(
        { schoolId, examId: examObjectId, studentId },
        {
          $set: {
            schoolId,
            teacherId,
            examId: examObjectId,
            exam: exam.name,
            examName: exam.name,
            subject: exam.subjectName || "",
            class: exam.class,
            section: exam.section,
            studentId,
            marksObtained,
            score: marksObtained,
            maxMarks,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      savedCount += 1;
    }

    return res.json({ success: true, savedCount });
  } catch (err) {
    console.error("TEACHER MARKS BULK ERROR:", err);
    return res.status(500).json({ error: "Failed to save marks" });
  }
});

/* ================================
   TEACHER: GET MARKS MANUAL (V2)
   ================================= */
app.get("/api/teacher/marks/manual", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const examId = safeObjectId(req.query.examId);
    const teacherClass = String(req.user.class || "").trim();
    const teacherSection = String(req.user.section || "").trim();

    if (!examId) return res.status(400).json({ error: "examId is required" });

    const exam = await db.collection("exams").findOne({
      _id: examId,
      schoolId,
      class: teacherClass,
      section: teacherSection,
      isDeleted: { $ne: true },
    });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const marksDoc = await db.collection("marks").find({
      schoolId,
      examId,
      class: teacherClass,
      section: teacherSection,
      scores: { $exists: true },
    }).toArray();
    const examSubjectKeys = new Set(normalizeExamSubjects(exam.subjects).map((s) => s.name.toLowerCase()));

    const byStudent = {};
    marksDoc.forEach((doc) => {
      byStudent[String(doc.studentId)] = filterScoresByActiveSubjects(doc.scores || [], examSubjectKeys);
    });

    return res.json({ success: true, examId: examId.toString(), marksByStudent: byStudent });
  } catch (err) {
    console.error("TEACHER MANUAL MARKS FETCH ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch marks" });
  }
});

/* ================================
   TEACHER: SAVE MARKS MANUAL (V2)
   ================================= */
app.post("/api/teacher/marks/manual", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    const examId = safeObjectId(req.body?.examId);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const teacherClass = String(req.user.class || "").trim();
    const teacherSection = String(req.user.section || "").trim();

    if (!teacherId) return res.status(400).json({ error: "Invalid teacher ID" });
    if (!examId || rows.length === 0) return res.status(400).json({ error: "examId and rows[] are required" });

    const exam = await db.collection("exams").findOne({
      _id: examId,
      schoolId,
      class: teacherClass,
      section: teacherSection,
      isDeleted: { $ne: true },
    });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const subjects = normalizeExamSubjects(exam.subjects);
    if (subjects.length === 0) return res.status(400).json({ error: "Exam has no valid subjects/max marks configured" });
    const subjectMap = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

    const students = await db.collection("students").find(
      activeStudentFilter({
        schoolId,
        class: teacherClass,
        section: teacherSection,
      }),
      { projection: { _id: 1 } }
    ).toArray();
    const validStudentIds = new Set(students.map((s) => String(s._id)));

    const errors = [];
    let savedCount = 0;

    for (const row of rows) {
      const studentId = safeObjectId(row?.studentId || row?.studentUserId);
      if (!studentId || !validStudentIds.has(String(studentId))) {
        errors.push({ row, reason: "Invalid studentId for this class/section" });
        continue;
      }

      const scoreItems = Array.isArray(row?.scores) ? row.scores : [];
      const upsertScores = [];
      let rowInvalid = false;

      scoreItems.forEach((item) => {
        const subjectName = normalizeSubjectName(item?.subject);
        if (!subjectName) return;
        const subjectMeta = subjectMap.get(subjectName.toLowerCase());
        if (!subjectMeta) return; // Ignore unknown subject safely.

        const obtainedRaw = item?.obtained;
        if (obtainedRaw === "" || obtainedRaw === null || obtainedRaw === undefined) {
          upsertScores.push({ subject: subjectMeta.name, obtained: null });
          return;
        }

        const obtained = Number(obtainedRaw);
        if (Number.isNaN(obtained) || obtained < 0 || obtained > subjectMeta.maxMarks) {
          errors.push({ row, reason: `${subjectMeta.name}: obtained must be between 0 and ${subjectMeta.maxMarks}` });
          rowInvalid = true;
          return;
        }
        upsertScores.push({ subject: subjectMeta.name, obtained });
      });

      if (rowInvalid) continue;

      await db.collection("marks").updateOne(
        { schoolId, examId, studentId, class: teacherClass, section: teacherSection },
        {
          $set: {
            schoolId,
            examId,
            examName: exam.name,
            class: teacherClass,
            section: teacherSection,
            studentId,
            teacherId,
            scores: upsertScores,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      savedCount += 1;
    }

    return res.json({ success: true, savedCount, failedCount: errors.length, errors });
  } catch (err) {
    console.error("TEACHER MANUAL MARKS SAVE ERROR:", err);
    return res.status(500).json({ error: "Failed to save marks manually" });
  }
});

/* ================================
   TEACHER: IMPORT MARKS (V2)
   ================================= */
app.post("/api/teacher/marks/import", requireAuth, requireRole("TEACHER"), requireTenantId, upload.single("file"), async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    const examId = safeObjectId(req.body?.examId);
    const teacherClass = String(req.user.class || "").trim();
    const teacherSection = String(req.user.section || "").trim();

    if (!teacherId) return res.status(400).json({ error: "Invalid teacher ID" });
    if (!examId) return res.status(400).json({ error: "examId is required" });

    const exam = await db.collection("exams").findOne({
      _id: examId,
      schoolId,
      class: teacherClass,
      section: teacherSection,
      isDeleted: { $ne: true },
    });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const subjects = normalizeExamSubjects(exam.subjects);
    if (subjects.length === 0) return res.status(400).json({ error: "Exam has no valid subjects/max marks configured" });
    const subjectMap = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

    let rows = [];
    if (req.file) {
      const ext = String(path.extname(req.file.originalname || "")).toLowerCase();
      if (ext === ".csv") {
        const text = fs.readFileSync(req.file.path, "utf8");
        rows = parseCsvTextRows(text);
      } else if (ext === ".xlsx" || ext === ".xls") {
        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      } else {
        return res.status(400).json({ error: "Invalid file type. Only Excel (.xlsx, .xls) and CSV are supported." });
      }
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No import rows found. Upload an Excel or CSV file." });
    }

    const students = await db.collection("students")
      .find(activeStudentFilter({ schoolId, class: teacherClass, section: teacherSection }))
      .project({ _id: 1 })
      .toArray();
    const validStudentIds = new Set(students.map((s) => String(s._id)));

    let savedCount = 0;
    const errors = [];
    const normalizedRows = rows.slice(0, 5000); // hard limit for safety

    for (let idx = 0; idx < normalizedRows.length; idx += 1) {
      const row = normalizedRows[idx] || {};
      const studentId = safeObjectId(row.studentId ?? row.studentUserId ?? row.StudentId ?? row.StudentID);
      if (!studentId || !validStudentIds.has(String(studentId))) {
        errors.push({ rowNumber: idx + 2, reason: "Valid studentId is required for this class/section", row });
        continue;
      }

      const scores = [];
      let invalid = false;
      for (const subject of subjects) {
        const subjectName = subject.name;
        const rawValue =
          row[subjectName] ??
          row[subjectName.toLowerCase()] ??
          row[subjectName.toUpperCase()] ??
          row[String(subjectName).replace(/\s+/g, "")];

        if (rawValue === "" || rawValue === null || rawValue === undefined) {
          scores.push({ subject: subjectName, obtained: null });
          continue;
        }

        const value = Number(rawValue);
        if (Number.isNaN(value) || value < 0 || value > subject.maxMarks) {
          invalid = true;
          errors.push({
            rowNumber: idx + 2,
            reason: `${subjectName}: obtained must be between 0 and ${subject.maxMarks}`,
            row,
          });
          break;
        }
        scores.push({ subject: subjectName, obtained: value });
      }

      if (invalid) continue;

      await db.collection("marks").updateOne(
        {
          schoolId,
          examId,
          class: teacherClass,
          section: teacherSection,
          studentId,
        },
        {
          $set: {
            schoolId,
            examId,
            examName: exam.name,
            class: teacherClass,
            section: teacherSection,
            studentId,
            teacherId,
            scores,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      savedCount += 1;
    }

    return res.json({
      success: true,
      savedCount,
      failedCount: errors.length,
      errors,
      acceptedSubjects: subjects.map((s) => s.name),
    });
  } catch (err) {
    console.error("TEACHER MARKS IMPORT ERROR:", err);
    return res.status(500).json({ error: "Failed to import marks" });
  } finally {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore temp cleanup failure
      }
    }
  }
});

/* ================================
   TEACHER: GET STUDENT ANALYTICS
   ================================= */
app.get("/api/teacher/students/:studentId/analytics", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    if (String(req.user?.role || "").toUpperCase() !== "TEACHER") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { studentId } = req.params;
    const schoolId = req.user.schoolIdObj;
    
    const studentIdObj = safeObjectId(studentId);
    if (!studentIdObj) {
      return res.status(400).json({ error: "Invalid studentId" });
    }

    // ✅ Fetch student details
    const student = await db.collection("students").findOne(activeStudentFilter({
      _id: studentIdObj,
      schoolId,
    }));

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
   ADMIN: MANUAL CREATE STUDENT & TEACHER
   ================================= */
app.post("/api/admin/add-student", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { name, email, rollNo, className, section, password } = req.body;
    const { parentName, parentPhone } = extractParentContact(req.body);
    if (!name || !email) return res.status(400).json({ error: "Missing name or email" });
    if (!parentName) return res.status(400).json({ error: "parentName is required" });
    if (!parentPhone) return res.status(400).json({ error: "parentPhone is required" });
    if (!isValidParentPhone(parentPhone)) return res.status(400).json({ error: "Invalid parentPhone format" });
    const schoolId = req.user.schoolIdObj;
    if (!schoolId) return res.status(400).json({ error: "Missing schoolId" });
    const identity = normalizeStudentIdentity({ classValue: className, sectionValue: section, rollNo });
    if (!identity.class || !identity.section || !identity.rollNo) {
      return res.status(400).json({ error: "class, section and rollNo are required" });
    }

    const usersCol = db.collection("users");
    const studentsCol = db.collection("students");

    const existing = await usersCol.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ error: "User with this email already exists" });

    const duplicateStudent = await findStudentIdentityConflict({
      schoolId,
      classValue: identity.class,
      sectionValue: identity.section,
      rollNo: identity.rollNo,
    });
    if (duplicateStudent) {
      return res.status(400).json({ error: "Student already exists for this class/section/rollNo in this school" });
    }

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
      class: identity.class,
      className: identity.class,
      section: identity.section,
      rollNo: identity.rollNo,
      parentName,
      parentPhone,
      phone: parentPhone,
      assignedTeacher: null,
      isDeleted: false,
      schoolId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await studentsCol.insertOne(studentDoc);
    } catch (insertError) {
      if (isMongoDuplicateKeyError(insertError)) {
        await usersCol.deleteOne({ _id: userId });
        return res.status(400).json({ error: "Student already exists for this class/section/rollNo in this school" });
      }
      throw insertError;
    }

    res.json({ success: true, userId: String(userId), password: pwd });
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      return res.status(400).json({ error: "Duplicate user or student identity" });
    }
    console.error("ADMIN ADD STUDENT ERROR:", err);
    res.status(500).json({ error: "Failed to add student" });
  }
});

app.post("/api/admin/add-teacher", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { name, email, className, section, password, subject } = req.body;
    const teacherPhone = extractTeacherPhone(req.body);
    if (!name || !email) return res.status(400).json({ error: "Missing name or email" });
    if (!isValidTeacherPhone(teacherPhone)) {
      return res.status(400).json({ error: "Invalid phone format (must be 7-15 digits)" });
    }
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
      email: String(email).toLowerCase(),
      name,
      subject: subject || "",
      class: String(className ?? ""),
      section: String(section ?? ""),
      phone: teacherPhone,
      mobile: teacherPhone,
      assignedStudents: [],
      isDeleted: false,
      schoolId,
      createdAt: new Date(),
    };

    await teachersCol.updateOne({ userId }, { $set: teacherDoc }, { upsert: true });

    res.json({ success: true, userId: String(userId), password: pwd });
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      return res.status(400).json({ error: "Duplicate user or teacher identity" });
    }
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
      const rawName = req.body?.name ?? req.body?.subjectName;
      const name = String(rawName || "").trim();
      const cls = String(req.body?.class || "").trim();
      const section = String(req.body?.section || "").trim();

      if (!name || !cls || !section) {
        return res.status(400).json({ error: "name, class, and section are required" });
      }

      const schoolId = req.user.schoolIdObj; // From requireTenantId middleware
      console.log("CREATE SUBJECT - Input:", { name, cls, section, schoolId });

      // Check if subject already exists for this class/section in this school
      const existing = await db.collection("subjects").findOne({
        name,
        class: cls,
        section,
        schoolId,
        isDeleted: { $ne: true },
      });

      if (existing) {
        return res.status(400).json({ error: "Subject already exists for this class/section" });
      }

      const newSubject = {
        name,
        subjectName: name,
        class: cls,
        section,
        schoolId,
        isDeleted: false,
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
          isDeleted: { $ne: true },
        })
        .sort({ name: 1, subjectName: 1 })
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
   ADMIN: UPDATE SUBJECT
   ================================= */
app.put(
  "/api/admin/subjects/:id",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const subjectId = safeObjectId(req.params.id);
      const schoolId = req.user.schoolIdObj;
      const rawName = req.body?.name ?? req.body?.subjectName;
      const name = String(rawName || "").trim();
      const cls = String(req.body?.class || "").trim();
      const section = String(req.body?.section || "").trim();

      if (!subjectId || !schoolId) return res.status(400).json({ error: "Invalid subject id or schoolId" });
      if (!name || !cls || !section) {
        return res.status(400).json({ error: "name, class, and section are required" });
      }

      const duplicate = await db.collection("subjects").findOne({
        _id: { $ne: subjectId },
        schoolId,
        class: cls,
        section,
        name,
        isDeleted: { $ne: true },
      });
      if (duplicate) return res.status(400).json({ error: "Subject already exists for this class/section" });

      const result = await db.collection("subjects").updateOne(
        { _id: subjectId, schoolId, isDeleted: { $ne: true } },
        {
          $set: {
            name,
            subjectName: name,
            class: cls,
            section,
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) return res.status(404).json({ error: "Subject not found" });
      console.log("UPDATE SUBJECT - ID:", subjectId.toString(), "Class:", cls, "Section:", section, "Name:", name);
      res.json({ success: true });
    } catch (err) {
      console.error("UPDATE SUBJECT ERROR:", err);
      res.status(500).json({ error: "Failed to update subject" });
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
      const subjectId = safeObjectId(req.params.id);
      if (!subjectId || !schoolId) return res.status(400).json({ error: "Invalid subject id or schoolId" });
      
      const existingSubject = await db.collection("subjects").findOne(
        { _id: subjectId, schoolId, isDeleted: { $ne: true } },
        { projection: { name: 1, subjectName: 1 } }
      );
      if (!existingSubject) return res.status(404).json({ error: "Subject not found" });

      // Best-effort reference warning only, deletion is still allowed
      const usageCount = await db.collection("marks").countDocuments({
        schoolId,
        subject: { $in: [String(existingSubject.name || ""), String(existingSubject.subjectName || "")] },
      });
      if (usageCount > 0) {
        console.warn("DELETE SUBJECT WARNING - Subject may be referenced in marks:", subjectId.toString(), "usageCount:", usageCount);
      }

      const result = await db.collection("subjects").updateOne(
        { _id: subjectId, schoolId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: safeObjectId(req.user.userId) } }
      );

      console.log("DELETE SUBJECT - Soft deleted:", subjectId.toString());
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
      const type = String(req.query.type || "").trim().toLowerCase();
      const { page, limit, skip } = getPagination(req.query, { limit: 20 });
      const search = String(req.query.search || "").trim();
      const className = String(req.query.className || "").trim();
      const section = String(req.query.section || "").trim();
      const searchRegex = search ? new RegExp(escapeRegex(search), "i") : null;

      const studentsQuery = activeStudentFilter({ schoolId });
      const teachersQuery = activeTeacherFilter({ schoolId });

      if (type === "students") {
        if (searchRegex) studentsQuery.$or = [{ name: searchRegex }, { email: searchRegex }];
        if (className) studentsQuery.$and = [{ $or: [{ class: className }, { className }] }];
        if (section) studentsQuery.section = section;
        const [data, totalCount] = await Promise.all([
          db
            .collection("students")
            .find(studentsQuery)
            .project({ name: 1, _id: 1, class: 1, section: 1, rollNo: 1, parentName: 1, parentPhone: 1, phone: 1, email: 1, assignedTeacher: 1 })
            .sort({ rollNo: 1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
          db.collection("students").countDocuments(studentsQuery),
        ]);
        return res.json({
          data,
          page,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          totalCount,
        });
      }

      if (type === "teachers") {
        if (searchRegex) {
          teachersQuery.$or = [{ name: searchRegex }, { email: searchRegex }];
        }
        if (className) teachersQuery.class = className;
        if (section) teachersQuery.section = section;
        const [data, totalCount] = await Promise.all([
          db
            .collection("teachers")
            .find(teachersQuery)
            .project({ name: 1, _id: 1, class: 1, section: 1, subject: 1, email: 1, assignedStudents: 1, phone: 1, mobile: 1, contact: 1, contactNumber: 1 })
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
          db.collection("teachers").countDocuments(teachersQuery),
        ]);
        return res.json({
          data,
          page,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          totalCount,
        });
      }

      const students = await db
        .collection("students")
        .find(studentsQuery)
        .project({ name: 1, _id: 1, class: 1, section: 1, rollNo: 1, parentName: 1, parentPhone: 1, phone: 1, email: 1, assignedTeacher: 1 })
        .sort({ rollNo: 1 })
        .toArray();
      const teachers = await db
        .collection("teachers")
        .find(teachersQuery)
        .project({ name: 1, _id: 1, class: 1, section: 1, subject: 1, email: 1, assignedStudents: 1, phone: 1, mobile: 1, contact: 1, contactNumber: 1 })
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
   ADMIN: BULK DELETE TEACHERS (SOFT DELETE)
   ================================= */
app.post(
  "/api/admin/teachers/bulk-delete",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const teacherIds = parseTeacherObjectIds(req.body?.ids || req.body?.teacherIds);

      if (!schoolId) return res.status(400).json({ error: "Invalid schoolId" });
      if (!teacherIds.length) return res.status(400).json({ error: "ids array is required" });

      const existingTeachers = await db.collection("teachers")
        .find({ _id: { $in: teacherIds }, schoolId })
        .project({ _id: 1, isDeleted: 1 })
        .toArray();

      const existingSet = new Set(existingTeachers.map((t) => String(t._id)));
      const failed = teacherIds
        .filter((id) => !existingSet.has(String(id)))
        .map((id) => ({ id: String(id), reason: "Teacher not found" }));

      const activeIds = existingTeachers.filter((t) => t.isDeleted !== true).map((t) => t._id);

      const operation = await runBestEffortTransaction("BULK_DELETE_TEACHERS", async (session) => {
        await removeTeacherReferences({ schoolId, teacherIds: activeIds, session });
        const options = session ? { session } : {};
        return db.collection("teachers").updateMany(
          activeTeacherFilter({ _id: { $in: activeIds }, schoolId }),
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: safeObjectId(req.user.userId) } },
          options
        );
      });

      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId: safeObjectId(req.user.userId),
        action: "BULK_DELETE_TEACHERS_SOFT",
        targetType: "TEACHER",
        timestamp: new Date(),
        details: { requestedCount: teacherIds.length, affectedCount: operation.modifiedCount, failedCount: failed.length },
      });

      return res.json({ affectedCount: operation.modifiedCount, failed });
    } catch (err) {
      console.error("❌ BULK DELETE TEACHERS ERROR:", err);
      return res.status(500).json({ error: "Failed to bulk delete teachers" });
    }
  }
);

/* ================================
   ADMIN: BULK RESTORE TEACHERS
   ================================= */
app.post(
  "/api/admin/teachers/bulk-restore",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const snapshots = Array.isArray(req.body?.items) ? req.body.items : [];
      const requestedIds = snapshots.length
        ? parseTeacherObjectIds(snapshots.map((t) => t?._id))
        : parseTeacherObjectIds(req.body?.ids || req.body?.teacherIds);

      if (!schoolId) return res.status(400).json({ error: "Invalid schoolId" });
      if (!requestedIds.length) return res.status(400).json({ error: "items or ids are required" });

      const snapshotMap = new Map(
        snapshots.map((raw) => normalizeTeacherSnapshot(raw)).filter((t) => t?._id).map((t) => [String(t._id), t])
      );

      const warnings = [];
      const failed = [];
      const restoredIds = [];

      await runBestEffortTransaction("BULK_RESTORE_TEACHERS", async (session) => {
        const options = session ? { session } : {};

        for (const teacherId of requestedIds) {
          const existing = await db.collection("teachers").findOne({ _id: teacherId, schoolId }, { projection: { _id: 1 } });
          if (!existing) {
            failed.push({ id: String(teacherId), reason: "Teacher not found" });
            continue;
          }

          const snapshot = snapshotMap.get(String(teacherId));
          const nextState = { isDeleted: false, deletedAt: null, deletedBy: null, restoredAt: new Date() };

          if (snapshot) {
            if (snapshot.class !== undefined) nextState.class = String(snapshot.class || "Unassigned");
            if (snapshot.section !== undefined) nextState.section = String(snapshot.section || "Unassigned");
            if (snapshot.subject !== undefined) nextState.subject = snapshot.subject;
          }

          if (!nextState.class || !nextState.section) {
            nextState.class = "Unassigned";
            nextState.section = "Unassigned";
            warnings.push({ id: String(teacherId), reason: "Class/section missing, restored as Unassigned" });
          }

          await db.collection("teachers").updateOne({ _id: teacherId, schoolId }, { $set: nextState }, options);
          restoredIds.push(teacherId);
        }

        await removeTeacherReferences({ schoolId, teacherIds: restoredIds, session });

        for (const teacherId of restoredIds) {
          const teacher = await db.collection("teachers").findOne(
            activeTeacherFilter({ _id: teacherId, schoolId }),
            { projection: { _id: 1, class: 1, section: 1, subject: 1 } }
          );
          if (!teacher) continue;

          await Promise.all([
            db.collection("classAssignments").updateMany(
              { schoolId, class: String(teacher.class || ""), section: String(teacher.section || "") },
              { $addToSet: { teacherIds: teacher._id } },
              options
            ),
            db.collection("classSections").updateMany(
              { schoolId, class: String(teacher.class || ""), section: String(teacher.section || "") },
              { $addToSet: { teacherIds: teacher._id } },
              options
            ),
            db.collection("classSectionMappings").updateMany(
              { schoolId, class: String(teacher.class || ""), section: String(teacher.section || "") },
              { $addToSet: { teacherIds: teacher._id } },
              options
            ),
            db.collection("subjectMappings").updateMany(
              { schoolId, subjectName: teacher.subject },
              { $addToSet: { teacherIds: teacher._id } },
              options
            ),
          ]);
        }
      });

      return res.json({ affectedCount: restoredIds.length, failed, warnings });
    } catch (err) {
      console.error("❌ BULK RESTORE TEACHERS ERROR:", err);
      return res.status(500).json({ error: "Failed to bulk restore teachers" });
    }
  }
);

/* ================================
   ADMIN: BULK UPDATE TEACHERS
   ================================= */
app.post(
  "/api/admin/teachers/bulk-update",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const teacherIds = parseTeacherObjectIds(req.body?.ids || req.body?.teacherIds);
      const updates = req.body?.updates || {};

      if (!schoolId) return res.status(400).json({ error: "Invalid schoolId" });
      if (!teacherIds.length) return res.status(400).json({ error: "ids array is required" });

      const setDoc = {};
      const mappedClass = updates.assignedClass ?? updates.class;
      const mappedSection = updates.assignedSection ?? updates.section;
      const mappedSubjects = updates.subjects ?? updates.subject;
      const mappedPhone = updates.phone ?? updates.mobile ?? updates.contact ?? updates.contactNumber;

      if (mappedClass !== undefined) {
        const value = String(mappedClass || "").trim();
        if (!value) return res.status(400).json({ error: "assignedClass/class cannot be empty" });
        setDoc.class = value;
      }
      if (mappedSection !== undefined) {
        const value = String(mappedSection || "").trim();
        if (!value) return res.status(400).json({ error: "assignedSection/section cannot be empty" });
        setDoc.section = value;
      }
      if (mappedSubjects !== undefined) {
        setDoc.subject = Array.isArray(mappedSubjects) ? mappedSubjects.filter(Boolean) : String(mappedSubjects || "").trim();
      }
      if (mappedPhone !== undefined) {
        const value = String(mappedPhone || "").trim();
        if (!isValidTeacherPhone(value)) return res.status(400).json({ error: "Invalid phone format (must be 7-15 digits)" });
        setDoc.phone = value;
        setDoc.mobile = value;
      }

      if (!Object.keys(setDoc).length) {
        return res.status(400).json({ error: "No supported updates provided" });
      }

      const existingTeachers = await db.collection("teachers").find({ _id: { $in: teacherIds }, schoolId }).project({ _id: 1 }).toArray();
      const existingSet = new Set(existingTeachers.map((t) => String(t._id)));
      const failed = teacherIds.filter((id) => !existingSet.has(String(id))).map((id) => ({ id: String(id), reason: "Teacher not found" }));

      const updateResult = await runBestEffortTransaction("BULK_UPDATE_TEACHERS", async (session) => {
        const options = session ? { session } : {};
        const result = await db.collection("teachers").updateMany(
          activeTeacherFilter({ _id: { $in: teacherIds }, schoolId }),
          { $set: { ...setDoc, updatedAt: new Date(), updatedBy: safeObjectId(req.user.userId) } },
          options
        );

        if (setDoc.class !== undefined || setDoc.section !== undefined || setDoc.subject !== undefined) {
          await Promise.all([
            db.collection("classAssignments").updateMany({ schoolId }, { $pull: { teacherIds: { $in: teacherIds } } }, options),
            db.collection("classSections").updateMany({ schoolId }, { $pull: { teacherIds: { $in: teacherIds } } }, options),
            db.collection("classSectionMappings").updateMany({ schoolId }, { $pull: { teacherIds: { $in: teacherIds } } }, options),
            db.collection("subjectMappings").updateMany({ schoolId }, { $pull: { teacherIds: { $in: teacherIds } } }, options),
          ]);

          const updatedTeachers = await db.collection("teachers")
            .find(activeTeacherFilter({ _id: { $in: teacherIds }, schoolId }), { session })
            .project({ _id: 1, class: 1, section: 1, subject: 1 })
            .toArray();

          for (const teacher of updatedTeachers) {
            await Promise.all([
              db.collection("classAssignments").updateMany(
                { schoolId, class: String(teacher.class || ""), section: String(teacher.section || "") },
                { $addToSet: { teacherIds: teacher._id } },
                options
              ),
              db.collection("classSections").updateMany(
                { schoolId, class: String(teacher.class || ""), section: String(teacher.section || "") },
                { $addToSet: { teacherIds: teacher._id } },
                options
              ),
              db.collection("classSectionMappings").updateMany(
                { schoolId, class: String(teacher.class || ""), section: String(teacher.section || "") },
                { $addToSet: { teacherIds: teacher._id } },
                options
              ),
              db.collection("subjectMappings").updateMany(
                { schoolId, subjectName: teacher.subject },
                { $addToSet: { teacherIds: teacher._id } },
                options
              ),
            ]);
          }
        }

        return result;
      });

      return res.json({ affectedCount: updateResult.modifiedCount, failed });
    } catch (err) {
      console.error("❌ BULK UPDATE TEACHERS ERROR:", err);
      return res.status(500).json({ error: "Failed to bulk update teachers" });
    }
  }
);

/* ================================
   ADMIN: BULK REVERT TEACHERS (UNDO UPDATE)
   ================================= */
app.post(
  "/api/admin/teachers/bulk-revert",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const snapshots = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!schoolId) return res.status(400).json({ error: "Invalid schoolId" });
      if (!snapshots.length) return res.status(400).json({ error: "items snapshot array is required" });

      const parsedSnapshots = snapshots.map((raw) => normalizeTeacherSnapshot(raw)).filter((t) => t?._id);
      const teacherIds = parsedSnapshots.map((t) => t._id);
      const warnings = [];
      const failed = [];

      await runBestEffortTransaction("BULK_REVERT_TEACHERS", async (session) => {
        const options = session ? { session } : {};
        await removeTeacherReferences({ schoolId, teacherIds, session });

        for (const snapshot of parsedSnapshots) {
          const existing = await db.collection("teachers").findOne({ _id: snapshot._id, schoolId }, { projection: { _id: 1 } });
          if (!existing) {
            failed.push({ id: String(snapshot._id), reason: "Teacher not found" });
            continue;
          }

          const assignedStudents = parseStudentObjectIds(snapshot.assignedStudents || []);
          const validStudents = [];
          for (const studentId of assignedStudents) {
            const student = await db.collection("students").findOne(activeStudentFilter({ _id: studentId, schoolId }), { projection: { _id: 1 } });
            if (student) validStudents.push(student._id);
          }
          if (assignedStudents.length !== validStudents.length) {
            warnings.push({ id: String(snapshot._id), reason: "Some assigned students could not be restored" });
          }

          await db.collection("teachers").updateOne(
            { _id: snapshot._id, schoolId },
            {
              $set: {
                name: snapshot.name,
                email: snapshot.email,
                class: String(snapshot.class || ""),
                section: String(snapshot.section || ""),
                subject: snapshot.subject || "",
                assignedStudents: validStudents,
                isDeleted: snapshot.isDeleted === true,
                updatedAt: new Date(),
                updatedBy: safeObjectId(req.user.userId),
              },
            },
            options
          );

          if (snapshot.isDeleted !== true) {
            if (validStudents.length) {
              await db.collection("students").updateMany(
                { _id: { $in: validStudents }, schoolId },
                { $set: { assignedTeacher: snapshot._id } },
                options
              );
            }

            await Promise.all([
              db.collection("classAssignments").updateMany(
                { schoolId, class: String(snapshot.class || ""), section: String(snapshot.section || "") },
                { $addToSet: { teacherIds: snapshot._id } },
                options
              ),
              db.collection("classSections").updateMany(
                { schoolId, class: String(snapshot.class || ""), section: String(snapshot.section || "") },
                { $addToSet: { teacherIds: snapshot._id } },
                options
              ),
              db.collection("classSectionMappings").updateMany(
                { schoolId, class: String(snapshot.class || ""), section: String(snapshot.section || "") },
                { $addToSet: { teacherIds: snapshot._id } },
                options
              ),
              db.collection("subjectMappings").updateMany(
                { schoolId, subjectName: snapshot.subject },
                { $addToSet: { teacherIds: snapshot._id } },
                options
              ),
            ]);
          }
        }
      });

      return res.json({ affectedCount: parsedSnapshots.length - failed.length, failed, warnings });
    } catch (err) {
      console.error("❌ BULK REVERT TEACHERS ERROR:", err);
      return res.status(500).json({ error: "Failed to revert teachers" });
    }
  }
);

/* ================================
   ADMIN: DELETE TEACHER (SOFT, BACKWARD COMPAT)
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

      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({ _id: teacherId, schoolId }));
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      await runBestEffortTransaction("DELETE_TEACHER_SOFT", async (session) => {
        await removeTeacherReferences({ schoolId, teacherIds: [teacherId], session });
        const options = session ? { session } : {};
        await db.collection("teachers").updateOne(
          { _id: teacherId, schoolId },
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: safeObjectId(req.user.userId) } },
          options
        );
      });

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

      console.log("✅ TEACHER SOFT-DELETED:", teacher.name, "ID:", teacherId);
      res.json({ success: true, message: `Teacher ${teacher.name} deleted` });
    } catch (err) {
      console.error("❌ DELETE TEACHER ERROR:", err);
      res.status(500).json({ error: "Failed to delete teacher" });
    }
  }
);

/* ================================
   ADMIN: BULK DELETE STUDENTS (SOFT DELETE)
   ================================= */
app.post(
  "/api/admin/students/bulk-delete",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const studentIds = parseStudentObjectIds(req.body?.ids || req.body?.studentIds);

      if (!schoolId) return res.status(400).json({ error: "Invalid schoolId" });
      if (!studentIds.length) return res.status(400).json({ error: "studentIds array is required" });

      const existingStudents = await db.collection("students").find({
        _id: { $in: studentIds },
        schoolId,
      }).project({ _id: 1, name: 1, isDeleted: 1 }).toArray();

      const existingSet = new Set(existingStudents.map((s) => String(s._id)));
      const failed = studentIds
        .filter((id) => !existingSet.has(String(id)))
        .map((id) => ({ id: String(id), reason: "Student not found" }));

      const activeIds = existingStudents.filter((s) => s.isDeleted !== true).map((s) => s._id);

      const operation = await runBestEffortTransaction("BULK_DELETE_STUDENTS", async (session) => {
        await removeStudentReferences({ schoolId, studentIds: activeIds, session });
        const options = session ? { session } : {};
        return db.collection("students").updateMany(
          activeStudentFilter({
            _id: { $in: activeIds },
            schoolId,
          }),
          {
            $set: {
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: safeObjectId(req.user.userId),
            },
          },
          options
        );
      });

      await db.collection("adminLogs").insertOne({
        schoolId,
        adminId: safeObjectId(req.user.userId),
        action: "BULK_DELETE_STUDENTS_SOFT",
        targetType: "STUDENT",
        timestamp: new Date(),
        details: {
          requestedCount: studentIds.length,
          affectedCount: operation.modifiedCount,
          failedCount: failed.length,
        },
      });

      return res.json({
        affectedCount: operation.modifiedCount,
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
      const snapshots = Array.isArray(req.body?.items)
        ? req.body.items
        : Array.isArray(req.body?.students)
          ? req.body.students
          : [];
      const requestedIds = snapshots.length
        ? parseStudentObjectIds(snapshots.map((s) => s?._id))
        : parseStudentObjectIds(req.body?.ids || req.body?.studentIds);

      if (!schoolId) return res.status(400).json({ error: "Invalid schoolId" });
      if (!requestedIds.length) return res.status(400).json({ error: "students or studentIds are required" });

      const snapshotMap = new Map(
        snapshots
          .map((raw) => normalizeStudentSnapshot(raw))
          .filter((s) => s?._id)
          .map((s) => [String(s._id), s])
      );

      const warnings = [];
      const failed = [];
      const options = {};
      const restoreIds = [];

      await runBestEffortTransaction("BULK_RESTORE_STUDENTS", async (session) => {
        if (session) options.session = session;

        for (const studentId of requestedIds) {
          const existing = await db.collection("students").findOne(
            { _id: studentId, schoolId },
            { projection: { _id: 1, assignedTeacher: 1, class: 1, section: 1 } }
          );

          if (!existing) {
            failed.push({ id: String(studentId), reason: "Student not found" });
            continue;
          }

          const snapshot = snapshotMap.get(String(studentId));
          const nextState = {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            restoredAt: new Date(),
          };

          if (snapshot) {
            if (snapshot.class !== undefined) nextState.class = String(snapshot.class || "");
            if (snapshot.className !== undefined) nextState.className = String(snapshot.className || snapshot.class || "");
            if (snapshot.section !== undefined) nextState.section = String(snapshot.section || "");

            if (snapshot.assignedTeacher) {
              const teacherExists = await db.collection("teachers").findOne(
                activeTeacherFilter({ _id: snapshot.assignedTeacher, schoolId }),
                { projection: { _id: 1 } }
              );
              if (teacherExists) {
                nextState.assignedTeacher = snapshot.assignedTeacher;
              } else {
                nextState.assignedTeacher = null;
                nextState.class = "Unassigned";
                nextState.className = "Unassigned";
                nextState.section = "Unassigned";
                warnings.push({ id: String(studentId), reason: "Original teacher not found, restored as Unassigned" });
              }
            }
          }

          await db.collection("students").updateOne({ _id: studentId, schoolId }, { $set: nextState }, options);
          restoreIds.push(studentId);
        }

        if (!restoreIds.length) return;

        await removeStudentReferences({ schoolId, studentIds: restoreIds, session });

        for (const studentId of restoreIds) {
          const student = await db.collection("students").findOne(
            activeStudentFilter({ _id: studentId, schoolId }),
            { projection: { _id: 1, assignedTeacher: 1, class: 1, section: 1 } }
          );
          if (!student) continue;

          if (student.assignedTeacher) {
            await db.collection("teachers").updateOne(
              { _id: student.assignedTeacher, schoolId },
              { $addToSet: { assignedStudents: student._id } },
              options
            );
          }

          await Promise.all([
            db.collection("classSections").updateMany(
              {
                schoolId,
                class: String(student.class || ""),
                section: String(student.section || ""),
              },
              { $addToSet: { studentIds: student._id, students: student._id } },
              options
            ),
            db.collection("classSectionMappings").updateMany(
              {
                schoolId,
                class: String(student.class || ""),
                section: String(student.section || ""),
              },
              { $addToSet: { studentIds: student._id, students: student._id } },
              options
            ),
          ]);
        }
      });

      return res.json({
        affectedCount: restoreIds.length,
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
      const studentIds = parseStudentObjectIds(req.body?.ids || req.body?.studentIds);
      const updates = req.body?.updates || {};

      if (!schoolId) return res.status(400).json({ error: "Invalid schoolId" });
      if (!studentIds.length) return res.status(400).json({ error: "studentIds array is required" });

      const setDoc = {};
      if (updates.class !== undefined) {
        const classValue = String(updates.class || "").trim();
        if (!classValue) return res.status(400).json({ error: "class cannot be empty" });
        setDoc.class = classValue;
        setDoc.className = classValue;
      }

      if (updates.section !== undefined) {
        const sectionValue = String(updates.section || "").trim();
        if (!sectionValue) return res.status(400).json({ error: "section cannot be empty" });
        setDoc.section = sectionValue;
      }

      if (updates.assignedTeacher !== undefined) {
        if (!updates.assignedTeacher) {
          setDoc.assignedTeacher = null;
        } else {
          const teacherId = safeObjectId(updates.assignedTeacher);
          if (!teacherId) return res.status(400).json({ error: "Invalid assignedTeacher id" });
          const teacherExists = await db.collection("teachers").findOne(activeTeacherFilter({ _id: teacherId, schoolId }), { projection: { _id: 1 } });
          if (!teacherExists) return res.status(400).json({ error: "Assigned teacher not found" });
          setDoc.assignedTeacher = teacherId;
        }
      }

      if (updates.parentName !== undefined) {
        const parentNameValue = String(updates.parentName || "").trim();
        if (!parentNameValue) return res.status(400).json({ error: "parentName cannot be empty" });
        setDoc.parentName = parentNameValue;
      }

      if (updates.parentPhone !== undefined || updates.phone !== undefined) {
        const parentPhoneValue = String(updates.parentPhone ?? updates.phone ?? "").trim();
        if (!parentPhoneValue) return res.status(400).json({ error: "parentPhone cannot be empty" });
        if (!isValidParentPhone(parentPhoneValue)) return res.status(400).json({ error: "Invalid parentPhone format" });
        setDoc.parentPhone = parentPhoneValue;
        setDoc.phone = parentPhoneValue;
      }

      if (!Object.keys(setDoc).length) {
        return res.status(400).json({ error: "No supported updates provided (class, section, assignedTeacher, parentName, parentPhone)" });
      }

      const failed = [];
      const existingStudents = await db.collection("students")
        .find({ _id: { $in: studentIds }, schoolId })
        .project({ _id: 1, class: 1, section: 1, rollNo: 1 })
        .toArray();
      const existingSet = new Set(existingStudents.map((s) => String(s._id)));
      studentIds.forEach((id) => {
        if (!existingSet.has(String(id))) failed.push({ id: String(id), reason: "Student not found" });
      });

      if (setDoc.class || setDoc.section) {
        const keySet = new Set();
        const keyMeta = [];
        for (const student of existingStudents) {
          const nextIdentity = normalizeStudentIdentity({
            classValue: setDoc.class ?? student.class,
            sectionValue: setDoc.section ?? student.section,
            rollNo: student.rollNo,
          });
          if (!nextIdentity.class || !nextIdentity.section || !nextIdentity.rollNo) {
            return res.status(400).json({ error: "All selected students must have class, section and rollNo" });
          }
          const dedupeKey = `${String(schoolId)}::${nextIdentity.class}::${nextIdentity.section}::${nextIdentity.rollNo}`;
          if (keySet.has(dedupeKey)) {
            return res.status(400).json({ error: "Bulk update would create duplicate class/section/rollNo within this school" });
          }
          keySet.add(dedupeKey);
          keyMeta.push(nextIdentity);
        }

        const conflictOr = keyMeta.map((item) => ({
          schoolId,
          class: item.class,
          section: item.section,
          rollNo: item.rollNo,
          _id: { $nin: studentIds },
        }));
        if (conflictOr.length) {
          const conflict = await db.collection("students").findOne({ $or: conflictOr }, { projection: { _id: 1 } });
          if (conflict) {
            return res.status(400).json({ error: "Bulk update conflicts with existing student class/section/rollNo in this school" });
          }
        }
      }

      const updateResult = await runBestEffortTransaction("BULK_UPDATE_STUDENTS", async (session) => {
        const options = session ? { session } : {};
        const result = await db.collection("students").updateMany(
          activeStudentFilter({
            _id: { $in: studentIds },
            schoolId,
          }),
          {
            $set: {
              ...setDoc,
              updatedAt: new Date(),
              updatedBy: safeObjectId(req.user.userId),
            },
          },
          options
        );

        if (Object.prototype.hasOwnProperty.call(setDoc, "assignedTeacher")) {
          await db.collection("teachers").updateMany(
            { schoolId },
            { $pull: { assignedStudents: { $in: studentIds } } },
            options
          );
          if (setDoc.assignedTeacher) {
            await db.collection("teachers").updateOne(
              { _id: setDoc.assignedTeacher, schoolId },
              { $addToSet: { assignedStudents: { $each: studentIds } } },
              options
            );
          }
        }

        if (setDoc.class || setDoc.section) {
          await removeStudentReferences({ schoolId, studentIds, session });
          const updatedStudents = await db.collection("students")
            .find(activeStudentFilter({ _id: { $in: studentIds }, schoolId }), { session })
            .project({ _id: 1, class: 1, section: 1 })
            .toArray();

          for (const student of updatedStudents) {
            await Promise.all([
              db.collection("classSections").updateMany(
                { schoolId, class: String(student.class || ""), section: String(student.section || "") },
                { $addToSet: { studentIds: student._id, students: student._id } },
                options
              ),
              db.collection("classSectionMappings").updateMany(
                { schoolId, class: String(student.class || ""), section: String(student.section || "") },
                { $addToSet: { studentIds: student._id, students: student._id } },
                options
              ),
            ]);
          }
        }

        return result;
      });

      return res.json({
        affectedCount: updateResult.modifiedCount,
        failed,
      });
    } catch (err) {
      if (isMongoDuplicateKeyError(err)) {
        return res.status(400).json({ error: "Bulk update created duplicate class/section/rollNo in this school" });
      }
      console.error("BULK UPDATE STUDENTS ERROR:", err);
      return res.status(500).json({ error: "Failed to bulk update students" });
    }
  }
);

/* ================================
   ADMIN: BULK REVERT STUDENTS (UNDO UPDATE)
   ================================= */
app.post(
  "/api/admin/students/bulk-revert",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const snapshots = Array.isArray(req.body?.items)
        ? req.body.items
        : Array.isArray(req.body?.students)
          ? req.body.students
          : [];

      if (!schoolId) return res.status(400).json({ error: "Invalid schoolId" });
      if (!snapshots.length) return res.status(400).json({ error: "students snapshot array is required" });

      const parsedSnapshots = snapshots
        .map((raw) => normalizeStudentSnapshot(raw))
        .filter((s) => s && s._id);

      if (!parsedSnapshots.length) return res.status(400).json({ error: "No valid student snapshots provided" });

      const warnings = [];
      const failed = [];
      const revertIds = parsedSnapshots.map((s) => s._id);

      await runBestEffortTransaction("BULK_REVERT_STUDENTS", async (session) => {
        const options = session ? { session } : {};

        await removeStudentReferences({ schoolId, studentIds: revertIds, session });

        for (const snapshot of parsedSnapshots) {
          const existing = await db.collection("students").findOne({ _id: snapshot._id, schoolId }, { projection: { _id: 1 } });
          if (!existing) {
            failed.push({ id: String(snapshot._id), reason: "Student not found" });
            continue;
          }

          let nextAssignedTeacher = snapshot.assignedTeacher || null;
          if (nextAssignedTeacher) {
            const teacherExists = await db.collection("teachers").findOne(activeTeacherFilter({ _id: nextAssignedTeacher, schoolId }), { projection: { _id: 1 } });
            if (!teacherExists) {
              nextAssignedTeacher = null;
              warnings.push({ id: String(snapshot._id), reason: "Assigned teacher no longer exists" });
            }
          }

          await db.collection("students").updateOne(
            { _id: snapshot._id, schoolId },
            {
              $set: {
                name: snapshot.name,
                email: snapshot.email,
                class: String(snapshot.class || snapshot.className || ""),
                className: String(snapshot.className || snapshot.class || ""),
                section: String(snapshot.section || ""),
                rollNo: snapshot.rollNo || "",
                parentName: snapshot.parentName || "",
                parentPhone: snapshot.parentPhone || snapshot.phone || "",
                phone: snapshot.parentPhone || snapshot.phone || "",
                assignedTeacher: nextAssignedTeacher,
                isDeleted: snapshot.isDeleted === true,
                updatedAt: new Date(),
                updatedBy: safeObjectId(req.user.userId),
              },
            },
            options
          );

          if (snapshot.isDeleted !== true) {
            if (nextAssignedTeacher) {
              await db.collection("teachers").updateOne(
                { _id: nextAssignedTeacher, schoolId },
                { $addToSet: { assignedStudents: snapshot._id } },
                options
              );
            }

            await Promise.all([
              db.collection("classSections").updateMany(
                { schoolId, class: String(snapshot.class || snapshot.className || ""), section: String(snapshot.section || "") },
                { $addToSet: { studentIds: snapshot._id, students: snapshot._id } },
                options
              ),
              db.collection("classSectionMappings").updateMany(
                { schoolId, class: String(snapshot.class || snapshot.className || ""), section: String(snapshot.section || "") },
                { $addToSet: { studentIds: snapshot._id, students: snapshot._id } },
                options
              ),
            ]);
          }
        }
      });

      return res.json({
        affectedCount: parsedSnapshots.length - failed.length,
        failed,
        warnings,
      });
    } catch (err) {
      console.error("❌ BULK REVERT STUDENTS ERROR:", err);
      return res.status(500).json({ error: "Failed to revert students" });
    }
  }
);

/* ================================
   SHARED: UPDATE SINGLE STUDENT (ADMIN / TEACHER)
   ================================= */
app.put(
  "/api/students/:id",
  requireAuth,
  requireTenantId,
  async (req, res) => {
    try {
      const role = String(req.user?.role || "");
      if (!["ADMIN", "TEACHER"].includes(role)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const schoolId = req.user.schoolIdObj;
      const studentId = safeObjectId(req.params.id);
      const updates = req.body || {};
      if (!schoolId || !studentId) return res.status(400).json({ error: "Invalid schoolId or studentId" });

      const existingStudent = await db.collection("students").findOne(
        activeStudentFilter({ _id: studentId, schoolId }),
        { projection: { _id: 1, userId: 1, class: 1, section: 1, rollNo: 1, assignedTeacher: 1 } }
      );
      if (!existingStudent) return res.status(404).json({ error: "Student not found" });

      if (role === "TEACHER") {
        const teacherClass = String(req.user?.class || "").trim();
        const teacherSection = String(req.user?.section || "").trim();
        const studentClass = String(existingStudent.class || "").trim();
        const studentSection = String(existingStudent.section || "").trim();
        if (!teacherClass || !teacherSection || teacherClass !== studentClass || teacherSection !== studentSection) {
          return res.status(403).json({ error: "You can only edit students in your assigned class and section" });
        }
      }

      const teacherAllowedFields = new Set(["parentName", "parentPhone", "phone", "email"]);
      if (role === "TEACHER") {
        const requestedFields = Object.keys(updates);
        const disallowed = requestedFields.filter((key) => !teacherAllowedFields.has(key));
        if (disallowed.length) {
          return res.status(403).json({ error: `Teachers cannot edit: ${disallowed.join(", ")}` });
        }
      }

      const setDoc = {};
      if (role === "ADMIN" && updates.name !== undefined) {
        const nameValue = String(updates.name || "").trim();
        if (!nameValue) return res.status(400).json({ error: "name cannot be empty" });
        setDoc.name = nameValue;
      }
      if (role === "ADMIN" && updates.rollNo !== undefined) {
        const rollNoValue = String(updates.rollNo || "").trim();
        if (!rollNoValue) return res.status(400).json({ error: "rollNo cannot be empty" });
        setDoc.rollNo = rollNoValue;
      }
      if (role === "ADMIN" && (updates.class !== undefined || updates.className !== undefined)) {
        const classValue = String(updates.class ?? updates.className ?? "").trim();
        if (!classValue) return res.status(400).json({ error: "class cannot be empty" });
        setDoc.class = classValue;
        setDoc.className = classValue;
      }
      if (role === "ADMIN" && updates.section !== undefined) {
        const sectionValue = String(updates.section || "").trim();
        if (!sectionValue) return res.status(400).json({ error: "section cannot be empty" });
        setDoc.section = sectionValue;
      }

      if (updates.parentName !== undefined) {
        const parentNameValue = String(updates.parentName || "").trim();
        if (!parentNameValue) return res.status(400).json({ error: "parentName cannot be empty" });
        setDoc.parentName = parentNameValue;
      }
      if (updates.parentPhone !== undefined || updates.phone !== undefined) {
        const parentPhoneValue = String(updates.parentPhone ?? updates.phone ?? "").trim();
        if (!parentPhoneValue) return res.status(400).json({ error: "parentPhone cannot be empty" });
        if (!isValidParentPhone(parentPhoneValue)) return res.status(400).json({ error: "Invalid parentPhone format" });
        setDoc.parentPhone = parentPhoneValue;
        setDoc.phone = parentPhoneValue;
      }

      if (role === "ADMIN" && updates.status !== undefined) {
        const statusValue = String(updates.status || "").trim();
        if (!statusValue) return res.status(400).json({ error: "status cannot be empty" });
        setDoc.status = statusValue;
      }

      let normalizedEmail = null;
      if (updates.email !== undefined) {
        normalizedEmail = String(updates.email || "").trim().toLowerCase();
        if (!isValidEmailAddress(normalizedEmail)) {
          return res.status(400).json({ error: "Invalid email format" });
        }
        const duplicateUser = await db.collection("users").findOne({
          email: normalizedEmail,
          schoolId,
          _id: { $ne: existingStudent.userId },
          isDeleted: { $ne: true },
        });
        if (duplicateUser) {
          return res.status(400).json({ error: "Email already in use" });
        }
        setDoc.email = normalizedEmail;
      }

      if (!Object.keys(setDoc).length) {
        return res.status(400).json({ error: "No supported updates provided" });
      }

      const nextIdentity = normalizeStudentIdentity({
        classValue: setDoc.class ?? existingStudent.class,
        sectionValue: setDoc.section ?? existingStudent.section,
        rollNo: setDoc.rollNo ?? existingStudent.rollNo,
      });
      if (!nextIdentity.class || !nextIdentity.section || !nextIdentity.rollNo) {
        return res.status(400).json({ error: "class, section and rollNo are required" });
      }
      const identityConflict = await findStudentIdentityConflict({
        schoolId,
        classValue: nextIdentity.class,
        sectionValue: nextIdentity.section,
        rollNo: nextIdentity.rollNo,
        excludeStudentId: studentId,
      });
      if (identityConflict) {
        return res.status(400).json({ error: "Student already exists for this class/section/rollNo in this school" });
      }

      await runBestEffortTransaction("UPDATE_SINGLE_STUDENT_SHARED", async (session) => {
        const options = session ? { session } : {};
        const affectsMappings =
          role === "ADMIN" &&
          (Object.prototype.hasOwnProperty.call(setDoc, "class") ||
            Object.prototype.hasOwnProperty.call(setDoc, "section"));

        if (affectsMappings) {
          await removeStudentReferences({ schoolId, studentIds: [studentId], session });
        }

        await db.collection("students").updateOne(
          { _id: studentId, schoolId },
          {
            $set: {
              ...setDoc,
              updatedAt: new Date(),
              updatedBy: safeObjectId(req.user.userId),
            },
          },
          options
        );

        if (normalizedEmail && existingStudent.userId) {
          await db.collection("users").updateOne(
            { _id: existingStudent.userId, schoolId },
            { $set: { email: normalizedEmail, updatedAt: new Date() } },
            options
          );
        }

        if (!affectsMappings) return;

        const updated = await db.collection("students").findOne(
          activeStudentFilter({ _id: studentId, schoolId }),
          { projection: { _id: 1, class: 1, section: 1, assignedTeacher: 1 }, session }
        );
        if (!updated) return;

        if (updated.assignedTeacher) {
          await db.collection("teachers").updateOne(
            { _id: updated.assignedTeacher, schoolId },
            { $addToSet: { assignedStudents: updated._id } },
            options
          );
        }

        await Promise.all([
          db.collection("classSections").updateMany(
            { schoolId, class: String(updated.class || ""), section: String(updated.section || "") },
            { $addToSet: { studentIds: updated._id, students: updated._id } },
            options
          ),
          db.collection("classSectionMappings").updateMany(
            { schoolId, class: String(updated.class || ""), section: String(updated.section || "") },
            { $addToSet: { studentIds: updated._id, students: updated._id } },
            options
          ),
        ]);
      });

      return res.json({ success: true });
    } catch (err) {
      if (isMongoDuplicateKeyError(err)) {
        return res.status(400).json({ error: "Student already exists for this class/section/rollNo in this school" });
      }
      console.error("UPDATE STUDENT SHARED ERROR:", err);
      return res.status(500).json({ error: "Failed to update student" });
    }
  }
);

/* ================================
   TEACHER: CLASS ANALYTICS
   ================================= */
const teacherClassAnalyticsHandler = async (req, res) => {
  try {
    if (String(req.user?.role || "").toUpperCase() !== "TEACHER") {
      return res.status(403).json({ error: "Access denied" });
    }

    const teacherUserId = safeObjectId(req.user.userId);
    const schoolId = req.user.schoolIdObj;
    if (!teacherUserId) return res.status(400).json({ error: "Invalid teacher user id" });

    const teacher = await db.collection("teachers").findOne(activeTeacherFilter({ userId: teacherUserId, schoolId }));
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const className = String(teacher.class || "");
    const section = String(teacher.section || "");
    if (!className || !section) {
      return res.status(400).json({ error: "Teacher class/section not configured" });
    }

    const examFilter = String(req.query?.exam || "all").trim();
    const subjectFilter = String(req.query?.subject || "all").trim();
    const timeRange = String(req.query?.timeRange || "week").trim().toLowerCase();
    const timeDays = timeRange === "month" ? 30 : timeRange === "term" ? 90 : 7;
    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    fromDate.setDate(fromDate.getDate() - (timeDays - 1));

    const students = await db.collection("students")
      .find(activeStudentFilter({ schoolId, class: className, section }))
      .project({ _id: 1, userId: 1, name: 1, rollNo: 1 })
      .toArray();

    const studentMetaMap = new Map();
    const attendanceKeyToStudentId = new Map();
    const validAttendanceKeys = [];
    students.forEach((student) => {
      const studentIdStr = String(student._id);
      studentMetaMap.set(studentIdStr, {
        studentId: student._id,
        name: student.name || "Student",
        rollNo: student.rollNo || "",
      });
      attendanceKeyToStudentId.set(studentIdStr, studentIdStr);
      validAttendanceKeys.push(student._id);
      if (student.userId) {
        const userIdStr = String(student.userId);
        attendanceKeyToStudentId.set(userIdStr, studentIdStr);
        validAttendanceKeys.push(student.userId);
      }
    });

    const marksBaseQuery = { schoolId, class: className, section };
    if (examFilter && examFilter.toLowerCase() !== "all") marksBaseQuery.exam = examFilter;
    if (subjectFilter && subjectFilter.toLowerCase() !== "all") marksBaseQuery.subject = subjectFilter;

    const marks = await db.collection("marks")
      .find(marksBaseQuery)
      .sort({ createdAt: -1 })
      .limit(800)
      .toArray();

    const attendance = validAttendanceKeys.length
      ? await db.collection("attendance")
          .find({
            schoolId,
            class: className,
            section,
            submissionStatus: "SUBMITTED",
            $or: [
              { studentId: { $in: validAttendanceKeys } },
              { studentUserId: { $in: validAttendanceKeys } },
            ],
          })
          .sort({ date: -1, createdAt: -1 })
          .limit(2000)
          .toArray()
      : [];

    const markPercentByStudent = new Map();
    const markTotalsByStudent = new Map();
    const subjectTotals = new Map();

    marks.forEach((mark) => {
      const studentKey = String(mark?.studentId || "");
      if (!studentMetaMap.has(studentKey)) return;

      const scoreRaw = mark?.score ?? mark?.marks;
      const score = Number(scoreRaw);
      if (!Number.isFinite(score)) return;
      const maxMarks = Number(mark?.maxMarks || 100);
      const percent = maxMarks > 0 ? Math.max(0, Math.min(100, (score / maxMarks) * 100)) : Math.max(0, Math.min(100, score));

      const current = markTotalsByStudent.get(studentKey) || { total: 0, count: 0 };
      current.total += percent;
      current.count += 1;
      markTotalsByStudent.set(studentKey, current);
      markPercentByStudent.set(studentKey, current.count ? Math.round(current.total / current.count) : 0);

      const subject = String(mark?.subject || "Unknown");
      const subjectAgg = subjectTotals.get(subject) || { total: 0, count: 0 };
      subjectAgg.total += percent;
      subjectAgg.count += 1;
      subjectTotals.set(subject, subjectAgg);
    });

    const attendanceByStudent = new Map();
    const attendanceCountMap = new Map();
    const dayAttendanceMap = new Map();
    const trendEnd = new Date();
    trendEnd.setHours(23, 59, 59, 999);

    attendance.forEach((row) => {
      const attendanceKey = String(row?.studentId || row?.studentUserId || "");
      const canonicalStudentId = attendanceKeyToStudentId.get(attendanceKey);
      if (!canonicalStudentId) return;

      const status = String(row?.status || "").trim().toUpperCase();
      const current = attendanceCountMap.get(canonicalStudentId) || { total: 0, present: 0 };
      current.total += 1;
      if (status === "PRESENT") current.present += 1;
      attendanceCountMap.set(canonicalStudentId, current);

      const dateValue = row?.date || row?.createdAt;
      const dateObj = dateValue ? new Date(dateValue) : null;
      if (!dateObj || Number.isNaN(dateObj.getTime())) return;
      if (dateObj < fromDate || dateObj > trendEnd) return;
      const dateKey = dateObj.toISOString().slice(0, 10);
      const dayCurrent = dayAttendanceMap.get(dateKey) || { total: 0, present: 0 };
      dayCurrent.total += 1;
      if (status === "PRESENT") dayCurrent.present += 1;
      dayAttendanceMap.set(dateKey, dayCurrent);
    });

    attendanceCountMap.forEach((value, key) => {
      const percent = value.total > 0 ? Math.round((value.present / value.total) * 100) : 0;
      attendanceByStudent.set(key, percent);
    });

    const allStudentRows = students.map((student) => {
      const key = String(student._id);
      const marksAverage = markPercentByStudent.get(key) || 0;
      const attendancePercent = attendanceByStudent.get(key) || 0;
      const meta = studentMetaMap.get(key) || { name: "Student", rollNo: "" };
      return {
        studentId: key,
        name: meta.name,
        rollNo: meta.rollNo,
        averageMarks: marksAverage,
        attendance: attendancePercent,
      };
    });

    const avgAttendance = allStudentRows.length
      ? Math.round(allStudentRows.reduce((sum, row) => sum + row.attendance, 0) / allStudentRows.length)
      : 0;
    const avgMarks = allStudentRows.length
      ? Math.round(allStudentRows.reduce((sum, row) => sum + row.averageMarks, 0) / allStudentRows.length)
      : 0;

    const marksDistribution = [
      { label: "90-100", count: 0 },
      { label: "70-89", count: 0 },
      { label: "50-69", count: 0 },
      { label: "Below 50", count: 0 },
    ];
    allStudentRows.forEach((row) => {
      if (row.averageMarks >= 90) marksDistribution[0].count += 1;
      else if (row.averageMarks >= 70) marksDistribution[1].count += 1;
      else if (row.averageMarks >= 50) marksDistribution[2].count += 1;
      else marksDistribution[3].count += 1;
    });

    const subjectPerformance = Array.from(subjectTotals.entries())
      .map(([subject, agg]) => ({
        subject,
        averageMarks: agg.count ? Math.round(agg.total / agg.count) : 0,
      }))
      .sort((a, b) => b.averageMarks - a.averageMarks);

    const topStudents = [...allStudentRows]
      .sort((a, b) => b.averageMarks - a.averageMarks)
      .slice(0, 3);

    const weakStudents = [...allStudentRows]
      .filter((row) => row.averageMarks < 40 || row.attendance < 70)
      .sort((a, b) => (a.attendance + a.averageMarks) - (b.attendance + b.averageMarks))
      .slice(0, 5)
      .map((row) => ({
        ...row,
        issue:
          row.attendance < 70
            ? `Attendance: ${row.attendance}%`
            : row.averageMarks < 40
            ? `Score below 40% (${row.averageMarks}%)`
            : "Low engagement",
      }));

    const attendanceTrend = [];
    for (let i = timeDays - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const row = dayAttendanceMap.get(key) || { total: 0, present: 0 };
      const percentage = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
      attendanceTrend.push({ label, date: key, attendance: percentage });
    }

    const quickInsights = [];
    if (attendanceTrend.length > 1) {
      const first = Number(attendanceTrend[0]?.attendance || 0);
      const last = Number(attendanceTrend[attendanceTrend.length - 1]?.attendance || 0);
      const diff = last - first;
      if (diff < 0) quickInsights.push(`Class attendance dropped ${Math.abs(diff)}% in selected period.`);
      else if (diff > 0) quickInsights.push(`Class attendance improved ${diff}% in selected period.`);
      else quickInsights.push("Class attendance is stable in selected period.");
    }

    if (subjectPerformance.length) {
      const weakestSubject = [...subjectPerformance].sort((a, b) => a.averageMarks - b.averageMarks)[0];
      if (weakestSubject?.averageMarks < avgMarks) {
        quickInsights.push(`${weakestSubject.subject} is below class average (${weakestSubject.averageMarks}%).`);
      }
      const bestSubject = subjectPerformance[0];
      if (bestSubject) {
        quickInsights.push(`${bestSubject.subject} is currently the strongest subject (${bestSubject.averageMarks}%).`);
      }
    }

    const classHealth = Math.round((avgMarks * 0.55) + (avgAttendance * 0.45));
    const classHealthStatus = classHealth >= 80 ? "Excellent" : classHealth >= 65 ? "Average" : "Needs Support";

    const [examOptionsRaw, subjectOptionsRaw] = await Promise.all([
      db.collection("marks").distinct("exam", { schoolId, class: className, section }),
      db.collection("marks").distinct("subject", { schoolId, class: className, section }),
    ]);

    const examOptions = (Array.isArray(examOptionsRaw) ? examOptionsRaw : [])
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .slice(0, 20);
    const subjectOptions = (Array.isArray(subjectOptionsRaw) ? subjectOptionsRaw : [])
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .slice(0, 20);

    return res.json({
      class: className,
      section,
      filters: {
        exam: examFilter || "all",
        subject: subjectFilter || "all",
        timeRange: timeRange || "week",
      },
      options: {
        exams: examOptions,
        subjects: subjectOptions,
        timeRanges: ["week", "month", "term"],
      },
      overview: {
        totalStudents: students.length,
        averageClassScore: avgMarks,
        attendancePercent: avgAttendance,
        needsAttention: weakStudents.length,
      },
      attendanceTrend: attendanceTrend.slice(-30),
      marksDistribution,
      subjectPerformance,
      weakStudents,
      topStudents,
      quickInsights: quickInsights.slice(0, 5),
      classHealth: {
        score: classHealth,
        status: classHealthStatus,
      },
    });
  } catch (err) {
    console.error("TEACHER CLASS ANALYTICS ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch teacher analytics" });
  }
};

app.get("/api/teacher/class-analytics", requireAuth, requireRole("TEACHER"), requireTenantId, teacherClassAnalyticsHandler);
app.get("/api/teacher/analytics", requireAuth, requireRole("TEACHER"), requireTenantId, teacherClassAnalyticsHandler);

/* ================================
   ADMIN: UPDATE SINGLE STUDENT
   ================================= */
app.put(
  "/api/admin/students/:id",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const studentId = safeObjectId(req.params.id);
      const updates = req.body || {};

      if (!schoolId || !studentId) return res.status(400).json({ error: "Invalid schoolId or studentId" });

      const existingStudent = await db.collection("students").findOne(
        activeStudentFilter({ _id: studentId, schoolId }),
        { projection: { _id: 1, class: 1, section: 1, rollNo: 1, assignedTeacher: 1 } }
      );
      if (!existingStudent) return res.status(404).json({ error: "Student not found" });

      const setDoc = {};
      if (updates.name !== undefined) {
        const nameValue = String(updates.name || "").trim();
        if (!nameValue) return res.status(400).json({ error: "name cannot be empty" });
        setDoc.name = nameValue;
      }
      if (updates.rollNo !== undefined) {
        const rollNoValue = String(updates.rollNo || "").trim();
        if (!rollNoValue) return res.status(400).json({ error: "rollNo cannot be empty" });
        setDoc.rollNo = rollNoValue;
      }
      if (updates.class !== undefined || updates.className !== undefined) {
        const classValue = String(updates.class ?? updates.className ?? "").trim();
        if (!classValue) return res.status(400).json({ error: "class cannot be empty" });
        setDoc.class = classValue;
        setDoc.className = classValue;
      }
      if (updates.section !== undefined) {
        const sectionValue = String(updates.section || "").trim();
        if (!sectionValue) return res.status(400).json({ error: "section cannot be empty" });
        setDoc.section = sectionValue;
      }
      if (updates.parentName !== undefined) {
        const parentNameValue = String(updates.parentName || "").trim();
        if (!parentNameValue) return res.status(400).json({ error: "parentName cannot be empty" });
        setDoc.parentName = parentNameValue;
      }
      if (updates.parentPhone !== undefined || updates.phone !== undefined) {
        const parentPhoneValue = String(updates.parentPhone ?? updates.phone ?? "").trim();
        if (!parentPhoneValue) return res.status(400).json({ error: "parentPhone cannot be empty" });
        if (!isValidParentPhone(parentPhoneValue)) return res.status(400).json({ error: "Invalid parentPhone format" });
        setDoc.parentPhone = parentPhoneValue;
        setDoc.phone = parentPhoneValue;
      }
      if (updates.assignedTeacher !== undefined) {
        if (!updates.assignedTeacher) {
          setDoc.assignedTeacher = null;
        } else {
          const teacherId = safeObjectId(updates.assignedTeacher);
          if (!teacherId) return res.status(400).json({ error: "Invalid assignedTeacher id" });
          const teacherExists = await db.collection("teachers").findOne(
            activeTeacherFilter({ _id: teacherId, schoolId }),
            { projection: { _id: 1 } }
          );
          if (!teacherExists) return res.status(400).json({ error: "Assigned teacher not found" });
          setDoc.assignedTeacher = teacherId;
        }
      }

      if (!Object.keys(setDoc).length) {
        return res.status(400).json({ error: "No supported updates provided" });
      }

      const nextIdentity = normalizeStudentIdentity({
        classValue: setDoc.class ?? existingStudent.class,
        sectionValue: setDoc.section ?? existingStudent.section,
        rollNo: setDoc.rollNo ?? existingStudent.rollNo,
      });
      if (!nextIdentity.class || !nextIdentity.section || !nextIdentity.rollNo) {
        return res.status(400).json({ error: "class, section and rollNo are required" });
      }
      const identityConflict = await findStudentIdentityConflict({
        schoolId,
        classValue: nextIdentity.class,
        sectionValue: nextIdentity.section,
        rollNo: nextIdentity.rollNo,
        excludeStudentId: studentId,
      });
      if (identityConflict) {
        return res.status(400).json({ error: "Student already exists for this class/section/rollNo in this school" });
      }

      await runBestEffortTransaction("UPDATE_SINGLE_STUDENT", async (session) => {
        const options = session ? { session } : {};
        const affectsMappings =
          Object.prototype.hasOwnProperty.call(setDoc, "class") ||
          Object.prototype.hasOwnProperty.call(setDoc, "section") ||
          Object.prototype.hasOwnProperty.call(setDoc, "assignedTeacher");

        if (affectsMappings) {
          await removeStudentReferences({ schoolId, studentIds: [studentId], session });
        }

        await db.collection("students").updateOne(
          { _id: studentId, schoolId },
          {
            $set: {
              ...setDoc,
              updatedAt: new Date(),
              updatedBy: safeObjectId(req.user.userId),
            },
          },
          options
        );

        if (!affectsMappings) return;

        const updated = await db.collection("students").findOne(
          activeStudentFilter({ _id: studentId, schoolId }),
          { projection: { _id: 1, class: 1, section: 1, assignedTeacher: 1 }, session }
        );
        if (!updated) return;

        if (updated.assignedTeacher) {
          await db.collection("teachers").updateOne(
            { _id: updated.assignedTeacher, schoolId },
            { $addToSet: { assignedStudents: updated._id } },
            options
          );
        }

        await Promise.all([
          db.collection("classSections").updateMany(
            { schoolId, class: String(updated.class || ""), section: String(updated.section || "") },
            { $addToSet: { studentIds: updated._id, students: updated._id } },
            options
          ),
          db.collection("classSectionMappings").updateMany(
            { schoolId, class: String(updated.class || ""), section: String(updated.section || "") },
            { $addToSet: { studentIds: updated._id, students: updated._id } },
            options
          ),
        ]);
      });

      return res.json({ success: true });
    } catch (err) {
      if (isMongoDuplicateKeyError(err)) {
        return res.status(400).json({ error: "Student already exists for this class/section/rollNo in this school" });
      }
      console.error("UPDATE STUDENT ERROR:", err);
      return res.status(500).json({ error: "Failed to update student" });
    }
  }
);

/* ================================
   ADMIN: DELETE STUDENT (SOFT, BACKWARD COMPAT)
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
    const student = await db.collection("students").findOne(activeStudentFilter({
      _id: studentId,
      schoolId,
    }));

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      await runBestEffortTransaction("DELETE_STUDENT_SOFT", async (session) => {
        await removeStudentReferences({ schoolId, studentIds: [studentId], session });
        const options = session ? { session } : {};
        await db.collection("students").updateOne(
          { _id: studentId, schoolId },
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: safeObjectId(req.user.userId) } },
          options
        );
      });

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

      console.log("✅ STUDENT SOFT-DELETED:", student.name, "ID:", studentId);
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
      const { fromClass, fromSection, toClass, toSection, studentIds } = req.body;
      const schoolId = req.user.schoolIdObj;

      if (!fromClass || !fromSection || !toClass || !toSection) {
        return res.status(400).json({ error: "Missing required fields: fromClass, fromSection, toClass, toSection" });
      }

      const filter = {
        schoolId,
        class: String(fromClass),
        section: String(fromSection),
      };

      if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
        const validIds = studentIds.map((id) => safeObjectId(id)).filter(Boolean);
        if (validIds.length > 0) {
          filter._id = { $in: validIds };
        }
      }

      const migrationCandidates = await db.collection("students")
        .find(activeStudentFilter(filter))
        .project({ _id: 1, rollNo: 1 })
        .toArray();
      if (!migrationCandidates.length) {
        return res.status(404).json({ error: "No students found to migrate" });
      }

      const targetClass = String(toClass);
      const targetSection = String(toSection);
      const candidateIds = migrationCandidates.map((s) => s._id);
      const candidateRollNos = migrationCandidates.map((s) => String(s.rollNo || "").trim());

      const seenTargetKeys = new Set();
      for (const rollNoValue of candidateRollNos) {
        if (!rollNoValue) {
          return res.status(400).json({ error: "All students being migrated must have rollNo" });
        }
        const key = `${targetClass}::${targetSection}::${rollNoValue}`;
        if (seenTargetKeys.has(key)) {
          return res.status(400).json({ error: "Migration would create duplicate class/section/rollNo in target section" });
        }
        seenTargetKeys.add(key);
      }

      const conflict = await db.collection("students").findOne({
        schoolId,
        class: targetClass,
        section: targetSection,
        _id: { $nin: candidateIds },
        rollNo: { $in: candidateRollNos },
      });
      if (conflict) {
        return res.status(400).json({ error: "Migration conflicts with existing student rollNo in target class/section" });
      }

      const result = await db.collection("students").updateMany(
        filter,
        {
          $set: {
            class: targetClass,
            section: targetSection,
            migratedAt: new Date(),
          },
          $push: {
            migrationHistory: {
              fromClass: String(fromClass),
              fromSection: String(fromSection),
              toClass: targetClass,
              toSection: targetSection,
              migratedAt: new Date(),
              migratedBy: safeObjectId(req.user.userId),
            },
          },
        }
      );

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

      console.log("STUDENTS MIGRATED - Count:", result.modifiedCount);
      res.json({
        success: true,
        message: `${result.modifiedCount} student(s) migrated`,
        migratedCount: result.modifiedCount,
      });
    } catch (err) {
      if (isMongoDuplicateKeyError(err)) {
        return res.status(400).json({ error: "Migration created duplicate class/section/rollNo in target section" });
      }
      console.error("STUDENT MIGRATION ERROR:", err);
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
      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
        _id: teacherId,
        schoolId,
      }));

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

        const generatedParentPhone = `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`;
        batch.push({
          userId: userResult.insertedId,
          name: studentName.fullName,
          email: studentEmail,
          class: teacher.class,
          section: teacher.section,
          rollNo: rollNo,
          parentName: `Mr. ${studentName.lastName}`,
          parentPhone: generatedParentPhone,
          phone: generatedParentPhone,
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
const teacherSubjectsInflight = new Map();

app.get(
  "/api/teacher/subjects",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj; // From requireTenantId middleware
      
      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
        userId: new ObjectId(req.user.userId),
        schoolId,
      }));

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const { class: cls, section } = req.query;
      const searchClass = cls || teacher.class;
      const searchSection = section || teacher.section;
      const inflightKey = `${String(schoolId)}:${String(teacher._id)}:${String(searchClass)}:${String(searchSection)}`;

      let queryPromise = teacherSubjectsInflight.get(inflightKey);
      if (!queryPromise) {
        queryPromise = db
          .collection("subjects")
          .find({
            class: searchClass,
            section: searchSection,
            schoolId,
            isDeleted: { $ne: true },
          })
          .sort({ subjectName: 1, name: 1 })
          .toArray()
          .finally(() => {
            teacherSubjectsInflight.delete(inflightKey);
          });
        teacherSubjectsInflight.set(inflightKey, queryPromise);
      }

      const subjects = await queryPromise;
      res.json(subjects);
    } catch (err) {
      console.error("GET TEACHER SUBJECTS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  }
);

app.post(
  "/api/teacher/subjects",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const teacherId = safeObjectId(req.user.userId);
      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({ userId: teacherId, schoolId }));
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });

      const { name, class: clsRaw, section: sectionRaw } = req.body || {};
      const nameValue = String(name || "").trim();
      const classValue = String(clsRaw || teacher.class || "").trim();
      const sectionValue = String(sectionRaw || teacher.section || "").trim();

      if (!nameValue || !classValue || !sectionValue) {
        return res.status(400).json({ error: "name, class and section are required" });
      }
      if (classValue !== String(teacher.class || "").trim() || sectionValue !== String(teacher.section || "").trim()) {
        return res.status(403).json({ error: "You can only manage subjects for your class/section" });
      }

      const duplicate = await db.collection("subjects").findOne({
        schoolId,
        class: classValue,
        section: sectionValue,
        isDeleted: { $ne: true },
        $or: [{ name: { $regex: `^${nameValue}$`, $options: "i" } }, { subjectName: { $regex: `^${nameValue}$`, $options: "i" } }],
      });
      if (duplicate) return res.status(409).json({ error: "Subject already exists for this class and section" });

      const subjectDoc = {
        schoolId,
        name: nameValue,
        subjectName: nameValue,
        class: classValue,
        section: sectionValue,
        createdBy: teacherId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };

      const result = await db.collection("subjects").insertOne(subjectDoc);
      return res.json({ success: true, subject: { ...subjectDoc, _id: result.insertedId.toString() } });
    } catch (err) {
      console.error("TEACHER SUBJECT CREATE ERROR:", err);
      return res.status(500).json({ error: "Failed to create subject" });
    }
  }
);

app.put(
  "/api/teacher/subjects/:id",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const teacherId = safeObjectId(req.user.userId);
      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({ userId: teacherId, schoolId }));
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });

      const subjectId = safeObjectId(req.params.id);
      if (!subjectId) return res.status(400).json({ error: "Invalid subject id" });

      const { name, class: clsRaw, section: sectionRaw } = req.body || {};
      const nameValue = String(name || "").trim();
      const classValue = String(clsRaw || teacher.class || "").trim();
      const sectionValue = String(sectionRaw || teacher.section || "").trim();

      if (!nameValue || !classValue || !sectionValue) {
        return res.status(400).json({ error: "name, class and section are required" });
      }
      if (classValue !== String(teacher.class || "").trim() || sectionValue !== String(teacher.section || "").trim()) {
        return res.status(403).json({ error: "You can only manage subjects for your class/section" });
      }

      const duplicate = await db.collection("subjects").findOne({
        _id: { $ne: subjectId },
        schoolId,
        class: classValue,
        section: sectionValue,
        isDeleted: { $ne: true },
        $or: [{ name: { $regex: `^${nameValue}$`, $options: "i" } }, { subjectName: { $regex: `^${nameValue}$`, $options: "i" } }],
      });
      if (duplicate) return res.status(409).json({ error: "Subject already exists for this class and section" });

      const result = await db.collection("subjects").findOneAndUpdate(
        { _id: subjectId, schoolId, class: classValue, section: sectionValue, isDeleted: { $ne: true } },
        { $set: { name: nameValue, subjectName: nameValue, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!result.value) return res.status(404).json({ error: "Subject not found" });
      return res.json({ success: true, subject: { ...result.value, _id: result.value._id.toString() } });
    } catch (err) {
      console.error("TEACHER SUBJECT UPDATE ERROR:", err);
      return res.status(500).json({ error: "Failed to update subject" });
    }
  }
);

app.delete(
  "/api/teacher/subjects/:id",
  requireAuth,
  requireTenantId,
  async (req, res) => {
    try {
      const actorRole = String(req.user?.role || "");
      if (actorRole !== "TEACHER" && actorRole !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      const schoolId = req.user.schoolIdObj;
      const actorId = safeObjectId(req.user.userId);
      let teacher = null;
      if (actorRole === "TEACHER") {
        teacher = await db.collection("teachers").findOne(activeTeacherFilter({ userId: actorId, schoolId }));
        if (!teacher) return res.status(404).json({ error: "Teacher not found" });
      }

      const subjectId = safeObjectId(req.params.id);
      if (!subjectId) return res.status(400).json({ error: "Invalid subject id" });

      const subjectBaseFilter = {
        _id: subjectId,
        schoolId,
        isDeleted: { $ne: true },
      };
      if (actorRole === "TEACHER") {
        subjectBaseFilter.class = String(teacher.class || "").trim();
        subjectBaseFilter.section = String(teacher.section || "").trim();
      }
      const subjectDoc = await db.collection("subjects").findOne(subjectBaseFilter);
      if (!subjectDoc) return res.status(404).json({ error: "Subject not found" });

      const targetClass = String(subjectDoc.class || "").trim();
      const targetSection = String(subjectDoc.section || "").trim();
      if (!targetClass || !targetSection) {
        return res.status(400).json({ error: "Subject is missing class/section mapping" });
      }

      const subjectAliases = getSubjectNameAliases(subjectDoc);
      const subjectKeys = toSubjectKeySet(subjectAliases);
      const subjectRegexList = subjectAliases.map((name) => new RegExp(`^${escapeRegex(name)}$`, "i"));

      await db.collection("subjects").updateOne(
        { _id: subjectId, schoolId, class: targetClass, section: targetSection, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: actorId, updatedAt: new Date() } }
      );

      const examDocs = await db.collection("exams").find({
        schoolId,
        class: targetClass,
        section: targetSection,
        isDeleted: { $ne: true },
      }).toArray();

      const examOps = [];
      const deletedExamIds = [];
      const touchedExamIds = [];

      examDocs.forEach((examDoc) => {
        const hasSubjectsArray = Array.isArray(examDoc.subjects) && examDoc.subjects.length > 0;
        if (hasSubjectsArray) {
          const normalizedSubjects = normalizeExamSubjects(examDoc.subjects);
          const filteredSubjects = normalizedSubjects.filter((subj) => !subjectKeys.has(String(subj.name || "").toLowerCase()));
          if (filteredSubjects.length !== normalizedSubjects.length) {
            touchedExamIds.push(examDoc._id);
            if (filteredSubjects.length === 0) {
              deletedExamIds.push(examDoc._id);
              examOps.push({
                updateOne: {
                  filter: { _id: examDoc._id, schoolId, isDeleted: { $ne: true } },
                  update: { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: actorId, updatedAt: new Date() } },
                },
              });
            } else {
              examOps.push({
                updateOne: {
                  filter: { _id: examDoc._id, schoolId, isDeleted: { $ne: true } },
                  update: { $set: { subjects: filteredSubjects, updatedAt: new Date() } },
                },
              });
            }
          }
          return;
        }

        const legacySubjectName = normalizeSubjectName(examDoc.subjectName || examDoc.subject || "");
        const legacySubjectMatches =
          (examDoc.subjectId && String(examDoc.subjectId) === String(subjectId)) ||
          (legacySubjectName && subjectKeys.has(legacySubjectName.toLowerCase()));
        if (legacySubjectMatches) {
          touchedExamIds.push(examDoc._id);
          deletedExamIds.push(examDoc._id);
          examOps.push({
            updateOne: {
              filter: { _id: examDoc._id, schoolId, isDeleted: { $ne: true } },
              update: { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: actorId, updatedAt: new Date() } },
            },
          });
        }
      });

      if (examOps.length > 0) {
        await db.collection("exams").bulkWrite(examOps);
      }

      if (deletedExamIds.length > 0) {
        await db.collection("marks").deleteMany({
          schoolId,
          class: targetClass,
          section: targetSection,
          examId: { $in: deletedExamIds },
        });
      }

      if (touchedExamIds.length > 0) {
        const marksDocs = await db.collection("marks").find({
          schoolId,
          class: targetClass,
          section: targetSection,
          examId: { $in: touchedExamIds },
          scores: { $exists: true },
        }).toArray();

        const marksOps = [];
        const deletedExamIdSet = new Set(deletedExamIds.map((id) => String(id)));
        marksDocs.forEach((doc) => {
          if (deletedExamIdSet.has(String(doc.examId))) return;
          const nextScores = (Array.isArray(doc.scores) ? doc.scores : []).filter(
            (score) => !subjectKeys.has(normalizeSubjectName(score?.subject).toLowerCase())
          );
          if (nextScores.length === (Array.isArray(doc.scores) ? doc.scores.length : 0)) return;
          if (nextScores.length === 0) {
            marksOps.push({ deleteOne: { filter: { _id: doc._id } } });
          } else {
            marksOps.push({
              updateOne: {
                filter: { _id: doc._id },
                update: { $set: { scores: nextScores, updatedAt: new Date() } },
              },
            });
          }
        });
        if (marksOps.length > 0) {
          await db.collection("marks").bulkWrite(marksOps);
        }
      }

      // Legacy single-subject marks cleanup
      if (subjectRegexList.length > 0) {
        await db.collection("marks").deleteMany({
          schoolId,
          class: targetClass,
          section: targetSection,
          $or: [
            { subject: { $in: subjectRegexList } },
            { subjectName: { $in: subjectRegexList } },
          ],
        });
      }

      // Defensive cleanup: remove deleted-subject scores from remaining marks docs.
      const residualMarksDocs = await db.collection("marks").find({
        schoolId,
        class: targetClass,
        section: targetSection,
        scores: { $exists: true },
      }).toArray();
      const residualOps = [];
      residualMarksDocs.forEach((doc) => {
        const nextScores = (Array.isArray(doc.scores) ? doc.scores : []).filter(
          (score) => !subjectKeys.has(normalizeSubjectName(score?.subject).toLowerCase())
        );
        if (nextScores.length === (Array.isArray(doc.scores) ? doc.scores.length : 0)) return;
        if (nextScores.length === 0) {
          residualOps.push({ deleteOne: { filter: { _id: doc._id } } });
        } else {
          residualOps.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { scores: nextScores, updatedAt: new Date() } },
            },
          });
        }
      });
      if (residualOps.length > 0) {
        await db.collection("marks").bulkWrite(residualOps);
      }

      return res.json({
        success: true,
        message: "Subject deleted successfully",
        cascade: {
          touchedExams: touchedExamIds.length,
          deletedExams: deletedExamIds.length,
        },
      });
    } catch (err) {
      console.error("TEACHER SUBJECT DELETE ERROR:", err);
      return res.status(500).json({ error: "Failed to delete subject" });
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
      const { from, to } = req.query;
      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
        userId: new ObjectId(req.user.userId),
        schoolId: req.user.schoolIdObj,
      }));

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const studentCount = await db.collection("students").countDocuments({
        class: teacher.class,
        section: teacher.section,
        schoolId: req.user.schoolIdObj,
        isDeleted: { $ne: true },
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
   TEACHER: DASHBOARD SUMMARY (COMBINED)
   ================================= */
app.get(
  "/api/teacher/dashboard-summary",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const teacherUserId = safeObjectId(req.user.userId);
      const schoolId = req.user.schoolIdObj;
      if (!teacherUserId) return res.status(400).json({ error: "Invalid teacher user id" });

      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
        userId: teacherUserId,
        schoolId,
      }));
      if (!teacher) return res.status(404).json({ error: "Teacher not found" });

      const [studentCount, pendingResetRequests, unreadNotifications] = await Promise.all([
        db.collection("students").countDocuments(activeStudentFilter({
          schoolId,
          class: teacher.class,
          section: teacher.section,
        })),
        db.collection("passwordResetRequests").countDocuments({
          schoolId,
          teacherId: teacher._id,
          status: "PENDING",
        }),
        db.collection("notifications").countDocuments({
          $and: [
            { $or: [{ targetRole: "TEACHER" }, { targetRole: null }, { role: "TEACHER" }] },
            { $or: [{ targetUser: teacherUserId }, { targetUser: null }, { userId: teacherUserId }] },
            { isRead: false },
            { $or: [{ schoolId }, { schoolId: null }] },
            { isDeleted: { $ne: true } },
          ],
        }),
      ]);

      return res.json({
        className: teacher.class || "",
        section: teacher.section || "",
        studentCount,
        pendingResetRequests,
        unreadNotifications,
      });
    } catch (err) {
      console.error("❌ TEACHER DASHBOARD SUMMARY ERROR:", err);
      return res.status(500).json({ error: "Failed to load teacher summary" });
    }
  }
);

app.get(
  "/api/dashboard/summary",
  requireAuth,
  requireRole("ADMIN"),
  requireTenantId,
  async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const [
        studentCount,
        teacherCount,
        attendanceStats,
        recentNotifications,
        studentClassSections,
        teacherClassSections,
        subjectClassSections,
      ] = await Promise.all([
        db.collection("students").countDocuments(activeStudentFilter({ schoolId })),
        db.collection("teachers").countDocuments(activeTeacherFilter({ schoolId })),
        db.collection("attendance").aggregate([
          { $match: { schoolId, submissionStatus: "SUBMITTED" } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              present: { $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0] } },
            },
          },
        ]).toArray(),
        db.collection("notifications")
          .find({ schoolId, isDeleted: { $ne: true } })
          .sort({ createdAt: -1 })
          .limit(10)
          .project({ title: 1, message: 1, type: 1, createdAt: 1, isRead: 1, targetRole: 1 })
          .toArray(),
        db.collection("students").aggregate([
          { $match: activeStudentFilter({ schoolId }) },
          {
            $project: {
              className: {
                $trim: { input: { $toString: { $ifNull: ["$class", "$className"] } } },
              },
              section: {
                $trim: { input: { $toString: { $ifNull: ["$section", ""] } } },
              },
            },
          },
          { $match: { className: { $ne: "" }, section: { $ne: "" } } },
          { $group: { _id: { className: "$className", section: "$section" } } },
        ]).toArray(),
        db.collection("teachers").aggregate([
          { $match: activeTeacherFilter({ schoolId }) },
          {
            $project: {
              className: {
                $trim: { input: { $toString: { $ifNull: ["$class", "$className"] } } },
              },
              section: {
                $trim: { input: { $toString: { $ifNull: ["$section", ""] } } },
              },
            },
          },
          { $match: { className: { $ne: "" }, section: { $ne: "" } } },
          { $group: { _id: { className: "$className", section: "$section" } } },
        ]).toArray(),
        db.collection("subjects").aggregate([
          { $match: { schoolId, isDeleted: { $ne: true } } },
          {
            $project: {
              className: {
                $trim: { input: { $toString: { $ifNull: ["$class", "$className"] } } },
              },
              section: {
                $trim: { input: { $toString: { $ifNull: ["$section", ""] } } },
              },
            },
          },
          { $match: { className: { $ne: "" }, section: { $ne: "" } } },
          { $group: { _id: { className: "$className", section: "$section" } } },
        ]).toArray(),
      ]);

      const stats = attendanceStats[0] || { total: 0, present: 0, absent: 0 };
      const classSectionSet = new Set();
      const classSet = new Set();
      const sectionLabelSet = new Set();
      [studentClassSections, teacherClassSections, subjectClassSections].forEach((rows) => {
        (rows || []).forEach((row) => {
          const className = String(row?._id?.className || "").trim();
          const section = String(row?._id?.section || "").trim();
          if (className) classSet.add(className);
          if (section) sectionLabelSet.add(section);
          if (className && section) classSectionSet.add(`${className}::${section}`);
        });
      });
      return res.json({
        studentCount,
        teacherCount,
        classCount: classSet.size,
        // "Total Sections" should represent class-wise sections (e.g. 1-A and 2-A are two sections).
        sectionCount: classSectionSet.size,
        // Keep label-wise count for diagnostics if needed by future UI.
        sectionLabelCount: sectionLabelSet.size,
        classSectionCount: classSectionSet.size,
        attendanceStats: {
          total: stats.total || 0,
          present: stats.present || 0,
          absent: stats.absent || 0,
        },
        recentNotifications,
      });
    } catch (err) {
      console.error("DASHBOARD SUMMARY ERROR:", err);
      return res.status(500).json({ error: "Failed to load dashboard summary" });
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

      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
        userId: new ObjectId(req.user.userId),
        schoolId: req.user.schoolIdObj,
      }));

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
        isDeleted: false,
        createdAt: new Date(),
      };

      const result = await db.collection("homework").insertOne(homework);
      const homeworkId = result.insertedId;

      // ✅ CREATE NOTIFICATIONS FOR ALL STUDENTS IN THIS CLASS/SECTION
      const students = await db.collection("students").find(activeStudentFilter({
        schoolId: req.user.schoolIdObj,
        class: teacher.class,
        section: teacher.section,
      })).toArray();

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
      const { from, to } = req.query;
      const { page, limit, skip } = getPagination(req.query, { limit: 20 });
      const usePagination = Boolean(req.query.page || req.query.limit);
      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
        userId: new ObjectId(req.user.userId),
        schoolId: req.user.schoolIdObj,
      }));

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const query = {
        class: teacher.class,
        section: teacher.section,
        schoolId: req.user.schoolIdObj,
        isDeleted: { $ne: true },
        ...buildDateRangeQuery("dueDate", from, to),
      };
      const [homework, totalCount] = await Promise.all([
        db
        .collection("homework")
        .find(query)
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
        db.collection("homework").countDocuments(query),
      ]);

      if (usePagination) {
        return res.json({
          data: homework,
          page,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          totalCount,
        });
      }
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
      const { from, to } = req.query;
      const { page, limit, skip } = getPagination(req.query, { limit: 20 });
      const usePagination = Boolean(req.query.page || req.query.limit);
      const query = {
        schoolId: req.user.schoolIdObj,
        isDeleted: { $ne: true },
        ...buildDateRangeQuery("eventDate", from, to),
      };
      const [events, totalCount] = await Promise.all([
        db
        .collection("events")
      .find(query)
        .sort({ eventDate: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
        db.collection("events").countDocuments(query),
      ]);

      if (usePagination) {
        return res.json({
          data: events,
          page,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          totalCount,
        });
      }
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
      const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
        userId: new ObjectId(req.user.userId),
        schoolId: req.user.schoolIdObj,
      }));

      const schoolId = req.user.schoolIdObj;

      const newEvent = {
        eventName,
        description: description || "",
        eventDate: new Date(eventDate),
        isHoliday: !!isHoliday,
        class: cls || (teacher ? teacher.class : null),
        section: section || (teacher ? teacher.section : null),
        schoolId,
        isDeleted: false,
        createdBy: new ObjectId(req.user.userId),
        createdAt: new Date(),
      };

      const result = await db.collection("events").insertOne(newEvent);
      newEvent._id = result.insertedId;

      // ✅ CREATE NOTIFICATIONS FOR ALL STUDENTS IN THIS CLASS/SECTION
      if (!isHoliday) {
        const students = await db.collection("students").find(activeStudentFilter({
          schoolId: schoolId,
          class: cls || (teacher ? teacher.class : null),
          section: section || (teacher ? teacher.section : null),
        })).toArray();

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
            isDeleted: false,
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
      const { from, to } = req.query;
      const { page, limit, skip } = getPagination(req.query, { limit: 20 });
      const usePagination = Boolean(req.query.page || req.query.limit);
      const student = await db.collection("students").findOne(activeStudentFilter({
        userId: new ObjectId(req.user.userId),
        schoolId: req.user.schoolIdObj,
      }));

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const query = {
        class: student.class,
        section: student.section,
        schoolId: req.user.schoolIdObj,
        isDeleted: { $ne: true },
        ...buildDateRangeQuery("dueDate", from, to),
      };
      const [homework, totalCount] = await Promise.all([
        db
        .collection("homework")
        .find(query)
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
        db.collection("homework").countDocuments(query),
      ]);

      if (usePagination) {
        return res.json({
          data: homework,
          page,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          totalCount,
        });
      }
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
      const { from, to } = req.query;
      const { page, limit, skip } = getPagination(req.query, { limit: 20 });
      const usePagination = Boolean(req.query.page || req.query.limit);
      const query = { schoolId: req.user.schoolIdObj, isDeleted: { $ne: true }, ...buildDateRangeQuery("eventDate", from, to) };
      const [events, totalCount] = await Promise.all([
        db
        .collection("events")
        .find(query)
        .sort({ eventDate: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
        db.collection("events").countDocuments(query),
      ]);

      if (usePagination) {
        return res.json({
          data: events,
          page,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          totalCount,
        });
      }
      res.json(events);
    } catch (err) {
      console.error("STUDENT EVENTS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  }
);

/* ================================
   TEACHER: HOMEWORK - DELETE (SOFT)
   ================================= */
app.delete(
  "/api/teacher/homework/:id",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const homeworkId = safeObjectId(req.params.id);
      const schoolId = req.user.schoolIdObj;
      const teacherId = safeObjectId(req.user.userId);
      if (!homeworkId || !schoolId || !teacherId) return res.status(400).json({ error: "Invalid homework id or user" });

      const result = await db.collection("homework").updateOne(
        { _id: homeworkId, schoolId, teacherId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
      );

      if (result.modifiedCount === 0) return res.status(404).json({ error: "Homework not found" });

      await db.collection("notifications").updateMany(
        { schoolId, type: "homework", referenceId: homeworkId },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
      );

      res.json({ success: true, message: "Homework deleted" });
    } catch (err) {
      console.error("TEACHER DELETE HOMEWORK ERROR:", err);
      res.status(500).json({ error: "Failed to delete homework" });
    }
  }
);

/* ================================
   TEACHER: EVENT - DELETE (SOFT)
   ================================= */
app.delete(
  "/api/teacher/events/:id",
  requireAuth,
  requireRole("TEACHER"),
  requireTenantId,
  async (req, res) => {
    try {
      const eventId = safeObjectId(req.params.id);
      const schoolId = req.user.schoolIdObj;
      const teacherId = safeObjectId(req.user.userId);
      if (!eventId || !schoolId || !teacherId) return res.status(400).json({ error: "Invalid event id or user" });

      const result = await db.collection("events").updateOne(
        {
          _id: eventId,
          schoolId,
          $or: [{ createdBy: teacherId }, { class: req.user.class, section: req.user.section }],
          isDeleted: { $ne: true },
        },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
      );

      if (result.modifiedCount === 0) return res.status(404).json({ error: "Event not found" });

      await db.collection("notifications").updateMany(
        { schoolId, type: "event", referenceId: eventId },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
      );

      res.json({ success: true, message: "Event deleted" });
    } catch (err) {
      console.error("TEACHER DELETE EVENT ERROR:", err);
      res.status(500).json({ error: "Failed to delete event" });
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

    const { schoolId, name, email, role, password, className, section, subject, rollNo } = req.body;
    const teacherPhone = extractTeacherPhone(req.body);
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
      if (!isValidTeacherPhone(teacherPhone)) {
        return res.status(400).json({ error: "Invalid teacher phone format" });
      }
      await db.collection("teachers").updateOne(
        { userId },
        {
          $set: {
            name,
            subject: subject || "",
            class: className || "",
            section: section || "",
            phone: teacherPhone,
            mobile: teacherPhone,
            schoolId: schoolObjectId,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    } else if (role === "STUDENT") {
      const identity = normalizeStudentIdentity({ classValue: className, sectionValue: section, rollNo });
      if (!identity.class || !identity.section || !identity.rollNo) {
        return res.status(400).json({ error: "className, section and rollNo are required for STUDENT" });
      }

      const duplicateStudent = await findStudentIdentityConflict({
        schoolId: schoolObjectId,
        classValue: identity.class,
        sectionValue: identity.section,
        rollNo: identity.rollNo,
      });
      if (duplicateStudent) {
        return res.status(400).json({ error: "Student already exists for this class/section/rollNo in this school" });
      }

      await db.collection("students").insertOne({
        userId,
        email: email.toLowerCase(),
        name,
        class: identity.class,
        className: identity.class,
        section: identity.section,
        rollNo: identity.rollNo,
        schoolId: schoolObjectId,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log("DEV: User created -", email, "Role:", role, "School:", schoolId);
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
    if (isMongoDuplicateKeyError(err)) {
      return res.status(400).json({ error: "Duplicate user or student identity" });
    }
    console.error("DEV CREATE USER ERROR:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

/* List All Schools with Stats */
app.get("/api/dev/schools", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "DEVELOPER") {
      return res.status(403).json({ error: "Developer access required" });
    }

    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const [schools, totalCount] = await Promise.all([
      db.collection("schools")
        .find({ _id: { $exists: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("schools").estimatedDocumentCount(),
    ]);
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

    res.json({
      data: result,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
  } catch (err) {
    console.error("❌ DEV LIST SCHOOLS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});

/* Get School Details */
app.get("/api/dev/schools/:schoolId/details", requireAuth, requireRole("DEVELOPER"), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
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
    const [admins, teachers, students, adminCount, teacherCount, studentCount] = await Promise.all([
      db.collection("users").find({ schoolId: schoolObjId, role: "ADMIN" }).skip(skip).limit(limit).toArray(),
      db.collection("users").find({ schoolId: schoolObjId, role: "TEACHER" }).skip(skip).limit(limit).toArray(),
      db.collection("users").find({ schoolId: schoolObjId, role: "STUDENT" }).skip(skip).limit(limit).toArray(),
      db.collection("users").countDocuments({ schoolId: schoolObjId, role: "ADMIN" }),
      db.collection("users").countDocuments({ schoolId: schoolObjId, role: "TEACHER" }),
      db.collection("users").countDocuments({ schoolId: schoolObjId, role: "STUDENT" }),
    ]);

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
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalAdmins: adminCount,
        totalAttendance: attendanceCount,
        totalHomework: homeworkCount,
        totalAnnouncements: announcementCount,
        totalMarks: marksCount,
      },
      pagination: {
        page,
        limit,
        totalPages: {
          admins: Math.max(1, Math.ceil(adminCount / limit)),
          teachers: Math.max(1, Math.ceil(teacherCount / limit)),
          students: Math.max(1, Math.ceil(studentCount / limit)),
        },
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

    const schoolId = safeObjectId(req.query.schoolId);
    if (!schoolId) {
      return res.status(400).json({ error: "schoolId query param is required" });
    }

    const schoolCount = 1;
    const adminCount = await db.collection("users").countDocuments({ role: "ADMIN", schoolId });
    const teacherCount = await db.collection("users").countDocuments({ role: "TEACHER", schoolId });
    const studentCount = await db.collection("users").countDocuments({ role: "STUDENT", schoolId });

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
app.post("/api/admin/reset-password", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const schoolId = req.user.schoolIdObj;
    
    if (!normalizedEmail || !newPassword) {
      return res.status(400).json({ error: "Email and newPassword required" });
    }
    
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({ email: normalizedEmail, role: "ADMIN", schoolId });
    
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
      return res.json({ success: true, message: "Password reset successful" });
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
      const teachers = await db.collection("teachers").find(activeTeacherFilter({ schoolId })).toArray();
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
      type: "announcement",
      senderId,
      targetRole: "TEACHER",
      targetUserIds,
      audioUrl,
      isDeleted: false,
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
    const { targetStudentIds, broadcastToClass } = req.body;
    const schoolId = req.user.schoolIdObj;
    const senderId = safeObjectId(req.user.userId);
    const className = String(req.user.class || "").trim();
    const section = String(req.user.section || "").trim();
    const config = await getTimetableConfigDoc({ schoolId, classId: className, sectionId: section });
    const periodRows = getPeriodRowsFromConfig(config);

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
      const students = await db.collection("students").find(activeStudentFilter({
        schoolId,
        class: className,
        section,
      })).toArray();
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
      type: "voice",
      senderId,
      targetRole: "STUDENT",
      targetClass: className,
      targetSection: section,
      targetUserIds,
      audioUrl,
      isDeleted: false,
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

    console.log("✅ TEACHER VOICE BROADCAST - Recipients:", targetUserIds.length, "Class:", className, "Section:", section, "Audio URL:", audioUrl);
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
 * TEACHER: GET /api/teacher/voice-messages/mine
 * Get teacher's own voice message history (teacher -> students only)
 */
app.get("/api/teacher/voice-messages/mine", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const usePagination = Boolean(req.query.page || req.query.limit);
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const query = {
        schoolId,
        senderId: userId,
        senderRole: { $in: ["TEACHER", "teacher"] },
        targetRole: "STUDENT",
        isDeleted: { $ne: true },
        ...buildDateRangeQuery("createdAt", from, to),
        $or: [{ type: "voice" }, { type: { $exists: false } }],
      };

    const cursor = db.collection("voiceMessages")
      .find(query)
      .sort({ createdAt: -1 });
    const messages = await (usePagination ? cursor.skip(skip).limit(limit) : cursor).toArray();
    const totalCount = usePagination ? await db.collection("voiceMessages").countDocuments(query) : messages.length;

    const enrichedMessages = messages.map((msg) => ({
      ...msg,
      senderName: "You",
      _id: msg._id.toString(),
    }));

    console.log("✅ TEACHER VOICE MESSAGES (MINE) - Count:", enrichedMessages.length);
    if (usePagination) {
      return res.json({
        data: enrichedMessages,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }
    res.json(enrichedMessages);
  } catch (err) {
    console.error("❌ TEACHER VOICE MESSAGES (MINE) ERROR:", err);
    res.status(500).json({ error: "Failed to fetch voice messages" });
  }
});

// Backward-compatible alias
app.get("/api/teacher/voice-messages", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const usePagination = Boolean(req.query.page || req.query.limit);
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const query = {
        schoolId,
        senderId: userId,
        senderRole: { $in: ["TEACHER", "teacher"] },
        targetRole: "STUDENT",
        isDeleted: { $ne: true },
        ...buildDateRangeQuery("createdAt", from, to),
        $or: [{ type: "voice" }, { type: { $exists: false } }],
      };
    const cursor = db.collection("voiceMessages").find(query).sort({ createdAt: -1 });
    const messages = await (usePagination ? cursor.skip(skip).limit(limit) : cursor).toArray();
    const data = messages.map((msg) => ({ ...msg, senderName: "You", _id: msg._id.toString() }));
    if (usePagination) {
      const totalCount = await db.collection("voiceMessages").countDocuments(query);
      return res.json({
        data,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }

    res.json(data);
  } catch (err) {
    console.error("❌ TEACHER VOICE MESSAGES (LEGACY) ERROR:", err);
    res.status(500).json({ error: "Failed to fetch voice messages" });
  }
});

/**
 * STUDENT: GET /api/student/voice-messages
 * Get teacher voice messages only (no admin voice announcements here)
 */
app.get("/api/student/voice-messages", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const usePagination = Boolean(req.query.page || req.query.limit);
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const query = {
        schoolId,
        targetRole: "STUDENT",
        targetUserIds: userId,
        senderRole: { $in: ["TEACHER", "teacher"] },
        isDeleted: { $ne: true },
        ...buildDateRangeQuery("createdAt", from, to),
        $or: [{ type: "voice" }, { type: { $exists: false } }],
      };
    const cursor = db.collection("voiceMessages").find(query).sort({ createdAt: -1 });
    const messages = await (usePagination ? cursor.skip(skip).limit(limit) : cursor).toArray();

    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const teacher = await db.collection("teachers").findOne(activeTeacherFilter({ userId: msg.senderId }));
        return {
          ...msg,
          senderName: teacher?.name || "Teacher",
          _id: msg._id.toString(),
        };
      })
    );

    console.log("✅ STUDENT VOICE MESSAGES - Count:", enrichedMessages.length);
    if (usePagination) {
      const totalCount = await db.collection("voiceMessages").countDocuments(query);
      return res.json({
        data: enrichedMessages,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }

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
 * TEACHER: GET /api/teacher/timetable/config
 */
app.get("/api/teacher/timetable/config", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const classId = String(req.user.class || "").trim();
    const sectionId = String(req.user.section || "").trim();
    if (!classId || !sectionId) return res.status(400).json({ error: "Teacher class/section is missing" });

    const config = await getTimetableConfigDoc({ schoolId, classId, sectionId });
    return res.json({
      success: true,
      config: {
        ...config,
        _id: config?._id?.toString?.() || config?._id,
        schoolId: config?.schoolId?.toString?.() || config?.schoolId,
      },
    });
  } catch (err) {
    console.error("TIMETABLE CONFIG FETCH ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch timetable config" });
  }
});

/**
 * TEACHER: PUT /api/teacher/timetable/config
 */
app.put("/api/teacher/timetable/config", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const teacherClass = String(req.user.class || "").trim();
    const teacherSection = String(req.user.section || "").trim();
    const actorId = safeObjectId(req.user.userId);
    const classId = String(req.body?.classId || teacherClass).trim();
    const sectionId = String(req.body?.sectionId || teacherSection).trim();

    if (!classId || !sectionId) return res.status(400).json({ error: "classId and sectionId are required" });
    if (classId !== teacherClass || sectionId !== teacherSection) {
      return res.status(403).json({ error: "You can only manage timetable settings for your class/section" });
    }

    const days = normalizeTimetableDays(req.body?.days);
    const rows = normalizeTimetableRows(req.body?.rows);
    if (days.length === 0) return res.status(400).json({ error: "At least one active day is required" });
    if (rows.length === 0) return res.status(400).json({ error: "At least one valid period row is required" });

    const now = new Date();
    const result = await db.collection("timetableConfigs").findOneAndUpdate(
      { schoolId, classId, sectionId, isDeleted: { $ne: true } },
      {
        $set: {
          schoolId,
          classId,
          sectionId,
          days,
          rows,
          updatedAt: now,
          updatedBy: actorId,
          isDeleted: false,
        },
        $setOnInsert: {
          createdAt: now,
          createdBy: actorId,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const periodRows = getPeriodRowsFromConfig({ rows });
    const validRowKeys = new Set(periodRows.map((r) => String(r.rowKey)));
    const maxPeriod = periodRows.length;
    const existingEntries = await db.collection("timetables").find({
      schoolId,
      class: classId,
      section: sectionId,
      isDeleted: { $ne: true },
    }).toArray();

    const orphanIds = existingEntries
      .filter((entry) => {
        const entryRowKey = String(entry?.rowKey || "").trim();
        if (entryRowKey) return !validRowKeys.has(entryRowKey);
        const period = Number(entry?.period);
        return Number.isNaN(period) || period < 1 || period > maxPeriod;
      })
      .map((entry) => entry._id);

    if (orphanIds.length > 0) {
      await db.collection("timetables").updateMany(
        { _id: { $in: orphanIds } },
        { $set: { isDeleted: true, deletedAt: now, deletedBy: actorId } }
      );
    }

    return res.json({
      success: true,
      config: {
        ...result.value,
        _id: result.value?._id?.toString?.() || result.value?._id,
        schoolId: result.value?.schoolId?.toString?.() || result.value?.schoolId,
      },
    });
  } catch (err) {
    console.error("TIMETABLE CONFIG SAVE ERROR:", err);
    return res.status(500).json({ error: "Failed to save timetable config" });
  }
});

/**
 * STUDENT: GET /api/student/timetable/config
 */
app.get("/api/student/timetable/config", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user ID" });

    const student = await db.collection("students").findOne(activeStudentFilter({ userId, schoolId }));
    if (!student) return res.status(404).json({ error: "Student profile not found" });

    const classId = String(student.class || "").trim();
    const sectionId = String(student.section || "").trim();
    const config = await getTimetableConfigDoc({ schoolId, classId, sectionId });
    return res.json({
      success: true,
      config: {
        ...config,
        _id: config?._id?.toString?.() || config?._id,
        schoolId: config?.schoolId?.toString?.() || config?.schoolId,
      },
    });
  } catch (err) {
    console.error("STUDENT TIMETABLE CONFIG FETCH ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch timetable config" });
  }
});

/**
 * TEACHER: POST /api/teacher/timetable
 * Create or update a timetable entry
 */
app.post("/api/teacher/timetable", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { day, period, rowKey, subject, startTime, endTime, timetableId } = req.body;
    const schoolId = req.user.schoolIdObj;
    const className = String(req.user.class || "").trim();
    const section = String(req.user.section || "").trim();

    if (!day || !subject || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields: day, period, subject, startTime, endTime" });
    }

    const config = await getTimetableConfigDoc({ schoolId, classId: className, sectionId: section });
    const activeDays = new Set(normalizeTimetableDays(config.days).map((d) => d.toLowerCase()));
    const periodRows = getPeriodRowsFromConfig(config);
    const periodRowsByKey = new Map(periodRows.map((row, idx) => [String(row.rowKey), { ...row, periodIndex: idx + 1 }]));

    const dayValue = String(day || "").trim();
    if (!activeDays.has(dayValue.toLowerCase())) {
      return res.status(400).json({ error: "Selected day is not active in timetable settings" });
    }

    const rowKeyValue = String(rowKey || "").trim();
    let periodValue = Number(period);
    let resolvedRowKey = rowKeyValue;
    if (resolvedRowKey) {
      const rowMeta = periodRowsByKey.get(resolvedRowKey);
      if (!rowMeta) return res.status(400).json({ error: "Invalid timetable row selected" });
      periodValue = rowMeta.periodIndex;
    } else {
      if (Number.isNaN(periodValue) || periodValue < 1 || periodValue > periodRows.length) {
        return res.status(400).json({ error: "Invalid period for timetable settings" });
      }
      resolvedRowKey = String(periodRows[periodValue - 1]?.rowKey || "");
    }

    const timetableEntry = {
      schoolId,
      class: className,
      section,
      day: dayValue,
      period: periodValue,
      rowKey: resolvedRowKey,
      subject: String(subject).trim(),
      startTime: String(startTime),
      endTime: String(endTime),
      isDeleted: false,
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
      const students = await db.collection("students").find(activeStudentFilter({
        schoolId,
        class: className,
        section,
      })).toArray();

      if (students.length > 0) {
        const notifications = students.map((student) => ({
          title: `Timetable Updated: ${subject}`,
          message: `New class schedule added - ${subject} on ${dayValue}`,
          type: "timetable",
          targetRole: "STUDENT",
          targetUser: student.userId,
          schoolId,
          referenceId: insertResult.insertedId,
          targetRoute: `/student/dashboard?section=timetable`,
          metadata: {
            timetableId: insertResult.insertedId.toString(),
            day: dayValue,
            period: periodValue,
            rowKey: resolvedRowKey,
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
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const usePagination = Boolean(req.query.page || req.query.limit);
    const schoolId = req.user.schoolIdObj;
    const className = String(req.user.class || "").trim();
    const section = String(req.user.section || "").trim();
    const config = await getTimetableConfigDoc({ schoolId, classId: className, sectionId: section });
    const periodRows = getPeriodRowsFromConfig(config);

    const query = {
      schoolId,
      class: className,
      section,
      isDeleted: { $ne: true },
    };
    const [timetable, totalCount] = await Promise.all([
      db.collection("timetables")
        .find(query)
        .sort({ day: 1, period: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("timetables").countDocuments(query),
    ]);

    console.log("✅ TEACHER TIMETABLE - Count:", timetable.length, "Class:", className, "Section:", section);
    const withRowKey = timetable.map((entry) => {
      if (String(entry?.rowKey || "").trim()) return entry;
      const periodValue = Number(entry?.period);
      const fallbackRowKey = periodRows[periodValue - 1]?.rowKey || "";
      return {
        ...entry,
        rowKey: fallbackRowKey,
      };
    });
    if (usePagination) {
      return res.json({
        data: withRowKey,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }
    res.json(withRowKey);
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
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const usePagination = Boolean(req.query.page || req.query.limit);
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Find student profile to get class/section
    const student = await db.collection("students").findOne(activeStudentFilter({
      userId,
      schoolId,
    }));

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const query = {
      schoolId,
      class: student.class,
      section: student.section,
      isDeleted: { $ne: true },
    };
    const [timetable, totalCount] = await Promise.all([
      db.collection("timetables")
        .find(query)
        .sort({ day: 1, period: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("timetables").countDocuments(query),
    ]);

    console.log("✅ STUDENT TIMETABLE - Count:", timetable.length, "Class:", student.class, "Section:", student.section);
    const config = await getTimetableConfigDoc({
      schoolId,
      classId: String(student.class || "").trim(),
      sectionId: String(student.section || "").trim(),
    });
    const periodRows = getPeriodRowsFromConfig(config);
    const withRowKey = timetable.map((entry) => {
      if (String(entry?.rowKey || "").trim()) return entry;
      const periodValue = Number(entry?.period);
      const fallbackRowKey = periodRows[periodValue - 1]?.rowKey || "";
      return {
        ...entry,
        rowKey: fallbackRowKey,
      };
    });
    if (usePagination) {
      return res.json({
        data: withRowKey,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }
    res.json(withRowKey);
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
    const teacherId = safeObjectId(req.user.userId);

    if (!timetableId) {
      return res.status(400).json({ error: "Invalid timetable ID" });
    }

    const result = await db.collection("timetables").updateOne(
      {
        _id: timetableId,
        schoolId,
        class: req.user.class,
        section: req.user.section,
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: teacherId,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Timetable entry not found" });
    }

    await db.collection("notifications").updateMany(
      { schoolId, type: "timetable", referenceId: timetableId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
    );

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
      isDeleted: false,
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
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const schoolId = req.user.schoolIdObj;
    const className = req.user.class;
    const section = req.user.section;

    const query = {
      schoolId,
      class: className,
      section: section,
      isDeleted: { $ne: true },
    };
    const [exams, totalCount] = await Promise.all([
      db.collection("examSyllabus")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("examSyllabus").countDocuments(query),
    ]);

    console.log("✅ TEACHER EXAM SYLLABUSES - Count:", exams.length);
    res.json({
      data: exams.map((e) => ({ ...e, _id: e._id.toString() })),
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
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
    const teacherClass = String(req.user.class || "").trim();
    const teacherSection = String(req.user.section || "").trim();
    const className = String(req.query.class || teacherClass).trim();
    const section = String(req.query.section || teacherSection).trim();
    const teacherId = safeObjectId(req.user.userId);

    if (!examId) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }

    const result = await db.collection("examSyllabus").updateOne(
      {
        _id: examId,
        schoolId,
        class: className,
        section: section,
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: teacherId,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Exam syllabus not found" });
    }

    await db.collection("notifications").updateMany(
      { schoolId, type: "syllabus", referenceId: examId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
    );

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
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const userObjectId = safeObjectId(req.user?.userId);
    const schoolObjectId = req.user.schoolIdObj; // From requireTenantId middleware

    if (!userObjectId) {
      return res.status(400).json({ error: "Invalid userId in token" });
    }

    console.log("📚 STUDENT EXAM SYLLABUS - Fetching for userId:", userObjectId, "schoolId:", schoolObjectId);

    // ✅ FIRST: Find student with userId and schoolId to get their class/section
    const student = await db.collection("students").findOne(activeStudentFilter({
      userId: userObjectId,
      schoolId: schoolObjectId,
    }));

    if (!student) {
      console.warn("⚠️ STUDENT EXAM SYLLABUS - Student not found");
      return res.status(404).json({ error: "Student profile not found" });
    }

    console.log("📚 STUDENT EXAM SYLLABUS - Found student class:", student.class, "section:", student.section);

    // ✅ NOW: Get exam syllabuses for this student's class and section
    const query = {
      schoolId: schoolObjectId,
      class: student.class,
      section: student.section,
      isDeleted: { $ne: true },
    };
    const [exams, totalCount] = await Promise.all([
      db
        .collection("examSyllabus")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("examSyllabus").countDocuments(query),
    ]);

    console.log("✅ STUDENT EXAM SYLLABUSES - Count:", exams.length, "for class:", student.class, "section:", student.section);
    exams.forEach((exam) => {
      console.log(`   📖 ${exam.examName} (ID: ${exam._id}, Subjects: ${exam.subjects?.length || 0})`);
    });

    res.json({
      data: exams.map((e) => ({ ...e, _id: e._id.toString() })),
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
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
    const scope = String(req.query.scope || req.body?.scope || "timetable").toLowerCase();
    if (scope === "marks") {
      const schoolId = req.user.schoolIdObj;
      const teacherId = safeObjectId(req.user.userId);
      const teacherClass = String(req.user.class || "").trim();
      const teacherSection = String(req.user.section || "").trim();
      const { name, subject, subjects: subjectsRaw, class: classRaw, section: sectionRaw, maxMarks, date } = req.body || {};
      const className = String(classRaw || teacherClass).trim();
      const section = String(sectionRaw || teacherSection).trim();
      const examName = String(name || "").trim();
      const parsedDate = date ? new Date(date) : null;

      if (!examName || !className || !section) {
        return res.status(400).json({ error: "name, class and section are required" });
      }
      if (className !== teacherClass || section !== teacherSection) {
        return res.status(403).json({ error: "You can only manage exams for your class/section" });
      }
      if (parsedDate && Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid exam date format" });
      }

      const normalizedSubjects = normalizeExamSubjects(subjectsRaw);
      // V2 shape: one exam with multiple subjects
      if (normalizedSubjects.length > 0) {
        const duplicateV2 = await db.collection("exams").findOne({
          schoolId,
          class: className,
          section,
          name: examName,
          subjects: { $exists: true },
          isDeleted: { $ne: true },
        });
        if (duplicateV2) return res.status(409).json({ error: "Exam already exists for this class/section" });

        const examDoc = {
          schoolId,
          name: examName,
          class: className,
          section,
          date: parsedDate || null,
          subjects: normalizedSubjects,
          createdBy: teacherId,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
        };
        const result = await db.collection("exams").insertOne(examDoc);
        return res.json({ success: true, exam: { ...examDoc, _id: result.insertedId.toString() } });
      }

      const maxMarksNum = Number(maxMarks);
      if (!subject || !(maxMarksNum > 0)) {
        return res.status(400).json({ error: "For single-subject exam, subject and maxMarks (>0) are required" });
      }

      const subjectId = safeObjectId(subject);
      const subjectDoc = subjectId
        ? await db.collection("subjects").findOne({ _id: subjectId, schoolId, class: className, section, isDeleted: { $ne: true } })
        : await db.collection("subjects").findOne({
            schoolId,
            class: className,
            section,
            isDeleted: { $ne: true },
            $or: [{ name: String(subject).trim() }, { subjectName: String(subject).trim() }],
          });
      if (!subjectDoc) return res.status(400).json({ error: "subject must exist for this class/section" });

      const subjectName = String(subjectDoc.name || subjectDoc.subjectName || "").trim();
      const duplicate = await db.collection("exams").findOne({
        schoolId,
        class: className,
        section,
        name: examName,
        subjectId: subjectDoc._id,
        isDeleted: { $ne: true },
      });
      if (duplicate) return res.status(409).json({ error: "Exam already exists for this subject and class/section" });

      const examDoc = {
        schoolId,
        name: examName,
        subjectId: subjectDoc._id,
        subjectName,
        class: className,
        section,
        date: parsedDate || null,
        maxMarks: maxMarksNum,
        createdBy: teacherId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };
      const result = await db.collection("exams").insertOne(examDoc);
      return res.json({ success: true, exam: { ...examDoc, _id: result.insertedId.toString() } });
    }

    const { class: classFromBody, section: sectionFromBody, examName, subject, date, startTime, endTime } = req.body;
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    const className = String(classFromBody || req.user.class || "").trim();
    const section = String(sectionFromBody || req.user.section || "").trim();

    if (!subject || !examName || !date || !startTime || !endTime || !className || !section) {
      return res.status(400).json({ error: "Missing required fields: class, section, examName, subject, date, startTime, endTime" });
    }
    if (!teacherId) return res.status(400).json({ error: "Invalid teacher ID" });

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const exam = {
      schoolId,
      class: className,
      section,
      examName: String(examName).trim(),
      subject: String(subject).trim(),
      date: parsedDate,
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      createdBy: teacherId,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("examTimetables").insertOne(exam);

    console.log("EXAM TIMETABLE ROW CREATED - ID:", result.insertedId, "Name:", exam.examName, "Subject:", exam.subject);
    res.json({
      success: true,
      examId: result.insertedId.toString(),
      exam: {
        ...exam,
        _id: result.insertedId.toString(),
        date: exam.date.toISOString(),
        examDate: exam.date.toISOString(),
      },
    });
  } catch (err) {
    console.error("EXAM CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create exam row" });
  }
});

/**
 * TEACHER: GET /api/teacher/exams
 * List exam timetable rows for teacher class/section
 */
app.get("/api/teacher/exams", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const scope = String(req.query.scope || "timetable").toLowerCase();
    if (scope === "marks") {
      const schoolId = req.user.schoolIdObj;
      const teacherClass = String(req.user.class || "").trim();
      const teacherSection = String(req.user.section || "").trim();
      const className = String(req.query.class || teacherClass).trim();
      const section = String(req.query.section || teacherSection).trim();

      if (!className || !section) return res.status(400).json({ error: "class and section are required" });
      if ((req.query.class && className !== teacherClass) || (req.query.section && section !== teacherSection)) {
        return res.status(403).json({ error: "You can only access your assigned class/section exams" });
      }

      const marksQuery = { schoolId, class: className, section, isDeleted: { $ne: true } };
      const [exams, totalCount] = await Promise.all([
        db.collection("exams")
          .find(marksQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection("exams").countDocuments(marksQuery),
      ]);
      const activeSubjectKeys = await getActiveSubjectKeySet({ schoolId, className, section });

      return res.json({
        data: exams.map((e) => {
          // Backward compatibility: convert legacy single-subject exam docs to V2 response shape.
          if (!Array.isArray(e.subjects) || e.subjects.length === 0) {
            const subjectName = normalizeSubjectName(e.subjectName || "");
            const maxMarks = Number(e.maxMarks || 0);
            const includeLegacySubject = subjectName && maxMarks > 0 && activeSubjectKeys.has(subjectName.toLowerCase());
            return {
              ...e,
              _id: e._id.toString(),
              subjectId: e.subjectId?.toString?.() || e.subjectId,
              subjects: includeLegacySubject ? [{ name: subjectName, maxMarks }] : [],
            };
          }
          const filteredSubjects = normalizeExamSubjects(e.subjects).filter((subj) => activeSubjectKeys.has(subj.name.toLowerCase()));
          return {
            ...e,
            _id: e._id.toString(),
            subjects: filteredSubjects,
          };
        }).filter((exam) => Array.isArray(exam.subjects) && exam.subjects.length > 0),
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }

    const schoolId = req.user.schoolIdObj;
    const teacherClass = String(req.user.class || "").trim();
    const teacherSection = String(req.user.section || "").trim();
    const className = String(req.query.class || teacherClass).trim();
    const section = String(req.query.section || teacherSection).trim();

    if (!className || !section) {
      return res.status(400).json({ error: "class and section are required" });
    }
    if ((req.query.class && className !== teacherClass) || (req.query.section && section !== teacherSection)) {
      return res.status(403).json({ error: "You can only access your assigned class/section exams" });
    }

    const timetableQuery = {
      schoolId,
      class: className,
      section,
      isDeleted: { $ne: true },
      ...buildDateRangeQuery("date", from, to),
    };
    const [exams, totalCount] = await Promise.all([
      db.collection("examTimetables")
        .find(timetableQuery)
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("examTimetables").countDocuments(timetableQuery),
    ]);

    console.log("TEACHER EXAMS - Count:", exams.length);
    res.json({
      data: exams.map((e) => ({
        ...e,
        _id: e._id.toString(),
        date: e.date ? new Date(e.date).toISOString() : null,
        examDate: e.date ? new Date(e.date).toISOString() : null,
      })),
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
  } catch (err) {
    console.error("TEACHER EXAMS FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

/**
 * TEACHER: PUT /api/teacher/exams/:id
 * Update an exam timetable row
 */
app.put("/api/teacher/exams/:id", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const scope = String(req.query.scope || req.body?.scope || "timetable").toLowerCase();
    if (scope === "marks") {
      const examId = safeObjectId(req.params.id);
      const schoolId = req.user.schoolIdObj;
      const teacherId = safeObjectId(req.user.userId);
      if (!examId || !teacherId) return res.status(400).json({ error: "Invalid exam ID or teacher ID" });

      const teacherClass = String(req.user.class || "").trim();
      const teacherSection = String(req.user.section || "").trim();
      const existingExam = await db.collection("exams").findOne({
        _id: examId,
        schoolId,
        class: teacherClass,
        section: teacherSection,
        isDeleted: { $ne: true },
      });
      if (!existingExam) return res.status(404).json({ error: "Exam not found" });

      const updates = {};
      let clearLegacySubjectFields = false;
      if (req.body.name !== undefined) {
        const nextName = String(req.body.name || "").trim();
        if (!nextName) return res.status(400).json({ error: "Exam name is required" });
        updates.name = nextName;
      }
      if (req.body.class !== undefined) updates.class = String(req.body.class || "").trim();
      if (req.body.section !== undefined) updates.section = String(req.body.section || "").trim();
      if (updates.class && updates.class !== teacherClass) return res.status(403).json({ error: "Cannot move exam to a different class" });
      if (updates.section && updates.section !== teacherSection) return res.status(403).json({ error: "Cannot move exam to a different section" });
      if (req.body.date !== undefined) {
        if (!req.body.date) {
          updates.date = null;
        } else {
          const parsedDate = new Date(req.body.date);
          if (Number.isNaN(parsedDate.getTime())) return res.status(400).json({ error: "Invalid date format" });
          updates.date = parsedDate;
        }
      }

      if (Array.isArray(req.body.subjects)) {
        const normalizedSubjects = normalizeExamSubjects(req.body.subjects);
        if (normalizedSubjects.length === 0) {
          return res.status(400).json({ error: "At least one valid subject with maxMarks is required" });
        }
        updates.subjects = normalizedSubjects;
        clearLegacySubjectFields = true;
      } else {
        if (req.body.maxMarks !== undefined) {
          const maxMarksNum = Number(req.body.maxMarks);
          if (!(maxMarksNum > 0)) return res.status(400).json({ error: "maxMarks must be greater than 0" });
          updates.maxMarks = maxMarksNum;
        }
        if (req.body.subject !== undefined) {
          const className = updates.class || teacherClass;
          const section = updates.section || teacherSection;
          const subjectId = safeObjectId(req.body.subject);
          const subjectDoc = subjectId
            ? await db.collection("subjects").findOne({ _id: subjectId, schoolId, class: className, section, isDeleted: { $ne: true } })
            : await db.collection("subjects").findOne({
                schoolId,
                class: className,
                section,
                isDeleted: { $ne: true },
                $or: [{ name: String(req.body.subject).trim() }, { subjectName: String(req.body.subject).trim() }],
              });
          if (!subjectDoc) return res.status(400).json({ error: "subject must exist for this class/section" });
          updates.subjectId = subjectDoc._id;
          updates.subjectName = String(subjectDoc.name || subjectDoc.subjectName || "").trim();
        }
      }

      if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields provided for update" });
      updates.updatedAt = new Date();

      const updateDoc = { $set: updates };
      if (clearLegacySubjectFields) {
        updateDoc.$unset = { subjectId: "", subjectName: "", maxMarks: "" };
      }

      const result = await db.collection("exams").findOneAndUpdate(
        { _id: examId, schoolId, class: teacherClass, section: teacherSection, isDeleted: { $ne: true } },
        updateDoc,
        { returnDocument: "after" }
      );
      if (!result.value) return res.status(404).json({ error: "Exam not found" });
      return res.json({
        success: true,
        exam: {
          ...result.value,
          _id: result.value._id.toString(),
          subjectId: result.value.subjectId?.toString?.() || result.value.subjectId,
          subjects: normalizeExamSubjects(result.value.subjects),
        },
      });
    }

    const examId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    if (!examId || !teacherId) return res.status(400).json({ error: "Invalid exam ID or teacher ID" });

    const updates = {};
    if (req.body.examName !== undefined) updates.examName = String(req.body.examName).trim();
    if (req.body.subject !== undefined) updates.subject = String(req.body.subject).trim();
    if (req.body.startTime !== undefined) updates.startTime = String(req.body.startTime).trim();
    if (req.body.endTime !== undefined) updates.endTime = String(req.body.endTime).trim();
    if (req.body.class !== undefined) updates.class = String(req.body.class).trim();
    if (req.body.section !== undefined) updates.section = String(req.body.section).trim();
    if (req.body.date !== undefined) {
      const parsed = new Date(req.body.date);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: "Invalid date format" });
      updates.date = parsed;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }
    if (updates.class && updates.class !== String(req.user.class || "").trim()) {
      return res.status(403).json({ error: "Cannot move exam to a different class" });
    }
    if (updates.section && updates.section !== String(req.user.section || "").trim()) {
      return res.status(403).json({ error: "Cannot move exam to a different section" });
    }

    updates.updatedAt = new Date();

    const updateResult = await db.collection("examTimetables").findOneAndUpdate(
      { _id: examId, schoolId, createdBy: teacherId, isDeleted: { $ne: true } },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!updateResult.value) {
      return res.status(404).json({ error: "Exam row not found" });
    }

    const row = updateResult.value;
    return res.json({
      success: true,
      exam: {
        ...row,
        _id: row._id.toString(),
        date: row.date ? new Date(row.date).toISOString() : null,
        examDate: row.date ? new Date(row.date).toISOString() : null,
      },
    });
  } catch (err) {
    console.error("EXAM UPDATE ERROR:", err);
    return res.status(500).json({ error: "Failed to update exam row" });
  }
});

/**
 * TEACHER: DELETE /api/teacher/exams/:id
 * Soft delete an exam timetable row
 */
app.delete("/api/teacher/exams/:id", requireAuth, requireTenantId, async (req, res) => {
  try {
    const actorRole = String(req.user?.role || "");
    if (actorRole !== "TEACHER" && actorRole !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const scope = String(req.query.scope || req.body?.scope || "timetable").toLowerCase();
    if (scope === "marks") {
      const examId = safeObjectId(req.params.id);
      const schoolId = req.user.schoolIdObj;
      const actorId = safeObjectId(req.user.userId);
      if (!examId || !actorId) return res.status(400).json({ error: "Invalid exam ID" });

      const examFilter = {
        _id: examId,
        schoolId,
        isDeleted: { $ne: true },
      };
      if (actorRole === "TEACHER") {
        examFilter.class = String(req.user.class || "").trim();
        examFilter.section = String(req.user.section || "").trim();
      }

      const result = await db.collection("exams").updateOne(
        examFilter,
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: actorId, updatedAt: new Date() } }
      );
      if (result.modifiedCount === 0) return res.status(404).json({ error: "Exam not found" });

      // Keep marks data consistent with exam deletion.
      await db.collection("marks").deleteMany({
        schoolId,
        examId,
      });

      return res.json({ success: true, message: "Exam deleted successfully" });
    }

    if (actorRole !== "TEACHER") {
      return res.status(403).json({ error: "Only teachers can delete timetable exams" });
    }

    const examId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);

    if (!examId || !teacherId) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }

    const result = await db.collection("examTimetables").updateOne(
      {
        _id: examId,
        schoolId,
        createdBy: teacherId,
        class: req.user.class,
        section: req.user.section,
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: teacherId,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Exam row not found" });
    }

    console.log("EXAM DELETED - ID:", examId);
    res.json({ success: true, message: "Exam deleted" });
  } catch (err) {
    console.error("EXAM DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete exam row" });
  }
});

/**
 * STUDENT: GET /api/student/exams
 * Get exams for student's class/section (read-only)
 */
app.get("/api/student/exams", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const scope = String(req.query.scope || "timetable").toLowerCase();
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);

    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    let className = req.query.class ? String(req.query.class).trim() : "";
    let section = req.query.section ? String(req.query.section).trim() : "";

    if (!className || !section) {
      const student = await db.collection("students").findOne(activeStudentFilter({ userId, schoolId }));
      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }
      className = className || String(student.class || "").trim();
      section = section || String(student.section || "").trim();
    }

    if (!className || !section) {
      return res.status(400).json({ error: "class and section are required" });
    }

    if (scope === "marks") {
      const marksQuery = {
        schoolId,
        class: className,
        section,
        isDeleted: { $ne: true },
      };
      const [exams, totalCount] = await Promise.all([
        db.collection("exams")
          .find(marksQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection("exams").countDocuments(marksQuery),
      ]);
      const activeSubjectKeys = await getActiveSubjectKeySet({ schoolId, className, section });

      return res.json({
        data: exams.map((e) => {
          if (!Array.isArray(e.subjects) || e.subjects.length === 0) {
            const subjectName = normalizeSubjectName(e.subjectName || "");
            const maxMarks = Number(e.maxMarks || 0);
            const includeLegacySubject = subjectName && maxMarks > 0 && activeSubjectKeys.has(subjectName.toLowerCase());
            return {
              ...e,
              _id: e._id.toString(),
              subjectId: e.subjectId?.toString?.() || e.subjectId,
              subjects: includeLegacySubject ? [{ name: subjectName, maxMarks }] : [],
            };
          }
          const filteredSubjects = normalizeExamSubjects(e.subjects).filter((subj) => activeSubjectKeys.has(subj.name.toLowerCase()));
          return {
            ...e,
            _id: e._id.toString(),
            subjects: filteredSubjects,
          };
        }).filter((exam) => Array.isArray(exam.subjects) && exam.subjects.length > 0),
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }

    const timetableQuery = {
      schoolId,
      class: className,
      section,
      isDeleted: { $ne: true },
      ...buildDateRangeQuery("date", from, to),
    };
    const [exams, totalCount] = await Promise.all([
      db.collection("examTimetables")
        .find(timetableQuery)
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("examTimetables").countDocuments(timetableQuery),
    ]);

    console.log("STUDENT EXAMS - Count:", exams.length, "Class:", className, "Section:", section);
    res.json({
      data: exams.map((e) => ({
        ...e,
        _id: e._id.toString(),
        date: e.date ? new Date(e.date).toISOString() : null,
        examDate: e.date ? new Date(e.date).toISOString() : null,
      })),
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
  } catch (err) {
    console.error("STUDENT EXAMS FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch exam timetable" });
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
      db.collection("teachers").find(activeTeacherFilter({ schoolId })).toArray(),
      db.collection("students").find(activeStudentFilter({ schoolId })).toArray(),
    ]);

    // Extract user IDs
    const teacherUserIds = teachers.map((t) => t.userId);
    const studentUserIds = students.map((s) => s.userId);

    let broadcastToTeachers = 0;
    let broadcastToStudents = 0;

    const sharedBroadcastId = new ObjectId();

    // Create announcements for teachers if broadcastTo is "all" or "teachers"
    if ((broadcastTo === "all" || broadcastTo === "teachers") && teacherUserIds.length > 0) {
      const teacherAnnouncement = {
        broadcastId: sharedBroadcastId,
        schoolId,
        senderRole: "ADMIN",
        type: "announcement",
        senderId,
        title: title || "School Announcement",
        audioUrl,
        targetRole: "TEACHER",
        targetUserIds: teacherUserIds,
        isDeleted: false,
        createdAt: new Date(),
      };
      await db.collection("voice_messages").insertOne(teacherAnnouncement);
      broadcastToTeachers = teacherUserIds.length;
      console.log(`✅ Voice announcement sent to ${broadcastToTeachers} teachers`);
    }

    // Create announcements for students if broadcastTo is "all" or "students"
    if ((broadcastTo === "all" || broadcastTo === "students") && studentUserIds.length > 0) {
      const studentAnnouncement = {
        broadcastId: sharedBroadcastId,
        schoolId,
        senderRole: "ADMIN",
        type: "announcement",
        senderId,
        title: title || "School Announcement",
        audioUrl,
        targetRole: "STUDENT",
        targetUserIds: studentUserIds,
        isDeleted: false,
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
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const usePagination = Boolean(req.query.page || req.query.limit);
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
    const query = {
      schoolId,
      senderId,
      senderRole: { $in: ["ADMIN", "admin"] },
      targetRole: "TEACHER", // Only get the teacher version to avoid duplicates
      isDeleted: { $ne: true },
      $or: [{ type: "announcement" }, { type: { $exists: false } }],
    };
    const [announcements, totalCount] = await Promise.all([
      db.collection("voice_messages")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("voice_messages").countDocuments(query),
    ]);

    // Format for frontend
    const formatted = announcements.map((a) => ({
      _id: a._id.toString(),
      broadcastId: a.broadcastId ? a.broadcastId.toString() : null,
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
    if (usePagination) {
      return res.json({
        data: formatted,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
      });
    }
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
      schoolId,
      senderId,
      senderRole: "ADMIN",
      title,
      message,
      recipientRole, // 'TEACHER', 'STUDENT', or 'ALL'
      isDeleted: false,
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
        recipients = await db.collection("teachers").find(activeTeacherFilter(query)).toArray();
      } else if (role === "STUDENT") {
        recipients = await db.collection("students").find(activeStudentFilter(query)).toArray();
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
          isDeleted: false,
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

/* ================================
   ADMIN: REVOKE TEXT ANNOUNCEMENT
   ================================= */
app.delete("/api/admin/announcements/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const announcementId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!announcementId || !schoolId) return res.status(400).json({ error: "Invalid announcement id or schoolId" });

    const existing = await db.collection("announcements").findOne({ _id: announcementId, schoolId });
    if (!existing) return res.status(404).json({ error: "Announcement not found" });

    await runBestEffortTransaction("ADMIN_DELETE_ANNOUNCEMENT", async (session) => {
      const options = session ? { session } : {};
      await db.collection("announcements").updateOne(
        { _id: announcementId, schoolId },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
        options
      );
      await db.collection("notifications").updateMany(
        { schoolId, type: "announcement", referenceId: announcementId },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
        options
      );
    });

    console.log("✅ ADMIN ANNOUNCEMENT REVOKED:", announcementId.toString());
    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("❌ ADMIN DELETE ANNOUNCEMENT ERROR:", err);
    return res.status(500).json({ error: "Failed to delete announcement" });
  }
});

/* ================================
   ADMIN: REVOKE VOICE MESSAGE/BROADCAST
   ================================= */
app.delete("/api/admin/voice-messages/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const voiceId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!voiceId || !schoolId) return res.status(400).json({ error: "Invalid voice message id or schoolId" });

    const [modernVoice, legacyVoice] = await Promise.all([
      db.collection("voice_messages").findOne({ _id: voiceId, schoolId, senderRole: "ADMIN" }),
      db.collection("voiceMessages").findOne({ _id: voiceId, schoolId, senderRole: "ADMIN" }),
    ]);

    if (!modernVoice && !legacyVoice) return res.status(404).json({ error: "Voice message not found" });

    await runBestEffortTransaction("ADMIN_DELETE_VOICE_MESSAGE", async (session) => {
      const options = session ? { session } : {};
      if (modernVoice) {
        const revokeFilter = modernVoice.broadcastId
          ? {
              schoolId,
              senderRole: "ADMIN",
              senderId: modernVoice.senderId,
              broadcastId: modernVoice.broadcastId,
            }
          : {
              schoolId,
              senderRole: "ADMIN",
              senderId: modernVoice.senderId,
              title: modernVoice.title,
              audioUrl: modernVoice.audioUrl,
            };

        await db.collection("voice_messages").updateMany(
          revokeFilter,
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
          options
        );
        await db.collection("notifications").updateMany(
          {
            schoolId,
            type: "voice",
            $or: [{ referenceId: modernVoice._id }, { audioUrl: modernVoice.audioUrl }],
          },
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
          options
        );
      }

      if (legacyVoice) {
        await db.collection("voiceMessages").updateOne(
          { _id: legacyVoice._id, schoolId },
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
          options
        );
        await db.collection("notifications").updateMany(
          {
            schoolId,
            type: "voice",
            $or: [{ referenceId: legacyVoice._id }, { audioUrl: legacyVoice.audioUrl }],
          },
          { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
          options
        );
      }
    });

    console.log("✅ ADMIN VOICE MESSAGE REVOKED:", voiceId.toString());
    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("❌ ADMIN DELETE VOICE MESSAGE ERROR:", err);
    return res.status(500).json({ error: "Failed to delete voice message" });
  }
});

/* ================================
   ADMIN: REVOKE NOTIFICATION
   ================================= */
app.delete("/api/admin/notifications/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const notificationId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!notificationId || !schoolId) return res.status(400).json({ error: "Invalid notification id or schoolId" });

    const existing = await db.collection("notifications").findOne({ _id: notificationId, schoolId });
    if (!existing) return res.status(404).json({ error: "Notification not found" });

    await runBestEffortTransaction("ADMIN_DELETE_NOTIFICATION", async (session) => {
      const options = session ? { session } : {};
      const baseFilter = existing.referenceId
        ? { schoolId, type: existing.type, referenceId: existing.referenceId }
        : { _id: notificationId, schoolId };

      await db.collection("notifications").updateMany(
        baseFilter,
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
        options
      );
    });

    console.log("✅ ADMIN NOTIFICATION REVOKED:", notificationId.toString());
    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("❌ ADMIN DELETE NOTIFICATION ERROR:", err);
    return res.status(500).json({ error: "Failed to delete notification" });
  }
});

/* ================================
   ADMIN: REVOKE EVENT
   ================================= */
app.delete("/api/admin/events/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const eventId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!eventId || !schoolId) return res.status(400).json({ error: "Invalid event id or schoolId" });

    const existing = await db.collection("events").findOne({ _id: eventId, schoolId });
    if (!existing) return res.status(404).json({ error: "Event not found" });

    await runBestEffortTransaction("ADMIN_DELETE_EVENT", async (session) => {
      const options = session ? { session } : {};
      await db.collection("events").updateOne(
        { _id: eventId, schoolId },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
        options
      );
      await db.collection("notifications").updateMany(
        { schoolId, type: "event", referenceId: eventId },
        { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } },
        options
      );
    });

    console.log("✅ ADMIN EVENT REVOKED:", eventId.toString());
    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("❌ ADMIN DELETE EVENT ERROR:", err);
    return res.status(500).json({ error: "Failed to delete event" });
  }
});

/* ================================
   ADMIN: REVOKE HOMEWORK / SYLLABUS / TIMETABLE
   ================================= */
app.delete("/api/admin/homework/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const contentId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!contentId || !schoolId) return res.status(400).json({ error: "Invalid homework id or schoolId" });

    const result = await db.collection("homework").updateOne(
      { _id: contentId, schoolId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: "Homework not found" });

    await db.collection("notifications").updateMany(
      { schoolId, type: "homework", referenceId: contentId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } }
    );
    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("ADMIN DELETE HOMEWORK ERROR:", err);
    return res.status(500).json({ error: "Failed to delete homework" });
  }
});

app.delete("/api/admin/timetable/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const contentId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!contentId || !schoolId) return res.status(400).json({ error: "Invalid timetable id or schoolId" });

    const result = await db.collection("timetables").updateOne(
      { _id: contentId, schoolId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: "Timetable not found" });

    await db.collection("notifications").updateMany(
      { schoolId, type: "timetable", referenceId: contentId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } }
    );
    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("ADMIN DELETE TIMETABLE ERROR:", err);
    return res.status(500).json({ error: "Failed to delete timetable" });
  }
});

app.delete("/api/admin/syllabus/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const contentId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!contentId || !schoolId) return res.status(400).json({ error: "Invalid syllabus id or schoolId" });

    const result = await db.collection("examSyllabus").updateOne(
      { _id: contentId, schoolId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: "Syllabus not found" });

    await db.collection("notifications").updateMany(
      { schoolId, type: "syllabus", referenceId: contentId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } }
    );
    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("ADMIN DELETE SYLLABUS ERROR:", err);
    return res.status(500).json({ error: "Failed to delete syllabus" });
  }
});

app.delete("/api/admin/exam-syllabus/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const contentId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!contentId || !schoolId) return res.status(400).json({ error: "Invalid exam syllabus id or schoolId" });

    const result = await db.collection("examSyllabus").updateOne(
      { _id: contentId, schoolId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: "Exam syllabus not found" });

    await db.collection("notifications").updateMany(
      { schoolId, type: "syllabus", referenceId: contentId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId } }
    );
    return res.json({ success: true, message: "Message deleted for everyone" });
  } catch (err) {
    console.error("ADMIN DELETE EXAM SYLLABUS ERROR:", err);
    return res.status(500).json({ error: "Failed to delete exam syllabus" });
  }
});

/* ================================
   TEACHER: REVOKE OWN VOICE MESSAGE/BROADCAST
   ================================= */
app.delete("/api/teacher/voice-messages/:id", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const voiceId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    if (!voiceId || !schoolId || !teacherId) return res.status(400).json({ error: "Invalid voice message id or schoolId" });

    const voice = await db.collection("voiceMessages").findOne({
      _id: voiceId,
      schoolId,
      senderRole: { $in: ["TEACHER", "teacher"] },
      senderId: teacherId,
      isDeleted: { $ne: true },
    });
    if (!voice) return res.status(404).json({ error: "Voice message not found" });

    await db.collection("voiceMessages").updateOne(
      { _id: voiceId, schoolId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
    );
    await db.collection("notifications").updateMany(
      {
        schoolId,
        type: "voice",
        $or: [{ referenceId: voiceId }, { audioUrl: voice.audioUrl }],
      },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
    );

    return res.json({ success: true, message: "Voice message deleted" });
  } catch (err) {
    console.error("TEACHER DELETE VOICE MESSAGE ERROR:", err);
    return res.status(500).json({ error: "Failed to delete voice message" });
  }
});

app.delete("/api/teacher/announcements/:id", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const announcementId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    if (!announcementId || !schoolId || !teacherId) return res.status(400).json({ error: "Invalid announcement id or schoolId" });

    const result = await db.collection("voice_messages").updateOne(
      { _id: announcementId, schoolId, senderRole: "TEACHER", senderId: teacherId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: "Announcement not found" });

    await db.collection("notifications").updateMany(
      { schoolId, type: "voice", referenceId: announcementId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
    );

    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("TEACHER DELETE ANNOUNCEMENT ERROR:", err);
    return res.status(500).json({ error: "Failed to delete announcement" });
  }
});

app.delete("/api/teacher/syllabus/:id", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const syllabusId = safeObjectId(req.params.id);
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    if (!syllabusId || !schoolId || !teacherId) return res.status(400).json({ error: "Invalid syllabus id or schoolId" });

    const result = await db.collection("examSyllabus").updateOne(
      { _id: syllabusId, schoolId, class: req.user.class, section: req.user.section, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId, updatedAt: new Date() } }
    );
    if (result.modifiedCount === 0) return res.status(404).json({ error: "Syllabus not found" });

    await db.collection("notifications").updateMany(
      { schoolId, type: "syllabus", referenceId: syllabusId },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: teacherId } }
    );

    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("TEACHER DELETE SYLLABUS ERROR:", err);
    return res.status(500).json({ error: "Failed to delete syllabus" });
  }
});

async function restoreDeletedContent({
  model,
  data,
  schoolId,
  actorId,
  actorRole,
  teacherClass = null,
  teacherSection = null,
  session = null,
}) {
  const options = session ? { session } : {};
  const modelKey = String(model || "").trim().toLowerCase();
  const contentId = safeObjectId(data?._id || data?.id);
  if (!contentId) {
    return { ok: false, error: "Invalid content id" };
  }

  if (modelKey === "notification") {
    const filter = { _id: contentId, schoolId };
    const update = await db.collection("notifications").updateOne(
      filter,
      { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } },
      options
    );
    return update.modifiedCount > 0 ? { ok: true } : { ok: false, error: "Notification not found" };
  }

  if (modelKey === "voice" || modelKey === "voice-message" || modelKey === "voice_message") {
    // Try new voice announcements collection first
    const modernVoice = await db.collection("voice_messages").findOne({ _id: contentId, schoolId }, options);
    if (modernVoice) {
      if (actorRole === "TEACHER" && String(modernVoice.senderId) !== String(actorId)) {
        return { ok: false, error: "Not allowed to restore this voice message" };
      }
      const restoreFilter = modernVoice.broadcastId
        ? { schoolId, broadcastId: modernVoice.broadcastId }
        : { _id: modernVoice._id, schoolId };
      await db.collection("voice_messages").updateMany(
        restoreFilter,
        { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } },
        options
      );
      await db.collection("notifications").updateMany(
        {
          schoolId,
          type: "voice",
          $or: [{ referenceId: modernVoice._id }, { audioUrl: modernVoice.audioUrl }],
        },
        { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } },
        options
      );
      return { ok: true };
    }

    // Legacy direct voice messages
    const legacyVoice = await db.collection("voiceMessages").findOne({ _id: contentId, schoolId }, options);
    if (!legacyVoice) return { ok: false, error: "Voice message not found" };
    if (actorRole === "TEACHER" && String(legacyVoice.senderId) !== String(actorId)) {
      return { ok: false, error: "Not allowed to restore this voice message" };
    }
    await db.collection("voiceMessages").updateOne(
      { _id: contentId, schoolId },
      { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } },
      options
    );
    await db.collection("notifications").updateMany(
      {
        schoolId,
        type: "voice",
        $or: [{ referenceId: contentId }, { audioUrl: legacyVoice.audioUrl }],
      },
      { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } },
      options
    );
    return { ok: true };
  }

  const modelMap = {
    announcement: { collection: "announcements", notificationType: "announcement" },
    event: { collection: "events", notificationType: "event" },
    homework: { collection: "homework", notificationType: "homework" },
    syllabus: { collection: "examSyllabus", notificationType: "syllabus" },
    "exam-syllabus": { collection: "examSyllabus", notificationType: "syllabus" },
    timetable: { collection: "timetables", notificationType: "timetable" },
    exam: { collection: "exams", notificationType: "exam" },
    exams: { collection: "exams", notificationType: "exam" },
  };

  const config = modelMap[modelKey];
  if (!config) return { ok: false, error: `Unsupported model: ${model}` };

  const filter = { _id: contentId, schoolId };
  if (actorRole === "TEACHER") {
    if (modelKey === "homework") filter.teacherId = actorId;
    if (modelKey === "event") filter.$or = [{ createdBy: actorId }, { class: teacherClass, section: teacherSection }];
    if (modelKey === "timetable" || modelKey === "syllabus" || modelKey === "exam-syllabus" || modelKey === "exam" || modelKey === "exams") {
      filter.class = teacherClass;
      filter.section = teacherSection;
    }
  }

  const update = await db.collection(config.collection).updateOne(
    filter,
    { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } },
    options
  );
  if (update.modifiedCount === 0) return { ok: false, error: `${model} not found or not allowed` };

  if (config.notificationType) {
    await db.collection("notifications").updateMany(
      { schoolId, type: config.notificationType, referenceId: contentId },
      { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } },
      options
    );
  }

  return { ok: true };
}

/* ================================
   ADMIN: RESTORE CONTENT (UNDO)
   ================================= */
app.post("/api/admin/restore", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const { model, data } = req.body || {};
    const schoolId = req.user.schoolIdObj;
    const adminId = safeObjectId(req.user.userId);
    if (!model || !data) return res.status(400).json({ error: "model and data are required" });

    const result = await runBestEffortTransaction("ADMIN_RESTORE_CONTENT", async (session) =>
      restoreDeletedContent({
        model,
        data,
        schoolId,
        actorId: adminId,
        actorRole: "ADMIN",
        session,
      })
    );

    if (!result.ok) return res.status(400).json({ error: result.error || "Restore failed" });
    return res.json({ success: true, message: "Restored successfully" });
  } catch (err) {
    console.error("ADMIN RESTORE ERROR:", err);
    return res.status(500).json({ error: "Failed to restore content" });
  }
});

/* ================================
   TEACHER: RESTORE OWN CONTENT (UNDO)
   ================================= */
app.post("/api/teacher/restore", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { model, data } = req.body || {};
    const schoolId = req.user.schoolIdObj;
    const teacherId = safeObjectId(req.user.userId);
    if (!model || !data) return res.status(400).json({ error: "model and data are required" });

    const result = await runBestEffortTransaction("TEACHER_RESTORE_CONTENT", async (session) =>
      restoreDeletedContent({
        model,
        data,
        schoolId,
        actorId: teacherId,
        actorRole: "TEACHER",
        teacherClass: req.user.class,
        teacherSection: req.user.section,
        session,
      })
    );

    if (!result.ok) return res.status(400).json({ error: result.error || "Restore failed" });
    return res.json({ success: true, message: "Restored successfully" });
  } catch (err) {
    console.error("TEACHER RESTORE ERROR:", err);
    return res.status(500).json({ error: "Failed to restore content" });
  }
});

const formatAnnouncementDate = (value) =>
  new Date(value || Date.now()).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

async function getAnnouncementFeed({ schoolId, userId, targetRole, from, to, skip = 0, limit = 20 }) {
  const createdAtRange = buildDateRangeQuery("createdAt", from, to);
  const safeSkip = Math.max(0, Number(skip) || 0);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const [textAnnouncements, modernVoiceAnnouncements, legacyVoiceAnnouncements] = await Promise.all([
    db.collection("announcements")
      .find({
        schoolId,
        senderRole: { $in: ["ADMIN", "admin"] },
        recipientRole: { $in: [targetRole, "ALL"] },
        isDeleted: { $ne: true },
        ...createdAtRange,
      })
      .sort({ createdAt: -1 })
      .skip(safeSkip)
      .limit(safeLimit)
      .toArray(),
    db.collection("voice_messages")
      .find({
        schoolId,
        senderRole: { $in: ["ADMIN", "admin"] },
        targetRole,
        targetUserIds: { $in: [userId] },
        isDeleted: { $ne: true },
        ...createdAtRange,
        $or: [{ type: "announcement" }, { type: { $exists: false } }],
      })
      .sort({ createdAt: -1 })
      .skip(safeSkip)
      .limit(safeLimit)
      .toArray(),
    db.collection("voiceMessages")
      .find({
        schoolId,
        senderRole: { $in: ["ADMIN", "admin"] },
        targetRole,
        targetUserIds: userId,
        isDeleted: { $ne: true },
        ...createdAtRange,
        $or: [{ type: "announcement" }, { type: { $exists: false } }],
      })
      .sort({ createdAt: -1 })
      .skip(safeSkip)
      .limit(safeLimit)
      .toArray(),
  ]);

  const normalizedText = textAnnouncements.map((a) => ({
    _id: a._id.toString(),
    title: a.title || "School Announcement",
    message: a.message || "",
    audioUrl: null,
    senderName: "Admin",
    senderType: "Admin",
    createdAt: a.createdAt,
    createdAtFormatted: formatAnnouncementDate(a.createdAt),
    contentType: "text",
  }));

  const normalizedVoice = [...modernVoiceAnnouncements, ...legacyVoiceAnnouncements].map((a) => ({
    _id: a._id.toString(),
    title: a.title || "School Announcement",
    message: a.message || "",
    audioUrl: a.audioUrl,
    senderName: "Admin",
    senderType: "Admin",
    createdAt: a.createdAt,
    createdAtFormatted: formatAnnouncementDate(a.createdAt),
    contentType: "voice",
  }));

  const dedupedById = new Map();
  [...normalizedText, ...normalizedVoice].forEach((item) => {
    dedupedById.set(item._id, item);
  });

  return Array.from(dedupedById.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

app.get("/api/teacher/announcements", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const usePagination = Boolean(req.query.page || req.query.limit);
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user ID" });

    const announcements = await getAnnouncementFeed({ schoolId, userId, targetRole: "TEACHER", from, to, skip, limit });
    console.log(`✅ TEACHER ANNOUNCEMENTS: ${announcements.length} items`);
    if (usePagination) {
      return res.json({
        data: announcements,
        page,
        totalPages: Math.max(1, Math.ceil(announcements.length / limit)),
        totalCount: announcements.length,
      });
    }
    return res.json(announcements);
  } catch (err) {
    console.error("❌ TEACHER ANNOUNCEMENTS ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.get("/api/student/announcements", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const usePagination = Boolean(req.query.page || req.query.limit);
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user ID" });

    const announcements = await getAnnouncementFeed({ schoolId, userId, targetRole: "STUDENT", from, to, skip, limit });
    console.log(`✅ STUDENT ANNOUNCEMENTS: ${announcements.length} items`);
    if (usePagination) {
      return res.json({
        data: announcements,
        page,
        totalPages: Math.max(1, Math.ceil(announcements.length / limit)),
        totalCount: announcements.length,
      });
    }
    return res.json(announcements);
  } catch (err) {
    console.error("❌ STUDENT ANNOUNCEMENTS ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Backward-compatible aliases
app.get("/api/teacher/voice-announces", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const usePagination = Boolean(req.query.page || req.query.limit);
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user ID" });
    const announcements = await getAnnouncementFeed({ schoolId, userId, targetRole: "TEACHER", from, to, skip, limit });
    if (usePagination) {
      return res.json({
        data: announcements,
        page,
        totalPages: Math.max(1, Math.ceil(announcements.length / limit)),
        totalCount: announcements.length,
      });
    }
    return res.json(announcements);
  } catch (err) {
    console.error("❌ TEACHER VOICE-ANNOUNCES ALIAS ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.get("/api/student/voice-announces", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
    const usePagination = Boolean(req.query.page || req.query.limit);
    const schoolId = req.user.schoolIdObj;
    const userId = safeObjectId(req.user.userId);
    if (!userId) return res.status(400).json({ error: "Invalid user ID" });
    const announcements = await getAnnouncementFeed({ schoolId, userId, targetRole: "STUDENT", from, to, skip, limit });
    if (usePagination) {
      return res.json({
        data: announcements,
        page,
        totalPages: Math.max(1, Math.ceil(announcements.length / limit)),
        totalCount: announcements.length,
      });
    }
    return res.json(announcements);
  } catch (err) {
    console.error("❌ STUDENT VOICE-ANNOUNCES ALIAS ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

/* ================================
   NOTIFICATION SYSTEM ROUTES
   ================================= */

// ✅ GET /api/notifications - Get notifications for current user
app.get("/api/notifications", requireAuth, requireTenantId, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const schoolId = req.user.schoolIdObj;
    const userObjectId = safeObjectId(userId);
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });

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
              { targetUser: userObjectId },
              { targetUser: null },
              // Old schema
              { userId: userObjectId },
            ],
          },
          { schoolId },
          { isDeleted: { $ne: true } },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalCount = await db.collection("notifications")
      .countDocuments({
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
              { targetUser: userObjectId },
              { targetUser: null },
              { userId: userObjectId },
            ],
          },
          { schoolId },
          { isDeleted: { $ne: true } },
        ],
      });

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
              { targetUser: userObjectId },
              { targetUser: null },
              // Old schema
              { userId: userObjectId },
            ],
          },
          { isRead: false },
          { schoolId },
          { isDeleted: { $ne: true } },
        ],
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
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ✅ POST /api/notifications - Create a new notification
app.post("/api/notifications", requireAuth, requireTenantId, async (req, res) => {
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
      schoolId: req.user.schoolIdObj,
      createdBy: safeObjectId(req.user.userId),
      metadata: metadata || {},
      isRead: false,
      isDeleted: false,
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
app.put("/api/notifications/:id/read", requireAuth, requireTenantId, async (req, res) => {
  try {
    const { id } = req.params;
    const notificationId = safeObjectId(id);
    const userObjectId = safeObjectId(req.user.userId);
    const role = req.user.role;
    const schoolId = req.user.schoolIdObj;

    if (!notificationId) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const result = await db.collection("notifications").updateOne(
      {
        _id: notificationId,
        schoolId,
        isDeleted: { $ne: true },
        $and: [
          {
            $or: [
              { targetRole: role },
              { targetRole: null },
              { role },
            ],
          },
          {
            $or: [
              { targetUser: userObjectId },
              { targetUser: null },
              { userId: userObjectId },
            ],
          },
        ],
      },
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
app.put("/api/notifications/mark-all-read", requireAuth, requireTenantId, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const schoolId = req.user.schoolIdObj;
    const userObjectId = safeObjectId(userId);

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
            { targetUser: userObjectId },
            { targetUser: null },
            { userId: userObjectId },
          ],
        },
        { isRead: false },
        { schoolId },
        { isDeleted: { $ne: true } },
      ],
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
app.get("/api/notifications/unread-count", requireAuth, requireTenantId, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const schoolId = req.user.schoolIdObj;
    const userObjectId = safeObjectId(userId);

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
              { targetUser: userObjectId },
              { targetUser: null },
              // Old schema
              { userId: userObjectId },
            ],
          },
          { isRead: false },
          { schoolId },
          { isDeleted: { $ne: true } },
        ],
      });

    res.json({ unreadCount });
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// ✅ DELETE /api/notifications/:id - Delete a notification
app.delete("/api/notifications/:id", requireAuth, requireTenantId, async (req, res) => {
  try {
    const { id } = req.params;
    const notificationId = safeObjectId(id);
    const userObjectId = safeObjectId(req.user.userId);
    const role = req.user.role;
    const schoolId = req.user.schoolIdObj;

    if (!notificationId) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const result = await db.collection("notifications").updateOne(
      {
        _id: notificationId,
        schoolId,
        isDeleted: { $ne: true },
        $and: [
          {
            $or: [
              { targetRole: role },
              { targetRole: null },
              { role },
            ],
          },
          {
            $or: [
              { targetUser: userObjectId },
              { targetUser: null },
              { userId: userObjectId },
            ],
          },
        ],
      },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
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
          const student = await db.collection("students").findOne(activeStudentFilter({
            userId: user.userId,
            schoolId: schoolId,
          }));
          
          if (student?.name) {
            userName = student.name;
          } else {
            // Try to find in teachers collection (by userId field)
            const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
              userId: user.userId,
              schoolId: schoolId,
            }));
            
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
          const student = await db.collection("students").findOne(activeStudentFilter({
            userId: session.userId,
            schoolId: schoolId,
          }));
          
          if (student?.name) {
            userName = student.name;
          } else {
            // Try to find in teachers collection (by userId field)
            const teacher = await db.collection("teachers").findOne(activeTeacherFilter({
              userId: session.userId,
              schoolId: schoolId,
            }));
            
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
            parentPhone: "+91 9876543210",
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
            parentPhone: "+91 9876543210",
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
    const school = await db.collection("schools").findOne({ _id: schoolId }, { projection: { _id: 1, name: 1 } });
    const mySchoolStudents = await db.collection("students").countDocuments(activeStudentFilter({ schoolId }));
    const sampleStudents = await db.collection("students")
      .find(activeStudentFilter({ schoolId }))
      .project({ _id: 1, schoolId: 1, class: 1, section: 1, name: 1 })
      .limit(5)
      .toArray();
    
    res.json({
      mySchoolId: schoolId.toString(),
      mySchoolStudents,
      school: school ? { _id: school._id.toString(), name: school.name } : null,
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
    
    // Aggregate class/section metadata from students, teachers, and subjects for full coverage.
    const studentQuery = activeStudentFilter({ schoolId });
    const teacherQuery = activeTeacherFilter({ schoolId });
    const subjectQuery = { schoolId, isDeleted: { $ne: true } };
    const [
      studentClassesRaw,
      studentClassNamesRaw,
      studentSectionsRaw,
      teacherClassesRaw,
      teacherSectionsRaw,
      subjectClassesRaw,
      subjectSectionsRaw,
    ] = await Promise.all([
      db.collection("students").distinct("class", studentQuery),
      db.collection("students").distinct("className", studentQuery),
      db.collection("students").distinct("section", studentQuery),
      db.collection("teachers").distinct("class", teacherQuery),
      db.collection("teachers").distinct("section", teacherQuery),
      db.collection("subjects").distinct("class", subjectQuery),
      db.collection("subjects").distinct("section", subjectQuery),
    ]);
    const classesRaw = [
      ...(studentClassesRaw || []),
      ...(studentClassNamesRaw || []),
      ...(teacherClassesRaw || []),
      ...(subjectClassesRaw || []),
    ];
    const sectionsRaw = [
      ...(studentSectionsRaw || []),
      ...(teacherSectionsRaw || []),
      ...(subjectSectionsRaw || []),
    ];
    console.log(`✅ Distinct class/section loaded for schoolId ${schoolId}`);

    // Extract unique classes and sections
    const classesSet = new Set((classesRaw || []).map((value) => String(value || "").trim()).filter(Boolean));
    const sectionsSet = new Set((sectionsRaw || []).map((value) => String(value || "").trim()).filter(Boolean));

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
    const { page, limit, skip } = getPagination(req.query, { limit: 20 });
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
    const query = activeStudentFilter({
      schoolId,
      $or: [
        { class: classValue, section: sectionValue },
        { class: String(classValue), section: sectionValue },
      ]
    });
    const [students, totalCount] = await Promise.all([
      db.collection("students")
        .find(query)
        .sort({ rollNo: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("students").countDocuments(query),
    ]);

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
      data: formattedStudents,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      totalCount,
    });
  } catch (error) {
    console.error("❌ STUDENTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

/* ================================
   ADMIN: CONSOLIDATED ANALYTICS
   ================================= */

app.get("/api/admin/analytics", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
  try {
    const schoolId = req.user.schoolIdObj;

    const studentMatch = activeStudentFilter({ schoolId });
    const teacherMatch = activeTeacherFilter({ schoolId });

    const [totalStudents, totalTeachers, classStudentRows, attendanceRows, marksRows] = await Promise.all([
      db.collection("students").countDocuments(studentMatch),
      db.collection("teachers").countDocuments(teacherMatch),
      db.collection("students").aggregate([
        { $match: studentMatch },
        {
          $group: {
            _id: {
              className: { $trim: { input: { $toString: { $ifNull: ["$class", "$className"] } } } },
              sectionName: { $trim: { input: { $toString: { $ifNull: ["$section", ""] } } } },
            },
            totalStudents: { $sum: 1 },
          },
        },
        { $match: { "_id.className": { $ne: "" } } },
        {
          $project: {
            _id: 0,
            className: "$_id.className",
            sectionName: "$_id.sectionName",
            totalStudents: 1,
          },
        },
      ]).toArray(),
      db.collection("attendance").aggregate([
        { $match: { schoolId, submissionStatus: "SUBMITTED" } },
        {
          $group: {
            _id: {
              className: { $trim: { input: { $toString: { $ifNull: ["$class", "$className"] } } } },
              sectionName: { $trim: { input: { $toString: { $ifNull: ["$section", ""] } } } },
            },
            totalRecords: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $eq: [{ $toUpper: { $ifNull: ["$status", ""] } }, "PRESENT"] }, 1, 0],
              },
            },
            absent: {
              $sum: {
                $cond: [{ $eq: [{ $toUpper: { $ifNull: ["$status", ""] } }, "ABSENT"] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            className: "$_id.className",
            sectionName: "$_id.sectionName",
            totalRecords: 1,
            present: 1,
            absent: 1,
            avgAttendancePercent: {
              $cond: [{ $gt: ["$totalRecords", 0] }, { $multiply: [{ $divide: ["$present", "$totalRecords"] }, 100] }, 0],
            },
          },
        },
      ]).toArray(),
      db.collection("marks").aggregate([
        { $match: { schoolId } },
        {
          $addFields: {
            scoreNumeric: {
              $convert: {
                input: "$score",
                to: "double",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $group: {
            _id: {
              className: { $trim: { input: { $toString: { $ifNull: ["$class", "$className"] } } } },
              sectionName: { $trim: { input: { $toString: { $ifNull: ["$section", ""] } } } },
            },
            sumScore: {
              $sum: {
                $cond: [{ $ne: ["$scoreNumeric", null] }, "$scoreNumeric", 0],
              },
            },
            totalEntries: {
              $sum: {
                $cond: [{ $ne: ["$scoreNumeric", null] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            className: "$_id.className",
            sectionName: "$_id.sectionName",
            sumScore: 1,
            totalEntries: 1,
            avgMarksPercent: {
              $cond: [{ $gt: ["$totalEntries", 0] }, { $divide: ["$sumScore", "$totalEntries"] }, 0],
            },
          },
        },
      ]).toArray(),
    ]);

    const classMap = new Map();
    const getClassKey = (className, sectionName) => `${String(className || "").trim()}::${String(sectionName || "").trim()}`;

    for (const row of classStudentRows) {
      const className = String(row?.className || "").trim();
      const sectionName = String(row?.sectionName || "").trim();
      if (!className) continue;
      const key = getClassKey(className, sectionName);
      classMap.set(key, {
        className,
        sectionName,
        totalStudents: Number(row?.totalStudents || 0),
        avgAttendancePercent: 0,
        avgMarksPercent: 0,
      });
    }

    for (const row of attendanceRows) {
      const className = String(row?.className || "").trim();
      const sectionName = String(row?.sectionName || "").trim();
      if (!className) continue;
      const key = getClassKey(className, sectionName);
      const existing = classMap.get(key) || {
        className,
        sectionName,
        totalStudents: 0,
        avgAttendancePercent: 0,
        avgMarksPercent: 0,
      };
      existing.avgAttendancePercent = Number(row?.avgAttendancePercent || 0);
      existing.present = Number(row?.present || 0);
      existing.absent = Number(row?.absent || 0);
      existing.attendanceRecords = Number(row?.totalRecords || 0);
      classMap.set(key, existing);
    }

    for (const row of marksRows) {
      const className = String(row?.className || "").trim();
      const sectionName = String(row?.sectionName || "").trim();
      if (!className) continue;
      const key = getClassKey(className, sectionName);
      const existing = classMap.get(key) || {
        className,
        sectionName,
        totalStudents: 0,
        avgAttendancePercent: 0,
        avgMarksPercent: 0,
      };
      existing.avgMarksPercent = Number(row?.avgMarksPercent || 0);
      existing.markEntries = Number(row?.totalEntries || 0);
      classMap.set(key, existing);
    }

    const classes = Array.from(classMap.values())
      .map((row) => ({
        className: row.className,
        sectionName: row.sectionName,
        totalStudents: Math.max(0, Number(row.totalStudents || 0)),
        avgAttendancePercent: Math.max(0, Math.min(100, Number(row.avgAttendancePercent || 0))),
        avgMarksPercent: Math.max(0, Math.min(100, Number(row.avgMarksPercent || 0))),
        present: Math.max(0, Number(row.present || 0)),
        absent: Math.max(0, Number(row.absent || 0)),
        attendanceRecords: Math.max(0, Number(row.attendanceRecords || 0)),
        markEntries: Math.max(0, Number(row.markEntries || 0)),
      }))
      .sort((a, b) => {
        const classCmp = a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: "base" });
        if (classCmp !== 0) return classCmp;
        return a.sectionName.localeCompare(b.sectionName, undefined, { numeric: true, sensitivity: "base" });
      });

    const attendanceTotals = classes.reduce(
      (acc, row) => {
        acc.totalRecords += row.attendanceRecords;
        acc.present += row.present;
        acc.absent += row.absent;
        return acc;
      },
      { totalRecords: 0, present: 0, absent: 0 }
    );

    const marksTotals = classes.reduce(
      (acc, row) => {
        acc.totalEntries += row.markEntries;
        acc.sum += row.avgMarksPercent * row.markEntries;
        return acc;
      },
      { totalEntries: 0, sum: 0 }
    );

    const alerts = classes
      .filter((row) => row.avgAttendancePercent < 75 || row.avgMarksPercent < 60)
      .map((row) => {
        const attendanceLow = row.avgAttendancePercent < 75;
        const marksLow = row.avgMarksPercent < 60;
        return {
          className: row.className,
          sectionName: row.sectionName,
          type: attendanceLow && marksLow ? "attendance_marks" : attendanceLow ? "attendance" : "marks",
          message:
            attendanceLow && marksLow
              ? `Low attendance (${row.avgAttendancePercent.toFixed(1)}%) and marks (${row.avgMarksPercent.toFixed(1)}%).`
              : attendanceLow
              ? `Low attendance (${row.avgAttendancePercent.toFixed(1)}%).`
              : `Low marks (${row.avgMarksPercent.toFixed(1)}%).`,
        };
      })
      .slice(0, 30);

    return res.json({
      totalStudents,
      totalTeachers,
      classes,
      attendanceStats: {
        totalRecords: attendanceTotals.totalRecords,
        present: attendanceTotals.present,
        absent: attendanceTotals.absent,
        overallPercent:
          attendanceTotals.totalRecords > 0
            ? Number(((attendanceTotals.present / attendanceTotals.totalRecords) * 100).toFixed(1))
            : 0,
      },
      marksStats: {
        totalEntries: marksTotals.totalEntries,
        overallAverage:
          marksTotals.totalEntries > 0 ? Number((marksTotals.sum / marksTotals.totalEntries).toFixed(1)) : 0,
      },
      alerts,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("ADMIN ANALYTICS ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch admin analytics" });
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
    let studentQuery = activeStudentFilter({ schoolId });
    if (filterClass) {
      studentQuery.$or = [{ class: filterClass }, { className: filterClass }];
    }
    if (filterSection) studentQuery.section = filterSection;
    
    const [students, totalStudentsCount] = await Promise.all([
      db.collection("students").find(studentQuery).toArray(),
      db.collection("students").countDocuments(studentQuery),
    ]);
    console.log(`✅ Found ${students.length} students for query:`, studentQuery);

    if (students.length === 0) {
      console.log(`⚠️ No students found. Returning empty array.`);
      return res.json({
        data: [],
        page: 1,
        totalPages: 1,
        totalCount: totalStudentsCount,
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
    const studentIds = students.map((s) => s._id);
    const attendanceRecords = await db.collection("attendance")
      .find({ schoolId, studentId: { $in: studentIds } })
      .toArray();
    console.log(`✅ Found ${attendanceRecords.length} total attendance records`);

    // Get all marks records for this school
    const marksRecords = await db.collection("marks")
      .find({ schoolId, studentId: { $in: studentIds } })
      .toArray();
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
      const className = String(student.class ?? student.className ?? "").trim();
      const section = String(student.section ?? "").trim();
      if (!className || !section) return;
      const key = `${className}-${section}`;
      if (!classGroups[key]) {
        classGroups[key] = {
          class: className,
          section,
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
      page: 1,
      totalPages: 1,
      totalCount: totalStudentsCount,
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

app.use((err, req, res, _next) => {
  console.error(
    JSON.stringify({
      tag: "QA_EXPRESS_ERROR",
      requestId: req.qaRequestId || null,
      method: req.method,
      path: req.originalUrl,
      message: err?.message || "Unhandled error",
      stack: err?.stack || null,
    })
  );
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
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

