import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function attendanceRoutes(db) {
  const router = express.Router();
  const attendance = db.collection("attendance");

  // 🔐 AUTH MIDDLEWARE
  function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // ✅ GET ATTENDANCE FOR LOGGED-IN STUDENT
  router.get("/me", auth, async (req, res) => {
    try {
      const records = await attendance.find({
        studentUserId: new ObjectId(req.user.userId),
        schoolId: new ObjectId(req.user.schoolId),
      }).toArray();

      res.json(records);
    } catch (err) {
      console.error("❌ Attendance fetch error:", err.message);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  return router;
}
