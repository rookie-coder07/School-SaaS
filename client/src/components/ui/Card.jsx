export function Card({ children, className = "", hover = false, padded = true }) {
  return (
    <div
      className={`saas-card ${padded ? "p-4 md:p-5" : ""} ${hover ? "hover:border-slate-300" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

const statThemes = {
  blue: "border-sky-200/70 bg-sky-50 text-slate-900",
  green: "border-emerald-200/70 bg-emerald-50 text-slate-900",
  purple: "border-violet-200/70 bg-violet-50 text-slate-900",
  orange: "border-amber-200/70 bg-amber-50 text-slate-900",
};

export function StatCard({ label, value, icon = null, tone = "blue", className = "" }) {
  const toneClass = statThemes[tone] || statThemes.blue;
  return (
    <div className={`rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md p-3 md:p-5 min-w-0 ${toneClass} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
        {icon ? <span className="text-lg leading-none text-slate-700">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl md:text-3xl font-black leading-tight">{value}</p>
    </div>
  );
}
