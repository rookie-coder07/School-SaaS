import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Search, UserCircle2 } from "lucide-react";
import NotificationBell from "./NotificationBell";
import NotificationDropdown from "./NotificationDropdown";
import useUnreadCount from "../hooks/useUnreadCount";
import { useLanguage } from "../context/LanguageContext";

const resolveToken = () =>
  localStorage.getItem("adminToken") ||
  localStorage.getItem("teacherToken") ||
  localStorage.getItem("studentToken") ||
  localStorage.getItem("token");

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [token, setToken] = useState(null);
  const { unreadCount, refreshUnreadCount } = useUnreadCount(token);
  const menuRef = useRef(null);
  const notificationsRef = useRef(null);
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    const syncToken = () => setToken(resolveToken());
    syncToken();
    window.addEventListener("storage", syncToken);
    window.addEventListener("focus", syncToken);
    document.addEventListener("visibilitychange", syncToken);
    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("focus", syncToken);
      document.removeEventListener("visibilitychange", syncToken);
    };
  }, []);

  // Handle scroll lock when menu opens/closes
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("nav-open");
    } else {
      document.body.classList.remove("nav-open");
    }
    return () => {
      document.body.classList.remove("nav-open");
    };
  }, [menuOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className="sticky top-0 z-40 shadow-sm backdrop-blur-md"
      style={{ background: "var(--bg-card)", borderBottom: `1px solid var(--border-color)`, color: "var(--text-primary)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="relative h-9 w-9 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: `1px solid var(--border-color)` }}
            aria-label="Toggle menu"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMenuOpen((prev) => !prev);
              }
            }}
            tabIndex={0}
            role="button"
            aria-pressed={menuOpen}
          >
            <span
              className={`absolute left-2 right-2 top-2 h-0.5 bg-slate-600 transition-all ${
                menuOpen ? "translate-y-2.5 rotate-45" : "" 
              }`}
            />
            <span
              className={`absolute left-2 right-2 top-4 h-0.5 bg-slate-600 transition-all ${
                menuOpen ? "opacity-0" : "" 
              }`}
            />
            <span
              className={`absolute left-2 right-2 top-6 h-0.5 bg-slate-600 transition-all ${
                menuOpen ? "-translate-y-2.5 -rotate-45" : "" 
              }`}
            />
          </button>
          <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>EduNest</div>
        </div>

        <div
          className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "var(--bg-card)", border: `1px solid var(--border-color)`, color: "var(--text-primary)" }}
        >
          <Search className="h-4 w-4" />
          <input
            className="w-64 bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
            style={{ color: "var(--text-primary)" }}
            placeholder={t("common.searchPlaceholder")}
            aria-label={t("common.searchPlaceholder")}
          />
        </div>

        <div className="flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
          {token && (
            <div ref={notificationsRef}>
              <NotificationBell
                onClick={() => setShowNotifications(!showNotifications)}
                unreadCount={unreadCount}
                isOpen={showNotifications}
              />
              <NotificationDropdown
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                token={token}
                onNotificationsUpdated={refreshUnreadCount}
              />
            </div>
          )}
          <div
            className="flex items-center gap-2 rounded-full px-2 py-1.5"
            style={{ background: "var(--bg-card)", border: `1px solid var(--border-color)` }}
          >
            <UserCircle2 className="h-5 w-5" />
            <span className="hidden sm:inline text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("common.guest")}
            </span>
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/45 z-30 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Menu drawer */}
          <div
            ref={menuRef}
            className="fixed left-0 right-0 top-16 shadow-lg z-40 max-h-[calc(100vh-64px)] overflow-y-auto"
            style={{ background: "var(--bg-card)", borderTop: `1px solid var(--border-color)` }}
          >
            <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2">
              <Link
                to="/student/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/5"
                style={{ color: "var(--text-primary)" }}
              >
                {t("nav.studentLogin")}
              </Link>
              <Link
                to="/teacher/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/5"
                style={{ color: "var(--text-primary)" }}
              >
                {t("nav.teacherLogin")}
              </Link>
              <Link
                to="/admin/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/5"
                style={{ color: "var(--text-primary)" }}
              >
                {t("nav.adminLogin")}
              </Link>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
