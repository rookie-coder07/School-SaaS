import express from "express";
import { requireAuth, requireRole, requireTenantId } from "../middleware/authMiddleware.js";
import { safeObjectId } from "../utils/safeObjectId.js";

export default function attendanceRoutes(db) {
  const router = express.Router();
  const attendance = db.collection("attendance");

  /* =====================================================
     🎓 STUDENT VIEW ATTENDANCE
     ===================================================== */
  router.get("/me", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
    try {
      const studentUserId = safeObjectId(req.user.userId);
      const schoolId = req.user.schoolIdObj;
      if (!studentUserId || !schoolId) return res.status(400).json({ error: "Invalid userId or schoolId" });

      const data = await attendance
        .find({
          studentUserId,
          schoolId,
        })
        .sort({ date: -1 })
        .toArray();

      res.json(data);
    } catch (err) {
      console.error("FETCH ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  return router;
}
