export default function PageIntro({ title, description, icon, showTitle = true, className = "" }) {
  return (
    <div
      className={`page-intro rounded-2xl border p-6 ${className}`}
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-color)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          {showTitle ? <h2 className="text-2xl md:text-3xl font-black text-[var(--text-primary)]">{title}</h2> : null}
          {description ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p> : null}
        </div>
        <div className="flex justify-center md:justify-end">
          {icon ? <div className="flex h-20 w-20 items-center justify-center text-[var(--accent)]">{icon}</div> : null}
        </div>
      </div>
    </div>
  );
}
