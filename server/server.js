import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

/* ===== ROUTES ===== */
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/student.js";
import teacherRoutes from "./routes/teacher.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/* =====================================================
   🔴 IMPORTANT: SERVER STARTS FIRST (NO DB BLOCKING)
   ===================================================== */
app.get("/", (req, res) => {
  res.send("✅ School SaaS Backend is RUNNING");
});

app.get("/ping", (req, res) => {
  res.json({ status: "ok", server: "alive" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

/* =====================================================
   🟢 DATABASE CONNECTS AFTER SERVER IS LIVE
   ===================================================== */
(async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db("school_saas");
    const admissions = db.collection("admissions");

    /* ===== PUBLIC: SUBMIT ADMISSION ===== */
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
        console.error("❌ Admission error:", err.message);
        res.status(500).json({ error: "Submission failed" });
      }
    });

    /* ===== ADMIN: VIEW ADMISSIONS ===== */
    app.get("/api/admissions", async (req, res) => {
      const data = await admissions
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.json(data);
    });

    /* ===== AUTH / STUDENT / TEACHER / ATTENDANCE ===== */
    app.use("/api/auth", authRoutes(db));
    app.use("/api/student", studentRoutes(db));
    app.use("/api/teacher", teacherRoutes(db));
    app.use("/api/attendance", attendanceRoutes(db));

    console.log("✅ All routes mounted successfully");

  } catch (err) {
    console.error("❌ MongoDB connection FAILED:", err.message);
    console.error("👉 Backend is running, but DB features are disabled");
  }
})();
