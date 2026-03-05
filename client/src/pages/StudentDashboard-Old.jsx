import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [student, setStudent] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("studentToken");
  const [marks, setMarks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [homework, setHomework] = useState([]);
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  // Initial dashboard load (student info + attendance + marks)
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("studentToken");
        const res = await fetch(`${API_URL}/api/student/dashboard`, {
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
        setTeacher(data.teacher || null);
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
        const res = await fetch(`${API_URL}/api/student/marks`, {
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
        const res = await fetch(`${API_URL}/api/student/attendance`, {
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

  // Fetch homework when user opens the homework tab
  useEffect(() => {
    if (activeTab !== "homework") return;

    const fetchHomework = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("studentToken");
        const res = await fetch(`${API_URL}/api/teacher/student/homework`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setHomework([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setHomework(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("HOMEWORK FETCH ERROR:", err);
        setHomework([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomework();
  }, [activeTab]);

  // Fetch events when user opens the events tab
  useEffect(() => {
    if (activeTab !== "events") return;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("studentToken");
        const res = await fetch(`${API_URL}/api/teacher/student/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setEvents([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("EVENTS FETCH ERROR:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [activeTab]);

  // simple attendance summary
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

  // add logout handler
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("studentToken");
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      // remove possible tokens and any session keys
      localStorage.removeItem("studentToken");
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      // SPA navigation to avoid full reload (keeps dev server connection)
      navigate("/", { replace: true });
    }
  };

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>Student</h2>

        <div style={styles.navItems}>
          {[
            { id: "marks", label: "Marks" },
            { id: "dashboard", label: "Dashboard" },
            { id: "attendance", label: "Attendance" },
            { id: "homework", label: "Homework" },
            { id: "events", label: "Events" },
            { id: "profile", label: "Profile" },
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

        <button
          onClick={handleLogout}
          style={styles.logoutBtn}
        >
          Logout
        </button>
      </div>

      <div style={styles.page}>
        {loading && <div style={{ marginBottom: 12 }}>Loading...</div>}

        {activeTab === "marks" && (
          <>
            <h1 style={styles.title}>Marks</h1>
            <p style={styles.subtitle}>Your exam performance</p>

            {marks.length === 0 ? (
              <div style={{ ...styles.card, maxWidth: "100%" }}>
                <span style={styles.cardLabel}>Status</span>
                <b style={styles.cardValue}>No marks available</b>
              </div>
            ) : (
              <>
                {/* Build subjects and rows (exam+date) */}
                {(() => {
                  const subjects = Array.from(new Set(marks.map(m => m.subject ? "Other"))).sort();

                  const rowMap = {};
                  marks.forEach(m => {
                    const key = `${m.exam ? "Exam"}|${m.date ? ""}`;
                    if (!rowMap[key]) rowMap[key] = { exam: m.exam ? "Exam", date: m.date ? null, marks: {} };
                    rowMap[key].marks[m.subject ? "Other"] = m.score ? null;
                  });

                  const rows = Object.values(rowMap).sort((a, b) => {
                    const da = a.date ? new Date(a.date) : null;
                    const db = b.date ? new Date(b.date) : null;
                    if (da && db) return db - da;
                    if (da) return -1;
                    if (db) return 1;
                    return a.exam.localeCompare(b.exam);
                  });

                  return (
                    <div style={{ overflowX: "auto", width: "100%" }}>
                      <div style={{ ...styles.marksGrid, gridTemplateColumns: `200px repeat(${subjects.length}, minmax(120px, 1fr))` }}>
                        <div style={styles.gridHeader}></div>
                        {subjects.map(s => (
                          <div key={s} style={styles.gridHeader}>{s}</div>
                        ))}

                        {rows.map((r, ri) => (
                          <>
                            <div key={`exam-${ri}`} style={styles.gridExamLabel}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{r.exam}</div>
                              {r.date && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>📅 {new Date(r.date).toLocaleDateString()}</div>}
                            </div>

                            {subjects.map(s => {
                              const score = r.marks[s];
                              const numeric = typeof score === "string" || typeof score === "number" ? Number(score) : NaN;
                              const color = !isNaN(numeric) ? (numeric >= 80 ? "#15803d" : numeric >= 70 ? "#0891b2" : numeric >= 60 ? "#f59e0b" : "#dc2626") : "#0f172a";
                              return (
                                <div key={`${ri}-${s}`} style={styles.gridCell}>
                                  <div style={{ ...styles.gridCellInner, color }}>{(score !== null && score !== undefined) ? score : "—"}</div>
                                </div>
                              );
                            })}
                          </>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}

        {activeTab === "dashboard" && (
          <>
            <h1 style={styles.title}>Student Dashboard</h1>
            <p style={styles.subtitle}>Welcome {student?.name ? "Student"}</p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              <div style={{ ...styles.card, minWidth: 180 }}>
                <span style={styles.cardLabel}>Class</span>
                <b style={styles.cardValue}>{student?.class ? "—"}</b>
              </div>
              <div style={{ ...styles.card, minWidth: 220 }}>
                <span style={styles.cardLabel}>Assigned Teacher</span>
                <b style={styles.cardValue}>{teacher?.name ? "Not assigned"}</b>
                {teacher?.subject && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{teacher.subject}</div>}
              </div>
            </div>

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

            {/* Overall attendance summary */}
            <div style={styles.attendanceSummary}>
              <div style={styles.summaryCard}>
                <span style={styles.summaryLabel}>Total Classes</span>
                <b style={styles.summaryValue}>{attendance.length}</b>
              </div>
              <div style={styles.summaryCard}>
                <span style={styles.summaryLabel}>Present</span>
                <b style={{ ...styles.summaryValue, color: "#15803d" }}>
                  {attendance.filter((a) => a.status === "PRESENT").length}
                </b>
              </div>
              <div style={styles.summaryCard}>
                <span style={styles.summaryLabel}>Absent</span>
                <b style={{ ...styles.summaryValue, color: "#dc2626" }}>
                  {attendance.filter((a) => a.status === "ABSENT").length}
                </b>
              </div>
              <div style={styles.summaryCard}>
                <span style={styles.summaryLabel}>Attendance %</span>
                <b style={styles.summaryValue}>{percentage}%</b>
              </div>
            </div>

            {attendance.length === 0 ? (
              <div style={{ ...styles.card, maxWidth: "100%" }}>No attendance records</div>
            ) : (
              <>
                {/* Sort by date (most recent first) and group by month */}
                {(() => {
                  const sorted = [...attendance].sort((a, b) => {
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                  });

                  const grouped = {};
                  sorted.forEach(record => {
                    if (!record.date) return;
                    const date = new Date(record.date);
                    const monthKey = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                    if (!grouped[monthKey]) grouped[monthKey] = [];
                    grouped[monthKey].push(record);
                  });

                  return Object.keys(grouped).map(month => (
                    <div key={month} style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: 10 }}>
                        {month}
                      </h3>
                      {grouped[month].map((a, idx) => (
                        <div key={idx} style={styles.attendanceCard}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>
                                {new Date(a.date).toLocaleDateString("en-US", { 
                                  weekday: "short", 
                                  month: "short", 
                                  day: "numeric" 
                                })}
                              </div>
                              {a.subject && (
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                                  {a.subject}
                                </div>
                              )}
                            </div>
                            <div style={{
                              padding: "4px 12px",
                              borderRadius: "6px",
                              background: a.status === "PRESENT" ? "#ecfdf5" : "#fee2e2",
                              color: a.status === "PRESENT" ? "#15803d" : "#991b1b",
                              fontSize: "12px",
                              fontWeight: "700"
                            }}>
                              {a.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </>
            )}
          </>
        )}

        {activeTab === "profile" && (
          <>
            <h1 style={styles.title}>Profile</h1>
            <p style={styles.subtitle}>Your student information</p>

            <div style={styles.card}>
              <span style={styles.cardLabel}>Name</span>
              <b style={styles.cardValue}>{student?.name ? "Student Name"}</b>
            </div>
            <div style={{ ...styles.card, marginTop: 12 }}>
              <span style={styles.cardLabel}>Class / Section</span>
              <b style={styles.cardValue}>{(student?.class ? "—") + " / " + (student?.section ? "—")}</b>
            </div>
            {student?.rollNo && (
              <div style={{ ...styles.card, marginTop: 12 }}>
                <span style={styles.cardLabel}>Roll No</span>
                <b style={styles.cardValue}>{student.rollNo}</b>
              </div>
            )}
            {student?.parentName && (
              <div style={{ ...styles.card, marginTop: 12 }}>
                <span style={styles.cardLabel}>Parent Name</span>
                <b style={styles.cardValue}>{student.parentName}</b>
              </div>
            )}
            {student?.phone && (
              <div style={{ ...styles.card, marginTop: 12 }}>
                <span style={styles.cardLabel}>Phone Number</span>
                <b style={styles.cardValue}>{student.phone}</b>
              </div>
            )}
            <div style={{ ...styles.card, marginTop: 12 }}>
              <span style={styles.cardLabel}>Teacher</span>
              <b style={styles.cardValue}>{teacher?.name ? "Not assigned"}</b>
            </div>
          </>
        )}

        {activeTab === "homework" && (
          <>
            <h1 style={styles.title}>Homework / Assignments</h1>
            <p style={styles.subtitle}>Your assigned homework</p>

            {homework.length === 0 ? (
              <div style={styles.card}>No homework assigned</div>
            ) : (
              homework.map((hw) => (
                <div key={hw._id} style={styles.card}>
                  <div style={{ marginBottom: "6px" }}>
                    <b style={{ fontSize: "14px" }}>{hw.title}</b>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {hw.subject} • Due: {hw.dueDate}
                  </div>
                  {hw.description && (
                    <div style={{ fontSize: "12px", marginTop: "6px", color: "#475569" }}>
                      {hw.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "events" && (
          <>
            <h1 style={styles.title}>Events & Calendar</h1>
            <p style={styles.subtitle}>School events and holidays</p>

            {events.length === 0 ? (
              <div style={styles.card}>No events scheduled</div>
            ) : (
              events.map((event) => (
                <div key={event._id} style={styles.card}>
                  <div style={{ marginBottom: "6px" }}>
                    <b style={{ fontSize: "14px" }}>{event.eventName}</b>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    📅 {event.eventDate}
                  </div>
                  {event.description && (
                    <div style={{ fontSize: "12px", marginTop: "6px", color: "#475569" }}>
                      {event.description}
                    </div>
                  )}
                </div>
              ))
            )}
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
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  navItems: {
    flex: 1,
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
    width: "100%",
    padding: "10px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "auto",
  },
  marksCard: {
    background: "#ffffff",
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    marginBottom: "10px",
    transition: "all 0.2s ease",
  },
  marksGrid: {
    display: "grid",
    gap: "8px",
    alignItems: "start",
    width: "100%",
  },
  gridHeader: {
    fontSize: 13,
    fontWeight: 800,
    padding: "10px 12px",
    borderBottom: "2px solid #e6eef5",
    color: "#0f172a",
    background: "#ffffff",
  },
  gridExamLabel: {
    padding: "10px 12px",
    borderRight: "1px solid #eef2f7",
    background: "#fff",
  },
  gridCell: {
    padding: "8px 10px",
  },
  gridCellInner: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 10px",
    fontWeight: 800,
    textAlign: "center",
  },
  attendanceCard: {
    background: "#ffffff",
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    marginBottom: "10px",
    transition: "all 0.2s ease",
  },
  attendanceSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  summaryCard: {
    background: "#ffffff",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
  },
};