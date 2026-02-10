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
<<<<<<< HEAD
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMsg, setModalMsg] = useState("");
  const [modalType, setModalType] = useState("info");
  const [sidebarOpen, setSidebarOpen] = useState(false);
=======
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  
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
<<<<<<< HEAD
  const [allMarks, setAllMarks] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
=======
  const [allMarks, setAllMarks] = useState([]); // For summary display
  const [availableSubjects, setAvailableSubjects] = useState([]); // Fetch from admin
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262

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

<<<<<<< HEAD
  // ===== FETCH CLASS SUMMARY =====
=======
  /* ===== FETCH CLASS SUMMARY ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
  // ===== FETCH HOMEWORK =====
=======
  /* ===== FETCH HOMEWORK ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
  // ===== FETCH EVENTS =====
=======
  /* ===== FETCH EVENTS ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
  // ===== FETCH ALL MARKS FOR SUMMARY =====
=======
  /* ===== FETCH ALL MARKS FOR SUMMARY ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
  // ===== FETCH AVAILABLE SUBJECTS =====
  useEffect(() => {
    if (activeTab !== "academics" || !className || !section) {
=======
  /* ===== FETCH AVAILABLE SUBJECTS ===== */
  useEffect(() => {
    if (activeTab !== "academics" || !className || !section) {
      console.log("Skipping subjects fetch:", { activeTab, className, section });
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
      return;
    }

    const fetchSubjects = async () => {
      try {
        const url = `${API_URL}/api/teacher/subjects?class=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`;
<<<<<<< HEAD
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        
        const data = await res.json();
        
        if (res.ok) {
          const subjects = Array.isArray(data) ? data : (data.subjects || []);
          setAvailableSubjects(subjects);
        } else {
=======
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
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
          setAvailableSubjects([]);
        }
      } catch (err) {
        console.error("SUBJECTS FETCH ERROR:", err);
        setAvailableSubjects([]);
      }
    };

    fetchSubjects();
<<<<<<< HEAD
  }, [activeTab, className, section, token]);

  // ===== FETCH STUDENTS =====
=======
  }, [activeTab, className, section, token, teacher]);

  /* ===== FETCH STUDENTS ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
  // ===== FETCH ATTENDANCE SUMMARY =====
=======
  /* ===== FETCH ATTENDANCE SUMMARY ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
  // ===== SET ATTENDANCE STATUS =====
=======
  /* ===== SET ATTENDANCE STATUS ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  const setStatus = (id, status) => {
    if (locked) return;
    setAttendance((p) => ({ ...p, [id]: status }));
  };

<<<<<<< HEAD
  // ===== SAVE ATTENDANCE =====
=======
  /* ===== SAVE ATTENDANCE ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  const saveAttendance = async () => {
    setError("");
    setMessage("");

    if (!date) {
<<<<<<< HEAD
      setModalTitle("Missing date");
      setModalMsg("Select a date first");
      setModalType("error");
      setModalVisible(true);
=======
      setError("Select a date first");
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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
<<<<<<< HEAD
      setModalTitle("Save failed");
      setModalMsg(data.error || "Save failed");
      setModalType("error");
      setModalVisible(true);
=======
      setError(data.error || "Save failed");
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
      return;
    }

    setMessage("Draft saved");
<<<<<<< HEAD
    setModalTitle("Saved");
    setModalMsg("Draft saved successfully");
    setModalType("success");
    setModalVisible(true);
  };

  // ===== SUBMIT ATTENDANCE =====
=======
  };

  /* ===== SUBMIT ATTENDANCE ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  const submitAttendance = async () => {
    setError("");
    setMessage("");

    if (!date) {
<<<<<<< HEAD
      setModalTitle("Missing date");
      setModalMsg("Please select a date before finalizing attendance");
      setModalType("error");
      setModalVisible(true);
=======
      setError("Please select a date");
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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
<<<<<<< HEAD
        setModalTitle("Submit failed");
        setModalMsg(data.error || "Submit failed");
        setModalType("error");
        setModalVisible(true);
=======
        setError(data.error || "Submit failed");
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
        return;
      }

      setLocked(true);
      setMessage("Attendance finalized");
<<<<<<< HEAD
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

  // ===== SAVE HOMEWORK =====
=======
    } catch (e) {
      setError("Server not reachable");
    }
  };

  /* ===== SAVE HOMEWORK ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
=======
      // Refresh homework list
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
  // ===== SAVE MARKS =====
=======
  /* ===== SAVE MARKS ===== */
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
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

