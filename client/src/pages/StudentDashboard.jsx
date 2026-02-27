
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import AttendanceCalendar from "../components/AttendanceCalendar";
import StudentExamSyllabus from "../components/StudentExamSyllabus";
import StudentExams from "../components/StudentExams";
import StudentMarksCards from "../components/StudentMarksCards";
import VoiceAnnouncements from "../components/VoiceAnnouncements";
import DateFilterBar from "../components/DateFilterBar";
import NotificationBell from "../components/NotificationBell";
import NotificationDropdown from "../components/NotificationDropdown";
import TimetableGrid from "../components/TimetableGrid";
import StudentAnalyticsContent from "../components/StudentAnalyticsContent";
import { useToast } from "../components/ToastProvider";
import PageContainer from "../components/ui/PageContainer";
import { Card, StatCard } from "../components/ui/Card";
import ListItemCard from "../components/ui/ListItemCard";
import { ListSkeleton, StatCardSkeleton } from "../components/ui/Skeleton";
import { sessionTracker } from "../utils/sessionTracker";
import { buildDateFilterQuery, hasDateFilter } from "../utils/dateFilterUtils";

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
  const [marksPayload, setMarksPayload] = useState({ exams: [], legacyMarks: [] });
  const [marksLoading, setMarksLoading] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [homework, setHomework] = useState([]);
  const [events, setEvents] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [voiceMessagesLoading, setVoiceMessagesLoading] = useState(false);
  const [voiceMessagesLoadingMore, setVoiceMessagesLoadingMore] = useState(false);
  const [voicePage, setVoicePage] = useState(1);
  const [voiceTotalPages, setVoiceTotalPages] = useState(1);
  const [homeworkDateFilter, setHomeworkDateFilter] = useState({ from: "", to: "" });
  const [eventsDateFilter, setEventsDateFilter] = useState({ from: "", to: "" });
  const [voiceDateFilter, setVoiceDateFilter] = useState({ from: "", to: "" });
  const [timetable, setTimetable] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [showForcePasswordModal, setShowForcePasswordModal] = useState(
    localStorage.getItem("studentMustChangePassword") === "1"
  );
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordUpdating, setPasswordUpdating] = useState(false);

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
    const controller = new AbortController();
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_URL}/api/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
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
        const mustChange = Boolean(data?.mustChangePassword);
        setShowForcePasswordModal(mustChange);
        if (mustChange) localStorage.setItem("studentMustChangePassword", "1");
        else localStorage.removeItem("studentMustChangePassword");
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("❌ STUDENT DASHBOARD FETCH ERROR:", err);
        if (!token) {
          navigate("/student/login", { replace: true });
        }
      }
    };
    if (token) fetchDashboard();
    return () => controller.abort();
  }, [token, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchStudentMarks = async () => {
      try {
        setMarksLoading(true);
        const res = await fetch(`${API_URL}/api/student/marks?format=v2`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setMarksPayload({ exams: [], legacyMarks: [] });
          return;
        }
        setMarksPayload({
          exams: Array.isArray(data?.exams) ? data.exams : [],
          legacyMarks: Array.isArray(data?.legacyMarks) ? data.legacyMarks : [],
        });
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("❌ STUDENT MARKS V2 FETCH ERROR:", err);
        setMarksPayload({ exams: [], legacyMarks: [] });
      } finally {
        setMarksLoading(false);
      }
    };

    if (token) fetchStudentMarks();
    return () => controller.abort();
  }, [token]);

  // Fetch unread notification count on mount and periodically
  useEffect(() => {
    const controller = new AbortController();
    const fetchUnreadCount = async (signal = controller.signal) => {
      try {
        const response = await axios.get(`${API_URL}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        setUnreadCount(response.data.unreadCount || 0);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        console.error("Error fetching unread count:", err);
        setUnreadCount(0);
      }
    };

    if (token) {
      fetchUnreadCount();
      
      // Poll every 30 seconds to keep count updated
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => {
        controller.abort();
        clearInterval(interval);
      };
    }
    return () => controller.abort();
  }, [token]);

  // Fetch unread count when notifications panel opens
  useEffect(() => {
    const controller = new AbortController();
    if (showNotifications && token) {
      const fetchUnreadCount = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          setUnreadCount(response.data.unreadCount || 0);
        } catch (err) {
          if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
          console.error("Error fetching unread count:", err);
        }
      };
      
      fetchUnreadCount();
    }
    return () => controller.abort();
  }, [showNotifications, token]);

  // Marks and attendance are already loaded from the dashboard fetch above
  // No need for additional fetches

  // Fetch homework
  useEffect(() => {
    if (activeTab !== "homework") return;
    const controller = new AbortController();
    const fetchHomework = async () => {
      try {
        const dateQuery = buildDateFilterQuery(homeworkDateFilter);
        const res = await fetch(`${API_URL}/api/teacher/student/homework${dateQuery ? `?${dateQuery}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setHomework([]);
          return;
        }
        const data = await res.json();
        setHomework(Array.isArray(data) ? data : data.homework || []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("HOMEWORK FETCH ERROR:", err);
        setHomework([]);
      }
    };
    if (token) fetchHomework();
    return () => controller.abort();
  }, [activeTab, token, homeworkDateFilter]);

  // Fetch events
  useEffect(() => {
    if (activeTab !== "events") return;
    const controller = new AbortController();
    const fetchEvents = async () => {
      try {
        const dateQuery = buildDateFilterQuery(eventsDateFilter);
        const res = await fetch(`${API_URL}/api/teacher/student/events${dateQuery ? `?${dateQuery}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("EVENTS FETCH ERROR:", err);
        setEvents([]);
      }
    };
    if (token) fetchEvents();
    return () => controller.abort();
  }, [activeTab, token, eventsDateFilter]);

  // Fetch voice messages
  useEffect(() => {
    if (activeTab !== "voice") return;
    const controller = new AbortController();
    const fetchVoiceMessages = async () => {
      try {
        setVoiceMessagesLoading(true);
        console.log("📡 STUDENT VOICE: Fetching voice messages from /api/student/voice-messages");
        const dateQuery = buildDateFilterQuery(voiceDateFilter);
        const res = await fetch(`${API_URL}/api/student/voice-messages?page=1&limit=20${dateQuery ? `&${dateQuery}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
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
        if (err?.name === "AbortError") return;
        console.error("❌ VOICE MESSAGES FETCH ERROR:", err);
        setVoiceMessages([]);
      } finally {
        setVoiceMessagesLoading(false);
      }
    };
    if (token) fetchVoiceMessages();
    return () => controller.abort();
  }, [activeTab, token, voiceDateFilter]);

  const loadMoreVoiceMessages = async () => {
    if (voiceMessagesLoadingMore || voicePage >= voiceTotalPages) return;
    try {
      setVoiceMessagesLoadingMore(true);
      const nextPage = voicePage + 1;
      const dateQuery = buildDateFilterQuery(voiceDateFilter);
      const res = await fetch(`${API_URL}/api/student/voice-messages?page=${nextPage}&limit=20${dateQuery ? `&${dateQuery}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const nextItems = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setVoiceMessages((prev) => [...prev, ...nextItems]);
      setVoicePage(Number(data?.page || nextPage));
      setVoiceTotalPages(Number(data?.totalPages || voiceTotalPages));
    } catch (err) {
      console.error("LOAD MORE VOICE ERROR:", err);
    } finally {
      setVoiceMessagesLoadingMore(false);
    }
  };

  // Fetch timetable
  useEffect(() => {
    if (activeTab !== "timetable") return;
    const controller = new AbortController();
    const fetchTimetable = async () => {
      try {
        const res = await fetch(`${API_URL}/api/student/timetable`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setTimetable([]);
          return;
        }
        const data = await res.json();
        setTimetable(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("TIMETABLE FETCH ERROR:", err);
        setTimetable([]);
      }
    };
    if (token) fetchTimetable();
    return () => controller.abort();
  }, [activeTab, token]);

  // Fetch analytics
  useEffect(() => {
    if (activeTab !== "analytics") return;
    const controller = new AbortController();
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        const res = await fetch(`${API_URL}/api/student/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch analytics");
        }
        const data = await res.json();
        setAnalytics(data);
        setAnalyticsError(null);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("ANALYTICS FETCH ERROR:", err);
        setAnalyticsError(err.message || "Failed to load analytics");
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    if (token) fetchAnalytics();
    return () => controller.abort();
  }, [activeTab, token]);

  // Teacher info is already loaded from the dashboard fetch above
  // No need for additional fetch

  const handleLogout = async () => {
    try {
      // End session tracking
      await sessionTracker.endSession();

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
      localStorage.removeItem("studentMustChangePassword");
      navigate("/");
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.warning("Current and new password are required");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.warning("New password and confirm password must match");
      return;
    }
    setPasswordUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to change password");
        return;
      }
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowForcePasswordModal(false);
      setShowChangePasswordModal(false);
      localStorage.removeItem("studentMustChangePassword");
    } catch (err) {
      console.error("CHANGE PASSWORD ERROR:", err);
      toast.error("Failed to change password");
    } finally {
      setPasswordUpdating(false);
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
    { id: "attendance", label: "Attendance" },
    { id: "marks", label: "Marks" },
    { id: "homework", label: "Homework" },
    { id: "timetable", label: "Timetable" },
    { id: "exams", label: "Exams" },
    { id: "exam-syllabus", label: "Exam Syllabus" },
    { id: "announcements", label: "Announcements" },
    { id: "voice", label: "Voice Messages" },
    { id: "events", label: "Events" },
    { id: "profile", label: "Profile" },
    { id: "logout", label: "Logout" },
  ];

  const classTeacherName = teacher?.name ? String(teacher.name) : "Not Assigned";
  const classTeacherPhone = String(
    teacher?.phone || teacher?.mobile || teacher?.contact || teacher?.contactNumber || ""
  ).trim();
  const classSectionText = `${student?.class || "-"} - ${student?.section || "-"}`;
  const isMobileCallPreferred =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches;

  return (
    <div className={`h-screen ${activeTab === "timetable" ? "overflow-x-hidden" : "overflow-hidden"} flex flex-col lg:flex-row bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 font-sans`}>
      {/* ===== OVERLAY (Mobile) ===== */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div
        className={`fixed inset-y-0 left-0 w-64 h-screen overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 flex flex-col z-30 transition-transform duration-300 transform lg:relative lg:inset-y-auto lg:shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
                if (item.id === "logout") {
                  setSidebarOpen(false);
                  handleLogout();
                  return;
                }
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition ${
                item.id === "logout"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : activeTab === item.id
                  ? "bg-slate-700 text-green-400"
                  : "text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setShowChangePasswordModal(true)}
          className="mt-2 w-full text-left px-4 py-3 rounded-lg text-sm font-semibold bg-slate-700 text-white hover:bg-slate-600 transition"
        >
          Change Password
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className={`flex-1 w-full lg:w-auto min-w-0 flex flex-col ${activeTab === "timetable" ? "overflow-x-hidden" : "overflow-hidden"}`}>
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-3 md:px-6 py-3 md:py-5 sticky top-0 z-20 flex items-center justify-between gap-3">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden mr-3 p-2 hover:bg-slate-100 rounded-lg transition"
              title="Toggle sidebar"
            >
              <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-black text-slate-900 break-words">
                {navItems.find((n) => n.id === activeTab)?.label || "Dashboard"}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1 break-words">{student?.name ?? "Student"}</p>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 lg:p-8 bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100">
          <div className={activeTab === "timetable" ? "w-full" : "mx-auto w-full max-w-7xl"}>
          {loading && (
            <PageContainer className="space-y-4">
              <StatCardSkeleton count={2} />
              <ListSkeleton rows={2} />
            </PageContainer>
          )}

          {/* ===== DASHBOARD ===== */}
          {activeTab === "dashboard" && (
            <PageContainer className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Welcome</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Class" value={student?.class || "-"} icon="🏫" tone="blue" />
                <StatCard label="Section" value={student?.section || "-"} icon="🧾" tone="purple" />
              </div>

              <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-cyan-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 3a4 4 0 0 1 4 4v1.2a5.5 5.5 0 1 1-8 0V7a4 4 0 0 1 4-4Zm-6 15a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v1.25a.75.75 0 0 1-.75.75h-10.5A.75.75 0 0 1 6 19.25V18Z" />
                  </svg>
                  <h3 className="text-sm font-bold text-cyan-900 uppercase tracking-wide">Class Teacher</h3>
                </div>
                <div className="space-y-2 text-sm min-w-0">
                  <div className="text-slate-700 break-words">
                    <span className="font-semibold text-slate-900">Class Teacher:</span> {classTeacherName}
                  </div>
                  <div className="text-slate-700 flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-cyan-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M2.25 4.5A2.25 2.25 0 0 1 4.5 2.25h3a.75.75 0 0 1 .73.57l.86 3.44a.75.75 0 0 1-.27.77l-1.48 1.18a13.5 13.5 0 0 0 6.45 6.45l1.18-1.48a.75.75 0 0 1 .77-.27l3.44.86a.75.75 0 0 1 .57.73v3A2.25 2.25 0 0 1 17.5 21.75h-.5C8.7 21.75 2.25 15.3 2.25 7v-.5Z" />
                    </svg>
                    <span className="font-semibold text-slate-900">Contact:</span>
                    {classTeacherName === "Not Assigned" ? (
                      <span className="text-slate-500">Not Available</span>
                    ) : classTeacherPhone ? (
                      isMobileCallPreferred ? (
                        <a
                          href={`tel:${classTeacherPhone.replace(/\s+/g, "")}`}
                          className="text-blue-700 underline font-semibold"
                        >
                          {classTeacherPhone}
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-900 break-words">{classTeacherPhone}</span>
                      )
                    ) : (
                      <span className="text-slate-500">Not Available</span>
                    )}
                  </div>
                  <div className="text-slate-700 break-words">
                    <span className="font-semibold text-slate-900">Class:</span> {classSectionText}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="text-xs font-semibold text-slate-500 uppercase">Status</div>
                <div className="text-lg font-bold text-green-600 mt-2">Active</div>
              </Card>
            </PageContainer>
          )}


          {/* ===== MARKS ===== */}
          {activeTab === "marks" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Your Marks</h2>
              {marksLoading ? (
                <ListSkeleton rows={3} />
              ) : marksPayload.exams.length === 0 && marks.length === 0 ? (
                <div className="saas-card p-3 md:p-5 text-center text-slate-500">
                  No marks available
                </div>
              ) : (
                <StudentMarksCards
                  exams={marksPayload.exams}
                  legacyMarks={marksPayload.legacyMarks.length ? marksPayload.legacyMarks : marks}
                />
              )}
            </div>
          )}

          {/* ===== ATTENDANCE ===== */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Attendance</h2>
              {!attendance || attendance.length === 0 ? (
                <div className="saas-card p-3 md:p-5 text-center text-slate-500">
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
              <DateFilterBar value={homeworkDateFilter} onChange={setHomeworkDateFilter} />
              {homework.length === 0 ? (
                <div className="saas-card p-3 md:p-5 text-center text-slate-500">
                  {hasDateFilter(homeworkDateFilter) ? "No items for selected date range" : "No homework assigned"}
                </div>
              ) : (
                <div className="space-y-3">
                  {homework.map((hw) => (
                    <ListItemCard key={hw._id}>
                      <div className="font-bold text-slate-900 text-sm">{hw.title || hw.subject || 'Homework'}</div>
                      <div className="text-xs text-slate-600 mt-2 line-clamp-2">{hw.description || 'No description'}</div>
                      {hw.dueDate && (
                        <div className="text-xs text-slate-500 mt-2">
                          Due: {new Date(hw.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </ListItemCard>
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
              <DateFilterBar value={eventsDateFilter} onChange={setEventsDateFilter} />
              {events.length === 0 ? (
                <div className="saas-card p-3 md:p-5 text-center text-slate-500">
                  {hasDateFilter(eventsDateFilter) ? "No items for selected date range" : "No events scheduled"}
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <ListItemCard key={evt._id}>
                      <div className="font-bold text-slate-900 text-sm">{evt.eventName || evt.title || 'Event'}</div>
                      <div className="text-xs text-slate-600 mt-2">{evt.description || 'No description'}</div>
                      {evt.eventDate && (
                        <div className="text-xs text-slate-500 mt-2">
                          {new Date(evt.eventDate).toLocaleDateString()}
                        </div>
                      )}
                    </ListItemCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== PROFILE ===== */}
          {activeTab === "profile" && student && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
              <div className="saas-card p-3 md:p-6 space-y-3">
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
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-600 font-medium">Parent Name</span>
                  <span className="text-slate-900 font-bold">{student.parentName || "Not set"}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-600 font-medium">Parent Phone</span>
                  <span className="text-slate-900 font-bold">
                    {student.parentPhone || student.phone ? (
                      <a
                        href={`tel:${String(student.parentPhone || student.phone).replace(/\s+/g, "")}`}
                        className="text-blue-600 underline"
                      >
                        {student.parentPhone || student.phone}
                      </a>
                    ) : (
                      "Not set"
                    )}
                  </span>
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
              endpoint="/api/student/announcements"
              title="📢 School Announcements"
              emptyMessage="No announcements yet"
            />
          )}

          {/* ===== VOICE MESSAGES ===== */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Voice Messages</h2>
              <DateFilterBar value={voiceDateFilter} onChange={setVoiceDateFilter} />
              {voiceMessagesLoading ? (
                <ListSkeleton rows={3} />
              ) : voiceMessages.length === 0 ? (
                <div className="saas-card p-3 md:p-5 text-center text-slate-500">
                  {hasDateFilter(voiceDateFilter) ? "No items for selected date range" : "No voice messages yet"}
                </div>
              ) : (
                <div className="space-y-3">
                  {voiceMessages.map((msg) => (
                    <ListItemCard key={msg._id}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            From: {msg.senderName || "Teacher"}
                          </div>
                          <div className="text-xs text-slate-500">Teacher</div>
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
                    </ListItemCard>
                  ))}
                  {voicePage < voiceTotalPages && (
                    <button
                      onClick={loadMoreVoiceMessages}
                      disabled={voiceMessagesLoadingMore}
                      className="w-full py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition disabled:opacity-50"
                    >
                      {voiceMessagesLoadingMore ? "Loading..." : "Load More"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {(showForcePasswordModal || showChangePasswordModal) && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full h-full sm:h-auto sm:max-w-md bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-xl p-4 sm:p-5 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {showForcePasswordModal ? "Change Password Required" : "Change Password"}
            </h3>
            <p className="text-sm text-slate-600">
              {showForcePasswordModal
                ? "Your password was reset by your class teacher. Please set a new password to continue."
                : "Update your account password."}
            </p>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Current Password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              placeholder="New Password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm New Password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleChangePassword}
              disabled={passwordUpdating}
              className="w-full py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {passwordUpdating ? "Updating..." : "Update Password"}
            </button>
            {!showForcePasswordModal && (
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="w-full py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



