import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
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
            style={styles.adminBtn}
            onClick={() => navigate("/admin/login")}
          >
            Admin Login
          </button>
        </div>

        <p style={styles.footer}>© 2024 Blue Hills Academy</p>
      </div>
    </div>
  );
}

/* 👇 ADD THIS BELOW COMPONENT (VERY IMPORTANT) */
const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #1e3a8a, #2563eb)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
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

  footer: {
    marginTop: "15px",
    fontSize: "12px",
    opacity: 0.7,
  },
};