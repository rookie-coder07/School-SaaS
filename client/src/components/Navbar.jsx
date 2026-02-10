import { Link } from "react-router-dom";
<<<<<<< HEAD
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
=======
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262

  return (
    <nav style={styles.nav}>
      <div style={styles.row}>
<<<<<<< HEAD
        <button style={styles.menuBtn} onClick={() => setOpen(!open)}>
          ☰
        </button>

        <div style={styles.brand}>EduNest</div>
      </div>

      {open && (
        <div ref={menuRef} style={styles.dropdown}>
          <Link to="/" onClick={() => setOpen(false)} style={styles.link}>
            Home
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
=======
        <div>
          <h2 style={{ margin: 0 }}>Dream Valley</h2>
          <small style={{ color: "#22c55e" }}>EST. 1998</small>
        </div>

        <div style={styles.desktop}>
          <Link to="/">Home</Link>
          <Link to="/student/login">Student</Link>
          <Link to="/teacher/login">Teacher</Link>
          <Link to="/admin/login">Admin</Link>
        </div>

        <button onClick={() => setOpen(!open)} style={styles.menuBtn}>☰</button>
      </div>

      {open && (
        <div style={styles.mobile}>
          <Link to="/" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/student/login">Student</Link>
          <Link to="/teacher/login">Teacher</Link>
          <Link to="/admin/login">Admin</Link>
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    background: "#020617",
<<<<<<< HEAD
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
=======
    color: "white",
    padding: "12px 20px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  desktop: {
    display: "flex",
    gap: "20px",
  },
  menuBtn: {
    background: "none",
    color: "white",
    border: "none",
    fontSize: "22px",
  },
  mobile: {
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  },
};