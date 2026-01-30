import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function authRoutes(db) {
  const router = express.Router();

  const users = db.collection("users");
  const students = db.collection("students");
  const schools = db.collection("schools");

  /* =====================================================
      🏫 ADMIN REGISTER (ONLY ONCE)
  ===================================================== */
  router.post("/admin/register", async (req, res) => {
    try {
      const { schoolName, email, password } = req.body;

      if (!schoolName || !email || !password)
        return res.status(400).json({ error: "All fields required" });

      const existing = await users.findOne({ email });
      if (existing)
        return res.status(400).json({ error: "User already exists" });

      const school = await schools.insertOne({
        name: schoolName,
        createdAt: new Date(),
      });

      const hash = await bcrypt.hash(password, 10);

      await users.insertOne({
        email,
        passwordHash: hash,
        role: "SCHOOL_ADMIN",
        schoolId: school.insertedId,
        createdAt: new Date(),
      });

      res.json({
        message: "Admin created",
        schoolId: school.insertedId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Admin creation failed" });
    }
  });

  /* =====================================================
      🔐 ADMIN LOGIN
  ===================================================== */
  router.post("/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({
        email,
        role: "SCHOOL_ADMIN",
      });

      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
  {
    userId: user._id,
    schoolId: user.schoolId,   // ✅ REQUIRED
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /* =====================================================
      👨‍🏫 TEACHER LOGIN
  ===================================================== */
  router.post("/teacher/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({
        email,
        role: "TEACHER",
      });

      if (!user) {
        return res.status(401).json({ error: "Teacher not found" });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Wrong password" });

      const token = jwt.sign(
  {
    userId: user._id,
    schoolId: user.schoolId,   // ✅ THIS WAS MISSING
    role: "TEACHER"
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
        },
      });
    } catch (err) {
      console.error("TEACHER LOGIN ERROR:", err);
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

      if (!user)
        return res.status(401).json({ error: "Student not found" });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok)
        return res.status(401).json({ error: "Wrong password" });

      const token = jwt.sign(
  {
    userId: user._id,
    schoolId: user.schoolId,
    role: "STUDENT"
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);
      res.json({ token });
    } catch (err) {
      console.error("STUDENT LOGIN ERROR:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  return router;
}