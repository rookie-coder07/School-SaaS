import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

/* ROUTES */
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/student.js";
import teacherRoutes from "./routes/teacher.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGO_URI);

async function startServer() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db("school_saas");

    const admissions = db.collection("admissions");

    /* HEALTH */
    app.get("/", (req, res) => {
      res.send("School SaaS Backend Running");
    });

    /* PUBLIC ADMISSION */
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

    /* ADMIN VIEW */
    app.get("/api/admissions", async (req, res) => {
      const data = await admissions
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.json(data);
    });

    /* ROUTES */
    app.use("/api/auth", authRoutes(db));
    app.use("/api/student", studentRoutes(db));
    app.use("/api/teacher", teacherRoutes(db));
    app.use("/api/attendance", attendanceRoutes(db));

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB startup error:", err.message);
  }
}

startServer();
