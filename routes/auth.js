import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function authRoutes(db) {
  const router = express.Router();

  const users = db.collection("users");
  const students = db.collection("students");

  // 🔐 ADMIN AUTH MIDDLEWARE
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

  // 🧑‍💼 ADMIN LOGIN
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({
        email,
        role: "SCHOOL_ADMIN",
      });

      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          schoolId: user.schoolId.toString(),
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({ message: "Login successful", token, role: user.role });
    } catch {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // 🎓 STUDENT LOGIN
  router.post("/student/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({ email, role: "STUDENT" });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) return res.status(401).json({ error: "Invalid credentials" });

      const student = await students.findOne({ userId: user._id });
      if (!student)
        return res.status(404).json({ error: "Student profile missing" });

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          schoolId: user.schoolId.toString(),
          role: "STUDENT",
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({ message: "Login successful", token });
    } catch {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // 🗑️ ADMIN DELETE ADMISSION (🔥 FIXED)
  router.delete("/admissions/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.collection("admissions").deleteOne({
        _id: new ObjectId(id),
      });

      if (!result.deletedCount) {
        return res.status(404).json({ error: "Admission not found" });
      }

      res.json({ message: "Admission deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete admission" });
    }
  });

  return router;
}
