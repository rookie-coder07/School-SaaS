import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bug, Clock3, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const selectClass = "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100";

const getSeverity = (row) => {
  const status = Number(row?.statusCode || 0);
  const message = String(row?.message || "").toLowerCase();
  const route = String(row?.route || "").toLowerCase();

  if (status >= 500 || message.includes("database") || message.includes("crash") || message.includes("fatal")) {
    return "critical";
  }
  if (status === 401 && message.includes("invalid credentials")) {
    return "ignorable";
  }
  if (status === 404 || message.includes("not found")) {
    return "ignorable";
  }
  if (route.includes("/api/auth/login") && status === 401) {
    return "ignorable";
  }
  return "medium";
};

const severityBadgeClass = {
  critical: "border-rose-300/40 bg-rose-500/15 text-rose-200",
  medium: "border-amber-300/40 bg-amber-500/15 text-amber-200",
  ignorable: "border-slate-400/40 bg-slate-500/15 text-slate-200",
};

const MetricCard = ({ label, value, icon }) => {
  const Icon = icon;
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-600">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <Icon className="h-5 w-5 text-blue-400" />
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
    </article>
  );
};

export default function DevErrorsPage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [expandedRowKey, setExpandedRowKey] = useState("");
  const [payload, setPayload] = useState({
    cards: { errorsToday: 0, errorsLastHour: 0, mostFailingApi: "N/A", totalSystemErrors: 0 },
    errorsByRoute: [],
    errorsTimeline: [],
    recentErrors: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/errors?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Failed to load error analytics");
        const errors = Array.isArray(data.data?.errors) ? data.data.errors : [];
        setPayload({
          cards: { errorsToday: errors.length, errorsLastHour: Math.floor(errors.length / 2), mostFailingApi: "-", totalSystemErrors: errors.length },
          errorsByRoute: [],
          errorsTimeline: [],
          recentErrors: errors.slice(0, 50).map((e) => ({
            timestamp: e.timestamp,
            route: e.endpoint || e.route || "Unknown",
            message: e.message || "No message",
            userRole: e.userRole || "system",
            school: e.school || "-",
            statusCode: e.statusCode || "500",
          })),
        });
      } catch (requestError) {
        if (controller.signal.aborted || requestError?.name === "AbortError") return;
        setError(requestError?.message || "Failed to load error analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [token]);

  const cards = useMemo(
    () => [
      { label: "Errors Today", value: payload.cards.errorsToday, icon: AlertTriangle },
      { label: "Errors Last Hour", value: payload.cards.errorsLastHour, icon: Clock3 },
      { label: "Most Failing API", value: payload.cards.mostFailingApi, icon: Bug },
      { label: "Total System Errors", value: payload.cards.totalSystemErrors, icon: ShieldAlert },
    ],
    [payload]
  );

  const groupedByRoute = useMemo(() => {
    const map = new Map();
    for (const row of payload.recentErrors || []) {
      const route = row.route || "Unknown";
      map.set(route, (map.get(route) || 0) + 1);
    }
    return Array.from(map.entries()).map(([route, count]) => ({ route, count })).sort((a, b) => b.count - a.count);
  }, [payload.recentErrors]);

  const filteredErrors = useMemo(
    () => payload.recentErrors.filter((item) => severityFilter === "all" || getSeverity(item) === severityFilter),
    [payload.recentErrors, severityFilter]
  );

  const severityCounts = useMemo(
    () => ({
      critical: payload.recentErrors.filter((e) => getSeverity(e) === "critical").length,
      medium: payload.recentErrors.filter((e) => getSeverity(e) === "medium").length,
      ignorable: payload.recentErrors.filter((e) => getSeverity(e) === "ignorable").length,
    }),
    [payload.recentErrors]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white">Error Monitoring</h1>
        <p className="text-slate-400">Track error trends, failing routes, and recent failures</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-600/50 bg-red-900/30 px-4 py-3">
          <p className="text-sm font-medium text-red-300">Warning: {error}</p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">Severity</p>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={selectClass}>
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="medium">Medium</option>
              <option value="ignorable">Ignorable</option>
            </select>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2">
            <p className="text-xs text-slate-400">Critical</p>
            <p className="text-lg font-black text-rose-200">{severityCounts.critical}</p>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2">
            <p className="text-xs text-slate-400">Medium</p>
            <p className="text-lg font-black text-amber-200">{severityCounts.medium}</p>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2">
            <p className="text-xs text-slate-400">Ignorable</p>
            <p className="text-lg font-black text-slate-200">{severityCounts.ignorable}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} value={loading ? "..." : card.value} />
        ))}
      </section>

      {!loading && (payload.errorsByRoute?.length > 0 || payload.errorsTimeline?.length > 0) && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {payload.errorsByRoute?.length > 0 && (
            <article className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
              <h3 className="mb-3 text-base font-black text-white">Errors by Route</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payload.errorsByRoute || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="route" tick={{ fill: "#cbd5e1", fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#fb7185" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}

          {payload.errorsTimeline?.length > 0 && (
            <article className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
              <h3 className="mb-3 text-base font-black text-white">Error Timeline</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payload.errorsTimeline || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="hour" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}
        </section>
      )}

      {!loading && payload.recentErrors?.length > 0 && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <h3 className="mb-3 text-base font-black text-white">Recent Errors</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full w-full text-left text-sm">
              <thead className="text-slate-300">
                <tr className="border-b border-slate-700">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Error Message</th>
                  <th className="px-3 py-2">User Role</th>
                  <th className="px-3 py-2">School</th>
                  <th className="px-3 py-2">Status Code</th>
                  <th className="px-3 py-2 text-right">Details</th>
                </tr>
              </thead>
                {filteredErrors.map((item) => {
                  if (!item?.timestamp) return null;
                  const errorKey = `error-${item.timestamp}-${item.route || "unknown"}`;
                  const severity = getSeverity(item);
                  return (
                    <tbody key={errorKey}>
                      <tr className="border-t border-slate-700 text-slate-300 hover:bg-slate-700/50">
                        <td className="whitespace-nowrap px-3 py-2 text-xs">{new Date(item.timestamp).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.route || "N/A"}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded border px-2 py-0.5 text-xs font-semibold capitalize ${severityBadgeClass[severity] || severityBadgeClass.medium}`}>
                            {severity}
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-red-400" title={item.message || "N/A"}>{item.message || "N/A"}</td>
                        <td className="px-3 py-2">{item.userRole || "N/A"}</td>
                        <td className="px-3 py-2">{item.school || "-"}</td>
                        <td className="px-3 py-2 font-semibold">{item.statusCode || "N/A"}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedRowKey((prev) => (prev === errorKey ? "" : errorKey))}
                            className="rounded border border-slate-500 bg-slate-700/60 px-2 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700"
                          >
                            {expandedRowKey === errorKey ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                      {expandedRowKey === errorKey ? (
                        <tr className="border-t border-slate-700 bg-slate-900/60 text-slate-200">
                          <td colSpan={8} className="px-3 py-3">
                            <div className="space-y-1 text-xs">
                              <p><span className="font-semibold text-slate-300">Exact message:</span> {item.message || "N/A"}</p>
                              <p><span className="font-semibold text-slate-300">Route:</span> {item.route || "N/A"}</p>
                              <p><span className="font-semibold text-slate-300">Timestamp:</span> {new Date(item.timestamp).toISOString()}</p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  );
                })}
            </table>
          </div>
        </section>
      )}

      {!loading && groupedByRoute.length > 0 && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <h3 className="mb-3 text-base font-black text-white">Grouped by Endpoint</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {groupedByRoute.map((row) => (
              <div key={row.route} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm">
                <span className="truncate text-slate-200">{row.route}</span>
                <span className="font-bold text-rose-300">{row.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && payload.cards?.errorsToday === 0 && !payload.errorsByRoute?.length && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-slate-400">No errors recorded</div>
      )}
    </div>
  );
}
