import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

/**
 * 🔐 Developer Portal Login
 * Secure access with Developer Email + Access Code
 * Hidden from public navigation
 * Access via: /system-core/dev-access
 */
export default function DevLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/dev/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          accessCode: accessCode.trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.token) {
        setError(payload?.error || "Access denied. Please check your credentials.");
        return;
      }

      // ✅ Store developer token
      localStorage.setItem("developerToken", payload.token);
      localStorage.setItem("userRole", "developer");
      localStorage.setItem("developerEmail", email);

      // Redirect to dev dashboard
      navigate("/system-core/dev-dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to connect to server");
      console.error("Development Login Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 px-4 py-6 md:py-12">
      <div className="mx-auto w-full max-w-md">
        {/* Header with Navigation Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-mono tracking-widest text-cyan-400 uppercase">⚙️ System Core</h2>
            <p className="text-xs text-slate-400 mt-1">Developer Access Portal</p>
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 transition"
            aria-label="Toggle menu"
          >
            <span className="block h-0.5 w-5 bg-white" />
            <span className="mt-1 block h-0.5 w-5 bg-white" />
            <span className="mt-1 block h-0.5 w-5 bg-white" />
          </button>
        </div>

        {/* Navigation Menu */}
        {showMenu && (
          <div className="mb-6 rounded-xl border border-white/20 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            <button
              onClick={() => navigate("/")}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-100 hover:bg-white/10 transition"
            >
              🏠 Home
            </button>
            <button
              onClick={() => navigate("/admin/login")}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-100 hover:bg-white/10 transition border-t border-white/10"
            >
              👨‍💼 Admin Login
            </button>
            <button
              onClick={() => navigate("/teacher/login")}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-100 hover:bg-white/10 transition border-t border-white/10"
            >
              🎓 Teacher Login
            </button>
            <button
              onClick={() => navigate("/student/login")}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-100 hover:bg-white/10 transition border-t border-white/10"
            >
              👨‍🎓 Student Login
            </button>
          </div>
        )}

        {/* Login Card - Premium SaaS Style */}
        <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          {/* Badge */}
          <div className="mb-6 inline-block rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30">
            🔐 DEVELOPER ONLY
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Developer Access</h1>
          <p className="text-sm text-slate-300 mb-8">
            Access the system monitoring dashboard with your credentials.
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
              <div className="flex">
                <span className="text-lg mr-2">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="dev-email" className="block text-xs font-bold text-slate-200 uppercase mb-2">
                Developer Email
              </label>
              <input
                id="dev-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="developer@school.com"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Access Code Field */}
            <div>
              <label htmlFor="dev-access-code" className="block text-xs font-bold text-slate-200 uppercase mb-2">
                Access Code
              </label>
              <input
                id="dev-access-code"
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter access code"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-slate-400">
                Access code is configured in the system environment.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email || !accessCode}
              className="w-full mt-6 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-400 to-blue-500 px-4 py-3 font-bold text-slate-950 transition hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="inline-block h-4 w-4 border-2 border-transparent border-t-slate-950 rounded-full animate-spin mr-2" />
                  Authenticating...
                </span>
              ) : (
                "Access Developer Console"
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-slate-400">
            <p>🔒 This portal is hidden from public navigation.</p>
            <p className="mt-2">Only system administrators can access this area.</p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            By accessing this portal, you agree to our Developer Terms.
          </p>
        </div>
      </div>
    </div>
  );
}
