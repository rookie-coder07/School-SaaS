import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      <div style={styles.card}>
        <div style={styles.logo}>EduNest</div>
        <div style={styles.tagline}>
          The complete digital platform for modern schools
        </div>

        <div style={styles.actions}>
          <button
            style={{ ...styles.mainBtn, ...styles.studentBtn }}
            onClick={() => navigate("/student/login")}
          >
            Student Portal
          </button>

          <button
            style={{ ...styles.mainBtn, ...styles.teacherBtn }}
            onClick={() => navigate("/teacher/login")}
          >
            Teacher Portal
          </button>

          <button
            style={{ ...styles.mainBtn, ...styles.adminBtn }}
            onClick={() => navigate("/admin/login")}
          >
            Admin Console
          </button>
        </div>

        <div style={styles.footer}>
          © {new Date().getFullYear()} EduNest • School Management Suite
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg, #0b1020, #0f172a, #0b3b3a)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily:
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },

  bgGlow1: {
    position: "absolute",
    width: "320px",
    height: "320px",
    background: "radial-gradient(circle, #22c55e55, transparent 70%)",
    top: "-80px",
    left: "-80px",
  },

  bgGlow2: {
    position: "absolute",
    width: "360px",
    height: "360px",
    background: "radial-gradient(circle, #3b82f655, transparent 70%)",
    bottom: "-100px",
    right: "-100px",
  },

  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "420px",
    background: "linear-gradient(180deg, #0f172a, #020617)",
    borderRadius: "22px",
    padding: "34px 26px",
    boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
    textAlign: "center",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  logo: {
    fontSize: "40px",
    fontWeight: "800",
    letterSpacing: "0.5px",
    marginBottom: "6px",
    background: "linear-gradient(135deg, #22c55e, #38bdf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  tagline: {
    fontSize: "15px",
    color: "#cbd5f5",
    marginBottom: "32px",
    lineHeight: 1.6,
  },

  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  mainBtn: {
    padding: "15px 18px",
    borderRadius: "14px",
    border: "none",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },

  studentBtn: {
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#022c22",
    boxShadow: "0 12px 28px rgba(34,197,94,0.4)",
  },

  teacherBtn: {
    background: "linear-gradient(135deg, #38bdf8, #2563eb)",
    color: "#041e3a",
    boxShadow: "0 12px 28px rgba(59,130,246,0.45)",
  },

  adminBtn: {
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#2b1700",
    boxShadow: "0 12px 28px rgba(245,158,11,0.45)",
  },

  footer: {
    marginTop: "28px",
    fontSize: "12px",
    color: "#94a3b8",
    letterSpacing: "0.3px",
  },
};