import React, { useState } from "react";

export default function Admin() {
  const [mode, setMode] = useState("student"); // 'student' or 'teacher'
  const [loading, setLoading] = useState(false);
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

  const token = localStorage.getItem("adminToken") || localStorage.getItem("token") || "";

  const handleChange = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const endpoint = mode === "student" ? "/api/admin/add-student" : "/api/admin/add-teacher";
      const payload =
        mode === "student"
          ? { name: form.name, email: form.email, rollNo: form.rollNo, className: form.className, section: form.section, password: form.password }
          : { name: form.name, email: form.email, className: form.className, section: form.section, subject: form.subject, password: form.password };

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
      } else {
        setMessage(`${mode === "student" ? "Student" : "Teacher"} created — id: ${data.userId}`);
        // clear form fields relevant to mode
        setForm({
          name: "",
          email: "",
          className: "",
          section: "",
          rollNo: "",
          subject: "",
          password: "",
        });
      }
    } catch (err) {
      console.error("ADMIN SUBMIT ERROR:", err);
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ margin: 0 }}>{mode === "student" ? "Add Student" : "Add Teacher"}</h2>
        <p style={styles.hint}>Create accounts manually (admin only)</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button style={styles.tab(mode === "student")} onClick={() => setMode("student")}>Student</button>
          <button style={styles.tab(mode === "teacher")} onClick={() => setMode("teacher")}>Teacher</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.success}>{message}</div>}

        <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
          <input required placeholder="Full name" value={form.name} onChange={handleChange("name")} style={styles.input} />
          <input required placeholder="Email" value={form.email} onChange={handleChange("email")} style={styles.input} />
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Class" value={form.className} onChange={handleChange("className")} style={{ ...styles.input, flex: 1 }} />
            <input placeholder="Section" value={form.section} onChange={handleChange("section")} style={{ ...styles.input, width: 120 }} />
          </div>

          {mode === "student" && (
            <input placeholder="Roll No" value={form.rollNo} onChange={handleChange("rollNo")} style={styles.input} />
          )}

          {mode === "teacher" && (
            <input placeholder="Subject" value={form.subject} onChange={handleChange("subject")} style={styles.input} />
          )}

          <input placeholder="Password (optional)" value={form.password} onChange={handleChange("password")} style={styles.input} />

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={loading} style={styles.primary}>{loading ? "Creating..." : `Create ${mode === "student" ? "Student" : "Teacher"}`}</button>
            <button type="button" onClick={() => { setForm({ name: "", email: "", className: "", section: "", rollNo: "", subject: "", password: "" }); setError(""); setMessage(""); }} style={styles.secondary}>Reset</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 20 },
  card: { width: 520, background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.06)", border: "1px solid #e6edf3" },
  hint: { marginTop: 6, marginBottom: 12, color: "#64748b", fontSize: 13 },
  input: { padding: 12, borderRadius: 8, border: "1px solid #e6edf3", outline: "none", width: "100%" },
  tab: (active) => ({ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf3", background: active ? "#ecfdf5" : "transparent", cursor: "pointer" }),
  primary: { background: "#0f172a", color: "#fff", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer" },
  secondary: { background: "#fff", color: "#0f172a", padding: "10px 12px", borderRadius: 8, border: "1px solid #e6edf3", cursor: "pointer" },
  error: { background: "#fee2e2", color: "#991b1b", padding: 8, borderRadius: 8, marginBottom: 8 },
  success: { background: "#ecfdf5", color: "#064e3b", padding: 8, borderRadius: 8, marginBottom: 8 },
};