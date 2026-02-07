import { useEffect, useState } from "react";

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
const [activeTab, setActiveTab] = useState("attendance");
  const teacher = JSON.parse(localStorage.getItem("teacherData") || "{}");
  const className = teacher?.class;
  const section = teacher?.section;
  const token = localStorage.getItem("teacherToken");
const [subject, setSubject] = useState("");
const [exam, setExam] = useState("");
const [marks, setMarks] = useState({});
const [percentages, setPercentages] = useState({});

const saveMarks = async () => {
  setError("");
  setMessage("");
console.log("SUBMIT PAYLOAD:", { date, className, section });
console.log("SUBMIT PAYLOAD:", { date, className, section });
  if (!subject || !exam) {
    setError("Enter subject and exam");
    return;
  }

  const payload = students.map((s) => ({
    studentId: s._id,
    marks: Number(marks[s._id] || 0),
  }));

  const res = await fetch(
    "http://localhost:5000/api/teacher/marks/save",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        className,
        section,
        subject,
        exam,
        records: payload,
      }),
    }
  );

  if (!res.ok) {
    setError("Failed to save marks");
    return;
  }

  setMessage("Marks saved successfully");
};
  /* ================= LOGIC (UNCHANGED) ================= */

  useEffect(() => {
    fetch(
      `http://localhost:5000/api/teacher/students?className=${className}&section=${section}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        const normalized = (data || []).map((s) => ({ ...s, _id: String(s._id) }));
        setStudents(normalized);
        const init = {};
        normalized.forEach((s) => (init[s._id] = "PRESENT"));
        setAttendance(init);
        setLocked(false);
      })
      .catch((err) => {
        console.error("STUDENTS FETCH ERROR:", err);
        setStudents([]);
      });
  }, [className, section, token]);

  useEffect(() => {
    if (!token || !className) return;

    // ensure summary runs after students are loaded
    // include students.length so effect reruns when students populate
    const fetchSummary = async () => {
      try {
        const url = `http://localhost:5000/api/teacher/attendance/summary?className=${encodeURIComponent(
          className
        )}&section=${encodeURIComponent(section || "")}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        console.log("SUMMARY DATA (raw):", data);

        const map = {};
        (data || []).forEach((d) => {
          // server returns studentId, normalize keys to string
          const id = String(d.studentId ?? d._id ?? d.studentUserId ?? "");
          const total = Number(d.total) || 0;
          const present = Number(d.present) || 0;
          map[id] = total > 0 ? Math.round((present / total) * 100) : 0;
        });

        console.log("PERCENTAGES MAP:", map);
        setPercentages(map);
      } catch (err) {
        console.error("SUMMARY FETCH ERROR:", err);
        setPercentages({});
      }
    };

    fetchSummary();
  }, [className, section, token, students.length]);

 useEffect(() => {
  if (!date) return;
  // 🔑 RESET UI STATE WHEN DATE CHANGES
  setMessage("");
  setError("");
  setLocked(false);

  fetch("http://localhost:5000/api/teacher/students", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((records) => {
      if (!records || records.length === 0) {
        const init = {};
        students.forEach((s) => (init[s._id] = "PRESENT"));
        setAttendance(init);
        setLocked(false);
        return;
      }

      const isSubmitted =
        records.every((r) => r.submissionStatus === "SUBMITTED");

      setLocked(isSubmitted);
    });
}, [date, students]);
  const setStatus = (id, status) => {
    if (locked) return;
    setAttendance((p) => ({ ...p, [id]: status }));
  };

  const saveAttendance = async () => {
  setError("");
  setMessage("");

  if (!date) {
    setError("Select a date first");
    return;
  }
app.get(
  "/api/teacher/attendance/summary",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    try {
      const { className, section } = req.query;
      const schoolId = req.user?.schoolId ? safeObjectId(req.user.schoolId) : null;
      if (!className) return res.status(400).json({ error: "Missing className" });

      const match = {
        class: String(className),
        ...(section ? { section: String(section) } : {}),
        submissionStatus: "SUBMITTED",
        ...(schoolId ? { schoolId } : {}),
      };

      // normalize status (trim + toUpper) then group by student key
      const pipeline = [
        { $match: match },
        {
          $project: {
            studentKey: { $ifNull: ["$studentUserId", "$studentId"] },
            statusNorm: {
              $toUpper: { $trim: { input: { $ifNull: ["$status", ""] } } },
            },
          },
        },
        {
          $group: {
            _id: "$studentKey",
            total: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $eq: ["$statusNorm", "PRESENT"] }, 1, 0],
              },
            },
          },
        },
      ];

      const agg = await db.collection("attendance").aggregate(pipeline).toArray();

      const out = (agg || []).map((r) => ({
        studentId: r._id ? String(r._id) : null,
        total: r.total || 0,
        present: r.present || 0,
      }));

      return res.json(out);
    } catch (err) {
      console.error("ATTENDANCE SUMMARY ERROR:", err);
      return res.status(500).json({ error: "Failed to compute summary" });
    }
  }
);
  const records = students.map((s) => ({
    studentUserId: s._id,
    status: attendance[s._id],
  }));

  const res = await fetch(
    "http://localhost:5000/api/teacher/attendance/save",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        date,
        className,
        section,
        records,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    setError(data.error || "Save failed");
    return;
  }

  setMessage("Draft saved");
};
  const submitAttendance = async () => {
  setError("");
  setMessage("");

  if (!date) {
    setError("Please select a date");
    return;
  }

  let res;
  try {
    res = await fetch(
      "http://localhost:5000/api/teacher/attendance/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date, className, section }),
      }
    );
  } catch (e) {
    setError("Server not reachable");
    return;
  }

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    // If response is not JSON, ignore
    data = {};
  }

  if (!res.ok) {
    setError(data.error || "Submit failed");
    return; // ❗ DO NOT LOCK UI
  }

  setLocked(true);
  setMessage("Attendance finalized");
};
  /* ================= UI ================= */

 
