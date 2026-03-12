import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL;

const StatCard = ({ label, value, theme = "from-cyan-400/35 to-blue-500/25" }) => (
  <article className={`rounded-2xl border border-white/20 bg-gradient-to-br ${theme} p-4 shadow-xl backdrop-blur-lg`}>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-100">{label}</p>
    <p className="mt-2 text-3xl font-black text-white">{value}</p>
  </article>
);

export default function DevSchoolDetails() {
  const { schoolId } = useParams();
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schoolData, setSchoolData] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/dev/schools/${schoolId}/details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Failed to load school details");
        setSchoolData(payload);
      } catch (requestError) {
        setError(requestError?.message || "Failed to load school details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [schoolId, token]);

  const removeUser = async (userId) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      const response = await fetch(`${API_URL}/api/dev/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to delete user");
      setSchoolData((prev) => ({
        ...prev,
        admins: (prev?.admins || []).filter((u) => u._id !== userId),
        teachers: (prev?.teachers || []).filter((u) => u._id !== userId),
        students: (prev?.students || []).filter((u) => u._id !== userId),
      }));
    } catch (requestError) {
      setError(requestError?.message || "Failed to delete user");
    }
  };

  const school = schoolData?.school || {};
  const stats = schoolData?.stats || {};
  const recentErrors = schoolData?.recentErrors || [];

  return (
    <DevPortalLayout
      title={school?.name ? `${school.name} Details` : "School Details"}
      subtitle="Students, teachers, attendance, and recent error activity."
      actions={
        <Link to="/dev/schools" className="rounded-xl bg-cyan-400/80 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300">
          Back to Schools
        </Link>
      }
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200/40 bg-rose-400/20 px-4 py-3 text-sm font-medium text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-200">Loading school details...</p> : null}

      {!loading && schoolData ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Students" value={stats.totalStudents || 0} theme="from-emerald-400/35 to-green-600/25" />
            <StatCard label="Teachers" value={stats.totalTeachers || 0} theme="from-violet-400/35 to-purple-600/25" />
            <StatCard label="Attendance Records" value={stats.totalAttendance || 0} theme="from-cyan-400/35 to-blue-600/25" />
            <StatCard label="Attendance %" value={`${stats.attendanceRate || 0}%`} theme="from-amber-300/35 to-orange-600/25" />
          </section>

          <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
              <h3 className="text-base font-black text-white">Recent Errors</h3>
              <div className="mt-3 max-h-72 overflow-auto space-y-2">
                {recentErrors.length ? (
                  recentErrors.map((item) => (
                    <article key={`${item.timestamp}-${item.route}`} className="rounded-xl border border-white/15 bg-white/10 p-3">
                      <p className="text-xs text-slate-200">{new Date(item.timestamp).toLocaleString()}</p>
                      <p className="text-sm font-semibold text-white">{item.route}</p>
                      <p className="text-xs text-slate-200">{item.message}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-200">No recent errors for this school.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg">
              <h3 className="text-base font-black text-white">Users</h3>
              <div className="mt-3 max-h-72 overflow-auto space-y-2">
                {[...(schoolData.admins || []), ...(schoolData.teachers || []), ...(schoolData.students || [])]
                  .slice(0, 40)
                  .map((user) => (
                    <div key={user._id} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{user.name || user.email}</p>
                        <p className="truncate text-xs text-slate-200">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUser(user._id)}
                        className="rounded-lg border border-rose-200/40 bg-rose-400/20 px-2 py-1 text-xs font-bold text-rose-100 hover:bg-rose-400/30"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </DevPortalLayout>
  );
}
