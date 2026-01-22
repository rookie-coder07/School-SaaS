import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function attendanceRoutes(db) {
  const router = express.Router();
  const attendance = db.collection("attendance");

  // 🔐 Auth middleware
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

  // 👨‍🎓 Student view attendance
  router.get("/me", auth, async (req, res) => {
    const data = await attendance.find({
      studentUserId: new ObjectId(req.user.userId),
      schoolId: new ObjectId(req.user.schoolId),
    }).toArray();

    res.json(data);
  });

  return router;
}
