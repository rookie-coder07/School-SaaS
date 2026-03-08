import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

/**
 * 🚀 Premium Developer Dashboard
 * System monitoring, analytics, and control center
 * Responsive design for mobile, tablet, and desktop
 */
export default function DevDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("developerToken");
      if (!token) {
        navigate("/system-core/dev-access");
        return;
      }

      const [dashRes, healthRes] = await Promise.all([
        fetch(`${API_URL}/api/dev/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/dev/system-health`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dashData = await dashRes.json();
      const healthData = await healthRes.json();

      if (dashRes.ok) {
        setDashboardData(dashData.data || dashData);
      }
      if (healthRes.ok) {
        setSystemHealth(healthData.data || healthData);
      }

      setError("");
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds if enabled
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleLogout = () => {
    localStorage.removeItem("developerToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("developerEmail");
    navigate("/system-core/dev-access");
  };

  // Default dashboard data if API fails
  const defaultData = {
    systemUptime: "45 days 12 hours",
    activeUsers: 342,
    apiRequests: 125430,
    errorsToday: 8,
    totalSchools: 24,
    memoryUsage: "512 MB / 2048 MB",
    cpuUsage: "23%",
    mongoStatus: "Connected",
  };

  const data = dashboardData || defaultData;
  const health = systemHealth || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">
                ⚙️
              </div>
              <div>
                <h1 className="text-lg font-black text-white">System Core</h1>
                <p className="text-xs text-slate-400">Developer Console</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-slate-300">Auto-Refresh</span>
              </label>

              <button
                onClick={fetchDashboardData}
                className="px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-sm text-slate-200 hover:bg-white/20 transition"
              >
                🔄 Refresh
              </button>

              <div className="hidden sm:block h-6 w-px bg-white/10" />

              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm text-slate-300">{localStorage.getItem("developerEmail")}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-sm font-medium text-red-300 hover:bg-red-600/30 transition"
                >
                  Logout
                </button>
              </div>

              {/* Mobile Logout */}
              <button
                onClick={handleLogout}
                className="sm:hidden px-3 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-sm text-red-300 hover:bg-red-600/30 transition"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Status Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Quick Stats Grid - 2 columns mobile, 3-5 columns desktop */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* System Uptime */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 hover:border-cyan-400/30 transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300">System Uptime</h3>
                  <span className="text-2xl">⏱️</span>
                </div>
                <p className="text-2xl font-black text-cyan-400">{data.systemUptime}</p>
                <p className="text-xs text-slate-500 mt-2">Continuous operation</p>
              </div>

              {/* Active Users */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 hover:border-blue-400/30 transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300">Active Users</h3>
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-2xl font-black text-blue-400">{data.activeUsers}</p>
                <p className="text-xs text-slate-500 mt-2">Currently online</p>
              </div>

              {/* API Requests */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 hover:border-purple-400/30 transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300">API Requests</h3>
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-2xl font-black text-purple-400">{data.apiRequests.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Total today</p>
              </div>

              {/* Errors Today */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 hover:border-rose-400/30 transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300">Errors Today</h3>
                  <span className="text-2xl">🔴</span>
                </div>
                <p className="text-2xl font-black text-rose-400">{data.errorsToday}</p>
                <p className="text-xs text-slate-500 mt-2">Last 24 hours</p>
              </div>

              {/* Total Schools */}
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 hover:border-green-400/30 transition">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300">Schools</h3>
                  <span className="text-2xl">🏫</span>
                </div>
                <p className="text-2xl font-black text-green-400">{data.totalSchools}</p>
                <p className="text-xs text-slate-500 mt-2">Active accounts</p>
              </div>
            </div>

            {/* System Health Section */}
            <div className="mb-8 rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white mb-6">🖥️ System Health</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Memory Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-300">Memory Usage</span>
                    <span className="text-xs font-mono text-cyan-400">{health.memoryUsage || data.memoryUsage}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      style={{ width: `${health.memoryPercent || 50}%` }}
                    />
                  </div>
                </div>

                {/* CPU Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-300">CPU Usage</span>
                    <span className="text-xs font-mono text-blue-400">{health.cpuUsage || data.cpuUsage}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                      style={{ width: `${health.cpuPercent || 23}%` }}
                    />
                  </div>
                </div>

                {/* MongoDB Status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-300">Database Status</span>
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-green-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      {health.mongoStatus || data.mongoStatus}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-green-500" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Cards */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-white mb-4">📊 Developer Tools</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: "Schools Management",
                    path: "/system-core/schools",
                    icon: "🏫",
                    desc: "View and manage schools",
                  },
                  {
                    title: "System Logs",
                    path: "/system-core/logs",
                    icon: "📝",
                    desc: "View system activity logs",
                  },
                  {
                    title: "Error Tracking",
                    path: "/system-core/errors",
                    icon: "⚠️",
                    desc: "Monitor application errors",
                  },
                  {
                    title: "API Usage",
                    path: "/system-core/api-usage",
                    icon: "📈",
                    desc: "API request analytics",
                  },
                  {
                    title: "Live Activity",
                    path: "/system-core/live-activity",
                    icon: "🔴",
                    desc: "Real-time system activity",
                  },
                  {
                    title: "Developer Tools",
                    path: "/system-core/tools",
                    icon: "🛠️",
                    desc: "Advanced utilities",
                  },
                ].map((tool) => (
                  <button
                    key={tool.path}
                    onClick={() => navigate(tool.path)}
                    className="text-left rounded-lg border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4 hover:border-cyan-400/50 hover:bg-white/15 transition group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{tool.icon}</span>
                      <h3 className="font-semibold text-white group-hover:text-cyan-300 transition">{tool.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400">{tool.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Server Info */}
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Server Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
                <div>
                  <span className="text-slate-500">Node Version:</span> {health.nodeVersion || "v18.0.0"}
                </div>
                <div>
                  <span className="text-slate-500">Platform:</span> {health.platform || "linux"}
                </div>
                <div>
                  <span className="text-slate-500">Environment:</span> {health.environment || "production"}
                </div>
                <div>
                  <span className="text-slate-500">Last Deploy:</span> {health.lastDeploy || "2 hours ago"}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>System Core Dashboard • Secure Developer Portal • {new Date().toLocaleDateString()}</p>
      </footer>
    </div>
  );
}
