import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bug,
  FileText,
  Globe,
  HelpCircle,
  KeyRound,
  LogOut,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
} from "lucide-react";
import { useToast } from "../components/ToastProvider";
import PageIntro from "../components/ui/PageIntro";
import { sessionTracker } from "../utils/sessionTracker";
import clientPackage from "../../package.json";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";


const API_URL = import.meta.env.VITE_API_URL;
const SETTINGS_FONT = { fontFamily: "'Manrope', 'Segoe UI', system-ui, sans-serif" };

const SettingRow = ({ label, description, actionLabel, onClick, icon, iconTone = "bg-[var(--accent-soft)] text-[var(--accent)]" }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition hover:bg-[var(--accent-soft)] focus:outline-none"
  >
    <div className="flex w-full items-center gap-3">
      {icon && (
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${iconTone}`}>
          {icon}
        </span>
      )}
      <div className="flex-1">
        <p className="text-base text-[var(--text-primary)]">{label}</p>
        {description && <p className="text-xs font-normal text-[var(--text-secondary)]">{description}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {actionLabel && <span className="text-xs font-semibold text-[var(--accent)]">{actionLabel}</span>}
      <span className="text-[var(--text-tertiary)] text-xl leading-none">{">"}</span>
    </div>
  </button>
);

const ToggleRow = ({ label, description, enabled, onToggle }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl px-0 py-3 text-left text-sm font-medium">
    <div>
      <p className="text-base text-slate-100">{label}</p>
      {description && <p className="text-xs font-normal text-[var(--text-secondary)]">{description}</p>}
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-8 w-16 items-center rounded-full px-0.5 transition ${enabled ? "bg-[var(--accent)]" : "bg-[var(--bg-muted)]"}`}
      aria-pressed={enabled}
    >
      <span
        className={`h-7 w-7 rounded-full bg-white shadow transition ${enabled ? "translate-x-7" : "translate-x-0"}`}
      />
    </button>
  </div>
);

const SectionCard = ({ title, description, children }) => (
  <section
    className="space-y-3 rounded-3xl border p-5 backdrop-blur-xl"
    style={{ borderColor: "var(--border-color)", background: "var(--portal-panel-bg)", boxShadow: "var(--shadow-lg)" }}
  >
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--text-tertiary)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>}
    </div>
    <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border-color)" }}>{children}</div>
  </section>
);

const ChangePasswordModal = ({ show, form, setForm, onSubmit, onClose, loading }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4">
      <div
        className="w-full max-w-md rounded-3xl border p-5 shadow-2xl"
        style={{ background: "var(--bg-card-strong)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--text-tertiary)]">Security</p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Change Password</h2>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-[var(--text-secondary)]">
            Cancel
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            value={form.currentPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Current password"
            type="password"
            className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border-color)", background: "var(--portal-input-bg)", color: "var(--text-primary)" }}
          />
          <input
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            placeholder="New password"
            type="password"
            className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border-color)", background: "var(--portal-input-bg)", color: "var(--text-primary)" }}
          />
          <input
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirm new password"
            type="password"
            className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border-color)", background: "var(--portal-input-bg)", color: "var(--text-primary)" }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-3 text-sm font-bold transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))", color: "var(--accent-contrast)" }}
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
};

