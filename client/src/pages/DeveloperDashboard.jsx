import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  GraduationCap,
  Activity,
  Waypoints,
  AlertTriangle,
} from "lucide-react";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const formatUptime = (seconds = 0) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  return `${hrs}h ${mins}m`;
};

export default function DeveloperDashboard() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeSessions: 0,
    apiRequestsToday: 0,
    systemErrorsToday: 0,
    serverUptime: 0,
  });

  useEffect(() => {
    const loadOverview = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/portal/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.message || "Failed to load overview");
        setOverview((prev) => ({ ...prev, ...(payload.data || {}) }));
      } catch (requestError) {
        setError(requestError?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, [token]);

  const cards = useMemo(
    () => [
      {
        label: "Total Schools",
        value: overview.totalSchools,
        icon: Building2,
        theme: "from-cyan-400/40 to-blue-500/30 border-cyan-200/40",
      },
      {
        label: "Total Students",
        value: overview.totalStudents,
        icon: GraduationCap,
        theme: "from-emerald-400/40 to-green-500/30 border-emerald-200/40",
      },
      {
        label: "Total Teachers",
        value: overview.totalTeachers,
        icon: Users,
        theme: "from-violet-400/40 to-purple-500/30 border-violet-200/40",
      },
      {
        label: "Active Sessions",
        value: overview.activeSessions,
        icon: Activity,
        theme: "from-fuchsia-400/40 to-pink-500/30 border-fuchsia-200/40",
      },
      {
        label: "API Requests Today",
        value: overview.apiRequestsToday,
        icon: Waypoints,
        theme: "from-amber-300/40 to-orange-500/30 border-amber-100/40",
      },
      {
        label: "System Errors Today",
        value: overview.systemErrorsToday,
        icon: AlertTriangle,
        theme: "from-rose-400/40 to-red-500/30 border-rose-200/40",
      },
    ],
    [overview]
  );

  return (
    <DevPortalLayout
      title="Developer Dashboard"
      subtitle={`Realtime platform metrics. Uptime: ${formatUptime(overview.serverUptime)}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link to="/dev/errors" className="rounded-xl bg-rose-400/80 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-rose-300">
            Error Monitor
          </Link>
          <Link to="/dev/api-usage" className="rounded-xl bg-cyan-400/80 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300">
            API Usage
          </Link>
        </div>
      }
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200/40 bg-rose-400/20 px-4 py-3 text-sm font-medium text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className={`rounded-2xl border bg-gradient-to-br p-5 shadow-xl backdrop-blur-lg ${card.theme}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-100">{card.label}</p>
                <Icon className="h-5 w-5 text-slate-100" />
              </div>
              <p className="mt-3 text-3xl font-black text-white">{loading ? "..." : card.value}</p>
            </article>
          );
        })}
      </section>
    </DevPortalLayout>
  );
}
