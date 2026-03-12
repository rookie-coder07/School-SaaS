import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const cardClass = "rounded-2xl border border-white/15 bg-slate-950/45 p-5 shadow-[0_14px_34px_rgba(2,6,23,0.4)] backdrop-blur-xl";

const metricCards = [
  { key: "totalSchools", label: "Total Schools" },
  { key: "totalUsers", label: "Total Users" },
  { key: "totalStudents", label: "Total Students" },
  { key: "totalTeachers", label: "Total Teachers" },
  { key: "activeErrors", label: "Active Errors" },
  { key: "avgApiLatency", label: "Average API Latency (ms)" },
  { key: "voiceMessagesToday", label: "Voice Messages Today" },
];

export default function DevDashboardPage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    totalSchools: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeErrors: 0,
    avgApiLatency: 0,
    voiceMessagesToday: 0,
    maintenanceMode: false,
    uploadsDisabled: false,
    topErrors: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [schoolsRes, usersRes, overviewRes, healthRes, errorsRes, apiUsageRes, voiceRes] = await Promise.all([
          fetch(`${API_URL}/api/dev/schools?page=1&limit=1`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/dev/users?page=1&limit=1`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/dev/portal/overview`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/dev/system-health`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/dev/errors?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/dev/api-usage`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/dev/voice-messages?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const [schools, users, overview, health, errors, apiUsage, voice] = await Promise.all([
          schoolsRes.json(),
          usersRes.json(),
          overviewRes.json(),
          healthRes.json(),
          errorsRes.json(),
          apiUsageRes.json(),
          voiceRes.json(),
        ]);

        if (!schoolsRes.ok || !usersRes.ok || !overviewRes.ok || !healthRes.ok || !errorsRes.ok || !apiUsageRes.ok || !voiceRes.ok) {
          throw new Error(
            schools?.message ||
              users?.message ||
              overview?.message ||
              errors?.message ||
              apiUsage?.message ||
              voice?.message ||
              health?.message ||
              "Failed to load dashboard"
          );
        }

        const control = health?.data?.platformControl || {};
        const errorRows = Array.isArray(errors?.data?.errors) ? errors.data.errors : [];
        const topErrors = errorRows
          .slice(0, 3)
          .map((row) => ({
            route: row?.endpoint || row?.route || "Unknown",
            message: row?.message || "Unknown error",
            statusCode: row?.statusCode || "",
          }));
        const slowRows = Array.isArray(apiUsage?.data?.slowestEndpoints) ? apiUsage.data.slowestEndpoints : [];
        const avgLatency = slowRows.length
          ? Math.round(slowRows.reduce((sum, row) => sum + Number(row?.avgMs || 0), 0) / slowRows.length)
          : 0;
        const voiceRows = Array.isArray(voice?.data) ? voice.data : [];
        const dayKey = new Date().toISOString().slice(0, 10);
        const voiceToday = voiceRows.filter((row) => String(row?.createdAt || "").slice(0, 10) === dayKey).length;

        setData({
          totalSchools: Number(schools?.totalCount || 0),
          totalUsers: Number(users?.totalCount || 0),
          totalStudents: Number(overview?.data?.totalStudents || 0),
          totalTeachers: Number(overview?.data?.totalTeachers || 0),
          activeErrors: errorRows.length,
          avgApiLatency: avgLatency,
          voiceMessagesToday: voiceToday,
          maintenanceMode: Boolean(control?.maintenanceMode),
          uploadsDisabled: Boolean(control?.uploadsDisabled),
          topErrors,
        });
      } catch (err) {
        setError(err?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const maintenanceText = useMemo(() => (data.maintenanceMode ? "ON" : "OFF"), [data.maintenanceMode]);
  const healthStatus = useMemo(() => {
    if (data.maintenanceMode) return { label: "Maintenance", tone: "text-amber-200", badge: "bg-amber-500/20 border-amber-300/30" };
    if (data.activeErrors > 20 || data.avgApiLatency > 1200) return { label: "Warning", tone: "text-amber-200", badge: "bg-amber-500/20 border-amber-300/30" };
    return { label: "Healthy", tone: "text-emerald-200", badge: "bg-emerald-500/20 border-emerald-300/30" };
  }, [data]);
  const alerts = useMemo(() => {
    const next = [];
    if (data.activeErrors > 20) next.push("High error rate detected");
    if (data.uploadsDisabled) next.push("Uploads disabled");
    if (data.maintenanceMode) next.push("Maintenance mode enabled");
    if (data.avgApiLatency > 1200) next.push("Average API latency is high");
    return next;
  }, [data]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(2,6,23,0.55)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Developer Platform Monitoring</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Live system oversight for every portal.</h1>
            <p className="mt-2 text-sm text-slate-300">
              Track health, errors, and usage patterns with consolidated operational intelligence.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${healthStatus.badge} ${healthStatus.tone}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {loading ? "Checking..." : `Status: ${healthStatus.label}`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                Avg latency: {loading ? "..." : `${data.avgApiLatency}ms`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                Active errors: {loading ? "..." : data.activeErrors}
              </span>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">System Health</p>
          <p className={`mt-3 text-2xl font-black ${healthStatus.tone}`}>{loading ? "..." : healthStatus.label}</p>
          <p className="mt-2 text-xs text-slate-300">Overall platform status</p>
        </article>
        <article className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Errors</p>
          <p className="mt-3 text-2xl font-black text-rose-200">{loading ? "..." : data.activeErrors}</p>
          <p className="mt-2 text-xs text-slate-300">Active error signals</p>
        </article>
        <article className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Logs</p>
          <p className="mt-3 text-2xl font-black text-slate-100">{loading ? "..." : data.topErrors.length}</p>
          <p className="mt-2 text-xs text-slate-300">Recent log highlights</p>
        </article>
        <article className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">API Usage</p>
          <p className="mt-3 text-2xl font-black text-cyan-200">{loading ? "..." : `${data.avgApiLatency}ms`}</p>
          <p className="mt-2 text-xs text-slate-300">Average latency</p>
        </article>
        <article className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Live Activity</p>
          <p className="mt-3 text-2xl font-black text-emerald-200">{loading ? "..." : data.voiceMessagesToday}</p>
          <p className="mt-2 text-xs text-slate-300">Voice messages today</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => (
          <article key={card.key} className={cardClass}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{card.label}</p>
            <p className="mt-2 text-4xl font-black text-white">{loading ? "..." : data[card.key]}</p>
          </article>
        ))}

        <article className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">System Status</p>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Maintenance: <span className={data.maintenanceMode ? "font-bold text-amber-200" : "font-bold text-emerald-200"}>{loading ? "..." : maintenanceText}</span>
            </p>
            <p>
              Uploads: <span className={data.uploadsDisabled ? "font-bold text-amber-200" : "font-bold text-emerald-200"}>{loading ? "..." : data.uploadsDisabled ? "DISABLED" : "ENABLED"}</span>
            </p>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
        <h2 className="text-lg font-black text-white">System Alerts</h2>
        <div className="mt-3 space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-emerald-200">No active alerts.</p>
          ) : (
            alerts.map((alert) => (
              <p key={alert} className="rounded border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{alert}</p>
            ))
          )}
          {data.activeErrors > 20 && data.topErrors.length > 0 ? (
            <div className="rounded border border-rose-300/30 bg-rose-500/10 px-3 py-3">
              <p className="mb-2 text-sm font-semibold text-rose-100">Top recent errors</p>
              <div className="space-y-1">
                {data.topErrors.map((row, idx) => (
                  <p key={`${row.route}-${idx}`} className="text-xs text-rose-100/95">
                    {idx + 1}. [{row.statusCode || "-"}] {row.route} - {row.message}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
        <h2 className="text-lg font-black text-white">Developer Console Guide</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Destructive Actions</p>
            <p className="mt-1 text-sm text-slate-200">Use confirmation prompts and verify IDs before delete or force-logout actions.</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Undo Support</p>
            <p className="mt-1 text-sm text-slate-200">Data Explorer supports undo for recent delete snapshots where available.</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Filter Presets</p>
            <p className="mt-1 text-sm text-slate-200">Save and reapply frequently used filters from Users, Voice, and Data Explorer pages.</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Exports</p>
            <p className="mt-1 text-sm text-slate-200">Export currently visible rows as CSV/JSON for audits and offline analysis.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
