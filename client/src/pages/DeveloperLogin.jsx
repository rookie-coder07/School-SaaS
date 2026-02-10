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
<<<<<<< HEAD
      backgroundColor: "#f8fafc",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "16px",
    },
    card: {
      backgroundColor: "#ffffff",
      padding: "36px",
      borderRadius: "16px",
      boxShadow: "0 10px 30px rgba(15,23,42,0.1)",
      width: "100%",
      maxWidth: "420px",
      border: "1px solid #e2e8f0",
    },
    title: {
      fontSize: "24px",
      fontWeight: "900",
      color: "#0f172a",
      marginBottom: "8px",
      textAlign: "center",
      letterSpacing: "-0.5px",
      margin: 0,
    },
    subtitle: {
      fontSize: "13px",
      color: "#64748b",
      marginBottom: "28px",
      textAlign: "center",
      fontWeight: 500,
=======
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
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    },
    form: {
      display: "flex",
      flexDirection: "column",
<<<<<<< HEAD
      gap: "0px",
=======
      gap: "16px",
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
<<<<<<< HEAD
      gap: "0px",
      marginBottom: "0px",
    },
    label: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#334155",
      marginBottom: "6px",
      display: "none",
    },
    input: {
      padding: "12px 14px",
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      fontSize: "14px",
      fontFamily: "inherit",
      marginBottom: "14px",
      outline: "none",
    },
    button: {
      padding: "12px 14px",
      border: "none",
      background: "linear-gradient(135deg, #2563eb, #4f46e5)",
      color: "white",
      cursor: "pointer",
      borderRadius: "10px",
      fontSize: "14px",
      fontWeight: "700",
=======
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
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
      marginTop: "8px",
      transition: "all 0.2s",
    },
    error: {
<<<<<<< HEAD
      padding: "12px 14px",
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
      borderRadius: "10px",
      fontSize: "13px",
      marginBottom: "18px",
      fontWeight: "600",
=======
      padding: "12px 16px",
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
      borderRadius: "8px",
      fontSize: "14px",
      marginBottom: "16px",
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    },
    hint: {
      fontSize: "12px",
      color: "#64748b",
<<<<<<< HEAD
      marginTop: "12px",
      padding: "12px",
      backgroundColor: "#f8fafc",
      borderRadius: "8px",
=======
      marginTop: "8px",
      padding: "12px",
      backgroundColor: "#f8fafc",
      borderRadius: "6px",
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
      border: "1px solid #e2e8f0",
    },
  };

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex justify-center items-center bg-slate-50 px-4 py-8 font-sans">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-lg space-y-4"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Developer Login</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 text-sm md:text-base mt-6"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
=======
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
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
    </div>
  );
}
