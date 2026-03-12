import { useState } from "react";
import TypeConfirmModal from "../components/TypeConfirmModal";
import { pushDevToast } from "../utils/devToast";

const API_URL = import.meta.env.VITE_API_URL;

const cardClass = "rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl";
const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40";

export default function DevSettingsPage() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [accessForm, setAccessForm] = useState({ currentAccessCode: "", newAccessCode: "" });
  const [confirmLogoutAll, setConfirmLogoutAll] = useState({ open: false, busy: false });

  const showToast = (message, type = "info") => {
    pushDevToast({ type, message, durationMs: 8000 });
  };

  const callApi = async (path, body) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Request failed");
      }
      return payload;
    } catch (err) {
      setError(err?.message || "Request failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (event) => {
    event.preventDefault();
    try {
      const payload = await callApi("/api/dev/change-email", emailForm);
      if (payload?.token) {
        localStorage.setItem("developerToken", payload.token);
      }
      setEmailForm({ currentPassword: "", newEmail: "" });
      showToast("Developer email updated.");
    } catch {
      // handled in callApi
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    try {
      await callApi("/api/dev/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Developer password updated.");
    } catch {
      // handled in callApi
    }
  };

  const handleAccessCodeChange = async (event) => {
    event.preventDefault();
    try {
      const payload = await callApi("/api/dev/change-access-code", accessForm);
      setAccessForm({ currentAccessCode: "", newAccessCode: "" });
      showToast(payload?.message || "Developer access code rotated.");
    } catch {
      // handled in callApi
    }
  };

  const handleLogoutAll = async () => {
    setConfirmLogoutAll({ open: true, busy: false });
  };

  const confirmLogout = async () => {
    try {
      setConfirmLogoutAll({ open: true, busy: true });
      const response = await fetch(`${API_URL}/api/dev/system/logout-all?confirm=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || "Logout all failed");
      }
      showToast("All sessions invalidated.", "success");
      setConfirmLogoutAll({ open: false, busy: false });
    } catch (err) {
      setError(err?.message || "Logout all failed");
      setConfirmLogoutAll({ open: true, busy: false });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Developer Settings</h1>
        <p className="mt-1 text-sm text-slate-300">Manage developer credentials and security actions.</p>
      </div>

      {error ? <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">{error}</div> : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className={cardClass}>
          <h3 className="text-base font-bold text-white">Change Developer Email</h3>
          <p className="mt-1 text-xs text-slate-300">Requires your current password.</p>
          <form className="mt-4 space-y-3" onSubmit={handleEmailChange}>
            <input
              type="password"
              placeholder="Current password"
              value={emailForm.currentPassword}
              onChange={(e) => setEmailForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className={inputClass}
              required
              disabled={loading}
            />
            <input
              type="email"
              placeholder="New developer email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm((prev) => ({ ...prev, newEmail: e.target.value }))}
              className={inputClass}
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              Update Email
            </button>
          </form>
        </article>

        <article className={cardClass}>
          <h3 className="text-base font-bold text-white">Change Developer Password</h3>
          <p className="mt-1 text-xs text-slate-300">Minimum 8 characters.</p>
          <form className="mt-4 space-y-3" onSubmit={handlePasswordChange}>
            <input
              type="password"
              placeholder="Current password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className={inputClass}
              required
              disabled={loading}
            />
            <input
              type="password"
              placeholder="New password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className={inputClass}
              required
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className={inputClass}
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              Update Password
            </button>
          </form>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className={cardClass}>
          <h3 className="text-base font-bold text-white">Rotate Developer Access Code</h3>
          <p className="mt-1 text-xs text-slate-300">Requires server restart to persist.</p>
          <form className="mt-4 space-y-3" onSubmit={handleAccessCodeChange}>
            <input
              type="password"
              placeholder="Current access code"
              value={accessForm.currentAccessCode}
              onChange={(e) => setAccessForm((prev) => ({ ...prev, currentAccessCode: e.target.value }))}
              className={inputClass}
              required
              disabled={loading}
            />
            <input
              type="password"
              placeholder="New access code"
              value={accessForm.newAccessCode}
              onChange={(e) => setAccessForm((prev) => ({ ...prev, newAccessCode: e.target.value }))}
              className={inputClass}
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              Rotate Access Code
            </button>
          </form>
        </article>

        <article className={cardClass}>
          <h3 className="text-base font-bold text-white">Logout All Sessions</h3>
          <p className="mt-1 text-xs text-slate-300">Invalidate all active user sessions immediately.</p>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleLogoutAll}
              disabled={loading}
              className="rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/30 disabled:opacity-50"
            >
              Logout All Sessions
            </button>
          </div>
        </article>
      </section>

      <TypeConfirmModal
        isOpen={confirmLogoutAll.open}
        title="Logout All Sessions"
        message="This will invalidate all user sessions immediately."
        confirmKeyword="LOGOUT"
        confirmText={confirmLogoutAll.busy ? "Processing..." : "Logout All"}
        isLoading={confirmLogoutAll.busy}
        onCancel={() => setConfirmLogoutAll({ open: false, busy: false })}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
