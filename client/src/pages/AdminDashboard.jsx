import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

<<<<<<< HEAD
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Dashboard data
  const [admissionCount, setAdmissionCount] = useState(0);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");

  // File upload
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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
=======
function UsersList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Search & pagination
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [teacherPage, setTeacherPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setError("Admin not logged in");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setStudents(Array.isArray(data.students) ? data.students : []);
        setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
      } catch (err) {
        console.error("USERS FETCH ERROR:", err);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // reset pages when search or pageSize changes
  useEffect(() => {
    setTeacherPage(1);
    setStudentPage(1);
  }, [search, pageSize]);

  if (loading) return <div style={{ marginTop: 8 }}>Loading users...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  const normalize = (v) => (v || "").toString().toLowerCase();
  const q = search.trim().toLowerCase();

  const filteredTeachers = teachers.filter((t) => {
    if (!q) return true;
    return (
      normalize(t.name).includes(q) ||
      normalize(t.subject).includes(q) ||
      normalize(t.class).includes(q) ||
      normalize(t.section).includes(q)
    );
  });

  const filteredStudents = students.filter((s) => {
    if (!q) return true;
    return (
      normalize(s.name).includes(q) ||
      normalize(s.class).includes(q) ||
      normalize(s.section).includes(q) ||
      normalize(s.rollNo).includes(q)
    );
  });

  const tPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const sPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));

  const teachersPageSlice = filteredTeachers.slice((teacherPage - 1) * pageSize, teacherPage * pageSize);
  const studentsPageSlice = filteredStudents.slice((studentPage - 1) * pageSize, studentPage * pageSize);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search by name, class, section, subject..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...styles.input, flex: 1, minWidth: 160 }} />
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ padding: 10, borderRadius: 8, border: "1px solid #e6edf3" }}>
          <option value={5}>5 / page</option>
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
        </select>
      </div>

      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Teachers</h3>
        {filteredTeachers.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>No teachers found</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {teachersPageSlice.map((t) => (
              <div key={t._id} style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e6edf3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t.subject || ""} • Class {t.class || "-"} • Section {t.section || "-"}</div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <button disabled={teacherPage <= 1} onClick={() => setTeacherPage((p) => Math.max(1, p - 1))} style={styles.secondaryBtn}>Prev</button>
              <div style={{ fontSize: 13, color: "#64748b" }}>{teacherPage} / {tPages}</div>
              <button disabled={teacherPage >= tPages} onClick={() => setTeacherPage((p) => Math.min(tPages, p + 1))} style={styles.secondaryBtn}>Next</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Students</h3>
        {filteredStudents.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>No students found</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {studentsPageSlice.map((s) => (
              <div key={s._id} style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e6edf3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Class {s.class || "-"} • Section {s.section || "-"} {s.rollNo ? `• Roll ${s.rollNo}` : ""}</div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <button disabled={studentPage <= 1} onClick={() => setStudentPage((p) => Math.max(1, p - 1))} style={styles.secondaryBtn}>Prev</button>
              <div style={{ fontSize: 13, color: "#64748b" }}>{studentPage} / {sPages}</div>
              <button disabled={studentPage >= sPages} onClick={() => setStudentPage((p) => Math.min(sPages, p + 1))} style={styles.secondaryBtn}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [admissionCount, setAdmissionCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

  // Subject management state
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  const [subjectName, setSubjectName] = useState("");
  const [subjectClass, setSubjectClass] = useState("");
  const [subjectSection, setSubjectSection] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectLoading, setSubjectLoading] = useState(false);
<<<<<<< HEAD

  // Modals
  const [deleteModal, setDeleteModal] = useState(null);
  const [reassignModal, setReassignModal] = useState(null);
  const [reassignForm, setReassignForm] = useState({ toClass: "", toSection: "" });
  const [migrateModal, setMigrateModal] = useState(null);
  const [migrateForm, setMigrateForm] = useState({
    fromClass: "",
    fromSection: "",
    toClass: "",
    toSection: "",
    migrateAll: false,
  });

  // Fetch admissions count
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch(`${API_URL}/api/admissions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => setAdmissionCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setAdmissionCount(0));
  }, []);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setStudents(Array.isArray(data.students) ? data.students : []);
      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  // Filtered users
  const normalize = (v) => (v || "").toString().toLowerCase();
  const q = search.trim().toLowerCase();

  const filteredTeachers = teachers
    .filter((t) => {
      if (!q) return true;
      return (
        normalize(t.name).includes(q) ||
        normalize(t.subject).includes(q) ||
        normalize(t.class).includes(q) ||
        normalize(t.section).includes(q)
      );
    })
    .sort((a, b) => {
      if (a.class !== b.class) return (a.class || "").localeCompare(b.class || "");
      if (a.section !== b.section) return (a.section || "").localeCompare(b.section || "");
      return (a.name || "").localeCompare(b.name || "");
    });

  const filteredStudents = students
    .filter((s) => {
      if (!q) return true;
      return (
        normalize(s.name).includes(q) ||
        normalize(s.class).includes(q) ||
        normalize(s.section).includes(q) ||
        normalize(s.rollNo).includes(q)
      );
    })
    .sort((a, b) => {
      if (a.class !== b.class) return (a.class || "").localeCompare(b.class || "");
      if (a.section !== b.section) return (a.section || "").localeCompare(b.section || "");
      if (a.rollNo !== b.rollNo) return String(a.rollNo || "").localeCompare(String(b.rollNo || ""));
      return (a.name || "").localeCompare(b.name || "");
    });

  // Handlers
=======
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
<<<<<<< HEAD
      console.error("Logout error:", err);
    }
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  const handleDelete = async (type, id, name) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const url =
        type === "teacher"
          ? `${API_URL}/api/admin/teachers/${id}`
          : `${API_URL}/api/admin/students/${id}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Delete failed");

      setMessage(`✅ ${type === "teacher" ? "Teacher" : "Student"} ${name} deleted`);
      setDeleteModal(null);
      setTimeout(() => {
        setMessage("");
        fetchUsers();
      }, 1500);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  const handleReassign = async () => {
    if (!reassignModal || !reassignForm.toClass || !reassignForm.toSection) {
      setMessage("❌ Please fill in all fields");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/teachers/${reassignModal.teacherId}/reassign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromClass: reassignModal.currentClass,
          fromSection: reassignModal.currentSection,
          toClass: reassignForm.toClass,
          toSection: reassignForm.toSection,
        }),
      });

      if (!res.ok) throw new Error("Reassignment failed");

      setMessage(`✅ Teacher reassigned successfully`);
      setReassignModal(null);
      setReassignForm({ toClass: "", toSection: "" });
      setTimeout(() => {
        setMessage("");
        fetchUsers();
      }, 1500);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  const handleMigrate = async () => {
    if (!migrateForm.fromClass || !migrateForm.fromSection || !migrateForm.toClass || !migrateForm.toSection) {
      setMessage("❌ Please fill in all fields");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/students/migrate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromClass: migrateForm.fromClass,
          fromSection: migrateForm.fromSection,
          toClass: migrateForm.toClass,
          toSection: migrateForm.toSection,
          migrateAll: migrateForm.migrateAll,
        }),
      });

      if (!res.ok) throw new Error("Migration failed");

      const result = await res.json();
      setMessage(`✅ ${result.migratedCount} student(s) migrated`);
      setMigrateModal(null);
      setMigrateForm({ fromClass: "", fromSection: "", toClass: "", toSection: "", migrateAll: false });
      setTimeout(() => {
        setMessage("");
        fetchUsers();
      }, 1500);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  const uploadTeachers = async () => {
    if (!teacherFile) return alert("Select file");
    const token = localStorage.getItem("adminToken");
=======
      console.error("Logout API error:", err);
    } finally {
      localStorage.removeItem("adminToken");
      navigate("/");
    }
  };
  // Manual add UI state
  const [modeAdd, setModeAdd] = useState("student"); // 'student' or 'teacher'
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    className: "",
    section: "",
    rollNo: "",
    subject: "",
    password: "",
  });

  /* ================= FETCH ADMISSIONS ================= */

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch(`${API_URL}/api/admissions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) =>
        setAdmissionCount(Array.isArray(data) ? data.length : 0)
      )
      .catch(() => setAdmissionCount(0));
  }, []);

  /* ================= UPLOAD TEACHERS ================= */

  const uploadTeachers = async () => {
    if (!teacherFile) return alert("Select teacher Excel file");

    const token = localStorage.getItem("adminToken");
    if (!token) return alert("Admin not logged in");

>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    const formData = new FormData();
    formData.append("file", teacherFile);

    setIsUploading(true);
    try {
<<<<<<< HEAD
      const res = await fetch(`${API_URL}/api/admin/upload-teachers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        alert("✅ Teachers uploaded");
        setTeacherFile(null);
      }
    } catch (err) {
      alert("Upload failed");
=======
      const res = await fetch(
        `${API_URL}/api/admin/upload-teachers`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error();
      alert("✅ Teachers uploaded successfully");
    } catch {
      alert("Teacher upload failed");
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    } finally {
      setIsUploading(false);
    }
  };

