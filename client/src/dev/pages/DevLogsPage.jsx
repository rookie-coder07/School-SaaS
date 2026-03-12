import { useEffect, useState } from "react";
import EmptyState from "../../components/ui/EmptyState";
import { ListSkeleton } from "../../components/ui/Skeleton";

const API_URL = import.meta.env.VITE_API_URL;

export default function DevLogsPage() {
  const token = localStorage.getItem("developerToken");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState({ crashLogs: [], auditLogs: [] });
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");

  useEffect(() => {
    const controller = new AbortController();
    const loadLogs = async () => {
      setError("");
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/dev/logs?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || payload?.error || "Failed to load logs");
        }
        setLogs({
          crashLogs: Array.isArray(payload?.data?.crashLogs) ? payload.data.crashLogs : [],
          auditLogs: Array.isArray(payload?.data?.auditLogs) ? payload.data.auditLogs : [],
        });
      } catch (requestError) {
        if (controller.signal.aborted || requestError?.name === "AbortError") return;
        setError(requestError?.message || "Failed to load logs");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
    return () => controller.abort();
  }, [token]);

  const now = Date.now();
  const parseByTime = (entry = "") => {
    const text = typeof entry === "string" ? entry : JSON.stringify(entry);
    const dateMatch = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (!dateMatch) return null;
    const ms = new Date(dateMatch[0]).getTime();
    return Number.isNaN(ms) ? null : ms;
  };

  const levelMatch = (entry = "") => {
    const text = typeof entry === "string" ? entry : JSON.stringify(entry);
    const upper = text.toUpperCase();
    if (levelFilter === "ALL") return true;
    return upper.includes(levelFilter);
  };

  const timeMatch = (entry = "") => {
    if (timeFilter === "ALL") return true;
    const ts = parseByTime(entry);
    if (!ts) return true;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    if (timeFilter === "1H") return now - ts <= oneHour;
    if (timeFilter === "24H") return now - ts <= oneDay;
    return true;
  };

  const filteredAuditLogs = (logs.auditLogs || []).filter((entry) => levelMatch(entry) && timeMatch(entry));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Logs Viewer</h1>
        <p className="text-slate-400">Crash logs and audit logs for developer troubleshooting</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-600/50 bg-red-900/30 px-4 py-3">
          <p className="text-sm font-medium text-red-300">⚠️ {error}</p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <ListSkeleton rows={3} />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="xl:col-span-2 rounded-2xl border border-slate-700 bg-slate-800 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                <option value="ALL">Level: All</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
              </select>
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                <option value="ALL">Time: All</option>
                <option value="1H">Last 1 Hour</option>
                <option value="24H">Last 24 Hours</option>
              </select>
              <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-300">Filtered audit logs: {filteredAuditLogs.length}</div>
            </div>
          </div>
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-lg font-black text-white mb-3">Crash Log</h3>
            {logs.crashLogs?.length > 0 ? (
              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-300 font-mono">
                {logs.crashLogs.join("\n")}
              </pre>
            ) : (
              <EmptyState
                tone="dark"
                title="No crash logs"
                description="The system is stable. Crashes will appear here if they happen."
              />
            )}
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-lg font-black text-white mb-3">Audit Log</h3>
            {filteredAuditLogs?.length > 0 ? (
              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-300 font-mono">
                {filteredAuditLogs
                  .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry, null, 2)))
                  .join("\n\n")}
              </pre>
            ) : (
              <EmptyState
                tone="dark"
                title="No audit logs"
                description="Developer activity will be recorded here."
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
