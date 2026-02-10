import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [student, setStudent] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const token = localStorage.getItem("studentToken");
  const [marks, setMarks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [homework, setHomework] = useState([]);
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("studentToken");
        const res = await fetch(`${API_URL}/api/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
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

  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

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
      localStorage.removeItem("studentToken");
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      navigate("/", { replace: true });
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "marks", label: "Marks" },
    { id: "attendance", label: "Attendance" },
    { id: "homework", label: "Homework" },
    { id: "events", label: "Events" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      {/* ===== MOBILE HAMBURGER ===== */}
      {/* ===== OVERLAY (Mobile) ===== */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/30 z-30"
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div
        className={`fixed md:relative inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 flex flex-col z-30 transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-6">
          <h2 className="text-xl font-black text-green-400 tracking-tight">Student</h2>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition ${
                activeTab === item.id
                  ? "bg-slate-700 text-green-400"
                  : "text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-900 hover:bg-red-800 text-white font-bold rounded-lg transition text-sm"
        >
          Logout
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 w-full md:w-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 md:py-5 sticky top-0 z-20 flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden mr-3 p-2 hover:bg-slate-100 rounded-lg transition"
            title="Toggle sidebar"
          >
            <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              {navItems.find((n) => n.id === activeTab)?.label || "Dashboard"}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">{student?.name ?? "Student"}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {loading && <div className="text-center text-slate-500 py-8">Loading...</div>}

          {/* ===== DASHBOARD ===== */}
          {activeTab === "dashboard" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Welcome</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Class</div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{student?.class ?? "—"}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Teacher</div>
                  <div className="text-lg font-bold text-slate-900 mt-2">{teacher?.name ?? "Not assigned"}</div>
                  {teacher?.subject && <div className="text-xs text-slate-500 mt-1">{teacher.subject}</div>}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Status</div>
                <div className="text-lg font-bold text-green-600 mt-2">Active</div>
              </div>
            </div>
          )}

          {/* ===== MARKS ===== */}
          {activeTab === "marks" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Your Marks</h2>
              {marks.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No marks available
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const subjects = Array.from(new Set(marks.map((m) => m.subject ?? "Other"))).sort();
                    const rowMap = {};
                    marks.forEach((m) => {
                      const key = `${m.exam ?? "Exam"}|${m.date ?? ""}`;
                      if (!rowMap[key]) rowMap[key] = { exam: m.exam ?? "Exam", date: m.date ?? null, marks: {} };
                      rowMap[key].marks[m.subject ?? "Other"] = m.score ?? null;
                    });

                    const rows = Object.values(rowMap).sort((a, b) => {
                      const da = a.date ? new Date(a.date) : null;
                      const db = b.date ? new Date(b.date) : null;
                      if (da && db) return db - da;
                      if (da) return -1;
                      if (db) return 1;
                      return a.exam.localeCompare(b.exam);
                    });

                    return rows.map((r, ri) => (
                      <div key={`exam-${ri}`} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="font-bold text-slate-900 text-sm">{r.exam}</div>
                        {r.date && (
                          <div className="text-xs text-slate-500 mt-1">
                            📅 {new Date(r.date).toLocaleDateString()}
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                          {subjects.map((s) => {
                            const score = r.marks[s];
                            const numeric = typeof score === "string" || typeof score === "number" ? Number(score) : NaN;
                            const bgColor = !isNaN(numeric)
                              ? numeric >= 80
                                ? "bg-green-50"
                                : numeric >= 70
                                ? "bg-blue-50"
                                : numeric >= 60
                                ? "bg-yellow-50"
                                : "bg-red-50"
                              : "bg-slate-50";
                            const textColor = !isNaN(numeric)
                              ? numeric >= 80
                                ? "text-green-600"
                                : numeric >= 70
                                ? "text-blue-600"
                                : numeric >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                              : "text-slate-600";
                            return (
                              <div key={`${ri}-${s}`} className={`${bgColor} p-3 rounded-lg text-center`}>
                                <div className="text-xs text-slate-500 mb-1 truncate">{s}</div>
                                <div className={`text-lg font-black ${textColor}`}>
                                  {score !== null && score !== undefined ? score : "—"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ===== ATTENDANCE ===== */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Attendance Overview</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Total</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{total}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                  <div className="text-xs text-slate-500">Present</div>
                  <div className="text-2xl font-black text-green-600 mt-1">{present}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                  <div className="text-xs text-slate-500">Absent</div>
                  <div className="text-2xl font-black text-red-600 mt-1">{total - present}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                  <div className="text-xs text-slate-500">%</div>
                  <div className="text-2xl font-black text-blue-600 mt-1">{percentage}%</div>
                </div>
              </div>

              {attendance.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No attendance records
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const sorted = [...attendance].sort((a, b) => {
                      const dateA = new Date(a.date || 0);
                      const dateB = new Date(b.date || 0);
                      return dateB - dateA;
                    });

                    const grouped = {};
                    sorted.forEach((record) => {
                      if (!record.date) return;
                      const date = new Date(record.date);
                      const monthKey = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                      if (!grouped[monthKey]) grouped[monthKey] = [];
                      grouped[monthKey].push(record);
                    });

                    return Object.keys(grouped).map((month) => (
                      <div key={month}>
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{month}</h3>
                        <div className="space-y-2">
                          {grouped[month].map((a, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-slate-900 text-sm">
                                  {new Date(a.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                                {a.subject && <div className="text-xs text-slate-500 mt-1">{a.subject}</div>}
                              </div>
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                  a.status === "PRESENT"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {a.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ===== HOMEWORK ===== */}
          {activeTab === "homework" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Your Homework</h2>
              {homework.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No homework assigned
                </div>
              ) : (
                <div className="space-y-3">
                  {homework.map((hw) => (
                    <div key={hw._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="font-bold text-slate-900 text-sm">{hw.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{hw.subject} • Due: {hw.dueDate}</div>
                      {hw.description && <div className="text-sm text-slate-600 mt-2">{hw.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== EVENTS ===== */}
          {activeTab === "events" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Events & Calendar</h2>
              {events.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No events scheduled
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="font-bold text-slate-900 text-sm">{event.eventName}</div>
                      <div className="text-xs text-slate-500 mt-1">📅 {event.eventDate}</div>
                      {event.description && <div className="text-sm text-slate-600 mt-2">{event.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== PROFILE ===== */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Your Profile</h2>
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Name</div>
                  <div className="text-lg font-bold text-slate-900 mt-2">{student?.name ?? "Student Name"}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Class / Section</div>
                  <div className="text-lg font-bold text-slate-900 mt-2">
                    {(student?.class ?? "—") + " / " + (student?.section ?? "—")}
                  </div>
                </div>
                {student?.rollNo && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Roll No</div>
                    <div className="text-lg font-bold text-slate-900 mt-2">{student.rollNo}</div>
                  </div>
                )}
                {student?.parentName && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Parent Name</div>
                    <div className="text-lg font-bold text-slate-900 mt-2">{student.parentName}</div>
                  </div>
                )}
                {student?.phone && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Phone</div>
                    <div className="text-lg font-bold text-slate-900 mt-2">{student.phone}</div>
                  </div>
                )}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Teacher</div>
                  <div className="text-lg font-bold text-slate-900 mt-2">{teacher?.name ?? "Not assigned"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
