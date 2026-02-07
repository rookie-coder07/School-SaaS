import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("studentToken");
  const [marks, setMarks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const navigate = useNavigate();

  // Initial dashboard load (student info + attendance + marks)
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("studentToken");
        const res = await fetch("http://localhost:5000/api/student/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.error("DASHBOARD FETCH FAILED:", res.status);
          setLoading(false);
          return;
        }
        const data = await res.json();
        console.log("DASHBOARD DATA:", data);
        setStudent(data.student || null);
        setAttendance(Array.isArray(data.attendance) ? data.attendance : []);
        setMarks(Array.isArray(data.marks) ? data.marks : []);
      } catch (err) {
        console.error("DASHBOARD ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Fetch marks (optional additional refresh)
  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("studentToken");
        const res = await fetch("http://localhost:5000/api/student/marks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setMarks([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setMarks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("MARKS FETCH ERROR:", err);
        setMarks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, []);

  // Fetch attendance when user opens the attendance tab (or refresh)
  useEffect(() => {
    if (activeTab !== "attendance") return;

    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("studentToken");
        const res = await fetch("http://localhost:5000/api/student/attendance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setAttendance([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAttendance(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("ATTENDANCE FETCH ERROR:", err);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [activeTab]);

  // simple attendance summary
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

  // add logout handler
  const handleLogout = () => {
    // remove possible tokens and any session keys
    localStorage.removeItem("studentToken");
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    // SPA navigation to avoid full reload (keeps dev server connection)
    navigate("/", { replace: true });
  };

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>Student</h2>

        {[
          { id: "marks", label: "Marks" },
          { id: "dashboard", label: "Dashboard" },
          { id: "attendance", label: "Attendance" },
          { id: "profile", label: "Profile" },
          { id: "logout", label: "Logout" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={styles.navBtn(activeTab === item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={styles.page}>
        {loading && <div style={{ marginBottom: 12 }}>Loading...</div>}

        {activeTab === "marks" && (
          <>
            <h1 style={styles.title}>Marks</h1>
            <p style={styles.subtitle}>Your exam performance</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
              {marks.length === 0 && (
                <div style={{ ...styles.card, width: "100%" }}>
                  <span style={styles.cardLabel}>Status</span>
                  <b style={styles.cardValue}>No marks available</b>
                </div>
              )}

              {marks.map((m, i) => (
                <div key={m._id ?? i} style={{ ...styles.card, width: "100%" }}>
                  <span style={styles.cardLabel}>
                    {m.subject ?? m.name ?? "—"} — {m.exam ?? "Exam"}
                  </span>
                  <b style={styles.cardValue}>{m.score ?? "—"}</b>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "dashboard" && (
          <>
            <h1 style={styles.title}>Student Dashboard</h1>
            <p style={styles.subtitle}>Welcome {student?.name ?? "Student"}</p>

            <div style={styles.card}>
              <span style={styles.cardLabel}>Status</span>
              <b style={styles.cardValue}>Active</b>
            </div>
          </>
        )}

        {activeTab === "attendance" && (
          <>
            <h1 style={styles.title}>Attendance</h1>
            <p style={styles.subtitle}>Your attendance overview</p>

            <div style={styles.card}>
              <span style={styles.cardLabel}>Overall Attendance</span>
              <b style={styles.cardValue}>{percentage}%</b>
            </div>

            <div style={{ marginTop: 12 }}>
              {attendance.map((a, idx) => (
                <div key={idx} style={styles.card}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{a.date}</span>
                    <b>{a.status}</b>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "profile" && (
          <>
            <h1 style={styles.title}>Profile</h1>
            <p style={styles.subtitle}>Your student information</p>

            <div style={styles.card}>
              <span style={styles.cardLabel}>Name</span>
              <b style={styles.cardValue}>{student?.name ?? "Student Name"}</b>
            </div>
          </>
        )}

        {activeTab === "logout" && (
          <>
            <h1 style={styles.title}>Logout</h1>
            <p style={styles.subtitle}>You can wire logout logic later</p>

            <button
              style={styles.logoutBtn}
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* STYLES (unchanged) */
const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "#f8fafc",
  },
  sidebar: {
    width: "220px",
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    padding: "16px",
  },
  logo: {
    fontSize: "17px",
    fontWeight: "900",
    marginBottom: "18px",
    color: "#16a34a",
  },
  navBtn: (active) => ({
    width: "100%",
    padding: "10px 12px",
    marginBottom: "8px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    background: active ? "#ecfdf5" : "transparent",
    color: active ? "#15803d" : "#475569",
    textAlign: "left",
  }),
  page: {
    flex: 1,
    padding: "18px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "800",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "14px",
  },
  card: {
    background: "#ffffff",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    width: "220px",
    marginBottom: "14px",
  },
  cardLabel: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginBottom: "6px",
  },
  cardValue: {
    fontSize: "18px",
    fontWeight: "900",
    color: "#0f172a",
  },
  logoutBtn: {
    padding: "10px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: "800",
    fontSize: "13px",
  },
};