import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Admissions", path: "/admin/admissions", icon: ClipboardList },
  { label: "Students", path: "/admin/dashboard?section=students", icon: Users },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 h-screen overflow-y-auto border-r border-slate-200 bg-white p-4 text-slate-700 shadow-sm transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-black">
            A
          </div>
          <div className={`${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
            <h2 className="text-lg font-black text-slate-900">Admin Console</h2>
            <p className="text-xs text-slate-500">Operations</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path.split("?")[0]);
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              title={item.label}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                isActive ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-blue-700" : "text-slate-700"}`} />
              <span className={`${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => {
            localStorage.removeItem("adminToken");
            navigate("/admin/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span className={`${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"} transition-all`}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
