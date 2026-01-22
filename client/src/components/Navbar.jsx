import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  // Effect to handle background change on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 px-6 py-4 ${
        isScrolled 
          ? "bg-white/80 backdrop-blur-lg shadow-md py-3" 
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white font-black text-xl">D</span>
          </div>
          <h1 className={`text-xl font-extrabold tracking-tight transition-colors ${
            isScrolled ? "text-slate-900" : "text-white"
          }`}>
            Dream Valley <span className="font-light italic">Public School</span>
          </h1>
        </div>

        {/* Navigation Links */}
        <div className={`hidden md:flex items-center space-x-8 font-medium transition-colors ${
          isScrolled ? "text-slate-600" : "text-white/90"
        }`}>
          <NavLink to="/" label="Home" isScrolled={isScrolled} />
          <NavLink to="/about" label="About" isScrolled={isScrolled} />
          <NavLink to="/admissions" label="Admissions" isScrolled={isScrolled} />
          <NavLink to="/contact" label="Contact" isScrolled={isScrolled} />
          
          {/* Call to Action Button */}
          <Link 
            to="/apply" 
            className={`px-6 py-2.5 rounded-full font-bold transition-all transform hover:scale-105 ${
              isScrolled 
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md" 
                : "bg-white text-emerald-900 hover:bg-emerald-50 shadow-xl"
            }`}
          >
            Apply Now
          </Link>
        </div>

        {/* Mobile Menu Icon (Visual Only) */}
        <div className="md:hidden">
          <button className={isScrolled ? "text-slate-900" : "text-white"}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

// Sub-component for clean hover states
function NavLink({ to, label, isScrolled }) {
  return (
    <Link 
      to={to} 
      className={`relative group transition-colors hover:text-emerald-500 ${
        isScrolled ? "hover:text-emerald-600" : "hover:text-emerald-300"
      }`}
    >
      {label}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 transition-all group-hover:w-full"></span>
    </Link>
  );
}