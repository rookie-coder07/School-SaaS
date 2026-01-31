import { useEffect, useState } from "react";

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [percentages, setPercentages] = useState({});
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const teacher = JSON.parse(localStorage.getItem("teacherData") || "{}");
  const className = teacher?.class;
  const section = teacher?.section;
  const token = localStorage.getItem("teacherToken");

  /* ================= LOGIC (UNCHANGED) ================= */

  useEffect(() => {
    fetch(
      `http://localhost:5000/api/teacher/students?className=${className}&section=${section}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        setStudents(data);
        const init = {};
        data.forEach((s) => (init[s._id] = "PRESENT"));
        setAttendance(init);
        setLocked(false);
      });
  }, [className, section]);

  useEffect(() => {
    fetch(
      `http://localhost:5000/api/teacher/attendance/summary?className=${className}&section=${section}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        data.forEach(
          (d) => (map[d._id] = Math.round((d.present / d.total) * 100))
        );
        setPercentages(map);
      });
  }, [className, section]);

  useEffect(() => {
    if (!date) return;

    fetch(
      `http://localhost:5000/api/teacher/attendance?date=${date}&className=${className}&section=${section}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((records) => {
        if (!records || records.length === 0) {
          const init = {};
          students.forEach((s) => (init[s._id] = "PRESENT"));
          setAttendance(init);
          setLocked(false);
          return;
        }

        const loaded = {};
        records.forEach((r) => {
          const student = students.find(
            (s) => s.userId?.toString() === r.studentUserId?.toString()
          );
          if (student) loaded[student._id] = r.status;
        });

        setAttendance(loaded);
        setLocked(true);
      });
  }, [date, students]);

  const setStatus = (id, status) => {
    if (locked) return;
    setAttendance((p) => ({ ...p, [id]: status }));
  };

  const saveAttendance = async () => {
    setError("");
    setMessage("");
    if (!date) return setError("Select a date first");

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
        body: JSON.stringify({ date, className, section, records }),
      }
    );

    if (!res.ok) return setError("Save failed");
    setMessage("Draft saved");
  };

  const submitAttendance = async () => {
    setError("");
    setMessage("");

    const res = await fetch(
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

    if (res.status === 409) {
      setLocked(true);
      return setError("Already submitted");
    }
    if (!res.ok) return setError("Submit failed");

    setLocked(true);
    setMessage("Attendance finalized");
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      String(s.rollNo).includes(search)
  );

  const presentCount = Object.values(attendance).filter(
    (v) => v === "PRESENT"
  ).length;

  /* ================= UI ================= */

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
          <b style={styles.statValue}>{students.length}</b>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Present</span>
          <b style={styles.statValue}>{presentCount}</b>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Absent</span>
          <b style={styles.statValue}>
            {students.length - presentCount}
          </b>
        </div>
      </div>

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

      <div style={{ paddingBottom: "110px" }}>
        {filtered.map((s) => (
          <div key={s._id} style={styles.card}>
            <div style={styles.studentRow}>
              <div>
                <div style={styles.name}>{s.name}</div>
                <div style={styles.roll}>Roll #{s.rollNo}</div>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color:
                    (percentages[s._id] || 0) < 75 ? "#dc2626" : "#16a34a",
                }}
              >
                {percentages[s._id] || 0}%
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
