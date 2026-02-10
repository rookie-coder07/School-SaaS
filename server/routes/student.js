import express from "express";
import { requireAuth, requireTenantId } from "../middleware/authMiddleware.js";
import { safeObjectId } from "../utils/safeObjectId.js";

export default function studentRoutes(db) {
  const router = express.Router();

  const students = db.collection("students");
  const marks = db.collection("marks");

  // 👤 GET LOGGED-IN STUDENT PROFILE
  router.get("/me", requireAuth, requireTenantId, async (req, res) => {
    try {
      const userId = safeObjectId(req.user.userId);
      const schoolId = req.user.schoolIdObj;
      if (!userId || !schoolId) return res.status(400).json({ error: "Invalid userId or schoolId" });

      const student = await students.findOne({
        userId,
        schoolId,
      });

      if (!student) return res.status(404).json({ error: "Student not found" });

      res.json(student);
    } catch (err) {
      console.error("❌ STUDENT PROFILE ERROR:", err.message);
      res.status(500).json({ error: "Failed to fetch student profile" });
    }
  });

  // 📄 GET LOGGED-IN STUDENT MARKS
  router.get("/marks", requireAuth, requireTenantId, async (req, res) => {
    try {
      const studentUserId = safeObjectId(req.user.userId);
      const schoolId = req.user.schoolIdObj;
      if (!studentUserId || !schoolId) return res.status(400).json({ error: "Invalid userId or schoolId" });

      const result = await marks
        .find({
          studentUserId,
          schoolId,
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
