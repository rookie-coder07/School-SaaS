import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Search, UserCircle2 } from "lucide-react";
import NotificationBell from "./NotificationBell";
import NotificationDropdown from "./NotificationDropdown";
import useUnreadCount from "../hooks/useUnreadCount";

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
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="relative h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Toggle menu"
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
          <div className="text-sm font-bold text-slate-700">EduNest</div>
        </div>

        <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600">
          <Search className="h-4 w-4 text-slate-600" />
          <input
            className="w-64 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-700"
            placeholder="Search admissions, updates, or help..."
          />
        </div>

        <div className="flex items-center gap-3 text-slate-600">
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
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5">
            <UserCircle2 className="h-5 w-5 text-slate-600" />
            <span className="hidden sm:inline text-xs font-semibold text-slate-700">Guest</span>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div ref={menuRef} className="border-t border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-2">
            <Link to="/student/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Student Login</Link>
            <Link to="/teacher/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Teacher Login</Link>
            <Link to="/admin/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Admin Login</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
