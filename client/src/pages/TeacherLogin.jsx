import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function TeacherLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/teacher/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      // store both token and teacher object (includes schoolId/class/section)
      localStorage.setItem("teacherToken", data.token);
      localStorage.setItem("teacherData", JSON.stringify(data.teacher || {}));

      navigate("/teacher/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("Server not responding. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex justify-center items-center bg-slate-50 px-4 py-8 font-sans">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-lg"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Teacher Login</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm font-semibold">
=======
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: "#ffffff",
          padding: "36px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "420px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px rgba(15,23,42,0.08)",
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: "800",
              color: "#0f172a",
              margin: 0,
            }}
          >
            Teacher Login
          </h2>
          <p
            style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#64748b",
              marginTop: "6px",
            }}
          >
            Sign in to manage your class attendance
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "10px 14px",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
<<<<<<< HEAD
          className="w-full px-4 py-3 mb-4 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
=======
          style={inputStyle}
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
<<<<<<< HEAD
          className="w-full px-4 py-3 mb-6 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
=======
          style={inputStyle}
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
        />

        <button
          type="submit"
          disabled={loading}
<<<<<<< HEAD
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 text-sm md:text-base"
=======
          style={{
            width: "100%",
            padding: "14px",
            marginTop: "10px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontWeight: "700",
            fontSize: "14px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  marginBottom: "14px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  outline: "none",
  fontSize: "14px",
  fontWeight: "500",
};
