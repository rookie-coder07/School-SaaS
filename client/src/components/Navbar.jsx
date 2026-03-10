import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "./NotificationBell";
import NotificationDropdown from "./NotificationDropdown";
import useUnreadCount from "../hooks/useUnreadCount";

const resolveToken = () =>
  localStorage.getItem("adminToken") ||
  localStorage.getItem("teacherToken") ||
  localStorage.getItem("studentToken") ||
  localStorage.getItem("token");

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [token, setToken] = useState(null);
  const { unreadCount, refreshUnreadCount } = useUnreadCount(token);
  const menuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Get token from localStorage on mount
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

  // Close menus when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav style={styles.nav}>
      <div style={styles.row}>
        <button style={styles.menuBtn} onClick={() => setOpen(!open)}>
          ☰
        </button>

        <div style={styles.brand}>EduNest</div>

        {/* Notification Bell - Only show if user is logged in */}
        {token && (
          <div
            ref={notificationsRef}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}
          >
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
      </div>

      {open && (
        <div ref={menuRef} style={styles.dropdown}>
          <Link to="/" onClick={() => setOpen(false)} style={styles.link}>
            Home
          </Link>
          <Link to="/settings" onClick={() => setOpen(false)} style={styles.link}>
            Settings
          </Link>
          <Link to="/student/login" onClick={() => setOpen(false)} style={styles.link}>
            Student Login
          </Link>
          <Link to="/teacher/login" onClick={() => setOpen(false)} style={styles.link}>
            Teacher Login
          </Link>
          <Link to="/admin/login" onClick={() => setOpen(false)} style={styles.link}>
            Admin Login
          </Link>
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    background: "#020617",
    color: "#fff",
    padding: "12px 16px",
    position: "relative",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },

  row: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  menuBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "22px",
    cursor: "pointer",
  },

  brand: {
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "0.4px",
  },

  dropdown: {
    position: "absolute",
    top: "52px",
    left: "16px",
    background: "#020617",
    borderRadius: "10px",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    zIndex: 50,
  },

  link: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.05)",
  },
};
