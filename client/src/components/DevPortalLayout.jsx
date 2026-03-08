import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/dev", label: "Dashboard" },
  { to: "/dev/system-health", label: "System Health" },
  { to: "/dev/live-activity", label: "Live Activity" },
  { to: "/dev/schools", label: "Schools" },
  { to: "/dev/errors", label: "Errors" },
  { to: "/dev/api-usage", label: "API Usage" },
  { to: "/dev/traces", label: "Traces" },
  { to: "/dev/tools", label: "Tools" },
  { to: "/dev/logs", label: "Logs" },
  { to: "/dev/features", label: "Features" },
];

const linkClass = ({ isActive }) =>
  [
    "rounded-xl px-3 py-2 text-sm font-semibold transition",
    isActive ? "bg-cyan-400/90 text-slate-900" : "text-slate-100 hover:bg-white/15",
  ].join(" ");

export default function DevPortalLayout({ title, subtitle, actions = null, children }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("developerToken");
    localStorage.removeItem("userRole");
    navigate("/dev/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-6">
        <aside className="w-full rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg md:sticky md:top-6 md:h-fit md:w-72">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Developer Portal</h2>
              <p className="mt-1 text-xs text-slate-200">MERN School SaaS</p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="rounded-lg border border-white/30 bg-white/10 p-2 text-white transition hover:bg-white/20 md:hidden"
              aria-label="Toggle developer menu"
            >
              <span className="block h-0.5 w-5 bg-white" />
              <span className="mt-1 block h-0.5 w-5 bg-white" />
              <span className="mt-1 block h-0.5 w-5 bg-white" />
            </button>
          </div>

          <nav className={`mt-4 ${menuOpen ? "grid" : "hidden"} grid-cols-2 gap-2 md:grid md:grid-cols-1`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dev"}
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className={`mt-4 w-full rounded-xl border border-rose-200/40 bg-rose-400/20 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/30 ${menuOpen ? "block" : "hidden"} md:block`}
          >
            Logout
          </button>
        </aside>

        <main className="w-full">
          <header className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-lg md:mb-6 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <h1 className="text-2xl font-black text-white md:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-slate-200">{subtitle}</p> : null}
            </div>
            {actions}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
