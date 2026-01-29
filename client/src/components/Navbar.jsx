import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false); // Changed logic to a mobile toggle

  const menuItems = [
    { to: "/", label: "HOME" },
    { to: "/about", label: "ABOUT US" },
    { to: "/admissions", label: "ADMISSIONS" },
    { to: "/contact", label: "CONTACT" },
  ];

  const loginItems = [
    { to: "/student/login", label: "STUDENT", accent: "emerald" },
    { to: "/teacher/login", label: "TEACHER", accent: "blue" },
    { to: "/admin/login", label: "ADMIN", accent: "amber" },
  ];

  const accentMap = {
    emerald: "text-emerald-500 bg-emerald-600/10 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-600/10 border-blue-500/20",
    amber: "text-amber-500 bg-amber-600/10 border-amber-500/20",
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-[#0f172a] text-white z-50 border-b border-slate-800 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-white">
                DREAM VALLEY
              </span>
              <span className="text-[10px] text-emerald-500 font-bold tracking-[0.3em] -mt-1">
                EST. 1998
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2 text-[12px] font-bold tracking-widest transition-all duration-200 rounded-md ${
                    isActive ? "text-emerald-500" : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Vertical Divider */}
            <div className="h-6 w-[1px] bg-slate-700 mx-2" />

            {/* Login Section */}
            <div className="flex items-center gap-2">
              {loginItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-1.5 rounded-full border text-[11px] font-black transition-all duration-200 ${
                    location.pathname === item.to 
                      ? accentMap[item.accent] 
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${isOpen ? "max-h-96 border-t border-slate-800" : "max-h-0"}`}>
        <div className="px-4 pt-4 pb-6 space-y-2 bg-[#0f172a]">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block px-3 py-2 text-base font-medium text-slate-400 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="grid grid-cols-3 gap-2 pt-4">
            {loginItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-center py-2 rounded-lg text-[10px] font-bold border ${accentMap[item.accent]}`}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}