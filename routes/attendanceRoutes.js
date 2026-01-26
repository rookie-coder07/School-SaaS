import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function attendanceRoutes(db) {
  const router = express.Router();

  const attendance = db.collection("attendance");

  /* ================= AUTH ================= */
  function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }

    try {
      const token = header.split(" ")[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  /* ================= STUDENT: MY ATTENDANCE ================= */
  router.get("/me", auth, async (req, res) => {
    if (req.user.role !== "STUDENT") {
      return res.status(403).json({ error: "Student access only" });
    }

    const data = await attendance
      .find({
        studentUserId: new ObjectId(req.user.userId),
        schoolId: new ObjectId(req.user.schoolId),
      })
      .sort({ date: -1 })
      .toArray();

    res.json(data);
  });

  /* ================= TEACHER: CLASS ATTENDANCE ================= */
  router.get("/class", auth, async (req, res) => {
    if (req.user.role !== "TEACHER") {
      return res.status(403).json({ error: "Teacher access only" });
    }

    const { className, section, date } = req.query;

    if (!className || !section || !date) {
      return res.status(400).json({ error: "Missing query params" });
    }

    const data = await attendance.find({
      schoolId: new ObjectId(req.user.schoolId),
      class: className,
      section,
      date,
    }).toArray();

    res.json(data);
  });

  return router;
}
