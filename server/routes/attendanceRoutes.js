import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default function attendanceRoutes(db) {
  const router = express.Router();
  const attendance = db.collection("attendance");

  /* 🔐 STUDENT AUTH */
  function studentAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "No token" });

    try {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role !== "STUDENT") {
        return res.status(403).json({ error: "Student access only" });
      }

      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  /* =====================================================
     🎓 STUDENT VIEW ATTENDANCE
     ===================================================== */
  router.get("/me", studentAuth, async (req, res) => {
    const data = await attendance
      .find({
        studentUserId: new ObjectId(req.user.userId),
        schoolId: new ObjectId(req.user.schoolId),
      })
      .sort({ date: -1 })
      .toArray();

    res.json(data);
  });

  return router;
}
