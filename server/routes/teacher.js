import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { ObjectId } from "mongodb";


export default function teacherRoutes(db) {
  const router = express.Router();

  const teachers = db.collection("teachers");
  const students = db.collection("students");
  const attendance = db.collection("attendance");

  /* ================================
     GET STUDENTS (BY CLASS + SECTION)
  ================================= */
 
router.get("/students", teacherAuth, async (req, res) => {
  try {
    const teacher = await db.collection("teachers").findOne({
      userId: new ObjectId(req.user.userId),
      schoolId: new ObjectId(req.user.schoolId),
    });

    if (!teacher) {
      return res.status(404).json({
        error: "Teacher profile not found or schoolId mismatch",
      });
    }

    const students = await db.collection("students").find({
      class: teacher.class,
      section: teacher.section,
      schoolId: new ObjectId(req.user.schoolId),
    }).toArray();

    res.json(students);
  } catch (err) {
    console.error("STUDENT FETCH ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
  /* ================================
     SAVE ATTENDANCE (DRAFT)
  ================================= */
  router.post("/attendance/save", teacherAuth, async (req, res) => {
    try {
      const { date, className, section, records } = req.body;

      if (!date || !className || !section || !Array.isArray(records)) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      for (const record of records) {
        await attendance.updateOne(
          {
            studentUserId: record.studentUserId,
            date,
            class: className,
            section,
            schoolId: req.user.schoolId,
          },
          {
            $set: {
              studentUserId: record.studentUserId,
              teacherUserId: req.user.userId,
              schoolId: req.user.schoolId,
              class: className,
              section,
              date,
              status: record.status,
              submissionStatus: "DRAFT",
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      res.json({ message: "Attendance saved successfully" });
    } catch (err) {
      console.error("SAVE ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Attendance save failed" });
    }
  });

  /* ================================
     SUBMIT ATTENDANCE
  ================================= */
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

      res.json({ message: "Attendance submitted successfully" });
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
      res.status(500).json({ error: "Submit failed" });
    }
  });

  /* ================================
     GET ATTENDANCE (VIEW)
  ================================= */
  router.get("/attendance", teacherAuth, async (req, res) => {
    try {
      const { date, className, section } = req.query;

      const records = await attendance.find({
        date,
        class: className,
        section,
        schoolId: req.user.schoolId,
      }).toArray();

      res.json(records);
    } catch (err) {
      console.error("FETCH ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });
  /* ================================
  Test Route
 ================================= */
router.get("/dashboard", authMiddleware, async (req, res) => {
  res.json({
    message: "Teacher dashboard working",
    user: req.user   // 👈 this proves mapping works
  });
});

/* ===============================
   GET STUDENTS FOR LOGGED TEACHER
================================ */
router.get("/students", teacherAuth, async (req, res) => {
  try {
    const teacher = await db.collection("teachers").findOne({
      userId: new ObjectId(req.user.id),
      schoolId: new ObjectId(req.user.schoolId)
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const students = await db.collection("students").find({
      schoolId: new ObjectId(req.user.schoolId),
      class: teacher.class,
      section: teacher.section
    }).toArray();

    res.json(students);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});




  /* ================================
     ATTENDANCE SUMMARY
  ================================= */
  router.get("/attendance/summary", teacherAuth, async (req, res) => {
    try {
      const { className, section } = req.query;

      const summary = await attendance.aggregate([
        {
          $match: {
            class: className,
            section,
            schoolId: req.user.schoolId,
            submissionStatus: "SUBMITTED",
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
      ]).toArray();

      res.json(summary);

      
    } catch (err) {
      console.error("SUMMARY ERROR:", err);
      res.status(500).json({ error: "Failed to get summary" });
    }
  });
  

  return router;
}
