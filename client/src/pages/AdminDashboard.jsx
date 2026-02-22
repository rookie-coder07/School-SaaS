import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import VoiceRecorder from "../components/VoiceRecorder";
import VoiceAnnouncements from "../components/VoiceAnnouncements";
import NotificationBell from "../components/NotificationBell";
import NotificationDropdown from "../components/NotificationDropdown";
import UserTrackingDashboard from "../components/UserTrackingDashboard";
import { useToast } from "../components/ToastProvider";
import { createNotification } from "../utils/notificationHelper";
import { sessionTracker } from "../utils/sessionTracker";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // Dashboard data
  const [admissionCount, setAdmissionCount] = useState(0);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");

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
    password: "",
    parentName: "",
    phone: "",
  });

  // Subjects
  const [subjects, setSubjects] = useState([]);
  const [subjects_form, setSubjectsForm] = useState({
    className: "",
    section: "",
    newSubject: "",
  });
  const [editSubject, setEditSubject] = useState(null);
  
  // Multi-select delete
  const [selectedStudents, setSelectedStudents] = useState({});
  const [selectedTeachers, setSelectedTeachers] = useState({});
  const [deletingIds, setDeletingIds] = useState([]);

  // Voice Broadcast
  const [audioFile, setAudioFile] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [broadcastToAll, setBroadcastToAll] = useState(true);
  const [voiceAnnouncementTitle, setVoiceAnnouncementTitle] = useState("");
  const [voiceAnnouncementsRefresh, setVoiceAnnouncementsRefresh] = useState(0);
  const [voiceBroadcastTarget, setVoiceBroadcastTarget] = useState("all"); // "all", "teachers", "students"
  
  // Teacher Migration
  const [selectedTeacherForMigration, setSelectedTeacherForMigration] = useState(null);
  const [migrationToClass, setMigrationToClass] = useState("");
  const [migrationToSection, setMigrationToSection] = useState("");
  const [migratingTeacherId, setMigratingTeacherId] = useState(null);
  
  const admin = JSON.parse(localStorage.getItem("adminData") || "{}");
  const token = localStorage.getItem("adminToken");

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

  // Handle navigation from notification clicks via query params
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (sectionParam) {
      console.log("📍 Admin Dashboard: Navigating to section from query param:", sectionParam);
      setActiveTab(sectionParam);
    }
  }, [searchParams]);

  // Fetch unread notification count on mount and when notifications panel opens
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

  // Toggle student selection
  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Toggle teacher selection
  const toggleTeacherSelection = (teacherId) => {
    setSelectedTeachers(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  // Select all students
  const selectAllStudents = () => {
    if (getFilteredStudents().length === Object.keys(selectedStudents).filter(id => selectedStudents[id]).length) {
      // Deselect all
      setSelectedStudents({});
    } else {
      // Select all
      const newSelection = {};
      getFilteredStudents().forEach(s => {
        newSelection[s._id] = true;
      });
      setSelectedStudents(newSelection);
    }
  };

  // Select all teachers
  const selectAllTeachers = () => {
    if (getFilteredTeachers().length === Object.keys(selectedTeachers).filter(id => selectedTeachers[id]).length) {
      // Deselect all
      setSelectedTeachers({});
    } else {
      // Select all
      const newSelection = {};
      getFilteredTeachers().forEach(t => {
        newSelection[t._id] = true;
      });
      setSelectedTeachers(newSelection);
    }
  };

  // Delete selected students
  const deleteSelectedStudents = async () => {
    const selectedIds = Object.keys(selectedStudents).filter(id => selectedStudents[id]);
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one student to delete");
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} student(s)? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingIds(selectedIds);

    let successCount = 0;
    let failureCount = 0;
    const failedNames = [];

    for (const studentId of selectedIds) {
      try {
        const res = await fetch(`${API_URL}/api/admin/students/${studentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          successCount++;
        } else {
          failureCount++;
          const student = students.find(s => s._id === studentId);
          failedNames.push(student?.name || "Unknown");
        }
      } catch (err) {
        failureCount++;
        const student = students.find(s => s._id === studentId);
        failedNames.push(student?.name || "Unknown");
      }
    }

    setDeletingIds([]);
    setSelectedStudents({});

    if (failureCount === 0) {
      toast.success(`Successfully deleted ${successCount} student(s)`);
      // Refresh student list
      setTimeout(() => {
        const fetchAllUsers = async () => {
          try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              setStudents(Array.isArray(data.students) ? data.students : []);
              setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
            }
          } catch (err) {
            console.error("Refresh error:", err);
          }
        };
        fetchAllUsers();
      }, 500);
    } else {
      toast.error(`Deleted ${successCount}, Failed ${failureCount}: ${failedNames.join(", ")}`);
    }
  };

  // Delete selected teachers
  const deleteSelectedTeachers = async () => {
    const selectedIds = Object.keys(selectedTeachers).filter(id => selectedTeachers[id]);
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one teacher to delete");
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} teacher(s)? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingIds(selectedIds);

    let successCount = 0;
    let failureCount = 0;
    const failedNames = [];

    for (const teacherId of selectedIds) {
      try {
        const res = await fetch(`${API_URL}/api/admin/teachers/${teacherId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          successCount++;
        } else {
          failureCount++;
          const teacher = teachers.find(t => t._id === teacherId);
          failedNames.push(teacher?.name || "Unknown");
        }
      } catch (err) {
        failureCount++;
        const teacher = teachers.find(t => t._id === teacherId);
        failedNames.push(teacher?.name || "Unknown");
      }
    }

    setDeletingIds([]);
    setSelectedTeachers({});

    if (failureCount === 0) {
      toast.success(`Successfully deleted ${successCount} teacher(s)`);
      // Refresh teacher list
      setTimeout(() => {
        const fetchAllUsers = async () => {
          try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              setStudents(Array.isArray(data.students) ? data.students : []);
              setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
            }
          } catch (err) {
            console.error("Refresh error:", err);
          }
        };
        fetchAllUsers();
      }, 500);
    } else {
      toast.error(`Deleted ${successCount}, Failed ${failureCount}: ${failedNames.join(", ")}`);
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
        
        // Refresh teacher list
        const refreshRes = await fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setTeachers(Array.isArray(refreshData.teachers) ? refreshData.teachers : []);
        }
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

  // Fetch all users (students and teachers) from single endpoint
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setStudents([]);
          setTeachers([]);
          return;
        }
        const data = await res.json();
        
        // Apply search filter if needed
        let filteredStudents = Array.isArray(data.students) ? data.students : [];
        let filteredTeachers = Array.isArray(data.teachers) ? data.teachers : [];
        
        if (search) {
          const searchLower = search.toLowerCase();
          filteredStudents = filteredStudents.filter(s => 
            s.name?.toLowerCase().includes(searchLower) || 
            s.email?.toLowerCase().includes(searchLower)
          );
          filteredTeachers = filteredTeachers.filter(t => 
            t.name?.toLowerCase().includes(searchLower) || 
            t.email?.toLowerCase().includes(searchLower)
          );
        }
        
        setStudents(filteredStudents);
        setTeachers(filteredTeachers);
        setAdmissionCount(filteredStudents.length);
      } catch (err) {
        console.error("USERS FETCH ERROR:", err);
        setStudents([]);
        setTeachers([]);
      }
    };
    
    if (token) fetchAllUsers();
  }, [token, search]);

  // Fetch subjects
  useEffect(() => {
    if (activeTab !== "subjects") return;
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setSubjects([]);
          return;
        }
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : data.subjects || []);
      } catch (err) {
        console.error("SUBJECTS FETCH ERROR:", err);
        setSubjects([]);
      }
    };
    fetchSubjects();
  }, [activeTab, token]);

  // Add user
  const addUser = async () => {
    if (!form.name || !form.email) {
      toast.warning("Name and email required");
      return;
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
        password: "",
        parentName: "",
        phone: "",
      });
    } catch (err) {
      console.error("ADD USER ERROR:", err);
      toast.error("Failed to add user");
    } finally {
      setAdding(false);
    }
  };

  // Upload file (for Add User tab)
  const uploadFile = async () => {
    const file = modeAdd === "student" ? studentFile : teacherFile;
    if (!file) {
      toast.warning("Please select a file");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const endpoint = modeAdd === "student" ? "upload-students" : "upload-teachers";
      const res = await fetch(`${API_URL}/api/admin/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }
      toast.success("File uploaded successfully");
      if (modeAdd === "student") setStudentFile(null);
      else setTeacherFile(null);
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
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
      
      // Refresh student list after a short delay
      setTimeout(() => {
        const fetchAllUsers = async () => {
          try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
              setStudents([]);
              setTeachers([]);
              return;
            }
            const data = await res.json();
            let filteredStudents = Array.isArray(data.students) ? data.students : [];
            let filteredTeachers = Array.isArray(data.teachers) ? data.teachers : [];
            
            if (search) {
              const searchLower = search.toLowerCase();
              filteredStudents = filteredStudents.filter(s => 
                s.name?.toLowerCase().includes(searchLower) || 
                s.email?.toLowerCase().includes(searchLower)
              );
              filteredTeachers = filteredTeachers.filter(t => 
                t.name?.toLowerCase().includes(searchLower) || 
                t.email?.toLowerCase().includes(searchLower)
              );
            }
            
            setStudents(filteredStudents);
            setTeachers(filteredTeachers);
          } catch (err) {
            console.error("FETCH ERROR:", err);
          }
        };
        fetchAllUsers();
      }, 500);
    } catch (err) {
      console.error("BULK UPLOAD STUDENTS ERROR:", err);
      toast.error(`Upload failed: ${err.message}`);
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
      
      // Refresh teacher list after a short delay
      setTimeout(() => {
        const fetchAllUsers = async () => {
          try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
              setStudents([]);
              setTeachers([]);
              return;
            }
            const data = await res.json();
            let filteredStudents = Array.isArray(data.students) ? data.students : [];
            let filteredTeachers = Array.isArray(data.teachers) ? data.teachers : [];
            
            if (search) {
              const searchLower = search.toLowerCase();
              filteredStudents = filteredStudents.filter(s => 
                s.name?.toLowerCase().includes(searchLower) || 
                s.email?.toLowerCase().includes(searchLower)
              );
              filteredTeachers = filteredTeachers.filter(t => 
                t.name?.toLowerCase().includes(searchLower) || 
                t.email?.toLowerCase().includes(searchLower)
              );
            }
            
            setStudents(filteredStudents);
            setTeachers(filteredTeachers);
          } catch (err) {
            console.error("FETCH ERROR:", err);
          }
        };
        fetchAllUsers();
      }, 500);
    } catch (err) {
      console.error("BULK UPLOAD TEACHERS ERROR:", err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
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

  // Add/Edit subject
  const saveSubject = async () => {
    if (!subjects_form.className || !subjects_form.section || !subjects_form.newSubject) {
      toast.warning("All fields required");
      return;
    }
    try {
      const method = editSubject ? "PUT" : "POST";
      const url = editSubject
        ? `${API_URL}/api/admin/subjects/${editSubject._id}`
        : `${API_URL}/api/admin/subjects`;
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class: subjects_form.className,
          section: subjects_form.section,
          subjectName: subjects_form.newSubject,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Save failed");
        return;
      }
      toast.success("Subject saved successfully");
      setSubjectsForm({ className: "", section: "", newSubject: "" });
      setEditSubject(null);
      const res2 = await fetch(`${API_URL}/api/admin/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res2.json();
      setSubjects(Array.isArray(data) ? data : data.subjects || []);
    } catch (err) {
      console.error("SAVE SUBJECT ERROR:", err);
      toast.error("Failed to save subject");
    }
  };

  // Helper functions to get unique classes and sections
  const getUniqueStudentClasses = () => {
    const classes = new Set(students.map((s) => s.class || s.className).filter(Boolean));
    return Array.from(classes).sort();
  };

  const getUniqueStudentSections = (className) => {
    if (!className) return [];
    const sections = new Set(
      students
        .filter((s) => (s.class || s.className) === className)
        .map((s) => s.section)
        .filter(Boolean)
    );
    return Array.from(sections).sort();
  };

  const getUniqueTeacherClasses = () => {
    const classes = new Set(teachers.map((t) => t.class).filter(Boolean));
    return Array.from(classes).sort();
  };

  const getUniqueTeacherSections = (className) => {
    if (!className) return [];
    const sections = new Set(
      teachers
        .filter((t) => t.class === className)
        .map((t) => t.section)
        .filter(Boolean)
    );
    return Array.from(sections).sort();
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
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "students", label: "Students" },
    { id: "teachers", label: "Teachers" },
    { id: "migrate-teacher", label: "Migrate Teacher" },
    { id: "add-user", label: "Add User" },
    { id: "bulk-upload", label: "Bulk Upload" },
    { id: "subjects", label: "Subjects" },
    { id: "voice-broadcast", label: "Voice Broadcast" },
    { id: "tracking", label: "User Tracking" },
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
          <h2 className="text-xl font-black text-cyan-400 tracking-tight">Admin</h2>
          <p className="text-xs text-slate-400 mt-2">{admin?.email || "Administrator"}</p>
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
                  ? "bg-slate-700 text-cyan-400"
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
            token={localStorage.getItem("adminToken")}
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
              <h2 className="text-lg font-bold text-slate-900">Dashboard Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admissions</div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{admissionCount}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{students.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Teachers</div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{teachers.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* ===== STUDENTS ===== */}
          {activeTab === "students" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Students List</h2>
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Filter Row */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={studentFilterClass}
                  onChange={(e) => {
                    setStudentFilterClass(e.target.value);
                    setStudentFilterSection("");
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">All Sections</option>
                  {getUniqueStudentSections(studentFilterClass).map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {getFilteredStudents().length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No students found
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600 font-semibold">
                      Showing {getFilteredStudents().length} student{getFilteredStudents().length !== 1 ? "s" : ""}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getFilteredStudents().length > 0 && getFilteredStudents().length === Object.keys(selectedStudents).filter(id => selectedStudents[id]).length}
                        onChange={selectAllStudents}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-slate-600">Select All</span>
                    </label>
                  </div>

                  {/* Delete toolbar */}
                  {Object.values(selectedStudents).some(v => v) && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-semibold text-red-700">
                        {Object.values(selectedStudents).filter(v => v).length} student(s) selected
                      </span>
                      <button
                        onClick={deleteSelectedStudents}
                        disabled={deletingIds.length > 0}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {deletingIds.length > 0 ? "Deleting..." : "Delete Selected"}
                      </button>
                    </div>
                  )}

                  {getFilteredStudents().map((s) => (
                    <div key={s._id} className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-3 ${selectedStudents[s._id] ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                      <input
                        type="checkbox"
                        checked={selectedStudents[s._id] || false}
                        onChange={() => toggleStudentSelection(s._id)}
                        disabled={deletingIds.length > 0}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          Email: {s.email} | Class: {s.class || s.className || "N/A"} | Section: {s.section || "N/A"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== TEACHERS ===== */}
          {activeTab === "teachers" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Teachers List</h2>
              <input
                type="text"
                placeholder="Search teachers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Filter Row */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={teacherFilterClass}
                  onChange={(e) => {
                    setTeacherFilterClass(e.target.value);
                    setTeacherFilterSection("");
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">All Sections</option>
                  {getUniqueTeacherSections(teacherFilterClass).map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {getFilteredTeachers().length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                  No teachers found
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600 font-semibold">
                      Showing {getFilteredTeachers().length} teacher{getFilteredTeachers().length !== 1 ? "s" : ""}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getFilteredTeachers().length > 0 && getFilteredTeachers().length === Object.keys(selectedTeachers).filter(id => selectedTeachers[id]).length}
                        onChange={selectAllTeachers}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-slate-600">Select All</span>
                    </label>
                  </div>

                  {/* Delete toolbar */}
                  {Object.values(selectedTeachers).some(v => v) && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-semibold text-red-700">
                        {Object.values(selectedTeachers).filter(v => v).length} teacher(s) selected
                      </span>
                      <button
                        onClick={deleteSelectedTeachers}
                        disabled={deletingIds.length > 0}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {deletingIds.length > 0 ? "Deleting..." : "Delete Selected"}
                      </button>
                    </div>
                  )}

                  {getFilteredTeachers().map((t) => (
                    <div key={t._id} className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-3 ${selectedTeachers[t._id] ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                      <input
                        type="checkbox"
                        checked={selectedTeachers[t._id] || false}
                        onChange={() => toggleTeacherSelection(t._id)}
                        disabled={deletingIds.length > 0}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          Email: {t.email} | Class: {t.class || "N/A"} | Section: {t.section || "N/A"}
                          {t.subject && ` | Subject: ${t.subject}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== MIGRATE TEACHER ===== */}
          {activeTab === "migrate-teacher" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Migrate/Reassign Teacher</h2>
              
              <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6">
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
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
                  No teachers found in the system.
                </div>
              )}
            </div>
          )}

          {/* ===== ADD USER ===== */}
          {activeTab === "add-user" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Add User</h2>
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

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
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
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              <h2 className="text-lg font-bold text-slate-900">Bulk Upload</h2>
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
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900">Upload Students (CSV/Excel)</h3>
                  <p className="text-xs text-slate-600">Upload a file with columns: name, email, className, section, rollNo, parentName, phone</p>
                  <input
                    type="file"
                    onChange={(e) => setStudentFile(e.target.files?.[0])}
                    accept=".csv,.xlsx,.xls"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={bulkUploadStudents}
                    disabled={isUploading}
                    className="w-full py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                  >
                    {isUploading ? "Uploading..." : "Upload Students"}
                  </button>
                </div>
              )}

              {/* TEACHER UPLOAD */}
              {uploadMode === "teacher" && (
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900">Upload Teachers (CSV/Excel)</h3>
                  <p className="text-xs text-slate-600">Upload a file with columns: name, email, class, section, subject</p>
                  <input
                    type="file"
                    onChange={(e) => setTeacherFile(e.target.files?.[0])}
                    accept=".csv,.xlsx,.xls"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={bulkUploadTeachers}
                    disabled={isUploading}
                    className="w-full py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                  >
                    {isUploading ? "Uploading..." : "Upload Teachers"}
                  </button>
                </div>
              )}

              {/* ASSIGNMENT SECTION - After Students Upload */}
              {assignmentMode === "students" && uploadedStudents.length > 0 && (
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
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
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
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
              <h2 className="text-lg font-bold text-slate-900">Manage Subjects</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900">{editSubject ? "Edit" : "Add"} Subject</h3>
                <input
                  type="text"
                  placeholder="Class"
                  value={subjects_form.className}
                  onChange={(e) => setSubjectsForm({ ...subjects_form, className: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Section"
                  value={subjects_form.section}
                  onChange={(e) => setSubjectsForm({ ...subjects_form, section: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Subject Name"
                  value={subjects_form.newSubject}
                  onChange={(e) => setSubjectsForm({ ...subjects_form, newSubject: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveSubject}
                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    {editSubject ? "Update" : "Add"}
                  </button>
                  {editSubject && (
                    <button
                      onClick={() => {
                        setEditSubject(null);
                        setSubjectsForm({ className: "", section: "", newSubject: "" });
                      }}
                      className="flex-1 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {subjects.length === 0 ? (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
                    No subjects added yet
                  </div>
                ) : (
                  subjects.map((subj) => (
                    <div key={subj._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{subj.subjectName}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          Class {subj.className} • Section {subj.section}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditSubject(subj);
                          setSubjectsForm({
                            className: subj.className,
                            section: subj.section,
                            newSubject: subj.subjectName,
                          });
                        }}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition"
                      >
                        Edit
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ===== VOICE BROADCAST ===== */}
          {activeTab === "voice-broadcast" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">🎙️ Voice Announcements</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

              {/* Recording Section */}
              <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900">📢 Send Voice Message</h3>
                
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
                        console.error("❌ UPLOAD FAILED:", data);
                        toast.error(data.error || "Failed to broadcast voice message");
                        return;
                      }
                      console.log(`✅ UPLOAD SUCCESS: Audio URL = ${data.audioUrl}`);
                      
                      // Build success message based on broadcast target
                      let successMsg = "✅ Voice message sent to";
                      if (data.broadcastToTeachers > 0) successMsg += ` ${data.broadcastToTeachers} teacher(s)`;
                      if (data.broadcastToTeachers > 0 && data.broadcastToStudents > 0) successMsg += " and";
                      if (data.broadcastToStudents > 0) successMsg += ` ${data.broadcastToStudents} student(s)`;
                      
                      toast.success(successMsg);

                      // Create notification for this voice message
                      try {
                        const notificationTitle = voiceAnnouncementTitle.trim() || "Voice Message from Admin";
                        const targetRole = voiceBroadcastTarget === "students" ? "student" : voiceBroadcastTarget === "teachers" ? "teacher" : "student";
                        await createNotification(
                          "🎤 Voice Message",
                          notificationTitle,
                          targetRole,
                          "voice",
                          token,
                          null,
                          { type: "voice_message", audioUrl: data.audioUrl }
                        );
                        console.log("✅ Notification created for voice message");
                      } catch (notifErr) {
                        console.warn("⚠️ Failed to create notification (non-critical):", notifErr);
                      }
                      
                      setVoiceAnnouncementTitle("");
                      setAudioFile(null);
                      setVoiceAnnouncementsRefresh(prev => prev + 1); // Trigger refresh in VoiceAnnouncements component
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
                  disabled={voiceLoading}
                />
              </div>

              {/* Previously Sent Announcements */}
              <VoiceAnnouncements 
                key={voiceAnnouncementsRefresh}
                endpoint="/api/admin/voice-announces"
                title="📋 Previously Sent Announcements"
                icon="🎙️"
                emptyMessage="No announcements sent yet"
              />
            </div>
          )}

          {/* ===== USER TRACKING ===== */}
          {activeTab === "tracking" && (
            <UserTrackingDashboard token={token} schoolId={schoolId} />
          )}
        </div>
      </div>
    </div>
  );
}
