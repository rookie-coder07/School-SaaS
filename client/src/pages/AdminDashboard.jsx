import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [admissionCount, setAdmissionCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

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

  return (
    <div style={styles.layout}>
      {/* LEFT NAV */}
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>Admin Panel</h2>

        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "applications", label: "Applications" }, // 🆕
          { id: "teachers", label: "Upload Teachers" },
          { id: "students", label: "Upload Students" },
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
            <p style={styles.subtitle}>
              Student admission applications overview
            </p>

            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Applications</span>
              <b style={styles.statValue}>{admissionCount}</b>
            </div>

            <p style={styles.helperText}>
              (You can later add approve / reject / view details here)
            </p>
          </>
        )}

        {/* UPLOAD TEACHERS */}
        {activeTab === "teachers" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Upload Teachers</h2>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setTeacherFile(e.target.files[0])}
              style={styles.file}
            />

            <button
              onClick={uploadTeachers}
              disabled={isUploading}
              style={styles.primaryBtn}
            >
              {isUploading ? "Uploading..." : "Upload Teachers"}
            </button>
          </div>
        )}

        {/* UPLOAD STUDENTS */}
        {activeTab === "students" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Upload Students</h2>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setStudentFile(e.target.files[0])}
              style={styles.file}
            />

            <button
              onClick={uploadStudents}
              disabled={isUploading}
              style={styles.secondaryBtn}
            >
              {isUploading ? "Uploading..." : "Upload Students"}
            </button>
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
};
