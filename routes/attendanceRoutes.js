import express from "express";
import { requireAuth, requireRole, requireTenantId } from "./../server/middleware/authMiddleware.js";
import { safeObjectId } from "./../server/utils/safeObjectId.js";

export default function attendanceRoutes(db) {
  const router = express.Router();

  const attendance = db.collection("attendance");

  /* ================= STUDENT: MY ATTENDANCE ================= */
  router.get("/me", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
    try {
      const studentUserId = safeObjectId(req.user.userId);
      const schoolId = req.user.schoolIdObj;
      if (!studentUserId || !schoolId) return res.status(400).json({ error: "Invalid userId or schoolId" });

      const data = await attendance
        .find({ studentUserId, schoolId })
        .sort({ date: -1 })
        .toArray();

      res.json(data.map(r => ({
        ...r,
        _id: r._id.toString(),
        studentUserId: r.studentUserId ? String(r.studentUserId) : undefined,
        schoolId: r.schoolId ? String(r.schoolId) : undefined,
      })));
    } catch (err) {
      console.error("FETCH ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  /* ================= TEACHER: CLASS ATTENDANCE ================= */
  router.get("/class", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const { className, section, date } = req.query;
      if (!className || !section || !date) return res.status(400).json({ error: "Missing query params" });

      const schoolId = req.user.schoolIdObj;
      const data = await attendance.find({ schoolId, class: className, section, date }).toArray();

      res.json(data.map(r => ({
        ...r,
        _id: r._id.toString(),
        studentUserId: r.studentUserId ? String(r.studentUserId) : undefined,
        schoolId: r.schoolId ? String(r.schoolId) : undefined,
      })));
    } catch (err) {
      console.error("FETCH CLASS ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Failed to fetch class attendance" });
    }
  });

  return router;
}
