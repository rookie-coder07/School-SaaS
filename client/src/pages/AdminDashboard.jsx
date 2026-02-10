import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  const [subjectName, setSubjectName] = useState("");
  const [subjectClass, setSubjectClass] = useState("");
  const [subjectSection, setSubjectSection] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectLoading, setSubjectLoading] = useState(false);

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
    const formData = new FormData();
    formData.append("file", teacherFile);

    setIsUploading(true);
    try {
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
    } finally {
      setIsUploading(false);
    }
  };

  const uploadStudents = async () => {
    if (!studentFile) return alert("Select file");
    const token = localStorage.getItem("adminToken");
    const formData = new FormData();
    formData.append("file", studentFile);

    setIsUploading(true);
    try {
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitManual = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setAdding(true);

    const token = localStorage.getItem("adminToken");
    if (!token) {
      setError("Not logged in");
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
              parentName: form.parentName,
              phone: form.phone,
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
        setError(data.error || "Failed");
      } else {
        setMessage(`✅ ${modeAdd === "student" ? "Student" : "Teacher"} created`);
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
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setAdding(false);
    }
  };

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
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition"
        >
          Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
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
