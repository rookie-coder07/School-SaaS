import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sessionTracker } from "../utils/sessionTracker";

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const endpoint = `${API_URL}/api/auth/student/login`;
      const res = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      // ✅ Save token safely
      localStorage.setItem("studentToken", data.token);
      
      // ✅ Save school name
      if (data.schoolName) {
        localStorage.setItem("studentSchoolName", data.schoolName);
      }
      if (data.mustChangePassword) {
        localStorage.setItem("studentMustChangePassword", "1");
      } else {
        localStorage.removeItem("studentMustChangePassword");
      }
      
      // ✅ Extract and save schoolId from token
      let studentUserId = null;
      let schoolId = null;
      try {
        const tokenParts = data.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('🔐 StudentLogin: Token payload:', payload);
          
          if (payload.schoolId) {
            localStorage.setItem("studentSchoolId", payload.schoolId);
            schoolId = payload.schoolId;
          }
          if (payload.userId) {
            studentUserId = payload.userId;
          }
        }
      } catch (err) {
        console.error("❌ Failed to extract token data:", err);
      }

      console.log('🟢 StudentLogin: Starting session with -', { studentUserId, role: 'STUDENT', schoolId });
      
      // ✅ Start session tracking
      if (studentUserId && schoolId) {
        sessionTracker.startSession(studentUserId, "STUDENT", schoolId);
      } else {
        console.warn('⚠️ StudentLogin: Missing data for session tracking -', { studentUserId, schoolId });
      }

      // ✅ Redirect
      navigate("/student/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("Server not responding. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitForgotRequest = async () => {
    const requestEmail = String(forgotEmail || email || "").trim().toLowerCase();
    if (!requestEmail) {
      setForgotMessage("Please enter your email.");
      return;
    }
    setForgotLoading(true);
    setForgotMessage("");
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/student/password-reset-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: requestEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotMessage(data?.error || "Failed to submit request");
        return;
      }
      setForgotMessage(data?.message || "Request submitted to your class teacher.");
    } catch (err) {
      console.error("FORGOT REQUEST ERROR:", err);
      setForgotMessage("Failed to submit request");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50 px-4 py-8 font-sans">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-lg"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Student Login</h2>
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

        <button
          type="button"
          onClick={() => {
            setForgotEmail(email);
            setForgotMessage("");
            setShowForgotModal(true);
          }}
          className="w-full mt-3 py-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Forgot Password?
        </button>
      </form>

      {showForgotModal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full h-full sm:h-auto sm:max-w-md bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-xl p-4 sm:p-5 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Forgot Password</h3>
            <p className="text-sm text-slate-600">
              Submit a reset request. Your class teacher will set a temporary password.
            </p>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="Enter your student email"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {forgotMessage && <p className="text-sm text-slate-700">{forgotMessage}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={submitForgotRequest}
                disabled={forgotLoading}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {forgotLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
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
