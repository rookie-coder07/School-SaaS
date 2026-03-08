import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function DevTracesPage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [traces, setTraces] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/traces?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Failed to load traces");
        setTraces(Array.isArray(payload.data) ? payload.data : []);
      } catch (requestError) {
        if (controller.signal.aborted || requestError?.name === "AbortError") return;
        setError(requestError?.message || "Failed to load traces");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Trace Logs</h1>
        <p className="text-slate-400">Detailed execution traces and transaction logs</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-600/50 bg-red-900/30 px-4 py-3">
          <p className="text-sm font-medium text-red-300">⚠️ {error}</p>
        </div>
      )}

      {loading && <p className="text-slate-400">Loading traces...</p>}

      {!loading && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-100 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Operation</th>
                <th className="px-4 py-3 font-semibold">Duration (ms)</th>
                <th className="px-4 py-3 font-semibold">Status Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {traces.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-slate-400 py-8">No traces recorded</td>
                </tr>
              ) : (
                traces.map((trace) => {
                  const timestamp = trace.createdAt ? new Date(trace.createdAt).toLocaleTimeString() : "Unknown";
                  const duration = typeof trace.responseTime === "number" && !isNaN(trace.responseTime) ? trace.responseTime : "N/A";
                  const operation = trace.method && trace.route ? `${trace.method} ${trace.route}` : trace.route || "Unknown";
                  const code = trace.statusCode || "N/A";
                  
                  // Determine status color based on status code
                  let statusColor = "bg-slate-700 text-slate-200";
                  if (code >= 200 && code < 300) {
                    statusColor = "bg-green-900/60 text-green-200 font-semibold";
                  } else if (code >= 400 && code < 500) {
                    statusColor = "bg-amber-900/60 text-amber-200 font-semibold";
                  } else if (code >= 500) {
                    statusColor = "bg-red-900/60 text-red-200 font-semibold";
                  }
                  
                  return (
                    <tr key={trace?._id || `${trace?.createdAt || "trace"}-${trace?.route || "unknown"}`} className="hover:bg-slate-800/70 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-300 font-mono">{timestamp}</td>
                      <td className="px-4 py-3 text-slate-200">{operation}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono">{duration}ms</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded text-xs font-bold ${statusColor}`}>
                          {code}
                        </span>
                        <div className="mt-2 space-y-1">
                          <div className="h-1.5 w-full rounded bg-slate-700">
                            <div className="h-1.5 rounded bg-cyan-400" style={{ width: "20%" }} />
                          </div>
                          <div className="h-1.5 w-full rounded bg-slate-700">
                            <div className="h-1.5 rounded bg-amber-400" style={{ width: `${Math.min(70, Math.max(10, Number(duration) ? Number(duration) / 10 : 10))}%` }} />
                          </div>
                          <div className="h-1.5 w-full rounded bg-slate-700">
                            <div className="h-1.5 rounded bg-emerald-400" style={{ width: "100%" }} />
                          </div>
                          <p className="text-[10px] text-slate-400">start - db query - response</p>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
