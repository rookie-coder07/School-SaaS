import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function authRoutes(db) {
  const router = express.Router();

  const users = db.collection("users");
  const students = db.collection("students");
  const schools = db.collection("schools");

  /* ===================== HELPER ===================== */
  function normalizeId(id) {
    // ✅ Handles ObjectId, BSON object, string
    if (!id) return null;
    if (id instanceof ObjectId) return id.toHexString();
    if (typeof id === "string") return id;
    if (typeof id === "object" && id.$oid) return id.$oid;
    return String(id);
  }

  /* ===================== ADMIN LOGIN ===================== */
  router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email, role: "SCHOOL_ADMIN" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
  {
    userId: user._id.toString(),
    schoolId: String(user.schoolId),
    role: "SCHOOL_ADMIN",
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);


    res.json({ token });
  });

  /* ===================== STUDENT LOGIN ===================== */
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

    // 2️⃣ Compare password
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3️⃣ Create JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: "STUDENT",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 4️⃣ Send response
    res.json({
      success: true,
      message: "Login successful",
      token,
    });

  } catch (err) {
    console.error("STUDENT LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
});


  /* ===================== TEACHER LOGIN (CRITICAL) ===================== */
  router.post("/teacher/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email, role: "TEACHER" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

 const token = jwt.sign(
  {
    userId: user._id.toString(),
    schoolId: String(user.schoolId),
    role: "TEACHER",
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

    res.json({ message: "Teacher login successful", token });
  });

  return router;
}
