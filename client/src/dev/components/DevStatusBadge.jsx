export default function DevStatusBadge({ status = "active", text = "" }) {
  const normalized = String(status || "").toLowerCase();
  const isDisabled = normalized === "disabled" || normalized === "inactive";
  const isWarning = normalized === "warning";
  const label = text || (isDisabled ? "Disabled" : isWarning ? "Warning" : "Active");

  const className = isDisabled
    ? "rounded bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-100"
    : isWarning
      ? "rounded bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-100"
      : "rounded bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-100";

  return <span className={className}>{label}</span>;
}
