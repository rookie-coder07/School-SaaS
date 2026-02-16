/**
 * 🚀 ATTENDANCE LOCK BUG - ATOMIC FIXES (COPY-PASTE READY)
 * 
 * If the bug persists, copy-paste these exact fixes into your files.
 * Each fix is self-contained and can be applied independently.
 */

// ============================================================================
// FIX #1: TeacherDashboard.jsx - Students Fetch Effect (Lines 256-273)
// ============================================================================
// 
// LOCATION: client/src/pages/TeacherDashboard.jsx
// LINES: ~256-273 (FETCH STUDENTS useEffect)
// 
// VERIFY: Should NOT have setLocked(false) after setAttendance(init)
// 
// CURRENT CODE (CORRECT ✅):

/*
  useEffect(() => {
    fetch(
      `${API_URL}/api/teacher/students?className=${className}&section=${section}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        const normalized = (data || []).map((s) => ({ ...s, _id: String(s._id) }));
        setStudents(normalized);
        
        // ✅ Initialize attendance map ONLY for new students
        const init = {};
        normalized.forEach((s) => (init[s._id] = "PRESENT"));
        setAttendance(init);
        
        // ⚠️ DON'T reset locked here - let the lock check effect handle it
        // This prevents overriding finalized status
        // ❌ NEVER ADD: setLocked(false);
      })
      .catch((err) => {
        console.error("STUDENTS FETCH ERROR:", err);
        setStudents([]);
      });
  }, [className, section, token]);
*/

// IF YOU HAVE setLocked(false) HERE, DELETE IT! ⚠️

// ============================================================================
// FIX #2: TeacherDashboard.jsx - Lock Check Dependencies (Line ~370)
// ============================================================================
//
// LOCATION: client/src/pages/TeacherDashboard.jsx
// LINE: ~370 (end of FETCH ATTENDANCE STATUS effect)
//
// VERIFY: Must include 'date' in dependencies
//
// CORRECT CODE ✅:

/*
  useEffect(() => {
    // ... lock check logic ...
    
    const fetchLockStatus = async () => {
      // ... fetch and set lock status ...
    };
    
    fetchLockStatus();
  }, [date, className, section, token, students]);  // ✅ HAS 'date'
     ^^^^
   MUST HAVE!
*/

// INCORRECT CODE ❌:
/*
  }, [className, section, token, students]);  // Missing 'date'!
     ❌ This is the bug!
*/

// ============================================================================
// VERIFICATION: Ensure date dependency is present
// ============================================================================
// Command to verify:
/*
grep -n "fetchLockStatus();" client/src/pages/TeacherDashboard.jsx
# Should show line ~387

grep -A 1 "fetchLockStatus();" client/src/pages/TeacherDashboard.jsx
# Should show: }, [date, className, section, token, students]);
*/

// ============================================================================
// FIX #3: Ensure Attendance Loads from API (Lines ~336-346)
// ============================================================================
//
// LOCATION: client/src/pages/TeacherDashboard.jsx
// LINES: ~336-346 (inside lock check effect, after API call succeeds)
//
// VERIFY: Should load existing attendance records from API response
//
// CORRECT CODE ✅:

/*
        const data = await res.json();
        const finalized = data.isFinalized || false;

        console.log("🔍 [LOCK CHECK] API Response - isFinalized:", finalized);

        setIsFinalized(finalized);
        setApiPresentCount(data.presentCount || 0);
        setApiAbsentCount(data.absentCount || 0);

        // ✅ Load existing attendance from API
        if (data.records && Array.isArray(data.records)) {
          const attendanceMap = {};
          data.records.forEach((record) => {
            if (record.studentUserId && record.status) {
              attendanceMap[String(record.studentUserId)] = record.status;
            }
          });
          setAttendance(attendanceMap);
          console.log("💾 [LOCK CHECK] Loaded existing attendance:", attendanceMap);
        }
*/

// ============================================================================
// FIX #4: Backend - Check isFinalized Before Save (server/routes/teacher.js)
// ============================================================================
//
// LOCATION: server/routes/teacher.js
// LINES: ~78-160 (POST /attendance/save endpoint)
//
// VERIFY: Should check for finalized records and return 403
//
// CORRECT CODE ✅:

