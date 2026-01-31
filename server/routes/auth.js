import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function authRoutes(db) {
  const router = express.Router();

  const users = db.collection("users");
  const students = db.collection("students");
  const teachers = db.collection("teachers");

  /* ===================== TOKEN VERIFY ===================== */
  function verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "No token" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
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
        role: "SCHOOL_ADMIN",
        schoolId: user.schoolId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  });

  /* ===================== TEACHER LOGIN ===================== */
  router.post("/teacher/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email, role: "TEACHER" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const teacher = await teachers.findOne({ userId: user._id });

    if (!teacher)
      return res.status(404).json({ error: "Teacher profile missing" });

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: "TEACHER",
        class: teacher.class,
        section: teacher.section,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      class: teacher.class,
      section: teacher.section,
    });
  });

  /* ===================== STUDENT DASHBOARD ===================== */
  router.get("/student/dashboard", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "STUDENT")
        return res.status(403).json({ error: "Access denied" });

      const student = await students.findOne({
        userId: new ObjectId(req.user.userId),
      });

      if (!student)
        return res.status(404).json({ error: "Student not found" });

      const teacher = await teachers.findOne({
        class: student.class,
        section: student.section,
      });

      res.json({
        student,
        teacher: teacher
          ? {
              name: teacher.name,
              class: teacher.class,
              section: teacher.section,
            }
          : null,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });

  /* ===================== TEACHER → STUDENTS ===================== */
  router.get("/teacher/students", verifyToken, async (req, res) => {
    if (req.user.role !== "TEACHER")
      return res.status(403).json({ error: "Access denied" });

    const teacher = await teachers.findOne({
      userId: new ObjectId(req.user.userId),
    });

    if (!teacher)
      return res.status(404).json({ error: "Teacher not found" });

    const studentsList = await students
      .find({
        class: teacher.class,
        section: teacher.section,
      })
      .toArray();

    res.json(studentsList);
  });

  return router;
}