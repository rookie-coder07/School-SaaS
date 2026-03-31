import { memo } from "react";

const STAT_THEME = {
  indigo: "from-[var(--accent-soft)] via-[rgba(201,106,43,0.1)] to-[var(--bg-card)] border-[var(--border-color)]",
  emerald: "from-emerald-500/20 via-emerald-300/10 to-[var(--bg-card)] border-emerald-300/50",
  sky: "from-[var(--accent-soft)] via-[rgba(240,154,83,0.12)] to-[var(--bg-card)] border-[var(--border-color)]",
  amber: "from-amber-500/20 via-orange-300/10 to-[var(--bg-card)] border-amber-300/50",
};

export const GlassCard = memo(function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl ${className}`}
      style={{
        borderColor: "var(--border-color)",
        background: "color-mix(in srgb, var(--bg-card) 92%, transparent)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );
});

export const SectionHeader = memo(function SectionHeader({ title, subtitle = "", right = null }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h2>
        <div className="mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[#f5c38d]" />
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
});

export const StatCard = memo(function StatCard({ icon, title, value, subtitle, tone = "indigo" }) {
  const toneClass = STAT_THEME[tone] || STAT_THEME.indigo;
  return (
    <GlassCard
      className={`bg-gradient-to-br p-4 transition duration-300 hover:-translate-y-1 ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{title}</p>
        <span className="text-lg leading-none text-[var(--accent)]">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>
    </GlassCard>
  );
});
