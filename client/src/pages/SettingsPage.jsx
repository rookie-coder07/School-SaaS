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
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useToast } from "../components/ToastProvider";
import PageIntro from "../components/ui/PageIntro";
import { sessionTracker } from "../utils/sessionTracker";
import clientPackage from "../../package.json";

const API_URL = import.meta.env.VITE_API_URL;
const SETTINGS_FONT = { fontFamily: "'Manrope', 'Segoe UI', system-ui, sans-serif" };

const languages = [
  { label: "English (US)", locale: "en-US", note: "Default" },
  { label: "English (UK)", locale: "en-GB", note: "British spellings" },
  { label: "Hindi", locale: "hi-IN", note: "Hindi" },
];

const SettingRow = ({ label, description, actionLabel, onClick, icon, iconTone = "bg-white/10 text-slate-200" }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition hover:bg-white/5 focus:outline-none"
  >
    <div className="flex w-full items-center gap-3">
      {icon && (
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${iconTone}`}>
          {icon}
        </span>
      )}
      <div className="flex-1">
        <p className="text-base text-slate-100">{label}</p>
        {description && <p className="text-xs font-normal text-slate-400">{description}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {actionLabel && <span className="text-xs font-semibold text-cyan-200">{actionLabel}</span>}
      <span className="text-slate-400 text-xl leading-none">{">"}</span>
    </div>
  </button>
);

const ToggleRow = ({ label, description, enabled, onToggle }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl px-0 py-3 text-left text-sm font-medium">
    <div>
      <p className="text-base text-slate-100">{label}</p>
      {description && <p className="text-xs font-normal text-slate-400">{description}</p>}
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-8 w-16 items-center rounded-full px-0.5 transition ${enabled ? "bg-cyan-500" : "bg-slate-700"}`}
      aria-pressed={enabled}
    >
      <span
        className={`h-7 w-7 rounded-full bg-white shadow transition ${enabled ? "translate-x-7" : "translate-x-0"}`}
      />
    </button>
  </div>
);

const SectionCard = ({ title, description, children }) => (
  <section className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40 backdrop-blur-xl">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
    <div className="space-y-2 border-t border-white/10 pt-4">{children}</div>
  </section>
);

const LanguageSheet = ({ languages, selected, onSelect, onClose }) => (
  <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-4">
    <div className="w-full max-w-md rounded-3xl bg-slate-900/90 p-5 shadow-2xl border border-white/10 text-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-400">App Language</p>
          <h2 className="text-lg font-bold text-white">Switch language</h2>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-300">
          Close
        </button>
      </div>
      <div className="space-y-3">
        {languages.map((language) => (
          <button
            key={language.locale}
            type="button"
            onClick={() => onSelect(language.locale)}
            className={`flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition ${
              selected === language.locale
                ? "border-cyan-400/60 bg-cyan-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-slate-100">{language.label}</span>
              {selected === language.locale && (
                <span className="text-xs font-semibold text-cyan-200">Selected</span>
              )}
            </div>
            <span className="text-xs text-slate-400">{language.note}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const ChangePasswordModal = ({ show, form, setForm, onSubmit, onClose, loading }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/90 p-5 shadow-2xl border border-white/10 text-slate-100">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Security</p>
            <h2 className="text-xl font-bold text-white">Change Password</h2>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-300">
            Cancel
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            value={form.currentPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Current password"
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <input
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            placeholder="New password"
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <input
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirm new password"
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-bold text-white transition disabled:opacity-50"
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
  const [fingerprintEnabled, setFingerprintEnabled] = useState(() => {
    const storedValue = localStorage.getItem("fingerprintEnabled");
    return storedValue === null ? true : storedValue === "true";
  });
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("appLanguage") || languages[0].locale);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const selectedLanguage = languages.find((item) => item.locale === language);

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

  const handleLanguageSelect = (locale) => {
    localStorage.setItem("appLanguage", locale);
    setLanguage(locale);
    setShowLanguageSheet(false);
    toast.success("App language is saved for the next session");
  };

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
    <div className="student-portal-shell min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-8 text-slate-100" style={SETTINGS_FONT}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-slate-400 hover:text-white transition self-start"
        >
          ← Go Back
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
        </SectionCard>

        <SectionCard title="Preferences" description="Personalize the experience">
          <SettingRow
            label="App Language"
            description="Choose your preferred locale"
            actionLabel={selectedLanguage?.label}
            icon={<Globe className="h-5 w-5" />}
            iconTone="bg-emerald-500/20 text-emerald-200"
            onClick={() => setShowLanguageSheet(true)}
          />
        </SectionCard>

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

      {showLanguageSheet && (
        <LanguageSheet
          languages={languages}
          selected={language}
          onSelect={handleLanguageSelect}
          onClose={() => setShowLanguageSheet(false)}
        />
      )}

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
