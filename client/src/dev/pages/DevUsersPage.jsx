import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TypeConfirmModal from "../components/TypeConfirmModal";
import DevRowActionMenu from "../components/DevRowActionMenu";
import DevStatusBadge from "../components/DevStatusBadge";
import { pushDevToast } from "../utils/devToast";
import { getCachedValue } from "../utils/devApiCache";

const API_URL = import.meta.env.VITE_API_URL;
const FILTERS_STORAGE_KEY = "dev_users_filters_v1";
const PRESETS_STORAGE_KEY = "dev_users_filter_presets_v1";
const DEV_SCHOOLS_CACHE_KEY = "dev_schools_meta_v1";
const DEV_SCHOOLS_CACHE_TTL_MS = 5 * 60 * 1000;

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const downloadFile = (filename, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function DevUsersPage() {
  const token = localStorage.getItem("developerToken");
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [actionBusyId, setActionBusyId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [studentNames, setStudentNames] = useState({});
  const [filters, setFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (!raw) return { search: "", role: "", status: "", schoolId: "" };
      const parsed = JSON.parse(raw);
      return {
        search: String(parsed?.search || ""),
        role: String(parsed?.role || ""),
        status: String(parsed?.status || ""),
        schoolId: String(parsed?.schoolId || ""),
      };
    } catch {
      return { search: "", role: "", status: "", schoolId: "" };
    }
  });
  const [presets, setPresets] = useState(() => {
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [presetName, setPresetName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [deleteState, setDeleteState] = useState({ open: false, user: null, busy: false });
  const searchRef = useRef(filters.search);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
    pushDevToast({ type: "info", message, durationMs: 8000 });
  };

  const loadMeta = useCallback(async () => {
    const schoolRows = await getCachedValue(DEV_SCHOOLS_CACHE_KEY, DEV_SCHOOLS_CACHE_TTL_MS, async () => {
      const response = await fetch(`${API_URL}/api/dev/schools?page=1&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Failed to load schools");
      }
      return Array.isArray(payload?.data) ? payload.data : [];
    });
    setSchools(schoolRows);
  }, [token]);

  const loadUsers = useCallback(async (searchValue = searchRef.current) => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "200");
    if (String(searchValue || "").trim()) params.set("search", String(searchValue).trim());
    if (filters.role) params.set("role", filters.role);
    if (filters.schoolId) params.set("schoolId", filters.schoolId);

    const response = await fetch(`${API_URL}/api/dev/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json();
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || payload?.error || "Failed to load users");
    }
    setUsers(Array.isArray(payload?.data) ? payload.data : []);
  }, [filters.role, filters.schoolId, token]);

  const loadStudentNames = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
      params.set("page", "1");
      if (filters.schoolId) params.set("schoolId", filters.schoolId);
      const response = await fetch(`${API_URL}/api/dev/data/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) return;
      const map = {};
      (payload?.data || []).forEach((s) => {
        const email = String(s.email || "").toLowerCase();
        if (email) map[email] = s.name || s.fullName || `${s.firstName || ""} ${s.lastName || ""}`.trim();
      });
      setStudentNames(map);
    } catch (err) {
      console.warn("loadStudentNames failed", err?.message || err);
    }
  }, [filters.schoolId, token]);

  useEffect(() => {
    searchRef.current = filters.search;
  }, [filters.search]);

  useEffect(() => {
    const load = async () => {
      try {
        await loadMeta();
        await loadStudentNames();
      } catch (err) {
        setError(err?.message || "Failed to load schools");
      }
    };
    load();
  }, [loadMeta, loadStudentNames]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        await loadUsers();
      } catch (err) {
        setError(err?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadUsers]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      await loadUsers(filters.search);
    } catch (err) {
      setError(err?.message || "Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    setPresets((prev) => ({ ...prev, [name]: { ...filters } }));
    setSelectedPreset(name);
    setPresetName("");
    showToast(`Saved preset: ${name}`);
  };

  const applyPreset = (name) => {
    const preset = presets?.[name];
    if (!preset) return;
    setFilters({
      search: String(preset.search || ""),
      role: String(preset.role || ""),
      status: String(preset.status || ""),
      schoolId: String(preset.schoolId || ""),
    });
    setSelectedPreset(name);
    showToast(`Applied preset: ${name}`);
  };

  const deletePreset = () => {
    if (!selectedPreset) return;
    setPresets((prev) => {
      const next = { ...prev };
      delete next[selectedPreset];
      return next;
    });
    showToast(`Deleted preset: ${selectedPreset}`);
    setSelectedPreset("");
  };

  const schoolNameMap = useMemo(() => {
    const map = new Map();
    for (const school of schools) map.set(String(school._id), school.name || "Unknown School");
    return map;
  }, [schools]);

  const filteredRows = useMemo(() => {
    const globalQ = String(searchParams.get("q") || "").trim().toLowerCase();
    return users.filter((user) => {
      const status = user?.isDeleted ? "disabled" : "active";
      if (filters.status && status !== String(filters.status).toLowerCase()) return false;
      if (globalQ) {
        const blob = `${user?.name || ""} ${user?.email || ""} ${user?.role || ""} ${user?.schoolId || ""}`.toLowerCase();
        if (!blob.includes(globalQ)) return false;
      }
      return true;
    });
  }, [users, filters.status, searchParams]);

  const pagedRows = useMemo(() => filteredRows.slice((page - 1) * pageSize, page * pageSize), [filteredRows, page]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const exportUsersJson = () => {
    const rows = filteredRows.map((user) => ({
      id: user._id || "",
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      school: schoolNameMap.get(String(user.schoolId || "")) || user.schoolId || "",
      status: user.isDeleted ? "Disabled" : "Active",
    }));
    downloadFile("dev-users-export.json", JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
    showToast("Users JSON exported");
  };

  const exportUsersCsv = () => {
    const headers = ["User ID", "Name", "Email", "Role", "School", "Status"];
    const lines = [
      headers.map(csvCell).join(","),
      ...filteredRows.map((user) =>
        [
          user._id || "",
          user.name || "",
          user.email || "",
          user.role || "",
          schoolNameMap.get(String(user.schoolId || "")) || user.schoolId || "",
          user.isDeleted ? "Disabled" : "Active",
        ]
          .map(csvCell)
          .join(",")
      ),
    ];
    downloadFile("dev-users-export.csv", lines.join("\n"), "text/csv;charset=utf-8");
    showToast("Users CSV exported");
  };

  const patchUser = async (userId, body) => {
    const response = await fetch(`${API_URL}/api/dev/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || payload?.error || "Failed to update user");
    }
    return payload;
  };

  const handleResetPassword = async (user) => {
    const password = window.prompt(`Enter new password for ${user.email}`, "user123");
    if (!password) return;
    try {
      setActionBusyId(String(user._id));
      await patchUser(user._id, { resetPassword: true, newPassword: password });
      showToast("Password reset successfully");
    } catch (err) {
      showToast(err?.message || "Failed to reset password");
    } finally {
      setActionBusyId("");
    }
  };

  const handleDisableToggle = async (user) => {
    try {
      setActionBusyId(String(user._id));
      const nextDisabled = !user?.isDeleted;
      await patchUser(user._id, { disable: nextDisabled });
      setUsers((prev) => prev.map((item) => (item._id === user._id ? { ...item, isDeleted: nextDisabled } : item)));
      showToast(nextDisabled ? "User disabled" : "User enabled");
    } catch (err) {
      showToast(err?.message || "Failed to update user");
    } finally {
      setActionBusyId("");
    }
  };

  const handleMoveUser = async (user) => {
    const targetSchoolId = window.prompt("Enter target School ID", user?.schoolId || "");
    if (!targetSchoolId || targetSchoolId === user?.schoolId) return;
    try {
      setActionBusyId(String(user._id));
      await patchUser(user._id, { schoolId: targetSchoolId });
      setUsers((prev) => prev.map((item) => (item._id === user._id ? { ...item, schoolId: targetSchoolId } : item)));
      showToast("User moved successfully");
    } catch (err) {
      showToast(err?.message || "Failed to move user");
    } finally {
      setActionBusyId("");
    }
  };

  const confirmDelete = (user) => setDeleteState({ open: true, user, busy: false });

  const handleDelete = async () => {
    const user = deleteState.user;
    if (!user?._id) return;
    try {
      setDeleteState((prev) => ({ ...prev, busy: true }));
      const response = await fetch(`${API_URL}/api/dev/users/${user._id}?confirm=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Failed to delete user");
      }
      setUsers((prev) => prev.filter((item) => item._id !== user._id));
      showToast("User deleted");
      setDeleteState({ open: false, user: null, busy: false });
    } catch (err) {
      showToast(err?.message || "Failed to delete user");
      setDeleteState((prev) => ({ ...prev, busy: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Users Management</h1>
        <p className="mt-1 text-sm text-slate-300">Search and control platform users across schools.</p>
      </div>

      {toast ? <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">{toast}</div> : null}
      {error ? <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</div> : null}

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search name or email"
            className="saas-input-dark"
          />
          <select value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))} className="saas-input-dark">
            <option value="">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="saas-input-dark">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <select value={filters.schoolId} onChange={(e) => setFilters((prev) => ({ ...prev, schoolId: e.target.value }))} className="saas-input-dark">
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school._id} value={school._id}>{school.name}</option>
            ))}
          </select>
          <button onClick={searchUsers} className="saas-button-dark">Search</button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" className="saas-input-dark" />
          <button onClick={savePreset} className="saas-button-dark">Save Preset</button>
          <select value={selectedPreset} onChange={(e) => { const name = e.target.value; setSelectedPreset(name); if (name) applyPreset(name); }} className="saas-input-dark">
            <option value="">Apply Preset</option>
            {Object.keys(presets).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button onClick={deletePreset} disabled={!selectedPreset} className="saas-button-dark disabled:cursor-not-allowed disabled:opacity-60">Delete Preset</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={exportUsersCsv} className="saas-button-dark">Export CSV</button>
          <button onClick={exportUsersJson} className="saas-button-dark">Export JSON</button>
        </div>
      </section>

      <div className="hidden overflow-x-auto max-h-[520px] rounded-2xl border border-white/10 bg-slate-950/45 backdrop-blur-xl md:block">
        <table className="saas-table-dark min-w-[1100px]">
          <thead className="sticky top-0 z-10 bg-slate-900/95 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">User Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={6}>Loading users...</td></tr>
            ) : pagedRows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={6}>No users found</td></tr>
            ) : (
              pagedRows.map((user) => {
                const displayName =
                  [
                    studentNames[String(user.email || "").toLowerCase()],
                    user.name,
                    user.fullName,
                    user.displayName,
                    `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                    user.studentName,
                    user.student?.name,
                    user.profile?.name,
                    user.profile?.fullName,
                    user.meta?.name,
                    user.meta?.fullName,
                    user.email ? user.email.split("@")[0] : "",
                  ].find((v) => v && String(v).trim()) || "-";
                const isDisabled = Boolean(user.isDeleted);
                const rowBusy = actionBusyId === String(user._id) || (deleteState.busy && deleteState.user?._id === user._id);
                return (
                  <tr key={user._id} className="border-t border-white/10">
                    <td className="px-4 py-3">{displayName}</td>
                    <td className="px-4 py-3">{user.email || "-"}</td>
                    <td className="px-4 py-3">{user.role || "-"}</td>
                    <td className="px-4 py-3">{schoolNameMap.get(String(user.schoolId || "")) || user.schoolId || "-"}</td>
                    <td className="px-4 py-3"><DevStatusBadge status={isDisabled ? "disabled" : "active"} /></td>
                    <td className="px-4 py-3 text-right">
                      <DevRowActionMenu
                        actions={[
                          { label: "Reset Password", disabled: rowBusy, onClick: () => handleResetPassword(user) },
                          { label: isDisabled ? "Enable User" : "Disable User", disabled: rowBusy, onClick: () => handleDisableToggle(user) },
                          { label: "Move User", disabled: rowBusy, onClick: () => handleMoveUser(user) },
                          { label: "Delete User", danger: true, disabled: rowBusy, onClick: () => confirmDelete(user) },
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
      <div className="space-y-3 md:hidden">
        {pagedRows.map((user) => {
          const displayName =
            [
              studentNames[String(user.email || "").toLowerCase()],
              user.name,
              user.fullName,
              user.displayName,
              `${user.firstName || ""} ${user.lastName || ""}`.trim(),
              user.studentName,
              user.student?.name,
              user.profile?.name,
              user.profile?.fullName,
              user.meta?.name,
              user.meta?.fullName,
              user.email ? user.email.split("@")[0] : "",
            ].find((v) => v && String(v).trim()) || "-";
          const isDisabled = Boolean(user.isDeleted);
          const rowBusy = actionBusyId === String(user._id) || (deleteState.busy && deleteState.user?._id === user._id);
          return (
            <article key={user._id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-slate-400">{user.email || "-"}</p>
                </div>
                <DevStatusBadge status={isDisabled ? "disabled" : "active"} />
              </div>
              <p className="mt-2 text-xs text-slate-300">Role: {user.role || "-"} | School: {schoolNameMap.get(String(user.schoolId || "")) || user.schoolId || "-"}</p>
              <div className="mt-2 flex justify-end">
                <DevRowActionMenu
                  actions={[
                    { label: "Reset Password", disabled: rowBusy, onClick: () => handleResetPassword(user) },
                    { label: isDisabled ? "Enable User" : "Disable User", disabled: rowBusy, onClick: () => handleDisableToggle(user) },
                    { label: "Move User", disabled: rowBusy, onClick: () => handleMoveUser(user) },
                    { label: "Delete User", danger: true, disabled: rowBusy, onClick: () => confirmDelete(user) },
                  ]}
                />
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs text-slate-300">
        <p>Rows: {filteredRows.length}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1} className="rounded border border-white/20 bg-white/10 px-2 py-1 disabled:opacity-50">Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages} className="rounded border border-white/20 bg-white/10 px-2 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>

      <TypeConfirmModal
        isOpen={deleteState.open}
        title="Delete User"
        message={`Delete ${deleteState.user?.email || "this user"}?`}
        confirmKeyword="DELETE"
        confirmText={deleteState.busy ? "Deleting..." : "Delete User"}
        isLoading={deleteState.busy}
        onCancel={() => setDeleteState({ open: false, user: null, busy: false })}
        onConfirm={handleDelete}
      />
    </div>
  );
}
