// ...existing code...
import express from "express";
import { ObjectId } from "mongodb";
import { requireAuth, requireRole, requireTenantId } from "../middleware/authMiddleware.js";

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
  router.get("/students", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const teacherUserId = safeObjectId(req.user?.userId);
      if (!teacherUserId) return res.status(400).json({ error: "Invalid teacher id" });

      const schoolId = req.user.schoolIdObj;

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
          ...(teacher.schoolId ? { schoolId: req.user.schoolIdObj } : {}),
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
  router.post("/attendance/save", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { date, className, section, records } = req.body;

    if (!date || !className || !section || !Array.isArray(records)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // ✅ Date validation: Only allow today or past dates (not future)
    const today = new Date().toISOString().slice(0, 10);
    if (date > today) {
      console.warn("⚠️ [SAVE] Attempt to mark future attendance:", date);
      return res.status(400).json({ error: "Cannot mark future attendance" });
    }

    console.log("💾 [SAVE] Attempting to save attendance for", date, "class:", className, "section:", section);

    // ✅ CRITICAL: Check if ANY record for this date/class/section is finalized
    const anyFinalized = await db.collection("attendance").findOne({
      date: String(date),
      class: String(className),
      section: String(section),
      schoolId: req.user.schoolIdObj,
      isFinalized: true,
    });

    if (anyFinalized) {
      console.warn("❌ [SAVE] BLOCKED: Attendance already finalized for", date);
      return res.status(403).json({ error: "Cannot edit finalized attendance. This date is locked." });
    }

    // ✅ Save each student record - WITH PROTECTION against updating finalized records
    let savedCount = 0;
    for (const record of records) {
      const studentId = safeObjectId(record.studentUserId);
      if (!studentId) {
        console.warn("⚠️ [SAVE] Invalid student ID:", record.studentUserId);
        continue;
      }

      try {
        // 🔒 CRITICAL: Check if THIS specific student's record is finalized
        const individualRecord = await db.collection("attendance").findOne({
          studentUserId: studentId,
          date: String(date),
          class: String(className),
          section: String(section),
          schoolId: req.user.schoolIdObj,
        });

        if (individualRecord && individualRecord.isFinalized === true) {
          console.warn("❌ [SAVE] Individual record is FINALIZED - cannot update:", record.studentUserId);
          continue;
        }

        // Safe to update or insert
        const updateResult = await db.collection("attendance").updateOne(
          {
            studentUserId: studentId,
            date: String(date),
            class: String(className),
            section: String(section),
            schoolId: req.user.schoolIdObj,
          },
          {
            $set: {
              studentUserId: studentId,
              teacherUserId: safeObjectId(req.user.userId),
              schoolId: req.user.schoolIdObj,
              class: String(className),
              section: String(section),
              date: String(date),
              status: record.status,
              submissionStatus: "DRAFT",
              isFinalized: false,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        if (updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0) {
          savedCount++;
          console.log("✅ [SAVE] Saved record for student:", record.studentUserId);
        }
      } catch (err) {
        console.error("❌ [SAVE] Error saving individual record:", err);
      }
    }

    console.log("✅ [SAVE] Saved/upserted", savedCount, "attendance records for", date);
    res.json({ success: true, recordsSaved: savedCount });
  } catch (err) {
    console.error("❌ [SAVE] ATTENDANCE SAVE ERROR:", err);
    res.status(500).json({ error: "Attendance save failed" });
  }
});
  /* ================================
     SUBMIT ATTENDANCE (FINALIZE)
     ================================= */
  router.post("/attendance/submit", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
  try {
    const { date, className, section } = req.body;

    if (!date || !className || !section) {
      return res.status(400).json({ error: "Missing date/class/section" });
    }

    // ✅ Date validation: Only allow today or past dates
    const today = new Date().toISOString().slice(0, 10);
    if (date > today) {
      return res.status(400).json({ error: "Cannot finalize future attendance" });
    }

    // 🔥 IMPORTANT: Normalize everything to STRING
    const filter = {
      date: String(date),
      class: String(className),
      section: String(section),
      schoolId: req.user.schoolIdObj,
      submissionStatus: "DRAFT",
    };

    console.log("🔒 [FINALIZE] SUBMIT FILTER:", filter);

    // ✅ First, check if all records are NOT already finalized
    const alreadyFinalized = await db.collection("attendance").findOne({
      date: String(date),
      class: String(className),
      section: String(section),
      schoolId: req.user.schoolIdObj,
      isFinalized: true,
    });

    if (alreadyFinalized) {
      console.warn("⚠️ [FINALIZE] Attempt to finalize already-finalized attendance:", date);
      return res.status(403).json({
        error: "This attendance is already finalized and cannot be modified",
      });
    }

    // ✅ Set isFinalized and finalizedAt for ALL records of this date/class/section
    const result = await db.collection("attendance").updateMany(
      filter,
      {
        $set: {
          submissionStatus: "SUBMITTED",
          isFinalized: true,
          finalizedAt: new Date(),
          submittedAt: new Date(),
        },
      }
    );

    console.log("✅ [FINALIZE] SUBMIT RESULT - matched:", result.matchedCount, "modified:", result.modifiedCount);

    if (result.matchedCount === 0) {
      console.warn("⚠️ [FINALIZE] No draft attendance found for date:", date);
      return res.status(400).json({
        error: "No draft attendance found. Please save first.",
      });
    }

    // ✅ Verify all records are now finalized
    const verifyFinalized = await db.collection("attendance")
      .find({
        date: String(date),
        class: String(className),
        section: String(section),
        schoolId: req.user.schoolIdObj,
      })
      .toArray();

    const allFinalized = verifyFinalized.every(r => r.isFinalized === true);
    if (!allFinalized) {
      console.error("❌ [FINALIZE] VERIFICATION FAILED - not all records finalized!");
      return res.status(500).json({
        error: "Finalization verification failed. Please try again.",
      });
    }

    console.log("🔒 [FINALIZE] SUCCESS - All", verifyFinalized.length, "records finalized for", date);
    res.json({ success: true, recordsFinalized: verifyFinalized.length });
  } catch (err) {
    console.error("❌ [FINALIZE] ATTENDANCE SUBMIT ERROR:", err);
    res.status(500).json({ error: "Attendance submit failed" });
  }
});
  /* ================================
     GET ATTENDANCE (VIEW) - TEACHER
     ================================= */
  router.get("/attendance", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const { date, className, section } = req.query;
      if (!date) {
        return res.json({ date: null, isFinalized: false, presentCount: 0, absentCount: 0, records: [] });
      }

      const schoolId = req.user.schoolIdObj;

      const query = {
        date: String(date),
        class: String(className),
        section: String(section),
        ...(schoolId ? { schoolId } : {}),
      };

      console.log("📖 [GET] Fetching attendance for", date, "class:", className, "section:", section);

      const records = await attendance.find(query).toArray();
      
      console.log("📖 [GET] Found", records.length, "records for", date);

      // ✅ Calculate counts
      const presentCount = records.filter(r => r.status === "PRESENT").length;
      const absentCount = records.filter(r => r.status === "ABSENT").length;
      
      // ✅ Check finalized status - ALL records should have the same status
      let isFinalized = false;
      if (records.length > 0) {
        // Get unique finalized values
        const finalizedStates = [...new Set(records.map(r => r.isFinalized))];
        
        if (finalizedStates.length > 1) {
          console.error("❌ [GET] INCONSISTENT STATE - Some records are finalized, others are not!");
          console.error("   Finalized states:", finalizedStates);
          // If mixed, treat as finalized for safety (can't edit if ANY records are finalized)
          isFinalized = finalizedStates.includes(true);
        } else {
          isFinalized = records[0].isFinalized || false;
        }

        if (isFinalized) {
          console.log("🔒 [GET] Attendance is LOCKED (isFinalized=true) for", date);
        } else {
          console.log("✏️ [GET] Attendance is EDITABLE (isFinalized=false) for", date);
        }
      }

      res.json({
        date: String(date),
        isFinalized,
        presentCount,
        absentCount,
        records,
      });
    } catch (err) {
      console.error("❌ [GET] FETCH ATTENDANCE ERROR:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  /* ================================
     GET MARKS (VIEW) - TEACHER
     ================================= */
  router.get("/marks", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const teacher = await teachers.findOne({
        userId: safeObjectId(req.user.userId),
        ...(schoolId ? { schoolId } : {}),
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const marksData = await marks.find({
        class: String(teacher.class),
        section: String(teacher.section),
        ...(schoolId ? { schoolId } : {}),
      }).toArray();

      // Transform to match frontend expectations (score -> marks)
      const enrichedMarks = marksData.map(mark => ({
        ...mark,
        marks: mark.score, // Frontend expects 'marks' field
      }));

      res.json(enrichedMarks);
    } catch (err) {
      console.error("FETCH MARKS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch marks" });
    }
  });

  /* ================================
     SAVE MARKS (TEACHER)
     ================================= */
  router.post("/marks/save", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const { subject, exam, className, section, records } = req.body;
      if (!subject || !exam || !className || !section || !Array.isArray(records)) {
        return res.status(400).json({ error: "Missing data" });
      }

      const schoolId = req.user.schoolIdObj;

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
  router.get("/student/attendance", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
    try {
      const studentUserId = safeObjectId(req.user?.userId);
      if (!studentUserId) return res.status(400).json({ error: "Invalid student id" });
      const schoolId = req.user.schoolIdObj;

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

  /* ================================
     HOMEWORK / ASSIGNMENTS
     ================================= */
  router.post("/homework/add", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const { title, description, subject, dueDate } = req.body;
      if (!title || !subject || !dueDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const schoolId = req.user.schoolIdObj;
      const teacher = await teachers.findOne({
        userId: safeObjectId(req.user.userId),
        ...(schoolId ? { schoolId } : {}),
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const homework = {
        _id: new ObjectId(),
        schoolId,
        teacherId: safeObjectId(req.user.userId),
        class: teacher.class,
        section: teacher.section,
        title,
        description: description || "",
        subject,
        dueDate: String(dueDate),
        createdAt: new Date(),
      };

      const homeworkCollection = db.collection("homework");
      await homeworkCollection.insertOne(homework);

      res.json({ success: true, homeworkId: homework._id });
    } catch (err) {
      console.error("ADD HOMEWORK ERROR:", err);
      res.status(500).json({ error: "Failed to add homework" });
    }
  });

  router.get("/homework", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const teacher = await teachers.findOne({
        userId: safeObjectId(req.user.userId),
        ...(schoolId ? { schoolId } : {}),
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const homeworkCollection = db.collection("homework");
      const homework = await homeworkCollection
        .find({
          class: teacher.class,
          section: teacher.section,
          ...(schoolId ? { schoolId } : {}),
        })
        .sort({ dueDate: -1 })
        .toArray();

      res.json(homework);
    } catch (err) {
      console.error("GET HOMEWORK ERROR:", err);
      res.status(500).json({ error: "Failed to fetch homework" });
    }
  });

  /* ================================
     EVENTS & CALENDAR
     ================================= */
  router.get("/events", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;

      const eventsCollection = db.collection("events");
      const events = await eventsCollection
        .find({
          ...(schoolId ? { schoolId } : {}),
        })
        .sort({ eventDate: 1 })
        .toArray();

      res.json(events);
    } catch (err) {
      console.error("GET EVENTS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  /* ================================
     CLASS SUMMARY (FOR TEACHER)
     ================================= */
  router.get("/class-summary", requireAuth, requireRole("TEACHER"), requireTenantId, async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;
      const teacher = await teachers.findOne({
        userId: safeObjectId(req.user.userId),
        ...(schoolId ? { schoolId } : {}),
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const studentCount = await students.countDocuments({
        class: teacher.class,
        section: teacher.section,
        ...(schoolId ? { schoolId } : {}),
      });

      res.json({
        className: teacher.class,
        section: teacher.section,
        totalStudents: studentCount,
      });
    } catch (err) {
      console.error("CLASS SUMMARY ERROR:", err);
      res.status(500).json({ error: "Failed to fetch class summary" });
    }
  });

  /* ================================
     STUDENT VIEW OF HOMEWORK
     ================================= */
  router.get("/student/homework", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
    try {
      const studentUserId = safeObjectId(req.user?.userId);
      if (!studentUserId) return res.status(400).json({ error: "Invalid student id" });
      const schoolId = req.user.schoolIdObj;
      const student = await students.findOne({
        userId: studentUserId,
        ...(schoolId ? { schoolId } : {}),
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const homeworkCollection = db.collection("homework");
      const homework = await homeworkCollection
        .find({
          class: student.class,
          section: student.section,
          ...(schoolId ? { schoolId } : {}),
        })
        .sort({ dueDate: -1 })
        .toArray();

      res.json(homework);
    } catch (err) {
      console.error("STUDENT HOMEWORK ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  /* ================================
     STUDENT VIEW OF EVENTS
     ================================= */
  router.get("/student/events", requireAuth, requireRole("STUDENT"), requireTenantId, async (req, res) => {
    try {
      const schoolId = req.user.schoolIdObj;

      const eventsCollection = db.collection("events");
      const events = await eventsCollection
        .find({
          ...(schoolId ? { schoolId } : {}),
        })
        .sort({ eventDate: 1 })
        .toArray();

      res.json(events);
    } catch (err) {
      console.error("STUDENT EVENTS ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}