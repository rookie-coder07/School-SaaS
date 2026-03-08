import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function DevSchoolsList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schools, setSchools] = useState([]);
  const token = localStorage.getItem("developerToken");

  const loadSchools = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/dev/schools?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load schools");
      const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      setSchools(list);
    } catch (requestError) {
      setError(requestError?.message || "Failed to load schools");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const toggleSchool = async (schoolId, isEnabled) => {
    try {
      const response = await fetch(`${API_URL}/api/dev/schools/${schoolId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isEnabled }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || "Failed to update school");
      }
      setSchools((prev) => prev.map((s) => (s._id === schoolId ? { ...s, isEnabled } : s)));
    } catch (requestError) {
      setError(requestError?.message || "Failed to update school");
    }
  };

  const deleteSchool = async (schoolId, schoolName) => {
    const allowed = window.confirm(`Delete "${schoolName}" and all related data? This cannot be undone.`);
    if (!allowed) return;
    try {
      const response = await fetch(`${API_URL}/api/dev/schools/${schoolId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || "Failed to delete school");
      }
      setSchools((prev) => prev.filter((school) => school._id !== schoolId));
    } catch (requestError) {
      setError(requestError?.message || "Failed to delete school");
    }
  };

  return (
    <DevPortalLayout
      title="Schools Management"
      subtitle="List schools, view counts, toggle school access, and remove schools."
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-200">Loading schools...</p> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {schools.map((school) => (
          <article key={school._id} className="rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-500/20 to-blue-700/20 p-5 shadow-xl backdrop-blur-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white">{school.name}</h3>
                <p className="text-xs text-slate-200">Code: {school.code || "N/A"}</p>
                {school.duplicateCount > 1 ? (
                  <p className="text-[11px] font-semibold text-amber-100">Merged duplicates: {school.duplicateCount}</p>
                ) : null}
              </div>
              <span
                className={[
                  "rounded-full px-2.5 py-1 text-xs font-bold",
                  school.isEnabled === false ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
                ].join(" ")}
              >
                {school.isEnabled === false ? "Disabled" : "Enabled"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/15 p-3">
                <p className="text-xl font-black text-white">{school.totalStudents || 0}</p>
                <p className="text-xs font-semibold text-slate-100">Students</p>
              </div>
              <div className="rounded-xl bg-white/15 p-3">
                <p className="text-xl font-black text-white">{school.totalTeachers || 0}</p>
                <p className="text-xs font-semibold text-slate-100">Teachers</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleSchool(school._id, !(school.isEnabled !== false))}
                className="rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25"
              >
                {school.isEnabled === false ? "Enable School" : "Disable School"}
              </button>
              <button
                type="button"
                onClick={() => deleteSchool(school._id, school.name)}
                className="rounded-xl border border-rose-200/40 bg-rose-400/20 px-3 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-400/30"
              >
                Delete School
              </button>
              <Link
                to={`/dev/schools/${school._id}`}
                className="rounded-xl border border-cyan-200/40 bg-cyan-400/20 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/30"
              >
                View Details
              </Link>
            </div>
          </article>
        ))}
      </div>

      {!loading && schools.length === 0 ? <p className="text-sm text-slate-200">No schools found.</p> : null}
    </DevPortalLayout>
  );
}
