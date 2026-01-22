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

const PORT = 5000;
const client = new MongoClient("mongodb://127.0.0.1:27017");

async function startServer() {
  try {
    // 🔗 CONNECT DB
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db("ghalib_school");

    /* ===== COLLECTIONS ===== */
    const admissions = db.collection("admissions");

    /* ===== HEALTH CHECK ===== */
    app.get("/", (req, res) => {
      res.send("SaaS Backend Running");
    });

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
        console.error("❌ Admission insert error:", err.message);
        res.status(500).json({ error: "Submission failed" });
      }
    });

    /* ===== ADMIN: GET ALL ADMISSIONS (🔥 THIS FIXES EMPTY ADMIN PAGE) ===== */
    app.get("/api/admissions", async (req, res) => {
      try {
        const data = await admissions
          .find({})
          .sort({ createdAt: -1 }) // latest first
          .toArray();

        res.json(data);
      } catch (err) {
        console.error("❌ Fetch admissions error:", err.message);
        res.status(500).json({ error: "Failed to fetch admissions" });
      }
    });

    /* ===== AUTH ===== */
    app.use("/api/auth", authRoutes(db));

    /* ===== STUDENT ===== */
    app.use("/api/student", studentRoutes(db));

    /* ===== ATTENDANCE ===== */
    app.use("/api/attendance", attendanceRoutes(db));

    /* ===== START SERVER ===== */
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB error:", err.message);
  }
}

startServer();
