import { useEffect, useState } from "react";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL;

const formatBytes = (value = 0) => {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

export default function DevSystem() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHealth = async () => {
      setError("");
      try {
        const token = localStorage.getItem("developerToken");
        const response = await fetch(`${API_URL}/api/dev/system-health`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.message || "Failed to fetch system health");
        setHealth(payload.data);
      } catch (requestError) {
        setError(requestError?.message || "Failed to fetch system health");
      }
    };
    loadHealth();
  }, []);

  return (
    <DevPortalLayout title="System Health" subtitle="Live server uptime, memory usage, and status from /health endpoint.">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-white/20 bg-gradient-to-br from-emerald-400/35 to-green-700/25 p-5 shadow-xl backdrop-blur-lg">
          <p className="text-sm font-semibold text-slate-100">Status</p>
          <p className="mt-2 text-2xl font-black text-white">{health?.status || "-"}</p>
        </article>
        <article className="rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-400/35 to-blue-700/25 p-5 shadow-xl backdrop-blur-lg">
          <p className="text-sm font-semibold text-slate-100">Server Uptime</p>
          <p className="mt-2 text-2xl font-black text-white">{Math.floor(health?.uptime || 0)}s</p>
        </article>
        <article className="rounded-2xl border border-white/20 bg-gradient-to-br from-violet-400/35 to-purple-700/25 p-5 shadow-xl backdrop-blur-lg">
          <p className="text-sm font-semibold text-slate-100">Database</p>
          <p className="mt-2 text-2xl font-black text-white">{health?.mongodb || "-"}</p>
        </article>
        <article className="rounded-2xl border border-white/20 bg-gradient-to-br from-amber-300/35 to-orange-700/25 p-5 shadow-xl backdrop-blur-lg">
          <p className="text-sm font-semibold text-slate-100">CPU Load (1m)</p>
          <p className="mt-2 text-2xl font-black text-white">{Number(health?.cpu?.usagePercent || 0).toFixed(1)}%</p>
        </article>
      </div>

      <section className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-lg">
        <h3 className="text-lg font-black text-white">Memory Usage</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-white/15 p-3 text-sm text-slate-100">RSS: {formatBytes(health?.memory?.rss)}</div>
          <div className="rounded-xl bg-white/15 p-3 text-sm text-slate-100">Heap Used: {formatBytes(health?.memory?.heapUsed)}</div>
          <div className="rounded-xl bg-white/15 p-3 text-sm text-slate-100">Heap Total: {formatBytes(health?.memory?.heapTotal)}</div>
          <div className="rounded-xl bg-white/15 p-3 text-sm text-slate-100">External: {formatBytes(health?.memory?.external)}</div>
        </div>
        <div className="mt-3 rounded-xl bg-white/15 p-3 text-sm text-slate-100">Node PID: {health?.pid || "-"}</div>
      </section>
    </DevPortalLayout>
  );
}
