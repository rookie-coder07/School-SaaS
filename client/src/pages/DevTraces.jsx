import { useEffect, useState } from "react";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL;

export default function DevTraces() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/traces?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.message || "Failed to load traces");
        setRows(Array.isArray(payload.data) ? payload.data : []);
      } catch (requestError) {
        setError(requestError?.message || "Failed to load traces");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <DevPortalLayout title="Request Traces" subtitle="Route-level response time and status tracking.">
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200/40 bg-rose-400/20 px-4 py-3 text-sm font-medium text-rose-100">
          {error}
        </div>
      ) : null}
      {loading ? <p className="text-sm text-slate-200">Loading traces...</p> : null}

      <section className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="text-slate-200">
              <tr>
                <th className="px-2 py-2">Route</th>
                <th className="px-2 py-2">Method</th>
                <th className="px-2 py-2">Response Time</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-t border-white/10 text-slate-100">
                  <td className="px-2 py-2">{row.route}</td>
                  <td className="px-2 py-2">{row.method}</td>
                  <td className="px-2 py-2">{row.responseTime}ms</td>
                  <td className="px-2 py-2">{row.statusCode}</td>
                  <td className="px-2 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DevPortalLayout>
  );
}
