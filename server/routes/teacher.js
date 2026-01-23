import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function teacherRoutes(db) {
  const router = express.Router();

  const teachers = db.collection("teachers");
  const students = db.collection("students");
  const attendance = db.collection("attendance");

  // 🔐 Auth middleware
  function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ error: "No token" });
    }

    try {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role !== "TEACHER") {
        return res.status(403).json({ error: "Access denied" });
      }

      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // 👤 GET teacher profile
  router.get("/me", auth, async (req, res) => {
    const teacher = await teachers.findOne({
      userId: new ObjectId(req.user.userId),
      schoolId: new ObjectId(req.user.schoolId),
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.json(teacher);
  });

  // 👨‍🎓 GET students of teacher's class
  router.get("/students", auth, async (req, res) => {
    const teacher = await teachers.findOne({
      userId: new ObjectId(req.user.userId),
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const list = await students.find({
      class: teacher.class,
      section: teacher.section,
      schoolId: new ObjectId(req.user.schoolId),
    }).toArray();

    res.json(list);
  });

  // 📝 MARK attendance
  router.post("/attendance", auth, async (req, res) => {
    const { studentUserId, date, status } = req.body;

    if (!studentUserId || !date || !status) {
      return res.status(400).json({ error: "Missing fields" });
    }

    await attendance.insertOne({
      studentUserId: new ObjectId(studentUserId),
      schoolId: new ObjectId(req.user.schoolId),
      date,
      status, // PRESENT / ABSENT
      markedBy: new ObjectId(req.user.userId),
      createdAt: new Date(),
    });

    res.json({ message: "Attendance marked" });
  });

  return router;
}
