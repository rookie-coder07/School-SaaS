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
 router.get("/students", teacherAuth, async (req, res) => {
  try {
    const teacher = await db.collection("teachers").findOne({
      userId: new ObjectId(req.user.userId)
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const students = await db.collection("students").find({
      class: teacher.class,
      section: teacher.section
    }).toArray();

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
res.json({
  token,
  class: teacher?.class,
  section: teacher?.section,
});
    res.json({ message: "Teacher login successful", token });
  });

  return router;
}
