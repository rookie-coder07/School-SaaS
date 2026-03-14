import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { safeFetchJson } from "../utils/safeFetch";

const API_URL = import.meta.env.VITE_API_URL;

export default function DevLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      const normalizedCode = accessCode.trim();

      if (!normalizedEmail || !normalizedPassword || !normalizedCode) {
        setError("Email, password, and access code are required.");
        return;
      }

      let payload;
      try {
        const response = await safeFetchJson(`${API_URL}/api/dev/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password: normalizedPassword,
            accessCode: normalizedCode,
          }),
          requestLabel: "dev-login-primary",
        });
        payload = response.data;
      } catch (primaryErr) {
        if (Number(primaryErr?.status) !== 404) throw primaryErr;
        const fallback = await safeFetchJson(`${API_URL}/api/auth/developer/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password: normalizedPassword,
          }),
          requestLabel: "dev-login-fallback",
        });
        payload = fallback.data;
      }

      if (!payload?.token) {
        setError("Access denied. Please check your credentials.");
        return;
      }

      // Store developer token
      localStorage.setItem("developerToken", payload.token);
      localStorage.setItem("dev_token", payload.token);
      localStorage.setItem("devAccess", "true");
      localStorage.setItem("userRole", "DEVELOPER");
      navigate("/internal/dev-portal/dashboard", { replace: true });
    } catch (err) {
      const message = String(err?.message || "");
      if (/Unexpected token '<'|DOCTYPE|html/i.test(message)) {
        setError(`Developer API URL is incorrect (${API_URL}). Set VITE_API_URL to your backend (port 5000).`);
      } else {
        setError(message || "Failed to connect to server");
      }
      console.error("Dev login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 md:p-8 text-white shadow-2xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Developer Console</p>
            <h1 className="mt-3 text-3xl font-black">Monitor system health and platform activity.</h1>
            <p className="mt-3 text-sm text-slate-300">Use secure access credentials to enter the internal monitoring suite.</p>
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-2xl p-8 md:p-10">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Developer Console</h1>
            <p className="text-slate-400 text-sm">Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
              <p className="text-red-300 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-200 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

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
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Enter Developer Console"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-700 text-center">
            <p className="text-slate-400 text-xs">
              This portal is for developers only. Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

