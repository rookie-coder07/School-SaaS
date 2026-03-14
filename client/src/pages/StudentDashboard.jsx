
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import NotificationBell from "../components/NotificationBell";
import { useToast } from "../components/ToastProvider";
import PageContainer from "../components/ui/PageContainer";
import PageIntro from "../components/ui/PageIntro";
import ListItemCard from "../components/ui/ListItemCard";
import { ListSkeleton, StatCardSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { sessionTracker } from "../utils/sessionTracker";
import { notifySpecificUser } from "../utils/notificationHelper";
import { buildDateFilterQuery, hasDateFilter } from "../utils/dateFilterUtils";
import AttendanceCalendar from "../components/AttendanceCalendar";
import StudentExamSyllabus from "../components/StudentExamSyllabus";
import StudentExams from "../components/StudentExams";
import StudentMarksCards from "../components/StudentMarksCards";
import VoiceAnnouncements from "../components/VoiceAnnouncements";
import DateFilterBar from "../components/DateFilterBar";
import NotificationDropdown from "../components/NotificationDropdown";
import TimetableGrid from "../components/TimetableGrid";
import StudentAnalyticsDashboard from "../components/student/StudentAnalyticsDashboard";
import {
  BarChart3,
  BookOpenCheck,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Mic2,
  Search,
  Settings,
  UserCircle2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const lazyFallback = <ListSkeleton rows={2} />;
const REMINDER_DAYS_BEFORE = 1;

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const isReminderWindow = (value) => {
  const target = normalizeDate(value);
  if (!target) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  return diffDays === REMINDER_DAYS_BEFORE;
};

const getVoiceMessageTypeMeta = (msg = {}) => {
  const hasAudio = Boolean(msg?.audioUrl);
  const hasText = Boolean(String(msg?.textMessage || "").trim());
  if (hasAudio && hasText) return { label: "Voice + Text", className: "bg-indigo-100 text-indigo-700 border border-indigo-200" };
  if (hasAudio) return { label: "Voice", className: "bg-blue-100 text-blue-700 border border-blue-200" };
  if (hasText) return { label: "Text", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
  return { label: "Empty", className: "bg-slate-100 text-slate-600 border border-slate-200" };
};

const getAudioSourceType = (audioUrl = "") => {
  const value = String(audioUrl || "").toLowerCase();
  if (value.endsWith(".mp3")) return "audio/mpeg";
  if (value.endsWith(".wav")) return "audio/wav";
  if (value.endsWith(".ogg")) return "audio/ogg";
  return "audio/webm";
};

const enforceSingleAudioPlayback = (event) => {
  const currentAudio = event?.currentTarget;
  if (!currentAudio) return;
  document.querySelectorAll("audio").forEach((audioEl) => {
    if (audioEl !== currentAudio) {
      audioEl.pause();
    }
  });
};

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [failedVoiceAudioIds, setFailedVoiceAudioIds] = useState(() => new Set());
  const [voiceMessagesLoading, setVoiceMessagesLoading] = useState(false);
  const [voicePage, setVoicePage] = useState(1);
  const [voiceTotalPages, setVoiceTotalPages] = useState(1);
  const voiceMessagesPerPage = 10;
  const [voiceMessageTab, setVoiceMessageTab] = useState("voice");
  const [homeworkDateFilter, setHomeworkDateFilter] = useState({ from: "", to: "" });
  const [eventsDateFilter, setEventsDateFilter] = useState({ from: "", to: "" });
  const [voiceDateFilter, setVoiceDateFilter] = useState({ from: "", to: "" });
  const [timetable, setTimetable] = useState([]);
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
  const reminderAttemptedRef = useRef(new Set());

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("studentToken");
  const toast = useToast();

  const queueStudentReminder = useCallback(async (key, title, message, type, metadata = {}) => {
    if (!student?._id || !token) return;
    if (reminderAttemptedRef.current.has(key) || localStorage.getItem(key)) return;
    reminderAttemptedRef.current.add(key);
    try {
      await notifySpecificUser(student._id, title, message, type, token, metadata);
      localStorage.setItem(key, "1");
    } catch (err) {
      console.warn("REMINDER notification failed (non-critical):", err);
    }
  }, [student?._id, token]);

  // Handle navigation from notification clicks via query params
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    const examIdParam = searchParams.get("examId");
    
    if (sectionParam) {
      // Redirect old "syllabus" section to new "exam-syllabus"
      const targetSection = sectionParam === "syllabus" ? "exam-syllabus" : sectionParam;
      if (sectionParam === "syllabus") {
        console.log("ðŸ“ Student Dashboard: Redirecting old 'syllabus' section to 'exam-syllabus'");
      } else {
        console.log("ðŸ“ Student Dashboard: Navigating to section from query param:", sectionParam);
      }
      setActiveTab(targetSection);
    }
    
    // Handle examId for specific exam syllabus viewing
    if (examIdParam) {
      console.log("ðŸ“ Student Dashboard: Exam ID from notification:", examIdParam);
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
            console.warn("ðŸ”´ Authentication failed, redirecting to login");
            navigate("/student/login", { replace: true });
            return;
          }
          console.warn("âš ï¸ Dashboard fetch returned status:", res.status);
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
        console.error("âŒ STUDENT DASHBOARD FETCH ERROR:", err);
        if (!token) {
          navigate("/student/login", { replace: true });
        }
      }
    };
    if (token) fetchDashboard();
    return () => controller.abort();
  }, [token, navigate]);

  useEffect(() => {
    if (activeTab !== "marks") return undefined;
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
        console.error("âŒ STUDENT MARKS V2 FETCH ERROR:", err);
        setMarksPayload({ exams: [], legacyMarks: [] });
      } finally {
        setMarksLoading(false);
      }
    };

    if (token) fetchStudentMarks();
    return () => controller.abort();
  }, [token, activeTab]);

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
        const homeworkList = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.homework)
              ? data.homework
              : [];
        setHomework(homeworkList);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("HOMEWORK FETCH ERROR:", err);
        setHomework([]);
      }
    };
    if (token) fetchHomework();
    return () => controller.abort();
  }, [activeTab, token, homeworkDateFilter]);

  useEffect(() => {
    if (!student?._id || !Array.isArray(homework)) return;
    homework.forEach((hw) => {
      if (!hw?.dueDate || !isReminderWindow(hw.dueDate)) return;
      const key = `studentReminder:homework:${student._id}:${hw._id}:${hw.dueDate}`;
      queueStudentReminder(
        key,
        "📘 Homework due tomorrow",
        `${hw.title || hw.subject || "Homework"} is due tomorrow.`,
        "homework",
        { type: "homework", dueDate: hw.dueDate }
      );
    });
  }, [homework, queueStudentReminder, student?._id]);

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
        const eventsList = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.events)
              ? data.events
              : [];
        setEvents(eventsList);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("EVENTS FETCH ERROR:", err);
        setEvents([]);
      }
    };
    if (token) fetchEvents();
    return () => controller.abort();
  }, [activeTab, token, eventsDateFilter]);

  useEffect(() => {
    if (!student?._id || !Array.isArray(events)) return;
    events.forEach((evt) => {
      if (!evt?.eventDate || !isReminderWindow(evt.eventDate)) return;
      const key = `studentReminder:event:${student._id}:${evt._id}:${evt.eventDate}`;
      queueStudentReminder(
        key,
        "📅 Event tomorrow",
        `${evt.eventName || evt.title || "Event"} is tomorrow.`,
        "event",
        { type: "event", eventDate: evt.eventDate }
      );
    });
  }, [events, queueStudentReminder, student?._id]);

  useEffect(() => {
    if (activeTab !== "voice") return;
    setVoicePage(1);
    setVoiceMessageTab("voice");
  }, [activeTab, voiceDateFilter]);

  // Fetch voice messages
  useEffect(() => {
    if (activeTab !== "voice") return;
    const controller = new AbortController();
    const fetchVoiceMessages = async () => {
      try {
        setVoiceMessagesLoading(true);
        console.log("STUDENT VOICE: Fetching voice messages from /api/student/voice-messages");
        const dateQuery = buildDateFilterQuery(voiceDateFilter);
        const selectedVoiceId = searchParams.get("id");
        const voiceIdQuery = selectedVoiceId ? `&id=${encodeURIComponent(selectedVoiceId)}` : "";
        const res = await fetch(`${API_URL}/api/student/voice-messages?page=${voicePage}&limit=${voiceMessagesPerPage}${dateQuery ? `&${dateQuery}` : ""}${voiceIdQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          console.warn("STUDENT VOICE: Fetch failed with status", res.status);
          setVoiceMessages([]);
          setVoiceTotalPages(1);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        console.log(`STUDENT VOICE: Fetched ${list.length} voice messages`);
        setVoiceMessages(list);
        setFailedVoiceAudioIds(new Set());
        setVoiceTotalPages(Number(data?.totalPages || 1));
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("VOICE MESSAGES FETCH ERROR:", err);
        setVoiceMessages([]);
      } finally {
        setVoiceMessagesLoading(false);
      }
    };
    if (token) fetchVoiceMessages();
    return () => controller.abort();
  }, [activeTab, token, voiceDateFilter, searchParams, voicePage, voiceMessagesPerPage]);

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

  // Handle scroll lock when sidebar opens/closes (mobile)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("nav-open");
    } else {
      document.body.classList.remove("nav-open");
    }
    return () => {
      document.body.classList.remove("nav-open");
    };
  }, [sidebarOpen]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "marks", label: "Marks", icon: ClipboardList },
    { id: "homework", label: "Homework", icon: BookOpenCheck },
    { id: "timetable", label: "Timetable", icon: CalendarClock },
    { id: "exams", label: "Exams", icon: GraduationCap },
    { id: "exam-syllabus", label: "Exam Syllabus", icon: ClipboardList },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "voice", label: "Voice Messages", icon: Mic2 },
    { id: "events", label: "Events", icon: CalendarCheck },
    { id: "profile", label: "Profile", icon: UserCircle2 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const attendancePercent = Array.isArray(attendance) && attendance.length
    ? Math.round(
      (attendance.filter((entry) => entry?.status === "PRESENT" || entry?.present === true).length / attendance.length) * 100
    )
    : 0;

  const classTeacherName = teacher?.name ? String(teacher.name) : "Not Assigned";
  const classTeacherPhone = String(
    teacher?.phone || teacher?.mobile || teacher?.contact || teacher?.contactNumber || ""
  ).trim();
  const classSectionText = `${student?.class || "-"} - ${student?.section || "-"}`;
  const isMobileCallPreferred =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches;

  const isAnalyticsView = activeTab === "analytics";

  if (isAnalyticsView) {
    return (
      <div className="student-portal-shell min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 md:p-8 font-sans">
        <div className="w-full">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              navigate("/student/dashboard");
            }}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-200 hover:text-white hover:underline transition"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </button>
          <StudentAnalyticsDashboard
            endpoint={`${API_URL}/api/student/analytics`}
            authToken={token}
            onBack={() => navigate("/student/dashboard")}
            hideInternalBackButton
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`student-portal-shell flex min-h-screen ${
        activeTab === "timetable" ? "overflow-x-hidden" : "overflow-x-hidden"
      } flex-col lg:flex-row bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 font-sans`}
    >
      {/* ===== OVERLAY (Mobile) ===== */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/45 z-20"
          aria-hidden="true"
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div
        className={`fixed inset-y-0 left-0 h-screen overflow-y-auto bg-slate-900/60 text-slate-200 p-4 flex flex-col z-30 transition-[width,transform] duration-200 backdrop-blur-xl ${
          sidebarCollapsed ? "w-20" : "w-72"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} lg:relative lg:inset-y-auto lg:shrink-0`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black">
              S
            </div>
            <div className={`${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
              <h2 className="text-lg font-black tracking-tight">Student Portal</h2>
              {schoolName ? <p className="text-xs text-slate-400">{schoolName}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-200 hover:bg-white/20 transition"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "settings") {
                  setSidebarOpen(false);
                  navigate("/settings");
                  return;
                }
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              title={item.label}
              className={`group w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-3 ${
                activeTab === item.id
                  ? "bg-blue-500/20 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {item.icon ? (
                <item.icon
                  className={`h-4 w-4 transition-transform duration-200 group-hover:scale-105 ${
                    activeTab === item.id ? "text-white" : "text-slate-300"
                  }`}
                />
              ) : null}
              <span className={`${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="space-y-2">
          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-slate-200 hover:bg-white/20 transition"
            title="Change Password"
          >
            <span className="flex items-center gap-3">
              <Settings className="h-4 w-4" />
              <span className={`${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
                Change Password
              </span>
            </span>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("studentToken");
              navigate("/student/login");
            }}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 transition"
            title="Logout"
          >
            <span className="flex items-center gap-3">
              <LogOut className="h-4 w-4" />
              <span className={`${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
                Logout
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className={`flex-1 w-full lg:w-auto min-w-0 flex flex-col bg-slate-900/60 backdrop-blur-xl ${activeTab === "timetable" ? "overflow-x-hidden" : "overflow-y-auto overflow-x-hidden"}`}>
        {/* Header */}
        <div className="bg-slate-950/90 border-b border-white/10 backdrop-blur-xl shadow-[0_12px_32px_rgba(2,6,23,0.45)] px-3 md:px-6 py-3 md:py-5 sticky top-0 z-20 flex items-center justify-between gap-3 text-slate-100">
          <div className="flex items-center min-w-0">
            {activeTab !== "analytics" && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden mr-3 p-2 hover:bg-white/10 rounded-lg transition"
                title="Toggle sidebar"
              >
                <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="flex-1 min-w-0">
              {activeTab === "analytics" && (
                <button
                  onClick={() => {
                    setActiveTab("dashboard");
                    navigate("/student/dashboard");
                  }}
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200 hover:text-white hover:underline transition"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to Dashboard
                </button>
              )}
              <h1 className="text-xl md:text-3xl font-black text-white break-words">
                {navItems.find((n) => n.id === activeTab)?.label || "Dashboard"}
              </h1>
              <p className="text-xs md:text-sm text-slate-300 mt-1 break-words">{student?.name ?? "Student"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 border border-white/10 bg-white/10">
              <Search className="h-4 w-4 text-slate-200" />
              <input
                placeholder="Search homework, exams, announcements..."
                className="bg-transparent text-sm outline-none w-56 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <NotificationBell
              onClick={() => setShowNotifications(!showNotifications)}
              unreadCount={unreadCount}
              isOpen={showNotifications}
            />
            <div className="flex items-center gap-2 rounded-full px-2 py-1.5 border border-white/10 bg-white/10">
              <UserCircle2 className="text-slate-200 h-5 w-5" />
              <span className="hidden md:inline text-xs font-semibold text-slate-100">
                {student?.name || "Student"}
              </span>
            </div>
          </div>
        </div>

        {/* Notification Dropdown */}
        {showNotifications && (
          <Suspense fallback={null}>
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
          </Suspense>
        )}

        {/* Content */}
        <div className="flex-1 min-h-screen overflow-y-auto overflow-x-hidden px-8 py-6 pb-16">
          <div className="w-full max-w-none">
            <Suspense fallback={lazyFallback}>
              {loading && (
                <PageContainer className="space-y-4">
                  <StatCardSkeleton count={2} />
                  <ListSkeleton rows={2} />
                </PageContainer>
              )}

              {/* ===== DASHBOARD ===== */}
              {activeTab === "dashboard" && (
                <PageContainer className="relative space-y-6 text-white bg-transparent border-0 shadow-none p-0">
                  <div className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
                  <div className="pointer-events-none absolute top-10 -right-10 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
                  <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

                  <div className="relative flex flex-col gap-4 rounded-2xl border border-white/15 bg-slate-900/45 p-6 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold text-white">
                        Welcome back, {student?.name || "Student"}
                      </h1>
                      <p className="mt-1 text-sm text-slate-300">
                        Review your attendance, homework, and announcements in one place.
                      </p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-slate-100">
                      <LayoutDashboard className="h-7 w-7" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-slate-900/60 p-6 text-white shadow-[0_14px_34px_rgba(2,6,23,0.38)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Attendance Percentage</p>
                          <p className="mt-2 text-3xl font-black text-white">{attendancePercent}%</p>
                          <p className="mt-2 text-xs text-emerald-100/80">Based on recorded days</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-100">
                          <CalendarCheck className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/25 via-sky-500/20 to-slate-900/60 p-6 text-white shadow-[0_14px_34px_rgba(2,6,23,0.38)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-100">Homework Pending</p>
                          <p className="mt-2 text-3xl font-black text-white">{homework.length || 0}</p>
                          <p className="mt-2 text-xs text-cyan-100/80">Assignments awaiting</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-100">
                          <BookOpenCheck className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/25 via-purple-500/20 to-slate-900/60 p-6 text-white shadow-[0_14px_34px_rgba(2,6,23,0.38)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-violet-100">Announcements</p>
                          <p className="mt-2 text-3xl font-black text-white">{unreadCount || 0}</p>
                          <p className="mt-2 text-xs text-violet-100/80">Unread notices</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/20 text-violet-100">
                          <Megaphone className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-500/25 via-orange-500/20 to-slate-900/60 p-6 text-white shadow-[0_14px_34px_rgba(2,6,23,0.38)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">Exam Performance</p>
                          <p className="mt-2 text-3xl font-black text-white">
                            {marksPayload.exams.length || marks.length ? "Tracked" : "Pending"}
                          </p>
                          <p className="mt-2 text-xs text-amber-100/80">Exam results</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-100">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-6 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-100">Homework Preview</h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab("homework")}
                          className="text-xs font-semibold text-cyan-200 hover:text-cyan-100"
                        >
                          View all
                        </button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {homework.length === 0 ? (
                          <p className="text-sm text-slate-300">No homework loaded yet.</p>
                        ) : (
                          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="text-sm font-semibold text-white">
                              {homework[0]?.title || homework[0]?.subject || "Homework"}
                            </div>
                            <div className="mt-1 text-xs text-slate-300 line-clamp-2">
                              {homework[0]?.description || "No description"}
                            </div>
                            <div className="mt-2 text-xs text-slate-300">
                              Total pending: <span className="font-semibold text-white">{homework.length}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-6 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]">
                        <h3 className="text-sm font-semibold text-slate-100">Class Teacher</h3>
                        <div className="mt-4 space-y-2 text-sm text-slate-200">
                          <div className="break-words">
                            <span className="font-semibold text-white">Class Teacher:</span> {classTeacherName}
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-white">Contact:</span>
                            {classTeacherName === "Not Assigned" ? (
                              <span className="text-slate-400">Not Available</span>
                            ) : classTeacherPhone ? (
                              isMobileCallPreferred ? (
                                <a
                                  href={`tel:${classTeacherPhone.replace(/\s+/g, "")}`}
                                  className="text-cyan-200 underline font-semibold"
                                >
                                  {classTeacherPhone}
                                </a>
                              ) : (
                                <span className="font-semibold text-white break-words">{classTeacherPhone}</span>
                              )
                            ) : (
                              <span className="text-slate-400">Not Available</span>
                            )}
                          </div>
                          <div className="break-words">
                            <span className="font-semibold text-white">Class:</span> {classSectionText}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-6 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-100">Upcoming Events</h3>
                          <button
                            type="button"
                            onClick={() => setActiveTab("events")}
                            className="text-xs font-semibold text-cyan-200 hover:text-cyan-100"
                          >
                            View all
                          </button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {events.length === 0 ? (
                            <p className="text-sm text-slate-300">No upcoming events loaded yet.</p>
                          ) : (
                            events.slice(0, 3).map((evt) => (
                              <div key={evt._id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                                <div className="text-sm font-semibold text-white">
                                  {evt.eventName || evt.title || "Event"}
                                </div>
                                {evt.eventDate ? (
                                  <div className="mt-1 text-xs text-slate-300">
                                    {new Date(evt.eventDate).toLocaleDateString()}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ===== TIMETABLE PREVIEW CARD ===== */}
                  <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-6 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">Class Timetable</h3>
                        <p className="text-xs text-slate-400 mt-1">View your weekly schedule</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/student/timetable/full")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-200 hover:from-cyan-500/30 hover:to-blue-500/30 text-xs font-semibold transition duration-200"
                      >
                        View Full Timetable
                        <span className="text-lg">→</span>
                      </button>
                    </div>
                    <div className="mt-4 text-xs text-slate-300">
                      <p>📚 Access your complete class schedule with a mobile-friendly layout.</p>
                      <p className="mt-2 text-slate-400">Optimize for landscape view on mobile devices.</p>
                    </div>
                  </div>
                </PageContainer>
              )}


          {/* ===== MARKS ===== */}
            {activeTab === "marks" && (
            <div className="space-y-4">
              <PageIntro
                title="Results & Marks"
                description="Track exam outcomes, grades, and performance updates."
                icon={<BarChart3 className="h-16 w-16" aria-hidden="true" />}
                showTitle={true}
              />
              {marksLoading ? (
                <ListSkeleton rows={3} />
              ) : marksPayload.exams.length === 0 && marks.length === 0 ? (
                <EmptyState
                  title="No marks yet"
                  description="Marks will appear here once your exams are graded."
                />
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
              <PageIntro
                title="Attendance Overview"
                description="Review your daily attendance records and status."
                icon={<CalendarCheck className="h-16 w-16" aria-hidden="true" />}
                showTitle={true}
              />
              {!attendance || attendance.length === 0 ? (
                <EmptyState
                  title="No attendance data"
                  description="Daily attendance will show up here once recorded."
                />
              ) : (
                <AttendanceCalendar attendanceData={attendance} theme="dark" />
              )}
            </div>
          )}

          {/* ===== ANALYTICS ===== */}
            {activeTab === "analytics" && (
            <div className="space-y-4">
              <StudentAnalyticsDashboard
                endpoint={`${API_URL}/api/student/analytics`}
                authToken={token}
                onBack={() => setActiveTab("dashboard")}
              />
            </div>
          )}

          {/* ===== EXAM SYLLABUS ===== */}
            {activeTab === "exam-syllabus" && (
            <div className="space-y-4">
              <PageIntro
                title="Exam Syllabus"
                description="See subject-wise syllabus coverage for upcoming exams."
                icon={<ClipboardList className="h-16 w-16" aria-hidden="true" />}
                showTitle={false}
              />
              <StudentExamSyllabus token={token} selectedExamId={selectedExamId} />
            </div>
          )}

          {/* ===== EXAMS ===== */}
            {activeTab === "exams" && (
            <div className="space-y-4">
              <PageIntro
                title="Exam Timetable"
                description="Stay on top of your upcoming exam schedule."
                icon={<CalendarDays className="h-16 w-16" aria-hidden="true" />}
                showTitle={false}
              />
              <StudentExams token={token} studentId={student?._id} />
            </div>
          )}

          {/* ===== HOMEWORK ===== */}
            {activeTab === "homework" && (
            <div className="space-y-4">
              <PageIntro
                title="Homework"
                description="Stay updated with assignments and due dates."
                icon={<BookOpenCheck className="h-16 w-16" aria-hidden="true" />}
                showTitle={true}
              />
              <DateFilterBar value={homeworkDateFilter} onChange={setHomeworkDateFilter} />
              {homework.length === 0 ? (
                <EmptyState
                  title={hasDateFilter(homeworkDateFilter) ? "No homework in this range" : "No homework today"}
                  description="Your teachers will post assignments here when available."
                />
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
              <PageIntro
                title="School Events"
                description="View upcoming events, holidays, and activities."
                icon={<CalendarCheck className="h-16 w-16" aria-hidden="true" />}
                showTitle={true}
              />
              <DateFilterBar value={eventsDateFilter} onChange={setEventsDateFilter} />
              {events.length === 0 ? (
                <EmptyState
                  title={hasDateFilter(eventsDateFilter) ? "No items in this range" : "No events scheduled"}
                  description="School events will show up here when announced."
                />
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
              <PageIntro
                title="My Profile"
                description="Review your student profile and contact details."
                icon={<UserCircle2 className="h-16 w-16" aria-hidden="true" />}
                showTitle={true}
              />
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
              <PageIntro
                title="Class Timetable"
                description="Your weekly timetable in one place."
                icon={<CalendarDays className="h-16 w-16" aria-hidden="true" />}
                showTitle={true}
              />
              <TimetableGrid token={token} isTeacher={false} readOnly={true} theme="dark" />
            </div>
          )}

          {/* ===== ANNOUNCEMENTS ===== */}
          {activeTab === "announcements" && (
            <div className="space-y-4">
              <PageIntro
                title="Announcements"
                description="Official updates from your school."
                icon={<Megaphone className="h-16 w-16" aria-hidden="true" />}
                showTitle={true}
              />
              <VoiceAnnouncements
                endpoint="/api/student/announcements"
                title="School Announcements"
                icon={<Megaphone className="h-4 w-4" />}
                emptyMessage="No announcements today."
              />
            </div>
          )}

          {/* ===== VOICE MESSAGES ===== */}
            {activeTab === "voice" && (
            <div className="space-y-4">
              <PageIntro
                title="Voice Messages"
                description="Listen to voice updates from your school."
                icon={<Mic2 className="h-16 w-16" aria-hidden="true" />}
                showTitle={true}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceMessageTab("voice")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    voiceMessageTab === "voice"
                      ? "bg-blue-500/20 text-blue-100 border border-blue-400/30"
                      : "bg-white/10 text-slate-300 border border-white/10 hover:bg-white/20"
                  }`}
                >
                  Voice
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceMessageTab("text")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    voiceMessageTab === "text"
                      ? "bg-blue-500/20 text-blue-100 border border-blue-400/30"
                      : "bg-white/10 text-slate-300 border border-white/10 hover:bg-white/20"
                  }`}
                >
                  Text
                </button>
              </div>
              <DateFilterBar value={voiceDateFilter} onChange={setVoiceDateFilter} />
              {voiceMessagesLoading ? (
                <ListSkeleton rows={3} />
              ) : voiceMessages.length === 0 ? (
                <EmptyState
                  tone="dark"
                  title="No voice messages available"
                  description={hasDateFilter(voiceDateFilter) ? "No items for selected date range." : "Your school will send updates here."}
                />
              ) : (
                <div className="space-y-3">
                  {voiceMessages
                    .filter((msg) => (voiceMessageTab === "voice" ? Boolean(msg.audioUrl) : Boolean(msg.textMessage)))
                    .slice(0, voiceMessagesPerPage)
                    .map((msg) => {
                    const typeMeta = getVoiceMessageTypeMeta(msg);
                    return (
                    <ListItemCard
                      key={msg._id}
                      className="border border-white/10 bg-slate-900/60 text-slate-100 shadow-[0_14px_34px_rgba(2,6,23,0.38)] p-5"
                    >
                      <div className="mb-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeMeta.className}`}>
                          {typeMeta.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-semibold text-slate-100 text-sm">
                            From: {msg.senderName || "Teacher"}
                          </div>
                          <div className="text-xs text-slate-400">Teacher</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {msg.audioUrl && !msg.audioMissing && !failedVoiceAudioIds.has(String(msg._id)) ? (
                        <div className="w-full min-w-0 max-w-full">
                        <audio 
                          controls 
                          className="block w-full min-w-0 max-w-full"
                          controlsList="nodownload"
                          preload="metadata"
                          onPlay={enforceSingleAudioPlayback}
                          onError={() => {
                            setFailedVoiceAudioIds((prev) => {
                              const next = new Set(prev);
                              next.add(String(msg._id));
                              return next;
                            });
                          }}
                          onLoadedMetadata={(e) => {
                            console.log(`Audio loaded: ${msg._id}, duration: ${e.target.duration}s`);
                          }}>
                          <source src={`${API_URL}${msg.audioUrl}`} type={getAudioSourceType(msg.audioUrl)} />
                          Your browser does not support the audio element.
                        </audio>
                        </div>
                      ) : null}
                      {(msg.audioMissing || (msg.audioUrl && failedVoiceAudioIds.has(String(msg._id)))) && !msg.textMessage ? (
                        <div className="text-sm text-slate-300 break-words whitespace-normal overflow-hidden [overflow-wrap:anywhere] max-w-full">Audio file is not available for this message.</div>
                      ) : null}
                      {msg.textMessage ? (
                        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 whitespace-pre-wrap break-words overflow-hidden [overflow-wrap:anywhere] max-w-full">
                          {msg.textMessage}
                        </div>
                      ) : null}
                      {!msg.audioUrl && !msg.textMessage ? (
                        <div className="text-sm text-rose-300">Message content is not available</div>
                      ) : null}
                    </ListItemCard>
                    );
                  })}
                  {voiceTotalPages > 1 && (
                    <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => setVoicePage((p) => Math.max(1, p - 1))}
                        disabled={voicePage <= 1}
                        className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {Array.from({ length: voiceTotalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setVoicePage(pageNum)}
                            className={`px-3 py-1 rounded-md text-sm ${
                              pageNum === voicePage ? "bg-blue-500 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setVoicePage((p) => Math.min(voiceTotalPages, p + 1))}
                        disabled={voicePage >= voiceTotalPages}
                        className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
          </Suspense>
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




