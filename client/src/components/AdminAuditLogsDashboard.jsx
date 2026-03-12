import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const ACTION_OPTIONS = ["ALL", "CREATE", "UPDATE", "DELETE"];
const LOG_CARD_THEMES = [
  "border-cyan-300/35 bg-gradient-to-br from-cyan-500/20 via-sky-500/15 to-slate-900/60",
  "border-violet-300/35 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-slate-900/60",
  "border-emerald-300/35 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-slate-900/60",
  "border-amber-300/35 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-slate-900/60",
];

function formatDateTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function StatTile({ label, value, tone = "blue" }) {
  const toneClasses = {
    blue: "from-cyan-500/35 via-blue-500/25 to-slate-900/70 border-cyan-300/30",
    emerald: "from-emerald-500/35 via-teal-500/25 to-slate-900/70 border-emerald-300/30",
    amber: "from-amber-500/35 via-orange-500/25 to-slate-900/70 border-amber-300/30",
    rose: "from-rose-500/35 via-pink-500/25 to-slate-900/70 border-rose-300/30",
  };
  return (
    <div className={`rounded-[22px] border bg-gradient-to-br ${toneClasses[tone] || toneClasses.blue} px-4 py-4 backdrop-blur-xl shadow-[0_14px_34px_rgba(2,6,23,0.38)]`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-100">{value}</p>
    </div>
  );
}

export default function AdminAuditLogsDashboard({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchLogs = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (actionFilter && actionFilter !== "ALL") params.set("action", actionFilter);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);

        const url = `${API_URL}/api/admin/audit-logs${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || "Failed to load audit logs");
        setLogs(Array.isArray(payload?.data) ? payload.data : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to load audit logs");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    return () => controller.abort();
  }, [token, actionFilter, fromDate, toDate]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((row) => {
      const role = String(row?.userRole || "").toUpperCase();
      const matchesRole = roleFilter === "ALL" || role === roleFilter;
      if (!matchesRole) return false;
      if (!q) return true;
      const description = String(row?.description || "").toLowerCase();
      const entityType = String(row?.entityType || "").toLowerCase();
      const action = String(row?.action || "").toLowerCase();
      return description.includes(q) || entityType.includes(q) || action.includes(q);
    });
  }, [logs, roleFilter, searchTerm]);

  const stats = useMemo(() => {
    let createCount = 0;
    let updateCount = 0;
    let deleteCount = 0;
    for (const row of filteredLogs) {
      const action = String(row?.action || "").toUpperCase();
      if (action === "CREATE") createCount += 1;
      if (action === "UPDATE") updateCount += 1;
      if (action === "DELETE") deleteCount += 1;
    }
    return {
      total: filteredLogs.length,
      createCount,
      updateCount,
      deleteCount,
    };
  }, [filteredLogs]);

  const clearFilters = () => {
    setActionFilter("ALL");
    setRoleFilter("ALL");
    setSearchTerm("");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#071228] via-[#0b1c3f] to-[#12275b] p-4 md:p-6 space-y-6 shadow-[0_20px_44px_rgba(8,47,73,0.42)]">
      <div className="pointer-events-none absolute -top-28 -right-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="rounded-[24px] border border-white/15 bg-slate-900/45 backdrop-blur-xl px-5 py-5 shadow-[0_14px_34px_rgba(2,6,23,0.38)]">
          <h2 className="text-xl md:text-2xl font-black text-slate-100">Audit Logs</h2>
          <p className="text-sm text-slate-300 mt-1">Track key admin and teacher actions across your school.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Events" value={stats.total} tone="blue" />
        <StatTile label="Creates" value={stats.createCount} tone="emerald" />
        <StatTile label="Updates" value={stats.updateCount} tone="amber" />
        <StatTile label="Deletes" value={stats.deleteCount} tone="rose" />
      </div>

      <div className="rounded-[24px] border border-white/15 bg-slate-900/45 backdrop-blur-xl p-4 md:p-5 space-y-4 shadow-[0_14px_34px_rgba(2,6,23,0.38)]">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/20 bg-slate-900/55 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {ACTION_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item === "ALL" ? "All Actions" : item}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/20 bg-slate-900/55 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="TEACHER">Teacher</option>
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action or description"
            className="px-3 py-2 rounded-lg border border-white/20 bg-slate-900/55 text-sm font-medium text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/20 bg-slate-900/55 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/20 bg-slate-900/55 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-lg border border-cyan-300/40 bg-cyan-500/25 text-cyan-100 text-sm font-semibold hover:bg-cyan-500/35 transition"
          >
            Reset Filters
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-white/20 bg-slate-900/45 p-5 text-sm font-semibold text-slate-300">
            Loading audit logs...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-300/40 bg-rose-500/20 p-5 text-sm font-semibold text-rose-100">
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-white/20 bg-slate-900/45 p-5 text-sm font-semibold text-slate-300">
            No audit logs found for selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredLogs.map((row, index) => (
              <div
                key={row._id}
                className={`rounded-[22px] border px-4 py-4 min-w-0 max-w-full backdrop-blur-xl shadow-[0_14px_34px_rgba(2,6,23,0.38)] transition duration-300 hover:-translate-y-1 ${LOG_CARD_THEMES[index % LOG_CARD_THEMES.length]}`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-slate-900/65 text-white px-2.5 py-1 text-[11px] font-bold tracking-wide">
                      {String(row?.action || "UNKNOWN").toUpperCase()}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-500/20 text-cyan-100 px-2.5 py-1 text-[11px] font-bold tracking-wide">
                      {String(row?.entityType || "unknown")}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-indigo-300/35 bg-indigo-500/20 text-indigo-100 px-2.5 py-1 text-[11px] font-bold tracking-wide">
                      {String(row?.userRole || "UNKNOWN")}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-300 break-words [overflow-wrap:anywhere]">{formatDateTime(row?.timestamp)}</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-100 break-words whitespace-pre-wrap [overflow-wrap:anywhere]">{row?.description || "-"}</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                  <p className="break-words whitespace-normal [overflow-wrap:anywhere]"><span className="font-bold text-slate-200">Actor ID:</span> {row?.userId || "-"}</p>
                  <p className="break-words whitespace-normal [overflow-wrap:anywhere]"><span className="font-bold text-slate-200">Entity ID:</span> {row?.entityId || "-"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
