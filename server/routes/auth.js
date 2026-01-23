import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

console.log("🔥 authRoutes LOADED");

export default function authRoutes(db) {
  const router = express.Router();
  const users = db.collection("users");
  const students = db.collection("students");

  /* ================= ADMIN LOGIN ================= */
  router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email, role: "SCHOOL_ADMIN" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, schoolId: user.schoolId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role });
  });

  /* ================= STUDENT LOGIN ================= */
  router.post("/student/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email, role: "STUDENT" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const student = await students.findOne({ userId: user._id });
    if (!student) return res.status(404).json({ error: "Student profile missing" });

    const token = jwt.sign(
      { userId: user._id, schoolId: user.schoolId, role: "STUDENT" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  });

  /* ================= TEACHER LOGIN ================= */
  router.post("/teacher/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({ email, role: "TEACHER" });
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
