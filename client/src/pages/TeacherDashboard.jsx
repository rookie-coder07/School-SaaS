import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classInfo, setClassInfo] = useState(null);
  const [homework, setHomework] = useState([]);
  const [events, setEvents] = useState([]);
  const [marks, setMarks] = useState({});
  const [percentages, setPercentages] = useState({});
  
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  const teacher = JSON.parse(localStorage.getItem("teacherData") || "{}");
  const className = teacher?.class;
  const section = teacher?.section;
  const token = localStorage.getItem("teacherToken");

  // ===== HOMEWORK FORM STATE =====
  const [hwTitle, setHwTitle] = useState("");
  const [hwDesc, setHwDesc] = useState("");
  const [hwSubject, setHwSubject] = useState("");
  const [hwDueDate, setHwDueDate] = useState("");
  const [hwLoading, setHwLoading] = useState(false);

  // ===== MARKS FORM STATE =====
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [marksData, setMarksData] = useState({});
  const [allMarks, setAllMarks] = useState([]); // For summary display
  const [availableSubjects, setAvailableSubjects] = useState([]); // Fetch from admin

  // ===== EVENTS FORM STATE =====
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDateVal, setEventDateVal] = useState("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("teacherToken");
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      localStorage.removeItem("teacherToken");
      navigate("/");
    }
  };

  /* ===== FETCH CLASS SUMMARY ===== */
  useEffect(() => {
    const fetchClassSummary = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/class-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setClassInfo(null);
          return;
        }
        const data = await res.json();
        setClassInfo(data);
      } catch (err) {
        console.error("CLASS SUMMARY ERROR:", err);
        setClassInfo(null);
      }
    };

    if (token) fetchClassSummary();
  }, [token]);

  /* ===== FETCH HOMEWORK ===== */
  useEffect(() => {
    if (activeTab !== "homework") return;

    const fetchHomework = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/homework`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setHomework([]);
          return;
        }
        const data = await res.json();
        setHomework(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("HOMEWORK FETCH ERROR:", err);
        setHomework([]);
      }
    };

    fetchHomework();
  }, [activeTab, token]);

  /* ===== FETCH EVENTS ===== */
  useEffect(() => {
    if (activeTab !== "events") return;

    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("EVENTS FETCH ERROR:", err);
        setEvents([]);
      }
    };

    fetchEvents();
  }, [activeTab, token]);

  /* ===== FETCH ALL MARKS FOR SUMMARY ===== */
  useEffect(() => {
    if (activeTab !== "summary") return;

    const fetchAllMarks = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/marks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setAllMarks([]);
          return;
        }
        const data = await res.json();
        setAllMarks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("MARKS FETCH ERROR:", err);
        setAllMarks([]);
      }
    };

    fetchAllMarks();
  }, [activeTab, token]);

  /* ===== FETCH AVAILABLE SUBJECTS ===== */
  useEffect(() => {
    if (activeTab !== "academics" || !className || !section) {
      console.log("Skipping subjects fetch:", { activeTab, className, section });
      return;
    }

    const fetchSubjects = async () => {
      try {
        const url = `${API_URL}/api/teacher/subjects?class=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`;
        console.log("Fetching subjects from:", url);
        console.log("Teacher data:", teacher);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        
        const data = await res.json();
        console.log("Subjects response status:", res.status, "data:", JSON.stringify(data, null, 2));
        console.log("Data is array?:", Array.isArray(data), "Data length:", Array.isArray(data) ? data.length : "N/A");
        
        if (res.ok) {
          const subjects = Array.isArray(data) ? data : (data.subjects || []);
          console.log("Setting availableSubjects to:", subjects);
          setAvailableSubjects(subjects);
        } else {
          console.error("Subjects fetch error:", data);
          setAvailableSubjects([]);
        }
      } catch (err) {
        console.error("SUBJECTS FETCH ERROR:", err);
        setAvailableSubjects([]);
      }
    };

    fetchSubjects();
  }, [activeTab, className, section, token, teacher]);

  /* ===== FETCH STUDENTS ===== */
  useEffect(() => {
    fetch(
      `${API_URL}/api/teacher/students?className=${className}&section=${section}`,
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

  /* ===== FETCH ATTENDANCE SUMMARY ===== */
  useEffect(() => {
    if (!token || !className) return;

    const fetchSummary = async () => {
      try {
        const url = `${API_URL}/api/teacher/attendance/summary?className=${encodeURIComponent(
          className
        )}&section=${encodeURIComponent(section || "")}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();

        const map = {};
        (data || []).forEach((d) => {
          const id = String(d.studentId ?? d._id ?? d.studentUserId ?? "");
          const total = Number(d.total) || 0;
          const present = Number(d.present) || 0;
          map[id] = total > 0 ? Math.round((present / total) * 100) : 0;
        });

        setPercentages(map);
      } catch (err) {
        console.error("SUMMARY FETCH ERROR:", err);
        setPercentages({});
      }
    };

    fetchSummary();
  }, [className, section, token, students.length]);

  /* ===== SET ATTENDANCE STATUS ===== */
  const setStatus = (id, status) => {
    if (locked) return;
    setAttendance((p) => ({ ...p, [id]: status }));
  };

  /* ===== SAVE ATTENDANCE ===== */
  const saveAttendance = async () => {
    setError("");
    setMessage("");

    if (!date) {
      setError("Select a date first");
      return;
    }

    const records = students.map((s) => ({
      studentUserId: s._id,
      status: attendance[s._id],
    }));

    const res = await fetch(`${API_URL}/api/teacher/attendance/save`, {
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
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }

    setMessage("Draft saved");
  };

  /* ===== SUBMIT ATTENDANCE ===== */
  const submitAttendance = async () => {
    setError("");
    setMessage("");

    if (!date) {
      setError("Please select a date");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/teacher/attendance/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date, className, section }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Submit failed");
        return;
      }

      setLocked(true);
      setMessage("Attendance finalized");
    } catch (e) {
      setError("Server not reachable");
    }
  };

  /* ===== SAVE HOMEWORK ===== */
  const saveHomework = async () => {
    setError("");
    setMessage("");

    if (!hwTitle || !hwSubject || !hwDueDate) {
      setError("Fill all required fields");
      return;
    }

    setHwLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/homework/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: hwTitle,
          description: hwDesc,
          subject: hwSubject,
          dueDate: hwDueDate,
        }),
      });

      if (!res.ok) throw new Error();

      setMessage("Homework added successfully");
      setHwTitle("");
      setHwDesc("");
      setHwSubject("");
      setHwDueDate("");

      // Refresh homework list
      const res2 = await fetch(`${API_URL}/api/teacher/homework`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res2.json();
      setHomework(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to add homework");
    } finally {
      setHwLoading(false);
    }
  };

  /* ===== SAVE MARKS ===== */
  const saveMarks = async () => {
    setError("");
    setMessage("");

    if (!subject || !exam) {
      setError("Enter subject and exam");
      return;
    }

    const payload = students.map((s) => ({
      studentId: s._id,
      marks: Number(marksData[s._id] || 0),
    }));

    const res = await fetch(`${API_URL}/api/teacher/marks/save`, {
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
    });

    if (!res.ok) {
      setError("Failed to save marks");
      return;
    }

    setMessage("Marks saved successfully");
    setSubject("");
    setExam("");
    setMarksData({});
  };

  const totalStudents = students.length;
  const presentCount = Object.values(attendance || {}).filter((v) => v === "PRESENT").length;
  const absentCount = Object.values(attendance || {}).filter((v) => v === "ABSENT").length;

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>{(teacher && (teacher.name || teacher.fullName || teacher.displayName)) || "Teacher"}</h2>
        {(teacher && (teacher.class || teacher.section)) && (
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
            {teacher.class ? `Class ${teacher.class}` : ""}{teacher.class && teacher.section ? ` • ` : ""}{teacher.section ? `Section ${teacher.section}` : ""}
          </div>
        )}

        <div style={styles.navItems}>
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "academics", label: "Academics" },
            { id: "summary", label: "Students" },
            { id: "homework", label: "Homework" },
            { id: "events", label: "Events" },
            { id: "attendance", label: "Attendance" },
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

        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div style={styles.page}>
        {/* ===== DASHBOARD / CLASS SUMMARY ===== */}
        {activeTab === "dashboard" && (
          <>
            <h1 style={styles.title}>Class Summary</h1>
            <p style={styles.subtitle}>Overview of your class</p>

            <div style={styles.grid}>
              <div style={styles.card}>
                <span style={styles.cardLabel}>Class</span>
                <b style={styles.cardValue}>{classInfo?.className || "—"}</b>
              </div>

              <div style={styles.card}>
                <span style={styles.cardLabel}>Section</span>
                <b style={styles.cardValue}>{classInfo?.section || "—"}</b>
              </div>

              <div style={styles.card}>
                <span style={styles.cardLabel}>Total Students</span>
                <b style={styles.cardValue}>{classInfo?.totalStudents || 0}</b>
              </div>
            </div>
          </>
        )}

        {/* ===== STUDENTS SUMMARY ===== */}
        {activeTab === "summary" && (
          <>
            <h1 style={styles.title}>Students Summary</h1>
            <p style={styles.subtitle}>Class {teacher.class} • Section {teacher.section}</p>

            {students.length === 0 ? (
              <div style={styles.card}>No students in this class</div>
            ) : (
              students.map((student) => {
                // Get all marks for this student
                const studentMarks = allMarks.filter((m) => m.rollNo === student.rollNo);
                // Group by subject
                const bySubject = {};
                studentMarks.forEach((m) => {
                  if (!bySubject[m.subject]) bySubject[m.subject] = [];
                  bySubject[m.subject].push(m);
                });

                return (
                  <div key={student._id} style={styles.card}>
                    <div style={{ marginBottom: 8 }}>
                      <b style={{ fontSize: 14 }}>{student.name}</b>
                      <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>Roll #{student.rollNo}</span>
                    </div>

                    {Object.keys(bySubject).length === 0 ? (
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>No marks yet</div>
                    ) : (
                      <div style={{ fontSize: 12 }}>
                        {Object.entries(bySubject).map(([subj, marks]) => (
                          <div key={subj} style={{ marginBottom: 6, padding: 6, background: "#f1f5f9", borderRadius: 4 }}>
                            <div style={{ fontWeight: 600, color: "#334155" }}>{subj}</div>
                            {marks.map((m, idx) => (
                              <div key={idx} style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                                {m.examName}: <b>{m.marks}</b>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ===== ACADEMICS / EXAMS ===== */}
        {activeTab === "academics" && (
          <>
            <h1 style={styles.title}>Academics / Exams</h1>
            <p style={styles.subtitle}>Manage exam marks</p>

            {error && <div style={styles.error}>{error}</div>}
            {message && <div style={styles.success}>{message}</div>}

            <div style={styles.formSection}>
              <div style={styles.inputGroup}>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Select Subject</option>
                  {availableSubjects.length > 0 ? (
                    availableSubjects.map((subj) => (
                      <option key={subj._id} value={subj.subjectName}>
                        {subj.subjectName}
                      </option>
                    ))
                  ) : (
                    <option disabled>No subjects available</option>
                  )}
                </select>
                <input
                  placeholder="Exam Name"
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ paddingBottom: "110px" }}>
                {students.map((s) => (
                  <div key={s._id} style={styles.card}>
                    <div style={styles.studentRow}>
                      <div style={styles.name}>{s.name}</div>
                      <input
                        type="text"
                        placeholder="Marks / AB"
                        value={marksData[s._id] || ""}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setMarksData((prev) => ({ ...prev, [s._id]: value }));
                        }}
                        style={styles.marksInput}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button style={styles.primaryBtn} onClick={saveMarks}>
                Save Marks
              </button>
            </div>
          </>
        )}

        {/* ===== HOMEWORK ===== */}
        {activeTab === "homework" && (
          <>
            <h1 style={styles.title}>Homework / Assignments</h1>
            <p style={styles.subtitle}>Add and manage homework</p>

            {error && <div style={styles.error}>{error}</div>}
            {message && <div style={styles.success}>{message}</div>}

            <div style={styles.formSection}>
              <h3 style={styles.formTitle}>Add New Homework</h3>

              <div style={styles.inputGroup}>
                <input
                  placeholder="Title"
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  placeholder="Subject"
                  value={hwSubject}
                  onChange={(e) => setHwSubject(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="date"
                  value={hwDueDate}
                  onChange={(e) => setHwDueDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <textarea
                placeholder="Description (optional)"
                value={hwDesc}
                onChange={(e) => setHwDesc(e.target.value)}
                style={{ ...styles.input, minHeight: "80px", fontFamily: "inherit" }}
              />

              <button
                style={styles.primaryBtn}
                onClick={saveHomework}
                disabled={hwLoading}
              >
                {hwLoading ? "Adding..." : "Add Homework"}
              </button>
            </div>

            <h3 style={styles.formTitle}>Your Homework</h3>
            {homework.length === 0 ? (
              <div style={styles.card}>No homework yet</div>
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

        {/* ===== EVENTS & CALENDAR ===== */}
        {activeTab === "events" && (
          <>
            <h1 style={styles.title}>Events & Calendar</h1>
                <p style={styles.subtitle}>School events and holidays</p>

                {/* Event creation form for teachers */}
                <div style={{ marginBottom: 12, padding: 12, background: "#fff", border: "1px solid #e6eef7" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder="Event name"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      style={styles.input}
                    />
                    <input
                      type="date"
                      value={eventDateVal}
                      onChange={(e) => setEventDateVal(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder="Short description (optional)"
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      style={styles.input}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                      <input type="checkbox" checked={isHoliday} onChange={(e) => setIsHoliday(e.target.checked)} />
                      Holiday
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={async () => {
                        // create event
                        if (!eventName || !eventDateVal) {
                          setError("Event name and date are required");
                          return;
                        }
                        setError("");
                        setMessage("");
                        setEventLoading(true);
                        try {
                          const res = await fetch(`${API_URL}/api/teacher/events`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              eventName: eventName,
                              description: eventDesc,
                              eventDate: eventDateVal,
                              isHoliday,
                            }),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            setError(err.error || "Failed to create event");
                            setEventLoading(false);
                            return;
                          }
                          const data = await res.json();
                          // prepend to local list so UI updates immediately
                          setEvents((prev) => [data.event, ...prev]);
                          setEventName("");
                          setEventDesc("");
                          setEventDateVal("");
                          setIsHoliday(false);
                          setMessage("Event created")
                        } catch (err) {
                          console.error("CREATE EVENT ERROR:", err);
                          setError("Failed to create event");
                        } finally {
                          setEventLoading(false);
                        }
                      }}
                      disabled={eventLoading}
                      style={styles.primaryBtn}
                    >
                      {eventLoading ? "Creating..." : "Create Event"}
                    </button>
                    <button onClick={() => { setEventName(""); setEventDesc(""); setEventDateVal(""); setIsHoliday(false); setError(""); setMessage(""); }} style={styles.secondaryBtn}>
                      Reset
                    </button>
                  </div>
                </div>

                {events.length === 0 ? (
                  <div style={styles.card}>No events scheduled</div>
                ) : (
                  events.map((event) => (
                    <div key={event._id} style={styles.card}>
                      <div style={{ marginBottom: "6px" }}>
                        <b style={{ fontSize: "14px" }}>{event.eventName}</b>
                        {event.isHoliday && <span style={{ marginLeft: 8, color: "#dc2626", fontSize: 12 }}>Holiday</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        📅 {new Date(event.eventDate).toLocaleDateString()}
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

        {/* ===== ATTENDANCE ===== */}
        {activeTab === "attendance" && (
          <>
            <h1 style={styles.title}>Attendance</h1>
            <p style={styles.subtitle}>Mark student attendance</p>

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

            <div style={styles.inputGroup}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Search student"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.input}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {message && <div style={styles.success}>{message}</div>}

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
                        style={styles.statusBtn(attendance[s._id], st, locked)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.bottomBar}>
              <button onClick={saveAttendance} disabled={locked} style={styles.secondaryBtn}>
                Save
              </button>
              <button
                onClick={submitAttendance}
                disabled={locked}
                style={styles.primaryBtn}
              >
                Finalize
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

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
    color: "#f97316",
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
    background: active ? "#fed7aa" : "transparent",
    color: active ? "#9a3412" : "#475569",
    textAlign: "left",
  }),

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

  page: {
    flex: 1,
    padding: "18px",
    minHeight: "100vh",
    background: "#f9fafb",
    fontFamily: "system-ui",
    color: "#0f172a",
  },

  title: { fontSize: "20px", fontWeight: "800", marginBottom: "6px" },
  subtitle: { fontSize: "12px", color: "#64748b", marginBottom: "16px" },
  formTitle: { fontSize: "14px", fontWeight: "700", marginTop: "16px", marginBottom: "12px" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },

  card: {
    background: "#ffffff",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    marginBottom: "10px",
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

  statsRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
    overflowX: "auto",
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
    marginBottom: "6px",
  },

  statValue: {
    fontSize: "15px",
    fontWeight: "800",
  },

  formSection: {
    background: "#ffffff",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    marginBottom: "16px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "12px",
  },

  input: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    fontSize: "13px",
    fontFamily: "inherit",
  },

  marksInput: {
    width: "80px",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    fontSize: "13px",
  },

  studentRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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

  statusBtn: (active, s, locked) => ({
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
    cursor: locked ? "not-allowed" : "pointer",
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

  primaryBtn: {
    flex: 1,
    background: "#4f46e5",
    color: "#ffffff",
    borderRadius: "12px",
    padding: "12px",
    fontWeight: "700",
    border: "none",
    fontSize: "13px",
    cursor: "pointer",
  },

  secondaryBtn: {
    flex: 1,
    background: "#eef2ff",
    color: "#3730a3",
    borderRadius: "12px",
    padding: "12px",
    fontWeight: "700",
    border: "none",
    fontSize: "13px",
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "12px",
    fontSize: "13px",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "12px",
    fontSize: "13px",
  },
};
