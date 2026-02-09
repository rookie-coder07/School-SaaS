import express from "express";
import { requireAuth, requireRole, requireTenantId } from "./../server/middleware/authMiddleware.js";
import { safeObjectId } from "./../server/utils/safeObjectId.js";

export default function admissionRoutes(db) {
  const router = express.Router();
  const admissions = db.collection("admissions");

  router.get("/me", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
    try {
      const studentUserId = safeObjectId(req.user.userId);
      const schoolId = req.user.schoolIdObj;
      if (!studentUserId || !schoolId) return res.status(400).json({ error: "Invalid userId or schoolId" });

      const data = await admissions.find({ studentUserId, schoolId }).toArray();
      res.json(data);
    } catch (err) {
      console.error("ADMISSIONS FETCH ERROR:", err);
      res.status(500).json({ error: "Failed to fetch admissions" });
    }
  });

  return router;
}
