import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function DevToolsPage() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'success' or 'error'
  const [lastReportTime, setLastReportTime] = useState(null);
  const [loading, setLoading] = useState(false);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("developerToken");
      if (!token) {
        showMessage("❌ Error: No authentication token found", "error");
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/dev/tools/health-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to generate report");
      setLastReportTime(new Date());
      showMessage("✅ System report generated successfully", "success");
    } catch (error) {
      showMessage(`❌ Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    {
      label: "🔄 Clear Cache",
      description: "Clear application cache",
      action: async () => {
        showMessage("Cache clearing not yet implemented", "success");
      },
    },
    {
      label: "🔍 Rebuild Index",
      description: "Rebuild database indexes",
      action: async () => {
        showMessage("Index rebuilding not yet implemented", "success");
      },
    },
    {
      label: "📊 Generate Report",
      description: "Generate system health report",
      action: handleGenerateReport,
      highlight: true,
    },
    {
      label: "🔐 Refresh Tokens",
      description: "Refresh all JWT tokens",
      action: async () => {
        showMessage("Token refreshing not yet implemented", "success");
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Developer Tools</h1>
        <p className="text-slate-400">Utility commands and system administration</p>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 ${
          messageType === "success" 
            ? "border-green-600/50 bg-green-900/30 text-green-300" 
            : "border-red-600/50 bg-red-900/30 text-red-300"
        }`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool, idx) => (
          <button
            key={idx}
            onClick={tool.action}
            disabled={loading && tool.highlight}
            className={`rounded-2xl border transition text-left p-6 ${
              tool.highlight
                ? "border-blue-600/50 bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-70"
                : "border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-700"
            }`}
          >
            <h3 className="text-lg font-bold text-white mb-1">{tool.label}</h3>
            <p className="text-sm text-slate-400">{tool.description}</p>
          </button>
        ))}
      </div>

      {lastReportTime && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">Last Report Generated</p>
              <p className="mt-1 text-lg font-bold text-white">{lastReportTime.toLocaleString()}</p>
            </div>
            <button
              onClick={() => {
                const data = {
                  timestamp: lastReportTime.toISOString(),
                  message: "System health report",
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `system-report-${lastReportTime.getTime()}.json`;
                a.click();
              }}
              className="px-4 py-2 rounded-lg bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 font-semibold text-sm transition"
            >
              📥 Download Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
