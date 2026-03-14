import express from "express";
import { safeObjectId } from "../utils/safeObjectId.js";

export default function teacherRoutes({ db, requireAuth, requireRole, requireTenantId }) {
  const router = express.Router();

  router.get("/dashboard", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const teacherId = safeObjectId(req.user?.userId);
      const schoolId = req.user.schoolIdObj;
      if (!teacherId || !schoolId) {
        return res.status(400).json({ success: false, message: "Invalid teacherId or schoolId" });
      }

      const [classes, studentsCount, announcements] = await Promise.all([
        db
          .collection("classSections")
          .find({ schoolId, teacherIds: teacherId })
          .project({ class: 1, section: 1 })
          .toArray(),
        db.collection("students").countDocuments({ schoolId, assignedTeacher: teacherId, isDeleted: { $ne: true } }),
        db
          .collection("announcements")
          .find({ schoolId, isDeleted: { $ne: true } })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray(),
      ]);

      return res.json({
        success: true,
        stats: {
          classes: classes.length,
          students: studentsCount,
        },
        announcements,
      });
    } catch (err) {
      console.error("TEACHER DASHBOARD ERROR:", err);
      return res.status(500).json({ success: false, message: "Failed to load teacher dashboard" });
    }
  });

  return router;
}
