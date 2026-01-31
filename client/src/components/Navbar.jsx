import { Link } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav style={styles.nav}>
      <div style={styles.row}>
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
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    background: "#020617",
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
  },
};