import Hero3D from "../components/Hero3D";

export default function Home({ isSidebarCollapsed }) {
  // Syncing logic with the Sidebar
  const sidebarWidth = isSidebarCollapsed ? "80px" : "260px";

  const s = {
    container: {
      marginLeft: sidebarWidth,
      transition: "margin-left 0.5s cubic-bezier(0.2, 1, 0.2, 1)",
      backgroundColor: "#FFFFFF",
      minHeight: "100vh",
    },
    sectionLabel: "text-[10px] font-black tracking-[0.5em] text-emerald-600 uppercase mb-4 block",
    thinQuote: "text-3xl md:text-4xl font-light tracking-tight text-slate-900 italic leading-relaxed",
  };

  return (
    <div style={s.container}>
      {/* 1. Hero Atmosphere Layer */}
      <section className="relative h-[80vh] w-full overflow-hidden bg-[#FAFAFA]">
        <Hero3D isSidebarCollapsed={isSidebarCollapsed} />
        
        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-white" />
      </section>

      {/* 2. Philosophy Section (Minimalist Quote) */}
      <section className="max-w-5xl mx-auto py-32 px-12 text-center">
        <span className={s.sectionLabel}>Philosophy</span>
        <h2 className={s.thinQuote}>
          "Education is not the filling of a pail, <br /> 
          but the lighting of a fire."
        </h2>
        <div className="mt-12 w-[1px] h-24 bg-slate-200 mx-auto" />
      </section>

      {/* 3. Visual Campus Gallery */}
      <section className="max-w-7xl mx-auto pb-40 px-12">
        <div className="grid grid-cols-12 gap-12 items-center mb-40">
          <div className="col-span-12 md:col-span-5">
            <span className={s.sectionLabel}>01. The Environment</span>
            <h3 className="text-2xl font-bold text-slate-900 mb-6 tracking-tighter">Architectural Clarity</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              Our campus is designed to eliminate distraction. By utilizing natural stone, 
              expansive glass, and open-plan learning studios, we create a sanctuary 
              for deep intellectual focus.
            </p>
          </div>
          <div className="col-span-12 md:col-span-7">
            <div className="rounded-[2.5rem] overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-700">
              <img 
                src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200" 
                alt="Minimalist Modern Campus" 
                className="w-full h-[550px] object-cover"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <div className="group">
            <div className="rounded-[2rem] overflow-hidden mb-8 h-[400px]">
              <img 
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800" 
                alt="Modern Learning Lab" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
            </div>
            <span className={s.sectionLabel}>02. Innovation</span>
            <p className="text-slate-400 text-sm italic">The Digital Research Hub — Where logic meets execution.</p>
          </div>

          <div className="group mt-20 md:mt-40">
            <div className="rounded-[2rem] overflow-hidden mb-8 h-[400px]">
              <img 
                src="https://images.unsplash.com/photo-1503387762-592dea58ef23?auto=format&fit=crop&q=80&w=800" 
                alt="Outdoor Learning Space" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
            </div>
            <span className={s.sectionLabel}>03. Balance</span>
            <p className="text-slate-400 text-sm italic">Open Air Courtyards — Designed for reflection and collaboration.</p>
          </div>
        </div>
      </section>

      {/* 4. Minimalist Footer */}
      <footer className="py-20 border-t border-slate-50 text-center bg-[#FAFAFA]">
        <p className="text-[10px] text-slate-300 tracking-[0.6em] font-black uppercase">
          Dream Valley Academy • Est 1998
        </p>
      </footer>
    </div>
  );
}