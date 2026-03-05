import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import VoiceRecorder from "../components/VoiceRecorder";
import VoiceAnnouncements from "../components/VoiceAnnouncements";
import NotificationBell from "../components/NotificationBell";
import NotificationDropdown from "../components/NotificationDropdown";
import DateFilterBar from "../components/DateFilterBar";
import ExamSyllabusManager from "../components/ExamSyllabusManager";
import ExamTimetableManager from "../components/ExamTimetableManager";
import TeacherExamsMarksV2 from "../components/TeacherExamsMarksV2";
import TeacherSubjectsManager from "../components/TeacherSubjectsManager";
import TimetableGrid from "../components/TimetableGrid";
import TeacherAnalyticsDashboard from "../components/analytics/TeacherAnalyticsDashboard";
import PageContainer from "../components/ui/PageContainer";
import { Card, StatCard } from "../components/ui/Card";
import ListItemCard from "../components/ui/ListItemCard";
import { ListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ToastProvider";
import { createNotification } from "../utils/notificationHelper";
import { sessionTracker } from "../utils/sessionTracker";
import { buildDateFilterQuery, hasDateFilter } from "../utils/dateFilterUtils";
import { FileSpreadsheet, Pencil, Trash2, Copy } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SUBJECTS_CACHE_TTL_MS = 15000;
const MARKS_EXAMS_CACHE_TTL_MS = 15000;
const subjectsCache = new Map();
const marksExamsCache = new Map();

const toRollNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const sortStudentsByRollNo = (a, b) => {
  const aNum = toRollNumber(a?.rollNo);
  const bNum = toRollNumber(b?.rollNo);
  if (aNum !== null && bNum !== null) return aNum - bNum;
  if (aNum !== null) return -1;
  if (bNum !== null) return 1;
  return String(a?.rollNo ?? "").localeCompare(String(b?.rollNo ?? ""), undefined, { numeric: true, sensitivity: "base" });
};

// Excel template download link
const MARKS_TEMPLATE_URL = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQABgAIAAAAIQDfpq/8FwEAABMFAAATAAAAeGwvd29ya3NoZWV0MS54bWykU0tugzAM/RVLT1WVpk0n7bRpN500TetFm0kxIFJiEJsCqvj7HKZp0nQnbMt+fu/t9xvM15sTYGJWCZDCGwRBKB7sRi2QuKVg3DkLUIh6FoxFy0mBrWGeMy0d3V3DEo/KPuUVplSYHvALM4sVlyxE8RN+c8n4QRYsxN0ECkN9G1cY8XvPYv8Rx1QwKBRKhSNhR3TBhMa8oGgWHW4nVIEXNyOKLZdApSb4fYmRupWKFR1N2bFmwSmwddFNCNXZMTGxD5Eev4OhXxw8Cr2/MUmZrfVZApAIqx3T1YKLdNQqwb9K0bwGGFNVTi6l0Y5E7M8KoVVFzn6MZqvJ0p6u0bfqfWoOj+ub3cqCRpP3NPCn6GFvz7v7UqpQvAAY2RnYy8X7V8bzpGfj90Y7+Bl1BLBwgHzXI+MQEAABMFAAAAAAAAAAAAAAAAAAATAAAAeGwvd29ya3NoZWV0MS54bWxQSwECLQAUAAYACAAAACEAB81yPjEBAAATBQATAAAAAAAAAAAAAAAAAAATAAAAeGwvd29ya3NoZWV0MS54bWxQSwUGAAAAAAEAAQA7AAAALgEAAAAA";

export default function TeacherDashboard({ routeTab = "" }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classInfo, setClassInfo] = useState(null);
  const [homework, setHomework] = useState([]);
  const [events, setEvents] = useState([]);
  const [marks, setMarks] = useState({});
  const [percentages, setPercentages] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isFutureDate, setIsFutureDate] = useState(false);
  const [presentCount, setApiPresentCount] = useState(0);
  const [absentCount, setApiAbsentCount] = useState(0);
  const [datePercentage, setDatePercentage] = useState(0);
  const [studentOverallPercentages, setStudentOverallPercentages] = useState({});
  const [lockMessage, setLockMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const teacher = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("teacherData") || "{}");
    } catch {
      return {};
    }
  }, []);
  const className = teacher?.class;
  const section = teacher?.section;
  const token = localStorage.getItem("teacherToken");
  const toast = useToast();

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
  const [availableExams, setAvailableExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [subjectNameInput, setSubjectNameInput] = useState("");
  const [subjectEditingId, setSubjectEditingId] = useState("");
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [examNameInput, setExamNameInput] = useState("");
  const [examSubjectIdInput, setExamSubjectIdInput] = useState("");
  const [examMaxMarksInput, setExamMaxMarksInput] = useState("");
  const [examSaving, setExamSaving] = useState(false);
  const [marksMode, setMarksMode] = useState("single");
  const [multiExamName, setMultiExamName] = useState("");
  const [multiSelectedSubjects, setMultiSelectedSubjects] = useState([]);
  const [multiExcelFile, setMultiExcelFile] = useState(null);
  const [multiMarksData, setMultiMarksData] = useState({});
  const [multiExcelLoading, setMultiExcelLoading] = useState(false);
  const [multiManualLoading, setMultiManualLoading] = useState(false);
  const [singleImportRowsPreview, setSingleImportRowsPreview] = useState([]);
  const [singleImportDetectedType, setSingleImportDetectedType] = useState("");
  const [multiImportRowsPreview, setMultiImportRowsPreview] = useState([]);
  const [multiImportDetectedType, setMultiImportDetectedType] = useState("");
  const [importExampleMode, setImportExampleMode] = useState("table");
  const [allMarks, setAllMarks] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  // ===== EXCEL UPLOAD STATE =====
  const [excelFile, setExcelFile] = useState(null);
  const [excelSubject, setExcelSubject] = useState("");
  const [excelExam, setExcelExam] = useState("");
  const [excelLoading, setExcelLoading] = useState(false);

  // ===== EVENTS FORM STATE =====
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDateVal, setEventDateVal] = useState("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [contentUndoStack, setContentUndoStack] = useState([]);
  const [contentDeletingId, setContentDeletingId] = useState(null);
  const [contentUndoing, setContentUndoing] = useState(false);

  // ===== ANALYTICS STATE =====
  const [marksRefreshTrigger, setMarksRefreshTrigger] = useState(0);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentLoading, setEditStudentLoading] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({
    _id: "",
    parentName: "",
    parentPhone: "",
    email: "",
  });
  const [resetRequests, setResetRequests] = useState([]);
  const [resetRequestsLoading, setResetRequestsLoading] = useState(false);
  const [resetRequestPasswords, setResetRequestPasswords] = useState({});
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // ===== VOICE MESSAGES STATE =====
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [voiceMessagesLoading, setVoiceMessagesLoading] = useState(false);
  const [voiceMessagesLoadingMore, setVoiceMessagesLoadingMore] = useState(false);
  const [voicePage, setVoicePage] = useState(1);
  const [voiceTotalPages, setVoiceTotalPages] = useState(1);
  const [voiceMessageDeletingId, setVoiceMessageDeletingId] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [broadcastToClass, setBroadcastToClass] = useState(true);

  // ===== TIMETABLE STATE =====
  const [timetable, setTimetable] = useState([]);
  const [timetableForm, setTimetableForm] = useState({
    day: "",
    period: "",
    subject: "",
    startTime: "",
    endTime: "",
    timetableId: null,
  });
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [homeworkDateFilter, setHomeworkDateFilter] = useState({ from: "", to: "" });
  const [eventsDateFilter, setEventsDateFilter] = useState({ from: "", to: "" });
  const [voiceDateFilter, setVoiceDateFilter] = useState({ from: "", to: "" });
  const subjectsFetchInFlightRef = useRef(false);
  const examsFetchInFlightRef = useRef(false);
  const lastSubjectsFetchKeyRef = useRef("");
  const lastExamsFetchKeyRef = useRef("");
  const academicsFetchKeyRef = useRef("");

  const selectedExam = availableExams.find((e) => String(e._id) === String(selectedExamId));
  const selectedExamMaxMarks = Number(selectedExam?.maxMarks || 0);

  const handleLogout = async () => {
    try {
      // End session tracking
      await sessionTracker.endSession();

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
      localStorage.removeItem("teacherSchoolId");
      localStorage.removeItem("teacherSchoolName");
      localStorage.removeItem("teacherMustChangePassword");
      navigate("/");
    }
  };

  const submitTeacherChangePassword = async () => {
    if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword) {
      toast.warning("Current and new password are required");
      return;
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      toast.warning("New password and confirm password must match");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: changePasswordForm.currentPassword,
          newPassword: changePasswordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to change password");
        return;
      }
      toast.success("Password changed successfully");
      setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("CHANGE PASSWORD ERROR:", err);
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  // Load schoolId and schoolName from localStorage
  useEffect(() => {
    const storedSchoolId = localStorage.getItem("teacherSchoolId");
    const storedSchoolName = localStorage.getItem("teacherSchoolName");
    if (storedSchoolId) {
      setSchoolId(storedSchoolId);
    }
    if (storedSchoolName) {
      setSchoolName(storedSchoolName);
    }
  }, []);

  useEffect(() => {
    const mustChangePassword = localStorage.getItem("teacherMustChangePassword") === "true";
    if (mustChangePassword) {
      navigate("/teacher/change-password", { replace: true });
    }
  }, [navigate]);

  // Sync active tab when using dedicated route paths.
  useEffect(() => {
    const fromPath =
      location.pathname === "/teacher/subjects"
        ? "subjects"
        : location.pathname === "/teacher/exams"
        ? "exams"
        : location.pathname === "/teacher/marks-entry"
        ? "marks-entry"
        : location.pathname === "/teacher/view-marks"
        ? "view-marks"
        : "";
    const nextTab = routeTab || fromPath;
    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [routeTab, location.pathname, activeTab]);

  // Handle navigation from notification clicks via query params
  useEffect(() => {
    if (
      location.pathname === "/teacher/subjects" ||
      location.pathname === "/teacher/exams" ||
      location.pathname === "/teacher/marks-entry" ||
      location.pathname === "/teacher/view-marks"
    ) return;
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      const sectionMap = {
        academics: "subjects",
        marks: "view-marks",
        exams: "exam-timetable",
      };
      const mapped = sectionMap[sectionParam] || sectionParam;
      if (mapped !== activeTab) {
        console.log("📍 Teacher Dashboard: Navigating to section from query param:", mapped);
        setActiveTab(mapped);
      }
    }
  }, [searchParams, activeTab, location.pathname]);

  // Fetch unread notification count on mount and periodically
  useEffect(() => {
    const controller = new AbortController();
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

  /* ===== FETCH CLASS SUMMARY ===== */
  useEffect(() => {
    const controller = new AbortController();
    const fetchClassSummary = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/class-summary`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setClassInfo(null);
          return;
        }
        const data = await res.json();
        setClassInfo(data);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("CLASS SUMMARY ERROR:", err);
        setClassInfo(null);
      }
    };

    if (token) fetchClassSummary();
    return () => controller.abort();
  }, [token]);

  /* ===== FETCH HOMEWORK ===== */
  useEffect(() => {
    if (activeTab !== "homework") return;
    const controller = new AbortController();

    const fetchHomework = async () => {
      try {
        const query = buildDateFilterQuery(homeworkDateFilter);
        const res = await fetch(`${API_URL}/api/teacher/homework${query ? `?${query}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setHomework([]);
          return;
        }
        const data = await res.json();
        setHomework(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("HOMEWORK FETCH ERROR:", err);
        setHomework([]);
      }
    };

    fetchHomework();
    return () => controller.abort();
  }, [activeTab, token, homeworkDateFilter.from, homeworkDateFilter.to]);

  /* ===== FETCH EVENTS ===== */
  useEffect(() => {
    if (activeTab !== "events") return;
    const controller = new AbortController();

    const fetchEvents = async () => {
      try {
        const query = buildDateFilterQuery(eventsDateFilter);
        const res = await fetch(`${API_URL}/api/teacher/events${query ? `?${query}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("EVENTS FETCH ERROR:", err);
        setEvents([]);
      }
    };

    fetchEvents();
    return () => controller.abort();
  }, [activeTab, token, eventsDateFilter.from, eventsDateFilter.to]);

  const pushUndoContent = (model, data) => {
    if (!data?._id) return;
    setContentUndoStack((prev) => [...prev, { type: "DELETE", model, data, timestamp: Date.now() }]);
  };

  const handleDeleteHomework = async (homeworkItem) => {
    if (!homeworkItem?._id) return;
    const confirmed = window.confirm("Delete this homework?");
    if (!confirmed) return;

    try {
      setContentDeletingId(homeworkItem._id);
      const res = await fetch(`${API_URL}/api/teacher/homework/${homeworkItem._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete homework");

      setHomework((prev) => prev.filter((item) => item._id !== homeworkItem._id));
      pushUndoContent("homework", homeworkItem);
      toast.success("Homework deleted", 10000, {
        actionLabel: "Undo",
        onAction: handleUndoContent,
      });
    } catch (err) {
      console.error("DELETE HOMEWORK ERROR:", err);
      toast.error(err.message || "Failed to delete homework");
    } finally {
      setContentDeletingId(null);
    }
  };

  const handleDeleteEvent = async (eventItem) => {
    if (!eventItem?._id) return;
    const confirmed = window.confirm("Delete this event?");
    if (!confirmed) return;

    try {
      setContentDeletingId(eventItem._id);
      const res = await fetch(`${API_URL}/api/teacher/events/${eventItem._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete event");

      setEvents((prev) => prev.filter((item) => item._id !== eventItem._id));
      pushUndoContent("event", eventItem);
      toast.success("Event deleted", 10000, {
        actionLabel: "Undo",
        onAction: handleUndoContent,
      });
    } catch (err) {
      console.error("DELETE EVENT ERROR:", err);
      toast.error(err.message || "Failed to delete event");
    } finally {
      setContentDeletingId(null);
    }
  };

  const handleUndoContent = async () => {
    if (!contentUndoStack.length) return;
    const lastAction = contentUndoStack[contentUndoStack.length - 1];

    try {
      setContentUndoing(true);
      const res = await fetch(`${API_URL}/api/teacher/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: lastAction.model,
          data: lastAction.data,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore");

      setContentUndoStack((prev) => prev.slice(0, -1));
      if (lastAction.model === "homework") {
        setHomework((prev) => (prev.some((i) => i._id === lastAction.data._id) ? prev : [lastAction.data, ...prev]));
      } else if (lastAction.model === "event") {
        setEvents((prev) => (prev.some((i) => i._id === lastAction.data._id) ? prev : [lastAction.data, ...prev]));
      }
      toast.success("Restored successfully");
    } catch (err) {
      console.error("UNDO CONTENT ERROR:", err);
      toast.error(err.message || "Failed to undo");
    } finally {
      setContentUndoing(false);
    }
  };

  /* ===== FETCH ALL MARKS FOR SUMMARY ===== */
  useEffect(() => {
    if (activeTab !== "summary") return;
    const controller = new AbortController();

    const fetchAllMarks = async () => {
      try {
        const res = await fetch(`${API_URL}/api/teacher/marks`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setAllMarks([]);
          return;
        }
        const data = await res.json();
        setAllMarks(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("MARKS FETCH ERROR:", err);
        setAllMarks([]);
      }
    };

    fetchAllMarks();
    return () => controller.abort();
  }, [activeTab, token]);

  const fetchSubjects = useCallback(async (force = false, signal) => {
    if (!className || !section || !token) return;
    const fetchKey = `${className}::${section}`;
    const cacheKey = `${token}::${fetchKey}`;
    const cached = subjectsCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.timestamp < SUBJECTS_CACHE_TTL_MS) {
      setAvailableSubjects(cached.data);
      lastSubjectsFetchKeyRef.current = fetchKey;
      return;
    }
    // Guard duplicate requests for the same filters.
    if (!force && (subjectsFetchInFlightRef.current || lastSubjectsFetchKeyRef.current === fetchKey)) return;
    subjectsFetchInFlightRef.current = true;
    try {
      setSubjectsLoading(true);
      const url = `${API_URL}/api/teacher/subjects?class=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch subjects");
      const subjects = Array.isArray(data) ? data : data.subjects || [];
      setAvailableSubjects(subjects);
      subjectsCache.set(cacheKey, { data: subjects, timestamp: Date.now() });
      lastSubjectsFetchKeyRef.current = fetchKey;
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("SUBJECTS FETCH ERROR:", err);
      setAvailableSubjects([]);
    } finally {
      subjectsFetchInFlightRef.current = false;
      setSubjectsLoading(false);
    }
  }, [className, section, token]);

  const fetchExamsForMarks = useCallback(async (force = false, signal) => {
    if (!className || !section || !token) return;
    const fetchKey = `${className}::${section}`;
    const cacheKey = `${token}::${fetchKey}`;
    const cached = marksExamsCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.timestamp < MARKS_EXAMS_CACHE_TTL_MS) {
      setAvailableExams(cached.data);
      lastExamsFetchKeyRef.current = fetchKey;
      return;
    }
    // Guard duplicate requests for the same filters.
    if (!force && (examsFetchInFlightRef.current || lastExamsFetchKeyRef.current === fetchKey)) return;
    if (!force && examsFetchInFlightRef.current) return;
    examsFetchInFlightRef.current = true;
    try {
      setExamsLoading(true);
      const url = `${API_URL}/api/teacher/exams?scope=marks&class=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch exams");
      const exams = Array.isArray(data) ? data : [];
      setAvailableExams(exams);
      marksExamsCache.set(cacheKey, { data: exams, timestamp: Date.now() });
      lastExamsFetchKeyRef.current = fetchKey;
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("MARKS EXAMS FETCH ERROR:", err);
      setAvailableExams([]);
    } finally {
      examsFetchInFlightRef.current = false;
      setExamsLoading(false);
    }
  }, [className, section, token]);

  /* ===== FETCH AVAILABLE SUBJECTS / EXAMS ===== */
  useEffect(() => {
    if (!["subjects", "exams", "marks-entry", "view-marks"].includes(activeTab) || !className || !section || !token) return;
    const controller = new AbortController();
    const fetchKey = `${className}::${section}`;
    // Prevent duplicate requests for the same class/section across re-renders.
    if (academicsFetchKeyRef.current === fetchKey) return;
    academicsFetchKeyRef.current = fetchKey;

    console.log("ACADEMICS FETCH TRIGGER:", { activeTab, className, section });
    fetchSubjects(false, controller.signal);
    fetchExamsForMarks(false, controller.signal);
    return () => controller.abort();
  }, [activeTab, className, section, token, fetchSubjects, fetchExamsForMarks]);

  const reloadStudents = async ({ signal } = {}) => {
  try {
    const res = await fetch(
      `${API_URL}/api/teacher/students?className=${className}&section=${section}`,
      { headers: { Authorization: `Bearer ${token}` }, signal }
    );
    const data = await res.json();
    const normalized = (Array.isArray(data) ? data : []).map((s) => ({ ...s, _id: String(s._id) }));
    setStudents(normalized);
    const init = {};
    normalized.forEach((s) => {
      init[s._id] = "PRESENT";
    });
    setAttendance(init);
  } catch (err) {
    if (err?.name === "AbortError") return;
    console.error("STUDENTS FETCH ERROR:", err);
    setStudents([]);
  }
};

const openEditStudentModal = (student) => {
  if (!student?._id) return;
  setEditStudentForm({
    _id: String(student._id),
    parentName: String(student.parentName || ""),
    parentPhone: String(student.parentPhone || student.phone || ""),
    email: String(student.email || ""),
  });
  setShowEditStudentModal(true);
};

const saveEditedStudent = async () => {
  if (!editStudentForm._id) return;
  setEditStudentLoading(true);
  try {
    const payload = {
      parentName: String(editStudentForm.parentName || "").trim(),
      parentPhone: String(editStudentForm.parentPhone || "").trim(),
      email: String(editStudentForm.email || "").trim().toLowerCase(),
    };
    const res = await fetch(`${API_URL}/api/students/${editStudentForm._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to update student");
      return;
    }
    toast.success("Student updated successfully");
    setShowEditStudentModal(false);
    await reloadStudents();
  } catch (err) {
    console.error("EDIT STUDENT ERROR:", err);
    toast.error("Failed to update student");
  } finally {
    setEditStudentLoading(false);
  }
};

const fetchResetRequests = async ({ signal } = {}) => {
  setResetRequestsLoading(true);
  try {
    const res = await fetch(`${API_URL}/api/teacher/password-reset-requests`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to load reset requests");
      setResetRequests([]);
      return;
    }
    setResetRequests(Array.isArray(data?.requests) ? data.requests : []);
  } catch (err) {
    if (err?.name === "AbortError") return;
    console.error("RESET REQUESTS FETCH ERROR:", err);
    setResetRequests([]);
  } finally {
    setResetRequestsLoading(false);
  }
};

const resolveResetRequest = async (request) => {
  const newPassword = String(resetRequestPasswords[request._id] || "");
  if (newPassword.length < 6) {
    toast.warning("New password must be at least 6 characters");
    return;
  }
  try {
    const res = await fetch(`${API_URL}/api/teacher/password-reset-requests/${request._id}/reset`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to reset password");
      return;
    }
    toast.success("Student password reset successfully");
    setResetRequestPasswords((prev) => ({ ...prev, [request._id]: "" }));
    await fetchResetRequests();
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    toast.error("Failed to reset password");
  }
};

/* ===== FETCH STUDENTS ===== */
useEffect(() => {
  const controller = new AbortController();
  if (className && section && token) reloadStudents({ signal: controller.signal });
  return () => controller.abort();
}, [className, section, token]);

useEffect(() => {
  const controller = new AbortController();
  if (activeTab === "password-resets" && token) {
    fetchResetRequests({ signal: controller.signal });
  }
  return () => controller.abort();
}, [activeTab, token]);

  /* ===== FETCH ATTENDANCE STATUS & LOCK STATE ===== */
  useEffect(() => {
    if (!date || !className || !section || !token) {
      console.log("⏭️ [LOCK CHECK] Skipping - missing:", date, className, section);
      return;
    }
    const controller = new AbortController();

    const today = new Date().toISOString().slice(0, 10);
    const isFuture = date > today;

    // Set UI state for future dates
    setIsFutureDate(isFuture);
    if (isFuture) {
      console.warn("⚠️ [LOCK CHECK] Future date selected:", date);
      setLockMessage("🚫 You cannot mark future attendance");
      setLocked(true);
      setIsFinalized(false);
      setApiPresentCount(0);
      setApiAbsentCount(0);
      // Clear attendance state when date is invalid
      const init = {};
      students.forEach((s) => (init[s._id] = "PRESENT"));
      setAttendance(init);
      return;
    }

    // 🔥 Fetch actual lock status from API
    const fetchLockStatus = async () => {
      console.log("📖 [LOCK CHECK] Fetching lock status for", date);
      console.log("📖 [LOCK CHECK] Parameters - className:", className, "section:", section, "token exists:", !!token);
      try {
        const url = `${API_URL}/api/teacher/attendance?date=${date}&className=${encodeURIComponent(className)}&section=${encodeURIComponent(section || "")}`;
        console.log("📖 [LOCK CHECK] URL:", url);
        const res = await fetch(
          url,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
        );

        if (!res.ok) {
          console.warn("⚠️ [LOCK CHECK] API returned error:", res.status);
          setIsFinalized(false);
          setApiPresentCount(0);
          setApiAbsentCount(0);
          setLocked(false);
          setLockMessage("");
          // Initialize empty attendance
          const init = {};
          students.forEach((s) => (init[s._id] = "PRESENT"));
          setAttendance(init);
          return;
        }

        const data = await res.json();
        const finalized = data.isFinalized || false;

        console.log("🔍 [LOCK CHECK] Date:", date, "| Present:", data.presentCount, "| Absent:", data.absentCount, "| Total Students:", data.totalStudents, "| Locked:", finalized);

        setIsFinalized(finalized);
        // ✅ Store date-specific counts from API
        setApiPresentCount(data.presentCount ?? 0);
        setApiAbsentCount(data.absentCount ?? 0);
        
        console.log("📊 [COUNTS] Date:", date, "| Present:", data.presentCount ?? 0, "| Absent:", data.absentCount ?? 0, "| Total Students:", data.totalStudents ?? 0);

        // ✅ Load existing attendance records for this specific date
        if (data.records && Array.isArray(data.records) && data.records.length > 0) {
          console.log("📝 [LOCK CHECK] Loading", data.records.length, "attendance records with per-student overall percentages");
          const attendanceMap = {};
          const overallPercentagesMap = {};
          data.records.forEach((record) => {
            const studentId = record.studentId || record.studentUserId;
            if (studentId) {
              // Only set attendance if student has a status for this date
              if (record.status) {
                attendanceMap[String(studentId)] = record.status;
              }
              // Always set the overall percentage (even if no status for this date)
              overallPercentagesMap[String(studentId)] = record.overallPercentage ?? 0;
              console.log("📊 [STUDENT]", String(studentId).slice(0, 8) + "... is", record.status || "not marked", "on", date, "| Lifetime:", record.overallPercentage + "%");
            }
          });
          setAttendance(attendanceMap);
          setStudentOverallPercentages(overallPercentagesMap);
          console.log("💾 [LOCK CHECK] Attendance map loaded, entries:", Object.keys(attendanceMap).length, "with percentages for:", Object.keys(overallPercentagesMap).length);
        } else {
          // No records for this date - initialize all as PRESENT for fresh marking
          console.log("📝 [LOCK CHECK] No attendance for this date - initializing blank for marking");
          const init = {};
          students.forEach((s) => (init[s._id] = "PRESENT"));
          setAttendance(init);
        }

        // ✅ Update lock message
        if (finalized) {
          console.log("🔒 [LOCK CHECK] Date is FINALIZED - locked");
          setLockMessage("🔒 Attendance locked for this date");
          setLocked(true);
        } else {
          console.log("✏️ [LOCK CHECK] Date is EDITABLE");
          setLockMessage("✏️ Editable - Mark attendance");
          setLocked(false);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("❌ [LOCK CHECK] FETCH ERROR:", err);
        setIsFinalized(false);
        setLocked(false);
        setLockMessage("");
      }
    };

    fetchLockStatus();
    return () => controller.abort();
  }, [date, className, section, token, students]);

  /* ===== FETCH ATTENDANCE SUMMARY ===== */
  useEffect(() => {
    if (!token || !className) return;
    const controller = new AbortController();

    const fetchSummary = async () => {
      try {
        const url = `${API_URL}/api/teacher/attendance/summary?className=${encodeURIComponent(
          className
        )}&section=${encodeURIComponent(section || "")}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
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
        if (err?.name === "AbortError") return;
        console.error("SUMMARY FETCH ERROR:", err);
        setPercentages({});
      }
    };

    fetchSummary();
    return () => controller.abort();
  }, [className, section, token, students.length]);

/* ===== FETCH VOICE MESSAGES ===== */
useEffect(() => {
  if (activeTab !== "voice" || !token) return;
  const controller = new AbortController();

  const fetchVoiceMessages = async () => {
    try {
      setVoiceMessagesLoading(true);
      const query = buildDateFilterQuery(voiceDateFilter);
      const res = await fetch(`${API_URL}/api/teacher/voice-messages/mine?page=1&limit=20${query ? `&${query}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setVoiceMessages(list);
      setVoicePage(Number(data?.page || 1));
      setVoiceTotalPages(Number(data?.totalPages || 1));
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("VOICE MESSAGES FETCH ERROR:", err);
      setVoiceMessages([]);
    } finally {
      setVoiceMessagesLoading(false);
    }
  };

  fetchVoiceMessages();
  return () => controller.abort();
}, [activeTab, token, voiceDateFilter.from, voiceDateFilter.to]);

const loadMoreVoiceMessages = async () => {
  if (voiceMessagesLoadingMore || voicePage >= voiceTotalPages) return;
  try {
    setVoiceMessagesLoadingMore(true);
    const nextPage = voicePage + 1;
    const query = buildDateFilterQuery(voiceDateFilter);
    const res = await fetch(`${API_URL}/api/teacher/voice-messages/mine?page=${nextPage}&limit=20${query ? `&${query}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    setVoiceMessages((prev) => [...prev, ...list]);
    setVoicePage(Number(data?.page || nextPage));
    setVoiceTotalPages(Number(data?.totalPages || voiceTotalPages));
  } catch (err) {
    console.error("VOICE LOAD MORE ERROR:", err);
  } finally {
    setVoiceMessagesLoadingMore(false);
  }
};

const handleDeleteVoiceMessage = async (voiceMessage) => {
  if (!voiceMessage?._id) return;
  const confirmed = window.confirm("Delete this voice message?");
  if (!confirmed) return;

  try {
    setVoiceMessageDeletingId(voiceMessage._id);
    const res = await fetch(`${API_URL}/api/teacher/voice-messages/${voiceMessage._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete voice message");

    setVoiceMessages((prev) => prev.filter((item) => item._id !== voiceMessage._id));
    toast.success("Voice message deleted");
  } catch (err) {
    console.error("DELETE VOICE MESSAGE ERROR:", err);
    toast.error(err.message || "Failed to delete voice message");
  } finally {
    setVoiceMessageDeletingId(null);
  }
};

/* ===== FETCH TIMETABLE ===== */
useEffect(() => {
  if (activeTab !== "timetable" || !token) return;
  const controller = new AbortController();

  const fetchTimetable = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teacher/timetable`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const data = await res.json();
      setTimetable(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("TIMETABLE FETCH ERROR:", err);
      setTimetable([]);
    }
  };

  fetchTimetable();
  return () => controller.abort();
}, [activeTab, token]);

  /* ===== SET ATTENDANCE STATUS ===== */
  const setStatus = (id, status) => {
    if (locked) return;
    setAttendance((p) => ({ ...p, [id]: status }));
  };

  /* ===== SAVE ATTENDANCE ===== */
  const saveAttendance = async () => {
    if (!date) {
      toast.warning("Select a date first");
      return;
    }

    if (locked) {
      toast.error("Cannot save: Attendance is locked for this date");
      return;
    }

    console.log("💾 [SAVE] Saving attendance for", date, "- locked:", locked, "isFinalized:", isFinalized);

    const records = students.map((s) => ({
      studentUserId: s._id,
      status: attendance[s._id],
    }));

    console.log("💾 [SAVE] Request payload:", {
      date,
      className,
      section,
      recordCount: records.length,
      statusBreakdown: {
        PRESENT: records.filter(r => r.status === "PRESENT").length,
        ABSENT: records.filter(r => r.status === "ABSENT").length,
        LEAVE: records.filter(r => r.status === "LEAVE").length,
      }
    });

    try {
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
        console.error("❌ [SAVE] Error:", res.status, data.error);
        if (res.status === 403) {
          toast.error("Cannot save: This attendance is already finalized and locked");
          // ✅ Force re-fetch to ensure lock status is correct
          setTimeout(() => {
            setLocked(true);
            setIsFinalized(true);
            setLockMessage("🔒 Attendance locked for this date");
          }, 100);
        } else {
          toast.error(data.error || "Failed to save attendance");
        }
        return;
      }

      console.log("✅ [SAVE] Saved", data.recordsSaved, "records - Present:", data.presentCount, "Absent:", data.absentCount);
      
      // ✅ Update date-specific counts from API response
      if (data.presentCount !== undefined && data.presentCount !== null) {
        setApiPresentCount(data.presentCount);
        console.log("✅ [SAVE] Updated presentCount to:", data.presentCount);
      }
      if (data.absentCount !== undefined && data.absentCount !== null) {
        setApiAbsentCount(data.absentCount);
        console.log("✅ [SAVE] Updated absentCount to:", data.absentCount);
      }
      toast.success("Attendance draft saved");
    } catch (err) {
      console.error("❌ [SAVE] Exception:", err);
      toast.error("Failed to save attendance");
    }
  };

  /* ===== SUBMIT ATTENDANCE ===== */
  const submitAttendance = async () => {
    if (!date) {
      toast.warning("Please select a date");
      return;
    }

    try {
      console.log("🔒 [SUBMIT] Finalizing attendance for", date);
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
        console.error("❌ [SUBMIT] Error:", data.error);
        toast.error(data.error || "Failed to submit attendance");
        return;
      }

      console.log("✅ [SUBMIT] Successfully finalized. Records finalized:", data.recordsFinalized, "present:", data.presentCount, "absent:", data.absentCount);
      setLocked(true);
      setIsFinalized(true);
      setLockMessage("🔒 Attendance locked for this date");
      
      // ✅ Update date-specific counts from API response
      if (data.presentCount !== undefined && data.presentCount !== null) {
        setApiPresentCount(data.presentCount);
        console.log("✅ [SUBMIT] Updated presentCount to:", data.presentCount);
      }
      if (data.absentCount !== undefined && data.absentCount !== null) {
        setApiAbsentCount(data.absentCount);
        console.log("✅ [SUBMIT] Updated absentCount to:", data.absentCount);
      }
      toast.success("Attendance finalized");
      console.log("📊 [COUNTS] Finalized - Present:", data.presentCount, "Absent:", data.absentCount);
      
      // ✅ Re-fetch lock status to ensure UI is in sync
      setTimeout(() => {
        const fetchToVerify = async () => {
          try {
            const verifyRes = await fetch(
              `${API_URL}/api/teacher/attendance?date=${date}&className=${encodeURIComponent(className)}&section=${encodeURIComponent(section || "")}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              console.log("🔍 [SUBMIT] Verification - isFinalized:", verifyData.isFinalized, "present:", verifyData.presentCount, "absent:", verifyData.absentCount, "percentage:", verifyData.percentageForDate + "%");
              setIsFinalized(verifyData.isFinalized);
              setLocked(verifyData.isFinalized);
              // ✅ Verify counts and percentage from API with null guards
              setApiPresentCount(verifyData.presentCount ?? 0);
              setApiAbsentCount(verifyData.absentCount ?? 0);
              setDatePercentage(verifyData.percentageForDate ?? 0);
              console.log("✅ [SUBMIT] Verified and synced - Present:", verifyData.presentCount ?? 0, "Absent:", verifyData.absentCount ?? 0, "Percentage:", verifyData.percentageForDate ?? 0, "%");
            }
          } catch (err) {
            console.error("❌ [SUBMIT] Verification error:", err);
          }
        };
        fetchToVerify();
      }, 500);
    } catch (e) {
      console.error("❌ [SUBMIT] Exception:", e);
      toast.error("Server not reachable");
    }
  };

  /* ===== SAVE HOMEWORK ===== */
  const saveHomework = async () => {
    if (!hwTitle || !hwSubject || !hwDueDate) {
      toast.warning("Fill all required fields");
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

      toast.success("Homework added successfully");

      // Create notification for homework
      try {
        await createNotification(
          "📝 New Homework: " + hwTitle,
          `${hwTitle} (${hwSubject}) - Due: ${hwDueDate}`,
          "student",
          "homework",
          token,
          null,
          { type: "homework", subject: hwSubject, dueDate: hwDueDate }
        );
        console.log("✅ Notification created for homework");
      } catch (notifErr) {
        console.warn("⚠️ Failed to create notification (non-critical):", notifErr);
      }

      setHwTitle("");
      setHwDesc("");
      setHwSubject("");
      setHwDueDate("");

      const res2 = await fetch(`${API_URL}/api/teacher/homework`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res2.json();
      setHomework(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to add homework");
    } finally {
      setHwLoading(false);
    }
  };

  const saveSubjectItem = async () => {
    if (!subjectNameInput.trim()) {
      toast.warning("Subject name is required");
      return;
    }
    try {
      setSubjectSaving(true);
      const isEdit = Boolean(subjectEditingId);
      const res = await fetch(
        `${API_URL}/api/teacher/subjects${isEdit ? `/${subjectEditingId}` : ""}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: subjectNameInput.trim(),
            class: className,
            section,
          }),
        }
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to save subject");
      toast.success(isEdit ? "Subject updated" : "Subject added");
      setSubjectNameInput("");
      setSubjectEditingId("");
      fetchSubjects(true);
    } catch (err) {
      toast.error(err.message || "Failed to save subject");
    } finally {
      setSubjectSaving(false);
    }
  };

  const editSubjectItem = (subj) => {
    setSubjectEditingId(subj._id);
    setSubjectNameInput(subj.subjectName || subj.name || "");
  };

  const deleteSubjectItem = async (subj) => {
    if (!subj?._id) return;
    if (!window.confirm("Delete this subject?")) return;
    try {
      const res = await fetch(`${API_URL}/api/teacher/subjects/${subj._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to delete subject");
      toast.success("Subject deleted");
      fetchSubjects(true);
      fetchExamsForMarks(true);
    } catch (err) {
      toast.error(err.message || "Failed to delete subject");
    }
  };

  const saveExamDefinition = async () => {
    if (!examNameInput.trim() || !examSubjectIdInput || !Number(examMaxMarksInput)) {
      toast.warning("Exam name, subject and max marks are required");
      return;
    }
    try {
      setExamSaving(true);
      const res = await fetch(`${API_URL}/api/teacher/exams?scope=marks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: examNameInput.trim(),
          subject: examSubjectIdInput,
          class: className,
          section,
          maxMarks: Number(examMaxMarksInput),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to create exam");
      toast.success("Exam created");
      setExamNameInput("");
      setExamSubjectIdInput("");
      setExamMaxMarksInput("");
      fetchExamsForMarks(true);
    } catch (err) {
      toast.error(err.message || "Failed to save exam");
    } finally {
      setExamSaving(false);
    }
  };

  const deleteExamDefinition = async (examRow) => {
    if (!examRow?._id) return;
    if (!window.confirm("Delete this exam?")) return;
    try {
      const res = await fetch(`${API_URL}/api/teacher/exams/${examRow._id}?scope=marks`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to delete exam");
      toast.success("Exam deleted");
      fetchExamsForMarks(true);
    } catch (err) {
      toast.error(err.message || "Failed to delete exam");
    }
  };

  const parseDelimitedText = (text, delimiter) => {
    const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length) return [];
    const headers = lines[0].split(delimiter).map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(delimiter);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = String(cols[idx] ?? "").trim();
      });
      return row;
    });
  };

  const parseImportRows = async (file) => {
    const name = String(file?.name || "").toLowerCase();
    if (name.endsWith(".json")) {
      const text = await file.text();
      return { type: "JSON", rows: JSON.parse(text) };
    }
    if (name.endsWith(".csv")) {
      const text = await file.text();
      return { type: "CSV", rows: parseDelimitedText(text, ",") };
    }
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet);
    return { type: "Excel", rows };
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch (err) {
      toast.error("Copy failed");
    }
  };

  /* ===== SAVE MARKS ===== */
  const saveMarks = async () => {
    if (!selectedExamId || !(selectedExamMaxMarks > 0)) {
      toast.warning("Select exam first");
      return;
    }

    const payload = students.map((s) => ({
      studentId: s._id,
      marksObtained: Number(marksData[s._id] || 0),
    }));

    const invalid = payload.find((r) => Number.isNaN(r.marksObtained) || r.marksObtained < 0 || r.marksObtained > selectedExamMaxMarks);
    if (invalid) {
      toast.error(`Marks must be between 0 and ${selectedExamMaxMarks}`);
      return;
    }

    const res = await fetch(`${API_URL}/api/teacher/marks/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        examId: selectedExamId,
        marks: payload,
      }),
    });

    if (!res.ok) {
      toast.error("Failed to save marks");
      return;
    }

    toast.success("Marks saved successfully");
    setMarksData({});
    // Trigger analytics refresh
    setMarksRefreshTrigger(prev => prev + 1);
  };

  /* ===== EXCEL UPLOAD HANDLERS ===== */
  const handleExcelFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setExcelFile(file);
      setError("");
    }
  };

  const uploadMarksFromExcel = async () => {
    if (!excelFile) {
      toast.warning("Please select an Excel file");
      return;
    }

    if (!excelSubject || !excelExam) {
      toast.warning("Please select subject and exam name");
      return;
    }

    try {
      setExcelLoading(true);
      const selectedExamForImport = availableExams.find(
        (e) =>
          String(e.name || "").trim().toLowerCase() === String(excelExam || "").trim().toLowerCase() &&
          String(e.subjectName || "").trim().toLowerCase() === String(excelSubject || "").trim().toLowerCase()
      );
      if (!selectedExamForImport) {
        throw new Error("Matching exam not found. Create exam with subject and max marks first.");
      }
      const examMaxMarks = Number(selectedExamForImport.maxMarks || 0);
      if (!(examMaxMarks > 0)) throw new Error("Selected exam has invalid max marks");

      const { rows: data, type } = await parseImportRows(excelFile);
      setSingleImportDetectedType(type);
      setSingleImportRowsPreview(Array.isArray(data) ? data.slice(0, 5) : []);

      if (!data || data.length === 0) {
        toast.error("File is empty or invalid");
        return;
      }

      const marksRecords = data
        .map((row) => {
          const marks = Number(row.Marks || row.marks || row.MARKS || 0);
          const studentName = row.StudentName || row.Student || row.studentName || "";
          const studentRollNo = row.RollNo || row.RollNumber || row.rollNo || row["Roll No"] || "";
          
          if (marks < 0 || marks > examMaxMarks || isNaN(marks)) {
            throw new Error(`Invalid marks value: ${marks} in row with student: ${studentName || studentRollNo}`);
          }
          
          return {
            studentName: String(studentName).trim(),
            rollNo: String(studentRollNo).trim(),
            marks,
          };
        });

      // Match students by name or roll number
      const matchedRecords = marksRecords.map((record) => {
        const foundStudent = students.find(
          (s) =>
            s.name.toLowerCase() === record.studentName.toLowerCase() ||
            (record.rollNo && s.rollNo === record.rollNo)
        );

        if (!foundStudent) {
          throw new Error(`Student not found: ${record.studentName || record.rollNo}`);
        }

        return {
          studentId: foundStudent._id,
          marksObtained: record.marks,
        };
      });

      const res = await fetch(`${API_URL}/api/teacher/marks/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          examId: selectedExamForImport._id,
          marks: matchedRecords,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save marks");
      }

      toast.success(`Successfully imported ${matchedRecords.length} student marks from Excel!`);
      setExcelFile(null);
      setExcelSubject("");
      setExcelExam("");
      document.getElementById("excelFileInput").value = "";
      // Trigger analytics refresh
      setMarksRefreshTrigger(prev => prev + 1);
    } catch (err) {
      toast.error(err.message || "Error processing Excel file");
      console.error("Excel upload error:", err);
    } finally {
      setExcelLoading(false);
    }
  };

  const resetMultiMarksState = () => {
    setMultiExamName("");
    setMultiSelectedSubjects([]);
    setMultiExcelFile(null);
    setMultiMarksData({});
    const input = document.getElementById("multiExcelFileInput");
    if (input) input.value = "";
  };

  const handleToggleMultiSubject = (subjectName) => {
    setMultiSelectedSubjects((prev) => {
      if (prev.includes(subjectName)) return prev.filter((s) => s !== subjectName);
      return [...prev, subjectName];
    });
  };

  const handleMultiExcelFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setMultiExcelFile(file);
  };

  const uploadMultiMarksFromExcel = async () => {
    if (!multiExcelFile) {
      toast.warning("Please select an Excel file");
      return;
    }
    if (!multiExamName || multiSelectedSubjects.length === 0) {
      toast.warning("Please enter exam name and select subjects");
      return;
    }

    try {
      setMultiExcelLoading(true);
      const examMap = {};
      multiSelectedSubjects.forEach((subj) => {
        const foundExam = availableExams.find(
          (e) =>
            String(e.name || "").trim().toLowerCase() === String(multiExamName || "").trim().toLowerCase() &&
            String(e.subjectName || "").trim().toLowerCase() === String(subj || "").trim().toLowerCase()
        );
        if (foundExam) examMap[subj] = foundExam;
      });
      const missingExamSubjects = multiSelectedSubjects.filter((subj) => !examMap[subj]);
      if (missingExamSubjects.length > 0) {
        throw new Error(`Missing exam definitions for: ${missingExamSubjects.join(", ")}`);
      }

      const { rows: data, type } = await parseImportRows(multiExcelFile);
      setMultiImportDetectedType(type);
      setMultiImportRowsPreview(Array.isArray(data) ? data.slice(0, 5) : []);

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Excel file is empty or invalid");
      }

      const firstRow = data[0] || {};
      const firstRowKeys = Object.keys(firstRow);
      const missingSubjects = multiSelectedSubjects.filter((subj) => !firstRowKeys.includes(subj));
      if (missingSubjects.length > 0) {
        throw new Error(`Excel columns mismatch. Missing subject columns: ${missingSubjects.join(", ")}`);
      }

      const marks = data.map((row) => {
        const studentName = String(row.StudentName || row.studentName || row.Student || "").trim();
        const rollNo = String(row.RollNo || row.rollNo || row["Roll No"] || row.RollNumber || "").trim();
        const student = students.find(
          (s) =>
            (studentName && String(s.name || "").trim().toLowerCase() === studentName.toLowerCase()) ||
            (rollNo && String(s.rollNo || "").trim() === rollNo)
        );

        if (!student) {
          throw new Error(`Student not found in class list: ${studentName || rollNo || "Unknown"}`);
        }

        const scores = {};
        multiSelectedSubjects.forEach((subj) => {
          const raw = row[subj];
          const value = Number(raw);
          const maxMarksForSubject = Number(examMap[subj]?.maxMarks || 0);
          if (Number.isNaN(value) || value < 0 || value > maxMarksForSubject) {
            throw new Error(`Invalid marks for ${subj} in ${studentName || rollNo}`);
          }
          scores[subj] = value;
        });

        return { studentId: student._id, scores };
      });

      const res = await fetch(`${API_URL}/api/teacher/marks/import-multi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: className,
          section,
          examName: multiExamName,
          subjects: multiSelectedSubjects,
          marks,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to import multi-subject marks");

      toast.success(`Imported ${payload.savedCount || 0} rows${payload.failedCount ? `, ${payload.failedCount} failed` : ""}`);
      resetMultiMarksState();
      setMarksRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("MULTI EXCEL IMPORT ERROR:", err);
      toast.error(err.message || "Failed to import multi-subject marks");
    } finally {
      setMultiExcelLoading(false);
    }
  };

  const saveMultiMarksManual = async () => {
    if (!multiExamName || multiSelectedSubjects.length === 0) {
      toast.warning("Please enter exam name and select subjects");
      return;
    }

    const examMap = {};
    multiSelectedSubjects.forEach((subj) => {
      const foundExam = availableExams.find(
        (e) =>
          String(e.name || "").trim().toLowerCase() === String(multiExamName || "").trim().toLowerCase() &&
          String(e.subjectName || "").trim().toLowerCase() === String(subj || "").trim().toLowerCase()
      );
      if (foundExam) examMap[subj] = foundExam;
    });
    const missingExamSubjects = multiSelectedSubjects.filter((subj) => !examMap[subj]);
    if (missingExamSubjects.length > 0) {
      toast.error(`Missing exam definitions for: ${missingExamSubjects.join(", ")}`);
      return;
    }

    try {
      setMultiManualLoading(true);
      const marks = students.map((s) => {
        const scores = {};
        multiSelectedSubjects.forEach((subj) => {
          const raw = multiMarksData[s._id]?.[subj];
          if (raw !== undefined && raw !== "") {
            const value = Number(raw);
            const maxMarksForSubject = Number(examMap[subj]?.maxMarks || 0);
            if (Number.isNaN(value) || value < 0 || value > maxMarksForSubject) {
              throw new Error(`Invalid marks for ${subj} for ${s.name}. Allowed range: 0 - ${maxMarksForSubject}`);
            }
            scores[subj] = value;
          }
        });
        return { studentId: s._id, scores };
      });

      const res = await fetch(`${API_URL}/api/teacher/marks/import-multi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: className,
          section,
          examName: multiExamName,
          subjects: multiSelectedSubjects,
          marks,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to save multi-subject marks");

      toast.success(`Saved ${payload.savedCount || 0} rows${payload.failedCount ? `, ${payload.failedCount} failed` : ""}`);
      setMultiMarksData({});
      setMarksRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("MULTI MANUAL SAVE ERROR:", err);
      toast.error(err.message || "Failed to save multi-subject marks");
    } finally {
      setMultiManualLoading(false);
    }
  };

  const totalStudents = students.length;
  // ✅ Use API-returned counts (from backend) instead of local state
  // This ensures counts persist across page reloads and date changes
  // presentCount and absentCount are set from API response in lock check effect
  const uiPresentCount = presentCount; // ✅ From API
  const uiAbsentCount = absentCount;   // ✅ From API
  
  console.log("📊 [COUNTS] Display - Total:", totalStudents, "Present (API):", presentCount, "Absent (API):", absentCount);

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "attendance", label: "Attendance" },
    { id: "summary", label: "Students" },
    { id: "analytics", label: "Class Analytics" },
    { id: "marks-entry", label: "Add Marks" },
    { id: "view-marks", label: "Results" },
    { id: "homework", label: "Homework" },
    { id: "announcements", label: "Admin Announcements" },
    { id: "voice", label: "Teacher Voice Messages" },
    { id: "events", label: "Events" },
    { id: "timetable", label: "Timetable" },
    { id: "subjects", label: "Subjects" },
    { id: "exams", label: "Exams" },
    { id: "exam-syllabus", label: "Exam Syllabus" },
    { id: "exam-timetable", label: "Exam Timetable" },
    { id: "password-resets", label: "Password Resets" },
  ];

  return (
    <div
      className={`h-screen ${activeTab === "timetable" ? "overflow-x-hidden" : "overflow-hidden"} flex flex-col lg:flex-row font-sans ${
        activeTab === "analytics"
          ? "bg-gradient-to-br from-[#071228] via-[#0b1c3f] to-[#12275b]"
          : "bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100"
      }`}
    >
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
          {schoolName && <p className="text-xs md:text-sm text-slate-500 mt-1 break-words font-semibold">{schoolName}</p>}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
                if (item.id === "subjects") {
                  navigate("/teacher/subjects");
                  return;
                }
                if (item.id === "exams") {
                  navigate("/teacher/exams");
                  return;
                }
                if (item.id === "marks-entry") {
                  navigate("/teacher/marks-entry");
                  return;
                }
                if (item.id === "view-marks") {
                  navigate("/teacher/view-marks");
                  return;
                }
                navigate(`/teacher/dashboard?section=${item.id}`);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition ${
                activeTab === item.id
                  ? "bg-slate-700 text-cyan-400"
                  : "text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={() => navigate("/teacher/change-password")}
          className="w-full py-3 mb-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition text-sm"
        >
          Change Password
        </button>
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-900 hover:bg-red-800 text-white font-bold rounded-lg transition text-sm"
        >
          Logout
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className={`flex-1 w-full lg:w-auto min-w-0 flex flex-col ${activeTab === "timetable" ? "overflow-x-hidden" : "overflow-hidden"}`}>
        {/* Header */}
        <div
          className={`backdrop-blur-md px-3 md:px-6 py-3 md:py-5 sticky top-0 z-20 flex items-center justify-between gap-3 ${
            activeTab === "analytics"
              ? "bg-slate-950/65 border-b border-slate-700/70"
              : "bg-white/80 border-b border-slate-200"
          }`}
        >
          <div className="flex items-center min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`lg:hidden mr-3 p-2 rounded-lg transition ${activeTab === "analytics" ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
              title="Toggle sidebar"
            >
              <svg className={`w-6 h-6 ${activeTab === "analytics" ? "text-slate-100" : "text-slate-900"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className={`text-xl md:text-3xl font-black break-words ${activeTab === "analytics" ? "text-slate-100" : "text-slate-900"}`}>
                {navItems.find((n) => n.id === activeTab)?.label || "Dashboard"}
              </h1>
              <p className={`text-xs md:text-sm mt-1 break-words ${activeTab === "analytics" ? "text-slate-300" : "text-slate-500"}`}>
                Class {className} • Section {section}
              </p>
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
            token={localStorage.getItem("teacherToken")}
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
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-6 ${
            activeTab === "analytics"
              ? "p-0 bg-gradient-to-br from-[#071228] via-[#0b1c3f] to-[#12275b]"
              : "p-3 md:p-6 lg:p-8 bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100"
          }`}
        >
          <div className={activeTab === "analytics" ? "w-full" : activeTab === "timetable" ? "w-full" : "mx-auto w-full max-w-7xl"}>
          {/* ===== DASHBOARD ===== */}
          {activeTab === "dashboard" && (
            <PageContainer className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Class Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Class" value={classInfo?.className || "-"} icon="CLS" tone="blue" />
                <StatCard label="Section" value={classInfo?.section || "-"} icon="SEC" tone="purple" />
                <StatCard label="Total Students" value={classInfo?.totalStudents || 0} icon="STU" tone="green" />
              </div>

              {/* ===== ATTENDANCE INSIGHTS ===== */}
              <div className="space-y-4 mt-6">
                <h2 className="text-lg font-bold text-slate-900">Student Attendance Insights</h2>
                {students.length === 0 ? (
                  <Card className="text-center text-slate-500 p-6">
                    No students to display
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {/* Attendance Overview Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-xs font-semibold text-green-700 uppercase">Excellent (90%+)</div>
                        <div className="text-2xl font-bold text-green-900 mt-1">
                          {students.filter((s) => (percentages[s._id] || 0) >= 90).length}
                        </div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="text-xs font-semibold text-yellow-700 uppercase">Average (75-89%)</div>
                        <div className="text-2xl font-bold text-yellow-900 mt-1">
                          {students.filter((s) => {
                            const p = percentages[s._id] || 0;
                            return p >= 75 && p < 90;
                          }).length}
                        </div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="text-xs font-semibold text-red-700 uppercase">Needs Attention (&lt;75%)</div>
                        <div className="text-2xl font-bold text-red-900 mt-1">
                          {students.filter((s) => (percentages[s._id] || 0) < 75).length}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Student List Sorted by Attendance */}
                    <div className="saas-card">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm md:text-base">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="px-4 py-3 text-left font-bold text-slate-900">Rank</th>
                              <th className="px-4 py-3 text-left font-bold text-slate-900">Student Name</th>
                              <th className="px-4 py-3 text-left font-bold text-slate-900">Roll No</th>
                              <th className="px-4 py-3 text-right font-bold text-slate-900">Attendance %</th>
                              <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students
                              .map((s) => ({
                                student: s,
                                percentage: percentages[s._id] || 0,
                              }))
                              .sort((a, b) => b.percentage - a.percentage)
                              .map((item, idx) => {
                                const { student, percentage } = item;
                                let statusColor = "bg-green-100 text-green-700";
                                let statusText = "Excellent";
                                if (percentage < 75) {
                                  statusColor = "bg-red-100 text-red-700";
                                  statusText = "Low";
                                } else if (percentage < 90) {
                                  statusColor = "bg-yellow-100 text-yellow-700";
                                  statusText = "Average";
                                }
                                return (
                                  <tr key={student._id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-3 text-slate-700 font-semibold">{idx + 1}</td>
                                    <td className="px-4 py-3 min-w-0 max-w-full font-semibold text-sm md:text-base break-words whitespace-normal text-slate-900">{student.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{student.rollNo}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900">{percentage}%</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                        {statusText}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </PageContainer>
          )}

          {/* ===== STUDENTS SUMMARY (TABLE) ===== */}
          {activeTab === "summary" && (
            <PageContainer className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Students Summary</h2>
                <p className="text-sm text-slate-600 mt-1">Click any student to view detailed analytics & performance insights</p>
              </div>
              {students.length === 0 ? (
                <Card className="text-center text-slate-500 p-6">
                  No students in this class
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="md:hidden space-y-2">
                    {students.map((s) => (
                      <div
                        key={s._id}
                        className="saas-list-card p-3 md:p-4 cursor-pointer min-w-0"
                        onClick={() => navigate(`/teacher/student-analytics/${s._id}`)}
                      >
                        <div className="min-w-0 max-w-full font-semibold text-sm md:text-base break-words whitespace-normal text-slate-900">{s.name}</div>
                        <div className="text-xs md:text-sm text-slate-700 mt-1 break-words">Roll: {s.rollNo || "-"}</div>
                        <div className="text-xs md:text-sm text-slate-700 mt-1 break-words">Parent: {s.parentName || "Not set"}</div>
                        <div className="text-xs md:text-sm text-slate-700 mt-1 break-words break-all">Email: {s.email || "-"}</div>
                        <div className="text-xs md:text-sm text-slate-700 mt-1 break-words">
                          Phone: {" "}
                          {s.parentPhone || s.phone ? (
                            <a
                              href={`tel:${String(s.parentPhone || s.phone).replace(/\s+/g, "")}`}
                              className="text-blue-600 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {s.parentPhone || s.phone}
                            </a>
                          ) : (
                            "Not set"
                          )}
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditStudentModal(s);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 transition"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto saas-card">
                    <table className="w-full text-sm md:text-base">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Roll</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Name</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Parent</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Phone</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Email</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr
                            key={s._id}
                            className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition"
                            onClick={() => navigate(`/teacher/student-analytics/${s._id}`)}
                          >
                            <td className="px-4 py-3 text-slate-700">{s.rollNo}</td>
                            <td className="px-4 py-3 min-w-0 max-w-full font-semibold text-sm md:text-base break-words whitespace-normal text-slate-900">{s.name}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs md:text-sm">{s.parentName || "Not set"}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs md:text-sm">
                              {s.parentPhone || s.phone ? (
                                <a
                                  href={`tel:${String(s.parentPhone || s.phone).replace(/\s+/g, "")}`}
                                  className="text-blue-600 underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {s.parentPhone || s.phone}
                                </a>
                              ) : (
                                "Not set"
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-700 text-xs md:text-sm break-all">{s.email || "-"}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditStudentModal(s);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 transition"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </PageContainer>
          )}

                    {/* ===== ANALYTICS ===== */}
          {activeTab === "analytics" && (
            <TeacherAnalyticsDashboard
              refreshKey={marksRefreshTrigger}
              onGoToStudents={() => navigate("/teacher/dashboard?section=summary")}
            />
          )}

          {/* ===== SUBJECTS ===== */}
          {activeTab === "subjects" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Subjects</h2>
              <TeacherSubjectsManager
                token={token}
                className={className}
                section={section}
                onSubjectsChanged={() => {
                  fetchSubjects(true);
                  fetchExamsForMarks(true);
                }}
              />
            </div>
          )}

          {/* ===== EXAMS ===== */}
          {activeTab === "exams" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Exams</h2>
              <TeacherExamsMarksV2
                token={token}
                className={className}
                section={section}
                students={students}
                mode="manage"
              />
            </div>
          )}

          {/* ===== MARKS ENTRY ===== */}
          {activeTab === "marks-entry" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Enter / Import Marks</h2>
              <TeacherExamsMarksV2
                token={token}
                className={className}
                section={section}
                students={students}
                mode="entry"
              />
            </div>
          )}

          {/* ===== VIEW MARKS ===== */}
          {activeTab === "view-marks" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">View Marks (Read Only)</h2>
              <TeacherExamsMarksV2
                token={token}
                className={className}
                section={section}
                students={students}
                mode="view"
              />
            </div>
          )}

          {/* ===== HOMEWORK ===== */}
          {activeTab === "homework" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Homework / Assignments</h2>
              <DateFilterBar value={homeworkDateFilter} onChange={setHomeworkDateFilter} />

              <div className="saas-card p-3 md:p-6 space-y-4">
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

              <div className="flex items-center justify-between mt-6">
                <h3 className="font-bold text-slate-900">Your Homework</h3>
                {contentUndoStack.length > 0 && (
                  <button
                    onClick={handleUndoContent}
                    disabled={contentUndoing}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition disabled:opacity-50"
                  >
                    {contentUndoing ? "Undoing..." : `Undo (${contentUndoStack.length})`}
                  </button>
                )}
              </div>
              {homework.length === 0 ? (
                <div className="saas-card p-3 md:p-5 text-center text-slate-500">
                  {hasDateFilter(homeworkDateFilter) ? "No items for selected date range" : "No homework yet"}
                </div>
              ) : (
                <div className="space-y-3">
                  {homework.map((hw) => (
                    <ListItemCard key={hw._id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-bold text-slate-900 text-sm">{hw.title}</div>
                        <button
                          onClick={() => handleDeleteHomework(hw)}
                          disabled={contentDeletingId === hw._id}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {contentDeletingId === hw._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      <div className="text-xs md:text-sm text-slate-500 mt-1 break-words">{hw.subject} • Due: {hw.dueDate}</div>
                      {hw.description && <div className="text-sm text-slate-600 mt-2">{hw.description}</div>}
                    </ListItemCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== EVENTS ===== */}
          {activeTab === "events" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Events & Calendar</h2>
                {contentUndoStack.length > 0 && (
                  <button
                    onClick={handleUndoContent}
                    disabled={contentUndoing}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition disabled:opacity-50"
                  >
                    {contentUndoing ? "Undoing..." : `Undo (${contentUndoStack.length})`}
                  </button>
                )}
              </div>
              <DateFilterBar value={eventsDateFilter} onChange={setEventsDateFilter} />

              <div className="saas-card p-3 md:p-6 space-y-4">
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
                      toast.warning("Event name and date are required");
                      return;
                    }
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
                        toast.error(err.error || "Failed to create event");
                        setEventLoading(false);
                        return;
                      }
                      const data = await res.json();
                      setEvents((prev) => [data.event, ...prev]);
                      setEventName("");
                      setEventDesc("");
                      setEventDateVal("");
                      setIsHoliday(false);
                      toast.success("Event created successfully");
                    } catch (err) {
                      console.error("CREATE EVENT ERROR:", err);
                      toast.error("Failed to create event");
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
                <div className="saas-card p-3 md:p-5 text-center text-slate-500">
                  {hasDateFilter(eventsDateFilter) ? "No items for selected date range" : "No events scheduled"}
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <ListItemCard key={event._id}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{event.eventName}</div>
                          {event.isHoliday && <span className="text-xs text-red-600 font-semibold">Holiday</span>}
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          disabled={contentDeletingId === event._id}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {contentDeletingId === event._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      <div className="text-xs md:text-sm text-slate-500 mt-1 break-words">📅 {new Date(event.eventDate).toLocaleDateString()}</div>
                      {event.description && <div className="text-sm text-slate-600 mt-2">{event.description}</div>}
                    </ListItemCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== ATTENDANCE ===== */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              <div className="saas-list-card p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Attendance</h2>
                    <p className="text-xs text-slate-500">Mark students — Present / Absent</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {lockMessage && (
                      <span className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
                        isFinalized ? 'bg-red-100 text-red-700' : isFutureDate ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {lockMessage}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4 text-center">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Total Students</div>
                    <div className="text-2xl font-black text-blue-600">{students.length ?? 0}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Present</div>
                    <div className="text-2xl font-black text-green-600">{uiPresentCount ?? 0}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Absent</div>
                    <div className="text-2xl font-black text-red-600">{uiAbsentCount ?? 0}</div>
                  </div>
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

              <div className="space-y-3">
                {students.map((s) => (
                  <div key={s._id} className="saas-list-card p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                    <div className="min-w-0 max-w-full">
                      <div className="font-semibold text-sm md:text-base break-words whitespace-normal max-w-full text-slate-900">{s.name}</div>
                      <div className="text-xs md:text-sm text-slate-500 mt-1 break-words">Roll {s.rollNo || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-50 rounded-md text-sm font-bold text-slate-600">
                        {studentOverallPercentages[s._id] !== undefined && studentOverallPercentages[s._id] !== null ? `${studentOverallPercentages[s._id]}%` : "—"}
                      </span>
                      <button
                        onClick={() => setStatus(s._id, "PRESENT")}
                        disabled={locked || !date}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                          locked || !date ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          attendance[s._id] === "PRESENT"
                            ? "bg-green-600 text-white"
                            : "border border-slate-200 bg-white text-slate-800 hover:border-green-300"
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => setStatus(s._id, "ABSENT")}
                        disabled={locked || !date}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                          locked || !date ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          attendance[s._id] === "ABSENT"
                            ? "bg-red-600 text-white"
                            : "border border-slate-200 bg-white text-slate-800 hover:border-red-300"
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-3 md:p-4 flex gap-3 sm:relative sm:mt-4 sm:bg-transparent sm:border-0">
                <button
                  onClick={saveAttendance}
                  disabled={locked || !date}
                  className="flex-1 py-3 bg-slate-100 text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={submitAttendance}
                  disabled={locked || !date}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* ===== TIMETABLE ===== */}
          {activeTab === "timetable" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Class Timetable</h2>
              <TimetableGrid token={token} isTeacher={true} readOnly={false} />
            </div>
          )}

          {/* ===== ANNOUNCEMENTS ===== */}
          {activeTab === "announcements" && (
            <VoiceAnnouncements 
              endpoint="/api/teacher/announcements"
              title="📢 School Announcements"
              emptyMessage="No announcements yet"
            />
          )}

          {/* ===== VOICE MESSAGES ===== */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Voice Messages</h2>
              <DateFilterBar value={voiceDateFilter} onChange={setVoiceDateFilter} />

              {/* Send Voice Message Form */}
              <div className="saas-card p-3 md:p-6 space-y-4">
                <h3 className="font-bold text-slate-900">📢 Send Voice Message to Students</h3>
                
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <input
                    type="checkbox"
                    id="broadcastToClass"
                    checked={broadcastToClass}
                    onChange={(e) => {
                      setBroadcastToClass(e.target.checked);
                      setSelectedStudents([]);
                    }}
                    className="w-4 h-4"
                  />
                  <label htmlFor="broadcastToClass" className="font-semibold">Broadcast to entire class</label>
                </div>

                {!broadcastToClass && students.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 font-semibold">Select Students:</p>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {students.map((student) => (
                        <label key={student._id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents([...selectedStudents, student._id]);
                              } else {
                                setSelectedStudents(selectedStudents.filter((id) => id !== student._id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">{student.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <VoiceRecorder
                  onRecordingComplete={async (audioBlob) => {
                    if (!broadcastToClass && selectedStudents.length === 0) {
                      toast.warning("Please select at least one student");
                      return;
                    }
                    
                    // Log blob size before upload
                    console.log(`✅ TEACHER VOICE: Audio blob ready, size: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
                    
                    if (audioBlob.size === 0) {
                      toast.error("Audio recording is empty. Please record again.");
                      return;
                    }
                    
                    setVoiceLoading(true);
                    try {
                      const formData = new FormData();
                      formData.append("audio", audioBlob, "recording.webm");
                      if (broadcastToClass) {
                        formData.append("broadcastToClass", "true");
                      } else {
                        formData.append("targetStudentIds", JSON.stringify(selectedStudents));
                      }

                      console.log("📤 TEACHER VOICE: Uploading to /api/teacher/voice-broadcast");
                      const res = await fetch(`${API_URL}/api/teacher/voice-broadcast`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData,
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        console.error("❌ UPLOAD FAILED:", data);
                        toast.error(data.error || "Failed to send voice message");
                        return;
                      }
                      console.log(`✅ UPLOAD SUCCESS: Audio URL = ${data.audioUrl}`);
                      toast.success(`Voice message sent to ${data.broadcastTo} student(s)`);
                      setAudioFile(null);
                      setSelectedStudents([]);
                    } catch (err) {
                      console.error("❌ VOICE BROADCAST ERROR:", err);
                      toast.error("Failed to send voice message");
                    } finally {
                      setVoiceLoading(false);
                    }
                  }}
                  onError={(errMsg) => {
                    toast.error(errMsg);
                  }}
                />
              </div>

              {/* Received Messages */}
              <div>
                <h3 className="font-bold text-slate-900 mb-4">📨 Your Voice Messages History</h3>
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
                            <div className="font-semibold text-slate-900 text-sm">From: {msg.senderName}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(msg.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteVoiceMessage(msg)}
                            disabled={voiceMessageDeletingId === msg._id}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title="Delete voice message"
                          >
                            {voiceMessageDeletingId === msg._id ? "Deleting..." : "🗑️ Delete"}
                          </button>
                        </div>
                        <audio controls className="w-full max-w-md">
                          <source src={`${API_URL}${msg.audioUrl}`} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
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
            </div>
          )}

          {/* ===== PASSWORD RESETS ===== */}
          {activeTab === "password-resets" && (
            <div className="space-y-5">
              <div className="saas-card p-3 md:p-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Change Your Password</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="password"
                    value={changePasswordForm.currentPassword}
                    onChange={(e) => setChangePasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Current Password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    value={changePasswordForm.newPassword}
                    onChange={(e) => setChangePasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="New Password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    value={changePasswordForm.confirmPassword}
                    onChange={(e) => setChangePasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm Password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={submitTeacherChangePassword}
                  disabled={changingPassword}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>

              <div className="saas-card p-3 md:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Student Forgot Password Requests</h2>
                  <button
                    onClick={fetchResetRequests}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                  >
                    Refresh
                  </button>
                </div>

                {resetRequestsLoading ? (
                  <ListSkeleton rows={2} />
                ) : resetRequests.length === 0 ? (
                  <div className="text-sm text-slate-600">No pending requests.</div>
                ) : (
                  <div className="space-y-3">
                    {resetRequests.map((reqItem) => (
                      <ListItemCard key={reqItem._id}>
                        <div className="text-sm font-semibold text-slate-900 break-words">
                          {reqItem.studentName || "Student"} | Roll: {reqItem.rollNo || "-"} | Class {reqItem.class}-{reqItem.section}
                        </div>
                        <div className="text-xs text-slate-600 mt-1 break-all">{reqItem.email || "-"}</div>
                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                          <input
                            type="password"
                            value={resetRequestPasswords[reqItem._id] || ""}
                            onChange={(e) =>
                              setResetRequestPasswords((prev) => ({
                                ...prev,
                                [reqItem._id]: e.target.value,
                              }))
                            }
                            placeholder="Set new password"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => resolveResetRequest(reqItem)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition"
                          >
                            Reset Password
                          </button>
                        </div>
                      </ListItemCard>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== EXAM SYLLABUS ===== */}
          {activeTab === "exam-syllabus" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Exam Syllabus Management</h2>
              <ExamSyllabusManager token={token} teacher={teacher} />
            </div>
          )}

          {/* ===== EXAM TIMETABLE ===== */}
          {activeTab === "exam-timetable" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Exam Timetable</h2>
              <ExamTimetableManager token={token} teacher={teacher} />
            </div>
          )}
          </div>
        </div>

        {showEditStudentModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-xl overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Edit Student Contact</h3>
                <button
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={editStudentForm.parentName}
                  onChange={(e) => setEditStudentForm((prev) => ({ ...prev, parentName: e.target.value }))}
                  placeholder="Parent Name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={editStudentForm.parentPhone}
                  onChange={(e) => setEditStudentForm((prev) => ({ ...prev, parentPhone: e.target.value }))}
                  placeholder="Parent Phone"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={editStudentForm.email}
                  onChange={(e) => setEditStudentForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowEditStudentModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedStudent}
                  disabled={editStudentLoading}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {editStudentLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}












