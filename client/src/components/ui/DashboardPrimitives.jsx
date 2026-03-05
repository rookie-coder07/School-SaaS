import { memo } from "react";

const STAT_THEME = {
  indigo: "from-indigo-600/25 via-violet-500/15 to-white border-indigo-300/70",
  emerald: "from-emerald-600/25 via-teal-500/15 to-white border-emerald-300/70",
  sky: "from-sky-600/25 via-cyan-500/15 to-white border-sky-300/70",
  amber: "from-amber-500/25 via-orange-500/15 to-white border-amber-300/70",
};

export const GlassCard = memo(function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_10px_35px_rgba(15,23,42,0.12)] ${className}`}
    >
      {children}
    </div>
  );
});

export const SectionHeader = memo(function SectionHeader({ title, subtitle = "", right = null }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        <div className="mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500" />
        {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
});

export const StatCard = memo(function StatCard({ icon, title, value, subtitle, tone = "indigo" }) {
  const toneClass = STAT_THEME[tone] || STAT_THEME.indigo;
  return (
    <GlassCard
      className={`p-4 bg-gradient-to-br ${toneClass} transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(79,70,229,0.20)]`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
        <span className="text-lg leading-none">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
    </GlassCard>
  );
});
