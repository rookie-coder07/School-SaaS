import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function UsersList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState("");

  // Search & pagination
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [teacherPage, setTeacherPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);

  // Modal states
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'teacher'|'student', id, name }
  const [reassignModal, setReassignModal] = useState(null); // { teacherId, name, currentClass, currentSection }
  const [migrateModal, setMigrateModal] = useState(null); // UI for student migration

  // Reassign form state
  const [reassignForm, setReassignForm] = useState({ toClass: "", toSection: "" });

  // Migrate form state
  const [migrateForm, setMigrateForm] = useState({
    fromClass: "",
    fromSection: "",
    toClass: "",
    toSection: "",
    selectedStudents: [], // array of student IDs
    migrateAll: false,
  });

  const fetchUsers = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setError("Admin not logged in");
      return;
    }

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
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // reset pages when search or pageSize changes
  useEffect(() => {
    setTeacherPage(1);
    setStudentPage(1);
  }, [search, pageSize]);

  // ===== DELETE HANDLER =====
  const handleDelete = async () => {
    if (!deleteModal) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setMessage("");
    try {
      const url =
        deleteModal.type === "teacher"
          ? `${API_URL}/api/admin/teachers/${deleteModal.id}`
          : `${API_URL}/api/admin/students/${deleteModal.id}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(`❌ ${err.error || "Delete failed"}`);
        return;
      }

      setMessage(`✅ ${deleteModal.type === "teacher" ? "Teacher" : "Student"} ${deleteModal.name} deleted`);
      setDeleteModal(null);
      setTimeout(() => {
        setMessage("");
        fetchUsers();
      }, 1500);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  // ===== REASSIGN HANDLER =====
  const handleReassign = async () => {
    if (!reassignModal || !reassignForm.toClass || !reassignForm.toSection) {
      setMessage("❌ Please select target class and section");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setMessage("");
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

      if (!res.ok) {
        const err = await res.json();
        setMessage(`❌ ${err.error || "Reassignment failed"}`);
        return;
      }

      setMessage(`✅ Teacher ${reassignModal.name} reassigned to Class ${reassignForm.toClass}-${reassignForm.toSection}`);
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

  // ===== MIGRATE STUDENTS HANDLER =====
  const handleMigrate = async () => {
    if (!migrateForm.fromClass || !migrateForm.fromSection || !migrateForm.toClass || !migrateForm.toSection) {
      setMessage("❌ Please select source and target class/section");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setMessage("");
    try {
      const studentIds = migrateForm.migrateAll
        ? null
        : migrateForm.selectedStudents.length > 0
          ? migrateForm.selectedStudents
          : null;

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
          studentIds,
          migrateAll: migrateForm.migrateAll,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(`❌ ${err.error || "Migration failed"}`);
        return;
      }

      const result = await res.json();
      setMessage(`✅ ${result.migratedCount} student(s) migrated`);
      setMigrateModal(null);
      setMigrateForm({
        fromClass: "",
        fromSection: "",
        toClass: "",
        toSection: "",
        selectedStudents: [],
        migrateAll: false,
      });
      setTimeout(() => {
        setMessage("");
        fetchUsers();
      }, 1500);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

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
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setReassignModal({ teacherId: t._id, name: t.name, currentClass: t.class, currentSection: t.section })}
                    style={{ padding: "6px 12px", fontSize: 12, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                  >
                    Reassign
                  </button>
                  <button
                    onClick={() => setDeleteModal({ type: "teacher", id: t._id, name: t.name })}
                    style={{ padding: "6px 12px", fontSize: 12, background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                  >
                    Delete
                  </button>
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
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Students
          <button
            onClick={() => setMigrateModal(true)}
            style={{
              marginLeft: 12,
              padding: "6px 12px",
              fontSize: 12,
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Migrate Class
          </button>
        </h3>
        {filteredStudents.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>No students found</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {studentsPageSlice.map((s) => (
              <div key={s._id} style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e6edf3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Class {s.class || "-"} • Section {s.section || "-"} {s.rollNo ? `• Roll ${s.rollNo}` : ""}</div>
                  {s.parentName && <div style={{ fontSize: 11, color: "#94a3b8" }}>Parent: {s.parentName}</div>}
                  {s.phone && <div style={{ fontSize: 11, color: "#94a3b8" }}>Phone: {s.phone}</div>}
                </div>
                <button
                  onClick={() => setDeleteModal({ type: "student", id: s._id, name: s.name })}
                  style={{ padding: "6px 12px", fontSize: 12, background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                >
                  Delete
                </button>
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

      {message && <div style={{ padding: 12, background: message.includes("✅") ? "#d1fae5" : "#fee2e2", color: message.includes("✅") ? "#065f46" : "#991b1b", borderRadius: 8, marginBottom: 12 }}>{message}</div>}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h3 style={{ margin: "0 0 12px 0" }}>Confirm Delete</h3>
            <p style={{ margin: "0 0 16px 0", color: "#64748b" }}>
              Are you sure you want to delete {deleteModal.type === "teacher" ? "teacher" : "student"} <strong>{deleteModal.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ flex: 1, padding: 10, background: "#e2e8f0", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{ flex: 1, padding: 10, background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN TEACHER MODAL */}
      {reassignModal && (
        <div style={modalStyles.overlay}>
          <div style={{ ...modalStyles.modal, maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Reassign {reassignModal.name}</h3>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
              Current: Class {reassignModal.currentClass}-{reassignModal.currentSection}
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Target Class</label>
                <input
                  type="text"
                  value={reassignForm.toClass}
                  onChange={(e) => setReassignForm({ ...reassignForm, toClass: e.target.value })}
                  placeholder="e.g., 10"
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 14, marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Target Section</label>
                <input
                  type="text"
                  value={reassignForm.toSection}
                  onChange={(e) => setReassignForm({ ...reassignForm, toSection: e.target.value })}
                  placeholder="e.g., A"
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 14, marginTop: 4 }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setReassignModal(null)}
                style={{ flex: 1, padding: 10, background: "#e2e8f0", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                style={{ flex: 1, padding: 10, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
              >
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLASS MIGRATION MODAL */}
      {migrateModal && (
        <div style={modalStyles.overlay}>
          <div style={{ ...modalStyles.modal, maxWidth: 450 }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Migrate Students to New Class/Section</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ background: "#f3f4f6", padding: 12, borderRadius: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 12px 0" }}>From (Source)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    type="text"
                    value={migrateForm.fromClass}
                    onChange={(e) => setMigrateForm({ ...migrateForm, fromClass: e.target.value })}
                    placeholder="Class"
                    style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12 }}
                  />
                  <input
                    type="text"
                    value={migrateForm.fromSection}
                    onChange={(e) => setMigrateForm({ ...migrateForm, fromSection: e.target.value })}
                    placeholder="Section"
                    style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12 }}
                  />
                </div>
              </div>
              <div style={{ background: "#f9fafb", padding: 12, borderRadius: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 12px 0" }}>To (Target)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    type="text"
                    value={migrateForm.toClass}
                    onChange={(e) => setMigrateForm({ ...migrateForm, toClass: e.target.value })}
                    placeholder="Class"
                    style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12 }}
                  />
                  <input
                    type="text"
                    value={migrateForm.toSection}
                    onChange={(e) => setMigrateForm({ ...migrateForm, toSection: e.target.value })}
                    placeholder="Section"
                    style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12 }}
                  />
                </div>
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={migrateForm.migrateAll}
                  onChange={(e) =>
                    setMigrateForm({
                      ...migrateForm,
                      migrateAll: e.target.checked,
                      selectedStudents: e.target.checked ? [] : migrateForm.selectedStudents,
                    })
                  }
                />
                <span style={{ fontSize: 13 }}>Migrate all students from source class/section</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setMigrateModal(null)}
                style={{ flex: 1, padding: 10, background: "#e2e8f0", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleMigrate}
                style={{ flex: 1, padding: 10, background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
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

export default function AdminDashboard() {
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [admissionCount, setAdmissionCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

  // Subject management state
  const [subjectName, setSubjectName] = useState("");
  const [subjectClass, setSubjectClass] = useState("");
  const [subjectSection, setSubjectSection] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectLoading, setSubjectLoading] = useState(false);
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
    parentName: "",
    phone: "",
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

    const formData = new FormData();
    formData.append("file", teacherFile);

    setIsUploading(true);
    try {
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
    } finally {
      setIsUploading(false);
    }
  };

  /* ================= UPLOAD STUDENTS ================= */

  const uploadStudents = async () => {
    if (!studentFile) return alert("Select student Excel file");

    const token = localStorage.getItem("adminToken");
    if (!token) return alert("Admin not logged in");

    const formData = new FormData();
    formData.append("file", studentFile);

    setIsUploading(true);
    try {
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
    } finally {
      setIsUploading(false);
    }
  };

  /* ================= MANUAL CREATE (ADMIN) ================= */

  const handleChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitManual = async (e) => {
    e?.preventDefault();
    setError("");
    setMessage("");
    setAdding(true);

    const token = localStorage.getItem("adminToken");
    if (!token) {
      setError("Admin not logged in");
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
        setError(data.error || "Create failed");
      } else {
        setMessage(
          `${modeAdd === "student" ? "Student" : "Teacher"} created — id: ${data.userId}${
            data.password ? " (password: " + data.password + ")" : ""
          }`
        );
        // clear relevant fields
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
        // optionally update admission count or other UI
        if (modeAdd === "student") setAdmissionCount((c) => c + 1);
      }
    } catch (err) {
      console.error("MANUAL CREATE ERROR:", err);
      setError("Server error");
    } finally {
      setAdding(false);
    }
  };

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
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                style={styles.navBtn(activeTab === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            style={styles.logoutBtn}
          >
            Logout
          </button>
        </div>

      {/* MAIN CONTENT */}
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

              {modeAdd === "student" && (
                <>
                  <input placeholder="Roll No" value={form.rollNo} onChange={handleChange("rollNo")} style={styles.input} />
                  <input placeholder="Parent Name" value={form.parentName} onChange={handleChange("parentName")} style={styles.input} />
                  <input placeholder="Phone Number" value={form.phone} onChange={handleChange("phone")} style={styles.input} />
                </>
              )}

              {modeAdd === "teacher" && <input placeholder="Subject" value={form.subject} onChange={handleChange("subject")} style={styles.input} />}

              <input placeholder="Password (optional)" value={form.password} onChange={handleChange("password")} style={styles.input} />

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={adding} style={styles.primaryBtn}>
                  {adding ? "Creating..." : `Create ${modeAdd === "student" ? "Student" : "Teacher"}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ name: "", email: "", className: "", section: "", rollNo: "", subject: "", password: "", parentName: "", phone: "" });
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
const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#ffffff",
    padding: "24px",
    borderRadius: "12px",
    minWidth: "350px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
};