import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Import all old developer components
import DevSystem from "../pages/DevSystem";
import DevErrors from "../pages/DevErrors";
import DevLogs from "../pages/DevLogs";
import DevApiUsage from "../pages/DevApiUsage";
import DevLiveActivity from "../pages/DevLiveActivity";
import DevFeatures from "../pages/DevFeatures";
import DevTraces from "../pages/DevTraces";
import DevTools from "../pages/DevTools";
import DevSchoolsList from "../pages/DevSchoolsList";
import DevSchoolDetails from "../pages/DevSchoolDetails";

export default function DevDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("system");

  useEffect(() => {
    // Check if user has developer access
    if (!localStorage.getItem("devAccess")) {
      navigate("/dev-login", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("devAccess");
    navigate("/dev-login", { replace: true });
  };

  // Tab configuration
  const tabs = [
    { id: "system", label: "🏥 System Health", component: DevSystem },
    { id: "errors", label: "🔴 Errors", component: DevErrors },
    { id: "logs", label: "📝 Logs", component: DevLogs },
    { id: "api", label: "📊 API Usage", component: DevApiUsage },
    { id: "activity", label: "⚡ Live Activity", component: DevLiveActivity },
    { id: "features", label: "✨ Features", component: DevFeatures },
    { id: "traces", label: "🔍 Traces", component: DevTraces },
    { id: "tools", label: "🛠️ Tools", component: DevTools },
    { id: "schools", label: "🏫 Schools", component: DevSchoolsList },
  ];

  // Get active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-lg">⚙️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Developer Console</h1>
              <p className="text-xs text-slate-400">Analytics & Monitoring</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600/20 border border-red-600/40 text-red-300 rounded-lg hover:bg-red-600/30 transition text-sm font-medium"
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-slate-300 border-b-2 border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {ActiveComponent ? (
          <ActiveComponent />
        ) : (
          <div className="text-center text-slate-400">
            <p>Loading component...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-800 py-6 text-center text-slate-500 text-xs mt-12">
        <p>Developer Console • Secure Access Only • © 2026</p>
      </footer>
    </div>
  );
}
