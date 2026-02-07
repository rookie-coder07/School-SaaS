// ...existing code...
import express from "express";
import { ObjectId } from "mongodb";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

export default function teacherRoutes(db) {
  const router = express.Router();
  const teachers = db.collection("teachers");
  const students = db.collection("students");
  const attendance = db.collection("attendance");
  const marks = db.collection("marks");

  // helper: safely convert to ObjectId or return null
  const safeObjectId = (id) => {
    try {
      if (!id) return null;
      return new ObjectId(String(id));
    } catch {
      return null;
    }
  };

  // Test route
  router.get("/dashboard", requireAuth, requireRole("TEACHER"), (req, res) => {
    res.json({ message: "Teacher dashboard working", user: req.user });
  });

  /* ================================
     GET STUDENTS (BY CLASS + SECTION)
     ================================= */
  router.get("/students", requireAuth, requireRole("TEACHER"), async (req, res) => {
    try {
      const teacherUserId = safeObjectId(req.user?.userId);
      if (!teacherUserId) return res.status(400).json({ error: "Invalid teacher id" });

      const schoolId = safeObjectId(req.user?.schoolId);

      const teacher = await teachers.findOne({
        userId: teacherUserId,
        ...(schoolId ? { schoolId } : {}),
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher profile not found or schoolId mismatch" });
      }

      const list = await students
        .find({
          class: teacher.class,
          section: teacher.section,
          ...(teacher.schoolId ? { schoolId: safeObjectId(teacher.schoolId) } : {}),
        })
        .toArray();

      res.json(list);
    } catch (err) {
      console.error("TEACHER STUDENTS ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
/* ================================
     GET STUDENTS (BY CLASS + SECTION) - ADMIN
     ================================= */
     
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
      await db.collection("attendance").updateOne(
        {
          studentUserId: new ObjectId(record.studentUserId),
          date: String(date),
          class: String(className),
          section: String(section),
          schoolId: new ObjectId(req.user.schoolId),
        },
        {
          $set: {
            studentUserId: new ObjectId(record.studentUserId),
            teacherUserId: new ObjectId(req.user.userId),
            schoolId: new ObjectId(req.user.schoolId),
            class: String(className),
            section: String(section),
            date: String(date),
            status: record.status,
            submissionStatus: "DRAFT",
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("ATTENDANCE SAVE ERROR:", err);
    res.status(500).json({ error: "Attendance save failed" });
  }
});
  /* ================================
     SUBMIT ATTENDANCE (FINALIZE)
     ================================= */
  router.post("/attendance/submit", teacherAuth, async (req, res) => {
  try {
    const { date, className, section } = req.body;

    if (!date || !className || !section) {
      return res.status(400).json({ error: "Missing date/class/section" });
    }

    // 🔥 IMPORTANT: Normalize everything to STRING
    const filter = {
      date: String(date),
      class: String(className),
      section: String(section),
      schoolId: new ObjectId(req.user.schoolId),
      submissionStatus: "DRAFT",
    };

    console.log("SUBMIT FILTER:", filter);

    const result = await db.collection("attendance").updateMany(
      filter,
      {
        $set: {
          submissionStatus: "SUBMITTED",
          submittedAt: new Date(),
        },
      }
    );

    console.log("SUBMIT RESULT:", result);

    if (result.matchedCount === 0) {
      return res.status(400).json({
        error: "No draft attendance found. Please save first.",
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("ATTENDANCE SUBMIT ERROR:", err);
    res.status(500).json({ error: "Attendance submit failed" });
  }
});
  /* ================================
     GET ATTENDANCE (VIEW) - TEACHER
     ================================= */
  router.get("/attendance", requireAuth, requireRole("TEACHER"), async (req, res) => {
    try {
      const { date, className, section } = req.query;
      if (!date) return res.json([]);

      const schoolId = safeObjectId(req.user?.schoolId);

      const query = {
        date: String(date),
        class: String(className),
        section: String(section),
        ...(schoolId ? { schoolId } : {}),
      };

      const records = await attendance.find(query).toArray();
      res.json(records);
    } catch (err) {
      console.error("FETCH ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  /* ================================
     SAVE MARKS (TEACHER)
     ================================= */
  router.post("/marks/save", requireAuth, requireRole("TEACHER"), async (req, res) => {
    try {
      const { subject, exam, className, section, records } = req.body;
      if (!subject || !exam || !className || !section || !Array.isArray(records)) {
        return res.status(400).json({ error: "Missing data" });
      }

      const schoolId = safeObjectId(req.user?.schoolId);

      const docs = records
        .map((r) => {
          const studentId = safeObjectId(r.studentId || r.studentUserId);
          if (!studentId) return null;
          return {
            schoolId,
            studentId,
            teacherId: safeObjectId(req.user.userId),
            subject,
            exam,
            class: String(className),
            section: String(section),
            score: r.marks === "ABSENT" || r.marks === "AB" ? "ABSENT" : Number(r.marks),
            createdAt: new Date(),
          };
        })
        .filter(Boolean);

      // remove previous identical exam entries for this class/section/subject/exam
      const deleteFilter = {
        ...(schoolId ? { schoolId } : {}),
        subject,
        exam,
        class: String(className),
        section: String(section),
      };
      await marks.deleteMany(deleteFilter);

      if (docs.length) await marks.insertMany(docs);

      res.json({ success: true });
    } catch (err) {
      console.error("SAVE MARKS ERROR:", err);
      res.status(500).json({ error: "Failed to save marks" });
    }
  });

  /* ================================
     STUDENT VIEW OF THEIR ATTENDANCE
     ================================= */
  router.get("/student/attendance", requireAuth, requireRole("STUDENT"), async (req, res) => {
    try {
      const studentUserId = safeObjectId(req.user?.userId);
      if (!studentUserId) return res.status(400).json({ error: "Invalid student id" });

      const schoolId = safeObjectId(req.user?.schoolId);

      const records = await attendance
        .find({
          studentUserId,
          ...(schoolId ? { schoolId } : {}),
          submissionStatus: "SUBMITTED",
        })
        .sort({ date: -1 })
        .toArray();

      res.json(records);
    } catch (err) {
      console.error("STUDENT ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
}