<<<<<<< HEAD
  const uploadStudents = async () => {
    if (!studentFile) return alert("Select file");
    const token = localStorage.getItem("adminToken");
=======
  /* ================= UPLOAD STUDENTS ================= */

  const uploadStudents = async () => {
    if (!studentFile) return alert("Select student Excel file");

    const token = localStorage.getItem("adminToken");
    if (!token) return alert("Admin not logged in");

>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    const formData = new FormData();
    formData.append("file", studentFile);

    setIsUploading(true);
    try {
<<<<<<< HEAD
      const res = await fetch(`${API_URL}/api/admin/upload-students`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        alert("✅ Students uploaded");
        setStudentFile(null);
      }
    } catch (err) {
      alert("Upload failed");
=======
      const res = await fetch(
        `${API_URL}/api/admin/upload-students`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error();
      alert("✅ Students uploaded successfully");
    } catch {
      alert("Student upload failed");
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    } finally {
      setIsUploading(false);
    }
  };

<<<<<<< HEAD
  const handleSubmitManual = async (e) => {
    e.preventDefault();
=======
  /* ================= MANUAL CREATE (ADMIN) ================= */

  const handleChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitManual = async (e) => {
    e?.preventDefault();
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    setError("");
    setMessage("");
    setAdding(true);

    const token = localStorage.getItem("adminToken");
    if (!token) {
<<<<<<< HEAD
      setError("Not logged in");
=======
      setError("Admin not logged in");
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
      setAdding(false);
      return;
    }

    try {
      const endpoint = modeAdd === "student" ? "/api/admin/add-student" : "/api/admin/add-teacher";
      const payload =
        modeAdd === "student"
          ? {
              name: form.name,
              email: form.email,
              rollNo: form.rollNo,
              className: form.className,
              section: form.section,
              password: form.password,
<<<<<<< HEAD
              parentName: form.parentName,
              phone: form.phone,
=======
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
            }
          : {
              name: form.name,
              email: form.email,
              className: form.className,
              section: form.section,
              subject: form.subject,
              password: form.password,
            };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
<<<<<<< HEAD
        setError(data.error || "Failed");
      } else {
        setMessage(`✅ ${modeAdd === "student" ? "Student" : "Teacher"} created`);
=======
        setError(data.error || "Create failed");
      } else {
        setMessage(
          `${modeAdd === "student" ? "Student" : "Teacher"} created — id: ${data.userId}${
            data.password ? " (password: " + data.password + ")" : ""
          }`
        );
        // clear relevant fields
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
        setForm({
          name: "",
          email: "",
          className: "",
          section: "",
          rollNo: "",
          subject: "",
          password: "",
<<<<<<< HEAD
          parentName: "",
          phone: "",
        });
      }
    } catch (err) {
=======
        });
        // optionally update admission count or other UI
        if (modeAdd === "student") setAdmissionCount((c) => c + 1);
      }
    } catch (err) {
      console.error("MANUAL CREATE ERROR:", err);
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
      setError("Server error");
    } finally {
      setAdding(false);
    }
  };

