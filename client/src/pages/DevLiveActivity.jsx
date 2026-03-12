import { useEffect, useState } from "react";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL;

const activityColor = (action = "") => {
  if (action.includes("error")) return "bg-rose-400/25 border-rose-200/40 text-rose-100";
  if (action.includes("login")) return "bg-amber-400/25 border-amber-200/40 text-amber-100";
  if (action.includes("announcement")) return "bg-cyan-400/25 border-cyan-200/40 text-cyan-100";
  if (action.includes("marks")) return "bg-violet-400/25 border-violet-200/40 text-violet-100";
  return "bg-emerald-400/25 border-emerald-200/40 text-emerald-100";
};

export default function DevLiveActivity() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/live-activity?limit=80`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.message || "Failed to load live activity");
        setItems(Array.isArray(payload.data) ? payload.data : []);
      } catch (requestError) {
        setError(requestError?.message || "Failed to load live activity");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <DevPortalLayout title="Live Activity Monitor" subtitle="Realtime timeline of platform operations and events.">
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200/40 bg-rose-400/20 px-4 py-3 text-sm font-medium text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-200">Loading activity...</p> : null}

      <section className="space-y-3">
        {items.map((item) => (
          <article
            key={item._id}
            className={`rounded-2xl border p-4 shadow-xl backdrop-blur-lg ${activityColor(item.action)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">{String(item.action || "activity").replace(/_/g, " ")}</p>
              <p className="text-xs">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <p className="mt-1 text-xs">
              Role: {item.role || "unknown"} | User: {item.userId || "-"} | School: {item.schoolId || "-"}
            </p>
          </article>
        ))}
      </section>
    </DevPortalLayout>
  );
}
