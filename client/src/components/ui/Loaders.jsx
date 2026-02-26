export function FullPageLoader({ label = "Loading..." }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="saas-card w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-700">{label}</p>
      </div>
    </div>
  );
}

export function SectionLoader({ rows = 3, label = "Loading section..." }) {
  return (
    <div className="saas-card p-4 md:p-5 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-4 rounded bg-slate-200/80 animate-pulse" />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return <div className="h-10 rounded-lg bg-slate-200/80 animate-pulse" />;
}