<<<<<<< HEAD
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "applications", label: "Applications" },
    { id: "users", label: "Users" },
    { id: "teachers", label: "Upload Teachers" },
    { id: "students", label: "Upload Students" },
    { id: "subjects", label: "Subjects" },
    { id: "manual", label: "Manual Add" },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/30 z-30"
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed md:relative inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 flex flex-col z-30 transition-transform duration-300 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <h2 className="text-xl font-black text-cyan-400 tracking-tight mb-6">Admin Panel</h2>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition ${
                activeTab === item.id
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
=======
  return (
    <div style={styles.layout}>
      {/* LEFT NAV */}
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>Admin Panel</h2>

        <div style={styles.navItems}>
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "applications", label: "Applications" },
            { id: "users", label: "Users" },
            { id: "teachers", label: "Upload Teachers" },
            { id: "students", label: "Upload Students" },
            { id: "subjects", label: "Subjects" },
            { id: "manual", label: "Manual Add" },
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

        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition"
=======
        </div>

        <button
          onClick={handleLogout}
          style={styles.logoutBtn}
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
        >
          Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
<<<<<<< HEAD
      <div className="flex-1 w-full md:w-auto">
        {/* HEADER */}
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
            <p className="text-xs md:text-sm text-slate-500 mt-1">School Management System</p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-4 md:p-6 pb-20 md:pb-6">
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Total Admissions</div>
                  <div className="text-3xl font-black text-slate-900 mt-2">{admissionCount}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Total Teachers</div>
                  <div className="text-3xl font-black text-slate-900 mt-2">{teachers.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Total Students</div>
                  <div className="text-3xl font-black text-slate-900 mt-2">{students.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* APPLICATIONS */}
          {activeTab === "applications" && (
            <div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block">
                <div className="text-xs font-semibold text-slate-500 uppercase">Total Applications</div>
                <div className="text-3xl font-black text-slate-900 mt-2">{admissionCount}</div>
              </div>
              <p className="text-sm text-slate-500 mt-4">(View and manage applications)</p>
            </div>
          )}

          {/* UPLOAD TEACHERS */}
          {activeTab === "teachers" && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 max-w-md">
              <h2 className="text-lg font-bold mb-4">Upload Teachers Excel</h2>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setTeacherFile(e.target.files[0])}
                className="w-full block mb-4 p-2 border border-slate-200 rounded-lg"
              />
              <button
                onClick={uploadTeachers}
                disabled={isUploading}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          )}

          {/* UPLOAD STUDENTS */}
          {activeTab === "students" && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 max-w-md">
              <h2 className="text-lg font-bold mb-4">Upload Students Excel</h2>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setStudentFile(e.target.files[0])}
                className="w-full block mb-4 p-2 border border-slate-200 rounded-lg"
              />
              <button
                onClick={uploadStudents}
                disabled={isUploading}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          )}

          {/* SUBJECTS */}
          {activeTab === "subjects" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h2 className="text-lg font-bold mb-4">Add Subject</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    placeholder="Subject name"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Class"
                    value={subjectClass}
                    onChange={(e) => setSubjectClass(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Section"
                    value={subjectSection}
                    onChange={(e) => setSubjectSection(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={async () => {
                    const token = localStorage.getItem("adminToken");
                    try {
                      const res = await fetch(`${API_URL}/api/admin/subjects`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          subjectName,
                          class: subjectClass,
                          section: subjectSection,
                        }),
                      });
                      if (res.ok) {
                        setMessage("✅ Subject added");
                        setSubjectName("");
                        setSubjectClass("");
                        setSubjectSection("");
                      }
                    } catch (err) {
                      setError("Failed to add subject");
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition"
                >
                  Add Subject
                </button>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex gap-4 flex-col md:flex-row">
                <input
                  placeholder="Search by name, class, subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              {error && <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>}
              {message && <div className="p-4 bg-green-100 text-green-800 rounded-lg">{message}</div>}

              {loading ? (
                <div className="text-center text-slate-500 py-8">Loading...</div>
              ) : (
                <>
                  {/* TEACHERS */}
                  <div>
                    <h2 className="text-lg font-bold mb-4">Teachers ({filteredTeachers.length})</h2>
                    {filteredTeachers.length === 0 ? (
                      <div className="text-slate-500">No teachers found</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTeachers.map((t) => (
                          <div key={t._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900">{t.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {t.subject} • Class {t.class || "-"} • Section {t.section || "-"}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{t.email}</p>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() =>
                                  setReassignModal({
                                    teacherId: t._id,
                                    name: t.name,
                                    currentClass: t.class,
                                    currentSection: t.section,
                                  })
                                }
                                className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold hover:bg-blue-200"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => setDeleteModal({ type: "teacher", id: t._id, name: t.name })}
                                className="flex-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* STUDENTS */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold">Students ({filteredStudents.length})</h2>
                      <button
                        onClick={() => setMigrateModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm"
                      >
                        Migrate Class
                      </button>
                    </div>
                    {filteredStudents.length === 0 ? (
                      <div className="text-slate-500">No students found</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStudents.map((s) => (
                          <div key={s._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900">{s.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              Class {s.class || "-"} • Section {s.section || "-"} • Roll {s.rollNo || "-"}
                            </p>
                            <button
                              onClick={() => setDeleteModal({ type: "student", id: s._id, name: s.name })}
                              className="w-full mt-3 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* MANUAL ADD */}
          {activeTab === "manual" && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 max-w-2xl">
              <h2 className="text-lg font-bold mb-4">Create {modeAdd === "student" ? "Student" : "Teacher"}</h2>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setModeAdd("student")}
                  className={`px-4 py-2 rounded-lg font-bold transition ${
                    modeAdd === "student"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Student
                </button>
                <button
                  onClick={() => setModeAdd("teacher")}
                  className={`px-4 py-2 rounded-lg font-bold transition ${
                    modeAdd === "teacher"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Teacher
                </button>
              </div>

              {error && <div className="p-4 bg-red-100 text-red-800 rounded-lg mb-4">{error}</div>}
              {message && <div className="p-4 bg-green-100 text-green-800 rounded-lg mb-4">{message}</div>}

              <form onSubmit={handleSubmitManual} className="space-y-4">
                <input
                  required
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <input
                  required
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Class"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <input
                    placeholder="Section"
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                {modeAdd === "student" && (
                  <>
                    <input
                      placeholder="Roll No"
                      value={form.rollNo}
                      onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      placeholder="Parent Name"
                      value={form.parentName}
                      onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      placeholder="Phone Number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </>
                )}

                {modeAdd === "teacher" && (
                  <input
                    placeholder="Subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                )}

                <input
                  placeholder="Password (optional)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition disabled:opacity-50"
                  >
                    {adding ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
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
                      })
                    }
                    className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-bold transition"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* DELETE MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="text-sm text-slate-600 mb-6">
              Delete {deleteModal.type === "teacher" ? "teacher" : "student"} <strong>{deleteModal.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModal.type, deleteModal.id, deleteModal.name)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN MODAL */}
      {reassignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-bold mb-4">Reassign {reassignModal.name}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Current: Class {reassignModal.currentClass} • Section {reassignModal.currentSection}
            </p>
            <div className="space-y-4 mb-6">
              <input
                placeholder="Target Class"
                value={reassignForm.toClass}
                onChange={(e) => setReassignForm({ ...reassignForm, toClass: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <input
                placeholder="Target Section"
                value={reassignForm.toSection}
                onChange={(e) => setReassignForm({ ...reassignForm, toSection: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setReassignModal(null)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MIGRATE MODAL */}
      {migrateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-bold mb-4">Migrate Students</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">From Class</label>
                <input
                  value={migrateForm.fromClass}
                  onChange={(e) => setMigrateForm({ ...migrateForm, fromClass: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">From Section</label>
                <input
                  value={migrateForm.fromSection}
                  onChange={(e) => setMigrateForm({ ...migrateForm, fromSection: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">To Class</label>
                <input
                  value={migrateForm.toClass}
                  onChange={(e) => setMigrateForm({ ...migrateForm, toClass: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">To Section</label>
                <input
                  value={migrateForm.toSection}
                  onChange={(e) => setMigrateForm({ ...migrateForm, toSection: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <label className="flex gap-2 items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={migrateForm.migrateAll}
                  onChange={(e) => setMigrateForm({ ...migrateForm, migrateAll: e.target.checked })}
                />
                <span className="text-xs">Migrate all students</span>
              </label>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setMigrateModal(null)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleMigrate}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
              >
                Migrate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
=======
        {/* USERS LIST */}
        {activeTab === "users" && (
          <div>
            <h1 style={styles.title}>People</h1>
            <p style={styles.subtitle}>Teachers and students — quick reference</p>

            <UsersList />
          </div>
        )}

      <div style={styles.page}>
        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>School Overview</p>

            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Admissions</span>
              <b style={styles.statValue}>{admissionCount}</b>
            </div>
          </>
        )}

        {/* APPLICATIONS */}
        {activeTab === "applications" && (
          <>
            <h1 style={styles.title}>Applications</h1>
            <p style={styles.subtitle}>Student admission applications overview</p>

            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Applications</span>
              <b style={styles.statValue}>{admissionCount}</b>
            </div>

            <p style={styles.helperText}>(You can later add approve / reject / view details here)</p>
          </>
        )}

        {/* UPLOAD TEACHERS */}
        {activeTab === "teachers" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Upload Teachers</h2>

            <input type="file" accept=".xlsx,.xls" onChange={(e) => setTeacherFile(e.target.files[0])} style={styles.file} />

            <button onClick={uploadTeachers} disabled={isUploading} style={styles.primaryBtn}>
              {isUploading ? "Uploading..." : "Upload Teachers"}
            </button>
          </div>
        )}

        {/* UPLOAD STUDENTS */}
        {activeTab === "students" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Upload Students</h2>

            <input type="file" accept=".xlsx,.xls" onChange={(e) => setStudentFile(e.target.files[0])} style={styles.file} />

            <button onClick={uploadStudents} disabled={isUploading} style={styles.secondaryBtn}>
              {isUploading ? "Uploading..." : "Upload Students"}
            </button>
          </div>
        )}

        {/* MANAGE SUBJECTS */}
        {activeTab === "subjects" && (
          <div style={{ maxWidth: 700 }}>
            <h1 style={styles.title}>Manage Subjects</h1>
            <p style={styles.subtitle}>Add subjects for different classes and sections</p>

            {error && <div style={styles.error}>{error}</div>}
            {message && <div style={styles.success}>{message}</div>}

            <div style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 16, border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  placeholder="Subject name"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  style={styles.input}
                />
                <input
                  placeholder="Class (e.g., 10A)"
                  value={subjectClass}
                  onChange={(e) => setSubjectClass(e.target.value)}
                  style={styles.input}
                />
                <input
                  placeholder="Section (e.g., A)"
                  value={subjectSection}
                  onChange={(e) => setSubjectSection(e.target.value)}
                  style={styles.input}
                />
              </div>
              <button
                onClick={async () => {
                  if (!subjectName || !subjectClass || !subjectSection) {
                    setError("All fields are required");
                    return;
                  }
                  setError("");
                  setMessage("");
                  setSubjectLoading(true);
                  try {
                    const token = localStorage.getItem("adminToken");
                    const res = await fetch(`${API_URL}/api/admin/subjects`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        subjectName,
                        class: subjectClass,
                        section: subjectSection,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      setError(err.error || "Failed to add subject");
                      setSubjectLoading(false);
                      return;
                    }
                    setMessage("Subject added successfully");
                    setSubjectName("");
                    setSubjectClass("");
                    setSubjectSection("");
                    // Refetch subjects
                    const listRes = await fetch(
                      `${API_URL}/api/admin/subjects?class=${encodeURIComponent(subjectClass)}&section=${encodeURIComponent(subjectSection)}`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (listRes.ok) {
                      const data = await listRes.json();
                      setSubjects(Array.isArray(data) ? data : []);
                    }
                  } catch (err) {
                    console.error("ADD SUBJECT ERROR:", err);
                    setError("Failed to add subject");
                  } finally {
                    setSubjectLoading(false);
                  }
                }}
                disabled={subjectLoading}
                style={styles.primaryBtn}
              >
                {subjectLoading ? "Adding..." : "Add Subject"}
              </button>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Search Subjects</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Filter class"
                value={subjectClass}
                onChange={(e) => setSubjectClass(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Filter section"
                value={subjectSection}
                onChange={(e) => setSubjectSection(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={async () => {
                  if (!subjectClass || !subjectSection) {
                    setError("Enter class and section to search");
                    return;
                  }
                  setError("");
                  try {
                    const token = localStorage.getItem("adminToken");
                    const res = await fetch(
                      `${API_URL}/api/admin/subjects?class=${encodeURIComponent(subjectClass)}&section=${encodeURIComponent(subjectSection)}`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (res.ok) {
                      const data = await res.json();
                      setSubjects(Array.isArray(data) ? data : []);
                    }
                  } catch (err) {
                    setError("Failed to fetch subjects");
                  }
                }}
                style={styles.secondaryBtn}
              >
                Search
              </button>
            </div>

            {subjects.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 13 }}>No subjects found</div>
            ) : (
              <div>
                {subjects.map((subj) => (
                  <div key={subj._id} style={{ padding: 8, background: "#f1f5f9", marginBottom: 6, borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <b>{subj.subjectName}</b>
                      <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>Class {subj.class} • Section {subj.section}</span>
                    </div>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem("adminToken");
                        const res = await fetch(`${API_URL}/api/admin/subjects/${subj._id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          setSubjects((prev) => prev.filter((s) => s._id !== subj._id));
                          setMessage("Subject deleted");
                        }
                      }}
                      style={{ ...styles.secondaryBtn, padding: 4, fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MANUAL ADD */}
        {activeTab === "manual" && (
          <div style={{ maxWidth: 640 }}>
            <h1 style={styles.title}>Manual Create</h1>
            <p style={styles.subtitle}>Create student or teacher accounts manually</p>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setModeAdd("student")} style={styles.tab(modeAdd === "student")}>
                Student
              </button>
              <button onClick={() => setModeAdd("teacher")} style={styles.tab(modeAdd === "teacher")}>
                Teacher
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {message && <div style={styles.success}>{message}</div>}

            <form onSubmit={submitManual} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
              <input required placeholder="Full name" value={form.name} onChange={handleChange("name")} style={styles.input} />
              <input required placeholder="Email" value={form.email} onChange={handleChange("email")} style={styles.input} />

              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Class" value={form.className} onChange={handleChange("className")} style={{ ...styles.input, flex: 1 }} />
                <input placeholder="Section" value={form.section} onChange={handleChange("section")} style={{ ...styles.input, width: 120 }} />
              </div>

              {modeAdd === "student" && <input placeholder="Roll No" value={form.rollNo} onChange={handleChange("rollNo")} style={styles.input} />}

              {modeAdd === "teacher" && <input placeholder="Subject" value={form.subject} onChange={handleChange("subject")} style={styles.input} />}

              <input placeholder="Password (optional)" value={form.password} onChange={handleChange("password")} style={styles.input} />

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={adding} style={styles.primaryBtn}>
                  {adding ? "Creating..." : `Create ${modeAdd === "student" ? "Student" : "Teacher"}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ name: "", email: "", className: "", section: "", rollNo: "", subject: "", password: "" });
                    setError("");
                    setMessage("");
                  }}
                  style={styles.secondaryBtn}
                >
                  Reset
                </button>
              </div>
            </form>
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
    color: "#4f46e5",
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
    background: active ? "#eef2ff" : "transparent",
    color: active ? "#4338ca" : "#475569",
    textAlign: "left",
  }),

  page: {
    flex: 1,
    padding: "18px",
  },

  title: { fontSize: "20px", fontWeight: "800" },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "14px",
  },

  statCard: {
    background: "#ffffff",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    width: "220px",
    marginBottom: "12px",
  },

  statLabel: { fontSize: "11px", color: "#64748b" },
  statValue: { fontSize: "20px", fontWeight: "900" },

  helperText: {
    fontSize: "12px",
    color: "#94a3b8",
  },

  card: {
    background: "#ffffff",
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    maxWidth: "360px",
  },

  cardTitle: {
    fontSize: "15px",
    fontWeight: "800",
    marginBottom: "12px",
  },

  file: {
    fontSize: "12px",
    marginBottom: "14px",
  },

  primaryBtn: {
    width: "100%",
    padding: "10px",
    borderRadius: "12px",
    background: "#4f46e5",
    color: "#ffffff",
    border: "none",
    fontWeight: "700",
  },

  secondaryBtn: {
    width: "100%",
    padding: "10px",
    borderRadius: "12px",
    background: "#ecfeff",
    color: "#0e7490",
    border: "none",
    fontWeight: "700",
  },

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

  input: { padding: 12, borderRadius: 8, border: "1px solid #e6edf3", outline: "none", width: "100%" },
  tab: (active) => ({ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf3", background: active ? "#ecfdf5" : "transparent", cursor: "pointer" }),
  error: { background: "#fee2e2", color: "#991b1b", padding: 8, borderRadius: 8, marginBottom: 8 },
  success: { background: "#ecfdf5", color: "#064e3b", padding: 8, borderRadius: 8, marginBottom: 8 },
};
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
