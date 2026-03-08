import { useState } from "react";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const tools = [
  { id: "health-check", label: "Run Health Check", endpoint: "/api/dev/tools/health-check" },
  { id: "test-db", label: "Test Database", endpoint: "/api/dev/tools/test-db" },
  { id: "memory-check", label: "Check Server Memory", endpoint: "/api/dev/tools/memory-check" },
  { id: "run-backup", label: "Run Backup Now", endpoint: "/api/dev/tools/run-backup" },
];

export default function DevTools() {
  const token = localStorage.getItem("developerToken");
  const [loadingId, setLoadingId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const runTool = async (tool) => {
    if (!token) return;
    try {
      setLoadingId(tool.id);
      setError("");
      setResult(null);
      const response = await fetch(`${API_URL}${tool.endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) throw new Error(payload?.message || "Tool failed");
      setResult({ label: tool.label, payload });
    } catch (requestError) {
      setError(requestError?.message || "Tool failed");
    } finally {
      setLoadingId("");
    }
  };

  return (
    <DevPortalLayout title="Developer Tools" subtitle="Operational commands for health, DB checks, memory, and backups.">
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200/40 bg-rose-400/20 px-4 py-3 text-sm font-medium text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <button
            type="button"
            key={tool.id}
            onClick={() => runTool(tool)}
            disabled={loadingId === tool.id}
            className="rounded-2xl border border-cyan-200/40 bg-gradient-to-br from-cyan-400/25 to-blue-700/25 p-4 text-left text-white shadow-xl backdrop-blur-lg hover:opacity-90 disabled:opacity-60"
          >
            <p className="text-sm font-black">{tool.label}</p>
            <p className="mt-2 text-xs text-slate-200">
              {loadingId === tool.id ? "Running..." : "Click to execute"}
            </p>
          </button>
        ))}
      </section>

      {result ? (
        <section className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
          <h3 className="text-base font-black text-white">{result.label} Result</h3>
          <pre className="mt-3 overflow-auto rounded-xl bg-slate-950/70 p-3 text-xs text-slate-100">
            {JSON.stringify(result.payload, null, 2)}
          </pre>
        </section>
      ) : null}
    </DevPortalLayout>
  );
}
