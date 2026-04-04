export default function PageIntro({ title, description, icon, showTitle = true, className = "" }) {
  return (
    <div className={`page-intro rounded-xl p-6 shadow-sm border border-slate-200 bg-white ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          {showTitle ? <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2> : null}
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>
        <div className="flex justify-center md:justify-end">
          {icon ? <div className="flex h-20 w-20 items-center justify-center text-slate-300">{icon}</div> : null}
        </div>
      </div>
    </div>
  );
}
