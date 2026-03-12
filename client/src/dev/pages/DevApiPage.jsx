import { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/ui/EmptyState";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API_URL = import.meta.env.VITE_API_URL;
const CACHE_KEY = "dev_api_usage_cache_v1";
const CACHE_TTL_MS = 60 * 1000;

const chartWrapClass = "w-full min-w-0 min-h-[300px]";

const metricCardClass = "rounded-2xl border border-slate-700 bg-slate-800 p-4";

const truncateEndpoint = (value = "") => {
  const text = String(value || "");
  if (text.length <= 30) return text;
  return `${text.slice(0, 27)}...`;
};

const normalizeTopEndpoints = (rows = []) =>
  (Array.isArray(rows) ? rows : []).slice(0, 10).map((row) => ({
    endpoint: truncateEndpoint(row?.endpoint || row?._id || "Unknown"),
    requests: Number(row?.count || 0),
    avgMs: Number(row?.avgMs || 0),
  }));

const normalizeTimeline = (rows = []) =>
  (Array.isArray(rows) ? rows : []).slice(-24).map((row) => ({
    hour: String(row?.hour || row?.time || ""),
    requests: Number(row?.count || row?.requests || 0),
  }));

const normalizeSlowest = (rows = []) =>
  (Array.isArray(rows) ? rows : []).slice(0, 8).map((row) => ({
    endpoint: truncateEndpoint(row?.endpoint || row?._id || "Unknown"),
    avgMs: Number(row?.avgMs || 0),
  }));

export default function DevApiPage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState({
    apiRequestsToday: 0,
    topEndpoints: [],
    requestTimeline: [],
    slowestEndpoints: [],
  });

  const hasCharts = useMemo(
    () => usage.topEndpoints.length > 0 || usage.requestTimeline.length > 0 || usage.slowestEndpoints.length > 0,
    [usage]
  );

  const latencyInsights = useMemo(() => {
    const latencies = (usage.slowestEndpoints || []).map((row) => Number(row.avgMs || 0)).filter((ms) => ms > 0).sort((a, b) => a - b);
    if (!latencies.length) return { p50: 0, p95: 0, max: 0 };
    const p50 = latencies[Math.floor((latencies.length - 1) * 0.5)] || 0;
    const p95 = latencies[Math.floor((latencies.length - 1) * 0.95)] || latencies[latencies.length - 1];
    const max = latencies[latencies.length - 1] || 0;
    return { p50, p95, max };
  }, [usage.slowestEndpoints]);

  useEffect(() => {
    const controller = new AbortController();

    const hydrateCache = () => {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed?.savedAt || Date.now() - Number(parsed.savedAt) > CACHE_TTL_MS) return false;
        if (!parsed?.data) return false;
        setUsage(parsed.data);
        setLoading(false);
        return true;
      } catch {
        return false;
      }
    };

    const load = async () => {
      const hasCached = hydrateCache();
      if (hasCached) setRefreshing(true);
      else setLoading(true);

      try {
        setError("");

        const timeout = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(`${API_URL}/api/dev/api-usage`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || payload?.error || "Failed to load API usage");

        const topEndpoints = normalizeTopEndpoints(payload?.data?.topEndpoints);
        const requestTimeline = normalizeTimeline(payload?.data?.requestTimeline);
        const slowestEndpoints = normalizeSlowest(payload?.data?.slowestEndpoints);

        const next = {
          apiRequestsToday: Number(payload?.data?.apiRequestsToday || topEndpoints.reduce((sum, row) => sum + row.requests, 0) || 0),
          topEndpoints,
          requestTimeline,
          slowestEndpoints,
        };

        setUsage(next);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: next }));
      } catch (requestError) {
        if (controller.signal.aborted || requestError?.name === "AbortError") return;
        setError(requestError?.message || "Failed to load API usage");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    load();
    return () => controller.abort();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">API Request Monitor</h1>
        <p className="text-slate-400">Top endpoints, request volume, and latency hotspots</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-600/50 bg-red-900/30 px-4 py-3">
          <p className="text-sm font-medium text-red-300">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <article key={`metric-skeleton-${idx}`} className={`${metricCardClass} animate-pulse`}>
              <div className="h-3 w-28 rounded bg-slate-700" />
              <div className="mt-3 h-8 w-20 rounded bg-slate-700" />
            </article>
          ))}
        </section>
      ) : null}
      {refreshing ? <p className="text-xs text-slate-400">Refreshing latest data...</p> : null}

      {!loading ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className={metricCardClass}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">API Requests Today</p>
              <p className="mt-2 text-3xl font-black text-white">{usage.apiRequestsToday || 0}</p>
            </article>
            <article className={metricCardClass}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tracked Endpoints</p>
              <p className="mt-2 text-3xl font-black text-white">{usage.topEndpoints.length}</p>
            </article>
            <article className={metricCardClass}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Latency Alerts</p>
              <p className="mt-2 text-3xl font-black text-white">{usage.slowestEndpoints.length}</p>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className={metricCardClass}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Latency P50</p>
              <p className="mt-2 text-2xl font-black text-emerald-300">{latencyInsights.p50} ms</p>
            </article>
            <article className={metricCardClass}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Latency P95</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{latencyInsights.p95} ms</p>
            </article>
            <article className={metricCardClass}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Worst Avg Latency</p>
              <p className="mt-2 text-2xl font-black text-rose-300">{latencyInsights.max} ms</p>
            </article>
          </section>

      {hasCharts ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {usage.topEndpoints.length > 0 ? (
                <article className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                  <h3 className="text-base font-black text-white mb-3">Top Endpoints by Requests</h3>
                  <div className={chartWrapClass}>
                    <ResponsiveContainer width="100%" height={300} minWidth={280} minHeight={260} debounce={80}>
                      <BarChart data={usage.topEndpoints} margin={{ top: 10, right: 8, left: -10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="endpoint" tick={{ fill: "#cbd5e1", fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                        <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="requests" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              ) : null}

              {usage.requestTimeline.length > 0 ? (
                <article className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                  <h3 className="text-base font-black text-white mb-3">Request Timeline (24h)</h3>
                  <div className={chartWrapClass}>
                    <ResponsiveContainer width="100%" height={300} minWidth={280} minHeight={260} debounce={80}>
                      <LineChart data={usage.requestTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="hour" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="requests" stroke="#06b6d4" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              ) : null}

              {usage.slowestEndpoints.length > 0 ? (
                <article className="rounded-2xl border border-slate-700 bg-slate-800 p-4 xl:col-span-2">
                  <h3 className="text-base font-black text-white mb-3">Slowest Endpoints (Avg ms)</h3>
                  <div className={chartWrapClass}>
                    <ResponsiveContainer width="100%" height={300} minWidth={280} minHeight={260} debounce={80}>
                      <BarChart data={usage.slowestEndpoints} margin={{ top: 10, right: 8, left: -10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="endpoint" tick={{ fill: "#cbd5e1", fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                        <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="avgMs" fill="#f97316" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-slate-400">No API data available</div>
          )}
        </>
      ) : (
        <EmptyState
          tone="dark"
          title="No API activity yet"
          description="API usage analytics will appear after traffic flows through the system."
        />
      )}
    </div>
  );
}