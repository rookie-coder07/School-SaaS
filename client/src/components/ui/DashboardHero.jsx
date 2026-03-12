export default function DashboardHero({ title, subtitle, stats = [], icon, showTitle = true }) {
  return (
    <div className="rounded-xl p-6 shadow-sm border border-slate-200 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Welcome back</p>
          {showTitle ? <h2 className="mt-2 text-2xl md:text-3xl font-black text-slate-900">{title}</h2> : null}
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          {stats.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-center md:justify-end">
          {icon ? <div className="flex h-20 w-20 items-center justify-center text-slate-300">{icon}</div> : null}
        </div>
      </div>
    </div>
  );
}
