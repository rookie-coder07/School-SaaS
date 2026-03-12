import { useEffect, useState } from "react";
import DevStatusBadge from "../components/DevStatusBadge";

const API_URL = import.meta.env.VITE_API_URL;

export default function DevSystemPage() {
  const token = localStorage.getItem("developerToken");
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const loadHealth = async () => {
      setError("");
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/dev/system-health`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Failed to fetch system health");
        setHealth(payload.data || {});
      } catch (requestError) {
        if (controller.signal.aborted || requestError?.name === "AbortError") return;
        setError(requestError?.message || "Failed to fetch system health");
      } finally {
        setLoading(false);
      }
    };
    loadHealth();
    return () => controller.abort();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Health</h1>
        <p className="text-slate-400">Live server uptime, memory usage, and status</p>
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-slate-400">Loading system health data...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-600/50 bg-red-900/30 px-4 py-3">
          <p className="text-sm font-medium text-red-300">⚠️ {error}</p>
        </div>
      )}

      {!loading && health && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-700 bg-slate-800 p-5 hover:border-slate-600 transition">
              <p className="text-sm font-semibold text-slate-400">Environment</p>
              <p className="mt-2 text-2xl font-black text-white">{health?.environment || "N/A"}</p>
            </article>
            <article className="rounded-2xl border border-slate-700 bg-slate-800 p-5 hover:border-slate-600 transition">
              <p className="text-sm font-semibold text-slate-400">Server Uptime</p>
              <p className="mt-2 text-2xl font-black text-white">{health?.uptime || "N/A"}</p>
            </article>
            <article className="rounded-2xl border border-slate-700 bg-slate-800 p-5 hover:border-slate-600 transition">
              <p className="text-sm font-semibold text-slate-400">Database</p>
              <p className="mt-2"><DevStatusBadge status={String(health?.mongoStatus || "").toLowerCase().includes("connect") ? "active" : "disabled"} text={health?.mongoStatus || "N/A"} /></p>
            </article>
            <article className="rounded-2xl border border-slate-700 bg-slate-800 p-5 hover:border-slate-600 transition">
              <p className="text-sm font-semibold text-slate-400">CPU Load</p>
              <p className="mt-2 text-2xl font-black text-white">{health?.cpuUsage || "0%"}</p>
              <div className="mt-2">
                <DevStatusBadge
                  status={(Number(health?.cpuPercent || 0) || 0) > 85 ? "warning" : "active"}
                  text={(Number(health?.cpuPercent || 0) || 0) > 85 ? "High" : "Normal"}
                />
              </div>
            </article>
          </div>

          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-lg font-black text-white mb-4">System Information</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-700/50 p-4 border border-slate-600">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Memory Usage</p>
                <p className="mt-2 text-lg font-bold text-white">{health?.memoryUsage || "N/A"}</p>
                <p className="mt-1 text-xs text-slate-400">Percentage: {health?.memoryPercent || 0}%</p>
                <div className="mt-2">
                  <DevStatusBadge
                    status={(Number(health?.memoryPercent || 0) || 0) > 85 ? "warning" : "active"}
                    text={(Number(health?.memoryPercent || 0) || 0) > 85 ? "High" : "Normal"}
                  />
                </div>
              </div>
              <div className="rounded-xl bg-slate-700/50 p-4 border border-slate-600">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">CPU Usage</p>
                <p className="mt-2 text-lg font-bold text-white">{health?.cpuUsage || "0%"}</p>
                <p className="mt-1 text-xs text-slate-400">Percentage: {health?.cpuPercent || 0}%</p>
              </div>
              <div className="rounded-xl bg-slate-700/50 p-4 border border-slate-600">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Node Version</p>
                <p className="mt-2 text-lg font-bold text-white">{health?.nodeVersion || "N/A"}</p>
              </div>
              <div className="rounded-xl bg-slate-700/50 p-4 border border-slate-600">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Platform</p>
                <p className="mt-2 text-lg font-bold text-white capitalize">{health?.platform || "N/A"}</p>
              </div>
            </div>
            {health?.timestamp && (
              <div className="mt-4 flex items-center justify-between px-3 py-2 bg-slate-700/30 rounded border border-slate-600 text-xs text-slate-400">
                <span>Last updated:</span>
                <span className="font-mono">{new Date(health.timestamp).toLocaleString()}</span>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

