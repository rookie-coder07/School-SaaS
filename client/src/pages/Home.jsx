import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
<<<<<<< HEAD
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
=======
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Blue Hills Academy</h1>
        <p style={styles.subtitle}>
          Smart School Management System for students, teachers & admins.
        </p>

        <img
          src="https://images.adsttc.com/media/images/5b1a/10ab/f197/cc7c/8200/021b/newsletter/image4.jpg?1528434849="
          alt="School"
          style={styles.image}
        />

        <div style={styles.buttons}>
          <button
            style={styles.studentBtn}
            onClick={() => navigate("/student/login")}
          >
            Student Login
          </button>

          <button
            style={styles.teacherBtn}
            onClick={() => navigate("/teacher/login")}
          >
            Teacher Login
          </button>

          <button
            style={styles.adminBtn}
            onClick={() => navigate("/admin/login")}
          >
            Admin Login
          </button>
        </div>

        <p style={styles.footer}>© 2024 Blue Hills Academy</p>
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
      </div>
    </div>
  );
}

<<<<<<< HEAD
const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg, #0b1020, #0f172a, #0b3b3a)",
=======
/* 👇 ADD THIS BELOW COMPONENT (VERY IMPORTANT) */
const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #1e3a8a, #2563eb)",
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
<<<<<<< HEAD
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
=======
    fontFamily: "'Poppins', sans-serif",
  },

  card: {
    background: "rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(12px)",
    borderRadius: "20px",
    padding: "25px",
    width: "100%",
    maxWidth: "360px",
    textAlign: "center",
    color: "#fff",
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
  },

  title: {
    fontSize: "26px",
    fontWeight: "700",
  },

  subtitle: {
    fontSize: "14px",
    opacity: 0.9,
    marginBottom: "15px",
  },

  image: {
    width: "100%",
    borderRadius: "14px",
    marginBottom: "20px",
  },

  buttons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  studentBtn: {
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },

  adminBtn: {
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },

  teacherBtn: {
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },

  footer: {
    marginTop: "15px",
    fontSize: "12px",
    opacity: 0.7,
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  },
};