const totalStudents = students.length;

const presentCount = Object.values(attendance || {}).filter(
  v => v === "PRESENT"
).length;

const absentCount = Object.values(attendance || {}).filter(
  v => v === "ABSENT"
).length;


   return (
  <div style={styles.page}>
    <div style={styles.header}>
      <h1 style={styles.title}>
        Grade {className}-{section}
      </h1>
      <p style={styles.subtitle}>Attendance Overview</p>
    </div>
<div style={styles.statsRow}>
  <div style={styles.stat}>
    <span style={styles.statLabel}>Total</span>
    <b style={styles.statValue}>{totalStudents}</b>
  </div>

  <div style={styles.stat}>
    <span style={styles.statLabel}>Present</span>
    <b style={styles.statValue}>{presentCount}</b>
  </div>

  <div style={styles.stat}>
    <span style={styles.statLabel}>Absent</span>
    <b style={styles.statValue}>{absentCount}</b>
  </div>
</div>

    {/* SAME BUTTON – NOW WORKING */}
    <button onClick={() => setActiveTab("marks")}>Marks</button>
    <button onClick={() => setActiveTab("attendance")}>Attendance</button>

    <div style={styles.controls}>
      <input
        placeholder="Search student"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.input}
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={styles.input}
      />
    </div>

    {/* ================= ATTENDANCE ================= */}
    {activeTab === "attendance" && (
      <div style={{ paddingBottom: "110px" }}>
        {students.map((s) => (
          <div key={s._id} style={styles.card}>
            <div style={styles.studentRow}>
              <div>
                <div style={styles.name}>{s.name}</div>
                <div style={styles.roll}>Roll #{s.rollNo}</div>
              </div>

              <div style={{ fontSize: "13px", fontWeight: "700", color: "#6b7280" }}>
  {(percentages[String(s._id)] ?? 0) + "%"}
</div>
            </div>

            <div style={styles.statusGroup}>
              {["PRESENT", "ABSENT", "LEAVE"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatus(s._id, st)}
                  disabled={locked}
                  style={styles.statusBtn(attendance[s._id], st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* ================= MARKS (SAME UI CARDS) ================= */}
    {activeTab === "marks" && (
      <div style={{ paddingBottom: "110px" }}>
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Exam"
          value={exam}
          onChange={(e) => setExam(e.target.value)}
          style={styles.input}
        />

        {students.map((s) => (
          <div key={s._id} style={styles.card}>
            <div style={styles.studentRow}>
              <div style={styles.name}>{s.name}</div>
              <input
  type="text"
  placeholder="Marks / AB"
  onChange={(e) => {
    const value = e.target.value.toUpperCase();
    setMarks(prev => ({ ...prev, [s._id]: value }));
  }}
/>  

   
            </div>
          </div>
        ))}

        <button style={styles.primary} onClick={saveMarks}>
          Save Marks
        </button>
      </div>
    )}

    <div style={styles.bottomBar}>
      <button
        onClick={saveAttendance}
        disabled={locked}
        style={styles.secondary}
      >
        Save
      </button>
      <button
        onClick={submitAttendance}
        disabled={locked}
        style={styles.primary}
      >
        Finalize
      </button>
    </div>

    {(message || error) && (
      <div style={styles.toast(error)}>{message || error}</div>
    )}
  </div>
);
}
/* ================= STYLES ================= */

const styles = {
  page: {
    minHeight: "100vh",
    padding: "14px",
    background: "#f9fafb",
    fontFamily: "system-ui",
    color: "#0f172a",
  },

  header: { marginBottom: "14px" },
  title: { fontSize: "19px", fontWeight: "800" },
  subtitle: { fontSize: "12px", color: "#64748b" },

  statsRow: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    marginBottom: "14px",
  },

  stat: {
    minWidth: "100px",
    background: "#ffffff",
    borderRadius: "12px",
    padding: "10px",
    border: "1px solid #e5e7eb",
  },

  statLabel: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginBottom: "6px", // 👈 THIS IS THE SPACE YOU ASKED FOR
  },

  statValue: {
    fontSize: "15px",
    fontWeight: "800",
  },

  controls: {
    display: "flex",
    gap: "8px",
    marginBottom: "14px",
  },

  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    fontSize: "13px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "10px",
    border: "1px solid #e5e7eb",
  },

  studentRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  },

  name: { fontSize: "14px", fontWeight: "700" },
  roll: { fontSize: "11px", color: "#64748b" },

  statusGroup: {
    display: "flex",
    background: "#f1f5f9",
    padding: "3px",
    borderRadius: "10px",
  },

  statusBtn: (active, s) => ({
    flex: 1,
    padding: "7px 0",
    borderRadius: "8px",
    border: "none",
    fontSize: "10px",
    fontWeight: "700",
    background:
      active === s
        ? s === "PRESENT"
          ? "#dcfce7"
          : s === "ABSENT"
          ? "#fee2e2"
          : "#e0f2fe"
        : "transparent",
    color:
      active === s
        ? s === "PRESENT"
          ? "#166534"
          : s === "ABSENT"
          ? "#991b1b"
          : "#075985"
        : "#64748b",
  }),

  bottomBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#ffffff",
    padding: "12px",
    display: "flex",
    gap: "10px",
    borderTop: "1px solid #e5e7eb",
  },

  primary: {
    flex: 1,
    background: "#4f46e5",
    color: "#ffffff",
    borderRadius: "12px",
    padding: "12px",
    fontWeight: "700",
    border: "none",
    fontSize: "13px",
  },

  secondary: {
    flex: 1,
    background: "#eef2ff",
    color: "#3730a3",
    borderRadius: "12px",
    padding: "12px",
    fontWeight: "700",
    border: "none",
    fontSize: "13px",
  },

  toast: (err) => ({
    position: "fixed",
    bottom: "90px",
    left: "50%",
    transform: "translateX(-50%)",
    background: err ? "#fee2e2" : "#dcfce7",
    color: err ? "#991b1b" : "#166534",
    padding: "10px 18px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "700",
    border: "1px solid #e5e7eb",
  }),
};
