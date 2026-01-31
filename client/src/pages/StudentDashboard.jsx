import { useState } from "react";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div style={styles.layout}>
      {/* LEFT NAV */}
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>Student</h2>

        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "attendance", label: "Attendance" },
          { id: "profile", label: "Profile" },
          { id: "logout", label: "Logout" },
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
            <h1 style={styles.title}>Student Dashboard</h1>
            <p style={styles.subtitle}>Welcome Student</p>

            <div style={styles.card}>
              <span style={styles.cardLabel}>Status</span>
              <b style={styles.cardValue}>Active</b>
            </div>
          </>
        )}

        {/* ATTENDANCE */}
        {activeTab === "attendance" && (
          <>
            <h1 style={styles.title}>Attendance</h1>
            <p style={styles.subtitle}>Your attendance overview</p>

            <div style={styles.card}>
              <span style={styles.cardLabel}>Overall Attendance</span>
              <b style={styles.cardValue}>-- %</b>
            </div>
          </>
        )}

        {/* PROFILE */}
        {activeTab === "profile" && (
          <>
            <h1 style={styles.title}>Profile</h1>
            <p style={styles.subtitle}>Your student information</p>

            <div style={styles.card}>
              <span style={styles.cardLabel}>Name</span>
              <b style={styles.cardValue}>Student Name</b>
            </div>
          </>
        )}

        {/* LOGOUT */}
        {activeTab === "logout" && (
          <>
            <h1 style={styles.title}>Logout</h1>
            <p style={styles.subtitle}>
              You can wire logout logic later
            </p>

            <button style={styles.logoutBtn}>Logout</button>
          </>
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
    color: "#16a34a",
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
    background: active ? "#ecfdf5" : "transparent",
    color: active ? "#15803d" : "#475569",
    textAlign: "left",
  }),

  page: {
    flex: 1,
    padding: "18px",
  },

  title: {
    fontSize: "20px",
    fontWeight: "800",
  },

  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "14px",
  },

  card: {
    background: "#ffffff",
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    width: "220px",
    marginBottom: "14px",
  },

  cardLabel: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginBottom: "6px",
  },

  cardValue: {
    fontSize: "18px",
    fontWeight: "900",
    color: "#0f172a",
  },

  logoutBtn: {
    padding: "10px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: "800",
    fontSize: "13px",
  },
};
