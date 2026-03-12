import { useEffect, useState } from "react";
import TypeConfirmModal from "../components/TypeConfirmModal";
import { pushDevToast } from "../utils/devToast";

const API_URL = import.meta.env.VITE_API_URL;

const toggleClass =
  "inline-flex h-6 w-11 items-center rounded-full border border-white/20 bg-white/10 p-1 transition peer-checked:bg-cyan-500/40";

export default function DevSystemControlsPage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [uploadsDisabled, setUploadsDisabled] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState({ open: false, busy: false });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
    pushDevToast({ type: "info", message, durationMs: 8000 });
  };

  const loadControlState = async () => {
    const response = await fetch(`${API_URL}/api/dev/system-health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json();
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || payload?.error || "Failed to fetch system state");
    }
    const control = payload?.data?.platformControl || {};
    setMaintenanceMode(Boolean(control.maintenanceMode));
    setUploadsDisabled(Boolean(control.uploadsDisabled));
  };

  useEffect(() => {
    loadControlState().catch((err) => setError(err?.message || "Failed to fetch system state"));
  }, [token]);

  const callAction = async (url, body = null) => {
    setLoading(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : null,
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Operation failed");
      }
      showToast(payload?.message || "Operation completed");
      return payload;
    } catch (err) {
      setError(err?.message || "Operation failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceToggle = async (nextValue) => {
    try {
      await callAction(`${API_URL}/api/dev/system/maintenance`, {
        maintenanceMode: nextValue,
        disableUploads: uploadsDisabled,
      });
      setMaintenanceMode(nextValue);
    } catch {
      // handled in callAction
    }
  };

  const handleUploadsToggle = async (nextDisabled) => {
    try {
      await callAction(`${API_URL}/api/dev/system/uploads`, { disabled: nextDisabled });
      setUploadsDisabled(nextDisabled);
    } catch {
      // handled in callAction
    }
  };

  const handleForceLogoutAll = async () => {
    try {
      setConfirmLogoutAll((prev) => ({ ...prev, busy: true }));
      await callAction(`${API_URL}/api/dev/system/logout-all?confirm=true`);
      setConfirmLogoutAll({ open: false, busy: false });
    } catch {
      setConfirmLogoutAll((prev) => ({ ...prev, busy: false }));
    }
  };

  const handleClearCache = async () => {
    await callAction(`${API_URL}/api/dev/system/cache-clear`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">System Controls</h1>
        <p className="mt-1 text-sm text-slate-300">Emergency operations for platform-wide stability and access control.</p>
      </div>

      {toast ? <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">{toast}</div> : null}
      {error ? <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</div> : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
          <h3 className="text-base font-bold text-white">Maintenance Mode</h3>
          <p className="mt-1 text-xs text-slate-300">Block non-developer API traffic.</p>
          <label className="mt-4 inline-flex items-center gap-3">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={maintenanceMode}
              onChange={(e) => handleMaintenanceToggle(e.target.checked)}
              disabled={loading}
            />
            <span className={toggleClass}>
              <span className={`h-4 w-4 rounded-full bg-white transition ${maintenanceMode ? "translate-x-5" : ""}`} />
            </span>
            <span className="text-sm text-slate-100">{maintenanceMode ? "Enabled" : "Disabled"}</span>
          </label>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
          <h3 className="text-base font-bold text-white">Uploads Control</h3>
          <p className="mt-1 text-xs text-slate-300">Temporarily block multipart uploads.</p>
          <label className="mt-4 inline-flex items-center gap-3">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={uploadsDisabled}
              onChange={(e) => handleUploadsToggle(e.target.checked)}
              disabled={loading}
            />
            <span className={toggleClass}>
              <span className={`h-4 w-4 rounded-full bg-white transition ${uploadsDisabled ? "translate-x-5" : ""}`} />
            </span>
            <span className="text-sm text-slate-100">{uploadsDisabled ? "Uploads Disabled" : "Uploads Enabled"}</span>
          </label>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white">Emergency Actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => setConfirmLogoutAll({ open: true, busy: false })}
            disabled={loading}
            className="rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/30 disabled:opacity-50"
          >
            Force Logout All Users
          </button>
          <button
            onClick={handleClearCache}
            disabled={loading}
            className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            Clear Cache
          </button>
        </div>
      </section>

      <TypeConfirmModal
        isOpen={confirmLogoutAll.open}
        title="Force Logout All Users"
        message="End all active user sessions immediately?"
        confirmKeyword="DELETE"
        confirmText={confirmLogoutAll.busy ? "Processing..." : "Force Logout"}
        isLoading={confirmLogoutAll.busy}
        onCancel={() => setConfirmLogoutAll({ open: false, busy: false })}
        onConfirm={handleForceLogoutAll}
      />
    </div>
  );
}