<<<<<<< HEAD
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "academics", label: "Academics" },
    { id: "summary", label: "Students" },
    { id: "homework", label: "Homework" },
    { id: "events", label: "Events" },
    { id: "attendance", label: "Attendance" },
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
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-black text-cyan-400 tracking-tight">
            {(teacher && (teacher.name || teacher.fullName || teacher.displayName)) || "Teacher"}
          </h2>
          {teacher && (teacher.class || teacher.section) && (
            <div className="text-xs text-slate-400 mt-2">
              {teacher.class ? `Class ${teacher.class}` : ""}{teacher.class && teacher.section ? " • " : ""}{teacher.section ? `Section ${teacher.section}` : ""}
            </div>
          )}
        </div>

        {/* Nav Items */}
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
                  ? "bg-slate-700 text-cyan-400"
                  : "text-slate-300 hover:bg-slate-700/50"
              }`}
=======
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
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
            >
              {item.label}
            </button>
          ))}
<<<<<<< HEAD
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-900 hover:bg-red-800 text-white font-bold rounded-lg transition text-sm"
        >
=======
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
          Logout
        </button>
      </div>

<<<<<<< HEAD
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
            <p className="text-xs md:text-sm text-slate-500 mt-1">Class {className} • Section {section}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 pb-20 md:pb-6">
          {/* ===== DASHBOARD ===== */}
          {activeTab === "dashboard" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Class Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{classInfo?.className || "—"}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Section</div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{classInfo?.section || "—"}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{classInfo?.totalStudents || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* ===== STUDENTS SUMMARY (TABLE) ===== */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Students Summary</h2>
              {students.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No students in this class
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left font-bold text-slate-900">Roll</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-900">Name</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-900 hidden sm:table-cell">Parent</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-900 hidden md:table-cell">Phone</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-900">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s._id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">{s.rollNo}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                          <td className="px-4 py-3 text-slate-600 hidden sm:table-cell text-xs">{s.parentName || "—"}</td>
                          <td className="px-4 py-3 text-slate-600 hidden md:table-cell text-xs">{s.phone || "—"}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs break-all">{s.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ===== ACADEMICS ===== */}
          {activeTab === "academics" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Academics / Exams</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {students.map((s) => (
                    <div key={s._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
                      <input
                        type="text"
                        placeholder="Marks"
=======
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
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
                        value={marksData[s._id] || ""}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setMarksData((prev) => ({ ...prev, [s._id]: value }));
                        }}
<<<<<<< HEAD
                        className="w-20 px-3 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={saveMarks}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition text-sm"
                >
                  Save Marks
                </button>
              </div>
            </div>
          )}

          {/* ===== HOMEWORK ===== */}
          {activeTab === "homework" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Homework / Assignments</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900">Add New Homework</h3>
                <div className="space-y-3">
                  <input
                    placeholder="Title"
                    value={hwTitle}
                    onChange={(e) => setHwTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    placeholder="Subject"
                    value={hwSubject}
                    onChange={(e) => setHwSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={hwDueDate}
                    onChange={(e) => setHwDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={hwDesc}
                    onChange={(e) => setHwDesc(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-24"
                  />
                </div>
                <button
                  onClick={saveHomework}
                  disabled={hwLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition text-sm disabled:opacity-50"
                >
                  {hwLoading ? "Adding..." : "Add Homework"}
                </button>
              </div>

              <h3 className="font-bold text-slate-900 mt-6">Your Homework</h3>
              {homework.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No homework yet
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

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900">Create Event</h3>
                <div className="space-y-3">
                  <input
                    placeholder="Event name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={eventDateVal}
                    onChange={(e) => setEventDateVal(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    placeholder="Description (optional)"
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="flex items-center gap-2 text-slate-700 text-sm">
                    <input
                      type="checkbox"
                      checked={isHoliday}
                      onChange={(e) => setIsHoliday(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Holiday
                  </label>
                </div>
                <button
                  onClick={async () => {
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
                      setEvents((prev) => [data.event, ...prev]);
                      setEventName("");
                      setEventDesc("");
                      setEventDateVal("");
                      setIsHoliday(false);
                      setMessage("Event created");
                    } catch (err) {
                      console.error("CREATE EVENT ERROR:", err);
                      setError("Failed to create event");
                    } finally {
                      setEventLoading(false);
                    }
                  }}
                  disabled={eventLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition text-sm disabled:opacity-50"
                >
                  {eventLoading ? "Creating..." : "Create Event"}
                </button>
              </div>

              {events.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No events scheduled
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{event.eventName}</div>
                          {event.isHoliday && <span className="text-xs text-red-600 font-semibold">Holiday</span>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">📅 {new Date(event.eventDate).toLocaleDateString()}</div>
                      {event.description && <div className="text-sm text-slate-600 mt-2">{event.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== ATTENDANCE ===== */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Attendance</h2>
                    <p className="text-xs text-slate-500">Mark students — Present / Absent</p>
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Present</div>
                    <div className="text-2xl font-black text-green-600">{presentCount}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Absent</div>
                    <div className="text-2xl font-black text-red-600">{absentCount}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Total</div>
                    <div className="text-2xl font-black text-slate-900">{totalStudents}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {students.map((s) => (
                  <div key={s._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
                      <div className="text-xs text-slate-500 mt-1">Roll {s.rollNo || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-50 rounded-md text-sm font-bold text-slate-600">
                        {percentages[s._id] !== undefined && percentages[s._id] !== null ? `${percentages[s._id]}%` : "—"}
                      </span>
                      <button
                        onClick={() => setStatus(s._id, "PRESENT")}
                        disabled={locked}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                          attendance[s._id] === "PRESENT"
                            ? "bg-green-600 text-white"
                            : "border border-slate-200 bg-white text-slate-800 hover:border-green-300"
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => setStatus(s._id, "ABSENT")}
                        disabled={locked}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                          attendance[s._id] === "ABSENT"
                            ? "bg-red-600 text-white"
                            : "border border-slate-200 bg-white text-slate-800 hover:border-red-300"
                        }`}
                      >
                        Absent
                      </button>
                    </div>
=======
                        style={styles.marksInput}
                      />
                    </div>
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
                  </div>
                ))}
              </div>

<<<<<<< HEAD
              <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200 p-4 flex gap-3 sm:relative sm:mt-4 sm:bg-transparent sm:border-0">
                <button
                  onClick={saveAttendance}
                  disabled={locked}
                  className="flex-1 py-3 bg-slate-100 text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition text-sm disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={submitAttendance}
                  disabled={locked}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition text-sm disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white w-full sm:w-auto sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">
                {modalType === "success" ? "✅" : modalType === "error" ? "⚠️" : "ℹ️"}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{modalTitle}</h3>
                <p className="text-sm text-slate-600 mt-1">{modalMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setModalVisible(false)}
              className="w-full py-2 bg-slate-100 text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
=======
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
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
