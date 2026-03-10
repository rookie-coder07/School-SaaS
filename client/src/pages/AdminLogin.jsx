import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sessionTracker } from "../utils/sessionTracker";
import FingerprintAuthActions from "../components/FingerprintAuthActions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const completeAdminLogin = (data) => {
    localStorage.setItem("adminToken", data.token);
    if (data.schoolName) {
      localStorage.setItem("adminSchoolName", data.schoolName);
    }

    let adminUserId = null;
    let schoolId = null;
    try {
      const tokenParts = data.token.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.schoolId) {
          localStorage.setItem("adminSchoolId", payload.schoolId);
          schoolId = payload.schoolId;
        }
        if (payload.userId) {
          adminUserId = payload.userId;
        }
      }
    } catch (err) {
      console.error("Failed to extract token data:", err);
    }

    if (adminUserId && schoolId) {
      sessionTracker.startSession(adminUserId, "ADMIN", schoolId);
    }

    navigate("/admin/dashboard");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Login failed");
        return;
      }

      completeAdminLogin(data);
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

        {info && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-6 text-sm font-semibold">
            {info}
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

        <FingerprintAuthActions
          email={email}
          password={password}
          role="ADMIN"
          onLoginSuccess={completeAdminLogin}
          setError={setError}
          setInfo={setInfo}
        />
      </form>
    </div>
  );
}
