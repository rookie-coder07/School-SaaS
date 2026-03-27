import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import NotificationBell from "../components/NotificationBell";
import ConfirmationModal from "../components/ConfirmationModal";
import PageContainer from "../components/ui/PageContainer";
import AnalyticsCard from "../components/ui/AnalyticsCard";
import DashboardHero from "../components/ui/DashboardHero";
import PageIntro from "../components/ui/PageIntro";
import ListItemCard from "../components/ui/ListItemCard";
import { ListSkeleton, TableSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ToastProvider";
import { createNotification } from "../utils/notificationHelper";
import { sessionTracker } from "../utils/sessionTracker";
import VoiceRecorder from "../components/VoiceRecorder";
import VoiceAnnouncements from "../components/VoiceAnnouncements";
import NotificationDropdown from "../components/NotificationDropdown";
import UserTrackingDashboard from "../components/UserTrackingDashboard";
import AdminAnalyticsDashboard from "../components/AdminAnalyticsDashboard";
import AdminAuditLogsDashboard from "../components/AdminAuditLogsDashboard";
import useUnreadCount from "../hooks/useUnreadCount";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mic2,
  Megaphone,
  Radar,
  Search,
  Settings,
  Shuffle,
  UploadCloud,
  UserCircle2,
  Users,
  UserCheck,
  UsersRound,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const isConstrainedDevice = () => {
  if (typeof navigator === "undefined") return false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const slowNetwork = ["slow-2g", "2g", "3g"].includes(String(connection?.effectiveType || "").toLowerCase());
  const lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
  return saveData || slowNetwork || lowMemory;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, _setError] = useState("");
  const [message, _setMessage] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [dashboardSummary, setDashboardSummary] = useState({
    studentCount: 0,
    teacherCount: 0,
    classCount: 0,
    sectionCount: 0,
    classSectionCount: 0,
    attendanceRate: null,
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // Dashboard data
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [teacherTotalPages, setTeacherTotalPages] = useState(1);
  const [studentTotalCount, setStudentTotalCount] = useState(0);
  const [teacherTotalCount, setTeacherTotalCount] = useState(0);
  const [metaClasses, setMetaClasses] = useState([]);
  const [metaSections, setMetaSections] = useState([]);

  // Filters for Students and Teachers
  const [studentFilterClass, setStudentFilterClass] = useState("");
  const [studentFilterSection, setStudentFilterSection] = useState("");
  const [teacherFilterClass, setTeacherFilterClass] = useState("");
  const [teacherFilterSection, setTeacherFilterSection] = useState("");

  // File upload
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Bulk Upload - New
  const [uploadMode, setUploadMode] = useState("student");
  const [uploadedStudents, setUploadedStudents] = useState([]);
  const [uploadedTeachers, setUploadedTeachers] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState(null);
  const [selectedForAssignment, setSelectedForAssignment] = useState({});

  // Preview Import Mode State
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Teacher Preview State
  const [showTeacherPreview, setShowTeacherPreview] = useState(false);
  const [teacherPreviewData, setTeacherPreviewData] = useState(null);
  const [teacherPreviewId, setTeacherPreviewId] = useState(null);
  const [isTeacherPreviewLoading, setIsTeacherPreviewLoading] = useState(false);
  const [teacherImportResult, setTeacherImportResult] = useState(null);

  // Manual add
  const [modeAdd, setModeAdd] = useState("student");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    className: "",
    section: "",
    rollNo: "",
    subject: "",
    phone: "",
    password: "",
    parentName: "",
    parentPhone: "",
  });

  // Subjects
  const [subjects, setSubjects] = useState([]);
  const [subjectFilters, setSubjectFilters] = useState({
    className: "",
    section: "",
  });
  const [subjectForm, setSubjectForm] = useState({
    className: "",
    section: "",
    name: "",
  });
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectDeletingId, setSubjectDeletingId] = useState(null);
  const [showSubjectEditModal, setShowSubjectEditModal] = useState(false);
  const [subjectEditForm, setSubjectEditForm] = useState({
    _id: "",
    className: "",
    section: "",
    name: "",
  });
  
  // Multi-select delete
  const [selectedStudents, setSelectedStudents] = useState({});
  const [selectedTeachers, setSelectedTeachers] = useState({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentLoading, setEditStudentLoading] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({
    _id: "",
    name: "",
    rollNo: "",
    className: "",
    section: "",
    parentName: "",
    parentPhone: "",
    email: "",
    status: "Active",
  });
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [teacherResetRequests, setTeacherResetRequests] = useState([]);
  const [teacherResetRequestsLoading, setTeacherResetRequestsLoading] = useState(false);
  const [teacherResetPasswords, setTeacherResetPasswords] = useState({});
  const [resettingTeacherRequestId, setResettingTeacherRequestId] = useState("");
  const [showTeacherDeleteConfirm, setShowTeacherDeleteConfirm] = useState(false);
  const [showTeacherBulkEditModal, setShowTeacherBulkEditModal] = useState(false);
  const [studentActionLoading, setStudentActionLoading] = useState({
    deleting: false,
    editing: false,
    undoing: false,
  });
  const [teacherActionLoading, setTeacherActionLoading] = useState({
    deleting: false,
    editing: false,
  });
  const [bulkEditForm, setBulkEditForm] = useState({
    class: "",
    section: "",
    assignedTeacher: "",
  });
  const [teacherBulkEditForm, setTeacherBulkEditForm] = useState({
    assignedClass: "",
    assignedSection: "",
    subjects: "",
    phone: "",
  });
  const [teacherSelectionMode, setTeacherSelectionMode] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const teacherLongPressTimerRef = useRef(null);
  const teacherLongPressTriggeredRef = useRef(false);
  const undoTimersRef = useRef(new Map());

  // Voice Broadcast
  const [, setAudioFile] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceAnnouncementTitle, setVoiceAnnouncementTitle] = useState("");
  const [voiceAnnouncementsRefresh, setVoiceAnnouncementsRefresh] = useState(0);
  const [voiceBroadcastTarget, setVoiceBroadcastTarget] = useState("all"); // "all", "teachers", "students"
  
  // Teacher Migration
  const [selectedTeacherForMigration, setSelectedTeacherForMigration] = useState(null);
  const [migrationToClass, setMigrationToClass] = useState("");
  const [migrationToSection, setMigrationToSection] = useState("");
  const [migratingTeacherId, setMigratingTeacherId] = useState(null);
  const [studentMigrationForm, setStudentMigrationForm] = useState({
    fromClass: "",
    fromSection: "",
    toClass: "",
    toSection: "",
    migrateAll: true,
    selectedStudentIds: [],
  });
  const [migratingStudents, setMigratingStudents] = useState(false);
  
  const admin = JSON.parse(localStorage.getItem("adminData") || "{}");
  const [adminProfileDraft, setAdminProfileDraft] = useState(() => ({
    name: admin?.name || localStorage.getItem("adminName") || "",
    email: admin?.email || localStorage.getItem("adminEmail") || "",
    phone: admin?.phone || admin?.mobile || localStorage.getItem("adminPhone") || "",
    schoolName: localStorage.getItem("adminSchoolName") || admin?.schoolName || "",
  }));
  const adminEmployeeId = admin?.employeeId || admin?.employeeID || admin?.employeeCode || "Not set";
  const adminJoinDate = admin?.joinDate || admin?.joiningDate || admin?.createdAt || "";
  const adminAddress = admin?.address || admin?.officeAddress || admin?.location || "Not set";
  const token = localStorage.getItem("adminToken");
  const { unreadCount, refreshUnreadCount } = useUnreadCount(token, {
    pollIntervalMs: isConstrainedDevice() ? 60000 : 30000,
  });

  // Logout
  const handleLogout = async () => {
    try {
      // End session tracking
      await sessionTracker.endSession();

      const token = localStorage.getItem("adminToken");
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminSchoolId");
      localStorage.removeItem("adminSchoolName");
      navigate("/");
    }
  };

  // Load schoolId and schoolName from localStorage
  useEffect(() => {
    const storedSchoolId = localStorage.getItem("adminSchoolId");
    const storedSchoolName = localStorage.getItem("adminSchoolName");
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

  useEffect(() => {
    const tabsNeedingMeta = new Set(["students", "teachers", "add-user", "bulk-upload", "subjects", "migrate-student", "migrate-teacher", "user-management"]);
    if (!tabsNeedingMeta.has(activeTab)) return undefined;
    const controller = new AbortController();

    const fetchClassSectionMeta = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/meta/classes-sections`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          setMetaClasses([]);
          setMetaSections([]);
          return;
        }
        const data = await res.json();
        setMetaClasses(Array.isArray(data?.classes) ? data.classes : []);
        setMetaSections(Array.isArray(data?.sections) ? data.sections : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("META FETCH ERROR:", err);
        setMetaClasses([]);
        setMetaSections([]);
      }
    };

    if (token) fetchClassSectionMeta();
    return () => controller.abort();
  }, [token, activeTab]);

  useEffect(() => {
    if (activeTab !== "dashboard" || !token) return undefined;
    const controller = new AbortController();
    const fetchDashboardSummary = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setDashboardSummary({
          studentCount: Number(data?.studentCount || 0),
          teacherCount: Number(data?.teacherCount || 0),
          classCount: Number(data?.classCount || 0),
          sectionCount: Number(data?.sectionCount || 0),
          classSectionCount: Number(data?.classSectionCount || 0),
          attendanceRate:
            data?.attendanceRate ??
            data?.attendance ??
            data?.attendancePercentage ??
            data?.schoolAttendance ??
            null,
        });
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("DASHBOARD SUMMARY FETCH ERROR:", err);
      }
    };
    fetchDashboardSummary();
    return () => controller.abort();
  }, [activeTab, token]);

  // Handle navigation from notification clicks via query params
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      console.log("📍 Admin Dashboard: Navigating to section from query param:", sectionParam);
      setActiveTab(sectionParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== "students") {
      setSelectionMode(false);
      setSelectedStudents({});
      setShowBulkEditModal(false);
      setShowDeleteConfirm(false);
    }
    if (activeTab !== "teachers") {
      setTeacherSelectionMode(false);
      setSelectedTeachers({});
      setShowTeacherBulkEditModal(false);
      setShowTeacherDeleteConfirm(false);
    }
  }, [activeTab]);

  useEffect(() => {
    // Prevent stuck global overlays when navigating between sections.
    setShowNotifications(false);
    setShowSubjectEditModal(false);
    setShowChangePasswordModal(false);
    setShowBulkEditModal(false);
    setShowEditStudentModal(false);
    setShowTeacherBulkEditModal(false);
    setShowDeleteConfirm(false);
    setShowTeacherDeleteConfirm(false);
  }, [activeTab]);

  const selectedStudentIds = useMemo(
    () => Object.keys(selectedStudents).filter((id) => selectedStudents[id]),
    [selectedStudents]
  );
  const selectedStudentCount = selectedStudentIds.length;
  const selectedTeacherRowIds = useMemo(
    () => Object.keys(selectedTeachers).filter((id) => selectedTeachers[id]),
    [selectedTeachers]
  );
  const selectedTeacherCount = selectedTeacherRowIds.length;
  const isTouchDevice = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches,
    []
  );

  const clearStudentSelection = () => {
    setSelectedStudents({});
    setSelectionMode(false);
  };

  const submitAdminChangePassword = async () => {
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
      setShowChangePasswordModal(false);
      setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("CHANGE PASSWORD ERROR:", err);
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const fetchTeacherResetRequests = useCallback(async ({ signal } = {}) => {
    setTeacherResetRequestsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/password-reset-requests?type=teacher`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to load reset requests");
        setTeacherResetRequests([]);
        return;
      }
      setTeacherResetRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("TEACHER RESET REQUESTS FETCH ERROR:", err);
      toast.error("Failed to load reset requests");
      setTeacherResetRequests([]);
    } finally {
      setTeacherResetRequestsLoading(false);
    }
  }, [token, toast]);

  const resolveTeacherResetRequest = async (request) => {
    const newPassword = String(teacherResetPasswords[request._id] || "");
    if (newPassword.length < 6) {
      toast.warning("New password must be at least 6 characters");
      return;
    }

    setResettingTeacherRequestId(String(request._id));
    try {
      const res = await fetch(`${API_URL}/api/admin/reset-teacher-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: request._id,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to reset teacher password");
        return;
      }
      toast.success("Teacher password reset successfully");
      setTeacherResetPasswords((prev) => ({ ...prev, [request._id]: "" }));
      await fetchTeacherResetRequests();
    } catch (err) {
      console.error("RESET TEACHER PASSWORD ERROR:", err);
      toast.error("Failed to reset teacher password");
    } finally {
      setResettingTeacherRequestId("");
    }
  };

  const pushUndoAction = (action) => {
    setUndoStack((prev) => [...prev, action]);
    if (action.type === "DELETE") {
      const timerId = setTimeout(() => {
        setUndoStack((prev) => prev.filter((entry) => entry.id !== action.id));
        undoTimersRef.current.delete(action.id);
      }, 10000);
      undoTimersRef.current.set(action.id, timerId);
    }
  };

  const clearUndoActionTimer = (actionId) => {
    const timerId = undoTimersRef.current.get(actionId);
    if (timerId) {
      clearTimeout(timerId);
      undoTimersRef.current.delete(actionId);
    }
  };

  useEffect(() => {
    const undoTimers = undoTimersRef.current;
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (teacherLongPressTimerRef.current) clearTimeout(teacherLongPressTimerRef.current);
      undoTimers.forEach((timerId) => clearTimeout(timerId));
      undoTimers.clear();
    };
  }, []);

  // Toggle student selection
  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // Toggle teacher selection
  const toggleTeacherSelection = (teacherId) => {
    setSelectedTeachers((prev) => ({
      ...prev,
      [teacherId]: !prev[teacherId],
    }));
  };

  const handleRowLongPressStart = (studentId) => {
    if (!window.matchMedia?.("(pointer: coarse)")?.matches) return;
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setSelectionMode(true);
      setSelectedStudents((prev) => ({
        ...prev,
        [studentId]: true,
      }));
    }, 450);
  };

  const handleRowLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleStudentRowClick = (studentId) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (selectionMode || !isTouchDevice) {
      setSelectionMode(true);
      toggleStudentSelection(studentId);
    }
  };

  // Select all students
  const selectAllStudents = () => {
    const filteredIds = getFilteredStudents().map((s) => s._id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedStudents[id]);

    if (allSelected) {
      clearStudentSelection();
      return;
    }

    const newSelection = {};
    filteredIds.forEach((id) => {
      newSelection[id] = true;
    });
    setSelectedStudents((prev) => ({
      ...prev,
      ...newSelection,
    }));
    setSelectionMode(true);
  };

  // Select all teachers
  const selectAllTeachers = () => {
    const filteredIds = getFilteredTeachers().map((t) => t._id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedTeachers[id]);
    if (allSelected) {
      setSelectedTeachers({});
      setTeacherSelectionMode(false);
      return;
    }

    const newSelection = {};
    filteredIds.forEach((id) => {
      newSelection[id] = true;
    });
    setSelectedTeachers((prev) => ({
      ...prev,
      ...newSelection,
    }));
    setTeacherSelectionMode(true);
  };

  const clearTeacherSelection = () => {
    setSelectedTeachers({});
    setTeacherSelectionMode(false);
  };

  const handleTeacherRowLongPressStart = (teacherId) => {
    if (!isTouchDevice) return;
    teacherLongPressTriggeredRef.current = false;
    if (teacherLongPressTimerRef.current) clearTimeout(teacherLongPressTimerRef.current);
    teacherLongPressTimerRef.current = setTimeout(() => {
      teacherLongPressTriggeredRef.current = true;
      setTeacherSelectionMode(true);
      setSelectedTeachers((prev) => ({
        ...prev,
        [teacherId]: true,
      }));
    }, 450);
  };

  const handleTeacherRowLongPressEnd = () => {
    if (teacherLongPressTimerRef.current) {
      clearTimeout(teacherLongPressTimerRef.current);
      teacherLongPressTimerRef.current = null;
    }
  };

  const handleTeacherRowClick = (teacherId) => {
    if (teacherLongPressTriggeredRef.current) {
      teacherLongPressTriggeredRef.current = false;
      return;
    }
    if (teacherSelectionMode || !isTouchDevice) {
      setTeacherSelectionMode(true);
      toggleTeacherSelection(teacherId);
    }
  };

  const openBulkEdit = () => {
    if (selectedStudentCount === 0) {
      toast.warning("Select at least one student");
      return;
    }

    if (selectedStudentCount === 1) {
      const current = students.find((student) => student._id === selectedStudentIds[0]);
      setBulkEditForm({
        class: current?.class || current?.className || "",
        section: current?.section || "",
        assignedTeacher: current?.assignedTeacher || "",
      });
    } else {
      setBulkEditForm({ class: "", section: "", assignedTeacher: "" });
    }

    setShowBulkEditModal(true);
  };

  const submitBulkEdit = async () => {
    const updates = {};
    if (bulkEditForm.class.trim()) updates.class = bulkEditForm.class.trim();
    if (bulkEditForm.section.trim()) updates.section = bulkEditForm.section.trim();
    if (bulkEditForm.assignedTeacher.trim()) updates.assignedTeacher = bulkEditForm.assignedTeacher.trim();

    if (!Object.keys(updates).length) {
      toast.warning("Provide at least one field to update");
      return;
    }

    const snapshot = students.filter((student) => selectedStudentIds.includes(student._id));

    setStudentActionLoading((prev) => ({ ...prev, editing: true }));
    try {
      const res = await fetch(`${API_URL}/api/admin/students/bulk-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentIds: selectedStudentIds, updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk update failed");
        return;
      }

      pushUndoAction({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "UPDATE",
        entity: "student",
        before: snapshot,
        after: updates,
        timestamp: Date.now(),
      });

      setStudents((prev) =>
        prev.map((student) =>
          selectedStudentIds.includes(student._id)
            ? {
                ...student,
                ...(updates.class ? { class: updates.class, className: updates.class } : {}),
                ...(updates.section ? { section: updates.section } : {}),
                ...(updates.assignedTeacher ? { assignedTeacher: updates.assignedTeacher } : {}),
              }
            : student
        )
      );
      toast.success(`${data.affectedCount || selectedStudentIds.length} students updated`);
      setShowBulkEditModal(false);
      clearStudentSelection();
    } catch (err) {
      console.error("BULK EDIT ERROR:", err);
      toast.error("Failed to update students");
    } finally {
      setStudentActionLoading((prev) => ({ ...prev, editing: false }));
    }
  };

  const deleteSelectedStudents = async () => {
    if (selectedStudentIds.length === 0) {
      toast.warning("Please select at least one student to delete");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSelectedStudents = async () => {
    const snapshot = students.filter((student) => selectedStudentIds.includes(student._id));

    setStudentActionLoading((prev) => ({ ...prev, deleting: true }));
    try {
      const res = await fetch(`${API_URL}/api/admin/students/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk delete failed");
        return;
      }

      const action = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "DELETE",
        entity: "student",
        items: snapshot,
        timestamp: Date.now(),
      };
      pushUndoAction(action);

      setStudents((prev) => prev.filter((student) => !selectedStudentIds.includes(student._id)));
      const deletedCount = data.affectedCount || selectedStudentIds.length;
      toast.success(`${deletedCount} students deleted`, 10000, {
        actionLabel: "Undo",
        onAction: () => handleUndo(true),
      });

      clearStudentSelection();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("BULK DELETE ERROR:", err);
      toast.error("Failed to delete students");
    } finally {
      setStudentActionLoading((prev) => ({ ...prev, deleting: false }));
    }
  };

  const handleUndo = async (fromToast = false) => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];

    setStudentActionLoading((prev) => ({ ...prev, undoing: true }));
    try {
      if (lastAction.type === "DELETE" && lastAction.entity === "student") {
        const res = await fetch(`${API_URL}/api/admin/students/bulk-restore`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ students: lastAction.items }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Undo delete failed");
          return;
        }

        setStudents((prev) => {
          const existing = new Set(prev.map((student) => student._id));
          const restored = lastAction.items.filter((student) => !existing.has(student._id));
          return [...restored, ...prev];
        });
      } else if (lastAction.type === "DELETE" && lastAction.entity === "teacher") {
        const res = await fetch(`${API_URL}/api/admin/teachers/bulk-restore`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items: lastAction.items }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Undo delete failed");
          return;
        }

        setTeachers((prev) => {
          const existing = new Set(prev.map((teacher) => teacher._id));
          const restored = lastAction.items.filter((teacher) => !existing.has(teacher._id));
          return [...restored, ...prev];
        });
      } else if (lastAction.type === "UPDATE" && lastAction.entity === "student") {
        const res = await fetch(`${API_URL}/api/admin/students/bulk-revert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ students: lastAction.before }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Undo update failed");
          return;
        }

        const previousMap = new Map(lastAction.before.map((student) => [student._id, student]));
        setStudents((prev) =>
          prev.map((student) => (previousMap.has(student._id) ? previousMap.get(student._id) : student))
        );
      } else if (lastAction.type === "UPDATE" && lastAction.entity === "teacher") {
        const res = await fetch(`${API_URL}/api/admin/teachers/bulk-revert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items: lastAction.before }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Undo update failed");
          return;
        }

        const previousMap = new Map(lastAction.before.map((teacher) => [teacher._id, teacher]));
        setTeachers((prev) =>
          prev.map((teacher) => (previousMap.has(teacher._id) ? previousMap.get(teacher._id) : teacher))
        );
      }

      clearUndoActionTimer(lastAction.id);
      setUndoStack((prev) => prev.slice(0, -1));
      if (!fromToast) toast.success("Undo successful");
    } catch (err) {
      console.error("UNDO ERROR:", err);
      toast.error("Undo failed");
    } finally {
      setStudentActionLoading((prev) => ({ ...prev, undoing: false }));
    }
  };

  // Delete selected teachers
  const openTeacherBulkEdit = () => {
    if (selectedTeacherCount === 0) {
      toast.warning("Select at least one teacher");
      return;
    }

    if (selectedTeacherCount === 1) {
      const current = teachers.find((teacher) => teacher._id === selectedTeacherRowIds[0]);
      setTeacherBulkEditForm({
        assignedClass: current?.class || "",
        assignedSection: current?.section || "",
        subjects: Array.isArray(current?.subject) ? current.subject.join(", ") : current?.subject || "",
        phone: String(current?.phone || current?.mobile || current?.contact || current?.contactNumber || "").trim(),
      });
    } else {
      setTeacherBulkEditForm({ assignedClass: "", assignedSection: "", subjects: "", phone: "" });
    }
    setShowTeacherBulkEditModal(true);
  };

  const submitTeacherBulkEdit = async () => {
    const updates = {};
    if (teacherBulkEditForm.assignedClass.trim()) updates.assignedClass = teacherBulkEditForm.assignedClass.trim();
    if (teacherBulkEditForm.assignedSection.trim()) updates.assignedSection = teacherBulkEditForm.assignedSection.trim();
    if (teacherBulkEditForm.subjects.trim()) updates.subjects = teacherBulkEditForm.subjects.split(",").map((s) => s.trim()).filter(Boolean);
    if (teacherBulkEditForm.phone.trim()) updates.phone = teacherBulkEditForm.phone.trim();

    if (!Object.keys(updates).length) {
      toast.warning("Provide at least one field to update");
      return;
    }

    const snapshot = teachers.filter((teacher) => selectedTeacherRowIds.includes(teacher._id));
    setTeacherActionLoading((prev) => ({ ...prev, editing: true }));
    try {
      const res = await fetch(`${API_URL}/api/admin/teachers/bulk-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedTeacherRowIds, updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk update failed");
        return;
      }

      pushUndoAction({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "UPDATE",
        entity: "teacher",
        before: snapshot,
        after: updates,
        timestamp: Date.now(),
      });

      setTeachers((prev) =>
        prev.map((teacher) =>
          selectedTeacherRowIds.includes(teacher._id)
            ? {
                ...teacher,
                ...(updates.assignedClass ? { class: updates.assignedClass } : {}),
                ...(updates.assignedSection ? { section: updates.assignedSection } : {}),
                ...(updates.subjects ? { subject: updates.subjects } : {}),
                ...(updates.phone ? { phone: updates.phone, mobile: updates.phone } : {}),
              }
            : teacher
        )
      );
      toast.success(`${data.affectedCount || selectedTeacherRowIds.length} teachers updated`);
      setShowTeacherBulkEditModal(false);
      clearTeacherSelection();
    } catch (err) {
      console.error("BULK EDIT TEACHERS ERROR:", err);
      toast.error("Failed to update teachers");
    } finally {
      setTeacherActionLoading((prev) => ({ ...prev, editing: false }));
    }
  };

  const deleteSelectedTeachers = async () => {
    if (selectedTeacherCount === 0) {
      toast.warning("Please select at least one teacher to delete");
      return;
    }
    setShowTeacherDeleteConfirm(true);
  };

  const confirmDeleteSelectedTeachers = async () => {
    const snapshot = teachers.filter((teacher) => selectedTeacherRowIds.includes(teacher._id));
    setTeacherActionLoading((prev) => ({ ...prev, deleting: true }));

    try {
      const res = await fetch(`${API_URL}/api/admin/teachers/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedTeacherRowIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk delete failed");
        return;
      }

      pushUndoAction({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "DELETE",
        entity: "teacher",
        items: snapshot,
        timestamp: Date.now(),
      });

      setTeachers((prev) => prev.filter((teacher) => !selectedTeacherRowIds.includes(teacher._id)));
      const deletedCount = data.affectedCount || selectedTeacherRowIds.length;
      toast.success(`${deletedCount} teachers deleted`, 10000, {
        actionLabel: "Undo",
        onAction: () => handleUndo(true),
      });

      clearTeacherSelection();
      setShowTeacherDeleteConfirm(false);
    } catch (err) {
      console.error("BULK DELETE TEACHERS ERROR:", err);
      toast.error("Failed to delete teachers");
    } finally {
      setTeacherActionLoading((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Migrate/Reassign Teacher to new class/section
  const handleTeacherMigration = async () => {
    if (!selectedTeacherForMigration) {
      toast.warning("Please select a teacher to migrate");
      return;
    }
    if (!migrationToClass || !migrationToSection) {
      toast.warning("Please select target class and section");
      return;
    }

    const teacher = teachers.find(t => t._id === selectedTeacherForMigration);
    if (!teacher) {
      toast.error("Teacher not found");
      return;
    }

    // Trim whitespace from values
    const cleanToClass = String(migrationToClass).trim();
    const cleanToSection = String(migrationToSection).trim();

    // Validate trimmed values
    if (!cleanToClass || !cleanToSection) {
      toast.error("Class and section cannot be empty");
      console.error("❌ Validation failed: empty values after trim", { cleanToClass, cleanToSection });
      return;
    }

    // Prevent same assignment
    if (teacher.class === cleanToClass && teacher.section === cleanToSection) {
      toast.warning("Teacher is already assigned to this class/section");
      return;
    }

    setMigratingTeacherId(selectedTeacherForMigration);

    try {
      const payload = {
        fromClass: String(teacher.class || "").trim(),
        fromSection: String(teacher.section || "").trim(),
        toClass: cleanToClass,
        toSection: cleanToSection,
      };

      console.log("📤 Sending teacher reassignment request:", {
        teacherId: selectedTeacherForMigration,
        teacherName: teacher.name,
        payload
      });

      const res = await fetch(`${API_URL}/api/admin/teachers/${selectedTeacherForMigration}/reassign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      console.log("📥 Server response:", { status: res.status, data: responseData });

      if (res.ok) {
        toast.success(`${teacher.name} migrated from ${teacher.class}-${teacher.section} to ${cleanToClass}-${cleanToSection}`);
        
        // Reset form
        setSelectedTeacherForMigration(null);
        setMigrationToClass("");
        setMigrationToSection("");
        await reloadUsers();
      } else {
        console.error("❌ Server error response:", responseData);
        toast.error(responseData?.error || "Failed to migrate teacher");
      }
    } catch (err) {
      console.error("❌ Migration error:", err);
      toast.error("Network error: Failed to migrate teacher");
    } finally {
      setMigratingTeacherId(null);
    }
  };

  const reloadUsers = useCallback(async ({ signal } = {}) => {
    setLoading(true);
    try {
      const isStudentsTab = activeTab === "students";
      const isTeachersTab = activeTab === "teachers";
      const studentParams = new URLSearchParams(
        isStudentsTab
          ? {
              page: String(studentPage),
              limit: "25",
            }
          : {
              page: "1",
              limit: "5000",
            }
      );
      const teacherParams = new URLSearchParams(
        isTeachersTab
          ? {
              type: "teachers",
              page: String(teacherPage),
              limit: "25",
            }
          : {
              type: "teachers",
              page: "1",
              limit: "5000",
            }
      );

      if (isStudentsTab && search.trim()) studentParams.set("search", search.trim());
      if (isTeachersTab && search.trim()) teacherParams.set("search", search.trim());
      if (isStudentsTab && studentFilterClass) studentParams.set("className", studentFilterClass);
      if (isStudentsTab && studentFilterSection) studentParams.set("section", studentFilterSection);
      if (isTeachersTab && teacherFilterClass) teacherParams.set("className", teacherFilterClass);
      if (isTeachersTab && teacherFilterSection) teacherParams.set("section", teacherFilterSection);

      const studentsUrl = `${API_URL}/api/admin/students?${studentParams.toString()}`;
      const teachersUrl = `${API_URL}/api/admin/users?${teacherParams.toString()}`;
      console.log("AdminDashboard fetch URLs:", {
        studentsUrl,
        teachersUrl,
        activeTab,
        hasToken: Boolean(token),
      });

      const [studentsRes, teachersRes] = await Promise.all([
        fetch(studentsUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }),
        fetch(teachersUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }),
      ]);

      console.log("AdminDashboard fetch status:", {
        studentsStatus: studentsRes.status,
        teachersStatus: teachersRes.status,
      });

      if (!studentsRes.ok || !teachersRes.ok) {
        setStudents([]);
        setTeachers([]);
        setStudentTotalCount(0);
        setTeacherTotalCount(0);
        return;
      }
      const studentsData = await studentsRes.json();
      const teachersData = await teachersRes.json();

      const nextStudents = Array.isArray(studentsData?.students)
        ? studentsData.students
        : Array.isArray(studentsData?.data)
        ? studentsData.data
        : [];
      setStudents(nextStudents);
      setTeachers(Array.isArray(teachersData?.data) ? teachersData.data : []);
      setStudentTotalPages(Number(studentsData?.totalPages || 1));
      setTeacherTotalPages(Number(teachersData?.totalPages || 1));
      setStudentTotalCount(Number(studentsData?.totalCount || nextStudents.length || 0));
      setTeacherTotalCount(Number(teachersData?.totalCount || 0));
      console.log(
        "Students fetched:",
        nextStudents.length,
        "| tab:",
        activeTab,
        "| total:",
        Number(studentsData?.totalCount || nextStudents.length || 0),
        "| source:",
        studentsData?.source || "unknown"
      );
      if (studentsData?.diagnostics) {
        console.log("Students diagnostics:", studentsData.diagnostics);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("USERS FETCH ERROR:", err);
      setStudents([]);
      setTeachers([]);
      setStudentTotalCount(0);
      setTeacherTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    search,
    studentFilterClass,
    studentFilterSection,
    teacherFilterClass,
    teacherFilterSection,
    studentPage,
    teacherPage,
    token,
  ]);

  const openEditStudentModal = (student) => {
    if (!student?._id) return;
    setEditStudentForm({
      _id: student._id,
      name: String(student.name || ""),
      rollNo: String(student.rollNo || ""),
      className: String(student.class || student.className || ""),
      section: String(student.section || ""),
      parentName: String(student.parentName || ""),
      parentPhone: String(student.parentPhone || student.phone || ""),
      email: String(student.email || ""),
      status: String(student.status || "Active"),
    });
    setShowEditStudentModal(true);
  };

  const saveEditedStudent = async () => {
    if (!editStudentForm._id) return;
    setEditStudentLoading(true);
    try {
      const payload = {
        name: String(editStudentForm.name || "").trim(),
        rollNo: String(editStudentForm.rollNo || "").trim(),
        className: String(editStudentForm.className || "").trim(),
        section: String(editStudentForm.section || "").trim(),
        parentName: String(editStudentForm.parentName || "").trim(),
        parentPhone: String(editStudentForm.parentPhone || "").trim(),
        email: String(editStudentForm.email || "").trim().toLowerCase(),
        status: String(editStudentForm.status || "").trim() || "Active",
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
      await reloadUsers();
    } catch (err) {
      console.error("EDIT STUDENT ERROR:", err);
      toast.error("Failed to update student");
    } finally {
      setEditStudentLoading(false);
    }
  };

  // Fetch all users (students and teachers) from single endpoint
  useEffect(() => {
    const tabsNeedingUsers = new Set([
      "students",
      "teachers",
      "analytics",
      "migrate-student",
      "migrate-teacher",
      "add-user",
      "bulk-upload",
      "user-management",
    ]);
    if (!tabsNeedingUsers.has(activeTab)) return undefined;
    const controller = new AbortController();
    if (token) reloadUsers({ signal: controller.signal });
    return () => controller.abort();
  }, [token, reloadUsers, activeTab]);

  useEffect(() => {
    setStudentPage(1);
  }, [search, studentFilterClass, studentFilterSection]);

  useEffect(() => {
    setTeacherPage(1);
  }, [search, teacherFilterClass, teacherFilterSection]);

  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === "reset-requests" && token) {
      fetchTeacherResetRequests({ signal: controller.signal });
    }
    return () => controller.abort();
  }, [activeTab, token, fetchTeacherResetRequests]);

  // Fetch subjects
  useEffect(() => {
    if (activeTab !== "subjects") return;
    if (!subjectFilters.className || !subjectFilters.section) {
      setSubjects([]);
      return;
    }
    loadSubjects(subjectFilters.className, subjectFilters.section);
  }, [activeTab, token, subjectFilters.className, subjectFilters.section]);

  // Add user
  const addUser = async () => {
    if (!form.name || !form.email) {
      toast.warning("Name and email required");
      return;
    }
    if (modeAdd === "student") {
      const parentName = String(form.parentName || "").trim();
      const parentPhone = String(form.parentPhone || "").trim();
      const phoneDigits = parentPhone.replace(/\D/g, "");
      if (!parentName) {
        toast.warning("Parent name is required");
        return;
      }
      if (!parentPhone) {
        toast.warning("Parent phone is required");
        return;
      }
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        toast.warning("Parent phone must be 7-15 digits");
        return;
      }
    } else if (modeAdd === "teacher") {
      const teacherPhone = String(form.phone || "").trim();
      if (teacherPhone) {
        const phoneDigits = teacherPhone.replace(/\D/g, "");
        if (phoneDigits.length < 7 || phoneDigits.length > 15) {
          toast.warning("Teacher phone must be 7-15 digits");
          return;
        }
      }
    }
    setAdding(true);
    try {
      const endpoint = modeAdd === "student" ? "add-student" : "add-teacher";
      const res = await fetch(`${API_URL}/api/admin/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add user");
        return;
      }
      toast.success(`${modeAdd.charAt(0).toUpperCase() + modeAdd.slice(1)} added successfully`);
      setForm({
        name: "",
        email: "",
        className: "",
        section: "",
        rollNo: "",
        subject: "",
        phone: "",
        password: "",
        parentName: "",
        parentPhone: "",
      });
    } catch (err) {
      console.error("ADD USER ERROR:", err);
      toast.error("Failed to add user");
    } finally {
      setAdding(false);
    }
  };

  // Bulk Upload - Student Upload
  const bulkUploadStudents = async () => {
    if (!studentFile) {
      toast.warning("Please select a file");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", studentFile);
    try {
      const res = await fetch(`${API_URL}/api/admin/upload-students`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Upload failed";
        toast.error(errorMsg);
        return;
      }
      toast.success(`Students uploaded! Success: ${data.successCount}, Errors: ${data.errorCount}`);
      if (data.errors && data.errors.length > 0) {
        const errorDetails = data.errors.map(e => `${e.row}: ${e.error}`).join("\n");
        console.warn("Upload Errors:\n", errorDetails);
        toast.warning(`Some rows had errors`);
      }
      setUploadedStudents([]);
      setAssignmentMode(null);
      setStudentFile(null);
      
      // Refresh paginated users after upload
      setTimeout(() => {
        reloadUsers();
      }, 500);
    } catch (err) {
      console.error("BULK UPLOAD STUDENTS ERROR:", err);
      toast.error(`UPLOAD FAILED: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Bulk Upload - Teacher Upload
  // Bulk Upload - Teacher Upload
  const bulkUploadTeachers = async () => {
    if (!teacherFile) {
      toast.warning("Please select a file");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", teacherFile);
    try {
      const res = await fetch(`${API_URL}/api/admin/upload-teachers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Upload failed";
        toast.error(errorMsg);
        return;
      }
      toast.success(`Teachers uploaded! Success: ${data.successCount}, Errors: ${data.errorCount}`);
      if (data.errors && data.errors.length > 0) {
        const errorDetails = data.errors.map(e => `${e.row}: ${e.error}`).join("\n");
        console.warn("Upload Errors:\n", errorDetails);
        toast.warning(`Some rows had errors`);
      }
      setUploadedTeachers([]);
      setAssignmentMode(null);
      setTeacherFile(null);
      
      // Refresh paginated users after upload
      setTimeout(() => {
        reloadUsers();
      }, 500);
    } catch (err) {
      console.error("BULK UPLOAD TEACHERS ERROR:", err);
      toast.error(`UPLOAD FAILED: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Preview Student Upload - Calls preview API
  const previewStudentUpload = async () => {
    if (!studentFile) {
      toast.warning("Please select a file");
      return;
    }
    setIsPreviewLoading(true);
    setShowPreview(false);
    setPreviewData(null);
    setImportResult(null);
    
    const formData = new FormData();
    formData.append("file", studentFile);
    try {
      const res = await fetch(`${API_URL}/api/admin/upload-students-preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Preview failed. Please check spreadsheet format.");
        console.error("Preview error:", data);
        return;
      }
      
      setPreviewId(data.previewId);
      setPreviewData(data);
      setShowPreview(true);
      toast.success(`Preview ready: ${data.validRows} valid, ${data.invalidRows} invalid`);
    } catch (err) {
      console.error("PREVIEW UPLOAD ERROR:", err);
      toast.error(`Preview failed: ${err.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Confirm and Import Students - Calls confirm API
  const confirmStudentImport = async () => {
    if (!previewId) {
      toast.error("Preview not found");
      return;
    }
    
    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/confirm-student-import`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ previewId }),
      });
      const data = await res.json();
      
      if (res.status === 409) {
        // Preview already imported
        toast.error("This import was already processed. Please upload the file again to import more students.");
        console.warn("Preview already used:", data);
        setShowPreview(false);
        setPreviewData(null);
        setPreviewId(null);
        setStudentFile(null);
        return;
      }
      
      if (!res.ok) {
        toast.error(data.error || "Import failed");
        console.error("Import error:", data);
        return;
      }
      
      setImportResult(data);
      toast.success(`Import complete! ${data.imported} students imported, ${data.skipped} skipped`);
      
      // Reset upload state (but keep preview for reference)
      setShowPreview(true);
      setPreviewData(previewData);
      setStudentFile(null);
      
      // Refresh paginated users after upload
      setTimeout(() => {
        reloadUsers();
      }, 500);
    } catch (err) {
      console.error("CONFIRM IMPORT ERROR:", err);
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Preview Teacher Upload - Calls preview API
  const previewTeacherUpload = async () => {
    if (!teacherFile) {
      toast.warning("Please select a file");
      return;
    }
    setIsTeacherPreviewLoading(true);
    setShowTeacherPreview(false);
    setTeacherPreviewData(null);
    setTeacherImportResult(null);
    
    const formData = new FormData();
    formData.append("file", teacherFile);
    try {
      const res = await fetch(`${API_URL}/api/admin/upload-teachers-preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Preview failed. Please check spreadsheet format.");
        console.error("Preview error:", data);
        return;
      }
      
      setTeacherPreviewId(data.previewId);
      setTeacherPreviewData(data);
      setShowTeacherPreview(true);
      toast.success(`Preview ready: ${data.validRows} valid, ${data.invalidRows} invalid, ${data.duplicateRows} duplicate`);
    } catch (err) {
      console.error("PREVIEW UPLOAD ERROR:", err);
      toast.error(`Preview failed: ${err.message}`);
    } finally {
      setIsTeacherPreviewLoading(false);
    }
  };

  // Confirm and Import Teachers - Calls confirm API
  const confirmTeacherImport = async () => {
    if (!teacherPreviewId) {
      toast.error("Preview not found");
      return;
    }
    
    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/confirm-teacher-import`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ previewId: teacherPreviewId }),
      });
      const data = await res.json();
      
      if (res.status === 409) {
        // Preview already imported
        toast.error("This import was already processed. Please upload the file again to import more teachers.");
        console.warn("Preview already used:", data);
        setShowTeacherPreview(false);
        setTeacherPreviewData(null);
        setTeacherPreviewId(null);
        setTeacherFile(null);
        return;
      }
      
      if (!res.ok) {
        toast.error(data.error || "Import failed");
        console.error("Import error:", data);
        return;
      }
      
      setTeacherImportResult(data);
      toast.success(`Import complete! ${data.imported} teachers imported, ${data.skipped} skipped`);
      
      // Reset upload state (but keep preview for reference)
      setShowTeacherPreview(true);
      setTeacherPreviewData(teacherPreviewData);
      setTeacherFile(null);
      
      // Refresh paginated users after upload
      setTimeout(() => {
        reloadUsers();
      }, 500);
    } catch (err) {
      console.error("CONFIRM IMPORT ERROR:", err);
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Download error rows as Excel
  const downloadErrorRows = (rows, filename) => {
    if (!rows || rows.length === 0) {
      toast.warning("No error rows to download");
      return;
    }
    
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Errors");
      XLSX.writeFile(wb, filename);
      toast.success("Error rows downloaded");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download error rows");
    }
  };

  // Assign students to teachers or vice versa
  const handleAssignment = async (studentId, teacherId) => {
    try {
      if (assignmentMode === "students") {
        setSelectedForAssignment({ ...selectedForAssignment, [studentId]: teacherId });
      } else if (assignmentMode === "teachers") {
        setSelectedForAssignment({ ...selectedForAssignment, [teacherId]: studentId });
      }
      toast.success("Assignment marked. Continue with other assignments or complete.");
    } catch (err) {
      console.error("ASSIGNMENT ERROR:", err);
      toast.error("Failed to mark assignment");
    }
  };

  // Complete assignments
  const completeAssignments = () => {
    setAssignmentMode(null);
    setUploadedStudents([]);
    setUploadedTeachers([]);
    setSelectedForAssignment({});
    toast.success("Assignments completed successfully!");
  };

  const loadSubjects = async (targetClass = subjectFilters.className, targetSection = subjectFilters.section) => {
    if (!targetClass || !targetSection) {
      toast.warning("Please select class and section");
      return;
    }
    setSubjectLoading(true);
    try {
      const params = new URLSearchParams({ class: targetClass, section: targetSection });
      const res = await fetch(`${API_URL}/api/admin/subjects?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load subjects");
        setSubjects([]);
        return;
      }
      setSubjects(Array.isArray(data) ? data : data.subjects || []);
    } catch (err) {
      console.error("LOAD SUBJECTS ERROR:", err);
      setSubjects([]);
      toast.error("Failed to load subjects");
    } finally {
      setSubjectLoading(false);
    }
  };

  const sourceStudentsForMigration = useMemo(() => {
    const fromClass = String(studentMigrationForm.fromClass || "").trim();
    const fromSection = String(studentMigrationForm.fromSection || "").trim();
    if (!fromClass || !fromSection) return [];
    return students.filter((s) => String(s.class || s.className || "").trim() === fromClass && String(s.section || "").trim() === fromSection);
  }, [students, studentMigrationForm.fromClass, studentMigrationForm.fromSection]);

  const handleStudentMigration = async () => {
    const fromClass = String(studentMigrationForm.fromClass || "").trim();
    const fromSection = String(studentMigrationForm.fromSection || "").trim();
    const toClass = String(studentMigrationForm.toClass || "").trim();
    const toSection = String(studentMigrationForm.toSection || "").trim();

    if (!fromClass || !fromSection || !toClass || !toSection) {
      toast.warning("Please select source and target class/section");
      return;
    }
    if (fromClass === toClass && fromSection === toSection) {
      toast.warning("Source and target class/section cannot be same");
      return;
    }
    if (!studentMigrationForm.migrateAll && studentMigrationForm.selectedStudentIds.length === 0) {
      toast.warning("Select students or enable migrate all");
      return;
    }
    setMigratingStudents(true);
    try {
      const payload = {
        fromClass,
        fromSection,
        toClass,
        toSection,
        migrateAll: studentMigrationForm.migrateAll,
      };
      if (!studentMigrationForm.migrateAll && studentMigrationForm.selectedStudentIds.length > 0) {
        payload.studentIds = studentMigrationForm.selectedStudentIds;
      }

      const res = await fetch(`${API_URL}/api/admin/students/migrate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to migrate students");
        return;
      }

      toast.success(data?.message || "Students migrated successfully");
      setStudentMigrationForm({
        fromClass: "",
        fromSection: "",
        toClass: "",
        toSection: "",
        migrateAll: true,
        selectedStudentIds: [],
      });

      await reloadUsers();
    } catch (err) {
      console.error("STUDENT MIGRATION ERROR:", err);
      toast.error("Network error: Failed to migrate students");
    } finally {
      setMigratingStudents(false);
    }
  };

  const addSubject = async () => {
    if (!subjectForm.className || !subjectForm.section || !subjectForm.name.trim()) {
      toast.warning("Class, section, and subject name are required");
      return;
    }
    setSubjectSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: subjectForm.className,
          section: subjectForm.section,
          name: subjectForm.name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add subject");
        return;
      }
      toast.success("Subject added successfully");
      const nextClass = subjectForm.className;
      const nextSection = subjectForm.section;
      setSubjectForm({ className: "", section: "", name: "" });
      setSubjectFilters({ className: nextClass, section: nextSection });
      await loadSubjects(nextClass, nextSection);
    } catch (err) {
      console.error("ADD SUBJECT ERROR:", err);
      toast.error("Failed to add subject");
    } finally {
      setSubjectSaving(false);
    }
  };

  const openSubjectEdit = (subject) => {
    setSubjectEditForm({
      _id: subject._id,
      className: subject.class || subject.className || "",
      section: subject.section || "",
      name: subject.name || subject.subjectName || "",
    });
    setShowSubjectEditModal(true);
  };

  const updateSubject = async () => {
    if (!subjectEditForm._id || !subjectEditForm.className || !subjectEditForm.section || !subjectEditForm.name.trim()) {
      toast.warning("Class, section, and subject name are required");
      return;
    }
    setSubjectSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/subjects/${subjectEditForm._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: subjectEditForm.className,
          section: subjectEditForm.section,
          name: subjectEditForm.name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update subject");
        return;
      }
      toast.success("Subject updated");
      setShowSubjectEditModal(false);
      await loadSubjects(subjectFilters.className, subjectFilters.section);
    } catch (err) {
      console.error("UPDATE SUBJECT ERROR:", err);
      toast.error("Failed to update subject");
    } finally {
      setSubjectSaving(false);
    }
  };

  const deleteSubject = async (subject) => {
    if (!subject?._id) return;
    const confirmed = window.confirm("Are you sure you want to delete this subject?");
    if (!confirmed) return;
    setSubjectDeletingId(subject._id);
    try {
      const res = await fetch(`${API_URL}/api/admin/subjects/${subject._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete subject");
        return;
      }
      setSubjects((prev) => prev.filter((s) => s._id !== subject._id));
      toast.success("Subject deleted");
    } catch (err) {
      console.error("DELETE SUBJECT ERROR:", err);
      toast.error("Failed to delete subject");
    } finally {
      setSubjectDeletingId(null);
    }
  };

  // Helper functions to get unique classes and sections
  const getUniqueStudentClasses = () => {
    const classes = new Set([
      ...metaClasses,
      ...students.map((s) => s.class || s.className),
    ].filter(Boolean));
    return Array.from(classes).sort();
  };

  const getUniqueStudentSections = (className) => {
    if (!className) return [];
    const sectionsForClass = new Set(
      students
        .filter((s) => (s.class || s.className) === className)
        .map((s) => s.section)
        .filter(Boolean)
    );
    if (sectionsForClass.size > 0) {
      return Array.from(sectionsForClass).sort();
    }
    return Array.from(new Set(metaSections.filter(Boolean))).sort();
  };

  const getUniqueTeacherClasses = () => {
    const classes = new Set([
      ...metaClasses,
      ...teachers.map((t) => t.class),
    ].filter(Boolean));
    return Array.from(classes).sort();
  };

  const getUniqueTeacherSections = (className) => {
    if (!className) return [];
    const sectionsForClass = new Set(
      teachers
        .filter((t) => t.class === className)
        .map((t) => t.section)
        .filter(Boolean)
    );
    if (sectionsForClass.size > 0) {
      return Array.from(sectionsForClass).sort();
    }
    return Array.from(new Set(metaSections.filter(Boolean))).sort();
  };

  const getSubjectClasses = () => {
    const classes = new Set([
      ...metaClasses,
      ...students.map((s) => s.class || s.className),
      ...teachers.map((t) => t.class),
      ...subjects.map((s) => s.class || s.className),
    ].filter(Boolean));
    return Array.from(classes).sort();
  };

  const getSubjectSections = (className) => {
    if (!className) return [];
    const sections = new Set([
      ...students.filter((s) => (s.class || s.className) === className).map((s) => s.section),
      ...teachers.filter((t) => t.class === className).map((t) => t.section),
      ...subjects.filter((s) => (s.class || s.className) === className).map((s) => s.section),
    ].filter(Boolean));
    if (sections.size > 0) {
      return Array.from(sections).sort();
    }
    return Array.from(new Set(metaSections.filter(Boolean))).sort();
  };

  // Filter functions
  const getFilteredStudents = () => {
    return students.filter((s) => {
      const studentClass = s.class || s.className;
      const matchesSearch =
        !search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase());
      const matchesClass = !studentFilterClass || studentClass === studentFilterClass;
      const matchesSection = !studentFilterSection || s.section === studentFilterSection;
      return matchesSearch && matchesClass && matchesSection;
    });
  };

  const getFilteredTeachers = () => {
    return teachers.filter((t) => {
      const matchesSearch =
        !search ||
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.email?.toLowerCase().includes(search.toLowerCase());
      const matchesClass = !teacherFilterClass || t.class === teacherFilterClass;
      const matchesSection = !teacherFilterSection || t.section === teacherFilterSection;
      return matchesSearch && matchesClass && matchesSection;
    });
  };

  const userManagementItems = useMemo(() => ([
    { id: "add-user", label: "Add User" },
  ]), []);

  const navItems = useMemo(() => ([
    { id: "profile", label: "Profile", icon: UserCircle2 },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "audit-logs", label: "Audit Logs", icon: ClipboardList },
    { id: "students", label: "Students", icon: Users },
    { id: "teachers", label: "Teachers", icon: UserCheck },
    { id: "migrate-student", label: "Migrate Student", icon: Shuffle },
    { id: "migrate-teacher", label: "Migrate Teacher", icon: Shuffle },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "bulk-upload", label: "Bulk Upload", icon: UploadCloud },
    { id: "voice-broadcast", label: "Voice Broadcast", icon: Megaphone },
    { id: "tracking", label: "User Tracking", icon: Radar },
    { id: "reset-requests", label: "Reset Requests", icon: KeyRound },
    { id: "user-management", label: "User Management", icon: UsersRound, children: userManagementItems },
    { id: "settings", label: "Settings", icon: Settings },
  ]), [userManagementItems]);

  const activeTitle = useMemo(() => {
    for (const item of navItems) {
      if (item.id === activeTab) return item.label;
      if (Array.isArray(item.children)) {
        const child = item.children.find((sub) => sub.id === activeTab);
        if (child) return child.label;
      }
    }
    return "Dashboard";
  }, [activeTab, navItems]);

  const isAnalyticsView = activeTab === "analytics";
  const isAuditLogsView = activeTab === "audit-logs";

  if (isAnalyticsView) {
    return (
      <div className="admin-portal-shell flex min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4 md:p-8 font-sans">
        <div className="w-full">
          <button
            onClick={() => {
              setActiveTab("dashboard");
              navigate("/admin/dashboard");
            }}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-100 hover:text-white hover:underline transition"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </button>
          <AdminAnalyticsDashboard token={token} schoolId={schoolId} teachers={teachers} students={students} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`admin-portal-shell flex min-h-screen overflow-hidden flex-col lg:flex-row font-sans bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900`}
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
            <div className={`${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
              <h2 className="text-lg font-black tracking-tight text-white">Admin Console</h2>
              <p className="text-xs text-slate-400">{admin?.email || "Administrator"}</p>
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
            <div key={item.id} className="space-y-1">
              <button
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
              className={`group relative w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-3 ${
                  activeTab === item.id || (Array.isArray(item.children) && item.children.some((sub) => sub.id === activeTab))
                    ? "bg-purple-500/20 text-purple-100"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
            >
                {item.icon ? (
                  <item.icon
                    className={`h-4 w-4 transition-transform duration-200 group-hover:scale-105 ${
                      activeTab === item.id ? "text-purple-200" : "text-slate-300"
                    }`}
                  />
                ) : null}
                <span className={`${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
                  {item.label}
                </span>
              </button>
              {Array.isArray(item.children) && (
                <div className={`space-y-1 ${sidebarCollapsed ? "hidden" : "ml-3 border-l border-white/10 pl-2"}`}>
                  {item.children.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setActiveTab(sub.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        activeTab === sub.id
                          ? "bg-purple-500/20 text-purple-100"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="mt-3 space-y-2">
          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-slate-100 hover:bg-white/20 transition"
            title="Change Password"
          >
            <span className="flex items-center gap-3">
              <KeyRound className="h-4 w-4" />
              <span className={`${sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
                Change Password
              </span>
            </span>
          </button>
          <button
            onClick={() => {
              setSidebarOpen(false);
              handleLogout();
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
      <div className="flex-1 w-full lg:w-auto min-w-0 flex flex-col overflow-hidden bg-slate-900/60 backdrop-blur-xl">
        {/* Header */}
        <div className="bg-slate-950/70 border-b border-white/10 px-3 md:px-6 py-3 md:py-5 sticky top-0 z-20 flex items-center justify-between gap-3">
          <div className="flex items-center min-w-0">
            {activeTab !== "analytics" && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden mr-3 p-2 rounded-lg transition hover:bg-white/10"
                title="Toggle sidebar"
              >
                <svg
                  className="w-6 h-6 text-slate-100"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="flex-1 min-w-0">
              {activeTab === "analytics" && (
                <button
                  onClick={() => {
                    setActiveTab("dashboard");
                    navigate("/admin/dashboard");
                  }}
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-100 hover:text-white hover:underline transition"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to Dashboard
                </button>
              )}
              <h1
                className="text-xl md:text-3xl font-black break-words text-white"
              >
                {activeTitle}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 border border-white/10 bg-white/10">
              <Search className="h-4 w-4 text-slate-200" />
              <input
                placeholder="Search students, teachers, records..."
                className="bg-transparent text-sm outline-none w-56 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <NotificationBell
              onClick={() => setShowNotifications(!showNotifications)}
              unreadCount={unreadCount}
              isOpen={showNotifications}
            />
            <div className="flex items-center gap-2 rounded-full px-2 py-1.5 border border-white/10 bg-white/10">
              <UserCircle2 className="text-slate-100 h-5 w-5" />
              <span className="hidden md:inline text-xs font-semibold text-slate-200">
                {admin?.name || "Admin"}
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
              token={localStorage.getItem("adminToken")}
              toast={toast}
              showBackdrop={false}
              onNotificationsUpdated={refreshUnreadCount}
            />
          </Suspense>
        )}

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden ${
            activeTab === "analytics"
              ? "p-0 pb-16 md:pb-0"
              : "p-3 md:p-6 lg:p-8 pb-20 md:pb-6"
          }`}
        >
          <div className={`mx-auto w-full ${activeTab === "analytics" ? "max-w-none" : "max-w-7xl"}`}>
          <Suspense fallback={<ListSkeleton rows={2} />}>
            {/* ===== PROFILE ===== */}
            {activeTab === "profile" && (
              <PageContainer className="space-y-4">
                <PageIntro
                  title="My Profile"
                  description="Review your personal and administrative details."
                  icon={<UserCircle2 className="h-16 w-16" aria-hidden="true" />}
                  showTitle={false}
                />
                <div className="saas-card p-6 space-y-4">
                  {[
                    { label: "Name", value: admin?.name || localStorage.getItem("adminName") },
                    { label: "Email", value: admin?.email || localStorage.getItem("adminEmail") },
                    { label: "Phone", value: admin?.phone || admin?.mobile || localStorage.getItem("adminPhone") },
                    { label: "School", value: schoolName || admin?.schoolName || localStorage.getItem("adminSchoolName") },
                  ].map((field, idx) => (
                    <div
                      key={field.label}
                      className={`flex justify-between gap-4 ${idx === 0 ? "" : "border-t border-[var(--border-color)] pt-3"}`}
                    >
                      <span className="text-[var(--text-secondary)] font-medium">{field.label}</span>
                      {field.value ? (
                        <span className="text-[var(--text-primary)] font-semibold text-right">{field.value}</span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-100 bg-amber-500/20 border border-amber-400/30 px-2 py-1 rounded-full">
                          Add in settings
                        </span>
                      )}
                    </div>
                  ))}
                </div>

              </PageContainer>
            )}

          {/* ===== DASHBOARD ===== */}
          {activeTab === "dashboard" && (
            <PageContainer className="space-y-6">
              <DashboardHero
                title="Admin Dashboard"
                subtitle="Track school-wide performance, staffing, and attendance at a glance."
                icon={<LayoutDashboard className="h-16 w-16" aria-hidden="true" />}
                showTitle={false}
                stats={[
                  { label: "Students", value: dashboardSummary.studentCount || studentTotalCount || 0 },
                  { label: "Teachers", value: dashboardSummary.teacherCount || teacherTotalCount || 0 },
                  { label: "Classes", value: dashboardSummary.classCount || 0 },
                ]}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnalyticsCard
                  icon={<GraduationCap className="h-5 w-5" />}
                  label="Total Students"
                  value={dashboardSummary.studentCount || studentTotalCount || 0}
                  description="Active student enrollments"
                  gradient="from-indigo-500 to-purple-600"
                />
                <AnalyticsCard
                  icon={<UserCheck className="h-5 w-5" />}
                  label="Total Teachers"
                  value={dashboardSummary.teacherCount || teacherTotalCount || 0}
                  description="Faculty members onboarded"
                  gradient="from-purple-500 to-violet-600"
                />
                <AnalyticsCard
                  icon={<CalendarCheck className="h-5 w-5" />}
                  label="School Attendance"
                  value={
                    Number.isFinite(Number(dashboardSummary.attendanceRate))
                      ? `${Math.round(Number(dashboardSummary.attendanceRate))}%`
                      : "—"
                  }
                  description="Latest attendance snapshot"
                  gradient="from-emerald-400 to-green-500"
                />
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Analytics Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ListItemCard className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Class Performance</p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {dashboardSummary.classCount || 0} Classes
                    </p>
                    <p className="mt-2 text-sm text-slate-400">Monitor section-level outcomes and top performers.</p>
                  </ListItemCard>
                  <ListItemCard className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Attendance Insights</p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {Number.isFinite(Number(dashboardSummary.attendanceRate))
                        ? `${Math.round(Number(dashboardSummary.attendanceRate))}%`
                        : "—"}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">Daily attendance health across the school.</p>
                  </ListItemCard>
                </div>
              </div>
            </PageContainer>
          )}

          {/* ===== ANALYTICS ===== */}
          {activeTab === "analytics" && (
            <AdminAnalyticsDashboard token={token} schoolId={schoolId} teachers={teachers} students={students} />
          )}

          {/* ===== AUDIT LOGS ===== */}
          {activeTab === "audit-logs" && (
            <div className="space-y-4">
              <PageIntro
                title="Audit Logs"
                description="Review administrator activity and critical system changes."
                showTitle={false}
              />
              <AdminAuditLogsDashboard token={token} />
            </div>
          )}

          {/* ===== STUDENTS ===== */}
          {activeTab === "students" && (
            <div className="space-y-4">
              <PageIntro
                title="Students"
                description="Manage student profiles, classes, and records."
                showTitle={false}
              />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="saas-input"
              />

              {/* Filter Row */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={studentFilterClass}
                  onChange={(e) => {
                    setStudentFilterClass(e.target.value);
                    setStudentFilterSection("");
                  }}
                  className="saas-input"
                >
                  <option value="">All Classes</option>
                  {getUniqueStudentClasses().map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls}
                    </option>
                  ))}
                </select>

                <select
                  value={studentFilterSection}
                  onChange={(e) => setStudentFilterSection(e.target.value)}
                  disabled={!studentFilterClass}
                  className="saas-input disabled:opacity-60"
                >
                  <option value="">All Sections</option>
                  {getUniqueStudentSections(studentFilterClass).map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <div className="md:hidden">
                    <ListSkeleton rows={4} />
                  </div>
                  <div className="hidden md:block">
                    <TableSkeleton rows={6} cols={8} />
                  </div>
                </div>
              ) : getFilteredStudents().length === 0 ? (
                <EmptyState
                  title="No students yet"
                  description="Student records will appear here once created."
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600 font-semibold">
                      Showing {getFilteredStudents().length} student{getFilteredStudents().length !== 1 ? "s" : ""}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getFilteredStudents().length > 0 && getFilteredStudents().every((student) => selectedStudents[student._id])}
                        onChange={selectAllStudents}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-slate-600">Select All</span>
                    </label>
                  </div>

                  {(selectedStudentCount > 0 || undoStack.length > 0) && (
                    <div className="hidden md:flex sticky top-[88px] z-20 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl p-3 items-center justify-between shadow-sm">
                      <span className="text-sm font-semibold text-slate-700">
                        {selectedStudentCount} student{selectedStudentCount !== 1 ? "s" : ""} selected
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openBulkEdit}
                          disabled={selectedStudentCount === 0 || studentActionLoading.editing || studentActionLoading.deleting}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {studentActionLoading.editing ? "Saving..." : "Edit Selected"}
                        </button>
                        <button
                          onClick={deleteSelectedStudents}
                          disabled={selectedStudentCount === 0 || studentActionLoading.deleting}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {studentActionLoading.deleting ? "Deleting..." : "Delete Selected"}
                        </button>
                        <button
                          onClick={() => handleUndo(false)}
                          disabled={undoStack.length === 0 || studentActionLoading.undoing}
                          className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                        >
                          {studentActionLoading.undoing ? "Undoing..." : `Undo (${undoStack.length})`}
                        </button>
                        <button
                          onClick={clearStudentSelection}
                          disabled={selectedStudentCount === 0}
                          className="px-4 py-2 bg-slate-200 text-slate-800 text-sm font-bold rounded-lg hover:bg-slate-300 transition disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="md:hidden space-y-3">
                    {getFilteredStudents().map((s) => (
                      <ListItemCard
                        key={s._id}
                        onTouchStart={() => handleRowLongPressStart(s._id)}
                        onTouchEnd={handleRowLongPressEnd}
                        onTouchCancel={handleRowLongPressEnd}
                        onClick={() => handleStudentRowClick(s._id)}
                        className={`flex items-start md:items-center gap-3 ${
                          selectedStudents[s._id] ? "border-blue-400 bg-blue-50" : "border-slate-200"
                        } ${selectionMode ? "cursor-pointer" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents[s._id] || false}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => {
                            setSelectionMode(true);
                            toggleStudentSelection(s._id);
                          }}
                          disabled={studentActionLoading.deleting}
                          className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                          <div className="text-xs md:text-sm text-slate-700 mt-1 break-words">
                            Email: {s.email} | Class: {s.class || s.className || "N/A"} | Section: {s.section || "N/A"}
                          </div>
                          <div className="text-xs md:text-sm text-slate-700 mt-1 break-words">
                            Parent: {s.parentName || "Not set"} | Phone: {s.parentPhone || s.phone || "Not set"}
                          </div>
                        {isTouchDevice && !selectionMode && (
                          <div className="text-[11px] text-slate-400 mt-1">Long press to select</div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditStudentModal(s);
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 transition"
                      >
                        Edit
                      </button>
                    </ListItemCard>
                  ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto max-h-[520px] saas-card">
                    <table className="saas-table">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={getFilteredStudents().length > 0 && getFilteredStudents().every((student) => selectedStudents[student._id])}
                              onChange={selectAllStudents}
                              className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Name</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Class</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Section</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Parent</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Phone</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Email</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredStudents().map((s) => (
                          <tr
                            key={s._id}
                            onClick={() => handleStudentRowClick(s._id)}
                            className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                              selectedStudents[s._id] ? "bg-blue-50" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedStudents[s._id] || false}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => {
                                  setSelectionMode(true);
                                  toggleStudentSelection(s._id);
                                }}
                                disabled={studentActionLoading.deleting}
                                className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                            <td className="px-4 py-3 text-slate-700">{s.class || s.className || "N/A"}</td>
                            <td className="px-4 py-3 text-slate-700">{s.section || "N/A"}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs md:text-sm">{s.parentName || "Not set"}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs md:text-sm">{s.parentPhone || s.phone || "Not set"}</td>
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

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setStudentPage((prev) => Math.max(1, prev - 1))}
                  disabled={studentPage <= 1 || loading}
                  className="saas-button-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-slate-600">
                  Page {studentPage} / {Math.max(1, studentTotalPages)}
                </span>
                <button
                  onClick={() => setStudentPage((prev) => Math.min(studentTotalPages, prev + 1))}
                  disabled={studentPage >= studentTotalPages || loading}
                  className="saas-button-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              {(selectedStudentCount > 0 || undoStack.length > 0) && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-200 px-3 py-3 shadow-2xl">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    {selectedStudentCount} selected
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={openBulkEdit}
                      disabled={selectedStudentCount === 0 || studentActionLoading.editing || studentActionLoading.deleting}
                      className="py-3 px-2 bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={deleteSelectedStudents}
                      disabled={selectedStudentCount === 0 || studentActionLoading.deleting}
                      className="py-3 px-2 bg-red-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleUndo(false)}
                      disabled={undoStack.length === 0 || studentActionLoading.undoing}
                      className="py-3 px-2 bg-amber-500 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                    >
                      Undo {undoStack.length > 0 ? `(${undoStack.length})` : ""}
                    </button>
                    <button
                      onClick={clearStudentSelection}
                      disabled={selectedStudentCount === 0}
                      className="py-3 px-2 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== TEACHERS ===== */}
          {activeTab === "teachers" && (
            <div className="space-y-4">
              <PageIntro
                title="Teachers"
                description="Manage teacher profiles and assignments."
                showTitle={false}
              />
              <input
                type="text"
                placeholder="Search teachers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="saas-input"
              />

              {/* Filter Row */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={teacherFilterClass}
                  onChange={(e) => {
                    setTeacherFilterClass(e.target.value);
                    setTeacherFilterSection("");
                  }}
                  className="saas-input"
                >
                  <option value="">All Classes</option>
                  {getUniqueTeacherClasses().map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls}
                    </option>
                  ))}
                </select>

                <select
                  value={teacherFilterSection}
                  onChange={(e) => setTeacherFilterSection(e.target.value)}
                  disabled={!teacherFilterClass}
                  className="saas-input disabled:opacity-60"
                >
                  <option value="">All Sections</option>
                  {getUniqueTeacherSections(teacherFilterClass).map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <div className="md:hidden">
                    <ListSkeleton rows={4} />
                  </div>
                  <div className="hidden md:block">
                    <TableSkeleton rows={6} cols={7} />
                  </div>
                </div>
              ) : getFilteredTeachers().length === 0 ? (
                <EmptyState
                  title="No teachers yet"
                  description="Teacher profiles will appear here once created."
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600 font-semibold">
                      Showing {getFilteredTeachers().length} teacher{getFilteredTeachers().length !== 1 ? "s" : ""}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getFilteredTeachers().length > 0 && getFilteredTeachers().every((teacher) => selectedTeachers[teacher._id])}
                        onChange={selectAllTeachers}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-slate-600">Select All</span>
                    </label>
                  </div>

                  {(selectedTeacherCount > 0 || undoStack.length > 0) && (
                    <div className="hidden md:flex sticky top-[88px] z-20 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl p-3 items-center justify-between shadow-sm">
                      <span className="text-sm font-semibold text-slate-700">
                        {selectedTeacherCount} teacher{selectedTeacherCount !== 1 ? "s" : ""} selected
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openTeacherBulkEdit}
                          disabled={selectedTeacherCount === 0 || teacherActionLoading.editing || teacherActionLoading.deleting}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {teacherActionLoading.editing ? "Saving..." : "Edit Selected"}
                        </button>
                        <button
                          onClick={deleteSelectedTeachers}
                          disabled={selectedTeacherCount === 0 || teacherActionLoading.deleting}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {teacherActionLoading.deleting ? "Deleting..." : "Delete Selected"}
                        </button>
                        <button
                          onClick={() => handleUndo(false)}
                          disabled={undoStack.length === 0 || studentActionLoading.undoing}
                          className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                        >
                          {studentActionLoading.undoing ? "Undoing..." : `Undo (${undoStack.length})`}
                        </button>
                        <button
                          onClick={clearTeacherSelection}
                          disabled={selectedTeacherCount === 0}
                          className="px-4 py-2 bg-slate-200 text-slate-800 text-sm font-bold rounded-lg hover:bg-slate-300 transition disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="md:hidden space-y-3">
                    {getFilteredTeachers().map((t) => (
                      <ListItemCard
                        key={t._id}
                        onTouchStart={() => handleTeacherRowLongPressStart(t._id)}
                        onTouchEnd={handleTeacherRowLongPressEnd}
                        onTouchCancel={handleTeacherRowLongPressEnd}
                        onClick={() => handleTeacherRowClick(t._id)}
                        className={`flex items-start md:items-center gap-3 ${
                          selectedTeachers[t._id] ? "border-blue-400 bg-blue-50" : "border-slate-200"
                        } ${teacherSelectionMode ? "cursor-pointer" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeachers[t._id] || false}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => {
                            setTeacherSelectionMode(true);
                            toggleTeacherSelection(t._id);
                          }}
                          disabled={teacherActionLoading.deleting}
                          className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                          <div className="text-xs md:text-sm text-slate-700 mt-1 break-words">
                            Email: {t.email} | Class: {t.class || "N/A"} | Section: {t.section || "N/A"}
                            {t.subject && ` | Subject: ${t.subject}`}
                          </div>
                          {(t.phone || t.mobile || t.contact || t.contactNumber) && (
                            <div className="text-xs md:text-sm text-slate-700 mt-1 break-words">
                              Phone: {t.phone || t.mobile || t.contact || t.contactNumber}
                            </div>
                          )}
                          {isTouchDevice && !teacherSelectionMode && (
                            <div className="text-[11px] text-slate-400 mt-1">Long press to select</div>
                          )}
                        </div>
                      </ListItemCard>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto max-h-[520px] saas-card">
                    <table className="saas-table">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={getFilteredTeachers().length > 0 && getFilteredTeachers().every((teacher) => selectedTeachers[teacher._id])}
                              onChange={selectAllTeachers}
                              className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Name</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Class</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Section</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Subject</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Phone</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredTeachers().map((t) => (
                          <tr
                            key={t._id}
                            onClick={() => handleTeacherRowClick(t._id)}
                            className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                              selectedTeachers[t._id] ? "bg-blue-50" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedTeachers[t._id] || false}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => {
                                  setTeacherSelectionMode(true);
                                  toggleTeacherSelection(t._id);
                                }}
                                disabled={teacherActionLoading.deleting}
                                className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{t.name}</td>
                            <td className="px-4 py-3 text-slate-700">{t.class || "N/A"}</td>
                            <td className="px-4 py-3 text-slate-700">{t.section || "N/A"}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs md:text-sm break-words">{t.subject || "-"}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs md:text-sm">
                              {t.phone || t.mobile || t.contact || t.contactNumber || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700 text-xs md:text-sm break-all">{t.email || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setTeacherPage((prev) => Math.max(1, prev - 1))}
                  disabled={teacherPage <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-slate-600">
                  Page {teacherPage} / {Math.max(1, teacherTotalPages)}
                </span>
                <button
                  onClick={() => setTeacherPage((prev) => Math.min(teacherTotalPages, prev + 1))}
                  disabled={teacherPage >= teacherTotalPages || loading}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              {(selectedTeacherCount > 0 || undoStack.length > 0) && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-200 px-3 py-3 shadow-2xl">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    {selectedTeacherCount} selected
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={openTeacherBulkEdit}
                      disabled={selectedTeacherCount === 0 || teacherActionLoading.editing || teacherActionLoading.deleting}
                      className="py-3 px-2 bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={deleteSelectedTeachers}
                      disabled={selectedTeacherCount === 0 || teacherActionLoading.deleting}
                      className="py-3 px-2 bg-red-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleUndo(false)}
                      disabled={undoStack.length === 0 || studentActionLoading.undoing}
                      className="py-3 px-2 bg-amber-500 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                    >
                      Undo {undoStack.length > 0 ? `(${undoStack.length})` : ""}
                    </button>
                    <button
                      onClick={clearTeacherSelection}
                      disabled={selectedTeacherCount === 0}
                      className="py-3 px-2 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== PASSWORD RESET REQUESTS ===== */}
          {activeTab === "reset-requests" && (
            <div className="space-y-4">
              <PageIntro
                title="Password Reset Requests"
                description="Review and approve teacher password reset requests."
                showTitle={false}
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900">Manage Requests</h3>
                <button
                  onClick={fetchTeacherResetRequests}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
                >
                  Refresh
                </button>
              </div>

              {teacherResetRequestsLoading ? (
                <ListSkeleton rows={2} />
              ) : teacherResetRequests.length === 0 ? (
                <div className="saas-card p-4 text-sm text-slate-600">No pending teacher reset requests.</div>
              ) : (
                <div className="space-y-3">
                  {teacherResetRequests.map((reqItem) => (
                    <ListItemCard key={reqItem._id} className="space-y-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 break-words">
                          {reqItem.teacherName || "Teacher"}
                        </div>
                        <div className="text-xs text-slate-600 break-all mt-1">
                          {reqItem.teacherEmail || reqItem.userId || "No identifier"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Requested: {reqItem.createdAt ? new Date(reqItem.createdAt).toLocaleString() : "-"}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="password"
                          value={teacherResetPasswords[reqItem._id] || ""}
                          onChange={(e) =>
                            setTeacherResetPasswords((prev) => ({
                              ...prev,
                              [reqItem._id]: e.target.value,
                            }))
                          }
                          placeholder="Set new password"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => resolveTeacherResetRequest(reqItem)}
                          disabled={resettingTeacherRequestId === String(reqItem._id)}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          {resettingTeacherRequestId === String(reqItem._id) ? "Resetting..." : "Reset Password"}
                        </button>
                      </div>
                    </ListItemCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== USER MANAGEMENT ===== */}
          {activeTab === "user-management" && (
            <div className="space-y-4">
              <PageIntro
                title="User Management"
                description="Manage administrative actions and user workflows."
                showTitle={false}
              />
              <div className="saas-card p-3 md:p-6 space-y-3">
                <p className="text-sm text-slate-600">Choose an action:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {userManagementItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className="text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 transition"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== MIGRATE STUDENT ===== */}
          {activeTab === "migrate-student" && (
            <div className="space-y-6">
              <PageIntro
                title="Migrate Students"
                description="Bulk promote students to new classes and sections."
                showTitle={false}
              />

              <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-md p-3 md:p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Source Class & Section</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">From Class *</label>
                      <select
                        value={studentMigrationForm.fromClass}
                        onChange={(e) =>
                          setStudentMigrationForm((prev) => ({
                            ...prev,
                            fromClass: e.target.value,
                            fromSection: "",
                            selectedStudentIds: [],
                          }))
                        }
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Class --</option>
                        {getUniqueStudentClasses().map((cls) => (
                          <option key={cls} value={cls}>
                            Class {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">From Section *</label>
                      <select
                        value={studentMigrationForm.fromSection}
                        onChange={(e) =>
                          setStudentMigrationForm((prev) => ({
                            ...prev,
                            fromSection: e.target.value,
                            selectedStudentIds: [],
                          }))
                        }
                        disabled={!studentMigrationForm.fromClass}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Select Section --</option>
                        {getUniqueStudentSections(studentMigrationForm.fromClass).map((sec) => (
                          <option key={sec} value={sec}>
                            Section {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Target Class & Section</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">To Class *</label>
                      <input
                        type="text"
                        value={studentMigrationForm.toClass}
                        onChange={(e) => setStudentMigrationForm((prev) => ({ ...prev, toClass: e.target.value }))}
                        placeholder="e.g. 2"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">To Section *</label>
                      <input
                        type="text"
                        value={studentMigrationForm.toSection}
                        onChange={(e) => setStudentMigrationForm((prev) => ({ ...prev, toSection: e.target.value }))}
                        placeholder="e.g. A"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={studentMigrationForm.migrateAll}
                        onChange={(e) =>
                          setStudentMigrationForm((prev) => ({
                            ...prev,
                            migrateAll: e.target.checked,
                            selectedStudentIds: e.target.checked ? [] : prev.selectedStudentIds,
                          }))
                        }
                        className="rounded border-slate-300"
                      />
                      Move all students from selected source
                    </label>
                    <span className="text-xs font-semibold text-slate-500">
                      Matched students: {sourceStudentsForMigration.length}
                    </span>
                  </div>

                  {!studentMigrationForm.migrateAll && (
                    <div className="max-h-56 overflow-auto border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                      {sourceStudentsForMigration.length === 0 ? (
                        <p className="text-sm text-slate-500">Select source class/section to load students.</p>
                      ) : (
                        sourceStudentsForMigration.map((student) => (
                          <label key={student._id} className="flex items-center gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={studentMigrationForm.selectedStudentIds.includes(student._id)}
                              onChange={(e) =>
                                setStudentMigrationForm((prev) => ({
                                  ...prev,
                                  selectedStudentIds: e.target.checked
                                    ? [...prev.selectedStudentIds, student._id]
                                    : prev.selectedStudentIds.filter((id) => id !== student._id),
                                }))
                              }
                            />
                            <span>
                              {student.name} {student.rollNo ? `(Roll: ${student.rollNo})` : ""}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleStudentMigration}
                  disabled={
                    migratingStudents ||
                    !studentMigrationForm.fromClass ||
                    !studentMigrationForm.fromSection ||
                    !String(studentMigrationForm.toClass || "").trim() ||
                    !String(studentMigrationForm.toSection || "").trim()
                  }
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition"
                >
                  {migratingStudents ? "Migrating..." : "Migrate Student"}
                </button>
              </div>
            </div>
          )}

          {/* ===== MIGRATE TEACHER ===== */}
          {activeTab === "migrate-teacher" && (
            <div className="space-y-6">
              <PageIntro
                title="Migrate or Reassign Teacher"
                description="Reassign teachers to new classes and sections."
                showTitle={false}
              />
              
              <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-md p-3 md:p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Select Teacher to Migrate</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Choose Teacher</label>
                    <select
                      value={selectedTeacherForMigration || ""}
                      onChange={(e) => setSelectedTeacherForMigration(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select a Teacher --</option>
                      {teachers.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} (Class: {t.class || "N/A"}, Section: {t.section || "N/A"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTeacherForMigration && teachers.find(t => t._id === selectedTeacherForMigration) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm text-slate-700">
                        <p className="font-semibold mb-2">Current Assignment:</p>
                        <p>
                          <span className="font-semibold">Name:</span> {teachers.find(t => t._id === selectedTeacherForMigration)?.name}
                        </p>
                        <p>
                          <span className="font-semibold">Current Class:</span> {teachers.find(t => t._id === selectedTeacherForMigration)?.class || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">Current Section:</span> {teachers.find(t => t._id === selectedTeacherForMigration)?.section || "N/A"}
                        </p>
                        {teachers.find(t => t._id === selectedTeacherForMigration)?.subject && (
                          <p>
                            <span className="font-semibold">Subject:</span> {teachers.find(t => t._id === selectedTeacherForMigration)?.subject}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Target Class *</label>
                      <select
                        value={migrationToClass}
                        onChange={(e) => {
                          setMigrationToClass(e.target.value);
                          setMigrationToSection(""); // Reset section when class changes
                        }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Class --</option>
                        {getUniqueTeacherClasses().map((cls) => (
                          <option key={cls} value={cls}>
                            Class {cls}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Target Section *</label>
                      <select
                        value={migrationToSection}
                        onChange={(e) => setMigrationToSection(e.target.value)}
                        disabled={!migrationToClass}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Select Section --</option>
                        {getUniqueTeacherSections(migrationToClass).map((sec) => (
                          <option key={sec} value={sec}>
                            Section {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleTeacherMigration}
                    disabled={!selectedTeacherForMigration || !migrationToClass || !migrationToSection || migratingTeacherId}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition"
                  >
                    {migratingTeacherId ? "Migrating..." : "Migrate Teacher"}
                  </button>
                </div>
              </div>

              {teachers.length === 0 && (
                <EmptyState
                  title="No teachers in the system"
                  description="Add a teacher to unlock migration tools."
                />
              )}
            </div>
          )}

          {/* ===== ADD USER ===== */}
          {activeTab === "add-user" && (
            <div className="space-y-4">
              <PageIntro
                title="Add User"
                description="Create new student or teacher accounts."
                showTitle={false}
              />
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setModeAdd("student")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    modeAdd === "student"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Add Student
                </button>
                <button
                  onClick={() => setModeAdd("teacher")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    modeAdd === "teacher"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Add Teacher
                </button>
              </div>

              <div className="saas-card p-3 md:p-6 space-y-4">
                <h3 className="font-bold text-slate-900">Manual Entry</h3>
                <input
                  type="text"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {modeAdd === "student" && (
                  <>
                    <input
                      type="text"
                      placeholder="Class"
                      value={form.className}
                      onChange={(e) => setForm({ ...form, className: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Section"
                      value={form.section}
                      onChange={(e) => setForm({ ...form, section: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Roll No"
                      value={form.rollNo}
                      onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Parent Name"
                      value={form.parentName}
                      onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Parent Phone"
                      value={form.parentPhone}
                      onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                )}

                {modeAdd === "teacher" && (
                  <>
                    <input
                      type="text"
                      placeholder="Class"
                      value={form.className}
                      onChange={(e) => setForm({ ...form, className: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Section"
                      value={form.section}
                      onChange={(e) => setForm({ ...form, section: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                )}

                <button
                  onClick={addUser}
                  disabled={adding}
                  className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                >
                  {adding ? "Adding..." : `Add ${modeAdd.charAt(0).toUpperCase() + modeAdd.slice(1)}`}
                </button>
              </div>
            </div>
          )}

          {/* ===== BULK UPLOAD ===== */}
          {activeTab === "bulk-upload" && (
            <div className="space-y-4">
              <PageIntro
                title="Bulk Upload"
                description="Upload large student and teacher lists in one go."
                showTitle={false}
              />
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setUploadMode("student")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    uploadMode === "student"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  📚 Student Upload
                </button>
                <button
                  onClick={() => setUploadMode("teacher")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    uploadMode === "teacher"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  👨‍🏫 Teacher Upload
                </button>
              </div>

              {/* STUDENT UPLOAD */}
              {uploadMode === "student" && (
                <div className="space-y-4">
                  <div className="saas-card p-3 md:p-6 space-y-4">
                    <h3 className="font-bold text-slate-900">Upload Students (CSV/Excel)</h3>
                    <p className="text-xs text-slate-600">Upload a file with columns: name, email, className/class, section, rollNo, parentName, parentPhone (or phone)</p>
                    <input
                      type="file"
                      onChange={(e) => setStudentFile(e.target.files?.[0])}
                      accept=".csv,.xlsx,.xls"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={previewStudentUpload}
                      disabled={isPreviewLoading || !studentFile}
                      className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                    >
                      {isPreviewLoading ? "Generating Preview..." : "👁️ Preview Import"}
                    </button>
                  </div>

                  {/* PREVIEW TABLE */}
                  {showPreview && previewData && (
                    <div className="saas-card p-3 md:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Import Preview</h3>
                        <button
                          onClick={() => {
                            setShowPreview(false);
                            setPreviewData(null);
                            setPreviewId(null);
                          }}
                          className="text-sm text-slate-600 hover:text-slate-900"
                        >
                          ✕ Close
                        </button>
                      </div>

                      {/* Summary */}
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="text-blue-900 font-semibold">Total Rows</div>
                          <div className="text-lg text-blue-600">{previewData.totalRows}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="text-green-900 font-semibold">Valid</div>
                          <div className="text-lg text-green-600">{previewData.validRows}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                          <div className="text-orange-900 font-semibold">Duplicate</div>
                          <div className="text-lg text-orange-600">{previewData.duplicateRows || 0}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <div className="text-red-900 font-semibold">Invalid</div>
                          <div className="text-lg text-red-600">{previewData.invalidRows}</div>
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Name</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Class</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Section</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Roll No</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Parent Phone</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Status</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.preview && previewData.preview.map((row, idx) => (
                              <tr
                                key={idx}
                                className={`border-b ${
                                  row.status === "valid"
                                    ? "bg-green-50 hover:bg-green-100 text-green-900"
                                    : row.status === "duplicate"
                                    ? "hover:opacity-90 text-orange-900"
                                    : "bg-red-50 hover:bg-red-100 text-red-900"
                                }`}
                                style={
                                  row.status === "duplicate"
                                    ? { backgroundColor: "#fff4e5" }
                                    : {}
                                }
                              >
                                <td className="px-3 py-2 font-medium">{row.name || "-"}</td>
                                <td className="px-3 py-2">{row.class || "-"}</td>
                                <td className="px-3 py-2">{row.section || "-"}</td>
                                <td className="px-3 py-2">{row.rollNo || "-"}</td>
                                <td className="px-3 py-2">{row.parentPhone || "-"}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-bold ${
                                      row.status === "valid"
                                        ? "bg-green-200 text-green-900"
                                        : row.status === "duplicate"
                                        ? "bg-orange-200 text-orange-900"
                                        : "bg-red-200 text-red-900"
                                    }`}
                                  >
                                    {row.status?.toUpperCase() || "UNKNOWN"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  {row.error || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Confirm Button */}
                      <div className="flex gap-2">
                        <button
                          onClick={confirmStudentImport}
                          disabled={isUploading || previewData.validRows === 0 || importResult !== null}
                          className={`flex-1 py-2 text-white font-bold rounded-lg transition text-sm ${
                            importResult
                              ? "bg-slate-400 cursor-not-allowed opacity-50"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {isUploading ? "Importing..." : importResult ? "✓ Import Completed" : `✓ Confirm Import (${previewData.validRows} rows)`}
                        </button>
                        <button
                          onClick={() => {
                            setShowPreview(false);
                            setPreviewData(null);
                            setPreviewId(null);
                            setStudentFile(null);
                            setImportResult(null);
                          }}
                          disabled={isUploading}
                          className="flex-1 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition text-sm disabled:opacity-50"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  {/* IMPORT RESULT */}
                  {importResult && (
                    <div className="saas-card p-3 md:p-6 space-y-4 bg-blue-50 border border-blue-200">
                      <h3 className="font-bold text-blue-900">✓ Import Complete</h3>
                      
                      {/* Skipped warning */}
                      {importResult.skipped > 0 && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                          <p className="text-sm font-semibold text-yellow-900">
                            ⚠️ {importResult.skipped} student{importResult.skipped !== 1 ? "s" : ""} were skipped because they already exist.
                          </p>
                          {importResult.errors && importResult.errors.length > 0 && (
                            <p className="text-xs text-yellow-800 mt-1">
                              {importResult.errors[0].row}: {importResult.errors[0].message}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <div className="text-sm text-slate-600">Imported</div>
                          <div className="text-2xl font-bold text-green-600">{importResult.imported || 0}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <div className="text-sm text-slate-600">Skipped</div>
                          <div className="text-2xl font-bold text-yellow-600">{importResult.skipped || 0}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setImportResult(null);
                          setShowPreview(false);
                          setPreviewData(null);
                        }}
                        className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TEACHER UPLOAD */}
              {uploadMode === "teacher" && (
                <div className="saas-card p-3 md:p-6 space-y-4">
                  <h3 className="font-bold text-slate-900">Upload Teachers (CSV/Excel)</h3>
                  <p className="text-xs text-slate-600">Upload a file with columns: name, email, subject, phone</p>
                  <input
                    type="file"
                    onChange={(e) => setTeacherFile(e.target.files?.[0])}
                    accept=".csv,.xlsx,.xls"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={previewTeacherUpload}
                    disabled={isTeacherPreviewLoading || !teacherFile}
                    className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                  >
                    {isTeacherPreviewLoading ? "Generating Preview..." : "👁️ Preview Import"}
                  </button>

                  {/* TEACHER PREVIEW TABLE */}
                  {showTeacherPreview && teacherPreviewData && (
                    <div className="saas-card p-3 md:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Import Preview</h3>
                        <button
                          onClick={() => {
                            setShowTeacherPreview(false);
                            setTeacherPreviewData(null);
                            setTeacherPreviewId(null);
                          }}
                          className="text-sm text-slate-600 hover:text-slate-900"
                        >
                          ✕ Close
                        </button>
                      </div>

                      {/* Summary */}
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="text-blue-900 font-semibold">Total Rows</div>
                          <div className="text-lg text-blue-600">{teacherPreviewData.totalRows}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="text-green-900 font-semibold">Valid</div>
                          <div className="text-lg text-green-600">{teacherPreviewData.validRows}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                          <div className="text-orange-900 font-semibold">Duplicate</div>
                          <div className="text-lg text-orange-600">{teacherPreviewData.duplicateRows || 0}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <div className="text-red-900 font-semibold">Invalid</div>
                          <div className="text-lg text-red-600">{teacherPreviewData.invalidRows}</div>
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Name</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Email</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Subject</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Phone</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Status</th>
                              <th className="px-3 py-2 text-left text-slate-700 font-semibold">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teacherPreviewData.preview && teacherPreviewData.preview.map((row, idx) => (
                              <tr
                                key={idx}
                                className={`border-b ${
                                  row.status === "valid"
                                    ? "bg-green-50 hover:bg-green-100 text-green-900"
                                    : row.status === "duplicate"
                                    ? "hover:opacity-90 text-orange-900"
                                    : "bg-red-50 hover:bg-red-100 text-red-900"
                                }`}
                                style={
                                  row.status === "duplicate"
                                    ? { backgroundColor: "#fff4e5" }
                                    : {}
                                }
                              >
                                <td className="px-3 py-2 font-medium">{row.name || "-"}</td>
                                <td className="px-3 py-2">{row.email || "-"}</td>
                                <td className="px-3 py-2">{row.subject || "-"}</td>
                                <td className="px-3 py-2">{row.phone || "-"}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-bold ${
                                      row.status === "valid"
                                        ? "bg-green-200 text-green-900"
                                        : row.status === "duplicate"
                                        ? "bg-orange-200 text-orange-900"
                                        : "bg-red-200 text-red-900"
                                    }`}
                                  >
                                    {row.status?.toUpperCase() || "UNKNOWN"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs">
                                  {row.error || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Confirm Button */}
                      <div className="flex gap-2">
                        <button
                          onClick={confirmTeacherImport}
                          disabled={isUploading || teacherPreviewData.validRows === 0 || teacherImportResult !== null}
                          className={`flex-1 py-2 text-white font-bold rounded-lg transition text-sm ${
                            teacherImportResult
                              ? "bg-slate-400 cursor-not-allowed opacity-50"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {isUploading ? "Importing..." : teacherImportResult ? "✓ Import Completed" : `✓ Confirm Import (${teacherPreviewData.validRows} rows)`}
                        </button>
                        <button
                          onClick={() => {
                            setShowTeacherPreview(false);
                            setTeacherPreviewData(null);
                            setTeacherPreviewId(null);
                            setTeacherFile(null);
                            setTeacherImportResult(null);
                          }}
                          disabled={isUploading}
                          className="flex-1 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition text-sm disabled:opacity-50"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  {/* IMPORT RESULT */}
                  {teacherImportResult && (
                    <div className="saas-card p-3 md:p-6 space-y-4 bg-blue-50 border border-blue-200">
                      <h3 className="font-bold text-blue-900">✓ Import Complete</h3>
                      
                      {/* Skipped warning */}
                      {teacherImportResult.skipped > 0 && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                          <p className="text-sm font-semibold text-yellow-900">
                            ⚠️ {teacherImportResult.skipped} teacher{teacherImportResult.skipped !== 1 ? "s" : ""} were skipped because they already exist.
                          </p>
                          {teacherImportResult.errors && teacherImportResult.errors.length > 0 && (
                            <p className="text-xs text-yellow-800 mt-1">
                              {teacherImportResult.errors[0].row}: {teacherImportResult.errors[0].message}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <div className="text-sm text-slate-600">Imported</div>
                          <div className="text-2xl font-bold text-green-600">{teacherImportResult.imported || 0}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <div className="text-sm text-slate-600">Skipped</div>
                          <div className="text-2xl font-bold text-yellow-600">{teacherImportResult.skipped || 0}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setTeacherImportResult(null);
                          setShowTeacherPreview(false);
                          setTeacherPreviewData(null);
                        }}
                        className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ASSIGNMENT SECTION - After Students Upload */}
              {assignmentMode === "students" && uploadedStudents.length > 0 && (
                <div className="saas-card p-3 md:p-6 space-y-4">
                  <h3 className="font-bold text-slate-900">Assign Uploaded Students to Teachers</h3>
                  <p className="text-xs text-slate-600">Select a teacher for each student based on class and section</p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {uploadedStudents.map((student) => (
                      <div key={student._id || student.email} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="font-semibold text-slate-900 text-sm">{student.name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          Class: {student.className} | Section: {student.section}
                        </div>
                        <select
                          onChange={(e) => handleAssignment(student._id || student.email, e.target.value)}
                          value={selectedForAssignment[student._id || student.email] || ""}
                          className="w-full mt-2 px-3 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Teacher</option>
                          {teachers
                            .filter((t) => t.class === student.className && t.section === student.section)
                            .map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.name} - {t.subject || "No Subject"}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={completeAssignments}
                    className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Complete Assignments & Finish
                  </button>
                </div>
              )}

              {/* ASSIGNMENT SECTION - After Teachers Upload */}
              {assignmentMode === "teachers" && uploadedTeachers.length > 0 && (
                <div className="saas-card p-3 md:p-6 space-y-4">
                  <h3 className="font-bold text-slate-900">Assign Uploaded Teachers to Students</h3>
                  <p className="text-xs text-slate-600">Select students for each teacher based on class and section</p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {uploadedTeachers.map((teacher) => (
                      <div key={teacher._id || teacher.email} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="font-semibold text-slate-900 text-sm">{teacher.name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          Class: {teacher.class} | Section: {teacher.section} | Subject: {teacher.subject || "N/A"}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-slate-700 mb-1">Assigned Students:</p>
                          <div className="flex flex-wrap gap-1">
                            {students
                              .filter((s) => s.class === teacher.class && s.section === teacher.section)
                              .slice(0, 5)
                              .map((s) => (
                                <span key={s._id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                  {s.name}
                                </span>
                              ))}
                            {students.filter((s) => s.class === teacher.class && s.section === teacher.section).length > 5 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                +{students.filter((s) => s.class === teacher.class && s.section === teacher.section).length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={completeAssignments}
                    className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Complete Assignments & Finish
                  </button>
                </div>
              )}
            </div>
          )}

                    {/* ===== SUBJECTS ===== */}
          {activeTab === "subjects" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Subjects Management</h2>

              <div className="saas-card p-3 md:p-6 space-y-4">
                <h3 className="font-bold text-slate-900">Filter Subjects</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={subjectFilters.className}
                    onChange={(e) => setSubjectFilters((prev) => ({ ...prev, className: e.target.value, section: "" }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Class</option>
                    {getSubjectClasses().map((cls) => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                  <select
                    value={subjectFilters.section}
                    onChange={(e) => setSubjectFilters((prev) => ({ ...prev, section: e.target.value }))}
                    disabled={!subjectFilters.className}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Select Section</option>
                    {getSubjectSections(subjectFilters.className).map((sec) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => loadSubjects()}
                    disabled={subjectLoading || !subjectFilters.className || !subjectFilters.section}
                    className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                  >
                    {subjectLoading ? "Loading..." : "Load Subjects"}
                  </button>
                </div>
              </div>

              <div className="saas-card p-3 md:p-6 space-y-4">
                <h3 className="font-bold text-slate-900">Add Subject</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={subjectForm.className}
                    onChange={(e) => setSubjectForm((prev) => ({ ...prev, className: e.target.value, section: "" }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Class</option>
                    {getSubjectClasses().map((cls) => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                  <select
                    value={subjectForm.section}
                    onChange={(e) => setSubjectForm((prev) => ({ ...prev, section: e.target.value }))}
                    disabled={!subjectForm.className}
                    className="saas-input disabled:opacity-60"
                  >
                    <option value="">Select Section</option>
                    {getSubjectSections(subjectForm.className).map((sec) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Subject Name"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="saas-input"
                  />
                  <button
                    onClick={addSubject}
                    disabled={subjectSaving}
                    className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition text-sm disabled:opacity-50"
                  >
                    {subjectSaving ? "Saving..." : "Add Subject"}
                  </button>
                </div>
              </div>

              {subjectLoading ? (
                <ListSkeleton rows={3} />
              ) : subjects.length === 0 ? (
                <EmptyState
                  title="No subjects found"
                  description="Add a subject to start building class content."
                />
              ) : (
                <div className="space-y-3">
                  <div className="hidden md:block overflow-x-auto max-h-[520px] saas-card">
                    <table className="saas-table">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Subject Name</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Class</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Section</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((subj) => (
                          <tr key={subj._id} className="border-b border-slate-100">
                            <td className="px-4 py-3 text-slate-900 font-semibold">{subj.name || subj.subjectName || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{subj.class || subj.className || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{subj.section || "-"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openSubjectEdit(subj)}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteSubject(subj)}
                                  disabled={subjectDeletingId === subj._id}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 transition disabled:opacity-50"
                                >
                                  {subjectDeletingId === subj._id ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {subjects.map((subj) => (
                      <ListItemCard key={subj._id}>
                        <div className="font-bold text-slate-900 text-sm">{subj.name || subj.subjectName || "-"}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          Class {subj.class || subj.className || "-"} | Section {subj.section || "-"}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openSubjectEdit(subj)}
                            className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSubject(subj)}
                            disabled={subjectDeletingId === subj._id}
                            className="w-full py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold disabled:opacity-50"
                          >
                            {subjectDeletingId === subj._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </ListItemCard>
                    ))}
                  </div>
                </div>
              )}

              {showSubjectEditModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-lg p-5 space-y-4">
                    <h3 className="font-bold text-slate-900">Edit Subject</h3>
                    <select
                      value={subjectEditForm.className}
                      onChange={(e) => setSubjectEditForm((prev) => ({ ...prev, className: e.target.value, section: "" }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Class</option>
                      {getSubjectClasses().map((cls) => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                    <select
                      value={subjectEditForm.section}
                      onChange={(e) => setSubjectEditForm((prev) => ({ ...prev, section: e.target.value }))}
                      disabled={!subjectEditForm.className}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Select Section</option>
                      {getSubjectSections(subjectEditForm.className).map((sec) => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Subject Name"
                      value={subjectEditForm.name}
                      onChange={(e) => setSubjectEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={updateSubject}
                        disabled={subjectSaving}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {subjectSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setShowSubjectEditModal(false)}
                        className="w-full py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-bold hover:bg-slate-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== VOICE BROADCAST ===== */}
          {activeTab === "voice-broadcast" && (
            <div className="space-y-6">
              <PageIntro
                title="Voice Announcements"
                description="Broadcast voice updates to teachers and students in seconds."
                showTitle={false}
              />
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

              {/* Recording Section */}
              <div className="saas-card p-3 md:p-6 space-y-4">
                <h3 className="font-bold text-slate-900">Send Voice Message</h3>
                
                {/* Broadcast Target Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Send To:</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="voiceBroadcastTarget"
                        value="all"
                        checked={voiceBroadcastTarget === "all"}
                        onChange={(e) => setVoiceBroadcastTarget(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">All Teachers & Students</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="voiceBroadcastTarget"
                        value="teachers"
                        checked={voiceBroadcastTarget === "teachers"}
                        onChange={(e) => setVoiceBroadcastTarget(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">Teachers Only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="voiceBroadcastTarget"
                        value="students"
                        checked={voiceBroadcastTarget === "students"}
                        onChange={(e) => setVoiceBroadcastTarget(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">Students Only</span>
                    </label>
                  </div>
                </div>
                
                {/* Title Input */}
                <div>
                  <label htmlFor="voiceTitle" className="block text-sm font-semibold text-slate-700 mb-2">
                    Announcement Title (Optional)
                  </label>
                  <input
                    type="text"
                    id="voiceTitle"
                    placeholder="e.g., Important school event, Assignment update..."
                    value={voiceAnnouncementTitle}
                    onChange={(e) => setVoiceAnnouncementTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Voice Recorder */}
                <VoiceRecorder
                  onRecordingComplete={async (audioBlob) => {
                    console.log(`✅ ADMIN VOICE: Audio blob ready, size: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
                    
                    if (audioBlob.size === 0) {
                      toast.error("Audio recording is empty. Please record again.");
                      return;
                    }
                    
                    setVoiceLoading(true);
                    try {
                      const formData = new FormData();
                      formData.append("audio", audioBlob, "recording.webm");
                      formData.append("broadcastTo", voiceBroadcastTarget);
                      if (voiceAnnouncementTitle.trim()) {
                        formData.append("title", voiceAnnouncementTitle.trim());
                      }

                      console.log(`📤 ADMIN VOICE: Uploading to /api/admin/voice-announce (broadcastTo: ${voiceBroadcastTarget})`);
                      const res = await fetch(`${API_URL}/api/admin/voice-announce`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData,
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        console.error("UPLOAD FAILED:", data);
                        toast.error(data.error || "Failed to broadcast voice message");
                        return;
                      }
                      console.log(`✅ UPLOAD SUCCESS: Audio URL = ${data.audioUrl}`);
                      
                      // Build success message based on broadcast target
                      let successMsg = "Voice message sent to";
                      if (data.broadcastToTeachers > 0) successMsg += ` ${data.broadcastToTeachers} teacher(s)`;
                      if (data.broadcastToTeachers > 0 && data.broadcastToStudents > 0) successMsg += " and";
                      if (data.broadcastToStudents > 0) successMsg += ` ${data.broadcastToStudents} student(s)`;
                      
                      toast.success(successMsg);

                      // Create notification for this voice message
                      try {
                        const notificationTitle = voiceAnnouncementTitle.trim() || "Voice Message from Admin";
                        const targetRole = voiceBroadcastTarget === "students" ? "student" : voiceBroadcastTarget === "teachers" ? "teacher" : "student";
                        await createNotification(
                          "Voice Message",
                          notificationTitle,
                          targetRole,
                          "voice",
                          token,
                          null,
                          { type: "voice_message", audioUrl: data.audioUrl }
                        );
                        console.log("Notification created for voice message");
                      } catch (notifErr) {
                        console.warn("Failed to create notification (non-critical):", notifErr);
                      }
                      
                      setVoiceAnnouncementTitle("");
                      setAudioFile(null);
                      setVoiceAnnouncementsRefresh(prev => prev + 1); // Trigger refresh in VoiceAnnouncements component
                    } catch (err) {
                      console.error("VOICE BROADCAST ERROR:", err);
                      toast.error("Failed to send voice message");
                    } finally {
                      setVoiceLoading(false);
                    }
                  }}
                  onError={(errMsg) => {
                    toast.error(errMsg);
                  }}
                  disabled={voiceLoading}
                />
              </div>

              {/* Previously Sent Announcements */}
              <VoiceAnnouncements
                key={voiceAnnouncementsRefresh}
                endpoint="/api/admin/voice-announces"
                title="Previously Sent Announcements"
                icon={<Megaphone className="h-4 w-4" />}
                emptyMessage="No announcements sent yet"
              />
            </div>
          )}

          {/* ===== USER TRACKING ===== */}
          {activeTab === "tracking" && (
            <div className="space-y-4">
              <PageIntro
                title="User Tracking"
                description="Track session activity and engagement signals across the school."
                showTitle={false}
              />
              <UserTrackingDashboard token={token} schoolId={schoolId} />
            </div>
          )}
          </Suspense>

          </div>
        </div>

        {showChangePasswordModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-w-md bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-xl p-4 sm:p-5 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
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
                placeholder="Confirm New Password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowChangePasswordModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAdminChangePassword}
                  disabled={changingPassword}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {changingPassword ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showBulkEditModal && (
          <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-5 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedStudentCount === 1 ? "Edit Student" : "Bulk Edit Students"}
              </h3>
              <p className="text-xs text-slate-600">
                {selectedStudentCount} student{selectedStudentCount !== 1 ? "s" : ""} selected. Only filled fields will be updated.
              </p>

              <input
                type="text"
                value={bulkEditForm.class}
                onChange={(e) => setBulkEditForm((prev) => ({ ...prev, class: e.target.value }))}
                placeholder="Class"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={bulkEditForm.section}
                onChange={(e) => setBulkEditForm((prev) => ({ ...prev, section: e.target.value }))}
                placeholder="Section"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={bulkEditForm.assignedTeacher}
                onChange={(e) => setBulkEditForm((prev) => ({ ...prev, assignedTeacher: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Assigned Teacher (optional)</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} ({teacher.class || "N/A"}-{teacher.section || "N/A"})
                  </option>
                ))}
              </select>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBulkEdit}
                  disabled={studentActionLoading.editing}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {studentActionLoading.editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditStudentModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-xl overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Edit Student</h3>
                <button
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editStudentForm.name}
                  onChange={(e) => setEditStudentForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Student Name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={editStudentForm.rollNo}
                  onChange={(e) => setEditStudentForm((prev) => ({ ...prev, rollNo: e.target.value }))}
                  placeholder="Roll No"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={editStudentForm.className}
                  onChange={(e) => setEditStudentForm((prev) => ({ ...prev, className: e.target.value }))}
                  placeholder="Class"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={editStudentForm.section}
                  onChange={(e) => setEditStudentForm((prev) => ({ ...prev, section: e.target.value }))}
                  placeholder="Section"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                />
                <select
                  value={editStudentForm.status}
                  onChange={(e) => setEditStudentForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
                  {editStudentLoading ? "Saving..." : "Save Student"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showTeacherBulkEditModal && (
          <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-5 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedTeacherCount === 1 ? "Edit Teacher" : "Bulk Edit Teachers"}
              </h3>
              <p className="text-xs text-slate-600">
                {selectedTeacherCount} teacher{selectedTeacherCount !== 1 ? "s" : ""} selected. Only filled fields will be updated.
              </p>

              <input
                type="text"
                value={teacherBulkEditForm.assignedClass}
                onChange={(e) => setTeacherBulkEditForm((prev) => ({ ...prev, assignedClass: e.target.value }))}
                placeholder="Assigned Class"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={teacherBulkEditForm.assignedSection}
                onChange={(e) => setTeacherBulkEditForm((prev) => ({ ...prev, assignedSection: e.target.value }))}
                placeholder="Assigned Section"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={teacherBulkEditForm.subjects}
                onChange={(e) => setTeacherBulkEditForm((prev) => ({ ...prev, subjects: e.target.value }))}
                placeholder="Subjects (comma separated)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={teacherBulkEditForm.phone}
                onChange={(e) => setTeacherBulkEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone Number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowTeacherBulkEditModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTeacherBulkEdit}
                  disabled={teacherActionLoading.editing}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {teacherActionLoading.editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={showDeleteConfirm}
          title="Delete Students"
          message={`Delete ${selectedStudentCount} student${selectedStudentCount !== 1 ? "s" : ""}?`}
          warning="Students will be soft-deleted and can be restored using Undo for a short time."
          confirmText={studentActionLoading.deleting ? "Deleting..." : "Delete"}
          isLoading={studentActionLoading.deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDeleteSelectedStudents}
        />

        <ConfirmationModal
          isOpen={showTeacherDeleteConfirm}
          title="Delete Teachers"
          message={`Delete ${selectedTeacherCount} teacher${selectedTeacherCount !== 1 ? "s" : ""}?`}
          warning="Teachers will be soft-deleted and can be restored using Undo for a short time."
          confirmText={teacherActionLoading.deleting ? "Deleting..." : "Delete"}
          isLoading={teacherActionLoading.deleting}
          onCancel={() => setShowTeacherDeleteConfirm(false)}
          onConfirm={confirmDeleteSelectedTeachers}
        />
      </div>
    </div>
  );
}

















