import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

/* ===== ROUTES ===== */
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/student.js";
import teacherRoutes from "./routes/teacher.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const client = new MongoClient(process.env.MONGO_URI);

/* =====================================================
   🔐 ADMIN AUTH MIDDLEWARE
   ===================================================== */
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "SCHOOL_ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function startServer() {
  try {
    // 🔗 CONNECT DATABASE
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db("school_saas");
    const admissions = db.collection("admissions");

    /* ===== HEALTH CHECK ===== */
    app.get("/", (req, res) => {
      res.send("School SaaS Backend Running");
    });

    /* =====================================================
       📄 PUBLIC: SUBMIT ADMISSION
       ===================================================== */
    app.post("/api/admissions", async (req, res) => {
      try {
        if (!req.body || Object.keys(req.body).length === 0) {
          return res.status(400).json({ error: "Empty request body" });
        }

        await admissions.insertOne({
          ...req.body,
          status: "PENDING",
          createdAt: new Date(),
        });

        res.json({ message: "Application submitted successfully" });
      } catch (err) {
        console.error("❌ Admission insert error:", err.message);
        res.status(500).json({ error: "Submission failed" });
      }
    });

    /* =====================================================
       🧑‍💼 ADMIN: VIEW ALL ADMISSIONS
       ===================================================== */
    app.get("/api/admissions", async (req, res) => {
      try {
        const data = await admissions
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.json(data);
      } catch (err) {
        console.error("❌ Fetch admissions error:", err.message);
        res.status(500).json({ error: "Failed to fetch admissions" });
      }
    });

    /* =====================================================
       🗑️ ADMIN: DELETE ADMISSION  ✅ FIXED
       ===================================================== */
    app.delete("/api/admissions/:id", adminAuth, async (req, res) => {
      try {
        const { id } = req.params;

        const result = await admissions.deleteOne({
          _id: new ObjectId(id),
        });

        if (!result.deletedCount) {
          return res.status(404).json({ error: "Admission not found" });
        }

        res.json({ message: "Admission deleted successfully" });
      } catch (err) {
        console.error("❌ Delete admission error:", err.message);
        res.status(500).json({ error: "Failed to delete admission" });
      }
    });

    /* =====================================================
       🔐 AUTH ROUTES
       ===================================================== */
    app.use("/api/auth", authRoutes(db));

    /* =====================================================
       🎓 STUDENT ROUTES
       ===================================================== */
    app.use("/api/student", studentRoutes(db));

    /* =====================================================
       🧑‍🏫 TEACHER ROUTES
       ===================================================== */
    app.use("/api/teacher", teacherRoutes(db));

    /* =====================================================
       🟢 ATTENDANCE ROUTES
       ===================================================== */
    app.use("/api/attendance", attendanceRoutes(db));

    /* =====================================================
       🚀 START SERVER
       ===================================================== */
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB startup error:", err.message);
  }
}

startServer();
