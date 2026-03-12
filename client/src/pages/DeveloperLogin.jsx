import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function DeveloperLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/developer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.token) {
        setError(payload?.error || "Login failed");
        return;
      }

      localStorage.setItem("developerToken", payload.token);
      localStorage.setItem("userRole", "developer");
      navigate("/dev", { replace: true });
    } catch (requestError) {
      setError(requestError?.message || "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="relative mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            className="rounded-xl border border-white/30 bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <span className="block h-0.5 w-5 bg-white" />
            <span className="mt-1 block h-0.5 w-5 bg-white" />
            <span className="mt-1 block h-0.5 w-5 bg-white" />
          </button>
          <p className="text-xs font-semibold tracking-wide text-slate-200">Developer Portal</p>
        </div>

        {menuOpen ? (
          <div className="mb-4 rounded-2xl border border-white/20 bg-slate-900/60 p-3 text-sm text-slate-100 backdrop-blur-md">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/login")}
              className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            >
              Admin Login
            </button>
            <button
              type="button"
              onClick={() => navigate("/teacher/login")}
              className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            >
              Teacher Login
            </button>
            <button
              type="button"
              onClick={() => navigate("/student/login")}
              className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            >
              Student Login
            </button>
          </div>
        ) : null}
      </div>

      <div className="mx-auto mt-10 w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <h1 className="text-2xl font-black text-white md:text-3xl">Developer Login</h1>
        <p className="mt-1 text-sm text-slate-200">Sign in with your developer account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-200/40 bg-rose-400/20 px-3 py-2 text-sm font-medium text-rose-100">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="dev-email" className="mb-1 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="dev-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 outline-none ring-cyan-300 transition focus:ring-2"
              placeholder="developer@example.com"
            />
          </div>

          <div>
            <label htmlFor="dev-password" className="mb-1 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              id="dev-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-300 outline-none ring-cyan-300 transition focus:ring-2"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
