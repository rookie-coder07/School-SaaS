import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TypeConfirmModal from "../components/TypeConfirmModal";
import DevStatusBadge from "../components/DevStatusBadge";
import DevRowActionMenu from "../components/DevRowActionMenu";
import { pushDevToast } from "../utils/devToast";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function DevSchoolsPage() {
  const token = localStorage.getItem("developerToken");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schools, setSchools] = useState([]);
  const [toast, setToast] = useState("");
  const [actionBusyId, setActionBusyId] = useState("");
  const [schoolSearch, setSchoolSearch] = useState(() => String(searchParams.get("schoolId") || ""));
  const [copiedSchoolId, setCopiedSchoolId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [deleteState, setDeleteState] = useState({ open: false, school: null, busy: false });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
    pushDevToast({ type: "info", message, durationMs: 8000 });
  };

  const loadSchools = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/dev/schools?page=1&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Failed to load schools");
      }
      setSchools(Array.isArray(payload?.data) ? payload.data : []);
    } catch (err) {
      setError(err?.message || "Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, [token]);

  useEffect(() => {
    const schoolIdFromQuery = String(searchParams.get("schoolId") || "");
    if (!schoolIdFromQuery) return;
    setSchoolSearch(schoolIdFromQuery);
    setPage(1);
  }, [searchParams]);

  const copySchoolIdToClipboard = async (schoolId) => {
    const value = String(schoolId || "");
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedSchoolId(value);
      showToast("School ID copied");
      setTimeout(() => setCopiedSchoolId(""), 1200);
    } catch {
      showToast("Failed to copy School ID");
    }
  };

  const viewSchool = (school) => {
    const schoolId = String(school?._id || "");
    if (!schoolId) return;
    setSchoolSearch(schoolId);
    setPage(1);
    navigate(`/dev-console/schools?schoolId=${schoolId}`);
    showToast("School selected");
  };

  const patchSchoolStatus = async (school, nextEnabled) => {
    try {
      setActionBusyId(String(school._id));
      const response = await fetch(`${API_URL}/api/dev/schools/${school._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextEnabled ? "active" : "disabled" }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Failed to update school");
      }
      setSchools((prev) =>
        prev.map((item) =>
          String(item._id) === String(school._id)
            ? { ...item, isEnabled: nextEnabled, enabled: nextEnabled, status: nextEnabled ? "active" : "disabled" }
            : item
        )
      );
      showToast(`School ${nextEnabled ? "enabled" : "disabled"}`);
    } catch (err) {
      showToast(err?.message || "Failed to update school");
    } finally {
      setActionBusyId("");
    }
  };

  const openDeleteModal = (school) => setDeleteState({ open: true, school, busy: false });

  const deleteSchool = async () => {
    const school = deleteState.school;
    if (!school?._id) return;
    try {
      setDeleteState((prev) => ({ ...prev, busy: true }));
      const response = await fetch(`${API_URL}/api/dev/schools/${school._id}?confirm=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Failed to delete school");
      }
      setSchools((prev) => prev.filter((item) => String(item._id) !== String(school._id)));
      showToast("School deleted");
      setDeleteState({ open: false, school: null, busy: false });
    } catch (err) {
      setDeleteState((prev) => ({ ...prev, busy: false }));
      showToast(err?.message || "Failed to delete school");
    }
  };

  const rows = useMemo(() => {
    const globalQ = String(searchParams.get("q") || "").trim().toLowerCase();
    const schoolQ = String(schoolSearch || "").trim().toLowerCase();
    return schools.filter((school) => {
      const schoolName = String(school?.name || "").toLowerCase();
      const adminEmail = String(school?.admin?.email || "").toLowerCase();
      const schoolId = String(school?._id || "").toLowerCase();
      const blob = `${schoolName} ${schoolId} ${school?.admin?.name || ""} ${adminEmail}`.toLowerCase();
      if (globalQ && !blob.includes(globalQ)) return false;
      if (schoolQ && !schoolName.includes(schoolQ) && !adminEmail.includes(schoolQ) && !schoolId.includes(schoolQ)) return false;
      return true;
    });
  }, [schools, schoolSearch, searchParams]);
  const pagedRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Schools Management</h1>
        <p className="mt-1 text-sm text-slate-300">Control schools, visibility and administrative ownership.</p>
      </div>

      {toast ? <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">{toast}</div> : null}
      {error ? <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</div> : null}

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            value={schoolSearch}
            onChange={(e) => {
              setSchoolSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search school name, admin email, or school ID"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400"
          />
          <div className="md:col-span-3 text-xs text-slate-300 md:pt-2">Showing {rows.length} schools</div>
        </div>
      </section>

      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/45 backdrop-blur-xl md:block">
        <table className="w-full min-w-[1100px] text-left text-sm text-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-900/95 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">School Name</th>
              <th className="px-4 py-3">School ID</th>
              <th className="px-4 py-3">Admin Email</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Teachers</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>Loading schools...</td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>No schools found</td>
              </tr>
            ) : (
              pagedRows.map((school) => {
                const isEnabled = school?.isEnabled !== false;
                const rowBusy = actionBusyId === String(school._id) || (deleteState.busy && deleteState.school?._id === school._id);
                return (
                  <tr key={school._id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{school.name || "Unnamed"}</div>
                      <div className="text-xs text-slate-400">{school.address || "No address"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-300">{school._id}</span>
                        <button
                          type="button"
                          onClick={() => copySchoolIdToClipboard(school._id)}
                          className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-100 hover:bg-white/20"
                        >
                          {copiedSchoolId === String(school._id) ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">{school?.admin?.email || "-"}</td>
                    <td className="px-4 py-3">{Number(school.totalStudents || 0)}</td>
                    <td className="px-4 py-3">{Number(school.totalTeachers || 0)}</td>
                    <td className="px-4 py-3">
                      <DevStatusBadge status={isEnabled ? "active" : "disabled"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DevRowActionMenu
                        actions={[
                          {
                            label: "View School",
                            disabled: rowBusy,
                            onClick: () => viewSchool(school),
                          },
                          {
                            label: "Manage Users",
                            disabled: rowBusy,
                            onClick: () => navigate(`/dev-console/users?schoolId=${school._id}`),
                          },
                          {
                            label: isEnabled ? "Disable School" : "Enable School",
                            disabled: rowBusy,
                            onClick: () => patchSchoolStatus(school, !isEnabled),
                          },
                          {
                            label: "Open Data Explorer",
                            disabled: rowBusy,
                            onClick: () => navigate(`/dev-console/data-explorer?schoolId=${school._id}`),
                          },
                          {
                            label: "Delete School",
                            danger: true,
                            disabled: rowBusy,
                            onClick: () => openDeleteModal(school),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {pagedRows.map((school) => {
          const isEnabled = school?.isEnabled !== false;
          const rowBusy = actionBusyId === String(school._id) || (deleteState.busy && deleteState.school?._id === school._id);
          return (
            <article key={school._id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{school.name || "Unnamed"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-mono text-[11px] text-slate-400">{school._id}</p>
                    <button
                      type="button"
                      onClick={() => copySchoolIdToClipboard(school._id)}
                      className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-100 hover:bg-white/20"
                    >
                      {copiedSchoolId === String(school._id) ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <DevStatusBadge status={isEnabled ? "active" : "disabled"} />
              </div>
              <p className="mt-2 text-xs text-slate-300">Admin Email: {school?.admin?.email || "-"}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-300">Students {Number(school.totalStudents || 0)} | Teachers {Number(school.totalTeachers || 0)}</span>
                <DevRowActionMenu
                  actions={[
                    { label: "View School", disabled: rowBusy, onClick: () => viewSchool(school) },
                    { label: "Manage Users", disabled: rowBusy, onClick: () => navigate(`/dev-console/users?schoolId=${school._id}`) },
                    { label: isEnabled ? "Disable School" : "Enable School", disabled: rowBusy, onClick: () => patchSchoolStatus(school, !isEnabled) },
                    { label: "Open Data Explorer", disabled: rowBusy, onClick: () => navigate(`/dev-console/data-explorer?schoolId=${school._id}`) },
                    { label: "Delete School", danger: true, disabled: rowBusy, onClick: () => openDeleteModal(school) },
                  ]}
                />
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs text-slate-300">
        <p>Rows: {rows.length}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span>Page {page} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <TypeConfirmModal
        isOpen={deleteState.open}
        title="Delete School"
        message={`Delete ${deleteState.school?.name || "this school"}?`}
        confirmKeyword="DELETE"
        confirmText={deleteState.busy ? "Deleting..." : "Delete School"}
        isLoading={deleteState.busy}
        onCancel={() => setDeleteState({ open: false, school: null, busy: false })}
        onConfirm={deleteSchool}
      />
    </div>
  );
}
