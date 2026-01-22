import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function studentRoutes(db) {
  const router = express.Router();

  const students = db.collection("students");
  const marks = db.collection("marks");

  // 🔐 JWT AUTH MIDDLEWARE
  function auth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authorization token missing" });
      }

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  // 👤 GET LOGGED-IN STUDENT PROFILE
  router.get("/me", auth, async (req, res) => {
    try {
      const student = await students.findOne({
        userId: new ObjectId(req.user.userId),
        schoolId: new ObjectId(req.user.schoolId),
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      res.json(student);
    } catch (err) {
      console.error("❌ STUDENT PROFILE ERROR:", err.message);
      res.status(500).json({ error: "Failed to fetch student profile" });
    }
  });

  // 📄 GET LOGGED-IN STUDENT MARKS
  router.get("/marks", auth, async (req, res) => {
    try {
      const result = await marks
        .find({
          studentUserId: new ObjectId(req.user.userId),
          schoolId: new ObjectId(req.user.schoolId),
        })
        .toArray();

      res.json(result);
    } catch (err) {
      console.error("❌ MARKS FETCH ERROR:", err.message);
      res.status(500).json({ error: "Failed to fetch marks" });
    }
  });

  return router;
}
