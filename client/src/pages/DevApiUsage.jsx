import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const CACHE_KEY = "legacy_dev_api_usage_cache_v1";
const CACHE_TTL_MS = 60 * 1000;

export default function DevApiUsage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState({
    apiRequestsToday: 0,
    topEndpoints: [],
    slowestEndpoints: [],
    requestTimeline: [],
  });

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.savedAt && Date.now() - Number(parsed.savedAt) <= CACHE_TTL_MS && parsed?.data) {
            setUsage((prev) => ({ ...prev, ...(parsed.data || {}) }));
            setLoading(false);
          } else {
            setLoading(true);
          }
        } else {
          setLoading(true);
        }
        setError("");
        const response = await fetch(`${API_URL}/api/dev/api-usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.message || "Failed to load API usage");
        const next = payload.data || {};
        setUsage((prev) => ({ ...prev, ...next }));
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: next }));
      } catch (requestError) {
        setError(requestError?.message || "Failed to load API usage");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <DevPortalLayout title="API Request Monitor" subtitle="Top endpoints, request volume, and latency hotspots.">
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200/40 bg-rose-400/20 px-4 py-3 text-sm font-medium text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-500/35 to-blue-700/25 p-4 shadow-xl backdrop-blur-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-100">API Requests Today</p>
          <p className="mt-2 text-3xl font-black text-white">{loading ? "..." : usage.apiRequestsToday}</p>
        </article>
        <article className="rounded-2xl border border-white/20 bg-gradient-to-br from-violet-500/35 to-purple-700/25 p-4 shadow-xl backdrop-blur-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-100">Top Endpoints</p>
          <p className="mt-2 text-3xl font-black text-white">{loading ? "..." : usage.topEndpoints.length}</p>
        </article>
        <article className="rounded-2xl border border-white/20 bg-gradient-to-br from-amber-400/35 to-orange-700/25 p-4 shadow-xl backdrop-blur-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-100">Slow Endpoints</p>
          <p className="mt-2 text-3xl font-black text-white">{loading ? "..." : usage.slowestEndpoints.length}</p>
        </article>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
          <h3 className="text-base font-black text-white">Top Endpoints</h3>
          <div className="mt-3 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height={300} minWidth={280} minHeight={260}>
              <BarChart data={usage.topEndpoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="endpoint" tick={{ fill: "#e2e8f0", fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fill: "#e2e8f0", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#22d3ee" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
          <h3 className="text-base font-black text-white">Requests Timeline</h3>
          <div className="mt-3 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height={300} minWidth={280} minHeight={260}>
              <LineChart data={usage.requestTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="hour" tick={{ fill: "#e2e8f0", fontSize: 11 }} />
                <YAxis tick={{ fill: "#e2e8f0", fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
        <h3 className="text-base font-black text-white">Slowest Endpoints</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="text-slate-200">
              <tr>
                <th className="px-2 py-2">Endpoint</th>
                <th className="px-2 py-2">Avg ms</th>
                <th className="px-2 py-2">Max ms</th>
                <th className="px-2 py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {(usage.slowestEndpoints || []).map((row) => (
                <tr key={row.endpoint} className="border-t border-white/10 text-slate-100">
                  <td className="px-2 py-2">{row.endpoint}</td>
                  <td className="px-2 py-2">{row.avgMs}</td>
                  <td className="px-2 py-2">{row.maxMs}</td>
                  <td className="px-2 py-2">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DevPortalLayout>
  );
}
