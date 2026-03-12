import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Database,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
  Mic2,
  Search,
  UserCircle2,
  School,
  Settings2,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import DevToastHost from "./components/DevToastHost";
import DevPageIntro from "./components/DevPageIntro";

const DEV_PORTAL_BASE = "/internal/dev-portal";
const portalPath = (segment) => `${DEV_PORTAL_BASE}${segment}`;

const dashboardItems = [
  { label: "Dashboard", path: portalPath("/dashboard"), icon: LayoutDashboard },
];

const monitoringItems = [
  { label: "System Health", path: portalPath("/system"), icon: Activity },
  { label: "Errors", path: portalPath("/errors"), icon: ShieldAlert },
  { label: "Logs", path: portalPath("/logs"), icon: ListChecks },
  { label: "API Usage", path: portalPath("/api-usage"), icon: LineChart },
  { label: "Live Activity", path: portalPath("/live-activity"), icon: Activity },
  { label: "Traces", path: portalPath("/traces"), icon: BarChart3 },
];

const platformItems = [
  { label: "Schools", path: portalPath("/schools"), icon: School },
  { label: "Users", path: portalPath("/users"), icon: Users },
  { label: "Voice Messages", path: portalPath("/voice-messages"), icon: Mic2 },
  { label: "Data Explorer", path: portalPath("/data-explorer"), icon: Database },
];

const systemItems = [
  { label: "System Controls", path: portalPath("/system-controls"), icon: Settings2 },
  { label: "Audit Logs", path: portalPath("/audit-logs"), icon: BarChart3 },
  { label: "Developer Settings", path: portalPath("/settings"), icon: Settings2 },
];

const navSections = [
  { title: "", items: dashboardItems },
  { title: "Monitoring", items: monitoringItems },
  { title: "Platform Control", items: platformItems },
  { title: "Operations", items: systemItems },
];

export default function DevLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState(searchParams.get("q") || "");

  const activePath = useMemo(() => {
    const current = String(location.pathname || "");
    const allItems = navSections.flatMap((section) => section.items);
    const found = allItems.find((item) => current === item.path || current.startsWith(`${item.path}/`));
    return found?.path || portalPath("/dashboard");
  }, [location.pathname]);

  useEffect(() => {
    setGlobalSearch(searchParams.get("q") || "");
  }, [searchParams]);

  const handleLogout = () => {
    localStorage.removeItem("developerToken");
    localStorage.removeItem("devAccess");
    localStorage.removeItem("userRole");
    navigate("/dev-login", { replace: true });
  };

  const handleApplyGlobalSearch = () => {
    const next = new URLSearchParams(searchParams);
    const value = globalSearch.trim();
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const handleQuickAction = (value) => {
    if (!value) return;
    navigate(value);
  };

  return (
    <div className="dev-console-shell h-screen overflow-hidden bg-gradient-to-br from-[#071228] via-[#0b1c3f] to-[#12275b] text-slate-100">
      <DevToastHost />
      <div className="flex h-full">
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/45 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        ) : null}

        <aside
          className={[
            "fixed z-40 h-full w-72 border-r border-white/15 bg-slate-950/80 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-5 py-5">
              <h1 className="text-xl font-black tracking-tight text-white">Platform Control</h1>
              <p className="mt-1 text-xs text-slate-300">Developer Console</p>
            </div>

            <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
              {navSections.map((section) => (
                <div key={section.title || "dashboard"}>
                  {section.title ? (
                    <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {section.title}
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePath === item.path;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setSidebarOpen(false);
                          }}
                          className={[
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                            isActive
                              ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/30"
                              : "text-slate-300 hover:bg-white/10 hover:text-white",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/15 px-3 py-2.5 text-sm font-semibold text-rose-100 hover:bg-rose-500/25"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between gap-2 border-b border-white/10 bg-slate-950/45 px-4 backdrop-blur-xl lg:px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="rounded-lg border border-white/20 bg-white/10 p-2 text-slate-100 hover:bg-white/20 lg:hidden"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5">
                <Search className="h-4 w-4 text-slate-300" />
                <input
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApplyGlobalSearch();
                  }}
                  placeholder="Search schools, users, logs..."
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleApplyGlobalSearch}
                  className="rounded-md bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30"
                >
                  Go
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  handleQuickAction(e.target.value);
                  e.target.value = "";
                }}
                className="hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-slate-100 md:block"
                defaultValue=""
              >
                <option value="" disabled>
                  Quick Actions
                </option>
                <option value={portalPath("/users")}>Open Users</option>
                <option value={portalPath("/schools")}>Open Schools</option>
                <option value={portalPath("/system-controls")}>System Controls</option>
                <option value={portalPath("/audit-logs")}>Audit Logs</option>
              </select>
              <button
                type="button"
                className="rounded-full border border-white/20 bg-white/10 p-1.5 text-slate-200 hover:bg-white/20"
                aria-label="Developer profile"
              >
                <UserCircle2 className="h-5 w-5" />
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
            <div className="mb-5">
              <DevPageIntro
                title="Developer Console"
                description="Unified visibility into system health, audits, and platform controls."
              />
            </div>
            <div className="mb-4 rounded-2xl border border-amber-500/50 bg-amber-600/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-amber-100">
              Notice: Internal developer platform. Unauthorized access is prohibited. All actions are logged.
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
