import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

console.log("🔥 authRoutes LOADED");

export default function authRoutes(db) {
  const router = express.Router();

  const users = db.collection("users");
  const students = db.collection("students");
  const schools = db.collection("schools");

  /* =====================================================
     🏫 ADMIN REGISTER (CREATE SCHOOL + ADMIN) – ONE TIME
     ===================================================== */
  router.post("/admin/register", async (req, res) => {
    try {
      const { schoolName, email, password } = req.body;

      if (!schoolName || !email || !password) {
        return res.status(400).json({ error: "All fields required" });
      }

      // prevent duplicate admin
      const existing = await users.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }

      // 1️⃣ create school
      const schoolResult = await schools.insertOne({
        name: schoolName,
        createdAt: new Date(),
      });

      // 2️⃣ hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // 3️⃣ create admin user
      await users.insertOne({
        email,
        passwordHash,
        role: "SCHOOL_ADMIN",
        schoolId: schoolResult.insertedId,
        createdAt: new Date(),
      });

      res.json({ message: "School & admin created successfully" });
    } catch (err) {
      console.error("❌ ADMIN REGISTER ERROR:", err.message);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  /* =====================================================
     🧑‍💼 ADMIN LOGIN
     ===================================================== */
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({
        email,
        role: "SCHOOL_ADMIN",
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          schoolId: user.schoolId.toString(),
          role: "SCHOOL_ADMIN",
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({ token, role: "SCHOOL_ADMIN" });
    } catch (err) {
      console.error("❌ ADMIN LOGIN ERROR:", err.message);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /* =====================================================
     🎓 STUDENT LOGIN
     ===================================================== */
  router.post("/student/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({
        email,
        role: "STUDENT",
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const student = await students.findOne({
        userId: user._id,
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile missing" });
      }

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          schoolId: user.schoolId.toString(),
          role: "STUDENT",
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({ token });
    } catch (err) {
      console.error("❌ STUDENT LOGIN ERROR:", err.message);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /* =====================================================
     🧑‍🏫 TEACHER LOGIN
     ===================================================== */
  router.post("/teacher/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({
        email,
        role: "TEACHER",
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          schoolId: user.schoolId.toString(),
          role: "TEACHER",
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({
        message: "Teacher login successful",
        token,
      });
    } catch (err) {
      console.error("❌ TEACHER LOGIN ERROR:", err.message);
      res.status(500).json({ error: "Login failed" });
    }
  });

  return router;
}
