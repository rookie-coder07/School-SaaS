import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

export default function EmptyState({
  icon,
  title = "No data yet",
  description = "Try refreshing or check back soon.",
  actionLabel,
  onAction,
  tone = "light",
  className = "",
}) {
  const cardTone =
    tone === "dark"
      ? "border-white/10 bg-slate-950/60 text-slate-200"
      : "border-slate-200/80 bg-white/95 text-slate-600";
  const titleTone = tone === "dark" ? "text-white" : "text-slate-900";
  const descTone = tone === "dark" ? "text-slate-300" : "text-slate-500";
  const buttonTone =
    tone === "dark"
      ? "bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30"
      : "bg-slate-900 text-white hover:bg-slate-800";

  return (
    <motion.div
      className={`flex w-full items-center justify-center ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className={`w-full max-w-2xl rounded-2xl border px-6 py-10 text-center shadow-sm ${cardTone}`}>
        <div className="mx-auto flex w-full items-center justify-center">
          {icon || <Inbox className="h-12 w-12 text-slate-300" aria-hidden="true" />}
        </div>
        <h3 className={`mt-4 text-lg font-bold ${titleTone}`}>{title}</h3>
        <p className={`mt-2 text-sm ${descTone}`}>{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className={`mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${buttonTone}`}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
