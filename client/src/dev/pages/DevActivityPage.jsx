import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const activityColor = (action = "") => {
  if (action.includes("error")) return "bg-red-900/30 border-red-700/50 text-red-300";
  if (action.includes("login")) return "bg-amber-900/30 border-amber-700/50 text-amber-300";
  if (action.includes("announcement")) return "bg-blue-900/30 border-blue-700/50 text-blue-300";
  if (action.includes("marks")) return "bg-purple-900/30 border-purple-700/50 text-purple-300";
  if (action.includes("attendance")) return "bg-cyan-900/30 border-cyan-700/50 text-cyan-300";
  return "bg-green-900/30 border-green-700/50 text-green-300";
};

const getActivityIcon = (action = "") => {
  if (action.includes("error")) return "⚠️";
  if (action.includes("login")) return "🔐";
  if (action.includes("announcement")) return "📢";
  if (action.includes("marks")) return "📊";
  if (action.includes("attendance")) return "✅";
  return "📌";
};

export default function DevActivityPage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [chip, setChip] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/live-activity?limit=80`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Failed to load live activity");
        setItems(Array.isArray(payload.data) ? payload.data : []);
      } catch (requestError) {
        if (controller.signal.aborted || requestError?.name === "AbortError") return;
        setError(requestError?.message || "Failed to load live activity");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [token]);

  const matchesChip = (action = "") => {
    const lower = String(action || "").toLowerCase();
    if (chip === "all") return true;
    if (chip === "logins") return lower.includes("login");
    if (chip === "voice") return lower.includes("voice");
    if (chip === "attendance") return lower.includes("attendance");
    if (chip === "system") return lower.includes("error") || lower.includes("system") || lower.includes("cache");
    return true;
  };

  const filteredItems = items.filter((item) => matchesChip(item?.action || item?.event || item?.type));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Live Activity Monitor</h1>
        <p className="text-slate-400">Realtime timeline of platform operations and events</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-600/50 bg-red-900/30 px-4 py-3">
          <p className="text-sm font-medium text-red-300">⚠️ {error}</p>
        </div>
      )}

      {loading && <p className="text-slate-400">Loading activity...</p>}

      <section className="flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["logins", "Logins"],
          ["voice", "Voice Messages"],
          ["attendance", "Attendance"],
          ["system", "System Events"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setChip(value)}
            className={chip === value ? "rounded-full border border-cyan-300/40 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-100" : "rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200"}
          >
            {label}
          </button>
        ))}
      </section>

      {!loading && (
        <section className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-slate-400">
              No activity recorded yet
            </div>
          ) : (
            filteredItems.map((item) => {
              // Skip items without valid identifiers
              if (!item?._id && !item?.createdAt) {
                console.warn("Skipping activity item without _id or createdAt", item);
                return null;
              }
              
              // Use _id as primary key, fallback to createdAt as secondary key
              const itemKey = item._id || `activity-${item.createdAt}`;
              
              // Safe field extraction with fallbacks
              const timestamp = item.createdAt 
                ? new Date(item.createdAt).toLocaleString() 
                : item.timestamp 
                ? new Date(item.timestamp).toLocaleString()
                : new Date().toLocaleString();
              
              const action = item.action || item.event || item.type || "unknown";
              const route = item.metadata?.route || item.route || item.path || item.endpoint || "Unknown Route";
              const message = item.metadata?.message || item.message || "";
              const statusCode = item.metadata?.statusCode || item.statusCode || null;
              const role = item.role || item.userRole || "system";
              const icon = getActivityIcon(action);
              
              return (
                <div
                  key={itemKey}
                  className={`rounded-lg border p-4 ${activityColor(action)} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold capitalize text-sm">{action.replace(/_/g, " ")}</h4>
                      <p className="text-xs opacity-75 mt-1 truncate">{route}</p>
                      {message && (
                        <p className="text-xs opacity-75 mt-1 break-words">{message}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs opacity-60">
                        <span>👤 {role}</span>
                        {statusCode && <span>📍 {statusCode}</span>}
                        <span className="ml-auto">{timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}

