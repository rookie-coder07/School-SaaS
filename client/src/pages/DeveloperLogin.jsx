import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function DeveloperLogin() {
  const [email, setEmail] = useState("developer@example.com");
  const [password, setPassword] = useState("developer123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/developer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("developerToken", data.token);
      navigate("/dev");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("Connection error");
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f5f7fa",
      padding: "20px",
    },
    card: {
      backgroundColor: "white",
      padding: "40px",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      width: "100%",
      maxWidth: "400px",
    },
    title: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#1e293b",
      marginBottom: "10px",
      textAlign: "center",
    },
    subtitle: {
      fontSize: "14px",
      color: "#64748b",
      marginBottom: "30px",
      textAlign: "center",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#334155",
    },
    input: {
      padding: "12px 16px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      fontSize: "14px",
      fontFamily: "inherit",
    },
    button: {
      padding: "12px 20px",
      border: "none",
      backgroundColor: "#3b82f6",
      color: "white",
      cursor: "pointer",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      marginTop: "8px",
      transition: "all 0.2s",
    },
    error: {
      padding: "12px 16px",
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
      borderRadius: "8px",
      fontSize: "14px",
      marginBottom: "16px",
    },
    hint: {
      fontSize: "12px",
      color: "#64748b",
      marginTop: "8px",
      padding: "12px",
      backgroundColor: "#f8fafc",
      borderRadius: "6px",
      border: "1px solid #e2e8f0",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚀 Developer Access</h1>
        <p style={styles.subtitle}>Multi-tenant platform administration</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="developer@example.com"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="developer123"
            />
          </div>

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Access Developer Panel"}
          </button>
        </form>

        <div style={styles.hint}>
          <strong>Demo Credentials:</strong>
          <br />
          Email: developer@example.com
          <br />
          Password: developer123
        </div>
      </div>
    </div>
  );
}
