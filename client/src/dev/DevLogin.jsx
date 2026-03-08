import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function DevLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/dev/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase() || "dev@school.local",
          accessCode: accessCode.trim() || "supersecretdevkey",
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.token) {
        setError(payload?.error || "Access denied. Please check your credentials.");
        return;
      }

      // Store developer token
      localStorage.setItem("developerToken", payload.token);
      localStorage.setItem("devAccess", "true");
      localStorage.setItem("userRole", "DEVELOPER");
      navigate("/dev-console", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to connect to server");
      console.error("Dev login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Developer Console</h1>
            <p className="text-slate-400 text-sm">Enter your credentials to continue</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
              <p className="text-red-300 text-sm font-medium">⚠️ {error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-200 mb-2">
                Developer Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@school.local"
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            {/* Access Code Input */}
            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-slate-200 mb-2">
                Access Code
              </label>
              <input
                id="code"
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code"
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Enter Developer Console"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-700 text-center">
            <p className="text-slate-500 text-xs">
              🔒 This portal is for developers only. Unauthorized access is prohibited.
            </p>
          </div>
        </div>

        {/* Bottom Info */}
        <p className="text-center text-slate-400 text-xs mt-6">
          Developer Tools • Analytics • Monitoring
        </p>
      </div>
    </div>
  );
}
