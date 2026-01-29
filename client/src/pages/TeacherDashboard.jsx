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
 const teacherData = JSON.parse(localStorage.getItem("teacherData"));
const teacher = JSON.parse(localStorage.getItem("teacherData"));

const className = teacher?.class;
const section = teacher?.section;

  // State to track sidebar width (matches your 260px / 80px sidebar)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const token = localStorage.getItem("teacherToken");

  /* LOGIC (Unchanged) */
  useEffect(() => {
    fetch(`http://localhost:5000/api/teacher/students?className=${className}&section=${section}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
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
    fetch(`http://localhost:5000/api/teacher/attendance/summary?className=${className}&section=${section}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        data.forEach((d) => (map[d._id] = Math.round((d.present / d.total) * 100)));
        setPercentages(map);
      });
  }, [className, section]);

  useEffect(() => {
    if (!date) return;
    fetch(`http://localhost:5000/api/teacher/attendance?date=${date}&className=${className}&section=${section}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((records) => {
        if (records.length === 0) {
          const init = {};
          students.forEach((s) => (init[s._id] = "PRESENT"));
          setAttendance(init);
          setLocked(false);
          return;
        }
        const loaded = {};
        records.forEach((r) => {
          const student = students.find((s) => s.userId === r.studentUserId);
          if (student) loaded[student._id] = r.status;
        });
        setAttendance(loaded);
        const submitted = records.some((r) => r.submissionStatus === "SUBMITTED");
        setLocked(submitted);
      });
  }, [date, students]);

  const setStatus = (id, status) => {
    if (locked) return;
    setAttendance((p) => ({ ...p, [id]: status }));
  };

  const bulkSet = (status) => {
    if (locked) return;
    const all = {};
    students.forEach((s) => (all[s._id] = status));
    setAttendance(all);
  };

  const saveAttendance = async () => {
    setError(""); setMessage("");
    if (!date) return setError("Select a date first");
    const records = students.map((s) => ({ studentUserId: s._id

, status: attendance[s._id] }));
    const res = await fetch("http://localhost:5000/api/teacher/attendance/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, className, section, records }),
    });
    if (!res.ok) return setError("Save failed");
    setMessage("Draft saved successfully ✨");
  };

  const submitAttendance = async () => {
    setError(""); setMessage("");
    const res = await fetch("http://localhost:5000/api/teacher/attendance/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, className, section }),
    });
    if (res.status === 409) { setLocked(true); return setError("Already submitted"); }
    if (!res.ok) return setError("Submit failed");
    setLocked(true);
    setMessage("Attendance finalized and locked 🔒");
  };

  const filtered = students.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || String(s.rollNo).includes(search)
  );

  const presentCount = Object.values(attendance).filter(v => v === "PRESENT").length;

  return (
    /* This wrapper is the magic fix for the overlap */
    <div style={{ 
      marginLeft: sidebarCollapsed ? "80px" : "260px", 
      transition: "margin-left 0.4s ease",
      minHeight: "100vh",
      backgroundColor: "#f8fafc"
    }}>
      
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px" }}>
        
        {/* Top Branding & Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", margin: 0 }}>Class Management</h1>
            <p style={{ color: "#64748b", fontWeight: "500" }}>Manage attendance for Grade {className}-{section}</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
                onClick={saveAttendance} 
                disabled={locked}
                style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", fontWeight: "600", cursor: "pointer", backgroundColor: "#fff" }}
            >
              Save Draft
            </button>
            <button 
                onClick={submitAttendance} 
                disabled={locked}
                style={{ padding: "10px 20px", borderRadius: "10px", border: "none", fontWeight: "600", cursor: "pointer", backgroundColor: "#0f172a", color: "#fff" }}
            >
              Finalize & Lock
            </button>
          </div>
        </div>

        {/* Status Analytics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "30px" }}>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>TOTAL STUDENTS</span>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{students.length}</div>
          </div>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", borderLeft: "4px solid #10b981" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981" }}>PRESENT TODAY</span>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{presentCount}</div>
          </div>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", borderLeft: "4px solid #ef4444" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444" }}>ABSENT/LEAVE</span>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{students.length - presentCount}</div>
          </div>
        </div>

        {/* Controls Table Card */}
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "12px", backgroundColor: "#fff" }}>
            <input 
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "300px" }}
              placeholder="Search by name or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input 
              type="date" 
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div style={{ flex: 1 }} />
            <button 
                onClick={() => bulkSet("PRESENT")} 
                disabled={locked}
                style={{ fontSize: "12px", fontWeight: "700", color: "#10b981", background: "none", border: "none", cursor: "pointer" }}
            >
              MARK ALL PRESENT
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#f8fafc" }}>
              <tr>
                <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", color: "#64748b" }}>STUDENT</th>
                <th style={{ padding: "16px 24px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>ATTENDANCE STATUS</th>
                <th style={{ padding: "16px 24px", textAlign: "right", fontSize: "12px", color: "#64748b" }}>PERFORMANCE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ fontWeight: "700", color: "#1e293b" }}>{s.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>ROLL #{s.rollNo}</div>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
                      {["PRESENT", "ABSENT", "LEAVE"].map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatus(s._id, status)}
                          disabled={locked}
                          style={{
                            padding: "6px 12px",
                            fontSize: "10px",
                            fontWeight: "800",
                            border: "none",
                            borderRadius: "7px",
                            cursor: locked ? "default" : "pointer",
                            backgroundColor: attendance[s._id] === status ? (status === "PRESENT" ? "#10b981" : status === "ABSENT" ? "#ef4444" : "#3b82f6") : "transparent",
                            color: attendance[s._id] === status ? "#fff" : "#64748b",
                            transition: "all 0.2s"
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <span style={{ fontSize: "14px", fontWeight: "800", color: (percentages[s._id]
 || 0) < 75 ? "#ef4444" : "#0f172a" }}>
                      {percentages[s._id]
|| 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Toasts */}
      {(message || error) && (
        <div style={{ position: "fixed", bottom: "30px", right: "30px", padding: "15px 25px", borderRadius: "12px", color: "#fff", backgroundColor: error ? "#ef4444" : "#10b981", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", fontWeight: "600", zIndex: 1000 }}>
          {message || error}
        </div>
      )}
    </div>
  );
}