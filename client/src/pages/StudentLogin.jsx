import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Menu, Shield, Users } from "lucide-react";
import { sessionTracker } from "../utils/sessionTracker";
import FingerprintAuthActions from "../components/FingerprintAuthActions";

const API_URL = import.meta.env.VITE_API_URL;

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  const completeStudentLogin = (data) => {
    localStorage.setItem("studentToken", data.token);

    if (data.schoolName) {
      localStorage.setItem("studentSchoolName", data.schoolName);
    }
    if (data.mustChangePassword) {
      localStorage.setItem("studentMustChangePassword", "1");
    } else {
      localStorage.removeItem("studentMustChangePassword");
    }

    let studentUserId = null;
    let schoolId = null;
    try {
      const tokenParts = data.token.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.schoolId) {
          localStorage.setItem("studentSchoolId", payload.schoolId);
          schoolId = payload.schoolId;
        }
        if (payload.userId) {
          studentUserId = payload.userId;
        }
      }
    } catch (err) {
      console.error("Failed to extract token data:", err);
    }

    if (studentUserId && schoolId) {
      sessionTracker.startSession(studentUserId, "STUDENT", schoolId);
    }

    navigate("/student/dashboard");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/student/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Login failed");
        return;
      }

      completeStudentLogin(data);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-10">
        <div className="absolute right-6 top-6 z-10">
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white/90 transition hover:bg-white/20"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-3 w-48 rounded-xl border border-white/15 bg-slate-900/80 p-2 text-sm text-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                >
                  Back to Home
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/student/login")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                >
                  <GraduationCap className="h-4 w-4" />
                  Student Portal
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/teacher/login")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                >
                  <Users className="h-4 w-4" />
                  Teacher Portal
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/admin/login")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                >
                  <Shield className="h-4 w-4" />
                  Admin Console
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-80 w-80 rounded-full bg-emerald-400/20 blur-[120px]" />
          <div className="-ml-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
        </div>

        <form
          onSubmit={handleLogin}
          className="relative mx-auto w-full max-w-lg rounded-2xl border border-white/20 bg-slate-800/70 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <div className="text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              EduNest
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Student Login</h1>
          <p className="mt-2 text-center text-sm text-slate-300">Sign in to access your learning dashboard.</p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
              {error}
            </div>
          )}

          {info && (
            <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              {info}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-emerald-400 to-green-500 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <FingerprintAuthActions
            email={email}
            password={password}
            role="STUDENT"
            onLoginSuccess={completeStudentLogin}
            setError={setError}
            setInfo={setInfo}
          />

          <button
            type="button"
            onClick={() => {
              setForgotEmail(email);
              setForgotMessage("");
              setShowForgotModal(true);
            }}
            className="mt-4 w-full text-sm font-semibold text-emerald-200 hover:text-emerald-100 transition"
          >
            Forgot Password?
          </button>
        </form>
      </main>

      {showForgotModal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="w-full h-full rounded-none border border-white/10 bg-slate-900/90 p-5 shadow-2xl sm:h-auto sm:max-w-md sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-white">Forgot Password</h3>
            <p className="mt-2 text-sm text-slate-300">
              Submit a reset request. Your class teacher will set a temporary password.
            </p>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="Enter your student email"
              className="mt-4 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {forgotMessage && <p className="mt-2 text-sm text-slate-200">{forgotMessage}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Close
              </button>
              <button
                type="button"
                onClick={submitForgotRequest}
                disabled={forgotLoading}
                className="flex-1 rounded-lg bg-gradient-to-r from-emerald-400 to-green-500 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:opacity-50"
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