const getStoredToken = () => (
  localStorage.getItem("adminToken") ||
  localStorage.getItem("teacherToken") ||
  localStorage.getItem("studentToken") ||
  localStorage.getItem("token") ||
  null
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [fingerprintEnabled, setFingerprintEnabled] = useState(() => {
    const storedValue = localStorage.getItem("fingerprintEnabled");
    return storedValue === null ? true : storedValue === "true";
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileDraft, setProfileDraft] = useState(() => {
    const admin = JSON.parse(localStorage.getItem("adminData") || "{}");
    return {
      name: admin?.name || localStorage.getItem("adminName") || "",
      email: admin?.email || localStorage.getItem("adminEmail") || "",
      phone: admin?.phone || admin?.mobile || localStorage.getItem("adminPhone") || "",
      schoolName: localStorage.getItem("adminSchoolName") || admin?.schoolName || "",
    };
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const supportLinks = useMemo(
    () => [
      { label: "FAQ", slug: "faq", description: "Answers to common questions", icon: <HelpCircle className="h-5 w-5" /> },
      { label: "Contact Us", slug: "contact", description: "Message our success team", icon: <MessageCircle className="h-5 w-5" /> },
      { label: "Terms and Conditions", slug: "terms", description: "The legal agreement", icon: <FileText className="h-5 w-5" /> },
      { label: "Privacy Policy", slug: "privacy", description: "How we handle data", icon: <ShieldCheck className="h-5 w-5" /> },
      { label: "Exciting Features", slug: "features", description: "What is coming next quarter", icon: <Sparkles className="h-5 w-5" /> },
    ],
    []
  );

  const feedbackLinks = useMemo(
    () => [
      { label: "Rate Us", slug: "rate-us", description: "Share your experience" },
      { label: "Report Bug", slug: "report-bug", description: "Help us resolve issues" },
    ],
    []
  );


  const handleConfirmChangePassword = async (event) => {
    event?.preventDefault?.();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.warning("Please fill every field");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.warning("New password and confirmation must match");
      return;
    }
    const token = sessionTracker.getToken() || getStoredToken();
    if (!token) {
      toast.error("We could not verify your session. Please login again.");
      navigate("/");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Unable to update password");
        return;
      }
      toast.success("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordModal(false);
    } catch (err) {
      console.error("CHANGE PASSWORD ERROR:", err);
      toast.error("Unable to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSupportClick = (slug) => {
    navigate(`/settings/info/${slug}`);
  };

  const handleFeedbackClick = (slug) => {
    if (slug === "rate-us") {
      window.open("https://play.google.com/store/apps/details?id=com.edunest", "_blank", "noreferrer");
      return;
    }
    window.open("mailto:feedback@edunest.com?subject=Bug%20Report", "_blank", "noreferrer");
  };

  const handleLogout = async () => {
    const token = sessionTracker.getToken() || getStoredToken();
    try {
      await sessionTracker.endSession();
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      [
        "adminToken",
        "teacherToken",
        "studentToken",
        "token",
        "teacherSchoolId",
        "teacherSchoolName",
        "studentSchoolId",
        "studentSchoolName",
        "adminSchoolId",
        "adminSchoolName",
        "teacherMustChangePassword",
        "studentMustChangePassword",
        "userRole",
      ].forEach((key) => localStorage.removeItem(key));
      navigate("/");
    }
  };

  return (
    <div className="student-portal-shell min-h-screen px-4 py-8 text-[var(--text-primary)]" style={{ ...SETTINGS_FONT, background: "var(--page-gradient)" }}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="self-start text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← {t("common.back", "Go Back")}
        </button>
        <SectionCard title="Account & Security" description="Keep your sign-in safe">
          <SettingRow
            label="Change Password"
            description="Update your password"
            icon={<KeyRound className="h-5 w-5" />}
            iconTone="bg-cyan-500/20 text-cyan-200"
            onClick={() => setShowPasswordModal(true)}
          />
          <ToggleRow
            label="Enable Fingerprint Login"
            description="Only for devices you've registered"
            enabled={fingerprintEnabled}
            onToggle={() => {
              const next = !fingerprintEnabled;
              setFingerprintEnabled(next);
              localStorage.setItem("fingerprintEnabled", next.toString());
            }}
          />
          <ToggleRow
            label="Dark Mode"
            description={`Switch between restaurant-style ${theme === "dark" ? "dark" : "light"} themes`}
            enabled={theme === "dark"}
            onToggle={toggleTheme}
          />
        </SectionCard>

        <SectionCard title="Profile" description="Update details shown in admin profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "name", label: "Name", placeholder: "Enter name" },
              { key: "email", label: "Email", placeholder: "Enter email" },
              { key: "phone", label: "Phone", placeholder: "Enter phone" },
              { key: "schoolName", label: "School", placeholder: "Enter school name" },
            ].map((field) => (
              <label key={field.key} className="space-y-1 text-sm text-[var(--text-secondary)]">
                <span className="block font-semibold text-[var(--text-primary)]">{field.label}</span>
                <input
                  value={profileDraft[field.key] || ""}
                  onChange={(e) => setProfileDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                />
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const admin = JSON.parse(localStorage.getItem("adminData") || "{}");
                setProfileDraft({
                  name: admin?.name || localStorage.getItem("adminName") || "",
                  email: admin?.email || localStorage.getItem("adminEmail") || "",
                  phone: admin?.phone || admin?.mobile || localStorage.getItem("adminPhone") || "",
                  schoolName: localStorage.getItem("adminSchoolName") || admin?.schoolName || "",
                });
              }}
              className="px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                const existing = JSON.parse(localStorage.getItem("adminData") || "{}");
                const next = {
                  ...existing,
                  name: profileDraft.name?.trim() || existing?.name || "",
                  email: profileDraft.email?.trim() || existing?.email || "",
                  phone: profileDraft.phone?.trim() || existing?.phone || existing?.mobile || "",
                  mobile: profileDraft.phone?.trim() || existing?.mobile || "",
                  schoolName: profileDraft.schoolName?.trim() || existing?.schoolName || "",
                };
                localStorage.setItem("adminData", JSON.stringify(next));
                if (next.name) localStorage.setItem("adminName", next.name);
                if (next.email) localStorage.setItem("adminEmail", next.email);
                if (next.phone) localStorage.setItem("adminPhone", next.phone);
                if (next.schoolName) localStorage.setItem("adminSchoolName", next.schoolName);
                toast.success("Profile updated locally");
              }}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-semibold shadow hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Save
            </button>
          </div>
        </SectionCard>

        {/* Preferences section removed: single-language app */}
        <SectionCard title="Support & Information" description="Need help? Start here">
          {supportLinks.map((link) => (
            <SettingRow
              key={link.label}
              label={link.label}
              description={link.description}
              icon={link.icon}
              iconTone="bg-amber-500/20 text-amber-200"
              onClick={() => handleSupportClick(link.slug)}
            />
          ))}
        </SectionCard>

        <SectionCard title="Feedback" description="Your voice shapes the product">
          {feedbackLinks.map((link) => (
            <SettingRow
              key={link.label}
              label={link.label}
              description={link.description}
              icon={link.label === "Rate Us" ? <Star className="h-5 w-5" /> : <Bug className="h-5 w-5" />}
              iconTone="bg-white/10 text-slate-200"
              onClick={() => handleFeedbackClick(link.slug)}
            />
          ))}
        </SectionCard>

        <SectionCard title="Footer">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--accent-soft)]/30 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Theme preview</p>
              <p className="text-xs text-[var(--text-secondary)]">Restaurant SaaS palette is active across the app</p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-card)] text-[var(--accent)] shadow-sm">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </span>
          </div>
          <SettingRow
            label="Logout"
            description="Sign out from this device"
            icon={<LogOut className="h-5 w-5" />}
            iconTone="bg-rose-500/20 text-rose-200"
            onClick={handleLogout}
          />
          <p className="text-xs text-slate-400">App version {clientPackage.version}</p>
        </SectionCard>
      </div>

      <ChangePasswordModal
        show={showPasswordModal}
        form={passwordForm}
        setForm={setPasswordForm}
        onSubmit={handleConfirmChangePassword}
        onClose={() => setShowPasswordModal(false)}
        loading={passwordLoading}
      />
    </div>
  );
}




