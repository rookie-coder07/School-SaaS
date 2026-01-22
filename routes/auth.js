import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default function authRoutes(db) {
  const router = express.Router();

  const users = db.collection("users");
  const students = db.collection("students");

  // 🧑‍💼 ADMIN LOGIN (already working / keep)
  router.post("/login", async (req, res) => {
    try {
      const { email, password, schoolCode } = req.body;

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
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({
        message: "Login successful",
        token,
        role: user.role,
      });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // 🎓 STUDENT LOGIN (🔥 NEW)
  router.post("/student/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // 1️⃣ Find student user
      const user = await users.findOne({
        email,
        role: "STUDENT",
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // 2️⃣ Check password
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // 3️⃣ Ensure student profile exists
      const student = await students.findOne({ userId: user._id });
      if (!student) {
        return res.status(404).json({ error: "Student profile missing" });
      }

      // 4️⃣ Create token
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          schoolId: user.schoolId.toString(),
          role: "STUDENT",
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({
        message: "Login successful",
        token,
      });
    } catch (err) {
      console.error("❌ STUDENT LOGIN ERROR:", err.message);
      res.status(500).json({ error: "Login failed" });
    }
  });

  return router;
}
