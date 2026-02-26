export function Card({ children, className = "", hover = false, padded = true }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm transition hover:shadow-md ${
        padded ? "p-4 md:p-5" : ""
      } ${hover ? "transition hover:shadow-md hover:border-slate-300" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

const statThemes = {
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  purple: "border-purple-200 bg-purple-50 text-purple-900",
  orange: "border-orange-200 bg-orange-50 text-orange-900",
};

export function StatCard({ label, value, icon = "", tone = "blue", className = "" }) {
  const toneClass = statThemes[tone] || statThemes.blue;
  return (
    <div className={`rounded-2xl border shadow-sm transition hover:shadow-md p-3 md:p-5 min-w-0 ${toneClass} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
        {icon ? <span className="text-lg leading-none">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl md:text-3xl font-black leading-tight">{value}</p>
    </div>
  );
}