/*
router.post(
  "/attendance/save",
  authenticate,
  requireRole("TEACHER"),
  requireTenant,
  async (req, res) => {
    try {
      const { date, className, section, records } = req.body;

      if (!date || !className || !section || !records) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const today = new Date().toISOString().slice(0, 10);
      if (date > today) {
        console.warn("⚠️ [SAVE] Attempt to mark future attendance:", date);
        return res.status(400).json({ error: "Cannot mark future attendance" });
      }

      console.log("💾 [SAVE] Attempting to save attendance for", date);

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
        return res.status(403).json({
          error: "Cannot edit finalized attendance. This date is locked.",
        });
      }

      // ✅ Save each student record - WITH PROTECTION against finalized records
      let savedCount = 0;
      for (const record of records) {
        const studentId = safeObjectId(record.studentUserId);
        if (!studentId) continue;

        try {
          // 🔒 Check if THIS specific record is finalized
          const individualRecord = await db.collection("attendance").findOne({
            studentUserId: studentId,
            date: String(date),
            class: String(className),
            section: String(section),
            schoolId: req.user.schoolIdObj,
          });

          if (individualRecord && individualRecord.isFinalized === true) {
            console.warn("❌ Individual record is FINALIZED - cannot update");
            continue;
          }

          // Safe to update
          const result = await db.collection("attendance").updateOne(
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

          if (result.modifiedCount > 0 || result.upsertedCount > 0) {
            savedCount++;
          }
        } catch (err) {
          console.error("Error updating record:", err);
        }
      }

      console.log("✅ [SAVE] Saved", savedCount, "records");
      res.json({ success: true, recordsSaved: savedCount });
    } catch (err) {
      console.error("❌ [SAVE] Error:", err);
      res.status(500).json({ error: "Failed to save attendance" });
    }
  }
);
*/

// ============================================================================
// FIX #5: Backend - Set isFinalized on Submit (server/routes/teacher.js)
// ============================================================================
//
// LOCATION: server/routes/teacher.js
// LINES: ~170-250 (POST /attendance/submit endpoint)
//
// VERIFY: Should set isFinalized=true and finalizedAt=timestamp
//
// CORRECT CODE ✅:

/*
router.post(
  "/attendance/submit",
  authenticate,
  requireRole("TEACHER"),
  requireTenant,
  async (req, res) => {
    try {
      const { date, className, section } = req.body;

      if (!date || !className || !section) {
        return res.status(400).json({ error: "Missing date/class/section" });
      }

      const today = new Date().toISOString().slice(0, 10);
      if (date > today) {
        return res.status(400).json({ error: "Cannot finalize future attendance" });
      }

      const filter = {
        date: String(date),
        class: String(className),
        section: String(section),
        schoolId: req.user.schoolIdObj,
        submissionStatus: "DRAFT",
      };

      console.log("🔒 [FINALIZE] SUBMIT FILTER:", filter);

      // ✅ Check if already finalized
      const alreadyFinalized = await db.collection("attendance").findOne({
        date: String(date),
        class: String(className),
        section: String(section),
        schoolId: req.user.schoolIdObj,
        isFinalized: true,
      });

      if (alreadyFinalized) {
        console.warn("⚠️ [FINALIZE] Already finalized for:", date);
        return res.status(403).json({
          error: "This attendance is already finalized and cannot be modified",
        });
      }

      // ✅ Set isFinalized and finalizedAt for ALL records
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

      console.log("✅ [FINALIZE] Modified:", result.modifiedCount);

      if (result.matchedCount === 0) {
        console.warn("⚠️ [FINALIZE] No draft attendance found for date:", date);
        return res.status(400).json({
          error: "No draft attendance found. Please save first.",
        });
      }

      // ✅ Verify all records are finalized
      const verify = await db
        .collection("attendance")
        .find({
          date: String(date),
          class: String(className),
          section: String(section),
          schoolId: req.user.schoolIdObj,
        })
        .toArray();

      const allFinalized = verify.every((r) => r.isFinalized === true);
      if (!allFinalized) {
        console.error("❌ [FINALIZE] Verification FAILED!");
        return res.status(500).json({
          error: "Finalization verification failed.",
        });
      }

      console.log("🔒 [FINALIZE] SUCCESS - All", verify.length, "records finalized");
      res.json({ success: true, recordsFinalized: verify.length });
    } catch (err) {
      console.error("❌ [FINALIZE] Error:", err);
      res.status(500).json({ error: "Failed to finalize attendance" });
    }
  }
);
*/

