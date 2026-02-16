import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import VoiceRecorder from "../components/VoiceRecorder";
import VoiceAnnouncements from "../components/VoiceAnnouncements";
import NotificationBell from "../components/NotificationBell";
import NotificationDropdown from "../components/NotificationDropdown";
import SyllabusManager from "../components/SyllabusManager";
import ExamSyllabusManager from "../components/ExamSyllabusManager";
import ExamTimetableManager from "../components/ExamTimetableManager";
import TimetableGrid from "../components/TimetableGrid";
import { useToast } from "../components/ToastProvider";
import { createNotification } from "../utils/notificationHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function TeacherDashboard() {
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

  const teacher = JSON.parse(localStorage.getItem("teacherData") || "{}");
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

  // ===== ANALYTICS STATE =====
  const [analyticsData, setAnalyticsData] = useState({
    marksData: [],
    attendanceData: [],
    classAverage: 0,
    topper: null,
    lowScorer: null,
    averageAttendance: 0,
  });
  const [marksRefreshTrigger, setMarksRefreshTrigger] = useState(0);

  // ===== VOICE MESSAGES STATE =====
  const [voiceMessages, setVoiceMessages] = useState([]);
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
      localStorage.removeItem("teacherSchoolId");
      localStorage.removeItem("teacherSchoolName");
      navigate("/");
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

  // Handle navigation from notification clicks via query params
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      console.log("📍 Teacher Dashboard: Navigating to section from query param:", sectionParam);
      setActiveTab(sectionParam);
    }
  }, [searchParams]);

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
      return;
    }

    const fetchSubjects = async () => {
      try {
        const url = `${API_URL}/api/teacher/subjects?class=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        
        const data = await res.json();
        
        if (res.ok) {
          const subjects = Array.isArray(data) ? data : (data.subjects || []);
          setAvailableSubjects(subjects);
        } else {
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
        // ✅ Initialize attendance map ONLY for new students
        const init = {};
        normalized.forEach((s) => (init[s._id] = "PRESENT"));
        setAttendance(init);
        // ⚠️ DON'T reset locked here - let the lock check effect handle it
        // This prevents overriding finalized status
      })
      .catch((err) => {
        console.error("STUDENTS FETCH ERROR:", err);
        setStudents([]);
      });
  }, [className, section, token]);

  /* ===== FETCH ATTENDANCE STATUS & LOCK STATE ===== */
  useEffect(() => {
    if (!date || !className || !section || !token) {
      console.log("⏭️ [LOCK CHECK] Skipping - missing:", date, className, section);
      return;
    }

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
          { headers: { Authorization: `Bearer ${token}` } }
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
        console.error("❌ [LOCK CHECK] FETCH ERROR:", err);
        setIsFinalized(false);
        setLocked(false);
        setLockMessage("");
      }
    };

    fetchLockStatus();
  }, [date, className, section, token, students]);

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

  /* ===== FETCH ANALYTICS DATA ===== */
  useEffect(() => {
    if (activeTab !== "analytics" || !students.length) return;

    const fetchAnalytics = async () => {
      try {
        // Fetch marks data
        const marksRes = await fetch(`${API_URL}/api/teacher/marks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const marksArray = marksRes.ok ? await marksRes.json() : [];
        console.log("📊 MARKS FETCHED:", marksArray.length, marksArray.slice(0, 2));

        // Fetch attendance summary
        const attRes = await fetch(
          `${API_URL}/api/teacher/attendance/summary?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section || "")}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const attData = attRes.ok ? await attRes.json() : [];

        // Process marks data
        const studentMarksMap = {};
        const subjectsSet = new Set();
        
        marksArray.forEach((m) => {
          const studentId = String(m.studentId); // Convert to string for consistent key
          if (!studentMarksMap[studentId]) {
            studentMarksMap[studentId] = { name: "", marks: [] };
          }
          studentMarksMap[studentId].marks.push({ subject: m.subject, marks: m.marks, exam: m.exam });
          subjectsSet.add(m.subject);
        });

        // Combine with student names
        const enrichedMarks = students.map((s) => ({
          name: s.name,
          id: s._id,
          ...(studentMarksMap[String(s._id)]?.marks || []).reduce((acc, m) => {
            acc[`${m.subject} (${m.exam})`] = m.marks;
            return acc;
          }, {}),
        }));

        // Calculate statistics
        const allMarksValues = marksArray.filter(m => m.marks).map(m => m.marks);
        const classAverage = allMarksValues.length > 0 ? Math.round(allMarksValues.reduce((a, b) => a + b, 0) / allMarksValues.length) : 0;
        const topper = marksArray.length > 0 ? marksArray.reduce((prev, current) => {
          const matched = students.find(s => String(s._id) === String(current.studentId));
          const currentWithName = { ...current, name: matched?.name || "Unknown" };
          if (!prev) return currentWithName;
          return current.marks > prev.marks ? currentWithName : prev;
        }, null) : null;
        console.log("🏆 TOPPER:", topper);
        const lowScorer = marksArray.length > 0 ? marksArray.reduce((prev, current) => {
          const matched = students.find(s => String(s._id) === String(current.studentId));
          const currentWithName = { ...current, name: matched?.name || "Unknown" };
          if (!prev) return currentWithName;
          return current.marks < prev.marks ? currentWithName : prev;
        }, null) : null;
        console.log("📉 LOW SCORER:", lowScorer);

        // Process attendance data
        const attPercentages = {};
        attData.forEach((d) => {
          const id = String(d.studentId ?? d._id ?? "");
          const total = Number(d.total) || 0;
          const present = Number(d.present) || 0;
          attPercentages[id] = total > 0 ? Math.round((present / total) * 100) : 0;
        });

        const attendanceData = students.map((s) => ({
          name: s.name,
          attendance: attPercentages[s._id] || 0,
        }));

        const averageAttendance = attendanceData.length > 0 
          ? Math.round(attendanceData.reduce((sum, d) => sum + d.attendance, 0) / attendanceData.length)
          : 0;

        setAnalyticsData({
          marksData: enrichedMarks,
          attendanceData,
          classAverage,
          topper,
          lowScorer,
          averageAttendance,
        });
      } catch (err) {
        console.error("ANALYTICS FETCH ERROR:", err);
        setAnalyticsData({
          marksData: [],
          attendanceData: [],
          classAverage: 0,
          topper: null,
          lowScorer: null,
          averageAttendance: 0,
        });
      }
    };

    fetchAnalytics();
}, [activeTab, students, token, className, section, marksRefreshTrigger]);

/* ===== FETCH VOICE MESSAGES ===== */
useEffect(() => {
  if (activeTab !== "voice" || !token) return;

  const fetchVoiceMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teacher/voice-messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVoiceMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("VOICE MESSAGES FETCH ERROR:", err);
      setVoiceMessages([]);
    }
  };

  fetchVoiceMessages();
}, [activeTab, token]);

/* ===== FETCH TIMETABLE ===== */
useEffect(() => {
  if (activeTab !== "timetable" || !token) return;

  const fetchTimetable = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teacher/timetable`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTimetable(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("TIMETABLE FETCH ERROR:", err);
      setTimetable([]);
    }
  };

  fetchTimetable();
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

  /* ===== SAVE MARKS ===== */
  const saveMarks = async () => {
    if (!subject || !exam) {
      toast.warning("Enter subject and exam");
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
      toast.error("Failed to save marks");
      return;
    }

    toast.success("Marks saved successfully");
    setSubject("");
    setExam("");
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
      
      // Read Excel file
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        toast.error("Excel file is empty or invalid");
        return;
      }

      // Parse the data - expecting columns: StudentName, RollNo, or StudentId, Marks
      const marksRecords = data
        .map((row) => {
          // Try different possible column names
          const marks = Number(row.Marks || row.marks || row.MARKS || 0);
          const studentName = row.StudentName || row.Student || row.studentName || "";
          const studentRollNo = row.RollNo || row.RollNumber || row.rollNo || row["Roll No"] || "";
          
          if (marks < 0 || marks > 100 || isNaN(marks)) {
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
          marks: record.marks,
        };
      });

      // Send to backend
      const res = await fetch(`${API_URL}/api/teacher/marks/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          className,
          section,
          subject: excelSubject,
          exam: excelExam,
          records: matchedRecords,
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

  const totalStudents = students.length;
  // ✅ Use API-returned counts (from backend) instead of local state
  // This ensures counts persist across page reloads and date changes
  // presentCount and absentCount are set from API response in lock check effect
  const uiPresentCount = presentCount; // ✅ From API
  const uiAbsentCount = absentCount;   // ✅ From API
  
  console.log("📊 [COUNTS] Display - Total:", totalStudents, "Present (API):", presentCount, "Absent (API):", absentCount);

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "analytics", label: "Analytics" },
    { id: "academics", label: "Academics" },
    { id: "summary", label: "Students" },
    { id: "timetable", label: "Timetable" },
    { id: "syllabus", label: "Syllabus" },
    { id: "exam-syllabus", label: "Exam Syllabus" },
    { id: "exams", label: "Exam Timetable" },
    { id: "homework", label: "Homework" },
    { id: "announcements", label: "Announcements" },
    { id: "voice", label: "Voice Messages" },
    { id: "events", label: "Events" },
    { id: "attendance", label: "Attendance" },
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
          {schoolName && <p className="text-xs text-slate-500 mt-1 font-semibold">{schoolName}</p>}
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
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
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
              <p className="text-xs md:text-sm text-slate-500 mt-1">Class {className} • Section {section}</p>
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
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

              {/* ===== ATTENDANCE INSIGHTS ===== */}
              <div className="space-y-4 mt-6">
                <h2 className="text-lg font-bold text-slate-900">Student Attendance Insights</h2>
                {students.length === 0 ? (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                    No students to display
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Attendance Overview Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
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
                                    <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
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

          {/* ===== ANALYTICS ===== */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Student Analytics & Insights</h2>

              {/* KPI Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Class Average</div>
                  <div className="text-3xl font-black text-blue-900 mt-2">{analyticsData.classAverage}%</div>
                  <p className="text-xs text-blue-700 mt-2">Overall class performance</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wide">Avg Attendance</div>
                  <div className="text-3xl font-black text-green-900 mt-2">{analyticsData.averageAttendance}%</div>
                  <p className="text-xs text-green-700 mt-2">Class attendance rate</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
                  <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Total Students</div>
                  <div className="text-3xl font-black text-purple-900 mt-2">{students.length}</div>
                  <p className="text-xs text-purple-700 mt-2">Class strength</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
                  <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Performance</div>
                  <div className="text-3xl font-black text-orange-900 mt-2">{analyticsData.classAverage >= 75 ? "Good" : analyticsData.classAverage >= 60 ? "Okay" : "Need Help"}</div>
                  <p className="text-xs text-orange-700 mt-2">Class status</p>
                </div>
              </div>

              {/* Top & Low Scorers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">🏆 Topper Student</h3>
                  {analyticsData.topper ? (
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                      <div className="font-bold text-yellow-900">{analyticsData.topper.name}</div>
                      <div className="text-sm text-yellow-700 mt-1">Subject: {analyticsData.topper.subject}</div>
                      <div className="text-lg font-black text-yellow-900 mt-2">{analyticsData.topper.marks}/100</div>
                      <div className="text-xs text-yellow-600 mt-1">{analyticsData.topper.exam}</div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No marks data yet</p>
                  )}
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">📉 Needs Improvement</h3>
                  {analyticsData.lowScorer ? (
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                      <div className="font-bold text-red-900">{analyticsData.lowScorer.name}</div>
                      <div className="text-sm text-red-700 mt-1">Subject: {analyticsData.lowScorer.subject}</div>
                      <div className="text-lg font-black text-red-900 mt-2">{analyticsData.lowScorer.marks}/100</div>
                      <div className="text-xs text-red-600 mt-1">Recommendation: Extra coaching needed in {analyticsData.lowScorer.subject}</div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No marks data yet</p>
                  )}
                </div>
              </div>

              {/* Charts Section */}
              {analyticsData.attendanceData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Attendance Bar Chart */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">📊 Attendance by Student</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Bar dataKey="attendance" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Attendance Distribution Pie Chart */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">🔄 Attendance Distribution</h3>
                    {(() => {
                      const highAtt = analyticsData.attendanceData.filter(d => d.attendance >= 80).length;
                      const medAtt = analyticsData.attendanceData.filter(d => d.attendance >= 60 && d.attendance < 80).length;
                      const lowAtt = analyticsData.attendanceData.filter(d => d.attendance < 60).length;
                      const pieData = [
                        { name: "Excellent (≥80%)", value: highAtt, color: "#10b981" },
                        { name: "Good (60-79%)", value: medAtt, color: "#f59e0b" },
                        { name: "Low (<60%)", value: lowAtt, color: "#ef4444" },
                      ];
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Remarks & Insights */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4">💡 Insights & Remarks</h3>
                <div className="space-y-3">
                  {analyticsData.classAverage >= 80 && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-sm text-green-700">
                      ✅ <strong>Excellent Performance:</strong> Your class is performing exceptionally well with an average of {analyticsData.classAverage}%. Keep up the great teaching!
                    </div>
                  )}
                  {analyticsData.classAverage >= 60 && analyticsData.classAverage < 80 && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-700">
                      ⚠️ <strong>Good Performance:</strong> Class average is {analyticsData.classAverage}%. Focus on helping weaker students improve.
                    </div>
                  )}
                  {analyticsData.classAverage < 60 && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-sm text-red-700">
                      ❌ <strong>Needs Attention:</strong> Class average is only {analyticsData.classAverage}%. Consider reviewing teaching methods and providing additional support.
                    </div>
                  )}

                  {analyticsData.averageAttendance >= 90 && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-700">
                      ✅ <strong>Excellent Attendance:</strong> Average attendance is {analyticsData.averageAttendance}%. This is excellent!
                    </div>
                  )}
                  {analyticsData.averageAttendance < 75 && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-sm text-orange-700">
                      ⚠️ <strong>Low Attendance Alert:</strong> Average attendance is {analyticsData.averageAttendance}%. Follow up with absent students.
                    </div>
                  )}

                  <div className="bg-slate-100 border border-slate-300 p-4 rounded-lg text-sm text-slate-700">
                    📈 <strong>Action Items:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Review {analyticsData.lowScorer ? `${analyticsData.lowScorer.name}'s` : "weaker"} performance and provide extra support</li>
                      <li>Maintain regular follow-ups with low-attendance students</li>
                      <li>Celebrate achievements of high-performing students</li>
                      <li>Schedule individual meetings with struggling students</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== ACADEMICS ===== */}
          {activeTab === "academics" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Academics / Exams</h2>

              {/* ===== EXCEL IMPORT SECTION ===== */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="font-bold text-slate-900">Import Marks from Excel</h3>
                    <p className="text-xs text-slate-600 mt-1">Upload an Excel file with student marks</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-slate-600 mb-3">
                    <strong>Excel Format:</strong> Your file should have columns: <code className="bg-slate-100 px-2 py-1 rounded">StudentName</code>, <code className="bg-slate-100 px-2 py-1 rounded">Marks</code> (optional: <code className="bg-slate-100 px-2 py-1 rounded">RollNo</code>)
                  </p>
                  <a
                    href="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQABgAIAAAAIQDfpq/8FwEAABMFAAATAAAAeGwvd29ya3NoZWV0MS54bWykU0tugzAM/RVLT1WVpk0n7bRpN500TetFm0kxIFJiEJsCqvj7HKZp0nQnbMt+fu/t9xvM15sTYGJWCZDCGwRBKB7sRi2QuKVg3DkLUIh6FoxFy0mBrWGeMy0d3V3DEo/KPuUVplSYHvALM4sVlyxE8RN+c8n4QRYsxN0ECkN9G1cY8XvPYv8Rx1QwKBRKhSNhR3TBhMa8oGgWHW4nVIEXNyOKLZdApSb4fYmRupWKFR1N2bFmwSmwddFNCNXZMTGxD5Eev4OhXxw8Cr2/MUmZrfVZApAIqx3T1YKLdNQqwb9K0bwGGFNVTi6l0Y5E7M8KoVVFzn6MZqvJ0p6u0bfqfWoOj+ub3cqCRpP3NPCn6GFvz7v7UqpQvAAY2RnYy8X7V8bzpGfj90Y7+Bl1BLBwgHzXI+MQEAABMFAAAAAAAAAAAAAAAAAAATAAAAeGwvd29ya3NoZWV0MS54bWxQSwECLQAUAAYACAAAACEAB81yPjEBAAATBQATAAAAAAAAAAAAAAAAAAATAAAAeGwvd29ya3NoZWV0MS54bWxQSwUGAAAAAAEAAQA7AAAALgEAAAAA"
                    download="marks_template.xlsx"
                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold underline"
                  >
                    📥 Download Template
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <select
                      value={excelSubject}
                      onChange={(e) => setExcelSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Subject</option>
                      {availableSubjects.length > 0 ? (
                        availableSubjects.map((subj) => (
                          <option key={subj._id} value={subj.subjectName}>
                            {subj.subjectName}
                          </option>
                        ))
                      ) : (
                        <option disabled>No subjects</option>
                      )}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Exam Name (e.g., Midterm, Final)"
                    value={excelExam}
                    onChange={(e) => setExcelExam(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="relative cursor-pointer">
                    <input
                      id="excelFileInput"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileSelect}
                      className="hidden"
                    />
                    <span className="block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition text-center">
                      {excelFile ? "✓ " + excelFile.name.slice(0, 20) : "Choose File"}
                    </span>
                  </label>
                </div>

                <button
                  onClick={uploadMarksFromExcel}
                  disabled={excelLoading || !excelFile}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {excelLoading ? "⏳ Importing..." : "📤 Import Marks"}
                </button>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Or Enter Marks Manually</h3>
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
                        value={marksData[s._id] || ""}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setMarksData((prev) => ({ ...prev, [s._id]: value }));
                        }}
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

                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
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
                  <div key={s._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
                      <div className="text-xs text-slate-500 mt-1">Roll {s.rollNo || "—"}</div>
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

              <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200 p-4 flex gap-3 sm:relative sm:mt-4 sm:bg-transparent sm:border-0">
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
              endpoint="/api/teacher/voice-announces"
              title="📢 School Announcements"
              emptyMessage="No announcements yet"
            />
          )}

          {/* ===== VOICE MESSAGES ===== */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Voice Messages</h2>

              {/* Send Voice Message Form */}
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
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
                <h3 className="font-bold text-slate-900 mb-4">📨 Messages from Admin</h3>
                {voiceMessages.length === 0 ? (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                    No voice messages from admin
                  </div>
                ) : (
                  <div className="space-y-3">
                    {voiceMessages.map((msg) => (
                      <div key={msg._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">From: {msg.senderName}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(msg.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <audio controls className="w-full max-w-md">
                          <source src={`${API_URL}${msg.audioUrl}`} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== SYLLABUS ===== */}
          {activeTab === "syllabus" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Syllabus Management</h2>
              <SyllabusManager token={token} teacher={teacher} />
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
          {activeTab === "exams" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Exam Timetable</h2>
              <ExamTimetableManager token={token} teacher={teacher} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
