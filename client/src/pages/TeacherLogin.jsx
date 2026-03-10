import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sessionTracker } from "../utils/sessionTracker";
import { useToast } from "../components/ToastProvider";
import FingerprintAuthActions from "../components/FingerprintAuthActions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function TeacherLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const completeTeacherLogin = (data) => {
    localStorage.setItem("teacherToken", data.token);
    localStorage.setItem("teacherData", JSON.stringify(data.teacher || {}));
    localStorage.setItem("teacherMustChangePassword", data.mustChangePassword ? "true" : "false");

    if (data.schoolName) {
      localStorage.setItem("teacherSchoolName", data.schoolName);
    }

    let teacherUserId = null;
    let schoolId = null;
    try {
      const tokenParts = data.token.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.schoolId) {
          localStorage.setItem("teacherSchoolId", payload.schoolId);
          schoolId = payload.schoolId;
        }
        if (payload.userId) {
          teacherUserId = payload.userId;
        }
      }
    } catch (err) {
      console.error("Failed to extract token data:", err);
    }

    if (teacherUserId && schoolId) {
      sessionTracker.startSession(teacherUserId, "TEACHER", schoolId);
    }

    if (data.mustChangePassword) {
      toast.success("Password reset detected. Please change your password now.");
      navigate("/teacher/change-password", { replace: true });
    } else {
      navigate("/teacher/dashboard");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
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
        return;
      }

      completeTeacherLogin(data);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("Server not responding. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitForgotPassword = async () => {
    setForgotMessage("");
    setError("");
    const cleanIdentifier = String(identifier || "").trim();
    if (!cleanIdentifier) {
      setForgotMessage("Please enter Teacher ID or Email");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/teacher/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotMessage(data?.error || "Failed to submit reset request");
        toast.error(data?.error || "Failed to submit reset request");
        return;
      }
      const msg = data?.message || "If account exists, reset request has been sent to admin.";
      setForgotMessage(msg);
      toast.success(msg);
      setIdentifier("");
    } catch (err) {
      console.error("TEACHER FORGOT PASSWORD ERROR:", err);
      setForgotMessage("Failed to submit reset request");
      toast.error("Failed to submit reset request");
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
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Teacher Login</h2>
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
          type="button"
          onClick={() => {
            setShowForgot((prev) => !prev);
            setForgotMessage("");
          }}
          className="w-full text-left mb-4 text-sm font-semibold text-blue-700 hover:text-blue-800 transition"
        >
          Forgot Password?
        </button>

        {showForgot && (
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-2">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Teacher ID or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={submitForgotPassword}
                disabled={forgotLoading}
                className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
              >
                {forgotLoading ? "Submitting..." : "Request Password Reset"}
              </button>
            </div>
            {forgotMessage && (
              <p className="text-xs font-semibold text-slate-700 break-words">{forgotMessage}</p>
            )}
          </div>
        )}

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
          role="TEACHER"
          onLoginSuccess={completeTeacherLogin}
          setError={setError}
          setInfo={setInfo}
        />
      </form>
    </div>
  );
}
