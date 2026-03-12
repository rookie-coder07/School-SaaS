import { useEffect, useState } from "react";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL;

export default function DevLogs() {
  const [error, setError] = useState("");
  const [logs, setLogs] = useState({ crashLogs: [], auditLogs: [] });
  const token = localStorage.getItem("developerToken");

  useEffect(() => {
    const loadLogs = async () => {
      setError("");
      try {
        const response = await fetch(`${API_URL}/api/dev/logs?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
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
        setError(requestError?.message || "Failed to load logs");
      }
    };

    loadLogs();
  }, []);

  return (
    <DevPortalLayout title="Logs Viewer" subtitle="Crash logs and audit logs for developer troubleshooting.">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">Crash Log</h3>
          <pre className="mt-4 max-h-[480px] overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
            {logs.crashLogs.length ? logs.crashLogs.join("\n") : "No crash logs found."}
          </pre>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">Audit Logs</h3>
          <div className="mt-4 max-h-[480px] overflow-auto space-y-3">
            {logs.auditLogs.length ? (
              logs.auditLogs.map((entry) => (
                <article key={entry._id || `${entry.timestamp}-${entry.action}`} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500">{new Date(entry.timestamp || Date.now()).toLocaleString()}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{entry.action || "N/A"}</p>
                  <p className="text-xs text-slate-600">
                    adminId: {entry.adminId || "-"} | target: {entry.targetType || "-"} {entry.targetId || ""}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">No audit logs found.</p>
            )}
          </div>
        </section>
      </div>
    </DevPortalLayout>
  );
}
