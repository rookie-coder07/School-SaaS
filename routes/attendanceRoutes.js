import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function attendanceRoutes(db) {
  const router = express.Router();
  const attendance = db.collection("attendance");
  const students = db.collection("students");
  const teachers = db.collection("teachers");

  /* 🔐 AUTH */
  function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "No token" });

    try {
      const token = header.split(" ")[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  /* 👨‍🏫 GET students for teacher’s class */
  router.get("/class", auth, async (req, res) => {
    const { className, section } = req.query;

    const teacher = await teachers.findOne({
      userId: new ObjectId(req.user.userId),
      schoolId: new ObjectId(req.user.schoolId),
    });

    if (!teacher) {
      return res.status(403).json({ error: "Not a teacher" });
    }

    const allowed = teacher.classes.some(
      c => c.class === className && c.section === section
    );

    if (!allowed) {
      return res.status(403).json({ error: "Class not assigned" });
    }

    const data = await students.find({
      class: className,
      section,
      schoolId: new ObjectId(req.user.schoolId),
    }).toArray();

    res.json(data);
  });

  /* 📝 MARK ATTENDANCE */
  router.post("/mark", auth, async (req, res) => {
    const { date, records, className, section } = req.body;

    const docs = records.map(r => ({
      schoolId: new ObjectId(req.user.schoolId),
      class: className,
      section,
      date,
      studentUserId: new ObjectId(r.studentUserId),
      status: r.status,
      markedBy: new ObjectId(req.user.userId),
    }));

    await attendance.insertMany(docs);
    res.json({ message: "Attendance saved" });
  });

  return router;
}
