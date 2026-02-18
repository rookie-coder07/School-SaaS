import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sessionTracker } from "../utils/sessionTracker";

export default function AdminLogin() {
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
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const endpoint = `${API_URL}/api/auth/login`;
      const res = await fetch(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Login failed");
        return;
      }

      // ✅ Save token
      localStorage.setItem("adminToken", data.token);
      
      // ✅ Save school name
      if (data.schoolName) {
        localStorage.setItem("adminSchoolName", data.schoolName);
      }
      
      // ✅ Extract and save schoolId from token
      let adminUserId = null;
      let schoolId = null;
      try {
        const tokenParts = data.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('🔐 AdminLogin: Token payload:', payload);
          
          if (payload.schoolId) {
            localStorage.setItem("adminSchoolId", payload.schoolId);
            schoolId = payload.schoolId;
          }
          if (payload.userId) {
            adminUserId = payload.userId;
          }
        }
      } catch (err) {
        console.error("❌ Failed to extract token data:", err);
      }

      console.log('🟢 AdminLogin: Starting session with -', { adminUserId, role: 'ADMIN', schoolId });
      
      // ✅ Start session tracking
      if (adminUserId && schoolId) {
        sessionTracker.startSession(adminUserId, "ADMIN", schoolId);
      } else {
        console.warn('⚠️ AdminLogin: Missing data for session tracking -', { adminUserId, schoolId });
      }

      // ✅ Redirect (DO NOT CHANGE)
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("ADMIN LOGIN ERROR:", err);
      setError("Server not responding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50 px-4 py-8 font-sans">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-lg"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Admin Login</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm font-semibold">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 mb-4 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 mb-6 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 text-sm md:text-base"
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