import { Fragment, useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/ui/EmptyState";
import { ListSkeleton } from "../../components/ui/Skeleton";

const API_URL = import.meta.env.VITE_API_URL;

export default function DevAuditLogsPage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedKey, setExpandedKey] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/logs?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.message || payload?.error || "Failed to load logs");
        }
        const auditLogs = Array.isArray(payload?.data?.auditLogs) ? payload.data.auditLogs : [];
        setLogs(auditLogs);
      } catch (err) {
        setError(err?.message || "Failed to load logs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const actionOptions = useMemo(() => {
    const set = new Set();
    for (const row of logs) {
      if (row?.action) set.add(String(row.action));
    }
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((row) => {
      if (actionFilter && String(row.action || "") !== actionFilter) return false;
      if (!term) return true;
      const target = [row.adminId, row.action, row.targetType, row.targetId, row.ip].map((v) => String(v || "").toLowerCase()).join(" ");
      return target.includes(term);
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-300">Developer activity history from existing `/api/dev/logs` endpoint.</p>
      </div>

      {error ? <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</div> : null}

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search developer/action/target/ip"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 md:col-span-2"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
          >
            <option value="">All Actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/45 backdrop-blur-xl">
        <table className="w-full min-w-[1050px] text-left text-sm text-slate-200">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Developer</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target Type</th>
              <th className="px-4 py-3">Target ID</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan={6}>
                  <ListSkeleton rows={3} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-8" colSpan={6}>
                  <EmptyState
                    tone="dark"
                    title="No audit logs"
                    description="Developer activity will appear here once actions are taken."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((row, index) => {
                const key = String(row?._id || index);
                const isOpen = expandedKey === key;
                const beforeState = row?.metadata?.before || row?.before || null;
                const afterState = row?.metadata?.after || row?.after || null;
                return (
                  <Fragment key={key}>
                    <tr key={key} className="border-t border-white/10 cursor-pointer hover:bg-white/5" onClick={() => setExpandedKey(isOpen ? "" : key)}>
                      <td className="px-4 py-3">{row.developerId || row.adminId || "-"}</td>
                      <td className="px-4 py-3">{row.action || "-"}</td>
                      <td className="px-4 py-3">{row.targetType || "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.targetId || "-"}</td>
                      <td className="px-4 py-3">{row.ip || "-"}</td>
                      <td className="px-4 py-3">{row.timestamp ? new Date(row.timestamp).toLocaleString() : "-"}</td>
                    </tr>
                    {isOpen ? (
                      <tr className="border-t border-white/10 bg-slate-900/50">
                        <td className="px-4 py-3 text-xs text-slate-300" colSpan={6}>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded border border-white/10 bg-slate-950/60 p-2">
                              <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Before</p>
                              <pre className="max-h-32 overflow-auto text-[11px] text-slate-200">{beforeState ? JSON.stringify(beforeState, null, 2) : "No before state"}</pre>
                            </div>
                            <div className="rounded border border-white/10 bg-slate-950/60 p-2">
                              <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">After</p>
                              <pre className="max-h-32 overflow-auto text-[11px] text-slate-200">{afterState ? JSON.stringify(afterState, null, 2) : "No after state"}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}