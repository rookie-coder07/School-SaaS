import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [admissionCount, setAdmissionCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

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
    fetch("http://localhost:5000/api/admissions", {
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
        "http://localhost:5000/api/admin/upload-teachers",
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
        "http://localhost:5000/api/admin/upload-students",
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
            }
          : {
              name: form.name,
              email: form.email,
              className: form.className,
              section: form.section,
              subject: form.subject,
              password: form.password,
            };

      const res = await fetch(`http://localhost:5000${endpoint}`, {
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

        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "applications", label: "Applications" },
          { id: "teachers", label: "Upload Teachers" },
          { id: "students", label: "Upload Students" },
          { id: "manual", label: "Manual Add" }, // new
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={styles.navBtn(activeTab === item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
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

  input: { padding: 12, borderRadius: 8, border: "1px solid #e6edf3", outline: "none", width: "100%" },
  tab: (active) => ({ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf3", background: active ? "#ecfdf5" : "transparent", cursor: "pointer" }),
  error: { background: "#fee2e2", color: "#991b1b", padding: 8, borderRadius: 8, marginBottom: 8 },
  success: { background: "#ecfdf5", color: "#064e3b", padding: 8, borderRadius: 8, marginBottom: 8 },
};
