import express from "express";
import teacherAuth from "../middleware/teacherAuth.js";

export default function teacherRoutes(db) {
  const router = express.Router();

  const teachers = db.collection("teachers");
  const students = db.collection("students");
  const attendance = db.collection("attendance");

  /* ================= GET STUDENTS ================= */
  router.get("/students", teacherAuth, async (req, res) => {
    try {
      const { className, section } = req.query;

      if (!className || !section) {
        return res
          .status(400)
          .json({ error: "className and section are required" });
      }

      const teacher = await teachers.findOne({
        userId: req.user.userId,
        schoolId: req.user.schoolId,
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher profile not found" });
      }

      const data = await students
        .find({
          class: className,
          section,
          schoolId: req.user.schoolId,
        })
        .toArray();

      res.json(data);
    } catch (err) {
      console.error("STUDENT FETCH ERROR:", err);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  /* ================= SAVE ATTENDANCE (DRAFT) ================= */
  router.post("/attendance/save", teacherAuth, async (req, res) => {
    try {
      const { date, className, section, records } = req.body;

      if (!date || !className || !section || !Array.isArray(records)) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      for (const r of records) {
        await attendance.updateOne(
          {
            studentUserId: r.studentUserId,
            date,
            class: className,
            section,
          },
          {
            $set: {
              studentUserId: r.studentUserId,
              teacherUserId: req.user.userId,
              schoolId: req.user.schoolId,
              class: className,
              section,
              date,
              status: r.status,
              submissionStatus: "DRAFT",
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      res.json({ message: "Attendance saved (draft)" });
    } catch (err) {
      console.error("SAVE ERROR:", err);
      res.status(500).json({ error: "Attendance save failed" });
    }
  });

  /* ================= SUBMIT ATTENDANCE (FINAL) ================= */
  router.post("/attendance/submit", teacherAuth, async (req, res) => {
    try {
      const { date, className, section } = req.body;

      const alreadySubmitted = await attendance.findOne({
        date,
        class: className,
        section,
        schoolId: req.user.schoolId,
        submissionStatus: "SUBMITTED",
      });

      if (alreadySubmitted) {
        return res
          .status(409)
          .json({ error: "Attendance already submitted" });
      }

      await attendance.updateMany(
        {
          date,
          class: className,
          section,
          schoolId: req.user.schoolId,
        },
        {
          $set: {
            submissionStatus: "SUBMITTED",
            submittedAt: new Date(),
          },
        }
      );

      res.json({ message: "Attendance submitted and locked" });
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
      res.status(500).json({ error: "Attendance submit failed" });
    }
  });

  /* ================= VIEW ATTENDANCE BY DATE ================= */
  router.get("/attendance", teacherAuth, async (req, res) => {
    try {
      const { date, className, section } = req.query;

      const records = await attendance
        .find({
          date,
          class: className,
          section,
          schoolId: req.user.schoolId,
        })
        .toArray();

      res.json(records);
    } catch (err) {
      console.error("FETCH ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  /* ================= ATTENDANCE PERCENTAGE ================= */
  router.get("/attendance/summary", teacherAuth, async (req, res) => {
    try {
      const { className, section } = req.query;

      const result = await attendance
        .aggregate([
          {
            $match: {
              class: className,
              section,
              schoolId: req.user.schoolId,
            },
          },
          {
            $group: {
              _id: "$studentUserId",
              total: { $sum: 1 },
              present: {
                $sum: {
                  $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                },
              },
            },
          },
        ])
        .toArray();

      res.json(result);
    } catch (err) {
      console.error("SUMMARY ERROR:", err);
      res.status(500).json({ error: "Failed to calculate summary" });
    }
  });

  return router;
}
