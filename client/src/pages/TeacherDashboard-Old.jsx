import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SUBJECTS_CACHE_TTL_MS = 15000;
const subjectsCache = new Map();

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classInfo, setClassInfo] = useState(null);
  const [homework, setHomework] = useState([]);
  const [events, setEvents] = useState([]);
  const [marks, setMarks] = useState({});
  const [percentages, setPercentages] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMsg, setModalMsg] = useState("");
  const [modalType, setModalType] = useState("info");
  
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
  const subjectsFetchInFlightRef = useRef(false);
  const lastSubjectsFetchKeyRef = useRef("");
  const academicsFetchKeyRef = useRef("");

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

  const fetchSubjects = useCallback(async (force = false) => {
    if (!className || !section || !token) return;
    const fetchKey = `${className}::${section}`;
    const cacheKey = `${token}::${fetchKey}`;
    const cached = subjectsCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.timestamp < SUBJECTS_CACHE_TTL_MS) {
      setAvailableSubjects(cached.data);
      lastSubjectsFetchKeyRef.current = fetchKey;
      return;
    }
    if (!force && (subjectsFetchInFlightRef.current || lastSubjectsFetchKeyRef.current === fetchKey)) return;
    subjectsFetchInFlightRef.current = true;

    try {
      const url = `${API_URL}/api/teacher/subjects?class=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch subjects");

      const subjects = Array.isArray(data) ? data : data.subjects || [];
      setAvailableSubjects(subjects);
      subjectsCache.set(cacheKey, { data: subjects, timestamp: Date.now() });
      lastSubjectsFetchKeyRef.current = fetchKey;
    } catch (err) {
      console.error("SUBJECTS FETCH ERROR:", err);
      setAvailableSubjects([]);
    } finally {
      subjectsFetchInFlightRef.current = false;
    }
  }, [className, section, token]);

  /* ===== FETCH AVAILABLE SUBJECTS ===== */
  useEffect(() => {
    if (activeTab !== "academics" || !className || !section || !token) return;
    const fetchKey = `${className}::${section}`;
    // Prevent duplicate fetches for same class/section on re-renders.
    if (academicsFetchKeyRef.current === fetchKey) return;
    academicsFetchKeyRef.current = fetchKey;
    fetchSubjects(false);
  }, [activeTab, className, section, token, fetchSubjects]);

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
          const id = String(d.studentId ? d._id ? d.studentUserId ? "");
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
      setModalTitle("Missing date");
      setModalMsg("Select a date first");
      setModalType("error");
      setModalVisible(true);
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
      setModalTitle("Save failed");
      setModalMsg(data.error || "Save failed");
      setModalType("error");
      setModalVisible(true);
      return;
    }

    setMessage("Draft saved");
    setModalTitle("Saved");
    setModalMsg("Draft saved successfully");
    setModalType("success");
    setModalVisible(true);
  };

  /* ===== SUBMIT ATTENDANCE ===== */
  const submitAttendance = async () => {
    setError("");
    setMessage("");

    if (!date) {
      setModalTitle("Missing date");
      setModalMsg("Please select a date before finalizing attendance");
      setModalType("error");
      setModalVisible(true);
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
        setModalTitle("Submit failed");
        setModalMsg(data.error || "Submit failed");
        setModalType("error");
        setModalVisible(true);
        return;
      }

      setLocked(true);
      setMessage("Attendance finalized");
      setModalTitle("Finalized");
      setModalMsg("Attendance finalized successfully");
      setModalType("success");
      setModalVisible(true);
    } catch (e) {
      setModalTitle("Server error");
      setModalMsg("Server not reachable");
      setModalType("error");
      setModalVisible(true);
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
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Roll</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Parent</th>
                      <th style={styles.th}>Class</th>
                      <th style={styles.th}>Section</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s._id}>
                        <td style={styles.td}>{s.rollNo}</td>
                        <td style={{ ...styles.td, fontWeight: 700 }}>{s.name}</td>
                        <td style={styles.td}>{s.parentName || "—"}</td>
                        <td style={styles.td}>{teacher.class}</td>
                        <td style={styles.td}>{teacher.section}</td>
                        <td style={styles.td}>{s.phone || "—"}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: s.active ? "#dcfce7" : "#fee2e2",
                              color: s.active ? "#166534" : "#991b1b",
                            }}
                          >
                            {s.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

        {/* ===== ATTENDANCE (Mobile-first Tailwind UI) ===== */}
        {activeTab === "attendance" && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Attendance</h2>
                  <p className="text-xs text-slate-400">Mark students — Present / Absent</p>
                </div>
                <div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-sm px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="text-sm text-slate-600">Present: <span className="font-bold text-green-600">{presentCount}</span></div>
                <div className="text-sm text-slate-600">Absent: <span className="font-bold text-red-600">{absentCount}</span></div>
                <div className="text-sm text-slate-600">Total: <span className="font-bold">{totalStudents}</span></div>
              </div>
            </div>

            <div className="flex-1 overflow-auto space-y-3 mb-28">
              {students.map((s) => (
                <div key={s._id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Roll {s.rollNo || '—'}</div>
                    </div>

                    <div className="text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-md font-semibold">{percentages[s._id] !== undefined && percentages[s._id] !== null ? `${percentages[s._id]}%` : '—'}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatus(s._id, 'PRESENT')}
                      disabled={locked}
                      className={
                        (attendance[s._id] === 'PRESENT'
                          ? 'bg-green-600 text-white'
                          : 'border border-slate-200 text-slate-800 bg-white') +
                        ' px-3 py-2 rounded-full text-sm font-semibold transition'
                      }
                    >
                      Present
                    </button>

                    <button
                      onClick={() => setStatus(s._id, 'ABSENT')}
                      disabled={locked}
                      className={
                        (attendance[s._id] === 'ABSENT'
                          ? 'bg-red-600 text-white'
                          : 'border border-slate-200 text-slate-800 bg-white') +
                        ' px-3 py-2 rounded-full text-sm font-semibold transition'
                      }
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%_-_2rem)] max-w-3xl px-4">
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 flex gap-3">
                <button
                  onClick={saveAttendance}
                  disabled={locked}
                  className="flex-1 py-3 rounded-lg font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Save
                </button>
                <button
                  onClick={submitAttendance}
                  disabled={locked}
                  className="flex-1 py-3 rounded-lg font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}
                >
                  Submit
                </button>
              </div>
            </div>
          </>
        )}

        {modalVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModalVisible(false)} />
            <div className="bg-white rounded-xl shadow-lg z-10 p-6 w-[min(92%,420px)]">
              <div className="flex items-start gap-3">
                <div className={modalType === 'success' ? 'text-green-600' : modalType === 'error' ? 'text-red-600' : 'text-slate-600'}>
                  {modalType === 'success' ? '✅' : modalType === 'error' ? '⚠️' : 'ℹ️'}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{modalTitle}</h3>
                  <p className="text-sm text-slate-600 mt-2">{modalMsg}</p>
                </div>
              </div>
              <div className="mt-4 text-right">
                <button onClick={() => setModalVisible(false)} className="px-4 py-2 bg-slate-100 rounded-md">Close</button>
              </div>
            </div>
          </div>
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
    background: "#f1f5f9",
  },

  sidebar: {
    width: "240px",
    background: "linear-gradient(180deg, #0f172a, #020617)",
    color: "#fff",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },

  navItems: {
    flex: 1,
    marginTop: "20px",
  },

  logo: {
    fontSize: "20px",
    fontWeight: "900",
    marginBottom: "6px",
    color: "#38bdf8",
  },

  navBtn: (active) => ({
    width: "100%",
    padding: "12px 14px",
    marginBottom: "10px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    background: active ? "#1e293b" : "transparent",
    color: active ? "#38bdf8" : "#cbd5f5",
    textAlign: "left",
    transition: "0.2s",
  }),

  logoutBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#7f1d1d",
    color: "#fff",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
  },

  page: {
    flex: 1,
    padding: "22px",
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#0f172a",
  },

  title: { fontSize: "24px", fontWeight: "900", marginBottom: "4px" },
  subtitle: { fontSize: "13px", color: "#64748b", marginBottom: "18px" },
  formTitle: { fontSize: "16px", fontWeight: "800", marginBottom: "12px" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  card: {
    background: "#ffffff",
    padding: "16px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
    marginBottom: "12px",
  },

  cardLabel: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
    marginBottom: "6px",
  },

  cardValue: {
    fontSize: "22px",
    fontWeight: "900",
    color: "#020617",
  },

  statsRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    overflowX: "auto",
  },

  stat: {
    minWidth: "120px",
    background: "#ffffff",
    borderRadius: "12px",
    padding: "12px",
    border: "1px solid #e5e7eb",
  },

  statLabel: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "4px",
  },

  statValue: {
    fontSize: "18px",
    fontWeight: "900",
  },

  formSection: {
    background: "#ffffff",
    padding: "18px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    marginBottom: "18px",
  },

  inputGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },

  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    fontSize: "14px",
  },

  marksInput: {
    width: "90px",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    fontSize: "14px",
  },

  studentRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },

  name: { fontSize: "15px", fontWeight: "800" },
  roll: { fontSize: "12px", color: "#64748b" },

  statusGroup: {
    display: "flex",
    background: "#f1f5f9",
    padding: "4px",
    borderRadius: "10px",
  },

  statusBtn: (active, s, locked) => ({
    flex: 1,
    padding: "8px 0",
    borderRadius: "8px",
    border: "none",
    fontSize: "11px",
    fontWeight: "800",
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
    left: 240,
    right: 0,
    background: "#ffffff",
    padding: "12px",
    display: "flex",
    gap: "12px",
    borderTop: "1px solid #e5e7eb",
  },

  primaryBtn: {
    flex: 1,
    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#ffffff",
    borderRadius: "12px",
    padding: "12px",
    fontWeight: "800",
    border: "none",
    fontSize: "14px",
    cursor: "pointer",
  },

  secondaryBtn: {
    flex: 1,
    background: "#e0e7ff",
    color: "#3730a3",
    borderRadius: "12px",
    padding: "12px",
    fontWeight: "800",
    border: "none",
    fontSize: "14px",
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px",
    borderRadius: "10px",
    marginBottom: "12px",
    fontSize: "14px",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "10px",
    borderRadius: "10px",
    marginBottom: "12px",
    fontSize: "14px",
  },

  tableWrap: {
    overflowX: "auto",
    background: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    marginBottom: "12px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    background: "#f1f5f9",
    color: "#0f172a",
    fontWeight: "800",
    borderBottom: "1px solid #e5e7eb",
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    color: "#334155",
  },
};
