
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import AttendanceCalendar from "../components/AttendanceCalendar";
import StudentExamSyllabus from "../components/StudentExamSyllabus";
import StudentExams from "../components/StudentExams";
import VoiceAnnouncements from "../components/VoiceAnnouncements";
import NotificationBell from "../components/NotificationBell";
import NotificationDropdown from "../components/NotificationDropdown";
import TimetableGrid from "../components/TimetableGrid";
import StudentAnalyticsContent from "../components/StudentAnalyticsContent";
import { useToast } from "../components/ToastProvider";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  
  // Student data
  const [student, setStudent] = useState(null);
  const [marks, setMarks] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [homework, setHomework] = useState([]);
  const [events, setEvents] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("studentToken");
  const toast = useToast();

  // Handle navigation from notification clicks via query params
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    const examIdParam = searchParams.get("examId");
    
    if (sectionParam) {
      // Redirect old "syllabus" section to new "exam-syllabus"
      const targetSection = sectionParam === "syllabus" ? "exam-syllabus" : sectionParam;
      if (sectionParam === "syllabus") {
        console.log("📍 Student Dashboard: Redirecting old 'syllabus' section to 'exam-syllabus'");
      } else {
        console.log("📍 Student Dashboard: Navigating to section from query param:", sectionParam);
      }
      setActiveTab(targetSection);
    }
    
    // Handle examId for specific exam syllabus viewing
    if (examIdParam) {
      console.log("📍 Student Dashboard: Exam ID from notification:", examIdParam);
      setSelectedExamId(examIdParam);
    } else {
      setSelectedExamId(null);
    }
  }, [searchParams]);

  // Fetch complete dashboard data (student, attendance, marks, teacher)
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_URL}/api/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            console.warn("🔴 Authentication failed, redirecting to login");
            navigate("/student/login", { replace: true });
            return;
          }
          console.warn("⚠️ Dashboard fetch returned status:", res.status);
          return;
        }
        const data = await res.json();
        setStudent(data.student || null);
        setAttendance(data.attendance || []);
        setMarks(data.marks || []);
        setTeacher(data.teacher || null);
      } catch (err) {
        console.error("❌ STUDENT DASHBOARD FETCH ERROR:", err);
        if (!token) {
          navigate("/student/login", { replace: true });
        }
      }
    };
    if (token) fetchDashboard();
  }, [token, navigate]);

  // Fetch unread notification count on mount and periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount(response.data.unreadCount || 0);
      } catch (err) {
        console.error("Error fetching unread count:", err);
        setUnreadCount(0);
      }
    };

    if (token) {
      fetchUnreadCount();
      
      // Poll every 30 seconds to keep count updated
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Fetch unread count when notifications panel opens
  useEffect(() => {
    if (showNotifications && token) {
      const fetchUnreadCount = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUnreadCount(response.data.unreadCount || 0);
        } catch (err) {
          console.error("Error fetching unread count:", err);
        }
      };
      
      fetchUnreadCount();
    }
  }, [showNotifications, token]);

  // Marks and attendance are already loaded from the dashboard fetch above
  // No need for additional fetches

  // Fetch homework
  useEffect(() => {
    if (activeTab !== "homework") return;
    const fetchHomework = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/student/homework`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setHomework([]);
          return;
        }
        const data = await res.json();
        setHomework(Array.isArray(data) ? data : data.homework || []);
      } catch (err) {
        console.error("HOMEWORK FETCH ERROR:", err);
        setHomework([]);
      }
    };
    if (token) fetchHomework();
  }, [activeTab, token]);

  // Fetch events
  useEffect(() => {
    if (activeTab !== "events") return;
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/student/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      } catch (err) {
        console.error("EVENTS FETCH ERROR:", err);
        setEvents([]);
      }
    };
    if (token) fetchEvents();
  }, [activeTab, token]);

  // Fetch voice messages
  useEffect(() => {
    if (activeTab !== "voice") return;
    const fetchVoiceMessages = async () => {
      try {
        console.log("📡 STUDENT VOICE: Fetching voice messages from /api/student/voice-messages");
        const res = await fetch(`${API_URL}/api/student/voice-messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.warn("❌ STUDENT VOICE: Fetch failed with status", res.status);
          setVoiceMessages([]);
          return;
        }
        const data = await res.json();
        console.log(`✅ STUDENT VOICE: Fetched ${Array.isArray(data) ? data.length : 0} voice messages`);
        if (Array.isArray(data)) {
          data.forEach((msg) => {
            console.log(`   📝 Message from ${msg.senderName}: ${msg.audioUrl}`);
          });
        }
        setVoiceMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ VOICE MESSAGES FETCH ERROR:", err);
        setVoiceMessages([]);
      }
    };
    if (token) fetchVoiceMessages();
  }, [activeTab, token]);

  // Fetch timetable
  useEffect(() => {
    if (activeTab !== "timetable") return;
    const fetchTimetable = async () => {
      try {
        const res = await fetch(`${API_URL}/api/student/timetable`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setTimetable([]);
          return;
        }
        const data = await res.json();
        setTimetable(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("TIMETABLE FETCH ERROR:", err);
        setTimetable([]);
      }
    };
    if (token) fetchTimetable();
  }, [activeTab, token]);

  // Fetch analytics
  useEffect(() => {
    if (activeTab !== "analytics") return;
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        const res = await fetch(`${API_URL}/api/student/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch analytics");
        }
        const data = await res.json();
        setAnalytics(data);
        setAnalyticsError(null);
      } catch (err) {
        console.error("ANALYTICS FETCH ERROR:", err);
        setAnalyticsError(err.message || "Failed to load analytics");
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    if (token) fetchAnalytics();
  }, [activeTab, token]);

  // Teacher info is already loaded from the dashboard fetch above
  // No need for additional fetch

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
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("studentToken");
      localStorage.removeItem("studentSchoolId");
      localStorage.removeItem("studentSchoolName");
      navigate("/");
    }
  };

  // Load schoolId and schoolName from localStorage
  useEffect(() => {
    const storedSchoolId = localStorage.getItem("studentSchoolId");
    const storedSchoolName = localStorage.getItem("studentSchoolName");
    if (storedSchoolId) {
      setSchoolId(storedSchoolId);
    }
    if (storedSchoolName) {
      setSchoolName(storedSchoolName);
    }
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "marks", label: "Marks" },
    { id: "attendance", label: "Attendance" },
    { id: "analytics", label: "Analytics" },
    { id: "exam-syllabus", label: "Exam Syllabus" },
    { id: "exams", label: "Exams" },
    { id: "timetable", label: "Timetable" },
    { id: "homework", label: "Homework" },
    { id: "announcements", label: "Announcements" },
    { id: "voice", label: "Voice Messages" },
    { id: "events", label: "Events" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* ===== OVERLAY (Mobile) ===== */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/30 z-30"
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div
        className={`fixed md:relative inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 flex flex-col z-30 transition-transform duration-300 transform md:overflow-y-auto md:h-screen ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-6">
          <h2 className="text-xl font-black text-green-400 tracking-tight">Student</h2>
          {student?.name && <p className="text-xs text-slate-400 mt-2">{student.name}</p>}
          {schoolName && <p className="text-xs text-slate-500 mt-1 font-semibold">{schoolName}</p>}
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
      <div className="flex-1 w-full md:w-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 md:py-5 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center">
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
          
          {/* Notification Bell */}
          <div className="flex items-center gap-3">
            <NotificationBell
              onClick={() => setShowNotifications(!showNotifications)}
              unreadCount={unreadCount}
              isOpen={showNotifications}
            />
          </div>
        </div>

        {/* Notification Dropdown */}
        {showNotifications && (
          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            token={localStorage.getItem("studentToken")}
            toast={toast}
            onNotificationsUpdated={async () => {
              try {
                const response = await axios.get(`${API_URL}/api/notifications/unread-count`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                setUnreadCount(response.data.unreadCount || 0);
              } catch (err) {
                console.error("Error refreshing unread count:", err);
              }
            }}
          />
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
                      const key = `${m.exam ?? "Exam"}`;
                      if (!rowMap[key]) rowMap[key] = { exam: m.exam ?? "Exam", date: m.date ?? null, marks: {} };
                      rowMap[key].marks[m.subject ?? "Other"] = m.score ?? null;
                    });
                    return Object.entries(rowMap).map(([key, row], idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                          <h3 className="font-bold text-slate-900 text-sm">{row.exam}</h3>
                          {row.date && (
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(row.date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-slate-700">Subject</th>
                              <th className="px-4 py-2 text-right font-semibold text-slate-700">Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjects.map((subj) => (
                              <tr key={subj} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-700">{subj}</td>
                                <td className="px-4 py-2 text-right font-bold text-slate-900">
                                  {row.marks[subj] ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
              <h2 className="text-lg font-bold text-slate-900">Attendance</h2>
              {!attendance || attendance.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No attendance data available
                </div>
              ) : (
                <AttendanceCalendar attendanceData={attendance} />
              )}
            </div>
          )}

          {/* ===== ANALYTICS ===== */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Your Analytics Dashboard</h2>
              <StudentAnalyticsContent 
                analytics={analytics}
                loading={analyticsLoading}
                error={analyticsError}
              />
            </div>
          )}

          {/* ===== EXAM SYLLABUS ===== */}
          {activeTab === "exam-syllabus" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Exam Syllabus</h2>
              <StudentExamSyllabus token={token} selectedExamId={selectedExamId} />
            </div>
          )}

          {/* ===== EXAMS ===== */}
          {activeTab === "exams" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Exam Timetable</h2>
              <StudentExams token={token} />
            </div>
          )}

          {/* ===== HOMEWORK ===== */}
          {activeTab === "homework" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Homework</h2>
              {homework.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No homework assigned
                </div>
              ) : (
                <div className="space-y-3">
                  {homework.map((hw) => (
                    <div key={hw._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="font-bold text-slate-900 text-sm">{hw.title || hw.subject || 'Homework'}</div>
                      <div className="text-xs text-slate-600 mt-2 line-clamp-2">{hw.description || 'No description'}</div>
                      {hw.dueDate && (
                        <div className="text-xs text-slate-500 mt-2">
                          Due: {new Date(hw.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== EVENTS ===== */}

          {/* ===== EVENTS ===== */}
          {activeTab === "events" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Events</h2>
              {events.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No events scheduled
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div key={evt._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="font-bold text-slate-900 text-sm">{evt.eventName || evt.title || 'Event'}</div>
                      <div className="text-xs text-slate-600 mt-2">{evt.description || 'No description'}</div>
                      {evt.eventDate && (
                        <div className="text-xs text-slate-500 mt-2">
                          {new Date(evt.eventDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== PROFILE ===== */}
          {activeTab === "profile" && student && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Name</span>
                  <span className="text-slate-900 font-bold">{student.name}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-600 font-medium">Email</span>
                  <span className="text-slate-900 font-bold text-sm">{student.email}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-600 font-medium">Class</span>
                  <span className="text-slate-900 font-bold">{student.class}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-600 font-medium">Section</span>
                  <span className="text-slate-900 font-bold">{student.section}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-600 font-medium">Roll No</span>
                  <span className="text-slate-900 font-bold">{student.rollNo}</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== TIMETABLE ===== */}
          {activeTab === "timetable" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Class Timetable</h2>
              <TimetableGrid token={token} isTeacher={false} readOnly={true} />
            </div>
          )}

          {/* ===== ANNOUNCEMENTS ===== */}
          {activeTab === "announcements" && (
            <VoiceAnnouncements 
              endpoint="/api/student/voice-announces"
              title="📢 School Announcements"
              emptyMessage="No announcements yet"
            />
          )}

          {/* ===== VOICE MESSAGES ===== */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Voice Messages</h2>
              {voiceMessages.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No voice messages yet
                </div>
              ) : (
                <div className="space-y-3">
                  {voiceMessages.map((msg) => (
                    <div key={msg._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            From: {msg.senderName || (msg.senderRole === "ADMIN" ? "Admin" : "Teacher")}
                          </div>
                          {msg.senderRole === "TEACHER" && (
                            <div className="text-xs text-slate-500">Teacher</div>
                          )}
                          {msg.senderRole === "ADMIN" && (
                            <div className="text-xs text-slate-500">Admin</div>
                          )}
                          <div className="text-xs text-slate-400 mt-1">
                            {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {msg.audioUrl ? (
                        <audio 
                          controls 
                          className="w-full max-w-md"
                          controlsList="nodownload"
                          onError={(e) => {
                            console.error("Audio loading error:", e);
                            console.error("Audio URL:", `${API_URL}${msg.audioUrl}`);
                          }}
                          onLoadedMetadata={(e) => {
                            console.log(`✅ Audio loaded: ${msg._id}, duration: ${e.target.duration}s`);
                          }}>
                          <source src={`${API_URL}${msg.audioUrl}`} type="audio/webm" />
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <div className="text-sm text-red-500">Audio file not available</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
