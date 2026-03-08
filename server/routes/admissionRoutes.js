import express from "express";
import { requireAuth, requireTenantId, requireRole } from "../middleware/authMiddleware.js";
import { safeObjectId } from "../utils/safeObjectId.js";

export default function admissionRoutes(db) {
  const router = express.Router();
  const admissions = db.collection("admissions");

  router.get("/", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const data = await admissions.find({ schoolId }).sort({ createdAt: -1 }).toArray();
      return res.json(data);
    } catch (err) {
      console.error("ADMISSIONS LIST ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch admissions" });
    }
  });

  router.delete("/:id", requireAuth, requireRole("ADMIN"), requireTenantId, async (req, res) => {
    try {
      const admissionId = safeObjectId(req.params.id);
      const schoolId = req.user.schoolIdObj;
      if (!admissionId || !schoolId) return res.status(400).json({ error: "Invalid admission id or schoolId" });
      const result = await admissions.deleteOne({ _id: admissionId, schoolId });
      if (!result.deletedCount) return res.status(404).json({ error: "Admission not found" });
      return res.json({ success: true });
    } catch (err) {
      console.error("ADMISSIONS DELETE ERROR:", err);
      return res.status(500).json({ error: "Failed to delete admission" });
    }
  });

  router.get("/me", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
    try {
      const studentUserId = safeObjectId(req.user.userId);
      const schoolId = req.user.schoolIdObj;
      if (!studentUserId || !schoolId) return res.status(400).json({ error: "Invalid userId or schoolId" });
      const data = await admissions.find({ studentUserId, schoolId }).toArray();
      return res.json(data);
    } catch (err) {
      console.error("ADMISSIONS FETCH ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch admissions" });
    }
  });

  return router;
}
