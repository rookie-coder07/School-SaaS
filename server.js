import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

/* ROUTES */
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/student.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// PORT
const PORT = process.env.PORT || 5000;

/* =========================
   ✅ DATABASE (FIXED)
   ========================= */

// ❌ no hardcoded URI
// ✅ use only .env
const client = new MongoClient(process.env.MONGO_URI);

async function startServer() {
  try {
    await client.connect();
    console.log("✅ MongoDB Atlas connected successfully");

    // ✅ database name (FINAL)
    const db = client.db("Local");

    /* ===== COLLECTIONS ===== */
    const admissions = db.collection("admissions");

    /* ===== HEALTH CHECK ===== */
    app.get("/", (req, res) => {
      res.send("SaaS Backend Running and Connected to Atlas");
    });

    /* ===== PUBLIC: SUBMIT ADMISSION ===== */
    app.post("/api/admissions", async (req, res) => {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Empty request body" });
      }

      await admissions.insertOne({
        ...req.body,
        status: "PENDING",
        createdAt: new Date(),
      });

      res.json({ message: "Application submitted successfully" });
    });

    /* ===== ADMIN: GET ALL ADMISSIONS ===== */
    app.get("/api/admissions", async (req, res) => {
      const data = await admissions
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.json(data);
    });

    /* ===== ROUTES ===== */
    app.use("/api/auth", authRoutes(db));
    app.use("/api/student", studentRoutes(db));
    app.use("/api/attendance", attendanceRoutes(db));

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
}

startServer();