// ============================================================================
// FIX #6: Backend - Return isFinalized in GET (server/routes/teacher.js)
// ============================================================================
//
// LOCATION: server/routes/teacher.js
// LINES: ~260-320 (GET /attendance endpoint)
//
// VERIFY: Should return isFinalized, presentCount, absentCount, records
//
// CORRECT CODE ✅:

/*
router.get(
  "/attendance",
  authenticate,
  requireRole("TEACHER"),
  requireTenant,
  async (req, res) => {
    try {
      const { date, className, section } = req.query;
      if (!date) {
        return res.json({
          date: null,
          isFinalized: false,
          presentCount: 0,
          absentCount: 0,
          records: [],
        });
      }

      const schoolId = req.user.schoolIdObj;

      const query = {
        date: String(date),
        class: String(className),
        section: String(section),
        ...(schoolId ? { schoolId } : {}),
      };

      console.log("📖 [GET] Fetching attendance for", date);

      const records = await db.collection("attendance").find(query).toArray();

      // ✅ Calculate counts
      const presentCount = records.filter((r) => r.status === "PRESENT").length;
      const absentCount = records.filter((r) => r.status === "ABSENT").length;

      // ✅ Check finalized status
      let isFinalized = false;
      if (records.length > 0) {
        const finalizedStates = [...new Set(records.map((r) => r.isFinalized))];

        if (finalizedStates.length > 1) {
          console.error("❌ INCONSISTENT STATE detected");
          isFinalized = finalizedStates.includes(true);
        } else {
          isFinalized = records[0].isFinalized || false;
        }

        if (isFinalized) {
          console.log("🔒 [GET] Attendance is LOCKED for", date);
        } else {
          console.log("✏️ [GET] Attendance is EDITABLE for", date);
        }
      }

      console.log("✅ [GET] Returning:", {
        date: String(date),
        isFinalized,
        presentCount,
        absentCount,
        recordsCount: records.length,
      });

      res.json({
        date: String(date),
        isFinalized,
        presentCount,
        absentCount,
        records,
      });
    } catch (err) {
      console.error("❌ [GET] Error:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  }
);
*/

// ============================================================================
// VERIFICATION: Run these commands to verify all fixes
// ============================================================================

/*
# 1. Check students fetch has NO setLocked(false)
grep -A 20 "FETCH STUDENTS" client/src/pages/TeacherDashboard.jsx | grep -c "setLocked("
# Expected: 0

# 2. Verify date in dependencies
grep -A 100 "FETCH ATTENDANCE STATUS" client/src/pages/TeacherDashboard.jsx | grep "}, \[date,"
# Expected: 1 match showing date in dependencies

# 3. Verify backend checks
grep -c "isFinalized.*true" server/routes/teacher.js
# Expected: > 3

# 4. Verify 403 responses
grep -c "403" server/routes/teacher.js
# Expected: > 1
*/

// ============================================================================
// FINAL CHECKLIST
// ============================================================================

/*
✅ Fix #1: No setLocked(false) in students fetch effect
✅ Fix #2: date is in lock check effect dependencies
✅ Fix #3: Attendance loads from API response  
✅ Fix #4: Backend checks for isFinalized before save (403 error)
✅ Fix #5: Backend sets isFinalized=true on submit
✅ Fix #6: Backend returns isFinalized in GET response

Once all 6 fixes are verified:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart backend (npm start in server folder)
3. Restart frontend (npm run dev in client folder)
4. Hard refresh browser (Ctrl+Shift+R)
5. Run manual test SCENARIO 2
6. Verify buttons stay DISABLED when returning to finalized date
*/
