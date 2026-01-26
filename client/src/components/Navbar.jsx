import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { to: "/", label: "HOME" },
    { to: "/about", label: "ABOUT US" },
    { to: "/admissions", label: "ADMISSIONS" },
    { to: "/contact", label: "CONTACT" },
  ];

  const loginItems = [
    { to: "/student/login", label: "STUDENT LOGIN", accent: "emerald" },
    { to: "/teacher/login", label: "TEACHER LOGIN", accent: "blue" },
    { to: "/admin/login", label: "ADMIN LOGIN", accent: "amber" },
  ];

  const accentMap = {
    emerald: "text-emerald-500 bg-emerald-600/10",
    blue: "text-blue-500 bg-blue-600/10",
    amber: "text-amber-500 bg-amber-600/10",
  };

  return (
    <aside
      style={{
        width: isCollapsed ? "80px" : "260px",
        transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className="fixed top-0 left-0 h-screen bg-[#0f172a] text-white flex flex-col z-50 border-r border-slate-800 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between min-h-[100px]">
        {!isCollapsed && (
          <div className="flex flex-col animate-in fade-in duration-500">
            <span className="text-xl font-black tracking-tighter text-white">
              DREAM VALLEY
            </span>
            <span className="text-[10px] text-emerald-500 font-bold tracking-[0.3em] -mt-1">
              EST. 1998
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors ml-auto"
        >
          <svg
            className={`w-6 h-6 text-slate-400 transition-transform duration-500 ${
              isCollapsed ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex items-center h-12 rounded-lg transition-all duration-200 group overflow-hidden ${
                isActive
                  ? "bg-emerald-600/10"
                  : "hover:bg-slate-800/50"
              }`}
            >
              <div
                className={`absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full transition-all duration-300 ${
                  isActive
                    ? "opacity-100"
                    : "opacity-0 -translate-x-full group-hover:translate-x-0 group-hover:opacity-50"
                }`}
              />

              <div className="flex items-center w-full px-4">
                <span
                  className={`text-xs font-bold ${
                    isActive ? "text-emerald-500" : "text-slate-500"
                  }`}
                >
                  {item.label.charAt(0)}
                </span>

                {!isCollapsed && (
                  <span
                    className={`ml-6 text-[13px] font-bold tracking-widest ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-6 border-t border-slate-800/60" />

        {/* Login Section */}
        {loginItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex items-center h-12 rounded-lg transition-all duration-200 overflow-hidden ${
                isActive
                  ? accentMap[item.accent]
                  : "hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center w-full px-4">
                <span
                  className={`text-xs font-bold ${
                    item.accent === "emerald"
                      ? "text-emerald-500"
                      : item.accent === "blue"
                      ? "text-blue-500"
                      : "text-amber-500"
                  }`}
                >
                  {item.label.charAt(0)}
                </span>

                {!isCollapsed && (
                  <span
                    className={`ml-6 text-[13px] font-bold tracking-widest ${
                      item.accent === "emerald"
                        ? "text-emerald-400"
                        : item.accent === "blue"
                        ? "text-blue-400"
                        : "text-amber-400"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-slate-800/50">
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "gap-3"
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
              System Secure
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
