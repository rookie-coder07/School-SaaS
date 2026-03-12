import { motion } from "framer-motion";

export default function AnalyticsCard({ icon, label, value, description, gradient = "from-indigo-500 to-blue-600", progress = 0.72 }) {
  const progressWidth = Math.max(0, Math.min(1, Number(progress))) * 100;
  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r ${gradient} p-6 text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/85">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
          {description ? <p className="mt-2 text-xs font-semibold text-white/85">{description}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
          {icon}
        </div>
      </div>
      <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white/70" style={{ width: `${progressWidth}%` }} />
      </div>
    </motion.div>
  );
}
