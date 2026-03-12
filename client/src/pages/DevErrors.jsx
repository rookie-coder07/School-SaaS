import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bug, Clock3, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL;

const MetricCard = ({ label, value, icon, theme }) => {
  const Icon = icon;
  return (
    <article className={`rounded-2xl border border-white/20 bg-gradient-to-br ${theme} p-4 shadow-xl backdrop-blur-lg`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-100">{label}</p>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </article>
  );
};

export default function DevErrors() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState({
    cards: { errorsToday: 0, errorsLastHour: 0, mostFailingApi: "N/A", totalSystemErrors: 0 },
    errorsByRoute: [],
    errorsTimeline: [],
    recentErrors: [],
  });

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/errors?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data?.success) throw new Error(data?.message || "Failed to load error analytics");
        setPayload((prev) => ({ ...prev, ...(data.data || {}) }));
      } catch (requestError) {
        setError(requestError?.message || "Failed to load error analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const cards = useMemo(
    () => [
      { label: "Errors Today", value: payload.cards.errorsToday, icon: AlertTriangle, theme: "from-rose-500/40 to-red-700/25" },
      { label: "Errors Last Hour", value: payload.cards.errorsLastHour, icon: Clock3, theme: "from-amber-400/40 to-orange-700/25" },
      { label: "Most Failing API", value: payload.cards.mostFailingApi, icon: Bug, theme: "from-violet-500/40 to-purple-700/25" },
      { label: "Total System Errors", value: payload.cards.totalSystemErrors, icon: ShieldAlert, theme: "from-fuchsia-500/40 to-pink-700/25" },
    ],
    [payload]
  );

  return (
    <DevPortalLayout title="Error Monitoring" subtitle="Track error trends, failing routes, and recent failures.">
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200/40 bg-rose-400/20 px-4 py-3 text-sm font-medium text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} value={loading ? "..." : card.value} />
        ))}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
          <h3 className="text-base font-black text-white">Errors by Route</h3>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payload.errorsByRoute || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="route" tick={{ fill: "#e2e8f0", fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fill: "#e2e8f0", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#fb7185" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
          <h3 className="text-base font-black text-white">Error Timeline</h3>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payload.errorsTimeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="hour" tick={{ fill: "#e2e8f0", fontSize: 11 }} />
                <YAxis tick={{ fill: "#e2e8f0", fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
        <h3 className="text-base font-black text-white">Recent Errors</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="text-slate-200">
              <tr>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Route</th>
                <th className="px-2 py-2">Error message</th>
                <th className="px-2 py-2">User role</th>
                <th className="px-2 py-2">School</th>
                <th className="px-2 py-2">Status code</th>
              </tr>
            </thead>
            <tbody>
              {(payload.recentErrors || []).map((item, idx) => (
                <tr key={`${item.timestamp}-${idx}`} className="border-t border-white/10 text-slate-100">
                  <td className="px-2 py-2 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</td>
                  <td className="px-2 py-2">{item.route}</td>
                  <td className="px-2 py-2">{item.message}</td>
                  <td className="px-2 py-2">{item.userRole}</td>
                  <td className="px-2 py-2">{item.school || "-"}</td>
                  <td className="px-2 py-2">{item.statusCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DevPortalLayout>
  );
}
